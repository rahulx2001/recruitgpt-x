"""Qdrant vector store wrapper with in-memory fallback."""

from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional, Tuple, Union

from app.config import get_settings
from app.services.embeddings import get_embeddings


class InMemoryStore:
    """Drop-in fallback when Qdrant is unavailable. Cosine similarity."""

    def __init__(self, dim: int = 1024):
        self.dim = dim
        self.vectors: Dict[str, Dict[str, Any]] = {}  # id -> {vector, payload}

    def upsert(self, id: str, vector: List[float], payload: Dict[str, Any]):
        self.vectors[id] = {"vector": vector, "payload": payload}

    def search(
        self,
        vector: List[float],
        top_k: int = 10,
        filter: Optional[Dict[str, Any]] = None,
    ) -> List[Tuple[str, float, Dict[str, Any]]]:
        import numpy as np

        results: List[Tuple[str, float, Dict[str, Any]]] = []
        q = np.array(vector, dtype=np.float32)
        q_norm = np.linalg.norm(q)
        if q_norm == 0:
            return []
        for _id, entry in self.vectors.items():
            v = np.array(entry["vector"], dtype=np.float32)
            v_norm = np.linalg.norm(v)
            if v_norm == 0:
                continue
            sim = float(np.dot(q, v) / (q_norm * v_norm))
            payload = entry["payload"]
            if filter:
                ok = True
                for k, val in filter.items():
                    if payload.get(k) != val:
                        ok = False
                        break
                if not ok:
                    continue
            results.append((_id, sim, payload))
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]

    def count(self) -> int:
        return len(self.vectors)


def _qdrant_point_id(id_str: str) -> Union[str, uuid.UUID]:
    """Qdrant requires integer or UUID point IDs — normalize string UUIDs."""
    try:
        return uuid.UUID(id_str)
    except ValueError:
        # Deterministic UUID from arbitrary string (legacy IDs)
        return uuid.uuid5(uuid.NAMESPACE_URL, id_str)


class VectorStore:
    """Wraps Qdrant with an in-memory fallback for demos without Docker."""

    COLLECTION_CANDIDATES = "candidate_profiles"
    COLLECTION_JOBS = "job_descriptions"

    def __init__(self) -> None:
        self.settings = get_settings()
        self.client = None
        self._memory: Dict[str, InMemoryStore] = {}
        self._init_client()

    def _init_client(self) -> None:
        try:
            from qdrant_client import QdrantClient
            from qdrant_client.http import models as qmodels

            self.client = QdrantClient(
                url=self.settings.qdrant_url,
                api_key=self.settings.qdrant_api_key or None,
            )
            # Test connection
            self.client.get_collections()
            self._qmodels = qmodels
        except Exception:
            # No Qdrant — fall back to in-memory for all collections
            self.client = None
            self._memory[self.COLLECTION_CANDIDATES] = InMemoryStore(
                self.settings.embedding_dim
            )
            self._memory[self.COLLECTION_JOBS] = InMemoryStore(
                self.settings.embedding_dim
            )

    def _ensure_collection(self, name: str) -> None:
        if self.client is None:
            return
        try:
            self.client.get_collection(name)
        except Exception:
            from qdrant_client.http import models as qmodels

            self.client.create_collection(
                collection_name=name,
                vectors_config=qmodels.VectorParams(
                    size=self.settings.embedding_dim, distance=qmodels.Distance.COSINE
                ),
            )

    def upsert_candidate(
        self, candidate_id: str, vector: List[float], payload: Dict[str, Any]
    ):
        if self.client is None:
            self._memory[self.COLLECTION_CANDIDATES].upsert(
                candidate_id, vector, payload
            )
            return
        self._ensure_collection(self.COLLECTION_CANDIDATES)
        from qdrant_client.http import models as qmodels

        self.client.upsert(
            collection_name=self.COLLECTION_CANDIDATES,
            points=[
                qmodels.PointStruct(
                    id=_qdrant_point_id(candidate_id), vector=vector, payload=payload
                )
            ],
        )

    def upsert_job(self, job_id: str, vector: List[float], payload: Dict[str, Any]):
        if self.client is None:
            self._memory[self.COLLECTION_JOBS].upsert(job_id, vector, payload)
            return
        self._ensure_collection(self.COLLECTION_JOBS)
        from qdrant_client.http import models as qmodels

        self.client.upsert(
            collection_name=self.COLLECTION_JOBS,
            points=[
                qmodels.PointStruct(
                    id=_qdrant_point_id(job_id), vector=vector, payload=payload
                )
            ],
        )

    def search_candidates(
        self, query_vector: List[float], top_k: int = 20
    ) -> List[Tuple[str, float, Dict[str, Any]]]:
        if self.client is None:
            return self._memory[self.COLLECTION_CANDIDATES].search(query_vector, top_k)
        self._ensure_collection(self.COLLECTION_CANDIDATES)
        results = self.client.search(
            collection_name=self.COLLECTION_CANDIDATES,
            query_vector=query_vector,
            limit=top_k,
        )
        return [(str(r.id), float(r.score), r.payload or {}) for r in results]

    def search_jobs(
        self, query_vector: List[float], top_k: int = 5
    ) -> List[Tuple[str, float, Dict[str, Any]]]:
        if self.client is None:
            return self._memory[self.COLLECTION_JOBS].search(query_vector, top_k)
        self._ensure_collection(self.COLLECTION_JOBS)
        results = self.client.search(
            collection_name=self.COLLECTION_JOBS,
            query_vector=query_vector,
            limit=top_k,
        )
        return [(str(r.id), float(r.score), r.payload or {}) for r in results]

    def count_candidates(self) -> int:
        if self.client is None:
            store = self._memory.get(self.COLLECTION_CANDIDATES)
            return store.count() if store else 0
        try:
            info = self.client.get_collection(self.COLLECTION_CANDIDATES)
            return int(getattr(info, "points_count", 0) or 0)
        except Exception:
            return 0

    def count_jobs(self) -> int:
        if self.client is None:
            store = self._memory.get(self.COLLECTION_JOBS)
            return store.count() if store else 0
        try:
            info = self.client.get_collection(self.COLLECTION_JOBS)
            return int(getattr(info, "points_count", 0) or 0)
        except Exception:
            return 0

    @property
    def backend(self) -> str:
        return "qdrant" if self.client is not None else "in-memory"


_vs_singleton: Optional[VectorStore] = None


def get_vector_store() -> VectorStore:
    global _vs_singleton
    if _vs_singleton is None:
        _vs_singleton = VectorStore()
    return _vs_singleton
