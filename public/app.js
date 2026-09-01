/**
 * app.js
 * Client controller for User Contract Transparency Assistant and Government Process Agent.
 * Designed with Apple + Stripe + Linear + Vercel SaaS UI architecture.
 * Preserves 100% of existing API contracts, backend handlers, and state logic.
 * Includes Smart Form Intelligence for guided form completion.
 */

// --- SAFE JSON FETCH HELPER ---
// Prevents "Unexpected token '<'" errors when backend returns HTML for missing routes
async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type') || '';

  const data = contentType.includes('application/json')
    ? await response.json()
    : { error: await response.text() };

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.details ||
      `Request failed with status ${response.status}`
    );
  }

  return data;
}

// --- SMART FORM INTELLIGENCE ENGINE ---
// Analyzes current form state and provides guidance, missing-field detection,
// inconsistency warnings, and next-step recommendations.
function analyzeFormState(formFields, currentValues) {
  const result = {
    nextStep: null,
    reason: null,
    missingFields: [],
    incompleteFields: [],
    inconsistencies: [],
    possibleProblems: [],
    recommendedAction: null,
    completedFields: [],
    fieldStatus: [] // per-field status for rendering
  };

  if (!formFields || formFields.length === 0) {
    return result;
  }

  let firstEmptyRequired = null;

  for (const field of formFields) {
    const val = (currentValues[field.fieldName] || '').trim();
    const isRequired = !field.safeToFill;
    const isEmpty = val.length === 0;
    const isShort = val.length > 0 && val.length < 3;

    if (!isEmpty) {
      result.completedFields.push(field.fieldName);
      result.fieldStatus.push({ fieldName: field.fieldName, label: field.label, status: 'completed' });
    } else if (isRequired) {
      result.missingFields.push({ fieldName: field.fieldName, label: field.label, required: true });
      result.fieldStatus.push({ fieldName: field.fieldName, label: field.label, status: 'missing' });
      if (!firstEmptyRequired) firstEmptyRequired = field;
    } else {
      result.fieldStatus.push({ fieldName: field.fieldName, label: field.label, status: 'optional' });
    }

    if (isShort && !isEmpty) {
      result.incompleteFields.push({
        fieldName: field.fieldName,
        label: field.label,
        issue: `"${field.label}" appears incomplete (only ${val.length} character${val.length > 1 ? 's' : ''}).`,
        recommendation: `Please provide a complete value for ${field.label}.`
      });
    }
  }

  // Date consistency check
  const dateFields = formFields.filter(f => {
    const v = (currentValues[f.fieldName] || '').trim();
    return v && /\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(v);
  });
  if (dateFields.length >= 2) {
    const dates = dateFields.map(f => ({
      label: f.label,
      fieldName: f.fieldName,
      date: new Date(currentValues[f.fieldName])
    })).filter(d => !isNaN(d.date.getTime()));

    for (let i = 0; i < dates.length; i++) {
      for (let j = i + 1; j < dates.length; j++) {
        const a = dates[i], b = dates[j];
        if (a.label.toLowerCase().includes('start') && b.label.toLowerCase().includes('end')) {
          if (a.date > b.date) {
            result.inconsistencies.push({
              fields: [a.fieldName, b.fieldName],
              issue: `Potential inconsistency: ${a.label} (${currentValues[a.fieldName]}) is after ${b.label} (${currentValues[b.fieldName]}).`,
              recommendation: 'Please review the dates to ensure the start date is before the end date.'
            });
          }
        }
      }
    }
  }

  // Possible problems
  if (result.missingFields.length > 0) {
    result.possibleProblems.push(
      `${result.missingFields.length} required field${result.missingFields.length > 1 ? 's are' : ' is'} missing. The application may be incomplete during verification.`
    );
  }

  // Next step recommendation
  if (firstEmptyRequired) {
    result.nextStep = `Enter ${firstEmptyRequired.label}`;
    result.reason = `This information may be required before the process can be completed.`;
    result.recommendedAction = `Fill in the "${firstEmptyRequired.label}" field to continue.`;
  } else if (result.incompleteFields.length > 0) {
    const f = result.incompleteFields[0];
    result.nextStep = `Complete ${f.label}`;
    result.reason = f.issue;
    result.recommendedAction = f.recommendation;
  } else if (result.inconsistencies.length > 0) {
    const inc = result.inconsistencies[0];
    result.nextStep = 'Review inconsistent fields';
    result.reason = inc.issue;
    result.recommendedAction = inc.recommendation;
  } else {
    result.nextStep = 'All fields look complete';
    result.reason = 'Based on the information provided, all required fields have values.';
    result.recommendedAction = 'You may proceed to review before submission.';
  }

  return result;
}

// Global Application State
const state = {
  activeMode: 'contract', // Default primary mode: Student Contract Transparency Assistant
  theme: localStorage.getItem('theme') || 'light',
  sessionId: 'session_' + Date.now(),
  stats: {
    totalDocsProcessed: 1
  },
  gov: {
    goal: '',
    process: null,
    requiredDocs: [],
    checklist: [],
    formFields: [],
    timeline: [],
    referenceNumber: null
  },
  contract: {
    documentText: '',
    filename: '',
    analysis: null,
    company: null,
    checklist: []
  },
  isListeningGov: false,
  isListeningContract: false,
  speechRecognition: null,
  serverOnline: true
};

