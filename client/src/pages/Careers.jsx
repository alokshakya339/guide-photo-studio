import { useState } from 'react';
import { api, useApi } from '../api.js';
import { SITE } from '../site.js';
import Select from '../components/Select.jsx';
import { Loader, ErrorNote, useTitle, useReveal } from '../components/common.jsx';
import { IconArrow, IconInstagram, IconWhatsApp } from '../components/Icons.jsx';

const IG_DM = 'https://ig.me/m/guidephotostudio';

const ico = { width: 30, height: 30, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
const ROLE_ICONS = {
  video: <svg {...ico}><rect x="3" y="8" width="18" height="13" rx="2" /><path d="m3 8 3.5-5M9 8l3.5-5M15 8l3.5-5M3 8h18" /><path d="m10 12 4 2.5-4 2.5Z" /></svg>,
  photo: <svg {...ico}><rect x="3" y="4" width="18" height="16" rx="2.5" /><circle cx="15.5" cy="9" r="1.8" /><path d="m3 17 5-5 4 4 3-3 6 6" /></svg>,
  megaphone: <svg {...ico}><path d="M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1Z" /><path d="M7 14v4a2 2 0 0 0 4 0" /><path d="M17 9a4 4 0 0 1 0 6M19.5 6.5a8 8 0 0 1 0 11" /></svg>,
  camera: <svg {...ico}><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13.5" r="3.5" /></svg>,
};

const EMPTY = { name: '', phone: '', email: '', role: '', level: 'fresher', portfolio: '', resume: '', instagram: '', message: '', website: '' };

function ApplyForm({ roles, role, setRole }) {
  const [form, setForm] = useState({ ...EMPTY });
  const [status, setStatus] = useState({ state: 'idle', error: '', errors: {} });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const value = { ...form, role: role || form.role };

  async function submit(e) {
    e.preventDefault();
    setStatus({ state: 'sending', error: '', errors: {} });
    try {
      await api('/applications', { method: 'POST', body: value });
      setStatus({ state: 'sent', error: '', errors: {} });
      setForm({ ...EMPTY });
      setRole('');
    } catch (err) {
      setStatus({ state: 'error', error: err.message, errors: err.details || {} });
    }
  }

  if (status.state === 'sent') {
    return (
      <div className="hire__sent" role="status">
        <span className="hire__sent-icon">✓</span>
        <h3>Application received!</h3>
        <p className="muted">Thank you for applying. Our team will review your work and reach out on the phone number you shared.</p>
        <button className="btn btn--ghost" onClick={() => setStatus({ state: 'idle', error: '', errors: {} })}>Apply for another role</button>
      </div>
    );
  }

  const err = status.errors;
  return (
    <form className="form hire__form" onSubmit={submit} noValidate>
      <div className="hire__level" role="radiogroup" aria-label="Experience">
        {[
          ['fresher', 'I’m a fresher', 'Ready to learn'],
          ['experienced', 'I’m experienced', 'I have a portfolio'],
        ].map(([v, t, s]) => (
          <button
            type="button" key={v} role="radio" aria-checked={value.level === v}
            className={value.level === v ? 'is-on' : ''}
            onClick={() => setForm((f) => ({ ...f, level: v }))}
          >
            <strong>{t}</strong><small>{s}</small>
          </button>
        ))}
      </div>

      <label>
        <span>Role *</span>
        <Select
          value={value.role}
          onChange={(v) => { setRole(''); setForm((f) => ({ ...f, role: v })); }}
          invalid={!!err.role}
          placeholder="Choose a role…"
          ariaLabel="Role"
          options={[...roles.map((r) => ({ value: r.title, label: r.title, hint: r.location })), 'Other / Internship']}
        />
        {err.role && <small className="form__err">{err.role}</small>}
      </label>
      <div className="form__row">
        <label>
          <span>Full name *</span>
          <input value={value.name} onChange={set('name')} autoComplete="name" aria-invalid={!!err.name} />
          {err.name && <small className="form__err">{err.name}</small>}
        </label>
        <label>
          <span>Phone / WhatsApp *</span>
          <input value={value.phone} onChange={set('phone')} type="tel" inputMode="tel" autoComplete="tel" aria-invalid={!!err.phone} />
          {err.phone && <small className="form__err">{err.phone}</small>}
        </label>
      </div>
      <div className="form__row">
        <label>
          <span>Email</span>
          <input value={value.email} onChange={set('email')} type="email" autoComplete="email" aria-invalid={!!err.email} />
          {err.email && <small className="form__err">{err.email}</small>}
        </label>
        <label>
          <span>Instagram</span>
          <input value={value.instagram} onChange={set('instagram')} placeholder="@yourhandle" autoCapitalize="none" />
        </label>
      </div>
      <label>
        <span>{value.level === 'experienced' ? 'Portfolio / showreel link *' : 'Portfolio or sample work (optional)'}</span>
        <input value={value.portfolio} onChange={set('portfolio')} type="url" inputMode="url" placeholder="https://drive.google.com/… or Behance / YouTube" aria-invalid={!!err.portfolio} />
        {err.portfolio && <small className="form__err">{err.portfolio}</small>}
      </label>
      <label>
        <span>Resume link (optional)</span>
        <input value={value.resume} onChange={set('resume')} type="url" inputMode="url" placeholder="https://…" aria-invalid={!!err.resume} />
        {err.resume && <small className="form__err">{err.resume}</small>}
      </label>
      <label>
        <span>Why do you want to join?</span>
        <textarea rows={4} value={value.message} onChange={set('message')} placeholder="Tell us a little about you and the kind of work you love…" />
      </label>
      <input className="hp" tabIndex={-1} autoComplete="off" value={value.website} onChange={set('website')} aria-hidden="true" />
      {status.state === 'error' && <p className="form__err" role="alert">{status.error}</p>}
      <button className="btn btn--primary" disabled={status.state === 'sending'}>
        {status.state === 'sending' ? 'Sending…' : <>Send application <IconArrow width={18} height={18} /></>}
      </button>
    </form>
  );
}

export default function Careers() {
  useTitle('Careers');
  const jobs = useApi('/jobs');
  useReveal(jobs.data?.length);
  const [role, setRole] = useState('');

  function applyFor(title) {
    setRole(title);
    document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <>
      <section className="chero">
        <div className="container chero__grid">
          <div className="chero__copy">
            <p className="eyebrow">Careers · We’re hiring</p>
            <h1 className="chero__title">Join a family of <em>storytellers.</em></h1>
            <p className="chero__lead">
              We’re expanding our creative team and looking for passionate people who want to create, learn and grow
              with us — on real weddings, films and portraits, with four generations of photographers beside you.
            </p>
            <div className="chero__ctas">
              <a href="#roles" className="ebtn ebtn--dark">See open roles <IconArrow width={16} height={16} /></a>
              <a href={IG_DM} target="_blank" rel="noreferrer" className="ebtn ebtn--line"><IconInstagram width={16} height={16} /> DM us “HIRING”</a>
            </div>
            <ul className="chero__facts">
              <li><b>{jobs.data?.length || 3}</b><span>Open roles</span></li>
              <li><b>Noida</b><span>Arun Vihar studio</span></li>
              <li><b>All levels</b><span>Freshers welcome</span></li>
            </ul>
          </div>
          <figure className="chero__fig">
            <img src="/images/studio/s8.jpg" alt="The shooting floor at Guide Photo Studio, Noida" />
            <figcaption>Our shooting floor · Sector 37, Noida</figcaption>
          </figure>
        </div>
      </section>

      <section className="section" id="roles">
        <div className="container">
          <div className="ehead" data-reveal>
            <div>
              <p className="eyebrow">Open roles</p>
              <h2 className="etitle">JOIN the <em>team</em></h2>
            </div>
            <p className="muted">Based at our Noida studio · Arun Vihar, Sector 37</p>
          </div>
          {jobs.loading && <Loader />}
          <ErrorNote error={jobs.error} />
          <div className="roles">
            {jobs.data?.map((j, n) => (
              <article key={j.slug} className="role" data-reveal style={{ '--d': `${n * 90}ms` }}>
                <span className="role__num">{String(n + 1).padStart(2, '0')}</span>
                <div className="role__head">
                  <span className="role__icon">{ROLE_ICONS[j.icon] || ROLE_ICONS.camera}</span>
                  <div>
                    <h3>{j.title}</h3>
                    <p className="role__meta">{j.location} · Experienced or fresher</p>
                  </div>
                </div>
                <p className="role__summary">{j.summary}</p>
                {j.duties?.length > 0 && (
                  <ul className="ticks">
                    {j.duties.map((d) => <li key={d}>{d}</li>)}
                  </ul>
                )}
                {j.skills?.length > 0 && (
                  <div className="role__skills">
                    {j.skills.map((s) => <span key={s}>{s}</span>)}
                  </div>
                )}
                <button className="ebtn ebtn--line role__apply" onClick={() => applyFor(j.title)}>
                  Apply for this role <IconArrow width={16} height={16} />
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section cpaths">
        <div className="container cpaths__grid">
          <div className="cpaths__item" data-reveal>
            <span className="cpaths__n">01</span>
            <h3>Experienced?</h3>
            <p>We’d love to see your work. Share your portfolio or showreel and tell us what you’re proud of.</p>
          </div>
          <div className="cpaths__item" data-reveal style={{ '--d': '100ms' }}>
            <span className="cpaths__n">02</span>
            <h3>A fresher?</h3>
            <p>We’re ready to train and guide you. Bring curiosity and a willingness to learn on real shoots.</p>
          </div>
        </div>
      </section>

      <section className="cquote dark-zone">
        <div className="container" data-reveal>
          <p className="cquote__lead">If you have a <em>creative mindset</em>, a willingness to <em>learn</em> and the passion to <em>create</em>,</p>
          <p className="cquote__big">this is for <em>you.</em></p>
        </div>
      </section>

      <section className="section" id="apply">
        <div className="container split">
          <div>
            <p className="eyebrow">Apply</p>
            <h2 className="etitle">Tell us about <em>yourself</em></h2>
            <p className="lead">
              Fill in the form and share a link to your work. Prefer Instagram? DM us <strong>“HIRING”</strong> to know more about the
              roles, responsibilities and application process.
            </p>
            <div className="hire__contact">
              <a href={IG_DM} target="_blank" rel="noreferrer" className="ebtn ebtn--line"><IconInstagram width={16} height={16} /> DM “HIRING”</a>
              <a
                href={`https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent('Hi Guide Photo Studio, I’d like to know more about the open roles.')}`}
                target="_blank" rel="noreferrer" className="ebtn ebtn--line"
              >
                <IconWhatsApp width={16} height={16} /> WhatsApp
              </a>
            </div>
          </div>
          <div className="panel capply__panel" data-reveal>
            {jobs.data && <ApplyForm roles={jobs.data} role={role} setRole={setRole} />}
          </div>
        </div>
      </section>
    </>
  );
}
