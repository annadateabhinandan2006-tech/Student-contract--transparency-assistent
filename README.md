# AI Student Contract Transparency & Obligation Assistant (MVP Prototype)

🛡️ **Protecting Students from Hidden Obligations**

**Priority:** Primary: cloud LLM for accuracy, offline mode: reduced-capability fallback when no network

---

## Project Overview
The **AI Student Contract Transparency & Action Assistant** empowers students to detect, understand, and act upon potentially important or unclear financial and contractual obligations before accepting an internship, training opportunity, job offer, or similar agreement.

> [!IMPORTANT]
> **Zero-Scam-Labeling Policy**: The system is NOT a "scam detector". Every finding is presented purely as:
> `Potential Issue + Evidence + Explanation + Recommended Student Action`
> The system never labels a company or contract as "fraud" or "scam" solely from AI output.

---

## Core User Flow
```
Student
  ↓
Upload Contract / Select Realistic Sample
  ↓
Extract Text (PDF / TXT / DOCX)
  ↓
AI Contract Analysis (Obligation Rules & LLM Engine)
  ↓
Identify Important Clauses (Financial, Bonds, Penalties, Notice, Compensation)
  ↓
Evidence + Page/Section Mapping
  ↓
Student-Friendly Risk Summary
  ↓
Action Checklist (Pending / In Progress / Completed / Blocked)
  ↓
Document & Checklist-Aware Chatbot
  ↓
Voice Assistant (Web Speech + Offline Fallback)
  ↓
Save / Share Link & Export Report
```

---

## Features

1. **Structured Contract Analysis**:
   - Training, registration, and certification fees (amounts & payment timing)
   - Mandatory service bonds & lock-in periods
   - Liquidated damages & early exit penalties
   - Security deposits & original certificate withholding
   - Performance-conditional stipends & unpaid probations
   - Notice period requirements
   - Missing or unclear terms detection (stipend amount, exam leave, refund policy)

2. **Action-Oriented Agentic AI**:
   - `Goal → Understand → Plan → Choose Tool → Execute → Verify → Update Checklist → Next Action`
   - Tools: `analyze_document`, `detect_payment_terms`, `detect_penalties`, `detect_bond_terms`, `detect_notice_period`, `detect_missing_information`, `create_checklist`, `update_checklist`, `get_next_pending_task`, `generate_student_questions`, `draft_inquiry_email`.

3. **Interactive Action Checklist**:
   - Auto-generated tasks mapped to detected clauses
   - Progress bar with percentage and task counters
   - Status tracking (`Pending`, `In Progress`, `Completed`, `Blocked`)
   - Add custom tasks
   - Direct link to draft emails to HR

4. **Context-Aware Chatbot**:
   - Knows the open document, analysis findings, and checklist state
   - Instant quick-prompt chips (*"Is there any payment?", "What is the bond duration?", "What should I do?"*)

5. **Conversational Voice Assistant**:
   - Speech-to-Text via Web Speech API with microphone visualizer
   - SpeechSynthesis text-to-speech spoken feedback
   - Local fallback query handling when offline or disconnected

6. **Save & Team Sharing**:
   - Instant shareable link generator (`/share/:id`)
   - Persistent checklist state
   - 1-click Markdown obligation report export

7. **1-Click Realistic Evaluation Samples**:
   - **Sample 1**: EdTech Trainee Internship (Hidden ₹25,000 fee, 24-month bond, 3-month notice)
   - **Sample 2**: IT Trainee Agreement (6-month unpaid probation, ₹15,000 hardware deposit)
   - **Sample 3**: Standard Tech Internship Offer (Clean terms, transparent stipend, 15-day notice)

---

## Running the Application

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Automated Tests
```bash
npm test
```

### 3. Start the Server
```bash
npm start
```
Open **`http://localhost:3000`** in your browser.

---

## Architecture & Code Structure
```
/
├── server/
│   ├── index.js                  # Main Express Server & Static Host
│   ├── routes/
│   │   └── api.js                # API endpoints (analyze, agent, chat, checklist, health)
│   ├── agent/
│   │   ├── contractAnalyzer.js   # Clause detection & evidence extractor
│   │   ├── agentEngine.js        # Action-oriented agent workflow & tools
│   │   └── companyVerifier.js    # Primary entity verification & disclaimers
│   └── data/
│       └── samples.js            # Preloaded realistic student contract samples
├── public/
│   ├── index.html                # Responsive single-page application UI
│   ├── styles.css                # Accessible modern design & badges
│   └── app.js                    # Client controller, Web Speech API, Voice & Chat
├── tests/
│   ├── analyzer.test.js          # Unit tests (clause rules, no-scam policy, checklist)
│   └── integration.test.js       # E2E API tests (health, analysis, agent, share)
└── package.json
```

---

## Known Disclaimers & Nuances
- AI contract analysis is designed for student education and awareness, not legal advice.
- Official company registration verifies legal existence only, not commercial contract fairness.
