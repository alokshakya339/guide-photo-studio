/**
 * Customer accounts — /api/account
 *
 * Auth (email + password, httpOnly session cookie):
 *   POST /register · POST /login · POST /logout · GET /me
 *   POST /verify {token} · POST /verify/resend
 *   POST /forgot {email} · POST /reset {token, password}
 *   PATCH /me {name, phone} · POST /password {current, password} · POST /logout-all
 * Purchase history (verified email only):
 *   GET /gift-cards            gift cards bought with, or sent to, the account's email
 * Invitations (owned by the account; the studio publishes):
 *   GET /invitations · POST /invitations · GET/PUT /invitations/:id · POST /invitations/:id/submit
 *   POST /invitations/:id/upload · GET /invitations/:id/rsvps(.csv) · GET/PATCH/DELETE wishes
 */
import crypto from 'node:crypto';
import { Router } from 'express';
import { trackedLimiter } from '../rateLimits.js';
import bcrypt from 'bcryptjs';
import { Customer, GiftCard, GiftPayment } from '../models/index.js';
import { Invitation, InviteRsvp, InviteWish, InvitePackage, DEFAULT_PACKAGES, featuresOf } from '../invites/models.js';
import { SLUG_RX, isPhone, upload, validateInvite, pick, EDITABLE, counts } from '../invites/routes.js';
import { putMedia, storageReady } from '../invites/storage.js';
import { sendEmail, emailEnabled } from '../mailer.js';
import { startSession, endSession, currentCustomer, requireCustomer, requireVerified, sameOrigin } from './session.js';
import { verifyEmail, resetEmail, passwordChangedEmail, inviteSubmittedEmail } from './emails.js';
import { InvitePayment } from '../invites/models.js';
import { packagePrice, fulfilInvitePayment } from '../invites/payments.js';
import { razorpay, keys, hasKeys, hmac, safeEqual } from '../routes/giftCards.js';

const router = Router();
router.use(sameOrigin);

/* ---------- helpers ---------- */
const BCRYPT_COST = 12;
const VERIFY_TTL = 24 * 60 * 60 * 1000;
const RESET_TTL = 60 * 60 * 1000;
const MAX_INVITES = 5;
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_RX = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u;
// A real bcrypt hash used when the email doesn't exist, so "no such user" takes as long as "wrong password".
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_COST);

const squish = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const normEmail = (v) => String(v ?? '').trim().toLowerCase().slice(0, 160);
const sha256 = (v) => crypto.createHash('sha256').update(String(v)).digest('hex');
const newToken = () => crypto.randomBytes(32).toString('hex');
const siteUrl = () => (process.env.SITE_URL || String(process.env.CLIENT_ORIGIN || '').split(',')[0] || 'http://localhost:5173').trim().replace(/\/$/, '');
const fail = (res, status, error, fields) => res.status(status).json({ error, ...(fields ? { fields } : {}) });

function passwordProblem(pw, { email, name } = {}) {
  const p = String(pw ?? '');
  if (p.length < 8) return 'Use at least 8 characters.';
  if (p.length > 100) return 'Use at most 100 characters.';
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return 'Use a mix of letters and numbers.';
  const low = p.toLowerCase();
  if (email && low.includes(email.split('@')[0]) && email.split('@')[0].length >= 4) return 'Don’t use your email in your password.';
  if (name && name.length >= 4 && low.includes(name.toLowerCase().split(' ')[0])) return 'Don’t use your name in your password.';
  if (/^(password|qwerty|12345678|abc12345|iloveyou)/i.test(p)) return 'That password is too easy to guess.';
  return '';
}

/** What the browser may see about the signed-in customer. */
const me = (c) => ({ id: c._id, name: c.name, email: c.email, phone: c.phone || '', emailVerified: Boolean(c.emailVerifiedAt), createdAt: c.createdAt });

async function sendVerification(c) {
  const token = newToken();
  await Customer.updateOne({ _id: c._id }, { verifyTokenHash: sha256(token), verifyTokenExpires: new Date(Date.now() + VERIFY_TTL) });
  if (!emailEnabled()) { console.warn(`[account] email not configured — verification link for ${c.email}: ${siteUrl()}/account/verify?token=${token}`); return false; }
  await sendEmail({ to: c.email, ...verifyEmail({ name: c.name, url: `${siteUrl()}/account/verify?token=${token}` }) });
  return true;
}

