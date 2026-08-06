// RM Daily Tracker structure (mirrors the Google Sheet). Keep keys in sync with
// backend/src/config/tracker.js.

export const COUNTRIES = ['Canada', 'UK', 'USA', 'Germany', 'Dubai', 'Europe'];

// Section 1 – Profile grid columns (per country). coachingAchieved / admissionAchieved /
// revenueAchieved are entered daily and roll up against that country's monthly Target
// (set by Super Admin in Target Management) — the target itself isn't stored on the
// report, it's fetched separately (see countryTargets prop on TrackerForm) for reference.
export const PROFILE_COLUMNS = [
  { key: 'coachingAchieved', label: 'Coaching', type: 'number', targetKey: 'coachingTarget' },
  { key: 'admissionAchieved', label: 'Admission', type: 'number', targetKey: 'admissionTarget' },
  { key: 'revenueAchieved', label: 'Revenue (₹)', type: 'number', targetKey: 'revenueTarget' },
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
  'New Applications Follow-up',
  'Offer Letter Updates',
  'Payment/Wire-Transfer Follow-up',
  'Visa Status Follow-up',
  'Defer & Refund Follow-up',
  'Commission Drive',
  'Event Promotion',
  'Agent Activation Activity',
];

export const COMMUNICATION_ITEMS = [
  { key: 'zoomMeetings',    label: 'Zoom Meetings',      linkKey: 'zoomMeetingLink',  linkLabel: 'Recording / Meeting Link' },
  { key: 'callsMade',       label: 'Calls Made',         linkKey: 'callsSheetLink',   linkLabel: 'Google Sheet Link' },
  { key: 'meetings',        label: 'Meetings',           linkKey: 'meetingMomLink',   linkLabel: 'MOM Link' },
  { key: 'kApplyDiscussion',label: 'K Apply Discussion' },
  { key: 'whatsappQuery',   label: 'WhatsApp Query' },
];

export const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

// A blank tracker payload, ready to bind to the form.
export const emptyTracker = () => ({
  profile: COUNTRIES.map((country) => {
    const row = { country };
    PROFILE_COLUMNS.forEach((c) => { row[c.key] = ''; });
    return row;
  }),
  followUpTasks: FOLLOW_UP_TASKS.map((task) => ({ task, committed: '', completed: '', remarks: '' })),
  communication: COMMUNICATION_ITEMS.reduce((acc, c) => ({
    ...acc,
    [c.key]: '',
    ...(c.linkKey ? { [c.linkKey]: '' } : {}),
  }), {}),
  extraInitiatives: { leadsCommitted: '', leadsGenerated: '' },
  summary: '',
});

// Merge a stored (possibly partial / legacy) tasks object onto the empty shape so the
// form always has every country row / task / field present.
export const normalizeTracker = (tasks) => {
  const base = emptyTracker();
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
