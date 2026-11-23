import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { EVENT_TYPES } from '../site.js';
import Select from './Select.jsx';
import DatePicker from './DatePicker.jsx';

const EMPTY = { name: '', phone: '', email: '', eventType: '', eventDate: '', location: '', budget: '', message: '', website: '', giftCode: '' };
const GIFT_RX = /^GS-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;
const normCode = (v) => { const raw = String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); const body = raw.startsWith('GS') ? raw.slice(2) : raw; return body.length === 8 ? `GS-${body.slice(0, 4)}-${body.slice(4)}` : String(v || '').trim().toUpperCase(); };

export default function InquiryForm({ defaultEventType = '', defaultGift = '', source = 'website', compact = false }) {
  const [form, setForm] = useState({ ...EMPTY, eventType: defaultEventType, giftCode: defaultGift ? normCode(defaultGift) : '' });
  const [gift, setGift] = useState(null); // result of checking the code

  async function checkGift(raw) {
    const c = normCode(raw);
    if (!c) { setGift(null); return; }
    if (!GIFT_RX.test(c)) { setGift({ ok: false, text: 'Gift card codes look like GS-XXXX-XXXX.' }); return; }
    setForm((f) => ({ ...f, giftCode: c }));
    try {
      const g = await api(`/gift-cards/check/${encodeURIComponent(c)}`);
      setGift(g.status === 'active'
        ? { ok: true, text: `Valid gift card · ₹${Number(g.amount).toLocaleString('en-IN')}` }
        : { ok: false, text: g.status === 'redeemed' ? 'This gift card has already been used.' : 'This gift card has expired — message us, we’ll help.' });
    } catch (e2) { setGift({ ok: false, text: e2.message }); }
  }
  useEffect(() => { if (defaultGift) checkGift(defaultGift); }, [defaultGift]); // eslint-disable-line react-hooks/exhaustive-deps
  const [status, setStatus] = useState({ state: 'idle', error: '', errors: {} });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setStatus({ state: 'sending', error: '', errors: {} });
    try {
      await api('/inquiries', { method: 'POST', body: { ...form, source } });
      setStatus({ state: 'sent', error: '', errors: {} });
      setForm({ ...EMPTY, eventType: defaultEventType }); setGift(null);
    } catch (err) {
      setStatus({ state: 'error', error: err.message, errors: err.details || {} });
    }
  }

  if (status.state === 'sent') {
    return (
      <div className="form-success" role="status">
        <h3>Thank you!</h3>
        <p>Your request has been received. Our team will call you shortly to confirm the details.</p>
        <button className="btn btn--ghost" onClick={() => setStatus({ state: 'idle', error: '', errors: {} })}>
          Send another enquiry
        </button>
      </div>
    );
  }

  const err = status.errors;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form className={`form ${compact ? 'form--compact' : ''}`} onSubmit={submit} noValidate>
      <div className="form__row">
        <label>
          <span>Your name *</span>
          <input value={form.name} onChange={set('name')} autoComplete="name" required aria-invalid={!!err.name} />
          {err.name && <small className="form__err">{err.name}</small>}
        </label>
        <label>
          <span>Phone / WhatsApp *</span>
          <input value={form.phone} onChange={set('phone')} type="tel" autoComplete="tel" inputMode="tel" required aria-invalid={!!err.phone} />
          {err.phone && <small className="form__err">{err.phone}</small>}
        </label>
      </div>
      <div className="form__row">
        <label>
          <span>Email</span>
          <input value={form.email} onChange={set('email')} type="email" autoComplete="email" aria-invalid={!!err.email} />
          {err.email && <small className="form__err">{err.email}</small>}
        </label>
        <label>
          <span>Shoot type</span>
          <Select value={form.eventType} onChange={(v) => setForm((f) => ({ ...f, eventType: v }))} options={EVENT_TYPES} placeholder="Select…" ariaLabel="Shoot type" />
        </label>
      </div>
      <div className="form__row">
        <label>
          <span>Event date</span>
          <DatePicker value={form.eventDate} onChange={(v) => setForm((f) => ({ ...f, eventDate: v }))} min={today} ariaLabel="Event date" />
        </label>
        <label>
          <span>Location / venue</span>
          <input value={form.location} onChange={set('location')} placeholder="e.g. Noida, Jaipur" />
        </label>
      </div>
      {!compact && (
        <label>
          <span>Approximate budget</span>
          <Select
            value={form.budget}
            onChange={(v) => setForm((f) => ({ ...f, budget: v }))}
            placeholder="Prefer not to say"
            ariaLabel="Approximate budget"
            options={[{ value: '', label: 'Prefer not to say' }, 'Under ₹50,000', '₹50,000 – ₹1,50,000', '₹1,50,000 – ₹3,00,000', '₹3,00,000+']}
          />
        </label>
      )}
      {(!compact || form.giftCode) && (
        <label>
          <span>Gift card code (optional)</span>
          <input value={form.giftCode} onChange={(e) => { set('giftCode')(e); setGift(null); }} onBlur={(e) => checkGift(e.target.value)} placeholder="GS-XXXX-XXXX" autoCapitalize="characters" spellCheck="false" maxLength={14} aria-invalid={!!err.giftCode || (gift && !gift.ok) || undefined} />
          {(err.giftCode || gift) && <small className={gift?.ok ? 'form__ok' : 'form__err'}>{err.giftCode || `${gift.ok ? '✓ ' : ''}${gift.text}`}</small>}
        </label>
      )}
      <label>
        <span>Tell us about your plans</span>
        <textarea value={form.message} onChange={set('message')} rows={compact ? 3 : 4} placeholder="Number of days, functions, anything special…" />
      </label>
      {/* Honeypot: hidden from people, filled by bots */}
      <input className="hp" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} aria-hidden="true" />
      {status.state === 'error' && <p className="form__err" role="alert">{status.error}</p>}
      <button className="btn btn--primary" disabled={status.state === 'sending'}>
        {status.state === 'sending' ? 'Sending…' : 'Check availability'}
      </button>
    </form>
  );
}
