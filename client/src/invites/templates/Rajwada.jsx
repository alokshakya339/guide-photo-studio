import { useEffect, useMemo, useRef, useState } from 'react';
import { Countdown, MusicToggle, Film, Rsvp, Wishes, Share, fmtDate, mapLink } from '../parts.jsx';
import { Tilt, useOpening, useParallax, waLink } from '../three.jsx';
import { Petals } from './Royal.jsx';

/**
 * Rajwada Royal — maroon damask, gold and blush florals, caparisoned elephants.
 * Flow: palace doors open in 3D → full-screen photo with the names → scrolls unroll for the bride & groom →
 * "Reveal the date" slot plaques → arched window + story frames hanging on a string → arch-shaped event
 * cards on maroon → torn-paper edge → compliments + notes scrolls → quick links → sunset footer.
 * All artwork is original inline SVG.
 */

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** true once the element has scrolled into view (stays true). */
function useSeen(threshold = 0.35) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return undefined;
    if (!('IntersectionObserver' in window) || reduced()) { setSeen(true); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [seen, threshold]);
  return [ref, seen];
}

/* ---------------- artwork ---------------- */
const Flower = ({ x, y, r = 8, c = '#eea9b8' }) => (
  <g transform={`translate(${x} ${y})`}>
    {[0, 60, 120, 180, 240, 300].map((a) => <ellipse key={a} cx="0" cy={-r * 0.6} rx={r * 0.45} ry={r * 0.7} fill={c} stroke="#c97a8e" strokeWidth="0.6" transform={`rotate(${a})`} />)}
    <circle r={r * 0.3} fill="#e6b85c" />
  </g>
);

const Sprig = ({ className = '' }) => (
  <svg className={`rjw-sprig ${className}`} viewBox="0 0 60 120" aria-hidden="true">
    <path d="M30 116C30 92 29 62 30 22" stroke="#b8893a" strokeWidth="1.6" fill="none" />
    <path d="M30 80C22 74 16 66 14 56M30 60C38 54 44 46 46 36" stroke="#b8893a" strokeWidth="1.2" fill="none" />
    {[[24, 96, -35], [36, 88, 35], [22, 72, -30], [38, 74, 30], [25, 46, -25], [35, 52, 25]].map(([x, y, a], i) => <ellipse key={i} cx={x} cy={y} rx="3.2" ry="8" fill="#7f9a5a" transform={`rotate(${a} ${x} ${y})`} />)}
    <Flower x={30} y={16} r={11} /><Flower x={14} y={54} r={7} /><Flower x={46} y={34} r={7} />
    <path d="M22 116c4-6 12-6 16 0-5 3-11 3-16 0Z" fill="#c9973f" />
  </svg>
);

const Lotus = ({ className = '' }) => (
  <svg className={`rjw-lotus ${className}`} viewBox="0 0 160 90" aria-hidden="true">
    <path d="M30 60C40 70 56 74 72 72M130 60C120 70 104 74 88 72" stroke="#7f9a5a" strokeWidth="1.4" fill="none" />
    <path d="M80 66c-14-8-34-10-52-2 16 10 36 10 52 2Z M80 66c14-8 34-10 52-2-16 10-36 10-52 2Z" fill="#e08a5a" stroke="#d9a54a" strokeWidth="1.2" />
    <path d="M80 64c-6-20-20-34-40-38 2 22 18 36 40 38Z M80 64c6-20 20-34 40-38-2 22-18 36-40 38Z" fill="#c2413a" stroke="#d9a54a" strokeWidth="1.5" />
    <path d="M80 8c14 16 14 40 0 56-14-16-14-40 0-56Z" fill="#a8262f" stroke="#d9a54a" strokeWidth="1.5" />
    <path d="M80 30c5 8 5 18 0 26-5-8-5-18 0-26Z" fill="#f3c58a" />
    <path d="M44 78h72" stroke="#d9a54a" strokeWidth="1.5" />
    <Flower x={18} y={58} r={8} /><Flower x={142} y={58} r={8} /><Flower x={34} y={24} r={6} /><Flower x={126} y={24} r={6} />
  </svg>
);

