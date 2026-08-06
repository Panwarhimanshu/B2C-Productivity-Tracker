import { useState, useEffect } from 'react';
import { Users, FileText, TrendingUp, MapPin, Building2 } from 'lucide-react';
import { reportsAPI } from '../../api/reports';
import { usersAPI } from '../../api/users';
import { departmentsAPI } from '../../api/departments';
import KPICard from '../../components/dashboard/KPICard';
import PerformanceChart from '../../components/dashboard/PerformanceChart';
import RecentReports from '../../components/dashboard/RecentReports';
import TrackerSummary from '../../components/dashboard/TrackerSummary';
import { PERIODS } from '../../utils/constants';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const OrgDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [summary, setSummary] = useState(null);
  const [reports, setReports] = useState([]);
  const [counts, setCounts] = useState({ users: 0, departments: 0 });
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      reportsAPI.getAnalytics({ period }),
      reportsAPI.getSummary({ period }),
      reportsAPI.getAll({ period, limit: 10 }),
      usersAPI.getAll({ limit: 1 }),
      departmentsAPI.getAll(),
    ])
      .then(([analyticsRes, summaryRes, reportsRes, usersRes, deptRes]) => {
        setAnalytics(analyticsRes.data.data);
        setSummary(summaryRes.data.data);
        setReports(reportsRes.data.data);
        setCounts({ users: usersRes.data.pagination?.total || 0, departments: deptRes.data.data?.length || 0 });
      })
      .finally(() => setLoading(false));
  }, [period]);

  const analyticsSummary = analytics?.summary || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Organisation Dashboard</h1>
        <select className="input-field w-auto text-sm" value={period} onChange={(e) => setPeriod(e.target.value)}>
          {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      {loading ? <LoadingSpinner className="py-20" /> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard title="Total Users" value={counts.users} icon={Users} color="blue" />
            <KPICard title="Total Reports" value={analyticsSummary.totalReports} icon={FileText} color="green" />
            <KPICard title="Applications" value={analyticsSummary.totalTasks} icon={TrendingUp} color="purple" />
            <KPICard title="Active Departments" value={counts.departments} icon={MapPin} color="yellow" />
          </div>

          {analytics?.dailyBreakdown?.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PerformanceChart
                title="Organization-Wide Reports"
                data={analytics.dailyBreakdown}
                type="area"
                dataKeys={[{ key: 'count', name: 'Reports', color: '#2563eb' }]}
              />
              <PerformanceChart
                title="Daily Tasks Across Teams"
                data={analytics.dailyBreakdown}
                type="bar"
                dataKeys={[{ key: 'tasks', name: 'Tasks', color: '#dc2626' }]}
              />
            </div>
          )}

          <TrackerSummary summary={summary} />

          <RecentReports reports={reports} showUser />
        </>
      )}
    </div>
  );
};

export default OrgDashboard;
