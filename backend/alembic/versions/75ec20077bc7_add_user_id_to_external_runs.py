"""add user_id to external_runs

Revision ID: 75ec20077bc7
Revises: 487310cb679c
Create Date: 2026-03-03 09:40:29.320272

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "75ec20077bc7"
down_revision: Union[str, Sequence[str], None] = "487310cb679c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # 1️⃣ add user_id column (Integer to match users.id)
    op.add_column(
        "external_runs",
        sa.Column("user_id", sa.Integer(), nullable=True),
    )

    # 2️⃣ create foreign key
    op.create_foreign_key(
        "fk_external_runs_user_id_users",
        "external_runs",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # 3️⃣ create index for filtering (user-scoped queries)
    op.create_index(
        "ix_external_runs_user_id",
        "external_runs",
        ["user_id"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_external_runs_user_id", table_name="external_runs")
    op.drop_constraint(
        "fk_external_runs_user_id_users",
        "external_runs",
        type_="foreignkey",
    )
    op.drop_column("external_runs", "user_id")