"""Single KaamFix application entrypoint.

Runs the FastAPI REST API and serves the built React SPA from ``dist``.
During frontend development, run Vite separately; it proxies ``/api`` here.
"""
from pathlib import Path
import os

import uvicorn
from fastapi import HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.app.main import app

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"
ASSETS = DIST / "assets"

if ASSETS.exists():
    app.mount("/assets", StaticFiles(directory=ASSETS), name="assets")


@app.get("/{full_path:path}", include_in_schema=False)
def serve_spa(full_path: str):
    """Serve React Router paths from the production build."""
    requested = DIST / full_path
    if full_path and requested.is_file() and DIST in requested.resolve().parents:
        return FileResponse(requested)
    index = DIST / "index.html"
    if index.exists():
        return FileResponse(
            index,
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )
    raise HTTPException(
        status_code=503,
        detail="Frontend build not found. Run `npm run build`, or use Vite on port 5173.",
    )


if __name__ == "__main__":
    # Render, Railway and similar platforms inject PORT. Binding to 0.0.0.0
    # makes the service reachable outside the container.
    uvicorn.run("app:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), reload=False)
