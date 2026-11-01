"""
Background and Scheduled Tasks for AICTE SmartApproval:
- SLA Deadline Monitoring & Escalation
- Cryptographic Audit Chain periodic verification
"""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.deadline import Deadline, Notification
from app.services.audit_service import verify_audit_chain

def check_sla_deadlines(db: Session):
    """
    Checks upcoming SLA deadlines and flags approaching or overdue milestones.
    """
    now = datetime.utcnow()
    deadlines = db.query(Deadline).filter(Deadline.is_completed == False).all()
    count_updated = 0
    for d in deadlines:
        if d.deadline_date < now and d.status != "Overdue":
            d.status = "Overdue"
            count_updated += 1
        elif d.deadline_date - now < timedelta(days=2) and d.status == "On Track":
            d.status = "Approaching"
            count_updated += 1
    if count_updated > 0:
        db.commit()
    return count_updated
