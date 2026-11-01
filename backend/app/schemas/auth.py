from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    portal: Optional[str] = None  # "institution", "reviewer", "admin"

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    email: str
    full_name: str
    role: str
    institution_id: Optional[int] = None
    institution_name: Optional[str] = None

class TokenData(BaseModel):
    user_id: Optional[int] = None
    email: Optional[str] = None
    role: Optional[str] = None
    institution_id: Optional[int] = None

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    role: str
    institution_id: Optional[int] = None
    institution_name: Optional[str] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "institution"
    institution_id: Optional[int] = None
    designation: Optional[str] = "Representative"
    phone: Optional[str] = ""

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "institution"  # "institution" or "reviewer"
    phone: Optional[str] = ""
    designation: Optional[str] = ""
    # Institutional fields (when role == "institution")
    institution_id: Optional[int] = None
    institution_name: Optional[str] = None
    aicte_permanent_id: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    pincode: Optional[str] = None
    institution_type: Optional[str] = "Private-Self Financed"
    # Reviewer fields (when role == "reviewer")
    regional_office: Optional[str] = None

class RegisterResponse(BaseModel):
    status: str = "success"
    message: str
    user_id: int
    email: str
    full_name: str
    role: str
    institution_id: Optional[int] = None
    institution_name: Optional[str] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    institution_id: Optional[int] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

