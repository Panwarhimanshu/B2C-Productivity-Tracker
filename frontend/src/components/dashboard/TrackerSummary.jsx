import { PROFILE_COLUMNS, COMMUNICATION_ITEMS } from '../../constants/tracker';

// Renders the aggregated KPI rollup from GET /reports/summary (mirrors the org-wide dashboard tab).
const KPI_KEYS = PROFILE_COLUMNS.filter((c) => c.type === 'number').map((c) => c.key);
const TABLE_KEYS = KPI_KEYS;
const labelOf = (key) => PROFILE_COLUMNS.find((c) => c.key === key)?.label || key;
const targetKeyOf = (key) => PROFILE_COLUMNS.find((c) => c.key === key)?.targetKey || null;

// Small achieved-vs-target badge shown next to Coaching/Admission/Revenue figures.
// No target set at all => nothing shown (nothing to compare against).
const TargetBadge = ({ achieved, target }) => {
  if (!target) return null;
  const achievedFlag = achieved >= target;
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap ${
      achievedFlag
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    }`}>
      {achievedFlag ? `✓ Target ${target}` : `✗ ${target - achieved} short of ${target}`}
    </span>
  );
};

const TrackerSummary = ({ summary }) => {
  if (!summary) return null;
  const { kpiTotals = {}, kpiTargets = {}, perCountry = [], communication = {}, followUp = {}, leads = {}, targetMonth, targetYear } = summary;
  const monthLabel = targetMonth && targetYear
    ? new Date(targetYear, targetMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="space-y-6">
      {/* KPI totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {KPI_KEYS.map((k) => (
          <div key={k} className="card p-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">{labelOf(k)}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{kpiTotals[k] ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Per-country breakdown */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-0.5">Profile by Country</h3>
        {monthLabel && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-3">
            Coaching / Admission / Revenue badges show this month's target status ({monthLabel})
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="px-2 py-2 font-medium">Country</th>
                {TABLE_KEYS.map((k) => <th key={k} className="px-2 py-2 font-medium whitespace-nowrap">{labelOf(k)}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {perCountry.map((row) => (
                <tr key={row.country}>
                  <td className="px-2 py-2 font-medium text-gray-800 dark:text-gray-200">{row.country}</td>
                  {TABLE_KEYS.map((k) => {
                    const tKey = targetKeyOf(k);
                    return (
                      <td key={k} className="px-2 py-2 text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <span>{row[k] ?? 0}</span>
                          {tKey && <TargetBadge achieved={row[k] ?? 0} target={row[tKey] ?? 0} />}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-300">
                <td className="px-2 py-2">Total</td>
                {TABLE_KEYS.map((k) => {
                  const tKey = targetKeyOf(k);
                  return (
                    <td key={k} className="px-2 py-2">
                      <div className="flex items-center gap-1.5">
                        <span>{kpiTotals[k] ?? 0}</span>
                        {tKey && <TargetBadge achieved={kpiTotals[k] ?? 0} target={kpiTargets[tKey] ?? 0} />}
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Communication + follow-up + leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Communication</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {COMMUNICATION_ITEMS.filter((c) => !c.options).map((c) => (
              <div key={c.key} className="rounded-lg bg-gray-50 dark:bg-gray-700/40 p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
                <p className="text-base font-semibold text-gray-900 dark:text-white">{communication[c.key] ?? 0}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Follow-up &amp; Initiatives</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Tasks Done', followUp.done],
              ['Leads Committed', leads.committed],
              ['Leads Generated', leads.generated],
            ].map(([label, val]) => (
              <div key={label} className="rounded-lg bg-gray-50 dark:bg-gray-700/40 p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                <p className="text-base font-semibold text-gray-900 dark:text-white">{val ?? 0}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackerSummary;
