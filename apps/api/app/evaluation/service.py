"""Evaluation orchestration: prompt → LLM → validate → retry → cache.

Stays provider-agnostic (works on any LLMProvider). Caching is in-process
only; restart wipes it. That's intentional for Phase 1 — the cache exists
to stop a user spam-clicking "Evaluate" on the same diagram, not to be a
shared cross-request cache.
"""

from __future__ import annotations

import hashlib
import json
import logging
from typing import Any

from pydantic import ValidationError

from app.db.models import Problem
from app.submissions.schemas import Diagram

from .hints_prompt import HINTS_SYSTEM_PROMPT, build_hints_user_prompt
from .prompt import (
    REQUIRED_CATEGORIES,
    SYSTEM_PROMPT,
    build_retry_prompt,
    build_user_prompt,
)
from .provider import LLMProvider
from .schemas import Evaluation, HintsResponse, SolutionResponse
from .solution_prompt import (
    ALLOWED_KINDS,
    SOLUTION_SYSTEM_PROMPT,
    build_solution_user_prompt,
)

logger = logging.getLogger(__name__)


class EvaluationError(RuntimeError):
    """LLM call or validation failed terminally (after retry)."""


# Process-lifetime caches. Bounded so a long-running server doesn't leak.
# Separate caches per task — an evaluation cache hit isn't a hint cache hit.
_CACHE: dict[str, Evaluation] = {}
_HINTS_CACHE: dict[str, HintsResponse] = {}
# Reference solutions are keyed only by problem_id (no diagram input).
_SOLUTION_CACHE: dict[str, SolutionResponse] = {}
_CACHE_MAX = 256


