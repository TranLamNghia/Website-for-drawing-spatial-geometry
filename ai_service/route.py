from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
from api.llm_client import GeometryAIEngine
from api.sympy_engine import SympyAIEngine
from typing import Dict, Any

router = APIRouter()
ai_engine = GeometryAIEngine() # Dependency Injection
sympy_engine = SympyAIEngine()

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

class MathSolverRequest(BaseModel):
    problem_text: str
    facts_json: Dict[str, Any]
    current_points: Dict[str, Any]
    validation_failures: list
    base_a_value: float = 1.0

@router.post("/solve-math")
async def solve_math_geometry(request: MathSolverRequest):
    try:
        result = sympy_engine.generate_and_solve(
            request.problem_text, 
            request.facts_json, 
            request.current_points, 
            request.validation_failures,
            request.base_a_value
        )
        if result.get("status") == "error":
            error_detail = result.get("details", result.get("message"))
            raise HTTPException(status_code=400, detail=error_detail)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Math Solver Error: {str(e)}")