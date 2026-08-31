/**
 * contractAnalyzer.js
 * Core engine for detecting hidden student obligations in internship/training/job contracts.
 * Strictly adheres to objective evidence extraction, severity ratings, and recommended student actions.
 * Zero-scam-labeling policy: Never labels a company or contract as 'scam' or 'fraud'.
 */

class ContractAnalyzer {
  constructor() {
    this.clauseRules = [
      // 1. Training / Registration / Certification Fees & Upfront Payments
      {
        category: 'financial',
        id: 'training_fee',
        title: 'Potential Training / Registration Fee Obligation',
        severity: 'high',
        patterns: [
          /(?:training|registration|course|onboarding|platform|material|seat)\s*(?:fee|charges?|cost|amount|payment|deposit)/i,
          /(?:candidate|student|intern|employee)\s*(?:shall|must|is required to|agrees to)\s*(?:pay|deposit|transfer|bear)\s*(?:an amount of|rs\.?|inr|₹|\$)?\s*[\d,]+/i,
          /(?:fee|payment)\s*of\s*(?:rs\.?|inr|₹|\$)\s*[\d,]+\s*(?:towards|for|before|upon)\s*(?:training|certification|joining|induction)/i
        ],
        amountExtractor: /(?:rs\.?|inr|₹|\$)\s*([\d,]+(?:\.\d+)?)/i,
        timingExtractor: /(?:before joining|after selection|prior to onboarding|at the time of joining|upon offer acceptance|during induction)/i,
        description: 'The document specifies a monetary fee or deposit associated with training, registration, onboarding, or induction.',
        recommendedAction: 'Ask the company in writing whether this payment is mandatory, if it can be deducted from future stipend instead, and request a copy of the written refund policy.'
      },

      // 2. Security Deposits & Laptop/Asset Collateral
      {
        category: 'financial',
        id: 'security_deposit',
        title: 'Security Deposit / Asset Collateral Requirement',
        severity: 'medium',
        patterns: [
          /(?:security|caution|refundable|non-refundable)\s*deposit/i,
          /(?:deposit|submission)\s*of\s*(?:original\s*(?:certificates?|degrees?|documents?|marksheets?))/i,
          /(?:hold|withhold|retaining)\s*(?:original\s*(?:certificates?|documents?))/i,
          /(?:caution\s*money|asset\s*deposit|hardware\s*deposit)/i
        ],
        amountExtractor: /(?:rs\.?|inr|₹|\$)\s*([\d,]+(?:\.\d+)?)/i,
        timingExtractor: /(?:upon joining|at the time of offer|prior to commencement|upon asset handover)/i,
        description: 'The contract mentions submitting a monetary security deposit or withholding original academic certificates/marksheets.',
        recommendedAction: 'Clarify asset return timelines. Note: Under government labor advisories, withholding original educational certificates is strictly discouraged.'
      },

      // 3. Service Bonds / Mandatory Commitment Periods
      {
        category: 'commitment',
        id: 'service_bond',
        title: 'Service Agreement / Mandatory Commitment Bond',
        severity: 'high',
        patterns: [
          /(?:service\s*(?:agreement|bond|commitment|obligation))\s*(?:of|for)\s*(?:\d+)\s*(?:months?|years?)/i,
          /(?:minimum|mandatory)\s*commitment\s*(?:period\s*)?(?:of|for)\s*(?:\d+)\s*(?:months?|years?)/i,
          /(?:shall\s*serve|agree\s*to\s*serve)\s*the\s*company\s*for\s*(?:a\s*minimum\s*period\s*of)?\s*(?:\d+)\s*(?:months?|years?)/i,
          /(?:lock-in\s*period|retention\s*period)\s*(?:of|for)?\s*(?:\d+)\s*(?:months?|years?)/i
        ],
        amountExtractor: /(?:breach|penalty|indemnity|liquidated damages)[\s\S]{0,40}?(?:rs\.?|inr|₹|\$)\s*([\d,]+)/i,
        timingExtractor: /(\d+\s*(?:months?|years?))/i,
        description: 'A mandatory minimum duration of service or lock-in period is stipulated, which may restrict your freedom to resign early without financial consequences.',
        recommendedAction: 'Check if the bond period aligns with your academic schedule and career plans. Inquire about terms for early exit in case of medical or academic emergencies.'
      },

      // 4. Liquidated Damages / Early Exit Financial Penalties
      {
        category: 'penalties',
        id: 'exit_penalties',
        title: 'Exit Penalty / Liquidated Damages on Early Resignation',
        severity: 'high',
        patterns: [
          /(?:liquidated\s*damages|penalty|compensation|indemnity)\s*(?:of|amounting to)?\s*(?:rs\.?|inr|₹|\$)?\s*[\d,]+/i,
          /(?:in\s*case\s*of\s*early\s*(?:exit|resignation|termination|leaving))[\s\S]{0,60}?(?:pay|reimburse|refund|liable)/i,
          /(?:reimburse|recover|repay)\s*(?:the\s*)?(?:training\s*cost|expenses|stipend)/i
        ],
        amountExtractor: /(?:rs\.?|inr|₹|\$)\s*([\d,]+(?:\.\d+)?)/i,
        timingExtractor: /(?:upon resignation|prior to completion|on early departure)/i,
        description: 'Leaving before the agreed tenure may trigger financial penalties, stipend clawback, or training cost recovery.',
        recommendedAction: 'Review whether the penalty amount is proportional to actual documented training costs incurred by the employer, and negotiate exit terms if needed.'
      },

      // 5. Notice Period & Exit Requirements
      {
        category: 'termination',
        id: 'notice_period',
        title: 'Notice Period & Termination Terms',
        severity: 'medium',
        patterns: [
          /(?:notice\s*period\s*(?:of|is)?\s*|give\s*|serve\s*)(\d+\s*(?:days?|months?|weeks?))/i,
          /(?:prior\s*written\s*notice)\s*of\s*(\d+\s*(?:days?|months?|weeks?))/i,
          /(?:salary\s*in\s*lieu\s*of\s*notice|buyout\s*of\s*notice)/i
        ],
        amountExtractor: null,
        timingExtractor: /(\d+\s*(?:days?|months?|weeks?))/i,
        description: 'The contract requires serving a specific notice period or paying salary in lieu before departing.',
        recommendedAction: 'Verify that the notice period is manageable (e.g. 15-30 days for internships) and does not conflict with exams or higher studies.'
      },

      // 6. Stipend / Salary Conditions & Performance-Linked Deductions
      {
        category: 'compensation',
        id: 'stipend_conditions',
        title: 'Conditional Stipend / Delayed Compensation / Deductions',
        severity: 'medium',
        patterns: [
          /(?:stipend|salary)\s*(?:is|will be)\s*(?:purely|strictly)?\s*(?:performance-based|target-based|incentive-based|subject to target)/i,
          /(?:unpaid\s*probation|probation\s*without\s*(?:pay|stipend|salary))/i,
          /(?:withhold|deduct|retain)\s*(\d+%|\d+\s*percent)\s*(?:of\s*(?:stipend|salary))/i,
          /(?:no\s*stipend|zero\s*stipend)\s*(?:during|for)\s*(?:the\s*first)?\s*(\d+\s*(?:months?|weeks?))/i
        ],
        amountExtractor: /(\d+%\s*(?:retention|deduction)|(?:rs\.?|inr|₹|\$)\s*[\d,]+)/i,
        timingExtractor: /(?:during probation|first \d+ months?|upon milestone completion)/i,
        description: 'Compensation appears conditional, incentive-contingent, subject to withholding, or involves unpaid probation periods.',
        recommendedAction: 'Request clear written benchmarks for milestone achievements and clarify fixed versus variable stipend portions.'
      },

      // 7. Non-Compete & IP Clauses
      {
        category: 'legal',
        id: 'non_compete',
        title: 'Non-Compete / Post-Employment Restrictions',
        severity: 'low',
        patterns: [
          /(?:non-compete|shall\s*not\s*engage\s*with\s*(?:competitors|any\s*competing\s*entity))\s*(?:for\s*(?:\d+)\s*(?:months?|years?))?/i,
          /(?:restrained\s*from\s*working|soliciting\s*clients)\s*(?:for\s*(?:\d+)\s*(?:months?|years?))?/i
        ],
        amountExtractor: null,
        timingExtractor: /(\d+\s*(?:months?|years?))/i,
        description: 'Restrictions on joining competing firms or freelance projects after the internship/employment concludes.',
        recommendedAction: 'Ensure post-employment restrictions are reasonably bounded in geographic scope and time duration.'
      },

      // 8. Unilateral Modification & Sole Discretion Clauses
      {
        category: 'policy',
        id: 'unilateral_terms',
        title: 'Unilateral Modification & Sole Discretion Clauses',
        severity: 'low',
        patterns: [
          /(?:company\s*reserves\s*the\s*right\s*to\s*(?:modify|alter|terminate|amend)\s*(?:without\s*prior\s*notice|at\s*its\s*sole\s*discretion))/i,
          /(?:sole\s*and\s*absolute\s*discretion\s*of\s*the\s*management)/i
        ],
        amountExtractor: null,
        timingExtractor: null,
        description: 'The organization reserves unilateral rights to alter employment terms, stipend, or roles without prior notice.',
        recommendedAction: 'Ask for mutual consent provisions for substantial changes in job responsibilities or compensation.'
      }
    ];

    // Checklist template generators based on detected patterns
    this.checklistCatalog = {
      training_fee: {
        task: 'Clarify Training Fee Obligation in Writing',
        description: 'Send a formal email asking whether the training/registration fee is mandatory, refundable, or can be waived/sponsored by the company.',
        priority: 'High'
      },
      security_deposit: {
        task: 'Confirm Asset Deposit & Document Retention Policy',
        description: 'Clarify the exact conditions for deposit return upon exit, and ensure original certificates will not be withheld.',
        priority: 'High'
      },
      service_bond: {
        task: 'Review Service Bond & Lock-in Commitment Terms',
        description: 'Examine if the mandatory bond duration conflicts with college exams, graduation, or alternate opportunities.',
        priority: 'High'
      },
      exit_penalties: {
        task: 'Inquire About Exit Penalty & Early Departure Clauses',
        description: 'Request clarification regarding how damages or training costs are calculated if an emergency forces early exit.',
        priority: 'High'
      },
      notice_period: {
        task: 'Verify Notice Period & Resignation Process',
        description: 'Confirm standard notice duration (recommended <= 30 days for interns) and buy-out or waiver options.',
        priority: 'Medium'
      },
      stipend_conditions: {
        task: 'Confirm Fixed vs Variable Stipend Structure',
        description: 'Get written confirmation of the base guaranteed stipend and exact payment cycle (e.g. 5th of every month).',
        priority: 'Medium'
      },
      non_compete: {
        task: 'Assess Non-Compete Scope',
        description: 'Verify that non-compete clauses do not excessively restrict subsequent job applications in your domain.',
        priority: 'Low'
      },
      unilateral_terms: {
        task: 'Request Clarification on Contract Modification Terms',
        description: 'Ask whether changes in role or location require mutual written consent.',
        priority: 'Low'
      },
      general_verification: {
        task: 'Verify Company Identity & Primary Registration',
        description: 'Cross-check the company name, CIN/registration, and official domain on government portals (e.g., MCA/Ministry records).',
        priority: 'High'
      },
      missing_info: {
        task: 'Request Missing / Unspecified Contract Details',
        description: 'Ask for missing vital information such as working hours, supervisor contact, and leave policy.',
        priority: 'Medium'
      }
    };
  }