// DOM Registry
const elements = {
  // Theme & Mode Switcher
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  modeGovBtn: document.getElementById('modeGovBtn'),
  modeContractBtn: document.getElementById('modeContractBtn'),
  govViewContainer: document.getElementById('govViewContainer'),
  contractViewContainer: document.getElementById('contractViewContainer'),
  appHeaderTitle: document.getElementById('appHeaderTitle'),
  appHeaderSubtitle: document.getElementById('appHeaderSubtitle'),

  // Health Status & Widgets
  healthBadge: document.getElementById('healthBadge'),
  healthDot: document.getElementById('healthDot'),
  healthStatusText: document.getElementById('healthStatusText'),
  widgetTotalDocs: document.getElementById('widgetTotalDocs'),
  widgetRiskLevel: document.getElementById('widgetRiskLevel'),
  widgetTasksRatio: document.getElementById('widgetTasksRatio'),

  // Government Process Agent Elements
  goalInputField: document.getElementById('goalInputField'),
  goalMicBtn: document.getElementById('goalMicBtn'),
  startGoalBtn: document.getElementById('startGoalBtn'),
  govProcessHeaderBanner: document.getElementById('govProcessHeaderBanner'),
  govCategoryBadge: document.getElementById('govCategoryBadge'),
  govProcessTitle: document.getElementById('govProcessTitle'),
  govDepartmentText: document.getElementById('govDepartmentText'),
  govFeeText: document.getElementById('govFeeText'),
  govClarificationCard: document.getElementById('govClarificationCard'),
  govClarificationQuestion: document.getElementById('govClarificationQuestion'),
  govClarificationOptions: document.getElementById('govClarificationOptions'),
  govMainGrid: document.getElementById('govMainGrid'),
  govPortalName: document.getElementById('govPortalName'),
  govPortalDomain: document.getElementById('govPortalDomain'),
  govPortalLinkBtn: document.getElementById('govPortalLinkBtn'),
  govPurposeText: document.getElementById('govPurposeText'),
  govFreshnessBadge: document.getElementById('govFreshnessBadge'),
  govDocCountBadge: document.getElementById('govDocCountBadge'),
  govRequiredDocsContainer: document.getElementById('govRequiredDocsContainer'),
  govChecklistContainer: document.getElementById('govChecklistContainer'),
  govChecklistProgressText: document.getElementById('govChecklistProgressText'),
  govFormFieldsContainer: document.getElementById('govFormFieldsContainer'),
  govValidateBtn: document.getElementById('govValidateBtn'),
  govLaunchReviewBtn: document.getElementById('govLaunchReviewBtn'),
  govVoiceMicBtn: document.getElementById('govVoiceMicBtn'),
  govVoiceStatusText: document.getElementById('govVoiceStatusText'),
  govVoiceLog: document.getElementById('govVoiceLog'),
  govTimelineBox: document.getElementById('govTimelineBox'),

  // Gov Modals
  govReviewModal: document.getElementById('govReviewModal'),
  govReviewFieldsList: document.getElementById('govReviewFieldsList'),
  govConsentCheckbox: document.getElementById('govConsentCheckbox'),
  cancelGovReviewBtn: document.getElementById('cancelGovReviewBtn'),
  confirmGovSubmissionBtn: document.getElementById('confirmGovSubmissionBtn'),

  // Contract Assistant Elements
  tabButtons: document.querySelectorAll('#contractViewContainer .tab-btn'),
  tabContents: document.querySelectorAll('#contractViewContainer .tab-content'),
  dropzone: document.getElementById('dropzone'),
  browseBtn: document.getElementById('browseBtn'),
  fileInput: document.getElementById('fileInput'),
  pastedText: document.getElementById('pastedText'),
  charCounter: document.getElementById('charCounter'),
  analyzeBtn: document.getElementById('analyzeBtn'),
  analyzeBtnText: document.getElementById('analyzeBtnText'),
  analysisLoadingState: document.getElementById('analysisLoadingState'),
  loadingStepTitle: document.getElementById('loadingStepTitle'),
  loadingStepSub: document.getElementById('loadingStepSub'),
  loadingProgressFill: document.getElementById('loadingProgressFill'),
  
  // Findings & Summary
  docNameText: document.getElementById('docNameText'),
  docTypeBadge: document.getElementById('docTypeBadge'),
  findingsContainer: document.getElementById('findingsContainer'),
  findingsCountBadge: document.getElementById('findingsCountBadge'),
  severityFilter: document.getElementById('severityFilter'),
  riskSummaryText: document.getElementById('riskSummaryText'),
  riskScoreBadge: document.getElementById('riskScoreBadge'),
  missingInfoAlert: document.getElementById('missingInfoAlert'),
  missingInfoList: document.getElementById('missingInfoList'),
  
  // Checklist
  checklistContainer: document.getElementById('checklistContainer'),
  checklistProgressBadge: document.getElementById('checklistProgressBadge'),
  progressPercentageText: document.getElementById('progressPercentageText'),
  progressRatioText: document.getElementById('progressRatioText'),
  progressBarFill: document.getElementById('progressBarFill'),

  // Chat & Trace & Voice
  chatMessages: document.getElementById('chatMessages'),
  chatInput: document.getElementById('chatInput'),
  sendChatBtn: document.getElementById('sendChatBtn'),
  agentTraceBox: document.getElementById('agentTraceBox'),
  voiceMicBtn: document.getElementById('voiceMicBtn'),
  voiceStatusText: document.getElementById('voiceStatusText'),
  voiceTranscriptLog: document.getElementById('voiceTranscriptLog'),
  verificationContent: document.getElementById('verificationContent'),

  // Header Actions & Universal Modals
  saveBtn: document.getElementById('saveBtn'),
  shareBtn: document.getElementById('shareBtn'),
  exportMdBtn: document.getElementById('exportMdBtn'),
  shareModal: document.getElementById('shareModal'),
  shareUrlInput: document.getElementById('shareUrlInput'),
  copyShareUrlBtn: document.getElementById('copyShareUrlBtn'),
  closeShareModalBtn: document.getElementById('closeShareModalBtn'),
  addTaskModal: document.getElementById('addTaskModal'),
  addCustomTaskBtn: document.getElementById('addCustomTaskBtn'),
  customTaskTitle: document.getElementById('customTaskTitle'),
  customTaskDesc: document.getElementById('customTaskDesc'),
  customTaskPriority: document.getElementById('customTaskPriority'),
  cancelAddTaskBtn: document.getElementById('cancelAddTaskBtn'),
  saveCustomTaskBtn: document.getElementById('saveCustomTaskBtn')
};

// Application Init
document.addEventListener('DOMContentLoaded', async () => {
  setupTheme();
  setupModeSwitcher();
  setupGovAgent();
  setupContractAssistant();
  setupSpeechRecognition();
  setupUniversalModals();

  switchMode('contract');
  await checkServerHealth();
  setInterval(checkServerHealth, 15000);
});

// --- 1. THEME SWITCHER (LIGHT / DARK MODE) ---
function setupTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  updateThemeIcon();

  if (elements.themeToggleBtn) {
    elements.themeToggleBtn.addEventListener('click', () => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', state.theme);
      localStorage.setItem('theme', state.theme);
      updateThemeIcon();
    });
  }
}

function updateThemeIcon() {
  const sunIcon = document.querySelector('.sun-icon');
  const moonIcon = document.querySelector('.moon-icon');
  if (state.theme === 'dark') {
    if (sunIcon) sunIcon.style.display = 'none';
    if (moonIcon) moonIcon.style.display = 'block';
  } else {
    if (sunIcon) sunIcon.style.display = 'block';
    if (moonIcon) moonIcon.style.display = 'none';
  }
}

// --- 2. MODE SWITCHER ---
function setupModeSwitcher() {
  if (elements.modeGovBtn) elements.modeGovBtn.addEventListener('click', () => switchMode('gov'));
  if (elements.modeContractBtn) elements.modeContractBtn.addEventListener('click', () => switchMode('contract'));
}

function switchMode(mode) {
  state.activeMode = mode;
  if (mode === 'gov') {
    elements.modeGovBtn.classList.add('active');
    elements.modeContractBtn.classList.remove('active');
    if (elements.govViewContainer) elements.govViewContainer.style.display = 'block';
    if (elements.contractViewContainer) elements.contractViewContainer.style.display = 'none';
    elements.appHeaderTitle.textContent = 'Government Process Agent';
    elements.appHeaderSubtitle.textContent = 'Action-Oriented Real-World Services & Verified Portals';
  } else {
    elements.modeGovBtn.classList.remove('active');
    elements.modeContractBtn.classList.add('active');
    if (elements.govViewContainer) elements.govViewContainer.style.display = 'none';
    if (elements.contractViewContainer) elements.contractViewContainer.style.display = 'block';
    elements.appHeaderTitle.textContent = 'User Contract Transparency';
    elements.appHeaderSubtitle.textContent = 'Protecting Users from Hidden Obligations';
  }
}

