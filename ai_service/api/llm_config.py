import os
from dotenv import load_dotenv

load_dotenv()

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

# Default timeouts in seconds
DEFAULT_TIMEOUT = 60.0
FALLBACK_TIMEOUT = 30.0
