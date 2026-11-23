import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icons.jsx';

const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/** "2026-11-21" → "Sat, 21 Nov 2026" */
export const formatDate = (iso) => (iso
  ? fromISO(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  : '');

/** Brand-styled date picker (replaces the browser's native calendar). Value is an ISO date string. */
export default function DatePicker({ value, onChange, min, placeholder = 'Choose a date', id }) {
  const [open, setOpen] = useState(false);
  const minDate = min ? fromISO(min) : null;
  const initial = value ? fromISO(value) : (minDate || new Date());
  const [view, setView] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const root = useRef(null);
  const todayISO = toISO(new Date());

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (!root.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  useEffect(() => { if (value) { const d = fromISO(value); setView(new Date(d.getFullYear(), d.getMonth(), 1)); } }, [value]);

  const days = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const lead = (first.getDay() + 6) % 7; // Monday-first
    const count = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    return [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => new Date(view.getFullYear(), view.getMonth(), i + 1))];
  }, [view]);

  const canPrev = !minDate || new Date(view.getFullYear(), view.getMonth(), 0) >= new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const shift = (n) => setView(new Date(view.getFullYear(), view.getMonth() + n, 1));
  const pick = (d) => { onChange(toISO(d)); setOpen(false); };

  return (
    <div className={`dp ${open ? 'open' : ''}`} ref={root}>
      <button type="button" id={id} className={`dp-field ${value ? 'has' : ''}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span>{value ? formatDate(value) : placeholder}</span>
        <Icon name="calendar" size={20} />
      </button>

      {open && (
        <div className="dp-pop" role="dialog" aria-label="Choose a date">
          <div className="dp-head">
            <button type="button" className="dp-nav" aria-label="Previous month" disabled={!canPrev} onClick={() => shift(-1)}><Icon name="left" size={18} /></button>
            <span className="dp-month" key={view.toISOString()}>
              <em>{view.toLocaleDateString('en-IN', { month: 'long' })}</em> {view.getFullYear()}
            </span>
            <button type="button" className="dp-nav" aria-label="Next month" onClick={() => shift(1)}><Icon name="right" size={18} /></button>
          </div>
          <div className="dp-grid dp-week">{WEEK.map((w, i) => <span key={w} className={i > 4 ? 'we' : ''}>{w}</span>)}</div>
          <div className="dp-grid" key={view.toISOString()}>
            {days.map((d, i) => {
              if (!d) return <span key={`e${i}`} />;
              const iso = toISO(d);
              const disabled = minDate && d < minDate;
              const weekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <button
                  type="button" key={iso} disabled={disabled}
                  className={`dp-day ${iso === value ? 'sel' : ''} ${iso === todayISO ? 'today' : ''} ${weekend ? 'we' : ''}`}
                  aria-pressed={iso === value} aria-label={formatDate(iso)}
                  onClick={() => pick(d)}
                >{d.getDate()}</button>
              );
            })}
          </div>
          <div className="dp-foot">
            <span className="dp-legend"><i /> Weekends</span>
            <span>
              <button type="button" className="dp-link" onClick={() => { onChange(''); setOpen(false); }}>Clear</button>
              <button type="button" className="dp-today" onClick={() => pick(minDate && new Date() < minDate ? minDate : new Date())}>Today</button>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
