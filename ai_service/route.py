from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
from api.llm_client import GeometryAIEngine

router = APIRouter()
ai_engine = GeometryAIEngine() # Dependency Injection

class ProblemRequest(BaseModel):
    problem_text: str

@router.post("/extract")
async def extract_geometry(request: ProblemRequest):
    try:
        raw_json = ai_engine.extract_json(request.problem_text)
        parsed_data = json.loads(raw_json)
        return {"status": "success", "data": parsed_data}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Result is not valid JSON format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")