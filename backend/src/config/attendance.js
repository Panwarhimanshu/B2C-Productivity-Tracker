// The Matrix device and the business it punches for are both in India; the server process
// itself may run in any timezone (e.g. UTC on Vercel), so all date/time math here is done
// explicitly against IST rather than relying on the server's local timezone.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Device-reported date/time fields (local, IST wall-clock) -> the correct UTC instant.
const istPartsToUtcDate = (year, month, day, hour = 0, minute = 0, second = 0) => (
  new Date(Date.UTC(year, month - 1, day, hour, minute, second) - IST_OFFSET_MS)
);

// Calendar-day key (YYYY-MM-DD) of a UTC instant, as it falls in IST.
const istDateKey = (date) => {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Placeholder — no confirmed office start time yet. Adjust once known; a punch after this
// time (IST) marks the day "Late" instead of "Present".
const LATE_AFTER = { hour: 10, minute: 30 };

const isLate = (firstIn) => {
  if (!firstIn) return false;
  const shifted = new Date(firstIn.getTime() + IST_OFFSET_MS);
  const hour = shifted.getUTCHours();
  const minute = shifted.getUTCMinutes();
  return hour > LATE_AFTER.hour || (hour === LATE_AFTER.hour && minute > LATE_AFTER.minute);
};

// Reduce a day's raw punch events (already sorted or not) into first-in / last-out / status.
const summarizeDay = (events) => {
  if (!events.length) return { status: 'Absent', firstIn: null, lastOut: null, punchCount: 0 };
  const sorted = [...events].sort((a, b) => a.occurredAt - b.occurredAt);
  const firstIn = sorted[0].occurredAt;
  const lastOut = sorted[sorted.length - 1].occurredAt;
  return {
    status: isLate(firstIn) ? 'Late' : 'Present',
    firstIn,
    lastOut,
    punchCount: sorted.length,
  };
};

// Group a flat list of events (already scoped to one matrixUserId) into per-day summaries,
// keyed by YYYY-MM-DD in IST.
const groupByDay = (events) => {
  const byDay = {};
  events.forEach((e) => {
    const key = istDateKey(e.occurredAt);
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(e);
  });
  return Object.fromEntries(
    Object.entries(byDay).map(([day, dayEvents]) => [day, summarizeDay(dayEvents)])
  );
};

module.exports = {
  IST_OFFSET_MS, istPartsToUtcDate, istDateKey, LATE_AFTER, isLate, summarizeDay, groupByDay,
};
