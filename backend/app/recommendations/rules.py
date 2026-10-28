import json
from typing import List, Dict, Any
from datetime import datetime, timezone
from backend.app.models.entities import Recommendation, utc_now

class TeachingRecommendationEngine:
    """
    Deterministic rule-based pedagogical assistant.
    Generates actionable, non-punitive suggestions based solely on verifiable sensor telemetry.
    """

    @classmethod
    def evaluate_session_telemetry(
        cls,
        session_id: str,
        timeline_metrics: List[Dict[str, Any]],
        session_duration_minutes: float,
        available_modalities: List[str]
    ) -> List[Dict[str, Any]]:
        recommendations = []

        if not timeline_metrics:
            return recommendations

        # 1. Pacing & Prolonged Lecture Rule (> 30 mins with minimal participation shifts)
        if session_duration_minutes >= 30.0:
            recent_points = timeline_metrics[-6:] if len(timeline_metrics) >= 6 else timeline_metrics
            avg_participation = sum(p.get("participation_activity", 50.0) for p in recent_points) / len(recent_points)
            if avg_participation < 40.0:
                recommendations.append({
                    "title": "Continuous Lecture Window Detected",
                    "explanation": (
                        f"The session has maintained a lecture format for over {int(session_duration_minutes)} minutes "
                        "with steady, low interactive participation."
                    ),
                    "evidence": {
                        "metric": "participation_activity",
                        "average_value": round(avg_participation, 1),
                        "duration_minutes": session_duration_minutes,
                        "window": "Recent 20 minutes"
                    },
                    "suggested_action": "Consider introducing a brief 2-minute 'Think-Pair-Share' or asking an open-ended discussion question.",
                    "confidence": 0.88
                })

        # 2. Sudden Decline in Interaction Rule
        if len(timeline_metrics) >= 3:
            prev_window = timeline_metrics[-3]
            curr_window = timeline_metrics[-1]
            diff = curr_window.get("participation_activity", 0.0) - prev_window.get("participation_activity", 0.0)
            if diff <= -25.0:
                recommendations.append({
                    "title": "Recent Drop in Collective Participation",
                    "explanation": (
                        "Interactive activity decreased significantly over the last 10 minutes. "
                        "This frequently indicates cognitive fatigue, difficult material, or a topic transition."
                    ),
                    "evidence": {
                        "metric": "participation_delta",
                        "delta_value": round(diff, 1),
                        "prior_value": round(prev_window.get("participation_activity", 0.0), 1),
                        "current_value": round(curr_window.get("participation_activity", 0.0), 1)
                    },
                    "suggested_action": "Pause for a quick comprehension poll or solicit clarifying questions on the previous slide.",
                    "confidence": 0.84
                })

        # 3. Audio Activity Context Rule (High or Low)
        if "audio" in available_modalities or "audio_activity" in available_modalities:
            recent_audio = [p.get("audio_activity", 0.0) for p in timeline_metrics if p.get("audio_activity") is not None]
            if recent_audio:
                avg_audio = sum(recent_audio) / len(recent_audio)
                if avg_audio < 15.0 and session_duration_minutes > 15.0:
                    recommendations.append({
                        "title": "Quiet Study / Low Vocal Activity",
                        "explanation": (
                            "Vocal activity is currently low. While this often corresponds to focused individual reading "
                            "or quiet problem solving, verify whether verbal input is expected at this stage."
                        ),
                        "evidence": {
                            "metric": "audio_activity_ratio",
                            "average_vocal_percent": round(avg_audio, 1)
                        },
                        "suggested_action": "If this is intended as quiet solo work, no action is needed. If you expected discussion, invite volunteer group leads to share.",
                        "confidence": 0.79
                    })

        # 4. Sensor Coverage / Data Completeness Rule
        if len(available_modalities) <= 1:
            recommendations.append({
                "title": "Limited Modality Signal Coverage",
                "explanation": (
                    "Only a single sensor modality (or simulated baseline) is active. "
                    "Multimodal fusion is most reliable when both visual presence and room audio are available."
                ),
                "evidence": {
                    "available_modalities": available_modalities,
                    "missing_modalities": [m for m in ["video", "audio"] if m not in available_modalities]
                },
                "suggested_action": "Check microphone input and camera field of view to ensure optimal classroom coverage.",
                "confidence": 0.95
            })

        return recommendations
