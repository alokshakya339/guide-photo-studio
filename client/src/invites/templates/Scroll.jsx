import { useRef } from 'react';
import { Countdown, CalendarButtons, MusicToggle, Gallery, Film, Rsvp, Wishes, Share, fmtDate, initials, mapLink } from '../parts.jsx';
import { useOpening, useScrollProgress, Embers, waLink, paragraphs, deva } from '../three.jsx';

/**
 * Sacred Scroll — a hand-inked manuscript on aged parchment, laid on a dark wooden desk.
 * Opening: break the wax seal and the rolled scroll unfurls in 3D.
 * Every section unfolds toward you as you scroll (scroll-linked rotateX); events are palm-leaf
 * manuscripts strung on cords that stand up one by one; verses are numbered in Devanagari.
 */

const Mandala = ({ className = '' }) => (
  <svg className={`scr-mandala ${className}`} viewBox="-100 -100 200 200" aria-hidden="true">
    {[34, 58, 92].map((r) => <circle key={r} r={r} />)}
    {Array.from({ length: 16 }, (_, i) => <path key={i} d="M0 -38C11 -54 11 -72 0 -90C-11 -72 -11 -54 0 -38Z" transform={`rotate(${i * 22.5})`} />)}
    {Array.from({ length: 8 }, (_, i) => <path key={`b${i}`} className="is-in" d="M0 -10C8 -18 8 -26 0 -33C-8 -26 -8 -18 0 -10Z" transform={`rotate(${i * 45 + 22.5})`} />)}
    {Array.from({ length: 32 }, (_, i) => <circle key={`d${i}`} className="is-dot" r="1.6" cx="0" cy="-96" transform={`rotate(${i * 11.25})`} />)}
    <circle r="5" className="is-dot" />
  </svg>
);

const Rule = () => <p className="scr-rule" aria-hidden="true"><span>❁</span></p>;
const Rod = ({ className = '' }) => <span className={`scr-rod ${className}`} aria-hidden="true"><i /><i /></span>;

