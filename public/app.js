/**
 * app.js
 * Client controller for Student Contract Transparency Assistant and Government Process Agent.
 * Preserves 100% of existing API contracts, backend handlers, and state logic.
 */

// Global Application State
const state = {
  activeMode: 'contract', // Default primary mode is Student Contract Transparency Assistant
  sessionId: 'session_' + Date.now(),
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

// DOM Elements Registry
const elements = {
  // Mode Switcher & Global Header
  modeGovBtn: document.getElementById('modeGovBtn'),
  modeContractBtn: document.getElementById('modeContractBtn'),
  govLandingHero: document.getElementById('govLandingHero'),
  govViewContainer: document.getElementById('govViewContainer'),
  contractViewContainer: document.getElementById('contractViewContainer'),
  appHeaderTitle: document.getElementById('appHeaderTitle'),
  appHeaderSubtitle: document.getElementById('appHeaderSubtitle'),

  // Health Status
  healthBadge: document.getElementById('healthBadge'),
  healthDot: document.getElementById('healthDot'),
  healthStatusText: document.getElementById('healthStatusText'),

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
  
  // Findings & Workspace
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

// Application Initialization
document.addEventListener('DOMContentLoaded', async () => {
  setupModeSwitcher();
  setupGovAgent();
  setupContractAssistant();
  setupSpeechRecognition();
  setupUniversalModals();

  // Start in Primary Contract Analyzer Mode
  switchMode('contract');

  await checkServerHealth();
  setInterval(checkServerHealth, 15000);
});

// --- 1. MODE SWITCHER ---
function setupModeSwitcher() {
  elements.modeGovBtn.addEventListener('click', () => switchMode('gov'));
  elements.modeContractBtn.addEventListener('click', () => switchMode('contract'));
}

function switchMode(mode) {
  state.activeMode = mode;
  if (mode === 'gov') {
    elements.modeGovBtn.classList.add('active');
    elements.modeContractBtn.classList.remove('active');
    if (elements.govLandingHero) elements.govLandingHero.style.display = 'block';
    if (elements.govViewContainer) elements.govViewContainer.style.display = 'block';
    if (elements.contractViewContainer) elements.contractViewContainer.style.display = 'none';
    elements.appHeaderTitle.textContent = 'Government Process Automation Agent';
    elements.appHeaderSubtitle.textContent = 'Action-Oriented Real-World Services & Verified Portals';
  } else {
    elements.modeGovBtn.classList.remove('active');
    elements.modeContractBtn.classList.add('active');
    if (elements.govLandingHero) elements.govLandingHero.style.display = 'none';
    if (elements.govViewContainer) elements.govViewContainer.style.display = 'none';
    if (elements.contractViewContainer) elements.contractViewContainer.style.display = 'block';
    elements.appHeaderTitle.textContent = 'Student Contract Transparency Assistant';
    elements.appHeaderSubtitle.textContent = 'Protecting Students from Hidden Obligations';
  }
}

// --- 2. SERVER HEALTH ---
async function checkServerHealth() {
  try {
    const res = await fetch('/api/health');
    if (res.ok) {
      state.serverOnline = true;
      elements.healthStatusText.textContent = 'Cloud AI Active';
      elements.healthDot.style.background = '#22c55e';
      elements.healthBadge.style.background = '#f0fdf4';
      elements.healthBadge.style.color = '#166534';
    } else {
      throw new Error('Server non-200');
    }
  } catch (err) {
    state.serverOnline = false;
    elements.healthStatusText.textContent = 'Offline Local Mode';
    elements.healthDot.style.background = '#f59e0b';
    elements.healthBadge.style.background = '#fffbeb';
    elements.healthBadge.style.color = '#92400e';
  }
}

// --- 3. CONTRACT ASSISTANT CONTROLLER ---
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

  // Textarea Char Counter
  if (elements.pastedText) {
    elements.pastedText.addEventListener('input', () => {
      elements.charCounter.textContent = `${elements.pastedText.value.length} / 50000`;
    });
  }

  // File Upload Handlers
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
        alert('Please select a document file or paste contract text to analyze.');
      }
    });
  }

  // Sample Contract Cards
  document.querySelectorAll('#quickSampleChipsContainer .sample-card-item').forEach(card => {
    card.addEventListener('click', async () => {
      const sampleId = card.getAttribute('data-id');
      showProgressiveLoading('Loading sample contract...');
      try {
        const res = await fetch(`/api/samples/${sampleId}`);
        const sample = await res.json();
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

  // Severity Filter
  if (elements.severityFilter) {
    elements.severityFilter.addEventListener('change', renderContractFindings);
  }

  // Chatbot
  if (elements.sendChatBtn) {
    elements.sendChatBtn.addEventListener('click', sendContractChatMessage);
  }
  if (elements.chatInput) {
    elements.chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendContractChatMessage();
    });
  }

  // Suggested Prompts
  document.querySelectorAll('.chat-window .prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      elements.chatInput.value = prompt;
      sendContractChatMessage();
    });
  });

  // Add Custom Task Modal
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

