const User = require('../models/User');
const AttendanceEvent = require('../models/AttendanceEvent');
const { groupByDay, istPartsToUtcDate } = require('../config/attendance');
const { isHodLike } = require('../config/roles');

// Number of days in a given (1-indexed) month/year — Date.UTC avoids any dependence on the
// server process's own timezone.
const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

// [start of month, start of next month) in IST, expressed as UTC instants for the query.
const monthRange = (year, month) => ({
  start: istPartsToUtcDate(year, month, 1),
  end: istPartsToUtcDate(year, month + 1, 1), // exclusive; Date.UTC handles month/year rollover
});

// Build { date, status, firstIn, lastOut, punchCount } rows for one user over a month,
// filling in "Absent" for any day with no punch events at all. Day keys are plain
// YYYY-MM-DD strings from the requested year/month — never round-tripped through a Date's
// own timezone, which is what previously mislabeled every day by one.
const buildMonthRows = async (matrixUserId, year, month) => {
  if (!matrixUserId) return [];
  const { start, end } = monthRange(year, month);
  const events = await AttendanceEvent.find({
    matrixUserId, occurredAt: { $gte: start, $lt: end },
  }).select('occurredAt').lean();

  const byDay = groupByDay(events);
  const total = daysInMonth(year, month);
  const rows = [];
  for (let d = 1; d <= total; d++) {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const day = byDay[key] || { status: 'Absent', firstIn: null, lastOut: null, punchCount: 0 };
    rows.push({ date: key, ...day });
  }
  return rows;
};

// Any authenticated user: their own month of attendance. Needs matrixUserId set on their
// profile (by Super Admin, in User Management) — without it there's nothing to show yet.
const getMyAttendance = async (req, res, next) => {
  try {
    const now = new Date();
    const year = Number(req.query.year) || now.getFullYear();
    const month = Number(req.query.month) || now.getMonth() + 1;

    if (!req.user.matrixUserId) {
      return res.json({ success: true, data: { rows: [], linked: false, year, month } });
    }
    const rows = await buildMonthRows(req.user.matrixUserId, year, month);
    res.json({ success: true, data: { rows, linked: true, year, month } });
  } catch (error) {
    next(error);
  }
};

// HOD/Associate HOD (own department) or Super Admin (everyone, or one ?departmentId): every
// linked team member's month of attendance in one call.
const getTeamAttendance = async (req, res, next) => {
  try {
    const now = new Date();
    const year = Number(req.query.year) || now.getFullYear();
    const month = Number(req.query.month) || now.getMonth() + 1;

    const userFilter = { isActive: true, matrixUserId: { $exists: true, $ne: null } };
    if (isHodLike(req.user.role)) {
      userFilter.departmentId = req.user.departmentId;
    } else if (req.query.departmentId) {
      userFilter.departmentId = req.query.departmentId;
    }

    const users = await User.find(userFilter).select('name employeeId matrixUserId role departmentId')
      .populate('departmentId', 'name');

    const data = await Promise.all(users.map(async (u) => ({
      user: { _id: u._id, name: u.name, employeeId: u.employeeId, role: u.role, department: u.departmentId?.name || null },
      rows: await buildMonthRows(u.matrixUserId, year, month),
    })));

    res.json({ success: true, data: { members: data, year, month } });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyAttendance, getTeamAttendance };
