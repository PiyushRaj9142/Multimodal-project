'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  UserCheck, 
  Clock, 
  Activity, 
  TrendingUp, 
  Sparkles, 
  Calendar, 
  FileText, 
  AlertCircle,
  PlusCircle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { api } from '@/lib/api';
import { OverviewAnalytics, Course, Session } from '@/lib/types';
import CreateSessionModal from '@/components/modals/CreateSessionModal';

export default function DashboardOverviewPage() {
  const [data, setData] = useState<OverviewAnalytics | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);

  useEffect(() => {
    loadOverviewData();
  }, [selectedCourse, selectedSession]);

  const loadOverviewData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overview, courseList, sessionList] = await Promise.all([
        api.getOverviewAnalytics(selectedCourse || undefined, selectedSession || undefined),
        api.getCourses(),
        api.getSessions(selectedCourse || undefined)
      ]);
      setData(overview);
      setCourses(courseList);
      setSessions(sessionList);
    } catch (err: any) {
      console.error('Failed to load overview:', err);
      setError(err.message || 'Unable to connect to local backend service.');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDemoData = async () => {
    setIsSeeding(true);
    try {
      await api.seedDemo(true);
      await loadOverviewData();
    } catch (err: any) {
      setError('Seeding demo data failed: ' + err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Classroom Overview
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Privacy-preserving attendance records and non-invasive multimodal engagement telemetry
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-all focus:ring-2 focus:ring-emerald-500"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Session</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mr-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-400" />
          <span>Filters:</span>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="course-filter" className="text-xs text-slate-500">Course:</label>
          <select
            id="course-filter"
            aria-label="Filter by course"
            value={selectedCourse}
            onChange={(e) => {
              setSelectedCourse(e.target.value);
              setSelectedSession('');
            }}
            className="text-xs bg-slate-50 border border-slate-300 text-slate-800 rounded-md px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.course_code} - {c.name.slice(0, 24)}...
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="session-filter" className="text-xs text-slate-500">Session:</label>
          <select
            id="session-filter"
            aria-label="Filter by session"
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 text-slate-800 rounded-md px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Latest Active / Recent</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title.slice(0, 30)} ({s.status})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={loadOverviewData}
          className="ml-auto text-xs text-slate-500 hover:text-slate-800 p-1.5 rounded-md hover:bg-slate-100 transition-colors"
          title="Refresh Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Backend Offline / Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <span className="font-semibold">Backend Connection Notice: </span>
              <span>{error}</span>
            </div>
          </div>
          <button
            onClick={loadOverviewData}
            className="px-2.5 py-1 bg-red-100 hover:bg-red-200 rounded text-red-800 font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State when no data */}
      {!loading && data && data.total_enrolled_students === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">No Classroom Records Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Initialize your local database by loading deterministic demo records with 15 students, realistic multimodal telemetry, and historical sessions.
            </p>
          </div>
          <button
            onClick={handleSeedDemoData}
            disabled={isSeeding}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
            {isSeeding ? 'Generating Sample Records...' : 'Load Demo Data'}
          </button>
        </div>
      )}

      {/* Key Metric Cards */}
      {data && data.total_enrolled_students > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Card 1: Enrolled */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium">Enrolled</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{data.total_enrolled_students}</div>
            <div className="text-[11px] text-slate-400 mt-1">Total active students</div>
          </div>

          {/* Card 2: Present */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium">Present</span>
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-600">{data.students_present_latest}</div>
            <div className="text-[11px] text-slate-400 mt-1">Verified present</div>
          </div>

          {/* Card 3: Attendance Rate */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium">Attendance %</span>
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{data.attendance_rate_percentage}%</div>
            <div className="text-[11px] text-slate-400 mt-1">Presence ratio</div>
          </div>

          {/* Card 4: Session Duration */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium">Duration</span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {formatDuration(data.current_session_duration_seconds)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Observed elapsed time</div>
          </div>

          {/* Card 5: Average Engagement */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium">Avg Engagement</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-700">{data.average_engagement_score}</div>
            <div className="text-[11px] text-slate-400 mt-1">Normalized index (0-100)</div>
          </div>

          {/* Card 6: Active AI Suggestions */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium">AI Suggestions</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-600">{data.teaching_recommendation_count}</div>
            <div className="text-[11px] text-slate-400 mt-1">Pedagogical insights</div>
          </div>
        </div>
      )}

      {/* Main Grid: Recent Sessions & Live Attendance Events */}
      {data && data.total_enrolled_students > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Sessions Table (Span 2) */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Classroom Sessions</h3>
                <p className="text-xs text-slate-500">History of automated attendance tracking and telemetry</p>
              </div>
              <Link
                href="/sessions"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                View all sessions <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-y border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Session Title</th>
                    <th className="py-2.5 px-3">Course</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Present</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {data.recent_sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {s.title}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] text-slate-600">
                          {s.course_code}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            s.status === 'running'
                              ? 'bg-emerald-100 text-emerald-800'
                              : s.status === 'completed'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        {s.present_count} students
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Link
                          href={`/sessions/${s.id}`}
                          className="text-xs font-medium text-emerald-600 hover:underline"
                        >
                          Details &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Attendance Events & Teaching Assistant Summary (Span 1) */}
          <div className="space-y-6">
            {/* Real-time Attendance Event Stream */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Recent Attendance Events</h3>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                  Local Stream
                </span>
              </div>
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {data.recent_attendance_events.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">{evt.student_name}</div>
                      <div className="text-[10px] text-slate-400 capitalize">
                        Source: {evt.source.replace('_', ' ')} &bull; Conf: {(evt.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        evt.status === 'present'
                          ? 'bg-emerald-100 text-emerald-800'
                          : evt.status === 'late'
                          ? 'bg-amber-100 text-amber-800'
                          : evt.status === 'manually_confirmed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {evt.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Assistant Quick Callout */}
            <div className="bg-emerald-50/60 rounded-xl border border-emerald-200 p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Deterministic Teaching Assistant</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Rules-based pedagogical suggestions are dynamically generated without cloud LLMs.
              </p>
              <Link
                href="/assistant"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Inspect Teaching Recommendations ({data.teaching_recommendation_count}) &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Session Creation Modal */}
      <CreateSessionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSessionCreated={() => loadOverviewData()}
      />
    </div>
  );
}
