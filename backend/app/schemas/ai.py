from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel

ActionType = Literal["summary", "key_points"]


class AiJobCreate(BaseModel):
    note_id: int
    action_type: ActionType


class AiJobResponse(BaseModel):
    note_id: int
    action_type: ActionType
    result_text: str
    cached: bool
    model_name: Optional[str] = None
    created_at: datetime
