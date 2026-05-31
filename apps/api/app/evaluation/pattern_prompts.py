"""Prompts for the design-pattern track.

System-design prompts grade scalability/reliability/etc., which is nonsense
for "implement a Singleton." This file holds the parallel prompt set for the
pattern discipline: a UML-aware evaluator, hints, and reference solution.

All three share the same JSON schemas as the system-design counterparts
(`Evaluation`, `HintsResponse`, `SolutionResponse`) — only the rubric, the
allowed component kinds, and the framing differ.
"""

from __future__ import annotations

from app.db.models import Problem
from app.submissions.schemas import Diagram

from .prompt import _methods_of


# ─── Allowed UML kinds for the solution generator ────────────────────────────
# Matches the `discipline: "pattern"` entries in
# apps/web/components/whiteboard/types.ts (plus "custom" which is shared).
PATTERN_ALLOWED_KINDS = (
    "uml-class",
    "uml-interface",
    "uml-abstract",
    "uml-enum",
    "uml-note",
    "custom",
)


# ─── Evaluation rubric ───────────────────────────────────────────────────────
# Pattern problems collapse to a single dimension: did the candidate
# implement the pattern correctly? Splitting into scalability/extensibility/
# etc. felt over-engineered for "draw a Singleton". One score, fine-grained.
PATTERN_REQUIRED_CATEGORIES = ("pattern",)


PATTERN_SYSTEM_PROMPT = """\
You are a senior software engineer reviewing a candidate's design-pattern \
sketch. The candidate has drawn a UML class diagram using these shape kinds: \
`uml-class` (solid rectangle, concrete class), `uml-interface` (dashed, \
abstract contract), `uml-abstract` (dashed, abstract base class), \
`uml-enum`, `uml-note` (folded-corner annotation), and the generic `custom`. \
Edges may be plain lines or arrows; the candidate's tooling does not yet \
emit specific UML relationship arrowheads (inheritance triangles, \
composition diamonds, etc.), so judge intent by labels and topology, not \
by arrow style.

The DIAGRAM is the primary scoring artifact. A well-labeled UML sketch \
alone — appropriate classes, interfaces, methods, and relationships, with \
clear labels — is sufficient to score 5/5. Do NOT withhold points because \
the candidate didn't write prose; clear shapes, methods, and edges ARE the \
explanation.

Each class-like node may carry a list of method signatures (e.g. \
`attach(observer)`, `notify()`, `update(data)`) — these appear as indented \
bullets under the node's NODES entry. Treat present methods as first-class \
evidence: a Subject node that lists `attach`, `detach`, and `notify` proves \
the Observer pattern's notification mechanism even without a separate node. \
Do not penalize a candidate for a "missing method" if the role is clearly \
covered by another node's responsibilities.

The CANDIDATE NOTES are a secondary input: bonus credit when the diagram \
is sparse, but never required to reach 5 on a complete diagram. If both \
the diagram and notes are empty/trivial, score zero.

You score one dimension on a 0-5 scale:

  pattern — Did the candidate implement the pattern correctly?
    This rolls together: are the canonical participants present (e.g. \
Subject + Observer interface for Observer; Strategy interface + concrete \
strategies for Strategy; Component + Decorator wrappers for Decorator), \
do they depend on abstractions rather than concretions, and does the \
shape of the design solve the stated problem? Penalize "patternitis" \
(extra classes the pattern doesn't need) the same as missing participants.

Scoring rubric:
  - 5 = canonical implementation; the right participants in the right \
relationships, would pass a code review.
  - 4 = essentially correct, one small thing off (a missing interface \
on a participant, a participant labeled vaguely).
  - 3 = the shape is recognizable but a key participant is missing or \
miswired.
  - 2 = some pattern elements present but the structure doesn't actually \
work.
  - 1 = barely attempted; a couple of boxes but no recognizable structure.
  - 0 = empty or unrelated.

Write a 1-2 sentence rationale that names what's present, what's missing, \
and the verdict.

Then call out:
  - strengths  : up to 3 things the design does well (concrete, not generic).
  - issues     : concrete problems, each with severity (low | medium | high), \
the category (always "pattern"), and — when the issue is about \
specific components in the diagram — the node_ids array of the affected \
nodes. Use the exact node IDs from the diagram (the part before the colon \
in the NODES section). Leave node_ids as [] for issues about the design \
as a whole.
  - suggestions: up to 5 concrete improvements (not vague platitudes).

Output STRICT JSON ONLY — no markdown, no commentary outside the JSON. \
Match this schema exactly:

{
  "scores": {
    "pattern": { "value": <0-5>, "max": 5, "rationale": "<one or two sentences>" }
  },
  "strengths":   ["<concrete strength>", ...],
  "issues":      [ { "severity": "low|medium|high", "category": "pattern", "text": "<problem statement>", "node_ids": ["<id>", ...] }, ... ],
  "suggestions": ["<concrete improvement>", ...]
}
"""


