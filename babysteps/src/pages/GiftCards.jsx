import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { WhatsAppIcon } from '../Icons.jsx';
import { IMG } from '../data.js';
import { Label, PageHero, useSeo, useReveal, waLink } from '../lib.jsx';
import { HeartDivider } from '../Decor.jsx';
import { api } from '../api.js';
import { STUDIO } from '../data.js';
import { useValidation } from '../useValidation.jsx';
import { checkAmount, checkName, checkPhone, checkEmail, checkText, checkGiftCode, formatPhone, normalizeGiftCode, squish } from '../validation.js';

const DEFAULT_MIN = 500; // real value comes from /payments/config (set in Admin → Gift cards)
const MAX = 200000;
const buyRules = (min) => ({
  amount: (v) => checkAmount(v, { min, max: MAX }),
  to: (v) => checkName(v, { required: false, label: 'their name' }),
  from: (v) => checkName(v, { label: 'your name' }),
  phone: (v) => checkPhone(v),
  email: (v) => checkEmail(v, { required: true }),
  note: (v) => checkText(v, { max: 600 }),
});
const CHECK_RULES = { code: (v) => checkGiftCode(v, { required: true }) };

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

const AMOUNTS = [2500, 5000, 10000];
const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

/** Same formula as the server (server/src/paymentSettings.js → priceBreakdown); amounts in paise. */
function priceBreakdown(amount, c) {
  const base = Math.round(amount * 100);
  const platformFee = Math.round((base * c.platformFeePercent) / 100) + Math.round(c.platformFeeFlat * 100);
  const gst = Math.round(((base + platformFee) * c.gstPercent) / 100);
  return { base, platformFee, gst, total: base + platformFee + gst };
}
const rupees = (paise) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
const pct = (n) => `${Number(n)}%`;

function BookingSummary({ value, to, charges, min }) {
  const valid = value >= min && value <= MAX;
  const p = valid ? priceBreakdown(value, charges) : null;
  const feeLabel = [charges.platformFeePercent ? pct(charges.platformFeePercent) : '', charges.platformFeeFlat ? `₹${charges.platformFeeFlat}` : ''].filter(Boolean).join(' + ');
  return (
    <div className="gc-summary" aria-live="polite">
      <h3>Booking summary</h3>
      <dl>
        <div><dt>Gift card value{to ? <small> for {to}</small> : null}</dt><dd>{p ? rupees(p.base) : '—'}</dd></div>
        {(charges.platformFeePercent > 0 || charges.platformFeeFlat > 0) && <div><dt>Platform fee{feeLabel ? <small> ({feeLabel})</small> : null}</dt><dd>{p ? rupees(p.platformFee) : '—'}</dd></div>}
        {charges.gstPercent > 0 && <div><dt>GST <small>({pct(charges.gstPercent)})</small></dt><dd>{p ? rupees(p.gst) : '—'}</dd></div>}
        <div className="gc-summary-total"><dt>Total payable</dt><dd>{p ? rupees(p.total) : '—'}</dd></div>
      </dl>
      <p>The gift card is worth {p ? rupees(p.base) : 'the chosen amount'} — fee and GST are not deducted from it.</p>
    </div>
  );
}

