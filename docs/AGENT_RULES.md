# Cloud Code Agent Rules

1. Do NOT modify existing authentication logic.
2. Do NOT change existing notes, folders, or AI routes.
3. Only modify files inside:
   - backend/app/integrations/mis/
   - alembic migrations
   - minimal router registration in main.py (if required)
4. All changes must be idempotent and transaction-safe.
5. Do NOT remove or rename existing database fields.
6. Follow existing project architecture and naming conventions.
7. Every change must be minimal and scoped.