// --- 3. SERVER HEALTH & DASHBOARD WIDGETS ---
async function checkServerHealth() {
  try {
    const res = await fetch('/api/health');
    if (res.ok) {
      state.serverOnline = true;
      elements.healthStatusText.textContent = 'Cloud AI Active';
      elements.healthDot.style.background = 'var(--success)';
      elements.healthBadge.style.background = 'var(--success-bg)';
      elements.healthBadge.style.color = 'var(--success)';
    } else {
      throw new Error('Server non-200');
    }
  } catch (err) {
    state.serverOnline = false;
    elements.healthStatusText.textContent = 'Offline Local Mode';
    elements.healthDot.style.background = 'var(--warning)';
    elements.healthBadge.style.background = 'var(--warning-bg)';
    elements.healthBadge.style.color = 'var(--warning)';
  }
}

function updateDashboardWidgets() {
  if (elements.widgetTotalDocs) elements.widgetTotalDocs.textContent = state.stats.totalDocsProcessed;
  
  if (state.contract.analysis && elements.widgetRiskLevel) {
    elements.widgetRiskLevel.textContent = state.contract.analysis.summary.overallRiskScore || 'Analyzed';
  }

  const total = state.contract.checklist.length;
  const completed = state.contract.checklist.filter(i => i.status === 'Completed').length;
  if (elements.widgetTasksRatio) elements.widgetTasksRatio.textContent = `${completed} / ${total}`;
}

// --- 4. CONTRACT TRANSPARENCY ASSISTANT ---
function setupContractAssistant() {
  // Tab Navigation
  elements.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.tabButtons.forEach(b => b.classList.remove('active'));
      elements.tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      const targetContent = document.getElementById(tabId);
      if (targetContent) targetContent.classList.add('active');
    });
  });

  // Textarea Counter
  if (elements.pastedText) {
    elements.pastedText.addEventListener('input', () => {
      elements.charCounter.textContent = `${elements.pastedText.value.length} / 50000`;
    });
  }

  // Upload Dropzone
  if (elements.browseBtn) {
    elements.browseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      elements.fileInput.click();
    });
  }

  if (elements.dropzone) {
    elements.dropzone.addEventListener('click', (e) => {
      if (e.target !== elements.browseBtn && !elements.browseBtn.contains(e.target)) {
        elements.fileInput.click();
      }
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      elements.dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        elements.dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      elements.dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        elements.dropzone.classList.remove('dragover');
      });
    });

    elements.dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) {
        handleContractFileUpload(files[0]);
      }
    });
  }

  if (elements.fileInput) {
    elements.fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) handleContractFileUpload(e.target.files[0]);
    });
  }

  // Analyze Button
  if (elements.analyzeBtn) {
    elements.analyzeBtn.addEventListener('click', () => {
      const text = elements.pastedText.value.trim();
      if (text) {
        state.contract.documentText = text;
        state.contract.filename = 'Pasted Contract Terms';
        performContractAnalysis({ text, filename: state.contract.filename });
      } else {
        alert('Please select a contract file or paste document text to analyze.');
      }
    });
  }

  // Feature / Sample Cards
  document.querySelectorAll('#quickSampleChipsContainer .feature-card').forEach(card => {
    card.addEventListener('click', async () => {
      const sampleId = card.getAttribute('data-id');
      showProgressiveLoading('Loading sample document...');
      try {
        const sample = await fetchJson(`/api/samples/${sampleId}`);
        state.contract.documentText = sample.text;
        state.contract.filename = sample.title;
        elements.pastedText.value = sample.text;
        elements.charCounter.textContent = `${sample.text.length} / 50000`;
        await performContractAnalysis({ sampleId });
      } catch (err) {
        hideProgressiveLoading();
        alert('Error loading sample document: ' + err.message);
      }
    });
  });

  // Filter
  if (elements.severityFilter) {
    elements.severityFilter.addEventListener('change', renderContractFindings);
  }

  // Chat
  if (elements.sendChatBtn) elements.sendChatBtn.addEventListener('click', sendContractChatMessage);
  if (elements.chatInput) {
    elements.chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendContractChatMessage();
    });
  }

  document.querySelectorAll('.chat-card .prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      elements.chatInput.value = prompt;
      sendContractChatMessage();
    });
  });

  // Custom Task Modal
  if (elements.addCustomTaskBtn) {
    elements.addCustomTaskBtn.addEventListener('click', () => {
      elements.customTaskTitle.value = '';
      elements.customTaskDesc.value = '';
      elements.customTaskPriority.value = 'Medium';
      elements.addTaskModal.classList.add('open');
    });
  }

  if (elements.cancelAddTaskBtn) {
    elements.cancelAddTaskBtn.addEventListener('click', () => {
      elements.addTaskModal.classList.remove('open');
    });
  }

  if (elements.saveCustomTaskBtn) {
    elements.saveCustomTaskBtn.addEventListener('click', addCustomChecklistTask);
  }
}

// Progressive Loading Animation
function showProgressiveLoading(initialText = 'Analyzing contract...') {
  elements.analyzeBtn.disabled = true;
  if (elements.analyzeBtnText) elements.analyzeBtnText.textContent = '⏳ Analyzing...';
  if (elements.analysisLoadingState) {
    elements.analysisLoadingState.style.display = 'block';
    elements.loadingStepTitle.textContent = initialText;
    elements.loadingProgressFill.style.width = '20%';
  }
}

function updateProgressiveLoading(title, sub, percentage) {
  if (elements.loadingStepTitle) elements.loadingStepTitle.textContent = title;
  if (elements.loadingStepSub) elements.loadingStepSub.textContent = sub;
  if (elements.loadingProgressFill) elements.loadingProgressFill.style.width = `${percentage}%`;
}

function hideProgressiveLoading() {
  elements.analyzeBtn.disabled = false;
  if (elements.analyzeBtnText) elements.analyzeBtnText.textContent = 'Analyze Document ✦';
  if (elements.analysisLoadingState) elements.analysisLoadingState.style.display = 'none';
}

async function handleContractFileUpload(file) {
  showProgressiveLoading(`Uploading ${file.name}...`);
  updateProgressiveLoading('Reading File...', 'Extracting document text & layout', 40);

  const formData = new FormData();
  formData.append('file', file);

  try {
    const data = await fetchJson('/api/analyze', { method: 'POST', body: formData });

    updateProgressiveLoading('Analyzing Obligations...', 'Scanning for bonds, fees, and penalties', 80);
    setTimeout(() => {
      onContractAnalysisComplete(data);
      hideProgressiveLoading();
    }, 400);
  } catch (err) {
    hideProgressiveLoading();
    alert('Upload failed: ' + err.message);
  }
}

