'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  History, 
  Search, 
  Calendar, 
  ChevronRight, 
  Users, 
  FileText, 
  Download, 
  Clock, 
  SlidersHorizontal,
  RefreshCw
} from 'lucide-react';
import { api } from '@/lib/api';
import { Session, Course } from '@/lib/types';

export default function SessionHistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadSessions();
  }, [selectedCourse, selectedStatus]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const [sessList, crsList] = await Promise.all([
        api.getSessions(selectedCourse || undefined, selectedStatus || undefined),
        api.getCourses()
      ]);
      setSessions(sessList);
      setCourses(crsList);
    } catch (e) {
      console.warn('Error loading sessions:', e);
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
            <History className="w-6 h-6 text-emerald-600" />
            Session History & Archives
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete searchable register of previous classroom recordings, attendance, and telemetry
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by session title or course code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs w-full bg-transparent border-0 focus:outline-none text-slate-800 placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500">Course:</span>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-slate-700"
            >
              <option value="">All Courses</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.course_code}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-slate-700"
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="running">Running</option>
              <option value="paused">Paused</option>
              <option value="ready">Ready</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSessions.map((s) => (
          <div
            key={s.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {s.course_code || 'COURSE'}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    s.status === 'completed'
                      ? 'bg-slate-100 text-slate-700'
                      : s.status === 'running'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {s.status}
                </span>
              </div>

              <h3 className="font-bold text-slate-900 text-sm leading-snug">
                {s.title}
              </h3>

              <div className="text-xs text-slate-500 space-y-1 pt-1">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{new Date(s.start_time || s.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{s.planned_duration_minutes} Minutes Planned</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{s.present_count} Students Present</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-700">
                Engagement: {s.average_engagement}/100
              </span>
              <Link
                href={`/sessions/${s.id}`}
                className="font-semibold text-slate-900 hover:text-emerald-600 flex items-center gap-1"
              >
                Inspect Details <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}

        {filteredSessions.length === 0 && (
          <div className="col-span-full bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center text-xs text-slate-400">
            No historical sessions matching the selected criteria.
          </div>
        )}
      </div>
    </div>
  );
}
