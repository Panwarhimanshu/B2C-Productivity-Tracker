const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    logo: { type: String, default: null },
    logoPublicId: { type: String, default: null, select: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Department', departmentSchema);
