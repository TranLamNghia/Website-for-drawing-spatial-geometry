from .validator import validate_json, clean_markdown_json
import openai

def simplify_error(error):
    return str(error)

import os
from dotenv import load_dotenv

load_dotenv()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_QWEN3_APIKEY")

class RetryEngine:
    def __init__(self, client, gemini_client, max_retries=2):
        self.max_retries = max_retries
        self.client = client
        self.gemini_client = gemini_client

    def repair(self, raw_json: str, error_msg: str) -> str:
        repair_prompt = f"""
        You MUST fix the following JSON to strictly match the schema.
        ERROR: {error_msg}
        RAW JSON: {raw_json}
        Return the FULL, COMPLETE FIXED JSON including all root keys (metadata, entities, facts, queries, extraction_meta). DO NOT truncate or omit any section.
        Return ONLY the JSON.
        """
        
        messages = [
            {"role": "system", "content": "You are an AI JSON fixer. Return ONLY valid JSON."},
            {"role": "user", "content": repair_prompt}
        ]

        print("     [RETRY_ENGINE] Đang yêu cầu AI sửa lỗi...")
        
        try:
            response = self.client.chat.completions.create(
                model="qwen/qwen3.5-flash-02-23", 
                messages=messages,
                temperature=0.1
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"     [RETRY_ENGINE] ⚠️ OpenRouter treo, gọi GEMINI sửa lỗi phòng hờ...")
            response = self.gemini_client.chat.completions.create(
                model="gemini-2.0-flash", 
                messages=messages,
                temperature=0.1
            )
            return response.choices[0].message.content

    def run(self, raw_json: str) -> str:
        is_valid, error = validate_json(raw_json)

        if is_valid:
            print("[RETRY_ENGINE] ✅ Validator báo: JSON HỢP LỆ TUYỆT ĐỐI. Trả kết quả thành công!")
            return raw_json

        print(f"[RETRY_ENGINE] ❌ LỖI JSON GỐC: {simplify_error(error)}")
        print(f"[RETRY_ENGINE] Sẽ tiến hành sửa lỗi tự động tối đa {self.max_retries} lần...")

        # Error-fixing loop
        for attempt in range(self.max_retries):
            print(f"  -> Lần sửa thứ {attempt + 1}/{self.max_retries}...")
            error_msg = simplify_error(error)
            
            raw_json = self.repair(raw_json, error_msg)
            raw_json = clean_markdown_json(raw_json) # Clean before validation!
            
            is_valid, error = validate_json(raw_json)

            if is_valid:
                print(f"  -> ✅ Đã sửa thành công ở lần thứ {attempt + 1}! JSON hoàn hảo.")
                return raw_json
            else:
                print(f"  -> ⚠️ Sửa thất bại. Vẫn bị lỗi: {simplify_error(error)}")

        print("[RETRY_ENGINE] ❌ Đã hết số lần sửa cho phép. Bắt buộc báo lỗi lên API.")
        raise ValueError(f"AI failed to generate valid geometry schema: {simplify_error(error)}")