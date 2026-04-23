import json
from pathlib import Path

BASE_DIR = Path(__file__).parent
ENUM_DIR = BASE_DIR.parent / "schemas" / "enums"
SCHEMA_DIR = BASE_DIR.parent / "schemas"
RULE_DIR = BASE_DIR.parent / "schemas" / "rules"

# ======================
# LOAD FILES
# ======================

def load_text(file_path: Path) -> str:
    return file_path.read_text(encoding="utf-8").strip()

def load_json(file_path: Path):
    return json.loads(file_path.read_text(encoding="utf-8"))

# ======================
# LOAD ENUMS
# ======================

def load_enum(file_name: str, key: str):
    data = load_json(ENUM_DIR / file_name)
    return data[key]


def build_enum_block() -> str:
    angle_types = load_enum("angle_types.json", "angle_types")
    fact_types = load_enum("fact_types.json", "fact_types")
    geometry_objects = load_enum("geometry_objects.json", "object_types")
    intersection_types = load_enum("intersection_types.json", "intersection_result_types")
    query_types = load_enum("query_types.json", "query_types")
    shape_types = load_enum("shape_types.json", "shape_types")

    return f"""
VALID ANGLE TYPES:
- {', '.join(angle_types)}

VALID FACT TYPES:
- {", ".join(fact_types)}

VALID GEOMETRY TYPES:
- {', '.join(geometry_objects)}

VALID INTERSECTION TYPES:
- {', '.join(intersection_types)}

VALID QUERY TYPES:
- {", ".join(query_types)}

VALID SHAPE TYPES:
- {", ".join(shape_types)}
""".strip()

# ======================
# LOAD RULES
# ======================

def load_rules(file_name: str) -> str:
    try:
        rules = load_json(RULE_DIR / file_name)
        return json.dumps(rules, ensure_ascii=False, indent=2) 
    except FileNotFoundError:
        return ""

def build_rules_prompt() -> str:
    entity_inference = load_rules("entity_inference_rules.json")
    expression_rules = load_rules("expression_rules.json")
    semantic_rules = load_rules("semantic_rules.json")
    
    return f"""
ENTITY INFERENCE RULES:
{entity_inference}

EXPRESSION RULES:
{expression_rules}

SEMANTIC RULES:
{semantic_rules}
""".strip()
    

# ======================
# TEMPLATE BLOCK
# ======================

def build_template_block():
    template = load_json(SCHEMA_DIR / "JSON_templete.json")
    return json.dumps(template, ensure_ascii=False, indent=2)


# ======================
# FEW SHOT
# ======================

def build_few_shot_block():
    few_shots = load_json(BASE_DIR / "few_shots.json")

    examples = []
    for ex in few_shots:
        examples.append(
            f"""
Input:
{ex['input']}

Output:
{json.dumps(ex['output'], ensure_ascii=False)}
""".strip()
        )

    return "\n\n".join(examples)


# ======================
# MAIN BUILDER
# ======================

def build_prompt(problem_text: str):
    template_block = build_template_block()
    enum_block = build_enum_block()
    few_shot_block = build_few_shot_block()
    rules_block = build_rules_prompt()

    system_prompt = f"""
You are a STRICT NLP Extraction System. Your ONLY job is to extract text into structured JSON.
YOU ARE NOT A MATH SOLVER. DO NOT ATTEMPT TO SOLVE, INFER, OR VALIDATE THE GEOMETRY PROBLEM.

Strict Rules:
- Output MUST be valid JSON.
- DO NOT check if the geometric constraints are mathematically consistent.
- Extract facts exactly as written in the text. 
- DO NOT add extra fields or invent new keys.
- DO NOT explain or output any text outside the JSON block.
- Follow the exact structure of the template.
- The 'language' field must always be 'vi' and any 'notes' must be written in Vietnamese.

CRITICAL RULES FOR ENTITIES:
1. PLANES: Only include a plane in 'entities.planes' if it is a distinct geometric entity mentioned in the text (e.g., "mặt phẳng (P)", "mặt phẳng (α)") hoặc là mặt phẳng cắt (cross-section). 
   - KHÔNG trích xuất các mặt bên hoặc mặt đáy của hình khối (như "ABCD", "SBC") vào danh sách 'entities.planes' nếu chúng đã là một phần của khối đa diện (như "S.ABCD").
   - Các mặt phẳng liên quan đến câu hỏi tính toán (như "khoảng cách đến (SBC)") sẽ được ghi nhận trực tiếp trong phần 'queries' mà không cần liệt kê trong 'entities.planes'.
2. OVER-INFERENCE: Tuyệt đối KHÔNG tự ý thêm các thực thể như 'spheres' (mặt cầu) hay 'circles' (đường tròn) nếu văn bản không nhắc đến, ngay cả khi các tính chất hình học (như SA=SB=SC=SD) gợi ý về sự tồn tại của chúng.
3. PLANE NAMES: Trích xuất tên mặt phẳng KHÔNG bao gồm dấu ngoặc đơn (ví dụ: "SBD" thay vì "(SBD)").
4. MATH EXPRESSIONS: Định dạng mọi biểu thức toán học và độ dài dưới dạng biểu thức code (ví dụ: "a * sqrt(3) / 2").
5. EQUIDISTANT APEX & PROJECTION: 
   - Nếu "Đỉnh cách đều các đỉnh của đáy" (ví dụ: A' cách đều A, B, C), TRÍCH XUẤT fact 'equality' (ví dụ: A'A = A'B = A'C) và fact 'circumcenter' (nếu đề bài có sẵn điểm tương ứng).
   - TUYỆT ĐỐI KHÔNG sáng tạo hay suy luận fact 'projection' (hình chiếu) của đỉnh lên mặt đáy, trừ khi đề bài NÊU TRỰC TIẾP (ví dụ: \"Hình chiếu vuông góc của S...\").
   - KHÔNG ĐƯỢC suy diễn thêm fact 'projection' như là một hệ quả toán học.
   - TUYỆT ĐỐI KHÔNG sinh thêm điểm mới (O, H, I...) nếu đã có một điểm trong đề bài có thể đảm nhiệm vai trò hình học tương đương.
6. EQUALITY: Sử dụng Fact type 'equality' cho các biểu thức bằng nhau như "AA' = BB' = CC'". 
7. ENTITIES: Nhớ liệt kê các điểm đặc biệt (O, I, G, H...) vào 'entities.points'.
8. NO NOISE: Hãy giữ JSON sạch nhất có thể bằng cách bám sát các thực thể có tên trong văn bản.
""".strip()

    user_prompt = f"""
TEMPLATE:
{template_block}

{enum_block}

RULE:
{rules_block}

EXAMPLES:
{few_shot_block}

PROBLEM:
{problem_text}

Return JSON only.
""".strip()

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]