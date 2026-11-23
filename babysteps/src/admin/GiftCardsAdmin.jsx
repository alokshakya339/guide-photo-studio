import { useEffect, useState } from 'react';
import { askConfirm } from './confirm.jsx';
import { useValidation } from '../useValidation.jsx';
import { checkAmount, checkName, checkPhone, checkEmail, checkText, formatPhone, squish } from '../validation.js';

const GC_RULES = {
  amount: (v) => checkAmount(v, { min: 100, max: 500000 }),
  recipientName: (v) => checkName(v, { required: false, label: 'the recipient’s name' }),
  recipientPhone: (v) => checkPhone(v, { required: false }),
  senderName: (v) => checkName(v, { required: false, label: 'the buyer’s name' }),
  recipientEmail: (v) => checkEmail(v),
  message: (v) => checkText(v, { max: 600 }),
};
import { api } from '../api.js';

const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const digits = (p) => { const d = String(p || '').replace(/\D/g, ''); return d.length === 10 ? `91${d}` : d; };
const shareText = (g) => [
  `🎁 ${g.recipientName ? `Hi ${g.recipientName.split(' ')[0]}! ` : ''}You've received a BabySteps photography gift card${g.senderName ? ` from ${g.senderName}` : ''}!`,
  '',
  `Value: ${inr(g.amount)}`,
  `Code: ${g.code}`,
  `Valid until: ${fmt(g.expiresAt)}`,
  g.message && `\n"${g.message}"`,
  '',
  `Book your session: ${window.location.origin}/contact?gift=${g.code}#book`,
].filter((x) => x !== undefined && x !== false && x !== null).join('\n');

