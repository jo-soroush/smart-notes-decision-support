
from app.core.deps import get_current_user
from app.db import get_db
from app.models.activity_log import ActivityLogModel
from app.models.user import UserModel
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/activity-logs", tags=["Activity Logs"])


@router.get("")
def list_activity_logs(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    logs = (
        db.query(ActivityLogModel)
        .filter(ActivityLogModel.user_id == current_user.id)
        .order_by(ActivityLogModel.id.desc())
        .limit(50)
        .all()
    )

    result = []
    for log in logs:
        result.append(
            {
                "id": log.id,
                "user_id": log.user_id,
                "event_type": log.event_type,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "metadata": log.event_metadata,
                "created_at": log.created_at,
            }
        )

    return result