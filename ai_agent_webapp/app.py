import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import uvicorn
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
INDEX_FILE = STATIC_DIR / "index.html"

load_dotenv(dotenv_path=BASE_DIR / ".env")

from agent import get_agent_executor, reset_session_memory, get_session_memory_buffer
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AI Agent with Memory & Tools", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static folder
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default_user"
    api_key: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str

class ResetRequest(BaseModel):
    session_id: str = "default_user"

@app.get("/")
async def serve_index():
    return FileResponse(str(INDEX_FILE))

@app.get("/api/health")
async def health_check():
    server_key_present = bool(os.getenv("GROQ_API_KEY"))
    return {
        "status": "online",
        "has_server_api_key": server_key_present,
        "model": os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    }

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    if not req.message or not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    
    try:
        executor = get_agent_executor(req.session_id, api_key=req.api_key)
        result = executor.invoke({"input": req.message.strip()})
        output_text = result.get("output", "No response generated.")
        return ChatResponse(response=output_text, session_id=req.session_id)
    except Exception as e:
        error_msg = str(e)
        if "GROQ_API_KEY" in error_msg:
            raise HTTPException(
                status_code=401,
                detail="Groq API Key is missing. Please set it in your .env file or enter it in the web interface."
            )
        raise HTTPException(status_code=500, detail=f"Agent Error: {error_msg}")

@app.post("/api/reset")
async def reset_endpoint(req: ResetRequest):
    reset_session_memory(req.session_id)
    return {"message": "Memory reset successfully for session.", "session_id": req.session_id}

@app.get("/api/memory")
async def get_memory_endpoint(session_id: str = "default_user"):
    buf = get_session_memory_buffer(session_id)
    return {"session_id": session_id, "memory": buf}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print(f"🚀 Starting AI Agent Web App on http://localhost:{port}")
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
