"""Natural language candidate search route."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import CurrentUser, get_current_user
from app.api.deps import get_session
from app.models.schemas import SearchRequest, SearchResult
from app.services.candidate_repo import list_candidate_profiles
from app.services.embeddings import get_embeddings
from app.services.search_parser import apply_structured_filters, parse_nl_query
from app.services.vector_store import get_vector_store

router = APIRouter(prefix="/api/search", tags=["search"])


@router.post("", response_model=List[SearchResult])
async def natural_language_search(
    payload: SearchRequest,
    session: AsyncSession = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    """Vector + structured NL search scoped to the current user's candidates."""
    candidates = await list_candidate_profiles(session, user.user_id)
    if not candidates:
        return []

    parsed = parse_nl_query(payload.query)
    emb = get_embeddings()
    vs = get_vector_store()
    qvec = emb.embed_one(parsed.semantic_query)
    raw = vs.search_candidates(qvec, top_k=max(payload.top_k * 3, 30))

    by_id = {str(c.id): c for c in candidates}
    scored: List[SearchResult] = []

    for cand_id, sim, meta in raw:
        prof = by_id.get(cand_id)
        if not prof:
            continue
        adjusted, matched = apply_structured_filters(sim, prof, parsed)
        aspects = list(dict.fromkeys(matched + (meta.get("skills", []) or [])[:3]))
        scored.append(
            SearchResult(
                candidate=prof,
                similarity=adjusted,
                matched_aspects=aspects[:6],
            )
        )

    scored.sort(key=lambda r: r.similarity, reverse=True)
    return scored[: payload.top_k]