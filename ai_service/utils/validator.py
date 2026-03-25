import json
import re
from pathlib import Path
from jsonschema import Draft7Validator # Import thêm Draft7Validator

BASE_DIR = Path(__file__).parent.parent
SCHEMA_PATH = BASE_DIR / "schemas" / "geometry_schema.json"
schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
validator = Draft7Validator(schema) # Khởi tạo Validator gốc

def clean_markdown_json(raw_text: str) -> str:
    cleaned = re.sub(r'^```json\s*', '', raw_text.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r'\s*```$', '', cleaned)
    return cleaned.strip()

def validate_json(raw_data):
    try:
        parsed_data = json.loads(raw_data) if isinstance(raw_data, str) else raw_data
        
        errors = sorted(validator.iter_errors(parsed_data), key=lambda e: e.path)
        
        if not errors:
            return True, None
            
        error_messages = []
        for error in errors:
            path = " -> ".join([str(p) for p in error.path])
            if not path:
                path = "root"
            error_messages.append(f"- Lỗi: {error.message} (tại: '{path}')")
            
        return False, "\n".join(error_messages)
        
    except json.JSONDecodeError as e:
        return False, f"Lỗi cú pháp JSON: {str(e)}"