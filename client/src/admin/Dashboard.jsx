import { useEffect, useState } from 'react';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const ago = (d) => {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.round(s / 86400)} d ago`;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

/** Admin home: what needs attention today + the numbers that matter. */
export default function Dashboard({ call, go }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    const safe = (p, fb) => call(p).catch(() => fb);
    Promise.all([
      safe('/admin/inquiries', []), safe('/admin/gift-cards', []), safe('/admin/invites', { invitations: [] }),
      safe('/admin/client-galleries', []), safe('/admin/applications', []),
    ]).then(([inq, gifts, inv, gals, apps]) => setD({ inq, gifts, inv: inv.invitations || [], gals, apps }));
  }, [call]);

  if (!d) return <div className="dash"><p className="muted">Loading your studio…</p></div>;

  const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0);
  const newInq = d.inq.filter((i) => i.status === 'new');
  const monthInq = d.inq.filter((i) => new Date(i.createdAt) >= month);
  const booked = d.inq.filter((i) => i.status === 'booked').length;
  const activeGifts = d.gifts.filter((g) => g.displayStatus === 'active');
  const onlineSales = d.gifts.filter((g) => g.source === 'online' && new Date(g.createdAt) >= month).reduce((s, g) => s + g.amount, 0);
  const liveInv = d.inv.filter((i) => i.status === 'published');
  const rsvpGuests = d.inv.reduce((s, i) => s + (i.stats?.guests || 0), 0);
  const pendingWishes = d.inv.reduce((s, i) => s + (i.stats?.pendingWishes || 0), 0);
  const inviteOrders = d.inq.filter((i) => i.eventType === 'Digital Invitation' && i.status === 'new').length;
  const newApps = d.apps.filter((a) => a.status === 'new').length;

  const todo = [
    newInq.length && { k: 'inquiries', t: `${newInq.length} new ${newInq.length === 1 ? 'enquiry' : 'enquiries'} to reply to`, s: inviteOrders ? `${inviteOrders} for digital invitations` : 'Reply the same day to win the booking' },
    pendingWishes && { k: 'invitations', t: `${pendingWishes} ${pendingWishes === 1 ? 'blessing' : 'blessings'} waiting for approval`, s: 'On your published invitations' },
    d.inv.filter((i) => i.status === 'preview' && !i.clientApprovedAt).length && { k: 'invitations', t: `${d.inv.filter((i) => i.status === 'preview' && !i.clientApprovedAt).length} invitation preview(s) awaiting client approval`, s: 'Follow up with the couple' },
    newApps && { k: 'applications', t: `${newApps} new job ${newApps === 1 ? 'application' : 'applications'}`, s: 'Review portfolios' },
  ].filter(Boolean);

  const kpis = [
    { k: 'inquiries', label: 'New enquiries', value: newInq.length, sub: `${monthInq.length} this month · ${booked} booked`, tone: newInq.length ? 'hot' : '' },
    { k: 'giftcards', label: 'Gift cards active', value: activeGifts.length, sub: `${inr(activeGifts.reduce((s, g) => s + g.amount, 0))} outstanding` },
    { k: 'giftcards', label: 'Online sales this month', value: inr(onlineSales), sub: 'Gift cards paid via Razorpay' },
    { k: 'invitations', label: 'Invitations live', value: liveInv.length, sub: `${d.inv.length} total · ${rsvpGuests} guests attending` },
    { k: 'galleries', label: 'Client galleries', value: d.gals.length, sub: 'Private photo deliveries' },
  ];

  return (
    <div className="dash">
      <div className="dash__hello">
        <div>
          <p className="dash__k">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h2>{greet()} <em>✦</em></h2>
          <p className="muted">Here’s what’s happening at Guide Studio.</p>
        </div>
        <div className="dash__quick">
          <button className="btn btn--primary btn--sm" onClick={() => go('invitations')}>+ New invitation</button>
          <button className="btn btn--ghost btn--sm" onClick={() => go('giftcards')}>+ Gift card</button>
          <button className="btn btn--ghost btn--sm" onClick={() => go('galleries')}>+ Client gallery</button>
        </div>
      </div>

      <div className="dash__kpis">
        {kpis.map((x) => (
          <button key={x.label} className={`dash__kpi ${x.tone ? `is-${x.tone}` : ''}`} onClick={() => go(x.k)}>
            <span>{x.label}</span>
            <b>{x.value}</b>
            <small>{x.sub}</small>
          </button>
        ))}
      </div>

      <div className="dash__cols">
        <section className="dash__card">
          <header><h3>Needs your attention</h3></header>
          {todo.length === 0 ? <p className="dash__empty">All caught up ✨</p> : (
            <ul className="dash__todo">
              {todo.map((t) => (
                <li key={t.t}><button onClick={() => go(t.k)}><span className="dash__dot" /><span><b>{t.t}</b><small>{t.s}</small></span><i>→</i></button></li>
              ))}
            </ul>
          )}
        </section>

        <section className="dash__card">
          <header><h3>Latest enquiries</h3><button className="link-btn" onClick={() => go('inquiries')}>View all</button></header>
          {d.inq.length === 0 ? <p className="dash__empty">No enquiries yet.</p> : (
            <ul className="dash__list">
              {d.inq.slice(0, 6).map((i) => (
                <li key={i._id}>
                  <span className="dash__avatar">{(i.name || '?')[0].toUpperCase()}</span>
                  <span className="dash__who"><b>{i.name}</b><small>{i.eventType || 'Enquiry'}{i.eventDate ? ` · ${new Date(i.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}</small></span>
                  <span className={`dash__chip is-${i.status}`}>{i.status}</span>
                  <small className="muted">{ago(i.createdAt)}</small>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {d.inv.length > 0 && (
        <section className="dash__card">
          <header><h3>Invitations</h3><button className="link-btn" onClick={() => go('invitations')}>Manage</button></header>
          <ul className="dash__invs">
            {d.inv.slice(0, 4).map((i) => (
              <li key={i._id}>
                <span className="dash__thumb" style={i.coverPhoto ? { backgroundImage: `url(${i.coverPhoto})` } : undefined} />
                <span className="dash__who"><b>{i.partner1} &amp; {i.partner2}</b><small>{i.status} · {i.views || 0} views · {i.stats?.guests || 0} guests</small></span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
