/**
 * agentEngine.js
 * Action-Oriented Agentic AI for Student Contract Assistance.
 * Follows the workflow: User Goal -> Understand -> Plan -> Choose Tool -> Execute -> Verify -> Update Checklist -> Next Action.
 */

const analyzer = require('./contractAnalyzer');

class AgentEngine {
  constructor() {
    this.tools = {
      analyze_document: (text, filename) => this.toolAnalyzeDocument(text, filename),
      detect_payment_terms: (text) => this.toolDetectPaymentTerms(text),
      detect_penalties: (text) => this.toolDetectPenalties(text),
      detect_bond_terms: (text) => this.toolDetectBondTerms(text),
      detect_notice_period: (text) => this.toolDetectNoticePeriod(text),
      detect_missing_information: (text) => this.toolDetectMissingInformation(text),
      create_checklist: (findings, missingInfo) => this.toolCreateChecklist(findings, missingInfo),
      update_checklist: (checklist, taskId, status) => this.toolUpdateChecklist(checklist, taskId, status),
      get_next_pending_task: (checklist) => this.toolGetNextPendingTask(checklist),
      generate_student_questions: (findings) => this.toolGenerateStudentQuestions(findings),
      draft_inquiry_email: (findingId, findings, companyName) => this.toolDraftInquiryEmail(findingId, findings, companyName)
    };
  }

  // --- TOOL IMPLEMENTATIONS ---

  toolAnalyzeDocument(text, filename = 'Contract') {
    return analyzer.analyze(text, filename);
  }

  toolDetectPaymentTerms(text) {
    const analysis = analyzer.analyze(text);
    const payments = analysis.findings.filter(f => f.category === 'financial' || f.ruleId === 'training_fee' || f.ruleId === 'security_deposit');
    return {
      tool: 'detect_payment_terms',
      count: payments.length,
      findings: payments.length > 0 ? payments : [{
        finding: 'No upfront payment or fee clause detected',
        evidence: 'Information could not be verified from the document.',
        status: 'Clear'
      }]
    };
  }

  toolDetectPenalties(text) {
    const analysis = analyzer.analyze(text);
    const penalties = analysis.findings.filter(f => f.category === 'penalties' || f.ruleId === 'exit_penalties');
    return {
      tool: 'detect_penalties',
      count: penalties.length,
      findings: penalties.length > 0 ? penalties : [{
        finding: 'No explicit exit penalty or liquidated damages clause detected',
        evidence: 'Information could not be verified from the document.',
        status: 'Clear'
      }]
    };
  }

  toolDetectBondTerms(text) {
    const analysis = analyzer.analyze(text);
    const bonds = analysis.findings.filter(f => f.category === 'commitment' || f.ruleId === 'service_bond');
    return {
      tool: 'detect_bond_terms',
      count: bonds.length,
      findings: bonds.length > 0 ? bonds : [{
        finding: 'No mandatory service bond / lock-in clause detected',
        evidence: 'Information could not be verified from the document.',
        status: 'Clear'
      }]
    };
  }

  toolDetectNoticePeriod(text) {
    const analysis = analyzer.analyze(text);
    const notices = analysis.findings.filter(f => f.category === 'termination' || f.ruleId === 'notice_period');
    return {
      tool: 'detect_notice_period',
      count: notices.length,
      findings: notices.length > 0 ? notices : [{
        finding: 'Standard or unspecified notice period',
        evidence: 'Information could not be verified from the document.',
        status: 'Unspecified'
      }]
    };
  }

  toolDetectMissingInformation(text) {
    const missing = analyzer.detectMissingInfo(text);
    return {
      tool: 'detect_missing_information',
      count: missing.length,
      missingItems: missing
    };
  }

  toolCreateChecklist(findings, missingInfo) {
    return analyzer.generateChecklist(findings || [], missingInfo || [], new Set());
  }

  toolUpdateChecklist(checklist, taskId, status) {
    if (!Array.isArray(checklist)) return [];
    return checklist.map(item => {
      if (item.id === taskId) {
        return { ...item, status, updatedAt: new Date().toISOString() };
      }
      return item;
    });
  }

  toolGetNextPendingTask(checklist) {
    if (!Array.isArray(checklist) || checklist.length === 0) {
      return { message: 'No checklist items available. Upload and analyze a document first.' };
    }
    // High priority first, then medium, then low
    const priorityOrder = { High: 1, Medium: 2, Low: 3 };
    const pending = checklist
      .filter(item => item.status === 'Pending' || item.status === 'In Progress')
      .sort((a, b) => (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4));

    if (pending.length === 0) {
      return {
        completed: true,
        message: '🎉 All checklist action items have been marked completed! You are ready to review and make an informed decision.'
      };
    }

    const nextTask = pending[0];
    return {
      completed: false,
      nextTask,
      totalPending: pending.length,
      recommendation: `Recommended Next Action: "${nextTask.task}".\n\nDetails: ${nextTask.description}`
    };
  }

