// Receiver for the Matrix COSEC "Device PUSH API" — the device itself calls these endpoints
// (it's configured, via its own local web admin page, with our server's URL). This is
// unauthenticated by our normal JWT auth (the device can't do that dance) — instead it's
// gated by HTTP Basic Auth matched against MATRIX_DEVICE_USERNAME/MATRIX_DEVICE_PASSWORD,
// which should be set as the same "User ID / Password" configured in the device's own
// Server Connection settings. Until those env vars are set, every request is rejected.
//
// NOTE: this implements the documented request/response shapes (COSEC_DEVICES_PUSH_API_GUIDE),
// but hasn't been verified yet against a real device — some field assumptions (notably which
// field in /setevent actually carries the attendee's matrix user-id) may need adjusting once
// we can see real traffic. Every raw event is stored as received specifically so that's easy
// to fix after the fact without having lost any data.

const AttendanceEvent = require('../models/AttendanceEvent');
const { istPartsToUtcDate } = require('../config/attendance');

const checkDeviceAuth = (req) => {
  const expectedUser = process.env.MATRIX_DEVICE_USERNAME;
  const expectedPass = process.env.MATRIX_DEVICE_PASSWORD;
  if (!expectedUser || !expectedPass) return false; // not configured yet — refuse everyone

  const header = req.headers.authorization || '';
  if (!header.startsWith('Basic ')) return false;
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const sepIdx = decoded.indexOf(':');
  if (sepIdx === -1) return false;
  const user = decoded.slice(0, sepIdx);
  const pass = decoded.slice(sepIdx + 1);
  return user === expectedUser && pass === expectedPass;
};

// Every handler below responds in the device's chosen text format ("key=value key=value"),
// which is what the docs show as the expected format for these acknowledgments.
const textResponse = (res, params) => {
  res.type('text/plain').send(Object.entries(params).map(([k, v]) => `${k}=${v}`).join(' '));
};

const requireDeviceAuth = (req, res, next) => {
  if (!checkDeviceAuth(req)) {
    return textResponse(res, { status: 0 });
  }
  next();
};

// Device calls this first, on (re)connecting. We just acknowledge with polling parameters —
// there's no real "session" to track since every request already carries device-type/serial-no.
const login = (req, res) => {
  textResponse(res, { 'poll-interval': 10, 'poll-duration': 10, 'poll-count': 3, status: 1, format: 0 });
};

// Device polls on the interval we gave it, asking whether we have a command/config change for
// it. We never issue any (we're only interested in receiving attendance events), so always "no".
const poll = (req, res) => {
  textResponse(res, { 'cmd-avlbl': 0, 'cnfg-avlbl': 0, status: 1 });
};

const getCommand = (req, res) => {
  textResponse(res, { status: 0 }); // no commands queued, ever
};

const getConfiguration = (req, res) => {
  textResponse(res, { status: 0 });
};

// The actual attendance data: the device pushes one event per door/user activity.
// Per the docs, the attendee's own identifier isn't a named "user-id" field on this specific
// endpoint (unlike the credential-management APIs) — field-1 is the most common convention
// device firmwares use to carry it, so that's the first guess; the full raw payload is kept
// regardless so this can be corrected later without any data loss.
const setEvent = async (req, res) => {
  try {
    const q = req.query;
    const { 'device-type': deviceType, 'serial-no': serialNo, 'seq-no': seqNo, evt_id: evtId } = q;
    const { 'date-dd': dd, 'date-mm': mm, 'date-yyyy': yyyy, 'time-hh': hh, 'time-mm': min, 'time-ss': ss } = q;

    // Date/time fields the device sends are its own local (IST) wall-clock — converted
    // explicitly rather than via the server process's local timezone, which may be UTC in
    // production (Vercel) and would otherwise shift punches onto the wrong calendar day.
    const occurredAt = (yyyy && mm && dd)
      ? istPartsToUtcDate(Number(yyyy), Number(mm), Number(dd), Number(hh) || 0, Number(min) || 0, Number(ss) || 0)
      : new Date();

    const matrixUserId = q['user-id'] || q['field-1'] || null;

    if (matrixUserId) {
      await AttendanceEvent.create({
        matrixUserId: String(matrixUserId),
        deviceType: deviceType != null ? Number(deviceType) : undefined,
        serialNo,
        evtId: evtId != null ? Number(evtId) : undefined,
        seqNo: seqNo != null ? Number(seqNo) : undefined,
        occurredAt,
        raw: q,
      });
    }

    textResponse(res, { status: 1 });
  } catch (error) {
    textResponse(res, { status: 0 });
  }
};

module.exports = { requireDeviceAuth, login, poll, getCommand, getConfiguration, setEvent };