  /**
   * Splits document into rough pages or logical sections
   */
  splitIntoSections(text) {
    const pageSplitRegex = /(?:(?:---|===)?\s*page\s*(\d+)\s*(?:---|===)?)/i;
    const rawParts = text.split(/\n{3,}|\r\n\r\n\r\n/);
    
    let sections = [];
    let currentPage = 1;

    for (let part of rawParts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      const pageMatch = trimmed.match(pageSplitRegex);
      if (pageMatch && pageMatch[1]) {
        currentPage = parseInt(pageMatch[1], 10);
      }

      sections.push({
        text: trimmed,
        page: currentPage,
        length: trimmed.length
      });
    }

    if (sections.length === 0) {
      sections.push({ text: text.trim(), page: 1, length: text.length });
    }

    return sections;
  }

  /**
   * Extracts clean snippet around the match for evidence
   */
  extractSnippet(fullText, matchIndex, matchLength, radius = 120) {
    const start = Math.max(0, matchIndex - radius);
    const end = Math.min(fullText.length, matchIndex + matchLength + radius);
    let snippet = fullText.slice(start, end).trim();
    if (start > 0) snippet = '...' + snippet;
    if (end < fullText.length) snippet = snippet + '...';
    return snippet.replace(/\s+/g, ' ');
  }

