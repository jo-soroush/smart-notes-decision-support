"""create folders table and add folder_id to notes

Revision ID: 786345ce14d9
Revises: 95198c26eb13
Create Date: 2026-02-21 17:31:28.672655

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "786345ce14d9"
down_revision: Union[str, Sequence[str], None] = "95198c26eb13"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

FK_NAME = "fk_notes_folder_id_folders"


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "folders",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index(op.f("ix_folders_id"), "folders", ["id"], unique=False)

    op.add_column("notes", sa.Column("folder_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        FK_NAME,
        "notes",
        "folders",
        ["folder_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(FK_NAME, "notes", type_="foreignkey")
    op.drop_column("notes", "folder_id")
    op.drop_index(op.f("ix_folders_id"), table_name="folders")
    op.drop_table("folders")