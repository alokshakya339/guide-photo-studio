import { SITE } from '../site.js';
import { SectionHead } from './common.jsx';

/** Laurel wreath: two mirrored branches of paired leaves following a circular arc. */
const R = 40;
const LEAF = 'M0 0 Q6.5 -3.4 13 0 Q6.5 3.4 0 0Z';
const rad = (d) => (d * Math.PI) / 180;
const pt = (deg, r = R) => [50 + r * Math.cos(rad(deg)), 50 + r * Math.sin(rad(deg))];
const NODES = Array.from({ length: 8 }, (_, i) => 108 + i * 18); // bottom → top along the left side
const [sx, sy] = pt(100);
const [ex, ey] = pt(246);
const BRANCH = (
  <g>
    <path d={`M${sx.toFixed(1)} ${sy.toFixed(1)} A${R} ${R} 0 0 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`} fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    {NODES.map((deg, i) => {
      const [x, y] = pt(deg);
      const grow = deg + 90; // direction the branch grows in
      const k = 0.78 + (i / NODES.length) * 0.32; // leaves get a little bigger towards the tip
      return (
        <g key={deg} opacity={0.6 + (i / NODES.length) * 0.4}>
          <path d={LEAF} fill="currentColor" transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${grow - 42}) scale(${k.toFixed(2)})`} />
          <path d={LEAF} fill="currentColor" transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${grow + 38}) scale(${(k * 0.9).toFixed(2)})`} />
        </g>
      );
    })}
    <path d={LEAF} fill="currentColor" transform={`translate(${ex.toFixed(2)} ${ey.toFixed(2)}) rotate(${246 + 90}) scale(0.95)`} />
  </g>
);

function Laurel() {
  return (
    <svg className="award__laurel" viewBox="0 0 100 100" aria-hidden="true">
      {BRANCH}
      <g transform="translate(100 0) scale(-1 1)">{BRANCH}</g>
    </svg>
  );
}

const Trophy = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
    <path d="M17 6h2.5a1.5 1.5 0 0 1 1.5 1.5V8a4 4 0 0 1-4 4M7 6H4.5A1.5 1.5 0 0 0 3 7.5V8a4 4 0 0 0 4 4" />
  </svg>
);

/**
 * "Awards & recognition" section. Renders nothing until awards are added in Admin → Awards.
 */
export default function Awards({ awards = SITE.awards, alt = false, eyebrow = 'Awards & recognition', title = 'Recognised for the craft' }) {
  if (!awards?.length) return null;
  const years = awards.map((a) => parseInt(a.year, 10)).filter(Number.isFinite);
  const since = years.length ? Math.min(...years) : null;

  return (
    <section className={`section awards ${alt ? 'section--alt' : ''}`} aria-label="Awards and recognition">
      <div className="awards__glow" aria-hidden="true" />
      <div className="container">
        <div className="awards__head">
          <SectionHead eyebrow={eyebrow} title={title} />
          <div className="awards__stat">
            <strong>{awards.length}</strong>
            <span>{awards.length === 1 ? 'honour' : 'honours'}{since ? <> since {since}</> : null}</span>
          </div>
        </div>

        <ul className={`awards__grid awards__grid--n${Math.min(awards.length, 4)}`}>
          {awards.map((a) => {
            const Tag = a.link ? 'a' : 'div';
            return (
              <li key={a.id || a.title + a.year}>
                <Tag className="award" {...(a.link ? { href: a.link, target: '_blank', rel: 'noreferrer' } : {})}>
                  <div className="award__badge">
                    <Laurel />
                    <span className="award__medal">
                      {a.image ? <img src={a.image} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <Trophy />}
                    </span>
                  </div>
                  {a.category && <span className="award__cat">{a.category}</span>}
                  <h3 className="award__title">{a.title}</h3>
                  <p className="award__org">{[a.org, a.year].filter(Boolean).join(' · ')}</p>
                  {a.note && <p className="award__note">{a.note}</p>}
                  {a.link && (
                    <span className="award__link">
                      View
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>
                    </span>
                  )}
                </Tag>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