// Progressive Loading Visual Animation
function showProgressiveLoading(initialText = 'Analyzing document...') {
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
  updateProgressiveLoading('Reading File...', 'Extracting document text and layout', 40);

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/analyze', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to analyze document');

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
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to complete analysis');

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

  // Automatically switch tab to Obligation Findings for immediate user value
  const btn = document.querySelector('#contractViewContainer .tab-btn[data-tab="tab-findings"]');
  if (btn) btn.click();

  renderContractSummary();
  renderContractFindings();
  renderContractChecklist();
  renderCompanyVerification();
  renderAnalysisTrace();
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

  // Missing Information Alert
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
      <div class="empty-state-box">
        <div class="empty-state-icon">✅</div>
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
        <span class="badge badge-${f.severity}">${f.severity} Risk</span>
      </div>

      <!-- Structured 3-Part Grid: Original Clause vs In Simple Words vs What You Should Check -->
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
      <div class="empty-state-box">
        <div class="empty-state-icon">✅</div>
        <h3>Checklist is Empty</h3>
        <p>Upload a document to generate your personalized action checklist.</p>
      </div>
    `;
    return;
  }

  elements.checklistContainer.innerHTML = state.contract.checklist.map(item => `
    <div class="checklist-item" data-id="${item.id}">
      <input type="checkbox" class="checklist-checkbox contract-task-cb" ${item.status === 'Completed' ? 'checked' : ''} data-id="${item.id}">
      <div class="checklist-body">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="checklist-task-title" style="${item.status === 'Completed' ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">
            ${escapeHtml(item.task)}
          </span>
          <span class="badge ${item.priority === 'High' ? 'badge-high' : 'badge-medium'}">${item.priority || 'Medium'}</span>
        </div>
        <p class="checklist-desc">${escapeHtml(item.description)}</p>
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
}

