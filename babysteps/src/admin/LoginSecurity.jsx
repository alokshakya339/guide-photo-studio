import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { askConfirm } from './confirm.jsx';

const time = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
const minsLeft = (d) => Math.max(1, Math.ceil((new Date(d) - Date.now()) / 60000));

/**
 * Admin → Login security. Everyone the login limits are counting (admin + client-gallery logins), blocked first,
 * with Unlock / Unlock everyone. Counters live in the server's memory, so restarting the app also clears them.
 */
export default function LoginSecurity({ token }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(() => api('/admin/security/blocks', { token }).then((d) => { setData(d); setErr(''); }).catch((e) => setErr(e.message)), [token]);
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);

  const unlock = async (b) => {
    setBusy(b.limiter + b.key);
    try {
      await api('/admin/security/blocks', { method: 'DELETE', token, body: { limiter: b.limiter, key: b.key } });
      setMsg(`Unlocked ${who(b)} — they can try again now.`); await load();
    } catch (e) { setErr(e.message); } finally { setBusy(''); }
  };
  const unlockAll = async () => {
    if (!(await askConfirm({ title: 'Unlock everyone?', message: 'All login counters are cleared, including anyone who was blocked.', confirmLabel: 'Unlock everyone' }))) return;
    setBusy('all');
    try { const r = await api('/admin/security/blocks', { method: 'DELETE', token, body: {} }); setMsg(`Everyone unlocked (${r.cleared} cleared).`); await load(); }
    catch (e) { setErr(e.message); } finally { setBusy(''); }
  };
  const who = (b) => (b.email ? b.email.replace(/^gallery: /, 'gallery “') + (b.email.startsWith('gallery: ') ? '”' : '') : b.ip);

  const rows = data?.blocks || [];
  const blocked = rows.filter((r) => r.blocked);

  return (
    <section className="ad-panel">
      <div className="ad-gal-toolbar">
        <p className="ad-note" style={{ margin: 0, flex: 1 }}>
          {data ? (blocked.length ? <b style={{ color: '#b4472f' }}>{blocked.length} blocked</b> : <b style={{ color: '#3f7a4a' }}>No one is blocked</b>) : 'Loading…'}
          {rows.length - blocked.length > 0 && <> · {rows.length - blocked.length} with recent failed attempts</>}
        </p>
        <button className="ad-btn ghost" onClick={load}>Refresh</button>
        <button className="ad-btn primary" onClick={unlockAll} disabled={!rows.length || busy === 'all'}>{busy === 'all' ? 'Unlocking…' : 'Unlock everyone'}</button>
      </div>
      {err && <p className="ad-note" style={{ color: '#b4472f' }}>{err}</p>}
      {msg && <p className="ad-note">✓ {msg}</p>}

      {data && rows.length === 0 && <p className="ad-note">Nobody has failed a login recently.</p>}
      {rows.length > 0 && (
        <div className="ad-sec-list">
          {rows.map((b) => (
            <div key={b.limiter + b.key} className={`ad-sec-row ${b.blocked ? 'is-blocked' : ''}`}>
              <div>
                <b>{who(b)}</b>
                <small>{b.label} · {b.ip}</small>
              </div>
              <div><b>{b.attempts} / {b.limit}</b><small>last {time(b.lastAt)}</small></div>
              <div>{b.blocked ? <b className="ad-sec-bad">Blocked · {minsLeft(b.unlocksAt)} min left</b> : <small>Clears at {time(b.unlocksAt)}</small>}</div>
              <button className="ad-btn" onClick={() => unlock(b)} disabled={busy === b.limiter + b.key}>{busy === b.limiter + b.key ? '…' : b.blocked ? 'Unlock' : 'Reset'}</button>
            </div>
          ))}
        </div>
      )}

      <p className="ad-note" style={{ marginTop: 18 }}>
        Locked out of this admin yourself? Restart the app (Hostinger → Web Apps → Restart) — that clears every block — or wait the time shown on the login screen.
      </p>
    </section>
  );
}
