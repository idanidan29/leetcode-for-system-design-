"""Quick DB connectivity test. Run with: python scripts/check_db.py"""

import asyncio
import sys

from sqlalchemy import text

from app.db.session import engine


async def main() -> None:
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT version()"))
            version = result.scalar()
        print(f"OK — connected. Postgres says: {version}")
    except Exception as e:
        print(f"FAIL — {type(e).__name__}: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
