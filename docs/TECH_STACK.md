# Tech Stack (Phase 1)

## Frontend

| Choice | Why |
|---|---|
| **Next.js 15 (App Router)** | SSR for marketing pages, RSC for catalog, client islands for canvas |
| **TypeScript** | Type safety end-to-end; types generated from backend OpenAPI |
| **Tailwind CSS** | Fast iteration, no CSS-file sprawl |
| **Zustand** | Small, ergonomic state for canvas + UI; no Redux ceremony |
| **React Flow** (or custom Konva) | Battle-tested node/edge canvas. Start with React Flow; eject only if it limits us |
| **shadcn/ui** | Accessible primitives without a heavy component library |
| **TanStack Query** | Server-state caching + request dedup |
| **openapi-typescript** | Generate TS types from the FastAPI OpenAPI schema (single source of truth) |

## Backend — single FastAPI service

One Python app handles REST + AI evaluation. No microservices in Phase 1.

| Choice | Why |
|---|---|
| **Python 3.12** | Modern syntax, great typing |
| **FastAPI** | Async, automatic OpenAPI docs, Pydantic-based validation |
| **Pydantic v2** | Runtime validation for every request/response |
| **SQLModel** | Pydantic + SQLAlchemy in one — same model class for DB + API |
| **Alembic** | DB migrations (SQLAlchemy ecosystem standard) |
| **asyncpg** | Async Postgres driver under SQLAlchemy |
| **python-jose** | JWT signing/verification |
| **passlib[argon2]** | Password hashing |
| **uvicorn** | ASGI server |
| **httpx** | Async HTTP client for calling Groq |

## Database

| Choice | Why |
|---|---|
| **PostgreSQL 16** | Relational core: users, problems, submissions |

## LLM provider — free tier

| Choice | Why |
|---|---|
| **Groq API** | Free, fast (~500 tok/s), Llama 3.3 70B is strong enough for the rubric. OpenAI-compatible endpoint |
| **Google Gemini 2.0 Flash** (fallback) | Free tier (15 req/min, 1500 req/day) — use when Groq rate-limits |

Both clients hide behind a single `LLMProvider` interface so switching is one config change. See [AI_EVALUATION.md](AI_EVALUATION.md).

## Infra

| Choice | Why |
|---|---|
| **Docker** | Local dev parity, easy deploys |
| **docker-compose** | Run Postgres + backend together for local dev |
| **GitHub Actions** | CI: lint, typecheck (mypy), tests |
| **Render / Fly.io / Railway** | Cheap, fast to ship; free tiers cover Phase 1 |
| **Sentry** | Frontend + backend error tracking (free tier) |

## Testing

- **pytest** + **pytest-asyncio** — unit + integration
- **httpx.AsyncClient** — API integration tests against the FastAPI app
- **Testcontainers (Python)** — real Postgres in integration tests (no mocks for DB)
- **Vitest** — frontend unit + component
- **Playwright** — E2E on the whiteboard

## Repo layout

```
/
├─ apps/
│  ├─ web/            # Next.js
│  └─ api/            # FastAPI (REST + AI evaluation)
├─ docs/
├─ infra/             # docker-compose
└─ scripts/           # seed data, helpers
```

## Open decisions (decide before writing Phase 1 code)

- [ ] React Flow vs custom Konva canvas
- [ ] Hosted Postgres provider (Neon / Supabase / Render — all have free tiers)
- [ ] Frontend → backend type generation strategy (openapi-typescript vs hand-written types)
