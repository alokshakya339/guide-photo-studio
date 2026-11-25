import { useEffect, useState } from 'react';
import { IconPlay } from './Icons.jsx';

export function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | Guide Photo Studio` : 'Guide Photo Studio | Cinematic Wedding Photography in Noida';
  }, [title]);
}

export function SectionHead({ eyebrow, title, intro, align = 'left', children }) {
  return (
    <div className={`section-head section-head--${align}`}>
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {intro && <p className="lead">{intro}</p>}
      </div>
      {children}
    </div>
  );
}

/** Editorial page header: text left, framed photo right (photo optional). */
export function PageHero({ eyebrow, title, intro, image, children }) {
  return (
    <section className={`page-hero ${image ? 'page-hero--img' : ''}`}>
      <div className="container page-hero__grid">
        <div className="page-hero__content">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
          {intro && <p className="lead">{intro}</p>}
          {children}
        </div>
        {image && <figure className="page-hero__fig"><img src={image} alt="" className="page-hero__bg" /></figure>}
      </div>
    </section>
  );
}

/** Adds data-in to every [data-reveal] element as it scrolls into view (call once per page). */
export function useReveal(dep) {
  useEffect(() => {
    const els = [...document.querySelectorAll('[data-reveal]:not([data-in])')];
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach((el) => el.setAttribute('data-in', ''));
      return undefined;
    }
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.setAttribute('data-in', ''); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [dep]);
}

/** Number that counts up the first time it scrolls into view. */
export function CountUp({ to, suffix = '', duration = 1600 }) {
  const [n, setN] = useState(0);
  const [el, setEl] = useState(null);
  useEffect(() => {
    if (!el) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(to); return undefined; }
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / duration);
        setN(Math.round(to * (1 - (1 - p) ** 3)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [el, to, duration]);
  return <span ref={setEl}>{n.toLocaleString('en-IN')}{suffix}</span>;
}

export function Loader() {
  return <div className="loader" role="status" aria-label="Loading" />;
}

export function ErrorNote({ error }) {
  if (!error) return null;
  return <p className="note note--error">Couldn’t load this section: {error.message}</p>;
}

/** YouTube embed that only loads the player after a click (keeps pages fast). */
export function FilmPlayer({ id, title, subtitle, poster }) {
  const [play, setPlay] = useState(false);
  return (
    <figure className="film">
      <div className="film__frame">
        {play ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button className="film__poster" onClick={() => setPlay(true)} aria-label={`Play ${title}`}>
            <img src={poster || `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`} alt="" loading="lazy" />
            <span className="film__play"><IconPlay width={26} height={26} /></span>
          </button>
        )}
      </div>
      <figcaption className="film__caption">
        <span className="film__text">
          <strong>{title}</strong>
          {subtitle && <span>{subtitle}</span>}
        </span>
        {!play && (
          <button className="film__watch" onClick={() => setPlay(true)}>
            <IconPlay width={14} height={14} /> Watch film
          </button>
        )}
      </figcaption>
    </figure>
  );
}

/**
 * False on the server and during the first (hydrating) browser render, true after mount. Portals and other
 * browser-only UI wait for it, so the browser's first render matches the server-rendered HTML.
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
