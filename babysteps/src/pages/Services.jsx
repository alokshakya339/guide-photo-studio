import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../Icons.jsx';
import { IMG, JOURNEY, STEPS, PACKAGES } from '../data.js';
import { Label, PageHero, PackagesBlock, FaqList, CtaBand, useSeo, useReveal, pad, waLink, bookHref } from '../lib.jsx';

export default function Services() {
  useSeo('services');
  useReveal();
  const [params] = useSearchParams();
  const tab = PACKAGES[params.get('tab')] ? params.get('tab') : 'maternity';

  return (
    <>
      <PageHero
        crumb={[[null, 'Services & Pricing']]}
        title={<>Services <em>& pricing</em></>}
        intro="Celebrate every milestone with professional photography. Every package includes professional editing and delivery in a private online gallery."
      />

      <section className="wrap service-list">
        {JOURNEY.map((j, k) => (
          <article key={j.slug} className="service" data-reveal>
            <div className="service-img reveal-img"><img src={j.img} alt={`${j.title} photography`} loading="lazy" /></div>
            <div className="service-body">
              <span className="service-no">{pad(k + 1)}</span>
              <h2>{j.title}</h2>
              <p className="muted">{j.text}</p>
              <dl>
                <div><dt>Best time</dt><dd>{j.when}</dd></div>
                <div><dt>From</dt><dd>₹{j.from}</dd></div>
              </dl>
              <div className="service-actions">
                <Link className="btn btn-line" to={bookHref(j.title === 'Baby Milestones' ? 'Baby Milestone' : j.title)}>Book</Link>
                <Link className="btn-text" to={`/portfolio/${j.slug}`}>See the gallery <Icon name="arrow" size={18} /></Link>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="section packages" id="packages">
        <div className="wrap">
          <div className="center-head" data-reveal>
            <Label>Packages</Label>
            <h2 className="h2">Thoughtfully <em>curated</em> packages</h2>
            <p className="muted">Transparent pricing. Customise any package with add-ons.</p>
          </div>
          <PackagesBlock initial={tab} />
          <p className="custom-note">Every family is unique. <Link className="link" to={bookHref('Not sure yet')}>Ask us for a custom package</Link></p>
        </div>
      </section>

      <section className="section process">
        <div className="wrap">
          <div className="center-head" data-reveal>
            <Label>How it works</Label>
            <h2 className="h2">Four <em>baby steps</em></h2>
          </div>
          <ol className="steps">
            {STEPS.map((s, k) => (
              <li key={s.n} data-reveal style={{ '--d': `${k * 100}ms` }}>
                <span className="step-n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="gift">
        <div className="gift-img"><img src={IMG.birthday} alt="" loading="lazy" /></div>
        <div className="gift-copy" data-reveal>
          <Label>Gift cards</Label>
          <h2 className="h2">Give the gift<br /><em>of memories</em></h2>
          <p className="muted">Surprise a mom-to-be or new parents with a BabySteps photography gift card, delivered straight to their inbox.</p>
          <Link className="btn btn-dark" to="/gift-cards">Send a gift card</Link>
        </div>
      </section>

      <section className="section faq" id="faq">
        <div className="wrap faq-grid">
          <div data-reveal>
            <Label>Good to know</Label>
            <h2 className="h2">Questions<br /><em>parents ask</em></h2>
            <p className="muted">Can't find your answer? We're one message away.</p>
            <a className="btn-text" href={waLink('Hi BabySteps! I have a question.')} target="_blank" rel="noreferrer">Ask us on WhatsApp <Icon name="arrow" size={18} /></a>
          </div>
          <div data-reveal><FaqList /></div>
        </div>
      </section>
    </>
  );
}
