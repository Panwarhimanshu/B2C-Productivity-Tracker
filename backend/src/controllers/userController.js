const User = require('../models/User');
const Department = require('../models/Department');
const AuditLog = require('../models/AuditLog');

const getUsers = async (req, res, next) => {
  try {
    const { role, departmentId, isActive = 'true', page = 1, limit = 20, search } = req.query;

    const filter = { isActive: isActive === 'true' };

    if (role) filter.role = role;
    if (departmentId) filter.departmentId = departmentId;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(filter)
        .populate('departmentId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('departmentId', 'name');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, designation, employeeId, departmentId, joiningDate } = req.body;

    const user = new User({ name, email, password, role, designation, employeeId, departmentId, joiningDate });
    await user.save();

    await AuditLog.create({
      action: 'CREATE_USER',
      entity: 'User',
      entityId: user._id,
      performedBy: req.user._id,
      after: user.toJSON(),
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, message: 'User created successfully', data: user });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { name, email, role, designation, employeeId, departmentId, joiningDate } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const before = user.toJSON();
    const updates = { name, email, role, designation, employeeId, departmentId, joiningDate };

    Object.assign(user, updates);

    if (req.body.password) {
      user.password = req.body.password;
    }

    await user.save();

    await AuditLog.create({
      action: 'UPDATE_USER',
      entity: 'User',
      entityId: user._id,
      performedBy: req.user._id,
      before,
      after: user.toJSON(),
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'User updated successfully', data: user });
  } catch (error) {
    next(error);
  }
};

const hideUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot deactivate yourself' });
    }

    user.isActive = false;
    await user.save({ validateBeforeSave: false });

    await AuditLog.create({
      action: 'DEACTIVATE_USER',
      entity: 'User',
      entityId: user._id,
      performedBy: req.user._id,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    next(error);
  }
};

const reactivateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.isActive = true;
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, message: 'User reactivated successfully' });
  } catch (error) {
    next(error);
  }
};

// SUPER_ADMIN: map a single user (HOD or Counsellor) to a department — partial update, doesn't touch other fields
const updateUserDepartment = async (req, res, next) => {
  try {
    const { departmentId } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { departmentId: departmentId || null },
      { new: true, runValidators: true }
    ).populate('departmentId', 'name');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, message: 'Department updated successfully', data: user });
  } catch (error) {
    next(error);
  }
};

// SUPER_ADMIN: bulk create-or-update users from parsed CSV rows
// Each row: { name, email, password, role, designation, employeeId, department, joiningDate }
const importUsers = async (req, res, next) => {
  try {
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'No rows to import' });
    }

    const departments = await Department.find({ isActive: true });
    const departmentByName = new Map(departments.map((d) => [d.name.toLowerCase(), d._id]));

    let created = 0;
    let updated = 0;
    const errors = [];
    const warnings = [];

    for (let idx = 0; idx < rows.length; idx++) {
      const rowNum = idx + 2; // +1 for 0-index, +1 for header row
      const row = rows[idx] || {};
      const email = (row.email || '').trim().toLowerCase();
      const name = (row.name || '').trim();

      try {
        if (!name || !email) {
          errors.push({ row: rowNum, email: email || null, message: 'Name and email are required' });
          continue;
        }

        const role = (row.role || 'COUNSELLOR').trim().toUpperCase();
        if (!['COUNSELLOR', 'HOD', 'SUPER_ADMIN'].includes(role)) {
          errors.push({ row: rowNum, email, message: `Invalid role "${row.role}"` });
          continue;
        }

        let departmentId;
        const departmentName = (row.department || '').trim();
        if (departmentName) {
          const match = departmentByName.get(departmentName.toLowerCase());
          if (match) departmentId = match;
          else warnings.push({ row: rowNum, email, message: `Department "${departmentName}" not found, left unassigned` });
        }

        const designation = (row.designation || '').trim();
        const employeeId = (row.employeeId || '').trim() || undefined;
        const parsedDate = row.joiningDate ? new Date(row.joiningDate) : null;
        const joiningDate = parsedDate && !isNaN(parsedDate) ? parsedDate : undefined;
        const password = (row.password || '').trim();

        const existing = await User.findOne({ email });
        if (existing) {
          existing.set({
            name,
            role,
            designation,
            ...(employeeId && { employeeId }),
            ...(departmentId && { departmentId }),
            ...(joiningDate && { joiningDate }),
          });
          if (password) {
            if (password.length < 6) {
              errors.push({ row: rowNum, email, message: 'Password must be at least 6 characters' });
              continue;
            }
            existing.password = password;
          }
          await existing.save();
          updated++;
        } else {
          if (!password || password.length < 6) {
            errors.push({ row: rowNum, email, message: 'Password required for new user (min 6 characters)' });
            continue;
          }
          await User.create({
            name, email, password, role, designation, employeeId, departmentId, joiningDate,
          });
          created++;
        }
      } catch (err) {
        errors.push({ row: rowNum, email: email || null, message: err.message });
      }
    }

    res.json({ success: true, data: { created, updated, errors, warnings } });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, getUserById, createUser, updateUser, hideUser, reactivateUser, importUsers, updateUserDepartment };
