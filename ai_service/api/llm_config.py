import os
from dotenv import load_dotenv

load_dotenv()

# API Settings
OPENROUTER_API_KEY = os.getenv("OPENROUTER_QWEN3_APIKEY")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

# Model Selection
# We use Qwen 3.6 Plus (Free) as primary because of its superior Vietnamese and math reasoning.
PRIMARY_MODEL = "google/gemini-2.5-flash"
FALLBACK_MODEL = "meta-llama/llama-3.3-70b-instruct"

# Default timeouts in seconds
DEFAULT_TIMEOUT = 60.0
FALLBACK_TIMEOUT = 30.0
