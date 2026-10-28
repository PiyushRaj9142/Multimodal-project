from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class MetricDataPoint(BaseModel):
    timestamp: datetime
    time_label: str  # e.g. "10:15" or "+15m"
    composite_engagement: float
    participation_activity: float
    movement_intensity: float
    head_orientation: Optional[float] = None
    audio_activity: Optional[float] = None
    participant_count: int
    data_quality: str  # "high", "moderate", "low", "insufficient"
    available_modalities: List[str]

class ModalityContribution(BaseModel):
    modality: str
    weight: float
    contribution_score: float
    is_active: bool

class SessionInsight(BaseModel):
    interval_start: datetime
    interval_end: datetime
    time_range_label: str
    category: str  # "dip", "peak", "steady", "warning"
    neutral_observation: str  # e.g. "Participation activity decreased during this interval."
    evidence_metric: str
    metric_value: float
    confidence: float
    limitations: str

class SessionAnalyticsResponse(BaseModel):
    session_id: str
    session_title: str
    overall_engagement_score: float
    data_quality_level: str  # "High", "Moderate", "Limited"
    available_modalities: List[str]
    missing_modality_warnings: List[str]
    timeline: List[MetricDataPoint]
    modality_breakdown: List[ModalityContribution]
    insights: List[SessionInsight]
    attendance_ratio: float
    total_participants_tracked: int
    session_duration_minutes: float
    limitations_disclaimer: str

class OverviewAnalyticsResponse(BaseModel):
    total_enrolled_students: int
    students_present_latest: int
    attendance_rate_percentage: float
    current_session_duration_seconds: int
    average_engagement_score: float
    participation_activity_index: float
    recent_sessions: List[Dict[str, Any]]
    recent_attendance_events: List[Dict[str, Any]]
    teaching_recommendation_count: int
    offline_status: str
