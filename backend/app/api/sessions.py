import os
import json
import shutil
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session as DBSession

from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.models.entities import (
    Session as ClassSession,
    Course,
    Enrollment,
    AttendanceRecord,
    EngagementMetric,
    Recommendation,
    Student,
    utc_now
)
from backend.app.schemas.session import (
    SessionCreate,
    SessionUpdate,
    SessionResponse,
    AttendanceCorrectionRequest,
    ProcessingStatusResponse
)
from backend.app.schemas.attendance import AttendanceRecordResponse
from backend.app.schemas.recommendation import RecommendationResponse, RecommendationActionRequest
from backend.app.services.audit import log_audit
from backend.app.workers.background import start_video_processing, get_job_status
from backend.app.analytics.engine import EngagementAnalyticsEngine

router = APIRouter(prefix="/sessions", tags=["Sessions & Processing"])

@router.get("", response_model=List[SessionResponse])
def list_sessions(
    course_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: DBSession = Depends(get_db)
):
    query = db.query(ClassSession)
    if course_id:
        query = query.filter(ClassSession.course_id == course_id)
    if status_filter:
        query = query.filter(ClassSession.status == status_filter)

    sessions = query.order_by(ClassSession.created_at.desc()).all()

    result = []
    for s in sessions:
        enrolled = db.query(Enrollment).filter(Enrollment.course_id == s.course_id).count()
        present = db.query(AttendanceRecord).filter(
            AttendanceRecord.session_id == s.id,
            AttendanceRecord.status.in_(["present", "manually_confirmed"])
        ).count()

        metrics = db.query(EngagementMetric).filter(
            EngagementMetric.session_id == s.id,
            EngagementMetric.metric_name == "composite_engagement"
        ).all()
        avg_eng = round(sum(m.metric_value for m in metrics) / len(metrics), 1) if metrics else 0.0

        resp = SessionResponse.model_validate(s)
        resp.course_name = s.course.name if s.course else None
        resp.course_code = s.course.course_code if s.course else None
        resp.enrolled_count = enrolled
        resp.present_count = present
        resp.average_engagement = avg_eng
        result.append(resp)

    return result

@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(payload: SessionCreate, db: DBSession = Depends(get_db)):
    course = db.query(Course).filter(Course.id == payload.course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    config_str = "{}"
    if payload.configuration:
        config_str = payload.configuration.model_dump_json()

    session_obj = ClassSession(
        course_id=payload.course_id,
        title=payload.title.strip(),
        teacher_name=payload.teacher_name or "Professor",
        subject=payload.subject,
        planned_duration_minutes=payload.planned_duration_minutes,
        status="ready",
        input_mode=payload.input_mode,
        configuration_json=config_str,
        created_at=utc_now()
    )
    db.add(session_obj)
    db.commit()
    db.refresh(session_obj)

    log_audit(db, "CREATE_SESSION", "Session", session_obj.id, {"title": session_obj.title, "mode": session_obj.input_mode})

    # Prepare response
    resp = SessionResponse.model_validate(session_obj)
    resp.course_name = course.name
    resp.course_code = course.course_code
    resp.enrolled_count = db.query(Enrollment).filter(Enrollment.course_id == course.id).count()
    resp.present_count = 0
    resp.average_engagement = 0.0
    return resp

@router.get("/{session_id}", response_model=SessionResponse)
def get_session(session_id: str, db: DBSession = Depends(get_db)):
    s = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    enrolled = db.query(Enrollment).filter(Enrollment.course_id == s.course_id).count()
    present = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == s.id,
        AttendanceRecord.status.in_(["present", "manually_confirmed"])
    ).count()
    metrics = db.query(EngagementMetric).filter(
        EngagementMetric.session_id == s.id,
        EngagementMetric.metric_name == "composite_engagement"
    ).all()
    avg_eng = round(sum(m.metric_value for m in metrics) / len(metrics), 1) if metrics else 0.0

    resp = SessionResponse.model_validate(s)
    resp.course_name = s.course.name if s.course else None
    resp.course_code = s.course.course_code if s.course else None
    resp.enrolled_count = enrolled
    resp.present_count = present
    resp.average_engagement = avg_eng
    return resp

