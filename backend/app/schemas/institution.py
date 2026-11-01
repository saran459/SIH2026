from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class InstitutionBase(BaseModel):
    name: str
    aicte_permanent_id: str
    institution_type: Optional[str] = "Private-Self Financed"
    address: Optional[str] = ""
    district: Optional[str] = ""
    city: Optional[str] = ""
    state: Optional[str] = ""
    pincode: Optional[str] = ""
    website: Optional[str] = ""
    contact_email: Optional[str] = ""
    contact_phone: Optional[str] = ""
    head_of_institution_name: Optional[str] = ""
    established_year: Optional[int] = 2000
    women_institution: Optional[str] = "N"
    minority_institution: Optional[str] = "N"
    other_id: Optional[str] = ""

class InstitutionCreate(InstitutionBase):
    pass

class InstitutionUpdate(BaseModel):
    name: Optional[str] = None
    institution_type: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    website: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    head_of_institution_name: Optional[str] = None
    established_year: Optional[int] = None
    women_institution: Optional[str] = None
    minority_institution: Optional[str] = None
    other_id: Optional[str] = None

class InstitutionResponse(InstitutionBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class InstitutionSearchResultItem(BaseModel):
    id: int
    name: str
    aicte_permanent_id: str
    institution_type: Optional[str] = ""
    address: Optional[str] = ""
    district: Optional[str] = ""
    city: Optional[str] = ""
    state: Optional[str] = ""
    women_institution: Optional[str] = "N"
    minority_institution: Optional[str] = "N"

    class Config:
        from_attributes = True

class InstitutionSearchResponse(BaseModel):
    items: List[InstitutionSearchResultItem]
    total: int
    page: int
    limit: int
    has_more: bool

class ManualInstitutionCreateRequest(BaseModel):
    name: str
    aicte_permanent_id: Optional[str] = None
    institution_type: Optional[str] = "Private-Self Financed"
    district: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    address: Optional[str] = None
    pincode: Optional[str] = None
