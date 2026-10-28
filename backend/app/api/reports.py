from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session as DBSession

from backend.app.core.database import get_db
from backend.app.models.entities import Session as ClassSession, AttendanceRecord, Recommendation, EngagementMetric
from backend.app.services.reports import generate_session_csv, generate_session_pdf
from backend.app.services.audit import log_audit

router = APIRouter(prefix="/reports", tags=["Reports & Exports"])

@router.get("/sessions/{session_id}/csv")
def export_session_csv(session_id: str, db: DBSession = Depends(get_db)):
    session = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    attendance_records = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session_id
    ).order_by(AttendanceRecord.first_seen.asc()).all()

    csv_content = generate_session_csv(session, attendance_records)

    log_audit(db, "EXPORT_REPORT_CSV", "Session", session.id, {"records_count": len(attendance_records)})

    filename = f"attendance_report_{session.course.course_code if session.course else 'session'}_{session_id[:8]}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/sessions/{session_id}/pdf")
def export_session_pdf(session_id: str, db: DBSession = Depends(get_db)):
    session = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    attendance_records = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session_id
    ).order_by(AttendanceRecord.first_seen.asc()).all()

    recommendations = db.query(Recommendation).filter(
        Recommendation.session_id == session_id
    ).order_by(Recommendation.created_at.desc()).all()

    metrics = db.query(EngagementMetric).filter(
        EngagementMetric.session_id == session_id,
        EngagementMetric.metric_name == "composite_engagement"
    ).all()
    avg_eng = round(sum(m.metric_value for m in metrics) / len(metrics), 1) if metrics else 80.0

    pdf_bytes = generate_session_pdf(session, attendance_records, recommendations, avg_eng)

    log_audit(db, "EXPORT_REPORT_PDF", "Session", session.id, {"records_count": len(attendance_records)})

    filename = f"session_summary_{session.course.course_code if session.course else 'session'}_{session_id[:8]}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
