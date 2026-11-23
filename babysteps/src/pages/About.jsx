import { Link } from 'react-router-dom';
import { Icon } from '../Icons.jsx';
import { STUDIO, IMG, FEATURES, TESTIMONIALS } from '../data.js';
import { Label, PageHero, CtaBand, useSeo, useReveal, pad } from '../lib.jsx';
import { SignatureSticker } from '../Decor.jsx';
import LogoStory from '../LogoStory.jsx';
import Experience from '../Experience.jsx';

export default function About() {
  useSeo('about');
  useReveal();
  return (
    <>
      <PageHero
        crumb={[[null, 'Our Studio']]}
        title={<>Our <em>studio</em></>}
        intro="A boutique maternity, newborn and baby photography brand, powered by Guide Photo Studio."
        img={IMG.family}
        pos="50% 30%"
      />

      <section className="section about">
        <div className="wrap about-grid about-trio">
          <div className="am-1 reveal-img" data-reveal><img src={IMG.milestone} alt="Milestone portrait from the studio" loading="lazy" /></div>
          <div className="about-copy" data-reveal>
            <Label>Meet the team behind BabySteps</Label>
            <h2 className="h2">Tanya &<br /><em>Sarthak Chopra</em></h2>
            <p className="lead-serif">A husband-wife photography duo passionate about capturing the beauty and emotion of your journey into parenthood.</p>
            <p className="muted">
              BabySteps is powered by {STUDIO.parent} — a name trusted for creating timeless memories
              for families for generations. Tanya's warm and caring approach helps create a calm, comfortable environment
              for mothers and little ones, while Sarthak's experience in portrait photography and visual storytelling
              ensures every image is crafted with emotion, artistry and attention to detail.
            </p>
            <p className="quote-line">“The greatest reward is the joy we bring to families.”</p>
            <SignatureSticker className="about-sticker" />
            <span className="am-caption">Powered by<br /><b>{STUDIO.parent}</b></span>
          </div>
          <div className="am-2 reveal-img" data-reveal><img src={IMG.maternity} alt="Maternity portrait from the studio" loading="lazy" /></div>
        </div>
      </section>

      <LogoStory />

      <section className="intro wrap" data-reveal>
        <Label>Our philosophy</Label>
        <p className="statement">
          Our approach is <em>personal, patient</em> and focused on authentic moments. We take the time to understand
          your vision and comfort level — and safety, especially with newborns, is always our top priority.
        </p>
      </section>

      <Experience
        label="The studio"
        title={<>Designed for<br /><em>little ones</em></>}
        intro="A comfortable, temperature-controlled space designed perfectly for babies and expecting mothers — with gowns, wraps and props ready for every session."
        link={{ to: '/contact#book', label: 'Plan your visit' }}
      />

      <section className="section reviews">
        <div className="wrap">
          <div className="center-head" data-reveal>
            <Label>Kind words</Label>
            <h2 className="h2">From our <em>families</em></h2>
          </div>
          <div className="review-grid">
            {TESTIMONIALS.map((t, k) => (
              <figure key={t.text} className="review" data-reveal style={{ '--d': `${k * 80}ms` }}>
                <span aria-hidden="true">“</span>
                <blockquote>{t.text}</blockquote>
                <figcaption><b>{t.name}</b>{t.shoot} session</figcaption>
              </figure>
            ))}
          </div>
          <div className="center-link"><Link className="btn-text" to="/portfolio">See our work <Icon name="arrow" size={18} /></Link></div>
        </div>
      </section>
    </>
  );
}