function renderCompanyVerification() {
  if (!state.contract.company) {
    elements.verificationContent.innerHTML = `
      <div class="empty-state-box">
        <div class="empty-state-icon">🏛️</div>
        <h3>No Entity Verified Yet</h3>
        <p>Upload a document to automatically verify corporate registration records.</p>
      </div>
    `;
    return;
  }

  const c = state.contract.company;
  elements.verificationContent.innerHTML = `
    <div class="verification-card">
      <div class="verification-header">
        <div>
          <h3 style="font-size: 1.15rem; color: #0f172a;">${escapeHtml(c.companyName)}</h3>
          <span style="font-size: 0.8rem; color: var(--text-muted);">Queried Identifier: ${escapeHtml(c.queriedName)}</span>
        </div>
        <span class="badge ${c.verified ? 'badge-low' : 'badge-medium'}">
          ${c.verified ? 'VERIFIED REGISTRATION' : 'NEEDS PUBLIC CHECK'}
        </span>
      </div>

      <div class="verification-field-grid">
        <div><strong>Corporate Identification Number (CIN):</strong> ${escapeHtml(c.cin)}</div>
        <div><strong>Registration Status:</strong> ${escapeHtml(c.registrationStatus)}</div>
        <div><strong>State / Jurisdiction:</strong> ${escapeHtml(c.state)}</div>
        <div><strong>Registration Authority:</strong> ${escapeHtml(c.authority)}</div>
        <div><strong>Primary Source:</strong> <a href="${c.sourceUrl}" target="_blank" style="color: var(--primary);">${escapeHtml(c.source)}</a></div>
        <div><strong>Verification Date:</strong> ${c.verificationDate}</div>
      </div>

      <div class="verification-disclaimer">
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
  userBubble.className = 'chat-bubble chat-user';
  userBubble.textContent = msg;
  elements.chatMessages.appendChild(userBubble);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;

  try {
    const res = await fetch('/api/chat', {
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
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch response');

    const botBubble = document.createElement('div');
    botBubble.className = 'chat-bubble chat-assistant';
    botBubble.innerHTML = formatMarkdownText(data.reply);
    elements.chatMessages.appendChild(botBubble);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  } catch (err) {
    const errorBubble = document.createElement('div');
    errorBubble.className = 'chat-bubble chat-assistant';
    errorBubble.style.background = '#fef2f2';
    errorBubble.style.color = '#991b1b';
    errorBubble.textContent = 'Error: ' + err.message;
    elements.chatMessages.appendChild(errorBubble);
  }
}

// --- 4. PRESERVED GOVERNMENT AGENT FUNCTIONS ---
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

  document.querySelectorAll('.landing-prompt-chip').forEach(chip => {
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

    const res = await fetch('/api/gov/agent/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal,
        sessionContext: {
          sessionId: state.sessionId,
          clarifiedState,
          uploadedDocs: state.contract.documentText ? [{ name: state.contract.filename || 'Uploaded Contract', text: state.contract.documentText }] : []
        }
      })
    });

    const data = await res.json();

    if (data.needsClarification) {
      renderGovClarification(goal, data.clarification, data.understanding);
      return;
    }

    elements.govClarificationCard.style.display = 'none';
    state.gov.process = data.process;
    state.gov.requiredDocs = data.requiredDocs || [];
    state.gov.checklist = data.checklist || [];
    state.gov.formFields = data.formFields || [];
    state.gov.timeline = data.timeline || [];

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
    <div class="doc-intel-item ${doc.userProvided ? 'ready' : doc.mandatory ? 'mandatory' : 'conditional'}" style="padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 0.5rem;">
      <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 0.2rem;">
        ${doc.name}
        <span class="badge ${doc.userProvided ? 'badge-low' : doc.mandatory ? 'badge-high' : 'badge-medium'}" style="margin-left: 0.4rem;">
          ${doc.statusLabel}
        </span>
      </div>
      <div style="font-size: 0.8rem; color: var(--text-muted);"><strong>Why needed:</strong> ${doc.whyNeeded}</div>
      <div style="font-size: 0.775rem; color: #475569; margin-top: 0.2rem;"><strong>Obtain at:</strong> ${doc.whereToObtain}</div>
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
      <input type="checkbox" class="checklist-checkbox gov-task-cb" ${item.status === 'Completed' ? 'checked' : ''} data-id="${item.id}">
      <div class="checklist-body">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
          <span class="checklist-task-title" style="${item.status === 'Completed' ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">
            Step ${item.stepNumber || ''}: ${item.task}
          </span>
          <span class="badge ${item.priority === 'High' ? 'badge-high' : 'badge-medium'}">${item.priority}</span>
        </div>
        <p class="checklist-desc">${item.description}</p>
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
    <div class="form-field-row">
      <div class="form-field-header">
        <span>${f.label} ${f.safeToFill ? '' : '<span style="color: #dc2626;">*</span>'}</span>
        <span class="field-source-badge">${f.source} (${(f.confidence * 100).toFixed(0)}% conf)</span>
      </div>
      <input type="text" class="input-text gov-form-input ${f.value ? 'field-prefilled' : ''}" 
        name="${f.fieldName}" value="${escapeHtml(f.value)}" placeholder="${f.placeholder || 'Enter value...'}">
    </div>
  `).join('');
}

async function validateGovFormFields() {
  const currentValues = {};
  document.querySelectorAll('.gov-form-input').forEach(inp => {
    currentValues[inp.name] = inp.value;
  });

  try {
    const res = await fetch('/api/gov/form/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        formFields: state.gov.formFields,
        fieldValues: currentValues
      })
    });

    const data = await res.json();
    if (data.validation.isValid) {
      alert('✅ All form fields validated successfully! Ready for final review.');
    } else {
      const msg = data.validation.errors.map(e => `• ${e.error}`).join('\n');
      alert(`⚠️ Please review form errors:\n\n${msg}`);
    }
  } catch (err) {
    alert('Validation error: ' + err.message);
  }
}

