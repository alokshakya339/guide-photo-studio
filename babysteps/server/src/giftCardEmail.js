/**
 * The email a buyer receives after paying for a gift card online.
 * Table layout + inline styles so it renders in Gmail, Apple Mail and Outlook. Colours match the website
 * (blush canvas, copper accents, cocoa gift card).
 */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const day = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
const first = (name) => String(name || '').trim().split(/\s+/)[0] || '';

const C = { canvas: '#f6e8e0', paper: '#fffaf7', ink: '#2e2420', ink2: '#74615a', copper: '#a4664f', cocoa: '#4a3029', line: '#ead6cb', blush: '#d2a594' };
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

/**
 * @param g      the gift card document
 * @param site   absolute website URL (e.g. https://babystepsbyguide.com) for links and images
 * @param studio studio details (name, phone, phoneHref, whatsapp, email, address, instagram, instagramHandle, parent)
 * @param image  optional absolute https image URL for the card banner
 */
export function giftCardBuyerEmail(g, { site, studio, image }) {
  const bookUrl = `${site}/contact?gift=${encodeURIComponent(g.code)}#book`;
  const checkUrl = `${site}/gift-cards`;
  const forWho = g.recipientName ? `For ${g.recipientName}` : 'For someone special';
  const fromWho = g.senderName ? `from ${g.senderName}` : '';
  const shareText = [
    `🎁 ${g.recipientName ? `Hi ${first(g.recipientName)}! ` : ''}You've received a ${inr(g.amount)} BabySteps photography gift card${g.senderName ? ` from ${g.senderName}` : ''}!`,
    g.message ? `"${g.message}"` : '',
    `Code: ${g.code}`,
    `Valid until ${day(g.expiresAt)}`,
    `Book your session: ${bookUrl}`,
  ].filter(Boolean).join('\n');
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const waStudio = `https://wa.me/${studio.whatsapp}?text=${encodeURIComponent(`Hi BabySteps! I have a question about gift card ${g.code}.`)}`;

  const subject = `🎁 Your ${inr(g.amount)} BabySteps gift card is ready · ${g.code}`;
  const preheader = `${forWho} · code ${g.code} · valid until ${day(g.expiresAt)}`;

  const step = (n, title, text) => `
    <tr><td style="padding:0 0 14px 0">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="top" style="width:34px"><div style="width:26px;height:26px;border-radius:13px;background:${C.canvas};color:${C.copper};font:600 12px/26px ${SANS};text-align:center">${n}</div></td>
        <td style="font:400 14px/1.55 ${SANS};color:${C.ink2}"><b style="color:${C.ink}">${title}</b><br>${text}</td>
      </tr></table>
    </td></tr>`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.canvas}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.canvas}">
<tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">

  <!-- Wordmark -->
  <tr><td align="center" style="padding:6px 0 22px">
    <div style="font:400 30px/1 ${SERIF};color:${C.copper};letter-spacing:.5px">BabySteps</div>
    <div style="font:600 9px/1 ${SANS};color:${C.copper};letter-spacing:4px;margin-top:6px">GUIDE&nbsp;STUDIO</div>
  </td></tr>

  <!-- Main panel -->
  <tr><td style="background:${C.paper};border-radius:22px;padding:34px 28px">
    <div style="font:600 11px/1 ${SANS};letter-spacing:3px;color:${C.copper};text-align:center">PAYMENT RECEIVED</div>
    <h1 style="margin:12px 0 8px;font:400 30px/1.2 ${SERIF};color:${C.ink};text-align:center">Your gift card is <i style="color:${C.copper}">ready</i> 🎁</h1>
    <p style="margin:0 0 26px;font:400 15px/1.6 ${SANS};color:${C.ink2};text-align:center">
      Thank you${g.senderName ? `, ${esc(first(g.senderName))}` : ''}! You've just given ${g.recipientName ? `<b style="color:${C.ink}">${esc(g.recipientName)}</b>` : 'someone special'} the gift of timeless family memories.
    </p>

    <!-- The gift card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:18px;overflow:hidden;background:${C.cocoa}">
      ${image ? `<tr><td><img src="${esc(image)}" width="504" alt="" style="display:block;width:100%;max-width:504px;height:170px;object-fit:cover;border:0"></td></tr>` : ''}
      <tr><td style="padding:24px 24px 22px;background:${C.cocoa}">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="font:400 17px/1 ${SERIF};color:#fff;letter-spacing:1px">BABYSTEPS<div style="font:600 8px/1 ${SANS};letter-spacing:3px;color:${C.blush};margin-top:5px">GUIDE STUDIO</div></td>
          <td align="right" style="font:italic 400 20px/1 ${SERIF};color:${C.blush}">Gift card</td>
        </tr></table>
        <div style="font:400 46px/1 ${SERIF};color:#fff;margin:22px 0 8px">${inr(g.amount)}</div>
        <div style="font:400 14px/1.4 ${SANS};color:#f3dfd5">${esc(forWho)}${fromWho ? ` · ${esc(fromWho)}` : ''}</div>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px"><tr>
          <td style="border:1.5px dashed rgba(255,255,255,.55);border-radius:10px;padding:10px 16px;font:700 20px/1 'Courier New',Courier,monospace;letter-spacing:3px;color:#fff">${esc(g.code)}</td>
        </tr></table>
        <div style="font:400 12px/1 ${SANS};color:${C.blush};margin-top:12px">Valid until ${day(g.expiresAt)} · any session</div>
      </td></tr>
    </table>

    ${g.message ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px"><tr>
      <td style="border-left:3px solid ${C.blush};padding:4px 0 4px 16px;font:italic 400 17px/1.5 ${SERIF};color:${C.ink}">“${esc(g.message)}”${g.senderName ? `<div style="font:400 13px/1 ${SANS};font-style:normal;color:${C.ink2};margin-top:8px">— ${esc(g.senderName)}</div>` : ''}</td>
    </tr></table>` : ''}

    <!-- Buttons -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px"><tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="border-radius:999px;background:${C.copper}"><a href="${esc(shareUrl)}" style="display:inline-block;padding:15px 28px;font:600 13px/1 ${SANS};letter-spacing:1.5px;color:#fff;text-decoration:none">SHARE ON WHATSAPP</a></td>
      </tr></table>
      <div style="margin-top:14px;font:400 13px/1.5 ${SANS}"><a href="${esc(bookUrl)}" style="color:${C.copper};text-decoration:underline">Book a session with this card</a> &nbsp;·&nbsp; <a href="${esc(checkUrl)}" style="color:${C.copper};text-decoration:underline">Check its status</a></div>
    </td></tr></table>

    <!-- How it works -->
    <div style="height:1px;background:${C.line};margin:30px 0 24px"></div>
    <div style="font:600 11px/1 ${SANS};letter-spacing:3px;color:${C.copper};margin-bottom:16px">HOW TO USE IT</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${step(1, 'Share the code', `Forward this email, tap "Share on WhatsApp", or print it for a baby shower or naming ceremony.`)}
      ${step(2, 'Book any session', 'Maternity, newborn, milestone, cake smash or family — online or by WhatsApp.')}
      ${step(3, 'Enter the code', `Add <b style="color:${C.ink}">${esc(g.code)}</b> in the booking form and the value comes off the package.`)}
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td align="center" style="padding:26px 10px 8px;font:400 13px/1.7 ${SANS};color:${C.ink2}">
    Questions? <a href="${esc(waStudio)}" style="color:${C.copper}">WhatsApp us</a> · <a href="${esc(studio.phoneHref)}" style="color:${C.copper}">${esc(studio.phone)}</a> · <a href="mailto:${esc(studio.email)}" style="color:${C.copper}">${esc(studio.email)}</a><br>
    ${esc(studio.address)}<br>
    <a href="${esc(studio.instagram)}" style="color:${C.copper}">${esc(studio.instagramHandle)}</a> · <a href="${esc(site)}" style="color:${C.copper}">${esc(site.replace(/^https?:\/\//, ''))}</a>
  </td></tr>
  <tr><td align="center" style="padding:6px 10px 20px;font:400 11px/1.6 ${SANS};color:#a8958c">
    ${esc(studio.name)} · Powered by ${esc(studio.parent)}<br>
    Keep this email safe — the code works like cash. Payment reference: ${esc(g.paymentId || '')}
  </td></tr>

</table>
</td></tr></table>
</body></html>`;

  const text = [
    `Your BabySteps gift card is ready!`,
    '',
    `Thank you${g.senderName ? `, ${first(g.senderName)}` : ''}! Your ${inr(g.amount)} photography gift card ${g.recipientName ? `for ${g.recipientName} ` : ''}is ready.`,
    '',
    `Code: ${g.code}`,
    `Valid until: ${day(g.expiresAt)} (any session)`,
    g.message ? `Message: "${g.message}"` : '',
    '',
    'How to use it:',
    '1. Share the code with them.',
    '2. They book any session — maternity, newborn, milestone, cake smash or family.',
    `3. They enter ${g.code} in the booking form and the value comes off the package.`,
    '',
    `Book with this card: ${bookUrl}`,
    `Share on WhatsApp: ${shareUrl}`,
    '',
    `Questions? WhatsApp ${studio.phone} · ${studio.email}`,
    `${studio.name} · ${studio.address}`,
  ].filter((l) => l !== null).join('\n');

  return { subject, html, text };
}
