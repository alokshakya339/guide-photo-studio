import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { IconPlay, IconClose, IconArrow } from './Icons.jsx';

const yt = (id, params) => `https://www.youtube-nocookie.com/embed/${id}?${new URLSearchParams(params)}`;

/** Full-screen "theatre" player. Esc / backdrop / ✕ close it. */
export function Theatre({ film, onClose }) {
  const closeRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div className="theatre" role="dialog" aria-modal="true" aria-label={film.title} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <button ref={closeRef} className="theatre__close" onClick={onClose} aria-label="Close film">
        <IconClose />
      </button>
      <div className="theatre__frame">
        <iframe
          src={yt(film.id, { autoplay: 1, rel: 0, modestbranding: 1, playsinline: 1 })}
          title={film.title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
      <p className="theatre__caption">
        <strong>{film.title}</strong>
        {film.subtitle && <span> · {film.subtitle}</span>}
      </p>
    </div>,
    document.body
  );
}

/**
 * Full-width cinematic banner: a muted clip of the film loops in the background while the
 * section is on screen; "Watch full film" opens the theatre player with sound.
 */
export default function FilmShowcase({ film, eyebrow = 'Wedding films', moreLink = '/films' }) {
  const root = useRef(null);
  const [inView, setInView] = useState(false);
  const [ready, setReady] = useState(false);
  const [theatre, setTheatre] = useState(false);

  const canPreview =
    typeof window !== 'undefined' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
    !navigator.connection?.saveData;

  useEffect(() => {
    const el = root.current;
    if (!el || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) setReady(false);
  }, [inView]);

  // "object-fit: cover" for a 16:9 iframe: size it from the banner's real box (works for tall phones too).
  // 120px of extra height is overscan that hides YouTube's top/bottom chrome.
  const [cover, setCover] = useState(null);
  useEffect(() => {
    const el = root.current;
    if (!el || !('ResizeObserver' in window)) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const unit = Math.max(width / 16, (height + 120) / 9);
      setCover({ width: Math.ceil(unit * 16), height: Math.ceil(unit * 9) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const start = film.previewStart ?? 30;
  const showPreview = canPreview && inView && !theatre;

  return (
    <section className="showcase" ref={root} aria-label={`${film.title} wedding film`}>
      <img src={film.poster} alt="" className="showcase__poster" loading="lazy" />
      {showPreview && (
        <div className={`showcase__bg ${ready ? 'is-ready' : ''}`} aria-hidden="true">
          <iframe
            src={yt(film.id, {
              autoplay: 1, mute: 1, controls: 0, loop: 1, playlist: film.id, start, end: start + (film.previewLength ?? 40),
              playsinline: 1, rel: 0, modestbranding: 1, disablekb: 1, iv_load_policy: 3,
            })}
            title=""
            tabIndex={-1}
            style={cover || undefined}
            allow="autoplay; encrypted-media"
            onLoad={() => setTimeout(() => setReady(true), 900)}
          />
        </div>
      )}
      <div className="showcase__shade" />

      <div className="container showcase__content">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="showcase__title">
          {film.title.split(/\s+&\s+/).map((part, i) => (
            <span key={part}>{i > 0 && <em> &amp; </em>}{part}</span>
          ))}
        </h2>
        {film.tags?.length > 0 && (
          <ul className="showcase__tags">
            {film.tags.map((t) => <li key={t}>{t}</li>)}
          </ul>
        )}
        {film.subtitle && <p className="showcase__sub">{film.subtitle}</p>}
        {film.blurb && <p className="showcase__blurb">{film.blurb}</p>}
        <div className="showcase__ctas">
          <button className="showcase__watch" onClick={() => setTheatre(true)}>
            <span className="showcase__playdot"><IconPlay width={16} height={16} /></span>
            <span className="showcase__watch-label">Watch the film</span>
          </button>
          {moreLink && (
            <Link to={moreLink} className="btn btn--glass">
              All films <IconArrow width={18} height={18} />
            </Link>
          )}
        </div>
      </div>

      <div className="showcase__grain" aria-hidden="true" />
      {showPreview && ready && (
        <>
          <span className="showcase__badge" aria-hidden="true"><span className="showcase__rec" /> Preview · muted</span>
          <span className="showcase__progress" style={{ animationDuration: `${film.previewLength ?? 40}s` }} aria-hidden="true" />
        </>
      )}

      {theatre && <Theatre film={film} onClose={() => setTheatre(false)} />}
    </section>
  );
}
