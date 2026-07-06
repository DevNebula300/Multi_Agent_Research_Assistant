from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import papers

app = FastAPI(title="Multi-Agent Research Assistant", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(papers.router, prefix="/api", tags=["papers"])


@app.get("/")
def health_check():
    return {"status": "ok", "service": "research-assistant-api"}
