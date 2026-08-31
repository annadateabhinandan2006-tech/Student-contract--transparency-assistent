/**
 * app.js
 * Client application controller for Student Contract Transparency & Obligation Assistant.
 */

// Global State
const state = {
  documentText: '',
  filename: '',
  analysis: null,
  company: null,
  checklist: [],
  samples: [],
  isListening: false,
  speechRecognition: null,
  serverOnline: true
};

// DOM Elements
const elements = {
  healthBadge: document.getElementById('healthBadge'),
  healthDot: document.getElementById('healthDot'),
  healthStatusText: document.getElementById('healthStatusText'),
  tabButtons: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),
  dropzone: document.getElementById('dropzone'),
  fileInput: document.getElementById('fileInput'),
  pastedText: document.getElementById('pastedText'),
  analyzeBtn: document.getElementById('analyzeBtn'),
  sampleCardsContainer: document.getElementById('sampleCardsContainer'),
  findingsContainer: document.getElementById('findingsContainer'),
  findingsCountBadge: document.getElementById('findingsCountBadge'),
  severityFilter: document.getElementById('severityFilter'),
  riskSummaryText: document.getElementById('riskSummaryText'),
  riskScoreBadge: document.getElementById('riskScoreBadge'),
  missingInfoAlert: document.getElementById('missingInfoAlert'),
  missingInfoList: document.getElementById('missingInfoList'),
  checklistContainer: document.getElementById('checklistContainer'),
  checklistProgressBadge: document.getElementById('checklistProgressBadge'),
  progressPercentageText: document.getElementById('progressPercentageText'),
  progressRatioText: document.getElementById('progressRatioText'),
  progressBarFill: document.getElementById('progressBarFill'),
  addCustomTaskBtn: document.getElementById('addCustomTaskBtn'),
  addTaskModal: document.getElementById('addTaskModal'),
  cancelAddTaskBtn: document.getElementById('cancelAddTaskBtn'),
  saveCustomTaskBtn: document.getElementById('saveCustomTaskBtn'),
  customTaskTitle: document.getElementById('customTaskTitle'),
  customTaskDesc: document.getElementById('customTaskDesc'),
  customTaskPriority: document.getElementById('customTaskPriority'),
  chatMessages: document.getElementById('chatMessages'),
  chatInput: document.getElementById('chatInput'),
  sendChatBtn: document.getElementById('sendChatBtn'),
  agentTraceBox: document.getElementById('agentTraceBox'),
  voiceMicBtn: document.getElementById('voiceMicBtn'),
  voiceStatusText: document.getElementById('voiceStatusText'),
  voiceTranscriptLog: document.getElementById('voiceTranscriptLog'),
  verificationContent: document.getElementById('verificationContent'),
  saveBtn: document.getElementById('saveBtn'),
  shareBtn: document.getElementById('shareBtn'),
  exportMdBtn: document.getElementById('exportMdBtn'),
  shareModal: document.getElementById('shareModal'),
  shareUrlInput: document.getElementById('shareUrlInput'),
  copyShareUrlBtn: document.getElementById('copyShareUrlBtn'),
  closeShareModalBtn: document.getElementById('closeShareModalBtn')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  setupUploadAndDropzone();
  setupChat();
  setupVoice();
  setupModals();
  setupShareAndExport();

  // Check health and fetch sample contracts
  await checkServerHealth();
  await loadSampleContracts();

  // Check if opening a shared link
  const path = window.location.pathname;
  if (path.startsWith('/share/')) {
    const shareId = path.split('/share/')[1];
    if (shareId) loadSharedChecklist(shareId);
  }

  // Periodic health check
  setInterval(checkServerHealth, 15000);
});

// --- 1. TABS MANAGEMENT ---
function setupTabs() {
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
}

function switchTab(tabId) {
  const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
  if (btn) btn.click();
}

// --- 2. SERVER HEALTH ---
async function checkServerHealth() {
  try {
    const res = await fetch('/api/health');
    if (res.ok) {
      state.serverOnline = true;
      elements.healthStatusText.textContent = '🟢 Cloud AI Active';
      elements.healthDot.style.background = '#10b981';
      elements.healthBadge.style.background = '#ecfdf5';
      elements.healthBadge.style.color = '#065f46';
    } else {
      throw new Error('Server returned non-200');
    }
  } catch (err) {
    state.serverOnline = false;
    elements.healthStatusText.textContent = '🟡 Offline Local Mode';
    elements.healthDot.style.background = '#f59e0b';
    elements.healthBadge.style.background = '#fffbeb';
    elements.healthBadge.style.color = '#92400e';
  }
}

