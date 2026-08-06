const DailyReport = require('../models/DailyReport');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const { exportToExcel } = require('../services/exportService');
const { sendReportSubmittedEmail } = require('../services/emailService');
const { getDateRange } = require('../utils/helpers');
const {
  COUNTRIES,
  PROFILE_NUMERIC_KEYS,
  COMMUNICATION_ITEMS,
  computeReportTotals,
} = require('../config/tracker');

// Headline count shown in lists/cards: total applications across countries.
const applicationsCount = (tasks) => computeReportTotals(tasks).profile.applications || 0;

// Notify all active HODs/Super Admins (in-app + email) when a report is submitted.
// Best-effort: failures here must never fail the report submission itself.
const notifyReportSubmitted = async (report, rm) => {
  try {
    const recipients = await User.find({ role: { $in: ['HOD', 'SUPER_ADMIN'] }, isActive: true }).select('name email');

    const uniqueRecipients = recipients.filter((r) => r._id.toString() !== rm._id.toString());

    const dateStr = new Date(report.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = new Date(report.createdAt).toLocaleTimeString('en-IN', {
      hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
    });
    const title = 'Daily Report Submitted';
    const message = `${rm.name} submitted their daily report for ${dateStr} at ${timeStr} IST`;

    await Promise.all(uniqueRecipients.map(async (recipient) => {
      await Notification.create({
        recipientId: recipient._id,
        type: 'REPORT_SUBMITTED',
        title,
        message,
        entity: 'DailyReport',
        entityId: report._id,
      });
      await sendReportSubmittedEmail({
        to: recipient.email,
        recipientName: recipient.name,
        rmName: rm.name,
        reportDate: report.date,
        totalTasksCount: report.totalTasksCount,
        submittedAt: report.createdAt,
      });
    }));
  } catch (error) {
    console.error('[notifyReportSubmitted] failed:', error.message);
  }
};

const submitReport = async (req, res, next) => {
  try {
    const { date, tasks, taskFields, remarks } = req.body;
    const reportDate = new Date(date);
    reportDate.setHours(0, 0, 0, 0);

    const existing = await DailyReport.findOne({ userId: req.user._id, date: reportDate });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Report already submitted for this date' });
    }

    const totalTasksCount = applicationsCount(tasks);

    const report = await DailyReport.create({
      userId: req.user._id,
      date: reportDate,
      tasks,
      taskFields,
      remarks,
      totalTasksCount,
      status: 'Submitted',
    });

    await AuditLog.create({
      action: 'SUBMIT_REPORT',
      entity: 'DailyReport',
      entityId: report._id,
      performedBy: req.user._id,
      after: report.toObject(),
      ipAddress: req.ip,
    });

    await notifyReportSubmitted(report, req.user);

    res.status(201).json({ success: true, message: 'Report submitted successfully', data: report });
  } catch (error) {
    next(error);
  }
};

