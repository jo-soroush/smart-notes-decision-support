from alembic import op
import sqlalchemy as sa

revision = "8e67ade0e27d"
down_revision = "c3fa5f409608"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1️⃣ add column nullable first
    op.add_column(
        "notes",
        sa.Column("user_id", sa.Integer(), nullable=True),
    )

    # 2️⃣ set default owner for existing notes (user_id = 1)
    op.execute("UPDATE notes SET user_id = 1")

    # 3️⃣ make column NOT NULL
    op.alter_column("notes", "user_id", nullable=False)

    # 4️⃣ add FK
    op.create_foreign_key(
        "fk_notes_user_id_users",
        "notes",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # 5️⃣ index
    op.create_index(
        op.f("ix_notes_user_id"),
        "notes",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_notes_user_id"), table_name="notes")
    op.drop_constraint("fk_notes_user_id_users", "notes", type_="foreignkey")
    op.drop_column("notes", "user_id")