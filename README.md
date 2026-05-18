# System Design Interview Platform (SDIP)

> "LeetCode for System Design Interviews"

A platform where users practice system design interviews through structured problem prompts, an interactive architecture whiteboard, and AI-driven evaluation.

## Phase 1 capabilities (current scope)

- Curated system-design problem catalog with difficulty, tags, and constraints
- Interactive whiteboard (nodes, edges) — single-player
- Save / reload diagrams per problem
- AI evaluation across correctness, scalability, reliability, performance, security, cost
- Email/password auth (JWT)

## Stack at a glance

- **Frontend:** Next.js 15 + TypeScript
- **Backend:** FastAPI (Python 3.12) — single service, no microservices in Phase 1
- **DB:** PostgreSQL (SQLModel + Alembic)
- **LLM:** Groq free tier (Llama 3.3 70B), Gemini as fallback

## Repo layout

```
apps/
├─ web/    Next.js frontend  →  apps/web/README.md
└─ api/    FastAPI backend   →  apps/api/README.md
docs/      Planning + design docs
infra/     docker-compose for local Postgres
scripts/   seed data + helpers
```

## Quick start

```powershell
# 1. Start Postgres
docker compose -f infra/docker-compose.yml up -d

# 2. Backend (in one terminal)
cd apps/api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
copy .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# 3. Frontend (in another terminal)
cd apps/web
npm install
npm run dev
```

Frontend on http://localhost:3000, API on http://localhost:8000/docs.

## Documentation

Planning docs live in [docs/](docs/):

- [MVP.md](docs/MVP.md) — Phase 1 scope + acceptance criteria (start here)
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — services, data flow
- [TECH_STACK.md](docs/TECH_STACK.md) — chosen tech + rationale
- [DATA_MODELS.md](docs/DATA_MODELS.md) — Postgres schema
- [API_DESIGN.md](docs/API_DESIGN.md) — REST contracts
- [AI_EVALUATION.md](docs/AI_EVALUATION.md) — AI scoring pipeline