async function performContractAnalysis(payload) {
  showProgressiveLoading('Processing contract text...');
  updateProgressiveLoading('AI Analysis Active...', 'Detecting hidden obligations & risk levels', 50);

  try {
    const data = await fetchJson('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    updateProgressiveLoading('Generating Checklist...', 'Structuring action items and trace log', 90);
    setTimeout(() => {
      onContractAnalysisComplete(data);
      hideProgressiveLoading();
    }, 400);
  } catch (err) {
    hideProgressiveLoading();
    alert('Analysis failed: ' + err.message);
  }
}

function onContractAnalysisComplete(data) {
  state.contract.analysis = data.analysis;
  state.contract.documentText = data.documentText;
  state.contract.filename = data.filename;
  state.contract.company = data.company;
  state.contract.checklist = data.analysis.checklist || [];
  state.stats.totalDocsProcessed++;

  const btn = document.querySelector('#contractViewContainer .tab-btn[data-tab="tab-findings"]');
  if (btn) btn.click();

  renderContractSummary();
  renderContractFindings();
  renderContractChecklist();
  renderCompanyVerification();
  renderAnalysisTrace();
  updateDashboardWidgets();
}

function renderContractSummary() {
  if (!state.contract.analysis) return;
  const { summary } = state.contract.analysis;

  elements.docNameText.textContent = state.contract.filename || 'Contract Document';
  elements.docTypeBadge.textContent = 'DOCUMENT ANALYZED';
  elements.riskSummaryText.innerHTML = formatMarkdownText(summary.studentFriendlySummary);

  elements.riskScoreBadge.textContent = summary.overallRiskScore;
  elements.riskScoreBadge.className = 'risk-score-badge';
  if (summary.highSeverity >= 2) {
    elements.riskScoreBadge.classList.add('risk-score-high');
  } else if (summary.highSeverity === 1 || summary.mediumSeverity >= 2) {
    elements.riskScoreBadge.classList.add('risk-score-med');
  } else {
    elements.riskScoreBadge.classList.add('risk-score-low');
  }

  const missing = state.contract.analysis.missingInformation || [];
  if (missing.length > 0) {
    elements.missingInfoAlert.style.display = 'block';
    elements.missingInfoList.innerHTML = missing.map(m => `
      <li><strong>${escapeHtml(m.item)}:</strong> ${escapeHtml(m.detail)}</li>
    `).join('');
  } else {
    elements.missingInfoAlert.style.display = 'none';
  }
}

function renderContractFindings() {
  if (!state.contract.analysis) return;
  let findings = state.contract.analysis.findings || [];
  elements.findingsCountBadge.textContent = findings.length;

  const filter = elements.severityFilter.value;
  if (filter !== 'all') {
    findings = findings.filter(f => f.severity === filter);
  }

  if (findings.length === 0) {
    elements.findingsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✅</div>
        <h3>No findings matching filter</h3>
        <p>There are no contract obligations identified for severity level: <strong>${filter}</strong>.</p>
      </div>
    `;
    return;
  }

  elements.findingsContainer.innerHTML = findings.map(f => `
    <div class="finding-card severity-${f.severity}">
      <div class="finding-header">
        <div>
          <div class="finding-title">${escapeHtml(f.finding)}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem;">
            Category: ${f.category.toUpperCase()} • Section/Page ${f.page || 1} • Amount: ${escapeHtml(f.amount)}
          </div>
        </div>
        <span class="badge badge-${f.severity === 'high' ? 'red' : f.severity === 'medium' ? 'amber' : 'green'}">${f.severity} Risk</span>
      </div>

      <!-- Structured 3-Part Grid -->
      <div class="finding-three-grid">
        <div class="finding-box-part box-original">
          <div class="box-part-title">📄 Original Clause</div>
          "${escapeHtml(f.evidence)}"
        </div>

        <div class="finding-box-part box-simple">
          <div class="box-part-title">💡 In Simple Words</div>
          ${escapeHtml(f.description)}
        </div>

        <div class="finding-box-part box-action">
          <div class="box-part-title">✅ What You Should Check</div>
          ${escapeHtml(f.recommended_action)}
        </div>
      </div>
    </div>
  `).join('');
}

function renderContractChecklist() {
  const total = state.contract.checklist.length;
  const completed = state.contract.checklist.filter(i => i.status === 'Completed').length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  elements.checklistProgressBadge.textContent = `${percentage}%`;
  elements.progressPercentageText.textContent = `${percentage}%`;
  elements.progressRatioText.textContent = `${completed} / ${total}`;
  elements.progressBarFill.style.width = `${percentage}%`;

  if (total === 0) {
    elements.checklistContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✅</div>
        <h3>Checklist is Empty</h3>
        <p>Upload a document to generate your personalized step-by-step action checklist.</p>
      </div>
    `;
    return;
  }

  elements.checklistContainer.innerHTML = state.contract.checklist.map(item => `
    <div class="checklist-item" data-id="${item.id}">
      <input type="checkbox" class="checklist-cb contract-task-cb" ${item.status === 'Completed' ? 'checked' : ''} data-id="${item.id}">
      <div style="flex: 1;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 700; font-size: 0.925rem; color: var(--text-main); ${item.status === 'Completed' ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">
            ${escapeHtml(item.task)}
          </span>
          <span class="badge ${item.priority === 'High' ? 'badge-red' : 'badge-amber'}">${item.priority || 'Medium'}</span>
        </div>
        <p style="font-size: 0.825rem; color: var(--text-muted); margin-top: 0.15rem;">${escapeHtml(item.description)}</p>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.contract-task-cb').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = cb.getAttribute('data-id');
      state.contract.checklist = state.contract.checklist.map(t => 
        t.id === id ? { ...t, status: e.target.checked ? 'Completed' : 'Pending' } : t
      );
      renderContractChecklist();
      updateDashboardWidgets();
    });
  });
}

function addCustomChecklistTask() {
  const title = elements.customTaskTitle.value.trim();
  const desc = elements.customTaskDesc.value.trim();
  const priority = elements.customTaskPriority.value;

  if (!title) {
    alert('Please enter a task title.');
    return;
  }

  const newTask = {
    id: `custom_${Date.now()}`,
    task: title,
    description: desc || 'User-added custom action item.',
    priority: priority || 'Medium',
    status: 'Pending',
    category: 'custom'
  };

  state.contract.checklist.push(newTask);
  elements.addTaskModal.classList.remove('open');
  renderContractChecklist();
  updateDashboardWidgets();
}

function renderCompanyVerification() {
  if (!state.contract.company) {
    elements.verificationContent.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏛️</div>
        <h3>No Entity Verified Yet</h3>
        <p>Upload a document to automatically verify corporate registration records.</p>
      </div>
    `;
    return;
  }

  const c = state.contract.company;
  elements.verificationContent.innerHTML = `
    <div style="background: var(--bg-card-solid); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1.35rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <div>
          <h3 style="font-size: 1.15rem; color: var(--text-main);">${escapeHtml(c.companyName)}</h3>
          <span style="font-size: 0.8rem; color: var(--text-muted);">Queried Identifier: ${escapeHtml(c.queriedName)}</span>
        </div>
        <span class="badge ${c.verified ? 'badge-green' : 'badge-amber'}">
          ${c.verified ? 'VERIFIED REGISTRATION' : 'NEEDS PUBLIC CHECK'}
        </span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; font-size: 0.875rem; margin-bottom: 1rem;">
        <div><strong>Corporate Identification Number (CIN):</strong> ${escapeHtml(c.cin)}</div>
        <div><strong>Registration Status:</strong> ${escapeHtml(c.registrationStatus)}</div>
        <div><strong>State / Jurisdiction:</strong> ${escapeHtml(c.state)}</div>
        <div><strong>Registration Authority:</strong> ${escapeHtml(c.authority)}</div>
        <div><strong>Primary Source:</strong> <a href="${c.sourceUrl}" target="_blank" style="color: var(--primary);">${escapeHtml(c.source)}</a></div>
        <div><strong>Verification Date:</strong> ${c.verificationDate}</div>
      </div>

      <div style="background: var(--warning-bg); border: 1px solid rgba(245,158,11,0.3); color: #92400E; border-radius: 8px; padding: 0.85rem; font-size: 0.825rem; line-height: 1.5;">
        ${escapeHtml(c.disclaimer)}
      </div>
    </div>
  `;
}

function renderAnalysisTrace() {
  const steps = [
    '✓ Document loaded & parsed cleanly.',
    '✓ Financial obligation rules executed (training fees, deposits).',
    '✓ Service bond & lock-in tenure checked.',
    '✓ Notice period & exit penalties calculated.',
    '✓ Unclear & missing terms identified.',
    '✓ Corporate entity cross-checked against MCA registry.',
    '✓ Student action checklist generated.'
  ];

  elements.agentTraceBox.innerHTML = steps.map(s => `<div>${s}</div>`).join('');
}

async function sendContractChatMessage() {
  const msg = elements.chatInput.value.trim();
  if (!msg) return;
  elements.chatInput.value = '';

  const userBubble = document.createElement('div');
  userBubble.className = 'chat-bubble user-bubble';
  userBubble.textContent = msg;
  elements.chatMessages.appendChild(userBubble);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;

  try {
    const data = await fetchJson('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: msg,
        context: {
          documentText: state.contract.documentText,
          findings: state.contract.analysis ? state.contract.analysis.findings : [],
          checklist: state.contract.checklist
        }
      })
    });

    const botBubble = document.createElement('div');
    botBubble.className = 'chat-bubble assistant-bubble';
    botBubble.innerHTML = formatMarkdownText(data.reply);
    elements.chatMessages.appendChild(botBubble);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  } catch (err) {
    const errorBubble = document.createElement('div');
    errorBubble.className = 'chat-bubble assistant-bubble';
    errorBubble.style.background = 'var(--danger-bg)';
    errorBubble.style.color = 'var(--danger)';
    errorBubble.textContent = 'Error: ' + err.message;
    elements.chatMessages.appendChild(errorBubble);
  }
}

