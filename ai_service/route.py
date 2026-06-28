from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
import json
import os
import re
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
    _ensure_solid_wireframe_segments(data)

    return data


def _wireframe_segments_for_solid_target(target: str) -> list[str]:
    """Sinh đủ cạnh khung lăng trụ/chóp từ target dạng ABCD.A'B'C'D' hoặc S.ABCD."""
    if not isinstance(target, str) or "." not in target:
        return []

    face1_raw, face2_raw = target.split(".", 1)
    face1 = _parse_point_labels(face1_raw)
    face2 = _parse_point_labels(face2_raw)
    segs: list[str] = []

    if len(face1) == 1 and len(face2) >= 3:
        apex = face1[0]
        for v in face2:
            segs.append(f"{apex}{v}")
        for i in range(len(face2)):
            segs.append(f"{face2[i]}{face2[(i + 1) % len(face2)]}")
    elif len(face1) >= 3 and len(face1) == len(face2):
        for i in range(len(face1)):
            segs.append(f"{face1[i]}{face1[(i + 1) % len(face1)]}")
            segs.append(f"{face2[i]}{face2[(i + 1) % len(face2)]}")
            segs.append(f"{face1[i]}{face2[i]}")
    return segs


def _wireframe_segments_for_polygon(labels: list[str]) -> list[str]:
    if len(labels) < 3:
        return []
    return [f"{labels[i]}{labels[(i + 1) % len(labels)]}" for i in range(len(labels))]


_SOLID_SHAPE_TYPES = {
    "prism", "regular_prism", "cube", "regular_cube", "rectangular_cuboid",
    "regular_rectangular_cuboid", "parallelepiped", "regular_parallelepiped",
    "pentagonal_prism", "hexagonal_prism", "frustum", "cylinder", "regular_cylinder",
    "pyramid", "regular_pyramid", "right_pyramid", "regular_right_pyramid",
    "pentagonal_pyramid", "hexagonal_pyramid", "tetrahedron",
}

_POLYGON_SHAPE_TYPES = {
    "triangle", "right_triangle", "isosceles_triangle", "isosceles_right_triangle",
    "equilateral_triangle", "square", "rectangle", "parallelogram", "rhombus",
    "trapezoid", "pentagon", "hexagon",
}


def _ensure_solid_wireframe_segments(data: dict) -> None:
    """Bổ sung entities.segments / entities.solids để backend không lọc mất cạnh đáy."""
    entities = data.get("entities")
    facts = data.get("facts")
    if not isinstance(entities, dict) or not isinstance(facts, list):
        return

    points = entities.setdefault("points", [])
    segments = entities.setdefault("segments", [])
    solids = entities.setdefault("solids", [])
    if not isinstance(points, list):
        points = []
        entities["points"] = points
    if not isinstance(segments, list):
        segments = []
        entities["segments"] = segments
    if not isinstance(solids, list):
        solids = []
        entities["solids"] = solids

    point_set = {p.upper() for p in points if isinstance(p, str)}
    seg_set = {s.upper() for s in segments if isinstance(s, str)}
    solid_set = {s.upper() for s in solids if isinstance(s, str)}

    def add_point(label: str) -> None:
        if label and label not in point_set:
            points.append(label)
            point_set.add(label)

    def add_segment(seg: str) -> None:
        if not seg:
            return
        key = seg.upper()
        if key not in seg_set:
            segments.append(seg)
            seg_set.add(key)
        for label in _parse_point_labels(seg):
            add_point(label)

    def add_solid(name: str) -> None:
        key = name.upper()
        if key not in solid_set:
            solids.append(name)
            solid_set.add(key)

    for fact in facts:
        if not isinstance(fact, dict) or fact.get("type") != "shape":
            continue
        fact_data = fact.get("data")
        if not isinstance(fact_data, dict):
            continue

        shape = str(fact_data.get("shape", "")).lower()
        target = fact_data.get("target")
        if not isinstance(target, str) or not target.strip():
            continue

        target = target.strip()

        if shape in _SOLID_SHAPE_TYPES and "." in target:
            add_solid(target)
            for label in _parse_point_labels(target):
                add_point(label)
            for seg in _wireframe_segments_for_solid_target(target):
                add_segment(seg)
        elif shape in _POLYGON_SHAPE_TYPES:
            labels = _parse_point_labels(target)
            for label in labels:
                add_point(label)
            for seg in _wireframe_segments_for_polygon(labels):
                add_segment(seg)


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

