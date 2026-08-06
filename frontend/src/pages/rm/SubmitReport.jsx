import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, AlertCircle, Calendar, User, Hash, Mail } from 'lucide-react';
import { reportsAPI } from '../../api/reports';
import { targetsAPI } from '../../api/targets';
import { useAuth } from '../../context/AuthContext';
import { emptyTracker } from '../../constants/tracker';
import { getErrorMessage } from '../../utils/helpers';
import TrackerForm from '../../components/reports/TrackerForm';
import toast from 'react-hot-toast';

const SubmitReport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tracker, setTracker] = useState(emptyTracker);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [countryTargets, setCountryTargets] = useState(null);

  useEffect(() => {
    const now = new Date();
    targetsAPI.getMyWithActuals(now.getMonth() + 1, now.getFullYear())
      .then((res) => {
        const countries = res.data.data?.countries || [];
        setCountryTargets(Object.fromEntries(countries.map((c) => [c.country, c])));
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await reportsAPI.submit({ date, tasks: tracker });
      toast.success('Report submitted successfully!');
      navigate('/my-reports');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Submit Daily Report</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Counsellor Daily Tracker — fill commitments in the morning and update KPIs at end of day.</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* A. Counsellor Details */}
        <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
          {/* Coloured header band */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-100">Counsellor Details</p>
            <span className="text-xs text-primary-200">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>

          {/* Body */}
          <div className="bg-white dark:bg-gray-800 px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-6">
            {/* Avatar + identity */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0 shadow-inner">
                <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {user?.name?.charAt(0)?.toUpperCase() || 'R'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-gray-900 dark:text-white truncate leading-tight">{user?.name || '—'}</p>
                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300">
                    <Hash className="w-3 h-3" />{user?.employeeId || '—'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300">
                    <Mail className="w-3 h-3" />{user?.email || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Date picker */}
            <div className="flex-shrink-0">
              <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2" htmlFor="report-date">
                <Calendar className="w-3.5 h-3.5" />Report Date <span className="text-red-400">*</span>
              </label>
              <input
                id="report-date"
                type="date"
                className="border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
          </div>
        </div>

        <TrackerForm value={tracker} onChange={setTracker} countryTargets={countryTargets} />

        <div className="flex gap-3">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Send className="w-4 h-4" />
                Submit Report
              </span>
            )}
          </button>
          <button type="button" onClick={() => navigate('/my-reports')} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  );
};

export default SubmitReport;
