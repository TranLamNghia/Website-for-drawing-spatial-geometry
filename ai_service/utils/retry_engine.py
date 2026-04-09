from .validator import validate_json, clean_markdown_json
from api.llm_provider import llm_provider

def simplify_error(error):
    return str(error)

class RetryEngine:
    def __init__(self, max_retries=2):
        self.max_retries = max_retries

    def repair(self, raw_json: str, error_msg: str) -> str:
        try:
            from prompts.prompt_builder import build_rules_prompt
            rules = build_rules_prompt()
        except:
            rules = ""
            
        repair_prompt = f"""
        You MUST fix the following JSON to strictly match the schema.
        ERROR: {error_msg}
        RAW JSON: {raw_json}
        
        RULES YOU MUST FOLLOW WHEN FIXING:
        {rules}
        
        Return the FULL, COMPLETE FIXED JSON including all root keys (metadata, entities, facts, queries, extraction_meta). DO NOT truncate or omit any section.
        Return ONLY the JSON.
        """
        
        messages = [
            {"role": "system", "content": "You are an AI JSON fixer. Return ONLY valid JSON."},
            {"role": "user", "content": repair_prompt}
        ]

        print("     [RETRY_ENGINE] Requesting AI to fix error...")
        try:
            return llm_provider.get_completion(messages)
        except Exception as e:
            print(f"     [RETRY_ENGINE] ❌ Repair failed: {str(e)}")
            return raw_json # Return original if fix fails completely

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
