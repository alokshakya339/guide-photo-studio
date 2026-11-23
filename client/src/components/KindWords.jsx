import { useEffect, useRef, useState } from 'react';

const FALLBACK = ['/images/wedding/w15.jpg', '/images/wedding/w12.jpg', '/images/home/couple-3.jpg', '/images/wedding/w05.jpg'];
const pad = (n) => String(n).padStart(2, '0');

/**
 * "KIND words": testimonials in the studio's editorial style — cream page, the client's photo in a gold-framed
 * portrait, a large serif quote with gold stars. Arrows / dots / swipe / keyboard, auto-advances (pauses on hover
 * or focus). Renders nothing until testimonials are published.
 */
export default function KindWords({ items = [] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef(null);
  const n = items.length;

  useEffect(() => {
    if (n < 2 || paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % n), 9000);
    return () => clearInterval(t);
  }, [n, paused, i]);
  useEffect(() => { if (i >= n) setI(0); }, [i, n]);
  if (!n) return null;

  const go = (d) => setI((x) => (x + d + n) % n);
  const t = items[i] || items[0];
  const rating = Math.max(0, Math.min(5, Math.round(t.rating || 5)));

  return (
    <section
      className="ekind"
      aria-roledescription="carousel"
      aria-label="Testimonials"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); }}
    >
      <div className="container">
        <div className="ekind__head">
          <p className="eyebrow">Testimonials</p>
          <h2 className="etitle etitle--center">KIND <em>words</em></h2>
          <p className="esub">From the families who trusted us with their days.</p>
        </div>

        <div
          className="ekind__stage"
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (touchX.current == null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
            touchX.current = null;
          }}
        >
          <div className="ekind__photo" aria-hidden="true">
            {items.map((q, k) => (
              <img key={q._id || k} src={q.photo || FALLBACK[k % FALLBACK.length]} alt="" className={k === i ? 'is-on' : ''} loading={k === 0 ? 'eager' : 'lazy'} />
            ))}
          </div>

          <figure className="ekind__quote" key={i} aria-live="polite">
            <span className="ekind__mark" aria-hidden="true">“</span>
            <span className="ekind__stars" role="img" aria-label={`${rating} out of 5 stars`}>
              {'★★★★★'.slice(0, rating)}<i>{'★★★★★'.slice(rating)}</i>
            </span>
            <blockquote>{t.quote}</blockquote>
            <figcaption>
              <b>{t.name}</b>
              {t.event && <span>{t.event}</span>}
            </figcaption>
          </figure>
        </div>

        {n > 1 && (
          <div className="ekind__ctrl">
            <button type="button" className="ekind__nav" onClick={() => go(-1)} aria-label="Previous testimonial">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7" /></svg>
            </button>
            <span className="ekind__count"><b>{pad(i + 1)}</b> / {pad(n)}</span>
            <div className="ekind__dots">
              {items.map((q, k) => (
                <button type="button" key={q._id || k} className={k === i ? 'is-on' : ''} onClick={() => setI(k)} aria-label={`Testimonial ${k + 1}`} aria-current={k === i} />
              ))}
            </div>
            <button type="button" className="ekind__nav" onClick={() => go(1)} aria-label="Next testimonial">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
