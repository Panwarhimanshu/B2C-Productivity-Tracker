// Shared structure for the RM Daily Tracker (mirrors the Google Sheet: RM Daily Tracker / TL Dashboard tabs).
// Used by the report controller (totals + aggregation). The frontend keeps a matching copy in
// frontend/src/constants/tracker.js — keep the keys in sync across both.

const COUNTRIES = ['Canada', 'UK', 'USA', 'Germany', 'Dubai', 'Europe'];

// Section 1 – Profile grid columns (per country). `num: true` => aggregated as a sum.
// coachingAchieved / admissionAchieved / revenueAchieved are entered daily and roll up
// against that country's monthly Target (see models/Target.js) — the target itself is
// not stored on the report, it's fetched separately for reference.
const PROFILE_COLUMNS = [
  { key: 'coachingAchieved', label: 'Coaching', num: true, targetKey: 'coachingTarget' },
  { key: 'admissionAchieved', label: 'Admission', num: true, targetKey: 'admissionTarget' },
  { key: 'revenueAchieved', label: 'Revenue (₹)', num: true, targetKey: 'revenueTarget' },
  { key: 'revenueOthers', label: 'Others (₹)', num: true },
  { key: 'refRevenue', label: 'Ref Revenue (₹)', num: true },
  { key: 'wireTransferFees', label: 'Wire Transfer / Fees', num: true },
  { key: 'gotVisa', label: 'Got Visa', num: true },
  { key: 'applicationFileUpcomingIntake', label: 'App. File (Upcoming Intake)', num: true },
  { key: 'applicationFileNextIntake', label: 'App. File (Next Intake)', num: true },
  { key: 'remarks', label: 'Remarks', num: false },
];

const PROFILE_NUMERIC_KEYS = PROFILE_COLUMNS.filter((c) => c.num).map((c) => c.key);

const FOLLOW_UP_TASKS = [
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

const COMMUNICATION_ITEMS = [
  { key: 'zoomMeetings', label: 'Zoom Meetings' },
  { key: 'callsMade', label: 'Calls Made' },
  { key: 'meetings', label: 'Meetings' },
  { key: 'whatsappMessageSent', label: 'WhatsApp Message Sent' },
  { key: 'taskModuleFilled', label: 'Task Module Filled', options: ['Yes', 'No', 'Pending'] },
];

// Resolve which COUNTRIES a department maps to, by exact (case-insensitive) name match.
// Falls back to the full COUNTRIES list if the department doesn't correspond to a known
// country (no department set, or a department not named after a tracked country).
const countriesForDepartment = (departmentName) => {
  if (!departmentName) return COUNTRIES;
  const match = COUNTRIES.find((c) => c.toLowerCase() === departmentName.toLowerCase());
  return match ? [match] : COUNTRIES;
};

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

// Reduce a single report's `tasks` object into flat numeric totals.
const computeReportTotals = (tasks) => {
  const t = tasks || {};
  const profile = Array.isArray(t.profile) ? t.profile : [];
  const followUps = Array.isArray(t.followUpTasks) ? t.followUpTasks : [];
  const comm = t.communication || {};
  const extra = t.extraInitiatives || {};

  const profileTotals = {};
  PROFILE_NUMERIC_KEYS.forEach((k) => {
    profileTotals[k] = profile.reduce((s, row) => s + num(row?.[k]), 0);
  });

  const followUpDone = followUps.reduce((s, r) => s + num(r?.done), 0);

  const communicationTotals = {};
  COMMUNICATION_ITEMS.forEach(({ key, options }) => {
    if (options) return; // categorical (e.g. Yes/No/Pending) — not summable
    communicationTotals[key] = num(comm[key]);
  });

  return {
    profile: profileTotals,
    followUp: { done: followUpDone },
    communication: communicationTotals,
    leads: {
      committed: num(extra.leadsCommitted),
      generated: num(extra.leadsGenerated),
    },
  };
};

// Each Coaching count requires naming the product sold for that unit — e.g. Coaching = 2
// means two product names must be filled in for that country. Returns { valid, message }.
const validateCoachingProducts = (tasks) => {
  const profile = Array.isArray(tasks?.profile) ? tasks.profile : [];
  for (const row of profile) {
    const count = Math.round(num(row?.coachingAchieved));
    if (count <= 0) continue;
    const products = Array.isArray(row?.coachingProducts) ? row.coachingProducts : [];
    const filled = products.filter((p) => p && String(p).trim()).length;
    if (filled < count) {
      return {
        valid: false,
        message: `Enter the product sold for all ${count} Coaching count${count > 1 ? 's' : ''} in ${row.country} (${filled}/${count} filled).`,
      };
    }
  }
  return { valid: true, message: '' };
};

module.exports = {
  COUNTRIES,
  PROFILE_COLUMNS,
  PROFILE_NUMERIC_KEYS,
  FOLLOW_UP_TASKS,
  COMMUNICATION_ITEMS,
  num,
  computeReportTotals,
  validateCoachingProducts,
  countriesForDepartment,
};
