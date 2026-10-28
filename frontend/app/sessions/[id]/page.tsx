'use client';

import React, { useState, useEffect, Suspense, use } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  Calendar, 
  Clock, 
  Users, 
  TrendingUp, 
  Bot, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle,
  FileCode,
  Edit3
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { api } from '@/lib/api';
import { Session, AttendanceRecord, Recommendation, SessionAnalytics } from '@/lib/types';

function SessionDetailContent({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<Session | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [analytics, setAnalytics] = useState<SessionAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      loadSessionDetails(sessionId);
    }
  }, [sessionId]);

  const loadSessionDetails = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const [sData, attData, recData, anaData] = await Promise.all([
        api.getSession(id),
        api.getSessionAttendance(id),
        api.getSessionRecommendations(id),
        api.getSessionAnalytics(id, 'full')
      ]);
      setSession(sData);
      setAttendance(attData);
      setRecommendations(recData);
      setAnalytics(anaData);
    } catch (e: any) {
      setError(e.message || 'Error loading session details');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadJson = () => {
    if (!session) return;
    const exportObject = {
      session_metadata: session,
      attendance_records: attendance,
      telemetry_metrics: analytics?.timeline || [],
      ai_recommendations: recommendations,
      exported_at: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportObject, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session_${session.id.slice(0, 8)}_telemetry.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-400">Loading session telemetry...</div>;
  }

  if (error || !session) {
    return (
      <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="font-bold">Session Load Error</span>
        </div>
        <p>{error || 'Session not found.'}</p>
        <Link href="/sessions" className="text-emerald-700 font-semibold hover:underline block">
          &larr; Back to Sessions
        </Link>
      </div>
    );
  }

  const presentCount = attendance.filter(a => a.status === 'present' || a.status === 'manually_confirmed').length;

  return (
    <div className="space-y-6">
      {/* Header and Back Link */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href="/sessions"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Session History</span>
        </Link>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadJson}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg shadow-xs"
            title="Download full JSON telemetry export"
          >
            <FileCode className="w-4 h-4 text-slate-500" />
            <span>JSON Telemetry</span>
          </button>
          <a
            href={api.getSessionCsvUrl(sessionId)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>CSV Register</span>
          </a>
          <a
            href={api.getSessionPdfUrl(sessionId)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
          >
            <FileText className="w-4 h-4" />
            <span>Official PDF Summary</span>
          </a>
        </div>
      </div>

      {/* Session Metadata Banner */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {session.course_code || 'CLASS'}
              </span>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  session.status === 'completed'
                    ? 'bg-slate-100 text-slate-700'
                    : session.status === 'running'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {session.status}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">{session.title}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Instructor: <strong>{session.teacher_name}</strong> &bull; Subject: {session.subject || 'Interactive Classroom'}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs pt-2 sm:pt-0">
            <div>
              <span className="text-slate-400">Present</span>
              <div className="text-xl font-bold text-emerald-600">
                {presentCount} / {attendance.length}
              </div>
            </div>
            <div>
              <span className="text-slate-400">Avg Engagement</span>
              <div className="text-xl font-bold text-slate-900">
                {analytics?.overall_engagement_score || session.average_engagement}/100
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Engagement Timeline Chart */}
      {analytics && analytics.timeline.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Recorded Engagement Trajectory
            </h3>
            <span className="text-xs font-semibold text-slate-500">
              Duration: {analytics.session_duration_minutes}m
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.timeline} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="detailEngagement" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time_label" stroke="#94a3b8" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px' }}
                />
                <Area
                  type="monotone"
                  dataKey="composite_engagement"
                  stroke="#059669"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#detailEngagement)"
                  name="Engagement Index"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Attendance Register Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-600" />
          Session Attendance Register ({attendance.length} records)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-y border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Participant</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">First Seen</th>
                <th className="py-2.5 px-3">Last Seen</th>
                <th className="py-2.5 px-3">Observed Duration</th>
                <th className="py-2.5 px-3">Confidence</th>
                <th className="py-2.5 px-3">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {attendance.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    {r.student_name || r.anonymous_track_id}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        r.status === 'present' || r.status === 'manually_confirmed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.status === 'late'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {r.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                    {r.first_seen ? new Date(r.first_seen).toLocaleTimeString() : 'N/A'}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                    {r.last_seen ? new Date(r.last_seen).toLocaleTimeString() : 'N/A'}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-medium">
                    {Math.round(r.observed_duration)}s
                  </td>
                  <td className="py-2.5 px-3">{(r.confidence * 100).toFixed(0)}%</td>
                  <td className="py-2.5 px-3 capitalize text-slate-500">{r.source.replace('_', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations Generated */}
      {recommendations.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Bot className="w-4 h-4 text-emerald-600" />
            AI Teaching Recommendations Generated During Session
          </h3>
          <div className="space-y-2.5">
            {recommendations.map((rec) => (
              <div key={rec.id} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{rec.title}</span>
                  <span className="capitalize font-semibold text-[10px] text-slate-500">{rec.status}</span>
                </div>
                <p className="text-slate-600">{rec.explanation}</p>
                <div className="text-emerald-800 font-semibold pt-1">
                  Suggested Action: {rec.suggested_action}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  return (
    <Suspense fallback={<div className="py-20 text-center text-xs text-slate-400">Loading session telemetry...</div>}>
      <SessionDetailContent sessionId={unwrappedParams.id} />
    </Suspense>
  );
}
