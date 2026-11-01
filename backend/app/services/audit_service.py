import uuid
import json
import threading
from datetime import datetime
from typing import Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.audit import AuditEvent

GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"
_audit_lock = threading.Lock()

def log_audit_event(
    db: Session,
    actor_email: str,
    actor_role: str,
    action_type: str,
    actor_id: Optional[int] = None,
    application_id: Optional[int] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: str = "127.0.0.1"
) -> AuditEvent:
    from app.database import SessionLocal
    with _audit_lock:
        audit_db = SessionLocal()
        try:
            # Fetch last audit event to get previous_hash
            last_event = audit_db.query(AuditEvent).order_by(AuditEvent.id.desc()).first()
            prev_hash = last_event.event_hash if last_event else GENESIS_HASH

            event_id = str(uuid.uuid4())
            timestamp = datetime.utcnow().replace(microsecond=0)
            timestamp_str = timestamp.strftime("%Y-%m-%d %H:%M:%S")
            details_str = json.dumps(details or {}, sort_keys=True)

            event_hash = AuditEvent.calculate_hash(
                event_id=event_id,
                actor_email=actor_email,
                action_type=action_type,
                application_id=application_id,
                details=details_str,
                timestamp_str=timestamp_str,
                previous_hash=prev_hash
            )

            audit_record = AuditEvent(
                event_id=event_id,
                actor_id=actor_id,
                actor_email=actor_email,
                actor_role=actor_role,
                action_type=action_type,
                application_id=application_id,
                details=details_str,
                ip_address=ip_address,
                timestamp=timestamp,
                previous_hash=prev_hash,
                event_hash=event_hash
            )
            audit_db.add(audit_record)
            audit_db.commit()
            audit_db.refresh(audit_record)
            return audit_record
        finally:
            audit_db.close()

def verify_audit_chain(db: Session) -> Tuple[bool, int, Optional[int], str, Optional[str], Optional[str]]:
    events = db.query(AuditEvent).order_by(AuditEvent.id.asc()).all()
    if not events:
        return True, 0, None, "Audit chain is empty. No events to verify.", None, None

    expected_prev = GENESIS_HASH
    for idx, ev in enumerate(events):
        if ev.previous_hash != expected_prev:
            return False, len(events), ev.id, f"Hash mismatch at index {idx} (ID: {ev.id}). Previous hash mismatch.", events[0].event_hash, events[-1].event_hash
        
        recalculated = AuditEvent.calculate_hash(
            event_id=ev.event_id,
            actor_email=ev.actor_email,
            action_type=ev.action_type,
            application_id=ev.application_id,
            details=ev.details,
            timestamp_str=ev.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            previous_hash=ev.previous_hash
        )
        if recalculated != ev.event_hash:
            return False, len(events), ev.id, f"Tamper detected at event ID {ev.id}! Calculated hash {recalculated} does not match stored {ev.event_hash}.", events[0].event_hash, events[-1].event_hash

        expected_prev = ev.event_hash

    return True, len(events), None, f"All {len(events)} cryptographic chain blocks verified intact. Zero tampering detected.", events[0].event_hash, events[-1].event_hash
