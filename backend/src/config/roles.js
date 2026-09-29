// The 5 login roles and the groupings used throughout the permission checks.
//
//   COUNSELLOR / ONSHORE_COUNSELLOR — submit their own daily report only; same-day edits only.
//   HOD / ASSOCIATE_HOD             — department-wide read access (All Reports, Report Logs,
//                                     Analytics, Export, user listing). HOD additionally gets
//                                     Monthly Targets for their own department; Associate HOD
//                                     does not. Neither can edit the department org-chart
//                                     (directory members) — that's Super Admin only.
//   ASSOCIATE_HOD also submits their own daily report, same as a Counsellor — it sits at the
//   intersection of both groups, which is why it appears in REPORT_SUBMITTER_ROLES too.
//   SUPER_ADMIN                     — unrestricted.

const ALL_ROLES = ['COUNSELLOR', 'ONSHORE_COUNSELLOR', 'HOD', 'ASSOCIATE_HOD', 'SUPER_ADMIN'];

const COUNSELLOR_LIKE_ROLES = ['COUNSELLOR', 'ONSHORE_COUNSELLOR'];
const HOD_LIKE_ROLES = ['HOD', 'ASSOCIATE_HOD'];
// Everyone who fills out a daily report themselves — Counsellor-like roles plus Associate HOD.
const REPORT_SUBMITTER_ROLES = [...COUNSELLOR_LIKE_ROLES, 'ASSOCIATE_HOD'];

const isCounsellorLike = (role) => COUNSELLOR_LIKE_ROLES.includes(role);
const isHodLike = (role) => HOD_LIKE_ROLES.includes(role);
const isReportSubmitter = (role) => REPORT_SUBMITTER_ROLES.includes(role);

module.exports = {
  ALL_ROLES,
  COUNSELLOR_LIKE_ROLES,
  HOD_LIKE_ROLES,
  REPORT_SUBMITTER_ROLES,
  isCounsellorLike,
  isHodLike,
  isReportSubmitter,
};
