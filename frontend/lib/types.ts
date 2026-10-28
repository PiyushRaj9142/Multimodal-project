export interface Course {
  id: string;
  course_code: string;
  name: string;
  teacher_id?: string | null;
  is_archived: boolean;
  created_at: string;
  enrolled_count: number;
  active_sessions_count: number;
}

export interface ConsentItem {
  id?: string;
  consent_type: string;
  granted: boolean;
  timestamp: string;
  revoked_at?: string | null;
}

export interface Student {
  id: string;
  student_code: string;
  display_name: string;
  created_at: string;
  updated_at: string;
  reference_image_path?: string | null;
  courses: string[];
  consents: ConsentItem[];
  attendance_rate: number;
}

export interface StudentAttendanceHistoryItem {
  session_id: string;
  session_title: string;
  course_name: string;
  session_date: string;
  status: string;
  observed_duration_minutes: number;
  confidence: number;
  manually_corrected: boolean;
}

export interface StudentDetail extends Student {
  attendance_history: StudentAttendanceHistoryItem[];
  total_sessions_attended: number;
  average_observed_minutes: number;
}

export interface Session {
  id: string;
  course_id: string;
  course_name?: string | null;
  course_code?: string | null;
  title: string;
  teacher_name: string;
  subject?: string | null;
  planned_duration_minutes: number;
  start_time?: string | null;
  end_time?: string | null;
  status: 'draft' | 'ready' | 'running' | 'paused' | 'processing' | 'completed' | 'failed';
  input_mode: 'live_camera' | 'uploaded_video' | 'simulated';
  configuration_json: string;
  created_at: string;
  present_count: number;
  enrolled_count: number;
  average_engagement: number;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id?: string | null;
  student_name?: string | null;
  student_code?: string | null;
  anonymous_track_id?: string | null;
  first_seen?: string | null;
  last_seen?: string | null;
  observed_duration: number; // in seconds
  status: 'present' | 'late' | 'left_early' | 'unverified' | 'manually_confirmed' | 'absent';
  source: string;
  manually_corrected: boolean;
  confidence: number;
  notes?: string | null;
  updated_at: string;
}

export interface MetricDataPoint {
  timestamp: string;
  time_label: string;
  composite_engagement: number;
  participation_activity: number;
  movement_intensity: number;
  head_orientation?: number | null;
  audio_activity?: number | null;
  participant_count: number;
  data_quality: string;
  available_modalities: string[];
}

export interface ModalityContribution {
  modality: string;
  weight: number;
  contribution_score: number;
  is_active: boolean;
}

export interface SessionInsight {
  interval_start: string;
  interval_end: string;
  time_range_label: string;
  category: string;
  neutral_observation: string;
  evidence_metric: string;
  metric_value: number;
  confidence: number;
  limitations: string;
}

export interface SessionAnalytics {
  session_id: string;
  session_title: string;
  overall_engagement_score: number;
  data_quality_level: string;
  available_modalities: string[];
  missing_modality_warnings: string[];
  timeline: MetricDataPoint[];
  modality_breakdown: ModalityContribution[];
  insights: SessionInsight[];
  attendance_ratio: number;
  total_participants_tracked: number;
  session_duration_minutes: number;
  limitations_disclaimer: string;
}

export interface OverviewAnalytics {
  total_enrolled_students: number;
  students_present_latest: number;
  attendance_rate_percentage: number;
  current_session_duration_seconds: number;
  average_engagement_score: number;
  participation_activity_index: number;
  recent_sessions: Array<{
    id: string;
    title: string;
    course_name: string;
    course_code: string;
    date: string;
    status: string;
    present_count: number;
    duration_minutes: number;
  }>;
  recent_attendance_events: Array<{
    id: string;
    session_id: string;
    student_name: string;
    status: string;
    source: string;
    timestamp: string;
    confidence: number;
    manually_corrected: boolean;
  }>;
  teaching_recommendation_count: number;
  offline_status: string;
}

export interface Recommendation {
  id: string;
  session_id: string;
  title: string;
  explanation: string;
  evidence_json: string;
  suggested_action: string;
  confidence: number;
  status: 'active' | 'accepted' | 'dismissed' | 'completed';
  created_at: string;
  evidence_dict?: Record<string, any> | null;
}

export interface PrivacySettings {
  local_storage_only: boolean;
  retention_period_days: number;
  auto_delete_raw_media: boolean;
  allow_biometric_matching: boolean;
  require_explicit_consent: boolean;
  total_stored_sessions: number;
  total_stored_attendance_records: number;
  total_stored_media_bytes: number;
}

export interface Capabilities {
  computer_vision_available: boolean;
  cv_backend: string;
  audio_vad_available: boolean;
  audio_backend: string;
  offline_ready: boolean;
  local_storage: boolean;
  pdf_export_available: boolean;
  notes: string[];
}

export interface ProcessingStatus {
  session_id: string;
  status: string;
  progress_percentage: number;
  current_step: string;
  processed_frames: number;
  total_frames: number;
  detected_participants: number;
  audio_segments_detected: number;
  is_complete: boolean;
  error_message?: string | null;
}
