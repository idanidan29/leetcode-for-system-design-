# AI Evaluation (Phase 1)

## Purpose

Given a `(problem, diagram)` pair, produce structured, actionable feedback that a candidate could use to iterate on their design.

## Provider: Groq (free tier)

- **Model:** `llama-3.3-70b-versatile`
- **Endpoint:** OpenAI-compatible — `https://api.groq.com/openai/v1/chat/completions`
- **Why:** free, ~500 tok/sec, strong enough reasoning for our rubric
- **Auth:** `GROQ_API_KEY` env var
- **SDK:** `groq` Python package OR plain `httpx` against the OpenAI-compatible endpoint

### Fallback: Google Gemini

If Groq rate-limits or fails, fall back to **Gemini 2.0 Flash** (free tier: 15 req/min, 1500 req/day).

Both providers hide behind one interface:

```python
class LLMProvider(Protocol):
    async def evaluate(self, system: str, user: str) -> str: ...
```

Switching = swapping the implementation in `apps/api/app/evaluation/provider.py`.

## Single LLM call

### Input
```json
{
  "problem": {
    "id": "design-url-shortener",
    "title": "...",
    "statement": "...",
    "functional_requirements": [...],
    "non_functional_requirements": [...],
    "constraints": {...}
  },
  "diagram": {
    "nodes": [...],
    "edges": [...]
  }
}
```

### Prompt structure

**System message** (static — same for every request, good candidate for caching if we ever switch to a provider that supports it):
- Role: senior staff engineer evaluating a system design interview
- Rubric: 6 categories (correctness, scalability, reliability, performance, security, cost)
- Output: strict JSON only, schema specified inline

**User message:**
- Problem statement + requirements + constraints
- Diagram serialized as a labeled adjacency list (more LLM-friendly than raw JSON)
- "Evaluate this design against the rubric."

### Output schema (validated with Pydantic)

```python
class CategoryScore(BaseModel):
    value: int  # 0-5
    max: int = 5
    rationale: str

class Issue(BaseModel):
    severity: Literal["low", "medium", "high"]
    category: str
    text: str

class Evaluation(BaseModel):
    scores: dict[str, CategoryScore]  # keys: correctness, scalability, ...
    strengths: list[str]
    issues: list[Issue]
    suggestions: list[str]
```

Output validation:
1. Force JSON mode if provider supports it (Groq does via `response_format={"type": "json_object"}`)
2. Parse → validate with `Evaluation.model_validate_json(...)`
3. On validation failure: retry once with `"Your last output failed schema validation. Return valid JSON matching this schema: ..."`
4. On second failure: persist `evaluation_status='failed'` and surface a clean error to the client

### Diagram serialization

Convert raw canvas JSON to a compact labeled adjacency form so the LLM doesn't waste tokens on coordinates:
```
NODES:
  node-1: redis (Redis Cache) — notes: stores hot session data
  node-2: postgres (Users DB)
  node-3: api-gateway (API Gateway)

EDGES:
  node-3 → node-1: cache lookup (1ms)
  node-1 → node-2: cache miss
  node-3 → node-2: write through
```

### Cost / quota controls

Groq's free tier is generous but not infinite. Protect it:

- **Per-user rate limit:** 5 evaluations / hour, enforced by slowapi
- **Output token cap:** `max_tokens=2000` — enough for the rubric, prevents runaway responses
- **In-memory eval cache:** key by `(problem_id, sha256(diagram_canonical_json))`, store result for the process lifetime. Stops a user spamming "Evaluate" on the same diagram
- **Server-side timeout:** 30s. If the LLM hangs, fail the submission with `evaluation_status='failed'`

### Execution

Synchronous in Phase 1: `POST /submissions/:id/evaluate` blocks until Groq responds. Llama 3.3 70B on Groq usually finishes in 3–8 seconds for our prompt size.

If latency becomes a problem later, switch to a background task without changing the client contract (poll `GET /submissions/:id/evaluation`).
