import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconArrow } from './Icons.jsx';

const GENERATIONS = [
  {
    gen: '01',
    label: 'Peshawar · 1940s',
    name: 'Shri Roshan Lal Chopra',
    prefix: 'Late',
    initials: 'RC',
    role: 'The visionary founder',
    text: 'Opened the family’s first photo studio in Peshawar in the 1940s. His passion for photography, and his wish to capture the beauty of his city, laid the foundation for every generation that followed.',
    camera: { art: 'bellows', wm: 'tlr', era: 'The 1940s', name: 'Studio bellows camera' },
  },
  {
    gen: '02',
    label: 'Delhi · after Partition',
    name: 'Shri Parvesh Chopra',
    prefix: 'Late',
    initials: 'PC',
    role: 'Gave the studio its name',
    text: 'Carried his father’s legacy through Partition, moved the studio to Delhi and renamed it Guide Photo Studio. His resilience kept the family’s craft alive.',
    camera: { art: 'tlr', era: 'The film era', name: 'Twin-lens reflex' },
  },
  {
    gen: '03',
    label: 'Noida · rebuilt',
    name: 'Sandeep Chopra',
    initials: 'SC',
    role: 'Rebuilt the studio',
    text: 'Learned the craft at his father’s side, then moved Guide Photo Studio to Noida and rebuilt it from scratch into a name families trust for warmth and artistic excellence.',
    camera: { art: 'slr', era: 'Film to digital', name: 'The SLR years' },
  },
  {
    gen: '04',
    label: 'The next chapter',
    name: 'Sarthak Chopra',
    initials: 'SC',
    role: 'Creative Director',
    text: 'A journalism graduate and award-winning photographer, he brings the fourth generation’s eye: modern techniques, cinematic films and an uncompromising standard for quality.',
    camera: { art: 'mirrorless', era: 'Today', name: 'Mirrorless & cinema' },
  },
];

/**
 * Four generations as a vertical family tree. The gold trunk draws itself as you scroll and each
 * generation branches out when the line reaches it. Respects prefers-reduced-motion (drawn in full).
 */
export default function FamilyTree({ people = GENERATIONS }) {
  const root = useRef(null);
  const [geo, setGeo] = useState(null);

  // Measure where the medallions and cards sit, so the SVG tree can grow through them.
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    const measure = () => {
      const box = el.getBoundingClientRect();
      const narrow = box.width < 700;
      const at = (n) => { const r = n.getBoundingClientRect(); return { x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height }; };
      const nodes = [...el.querySelectorAll('.ftree__node')].map((li) => {
        const m = at(li.querySelector('.ftree__medal'));
        const c = at(li.querySelector('.ftree__card'));
        const left = li.classList.contains('is-left');
        return { cx: m.x + m.w / 2, cy: m.y + m.h / 2, r: m.w / 2, edge: left ? c.x + c.w : c.x, cardY: c.y, cardH: c.h, left };
      });
      const seed = at(el.querySelector('.ftree__seed'));
      setGeo({ w: box.width, h: box.height, narrow, nodes, end: { x: seed.x + seed.w / 2, y: seed.y + seed.h / 2 } });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [people.length]);

  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    const nodes = [...el.querySelectorAll('.ftree__node, .ftree__end')];
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.setProperty('--p', 1);
      nodes.forEach((n) => n.classList.add('is-on'));
      return undefined;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when the tree's top reaches 70% of the screen, 1 when its bottom reaches 70%.
      const p = Math.min(1, Math.max(0, (vh * 0.7 - r.top) / r.height));
      el.style.setProperty('--p', p.toFixed(4));
      const lineY = r.top + r.height * p;
      nodes.forEach((n) => {
        const dot = n.querySelector('.ftree__medal, .ftree__seed') || n;
        const b = dot.getBoundingClientRect();
        n.classList.toggle('is-on', lineY >= b.top + b.height / 2 - 4);
      });
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, []);

  return (
    <section className="esec ftree-sec">
      {/* Watermarks: the first generation's camera and the latest one, faint behind the tree. */}
      <div className="ftree-wm" aria-hidden="true">
        {[people[0], people[people.length - 1]].filter((g, i, a) => g?.camera && a.indexOf(g) === i).map((g, i) => (
          <div key={g.gen} className={`ftree-wm__cam ${i ? 'is-latest' : 'is-first'}`}>
            {CAMERA_ART[g.camera.wm || g.camera.art] || <img src={g.camera.src} alt="" loading="lazy" />}
          </div>
        ))}
      </div>
      <div className="container">
        <div className="ftree__head">
          <p className="eyebrow">Our family tree</p>
          <h2 className="etitle etitle--center">FOUR generations,<br /><em>one way of seeing</em></h2>
          <p className="esub">A craft handed down from father to son since the 1940s, from a studio in Peshawar to Delhi, and on to Noida.</p>
        </div>

        <ol className="ftree" ref={root}>
          {geo && <TreeArt geo={geo} />}
          {people.map((g, i) => (
            <li key={g.gen} className={`ftree__node ${i % 2 ? 'is-right' : 'is-left'}`}>
              <div className="ftree__mark" aria-hidden="true">
                {g.camera ? <Camera c={g.camera} gen={g.gen} /> : <><small>Generation</small><span>{g.gen}</span></>}
              </div>
              <div className="ftree__medal" aria-hidden="true">
                {g.photo ? <img src={g.photo} alt="" loading="lazy" /> : <span>{g.initials}</span>}
              </div>
              <article className="ftree__card">
                <p className="ftree__gen"><span className="ftree__gen-n">Generation {g.gen}<span className="ftree__gen-dot"> · </span></span>{g.label}</p>
                <h3>{g.prefix && <small>{g.prefix} </small>}{g.name}</h3>
                <p className="ftree__role">{g.role}</p>
                <p className="ftree__text">{g.text}</p>
                {g.camera && <div className="ftree__cam-sm" aria-hidden="true"><Camera c={g.camera} gen={g.gen} small /></div>}
              </article>
            </li>
          ))}
          <li className="ftree__end">
            <span className="ftree__seed" aria-hidden="true" />
            <p>…and next, <em>your</em> family’s story.</p>
            <Link to="/contact" className="elink">Begin with us <IconArrow width={14} height={14} /></Link>
          </li>
        </ol>
      </div>
    </section>
  );
}

