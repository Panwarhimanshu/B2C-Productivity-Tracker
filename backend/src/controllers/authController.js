const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../config/jwt');
const { AppError } = require('../middleware/errorHandler');
const cloudinary = require('../config/cloudinary');

const login = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = req.body.password;

    const user = await User.findOne({ email, isActive: true }).select('+password +refreshToken');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const payload = { id: user._id, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        user: user.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || !user.isActive || user.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const payload = { id: user._id, role: user.role };
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res) => {
  res.json({ success: true, data: req.user });
};

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB base64 input limit

const updateAvatar = async (req, res, next) => {
  try {
    const { avatar } = req.body;

    if (typeof avatar !== 'string' || !/^data:image\/(png|jpe?g|webp|gif);base64,/.test(avatar)) {
      return res.status(400).json({ success: false, message: 'A valid image is required' });
    }
    if (Buffer.byteLength(avatar, 'utf8') > MAX_AVATAR_BYTES) {
      return res.status(400).json({ success: false, message: 'Image is too large (max 5MB)' });
    }

    // Delete old avatar from Cloudinary if it exists
    const existing = await User.findById(req.user._id).select('+avatarPublicId');
    if (existing?.avatarPublicId) {
      await cloudinary.uploader.destroy(existing.avatarPublicId).catch(() => {});
    }

    // Upload new image to Cloudinary
    const result = await cloudinary.uploader.upload(avatar, {
      folder:         'b2c-tracker/avatars',
      public_id:      `user_${req.user._id}`,
      overwrite:      true,
      transformation: [{ width: 256, height: 256, crop: 'fill', gravity: 'face', quality: 'auto' }],
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: result.secure_url, avatarPublicId: result.public_id },
      { new: true, runValidators: true }
    );

    res.json({ success: true, message: 'Profile photo updated', data: user.toJSON() });
  } catch (error) {
    next(error);
  }
};

const removeAvatar = async (req, res, next) => {
  try {
    const existing = await User.findById(req.user._id).select('+avatarPublicId');
    if (existing?.avatarPublicId) {
      await cloudinary.uploader.destroy(existing.avatarPublicId).catch(() => {});
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: null, avatarPublicId: null },
      { new: true }
    );

    res.json({ success: true, message: 'Profile photo removed', data: user.toJSON() });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, refresh, logout, getMe, updateAvatar, removeAvatar };
