import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, TrendingUp, CheckCircle, Clock, Plus, CheckCircle2, AlertCircle, XCircle, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import KPICard from '../components/dashboard/KPICard';
import PerformanceChart from '../components/dashboard/PerformanceChart';
import RecentReports from '../components/dashboard/RecentReports';
import TrackerSummary from '../components/dashboard/TrackerSummary';
import { reportsAPI } from '../api/reports';
import { targetsAPI } from '../api/targets';
import { PERIODS } from '../utils/constants';

// Daily target fields — only first 3 have actuals from daily reports currently
const DAILY_TARGET_FIELDS = [
  { key: 'profiles',        label: 'Profiles',           tracked: true },
  { key: 'wt',              label: 'WT',                 tracked: true },
  { key: 'visaServices',    label: 'Visa Services',      tracked: true },
  { key: 'sop',             label: 'SOP',                tracked: false },
  { key: 'educationLoan',   label: 'Education Loan',     tracked: false },
  { key: 'gic',             label: 'GIC',                tracked: false },
  { key: 'blockAccount',    label: 'Block Account',      tracked: false },
  { key: 'forexRemittance', label: 'Forex/Remittance',   tracked: false },
  { key: 'insurance',       label: 'Insurance',          tracked: false },
];

const TOTAL_DAYS = 25 * 12; // 300
const round2 = (n) => Math.round(n * 100) / 100;

const todayActualsFromReport = (report) => {
  if (!report) return {};
  const profile = Array.isArray(report.tasks?.profile) ? report.tasks.profile : [];
  return {
    // Use achieved (EOD) if filled, else fall back to committed (morning)
    profiles:     profile.reduce((s, r) => s + (Number(r?.achieved) || Number(r?.committed) || 0), 0),
    wt:           profile.reduce((s, r) => s + (Number(r?.wt)       || 0), 0),
    visaServices: profile.reduce((s, r) => s + (Number(r?.visa)     || 0), 0),
  };
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics]       = useState(null);
  const [summary, setSummary]           = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [period, setPeriod]             = useState('monthly');
  const [loading, setLoading]           = useState(true);
  // Counsellor-only daily target state
  const [dailyTarget, setDailyTarget]   = useState(null);
  const [todayReport, setTodayReport]   = useState(null);
  const [targetLoading, setTargetLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [analyticsRes, summaryRes, reportsRes] = await Promise.all([
          reportsAPI.getAnalytics({ period }),
          reportsAPI.getSummary({ period }),
          user.role === 'COUNSELLOR'
            ? reportsAPI.getMy({ period, limit: 8 })
            : reportsAPI.getAll({ period, limit: 8 }),
        ]);
        setAnalytics(analyticsRes.data.data);
        setSummary(summaryRes.data.data);
        setRecentReports(reportsRes.data.data);
      } catch {
        // fail silently — loading state handles it
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period, user.role]);

  // Fetch daily target + today's report for Counsellor only
  useEffect(() => {
    if (user.role !== 'COUNSELLOR') return;
    const now = new Date();
    setTargetLoading(true);
    Promise.all([
      targetsAPI.getMyWithActuals(now.getMonth() + 1, now.getFullYear()),
      reportsAPI.getMy({ period: 'daily', limit: 1 }),
    ])
      .then(([tRes, rRes]) => {
        setDailyTarget(tRes.data.data?.target || null);
        setTodayReport(rRes.data.data?.[0] || null);
      })
      .catch(() => {})
      .finally(() => setTargetLoading(false));
  }, [user.role]);

  const analyticsSummary = analytics?.summary || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Good {getGreeting()}, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Here's your performance overview
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="input-field w-auto text-sm"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          {user?.role === 'COUNSELLOR' && (
            <button onClick={() => navigate('/submit-report')} className="btn-primary">
              <Plus className="w-4 h-4" />
              Submit Report
            </button>
          )}
        </div>
      </div>

      {/* ── Daily Target Checklist (Counsellor only) ── */}
      {user?.role === 'COUNSELLOR' && (
        <DailyTargetCard
          target={dailyTarget}
          todayReport={todayReport}
          loading={targetLoading}
          onSubmit={() => navigate('/submit-report')}
        />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Reports" value={analyticsSummary.totalReports} icon={FileText} color="blue" subtitle={`For selected period`} />
        <KPICard title="Applications" value={analyticsSummary.totalTasks} icon={TrendingUp} color="green" />
        <KPICard title="Submitted" value={analyticsSummary.submittedCount} icon={CheckCircle} color="purple" />
        <KPICard title="Modified" value={analyticsSummary.modifiedCount} icon={Clock} color="yellow" />
      </div>

      {/* Charts */}
      {!loading && analytics?.dailyBreakdown?.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PerformanceChart
            title="Daily Reports Submitted"
            data={analytics.dailyBreakdown}
            type="area"
            dataKeys={[{ key: 'count', name: 'Reports', color: '#2563eb' }]}
          />
          <PerformanceChart
            title="Daily Tasks Completed"
            data={analytics.dailyBreakdown}
            type="bar"
            dataKeys={[{ key: 'tasks', name: 'Tasks', color: '#16a34a' }]}
          />
        </div>
      )}

      {/* KPI rollup (per-country, communication, follow-up) */}
      {!loading && <TrackerSummary summary={summary} />}

      {/* Recent Reports */}
      <RecentReports reports={recentReports} showUser={user?.role !== 'COUNSELLOR'} />
    </div>
  );
};

