import os
import time
from dotenv import load_dotenv
from prompts.prompt_builder import build_prompt
from utils.retry_engine import RetryEngine
from utils.validator import clean_markdown_json
from .llm_provider import llm_provider


load_dotenv()

class GeometryAIEngine:
    def __init__(self):
        # We now use the central llm_provider instead of managing our own client
        self.retry_engine = RetryEngine()

    def extract_json(self, problem_text: str) -> str:
        print(f"\n[LLM_CLIENT] Starting processing problem: '{problem_text[:40]}...'")
        messages = build_prompt(problem_text)
        
        try:
            raw_json = llm_provider.get_completion(messages)
        except Exception as e:
            print(f"[LLM_CLIENT] ❌ All attempts failed (Primary & Fallback): {str(e)}")
            raise e

        print(f"[LLM_CLIENT] Received raw JSON from AI. Cleaning Markdown...")
        clean_json = clean_markdown_json(raw_json)
        print(f"[LLM_CLIENT] Starting to push into Validator...")
        return self.retry_engine.run(clean_json)