// --- 3. SAMPLE CONTRACTS & UPLOAD ---
async function loadSampleContracts() {
  try {
    const res = await fetch('/api/samples');
    if (res.ok) {
      state.samples = await res.json();
      renderSampleCards();
    }
  } catch (err) {
    console.error('Failed to load sample contracts:', err);
  }
}

function renderSampleCards() {
  if (!state.samples || state.samples.length === 0) return;

  elements.sampleCardsContainer.innerHTML = state.samples.map(s => `
    <div class="sample-card" data-id="${s.id}">
      <div class="sample-card-header">
        <span class="sample-card-title">${s.title}</span>
        <span class="badge ${s.id.includes('hidden_fee') ? 'badge-high' : s.id.includes('clean') ? 'badge-low' : 'badge-medium'}">${s.badge}</span>
      </div>
      <p class="sample-card-desc">${s.description}</p>
    </div>
  `).join('');

  document.querySelectorAll('.sample-card').forEach(card => {
    card.addEventListener('click', async () => {
      const sampleId = card.getAttribute('data-id');
      await loadAndAnalyzeSample(sampleId);
    });
  });
}

async function loadAndAnalyzeSample(sampleId) {
  try {
    elements.analyzeBtn.disabled = true;
    elements.analyzeBtn.textContent = '⏳ Analyzing Sample Contract...';

    const res = await fetch(`/api/samples/${sampleId}`);
    const sample = await res.json();

    state.documentText = sample.text;
    state.filename = sample.title;
    elements.pastedText.value = sample.text;

    await performAnalysis({ sampleId });
  } catch (err) {
    alert('Failed to analyze sample contract: ' + err.message);
  } finally {
    elements.analyzeBtn.disabled = false;
    elements.analyzeBtn.textContent = '🔍 Analyze Contract Obligations';
  }
}

function setupUploadAndDropzone() {
  // Dropzone drag-over
  elements.dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.dropzone.classList.add('dragover');
  });

  elements.dropzone.addEventListener('dragleave', () => {
    elements.dropzone.classList.remove('dragover');
  });

  elements.dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  });

  elements.dropzone.addEventListener('click', () => {
    elements.fileInput.click();
  });

  elements.fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  });

  elements.analyzeBtn.addEventListener('click', async () => {
    const text = elements.pastedText.value.trim();
    if (!text) {
      alert('Please paste contract text or select a sample contract above.');
      return;
    }
    state.documentText = text;
    state.filename = 'Pasted Contract Agreement';
    await performAnalysis({ text, filename: state.filename });
  });

  elements.severityFilter.addEventListener('change', () => {
    renderFindings();
  });
}

async function handleFileUpload(file) {
  try {
    elements.analyzeBtn.disabled = true;
    elements.analyzeBtn.textContent = `⏳ Uploading and Parsing ${file.name}...`;

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/analyze', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Upload analysis failed');
    }

    const data = await res.json();
    handleAnalysisSuccess(data);
  } catch (err) {
    alert('Error processing file: ' + err.message);
  } finally {
    elements.analyzeBtn.disabled = false;
    elements.analyzeBtn.textContent = '🔍 Analyze Contract Obligations';
  }
}

async function performAnalysis(payload) {
  try {
    elements.analyzeBtn.disabled = true;
    elements.analyzeBtn.textContent = '⏳ Processing Clauses & Obligations...';

    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Analysis failed');
    }

    const data = await res.json();
    handleAnalysisSuccess(data);
  } catch (err) {
    alert('Analysis Error: ' + err.message);
  } finally {
    elements.analyzeBtn.disabled = false;
    elements.analyzeBtn.textContent = '🔍 Analyze Contract Obligations';
  }
}

