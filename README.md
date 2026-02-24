# Compliance Status Publishing & Verification MVP

A lightweight system to **publish**, **sign** (Ed25519), and **verify** compliance statuses for domains.

## Quick Start

### 1. Prerequisites
- [Docker](https://www.docker.com/) + Docker Compose
- OR: Python 3.11+, Node 20+, PostgreSQL 15+

---

### 2. Run with Docker (recommended)

```bash
# Clone / place the project folder, then:
cd "Lightweight Compliance Status Publishing & Verification MVP"

# Copy and configure environment
cp backend/.env.example backend/.env
# Edit backend/.env — set a strong SECRET_ADMIN_KEY

# Build and start
docker-compose up --build -d

# The API is now at http://localhost:8000
# The admin dashboard is embedded in the same origin
```

---

### 3. Run locally (development)

**Backend:**
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
cp .env.example .env          # edit DATABASE_URL and SECRET_ADMIN_KEY
uvicorn app.main:app --reload
```

**Frontend (separate terminal):**
```bash
cd frontend
npm install
npm run dev                   # opens http://localhost:5173
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | async PostgreSQL URL | `postgresql+asyncpg://postgres:password@localhost:5432/compliance_db` |
| `SECRET_ADMIN_KEY` | Admin API key (keep secret!) | `change-me-super-secret-admin-key` |
| `PRIVATE_KEY_PATH` | Path to Ed25519 private key file | `./private_key.bin` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:5173` |

> ⚠️ **Security**: Generate a strong random `SECRET_ADMIN_KEY` in production:
> ```bash
> python -c "import secrets; print(secrets.token_urlsafe(32))"
> ```

---

## API Reference

### Public Endpoints

#### `GET /health`
Returns server health status.

```json
{ "status": "ok", "version": "1.0.0" }
```

#### `GET /verify?domain=example.com`
Verifies the compliance status and Ed25519 signature for a domain.

```json
{
  "domain": "example.com",
  "status": "active",
  "compliance_level": "basic",
  "issued_at": "2026-02-24T12:00:00Z",
  "revoked_at": null,
  "signature_valid": true,
  "public_key": "abc123..."
}
```

**Status codes:** `200 OK` | `404 Not Found`

---

### Admin Endpoints (require `X-Admin-Key` header)

#### `GET /admin/domains`
List all domain records.

```bash
curl http://localhost:8000/admin/domains \
  -H "X-Admin-Key: your-admin-key"
```

#### `POST /admin/domains`
Create a new compliance record (automatically signed with Ed25519).

```bash
curl -X POST http://localhost:8000/admin/domains \
  -H "X-Admin-Key: your-admin-key" \
  -H "Content-Type: application/json" \
  -d '{"domain_name": "example.com", "compliance_level": "basic"}'
```

#### `PATCH /admin/domains/{id}/revoke`
Revoke an existing domain record.

```bash
curl -X PATCH http://localhost:8000/admin/domains/<UUID>/revoke \
  -H "X-Admin-Key: your-admin-key"
```

#### `DELETE /admin/domains/{id}`
Permanently delete a domain record.

---

## Compliance Badge

Embed a live status badge on any website:

```html
<div data-domain="example.com"></div>
<script
  src="https://your-api.com/badge/badge.js"
  data-api="https://your-api.com">
</script>
```

The badge automatically displays:
- **✓ Compliant — Active** (green, animated pulse) for active domains
- **✗ Revoked** (red) for revoked domains
- **? Unknown** (grey) if the domain is not found

Demo: open `badge/demo.html` in a browser (with the backend running).

---

## Running Tests

```bash
cd backend
pip install -r requirements.txt
# Also install aiosqlite for tests:
pip install aiosqlite
pytest -v
```

Expected output: **15 tests passing** (7 crypto + 8 API).

---

## Deployment Guide

### Railway

1. Create a new project on [railway.app](https://railway.app)
2. Add a **PostgreSQL** service
3. Add a **web service** pointing to this repo
4. Set environment variables in Railway dashboard:
   - `DATABASE_URL` → use the Railway-provided PostgreSQL URL (replace `postgres://` with `postgresql+asyncpg://`)
   - `SECRET_ADMIN_KEY` → `605664be872ec93f3c3600f12fa92193b22036cb56ec0da2929e06466f446927` (Generated for this deployment)
   - `PRIVATE_KEY_PATH` → `/app/data/private_key.bin`
5. Railway uses the `Dockerfile` automatically. Done!

### Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Set **Build Command**: `docker build -t app .`
3. Set **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add a **PostgreSQL** database in Render
5. Set the same environment variables as above
6. Deploy!

---

## Architecture

```
┌─────────────────────────────────────┐
│         FastAPI Backend              │
│  ┌───────────┐  ┌─────────────────┐ │
│  │ /admin/*  │  │ /verify         │ │
│  │ (API key) │  │ (public)        │ │
│  └─────┬─────┘  └────────┬────────┘ │
│        │                 │          │
│  ┌─────▼─────────────────▼────────┐ │
│  │         crypto.py (Ed25519)    │ │
│  │   sign() ─── verify()         │ │
│  └─────────────────┬──────────────┘ │
│                    │                 │
│  ┌─────────────────▼──────────────┐ │
│  │         PostgreSQL DB          │ │
│  │         domains table          │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
          │             │
┌─────────▼──┐   ┌──────▼──────────┐
│ React Admin│   │  badge.js (UMD) │
│ Dashboard  │   │  (any website)  │
└────────────┘   └─────────────────┘
```

---

## Security

- ✅ Private key **never** exposed via API
- ✅ Signature validated **before** every `/verify` response
- ✅ Admin endpoints protected by API key header
- ✅ Ed25519 (PyNaCl) — modern, fast, secure
- ✅ No sensitive data in frontend bundle
