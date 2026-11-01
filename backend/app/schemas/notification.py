from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class NotificationResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    role_target: Optional[str] = None
    application_id: Optional[int] = None
    title: str
    message: str
    category: str
    severity: str
    link_url: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationPreferenceResponse(BaseModel):
    user_id: int
    email_alerts: bool
    deadline_reminders: bool
    compliance_alerts: bool
    workflow_updates: bool

    class Config:
        from_attributes = True

class NotificationPreferenceUpdate(BaseModel):
    email_alerts: Optional[bool] = None
    deadline_reminders: Optional[bool] = None
    compliance_alerts: Optional[bool] = None
    workflow_updates: Optional[bool] = None
