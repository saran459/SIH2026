from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class ReviewerComment(Base):
    __tablename__ = "reviewer_comments"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    finding_id = Column(Integer, ForeignKey("compliance_findings.id"), nullable=True)
    request_type = Column(String(50), default="Correction")  # Correction, Clarification, General Comment
    title = Column(String(255), nullable=False)
    comment = Column(Text, nullable=False)
    due_date = Column(DateTime, nullable=True)
    status = Column(String(50), default="Pending Response")  # Pending Response, Response Submitted, Verified & Closed
    institution_response = Column(Text, nullable=True)
    response_evidence_document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    responded_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    application = relationship("Application", back_populates="comments")
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    finding = relationship("ComplianceFinding")
    response_document = relationship("Document", foreign_keys=[response_evidence_document_id])