/** Create and track photography gift cards. */
export default function GiftCardsAdmin({ token }) {
  const [list, setList] = useState(null);
  const [form, setForm] = useState({ amount: '5000', recipientName: '', recipientPhone: '', recipientEmail: '', senderName: '', message: '', validMonths: '12' });
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState('');
  const [payCfg, setPayCfg] = useState(null);
  const [paySaving, setPaySaving] = useState(false);
  useEffect(() => { api('/admin/payment-settings', { token }).then(setPayCfg).catch(() => {}); }, [token]);
  const togglePayments = async (on) => {
    setPaySaving(true);
    try { setPayCfg(await api('/admin/payment-settings', { method: 'PUT', token, body: { razorpayEnabled: on } })); }
    catch (e) { setErr(e.message); } finally { setPaySaving(false); }
  };
  const [rates, setRates] = useState(null); // editable copy of payCfg.charges
  useEffect(() => { if (payCfg?.charges) setRates({ ...payCfg.charges, minAmount: payCfg.minAmount ?? 500 }); }, [payCfg]);
  const ratesChanged = rates && payCfg?.charges && (['gstPercent', 'platformFeePercent', 'platformFeeFlat'].some((k) => Number(rates[k]) !== payCfg.charges[k]) || Number(rates.minAmount) !== payCfg.minAmount);
  const saveRates = async () => {
    setPaySaving(true); setErr('');
    try {
      const { minAmount, ...rest } = rates;
      const charges = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, Number(v) || 0]));
      const min = Math.round(Number(minAmount));
      if (!(min >= 1 && min <= 200000)) throw new Error('Minimum gift card amount must be between ₹1 and ₹2,00,000.');
      setPayCfg(await api('/admin/payment-settings', { method: 'PUT', token, body: { charges, minAmount: min } }));
    } catch (e) { setErr(e.message); } finally { setPaySaving(false); }
  };
  const example = rates && (() => {
    const base = 500000; const fee = Math.round(base * (Number(rates.platformFeePercent) || 0) / 100) + Math.round((Number(rates.platformFeeFlat) || 0) * 100);
    const gst = Math.round((base + fee) * (Number(rates.gstPercent) || 0) / 100);
    return `A ₹5,000 card → buyer pays ₹${((base + fee + gst) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })} (fee ₹${(fee / 100).toLocaleString('en-IN')}, GST ₹${(gst / 100).toLocaleString('en-IN')}).`;
  })();

  const load = () => api('/admin/gift-cards', { token }).then(setList).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const gv = useValidation(GC_RULES);
  const create = async (e) => {
    e.preventDefault();
    setErr('');
    if (!gv.check(form, e.currentTarget)) return;
    try {
      const body = {
        ...form, amount: Number(String(form.amount).replace(/[₹,\s]/g, '')), validMonths: Number(form.validMonths),
        recipientName: squish(form.recipientName), senderName: squish(form.senderName), recipientEmail: form.recipientEmail.trim(),
        recipientPhone: form.recipientPhone ? formatPhone(form.recipientPhone) : '', message: form.message.trim(),
      };
      await api('/admin/gift-cards', { method: 'POST', token, body });
      setCreating(false);
      setForm((f) => ({ ...f, recipientName: '', recipientPhone: '', recipientEmail: '', senderName: '', message: '' }));
      load();
    } catch (e2) { setErr(e2.message); }
  };
  const patch = async (g, body, confirmText) => {
    if (confirmText && !(await askConfirm(confirmText))) return;
    await api(`/admin/gift-cards/${g._id}`, { method: 'PATCH', token, body }).catch((e) => setErr(e.message));
    load();
  };
  const remove = async (g) => {
    if (!(await askConfirm({ title: `Delete ${g.code}?`, message: "The gift card is removed for good and the code stops working. This can't be undone.", confirmLabel: 'Delete', danger: true }))) return;
    await api(`/admin/gift-cards/${g._id}`, { method: 'DELETE', token }).catch((e) => setErr(e.message));
    load();
  };
  const copy = async (g) => { try { await navigator.clipboard.writeText(shareText(g)); setCopied(g._id); setTimeout(() => setCopied(''), 2000); } catch { /* ignore */ } };

  const active = (list || []).filter((g) => g.displayStatus === 'active');
  return (
    <>
      {payCfg && (
        <div className="ad-pay-card">
          <label className="ad-switch">
            <input type="checkbox" checked={payCfg.razorpayEnabled} disabled={paySaving} onChange={(e) => togglePayments(e.target.checked)} /><span />
            Online payments (Razorpay) {payCfg.razorpayEnabled ? 'ON' : 'OFF'}
          </label>
          <p className="ad-pay-note">
            {!payCfg.keysSet ? '⚠️ Razorpay keys are not set in server/.env — the website shows WhatsApp only.'
              : payCfg.razorpayEnabled ? `Customers can pay for gift cards on the website${payCfg.testMode ? ' (TEST mode — no real money)' : ''}.`
              : 'Turned off — the website shows "Request on WhatsApp" only.'}
          </p>
        </div>
      )}
      {rates && (
        <div className="ad-panel" style={{ marginBottom: 16 }}>
          <h4 className="ad-h4 first">Online checkout charges</h4>
          <p className="ad-note">Added on top of the gift-card value and shown in the buyer's booking summary. The card itself keeps its full value.</p>
          <div className="ad-grid ad-pay-grid">
            <label className="ad-field"><span className="ad-label">GST %</span><input className="ad-input" type="number" min="0" max="28" step="0.01" value={rates.gstPercent} onChange={(e) => setRates((r) => ({ ...r, gstPercent: e.target.value }))} /><small className="ad-help">Charged on card value + platform fee. 0 = no GST line.</small></label>
            <label className="ad-field"><span className="ad-label">Platform fee %</span><input className="ad-input" type="number" min="0" max="10" step="0.01" value={rates.platformFeePercent} onChange={(e) => setRates((r) => ({ ...r, platformFeePercent: e.target.value }))} /><small className="ad-help">Of the card value (Razorpay charges ≈2%).</small></label>
            <label className="ad-field"><span className="ad-label">Platform fee, fixed ₹</span><input className="ad-input" type="number" min="0" max="1000" step="1" value={rates.platformFeeFlat} onChange={(e) => setRates((r) => ({ ...r, platformFeeFlat: e.target.value }))} /><small className="ad-help">Added per order, e.g. ₹20. 0 = none.</small></label>
            <label className="ad-field"><span className="ad-label">Minimum card value ₹</span><input className="ad-input" type="number" min="1" max="200000" step="1" value={rates.minAmount} onChange={(e) => setRates((r) => ({ ...r, minAmount: e.target.value }))} /><small className="ad-help">Smallest amount buyers can choose online. Preset buttons below this are hidden.</small></label>
          </div>
          <div className="ad-row-actions ad-pay-save" style={{ alignItems: 'center' }}>
            <button className="ad-btn primary" onClick={saveRates} disabled={!ratesChanged || paySaving}>{paySaving ? 'Saving…' : 'Save settings'}</button>
            <span className="ad-note" style={{ margin: 0 }}>{example}</span>
          </div>
        </div>
      )}
      <div className="ad-gal-toolbar ad-gc-bar">
        <p className="ad-note" style={{ flex: 1, margin: 0 }}>{list ? `${active.length} active · ${inr(active.reduce((s, g) => s + g.amount, 0))} outstanding` : ''}</p>
        <button className="ad-btn primary" onClick={() => setCreating((c) => !c)}>{creating ? 'Cancel' : '+ New gift card'}</button>
      </div>
      {err && <p className="ad-error">{err}</p>}

      {creating && (
        <form className="ad-panel" onSubmit={create} style={{ marginBottom: 18 }} noValidate>
          <div className="ad-grid">
            <label className="ad-field"><span className="ad-label">Amount (₹) *</span><input inputMode="numeric" value={form.amount} onChange={set('amount')} required  maxLength={8} {...gv.field('amount', 'ad-input')} />{gv.error('amount')}</label>
            <label className="ad-field"><span className="ad-label">Valid for</span>
              <select className="ad-input" value={form.validMonths} onChange={set('validMonths')}><option value="6">6 months</option><option value="12">12 months</option><option value="24">24 months</option></select></label>
            <label className="ad-field"><span className="ad-label">For (recipient)</span><input value={form.recipientName} onChange={set('recipientName')} placeholder="Riya & Karan"  maxLength={60} {...gv.field('recipientName', 'ad-input')} />{gv.error('recipientName')}</label>
            <label className="ad-field"><span className="ad-label">Recipient WhatsApp</span><input value={form.recipientPhone} onChange={set('recipientPhone')} inputMode="tel" placeholder="98xxxxxxxx"  maxLength={18} {...gv.field('recipientPhone', 'ad-input')} />{gv.error('recipientPhone')}</label>
            <label className="ad-field"><span className="ad-label">From (buyer)</span><input value={form.senderName} onChange={set('senderName')} placeholder="Aunt Meera"  maxLength={60} {...gv.field('senderName', 'ad-input')} />{gv.error('senderName')}</label>
            <label className="ad-field"><span className="ad-label">Recipient email</span><input type="email" value={form.recipientEmail} onChange={set('recipientEmail')}  maxLength={160} {...gv.field('recipientEmail', 'ad-input')} />{gv.error('recipientEmail')}</label>
            <label className="ad-field wide"><span className="ad-label">Personal message</span><textarea rows={2} value={form.message} onChange={set('message')} placeholder="Congratulations on your little one!"  maxLength={600} {...gv.field('message', 'ad-input')} />{gv.error('message')}</label>
          </div>
          <div className="ad-row-actions" style={{ marginTop: 14 }}><button className="ad-btn primary">Create gift card</button></div>
        </form>
      )}

      {list == null ? <p className="ad-note">Loading…</p> : list.length === 0 ? (
        <div className="ad-panel ad-empty"><p>No gift cards yet. Create one when someone buys a gift — it gets a unique code like <code>BS-K7P2-9QXM</code>.</p></div>
      ) : (
        <div className="ad-list">
          {list.map((g) => (
            <div key={g._id} className="ad-item ad-gc">
              <div className="ad-item-head ad-gc-head">
                <span className="ad-gc-main">
                  <span className="ad-gc-top">
                    <code className="ad-gc-code">{g.code}</code>
                    <span className={`ad-badge gc-${g.displayStatus}`}>{g.displayStatus}</span>
                  </span>
                  <span className="ad-item-title">{inr(g.amount)}{g.recipientName ? ` · ${g.recipientName}` : ''}</span>
                  <span className="ad-gc-sub">
                    {g.status === 'redeemed' ? `Redeemed ${fmt(g.redeemedAt)}` : `Valid until ${fmt(g.expiresAt)}`}
                    {g.source === 'online' && <span title={g.paymentId ? `Razorpay ${g.paymentId}` : undefined}> · 💳 Paid online{g.senderName ? ` by ${g.senderName}` : ''}{g.senderPhone ? ` · ${g.senderPhone}` : ''}</span>}
                  </span>
                </span>
                <span className="ad-item-tools ad-gc-tools">
                  {g.recipientPhone && <a className="ad-btn" href={`https://wa.me/${digits(g.recipientPhone)}?text=${encodeURIComponent(shareText(g))}`} target="_blank" rel="noreferrer">Send</a>}
                  <button className="ad-btn" onClick={() => copy(g)}>{copied === g._id ? 'Copied ✓' : 'Copy'}</button>
                  {g.status === 'active' && <button className="ad-btn" onClick={() => patch(g, { status: 'redeemed' }, { title: `Redeem ${g.code}?`, message: `Mark this ${inr(g.amount)} gift card${g.recipientName ? ` for ${g.recipientName}` : ''} as used for a booking. The customer will see it as redeemed. You can undo this later.`, confirmLabel: 'Mark as redeemed' })}>Redeem</button>}
                  {g.status === 'redeemed' && <button className="ad-btn ghost" onClick={() => patch(g, { status: 'active' })}>Undo</button>}
                  {g.status === 'active' && <button className="ad-btn ghost" onClick={() => patch(g, { status: 'cancelled' }, { title: `Cancel ${g.code}?`, message: 'The code will stop working on the website and in bookings.', confirmLabel: 'Cancel gift card', cancelLabel: 'Keep it', danger: true })}>Cancel</button>}
                  <button className="ad-icon-btn danger" onClick={() => remove(g)} aria-label="Delete">×</button>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
