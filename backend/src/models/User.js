const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ['COUNSELLOR', 'HOD', 'SUPER_ADMIN'], required: true, default: 'COUNSELLOR' },
    designation: { type: String, trim: true, default: '' },
    employeeId: { type: String, unique: true, sparse: true, trim: true },
    avatar:          { type: String, default: null },
    avatarPublicId:  { type: String, default: null, select: false },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    joiningDate: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    refreshToken: { type: String, select: false },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
