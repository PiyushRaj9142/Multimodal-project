from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime

class ConsentItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[str] = None
    consent_type: str
    granted: bool
    timestamp: datetime
    revoked_at: Optional[datetime] = None

class StudentBase(BaseModel):
    student_code: str = Field(..., min_length=2, max_length=50)
    display_name: str = Field(..., min_length=2, max_length=120)

class StudentCreate(StudentBase):
    course_ids: Optional[List[str]] = []
    video_consent: bool = True
    audio_consent: bool = True

class StudentUpdate(BaseModel):
    student_code: Optional[str] = Field(None, min_length=2, max_length=50)
    display_name: Optional[str] = Field(None, min_length=2, max_length=120)
    course_ids: Optional[List[str]] = None

class StudentResponse(StudentBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime
    reference_image_path: Optional[str] = None
    courses: Optional[List[str]] = []
    consents: Optional[List[ConsentItem]] = []
    attendance_rate: Optional[float] = 100.0

class StudentImportRowError(BaseModel):
    row_number: int
    raw_data: str
    error: str

class StudentImportResult(BaseModel):
    total_processed: int
    successful_imports: int
    failed_imports: int
    errors: List[StudentImportRowError]

class StudentAttendanceHistoryItem(BaseModel):
    session_id: str
    session_title: str
    course_name: str
    session_date: datetime
    status: str
    observed_duration_minutes: float
    confidence: float
    manually_corrected: bool

class StudentDetailResponse(StudentResponse):
    attendance_history: List[StudentAttendanceHistoryItem] = []
    total_sessions_attended: int = 0
    average_observed_minutes: float = 0.0