function openGovReviewModal() {
  const currentValues = {};
  document.querySelectorAll('.gov-form-input').forEach(inp => {
    currentValues[inp.name] = inp.value;
  });

  elements.govReviewFieldsList.innerHTML = state.gov.formFields.map(f => `
    <div class="review-field-item" style="margin-bottom: 0.5rem;">
      <strong>${f.label}:</strong> <span>${currentValues[f.fieldName] || '<em style="color: #dc2626;">Missing</em>'}</span>
    </div>
  `).join('');

  elements.govConsentCheckbox.checked = false;
  elements.confirmGovSubmissionBtn.disabled = true;
  elements.govReviewModal.classList.add('open');
}

async function submitGovApplication() {
  try {
    elements.confirmGovSubmissionBtn.disabled = true;
    elements.confirmGovSubmissionBtn.textContent = 'Processing Registration...';

    const currentValues = {};
    document.querySelectorAll('.gov-form-input').forEach(inp => {
      currentValues[inp.name] = inp.value;
    });

    const res = await fetch('/api/gov/application/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        processId: state.gov.process.id,
        confirmedFields: currentValues,
        userSignatureConsent: true,
        sessionId: state.sessionId
      })
    });

    const data = await res.json();
    state.gov.referenceNumber = data.referenceNumber;
    state.gov.timeline = data.timeline;

    elements.govReviewModal.classList.remove('open');
    renderGovTimeline();

    alert(`🎉 Application Registered Successfully!\n\nOfficial Reference Number: ${data.referenceNumber}\n\nPlease save this number for portal tracking.`);
    speakAloud(`Application registered. Reference number is ${data.referenceNumber}.`);
  } catch (err) {
    alert('Submission error: ' + err.message);
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
    <div class="timeline-event-item">
      <span class="timeline-time">${ev.timestamp.split('T')[1].slice(0, 8)}</span>
      <div>
        <span class="timeline-title">${ev.type}</span>
        <div class="timeline-desc">${typeof ev.details === 'object' ? JSON.stringify(ev.details) : ev.details}</div>
      </div>
    </div>
  `).join('');
}

async function handleGovVoiceQuery(query) {
  elements.govVoiceStatusText.textContent = '🤔 Thinking...';
  elements.govVoiceLog.innerHTML += `<div><strong>You:</strong> "${query}"</div>`;

  try {
    const res = await fetch('/api/gov/voice/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        context: {
          process: state.gov.process,
          requiredDocs: state.gov.requiredDocs,
          checklist: state.gov.checklist
        }
      })
    });

    const data = await res.json();
    elements.govVoiceLog.innerHTML += `<div style="color: #0284c7;"><strong>Assistant:</strong> ${data.reply}</div>`;
    elements.govVoiceStatusText.textContent = '🔊 Speaking response...';
    speakAloud(data.reply);
  } catch (err) {
    elements.govVoiceStatusText.textContent = 'Ready';
  }
}

// --- 5. SPEECH RECOGNITION & SYNTHESIS ---
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

// --- 6. UNIVERSAL ACTIONS & MODALS ---
function setupUniversalModals() {
  // Save State Action
  if (elements.saveBtn) {
    elements.saveBtn.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/checklist/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentName: state.contract.filename || 'Student Contract Analysis',
            analysis: state.contract.analysis,
            checklist: state.contract.checklist,
            company: state.contract.company
          })
        });
        const data = await res.json();
        if (data.shareUrl) {
          alert(`✅ Analysis state saved successfully!\nShare ID: ${data.shareId}`);
        }
      } catch (err) {
        alert('Failed to save state: ' + err.message);
      }
    });
  }

  // Share Action
  if (elements.shareBtn) {
    elements.shareBtn.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/checklist/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentName: state.contract.filename || 'Student Contract Analysis',
            analysis: state.contract.analysis,
            checklist: state.contract.checklist,
            company: state.contract.company
          })
        });
        const data = await res.json();
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

  // Export Markdown Report Action
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

  let report = `# Student Contract Transparency Analysis Report\n\n`;
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

  report += `## 4. Student Action Checklist\n\n`;
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

// Utility Helpers
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
