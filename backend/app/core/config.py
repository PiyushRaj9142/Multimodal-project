import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR.parent / "data"

class Settings(BaseSettings):
    PROJECT_NAME: str = "Multimodal Attendance & Engagement Agent"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"
    
    # Storage paths
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR}/attendance_agent.db")
    UPLOAD_DIR: Path = DATA_DIR / "uploads"
    REPORTS_DIR: Path = DATA_DIR / "reports"
    DEMO_DIR: Path = DATA_DIR / "demo"
    
    # Operational configuration
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000", "*"]
    
    # Offline capabilities flags
    ENABLE_CV: bool = True
    ENABLE_AUDIO: bool = True
    
    # Thresholds
    MIN_OBSERVATION_DURATION_SECONDS: int = 45  # Minimum observation time to mark Present
    LATE_ARRIVAL_MINUTES: int = 10
    
    # Engagement weights (initial defaults, normalized on available signals)
    WEIGHT_PARTICIPATION: float = 0.35
    WEIGHT_MOVEMENT: float = 0.25
    WEIGHT_HEAD_ORIENTATION: float = 0.20
    WEIGHT_AUDIO_ACTIVITY: float = 0.20

    class Config:
        case_sensitive = True

settings = Settings()

# Ensure directories exist
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.REPORTS_DIR.mkdir(parents=True, exist_ok=True)
settings.DEMO_DIR.mkdir(parents=True, exist_ok=True)
