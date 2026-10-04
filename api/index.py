"""Vercel ASGI entry point for the KaamFix API.

Vercel serves the built frontend from ``dist`` itself. Importing the root
``app.py`` here would also mount those generated assets inside the Python
function, causing Vercel's file tracer to capture stale hashed filenames when
Vite runs more than once during a deployment.
"""

from backend.app.main import app

__all__ = ["app"]