const LotusRule = ({ className = '' }) => (
  <svg className={`rjw-rule ${className}`} viewBox="0 0 220 30" aria-hidden="true">
    <path d="M12 18h70M138 18h70" stroke="#d9a54a" strokeWidth="1.2" />
    <circle cx="7" cy="18" r="2" fill="#d9a54a" /><circle cx="213" cy="18" r="2" fill="#d9a54a" />
    <path d="M86 18c4-6 10-8 14-6M134 18c-4-6-10-8-14-6" stroke="#d9a54a" fill="none" />
    <path d="M110 24c-4-8-12-12-22-12 2 9 10 13 22 12ZM110 24c4-8 12-12 22-12-2 9-10 13-22 12Z" fill="#e98aa0" stroke="#d9a54a" />
    <path d="M110 2c6 7 6 15 0 22-6-7-6-15 0-22Z" fill="#f2a7b5" stroke="#d9a54a" />
  </svg>
);

/** Caparisoned elephant with a howdah, facing right (flip to face left). */
const Elephant = ({ flip = false, className = '' }) => (
  <svg className={`rjw-elephant ${flip ? 'is-flip' : ''} ${className}`} viewBox="0 0 132 120" aria-hidden="true">
    <g className="rjw-elephant__body">
      <path d="M23 56c-6 4-8 12-6 18" stroke="#b8893a" strokeWidth="1.4" fill="none" />
      {[30, 44, 76, 90].map((x, i) => <rect key={x} x={x} y="78" width="12" height="32" rx="5" fill={i % 2 ? '#e9dfcc' : '#f7f0e3'} stroke="#b8893a" />)}
      {[30, 44, 76, 90].map((x) => <rect key={`a${x}`} x={x} y="101" width="12" height="4" fill="#d9a54a" />)}
      <path d="M22 70C18 50 30 38 52 36h34c14 0 24 10 24 26v16c0 6-4 10-10 10H32c-6 0-9-6-10-18Z" fill="#f7f0e3" stroke="#b8893a" />
      <path d="M96 40c14-8 30 0 30 18 0 8-3 14-7 18-1 12-3 24-10 32-2 2-6 1-5-2 5-9 6-18 5-27l-11-7Z" fill="#f7f0e3" stroke="#b8893a" />
      <path d="M100 46c-8 6-8 22 2 28 8-4 10-18 4-28Z" fill="#efe4d0" stroke="#b8893a" />
      <path d="M112 77c4 2 8 2 11 0" stroke="#fffaf0" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="117" cy="54" r="1.7" fill="#3a2414" />
      <path d="M106 42c6-4 14-4 18 2-6 2-12 2-18-2Z" fill="#a8262f" stroke="#d9a54a" />
      <path d="M38 40h50l-3 34c-12 8-34 8-45 0Z" fill="#8c1d2c" stroke="#d9a54a" strokeWidth="2" />
      <path d="M45 46h37l-2 24c-10 5-25 5-33 0Z" fill="none" stroke="#d9a54a" strokeDasharray="2 3" />
      <circle cx="63" cy="58" r="6" fill="#d9a54a" /><circle cx="63" cy="58" r="3" fill="#8c1d2c" />
      {[42, 52, 63, 74, 84].map((x) => <circle key={x} cx={x} cy={x === 63 ? 82 : 78} r="2.2" fill="#d9a54a" />)}
      <path d="M42 38h42v-6H42Z" fill="#d9a54a" />
      {[46, 61.5, 77].map((x) => <rect key={x} x={x} y="16" width="3" height="16" fill="#d9a54a" />)}
      <path d="M49 22h28v10H49Z" fill="#a8262f" opacity=".9" />
      <path d="M40 17c6-14 40-14 46 0Z" fill="#c9973f" stroke="#a8782a" />
      <path d="M40 17h46" stroke="#a8782a" strokeWidth="2" />
      <path d="M63 2l3 5-3 4-3-4Z" fill="#d9a54a" />
    </g>
  </svg>
);

