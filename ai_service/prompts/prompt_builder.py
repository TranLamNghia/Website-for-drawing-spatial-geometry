import json
from pathlib import Path

BASE_DIR = Path(__file__).parent
ENUM_DIR = BASE_DIR.parent / "schemas" / "enums"
SCHEMA_DIR = BASE_DIR.parent / "schemas"
RULE_DIR = BASE_DIR.parent / "rules"

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
YOU ARE NOT A MATH SOLVER. DO NOT ATTEMPT TO SOLVE OR VALIDATE THE GEOMETRY PROBLEM.

Strict Rules:
- Output MUST be valid JSON.
- DO NOT check if the geometric constraints are mathematically consistent, possible, or solvable.
- Extract facts exactly as written in the text, even if they mathematically contradict each other. 
- Do NOT add extra fields or invent new keys.
- Do NOT explain or output any text outside the JSON block.
- Follow the exact structure of the template.
- The 'language' field must always be 'vi' and any 'notes' must be written in Vietnamese.
- CRITICAL: Extract plane names WITHOUT parentheses (e.g., output "SBD" instead of "(SBD)").
- CRITICAL: Format ALL math expressions and lengths as code expressions (e.g., output "a * sqrt(3) / 4" instead of "a√3/4"). Use *, /, +, -, and sqrt() explicitly.
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