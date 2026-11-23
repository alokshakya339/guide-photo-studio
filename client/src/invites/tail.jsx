/* Shared closing sections (film, RSVP, blessings, contacts, sign-off, footer). Each theme passes its class
   prefix `p` and its own heading renderer, so the markup is shared but the look is entirely the theme's. */
import { Film, Rsvp, Wishes, Share, fmtDate } from './parts.jsx';
import { waLink } from './three.jsx';

export default function Tail({ inv, slug, token, preview, p, head, words = {}, closeExtra = null }) {
  const w = { film: 'Our film', rsvpK: 'Kindly respond', rsvpT: 'Will you join us?', wishK: 'Blessings', wishT: 'Leave your wishes', contacts: 'Questions? Reach the family', close: 'With love', ...words };
  const draft = inv.preview && inv.status !== 'published';
  return (
    <>
      {inv.videoId && (
        <section className={`${p}-sec ${p}-sec--film`}>
          {head(w.film, w.filmT || 'A little preview')}
          <div className={`${p}-film`} data-inv-reveal><Film id={inv.videoId} poster={inv.couplePhoto} /></div>
        </section>
      )}
      {inv.rsvpEnabled && (
        <section className={`${p}-sec ${p}-sec--rsvp`} id="rsvp">
          {head(w.rsvpK, w.rsvpT)}
          {inv.rsvpDeadline && <p className={`${p}-sub`} data-inv-reveal>Please reply by {fmtDate(inv.rsvpDeadline, { day: 'numeric', month: 'long' })}</p>}
          <div className={`${p}-card`} data-inv-reveal><Rsvp inv={inv} slug={slug} token={token} preview={preview} /></div>
        </section>
      )}
      {inv.wishesEnabled && (
        <section className={`${p}-sec ${p}-sec--wishes`}>
          {head(w.wishK, w.wishT)}
          <div data-inv-reveal><Wishes slug={slug} preview={preview} draft={draft} /></div>
        </section>
      )}
      {inv.contacts?.length > 0 && (
        <section className={`${p}-sec ${p}-sec--contacts`} data-inv-reveal>
          <p className={`${p}-k`}>{w.contacts}</p>
          <ul className={`${p}-contacts`}>
            {inv.contacts.map((c, i) => <li key={i}><b>{c.name}</b>{c.role && <span>{c.role}</span>}{c.phone && <a href={waLink(c.phone)} target="_blank" rel="noreferrer">WhatsApp</a>}</li>)}
          </ul>
        </section>
      )}
      <section className={`${p}-sec ${p}-close`} data-inv-reveal>
        {closeExtra}
        <p className={`${p}-close__k`}>{w.close},</p>
        <p className={`${p}-close__names`}>{inv.partner1} &amp; {inv.partner2}</p>
        <Share inv={inv} />
      </section>
      <footer className={`${p}-foot`}>
        <a href="/" target="_blank" rel="noreferrer">Invitation crafted by <b>Guide Studio</b></a>
        {inv.showStudioCta && <a className={`${p}-foot__cta`} href="/contact?type=Wedding" target="_blank" rel="noreferrer">Planning your own wedding? Explore our photography →</a>}
      </footer>
    </>
  );
}
