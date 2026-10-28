import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_reports_generation():
    sessions = client.get("/api/sessions").json()
    ses_id = sessions[0]["id"]

    # CSV report
    csv_res = client.get(f"/api/reports/sessions/{ses_id}/csv")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "MULTIMODAL ATTENDANCE & ENGAGEMENT AGENT" in csv_res.text

    # PDF report
    pdf_res = client.get(f"/api/reports/sessions/{ses_id}/pdf")
    assert pdf_res.status_code == 200
    assert "application/pdf" in pdf_res.headers["content-type"]
    assert pdf_res.content.startswith(b"%PDF")

def test_privacy_settings_and_deletion():
    # Get privacy settings
    get_res = client.get("/api/privacy/settings")
    assert get_res.status_code == 200
    settings = get_res.json()
    assert settings["local_storage_only"] is True

    # Update settings
    upd_res = client.patch("/api/privacy/settings", json={"retention_period_days": 60})
    assert upd_res.status_code == 200
    assert upd_res.json()["retention_period_days"] == 60

    # Purge without confirmation must fail
    fail_purge = client.post("/api/privacy/delete-session-data", json={"confirm_purge": False})
    assert fail_purge.status_code == 400

    # Purge with confirmation
    sessions = client.get("/api/sessions").json()
    last_ses_id = sessions[-1]["id"]
    purge_res = client.post("/api/privacy/delete-session-data", json={
        "session_id": last_ses_id,
        "confirm_purge": True
    })
    assert purge_res.status_code == 200
    data = purge_res.json()
    assert data["success"] is True
    assert data["deleted_sessions"] == 1
