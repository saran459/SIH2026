from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="institution")  # institution, reviewer, admin
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=True)
    designation = Column(String(100), default="Registrar / Representative")
    phone = Column(String(50), default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    institution = relationship("Institution", back_populates="users")
    created_applications = relationship("Application", foreign_keys="Application.created_by_user_id", back_populates="created_by_user")
    assigned_applications = relationship("Application", foreign_keys="Application.assigned_reviewer_id", back_populates="assigned_reviewer")
