# Phase 1 — MIS Database Migration Pack

You are working inside an existing FastAPI + SQLAlchemy project.

IMPORTANT:
Follow docs/AGENT_RULES.md strictly.
Do NOT modify existing authentication logic.
Do NOT change existing notes, folders, or AI routes.
Only perform the database-related changes described below.

GOAL:
Prepare the database layer for MIS integration.

Scope of Work (ONLY this):

1) Update existing `notes` table:
- Add column: type (VARCHAR(100))
- Add column: source_system (VARCHAR(50))
- Add column: external_run_id (UUID, nullable)
- Add column: metadata (JSONB)

2) Create GIN index on notes.metadata

3) Create new table: external_runs
Fields:
- id (UUID primary key, default gen_random_uuid())
- source_system (VARCHAR(50), NOT NULL)
- run_id (VARCHAR(150), NOT NULL)
- dt (DATE, NOT NULL)
- symbol (VARCHAR(50), NOT NULL)
- timeframe (VARCHAR(20), NOT NULL)
- pipeline_status (VARCHAR(20))
- market_flag (VARCHAR(20))
- risk_mode (VARCHAR(20))
- manifest_path (TEXT)
- raw_payload (JSONB, NOT NULL)
- created_at (TIMESTAMP WITH TIME ZONE, default NOW())

Unique constraint:
(source_system, run_id)

Requirements:
- Use Alembic migration.
- Add SQLAlchemy model for ExternalRun.
- Do NOT delete or rename existing fields.
- Migration must be reversible if possible.
- No other changes outside DB layer.

Deliver:
- Alembic revision file
- Updated models
- No unrelated modifications.
