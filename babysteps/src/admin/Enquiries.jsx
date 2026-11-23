import { useEffect, useMemo, useState } from 'react';
import { askConfirm } from './confirm.jsx';
import { api } from '../api.js';

const STATUSES = [['new', 'New'], ['contacted', 'Contacted'], ['booked', 'Booked'], ['closed', 'Closed']];
const when = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const digits = (p) => { const d = String(p || '').replace(/\D/g, ''); return d.length === 10 ? `91${d}` : d; };

/** Booking enquiries saved from the website form. */
export default function Enquiries({ token }) {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const [err, setErr] = useState('');
  const [testing, setTesting] = useState('');
  const testEmail = async () => {
    setTesting('Sending…');
    try { await api('/admin/email/test', { method: 'POST', token }); setTesting('Sent ✓ — check your inbox (and spam)'); } catch (e) { setTesting(''); setErr(e.message); }
  };

  const load = () => api('/admin/inquiries', { token }).then(setData).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const items = useMemo(() => (data?.items || [])
    .filter((i) => !filter || i.status === filter)
    .filter((i) => !q || `${i.name} ${i.phone} ${i.email} ${i.session} ${i.message}`.toLowerCase().includes(q.toLowerCase())), [data, filter, q]);

  const update = async (i, patch) => {
    setData((d) => ({ ...d, items: d.items.map((x) => (x._id === i._id ? { ...x, ...patch } : x)) }));
    try { await api(`/admin/inquiries/${i._id}`, { method: 'PATCH', token, body: patch }); if (patch.status) load(); } catch (e) { setErr(e.message); load(); }
  };
  const remove = async (i) => {
    if (!(await askConfirm({ title: 'Delete this enquiry?', message: `The enquiry from ${i.name} will be deleted for good.`, confirmLabel: 'Delete', danger: true }))) return;
    await api(`/admin/inquiries/${i._id}`, { method: 'DELETE', token }).catch((e) => setErr(e.message));
    load();
  };
  const exportCsv = () => {
    const cols = ['createdAt', 'status', 'name', 'phone', 'email', 'session', 'package', 'babyAge', 'preferredDate', 'giftCode', 'message', 'notes'];
    const csv = [cols.join(','), ...(data?.items || []).map((i) => cols.map((c) => `"${String(i[c] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `babysteps-enquiries-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (!data) return <div className="ad-panel"><p className="ad-note">{err || 'Loading enquiries…'}</p></div>;
  const counts = data.counts || {};

  return (
    <>
      <div className="ad-gal-toolbar ad-enq-bar">
        <input className="ad-input" type="search" enterKeyHint="search" placeholder="Search name, phone, session…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search enquiries" />
        <button className="ad-btn" onClick={exportCsv} disabled={!data.items.length} title="Download all enquiries as a spreadsheet (CSV)">⬇ <span className="ad-hide-sm">Export </span>CSV</button>
      </div>
      <div className="ad-subtabs ad-enq-tabs" role="tablist" aria-label="Filter by status">
        <button className={!filter ? 'on' : ''} onClick={() => setFilter('')}>All <small>{data.items.length}</small></button>
        {STATUSES.map(([k, l]) => <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l} <small>{counts[k] || 0}</small></button>)}
      </div>
      {data.emailAlerts
        ? <p className="ad-note ad-enq-alert">📧 Email alerts on → <b>{data.notifyEmail}</b> ({data.emailProvider}) · <button className="link-btn" onClick={testEmail}>{testing || 'Send test email'}</button></p>
        : <p className="ad-note ad-enq-alert">💡 Get an email for every new enquiry: add <code>BREVO_API_KEY</code> (+ <code>BREVO_SMTP_LOGIN</code>) and <code>EMAIL_FROM</code> — or SMTP settings — to the server environment.</p>}
      {err && <p className="ad-error">{err}</p>}
      {items.length === 0 ? (
        <div className="ad-panel ad-empty"><p>{data.items.length ? 'No enquiries match.' : 'No enquiries yet — they appear here when someone uses the booking form.'}</p></div>
      ) : (
        <div className="ad-list">
          {items.map((i) => (
            <div key={i._id} className={`ad-item ${open === i._id ? 'open' : ''}`}>
              <div className="ad-item-head">
                <button className="ad-item-toggle ad-enq-toggle" onClick={() => setOpen(open === i._id ? null : i._id)} aria-expanded={open === i._id}>
                  <span className="ad-enq-main">
                    <span className="ad-item-title">{i.name}</span>
                    <span className="ad-enq-sub">{[i.session, i.package, when(i.createdAt)].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className={`ad-badge st-${i.status}`}>{i.status}</span>
                </button>
                <span className="ad-item-tools">
                  <a className="ad-icon-btn" href={`https://wa.me/${digits(i.phone)}`} target="_blank" rel="noreferrer" title="WhatsApp">💬</a>
                  <a className="ad-icon-btn" href={`tel:${i.phone}`} title="Call">📞</a>
                </span>
              </div>
              {open === i._id && (
                <div className="ad-item-body">
                  <dl className="ad-creds" style={{ gridColumn: '1 / -1' }}>
                    {[['Phone', i.phone], ['Email', i.email], ['Session', i.session], ['Package', i.package], ["Baby's age / week", i.babyAge],
                      ['Preferred date', i.preferredDate], ['Gift card', i.giftCode], ['Message', i.message]].filter(([, v]) => v)
                      .map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
                  </dl>
                  <label className="ad-field">
                    <span className="ad-label">Status</span>
                    <select className="ad-input" value={i.status} onChange={(e) => update(i, { status: e.target.value })}>
                      {STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </label>
                  <label className="ad-field wide">
                    <span className="ad-label">Notes (only you see these)</span>
                    <textarea className="ad-input" rows={3} defaultValue={i.notes} onBlur={(e) => e.target.value !== i.notes && update(i, { notes: e.target.value })} placeholder="Called on…, quoted…, booked for…" />
                  </label>
                  <div className="ad-row-actions" style={{ gridColumn: '1 / -1' }}>
                    {i.email && <a className="ad-btn" href={`mailto:${i.email}`}>Email</a>}
                    <button className="ad-btn ghost danger" onClick={() => remove(i)}>Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
