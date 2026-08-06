import { useMemo } from 'react';
import {
  PROFILE_COLUMNS,
  COMMUNICATION_ITEMS,
  computeTotals,
} from '../../constants/tracker';

// Controlled editor / viewer for a Counsellor Daily Tracker payload.
// Props: value (tracker object), onChange(next), readOnly,
// countryTargets ({ [country]: { coachingTarget, admissionTarget, revenueTarget,
//   coachingAchieved, admissionAchieved, revenueAchieved } } — month-to-date, for reference).
const TrackerForm = ({ value, onChange, readOnly = false, countryTargets = null }) => {
  const data = value;
  const totals = useMemo(() => computeTotals(data), [data]);

  const emit = (next) => onChange && onChange(next);

  const updateProfile = (idx, key, val) => {
    const profile = data.profile.map((row, i) => (i === idx ? { ...row, [key]: val } : row));
    emit({ ...data, profile });
  };
  const updateFollowUp = (idx, key, val) => {
    const followUpTasks = data.followUpTasks.map((row, i) => (i === idx ? { ...row, [key]: val } : row));
    emit({ ...data, followUpTasks });
  };
  const updateComm = (key, val) => emit({ ...data, communication: { ...data.communication, [key]: val } });
  const updateExtra = (key, val) => emit({ ...data, extraInitiatives: { ...data.extraInitiatives, [key]: val } });

  const COL_GROUP = {
    coachingAchieved: 'blue',
    admissionAchieved: 'green',
    revenueAchieved: 'violet',
    revenueOthers: 'violet',
    refRevenue: 'violet',
    wireTransferFees: 'amber',
    gotVisa: 'green',
    applicationFileUpcomingIntake: 'blue',
    applicationFileNextIntake: 'blue',
  };
  const COL_HEADER_CLS = {
    blue:   'bg-blue-50   dark:bg-blue-900/30   text-blue-700   dark:text-blue-300',
    green:  'bg-green-50  dark:bg-green-900/30  text-green-700  dark:text-green-300',
    amber:  'bg-amber-50  dark:bg-amber-900/30  text-amber-700  dark:text-amber-300',
    violet: 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
  };

  const cellInput = (val, onChangeVal, type = 'number') => {
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
      {/* Section 1: Profile grid */}
      <div className="card p-4">
        <SectionTitle hint="Monthly target for reference · fill today's achieved figures per country">Section 1 · Profile</SectionTitle>
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
              {data.profile.map((row, idx) => {
                const ct = countryTargets?.[row.country];
                return (
                  <tr key={row.country} className="group hover:bg-primary-50/40 dark:hover:bg-primary-900/10 transition-colors border-b border-gray-100 dark:border-gray-700/60 last:border-0">
                    <td className="px-3 py-2.5 sticky left-0 z-10 bg-white dark:bg-gray-800 group-hover:bg-primary-50/40 dark:group-hover:bg-primary-900/10 font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap border-r border-gray-100 dark:border-gray-700 transition-colors">
                      {row.country}
                    </td>
                    {PROFILE_COLUMNS.map((c) => (
                      <td key={c.key} className="px-2 py-2 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          {cellInput(row[c.key], (v) => updateProfile(idx, c.key, v), c.type)}
                          {c.targetKey && ct && (
                            <span className="text-[9px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
                              Target {ct[c.targetKey] ?? 0} · MTD {ct[c.key] ?? 0}
                            </span>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
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
          {PROFILE_COLUMNS.filter((c) => c.type === 'number').map((c) => {
            const val = totals[c.key] ?? 0;
            const positive = val > 0;
            return (
              <div key={c.key} className={`rounded-xl border px-3 py-2.5 flex flex-col gap-0.5 transition-colors ${
                positive
                  ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-100 dark:border-violet-800'
                  : 'bg-gray-50 dark:bg-gray-700/40 border-gray-200 dark:border-gray-700'
              }`}>
                <p className={`text-[10px] font-semibold uppercase tracking-wide ${
                  positive ? 'text-violet-500 dark:text-violet-400' : 'text-gray-400 dark:text-gray-500'
                }`}>{c.label}</p>
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
