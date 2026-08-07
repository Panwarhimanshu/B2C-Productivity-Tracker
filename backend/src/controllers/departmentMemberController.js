const DepartmentMember = require('../models/DepartmentMember');
const cloudinary = require('../config/cloudinary');

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB base64 input limit

// HOD can only manage members within their own department.
const assertDepartmentAccess = (req, departmentId) => {
  if (req.user.role === 'HOD' && String(departmentId) !== String(req.user.departmentId)) {
    const err = new Error('Access denied');
    err.statusCode = 403;
    throw err;
  }
};

const getMembers = async (req, res, next) => {
  try {
    const { departmentId } = req.query;
    const filter = {};

    if (req.user.role === 'SUPER_ADMIN') {
      if (departmentId) filter.departmentId = departmentId;
    } else {
      // HOD and Counsellor only ever see their own department's tree.
      filter.departmentId = req.user.departmentId;
    }

    // Counsellors get the public view — hidden entries are for editors (HOD/Super Admin) only.
    if (req.user.role === 'COUNSELLOR') filter.visible = true;

    const members = await DepartmentMember.find(filter).sort({ team: 1, order: 1, name: 1 });
    res.json({ success: true, data: members });
  } catch (error) {
    next(error);
  }
};

const uploadPhotoIfProvided = async (photo, publicId) => {
  if (!photo) return { photo: null, photoPublicId: null };
  if (typeof photo !== 'string' || !/^data:image\/(png|jpe?g|webp|gif);base64,/.test(photo)) {
    const err = new Error('A valid image is required');
    err.statusCode = 400;
    throw err;
  }
  if (Buffer.byteLength(photo, 'utf8') > MAX_PHOTO_BYTES) {
    const err = new Error('Image is too large (max 5MB)');
    err.statusCode = 400;
    throw err;
  }
  const result = await cloudinary.uploader.upload(photo, {
    folder: 'b2c-tracker/department-members',
    public_id: publicId,
    overwrite: true,
    transformation: [{ width: 256, height: 256, crop: 'fill', gravity: 'face', quality: 'auto' }],
  });
  return { photo: result.secure_url, photoPublicId: result.public_id };
};

const createMember = async (req, res, next) => {
  try {
    const { departmentId, team, name, designation, phone, email, whatToContactFor, order, visible, photo } = req.body;
    assertDepartmentAccess(req, departmentId);

    const member = await DepartmentMember.create({
      departmentId, team, name, designation, phone, email, whatToContactFor, order, visible,
    });

    if (photo && photo.startsWith('data:image')) {
      const photoFields = await uploadPhotoIfProvided(photo, `member_${member._id}`);
      member.photo = photoFields.photo;
      member.photoPublicId = photoFields.photoPublicId;
      await member.save();
    }

    res.status(201).json({ success: true, message: 'Member added successfully', data: member });
  } catch (error) {
    next(error);
  }
};

const updateMember = async (req, res, next) => {
  try {
    const member = await DepartmentMember.findById(req.params.id).select('+photoPublicId');
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
    assertDepartmentAccess(req, member.departmentId);

    const { team, name, designation, phone, email, whatToContactFor, order, visible, photo } = req.body;
    member.set({ team, name, designation, phone, email, whatToContactFor, order, visible });

    if (photo && photo.startsWith('data:image')) {
      if (member.photoPublicId) {
        await cloudinary.uploader.destroy(member.photoPublicId).catch(() => {});
      }
      const photoFields = await uploadPhotoIfProvided(photo, `member_${member._id}`);
      member.photo = photoFields.photo;
      member.photoPublicId = photoFields.photoPublicId;
    } else if (photo === null) {
      if (member.photoPublicId) {
        await cloudinary.uploader.destroy(member.photoPublicId).catch(() => {});
      }
      member.photo = null;
      member.photoPublicId = null;
    }

    await member.save();
    res.json({ success: true, message: 'Member updated successfully', data: member });
  } catch (error) {
    next(error);
  }
};

const deleteMember = async (req, res, next) => {
  try {
    const member = await DepartmentMember.findById(req.params.id).select('+photoPublicId');
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
    assertDepartmentAccess(req, member.departmentId);

    if (member.photoPublicId) {
      await cloudinary.uploader.destroy(member.photoPublicId).catch(() => {});
    }
    await member.deleteOne();
    res.json({ success: true, message: 'Member removed successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMembers, createMember, updateMember, deleteMember };
