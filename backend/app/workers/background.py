import os
import cv2
import threading
import time
from typing import Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from backend.app.core.database import SessionLocal
from backend.app.models.entities import Session, AttendanceRecord, EngagementMetric, Recommendation, utc_now
from backend.app.vision.detector import VisionDetector
from backend.app.vision.tracker import CentroidTracker
from backend.app.analytics.engine import EngagementAnalyticsEngine
from backend.app.recommendations.rules import TeachingRecommendationEngine

# In-memory dictionary tracking background jobs by session_id
processing_jobs: Dict[str, Dict[str, Any]] = {}

def get_job_status(session_id: str) -> Optional[Dict[str, Any]]:
    return processing_jobs.get(session_id)

def process_video_file_task(session_id: str, video_path: str):
    """
    Background worker thread processing uploaded video file:
    - Decodes frames using OpenCV
    - Runs person detection & tracking
    - Computes movement intensity & participant counts
    - Updates progress for polling
    - Writes AttendanceRecords, EngagementMetrics, and Recommendations to SQLite
    """
    job = {
        "session_id": session_id,
        "status": "processing",
        "progress_percentage": 5.0,
        "current_step": "Opening video stream",
        "processed_frames": 0,
        "total_frames": 1,
        "detected_participants": 0,
        "audio_segments_detected": 0,
        "is_complete": False,
        "error_message": None
    }
    processing_jobs[session_id] = job

    db = SessionLocal()
    try:
        session_obj = db.query(Session).filter(Session.id == session_id).first()
        if not session_obj:
            job["status"] = "failed"
            job["error_message"] = "Session record not found"
            return

        session_obj.status = "processing"
        db.commit()

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            job["status"] = "failed"
            job["error_message"] = "Unable to open video file codec"
            session_obj.status = "failed"
            db.commit()
            return

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        job["total_frames"] = total_frames
        job["current_step"] = "Analyzing video frames"

        detector = VisionDetector()
        tracker = CentroidTracker(min_observation_seconds=10.0)

        # Sample every 1.0 second of video
        sample_step = max(1, int(fps * 1.0))
        frame_idx = 0
        prev_gray = None

        timeline_points = []
        start_time = session_obj.start_time or utc_now()

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % sample_step == 0:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                detections = detector.detect_participants(frame)
                current_time = start_time + timedelta(seconds=(frame_idx / fps))
                
                # Update tracker
                active_tracks = tracker.update(detections, timestamp=current_time, frame_interval_seconds=1.0)
                
                # Movement calculation
                movement = detector.calculate_movement_intensity(prev_gray, gray)
                prev_gray = gray

                # Participant count
                p_count = len(active_tracks)
                job["detected_participants"] = max(job["detected_participants"], p_count)

                # Collect metrics every 30 video seconds
                interval_secs = frame_idx / fps
                if interval_secs > 0 and int(interval_secs) % 30 == 0:
                    participation = min(100.0, max(20.0, p_count * 15.0 + 30.0))
                    timeline_points.append({
                        "timestamp": current_time,
                        "time_label": f"+{int(interval_secs // 60)}m",
                        "participation_activity": participation,
                        "movement_intensity": movement,
                        "participant_count": p_count
                    })

                progress = min(90.0, (frame_idx / max(1, total_frames)) * 85.0 + 5.0)
                job["progress_percentage"] = round(progress, 1)
                job["processed_frames"] = frame_idx

            frame_idx += 1

        cap.release()

        job["current_step"] = "Generating attendance and engagement metrics"
        job["progress_percentage"] = 92.0

        # Save Attendance Records
        records = tracker.get_all_records()
        for trk in records:
            status = "present" if trk.total_observed_seconds >= 10.0 else "unverified"
            att = AttendanceRecord(
                session_id=session_id,
                anonymous_track_id=trk.track_id,
                first_seen=trk.first_seen,
                last_seen=trk.last_seen,
                observed_duration=round(trk.total_observed_seconds, 1),
                status=status,
                source="automated_vision",
                confidence=round(trk.confidence, 2)
            )
            db.add(att)

        # Save Metrics
        for pt in timeline_points:
            comp = EngagementAnalyticsEngine.calculate_composite_score(
                participation_val=pt["participation_activity"],
                movement_val=pt["movement_intensity"],
                head_val=75.0,  # frontal visibility proxy
                audio_val=None  # video-only input
            )
            metric_entry = EngagementMetric(
                session_id=session_id,
                interval_start=pt["timestamp"],
                interval_end=pt["timestamp"] + timedelta(seconds=30),
                metric_name="composite_engagement",
                metric_value=comp["composite_score"],
                confidence=comp["confidence"],
                source_modality="video",
                metadata_json=str(comp)
            )
            db.add(metric_entry)

        # Run recommendations
        duration_mins = (frame_idx / fps) / 60.0
        recs = TeachingRecommendationEngine.evaluate_session_telemetry(
            session_id=session_id,
            timeline_metrics=timeline_points,
            session_duration_minutes=duration_mins,
            available_modalities=["video"]
        )
        for r in recs:
            rec_entry = Recommendation(
                session_id=session_id,
                title=r["title"],
                explanation=r["explanation"],
                evidence_json=str(r["evidence"]),
                suggested_action=r["suggested_action"],
                confidence=r["confidence"],
                status="active"
            )
            db.add(rec_entry)

        session_obj.status = "completed"
        session_obj.end_time = start_time + timedelta(seconds=(frame_idx / fps))
        db.commit()

        job["progress_percentage"] = 100.0
        job["current_step"] = "Processing complete"
        job["is_complete"] = True
        job["status"] = "completed"

    except Exception as e:
        db.rollback()
        job["status"] = "failed"
        job["error_message"] = str(e)
        if session_obj:
            session_obj.status = "failed"
            db.commit()
    finally:
        db.close()

def start_video_processing(session_id: str, video_path: str):
    thread = threading.Thread(
        target=process_video_file_task,
        args=(session_id, video_path),
        daemon=True
    )
    thread.start()
