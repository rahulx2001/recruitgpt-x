"""Application settings loaded from environment."""

from __future__ import annotations

from functools import lru_cache
from typing import List

import json

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Centralized config. Reads from .env automatically."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_env: str = "development"
    log_level: str = "INFO"
    cors_origins: List[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    # Auth — set REQUIRE_AUTH=true in production
    require_auth: bool = False
    api_secret_key: str = ""
    clerk_secret_key: str = ""
    clerk_jwks_url: str = ""
    clerk_issuer: str = ""
    default_dev_user_id: str = "dev-user"

    # Workspace profile shown in dashboard shell (override via env in production)
    workspace_user_name: str = "Priya Sharma"
    workspace_user_role: str = "Head of Talent"
    workspace_user_company: str = "Northwind"
    workspace_user_email: str = "priya.sharma@northwind.com"
    workspace_user_color: str = "#4F46E5"
    workspace_user_avatar_url: str = "/avatars/priya-sharma-profile.jpg"

    # Rate limits (per user+IP, in-memory — use Redis in production)
    rate_limit_expensive_per_minute: int = 10
    rate_limit_upload_per_minute: int = 5

    # Uploads
    max_upload_bytes: int = 5_242_880  # 5 MB

    # Ranking — False = hackathon PROMPT_WEIGHTS (30/20/15/15/10/10)
    # True = adds 10% semantic dimension (DEFAULT_WEIGHTS)
    use_semantic_ranking_weights: bool = False

    # Production deploy helpers
    auto_seed_on_startup: bool = False
    auto_import_challenge_top100: bool = False

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if v is None or v == "":
            return ["http://localhost:3000"]
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            s = v.strip()
            if s.startswith("["):
                try:
                    parsed = json.loads(s)
                    if isinstance(parsed, list):
                        return [str(x).strip() for x in parsed if str(x).strip()]
                except json.JSONDecodeError:
                    pass
            return [part.strip() for part in s.split(",") if part.strip()]
        return v

    # PII — set PII_ENCRYPTION_KEY to encrypt resume_text + email at rest
    pii_encryption_key: str = ""

    # LLM provider preference: auto | nvidia | minimax | openai | anthropic
    llm_provider_preference: str = "auto"

    # LLM — NVIDIA NIM (OpenAI-compatible) is preferred when configured
    nvidia_api_key: str = ""
    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1"
    nvidia_model: str = "moonshotai/kimi-k2.6"
    # MiniMax M3 fallback
    minimax_api_key: str = ""
    minimax_base_url: str = "https://api.minimax.io/v1"
    minimax_model: str = "MiniMax-M3"
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    llm_model: str = "gpt-4o-mini"

    # Embeddings
    embedding_provider: str = "local"  # "local" | "openai"
    embedding_model: str = "BAAI/bge-large-en-v1.5"
    embedding_dim: int = 1024

    # Data
    database_url: str = (
        "postgresql+asyncpg://recruitgpt:recruitgpt@localhost:5432/recruitgpt"
    )
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str = ""

    @property
    def has_nvidia(self) -> bool:
        return bool(self.nvidia_api_key)

    @property
    def has_minimax(self) -> bool:
        return bool(self.minimax_api_key)

    @property
    def has_openai(self) -> bool:
        return bool(self.openai_api_key)

    @property
    def has_anthropic(self) -> bool:
        return bool(self.anthropic_api_key)

    @property
    def llm_provider(self) -> str:
        pref = (self.llm_provider_preference or "auto").lower().strip()
        order = {
            "auto": ["nvidia", "minimax", "openai", "anthropic"],
            "nvidia": ["nvidia", "minimax", "openai", "anthropic"],
            "minimax": ["minimax", "nvidia", "openai", "anthropic"],
            "openai": ["openai", "nvidia", "minimax", "anthropic"],
            "anthropic": ["anthropic", "nvidia", "minimax", "openai"],
        }.get(pref, ["nvidia", "minimax", "openai", "anthropic"])
        available = {
            "nvidia": self.has_nvidia,
            "minimax": self.has_minimax,
            "openai": self.has_openai,
            "anthropic": self.has_anthropic,
        }
        for name in order:
            if available.get(name):
                return name
        return "mock"


@lru_cache
def get_settings() -> Settings:
    return Settings()
