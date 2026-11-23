import { useCallback, useState } from 'react';
import { validateAll } from './validation.js';

/**
 * Per-field form errors.
 *   const v = useValidation(RULES);
 *   <input className="x" {...v.field('phone', 'x')} />  {v.error('phone')}   // 2nd arg = the input's own classes
 *   on submit: if (!v.check(form)) return;
 * Fields are checked when the person leaves them (blur) and again on submit; an error disappears as soon as
 * the value becomes valid while typing.
 */
export function useValidation(rules) {
  const [errors, setErrors] = useState({});

  const checkOne = useCallback((k, value, all) => {
    const msg = rules[k] ? rules[k](value, all) : '';
    setErrors((e) => (e[k] === msg || (!e[k] && !msg) ? e : { ...e, [k]: msg }));
    return msg;
  }, [rules]);

  /** Validate everything; focuses the first bad field. Returns true when the form is fine. */
  const check = useCallback((values, formEl) => {
    const errs = validateAll(values, rules);
    setErrors(errs);
    const first = Object.keys(errs)[0];
    if (first) {
      const el = (formEl || document).querySelector(`[data-field="${first}"]`);
      el?.focus?.({ preventScroll: false });
      el?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    }
    return !first;
  }, [rules]);

  /** Props to spread on an input (pass its own classes): marks it invalid, re-checks on blur, clears once fixed. */
  const field = (k, cls = '', all) => ({
    'data-field': k,
    'aria-invalid': errors[k] ? true : undefined,
    'aria-describedby': errors[k] ? `err-${k}` : undefined,
    className: [cls, errors[k] ? 'is-invalid' : ''].filter(Boolean).join(' ') || undefined,
    onBlur: (e) => checkOne(k, e.target.value, all),
    onInput: (e) => { if (errors[k] && !rules[k]?.(e.target.value, all)) setErrors((x) => ({ ...x, [k]: '' })); },
  });

  const error = (k) => (errors[k] ? <small className="field-err" id={`err-${k}`} role="alert">{errors[k]}</small> : null);
  const clear = () => setErrors({});

  return { errors, setErrors, check, checkOne, field, error, clear };
}
