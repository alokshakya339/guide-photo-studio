import { useState } from 'react';
import { api } from '../api.js';
import { CORPORATE_SERVICES } from '../site.js';
import Select from './Select.jsx';
import DatePicker from './DatePicker.jsx';

/**
 * Enquiry form for businesses (Home → Corporate services). Posts to the same /inquiries
 * endpoint as the wedding form with source "corporate", so leads land in Admin → Enquiries
 * with the company name shown under the contact.
 */
const EMPTY = { name: '', company: '', designation: '', phone: '', email: '', service: '', eventDate: '', location: '', budget: '', message: '', website: '' };
const BUDGETS = [{ value: '', label: 'Prefer not to say' }, 'Under ₹50,000', '₹50,000 – ₹2,00,000', '₹2,00,000 – ₹5,00,000', '₹5,00,000+', 'Ongoing / retainer'];

export default function CorporateForm() {
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState({ state: 'idle', error: '', errors: {} });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setVal = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setStatus({ state: 'sending', error: '', errors: {} });
    const { service, ...rest } = form;
    try {
      await api('/inquiries', { method: 'POST', body: { ...rest, eventType: service ? `Corporate: ${service}` : 'Corporate', source: 'corporate' } });
      setStatus({ state: 'sent', error: '', errors: {} });
      setForm(EMPTY);
    } catch (err) {
      setStatus({ state: 'error', error: err.message, errors: err.details || {} });
    }
  }

  if (status.state === 'sent') {
    return (
      <div className="form-success" role="status">
        <h3>Thank you!</h3>
        <p>We’ve received your brief. Our team will get back to you with a tailored proposal.</p>
        <button className="btn btn--ghost" onClick={() => setStatus({ state: 'idle', error: '', errors: {} })}>Send another enquiry</button>
      </div>
    );
  }

  const err = status.errors;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form className="form" onSubmit={submit} noValidate>
      <div className="form__row">
        <label>
          <span>Your name *</span>
          <input value={form.name} onChange={set('name')} autoComplete="name" required aria-invalid={!!err.name} />
          {err.name && <small className="form__err">{err.name}</small>}
        </label>
        <label>
          <span>Company *</span>
          <input value={form.company} onChange={set('company')} autoComplete="organization" required aria-invalid={!!err.company} />
          {err.company && <small className="form__err">{err.company}</small>}
        </label>
      </div>
      <div className="form__row">
        <label>
          <span>Designation</span>
          <input value={form.designation} onChange={set('designation')} autoComplete="organization-title" placeholder="e.g. Marketing Manager" />
        </label>
        <label>
          <span>Phone / WhatsApp *</span>
          <input value={form.phone} onChange={set('phone')} type="tel" autoComplete="tel" inputMode="tel" required aria-invalid={!!err.phone} />
          {err.phone && <small className="form__err">{err.phone}</small>}
        </label>
      </div>
      <div className="form__row">
        <label>
          <span>Work email *</span>
          <input value={form.email} onChange={set('email')} type="email" autoComplete="email" required aria-invalid={!!err.email} />
          {err.email && <small className="form__err">{err.email}</small>}
        </label>
        <label>
          <span>Service needed</span>
          <Select value={form.service} onChange={setVal('service')} options={CORPORATE_SERVICES} placeholder="Select…" ariaLabel="Service needed" />
        </label>
      </div>
      <div className="form__row">
        <label>
          <span>Shoot / event date</span>
          <DatePicker value={form.eventDate} onChange={setVal('eventDate')} min={today} ariaLabel="Shoot or event date" />
        </label>
        <label>
          <span>Location / office</span>
          <input value={form.location} onChange={set('location')} placeholder="e.g. Noida Sector 62" />
        </label>
      </div>
      <label>
        <span>Approximate budget</span>
        <Select value={form.budget} onChange={setVal('budget')} placeholder="Prefer not to say" ariaLabel="Approximate budget" options={BUDGETS} />
      </label>
      <label>
        <span>Project brief</span>
        <textarea value={form.message} onChange={set('message')} rows={4} placeholder="Number of people or products, days of coverage, deliverables, deadlines…" />
      </label>
      {/* Honeypot: hidden from people, filled by bots */}
      <input className="hp" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} aria-hidden="true" />
      {status.state === 'error' && <p className="form__err" role="alert">{status.error}</p>}
      <button className="btn btn--primary" disabled={status.state === 'sending'}>
        {status.state === 'sending' ? 'Sending…' : 'Request a proposal'}
      </button>
    </form>
  );
}
