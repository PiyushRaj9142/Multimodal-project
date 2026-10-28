import json
from typing import Optional, Any
from sqlalchemy.orm import Session as DBSession
from backend.app.models.entities import AuditLog, utc_now

def log_audit(
    db: DBSession,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    details: Optional[dict[str, Any]] = None,
    user_id: Optional[str] = "local-instructor"
) -> AuditLog:
    entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        timestamp=utc_now(),
        details_json=json.dumps(details or {})
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
