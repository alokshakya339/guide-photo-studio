import { useEffect, useState } from 'react';
import { api } from '../api.js';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const ago = (d) => {
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 60) return `${Math.max(1, m)} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  const days = Math.round(m / 1440);
  return days === 1 ? 'yesterday' : `${days} days ago`;
};
const dayLabel = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const STATUS = { new: 'New', contacted: 'Contacted', booked: 'Booked', closed: 'Closed' };
const BADGE = { new: 'warn', booked: 'ok', closed: '' };
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

/** 30 days of enquiries: one series, so no legend — the card title names it. Tap / hover a bar for its value. */
function DailyBars({ daily }) {
  const [hot, setHot] = useState(null);
  const max = Math.max(1, ...daily.map((d) => d.n));
  const total = daily.reduce((t, d) => t + d.n, 0);
  const shown = hot ?? daily.length - 1;
  return (
    <figure className="ad-dash-chart" aria-label={`Enquiries per day over the last 30 days: ${total} in total.`}>
      <div className="ad-dash-chart-read" aria-live="polite">
        <b>{daily[shown].n}</b> {daily[shown].n === 1 ? 'enquiry' : 'enquiries'} · {hot === null ? 'today' : dayLabel(daily[shown].day)}
      </div>
      <div className="ad-dash-bars" onMouseLeave={() => setHot(null)} style={{ '--max': max }}>
        {daily.map((d, i) => (
          <button
            key={d.day} type="button" className={`ad-dash-bar ${i === hot ? 'on' : ''}`}
            onMouseEnter={() => setHot(i)} onFocus={() => setHot(i)} onClick={() => setHot(i === hot ? null : i)}
            aria-label={`${dayLabel(d.day)}: ${d.n}`}
          >
            <span style={{ height: d.n ? `${Math.max(6, (d.n / max) * 100)}%` : '0' }} />
          </button>
        ))}
      </div>
      <div className="ad-dash-axis"><span>{dayLabel(daily[0].day)}</span><span>{dayLabel(daily[14].day)}</span><span>Today</span></div>
    </figure>
  );
}

export default function Dashboard({ token, go }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const load = () => api('/admin/dashboard', { token }).then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (err) return <p className="ad-error">{err} <button className="ad-btn" onClick={() => { setErr(''); load(); }}>Try again</button></p>;
  if (!d) return <div className="ad-dash-skeleton" aria-busy="true"><span /><span /><span /><span /></div>;

  const { enquiries: e, galleries: g, giftCards: c } = d;
  const fresh = e.counts.new || 0;
  return (
    <div className="ad-dash">
      <p className="ad-dash-hello">{greeting()} 👋 {fresh ? <>You have <b>{fresh} new enquir{fresh === 1 ? 'y' : 'ies'}</b> waiting.</> : 'No new enquiries waiting — all caught up.'}</p>

      <div className="ad-dash-stats">
        <button className={`ad-dash-stat ${fresh ? 'alert' : ''}`} onClick={() => go('enquiries')}>
          <small>New enquiries</small><b>{fresh}</b><span>{e.last7} this week · {e.last30} in 30 days</span>
        </button>
        <button className="ad-dash-stat" onClick={() => go('enquiries')}>
          <small>Booked</small><b>{e.counts.booked || 0}</b><span>of {e.total} enquiries{e.total ? ` · ${Math.round(((e.counts.booked || 0) / e.total) * 100)}%` : ''}</span>
        </button>
        <button className="ad-dash-stat" onClick={() => go('galleries')}>
          <small>Live galleries</small><b>{g.active}</b><span>{g.photos.toLocaleString('en-IN')} photos · {g.expired} expired</span>
        </button>
        <button className="ad-dash-stat" onClick={() => go('giftcards')}>
          <small>Active gift cards</small><b>{c.active}</b><span>{inr(c.activeValue)} outstanding{c.onlineSales30 ? ` · ${c.onlineSales30} sold online (30d)` : ''}</span>
        </button>
      </div>

      <div className="ad-dash-grid">
        <section className="ad-panel ad-dash-card wide">
          <header><h3>Enquiries · last 30 days</h3><button className="ad-link" onClick={() => go('enquiries')}>Open enquiries →</button></header>
          <DailyBars daily={e.daily} />
        </section>

        <section className="ad-panel ad-dash-card">
          <header><h3>Latest enquiries</h3><button className="ad-link" onClick={() => go('enquiries')}>All →</button></header>
          {e.recent.length === 0 ? <p className="ad-note">Nothing yet — they appear when someone uses the booking form.</p> : (
            <ul className="ad-dash-list">
              {e.recent.map((i) => (
                <li key={i._id}>
                  <div><b>{i.name}</b><small>{i.session || 'Session not chosen'} · {ago(i.createdAt)}</small></div>
                  <span className={`ad-badge ${BADGE[i.status] ?? ''}`}>{STATUS[i.status] || i.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="ad-panel ad-dash-card">
          <header><h3>Galleries needing attention</h3><button className="ad-link" onClick={() => go('galleries')}>Galleries →</button></header>
          {g.picks.length === 0 && g.expiring.length === 0 ? <p className="ad-note">Nothing to do — no new album picks and no gallery closes in the next 2 weeks.</p> : (
            <ul className="ad-dash-list">
              {g.picks.map((x) => (
                <li key={`p-${x.slug}`}>
                  <div><b>{x.clientName}</b><small>{x.title} · picked {x.favorites} photo{x.favorites === 1 ? '' : 's'} · {ago(x.at)}</small></div>
                  <span className="ad-badge ok">Picks in</span>
                </li>
              ))}
              {g.expiring.map((x) => (
                <li key={`e-${x.slug}`}>
                  <div><b>{x.clientName}</b><small>{x.title}</small></div>
                  <span className="ad-badge warn">{x.daysLeft === 0 ? 'Closes today' : `${x.daysLeft} day${x.daysLeft === 1 ? '' : 's'} left`}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="ad-panel ad-dash-card wide">
          <header><h3>Quick actions</h3></header>
          <div className="ad-dash-actions">
            <button className="ad-btn primary" onClick={() => go('galleries')}>＋ New client gallery</button>
            <button className="ad-btn" onClick={() => go('giftcards')}>🎁 Create gift card</button>
            <button className="ad-btn" onClick={() => go('blog')}>📝 Write a blog post</button>
            <button className="ad-btn" onClick={() => go('hero')}>🌅 Edit home banner</button>
            <a className="ad-btn" href="/" target="_blank" rel="noreferrer">View website ↗</a>
          </div>
        </section>
      </div>
    </div>
  );
}
