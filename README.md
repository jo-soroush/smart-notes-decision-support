
# Smart Notes — AI-Powered Decision Support Workspace

Smart Notes is a full-stack decision support workspace that combines structured note management with AI-assisted analysis.

The system follows a human-in-the-loop philosophy: AI helps organize, summarize, and interpret information, but final judgment always remains with the user.

This project began as a student project, but it has been intentionally developed into a more personal and useful workspace that can support real note-taking, AI-assisted reflection, and structured review of external intelligence outputs.

---

## Project Overview

The goal of Smart Notes is to create a structured environment where:

- personal notes
- external intelligence outputs
- AI-generated analysis

can coexist in a consistent, searchable, and auditable workflow.

The system is designed to support reasoning and review, not autonomous decision-making.

---

## Core Idea

Smart Notes is built around three central ideas:

### 1. Human in the Loop
AI supports the user by summarizing information, extracting key signals, and helping with analysis.  
However, the final interpretation and decision always belong to the user.

### 2. Server-Driven Truth
All important persistent state is stored in the database, not in the frontend.  
This includes notes, folders, AI results, external runs, and activity logs.

### 3. Practical Usefulness
The project is not only an academic exercise. It has been shaped into a personal and potentially reusable workspace that can continue to grow beyond the original assignment.

---

## High-Level Architecture

The project contains two logical systems:

### Smart Notes
This repository contains the main workspace where users can:

- create and manage notes
- organize notes into folders
- search and filter information
- trigger AI analysis on notes
- inspect external MIS outputs
- review activity history

### MIS (External System)
MIS is an external Market Intelligence System that produces structured run outputs.

Smart Notes does not control MIS.  
It only ingests MIS outputs and links them into the workspace through structured metadata.

This keeps the integration boundary clear.

---

## Current Functional Capabilities

### Notes
The system supports full note management:

- create notes
- read notes
- update notes
- delete notes
- fetch a single note directly

Supported statuses:

- `draft`
- `final`
- `archived`

Notes can optionally belong to folders.

---

### Folders
Folders are used to organize notes.

Current behavior:

- one folder can contain many notes
- deleting a folder does not delete its notes
- when a folder is deleted, `folder_id` becomes `NULL`

Folder counts are also available for UI usage.

---

### Search and Pagination
The notes listing supports scalable browsing with:

- pagination
- text search
- folder filtering
- status filtering
- type exclusion

This allows the workspace to remain manageable even when the number of notes grows.

---

### Authentication
Authentication is implemented with JWT.

Protected routes require authentication, and main protected resources are scoped to the authenticated user.

The project currently assumes a single active personal user in practice, even though parts of the architecture already support broader multi-user patterns.

---

### AI Analysis
AI actions can be triggered explicitly by the user on a note.

Currently supported actions:

- `summary`
- `mis_analysis`
- `key_points`

Important design rules:

- AI is user-triggered
- AI outputs are stored in the database
- AI results are cached using content hashes

This helps reduce repeated LLM calls and keeps the behavior predictable.

---

### AI Result Cache
AI results are stored in the `ai_results` table.

The cache uses a `content_hash`, which means:

- if note content stays the same, cached AI results can be reused
- if note content changes, the hash changes too
- this makes cache invalidation deterministic

---

### MIS Integration
The project supports ingestion of external MIS runs.

When an MIS run is ingested:

1. the run is stored in `external_runs`
2. a linked note is created
3. metadata is stored as structured JSON

MIS-linked notes are intentionally excluded from the normal home note list so they do not clutter the main workspace.

They remain accessible through MIS-related views and direct links.

---

### Logging and Auditability
The system includes:

- structured application logging
- activity log tracking for important events

Examples of tracked actions include:

- note creation
- note update
- note deletion
- MIS ingestion
- AI execution

This makes the project more traceable and closer to a real internal tool architecture.

---

## Technical Stack

### Backend
- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL

### Frontend
- React
- Vite

### Infrastructure / Development Runtime
- Docker
- Docker Compose

---

## Project Structure