function handleAnalysisSuccess(data) {
  state.analysis = data.analysis;
  state.documentText = data.documentText;
  state.filename = data.filename;
  state.company = data.company;
  state.checklist = data.analysis.checklist || [];

  // Update UI components
  renderRiskBanner();
  renderFindings();
  renderChecklist();
  renderVerification();

  // Switch to Findings tab
  switchTab('tab-findings');

  // Push welcome message to chatbot
  addChatMessage('assistant', `✅ I have analyzed **${state.filename}**.\n\n` +
    `Found **${state.analysis.findings.length} key obligation clause(s)** and generated **${state.checklist.length} actionable checklist items**.\n\n` +
    `Ask me any question or click *"What should I do?"* to run the full step-by-step guidance agent!`);
}

// --- 4. RENDER RISK & FINDINGS ---
function renderRiskBanner() {
  if (!state.analysis) return;

  const { summary } = state.analysis;
  elements.riskSummaryText.innerHTML = summary.studentFriendlySummary.replace(/\n\n/g, '<br><br>');
  elements.riskScoreBadge.textContent = summary.overallRiskScore;

  elements.riskScoreBadge.className = 'risk-score-badge';
  if (summary.highSeverity >= 1) {
    elements.riskScoreBadge.classList.add('risk-score-high');
  } else if (summary.mediumSeverity >= 1) {
    elements.riskScoreBadge.classList.add('risk-score-med');
  } else {
    elements.riskScoreBadge.classList.add('risk-score-low');
  }

  // Missing info section
  if (state.analysis.missingInformation && state.analysis.missingInformation.length > 0) {
    elements.missingInfoAlert.style.display = 'block';
    elements.missingInfoList.innerHTML = state.analysis.missingInformation.map(m => `
      <li style="margin-bottom: 0.35rem;">
        <strong>${m.item}</strong>: ${m.detail} <em>(Action: ${m.recommended_action})</em>
      </li>
    `).join('');
  } else {
    elements.missingInfoAlert.style.display = 'none';
  }
}

function renderFindings() {
  if (!state.analysis) return;

  const filter = elements.severityFilter.value;
  let findings = state.analysis.findings;

  elements.findingsCountBadge.textContent = findings.length;

  if (filter !== 'all') {
    findings = findings.filter(f => f.severity === filter);
  }

  if (findings.length === 0) {
    elements.findingsContainer.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
        No findings match the selected filter (${filter}).
      </div>
    `;
    return;
  }

  elements.findingsContainer.innerHTML = findings.map(f => `
    <div class="finding-card severity-${f.severity}">
      <div class="finding-header">
        <div>
          <div class="finding-title">${f.finding}</div>
          <span style="font-size: 0.8rem; color: var(--text-muted);">Category: ${f.category.toUpperCase()} • Location: Page ${f.page || 1} (Sec ${f.sectionIndex || 1})</span>
        </div>
        <span class="badge badge-${f.severity}">${f.severity} Severity</span>
      </div>

      <div class="evidence-box">
        <strong>Exact Evidence Snippet:</strong><br>
        "${escapeHtml(f.evidence)}"
      </div>

      <div class="finding-meta">
        ${f.amount && f.amount !== 'Not explicitly stated in clause' ? `<span><strong>Detected Amount:</strong> ${f.amount}</span>` : ''}
        ${f.timing && f.timing !== 'As specified in section' ? `<span><strong>Timing:</strong> ${f.timing}</span>` : ''}
        <span><strong>AI Confidence:</strong> ${(f.confidence * 100).toFixed(0)}%</span>
      </div>

      <div class="action-recommendation">
        <div>
          <strong>Recommended Student Action:</strong><br>
          ${f.recommended_action}
        </div>
        <button class="btn btn-secondary btn-sm draft-email-btn" data-finding-id="${f.id}" style="white-space: nowrap;">
          ✉️ Draft HR Email
        </button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.draft-email-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const findingId = btn.getAttribute('data-finding-id');
      await runAgentGoal(`Draft an inquiry email to HR for finding ${findingId}`, { findingId });
      switchTab('tab-agent');
    });
  });
}

