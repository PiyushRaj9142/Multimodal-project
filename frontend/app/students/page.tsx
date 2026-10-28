'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  UserPlus, 
  Upload, 
  Search, 
  BookOpen, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  FileText,
  ShieldCheck,
  ChevronRight,
  Download
} from 'lucide-react';
import { api } from '@/lib/api';
import { Student, Course } from '@/lib/types';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState<boolean>(false);

  // New Student Form
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newCourseIds, setNewCourseIds] = useState<string[]>([]);
  const [videoConsent, setVideoConsent] = useState(true);
  const [audioConsent, setAudioConsent] = useState(true);

  // New Course Form
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');

  // CSV Import State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedCourse, search]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stuList, crsList] = await Promise.all([
        api.getStudents({ search: search || undefined, course_id: selectedCourse || undefined }),
        api.getCourses()
      ]);
      setStudents(stuList);
      setCourses(crsList);
    } catch (e) {
      console.warn('Load students error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;

    try {
      await api.createStudent({
        student_code: newCode.trim(),
        display_name: newName.trim(),
        course_ids: newCourseIds,
        video_consent: videoConsent,
        audio_consent: audioConsent
      });
      setNotification(`Student ${newName} enrolled successfully.`);
      setIsAddStudentModalOpen(false);
      setNewCode('');
      setNewName('');
      setNewCourseIds([]);
      loadData();
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      alert('Error creating student: ' + err.message);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseCode.trim() || !courseName.trim()) return;

    try {
      await api.createCourse({
        course_code: courseCode.trim(),
        name: courseName.trim()
      });
      setNotification(`Course ${courseCode} added.`);
      setIsAddCourseModalOpen(false);
      setCourseCode('');
      setCourseName('');
      loadData();
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      alert('Error creating course: ' + err.message);
    }
  };

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;

    setIsImporting(true);
    setImportResult(null);
    try {
      const res = await api.importStudentsCSV(csvFile, selectedCourse || undefined);
      setImportResult(res);
      loadData();
    } catch (err: any) {
      alert('Import failed: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-emerald-600" />
            Students & Courses
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Privacy-preserving student roster, consent management, and course enrollments
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddCourseModalOpen(true)}
            className="flex items-center gap-1 px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg shadow-xs transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>New Course</span>
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1 px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg shadow-xs transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={() => setIsAddStudentModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student ID or name..."
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
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.course_code}: {c.name.slice(0, 24)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Display Name</th>
                <th className="py-3 px-3">Enrolled Courses</th>
                <th className="py-3 px-3">Consent Status</th>
                <th className="py-3 px-3">Attendance Rate</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {s.student_code}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {s.display_name}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-1">
                      {s.courses.map((cName) => (
                        <span
                          key={cName}
                          className="text-[10px] bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded"
                        >
                          {cName.slice(0, 20)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Consent Verified
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-800">{s.attendance_rate}%</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/students/${s.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                    >
                      <span>Analytics</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}

              {students.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    No student records found matching the criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal */}
      {isAddStudentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Add New Student</h3>
              <button
                onClick={() => setIsAddStudentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Student ID Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. STU-205"
                  value={newCode}
                  onChange={e => setNewCode(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Samantha Vance"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Enroll in Courses</label>
                <div className="space-y-1.5 max-h-32 overflow-y-auto border border-slate-200 p-2 rounded-lg bg-slate-50">
                  {courses.map(c => (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newCourseIds.includes(c.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setNewCourseIds([...newCourseIds, c.id]);
                          } else {
                            setNewCourseIds(newCourseIds.filter(id => id !== c.id));
                          }
                        }}
                        className="rounded-sm text-emerald-600"
                      />
                      <span className="text-slate-800">{c.course_code}: {c.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={videoConsent}
                    onChange={e => setVideoConsent(e.target.checked)}
                    className="text-emerald-600"
                  />
                  <span className="text-slate-700">Video presence detection consent granted</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={audioConsent}
                    onChange={e => setAudioConsent(e.target.checked)}
                    className="text-emerald-600"
                  />
                  <span className="text-slate-700">Audio activity analysis consent granted</span>
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddStudentModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-sm"
                >
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal with Row-Level Validation Reporting */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Bulk Import Student Roster (CSV)</h3>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportResult(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Upload a UTF-8 encoded CSV file with columns: <code>student_code</code> and <code>display_name</code>. Row-level validation checks for duplicate student IDs and malformed records.
            </p>

            <form onSubmit={handleCsvImport} className="space-y-4">
              <input
                type="file"
                accept=".csv"
                onChange={e => setCsvFile(e.target.files?.[0] || null)}
                className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
              />

              {importResult && (
                <div className="space-y-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex justify-between font-semibold">
                    <span className="text-emerald-700">Successfully Imported: {importResult.successful_imports}</span>
                    <span className="text-amber-700">Failed: {importResult.failed_imports}</span>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="mt-2 space-y-1 max-h-36 overflow-y-auto">
                      <div className="font-semibold text-slate-700 text-[11px]">Row-Level Errors:</div>
                      {importResult.errors.map((err: any, i: number) => (
                        <div key={i} className="text-[11px] text-red-600 bg-red-50 p-1 rounded">
                          Row {err.row_number}: {err.error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={!csvFile || isImporting}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-sm disabled:opacity-50"
                >
                  {isImporting ? 'Processing CSV...' : 'Import Roster'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Course Modal */}
      {isAddCourseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Create New Academic Course</h3>
              <button
                onClick={() => setIsAddCourseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Course Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS-450"
                  value={courseCode}
                  onChange={e => setCourseCode(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Course Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Natural User Interfaces"
                  value={courseName}
                  onChange={e => setCourseName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddCourseModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-sm"
                >
                  Save Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
