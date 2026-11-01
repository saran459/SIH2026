from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    application_number = Column(String(50), unique=True, index=True, nullable=False)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, index=True)
    category = Column(String(100), nullable=False, default="Extension of Approval (EOA)")
    academic_year = Column(String(20), nullable=False, default="2026-27")
    level = Column(String(50), nullable=False, default="Undergraduate (UG)")
    program = Column(String(100), nullable=False, default="Engineering & Technology")
    
    # State machine: Draft -> Submitted -> Under Review -> Correction Required -> Resubmitted -> Approved / Rejected / Withdrawn
    status = Column(String(50), nullable=False, default="Draft", index=True)
    
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    
    submission_date = Column(DateTime, nullable=True)
    review_start_date = Column(DateTime, nullable=True)
    decision_date = Column(DateTime, nullable=True)
    decision_reason = Column(Text, nullable=True)
    decision_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Key declared metrics
    total_faculty_declared = Column(Integer, default=0)
    total_intake_declared = Column(Integer, default=0)
    built_up_area_sqm = Column(Float, default=0.0)
    land_area_acres = Column(Float, default=0.0)
    readiness_score = Column(Float, default=100.0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    institution = relationship("Institution", back_populates="applications")
    created_by_user = relationship("User", foreign_keys=[created_by_user_id], back_populates="created_applications")
    assigned_reviewer = relationship("User", foreign_keys=[assigned_reviewer_id], back_populates="assigned_applications")
    decision_by_user = relationship("User", foreign_keys=[decision_by_user_id])
    
    documents = relationship("Document", back_populates="application", cascade="all, delete-orphan")
    compliance_assessments = relationship("ComplianceAssessment", back_populates="application", cascade="all, delete-orphan")
    findings = relationship("ComplianceFinding", back_populates="application", cascade="all, delete-orphan")
    workflow_events = relationship("WorkflowEvent", back_populates="application", cascade="all, delete-orphan", order_by="WorkflowEvent.created_at.desc()")
    comments = relationship("ReviewerComment", back_populates="application", cascade="all, delete-orphan", order_by="ReviewerComment.created_at.desc()")
    deadlines = relationship("Deadline", back_populates="application", cascade="all, delete-orphan")
    verification_jobs = relationship("VerificationJob", back_populates="application", cascade="all, delete-orphan", order_by="VerificationJob.created_at.desc()")
    reports = relationship("ApplicationReport", back_populates="application", cascade="all, delete-orphan", order_by="ApplicationReport.created_at.desc()")

class WorkflowEvent(Base):
    __tablename__ = "workflow_events"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, index=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    actor_name = Column(String(255), nullable=False)
    actor_role = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False)  # "Draft Created", "Application Submitted", etc.
    from_state = Column(String(50), nullable=False)
    to_state = Column(String(50), nullable=False)
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    application = relationship("Application", back_populates="workflow_events")
    actor = relationship("User")
