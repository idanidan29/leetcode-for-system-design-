"""List tables in the connected DB."""

import asyncio

from sqlalchemy import text

from app.db.session import engine


async def main() -> None:
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema='public' ORDER BY table_name"
            )
        )
        tables = [r[0] for r in result]
        print("Tables:", tables)

        for t in tables:
            cols = await conn.execute(
                text(
                    "SELECT column_name, data_type FROM information_schema.columns "
                    "WHERE table_schema='public' AND table_name=:t ORDER BY ordinal_position"
                ),
                {"t": t},
            )
            print(f"\n  {t}:")
            for name, dtype in cols:
                print(f"    {name:32s} {dtype}")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
