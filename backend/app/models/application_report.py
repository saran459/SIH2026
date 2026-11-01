from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class ApplicationReport(Base):
    __tablename__ = "application_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_number = Column(String(64), unique=True, index=True, nullable=False)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, index=True)
    
    # Statuses: Generated, Flagged for Manual Review, Ready for Decision, Reviewed
    status = Column(String(50), nullable=False, default="Generated", index=True)
    
    readiness_score = Column(Float, default=100.0)
    risk_level = Column(String(50), default="Low Risk", index=True)  # Low Risk, Moderate Risk, High Risk, Critical Risk
    
    score_explanation = Column(Text, nullable=False)
    summary = Column(Text, nullable=False)
    
    documents_processed_count = Column(Integer, default=0)
    passed_checks_count = Column(Integer, default=0)
    failed_checks_count = Column(Integer, default=0)
    warning_checks_count = Column(Integer, default=0)
    
    requires_human_verification = Column(Boolean, default=False, index=True)
    human_verification_reasons = Column(Text, nullable=True)  # JSON-encoded array
    
    # Complete comprehensive JSON snapshot of the verification assessment
    report_data = Column(Text, nullable=False)
    
    # Link to the cryptographic SHA-256 audit chain event
    audit_event_hash = Column(String(64), nullable=True, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    application = relationship("Application", back_populates="reports")
    institution = relationship("Institution")
