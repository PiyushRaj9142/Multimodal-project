'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Sparkles, 
  Check, 
  X, 
  CheckCheck, 
  AlertCircle, 
  ShieldCheck, 
  Clock, 
  Lightbulb, 
  Activity,
  Layers,
  ChevronRight
} from 'lucide-react';
import { api } from '@/lib/api';
import { Session, Recommendation } from '@/lib/types';

export default function AssistantPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      loadRecommendations(selectedSessionId);
    }
  }, [selectedSessionId]);

  const loadSessions = async () => {
    try {
      const list = await api.getSessions();
      setSessions(list);
      if (list.length > 0 && !selectedSessionId) {
        setSelectedSessionId(list[0].id);
      }
    } catch (e) {
      console.warn('Load sessions notice:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async (sessionId: string) => {
    setLoading(true);
    try {
      const recs = await api.getSessionRecommendations(sessionId);
      setRecommendations(recs);
    } catch (e) {
      console.warn('Load recommendations notice:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, newStatus: 'accepted' | 'dismissed' | 'completed') => {
    try {
      await api.updateRecommendationStatus(id, newStatus);
      setActionSuccess(`Recommendation marked as ${newStatus}`);
      loadRecommendations(selectedSessionId);
      setTimeout(() => setActionSuccess(null), 2500);
    } catch (err: any) {
      alert('Failed to update recommendation status: ' + err.message);
    }
  };

  const filteredRecs = recommendations.filter(r => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Bot className="w-6 h-6 text-emerald-600" />
            AI Teaching Assistant
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Deterministic rule-based pedagogical suggestions grounded in verifiable classroom telemetry
          </p>
        </div>

        {/* Status Filter */}
        <div className="inline-flex rounded-lg p-1 bg-slate-100 border border-slate-200 text-xs font-semibold">
          {['all', 'active', 'accepted', 'completed', 'dismissed'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded-md capitalize transition-all ${
                filterStatus === s
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Session Selector */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <label htmlFor="assistant-session-select" className="text-xs font-semibold text-slate-500 shrink-0">
            Classroom Session:
          </label>
          <select
            id="assistant-session-select"
            aria-label="Select classroom session for recommendations"
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-emerald-500"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.status}) &bull; {s.course_code || 'Course'}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs font-medium text-slate-500">
          Showing {filteredRecs.length} suggestions
        </span>
      </div>

      {/* Recommendations Cards Grid */}
      <div className="space-y-4">
        {filteredRecs.map((rec) => {
          const isPending = rec.status === 'active';
          return (
            <div
              key={rec.id}
              className={`bg-white rounded-xl border p-5 shadow-xs transition-all space-y-3.5 ${
                rec.status === 'completed'
                  ? 'border-emerald-200 bg-emerald-50/20'
                  : rec.status === 'dismissed'
                  ? 'border-slate-200 opacity-60'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 shrink-0 mt-0.5">
                    <Lightbulb className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{rec.title}</h3>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      {rec.explanation}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full shrink-0 ${
                    rec.status === 'active'
                      ? 'bg-amber-100 text-amber-800'
                      : rec.status === 'accepted'
                      ? 'bg-blue-100 text-blue-800'
                      : rec.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {rec.status}
                </span>
              </div>

              {/* Supporting Telemetry Evidence */}
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs space-y-1">
                <div className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-slate-500" />
                  Supporting Telemetry Evidence
                </div>
                <div className="font-mono text-slate-600 text-[11px]">
                  Confidence: <strong>{(rec.confidence * 100).toFixed(0)}%</strong> &bull; Telemetry:{' '}
                  {JSON.stringify(rec.evidence_dict || {})}
                </div>
              </div>

              {/* Suggested Action Callout */}
              <div className="bg-emerald-50/50 rounded-lg p-3 border border-emerald-100 text-xs flex items-start gap-2 text-emerald-900">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-emerald-950">Suggested Pedagogical Action: </strong>
                  {rec.suggested_action}
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
                {rec.status !== 'accepted' && rec.status !== 'completed' && (
                  <button
                    onClick={() => handleAction(rec.id, 'accepted')}
                    className="flex items-center gap-1 px-3 py-1.5 font-semibold text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Accept Suggestion</span>
                  </button>
                )}

                {rec.status !== 'completed' && (
                  <button
                    onClick={() => handleAction(rec.id, 'completed')}
                    className="flex items-center gap-1 px-3 py-1.5 font-semibold text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded-lg transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark Completed</span>
                  </button>
                )}

                {rec.status !== 'dismissed' && (
                  <button
                    onClick={() => handleAction(rec.id, 'dismissed')}
                    className="flex items-center gap-1 px-3 py-1.5 font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Dismiss</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredRecs.length === 0 && (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center text-xs text-slate-400">
            No recommendations currently matching the filter &apos;{filterStatus}&apos;.
          </div>
        )}
      </div>

      {/* Offline Pedagogical Framework Notice */}
      <div className="bg-slate-100/70 border border-slate-200 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-600 leading-relaxed">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-800">Deterministic Pedagogical Framework: </strong>
          Suggestions are derived through rule-based evaluation of telemetry changes (such as 25%+ activity shifts or continuous teaching intervals exceeding 30 minutes). No external AI model or cloud transmission is involved.
        </div>
      </div>
    </div>
  );
}
