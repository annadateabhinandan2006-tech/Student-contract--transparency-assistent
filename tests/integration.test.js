/**
 * integration.test.js
 * Comprehensive end-to-end integration tests for HTTP API endpoints.
 */

const http = require('http');
const app = require('../server/index');

const PORT = 3456;
let server;

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (postData) req.write(postData);
    req.end();
  });
}

async function runIntegrationTests() {
  console.log('🚀 Starting API Integration Tests on port', PORT);
  server = app.listen(PORT);

  let passed = 0;
  let failed = 0;

  async function check(desc, fn) {
    try {
      await fn();
      console.log(`✅ PASS: ${desc}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${desc}`);
      console.error(err);
      failed++;
    }
  }

  try {
    // 1. Health endpoint
    await check('GET /api/health returns ONLINE status', async () => {
      const res = await request('GET', '/api/health');
      if (res.status !== 200 || res.body.status !== 'ONLINE') {
        throw new Error(`Expected 200 ONLINE, got ${res.status} ${JSON.stringify(res.body)}`);
      }
    });

    // 2. Samples endpoint
    await check('GET /api/samples returns sample contracts', async () => {
      const res = await request('GET', '/api/samples');
      if (res.status !== 200 || !Array.isArray(res.body) || res.body.length < 3) {
        throw new Error(`Expected 3+ samples, got ${res.body.length}`);
      }
    });

    // 3. Analyze sample contract
    let analysisResult;
    await check('POST /api/analyze with sampleId analyzes obligations', async () => {
      const res = await request('POST', '/api/analyze', { sampleId: 'sample_edtech_hidden_fee' });
      if (res.status !== 200 || !res.body.analysis) {
        throw new Error(`Analysis failed: ${JSON.stringify(res.body)}`);
      }
      analysisResult = res.body;
      if (res.body.analysis.findings.length < 2) {
        throw new Error(`Expected >=2 findings, got ${res.body.analysis.findings.length}`);
      }
    });

    // 4. Agent Goal Runner
    await check('POST /api/agent/run executes action-oriented agent goal', async () => {
      const res = await request('POST', '/api/agent/run', {
        goal: 'Check this contract and tell me what I should do.',
        context: {
          documentText: analysisResult.documentText,
          filename: analysisResult.filename
        }
      });
      if (res.status !== 200 || !res.body.plan || res.body.plan.length === 0) {
        throw new Error(`Agent run failed: ${JSON.stringify(res.body)}`);
      }
    });

    // 5. Context-aware Chatbot
    await check('POST /api/chat provides document-specific response for payment clause', async () => {
      const res = await request('POST', '/api/chat', {
        message: 'Is there any payment required?',
        context: {
          documentText: analysisResult.documentText,
          findings: analysisResult.analysis.findings,
          checklist: analysisResult.analysis.checklist
        }
      });
      if (res.status !== 200 || !res.body.reply.includes('payment') && !res.body.reply.includes('Page')) {
        throw new Error(`Chat reply unexpected: ${res.body.reply}`);
      }
    });

    // 6. Save & retrieve shared checklist
    let shareId;
    await check('POST /api/checklist/save saves state and GET /api/checklist/:shareId retrieves it', async () => {
      const saveRes = await request('POST', '/api/checklist/save', {
        documentName: 'Test Agreement',
        analysis: analysisResult.analysis,
        checklist: analysisResult.analysis.checklist
      });
      if (saveRes.status !== 200 || !saveRes.body.shareId) {
        throw new Error(`Save checklist failed: ${JSON.stringify(saveRes.body)}`);
      }
      shareId = saveRes.body.shareId;

      const getRes = await request('GET', `/api/checklist/${shareId}`);
      if (getRes.status !== 200 || getRes.body.record.documentName !== 'Test Agreement') {
        throw new Error(`Get checklist failed: ${JSON.stringify(getRes.body)}`);
      }
    });

    console.log(`\n=======================================================`);
    console.log(`🏁 API Integration Results: ${passed} passed, ${failed} failed`);
    console.log(`=======================================================\n`);

    if (failed > 0) process.exit(1);

  } finally {
    server.close();
  }
}

runIntegrationTests();
