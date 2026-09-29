const User = require('../models/User');
const { isHodLike } = require('../config/roles');
const { fetchAttendanceForEmail, fetchAttendanceForAll } = require('../config/zoho');

const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

const pad = (n) => String(n).padStart(2, '0');

// Zoho date params are dd-MM-yyyy; its attendanceDetails keys come back as yyyy-MM-dd
// regardless, which is what we build our own row keys as below.
const monthDateRange = (year, month) => {
  const total = daysInMonth(year, month);
  return { sdate: `01-${pad(month)}-${year}`, edate: `${pad(total)}-${pad(month)}-${year}`, total };
};

// Fill in every day of the month, even ones Zoho didn't return a record for.
const buildRows = (attendanceDetails, year, month, total) => {
  const rows = [];
  for (let d = 1; d <= total; d++) {
    const key = `${year}-${pad(month)}-${pad(d)}`;
    const day = attendanceDetails?.[key];
    rows.push({
      date: key,
      status: day?.Status || 'No Data',
      firstIn: day && day.FirstIn !== '-' ? day.FirstIn : null,
      lastOut: day && day.LastOut !== '-' ? day.LastOut : null,
      workingHours: day?.WorkingHours || '00:00',
    });
  }
  return rows;
};

// Any authenticated user: their own month of attendance, matched to Zoho People by email.
const getMyAttendance = async (req, res, next) => {
  try {
    const now = new Date();
    const year = Number(req.query.year) || now.getFullYear();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const { sdate, edate, total } = monthDateRange(year, month);

    const attendanceDetails = await fetchAttendanceForEmail(req.user.email, sdate, edate);
    if (!attendanceDetails) {
      return res.json({ success: true, data: { rows: [], linked: false, year, month } });
    }
    res.json({
      success: true,
      data: { rows: buildRows(attendanceDetails, year, month, total), linked: true, year, month },
    });
  } catch (error) {
    next(error);
  }
};

// HOD/Associate HOD (own department) or Super Admin (everyone, or one ?departmentId): every
// department member's month of attendance in one call, matched to Zoho People by email.
const getTeamAttendance = async (req, res, next) => {
  try {
    const now = new Date();
    const year = Number(req.query.year) || now.getFullYear();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const { sdate, edate, total } = monthDateRange(year, month);

    const userFilter = { isActive: true };
    if (isHodLike(req.user.role)) {
      userFilter.departmentId = req.user.departmentId;
    } else if (req.query.departmentId) {
      userFilter.departmentId = req.query.departmentId;
    }
    const users = await User.find(userFilter).select('name employeeId email role departmentId')
      .populate('departmentId', 'name');

    const byEmail = await fetchAttendanceForAll(sdate, edate);

    const members = users.map((u) => {
      const details = byEmail.get(u.email.toLowerCase());
      return {
        user: {
          _id: u._id, name: u.name, employeeId: u.employeeId, role: u.role,
          department: u.departmentId?.name || null,
        },
        linked: !!details,
        rows: details ? buildRows(details, year, month, total) : [],
      };
    });

    res.json({ success: true, data: { members, year, month } });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyAttendance, getTeamAttendance };
