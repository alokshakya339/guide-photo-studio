import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** Colour dots for status-like values. */
export const TONES = {
  new: '#60a5fa', contacted: '#facc15', booked: '#4ade80', closed: '#a1a1aa',
  shortlisted: '#c084fc', interview: '#fb923c', hired: '#4ade80', rejected: '#f87171',
};

/**
 * Custom dropdown (replaces native <select> so the menu matches the theme).
 * props: value, onChange(value), options: [{ value, label, hint?, tone? } | string],
 *        placeholder, size: 'md' | 'sm', invalid, ariaLabel, id, className, toneDots
 */
export default function Select({
  value, onChange, options, placeholder = 'Select…', size = 'md', invalid, ariaLabel, id, className = '', toneDots = false,
}) {
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const [pos, setPos] = useState(null);
  const btn = useRef(null);
  const list = useRef(null);
  const typed = useRef({ s: '', t: 0 });
  const autoId = useId();
  const listId = `${id || autoId}-list`;
  const sel = opts.find((o) => String(o.value) === String(value ?? ''));
  const tone = (o) => o?.tone || (toneDots ? TONES[o?.value] : null);

  const place = useCallback(() => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const want = Math.min(320, opts.length * 44 + 12);
    const below = window.innerHeight - r.bottom - 12;
    const up = below < want && r.top > below;
    setPos({
      left: Math.min(r.left, window.innerWidth - Math.max(r.width, 200) - 8),
      width: Math.max(r.width, size === 'sm' ? 180 : r.width),
      top: up ? undefined : r.bottom + 6,
      bottom: up ? window.innerHeight - r.top + 6 : undefined,
      maxHeight: Math.max(160, Math.min(320, up ? r.top - 18 : below)),
      up,
    });
  }, [opts.length, size]);

  const openMenu = () => {
    place();
    setHi(Math.max(0, opts.findIndex((o) => String(o.value) === String(value ?? ''))));
    setOpen(true);
  };
  const close = (focus = true) => {
    setOpen(false);
    if (focus) btn.current?.focus();
  };
  const choose = (o) => {
    onChange(o.value);
    close();
  };

  useLayoutEffect(() => {
    if (!open) return undefined;
    const onScroll = (e) => { if (!list.current?.contains(e.target)) place(); };
    const onDown = (e) => { if (!btn.current?.contains(e.target) && !list.current?.contains(e.target)) close(false); };
    window.addEventListener('resize', place);
    window.addEventListener('scroll', onScroll, true);
    document.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open, place]);

  // keep the highlighted option in view
  useEffect(() => {
    if (open && hi >= 0) list.current?.children[hi]?.scrollIntoView({ block: 'nearest' });
  }, [open, hi]);

  function onKey(e) {
    const k = e.key;
    if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(k)) { e.preventDefault(); openMenu(); return; }
    if (!open) return;
    if (k === 'Escape') { e.preventDefault(); close(); }
    else if (k === 'Tab') close(false);
    else if (k === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(opts.length - 1, h + 1)); }
    else if (k === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
    else if (k === 'Home') { e.preventDefault(); setHi(0); }
    else if (k === 'End') { e.preventDefault(); setHi(opts.length - 1); }
    else if (k === 'Enter' || k === ' ') { e.preventDefault(); if (opts[hi]) choose(opts[hi]); }
    else if (k.length === 1) {
      const now = Date.now();
      typed.current = { s: (now - typed.current.t < 600 ? typed.current.s : '') + k.toLowerCase(), t: now };
      const i = opts.findIndex((o) => String(o.label).toLowerCase().startsWith(typed.current.s));
      if (i >= 0) setHi(i);
    }
  }

  return (
    <>
      <button
        ref={btn}
        type="button"
        id={id}
        className={`sel sel--${size} ${open ? 'is-open' : ''} ${sel ? '' : 'is-empty'} ${invalid ? 'is-invalid' : ''} ${className}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onKey}
      >
        {tone(sel) && <span className="sel__dot" style={{ background: tone(sel) }} aria-hidden="true" />}
        <span className="sel__value">{sel ? sel.label : placeholder}</span>
        <svg className="sel__chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && pos && createPortal(
        <ul
          ref={list}
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className={`sel__menu ${pos.up ? 'is-up' : ''} sel__menu--${size}`}
          style={{ left: pos.left, top: pos.top, bottom: pos.bottom, minWidth: pos.width, maxHeight: pos.maxHeight }}
          onKeyDown={onKey}
        >
          {opts.map((o, i) => {
            const on = String(o.value) === String(value ?? '');
            return (
              <li
                key={`${o.value}`}
                role="option"
                aria-selected={on}
                className={`sel__opt ${on ? 'is-on' : ''} ${i === hi ? 'is-hi' : ''}`}
                onPointerMove={() => hi !== i && setHi(i)}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => choose(o)}
              >
                {tone(o) && <span className="sel__dot" style={{ background: tone(o) }} aria-hidden="true" />}
                <span className="sel__label">
                  {o.label}
                  {o.hint && <small>{o.hint}</small>}
                </span>
                {on && (
                  <svg className="sel__check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                )}
              </li>
            );
          })}
        </ul>,
        document.body
      )}
    </>
  );
}
