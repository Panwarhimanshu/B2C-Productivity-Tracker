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
  'New Applications Follow-up',
  'Offer Letter Updates',
  'Payment/Wire-Transfer Follow-up',
  'Visa Status Follow-up',
  'Defer & Refund Follow-up',
  'Commission Drive',
  'Event Promotion',
  'Agent Activation Activity',
];

const COMMUNICATION_ITEMS = [
  { key: 'zoomMeetings', label: 'Zoom Meetings' },
  { key: 'callsMade', label: 'Calls Made' },
  { key: 'meetings', label: 'Meetings' },
  { key: 'kApplyDiscussion', label: 'K Apply Discussion' },
  { key: 'whatsappQuery', label: 'WhatsApp Query' },
];

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

  const followUpCommitted = followUps.reduce((s, r) => s + num(r?.committed), 0);
  const followUpCompleted = followUps.reduce((s, r) => s + num(r?.completed), 0);

  const communicationTotals = {};
  COMMUNICATION_ITEMS.forEach(({ key }) => {
    communicationTotals[key] = num(comm[key]);
  });

  return {
    profile: profileTotals,
    followUp: { committed: followUpCommitted, completed: followUpCompleted },
    communication: communicationTotals,
    leads: {
      committed: num(extra.leadsCommitted),
      generated: num(extra.leadsGenerated),
    },
  };
};

module.exports = {
  COUNTRIES,
  PROFILE_COLUMNS,
  PROFILE_NUMERIC_KEYS,
  FOLLOW_UP_TASKS,
  COMMUNICATION_ITEMS,
  num,
  computeReportTotals,
};
