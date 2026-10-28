from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession
from typing import List
from backend.app.core.database import get_db
from backend.app.models.entities import Course, Enrollment, Session as CourseSession, utc_now
from backend.app.schemas.course import CourseCreate, CourseUpdate, CourseResponse
from backend.app.services.audit import log_audit

router = APIRouter(prefix="/courses", tags=["Courses"])

@router.get("", response_model=List[CourseResponse])
def list_courses(include_archived: bool = False, db: DBSession = Depends(get_db)):
    query = db.query(Course)
    if not include_archived:
        query = query.filter(Course.is_archived == False)
    courses = query.order_by(Course.created_at.desc()).all()

    result = []
    for c in courses:
        enrolled_count = db.query(Enrollment).filter(Enrollment.course_id == c.id).count()
        active_sessions = db.query(CourseSession).filter(
            CourseSession.course_id == c.id,
            CourseSession.status.in_(["ready", "running", "paused", "processing"])
        ).count()
        c_dict = CourseResponse.model_validate(c)
        c_dict.enrolled_count = enrolled_count
        c_dict.active_sessions_count = active_sessions
        result.append(c_dict)

    return result

@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(payload: CourseCreate, db: DBSession = Depends(get_db)):
    existing = db.query(Course).filter(Course.course_code == payload.course_code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Course code '{payload.course_code}' already exists"
        )

    course = Course(
        course_code=payload.course_code.strip().upper(),
        name=payload.name.strip(),
        teacher_id=payload.teacher_id,
        created_at=utc_now()
    )
    db.add(course)
    db.commit()
    db.refresh(course)

    log_audit(db, "CREATE_COURSE", "Course", course.id, {"course_code": course.course_code})

    resp = CourseResponse.model_validate(course)
    resp.enrolled_count = 0
    resp.active_sessions_count = 0
    return resp

@router.get("/{course_id}", response_model=CourseResponse)
def get_course(course_id: str, db: DBSession = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    enrolled = db.query(Enrollment).filter(Enrollment.course_id == course.id).count()
    active_sessions = db.query(CourseSession).filter(
        CourseSession.course_id == course.id,
        CourseSession.status.in_(["ready", "running", "paused", "processing"])
    ).count()

    resp = CourseResponse.model_validate(course)
    resp.enrolled_count = enrolled
    resp.active_sessions_count = active_sessions
    return resp

@router.patch("/{course_id}", response_model=CourseResponse)
def update_course(course_id: str, payload: CourseUpdate, db: DBSession = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    if payload.course_code and payload.course_code != course.course_code:
        duplicate = db.query(Course).filter(
            Course.course_code == payload.course_code,
            Course.id != course_id
        ).first()
        if duplicate:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Course code already in use")
        course.course_code = payload.course_code.strip().upper()

    if payload.name:
        course.name = payload.name.strip()
    if payload.is_archived is not None:
        course.is_archived = payload.is_archived

    db.commit()
    db.refresh(course)

    log_audit(db, "UPDATE_COURSE", "Course", course.id, {"updated_fields": payload.model_dump(exclude_unset=True)})
    return get_course(course_id, db)

@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(course_id: str, db: DBSession = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    log_audit(db, "DELETE_COURSE", "Course", course.id, {"course_code": course.course_code})
    db.delete(course)
    db.commit()
    return None
