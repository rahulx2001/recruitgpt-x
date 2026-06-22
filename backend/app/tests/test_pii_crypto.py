"""PII encryption round-trip tests."""

from app.utils.pii_crypto import decrypt_pii, encrypt_pii


def test_pii_roundtrip_when_key_set(monkeypatch):
    monkeypatch.setenv("PII_ENCRYPTION_KEY", "test-secret-key-for-demo")
    from app.config import get_settings

    get_settings.cache_clear()

    plain = "Senior ML engineer with 8 years experience"
    enc = encrypt_pii(plain)
    assert enc is not None
    assert enc.startswith("enc:v1:")
    assert decrypt_pii(enc) == plain

    get_settings.cache_clear()


def test_pii_passthrough_when_disabled(monkeypatch):
    monkeypatch.delenv("PII_ENCRYPTION_KEY", raising=False)
    from app.config import get_settings

    get_settings.cache_clear()

    plain = "plaintext resume"
    assert encrypt_pii(plain) == plain
    assert decrypt_pii(plain) == plain

    get_settings.cache_clear()