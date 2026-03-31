import openai
import os
import json
import requests
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_QWEN3_APIKEY")

BASE_DIR = Path(__file__).parent.parent
PROMPT_FILE = BASE_DIR / "prompts" / "sympy_prompt.txt"

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

    def generate_and_solve(self, problem_text: str, facts_json: dict, current_points: dict, validation_failures: list, base_a_value: float) -> dict:
        print(f"\n[SYMPY_ENGINE] Starting calling LLM to write Python script...")
        
        system_prompt = PROMPT_FILE.read_text(encoding="utf-8")
        
        user_prompt = f"""
        SOLVE 3D COORDINATE GEOMETRY PROBLEM:
        {problem_text}
        
        EXTRACTED DATA FROM THE PROBLEM (GEOMETRIC CONSTRAINTS):
        {json.dumps(facts_json, ensure_ascii=False, indent=2)}
        
        CURRENT COORDINATES (ALREADY CALCULATED BY BACKEND - REUSE BUT PAY ATTENTION TO FAULTY POINTS):
        {json.dumps(current_points, ensure_ascii=False, indent=2)}
        
        CONSTRAINTS THAT ARE BEING VIOLATED (NEED TO FIX ERRORS):
        {json.dumps(validation_failures, ensure_ascii=False, indent=2)}
        
        !!! ORIGINAL PARAMETER FOR EDGE `a` 
        The variable `a` in the problem has been defined by C# as: {base_a_value}
        You MUST assign the variable a = {base_a_value} in your code!
        """

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        MAX_RETRIES = 3
        for attempt in range(1, MAX_RETRIES + 1):
            print(f"\n[SYMPY_ENGINE] --- ATTEMPT {attempt}/{MAX_RETRIES} ---")
            try:
                response = self.client.chat.completions.create(
                    model="google/gemini-2.5-flash",
                    messages=messages,
                    temperature=0.1,
                    timeout=60.0
                )
                raw_code = response.choices[0].message.content
                print(f"[SYMPY_ENGINE] Received Script from LLM ({len(raw_code)} ký tự).")
            except Exception as e:
                print(f"[SYMPY_ENGINE] ❌ Error calling LLM API: {str(e)}")
                return {"status": "error", "message": f"Error calling LLM API: {str(e)}"}

            clean_code = raw_code.strip()
            if clean_code.startswith("```python"):
                clean_code = clean_code[9:]
            elif clean_code.startswith("```"):
                clean_code = clean_code[3:]
            if clean_code.endswith("```"):
                clean_code = clean_code[:-3]
            clean_code = clean_code.strip()

            print(f"[SYMPY_ENGINE] Sending script to Math Sandbox (:8002)...")
            try:
                sandbox_resp = requests.post(
                    self.sandbox_url,
                    json={"code": clean_code},
                    timeout=20
                )
                data = sandbox_resp.json()
            except requests.exceptions.RequestException as e:
                print(f"[SYMPY_ENGINE] ❌ Error connecting to Math Sandbox: {str(e)}")
                return {"status": "error", "message": f"Error connecting to Docker: {str(e)}"}

            if sandbox_resp.status_code == 200:
                print(f"[SYMPY_ENGINE] 🟢 SUCCESS! Sandbox returned coordinates after {attempt} attempts!")
                return data
            else:
                error_detail = data.get("detail", str(data))
                print(f"[SYMPY_ENGINE] 🔴 SANDBOX ERROR (Attempt {attempt}):\n{error_detail}")
                
                if attempt < MAX_RETRIES:
                    print(f"[SYMPY_ENGINE] Self-healing")
                    messages.append({"role": "assistant", "content": raw_code})
                    messages.append({
                        "role": "user", 
                        "content": f"The Python script failed with this exception Traceback:\n{error_detail}\n\nPlease fix the bug and rewrite the ENTIRE script. Output ONLY Python code without markdown."
                    })
                else:
                    print(f"[SYMPY_ENGINE] 💣 FAILED! Tried {MAX_RETRIES} times but still failed. Return error to BE.")
                    return {"status": "error", "message": "Sandbox execute code error (Failed 3 times).", "details": data}
                    
        return {"status": "error", "message": "Unknown error in Loop."}
