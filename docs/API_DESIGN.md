# API Design (Phase 1)

## REST conventions

- Base path: `/api/v1`
- Framework: FastAPI (OpenAPI schema at `/api/v1/openapi.json`, Swagger UI at `/docs`)
- JSON only
- Auth: `Authorization: Bearer <jwt>` on every protected route
- Errors: RFC 7807 problem+json
  ```json
  { "type": "about:blank", "title": "Validation failed", "status": 400, "detail": "...", "errors": [...] }
  ```
- Pagination: cursor-based (`?cursor=...&limit=...`)
- All request/response bodies are Pydantic models — frontend types generated from the OpenAPI schema

## Endpoints

### Auth
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/auth/signup` | `{email, password, display_name}` | `{user, access_token, refresh_token}` |
| POST | `/auth/login` | `{email, password}` | `{user, access_token, refresh_token}` |
| POST | `/auth/refresh` | `{refresh_token}` | `{access_token, refresh_token}` |
| POST | `/auth/logout` | — | 204 |
| GET | `/auth/me` | — | `{user}` |

### Problems
| Method | Path | Returns |
|---|---|---|
| GET | `/problems?difficulty=&tags=&cursor=` | `{items, next_cursor}` |
| GET | `/problems/:id` | `{problem}` |

### Submissions
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/submissions` | `{problem_id, diagram}` | `{submission}` |
| GET | `/submissions/:id` | — | `{submission}` |
| GET | `/submissions?problem_id=&mine=true` | — | `{items, next_cursor}` |
| PATCH | `/submissions/:id` | `{diagram}` | `{submission}` |
| POST | `/submissions/:id/evaluate` | — | `{submission}` (evaluation populated) |
| GET | `/submissions/:id/evaluation` | — | `{status, result?}` |

## Versioning

- Path-based: `/api/v1` → `/api/v2` only for breaking changes
- Diagram payload includes an explicit `version` field; migration logic on load
