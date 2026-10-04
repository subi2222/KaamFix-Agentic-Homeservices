# 🛠️ KaamFix – Pakistan's Trusted Home Services Marketplace

<p align="center">
  <strong>A full-stack, real-time localized service marketplace connecting homeowners and businesses with verified trade specialists across Pakistan.</strong>
</p>

<p align="center">
  <a href="https://kaamfix.vercel.app/"><img src="https://img.shields.io/badge/Live%20Demo-Visit%20Site-brightgreen?style=for-the-badge" alt="Live Demo"></a>
  <a href="https://github.com/AhmadIshaq-code/kaamfix"><img src="https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github" alt="GitHub Repo"></a>
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="MIT License">
</p>

---

## 🌐 Live Demo & Repository

| Resource | Link |
|---|---|
| 🚀 **Live Application** | [https://kaamfix.vercel.app/](https://kaamfix.vercel.app/) |
| 💻 **Source Code (GitHub)** | [https://github.com/AhmadIshaq-code/kaamfix](https://github.com/AhmadIshaq-code/kaamfix) |

---

## 📖 Project Description

### What is KaamFix?
**KaamFix** is a localized, full-stack digital marketplace platform engineered to bridge the gap between everyday Pakistani households/businesses and skilled trade technicians (electricians, plumbers, AC technicians, carpenters, painters, appliance repair experts, and masons). Built with React 18, TypeScript, Tailwind CSS, Firebase Firestore, Supabase Storage, and powered by Google Gemini AI, KaamFix digitizes the informal home maintenance industry.

### What Problem Does It Solve?
In traditional Pakistani urban and suburban settings, hiring home service professionals is fragmented, informal, and uncertain:

1. **Lack of Transparent Pricing** – Standard rates do not exist, leading to price inflation or overcharging.
2. **Worker Trust & Safety** – Unverified technicians create safety concerns for families.
3. **Uncertain Work Quality** – Customers lack access to verified reviews, portfolios, or trade certifications.
4. **Income Inconsistency for Workers** – Skilled tradespeople rely solely on street word-of-mouth rather than a steady stream of digital job requests.

### Who is It Built For?
* **Homeowners & Businesses** – Looking for quick, safe, transparent, and verified trade solutions.
* **Skilled Trade Technicians** – Seeking consistent digital lead generation, flexible working hours, transparent PKR hourly pricing, and direct customer connectivity.
* **Marketplace Administrators** – Responsible for verifying worker profiles, auditing complaints, and arbitrating customer-worker disputes.

### Why This Solution is Useful
KaamFix empowers workers by giving them an online storefront to display their skills and earn a dignified livelihood, while providing customers with instant AI-driven diagnostic help, transparent pricing, verified worker profiles, and real-time job status tracking.

---

## ✨ Features

### 👤 Customer Module
* **Customer Registration & Login** – Multi-role account setup with email/password and single-click OAuth.
* **Interactive Service Discovery** – Explore technicians filtered by trade category, city, availability, rating, and rate per hour (PKR).
* **Direct Booking & Custom Quotes** – Submit location-aware job requests with problem context, preferred date, and budget caps.
* **Real-time Request Tracking** – Live updates on booking status (`pending` ➔ `accepted` ➔ `in-progress` ➔ `completed` ➔ `cancelled`).
* **Rating & Feedback** – Leave 5-star ratings and written reviews after completed service calls.
* **Dispute Escalation** – Flag unsatisfied services or billing discrepancies to platform admins.

### 🧰 Worker & Technician Module
* **Worker Registration & Onboarding** – Specialized sign-up process collecting trade details, experience years, city, and bio.
* **Live Status Toggle** – Instantly switch working status between `Available`, `Busy`, and `Offline`.
* **Job Request Management** – Real-time incoming job feed with one-touch `Accept` and `Decline` controls.
* **Profile & Portfolio Editor** – Manage skills, hourly rate (PKR), trade description, and contact info.
* **Profile Photo Upload** – Direct file upload powered by **Supabase Storage** for high-resolution profile imagery.
* **Earnings & Performance Metrics** – Real-time dashboard showing total completed jobs, customer reviews, and earnings.

### 🛡️ Admin Governance Module
* **Worker Roster Management** – Complete oversight of all registered trade specialists. Activate, suspend, or safely remove worker documents.
* **Dispute Arbitration Center** – Review customer complaints, investigate both parties, and issue final resolutions.
* **Global Service Logs** – Monitor every active and historical service booking across Pakistan.
* **Platform Analytics** – Real-time summary charts (using Recharts) for total revenues, job completion rates, and trade category distributions.
* **System Broadcasts** – Push real-time platform notifications to all active users and workers.

### 🧠 Smart & Core Capabilities
* **Google Authentication** – Seamless single-sign-on using Firebase Google Auth provider.
* **Firebase Authentication** – Secure session handling and role-based client routing.
* **AI Service Advisor** – Gemini AI diagnostic engine that analyzes user descriptions, recommends trade categories, estimates PKR prices, and provides safety advice.
* **Real-time Firestore Subscriptions** – Zero-refresh UI updates powered by snapshot listeners.
* **Responsive Dark/Light Theme** – Theme switcher with persistent `localStorage` preferences and dark mode styling.

---

## 🤖 AI Feature — Gemini AI Service Advisor

### What the AI Feature Does
The **AI Service Advisor** allows users to describe home repair problems in plain conversational language (e.g., *"My kitchen socket sparked and turned black when I plugged in the microwave"*).

### Why It Is Useful
Non-technical customers often do not know which specialist to hire or what a repair should cost. The AI Advisor instantly:

1. Identifies the exact trade specialist required (e.g., Electrician).
2. Categorizes the issue urgency level (`Low`, `Medium`, `High`).
3. Diagnoses the underlying root cause.
4. Estimates realistic PKR repair costs.
5. Issues critical immediate safety warnings (e.g., *"Turn off main circuit breaker before touching the outlet"*).
6. Displays a confidence score bar and provides a direct one-click button to hire verified specialists.

### Model Used
**Google Gemini Flash** via the `@google/genai` SDK proxied through a Vercel Serverless Function (`/api/advisor`).

### Complete AI System Prompt

```text
You are KaamFix AI Service Advisor.
Analyze home maintenance and local service problems.
Return a JSON object with the exact fields requested. Must use realistic, affordable Pakistani pricing in PKR.

Response Schema:
{
  "recommendedService": "One of (Electrician, Plumber, Carpenter, Painter, AC Technician, Mason, Welder, Labor Worker, CCTV Installer, Solar Technician, Home Cleaning, Appliance Repair)",
  "urgencyLevel": "Low, Medium, or High",
  "possibleCause": "A brief, single-sentence explanation of what caused the issue.",
  "estimatedCost": "Estimated cost range in PKR, e.g., 'Rs. 1,500 - 3,000'. Must use realistic, affordable Pakistani pricing.",
  "safetyAdvice": "Simple, actionable safety precaution to take immediately.",
  "confidenceScore": "A confidence percentage like '90%' or '95%'"
}
```

---

## 🛠️ Technology Stack

| Component | Technology | Purpose / Description |
|---|---|---|
| **Frontend** | React 18 | Single-page interface & UI component layer |
| **Language** | TypeScript | Strong typing across data models and props |
| **Build Tool** | Vite | Ultra-fast HMR and frontend bundling |
| **Styling** | Tailwind CSS v4 + Motion | Modern utility styling & Framer Motion animations |
| **Authentication** | Firebase Auth | Google OAuth & Email/Password session security |
| **Database** | Cloud Firestore | Real-time NoSQL database with snapshot listeners |
| **File Storage** | Supabase Storage | Object bucket storage for worker profile imagery |
| **AI Model** | Google Gemini Flash | Natural language diagnostic engine |
| **Backend API** | Vercel Serverless Functions | Serverless API route (`/api/advisor`) for Gemini AI proxy |
| **Development Platform** | Google AI Studio | Environment provisioning & prompt evaluation |
| **Hosting & Deployment** | Vercel | Frontend hosting & Serverless Functions deployment |
| **Version Control** | GitHub | Code repository management & CI/CD workflows |

---

## 🏗️ Project Architecture & Workflow

```text
  ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
  │    CUSTOMER     │       │     WORKER      │       │      ADMIN      │
  │  (Browses/Books)│       │ (Accepts/Works) │       │ (Audits/Manages)│
  └────────┬────────┘       └────────┬────────┘       └────────┬────────┘
           │                         │                         │
           └──────────────────┐      │      ┌──────────────────┘
                              ▼      ▼      ▼
                      ┌───────────────────────────┐
                      │    React 18 + Vite UI     │
                      │   (Tailwind + Motion)     │
                      └─────────────┬─────────────┘
                                    │
             ┌──────────────────────┼──────────────────────┐
             ▼                      ▼                      ▼
  ┌─────────────────────┐┌────────────────────────────┐┌────────────────────┐
  │    Firebase Auth    ││  Vercel Serverless Function ││  Supabase Storage  │
  │ (Google SSO / Pass) ││       (/api/advisor)        ││  (Profile Images)  │
  └──────────┬──────────┘└─────────────┬───────────────┘└──────────┬─────────┘
             │                         │                           │
             │                         ▼                           │
             │                ┌─────────────────┐                  │
             │                │  Google Gemini  │                  │
             │                │   Flash Model   │                  │
             │                └─────────────────┘                  │
             │                                            │
             └──────────────────────┬─────────────────────┘
                                    │
                                    ▼
                      ┌───────────────────────────┐
                      │     Cloud Firestore       │
                      │  (Real-Time NoSQL DB)     │
                      └───────────────────────────┘
```

1. **Customer Flow** – Customer logs in via Firebase Auth, uses AI Advisor or Service Discovery to find a worker, and submits a booking request to Firestore.
2. **Real-time Sync Flow** – Firestore snapshot listener instantly triggers a notification on the Worker Dashboard feed.
3. **Worker Flow** – Worker accepts the request, updates their status to `in-progress` and `completed`.
4. **Admin Flow** – Admin monitors all active requests, audits worker profiles, and manages dispute logs in real-time.

---

## 📁 Folder Structure

```text
kaamfix/
├── public/                     # Static assets (Favicon, logos)
├── src/
│   ├── components/             # UI Components
│   │   ├── AdminDashboard.tsx      # Admin governance & dispute resolution
│   │   ├── AIServiceAdvisor.tsx    # Gemini AI problem diagnostic interface
│   │   ├── Auth.tsx                # Authentication container
│   │   ├── AuthModal.tsx           # Customer & worker sign-up / login modal
│   │   ├── CustomerDashboard.tsx   # Customer home feed & worker showcase
│   │   ├── EditWorkerModal.tsx     # Profile editor & Supabase image uploader
│   │   ├── FAQ.tsx                 # Frequently asked questions section
│   │   ├── MyRequests.tsx          # Customer active request tracker
│   │   ├── Navbar.tsx              # Application top navigation bar
│   │   ├── RequestServiceForm.tsx  # Direct booking form
│   │   ├── ServiceDiscovery.tsx    # Filterable worker directory & search
│   │   └── WorkerDashboard.tsx     # Worker job manager & availability toggle
│   ├── lib/                    # SDK Client Integrations
│   │   ├── dbService.ts            # Firestore listeners, CRUD & fallback data
│   │   ├── firebase.ts             # Firebase app, auth & firestore init
│   │   └── supabase.ts             # Supabase storage client for file uploads
│   ├── App.tsx                 # Root application component & routing
│   ├── index.css               # Global Tailwind CSS entry
│   ├── main.tsx                # Application entry point
│   └── types.ts                # TypeScript interface declarations
├── api/                        # Vercel Serverless Functions
│   └── advisor.ts                  # Gemini AI API proxy (deployed as /api/advisor)
├── .env.example                # Environment variables template
├── package.json                # Project dependencies and scripts
├── server.ts                   # Local development server (Express + Vite middleware)
├── tsconfig.json               # TypeScript configuration
└── vite.config.ts              # Vite bundler configuration
```

---

## 📸 Screenshots

<table>
  <tr>
    <td align="center" width="50%">
      <strong>🏠 Landing Page / Auth</strong><br><br>
      <img src="./screenshots/Landing_Page.jpg" alt="Landing Page" width="100%">
    </td>
    <td align="center" width="50%">
      <strong>🔐 Login Modal</strong><br><br>
      <img src="./screenshots/Login_Modal.jpg" alt="Login Modal" width="100%">
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <strong>👤 Customer Dashboard</strong><br><br>
      <img src="./screenshots/Customer_Dashboard.jpg" alt="Customer Dashboard" width="100%">
    </td>
    <td align="center" width="50%">
      <strong>🧰 Worker Dashboard</strong><br><br>
      <img src="./screenshots/Worker_Dashboard.jpg" alt="Worker Dashboard" width="100%">
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <strong>🛡️ Admin Dashboard</strong><br><br>
      <img src="./screenshots/Admin_Dashboard.jpg" alt="Admin Dashboard" width="100%">
    </td>
    <td align="center" width="50%">
      <strong>🧠 AI Service Advisor</strong><br><br>
      <img src="./screenshots/AI_Service_Advisor.jpg" alt="AI Service Advisor" width="100%">
    </td>
  </tr>
</table>

---

## 🚀 Deployment

| Component | Platform |
|---|---|
| **Frontend Hosting** | Vercel |
| **Backend API** | Vercel Serverless Functions |
| **AI Service** | Google Gemini API |

The frontend (React + Vite) builds to static files served by Vercel. The AI Service Advisor API is deployed as a Vercel Serverless Function at `/api/advisor`, which proxies requests to the Google Gemini API using the `@google/genai` SDK.

### Vercel Configuration (`vercel.json`)

```json
{
  "version": 2,
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

All routes are rewritten to `index.html` for SPA client-side routing. The `/api/advisor` function is automatically detected from the `api/` directory.

### Required Environment Variables (Vercel Dashboard)

Set these in your Vercel project dashboard under **Settings → Environment Variables**:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=

VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

GEMINI_API_KEY=
```

---

## 🔐 Environment Variables

The following environment variables are required to run KaamFix. Copy `.env.example` to `.env` and fill in your values.

```env
# ───── Firebase Configuration ─────
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# ───── Supabase (Optional) ─────
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# ───── Gemini AI (Server-side) ─────
GEMINI_API_KEY=your_gemini_api_key
```

> **Note:** Variables prefixed with `VITE_` are exposed to the browser via `import.meta.env`. The `GEMINI_API_KEY` is server-side only and used by the Vercel Serverless Function at `api/advisor.ts`.

---

## ⚙️ Local Setup & Installation

Follow these steps to run **KaamFix** on your local system:

### 1. Clone Repository
```bash
git clone https://github.com/AhmadIshaq-code/kaamfix.git
cd kaamfix
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
```bash
cp .env.example .env
```
Then edit `.env` with your actual keys (see the [Environment Variables](#-environment-variables) section above).

### 4. Run Development Server
```bash
npm run dev
```
Open the URL shown in your terminal (typically `http://localhost:5173`).

### 5. Build for Production
```bash
npm run build
```

---

## 👨‍💻 Developer

<table>
  <tr>
    <td>
      <strong>Name:</strong> Muhammad Ahmad Ishaq<br>
      <strong>University:</strong> University of Agriculture Faisalabad<br>
      <strong>Degree:</strong> BS Computer Science<br>
      <strong>GitHub:</strong> <a href="https://github.com/AhmadIshaq-code">github.com/AhmadIshaq-code</a>
    </td>
  </tr>
</table>

---

## 📜 License & Credits

Built for academic assessment and open-source distribution under the **MIT License**.
Developed with ❤️ for Pakistan's trade workforce.
