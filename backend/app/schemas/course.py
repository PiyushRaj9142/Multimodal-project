from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime

class CourseBase(BaseModel):
    course_code: str = Field(..., min_length=2, max_length=30)
    name: str = Field(..., min_length=2, max_length=150)
    teacher_id: Optional[str] = None

class CourseCreate(CourseBase):
    pass

class CourseUpdate(BaseModel):
    course_code: Optional[str] = Field(None, min_length=2, max_length=30)
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    teacher_id: Optional[str] = None
    is_archived: Optional[bool] = None

class CourseResponse(CourseBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    is_archived: bool
    created_at: datetime
    enrolled_count: Optional[int] = 0
    active_sessions_count: Optional[int] = 0
