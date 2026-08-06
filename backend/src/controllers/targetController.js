const Target = require('../models/Target');
const DailyReport = require('../models/DailyReport');
const User = require('../models/User');
const { computeReportTotals } = require('../config/tracker');

const TARGET_FIELDS = [
  'profiles', 'wt', 'visaServices', 'sop', 'educationLoan',
  'gic', 'blockAccount', 'forexRemittance', 'insurance',
];

const derive = (yearly, wdpm = 25) => {
  const totalDays = wdpm * 12;
  const out = {};
  TARGET_FIELDS.forEach((f) => {
    const y = yearly[f] || 0;
    out[f] = {
      yearly: y,
      monthly: Math.round((y / 12) * 10) / 10,
      daily: Math.round((y / totalDays) * 100) / 100,
    };
  });
  return out;
};

// SUPER_ADMIN: create or update yearly targets for a user
const upsertTarget = async (req, res, next) => {
  try {
    const { userId, year, workingDaysPerMonth, ...fields } = req.body;
    if (!userId || !year) {
      return res.status(400).json({ success: false, message: 'userId and year are required' });
    }

    const update = { workingDaysPerMonth: Number(workingDaysPerMonth) || 25 };
    TARGET_FIELDS.forEach((f) => { update[f] = Number(fields[f]) || 0; });

    const target = await Target.findOneAndUpdate(
      { userId, year: Number(year) },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, message: 'Target saved', data: target });
  } catch (error) {
    next(error);
  }
};

// SUPER_ADMIN: table of all Counsellors with their yearly targets + derived daily/monthly
const getTargetsTable = async (req, res, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();

    const [rms, targets] = await Promise.all([
      User.find({ role: 'COUNSELLOR', isActive: true })
        .select('name employeeId departmentId')
        .populate('departmentId', 'name'),
      Target.find({ year }),
    ]);

    const targetMap = {};
    targets.forEach((t) => { targetMap[t.userId.toString()] = t; });

    const rows = rms.map((rm) => {
      const t = targetMap[rm._id.toString()];
      return {
        user: rm,
        target: t || null,
        derived: t ? derive(t, t.workingDaysPerMonth) : null,
      };
    });

    res.json({ success: true, data: rows, year });
  } catch (error) {
    next(error);
  }
};

// Counsellor: get own target with derived values + actuals for current month
const getTargetWithActuals = async (req, res, next) => {
  try {
    const userId = req.params.userId === 'me' ? req.user._id : req.params.userId;
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;

    const [target, reports] = await Promise.all([
      Target.findOne({ userId, year }),
      DailyReport.find({
        userId,
        date: {
          $gte: new Date(year, month - 1, 1),
          $lte: new Date(year, month, 0, 23, 59, 59),
        },
      }),
    ]);

    // Actuals from submitted daily reports for the current month
    const actuals = { profiles: 0, wt: 0, visaServices: 0 };
    reports.forEach((r) => {
      const t = computeReportTotals(r.tasks);
      actuals.profiles  += t.profile.achieved || 0;
      actuals.wt        += t.profile.wt       || 0;
      actuals.visaServices += t.profile.visa  || 0;
    });

    res.json({
      success: true,
      data: {
        target:  target  || null,
        derived: target  ? derive(target, target.workingDaysPerMonth) : null,
        actuals,
        month,
        year,
      },
    });
  } catch (error) {
    next(error);
  }
};

// SUPER_ADMIN: bulk upsert yearly targets from parsed CSV rows, matched by email
// Each row: { email, year, profiles, wt, visaServices, sop, educationLoan, gic, blockAccount, forexRemittance, insurance }
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
      const year = Number(row.year);

      try {
        if (!email || !year) {
          errors.push({ row: rowNum, email: email || null, message: 'Email and year are required' });
          continue;
        }

        const user = await User.findOne({ email });
        if (!user) {
          errors.push({ row: rowNum, email, message: 'No user found with this email' });
          continue;
        }

        const update = { workingDaysPerMonth: Number(row.workingDaysPerMonth) || 25 };
        TARGET_FIELDS.forEach((f) => { update[f] = Number(row[f]) || 0; });

        await Target.findOneAndUpdate(
          { userId: user._id, year },
          { $set: update },
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