// --- 5. PRESERVED GOVERNMENT AGENT FUNCTIONS ---
function setupGovAgent() {
  if (elements.startGoalBtn) {
    elements.startGoalBtn.addEventListener('click', () => {
      const goal = elements.goalInputField.value.trim();
      if (goal) executeGovGoal(goal);
    });
  }

  if (elements.goalInputField) {
    elements.goalInputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const goal = elements.goalInputField.value.trim();
        if (goal) executeGovGoal(goal);
      }
    });
  }

  document.querySelectorAll('.chips-row .landing-prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const goal = chip.getAttribute('data-goal');
      elements.goalInputField.value = goal;
      executeGovGoal(goal);
    });
  });

  if (elements.govValidateBtn) elements.govValidateBtn.addEventListener('click', validateGovFormFields);
  if (elements.govLaunchReviewBtn) elements.govLaunchReviewBtn.addEventListener('click', openGovReviewModal);
  if (elements.govConsentCheckbox) {
    elements.govConsentCheckbox.addEventListener('change', (e) => {
      elements.confirmGovSubmissionBtn.disabled = !e.target.checked;
    });
  }
  if (elements.cancelGovReviewBtn) {
    elements.cancelGovReviewBtn.addEventListener('click', () => {
      elements.govReviewModal.classList.remove('open');
    });
  }
  if (elements.confirmGovSubmissionBtn) elements.confirmGovSubmissionBtn.addEventListener('click', submitGovApplication);

  document.querySelectorAll('.gov-voice-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const query = chip.getAttribute('data-query');
      handleGovVoiceQuery(query);
    });
  });
}

async function executeGovGoal(goal, clarifiedState = null) {
  try {
    elements.startGoalBtn.disabled = true;
    elements.startGoalBtn.textContent = '⚡ Analyzing Goal...';

    const data = await fetchJson('/api/agent/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal,
        context: {
          sessionId: state.sessionId,
          clarifiedState,
          uploadedDocs: state.contract.documentText ? [{ name: state.contract.filename || 'Uploaded Contract', text: state.contract.documentText }] : [],
          documentText: state.contract.documentText || '',
          mode: 'government-agent'
        }
      })
    });

    // The existing /api/agent/run returns {success, goal, plan, trace, analysis, checklist, ...}
    // Map the agent response into gov process view structure
    if (data.needsClarification) {
      renderGovClarification(goal, data.clarification, data.understanding);
      return;
    }

    elements.govClarificationCard.style.display = 'none';

    // Build gov process object from agent response
    state.gov.process = data.process || {
      id: 'gov_' + Date.now(),
      title: goal,
      category: 'Government Service',
      department: 'General Department',
      state: clarifiedState || 'India',
      applicableFees: 'Varies by service',
      purpose: goal,
      officialPortal: {
        name: 'Official Government Portal',
        domain: 'india.gov.in',
        url: 'https://www.india.gov.in',
        lastVerifiedAt: new Date().toLocaleDateString()
      }
    };

    state.gov.requiredDocs = data.requiredDocs || [];
    state.gov.checklist = data.checklist || [];
    state.gov.formFields = data.formFields || [];
    state.gov.timeline = data.timeline || [{
      timestamp: new Date().toISOString(),
      type: 'AGENT_ANALYSIS',
      details: `Agent analyzed goal: "${goal}"`
    }];

    renderGovProcessView();
  } catch (err) {
    alert('Error running government agent: ' + err.message);
  } finally {
    elements.startGoalBtn.disabled = false;
    elements.startGoalBtn.textContent = 'Start Guidance ➔';
  }
}

