import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconArrow } from './Icons.jsx';

/**
 * Die-cut "sticker" collage section (Home). The stickers sit along the section's bottom edge.
 * Stickers rise in when the footer scrolls into view; hovering one lifts it to the
 * front and straightens it. The hero sticker swaps to a second photo on hover.
 *
 * Position values are % of the wall: x = left, y = bottom offset (negative = tucked
 * below the edge), w = width, r = resting rotation, shape = one of the blob outlines.
 */
const STICKERS = [
  { src: '/images/studio/camera-gen1.jpg', alt: 'Vintage studio camera', to: '/about', x: -2, y: 6, w: 14, ratio: 0.72, r: -5, shape: 'a', mobile: false },
  { src: '/images/wedding/w03.jpg', alt: 'Wedding portrait', to: '/portfolio/wedding', x: 7, y: -16, w: 22, ratio: 1.25, r: 3, shape: 'b' },
  { src: '/images/home/couple-2.jpg', alt: 'Couple portrait', to: '/portfolio/pre-wedding', x: 18, y: 34, w: 20, ratio: 1.2, r: -6, shape: 'c' },
  { src: '/images/portfolio/wedding.jpg', hover: '/images/wedding/w15.jpg', alt: 'Bride and groom', to: '/portfolio', x: 35, y: -22, w: 30, ratio: 0.95, r: 0, shape: 'd', hero: true },
  { src: '/images/portfolio/pre-wedding.jpg', alt: 'Pre-wedding shoot', to: '/portfolio/pre-wedding', x: 59, y: 22, w: 24, ratio: 1.35, r: 5, shape: 'b' },
  { src: '/images/portfolio/baby.jpg', alt: 'Baby photoshoot', to: '/portfolio', x: 83, y: 26, w: 17, ratio: 0.8, r: 4, shape: 'a', mobile: false },
  { src: '/images/portfolio/headshot.jpg', alt: 'Head shot', to: '/portfolio/head-shots', x: 76, y: -18, w: 26, ratio: 1.3, r: -4, shape: 'c' },
];

export default function StickerWall() {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  const [picked, setPicked] = useState(null); // touch: index of the sticker lifted by the first tap
  const [swap, setSwap] = useState(false); // touch: hero sticker flips between its two photos on its own
  const lastPointer = useRef('mouse');

  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) { setInView(true); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Touch screens have no hover, so the hero sticker swaps photos by itself while the wall is on screen.
  useEffect(() => {
    if (!inView || !window.matchMedia('(hover: none)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setInterval(() => setSwap((v) => !v), 3200);
    return () => clearInterval(t);
  }, [inView]);

  // Tapping anywhere outside the wall drops the lifted sticker.
  useEffect(() => {
    if (picked == null) return undefined;
    const off = (e) => { if (!ref.current?.contains(e.target)) setPicked(null); };
    document.addEventListener('pointerdown', off);
    return () => document.removeEventListener('pointerdown', off);
  }, [picked]);

  return (
    <section className="estickers">
      <div className="container estickers__head" data-reveal>
        <div>
          <p className="eyebrow">Moments we keep</p>
          <h2 className="etitle">A little piece of <em>every story</em></h2>
        </div>
        <p className="estickers__aside">
          Weddings, first birthdays, portraits and the studio where it all began.
          <Link to="/portfolio" className="elink">Explore the portfolio <IconArrow width={14} height={14} /></Link>
        </p>
      </div>
    <div ref={ref} className={`stickers${inView ? ' is-in' : ''}${picked != null ? ' has-pick' : ''}${swap ? ' is-swapped' : ''}`}>
      {STICKERS.map((s, i) => (
        <Link
          key={s.src}
          to={s.to}
          aria-label={s.alt}
          className={`sticker sticker--${s.shape}${s.hero ? ' sticker--hero' : ''}${s.mobile === false ? ' sticker--wide' : ''}${picked === i ? ' is-picked' : ''}`}
          onPointerDown={(e) => { lastPointer.current = e.pointerType; }}
          // touch: first tap lifts the sticker, second tap opens the collection
          onClick={(e) => { if (lastPointer.current !== 'mouse' && picked !== i) { e.preventDefault(); setPicked(i); } }}
          style={{ '--x': `${s.x}%`, '--y': `${s.y}%`, '--w': `${s.w}%`, '--ratio': s.ratio, '--r': `${s.r}deg`, '--i': i }}
        >
          <span className="sticker__cut">
            <img src={s.src} alt="" loading="lazy" />
            {s.hover && <img className="sticker__alt" src={s.hover} alt="" loading="lazy" />}
          </span>
        </Link>
      ))}
    </div>
    </section>
  );
}
