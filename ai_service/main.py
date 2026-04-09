from fastapi import FastAPI
import route as new_nlp_router

app = FastAPI(
    title="Backend.AI_Math",
    description="Microservice combining NLP LLM parsing and 3D Vector Math Engine",
    version="1.0.0"
)

app.include_router(new_nlp_router.router, prefix="/api", tags=["NLP"])

@app.get("/")
def read_root():
    return {"message": "Welcome to Backend.AI_Math Service"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
