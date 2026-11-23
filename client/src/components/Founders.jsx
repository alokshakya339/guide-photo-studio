import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { SITE } from '../site.js';
import { IconArrow, IconClose } from './Icons.jsx';

/** Centred bio popup: portrait left, name / role / bio right. Esc, backdrop or ✕ close it. */
function Bio({ person, onClose }) {
  const closeRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return createPortal(
    <div className="ebio" role="dialog" aria-modal="true" aria-label={person.name} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ebio__panel">
        <div className="ebio__photo"><img src={person.photo} alt={`${person.name}, ${person.role}`} /></div>
        <div className="ebio__body">
          <button ref={closeRef} className="ebio__close" onClick={onClose} aria-label="Close"><IconClose /></button>
          <h3>{person.name}</h3>
          <p className="ebio__role">{person.role.replace(/\s*·\s*/g, ' · ')}</p>
          {person.bio && <p className="ebio__text">{person.bio}</p>}
          <Link to="/contact" className="elink" onClick={onClose}>Book a session <IconArrow width={14} height={14} /></Link>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * "Our founders and team": large black-and-white portraits on a deep maroon backdrop. Below each: name,
 * a round arrow that opens the bio, and the role. Data comes from SITE.team (editable in Admin).
 */
export default function Founders({ link = true }) {
  const team = (SITE.team || []).filter((m) => m?.name);
  const [open, setOpen] = useState(null);
  if (!team.length) return null;
  return (
    <section className="esec efounders">
      <div className="container">
        <div className="efounders__head" data-reveal>
          <p className="eyebrow">The people behind the lens</p>
          <h2 className="etitle etitle--center">OUR FOUNDERS<br /><em>and</em> TEAM</h2>
        </div>
        <div className="efounders__grid">
          {team.map((m, n) => (
            <figure
              key={m.name}
              className="efounders__card"
              data-reveal
              style={{ '--d': `${n * 120}ms` }}
              onClick={() => setOpen(m)}
            >
              <div className="efounders__photo">
                <img src={m.photo} alt={`${m.name}, ${m.role}`} loading="lazy" />
              </div>
              <figcaption>
                <strong>{m.name}</strong>
                <button type="button" className="efounders__more" onClick={(e) => { e.stopPropagation(); setOpen(m); }} aria-label={`Read about ${m.name}`}>
                  <IconArrow width={16} height={16} />
                </button>
                <span className="efounders__role">{m.role.replace(/\s*·\s*/g, ' · ')}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="efounders__team" data-reveal>
          Together with the <strong>GPS Team</strong>: up to two assistant photographers and two to three
          cinematographers on every wedding.
        </p>
        {link && (
          <p className="ecenter"><Link to="/about" className="elink">Our story <IconArrow width={14} height={14} /></Link></p>
        )}
      </div>
      {open && <Bio person={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
