from fastapi import APIRouter
from pydantic import BaseModel
import json
from api.llm_client import GeometryAIEngine

router = APIRouter()
ai_engine = GeometryAIEngine() # Dependency Injection

class ProblemRequest(BaseModel):
    problem_text: str

@router.post("/extract")
async def extract_geometry(request: ProblemRequest):
    raw_json = ai_engine.extract_json(request.problem_text)
    try:
        parsed_data = json.loads(raw_json)
        return {"status": "success", "data": parsed_data}
    except json.JSONDecodeError:
        return {"status": "error", "message": "Result is not valid JSON", "data": raw_json}