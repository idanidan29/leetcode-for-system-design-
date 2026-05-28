"""Prompt construction for reference-solution generation.

The LLM emits a complete design using our 12 component kinds. No positions —
the frontend auto-layouts. Rationale and narrative explain WHY, not just what.
"""

from __future__ import annotations

from app.db.models import Problem

# Must match apps/web/components/whiteboard/types.ts ComponentKind union.
ALLOWED_KINDS = (
    "api-gateway",
    "load-balancer",
    "cdn",
    "websocket-gateway",
    "web-server",
    "microservice",
    "worker",
    "external-api",
    "sql-db",
    "nosql-db",
    "cache",
    "object-storage",
    "search-index",
    "analytics-db",
    "queue",
    "stream-processor",
    "custom",
)

SOLUTION_SYSTEM_PROMPT = f"""\
You are a senior staff engineer producing a REFERENCE solution to a system \
design interview problem. The diagram should be complete enough to discuss \
in a 45-minute loop — typically 7–14 nodes.

CRITICAL: this solution will be scored against the same rubric the candidate \
is scored against. It MUST score 4+ in each of the five categories below. \
For every category, include at least one component (with a clear label) and \
at least one edge that demonstrates you've addressed it:

  - correctness  : the design satisfies the functional requirements stated.
  - scalability  : horizontal scaling is visible (load balancer, sharding, \
read replicas, partitioning, fan-out queue — whichever fits the problem).
  - reliability  : failure handling is visible (replicated databases, retries \
through a queue, multi-region or multi-AZ implied, health checks).
  - performance  : a caching strategy and/or a CDN where appropriate, plus a \
clear hot-path that avoids unnecessary round-trips.
  - security     : an API gateway or equivalent that owns auth, no direct \
public exposure of databases, encryption-at-rest where relevant.

Make these explicit in node labels. "Redis Cache (read-through)" is much \
better than "Cache". "API Gateway (auth + rate limit)" beats "API Gateway". \
Use specific store names where natural ("Users (Postgres, replicated)").

You MUST use ONLY these component types (the `type` field on each node):

{", ".join(ALLOWED_KINDS)}

Use the `custom` type only when no other type fits — and set the `label` \
to whatever specific component you mean (e.g. "Analytics Pipeline").

For each node, write a one-sentence rationale explaining WHY it's there \
(what failure mode or requirement it addresses, and which rubric category \
it primarily serves). Then write a 2-paragraph overall narrative explaining \
the design's main trade-offs.

Node IDs: short, unique strings (n1, n2, n3, ...). Edge IDs: e1, e2, ...

Edges should reflect data/request flow. Use the `label` field on an edge \
when it adds clarity (e.g. "cache lookup", "async write", "replicate").

Output STRICT JSON ONLY in this exact shape — no markdown, no commentary:

{{
  "nodes": [
    {{ "id": "n1", "type": "<one of the allowed types>", "label": "<short name>" }},
    ...
  ],
  "edges": [
    {{ "id": "e1", "source": "<node id>", "target": "<node id>", "label": "<short or null>" }},
    ...
  ],
  "rationale": {{
    "n1": "<one sentence on why this component>",
    "n2": "...",
    ...
  }},
  "narrative": "<paragraph 1>\\n\\n<paragraph 2>"
}}
"""


def build_solution_user_prompt(problem: Problem) -> str:
    parts: list[str] = []
    parts.append(f"PROBLEM: {problem.title} (difficulty={problem.difficulty.value})")
    parts.append("")
    parts.append("STATEMENT:")
    parts.append(problem.statement.strip())
    parts.append("")
    parts.append("FUNCTIONAL REQUIREMENTS:")
    parts.extend(f"  - {r}" for r in problem.functional_requirements)
    parts.append("")
    parts.append("NON-FUNCTIONAL REQUIREMENTS:")
    parts.extend(f"  - {r}" for r in problem.non_functional_requirements)
    parts.append("")
    if problem.constraints:
        parts.append("CONSTRAINTS:")
        for k, v in problem.constraints.items():
            parts.append(f"  - {k}: {v}")
        parts.append("")
    parts.append(
        "Produce a reference solution. Return strict JSON only matching the "
        "schema in the system prompt."
    )
    return "\n".join(parts)
