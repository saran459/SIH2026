from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.deadline import Notification, Deadline, NotificationPreference
from app.models.application import Application
from app.models.user import User
from app.schemas.notification import (
    NotificationResponse,
    NotificationPreferenceResponse,
    NotificationPreferenceUpdate
)
from app.schemas.reviewer import DeadlineResponse
from app.api.deps import get_current_user
from app.services.deadline_engine import evaluate_deadlines_and_warnings

router = APIRouter(tags=["Notifications & Deadlines"])

@router.get("/notifications", response_model=List[NotificationResponse])
def get_notifications(
    category: Optional[str] = None,
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Notification).filter(
        (Notification.user_id == current_user.id) |
        (Notification.role_target == current_user.role) |
        (Notification.role_target == None)
    )

    if category:
        query = query.filter(Notification.category == category)
    if unread_only:
        query = query.filter(Notification.is_read == False)

    return query.order_by(Notification.created_at.desc()).limit(50).all()

@router.patch("/notifications/{id}/read", response_model=NotificationResponse)
def mark_notification_read(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif = db.query(Notification).filter(Notification.id == id).first()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")

    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif

@router.post("/notifications/read-all")
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(Notification).filter(
        (Notification.user_id == current_user.id) |
        (Notification.role_target == current_user.role),
        Notification.is_read == False
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"message": "All notifications marked as read."}

@router.get("/deadlines", response_model=List[DeadlineResponse])
def get_deadlines(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Run dynamic deadline evaluation to refresh statuses
    evaluate_deadlines_and_warnings(db)

    query = db.query(Deadline)
    if current_user.role == "institution":
        query = query.join(Application).filter(Application.institution_id == current_user.institution_id)

    if status_filter:
        query = query.filter(Deadline.status == status_filter)

    deadlines = query.order_by(Deadline.due_date.asc()).all()
    results = []
    now = datetime.utcnow()

    for d in deadlines:
        days_rem = (d.due_date - now).days
        results.append(
            DeadlineResponse(
                id=d.id,
                application_id=d.application_id,
                application_number=d.application.application_number if d.application else None,
                institution_name=d.application.institution.name if d.application and d.application.institution else None,
                title=d.title,
                deadline_type=d.deadline_type,
                due_date=d.due_date,
                status=d.status,
                assigned_role=d.assigned_role,
                completed_at=d.completed_at,
                days_remaining=days_rem,
                created_at=d.created_at
            )
        )
    return results

@router.get("/notifications/preferences", response_model=NotificationPreferenceResponse)
def get_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    pref = db.query(NotificationPreference).filter(NotificationPreference.user_id == current_user.id).first()
    if not pref:
        pref = NotificationPreference(user_id=current_user.id)
        db.add(pref)
        db.commit()
        db.refresh(pref)
    return pref

@router.patch("/notifications/preferences", response_model=NotificationPreferenceResponse)
def update_preferences(
    data: NotificationPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    pref = db.query(NotificationPreference).filter(NotificationPreference.user_id == current_user.id).first()
    if not pref:
        pref = NotificationPreference(user_id=current_user.id)
        db.add(pref)

    for k, v in data.dict(exclude_unset=True).items():
        setattr(pref, k, v)

    db.commit()
    db.refresh(pref)
    return pref

@router.delete("/notifications/{id}", status_code=status.HTTP_200_OK)
def delete_notification(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif = db.query(Notification).filter(Notification.id == id).first()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
    db.delete(notif)
    db.commit()
    return {"status": "success", "message": "Notification deleted."}

@router.delete("/notifications", status_code=status.HTTP_200_OK)
def delete_all_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Notification)
    if current_user.role == "institution":
        query = query.filter((Notification.user_id == current_user.id) | (Notification.role_target == "institution"))
    count = query.delete(synchronize_session=False)
    db.commit()
    return {"status": "success", "message": f"{count} notification(s) deleted."}

@router.delete("/deadlines/{id}", status_code=status.HTTP_200_OK)
def delete_deadline(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dl = db.query(Deadline).filter(Deadline.id == id).first()
    if not dl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deadline not found.")
    db.delete(dl)
    db.commit()
    return {"status": "success", "message": "Deadline deleted."}

@router.delete("/deadlines", status_code=status.HTTP_200_OK)
def delete_all_deadlines(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "institution":
        app_ids = [a.id for a in db.query(Application.id).filter(Application.institution_id == current_user.institution_id).all()]
        count = db.query(Deadline).filter(Deadline.application_id.in_(app_ids)).delete(synchronize_session=False) if app_ids else 0
    else:
        count = db.query(Deadline).delete(synchronize_session=False)
    db.commit()
    return {"status": "success", "message": f"{count} deadline(s) deleted."}
