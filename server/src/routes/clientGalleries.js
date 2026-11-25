import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { ClientGallery, Plan } from '../models/index.js';
import { requireGalleryAccess, signToken } from '../middleware/auth.js';
import { accessInfo, accessUntilOf, extendAccess } from '../access.js';
import { resolveGallery, signedUrl } from '../galleryStorage.js';
import {
  paymentMode, createSubscription, fetchSubscription, cancelSubscription, verifyCheckoutSignature, addPeriod,
} from '../payments/razorpay.js';

const router = Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
const payLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });

function isClosed(g) {
  return g.expiresAt && g.expiresAt < new Date();
}

async function activePlans() {
  const plans = await Plan.find({ active: true }).sort('order').lean();
  return plans.map(({ code, name, period, amount, description, features }) => ({ code, name, period, amount, description, features }));
}

function billingInfo() {
  const mode = paymentMode();
  return { mode, keyId: mode === 'razorpay' ? process.env.RAZORPAY_KEY_ID : null };
}

/** Clients whose access has ended may only reach the paywall and payment endpoints. */
async function loadGallery(req, res, { allowLocked = false } = {}) {
  const gallery = await ClientGallery.findOne({ slug: req.params.slug });
  if (!gallery) {
    res.status(404).json({ error: 'Gallery not found' });
    return null;
  }
  if (!allowLocked && req.viewer.role !== 'admin' && accessInfo(gallery).locked) {
    res.status(402).json({ error: 'Your free gallery period has ended. Subscribe to keep viewing your photos.', locked: true });
    return null;
  }
  return gallery;
}

router.post('/:slug/login', loginLimiter, async (req, res) => {
  const gallery = await ClientGallery.findOne({ slug: req.params.slug }).select('+passwordHash');
  // Each website only opens its own galleries (the main site sends no brand → Guide Photo Studio).
  const brand = req.body?.brand === 'babysteps' ? 'babysteps' : 'guide';
  const sameBrand = gallery && (gallery.brand || 'guide') === brand;
  const ok = sameBrand && (await bcrypt.compare(String(req.body?.password || ''), gallery.passwordHash));
  if (!ok) return res.status(401).json({ error: 'Gallery name or password is incorrect' });
  if (isClosed(gallery)) return res.status(410).json({ error: 'This gallery has been closed. Please contact the studio.' });
  // Locked galleries still get a token so the client can reach the paywall and subscribe.
  res.json({ token: signToken({ role: 'client', gallery: gallery.slug }, '30d') });
});

router.get('/:slug', requireGalleryAccess, async (req, res) => {
  const gallery = await ClientGallery.findOne({ slug: req.params.slug }).lean();
  if (!gallery) return res.status(404).json({ error: 'Gallery not found' });
  if (isClosed(gallery) && req.viewer.role !== 'admin') return res.status(410).json({ error: 'This gallery has been closed' });

  const access = accessInfo(gallery);
  const plans = await activePlans();
  if (access.locked && req.viewer.role !== 'admin') {
    // Paywall: enough to show who/what it is, but no photos.
    return res.status(402).json({
      error: 'Your free gallery period has ended.',
      locked: true,
      gallery: {
        title: gallery.title, clientName: gallery.clientName, cover: await signedUrl(gallery.cover),
        photoCount: gallery.photos.length, videoCount: (gallery.videos || []).length, favoriteCount: gallery.photos.filter((p) => p.favorite).length,
      },
      access, plans, billing: billingInfo(),
    });
  }
  const { subscription, ...rest } = gallery;
  // Full-size copies in R2 → signed URLs; download links only when the studio allows downloads.
  res.json({ ...(await resolveGallery(rest, { downloads: gallery.allowDownload !== false })), access, plans, billing: billingInfo() });
});

/** Toggle a favourite / album pick, or save a note on one photo. */
router.patch('/:slug/photos/:photoId', requireGalleryAccess, async (req, res) => {
  const gallery = await loadGallery(req, res);
  if (!gallery) return;
  if (gallery.selectionSubmittedAt && req.viewer.role !== 'admin') {
    return res.status(409).json({ error: 'Your selection is already submitted. Contact the studio to make changes.' });
  }
  const photo = gallery.photos.id(req.params.photoId);
  if (!photo) return res.status(404).json({ error: 'Photo not found' });

  const { favorite, note } = req.body || {};
  if (typeof favorite === 'boolean') {
    const picked = gallery.photos.filter((p) => p.favorite).length;
    if (favorite && !photo.favorite && gallery.selectionLimit && picked >= gallery.selectionLimit) {
      return res.status(409).json({ error: `You can select up to ${gallery.selectionLimit} photos` });
    }
    photo.favorite = favorite;
  }
  if (typeof note === 'string') photo.note = note.slice(0, 500);
  await gallery.save();
  res.json(photo);
});

