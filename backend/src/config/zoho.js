// Zoho People attendance data — the Matrix punch machine syncs into Zoho People directly, so
// this reads attendance from there rather than talking to the punch machine itself. Auth is
// OAuth2 refresh-token based: ZOHO_REFRESH_TOKEN is long-lived (from a one-time Self Client
// grant), exchanged here for short-lived access tokens as needed.

let cachedToken = null;
let cachedTokenExpiry = 0;

const getAccessToken = async () => {
  if (cachedToken && Date.now() < cachedTokenExpiry) return cachedToken;

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    refresh_token: process.env.ZOHO_REFRESH_TOKEN,
  });
  const res = await fetch(`${process.env.ZOHO_ACCOUNTS_DOMAIN}/oauth/v2/token`, {
    method: 'POST',
    body: params,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Zoho token refresh failed: ${JSON.stringify(data)}`);

  cachedToken = data.access_token;
  cachedTokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // refresh a minute early
  return cachedToken;
};

const callUserReport = async (params) => {
  const token = await getAccessToken();
  const res = await fetch(`${process.env.ZOHO_PEOPLE_API_DOMAIN}/people/api/attendance/getUserReport?${params}`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });
  return res.json();
};

// Bulk mode (no employee identifier) wraps results as { result: [{ employeeDetails,
// attendanceDetails }, ...] }. Single-employee mode (emailId/empId/mapId given) instead
// returns the attendanceDetails map directly, with no wrapper — verified against the live API.
const getUserReportPage = async (params) => {
  const data = await callUserReport(params);
  if (!data.result) throw new Error(`Zoho getUserReport failed: ${JSON.stringify(data)}`);
  return data.result;
};

// One employee's attendanceDetails (keyed by YYYY-MM-DD) over [sdate, edate] (dd-MM-yyyy), or
// null if that email doesn't match a Zoho People employee.
const fetchAttendanceForEmail = async (email, sdate, edate) => {
  const params = new URLSearchParams({ sdate, edate, dateFormat: 'dd-MM-yyyy', emailId: email });
  const data = await callUserReport(params);
  if (data.error) return null; // no matching employee for this email
  return data;
};

// Every employee's attendanceDetails over [sdate, edate], keyed by lowercased email. Zoho
// paginates 100 employees per page.
const fetchAttendanceForAll = async (sdate, edate) => {
  const byEmail = new Map();
  let startIndex = 0;
  for (;;) {
    const params = new URLSearchParams({ sdate, edate, dateFormat: 'dd-MM-yyyy', startIndex: String(startIndex) });
    const page = await getUserReportPage(params);
    page.forEach((entry) => {
      const email = entry.employeeDetails?.['mail id'];
      if (email) byEmail.set(email.toLowerCase(), entry.attendanceDetails);
    });
    if (page.length < 100) break;
    startIndex += 100;
  }
  return byEmail;
};

module.exports = { fetchAttendanceForEmail, fetchAttendanceForAll };
