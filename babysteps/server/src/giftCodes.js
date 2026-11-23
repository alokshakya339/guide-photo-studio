import crypto from 'node:crypto';

/** Gift card codes like BS-7KQ2-M9XD (no 0/O/1/I so they're easy to read out). */
export const giftCode = () => {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () => Array.from({ length: 4 }, () => A[crypto.randomInt(A.length)]).join('');
  return `BS-${part()}-${part()}`;
};
