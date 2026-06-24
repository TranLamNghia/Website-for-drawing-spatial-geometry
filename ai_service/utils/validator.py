import json
import re
from pathlib import Path
from jsonschema import Draft7Validator
from datetime import datetime

BASE_DIR = Path(__file__).parent.parent
SCHEMA_PATH = BASE_DIR / "schemas" / "geometry_schema.json"
schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))

def _ensure_query_type_support(schema_obj: dict, query_type: str) -> None:
    try:
        query_enum = (
            schema_obj
            .setdefault("properties", {})
            .setdefault("queries", {})
            .setdefault("items", {})
            .setdefault("properties", {})
            .setdefault("type", {})
            .setdefault("enum", [])
        )
        if query_type not in query_enum:
            query_enum.append(query_type)

        definitions = schema_obj.setdefault("definitions", {})
        query_def = definitions.setdefault("query_intersection_line", {
            "if": {
                "properties": {
                    "type": {
                        "const": query_type
                    }
                }
            },
            "then": {
                "properties": {
                    "data": {
                        "type": "object",
                        "additionalProperties": True
                    }
                }
            }
        })
        if isinstance(query_def, dict):
            query_def.setdefault("if", {}).setdefault("properties", {}).setdefault("type", {}).setdefault("const", query_type)
            then_props = query_def.setdefault("then", {}).setdefault("properties", {})
            then_props.setdefault("data", {}).setdefault("type", "object")
            then_props["data"].setdefault("additionalProperties", True)

        query_all_of = (
            schema_obj
            .setdefault("properties", {})
            .setdefault("queries", {})
            .setdefault("items", {})
            .setdefault("allOf", [])
        )
        if not any(isinstance(item, dict) and item.get("$ref") == "#/definitions/query_intersection_line" for item in query_all_of):
            query_all_of.append({"$ref": "#/definitions/query_intersection_line"})
    except Exception:
        # Keep validator resilient even if schema structure changes.
        pass

_ensure_query_type_support(schema, "intersection_line")
validator = Draft7Validator(schema) # Initialize Base Validator

def clean_markdown_json(raw_text: str) -> str:
    cleaned = re.sub(r'^```json\s*', '', raw_text.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r'\s*```$', '', cleaned)
    return cleaned.strip()

def _save_debug_json(raw_data, prefix="schema_error"):
    try:
        bin_dir = Path(r"c:\Users\Tln.Ganyu\Desktop\SpatialGeometry\jsonBin")
        bin_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        file_path = bin_dir / f"{timestamp}_{prefix}.json"
        
        safe_content = json.dumps(raw_data, indent=2, ensure_ascii=False) if isinstance(raw_data, dict) else str(raw_data)
        file_path.write_text(safe_content, encoding="utf-8")
        print(f"[VALIDATOR] Saved error JSON to: {file_path}")
    except Exception as io_err:
        print(f"[VALIDATOR] Failed to save error JSON: {io_err}")

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
            error_messages.append(f"- Error: {error.message} (at: '{path}')")
            
        error_str = "\n".join(error_messages)
        
        # Save failed JSON for debugging schema errors
        _save_debug_json(parsed_data, "schema_error")

        return False, error_str
        
    except json.JSONDecodeError as e:
        # Save failed raw text for debugging syntax errors
        _save_debug_json(raw_data, "syntax_error")
        return False, f"JSON syntax error: {str(e)}"
