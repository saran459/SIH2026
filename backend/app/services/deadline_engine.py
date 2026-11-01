from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.application import Application
from app.models.deadline import Deadline, Notification
from app.models.compliance import ComplianceFinding
from app.models.reviewer import ReviewerComment

def evaluate_deadlines_and_warnings(db: Session) -> List[Dict[str, Any]]:
    now = datetime.utcnow()
    deadlines = db.query(Deadline).filter(Deadline.status != "Completed").all()
    warnings = []

    for d in deadlines:
        app = db.query(Application).filter(Application.id == d.application_id).first()
        if not app:
            continue

        time_diff = d.due_date - now
        days_left = time_diff.days
        hours_left = int(time_diff.total_seconds() / 3600)

        # Count open findings
        open_findings = db.query(ComplianceFinding).filter(
            ComplianceFinding.application_id == app.id,
            ComplianceFinding.status != "Resolved"
        ).count()

        new_status = d.status
        reason = ""

        if time_diff.total_seconds() < 0:
            new_status = "Overdue"
            reason = f"Deadline expired {abs(days_left)} days ago for {d.title}."
        elif days_left <= 3:
            if open_findings > 0:
                new_status = "Blocked by Missing Evidence"
                reason = f"Deadline approaching in {hours_left}h with {open_findings} unresolved compliance issues blocking closure."
            else:
                new_status = "Approaching Deadline"
                reason = f"Deadline due in {hours_left} hours ({d.due_date.strftime('%d %b %Y')})."
        else:
            new_status = "On Track"
            reason = f"{days_left} days remaining. Progressing normally."

        if d.status != new_status:
            d.status = new_status
            d.updated_at = now

            # If overdue or approaching, trigger alert notification if not already sent today
            if new_status in ["Overdue", "Approaching Deadline", "Blocked by Missing Evidence"]:
                existing_alert = db.query(Notification).filter(
                    Notification.application_id == app.id,
                    Notification.category == "Deadline",
                    Notification.created_at >= (now - timedelta(hours=24))
                ).first()

                if not existing_alert:
                    severity = "Error" if new_status == "Overdue" else "Warning"
                    notif = Notification(
                        user_id=app.created_by_user_id if d.assigned_role == "institution" else app.assigned_reviewer_id,
                        role_target=d.assigned_role,
                        application_id=app.id,
                        title=f"Early Warning: {d.title} ({new_status})",
                        message=reason,
                        category="Deadline",
                        severity=severity,
                        link_url=f"/applications/{app.id}"
                    )
                    db.add(notif)

        warnings.append({
            "deadline_id": d.id,
            "application_id": app.id,
            "application_number": app.application_number,
            "institution_name": app.institution.name,
            "title": d.title,
            "due_date": d.due_date.isoformat(),
            "status": new_status,
            "days_remaining": days_left,
            "reason": reason,
            "assigned_role": d.assigned_role
        })

    db.commit()
    return warnings
