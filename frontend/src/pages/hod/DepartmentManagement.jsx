import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Building2, Users } from 'lucide-react';
import { departmentsAPI } from '../../api/departments';
import { usersAPI } from '../../api/users';
import { formatDate, getErrorMessage } from '../../utils/helpers';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const emptyForm = { name: '', description: '' };

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [hods, setHods] = useState([]);
  const [counsellors, setCounsellors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedHodIds, setSelectedHodIds] = useState([]);
  const [selectedCounsellorIds, setSelectedCounsellorIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deptRes, hodRes, counsellorRes] = await Promise.all([
        departmentsAPI.getAll(),
        usersAPI.getAll({ role: 'HOD', limit: 500 }),
        usersAPI.getAll({ role: 'COUNSELLOR', limit: 500 }),
      ]);
      setDepartments(deptRes.data.data);
      setHods(hodRes.data.data);
      setCounsellors(counsellorRes.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const membersOf = (deptId) => ({
    hods: hods.filter((h) => h.departmentId?._id === deptId),
    counsellors: counsellors.filter((c) => c.departmentId?._id === deptId),
  });

  const openCreate = () => {
    setForm(emptyForm);
    setSelectedHodIds([]);
    setSelectedCounsellorIds([]);
    setEditingDept(null);
    setShowForm(true);
  };

  const openEdit = (dept) => {
    setForm({ name: dept.name, description: dept.description || '' });
    const { hods: deptHods, counsellors: deptCounsellors } = membersOf(dept._id);
    setSelectedHodIds(deptHods.map((h) => h._id));
    setSelectedCounsellorIds(deptCounsellors.map((c) => c._id));
    setEditingDept(dept);
    setShowForm(true);
  };

  const toggleId = (list, setList, id) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let deptId = editingDept?._id;
      if (editingDept) {
        await departmentsAPI.update(editingDept._id, form);
      } else {
        const res = await departmentsAPI.create(form);
        deptId = res.data.data._id;
      }

      const { hods: prevHods, counsellors: prevCounsellors } = editingDept
        ? membersOf(editingDept._id)
        : { hods: [], counsellors: [] };
      const prevHodIds = prevHods.map((h) => h._id);
      const prevCounsellorIds = prevCounsellors.map((c) => c._id);

      const additions = [
        ...selectedHodIds.filter((id) => !prevHodIds.includes(id)),
        ...selectedCounsellorIds.filter((id) => !prevCounsellorIds.includes(id)),
      ];
      const removals = [
        ...prevHodIds.filter((id) => !selectedHodIds.includes(id)),
        ...prevCounsellorIds.filter((id) => !selectedCounsellorIds.includes(id)),
      ];

      await Promise.all([
        ...additions.map((id) => usersAPI.updateDepartment(id, deptId)),
        ...removals.map((id) => usersAPI.updateDepartment(id, null)),
      ]);

      toast.success(editingDept ? 'Department updated' : 'Department created');
      setShowForm(false);
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dept) => {
    if (!window.confirm(`Delete department "${dept.name}"? Members mapped to it will become unassigned.`)) return;
    try {
      await departmentsAPI.delete(dept._id);
      toast.success('Department deleted');
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Department Management</h1>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" />Add Department</button>
      </div>

      {loading ? <LoadingSpinner className="py-20" /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => {
            const { hods: deptHods, counsellors: deptCounsellors } = membersOf(dept._id);
            return (
              <div key={dept._id} className="card p-5 flex items-start justify-between">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 bg-primary-50 dark:bg-primary-900/30 rounded-lg mt-0.5">
                    <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{dept.name}</h3>
                    {dept.description && <p className="text-xs text-gray-500 mt-0.5">{dept.description}</p>}
                    <p className="text-xs text-gray-400 mt-1">Created {formatDate(dept.createdAt)}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="badge bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        <Users className="w-3 h-3 mr-1" />{deptHods.length} HOD{deptHods.length === 1 ? '' : 's'}
                      </span>
                      <span className="badge bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                        <Users className="w-3 h-3 mr-1" />{deptCounsellors.length} Counsellor{deptCounsellors.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(dept)} className="p-1.5 rounded text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(dept)} className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {departments.length === 0 && (
            <div className="col-span-3 py-16 text-center">
              <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No departments created yet</p>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {editingDept ? 'Edit Department' : 'Create Department'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <Plus className="w-5 h-5 text-gray-500 rotate-45" />
              </button>
            </div>
            <form id="deptForm" onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-4">
              <div>
                <label className="label">Department Name <span className="text-red-500">*</span></label>
                <input type="text" className="input-field" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="e.g. North, South..." />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input-field resize-none" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional description..." />
              </div>

              <div>
                <label className="label !mb-2">HODs in this department</label>
                {hods.length === 0 ? (
                  <p className="text-xs text-gray-400">No HOD users yet.</p>
                ) : (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700 max-h-40 overflow-y-auto">
                    {hods.map((h) => (
                      <label key={h._id} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40">
                        <input
                          type="checkbox"
                          checked={selectedHodIds.includes(h._id)}
                          onChange={() => toggleId(selectedHodIds, setSelectedHodIds, h._id)}
                        />
                        <span className="truncate">{h.name}</span>
                        {h.departmentId && h.departmentId._id !== editingDept?._id && (
                          <span className="text-xs text-gray-400 ml-auto flex-shrink-0">currently: {h.departmentId.name}</span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="label !mb-2">Counsellors in this department</label>
                {counsellors.length === 0 ? (
                  <p className="text-xs text-gray-400">No Counsellor users yet.</p>
                ) : (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700 max-h-40 overflow-y-auto">
                    {counsellors.map((c) => (
                      <label key={c._id} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40">
                        <input
                          type="checkbox"
                          checked={selectedCounsellorIds.includes(c._id)}
                          onChange={() => toggleId(selectedCounsellorIds, setSelectedCounsellorIds, c._id)}
                        />
                        <span className="truncate">{c.name}</span>
                        {c.departmentId && c.departmentId._id !== editingDept?._id && (
                          <span className="text-xs text-gray-400 ml-auto flex-shrink-0">currently: {c.departmentId.name}</span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </form>
            <div className="flex gap-3 p-5 border-t border-gray-200 dark:border-gray-700">
              <button type="submit" form="deptForm" className="btn-primary flex-1" disabled={saving}>
                {saving ? 'Saving...' : editingDept ? 'Update Department' : 'Create Department'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentManagement;