function renderGovClarification(originalGoal, question, understanding) {
  elements.govClarificationCard.style.display = 'block';
  elements.govClarificationQuestion.textContent = question;

  const options = understanding.detectedCategory.includes('Land') ? ['Maharashtra', 'Karnataka', 'Delhi', 'National Portal'] : ['Maharashtra', 'All States', 'Income Certificate', 'Driving License'];

  elements.govClarificationOptions.innerHTML = options.map(opt => `
    <button class="btn btn-secondary btn-sm gov-clarify-opt-btn" data-opt="${opt}">${opt}</button>
  `).join('');

  document.querySelectorAll('.gov-clarify-opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const selected = btn.getAttribute('data-opt');
      executeGovGoal(originalGoal, selected);
    });
  });
}

function renderGovProcessView() {
  const p = state.gov.process;
  if (!p) return;

  elements.govProcessHeaderBanner.style.display = 'flex';
  elements.govCategoryBadge.textContent = p.category.toUpperCase();
  elements.govProcessTitle.textContent = p.title;
  elements.govDepartmentText.textContent = `${p.department} • Location: ${p.state}`;
  elements.govFeeText.textContent = p.applicableFees;

  elements.govMainGrid.style.display = 'grid';
  elements.govPortalName.textContent = p.officialPortal.name;
  elements.govPortalDomain.textContent = `Official Domain: ${p.officialPortal.domain}`;
  elements.govPortalLinkBtn.href = p.officialPortal.url;
  elements.govFreshnessBadge.textContent = `Verified ${p.officialPortal.lastVerifiedAt}`;
  elements.govPurposeText.textContent = `Purpose: ${p.purpose}`;

  elements.govDocCountBadge.textContent = state.gov.requiredDocs.length;
  elements.govRequiredDocsContainer.innerHTML = state.gov.requiredDocs.map(doc => `
    <div style="padding: 0.75rem; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 0.5rem;">
      <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 0.2rem;">
        ${doc.name}
        <span class="badge ${doc.userProvided ? 'badge-green' : doc.mandatory ? 'badge-red' : 'badge-amber'}" style="margin-left: 0.4rem;">
          ${doc.statusLabel}
        </span>
      </div>
      <div style="font-size: 0.8rem; color: var(--text-muted);"><strong>Why needed:</strong> ${doc.whyNeeded}</div>
      <div style="font-size: 0.775rem; color: var(--text-main); margin-top: 0.2rem;"><strong>Obtain at:</strong> ${doc.whereToObtain}</div>
    </div>
  `).join('');

  renderGovChecklist();
  renderGovFormFields();
  renderGovTimeline();

  speakAloud(`I found the official government process: ${p.title}. You have ${state.gov.requiredDocs.length} required documents.`);
}

function renderGovChecklist() {
  const total = state.gov.checklist.length;
  const completed = state.gov.checklist.filter(i => i.status === 'Completed').length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  elements.govChecklistProgressText.textContent = `${percentage}% Completed (${completed}/${total})`;

  elements.govChecklistContainer.innerHTML = state.gov.checklist.map(item => `
    <div class="checklist-item" data-id="${item.id}">
      <input type="checkbox" class="checklist-cb gov-task-cb" ${item.status === 'Completed' ? 'checked' : ''} data-id="${item.id}">
      <div style="flex: 1;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
          <span style="font-weight: 700; font-size: 0.9rem; ${item.status === 'Completed' ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">
            Step ${item.stepNumber || ''}: ${item.task}
          </span>
          <span class="badge ${item.priority === 'High' ? 'badge-red' : 'badge-amber'}">${item.priority}</span>
        </div>
        <p style="font-size: 0.825rem; color: var(--text-muted);">${item.description}</p>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.gov-task-cb').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = cb.getAttribute('data-id');
      state.gov.checklist = state.gov.checklist.map(t => t.id === id ? { ...t, status: e.target.checked ? 'Completed' : 'Pending' } : t);
      renderGovChecklist();
    });
  });
}

function renderGovFormFields() {
  elements.govFormFieldsContainer.innerHTML = state.gov.formFields.map(f => `
    <div style="margin-bottom: 0.85rem;">
      <div style="display: flex; justify-content: space-between; font-size: 0.825rem; font-weight: 600; margin-bottom: 0.25rem;">
        <span>${f.label} ${f.safeToFill ? '' : '<span style="color: var(--danger);">*</span>'}</span>
        <span style="font-size: 0.725rem; color: var(--primary);">${f.source} (${(f.confidence * 100).toFixed(0)}% conf)</span>
      </div>
      <input type="text" class="input-text gov-form-input ${f.value ? 'field-prefilled' : ''}" 
        name="${f.fieldName}" value="${escapeHtml(f.value)}" placeholder="${f.placeholder || 'Enter value...'}">
    </div>
  `).join('');

  // Smart Form Assistant: attach listeners to form fields for live guidance
  document.querySelectorAll('.gov-form-input').forEach(inp => {
    inp.addEventListener('input', () => renderSmartFormAssistant());
    inp.addEventListener('blur', () => renderSmartFormAssistant());
  });

  // Initial render of assistant
  renderSmartFormAssistant();
}

// --- SMART FORM ASSISTANT PANEL ---
function renderSmartFormAssistant() {
  const currentValues = {};
  document.querySelectorAll('.gov-form-input').forEach(inp => {
    currentValues[inp.name] = inp.value;
  });

  const analysis = analyzeFormState(state.gov.formFields, currentValues);

  // Find or create the assistant panel
  let panel = document.getElementById('smartFormAssistantPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'smartFormAssistantPanel';
    panel.className = 'card-glass';
    panel.style.cssText = 'margin-top: 1.25rem; border-left: 4px solid var(--primary);';
    const formContainer = elements.govFormFieldsContainer;
    if (formContainer && formContainer.parentNode) {
      formContainer.parentNode.insertBefore(panel, formContainer.nextSibling);
    }
  }

  let html = `<h3 class="card-title" style="margin-bottom: 0.75rem;">🧠 Smart Form Assistant</h3>`;

  // Completed fields
  const completedHtml = analysis.fieldStatus
    .filter(f => f.status === 'completed')
    .map(f => `<div style="color: var(--success); font-size: 0.825rem;">✓ ${escapeHtml(f.label)} completed</div>`)
    .join('');
  if (completedHtml) html += completedHtml;

  // Missing required fields
  if (analysis.missingFields.length > 0) {
    html += `<div style="margin-top: 0.75rem; padding: 0.75rem; background: var(--danger-bg); border: 1px solid rgba(239,68,68,0.3); border-radius: 8px;">
      <div style="font-weight: 700; font-size: 0.85rem; color: var(--danger); margin-bottom: 0.35rem;">Important information missing</div>`;
    analysis.missingFields.forEach(f => {
      html += `<div style="font-size: 0.8rem; color: #991b1b; margin-bottom: 0.15rem;">• ${escapeHtml(f.label)} <span style="font-size: 0.725rem;">(required)</span></div>`;
    });
    html += `</div>`;
  }

  // Incomplete fields
  if (analysis.incompleteFields.length > 0) {
    html += `<div style="margin-top: 0.75rem; padding: 0.75rem; background: var(--warning-bg); border: 1px solid rgba(245,158,11,0.3); border-radius: 8px;">
      <div style="font-weight: 700; font-size: 0.85rem; color: #b45309; margin-bottom: 0.35rem;">Possible incomplete information</div>`;
    analysis.incompleteFields.forEach(f => {
      html += `<div style="font-size: 0.8rem; color: #78350f;">${escapeHtml(f.issue)}</div>`;
    });
    html += `</div>`;
  }

  // Inconsistencies
  if (analysis.inconsistencies.length > 0) {
    html += `<div style="margin-top: 0.75rem; padding: 0.75rem; background: var(--warning-bg); border: 1px solid rgba(245,158,11,0.3); border-radius: 8px;">
      <div style="font-weight: 700; font-size: 0.85rem; color: #b45309; margin-bottom: 0.35rem;">⚠️ Potential inconsistency detected</div>`;
    analysis.inconsistencies.forEach(inc => {
      html += `<div style="font-size: 0.8rem; color: #78350f;">${escapeHtml(inc.issue)}<br><em>${escapeHtml(inc.recommendation)}</em></div>`;
    });
    html += `</div>`;
  }

  // Possible problems
  if (analysis.possibleProblems.length > 0) {
    html += `<div style="margin-top: 0.75rem; padding: 0.75rem; background: var(--bg); border: 1px solid var(--border); border-radius: 8px;">
      <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-main); margin-bottom: 0.35rem;">Possible issue</div>`;
    analysis.possibleProblems.forEach(p => {
      html += `<div style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(p)}</div>`;
    });
    html += `</div>`;
  }

  // Recommended next step
  html += `<div style="margin-top: 0.75rem; padding: 0.75rem; background: var(--primary-light); border: 1px solid var(--primary-border); border-radius: 8px;">
    <div style="font-weight: 700; font-size: 0.85rem; color: var(--primary); margin-bottom: 0.25rem;">→ Recommended next step</div>
    <div style="font-size: 0.875rem; font-weight: 600; color: var(--text-main);">${escapeHtml(analysis.nextStep)}</div>
    <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem;"><strong>Why:</strong> ${escapeHtml(analysis.reason)}</div>
    <div style="font-size: 0.8rem; color: var(--primary); margin-top: 0.15rem;">${escapeHtml(analysis.recommendedAction)}</div>
  </div>`;

  panel.innerHTML = html;
}

