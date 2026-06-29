import json
import os
import re
import requests
from pathlib import Path
from api.llm_provider import llm_provider
from api.llm_config import SOLVE_MATH_TIMEOUT, SOLVE_MATH_FALLBACK_TIMEOUT

BASE_DIR = Path(__file__).parent.parent
PROMPT_FILE = BASE_DIR / "prompts" / "sympy_prompt.txt"

class SympyAIEngine:
    def __init__(self):
        self.sandbox_url = os.getenv("SANDBOX_URL", "http://localhost:8002/execute")

    def _clean_generated_code(self, raw_code: str) -> str:
        clean_code = raw_code.strip()

        fenced = re.search(r"```(?:python|py)?\s*(.*?)```", clean_code, flags=re.IGNORECASE | re.DOTALL)
        if fenced:
            clean_code = fenced.group(1).strip()

        # Some model responses prepend prose before the actual script. Keep the code
        # portion only so sandbox never receives natural-language analysis.
        import_idx = clean_code.find("import sympy")
        if import_idx > 0:
            clean_code = clean_code[import_idx:].strip()

        return clean_code

    def _validate_python_script(self, code: str) -> str | None:
        if not code:
            return "Generated response is empty."

        required_markers = ("import sympy", "def solve_from_scratch", "json.dumps")
        missing = [marker for marker in required_markers if marker not in code]
        if missing:
            return f"Generated response is not a complete SymPy script. Missing: {', '.join(missing)}"

        try:
            compile(code, "<generated_sympy_script>", "exec")
        except SyntaxError as exc:
            return f"Generated Python has syntax error at line {exc.lineno}: {exc.msg}"

        return None

    def generate_and_solve(self, problem_text: str, facts_json: dict, current_points: dict, validation_failures: list, base_a_value: float, fail_fast: bool = False) -> dict:
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

        MAX_RETRIES = 1 if fail_fast else 3
        for attempt in range(1, MAX_RETRIES + 1):
            print(f"\n[SYMPY_ENGINE] --- ATTEMPT {attempt}/{MAX_RETRIES} ---")
            try:
                raw_code = llm_provider.get_completion(
                    messages,
                    timeout=SOLVE_MATH_TIMEOUT,
                    fallback_timeout=SOLVE_MATH_FALLBACK_TIMEOUT,
                    allow_fallback=not fail_fast,
                )
                print(f"[SYMPY_ENGINE] Received Script from LLM ({len(raw_code)} ký tự).")
            except Exception as e:
                print(f"[SYMPY_ENGINE] ❌ Error calling LLM API: {str(e)}")
                if attempt < MAX_RETRIES:
                    messages.append({
                        "role": "user",
                        "content": "The model call timed out or failed before producing code. Try again and output ONLY a complete Python script, no explanation."
                    })
                    continue
                return {"status": "error", "message": f"Error calling LLM API: {str(e)}"}

            clean_code = self._clean_generated_code(raw_code)
            validation_error = self._validate_python_script(clean_code)
            if validation_error:
                print(f"[SYMPY_ENGINE] 🟠 INVALID SCRIPT BEFORE SANDBOX (Attempt {attempt}): {validation_error}")
                if attempt < MAX_RETRIES:
                    messages.append({"role": "assistant", "content": raw_code})
                    messages.append({
                        "role": "user",
                        "content": (
                            f"Your previous response was rejected before execution: {validation_error}\n"
                            "Rewrite the ENTIRE answer as raw Python code only. "
                            "Do not include analysis, markdown, comments outside Python syntax, or explanatory text."
                        )
                    })
                    continue
                return {"status": "error", "message": "Generated script is invalid.", "details": validation_error}

            print(f"[SYMPY_ENGINE] Sending script to Math Sandbox (:8002)...")
            try:
                headers = {}
                if os.getenv("INTERNAL_API_KEY"):
                    headers["x-api-key"] = os.getenv("INTERNAL_API_KEY")
                sandbox_resp = requests.post(
                    self.sandbox_url,
                    json={"code": clean_code},
                    headers=headers,
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
                    return {"status": "error", "message": "Sandbox execute code error.", "details": data}
                    
        return {"status": "error", "message": "Unknown error in Loop."}
