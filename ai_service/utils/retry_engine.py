from .validator import validate_json, clean_markdown_json
import openai

def simplify_error(error):
    return str(error)

import os
from dotenv import load_dotenv

load_dotenv()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_QWEN3_APIKEY")

class RetryEngine:
    def __init__(self, client, max_retries=2):
        self.max_retries = max_retries
        self.client = client

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

        print("     [RETRY_ENGINE] Requesting AI to fix error...")
        
        try:
            response = self.client.chat.completions.create(
                model="google/gemini-2.5-flash", 
                messages=messages,
                temperature=0.1
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"     [RETRY_ENGINE] ⚠️ Gemini failed, calling Llama 3.3 as fallback...")
            response = self.client.chat.completions.create(
                model="meta-llama/llama-3.3-70b-instruct", 
                messages=messages,
                temperature=0.1
            )
            return response.choices[0].message.content

    def run(self, raw_json: str) -> str:
        is_valid, error = validate_json(raw_json)

        if is_valid:
            print("[RETRY_ENGINE] ✅ Validator: JSON IS PERFECTLY VALID. Returning success!")
            return raw_json

        print(f"[RETRY_ENGINE] ❌ ORIGINAL JSON ERROR: {simplify_error(error)}")
        print(f"[RETRY_ENGINE] Proceeding with automatic fix maximum {self.max_retries} times...")

        # Error-fixing loop
        for attempt in range(self.max_retries):
            print(f"  -> Fix attempt {attempt + 1}/{self.max_retries}...")
            error_msg = simplify_error(error)
            
            raw_json = self.repair(raw_json, error_msg)
            raw_json = clean_markdown_json(raw_json) # Clean before validation!
            
            is_valid, error = validate_json(raw_json)

            if is_valid:
                print(f"  -> ✅ Fixed successfully on attempt {attempt + 1}! JSON is perfect.")
                return raw_json
            else:
                print(f"  -> ⚠️ Fix failed. Still getting error: {simplify_error(error)}")

        print("[RETRY_ENGINE] ❌ Ran out of retries. Must throw error to API.")
        raise ValueError(f"AI failed to generate valid geometry schema: {simplify_error(error)}")