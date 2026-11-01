from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, case, func
import uuid

from app.database import get_db
from app.models.institution import Institution
from app.models.user import User
from app.schemas.institution import (
    InstitutionCreate,
    InstitutionUpdate,
    InstitutionResponse,
    InstitutionSearchResponse,
    InstitutionSearchResultItem,
    ManualInstitutionCreateRequest
)
from app.api.deps import get_current_user, require_role
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/institutions", tags=["Institutions"])

@router.get("/search", response_model=InstitutionSearchResponse)
def search_institutions(
    q: str = Query("", description="Search term for college name, AICTE ID, or district (min 2 characters)"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    district: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    institution_type: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    High-performance shared college search API with pagination.
    Triggers when query has 2 or more characters.
    """
    query_str = (q or "").strip()
    
    # If user hasn't typed at least 2 characters, return empty set (prevents dumping 39k items)
    if len(query_str) < 2 and not district and not state:
        return InstitutionSearchResponse(
            items=[],
            total=0,
            page=page,
            limit=limit,
            has_more=False
        )

    base_query = db.query(Institution)

    if query_str:
        like_pattern = f"%{query_str}%"
        base_query = base_query.filter(
            or_(
                Institution.name.ilike(like_pattern),
                Institution.aicte_permanent_id.ilike(like_pattern),
                Institution.district.ilike(like_pattern)
            )
        )

    if district:
        base_query = base_query.filter(Institution.district.ilike(f"%{district.strip()}%"))
    if state:
        base_query = base_query.filter(Institution.state.ilike(f"%{state.strip()}%"))
    if institution_type and institution_type.lower() != "all":
        base_query = base_query.filter(Institution.institution_type == institution_type)

    total = base_query.count()

    # Prioritize prefix match on name, then alphabetical
    prefix_pattern = f"{query_str}%"
    ordered_query = base_query.order_by(
        case((Institution.name.ilike(prefix_pattern), 1), else_=2),
        Institution.name.asc()
    )

    offset = (page - 1) * limit
    institutions = ordered_query.offset(offset).limit(limit).all()

    items = [
        InstitutionSearchResultItem(
            id=inst.id,
            name=inst.name,
            aicte_permanent_id=inst.aicte_permanent_id,
            institution_type=inst.institution_type or "Private-Self Financed",
            address=inst.address or "",
            district=inst.district or inst.city or "",
            city=inst.city or inst.district or "",
            state=inst.state or "",
            women_institution=inst.women_institution or "N",
            minority_institution=inst.minority_institution or "N"
        )
        for inst in institutions
    ]

    return InstitutionSearchResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        has_more=total > (page * limit)
    )

@router.post("/manual", response_model=InstitutionResponse, status_code=status.HTTP_201_CREATED)
def create_manual_institution(
    data: ManualInstitutionCreateRequest,
    db: Session = Depends(get_db)
):
    """
    Allows registering or selecting a manual college if not found in the official list.
    """
    clean_name = data.name.strip()
    if not clean_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Institution name is required.")

    # Check if exists by exact name
    existing = db.query(Institution).filter(Institution.name.ilike(clean_name)).first()
    if existing:
        return existing

    # Generate clean unique manual AICTE ID if not supplied
    if data.aicte_permanent_id and data.aicte_permanent_id.strip():
        aicte_id = data.aicte_permanent_id.strip()
        chk = db.query(Institution).filter(Institution.aicte_permanent_id == aicte_id).first()
        if chk:
            return chk
    else:
        aicte_id = f"MANUAL-{uuid.uuid4().hex[:8].upper()}"

    inst = Institution(
        name=clean_name,
        aicte_permanent_id=aicte_id,
        institution_type=data.institution_type or "Private-Self Financed",
        district=data.district or data.city or "",
        city=data.city or data.district or "",
        state=data.state or "",
        address=data.address or "",
        pincode=data.pincode or ""
    )
    db.add(inst)
    db.commit()
    db.refresh(inst)
    return inst

@router.get("", response_model=List[InstitutionResponse])
def get_institutions(
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Institution)
    if current_user.role == "institution":
        query = query.filter(Institution.id == current_user.institution_id)
    elif search:
        query = query.filter(
            Institution.name.ilike(f"%{search}%") | 
            Institution.aicte_permanent_id.ilike(f"%{search}%") |
            Institution.city.ilike(f"%{search}%") |
            Institution.district.ilike(f"%{search}%")
        )
    return query.order_by(Institution.name.asc()).limit(limit).all()

@router.get("/{id}", response_model=InstitutionResponse)
def get_institution(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "institution" and current_user.institution_id != id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to other institutions.")
    inst = db.query(Institution).filter(Institution.id == id).first()
    if not inst:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Institution not found.")
    return inst

@router.post("", response_model=InstitutionResponse, status_code=status.HTTP_201_CREATED)
def create_institution(
    data: InstitutionCreate,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    existing = db.query(Institution).filter(Institution.aicte_permanent_id == data.aicte_permanent_id).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="AICTE Permanent ID already registered.")
    
    inst = Institution(**data.dict())
    db.add(inst)
    db.commit()
    db.refresh(inst)

    log_audit_event(
        db=db,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action_type="INSTITUTION_CREATED",
        actor_id=current_user.id,
        details={"institution_id": inst.id, "name": inst.name, "aicte_id": inst.aicte_permanent_id}
    )
    return inst

@router.patch("/{id}", response_model=InstitutionResponse)
def update_institution(
    id: int,
    data: InstitutionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "reviewer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Reviewers cannot modify institution records.")

    if current_user.role == "institution" and current_user.institution_id != id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    
    inst = db.query(Institution).filter(Institution.id == id).first()
    if not inst:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Institution not found.")

    update_dict = data.dict(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(inst, k, v)

    db.commit()
    db.refresh(inst)

    log_audit_event(
        db=db,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action_type="INSTITUTION_UPDATED",
        actor_id=current_user.id,
        details={"institution_id": inst.id, "updated_fields": list(update_dict.keys())}
    )
    return inst
