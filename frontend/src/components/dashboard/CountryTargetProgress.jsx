const FIELDS = [
  { key: 'coaching', targetKey: 'coachingTarget', achievedKey: 'coachingAchieved', label: 'Coaching' },
  { key: 'admission', targetKey: 'admissionTarget', achievedKey: 'admissionAchieved', label: 'Admission' },
  { key: 'revenue', targetKey: 'revenueTarget', achievedKey: 'revenueAchieved', label: 'Revenue (₹)' },
];

const ProgressBar = ({ actual, target }) => {
  const pct = target > 0 ? Math.min(Math.round((actual / target) * 100), 100) : 0;
  const color = pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-semibold text-gray-700 dark:text-gray-300">{actual} / {target}</span>
        <span className={`font-bold ${pct >= 100 ? 'text-green-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-500'}`}>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

// Renders monthly Coaching/Admission/Revenue target vs achieved-to-date, per country.
// `countries` is the array from targetsAPI.getMyWithActuals()/.getForUser() response.data.data.countries.
const CountryTargetProgress = ({ countries = [], emptyMessage = 'No targets set for this month yet.' }) => {
  const withTargets = countries.filter((c) => c.coachingTarget || c.admissionTarget || c.revenueTarget);

  if (withTargets.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-4">
      {withTargets.map((c) => (
        <div key={c.country} className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">{c.country}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">{f.label}</p>
                <ProgressBar actual={c[f.achievedKey] || 0} target={c[f.targetKey] || 0} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CountryTargetProgress;