/* ---------- rate limits ---------- */
const ipKey = (req) => req.ip;
const msg = (mins) => `Too many attempts. Please wait ${mins} minute${mins === 1 ? '' : 's'} and try again.`;
// All tracked, so Admin → Login security can see and unlock them.
const authLimiter = trackedLimiter({ id: 'account-auth', label: 'Customer sign-up / reset (per network address)', who: 'ip', limit: 30, message: msg }); // all auth endpoints
const loginLimiter = trackedLimiter({ // wrong passwords only, per address + email
  id: 'account-login', label: 'Customer login', who: 'ip+email', limit: 8, skipSuccessfulRequests: true, message: msg,
  keyGenerator: (req) => `${ipKey(req)}|${normEmail(req.body?.email)}`,
});
const mailLimiter = trackedLimiter({
  id: 'account-email', label: 'Customer emails (verify / reset link)', who: 'ip+email', limit: 5, windowMin: 60, message: msg,
  keyGenerator: (req) => `${ipKey(req)}|${normEmail(req.body?.email) || 'session'}`,
});

/* ===================== Auth ===================== */
router.post('/register', authLimiter, async (req, res) => {
  const b = req.body || {};
  const name = squish(b.name, 80);
  const email = normEmail(b.email);
  const phone = squish(b.phone, 20);
  const f = {};
  if (name.length < 2 || !NAME_RX.test(name)) f.name = 'Please enter your name (letters only).';
  if (!EMAIL_RX.test(email)) f.email = 'Please enter a valid email address.';
  if (phone && !isPhone(phone)) f.phone = 'Please enter a valid mobile number.';
  const pw = passwordProblem(b.password, { email, name });
  if (pw) f.password = pw;
  if (b.acceptTerms !== true) f.acceptTerms = 'Please accept the privacy policy to continue.';
  if (Object.keys(f).length) return fail(res, 400, Object.values(f)[0], f);

  if (await Customer.exists({ email })) {
    return fail(res, 409, 'An account with this email already exists. Log in, or reset your password.', { email: 'This email already has an account.' });
  }
  let c;
  try {
    c = await Customer.create({ name, email, phone, passwordHash: await bcrypt.hash(String(b.password), BCRYPT_COST), lastLoginAt: new Date() });
  } catch (e) {
    if (e.code === 11000) return fail(res, 409, 'An account with this email already exists.', { email: 'This email already has an account.' });
    throw e;
  }
  sendVerification(c).catch((e) => console.error('Verification email failed:', e.message));
  startSession(res, c);
  res.status(201).json({ user: me(c) });
});

router.post('/login', authLimiter, loginLimiter, async (req, res) => {
  const email = normEmail(req.body?.email);
  const password = String(req.body?.password ?? '').slice(0, 100);
  const c = EMAIL_RX.test(email) ? await Customer.findOne({ email }).select('+passwordHash') : null;
  const ok = await bcrypt.compare(password, c?.passwordHash || DUMMY_HASH);
  if (!c || !ok) return fail(res, 401, 'That email and password don’t match. Please try again.');
  if (c.disabled) return fail(res, 403, 'This account has been disabled. Please contact the studio.');
  c.lastLoginAt = new Date();
  await c.save();
  startSession(res, c);
  res.json({ user: me(c) });
});

router.post('/logout', (_req, res) => { endSession(res); res.status(204).end(); });

router.get('/me', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const c = await currentCustomer(req);
  if (!c) { endSession(res); return res.json({ user: null }); }
  res.json({ user: me(c) });
});

router.post('/verify', authLimiter, async (req, res) => {
  const token = String(req.body?.token || '');
  if (!/^[a-f0-9]{64}$/.test(token)) return fail(res, 400, 'This link isn’t valid. Request a new one from your account.');
  const c = await Customer.findOne({ verifyTokenHash: sha256(token), verifyTokenExpires: { $gt: new Date() } });
  if (!c) return fail(res, 400, 'This link has expired or was already used. Request a new one from your account.');
  c.emailVerifiedAt = c.emailVerifiedAt || new Date();
  c.verifyTokenHash = null; c.verifyTokenExpires = null;
  await c.save();
  res.json({ ok: true, user: me(c) });
});

