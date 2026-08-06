import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, TrendingUp, CheckCircle, Clock, Plus, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import KPICard from '../components/dashboard/KPICard';
import PerformanceChart from '../components/dashboard/PerformanceChart';
import RecentReports from '../components/dashboard/RecentReports';
import TrackerSummary from '../components/dashboard/TrackerSummary';
import CountryTargetProgress from '../components/dashboard/CountryTargetProgress';
import { reportsAPI } from '../api/reports';
import { targetsAPI } from '../api/targets';
import { PERIODS } from '../utils/constants';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics]       = useState(null);
  const [summary, setSummary]           = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [period, setPeriod]             = useState('monthly');
  const [loading, setLoading]           = useState(true);
  // Counsellor-only monthly target state
  const [countries, setCountries]       = useState([]);
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

  // Fetch this month's targets + today's report for Counsellor only
  useEffect(() => {
    if (user.role !== 'COUNSELLOR') return;
    const now = new Date();
    setTargetLoading(true);
    Promise.all([
      targetsAPI.getMyWithActuals(now.getMonth() + 1, now.getFullYear()),
      reportsAPI.getMy({ period: 'daily', limit: 1 }),
    ])
      .then(([tRes, rRes]) => {
        setCountries(tRes.data.data?.countries || []);
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

      {/* ── Monthly Target Progress (Counsellor only) ── */}
      {user?.role === 'COUNSELLOR' && (
        <MonthlyTargetCard
          countries={countries}
          todayReport={todayReport}
          loading={targetLoading}
          onSubmit={() => navigate('/submit-report')}
        />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Reports" value={analyticsSummary.totalReports} icon={FileText} color="blue" subtitle={`For selected period`} />
        <KPICard title="Admissions" value={analyticsSummary.totalTasks} icon={TrendingUp} color="green" />
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

const MonthlyTargetCard = ({ countries, todayReport, loading, onSubmit }) => {
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const reportedAt = todayReport
    ? new Date(todayReport.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="card p-5 border-l-4 border-primary-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h2 className="text-sm font-bold text-gray-800 dark:text-white">This Month's Targets</h2>
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
      ) : (
        <CountryTargetProgress countries={countries} emptyMessage="No targets set yet — ask your admin to set this month's targets." />
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
