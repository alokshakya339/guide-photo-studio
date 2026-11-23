import { useEffect, useMemo, useRef, useState } from 'react';
import { Countdown, CalendarButtons, MusicToggle, Film, Rsvp, Wishes, Share, fmtDate, initials, mapLink, useInviteReveal } from '../parts.jsx';
import { Petals, GoldDust, ScrollThread, useTapSparkles, Letters } from './Royal.jsx';

/**
 * Theme: Guide Studio Editorial — ivory, ink and antique gold, in the style of guidephotostudio.com.
 * Desktop: the couple's names stay pinned on a blurred cover photo while the invitation scrolls in a
 * column on the right. Phone: one column. Opens with a black monogram card whose doors part.
 */

const shortDate = (d) => fmtDate(d, { day: 'numeric', month: 'short', year: 'numeric' });
const longDate = (d) => {
  if (!d) return '';
  const x = new Date(`${d}T00:00:00`);
  return `${x.toLocaleDateString('en-IN', { weekday: 'long' })} · ${x.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`;
};
const waLink = (phone) => `https://wa.me/${String(phone).replace(/\D/g, '').replace(/^(?=[6-9]\d{9}$)/, '91')}`;

/** Section heading: small gold label, serif title, short gold rule. */
const Head = ({ k, t }) => (
  <div className="edi-head" data-inv-reveal>
    <p className="edi-k">{k}</p>
    <h2 className="edi-h2">{t}</h2>
    <span className="edi-rule" />
  </div>
);

/** Scratch card: guests rub the gold foil to reveal the date. */
function ScratchCard({ children }) {
  const canvas = useRef(null);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const c = canvas.current;
    if (!c) return undefined;
    const ctx = c.getContext('2d');
    const paint = () => {
      const r = c.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      c.width = r.width * dpr; c.height = r.height * dpr;
      ctx.scale(dpr, dpr);
      const g = ctx.createLinearGradient(0, 0, r.width, r.height);
      g.addColorStop(0, '#b8955a'); g.addColorStop(0.45, '#ead7a4'); g.addColorStop(0.55, '#f3e4bb'); g.addColorStop(1, '#a5843f');
      ctx.fillStyle = g; ctx.fillRect(0, 0, r.width, r.height);
      ctx.fillStyle = 'rgba(29, 26, 23, 0.75)';
      ctx.font = '500 12px Jost, sans-serif';
      ctx.textAlign = 'center';
      ctx.letterSpacing = '4px';
      ctx.fillText('SCRATCH HERE', r.width / 2, r.height / 2 + 4);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = '#000'; // solid brush so scratched pixels become fully transparent
    };
    paint();
    let down = false; let moves = 0;
    const at = (e) => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const scratch = (e) => {
      if (!down) return;
      e.preventDefault();
      const [x, y] = at(e);
      ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill();
      moves += 1;
      if (moves % 12 === 0) check();
    };
    const check = () => {
      const { data } = ctx.getImageData(0, 0, c.width, c.height);
      let clear = 0;
      for (let i = 3; i < data.length; i += 64) if (data[i] === 0) clear += 1;
      if (clear / (data.length / 64) > 0.4) setDone(true);
    };
    const start = (e) => { down = true; c.setPointerCapture?.(e.pointerId); scratch(e); };
    const end = () => { if (down) check(); down = false; };
    c.addEventListener('pointerdown', start);
    c.addEventListener('pointermove', scratch);
    window.addEventListener('pointerup', end);
    return () => { c.removeEventListener('pointerdown', start); c.removeEventListener('pointermove', scratch); window.removeEventListener('pointerup', end); };
  }, []);
  return (
    <div className={`edi-scratch ${done ? 'is-done' : ''}`}>
      <div className="edi-scratch__under">{children}</div>
      <canvas ref={canvas} className="edi-scratch__foil" aria-label="Scratch to reveal the date" />
      {!done && <button type="button" className="edi-scratch__skip" onClick={() => setDone(true)}>Reveal</button>}
    </div>
  );
}

