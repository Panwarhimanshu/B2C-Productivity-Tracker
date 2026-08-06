import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Printer } from 'lucide-react';
import { reportsAPI } from '../../api/reports';
import { targetsAPI } from '../../api/targets';
import { formatDate, getErrorMessage } from '../../utils/helpers';
import { normalizeTracker } from '../../constants/tracker';
import TrackerForm from './TrackerForm';
import toast from 'react-hot-toast';

const printRoot = typeof document !== 'undefined' ? document.getElementById('print-root') : null;

const EditReportModal = ({ report, onClose, onSaved, readOnly = false }) => {
  const [tracker, setTracker] = useState(normalizeTracker(null));
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [countryTargets, setCountryTargets] = useState(null);

  useEffect(() => {
    if (!report) return;
    setTracker(normalizeTracker(report.tasks));
    setRemarks(report.remarks || '');

    const uid = report.userId?._id || report.userId;
    if (!uid) return;
    const d = new Date(report.date);
    targetsAPI.getForUser(uid, d.getMonth() + 1, d.getFullYear())
      .then((res) => {
        const countries = res.data.data?.countries || [];
        setCountryTargets(Object.fromEntries(countries.map((c) => [c.country, c])));
      })
      .catch(() => {});
  }, [report]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await reportsAPI.update(report._id, { tasks: tracker, remarks });
      toast.success('Report updated successfully');
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!report) return null;

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {readOnly ? 'View Report' : 'Edit Report'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {report.userId?.name ? `${report.userId.name} · ` : ''}{formatDate(report.date)}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <TrackerForm value={tracker} onChange={setTracker} readOnly={readOnly} countryTargets={countryTargets} />

          <div>
            <label className="label">Modifier Remarks</label>
            {readOnly ? (
              <p className="text-gray-700 dark:text-gray-300">{remarks || '-'}</p>
            ) : (
              <textarea
                className="input-field resize-none"
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add any remarks about this edit..."
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-gray-200 dark:border-gray-700">
          {!readOnly && (
            <button onClick={handleSave} className="btn-primary flex-1" disabled={saving}>
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" />Save Changes
                </span>
              )}
            </button>
          )}
          <button onClick={() => window.print()} className="btn-secondary">
            <Printer className="w-4 h-4" />Print
          </button>
          <button onClick={onClose} className={`btn-secondary ${readOnly ? 'flex-1' : ''}`}>Close</button>
        </div>
      </div>
    </div>

    {printRoot && createPortal(
      <div className="p-6">
        <div className="flex items-baseline justify-between border-b-2 border-gray-800 pb-3 mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{report.userId?.name || 'Daily Report'}</h1>
            <p className="text-sm text-gray-600">{report.userId?.employeeId ? `${report.userId.employeeId} · ` : ''}{formatDate(report.date)}</p>
          </div>
          <p className="text-xs text-gray-400">Generated {formatDate(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
        </div>
        <TrackerForm value={tracker} onChange={() => {}} readOnly countryTargets={countryTargets} />
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Modifier Remarks</p>
          <p className="text-sm text-gray-800">{remarks || '-'}</p>
        </div>
      </div>,
      printRoot
    )}
    </>
  );
};

export default EditReportModal;
