import json
import time

import openai
import requests
from google.auth import default as google_auth_default
from google.auth.transport.requests import Request as GoogleAuthRequest

from .llm_config import (
    VERTEX_PROJECT_ID,
    VERTEX_LOCATION,
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    PRIMARY_MODEL,
    FALLBACK_MODEL,
    DEFAULT_TIMEOUT,
    FALLBACK_TIMEOUT,
)


def _openai_messages_to_vertex_payload(messages: list, temperature: float) -> dict:
    """Map OpenAI-style chat messages to Vertex generateContent JSON body."""
    system_chunks: list[str] = []
    contents: list[dict] = []

    for m in messages:
        role = m.get("role", "user")
        content = m.get("content", "")
        if isinstance(content, list):
            text = " ".join(
                p.get("text", "") if isinstance(p, dict) else str(p) for p in content
            )
        else:
            text = str(content)

        if role == "system":
            system_chunks.append(text)
            continue
        if role == "assistant":
            gemini_role = "model"
        else:
            gemini_role = "user"
        contents.append({"role": gemini_role, "parts": [{"text": text}]})

    body: dict = {
        "contents": contents,
        "generationConfig": {"temperature": temperature},
    }
    if system_chunks:
        body["systemInstruction"] = {
            "parts": [{"text": "\n\n".join(system_chunks)}]
        }
    return body


def _vertex_response_text(data: dict) -> str:
    candidates = data.get("candidates") or []
    if not candidates:
        raise ValueError(f"Vertex response has no candidates: {json.dumps(data)[:500]}")
    parts = (candidates[0].get("content") or {}).get("parts") or []
    texts = [p.get("text", "") for p in parts if isinstance(p, dict)]
    return "".join(texts).strip()


_VERTEX_SCOPES = ("https://www.googleapis.com/auth/cloud-platform",)


class LLMProvider:
    def __init__(self):
        self.openrouter_headers = {
            "HTTP-Referer": "http://localhost:8001",
            "X-Title": "SpatialGeometry Math Engine",
        }
        self.openrouter_client = openai.Client(
            base_url=OPENROUTER_BASE_URL,
            api_key=OPENROUTER_API_KEY,
            timeout=FALLBACK_TIMEOUT,
            default_headers=self.openrouter_headers,
        )
        self._vertex_credentials = None

    def _vertex_bearer_token(self) -> str:
        if self._vertex_credentials is None:
            self._vertex_credentials, _ = google_auth_default(scopes=_VERTEX_SCOPES)
        creds = self._vertex_credentials
        if not creds.valid:
            creds.refresh(GoogleAuthRequest())
        if not creds.token:
            raise RuntimeError(
                "Vertex OAuth2: no access token after refresh. "
                "Set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON "
                "or run: gcloud auth application-default login"
            )
        return creds.token

    def _vertex_generate_url(self, model: str) -> str:
        host = f"{VERTEX_LOCATION}-aiplatform.googleapis.com"
        return (
            f"https://{host}/v1/projects/{VERTEX_PROJECT_ID}/locations/{VERTEX_LOCATION}"
            f"/publishers/google/models/{model}:generateContent"
        )

    def _vertex_generate(self, model: str, messages: list, temperature: float, timeout: float) -> str:
        if not VERTEX_PROJECT_ID:
            raise ValueError(
                "Set VERTEX_PROJECT_ID to your GCP project id (Vertex does not accept ?key= on this API)."
            )
        url = self._vertex_generate_url(model)
        token = self._vertex_bearer_token()
        payload = _openai_messages_to_vertex_payload(messages, temperature)
        resp = requests.post(
            url,
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            },
            timeout=timeout,
        )
        if resp.status_code != 200:
            raise RuntimeError(
                f"Vertex HTTP {resp.status_code}: {resp.text[:800]}"
            )
        data = resp.json()
        return _vertex_response_text(data)

    def get_completion(self, messages, model=None, temperature=0.1, timeout=None):
        target_model = model or PRIMARY_MODEL
        actual_timeout = timeout or DEFAULT_TIMEOUT

        print(
            f"[LLM_PROVIDER] [{time.strftime('%H:%M:%S')}] Sending request to {target_model} (Vertex OAuth)..."
        )
        start_time = time.time()

        try:
            text = self._vertex_generate(
                target_model, messages, temperature, actual_timeout
            )
            duration = time.time() - start_time
            print(
                f"[LLM_PROVIDER] <<< [200 OK] Received response from {target_model} after {duration:.2f}s."
            )
            return text

        except Exception as e:
            duration = time.time() - start_time
            error_type = type(e).__name__
            print(
                f"[LLM_PROVIDER] ⚠️ {error_type} from {target_model} after {duration:.2f}s: {str(e)}"
            )

            if target_model == PRIMARY_MODEL:
                print(f"[LLM_PROVIDER] [FALLBACK] Switching to {FALLBACK_MODEL}...")
                return self._call_fallback(messages, temperature)
            raise e

    def _call_fallback(self, messages, temperature=0.1):
        start_time = time.time()
        try:
            response = self.openrouter_client.chat.completions.create(
                model=FALLBACK_MODEL,
                messages=messages,
                temperature=temperature,
                timeout=FALLBACK_TIMEOUT,
            )
            duration = time.time() - start_time
            print(
                f"[LLM_PROVIDER] [FALLBACK] <<< Success from {FALLBACK_MODEL} after {duration:.2f}s."
            )
            return response.choices[0].message.content
        except Exception as fe:
            print(
                f"[LLM_PROVIDER] ❌ [FALLBACK] {FALLBACK_MODEL} also failed: {str(fe)}"
            )
            raise fe


# Singleton instance
llm_provider = LLMProvider()
