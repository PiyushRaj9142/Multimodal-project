'use client';

import React, { useState, useEffect, Suspense, use } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  User, 
  UserCheck, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { api } from '@/lib/api';
import { StudentDetail } from '@/lib/types';

function StudentDetailContent({ studentId }: { studentId: string }) {
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (studentId) {
      loadStudent(studentId);
    }
  }, [studentId]);

  const loadStudent = async (id: string) => {
    setLoading(true);
    try {
      const data = await api.getStudent(id);
      setStudent(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load student detail');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-400">
        Loading student record...
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="font-bold">Student Record Error</span>
        </div>
        <p>{error || 'Student not found.'}</p>
        <Link href="/students" className="text-emerald-700 font-semibold hover:underline block">
          &larr; Back to Students List
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button and page actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/students"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Students</span>
        </Link>

        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg shadow-xs"
        >
          <Download className="w-4 h-4" />
          <span>Print / Export Individual Record</span>
        </button>
      </div>

      {/* Student Profile Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xl">
            {student.display_name.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{student.display_name}</h1>
            <div className="text-xs text-slate-500 font-mono mt-0.5">
              Student ID: <span className="font-bold text-slate-700">{student.student_code}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {student.courses.map((c) => (
                <span key={c} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-6 text-xs">
          <div>
            <div className="text-slate-400">Total Sessions</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{student.total_sessions_attended}</div>
          </div>
          <div>
            <div className="text-slate-400">Avg Duration</div>
            <div className="text-xl font-bold text-emerald-600 mt-0.5">{student.average_observed_minutes}m</div>
          </div>
        </div>
      </div>

      {/* Consent Status Details */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Privacy & Documented Consent Safeguards
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {student.consents.map((c, i) => (
            <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-800 capitalize">
                  {c.consent_type.replace('_', ' ')}
                </div>
                <div className="text-[11px] text-slate-400">
                  Recorded: {new Date(c.timestamp).toLocaleDateString()}
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                {c.granted ? 'Active Consent' : 'Revoked'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Verified Attendance History Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Verified Attendance History</h3>
          <p className="text-xs text-slate-500">
            Chronological log of verified identity-linked classroom sessions
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-y border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Session Title</th>
                <th className="py-2.5 px-3">Course</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Observed Duration</th>
                <th className="py-2.5 px-3">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {student.attendance_history.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    <Link href={`/sessions/${item.session_id}`} className="hover:text-emerald-600">
                      {item.session_title}
                    </Link>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{item.course_name}</td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                    {new Date(item.session_date).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        item.status === 'present' || item.status === 'manually_confirmed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono">{item.observed_duration_minutes}m</td>
                  <td className="py-2.5 px-3 text-slate-500">
                    {item.manually_corrected ? 'Teacher Confirmed' : 'Automated Telemetry'}
                  </td>
                </tr>
              ))}

              {student.attendance_history.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    No verified sessions logged for this student yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Non-Punitive Notice */}
      <div className="bg-slate-100/70 border border-slate-200 rounded-xl p-4 text-xs text-slate-500 leading-relaxed">
        <strong>FERPA & Institutional Privacy Notice: </strong>
        Individual presence logs are strictly accessible to authorized educators. In accordance with Section 13 guidelines, no automated grading, behavioral scoring, or disciplinary rankings are generated from this telemetry.
      </div>
    </div>
  );
}

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  return (
    <Suspense fallback={<div className="py-20 text-center text-xs text-slate-400">Loading student record...</div>}>
      <StudentDetailContent studentId={unwrappedParams.id} />
    </Suspense>
  );
}