export default function Scroll({ inv, slug, token, preview }) {
  const { f, lux, opened, leaving, open, playing, setPlaying } = useOpening(inv, 2900);
  const root = useRef(null);
  useScrollProgress(root, opened);

  const c = inv.couple || {};
  const hasCouple = c.p1Bio || c.p2Bio || c.p1Parents || c.p2Parents;
  const draft = inv.preview && inv.status !== 'published';
  const date = fmtDate(inv.weddingDate);
  const short = fmtDate(inv.weddingDate, { day: 'numeric', month: 'long', year: 'numeric' });
  const head = (k, t) => (
    <div className="scr-head">
      <p className="scr-k">{k}</p>
      <h2 className="scr-h2">{t}</h2>
      <Rule />
    </div>
  );

  return (
    <div className={`scr ${opened ? 'is-open' : ''}`} ref={root}>
      {!opened && (
        <div className={`scr-open ${leaving ? 'is-opening' : ''}`} role="dialog" aria-label="Open the invitation">
          <div className="scr-open__stage" onClick={open} aria-hidden="true">
            <div className="scr-roll">
              <Rod className="is-top" />
              <div className="scr-roll__sheet">
                <div className="scr-roll__text">
                  <span className="scr-roll__k">॥ शुभ विवाह ॥</span>
                  <span className="scr-roll__to">To you and your family</span>
                  <span className="scr-roll__names">{inv.partner1} <i>&amp;</i> {inv.partner2}</span>
                  {short && <span className="scr-roll__date">{short}</span>}
                </div>
              </div>
              <Rod className="is-bot" />
              <span className="scr-ribbon" />
              <span className="scr-seal"><b className="is-l" /><b className="is-r" /><em>{initials(inv)}</em></span>
            </div>
          </div>
          <button type="button" className="scr-open__btn" onClick={open}>
            Break the seal{inv.music ? ' · with music' : ''}
          </button>
        </div>
      )}

      <MusicToggle src={inv.music} title={inv.musicTitle} playing={playing} setPlaying={setPlaying} />
      {lux && opened && <Embers count={14} className="scr-dust" />}

      <div className="scr-desk">
        <div className="scr-sheet">
          <Rod className="is-top is-page" />

          <header className="scr-hero">
            <div className="scr-hero__halo"><Mandala /></div>
            <p className="scr-k">॥ शुभ विवाह ॥</p>
            <p className="scr-kicker">{inv.headline || 'We’re getting married'}</p>
            <h1 className="scr-names"><span>{inv.partner1}</span><i>&amp;</i><span>{inv.partner2}</span></h1>
            <Rule />
            {date && <p className="scr-date">{date}</p>}
            {inv.city && <p className="scr-city">{inv.city}</p>}
            {inv.coverPhoto && <div className="scr-photo" data-p><img src={inv.coverPhoto} alt="" /></div>}
            {inv.hashtag && <p className="scr-tag">{inv.hashtag}</p>}
          </header>

          {inv.families && (
            <section className="scr-sec scr-fold" data-p>
              <p className="scr-k">With the blessings of our elders</p>
              <p className="scr-drop">{inv.families}</p>
            </section>
          )}

          {hasCouple && (
            <section className="scr-sec scr-fold" data-p>
              {head('The bride & the groom', 'Two souls, one verse')}
              <div className="scr-couple">
                {[1, 2].map((n) => (
                  <article key={n} className="scr-person">
                    <span className="scr-person__pic">{c[`p${n}Photo`] ? <img src={c[`p${n}Photo`]} alt={inv[`partner${n}`]} loading="lazy" /> : <b>{(inv[`partner${n}`] || '?')[0]}</b>}</span>
                    <h3>{inv[`partner${n}`]}</h3>
                    {c[`p${n}Parents`] && <p className="scr-person__par">{c[`p${n}Parents`]}</p>}
                    {c[`p${n}Bio`] && <p>{c[`p${n}Bio`]}</p>}
                  </article>
                ))}
              </div>
            </section>
          )}

          {f.countdown && inv.weddingDate && (
            <section className="scr-sec scr-fold scr-countdown" data-p>
              <p className="scr-k">The muhurat draws near</p>
              <div className="scr-cartouche"><Countdown date={inv.weddingDate} /></div>
            </section>
          )}

          {(inv.timeline?.length > 0 || inv.story || inv.couplePhoto) && (
            <section className="scr-sec scr-fold" data-p>
              {head('Our story', 'As it was written')}
              {inv.couplePhoto && <div className="scr-photo scr-photo--wide" data-p><img src={inv.couplePhoto} alt={`${inv.partner1} and ${inv.partner2}`} loading="lazy" /></div>}
              {inv.timeline?.length > 0 ? (
                <ol className="scr-verses">
                  {inv.timeline.map((t, i) => (
                    <li key={i}>
                      <span className="scr-verses__no">॥ {deva(i + 1)} ॥</span>
                      <span className="scr-verses__y">{t.year}</span>
                      <h3>{t.title}</h3>
                      {t.text && <p>{t.text}</p>}
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="scr-prose">{paragraphs(inv.story).map((p, i) => <p key={i} className={i === 0 ? 'scr-drop' : ''}>{p}</p>)}</div>
              )}
            </section>
          )}

          {inv.events?.length > 0 && (
            <section className="scr-sec">
              {head('The ceremonies', 'Inscribed on palm leaves')}
              <div className="scr-leaves">
                {inv.events.map((e, i) => (
                  <article key={`${e.name}-${i}`} className="scr-leaf" data-p>
                    <span className="scr-leaf__hole is-a" /><span className="scr-leaf__hole is-b" />
                    <div className="scr-leaf__body">
                      <p className="scr-leaf__num">॥ {deva(i + 1)} ॥</p>
                      <h3>{e.name}</h3>
                      {(e.date || e.time) && <p className="scr-leaf__when">{[e.date && fmtDate(e.date, { weekday: 'long', day: 'numeric', month: 'long' }), e.time].filter(Boolean).join(' · ')}</p>}
                      {(e.venue || e.address) && <p className="scr-leaf__venue"><b>{e.venue}</b>{e.address && <span>{e.address}</span>}</p>}
                      {(e.dressCode || e.colors?.length > 0) && (
                        <p className="scr-leaf__dress">
                          <span>Attire — </span>{e.dressCode}
                          {e.colors?.length > 0 && <span className="anc-swatches" aria-label="Dress-code colours">{e.colors.map((col) => <i key={col} style={{ background: col }} title={col} />)}</span>}
                        </p>
                      )}
                      {e.note && <p className="scr-leaf__note">{e.note}</p>}
                      <div className="scr-leaf__actions">
                        {mapLink(e) && <a href={mapLink(e)} target="_blank" rel="noreferrer">Directions</a>}
                        <CalendarButtons inv={inv} event={e} />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {inv.gallery?.length > 0 && (
            <section className="scr-sec scr-fold scr-gallery" data-p>
              {head('Moments', 'Illustrations')}
              <Gallery photos={inv.gallery} />
            </section>
          )}

          {inv.videoId && (
            <section className="scr-sec scr-fold" data-p>
              <p className="scr-k">Our film</p>
              <div className="scr-film"><Film id={inv.videoId} poster={inv.couplePhoto} /></div>
            </section>
          )}

          {inv.rsvpEnabled && (
            <section className="scr-sec scr-fold" id="rsvp" data-p>
              {head('Kindly respond', 'Will you join us?')}
              {inv.rsvpDeadline && <p className="scr-sub">Please reply by {fmtDate(inv.rsvpDeadline, { day: 'numeric', month: 'long' })}</p>}
              <Rsvp inv={inv} slug={slug} token={token} preview={preview} />
            </section>
          )}

          {inv.wishesEnabled && (
            <section className="scr-sec scr-fold" data-p>
              {head('Aashirwad', 'Write your blessing')}
              <Wishes slug={slug} preview={preview} draft={draft} />
            </section>
          )}

          {inv.contacts?.length > 0 && (
            <section className="scr-sec scr-fold" data-p>
              <p className="scr-k">Questions? Reach the family</p>
              <ul className="scr-contacts">
                {inv.contacts.map((p, i) => (
                  <li key={i}><b>{p.name}</b>{p.role && <span>{p.role}</span>}{p.phone && <a href={waLink(p.phone)} target="_blank" rel="noreferrer">WhatsApp</a>}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="scr-sec scr-close scr-fold" data-p>
            <p className="scr-close__k">Sealed with love,</p>
            <p className="scr-close__names">{inv.partner1} &amp; {inv.partner2}</p>
            <span className="scr-stamp" aria-hidden="true"><em>{initials(inv)}</em></span>
            <Share inv={inv} />
          </section>

          <Rod className="is-bot is-page" />
        </div>

        <footer className="scr-foot">
          <a href="/" target="_blank" rel="noreferrer">Invitation crafted by <b>Guide Studio</b></a>
          {inv.showStudioCta && <a className="scr-foot__cta" href="/contact?type=Wedding" target="_blank" rel="noreferrer">Planning your own wedding? Explore our photography →</a>}
        </footer>
      </div>
    </div>
  );
}
