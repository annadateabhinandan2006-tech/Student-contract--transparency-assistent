/**
 * smartForm.test.js
 * Automated unit tests for Smart Form Guidance & Predictive Validation logic.
 */

const assert = require('assert');

// Form state analyzer logic mirroring client engine
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
    fieldStatus: []
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

console.log('🧪 Starting Smart Form Guidance Tests...\n');

const sampleFields = [
  { fieldName: 'applicantName', label: 'Full Legal Name', safeToFill: true },
  { fieldName: 'contractType', label: 'Contract Type', safeToFill: false },
  { fieldName: 'supportingDoc', label: 'Supporting Document', safeToFill: false },
  { fieldName: 'startDate', label: 'Start Date', safeToFill: true },
  { fieldName: 'endDate', label: 'End Date', safeToFill: true }
];

// Test 1: Empty form detects missing required fields and recommends first step
{
  const analysis = analyzeFormState(sampleFields, {});
  assert.strictEqual(analysis.missingFields.length, 2);
  assert.strictEqual(analysis.missingFields[0].fieldName, 'contractType');
  assert.strictEqual(analysis.nextStep, 'Enter Contract Type');
  assert(analysis.possibleProblems.length > 0);
  console.log('✅ PASS: Missing required field detection & next step recommendation');
}

// Test 2: Incomplete short value detection
{
  const analysis = analyzeFormState(sampleFields, {
    contractType: 'AB', // too short
    supportingDoc: 'Offer_Letter.pdf'
  });
  assert.strictEqual(analysis.incompleteFields.length, 1);
  assert.strictEqual(analysis.incompleteFields[0].fieldName, 'contractType');
  assert.strictEqual(analysis.nextStep, 'Complete Contract Type');
  console.log('✅ PASS: Incomplete value detection & corrective guidance');
}

// Test 3: Date inconsistency detection (Start Date > End Date)
{
  const analysis = analyzeFormState(sampleFields, {
    applicantName: 'Alex Doe',
    contractType: 'Employment Agreement',
    supportingDoc: 'Signed_Offer.pdf',
    startDate: '2026-10-10',
    endDate: '2026-09-05' // Inconsistent: ends before it starts!
  });
  assert.strictEqual(analysis.inconsistencies.length, 1);
  assert(analysis.inconsistencies[0].issue.includes('is after'));
  assert.strictEqual(analysis.nextStep, 'Review inconsistent fields');
  console.log('✅ PASS: Date inconsistency detection & warning');
}

// Test 4: Fully valid form state
{
  const analysis = analyzeFormState(sampleFields, {
    applicantName: 'Alex Doe',
    contractType: 'Employment Agreement',
    supportingDoc: 'Signed_Offer.pdf',
    startDate: '2026-09-01',
    endDate: '2026-12-31'
  });
  assert.strictEqual(analysis.missingFields.length, 0);
  assert.strictEqual(analysis.incompleteFields.length, 0);
  assert.strictEqual(analysis.inconsistencies.length, 0);
  assert.strictEqual(analysis.possibleProblems.length, 0);
  assert.strictEqual(analysis.nextStep, 'All fields look complete');
  console.log('✅ PASS: Valid form completion & final step advice');
}

console.log('\n=======================================================');
console.log('🏁 Smart Form Tests: 4 passed, 0 failed');
console.log('=======================================================\n');
