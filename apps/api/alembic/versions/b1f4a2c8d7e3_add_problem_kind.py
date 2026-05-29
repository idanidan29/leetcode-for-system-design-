"""add problem kind column

Adds a `kind` discriminator on `problems` so we can host both system-design
and design-pattern tracks side by side. Existing rows backfill to
`system_design` via a server-side default; the default is then dropped so the
column is required for every future insert (the app sets it explicitly).

Revision ID: b1f4a2c8d7e3
Revises: 7554b341043a
Create Date: 2026-05-29 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b1f4a2c8d7e3"
down_revision: Union[str, None] = "7554b341043a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


PROBLEM_KIND_NAME = "problemkind"
PROBLEM_KIND_VALUES = ("system_design", "design_pattern")


def upgrade() -> None:
    problem_kind = sa.Enum(*PROBLEM_KIND_VALUES, name=PROBLEM_KIND_NAME)
    problem_kind.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "problems",
        sa.Column(
            "kind",
            problem_kind,
            nullable=False,
            server_default="system_design",
        ),
    )
    op.create_index("ix_problems_kind", "problems", ["kind"])
    # App code sets kind explicitly on insert; drop the server default so a
    # missing value at the ORM layer fails loudly instead of silently
    # defaulting to system_design.
    op.alter_column("problems", "kind", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_problems_kind", table_name="problems")
    op.drop_column("problems", "kind")
    sa.Enum(name=PROBLEM_KIND_NAME).drop(op.get_bind(), checkfirst=True)
