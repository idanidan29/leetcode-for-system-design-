"""Problem seed data, split by discipline.

Each module exposes a single `PROBLEMS: list[dict[str, Any]]`. The runner
(`scripts/seed_problems.py`) imports them and upserts the combined list.

Split by file so adding a new problem touches one focused module instead of
a 500-line monolith.
"""