router.post('/verify/resend', mailLimiter, requireCustomer, async (req, res) => {
  if (req.customer.emailVerifiedAt) return res.json({ ok: true, alreadyVerified: true });
  const sent = await sendVerification(req.customer).catch((e) => { console.error('Verification email failed:', e.message); return false; });
  if (!sent) return fail(res, 503, 'We couldn’t send the email right now. Please try again later or contact the studio.');
  res.json({ ok: true });
});

// Always answers the same way, so it can't be used to find out which emails have accounts.
router.post('/forgot', authLimiter, mailLimiter, async (req, res) => {
  const email = normEmail(req.body?.email);
  if (!EMAIL_RX.test(email)) return fail(res, 400, 'Please enter a valid email address.', { email: 'Please enter a valid email address.' });
  const c = await Customer.findOne({ email, disabled: false });
  if (c) {
    const token = newToken();
    await Customer.updateOne({ _id: c._id }, { resetTokenHash: sha256(token), resetTokenExpires: new Date(Date.now() + RESET_TTL) });
    const url = `${siteUrl()}/account/reset?token=${token}`;
    if (emailEnabled()) sendEmail({ to: c.email, ...resetEmail({ name: c.name, url }) }).catch((e) => console.error('Reset email failed:', e.message));
    else console.warn(`[account] email not configured — reset link for ${c.email}: ${url}`);
  }
  res.json({ ok: true });
});

router.post('/reset', authLimiter, async (req, res) => {
  const token = String(req.body?.token || '');
  if (!/^[a-f0-9]{64}$/.test(token)) return fail(res, 400, 'This reset link isn’t valid. Please request a new one.');
  const c = await Customer.findOne({ resetTokenHash: sha256(token), resetTokenExpires: { $gt: new Date() } });
  if (!c) return fail(res, 400, 'This reset link has expired or was already used. Please request a new one.');
  const pw = passwordProblem(req.body?.password, { email: c.email, name: c.name });
  if (pw) return fail(res, 400, pw, { password: pw });
  c.passwordHash = await bcrypt.hash(String(req.body.password), BCRYPT_COST);
  c.resetTokenHash = null; c.resetTokenExpires = null;
  c.tokenVersion = (c.tokenVersion || 0) + 1; // sign out everywhere
  c.emailVerifiedAt = c.emailVerifiedAt || new Date(); // they proved they own the inbox
  c.lastLoginAt = new Date();
  await c.save();
  startSession(res, c);
  res.json({ user: me(c) });
});

/* ---------- profile ---------- */
router.patch('/me', requireCustomer, async (req, res) => {
  const b = req.body || {};
  const f = {};
  const update = {};
  if (b.name !== undefined) {
    const name = squish(b.name, 80);
    if (name.length < 2 || !NAME_RX.test(name)) f.name = 'Please enter your name (letters only).';
    else update.name = name;
  }
  if (b.phone !== undefined) {
    const phone = squish(b.phone, 20);
    if (phone && !isPhone(phone)) f.phone = 'Please enter a valid mobile number.';
    else update.phone = phone;
  }
  if (Object.keys(f).length) return fail(res, 400, Object.values(f)[0], f);
  const c = await Customer.findByIdAndUpdate(req.customer._id, update, { new: true });
  res.json({ user: me(c) });
});

router.post('/password', authLimiter, requireCustomer, async (req, res) => {
  const c = await Customer.findById(req.customer._id).select('+passwordHash');
  if (!(await bcrypt.compare(String(req.body?.current ?? '').slice(0, 100), c.passwordHash))) {
    return fail(res, 400, 'Your current password isn’t right.', { current: 'Your current password isn’t right.' });
  }
  const pw = passwordProblem(req.body?.password, { email: c.email, name: c.name });
  if (pw) return fail(res, 400, pw, { password: pw });
  c.passwordHash = await bcrypt.hash(String(req.body.password), BCRYPT_COST);
  c.tokenVersion = (c.tokenVersion || 0) + 1;
  await c.save();
  startSession(res, c); // keep this device signed in
  if (emailEnabled()) sendEmail({ to: c.email, ...passwordChangedEmail({ name: c.name, url: `${siteUrl()}/account/forgot` }) }).catch((e) => console.error('Password changed email failed:', e.message));
  res.json({ ok: true });
});

