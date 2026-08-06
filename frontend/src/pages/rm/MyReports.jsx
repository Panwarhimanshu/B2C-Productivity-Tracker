import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Eye, Edit2 } from 'lucide-react';
import { reportsAPI } from '../../api/reports';
import { PERIODS, REPORT_STATUS_COLORS } from '../../utils/constants';
import { formatDate } from '../../utils/helpers';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EditReportModal from '../../components/reports/EditReportModal';

const todayStr = () => new Date().toISOString().split('T')[0];
const isToday = (dateStr) => new Date(dateStr).toISOString().split('T')[0] === todayStr();

const MyReports = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState({});
  const [period, setPeriod] = useState('monthly');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState(null);
  const [readOnly, setReadOnly] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await reportsAPI.getMy({ period, page, limit: 15 });
      setReports(res.data.data);
      setPagination(res.data.pagination);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, [period, page]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Reports</h1>
        <div className="flex items-center gap-2">
          <select className="input-field w-auto text-sm" value={period} onChange={(e) => { setPeriod(e.target.value); setPage(1); }}>
            {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <button onClick={fetchReports} className="btn-secondary p-2"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => navigate('/submit-report')} className="btn-primary"><Plus className="w-4 h-4" />New</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <LoadingSpinner className="py-16" />
        ) : reports.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-500 dark:text-gray-400">No reports found for this period.</p>
            <button onClick={() => navigate('/submit-report')} className="btn-primary mt-4">Submit Your First Report</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  {['Date', 'Admissions', 'Status', 'Modified By', 'Submitted At', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {reports.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{formatDate(r.date)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.totalTasksCount || 0}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${REPORT_STATUS_COLORS[r.status]}`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.modifiedBy?.name || '-'}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-500">{formatDate(r.createdAt, 'dd MMM yyyy, HH:mm')}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => { setActiveReport(r); setReadOnly(true); }} className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        {isToday(r.date) && (
                          <button onClick={() => { setActiveReport(r); setReadOnly(false); }} className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-500 dark:text-gray-400">
            Showing {reports.length} of {pagination.total} reports
          </p>
          <div className="flex gap-2">
            <button className="btn-secondary py-1 px-3" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <span className="px-3 py-1 text-gray-700 dark:text-gray-300">{page} / {pagination.pages}</span>
            <button className="btn-secondary py-1 px-3" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      )}

      {activeReport && (
        <EditReportModal
          report={activeReport}
          readOnly={readOnly}
          onClose={() => setActiveReport(null)}
          onSaved={() => { setActiveReport(null); fetchReports(); }}
        />
      )}
    </div>
  );
};

export default MyReports;