const getMyReports = async (req, res, next) => {
  try {
    const { period = 'monthly', page = 1, limit = 20 } = req.query;
    const { startDate, endDate } = getDateRange(period);

    const filter = { userId: req.user._id, date: { $gte: startDate, $lte: endDate } };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reports, total] = await Promise.all([
      DailyReport.find(filter).sort({ date: -1 }).skip(skip).limit(parseInt(limit))
        .populate('modifiedBy', 'name role'),
      DailyReport.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: reports,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

const getAllReports = async (req, res, next) => {
  try {
    const { period = 'monthly', userId, departmentId, page = 1, limit = 20 } = req.query;
    const { startDate, endDate } = getDateRange(period);

    const userFilter = { isActive: true };
    if (departmentId) userFilter.departmentId = departmentId;

    let userIds;
    if (userId) {
      userIds = [userId];
    } else {
      const users = await User.find(userFilter).select('_id');
      userIds = users.map((u) => u._id);
    }

    const filter = { userId: { $in: userIds }, date: { $gte: startDate, $lte: endDate } };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reports, total] = await Promise.all([
      DailyReport.find(filter)
        .populate('userId', 'name employeeId role departmentId')
        .populate('modifiedBy', 'name role')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      DailyReport.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: reports,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

const updateReport = async (req, res, next) => {
  try {
    const report = await DailyReport.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    if (req.user.role === 'COUNSELLOR') {
      if (report.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
      const reportDay = new Date(report.date);
      reportDay.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (reportDay.getTime() !== today.getTime()) {
        return res.status(403).json({ success: false, message: 'You can only edit today\'s report' });
      }
    }

    const before = report.toObject();
    const { tasks, taskFields, remarks } = req.body;

    report.tasks = tasks ?? report.tasks;
    report.taskFields = taskFields ?? report.taskFields;
    report.remarks = remarks ?? report.remarks;
    report.status = 'Modified';
    report.modifiedBy = req.user._id;

    if (tasks) {
      report.totalTasksCount = applicationsCount(tasks);
    }

    await report.save();

    await AuditLog.create({
      action: 'MODIFY_REPORT',
      entity: 'DailyReport',
      entityId: report._id,
      performedBy: req.user._id,
      before,
      after: report.toObject(),
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Report updated successfully', data: report });
  } catch (error) {
    next(error);
  }
};

const getAnalytics = async (req, res, next) => {
  try {
    const { period = 'monthly' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    let userFilter = {};
    if (req.user.role === 'COUNSELLOR') {
      userFilter = { _id: req.user._id };
    }

    const users = await User.find({ ...userFilter, isActive: true }).select('_id name employeeId');
    const userIds = users.map((u) => u._id);

    const reports = await DailyReport.find({
      userId: { $in: userIds },
      date: { $gte: startDate, $lte: endDate },
    }).select('userId date totalTasksCount status');

    const totalReports = reports.length;
    const totalTasks = reports.reduce((sum, r) => sum + (r.totalTasksCount || 0), 0);
    const submittedCount = reports.filter((r) => r.status === 'Submitted').length;
    const modifiedCount = reports.filter((r) => r.status === 'Modified').length;

    const dailyBreakdown = reports.reduce((acc, r) => {
      const day = r.date.toISOString().split('T')[0];
      if (!acc[day]) acc[day] = { date: day, count: 0, tasks: 0 };
      acc[day].count++;
      acc[day].tasks += r.totalTasksCount || 0;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        summary: { totalReports, totalTasks, submittedCount, modifiedCount, totalUsers: users.length },
        dailyBreakdown: Object.values(dailyBreakdown).sort((a, b) => a.date.localeCompare(b.date)),
        period,
        startDate,
        endDate,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Aggregated KPI rollup over a date range, scoped by role (mirrors the TL Dashboard tab).
const getTrackerSummary = async (req, res, next) => {
  try {
    const { period = 'monthly', userId, departmentId } = req.query;
    const { startDate, endDate } = getDateRange(period);

    // Resolve which users are in scope.
    const userFilter = { isActive: true };
    if (req.user.role === 'COUNSELLOR') {
      userFilter._id = req.user._id;
    }
    if (departmentId) userFilter.departmentId = departmentId;
    if (userId) userFilter._id = userId;

    const scopedUsers = await User.find(userFilter).select('_id');
    const userIds = scopedUsers.map((u) => u._id);

    const reports = await DailyReport.find({
      userId: { $in: userIds },
      date: { $gte: startDate, $lte: endDate },
    }).select('tasks').lean();

    // Per-country accumulator + flat KPI totals.
    const perCountry = COUNTRIES.reduce((acc, c) => {
      acc[c] = PROFILE_NUMERIC_KEYS.reduce((o, k) => ({ ...o, [k]: 0 }), { country: c });
      return acc;
    }, {});
    const kpiTotals = PROFILE_NUMERIC_KEYS.reduce((o, k) => ({ ...o, [k]: 0 }), {});
    const communication = COMMUNICATION_ITEMS.reduce((o, c) => ({ ...o, [c.key]: 0 }), {});
    const followUp = { committed: 0, completed: 0 };
    const leads = { committed: 0, generated: 0 };

    for (const r of reports) {
      const tasks = r.tasks || {};
      const profile = Array.isArray(tasks.profile) ? tasks.profile : [];
      profile.forEach((row) => {
        if (!perCountry[row.country]) return;
        PROFILE_NUMERIC_KEYS.forEach((k) => {
          const n = parseFloat(row[k]);
          if (Number.isFinite(n)) {
            perCountry[row.country][k] += n;
            kpiTotals[k] += n;
          }
        });
      });
      const totals = computeReportTotals(tasks);
      COMMUNICATION_ITEMS.forEach(({ key }) => { communication[key] += totals.communication[key]; });
      followUp.committed += totals.followUp.committed;
      followUp.completed += totals.followUp.completed;
      leads.committed += totals.leads.committed;
      leads.generated += totals.leads.generated;
    }

    res.json({
      success: true,
      data: {
        perCountry: Object.values(perCountry),
        kpiTotals,
        communication,
        followUp,
        leads,
        reportsCount: reports.length,
        rmCount: userIds.length,
        period,
        startDate,
        endDate,
      },
    });
  } catch (error) {
    next(error);
  }
};

const exportReports = async (req, res, next) => {
  try {
    const { period = 'monthly', userId, departmentId, format = 'xlsx' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    const filter = { date: { $gte: startDate, $lte: endDate } };

    if (userId) {
      filter.userId = userId;
    } else if (departmentId) {
      const users = await User.find({ departmentId }).select('_id');
      filter.userId = { $in: users.map((u) => u._id) };
    }

    const reports = await DailyReport.find(filter)
      .populate('userId', 'name employeeId role')
      .populate('modifiedBy', 'name')
      .sort({ date: -1 })
      .lean();

    const buffer = await exportToExcel(reports);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=reports_${period}_${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

const getFormTemplate = async (req, res, next) => {
  try {
    const FormTemplate = require('../models/FormTemplate');
    const template = await FormTemplate.findOne({ isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
};

// HOD/SUPER_ADMIN only: audit trail of report submissions/edits
const getReportLogs = async (req, res, next) => {
  try {
    const { period, role, performedBy, action, page = 1, limit = 25 } = req.query;

    const filter = { entity: 'DailyReport' };
    if (action) filter.action = action;
    if (period) {
      const { startDate, endDate } = getDateRange(period);
      filter.createdAt = { $gte: startDate, $lte: endDate };
    }
    if (performedBy) {
      filter.performedBy = performedBy;
    } else if (role) {
      const matchedUsers = await User.find({ role }).select('_id');
      filter.performedBy = { $in: matchedUsers.map((u) => u._id) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('performedBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AuditLog.countDocuments(filter),
    ]);

    const ownerIds = [...new Set(
      logs.map((l) => (l.after?.userId || l.before?.userId)).filter(Boolean).map(String)
    )];
    const owners = await User.find({ _id: { $in: ownerIds } }).select('name email');
    const ownerMap = Object.fromEntries(owners.map((o) => [o._id.toString(), o]));

    const data = logs.map((l) => {
      const ownerId = (l.after?.userId || l.before?.userId)?.toString();
      return {
        ...l.toObject(),
        reportOwner: ownerId ? ownerMap[ownerId] || null : null,
        reportDate: l.after?.date || l.before?.date || null,
      };
    });

    res.json({
      success: true,
      data,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { submitReport, getMyReports, getAllReports, updateReport, getAnalytics, getTrackerSummary, exportReports, getFormTemplate, getReportLogs };
