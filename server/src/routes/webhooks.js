import express, { Router } from 'express';
import { ClientGallery } from '../models/index.js';
import { verifyWebhookSignature } from '../payments/razorpay.js';
import { extendAccess } from '../access.js';

const router = Router();

/**
 * Razorpay webhook. Configure in Dashboard → Settings → Webhooks:
 *   URL:    https://<your-domain>/api/webhooks/razorpay
 *   Secret: same value as RAZORPAY_WEBHOOK_SECRET
 *   Events: subscription.authenticated, subscription.activated, subscription.charged,
 *           subscription.pending, subscription.halted, subscription.cancelled, subscription.completed
 * Needs the raw body for signature verification, so it is mounted before express.json().
 */
router.post('/razorpay', express.raw({ type: 'application/json', limit: '1mb' }), async (req, res) => {
  if (!verifyWebhookSignature(req.body, req.get('x-razorpay-signature'))) {
    return res.status(400).json({ error: 'Invalid signature' });
  }
  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Bad payload' });
  }

  const sub = event?.payload?.subscription?.entity;
  if (!event?.event?.startsWith('subscription.') || !sub?.id) return res.json({ ok: true, ignored: true });

  const gallery =
    (await ClientGallery.findOne({ 'subscription.subscriptionId': sub.id })) ||
    (sub.notes?.gallery ? await ClientGallery.findOne({ slug: sub.notes.gallery }) : null);
  if (!gallery) return res.json({ ok: true, ignored: 'unknown subscription' });

  gallery.subscription = {
    ...(gallery.subscription?.toObject?.() || gallery.subscription || {}),
    provider: 'razorpay',
    subscriptionId: sub.id,
    status: sub.status,
    updatedAt: new Date(),
  };
  // Each successful charge extends access to the end of the paid cycle (idempotent: never moves backwards).
  if (sub.current_end && ['subscription.charged', 'subscription.activated'].includes(event.event)) {
    gallery.subscription.currentEnd = new Date(sub.current_end * 1000);
    extendAccess(gallery, gallery.subscription.currentEnd);
  }
  await gallery.save();
  res.json({ ok: true });
});

export default router;
