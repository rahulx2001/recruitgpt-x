"""Extract plain text from resume uploads (TXT, PDF)."""

from __future__ import annotations

from io import BytesIO
from typing import Optional


def extract_resume_text(raw: bytes, filename: Optional[str] = None) -> str:
    """Return UTF-8 text from a resume file. Supports .txt and .pdf."""
    name = (filename or "").lower()

    if name.endswith(".pdf") or raw[:4] == b"%PDF":
        try:
            from pdfminer.high_level import extract_text

            text = extract_text(BytesIO(raw)) or ""
            cleaned = " ".join(text.split())
            if cleaned:
                return cleaned
        except Exception:
            pass

    return raw.decode("utf-8", errors="ignore").strip()