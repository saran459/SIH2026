import hashlib
import json
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text
from app.database import Base

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(64), unique=True, index=True, nullable=False)
    actor_id = Column(Integer, nullable=True)
    actor_email = Column(String(255), nullable=False)
    actor_role = Column(String(50), nullable=False)
    action_type = Column(String(100), nullable=False, index=True)
    application_id = Column(Integer, nullable=True, index=True)
    details = Column(Text, nullable=False)  # JSON payload
    ip_address = Column(String(50), default="127.0.0.1")
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    previous_hash = Column(String(64), nullable=False)
    event_hash = Column(String(64), nullable=False)

    @staticmethod
    def calculate_hash(event_id: str, actor_email: str, action_type: str, application_id: int | None, details: str, timestamp_str: str, previous_hash: str) -> str:
        payload = f"{event_id}|{actor_email}|{action_type}|{application_id}|{details}|{timestamp_str}|{previous_hash}"
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()