  toolGenerateStudentQuestions(findings) {
    const questions = [];
    if (!findings || findings.length === 0) {
      questions.push({
        topic: 'General Terms',
        question: 'Could you please confirm the exact daily work hours and remote/in-office expectations for this role?'
      });
      return questions;
    }

    for (const f of findings) {
      if (f.ruleId === 'training_fee') {
        questions.push({
          topic: 'Training / Registration Fee',
          question: `Regarding the ${f.amount || 'training fee'} stated in Section/Page ${f.page || '1'}: Is this mandatory for all candidates, and is there a written refund policy if the training cannot be completed?`
        });
      } else if (f.ruleId === 'service_bond') {
        questions.push({
          topic: 'Service Agreement & Lock-In',
          question: `Could you clarify the exit policy if an academic conflict or university exam requirement arises during the ${f.timing || 'bond period'}?`
        });
      } else if (f.ruleId === 'security_deposit') {
        questions.push({
          topic: 'Security Deposit & Original Certificates',
          question: `Could you provide written confirmation of the exact timeline and procedure for the return of the deposit upon internship completion?`
        });
      } else if (f.ruleId === 'exit_penalties') {
        questions.push({
          topic: 'Liquidated Damages / Exit Penalties',
          question: `Could you explain the specific itemized costs covered by the liquidated damages clause in case of emergency early departure?`
        });
      } else if (f.ruleId === 'stipend_conditions') {
        questions.push({
          topic: 'Stipend Distribution & Probation',
          question: `Could you clarify the exact breakdown of the fixed versus performance-linked stipend during the probation period?`
        });
      }
    }

    if (questions.length === 0) {
      questions.push({
        topic: 'Confirmation of Offer Terms',
        question: 'Could you please confirm the start date, working timings, supervisor name, and university study leave guidelines?'
      });
    }

    return questions;
  }

  toolDraftInquiryEmail(findingId, findings, companyName = 'Hiring Team') {
    const finding = findings.find(f => f.id === findingId || f.ruleId === findingId) || findings[0];
    if (!finding) {
      return {
        subject: 'Inquiry regarding Offer Letter Details',
        body: `Dear ${companyName},\n\nThank you for offering me this opportunity. I am reviewing the contract and would appreciate clarification on standard work hours and academic leave policies.\n\nBest regards,\n[Your Name]`
      };
    }

    const subject = `Clarification regarding ${finding.finding} - Offer Letter`;
    const body = `Dear ${companyName} HR Team,

Thank you very much for offering me the opportunity to join your team. I am carefully reviewing the agreement to ensure complete alignment.

I would appreciate some clarification on the following clause referenced in the agreement:
- Clause Reference: "${finding.evidence || 'Contract terms'}" (Page ${finding.page || 1})
- Question: ${finding.recommended_action}

Could you please provide guidance on this at your earliest convenience?

Thank you for your support.

Warm regards,
[Student Name]
[Contact Number]`;

    return { subject, body };
  }

  // --- AGENT WORKFLOW RUNNER ---

