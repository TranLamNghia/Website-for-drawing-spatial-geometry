import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=ROOT_ENV_PATH, override=False)

# Vertex AI (primary) — requires OAuth2 (Application Default Credentials or service account).
# Set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON, or run:
#   gcloud auth application-default login

# GCP project and region for Vertex Gemini (see Console → Vertex AI → settings).
VERTEX_PROJECT_ID = os.getenv("VERTEX_PROJECT_ID")
VERTEX_LOCATION = os.getenv("VERTEX_LOCATION", "us-central1")

# 
# Model Selection
PRIMARY_MODEL = "gemini-2.5-flash"
FALLBACK_MODEL = "gemini-2.5-pro"

# Default timeouts in seconds (connect, read) — extract returns short JSON
DEFAULT_TIMEOUT = 60.0
FALLBACK_TIMEOUT = 60.0

# solve-math generates SymPy scripts. Keep this below the backend timeout so
# invalid/slow generations can retry instead of leaving the UI waiting forever.
SOLVE_MATH_TIMEOUT = 75.0
SOLVE_MATH_FALLBACK_TIMEOUT = 45.0
