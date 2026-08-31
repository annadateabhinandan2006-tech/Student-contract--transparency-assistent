# Development Roadmap

## Phase 1 — Existing System Freeze
- **Goal:** Set up foundational repository, project structure, and technical documentation.
- **Tasks:** Document all architecture, establish tech stack, create PDF report.
- **Expected Output:** Complete documentation, empty repository structure.
- **Current Status:** In Progress (Documentation Phase)

## Phase 2 — Voice Assistant MVP
- **Goal:** Build the basic online Chatbot and Voice Assistant.
- **Tasks:** Connect cloud STT, basic LLM response, cloud TTS.
- **Expected Output:** A working online voice interface.
- **Current Status:** PLANNED

## Phase 3 — Offline Voice Layer
- **Goal:** Implement the offline fallback for voice capabilities.
- **Tasks:** Integrate `whisper.cpp`, `llama.cpp` (or local Quantized model), and browser/local TTS.
- **Expected Output:** Voice assistant switches to local mode when offline.
- **Current Status:** PLANNED

## Phase 4 — Agentic AI Layer
- **Goal:** Upgrade the chatbot to an Agentic AI workflow.
- **Tasks:** Implement tools (`analyze_document()`, `create_checklist()`, etc.) and ensure LLM boundaries.
- **Expected Output:** The system can guide users through a structured checklist based on their actions.
- **Current Status:** PLANNED

## Phase 5 — Document Context
- **Goal:** Connect document upload and OCR with the AI analysis.
- **Tasks:** Implement text extraction, AI risk/obligation detection, and evidence mapping.
- **Expected Output:** Uploading a PDF returns a structured contract analysis JSON.
- **Current Status:** PLANNED

## Phase 6 — Error & Recovery
- **Goal:** Ensure smooth transitions during network or server failures.
- **Tasks:** Implement `GET /api/health`, failure detection, and automatic mode switching.
- **Expected Output:** System gracefully degrades functionality during outages.
- **Current Status:** PLANNED

## Phase 7 — Team Collaboration
- **Goal:** Allow users to save and share their checklists and analysis.
- **Tasks:** Database integration, session/Checklist ID generation, and read-only share views.
- **Expected Output:** Shareable URLs for peer/mentor review.
- **Current Status:** PLANNED

## Phase 8 — Product Polish
- **Goal:** Refine the UI/UX for students.
- **Tasks:** Clean up interfaces, improve explanations, make the tool user-friendly.
- **Expected Output:** Polished, responsive web application.
- **Current Status:** PLANNED

## Phase 9 — Testing Matrix
- **Goal:** Ensure system stability across all failure modes.
- **Tasks:** Run through the comprehensive testing matrix (offline, server down, mic denied).
- **Expected Output:** High test coverage and confidence in reliability.
- **Current Status:** PLANNED

## Phase 10 — Deployment & Demo
- **Goal:** Host the application for public access and prepare the hackathon demo.
- **Tasks:** Dockerize, deploy to cloud (AWS/GCP), record demo flow.
- **Expected Output:** Live application accessible via URL.
- **Current Status:** PLANNED
