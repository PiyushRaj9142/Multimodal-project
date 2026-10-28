from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession
from sqlalchemy import text
from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.schemas.common import HealthResponse, CapabilitiesResponse
from backend.app.vision.detector import VisionDetector
from backend.app.models.entities import utc_now

router = APIRouter(prefix="/health", tags=["Health & Capabilities"])

@router.get("", response_model=HealthResponse)
def get_health(db: DBSession = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return HealthResponse(
        status="healthy",
        version=settings.VERSION,
        offline_mode=True,
        timestamp=utc_now(),
        database="sqlite"
    )

@router.get("/capabilities", response_model=CapabilitiesResponse)
def get_capabilities():
    detector = VisionDetector()
    return CapabilitiesResponse(
        computer_vision_available=detector.is_available,
        cv_backend="OpenCV Haar + HOG Detector",
        audio_vad_available=True,
        audio_backend="Local Deterministic RMS & ZCR VAD",
        offline_ready=True,
        local_storage=True,
        pdf_export_available=True,
        notes=[
            "Zero cloud API keys required",
            "Local SQLite database with foreign keys & WAL journaling enabled",
            "All video frames processed locally and discarded after telemetry computation"
        ]
    )
