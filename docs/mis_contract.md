# MIS → Smart Notes Integration Contract

This document defines the stable integration contract between the MIS pipeline and Smart Notes.

The purpose of this contract is to prevent schema drift and ensure that external pipelines can safely ingest runs into Smart Notes.


---

## 1. Source System

All MIS pipeline ingests MUST use the following value:

`source_system = "mis_pipeline"`

Smart Notes uses the pair `(source_system, run_id)` to uniquely identify external runs.


---

## 2. Ingest Endpoint

The MIS pipeline sends data to Smart Notes using the following endpoint:

`POST /api/integrations/mis/ingest`

Authentication: JWT required  
Content-Type: `application/json`

---

## 3. Request Schema

The request body must follow this structure:

```json
{
  "source_system": "mis_pipeline",
  "run_manifest": {},
  "daily_snapshot": "string"
}


---

## 4. Required Fields

### Top Level

| Field | Type | Required |
|------|------|---------|
| source_system | string | yes |
| run_manifest | object | yes |
| daily_snapshot | string | yes |



### run_manifest Required Fields

| Field | Type | Required |
|------|------|---------|
| run_id | string | yes |
| dt | YYYY-MM-DD | yes |
| symbol | string | yes |
| timeframe | string | yes |
| manifest_path | string | yes |


### run_manifest Optional Fields

| Field | Type |
|------|------|
| pipeline_status | string |
| market_flag | string |
| risk_mode | string |


---

## 5. Storage Behavior

When a run is ingested:

1. A record is created in `external_runs`
2. A linked note is created with `type = "external_mis"`
3. `run_manifest` is stored in:
   - `external_runs.raw_payload`
   - `notes.note_metadata`
4. `daily_snapshot` becomes the note content



---

## 6. Duplicate Protection

Smart Notes prevents duplicate runs.

If a run already exists with the same `(source_system, run_id)`, the ingest request returns:

```json
{
  "status": "skipped",
  "reason": "duplicate run"
}



---

## 7. Purpose of This Contract

This document ensures:

- stable schema for MIS ingestion
- predictable integration behavior
- compatibility with Smart Notes storage
- safe evolution of the MIS pipeline

Any change to the ingest schema MUST update this document.