from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
import json
import os
from api.llm_client import GeometryAIEngine
from api.sympy_engine import SympyAIEngine
from typing import Dict, Any

router = APIRouter()
ai_engine = GeometryAIEngine() # Dependency Injection
sympy_engine = SympyAIEngine()

API_KEY = os.getenv("INTERNAL_API_KEY")

async def verify_api_key(x_api_key: str = Header(None)):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid or missing API Key")
    return x_api_key


def build_error_payload(stage: str, message: str, status_code: int = 502, code: str = "AI_SERVICE_ERROR"):
    return {
        "status": "error",
        "code": code,
        "stage": stage,
        "retryable": False,
        "message": message,
        "statusCode": status_code,
    }

class ProblemRequest(BaseModel):
    problem_text: str

def post_process_facts(data: dict) -> dict:
    if not isinstance(data, dict) or "facts" not in data:
        return data

    facts = data["facts"]
    if not isinstance(facts, list):
        return data

    def normalize_seg(name: str) -> str:
        if isinstance(name, str) and len(name) == 2 and name.isalpha() and name.isupper():
            return "".join(sorted(name))
        return name

    equality_groups = []
    for fact in facts:
        if (
            isinstance(fact, dict)
            and fact.get("type") == "equality"
            and isinstance(fact.get("data"), dict)
        ):
            objs = fact["data"].get("objects")
            if isinstance(objs, list):
                segs = [o for o in objs if isinstance(o, str) and len(o) == 2]
                if len(segs) > 1:
                    equality_groups.append(segs)

    length_values = {}
    for fact in facts:
        if (
            isinstance(fact, dict)
            and fact.get("type") == "length"
            and isinstance(fact.get("data"), dict)
        ):
            target = fact["data"].get("target")
            val = fact["data"].get("value")
            if isinstance(target, str) and len(target) == 2 and val:
                norm = normalize_seg(target)
                length_values[norm] = (val, fact.get("raw_text", ""), target)

    new_facts = []
    existing_norms = set(length_values.keys())

    max_id_num = 0
    for fact in facts:
        fid = fact.get("id", "")
        if isinstance(fid, str) and fid.startswith("F"):
            try:
                num = int(fid[1:])
                if num > max_id_num:
                    max_id_num = num
            except ValueError:
                pass

    for group in equality_groups:
        known_norm = None
        known_val = None
        raw_text = ""
        known_original_name = None
        
        for seg in group:
            norm = normalize_seg(seg)
            if norm in length_values:
                known_norm = norm
                known_val, raw_text, known_original_name = length_values[norm]
                break
        
        if known_norm and known_val:
            for seg in group:
                norm = normalize_seg(seg)
                if norm not in existing_norms:
                    max_id_num += 1
                    new_fact = {
                        "id": f"F{max_id_num}",
                        "type": "length",
                        "data": {
                            "target": seg,
                            "value": known_val
                        },
                        "raw_text": f"{seg} bằng {known_original_name} ({raw_text})" if raw_text else f"Độ dài {seg}"
                    }
                    new_facts.append(new_fact)
                    existing_norms.add(norm)

    if new_facts:
        facts.extend(new_facts)
        if "entities" in data and isinstance(data["entities"], dict):
            entities = data["entities"]
            if "segments" in entities and isinstance(entities["segments"], list):
                segs_set = {normalize_seg(s) for s in entities["segments"]}
                for nf in new_facts:
                    target_seg = nf["data"]["target"]
                    if normalize_seg(target_seg) not in segs_set:
                        entities["segments"].append(target_seg)

    _strip_invalid_line_shape_facts(data)

    return data


def _parse_point_labels(value: str) -> list[str]:
    if not isinstance(value, str):
        return []
    import re
    return [m.group(0).upper() for m in re.finditer(r"[A-Z][0-9]*'*", value)]


def _strip_invalid_line_shape_facts(data: dict) -> None:
    """'Cho đường thẳng AB' không dùng fact shape — chỉ cần entities + ray/opposite_ray."""
    facts = data.get("facts")
    if not isinstance(facts, list):
        return

    invalid_shapes = {"line", "straight_line", "segment", "line_segment"}
    entities = data.setdefault("entities", {})
    if not isinstance(entities, dict):
        return

    points = entities.setdefault("points", [])
    segments = entities.setdefault("segments", [])
    if not isinstance(points, list):
        points = []
        entities["points"] = points
    if not isinstance(segments, list):
        segments = []
        entities["segments"] = segments

    point_set = {p.upper() for p in points if isinstance(p, str)}
    seg_set = {s.upper() for s in segments if isinstance(s, str)}

    cleaned = []
    for fact in facts:
        if not isinstance(fact, dict):
            cleaned.append(fact)
            continue

        if (
            fact.get("type") == "shape"
            and isinstance(fact.get("data"), dict)
            and str(fact["data"].get("shape", "")).lower() in invalid_shapes
        ):
            target = fact["data"].get("target", "")
            labels = _parse_point_labels(target)
            for label in labels:
                if label not in point_set:
                    points.append(label)
                    point_set.add(label)
            if len(labels) == 2:
                seg = labels[0] + labels[1]
                if seg not in seg_set:
                    segments.append(seg)
                    seg_set.add(seg)
            continue

        cleaned.append(fact)

    data["facts"] = cleaned

@router.post("/extract")
async def extract_geometry(request: ProblemRequest, api_key: str = Depends(verify_api_key)):
    try:
        raw_json = ai_engine.extract_json(request.problem_text)
        parsed_data = json.loads(raw_json)
        parsed_data = post_process_facts(parsed_data)
        return {"status": "success", "data": parsed_data}
    except ValueError as ve:
        raise HTTPException(status_code=502, detail=build_error_payload("extract", str(ve)))
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail=build_error_payload("extract", "Result is not valid JSON format"))
    except Exception as e:
        raise HTTPException(status_code=502, detail=build_error_payload("extract", f"Internal Server Error: {str(e)}"))

class MathSolverRequest(BaseModel):
    problem_text: str
    facts_json: Dict[str, Any]
    current_points: Dict[str, Any]
    validation_failures: list
    base_a_value: float = 1.0

@router.post("/solve-math")
async def solve_math_geometry(request: MathSolverRequest, api_key: str = Depends(verify_api_key)):
    try:
        result = sympy_engine.generate_and_solve(
            request.problem_text, 
            request.facts_json, 
            request.current_points, 
            request.validation_failures,
            request.base_a_value,
        )
        if result.get("status") == "error":
            error_detail = result.get("details", result.get("message"))
            raise HTTPException(status_code=502, detail=build_error_payload("solve-math", str(error_detail)))
        return result
    except Exception as e:
        raise HTTPException(status_code=502, detail=build_error_payload("solve-math", f"Math Solver Error: {str(e)}"))
