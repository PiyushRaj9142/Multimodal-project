from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class AttendanceRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str
    student_id: Optional[str] = None
    student_name: Optional[str] = "Anonymous Participant"
    student_code: Optional[str] = None
    anonymous_track_id: Optional[str] = None
    first_seen: Optional[datetime] = None
    last_seen: Optional[datetime] = None
    observed_duration: float  # seconds
    status: str  # present, late, left_early, unverified, manually_confirmed, absent
    source: str  # automated_vision, simulated, manual_entry
    manually_corrected: bool
    confidence: float
    notes: Optional[str] = None
    updated_at: datetime

class AttendanceSummaryResponse(BaseModel):
    total_enrolled: int
    present_count: int
    late_count: int
    left_early_count: int
    absent_count: int
    unverified_count: int
    attendance_rate: float
    records: List[AttendanceRecordResponse]