// --- 5. ACTION CHECKLIST ---
function renderChecklist() {
  if (!state.checklist || state.checklist.length === 0) {
    elements.checklistContainer.innerHTML = `
      <p style="color: var(--text-muted); text-align: center; padding: 2rem;">No checklist items yet.</p>
    `;
    updateProgressMetrics();
    return;
  }

  elements.checklistContainer.innerHTML = state.checklist.map(item => `
    <div class="checklist-item" data-id="${item.id}">
      <input type="checkbox" class="checklist-checkbox" ${item.status === 'Completed' ? 'checked' : ''} data-id="${item.id}">
      <div class="checklist-body">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
          <span class="checklist-task-title" style="${item.status === 'Completed' ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${item.task}</span>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <span class="badge ${item.priority === 'High' ? 'badge-high' : item.priority === 'Medium' ? 'badge-medium' : 'badge-low'}">${item.priority}</span>
            <select class="checklist-select status-select" data-id="${item.id}">
              <option value="Pending" ${item.status === 'Pending' ? 'selected' : ''}>Pending</option>
              <option value="In Progress" ${item.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
              <option value="Completed" ${item.status === 'Completed' ? 'selected' : ''}>Completed</option>
              <option value="Blocked" ${item.status === 'Blocked' ? 'selected' : ''}>Blocked</option>
            </select>
          </div>
        </div>
        <p class="checklist-desc">${item.description}</p>
        ${item.evidence && item.evidence !== 'Information could not be verified from the document.' ? `
          <div style="font-size: 0.75rem; color: #64748b; margin-top: 0.35rem; font-family: monospace;">
            Ref: "${escapeHtml(item.evidence.slice(0, 100))}..."
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');

  // Attach status change events
  document.querySelectorAll('.checklist-checkbox').forEach(box => {
    box.addEventListener('change', (e) => {
      const taskId = box.getAttribute('data-id');
      const newStatus = e.target.checked ? 'Completed' : 'Pending';
      updateTaskStatus(taskId, newStatus);
    });
  });

  document.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const taskId = sel.getAttribute('data-id');
      updateTaskStatus(taskId, e.target.value);
    });
  });

  updateProgressMetrics();
}

function updateTaskStatus(taskId, newStatus) {
  state.checklist = state.checklist.map(item => {
    if (item.id === taskId) {
      return { ...item, status: newStatus };
    }
    return item;
  });
  renderChecklist();
}

function updateProgressMetrics() {
  const total = state.checklist.length;
  const completed = state.checklist.filter(i => i.status === 'Completed').length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  elements.progressPercentageText.textContent = `${percentage}%`;
  elements.progressRatioText.textContent = `${completed} / ${total}`;
  elements.progressBarFill.style.width = `${percentage}%`;
  elements.checklistProgressBadge.textContent = `${percentage}%`;
}

// --- 6. CHATBOT & AGENTIC LOOP ---
function setupChat() {
  elements.sendChatBtn.addEventListener('click', sendUserChatMessage);
  elements.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendUserChatMessage();
  });

  // Prompt chips
  document.querySelectorAll('.prompt-chip:not(.voice-command-chip)').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      if (prompt.includes('Run Agent Goal') || prompt.includes('Check this contract and tell me what I should do')) {
        runAgentGoal('Check this contract and tell me what I should do.');
      } else {
        elements.chatInput.value = prompt;
        sendUserChatMessage();
      }
    });
  });
}

async function sendUserChatMessage() {
  const message = elements.chatInput.value.trim();
  if (!message) return;

  elements.chatInput.value = '';
  addChatMessage('user', message);

  // If user asks general goal, route to agent workflow
  if (message.toLowerCase().includes('what should i do') || message.toLowerCase().includes('check this contract')) {
    await runAgentGoal(message);
    return;
  }

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        context: {
          documentText: state.documentText,
          findings: state.analysis ? state.analysis.findings : [],
          checklist: state.checklist
        }
      })
    });

    const data = await res.json();
    addChatMessage('assistant', data.reply);
  } catch (err) {
    addChatMessage('assistant', `⚠️ Offline Fallback: Could not connect to remote AI server. Based on local contract text: ${localFallbackChat(message)}`);
  }
}

