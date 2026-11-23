/**
 * Email for gift cards and studio alerts. The first configured provider wins:
 *  - Brevo:   BREVO_API_KEY (+ BREVO_SMTP_LOGIN when the key is an SMTP key "xsmtpsib-…")
 *             An API key ("xkeysib-…") uses Brevo's HTTP API instead — no login needed.
 *  - Resend:  RESEND_API_KEY
 *  - SMTP:    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (e.g. a Hostinger mailbox)
 * Sender: EMAIL_FROM (must be a verified sender/domain at the provider). Recipient: NOTIFY_EMAIL, else EMAIL_FROM.
 * Failures are logged, never thrown — an email problem must not lose an enquiry.
 */
import nodemailer from 'nodemailer';

const env = (k) => (process.env[k] || '').trim();

function provider() {
  const brevo = env('BREVO_API_KEY');
  if (brevo) {
    if (brevo.startsWith('xkeysib-')) return { name: 'brevo-api', key: brevo };
    return { name: 'brevo-smtp', smtp: { host: 'smtp-relay.brevo.com', port: 587, secure: false, auth: { user: env('BREVO_SMTP_LOGIN'), pass: brevo } } };
  }
  if (env('RESEND_API_KEY')) return { name: 'resend', smtp: { host: 'smtp.resend.com', port: 465, secure: true, auth: { user: 'resend', pass: env('RESEND_API_KEY') } } };
  if (env('SMTP_HOST')) {
    const port = Number(env('SMTP_PORT')) || 465;
    return { name: 'smtp', smtp: { host: env('SMTP_HOST'), port, secure: port === 465, auth: { user: env('SMTP_USER'), pass: env('SMTP_PASS') } } };
  }
  return null;
}

const sender = () => env('EMAIL_FROM') || env('SMTP_USER');
const senderName = () => env('EMAIL_FROM_NAME') || 'Guide Photo Studio';
const recipient = () => env('NOTIFY_EMAIL') || sender();
export const emailEnabled = () => Boolean(provider() && sender() && recipient());
export const emailProvider = () => provider()?.name || null;

let transport = null;
let transportKey = '';
function smtpTransport(p) {
  const key = JSON.stringify(p.smtp);
  if (!transport || key !== transportKey) { transport = nodemailer.createTransport(p.smtp); transportKey = key; }
  return transport;
}

/** Send one email through whichever provider is configured. */
export async function sendEmail({ subject, text, html, replyTo, to }) {
  const p = provider();
  if (!p || !sender()) throw new Error('Email is not configured');
  if (p.name === 'brevo-api') {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': p.key, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: senderName(), email: sender() },
        to: [{ email: to || recipient() }],
        ...(replyTo ? { replyTo: { email: replyTo } } : {}),
        subject, textContent: text, htmlContent: html,
      }),
    });
    if (!res.ok) throw new Error(`Brevo API ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return;
  }
  await smtpTransport(p).sendMail({ from: `"${senderName()}" <${sender()}>`, to: to || recipient(), replyTo: replyTo || undefined, subject, text, html });
}
