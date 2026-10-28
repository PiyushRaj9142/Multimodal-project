import os
import cv2
import numpy as np
from typing import List, Tuple, Dict, Any, Optional

class VisionDetector:
    def __init__(self):
        self.face_cascade = None
        self.hog = None
        self.is_available = False
        self._initialize_detectors()

    def _initialize_detectors(self):
        try:
            cascade_path = os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")
            if os.path.exists(cascade_path):
                self.face_cascade = cv2.CascadeClassifier(cascade_path)
            
            # HOG person detector
            self.hog = cv2.HOGDescriptor()
            self.hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
            self.is_available = True
        except Exception as e:
            print(f"VisionDetector initialization warning: {e}")
            self.is_available = False

    def detect_participants(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """
        Detect visible participants in a frame using Haar Face + HOG Person detectors.
        Returns list of bounding boxes: [{"bbox": (x, y, w, h), "confidence": 0.85, "type": "person"}]
        """
        if not self.is_available or frame is None:
            return []

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        detections = []

        # 1. Face detection
        if self.face_cascade is not None and not self.face_cascade.empty():
            faces = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(30, 30)
            )
            for (x, y, w, h) in faces:
                detections.append({
                    "bbox": (int(x), int(y), int(w), int(h)),
                    "confidence": 0.88,
                    "type": "face"
                })

        # 2. If face count is 0 or we want full body checks, run HOG if frame is large enough
        if len(detections) == 0 and self.hog is not None:
            boxes, weights = self.hog.detectMultiScale(
                gray,
                winStride=(8, 8),
                padding=(4, 4),
                scale=1.05
            )
            for (x, y, w, h), conf in zip(boxes, weights):
                detections.append({
                    "bbox": (int(x), int(y), int(w), int(h)),
                    "confidence": float(conf),
                    "type": "body"
                })

        return detections

    def calculate_movement_intensity(
        self, prev_gray: Optional[np.ndarray], curr_gray: np.ndarray
    ) -> float:
        """
        Calculate relative motion indicator between consecutive frames using frame differencing.
        Returns normalized float between 0.0 and 100.0.
        """
        if prev_gray is None or curr_gray is None:
            return 25.0  # default baseline
        
        diff = cv2.absdiff(prev_gray, curr_gray)
        _, thresh = cv2.threshold(diff, 25, 255, cv2.THRESH_BINARY)
        non_zero = np.count_nonzero(thresh)
        total_pixels = curr_gray.shape[0] * curr_gray.shape[1]
        
        ratio = non_zero / max(1, total_pixels)
        # Normalize: typical classroom motion ratio ranges between 0.01 and 0.20
        normalized = min(100.0, max(0.0, (ratio / 0.15) * 100.0))
        return float(normalized)
