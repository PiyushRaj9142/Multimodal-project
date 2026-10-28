'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileBarChart, 
  Download, 
  FileText, 
  Calendar, 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  ShieldCheck,
  Search,
  RefreshCw
} from 'lucide-react';
import { api } from '@/lib/api';
import { Session, Course } from '@/lib/types';

export default function ReportsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadData();
  }, [selectedCourse]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sessList, crsList] = await Promise.all([
        api.getSessions(selectedCourse || undefined, 'completed'),
        api.getCourses()
      ]);
      setSessions(sessList);
      setCourses(crsList);
    } catch (e) {
      console.warn('Load reports data error:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    (s.course_code || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <FileBarChart className="w-6 h-6 text-emerald-600" />
            Attendance & Intelligence Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Download RFC-4180 CSV registers and official PDF session intelligence reports
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search reports by session title or course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs w-full bg-transparent border-0 focus:outline-none text-slate-800 placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Filter Course:</span>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1 text-slate-700"
          >
            <option value="">All Courses ({courses.length})</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.course_code}: {c.name.slice(0, 20)}...</option>
            ))}
          </select>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Session Title</th>
                <th className="py-3 px-3">Course Code</th>
                <th className="py-3 px-3">Session Date</th>
                <th className="py-3 px-3">Duration</th>
                <th className="py-3 px-3">Present</th>
                <th className="py-3 px-3">Avg Engagement</th>
                <th className="py-3 px-4 text-right">Download Formats</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredSessions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {s.title}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-600">
                    {s.course_code || 'GEN'}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                    {new Date(s.start_time || s.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-3 font-mono">
                    {s.planned_duration_minutes}m
                  </td>
                  <td className="py-3 px-3 font-bold text-emerald-700">
                    {s.present_count} students
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-800">
                    {s.average_engagement}/100
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <a
                        href={api.getSessionCsvUrl(s.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md border border-slate-300 transition-colors"
                      >
                        <Download className="w-3 h-3 text-slate-500" />
                        <span>CSV</span>
                      </a>
                      <a
                        href={api.getSessionPdfUrl(s.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-md border border-emerald-300 transition-colors"
                      >
                        <FileText className="w-3 h-3 text-emerald-600" />
                        <span>PDF</span>
                      </a>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredSessions.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No completed sessions available for reporting yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compliance & Export Guarantees */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs text-slate-600 space-y-2 leading-relaxed">
        <div className="font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Report Integrity & FERPA Transparency
        </div>
        <p>
          Exported PDF summaries and CSV registers disclose all operational modalities, manual teacher corrections, confidence intervals, and explicit ethical limitations. No raw recordings or biometric templates are embedded in exports.
        </p>
      </div>
    </div>
  );
}
