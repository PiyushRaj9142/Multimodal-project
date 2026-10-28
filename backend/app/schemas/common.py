from pydantic import BaseModel, ConfigDict
from typing import Optional, Any, Dict
from datetime import datetime

class HealthResponse(BaseModel):
    status: str
    version: str
    offline_mode: bool
    timestamp: datetime
    database: str

class CapabilitiesResponse(BaseModel):
    computer_vision_available: bool
    cv_backend: str
    audio_vad_available: bool
    audio_backend: str
    offline_ready: bool
    local_storage: bool
    pdf_export_available: bool
    notes: list[str]

class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    timestamp: datetime
    details_json: str
