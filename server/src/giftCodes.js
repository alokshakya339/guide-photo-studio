import crypto from 'node:crypto';

/** Gift card codes like GS-7KQ2-M9XD (no 0/O/1/I so they're easy to read out). */
const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const giftCode = () => {
  const part = () => Array.from({ length: 4 }, () => A[crypto.randomInt(A.length)]).join('');
  return `GS-${part()}-${part()}`;
};
export const GIFT_CODE_RX = /^GS-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;
/** "gs k7p2 9qxm" → "GS-K7P2-9QXM" */
export function normalizeGiftCode(v) {
  const raw = String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const body = raw.startsWith('GS') ? raw.slice(2) : raw;
  return body.length === 8 ? `GS-${body.slice(0, 4)}-${body.slice(4)}` : String(v ?? '').trim().toUpperCase();
}