router.post('/logout-all', requireCustomer, async (req, res) => {
  await Customer.updateOne({ _id: req.customer._id }, { $inc: { tokenVersion: 1 } });
  endSession(res);
  res.status(204).end();
});

/* ===================== Gift cards ===================== */
const cardState = (g) => (g.status === 'active' && g.expiresAt && new Date(g.expiresAt) < new Date() ? 'expired' : g.status);

router.get('/gift-cards', requireCustomer, requireVerified, async (req, res) => {
  const email = req.customer.email;
  const [bought, received] = await Promise.all([
    GiftCard.find({ senderEmail: email }).sort('-createdAt').limit(200).lean(),
    GiftCard.find({ recipientEmail: email, senderEmail: { $ne: email } }).sort('-createdAt').limit(200).lean(),
  ]);
  const pays = await GiftPayment.find({ giftCode: { $in: bought.map((g) => g.code) }, status: 'paid' }).lean();
  const byCode = Object.fromEntries(pays.map((p) => [p.giftCode, p]));
  const view = (g, pay) => ({
    code: g.code, amount: g.amount, status: cardState(g), expiresAt: g.expiresAt, redeemedAt: g.redeemedAt,
    recipientName: g.recipientName || '', senderName: g.senderName || '', message: g.message || '', createdAt: g.createdAt,
    ...(pay ? { paid: (pay.charges?.total ? pay.charges.total / 100 : pay.amount), paidAt: pay.paidAt || pay.updatedAt, method: pay.method || '', methodDetail: pay.methodDetail || '', orderId: pay.orderId } : {}),
  });
  res.set('Cache-Control', 'no-store');
  res.json({ bought: bought.map((g) => view(g, byCode[g.code])), received: received.map((g) => view(g)) });
});

/* ===================== Invitations ===================== */
// What a customer may change. Package, payment, studio notes, client details and status stay with the studio.
const CUSTOMER_FIELDS = EDITABLE.filter((k) => !['package', 'client', 'paymentStatus', 'notes'].includes(k));
const statusLabel = (o) => (o.status === 'published' ? 'Live' : o.status === 'archived' ? 'Archived' : o.paymentStatus === 'pending' ? 'Draft · not paid' : 'Paid · with the studio');

async function ownInvite(req, res, { withPassword = false } = {}) {
  const id = String(req.params.id || '');
  if (!/^[a-f0-9]{24}$/.test(id)) { fail(res, 404, 'Invitation not found.'); return null; }
  const inv = await Invitation.findOne({ _id: id, owner: req.customer._id }).select(withPassword ? '+passwordHash' : '');
  if (!inv) { fail(res, 404, 'Invitation not found.'); return null; }
  return inv;
}

function ownerView(inv) {
  const o = inv.toObject ? inv.toObject() : inv;
  const { passwordHash, notes, client, owner, __v, ...rest } = o;
  return { ...rest, hasPassword: Boolean(passwordHash), statusLabel: statusLabel(o) };
}

router.get('/invitations', requireCustomer, async (req, res) => {
  const list = await Invitation.find({ owner: req.customer._id }).sort('-updatedAt').lean();
  const by = await counts(list.map((i) => i._id));
  res.set('Cache-Control', 'no-store');
  res.json({
    storage: storageReady(),
    invitations: list.map((i) => ({
      _id: i._id, slug: i.slug, partner1: i.partner1, partner2: i.partner2, weddingDate: i.weddingDate, coverPhoto: i.coverPhoto,
      template: i.template, package: i.package, status: i.status, statusLabel: statusLabel(i), submittedAt: i.submittedAt, paidAt: i.paidAt,
      paymentStatus: i.paymentStatus, previewToken: i.previewToken, views: i.views || 0, updatedAt: i.updatedAt,
      stats: { responses: 0, yes: 0, guests: 0, pendingWishes: 0, ...(by[i._id] || {}) },
    })),
  });
});