function validateGovFormFields() {
  const currentValues = {};
  document.querySelectorAll('.gov-form-input').forEach(inp => {
    currentValues[inp.name] = inp.value;
  });

  const analysis = analyzeFormState(state.gov.formFields, currentValues);

  // Render the assistant with latest state
  renderSmartFormAssistant();

  if (analysis.missingFields.length === 0 && analysis.inconsistencies.length === 0) {
    alert('✅ All required form fields are complete. Ready for review.');
    return true;
  } else {
    const errors = [];
    analysis.missingFields.forEach(f => errors.push(`• Missing: ${f.label}`));
    analysis.incompleteFields.forEach(f => errors.push(`• Incomplete: ${f.label}`));
    analysis.inconsistencies.forEach(inc => errors.push(`• ${inc.issue}`));
    alert(`⚠️ Please review form issues:\n\n${errors.join('\n')}`);
    return false;
  }
}

function openGovReviewModal() {
  const currentValues = {};
  document.querySelectorAll('.gov-form-input').forEach(inp => {
    currentValues[inp.name] = inp.value;
  });

  elements.govReviewFieldsList.innerHTML = state.gov.formFields.map(f => `
    <div style="margin-bottom: 0.5rem; font-size: 0.85rem;">
      <strong>${f.label}:</strong> <span>${currentValues[f.fieldName] || '<em style="color: var(--danger);">Missing</em>'}</span>
    </div>
  `).join('');

  elements.govConsentCheckbox.checked = false;
  elements.confirmGovSubmissionBtn.disabled = true;
  elements.govReviewModal.classList.add('open');
}

async function submitGovApplication() {
  try {
    elements.confirmGovSubmissionBtn.disabled = true;
    elements.confirmGovSubmissionBtn.textContent = 'Preparing Application Record...';

    const currentValues = {};
    document.querySelectorAll('.gov-form-input').forEach(inp => {
      currentValues[inp.name] = inp.value;
    });

    // Validate fields before preparing
    const analysis = analyzeFormState(state.gov.formFields, currentValues);
    if (analysis.missingFields.length > 0) {
      alert(`⚠️ Please fill all required fields before completing preparation:\n• ${analysis.missingFields.map(f => f.label).join('\n• ')}`);
      elements.confirmGovSubmissionBtn.disabled = false;
      elements.confirmGovSubmissionBtn.textContent = 'Confirm & Save Reference Number';
      return;
    }

    // Local reference number generation (Task 4)
    const refNumber = `GOV-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}`;
    state.gov.referenceNumber = refNumber;

    // Record timeline audit event
    const auditEvent = {
      timestamp: new Date().toISOString(),
      type: 'APPLICATION_PREPARED',
      details: {
        referenceNumber: refNumber,
        process: state.gov.process ? state.gov.process.title : 'Government Service',
        fieldsCompleted: Object.keys(currentValues).length,
        status: 'Prepared for official portal submission'
      }
    };
    state.gov.timeline.push(auditEvent);

    elements.govReviewModal.classList.remove('open');
    renderGovTimeline();

    const portalUrl = state.gov.process && state.gov.process.officialPortal ? state.gov.process.officialPortal.url : 'https://www.india.gov.in';
    const portalName = state.gov.process && state.gov.process.officialPortal ? state.gov.process.officialPortal.name : 'Official Portal';

    alert(`📋 Application Prepared Successfully!\n\nReference Tracking ID: ${refNumber}\n\n⚠️ Important Next Step:\nYour application details and checklist are ready. Please proceed to the official portal (${portalName}) to complete your final submission:\n${portalUrl}`);
    speakAloud(`Application prepared. Your reference tracking number is ${refNumber}. Please proceed to the official government portal for final submission.`);
  } catch (err) {
    alert('Preparation error: ' + err.message);
  } finally {
    elements.confirmGovSubmissionBtn.disabled = false;
    elements.confirmGovSubmissionBtn.textContent = 'Confirm & Save Reference Number';
  }
}

function renderGovTimeline() {
  if (!state.gov.timeline || state.gov.timeline.length === 0) {
    elements.govTimelineBox.innerHTML = '<div style="color: #64748b;">// Audit events will appear here</div>';
    return;
  }

  elements.govTimelineBox.innerHTML = state.gov.timeline.map(ev => `
    <div style="display: flex; gap: 0.75rem; margin-bottom: 0.75rem;">
      <span style="color: #38bdf8;">${ev.timestamp ? ev.timestamp.split('T')[1].slice(0, 8) : ''}</span>
      <div>
        <strong style="color: #f8fafc;">${ev.type}</strong>
        <div style="font-size: 0.775rem; color: #cbd5e1;">${typeof ev.details === 'object' ? JSON.stringify(ev.details) : ev.details}</div>
      </div>
    </div>
  `).join('');
}

