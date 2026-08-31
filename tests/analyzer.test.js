/**
 * analyzer.test.js
 * Automated test suite for Contract Analyzer, Agent Engine, and Company Verifier.
 */

const assert = require('assert');
const analyzer = require('../server/agent/contractAnalyzer');
const agent = require('../server/agent/agentEngine');
const verifier = require('../server/agent/companyVerifier');
const { sampleContracts } = require('../server/data/samples');

console.log('🧪 Starting Automated Tests for Student Contract Assistant...\n');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    testsPassed++;
  } catch (error) {
    console.error(`❌ FAIL: ${name}`);
    console.error(error);
    testsFailed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    testsPassed++;
  } catch (error) {
    console.error(`❌ FAIL: ${name}`);
    console.error(error);
    testsFailed++;
  }
}

async function runTests() {
  // Test 1: Empty Document Handling
  test('Empty document returns zero findings and helpful fallback', () => {
    const res = analyzer.analyze('');
    assert.strictEqual(res.summary.totalFindings, 0);
    assert.ok(res.summary.studentFriendlySummary.includes('Information could not be verified'));
  });

  // Test 2: Sample 1 - EdTech Hidden Fee & Bond Detection
  test('EdTech sample contract detects training fee and service bond', () => {
    const edtech = sampleContracts.find(s => s.id === 'sample_edtech_hidden_fee');
    assert.ok(edtech, 'Edtech sample should exist');

    const res = analyzer.analyze(edtech.text, edtech.title);
    assert.ok(res.findings.length >= 3, `Expected at least 3 findings, got ${res.findings.length}`);

    const feeFinding = res.findings.find(f => f.ruleId === 'training_fee');
    assert.ok(feeFinding, 'Training fee should be detected');
    assert.strictEqual(feeFinding.severity, 'high');
    assert.ok(feeFinding.amount.includes('25,000') || feeFinding.amount.includes('25000'), 'Amount ₹25,000 should be parsed');

    const bondFinding = res.findings.find(f => f.ruleId === 'service_bond');
    assert.ok(bondFinding, 'Service bond should be detected');
    assert.strictEqual(bondFinding.severity, 'high');

    const exitPenalty = res.findings.find(f => f.ruleId === 'exit_penalties');
    assert.ok(exitPenalty, 'Exit penalty liquidated damages should be detected');

    // Verify evidence is present and non-empty
    assert.ok(feeFinding.evidence.length > 10, 'Evidence should be non-empty');
    assert.ok(feeFinding.recommended_action.length > 10, 'Recommended action should be present');
  });

  // Test 3: Zero-Scam-Labeling Policy
  test('No finding labels company or agreement as scam/fraud', () => {
    const edtech = sampleContracts.find(s => s.id === 'sample_edtech_hidden_fee');
    const res = analyzer.analyze(edtech.text);
    
    const serialized = JSON.stringify(res).toLowerCase();
    assert.ok(!serialized.includes('scam'), 'Output must not contain the word scam');
    assert.ok(!serialized.includes('fraud'), 'Output must not contain the word fraud');
  });

  // Test 4: Sample 3 - Clean Contract Detection
  test('Clean contract produces minimal findings and clean score', () => {
    const cleanSample = sampleContracts.find(s => s.id === 'sample_clean_standard_offer');
    const res = analyzer.analyze(cleanSample.text);

    const highSeverity = res.findings.filter(f => f.severity === 'high');
    assert.strictEqual(highSeverity.length, 0, 'Clean contract should have 0 high severity findings');
  });

  // Test 5: Checklist Generation and Priority
  test('Checklist is generated with ID, Priority, Status, Evidence', () => {
    const edtech = sampleContracts.find(s => s.id === 'sample_edtech_hidden_fee');
    const res = analyzer.analyze(edtech.text);

    assert.ok(res.checklist.length > 0, 'Checklist should contain items');
    for (const item of res.checklist) {
      assert.ok(item.id, 'Item must have an id');
      assert.ok(item.task, 'Item must have a task');
      assert.ok(item.priority, 'Item must have a priority');
      assert.strictEqual(item.status, 'Pending', 'Default status must be Pending');
    }
  });

  // Test 6: Agentic Tools Execution
  test('Agent tools detect_payment_terms, detect_bond_terms, get_next_pending_task work properly', () => {
    const edtech = sampleContracts.find(s => s.id === 'sample_edtech_hidden_fee');
    
    const paymentResult = agent.tools.detect_payment_terms(edtech.text);
    assert.ok(paymentResult.count > 0, 'Payment tool should detect fees');

    const bondResult = agent.tools.detect_bond_terms(edtech.text);
    assert.ok(bondResult.count > 0, 'Bond tool should detect bond');

    const checklist = analyzer.generateChecklist(analyzer.analyze(edtech.text).findings, [], new Set());
    const nextTask = agent.tools.get_next_pending_task(checklist);
    assert.strictEqual(nextTask.completed, false);
    assert.ok(nextTask.nextTask.task);
  });

  // Test 7: Agent Run Goal (Planning + Execution)
  await asyncTest('Agent runAgentGoal executes plan, tools, and returns next action', async () => {
    const edtech = sampleContracts.find(s => s.id === 'sample_edtech_hidden_fee');
    const goalResult = await agent.runAgentGoal('Check this contract and tell me what I should do.', {
      documentText: edtech.text,
      filename: edtech.title
    });

    assert.ok(goalResult.plan.length >= 3, 'Plan should contain multiple steps');
    assert.ok(goalResult.trace.length >= 3, 'Execution trace should record tool steps');
    assert.ok(goalResult.response.includes('Contract Analysis Summary'));
    assert.ok(goalResult.nextTask);
    assert.ok(goalResult.checklist.length > 0);
  });

  // Test 8: Context-Aware Chatbot
  test('Chatbot responds contextually with evidence for payment query', () => {
    const edtech = sampleContracts.find(s => s.id === 'sample_edtech_hidden_fee');
    const analysis = analyzer.analyze(edtech.text);

    const chatReply = agent.chatWithContext('Is there any payment in this contract?', {
      documentText: edtech.text,
      findings: analysis.findings,
      checklist: analysis.checklist
    });

    assert.ok(chatReply.includes('Page'), 'Chat should cite page/section');
    assert.ok(chatReply.includes('25,000') || chatReply.includes('payment') || chatReply.includes('fee'), 'Chat should mention the fee');
    assert.ok(chatReply.includes('Recommended Action') || chatReply.includes('Action'), 'Chat should recommend action');
  });

  // Test 9: Company Verifier
  test('Company verification returns structured records with legal existence disclaimer', () => {
    const vResult = verifier.verify('NextGen Tech Education Pvt Ltd');
    assert.strictEqual(vResult.verified, true);
    assert.ok(vResult.cin.length > 5);
    assert.ok(vResult.disclaimer.includes('NOT an endorsement'));
  });

  console.log(`\n=======================================================`);
  console.log(`🏁 Test Results: ${testsPassed} passed, ${testsFailed} failed`);
  console.log(`=======================================================\n`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests();
