import { useState, useEffect } from 'react';
import { History } from 'lucide-react';
import { reportsAPI } from '../../api/reports';
import { PERIODS, LOG_ACTION_LABELS, LOG_ACTION_COLORS, ROLE_LABELS } from '../../utils/constants';
import { formatDate } from '../../utils/helpers';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const ReportLogs = () => {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({});
  const [period, setPeriod] = useState('weekly');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await reportsAPI.getLogs({ period, role: role || undefined, page, limit: 25 });
      setLogs(res.data.data);
      setPagination(res.data.pagination);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [period, role, page]);

  const setFilter = (setter) => (value) => { setter(value); setPage(1); };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Report Logs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Audit trail of report submissions and edits</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="input-field w-auto text-sm" value={period} onChange={(e) => setFilter(setPeriod)(e.target.value)}>
            {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <select className="input-field w-auto text-sm" value={role} onChange={(e) => setFilter(setRole)(e.target.value)}>
            <option value="">All Roles</option>
            <option value="COUNSELLOR">Counsellor</option>
            <option value="HOD">Head of Department</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? <LoadingSpinner className="py-16" /> : logs.length === 0 ? (
          <div className="text-center py-16">
            <History className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No log entries found for this filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  {['Timestamp', 'Performed By', 'Action', 'Report Owner', 'Report Date', 'IP Address'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDate(log.createdAt, 'dd MMM yyyy, hh:mm a')}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 dark:text-gray-200">{log.performedBy?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{log.performedBy?.role ? ROLE_LABELS[log.performedBy.role] : ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${LOG_ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                        {LOG_ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{log.reportOwner?.name || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{log.reportDate ? formatDate(log.reportDate) : '-'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{log.ipAddress || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-500">{logs.length} of {pagination.total} entries</p>
          <div className="flex gap-2">
            <button className="btn-secondary py-1 px-3" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <span className="px-3 py-1 text-gray-700 dark:text-gray-300">{page}/{pagination.pages}</span>
            <button className="btn-secondary py-1 px-3" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportLogs;
