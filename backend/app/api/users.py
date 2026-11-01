from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models.user import User
from app.models.institution import Institution
from app.schemas.auth import UserResponse, UserCreate, UserUpdate
from app.api.deps import get_current_user, require_role
from app.services.auth_service import get_password_hash
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/users", tags=["User Management"])

def build_user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        institution_id=user.institution_id,
        institution_name=user.institution.name if user.institution else None,
        designation=user.designation,
        phone=user.phone,
        is_active=user.is_active
    )

@router.get("", response_model=List[UserResponse])
def get_users(
    role: Optional[str] = None,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    if search:
        query = query.filter(
            or_(
                User.email.ilike(f"%{search}%"),
                User.full_name.ilike(f"%{search}%"),
                User.designation.ilike(f"%{search}%")
            )
        )
    users = query.order_by(User.id.asc()).all()
    return [build_user_response(u) for u in users]

@router.get("/reviewers", response_model=List[UserResponse])
def get_reviewers(
    current_user: User = Depends(require_role(["admin", "reviewer"])),
    db: Session = Depends(get_db)
):
    reviewers = db.query(User).filter(User.role == "reviewer", User.is_active == True).all()
    return [build_user_response(r) for r in reviewers]

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    data: UserCreate,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    if data.role not in ["institution", "reviewer", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role specified. Must be 'institution', 'reviewer', or 'admin'."
        )

    if data.role == "institution" and not data.institution_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Institution ID is required for institution users."
        )

    hashed_pw = get_password_hash(data.password)
    user = User(
        email=data.email,
        hashed_password=hashed_pw,
        full_name=data.full_name,
        role=data.role,
        institution_id=data.institution_id if data.role == "institution" else None,
        designation=data.designation or "Authorized Representative",
        phone=data.phone or "",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    log_audit_event(
        db=db,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action_type="USER_CREATED",
        actor_id=current_user.id,
        details={"created_user_id": user.id, "email": user.email, "role": user.role}
    )

    return build_user_response(user)

@router.patch("/{id}", response_model=UserResponse)
def update_user(
    id: int,
    data: UserUpdate,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    # Guard against admin deactivating or demoting themselves if they are the only admin
    if user.id == current_user.id:
        if data.is_active is False:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot deactivate your own administrative account.")
        if data.role and data.role != "admin":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot demote your own administrative role.")

    update_dict = data.dict(exclude_unset=True)
    if "password" in update_dict and update_dict["password"]:
        user.hashed_password = get_password_hash(update_dict.pop("password"))

    for k, v in update_dict.items():
        setattr(user, k, v)

    db.commit()
    db.refresh(user)

    log_audit_event(
        db=db,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action_type="USER_UPDATED",
        actor_id=current_user.id,
        details={"updated_user_id": user.id, "updated_fields": list(update_dict.keys())}
    )

    return build_user_response(user)