def build_pattern_user_prompt(problem: Problem, diagram: Diagram, notes: str = "") -> str:
    """Render the pattern problem + diagram + notes into a compact prompt.

    Pattern problems intentionally carry only a statement (no FR/NFR list),
    so the body is shorter than the system-design version.
    """
    parts: list[str] = []

    parts.append(f"PROBLEM: {problem.title} (id={problem.id}, difficulty={problem.difficulty.value})")
    parts.append("")
    parts.append("STATEMENT:")
    parts.append(problem.statement.strip())
    parts.append("")

    parts.append("CANDIDATE DIAGRAM:")
    parts.append("")
    parts.append("NODES:")
    if not diagram.nodes:
        parts.append("  (none — the candidate did not place any UML shapes)")
    else:
        for n in diagram.nodes:
            label = n.label.strip() if n.label.strip() else "(unlabeled)"
            parts.append(f"  {n.id}: {n.type} — {label}")
            for m in _methods_of(n):
                parts.append(f"      • {m}")
    parts.append("")

    parts.append("EDGES:")
    if not diagram.edges:
        parts.append("  (none — no relationships drawn)")
    else:
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
        for line in trimmed_notes.splitlines():
            parts.append(f"  {line}")
    parts.append("")

    parts.append("Evaluate this UML sketch against the rubric. Return strict JSON only.")
    return "\n".join(parts)


# ─── Hints ───────────────────────────────────────────────────────────────────
PATTERN_HINTS_SYSTEM_PROMPT = """\
You are a senior engineer giving a candidate three progressive hints on \
their design-pattern sketch. The diagram is a UML class diagram \
(`uml-class`, `uml-interface`, `uml-abstract`, `uml-enum`, `uml-note`, \
`custom`). Tailor every hint to what they've drawn — never generic.

Hint levels:
  - level 1: a vague nudge — point at the pattern's spirit ("what role is \
missing?") without spelling out the structure.
  - level 2: a specific consideration — name a participant or relationship \
that's absent or misplaced, but don't draw the diagram for them.
  - level 3: a structural pointer — describe the concrete next move \
("Introduce an abstract Shape interface that Circle and Square implement, \
and have ShapeFactory return Shape").

Output STRICT JSON ONLY in this exact shape:

{
  "hints": [
    { "level": 1, "text": "<vague nudge>" },
    { "level": 2, "text": "<specific consideration>" },
    { "level": 3, "text": "<structural pointer>" }
  ]
}
"""


