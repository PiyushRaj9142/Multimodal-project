'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  Activity, 
  Database, 
  RefreshCw, 
  PlusCircle, 
  Sparkles, 
  AlertCircle,
  Bell,
  CheckCircle2
} from 'lucide-react';
import { api } from '@/lib/api';
import { Course, Session } from '@/lib/types';

interface NavbarProps {
  onNewSessionClick?: () => void;
  selectedCourseId?: string;
  onSelectCourse?: (id: string) => void;
}

export default function Navbar({ onNewSessionClick, selectedCourseId, onSelectCourse }: NavbarProps) {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  useEffect(() => {
    loadNavbarData();
  }, []);

  const loadNavbarData = async () => {
    try {
      const courseList = await api.getCourses();
      setCourses(courseList);
      
      const sessions = await api.getSessions();
      const running = sessions.find(s => s.status === 'running' || s.status === 'ready');
      setActiveSession(running || null);
    } catch (e) {
      console.warn('Navbar initial data load error:', e);
    }
  };

  const handleResetDemo = async () => {
    setIsResetting(true);
    setResetMessage(null);
    try {
      const res = await api.resetDemo();
      setResetMessage(res.message);
      setTimeout(() => {
        setIsDemoModalOpen(false);
        setResetMessage(null);
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      setResetMessage('Reset error: ' + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <header className="h-16 border-b border-slate-200 bg-white sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
        {/* Left: Brand & Course Selector */}
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-sm group-hover:bg-emerald-700 transition-colors">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-slate-900 tracking-tight text-base sm:text-lg flex items-center gap-1.5">
                Attendance & Engagement Agent
              </span>
              <span className="text-[11px] text-slate-500 font-medium block">
                Educational Telemetry &bull; Privacy-Preserving
              </span>
            </div>
          </Link>

          {/* Classroom Selector */}
          <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-200">
            <label htmlFor="course-select" className="text-xs font-medium text-slate-500">
              Classroom:
            </label>
            <select
              id="course-select"
              aria-label="Select classroom"
              value={selectedCourseId || ''}
              onChange={(e) => onSelectCourse && onSelectCourse(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-300 text-slate-800 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="">All Classrooms</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.course_code}: {c.name.slice(0, 32)}...
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Operational Status, Demo tools, CTA */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active Session Status */}
          {activeSession ? (
            <Link
              href="/live"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse hover:bg-emerald-100 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Live: {activeSession.title.slice(0, 24)}...
            </Link>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              Idle
            </span>
          )}

          {/* Local Processing Offline Badge */}
          <div 
            title="All audio/video telemetry processed strictly on this machine. No external cloud endpoints."
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 cursor-help"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden md:inline">Local Processing</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-mono">Offline</span>
          </div>

          {/* Demo Controls */}
          <button
            onClick={() => setIsDemoModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
            title="Reset or re-seed fictional demonstration data"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Demo Actions</span>
          </button>

          {/* New Session Button */}
          {onNewSessionClick && (
            <button
              onClick={onNewSessionClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Session</span>
            </button>
          )}
        </div>
      </header>

      {/* Confirmation Modal for Resetting Demo Data */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-semibold text-slate-900">Manage Demo Data</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              You can re-seed deterministic classroom demonstration records (15 fictional students, 2 courses, 4 historical sessions, realistic attendance records, and multimodal analytics).
            </p>

            {resetMessage && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                {resetMessage}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDemoModalOpen(false)}
                disabled={isResetting}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetDemo}
                disabled={isResetting}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-sm transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                {isResetting ? 'Resetting...' : 'Re-Seed Demo Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
