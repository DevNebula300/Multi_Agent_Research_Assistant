from dotenv import load_dotenv

load_dotenv()

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.routers import papers

# Skip OpenAPI UIs in production — tiny RAM/CPU save, less surface area
_is_prod = os.getenv("RAILWAY_ENVIRONMENT") is not None or os.getenv("ENV") == "production"

app = FastAPI(
    title="Multi-Agent Research Assistant",
    version="0.1.0",
    docs_url=None if _is_prod else "/docs",
    redoc_url=None if _is_prod else "/redoc",
    openapi_url=None if _is_prod else "/openapi.json",
)

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
allow_origins = [origin.strip() for origin in frontend_origin.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins or ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(papers.router, prefix="/api", tags=["papers"])


@app.get("/health")
def health_check():
    """Deploy / uptime probe — keep this free of LLM, disk, or network work."""
    return {"status": "ok", "service": "research-assistant-api"}


STATIC_DIR = Path(os.getenv("STATIC_DIR", Path(__file__).resolve().parent.parent / "frontend" / "dist"))
_has_frontend = STATIC_DIR.is_dir() and (STATIC_DIR / "index.html").is_file()

if _has_frontend:
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    def spa_index():
        return FileResponse(STATIC_DIR / "index.html")

    @app.get("/{full_path:path}")
    def spa_fallback(full_path: str):
        # Let /api/* keep hitting the router; this only catches unmatched GETs.
        candidate = STATIC_DIR / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(STATIC_DIR / "index.html")
else:

    @app.get("/")
    def root():
        return {"status": "ok", "service": "research-assistant-api"}
