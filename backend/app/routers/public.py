"""
Public router — endpoints accessible without authentication.
"""

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import Depends

from app.database import get_db
from app.models import Domain
from app.schemas import VerifyResponse
from app.crypto import verify_signature

router = APIRouter(tags=["Public"])


@router.get("/verify", response_model=VerifyResponse)
async def verify_domain(
    domain: str = Query(..., description="Domain name to verify (e.g. example.com)"),
    db: AsyncSession = Depends(get_db),
):
    """
    Public endpoint to verify the compliance status of a domain.

    - Looks up the domain record in the database.
    - Validates the Ed25519 signature before responding.
    - Returns the full status including signature_valid field.
    """
    result = await db.execute(
        select(Domain).where(Domain.domain_name == domain)
    )
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No compliance record found for domain '{domain}'.",
        )

    # Validate signature using the stored public key (private key NOT used here)
    is_valid = verify_signature(
        domain_name=record.domain_name,
        status="active",          # signature was created against 'active' status
        compliance_level=record.compliance_level,
        issued_at=record.issued_at,
        signature_hex=record.signature,
        public_key_hex=record.public_key,
    )

    return VerifyResponse(
        domain=record.domain_name,
        status=record.status,  # type: ignore[arg-type]
        compliance_level=record.compliance_level,
        issued_at=record.issued_at,
        revoked_at=record.revoked_at,
        signature_valid=is_valid,
        public_key=record.public_key,
    )
