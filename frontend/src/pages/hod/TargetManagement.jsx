import { useState, useEffect } from 'react';
import { Edit2, Save, X } from 'lucide-react';
import { targetsAPI } from '../../api/targets';
import { COUNTRIES } from '../../constants/tracker';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/helpers';

const TARGET_FIELDS = [
  { key: 'coachingTarget', achievedKey: 'coachingAchieved', label: 'Coaching' },
  { key: 'admissionTarget', achievedKey: 'admissionAchieved', label: 'Admission' },
  { key: 'revenueTarget', achievedKey: 'revenueAchieved', label: 'Revenue (₹)' },
];

const emptyForm = () => ({ coachingTarget: '', admissionTarget: '', revenueTarget: '' });

const now = new Date();
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const TargetManagement = () => {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - 1 + i);

  const fetchTable = async () => {
    setLoading(true);
    try {
      const res = await targetsAPI.getTable(year, month, country);
      setRows(res.data.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTable(); }, [year, month, country]);

  const openEdit = (row) => {
    const t = row.target;
    setForm(t
      ? { coachingTarget: t.coachingTarget ?? '', admissionTarget: t.admissionTarget ?? '', revenueTarget: t.revenueTarget ?? '' }
      : emptyForm());
    setEditingId(row.user._id);
  };

  const cancelEdit = () => { setEditingId(null); setForm(emptyForm()); };

  const handleSave = async (userId) => {
    setSaving(true);
    try {
      await targetsAPI.upsert({
        userId, country, year, month,
        coachingTarget: Number(form.coachingTarget) || 0,
        admissionTarget: Number(form.admissionTarget) || 0,
        revenueTarget: Number(form.revenueTarget) || 0,
      });
      toast.success('Target saved');
      setEditingId(null);
      fetchTable();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Monthly Targets</h1>
          <p className="text-xs text-gray-400 mt-0.5">Coaching / Admission / Revenue targets, per country · achieved is month-to-date from daily reports</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select className="input-field w-auto text-sm" value={country} onChange={(e) => setCountry(e.target.value)}>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="input-field w-auto text-sm" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="input-field w-auto text-sm" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <LoadingSpinner className="py-16" />
        ) : rows.length === 0 ? (
          <p className="text-center text-gray-500 py-12">No Counsellors found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Counsellor</th>
                  {TARGET_FIELDS.map((f) => (
                    <th key={f.key} className="px-3 py-3 text-center font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {f.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {rows.map((row) => {
                  const isEditing = editingId === row.user._id;
                  return (
                    <tr key={row.user._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800 dark:text-gray-200">{row.user.name}</p>
                        <p className="text-xs text-gray-400">{row.user.departmentId?.name || '—'}</p>
                      </td>

                      {TARGET_FIELDS.map((f) => (
                        <td key={f.key} className="px-3 py-3 text-center">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              placeholder="Target"
                              className="input-field text-center w-24 py-1 px-1 text-sm"
                              value={form[f.key]}
                              onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                            />
                          ) : (
                            <div>
                              <span className={`font-semibold ${row.target ? 'text-gray-800 dark:text-gray-200' : 'text-gray-300 dark:text-gray-600'}`}>
                                {row.target?.[f.key] || 0}
                              </span>
                              <p className="text-xs text-gray-400">achieved {row.achieved?.[f.achievedKey] || 0}</p>
                            </div>
                          )}
                        </td>
                      ))}

                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <button onClick={() => handleSave(row.user._id)} disabled={saving}
                              className="p-1.5 rounded text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20">
                              <Save className="w-4 h-4" />
                            </button>
                            <button onClick={cancelEdit}
                              className="p-1.5 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => openEdit(row)}
                            className="p-1.5 rounded text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TargetManagement;
