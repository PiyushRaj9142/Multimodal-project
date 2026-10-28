import csv
import io
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session as DBSession
from typing import List, Optional
from backend.app.core.database import get_db
from backend.app.models.entities import Student, Enrollment, Course, Consent, AttendanceRecord, Session, utc_now
from backend.app.schemas.student import (
    StudentCreate,
    StudentUpdate,
    StudentResponse,
    StudentImportResult,
    StudentImportRowError,
    StudentDetailResponse,
    StudentAttendanceHistoryItem,
    ConsentItem
)
from backend.app.services.audit import log_audit

router = APIRouter(prefix="/students", tags=["Students"])

@router.get("", response_model=List[StudentResponse])
def list_students(
    search: Optional[str] = None,
    course_id: Optional[str] = None,
    db: DBSession = Depends(get_db)
):
    query = db.query(Student)

    if course_id:
        query = query.join(Enrollment).filter(Enrollment.course_id == course_id)

    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            (Student.display_name.ilike(search_fmt)) |
            (Student.student_code.ilike(search_fmt))
        )

    students = query.order_by(Student.display_name.asc()).all()

    result = []
    for s in students:
        course_names = [
            e.course.name for e in s.enrollments if e.course and not e.course.is_archived
        ]
        consents = [
            ConsentItem(
                id=c.id,
                consent_type=c.consent_type,
                granted=c.granted,
                timestamp=c.timestamp,
                revoked_at=c.revoked_at
            ) for c in s.consents
        ]

        total_records = len(s.attendance_records)
        present_records = sum(1 for a in s.attendance_records if a.status in ("present", "manually_confirmed"))
        rate = round((present_records / max(1, total_records)) * 100.0, 1) if total_records > 0 else 100.0

        r = StudentResponse.model_validate(s)
        r.courses = course_names
        r.consents = consents
        r.attendance_rate = rate
        result.append(r)

    return result

@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(payload: StudentCreate, db: DBSession = Depends(get_db)):
    existing = db.query(Student).filter(Student.student_code == payload.student_code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Student code '{payload.student_code}' already exists"
        )

    student = Student(
        student_code=payload.student_code.strip().upper(),
        display_name=payload.display_name.strip(),
        created_at=utc_now(),
        updated_at=utc_now()
    )
    db.add(student)
    db.flush()

    # Enrollments
    if payload.course_ids:
        for c_id in payload.course_ids:
            course = db.query(Course).filter(Course.id == c_id).first()
            if course:
                db.add(Enrollment(student_id=student.id, course_id=course.id, status="enrolled"))

    # Consents
    db.add(Consent(
        student_id=student.id,
        consent_type="video_presence",
        granted=payload.video_consent,
        timestamp=utc_now()
    ))
    db.add(Consent(
        student_id=student.id,
        consent_type="audio_activity",
        granted=payload.audio_consent,
        timestamp=utc_now()
    ))

    db.commit()
    db.refresh(student)

    log_audit(db, "CREATE_STUDENT", "Student", student.id, {"student_code": student.student_code})

    return get_student(student.id, db)