/** Wedding mandap scene for the event cards; drape colour comes from --drape. */
const Mandap = () => (
  <svg className="rjw-mandap" viewBox="0 0 200 120" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    <path d="M24 108h152v8H24Z" fill="#eadbbb" /><path d="M38 104h124v4H38Z" fill="#cfb488" />
    {[48, 78, 122, 152].map((x) => <rect key={x} x={x - 3} y="40" width="6" height="64" fill="#d9a54a" stroke="#a8782a" strokeWidth=".6" />)}
    <path d="M51 40c4 30 18 40 24 64h-8c-4-18-14-34-16-64Z" className="is-drape" />
    <path d="M149 40c-4 30-18 40-24 64h8c4-18 14-34 16-64Z" className="is-drape" />
    <path d="M38 40h124l-6-10H44Z" fill="#c9973f" />
    <path d="M44 30c20-22 92-22 112 0Z" fill="#f4e2bd" stroke="#c9973f" />
    <path d="M100 4l3 6-3 5-3-5Z" fill="#d9a54a" />
    <path d="M48 44q15 12 30 0q22 14 44 0q15 12 30 0" stroke="#f0a33a" strokeWidth="3" fill="none" strokeDasharray="1 3" strokeLinecap="round" />
    {[60, 72, 100, 128, 140].map((x) => <line key={x} x1={x} y1="46" x2={x} y2="66" stroke="#f0a33a" strokeWidth="2.4" strokeDasharray="1 3" strokeLinecap="round" />)}
    <path d="M92 104h16l-2-8h-12Z" fill="#a8782a" />
    <path className="rjw-mandap__fire" d="M100 82c4 4 4 9 0 13-4-4-4-9 0-13Z" fill="#ffb347" />
    <Flower x={28} y={98} r={7} /><Flower x={172} y={98} r={7} />
  </svg>
);

const PinIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s7-7.1 7-12.2A7 7 0 0 0 5 9.8C5 14.9 12 22 12 22Z" fill="none" stroke="currentColor" strokeWidth="1.6" /><circle cx="12" cy="10" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>;
const CalIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M4 10h16M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" /><path d="M12 13.2c-.9-1-2.6-.5-2.6.9 0 1.3 2.6 3 2.6 3s2.6-1.7 2.6-3c0-1.4-1.7-1.9-2.6-.9Z" fill="currentColor" /></svg>;
const ChatIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.4-4A8 8 0 1 1 8 18.6Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M9 9.5c.4 2.2 2.3 4.1 4.5 4.5l1-1.2 1.8.8-.4 1.6c-3.6.3-7.4-3.4-7-7l1.6-.4.8 1.8Z" fill="currentColor" /></svg>;

