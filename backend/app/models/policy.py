from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text
from app.database import Base

class PolicySource(Base):
    __tablename__ = "policy_sources"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    document_name = Column(String(255), default="AICTE Approval Process Handbook (APH) 2026-27")
    chapter = Column(String(100), nullable=False)
    clause = Column(String(100), nullable=False)
    topic = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)
    mandatory_requirements = Column(Text, nullable=True)
    keywords = Column(String(500), default="")
    created_at = Column(DateTime, default=datetime.utcnow)
