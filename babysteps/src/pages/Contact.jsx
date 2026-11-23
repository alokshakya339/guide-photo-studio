import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { WhatsAppIcon } from '../Icons.jsx';
import DatePicker, { formatDate } from '../DatePicker.jsx';
import { STUDIO, SHOOT_TYPES } from '../data.js';
import { Label, PageHero, FaqList, useSeo, useReveal, waLink } from '../lib.jsx';
import { FAQS } from '../data.js';
import { api } from '../api.js';
import { useValidation } from '../useValidation.jsx';
import { checkName, checkPhone, checkEmail, checkBabyAge, checkDate, checkGiftCode, checkText, formatPhone, normalizeGiftCode, squish } from '../validation.js';

const RULES = {
  name: (v) => checkName(v, { label: 'your name' }),
  phone: (v) => checkPhone(v),
  email: (v) => checkEmail(v),
  age: (v) => checkBabyAge(v),
  date: (v) => checkDate(v, { future: true }),
  gift: (v) => checkGiftCode(v),
  msg: (v) => checkText(v, { max: 2000 }),
};

const EMPTY = { name: '', phone: '', email: '', shoot: 'Newborn', plan: '', age: '', date: '', msg: '', gift: '', website: '' };

export default function Contact() {
  useSeo('contact');
  useReveal();
  const [params] = useSearchParams();
  const [form, setForm] = useState(EMPTY);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  const [gift, setGift] = useState(null); // result of checking a gift card code
  const v = useValidation(RULES);

  // Pre-fill from links like /contact?session=Newborn&package=Deluxe
  useEffect(() => {
    const session = params.get('session');
    const pkg = params.get('package') || '';
    const giftCode = params.get('gift') || '';
    if (session || pkg || giftCode) {
      setForm((f) => ({ ...f, shoot: SHOOT_TYPES.includes(session) ? session : f.shoot, plan: pkg, gift: giftCode || f.gift }));
      setSent(false);
      if (giftCode) checkGift(giftCode);
    }
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  async function checkGift(raw) {
    const code = normalizeGiftCode(raw);
    if (!code || checkGiftCode(code)) { setGift(null); return; }
    setGift({ loading: true });
    try {
      const g = await api(`/gift-cards/${encodeURIComponent(code)}`);
      setGift(g.status === 'active' ? { ok: true, text: `Valid gift card · ₹${g.amount.toLocaleString('en-IN')}${g.expiresAt ? ` · until ${new Date(g.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}` }
        : { ok: false, text: g.status === 'redeemed' ? 'This gift card has already been used.' : 'This gift card has expired — message us, we\'ll help.' });
    } catch (e) { setGift({ ok: false, text: e.message }); }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const today = new Date().toISOString().slice(0, 10);

  const submit = (e) => {
    e.preventDefault();
    if (!v.check(form, e.currentTarget)) { setErr('Please fix the highlighted fields.'); return; }
    if (gift && !gift.loading && !gift.ok) { setErr('Please check the gift card code — or remove it.'); return; }
    setErr('');
    const f = { ...form, name: squish(form.name), phone: formatPhone(form.phone), email: form.email.trim(), gift: form.gift ? normalizeGiftCode(form.gift) : '', age: squish(form.age), msg: form.msg.trim() };
    setForm(f);
    const lines = [
      'Hi BabySteps! I would like to book a session.',
      `Name: ${f.name}`,
      `Phone: ${f.phone}`,
      f.email && `Email: ${f.email}`,
      `Session: ${f.shoot}${f.plan ? ` — ${f.plan} package` : ''}`,
      f.age && `Baby's age / pregnancy week: ${f.age}`,
      f.date && `Preferred date: ${formatDate(f.date)}`,
      f.gift && `Gift card: ${f.gift.toUpperCase()}`,
      f.msg && `Note: ${f.msg}`,
    ].filter(Boolean);
    // Open WhatsApp first (browsers block pop-ups opened after a network wait)…
    window.open(waLink(lines.join('\n')), '_blank', 'noopener');
    // …and save the enquiry for the studio in the background (keepalive survives navigation).
    api('/inquiries', {
      method: 'POST',
      keepalive: true,
      body: {
        name: f.name, phone: f.phone, email: f.email, session: f.shoot, package: f.plan,
        babyAge: f.age, preferredDate: f.date, giftCode: f.gift, message: f.msg, website: f.website,
      },
    }).catch(() => { /* WhatsApp already has the details */ });
    setSent(true);
  };

  return (
    <>
      <PageHero
        crumb={[[null, 'Contact']]}
        title={<>Let's create <em>something beautiful</em></>}
        intro="Ready to capture your precious moments? Fill out the form and we'll get back to you within 24 hours."
      />

      <section className="book" id="book">
        <div className="wrap book-grid">
          <div className="book-info" data-reveal>
            <Label light>Reserve your date</Label>
            <h2 className="h2">Book a <em>session</em></h2>
            <p>Our calendar fills up quickly, especially for newborn sessions — reach out early to reserve your date.</p>
            <ul className="contact">
              <li><small>Call</small><a href={STUDIO.phoneHref}>{STUDIO.phone}</a></li>
              <li><small>WhatsApp</small><a href={waLink('Hi BabySteps!')} target="_blank" rel="noreferrer">Chat with us</a></li>
              <li><small>Email</small><a href={`mailto:${STUDIO.email}`}>{STUDIO.email}</a></li>
              <li><small>Instagram</small><a href={STUDIO.instagram} target="_blank" rel="noreferrer">{STUDIO.instagramHandle}</a></li>
              <li><small>Studio</small><a href={`https://maps.google.com/?q=${encodeURIComponent(STUDIO.mapQuery)}`} target="_blank" rel="noreferrer">{STUDIO.address}</a></li>
            </ul>
          </div>

          <form className="book-form" onSubmit={submit} noValidate data-reveal>
            {sent ? (
              <div className="sent">
                <h3>Thank you, <em>{form.name.split(' ')[0]}</em></h3>
                <p>WhatsApp should have opened with your details — just press send and we'll be in touch within 24 hours.</p>
                <button type="button" className="btn btn-line light" onClick={() => setSent(false)}>Edit details</button>
              </div>
            ) : (
              <>
                <fieldset className="pick">
                  <legend>I'm interested in</legend>
                  {SHOOT_TYPES.map((s) => (
                    <button type="button" key={s} className={form.shoot === s ? 'on' : ''} aria-pressed={form.shoot === s}
                      onClick={() => setForm((f) => ({ ...f, shoot: s, plan: '' }))}>{s}</button>
                  ))}
                </fieldset>
                {form.plan && <p className="plan-note">Package — <b>{form.plan}</b> <button type="button" className="link" onClick={() => setForm((f) => ({ ...f, plan: '' }))}>remove</button></p>}
                <div className="row">
                  <label><span>Your name *</span><input value={form.name} onChange={set('name')} autoComplete="name" required maxLength={60} {...v.field('name')} />{v.error('name')}</label>
                  <label><span>Mobile number *</span><input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/[^\d+\s()-]/g, '') }))} inputMode="tel" autoComplete="tel" placeholder="+91 98765 43210" required maxLength={18} {...v.field('phone')} onBlur={(e) => { if (!v.checkOne('phone', e.target.value)) setForm((f) => ({ ...f, phone: formatPhone(f.phone) })); }} />{v.error('phone')}</label>
                </div>
                <div className="row">
                  <label><span>Email</span><input type="email" value={form.email} onChange={set('email')} autoComplete="email" maxLength={160} placeholder="name@gmail.com" {...v.field('email')} />{v.error('email')}</label>
                  <label><span>Baby's age / pregnancy week</span><input value={form.age} onChange={set('age')} placeholder="e.g. 30 weeks" maxLength={40} {...v.field('age')} />{v.error('age')}</label>
                </div>
                <div className="field" data-field="date"><span className="field-label">Preferred date</span><DatePicker value={form.date} min={today} onChange={(d) => { setForm((f) => ({ ...f, date: d })); v.checkOne('date', d); }} />{v.error('date')}</div>
                <label>
                  <span>Gift card code (optional)</span>
                  <input value={form.gift} onChange={(e) => { set('gift')(e); setGift(null); }} placeholder="BS-XXXX-XXXX" autoCapitalize="characters" spellCheck="false" maxLength={14} {...v.field('gift')}
                    onBlur={(e) => { if (!v.checkOne('gift', e.target.value) && e.target.value.trim()) { const c = normalizeGiftCode(e.target.value); setForm((f) => ({ ...f, gift: c })); checkGift(c); } }} />
                  {v.error('gift')}
                  {gift && !gift.loading && <small className={`gift-check ${gift.ok ? 'ok' : 'bad'}`}>{gift.ok ? '✓ ' : ''}{gift.text}</small>}
                </label>
                <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={set('website')} placeholder="Leave empty" />
                <label><span>Anything else?</span><textarea rows={2} value={form.msg} onChange={set('msg')} placeholder="Themes, colours, siblings joining…" maxLength={2000} {...v.field('msg')} />{v.error('msg')}</label>
                {err && <p className="err" role="alert">{err}</p>}
                <button className="btn btn-gold btn-block" type="submit"><WhatsAppIcon size={18} /> Send enquiry</button>
              </>
            )}
          </form>
        </div>
      </section>

      <section className="map-wrap">
        <iframe
          title="BabySteps Guide Studio location"
          src={`https://maps.google.com/maps?q=${encodeURIComponent(STUDIO.mapQuery)}&z=14&output=embed`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </section>

      <section className="section faq">
        <div className="wrap faq-grid">
          <div data-reveal>
            <Label>Before you book</Label>
            <h2 className="h2">Good <em>to know</em></h2>
          </div>
          <div data-reveal><FaqList items={FAQS.slice(0, 4)} /></div>
        </div>
      </section>
    </>
  );
}