function addChatMessage(role, text) {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble chat-${role}`;
  bubble.innerHTML = formatMarkdownText(text);
  elements.chatMessages.appendChild(bubble);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

async function runAgentGoal(goal, extraContext = {}) {
  addChatMessage('user', `🤖 Agent Goal: ${goal}`);
  renderAgentTraceHeader(goal);

  try {
    const res = await fetch('/api/agent/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal,
        context: {
          documentText: state.documentText,
          filename: state.filename,
          findings: state.analysis ? state.analysis.findings : [],
          checklist: state.checklist,
          companyName: state.company ? state.company.companyName : 'Hiring Team',
          ...extraContext
        }
      })
    });

    const data = await res.json();

    // Render Trace
    renderAgentTraceSteps(data.plan, data.trace);

    // Update state if new checklist returned
    if (data.checklist && data.checklist.length > 0) {
      state.checklist = data.checklist;
      renderChecklist();
    }

    addChatMessage('assistant', data.response);
  } catch (err) {
    console.error('Agent execution error:', err);
    addChatMessage('assistant', `⚠️ Error running agent: ${err.message}`);
  }
}

function renderAgentTraceHeader(goal) {
  elements.agentTraceBox.innerHTML = `
    <div style="color: #38bdf8; font-weight: bold; margin-bottom: 0.5rem;">[AGENT GOAL ACTIVATED]</div>
    <div style="color: #e2e8f0; margin-bottom: 0.75rem;">Goal: "${goal}"</div>
    <div style="color: #94a3b8; font-size: 0.8rem;">Step 1: Understand Goal & Plan Tool Sequence...</div>
  `;
}

function renderAgentTraceSteps(plan, trace) {
  let html = `
    <div style="color: #38bdf8; font-weight: bold; margin-bottom: 0.5rem;">[AGENT PLAN & EXECUTION TRACE]</div>
    <div style="margin-bottom: 0.75rem; color: #a5b4fc;">Planned Steps (${plan.length}):</div>
  `;

  plan.forEach(p => {
    html += `<div style="padding-left: 0.5rem; color: #cbd5e1;">🔹 Step ${p.step}: <code>${p.tool}</code></div>`;
  });

  html += `<div style="margin: 0.75rem 0 0.5rem 0; color: #a5b4fc;">Execution Trace:</div>`;
  trace.forEach(t => {
    html += `
      <div class="trace-step">
        <span style="color: #10b981;">✔</span>
        <span style="color: #38bdf8;">${t.tool}()</span>
        <span style="color: #94a3b8;">→ ${typeof t.resultPreview === 'object' ? JSON.stringify(t.resultPreview).slice(0, 40) : t.resultPreview}</span>
      </div>
    `;
  });

  html += `<div style="margin-top: 0.75rem; color: #4ade80;">[VERIFICATION & CHECKLIST SYNC COMPLETE]</div>`;
  elements.agentTraceBox.innerHTML = html;
}

// Local fallback QA when server unreachable
function localFallbackChat(query) {
  const q = query.toLowerCase();
  if (q.includes('fee') || q.includes('payment') || q.includes('money')) {
    return 'Local analysis found potential payment obligations. Please review the highlighted clause on page 1/2.';
  }
  if (q.includes('bond')) {
    return 'A service commitment bond was identified. Verify whether it conflicts with your university schedule.';
  }
  return 'Local fallback mode active. Please inspect the Action Checklist tab for step-by-step tasks.';
}

// --- 7. VOICE ASSISTANT (WEB SPEECH API & FALLBACK) ---
function setupVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechRecognition) {
    state.speechRecognition = new SpeechRecognition();
    state.speechRecognition.continuous = false;
    state.speechRecognition.interimResults = false;
    state.speechRecognition.lang = 'en-US';

    state.speechRecognition.onstart = () => {
      state.isListening = true;
      elements.voiceMicBtn.classList.add('listening');
      elements.voiceStatusText.textContent = '🎙️ Listening to your voice... Speak now!';
    };

    state.speechRecognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      elements.voiceStatusText.textContent = `Recognized: "${transcript}"`;
      elements.voiceTranscriptLog.innerHTML += `<div><strong>You:</strong> "${transcript}"</div>`;

      // Process voice query
      await handleVoiceQuery(transcript);
    };

    state.speechRecognition.onerror = (e) => {
      console.warn('Voice recognition error:', e.error);
      elements.voiceMicBtn.classList.remove('listening');
      state.isListening = false;
      elements.voiceStatusText.textContent = `Microphone notice: ${e.error}. You can also click sample voice chips below!`;
    };

    state.speechRecognition.onend = () => {
      state.isListening = false;
      elements.voiceMicBtn.classList.remove('listening');
    };

    elements.voiceMicBtn.addEventListener('click', () => {
      if (state.isListening) {
        state.speechRecognition.stop();
      } else {
        try {
          state.speechRecognition.start();
        } catch (err) {
          console.error(err);
        }
      }
    });
  } else {
    elements.voiceStatusText.textContent = 'Web Speech STT not supported on this browser. Use voice sample buttons below!';
  }

  // Voice command chips
  document.querySelectorAll('.voice-command-chip').forEach(chip => {
    chip.addEventListener('click', async () => {
      const command = chip.getAttribute('data-command');
      elements.voiceTranscriptLog.innerHTML += `<div><strong>You (Voice):</strong> "${command}"</div>`;
      await handleVoiceQuery(command);
    });
  });
}

async function handleVoiceQuery(query) {
  elements.voiceStatusText.textContent = '🤔 Thinking...';
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: query,
        context: {
          documentText: state.documentText,
          findings: state.analysis ? state.analysis.findings : [],
          checklist: state.checklist
        }
      })
    });

    const data = await res.json();
    const reply = data.reply;

    elements.voiceTranscriptLog.innerHTML += `<div><strong style="color: #2563eb;">Assistant:</strong> ${formatMarkdownText(reply)}</div>`;
    elements.voiceStatusText.textContent = '🔊 Speaking response...';

    // Speak aloud with SpeechSynthesis
    speakAloud(reply.replace(/[*_#`]/g, ''));
  } catch (err) {
    const fallback = localFallbackChat(query);
    elements.voiceTranscriptLog.innerHTML += `<div><strong style="color: #d97706;">Assistant (Offline):</strong> ${fallback}</div>`;
    speakAloud(fallback);
  }
}

