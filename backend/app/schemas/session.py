from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from backend.app.schemas.attendance import AttendanceRecordResponse

class SessionConfiguration(BaseModel):
    enable_cv_tracking: bool = True
    enable_vad_audio: bool = True
    enable_engagement_scoring: bool = True
    min_observation_seconds: int = 45
    weight_participation: float = 0.35
    weight_movement: float = 0.25
    weight_head_orientation: float = 0.20
    weight_audio_activity: float = 0.20
    consent_confirmed: bool = True

class SessionCreate(BaseModel):
    course_id: str
    title: str = Field(..., min_length=2, max_length=150)
    teacher_name: Optional[str] = "Professor"
    subject: Optional[str] = None
    planned_duration_minutes: int = Field(default=60, ge=5, le=360)
    input_mode: str = Field(default="simulated", pattern="^(live_camera|uploaded_video|simulated)$")
    configuration: Optional[SessionConfiguration] = None

class SessionUpdate(BaseModel):
    title: Optional[str] = None
    teacher_name: Optional[str] = None
    subject: Optional[str] = None
    planned_duration_minutes: Optional[int] = None
    status: Optional[str] = None

class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    course_id: str
    course_name: Optional[str] = None
    course_code: Optional[str] = None
    title: str
    teacher_name: str
    subject: Optional[str] = None
    planned_duration_minutes: int
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: str
    input_mode: str
    configuration_json: str
    created_at: datetime
    present_count: Optional[int] = 0
    enrolled_count: Optional[int] = 0
    average_engagement: Optional[float] = 0.0

class AttendanceCorrectionRequest(BaseModel):
    record_id: str
    status: str = Field(..., pattern="^(present|late|left_early|unverified|manually_confirmed|absent)$")
    notes: Optional[str] = None

class ProcessingStatusResponse(BaseModel):
    session_id: str
    status: str
    progress_percentage: float
    current_step: str
    processed_frames: int
    total_frames: int
    detected_participants: int
    audio_segments_detected: int
    is_complete: bool
    error_message: Optional[str] = None
