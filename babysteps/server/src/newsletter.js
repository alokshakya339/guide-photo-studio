/**
 * Email broadcasts to newsletter subscribers: the branded email template and the background sender.
 *
 * Sending is one email per subscriber (each gets their own unsubscribe link), paced by BROADCAST_DELAY_MS
 * (default 400 ms ≈ 150 emails a minute). Progress is saved after every email, so a send that is paused,
 * or interrupted by a restart, resumes without emailing anyone twice.
 */
import crypto from 'node:crypto';
import { Broadcast, Subscriber, Setting } from './models.js';
import { emailEnabled, sendEmail } from './mailer.js';
import { content as siteContent } from './seo.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const C = { canvas: '#f6e8e0', paper: '#fffaf7', ink: '#2e2420', ink2: '#74615a', copper: '#a4664f', line: '#ead6cb' };
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export const newToken = () => crypto.randomBytes(18).toString('hex');
const firstName = (n) => String(n || '').trim().split(/\s+/)[0] || '';
const absUrl = (site, u) => (!u ? '' : /^https?:\/\//i.test(u) ? u : `${site}${u.startsWith('/') ? '' : '/'}${u}`);

/** "Hi {name}" → the subscriber's first name, or "there" when we don't know it. */
const personalise = (s, sub) => String(s || '').replace(/\{\s*name\s*\}/gi, firstName(sub?.name) || 'there');

/** Message text → email HTML: blank line = new paragraph, **bold**, [link](url) and bare https:// links. */
function bodyHtml(text, site) {
  const link = (href, label) => `<a href="${esc(absUrl(site, href))}" style="color:${C.copper};text-decoration:underline">${label}</a>`;
  const inline = (t) => esc(t)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, l, u) => link(u.replace(/&amp;/g, '&'), l))
    .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (_, pre, u) => `${pre}${link(u.replace(/&amp;/g, '&'), u)}`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#2e2420">$1</strong>')
    .replace(/\n/g, '<br>');
  return String(text || '').trim().split(/\n\s*\n/).filter(Boolean)
    .map((p) => `<p style="margin:0 0 16px;font:400 16px/1.65 ${SANS};color:${C.ink2}">${inline(p.trim())}</p>`).join('');
}
const plainText = (text, site) => String(text || '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, l, u) => `${l} (${absUrl(site, u)})`);

/** The finished email for one subscriber (or a preview / test with sub = null). */
export function broadcastEmail(b, { site, studio, sub }) {
  const unsubUrl = sub ? `${site}/unsubscribe/${sub.token}` : `${site}/unsubscribe/preview`;
  const subject = personalise(b.subject, sub);
  const heading = personalise(b.heading, sub);
  const body = personalise(b.body, sub);
  const image = absUrl(site, b.image);
  const button = b.buttonText && b.buttonUrl ? { text: b.buttonText, url: absUrl(site, b.buttonUrl) } : null;
  const socials = [studio.instagram && ['Instagram', studio.instagram], studio.whatsapp && ['WhatsApp', `https://wa.me/${studio.whatsapp}`], ['Website', site]].filter(Boolean);

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.canvas}">
${b.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(personalise(b.preheader, sub))}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.canvas}">
<tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px">
  <tr><td align="center" style="padding:6px 0 22px">
    <a href="${esc(site)}" style="text-decoration:none"><div style="font:400 30px/1 ${SERIF};color:${C.copper};letter-spacing:.5px">BabySteps</div>
    <div style="font:600 9px/1 ${SANS};color:${C.copper};letter-spacing:4px;margin-top:6px">GUIDE&nbsp;STUDIO</div></a>
  </td></tr>
  <tr><td style="background:${C.paper};border-radius:22px;overflow:hidden">
    ${image ? `<img src="${esc(image)}" width="580" alt="" style="display:block;width:100%;max-width:580px;height:auto;border:0;border-radius:22px 22px 0 0">` : ''}
    <div style="padding:32px 30px 18px">
      ${heading ? `<h1 style="margin:0 0 18px;font:400 28px/1.25 ${SERIF};color:${C.ink}">${esc(heading)}</h1>` : ''}
      ${bodyHtml(body, site)}
      ${button ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 18px"><tr><td style="border-radius:999px;background:${C.copper}">
        <a href="${esc(button.url)}" style="display:inline-block;padding:14px 30px;font:600 13px/1 ${SANS};letter-spacing:1.5px;text-transform:uppercase;color:#fff;text-decoration:none">${esc(button.text)}</a>
      </td></tr></table>` : ''}
    </div>
  </td></tr>
  <tr><td align="center" style="padding:24px 10px 8px;font:400 12px/1.7 ${SANS};color:${C.ink2}">
    ${socials.map(([l, u]) => `<a href="${esc(u)}" style="color:${C.copper};text-decoration:none;margin:0 8px">${l}</a>`).join('·')}
    <div style="margin-top:12px">${esc(studio.name || 'BabySteps Guide Studio')}${studio.address ? ` · ${esc(studio.address)}` : ''}</div>
    <div style="margin-top:8px">You're receiving this because you subscribed to BabySteps updates.
      <a href="${esc(unsubUrl)}" style="color:${C.ink2};text-decoration:underline">Unsubscribe</a></div>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = [heading, plainText(body, site), button ? `${button.text}: ${button.url}` : '', '—', `${studio.name || 'BabySteps Guide Studio'}${studio.address ? `, ${studio.address}` : ''}`, `Unsubscribe: ${unsubUrl}`]
    .filter(Boolean).join('\n\n');
  const headers = sub ? { 'List-Unsubscribe': `<${site}/api/newsletter/unsubscribe/${sub.token}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } : undefined;
  return { subject, html, text, headers, replyTo: studio.email || undefined };
}

