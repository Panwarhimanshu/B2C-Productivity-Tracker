// RM Daily Tracker structure (mirrors the Google Sheet). Keep keys in sync with
// backend/src/config/tracker.js.

export const COUNTRIES = ['Canada', 'UK', 'USA', 'Germany', 'Dubai', 'Europe'];

// Section 1 – Profile grid columns (per country). coachingAchieved / admissionAchieved
// are entered daily and roll up against that country's monthly Target (set by Super
// Admin in Target Management) — the target itself isn't stored on the report, it's
// fetched separately (see countryTargets prop on TrackerForm) for reference.
export const PROFILE_COLUMNS = [
  { key: 'coachingAchieved', label: 'Coaching', type: 'number', targetKey: 'coachingTarget' },
  { key: 'admissionAchieved', label: 'Admission', type: 'number', targetKey: 'admissionTarget' },
  { key: 'revenueOthers', label: 'Others (₹)', type: 'number' },
  { key: 'refRevenue', label: 'Ref Revenue (₹)', type: 'number' },
  { key: 'wireTransferFees', label: 'Wire Transfer / Fees', type: 'number' },
  { key: 'gotVisa', label: 'Got Visa', type: 'number' },
  { key: 'applicationFileUpcomingIntake', label: 'App. File (Upcoming Intake)', type: 'number' },
  { key: 'applicationFileNextIntake', label: 'App. File (Next Intake)', type: 'number' },
  { key: 'remarks', label: 'Remarks', type: 'text' },
];

export const PROFILE_NUMERIC_KEYS = PROFILE_COLUMNS.filter((c) => c.type === 'number').map((c) => c.key);

export const FOLLOW_UP_TASKS = [
  'Email Checking',
  'Got Visa & Fees Payment update in Agent Sheet',
  'Got Visa Update in App',
  'Data Update in K-Apply as per the BRD Sheet',
  'Calling for Loan data & Maintaining Update in the sheet',
  'Preparing the Visitor Visa File',
  'Follow up on the ongoing case',
  'Refund status checking and follow-up if required',
  'Fees receipt & PAL follow-up',
];

export const COMMUNICATION_ITEMS = [
  { key: 'zoomMeetings',    label: 'Zoom Meetings',      linkKey: 'zoomMeetingLink',  linkLabel: 'Recording / Meeting Link' },
  { key: 'callsMade',       label: 'Calls Made',         linkKey: 'callsSheetLink',   linkLabel: 'Google Sheet Link' },
  { key: 'meetings',        label: 'Meetings',           linkKey: 'meetingMomLink',   linkLabel: 'MOM Link' },
  { key: 'whatsappMessageSent', label: 'WhatsApp Message Sent' },
  { key: 'taskModuleFilled',    label: 'Task Module Filled', options: ['Yes', 'No', 'Pending'] },
];

export const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

// A blank tracker payload, ready to bind to the form. `countries` narrows which country
// rows appear — defaults to all of them, but callers should pass just the counsellor's
// mapped country/countries (see countriesForDepartment) so the form isn't cluttered with
// countries that don't apply to them.
export const emptyTracker = (countries = COUNTRIES) => ({
  profile: countries.map((country) => {
    const row = { country, coachingProducts: [] };
    PROFILE_COLUMNS.forEach((c) => { row[c.key] = ''; });
    return row;
  }),
  followUpTasks: FOLLOW_UP_TASKS.map((task) => ({ task, done: '', remarks: '' })),
  communication: COMMUNICATION_ITEMS.reduce((acc, c) => ({
    ...acc,
    [c.key]: '',
    ...(c.linkKey ? { [c.linkKey]: '' } : {}),
  }), {}),
  extraInitiatives: { leadsCommitted: '', leadsGenerated: '' },
  summary: '',
});

// Resolve which COUNTRIES a department maps to, by exact (case-insensitive) name match.
// Falls back to the full COUNTRIES list if the department doesn't correspond to a known
// country (no department set, or a department not named after a tracked country).
export const countriesForDepartment = (departmentName) => {
  if (!departmentName) return COUNTRIES;
  const match = COUNTRIES.find((c) => c.toLowerCase() === departmentName.toLowerCase());
  return match ? [match] : COUNTRIES;
};

// Merge a stored (possibly partial / legacy) tasks object onto the empty shape so the
// form always has every relevant country row / task / field present. `countries` narrows
// the rows shown, but any country that already has real data in `tasks` is always kept
// too, so editing an older report never silently drops data outside the narrowed list.
export const normalizeTracker = (tasks, countries = COUNTRIES) => {
  const storedCountries = Array.isArray(tasks?.profile)
    ? tasks.profile
        .filter((p) => PROFILE_NUMERIC_KEYS.some((k) => num(p?.[k]) > 0) || p?.remarks)
        .map((p) => p.country)
    : [];
  const effectiveCountries = [...new Set([...countries, ...storedCountries])];

  const base = emptyTracker(effectiveCountries);
  if (!tasks || typeof tasks !== 'object') return base;

  base.summary = tasks.summary ?? '';

  if (Array.isArray(tasks.profile)) {
    base.profile = base.profile.map((row) => {
      const stored = tasks.profile.find((p) => p.country === row.country);
      return stored ? { ...row, ...stored } : row;
    });
  }
  if (Array.isArray(tasks.followUpTasks)) {
    base.followUpTasks = base.followUpTasks.map((row) => {
      const stored = tasks.followUpTasks.find((t) => t.task === row.task);
      return stored ? { ...row, ...stored } : row;
    });
  }
  if (tasks.communication) base.communication = { ...base.communication, ...tasks.communication };
  if (tasks.extraInitiatives) base.extraInitiatives = { ...base.extraInitiatives, ...tasks.extraInitiatives };
  return base;
};

// Flat numeric totals for one tracker payload (used for the auto-calculated summary).
export const computeTotals = (tasks) => {
  const t = tasks || {};
  const profile = Array.isArray(t.profile) ? t.profile : [];
  const profileTotals = {};
  PROFILE_NUMERIC_KEYS.forEach((k) => {
    profileTotals[k] = profile.reduce((s, row) => s + num(row?.[k]), 0);
  });
  return profileTotals;
};

// Each Coaching count requires naming the product sold for that unit — e.g. Coaching = 2
// means two product names must be filled in for that country. Returns { valid, message }.
export const validateCoachingProducts = (tasks) => {
  const profile = Array.isArray(tasks?.profile) ? tasks.profile : [];
  for (const row of profile) {
    const count = Math.round(num(row?.coachingAchieved));
    if (count <= 0) continue;
    const products = Array.isArray(row?.coachingProducts) ? row.coachingProducts : [];
    const filled = products.filter((p) => p && p.trim()).length;
    if (filled < count) {
      return {
        valid: false,
        message: `Enter the product sold for all ${count} Coaching count${count > 1 ? 's' : ''} in ${row.country} (${filled}/${count} filled).`,
      };
    }
  }
  return { valid: true, message: '' };
};
