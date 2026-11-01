from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class VerificationJob(Base):
    __tablename__ = "verification_jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String(64), unique=True, index=True, nullable=False)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, index=True)
    
    # Standardized Report Job States: Pending, Processing, Completed, Needs Manual Review, Failed
    status = Column(String(50), nullable=False, default="Pending", index=True)
    
    # Stages: ENQUEUED, DOCUMENT_PARSING, INTEGRITY_CHECK, CROSS_DOC_CHECK, COMPLIANCE_EVALUATION, RISK_ASSESSMENT, REPORT_GENERATION, COMPLETED
    stage = Column(String(100), nullable=False, default="ENQUEUED")
    progress_percent = Column(Integer, default=0)
    
    attempt_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    error_message = Column(Text, nullable=True)
    error_details = Column(Text, nullable=True)
    
    # Idempotency key to guarantee each submission/version is processed once logically
    idempotency_key = Column(String(128), unique=True, index=True, nullable=False)
    
    requires_human_verification = Column(Boolean, default=False)
    human_verification_reasons = Column(Text, nullable=True)  # JSON-encoded array of reasons
    
    trigger_source = Column(String(50), default="SUBMISSION")  # SUBMISSION, RESUBMISSION, MANUAL_RETRY
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    application = relationship("Application", back_populates="verification_jobs")
