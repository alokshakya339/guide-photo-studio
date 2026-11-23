import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (n) => String(n).padStart(2, '0');
/** 'YYYY-MM-DD' ↔ local Date (no time-zone shifts). */
const toIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addMonths = (d, n) => {
  const t = new Date(d.getFullYear(), d.getMonth() + n, 1);
  return new Date(t.getFullYear(), t.getMonth(), Math.min(d.getDate(), new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()));
};
export const formatDate = (iso) => {
  const d = fromIso(iso);
  return d ? `${DAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}` : '';
};

/**
 * Themed date picker (replaces native <input type="date"> so the calendar looks the same on every
 * device and opens next to the field). Value is a 'YYYY-MM-DD' string, like the native input.
 * props: value, onChange(isoString | ''), min, max ('YYYY-MM-DD'), placeholder, invalid, ariaLabel,
 *        id, className, clearable (default true), size: 'md' | 'sm'
 */
export default function DatePicker({
  value, onChange, min, max, placeholder = 'Pick a date', invalid, ariaLabel, id, className = '', clearable = true, size = 'md',
}) {
  const sel = fromIso(value);
  const lo = fromIso(min);
  const hi = fromIso(max);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('days'); // 'days' | 'months'
  const [focus, setFocus] = useState(sel || today); // highlighted day; its month is shown
  const [pos, setPos] = useState(null);
  const btn = useRef(null);
  const pop = useRef(null);
  const grid = useRef(null);
  const autoId = useId();
  const popId = `${id || autoId}-cal`;

  const blocked = useCallback((d) => (lo && d < lo) || (hi && d > hi), [lo?.getTime(), hi?.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps
  const clamp = (d) => (lo && d < lo ? lo : hi && d > hi ? hi : d);

  const place = useCallback(() => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const W = Math.min(320, window.innerWidth - 16);
    const H = 372;
    const below = window.innerHeight - r.bottom - 10;
    const up = below < H && r.top > below;
    setPos({
      left: Math.max(8, Math.min(r.left, window.innerWidth - W - 8)),
      width: W,
      top: up ? undefined : r.bottom + 6,
      bottom: up ? window.innerHeight - r.top + 6 : undefined,
      up,
    });
  }, []);

  const openCal = () => {
    place();
    setFocus(clamp(sel || today));
    setView('days');
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) btn.current?.focus();
  };
  const choose = (d) => {
    if (blocked(d)) return;
    onChange(toIso(d));
    close();
  };

  useLayoutEffect(() => {
    if (!open) return undefined;
    const onScroll = (e) => { if (!pop.current?.contains(e.target)) place(); };
    const onDown = (e) => { if (!btn.current?.contains(e.target) && !pop.current?.contains(e.target)) close(false); };
    window.addEventListener('resize', place);
    window.addEventListener('scroll', onScroll, true);
    document.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open, place]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard focus follows the highlighted day.
  useEffect(() => {
    if (open && view === 'days') grid.current?.querySelector('[data-focus="1"]')?.focus({ preventScroll: true });
  }, [open, view, focus]);

  function onGridKey(e) {
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (moves[e.key] != null) { e.preventDefault(); setFocus((f) => addDays(f, moves[e.key])); }
    else if (e.key === 'PageUp') { e.preventDefault(); setFocus((f) => addMonths(f, e.shiftKey ? -12 : -1)); }
    else if (e.key === 'PageDown') { e.preventDefault(); setFocus((f) => addMonths(f, e.shiftKey ? 12 : 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setFocus((f) => addDays(f, -f.getDay())); }
    else if (e.key === 'End') { e.preventDefault(); setFocus((f) => addDays(f, 6 - f.getDay())); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(focus); }
  }
  function onPopKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
  }

  // 6 weeks starting on the Sunday before the 1st of the shown month.
  const y = focus.getFullYear();
  const m = focus.getMonth();
  const first = new Date(y, m, 1);
  const start = addDays(first, -first.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const canPrev = !lo || new Date(y, m, 0) >= lo;
  const canNext = !hi || new Date(y, m + 1, 1) <= hi;
  const monthBlocked = (yy, mm) => (lo && new Date(yy, mm + 1, 0) < lo) || (hi && new Date(yy, mm, 1) > hi);
  const sameDay = (a, b) => a && b && a.getTime() === b.getTime();

  return (
    <>
      <span className={`dp-wrap ${className}`}>
        <button
          ref={btn}
          type="button"
          id={id}
          className={`sel sel--${size} dp ${open ? 'is-open' : ''} ${sel ? '' : 'is-empty'} ${invalid ? 'is-invalid' : ''}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? popId : undefined}
          aria-label={ariaLabel ? `${ariaLabel}${sel ? `: ${formatDate(value)}` : ''}` : undefined}
          aria-invalid={invalid || undefined}
          onClick={() => (open ? close() : openCal())}
          onKeyDown={(e) => { if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openCal(); } }}
        >
          <svg className="dp__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="1.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
          <span className="sel__value">{sel ? formatDate(value) : placeholder}</span>
        </button>
        {clearable && sel && !open && (
          <button type="button" className="dp__clear" aria-label="Clear date" onClick={() => onChange('')}>×</button>
        )}
      </span>
      {open && pos && createPortal(
        <div
          ref={pop}
          id={popId}
          role="dialog"
          aria-modal="false"
          aria-label={ariaLabel ? `Choose ${ariaLabel.toLowerCase()}` : 'Choose a date'}
          className={`dp__pop ${pos.up ? 'is-up' : ''}`}
          style={{ left: pos.left, top: pos.top, bottom: pos.bottom, width: pos.width }}
          onKeyDown={onPopKey}
        >
          <div className="dp__head">
            <button type="button" className="dp__title" onClick={() => setView((v) => (v === 'days' ? 'months' : 'days'))} aria-label={view === 'days' ? 'Choose month and year' : 'Back to days'}>
              {view === 'days' ? <>{MONTHS[m]} <em>{y}</em></> : <em>{y}</em>}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: view === 'months' ? 'rotate(180deg)' : 'none' }}><path d="m6 9 6 6 6-6" /></svg>
            </button>
            <span className="dp__nav">
              <button type="button" aria-label={view === 'days' ? 'Previous month' : 'Previous year'} disabled={view === 'days' ? !canPrev : lo && y - 1 < lo.getFullYear()} onClick={() => setFocus((f) => clamp(addMonths(f, view === 'days' ? -1 : -12)))}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
              </button>
              <button type="button" aria-label={view === 'days' ? 'Next month' : 'Next year'} disabled={view === 'days' ? !canNext : hi && y + 1 > hi.getFullYear()} onClick={() => setFocus((f) => clamp(addMonths(f, view === 'days' ? 1 : 12)))}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
              </button>
            </span>
          </div>

          {view === 'days' ? (
            <>
              <div className="dp__dow" aria-hidden="true">{DAYS.map((d) => <span key={d}>{d}</span>)}</div>
              <div className="dp__grid" role="grid" ref={grid} onKeyDown={onGridKey}>
                {cells.map((d) => {
                  const out = d.getMonth() !== m;
                  const off = blocked(d);
                  const isSel = sameDay(d, sel);
                  const isFocus = sameDay(d, focus);
                  return (
                    <button
                      type="button"
                      key={d.getTime()}
                      role="gridcell"
                      tabIndex={isFocus ? 0 : -1}
                      data-focus={isFocus ? '1' : undefined}
                      aria-selected={isSel}
                      aria-disabled={off || undefined}
                      aria-label={d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      className={`dp__day ${out ? 'is-out' : ''} ${off ? 'is-off' : ''} ${isSel ? 'is-on' : ''} ${sameDay(d, today) ? 'is-today' : ''}`}
                      onClick={() => (off ? setFocus(d) : choose(d))}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="dp__months">
              {MONTHS.map((name, i) => (
                <button
                  type="button"
                  key={name}
                  disabled={monthBlocked(y, i)}
                  className={`dp__month ${sel && sel.getFullYear() === y && sel.getMonth() === i ? 'is-on' : ''} ${today.getFullYear() === y && today.getMonth() === i ? 'is-today' : ''}`}
                  onClick={() => { setFocus((f) => clamp(new Date(y, i, Math.min(f.getDate(), new Date(y, i + 1, 0).getDate())))); setView('days'); }}
                >
                  {name.slice(0, 3)}
                </button>
              ))}
            </div>
          )}

          <div className="dp__foot">
            {clearable ? <button type="button" onClick={() => { onChange(''); close(); }}>Clear</button> : <span />}
            <button type="button" disabled={blocked(today)} onClick={() => choose(today)}>Today</button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
