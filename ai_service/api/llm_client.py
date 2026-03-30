import openai
import os
import time
from dotenv import load_dotenv
from api.prompts.prompt_builder import build_prompt
from api.utils.retry_engine import RetryEngine
from api.utils.validator import clean_markdown_json


load_dotenv()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_QWEN3_APIKEY")
GEMINI_APIKEY = os.getenv("GEMINI_APIKEY")

class GeometryAIEngine:
    def __init__(self):
        # Initialize LLM client to OpenRouter Cloud
        print(f"[LLM_INIT] Đang khởi tạo OpenAI Client (BaseURL: https://openrouter.ai/api/v1)")
        
        # Thêm headers cho OpenRouter (Khuyến nghị từ OpenRouter)
        self.headers = {
            "HTTP-Referer": "http://localhost:8001", 
            "X-Title": "SpatialGeometry Math Engine"
        }
        
        self.client = openai.Client(
            base_url="https://openrouter.ai/api/v1", 
            api_key=OPENROUTER_API_KEY, 
            timeout=60.0,
            default_headers=self.headers
        )
        
        self.retry_engine = RetryEngine(client=self.client)

    def extract_json(self, problem_text: str) -> str:
        print(f"\n[LLM_CLIENT] Bắt đầu xử lý bài toán: '{problem_text[:40]}...'")
        messages = build_prompt(problem_text)
        
        start_time = time.time()
        print(f"[LLM_CLIENT] [{time.strftime('%H:%M:%S')}] Đang gửi Request tới Gemini (Google)...")
        
        try:
            print(f"[LLM_CLIENT] >>> Đang chờ phản hồi từ Server (Timeout: 60s)...")
            response = self.client.chat.completions.create(
                model="google/gemini-2.5-flash", 
                messages=messages,
                temperature=0.1,
                timeout=60.0
            )
            duration = time.time() - start_time
            print(f"[LLM_CLIENT] <<< [200 OK] Nhận phản hồi từ Gemini 2.5 (OpenRouter) sau {duration:.2f}s.")
            raw_json = response.choices[0].message.content
        except openai.APITimeoutError:
            duration = time.time() - start_time
            print(f"[LLM_CLIENT] ❌ LỖI: Request quá 60s (Timeout) sau {duration:.2f}s. Đang chuyển sang Llama 3.3...")
            return self._fallback_to_llama(messages)
        except openai.APIStatusError as e:
            duration = time.time() - start_time
            print(f"[LLM_CLIENT] ❌ LỖI: HTTP {e.status_code} từ OpenRouter sau {duration:.2f}s. {e.message}")
            return self._fallback_to_llama(messages)
        except Exception as e:
            duration = time.time() - start_time
            print(f"[LLM_CLIENT] ⚠️ Lỗi không xác định từ OpenRouter ({str(e)}) sau {duration:.2f}s. KHỞI ĐỘNG FALLBACK DÙNG LLAMA 3.3...")
            return self._fallback_to_llama(messages)

        print(f"[LLM_CLIENT] Đã nhận được JSON gốc từ AI. Đang làm sạch Markdown...")
        clean_json = clean_markdown_json(raw_json)
        print(f"[LLM_CLIENT] Bắt đầu đẩy vào Validator...")
        return self.retry_engine.run(clean_json)

    def _fallback_to_llama(self, messages) -> str:
        print(f"[LLM_CLIENT] [FALLBACK] Đang gửi Request tới OpenRouter (Llama 3.3 70B)...")
        start_time = time.time()
        try:
            response = self.client.chat.completions.create(
                model="meta-llama/llama-3.3-70b-instruct", 
                messages=messages,
                temperature=0.1,
                timeout=30.0
            )
            duration = time.time() - start_time
            print(f"[LLM_CLIENT] [FALLBACK] <<< Thành công từ Llama 3.3 sau {duration:.2f}s.")
            raw_json = response.choices[0].message.content
            clean_json = clean_markdown_json(raw_json)
            return self.retry_engine.run(clean_json)
        except Exception as ge:
            print(f"[LLM_CLIENT] ❌ [FALLBACK] Cả Llama 3.3 cũng lỗi: {str(ge)}")
            raise ge