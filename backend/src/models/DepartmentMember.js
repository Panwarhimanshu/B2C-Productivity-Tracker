const mongoose = require('mongoose');

// A contact-directory entry nested under a Department's org tree (e.g. Canada's
// Onshore / Application / Visa / Back-end sub-teams). Not tied to a login User —
// most of these people don't use the app, they're just listed for contact purposes.
const departmentMemberSchema = new mongoose.Schema(
  {
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    team: { type: String, trim: true, default: '' }, // sub-group label, e.g. "Onshore" — blank shows directly under the department
    name: { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    whatToContactFor: { type: String, trim: true, default: '' },
    photo: { type: String, default: null },
    photoPublicId: { type: String, default: null, select: false },
    order: { type: Number, default: 0 },
    visible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

departmentMemberSchema.index({ departmentId: 1, team: 1, order: 1 });

module.exports = mongoose.model('DepartmentMember', departmentMemberSchema);
