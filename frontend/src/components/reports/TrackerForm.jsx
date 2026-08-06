import { useMemo } from 'react';
import {
  PROFILE_COLUMNS,
  STATUS_OPTIONS,
  COMMUNICATION_ITEMS,
  computeTotals,
} from '../../constants/tracker';

const TOTAL_DAYS = 300; // 25 days × 12 months

// Controlled editor / viewer for a Counsellor Daily Tracker payload.
// Props: value (tracker object), onChange(next), readOnly, yearlyTarget ({ profiles, wt } yearly values).
const TrackerForm = ({ value, onChange, readOnly = false, yearlyTarget = null }) => {
  const targets = yearlyTarget ? {
    daily:   { profiles: Math.round((yearlyTarget.profiles || 0) / TOTAL_DAYS), wt: Math.round((yearlyTarget.wt || 0) / TOTAL_DAYS) },
    monthly: { profiles: Math.round((yearlyTarget.profiles || 0) / 12),         wt: Math.round((yearlyTarget.wt || 0) / 12)         },
    yearly:  { profiles: yearlyTarget.profiles || 0,                             wt: yearlyTarget.wt || 0                            },
  } : null;
  const data = value;
  const totals = useMemo(() => computeTotals(data), [data]);

  const emit = (next) => onChange && onChange(next);

  const autoStatus = (committed, achieved) => {
    const c = Number(committed) || 0;
    const a = Number(achieved) || 0;
    if (c === 0) return '';
    if (a >= c) return 'Achieved';
    return 'At Risk';
  };

  const updateProfile = (idx, key, val) => {
    const profile = data.profile.map((row, i) => {
      if (i !== idx) return row;
      const updated = { ...row, [key]: val };
      if (key === 'committed' || key === 'achieved') {
        updated.status = autoStatus(
          key === 'committed' ? val : row.committed,
          key === 'achieved'  ? val : row.achieved,
        );
      }
      return updated;
    });
    emit({ ...data, profile });
  };
  const updateFollowUp = (idx, key, val) => {
    const followUpTasks = data.followUpTasks.map((row, i) => (i === idx ? { ...row, [key]: val } : row));
    emit({ ...data, followUpTasks });
  };
  const updateComm = (key, val) => emit({ ...data, communication: { ...data.communication, [key]: val } });
  const updateExtra = (key, val) => emit({ ...data, extraInitiatives: { ...data.extraInitiatives, [key]: val } });

  const COL_GROUP = {
    committed: 'blue', achieved: 'green', wt: 'green',
    status: 'amber', dropOff: 'amber', reason: 'amber',
    applications: 'violet', offer: 'violet', visa: 'violet',
    rejection: 'violet', refund: 'violet', defer: 'violet', commission: 'violet',
  };
  const COL_HEADER_CLS = {
    blue:   'bg-blue-50   dark:bg-blue-900/30   text-blue-700   dark:text-blue-300',
    green:  'bg-green-50  dark:bg-green-900/30  text-green-700  dark:text-green-300',
    amber:  'bg-amber-50  dark:bg-amber-900/30  text-amber-700  dark:text-amber-300',
    violet: 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
  };
  const STATUS_CLS = {
    'Achieved': 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700',
    'On Track': 'bg-blue-100  dark:bg-blue-900/40  text-blue-700  dark:text-blue-300  border-blue-200  dark:border-blue-700',
    'At Risk':  'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700',
    '':         'bg-gray-50   dark:bg-gray-700      text-gray-400                      border-gray-200  dark:border-gray-600',
  };

  const cellInput = (val, onChangeVal, type = 'number') => {
    if (type === 'status') {
      const cls = STATUS_CLS[val || ''] || STATUS_CLS[''];
      if (readOnly) {
        return val
          ? <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}>{val}</span>
          : <span className="text-gray-300 dark:text-gray-600">—</span>;
      }
      return (
        <select
          className={`text-[11px] font-semibold border rounded-full px-2 py-0.5 cursor-pointer outline-none focus:ring-2 focus:ring-primary-400 transition-colors ${cls}`}
          value={val || ''}
          onChange={(e) => onChangeVal(e.target.value)}
        >
          <option value="">—</option>
          {STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    if (readOnly) {
      return <span className="text-gray-700 dark:text-gray-300 font-medium">{val !== '' && val != null ? val : '—'}</span>;
    }
    return (
      <input
        type={type === 'number' ? 'number' : 'text'}
        min={type === 'number' ? 0 : undefined}
        className={`border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all text-xs py-1.5 ${
          type === 'number' ? 'w-16 text-center px-1' : 'w-28 px-2'
        }`}
        value={val ?? ''}
        onChange={(e) => onChangeVal(e.target.value)}
      />
    );
  };

  const SectionTitle = ({ children, hint }) => (
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{children}</h3>
      {hint && <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Application Targets */}
      <div className="card p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">Application Targets</p>
        {targets ? (
          <div className="grid grid-cols-3 gap-3">
            {/* Daily */}
            <div className="rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 p-4">
              <p className="text-xs font-semibold text-primary-500 dark:text-primary-400 uppercase tracking-wider mb-3 text-center">Daily</p>
              <div className="flex items-stretch">
                <div className="flex-1 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">Profile</p>
                  <p className="text-3xl font-bold text-primary-600 dark:text-primary-400 leading-none">{targets.daily.profiles}</p>
                </div>
                <div className="w-px bg-primary-200 dark:bg-primary-700 mx-3" />
                <div className="flex-1 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">Wire Transfer</p>
                  <p className="text-3xl font-bold text-primary-600 dark:text-primary-400 leading-none">{targets.daily.wt}</p>
                </div>
              </div>
            </div>
            {/* Monthly */}
            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4">
              <p className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider mb-3 text-center">Monthly</p>
              <div className="flex items-stretch">
                <div className="flex-1 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">Profile</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 leading-none">{targets.monthly.profiles}</p>
                </div>
                <div className="w-px bg-blue-200 dark:bg-blue-700 mx-3" />
                <div className="flex-1 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">Wire Transfer</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 leading-none">{targets.monthly.wt}</p>
                </div>
              </div>
            </div>
            {/* Yearly */}
            <div className="rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600 p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 text-center">Yearly</p>
              <div className="flex items-stretch">
                <div className="flex-1 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">Profile</p>
                  <p className="text-3xl font-bold text-gray-700 dark:text-gray-200 leading-none">{targets.yearly.profiles}</p>
                </div>
                <div className="w-px bg-gray-300 dark:bg-gray-600 mx-3" />
                <div className="flex-1 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">Wire Transfer</p>
                  <p className="text-3xl font-bold text-gray-700 dark:text-gray-200 leading-none">{targets.yearly.wt}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Daily Application Target</p>
            {readOnly ? (
              <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">{data.dailyApplicationTarget || '-'}</span>
            ) : (
              <input
                type="number"
                min={0}
                className="input-field w-32"
                value={data.dailyApplicationTarget ?? ''}
                onChange={(e) => emit({ ...data, dailyApplicationTarget: e.target.value })}
                placeholder="Enter target"
              />
            )}
          </div>
        )}
      </div>

      {/* Section 1: Profile grid */}
      <div className="card p-4">
        <SectionTitle hint="Daily commitment vs actual, per country">Section 1 · Profile</SectionTitle>
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="text-xs w-full border-collapse">
            <thead>
              <tr>
                <th className="px-3 py-3 sticky left-0 z-10 bg-gray-100 dark:bg-gray-700 text-left text-gray-600 dark:text-gray-300 font-semibold border-b border-r border-gray-200 dark:border-gray-600 whitespace-nowrap">
                  Country
                </th>
                {PROFILE_COLUMNS.map((c) => (
                  <th key={c.key} className={`px-3 py-3 text-center font-semibold whitespace-nowrap border-b border-gray-200 dark:border-gray-600 ${COL_HEADER_CLS[COL_GROUP[c.key]] || ''}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.profile.map((row, idx) => (
                <tr key={row.country} className="group hover:bg-primary-50/40 dark:hover:bg-primary-900/10 transition-colors border-b border-gray-100 dark:border-gray-700/60 last:border-0">
                  <td className="px-3 py-2.5 sticky left-0 z-10 bg-white dark:bg-gray-800 group-hover:bg-primary-50/40 dark:group-hover:bg-primary-900/10 font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap border-r border-gray-100 dark:border-gray-700 transition-colors">
                    {row.country}
                  </td>
                  {PROFILE_COLUMNS.map((c) => (
                    <td key={c.key} className="px-2 py-2 text-center">
                      {cellInput(row[c.key], (v) => updateProfile(idx, c.key, v), c.type)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-t-2 border-gray-200 dark:border-gray-600">
                <td className="px-3 py-2.5 sticky left-0 bg-gray-50 dark:bg-gray-700/50 font-bold text-primary-600 dark:text-primary-400 border-r border-gray-200 dark:border-gray-600">
                  Total
                </td>
                {PROFILE_COLUMNS.map((c) => (
                  <td key={c.key} className="px-2 py-2.5 text-center font-bold">
                    {c.type === 'number'
                      ? <span className={totals[c.key] > 0 ? 'text-gray-800 dark:text-gray-200' : 'text-gray-300 dark:text-gray-600'}>{totals[c.key] ?? 0}</span>
                      : ''}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Communication */}
      <div className="card p-5">
        <SectionTitle>Communication</SectionTitle>
        {/* Count tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          {COMMUNICATION_ITEMS.map((c) => (
            <div key={c.key} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 p-3 flex flex-col gap-2">
              <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide leading-tight">{c.label}</p>
              {readOnly ? (
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{data.communication?.[c.key] || '0'}</p>
              ) : (
                <input
                  type="number"
                  min={0}
                  className="w-full text-xl font-bold text-gray-800 dark:text-gray-100 bg-transparent border-0 border-b-2 border-gray-200 dark:border-gray-600 focus:border-primary-400 focus:outline-none pb-0.5 transition-colors"
                  value={data.communication?.[c.key] ?? ''}
                  onChange={(e) => updateComm(c.key, e.target.value)}
                  placeholder="0"
                />
              )}
            </div>
          ))}
        </div>
        {/* Link inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          {COMMUNICATION_ITEMS.filter((c) => c.linkKey).map((c) => (
            <div key={c.linkKey} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 p-3">
              <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{c.label}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1.5">{c.linkLabel}</p>
              {readOnly ? (
                data.communication?.[c.linkKey]
                  ? <a href={data.communication[c.linkKey]} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 dark:text-primary-400 underline break-all">{data.communication[c.linkKey]}</a>
                  : <p className="text-xs text-gray-400">—</p>
              ) : (
                <input
                  type="url"
                  className="w-full text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all"
                  placeholder="https://..."
                  value={data.communication?.[c.linkKey] ?? ''}
                  onChange={(e) => updateComm(c.linkKey, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Follow-up tasks */}
      <div className="card p-4">
        <SectionTitle hint="Completion status of daily follow-up tasks">Section 2 · Follow-up Tasks</SectionTitle>
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 w-1/2">Task</th>
                <th className="px-4 py-3 text-center font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b border-gray-200 dark:border-gray-600">Committed</th>
                <th className="px-4 py-3 text-center font-semibold bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-b border-gray-200 dark:border-gray-600">Completed</th>
                <th className="px-4 py-3 text-center font-semibold bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {data.followUpTasks.map((row, idx) => {
                const done = Number(row.completed) >= Number(row.committed) && Number(row.committed) > 0;
                return (
                  <tr key={row.task} className="group hover:bg-primary-50/40 dark:hover:bg-primary-900/10 transition-colors border-b border-gray-100 dark:border-gray-700/60 last:border-0">
                    <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      {done && <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />}
                      {!done && <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />}
                      {row.task}
                    </td>
                    <td className="px-4 py-2.5 text-center">{cellInput(row.committed, (v) => updateFollowUp(idx, 'committed', v), 'number')}</td>
                    <td className="px-4 py-2.5 text-center">{cellInput(row.completed, (v) => updateFollowUp(idx, 'completed', v), 'number')}</td>
                    <td className="px-4 py-2.5 text-center">{cellInput(row.remarks, (v) => updateFollowUp(idx, 'remarks', v), 'text')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Extra initiatives */}
      <div className="card p-5">
        <SectionTitle>Section 3 · Extra Initiatives</SectionTitle>
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          {[
            { key: 'leadsCommitted', label: 'Leads Committed', color: 'blue' },
            { key: 'leadsGenerated', label: 'Leads Generated', color: 'green' },
          ].map((f) => (
            <div key={f.key} className={`rounded-xl border p-4 flex flex-col gap-2 ${
              f.color === 'blue'
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800'
                : 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800'
            }`}>
              <p className={`text-[11px] font-semibold uppercase tracking-wide ${
                f.color === 'blue' ? 'text-blue-500 dark:text-blue-400' : 'text-green-500 dark:text-green-400'
              }`}>{f.label}</p>
              {readOnly ? (
                <p className={`text-3xl font-bold leading-none ${
                  f.color === 'blue' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'
                }`}>{data.extraInitiatives?.[f.key] || '0'}</p>
              ) : (
                <input
                  type="number"
                  min={0}
                  className={`w-full text-2xl font-bold bg-transparent border-0 border-b-2 focus:outline-none pb-0.5 transition-colors placeholder:text-gray-300 ${
                    f.color === 'blue'
                      ? 'text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700 focus:border-blue-500'
                      : 'text-green-600 dark:text-green-400 border-green-200 dark:border-green-700 focus:border-green-500'
                  }`}
                  value={data.extraInitiatives?.[f.key] ?? ''}
                  onChange={(e) => updateExtra(f.key, e.target.value)}
                  placeholder="0"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="card p-5">
        <SectionTitle hint="Totals auto-calculated from Section 1">Summary</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {['applications', 'offer', 'wt', 'visa', 'rejection', 'refund', 'defer', 'commission'].map((k) => {
            const label = PROFILE_COLUMNS.find((c) => c.key === k)?.label || k;
            const val = totals[k] ?? 0;
            const positive = val > 0;
            return (
              <div key={k} className={`rounded-xl border px-3 py-2.5 flex flex-col gap-0.5 transition-colors ${
                positive
                  ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-100 dark:border-violet-800'
                  : 'bg-gray-50 dark:bg-gray-700/40 border-gray-200 dark:border-gray-700'
              }`}>
                <p className={`text-[10px] font-semibold uppercase tracking-wide ${
                  positive ? 'text-violet-500 dark:text-violet-400' : 'text-gray-400 dark:text-gray-500'
                }`}>{label}</p>
                <p className={`text-2xl font-bold leading-none ${
                  positive ? 'text-violet-700 dark:text-violet-300' : 'text-gray-300 dark:text-gray-600'
                }`}>{val}</p>
              </div>
            );
          })}
        </div>
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 block mb-2">One-line summary from Counsellor</label>
        {readOnly ? (
          <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/40 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-700">{data.summary || '—'}</p>
        ) : (
          <textarea
            className="w-full text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all"
            rows={2}
            value={data.summary ?? ''}
            onChange={(e) => emit({ ...data, summary: e.target.value })}
            placeholder="A one-line summary of the day..."
          />
        )}
      </div>
    </div>
  );
};

export default TrackerForm;
