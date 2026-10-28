'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Trash2, 
  Database, 
  HardDrive, 
  Lock, 
  Sliders, 
  AlertTriangle, 
  CheckCircle2, 
  FileText,
  Clock,
  History
} from 'lucide-react';
import { api } from '@/lib/api';
import { PrivacySettings } from '@/lib/types';

export default function PrivacySettingsPage() {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Editable settings
  const [retentionDays, setRetentionDays] = useState<number>(30);
  const [autoDeleteMedia, setAutoDeleteMedia] = useState<boolean>(true);
  const [allowBiometrics, setAllowBiometrics] = useState<boolean>(false);
  const [requireConsent, setRequireConsent] = useState<boolean>(true);

  // Purge modal
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState<boolean>(false);
  const [deleteMediaOnly, setDeleteMediaOnly] = useState<boolean>(false);
  const [confirmPurgeText, setConfirmPurgeText] = useState<string>('');
  const [isPurging, setIsPurging] = useState<boolean>(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);

  useEffect(() => {
    loadPrivacyData();
  }, []);

  const loadPrivacyData = async () => {
    setLoading(true);
    try {
      const [sData, logs] = await Promise.all([
        api.getPrivacySettings(),
        api.getAuditLogs()
      ]);
      setSettings(sData);
      setRetentionDays(sData.retention_period_days);
      setAutoDeleteMedia(sData.auto_delete_raw_media);
      setAllowBiometrics(sData.allow_biometric_matching);
      setRequireConsent(sData.require_explicit_consent);
      setAuditLogs(logs);
    } catch (e) {
      console.warn('Error loading privacy data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await api.updatePrivacySettings({
        retention_period_days: retentionDays,
        auto_delete_raw_media: autoDeleteMedia,
        allow_biometric_matching: allowBiometrics,
        require_explicit_consent: requireConsent
      });
      setSettings(updated);
      setSaveSuccess('Privacy settings saved and logged to audit trail.');
      setTimeout(() => setSaveSuccess(null), 3000);
      loadPrivacyData();
    } catch (err: any) {
      alert('Failed to save settings: ' + err.message);
    }
  };

  const handleExecutePurge = async () => {
    if (confirmPurgeText !== 'DELETE') return;

    setIsPurging(true);
    setPurgeResult(null);
    try {
      const res = await api.deleteSessionData(undefined, deleteMediaOnly);
      setPurgeResult(res.message);
      loadPrivacyData();
      setTimeout(() => {
        setIsPurgeModalOpen(false);
        setConfirmPurgeText('');
        setPurgeResult(null);
      }, 2000);
    } catch (err: any) {
      alert('Data purge failed: ' + err.message);
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-emerald-600" />
            Privacy, Compliance & Offline Operation
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Zero-cloud telemetry guarantees, FERPA compliance, retention controls, and audit log
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Local Storage & Zero-Cloud Telemetry Guarantees */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold">Local Storage Only</span>
            <HardDrive className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">100% On-Device</div>
          <p className="text-[11px] text-slate-400">Zero remote API calls or telemetry pings.</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold">Retained Media Files</span>
            <Database className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {((settings?.total_stored_media_bytes || 0) / (1024 * 1024)).toFixed(2)} MB
          </div>
          <p className="text-[11px] text-slate-400">Stored in local data/uploads directory.</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold">Recorded Attendance</span>
            <Lock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {settings?.total_stored_attendance_records || 0}
          </div>
          <p className="text-[11px] text-slate-400">Across {settings?.total_stored_sessions || 0} classroom sessions.</p>
        </div>
      </div>

      {/* Privacy Settings Form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-5">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Data Retention & Consent Policy</h3>
          <p className="text-xs text-slate-500">
            Configure automated cleanup intervals and privacy policies.
          </p>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
          <div>
            <div className="flex justify-between font-semibold text-slate-700 mb-1">
              <span>Automatic Data Retention Period (Days):</span>
              <span className="font-bold text-emerald-700">{retentionDays} Days</span>
            </div>
            <input
              type="range"
              min={7}
              max={180}
              step={1}
              value={retentionDays}
              onChange={e => setRetentionDays(Number(e.target.value))}
              className="w-full accent-emerald-600"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Classroom telemetry older than this threshold will be flagged for automated purge.
            </p>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100">
            <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <div>
                <div className="font-semibold text-slate-800">Auto-Purge Raw Media After Analysis</div>
                <div className="text-[11px] text-slate-500">
                  Deletes recorded video/audio files immediately after attendance and metrics are extracted.
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoDeleteMedia}
                onChange={e => setAutoDeleteMedia(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded-sm"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <div>
                <div className="font-semibold text-slate-800">Require Explicit Student Consent On-File</div>
                <div className="text-[11px] text-slate-500">
                  Enforces consent verification before mapping anonymous visual tracks to enrolled students.
                </div>
              </div>
              <input
                type="checkbox"
                checked={requireConsent}
                onChange={e => setRequireConsent(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded-sm"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <div>
                <div className="font-semibold text-slate-800">Opt-in Local Biometric Matching</div>
                <div className="text-[11px] text-slate-500">
                  Allows local face template matching strictly on consented students. Disabled by default.
                </div>
              </div>
              <input
                type="checkbox"
                checked={allowBiometrics}
                onChange={e => setAllowBiometrics(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded-sm"
              />
            </label>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-all"
            >
              Save Privacy Settings
            </button>
          </div>
        </form>
      </div>

      {/* Danger Zone: Data Purge */}
      <div className="bg-red-50/50 rounded-xl border border-red-200 p-6 space-y-4">
        <div className="flex items-center gap-2.5 text-red-700">
          <Trash2 className="w-5 h-5 shrink-0" />
          <h3 className="font-bold text-sm">Danger Zone: Data Purge & Compliance Deletion</h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Permanently remove stored session telemetry, attendance events, or raw video uploads. This irreversible action produces a signed entry in the audit log for regulatory compliance.
        </p>

        <button
          onClick={() => setIsPurgeModalOpen(true)}
          className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm transition-all"
        >
          Execute Data Purge
        </button>
      </div>

      {/* Audit Log Viewer */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-600" />
            Compliance Audit Log (Last 50 Entries)
          </h3>
          <span className="text-xs font-mono text-slate-400">FERPA Audit Trail</span>
        </div>

        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-y border-slate-200">
              <tr>
                <th className="py-2 px-3">Timestamp</th>
                <th className="py-2 px-3">Action</th>
                <th className="py-2 px-3">Entity Type</th>
                <th className="py-2 px-3">Entity ID</th>
                <th className="py-2 px-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 text-slate-500">
                    {new Date(log.timestamp).toLocaleTimeString()}{' '}
                    <span className="text-[10px]">{new Date(log.timestamp).toLocaleDateString()}</span>
                  </td>
                  <td className="py-2 px-3 font-semibold text-slate-900">{log.action}</td>
                  <td className="py-2 px-3 text-slate-600">{log.entity_type}</td>
                  <td className="py-2 px-3 text-slate-500">{log.entity_id || 'N/A'}</td>
                  <td className="py-2 px-3 text-slate-500 truncate max-w-xs">{log.details_json}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Purge Confirmation Modal */}
      {isPurgeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-red-200 space-y-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900">Confirm Data Purge</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This action will permanently delete records and free local disk space.
            </p>

            <label className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <input
                type="checkbox"
                checked={deleteMediaOnly}
                onChange={e => setDeleteMediaOnly(e.target.checked)}
                className="text-red-600"
              />
              <span>Purge raw uploaded media files only (keep attendance records)</span>
            </label>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Type <strong>DELETE</strong> to confirm:
              </label>
              <input
                type="text"
                value={confirmPurgeText}
                onChange={e => setConfirmPurgeText(e.target.value)}
                placeholder="DELETE"
                className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-red-500"
              />
            </div>

            {purgeResult && (
              <div className="p-2.5 rounded bg-emerald-50 text-emerald-800 text-xs font-medium">
                {purgeResult}
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setIsPurgeModalOpen(false)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecutePurge}
                disabled={confirmPurgeText !== 'DELETE' || isPurging}
                className="px-4 py-2 font-semibold bg-red-600 hover:bg-red-700 text-white rounded-md shadow-sm disabled:opacity-40"
              >
                {isPurging ? 'Purging Data...' : 'Permanently Purge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
