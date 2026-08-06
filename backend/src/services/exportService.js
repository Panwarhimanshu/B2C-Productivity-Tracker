const ExcelJS = require('exceljs');
const { computeReportTotals } = require('../config/tracker');

const exportToExcel = async (reports) => {
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
    { header: 'Coaching', key: 'coachingAchieved', width: 10 },
    { header: 'Admission', key: 'admissionAchieved', width: 10 },
    { header: 'Revenue (₹)', key: 'revenueAchieved', width: 12 },
    { header: 'Others (₹)', key: 'revenueOthers', width: 10 },
    { header: 'Ref Revenue (₹)', key: 'refRevenue', width: 12 },
    { header: 'Wire Transfer / Fees', key: 'wireTransferFees', width: 16 },
    { header: 'Got Visa', key: 'gotVisa', width: 10 },
    { header: 'App. File (Upcoming Intake)', key: 'applicationFileUpcomingIntake', width: 16 },
    { header: 'App. File (Next Intake)', key: 'applicationFileNextIntake', width: 16 },
    { header: 'Tasks Completed', key: 'tasksCompleted', width: 14 },
    { header: 'Leads Generated', key: 'leadsGenerated', width: 14 },
    { header: 'Summary', key: 'summary', width: 30 },
    { header: 'Remarks', key: 'remarks', width: 30 },
    { header: 'Modified By', key: 'modifiedBy', width: 18 },
    { header: 'Submitted At', key: 'createdAt', width: 20 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  headerRow.alignment = { horizontal: 'center' };

  reports.forEach((r) => {
    const totals = computeReportTotals(r.tasks);
    const p = totals.profile;
    sheet.addRow({
      name: r.userId?.name || 'N/A',
      employeeId: r.userId?.employeeId || 'N/A',
      role: r.userId?.role || 'N/A',
      date: new Date(r.date).toLocaleDateString('en-IN'),
      status: r.status,
      coachingAchieved: p.coachingAchieved || 0,
      admissionAchieved: p.admissionAchieved || 0,
      revenueAchieved: p.revenueAchieved || 0,
      revenueOthers: p.revenueOthers || 0,
      refRevenue: p.refRevenue || 0,
      wireTransferFees: p.wireTransferFees || 0,
      gotVisa: p.gotVisa || 0,
      applicationFileUpcomingIntake: p.applicationFileUpcomingIntake || 0,
      applicationFileNextIntake: p.applicationFileNextIntake || 0,
      tasksCompleted: totals.followUp.completed || 0,
      leadsGenerated: totals.leads.generated || 0,
      summary: r.tasks?.summary || '',
      remarks: r.remarks || '',
      modifiedBy: r.modifiedBy?.name || '',
      createdAt: new Date(r.createdAt).toLocaleString('en-IN'),
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

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

module.exports = { exportToExcel };
