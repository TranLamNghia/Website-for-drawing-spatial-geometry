import os
from dotenv import load_dotenv

load_dotenv()

# Vertex AI (primary) — requires OAuth2 (Application Default Credentials or service account).
# Set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON, or run:
#   gcloud auth application-default login
OPENROUTER_API_KEY = os.getenv("OPENROUTER_APIKEY")

# GCP project and region for Vertex Gemini (see Console → Vertex AI → settings).
VERTEX_PROJECT_ID = os.getenv("VERTEX_PROJECT_ID")
VERTEX_LOCATION = os.getenv("VERTEX_LOCATION", "us-central1")

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

# Model Selection
PRIMARY_MODEL = "gemini-2.5-flash"
FALLBACK_MODEL = "meta-llama/llama-3.3-70b-instruct"

# Default timeouts in seconds
DEFAULT_TIMEOUT = 60.0
FALLBACK_TIMEOUT = 30.0
