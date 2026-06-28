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
        problem = ex.get("input") or ex.get("problem_text")
        payload = ex.get("output") or ex.get("json")
        if not problem or not payload:
            continue
        examples.append(
            f"""
Input:
{problem}

Output:
{json.dumps(payload, ensure_ascii=False)}
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
3. PLANE NAMES: Trích xuất tên mặt phẳng KHÔNG bao gồm dấu ngoặc đơn (ví dụ: "SBD" thay vì "(SBD)", "P" thay vì "(P)", "Q" thay vì "(Q)", "ALPHA" thay vì "(alpha)").
4. MATH EXPRESSIONS: Định dạng mọi biểu thức toán học và độ dài dưới dạng biểu thức code (ví dụ: "a * sqrt(3) / 2").
5. EQUIDISTANT APEX & PROJECTION: 
   - Nếu "Đỉnh cách đều các đỉnh của đáy" (ví dụ: A' cách đều A, B, C), TRÍCH XUẤT fact 'equality' (ví dụ: A'A = A'B = A'C) và fact 'circumcenter' (nếu đề bài có sẵn điểm tương ứng).
   - TUYỆT ĐỐI KHÔNG sáng tạo hay suy luận fact 'projection' (hình chiếu) của đỉnh lên mặt đáy, trừ khi đề bài NÊU TRỰC TIẾP (ví dụ: \"Hình chiếu vuông góc của S...\").
   - KHÔNG ĐƯỢC suy diễn thêm fact 'projection' như là một hệ quả toán học.
   - TUYỆT ĐỐI KHÔNG sinh thêm điểm mới (O, H, I...) nếu đã có một điểm trong đề bài có thể đảm nhiệm vai trò hình học tương đương.
6. EQUALITY: Sử dụng Fact type 'equality' cho các biểu thức bằng nhau như "AA' = BB' = CC'". 
7. ENTITIES: Nhớ liệt kê TẤT CẢ các điểm có tên (A, B, C, S, M, N, P, K, H, G, O, I...) được nhắc đến trong đề bài vào danh sách 'entities.points'. Tuyệt đối không được bỏ sót các trung điểm hay điểm giao.
8. NO NOISE: Hãy giữ JSON sạch nhất có thể bằng cách bám sát các thực thể có tên trong văn bản.
9. CIRCLES & SPHERES: Khi đề cập mặt cầu (sphere) hoặc đường tròn (circle), dùng fact type là 'shape' (với shape là 'sphere' hoặc 'circle'), và đưa 'center', 'radius' vào trong 'data'. Tuyệt đối không tạo fact type 'center' hay 'radius'.
10. CONE & CYLINDER: Khi đề cập hình nón (cone) hoặc hình trụ (cylinder), dùng fact type 'shape' với shape tương ứng ('cone' hoặc 'cylinder'). Đưa 'center' (tâm đáy), 'radius' (bán kính đáy), 'apex' (đỉnh, chỉ cho nón), và 'height' (chiều cao) vào 'data'. 
11. POLYGON SHAPES: Hỗ trợ các hình: 'pentagonal_pyramid', 'hexagonal_pyramid', 'pentagonal_prism', 'hexagonal_prism', 'frustum'. Với hình chóp cụt (frustum), trích xuất cả đáy lớn và đáy nhỏ như target "ABCD.A'B'C'D'".
12. EQUALITY LENGTHS: Nếu nhiều đoạn thẳng bằng nhau (fact 'equality', ví dụ "các cạnh bên bằng nhau") và độ dài của chúng được cho (ví dụ "bằng 3a"), ngoài việc sinh fact 'equality', hãy sinh các fact 'length' riêng biệt cho TẤT CẢ các đoạn thẳng trong nhóm bằng nhau đó (ví dụ sinh các fact 'length' riêng lẻ cho SA, SB, SC, SD đều bằng "3 * a").
13. INTERSECTION_LINE: Nếu đề bài yêu cầu giao tuyến của hai mặt phẳng, ưu tiên biểu diễn bằng fact type 'intersection' với result.type = 'line'. Chỉ dùng query type 'intersection_line' khi thật sự cần giữ riêng phần truy vấn, và luôn giữ 'data' thật rõ ràng với các mặt phẳng liên quan.
14. PARALLEL / PERPENDICULAR (ĐỢT 2): Dùng fact 'parallel' hoặc 'perpendicular' với data.objects là mảng đúng 2 phần tử.
   - Hai đường: ['AB', 'CD']
   - Đường và mặt: ['AB', 'CDE'] (đoạn trước, mặt sau)
   - Hai mặt: ['ABC', 'DEF']
15. RAY / OPPOSITE_RAY / PERPENDICULAR_RAY (ĐỢT 2):
   - 'ray': {{ point, origin, ray_point }} — point là điểm mới trên tia, origin là gốc tia, ray_point là điểm thứ hai xác định hướng (ví dụ tia AB: origin='A', ray_point='B').
   - 'opposite_ray': cùng cấu trúc, cho tia đối của origin-ray_point.
   - 'perpendicular_ray': {{ point, origin, perpendicular_to }} — perpendicular_to là tên đoạn hoặc mặt phẳng vuông góc.
16. ANGLE_BISECTOR (ĐỢT 2): {{ point, vertex, ray_1, ray_2 }}. ray_1 và ray_2 là TÊN ĐIỂM trên hai cạnh góc, không phải tên đoạn/tia. Góc BAC: vertex='A', ray_1='B', ray_2='C'.
17. CENTROID vs TÂM ĐẶC BIỆT (ĐỢT 3):
   - 'centroid' (trọng tâm): dùng data.objects = ['ABC'], KHÔNG dùng key 'shape'.
   - 'incenter', 'orthocenter', 'circumcenter': dùng data.shape = 'ABC', KHÔNG dùng key 'objects'.
   - Luôn có data.point là tên điểm đã cho trong đề (G, I, H, O...).
18. INSCRIBED / CIRCUMSCRIBED (ĐỢT 3):
   - 'inscribed': inner = TÊN ĐIỂM tâm cần dựng, outer = TÊN HÌNH bao (tam giác 'ABC' hoặc khối 'S.ABCD'). Ví dụ: {{ inner: 'I', outer: 'S.ABCD' }}.
   - 'circumscribed': outer = TÊN ĐIỂM tâm cần dựng, inner = TÊN HÌNH được ngoại tiếp. Ví dụ: {{ outer: 'O', inner: 'S.ABCD' }}.
   - KHÔNG đảo inner/outer giữa hai fact type này. Khi đề chỉ nói 'mặt cầu nội tiếp' mà chưa đặt tên tâm, dùng tên điểm hợp lý (I, O...) và ghi trong entities.points.
19. QUERY TYPES: Chỉ dùng query type có trong danh sách VALID QUERY TYPES. Không dùng 'proof_existence'.
20. AREA / PERIMETER (ĐỢT 4): Fact 'area' và 'perimeter' dùng {{ target, value }} giống 'length'. target là tên đa giác/mặt (ví dụ 'ABC', 'ABCD').
21. VOLUME FACT (ĐỢT 4): Fact 'volume' (ràng buộc thể tích) dùng {{ target, value }}. target là tên khối ('S.ABCD', 'SABC'). Phân biệt với query type 'volume' (câu hỏi tính toán).
22. DISTANCE FACT (ĐỢT 4): {{ from, to, value }}. from/to có thể là điểm, đoạn, hoặc mặt phẳng tùy ngữ cảnh đề bài.
23. EQUALITY (ĐỢT 4): {{ objects: [...] }} liệt kê các đoạn/đối tượng bằng nhau. Ví dụ "AB = CD" -> objects: ['AB', 'CD'].
24. COPLANAR / COLLINEAR (ĐỢT 4): 'coplanar' dùng points hoặc objects; 'collinear' dùng points. Cần ít nhất 3 tên.
25. TANGENT (ĐỢT 4): {{ objects: [obj1, obj2], point? }}. objects gồm mặt phẳng/mặt cầu hoặc đường tròn liên quan; point là điểm tiếp xúc nếu đề bài cho.
26. QUERIES vs FACTS: Câu hỏi tính toán/chứng minh đặt trong mảng `queries`, không đặt trong `facts`.
27. QUERY shape: {{ solid, plane }} hoặc target dạng cross_section. Dùng cho xác định thiết diện.
28. QUERY intersection_line: {{ planes: [plane1, plane2] }} hoặc objects gồm 2 mặt phẳng.
29. QUERY equation_line / equation_plane / equation_sphere / coordinates / locus: {{ target }}.
30. QUERY proof_parallel / proof_perpendicular / proof_equal: {{ objects: [obj1, obj2] }}.
31. QUERY cosine_between_planes: {{ planes: [plane1, plane2] }}.
32. QUERY sine_between_line_and_plane: {{ objects: [line, plane] }} — đoạn trước, mặt sau.
33. QUERY ratio_volume: {{ solids: [solid1, solid2] }}.
34. SHAPE ĐỢT 6 — REGULAR VARIANTS: Dùng `regular_cube`, `regular_rectangular_cuboid`, `regular_parallelepiped`, `regular_sphere` khi đề nói rõ dạng đều/chuẩn. Backend normalize về dạng tương ứng (`cube`, `sphere`...).
35. SHAPE ĐỢT 6 — NGŨ/LỤC GIÁC: `pentagon` / `hexagon` cho đa giác phẳng (target `ABCDE`, `ABCDEF`). `pentagonal_pyramid` / `hexagonal_pyramid` cho chóp (`S.ABCDE`, `S.ABCDEF`). `pentagonal_prism` / `hexagonal_prism` cho lăng trụ (`ABCDE.A'B'C'D'E'`, `ABCDEF.A'B'C'D'E'F'`).
36. REGULAR_SPHERE: giống `sphere` — dùng `center`, `radius` trong data; ưu tiên enum `regular_sphere` khi đề nói mặt cầu đều/chuẩn.
37. HÌNH THƯỜNG (ĐỢT 1): Khi đề chỉ nói "hình chóp", "tam giác", "hình vuông" mà KHÔNG có từ khóa đặc biệt (đều, cân, vuông tại..., chóp đều, chóp vuông, SA vuông góc đáy), chỉ dùng shape chung (`pyramid`, `triangle`, `square`/`rectangle`) — KHÔNG thêm `regular_pyramid`, `equilateral_triangle`, fact `perpendicular` SA⊥(ABCD) hay các ràng buộc đặc biệt khác.
38. PROJECTION: Khi đề nói "H là hình chiếu vuông góc của S lên (ABCD)", bắt buộc sinh fact `projection` với `from=S`, `point=H`, `onto=ABCD` và đưa `H` vào `entities.points`.
39. ENTITIES ĐIỂM PHỤ: Mọi điểm cần vẽ (M, P, I, H...) phải có trong `entities.points`; backend chỉ dựng tọa độ cho các điểm đã khai báo.
40. ĐOẠN THẲNG: Nếu đề cho đoạn `AB`, phải có `entities.segments` chứa `AB` và `entities.points` chứa `A`, `B`.
41. TAM GIÁC — THỨ TỰ ƯU TIÊN: thường (`triangle`) → vuông (`right_triangle`) → cân (`isosceles_triangle`) → vuông cân (`isosceles_right_triangle`) → đều (`equilateral_triangle`). Chỉ dùng dạng đặc biệt khi đề nói rõ (vd. "vuông tại B" → `right_triangle`, KHÔNG tự đổi thành `isosceles_right_triangle` trừ khi có thêm điều kiện như `AB = AC` hoặc `AB ⊥ BC` kèm bằng cạnh). Đề chỉ nói "tam giác ABC" → `triangle`.
42. ĐƯỜNG THẲNG AB (ĐỢT 1): Khi đề chỉ nói "cho đường thẳng AB" / "vẽ đường thẳng AB", KHÔNG sinh fact `shape`. Chỉ khai báo `entities.points: ['A','B']`, `entities.segments: ['AB']`. Nếu có "tia đối" / "tia AB" thì dùng fact `opposite_ray` hoặc `ray` — không dùng `shape` với giá trị `line`.
43. TỌA ĐỘ CHO SẴN (HÌNH HỌC TỌA ĐỘ): Khi đề CHO SẴN tọa độ một điểm (ví dụ "A(1, 0)", "B(5, 3)", "C(5, 5)", "M(1, 2, 3)"), ĐƯA tọa độ đó vào object top-level `points` theo dạng {{ "A": {{ "x": 1, "y": 0, "z": 0 }} }} (điểm 2D thì z = 0). VẪN liệt kê tên điểm trong `entities.points`.
   - TUYỆT ĐỐI KHÔNG tạo fact với type `coordinates` (KHÔNG tồn tại trong VALID FACT TYPES) và KHÔNG nhét tọa độ vào `facts`.
   - `coordinates` chỉ hợp lệ khi là QUERY (câu hỏi "tìm tọa độ điểm..."), không phải fact.
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
