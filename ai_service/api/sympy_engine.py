import json
import requests
from pathlib import Path
from api.llm_provider import llm_provider

BASE_DIR = Path(__file__).parent.parent
PROMPT_FILE = BASE_DIR / "prompts" / "sympy_prompt.txt"

class SympyAIEngine:
    def __init__(self):
        self.sandbox_url = "http://localhost:8002/execute"

    def generate_and_solve(self, problem_text: str, facts_json: dict, current_points: dict, validation_failures: list, base_a_value: float) -> dict:
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
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
                raw_code = llm_provider.get_completion(messages)
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

            # Save debug info even before failure/success (Redundant logging for safety)
            try:
                debug_log_path = BASE_DIR.parent / "sympyBin" / f"debug_{timestamp}_{attempt}.txt"
                is_failed = (sandbox_resp.status_code != 200 or 
                             data.get("status") == "error" or 
                             (isinstance(data.get("data"), dict) and data.get("data", {}).get("STATUS") == "ERROR"))
                
                with open(debug_log_path, "w", encoding="utf-8") as f:
                    f.write(f"PROBLEM:\n{problem_text}\n\n")
                    f.write(f"CODE:\n{clean_code}\n\n")
                    if is_failed:
                        f.write(f"ERROR RESULT:\n{json.dumps(data, indent=2)}")
                    else:
                        f.write(f"SUCCESS RESULT:\n{json.dumps(data, indent=2)}")
            except: pass

            if sandbox_resp.status_code == 200 and data.get("status") != "error" and not (isinstance(data.get("data"), dict) and data.get("data").get("STATUS") == "ERROR"):
                print(f"[SYMPY_ENGINE] 🟢 SUCCESS! Sandbox returned coordinates after {attempt} attempts!")
                return data
            else:
                error_detail = data.get("message", data.get("detail", str(data)))
                print(f"[SYMPY_ENGINE] 🔴 SANDBOX ERROR (Attempt {attempt}):\n{error_detail}")
                
                if attempt < MAX_RETRIES:
                    advice = ""
                    if "Could not find root" in error_detail:
                        advice = "\nPRO TIP: This usually means your system is OVER-CONSTRAINED (Equations > Variables). Ensure you have EXACTLY as many variables as equations."
                    if "positive-definite" in error_detail:
                        advice = "\nPRO TIP: This usually means your system is INCONSISTENT or equations are redundant/singular. Try to simplify the geometric constraints."
                    
                    messages.append({"role": "assistant", "content": raw_code})
                    messages.append({
                        "role": "user", 
                        "content": f"The Python script failed with this exception Traceback:\n{error_detail}\n{advice}\n\nPlease fix the bug and rewrite the ENTIRE script. Output ONLY Python code without markdown."
                    })
                else:
                    print(f"[SYMPY_ENGINE] 💣 FAILED! Tried {MAX_RETRIES} times but still failed. Return error to BE.")
                    return {"status": "error", "message": "Sandbox execute code error (Failed 3 times).", "details": data}
                    
        return {"status": "error", "message": "Unknown error in Loop."}
