# KaamFix FastAPI backend

## Setup

1. Create a Python virtual environment.
2. Install dependencies with `pip install -r backend/requirements.txt`.
3. Download a Firebase Admin service-account JSON from Firebase Console → Project settings → Service accounts.
4. Copy `backend/.env.example` to `backend/.env` and set `GOOGLE_APPLICATION_CREDENTIALS` to its absolute path.
5. Run from the repository root:

```powershell
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

Interactive API documentation is available at `http://127.0.0.1:8000/docs`.

Protected endpoints expect the Firebase ID token from the signed-in frontend:

```http
Authorization: Bearer <firebase-id-token>
```

Never commit the Firebase service-account JSON or expose it through a `VITE_*` variable.
# KaamFix multi-agent backend

The FastAPI service now orchestrates three focused agents around the existing booking and dispatch workflow:

```text
customer triage -> safety rules -> [admin interrupt when hazardous]
                -> customer confirmation -> existing booking service
assigned worker -> approved-document retrieval -> technical brief/escalation
```

Firestore `requests` remains authoritative for bidding, assignment, chat, payment, and completion. LangGraph checkpoints are stored separately in `data/agent-checkpoints.sqlite`; retrying a confirmed workflow cannot create a second request.

## Setup

```powershell
python -m pip install -r backend/requirements.txt
python app.py
```

Configure `GEMINI_API_KEY`, `GEMINI_MODEL`, Firebase credentials, and frontend origins in `backend/.env`. Secrets must not use a `VITE_` prefix.

## Approved repair documents

Put approved `.pdf`, `.txt`, or `.md` manuals in `data/approved-docs`, then run:

```powershell
python -m backend.scripts.ingest_docs data/approved-docs
```

Optional metadata can be supplied beside a document as `<filename>.<ext>.json`:

```json
{
  "title": "Approved AC Service Manual",
  "equipment": "Split air conditioner",
  "model": "MODEL-123",
  "version": "2026.1",
  "section": "Electrical troubleshooting"
}
```

The ingestion command preserves source file, title, PDF page metadata, and a content-derived source id. Rebuilding replaces the local index, preventing uncontrolled duplicate additions. The same `GEMINI_EMBEDDING_MODEL` setting is used for ingestion and retrieval. No external manuals are bundled, so supply your own approved documents before expecting manual-specific citations.
