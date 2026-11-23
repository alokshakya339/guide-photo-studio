import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { SITE } from '../site.js';
import { PageHero, useTitle, useReveal } from '../components/common.jsx';
import { IconArrow, IconWhatsApp } from '../components/Icons.jsx';

const AMOUNTS = [500, 1000, 1500, 2500, 3500, 5000, 7000, 10000];
const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

/* Same rules the server checks. */
const NAME_RX = /^[\p{L}\p{M}][\p{L}\p{M} .'’&-]*$/u;
const EMAIL_RX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const digits = (v) => String(v || '').replace(/[\s().-]/g, '');
const isPhone = (v) => /^(?:\+?91|0)?[6-9]\d{9}$/.test(digits(v)) || /^\+(?!91)[1-9]\d{7,14}$/.test(digits(v));
const nameErr = (v, req, label) => {
  const s = String(v || '').trim();
  if (!s) return req ? `Please enter ${label}.` : '';
  if (s.length < 2 || s.length > 60) return 'Names should be 2–60 characters.';
  return NAME_RX.test(s) ? '' : 'Please use letters only.';
};
const GIFT_RX = /^GS-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;
const normCode = (v) => {
  const raw = String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const body = raw.startsWith('GS') ? raw.slice(2) : raw;
  return body.length === 8 ? `GS-${body.slice(0, 4)}-${body.slice(4)}` : String(v || '').trim().toUpperCase();
};

/* Razorpay Checkout script, loaded only when someone clicks Pay. */
let rzpScript;
const loadRazorpay = () => {
  if (window.Razorpay) return Promise.resolve();
  rzpScript ||= new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = 'https://checkout.razorpay.com/v1/checkout.js';
    el.onload = resolve;
    el.onerror = () => { rzpScript = null; reject(new Error('Could not load the payment window. Please check your connection.')); };
    document.body.appendChild(el);
  });
  return rzpScript;
};

