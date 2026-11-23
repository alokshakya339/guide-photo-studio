import { useRef } from 'react';
import { Countdown, CalendarButtons, MusicToggle, Gallery, Film, Rsvp, Wishes, Share, fmtDate, initials, mapLink, useInviteReveal } from '../parts.jsx';
import { Tilt, useOpening, useParallax, Embers, Diya, waLink, paragraphs } from '../three.jsx';

/**
 * Ancient Temple — sandstone, vermilion and temple gold.
 * Opening: carved wooden temple doors swing inward in 3D, light pours out, the camera walks through.
 * Hero: parallax temple towers + colonnade; the arched niche tilts with the pointer.
 * Events stand on carved pillars, the countdown is carved stone blocks, the story climbs a stepwell.
 */

/* ---------- carvings ---------- */
const Gopuram = ({ className = '', tiers = 6, fit = 'xMidYMax meet' }) => {
  const rows = Array.from({ length: tiers }, (_, i) => { const w = 180 - i * (150 / tiers); return { x: 100 - w / 2, y: 196 - (i + 1) * 26, w }; });
  const top = rows[rows.length - 1];
  return (
    <svg className={`tmp-gopuram ${className}`} viewBox="0 0 200 220" preserveAspectRatio={fit} aria-hidden="true">
      <rect x="4" y="196" width="192" height="24" />
      {rows.map((r, i) => {
        const n = Math.max(1, Math.floor(r.w / 24));
        return (
          <g key={i}>
            <path d={`M${r.x} ${r.y + 26}h${r.w}l-6 -26h-${r.w - 12}Z`} />
            {Array.from({ length: n }, (_, j) => <rect key={j} className="is-niche" x={r.x + 10 + j * ((r.w - 20) / n) + (r.w - 20) / n / 2 - 3} y={r.y + 8} width="6" height="13" rx="3" />)}
          </g>
        );
      })}
      <path d={`M${top.x + 6} ${top.y}q${(top.w - 12) / 2} -32 ${top.w - 12} 0Z`} />
      <path className="is-kalash" d={`M100 ${top.y - 15}c-7-3-7-12 0-17 7 5 7 14 0 17Z M99 ${top.y - 34}h2v4h-2Z`} />
    </svg>
  );
};

