import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../components/Toast.jsx';
import { useDialog } from '../components/Dialog.jsx';

const time = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
const minsLeft = (d) => Math.max(1, Math.ceil((new Date(d) - Date.now()) / 60000));

/**
 * Admin → Login security. Lists everyone the login / sign-up limits are counting (blocked first) and lets the
 * studio unlock them. Counters live in the server's memory, so a restart also clears everything.
 */
export default function LoginSecurity({ call }) {
  const toast = useToast();
  const dialog = useDialog();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(() => call('/admin/security/blocks').then((d) => { setData(d); setErr(''); }).catch((e) => setErr(e.message)), [call]);
  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const unlock = async (b) => {
    setBusy(b.key + b.limiter);
    try {
      await call('/admin/security/blocks', { method: 'DELETE', body: { limiter: b.limiter, key: b.key } });
      toast({ title: 'Unlocked', message: `${b.email || b.ip} can try again now.` });
      await load();
    } catch (e) { toast({ type: 'error', title: 'Couldn’t unlock', message: e.message }); }
    finally { setBusy(''); }
  };
  const unlockAll = async () => {
    if (!(await dialog.confirm({ title: 'Unlock everyone?', message: 'All login and sign-up counters are cleared, including anyone who was blocked.', confirmLabel: 'Unlock everyone' }))) return;
    setBusy('all');
    try {
      const r = await call('/admin/security/blocks', { method: 'DELETE', body: {} });
      toast({ title: 'Everyone unlocked', message: `${r.cleared} counter${r.cleared === 1 ? '' : 's'} cleared.` });
      await load();
    } catch (e) { toast({ type: 'error', title: 'Couldn’t unlock', message: e.message }); }
    finally { setBusy(''); }
  };

  const rows = data?.blocks || [];
  const blocked = rows.filter((r) => r.blocked);

  return (
    <div>
      <div className="sec__top">
        <div>
          <h2>Login security</h2>
          <p className="muted small">
            To stop password guessing, logins and sign-ups are limited (for example 10 wrong admin passwords or 8 wrong
            customer passwords in 15 minutes). People who hit the limit are blocked until the time shown — or unlock them
            here. Correct logins never count.
          </p>
        </div>
        <div className="sec__btns">
          <button type="button" className="btn btn--ghost btn--sm" onClick={load}>Refresh</button>
          <button type="button" className="btn btn--primary btn--sm" onClick={unlockAll} disabled={!rows.length || busy === 'all'}>{busy === 'all' ? 'Unlocking…' : 'Unlock everyone'}</button>
        </div>
      </div>

      {err && <p className="note note--error">{err}</p>}
      {data && (
        <p className="sec__summary">
          {blocked.length ? <b className="sec__bad">{blocked.length} blocked</b> : <b className="sec__ok">No one is blocked</b>}
          {rows.length - blocked.length > 0 && <span className="muted"> · {rows.length - blocked.length} with recent failed attempts</span>}
        </p>
      )}

      {!data ? <p className="muted">Loading…</p> : rows.length === 0 ? (
        <p className="note">Nobody has failed a login recently.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Who</th><th>Where</th><th>Attempts</th><th>Status</th><th /></tr></thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.limiter + b.key} className={b.blocked ? 'sec__row--blocked' : ''}>
                  <td><strong>{b.email && b.email !== 'session' ? b.email : '—'}</strong><br /><small className="muted">{b.label}</small></td>
                  <td><code>{b.ip}</code></td>
                  <td>{b.attempts} / {b.limit}<br /><small className="muted">last {time(b.lastAt)}</small></td>
                  <td>{b.blocked ? <span className="sec__bad">Blocked · {minsLeft(b.unlocksAt)} min left</span> : <span className="muted">Clears at {time(b.unlocksAt)}</span>}</td>
                  <td><button type="button" className="btn btn--ghost btn--sm" onClick={() => unlock(b)} disabled={busy === b.key + b.limiter}>{busy === b.key + b.limiter ? '…' : b.blocked ? 'Unlock' : 'Reset'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="muted small sec__note">
        Locked out of this admin yourself? Restart the app (Hostinger → Web Apps → Restart) — that clears every block —
        or wait the time shown on the login screen.
      </p>
    </div>
  );
}
