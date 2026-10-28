'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Video, 
  Upload, 
  Cpu, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { Course } from '@/lib/types';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated?: (sessionId: string) => void;
}

export default function CreateSessionModal({ isOpen, onClose, onSessionCreated }: CreateSessionModalProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [teacherName, setTeacherName] = useState('Prof. Eleanor Vance');
  const [subject, setSubject] = useState('Multimodal Telemetry & Interaction');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [inputMode, setInputMode] = useState<'live_camera' | 'uploaded_video' | 'simulated'>('simulated');
  
  // Processing Capabilities
  const [enableCvTracking, setEnableCvTracking] = useState(true);
  const [enableVadAudio, setEnableVadAudio] = useState(true);
  const [enableScoring, setEnableScoring] = useState(true);

  // Privacy Checklist (Must all be checked)
  const [consentConfirmed, setConsentConfirmed] = useState(true);
  const [localOnlyAcknowledged, setLocalOnlyAcknowledged] = useState(true);
  const [nonPunitiveAcknowledged, setNonPunitiveAcknowledged] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadCourses();
    }
  }, [isOpen]);

  const loadCourses = async () => {
    try {
      const list = await api.getCourses();
      setCourses(list);
      if (list.length > 0 && !selectedCourseId) {
        setSelectedCourseId(list[0].id);
        setTitle(`${list[0].course_code} - Lab Session`);
      }
    } catch (e: any) {
      setError('Could not load course list: ' + e.message);
    }
  };

  if (!isOpen) return null;

  const handleNext = () => {
    setError(null);
    if (step === 1 && !selectedCourseId) {
      setError('Please select a course to continue.');
      return;
    }
    if (step === 2 && !title.trim()) {
      setError('Please provide a session title.');
      return;
    }
    if (step === 5 && (!consentConfirmed || !localOnlyAcknowledged || !nonPunitiveAcknowledged)) {
      setError('You must acknowledge all privacy and ethical commitments before starting.');
      return;
    }
    setStep(s => Math.min(6, s + 1));
  };

  const handleBack = () => {
    setError(null);
    setStep(s => Math.max(1, s - 1));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const session = await api.createSession({
        course_id: selectedCourseId,
        title: title.trim(),
        teacher_name: teacherName,
        subject,
        planned_duration_minutes: durationMinutes,
        input_mode: inputMode,
        configuration: {
          enable_cv_tracking: enableCvTracking,
          enable_vad_audio: enableVadAudio,
          enable_engagement_scoring: enableScoring,
          consent_confirmed: consentConfirmed
        }
      });

      // Start the session right away
      await api.startSession(session.id);

      onClose();
      if (onSessionCreated) {
        onSessionCreated(session.id);
      }
      router.push('/live');
    } catch (err: any) {
      setError('Failed to create session: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              New Classroom Session (Step {step} of 6)
            </h2>
            <p className="text-xs text-slate-500">
              Configure attendance capture, input modality, and privacy settings
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full bg-slate-200 h-1">
          <div 
            className="bg-emerald-600 h-1 transition-all duration-300" 
            style={{ width: `${(step / 6) * 100}%` }}
          />
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-sm text-slate-700">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Select Course */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 text-sm">Step 1: Select Course or Classroom</h3>
              <p className="text-xs text-slate-500">
                Choose the academic course roster to associate with this session&apos;s attendance register.
              </p>
              <div className="space-y-2">
                {courses.map(c => (
                  <label
                    key={c.id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedCourseId === c.id
                        ? 'border-emerald-500 bg-emerald-50/50 text-slate-900'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="course_select"
                        value={c.id}
                        checked={selectedCourseId === c.id}
                        onChange={() => {
                          setSelectedCourseId(c.id);
                          setTitle(`${c.course_code} - Lab Session`);
                        }}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <div className="font-semibold text-slate-900">{c.course_code}: {c.name}</div>
                        <div className="text-xs text-slate-500">Enrolled Students: {c.enrolled_count}</div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Title & Metadata */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 text-sm">Step 2: Session Details</h3>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Session Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Lecture 4: Human-Centered Design"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Instructor / Teacher</label>
                  <input
                    type="text"
                    value={teacherName}
                    onChange={e => setTeacherName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Planned Duration (Minutes)</label>
                  <input
                    type="number"
                    min={10}
                    max={240}
                    value={durationMinutes}
                    onChange={e => setDurationMinutes(parseInt(e.target.value) || 60)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject / Curriculum Topic</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Input Mode */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 text-sm">Step 3: Choose Input Mode</h3>
              <p className="text-xs text-slate-500">
                All inputs are processed strictly on-device without cloud connectivity.
              </p>
              <div className="space-y-2.5">
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                    inputMode === 'simulated'
                      ? 'border-emerald-500 bg-emerald-50/50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value="simulated"
                    checked={inputMode === 'simulated'}
                    onChange={() => setInputMode('simulated')}
                    className="mt-1 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      Simulated Classroom Session (Demo Mode)
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Deterministic real-time simulation with 15 enrolled students. Ideal for testing and immediate evaluation without camera hardware.
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                    inputMode === 'live_camera'
                      ? 'border-emerald-500 bg-emerald-50/50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value="live_camera"
                    checked={inputMode === 'live_camera'}
                    onChange={() => setInputMode('live_camera')}
                    className="mt-1 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <Video className="w-4 h-4 text-emerald-600" />
                      Live Camera & Microphone Stream
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Real-time browser capture with person detector, frame sampling, and voice activity analysis.
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                    inputMode === 'uploaded_video'
                      ? 'border-emerald-500 bg-emerald-50/50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value="uploaded_video"
                    checked={inputMode === 'uploaded_video'}
                    onChange={() => setInputMode('uploaded_video')}
                    className="mt-1 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-emerald-600" />
                      Recorded Classroom Video Upload
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Upload an existing MP4/MOV file for offline asynchronous computer vision frame analysis.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* STEP 4: Processing Capabilities */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 text-sm">Step 4: Enable Processing Capabilities</h3>
              <p className="text-xs text-slate-500">
                Configure which local models and analysis modules should be engaged.
              </p>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white">
                  <div>
                    <div className="font-medium text-slate-900 text-xs">Video Participant Detection & Tracking</div>
                    <div className="text-[11px] text-slate-500">Local Haar + HOG models; anonymous track generation.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableCvTracking}
                    onChange={e => setEnableCvTracking(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded-sm"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white">
                  <div>
                    <div className="font-medium text-slate-900 text-xs">Voice Activity Detection (VAD)</div>
                    <div className="text-[11px] text-slate-500">Local acoustic energy analysis; no audio recording stored.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableVadAudio}
                    onChange={e => setEnableVadAudio(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded-sm"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white">
                  <div>
                    <div className="font-medium text-slate-900 text-xs">Explainable Engagement Fusion</div>
                    <div className="text-[11px] text-slate-500">Calculates transparent normalized indicators with missing-signal warnings.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableScoring}
                    onChange={e => setEnableScoring(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded-sm"
                  />
                </label>
              </div>
            </div>
          )}

          {/* STEP 5: Privacy Checklist */}
          {step === 5 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 text-sm">Step 5: Privacy & Ethical Framework Checklist</h3>
              <p className="text-xs text-slate-500">
                You must review and acknowledge each privacy safeguard prior to launching the session.
              </p>
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentConfirmed}
                    onChange={e => setConsentConfirmed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-emerald-600 rounded-sm"
                  />
                  <span className="text-slate-700">
                    <strong>Participant Consent:</strong> Classroom participants have been notified and active enrollments have documented consent on file.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localOnlyAcknowledged}
                    onChange={e => setLocalOnlyAcknowledged(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-emerald-600 rounded-sm"
                  />
                  <span className="text-slate-700">
                    <strong>Local Offline Guarantee:</strong> Video and audio streams are processed in local memory and are never uploaded to any remote or cloud server.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={nonPunitiveAcknowledged}
                    onChange={e => setNonPunitiveAcknowledged(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-emerald-600 rounded-sm"
                  />
                  <span className="text-slate-700">
                    <strong>Non-Punitive Behavioral Proxies:</strong> Behavioral metrics are understood as physical activity proxies, NOT proof of learning or comprehension. No automated grading or punishment.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 6: Confirmation */}
          {step === 6 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 text-sm">Step 6: Ready to Launch Session</h3>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Title:</span>
                  <span className="font-semibold text-slate-900">{title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Teacher:</span>
                  <span className="font-semibold text-slate-900">{teacherName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Input Mode:</span>
                  <span className="font-semibold text-emerald-700 capitalize">{inputMode.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Planned Duration:</span>
                  <span className="font-semibold text-slate-900">{durationMinutes} Minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Local Processing:</span>
                  <span className="font-semibold text-emerald-600">Active (100% On-Device)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Controls */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={step === 1 ? onClose : handleBack}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-colors"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step < 6 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-sm transition-all"
            >
              Next Step
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-sm transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'Starting Session...' : 'Start Session Now'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
