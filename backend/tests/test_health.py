import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["offline_ready"] is True
    assert "version" in data

def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["offline_mode"] is True
    assert data["database"] == "sqlite"

def test_capabilities():
    response = client.get("/api/capabilities" if False else "/api/health/capabilities")
    assert response.status_code == 200
    data = response.json()
    assert data["computer_vision_available"] is True
    assert data["audio_vad_available"] is True
    assert data["offline_ready"] is True
