import { useState, useEffect } from 'react';
import { Download, Edit2, Eye } from 'lucide-react';
import { reportsAPI } from '../../api/reports';
import { usersAPI } from '../../api/users';
import { departmentsAPI } from '../../api/departments';
import { PERIODS, REPORT_STATUS_COLORS } from '../../utils/constants';
import { formatDate, downloadBlob, getErrorMessage } from '../../utils/helpers';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EditReportModal from '../../components/reports/EditReportModal';
import toast from 'react-hot-toast';

const AllReports = () => {
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({ period: 'monthly', userId: '', departmentId: '' });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editReport, setEditReport] = useState(null);
  const [viewOnly, setViewOnly] = useState(false);

  const fetchMeta = async () => {
    const [usersRes, deptRes] = await Promise.all([
      usersAPI.getAll({ role: 'COUNSELLOR' }),
      departmentsAPI.getAll(),
    ]);
    setUsers(usersRes.data.data);
    setDepartments(deptRes.data.data);
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await reportsAPI.getAll({ ...filters, page, limit: 15 });
      setReports(res.data.data);
      setPagination(res.data.pagination);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMeta(); }, []);
  useEffect(() => { fetchReports(); }, [filters, page]);

  const setFilter = (key, value) => { setFilters((f) => ({ ...f, [key]: value })); setPage(1); };

  const handleExport = async () => {
    try {
      const res = await reportsAPI.export(filters);
      downloadBlob(res.data, `all_reports_${filters.period}.xlsx`);
      toast.success('Report exported');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">All Reports</h1>
        <div className="flex flex-wrap gap-2">
          <select className="input-field w-auto text-sm" value={filters.period} onChange={(e) => setFilter('period', e.target.value)}>
            {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <select className="input-field w-auto text-sm" value={filters.departmentId} onChange={(e) => setFilter('departmentId', e.target.value)}>
            <option value="">All Departments</option>
            {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          <select className="input-field w-auto text-sm" value={filters.userId} onChange={(e) => setFilter('userId', e.target.value)}>
            <option value="">All Employees</option>
            {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
          <button onClick={handleExport} className="btn-secondary">
            <Download className="w-4 h-4" />Export
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? <LoadingSpinner className="py-16" /> : reports.length === 0 ? (
          <p className="text-center text-gray-500 py-16">No reports found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  {['Employee', 'Date', 'Applications', 'Status', 'Modified By', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {reports.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 dark:text-gray-200">{r.userId?.name}</p>
                      <p className="text-xs text-gray-500">{r.userId?.employeeId} · {r.userId?.role}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatDate(r.date)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.totalTasksCount || 0}</td>
                    <td className="px-4 py-3"><span className={`badge ${REPORT_STATUS_COLORS[r.status]}`}>{r.status}</span></td>
                    <td className="px-4 py-3 text-gray-500">{r.modifiedBy?.name || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => { setEditReport(r); setViewOnly(true); }} className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setEditReport(r); setViewOnly(false); }} className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-500">{reports.length} of {pagination.total} records</p>
          <div className="flex gap-2">
            <button className="btn-secondary py-1 px-3" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <span className="px-3 py-1 text-gray-700 dark:text-gray-300">{page}/{pagination.pages}</span>
            <button className="btn-secondary py-1 px-3" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      )}

      {editReport && (
        <EditReportModal report={editReport} readOnly={viewOnly} onClose={() => setEditReport(null)} onSaved={() => { setEditReport(null); fetchReports(); }} />
      )}
    </div>
  );
};

export default AllReports;
