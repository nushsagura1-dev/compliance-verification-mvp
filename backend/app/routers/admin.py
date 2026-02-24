"""
Admin router — CRUD endpoints for domain management.
All routes are protected by the X-Admin-Key header.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models import Domain
from app.schemas import DomainCreate, DomainResponse, DomainListResponse
from app.auth import require_admin
from app.crypto import sign_domain

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/domains", response_model=DomainListResponse, dependencies=[Depends(require_admin)])
async def list_domains(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """List all domain records, paginated."""
    total_result = await db.execute(select(func.count(Domain.id)))
    total = total_result.scalar_one()

    result = await db.execute(
        select(Domain).order_by(Domain.created_at.desc()).offset(skip).limit(limit)
    )
    items = result.scalars().all()
    return DomainListResponse(total=total, items=list(items))


@router.post("/domains", response_model=DomainResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
async def create_domain(
    payload: DomainCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new compliance record for a domain.
    The record is signed with Ed25519 at creation time.
    """
    # Check for duplicate
    existing = await db.execute(
        select(Domain).where(Domain.domain_name == payload.domain_name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Domain '{payload.domain_name}' already exists.",
        )

    issued_at = datetime.now(timezone.utc)
    signature, public_key = sign_domain(
        domain_name=payload.domain_name,
        status="active",
        compliance_level=payload.compliance_level,
        issued_at=issued_at,
    )

    domain = Domain(
        domain_name=payload.domain_name,
        status="active",
        compliance_level=payload.compliance_level,
        issued_at=issued_at,
        signature=signature,
        public_key=public_key,
    )
    db.add(domain)
    await db.flush()
    await db.refresh(domain)
    return domain


@router.patch("/domains/{domain_id}/revoke", response_model=DomainResponse, dependencies=[Depends(require_admin)])
async def revoke_domain(
    domain_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Revoke a domain compliance record.
    The status is set to 'revoked' and revoked_at is stamped.
    Note: the original signature remains valid (it was valid when issued);
    the /verify endpoint reports status=revoked so consumers can act accordingly.
    """
    result = await db.execute(select(Domain).where(Domain.id == domain_id))
    domain = result.scalar_one_or_none()
    if not domain:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found.")
    if domain.status == "revoked":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Domain is already revoked.")

    domain.status = "revoked"
    domain.revoked_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(domain)
    return domain


@router.delete("/domains/{domain_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
async def delete_domain(
    domain_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete a domain record."""
    result = await db.execute(select(Domain).where(Domain.id == domain_id))
    domain = result.scalar_one_or_none()
    if not domain:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found.")
    await db.delete(domain)
