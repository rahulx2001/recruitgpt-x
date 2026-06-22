"""Aggregate API router."""

from fastapi import APIRouter

from app.api.routes import candidates, jobs, search, status

api_router = APIRouter()
api_router.include_router(jobs.router)
api_router.include_router(candidates.router)
api_router.include_router(search.router)
api_router.include_router(status.router)
