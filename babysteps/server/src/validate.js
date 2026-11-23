/** Server side of the shared form rules (babysteps/src/validation.js) — same checks the website runs. */
export * from '../../src/validation.js';
import { validateAll } from '../../src/validation.js';

/** Runs rules on the request body; on failure sends 400 { error, fields } and returns false. */
export function ensureValid(res, values, rules) {
  const fields = validateAll(values, rules);
  const first = Object.values(fields)[0];
  if (!first) return true;
  res.status(400).json({ error: first, fields });
  return false;
}
