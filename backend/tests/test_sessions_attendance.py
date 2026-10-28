import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_session_lifecycle():
    # 1. Get course id
    courses = client.get("/api/courses").json()
    course_id = courses[0]["id"]

    # 2. Create session
    create_res = client.post("/api/sessions", json={
        "course_id": course_id,
        "title": "Unit Test Session",
        "teacher_name": "Dr. Testing",
        "planned_duration_minutes": 45,
        "input_mode": "simulated"
    })
    assert create_res.status_code == 201
    session_id = create_res.json()["id"]
    assert create_res.json()["status"] == "ready"

    # 3. Start session
    start_res = client.post(f"/api/sessions/{session_id}/start")
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "running"

    # 4. Pause session
    pause_res = client.post(f"/api/sessions/{session_id}/pause")
    assert pause_res.status_code == 200
    assert pause_res.json()["status"] == "paused"

    # 5. Resume session
    resume_res = client.post(f"/api/sessions/{session_id}/resume")
    assert resume_res.status_code == 200
    assert resume_res.json()["status"] == "running"

    # 6. Stop session
    stop_res = client.post(f"/api/sessions/{session_id}/stop")
    assert stop_res.status_code == 200
    assert stop_res.json()["status"] == "completed"

def test_attendance_correction_audit():
    # Check historical session attendance
    sessions = client.get("/api/sessions").json()
    # Find a session with attendance records
    target_session = next((s for s in sessions if s.get("present_count", 0) > 0), sessions[0])
    session_id = target_session["id"]

    att_res = client.get(f"/api/sessions/{session_id}/attendance")
    assert att_res.status_code == 200
    records = att_res.json()
    assert len(records) > 0

    target_rec = records[0]
    rec_id = target_rec["id"]

    # Correct attendance
    corr_res = client.patch(f"/api/sessions/{session_id}/attendance/correction", json={
        "record_id": rec_id,
        "status": "manually_confirmed",
        "notes": "Verified by instructor in-person note"
    })
    assert corr_res.status_code == 200
    updated = corr_res.json()
    assert updated["status"] == "manually_confirmed"
    assert updated["manually_corrected"] is True
    assert "Verified by instructor" in updated["notes"]

    # Verify audit log recorded this
    audit_res = client.get("/api/audit-logs")
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert any(l["action"] == "CORRECT_ATTENDANCE" and l["entity_id"] == rec_id for l in logs)
