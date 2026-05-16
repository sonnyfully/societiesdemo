"""Railway root-level ASGI entrypoint.

The application code lives in backend/main.py. This shim lets Railway import
main:app even when the service root is the repository root.
"""

from backend.main import app
