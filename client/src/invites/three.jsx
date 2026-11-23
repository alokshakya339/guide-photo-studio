/* 3D helpers for the ancient themes (Temple, Scroll, Codex). All effects switch off for prefers-reduced-motion. */
import { useEffect, useRef, useState } from 'react';

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const waLink = (phone) => `https://wa.me/${String(phone).replace(/\D/g, '').replace(/^(?=[6-9]\d{9}$)/, '91')}`;
export const paragraphs = (s) => String(s || '').split(/\n{2,}/).filter(Boolean);
export const deva = (n) => { try { return Number(n).toLocaleString('hi-IN-u-nu-deva'); } catch { return String(n); } };
export const roman = (n) => {
  let x = Math.max(1, Math.floor(n)); let out = '';
  [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
    .forEach(([v, s]) => { while (x >= v) { out += s; x -= v; } });
  return out;
};

/** Opening-screen state shared by the three themes. `ms` = length of the opening animation. */
export function useOpening(inv, ms) {
  const f = inv.features || { envelope: true, countdown: true, animations: false };
  const [opened, setOpened] = useState(!f.envelope);
  const [leaving, setLeaving] = useState(false);
  const [playing, setPlaying] = useState(false);
  const open = () => {
    if (leaving) return;
    setLeaving(true);
    if (inv.music) setPlaying(true);
    setTimeout(() => { setOpened(true); window.scrollTo(0, 0); }, reduced() ? 60 : ms);
  };
  return { f, lux: Boolean(f.animations), opened, leaving, open, playing, setPlaying };
}

/** Card that tilts toward the pointer (desktop only). Sets --rx / --ry and the glare position --mx / --my. */
export function Tilt({ as: T = 'div', max = 8, className = '', children, ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced() || !window.matchMedia('(hover: hover)').matches) return undefined;
    let raf = 0;
    const move = (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--ry', `${((x - 0.5) * 2 * max).toFixed(2)}deg`);
        el.style.setProperty('--rx', `${((0.5 - y) * 2 * max).toFixed(2)}deg`);
        el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      });
    };
    const leave = () => {
      cancelAnimationFrame(raf);
      el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg');
      el.style.setProperty('--mx', '50%'); el.style.setProperty('--my', '30%');
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => { cancelAnimationFrame(raf); el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); };
  }, [max]);
  return <T ref={ref} className={`anc-tilt ${className}`} {...rest}>{children}</T>;
}

/** Scene parallax: --px / --py (-1…1) from the pointer, --sy (0…1) from scrolling the first screen. */
export function useParallax(ref, on = true) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !on || reduced()) return undefined;
    let raf = 0; let px = 0; let py = 0;
    const paint = () => {
      raf = 0;
      el.style.setProperty('--px', px.toFixed(3));
      el.style.setProperty('--py', py.toFixed(3));
      el.style.setProperty('--sy', Math.min(1, window.scrollY / window.innerHeight).toFixed(3));
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(paint); };
    const move = (e) => { if (e.pointerType === 'touch') return; px = (e.clientX / window.innerWidth) * 2 - 1; py = (e.clientY / window.innerHeight) * 2 - 1; queue(); };
    window.addEventListener('pointermove', move);
    window.addEventListener('scroll', queue, { passive: true });
    paint();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', move); window.removeEventListener('scroll', queue); };
  }, [ref, on]);
}

/** Scroll-linked progress: every [data-p] inside root gets --p from 0 (entering at the bottom) to 1 (well in view). */
export function useScrollProgress(ref, dep) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const els = [...root.querySelectorAll('[data-p]')];
    if (reduced()) { els.forEach((e) => e.style.setProperty('--p', '1')); return undefined; }
    let raf = 0;
    const tick = () => {
      raf = 0;
      const vh = window.innerHeight;
      els.forEach((e) => {
        const top = e.getBoundingClientRect().top;
        const p = Math.min(1, Math.max(0, (vh - top) / (vh * 0.55)));
        e.style.setProperty('--p', p.toFixed(3));
      });
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', queue); window.removeEventListener('resize', queue); };
  }, [ref, dep]);
}

/** Rising embers / dust motes. Deterministic positions so renders stay stable. */
export function Embers({ count = 18, className = '' }) {
  const items = Array.from({ length: count }, (_, i) => {
    const r = (k) => ((Math.sin((i + 1) * 9301 + k * 49297) + 1) / 2);
    return { '--x': `${(r(1) * 100).toFixed(1)}%`, '--s': `${(2 + r(2) * 4).toFixed(1)}px`, '--t': `${(9 + r(3) * 10).toFixed(1)}s`, '--d': `${(-r(4) * 18).toFixed(1)}s`, '--dx': `${((r(5) - 0.5) * 120).toFixed(0)}px` };
  });
  return <div className={`anc-embers ${className}`} aria-hidden="true">{items.map((s, i) => <i key={i} style={s} />)}</div>;
}

/** A small oil lamp with a flickering flame. */
export const Diya = ({ className = '' }) => <span className={`anc-diya ${className}`} aria-hidden="true"><i /></span>;

/** Full-screen photo viewer with arrows / Esc. */
export function Lightbox({ photos, index, setIndex }) {
  useEffect(() => {
    if (index < 0) return undefined;
    const k = (e) => {
      if (e.key === 'Escape') setIndex(-1);
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % photos.length);
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + photos.length) % photos.length);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [index, photos.length, setIndex]);
  if (index < 0) return null;
  return (
    <div className="inv-lightbox" role="dialog" aria-modal="true" onClick={() => setIndex(-1)}>
      <img src={photos[index]} alt="" onClick={(e) => e.stopPropagation()} />
      <button type="button" className="inv-lightbox__close" onClick={() => setIndex(-1)} aria-label="Close">×</button>
      {photos.length > 1 && <>
        <button type="button" className="inv-lightbox__nav is-prev" onClick={(e) => { e.stopPropagation(); setIndex((index - 1 + photos.length) % photos.length); }} aria-label="Previous">‹</button>
        <button type="button" className="inv-lightbox__nav is-next" onClick={(e) => { e.stopPropagation(); setIndex((index + 1) % photos.length); }} aria-label="Next">›</button>
      </>}
    </div>
  );
}