function speakAloud(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // Stop prior speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => {
      elements.voiceStatusText.textContent = 'Click the microphone and speak your query';
    };
    window.speechSynthesis.speak(utterance);
  } else {
    elements.voiceStatusText.textContent = 'Click the microphone and speak your query';
  }
}

// --- 8. ENTITY VERIFICATION ---
function renderVerification() {
  if (!state.company) {
    elements.verificationContent.innerHTML = `
      <p style="color: var(--text-muted); text-align: center; padding: 2rem;">No entity records loaded yet.</p>
    `;
    return;
  }

  const c = state.company;
  elements.verificationContent.innerHTML = `
    <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <div>
          <h3 style="font-size: 1.2rem; color: #0f172a;">${c.companyName}</h3>
          <span style="font-size: 0.85rem; color: var(--text-muted);">Queried Entity: ${c.queriedName}</span>
        </div>
        <span class="badge ${c.verified ? 'badge-low' : 'badge-medium'}">
          ${c.verified ? '✔ Registration Verified' : '❓ Verification Recommended'}
        </span>
      </div>

      <div class="grid-2-col" style="gap: 1rem; margin-bottom: 1rem;">
        <div><strong>Corporate ID (CIN):</strong> <code>${c.cin}</code></div>
        <div><strong>Registration Status:</strong> ${c.registrationStatus}</div>
        <div><strong>Jurisdiction / State:</strong> ${c.state}</div>
        <div><strong>Authority:</strong> ${c.authority}</div>
        <div><strong>Verification Date:</strong> ${c.verificationDate}</div>
        <div><strong>Primary Source:</strong> <a href="${c.sourceUrl}" target="_blank" style="color: var(--primary);">${c.source}</a></div>
      </div>

      <div style="background: #eff6ff; border: 1px solid var(--primary-border); border-radius: var(--radius-md); padding: 0.75rem 1rem; font-size: 0.85rem; color: #1e40af; margin-top: 1rem;">
        ${c.disclaimer}
      </div>
    </div>
  `;
}