router.post('/invitations', requireCustomer, async (req, res) => {
  const b = req.body || {};
  if ((await Invitation.countDocuments({ owner: req.customer._id })) >= MAX_INVITES) {
    return fail(res, 400, `You can have up to ${MAX_INVITES} invitations. Contact the studio if you need more.`);
  }
  if (!(await InvitePackage.estimatedDocumentCount())) await InvitePackage.insertMany(DEFAULT_PACKAGES);
  const pkg = await InvitePackage.findOne({ code: String(b.package || ''), active: true }).lean();
  const slug = String(b.slug || '').toLowerCase().trim();
  const f = validateInvite(b);
  if (!pkg) f.package = 'Please choose a package.';
  if (!SLUG_RX.test(slug)) f.slug = 'Use 3–60 lowercase letters, numbers and dashes (e.g. riya-raman).';
  else if (await Invitation.exists({ slug })) f.slug = 'That link is already taken — try adding your wedding year.';
  if (Object.keys(f).length) return fail(res, 400, Object.values(f)[0], f);
  const c = req.customer;
  const inv = await Invitation.create({
    ...pick({ headline: 'We’re getting married', ...b }, CUSTOMER_FIELDS),
    slug, package: pkg.code, owner: c._id, status: 'draft',
    client: { name: c.name, email: c.email, phone: c.phone || '' },
    previewToken: crypto.randomBytes(16).toString('hex'),
  });
  res.status(201).json(ownerView(inv));
});

router.get('/invitations/:id', requireCustomer, async (req, res) => {
  const inv = await ownInvite(req, res, { withPassword: true });
  if (!inv) return;
  res.set('Cache-Control', 'no-store');
  res.json(ownerView(inv));
});

router.put('/invitations/:id', requireCustomer, async (req, res) => {
  const inv = await ownInvite(req, res);
  if (!inv) return;
  if (inv.status === 'archived') return fail(res, 400, 'This invitation is archived. Contact the studio to reopen it.');
  const b = req.body || {};
  const f = validateInvite(b, { partial: true });
  const update = pick(b, CUSTOMER_FIELDS);
  if (b.slug !== undefined && String(b.slug).toLowerCase().trim() !== inv.slug) {
    const slug = String(b.slug).toLowerCase().trim();
    if (inv.status === 'published') f.slug = 'The link can’t change once the invitation is live — guests already have it.';
    else if (!SLUG_RX.test(slug)) f.slug = 'Use 3–60 lowercase letters, numbers and dashes.';
    else if (await Invitation.exists({ slug, _id: { $ne: inv._id } })) f.slug = 'That link is already taken.';
    else update.slug = slug;
  }
  if (b.package !== undefined && b.package !== inv.package) {
    if (inv.paymentStatus !== 'pending') f.package = 'The package can’t be changed after payment — please contact the studio.';
    else if (!(await packagePrice(String(b.package)))) f.package = 'Please choose a package.';
    else update.package = String(b.package);
  }
  if (b.password !== undefined) {
    if (!featuresOf({ ...inv.toObject(), ...(update.package ? { package: update.package } : {}) }).password) f.password = 'Password protection is part of the Luxury package.';
    else update.passwordHash = b.password ? await bcrypt.hash(String(b.password).slice(0, 100), 10) : '';
  }
  if (Object.keys(f).length) return fail(res, 400, Object.values(f)[0], f);
  const saved = await Invitation.findByIdAndUpdate(inv._id, update, { new: true, runValidators: true }).select('+passwordHash');
  res.json(ownerView(saved));
});

