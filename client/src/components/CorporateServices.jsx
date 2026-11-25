import { Link } from 'react-router-dom';
import { CORPORATE_SERVICES } from '../site.js';
import CorporateForm from './CorporateForm.jsx';
import { IconArrow } from './Icons.jsx';

const pad = (n) => String(n).padStart(2, '0');

/**
 * "Our corporate services": numbered list of the services, optionally with the corporate
 * enquiry form. Home shows the list only and links to the form on Services & Pricing.
 * Pages that use it must call useReveal() so the [data-reveal] blocks fade in.
 */
export default function CorporateServices({ withForm = false, className = '' }) {
  return (
    <section className={`esec ecorp ${className}`} id="corporate">
      <div className="container">
        <div className="ehead" data-reveal>
          <div>
            <p className="eyebrow">For businesses</p>
            <h2 className="etitle">OUR corporate <em>services</em></h2>
          </div>
          {withForm
            ? <a href="#corporate-enquiry" className="elink">Enquire for your company <IconArrow width={14} height={14} /></a>
            : <Link to="/services#corporate-enquiry" className="elink">Enquire for your company <IconArrow width={14} height={14} /></Link>}
        </div>
        <ol className="ecorp__list">
          {CORPORATE_SERVICES.map((s, n) => (
            <li key={s} data-reveal style={{ '--d': `${(n % 3) * 90}ms` }}>
              <span className="ework__num">{pad(n + 1)}</span>
              <h3>{s}</h3>
            </li>
          ))}
        </ol>
        {withForm && <div className="ecorp__enquire" id="corporate-enquiry">
          <div className="ecorp__copy" data-reveal>
            <p className="eyebrow">Corporate enquiry</p>
            <h3 className="etitle">Tell us about <em>your project</em></h3>
            <p>Share a short brief: what you need, when and where. We’ll reply with a tailored proposal and quote.</p>
          </div>
          <div className="eclose__form" data-reveal>
            <CorporateForm />
          </div>
        </div>}
      </div>
    </section>
  );
}
