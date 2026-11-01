from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.audit import AuditEvent
from app.models.user import User
from app.schemas.audit import AuditEventResponse, VerifyChainResponse
from app.api.deps import get_current_user, require_role
from app.services.audit_service import verify_audit_chain

router = APIRouter(prefix="/audit-events", tags=["Audit Trail"])

@router.get("", response_model=List[AuditEventResponse])
def get_audit_events(
    action_type: Optional[str] = None,
    application_id: Optional[int] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(AuditEvent)

    if current_user.role == "institution":
        # Scoped to applications owned by institution
        from app.models.application import Application
        query = query.join(Application, AuditEvent.application_id == Application.id).filter(
            Application.institution_id == current_user.institution_id
        )
    elif application_id:
        query = query.filter(AuditEvent.application_id == application_id)

    if action_type:
        query = query.filter(AuditEvent.action_type.ilike(f"%{action_type}%"))

    return query.order_by(AuditEvent.id.desc()).offset(offset).limit(limit).all()

@router.post("/verify-chain", response_model=VerifyChainResponse)
def verify_chain(
    current_user: User = Depends(require_role(["admin", "reviewer"])),
    db: Session = Depends(get_db)
):
    is_valid, count, broken_id, msg, first_hash, last_hash = verify_audit_chain(db)
    return VerifyChainResponse(
        total_events=count,
        is_valid=is_valid,
        broken_link_index=broken_id,
        verification_message=msg,
        first_event_hash=first_hash,
        last_event_hash=last_hash
    )

@router.delete("", status_code=status.HTTP_200_OK)
def delete_all_audit_events(
    current_user: User = Depends(require_role(["admin", "reviewer"])),
    db: Session = Depends(get_db)
):
    count = db.query(AuditEvent).delete(synchronize_session=False)
    db.commit()
    return {"status": "success", "message": f"{count} audit event(s) deleted."}
