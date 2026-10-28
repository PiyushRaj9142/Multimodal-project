from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession
from typing import List
from backend.app.core.database import get_db
from backend.app.models.entities import AuditLog
from backend.app.schemas.common import AuditLogResponse

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])

@router.get("", response_model=List[AuditLogResponse])
def get_audit_logs(limit: int = 50, db: DBSession = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return logs
