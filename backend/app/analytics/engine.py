from typing import Dict, Any, List, Optional
import math
from datetime import datetime

class EngagementAnalyticsEngine:
    DEFAULT_WEIGHTS = {
        "participation": 0.35,
        "movement": 0.25,
        "head_orientation": 0.20,
        "audio_activity": 0.20,
    }

    LIMITATIONS_DISCLAIMER = (
        "Behavioral indicators are non-invasive proxies of physical activity and presence. "
        "They do not measure comprehension, intellectual engagement, or academic learning. "
        "Low movement or silence frequently occurs during focused reading, note-taking, or listening."
    )

    @classmethod
    def calculate_composite_score(
        cls,
        participation_val: Optional[float],
        movement_val: Optional[float],
        head_val: Optional[float],
        audio_val: Optional[float],
        custom_weights: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Calculates an explainable composite score by renormalizing over available modalities.
        """
        weights = dict(cls.DEFAULT_WEIGHTS)
        if custom_weights:
            weights.update(custom_weights)

        available_signals = {}
        active_weights = {}

        if participation_val is not None:
            available_signals["participation"] = float(min(100.0, max(0.0, participation_val)))
            active_weights["participation"] = weights.get("participation", 0.35)

        if movement_val is not None:
            available_signals["movement"] = float(min(100.0, max(0.0, movement_val)))
            active_weights["movement"] = weights.get("movement", 0.25)

        if head_val is not None:
            available_signals["head_orientation"] = float(min(100.0, max(0.0, head_val)))
            active_weights["head_orientation"] = weights.get("head_orientation", 0.20)

        if audio_val is not None:
            available_signals["audio_activity"] = float(min(100.0, max(0.0, audio_val)))
            active_weights["audio_activity"] = weights.get("audio_activity", 0.20)

        total_weight = sum(active_weights.values())

        if total_weight <= 0.0 or len(available_signals) == 0:
            return {
                "composite_score": 0.0,
                "data_quality": "Insufficient data",
                "available_modalities": [],
                "missing_modalities": ["video", "audio"],
                "contributions": [],
                "confidence": 0.0
            }

        # Renormalize weights
        composite = 0.0
        contributions = []
        for signal_name, raw_score in available_signals.items():
            renormalized_weight = active_weights[signal_name] / total_weight
            contrib = raw_score * renormalized_weight
            composite += contrib
            contributions.append({
                "modality": signal_name,
                "weight": round(renormalized_weight, 3),
                "contribution_score": round(contrib, 2),
                "raw_score": round(raw_score, 2),
                "is_active": True
            })

        # Track missing modalities
        all_modalities = set(weights.keys())
        missing = list(all_modalities - set(available_signals.keys()))

        # Determine data quality
        if len(available_signals) >= 3 and total_weight >= 0.7:
            data_quality = "High"
            confidence = 0.92
        elif len(available_signals) >= 2:
            data_quality = "Moderate"
            confidence = 0.78
        else:
            data_quality = "Limited"
            confidence = 0.55

        return {
            "composite_score": round(composite, 1),
            "data_quality": data_quality,
            "available_modalities": list(available_signals.keys()),
            "missing_modalities": missing,
            "contributions": contributions,
            "confidence": confidence
        }

    @classmethod
    def generate_timeline_insights(cls, timeline_points: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Detects significant transitions and creates neutral pedagogical observations.
        """
        if len(timeline_points) < 2:
            return []

        insights = []
        for i in range(1, len(timeline_points)):
            prev = timeline_points[i - 1]
            curr = timeline_points[i]

            diff_part = curr.get("participation_activity", 0.0) - prev.get("participation_activity", 0.0)
            diff_move = curr.get("movement_intensity", 0.0) - prev.get("movement_intensity", 0.0)

            # Significant decrease in participation activity
            if diff_part <= -20.0:
                insights.append({
                    "interval_start": curr["timestamp"],
                    "interval_end": curr["timestamp"],
                    "time_range_label": curr.get("time_label", ""),
                    "category": "dip",
                    "neutral_observation": "Participation activity decreased notably during this interval.",
                    "evidence_metric": "participation_activity",
                    "metric_value": round(curr.get("participation_activity", 0.0), 1),
                    "confidence": 0.85,
                    "limitations": "May reflect transition between topics, reflective quiet period, or individual exercises."
                })
            # Significant rise in collective participation
            elif diff_part >= 20.0:
                insights.append({
                    "interval_start": curr["timestamp"],
                    "interval_end": curr["timestamp"],
                    "time_range_label": curr.get("time_label", ""),
                    "category": "peak",
                    "neutral_observation": "Interactive participation rose significantly during this window.",
                    "evidence_metric": "participation_activity",
                    "metric_value": round(curr.get("participation_activity", 0.0), 1),
                    "confidence": 0.90,
                    "limitations": "Reflects group interaction or active question response."
                })

            # Prolonged low movement
            if curr.get("movement_intensity", 50.0) < 15.0 and prev.get("movement_intensity", 50.0) < 15.0:
                insights.append({
                    "interval_start": curr["timestamp"],
                    "interval_end": curr["timestamp"],
                    "time_range_label": curr.get("time_label", ""),
                    "category": "steady",
                    "neutral_observation": "Physical movement remained sustained at a low level.",
                    "evidence_metric": "movement_intensity",
                    "metric_value": round(curr.get("movement_intensity", 0.0), 1),
                    "confidence": 0.80,
                    "limitations": "Students may be reading, writing notes, or listening attentively."
                })

        # Deduplicate or return top insights
        return insights[:6]
