import time
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.institution import Institution
from app.schemas.auth import LoginRequest, Token, UserResponse, RegisterRequest, RegisterResponse
from app.services.auth_service import verify_password, create_access_token, get_password_hash
from app.services.audit_service import log_audit_event
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.get("/institutions")
def list_registration_institutions(
    search: Optional[str] = Query(None),
    limit: int = Query(30, le=100),
    db: Session = Depends(get_db)
):
    """Public list of registered institutions for applicant registration with search and pagination."""
    query = db.query(Institution)
    if search and len(search.strip()) >= 2:
        term = search.strip()
        query = query.filter(
            Institution.name.ilike(f"%{term}%") |
            Institution.aicte_permanent_id.ilike(f"%{term}%") |
            Institution.district.ilike(f"%{term}%")
        )
    institutions = query.order_by(Institution.name.asc()).limit(limit).all()
    return [
        {
            "id": inst.id,
            "name": inst.name,
            "aicte_permanent_id": inst.aicte_permanent_id,
            "district": inst.district or inst.city or "",
            "city": inst.city or inst.district or "",
            "state": inst.state or "",
            "institution_type": inst.institution_type or "Private-Self Financed"
        }
        for inst in institutions
    ]

@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    # 1. Validate email
    email_clean = request.email.strip().lower()
    existing_user = db.query(User).filter(User.email == email_clean).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please sign in."
        )

    # 2. Validate password
    if len(request.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters in length."
        )

    # 3. Validate role
    role = request.role.lower().strip()
    if role not in ["institution", "reviewer"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be either 'institution' or 'reviewer'."
        )

    institution_id = None
    designation = request.designation.strip() if request.designation else ""

    if role == "institution":
        if not designation:
            designation = "Authorized Representative"

        # Check if linking to existing institution ID
        if request.institution_id:
            inst = db.query(Institution).filter(Institution.id == request.institution_id).first()
            if not inst:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Selected institution does not exist."
                )
            institution_id = inst.id
        elif request.institution_name and request.institution_name.strip():
            inst_name = request.institution_name.strip()
            aicte_id = (request.aicte_permanent_id or "").strip()
            if not aicte_id:
                aicte_id = f"1-{int(time.time())}"

            inst = db.query(Institution).filter(
                (Institution.aicte_permanent_id == aicte_id) | (Institution.name == inst_name)
            ).first()

            if not inst:
                inst = Institution(
                    name=inst_name,
                    aicte_permanent_id=aicte_id,
                    institution_type=request.institution_type or "Private-Self Financed",
                    address=request.address or f"{inst_name} Campus",
                    city=request.city or "Campus City",
                    state=request.state or "State",
                    pincode=request.pincode or "110001",
                    contact_email=email_clean,
                    contact_phone=request.phone or ""
                )
                db.add(inst)
                db.flush()
            institution_id = inst.id
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please select an existing institution or enter your institution name."
            )
    elif role == "reviewer":
        if not designation:
            designation = "Scrutiny Officer"
        if request.regional_office and request.regional_office.strip():
            designation = f"{designation} ({request.regional_office.strip()})"

    # 4. Create user
    hashed_password = get_password_hash(request.password)
    user = User(
        email=email_clean,
        hashed_password=hashed_password,
        full_name=request.full_name.strip(),
        role=role,
        institution_id=institution_id,
        designation=designation,
        phone=request.phone or "",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # 5. Audit logging
    log_audit_event(
        db=db,
        actor_email=user.email,
        actor_role=user.role,
        action_type="USER_REGISTER",
        actor_id=user.id,
        details={
            "email": user.email,
            "role": user.role,
            "full_name": user.full_name,
            "institution_id": user.institution_id
        }
    )

    return RegisterResponse(
        status="success",
        message="Registration successful! You can now log in with your credentials.",
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        institution_id=user.institution_id,
        institution_name=user.institution.name if user.institution else None
    )

@router.post("/login", response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please verify credentials."
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated.")

    # Strict portal access control
    if request.portal:
        portal_name_map = {
            "institution": ("Institutional applicants", "institution"),
            "reviewer": ("Scrutiny Reviewers", "reviewer"),
            "admin": ("Administrator Portal", "admin")
        }
        if request.portal in portal_name_map:
            portal_label, expected_role = portal_name_map[request.portal]
            if user.role != expected_role:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access Denied: This login page is reserved for {portal_label}. Your account is registered as '{user.role}'. Please use your designated portal."
                )

    institution_name = user.institution.name if user.institution else None

    token_data = {
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
        "institution_id": user.institution_id
    }
    access_token = create_access_token(data=token_data)

    # Log audit event
    log_audit_event(
        db=db,
        actor_email=user.email,
        actor_role=user.role,
        action_type="USER_LOGIN",
        actor_id=user.id,
        details={"email": user.email, "role": user.role}
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        institution_id=user.institution_id,
        institution_name=institution_name
    )

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    log_audit_event(
        db=db,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action_type="USER_LOGOUT",
        actor_id=current_user.id,
        details={"email": current_user.email}
    )
    return {"message": "Logged out successfully."}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        institution_id=current_user.institution_id,
        institution_name=current_user.institution.name if current_user.institution else None,
        designation=current_user.designation,
        phone=current_user.phone,
        is_active=current_user.is_active
    )

@router.get("/demo-accounts")
def get_demo_accounts():
    """Provides preconfigured demonstration accounts for 1-click SIH testing."""
    return [
        {
            "role": "institution",
            "label": "Institution User (Applicant)",
            "institution_name": "Greenfield Institute of Technology",
            "email": "institution@greenfield.edu",
            "password": "password123",
            "description": "Can create applications, upload certificates, run compliance checks, use Digital Twin simulator."
        },
        {
            "role": "reviewer",
            "label": "AICTE Reviewer / Compliance Officer",
            "institution_name": "AICTE Approval Bureau (HQ New Delhi)",
            "email": "reviewer@aicte.gov.in",
            "password": "password123",
            "description": "Can inspect applications, request corrections with reasons, review evidence side-by-side, approve/reject."
        },
        {
            "role": "admin",
            "label": "Platform Administrator",
            "institution_name": "AICTE System Administration",
            "email": "admin@aicte.gov.in",
            "password": "password123",
            "description": "Full access to platform analytics, rule configuration, reviewer queue assignment, audit tamper-check."
        }
    ]
