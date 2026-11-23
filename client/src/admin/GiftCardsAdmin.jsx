import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../components/Toast.jsx';
import { useDialog } from '../components/Dialog.jsx';

const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const waDigits = (p) => { const d = String(p || '').replace(/\D/g, ''); return d.length === 10 ? `91${d}` : d; };
const METHOD = { card: 'Card', netbanking: 'Netbanking', upi: 'UPI', wallet: 'Wallet', emi: 'EMI', paylater: 'Pay later' };
const fmtTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');
const EMPTY = { amount: '5000', validMonths: '12', recipientName: '', recipientPhone: '', recipientEmail: '', senderName: '', message: '' };
const shareText = (g) => [
  `🎁 ${g.recipientName ? `Hi ${g.recipientName.split(' ')[0]}! ` : ''}You've received a Guide Photo Studio gift card${g.senderName ? ` from ${g.senderName}` : ''}!`,
  '', `Value: ${inr(g.amount)}`, `Code: ${g.code}`, `Valid until: ${fmt(g.expiresAt)}`,
  g.message ? `\n"${g.message}"` : '', '', `Book your shoot: ${window.location.origin}/contact?gift=${g.code}`,
].join('\n');

/** Admin → Gift cards: online payments switch, create cards by hand, redeem / cancel / delete. */
export default function GiftCardsAdmin({ call }) {
  const toast = useToast();
  const dialog = useDialog();
  const [list, setList] = useState(null);
  const [cfg, setCfg] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [creating, setCreating] = useState(false);
  const [errs, setErrs] = useState({});
  const [msg, setMsg] = useState('');

  const load = useCallback(() => call('/admin/gift-cards').then(setList).catch((e) => setMsg(e.message)), [call]);
  useEffect(() => { load(); call('/admin/gift-cards/settings').then(setCfg).catch(() => {}); }, [load, call]);
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrs((x) => ({ ...x, [k]: '' })); };

  async function togglePayments(on) {
    try { setCfg(await call('/admin/gift-cards/settings', { method: 'PUT', body: { onlinePayments: on } })); toast({ title: on ? 'Online payments turned on' : 'Online payments turned off', message: on ? 'Customers can pay for gift cards on the website.' : 'The Gift Cards page now shows “Request on WhatsApp” only.' }); }
    catch (e) { setMsg(e.message); }
  }
  async function create(e) {
    e.preventDefault(); setMsg(''); setErrs({});
    try {
      const g = await call('/admin/gift-cards', { method: 'POST', body: form });
      toast({ title: `Gift card ${g.code} created`, message: `${inr(g.amount)}${g.recipientName ? ` for ${g.recipientName}` : ''}` });
      setForm(EMPTY); setCreating(false); load();
    } catch (err) { setErrs(err.data?.fields || {}); setMsg(err.message); }
  }
  async function patch(g, status) {
    const asks = {
      redeemed: { title: `Redeem ${g.code}?`, message: `Mark this ${inr(g.amount)} gift card${g.recipientName ? ` for ${g.recipientName}` : ''} as used for a booking. You can undo this later.`, confirmLabel: 'Mark as redeemed' },
      cancelled: { title: `Cancel ${g.code}?`, message: 'The code will stop working on the website and in enquiries.', confirmLabel: 'Cancel gift card', cancelLabel: 'Keep it', tone: 'danger' },
    };
    if (asks[status] && !(await dialog.confirm(asks[status]))) return;
    try { await call(`/admin/gift-cards/${g._id}`, { method: 'PATCH', body: { status } }); load(); } catch (e) { setMsg(e.message); }
  }
  async function remove(g) {
    if (!(await dialog.confirm({ title: `Delete ${g.code}?`, message: 'The gift card is removed for good and the code stops working. This can’t be undone.', tone: 'danger', confirmLabel: 'Delete' }))) return;
    await call(`/admin/gift-cards/${g._id}`, { method: 'DELETE' }).catch((e) => setMsg(e.message));
    load();
  }
  const copyId = async (id) => { try { await navigator.clipboard.writeText(id); toast({ title: 'Transaction ID copied', message: id }); } catch { /* ignore */ } };
  const copy = async (g) => { try { await navigator.clipboard.writeText(shareText(g)); toast({ title: 'Copied', message: 'Gift card message copied — paste it anywhere.' }); } catch { /* ignore */ } };

  const active = (list || []).filter((g) => g.displayStatus === 'active');
  const field = (k, label, props = {}) => (
    <label className="form-field">
      <span>{label}</span>
      <input value={form[k]} onChange={set(k)} aria-invalid={errs[k] ? true : undefined} {...props} />
      {errs[k] && <small className="form__err">{errs[k]}</small>}
    </label>
  );

  return (
    <div className="gca">
      <h2>Gift cards</h2>
      <p className="muted small">Codes look like <code>GS-XXXX-XXXX</code>. Customers can buy online on the Gift Cards page, check a code, and enter it on the enquiry form.</p>

      {cfg && (
        <div className="gca__switch">
          <label className="gca__toggle">
            <input type="checkbox" checked={cfg.onlinePayments} onChange={(e) => togglePayments(e.target.checked)} />
            <span aria-hidden="true" />
            <b>Online payments (Razorpay) {cfg.onlinePayments ? 'ON' : 'OFF'}</b>
          </label>
          <small className="muted">
            {!cfg.keysSet ? '⚠️ Razorpay keys are not set in server/.env — the website shows WhatsApp only.'
              : cfg.onlinePayments ? `Customers can pay on the website${cfg.testMode ? ' (TEST mode — no real money)' : ''}.` : 'Turned off — the website shows “Request on WhatsApp” only.'}
            {!cfg.emailOn && ' · ⚠️ Email is not configured, so codes are not emailed.'}
          </small>
        </div>
      )}

      <div className="gca__bar">
        <p className="muted">{list ? `${active.length} active · ${inr(active.reduce((s, g) => s + g.amount, 0))} outstanding` : ''}</p>
        <button className="btn btn--primary btn--sm" onClick={() => setCreating((c) => !c)}>{creating ? 'Close' : '+ New gift card'}</button>
      </div>
      {msg && <p className="note note--error">{msg}</p>}

      {creating && (
        <form className="panel gca__form" onSubmit={create} noValidate>
          <div className="gca__grid">
            {field('amount', 'Amount (₹) *', { inputMode: 'numeric', maxLength: 8 })}
            <label className="form-field"><span>Valid for</span>
              <select value={form.validMonths} onChange={set('validMonths')}><option value="6">6 months</option><option value="12">12 months</option><option value="24">24 months</option></select>
            </label>
            {field('recipientName', 'For (recipient)', { placeholder: 'Riya & Karan', maxLength: 60 })}
            {field('recipientPhone', 'Recipient WhatsApp', { placeholder: '98765 43210', inputMode: 'tel', maxLength: 18 })}
            {field('senderName', 'From (buyer)', { placeholder: 'Aunt Meera', maxLength: 60 })}
            {field('recipientEmail', 'Recipient email', { type: 'email', maxLength: 160 })}
          </div>
          <label className="form-field"><span>Personal message</span><textarea rows={2} value={form.message} onChange={set('message')} maxLength={600} placeholder="Congratulations to you both!" /></label>
          <button className="btn btn--primary btn--sm">Create gift card</button>
        </form>
      )}

      {!list ? <p className="muted">Loading…</p> : list.length === 0 ? (
        <p className="note">No gift cards yet. Create one when someone buys a gift by hand, or turn on online payments above.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Status</th><th>Code</th><th>Amount</th><th>For / from</th><th>Payment</th><th>Valid until</th><th /></tr></thead>
            <tbody>
              {list.map((g) => (
                <tr key={g._id}>
                  <td><span className={`gca__badge is-${g.displayStatus}`}>{g.displayStatus}</span></td>
                  <td><code>{g.code}</code></td>
                  <td>{inr(g.amount)}</td>
                  <td>{g.recipientName || '—'}{g.senderName && <><br /><small className="muted">from {g.senderName}{g.senderPhone ? ` · ${g.senderPhone}` : ''}</small></>}</td>
                  <td className="gca__pay">
                    {g.payment ? (
                      <>
                        <span className="gca__txn">
                          <code title="Razorpay payment (transaction) ID">{g.payment.paymentId}</code>
                          <button className="link-btn" onClick={() => copyId(g.payment.paymentId)} aria-label="Copy transaction ID">Copy</button>
                        </span>
                        <small className="muted">
                          💳 {METHOD[g.payment.method] || g.payment.method || 'Online'}{g.payment.methodDetail ? ` · ${g.payment.methodDetail}` : ''} · {fmtTime(g.payment.paidAt)}
                          {g.payment.mode === 'test' && <span className="gca__test">TEST</span>}
                        </small>
                        <small className="muted">Order <code>{g.payment.orderId}</code></small>
                        <a className="link-btn" href={`https://dashboard.razorpay.com/app/payments/${g.payment.paymentId}`} target="_blank" rel="noreferrer">View in Razorpay ↗</a>
                      </>
                    ) : <small className="muted">Created by hand</small>}
                  </td>
                  <td>{g.status === 'redeemed' ? `Redeemed ${fmt(g.redeemedAt)}` : fmt(g.expiresAt)}</td>
                  <td className="gca__actions">
                    {g.recipientPhone && <a className="link-btn" href={`https://wa.me/${waDigits(g.recipientPhone)}?text=${encodeURIComponent(shareText(g))}`} target="_blank" rel="noreferrer">Send</a>}
                    <button className="link-btn" onClick={() => copy(g)}>Copy</button>
                    {g.status === 'active' && <button className="link-btn" onClick={() => patch(g, 'redeemed')}>Redeem</button>}
                    {g.status === 'redeemed' && <button className="link-btn" onClick={() => patch(g, 'active')}>Undo</button>}
                    {g.status === 'active' && <button className="link-btn" onClick={() => patch(g, 'cancelled')}>Cancel</button>}
                    <button className="link-btn" onClick={() => remove(g)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
