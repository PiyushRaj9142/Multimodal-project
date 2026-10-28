import math
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class ParticipantTrack:
    def __init__(self, track_id: str, bbox: tuple[int, int, int, int], timestamp: datetime):
        self.track_id = track_id
        self.bbox = bbox  # (x, y, w, h)
        self.centroid = (bbox[0] + bbox[2] / 2, bbox[1] + bbox[3] / 2)
        self.first_seen = timestamp
        self.last_seen = timestamp
        self.total_observed_seconds = 0.0
        self.consecutive_missing_frames = 0
        self.status = "unverified"
        self.confidence = 0.85
        self.student_id: Optional[str] = None
        self.student_name: Optional[str] = None

    def update(self, bbox: tuple[int, int, int, int], timestamp: datetime, frame_interval_seconds: float):
        self.bbox = bbox
        self.centroid = (bbox[0] + bbox[2] / 2, bbox[1] + bbox[3] / 2)
        self.last_seen = timestamp
        self.total_observed_seconds += frame_interval_seconds
        self.consecutive_missing_frames = 0

class CentroidTracker:
    def __init__(
        self,
        max_missing_frames: int = 15,
        min_observation_seconds: float = 45.0,
        dist_threshold: float = 80.0
    ):
        self.max_missing_frames = max_missing_frames
        self.min_observation_seconds = min_observation_seconds
        self.dist_threshold = dist_threshold
        self.next_track_number = 1
        self.active_tracks: Dict[str, ParticipantTrack] = {}
        self.completed_tracks: Dict[str, ParticipantTrack] = {}

    def update(
        self,
        detections: List[Dict[str, Any]],
        timestamp: Optional[datetime] = None,
        frame_interval_seconds: float = 1.0
    ) -> List[ParticipantTrack]:
        """
        Update tracks with new detections using Euclidean centroid matching.
        """
        if timestamp is None:
            timestamp = utc_now()

        # If no detections this frame, increment missing frames
        if len(detections) == 0:
            tracks_to_retire = []
            for track_id, track in self.active_tracks.items():
                track.consecutive_missing_frames += 1
                if track.consecutive_missing_frames > self.max_missing_frames:
                    tracks_to_retire.append(track_id)
            for track_id in tracks_to_retire:
                self.completed_tracks[track_id] = self.active_tracks.pop(track_id)
            return list(self.active_tracks.values())

        input_centroids = [
            (d["bbox"][0] + d["bbox"][2] / 2, d["bbox"][1] + d["bbox"][3] / 2)
            for d in detections
        ]

        if len(self.active_tracks) == 0:
            for i, det in enumerate(detections):
                track_id = f"TRK-{self.next_track_number:03d}"
                self.next_track_number += 1
                track = ParticipantTrack(track_id, det["bbox"], timestamp)
                self.active_tracks[track_id] = track
        else:
            track_ids = list(self.active_tracks.keys())
            track_centroids = [self.active_tracks[tid].centroid for tid in track_ids]

            used_tracks = set()
            used_detections = set()

            # Pair centroids greedily by closest Euclidean distance
            cost_matrix = []
            for i, tc in enumerate(track_centroids):
                row = []
                for j, ic in enumerate(input_centroids):
                    dist = math.hypot(tc[0] - ic[0], tc[1] - ic[1])
                    row.append((dist, i, j))
                cost_matrix.extend(row)

            cost_matrix.sort(key=lambda x: x[0])

            for dist, t_idx, d_idx in cost_matrix:
                if t_idx in used_tracks or d_idx in used_detections:
                    continue
                if dist > self.dist_threshold:
                    continue

                track_id = track_ids[t_idx]
                self.active_tracks[track_id].update(
                    detections[d_idx]["bbox"], timestamp, frame_interval_seconds
                )
                used_tracks.add(t_idx)
                used_detections.add(d_idx)

            # Unused existing tracks -> missing
            for t_idx, track_id in enumerate(track_ids):
                if t_idx not in used_tracks:
                    self.active_tracks[track_id].consecutive_missing_frames += 1
                    if self.active_tracks[track_id].consecutive_missing_frames > self.max_missing_frames:
                        self.completed_tracks[track_id] = self.active_tracks.pop(track_id)

            # Unused detections -> new tracks
            for d_idx, det in enumerate(detections):
                if d_idx not in used_detections:
                    track_id = f"TRK-{self.next_track_number:03d}"
                    self.next_track_number += 1
                    track = ParticipantTrack(track_id, det["bbox"], timestamp)
                    self.active_tracks[track_id] = track

        # Update status based on observation duration threshold
        for track in self.active_tracks.values():
            if track.total_observed_seconds >= self.min_observation_seconds:
                track.status = "present"
            else:
                track.status = "unverified"

        return list(self.active_tracks.values())

    def get_all_records(self) -> List[ParticipantTrack]:
        combined = {**self.completed_tracks, **self.active_tracks}
        return list(combined.values())
