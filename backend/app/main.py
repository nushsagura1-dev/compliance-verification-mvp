"""
main.py — FastAPI application entry point.
"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import engine, Base
from app.crypto import load_or_create_keypair
from app.routers import admin, public
from app.schemas import HealthResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
settings = get_settings()

# Resolve paths relative to this file (works regardless of cwd)
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # project root


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler:
    - Creates DB tables if they don't exist (Alembic handles migrations in prod)
    - Loads or generates the Ed25519 signing keypair
    """
    logger.info("Starting up — creating database tables if needed…")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    logger.info("Loading Ed25519 signing keypair…")
    load_or_create_keypair()
    logger.info("Application ready.")
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="Compliance Status API",
    description="Lightweight MVP for publishing and verifying cryptographically signed compliance statuses.",
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Health check ─────────────────────────────────────────────────────────────
@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    return HealthResponse(status="ok", version="1.0.0")

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(admin.router)
app.include_router(public.router)

# ─── Serve badge.js as a static file ──────────────────────────────────────────
badge_dir = BASE_DIR / "badge"
if badge_dir.exists():
    app.mount("/badge", StaticFiles(directory=str(badge_dir)), name="badge")
    logger.info("Serving badge files from %s", badge_dir)

# ─── Serve built React frontend (production only) ────────────────────────────
# In development, use Vite dev server (npm run dev) with proxy.
# In production, build the frontend (npm run build) and this serves the dist.
frontend_dist = BASE_DIR / "frontend" / "dist"
if frontend_dist.exists() and (frontend_dist / "index.html").exists():
    from starlette.responses import FileResponse

    # Serve static assets (JS/CSS bundles)
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="frontend-assets")
        logger.info("Serving frontend assets from %s", assets_dir)

    # SPA catch-all: serve index.html for any route not matched above
    @app.api_route("/{full_path:path}", methods=["GET"], include_in_schema=False)
    async def serve_spa(full_path: str = ""):
        return FileResponse(str(frontend_dist / "index.html"))

    logger.info("SPA fallback enabled — serving frontend from %s", frontend_dist)
else:
    logger.info("No frontend/dist found — running in API-only mode (use Vite dev server for frontend)")