const Colonnade = ({ n = 11 }) => (
  <svg className="tmp-colonnade" viewBox={`0 0 ${n * 64} 220`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <path d={`M0 0h${n * 64}v16H0Z M0 16h${n * 64}v8H0Z`} />
    {Array.from({ length: n }, (_, i) => (
      <g key={i} transform={`translate(${i * 64 + 32} 24)`}>
        <path d="M-18 0h36l-6 12h-24Z" /><rect x="-10" y="12" width="20" height="150" /><path d="M-14 162h28l4 12h-36Z" />
      </g>
    ))}
    <path d={`M0 198h${n * 64}v22H0Z`} />
  </svg>
);

const Lotus = () => (
  <svg className="tmp-lotus" viewBox="0 0 160 34" aria-hidden="true">
    <path className="is-line" d="M0 26h52M108 26h52" />
    <path d="M80 4c8 8 8 16 0 24-8-8-8-16 0-24Z" />
    <path d="M80 28c-4-9-12-14-22-14 2 9 10 14 22 14Z M80 28c4-9 12-14 22-14-2 9-10 14-22 14Z" />
    <path d="M80 28c-10-3-20-2-28 4 10 2 20 0 28-4Z M80 28c10-3 20-2 28 4-10 2-20 0-28-4Z" className="is-soft" />
  </svg>
);

const Capital = ({ flip = false }) => (
  <svg className={`tmp-pillar__cap ${flip ? 'is-base' : ''}`} viewBox="0 0 200 44" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 0h200v9H0Z" /><path d="M12 9h176l-12 13H24Z" /><path d="M30 22h140v7H30Z" className="is-light" /><path d="M38 29h124l-8 15H46Z" />
  </svg>
);

/* ---------- theme ---------- */
export default function Temple({ inv, slug, token, preview }) {
  const { f, lux, opened, leaving, open, playing, setPlaying } = useOpening(inv, 2600);
  const scene = useRef(null);
  useParallax(scene, opened);
  useInviteReveal(opened);

  const c = inv.couple || {};
  const hasCouple = c.p1Bio || c.p2Bio || c.p1Parents || c.p2Parents;
  const draft = inv.preview && inv.status !== 'published';
  const date = fmtDate(inv.weddingDate);
  const short = fmtDate(inv.weddingDate, { day: 'numeric', month: 'long', year: 'numeric' });
  const head = (k, t) => (
    <div className="tmp-head" data-inv-reveal>
      <p className="tmp-k">{k}</p>
      <h2 className="tmp-h2">{t}</h2>
      <Lotus />
    </div>
  );

  return (
    <div className={`tmp ${opened ? 'is-open' : ''}`}>
      {!opened && (
        <div className={`tmp-gate ${leaving ? 'is-opening' : ''}`} role="dialog" aria-label="Open the invitation">
          <div className="tmp-gate__world">
            <div className="tmp-gate__frame">
              <Gopuram className="tmp-gate__tower" tiers={7} fit="none" />
              <div className="tmp-gate__arch">
                <div className="tmp-gate__light"><span>{inv.partner1} &amp; {inv.partner2}</span></div>
                <span className="tmp-door tmp-door--l"><i /></span>
                <span className="tmp-door tmp-door--r"><i /></span>
                <button type="button" className="tmp-gate__btn" onClick={open} aria-label="Open the temple doors">
                  <span className="tmp-gate__k">Shubh Vivah</span>
                  <span className="tmp-gate__mono">{initials(inv)}</span>
                  <span className="tmp-gate__names">{inv.partner1} <i>&amp;</i> {inv.partner2}</span>
                  {short && <span className="tmp-gate__date">{short}</span>}
                  <span className="tmp-gate__hint">Tap to open the doors{inv.music ? ' · with music' : ''}</span>
                </button>
              </div>
              <div className="tmp-gate__steps"><i /><i /><i /></div>
              <Diya className="tmp-gate__diya is-l" />
              <Diya className="tmp-gate__diya is-r" />
            </div>
          </div>
        </div>
      )}

      <MusicToggle src={inv.music} title={inv.musicTitle} playing={playing} setPlaying={setPlaying} />

      {/* Hero: a 3D temple courtyard */}
      <header className="tmp-hero" ref={scene}>
        <div className="tmp-hero__sky"><span className="tmp-sun" /></div>
        <div className="tmp-layer tmp-layer--far">
          <Gopuram className="is-a" tiers={7} /><Gopuram className="is-b" tiers={5} /><Gopuram className="is-c" tiers={5} />
        </div>
        <div className="tmp-layer tmp-layer--mid"><Colonnade /></div>
        {lux && <Embers count={16} className="tmp-embers" />}
        <div className="tmp-hero__inner">
          <div className="tmp-niche">
            <div className="tmp-niche__arch">{inv.coverPhoto ? <img src={inv.coverPhoto} alt="" /> : <span className="tmp-niche__mono">{initials(inv)}</span>}</div>
          </div>
          <div className="tmp-plaque">
            <p className="tmp-kicker">{inv.headline || 'We’re getting married'}</p>
            <h1 className="tmp-names"><span>{inv.partner1}</span><i>&amp;</i><span>{inv.partner2}</span></h1>
            <Lotus />
            {date && <p className="tmp-date">{date}</p>}
            {inv.city && <p className="tmp-city">{inv.city}</p>}
            {inv.hashtag && <p className="tmp-tag">{inv.hashtag}</p>}
          </div>
        </div>
        <span className="tmp-hero__cue" aria-hidden="true">Enter the courtyard</span>
      </header>

      <div className="tmp-frieze" aria-hidden="true" />

      {inv.families && (
        <section className="tmp-sec" data-inv-reveal>
          <div className="tmp-tablet tmp-tablet--inscription">
            <p className="tmp-k">With the blessings of our elders</p>
            <p className="tmp-inscription">{inv.families}</p>
          </div>
        </section>
      )}

      {hasCouple && (
        <section className="tmp-sec">
          <div className="tmp-couple">
            {[1, 2].map((n) => (
              <div key={n} data-inv-reveal style={{ '--d': `${(n - 1) * 140}ms` }}>
                <Tilt as="article" className="tmp-murti" max={9}>
                  <span className="tmp-murti__arch">{c[`p${n}Photo`] ? <img src={c[`p${n}Photo`]} alt={inv[`partner${n}`]} loading="lazy" /> : <b>{(inv[`partner${n}`] || '?')[0]}</b>}</span>
                  <h3>{inv[`partner${n}`]}</h3>
                  {c[`p${n}Parents`] && <p className="tmp-murti__par">{c[`p${n}Parents`]}</p>}
                  {c[`p${n}Bio`] && <p>{c[`p${n}Bio`]}</p>}
                </Tilt>
              </div>
            ))}
          </div>
        </section>
      )}

      {f.countdown && inv.weddingDate && (
        <section className="tmp-sec tmp-countdown" data-inv-reveal>
          <p className="tmp-k">The auspicious day arrives in</p>
          <Countdown date={inv.weddingDate} />
        </section>
      )}

      {(inv.timeline?.length > 0 || inv.story || inv.couplePhoto) && (
        <section className="tmp-sec">
          {head('Our story', 'Step by step')}
          <div className="tmp-story">
            {inv.couplePhoto && (
              <div data-inv-reveal><Tilt className="tmp-story__photo" max={7}><img src={inv.couplePhoto} alt={`${inv.partner1} and ${inv.partner2}`} loading="lazy" /></Tilt></div>
            )}
            {inv.timeline?.length > 0 ? (
              <ol className="tmp-steps">
                {inv.timeline.map((t, i) => (
                  <li key={i} data-inv-reveal style={{ '--i': i, '--d': `${i * 110}ms` }}>
                    <span className="tmp-steps__y">{t.year}</span>
                    <h3>{t.title}</h3>
                    {t.text && <p>{t.text}</p>}
                  </li>
                ))}
              </ol>
            ) : (
              <div className="tmp-tablet" data-inv-reveal>{paragraphs(inv.story).map((p, i) => <p key={i}>{p}</p>)}</div>
            )}
          </div>
        </section>
      )}

      {inv.events?.length > 0 && (
        <section className="tmp-sec tmp-sec--wide">
          {head('The rituals', 'Join us for')}
          <div className="tmp-pillars">
            {inv.events.map((e, i) => (
              <div key={`${e.name}-${i}`} data-inv-reveal style={{ '--d': `${(i % 4) * 110}ms` }}>
                <Tilt as="article" className="tmp-pillar" max={6}>
                  <Capital />
                  <div className="tmp-pillar__shaft">
                    <span className="tmp-pillar__num">{String(i + 1).padStart(2, '0')}</span>
                    <h3>{e.name}</h3>
                    {e.date && <p className="tmp-pillar__date">{fmtDate(e.date, { weekday: 'long', day: 'numeric', month: 'long' })}</p>}
                    {e.time && <p className="tmp-pillar__time">{e.time}</p>}
                    {(e.venue || e.address) && <p className="tmp-pillar__venue"><b>{e.venue}</b>{e.address && <span>{e.address}</span>}</p>}
                    {(e.dressCode || e.colors?.length > 0) && (
                      <div className="tmp-pillar__dress">
                        <span>Attire</span>{e.dressCode}
                        {e.colors?.length > 0 && <div className="anc-swatches" aria-label="Dress-code colours">{e.colors.map((col) => <i key={col} style={{ background: col }} title={col} />)}</div>}
                      </div>
                    )}
                    {e.note && <p className="tmp-pillar__note">{e.note}</p>}
                    <div className="tmp-pillar__actions">
                      {mapLink(e) && <a href={mapLink(e)} target="_blank" rel="noreferrer">Directions</a>}
                      <CalendarButtons inv={inv} event={e} />
                    </div>
                  </div>
                  <Capital flip />
                </Tilt>
              </div>
            ))}
          </div>
        </section>
      )}

      {inv.gallery?.length > 0 && (
        <section className="tmp-sec tmp-sec--wide tmp-gallery">
          {head('Moments', 'Carved in memory')}
          <div data-inv-reveal><Gallery photos={inv.gallery} /></div>
        </section>
      )}

      {inv.videoId && (
        <section className="tmp-sec tmp-sec--wide" data-inv-reveal>
          <p className="tmp-k">Our film</p>
          <div className="tmp-film"><Film id={inv.videoId} poster={inv.couplePhoto} /></div>
        </section>
      )}

      {inv.rsvpEnabled && (
        <section className="tmp-sec" id="rsvp">
          {head('Kindly respond', 'Will you join us?')}
          {inv.rsvpDeadline && <p className="tmp-sub" data-inv-reveal>Please reply by {fmtDate(inv.rsvpDeadline, { day: 'numeric', month: 'long' })}</p>}
          <div className="tmp-tablet tmp-tablet--form" data-inv-reveal><Rsvp inv={inv} slug={slug} token={token} preview={preview} /></div>
        </section>
      )}

      {inv.wishesEnabled && (
        <section className="tmp-sec">
          {head('Aashirwad', 'Leave your blessings')}
          <div data-inv-reveal><Wishes slug={slug} preview={preview} draft={draft} /></div>
        </section>
      )}

      {inv.contacts?.length > 0 && (
        <section className="tmp-sec" data-inv-reveal>
          <p className="tmp-k">Questions? Reach the family</p>
          <ul className="tmp-contacts">
            {inv.contacts.map((p, i) => (
              <li key={i}><b>{p.name}</b>{p.role && <span>{p.role}</span>}{p.phone && <a href={waLink(p.phone)} target="_blank" rel="noreferrer">WhatsApp</a>}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="tmp-sec tmp-close" data-inv-reveal>
        <div className="tmp-close__lamps"><Diya /><Diya /><Diya /></div>
        <p className="tmp-close__k">With folded hands,</p>
        <p className="tmp-close__names">{inv.partner1} &amp; {inv.partner2}</p>
        <Share inv={inv} />
      </section>

      <footer className="tmp-foot">
        <a href="/" target="_blank" rel="noreferrer">Invitation crafted by <b>Guide Studio</b></a>
        {inv.showStudioCta && <a className="tmp-foot__cta" href="/contact?type=Wedding" target="_blank" rel="noreferrer">Planning your own wedding? Explore our photography →</a>}
      </footer>
    </div>
  );
}
