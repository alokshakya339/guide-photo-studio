import { useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api.js';

export const rupees = (paise) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100);

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

let scriptPromise;
function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  scriptPromise ||= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error('Could not load the payment window. Check your connection and try again.'));
    };
    document.body.appendChild(s);
  });
  return scriptPromise;
}

/**
 * Runs the full subscribe flow for a gallery:
 * create subscription → Razorpay Checkout (or test-mode confirm) → server-side verification.
 */
export function useSubscribe(slug, token, { clientName } = {}) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [mock, setMock] = useState(null); // pending test-mode payment

  async function verify(body) {
    return api(`/client-galleries/${slug}/subscribe/verify`, { method: 'POST', token, body });
  }

  async function subscribe(planCode) {
    setError('');
    setBusy(planCode);
    try {
      const sub = await api(`/client-galleries/${slug}/subscribe`, { method: 'POST', token, body: { plan: planCode } });
      if (sub.mode === 'mock') {
        // Resolved by the TestPaymentDialog below.
        return await new Promise((resolve, reject) => setMock({ sub, resolve, reject }));
      }
      await loadRazorpay();
      return await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: sub.keyId,
          subscription_id: sub.subscriptionId,
          name: 'Guide Photo Studio',
          description: `Gallery hosting · ${sub.plan.name}`,
          image: `${window.location.origin}/images/brand/favicon.png`,
          prefill: { name: clientName || '' },
          notes: { gallery: slug },
          theme: { color: '#cf0000' },
          handler: (resp) => verify(resp).then(resolve, reject),
          modal: { ondismiss: () => reject(new Error('Payment was cancelled')) },
        });
        rzp.on('payment.failed', (r) => reject(new Error(r?.error?.description || 'Payment failed')));
        rzp.open();
      });
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setBusy(null);
    }
  }

  const testDialog = mock && createPortal(
    <div className="modal" role="dialog" aria-modal="true" aria-label="Test payment">
      <div className="modal__card">
        <span className="badge">Test mode</span>
        <h3>Simulate payment</h3>
        <p className="muted">
          Razorpay keys aren’t configured, so this is a test. No money is charged.
          <br />
          Plan: <strong>{mock.sub.plan.name}</strong> · {rupees(mock.sub.plan.amount)} / {mock.sub.plan.period === 'yearly' ? 'year' : 'month'}
          {mock.sub.startsAt && <><br />First charge on {fmtDate(mock.sub.startsAt)} (after your free period).</>}
        </p>
        <div className="modal__actions">
          <button className="btn btn--ghost" onClick={() => { mock.reject(new Error('Payment was cancelled')); setMock(null); }}>
            Cancel
          </button>
          <button
            className="btn btn--primary"
            onClick={() => {
              const m = mock;
              setMock(null);
              verify({ razorpay_subscription_id: m.sub.subscriptionId }).then(m.resolve, m.reject);
            }}
          >
            Pay (test)
          </button>
        </div>
      </div>
    </div>,
    document.body
  );

  return { subscribe, busy, error, setError, testDialog };
}

export function PlanCards({ plans, onChoose, busy, cta = 'Subscribe' }) {
  return (
    <div className="plans">
      {plans.map((p) => (
        <div key={p.code} className={`plan ${p.period === 'yearly' ? 'plan--best' : ''}`}>
          {p.period === 'yearly' && <span className="badge">Best value</span>}
          <h3>{p.name}</h3>
          <p className="plan__price">
            {rupees(p.amount)} <small>/ {p.period === 'yearly' ? 'year' : 'month'}</small>
          </p>
          {p.description && <p className="muted small">{p.description}</p>}
          <ul className="ticks">
            {p.features?.map((f) => <li key={f}>{f}</li>)}
          </ul>
          <button className={`btn ${p.period === 'yearly' ? 'btn--primary' : 'btn--ghost'}`} disabled={!!busy} onClick={() => onChoose(p.code)}>
            {busy === p.code ? 'Opening…' : cta}
          </button>
        </div>
      ))}
    </div>
  );
}