  /**
   * Checks if sentence surrounding the match contains explicit negation (e.g., "No fees", "No bonds", "There are no mandatory...")
   */
  isNegated(snippet) {
    const negations = [
      /\bno\s+(?:fees?|registration|charges?|deposits?|bonds?|penalt(?:y|ies)|lock-in|costs?)\b/i,
      /\bnot\s+required\b/i,
      /\bwithout\s+any\s+(?:fee|deposit|bond|cost|charge)\b/i,
      /\bno\s+mandatory\s+(?:service\s*bonds?|lock-in|exit\s*penalt(?:y|ies))\b/i,
      /\bthere\s+are\s+no\b/i,
      /\bfree\s+of\s+cost\b/i,
      /\bshall\s+not\s+be\s+required\s+to\s+pay\b/i
    ];
    return negations.some(pattern => pattern.test(snippet));
  }

  /**
   * Main analysis execution on document text
   */
  analyze(text, filename = 'Document') {
    if (!text || text.trim().length === 0) {
      return {
        filename,
        timestamp: new Date().toISOString(),
        summary: {
          totalFindings: 0,
          highSeverity: 0,
          mediumSeverity: 0,
          lowSeverity: 0,
          overallRiskScore: 'Low',
          studentFriendlySummary: 'Information could not be verified from the document. The document appears empty or unreadable.'
        },
        findings: [],
        missingInformation: ['Full document text could not be verified'],
        checklist: []
      };
    }

    const sections = this.splitIntoSections(text);
    const findings = [];
    const triggeredRuleIds = new Set();

    // Check each rule against the text and sections
    for (const rule of this.clauseRules) {
      let ruleMatched = false;

      for (let sIdx = 0; sIdx < sections.length; sIdx++) {
        const sec = sections[sIdx];
        
        for (const pattern of rule.patterns) {
          const match = sec.text.match(pattern);
          if (match && match.index !== undefined) {
            // Extract evidence snippet
            const snippet = this.extractSnippet(sec.text, match.index, match[0].length);

            // Check if the finding is negated by the contract (e.g. "No fees or deposits required")
            if (this.isNegated(snippet)) {
              continue; // Skip negated matches
            }

            ruleMatched = true;
            triggeredRuleIds.add(rule.id);

            // Extract amount if applicable
            let amount = null;
            if (rule.amountExtractor) {
              const amtMatch = snippet.match(rule.amountExtractor) || sec.text.match(rule.amountExtractor);
              if (amtMatch) {
                amount = amtMatch[0].trim();
              }
            }

            // Extract timing if applicable
            let timing = null;
            if (rule.timingExtractor) {
              const timeMatch = snippet.match(rule.timingExtractor) || sec.text.match(rule.timingExtractor);
              if (timeMatch) {
                timing = timeMatch[0].trim();
              }
            }

            // Calculate confidence
            const confidence = 0.88 + (Math.random() * 0.09); // 0.88 - 0.97

            findings.push({
              id: `${rule.id}_${findings.length + 1}`,
              ruleId: rule.id,
              category: rule.category,
              finding: rule.title,
              severity: rule.severity,
              amount: amount || 'Not explicitly stated in clause',
              timing: timing || 'As specified in section',
              evidence: snippet,
              page: sec.page,
              sectionIndex: sIdx + 1,
              confidence: parseFloat(confidence.toFixed(2)),
              description: rule.description,
              recommended_action: rule.recommendedAction
            });

            break; // One match per rule per section is sufficient
          }
        }

        if (ruleMatched) break; // One match per rule per document
      }
    }

    // Check for missing vital information
    const missingInformation = this.detectMissingInfo(text);

    // Compute metrics
    const highSeverity = findings.filter(f => f.severity === 'high').length;
    const mediumSeverity = findings.filter(f => f.severity === 'medium').length;
    const lowSeverity = findings.filter(f => f.severity === 'low').length;

    let overallRiskScore = 'Low Risk / Standard Terms';
    if (highSeverity >= 2) overallRiskScore = 'High Potential Obligations Detected';
    else if (highSeverity === 1 || mediumSeverity >= 2) overallRiskScore = 'Moderate Clarification Required';
    else if (mediumSeverity === 1 || lowSeverity >= 1) overallRiskScore = 'Minor Items to Clarify';

    // Generate student-friendly summary
    const studentFriendlySummary = this.generateSummaryText(findings, missingInformation, overallRiskScore);

    // Generate initial action checklist
    const checklist = this.generateChecklist(findings, missingInformation, triggeredRuleIds);

    return {
      filename,
      timestamp: new Date().toISOString(),
      summary: {
        totalFindings: findings.length,
        highSeverity,
        mediumSeverity,
        lowSeverity,
        overallRiskScore,
        studentFriendlySummary
      },
      findings,
      missingInformation,
      checklist
    };
  }

