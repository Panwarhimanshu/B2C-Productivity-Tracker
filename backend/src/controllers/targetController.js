const Target = require('../models/Target');
const DailyReport = require('../models/DailyReport');
const User = require('../models/User');
const { COUNTRIES } = require('../config/tracker');

const monthRange = (year, month) => ({
  $gte: new Date(year, month - 1, 1),
  $lte: new Date(year, month, 0, 23, 59, 59),
});

// SUPER_ADMIN: create or update one country's monthly target for a user
const upsertTarget = async (req, res, next) => {
  try {
    const { userId, country, year, month, coachingTarget, admissionTarget, revenueTarget } = req.body;
    if (!userId || !country || !year || !month) {
      return res.status(400).json({ success: false, message: 'userId, country, year and month are required' });
    }
    if (!COUNTRIES.includes(country)) {
      return res.status(400).json({ success: false, message: `Invalid country "${country}"` });
    }

    const target = await Target.findOneAndUpdate(
      { userId, country, year: Number(year), month: Number(month) },
      { $set: {
        coachingTarget: Number(coachingTarget) || 0,
        admissionTarget: Number(admissionTarget) || 0,
        revenueTarget: Number(revenueTarget) || 0,
      } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, message: 'Target saved', data: target });
  } catch (error) {
    next(error);
  }
};

// SUPER_ADMIN: table of all Counsellors' target + achieved-to-date for one country + month
const getTargetsTable = async (req, res, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const country = req.query.country || COUNTRIES[0];

    const counsellors = await User.find({ role: 'COUNSELLOR', isActive: true })
      .select('name employeeId departmentId')
      .populate('departmentId', 'name');
    const counsellorIds = counsellors.map((c) => c._id);

    const [targets, reports] = await Promise.all([
      Target.find({ country, year, month, userId: { $in: counsellorIds } }),
      DailyReport.find({ userId: { $in: counsellorIds }, date: monthRange(year, month) }).select('userId tasks').lean(),
    ]);

    const targetMap = {};
    targets.forEach((t) => { targetMap[t.userId.toString()] = t; });

    const achievedMap = {};
    reports.forEach((r) => {
      const profile = Array.isArray(r.tasks?.profile) ? r.tasks.profile : [];
      const row = profile.find((p) => p.country === country);
      if (!row) return;
      const uid = r.userId.toString();
      if (!achievedMap[uid]) achievedMap[uid] = { coachingAchieved: 0, admissionAchieved: 0, revenueAchieved: 0 };
      achievedMap[uid].coachingAchieved += Number(row.coachingAchieved) || 0;
      achievedMap[uid].admissionAchieved += Number(row.admissionAchieved) || 0;
      achievedMap[uid].revenueAchieved += Number(row.revenueAchieved) || 0;
    });

    const rows = counsellors.map((c) => ({
      user: c,
      target: targetMap[c._id.toString()] || null,
      achieved: achievedMap[c._id.toString()] || { coachingAchieved: 0, admissionAchieved: 0, revenueAchieved: 0 },
    }));

    res.json({ success: true, data: rows, year, month, country });
  } catch (error) {
    next(error);
  }
};

// Get one user's targets + achieved-to-date across ALL countries for a given month
// (used by SubmitReport / Dashboard / Performance / EditReportModal for reference).
const getTargetWithActuals = async (req, res, next) => {
  try {
    const userId = req.params.userId === 'me' ? req.user._id : req.params.userId;
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;

    const [targets, reports] = await Promise.all([
      Target.find({ userId, year, month }),
      DailyReport.find({ userId, date: monthRange(year, month) }).select('tasks').lean(),
    ]);

    const targetMap = {};
    targets.forEach((t) => { targetMap[t.country] = t; });

    const achievedMap = {};
    COUNTRIES.forEach((c) => { achievedMap[c] = { coachingAchieved: 0, admissionAchieved: 0, revenueAchieved: 0 }; });
    reports.forEach((r) => {
      const profile = Array.isArray(r.tasks?.profile) ? r.tasks.profile : [];
      profile.forEach((row) => {
        if (!achievedMap[row.country]) return;
        achievedMap[row.country].coachingAchieved += Number(row.coachingAchieved) || 0;
        achievedMap[row.country].admissionAchieved += Number(row.admissionAchieved) || 0;
        achievedMap[row.country].revenueAchieved += Number(row.revenueAchieved) || 0;
      });
    });

    const countries = COUNTRIES.map((country) => {
      const t = targetMap[country];
      return {
        country,
        coachingTarget: t?.coachingTarget || 0,
        admissionTarget: t?.admissionTarget || 0,
        revenueTarget: t?.revenueTarget || 0,
        ...achievedMap[country],
      };
    });

    res.json({ success: true, data: { countries, month, year } });
  } catch (error) {
    next(error);
  }
};

// SUPER_ADMIN: bulk upsert monthly per-country targets from parsed CSV rows
// Each row: { email, country, year, month, coachingTarget, admissionTarget, revenueTarget }
const importTargets = async (req, res, next) => {
  try {
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'No rows to import' });
    }

    let upserted = 0;
    const errors = [];

    for (let idx = 0; idx < rows.length; idx++) {
      const rowNum = idx + 2;
      const row = rows[idx] || {};
      const email = (row.email || '').trim().toLowerCase();
      const country = (row.country || '').trim();
      const year = Number(row.year);
      const month = Number(row.month);

      try {
        if (!email || !country || !year || !month) {
          errors.push({ row: rowNum, email: email || null, message: 'Email, country, year and month are required' });
          continue;
        }
        if (!COUNTRIES.includes(country)) {
          errors.push({ row: rowNum, email, message: `Invalid country "${country}"` });
          continue;
        }

        const user = await User.findOne({ email });
        if (!user) {
          errors.push({ row: rowNum, email, message: 'No user found with this email' });
          continue;
        }

        await Target.findOneAndUpdate(
          { userId: user._id, country, year, month },
          { $set: {
            coachingTarget: Number(row.coachingTarget) || 0,
            admissionTarget: Number(row.admissionTarget) || 0,
            revenueTarget: Number(row.revenueTarget) || 0,
          } },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        upserted++;
      } catch (err) {
        errors.push({ row: rowNum, email: email || null, message: err.message });
      }
    }

    res.json({ success: true, data: { upserted, errors } });
  } catch (error) {
    next(error);
  }
};

module.exports = { upsertTarget, getTargetsTable, getTargetWithActuals, importTargets };
