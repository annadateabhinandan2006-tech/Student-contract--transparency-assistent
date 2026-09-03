/**
 * api.js
 * Express API routes for User Contract Transparency Assistant,
 * Document Analysis, Agentic Workflows, Entity Verification, Reports, and Government Automation.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const analyzer = require('../agent/contractAnalyzer');
const agent = require('../agent/agentEngine');
const verifier = require('../agent/companyVerifier');
const { sampleContracts, getSampleById } = require('../data/samples');

// Configure multer memory storage with 10MB file limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// In-memory datastore for saved reports and contract sessions
const savedReportsStore = new Map();
const contractSessionsStore = new Map();

// Helper to sanitize filenames
function sanitizeFilename(filename) {
  return (filename || 'Contract_Document').replace(/[^a-zA-Z0-9_.-]/g, '_');
}

// --- 1. HEALTH CHECK ENDPOINT ---
router.get('/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    ok: true,
    mode: 'Cloud AI / Primary Assistant',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    features: {
      documentAnalysis: true,
      agenticWorkflows: true,
      voiceAssistant: true,
      companyVerification: true,
      checklistSync: true,
      savedReports: true,
      governmentAgent: true
    }
  });
});

// --- 2. SAMPLE CONTRACTS ---
router.get('/samples', (req, res) => {
  res.json(sampleContracts.map(s => ({
    id: s.id,
    title: s.title,
    category: s.category,
    badge: s.badge,
    company: s.company,
    description: s.description
  })));
});

router.get('/samples/:id', (req, res) => {
  const sample = getSampleById(req.params.id);
  if (!sample) {
    return res.status(404).json({ error: 'Sample contract not found' });
  }
  res.json(sample);
});

// --- 3. DOCUMENT EXTRACTION & ANALYSIS (/api/analyze & /api/contracts/upload & /api/contracts/analyze) ---
async function processContractAnalysis(req, res) {
  try {
    let documentText = '';
    let filename = 'Pasted Contract Text';

    if (req.file) {
      filename = sanitizeFilename(req.file.originalname);
      const mimeType = req.file.mimetype || '';
      const fnameLower = filename.toLowerCase();

      if (mimeType.includes('pdf') || fnameLower.endsWith('.pdf')) {
        try {
          const pdfData = await pdfParse(req.file.buffer);
          documentText = pdfData.text;
        } catch (pdfErr) {
          console.error('PDF parsing error:', pdfErr);
          return res.status(400).json({ error: 'Could not extract text from the uploaded PDF document.' });
        }
      } else {
        // Plain text, Markdown, or raw content
        documentText = req.file.buffer.toString('utf-8');
      }
    } else if (req.body.text) {
      documentText = req.body.text;
      if (req.body.filename) filename = sanitizeFilename(req.body.filename);
    } else if (req.body.sampleId) {
      const sample = getSampleById(req.body.sampleId);
      if (sample) {
        documentText = sample.text;
        filename = sample.title;
      }
    }

    if (!documentText || documentText.trim().length === 0) {
      return res.status(400).json({ error: 'No document text found or file is empty.' });
    }

    // Run contract analysis engine
    const analysis = analyzer.analyze(documentText, filename);

    // Run entity verification
    const company = verifier.verify(null, documentText);

    // Create session record
    const contractId = 'contract_' + Math.random().toString(36).substring(2, 10);
    const sessionRecord = {
      id: contractId,
      filename,
      analyzedAt: new Date().toISOString(),
      documentText,
      analysis,
      company,
      checklist: analysis.checklist || []
    };

    contractSessionsStore.set(contractId, sessionRecord);

    res.json({
      success: true,
      contractId,
      filename,
      documentText,
      analysis,
      company
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Failed to complete contract analysis', details: error.message });
  }
}

router.post('/analyze', upload.single('file'), processContractAnalysis);
router.post('/contracts/upload', upload.single('file'), processContractAnalysis);
router.post('/contracts/analyze', upload.single('file'), processContractAnalysis);

// --- 4. CONTRACT SESSION & REPORTS ENDPOINTS ---
router.get('/contracts', (req, res) => {
  const reports = Array.from(savedReportsStore.values());
  res.json({
    success: true,
    count: reports.length,
    reports
  });
});

router.get('/reports', (req, res) => {
  const reports = Array.from(savedReportsStore.values());
  res.json({
    success: true,
    count: reports.length,
    reports
  });
});

router.get('/contracts/:id', (req, res) => {
  const id = req.params.id;
  const report = savedReportsStore.get(id) || contractSessionsStore.get(id);
  if (!report) {
    return res.status(404).json({ error: 'Contract session or report not found.' });
  }
  res.json({ success: true, report });
});

router.get('/reports/:id', (req, res) => {
  const id = req.params.id;
  const report = savedReportsStore.get(id) || contractSessionsStore.get(id);
  if (!report) {
    return res.status(404).json({ error: 'Report not found.' });
  }
  res.json({ success: true, report });
});

router.get('/contracts/:id/findings', (req, res) => {
  const id = req.params.id;
  const report = savedReportsStore.get(id) || contractSessionsStore.get(id);
  if (!report) {
    return res.status(404).json({ error: 'Contract record not found.' });
  }
  res.json({
    success: true,
    findings: report.analysis ? report.analysis.findings : []
  });
});

router.get('/contracts/:id/checklist', (req, res) => {
  const id = req.params.id;
  const report = savedReportsStore.get(id) || contractSessionsStore.get(id);
  if (!report) {
    return res.status(404).json({ error: 'Contract record not found.' });
  }
  const checklist = report.checklist || (report.analysis ? report.analysis.checklist : []);
  const total = checklist.length;
  const completed = checklist.filter(i => i.status === 'Completed').length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  res.json({
    success: true,
    checklist,
    progress: { completed, total, percentage }
  });
});

router.patch('/contracts/:id/checklist', (req, res) => {
  const id = req.params.id;
  const { taskId, status } = req.body;

  const report = savedReportsStore.get(id) || contractSessionsStore.get(id);
  if (!report) {
    return res.status(404).json({ error: 'Contract record not found.' });
  }

  if (report.checklist) {
    report.checklist = report.checklist.map(item => {
      if (item.id === taskId) {
        return { ...item, status: status || (item.status === 'Completed' ? 'Pending' : 'Completed') };
      }
      return item;
    });
  }

  const total = report.checklist.length;
  const completed = report.checklist.filter(i => i.status === 'Completed').length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  res.json({
    success: true,
    checklist: report.checklist,
    progress: { completed, total, percentage }
  });
});

// --- 5. SAVE REPORT ENDPOINT ---
router.post('/contracts/:id/save', (req, res) => {
  try {
    const id = req.params.id || 'report_' + Math.random().toString(36).substring(2, 10);
    const { documentName, analysis, checklist, company } = req.body;

    const reportRecord = {
      id,
      documentName: documentName || 'Contract Analysis Report',
      savedAt: new Date().toISOString(),
      analysis: analysis || {},
      checklist: checklist || [],
      company: company || {}
    };

    savedReportsStore.set(id, reportRecord);

    res.json({
      success: true,
      reportId: id,
      report: reportRecord
    });
  } catch (err) {
    console.error('Save report error:', err);
    res.status(500).json({ error: 'Failed to save report' });
  }
});

router.post('/checklist/save', (req, res) => {
  try {
    const { documentName, analysis, checklist, progress, company } = req.body;
    const shareId = 'share_' + Math.random().toString(36).substring(2, 10);

    const record = {
      id: shareId,
      shareId,
      documentName: documentName || 'User Agreement',
      savedAt: new Date().toISOString(),
      analysis,
      checklist: checklist || [],
      progress: progress || { completed: 0, total: 0, percentage: 0 },
      company: company || {}
    };

    savedReportsStore.set(shareId, record);

    res.json({
      success: true,
      shareId,
      shareUrl: `/share/${shareId}`,
      record
    });
  } catch (error) {
    console.error('Save checklist error:', error);
    res.status(500).json({ error: 'Failed to save checklist state' });
  }
});

router.get('/checklist/:shareId', (req, res) => {
  const { shareId } = req.params;
  const record = savedReportsStore.get(shareId);

  if (!record) {
    return res.status(404).json({ error: 'Saved checklist not found or has expired.' });
  }

  res.json({
    success: true,
    record
  });
});

// --- 6. EXPORT REPORT ENDPOINT ---
router.get('/contracts/:id/export', (req, res) => {
  const id = req.params.id;
  const report = savedReportsStore.get(id) || contractSessionsStore.get(id);

  if (!report || !report.analysis) {
    return res.status(404).json({ error: 'Report not found or has no analysis.' });
  }

  const { filename, summary, findings } = report.analysis;
  let md = `# User Contract Transparency Report\n\n`;
  md += `**Document Name:** ${filename}\n`;
  md += `**Date:** ${new Date().toLocaleDateString()}\n`;
  md += `**Risk Rating:** ${summary.overallRiskScore}\n\n`;
  md += `## Executive Summary\n${summary.studentFriendlySummary}\n\n`;
  md += `## Identified Obligations\n`;

  findings.forEach((f, idx) => {
    md += `### ${idx + 1}. ${f.finding}\n- Severity: ${f.severity}\n- Evidence: "${f.evidence}"\n- Action: ${f.recommended_action}\n\n`;
  });

  res.setHeader('Content-Type', 'text/markdown');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}_report.md"`);
  res.send(md);
});

// --- 7. CONVERSATIONAL CHATBOT (DOCUMENT AWARE & CONTEXT RETRIEVAL) ---
async function handleChatRequest(req, res) {
  try {
    const { message, context } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const reply = agent.chatWithContext(message, context || {});

    // Formulate structured sources if findings exist
    let sources = [];
    if (context && context.findings && Array.isArray(context.findings)) {
      sources = context.findings.slice(0, 3).map(f => ({
        clause: f.finding || f.title,
        text: f.evidence || f.clause
      }));
    }

    res.json({
      success: true,
      answer: reply,
      reply,
      sources,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat message', details: error.message });
  }
}

router.post('/chat', handleChatRequest);
router.post('/contracts/:id/chat', handleChatRequest);

// --- 8. AGENTIC AI WORKFLOW RUNNER & TOOL INVOCATION ---
router.post('/agent/run', async (req, res) => {
  try {
    const { goal, context } = req.body;
    if (!goal) {
      return res.status(400).json({ error: 'Goal prompt is required' });
    }

    const result = await agent.runAgentGoal(goal, context || {});
    res.json({
      success: true,
      goal,
      ...result
    });
  } catch (error) {
    console.error('Agent runner error:', error);
    res.status(500).json({ error: 'Failed to run agent goal', details: error.message });
  }
});

router.post('/agent/tool', (req, res) => {
  try {
    const { toolName, args } = req.body;
    if (!agent.tools[toolName]) {
      return res.status(400).json({ error: `Tool ${toolName} not found in agent registry.` });
    }

    const toolFn = agent.tools[toolName];
    const result = toolFn(...(Array.isArray(args) ? args : [args]));
    res.json({
      success: true,
      tool: toolName,
      result
    });
  } catch (error) {
    console.error('Tool execution error:', error);
    res.status(500).json({ error: 'Tool execution failed', details: error.message });
  }
});

// --- 9. COMPANY VERIFICATION ---
router.post('/company/verify', (req, res) => {
  try {
    const { companyName, text } = req.body;
    const verification = verifier.verify(companyName, text || '');
    res.json({
      success: true,
      verification
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Company verification failed' });
  }
});

// =========================================================================
// GOVERNMENT PROCESS AUTOMATION AGENT ROUTES
// =========================================================================
const govAgent = require('../agent/govAgentEngine');
const { searchProcesses, getProcessById } = require('../data/govRegistry');

router.post('/gov/agent/run', async (req, res) => {
  try {
    const { goal, sessionContext } = req.body;
    if (!goal) {
      return res.status(400).json({ error: 'User goal description is required' });
    }

    const result = await govAgent.runGovGoal(goal, sessionContext || {});
    res.json({
      success: true,
      goal,
      ...result
    });
  } catch (error) {
    console.error('Gov Agent runner error:', error);
    res.status(500).json({ error: 'Government automation agent error', details: error.message });
  }
});

router.get('/gov/processes', (req, res) => {
  const { q, state } = req.query;
  const results = searchProcesses(q, state);
  res.json({
    success: true,
    count: results.length,
    processes: results
  });
});

router.get('/gov/process/:id', (req, res) => {
  const process = getProcessById(req.params.id);
  if (!process) {
    return res.status(404).json({ error: 'Government process not found' });
  }
  res.json({
    success: true,
    process
  });
});

router.post('/gov/form/validate', (req, res) => {
  try {
    const { formFields, fieldValues } = req.body;
    const validation = govAgent.toolValidateFormFields(formFields || [], fieldValues || {});
    res.json({
      success: true,
      validation
    });
  } catch (error) {
    console.error('Form validation error:', error);
    res.status(500).json({ error: 'Failed to validate form fields' });
  }
});

router.post('/gov/application/confirm', (req, res) => {
  try {
    const { processId, confirmedFields, userSignatureConsent, sessionId } = req.body;

    if (!userSignatureConsent) {
      return res.status(400).json({
        error: 'Explicit user confirmation and declaration consent is required before submission.'
      });
    }

    const refNumber = 'GOV-MH-' + Math.floor(10000000 + Math.random() * 90000000);
    const record = govAgent.toolSaveReferenceNumber(
      processId,
      refNumber,
      `Submitted by citizen via verified gateway with ${Object.keys(confirmedFields || {}).length} verified fields.`
    );

    govAgent.logEvent(sessionId || 'default_session', 'User confirmed', { refNumber, processId });
    govAgent.logEvent(sessionId || 'default_session', 'Submission completed', { refNumber });

    res.json({
      success: true,
      referenceNumber: refNumber,
      record,
      timeline: govAgent.getTimeline(sessionId)
    });
  } catch (error) {
    console.error('Application confirmation error:', error);
    res.status(500).json({ error: 'Failed to complete application confirmation' });
  }
});

router.get('/gov/timeline/:sessionId', (req, res) => {
  const timeline = govAgent.getTimeline(req.params.sessionId);
  res.json({
    success: true,
    sessionId: req.params.sessionId,
    timeline
  });
});

router.post('/gov/voice/chat', (req, res) => {
  try {
    const { query, context } = req.body;
    const reply = govAgent.stepByStepVoiceQA(query || '', context || {});
    res.json({
      success: true,
      reply,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Gov voice QA error:', error);
    res.status(500).json({ error: 'Failed to process voice query' });
  }
});

module.exports = router;