/** Horizontal photo carousel with arrows and a lightbox. */
function Carousel({ photos }) {
  const track = useRef(null);
  const [open, setOpen] = useState(-1);
  const go = (d) => { const t = track.current; if (t) t.scrollBy({ left: d * t.clientWidth * 0.8, behavior: 'smooth' }); };
  useEffect(() => {
    if (open < 0) return undefined;
    const k = (e) => { if (e.key === 'Escape') setOpen(-1); if (e.key === 'ArrowRight') setOpen((i) => (i + 1) % photos.length); if (e.key === 'ArrowLeft') setOpen((i) => (i - 1 + photos.length) % photos.length); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, photos.length]);
  return (
    <>
      <div className="edi-car" ref={track}>
        {photos.map((src, i) => (
          <button key={src} type="button" className="edi-car__item" onClick={() => setOpen(i)} aria-label={`Open photo ${i + 1}`}>
            <img src={src} alt="" loading={i < 3 ? "eager" : "lazy"} />
          </button>
        ))}
      </div>
      {photos.length > 1 && (
        <div className="edi-arrows">
          <button type="button" onClick={() => go(-1)} aria-label="Previous photos">←</button>
          <button type="button" onClick={() => go(1)} aria-label="Next photos">→</button>
        </div>
      )}
      {open >= 0 && (
        <div className="inv-lightbox" role="dialog" aria-modal="true" onClick={() => setOpen(-1)}>
          <img src={photos[open]} alt="" onClick={(e) => e.stopPropagation()} />
          <button type="button" className="inv-lightbox__close" onClick={() => setOpen(-1)} aria-label="Close">×</button>
          {photos.length > 1 && <>
            <button type="button" className="inv-lightbox__nav is-prev" onClick={(e) => { e.stopPropagation(); setOpen((open - 1 + photos.length) % photos.length); }} aria-label="Previous">‹</button>
            <button type="button" className="inv-lightbox__nav is-next" onClick={(e) => { e.stopPropagation(); setOpen((open + 1) % photos.length); }} aria-label="Next">›</button>
          </>}
        </div>
      )}
    </>
  );
}

/** Soft layered hills for the footer (line-art, no brand). */
const Hills = () => (
  <svg className="edi-hills" viewBox="0 0 480 120" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 120V78c40-10 70-34 110-30s60 26 100 20 70-44 120-42 70 30 110 26 30-8 40-10v78Z" className="h1" />
    <path d="M0 120V96c50-6 90-26 150-22s90 22 140 18 100-24 150-20c20 2 30 6 40 8v40Z" className="h2" />
  </svg>
);

/** Copy-address button with a short confirmation. */
function CopyBtn({ text }) {
  const [ok, setOk] = useState(false);
  return <button type="button" className="edi-pill" onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1600); } catch { /* ignore */ } }}>{ok ? 'Copied ✓' : 'Copy address'}</button>;
}

