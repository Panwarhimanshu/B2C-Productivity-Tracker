import { useState, useEffect } from 'react';
import { Plus, Edit2, UserX, UserCheck, Search, Upload, Download, X } from 'lucide-react';
import { usersAPI } from '../../api/users';
import { departmentsAPI } from '../../api/departments';
import { targetsAPI } from '../../api/targets';
import { ROLE_LABELS, ROLES } from '../../utils/constants';
import { COUNTRIES } from '../../constants/tracker';
import { formatDate, getErrorMessage } from '../../utils/helpers';
import { parseCSV, downloadCSV } from '../../utils/csv';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const USER_IMPORT_HEADERS = ['name', 'email', 'password', 'role', 'designation', 'employeeId', 'department', 'joiningDate'];
const TARGET_IMPORT_HEADERS = ['email', 'country', 'year', 'month', 'coachingTarget', 'admissionTarget', 'revenueTarget'];

const ImportResultSummary = ({ result, counts }) => (
  <div className="mt-2 text-xs space-y-1">
    <p className="text-gray-600 dark:text-gray-300">
      {counts.map(({ label, key }) => `${label}: ${result[key] ?? 0}`).join(' · ')}
      {result.warnings?.length > 0 && ` · Warnings: ${result.warnings.length}`}
      {result.errors?.length > 0 && ` · Errors: ${result.errors.length}`}
    </p>
    {result.errors?.length > 0 && (
      <ul className="text-red-600 dark:text-red-400 space-y-0.5 max-h-24 overflow-y-auto">
        {result.errors.map((e, i) => (
          <li key={i}>Row {e.row}{e.email ? ` (${e.email})` : ''}: {e.message}</li>
        ))}
      </ul>
    )}
    {result.warnings?.length > 0 && (
      <ul className="text-amber-600 dark:text-amber-400 space-y-0.5 max-h-24 overflow-y-auto">
        {result.warnings.map((w, i) => (
          <li key={i}>Row {w.row}{w.email ? ` (${w.email})` : ''}: {w.message}</li>
        ))}
      </ul>
    )}
  </div>
);

