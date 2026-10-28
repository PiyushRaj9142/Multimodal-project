import numpy as np
from typing import Dict, Any, List, Optional

class AudioVADProcessor:
    def __init__(self, energy_threshold: float = 0.02, min_speech_duration_ms: int = 300):
        self.energy_threshold = energy_threshold
        self.min_speech_duration_ms = min_speech_duration_ms
        self.is_available = True

    def process_pcm_chunk(self, pcm_data: np.ndarray, sample_rate: int = 16000) -> Dict[str, Any]:
        """
        Process a chunk of raw 16-bit or float32 PCM audio.
        Calculates Root Mean Square (RMS) energy and zero-crossing rate.
        Returns:
            - is_speech (bool)
            - rms_energy (float)
            - zero_crossing_rate (float)
        """
        if pcm_data is None or len(pcm_data) == 0:
            return {"is_speech": False, "rms_energy": 0.0, "zero_crossing_rate": 0.0}

        # Normalize to float [-1.0, 1.0] if integer
        if pcm_data.dtype == np.int16:
            pcm_float = pcm_data.astype(np.float32) / 32768.0
        else:
            pcm_float = pcm_data.astype(np.float32)

        # RMS Energy
        rms = float(np.sqrt(np.mean(pcm_float ** 2)))
        
        # Zero Crossing Rate
        zero_crossings = np.sum(np.abs(np.diff(np.sign(pcm_float) > 0))) / max(1, len(pcm_float))

        # Heuristic Voice Activity: voice typically has higher energy and moderate ZCR
        is_speech = (rms > self.energy_threshold) and (0.01 < zero_crossings < 0.45)

        return {
            "is_speech": bool(is_speech),
            "rms_energy": rms,
            "zero_crossing_rate": float(zero_crossings)
        }

    def aggregate_window_activity(self, speech_flags: List[bool], window_seconds: float) -> Dict[str, Any]:
        """
        Calculates voice activity ratio and speech segment count in a time window.
        """
        if not speech_flags:
            return {
                "voice_activity_ratio": 0.0,
                "speech_segments_count": 0,
                "total_speech_seconds": 0.0,
                "has_audio_data": False
            }

        speech_count = sum(1 for s in speech_flags if s)
        ratio = speech_count / len(speech_flags)

        # Count state transitions from False -> True
        segments = 0
        in_segment = False
        for flag in speech_flags:
            if flag and not in_segment:
                segments += 1
                in_segment = True
            elif not flag and in_segment:
                in_segment = False

        total_speech_secs = ratio * window_seconds

        return {
            "voice_activity_ratio": float(ratio),
            "speech_segments_count": segments,
            "total_speech_seconds": float(total_speech_secs),
            "has_audio_data": True
        }