@router.get("/{student_id}", response_model=StudentDetailResponse)
def get_student(student_id: str, db: DBSession = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    course_names = [e.course.name for e in student.enrollments if e.course]
    consents = [
        ConsentItem(
            id=c.id,
            consent_type=c.consent_type,
            granted=c.granted,
            timestamp=c.timestamp,
            revoked_at=c.revoked_at
        ) for c in student.consents
    ]

    history_items = []
    total_seconds = 0.0
    for a in student.attendance_records:
        total_seconds += a.observed_duration
        session_title = a.session.title if a.session else "Session"
        course_title = a.session.course.name if a.session and a.session.course else "Class"
        session_date = a.session.start_time if a.session and a.session.start_time else a.updated_at
        history_items.append(StudentAttendanceHistoryItem(
            session_id=a.session_id,
            session_title=session_title,
            course_name=course_title,
            session_date=session_date,
            status=a.status,
            observed_duration_minutes=round(a.observed_duration / 60.0, 1),
            confidence=a.confidence,
            manually_corrected=a.manually_corrected
        ))

    total_sessions = len(history_items)
    avg_minutes = round((total_seconds / max(1, total_sessions)) / 60.0, 1)

    resp = StudentDetailResponse(
        id=student.id,
        student_code=student.student_code,
        display_name=student.display_name,
        created_at=student.created_at,
        updated_at=student.updated_at,
        reference_image_path=student.reference_image_path,
        courses=course_names,
        consents=consents,
        attendance_rate=100.0,
        attendance_history=history_items,
        total_sessions_attended=sum(1 for h in history_items if h.status in ("present", "manually_confirmed")),
        average_observed_minutes=avg_minutes
    )
    return resp

@router.patch("/{student_id}", response_model=StudentResponse)
def update_student(student_id: str, payload: StudentUpdate, db: DBSession = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    if payload.student_code and payload.student_code != student.student_code:
        duplicate = db.query(Student).filter(
            Student.student_code == payload.student_code,
            Student.id != student_id
        ).first()
        if duplicate:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Student code already exists")
        student.student_code = payload.student_code.strip().upper()

    if payload.display_name:
        student.display_name = payload.display_name.strip()

    if payload.course_ids is not None:
        db.query(Enrollment).filter(Enrollment.student_id == student_id).delete()
        for cid in payload.course_ids:
            db.add(Enrollment(student_id=student.id, course_id=cid, status="enrolled"))

    student.updated_at = utc_now()
    db.commit()

    log_audit(db, "UPDATE_STUDENT", "Student", student.id, {"updated_fields": payload.model_dump(exclude_unset=True)})
    return get_student(student_id, db)

@router.post("/import", response_model=StudentImportResult)
async def import_students_csv(
    file: UploadFile = File(...),
    course_id: Optional[str] = Query(None),
    db: DBSession = Depends(get_db)
):
    """
    Imports students from CSV with columns: student_code, display_name
    Validates duplicate student IDs, malformed CSV rows, and returns row-level error reporting.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file must be a CSV")

    content = await file.read()
    try:
        decoded = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid UTF-8 encoding in CSV file")

    reader = csv.reader(io.StringIO(decoded))
    header = next(reader, None)
    if not header:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV file is empty")

    # Normalize headers
    headers_lower = [h.strip().lower().replace(" ", "_") for h in header]
    code_idx = -1
    name_idx = -1
    for idx, h in enumerate(headers_lower):
        if h in ("student_code", "student_id", "code", "id"):
            code_idx = idx
        elif h in ("display_name", "name", "student_name", "full_name"):
            name_idx = idx

    if code_idx == -1 or name_idx == -1:
        # Default to col 0 = code, col 1 = name if 2 columns
        if len(headers_lower) >= 2:
            code_idx, name_idx = 0, 1
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CSV must contain 'student_code' and 'display_name' columns"
            )

    success_count = 0
    errors = []
    row_num = 1

    for row in reader:
        row_num += 1
        if not row or all(c.strip() == "" for c in row):
            continue  # empty row

        if len(row) <= max(code_idx, name_idx):
            errors.append(StudentImportRowError(
                row_number=row_num,
                raw_data=",".join(row),
                error="Insufficient columns in row"
            ))
            continue

        raw_code = row[code_idx].strip().upper()
        raw_name = row[name_idx].strip()

        if not raw_code or not raw_name:
            errors.append(StudentImportRowError(
                row_number=row_num,
                raw_data=",".join(row),
                error="Student code and display name cannot be blank"
            ))
            continue

        # Check existing
        existing = db.query(Student).filter(Student.student_code == raw_code).first()
        if existing:
            errors.append(StudentImportRowError(
                row_number=row_num,
                raw_data=",".join(row),
                error=f"Duplicate student code '{raw_code}' already exists"
            ))
            continue

        stu = Student(
            student_code=raw_code,
            display_name=raw_name,
            created_at=utc_now(),
            updated_at=utc_now()
        )
        db.add(stu)
        db.flush()

        if course_id:
            db.add(Enrollment(student_id=stu.id, course_id=course_id, status="enrolled"))

        # Default consent records
        db.add(Consent(student_id=stu.id, consent_type="video_presence", granted=True, timestamp=utc_now()))
        db.add(Consent(student_id=stu.id, consent_type="audio_activity", granted=True, timestamp=utc_now()))

        success_count += 1

    db.commit()

    log_audit(db, "CSV_IMPORT_STUDENTS", "Student", None, {
        "successful": success_count,
        "failed": len(errors),
        "total": success_count + len(errors)
    })

    return StudentImportResult(
        total_processed=success_count + len(errors),
        successful_imports=success_count,
        failed_imports=len(errors),
        errors=errors
    )
