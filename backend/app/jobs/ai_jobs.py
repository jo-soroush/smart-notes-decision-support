from __future__ import annotations

import threading
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class AiJobQueue:
    """
    Very small in-memory job queue.
    Status: queued | running | done | failed
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._jobs: Dict[str, Dict[str, Any]] = {}

    def create_job(self, note_id: int, action_type: str) -> str:
        job_id = str(uuid.uuid4())
        with self._lock:
            self._jobs[job_id] = {
                "job_id": job_id,
                "note_id": note_id,
                "action_type": action_type,
                "status": "queued",
                "queued_at": _utc_now(),
                "started_at": None,
                "finished_at": None,
                "cached": False,
                "result_text": None,
                "model_name": None,
                "error": None,
            }
        return job_id

    def set_running(self, job_id: str) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return
            job["status"] = "running"
            job["started_at"] = _utc_now()

    def set_done(self, job_id: str, *, cached: bool, result_text: str, model_name: Optional[str]) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return
            job["status"] = "done"
            job["finished_at"] = _utc_now()
            job["cached"] = cached
            job["result_text"] = result_text
            job["model_name"] = model_name

    def set_failed(self, job_id: str, error: str) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return
            job["status"] = "failed"
            job["finished_at"] = _utc_now()
            job["error"] = error

    def get(self, job_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            job = self._jobs.get(job_id)
            return dict(job) if job else None


ai_job_queue = AiJobQueue()