router.post('/invitations/:id/submit', authLimiter, requireCustomer, requireVerified, async (req, res) => {
  const inv = await ownInvite(req, res);
  if (!inv) return;
  if (inv.status === 'published') return fail(res, 400, 'This invitation is already live.');
  if (!inv.events?.length) return fail(res, 400, 'Add at least one event (e.g. Wedding) before sending it to the studio.');
  inv.submittedAt = new Date();
  if (inv.status === 'draft') inv.status = 'preview';
  await inv.save();
  if (emailEnabled()) {
    const site = siteUrl();
    sendEmail({
      replyTo: req.customer.email,
      ...inviteSubmittedEmail({
        customer: req.customer, couple: `${inv.partner1} & ${inv.partner2}`, pkg: inv.package,
        previewUrl: `${site}/invite/${inv.slug}?preview=${inv.previewToken}`, adminUrl: `${site}/admin`,
      }),
    }).catch((e) => console.error('Invite submitted email failed:', e.message));
  }
  res.json(ownerView(inv));
});

/* ---------- buy: pay for the package → the invitation is published ---------- */
const payReady = (inv) => {
  if (!inv.events?.length) return 'Add at least one event (e.g. Wedding) before publishing.';
  if (!inv.weddingDate && !inv.events.some((e) => e.date)) return 'Add your wedding date (Details tab) before publishing.';
  return '';
};

router.get('/invitations/:id/checkout', requireCustomer, async (req, res) => {
  const inv = await ownInvite(req, res);
  if (!inv) return;
  const pkg = await packagePrice(inv.package);
  res.set('Cache-Control', 'no-store');
  res.json({
    enabled: hasKeys(), testMode: keys().id.startsWith('rzp_test_'),
    package: pkg ? { code: pkg.code, name: pkg.name, price: pkg.price } : null,
    paid: inv.paymentStatus !== 'pending', paidAt: inv.paidAt, paidAmount: inv.paidAmount, problem: payReady(inv),
  });
});

router.post('/invitations/:id/pay', authLimiter, requireCustomer, async (req, res) => {
  const inv = await ownInvite(req, res);
  if (!inv) return;
  if (!hasKeys()) return fail(res, 503, 'Online payment isn’t available right now — please message the studio on WhatsApp.');
  if (inv.paymentStatus !== 'pending') return fail(res, 400, 'This invitation is already paid for.');
  if (inv.status === 'archived') return fail(res, 400, 'This invitation is archived. Contact the studio to reopen it.');
  const problem = payReady(inv);
  if (problem) return fail(res, 400, problem);
  const pkg = await packagePrice(inv.package);
  if (!pkg || !(pkg.price > 0)) return fail(res, 400, 'This package isn’t available for online payment — please contact the studio.');
  try {
    const order = await razorpay('/orders', {
      method: 'POST',
      body: { amount: pkg.price * 100, currency: 'INR', receipt: `inv_${String(inv._id).slice(-10)}_${Date.now().toString(36)}`, notes: { purpose: 'Wedding invitation', invitation: inv.slug, package: pkg.code, customer: req.customer.email } },
    });
    await InvitePayment.create({ orderId: order.id, invitation: inv._id, owner: req.customer._id, package: pkg.code, amount: pkg.price });
    res.status(201).json({
      orderId: order.id, amount: order.amount, currency: order.currency, keyId: keys().id,
      description: `${pkg.name} · ${inv.partner1} & ${inv.partner2}`,
      prefill: { name: req.customer.name, email: req.customer.email, contact: req.customer.phone || '' },
    });
  } catch (e) {
    console.error('Invite order failed:', e.message);
    fail(res, 502, 'We couldn’t start the payment. Please try again in a minute.');
  }
});