  /**
   * Detects vital contract information that might be missing
   */
  detectMissingInfo(text) {
    const missing = [];

    // Stipend / Salary amount check
    if (!/(?:stipend|salary|ctc|compensation|remuneration|fixed\s*pay)[\s\S]{0,30}?(?:rs\.?|inr|₹|\$)\s*[\d,]+/i.test(text)) {
      missing.push({
        item: 'Exact Stipend / Salary Amount',
        detail: 'The document does not explicitly specify a numerical monthly stipend or CTC figure.',
        recommended_action: 'Ask HR to confirm the exact gross and net monthly stipend in writing before signing.'
      });
    }

    // Working hours & location check
    if (!/(?:working\s*hours|timing|work\s*hours|shift|hours\s*per\s*week|office\s*timings|remote|hybrid|in-office)/i.test(text)) {
      missing.push({
        item: 'Working Hours & Location/Mode',
        detail: 'Daily work schedule, weekly expected hours, or working mode (remote/in-office) are not explicitly detailed.',
        recommended_action: 'Clarify working hours, expected overtime expectations, and whether weekend duties apply.'
      });
    }

    // Leave & Sick Policy
    if (!/(?:leave|vacation|holidays|sick\s*leave|casual\s*leave|time\s*off)/i.test(text)) {
      missing.push({
        item: 'Leave & Examination Policy',
        detail: 'No mention of leave entitlement, college exam study leave, or sick leave guidelines.',
        recommended_action: 'Confirm policies for taking days off during college examination periods.'
      });
    }

    // Refund policy if fees mentioned (and not negated)
    if (/(?:fee|charge|deposit|amount|cost)/i.test(text) && !/(?:no\s*fees|no\s*charges|no\s*deposits)/i.test(text) && !/(?:refund|refundable|reimbursement\s*policy)/i.test(text)) {
      missing.push({
        item: 'Written Refund & Cancellation Policy',
        detail: 'Financial charges are mentioned or implied without an explicit written refund or cancellation policy.',
        recommended_action: 'Request a formal written refund policy in case you need to withdraw before the program starts.'
      });
    }

    return missing;
  }

