import { useCallback, useEffect, useRef, useState } from 'react';
import { IconChevron, IconClose } from './Icons.jsx';

const protect = { draggable: false, onContextMenu: (e) => e.preventDefault() };
const same = (s) => s;

/**
 * Full-screen viewer with keyboard + swipe navigation.
 * `full(src)` picks the large version; `keys` maps extra keys (e.g. { f: (img) => … }) to actions.
 */
export function Lightbox({ images, index, onClose, onIndex, renderActions, full = same, keys }) {
  const touch = useRef(null);
  const count = images.length;
  const go = useCallback((d) => onIndex((index + d + count) % count), [index, count, onIndex]);
  const img = images[index];

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea')) return;
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (keys?.[e.key.toLowerCase()] && img) { e.preventDefault(); keys[e.key.toLowerCase()](img); }
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [go, onClose, keys, img]);

  // Preload neighbours so arrowing through is instant.
  useEffect(() => {
    [1, -1].forEach((d) => {
      const n = images[(index + d + count) % count];
      if (n) new Image().src = full(n.src);
    });
  }, [index, images, count, full]);

  if (!img) return null;

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current == null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touch.current = null;
      }}
    >
      <button className="lightbox__close icon-btn" onClick={onClose} aria-label="Close"><IconClose /></button>
      {count > 1 && (
        <button className="lightbox__nav lightbox__nav--prev icon-btn" onClick={() => go(-1)} aria-label="Previous photo">
          <IconChevron dir="left" />
        </button>
      )}
      <img key={img.src} src={full(img.src)} alt={img.alt || ''} className="lightbox__img" referrerPolicy="no-referrer" {...protect} />
      {count > 1 && (
        <button className="lightbox__nav lightbox__nav--next icon-btn" onClick={() => go(1)} aria-label="Next photo">
          <IconChevron />
        </button>
      )}
      <div className="lightbox__bar">
        <span className="lightbox__count">{img.number ? `#${img.number} · ` : ''}{index + 1} / {count}</span>
        {renderActions?.(img)}
      </div>
    </div>
  );
}

/** Alternate URLs to try when an image fails (Google Drive sometimes rate-limits one endpoint). */
function fallbacks(src) {
  const m = String(src).match(/drive\.google\.com\/thumbnail\?id=([-\w]{20,})(?:&sz=w(\d+))?/);
  if (!m) return [src];
  const w = m[2] || 1000;
  return [src, `https://lh3.googleusercontent.com/d/${m[1]}=w${w}`, `${src}${src.includes('?') ? '&' : '?'}r=1`];
}

/** Image with a shimmer placeholder, fade-in, and automatic retry / fallback on error. */
function SmartImg({ src, alt }) {
  const [state, setState] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  const ref = useRef(null);
  const urls = fallbacks(src);
  // Reset when the photo changes, but if the browser already has it (cached → load fired before this ran),
  // show it straight away instead of waiting for a load event that will never come.
  useEffect(() => {
    setAttempt(0);
    const el = ref.current;
    setState(el?.complete && el.naturalWidth > 0 ? 'loaded' : 'loading');
  }, [src]);
  const onError = () => {
    if (attempt < urls.length - 1) {
      // small, growing delay so a burst of requests doesn't keep getting refused
      setTimeout(() => setAttempt((a) => a + 1), 400 + attempt * 900);
    } else setState('error');
  };
  return (
    <>
      <img
        ref={ref}
        src={urls[attempt]}
        alt={alt || ''}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={`smart-img is-${state}`}
        onLoad={() => setState('loaded')}
        onError={onError}
        {...protect}
      />
      {state === 'error' && (
        <span className="smart-img__err" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5" /><circle cx="15.5" cy="9" r="1.8" /><path d="m3 17 5-5 4 4 3-3 6 6" /></svg>
          <small>Tap to view</small>
        </span>
      )}
    </>
  );
}

/**
 * Photo grid that opens the lightbox on click.
 *  layout: 'masonry' (natural shapes) | 'grid' (uniform tiles, reads left→right)
 *  density: 'lg' | 'md' | 'sm'   thumb/full: map src → small / large URL
 *  batch: render this many at a time and add more as the visitor scrolls
 *  onDouble(img, i): double-click / double-tap action (e.g. select) with a heart burst
 */
export default function Gallery({
  images, renderOverlay, renderActions, layout = 'masonry', density = 'md',
  thumb = same, full = same, batch = Infinity, onDouble, lightboxKeys,
  lightboxImages, indexOffset = 0, onLightboxClose,
}) {
  // When paginated, the grid shows one page but the viewer can move through every photo.
  const lbImages = lightboxImages || images;
  const [open, setOpen] = useState(null);
  const [limit, setLimit] = useState(batch);
  const [burst, setBurst] = useState(null);
  const sentinel = useRef(null);
  const clickTimer = useRef(null);
  const lastTap = useRef({ i: -1, t: 0 });

  // Reset paging when the list changes (e.g. filter switched).
  useEffect(() => { setLimit(batch); }, [images.length, batch]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || limit >= images.length) return undefined;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setLimit((l) => l + batch), { rootMargin: '900px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [limit, images.length, batch]);

  const fire = (img, i) => {
    onDouble?.(img, i);
    setBurst(`${img._id || img.src}-${Date.now()}`);
  };

  function onClick(img, i) {
    if (!onDouble) return setOpen(indexOffset + i);
    // Distinguish single (open) from double (select) click / tap.
    const now = Date.now();
    if (lastTap.current.i === i && now - lastTap.current.t < 300) {
      clearTimeout(clickTimer.current);
      lastTap.current = { i: -1, t: 0 };
      fire(img, i);
      return;
    }
    lastTap.current = { i, t: now };
    clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => setOpen(indexOffset + i), 260);
  }

  const visible = images.slice(0, limit);

  return (
    <>
      <div className={`${layout === 'grid' ? 'pgrid' : 'masonry'} density-${density}`}>
        {visible.map((img, i) => {
          const key = img._id || img.src;
          return (
            <figure key={key} className={`${layout === 'grid' ? 'pgrid__item' : 'masonry__item'} ${img.favorite ? 'is-fav' : ''}`}>
              <button className="masonry__btn" onClick={() => onClick(img, i)} aria-label={`Open photo ${img.number || i + 1}`}>
                <SmartImg src={thumb(img.src)} alt={img.alt} />
                {burst?.startsWith(`${key}-`) && <span className="burst" aria-hidden="true">♥</span>}
              </button>
              {img.number && <span className="pgrid__num">#{img.number}</span>}
              {renderOverlay?.(img, i)}
            </figure>
          );
        })}
      </div>
      {limit < images.length && (
        <div ref={sentinel} className="gallery__more">
          <span className="loader" aria-hidden="true" />
          <span className="muted small">Loading more photos… ({visible.length} of {images.length})</span>
        </div>
      )}
      {open != null && (
        <Lightbox
          images={lbImages}
          index={open}
          onIndex={setOpen}
          onClose={() => { onLightboxClose?.(open); setOpen(null); }}
          renderActions={renderActions}
          full={full}
          keys={lightboxKeys}
        />
      )}
    </>
  );
}
