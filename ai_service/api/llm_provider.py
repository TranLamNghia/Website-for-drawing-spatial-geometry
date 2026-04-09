import openai
import time
from .llm_config import (
    OPENROUTER_API_KEY, 
    OPENROUTER_BASE_URL, 
    PRIMARY_MODEL, 
    FALLBACK_MODEL,
    DEFAULT_TIMEOUT,
    FALLBACK_TIMEOUT
)

class LLMProvider:
    def __init__(self):
        self.headers = {
            "HTTP-Referer": "http://localhost:8001",
            "X-Title": "SpatialGeometry Math Engine"
        }
        self.client = openai.Client(
            base_url=OPENROUTER_BASE_URL,
            api_key=OPENROUTER_API_KEY,
            timeout=DEFAULT_TIMEOUT,
            default_headers=self.headers
        )

    def get_completion(self, messages, model=None, temperature=0.1, timeout=None):
        target_model = model or PRIMARY_MODEL
        actual_timeout = timeout or DEFAULT_TIMEOUT
        
        print(f"[LLM_PROVIDER] [{time.strftime('%H:%M:%S')}] Sending Request to {target_model}...")
        start_time = time.time()
        
        try:
            response = self.client.chat.completions.create(
                model=target_model,
                messages=messages,
                temperature=temperature,
                timeout=actual_timeout
            )
            duration = time.time() - start_time
            print(f"[LLM_PROVIDER] <<< [200 OK] Received response from {target_model} after {duration:.2f}s.")
            return response.choices[0].message.content
            
        except (openai.APITimeoutError, openai.APIStatusError, Exception) as e:
            duration = time.time() - start_time
            error_type = type(e).__name__
            print(f"[LLM_PROVIDER] ⚠️ {error_type} from {target_model} after {duration:.2f}s: {str(e)}")
            
            # If we already tried fallback or if the request was specifically for a non-primary model, 
            # we might want to just raise the error. 
            # But for simplicity, we fallback to FALLBACK_MODEL if current attempt was already the primary.
            if target_model == PRIMARY_MODEL:
                print(f"[LLM_PROVIDER] [FALLBACK] Switching to {FALLBACK_MODEL}...")
                return self._call_fallback(messages, temperature)
            else:
                raise e

    def _call_fallback(self, messages, temperature=0.1):
        start_time = time.time()
        try:
            response = self.client.chat.completions.create(
                model=FALLBACK_MODEL,
                messages=messages,
                temperature=temperature,
                timeout=FALLBACK_TIMEOUT
            )
            duration = time.time() - start_time
            print(f"[LLM_PROVIDER] [FALLBACK] <<< Success from {FALLBACK_MODEL} after {duration:.2f}s.")
            return response.choices[0].message.content
        except Exception as fe:
            print(f"[LLM_PROVIDER] ❌ [FALLBACK] {FALLBACK_MODEL} also failed: {str(fe)}")
            raise fe

# Singleton instance
llm_provider = LLMProvider()
