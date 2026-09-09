const ExcelJS = require('exceljs');
const { PROFILE_NUMERIC_KEYS } = require('../config/tracker');

const hasData = (row) => PROFILE_NUMERIC_KEYS.some((k) => Number(row?.[k]) > 0) || !!row?.remarks;

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const statusOf = (achieved, target) => {
  if (!target) return 'No Target';
  return achieved >= target ? 'Achieved' : 'Not Achieved';
};

const STATUS_FILL = {
  'Achieved': 'FFDCFCE7',
  'Not Achieved': 'FFFEE2E2',
  'No Target': 'FFF3F4F6',
};
const STATUS_FONT = {
  'Achieved': 'FF15803D',
  'Not Achieved': 'FFB91C1C',
  'No Target': 'FF6B7280',
};

// Second worksheet: one row per Counsellor per country with a Target set for the current
// month, showing Coaching/Admission target vs achieved-to-date and a status verdict.
const addTargetAchievementSheet = (workbook, targetRows, targetYear, targetMonth) => {
  const monthLabel = targetYear && targetMonth ? `${MONTH_NAMES[targetMonth - 1]} ${targetYear}` : '';
  const sheet = workbook.addWorksheet('Target Achievement');

  sheet.columns = [
    { header: 'Employee Name', key: 'name', width: 20 },
    { header: 'Employee ID', key: 'employeeId', width: 15 },
    { header: 'Country', key: 'country', width: 12 },
    { header: 'Coaching Target', key: 'coachingTarget', width: 14 },
    { header: 'Coaching Achieved', key: 'coachingAchieved', width: 16 },
    { header: 'Coaching Status', key: 'coachingStatus', width: 14 },
    { header: 'Admission Target', key: 'admissionTarget', width: 14 },
    { header: 'Admission Achieved', key: 'admissionAchieved', width: 16 },
    { header: 'Admission Status', key: 'admissionStatus', width: 14 },
    { header: 'Overall Status', key: 'overallStatus', width: 14 },
  ];

  sheet.insertRow(1, [`Target Achievement — ${monthLabel}`]);
  sheet.mergeCells(1, 1, 1, sheet.columns.length);
  sheet.getRow(1).font = { bold: true, size: 12 };

  const headerRow = sheet.getRow(2);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  headerRow.alignment = { horizontal: 'center' };

  targetRows.forEach((t) => {
    const coachingStatus = statusOf(t.coachingAchieved, t.coachingTarget);
    const admissionStatus = statusOf(t.admissionAchieved, t.admissionTarget);
    const statuses = [coachingStatus, admissionStatus];
    const overallStatus = statuses.every((s) => s === 'No Target')
      ? 'No Target'
      : statuses.some((s) => s === 'Not Achieved')
        ? 'Not Achieved'
        : 'Achieved';

    const row = sheet.addRow({
      name: t.name,
      employeeId: t.employeeId,
      country: t.country,
      coachingTarget: t.coachingTarget,
      coachingAchieved: t.coachingAchieved,
      coachingStatus,
      admissionTarget: t.admissionTarget,
      admissionAchieved: t.admissionAchieved,
      admissionStatus,
      overallStatus,
    });

    ['coachingStatus', 'admissionStatus', 'overallStatus'].forEach((key) => {
      const cell = row.getCell(key);
      const status = cell.value;
      cell.font = { bold: true, color: { argb: STATUS_FONT[status] } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STATUS_FILL[status] } };
      cell.alignment = { horizontal: 'center' };
    });
  });

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 2) {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    }
  });
};

const exportToExcel = async (reports, { targetRows = [], targetYear, targetMonth } = {}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'B2C Task Tracker';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Daily Reports');

  sheet.columns = [
    { header: 'Employee Name', key: 'name', width: 20 },
    { header: 'Employee ID', key: 'employeeId', width: 15 },
    { header: 'Role', key: 'role', width: 12 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Country', key: 'country', width: 12 },
    { header: 'Coaching', key: 'coachingAchieved', width: 10 },
    { header: 'Admission', key: 'admissionAchieved', width: 10 },
    { header: 'Others (₹)', key: 'revenueOthers', width: 10 },
    { header: 'Ref Revenue (₹)', key: 'refRevenue', width: 12 },
    { header: 'Wire Transfer / Fees', key: 'wireTransferFees', width: 16 },
    { header: 'Got Visa', key: 'gotVisa', width: 10 },
    { header: 'App. File (Upcoming Intake)', key: 'applicationFileUpcomingIntake', width: 16 },
    { header: 'App. File (Next Intake)', key: 'applicationFileNextIntake', width: 16 },
    { header: 'Country Remarks', key: 'countryRemarks', width: 24 },
    { header: 'Summary', key: 'summary', width: 30 },
    { header: 'Modifier Remarks', key: 'remarks', width: 30 },
    { header: 'Modified By', key: 'modifiedBy', width: 18 },
    { header: 'Submitted At', key: 'createdAt', width: 20 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  headerRow.alignment = { horizontal: 'center' };

  reports.forEach((r) => {
    const profile = Array.isArray(r.tasks?.profile) ? r.tasks.profile : [];
    const rows = profile.filter(hasData);
    // Reports with no country data entered still get one row so they aren't lost from the export.
    (rows.length ? rows : [{}]).forEach((row) => {
      sheet.addRow({
        name: r.userId?.name || 'N/A',
        employeeId: r.userId?.employeeId || 'N/A',
        role: r.userId?.role || 'N/A',
        date: new Date(r.date).toLocaleDateString('en-IN'),
        status: r.status,
        country: row.country || '',
        coachingAchieved: row.coachingAchieved || 0,
        admissionAchieved: row.admissionAchieved || 0,
        revenueOthers: row.revenueOthers || 0,
        refRevenue: row.refRevenue || 0,
        wireTransferFees: row.wireTransferFees || 0,
        gotVisa: row.gotVisa || 0,
        applicationFileUpcomingIntake: row.applicationFileUpcomingIntake || 0,
        applicationFileNextIntake: row.applicationFileNextIntake || 0,
        countryRemarks: row.remarks || '',
        summary: r.tasks?.summary || '',
        remarks: r.remarks || '',
        modifiedBy: r.modifiedBy?.name || '',
        createdAt: new Date(r.createdAt).toLocaleString('en-IN'),
      });
    });
  });

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    }
  });

  if (targetRows.length) {
    addTargetAchievementSheet(workbook, targetRows, targetYear, targetMonth);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

module.exports = { exportToExcel };
