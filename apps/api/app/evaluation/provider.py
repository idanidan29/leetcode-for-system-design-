"""LLMProvider interface. All LLM calls go through this — see CLAUDE.md."""

from typing import Protocol


class LLMProvider(Protocol):
    async def evaluate(self, system: str, user: str) -> str:
        """Return the raw JSON string output from the LLM."""
        ...
