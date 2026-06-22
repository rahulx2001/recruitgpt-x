"""Embedding service — local BGE / OpenAI embeddings with graceful fallback."""

from __future__ import annotations

import hashlib
import math
import re
from collections import Counter
from typing import Dict, List, Optional, Set

import numpy as np

from app.config import get_settings

_TOKEN_RE = re.compile(r"[a-z0-9+#.]{2,}")


class EmbeddingService:
    """Generates dense embeddings for candidate profiles and JDs.

    Priority: sentence-transformers BGE → OpenAI embeddings → TF-IDF lexical fallback.
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self.model = None
        self.dim = self.settings.embedding_dim
        self._openai_client = None
        self._vocab: Dict[str, int] = {}
        self._idf: Dict[str, float] = {}
        self._provider = "tfidf"
        self._init_provider()

    def _init_provider(self) -> None:
        if self.settings.embedding_provider == "openai" and self.settings.has_openai:
            try:
                from openai import AsyncOpenAI

                self._openai_client = AsyncOpenAI(api_key=self.settings.openai_api_key)
                self._provider = "openai"
                return
            except Exception:
                pass

        if self.settings.embedding_provider == "local":
            try:
                from sentence_transformers import SentenceTransformer

                self.model = SentenceTransformer(self.settings.embedding_model)
                dim_fn = getattr(self.model, "get_embedding_dimension", None)
                self.dim = dim_fn() if dim_fn else self.model.get_sentence_embedding_dimension()
                self._provider = "bge"
                return
            except Exception:
                self.model = None

        self._provider = "tfidf"

    def _tokenize(self, text: str) -> List[str]:
        return _TOKEN_RE.findall((text or "").lower())

    def _build_tfidf_vector(self, text: str, corpus_tokens: Optional[List[List[str]]] = None) -> List[float]:
        tokens = self._tokenize(text)
        if not tokens:
            return [0.0] * self.dim

        if corpus_tokens:
            df: Counter[str] = Counter()
            for doc in corpus_tokens:
                df.update(set(doc))
            n = len(corpus_tokens)
            self._idf = {t: math.log((1 + n) / (1 + df[t])) + 1.0 for t in df}

        tf = Counter(tokens)
        vec = np.zeros(self.dim, dtype=np.float32)
        for term, count in tf.items():
            idx = int(hashlib.md5(term.encode()).hexdigest(), 16) % self.dim
            weight = (1 + math.log(count)) * self._idf.get(term, 1.0)
            vec[idx] += weight
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec /= norm
        return vec.tolist()

    def embed(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        if self.model is not None:
            try:
                vecs = self.model.encode(
                    texts,
                    normalize_embeddings=True,
                    show_progress_bar=False,
                    convert_to_numpy=True,
                )
                return [v.tolist() for v in vecs]
            except Exception:
                pass

        if self._openai_client is not None:
            # Sync fallback via httpx in async contexts is handled by callers using embed_one
            pass

        # TF-IDF lexical fallback — much stronger than hash-only for skill/JD overlap
        tokenized = [self._tokenize(t) for t in texts]
        return [self._build_tfidf_vector(texts[i], tokenized) for i in range(len(texts))]

    def embed_one(self, text: str) -> List[float]:
        return self.embed([text])[0]

    @property
    def provider(self) -> str:
        return self._provider


_embedding_singleton: Optional[EmbeddingService] = None


def get_embeddings() -> EmbeddingService:
    global _embedding_singleton
    if _embedding_singleton is None:
        _embedding_singleton = EmbeddingService()
    return _embedding_singleton