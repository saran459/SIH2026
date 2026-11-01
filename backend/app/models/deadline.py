from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Deadline(Base):
    __tablename__ = "deadlines"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    deadline_type = Column(String(100), default="Correction Response")  # Submission, Review Completion, Correction Response, Final Decision
    due_date = Column(DateTime, nullable=False, index=True)
    status = Column(String(50), default="On Track")  # On Track, Approaching Deadline, Overdue, Completed
    assigned_role = Column(String(50), default="institution")  # institution, reviewer, admin
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    application = relationship("Application", back_populates="deadlines")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    role_target = Column(String(50), nullable=True, index=True)  # institution, reviewer, admin, or None for specific user
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String(50), default="Application")  # Application, Compliance, Deadline, Workflow, System
    severity = Column(String(50), default="Info")  # Info, Warning, Error, Success
    link_url = Column(String(255), nullable=True)
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    user = relationship("User")
    application = relationship("Application")

class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    email_alerts = Column(Boolean, default=True)
    deadline_reminders = Column(Boolean, default=True)
    compliance_alerts = Column(Boolean, default=True)
    workflow_updates = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User")
