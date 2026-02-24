"""
test_api.py — Integration tests for admin and public API endpoints.
Uses an in-memory SQLite database so no real PostgreSQL needed.
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.main import app
from app.database import Base, get_db
from app.config import get_settings

settings = get_settings()

# ─── Override DB with async SQLite for tests ──────────────────────────────────
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


app.dependency_overrides[get_db] = override_get_db

ADMIN_HEADERS = {"X-Admin-Key": settings.secret_admin_key}


@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_db():
    """Create all tables before each test, drop after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_create_domain():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.post(
            "/admin/domains",
            json={"domain_name": "test.com", "compliance_level": "basic"},
            headers=ADMIN_HEADERS,
        )
    assert r.status_code == 201
    data = r.json()
    assert data["domain_name"] == "test.com"
    assert data["status"] == "active"
    assert len(data["signature"]) == 128
    assert len(data["public_key"]) == 64


@pytest.mark.asyncio
async def test_create_domain_requires_auth():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.post(
            "/admin/domains",
            json={"domain_name": "nope.com", "compliance_level": "basic"},
        )
    assert r.status_code == 422  # Missing required header → validation error


@pytest.mark.asyncio
async def test_create_domain_wrong_key():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.post(
            "/admin/domains",
            json={"domain_name": "nope.com", "compliance_level": "basic"},
            headers={"X-Admin-Key": "wrong-key"},
        )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_revoke_domain():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        create_r = await client.post(
            "/admin/domains",
            json={"domain_name": "revoke-me.com", "compliance_level": "basic"},
            headers=ADMIN_HEADERS,
        )
        domain_id = create_r.json()["id"]

        revoke_r = await client.patch(
            f"/admin/domains/{domain_id}/revoke",
            headers=ADMIN_HEADERS,
        )
    assert revoke_r.status_code == 200
    assert revoke_r.json()["status"] == "revoked"
    assert revoke_r.json()["revoked_at"] is not None


@pytest.mark.asyncio
async def test_verify_domain():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await client.post(
            "/admin/domains",
            json={"domain_name": "verify-me.com", "compliance_level": "advanced"},
            headers=ADMIN_HEADERS,
        )
        r = await client.get("/verify?domain=verify-me.com")

    assert r.status_code == 200
    data = r.json()
    assert data["domain"] == "verify-me.com"
    assert data["status"] == "active"
    assert data["signature_valid"] is True


@pytest.mark.asyncio
async def test_verify_unknown_domain():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/verify?domain=unknown-xyz.com")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_duplicate_domain_rejected():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await client.post(
            "/admin/domains",
            json={"domain_name": "dup.com", "compliance_level": "basic"},
            headers=ADMIN_HEADERS,
        )
        r = await client.post(
            "/admin/domains",
            json={"domain_name": "dup.com", "compliance_level": "basic"},
            headers=ADMIN_HEADERS,
        )
    assert r.status_code == 409
