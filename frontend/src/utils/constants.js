export const ROLES = {
  COUNSELLOR: 'COUNSELLOR',
  HOD: 'HOD',
  SUPER_ADMIN: 'SUPER_ADMIN',
};

export const ROLE_LABELS = {
  COUNSELLOR: 'Counsellor',
  HOD: 'Head of Department',
  SUPER_ADMIN: 'Super Admin',
};

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
