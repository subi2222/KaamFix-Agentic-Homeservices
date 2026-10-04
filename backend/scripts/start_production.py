"""Initialize persistent data and start the unified production server."""
from pathlib import Path
import os
import shutil

import uvicorn

from backend.app.config import get_settings


def seed_runtime_data() -> None:
    destination = get_settings().data_dir
    destination.mkdir(parents=True, exist_ok=True)
    seed_root = Path(__file__).resolve().parents[2] / "seed-data"
    for name in ("approved-docs", "faiss"):
        source = seed_root / name
        target = destination / name
        if source.exists() and not target.exists():
            shutil.copytree(source, target)


if __name__ == "__main__":
    seed_runtime_data()
    uvicorn.run("app:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), proxy_headers=True)
