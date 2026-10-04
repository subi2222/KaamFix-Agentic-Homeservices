<div align="center">

# 🛠️ KaamFix NEXA

### Agentic AI-Powered Home Services, Dispatch & Trust Platform for Pakistan

**From “my water motor isn’t working” to the right professional at your doorstep.**

Describe your problem, receive AI-assisted triage, compare bids from nearby workers, and manage the job from booking to completion. Hazardous requests are routed for human review.

**Developed by Abdul Subhan**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Site-brightgreen?style=for-the-badge)](https://kaamfix.vercel.app/)
[![Developer](https://img.shields.io/badge/Developer-Abdul%20Subhan-2563EB?style=for-the-badge)](#developer)

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![LangGraph](https://img.shields.io/badge/LangGraph-agents-1C3C3C)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-FFCA28?logo=firebase&logoColor=black)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)

</div>

---

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Key Features](#key-features)
- [The NEXA Agent Layer](#the-nexa-agent-layer)
- [Architecture](#architecture)
- [Booking Lifecycle](#booking-lifecycle)
- [Tech Stack](#tech-stack)
- [Screenshots](#screenshots)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Approved Documents (RAG)](#approved-documents-rag)
- [API Overview](#api-overview)
- [Security & Human Oversight](#security--human-oversight)
- [Deployment](#deployment)
- [Known Limitations & Roadmap](#known-limitations--roadmap)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Developer](#developer)
- [License](#license)

---

## Overview

**KaamFix** connects households and small businesses across Pakistan with skilled tradespeople — electricians, plumbers, AC technicians, carpenters, painters, masons, appliance-repair experts and more.

Finding reliable help can mean calling multiple workers, comparing unclear prices, and explaining a technical fault without knowing its cause. Workers also need relevant information before accepting a job and practical support while completing it.

KaamFix NEXA brings these steps into one workflow: understand the issue, check for risk, find suitable workers, agree on a price, and track the service through completion.

The marketplace combines customer, worker and admin portals with a coordinated AI workflow:

| Problem | How KaamFix handles it |
|---|---|
| Customer doesn't know what's wrong or which trade to hire | **AI triage** turns text + photos into a structured, confirmed issue |
| Dangerous jobs dispatched like ordinary calls | **Hazard gate** pauses the workflow until an **admin** reviews it |
| Opaque pricing | **Live bidding** in PKR — workers submit price + ETA, customer chooses |
| Unverified workers | Admin moderation, verified flag, ratings & reviews |
| No technical support on site | **Technical Assistant**: RAG over *approved* manuals with page citations |
| Payment disputes | Proof-based manual PKR payments, receipt confirmation, dual completion |

---

## How It Works

1. **Describe the problem.** Choose a service or explain the issue in your own words; attach photos when helpful.
2. **Clarify the request.** AI structures the issue, asks follow-up questions and flags potential hazards for review.
3. **Compare nearby professionals.** Explore the map and review worker profiles, bids, prices and arrival estimates.
4. **Book and coordinate.** Accept a bid and use the Booking Room for messages, updates and job progress.
5. **Confirm and review.** Record payment, confirm receipt and completion, and leave a rating.

## Key Features

### 👤 Customer
- Email/password and Google sign-in (Firebase Auth)
- **AI triage** — describe the problem and attach up to 3 photos
- **AI Service Advisor** — quick one-shot cost / urgency / safety guidance
- **NEXA Radar** — map-based booking: set destination, category, radius and budget
- **Live bids** from nearby online workers, with auto-refresh
- **Booking Room** — status timeline, text + image chat, payment checkout
- Record **Easypaisa, JazzCash, bank transfer or cash** payments, with proof upload and manual receipt confirmation
- Ratings and reviews, notifications, request history

### 🧰 Worker
- Onboarding with trade, city, experience, PKR rate and bio; profile photo upload
- **Available / Busy / Offline** toggle and live location sharing
- Lead feed with one-tap bidding (price, ETA, message)
- Job transitions: *start journey → arrived → start work → finish work*
- **Technical Assistant** (verified workers only): cited, document-grounded diagnostic checks
- Payment receipt confirmation and earnings view

### 🛡️ Admin
- Worker roster: approve / reject / suspend / verify
- **Escalation Queue** — review hazardous jobs and decide: *approve · require specialist · request information · reject · resolve*
- Global view of requests and payments, payment-proof access
- Platform analytics (Recharts) and notifications

---

## The NEXA Agent Layer

| Agent | What it does | How it stays safe |
|---|---|---|
| **Triage & Vision Agent** | Converts text + photos into a validated `TriageOutput` (category, urgency, symptoms, visible observations, possible causes, ≤3 clarification questions, hazard flags) | Separates *customer-reported symptoms* from *strictly visible observations*; causes are hypotheses only; never claims a photo proves safety; never gives hazardous repair steps |
| **NEXA Dispatch Agent** | Finds approved, online workers in the right category within a radius and ranks them | Deterministic and explainable: `matchScore = max(0, 100 − 3·km) + min(3·rating, 15)` using haversine distance |
| **Technical Assistant** | Gives the assigned worker diagnostic checks, tools/parts, safety warnings and stop conditions | Uses **only approved documents**; every source carries file, page, section and score; escalates when the worker isn't verified or evidence is weak |
| **Admin Escalation** | Holds hazardous workflows for human review and resumes them on decision | Records reason, reviewer and timestamp; critical hazards can never skip review |

**Orchestration:** the triage workflow is a [LangGraph](https://github.com/langchain-ai/langgraph) `StateGraph` with three `interrupt()` points (customer clarification, admin review, customer confirmation). State is checkpointed in SQLite, so workflows survive restarts, and retrying a confirmed workflow can't create a second booking. Firestore `requests` stays the single source of truth for bookings.

**Fallback paths:** Groq → Gemini → rule-based triage; FAISS → built-in safety knowledge base. These paths reduce reliance on a single AI provider. The safety fallback does not replace equipment-specific documentation.

**What makes the workflow agentic?** It maintains state across steps, pauses for customer or admin input, uses retrieval and dispatch logic, and resumes toward a confirmed booking. Worker ranking itself uses a deterministic scoring formula.

```mermaid
stateDiagram-v2
    [*] --> triage
    triage --> clarify_issue: questions pending
    clarify_issue --> triage: customer answers
    triage --> safety: no open questions
    safety --> admin_review: critical hazard
    safety --> confirm_customer: no hazard
    admin_review --> confirm_customer: approve / specialist / resolve
    admin_review --> [*]: reject / request info
    confirm_customer --> ready_for_booking: confirmed
    confirm_customer --> cancelled: declined
    ready_for_booking --> [*]
    cancelled --> [*]
```

---

## Architecture

```mermaid
flowchart TB
    subgraph Client["React 19 + Vite + TypeScript"]
        C1[Customer portal]
        C2[Worker portal]
        C3[Admin console]
    end

    Client -->|"HTTPS / REST + Firebase ID token"| API

    subgraph Backend["FastAPI"]
        API[Auth & RBAC · Pydantic validation · Booking state machine]
        API --> A1[Triage & Vision Agent]
        API --> A2[NEXA Dispatch Agent]
        API --> A3[Technical Assistant]
        API --> A4[Admin Escalation]
        A1 & A4 --- LG[LangGraph + SQLite checkpoints]
    end

    A1 --> LLM[(Groq / Gemini)]
    A3 --> FAISS[(FAISS + approved docs)]
    A3 --> LLM
    API --> FS[(Cloud Firestore)]
    Client --> FA[Firebase Auth]
    Client --> SB["Supabase Storage: profile photos"]
```

The Docker deployment uses a single FastAPI service to serve both `/api/*` and the built React app from the same origin.

---

## Booking Lifecycle

| Stage | What happens |
|---|---|
| `pending` | Request is broadcast and eligible workers submit bids. |
| `accepted` | Customer accepts a bid and the Booking Room opens. |
| `en_route` | Worker starts the journey. |
| `arrived` | Worker confirms arrival. |
| `in_progress` | Work begins. |
| `work_finished` | Worker marks the work finished; payment becomes available. |
| Payment confirmation | Customer records payment and worker confirms receipt. |
| `completed` | Both parties confirm completion; customer can leave a review. |

Side states: `rejected`, `cancelled`, `disputed`. Illegal transitions return **HTTP 409**. Payment unlocks only at `work_finished`. Accepting a bid marks the worker busy and rejects competing bids.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 6, Tailwind CSS v4, Motion, react-router-dom 7, Recharts, Leaflet / react-leaflet |
| **Backend** | FastAPI, Uvicorn, Pydantic v2, pydantic-settings, Firebase Admin |
| **Agents** | LangGraph (StateGraph, `interrupt`, `Command`), SQLite checkpointer |
| **LLMs** | Groq (structured reasoning), Google Gemini (vision, embeddings, fallback) |
| **Retrieval** | LangChain, Gemini embeddings (`gemini-embedding-001`), FAISS, PyPDF |
| **Data & Auth** | Cloud Firestore, Firebase Authentication, Supabase Storage |
| **Deployment** | Docker (Node 22 build → Python 3.12 runtime), Render blueprint; Vercel config included |

---

## Screenshots

<table>
  <tr>
    <td align="center" width="50%"><b>🏠 Landing Page</b><br><img src="./screenshots/Landing_Page.jpg" alt="Landing Page" width="100%"></td>
    <td align="center" width="50%"><b>🔐 Login Modal</b><br><img src="./screenshots/Login_Modal.jpg" alt="Login Modal" width="100%"></td>
  </tr>
  <tr>
    <td align="center"><b>👤 Customer Dashboard</b><br><img src="./screenshots/Customer_Dashboard.jpg" alt="Customer Dashboard" width="100%"></td>
    <td align="center"><b>🧰 Worker Dashboard</b><br><img src="./screenshots/Worker_Dashboard.jpg" alt="Worker Dashboard" width="100%"></td>
  </tr>
  <tr>
    <td align="center"><b>🛡️ Admin Dashboard</b><br><img src="./screenshots/Admin_Dashboard.jpg" alt="Admin Dashboard" width="100%"></td>
    <td align="center"><b>🧠 AI Service Advisor</b><br><img src="./screenshots/AI_Service_Advisor.jpg" alt="AI Service Advisor" width="100%"></td>
  </tr>
</table>

---

## Project Structure

```text
kaamfix/
├── app.py                      # Unified entrypoint: FastAPI API + built SPA
├── backend/
│   ├── app/
│   │   ├── main.py             # REST routes (marketplace, booking room, payments, agents)
│   │   ├── agent_service.py    # LangGraph triage workflow + Technical Assistant
│   │   ├── nexa_rag.py         # FAISS retrieval + built-in safety knowledge fallback
│   │   ├── auth.py             # Firebase token verification + role guards
│   │   ├── models.py           # Pydantic request models
│   │   ├── config.py           # Settings (env-driven)
│   │   └── firebase.py         # Firebase Admin init
│   ├── scripts/
│   │   ├── ingest_docs.py      # Build the approved-document FAISS index
│   │   └── start_production.py # Seed data + start the server
│   └── requirements.txt
├── src/
│   ├── components/             # Customer, Worker, Admin UIs, NexaRadar, BookingRoom,
│   │                           # TechnicalAssistant, EscalationQueue, PaymentCheckout …
│   ├── lib/                    # dbService, firebase, supabase, authenticatedFetch
│   ├── App.tsx                 # Routing (/app, /pro, /admin)
│   └── types.ts
├── data/
│   ├── approved-docs/          # Administrator-approved manuals (PDF / TXT / MD)
│   └── faiss/                  # Generated vector index + manifest
├── api/                        # Vercel serverless entrypoints (alternative deploy)
├── screenshots/
├── Dockerfile
├── render.yaml                 # Render blueprint (persistent disk at /app/data)
├── firestore.rules             # Firestore security rules (default deny)
├── .env.example
└── DEPLOYMENT.md
```

---

## Getting Started

### Prerequisites

- **Node.js 22+** and npm
- **Python 3.12+**
- A **Firebase** project (Authentication + Firestore) and a service-account JSON from *Project settings → Service accounts*
- API keys for **Google Gemini** and, optionally, **Groq**
- *(Optional)* A **Supabase** project for profile-photo storage

### 1. Clone

```bash
git clone https://github.com/AhmadIshaq-code/kaamfix.git
cd kaamfix
```

### 2. Configure environment

```bash
cp .env.example .env
cp backend/.env.example backend/.env  # if supplied in your checkout
```

Fill in the values — see [Environment Variables](#environment-variables). **Never commit these files or your Firebase service-account JSON.**

### 3. Install dependencies

```bash
npm install
python -m venv .venv
source .venv/bin/activate          # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
```

### 4. Run in development

Two terminals — Vite proxies `/api` to the backend on port 8000:

```bash
# Terminal 1 — backend
python app.py

# Terminal 2 — frontend (hot reload)
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Interactive API docs: `http://127.0.0.1:8000/docs`.

### 5. Run the production build locally

```bash
npm run lint
npm run build
python app.py        # serves API + built SPA at http://localhost:8000
```

### 6. Create an admin

Sign up normally, then set that user's `role` field to `admin` in the Firestore `users` collection. Workers appear in matches and can bid only after an admin sets their status to `approved`.

---

## Environment Variables

**Backend — secrets, server-side only (never use a `VITE_` prefix):**

| Variable | Description |
|---|---|
| `FIREBASE_PROJECT_ID` | Firebase project ID (must match the frontend) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Full service-account JSON as one value (hosted) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to the service-account file (local alternative) |
| `GEMINI_API_KEY` | Gemini key for vision, embeddings and fallback text |
| `GEMINI_MODEL` | Gemini model name |
| `GEMINI_EMBEDDING_MODEL` | Embedding model (`models/gemini-embedding-001`) |
| `GROQ_API_KEY` | Groq key (preferred for structured reasoning) |
| `GROQ_MODEL` | Groq model (default `openai/gpt-oss-20b`) |
| `FRONTEND_ORIGINS` | Comma-separated exact origins for CORS |
| `KAAMFIX_DATA_DIR` | Persistent data directory (e.g. `/app/data`) |
| `ENVIRONMENT` | `development` or `production` |

**Frontend — public build configuration:**

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=

# Optional — profile photo uploads
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

> Variables prefixed `VITE_` are embedded in the browser bundle. Firebase web configuration and the Supabase anon key are public client configuration; access must be controlled through authentication and database/storage rules. Keep Gemini/Groq keys, Supabase service-role keys and Firebase Admin credentials server-side only.

---

## Approved Documents (RAG)

Equipment-specific guidance should be grounded in administrator-approved documents. No manuals are bundled — add your own. A built-in safety knowledge base provides fallback guidance when document retrieval is unavailable.

1. Put `.pdf`, `.txt` or `.md` files in `data/approved-docs/`.
2. *(Optional)* Add a sidecar `<filename>.<ext>.json` for citation metadata:

   ```json
   {
     "title": "Approved AC Service Manual",
     "equipment": "Split air conditioner",
     "model": "MODEL-123",
     "version": "2026.1",
     "section": "Electrical troubleshooting"
   }
   ```

3. Build the index:

   ```bash
   python -m backend.scripts.ingest_docs data/approved-docs
   ```

Chunks are 900 characters with 120 overlap; each source gets a SHA-256-derived id; rebuilding replaces the index so duplicates can't accumulate. Only add documents you have the right to use.

---

## API Overview

All protected routes expect `Authorization: Bearer <Firebase ID token>`. Full interactive docs at `/docs`.

| Area | Endpoints |
|---|---|
| **System** | `GET /api/health` · `GET /api/agents/status` |
| **Triage agent** | `POST /api/agents/triage` · `POST /api/agents/workflows/{id}/clarify` · `POST /api/agents/workflows/{id}/confirm` · `GET /api/agents/workflows/{id}` |
| **Admin escalation** | `GET /api/admin/escalations` · `POST /api/admin/escalations/{id}/decision` |
| **Dispatch** | `POST /api/agent/dispatch` · `GET /api/radar` · `PATCH /api/location` |
| **Requests & bids** | `GET/POST /api/requests` · `PATCH /api/requests/{id}/status` · `GET/POST /api/requests/{id}/bids` · `POST /api/requests/{id}/bids/{workerId}/accept` |
| **Booking room** | `GET /api/requests/{id}/room` · `POST /api/requests/{id}/transition` · `GET/POST /api/requests/{id}/messages` · `POST /api/requests/{id}/confirm-completion` |
| **Technical assistant** | `POST /api/requests/{id}/technical-assistant` · `GET /api/requests/{id}/technical-sources/{sourceId}` |
| **Payments** | `GET/POST /api/payments` · `POST /api/payments/{id}/confirm-receipt` · `GET /api/payments/{id}/proof` |
| **Workers & reviews** | `GET /api/workers` · `PATCH /api/workers/me` · `PATCH /api/workers/{id}/moderation` · `GET /api/workers/{id}/reviews` · `POST /api/reviews` |
| **Users & notifications** | `GET/PATCH /api/users/me` · `GET /api/users` · `GET /api/notifications` · `PATCH /api/notifications/{id}/read` |
| **Legacy advisor** | `POST /api/advisor` |

---

## Security & Human Oversight

- **Firebase ID-token verification** on every protected route; expired/revoked tokens → `401`; JWT-shaped strings are redacted from logs
- **Role-based access control** (`customer` / `worker` / `admin`) enforced server-side; bookings visible only to their customer, assigned worker and admins
- **Human oversight** — critical hazards pause workflows until an admin decides
- **Strict validation** — Pydantic limits on every payload; image whitelist (JPEG/PNG/WebP) and 5 MB cap
- **File safety** — server-generated filenames and path-traversal guards for payment proofs and chat images
- **Secret isolation** — API keys and Firebase Admin credentials are server-side only
- **Firestore rules** — default-deny with per-entity validation; alignment with extended booking states remains on the roadmap
- **CORS** — exact origin allow-list; limited methods and headers; no wildcard with credentials

> ⚠️ Never commit `.env`, `backend/.env`, a Firebase Admin JSON, logs, `data/agent-checkpoints.sqlite*` or private uploads. If a key has ever been committed or shared, rotate it.

---

## Deployment

KaamFix ships as **one Docker web service**: FastAPI serves `/api/*` and the built React app, with a persistent disk at `/app/data` for checkpoints, FAISS index and uploads.

### Render Blueprint

1. **New → Blueprint**, connect this repository — Render reads `render.yaml` and builds the `Dockerfile`.
2. Fill every variable marked `sync: false` (Firebase, Gemini, Groq, `VITE_*`).
3. Set `FRONTEND_ORIGINS` to your final origin, without a trailing slash.
4. Keep the persistent disk mounted at `/app/data`.
5. Add the deployed domain to **Firebase Authentication → Settings → Authorized domains**.

### Post-deployment checks

- `/api/health` returns `status: ok`
- Customer login, text triage and photo triage work
- A `401` triggers exactly one Firebase token refresh and retry
- Technical Assistant is restricted to the assigned job
- Admin decisions resume paused workflows
- A restart preserves checkpoints and uploads
- Logs contain no tokens, API keys or private keys

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the full guide. A `vercel.json` and `api/` entrypoints are included for alternative Vercel-based setups. Stateful checkpoints and local uploads require a persistence strategy when adapting this architecture to serverless hosting.

---

## Known Limitations & Roadmap

**Current MVP limitations**

- No automated test suite yet
- Payments are manual (proof screenshot + worker confirmation) — no gateway, escrow or refunds
- Payment proofs and chat images are stored on local disk
- SQLite checkpoints and local FAISS tie the service to a single instance
- The legacy `/api/advisor` endpoint is unauthenticated
- Firestore security rules predate the extended booking lifecycle (`en_route`, `arrived`, `work_finished`)

**Roadmap**

- [ ] pytest suite for hazard routing, dispatch maths, state machine and RAG grounding + CI
- [ ] Payment-gateway integration with escrow and refunds
- [ ] Private object storage with signed URLs for proofs and chat images
- [ ] Postgres checkpointer and managed vector store for horizontal scaling
- [ ] Authentication and rate limiting for the advisor endpoint
- [ ] Align Firestore rules with the full lifecycle and add rule tests
- [ ] Worker KYC: document verification and trade certificates
- [ ] Urdu-language triage and UI
- [ ] Agent evaluation harness and tool servers (MCP)

---

## Documentation

- **Product Requirements Document** — planned location: `docs/KaamFix_NEXA_PRD.pdf`; add the PDF before linking it.
- 🚢 [`DEPLOYMENT.md`](./DEPLOYMENT.md) — deployment guide
- ⚙️ [`backend/README.md`](./backend/README.md) — backend & agent setup

---

## Contributing

Contributions are welcome.

1. Fork the repository and create a branch: `git checkout -b feature/your-feature`
2. Make your changes; run `npm run lint` and `npm run build`
3. Commit with a clear message and open a pull request

Please do not include secrets, service-account files or unlicensed documents in a PR.

---

## Developer

**Abdul Subhan**  
Developer of **KaamFix NEXA — Agentic AI-Powered Home Services, Dispatch & Trust Platform for Pakistan**.

[LinkedIn](https://www.linkedin.com/in/abdul-subhan-developer)

---

## License

This draft proposes the **MIT License**. Add a corresponding `LICENSE` file to the repository before presenting the project as MIT-licensed. Any existing license and required third-party notices must be preserved.

<div align="center">

**Developed by Abdul Subhan · Built for Pakistan’s homes and skilled workforce.**

</div>
