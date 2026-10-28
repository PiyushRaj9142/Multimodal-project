import os
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.models.entities import (
    Session as ClassSession,
    AttendanceRecord,
    EngagementMetric,
    Recommendation,
    Consent,
    utc_now
)
from backend.app.schemas.privacy import (
    PrivacySettingsResponse,
    PrivacySettingsUpdate,
    PrivacyPurgeRequest,
    PrivacyPurgeResponse
)
from backend.app.services.audit import log_audit

router = APIRouter(prefix="/privacy", tags=["Privacy & Data Protection"])

# Local runtime settings cache
privacy_config = {
    "local_storage_only": True,
    "retention_period_days": 30,
    "auto_delete_raw_media": True,
    "allow_biometric_matching": False,
    "require_explicit_consent": True
}

def calculate_directory_size(path: Path) -> int:
    total = 0
    if path.exists():
        for p in path.glob("**/*"):
            if p.is_file():
                total += p.stat().st_size
    return total

@router.get("/settings", response_model=PrivacySettingsResponse)
def get_privacy_settings(db: DBSession = Depends(get_db)):
    sessions_count = db.query(ClassSession).count()
    records_count = db.query(AttendanceRecord).count()
    media_bytes = calculate_directory_size(settings.UPLOAD_DIR)

    return PrivacySettingsResponse(
        local_storage_only=privacy_config["local_storage_only"],
        retention_period_days=privacy_config["retention_period_days"],
        auto_delete_raw_media=privacy_config["auto_delete_raw_media"],
        allow_biometric_matching=privacy_config["allow_biometric_matching"],
        require_explicit_consent=privacy_config["require_explicit_consent"],
        total_stored_sessions=sessions_count,
        total_stored_attendance_records=records_count,
        total_stored_media_bytes=media_bytes
    )

@router.patch("/settings", response_model=PrivacySettingsResponse)
def update_privacy_settings(payload: PrivacySettingsUpdate, db: DBSession = Depends(get_db)):
    if payload.retention_period_days is not None:
        privacy_config["retention_period_days"] = max(1, payload.retention_period_days)
    if payload.auto_delete_raw_media is not None:
        privacy_config["auto_delete_raw_media"] = payload.auto_delete_raw_media
    if payload.allow_biometric_matching is not None:
        privacy_config["allow_biometric_matching"] = payload.allow_biometric_matching
    if payload.require_explicit_consent is not None:
        privacy_config["require_explicit_consent"] = payload.require_explicit_consent

    log_audit(db, "UPDATE_PRIVACY_SETTINGS", "SystemSettings", None, payload.model_dump(exclude_unset=True))
    return get_privacy_settings(db)

@router.post("/delete-session-data", response_model=PrivacyPurgeResponse)
def delete_session_data(payload: PrivacyPurgeRequest, db: DBSession = Depends(get_db)):
    if not payload.confirm_purge:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation flag 'confirm_purge' is required to execute privacy data deletion"
        )

    deleted_sessions = 0
    deleted_att = 0
    deleted_metrics = 0
    deleted_files = 0
    freed_bytes = 0

    if payload.session_id:
        target_sessions = db.query(ClassSession).filter(ClassSession.id == payload.session_id).all()
    else:
        target_sessions = db.query(ClassSession).all()

    for s in target_sessions:
        # 1. Purge raw media files in uploads
        for f in settings.UPLOAD_DIR.glob(f"{s.id}*"):
            if f.is_file():
                freed_bytes += f.stat().st_size
                f.unlink()
                deleted_files += 1

        if not payload.delete_raw_media_only:
            # Delete database records
            deleted_att += db.query(AttendanceRecord).filter(AttendanceRecord.session_id == s.id).delete()
            deleted_metrics += db.query(EngagementMetric).filter(EngagementMetric.session_id == s.id).delete()
            db.query(Recommendation).filter(Recommendation.session_id == s.id).delete()
            db.delete(s)
            deleted_sessions += 1

    db.commit()

    log_audit(db, "PRIVACY_DATA_PURGE", "Session", payload.session_id or "ALL", {
        "deleted_sessions": deleted_sessions,
        "deleted_records": deleted_att,
        "deleted_media_files": deleted_files,
        "freed_bytes": freed_bytes
    })

    return PrivacyPurgeResponse(
        success=True,
        deleted_sessions=deleted_sessions,
        deleted_attendance_records=deleted_att,
        deleted_metrics=deleted_metrics,
        deleted_media_files=deleted_files,
        freed_bytes=freed_bytes,
        message=f"Privacy purge complete. Removed {deleted_files} media files and freed {freed_bytes / (1024 * 1024):.2f} MB."
    )
