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

- **Frontend:** Next.js + TypeScript + Tailwind
- **Backend:** FastAPI (Python) — single service, no microservices in Phase 1
- **DB:** PostgreSQL (SQLModel + Alembic)
- **LLM:** Groq free tier (Llama 3.3 70B), Gemini as fallback

## Documentation

Planning docs live in [docs/](docs/):

- [MVP.md](docs/MVP.md) — Phase 1 scope + acceptance criteria (start here)
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — services, data flow
- [TECH_STACK.md](docs/TECH_STACK.md) — chosen tech + rationale
- [DATA_MODELS.md](docs/DATA_MODELS.md) — Postgres schema
- [API_DESIGN.md](docs/API_DESIGN.md) — REST contracts
- [AI_EVALUATION.md](docs/AI_EVALUATION.md) — AI scoring pipeline

## Status

Pre-implementation — planning phase. Code scaffolding begins next.