export default function GiftCards() {
  useSeo('gift-cards');
  useReveal();
  const [params] = useSearchParams();
  const preset = Math.round(Number(params.get('amount')) || 0);
  const [amount, setAmount] = useState(AMOUNTS.includes(preset) ? preset : 5000);
  const [custom, setCustom] = useState(preset && !AMOUNTS.includes(preset) ? String(preset).slice(0, 6) : '');
  const [to, setTo] = useState('');
  const [from, setFrom] = useState('');
  const [code, setCode] = useState('');
  const [check, setCheck] = useState(null);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [pay, setPay] = useState(null); // { enabled, keyId, min, max }
  const [busy, setBusy] = useState(false);
  const [payErr, setPayErr] = useState('');
  const [bought, setBought] = useState(null);
  const value = custom ? Number(custom) : amount;
  const charges = pay?.charges || { gstPercent: 0, platformFeePercent: 0, platformFeeFlat: 0 };
  const min = pay?.min || DEFAULT_MIN;
  const presets = AMOUNTS.filter((a) => a >= min);
  const total = value >= min && value <= MAX ? priceBreakdown(value, charges).total : 0;
  const v = useValidation(useMemo(() => buyRules(min), [min]));
  const vc = useValidation(CHECK_RULES);

  // If the admin's minimum is above the selected preset, move to the first allowed amount.
  useEffect(() => {
    if (custom || amount >= min) return;
    if (presets.length) setAmount(presets[0]); else setCustom(String(min));
  }, [min]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { api('/payments/config').then(setPay).catch(() => setPay({ enabled: false })); }, []);

  const buy = async () => {
    setPayErr('');
    if (!v.check({ amount: value || '', to, from, phone, email, note })) return setPayErr('Please fix the highlighted fields.');
    const clean = { senderName: squish(from), recipientName: squish(to), senderPhone: formatPhone(phone), senderEmail: email.trim(), message: note.trim() };
    setFrom(clean.senderName); setTo(clean.recipientName); setPhone(clean.senderPhone);
    setBusy(true);
    try {
      const [order] = await Promise.all([
        api('/payments/gift-card/order', { method: 'POST', body: { amount: value, ...clean } }),
        loadRazorpay(),
      ]);
      const rzp = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: STUDIO.name,
        description: `Gift card${to ? ` for ${to}` : ''}`,
        prefill: { name: from, contact: phone, email },
        theme: { color: '#a4664f' },
        handler: async (result) => {
          setBusy(true);
          try { setBought(await api('/payments/gift-card/verify', { method: 'POST', body: result })); }
          catch (err) { setPayErr(err.message); }
          finally { setBusy(false); }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.on('payment.failed', (r) => setPayErr(r?.error?.description || 'The payment failed. You have not been charged.'));
      rzp.open();
    } catch (err) {
      setPayErr(err.message);
      setBusy(false);
    }
  };

  const shareText = bought && [
    `🎁 ${bought.recipientName ? `Hi ${bought.recipientName.split(' ')[0]}! ` : ''}You've received a ${inr(bought.amount)} BabySteps photography gift card${bought.senderName ? ` from ${bought.senderName}` : ''}!`,
    `Code: ${bought.code}`,
    `Valid until ${fmt(bought.expiresAt)}. Book any session at ${window.location.origin}/contact`,
  ].join('\n');

  const requestText = [
    'Hi BabySteps! I would like to buy a photography gift card 🎁',
    `Amount: ${value ? inr(value) : '(to discuss)'}`,
    to && `For: ${to}`,
    from && `From: ${from}`,
  ].filter(Boolean).join('\n');

  const onCheck = async (e) => {
    e.preventDefault();
    if (!vc.check({ code })) { setCheck(null); return; }
    const c = normalizeGiftCode(code);
    setCode(c);
    setCheck({ loading: true });
    try { setCheck({ card: await api(`/gift-cards/${encodeURIComponent(c)}`) }); } catch (err) { setCheck({ error: err.message }); }
  };
  const card = check?.card;

  return (
    <>
      <PageHero
        crumb={[[null, 'Gift Cards']]}
        title={<>Give the gift <em>of memories</em></>}
        intro="Surprise a mom-to-be or new parents with a BabySteps photography gift card — the perfect baby-shower, naming-ceremony or first-birthday present."
      />

      <section className="section gc" id="buy">
        <div className="wrap gc-grid">
          <div className="gc-card-art" data-reveal>
            <div className="gc-card">
              <img src={IMG.newborn} alt="" />
              <div className="gc-card-body">
                <span className="gc-card-brand">BabySteps <small>Guide Studio</small></span>
                <span className="gc-card-label">Gift card</span>
                <b className="gc-card-amount">{value ? inr(value) : '₹ —'}</b>
                <span className="gc-card-to">{to ? `For ${to}` : 'For someone special'}{from ? ` · from ${from}` : ''}</span>
                <span className="gc-card-code">{bought?.code || 'BS-XXXX-XXXX'}</span>
              </div>
            </div>
          </div>

          <div className="gc-form" data-reveal>
            <Label>Buy a gift card</Label>
            <h2 className="h2">Choose an <em>amount</em></h2>
            <div className="gc-amounts" role="radiogroup" aria-label="Gift card amount">
              {presets.map((a) => (
                <button key={a} role="radio" aria-checked={!custom && amount === a} className={!custom && amount === a ? 'on' : ''} onClick={() => { setAmount(a); setCustom(''); v.setErrors((x) => ({ ...x, amount: '' })); }}>{inr(a)}</button>
              ))}
              <label className={`gc-custom ${custom ? 'on' : ''}`}>
                <span>₹</span><input inputMode="numeric" placeholder={`Other (min ₹${min.toLocaleString('en-IN')})`} value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, '').slice(0, 6))} aria-label="Custom amount" {...v.field('amount')} onBlur={(e) => e.target.value && v.checkOne('amount', e.target.value)} />
              </label>
            </div>
            {v.error('amount')}
            {bought ? (
              <div className="gc-bought" role="status">
                <b>Payment received — your gift card is ready!</b>
                <span className="gc-bought-code">{bought.code}</span>
                <span>{inr(bought.amount)}{bought.recipientName ? ` for ${bought.recipientName}` : ''} · valid until {fmt(bought.expiresAt)}</span>
                {bought.paid > bought.amount && <span>Paid {rupees(Math.round(bought.paid * 100))} incl. platform fee & GST</span>}
                <div className="gc-bought-actions">
                  <button type="button" className="btn btn-dark" onClick={() => navigator.clipboard?.writeText(bought.code)}>Copy code</button>
                  <a className="btn btn-line" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer"><WhatsAppIcon size={18} /> Share on WhatsApp</a>
                </div>
                <p className="gc-note">We've also emailed the code to {email}. Keep it safe — it works like cash for any BabySteps session.</p>
              </div>
            ) : (
              <>
                <div className="gc-fields">
                  <label><span>Who is it for?</span><input value={to} onChange={(e) => setTo(e.target.value)} placeholder="e.g. Riya & Karan" maxLength={60} {...v.field('to')} />{v.error('to')}</label>
                  <label><span>From</span><input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Your name" maxLength={60} autoComplete="name" {...v.field('from')} />{v.error('from')}</label>
                  {pay?.enabled && <>
                    <label><span>Your phone</span><input value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s()-]/g, ''))} placeholder="+91 98765 43210" inputMode="tel" maxLength={18} autoComplete="tel" {...v.field('phone')} onBlur={(e) => { if (!v.checkOne('phone', e.target.value)) setPhone(formatPhone(e.target.value)); }} />{v.error('phone')}</label>
                    <label><span>Your email <small>(we send the code here)</small></span><input type="email" value={email} onChange={(e) => setEmail(e.target.value.replace(/\s/g, ''))} placeholder="you@example.com" maxLength={160} autoComplete="email" {...v.field('email')} />{v.error('email')}</label>
                    <label className="gc-wide"><span>Message <small>(optional)</small></span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Congratulations on your little one!" maxLength={600} {...v.field('note')} />{v.error('note')}</label>
                  </>}
                </div>
                {pay?.enabled ? (
                  <>
                    <BookingSummary value={value} to={squish(to)} charges={charges} min={min} />
                    <div className="gc-pay-row">
                      <button type="button" className="btn btn-dark" onClick={buy} disabled={busy}>
                        {busy ? 'Opening secure payment…' : `Pay ${total ? rupees(total) : ''} securely`}
                      </button>
                      <a className="gc-alt" href={waLink(requestText)} target="_blank" rel="noreferrer"><WhatsAppIcon size={16} /> or request on WhatsApp</a>
                    </div>
                    {payErr && <p className="gc-result bad" role="alert">{payErr}</p>}
                    <p className="gc-note">Pay by UPI, card, net banking or wallet through Razorpay. Your code appears here instantly. Valid for 12 months on any session.</p>
                  </>
                ) : (
                  <>
                    <a className="btn btn-dark" href={waLink(requestText)} target="_blank" rel="noreferrer"><WhatsAppIcon size={18} /> Request on WhatsApp</a>
                    <p className="gc-note">We'll confirm payment details on WhatsApp and send a personalised digital gift card with a unique code. Valid for 12 months on any session.</p>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <section className="section gc-steps">
        <div className="wrap">
          <div className="center-head" data-reveal><Label>How it works</Label><h2 className="h2">Three <em>little steps</em></h2><HeartDivider /></div>
          <ol className="steps">
            {[
              ['01', 'Choose & pay', pay?.enabled ? 'Pick an amount and pay securely online — or send us a WhatsApp message.' : 'Pick an amount and send us a WhatsApp message — we confirm payment the same day.'],
              ['02', 'Get your code', pay?.enabled ? 'Your unique gift card code appears instantly, ready to share on WhatsApp or print.' : 'A beautiful digital gift card with a unique code, ready to share or print.'],
              ['03', 'They book a session', 'The family books any session and enters the code — the value comes off their package.'],
            ].map(([n, t, d], i) => <li key={n} data-reveal style={{ '--d': `${i * 100}ms` }}><span className="step-n">{n}</span><h3>{t}</h3><p>{d}</p></li>)}
          </ol>
        </div>
      </section>

      <section className="section gc-check">
        <div className="wrap gc-check-inner" data-reveal>
          <Label>Received a gift card?</Label>
          <h2 className="h2">Check your <em>gift card</em></h2>
          <form className="gc-check-form" onSubmit={onCheck}>
            <input value={code} onChange={(e) => { setCode(e.target.value); setCheck(null); }} placeholder="BS-XXXX-XXXX" aria-label="Gift card code" autoCapitalize="characters" spellCheck="false" maxLength={14} {...vc.field('code')} onBlur={undefined} />
            <button className="btn btn-dark" disabled={check?.loading}>{check?.loading ? 'Checking…' : 'Check'}</button>
          </form>
          {vc.error('code')}
          {check?.error && <p className="gc-result bad">{check.error}</p>}
          {card && (
            <div className={`gc-result ${card.status === 'active' ? 'ok' : 'bad'}`}>
              {card.status === 'active' ? (
                <>
                  <b>{inr(card.amount)} gift card{card.recipientName ? ` for ${card.recipientName}` : ''}</b>
                  {card.expiresAt && <span>Valid until {fmt(card.expiresAt)}</span>}
                  <Link className="btn btn-gold" to={`/contact?gift=${encodeURIComponent(card.code)}#book`}>Book with this gift card</Link>
                </>
              ) : (
                <b>{card.status === 'redeemed' ? 'This gift card has already been used.' : 'This gift card has expired — message us and we’ll help.'}</b>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
