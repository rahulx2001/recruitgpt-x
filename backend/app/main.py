"""FastAPI application entrypoint."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.config import get_settings
from app.models.db import create_all, get_session_maker
from app.services.candidate_repo import list_all_candidate_profiles
from app.services.indexing import index_candidate, index_job
from app.services.job_repo import list_all_jobs

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s"
)
log = logging.getLogger("recruitgpt")


async def _index_all_at_startup() -> None:
    """Populate the vector store with all candidates and jobs from DB.

    The in-memory Qdrant fallback is per-process, so anything indexed in
    a separate seed process won't appear in the API server. We re-index
    here at every startup.
    """
    sm = get_session_maker()
    try:
        async with sm() as session:
            cands = await list_all_candidate_profiles(session)
            for c in cands:
                try:
                    index_candidate(c)
                except Exception as e:
                    log.warning("Failed to index candidate %s: %s", c.full_name, e)
            log.info("Indexed %d candidates into vector store", len(cands))

            jobs = await list_all_jobs(session)
            for j in jobs:
                if j.blueprint:
                    try:
                        index_job(
                            str(j.id),
                            j.title,
                            j.description,
                            j.blueprint.model_dump(),
                        )
                    except Exception as e:
                        log.warning("Failed to index job %s: %s", j.title, e)
            log.info("Indexed %d jobs into vector store", len(jobs))
    except Exception as e:
        log.warning("Startup indexing failed: %s", e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown hooks."""
    log.info("Initializing database...")
    try:
        await create_all()
        log.info("Database ready.")
    except Exception as e:
        log.warning("Database init failed (continuing): %s", e)

    if settings.auto_seed_on_startup:
        try:
            from app.data.seed import seed_if_empty

            if await seed_if_empty():
                log.info("Auto-seeded demo database (empty deploy).")
        except Exception as e:
            log.warning("Auto-seed skipped: %s", e)

    from app.agents.ranking import get_ranking_weights

    log.info(
        "Ranking weights: %s (set USE_SEMANTIC_RANKING_WEIGHTS=true for semantic mode)",
        get_ranking_weights(),
    )

    # Index all candidates + jobs into the (in-memory) vector store so
    # /api/search and semantic features work immediately.
    await _index_all_at_startup()

    yield
    log.info("Shutting down.")


settings = get_settings()

app = FastAPI(
    title="RecruitGPT X",
    description="The AI Recruiter That Thinks Like a Hiring Manager",
    version="0.1.0",
    lifespan=lifespan,
)

_cors_methods = (
    ["GET", "POST", "OPTIONS"]
    if settings.app_env == "production"
    else ["*"]
)
_cors_headers = (
    ["Authorization", "Content-Type", "Accept", "X-User-Id"]
    if settings.app_env == "production"
    else ["*"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=_cors_methods,
    allow_headers=_cors_headers,
)

app.include_router(api_router)


@app.get("/")
async def root():
    return {
        "name": "RecruitGPT X",
        "version": "0.1.0",
        "status": "online",
    }


@app.get("/health")
async def health():
    """Liveness check."""
    return {"status": "ok"}


@app.get("/ready")
async def ready():
    """Readiness check — index counts for demo acceptance."""
    from app.services.vector_store import get_vector_store
    from app.utils.pii_crypto import pii_encryption_enabled

    vs = get_vector_store()
    candidates_indexed = vs.count_candidates()
    jobs_indexed = vs.count_jobs()
    return {
        "status": "ok" if candidates_indexed > 0 else "degraded",
        "vector_store": {
            "client": vs.backend,
            "candidates_indexed": candidates_indexed,
            "jobs_indexed": jobs_indexed,
        },
        "ranking_weights_mode": (
            "semantic_enhanced"
            if settings.use_semantic_ranking_weights
            else "hackathon_spec"
        ),
        "pii_encryption": pii_encryption_enabled(),
        "llm_provider": settings.llm_provider,
    }
