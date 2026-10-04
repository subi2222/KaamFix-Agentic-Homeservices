# KaamFix deployment guide

KaamFix deploys as one Docker web service: FastAPI serves both `/api/*` and the built React app. Browser requests stay on one origin, avoiding production proxy and CORS mistakes.

## Local production test

```powershell
npm ci
python -m pip install -r requirements.txt
npm run lint
npm run build
python app.py
```

Test `http://localhost:8000`, `/app/ai-advisor`, `/pro`, `/admin`, and `/api/health`.

## Before pushing to GitHub

Never commit `.env`, `backend/.env`, a Firebase service-account JSON, logs, private uploads, or `data/agent-checkpoints.sqlite*`. Rotate any API key pasted into chat or previously placed in an example file. Publish `data/approved-docs` only when those manuals are safe to share.

```powershell
git init
git add .
git status
git commit -m "Prepare KaamFix for deployment"
git branch -M main
git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_REPOSITORY.git
git push -u origin main
```

Inspect `git status` before committing. A Firebase Admin JSON or `.env` file must never appear.

## Render deployment

1. Choose **New → Blueprint** and connect the GitHub repository.
2. Render reads `render.yaml` and builds `Dockerfile`.
3. Enter every variable marked `sync: false`.
4. Set `FRONTEND_ORIGINS` to the final origin without a trailing slash.
5. Keep the persistent disk at `/app/data` so checkpoints and uploads survive restarts.

Backend secrets:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_SERVICE_ACCOUNT_JSON` (complete service-account JSON as one environment value)
- `GEMINI_API_KEY`
- `GROQ_API_KEY`

Public frontend build configuration:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- Optional `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

The frontend and backend Firebase project IDs must match. Add the deployed domain in Firebase Authentication → Settings → Authorized domains.

## CORS

The unified deployment does not need cross-origin access. For a separately hosted frontend, use an exact allowlist:

```env
FRONTEND_ORIGINS=https://app.example.com,https://www.example.com
```

Do not use `*` with authenticated requests. KaamFix permits `Authorization`, `Content-Type`, and `Accept` and handles preflight requests.

## Post-deployment checks

- `/api/health` returns `status: ok`.
- Customer login, text triage, and photo triage work.
- A 401 causes exactly one Firebase token refresh/retry.
- Worker Technical Assistant is restricted to its assigned job.
- Admin decisions resume paused workflows.
- A service restart preserves checkpoint/upload data.
- Logs contain no tokens, API keys, or private keys.
