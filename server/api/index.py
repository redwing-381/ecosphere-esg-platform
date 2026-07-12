"""Vercel serverless entry point that exposes the FastAPI ASGI app.

Vercel's Python runtime serves functions from the ``api/`` directory. All
incoming paths are rewritten to this module (see ``vercel.json``), and FastAPI
handles the real routing internally.
"""
import sys
from pathlib import Path

# Ensure the server root (parent of this ``api`` dir) is importable so ``app``
# resolves no matter what working directory the runtime uses.
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.main import app

__all__ = ["app"]
