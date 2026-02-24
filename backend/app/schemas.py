from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field


# ─── Request Schemas ──────────────────────────────────────────────────────────

class DomainCreate(BaseModel):
    domain_name: str = Field(..., description="Domain name (e.g. example.com)", min_length=3, max_length=255)
    compliance_level: str = Field(..., description="Compliance tier (e.g. 'basic', 'advanced')", min_length=1, max_length=50)


# ─── Response Schemas ─────────────────────────────────────────────────────────

class DomainResponse(BaseModel):
    id: str
    domain_name: str
    status: str
    compliance_level: str
    issued_at: datetime
    revoked_at: Optional[datetime]
    signature: str
    public_key: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DomainListResponse(BaseModel):
    total: int
    items: list[DomainResponse]


class VerifyResponse(BaseModel):
    domain: str
    status: Literal["active", "revoked"]
    compliance_level: str
    issued_at: datetime
    revoked_at: Optional[datetime]
    signature_valid: bool
    public_key: str


class HealthResponse(BaseModel):
    status: str
    version: str
