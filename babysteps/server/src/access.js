/** Client-gallery access: a free hosting period, extendable by the studio (e.g. after a UPI/cash renewal). */
export const FREE_DAYS = () => Number(process.env.GALLERY_FREE_DAYS) || 90;
const DAY = 24 * 60 * 60 * 1000;

export const defaultAccessUntil = (from = new Date(), days = FREE_DAYS()) => new Date(new Date(from).getTime() + days * DAY);
export const accessUntilOf = (g) => (g.accessUntil ? new Date(g.accessUntil) : defaultAccessUntil(g.createdAt || new Date()));

export function accessInfo(g) {
  const until = accessUntilOf(g);
  const locked = until.getTime() < Date.now();
  return { until, locked, daysLeft: Math.max(0, Math.ceil((until.getTime() - Date.now()) / DAY)), subscribed: false, status: locked ? 'expired' : 'free' };
}
