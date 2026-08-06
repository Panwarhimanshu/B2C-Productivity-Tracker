import { useState, useEffect } from 'react';
import { Edit2, Save, X, ChevronDown, ChevronUp } from 'lucide-react';
import { targetsAPI } from '../../api/targets';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/helpers';

const WORKING_DAYS = 25;
const TOTAL_DAYS   = WORKING_DAYS * 12; // 300

const TARGET_FIELDS = [
  { key: 'profiles',        label: 'Profiles',           hint: '' },
  { key: 'wt',              label: 'WT',                 hint: '' },
  { key: 'visaServices',    label: 'Visa Services',      hint: '25% of WT' },
  { key: 'sop',             label: 'SOP',                hint: '15% of Profiles' },
  { key: 'educationLoan',   label: 'Education Loan',     hint: '25% of WT' },
  { key: 'gic',             label: 'GIC',                hint: '50% of Canada WT' },
  { key: 'blockAccount',    label: 'Block Account',      hint: '50% of Germany WT' },
  { key: 'forexRemittance', label: 'Forex / Remittance', hint: '5 / Month' },
  { key: 'insurance',       label: 'Insurance',          hint: '2 / Month' },
];

const round1 = (n) => Math.round(n * 10) / 10;
const round2 = (n) => Math.round(n * 100) / 100;

const derived = (yearly) => ({
  monthly: round1(yearly / 12),
  daily:   Math.round(yearly / TOTAL_DAYS),
});

const emptyForm = () => Object.fromEntries(TARGET_FIELDS.map((f) => [f.key, '']));

const now = new Date();

const TargetManagement = () => {
  const [year, setYear] = useState(now.getFullYear());
  const [view, setView] = useState('yearly'); // 'yearly' | 'monthly' | 'daily'
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState({});

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - 1 + i);

  const fetchTable = async () => {
    setLoading(true);
    try {
      const res = await targetsAPI.getTable(year);
      setRows(res.data.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTable(); }, [year]);

  const openEdit = (row) => {
    const t = row.target;
    setForm(t ? Object.fromEntries(TARGET_FIELDS.map((f) => [f.key, t[f.key] ?? ''])) : emptyForm());
    setEditingId(row.user._id);
  };

  const cancelEdit = () => { setEditingId(null); setForm(emptyForm()); };

  const handleSave = async (userId) => {
    setSaving(true);
    try {
      await targetsAPI.upsert({
        userId, year,
        ...Object.fromEntries(TARGET_FIELDS.map((f) => [f.key, Number(form[f.key]) || 0])),
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

  const displayVal = (row, fieldKey) => {
    if (!row.target) return '—';
    const y = row.target[fieldKey] || 0;
    if (view === 'yearly')  return y;
    if (view === 'monthly') return derived(y).monthly;
    return derived(y).daily;
  };

  const viewLabel = { yearly: 'Yearly', monthly: 'Monthly', daily: 'Daily' };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Monthly Targets</h1>
          <p className="text-xs text-gray-400 mt-0.5">{WORKING_DAYS} working days/month · {TOTAL_DAYS} days/year</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Period toggle */}
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-sm">
            {['daily', 'monthly', 'yearly'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 capitalize transition-colors ${
                  view === v
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {viewLabel[v]}
              </button>
            ))}
          </div>
          {/* Year picker */}
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
                      <div>{f.label}</div>
                      {f.hint && <div className="text-xs font-normal text-gray-400">({f.hint})</div>}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {rows.map((row) => {
                  const isEditing = editingId === row.user._id;
                  const isExpanded = expanded[row.user._id];

                  return (
                    <>
                      <tr key={row.user._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <div>
                              <p className="font-medium text-gray-800 dark:text-gray-200">{row.user.name}</p>
                              <p className="text-xs text-gray-400">{row.user.departmentId?.name || '—'}</p>
                            </div>
                          </div>
                        </td>

                        {TARGET_FIELDS.map((f) => (
                          <td key={f.key} className="px-3 py-3 text-center">
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                placeholder="Yearly"
                                className="input-field text-center w-20 py-1 px-1 text-sm"
                                value={form[f.key]}
                                onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                              />
                            ) : (
                              <div>
                                <span className={`font-semibold ${row.target ? 'text-gray-800 dark:text-gray-200' : 'text-gray-300 dark:text-gray-600'}`}>
                                  {displayVal(row, f.key)}
                                </span>
                                {/* Show derived hint below */}
                                {row.target && view === 'yearly' && (
                                  <p className="text-xs text-gray-400">
                                    {derived(row.target[f.key] || 0).monthly}/mo · {derived(row.target[f.key] || 0).daily}/day
                                  </p>
                                )}
                                {row.target && view === 'monthly' && (
                                  <p className="text-xs text-gray-400">
                                    {row.target[f.key] || 0}/yr
                                  </p>
                                )}
                                {row.target && view === 'daily' && (
                                  <p className="text-xs text-gray-400">
                                    {derived(row.target[f.key] || 0).monthly}/mo
                                  </p>
                                )}
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

                      {/* Inline derived breakdown when editing */}
                      {isEditing && (
                        <tr className="bg-blue-50 dark:bg-blue-900/10">
                          <td className="px-4 py-2 text-xs text-primary-600 dark:text-primary-400 font-medium">Auto-calculated</td>
                          {TARGET_FIELDS.map((f) => {
                            const y = Number(form[f.key]) || 0;
                            return (
                              <td key={f.key} className="px-3 py-2 text-center">
                                <p className="text-xs text-gray-500">{derived(y).monthly}/mo</p>
                                <p className="text-xs text-gray-400">{derived(y).daily}/day</p>
                              </td>
                            );
                          })}
                          <td />
                        </tr>
                      )}
                    </>
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
