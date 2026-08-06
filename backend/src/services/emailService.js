const { getTransporter } = require('../config/email');

const FROM_NAME = process.env.EMAIL_FROM_NAME || 'B2C Task Tracker';

const sendMail = async ({ to, subject, html }) => {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('[email] Skipped — EMAIL_USER / EMAIL_APP_PASSWORD not configured');
    return;
  }
  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('[email] Send failed:', error.message);
  }
};

const sendReportSubmittedEmail = async ({ to, recipientName, rmName, reportDate, totalTasksCount, submittedAt }) => {
  const dateStr = new Date(reportDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const submittedAtStr = new Date(submittedAt || Date.now()).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
    timeZone: 'Asia/Kolkata',
  });
  const frontendUrl = (process.env.FRONTEND_URL || '').split(',')[0].trim();
  const initial = (rmName || '?').trim().charAt(0).toUpperCase();

  await sendMail({
    to,
    subject: `Daily Report Submitted — ${rmName} (${dateStr})`,
    html: `
      <div style="background-color: #f3f4f6; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color: #2563eb; padding: 24px 32px;">
              <p style="margin: 0; color: #dbeafe; font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;">B2C Task Tracker</p>
              <h1 style="margin: 4px 0 0; color: #ffffff; font-size: 20px; font-weight: 700;">New Daily Report Submitted</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 32px 8px;">
              <p style="margin: 0 0 16px; color: #374151; font-size: 15px; line-height: 1.5;">Hi ${recipientName || ''},</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="width: 40px; height: 40px; background-color: #dbeafe; border-radius: 50%; text-align: center; vertical-align: middle; font-size: 16px; font-weight: 700; color: #2563eb;">${initial}</td>
                  <td style="padding-left: 12px; vertical-align: middle;">
                    <p style="margin: 0; color: #111827; font-size: 15px; line-height: 1.5;"><strong>${rmName}</strong> submitted their daily report for <strong>${dateStr}</strong>.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px;">
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 2px; color: #6b7280; font-size: 12px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase;">Total Applications</p>
                    <p style="margin: 0; color: #111827; font-size: 22px; font-weight: 700;">${totalTasksCount ?? 0}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 2px; color: #6b7280; font-size: 12px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase;">Submitted At</p>
                    <p style="margin: 0; color: #111827; font-size: 15px; font-weight: 600;">${submittedAtStr} IST</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${frontendUrl ? `
          <tr>
            <td style="padding: 0 32px 32px;">
              <a href="${frontendUrl}" style="display: inline-block; width: 100%; box-sizing: border-box; background-color: #2563eb; color: #ffffff; text-decoration: none; text-align: center; padding: 12px 0; border-radius: 8px; font-size: 14px; font-weight: 600;">View Report</a>
            </td>
          </tr>` : ''}
          <tr>
            <td style="padding: 16px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">This is an automated notification from the B2C Task Tracker. Please do not reply to this email.</p>
            </td>
          </tr>
        </table>
      </div>
    `,
  });
};

module.exports = { sendMail, sendReportSubmittedEmail };
