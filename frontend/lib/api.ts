import {
  Course,
  Student,
  StudentDetail,
  Session,
  AttendanceRecord,
  SessionAnalytics,
  OverviewAnalytics,
  Recommendation,
  PrivacySettings,
  Capabilities,
  ProcessingStatus
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
      try {
        const errorJson = await res.json();
        if (errorJson.detail) {
          errorMsg = Array.isArray(errorJson.detail)
            ? errorJson.detail.map((e: any) => e.msg).join(', ')
            : errorJson.detail;
        }
      } catch (_) {}
      throw new Error(errorMsg);
    }
    if (res.status === 204) {
      return {} as T;
    }
    return await res.json();
  } catch (err: any) {
    console.error(`API Request to ${endpoint} failed:`, err);
    throw err;
  }
}

export const api = {
  // Health & Capabilities
  getHealth: () => request<{ status: string; offline_mode: boolean; version: string }>('/health'),
  getCapabilities: () => request<Capabilities>('/health/capabilities'),

  // Courses
  getCourses: (includeArchived = false) => request<Course[]>(`/courses?include_archived=${includeArchived}`),
  createCourse: (data: { course_code: string; name: string }) =>
    request<Course>('/courses', { method: 'POST', body: JSON.stringify(data) }),
  updateCourse: (id: string, data: Partial<Course>) =>
    request<Course>(`/courses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCourse: (id: string) => request<void>(`/courses/${id}`, { method: 'DELETE' }),

  // Students
  getStudents: (params?: { search?: string; course_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.course_id) query.append('course_id', params.course_id);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<Student[]>(`/students${qs}`);
  },
  getStudent: (id: string) => request<StudentDetail>(`/students/${id}`),
  createStudent: (data: {
    student_code: string;
    display_name: string;
    course_ids?: string[];
    video_consent?: boolean;
    audio_consent?: boolean;
  }) => request<Student>('/students', { method: 'POST', body: JSON.stringify(data) }),
  updateStudent: (id: string, data: Partial<Student>) =>
    request<Student>(`/students/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  importStudentsCSV: async (file: File, courseId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    const url = `${API_BASE_URL}/students/import${courseId ? `?course_id=${courseId}` : ''}`;
    const res = await fetch(url, { method: 'POST', body: formData });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Import failed' }));
      throw new Error(err.detail || 'CSV Import failed');
    }
    return await res.json();
  },

  // Sessions
  getSessions: (courseId?: string, statusFilter?: string) => {
    const query = new URLSearchParams();
    if (courseId) query.append('course_id', courseId);
    if (statusFilter) query.append('status_filter', statusFilter);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<Session[]>(`/sessions${qs}`);
  },
  getSession: (id: string) => request<Session>(`/sessions/${id}`),
  createSession: (data: {
    course_id: string;
    title: string;
    teacher_name?: string;
    subject?: string;
    planned_duration_minutes: number;
    input_mode: string;
    configuration?: any;
  }) => request<Session>('/sessions', { method: 'POST', body: JSON.stringify(data) }),
  startSession: (id: string) => request<Session>(`/sessions/${id}/start`, { method: 'POST' }),
  pauseSession: (id: string) => request<Session>(`/sessions/${id}/pause`, { method: 'POST' }),
  resumeSession: (id: string) => request<Session>(`/sessions/${id}/resume`, { method: 'POST' }),
  stopSession: (id: string) => request<Session>(`/sessions/${id}/stop`, { method: 'POST' }),
  finalizeSession: (id: string) => request<Session>(`/sessions/${id}/finalize`, { method: 'POST' }),

  uploadSessionVideo: async (sessionId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Video upload failed');
    }
    return await res.json();
  },
  getProcessingStatus: (sessionId: string) =>
    request<ProcessingStatus>(`/sessions/${sessionId}/processing-status`),

  // Attendance
  getSessionAttendance: (sessionId: string) =>
    request<AttendanceRecord[]>(`/sessions/${sessionId}/attendance`),
  correctAttendance: (sessionId: string, data: { record_id: string; status: string; notes?: string }) =>
    request<AttendanceRecord>(`/sessions/${sessionId}/attendance/correction`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),

  // Analytics
  getOverviewAnalytics: (courseId?: string, sessionId?: string) => {
    const query = new URLSearchParams();
    if (courseId) query.append('course_id', courseId);
    if (sessionId) query.append('session_id', sessionId);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<OverviewAnalytics>(`/analytics/overview${qs}`);
  },
  getSessionAnalytics: (sessionId: string, timeWindow: string = 'full') =>
    request<SessionAnalytics>(`/analytics/sessions/${sessionId}?time_window=${timeWindow}`),

  // Recommendations
  getSessionRecommendations: (sessionId: string) =>
    request<Recommendation[]>(`/sessions/${sessionId}/recommendations`),
  updateRecommendationStatus: (id: string, status: 'accepted' | 'dismissed' | 'completed') =>
    request<Recommendation>(`/sessions/recommendations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }),

  // Reports
  getSessionCsvUrl: (sessionId: string) => `${API_BASE_URL}/reports/sessions/${sessionId}/csv`,
  getSessionPdfUrl: (sessionId: string) => `${API_BASE_URL}/reports/sessions/${sessionId}/pdf`,

  // Privacy & Settings
  getPrivacySettings: () => request<PrivacySettings>('/privacy/settings'),
  updatePrivacySettings: (data: Partial<PrivacySettings>) =>
    request<PrivacySettings>('/privacy/settings', { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSessionData: (sessionId?: string, deleteMediaOnly: boolean = false) =>
    request<any>('/privacy/delete-session-data', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId || null,
        delete_raw_media_only: deleteMediaOnly,
        confirm_purge: true
      })
    }),

  // Demo
  seedDemo: (forceReset: boolean = false) =>
    request<{ status: string; message: string }>(`/demo/seed?force_reset=${forceReset}`, { method: 'POST' }),
  resetDemo: () =>
    request<{ status: string; message: string }>('/demo/reset', {
      method: 'POST',
      body: JSON.stringify({ confirm_reset: true })
    }),

  // Audit Logs
  getAuditLogs: () => request<any[]>('/audit-logs')
};