// --- 9. MODALS, SAVE & SHARE ---
function setupModals() {
  elements.addCustomTaskBtn.addEventListener('click', () => {
    elements.customTaskTitle.value = '';
    elements.customTaskDesc.value = '';
    elements.addTaskModal.classList.add('open');
  });

  elements.cancelAddTaskBtn.addEventListener('click', () => {
    elements.addTaskModal.classList.remove('open');
  });

  elements.saveCustomTaskBtn.addEventListener('click', () => {
    const title = elements.customTaskTitle.value.trim();
    const desc = elements.customTaskDesc.value.trim();
    const priority = elements.customTaskPriority.value;

    if (!title) {
      alert('Please enter a task title');
      return;
    }

    state.checklist.push({
      id: 'custom_' + Date.now(),
      task: title,
      description: desc || 'Custom student task',
      priority,
      status: 'Pending',
      category: 'custom',
      evidence: 'Created by student'
    });

    renderChecklist();
    elements.addTaskModal.classList.remove('open');
  });

  elements.closeShareModalBtn.addEventListener('click', () => {
    elements.shareModal.classList.remove('open');
  });

  elements.copyShareUrlBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(elements.shareUrlInput.value);
    alert('Share link copied to clipboard!');
  });
}

function setupShareAndExport() {
  elements.saveBtn.addEventListener('click', saveCurrentState);
  elements.shareBtn.addEventListener('click', generateShareLink);
  elements.exportMdBtn.addEventListener('click', exportMarkdownReport);
}

async function saveCurrentState() {
  if (!state.analysis) {
    alert('Please analyze a contract before saving.');
    return;
  }

  try {
    const res = await fetch('/api/checklist/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentName: state.filename,
        analysis: state.analysis,
        checklist: state.checklist,
        company: state.company
      })
    });

    const data = await res.json();
    alert(`✅ Checklist saved successfully! Share ID: ${data.shareId}`);
  } catch (err) {
    alert('Save error: ' + err.message);
  }
}

async function generateShareLink() {
  if (!state.analysis) {
    alert('Please analyze a contract first.');
    return;
  }

  try {
    const res = await fetch('/api/checklist/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentName: state.filename,
        analysis: state.analysis,
        checklist: state.checklist,
        company: state.company
      })
    });

    const data = await res.json();
    const fullUrl = window.location.origin + `/share/${data.shareId}`;
    elements.shareUrlInput.value = fullUrl;
    elements.shareModal.classList.add('open');
  } catch (err) {
    alert('Share link error: ' + err.message);
  }
}

async function loadSharedChecklist(shareId) {
  try {
    const res = await fetch(`/api/checklist/${shareId}`);
    if (!res.ok) throw new Error('Shared record not found');

    const { record } = await res.json();
    state.filename = record.documentName;
    state.analysis = record.analysis;
    state.checklist = record.checklist;
    state.company = record.company;

    renderRiskBanner();
    renderFindings();
    renderChecklist();
    renderVerification();

    switchTab('tab-checklist');
    alert(`📂 Loaded shared checklist for: "${record.documentName}"`);
  } catch (err) {
    console.error('Error loading share:', err);
  }
}

function exportMarkdownReport() {
  if (!state.analysis) {
    alert('Please analyze a contract before exporting.');
    return;
  }

  let md = `# Student Contract Transparency & Obligation Report\n\n`;
  md += `**Document:** ${state.filename}\n`;
  md += `**Generated At:** ${new Date().toLocaleString()}\n`;
  md += `**Risk Assessment:** ${state.analysis.summary.overallRiskScore}\n\n`;
  md += `## Summary\n${state.analysis.summary.studentFriendlySummary}\n\n`;

  md += `## Identified Obligations & Clauses\n`;
  state.analysis.findings.forEach((f, idx) => {
    md += `### ${idx + 1}. ${f.finding} (${f.severity.toUpperCase()} Severity)\n`;
    md += `- **Location:** Page ${f.page || 1}\n`;
    md += `- **Exact Evidence:** "${f.evidence}"\n`;
    if (f.amount) md += `- **Amount:** ${f.amount}\n`;
    if (f.timing) md += `- **Timing:** ${f.timing}\n`;
    md += `- **Recommended Student Action:** ${f.recommended_action}\n\n`;
  });

  md += `## Action Checklist\n`;
  state.checklist.forEach(item => {
    const check = item.status === 'Completed' ? '[x]' : '[ ]';
    md += `- ${check} **${item.task}** (${item.priority} Priority, Status: ${item.status})\n  *${item.description}*\n`;
  });

  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Contract_Analysis_${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// Utility
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
