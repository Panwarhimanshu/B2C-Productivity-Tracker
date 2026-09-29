export const ROLES = {
  COUNSELLOR: 'COUNSELLOR',
  ONSHORE_COUNSELLOR: 'ONSHORE_COUNSELLOR',
  HOD: 'HOD',
  ASSOCIATE_HOD: 'ASSOCIATE_HOD',
  SUPER_ADMIN: 'SUPER_ADMIN',
};

export const ROLE_LABELS = {
  COUNSELLOR: 'Counsellor',
  ONSHORE_COUNSELLOR: 'Onshore Counsellor',
  HOD: 'Head of Department',
  ASSOCIATE_HOD: 'Associate HOD',
  SUPER_ADMIN: 'Super Admin',
};

// Onshore Counsellor behaves exactly like Counsellor; Associate HOD gets HOD-level department
// visibility (All Reports, Report Logs, Dashboard) but also submits its own daily report like a
// Counsellor, and — unlike HOD — can't set Monthly Targets or edit the department org chart.
export const COUNSELLOR_LIKE_ROLES = ['COUNSELLOR', 'ONSHORE_COUNSELLOR'];
export const HOD_LIKE_ROLES = ['HOD', 'ASSOCIATE_HOD'];
export const REPORT_SUBMITTER_ROLES = ['COUNSELLOR', 'ONSHORE_COUNSELLOR', 'ASSOCIATE_HOD'];

export const PERIODS = [
  { value: 'daily', label: 'Today' },
  { value: 'weekly', label: 'Last 7 Days' },
  { value: 'biweekly', label: 'Last 15 Days' },
  { value: 'monthly', label: 'Last 30 Days' },
];

export const REPORT_STATUS_COLORS = {
  Submitted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  Modified: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
};

export const LOG_ACTION_LABELS = {
  SUBMIT_REPORT: 'Submitted',
  MODIFY_REPORT: 'Modified',
};

export const LOG_ACTION_COLORS = {
  SUBMIT_REPORT: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  MODIFY_REPORT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
};