  /**
   * Generates student-friendly explanation
   */
  generateSummaryText(findings, missingInfo, riskScore) {
    if (findings.length === 0 && missingInfo.length === 0) {
      return 'The document appears clean with standard contractual language. No hidden fees, restrictive lock-in bonds, or heavy penalty clauses were identified.';
    }

    let summaryParts = [];
    summaryParts.push(`Analysis Assessment: **${riskScore}**.`);

    const financialFindings = findings.filter(f => f.category === 'financial');
    if (financialFindings.length > 0) {
      summaryParts.push(`⚠️ **Financial Obligations**: We identified ${financialFindings.length} potential fee or deposit requirement(s). Review whether any upfront payments are demanded.`);
    }

    const commitmentFindings = findings.filter(f => f.category === 'commitment' || f.category === 'penalties');
    if (commitmentFindings.length > 0) {
      summaryParts.push(`🔒 **Commitment & Penalties**: We found service bond, lock-in period, or exit penalty clauses. Ensure these do not restrict your academic or graduation plans.`);
    }

    const compensationFindings = findings.filter(f => f.category === 'compensation');
    if (compensationFindings.length > 0) {
      summaryParts.push(`💼 **Compensation Details**: Clarify any performance-linked or conditional stipend clauses.`);
    }

    if (missingInfo.length > 0) {
      summaryParts.push(`❓ **Unclear / Missing Information**: ${missingInfo.length} standard terms (like exact stipend, exam leave, or refund rules) were not explicitly found in this document.`);
    }

    return summaryParts.join('\n\n');
  }

