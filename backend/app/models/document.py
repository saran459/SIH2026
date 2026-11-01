from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, index=True)
    category = Column(String(100), nullable=False)  # Institution Registration, Faculty Information, etc.
    file_name = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_hash = Column(String(64), nullable=False)  # SHA-256
    version = Column(Integer, default=1)
    
    # Statuses: Uploaded, Processing, Extraction Complete, Review Required, Failed
    extraction_status = Column(String(50), default="Uploaded")
    raw_text = Column(Text, nullable=True)
    page_count = Column(Integer, default=1)
    uploaded_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    application = relationship("Application", back_populates="documents")
    uploaded_by_user = relationship("User")
    extracted_fields = relationship("ExtractedField", back_populates="document", cascade="all, delete-orphan")
    findings = relationship("ComplianceFinding", foreign_keys="ComplianceFinding.document_id", back_populates="document")

class ExtractedField(Base):
    __tablename__ = "extracted_fields"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, index=True)
    field_name = Column(String(100), nullable=False, index=True)  # institution_name, faculty_count, intake, etc.
    extracted_value = Column(Text, nullable=False)
    verified_value = Column(Text, nullable=True)
    confidence = Column(Float, default=0.95)
    page_number = Column(Integer, default=1)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    document = relationship("Document", back_populates="extracted_fields")
