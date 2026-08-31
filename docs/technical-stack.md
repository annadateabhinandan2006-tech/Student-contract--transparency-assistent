# Technical Stack

| Component | Technology | Purpose | Status |
|-----------|------------|---------|--------|
| **Frontend** | React / Vue (TBD) | User Interface | PLANNED |
| **Backend** | Node.js | API & Application Logic | PLANNED |
| **Data Processing** | Python | Advanced NLP & AI processing | PLANNED |
| **Enterprise Integration**| Java | Potential enterprise/legacy integration | PLANNED |
| **LLM** | OpenAI API / Local | Natural language understanding | PLANNED |
| **Database** | PostgreSQL / MongoDB | Data persistence | PLANNED |
| **Document Processing**| Tesseract / PyMuPDF | OCR and text extraction | RESEARCH |
| **Speech-to-Text** | Whisper / whisper.cpp | Voice recognition | RESEARCH |
| **Text-to-Speech** | Browser TTS / Coqui | Voice generation | RESEARCH |
| **Agentic Framework** | LangChain / Custom | Agent workflow orchestration | RESEARCH |
| **Local Inference** | llama.cpp / Ollama | Offline fallback AI | RESEARCH |
| **Cloud AI** | AWS / GCP / Azure | Online AI compute | PLANNED |
| **Deployment** | Docker / Kubernetes | Application hosting | PLANNED |

## Detailed Breakdown

### Frontend
- **Framework:** React.js or Vue.js
- **Responsiveness:** TailwindCSS or Material UI
- **State Management:** Redux or Vuex for persisting Checklist states.

### Backend & Orchestration
- **API Layer:** Express.js (Node) or FastAPI (Python)
- **Agentic Logic:** LangChain or a custom state machine to ensure boundaries between LLM reasoning and DB execution.

### Offline & Local AI Fallback
- **STT (Speech-to-Text):** `whisper.cpp` allows running OpenAI's Whisper model locally with high performance and low memory footprint.
- **Inference (LLM):** `llama.cpp` or `Ollama` running quantized models (e.g., Llama-3 8B 4-bit) to ensure it runs on student laptops without discrete GPUs.
- **TTS (Text-to-Speech):** Native Browser SpeechSynthesis API to minimize local resource usage, with future potential for local Coqui TTS.

### Database
- **Primary Datastore:** PostgreSQL (relational structure for users, organizations, checklists) or MongoDB (document store for flexible contract JSON outputs).

### Document Pipeline
- **PDF Parsing:** `PyMuPDF` (fitz) or `pdfplumber` for text and layout extraction.
- **OCR:** `Tesseract` for image-based PDFs or scanned physical contracts.