const emptyForm = { name: '', email: '', password: '', role: 'COUNSELLOR', designation: '', employeeId: '', departmentId: '', joiningDate: '' };

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [pagination, setPagination] = useState({});
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importingUsers, setImportingUsers] = useState(false);
  const [importingTargets, setImportingTargets] = useState(false);
  const [userImportResult, setUserImportResult] = useState(null);
  const [targetImportResult, setTargetImportResult] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, deptRes] = await Promise.all([
        usersAPI.getAll({ isActive: !showInactive, search: search || undefined, page, limit: 15 }),
        departmentsAPI.getAll(),
      ]);
      setUsers(usersRes.data.data);
      setPagination(usersRes.data.pagination);
      setDepartments(deptRes.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [showInactive, search, page]);

  const openCreate = () => { setForm(emptyForm); setEditingUser(null); setShowForm(true); };
  const openEdit = (user) => {
    setForm({
      name: user.name, email: user.email, password: '', role: user.role,
      designation: user.designation || '',
      employeeId: user.employeeId || '', departmentId: user.departmentId?._id || '',
      joiningDate: user.joiningDate ? user.joiningDate.split('T')[0] : '',
    });
    setEditingUser(user);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (!payload.departmentId) delete payload.departmentId;

      if (editingUser) {
        await usersAPI.update(editingUser._id, payload);
        toast.success('User updated');
      } else {
        await usersAPI.create(payload);
        toast.success('User created');
      }
      setShowForm(false);
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      if (user.isActive) {
        await usersAPI.hide(user._id);
        toast.success(`${user.name} deactivated`);
      } else {
        await usersAPI.reactivate(user._id);
        toast.success(`${user.name} reactivated`);
      }
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const closeImport = () => {
    setShowImport(false);
    setUserImportResult(null);
    setTargetImportResult(null);
  };

  const downloadUserSample = () => {
    downloadCSV('users-import-sample.csv', USER_IMPORT_HEADERS, [
      { name: 'Anita Verma', email: 'anita.verma@company.com', password: 'User@123', role: 'COUNSELLOR', designation: 'Counsellor', employeeId: 'C101', department: 'North', joiningDate: '2024-01-15' },
      { name: 'Priya Sharma', email: 'priya.sharma@company.com', password: 'Admin@123', role: 'HOD', designation: 'Head of Department', employeeId: 'HOD101', department: 'North', joiningDate: '2023-06-01' },
    ]);
  };

  const downloadTargetSample = () => {
    const now = new Date();
    downloadCSV('targets-import-sample.csv', TARGET_IMPORT_HEADERS, [
      { email: 'anita.verma@company.com', country: COUNTRIES[0], year: now.getFullYear(), month: now.getMonth() + 1, coachingTarget: 40, admissionTarget: 25, revenueTarget: 500000 },
    ]);
  };

  const handleUserImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportingUsers(true);
    setUserImportResult(null);
    try {
      const rows = parseCSV(await file.text());
      if (!rows.length) { toast.error('CSV is empty'); return; }
      const res = await usersAPI.importUsers(rows);
      setUserImportResult(res.data.data);
      toast.success(`Import done: ${res.data.data.created} created, ${res.data.data.updated} updated`);
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setImportingUsers(false);
    }
  };

  const handleTargetImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportingTargets(true);
    setTargetImportResult(null);
    try {
      const rows = parseCSV(await file.text());
      if (!rows.length) { toast.error('CSV is empty'); return; }
      const res = await targetsAPI.importTargets(rows);
      setTargetImportResult(res.data.data);
      toast.success(`Import done: ${res.data.data.upserted} targets saved`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setImportingTargets(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">User Management</h1>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              className="input-field pl-8 w-48 text-sm"
              placeholder="Search users..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <label className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded" />
            Inactive
          </label>
          <button onClick={() => setShowImport(true)} className="btn-secondary"><Upload className="w-4 h-4" />Import</button>
          <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" />Add User</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? <LoadingSpinner className="py-16" /> : users.length === 0 ? (
          <p className="text-center text-gray-500 py-12">No users found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  {['Name', 'Employee ID', 'Role', 'Department', 'Joined', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 dark:text-gray-200">{u.name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                      {u.designation && <p className="text-xs text-gray-400">{u.designation}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{u.employeeId || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="badge bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-300">{ROLE_LABELS[u.role]}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.departmentId?.name || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(u.joiningDate)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${u.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(u)} className="p-1.5 rounded text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleToggleActive(u)} className={`p-1.5 rounded ${u.isActive ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'}`}>
                          {u.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
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
          <p className="text-gray-500">{users.length} of {pagination.total} users</p>
          <div className="flex gap-2">
            <button className="btn-secondary py-1 px-3" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <span className="px-3 py-1 text-gray-700 dark:text-gray-300">{page}/{pagination.pages}</span>
            <button className="btn-secondary py-1 px-3" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      )}

      {/* User Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {editingUser ? 'Edit User' : 'Create User'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <Plus className="w-5 h-5 text-gray-500 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-4">
              {[
                { label: 'Full Name', key: 'name', type: 'text', required: true },
                { label: 'Email', key: 'email', type: 'email', required: true },
                { label: editingUser ? 'New Password (leave blank to keep)' : 'Password', key: 'password', type: 'password', required: !editingUser },
                { label: 'Employee ID', key: 'employeeId', type: 'text' },
                { label: 'Joining Date', key: 'joiningDate', type: 'date' },
              ].map(({ label, key, type, required }) => (
                <div key={key}>
                  <label className="label">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
                  <input type={type} className="input-field" value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} required={required} />
                </div>
              ))}
              <div>
                <label className="label">Role <span className="text-red-500">*</span></label>
                <select className="input-field" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} required>
                  {Object.entries(ROLE_LABELS).map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Designation</label>
                <input type="text" className="input-field" placeholder="e.g. Senior Relationship Manager" value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))} />
              </div>
              <div>
                <label className="label">Department</label>
                <select
                  className="input-field"
                  value={form.departmentId}
                  onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}
                >
                  <option value="">Unassigned</option>
                  {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
              </div>
            </form>
            <div className="flex gap-3 p-5 border-t border-gray-200 dark:border-gray-700">
              <button onClick={handleSubmit} className="btn-primary flex-1" disabled={saving}>
                {saving ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Bulk Import</h2>
              <button onClick={closeImport} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Import Users (Login)</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Columns: {USER_IMPORT_HEADERS.join(', ')}. The department column must match an existing department's name (see Department Management). Existing emails are updated (password kept unless a new one is given); new emails are created (password required, min 6 characters).
                </p>
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={downloadUserSample} className="btn-secondary text-xs py-1.5 px-3">
                    <Download className="w-3.5 h-3.5" />Sample CSV
                  </button>
                  <label className="btn-primary text-xs py-1.5 px-3 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />{importingUsers ? 'Importing...' : 'Upload CSV'}
                    <input type="file" accept=".csv" className="hidden" onChange={handleUserImportFile} disabled={importingUsers} />
                  </label>
                </div>
                {userImportResult && (
                  <ImportResultSummary result={userImportResult} counts={[{ label: 'Created', key: 'created' }, { label: 'Updated', key: 'updated' }]} />
                )}
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Import Targets</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Columns: {TARGET_IMPORT_HEADERS.join(', ')}. Matches existing users by email; the user must already exist.
                </p>
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={downloadTargetSample} className="btn-secondary text-xs py-1.5 px-3">
                    <Download className="w-3.5 h-3.5" />Sample CSV
                  </button>
                  <label className="btn-primary text-xs py-1.5 px-3 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />{importingTargets ? 'Importing...' : 'Upload CSV'}
                    <input type="file" accept=".csv" className="hidden" onChange={handleTargetImportFile} disabled={importingTargets} />
                  </label>
                </div>
                {targetImportResult && (
                  <ImportResultSummary result={targetImportResult} counts={[{ label: 'Saved', key: 'upserted' }]} />
                )}
              </div>
            </div>

            <div className="flex justify-end p-5 border-t border-gray-200 dark:border-gray-700">
              <button onClick={closeImport} className="btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
