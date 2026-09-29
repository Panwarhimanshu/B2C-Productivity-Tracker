const Department = require('../models/Department');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');

const MAX_LOGO_BYTES = 5 * 1024 * 1024; // 5MB base64 input limit

const uploadLogoIfProvided = async (logo, publicId) => {
  if (!logo) return { logo: null, logoPublicId: null };
  if (typeof logo !== 'string' || !/^data:image\/(png|jpe?g|webp|gif);base64,/.test(logo)) {
    const err = new Error('A valid image is required');
    err.statusCode = 400;
    throw err;
  }
  if (Buffer.byteLength(logo, 'utf8') > MAX_LOGO_BYTES) {
    const err = new Error('Image is too large (max 5MB)');
    err.statusCode = 400;
    throw err;
  }
  // 'limit' preserves the logo's own aspect ratio instead of force-cropping to a square.
  const result = await cloudinary.uploader.upload(logo, {
    folder: 'b2c-tracker/department-logos',
    public_id: publicId,
    overwrite: true,
    transformation: [{ width: 512, height: 512, crop: 'limit', quality: 'auto' }],
  });
  return { logo: result.secure_url, logoPublicId: result.public_id };
};

const getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, data: departments });
  } catch (error) {
    next(error);
  }
};

const createDepartment = async (req, res, next) => {
  try {
    const { name, description, logo } = req.body;
    const department = await Department.create({ name, description });

    if (logo && logo.startsWith('data:image')) {
      const logoFields = await uploadLogoIfProvided(logo, `dept_${department._id}`);
      department.logo = logoFields.logo;
      department.logoPublicId = logoFields.logoPublicId;
      await department.save();
    }

    res.status(201).json({ success: true, message: 'Department created successfully', data: department });
  } catch (error) {
    next(error);
  }
};

const updateDepartment = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id).select('+logoPublicId');
    if (!department) return res.status(404).json({ success: false, message: 'Department not found' });

    const { name, description, logo } = req.body;
    department.set({ name, description });

    if (logo && logo.startsWith('data:image')) {
      if (department.logoPublicId) {
        await cloudinary.uploader.destroy(department.logoPublicId).catch(() => {});
      }
      const logoFields = await uploadLogoIfProvided(logo, `dept_${department._id}`);
      department.logo = logoFields.logo;
      department.logoPublicId = logoFields.logoPublicId;
    } else if (logo === null) {
      if (department.logoPublicId) {
        await cloudinary.uploader.destroy(department.logoPublicId).catch(() => {});
      }
      department.logo = null;
      department.logoPublicId = null;
    }

    await department.save();
    res.json({ success: true, message: 'Department updated successfully', data: department });
  } catch (error) {
    next(error);
  }
};

const deleteDepartment = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id).select('+logoPublicId');
    if (!department) return res.status(404).json({ success: false, message: 'Department not found' });

    if (department.logoPublicId) {
      await cloudinary.uploader.destroy(department.logoPublicId).catch(() => {});
    }

    // Permanently remove the department from the database
    await department.deleteOne();

    // Detach users mapped to this department
    await User.updateMany({ departmentId: department._id }, { $set: { departmentId: null } });

    res.json({ success: true, message: 'Department deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDepartments, createDepartment, updateDepartment, deleteDepartment };
