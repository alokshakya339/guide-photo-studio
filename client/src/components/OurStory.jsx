import { Link } from 'react-router-dom';
import { SITE } from '../site.js';
import { IconArrow } from './Icons.jsx';

/** Thin gold looping flourish that frames a photo corner (decorative). */
function Flourish({ className = '' }) {
  return (
    <svg className={`ostory__flourish ${className}`} viewBox="0 0 320 120" fill="none" aria-hidden="true">
      <path d="M40 112C10 96 4 52 24 30 44 8 90 6 140 22l160 50" />
      <path d="M32 116C2 92 2 46 30 24 56 4 104 8 150 26l150 56" />
      <path d="M26 118C-2 86 6 36 40 20 72 6 120 14 162 32l138 60" />
      <path d="M50 108C26 92 22 60 40 42 62 22 104 22 150 34h120c26 0 42 18 42 40" />
    </svg>
  );
}

/**
 * "Our story" (Our Studio page): dark editorial section — big centred headline, then two photo/text rows with gold
 * flourishes and a handwritten signature. Photos come from SITE.story (Admin) when set; otherwise studio photos.
 */
export default function OurStory() {
  const photoA = SITE.story?.photoA || '/images/studio/s5.jpg';
  const photoB = SITE.story?.photoB || '/images/studio/s4.jpg';
  return (
    <section className="ostory dark-zone">
      <div className="container">
        <h2 className="ostory__title" data-reveal>
          Four <em>generations</em> OF BUILDING<br />A DISTINCTIVE <em>eye.</em>
        </h2>

        <div className="ostory__row" data-reveal>
          <figure className="ostory__fig ostory__fig--left">
            <Flourish />
            <img src={photoA} alt="Guide Photo Studio — the family’s work on the studio wall" loading="lazy" />
          </figure>
          <div className="ostory__copy">
            <p className="ostory__label">How we began</p>
            <p className="ostory__lead">It started with one man’s love for photography, and a belief that a photograph should feel the way the moment felt.</p>
            <p>
              It began in the 1940s, when the late <strong>Shri Roshan Lal Chopra</strong> opened the family’s first photo
              studio in Peshawar. After Partition, his son, the late <strong>Shri Parvesh Chopra</strong>, moved the studio
              to Delhi and named it Guide Photo Studio. <strong>Sandeep Chopra</strong> then brought it to Noida and
              rebuilt it from scratch into a name families trust for warmth and artistic excellence.
            </p>
            <p>
              Today, Creative Director <strong>Sarthak Chopra</strong> represents the fourth generation, bringing modern
              techniques and cinematic films to every story, from grand weddings and destination pre-weddings to
              portfolio and product shoots.
            </p>
          </div>
        </div>

        <div className="ostory__row ostory__row--flip" data-reveal>
          <div className="ostory__copy">
            <p>
              For us, a wedding isn’t only the grand entry or the perfect portrait. It’s the candid glance, the quiet
              laugh between rituals, the family moments nobody planned. We blend candid, contemporary and fine-art
              photography with the classic portraits your family will want — one team, for both families.
            </p>
            <p>
              Moments pass, but memories, if captured right, are eternal. That belief has guided four generations of
              our family, and it’s what we bring to yours.
            </p>
            <Link to="/contact" className="elink">Book a studio visit <IconArrow width={14} height={14} /></Link>
          </div>
          <figure className="ostory__fig ostory__fig--right">
            <Flourish className="is-flip" />
            <img src={photoB} alt="The lounge at Guide Photo Studio, Arun Vihar, Noida" loading="lazy" />
            <figcaption className="ostory__sign">Sandeep &amp; Sarthak Chopra</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