router.post('/invitations/:id/pay/verify', authLimiter, requireCustomer, async (req, res) => {
  const inv = await ownInvite(req, res);
  if (!inv) return;
  const orderId = String(req.body?.razorpay_order_id || '').slice(0, 60);
  const paymentId = String(req.body?.razorpay_payment_id || '').slice(0, 60);
  const signature = String(req.body?.razorpay_signature || '').slice(0, 200);
  if (!orderId || !paymentId || !signature || !safeEqual(hmac(keys().secret, `${orderId}|${paymentId}`), signature)) {
    return fail(res, 400, 'We couldn’t verify this payment. If money was deducted, message the studio on WhatsApp and we’ll sort it out.');
  }
  const pay = await InvitePayment.findOne({ orderId, invitation: inv._id }).lean();
  if (!pay) return fail(res, 404, 'Order not found.');
  try {
    let p = await razorpay(`/payments/${encodeURIComponent(paymentId)}`);
    if (p.order_id !== orderId || p.amount !== pay.amount * 100 || p.currency !== 'INR') return fail(res, 400, 'Payment amount doesn’t match the order.');
    if (p.status === 'authorized') p = await razorpay(`/payments/${encodeURIComponent(paymentId)}/capture`, { method: 'POST', body: { amount: pay.amount * 100, currency: 'INR' } });
    if (p.status !== 'captured') return fail(res, 400, 'The payment didn’t go through. You haven’t been charged.');
    const saved = await fulfilInvitePayment(orderId, p);
    const fresh = await Invitation.findById(saved?._id || inv._id).select('+passwordHash');
    res.json(ownerView(fresh));
  } catch (e) {
    console.error(`Invite verify failed (${orderId}):`, e.message);
    fail(res, 502, 'Your payment is being confirmed. Refresh in a minute — if it still shows unpaid, message the studio and you won’t lose your money.');
  }
});

router.post('/invitations/:id/upload', requireCustomer, async (req, res, next) => {
  const inv = await ownInvite(req, res);
  if (!inv) return;
  upload.array('files', 20)(req, res, async (err) => {
    if (err) return fail(res, 400, err.code === 'LIMIT_FILE_SIZE' ? 'Each file must be under 15 MB.' : err.message);
    try {
      const out = [];
      for (const f of req.files || []) {
        if (!/^(image|audio)\//.test(f.mimetype)) { out.push({ name: f.originalname, error: 'Only photos and audio files can be uploaded.' }); continue; }
        try { out.push({ name: f.originalname, ...(await putMedia({ buffer: f.buffer, mimetype: f.mimetype, folder: `inv-${inv._id}` })) }); }
        catch (e) { out.push({ name: f.originalname, error: e.message }); }
      }
      res.json(out);
    } catch (e) { next(e); }
  });
});

router.get('/invitations/:id/rsvps', requireCustomer, async (req, res) => {
  const inv = await ownInvite(req, res);
  if (!inv) return;
  res.json(await InviteRsvp.find({ invitation: inv._id }).sort('-createdAt').lean());
});

router.get('/invitations/:id/rsvps.csv', requireCustomer, async (req, res) => {
  const inv = await ownInvite(req, res);
  if (!inv) return;
  if (!featuresOf(inv).rsvpExport) return fail(res, 403, 'RSVP export is part of the Luxury package.');
  const rows = await InviteRsvp.find({ invitation: inv._id }).sort('createdAt').lean();
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`; // no spreadsheet formulas
  const csv = ['Name,Phone,Attending,Guests,Events,Message,Received']
    .concat(rows.map((r) => [r.name, r.phone, r.attending, r.guests, (r.events || []).join('; '), r.message, new Date(r.createdAt).toISOString()].map(q).join(',')))
    .join('\n');
  res.set('Content-Type', 'text/csv; charset=utf-8').set('Content-Disposition', `attachment; filename="rsvps-${inv.slug}.csv"`).send(`﻿${csv}`);
});

router.get('/invitations/:id/wishes', requireCustomer, async (req, res) => {
  const inv = await ownInvite(req, res);
  if (!inv) return;
  res.json(await InviteWish.find({ invitation: inv._id }).sort('-createdAt').lean());
});

async function ownWish(req, res) {
  const id = String(req.params.wid || '');
  if (!/^[a-f0-9]{24}$/.test(id)) { fail(res, 404, 'Not found.'); return null; }
  const w = await InviteWish.findById(id);
  if (!w || !(await Invitation.exists({ _id: w.invitation, owner: req.customer._id }))) { fail(res, 404, 'Not found.'); return null; }
  return w;
}
router.patch('/wishes/:wid', requireCustomer, async (req, res) => {
  const w = await ownWish(req, res);
  if (!w) return;
  w.approved = Boolean(req.body?.approved);
  await w.save();
  res.json(w);
});
router.delete('/wishes/:wid', requireCustomer, async (req, res) => {
  const w = await ownWish(req, res);
  if (!w) return;
  await w.deleteOne();
  res.status(204).end();
});

export default router;
