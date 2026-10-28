import random
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session as DBSession
from backend.app.models.entities import (
    User, Course, Student, Enrollment, Consent, Session,
    AttendanceRecord, EngagementMetric, Recommendation, AuditLog, utc_now
)
from backend.app.analytics.engine import EngagementAnalyticsEngine
from backend.app.recommendations.rules import TeachingRecommendationEngine

def seed_demo_database(db: DBSession, force_reset: bool = False):
    """
    Seeds comprehensive deterministic demo data for immediate testing and evaluation.
    """
    if force_reset:
        db.query(AuditLog).delete()
        db.query(Recommendation).delete()
        db.query(EngagementMetric).delete()
        db.query(AttendanceRecord).delete()
        db.query(Session).delete()
        db.query(Consent).delete()
        db.query(Enrollment).delete()
        db.query(Student).delete()
        db.query(Course).delete()
        db.query(User).delete()
        db.commit()

    # Check if already seeded
    existing_course = db.query(Course).filter(Course.course_code == "CS-301").first()
    if existing_course and not force_reset:
        return {"status": "already_seeded", "message": "Demo data already exists"}

    random.seed(42)  # Deterministic seed for reproducible data

    # 1. Create Instructor
    instructor = User(
        id="usr-teacher-01",
        display_name="Prof. Eleanor Vance",
        email="eleanor.vance@university.local",
        role="teacher",
        created_at=utc_now() - timedelta(days=60)
    )
    db.add(instructor)
    db.flush()

    # 2. Create Courses
    course_hci = Course(
        id="crs-hci-301",
        course_code="CS-301",
        name="Human-Computer Interaction & Multimodal Systems",
        teacher_id=instructor.id,
        is_archived=False,
        created_at=utc_now() - timedelta(days=45)
    )
    course_ai = Course(
        id="crs-ai-402",
        course_code="DATA-402",
        name="Applied Machine Learning & Computer Vision",
        teacher_id=instructor.id,
        is_archived=False,
        created_at=utc_now() - timedelta(days=40)
    )
    db.add_all([course_hci, course_ai])
    db.flush()

    # 3. Create Fictional Roster of 15 Students
    student_names = [
        ("STU-101", "Amara Chen"),
        ("STU-102", "Marcus Sterling"),
        ("STU-103", "Elena Rostova"),
        ("STU-104", "David Kim"),
        ("STU-105", "Zainab Al-Mansoor"),
        ("STU-106", "Lucas Bennett"),
        ("STU-107", "Priya Sharma"),
        ("STU-108", "Kaito Tanaka"),
        ("STU-109", "Sophia Rodriguez"),
        ("STU-110", "Jordan Taylor"),
        ("STU-111", "Fatima Zahra"),
        ("STU-112", "Liam O'Connor"),
        ("STU-113", "Ananya Iyer"),
        ("STU-114", "Noah Williams"),
        ("STU-115", "Chloe Dubois")
    ]

    students = []
    for code, name in student_names:
        stu = Student(
            id=f"stu-{code.lower()}",
            student_code=code,
            display_name=name,
            created_at=utc_now() - timedelta(days=30),
            updated_at=utc_now() - timedelta(days=30)
        )
        students.append(stu)
        db.add(stu)
    db.flush()

    # Enrollments & Consents
    for stu in students:
        # Enroll in CS-301
        enr_hci = Enrollment(student_id=stu.id, course_id=course_hci.id, status="enrolled")
        db.add(enr_hci)
        # Randomly enroll some in DATA-402
        if random.random() > 0.35:
            enr_ai = Enrollment(student_id=stu.id, course_id=course_ai.id, status="enrolled")
            db.add(enr_ai)

        # Consents
        c_video = Consent(
            student_id=stu.id,
            consent_type="video_presence",
            granted=True,
            timestamp=utc_now() - timedelta(days=28)
        )
        c_audio = Consent(
            student_id=stu.id,
            consent_type="audio_activity",
            granted=True,
            timestamp=utc_now() - timedelta(days=28)
        )
        db.add_all([c_video, c_audio])
    db.flush()

    # 4. Create Historical Sessions
    historical_sessions_config = [
        ("ses-demo-01", "Lecture 1: Introduction to Multimodal Interfaces", course_hci.id, 7, 50, 84.5),
        ("ses-demo-02", "Lecture 2: Computer Vision in Interactive Spaces", course_hci.id, 5, 55, 76.2),
        ("ses-demo-03", "Workshop: Voice Activity and Acoustic Indicators", course_hci.id, 2, 60, 88.0),
        ("ses-demo-04", "Review: Sensor Fusion & Privacy Guarantees", course_hci.id, 1, 45, 81.4)
    ]

    for ses_id, title, course_id, days_ago, duration_mins, target_engagement in historical_sessions_config:
        start_dt = utc_now() - timedelta(days=days_ago, hours=10)
        end_dt = start_dt + timedelta(minutes=duration_mins)

        ses = Session(
            id=ses_id,
            course_id=course_id,
            title=title,
            teacher_name="Prof. Eleanor Vance",
            subject="Interactive Systems",
            planned_duration_minutes=duration_mins,
            start_time=start_dt,
            end_time=end_dt,
            status="completed",
            input_mode="simulated",
            configuration_json='{"enable_cv_tracking": true, "enable_vad_audio": true, "min_observation_seconds": 45}',
            created_at=start_dt - timedelta(hours=1)
        )
        db.add(ses)
        db.flush()

        # Generate Attendance Records for this session
        for i, stu in enumerate(students):
            # Deterministic status
            if i == 0 and days_ago == 5:
                status = "late"
                observed = duration_mins * 60 * 0.7
                first_seen = start_dt + timedelta(minutes=15)
            elif i == 1 and days_ago == 2:
                status = "left_early"
                observed = duration_mins * 60 * 0.6
                first_seen = start_dt
            elif i == 14 and days_ago in (2, 7):
                status = "absent"
                observed = 0.0
                first_seen = None
            else:
                status = "present"
                observed = duration_mins * 60 * (0.88 + random.uniform(0.01, 0.1))
                first_seen = start_dt + timedelta(minutes=random.randint(0, 4))

            last_seen = (first_seen + timedelta(seconds=observed)) if first_seen else None

            att_rec = AttendanceRecord(
                session_id=ses.id,
                student_id=stu.id,
                anonymous_track_id=f"TRK-{(i+1):03d}",
                first_seen=first_seen,
                last_seen=last_seen,
                observed_duration=round(observed, 1),
                status=status,
                source="simulated",
                manually_corrected=False,
                confidence=0.92
            )
            db.add(att_rec)

        # Generate 5-minute interval Engagement Metrics
        intervals_count = duration_mins // 5
        timeline_history = []
        for step in range(intervals_count):
            interval_st = start_dt + timedelta(minutes=step * 5)
            interval_en = interval_st + timedelta(minutes=5)
            time_lbl = f"+{step * 5}m"

            # Realistic trajectory: dips in the middle, peaks during questions
            progress_ratio = step / max(1, intervals_count)
            base_curve = math_engagement_curve(progress_ratio)

            part_val = min(100.0, max(20.0, base_curve * 85.0 + random.uniform(-6, 6)))
            move_val = min(100.0, max(15.0, base_curve * 70.0 + random.uniform(-8, 8)))
            head_val = min(100.0, max(40.0, base_curve * 90.0 + random.uniform(-5, 5)))
            audio_val = min(100.0, max(10.0, (1.0 - progress_ratio * 0.4) * 60.0 + random.uniform(-10, 10)))

            comp = EngagementAnalyticsEngine.calculate_composite_score(
                participation_val=part_val,
                movement_val=move_val,
                head_val=head_val,
                audio_val=audio_val
            )

            metric_row = EngagementMetric(
                session_id=ses.id,
                interval_start=interval_st,
                interval_end=interval_en,
                metric_name="composite_engagement",
                metric_value=comp["composite_score"],
                confidence=0.91,
                source_modality="multimodal",
                metadata_json=str({
                    "time_label": time_lbl,
                    "participation_activity": part_val,
                    "movement_intensity": move_val,
                    "head_orientation": head_val,
                    "audio_activity": audio_val,
                    "participant_count": len(students) - (1 if days_ago in (2, 7) else 0)
                })
            )
            db.add(metric_row)

            timeline_history.append({
                "timestamp": interval_st,
                "time_label": time_lbl,
                "participation_activity": part_val,
                "movement_intensity": move_val,
                "head_orientation": head_val,
                "audio_activity": audio_val,
                "participant_count": len(students) - (1 if days_ago in (2, 7) else 0)
            })

        # Generate rule-based recommendations for historical sessions
        recs = TeachingRecommendationEngine.evaluate_session_telemetry(
            session_id=ses.id,
            timeline_metrics=timeline_history,
            session_duration_minutes=duration_mins,
            available_modalities=["video", "audio"]
        )
        for r in recs:
            rec_db = Recommendation(
                session_id=ses.id,
                title=r["title"],
                explanation=r["explanation"],
                evidence_json=str(r["evidence"]),
                suggested_action=r["suggested_action"],
                confidence=r["confidence"],
                status="accepted" if random.random() > 0.4 else "active"
            )
            db.add(rec_db)

    # 5. Create an Active/Draft Session Ready to Run
    active_ses = Session(
        id="ses-live-demo",
        course_id=course_hci.id,
        title="Live Demonstration: Multimodal Activity & Attendance",
        teacher_name="Prof. Eleanor Vance",
        subject="Demonstration Lab",
        planned_duration_minutes=45,
        start_time=utc_now() - timedelta(minutes=18),
        status="running",
        input_mode="simulated",
        configuration_json='{"enable_cv_tracking": true, "enable_vad_audio": true, "min_observation_seconds": 30}',
        created_at=utc_now() - timedelta(minutes=25)
    )
    db.add(active_ses)
    db.flush()

    # Add current active attendance records
    for i, stu in enumerate(students):
        status = "present" if i < 13 else "unverified"
        observed = 18 * 60 if status == "present" else 20
        att = AttendanceRecord(
            session_id=active_ses.id,
            student_id=stu.id,
            anonymous_track_id=f"TRK-{(i+1):03d}",
            first_seen=active_ses.start_time,
            last_seen=utc_now(),
            observed_duration=observed,
            status=status,
            source="simulated",
            manually_corrected=False,
            confidence=0.94
        )
        db.add(att)

    # Add active session metrics for last 18 minutes
    live_timeline = []
    for m in range(0, 19, 3):
        t_st = active_ses.start_time + timedelta(minutes=m)
        part = 78.0 + (5.0 if m < 10 else -12.0)
        move = 64.0 + random.uniform(-4, 4)
        aud = 55.0 + random.uniform(-6, 6)
        comp = EngagementAnalyticsEngine.calculate_composite_score(part, move, 80.0, aud)

        db.add(EngagementMetric(
            session_id=active_ses.id,
            interval_start=t_st,
            interval_end=t_st + timedelta(minutes=3),
            metric_name="composite_engagement",
            metric_value=comp["composite_score"],
            confidence=0.92,
            source_modality="multimodal",
            metadata_json=str({
                "time_label": f"+{m}m",
                "participation_activity": part,
                "movement_intensity": move,
                "head_orientation": 80.0,
                "audio_activity": aud,
                "participant_count": 13
            })
        ))
        live_timeline.append({
            "timestamp": t_st,
            "time_label": f"+{m}m",
            "participation_activity": part,
            "movement_intensity": move,
            "head_orientation": 80.0,
            "audio_activity": aud,
            "participant_count": 13
        })

    live_recs = TeachingRecommendationEngine.evaluate_session_telemetry(
        session_id=active_ses.id,
        timeline_metrics=live_timeline,
        session_duration_minutes=18.0,
        available_modalities=["video", "audio"]
    )
    for r in live_recs:
        db.add(Recommendation(
            session_id=active_ses.id,
            title=r["title"],
            explanation=r["explanation"],
            evidence_json=str(r["evidence"]),
            suggested_action=r["suggested_action"],
            confidence=r["confidence"],
            status="active"
        ))

    # Audit log
    db.add(AuditLog(
        user_id=instructor.id,
        action="SEED_DEMO_DATA",
        entity_type="SYSTEM",
        entity_id="ALL",
        timestamp=utc_now(),
        details_json='{"students_created": 15, "courses_created": 2, "sessions_created": 5}'
    ))

    db.commit()
    return {
        "status": "success",
        "message": "Demo data successfully seeded with 15 students, 2 courses, 4 historical sessions and 1 active session."
    }

def math_engagement_curve(x: float) -> float:
    """Produces a natural classroom engagement curve (high initial, mid dip, recovery at conclusion)"""
    return 0.85 - 0.25 * (4 * (x - 0.5) ** 2)