/* ---------- the camera of each generation ---------- */
/** Line drawings in the studio's ink — used until a real photo of that generation's camera is added. */
const CAMERA_ART = {
  bellows: (
    <svg viewBox="0 0 240 170" className="ftree__cam-art">
      <rect x="150" y="30" width="70" height="110" rx="6" />
      <rect x="168" y="20" width="34" height="10" rx="2" className="is-thin" />
      <path d="M150 42L80 58M150 128L80 112" />
      <path d="M136 46v78M122 49v72M108 52v66M94 55v60" className="is-thin" />
      <rect x="62" y="50" width="18" height="70" rx="3" />
      <rect x="38" y="68" width="24" height="34" rx="4" />
      <circle cx="38" cy="85" r="15" /><circle cx="38" cy="85" r="8" className="is-glass" />
      <path d="M24 140h206M71 120v20" />
      <circle cx="205" cy="48" r="3.5" className="is-dot" />
    </svg>
  ),
  tlr: (
    <svg viewBox="0 0 240 240" className="ftree__cam-art">
      <g transform="translate(35 0)">
        <path d="M34 40V22a4 4 0 0 1 4-4h94a4 4 0 0 1 4 4v18" />
        <path d="M44 18l8-10h66l8 10" className="is-thin" />
        <rect x="20" y="40" width="130" height="188" rx="10" />
        <rect x="46" y="50" width="78" height="14" rx="3" className="is-thin" />
        <circle cx="85" cy="102" r="30" /><circle cx="85" cy="102" r="23" /><circle cx="85" cy="102" r="12" className="is-glass" />
        <circle cx="85" cy="174" r="33" /><circle cx="85" cy="174" r="26" /><circle cx="85" cy="174" r="14" className="is-glass" />
        <path d="M85 141v-6M85 207v6" className="is-thin" />
        <path d="M150 96h6a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4h-6" /><circle cx="155" cy="165" r="7" />
        <rect x="13" y="66" width="7" height="14" rx="2" className="is-thin" />
        <circle cx="36" cy="214" r="3.5" className="is-dot" />
      </g>
    </svg>
  ),
  slr: (
    <svg viewBox="0 0 240 170" className="ftree__cam-art">
      <path d="M20 62h58l14-26h56l14 26h58a8 8 0 0 1 8 8v78a8 8 0 0 1-8 8H20a8 8 0 0 1-8-8V70a8 8 0 0 1 8-8Z" />
      <path d="M100 36l6-10h28l6 10" />
      <rect x="24" y="44" width="34" height="12" rx="3" /><rect x="180" y="44" width="30" height="12" rx="3" />
      <circle cx="120" cy="110" r="42" /><circle cx="120" cy="110" r="33" /><circle cx="120" cy="110" r="20" className="is-glass" />
      <path d="M120 68v5M120 147v5M78 110h5M157 110h5" />
      <path d="M12 82h44M184 82h44" className="is-thin" />
      <circle cx="200" cy="98" r="5" /><rect x="34" y="96" width="22" height="30" rx="3" className="is-thin" />
    </svg>
  ),
  mirrorless: (
    <svg viewBox="0 0 240 170" className="ftree__cam-art">
      <path d="M26 50h52l10-16h46l10 16h70a14 14 0 0 1 14 14v70a14 14 0 0 1-14 14H26a14 14 0 0 1-14-14V64a14 14 0 0 1 14-14Z" />
      <path d="M12 70c0-12 6-20 22-20h4v98h-4c-16 0-22-8-22-20Z" className="is-grip" />
      <rect x="172" y="40" width="22" height="10" rx="3" /><circle cx="204" cy="45" r="7" />
      <circle cx="134" cy="102" r="44" /><circle cx="134" cy="102" r="36" /><circle cx="134" cy="102" r="24" className="is-glass" />
      <circle cx="134" cy="102" r="10" className="is-thin" />
      <circle cx="58" cy="66" r="4" className="is-dot" />
      <path d="M90 102h0" />
    </svg>
  ),
};