```text
backend/
  app/
  alembic/
  tests/
  Dockerfile
  entrypoint.sh
  requirements.txt

frontend/
  app/
    src/
    Dockerfile

docs/
docker-compose.yml


Dockerized Development Setup

The project now includes a working full-stack Docker development setup.

Included services

db

backend

frontend

Current startup flow

db healthy → backend migration/start → backend healthy → frontend start

This means:

PostgreSQL starts first

the backend waits until the database is healthy

backend migrations run automatically during startup

the backend becomes healthy

the frontend starts after the backend is ready

This makes the setup more reliable and easier to run across machines.

Environment Files
Local backend environment

File:

backend/.env

Example:

GEMINI_API_KEY=YOUR_KEY
GEMINI_MODEL=models/gemini-2.5-flash
DATABASE_URL=postgresql+psycopg://postgres:2020@localhost:5432/smart_notes

This file is for local backend execution outside Docker.

Docker backend environment

File:

backend/.env.docker

Example:

GEMINI_API_KEY=YOUR_KEY
GEMINI_MODEL=models/gemini-2.5-flash
DATABASE_URL=postgresql+psycopg://postgres:2020@db:5432/smart_notes

This file is used by Docker Compose and must be created manually on each machine.

It is intentionally not committed to Git.

How to Run the Project with Docker

From the project root:

docker compose up --build

After startup, the application is available at:

Frontend: http://localhost:5173

Backend docs: http://localhost:8000/docs

Backend health: http://localhost:8000/health

Stop the project

To stop the running Compose session:

Ctrl + C

To remove containers:

docker compose down

To remove containers and the database volume:

docker compose down -v
API Overview
Auth

POST /auth/login

POST /auth/register

Notes

GET /notes

POST /notes

GET /notes/{id}

PUT /notes/{id}

DELETE /notes/{id}

Folders

GET /folders

POST /folders

PUT /folders/{id}

DELETE /folders/{id}

GET /folders/with_counts

AI

POST /ai/jobs

POST /ai/jobs/queue

GET /ai/jobs/{job_id}

GET /ai/results/latest

MIS Integration

POST /api/integrations/mis/ingest

GET /api/integrations/mis/runs

GET /api/integrations/mis/health

Activity Logs

GET /api/activity-logs

Current Project Status

Smart Notes is now in a strong development-MVP state.

What is completed

Notes CRUD

Folder system

Search and pagination

JWT authentication

AI result caching

MIS ingestion and linked notes

Activity logging

Notes service layer

Expanded backend tests

Full-stack Docker development setup

Healthchecks for database and backend

Improved Docker Compose startup ordering

Automatic backend migrations on startup

Best current summary

Smart Notes is now a usable full-stack Dockerized development MVP with AI-assisted note analysis, MIS integration, improved startup orchestration, and automatic backend migrations.

It is no longer just a local student exercise.
It has grown into a more practical and personally useful decision-support workspace.

Remaining Work

The core project is complete for the current phase, but some refinements still remain.

1. README polish and final documentation cleanup

This README is already usable, but it can still be shortened or adjusted depending on whether the final audience is:

teacher / examiner

developer

future self

public portfolio viewer

2. Production-like setup

The current Docker setup is still development-oriented.

For example:

the frontend runs through the Vite development server

the backend startup is optimized for development flow, not production deployment

A future production-like setup could include:

built frontend assets

more production-ready backend serving

stronger environment separation

3. More Compose refinement

The Compose setup is now much better, but further polish is still possible, such as:

frontend healthcheck

separate dev/prod Compose files

more advanced volume strategy

cleaner configuration layering

4. Final secret hygiene

If any API key was exposed during development, it should be rotated and replaced.

Final Reflection

Although Smart Notes started as a student project, it has intentionally been developed into something more personally meaningful and practically useful.

Instead of stopping at a minimal academic implementation, the project was extended into a structured workspace that can actually support note-taking, review, AI-assisted interpretation, and future growth.

That makes the project more than just completed coursework.
It is now a foundation for something that can continue to be useful beyond the course itself.
