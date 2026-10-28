import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.analytics.engine import EngagementAnalyticsEngine
from backend.app.recommendations.rules import TeachingRecommendationEngine

client = TestClient(app)

def test_engine_weight_renormalization():
    # Case 1: All modalities present
    res = EngagementAnalyticsEngine.calculate_composite_score(
        participation_val=80.0,
        movement_val=60.0,
        head_val=70.0,
        audio_val=50.0
    )
    assert res["data_quality"] == "High"
    assert len(res["available_modalities"]) == 4
    # Expected: 80*0.35 + 60*0.25 + 70*0.20 + 50*0.20 = 28 + 15 + 14 + 10 = 67.0
    assert abs(res["composite_score"] - 67.0) < 0.5

    # Case 2: Audio missing -> renormalize over 0.8
    res_no_audio = EngagementAnalyticsEngine.calculate_composite_score(
        participation_val=80.0,
        movement_val=60.0,
        head_val=70.0,
        audio_val=None
    )
    assert "audio_activity" in res_no_audio["missing_modalities"]
    # Total available weight = 0.35+0.25+0.20 = 0.80
    # Renormalized: 80*(0.35/0.8) + 60*(0.25/0.8) + 70*(0.20/0.8) = 35 + 18.75 + 17.5 = 71.25
    assert abs(res_no_audio["composite_score"] - 71.25) < 0.5

def test_recommendation_rules():
    # Sudden drop in participation
    timeline = [
        {"participation_activity": 85.0, "time_label": "+0m"},
        {"participation_activity": 80.0, "time_label": "+5m"},
        {"participation_activity": 50.0, "time_label": "+10m"}
    ]
    recs = TeachingRecommendationEngine.evaluate_session_telemetry(
        session_id="dummy",
        timeline_metrics=timeline,
        session_duration_minutes=15.0,
        available_modalities=["video", "audio"]
    )
    assert any("Recent Drop in Collective Participation" in r["title"] for r in recs)

def test_overview_and_session_analytics_api():
    overview_res = client.get("/api/analytics/overview")
    assert overview_res.status_code == 200
    ov = overview_res.json()
    assert ov["total_enrolled_students"] >= 12
    assert "average_engagement_score" in ov
    assert len(ov["recent_sessions"]) > 0

    sessions = client.get("/api/sessions").json()
    ses_id = sessions[0]["id"]
    sess_res = client.get(f"/api/analytics/sessions/{ses_id}")
    assert sess_res.status_code == 200
    ana = sess_res.json()
    assert "overall_engagement_score" in ana
    assert "timeline" in ana
    assert "modality_breakdown" in ana
    assert "limitations_disclaimer" in ana
