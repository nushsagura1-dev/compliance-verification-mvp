"""
crypto.py — Ed25519 signing & verification using PyNaCl.

Design decisions:
- Private key is stored in a binary file (PRIVATE_KEY_PATH) on the server.
- It is NEVER exposed through any API endpoint.
- On first run, a keypair is generated automatically.
- The public key is stored in hex inside the database alongside each domain record.
- The canonical payload for signing is a deterministic JSON string (sorted keys).
"""

import json
import os
import logging
from pathlib import Path
from datetime import datetime, timezone

import nacl.signing
import nacl.encoding
import nacl.exceptions

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_signing_key: nacl.signing.SigningKey | None = None


def _get_key_path() -> Path:
    return Path(settings.private_key_path)


def load_or_create_keypair() -> nacl.signing.SigningKey:
    """
    Load the Ed25519 signing key from disk.
    If the key file does not exist yet, generate a new keypair and persist it.
    """
    global _signing_key
    if _signing_key is not None:
        return _signing_key

    key_path = _get_key_path()
    if key_path.exists():
        raw = key_path.read_bytes()
        _signing_key = nacl.signing.SigningKey(raw)
        logger.info("Ed25519 signing key loaded from %s", key_path)
    else:
        _signing_key = nacl.signing.SigningKey.generate()
        key_path.parent.mkdir(parents=True, exist_ok=True)
        key_path.write_bytes(bytes(_signing_key))
        # Restrict permissions on Unix-like systems
        try:
            os.chmod(key_path, 0o600)
        except OSError:
            pass
        logger.warning("New Ed25519 keypair generated and saved to %s", key_path)

    return _signing_key


def build_canonical_payload(
    domain_name: str,
    status: str,
    compliance_level: str,
    issued_at: datetime,
) -> bytes:
    """
    Build a deterministic, canonical JSON bytes object to sign.
    Keys are sorted; datetime is serialised as ISO 8601 UTC with Z suffix.

    Handles both tz-aware datetimes (from PostgreSQL) and naive datetimes
    (from SQLite used in tests) by assuming UTC for naive values.
    """
    # Normalise: if naive, assume UTC; then strip offset for consistent Z suffix
    if issued_at.tzinfo is None:
        iso = issued_at.strftime("%Y-%m-%dT%H:%M:%S") + "Z"
    else:
        iso = issued_at.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S") + "Z"

    payload = {
        "domain_name": domain_name,
        "status": status,
        "compliance_level": compliance_level,
        "issued_at": iso,
    }
    return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")


def sign_domain(
    domain_name: str,
    status: str,
    compliance_level: str,
    issued_at: datetime,
) -> tuple[str, str]:
    """
    Sign the canonical domain payload.

    Returns:
        (signature_hex, public_key_hex)
    """
    key = load_or_create_keypair()
    payload = build_canonical_payload(domain_name, status, compliance_level, issued_at)
    signed = key.sign(payload)
    # Extract raw 64-byte signature (first 64 bytes of signed.signature)
    signature_hex = signed.signature.hex()
    public_key_hex = key.verify_key.encode(encoder=nacl.encoding.HexEncoder).decode()
    return signature_hex, public_key_hex


def verify_signature(
    domain_name: str,
    status: str,
    compliance_level: str,
    issued_at: datetime,
    signature_hex: str,
    public_key_hex: str,
) -> bool:
    """
    Verify the Ed25519 signature of a domain record.

    Returns True if the signature is valid, False otherwise.
    The public key is read from the DB record — the private key is never used here.
    """
    try:
        public_key_bytes = bytes.fromhex(public_key_hex)
        verify_key = nacl.signing.VerifyKey(public_key_bytes)
        payload = build_canonical_payload(domain_name, status, compliance_level, issued_at)
        signature_bytes = bytes.fromhex(signature_hex)
        verify_key.verify(payload, signature_bytes)
        return True
    except (nacl.exceptions.BadSignatureError, ValueError, Exception) as exc:
        logger.warning("Signature verification failed: %s", exc)
        return False