@router.post("/{session_id}/start", response_model=SessionResponse)
def start_session(session_id: str, db: DBSession = Depends(get_db)):
    s = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    if s.status in ("completed", "failed"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot start session in status '{s.status}'")

    s.status = "running"
    if not s.start_time:
        s.start_time = utc_now()
    db.commit()
    db.refresh(s)

    log_audit(db, "START_SESSION", "Session", s.id, {"status": "running"})
    return get_session(session_id, db)

@router.post("/{session_id}/pause", response_model=SessionResponse)
def pause_session(session_id: str, db: DBSession = Depends(get_db)):
    s = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    if s.status != "running":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only pause a running session")

    s.status = "paused"
    db.commit()
    db.refresh(s)

    log_audit(db, "PAUSE_SESSION", "Session", s.id, {"status": "paused"})
    return get_session(session_id, db)

@router.post("/{session_id}/resume", response_model=SessionResponse)
def resume_session(session_id: str, db: DBSession = Depends(get_db)):
    s = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    if s.status != "paused":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only resume a paused session")

    s.status = "running"
    db.commit()
    db.refresh(s)

    log_audit(db, "RESUME_SESSION", "Session", s.id, {"status": "running"})
    return get_session(session_id, db)

@router.post("/{session_id}/stop", response_model=SessionResponse)
def stop_session(session_id: str, db: DBSession = Depends(get_db)):
    s = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    s.status = "completed"
    if not s.end_time:
        s.end_time = utc_now()
    db.commit()
    db.refresh(s)

    log_audit(db, "STOP_SESSION", "Session", s.id, {"status": "completed"})
    return get_session(session_id, db)

@router.post("/{session_id}/finalize", response_model=SessionResponse)
def finalize_session(session_id: str, db: DBSession = Depends(get_db)):
    s = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    s.status = "completed"
    if not s.end_time:
        s.end_time = utc_now()
    db.commit()
    db.refresh(s)

    log_audit(db, "FINALIZE_SESSION", "Session", s.id, {"status": "completed"})
    return get_session(session_id, db)

@router.post("/{session_id}/upload")
async def upload_session_video(
    session_id: str,
    file: UploadFile = File(...),
    db: DBSession = Depends(get_db)
):
    s = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    # Validate file extension
    allowed_exts = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
    ext = Path(file.filename).suffix.lower()
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported video format '{ext}'. Allowed: {', '.join(allowed_exts)}"
        )

    # Save to local data/uploads
    filename = f"{session_id}_{int(utc_now().timestamp())}{ext}"
    target_path = settings.UPLOAD_DIR / filename

    with open(target_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    s.input_mode = "uploaded_video"
    s.status = "processing"
    if not s.start_time:
        s.start_time = utc_now()
    db.commit()

    # Start background processing worker
    start_video_processing(session_id, str(target_path))

    log_audit(db, "UPLOAD_VIDEO", "Session", s.id, {"filename": filename, "path": str(target_path)})

    return {
        "status": "processing",
        "message": "Video uploaded successfully. Background processing started.",
        "session_id": session_id,
        "video_path": str(target_path)
    }

@router.get("/{session_id}/processing-status", response_model=ProcessingStatusResponse)
def get_session_processing_status(session_id: str, db: DBSession = Depends(get_db)):
    job = get_job_status(session_id)
    if job:
        return ProcessingStatusResponse(**job)

    # Fallback to session database status
    s = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    is_comp = s.status == "completed"
    return ProcessingStatusResponse(
        session_id=session_id,
        status=s.status,
        progress_percentage=100.0 if is_comp else (50.0 if s.status == "running" else 0.0),
        current_step="Session " + s.status,
        processed_frames=100 if is_comp else 0,
        total_frames=100,
        detected_participants=db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session_id).count(),
        audio_segments_detected=0,
        is_complete=is_comp,
        error_message=None
    )

@router.get("/{session_id}/attendance", response_model=List[AttendanceRecordResponse])
def get_session_attendance(session_id: str, db: DBSession = Depends(get_db)):
    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session_id
    ).order_by(AttendanceRecord.first_seen.asc()).all()

    result = []
    for r in records:
        resp = AttendanceRecordResponse.model_validate(r)
        resp.student_name = r.student.display_name if r.student else (r.anonymous_track_id or "Anonymous Track")
        resp.student_code = r.student.student_code if r.student else None
        result.append(resp)

    return result

@router.patch("/{session_id}/attendance/correction", response_model=AttendanceRecordResponse)
def correct_attendance_record(
    session_id: str,
    payload: AttendanceCorrectionRequest,
    db: DBSession = Depends(get_db)
):
    record = db.query(AttendanceRecord).filter(
        AttendanceRecord.id == payload.record_id,
        AttendanceRecord.session_id == session_id
    ).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")

    old_status = record.status
    record.status = payload.status
    record.manually_corrected = True
    if payload.notes:
        record.notes = payload.notes
    record.updated_at = utc_now()
    db.commit()
    db.refresh(record)

    log_audit(db, "CORRECT_ATTENDANCE", "AttendanceRecord", record.id, {
        "old_status": old_status,
        "new_status": payload.status,
        "notes": payload.notes
    })

    resp = AttendanceRecordResponse.model_validate(record)
    resp.student_name = record.student.display_name if record.student else (record.anonymous_track_id or "Anonymous")
    resp.student_code = record.student.student_code if record.student else None
    return resp

@router.get("/{session_id}/recommendations", response_model=List[RecommendationResponse])
def get_session_recommendations(session_id: str, db: DBSession = Depends(get_db)):
    recs = db.query(Recommendation).filter(
        Recommendation.session_id == session_id
    ).order_by(Recommendation.created_at.desc()).all()

    result = []
    for r in recs:
        resp = RecommendationResponse.model_validate(r)
        try:
            resp.evidence_dict = json.loads(r.evidence_json.replace("'", '"'))
        except Exception:
            resp.evidence_dict = {"raw": r.evidence_json}
        result.append(resp)
    return result

@router.patch("/recommendations/{recommendation_id}/status", response_model=RecommendationResponse)
def update_recommendation_status(
    recommendation_id: str,
    payload: RecommendationActionRequest,
    db: DBSession = Depends(get_db)
):
    rec = db.query(Recommendation).filter(Recommendation.id == recommendation_id).first()
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found")

    rec.status = payload.status
    db.commit()
    db.refresh(rec)

    log_audit(db, "UPDATE_RECOMMENDATION_STATUS", "Recommendation", rec.id, {"status": payload.status})

    resp = RecommendationResponse.model_validate(rec)
    try:
        resp.evidence_dict = json.loads(rec.evidence_json.replace("'", '"'))
    except Exception:
        resp.evidence_dict = {"raw": rec.evidence_json}
    return resp
