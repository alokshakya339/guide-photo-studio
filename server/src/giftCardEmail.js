/**
 * Email a buyer receives after paying for a Guide Photo Studio gift card online.
 * Table layout + inline styles so it renders in Gmail, Apple Mail and Outlook.
 */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const day = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
const first = (name) => String(name || '').trim().split(/\s+/)[0] || '';

const C = { canvas: '#f1ebe0', paper: '#fbf8f2', ink: '#1d1a17', ink2: '#6f665d', gold: '#a5843f', goldLt: '#d4b37a', card: '#171411', line: '#e4dacb', red: '#b3141c' };
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

/** @param g gift card · site: absolute site URL · studio: studio details · image: optional https banner */
export function giftCardBuyerEmail(g, { site, studio, image }) {
  const bookUrl = `${site}/contact?gift=${encodeURIComponent(g.code)}`;
  const checkUrl = `${site}/gift-cards#check`;
  const forWho = g.recipientName ? `For ${g.recipientName}` : 'For someone special';
  const fromWho = g.senderName ? `from ${g.senderName}` : '';
  const shareText = [
    `🎁 ${g.recipientName ? `Hi ${first(g.recipientName)}! ` : ''}You've received a ${inr(g.amount)} Guide Photo Studio gift card${g.senderName ? ` from ${g.senderName}` : ''}!`,
    g.message ? `"${g.message}"` : '',
    `Code: ${g.code}`,
    `Valid until ${day(g.expiresAt)}`,
    `Book your shoot: ${bookUrl}`,
  ].filter(Boolean).join('\n');
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const waStudio = `https://wa.me/${studio.whatsapp}?text=${encodeURIComponent(`Hi Guide Photo Studio! I have a question about gift card ${g.code}.`)}`;
  const insta = studio.social?.instagram || '';
  const handle = (insta.match(/instagram\.com\/([^/?#]+)/) || [])[1];

  const subject = `🎁 Your ${inr(g.amount)} Guide Photo Studio gift card is ready · ${g.code}`;
  const preheader = `${forWho} · code ${g.code} · valid until ${day(g.expiresAt)}`;

  const step = (n, title, text) => `
    <tr><td style="padding:0 0 14px 0">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="top" style="width:36px"><div style="width:26px;height:26px;border:1px solid ${C.gold};color:${C.gold};font:italic 400 14px/24px ${SERIF};text-align:center">${n}</div></td>
        <td style="font:400 14px/1.6 ${SANS};color:${C.ink2}"><b style="color:${C.ink}">${title}</b><br>${text}</td>
      </tr></table>
    </td></tr>`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.canvas}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.canvas}">
<tr><td align="center" style="padding:30px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">

  <tr><td align="center" style="padding:4px 0 24px">
    <div style="font:400 30px/1 ${SERIF};color:${C.ink};letter-spacing:.5px">Guide <i style="color:${C.gold}">Photo</i> Studio</div>
    <div style="font:600 9px/1 ${SANS};color:${C.gold};letter-spacing:4px;margin-top:8px">NOIDA · DELHI NCR · DESTINATIONS</div>
  </td></tr>

  <tr><td style="background:${C.paper};padding:36px 30px;border-top:2px solid ${C.gold}">
    <div style="font:600 11px/1 ${SANS};letter-spacing:3px;color:${C.gold};text-align:center">PAYMENT RECEIVED</div>
    <h1 style="margin:14px 0 8px;font:400 31px/1.2 ${SERIF};color:${C.ink};text-align:center">Your gift card is <i style="color:${C.red}">ready</i></h1>
    <p style="margin:0 0 28px;font:400 15px/1.65 ${SANS};color:${C.ink2};text-align:center">
      Thank you${g.senderName ? `, ${esc(first(g.senderName))}` : ''}! You've given ${g.recipientName ? `<b style="color:${C.ink}">${esc(g.recipientName)}</b>` : 'someone special'} a shoot with a family of photographers, three generations strong.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.card}">
      ${image ? `<tr><td><img src="${esc(image)}" width="500" alt="" style="display:block;width:100%;max-width:500px;height:170px;object-fit:cover;border:0"></td></tr>` : ''}
      <tr><td style="padding:26px 26px 24px;background:${C.card}">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="font:400 17px/1 ${SERIF};color:#f7f3ec">Guide Photo Studio</td>
          <td align="right" style="font:italic 400 19px/1 ${SERIF};color:${C.goldLt}">Gift card</td>
        </tr></table>
        <div style="font:400 48px/1 ${SERIF};color:#f7f3ec;margin:24px 0 8px">${inr(g.amount)}</div>
        <div style="font:400 14px/1.4 ${SANS};color:#d6cdc0">${esc(forWho)}${fromWho ? ` · ${esc(fromWho)}` : ''}</div>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px"><tr>
          <td style="border:1px dashed rgba(212,179,122,.7);padding:11px 16px;font:700 20px/1 'Courier New',Courier,monospace;letter-spacing:3px;color:#f7f3ec">${esc(g.code)}</td>
        </tr></table>
        <div style="font:400 12px/1 ${SANS};color:${C.goldLt};margin-top:12px">Valid until ${day(g.expiresAt)} · any shoot</div>
      </td></tr>
    </table>

    ${g.message ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px"><tr>
      <td style="border-left:2px solid ${C.gold};padding:4px 0 4px 16px;font:italic 400 17px/1.5 ${SERIF};color:${C.ink}">“${esc(g.message)}”${g.senderName ? `<div style="font:400 13px/1 ${SANS};font-style:normal;color:${C.ink2};margin-top:8px">— ${esc(g.senderName)}</div>` : ''}</td>
    </tr></table>` : ''}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px"><tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="background:${C.ink}"><a href="${esc(shareUrl)}" style="display:inline-block;padding:15px 28px;font:600 12px/1 ${SANS};letter-spacing:2px;color:#f7f3ec;text-decoration:none">SHARE ON WHATSAPP</a></td>
      </tr></table>
      <div style="margin-top:14px;font:400 13px/1.5 ${SANS}"><a href="${esc(bookUrl)}" style="color:${C.gold};text-decoration:underline">Book a shoot with this card</a> &nbsp;·&nbsp; <a href="${esc(checkUrl)}" style="color:${C.gold};text-decoration:underline">Check its status</a></div>
    </td></tr></table>

    <div style="height:1px;background:${C.line};margin:30px 0 24px"></div>
    <div style="font:600 11px/1 ${SANS};letter-spacing:3px;color:${C.gold};margin-bottom:16px">HOW TO USE IT</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${step(1, 'Share the code', 'Forward this email, tap “Share on WhatsApp”, or print it as part of a wedding or baby-shower gift.')}
      ${step(2, 'Book any shoot', 'Weddings, pre-wedding, maternity, baby, birthdays or headshots.')}
      ${step(3, 'Mention the code', `Add <b style="color:${C.ink}">${esc(g.code)}</b> when enquiring, and the value comes off the package.`)}
    </table>
  </td></tr>

  <tr><td align="center" style="padding:26px 10px 8px;font:400 13px/1.7 ${SANS};color:${C.ink2}">
    Questions? <a href="${esc(waStudio)}" style="color:${C.gold}">WhatsApp us</a> · <a href="tel:${esc(studio.phoneRaw)}" style="color:${C.gold}">${esc(studio.phone)}</a> · <a href="mailto:${esc(studio.email)}" style="color:${C.gold}">${esc(studio.email)}</a><br>
    ${esc(studio.address)}<br>
    ${insta ? `<a href="${esc(insta)}" style="color:${C.gold}">${esc(handle ? `@${handle}` : 'Instagram')}</a> · ` : ''}<a href="${esc(site)}" style="color:${C.gold}">${esc(site.replace(/^https?:\/\//, ''))}</a>
  </td></tr>
  <tr><td align="center" style="padding:6px 10px 20px;font:400 11px/1.6 ${SANS};color:#a3998e">
    ${esc(studio.name)} · Keep this email safe — the code works like cash.${g.paymentId ? ` Payment reference: ${esc(g.paymentId)}` : ''}
  </td></tr>

</table>
</td></tr></table>
</body></html>`;

  const text = [
    'Your Guide Photo Studio gift card is ready!',
    '',
    `Thank you${g.senderName ? `, ${first(g.senderName)}` : ''}! Your ${inr(g.amount)} gift card ${g.recipientName ? `for ${g.recipientName} ` : ''}is ready.`,
    '',
    `Code: ${g.code}`,
    `Valid until: ${day(g.expiresAt)} (any shoot)`,
    g.message ? `Message: "${g.message}"` : '',
    '',
    `Book with this card: ${bookUrl}`,
    `Share on WhatsApp: ${shareUrl}`,
    '',
    `Questions? ${studio.phone} · ${studio.email}`,
    `${studio.name} · ${studio.address}`,
  ].join('\n');

  return { subject, html, text };
}
