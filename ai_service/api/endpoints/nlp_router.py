from fastapi import APIRouter, HTTPException
from schemas.geometry_request import ParseRequest
from ai_service.ollama_client import ollama_client

router = APIRouter()

@router.post("/parse_problem")
async def parse_math_problem(request: ParseRequest):
    try:
        result = ollama_client.parse_problem(request.problem_text, request.model)
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
