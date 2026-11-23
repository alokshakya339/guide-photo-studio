/**
 * Paying for an invitation online (Razorpay). The customer creates and edits their invitation for free; paying
 * the package price publishes it. Order amount always comes from the package price on the server.
 */
import { Invitation, InvitePayment, InvitePackage, DEFAULT_PACKAGES } from './models.js';
import { Customer } from '../models/index.js';
import { emailEnabled, sendEmail } from '../mailer.js';
import { invitePublishedEmail } from '../account/emails.js';

const site = () => (process.env.SITE_URL || String(process.env.CLIENT_ORIGIN || '').split(',')[0] || 'http://localhost:5173').trim().replace(/\/$/, '');
const methodDetail = (p) => (p.card ? [p.card.network, p.card.last4 && `•••• ${p.card.last4}`].filter(Boolean).join(' ') : p.bank || p.vpa || p.wallet || '');

export async function packagePrice(code) {
  if (!(await InvitePackage.estimatedDocumentCount())) await InvitePackage.insertMany(DEFAULT_PACKAGES);
  return InvitePackage.findOne({ code, active: true }).lean();
}

/**
 * Mark an order paid and publish its invitation — exactly once, however many times it runs
 * (browser verify + webhook). `p` is the Razorpay payment entity (already captured).
 */
export async function fulfilInvitePayment(orderId, p) {
  const pay = await InvitePayment.findOne({ orderId });
  if (!pay || p.amount !== pay.amount * 100 || p.currency !== 'INR') return null;
  const claimed = await InvitePayment.findOneAndUpdate(
    { orderId, status: 'created' },
    { $set: { status: 'paid', paymentId: p.id, method: p.method, methodDetail: methodDetail(p), paidAt: new Date() } },
    { new: true },
  );
  const inv = await Invitation.findById(pay.invitation);
  if (!inv) return null;
  if (claimed) {
    const now = new Date();
    inv.package = pay.package;
    inv.paymentStatus = 'paid';
    inv.paidAt = now; inv.paidAmount = pay.amount;
    if (inv.status !== 'archived') { inv.status = 'published'; inv.publishedAt = inv.publishedAt || now; }
    await inv.save();
    if (emailEnabled()) {
      const c = await Customer.findById(pay.owner).lean();
      const couple = `${inv.partner1} & ${inv.partner2}`;
      const url = `${site()}/invite/${inv.slug}`;
      if (c?.email) sendEmail({ to: c.email, ...invitePublishedEmail({ name: c.name, couple, url }) }).catch((e) => console.error('Invite paid email failed:', e.message));
      sendEmail({
        replyTo: c?.email,
        subject: `Invitation purchased: ${couple} · ₹${pay.amount.toLocaleString('en-IN')}`,
        text: `${c?.name || 'A customer'} (${c?.email || ''}${c?.phone ? `, ${c.phone}` : ''}) paid ₹${pay.amount} for the ${pay.package} package.\nThe invitation is live: ${url}\nPayment: ${p.id} (${p.method}${methodDetail(p) ? `, ${methodDetail(p)}` : ''})`,
        html: `<p><b>${c?.name || 'A customer'}</b> (${c?.email || ''}${c?.phone ? `, ${c.phone}` : ''}) paid <b>₹${pay.amount.toLocaleString('en-IN')}</b> for the <b>${pay.package}</b> package.</p><p>The invitation is live: <a href="${url}">${url}</a></p><p>Payment ${p.id} · ${p.method}${methodDetail(p) ? ` · ${methodDetail(p)}` : ''}</p>`,
      }).catch((e) => console.error('Invite paid studio email failed:', e.message));
    }
  }
  return inv;
}
