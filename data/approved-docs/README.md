# Approved document library

Place administrator-approved repair manuals, schematics, troubleshooting guides, and safety documents here, then run:

```powershell
python -m backend.scripts.ingest_docs data/approved-docs
```

Do not add unverified or copyrighted documents without permission. A metadata sidecar may be added as `manual.pdf.json`; see `backend/README.md` for its fields.

