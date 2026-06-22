"""Optional field-level encryption for PII (resume text, email) at rest."""

from __future__ import annotations

import base64
import hashlib
from typing import Optional

from app.config import get_settings

_ENC_PREFIX = "enc:v1:"


def _fernet():
    from cryptography.fernet import Fernet

    key = get_settings().pii_encryption_key.strip()
    if not key:
        return None
    try:
        return Fernet(key.encode() if isinstance(key, str) else key)
    except Exception:
        # Derive a valid Fernet key from arbitrary secret (dev-friendly)
        derived = base64.urlsafe_b64encode(
            hashlib.sha256(key.encode()).digest()
        )
        return Fernet(derived)


def pii_encryption_enabled() -> bool:
    return bool(get_settings().pii_encryption_key.strip())


def encrypt_pii(value: Optional[str]) -> Optional[str]:
    """Encrypt plaintext PII. Returns value unchanged if encryption disabled."""
    if not value or not pii_encryption_enabled():
        return value
    if value.startswith(_ENC_PREFIX):
        return value
    f = _fernet()
    if f is None:
        return value
    token = f.encrypt(value.encode("utf-8")).decode("ascii")
    return f"{_ENC_PREFIX}{token}"


def decrypt_pii(value: Optional[str]) -> Optional[str]:
    """Decrypt stored PII. Legacy plaintext values pass through."""
    if not value:
        return value
    if not value.startswith(_ENC_PREFIX):
        return value
    f = _fernet()
    if f is None:
        return value
    token = value[len(_ENC_PREFIX) :]
    try:
        return f.decrypt(token.encode("ascii")).decode("utf-8")
    except Exception:
        return value