const fromName = (studio) => studio.name || 'BabySteps Guide Studio';

/** Send one broadcast to a single address (the admin's test email). */
export async function sendTest(b, { site, to }) {
  const { studio } = await siteContent();
  const q = await quota();
  if (!q.left) throw new Error(`Today's limit of ${q.limit} emails is used up — try again after midnight.`);
  const mail = broadcastEmail(b, { site, studio, sub: { name: '', token: 'preview' } });
  await countOne();
  await sendEmail({ ...mail, headers: undefined, subject: `[Test] ${mail.subject}`, to, fromName: fromName(studio) });
}

/* ---------- Daily sending limit (admin-editable, default 200; days run on India time) ---------- */
const LIMIT_KEY = 'newsletter';
export const DEFAULT_DAILY_LIMIT = 200;
const IST = 5.5 * 3600e3;
const DAY = 86400e3;
const istDay = () => new Date(Date.now() + IST).toISOString().slice(0, 10);
/** When the next India-time day starts (+1 minute of slack). */
export const nextDayStart = () => new Date((Math.floor((Date.now() + IST) / DAY) + 1) * DAY - IST + 60e3);

export async function dailyLimit() {
  const s = await Setting.findOne({ key: LIMIT_KEY }).lean();
  return Number(s?.data?.dailyLimit) || Number(process.env.BROADCAST_DAILY_LIMIT) || DEFAULT_DAILY_LIMIT;
}
export async function setDailyLimit(n) {
  await Setting.updateOne({ key: LIMIT_KEY }, { $set: { 'data.dailyLimit': n } }, { upsert: true });
  // A send waiting for tomorrow may be able to carry on now.
  const waiting = await Broadcast.find({ status: 'sending', waitingUntil: { $gt: new Date() } }).select('_id').lean();
  waiting.forEach((b) => runBroadcast(b._id));
}
export async function usedToday() {
  const s = await Setting.findOne({ key: LIMIT_KEY }).lean();
  return s?.data?.day === istDay() ? Number(s.data.count) || 0 : 0;
}
async function countOne() {
  const day = istDay();
  const r = await Setting.updateOne({ key: LIMIT_KEY, 'data.day': day }, { $inc: { 'data.count': 1 } });
  if (!r.matchedCount) await Setting.updateOne({ key: LIMIT_KEY }, { $set: { 'data.day': day, 'data.count': 1 } }, { upsert: true });
}
export async function quota() {
  const [limit, used] = await Promise.all([dailyLimit(), usedToday()]);
  return { limit, used, left: Math.max(0, limit - used), resetsAt: nextDayStart() };
}