  /**
   * Runs the full Agentic loop: Goal -> Plan -> Choose Tool -> Execute -> Verify -> Update Checklist -> Next Action
   */
  async runAgentGoal(userGoal, context = {}) {
    const documentText = context.documentText || '';
    const currentChecklist = context.checklist || [];
    const currentFindings = context.findings || [];
    const planSteps = [];
    const executionTrace = [];

    const goalLower = userGoal.toLowerCase();

    // 1. Understand Goal
    let plannedTools = [];
    if (goalLower.includes('check') || goalLower.includes('analyze') || goalLower.includes('review') || goalLower.includes('what should i do') || goalLower.includes('obligations')) {
      plannedTools = ['analyze_document', 'detect_missing_information', 'create_checklist', 'get_next_pending_task', 'generate_student_questions'];
    } else if (goalLower.includes('payment') || goalLower.includes('fee') || goalLower.includes('money') || goalLower.includes('deposit')) {
      plannedTools = ['detect_payment_terms', 'generate_student_questions'];
    } else if (goalLower.includes('bond') || goalLower.includes('commitment') || goalLower.includes('years') || goalLower.includes('lock')) {
      plannedTools = ['detect_bond_terms', 'generate_student_questions'];
    } else if (goalLower.includes('penalty') || goalLower.includes('damages') || goalLower.includes('exit')) {
      plannedTools = ['detect_penalties', 'generate_student_questions'];
    } else if (goalLower.includes('next') || goalLower.includes('action') || goalLower.includes('what next')) {
      plannedTools = ['get_next_pending_task'];
    } else if (goalLower.includes('email') || goalLower.includes('draft') || goalLower.includes('ask hr')) {
      plannedTools = ['draft_inquiry_email'];
    } else {
      plannedTools = ['analyze_document', 'get_next_pending_task'];
    }

    // 2. Plan
    for (let i = 0; i < plannedTools.length; i++) {
      planSteps.push({
        step: i + 1,
        tool: plannedTools[i],
        description: `Execute tool: ${plannedTools[i]} based on student goal.`
      });
    }

    // 3. Execute Tools & 4. Verify
    let analysisResult = null;
    let newChecklist = currentChecklist;
    let nextTaskInfo = null;
    let questions = [];
    let draftedEmail = null;

    for (const toolName of plannedTools) {
      let output = null;
      if (toolName === 'analyze_document') {
        output = this.tools.analyze_document(documentText, context.filename || 'Contract');
        analysisResult = output;
        newChecklist = output.checklist;
      } else if (toolName === 'detect_payment_terms') {
        output = this.tools.detect_payment_terms(documentText);
      } else if (toolName === 'detect_penalties') {
        output = this.tools.detect_penalties(documentText);
      } else if (toolName === 'detect_bond_terms') {
        output = this.tools.detect_bond_terms(documentText);
      } else if (toolName === 'detect_notice_period') {
        output = this.tools.detect_notice_period(documentText);
      } else if (toolName === 'detect_missing_information') {
        output = this.tools.detect_missing_information(documentText);
      } else if (toolName === 'create_checklist') {
        output = this.tools.create_checklist(analysisResult ? analysisResult.findings : currentFindings, analysisResult ? analysisResult.missingInformation : []);
        newChecklist = output;
      } else if (toolName === 'get_next_pending_task') {
        output = this.tools.get_next_pending_task(newChecklist.length > 0 ? newChecklist : currentChecklist);
        nextTaskInfo = output;
      } else if (toolName === 'generate_student_questions') {
        output = this.tools.generate_student_questions(analysisResult ? analysisResult.findings : currentFindings);
        questions = output;
      } else if (toolName === 'draft_inquiry_email') {
        output = this.tools.draft_inquiry_email(context.findingId, analysisResult ? analysisResult.findings : currentFindings, context.companyName);
        draftedEmail = output;
      }

      executionTrace.push({
        tool: toolName,
        status: 'SUCCESS',
        resultPreview: typeof output === 'object' ? (output.finding || output.message || `${toolName} executed successfully`) : output
      });
    }

    // 5. Construct Final Actionable Response
    let agentMessage = '';
    if (analysisResult) {
      agentMessage += `### 📋 Contract Analysis Summary\n${analysisResult.summary.studentFriendlySummary}\n\n`;
      if (analysisResult.findings.length > 0) {
        agentMessage += `**Identified Obligations:**\n`;
        analysisResult.findings.forEach(f => {
          agentMessage += `- **${f.finding}** (Page ${f.page || 1}, Severity: *${f.severity}*)\n  *Evidence*: "${f.evidence}"\n  *Recommended Action*: ${f.recommended_action}\n\n`;
        });
      }
    }

    if (nextTaskInfo && nextTaskInfo.recommendation) {
      agentMessage += `### 🎯 Your First Recommended Action\n${nextTaskInfo.recommendation}\n\n`;
    }

    if (questions.length > 0) {
      agentMessage += `### ❓ Questions You Can Ask the Employer\n`;
      questions.slice(0, 3).forEach((q, idx) => {
        agentMessage += `${idx + 1}. **${q.topic}**: "${q.question}"\n`;
      });
    }

    if (draftedEmail) {
      agentMessage += `### ✉️ Drafted Inquiry Email\n**Subject**: ${draftedEmail.subject}\n\n\`\`\`text\n${draftedEmail.body}\n\`\`\``;
    }

    return {
      userGoal,
      plan: planSteps,
      trace: executionTrace,
      analysis: analysisResult,
      checklist: newChecklist,
      nextTask: nextTaskInfo,
      questions,
      draftedEmail,
      response: agentMessage || 'Agent execution completed with tool outputs.'
    };
  }

