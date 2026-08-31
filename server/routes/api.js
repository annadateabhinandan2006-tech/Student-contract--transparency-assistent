/**
 * api.js
 * Express API routes for Document Analysis, Agentic Tools, Chatbot, Voice Assistant Fallback, and Save/Share.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const analyzer = require('../agent/contractAnalyzer');
const agent = require('../agent/agentEngine');
const verifier = require('../agent/companyVerifier');
const { sampleContracts, getSampleById } = require('../data/samples');

// Configure multer memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// In-memory persistent datastore for saved and shared checklists
const savedChecklists = new Map();

// --- 1. HEALTH & RECOVERY ---
router.get('/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    mode: 'Cloud AI / Primary Assistant',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    features: {
      documentAnalysis: true,
      agenticWorkflows: true,
      voiceAssistant: true,
      companyVerification: true,
      checklistSync: true
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

// --- 3. DOCUMENT EXTRACTION & ANALYSIS ---
router.post('/analyze', upload.single('file'), async (req, res) => {
  try {
    let documentText = '';
    let filename = 'Pasted Contract Text';

    if (req.file) {
      filename = req.file.originalname;
      const mimeType = req.file.mimetype;

      if (mimeType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
        try {
          const pdfData = await pdfParse(req.file.buffer);
          documentText = pdfData.text;
        } catch (pdfErr) {
          console.error('PDF parsing error:', pdfErr);
          return res.status(400).json({ error: 'Could not extract text from the uploaded PDF document.' });
        }
      } else {
        // Text, Markdown, or raw content
        documentText = req.file.buffer.toString('utf-8');
      }
    } else if (req.body.text) {
      documentText = req.body.text;
      if (req.body.filename) filename = req.body.filename;
    } else if (req.body.sampleId) {
      const sample = getSampleById(req.body.sampleId);
      documentText = sample.text;
      filename = sample.title;
    }

    if (!documentText || documentText.trim().length === 0) {
      return res.status(400).json({ error: 'No document text found or file is empty.' });
    }

    // Run contract analysis
    const analysis = analyzer.analyze(documentText, filename);

    // Extract company verification
    const company = verifier.verify(null, documentText);

    res.json({
      success: true,
      filename,
      documentText,
      analysis,
      company
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Failed to complete contract analysis', details: error.message });
  }
});

// --- 4. AGENTIC AI WORKFLOW RUNNER ---
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

// --- 5. AGENT TOOL DIRECT INVOCATION ---
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

// --- 6. CONVERSATIONAL CHATBOT (DOCUMENT AWARE) ---
router.post('/chat', (req, res) => {
  try {
    const { message, context } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const reply = agent.chatWithContext(message, context || {});
    res.json({
      success: true,
      reply,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat message', details: error.message });
  }
});

// --- 7. COMPANY VERIFICATION ---
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

// --- 8. SAVE & SHARE CHECKLIST ---
router.post('/checklist/save', (req, res) => {
  try {
    const { documentName, analysis, checklist, progress, company } = req.body;
    const shareId = 'share_' + Math.random().toString(36).substring(2, 10);

    const record = {
      shareId,
      documentName: documentName || 'Student Agreement',
      savedAt: new Date().toISOString(),
      analysis,
      checklist: checklist || [],
      progress: progress || { completed: 0, total: 0, percentage: 0 },
      company: company || {}
    };

    savedChecklists.set(shareId, record);

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
  const record = savedChecklists.get(shareId);

  if (!record) {
    return res.status(404).json({ error: 'Saved checklist not found or has expired.' });
  }

  res.json({
    success: true,
    record
  });
});

module.exports = router;
