import openai
import os
import time
import json
import requests
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_QWEN3_APIKEY")

BASE_DIR = Path(__file__).parent.parent
PROMPT_FILE = BASE_DIR / "promts" / "sympy_prompt.txt"

class SympyAIEngine:
    def __init__(self):
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
        self.sandbox_url = "http://localhost:8002/execute"

    def generate_and_solve(self, problem_text: str, facts_json: dict) -> dict:
        print(f"\n[SYMPY_ENGINE] Bắt đầu gọi LLM viết Python script cho bài toán...")
        
        system_prompt = PROMPT_FILE.read_text(encoding="utf-8")
        
        user_prompt = f"""
        GIẢI BÀI TOÁN GẮN TỌA ĐỘ 3D THEO YÊU CẦU:
        {problem_text}
        
        DỮ LIỆU ĐÃ TRÍCH XUẤT TỪ JSON:
        {json.dumps(facts_json, ensure_ascii=False, indent=2)}
        """

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        try:
            # We use an advanced reasoning model capable of SymPy math
            response = self.client.chat.completions.create(
                model="google/gemini-2.5-flash", # Changed from llama temporarily for stability
                messages=messages,
                temperature=0.1,
                timeout=60.0
            )
            raw_code = response.choices[0].message.content
        except Exception as e:
            print(f"[SYMPY_ENGINE] Lỗi LLM Request: {str(e)}")
            return {"status": "error", "message": f"Lỗi gọi LLM: {str(e)}"}

        print(f"[SYMPY_ENGINE] Đã nhận Python Script từ LLM. Độ dài: {len(raw_code)} ký tự.")
        
        # Làm sạch chuỗi markdown
        clean_code = raw_code.strip()
        if clean_code.startswith("```python"):
            clean_code = clean_code[9:]
        if clean_code.startswith("```"):
            clean_code = clean_code[3:]
        if clean_code.endswith("```"):
            clean_code = clean_code[:-3]
        clean_code = clean_code.strip()

        print(f"[SYMPY_ENGINE] Đang bắn script tới Math Sandbox (:8002)...")
        try:
            sandbox_resp = requests.post(
                self.sandbox_url,
                json={"code": clean_code},
                timeout=20
            )
            data = sandbox_resp.json()
            if sandbox_resp.status_code == 200:
                print(f"[SYMPY_ENGINE] Thành công. Sandbox đã tính toán ra tọa độ!")
                return data
            else:
                print(f"[SYMPY_ENGINE] Sandbox báo lỗi: {data}")
                return {"status": "error", "message": "Sandbox thực thi code lỗi.", "details": data}
        except requests.exceptions.RequestException as e:
            print(f"[SYMPY_ENGINE] Mất kết nối tới Math Sandbox: {str(e)}")
            return {"status": "error", "message": f"Không thiết lập được kết nối với Math Sandbox: {str(e)}"}
