import nodemailer from "nodemailer";

/**
 * Transactional email helper (SMTP via nodemailer).
 *
 * Credentials come from the environment (SMTP_HOST / SMTP_PORT / SMTP_USER /
 * SMTP_PASS, with MAIL_FROM as the sender). If SMTP isn't configured, sendMail
 * becomes a no-op that logs a warning — so the rest of the app keeps working in
 * local/dev without an email provider.
 */
const HOST = process.env.SMTP_HOST;
const PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
const USER = process.env.SMTP_USER;
const PASS = process.env.SMTP_PASS;
const FROM = process.env.MAIL_FROM || USER || "no-reply@kinex.health";

export const isEmailConfigured = Boolean(HOST && USER && PASS);

const transporter = isEmailConfigured
  ? nodemailer.createTransport({
      host: HOST,
      port: PORT,
      // Port 465 uses implicit TLS; everything else (587/STARTTLS) does not.
      secure: PORT === 465,
      auth: { user: USER!, pass: PASS! },
    })
  : null;

/** Send a transactional email. Returns true if sent, false if email is disabled. */
export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  if (!transporter) {
    console.warn(`[email] SMTP not configured — skipping email to ${opts.to} (${opts.subject})`);
    return false;
  }
  await transporter.sendMail({
    from: FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
  return true;
}

/**
 * Build the "your video consultation is tomorrow" reminder email sent to the
 * patient a day before an ONLINE appointment, including their Whereby join link.
 */
export function buildReminderEmail(params: {
  patientName: string;
  doctorName: string;
  scheduledAt: Date;
  roomUrl: string;
}): { subject: string; html: string; text: string } {
  const when = params.scheduledAt.toLocaleString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
  const subject = `Reminder: your video consultation with Dr. ${params.doctorName} is tomorrow`;
  const html = `
    <div style="font-family:system-ui,Arial,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
      <h2 style="color:#0d6efd">Your video consultation is tomorrow</h2>
      <p>Hi ${params.patientName},</p>
      <p>This is a reminder that you have an online consultation with
      <strong>Dr. ${params.doctorName}</strong> scheduled for:</p>
      <p style="font-size:16px;font-weight:bold">${when} (IST)</p>
      <p>When it's time, join the video room using the button below:</p>
      <p style="margin:24px 0">
        <a href="${params.roomUrl}"
           style="background:#0d6efd;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold">
          Join your consultation
        </a>
      </p>
      <p style="font-size:13px;color:#666">Or paste this link into your browser:<br>${params.roomUrl}</p>
      <p style="font-size:13px;color:#666">See you there,<br>The Kinex Healthcare team</p>
    </div>`;
  const text = `Hi ${params.patientName},

Reminder: your online consultation with Dr. ${params.doctorName} is scheduled for ${when} (IST).

Join your consultation here: ${params.roomUrl}

— The Kinex Healthcare team`;
  return { subject, html, text };
}
