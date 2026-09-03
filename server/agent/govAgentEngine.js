/**
 * govAgentEngine.js
 * Action-Oriented Government Process Automation Agent.
 */

const { governmentProcesses, getProcessById, searchProcesses } = require('../data/govRegistry');

class GovernmentAgentEngine {
  constructor() {
    this.sessionTimelines = new Map();
    this.savedApplications = new Map();
  }

  logEvent(sessionId, eventType, details) {
    if (!sessionId) sessionId = 'default_session';
    if (!this.sessionTimelines.has(sessionId)) {
      this.sessionTimelines.set(sessionId, []);
    }
    const event = {
      id: 'event_' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      type: eventType,
      details
    };
    this.sessionTimelines.get(sessionId).push(event);
    return event;
  }

  getTimeline(sessionId = 'default_session') {
    return this.sessionTimelines.get(sessionId) || [];
  }

  toolUnderstandUserGoal(goal) {
    const g = (goal || '').toLowerCase().trim();
    let detectedCategory = 'general';
    let detectedState = null;
    let needsClarification = false;
    let clarificationPrompt = null;

    if (g.includes('maharashtra') || g.includes('pune') || g.includes('mumbai')) {
      detectedState = 'Maharashtra';
    }

    if (g.includes('land') || g.includes('7/12') || g.includes('satbara')) {
      detectedCategory = 'Land & Property Records';
      if (!detectedState) {
        needsClarification = true;
        clarificationPrompt = 'Which state or district is the land located in? (e.g. Maharashtra)';
      }
    } else if (g.includes('license') || g.includes('driving') || g.includes('rto')) {
      detectedCategory = 'Transport & Driving Services';
    }

    return {
      goal,
      detectedCategory,
      detectedState: detectedState || 'All States / National',
      needsClarification,
      clarificationPrompt
    };
  }

  toolFindOfficialProcess(goal, state, category) {
    const results = searchProcesses(goal || category, state);
    if (results.length > 0) {
      return { matched: true, primaryProcess: results[0], allMatches: results };
    }
    return { matched: false, message: 'Official information could not be verified from available sources.' };
  }

  toolExtractRequiredDocuments(processId) {
    const process = getProcessById(processId);
    return process ? process.requiredDocuments : [];
  }

  toolCreateProcessChecklist(processId) {
    const process = getProcessById(processId);
    if (!process) return [];
    return process.actionSteps.map((step, idx) => ({
      id: `gov_task_${idx + 1}`,
      stepNumber: step.step,
      task: step.title,
      description: step.desc,
      priority: step.priority,
      status: step.status || 'Pending'
    }));
  }

  toolValidateFormFields(formFields, fieldValues = {}) {
    const errors = [];
    for (const field of formFields) {
      const fName = field.fieldName || field.name;
      const val = fieldValues[fName] !== undefined ? fieldValues[fName] : (field.value || '');
      if (!val && !field.safeToFill) {
        errors.push({ field: fName, error: `${field.label || fName} is required.` });
      }
    }
    return { isValid: errors.length === 0, errors };
  }

  toolSaveReferenceNumber(processId, refNum, notes = '') {
    const record = { referenceNumber: refNum, processId, status: 'Submitted', submittedAt: new Date().toISOString(), notes };
    this.savedApplications.set(refNum, record);
    return record;
  }

  async runGovGoal(userGoal, sessionContext = {}) {
    const sessionId = sessionContext.sessionId || 'session_' + Date.now();
    this.logEvent(sessionId, 'Goal created', { goal: userGoal });

    const understanding = this.toolUnderstandUserGoal(userGoal);
    this.logEvent(sessionId, 'Intent understood', understanding);

    if (understanding.needsClarification && !sessionContext.clarifiedState) {
      return {
        sessionId,
        needsClarification: true,
        clarification: understanding.clarificationPrompt,
        understanding,
        response: `Please specify: **${understanding.clarificationPrompt}**`
      };
    }

    const processMatch = this.toolFindOfficialProcess(userGoal, sessionContext.clarifiedState || understanding.detectedState, understanding.detectedCategory);
    if (!processMatch.matched) {
      return { sessionId, response: processMatch.message };
    }

    const process = processMatch.primaryProcess;
    this.logEvent(sessionId, 'Official process identified', { title: process.title });

    const requiredDocs = this.toolExtractRequiredDocuments(process.id);
    const checklist = this.toolCreateProcessChecklist(process.id);

    return {
      sessionId,
      process,
      requiredDocs,
      checklist,
      formFields: process.formFields || [],
      timeline: this.getTimeline(sessionId),
      response: `Identified process: ${process.title}`
    };
  }

  stepByStepVoiceQA(query, context = {}) {
    const q = query.toLowerCase();
    const { process } = context;

    if (q.includes('what do i need') || q.includes('documents')) {
      return `For ${process ? process.title : 'this service'}, you need mandatory identity proof and property/license details.`;
    }
    return `I am your Government Process Guide. Ask me about required documents, fees, or official links.`;
  }
}

module.exports = new GovernmentAgentEngine();