export default function GiftCards() {
  useTitle('Gift Cards');
  useReveal();
  const [params] = useSearchParams();
  const preset = Math.round(Number(params.get('amount')) || 0);
  const [amount, setAmount] = useState(AMOUNTS.includes(preset) ? preset : 5000);
  const [custom, setCustom] = useState(preset && !AMOUNTS.includes(preset) ? String(preset) : '');
  const [f, setF] = useState({ to: '', from: '', phone: '', email: '', note: '' });
  const [errs, setErrs] = useState({});
  const [pay, setPay] = useState(null);
  const [busy, setBusy] = useState(false);
  const [payErr, setPayErr] = useState('');
  const [bought, setBought] = useState(null);
  const [code, setCode] = useState('');
  const [check, setCheck] = useState(null);
  const value = custom ? Number(custom) : amount;

  useEffect(() => { api('/gift-cards/config').then(setPay).catch(() => setPay({ enabled: false, min: 500, max: 200000 })); }, []);
  const set = (k) => (e) => { setF((x) => ({ ...x, [k]: e.target.value })); if (errs[k]) setErrs((x) => ({ ...x, [k]: '' })); };

  const validate = () => {
    const min = pay?.min || 500; const max = pay?.max || 200000;
    const e = {
      amount: !value ? 'Please choose an amount.' : value < min ? `The minimum is ${inr(min)}.` : value > max ? `The maximum is ${inr(max)}.` : '',
      to: nameErr(f.to, false, 'their name'),
      from: nameErr(f.from, true, 'your name'),
      phone: !f.phone.trim() ? 'Please enter your mobile number.' : isPhone(f.phone) ? '' : 'Please enter a valid mobile number (10 digits).',
      email: !f.email.trim() ? 'Please enter your email — we send the code there.' : EMAIL_RX.test(f.email.trim()) ? '' : 'Please enter a valid email.',
      note: f.note.length > 600 ? 'Please keep it under 600 characters.' : '',
    };
    const clean = Object.fromEntries(Object.entries(e).filter(([, v]) => v));
    setErrs(clean);
    return !Object.keys(clean).length;
  };

  const buy = async () => {
    setPayErr('');
    if (!validate()) { setPayErr('Please fix the highlighted fields.'); return; }
    setBusy(true);
    try {
      const [order] = await Promise.all([
        api('/gift-cards/order', { method: 'POST', body: { amount: value, senderName: f.from, senderPhone: f.phone, senderEmail: f.email.trim(), recipientName: f.to, message: f.note } }),
        loadRazorpay(),
      ]);
      const rzp = new window.Razorpay({
        key: order.keyId, order_id: order.orderId, amount: order.amount, currency: order.currency,
        name: SITE.name, description: `Gift card${f.to ? ` for ${f.to}` : ''}`,
        prefill: { name: f.from, contact: f.phone, email: f.email.trim() },
        theme: { color: '#1d1a17' },
        handler: async (result) => {
          setBusy(true);
          try { setBought(await api('/gift-cards/verify', { method: 'POST', body: result })); } catch (err) { setPayErr(err.message); } finally { setBusy(false); }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.on('payment.failed', (r) => setPayErr(r?.error?.description || 'The payment failed. You have not been charged.'));
      rzp.open();
    } catch (err) {
      if (err.data?.fields) setErrs(err.data.fields);
      setPayErr(err.message);
      setBusy(false);
    }
  };

  const waText = [`Hi ${SITE.name}! I would like to buy a gift card 🎁`, `Amount: ${value ? inr(value) : '(to discuss)'}`, f.to && `For: ${f.to}`, f.from && `From: ${f.from}`].filter(Boolean).join('\n');
  const waLink = `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(waText)}`;
  const shareText = bought && [
    `🎁 ${bought.recipientName ? `Hi ${bought.recipientName.split(' ')[0]}! ` : ''}You've received a ${inr(bought.amount)} ${SITE.name} gift card${bought.senderName ? ` from ${bought.senderName}` : ''}!`,
    `Code: ${bought.code}`,
    `Valid until ${fmt(bought.expiresAt)}. Book your shoot: ${window.location.origin}/contact?gift=${bought.code}`,
  ].join('\n');

  const onCheck = async (e) => {
    e.preventDefault();
    const c = normCode(code);
    if (!GIFT_RX.test(c)) { setCheck({ error: 'Gift card codes look like GS-XXXX-XXXX.' }); return; }
    setCode(c); setCheck({ loading: true });
    try { setCheck({ card: await api(`/gift-cards/check/${encodeURIComponent(c)}`) }); } catch (err) { setCheck({ error: err.message }); }
  };
  const card = check?.card;
  const err = (k) => (errs[k] ? <small className="egc__err" role="alert">{errs[k]}</small> : null);

  return (
    <>
      <PageHero
        eyebrow="Gift cards"
        title={<>Give the gift <em>of memories</em></>}
        intro="A Guide Photo Studio gift card: the perfect present for an engagement, a wedding or an anniversary. Valid for 12 months on any shoot."
      />

      <section className="section egc" id="buy">
        <div className="container egc__grid">
          <div className="egc__art" data-reveal>
            <div className="egc__card">
              <img src="/images/wedding/w15.jpg" alt="" />
              <div className="egc__card-body">
                <span className="egc__brand">Guide <em>Photo</em> Studio</span>
                <span className="egc__label">Gift card</span>
                <b className="egc__amount">{value ? inr(value) : '₹ —'}</b>
                <span className="egc__to">{f.to ? `For ${f.to}` : 'For someone special'}{f.from ? ` · from ${f.from}` : ''}</span>
                <span className="egc__code">{bought?.code || 'GS-XXXX-XXXX'}</span>
              </div>
            </div>
          </div>

          <div className="egc__form" data-reveal>
            <p className="eyebrow">Buy a gift card</p>
            <h2 className="etitle">Choose an <em>amount</em></h2>
            <div className="egc__amounts" role="radiogroup" aria-label="Gift card amount">
              {AMOUNTS.map((a) => (
                <button key={a} type="button" role="radio" aria-checked={!custom && amount === a} className={!custom && amount === a ? 'is-on' : ''}
                  onClick={() => { setAmount(a); setCustom(''); setErrs((x) => ({ ...x, amount: '' })); }}>{inr(a)}</button>
              ))}
              <label className={`egc__custom ${custom ? 'is-on' : ''}`}>
                <span>₹</span>
                <input inputMode="numeric" placeholder="Other" value={custom} aria-label="Other amount" aria-invalid={errs.amount ? true : undefined}
                  onChange={(e) => { setCustom(e.target.value.replace(/\D/g, '').slice(0, 6)); setErrs((x) => ({ ...x, amount: '' })); }} />
              </label>
            </div>
            {err('amount')}

            {bought ? (
              <div className="egc__done" role="status">
                <p className="eyebrow">Payment received</p>
                <b className="egc__done-code">{bought.code}</b>
                <span>{inr(bought.amount)}{bought.recipientName ? ` for ${bought.recipientName}` : ''} · valid until {fmt(bought.expiresAt)}</span>
                <div className="egc__done-actions">
                  <button type="button" className="ebtn ebtn--dark" onClick={() => navigator.clipboard?.writeText(bought.code)}>Copy code</button>
                  <a className="ebtn ebtn--line" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer"><IconWhatsApp width={16} height={16} /> Share on WhatsApp</a>
                </div>
                <p className="egc__note">We’ve also emailed the code to {f.email}. Keep it safe — it works like cash for any shoot.</p>
              </div>
            ) : (
              <>
                <div className="egc__fields">
                  <label><span>Who is it for?</span><input value={f.to} onChange={set('to')} placeholder="e.g. Riya & Karan" maxLength={60} aria-invalid={errs.to ? true : undefined} />{err('to')}</label>
                  <label><span>From *</span><input value={f.from} onChange={set('from')} placeholder="Your name" maxLength={60} autoComplete="name" aria-invalid={errs.from ? true : undefined} />{err('from')}</label>
                  {pay?.enabled && <>
                    <label><span>Your mobile *</span><input value={f.phone} onChange={(e) => set('phone')({ target: { value: e.target.value.replace(/[^\d+\s()-]/g, '') } })} placeholder="+91 98765 43210" inputMode="tel" maxLength={18} autoComplete="tel" aria-invalid={errs.phone ? true : undefined} />{err('phone')}</label>
                    <label><span>Your email * <small>(we send the code here)</small></span><input type="email" value={f.email} onChange={set('email')} placeholder="you@example.com" maxLength={160} autoComplete="email" aria-invalid={errs.email ? true : undefined} />{err('email')}</label>
                    <label className="egc__wide"><span>Message <small>(optional)</small></span><input value={f.note} onChange={set('note')} placeholder="Congratulations to you both!" maxLength={600} />{err('note')}</label>
                  </>}
                </div>
                {pay?.enabled ? (
                  <>
                    <div className="egc__pay">
                      <button type="button" className="ebtn ebtn--dark" onClick={buy} disabled={busy}>{busy ? 'Opening secure payment…' : `Pay ${value ? inr(value) : ''} securely`}</button>
                      <a className="elink" href={waLink} target="_blank" rel="noreferrer">or request on WhatsApp</a>
                    </div>
                    {payErr && <p className="egc__alert" role="alert">{payErr}</p>}
                    <p className="egc__note">Pay by UPI, card, net banking or wallet through Razorpay. Your code appears here instantly and is emailed to you.</p>
                  </>
                ) : (
                  <>
                    <a className="ebtn ebtn--dark" href={waLink} target="_blank" rel="noreferrer"><IconWhatsApp width={16} height={16} /> Request on WhatsApp</a>
                    <p className="egc__note">We’ll confirm payment on WhatsApp and send a personalised gift card with a unique code.</p>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <section className="section egc-steps">
        <div className="container">
          <div className="ehead ehead--center" data-reveal><div><p className="eyebrow">How it works</p><h2 className="etitle">Three <em>simple steps</em></h2></div></div>
          <ol className="steps">
            {[
              ['Choose & pay', 'Pick an amount and pay securely online, or message us on WhatsApp.'],
              ['Share the code', 'Your unique code (GS-XXXX-XXXX) arrives instantly by email, ready to share or print.'],
              ['Book any shoot', 'They mention the code when enquiring, and the value comes off their package.'],
            ].map(([t, d], i) => (
              <li key={t} data-reveal style={{ '--d': `${i * 100}ms` }}><span className="steps__n">{String(i + 1).padStart(2, '0')}</span><h3>{t}</h3><p className="muted">{d}</p></li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section egc-check" id="check">
        <div className="container narrow egc-check__inner" data-reveal>
          <p className="eyebrow">Received a gift card?</p>
          <h2 className="etitle etitle--center">Check your <em>gift card</em></h2>
          <form className="egc-check__form" onSubmit={onCheck} noValidate>
            <input value={code} onChange={(e) => { setCode(e.target.value); setCheck(null); }} placeholder="GS-XXXX-XXXX" aria-label="Gift card code" autoCapitalize="characters" spellCheck="false" maxLength={14} />
            <button className="ebtn ebtn--dark" disabled={check?.loading}>{check?.loading ? 'Checking…' : 'Check'}</button>
          </form>
          {check?.error && <p className="egc__alert" role="alert">{check.error}</p>}
          {card && (
            <div className={`egc-res is-${card.status}`} role="status">
              <div className="egc-res__card">
                <div className="egc-res__top">
                  <span className="egc-res__brand">Guide <em>Photo</em> Studio</span>
                  <span className="egc-res__badge">{card.status === 'active' ? '✓ Valid' : card.status === 'redeemed' ? 'Redeemed' : 'Expired'}</span>
                </div>
                <b className="egc-res__amount">{inr(card.amount)}</b>
                <span className="egc-res__for">{card.recipientName ? `For ${card.recipientName}` : 'Gift card'}</span>
                <div className="egc-res__bottom">
                  <span className="egc-res__code">{card.code}</span>
                  {card.expiresAt && <span className="egc-res__date">{card.status === 'expired' ? 'Expired' : 'Valid until'} {fmt(card.expiresAt)}</span>}
                </div>
              </div>
              {card.status === 'active' ? (
                <div className="egc-res__actions">
                  <Link className="ebtn ebtn--dark" to={`/contact?gift=${encodeURIComponent(card.code)}`}>Book with this card <IconArrow width={16} height={16} /></Link>
                  <p className="egc__note">The full value comes off your package. Mention the code when you enquire.</p>
                </div>
              ) : (
                <p className="egc-res__msg">
                  {card.status === 'redeemed' ? 'This gift card has already been used for a booking.' : 'This gift card has expired.'}{' '}
                  <a href={`https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(`Hi ${SITE.name}! I have a question about gift card ${card.code}.`)}`} target="_blank" rel="noreferrer">Message us</a> and we’ll help.
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
