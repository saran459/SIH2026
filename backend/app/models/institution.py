from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.orm import relationship
from app.database import Base

class Institution(Base):
    __tablename__ = "institutions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    aicte_permanent_id = Column(String(50), unique=True, index=True, nullable=False)
    institution_type = Column(String(100), default="Private-Self Financed", index=True)
    address = Column(Text, nullable=True)
    district = Column(String(100), nullable=True, index=True)
    city = Column(String(100), default="", nullable=True)
    state = Column(String(100), default="", nullable=True, index=True)
    pincode = Column(String(20), default="", nullable=True)
    website = Column(String(255), default="")
    contact_email = Column(String(255), default="", nullable=True)
    contact_phone = Column(String(50), default="", nullable=True)
    head_of_institution_name = Column(String(255), default="")
    established_year = Column(Integer, default=2000)
    women_institution = Column(String(10), default="N")
    minority_institution = Column(String(10), default="N")
    other_id = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    users = relationship("User", back_populates="institution", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="institution", cascade="all, delete-orphan")
