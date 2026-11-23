/**
 * Account emails (verify address, reset password, invitation updates). Table layout + inline styles so they
 * render in Gmail, Apple Mail and Outlook; the brand palette matches giftCardEmail.js.
 */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const first = (name) => String(name || '').trim().split(/\s+/)[0] || 'there';
const C = { canvas: '#f1ebe0', paper: '#fbf8f2', ink: '#1d1a17', ink2: '#6f665d', gold: '#a5843f', line: '#e4dacb', btn: '#1d1a17' };
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

function layout({ title, intro, button, url, outro }) {
  const html = `<!doctype html><html><body style="margin:0;background:${C.canvas};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.canvas};padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${C.paper};border:1px solid ${C.line};">
<tr><td style="padding:28px 32px 8px;font:600 11px/1 ${SANS};letter-spacing:3px;text-transform:uppercase;color:${C.gold};">Guide Photo Studio</td></tr>
<tr><td style="padding:8px 32px 0;font:400 28px/1.25 ${SERIF};color:${C.ink};">${esc(title)}</td></tr>
<tr><td style="padding:16px 32px 0;font:400 15px/1.7 ${SANS};color:${C.ink2};">${intro}</td></tr>
${button ? `<tr><td style="padding:26px 32px 6px;"><a href="${esc(url)}" style="display:inline-block;background:${C.btn};color:#fff;text-decoration:none;font:600 12px/1 ${SANS};letter-spacing:2px;text-transform:uppercase;padding:16px 26px;">${esc(button)}</a></td></tr>
<tr><td style="padding:10px 32px 0;font:400 12px/1.6 ${SANS};color:${C.ink2};">Or paste this link into your browser:<br><span style="word-break:break-all;color:${C.gold};">${esc(url)}</span></td></tr>` : ''}
<tr><td style="padding:22px 32px 30px;font:400 13px/1.7 ${SANS};color:${C.ink2};">${outro || ''}</td></tr>
</table>
<p style="font:400 11px/1.6 ${SANS};color:${C.ink2};margin:16px 0 0;">Guide Photo Studio · Arun Vihar, Sector 37, Noida</p>
</td></tr></table></body></html>`;
  return html;
}

export function verifyEmail({ name, url }) {
  return {
    subject: 'Confirm your email · Guide Photo Studio',
    text: `Hi ${first(name)},\n\nPlease confirm your email address for your Guide Photo Studio account:\n${url}\n\nThis link works for 24 hours. If you didn't create an account, you can ignore this email.`,
    html: layout({
      title: 'Confirm your email',
      intro: `Hi ${esc(first(name))}, welcome to Guide Photo Studio. Please confirm this is your email address so we can show your gift cards and keep your invitation safe.`,
      button: 'Confirm email', url,
      outro: 'This link works for 24 hours. If you didn’t create an account, you can safely ignore this email.',
    }),
  };
}

export function resetEmail({ name, url }) {
  return {
    subject: 'Reset your password · Guide Photo Studio',
    text: `Hi ${first(name)},\n\nWe received a request to reset your Guide Photo Studio password. Choose a new one here:\n${url}\n\nThis link works for 1 hour and can be used once. If you didn't ask for this, ignore this email — your password won't change.`,
    html: layout({
      title: 'Reset your password',
      intro: `Hi ${esc(first(name))}, we received a request to reset the password for your account. Choose a new password using the button below.`,
      button: 'Choose a new password', url,
      outro: 'This link works for 1 hour and can be used once. If you didn’t ask for this, ignore this email — your password won’t change.',
    }),
  };
}

export function passwordChangedEmail({ name, url }) {
  return {
    subject: 'Your password was changed · Guide Photo Studio',
    text: `Hi ${first(name)},\n\nThe password for your Guide Photo Studio account was just changed and you've been signed out on other devices.\n\nIf this wasn't you, reset your password now: ${url}`,
    html: layout({
      title: 'Your password was changed',
      intro: `Hi ${esc(first(name))}, the password for your account was just changed, and any other devices have been signed out.`,
      outro: `If this wasn’t you, <a href="${esc(url)}" style="color:${C.gold};">reset your password</a> straight away and contact us on WhatsApp.`,
    }),
  };
}

export function invitePublishedEmail({ name, couple, url }) {
  return {
    subject: `Your invitation is live · ${couple}`,
    text: `Hi ${first(name)},\n\nGreat news — your wedding invitation for ${couple} is now live:\n${url}\n\nShare the link with your guests on WhatsApp. You can keep editing it any time from your account.`,
    html: layout({
      title: 'Your invitation is live 💌',
      intro: `Hi ${esc(first(name))}, your wedding invitation for <b style="color:${C.ink}">${esc(couple)}</b> has been published. Share the link with your guests — RSVPs and blessings will appear in your account.`,
      button: 'Open the invitation', url,
      outro: 'You can keep editing your invitation from your account at any time.',
    }),
  };
}

/** To the studio: a customer sent their invitation for review. */
export function inviteSubmittedEmail({ customer, couple, pkg, adminUrl, previewUrl }) {
  return {
    subject: `Invitation ready for review: ${couple}`,
    text: `${customer.name} (${customer.email}${customer.phone ? `, ${customer.phone}` : ''}) sent their invitation "${couple}" (${pkg} package) for review.\n\nPreview: ${previewUrl}\nAdmin: ${adminUrl}\n\nConfirm payment, then publish it from Admin → Invitations.`,
    html: layout({
      title: 'Invitation ready for review',
      intro: `<b style="color:${C.ink}">${esc(customer.name)}</b> (${esc(customer.email)}${customer.phone ? `, ${esc(customer.phone)}` : ''}) sent their invitation <b style="color:${C.ink}">${esc(couple)}</b> — ${esc(pkg)} package — for review.`,
      button: 'Preview the invitation', url: previewUrl,
      outro: `Confirm payment, then publish it from <a href="${esc(adminUrl)}" style="color:${C.gold};">Admin → Invitations</a>.`,
    }),
  };
}
