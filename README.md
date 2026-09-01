# Student Contract Transparency Assistant

**Problem Statement:** Protecting Students from Hidden Obligations  
**Tagline:** Understand Every Clause. Protect Your Future.

---

## 🎯 Problem
Students and fresh graduates frequently sign internship, training, employment, and non-disclosure agreements without realizing they contain:
- Upfront registration or "training" fees.
- Onerous 1-to-2 year service bonds and lock-in periods.
- Exorbitant financial exit penalties or stipend clawbacks.
- Withholding of original academic certificates.
- Ambiguous working hours, unpaid probation, or missing exam leave policies.

---

## 💡 Solution
The **Student Contract Transparency Assistant** is a legal-tech AI platform designed to analyze student contracts before they commit. It provides:
1. **Instant Obligation & Risk Analysis**: Identifies financial charges, service bonds, notice periods, and early exit penalties.
2. **Plain English Clause Translations**: Translates dense legal text into clear, student-friendly explanations side-by-side with the original clause.
3. **Actionable Checklist**: Automatically generates a prioritized step-by-step action plan to verify terms and communicate safely with HR.
4. **Corporate Entity Verification**: Cross-references company names and CINs against simulated Ministry of Corporate Affairs (MCA) and Registrar of Companies (ROC) databases.
5. **Contract-Aware AI Chatbot & Voice Assistant**: Answers document-specific questions and drafts clarification emails to recruiters.
6. **Secondary Mode — Government Process Agent**: Action-oriented assistant for discovering official government portals, mapping forms, and tracking application reference numbers.

---

## ✨ Key Features
- 📄 **Multi-Format Document Upload**: Supports PDF, DOCX, TXT, and direct text paste.
- ⚡ **1-Click Sample Evaluation**: Try pre-loaded offer letters and training agreements.
- 🔍 **Severity-Based Filtering**: View High Risk, Moderate Review, and Clear/Informational findings.
- ✅ **Custom Action Checklist**: Add custom tasks, track completion percentage, and manage progress.
- 📥 **Export Report**: Download full analysis summaries as clean Markdown files (`.md`).
- 🔗 **Shareable Link State**: Save analysis state and generate instant share links.
- 🎙️ **Voice Guidance**: Conversational voice queries using SpeechRecognition and SpeechSynthesis.

---

## 🏗️ Architecture & Data Flow

```
[ User Browser / Web UI ]
       │
       ▼ (HTTP / REST API)
[ Node.js + Express Server ] ── (Port 3000)
       │
       ├─► [ Contract Analyzer Engine ] ──► Rule-based NLP & Evidence Extraction
       ├─► [ Corporate Verifier ] ────────► MCA / ROC Public Record Lookup
       ├─► [ Action Agent Engine ] ───────► Contract-Aware Chatbot & Tool Runner
       └─► [ Gov Agent Engine ] ──────────► Portal Discovery & Form Assistant
```

---

## 🛠️ Technology Stack
- **Frontend**: Standard Vanilla HTML5, CSS3 (Modern SaaS Tokens), JavaScript (ES6+), Web Speech API.
- **Backend Framework**: Node.js, Express.js.
- **Document Processing**: `pdf-parse` (PDF extraction), Multer (memory storage file uploads).
- **Environment Management**: `dotenv`.
- **Testing**: Built-in Node test suite (`tests/analyzer.test.js`, `tests/integration.test.js`, `tests/govAgent.test.js`).

---

## 💾 Database & Persistence
- **State Store**: In-memory Map datastore (`savedChecklists`) for session records, checklist items, and reference numbers.
- **Production Persistence**: Can be backed by MongoDB, PostgreSQL, or Redis without altering the REST API interface.

---

## 🤖 AI / LLM Integration
- **Engine**: Rule-based natural language processing engine (`contractAnalyzer.js`) with pattern matching, amount extraction, timing extraction, and negation filtering.
- **Zero Scam-Labeling Guarantee**: Strict objective evidence rating policy that avoids calling agreements "scams" or "frauds".

---

## 🚀 Local Setup & Installation

### Prerequisites
- Node.js (v16.0.0 or higher)
- npm (v7.0.0 or higher)

### Setup Steps
```bash
# 1. Clone the repository
git clone https://github.com/annadateabhinandan2006-tech/Student-contract--transparency-assistent.git
cd Student-contract--transparency-assistent

# 2. Install dependencies
npm install

# 3. Create environment configuration
cp .env.example .env

# 4. Start development server
npm run dev
```

The application will be accessible at `http://localhost:3000`.

---

## ⚙️ Environment Variables (`.env`)
```env
PORT=3000
NODE_ENV=production
```

---

## 🧪 Testing
Run the comprehensive automated test suite:
```bash
npm test
```

Test coverage includes:
- Contract obligation detection & severity scoring.
- PDF parsing and document extraction.
- Chatbot context responsiveness.
- Corporate entity verification.
- Save, Share, and Export report APIs.
- Government Process Agent workflow & reference number generation.

---

## 📦 Production Build & Deployment

### Run Production Server
```bash
npm start
```

### Deployment Platforms
The project is containerization-ready and can be deployed directly to:
- **Vercel / Render / Railway / Heroku**: Set `PORT` environment variable and run `npm start`.
- **AWS Elastic Beanstalk / GCP App Engine**: Node.js runtime deployment.

---

## ⚠️ Known Limitations
- Automatic company verification relies on MCA public record simulation for local offline performance; live API keys are required for real-time MCA gateway queries.
- Voice recognition relies on Web Speech API (`SpeechRecognition`), which requires browser permission and HTTPS in production.

---

## 🔗 Repository & Live Demo
- **GitHub Repository**: [Student-contract--transparency-assistent](https://github.com/annadateabhinandan2006-tech/Student-contract--transparency-assistent)
- **Git Branch**: `release/hackathon-final`
