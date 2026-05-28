"""Prompt construction for the evaluation LLM call.

The prompt is split into a static **system** message (rubric + output schema)
and a per-request **user** message (problem + serialized diagram). Splitting
this way keeps the system message identical across calls — important if we
later add prompt caching at the provider layer.
"""

from __future__ import annotations

from app.db.models import Problem
from app.submissions.schemas import Diagram

# ─── System prompt ───────────────────────────────────────────────────────────
SYSTEM_PROMPT = """\
You are a senior staff engineer at a top-tier tech company evaluating a \
candidate's system design interview submission. Your tone is direct and \
specific — like a real interviewer giving feedback after the loop.

The DIAGRAM is the primary deliverable and the primary scoring artifact. \
A well-labeled diagram alone — with the right components and edges, and \
labels that name specific technologies or roles (e.g. "Redis Cache \
(read-through)", "Postgres (replicated)", "API Gateway (auth + rate \
limit)") — is sufficient to score 5/5 in any category. Do NOT withhold \
points because the candidate didn't write prose; clear labels and edges \
ARE the explanation on a whiteboard.

The CANDIDATE NOTES are a secondary input: bonus credit when the diagram \
is sparse or generic but the notes explain the design. If the diagram \
already covers a category cleanly, the notes do not lower the score and \
should not be required to reach 5. If the diagram is missing a component \
but the notes describe it ("I would shard by user_id"), award partial \
credit and mention in the rationale that the design isn't visualized.

If both the diagram and notes are empty/trivial, score zeros.

Score the submission against these five categories, each on a 0-5 scale. \
A score of 5 means "clearly addressed by the diagram (or notes), with \
appropriate components labeled" — not "addressed AND written about in \
prose". A score of 4 means "addressed but a small piece is missing or \
generic". 3 = partially addressed. 2 = mostly missing. 1 = barely \
attempted. 0 = absent.
  - correctness    : does the design satisfy the functional requirements?
  - scalability    : will it hold up at the stated scale?
  - reliability    : how does it handle failure, partition, and recovery?
  - performance    : latency, throughput, and bottleneck awareness.
  - security       : auth, data protection, and attack surface.

For each category include a one-sentence rationale citing specific \
components or omissions in the candidate's diagram.

Then call out:
  - strengths  : up to 3 things the design does well (concrete, not generic).
  - issues     : concrete problems, each with severity (low | medium | high), \
the category it belongs to, and — when the issue is about specific \
components in the diagram — the node_ids array of the affected nodes. \
Use the exact node IDs from the diagram (the part before the colon in the \
NODES section). Leave node_ids as [] for issues about the design as a whole.
  - suggestions: up to 5 concrete improvements (not vague platitudes).

Output STRICT JSON ONLY — no markdown, no commentary outside the JSON. \
Match this schema exactly:

{
  "scores": {
    "correctness": { "value": <0-5>, "max": 5, "rationale": "<one sentence>" },
    "scalability": { "value": <0-5>, "max": 5, "rationale": "<one sentence>" },
    "reliability": { "value": <0-5>, "max": 5, "rationale": "<one sentence>" },
    "performance": { "value": <0-5>, "max": 5, "rationale": "<one sentence>" },
    "security":    { "value": <0-5>, "max": 5, "rationale": "<one sentence>" }
  },
  "strengths":   ["<concrete strength>", ...],
  "issues":      [ { "severity": "low|medium|high", "category": "<one of the 6>", "text": "<problem statement>", "node_ids": ["<id>", ...] }, ... ],
  "suggestions": ["<concrete improvement>", ...]
}
"""

REQUIRED_CATEGORIES = (
    "correctness",
    "scalability",
    "reliability",
    "performance",
    "security",
)


def build_user_prompt(problem: Problem, diagram: Diagram, notes: str = "") -> str:
    """Render problem + diagram + notes into a compact, LLM-friendly string.

    Diagrams are serialized as a labeled adjacency list rather than raw JSON —
    coordinates are noise to the LLM and waste tokens. Notes are the
    candidate's free-form explanation; treated as evidence in scoring.
    """
    parts: list[str] = []

    parts.append(f"PROBLEM: {problem.title} (id={problem.id}, difficulty={problem.difficulty.value})")
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

    parts.append("CANDIDATE DIAGRAM:")
    parts.append("")
    parts.append("NODES:")
    if not diagram.nodes:
        parts.append("  (none — the candidate did not place any components)")
    else:
        for n in diagram.nodes:
            label = n.label.strip() if n.label.strip() else "(unlabeled)"
            parts.append(f"  {n.id}: {n.type} — {label}")
    parts.append("")

    parts.append("EDGES:")
    if not diagram.edges:
        parts.append("  (none — no connections drawn)")
    else:
        # Index node labels for human-readable edge rendering.
        labels = {n.id: (n.label.strip() or n.type) for n in diagram.nodes}
        for e in diagram.edges:
            src = labels.get(e.source, e.source)
            tgt = labels.get(e.target, e.target)
            edge_label = f": {e.label}" if e.label else ""
            parts.append(f"  {src} -> {tgt}{edge_label}")
    parts.append("")

    trimmed_notes = notes.strip()
    parts.append("CANDIDATE NOTES:")
    if not trimmed_notes:
        parts.append("  (none — candidate left the notes blank)")
    else:
        # Indent each line so the structure stays readable next to the diagram.
        for line in trimmed_notes.splitlines():
            parts.append(f"  {line}")
    parts.append("")

    parts.append("Evaluate this design against the rubric. Return strict JSON only.")
    return "\n".join(parts)


def build_retry_prompt(previous_output: str, error: str) -> str:
    """Used when the first LLM output fails Pydantic validation."""
    return (
        f"Your previous output failed schema validation with error: {error}\n\n"
        f"Previous output:\n{previous_output}\n\n"
        "Return ONLY a valid JSON object matching the schema in the system prompt. "
        "No markdown, no commentary."
    )
