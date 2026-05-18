# apps/api

FastAPI backend for SDIP — REST + Groq LLM evaluation.

## One-time setup

```powershell
cd apps/api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
copy .env.example .env
# edit .env — at minimum set GROQ_API_KEY
```

## Run Postgres locally

From the repo root:

```powershell
docker compose -f infra/docker-compose.yml up -d
```

## Run migrations

```powershell
alembic upgrade head
```

To create a new migration after changing `app/db/models.py`:

```powershell
alembic revision --autogenerate -m "describe the change"
```

## Run the API

```powershell
uvicorn app.main:app --reload --port 8000
```

- Docs: http://localhost:8000/docs
- Health: http://localhost:8000/health
- OpenAPI: http://localhost:8000/api/v1/openapi.json

## Module layout

```
app/
├─ auth/         # signup, login, JWT
├─ problems/     # catalog endpoints + seeds
├─ submissions/  # save diagrams
├─ evaluation/   # Groq client, prompts, scoring
├─ db/           # SQLModel + Alembic
├─ core/         # config, security helpers
└─ main.py       # FastAPI app
```

All endpoints currently return `501 Not Implemented` — they're stubs to be filled in per the Phase 1 todo list.
