# Architecture (Phase 1)

## High-level diagram

```
                       ┌──────────────────────┐
                       │  Frontend (Next.js)  │
                       └──────────┬───────────┘
                                  │ HTTPS
                                  ▼
                       ┌──────────────────────┐
                       │   FastAPI backend    │
                       │  (REST + AI calls)   │
                       └──┬───────────────┬───┘
                          │               │
                          ▼               ▼
              ┌────────────────┐   ┌──────────────────────┐
              │  PostgreSQL    │   │   Groq API           │
              │  (users,       │   │   (Llama 3.3 70B)    │
              │  problems,     │   │   free tier          │
              │  submissions)  │   └──────────────────────┘
              └────────────────┘
```

One backend service. Two external dependencies: Postgres and the LLM provider.

## Backend modules

Inside the single FastAPI app, organize by bounded context:

```
apps/api/app/
├─ auth/              # signup, login, JWT, password hashing
├─ problems/          # catalog endpoints + seed data
├─ submissions/       # save diagram + trigger evaluation
├─ evaluation/        # LLM provider interface, Groq client, prompt
├─ db/                # SQLModel models + Alembic migrations
├─ core/              # config, security, dependencies
└─ main.py            # FastAPI app + router registration
```

## Data flow — save + evaluate

1. Client `POST /submissions` with `{problem_id, diagram}`
2. FastAPI validates with Pydantic, persists row in `submissions`
3. Client `POST /submissions/:id/evaluate`
4. Backend loads the problem + diagram, calls Groq, validates the JSON response with Pydantic
5. Stores the evaluation on the submission row, returns it

All synchronous in Phase 1 — no queue, no worker.

## Security

- JWT auth on every protected REST route (`Depends(get_current_user)`)
- Refresh token rotation
- Basic rate limiting via [slowapi](https://github.com/laurentS/slowapi) (in-memory token bucket — fine for Phase 1)
- Pydantic validates every payload at the boundary
- Diagram JSON size cap (e.g. 256 KB) enforced before persistence
- Secrets via env vars only (`.env` ignored by git; `.env.example` checked in)

## Observability

- Structured JSON logs (`structlog` or `loguru`)
- Request IDs middleware — propagated into LLM call logs
- Sentry SDK for errors

## Non-functional targets

| Metric | Target |
|---|---|
| API latency (p95, non-LLM endpoints) | <200ms |
| LLM evaluation (p95) | <30s |
| Uptime | 99.5% |