function Camera({ c, gen, small }) {
  return (
    <figure className={`ftree__cam ${small ? 'is-small' : ''}`}>
      <div className="ftree__cam-pic">
        {c.src ? <img src={c.src} alt="" loading="lazy" /> : CAMERA_ART[c.art]}
      </div>
      <figcaption>
        {!small && <small>Generation {gen}</small>}
        <b>{c.era}</b>
        <span>{c.name}</span>
      </figcaption>
    </figure>
  );
}

/* ---------- the drawn tree ---------- */
const LEAF = 'M0 0 C 5 -7, 15 -8, 22 0 C 15 8, 5 7, 0 0 Z';

function Leaf({ x, y, rot, at, size = 1, tone = 0 }) {
  return (
    <g className="ftree__leaf" style={{ '--at': at }} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot}) scale(${size})`}>
      <path d={LEAF} className={tone ? 'is-dark' : ''} />
      <path d="M1 0 L 19 0" className="ftree__vein" />
    </g>
  );
}

/** Organic SVG tree: a winding trunk through the medallions, curved boughs out to each card, leaves along both. */
function TreeArt({ geo }) {
  const { w, h, narrow, nodes, end } = geo;
  if (!nodes.length) return null;
  const A = narrow ? 9 : 44; // how far the trunk sways
  const pts = [{ x: nodes[0].cx, y: 0 }, ...nodes.map((n) => ({ x: n.cx, y: n.cy })), { x: end.x, y: end.y }];
  let trunk = `M ${pts[0].x} ${pts[0].y}`;
  const leaves = [];
  for (let i = 1; i < pts.length; i += 1) {
    const a = pts[i - 1]; const b = pts[i];
    const dy = b.y - a.y; const s = i % 2 ? 1 : -1;
    const c1 = { x: a.x + s * A, y: a.y + dy * 0.32 };
    const c2 = { x: b.x + s * A, y: b.y - dy * 0.32 };
    trunk += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`;
    // two leaves on the outside of each sway
    [0.36, 0.64].forEach((t, k) => {
      const mt = 1 - t;
      const x = mt ** 3 * a.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t ** 3 * b.x;
      const y = mt ** 3 * a.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t ** 3 * b.y;
      if (narrow && k) return;
      leaves.push({ x, y, rot: s > 0 ? -28 + k * 40 : 208 - k * 40, at: y / h, size: narrow ? 0.85 : 1.45, tone: k });
    });
  }

  const boughs = narrow ? [] : nodes.map((n) => {
    const dir = n.left ? -1 : 1;
    const sx = n.cx + dir * (n.r - 4); const sy = n.cy;
    const ex = n.edge; const ey = n.cardY + Math.min(48, n.cardH * 0.3);
    const cx = (sx + ex) / 2; const cy = Math.min(sy, ey) - 46;
    const at = n.cy / h;
    const bl = [0.45, 0.78].map((t, k) => {
      const mt = 1 - t;
      const x = mt * mt * sx + 2 * mt * t * cx + t * t * ex;
      const y = mt * mt * sy + 2 * mt * t * cy + t * t * ey;
      return { x, y, rot: dir > 0 ? (k ? -40 : 210) : (k ? 220 : -30), at: at + 0.01 + k * 0.012, size: 1.25, tone: k ? 0 : 1 };
    });
    return { d: `M ${sx} ${sy} Q ${cx} ${cy}, ${ex} ${ey}`, at, end: { x: ex, y: ey }, leaves: bl };
  });

  return (
    <svg className="ftree__art" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <defs>
        <linearGradient id="ftreeTrunk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9a86a" />
          <stop offset="0.75" stopColor="#a5843f" />
          <stop offset="1" stopColor="#b3141c" />
        </linearGradient>
      </defs>
      <path d={trunk} className="ftree__trunk-bg" />
      <path d={trunk} pathLength="1" className="ftree__trunk-ink" stroke="url(#ftreeTrunk)" />
      {boughs.map((b) => (
        <g key={b.d} style={{ '--at': b.at }}>
          <path d={b.d} pathLength="1" className="ftree__bough" />
          <circle cx={b.end.x} cy={b.end.y} r="3.5" className="ftree__bud" />
          {b.leaves.map((l, i) => <Leaf key={i} {...l} />)}
        </g>
      ))}
      {leaves.map((l, i) => <Leaf key={i} {...l} />)}
    </svg>
  );
}