export default function Editorial({ inv, slug, token, preview }) {
  const f = inv.features || { envelope: true, countdown: true, animations: false };
  const lux = Boolean(f.animations);
  const [opened, setOpened] = useState(!f.envelope);
  const [leaving, setLeaving] = useState(false);
  const [playing, setPlaying] = useState(false);
  useInviteReveal(opened);
  useTapSparkles(lux && opened);

  const open = () => {
    setLeaving(true);
    if (inv.music) setPlaying(true);
    setTimeout(() => setOpened(true), 1500);
  };

  const c = inv.couple || {};
  const hasCouple = c.p1Parents || c.p1Bio || c.p1Photo || c.p2Parents || c.p2Bio || c.p2Photo;
  const events = inv.events || [];
  const dress = events.filter((e) => e.dressCode || e.colors?.length);
  const venues = useMemo(() => {
    const seen = new Map();
    (inv.events || []).forEach((e) => { const key = `${e.venue}|${e.address}`; if ((e.venue || e.address) && !seen.has(key)) seen.set(key, e); });
    return [...seen.values()];
  }, [inv.events]);
  const nav = [
    (inv.timeline?.length || inv.story) && ['story', 'Our story'],
    events.length && ['events', 'Events'],
    venues.length && ['venues', 'Venues'],
    inv.rsvpEnabled && ['rsvp', 'RSVP'],
  ].filter(Boolean);
  const jump = (id) => document.getElementById(`edi-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const bg = inv.coverPhoto ? { backgroundImage: `url(${inv.coverPhoto})` } : undefined;
  const names = lux
    ? <><Letters text={inv.partner1} /> <span className="roy-l edi-amp" style={{ '--i': String(inv.partner1 || '').length + 1 }}>&amp;</span> <Letters text={inv.partner2} start={String(inv.partner1 || '').length + 3} /></>
    : <>{inv.partner1} <span className="edi-amp">&amp;</span> {inv.partner2}</>;

  return (
    <div className={`edi ${lux ? 'roy--lux edi--lux' : ''} ${opened ? 'is-open' : ''}`}>
      <div className="edi-bg" style={bg} aria-hidden="true" />
      {lux && opened && <Petals count={12} />}
      {lux && opened && <ScrollThread />}

      {/* Opening: black monogram card, doors part */}
      {!opened && (
        <div className={`edi-gate ${leaving ? 'is-opening' : ''}`} role="dialog" aria-label="Open the invitation">
          <div className="edi-gate__door is-l" /><div className="edi-gate__door is-r" />
          <div className="edi-gate__inner">
            <p className="edi-gate__k">You are invited</p>
            <span className="edi-gate__mono">{initials(inv)[0]}<i>&amp;</i>{initials(inv)[1]}</span>
            <p className="edi-gate__names">{inv.partner1} &amp; {inv.partner2}</p>
            {inv.weddingDate && <p className="edi-gate__date">{shortDate(inv.weddingDate)}</p>}
            <button type="button" className="edi-gate__btn" onClick={open}>Open invitation</button>
            {inv.music && <p className="edi-gate__hint">with music</p>}
          </div>
        </div>
      )}

      <MusicToggle src={inv.music} title={inv.musicTitle} playing={playing} setPlaying={setPlaying} />

      {/* Desktop: pinned names on the left */}
      <aside className="edi-side">
        {lux && <GoldDust count={22} />}
        <p className="edi-side__k">The wedding of</p>
        <h1 className="edi-side__names" aria-label={`${inv.partner1} and ${inv.partner2}`}>{names}</h1>
        <span className="edi-side__rule" />
        {inv.weddingDate && <p className="edi-side__date">{longDate(inv.weddingDate)}</p>}
        {inv.city && <p className="edi-side__city">{inv.city}</p>}
        <span className="edi-side__rule" />
        {nav.length > 0 && <nav className="edi-side__nav">{nav.map(([id, l]) => <button key={id} type="button" onClick={() => jump(id)}>{l}</button>)}</nav>}
      </aside>

      <main className="edi-col">
        {/* Cover card */}
        <section className="edi-cover">
          {inv.coverPhoto && <img className="edi-cover__img" src={inv.coverPhoto} alt="" />}
          <div className="edi-cover__shade" />
          <div className="edi-cover__text">
            <p className="edi-cover__k">Together with their families</p>
            <h2 className="edi-cover__names"><span>{inv.partner1}</span><i>and</i><span>{inv.partner2}</span></h2>
            <p className="edi-cover__sub">{inv.headline || 'invite you to celebrate their wedding'}</p>
            {inv.weddingDate && <p className="edi-cover__date">{shortDate(inv.weddingDate)}{inv.city ? ` · ${inv.city}` : ''}</p>}
          </div>
          <span className="edi-cover__scroll" aria-hidden="true">Scroll</span>
        </section>

        {inv.families && (
          <section className="edi-sec edi-sec--alt edi-families-line" data-inv-reveal>
            <p className="edi-k">With the blessings of</p>
            <p className="edi-lead">{inv.families}</p>
          </section>
        )}

        {f.countdown && inv.weddingDate && (
          <section className="edi-sec">
            <Head k="Counting the days" t="Until we say “I do”" />
            <div data-inv-reveal><Countdown date={inv.weddingDate} labels={['Days', 'Hours', 'Mins', 'Secs']} /></div>
          </section>
        )}

        {f.countdown && inv.weddingDate && (
          <section className="edi-sec edi-sec--alt">
            <Head k="Save the date" t="Scratch to reveal" />
            <div data-inv-reveal>
              <ScratchCard>
                <span className="edi-scratch__k">We’re getting married on</span>
                <b>{fmtDate(inv.weddingDate, { day: 'numeric', month: 'long', year: 'numeric' })}</b>
                <span>{fmtDate(inv.weddingDate, { weekday: 'long' })}{inv.city ? ` · ${inv.city}` : ''}</span>
              </ScratchCard>
            </div>
          </section>
        )}

        {hasCouple && (
          <section className="edi-sec">
            <Head k="The couple" t="Meet the two of us" />
            <div className="edi-stack">
              {[[inv.partner1, c.p1Photo, c.p1Parents, c.p1Bio], [inv.partner2, c.p2Photo, c.p2Parents, c.p2Bio]].map(([n, ph, par, bio], i) => (
                <article key={n} className="edi-card edi-person" data-inv-reveal style={{ '--d': `${i * 120}ms` }}>
                  <span className="edi-person__ph">{ph ? <img src={ph} alt={n} loading="lazy" /> : <b>{(n || '?')[0]}</b>}</span>
                  <h3 className="edi-script">{n}</h3>
                  {par && <p className="edi-person__par">{par}</p>}
                  {bio && <p className="edi-person__bio">{bio}</p>}
                </article>
              ))}
            </div>
          </section>
        )}

        {(inv.timeline?.length > 0 || inv.story) && (
          <section className="edi-sec edi-sec--alt" id="edi-story">
            <Head k="Our story" t="How it began" />
            {inv.couplePhoto && <figure className="edi-story__photo" data-inv-reveal><img src={inv.couplePhoto} alt={`${inv.partner1} and ${inv.partner2}`} /></figure>}
            {inv.timeline?.length > 0 ? (
              <ol className="edi-tl">
                {inv.timeline.map((t, i) => (
                  <li key={i} data-inv-reveal style={{ '--d': `${i * 90}ms` }}>
                    <span className="edi-tl__dot">{i + 1}</span>
                    {t.year && <p className="edi-tl__year">{t.year}</p>}
                    {t.title && <h3>{t.title}</h3>}
                    {t.text && <p>{t.text}</p>}
                  </li>
                ))}
              </ol>
            ) : (
              <div className="edi-prose" data-inv-reveal>{String(inv.story).split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</div>
            )}
          </section>
        )}

        {events.length > 0 && (
          <section className="edi-sec" id="edi-events">
            <Head k="The celebrations" t="Wedding events" />
            <div className="edi-stack">
              {events.map((e, i) => (
                <article key={`${e.name}-${i}`} className="edi-card edi-event" data-inv-reveal style={{ '--d': `${(i % 3) * 90}ms` }}>
                  <span className="edi-event__n">{String(i + 1).padStart(2, '0')}</span>
                  <div className="edi-event__body">
                    <h3>{e.name}</h3>
                    <dl>
                      {e.date && <><dt>Date</dt><dd>{shortDate(e.date)}</dd></>}
                      {e.time && <><dt>Time</dt><dd>{e.time}</dd></>}
                      {e.venue && <><dt>Venue</dt><dd>{e.venue}</dd></>}
                      {e.dressCode && <><dt>Wear</dt><dd>{e.dressCode}</dd></>}
                    </dl>
                    {e.note && <p className="edi-event__note">{e.note}</p>}
                    <div className="edi-event__actions">
                      {mapLink(e) && <a className="edi-pill" href={mapLink(e)} target="_blank" rel="noreferrer">Directions</a>}
                      <CalendarButtons inv={inv} event={e} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {dress.length > 0 && (
          <section className="edi-sec edi-sec--alt">
            <Head k="What to wear" t="Dress code" />
            <div className="edi-stack">
              {dress.map((e, i) => (
                <article key={`${e.name}-${i}`} className="edi-card edi-dress" data-inv-reveal style={{ '--d': `${(i % 3) * 90}ms` }}>
                  <h3>{e.name}</h3>
                  {e.dressCode && <p>{e.dressCode}</p>}
                  {e.colors?.length > 0 && <div className="edi-swatches">{e.colors.map((col) => <i key={col} style={{ background: col }} title={col} />)}</div>}
                </article>
              ))}
            </div>
          </section>
        )}

        {inv.family?.length > 0 && (
          <section className="edi-sec">
            <Head k="With love from" t="Our families" />
            <div className="edi-grid2">
              {inv.family.map((m, i) => (
                <article key={`${m.name}-${i}`} className="edi-card edi-member" data-inv-reveal style={{ '--d': `${(i % 2) * 90}ms` }}>
                  <span className="edi-member__ph">{m.photo ? <img src={m.photo} alt={m.name} loading="lazy" /> : <b>{m.name[0]}</b>}</span>
                  <h3>{m.name}</h3>
                  {m.relation && <p>{m.relation}</p>}
                </article>
              ))}
            </div>
          </section>
        )}

        {inv.gallery?.length > 0 && (
          <section className="edi-sec edi-sec--alt edi-gallery">
            <Head k="Moments" t="Gallery" />
            <div data-inv-reveal><Carousel photos={inv.gallery} /></div>
          </section>
        )}

        {inv.videoId && (
          <section className="edi-sec edi-sec--dark" data-inv-reveal>
            <p className="edi-k">Our film</p>
            <Film id={inv.videoId} poster={inv.couplePhoto} />
          </section>
        )}

        {venues.length > 0 && (
          <section className="edi-sec" id="edi-venues">
            <Head k="Where" t="The venues" />
            <div className="edi-stack">
              {venues.map((e, i) => (
                <article key={i} className="edi-card edi-venue" data-inv-reveal style={{ '--d': `${(i % 3) * 90}ms` }}>
                  <h3>{e.venue || e.name}</h3>
                  {e.address && <p>{e.address}</p>}
                  <div className="edi-event__actions">
                    {e.address && <CopyBtn text={[e.venue, e.address].filter(Boolean).join(', ')} />}
                    {mapLink(e) && <a className="edi-pill" href={mapLink(e)} target="_blank" rel="noreferrer">Directions</a>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {inv.rsvpEnabled && (
          <section className="edi-sec edi-sec--alt" id="edi-rsvp">
            <Head k="Kindly reply" t="RSVP" />
            {inv.rsvpDeadline && <p className="edi-sub" data-inv-reveal>Please reply by {fmtDate(inv.rsvpDeadline, { day: 'numeric', month: 'long' })}</p>}
            <div className="edi-card edi-form" data-inv-reveal><Rsvp inv={inv} slug={slug} token={token} preview={preview} /></div>
          </section>
        )}

        {inv.wishesEnabled && (
          <section className="edi-sec">
            <Head k="Blessings" t="Leave your wishes" />
            <div data-inv-reveal><Wishes slug={slug} preview={preview} draft={inv.preview && inv.status !== 'published'} /></div>
          </section>
        )}

        {inv.contacts?.length > 0 && (
          <section className="edi-sec edi-sec--alt">
            <Head k="Questions?" t="Get in touch" />
            <div className="edi-stack">
              {inv.contacts.map((m, i) => (
                <article key={`${m.name}-${i}`} className="edi-card edi-venue" data-inv-reveal style={{ '--d': `${(i % 2) * 90}ms` }}>
                  <h3>{m.name}</h3>
                  {m.role && <p>{m.role}</p>}
                  <div className="edi-event__actions">
                    <a className="edi-pill" href={`tel:${m.phone}`}>Call</a>
                    <a className="edi-pill" href={waLink(m.phone)} target="_blank" rel="noreferrer">WhatsApp</a>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <footer className="edi-foot">
          <Hills />
          <div className="edi-foot__in" data-inv-reveal>
            <p className="edi-foot__names">{lux ? <span className="roy-write">{inv.partner1} &amp; {inv.partner2}</span> : <>{inv.partner1} &amp; {inv.partner2}</>}</p>
            {inv.hashtag && <p className="edi-foot__tag">{inv.hashtag.startsWith('#') ? inv.hashtag : `#${inv.hashtag}`}</p>}
            <Share inv={inv} />
            <a className="edi-foot__credit" href="/" target="_blank" rel="noreferrer">Invitation crafted by <b>Guide Studio</b></a>
            {inv.showStudioCta && <a className="edi-foot__cta" href="/contact?type=Wedding" target="_blank" rel="noreferrer">Planning your own wedding? Explore our photography →</a>}
          </div>
        </footer>
      </main>
    </div>
  );
}