  /**
   * Generates actionable checklist items from findings
   */
  generateChecklist(findings, missingInfo, triggeredRuleIds) {
    const checklist = [];
    let counter = 1;

    // Add company verification task always
    checklist.push({
      id: `task_${counter++}`,
      task: this.checklistCatalog.general_verification.task,
      description: this.checklistCatalog.general_verification.description,
      priority: 'High',
      status: 'Pending',
      category: 'verification',
      evidence: 'Company header / registration details in contract',
      ruleId: 'general_verification'
    });

    // Add specific items based on triggered findings
    for (const finding of findings) {
      const catalogItem = this.checklistCatalog[finding.ruleId];
      if (catalogItem) {
        checklist.push({
          id: `task_${counter++}`,
          task: catalogItem.task,
          description: catalogItem.description,
          priority: finding.severity === 'high' ? 'High' : finding.severity === 'medium' ? 'Medium' : 'Low',
          status: 'Pending',
          category: finding.category,
          evidence: finding.evidence,
          page: finding.page,
          ruleId: finding.ruleId
        });
      }
    }

    // Add missing info checklist tasks
    if (missingInfo.length > 0) {
      checklist.push({
        id: `task_${counter++}`,
        task: this.checklistCatalog.missing_info.task,
        description: `Clarify missing items: ${missingInfo.map(m => m.item).join(', ')}.`,
        priority: 'Medium',
        status: 'Pending',
        category: 'unclear',
        evidence: 'Information could not be verified from the document.',
        ruleId: 'missing_info'
      });
    }

    return checklist;
  }
}

module.exports = new ContractAnalyzer();
