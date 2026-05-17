# CLAUDE.md

Conventions and orientation for AI assistants working in this repo.

## What this project is

A system-design interview practice platform. Currently in **Phase 1** scope. See [README.md](README.md) for the pitch, [docs/](docs/) for full planning.

## Stack

- **Frontend:** Next.js 15 + TypeScript + Tailwind + Zustand
- **Backend:** **FastAPI** (Python 3.12) — single service, REST + LLM calls
- **DB:** PostgreSQL via SQLModel + Alembic
- **LLM:** Groq free tier (Llama 3.3 70B), Gemini as fallback

## Start here

Before touching code on a new task:

1. Read [docs/MVP.md](docs/MVP.md) — know exactly what's in scope.
2. Read the doc closest to the task:
   - API change → [docs/API_DESIGN.md](docs/API_DESIGN.md)
   - Schema change → [docs/DATA_MODELS.md](docs/DATA_MODELS.md)
   - AI scoring → [docs/AI_EVALUATION.md](docs/AI_EVALUATION.md)
3. Stay inside Phase 1 scope. Anything else needs explicit user approval.

## Repo layout (target — not all created yet)

```
apps/web    Next.js frontend
apps/api    FastAPI backend (REST + AI evaluation)
docs/       Planning + design docs
infra/      docker-compose for local dev
scripts/    seed data + helpers
```

## Conventions

### Python (backend)
- Python 3.12, type hints everywhere, `mypy --strict` clean.
- Pydantic v2 for every request/response and every LLM output.
- SQLModel classes for DB; Alembic for migrations (append-only — never edit a merged revision).
- One package per bounded context (`auth/`, `problems/`, `submissions/`, `evaluation/`).
- FastAPI dependency injection over module-level globals.
- No raw SQL except in Alembic migrations or explicit perf hotspots.

### TypeScript (frontend)
- Strict mode. No `any` without a comment justifying it.
- Generate types from backend OpenAPI (`openapi-typescript`) — don't hand-write DTOs.
- Server Components by default; `"use client"` only when needed (canvas, forms).
- State: Zustand for canvas + UI, TanStack Query for server state. No Redux.
- Tailwind + shadcn/ui. No CSS modules unless absolutely necessary.

### Testing
- pytest + pytest-asyncio for backend.
- Integration tests hit a real Postgres via Testcontainers — **no mocks for the DB**.
- Playwright for E2E on the whiteboard.
- Unit tests for pure logic (diagram serialization, prompt building).

### LLM
- All calls go through the `LLMProvider` interface in `apps/api/app/evaluation/provider.py` — never call the Groq SDK directly from elsewhere.
- Validate every LLM output with Pydantic; retry once on validation failure, then fail loudly.
- Use JSON mode (`response_format={"type": "json_object"}`) when the provider supports it.
- Per-user rate limit (5/hr) on the evaluate endpoint — don't burn the free tier.

## Definition of done

Before marking any task complete:
- [ ] `mypy` clean on the backend
- [ ] `ruff` + `ruff format` clean
- [ ] Frontend `tsc` + `eslint` clean
- [ ] Tests added for new behavior (integration > unit when feasible)
- [ ] No new `TODO` without an issue link
- [ ] If touching API contract: doc updated in same PR, frontend types regenerated

## What not to do

- Don't introduce a second state library on the frontend (no Redux on top of Zustand).
- Don't mock the DB in integration tests.
- Don't scope-creep beyond Phase 1 without asking.
- Don't call the LLM SDK outside the `evaluation/` package.
- Don't store secrets in the repo. Use env vars; document them in `.env.example`.
