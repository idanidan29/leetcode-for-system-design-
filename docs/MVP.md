# Phase 1 — Core MVP

**Definition of done:** A logged-in user can pick a problem from a catalog, draw a system design on a canvas, save it, and receive structured AI feedback.

## User flow

**Guest-first, signup-gated for value actions:**

- **Public (no account):** browse the catalog, open a problem, sketch on the whiteboard (client-side only, nothing persisted).
- **Auth required:** save a submission, evaluate it with the LLM, view past submissions.

Rationale: lower friction so users feel the product before committing, and gate the free LLM tier behind authenticated per-user rate limits.

## In scope

### Auth
- Email + password signup / login (passwords hashed with argon2id)
- JWT access token (15 min) + refresh token (7 days), stored in **httpOnly Secure SameSite=Lax cookies** (not localStorage)
- `users` table: id, email, password_hash, display_name, created_at

### Problems
- Read-only catalog (seeded via `scripts/seed_problems.py`, no admin UI)
- 10 seed problems covering: URL shortener, Twitter feed, chat, rate limiter, search autocomplete, video streaming, payment, notification, ride sharing, distributed cache
- Fields: id, title, difficulty, statement, functional_requirements, non_functional_requirements, constraints, tags
- Endpoints: `GET /problems`, `GET /problems/:id`

### Whiteboard (single-player)
- Canvas with pan/zoom, undo/redo (in-memory only)
- Component palette: API Gateway, Load Balancer, Web Server, Cache, SQL DB, NoSQL DB, Queue, Object Storage, CDN, Microservice, External API
- Edges with directional arrows + optional labels
- Save diagram as JSON to `submissions` table
- Load existing submission for a problem

### AI feedback
- `POST /submissions/:id/evaluate` → FastAPI calls Groq (Llama 3.3 70B) synchronously
- Pydantic-validated output: strengths[], issues[], suggestions[], scores per category
- Per-user rate limit: 5 evaluations / hour
- Stored on the submission, displayed below the canvas

### Infra
- PostgreSQL (managed — Neon / Supabase / Render free tier)
- Single deploy target (Render / Fly.io / Railway free tier)
- Backend env vars: `DATABASE_URL`, `JWT_SECRET`, `GROQ_API_KEY`, `GEMINI_API_KEY` (optional fallback)

## Acceptance criteria

- [ ] New user can sign up, log in, log out
- [ ] User sees a list of ≥10 problems with difficulty + tags
- [ ] User can open a problem, view requirements, and start a diagram
- [ ] User can place ≥5 node types and connect them with edges
- [ ] User can save and reload a diagram for the same problem
- [ ] User can click "Evaluate" and receive structured AI feedback within 30s
- [ ] All protected endpoints require a valid JWT
- [ ] Rate limit kicks in on the 6th evaluation in an hour
- [ ] Lighthouse perf score >80 on the whiteboard page
- [ ] CI green on every PR (lint + mypy + tests for backend; tsc + eslint for frontend)
