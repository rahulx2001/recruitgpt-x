"""Integration status — live vs mock mode diagnostics."""

from __future__ import annotations

from fastapi import APIRouter

from app.config import get_settings

router = APIRouter(prefix="/api", tags=["status"])


@router.get("/status")
async def integration_status():
    """Report whether live LLM, embeddings, and auth keys are configured."""
    s = get_settings()
    llm_live = s.llm_provider != "mock"
    return {
        "llm_mode": "live" if llm_live else "mock",
        "llm_provider": s.llm_provider,
        "llm_provider_preference": s.llm_provider_preference,
        "keys_configured": {
            "nvidia": s.has_nvidia,
            "minimax": s.has_minimax,
            "openai": s.has_openai,
            "anthropic": s.has_anthropic,
            "clerk": bool(s.clerk_secret_key and s.clerk_jwks_url),
            "qdrant": bool(s.qdrant_api_key),
        },
        "embedding_provider": s.embedding_provider,
        "require_auth": s.require_auth,
        "ranking_weights_mode": (
            "semantic_enhanced" if s.use_semantic_ranking_weights else "hackathon_spec"
        ),
        "setup_hint": (
            None
            if llm_live
            else "Add NVIDIA_API_KEY, MINIMAX_API_KEY, or OPENAI_API_KEY to backend/.env — run ./scripts/setup-env.sh"
        ),
    }