def build_pattern_hints_user_prompt(problem: Problem, diagram: Diagram) -> str:
    parts: list[str] = []

    parts.append(f"PROBLEM: {problem.title} (id={problem.id}, difficulty={problem.difficulty.value})")
    parts.append("")
    parts.append("STATEMENT:")
    parts.append(problem.statement.strip())
    parts.append("")

    parts.append("CURRENT SKETCH:")
    parts.append("")
    parts.append("NODES:")
    if not diagram.nodes:
        parts.append("  (none — the candidate has not started)")
    else:
        for n in diagram.nodes:
            label = n.label.strip() if n.label.strip() else "(unlabeled)"
            parts.append(f"  {n.id}: {n.type} — {label}")
            for m in _methods_of(n):
                parts.append(f"      • {m}")
    parts.append("")

    parts.append("EDGES:")
    if not diagram.edges:
        parts.append("  (none)")
    else:
        labels = {n.id: (n.label.strip() or n.type) for n in diagram.nodes}
        for e in diagram.edges:
            src = labels.get(e.source, e.source)
            tgt = labels.get(e.target, e.target)
            edge_label = f": {e.label}" if e.label else ""
            parts.append(f"  {src} -> {tgt}{edge_label}")
    parts.append("")

    parts.append("Return 3 progressive hints as strict JSON. No commentary.")
    return "\n".join(parts)


# ─── Reference solution ──────────────────────────────────────────────────────
PATTERN_SOLUTION_SYSTEM_PROMPT = f"""\
You are a senior engineer producing a REFERENCE solution for a design-pattern \
interview problem. Output a clean UML class diagram showing the canonical \
GoF structure for the named pattern.

CRITICAL: this solution is scored against the same rubric as the candidate. \
It MUST score 4+ in each of these categories: correctness, pattern, \
encapsulation, extensibility, simplicity. The diagram alone must be \
sufficient — clear UML labels carry the design, no prose required.

You MUST use ONLY these component types (the `type` field on each node):

{", ".join(PATTERN_ALLOWED_KINDS)}

Conventions:
  - `uml-class`: concrete class. Label it with the class name only.
  - `uml-interface`: abstract contract. Prefix label with "«Interface» " \
(e.g. "«Interface» Observer").
  - `uml-abstract`: abstract base class. Prefix label with "«Abstract» " \
(e.g. "«Abstract» Beverage").
  - `uml-enum`: enumeration. Prefix label with "«Enum» " if you use one.
  - `uml-note`: short annotation pinned next to whatever it explains.
  - `custom`: only when no other type fits; set the label to whatever you \
specifically mean.

Edges represent relationships. Use the `label` field to spell out the \
relationship since the tool can't render specialized UML arrowheads yet — \
e.g. label edges "extends", "implements", "uses", "owns", "wraps".

Aim for 5–10 nodes. Include only the participants the pattern actually \
requires; do not pad with unnecessary classes (penalizes the simplicity score).

For each node, write a one-sentence rationale explaining its role in the \
pattern. Then write a 2-paragraph narrative explaining (1) the pattern's \
intent and (2) the trade-offs of this implementation.

Node IDs: short, unique strings (n1, n2, ...). Edge IDs: e1, e2, ...

Output STRICT JSON ONLY in this exact shape — no markdown, no commentary:

{{
  "nodes": [
    {{ "id": "n1", "type": "<one of the allowed types>", "label": "<short name>" }},
    ...
  ],
  "edges": [
    {{ "id": "e1", "source": "<node id>", "target": "<node id>", "label": "<relationship>" }},
    ...
  ],
  "rationale": {{
    "n1": "<one sentence on why this participant>",
    ...
  }},
  "narrative": "<paragraph 1>\\n\\n<paragraph 2>"
}}
"""


def build_pattern_solution_user_prompt(problem: Problem) -> str:
    parts: list[str] = []
    parts.append(f"PROBLEM: {problem.title} (difficulty={problem.difficulty.value})")
    parts.append("")
    parts.append("STATEMENT:")
    parts.append(problem.statement.strip())
    parts.append("")
    parts.append(
        "Produce a reference UML diagram for the canonical pattern. Return "
        "strict JSON only matching the schema in the system prompt."
    )
    return "\n".join(parts)
