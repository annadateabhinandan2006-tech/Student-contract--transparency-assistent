/**
 * samples.js
 * Preloaded realistic student contract samples for 1-click testing & demonstration.
 */

const sampleContracts = [
  {
    id: 'sample_edtech_hidden_fee',
    title: '⚠️ EdTech Trainee Internship (Hidden Fee & 2-Yr Bond)',
    category: 'High Obligation Sample',
    badge: 'High Risk Clauses',
    company: 'NextGen Tech Education Pvt Ltd',
    description: 'Contains an upfront ₹25,000 training fee before onboarding, a 2-year service bond with ₹1,00,000 liquidated damages penalty, and a 3-month notice period.',
    text: `NEXTGEN TECH EDUCATION PVT LTD
CIN: U72900DL2021PTC384920
Registered Office: 402, Connaught Place, New Delhi - 110001
Website: https://nextgentech-edu.example.com

--- PAGE 1 ---
INTERNSHIP CUM EMPLOYMENT OFFER LETTER

Date: August 15, 2026
Candidate Name: Rahul Sharma
Position: Graduate Full-Stack Developer Trainee
Location: New Delhi (Hybrid)

Dear Rahul,

With reference to your application and subsequent interview, we are pleased to offer you the position of Graduate Trainee at NextGen Tech Education Pvt Ltd on the terms and conditions outlined below.

1. TENURE AND TRAINING PERIOD
1.1 Your initial training and onboarding period will commence on September 15, 2026, for a duration of 3 months.
1.2 Upon successful completion of training and evaluation, you will be transitioned to the permanent role of Associate Software Engineer.

--- PAGE 2 ---
2. MANDATORY ONBOARDING & TRAINING FEE
2.1 To facilitate specialized cloud lab infrastructure, proprietary curriculum, and individual industry mentorship, the candidate is required to pay a mandatory training fee of Rs. 25,000 (Rupees Twenty-Five Thousand Only) prior to onboarding.
2.2 The aforesaid training fee must be deposited within 7 days of signing this offer letter.
2.3 The training charges are non-refundable under all circumstances, including withdrawal or early disengagement by the candidate prior to program commencement.

3. COMPENSATION AND STIPEND
3.1 During the 3-month training period, you will receive a performance-linked stipend of up to Rs. 8,000 per month, subject to milestone evaluations.
3.2 The company reserves the right to withhold 50% of the stipend if weekly assessment benchmarks are not fulfilled.

--- PAGE 3 ---
4. SERVICE AGREEMENT & MANDATORY COMMITMENT BOND
4.1 In consideration of the extensive proprietary training invested in the candidate, the candidate explicitly agrees to serve the company for a minimum commitment period of 24 months (2 years) from the date of completion of training.
4.2 In case of early resignation, unauthorized absence, or failure to complete the 24-month tenure, the candidate shall be liable to pay liquidated damages of Rs. 1,00,000 (Rupees One Lakh Only) towards reimbursement of training expenses and operational disruption.

5. NOTICE PERIOD & RESIGNATION
5.1 After the completion of the training period, either party may terminate the employment by providing a prior written notice of 3 months (90 days).
5.2 The company reserves the right to modify or alter the terms of employment at its sole discretion without prior notice.

6. ORIGINAL DOCUMENTS SUBMISSION
6.1 For background verification and asset custody, candidate shall submit original marksheet and degree certificates at the time of joining, which will be retained in company custody during the probation tenure.

Please sign and return the duplicate copy of this letter within 5 working days.

For NextGen Tech Education Pvt Ltd,
Authorized Signatory
HR Operations Department`
  },

  {
    id: 'sample_it_deposit_probation',
    title: '⚠️ IT Trainee Agreement (Unpaid Probation & Hardware Deposit)',
    category: 'Medium Obligation Sample',
    badge: 'Moderate Clarification Required',
    company: 'CloudScale Software Solutions LLP',
    description: 'Features a 6-month unpaid probation, ₹15,000 security deposit for company hardware, and 2-month notice period.',
    text: `CLOUDSCALE SOFTWARE SOLUTIONS LLP
ROC Bangalore, Karnataka | CIN: AAX-4829
Website: https://cloudscale-solutions.example.com

--- PAGE 1 ---
APPOINTMENT LETTER: JUNIOR QA & TESTING INTERN

Candidate: Priya Patel
Date: August 20, 2026

Dear Priya,

We are delighted to extend an offer for the position of Junior QA & Testing Intern with CloudScale Software Solutions LLP.

1. PROBATION PERIOD
The first 6 months of your engagement will be an unpaid probation period dedicated to internal project shadowing and QA workflow mastery.

2. HARDWARE SECURITY DEPOSIT
Upon asset handover, the intern shall deposit a refundable security deposit of Rs. 15,000 for company laptop and testing gear. The deposit shall be returned within 60 days following the clearance of all exit handovers.

--- PAGE 2 ---
3. TERMINATION & NOTICE PERIOD
During probation, either party may terminate the contract with a prior written notice period of 60 days.

4. POST-EMPLOYMENT RESTRICTIONS
The candidate agrees to a non-compete clause for 12 months following disengagement, restraining from working with direct testing clients of CloudScale.

Accepted and Agreed:

Candidate Signature: __________________
Date: __________________`
  },

  {
    id: 'sample_clean_standard_offer',
    title: '✅ Standard Tech Internship Offer (Transparent & Fair Terms)',
    category: 'Standard / Safe Sample',
    badge: 'Clean Terms',
    company: 'Acme Tech Labs Inc',
    description: 'Clean standard contract with guaranteed ₹20,000/month stipend, 15-day notice period, no fees, no lock-in bonds, and explicit working hours.',
    text: `ACME TECH LABS INC.
CIN: U74999MH2018PTC308472
Mumbai, Maharashtra | https://acmelabs.example.com

--- PAGE 1 ---
INTERNSHIP OFFER LETTER

Date: August 25, 2026
Candidate Name: Ananya Roy
Position: Frontend Engineering Intern
Mode: Remote / Work-From-Home

Dear Ananya,

We are pleased to offer you an internship position as Frontend Engineering Intern with Acme Tech Labs Inc.

1. ROLE & DURATION
- Duration: 3 Months (September 1, 2026 - November 30, 2026)
- Working Hours: Monday to Friday, 10:00 AM - 6:00 PM IST (40 hours per week)
- Mode: 100% Remote

--- PAGE 2 ---
2. STIPEND & BENEFITS
- Monthly Stipend: Fixed Rs. 20,000 per month, disbursed on the 1st of every calendar month.
- No fees, registration charges, or deposits are required from candidates at any stage.
- Equipment allowance of Rs. 5,000 (one-time) provided for remote workspace setup.

3. LEAVE & EXAMINATIONS
- Intern is entitled to 2 days of paid casual leave per month.
- Up to 5 days of unpaid examination study leave will be granted upon prior written intimation for college semester exams.

4. SEPARATION / NOTICE
- Either party may conclude the internship by providing a 15-day prior written notice or mutual agreement.
- There are no mandatory service bonds, lock-in periods, or exit penalties.

We look forward to working with you!

Sincerely,
Pooja Mehta
Head of Talent Acquisition
Acme Tech Labs Inc.`
  }
];

module.exports = {
  sampleContracts,
  getSampleById: (id) => sampleContracts.find(s => s.id === id) || sampleContracts[0]
};