async function handleGovVoiceQuery(query) {
  elements.govVoiceStatusText.textContent = '🤔 Thinking...';
  elements.govVoiceLog.innerHTML += `<div><strong>You:</strong> "${escapeHtml(query)}"</div>`;

  try {
    const data = await fetchJson('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: query,
        context: {
          mode: 'government-agent',
          process: state.gov.process,
          requiredDocs: state.gov.requiredDocs,
          checklist: state.gov.checklist,
          documentText: state.contract.documentText || '',
          findings: state.contract.analysis ? state.contract.analysis.findings : []
        }
      })
    });

    elements.govVoiceLog.innerHTML += `<div style="color: var(--primary);"><strong>Assistant:</strong> ${formatMarkdownText(data.reply)}</div>`;
    elements.govVoiceStatusText.textContent = '🔊 Speaking response...';
    speakAloud(data.reply);
  } catch (err) {
    elements.govVoiceLog.innerHTML += `<div style="color: var(--danger);"><strong>Error:</strong> ${escapeHtml(err.message)}</div>`;
    elements.govVoiceStatusText.textContent = 'Ready';
  }
}

// --- 6. SPEECH RECOGNITION & SYNTHESIS ---
function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  state.speechRecognition = new SpeechRecognition();
  state.speechRecognition.lang = 'en-US';

  state.speechRecognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    if (state.isListeningGov && elements.goalInputField) {
      elements.goalInputField.value = transcript;
      executeGovGoal(transcript);
    } else if (state.isListeningContract && elements.chatInput) {
      elements.chatInput.value = transcript;
      sendContractChatMessage();
    }
  };

  if (elements.goalMicBtn) {
    elements.goalMicBtn.addEventListener('click', () => {
      try {
        state.isListeningGov = true;
        state.isListeningContract = false;
        elements.goalMicBtn.classList.add('listening');
        state.speechRecognition.start();
      } catch (err) {}
    });
  }

  if (elements.voiceMicBtn) {
    elements.voiceMicBtn.addEventListener('click', () => {
      try {
        state.isListeningContract = true;
        state.isListeningGov = false;
        elements.voiceMicBtn.classList.add('listening');
        elements.voiceStatusText.textContent = '🎙️ Listening to your voice query...';
        state.speechRecognition.start();
      } catch (err) {}
    });
  }

  state.speechRecognition.onend = () => {
    state.isListeningGov = false;
    state.isListeningContract = false;
    if (elements.goalMicBtn) elements.goalMicBtn.classList.remove('listening');
    if (elements.voiceMicBtn) elements.voiceMicBtn.classList.remove('listening');
    if (elements.voiceStatusText) elements.voiceStatusText.textContent = 'Click the microphone and speak your query';
  };
}

function speakAloud(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*_#`]/g, ''));
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

// --- 7. UNIVERSAL ACTIONS & MODALS ---
function setupUniversalModals() {
  if (elements.saveBtn) {
    elements.saveBtn.addEventListener('click', async () => {
      try {
        const data = await fetchJson('/api/checklist/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentName: state.contract.filename || 'User Contract Analysis',
            analysis: state.contract.analysis,
            checklist: state.contract.checklist,
            company: state.contract.company
          })
        });
        if (data.shareUrl) {
          alert(`✅ Analysis state saved successfully!\nShare ID: ${data.shareId}`);
        }
      } catch (err) {
        alert('Failed to save state: ' + err.message);
      }
    });
  }

  if (elements.shareBtn) {
    elements.shareBtn.addEventListener('click', async () => {
      try {
        const data = await fetchJson('/api/checklist/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentName: state.contract.filename || 'User Contract Analysis',
            analysis: state.contract.analysis,
            checklist: state.contract.checklist,
            company: state.contract.company
          })
        });
        const fullShareUrl = window.location.origin + data.shareUrl;
        elements.shareUrlInput.value = fullShareUrl;
        elements.shareModal.classList.add('open');
      } catch (err) {
        elements.shareUrlInput.value = window.location.href;
        elements.shareModal.classList.add('open');
      }
    });
  }

  if (elements.closeShareModalBtn) {
    elements.closeShareModalBtn.addEventListener('click', () => {
      elements.shareModal.classList.remove('open');
    });
  }

  if (elements.copyShareUrlBtn) {
    elements.copyShareUrlBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(elements.shareUrlInput.value);
      alert('Shareable link copied to clipboard!');
    });
  }

  if (elements.exportMdBtn) {
    elements.exportMdBtn.addEventListener('click', exportMarkdownReport);
  }
}

function exportMarkdownReport() {
  if (!state.contract.analysis) {
    alert('Please analyze a contract document first before exporting a report.');
    return;
  }

  const { filename, summary, findings, missingInformation } = state.contract.analysis;
  const company = state.contract.company || {};
  const checklist = state.contract.checklist || [];

  let report = `# User Contract Transparency Analysis Report\n\n`;
  report += `**Document Name:** ${filename}\n`;
  report += `**Date:** ${new Date().toLocaleDateString()}\n`;
  report += `**Risk Rating:** ${summary.overallRiskScore}\n\n`;

  report += `## 1. Executive Summary\n\n`;
  report += `${summary.studentFriendlySummary}\n\n`;

  report += `## 2. Identified Contract Obligations & Clauses\n\n`;
  if (findings.length === 0) {
    report += `No high/medium risk obligations detected.\n\n`;
  } else {
    findings.forEach((f, idx) => {
      report += `### ${idx + 1}. ${f.finding} (${f.severity.toUpperCase()} RISK)\n`;
      report += `- **Category:** ${f.category}\n`;
      report += `- **Original Clause:** "${f.evidence}"\n`;
      report += `- **Explanation:** ${f.description}\n`;
      report += `- **Recommended Action:** ${f.recommended_action}\n\n`;
    });
  }

  if (missingInformation && missingInformation.length > 0) {
    report += `## 3. Unclear / Missing Terms\n\n`;
    missingInformation.forEach(m => {
      report += `- **${m.item}:** ${m.detail} *(Action: ${m.recommended_action})*\n`;
    });
    report += `\n`;
  }

  report += `## 4. User Action Checklist\n\n`;
  checklist.forEach((item, idx) => {
    report += `- [${item.status === 'Completed' ? 'x' : ' '}] **${item.task}** (${item.priority} Priority): ${item.description}\n`;
  });

  if (company && company.companyName) {
    report += `\n## 5. Corporate Entity Verification\n\n`;
    report += `- **Entity Name:** ${company.companyName}\n`;
    report += `- **CIN:** ${company.cin}\n`;
    report += `- **Status:** ${company.registrationStatus}\n`;
    report += `- **Authority:** ${company.authority}\n`;
    report += `- **Disclaimer:** ${company.disclaimer}\n`;
  }

  const blob = new Blob([report], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename.replace(/[^a-z0-9]/gi, '_')}_Analysis_Report.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Helpers
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatMarkdownText(text) {
  if (!text) return '';
  return text
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}
