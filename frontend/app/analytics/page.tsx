'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Sliders, 
  Clock, 
  AlertTriangle, 
  Info, 
  Layers, 
  Sparkles, 
  Mic, 
  Activity, 
  Eye, 
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { api } from '@/lib/api';
import { Session, SessionAnalytics, MetricDataPoint } from '@/lib/types';

export default function EngagementAnalyticsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [timeWindow, setTimeWindow] = useState<string>('full');
  const [analytics, setAnalytics] = useState<SessionAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Dynamic Configurable Weights
  const [weightParticipation, setWeightParticipation] = useState<number>(35);
  const [weightMovement, setWeightMovement] = useState<number>(25);
  const [weightHead, setWeightHead] = useState<number>(20);
  const [weightAudio, setWeightAudio] = useState<number>(20);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      loadSessionAnalytics(selectedSessionId, timeWindow);
    }
  }, [selectedSessionId, timeWindow]);

  const loadSessions = async () => {
    try {
      const list = await api.getSessions();
      setSessions(list);
      if (list.length > 0 && !selectedSessionId) {
        setSelectedSessionId(list[0].id);
      }
    } catch (e: any) {
      setError('Could not load sessions: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSessionAnalytics = async (sessionId: string, windowOption: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSessionAnalytics(sessionId, windowOption);
      setAnalytics(data);
    } catch (e: any) {
      setError('Failed to fetch analytics: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Dynamically compute recalculated composite engagement points based on user weights
  const computeRecalculatedTimeline = (): MetricDataPoint[] => {
    if (!analytics?.timeline) return [];

    const totalWeight = weightParticipation + weightMovement + weightHead + weightAudio;
    const normPart = weightParticipation / Math.max(1, totalWeight);
    const normMove = weightMovement / Math.max(1, totalWeight);
    const normHead = weightHead / Math.max(1, totalWeight);
    const normAudio = weightAudio / Math.max(1, totalWeight);

    return analytics.timeline.map(pt => {
      const part = pt.participation_activity || 50;
      const move = pt.movement_intensity || 50;
      const head = pt.head_orientation || 75;
      const aud = pt.audio_activity !== null && pt.audio_activity !== undefined ? pt.audio_activity : 50;

      const recalculated = Math.round(
        part * normPart + move * normMove + head * normHead + aud * normAudio
      );

      return {
        ...pt,
        composite_engagement: recalculated
      };
    });
  };

  const recalculatedTimeline = computeRecalculatedTimeline();
  const recalculatedOverall = recalculatedTimeline.length > 0
    ? Math.round(recalculatedTimeline.reduce((acc, p) => acc + p.composite_engagement, 0) / recalculatedTimeline.length)
    : analytics?.overall_engagement_score || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
            Explainable Engagement Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Normalized multimodal telemetry, interval transitions, and configurable fusion weights
          </p>
        </div>

        {/* Time Window Slicers */}
        <div className="inline-flex rounded-lg p-1 bg-slate-100 border border-slate-200 text-xs font-semibold">
          {['15m', '30m', 'full'].map((opt) => (
            <button
              key={opt}
              onClick={() => setTimeWindow(opt)}
              className={`px-3 py-1.5 rounded-md transition-all ${
                timeWindow === opt
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt === 'full' ? 'Full Session' : `Last ${opt}`}
            </button>
          ))}
        </div>
      </div>

      {/* Target Session Selection */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <label htmlFor="analytics-session-select" className="text-xs font-semibold text-slate-500 shrink-0">
            Selected Session:
          </label>
          <select
            id="analytics-session-select"
            aria-label="Select session for analytics"
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-emerald-500"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.status}) &bull; {s.course_code || 'Class'}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Data Quality:</span>
          <span className="font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            {analytics?.data_quality_level || 'Moderate'}
          </span>
        </div>
      </div>

      {/* Missing Modality Warnings */}
      {analytics?.missing_modality_warnings && analytics.missing_modality_warnings.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <span className="font-semibold">Modality Exclusion Warning: </span>
            {analytics.missing_modality_warnings.join(' ')}
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 mb-1">Composite Engagement Score</div>
          <div className="text-3xl font-extrabold text-emerald-600">{recalculatedOverall} / 100</div>
          <div className="text-[11px] text-slate-400 mt-1">Weighted multimodal average</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 mb-1">Observed Participants</div>
          <div className="text-3xl font-extrabold text-slate-900">
            {analytics?.total_participants_tracked || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {analytics?.attendance_ratio}% verified presence
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 mb-1">Active Modalities</div>
          <div className="text-xl font-bold text-slate-800 mt-1 flex flex-wrap gap-1">
            {analytics?.available_modalities.map(m => (
              <span key={m} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded capitalize">
                {m}
              </span>
            ))}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Independent telemetry streams</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 mb-1">Observed Window</div>
          <div className="text-3xl font-extrabold text-slate-900">
            {analytics?.session_duration_minutes || 0}m
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Total recorded elapsed time</div>
        </div>
      </div>

      {/* Interactive Recharts: Composite Engagement Trend (0-100) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Session Engagement Trajectory</h3>
            <p className="text-xs text-slate-500">
              Normalized composite indicator computed from participation activity, movement dynamics, and acoustics
            </p>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Recharts Telemetry
          </span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={recalculatedTimeline} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time_label" stroke="#94a3b8" fontSize={11} />
              <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px' }}
                formatter={(value: any) => [`${value}/100`, 'Engagement Index']}
              />
              <Area
                type="monotone"
                dataKey="composite_engagement"
                stroke="#059669"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorEngagement)"
                name="Engagement Score"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Multimodal Component Streams (Participation, Movement, Audio) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Multimodal Indicator Breakdown Timelines</h3>
          <p className="text-xs text-slate-500">
            Independent telemetry streams before weight normalization
          </p>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={recalculatedTimeline} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time_label" stroke="#94a3b8" fontSize={11} />
              <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Line
                type="monotone"
                dataKey="participation_activity"
                name="Participation Activity"
                stroke="#0284c7"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="movement_intensity"
                name="Movement Intensity"
                stroke="#d97706"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="audio_activity"
                name="Audio Vocal Ratio (VAD)"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Configurable Starting Weights Sliders & Modality Contributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sliders */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600" />
              Configure Telemetry Fusion Weights
            </h3>
            <button
              onClick={() => {
                setWeightParticipation(35);
                setWeightMovement(25);
                setWeightHead(20);
                setWeightAudio(20);
              }}
              className="text-xs text-emerald-600 hover:underline font-medium"
            >
              Reset to Defaults
            </button>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Weights are automatically renormalized over available signals. Adjusting weights immediately recalculates the analytics above in real-time.
          </p>

          <div className="space-y-3.5 pt-2 text-xs">
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Participation Activity Weight</span>
                <span>{weightParticipation}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={60}
                value={weightParticipation}
                onChange={e => setWeightParticipation(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Movement / Activity Patterns Weight</span>
                <span>{weightMovement}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                value={weightMovement}
                onChange={e => setWeightMovement(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Facing / Head Orientation Proxy Weight</span>
                <span>{weightHead}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={40}
                value={weightHead}
                onChange={e => setWeightHead(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Vocal Activity (VAD) Weight</span>
                <span>{weightAudio}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={40}
                value={weightAudio}
                onChange={e => setWeightAudio(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
            </div>
          </div>
        </div>

        {/* Automated Neutral Pedagogical Insights */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Automated Neutral Pedagogical Insights
            </h3>
            <span className="text-[10px] text-slate-400 font-semibold">Non-Punitive</span>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {analytics?.insights && analytics.insights.length > 0 ? (
              analytics.insights.map((ins, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{ins.time_range_label}</span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        ins.category === 'dip'
                          ? 'bg-amber-100 text-amber-800'
                          : ins.category === 'peak'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {ins.category}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-800 leading-snug">
                    {ins.neutral_observation}
                  </p>
                  <p className="text-[11px] text-slate-500 italic">
                    Limitation: {ins.limitations}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">
                Telemetry trajectory maintained consistent baseline indicators across all sampled windows.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Ethical & Privacy Limitations Banner */}
      <div className="bg-slate-100/70 border border-slate-200 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-600 leading-relaxed">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-800">Ethical Framework & Limitations: </strong>
          {analytics?.limitations_disclaimer ||
            'Behavioral indicators are non-invasive proxies of physical movement and presence. They do not measure comprehension, intellectual engagement, or academic learning.'}
        </div>
      </div>
    </div>
  );
}
