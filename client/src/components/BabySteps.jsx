import { SITE } from '../site.js';
import { IconArrow } from './Icons.jsx';

/** Maternity, newborn, baby and first-birthday shoots are done by our sister studio, BabySteps by Guide. */
export const BABYSTEPS_URL = SITE.babystepsUrl || 'https://babystepsbyguide.com';
export const BABYSTEPS_SLUGS = ['maternity', 'baby', 'birthday'];

export default function BabyStepsCard({ compact = false, onClick }) {
  return (
    <a href={BABYSTEPS_URL} target="_blank" rel="noopener" className={`bsx ${compact ? 'bsx--compact' : ''}`} onClick={onClick}>
      <img src="/images/portfolio/baby.jpg" alt="" loading="lazy" />
      <span className="bsx__body">
        <small>Our sister studio · BabySteps by Guide</small>
        <b>Maternity, newborn &amp; baby shoots</b>
        {!compact && <span className="bsx__text">Maternity, newborn, milestone, cake-smash and family sessions now have their own home — the same family, a studio made for little ones.</span>}
        <em>Visit BabySteps <IconArrow width={14} height={14} /></em>
      </span>
    </a>
  );
}
