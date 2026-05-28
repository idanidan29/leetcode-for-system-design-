"""Prompt construction for contextual hints.

Hints are diagram-aware — the LLM sees what the candidate has drawn so far
and tailors the nudge to gaps in the current design.
"""

from __future__ import annotations

from app.db.models import Problem
from app.submissions.schemas import Diagram

from .prompt import build_user_prompt as _build_problem_diagram

HINTS_SYSTEM_PROMPT = """\
You are a senior staff engineer mentoring a candidate mid-way through a \
system design interview. Provide exactly three hints at INCREASING \
specificity, without giving away the full solution. Each hint should be \
informed by what the candidate has already drawn — if they've already \
handled a concern, don't hint about it.

Levels:
  1 = vague nudge. Name a CATEGORY of concern they should think about \
(e.g. "consider the write path", "think about hot keys").
  2 = specific consideration. Pose a question or sub-problem they need to \
solve (e.g. "How do you keep the cache from going stale on write?").
  3 = structural pointer. Hint at a SHAPE of solution by naming component \
types or relationships, without writing the full answer for them.

Each hint is one or two sentences. No code, no markdown.

Output STRICT JSON ONLY in this exact shape:

{
  "hints": [
    { "level": 1, "text": "<vague nudge>" },
    { "level": 2, "text": "<specific consideration>" },
    { "level": 3, "text": "<structural pointer>" }
  ]
}
"""


def build_hints_user_prompt(problem: Problem, diagram: Diagram) -> str:
    """Reuse the evaluation user-prompt body (problem + diagram adjacency)."""
    body = _build_problem_diagram(problem, diagram)
    # Replace the evaluation footer with a hints-specific instruction.
    body = body.rsplit("\n\n", 1)[0]
    return (
        f"{body}\n\n"
        "Provide three hints that build on what they've drawn. "
        "Return strict JSON only."
    )
