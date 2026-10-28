'use client';

import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  Search, 
  Filter, 
  Edit3, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  History,
  ShieldCheck,
  RefreshCw,
  X
} from 'lucide-react';
import { api } from '@/lib/api';
import { Session, AttendanceRecord } from '@/lib/types';

export default function AttendancePage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [newStatus, setNewStatus] = useState<string>('manually_confirmed');
  const [correctionNote, setCorrectionNote] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      loadAttendance(selectedSessionId);
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
      console.warn('Error loading sessions:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async (sessionId: string) => {
    setLoading(true);
    try {
      const data = await api.getSessionAttendance(sessionId);
      setRecords(data);
    } catch (e) {
      console.warn('Error loading attendance:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCorrection = async () => {
    if (!editingRecord || !selectedSessionId) return;

    try {
      await api.correctAttendance(selectedSessionId, {
        record_id: editingRecord.id,
        status: newStatus,
        notes: correctionNote.trim() || undefined
      });

      setActionSuccess(`Updated attendance status for ${editingRecord.student_name || 'track'}`);
      setEditingRecord(null);
      setCorrectionNote('');
      loadAttendance(selectedSessionId);

      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      alert('Correction failed: ' + err.message);
    }
  };

  const filteredRecords = records.filter(r => {
    const nameMatch = (r.student_name || r.anonymous_track_id || '')
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const codeMatch = (r.student_code || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSearch = nameMatch || codeMatch;

    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && r.status === statusFilter;
  });

  const presentCount = records.filter(r => r.status === 'present' || r.status === 'manually_confirmed').length;
  const attendanceRate = records.length > 0 ? ((presentCount / records.length) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <UserCheck className="w-6 h-6 text-emerald-600" />
            Attendance Register
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated vision tracking with auditable teacher manual confirmation
          </p>
        </div>

        {selectedSessionId && (
          <a
            href={api.getSessionCsvUrl(selectedSessionId)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg shadow-xs transition-all"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </a>
        )}
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Top Controls: Session Selector & Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs md:col-span-2">
          <label htmlFor="target-session-select" className="block text-xs font-semibold text-slate-500 mb-1.5">
            Select Classroom Session:
          </label>
          <select
            id="target-session-select"
            aria-label="Select classroom session"
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="w-full text-xs font-medium bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.status}) &bull; {s.course_code || 'CS'}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500">Present Count</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {presentCount} / {records.length}
            </div>
          </div>
          <UserCheck className="w-8 h-8 text-emerald-100" />
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500">Attendance Rate</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{attendanceRate}%</div>
          </div>
          <Clock className="w-8 h-8 text-blue-100" />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search student by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-xs w-full bg-transparent border-0 focus:outline-none text-slate-800 placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1 text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="present">Present</option>
            <option value="manually_confirmed">Manually Confirmed</option>
            <option value="late">Late</option>
            <option value="left_early">Left Early</option>
            <option value="unverified">Unverified</option>
            <option value="absent">Absent</option>
          </select>
        </div>
      </div>

      {/* Attendance Register Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Student Name / Track</th>
                <th className="py-3 px-3">Student Code</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Source</th>
                <th className="py-3 px-3">Observed Duration</th>
                <th className="py-3 px-3">Confidence</th>
                <th className="py-3 px-3">Audit Details</th>
                <th className="py-3 px-4 text-right">Manual Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRecords.map((r) => {
                const isConfirmed = r.status === 'present' || r.status === 'manually_confirmed';
                return (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {r.student_name || r.anonymous_track_id}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                      {r.student_code || 'ANONYMOUS'}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isConfirmed
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'late'
                            ? 'bg-amber-100 text-amber-800'
                            : r.status === 'left_early'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 capitalize text-slate-500">
                      {r.source.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700">
                      {Math.floor(r.observed_duration / 60)}m {Math.round(r.observed_duration % 60)}s
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-700">
                        {(r.confidence * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {r.manually_corrected ? (
                        <span className="text-blue-600 font-medium">Teacher Corrected</span>
                      ) : (
                        <span className="text-slate-400">Automated</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setEditingRecord(r);
                          setNewStatus(r.status);
                          setCorrectionNote(r.notes || '');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors border border-emerald-200"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Correct</span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    No attendance records match the search filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Correction Modal with Audit Trail */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Manual Attendance Correction
              </h3>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-1">
              <span className="text-slate-500">Participant:</span>
              <div className="font-bold text-slate-900 text-sm">
                {editingRecord.student_name || editingRecord.anonymous_track_id}
              </div>
              <div className="text-slate-400">
                Current Status: <strong className="capitalize">{editingRecord.status.replace('_', ' ')}</strong>
              </div>
            </div>

            <div>
              <label htmlFor="override-status-select" className="block text-xs font-semibold text-slate-700 mb-1">
                Override Status:
              </label>
              <select
                id="override-status-select"
                aria-label="Override attendance status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="manually_confirmed">Manually Confirmed (Present)</option>
                <option value="present">Present (Automated Verified)</option>
                <option value="late">Late Arrival</option>
                <option value="left_early">Left Early</option>
                <option value="absent">Absent</option>
                <option value="unverified">Unverified</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Audit Reason / Instructor Note:
              </label>
              <textarea
                value={correctionNote}
                onChange={(e) => setCorrectionNote(e.target.value)}
                placeholder="e.g. Student arrived 5 minutes late due to advisory meeting; verified in-person."
                rows={3}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                This correction will be recorded in the immutable compliance audit log.
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCorrection}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-sm"
              >
                Save & Audit Correction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
