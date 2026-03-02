"""mis phase1 db

Revision ID: 487310cb679c
Revises: 8e67ade0e27d
Create Date: 2026-03-02 13:30:33.190614

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "487310cb679c"
down_revision: Union[str, Sequence[str], None] = "8e67ade0e27d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1) Extend notes
    op.add_column("notes", sa.Column("type", sa.String(length=100), nullable=True))
    op.add_column("notes", sa.Column("source_system", sa.String(length=50), nullable=True))
    op.add_column("notes", sa.Column("external_run_id", sa.UUID(), nullable=True))
    op.add_column(
        "notes",
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )

    # 2) GIN index for metadata
    op.create_index(
        "idx_notes_metadata_gin",
        "notes",
        ["metadata"],
        postgresql_using="gin",
    )

    # 3) external_runs table
    op.create_table(
        "external_runs",
        sa.Column(
            "id",
            sa.UUID(),
            primary_key=True,
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("source_system", sa.String(length=50), nullable=False),
        sa.Column("run_id", sa.String(length=150), nullable=False),
        sa.Column("dt", sa.Date(), nullable=False),
        sa.Column("symbol", sa.String(length=50), nullable=False),
        sa.Column("timeframe", sa.String(length=20), nullable=False),
        sa.Column("pipeline_status", sa.String(length=20), nullable=True),
        sa.Column("market_flag", sa.String(length=20), nullable=True),
        sa.Column("risk_mode", sa.String(length=20), nullable=True),
        sa.Column("manifest_path", sa.Text(), nullable=True),
        sa.Column(
            "raw_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False
        ),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.UniqueConstraint(
            "source_system",
            "run_id",
            name="uq_external_runs_source_system_run_id",
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("external_runs")

    op.drop_index("idx_notes_metadata_gin", table_name="notes")

    op.drop_column("notes", "metadata")
    op.drop_column("notes", "external_run_id")
    op.drop_column("notes", "source_system")
    op.drop_column("notes", "type")