const DailyTargetCard = ({ target, todayReport, loading, onSubmit }) => {
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const actuals = todayActualsFromReport(todayReport);
  const reportedAt = todayReport
    ? new Date(todayReport.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : null;

  const StatusIcon = ({ actual, target: t, tracked }) => {
    if (!tracked) return <span className="text-xs text-gray-300 dark:text-gray-600">—</span>;
    if (t <= 0)   return <span className="text-xs text-gray-400">No target</span>;
    if (actual >= t)
      return <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />;
    if (actual >= t * 0.7)
      return <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />;
    return <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />;
  };

  const allTrackedDone = !loading && target && DAILY_TARGET_FIELDS
    .filter((f) => f.tracked && (target[f.key] || 0) > 0)
    .every((f) => (actuals[f.key] || 0) >= round2((target[f.key] || 0) / TOTAL_DAYS));

  return (
    <div className={`card p-5 border-l-4 ${allTrackedDone ? 'border-green-500' : 'border-primary-500'}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h2 className="text-sm font-bold text-gray-800 dark:text-white">Today's Target Checklist</h2>
            {allTrackedDone && (
              <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold">All Done! 🎉</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{today}</p>
        </div>
        {!todayReport ? (
          <button onClick={onSubmit} className="btn-primary text-xs py-1.5 px-3 self-start sm:self-auto">
            <Plus className="w-3.5 h-3.5" /> Submit Today's Report
          </button>
        ) : (
          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-full">
            ✅ Submitted at {reportedAt}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6 text-sm text-gray-400">Loading targets…</div>
      ) : !target ? (
        <p className="text-sm text-gray-400 text-center py-4">No targets set yet — ask your admin to set yearly targets.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {DAILY_TARGET_FIELDS.map((f) => {
            const dailyT = Math.round((target[f.key] || 0) / TOTAL_DAYS);
            const actual = f.tracked ? (actuals[f.key] ?? 0) : null;
            const pct    = f.tracked && dailyT > 0 ? Math.min(Math.round((actual / dailyT) * 100), 100) : 0;
            const barColor = pct >= 100 ? 'bg-green-500' : pct >= 70 ? 'bg-yellow-400' : 'bg-red-400';

            return (
              <div
                key={f.key}
                className={`flex items-center gap-3 p-2.5 rounded-lg ${
                  f.tracked
                    ? 'bg-gray-50 dark:bg-gray-700/40'
                    : 'bg-gray-50/50 dark:bg-gray-800/30 opacity-60'
                }`}
              >
                <StatusIcon actual={actual} target={dailyT} tracked={f.tracked} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{f.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 ml-1 flex-shrink-0">
                      {f.tracked ? `${actual} / ${dailyT}` : `Target: ${dailyT}`}
                    </p>
                  </div>
                  {f.tracked && dailyT > 0 ? (
                    <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                  ) : (
                    <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
};

export default Dashboard;
