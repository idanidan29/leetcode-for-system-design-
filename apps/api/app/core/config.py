from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    api_prefix: str = "/api/v1"
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    database_url: str = "postgresql+asyncpg://sdip:sdip@localhost:5432/sdip"

    # ── Validators ────────────────────────────────────────────────────────────
    # CORS_ORIGINS=https://a.com,https://b.com is friendlier in cloud envs
    # than JSON-encoded lists, so accept either.
    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors_origins(cls, v: object) -> object:
        if isinstance(v, str):
            return [s.strip() for s in v.split(",") if s.strip()]
        return v

    # Neon (and most managed Postgres) hand you a URL like
    # `postgresql://user:pass@host/db?sslmode=require`. We use asyncpg, which:
    #   1. Wants the `+asyncpg` driver suffix in the URL,
    #   2. Doesn't understand `sslmode=` (libpq syntax) — needs `ssl=require`.
    # Normalize both so users can paste the connection string as-is.
    @field_validator("database_url", mode="before")
    @classmethod
    def _normalize_db_url(cls, v: object) -> object:
        if not isinstance(v, str):
            return v
        out = v
        if out.startswith("postgresql://") and "+asyncpg" not in out:
            out = "postgresql+asyncpg://" + out[len("postgresql://"):]
        elif out.startswith("postgres://"):
            # Heroku-style alias — same fix.
            out = "postgresql+asyncpg://" + out[len("postgres://"):]
        out = out.replace("sslmode=", "ssl=")
        return out

    jwt_secret: str = "change-me-in-prod"
    jwt_algorithm: str = "HS256"
    access_token_ttl_minutes: int = 15
    refresh_token_ttl_days: int = 7

    # Cookie flags. In prod set cookie_secure=true (requires HTTPS).
    cookie_secure: bool = False
    cookie_samesite: str = "lax"
    cookie_domain: str | None = None

    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    evaluation_rate_limit_per_hour: int = 5


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