const ymd = (d) => d.replace(/-/g, '');
const gcal = (inv, e) => {
  const next = new Date(`${e.date}T00:00:00`); next.setDate(next.getDate() + 1);
  const where = [e.venue, e.address].filter(Boolean).join(', ');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`${e.name} · ${inv.partner1} & ${inv.partner2}`)}&dates=${ymd(e.date)}/${next.toISOString().slice(0, 10).replace(/-/g, '')}&location=${encodeURIComponent(where)}&details=${encodeURIComponent(window.location.href.split('?')[0])}`;
};

/* ---------------- pieces ---------------- */
const Rod = () => <span className="rjw-rod" aria-hidden="true"><i /><i /></span>;

/** Maroon scroll that unrolls when it scrolls into view. */
function RollScroll({ children, className = '' }) {
  const [ref, seen] = useSeen(0.45);
  return (
    <div ref={ref} className={`rjw-scroll ${seen ? 'is-open' : ''} ${className}`}>
      <Rod />
      <div className="rjw-scroll__sheet"><div className="rjw-scroll__clip"><div className="rjw-scroll__inner">{children}<LotusRule /></div></div></div>
      <Rod />
      <Sprig className="rjw-scroll__sprig" />
    </div>
  );
}

const Head = ({ k, t, light = false }) => (
  <div className={`rjw-head ${light ? 'is-light' : ''}`} data-inv-reveal>
    {k && <p className="rjw-k">{k}</p>}
    <h2 className="rjw-h2">{t}</h2>
    <LotusRule />
  </div>
);

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** Three plaques that spin like a slot machine and land on the wedding date. */
function DateReveal({ date, lux }) {
  const d = new Date(`${date}T00:00:00`);
  const finals = [String(d.getDate()).padStart(2, '0'), MONTHS[d.getMonth()], String(d.getFullYear())];
  const [on, setOn] = useState(false);
  const reels = useMemo(() => {
    const y = d.getFullYear();
    const pools = [Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')), MONTHS, Array.from({ length: 9 }, (_, i) => String(y - 4 + i))];
    return finals.map((f, i) => ['', ...Array.from({ length: 12 + i * 4 }, (_, k) => pools[i][(k * 7 + i * 5 + 3) % pools[i].length]), f]);
  }, [date]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={`rjw-date ${on ? 'is-on' : ''}`}>
      <Lotus className="rjw-date__lotus" />
      <div className="rjw-date__row">
        <Elephant className="rjw-date__ele" />
        <div className="rjw-date__plaques">
          {['Date', 'Month', 'Year'].map((label, i) => (
            <div key={label} className="rjw-plaque" style={{ '--i': i, '--n': reels[i].length }}>
              <span className="rjw-plaque__tab">{label}</span>
              <div className="rjw-plaque__win" aria-hidden="true">
                <div className="rjw-plaque__face">
                  <div className="rjw-plaque__reel">{reels[i].map((v, k) => <b key={k}>{v}</b>)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <Elephant flip className="rjw-date__ele" />
      </div>
      <p className="rjw-sr" aria-live="polite">{on ? fmtDate(date) : ''}</p>
      {on ? (
        <p className="rjw-date__full">{fmtDate(date)}</p>
      ) : (
        <button type="button" className="rjw-pill" onClick={() => setOn(true)}>Reveal the date</button>
      )}
      {on && lux && <Petals count={18} />}
    </div>
  );
}

/** Story frames hanging from a rail: photos alternate with short notes. Swipe or use the arrows. */
function Frames({ inv }) {
  const track = useRef(null);
  const photos = [inv.couplePhoto, ...(inv.gallery || [])].filter(Boolean);
  const items = [];
  let p = 0;
  (inv.timeline || []).forEach((t) => {
    if (photos[p]) items.push({ type: 'photo', src: photos[p++], cap: `#${String(t.title || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')}` });
    items.push({ type: 'text', ...t });
  });
  while (p < photos.length) items.push({ type: 'photo', src: photos[p++] });
  if (!items.length) return null;
  const go = (dir) => { const el = track.current; if (el) el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.6), behavior: reduced() ? 'auto' : 'smooth' }); };
  return (
    <div className="rjw-frames">
      <div className="rjw-frames__track" ref={track} tabIndex={0} aria-label="Our story — scroll sideways">
        {items.map((it, i) => (
          <figure key={i} className={`rjw-frame is-${it.type}`} style={{ '--sw': `${((i % 3) - 1) * 1.4 || 1}deg`, '--dl': `${-i * 0.9}s` }}>
            <span className="rjw-frame__hang" aria-hidden="true" />
            <div className="rjw-frame__box">
              {it.type === 'photo' ? (
                <><img src={it.src} alt="" loading="lazy" draggable="false" />{it.cap && it.cap.length > 1 && <figcaption>{it.cap}</figcaption>}</>
              ) : (
                <div className="rjw-frame__note">
                  {it.year && <span>{it.year}</span>}
                  {it.title && <b>{it.title}</b>}
                  {it.text && <p>{it.text}</p>}
                </div>
              )}
            </div>
          </figure>
        ))}
      </div>
      <div className="rjw-frames__nav">
        <button type="button" onClick={() => go(-1)} aria-label="Previous">‹</button>
        <button type="button" onClick={() => go(1)} aria-label="Next">›</button>
      </div>
    </div>
  );
}