_COORD_RE = re.compile(
    r"([A-Z][0-9]*'*)\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*(?:,\s*(-?\d+(?:\.\d+)?)\s*)?\)"
)


def inject_given_coordinates(data: dict, problem_text: str) -> dict:
    """Đề hình học tọa độ cho sẵn điểm (vd 'A(1, 0)', 'C(5, 5)').

    LLM không có chỗ hợp lệ để biểu diễn nên hay bịa fact 'coordinates'.
    Ta parse trực tiếp từ đề và đưa vào field top-level 'points' (backend dùng
    làm điểm cố định, không bị fallback ghi đè).
    """
    if not isinstance(data, dict) or not isinstance(problem_text, str):
        return data

    found: dict[str, dict] = {}
    for match in _COORD_RE.finditer(problem_text):
        label = match.group(1).upper()
        try:
            x = float(match.group(2))
            y = float(match.group(3))
            z = float(match.group(4)) if match.group(4) is not None else 0.0
        except (TypeError, ValueError):
            continue
        found[label] = {"x": x, "y": y, "z": z}

    if not found:
        return data

    points = data.get("points")
    if not isinstance(points, dict):
        points = {}
    # Đề là nguồn chân lý cho tọa độ cho sẵn → ghi đè giá trị LLM nếu lệch.
    for label, coord in found.items():
        points[label] = coord
    data["points"] = points

    entities = data.setdefault("entities", {})
    if isinstance(entities, dict):
        entity_points = entities.setdefault("points", [])
        if isinstance(entity_points, list):
            existing = {p.upper() for p in entity_points if isinstance(p, str)}
            for label in found:
                if label not in existing:
                    entity_points.append(label)
                    existing.add(label)

    # Dọn fact 'coordinates' rác nếu LLM lỡ tạo (không thuộc schema fact).
    facts = data.get("facts")
    if isinstance(facts, list):
        data["facts"] = [
            f for f in facts
            if not (isinstance(f, dict) and str(f.get("type", "")).lower() == "coordinates")
        ]

    print(f"[EXTRACT] Đã nạp {len(found)} điểm tọa độ cho sẵn từ đề: {', '.join(found)}")
    return data


_COORD_PLANE_NAMES = {"OXY", "OYZ", "OXZ", "XOY", "YOZ", "XOZ", "OXYZ"}


def _is_coordinate_plane(label: str) -> bool:
    if not isinstance(label, str):
        return False
    norm = re.sub(r"[()\s]", "", label).upper()
    if norm in _COORD_PLANE_NAMES:
        return True
    chars = set(norm)
    return len(norm) >= 3 and "O" in chars and chars.issubset({"O", "X", "Y", "Z"})


