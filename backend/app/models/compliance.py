from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class ComplianceRule(Base):
    __tablename__ = "compliance_rules"

    id = Column(Integer, primary_key=True, index=True)
    rule_code = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=False)  # Documentation, Faculty & Staff, Infrastructure, Safety & NOC, Legal
    severity = Column(String(50), default="High")   # Critical, High, Medium, Low
    applicable_category = Column(String(100), default="All")
    evaluation_method = Column(String(100), default="rule_engine")
    rule_version = Column(String(50), default="v2026.1")
    source_reference = Column(String(255), default="AICTE Approval Process Handbook (APH) 2026-27")
    is_enabled = Column(Boolean, default=True)
    score_penalty = Column(Integer, default=15)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    findings = relationship("ComplianceFinding", back_populates="rule")

class ComplianceAssessment(Base):
    __tablename__ = "compliance_assessments"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, index=True)
    assessed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    readiness_score = Column(Float, default=100.0)
    total_rules_evaluated = Column(Integer, default=0)
    passed_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    needs_review_count = Column(Integer, default=0)
    status = Column(String(50), default="Action Required")  # Compliant, Non-Compliant, Action Required
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    application = relationship("Application", back_populates="compliance_assessments")
    assessed_by = relationship("User")
    findings = relationship("ComplianceFinding", back_populates="assessment")

class ComplianceFinding(Base):
    __tablename__ = "compliance_findings"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("compliance_assessments.id"), nullable=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, index=True)
    rule_id = Column(Integer, ForeignKey("compliance_rules.id"), nullable=True)
    finding_type = Column(String(100), default="Rule Violation")  # Missing Document, Cross-Document Inconsistency, etc.
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(50), default="High")  # Critical, High, Medium, Low
    status = Column(String(50), default="Open")    # Open, Correction Requested, Resolved, Accepted with Justification
    expected_value = Column(String(255), nullable=True)
    observed_value = Column(String(255), nullable=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    comparison_document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    page_number = Column(Integer, nullable=True)
    evidence_excerpt = Column(Text, nullable=True)
    recommended_action = Column(Text, default="")
    resolution_notes = Column(Text, nullable=True)
    resolved_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    application = relationship("Application", back_populates="findings")
    assessment = relationship("ComplianceAssessment", back_populates="findings")
    rule = relationship("ComplianceRule", back_populates="findings")
    document = relationship("Document", foreign_keys=[document_id], back_populates="findings")
    comparison_document = relationship("Document", foreign_keys=[comparison_document_id])
    resolved_by = relationship("User")
