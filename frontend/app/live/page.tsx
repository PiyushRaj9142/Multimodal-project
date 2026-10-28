'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Video, 
  Camera, 
  Upload, 
  Sliders, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  Users, 
  Clock, 
  Layers,
  RefreshCw,
  FileCheck
} from 'lucide-react';
import { api } from '@/lib/api';
import { Session, AttendanceRecord, ProcessingStatus } from '@/lib/types';

export default function LiveSessionPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [showOverlay, setShowOverlay] = useState<boolean>(true);
  const [sampleRateFps, setSampleRateFps] = useState<number>(1);
  const [inputSource, setInputSource] = useState<'camera' | 'upload' | 'simulated'>('simulated');
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<ProcessingStatus | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    loadActiveSession();
    enumerateCameras();
    return () => {
      stopCameraStream();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Update timer while running
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  // Periodic attendance refresh when running
  useEffect(() => {
    if (!session || !isRunning) return;
    const interval = setInterval(() => {
      loadSessionAttendance(session.id);
    }, 4000);
    return () => clearInterval(interval);
  }, [session, isRunning]);

  // Draw simulated or real detection overlay bounding boxes on canvas
  useEffect(() => {
    if (!showOverlay) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const interval = setInterval(() => {
      drawDetectionOverlay();
    }, 500);

    return () => clearInterval(interval);
  }, [showOverlay, attendance, isRunning]);

  const loadActiveSession = async () => {
    try {
      const sessions = await api.getSessions();
      // Find running or ready session
      const target = sessions.find(s => s.status === 'running') || sessions[0];
      if (target) {
        setSession(target);
        setIsRunning(target.status === 'running');
        if (target.input_mode === 'live_camera') setInputSource('camera');
        else if (target.input_mode === 'uploaded_video') setInputSource('upload');
        else setInputSource('simulated');
        loadSessionAttendance(target.id);
      }
    } catch (err: any) {
      console.warn('Load active session notice:', err);
    }
  };

  const loadSessionAttendance = async (sessionId: string) => {
    try {
      const records = await api.getSessionAttendance(sessionId);
      setAttendance(records);
    } catch (err) {
      console.warn('Error loading attendance records:', err);
    }
  };

  const enumerateCameras = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        setAvailableDevices(videoDevices);
        if (videoDevices.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      }
    } catch (err) {
      console.warn('Device enumeration not permitted yet');
    }
  };

  const startCameraStream = async () => {
    try {
      setError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera access not supported in this browser environment. Using simulated mode.');
        setInputSource('simulated');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true,
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraPermission('granted');
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraPermission('denied');
      setError('Camera permission was denied or unavailable. You can seamlessly use Simulated Mode or Uploaded Video Mode.');
      setInputSource('simulated');
    }
  };

  const stopCameraStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const handleStartSession = async () => {
    if (!session) return;
    setError(null);
    try {
      await api.startSession(session.id);
      setIsRunning(true);
      if (inputSource === 'camera') {
        startCameraStream();
      }
      loadSessionAttendance(session.id);
    } catch (err: any) {
      setError(err.message || 'Failed to start session');
    }
  };

  const handlePauseSession = async () => {
    if (!session) return;
    try {
      await api.pauseSession(session.id);
      setIsRunning(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleResumeSession = async () => {
    if (!session) return;
    try {
      await api.resumeSession(session.id);
      setIsRunning(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleStopSession = async () => {
    if (!session) return;
    try {
      await api.stopSession(session.id);
      setIsRunning(false);
      stopCameraStream();
      loadActiveSession();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleVideoUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !session) return;

    setIsUploading(true);
    setError(null);
    try {
      await api.uploadSessionVideo(session.id, uploadFile);
      // Poll status
      const pollInterval = setInterval(async () => {
        try {
          const status = await api.getProcessingStatus(session.id);
          setUploadStatus(status);
          if (status.is_complete || status.status === 'completed' || status.status === 'failed') {
            clearInterval(pollInterval);
            setIsUploading(false);
            loadSessionAttendance(session.id);
          }
        } catch (_) {
          clearInterval(pollInterval);
          setIsUploading(false);
        }
      }, 1000);
    } catch (err: any) {
      setError('Upload failed: ' + err.message);
      setIsUploading(false);
    }
  };

  const drawDetectionOverlay = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw active participant bounding boxes
    const participants = attendance.slice(0, 8);
    participants.forEach((p, idx) => {
      // Deterministic layout grid
      const cols = 4;
      const row = Math.floor(idx / cols);
      const col = idx % cols;

      const cellW = canvas.width / cols;
      const cellH = canvas.height / 2;

      const boxW = cellW * 0.7;
      const boxH = cellH * 0.75;
      const x = col * cellW + (cellW - boxW) / 2;
      const y = row * cellH + (cellH - boxH) / 2;

      // Box style
      const isPresent = p.status === 'present' || p.status === 'manually_confirmed';
      ctx.strokeStyle = isPresent ? '#059669' : '#d97706';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, boxW, boxH);

      // Label background
      ctx.fillStyle = isPresent ? '#059669' : '#d97706';
      ctx.fillRect(x, y - 20, boxW, 20);

      // Label text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      const label = `${p.anonymous_track_id || 'TRK'}: ${(p.student_name || 'Participant').slice(0, 14)}`;
      ctx.fillText(label, x + 4, y - 6);
    });
  };

  const presentCount = attendance.filter(a => a.status === 'present' || a.status === 'manually_confirmed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Video className="w-6 h-6 text-emerald-600" />
            Live Session Telemetry
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time participant presence tracking and multimodal activity extraction
          </p>
        </div>

        {/* Source Mode Toggles */}
        <div className="inline-flex rounded-lg p-1 bg-slate-100 border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => {
              setInputSource('simulated');
              stopCameraStream();
            }}
            className={`px-3 py-1.5 rounded-md transition-all ${
              inputSource === 'simulated'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Simulated Lab
          </button>
          <button
            onClick={() => {
              setInputSource('camera');
              startCameraStream();
            }}
            className={`px-3 py-1.5 rounded-md transition-all ${
              inputSource === 'camera'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Live Camera
          </button>
          <button
            onClick={() => {
              setInputSource('upload');
              stopCameraStream();
            }}
            className={`px-3 py-1.5 rounded-md transition-all ${
              inputSource === 'upload'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Upload Video
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Viewport + Controls (Left), Live Attendance Event Stream (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video / Visual Viewport (Span 2) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 rounded-xl overflow-hidden shadow-md relative aspect-video flex items-center justify-center border border-slate-800">
            {/* Real Camera Stream */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${inputSource === 'camera' ? 'block' : 'hidden'}`}
            />

            {/* Simulated Stream / Placeholder */}
            {inputSource !== 'camera' && (
              <div className="w-full h-full bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-500 mb-3">
                  {inputSource === 'simulated' ? <Sparkles className="w-7 h-7" /> : <Upload className="w-7 h-7" />}
                </div>
                <h3 className="text-white font-semibold text-sm">
                  {inputSource === 'simulated'
                    ? 'Simulated Classroom Video Stream'
                    : 'Video File Processing Viewport'}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  {inputSource === 'simulated'
                    ? 'Real-time telemetry generated deterministically with 15 trackable student participants.'
                    : 'Upload an offline MP4/MOV recording below to trigger local computer vision analysis.'}
                </p>
              </div>
            )}

            {/* Canvas Overlay for Track ID bounding boxes */}
            <canvas
              ref={canvasRef}
              width={640}
              height={360}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {/* Top Status Badges */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                  isRunning
                    ? 'bg-emerald-500/90 text-white'
                    : 'bg-slate-700/80 text-slate-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
                {isRunning ? 'RECORDING & TRACKING' : 'READY / PAUSED'}
              </span>
              <span className="px-2 py-1 rounded-md text-[10px] font-medium bg-black/60 text-slate-200 backdrop-blur-xs">
                {sampleRateFps} FPS Sampling
              </span>
            </div>

            {/* Participant Counter Badge */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-black/70 text-white backdrop-blur-xs border border-white/10">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>{presentCount} Present</span>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            {/* Play/Pause/Stop Buttons */}
            <div className="flex items-center gap-2">
              {!isRunning ? (
                <button
                  onClick={session?.status === 'paused' ? handleResumeSession : handleStartSession}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{session?.status === 'paused' ? 'Resume' : 'Start Session'}</span>
                </button>
              ) : (
                <button
                  onClick={handlePauseSession}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm transition-all"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause</span>
                </button>
              )}

              <button
                onClick={handleStopSession}
                disabled={!isRunning && session?.status !== 'paused'}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors disabled:opacity-40"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>End Session</span>
              </button>
            </div>

            {/* Session Timer & Config Toggles */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 font-mono text-slate-700 font-semibold bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {Math.floor(elapsedSeconds / 60)
                    .toString()
                    .padStart(2, '0')}
                  :{(elapsedSeconds % 60).toString().padStart(2, '0')}
                </span>
              </div>

              {/* Overlay Toggle */}
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900 select-none">
                <input
                  type="checkbox"
                  checked={showOverlay}
                  onChange={e => setShowOverlay(e.target.checked)}
                  className="rounded-sm text-emerald-600"
                />
                <Layers className="w-3.5 h-3.5" />
                <span>Overlay Tracks</span>
              </label>

              {/* Sampling rate */}
              <div className="flex items-center gap-1 text-slate-600">
                <span>FPS:</span>
                <select
                  value={sampleRateFps}
                  onChange={e => setSampleRateFps(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 text-xs font-medium"
                >
                  <option value={0.5}>0.5 FPS</option>
                  <option value={1}>1.0 FPS</option>
                  <option value={2}>2.0 FPS</option>
                </select>
              </div>
            </div>
          </div>

          {/* Upload Workflow if in Upload Mode */}
          {inputSource === 'upload' && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-semibold text-slate-900 text-sm">Offline Video Upload & Telemetry</h3>
              <form onSubmit={handleVideoUpload} className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="file"
                  accept="video/mp4,video/mov,video/webm,video/avi"
                  onChange={e => setUploadFile(e.target.files?.[0] || null)}
                  className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
                <button
                  type="submit"
                  disabled={!uploadFile || isUploading}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-all disabled:opacity-50"
                >
                  {isUploading ? 'Analyzing Telemetry...' : 'Process Video'}
                </button>
              </form>

              {uploadStatus && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-xs font-medium text-slate-700">
                    <span>{uploadStatus.current_step}</span>
                    <span>{uploadStatus.progress_percentage.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadStatus.progress_percentage}%` }}
                    />
                  </div>
                  {uploadStatus.is_complete && (
                    <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5 pt-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Session processed successfully. Verified {uploadStatus.detected_participants} participants.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live Attendance Register (Span 1) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col space-y-4 h-[600px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Participant Register</h3>
              <p className="text-xs text-slate-500">Live observation intervals & status</p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              {presentCount} / {attendance.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {attendance.map((rec) => {
              const isPresent = rec.status === 'present' || rec.status === 'manually_confirmed';
              return (
                <div
                  key={rec.id}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-900">
                      {rec.student_name || rec.anonymous_track_id}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Track: {rec.anonymous_track_id || 'TRK-AUTO'} &bull; Observed: {Math.round(rec.observed_duration)}s
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      isPresent
                        ? 'bg-emerald-100 text-emerald-800'
                        : rec.status === 'late'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {rec.status.replace('_', ' ')}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Privacy Note */}
          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 leading-relaxed flex items-start gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <span>Anonymous tracking ID is maintained per-session. Zero biometric cloud storage.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
