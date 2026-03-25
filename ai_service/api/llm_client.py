import openai
import re
import os
from dotenv import load_dotenv

import os
from dotenv import load_dotenv

from promts.prompt_builder import build_prompt
from utils.retry_engine import RetryEngine
from utils.validator import clean_markdown_json


load_dotenv()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_QWEN3_APIKEY")
GEMINI_APIKEY = os.getenv("GEMINI_APIKEY")

class GeometryAIEngine:
    def __init__(self):
        # Initialize LLM client to OpenRouter Cloud
        self.client = openai.Client(base_url="https://openrouter.ai/api/v1", api_key=OPENROUTER_API_KEY, timeout=60.0)
        self.gemini_client = openai.Client(base_url="https://generativelanguage.googleapis.com/v1beta/openai/", api_key=GEMINI_APIKEY, timeout=60.0)
        self.retry_engine = RetryEngine(client=self.client, gemini_client=self.gemini_client)

    def extract_json(self, problem_text: str) -> str:
        print(f"\n[LLM_CLIENT] Bắt đầu xử lý bài toán: '{problem_text[:40]}...'")
        messages = build_prompt(problem_text)
        
        print(f"[LLM_CLIENT] Đang gửi Request tới OpenRouter Cloud... Vui lòng chờ vài giây.")
        try:
            response = self.client.chat.completions.create(
                model="qwen/qwen3.5-flash-02-23", 
                messages=messages,
                temperature=0.1
            )
            raw_json = response.choices[0].message.content
        except Exception as e:
            print(f"[LLM_CLIENT] ⚠️ OpenRouter Lỗi/Hết Token ({str(e)}). KHỞI ĐỘNG FALLBACK DÙNG GEMINI...")
            response = self.gemini_client.chat.completions.create(
                model="gemini-2.0-flash", 
                messages=messages,
                temperature=0.1
            )
            raw_json = response.choices[0].message.content
        print(f"[LLM_CLIENT] Đã nhận được JSON gốc từ OpenRouter. Đang làm sạch Markdown...")
        
        clean_json = clean_markdown_json(raw_json)
        
        print(f"[LLM_CLIENT] Bắt đầu đẩy vào Validator...")
        return self.retry_engine.run(clean_json)