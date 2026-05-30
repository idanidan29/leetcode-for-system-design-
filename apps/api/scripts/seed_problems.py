"""Seed the problems table from per-discipline catalogs.

Idempotent: re-running updates existing rows by primary key.
Run: .venv/Scripts/python.exe scripts/seed_problems.py

Problem data lives in `scripts/problems/<discipline>.py`; this script is just
the runner that combines them and upserts.
"""

import asyncio
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Problem, ProblemKind
from app.db.session import AsyncSessionMaker, engine

from problems.design_patterns import PROBLEMS as DESIGN_PATTERN_PROBLEMS
from problems.system_design import PROBLEMS as SYSTEM_DESIGN_PROBLEMS


def all_problems() -> list[dict[str, Any]]:
    """Combine the per-discipline catalogs. System-design rows have no
    explicit `kind`; the model defaults to ProblemKind.system_design."""
    return [*SYSTEM_DESIGN_PROBLEMS, *DESIGN_PATTERN_PROBLEMS]


async def upsert_problem(session: AsyncSession, data: dict[str, Any]) -> str:
    existing = await session.get(Problem, data["id"])
    if existing:
        for key, value in data.items():
            if key == "id":
                continue
            setattr(existing, key, value)
        return "updated"
    session.add(Problem(**data))
    return "inserted"


async def main() -> None:
    inserted = updated = 0
    async with AsyncSessionMaker() as session:
        for data in all_problems():
            outcome = await upsert_problem(session, data)
            if outcome == "inserted":
                inserted += 1
            else:
                updated += 1
        await session.commit()

        # Verify — print the catalog grouped by kind so the seeded state is
        # obvious at a glance.
        result = await session.execute(
            select(Problem.id, Problem.title, Problem.kind).order_by(Problem.kind, Problem.id)
        )
        rows = result.all()

    print(f"Done — {inserted} inserted, {updated} updated.")
    print(f"\n{len(rows)} problems in the catalog:")
    last_kind: ProblemKind | None = None
    for pid, title, kind in rows:
        if kind != last_kind:
            heading = (
                "System design" if kind == ProblemKind.system_design else "Design patterns"
            )
            print(f"\n  [{heading}]")
            last_kind = kind
        print(f"    {pid:34s} {title}")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
