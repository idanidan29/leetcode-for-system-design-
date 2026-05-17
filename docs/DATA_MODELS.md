# Data Models (Phase 1)

## PostgreSQL schema

Defined as SQLModel classes in `apps/api/app/db/models.py`. Migrations managed by Alembic.

### `users`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| email | citext UNIQUE NOT NULL | |
| password_hash | text NOT NULL | argon2id (passlib) |
| display_name | text NOT NULL | |
| created_at | timestamptz | default now() |

### `problems`
| column | type | notes |
|---|---|---|
| id | text PK | slug, e.g. `design-url-shortener` |
| title | text NOT NULL | |
| difficulty | enum('easy','medium','hard') | |
| statement | text NOT NULL | markdown |
| functional_requirements | jsonb | string[] |
| non_functional_requirements | jsonb | string[] |
| constraints | jsonb | `{requests_per_day, latency, ...}` |
| tags | text[] | |
| created_at | timestamptz | |

### `submissions`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK users | |
| problem_id | text FK problems | |
| diagram | jsonb NOT NULL | `{nodes, edges}` |
| evaluation | jsonb | nullable; AI output |
| evaluation_status | enum('pending','running','done','failed') | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Index: `(user_id, problem_id, created_at DESC)`

## Canvas state shape (stored in `submissions.diagram`)

```json
{
  "version": 1,
  "nodes": [
    {
      "id": "node-1",
      "type": "redis",
      "label": "Redis Cache",
      "position": { "x": 120, "y": 240 },
      "metadata": { "notes": "stores hot session data" }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "from": "node-1",
      "to": "node-2",
      "label": "caching layer",
      "metadata": { "latency_ms": 1, "throughput": "10k/s" }
    }
  ]
}
```

Validated with a Pydantic model in `apps/api/app/submissions/schemas.py`. The same shape is shared with the frontend via the OpenAPI-generated types.

## Migration strategy

- One Alembic revision per logical change
- Never edit a merged revision; always add a new one
- Backfills as separate scripts in `scripts/` — never inside revisions
- `alembic upgrade head` on every backend startup in dev; manual in prod
