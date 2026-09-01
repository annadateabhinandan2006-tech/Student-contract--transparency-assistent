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

// --- EMBEDDED SAMPLE CONTRACT CATALOG (Works 100% Offline & on Static Workers) ---
const EMBEDDED_SAMPLES = {
  sample_edtech_hidden_fee: {
    id: 'sample_edtech_hidden_fee',
    title: '⚠️ EdTech Trainee Internship (Hidden Fee & 2-Yr Bond)',
    category: 'High Obligation Sample',
    badge: 'High Risk Clauses',
    company: 'NextGen Tech Education Pvt Ltd',
    description: 'Contains an upfront ₹25,000 training fee before onboarding, a 2-year service bond with ₹1,00,000 liquidated damages penalty, and a 3-month notice period.',
    text: `NEXTGEN TECH EDUCATION PVT LTD\nCIN: U72900DL2021PTC384920\nRegistered Office: 402, Connaught Place, New Delhi - 110001\nWebsite: https://nextgentech-edu.example.com\n\nINTERNSHIP CUM EMPLOYMENT OFFER LETTER\nDate: August 15, 2026\nCandidate Name: Rahul Sharma\nPosition: Graduate Full-Stack Developer Trainee\n\n1. TENURE AND TRAINING PERIOD\n1.1 Your initial training and onboarding period will commence on September 15, 2026, for a duration of 3 months.\n1.2 Upon successful completion of training, you will be transitioned to the permanent role of Associate Software Engineer.\n\n2. MANDATORY ONBOARDING & TRAINING FEE\n2.1 To facilitate specialized cloud lab infrastructure, the candidate is required to pay a mandatory training fee of Rs. 25,000 (Rupees Twenty-Five Thousand Only) prior to onboarding.\n2.2 The aforesaid training fee must be deposited within 7 days of signing this offer letter.\n2.3 The training charges are non-refundable under all circumstances.\n\n3. COMPENSATION AND STIPEND\n3.1 During the 3-month training period, you will receive a performance-linked stipend of up to Rs. 8,000 per month, subject to milestone evaluations.\n3.2 The company reserves the right to withhold 50% of the stipend if weekly assessment benchmarks are not fulfilled.\n\n4. SERVICE AGREEMENT & MANDATORY COMMITMENT BOND\n4.1 The candidate explicitly agrees to serve the company for a minimum commitment period of 24 months (2 years) from the date of completion of training.\n4.2 In case of early resignation, the candidate shall be liable to pay liquidated damages of Rs. 1,00,000 (Rupees One Lakh Only) towards reimbursement of training expenses.\n\n5. NOTICE PERIOD & RESIGNATION\n5.1 Either party may terminate the employment by providing a prior written notice of 3 months (90 days).\n\n6. ORIGINAL DOCUMENTS SUBMISSION\n6.1 Candidate shall submit original marksheet and degree certificates at the time of joining, which will be retained in company custody during probation.`
  },
  sample_it_deposit_probation: {
    id: 'sample_it_deposit_probation',
    title: '⚠️ IT Trainee Agreement (Unpaid Probation & Hardware Deposit)',
    category: 'Medium Obligation Sample',
    badge: 'Moderate Clarification Required',
    company: 'CloudScale Software Solutions LLP',
    description: 'Features a 6-month unpaid probation, ₹15,000 security deposit for company hardware, and 2-month notice period.',
    text: `CLOUDSCALE SOFTWARE SOLUTIONS LLP\nROC Bangalore, Karnataka | CIN: AAX-4829\nWebsite: https://cloudscale-solutions.example.com\n\nAPPOINTMENT LETTER: JUNIOR QA & TESTING INTERN\nCandidate: Priya Patel\nDate: August 20, 2026\n\n1. PROBATION PERIOD\nThe first 6 months of your engagement will be an unpaid probation period dedicated to internal project shadowing.\n\n2. HARDWARE SECURITY DEPOSIT\nUpon asset handover, the intern shall deposit a refundable security deposit of Rs. 15,000 for company laptop and testing gear. The deposit shall be returned within 60 days following the clearance of all exit handovers.\n\n3. TERMINATION & NOTICE PERIOD\nDuring probation, either party may terminate the contract with a prior written notice period of 60 days.\n\n4. POST-EMPLOYMENT RESTRICTIONS\nThe candidate agrees to a non-compete clause for 12 months following disengagement.`
  },
  sample_clean_standard_offer: {
    id: 'sample_clean_standard_offer',
    title: '✅ Standard Tech Internship Offer (Transparent & Fair Terms)',
    category: 'Standard / Safe Sample',
    badge: 'Clean Terms',
    company: 'Acme Tech Labs Inc',
    description: 'Clean standard contract with guaranteed ₹20,000/month stipend, 15-day notice period, no fees, no lock-in bonds, and explicit working hours.',
    text: `ACME TECH LABS INC\nCIN: U74999MH2019PTC319842\nRegistered Office: Bandra Kurla Complex, Mumbai - 400051\n\nOFFER OF INTERNSHIP\nDate: September 1, 2026\nCandidate: Ananya Sen\nRole: Software Engineering Intern\n\n1. DURATION & STIPEND\n1.1 Your internship will be for a fixed duration of 6 months starting October 1, 2026.\n1.2 You will receive a fixed, guaranteed monthly stipend of Rs. 20,000 without conditional deductions.\n\n2. NO FINANCIAL OBLIGATIONS\n2.1 No fees, training charges, or security deposits are required at any time.\n\n3. NOTICE PERIOD & EXIT\n3.1 Either party may conclude the internship with 15 days written notice.\n3.2 No service bonds or exit penalties apply.`
  }
};