const running = new Set();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DELAY = () => Math.max(50, Number(process.env.BROADCAST_DELAY_MS) || 400);
const MAX_FAILS_IN_A_ROW = 5; // usually means the daily sending limit is reached or the email settings broke

/** Send (or resume) a broadcast in the background. Safe to call twice: a broadcast only runs once at a time. */
export async function runBroadcast(id) {
  const key = String(id);
  if (running.has(key)) return;
  running.add(key);
  try {
    const b = await Broadcast.findById(id).select('+delivered').lean();
    if (!b || b.status !== 'sending') return;
    if (!emailEnabled()) { await Broadcast.updateOne({ _id: id }, { status: 'paused', note: 'Email is not set up on the server.' }); return; }
    const { studio } = await siteContent();
    const done = new Set(b.delivered);
    const todo = (await Subscriber.find({ status: 'subscribed' }).lean()).filter((s) => !done.has(s.email));
    await Broadcast.updateOne({ _id: id }, { total: done.size + todo.length, failed: 0, note: '', waitingUntil: null, ...(b.startedAt ? {} : { startedAt: new Date() }) });

    let failsInARow = 0;
    for (const s of todo) {
      const now = await Broadcast.findById(id).select('status').lean(); // the admin may pause or cancel mid-way
      if (!now || now.status !== 'sending') return;
      const q = await quota();
      if (!q.left) { // daily limit: stop for today and carry on automatically tomorrow
        const at = nextDayStart();
        await Broadcast.updateOne({ _id: id }, { waitingUntil: at, note: `Daily limit of ${q.limit} emails reached — the rest go out automatically after midnight (India time).` });
        setTimeout(() => runBroadcast(id), at.getTime() - Date.now()).unref?.();
        return;
      }
      if (!(await Subscriber.exists({ _id: s._id, status: 'subscribed' }))) { await Broadcast.updateOne({ _id: id }, { $inc: { total: -1 } }); continue; }
      try {
        await sendEmail({ ...broadcastEmail(b, { site: b.site, studio, sub: s }), to: s.email, fromName: fromName(studio) });
        await countOne();
        await Broadcast.updateOne({ _id: id }, { $push: { delivered: s.email }, $inc: { sent: 1 } });
        failsInARow = 0;
      } catch (e) {
        failsInARow += 1;
        await Broadcast.updateOne({ _id: id }, { $inc: { failed: 1 }, note: `Last error (${s.email}): ${e.message}`.slice(0, 400) });
        if (failsInARow >= MAX_FAILS_IN_A_ROW) {
          await Broadcast.updateOne({ _id: id }, { status: 'paused', note: `Paused after ${MAX_FAILS_IN_A_ROW} failed emails in a row — often the email provider's daily limit. Resume later to send the rest. Last error: ${e.message}`.slice(0, 500) });
          console.error(`Broadcast ${key} paused: ${e.message}`);
          return;
        }
      }
      await sleep(DELAY());
    }
    const fin = await Broadcast.findById(id).select('failed').lean();
    await Broadcast.updateOne({ _id: id, status: 'sending' }, fin?.failed
      ? { status: 'paused', note: `${fin.failed} email${fin.failed === 1 ? '' : 's'} failed — press Resume to retry them.` }
      : { status: 'sent', finishedAt: new Date() });
  } catch (e) {
    console.error(`Broadcast ${key} stopped:`, e.message);
    await Broadcast.updateOne({ _id: id }, { status: 'paused', note: `Stopped: ${e.message}`.slice(0, 400) }).catch(() => {});
  } finally {
    running.delete(key);
  }
}

/** After a restart: carry on with any broadcast that was mid-send. */
export async function resumeBroadcasts() {
  const live = await Broadcast.find({ status: 'sending' }).select('_id').lean();
  live.forEach((b) => runBroadcast(b._id));
  if (live.length) console.log(`Resuming ${live.length} email broadcast(s)`);
}
