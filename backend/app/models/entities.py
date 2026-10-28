import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Boolean, Float, Integer, DateTime, ForeignKey, Text, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    display_name = Column(String(120), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    role = Column(String(30), default="teacher", nullable=False)  # admin, teacher
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    courses = relationship("Course", back_populates="teacher", cascade="all, delete-orphan")


class Course(Base):
    __tablename__ = "courses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    course_code = Column(String(30), unique=True, index=True, nullable=False)
    name = Column(String(150), nullable=False)
    teacher_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_archived = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    teacher = relationship("User", back_populates="courses")
    enrollments = relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="course", cascade="all, delete-orphan")


class Student(Base):
    __tablename__ = "students"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_code = Column(String(50), unique=True, index=True, nullable=False)
    display_name = Column(String(120), nullable=False)
    reference_image_path = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    enrollments = relationship("Enrollment", back_populates="student", cascade="all, delete-orphan")
    consents = relationship("Consent", back_populates="student", cascade="all, delete-orphan")
    attendance_records = relationship("AttendanceRecord", back_populates="student", cascade="all, delete-orphan")


class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (
        UniqueConstraint("student_id", "course_id", name="uq_student_course"),
        Index("idx_enrollment_student_course", "student_id", "course_id")
    )

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(30), default="enrolled", nullable=False)  # enrolled, dropped, completed
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    student = relationship("Student", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")


class Consent(Base):
    __tablename__ = "consents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    consent_type = Column(String(50), nullable=False)  # video_presence, audio_activity, reference_photo
    granted = Column(Boolean, default=False, nullable=False)
    timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    student = relationship("Student", back_populates="consents")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(150), nullable=False)
    teacher_name = Column(String(120), default="Professor", nullable=False)
    subject = Column(String(120), nullable=True)
    planned_duration_minutes = Column(Integer, default=60, nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(30), default="draft", nullable=False)  # draft, ready, running, paused, processing, completed, failed
    input_mode = Column(String(30), default="simulated", nullable=False)  # live_camera, uploaded_video, simulated
    configuration_json = Column(Text, default="{}", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    course = relationship("Course", back_populates="sessions")
    attendance_records = relationship("AttendanceRecord", back_populates="session", cascade="all, delete-orphan")
    metrics = relationship("EngagementMetric", back_populates="session", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="session", cascade="all, delete-orphan")


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    __table_args__ = (
        Index("idx_attendance_session_student", "session_id", "student_id"),
        Index("idx_attendance_session_track", "session_id", "anonymous_track_id"),
    )

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=True)
    anonymous_track_id = Column(String(50), nullable=True)
    first_seen = Column(DateTime(timezone=True), nullable=True)
    last_seen = Column(DateTime(timezone=True), nullable=True)
    observed_duration = Column(Float, default=0.0, nullable=False)  # In seconds
    status = Column(String(30), default="unverified", nullable=False)  # present, late, left_early, unverified, manually_confirmed, absent
    source = Column(String(30), default="automated_vision", nullable=False)  # automated_vision, simulated, manual_entry
    manually_corrected = Column(Boolean, default=False, nullable=False)
    confidence = Column(Float, default=1.0, nullable=False)
    notes = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    session = relationship("Session", back_populates="attendance_records")
    student = relationship("Student", back_populates="attendance_records")


class EngagementMetric(Base):
    __tablename__ = "engagement_metrics"
    __table_args__ = (
        Index("idx_metrics_session_interval", "session_id", "interval_start"),
    )

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    interval_start = Column(DateTime(timezone=True), nullable=False)
    interval_end = Column(DateTime(timezone=True), nullable=False)
    metric_name = Column(String(50), nullable=False)  # composite_engagement, participation_activity, movement_intensity, head_orientation, audio_activity, participant_count
    metric_value = Column(Float, nullable=False)  # 0.0 - 100.0 or count
    confidence = Column(Float, default=1.0, nullable=False)
    source_modality = Column(String(30), nullable=False)  # video, audio, multimodal, simulated
    metadata_json = Column(Text, default="{}", nullable=False)

    session = relationship("Session", back_populates="metrics")


class Recommendation(Base):
    __tablename__ = "recommendations"
    __table_args__ = (
        Index("idx_rec_session_created", "session_id", "created_at"),
    )

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(150), nullable=False)
    explanation = Column(Text, nullable=False)
    evidence_json = Column(Text, default="{}", nullable=False)
    suggested_action = Column(Text, nullable=False)
    confidence = Column(Float, default=0.85, nullable=False)
    status = Column(String(30), default="active", nullable=False)  # active, accepted, dismissed, completed
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    session = relationship("Session", back_populates="recommendations")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), nullable=True)
    action = Column(String(60), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(50), nullable=True)
    timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    details_json = Column(Text, default="{}", nullable=False)