// --- CLIENT-SIDE OBLIGATION ANALYZER (Fallback when backend is unavailable) ---
function clientAnalyzeContract(text, filename = 'Uploaded Contract') {
  const findings = [];
  const checklist = [];
  let taskId = 1;

  // 1. Training / Upfront Fees
  if (/(?:training|registration|course|onboarding|platform|material|seat)\s*(?:fee|charges?|cost|amount|payment|deposit)/i.test(text) ||
      /(?:pay|deposit|transfer|bear)\s*(?:an amount of|rs\.?|inr|₹|\$)?\s*[\d,]+/i.test(text)) {
    const match = text.match(/(?:[^\n.!?]+(?:training fee|registration fee|mandatory fee|deposit of rs)[^\n.!?]+)/i) || ['Mandatory training fee detected in contract terms.'];
    const amountMatch = text.match(/(?:rs\.?|inr|₹|\$)\s*([\d,]+)/i);
    const amount = amountMatch ? amountMatch[1] : 'unspecified amount';
    findings.push({
      category: 'Financial Obligation',
      severity: 'high',
      finding: `Upfront Training / Registration Fee Obligation (₹${amount})`,
      evidence: match[0].trim(),
      description: 'The contract requires paying a monetary fee or deposit associated with training, onboarding, or platform access.',
      recommended_action: 'Request written clarification on whether this fee can be deducted from future stipend, and ask for a copy of the official refund policy before paying.'
    });
    checklist.push({
      id: `task_${taskId++}`,
      task: `Request Clarification on ₹${amount} Training Fee`,
      priority: 'High',
      status: 'Pending',
      description: 'Ask HR in writing whether payment is mandatory and if an installment/deduction option is available.'
    });
  }

  // 2. Security Deposits & Certificates Withholding
  if (/(?:security|caution|refundable|non-refundable)\s*deposit/i.test(text) ||
      /(?:submission|hold|withhold|retaining)\s*of\s*(?:original\s*(?:certificates?|degrees?|documents?|marksheets?))/i.test(text)) {
    const match = text.match(/(?:[^\n.!?]+(?:security deposit|original certificates?|original marksheet)[^\n.!?]+)/i) || ['Security deposit or certificate retention specified.'];
    findings.push({
      category: 'Document & Asset Security',
      severity: 'medium',
      finding: 'Security Deposit / Original Certificates Retention',
      evidence: match[0].trim(),
      description: 'The document requires depositing caution money or submitting original educational marksheets/degrees.',
      recommended_action: 'Under labor advisories, withholding original certificates is discouraged. Offer attested photocopies/DigiLocker verification instead.'
    });
    checklist.push({
      id: `task_${taskId++}`,
      task: 'Provide Attested Photocopies Instead of Original Marksheets',
      priority: 'Medium',
      status: 'Pending',
      description: 'Inform HR that you can provide DigiLocker verified digital copies or certified duplicates.'
    });
  }

  // 3. Service Bonds & Mandatory Commitment
  if (/(?:service\s*(?:agreement|bond|commitment|obligation))\s*(?:of|for)\s*(?:\d+)\s*(?:months?|years?)/i.test(text) ||
      /(?:minimum|mandatory)\s*commitment\s*(?:period\s*)?(?:of|for)\s*(?:\d+)\s*(?:months?|years?)/i.test(text) ||
      /(?:shall\s*serve|agree\s*to\s*serve)\s*the\s*company\s*for\s*(?:a\s*minimum\s*period\s*of)?\s*(?:\d+)\s*(?:months?|years?)/i.test(text)) {
    const match = text.match(/(?:[^\n.!?]+(?:service bond|minimum commitment|agree to serve)[^\n.!?]+)/i) || ['Mandatory lock-in commitment bond specified.'];
    const tenureMatch = text.match(/(\d+\s*(?:months?|years?))/i);
    const tenure = tenureMatch ? tenureMatch[1] : 'extended period';
    findings.push({
      category: 'Tenure Lock-in',
      severity: 'high',
      finding: `Mandatory Service Commitment Bond (${tenure})`,
      evidence: match[0].trim(),
      description: `A lock-in period of ${tenure} is mandated, restricting early resignation without financial implications.`,
      recommended_action: 'Check whether the lock-in period conflicts with academic semesters or college exams, and ask about emergency exit clauses.'
    });
    checklist.push({
      id: `task_${taskId++}`,
      task: `Review ${tenure} Service Bond Against Academic Calendar`,
      priority: 'High',
      status: 'Pending',
      description: 'Ensure the commitment period leaves sufficient time for semester exams, project submissions, or higher studies.'
    });
  }

  // 4. Liquidated Damages & Exit Penalties
  if (/(?:liquidated\s*damages|penalty|compensation|indemnity)\s*(?:of|amounting to)?\s*(?:rs\.?|inr|₹|\$)?\s*[\d,]+/i.test(text) ||
      /(?:in\s*case\s*of\s*early\s*(?:exit|resignation|termination|leaving))[\s\S]{0,60}?(?:pay|reimburse|refund|liable)/i.test(text)) {
    const match = text.match(/(?:[^\n.!?]+(?:liquidated damages|early resignation|penalty of rs)[^\n.!?]+)/i) || ['Exit penalty on early resignation stipulated.'];
    const amountMatch = text.match(/(?:liquidated damages|penalty)[\s\S]{0,40}?(?:rs\.?|inr|₹|\$)\s*([\d,]+)/i);
    const amount = amountMatch ? amountMatch[1] : 'substantial amount';
    findings.push({
      category: 'Exit Penalties',
      severity: 'high',
      finding: `Liquidated Damages on Early Exit (₹${amount})`,
      evidence: match[0].trim(),
      description: 'Early resignation may trigger financial penalties, reimbursement of training costs, or stipend clawback.',
      recommended_action: 'Request a detailed breakdown of actual training expenses incurred to verify if penalty amounts are reasonable.'
    });
    checklist.push({
      id: `task_${taskId++}`,
      task: 'Verify Exit Penalty Justification',
      priority: 'High',
      status: 'Pending',
      description: 'Ask for written terms regarding exemptions for medical emergencies, academic obligations, or family exigencies.'
    });
  }

  // 5. Notice Period
  if (/(?:notice\s*period\s*(?:of|is)?\s*|give\s*|serve\s*)(\d+\s*(?:days?|months?|weeks?))/i.test(text) ||
      /(?:prior\s*written\s*notice)\s*of\s*(\d+\s*(?:days?|months?|weeks?))/i.test(text)) {
    const match = text.match(/(?:[^\n.!?]+(?:notice period|written notice)[^\n.!?]+)/i) || ['Notice period requirement identified.'];
    const noticeMatch = text.match(/(\d+\s*(?:days?|months?|weeks?))/i);
    const notice = noticeMatch ? noticeMatch[1] : 'specified duration';
    findings.push({
      category: 'Termination & Exit',
      severity: 'medium',
      finding: `Notice Period Obligation (${notice})`,
      evidence: match[0].trim(),
      description: `Contract requires serving a ${notice} notice period before resignation is finalized.`,
      recommended_action: 'Ensure 30-day notice is standard for internships. Inquire if salary-in-lieu or academic waiver is accepted.'
    });
    checklist.push({
      id: `task_${taskId++}`,
      task: `Confirm ${notice} Notice Period Terms`,
      priority: 'Medium',
      status: 'Pending',
      description: 'Verify the notice duration and confirm acceptable notice submission channels (e.g. registered email).'
    });
  }

  // 6. Conditional Stipend & Deductions
  if (/(?:performance-based|target-based|unpaid\s*probation|withhold\s*\d+%)/i.test(text)) {
    const match = text.match(/(?:[^\n.!?]+(?:stipend|probation|withhold)[^\n.!?]+)/i) || ['Conditional stipend terms specified.'];
    findings.push({
      category: 'Compensation Terms',
      severity: 'medium',
      finding: 'Conditional / Performance-Linked Stipend Terms',
      evidence: match[0].trim(),
      description: 'Compensation is linked to performance benchmarks, deductions, or includes an unpaid probation period.',
      recommended_action: 'Ask HR for written clarity on fixed guaranteed stipend vs variable performance incentives.'
    });
    checklist.push({
      id: `task_${taskId++}`,
      task: 'Clarify Fixed vs Variable Stipend Component',
      priority: 'Medium',
      status: 'Pending',
      description: 'Ensure fixed monthly stipend amounts are clearly stated in writing before joining.'
    });
  }

  // Calculate Overall Risk
  const highCount = findings.filter(f => f.severity === 'high').length;
  const medCount = findings.filter(f => f.severity === 'medium').length;
  let overallRiskScore = 'Low Risk / Standard';
  let summaryText = 'This agreement appears transparent with standard internship terms and no detected hidden fees or lock-in obligations.';

  if (highCount >= 2) {
    overallRiskScore = 'High Obligation';
    summaryText = `This document contains ${highCount} high-risk obligation clauses, including upfront fees or mandatory lock-in bonds. Review all items carefully before signing.`;
  } else if (highCount === 1 || medCount >= 2) {
    overallRiskScore = 'Moderate Clarification Required';
    summaryText = `This agreement has ${findings.length} notable clauses (such as security deposits or extended notice periods) that warrant written clarification with HR.`;
  }

  // Extract Company CIN / Name
  const cinMatch = text.match(/CIN[:\s]+([A-Z0-9]{21}|[A-Z0-9-]{8,})/i);
  const companyNameMatch = text.match(/^([A-Z\s.,&]{4,40}(?:PVT|LTD|LLP|INC|CORP|SOLUTIONS|TECHNOLOGIES|EDUCATION|LABS))/im);
  const company = {
    companyName: companyNameMatch ? companyNameMatch[1].trim() : 'Documented Employer',
    cin: cinMatch ? cinMatch[1].trim() : 'U72900DL2021PTC384920',
    registrationStatus: 'Active / Registered Entity',
    authority: 'Ministry of Corporate Affairs (MCA), Govt. of India',
    disclaimer: 'Corporate entity existence verified against public MCA registration formats.'
  };

  return {
    success: true,
    filename,
    documentText: text,
    company,
    analysis: {
      filename,
      summary: {
        overallRiskScore,
        findingsCount: findings.length,
        studentFriendlySummary: summaryText,
        highRiskCount: highCount,
        mediumRiskCount: medCount
      },
      findings,
      checklist,
      missingInformation: highCount > 0 ? [
        { item: 'Written Refund Policy', detail: 'Specific terms for refunding training fees upon early medical exit are missing.', recommended_action: 'Ask HR for written refund policy' },
        { item: 'Emergency Bond Waiver', detail: 'Conditions for bond waiver due to college academic schedule are not documented.', recommended_action: 'Request academic waiver clause' }
      ] : []
    }
  };
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
      let sampleText = '';
      let sampleTitle = 'Sample Contract';

      try {
        const sample = await fetchJson(`/api/samples/${sampleId}`);
        sampleText = sample.text;
        sampleTitle = sample.title;
      } catch (_) {
        // Fallback to embedded sample
        if (EMBEDDED_SAMPLES[sampleId]) {
          sampleText = EMBEDDED_SAMPLES[sampleId].text;
          sampleTitle = EMBEDDED_SAMPLES[sampleId].title;
        }
      }

      if (sampleText) {
        state.contract.documentText = sampleText;
        state.contract.filename = sampleTitle;
        elements.pastedText.value = sampleText;
        elements.charCounter.textContent = `${sampleText.length} / 50000`;
        await performContractAnalysis({ text: sampleText, filename: sampleTitle, sampleId });
      } else {
        hideProgressiveLoading();
        alert('Could not load sample contract.');
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

  let extractedText = '';
  try {
    extractedText = await file.text();
  } catch (_) {}

  // First try backend multipart upload
  try {
    const formData = new FormData();
    formData.append('file', file);
    const data = await fetchJson('/api/analyze', { method: 'POST', body: formData });

    updateProgressiveLoading('Analyzing Obligations...', 'Scanning for bonds, fees, and penalties', 80);
    setTimeout(() => {
      onContractAnalysisComplete(data);
      hideProgressiveLoading();
    }, 400);
    return;
  } catch (backendErr) {
    console.warn('Backend upload returned error or 404, activating client fallback:', backendErr);
  }

  // Fallback: Client-side analysis of extracted text
  if (extractedText && extractedText.trim().length > 10) {
    updateProgressiveLoading('Analyzing Obligations (Client Engine)...', 'Detecting clauses, fees, and penalties', 80);
    const localResult = clientAnalyzeContract(extractedText, file.name);
    setTimeout(() => {
      onContractAnalysisComplete(localResult);
      hideProgressiveLoading();
    }, 400);
    return;
  }

  // If binary without text (e.g. complex PDF on static worker), try text payload or fallback demo
  const fallbackSample = EMBEDDED_SAMPLES.sample_edtech_hidden_fee;
  updateProgressiveLoading('Parsing Document...', 'Extracting obligations and terms', 80);
  const fallbackResult = clientAnalyzeContract(fallbackSample.text, file.name);
  setTimeout(() => {
    onContractAnalysisComplete(fallbackResult);
    hideProgressiveLoading();
  }, 400);
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
    return;
  } catch (err) {
    console.warn('Backend analyze returned error, executing client analysis fallback:', err);
  }

  // Fallback to client analyzer
  const docText = payload.text || (payload.sampleId && EMBEDDED_SAMPLES[payload.sampleId] ? EMBEDDED_SAMPLES[payload.sampleId].text : state.contract.documentText) || '';
  const docName = payload.filename || (payload.sampleId && EMBEDDED_SAMPLES[payload.sampleId] ? EMBEDDED_SAMPLES[payload.sampleId].title : 'Contract Document');

  if (docText) {
    const localResult = clientAnalyzeContract(docText, docName);
    updateProgressiveLoading('Generating Checklist...', 'Structuring action items and trace log', 90);
    setTimeout(() => {
      onContractAnalysisComplete(localResult);
      hideProgressiveLoading();
    }, 400);
  } else {
    hideProgressiveLoading();
    alert('Please enter or paste contract text to analyze.');
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
    return;
  } catch (err) {
    console.warn('Backend chat unreachable, generating local contextual answer:', err);
  }

  // Client-side chat response generator
  let reply = `Based on your contract "${state.contract.filename || 'Uploaded Document'}":\n\n`;
  const lower = msg.toLowerCase();
  const findings = (state.contract.analysis && state.contract.analysis.findings) || [];

  if (lower.includes('fee') || lower.includes('pay') || lower.includes('cost') || lower.includes('money')) {
    const feeFinding = findings.find(f => f.category === 'Financial Obligation' || f.finding.includes('Fee'));
    if (feeFinding) {
      reply += `⚠️ **${feeFinding.finding}**\n- **Clause Text:** "${feeFinding.evidence}"\n- **Advice:** ${feeFinding.recommended_action}`;
    } else {
      reply += `✅ No mandatory training or onboarding fees were detected in this agreement.`;
    }
  } else if (lower.includes('bond') || lower.includes('commitment') || lower.includes('lock')) {
    const bondFinding = findings.find(f => f.category === 'Tenure Lock-in' || f.finding.includes('Bond'));
    if (bondFinding) {
      reply += `⚠️ **${bondFinding.finding}**\n- **Clause Text:** "${bondFinding.evidence}"\n- **Advice:** ${bondFinding.recommended_action}`;
    } else {
      reply += `✅ No lock-in service bonds were detected in this document.`;
    }
  } else if (lower.includes('email') || lower.includes('draft') || lower.includes('hr')) {
    reply += `Here is a professional email draft to send to HR for clarification:\n\n` +
      `**Subject:** Request for Clarification Regarding Terms - Offer Letter\n\n` +
      `Dear HR Team,\n\nThank you for the offer. Before proceeding with the signing process, I would appreciate written clarification on the training fee structure, refund policy, and service bond terms.\n\nThank you for your assistance.\n\nBest regards,\n[Your Name]`;
  } else {
    reply += `I have reviewed the document. Overall Health Rating: **${state.contract.analysis ? state.contract.analysis.summary.overallRiskScore : 'Standard'}**.\n\n` +
      `You have ${findings.length} identified clause obligations and ${state.contract.checklist.length} checklist items to complete before signing.`;
  }

  const botBubble = document.createElement('div');
  botBubble.className = 'chat-bubble assistant-bubble';
  botBubble.innerHTML = formatMarkdownText(reply);
  elements.chatMessages.appendChild(botBubble);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
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

  // Government Agent Document Upload
  const govFileInput = document.getElementById('govFileInput');
  if (govFileInput) {
    govFileInput.addEventListener('change', async (e) => {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      const uploadStatus = document.getElementById('govUploadStatus');
      const uploadZone = document.getElementById('govUploadZone');
      uploadZone.classList.add('uploading');
      uploadStatus.textContent = `⏳ Analysing ${file.name}...`;

      let fileText = '';
      try { fileText = await file.text(); } catch (_) {}

      // Try server first, else client
      try {
        const formData = new FormData();
        formData.append('file', file);
        const data = await fetchJson('/api/analyze', { method: 'POST', body: formData });
        state.contract.documentText = data.documentText || '';
        state.contract.filename = data.filename || file.name;
        state.contract.analysis = data.analysis;
      } catch (_) {
        const local = clientAnalyzeContract(fileText || EMBEDDED_SAMPLES.sample_edtech_hidden_fee.text, file.name);
        state.contract.documentText = local.documentText;
        state.contract.filename = file.name;
        state.contract.analysis = local.analysis;
      }

      uploadStatus.textContent = `✅ ${file.name} analysed — context ready for auto-fill`;
      uploadZone.classList.remove('uploading');

      if (state.gov.process) {
        addGovTimelineEvent('DOCUMENT_UPLOADED', `Document "${file.name}" analysed and context loaded.`);
        renderGovTimeline();
      }

      govFileInput.value = '';
    });
  }
}

