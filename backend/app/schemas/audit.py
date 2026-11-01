from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class AuditEventResponse(BaseModel):
    id: int
    event_id: str
    actor_id: Optional[int] = None
    actor_email: str
    actor_role: str
    action_type: str
    application_id: Optional[int] = None
    details: str
    ip_address: str
    timestamp: datetime
    previous_hash: str
    event_hash: str

    class Config:
        from_attributes = True

class VerifyChainResponse(BaseModel):
    total_events: int
    is_valid: bool
    broken_link_index: Optional[int] = None
    verification_message: str
    first_event_hash: Optional[str] = None
    last_event_hash: Optional[str] = None
