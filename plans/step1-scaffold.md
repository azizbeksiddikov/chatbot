# Plan: Step 1 — Scaffold

## Context

The RAG chatbot project has extensive architecture docs (~100KB across 7 files) but zero working code. All source files are empty stubs except a hello-world `main.py` and a default Next.js page. Step 1 wires everything up so `docker compose up` starts FastAPI + PostgreSQL/pgvector + Next.js, `/health` returns 200, and the frontend loads in browser.

**User requirements:** Every feature must include tests. Docs must be updated throughout. Skills (slash commands) should be added to streamline development.

---

## Files to Create/Modify

### Phase A: Environment & Config
| File | Action |
|------|--------|
| `.env.example` | Populate with all env vars (DB, auth, LLM, R2, app URLs) |
| `apps/api/pyproject.toml` | All Python deps (FastAPI, SQLAlchemy, Alembic, pgvector, Gemini, Groq, Mistral, PyMuPDF, python-pptx, boto3, pytest) |
| `apps/api/src/config.py` | Pydantic Settings class loading from env |

### Phase B: FastAPI Core
| File | Action |
|------|--------|
| `apps/api/src/__init__.py` | Create (empty) |
| `apps/api/src/models/__init__.py` | Create (empty) |
| `apps/api/src/routes/__init__.py` | Create (empty) |
| `apps/api/src/services/__init__.py` | Create (empty) |
| `apps/api/src/schemas/__init__.py` | Create (empty) |
| `apps/api/src/repositories/__init__.py` | Create (empty) |
| `apps/api/src/dependencies.py` | Async SQLAlchemy engine + `get_db` dependency |
| `apps/api/src/main.py` | Rewrite: `create_app()` factory, CORS, `/health` endpoint, lifespan |

### Phase C: Alembic
| File | Action |
|------|--------|
| `apps/api/alembic.ini` | Standard config, URL overridden by env.py |
| `apps/api/alembic/env.py` | Async migration runner using `run_sync` pattern |
| `apps/api/alembic/001_initial.py` | Delete (wrong location, placeholder) |
| `apps/api/alembic/versions/` | Create directory (empty for Step 1) |

### Phase D: Docker
| File | Action |
|------|--------|
| `apps/api/Dockerfile` | Multi-stage: python:3.12-slim, non-root user |
| `apps/web/Dockerfile` | Simple bun-based for dev docker-compose |
| `docker-compose.yml` | 3 services: `db` (pgvector/pgvector:pg16), `api` (FastAPI + hot reload), `web` (Next.js + hot reload) |
| `docker-compose.prod.yml` | Override: no volumes, restart policies, no web service |

### Phase E: Frontend
| Action | Details |
|--------|---------|
| Install shadcn/ui | `bunx shadcn@latest init` + add `button` component |
| Verify Tailwind v4 compat | shadcn/ui should detect v4 automatically |

### Phase F: Tests
| File | Action |
|------|--------|
| `apps/api/tests/__init__.py` | Create |
| `apps/api/tests/conftest.py` | Pytest fixtures: async client, test DB session |
| `apps/api/tests/test_health.py` | Test `/health` returns 200 + `{"status": "ok"}` |
| `apps/api/pytest.ini` or in `pyproject.toml` | pytest config with asyncio mode |

### Phase G: Docs
| File | Action |
|------|--------|
| `README.md` | Rewrite: project description, quick start (`docker compose up`), dev without Docker instructions, tech stack summary |
| `docs/DEV_STEPS.md` | Check off Step 1 items as completed |

---

## Key Design Decisions

1. **Docker compose includes all 3 services** — `db`, `api`, `web` — so `docker compose up` is the single dev command
2. **pgvector/pgvector:pg16** image — pgvector pre-installed, no custom build
3. **App factory pattern** — `create_app()` in main.py for testability
4. **Async Alembic** — uses `async_engine_from_config` + `run_sync` bridge
5. **Pydantic Settings** — single `Settings` class, loads from `.env`, overridable in docker-compose
6. **Tests from day one** — `pytest` + `httpx` AsyncClient for API tests

---

## Implementation Order

1. `.env.example`
2. `apps/api/pyproject.toml`
3. `__init__.py` files (all packages)
4. `apps/api/src/config.py`
5. `apps/api/src/dependencies.py`
6. `apps/api/src/main.py` (rewrite)
7. `apps/api/alembic.ini` + `alembic/env.py` + create `alembic/versions/`
8. Delete `apps/api/alembic/001_initial.py`
9. `apps/api/Dockerfile`
10. `apps/web/Dockerfile`
11. `docker-compose.yml` + `docker-compose.prod.yml`
12. Install shadcn/ui (`bunx shadcn@latest init` + add button)
13. `apps/api/tests/` — conftest + test_health
14. `README.md` update
15. `docs/DEV_STEPS.md` — check off Step 1 items

---

## Verification

1. `docker compose up` — all 3 services start without errors
2. `curl http://localhost:8000/health` — returns `{"status": "ok"}`
3. Open `http://localhost:3000` — Next.js page loads
4. `cd apps/api && pytest` — health test passes
5. `cd apps/api && alembic check` — Alembic config is valid (no migrations to run yet)
