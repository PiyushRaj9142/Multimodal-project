from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PrivacySettingsResponse(BaseModel):
    local_storage_only: bool
    retention_period_days: int
    auto_delete_raw_media: bool
    allow_biometric_matching: bool
    require_explicit_consent: bool
    total_stored_sessions: int
    total_stored_attendance_records: int
    total_stored_media_bytes: int

class PrivacySettingsUpdate(BaseModel):
    retention_period_days: Optional[int] = None
    auto_delete_raw_media: Optional[bool] = None
    allow_biometric_matching: Optional[bool] = None
    require_explicit_consent: Optional[bool] = None

class PrivacyPurgeRequest(BaseModel):
    session_id: Optional[str] = None
    delete_raw_media_only: bool = False
    confirm_purge: bool = False

class PrivacyPurgeResponse(BaseModel):
    success: bool
    deleted_sessions: int
    deleted_attendance_records: int
    deleted_metrics: int
    deleted_media_files: int
    freed_bytes: int
    message: str
