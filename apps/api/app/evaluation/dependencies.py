"""FastAPI dependency for the LLMProvider singleton.

Single Groq client per process, reused across requests. If we add the Gemini
fallback later, swap or layer the implementation here — callers don't change.
"""

from __future__ import annotations

from functools import lru_cache

from app.core.config import settings

from .groq_provider import GroqProvider
from .provider import LLMProvider


@lru_cache(maxsize=1)
def _build_provider() -> LLMProvider:
    if not settings.groq_api_key:
        raise RuntimeError(
            "GROQ_API_KEY is not set — evaluation is unavailable. "
            "Set it in apps/api/.env."
        )
    return GroqProvider()


def get_provider() -> LLMProvider:
    return _build_provider()