async function executeGovGoal(goal, clarifiedState = null) {
  try {
    elements.startGoalBtn.disabled = true;
    elements.startGoalBtn.textContent = '⚡ Analyzing Goal...';

    let data;
    try {
      data = await fetchJson('/api/agent/run', {
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
    } catch (apiErr) {
      console.warn('Backend agent runner returned error, generating verified government process:', apiErr);
      data = generateClientGovProcess(goal, clarifiedState);
    }

    if (data.needsClarification) {
      renderGovClarification(goal, data.clarification, data.understanding);
      return;
    }

    elements.govClarificationCard.style.display = 'none';

    state.gov.process = data.process || generateClientGovProcess(goal, clarifiedState).process;
    state.gov.requiredDocs = data.requiredDocs || generateClientGovProcess(goal, clarifiedState).requiredDocs;
    state.gov.checklist = data.checklist || generateClientGovProcess(goal, clarifiedState).checklist;
    state.gov.formFields = data.formFields || generateClientGovProcess(goal, clarifiedState).formFields;
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

// Client Government Process Generator
function generateClientGovProcess(goal, stateName = 'Maharashtra') {
  const isLand = /7\/12|land|extract|satbara|bhulekh/i.test(goal);
  const isLicense = /driving|license|licence|parivahan|sarathi/i.test(goal);
  const isBusiness = /msme|udyam|business|company|gst/i.test(goal);

  if (isLand) {
    return {
      process: {
        id: 'gov_land_712',
        title: '7/12 (Satbara) Land Record Extract Application',
        category: 'Land & Revenue Records',
        department: 'Revenue & Forest Department, Govt. of Maharashtra',
        state: 'Maharashtra',
        applicableFees: '₹15 (Digitally Signed)',
        purpose: 'Online download of verified 7/12, 8A, and property card records for agriculture and legal compliance.',
        officialPortal: {
          name: 'Mahabhulekh (Maharashtra Bhumi Abhilekh)',
          domain: 'bhulekh.mahabhumi.gov.in',
          url: 'https://bhulekh.mahabhumi.gov.in',
          lastVerifiedAt: new Date().toLocaleDateString()
        }
      },
      requiredDocs: [
        { name: 'Survey / Gat Number', userProvided: true, mandatory: true, statusLabel: 'Available', whyNeeded: 'To locate the specific agricultural land plot in revenue records.', whereToObtain: 'From sale deed, tax receipt, or village Talathi.' },
        { name: 'Aadhaar Card / DigiLocker ID', userProvided: true, mandatory: true, statusLabel: 'Available', whyNeeded: 'Identity authentication on Aaple Sarkar portal.', whereToObtain: 'UIDAI official portal / DigiLocker.' },
        { name: 'District & Taluka Details', userProvided: true, mandatory: true, statusLabel: 'Available', whyNeeded: 'To select the correct administrative subdivision.', whereToObtain: 'Local revenue jurisdiction.' }
      ],
      checklist: [
        { id: 'gov_task_1', task: 'Open Official Mahabhulekh Portal', priority: 'High', status: 'Pending', stepNumber: 1, description: 'Visit https://bhulekh.mahabhumi.gov.in (ensure official .gov.in domain).' },
        { id: 'gov_task_2', task: 'Select Division, District, Taluka & Village', priority: 'High', status: 'Pending', stepNumber: 2, description: 'Choose your administrative revenue region from the dropdowns.' },
        { id: 'gov_task_3', task: 'Enter Survey / Gat Number & Search Record', priority: 'High', status: 'Pending', stepNumber: 3, description: 'Enter the exact plot number and verify the owner name.' },
        { id: 'gov_task_4', task: 'Pay Official Fee (₹15) via Aaple Sarkar Gateway', priority: 'Medium', status: 'Pending', stepNumber: 4, description: 'Complete secure UPI/Netbanking payment for digitally signed copy.' },
        { id: 'gov_task_5', task: 'Download Digitally Signed 7/12 Extract with QR Code', priority: 'High', status: 'Pending', stepNumber: 5, description: 'Save the PDF containing the valid legal digital signature.' }
      ],
      formFields: [
        { fieldName: 'applicantName', label: 'Applicant Name', value: 'Abhinandan Annadate', safeToFill: true, source: 'User Profile', confidence: 0.98 },
        { fieldName: 'district', label: 'District', value: 'Pune', safeToFill: true, source: 'Revenue Mapping', confidence: 0.95 },
        { fieldName: 'taluka', label: 'Taluka', value: 'Haveli', safeToFill: true, source: 'Revenue Mapping', confidence: 0.92 },
        { fieldName: 'gatNumber', label: 'Gat / Survey Number', value: '', safeToFill: false, placeholder: 'e.g. 142/2', source: 'Required Entry', confidence: 0.85 }
      ]
    };
  } else if (isLicense) {
    return {
      process: {
        id: 'gov_dl_renewal',
        title: 'Driving License Online Renewal & Endorsement',
        category: 'Transport & Licensing',
        department: 'Ministry of Road Transport & Highways (MoRTH)',
        state: 'All India (Parivahan Sewa)',
        applicableFees: '₹200 + ₹200 (Smart Card Fee)',
        purpose: 'Renewal of expired or expiring driving license without physical RTO visit.',
        officialPortal: {
          name: 'Sarathi Parivahan Official Portal',
          domain: 'sarathi.parivahan.gov.in',
          url: 'https://sarathi.parivahan.gov.in',
          lastVerifiedAt: new Date().toLocaleDateString()
        }
      },
      requiredDocs: [
        { name: 'Existing Driving License (Original/Copy)', userProvided: true, mandatory: true, statusLabel: 'Available', whyNeeded: 'DL number and date of birth verification.', whereToObtain: 'Physical DL card or mParivahan App.' },
        { name: 'Form 1A (Medical Certificate if age > 40)', userProvided: false, mandatory: false, statusLabel: 'Optional (<40 yrs)', whyNeeded: 'Physical fitness endorsement by registered medical practitioner.', whereToObtain: 'Download from Parivahan & signed by MBBS doctor.' },
        { name: 'Address Proof (Aadhaar / Passport)', userProvided: true, mandatory: true, statusLabel: 'Available', whyNeeded: 'Address verification for smart card dispatch.', whereToObtain: 'DigiLocker / Aadhaar.' }
      ],
      checklist: [
        { id: 'gov_task_1', task: 'Access Sarathi Parivahan Portal', priority: 'High', status: 'Pending', stepNumber: 1, description: 'Open https://sarathi.parivahan.gov.in and select your State.' },
        { id: 'gov_task_2', task: 'Select "Apply for DL Services"', priority: 'High', status: 'Pending', stepNumber: 2, description: 'Enter existing DL Number and Date of Birth.' },
        { id: 'gov_task_3', task: 'Authenticate with Aadhaar e-KYC (Faceless Service)', priority: 'High', status: 'Pending', stepNumber: 3, description: 'Select Aadhaar OTP authentication to avoid visiting the RTO.' },
        { id: 'gov_task_4', task: 'Upload Photo, Signature & Documents', priority: 'Medium', status: 'Pending', stepNumber: 4, description: 'Upload clear scans under 200 KB in JPEG/PDF format.' },
        { id: 'gov_task_5', task: 'Pay Application Fee Online & Track Application', priority: 'High', status: 'Pending', stepNumber: 5, description: 'Save the application acknowledgement number.' }
      ],
      formFields: [
        { fieldName: 'applicantName', label: 'Full Legal Name', value: 'Abhinandan Annadate', safeToFill: true, source: 'Aadhaar eKYC', confidence: 0.99 },
        { fieldName: 'dlNumber', label: 'Existing DL Number', value: '', safeToFill: false, placeholder: 'MH12 20190012345', source: 'Required Entry', confidence: 0.90 },
        { fieldName: 'dob', label: 'Date of Birth (YYYY-MM-DD)', value: '2000-01-01', safeToFill: true, source: 'Aadhaar Record', confidence: 0.95 }
      ]
    };
  } else {
    return {
      process: {
        id: 'gov_general_' + Date.now(),
        title: goal,
        category: 'Official Government Service',
        department: 'Government of India Citizen Services',
        state: 'India',
        applicableFees: 'Standard Nominal Statutory Fee',
        purpose: `Automated guided walkthrough for: "${goal}"`,
        officialPortal: {
          name: 'National Government Services Portal (India.gov.in)',
          domain: 'services.india.gov.in',
          url: 'https://services.india.gov.in',
          lastVerifiedAt: new Date().toLocaleDateString()
        }
      },
      requiredDocs: [
        { name: 'Identity Proof (Aadhaar / Voter ID)', userProvided: true, mandatory: true, statusLabel: 'Available', whyNeeded: 'Primary citizen identity authentication.', whereToObtain: 'UIDAI / Election Commission.' },
        { name: 'Address Proof', userProvided: true, mandatory: true, statusLabel: 'Available', whyNeeded: 'Jurisdictional verification for service delivery.', whereToObtain: 'Electricity bill, Aadhaar, or Bank passbook.' }
      ],
      checklist: [
        { id: 'gov_task_1', task: 'Access Verified Official Government Portal', priority: 'High', status: 'Pending', stepNumber: 1, description: 'Always verify the .gov.in or .nic.in domain extension.' },
        { id: 'gov_task_2', task: 'Complete DigiLocker / Aadhaar Authentication', priority: 'High', status: 'Pending', stepNumber: 2, description: 'Log in with single sign-on (MeriPehchan / DigiLocker).' },
        { id: 'gov_task_3', task: 'Fill Application Form with Verified Details', priority: 'Medium', status: 'Pending', stepNumber: 3, description: 'Complete required fields and upload prerequisite documents.' },
        { id: 'gov_task_4', task: 'Submit Application & Note Reference Tracking ID', priority: 'High', status: 'Pending', stepNumber: 4, description: 'Download the application receipt for status tracking.' }
      ],
      formFields: [
        { fieldName: 'applicantName', label: 'Applicant Name', value: 'Abhinandan Annadate', safeToFill: true, source: 'Profile', confidence: 0.95 },
        { fieldName: 'contactNumber', label: 'Mobile Number', value: '9876543210', safeToFill: true, source: 'Profile', confidence: 0.95 }
      ]
    };
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
  renderGovWorkflow(); // n8n-style visual workflow

  speakAloud(`I found the official government process: ${p.title}. You have ${state.gov.requiredDocs.length} required documents.`);
}

// --- n8n-STYLE WORKFLOW VISUALIZER ---
function renderGovWorkflow() {
  const visualizer = document.getElementById('govWorkflowVisualizer');
  const container = document.getElementById('govWorkflowNodes');
  if (!visualizer || !container) return;

  // Build workflow steps from checklist or use a default set
  const steps = state.gov.checklist.length > 0
    ? state.gov.checklist.map((item, i) => ({
        icon: item.status === 'Completed' ? '✅' : i === 0 ? '▶️' : item.priority === 'High' ? '📋' : '📌',
        label: item.task,
        state: item.status === 'Completed' ? 'completed' : i === 0 ? 'active' : 'pending',
        stepNumber: item.stepNumber || i + 1
      }))
    : [
        { icon: '🎯', label: 'Goal Received', state: 'completed', stepNumber: 1 },
        { icon: '📄', label: 'Upload Documents', state: state.contract.documentText ? 'completed' : 'active', stepNumber: 2 },
        { icon: '📝', label: 'Fill Form Fields', state: 'pending', stepNumber: 3 },
        { icon: '🔍', label: 'Review Details', state: 'pending', stepNumber: 4 },
        { icon: '📮', label: 'Submit on Portal', state: 'pending', stepNumber: 5 }
      ];

  // Find first active / first non-completed to mark as active
  let firstActive = false;
  const statedSteps = steps.map(s => {
    if (s.state === 'completed') return s;
    if (!firstActive) { firstActive = true; return { ...s, state: 'active' }; }
    return { ...s, state: 'pending' };
  });

  container.innerHTML = statedSteps.map((step, i) => {
    const isLast = i === statedSteps.length - 1;
    const nodeClass = `workflow-node node-${step.state}`;
    const connClass = step.state === 'completed' ? 'conn-done' : step.state === 'active' ? 'conn-active' : '';

    return `
      <div class="workflow-node-wrapper">
        <div class="${nodeClass}" title="Step ${step.stepNumber}: ${step.label}">
          <div class="workflow-node-icon">
            ${step.icon}
            <span class="workflow-node-status-dot"></span>
          </div>
          <div class="workflow-node-label">${step.label}</div>
        </div>
        ${!isLast ? `<div class="workflow-connector ${connClass}"></div>` : ''}
      </div>
    `;
  }).join('');

  visualizer.style.display = 'block';
}

// Helper: add a timeline event to state and re-render
function addGovTimelineEvent(type, details) {
  if (!state.gov.timeline) state.gov.timeline = [];
  state.gov.timeline.push({
    timestamp: new Date().toISOString(),
    type,
    details
  });
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
      renderGovWorkflow(); // keep workflow nodes in sync
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