/* ---------------- theme ---------------- */
export default function Rajwada({ inv, slug, token, preview }) {
  const { f, lux, opened, leaving, open, playing, setPlaying } = useOpening(inv, 2400);
  const root = useRef(null);
  useParallax(root, opened);
  useEffect(() => {
    if (!opened) return undefined;
    const els = [...document.querySelectorAll('.rjw [data-inv-reveal]:not([data-in])')];
    if (!('IntersectionObserver' in window) || reduced()) { els.forEach((e) => e.setAttribute('data-in', '')); return undefined; }
    const io = new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) { e.target.setAttribute('data-in', ''); io.unobserve(e.target); } }), { threshold: 0.12 });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [opened]);

  const c = inv.couple || {};
  const draft = inv.preview && inv.status !== 'published';
  const short = fmtDate(inv.weddingDate, { day: 'numeric', month: 'long', year: 'numeric' });
  const events = inv.events || [];
  const main = events.find((e) => e.date === inv.weddingDate) || events[events.length - 1];
  const notes = [
    ...events.filter((e) => e.note).map((e) => `${e.name}: ${e.note}`),
    inv.rsvpEnabled && inv.rsvpDeadline ? `Kindly RSVP by ${fmtDate(inv.rsvpDeadline, { day: 'numeric', month: 'long' })}.` : '',
    inv.hashtag ? `Share your pictures with ${inv.hashtag}` : '',
  ].filter(Boolean);
  const person = (n) => ({ name: inv[`partner${n}`], parents: c[`p${n}Parents`], bio: c[`p${n}Bio`] });

  return (
    <div ref={root} className={`rjw ${leaving || opened ? 'is-in' : ''}`}>
      {!opened && (
        <div className={`rjw-gate ${leaving ? 'is-opening' : ''}`} role="dialog" aria-label="Open the invitation">
          <div className="rjw-door is-l"><Sprig className="rjw-door__sprig" /><Elephant className="rjw-door__ele" /></div>
          <div className="rjw-door is-r"><Sprig className="rjw-door__sprig" /><Elephant flip className="rjw-door__ele" /></div>
          <div className="rjw-gate__card">
            <p className="rjw-gate__om">॥ श्री गणेशाय नमः ॥</p>
            <LotusRule />
            <p className="rjw-gate__text">{inv.families || 'With the blessings of the Almighty and our elders, we cordially invite you and your family to grace the wedding of'}</p>
            <p className="rjw-gate__names">{inv.partner1} <i>&amp;</i> {inv.partner2}</p>
            {short && <p className="rjw-gate__date">{short}</p>}
            <button type="button" className="rjw-pill" onClick={open}>Tap to open{inv.music ? ' ♪' : ''}</button>
          </div>
        </div>
      )}

      <MusicToggle src={inv.music} title={inv.musicTitle} playing={playing} setPlaying={setPlaying} />

      {/* Scene with names */}
      <header className="rjw-hero">
        <div className="rjw-hero__scene">{inv.coverPhoto && <img src={inv.coverPhoto} alt="" />}</div>
        <div className="rjw-hero__veil" />
        <div className="rjw-hero__names" aria-label={`${inv.partner1} weds ${inv.partner2}`}>
          <span className="is-1" aria-hidden="true">{inv.partner1}</span>
          <span className="is-amp" aria-hidden="true">weds</span>
          <span className="is-2" aria-hidden="true">{inv.partner2}</span>
          {short && <span className="is-date" aria-hidden="true">{short}{inv.city ? ` · ${inv.city}` : ''}</span>}
        </div>
        <div className="rjw-hero__base"><Rod /></div>
      </header>

      {/* Bride & groom scrolls */}
      <section className="rjw-paper rjw-sec">
        {inv.headline && <p className="rjw-lead" data-inv-reveal>{inv.partner1} &amp; {inv.partner2} {inv.headline}</p>}
        {[1, 2].map((n) => {
          const p = person(n);
          return (
            <RollScroll key={n}>
              <p className="rjw-scroll__k">{n === 1 ? 'The bride' : 'The groom'}</p>
              <h3 className="rjw-scroll__name">{p.name}</h3>
              {p.parents && <p className="rjw-scroll__par">{p.parents}</p>}
              {p.bio && <p className="rjw-scroll__bio">{p.bio}</p>}
            </RollScroll>
          );
        })}
      </section>

      {/* Date reveal */}
      {inv.weddingDate && (
        <section className="rjw-paper rjw-sec rjw-sec--date">
          <Head k="Save the date" t="The auspicious day" />
          <DateReveal date={inv.weddingDate} lux={lux} />
          {f.countdown && <div className="rjw-count" data-inv-reveal><Countdown date={inv.weddingDate} /></div>}
        </section>
      )}

      {/* Arched window + story frames */}
      {(inv.couplePhoto || inv.timeline?.length > 0 || inv.gallery?.length > 0) && (
        <section className="rjw-paper rjw-sec rjw-sec--story">
          {inv.coverPhoto && <div className="rjw-window" data-inv-reveal><img src={inv.gallery?.[0] || inv.coverPhoto} alt="" loading="lazy" /></div>}
          <Head k="Our story" t="How it all began" />
          <Frames inv={inv} />
        </section>
      )}

      {/* Events on maroon */}
      {events.length > 0 && (
        <section className="rjw-events" id="events">
          <Head k="The celebrations" t="Join us for" light />
          <div className="rjw-arches">
            {events.map((e, i) => (
              <div key={`${e.name}-${i}`} className="rjw-arches__cell" data-inv-reveal style={{ '--d': `${(i % 4) * 110}ms` }}>
                <Tilt as="article" className="rjw-arch" max={7}>
                  <div className="rjw-arch__in">
                    <div className="rjw-arch__art" style={{ '--drape': e.colors?.[1] || e.colors?.[0] || ['#e8b04a', '#d76a7a', '#a8262f', '#c9973f'][i % 4] }}><Mandap /></div>
                    <div className="rjw-arch__body">
                      <h3>{e.name}</h3>
                      {(e.venue || e.address) && (
                        <div className="rjw-arch__venue">
                          <p><b>{e.venue}</b>{e.address && <span>{e.address}</span>}</p>
                          {mapLink(e) && <a className="rjw-arch__pin" href={mapLink(e)} target="_blank" rel="noreferrer" aria-label={`Directions to ${e.venue || e.name}`}><PinIcon /></a>}
                        </div>
                      )}
                      {(e.dressCode || e.colors?.length > 0) && (
                        <p className="rjw-arch__dress"><span>Attire</span>{e.dressCode}
                          {e.colors?.length > 0 && <span className="anc-swatches" aria-label="Dress-code colours">{e.colors.map((col) => <i key={col} style={{ background: col }} title={col} />)}</span>}
                        </p>
                      )}
                      <p className="rjw-arch__when">
                        <span>{e.date ? fmtDate(e.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
                        <span>{e.time}</span>
                      </p>
                      {e.date && <a className="rjw-arch__cal" href={gcal(inv, e)} target="_blank" rel="noreferrer">Add to calendar</a>}
                    </div>
                  </div>
                </Tilt>
              </div>
            ))}
          </div>
          <div className="rjw-torn" aria-hidden="true" />
        </section>
      )}

      {/* Compliments + notes */}
      {(inv.family?.length > 0 || notes.length > 0) && (
        <section className="rjw-paper rjw-sec">
          {inv.family?.length > 0 && (
            <RollScroll>
              <h3 className="rjw-scroll__title">With best compliments from</h3>
              <ul className="rjw-scroll__list">
                {inv.family.map((m, i) => <li key={i}>{m.name}{m.relation && <span> ({m.relation})</span>}</li>)}
              </ul>
            </RollScroll>
          )}
          {notes.length > 0 && (
            <RollScroll>
              <h3 className="rjw-scroll__title">A few notes</h3>
              <ul className="rjw-scroll__list is-notes">{notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
            </RollScroll>
          )}
        </section>
      )}

      {inv.videoId && (
        <section className="rjw-paper rjw-sec" data-inv-reveal>
          <Head k="Our film" t="A little preview" />
          <div className="rjw-film"><Film id={inv.videoId} poster={inv.couplePhoto} /></div>
        </section>
      )}

      {inv.rsvpEnabled && (
        <section className="rjw-paper rjw-sec" id="rsvp">
          <Head k="Kindly respond" t="Will you join us?" />
          <div className="rjw-card" data-inv-reveal><Rsvp inv={inv} slug={slug} token={token} preview={preview} /></div>
        </section>
      )}

      {inv.wishesEnabled && (
        <section className="rjw-paper rjw-sec">
          <Head k="Aashirwad" t="Send your blessings" />
          <div data-inv-reveal><Wishes slug={slug} preview={preview} draft={draft} /></div>
        </section>
      )}

      <section className="rjw-paper rjw-sec rjw-close">
        <nav className="rjw-icons" aria-label="Quick links" data-inv-reveal>
          {main && mapLink(main) && <a href={mapLink(main)} target="_blank" rel="noreferrer"><PinIcon /><span>Venue</span></a>}
          {main?.date && <a href={gcal(inv, main)} target="_blank" rel="noreferrer"><CalIcon /><span>Save date</span></a>}
          {inv.contacts?.[0]?.phone && <a href={waLink(inv.contacts[0].phone)} target="_blank" rel="noreferrer"><ChatIcon /><span>Family</span></a>}
        </nav>
        {inv.contacts?.length > 0 && (
          <ul className="rjw-contacts" data-inv-reveal>
            {inv.contacts.map((p, i) => <li key={i}><b>{p.name}</b>{p.role && <span>{p.role}</span>}{p.phone && <a href={waLink(p.phone)} target="_blank" rel="noreferrer">WhatsApp</a>}</li>)}
          </ul>
        )}
        <div data-inv-reveal>
          <p className="rjw-close__k">With love,</p>
          <p className="rjw-close__names">{inv.partner1} &amp; {inv.partner2}</p>
          <Share inv={inv} />
        </div>
      </section>

      <footer className="rjw-foot">
        <a href="/" target="_blank" rel="noreferrer">Invitation crafted by <b>Guide Studio</b></a>
        {inv.showStudioCta && <a className="rjw-foot__cta" href="/contact?type=Wedding" target="_blank" rel="noreferrer">Planning your own wedding? Explore our photography →</a>}
      </footer>
    </div>
  );
}