  /**
   * Conversational QA aware of document, analysis findings, and checklist state
   */
  chatWithContext(userMessage, context = {}) {
    const { documentText = '', findings = [], checklist = [], missingInfo = [] } = context;
    const msg = userMessage.toLowerCase();

    // Check payment questions
    if (msg.includes('payment') || msg.includes('fee') || msg.includes('money') || msg.includes('charge') || msg.includes('pay') || msg.includes('cost')) {
      const paymentFindings = findings.filter(f => f.category === 'financial' || f.ruleId === 'training_fee' || f.ruleId === 'security_deposit');
      if (paymentFindings.length > 0) {
        const item = paymentFindings[0];
        return `I found a potential payment obligation in the document on **Page ${item.page || 1}**.\n\n` +
               `**Clause Detail**: ${item.finding}\n` +
               `**Evidence**: "${item.evidence}"\n` +
               `**Amount / Timing**: ${item.amount} (${item.timing})\n\n` +
               `**Recommended Action**: ${item.recommended_action}`;
      } else {
        return `I reviewed the document and did not find any mandatory upfront training fee, registration fee, or security deposit clause. If the employer mentions an unwritten fee, ask for official written documentation.`;
      }
    }

    // Check bond / commitment questions
    if (msg.includes('bond') || msg.includes('lock in') || msg.includes('commitment') || msg.includes('years') || msg.includes('duration') || msg.includes('months')) {
      const bondFindings = findings.filter(f => f.category === 'commitment' || f.ruleId === 'service_bond');
      if (bondFindings.length > 0) {
        const item = bondFindings[0];
        return `Yes, a service commitment bond was detected on **Page ${item.page || 1}**.\n\n` +
               `**Evidence**: "${item.evidence}"\n` +
               `**Duration / Condition**: ${item.timing || 'Mandatory tenure'}\n\n` +
               `**Recommendation**: Ensure this period fits your graduation timeline. ${item.recommended_action}`;
      } else {
        return `No mandatory service bond or multi-year lock-in period was detected in this document.`;
      }
    }

    // Check exit penalty / damages questions
    if (msg.includes('penalty') || msg.includes('leave') || msg.includes('resign') || msg.includes('quit') || msg.includes('liquidated damages')) {
      const penaltyFindings = findings.filter(f => f.category === 'penalties' || f.ruleId === 'exit_penalties');
      if (penaltyFindings.length > 0) {
        const item = penaltyFindings[0];
        return `I found an exit penalty clause on **Page ${item.page || 1}**:\n\n` +
               `**Evidence**: "${item.evidence}"\n` +
               `**Amount/Requirement**: ${item.amount}\n\n` +
               `**Advice**: ${item.recommended_action}`;
      } else {
        return `No early resignation penalty or stipend clawback clause was detected in the document.`;
      }
    }

    // Check notice period
    if (msg.includes('notice') || msg.includes('notice period')) {
      const noticeFindings = findings.filter(f => f.ruleId === 'notice_period');
      if (noticeFindings.length > 0) {
        const item = noticeFindings[0];
        return `The document mentions a notice period requirement on **Page ${item.page || 1}**:\n\n` +
               `**Evidence**: "${item.evidence}"\n` +
               `**Advice**: ${item.recommended_action}`;
      } else {
        return `No specific notice period duration is mentioned in this document. For internships, 15 to 30 days is customary.`;
      }
    }

    // Check stipend / salary
    if (msg.includes('stipend') || msg.includes('salary') || msg.includes('ctc') || msg.includes('probation') || msg.includes('pay scale')) {
      const stipendFindings = findings.filter(f => f.category === 'compensation');
      if (stipendFindings.length > 0) {
        const item = stipendFindings[0];
        return `Regarding compensation, here is what the document states (Page ${item.page || 1}):\n\n` +
               `**Detail**: ${item.finding}\n` +
               `**Evidence**: "${item.evidence}"\n\n` +
               `**Action**: ${item.recommended_action}`;
      } else {
        return `The document does not explicitly highlight restrictive stipend conditions. Make sure to confirm the exact monthly amount and disbursement dates with HR in writing.`;
      }
    }

    // Check next action / checklist status
    if (msg.includes('next task') || msg.includes('next action') || msg.includes('what should i do next') || msg.includes('checklist')) {
      const nextTask = this.toolGetNextPendingTask(checklist);
      if (nextTask.completed) {
        return nextTask.message;
      }
      return `Here is your current pending priority action:\n\n` +
             `📌 **${nextTask.nextTask.task}** (Priority: ${nextTask.nextTask.priority})\n` +
             `*Description*: ${nextTask.nextTask.description}\n` +
             `*Evidence Ref*: ${nextTask.nextTask.evidence || 'N/A'}`;
    }

    // Fallback contextual response
    if (findings.length > 0) {
      return `I am analyzing your document with **${findings.length} identified findings** and **${checklist.length} checklist tasks**.\n\n` +
             `You can ask me about:\n` +
             `- *"Is there any payment or fee?"*\n` +
             `- *"What is the bond duration?"*\n` +
             `- *"What is the exit penalty?"*\n` +
             `- *"What is my next recommended action?"*\n` +
             `- *"Draft an email to HR asking about these terms."*`;
    }

    return `Please upload a contract or select one of the sample agreements, and I'll analyze the obligations and answer any specific clause questions for you!`;
  }
}

module.exports = new AgentEngine();
