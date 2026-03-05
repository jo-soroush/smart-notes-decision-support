from typing import Any, Dict, Optional

from app.models.activity_log import ActivityLogModel
from sqlalchemy.orm import Session


def log_activity(
    db: Session,
    user_id: int,
    event_type: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    event_metadata: Optional[Dict[str, Any]] = None,
) -> None:
    activity = ActivityLogModel(
        user_id=user_id,
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        event_metadata=event_metadata,
    )

    db.add(activity)
    db.commit()