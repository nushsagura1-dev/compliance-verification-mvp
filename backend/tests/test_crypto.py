"""
test_crypto.py — Unit tests for the Ed25519 signing/verification module.
"""

import pytest
from datetime import datetime, timezone
from app.crypto import sign_domain, verify_signature, build_canonical_payload


ISSUED_AT = datetime(2026, 2, 24, 12, 0, 0, tzinfo=timezone.utc)


def test_sign_returns_hex_strings():
    sig, pub = sign_domain("example.com", "active", "basic", ISSUED_AT)
    assert isinstance(sig, str)
    assert isinstance(pub, str)
    # Ed25519 signature is 64 bytes → 128 hex chars
    assert len(sig) == 128
    # Ed25519 public key is 32 bytes → 64 hex chars
    assert len(pub) == 64


def test_verify_valid_signature():
    sig, pub = sign_domain("example.com", "active", "basic", ISSUED_AT)
    result = verify_signature("example.com", "active", "basic", ISSUED_AT, sig, pub)
    assert result is True


def test_verify_fails_with_tampered_domain():
    sig, pub = sign_domain("example.com", "active", "basic", ISSUED_AT)
    result = verify_signature("evil.com", "active", "basic", ISSUED_AT, sig, pub)
    assert result is False


def test_verify_fails_with_tampered_status():
    sig, pub = sign_domain("example.com", "active", "basic", ISSUED_AT)
    result = verify_signature("example.com", "revoked", "basic", ISSUED_AT, sig, pub)
    assert result is False


def test_verify_fails_with_tampered_compliance_level():
    sig, pub = sign_domain("example.com", "active", "basic", ISSUED_AT)
    result = verify_signature("example.com", "active", "advanced", ISSUED_AT, sig, pub)
    assert result is False


def test_canonical_payload_is_deterministic():
    p1 = build_canonical_payload("test.com", "active", "basic", ISSUED_AT)
    p2 = build_canonical_payload("test.com", "active", "basic", ISSUED_AT)
    assert p1 == p2


def test_verify_fails_with_wrong_public_key():
    """
    sign_domain uses a singleton keypair, so calling it twice always returns
    the same public key. We must generate a genuinely different key via PyNaCl
    directly to test that verification rejects a wrong public key.
    """
    import nacl.signing
    import nacl.encoding

    sig, _ = sign_domain("example.com", "active", "basic", ISSUED_AT)
    # Generate a fresh, independent keypair — guaranteed different
    wrong_signing_key = nacl.signing.SigningKey.generate()
    wrong_pub = wrong_signing_key.verify_key.encode(
        encoder=nacl.encoding.HexEncoder
    ).decode()
    result = verify_signature("example.com", "active", "basic", ISSUED_AT, sig, wrong_pub)
    assert result is False
