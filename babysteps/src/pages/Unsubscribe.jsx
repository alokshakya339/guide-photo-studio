import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { Label, usePage } from '../lib.jsx';

/** /unsubscribe/:token — the link at the bottom of every newsletter email. Needs a click, so link scanners can't unsubscribe people. */
export default function Unsubscribe() {
  usePage('Email preferences', 'Manage your BabySteps emails.');
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (token === 'preview') { setInfo({ email: 'you@example.com', status: 'subscribed', preview: true }); return; }
    api(`/newsletter/unsubscribe/${encodeURIComponent(token)}`).then(setInfo).catch((e) => setErr(e.message));
  }, [token]);

  const change = async (action) => {
    if (info?.preview) { setInfo({ ...info, status: action === 'unsubscribe' ? 'unsubscribed' : 'subscribed' }); return; }
    setBusy(true); setErr('');
    try { const r = await api(`/newsletter/${action}/${encodeURIComponent(token)}`, { method: 'POST' }); setInfo({ ...info, status: r.status }); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <section className="section unsub">
      <div className="wrap unsub-card">
        <Label>Email preferences</Label>
        {!info && !err && <p>Loading…</p>}
        {err && !info && <><h1 className="h2">Link not <em>found</em></h1><p>{err}</p></>}
        {info?.status === 'subscribed' && (
          <>
            <h1 className="h2">Unsubscribe from <em>BabySteps emails?</em></h1>
            <p>You'll stop receiving our letters at <b>{info.email}</b>. Booking confirmations and gift-card emails are not affected.</p>
            <div className="unsub-actions">
              <button className="btn btn-gold" onClick={() => change('unsubscribe')} disabled={busy}>{busy ? 'One moment…' : 'Yes, unsubscribe me'}</button>
              <Link className="btn btn-line" to="/">Keep me subscribed</Link>
            </div>
          </>
        )}
        {info?.status === 'unsubscribed' && (
          <>
            <h1 className="h2">You're <em>unsubscribed</em></h1>
            <p><b>{info.email}</b> won't receive our letters any more. We'll miss you!</p>
            <div className="unsub-actions">
              <button className="btn btn-line" onClick={() => change('resubscribe')} disabled={busy}>Oops — subscribe me again</button>
              <Link className="btn btn-gold" to="/">Back to the website</Link>
            </div>
          </>
        )}
        {err && info && <p className="footer-news-err">{err}</p>}
      </div>
    </section>
  );
}
