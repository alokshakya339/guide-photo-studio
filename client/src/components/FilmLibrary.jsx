import { useMemo, useState } from 'react';
import { Theatre } from './FilmShowcase.jsx';
import { IconPlay } from './Icons.jsx';

const GROUPS = [
  ['all', 'All films'],
  ['Wedding film', 'Wedding films'],
  ['Wedding teaser', 'Teasers'],
  ['Pre-wedding', 'Pre-wedding'],
  ['Engagement', 'Engagement'],
  ['Celebration', 'Celebrations'],
];
const kindOf = (f) => (f.tags || []).find((t) => GROUPS.some(([k]) => k === t)) || 'Wedding film';
const thumb = (f) => f.poster || `https://i.ytimg.com/vi/${f.id}/hqdefault.jpg`;

/** Filterable grid of films (from Admin → Films). Each card opens the full-screen theatre player. */
export default function FilmLibrary({ films = [] }) {
  const [group, setGroup] = useState('all');
  const [open, setOpen] = useState(null);
  const groups = useMemo(() => GROUPS.filter(([k]) => k === 'all' || films.some((f) => kindOf(f) === k)), [films]);
  const shown = group === 'all' ? films : films.filter((f) => kindOf(f) === group);
  if (!films.length) return null;

  return (
    <div className="flib">
      <div className="flib__tabs" role="tablist" aria-label="Filter films">
        {groups.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={group === k} className={group === k ? 'is-on' : ''} onClick={() => setGroup(k)}>
            {label}<sup>{k === 'all' ? films.length : films.filter((f) => kindOf(f) === k).length}</sup>
          </button>
        ))}
      </div>
      <ul className="flib__grid">
        {shown.map((f, i) => (
          <li key={f.id} className="flib__item" style={{ '--d': `${(i % 3) * 70}ms` }}>
            <button className="flib__card" onClick={() => setOpen(f)} aria-label={`Play ${f.title}`}>
              <span className="flib__thumb">
                <img src={thumb(f)} alt="" loading="lazy" />
                <span className="flib__play"><IconPlay width={18} height={18} /></span>
                <span className="flib__kind">{kindOf(f)}</span>
              </span>
              <span className="flib__meta">
                <strong>{f.title}</strong>
                {f.subtitle && <small>{f.subtitle}</small>}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {open && <Theatre film={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
