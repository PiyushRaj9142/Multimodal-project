from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class RecommendationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str
    title: str
    explanation: str
    evidence_json: str
    suggested_action: str
    confidence: float
    status: str  # active, accepted, dismissed, completed
    created_at: datetime
    evidence_dict: Optional[Dict[str, Any]] = None

class RecommendationActionRequest(BaseModel):
    status: str = Field(..., pattern="^(accepted|dismissed|completed)$")
