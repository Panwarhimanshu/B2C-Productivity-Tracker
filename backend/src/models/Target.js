const mongoose = require('mongoose');

// Monthly, per-country target set by Super Admin. Counsellors' daily-report
// achieved figures for that country/month roll up against these numbers.
const targetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    country: { type: String, required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    coachingTarget: { type: Number, default: 0 },
    admissionTarget: { type: Number, default: 0 },
  },
  { timestamps: true }
);

targetSchema.index({ userId: 1, country: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Target', targetSchema);
