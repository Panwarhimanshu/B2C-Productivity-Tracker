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
    { header: 'Target', key: 'target', width: 10 },
    { header: 'Achieved', key: 'achieved', width: 10 },
    { header: 'Applications', key: 'applications', width: 12 },
    { header: 'Offer', key: 'offer', width: 8 },
    { header: 'WT', key: 'wt', width: 8 },
    { header: 'Visa', key: 'visa', width: 8 },
    { header: 'Rejection', key: 'rejection', width: 10 },
    { header: 'Refund', key: 'refund', width: 8 },
    { header: 'Defer', key: 'defer', width: 8 },
    { header: 'Commission', key: 'commission', width: 11 },
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
      target: p.target || 0,
      achieved: p.achieved || 0,
      applications: p.applications || 0,
      offer: p.offer || 0,
      wt: p.wt || 0,
      visa: p.visa || 0,
      rejection: p.rejection || 0,
      refund: p.refund || 0,
      defer: p.defer || 0,
      commission: p.commission || 0,
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
