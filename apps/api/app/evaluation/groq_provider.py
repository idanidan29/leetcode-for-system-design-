from groq import AsyncGroq

from app.core.config import settings


class GroqProvider:
    """LLMProvider impl backed by Groq (free tier — Llama 3.3 70B)."""

    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        self._client = AsyncGroq(api_key=api_key or settings.groq_api_key)
        self._model = model or settings.groq_model

    async def evaluate(self, system: str, user: str) -> str:
        resp = await self._client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            response_format={"type": "json_object"},
            max_tokens=2000,
            temperature=0.3,
        )
        content = resp.choices[0].message.content
        if not content:
            raise RuntimeError("Groq returned an empty response")
        return content
