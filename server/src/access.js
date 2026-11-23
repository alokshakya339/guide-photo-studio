/** Gallery access rules shared by client, admin and webhook routes. */

export const FREE_DAYS = () => Number(process.env.GALLERY_FREE_DAYS) || 90;

export function defaultAccessUntil(from = new Date(), days = FREE_DAYS()) {
  return new Date(new Date(from).getTime() + days * 24 * 60 * 60 * 1000);
}

/** Older galleries without `accessUntil` get the free period counted from creation. */
export function accessUntilOf(g) {
  return g.accessUntil ? new Date(g.accessUntil) : defaultAccessUntil(g.createdAt || new Date());
}

export function accessInfo(g) {
  const until = accessUntilOf(g);
  const sub = g.subscription || {};
  const subscribed = ['active', 'authenticated'].includes(sub.status);
  return {
    until,
    locked: until.getTime() < Date.now(),
    daysLeft: Math.max(0, Math.ceil((until.getTime() - Date.now()) / 86400000)),
    subscribed,
    planCode: sub.planCode || null,
    status: sub.status || (until.getTime() < Date.now() ? 'expired' : 'free'),
  };
}

/** Move access forward, never backwards. */
export function extendAccess(g, newUntil) {
  const current = accessUntilOf(g);
  g.accessUntil = newUntil > current ? newUntil : current;
}