def strip_coordinate_plane_artifacts(data: dict) -> dict:
    """Loại bỏ rác từ mặt phẳng tọa độ '(Oxy)'.

    '(Oxy)' chỉ ý chỉ đáy nằm trên z = 0, KHÔNG phải mặt phẳng/điểm cần dựng.
    LLM hay trích nhầm thành plane entity, điểm phantom O/X/Y, fact belongs_to,
    hoặc mặt cắt → gây sai pointIntegrity và mặt cắt phantom.
    """
    if not isinstance(data, dict):
        return data

    entities = data.get("entities")
    if not isinstance(entities, dict):
        return data

    # 1) Bỏ mặt phẳng tọa độ khỏi entities.planes
    planes = entities.get("planes")
    if isinstance(planes, list):
        entities["planes"] = [p for p in planes if not _is_coordinate_plane(p)]

    # 2) Bỏ section có mặt cắt là mặt phẳng tọa độ
    sections = entities.get("sections")
    if isinstance(sections, list):
        kept_sections = []
        for sec in sections:
            cp = sec.get("cuttingPlane") if isinstance(sec, dict) else None
            cp_label = "".join(cp) if isinstance(cp, list) else (cp if isinstance(cp, str) else "")
            if _is_coordinate_plane(cp_label):
                continue
            kept_sections.append(sec)
        entities["sections"] = kept_sections

    # 3) Bỏ fact tham chiếu mặt phẳng tọa độ (belongs_to/coplanar/parallel...)
    facts = data.get("facts")
    if isinstance(facts, list):
        kept_facts = []
        for f in facts:
            if not isinstance(f, dict):
                kept_facts.append(f)
                continue
            fdata = f.get("data") if isinstance(f.get("data"), dict) else {}
            refs = []
            for key in ("target", "to", "from", "onto"):
                if isinstance(fdata.get(key), str):
                    refs.append(fdata[key])
            for key in ("objects", "planes"):
                if isinstance(fdata.get(key), list):
                    refs.extend([v for v in fdata[key] if isinstance(v, str)])
            if any(_is_coordinate_plane(r) for r in refs):
                continue
            kept_facts.append(f)
        data["facts"] = kept_facts

    # 4) Bỏ điểm phantom O/X/Y/Z nếu không còn được tham chiếu ở đâu khác
    pts = entities.get("points")
    if isinstance(pts, list):
        referenced: set[str] = set()
        for key in ("segments", "rays", "vectors", "planes", "solids", "circles", "spheres"):
            for item in entities.get(key, []) or []:
                if isinstance(item, str):
                    referenced.update(re.findall(r"[A-Z][0-9]*'*", item.upper()))
        for f in data.get("facts", []) or []:
            if isinstance(f, dict):
                referenced.update(re.findall(r"[A-Z][0-9]*'*", json.dumps(f.get("data", {})).upper()))
                fdata = f.get("data") if isinstance(f.get("data"), dict) else {}
                center = fdata.get("center")
                if isinstance(center, str):
                    referenced.add(center.upper())
                point = fdata.get("point")
                if isinstance(point, str):
                    referenced.add(point.upper())
        for name in (data.get("points") or {}):
            referenced.add(str(name).upper())

        entities["points"] = [
            p for p in pts
            if not (isinstance(p, str) and p.upper() in {"O", "X", "Y", "Z"} and p.upper() not in referenced)
        ]

    return data


def normalize_sphere_tangent_artifacts(data: dict) -> dict:
    """Đảm bảo O/K có trong entities.points cho bài mặt cầu tiếp xúc mp (P)."""
    if not isinstance(data, dict):
        return data

    entities = data.get("entities")
    if not isinstance(entities, dict):
        return data

    points = entities.setdefault("points", [])
    if not isinstance(points, list):
        return data

    point_set = {p.upper() for p in points if isinstance(p, str)}

    for fact in data.get("facts", []) or []:
        if not isinstance(fact, dict):
            continue
        fdata = fact.get("data") if isinstance(fact.get("data"), dict) else {}

        if fact.get("type") == "shape" and fdata.get("shape") in ("sphere", "regular_sphere"):
            center = fdata.get("center")
            if isinstance(center, str) and center.upper() not in point_set:
                points.append(center)
                point_set.add(center.upper())

        if fact.get("type") == "tangent":
            tangent_pt = fdata.get("point")
            if isinstance(tangent_pt, str) and tangent_pt.upper() not in point_set:
                points.append(tangent_pt)
                point_set.add(tangent_pt.upper())

    return data


@router.post("/extract")
async def extract_geometry(request: ProblemRequest, api_key: str = Depends(verify_api_key)):
    try:
        raw_json = ai_engine.extract_json(request.problem_text)
        parsed_data = json.loads(raw_json)
        parsed_data = post_process_facts(parsed_data)
        parsed_data = inject_given_coordinates(parsed_data, request.problem_text)
        parsed_data = strip_coordinate_plane_artifacts(parsed_data)
        parsed_data = normalize_sphere_tangent_artifacts(parsed_data)
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
