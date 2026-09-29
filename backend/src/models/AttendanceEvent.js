const mongoose = require('mongoose');

// Raw punch/door events as pushed by the Matrix COSEC device — kept as the source of truth
// (rather than pre-computing daily status at write time) since we don't yet know the exact
// event-ID semantics of the real hardware; daily Present/Late/Absent status is derived from
// these on read (see services/attendanceService.js). One document per event received.
const attendanceEventSchema = new mongoose.Schema(
  {
    matrixUserId: { type: String, required: true, trim: true, index: true },
    deviceType: { type: Number }, // 0=Door V3, 1=PVR, 2=Vega, 3=FMX, 5=ARC DC 200, 7=ARGO
    serialNo: { type: String, trim: true },
    evtId: { type: Number },
    seqNo: { type: Number },
    occurredAt: { type: Date, required: true, index: true },
    raw: { type: mongoose.Schema.Types.Mixed }, // full query params, for debugging/future refinement
  },
  { timestamps: true }
);

attendanceEventSchema.index({ matrixUserId: 1, occurredAt: 1 });

module.exports = mongoose.model('AttendanceEvent', attendanceEventSchema);