def _diagram_fingerprint(problem_id: str, diagram: Diagram, notes: str = "") -> str:
    """Stable fingerprint of (problem_id, diagram, notes) for cache keys.

    Sorts nodes/edges by id so cosmetic reordering doesn't bust the cache,
    and drops position fields (LLM evaluation doesn't depend on coordinates).
    Notes participate so editing them forces a re-eval instead of returning
    a stale score.
    """
    canonical: dict[str, Any] = {
        "problem_id": problem_id,
        "nodes": sorted(
            (
                {"id": n.id, "type": n.type, "label": n.label}
                for n in diagram.nodes
            ),
            key=lambda n: n["id"],
        ),
        "edges": sorted(
            (
                {"id": e.id, "source": e.source, "target": e.target, "label": e.label}
                for e in diagram.edges
            ),
            key=lambda e: e["id"],
        ),
        "notes": notes.strip(),
    }
    raw = json.dumps(canonical, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _validate_evaluation(raw: str) -> Evaluation:
    """Parse + validate LLM JSON. Also checks the rubric is complete."""
    ev = Evaluation.model_validate_json(raw)
    missing = [c for c in REQUIRED_CATEGORIES if c not in ev.scores]
    if missing:
        raise ValidationError.from_exception_data(
            "Evaluation",
            [
                {
                    "type": "missing",
                    "loc": ("scores", c),
                    "input": ev.scores,
                }
                for c in missing
            ],
        )
    return ev


async def evaluate(
    provider: LLMProvider,
    problem: Problem,
    diagram: Diagram,
    notes: str = "",
) -> Evaluation:
    """Run an evaluation, with one retry on validation failure.

    Raises EvaluationError on terminal failure (provider crash or schema
    failure on the retry).
    """
    cache_key = _diagram_fingerprint(problem.id, diagram, notes)
    cached = _CACHE.get(cache_key)
    if cached is not None:
        logger.info("evaluation cache hit", extra={"problem_id": problem.id})
        return cached

    user_msg = build_user_prompt(problem, diagram, notes)

    # First attempt.
    try:
        raw = await provider.evaluate(SYSTEM_PROMPT, user_msg)
    except Exception as e:  # noqa: BLE001 — provider boundary; re-wrap
        raise EvaluationError(f"LLM provider failed: {e}") from e

    try:
        ev = _validate_evaluation(raw)
    except (ValidationError, ValueError) as first_err:
        logger.warning(
            "evaluation validation failed, retrying once",
            extra={"problem_id": problem.id, "error": str(first_err)},
        )
        retry_msg = build_retry_prompt(previous_output=raw, error=str(first_err))
        try:
            raw2 = await provider.evaluate(SYSTEM_PROMPT, retry_msg)
        except Exception as e:  # noqa: BLE001
            raise EvaluationError(f"LLM provider failed on retry: {e}") from e
        try:
            ev = _validate_evaluation(raw2)
        except (ValidationError, ValueError) as second_err:
            raise EvaluationError(
                f"LLM output failed schema validation twice: {second_err}"
            ) from second_err

    # Bound the cache. Simple FIFO eviction — fine for our scale.
    if len(_CACHE) >= _CACHE_MAX:
        _CACHE.pop(next(iter(_CACHE)))
    _CACHE[cache_key] = ev
    return ev


async def generate_hints(
    provider: LLMProvider,
    problem: Problem,
    diagram: Diagram,
) -> HintsResponse:
    """Generate 3 progressive hints tailored to the candidate's diagram.

    Same shape as `evaluate`: validate, retry once on schema failure, cache by
    (problem_id, diagram_fingerprint). Separate cache from evaluations.
    """
    cache_key = _diagram_fingerprint(problem.id, diagram)
    cached = _HINTS_CACHE.get(cache_key)
    if cached is not None:
        logger.info("hints cache hit", extra={"problem_id": problem.id})
        return cached

    user_msg = build_hints_user_prompt(problem, diagram)

    try:
        raw = await provider.evaluate(HINTS_SYSTEM_PROMPT, user_msg)
    except Exception as e:  # noqa: BLE001
        raise EvaluationError(f"LLM provider failed: {e}") from e

    try:
        resp = HintsResponse.model_validate_json(raw)
    except (ValidationError, ValueError) as first_err:
        retry_msg = build_retry_prompt(previous_output=raw, error=str(first_err))
        try:
            raw2 = await provider.evaluate(HINTS_SYSTEM_PROMPT, retry_msg)
        except Exception as e:  # noqa: BLE001
            raise EvaluationError(f"LLM provider failed on retry: {e}") from e
        try:
            resp = HintsResponse.model_validate_json(raw2)
        except (ValidationError, ValueError) as second_err:
            raise EvaluationError(
                f"LLM output failed schema validation twice: {second_err}"
            ) from second_err

    if len(_HINTS_CACHE) >= _CACHE_MAX:
        _HINTS_CACHE.pop(next(iter(_HINTS_CACHE)))
    _HINTS_CACHE[cache_key] = resp
    return resp


def _validate_solution(raw: str) -> SolutionResponse:
    """Parse + validate solution. Also enforces:
    - every node.type is in ALLOWED_KINDS,
    - every edge.source/target references an existing node.

    These checks prevent the LLM from inventing component types or dangling
    edges that would render as ghosts on the canvas.
    """
    sol = SolutionResponse.model_validate_json(raw)
    node_ids = {n.id for n in sol.nodes}
    for n in sol.nodes:
        if n.type not in ALLOWED_KINDS:
            raise ValueError(
                f"node {n.id!r} has unknown type {n.type!r}; "
                f"allowed: {', '.join(ALLOWED_KINDS)}"
            )
    for e in sol.edges:
        if e.source not in node_ids or e.target not in node_ids:
            raise ValueError(
                f"edge {e.id!r} references missing node "
                f"(source={e.source!r}, target={e.target!r})"
            )
    return sol


async def generate_solution(
    provider: LLMProvider,
    problem: Problem,
) -> SolutionResponse:
    """Generate a reference design for the given problem.

    Cached per problem — the reference design doesn't change with the user's
    diagram.
    """
    cached = _SOLUTION_CACHE.get(problem.id)
    if cached is not None:
        logger.info("solution cache hit", extra={"problem_id": problem.id})
        return cached

    user_msg = build_solution_user_prompt(problem)

    try:
        raw = await provider.evaluate(SOLUTION_SYSTEM_PROMPT, user_msg)
    except Exception as e:  # noqa: BLE001
        raise EvaluationError(f"LLM provider failed: {e}") from e

    try:
        sol = _validate_solution(raw)
    except (ValidationError, ValueError) as first_err:
        retry_msg = build_retry_prompt(previous_output=raw, error=str(first_err))
        try:
            raw2 = await provider.evaluate(SOLUTION_SYSTEM_PROMPT, retry_msg)
        except Exception as e:  # noqa: BLE001
            raise EvaluationError(f"LLM provider failed on retry: {e}") from e
        try:
            sol = _validate_solution(raw2)
        except (ValidationError, ValueError) as second_err:
            raise EvaluationError(
                f"LLM output failed schema validation twice: {second_err}"
            ) from second_err

    if len(_SOLUTION_CACHE) >= _CACHE_MAX:
        _SOLUTION_CACHE.pop(next(iter(_SOLUTION_CACHE)))
    _SOLUTION_CACHE[problem.id] = sol
    return sol