router.post('/:slug/submit', requireGalleryAccess, async (req, res) => {
  const gallery = await loadGallery(req, res);
  if (!gallery) return;
  if (!gallery.photos.some((p) => p.favorite)) return res.status(400).json({ error: 'Select at least one photo first' });
  gallery.selectionSubmittedAt = new Date();
  await gallery.save();
  res.json({ ok: true, submittedAt: gallery.selectionSubmittedAt });
});

/* ---------------- Hosting subscription ---------------- */

/** Step 1: create a subscription for the chosen plan and hand its id to Razorpay Checkout. */
router.post('/:slug/subscribe', requireGalleryAccess, payLimiter, async (req, res) => {
  const gallery = await loadGallery(req, res, { allowLocked: true });
  if (!gallery) return;
  const plan = await Plan.findOne({ code: String(req.body?.plan || ''), active: true });
  if (!plan) return res.status(400).json({ error: 'Please choose a plan' });

  const info = accessInfo(gallery);
  if (['active', 'authenticated'].includes(gallery.subscription?.status) && gallery.subscription?.provider !== 'manual') {
    return res.status(409).json({ error: 'This gallery already has an active subscription' });
  }

  const mode = paymentMode();
  if (mode === 'off') return res.status(503).json({ error: 'Online payments are not set up yet. Please contact the studio.' });

  // If free time is left, billing starts when it ends.
  const startAt = info.locked ? null : accessUntilOf(gallery);

  if (mode === 'mock') {
    const subscriptionId = `mock_sub_${crypto.randomBytes(6).toString('hex')}`;
    gallery.subscription = { provider: 'mock', subscriptionId, planCode: plan.code, status: 'created', updatedAt: new Date() };
    await gallery.save();
    return res.json({ mode, subscriptionId, plan: { code: plan.code, name: plan.name, amount: plan.amount, period: plan.period }, startsAt: startAt });
  }

  const sub = await createSubscription({ plan, gallerySlug: gallery.slug, startAt });
  gallery.subscription = { provider: 'razorpay', subscriptionId: sub.id, planCode: plan.code, status: sub.status, updatedAt: new Date() };
  await gallery.save();
  res.json({
    mode, keyId: process.env.RAZORPAY_KEY_ID, subscriptionId: sub.id,
    plan: { code: plan.code, name: plan.name, amount: plan.amount, period: plan.period }, startsAt: startAt,
  });
});

/** Step 2: Checkout succeeded. Verify the signature and unlock / extend access. */
router.post('/:slug/subscribe/verify', requireGalleryAccess, payLimiter, async (req, res) => {
  const gallery = await loadGallery(req, res, { allowLocked: true });
  if (!gallery) return;
  const sub = gallery.subscription || {};
  const { razorpay_payment_id: paymentId, razorpay_subscription_id: subscriptionId, razorpay_signature: signature } = req.body || {};
  if (!sub.subscriptionId || subscriptionId !== sub.subscriptionId) return res.status(400).json({ error: 'Subscription mismatch' });
  const plan = await Plan.findOne({ code: sub.planCode });
  if (!plan) return res.status(400).json({ error: 'Plan no longer exists' });

  if (sub.provider === 'mock') {
    if (paymentMode() !== 'mock') return res.status(400).json({ error: 'Test payments are disabled' });
    const free = !accessInfo(gallery).locked;
    gallery.subscription.status = 'active';
    gallery.subscription.currentEnd = addPeriod(free ? accessUntilOf(gallery) : new Date(), plan.period);
    gallery.subscription.updatedAt = new Date();
    extendAccess(gallery, gallery.subscription.currentEnd);
    await gallery.save();
    return res.json({ ok: true, access: accessInfo(gallery) });
  }

  if (!paymentId || !signature || !verifyCheckoutSignature({ paymentId, subscriptionId, signature })) {
    return res.status(400).json({ error: 'Payment could not be verified' });
  }
  // Pull the authoritative state from Razorpay.
  const live = await fetchSubscription(subscriptionId);
  gallery.subscription.status = live.status; // 'authenticated' (future start) or 'active' (charged)
  gallery.subscription.updatedAt = new Date();
  if (live.current_end) {
    gallery.subscription.currentEnd = new Date(live.current_end * 1000);
    extendAccess(gallery, gallery.subscription.currentEnd);
  } else if (live.status === 'active') {
    extendAccess(gallery, addPeriod(new Date(), plan.period));
  }
  await gallery.save();
  res.json({ ok: true, access: accessInfo(gallery) });
});

/** Stop renewing; access continues until the end of the paid period. */
router.post('/:slug/subscription/cancel', requireGalleryAccess, async (req, res) => {
  const gallery = await loadGallery(req, res, { allowLocked: true });
  if (!gallery) return;
  const sub = gallery.subscription;
  if (!sub?.subscriptionId || !['active', 'authenticated'].includes(sub.status)) {
    return res.status(400).json({ error: 'No active subscription' });
  }
  if (sub.provider === 'razorpay') await cancelSubscription(sub.subscriptionId);
  gallery.subscription.status = 'cancelled';
  gallery.subscription.updatedAt = new Date();
  await gallery.save();
  res.json({ ok: true, access: accessInfo(gallery) });
});

export default router;
