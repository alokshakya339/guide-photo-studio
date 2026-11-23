import { useEffect, useRef, useState } from 'react';
import VideoModal, { FilmCards } from '../components/VideoModal.jsx';
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
import { api, tokenStore } from '../api.js';
import Gallery from '../components/Gallery.jsx';
import { Loader, useTitle } from '../components/common.jsx';
import { IconHeart, IconDownload } from '../components/Icons.jsx';
import { useSubscribe, PlanCards, fmtDate } from '../components/Subscription.jsx';
import { SITE, downloadUrl, sized } from '../site.js';
import { useToast } from '../components/Toast.jsx';
import Pagination from '../components/Pagination.jsx';
import { useDialog } from '../components/Dialog.jsx';

const keyFor = (slug) => `gps-gallery-${slug}`;
const fmtShort = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '');

const toSlug = (v) => v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

const PERKS = [
  ['heart', 'Pick your album favourites'],
  ['download', 'Download in full resolution'],
  ['share', 'Share privately with family'],
];

function PerkIcon({ name }) {
  const p = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  if (name === 'heart') return <svg {...p}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></svg>;
  if (name === 'download') return <svg {...p}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>;
  return <svg {...p}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></svg>;
}

export function ClientLogin() {
  useTitle('Client Gallery');
  const nav = useNavigate();
  const [slug, setSlug] = useState(() => {
    try { return toSlug(new URLSearchParams(window.location.search).get('g') || ''); } catch { return ''; }
  });
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);

  async function submit(e) {
    e.preventDefault();
    const s = toSlug(slug.trim());
    if (!s || !password) {
      setError('Please enter your gallery name and password.');
      setShake((n) => n + 1);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { token } = await api(`/client-galleries/${encodeURIComponent(s)}/login`, { method: 'POST', body: { password } });
      tokenStore.set(keyFor(s), token);
      nav(`/client/${s}`);
    } catch (err) {
      setError(err.message);
      setShake((n) => n + 1);
    } finally {
      setBusy(false);
    }
  }

  const help = `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent('Hi Guide Photo Studio, I need help opening my client gallery.')}`;

  return (
    <section className="cl">
      <div className="cl__visual">
        <img src="/images/wedding/w14.jpg" alt="" className="cl__photo" />
        <div className="cl__visual-inner">
          <span className="cl__badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
            Private client gallery
          </span>
          <h1 className="cl__title">Your memories,<br /><span className="accent">beautifully delivered.</span></h1>
          <ul className="cl__perks">
            {PERKS.map(([icon, text]) => (
              <li key={text}><span><PerkIcon name={icon} /></span>{text}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="cl__panel">
        <form key={shake} className={`cl__card ${shake ? 'is-shake' : ''}`} onSubmit={submit} noValidate>
          <img src="/images/brand/logo-dark.png" alt="Guide Photo Studio" className="cl__logo" />
          <h2>Welcome back</h2>
          <p className="muted"><span className="hide-sm">Enter the gallery name and password we shared with you.</span><span className="show-sm">Use the gallery name and password we sent you.</span></p>

          <label className="cl__field">
            <span>Gallery name</span>
            <div className="cl__input">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" /><circle cx="9" cy="10" r="1.6" /><path d="m21 16-5-5-8 8" /></svg>
              <input
                value={slug}
                onChange={(e) => setSlug(toSlug(e.target.value))}
                placeholder="riya-arjun-wedding"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                autoComplete="username"
                aria-invalid={!!error}
              />
            </div>
          </label>

          <label className="cl__field">
            <span>Password</span>
            <div className="cl__input">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={!!error}
              />
              <button type="button" className="cl__eye" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><path d="M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3.2 3.9M6.6 6.6C3.9 8.3 2.5 12 2.5 12s3.5 6 9.5 6a9.6 9.6 0 0 0 4.4-1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>
          </label>

          {error && <p className="cl__error" role="alert">{error}</p>}

          <button className="btn btn--primary cl__submit" disabled={busy}>
            {busy ? <><span className="cl__spinner" aria-hidden="true" /> Opening…</> : <>Open my gallery <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></>}
          </button>

          <ul className="cl__trust show-sm" aria-label="What you can do">
            {PERKS.map(([icon, text], i) => (
              <li key={text}><PerkIcon name={icon} /><span>{['Pick favourites', 'Download HD', 'Private link'][i] || text}</span></li>
            ))}
          </ul>

          <div className="cl__foot">
            <a className="cl__help" href={help} target="_blank" rel="noreferrer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.28-.2-.57-.35M12.05 21.79a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88a9.83 9.83 0 0 1 9.88 9.89c0 5.45-4.44 9.88-9.88 9.88" /></svg>
              <span>Forgot your details? <strong>WhatsApp us</strong></span>
            </a>
            <span className="cl__secure">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></svg>
              Private &amp; password-protected
            </span>
          </div>
        </form>
      </div>
    </section>
  );
}

export function ClientGallery() {
  const { slug } = useParams();
  const nav = useNavigate();
  const token = tokenStore.get(keyFor(slug));
  const [gallery, setGallery] = useState(null);
  const [paywall, setPaywall] = useState(null);
  const [filter, setFilter] = useState('all');
  const [msg, setMsg] = useState('');
  const [showPlans, setShowPlans] = useState(false);
  const [loadErr, setLoadErr] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const toast = useToast();
  const dialog = useDialog();
  const [density, setDensityState] = useState(() => {
    try { return localStorage.getItem('gps-density') || 'md'; } catch { return 'md'; }
  });
  const setDensity = (d) => { setDensityState(d); setPage(1, { scroll: false }); try { localStorage.setItem('gps-density', d); } catch { /* ignore */ } };
  const [showTop, setShowTop] = useState(false);
  const [film, setFilm] = useState(null);
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);
  const gridTop = useRef(null);
  const setPage = (n, { scroll = true } = {}) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (n <= 1) next.delete('page'); else next.set('page', String(n));
      return next;
    });
    if (scroll && gridTop.current) {
      const y = gridTop.current.getBoundingClientRect().top + window.scrollY - 150;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }
  };
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 1400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!token) return;
    api(`/client-galleries/${slug}`, { token })
      .then((g) => { setGallery(g); setPaywall(null); })
      .catch((err) => (err.status === 402 && err.data?.locked ? setPaywall(err.data) : setLoadErr(err)));
  }, [slug, token, reloadKey]);

  const clientName = gallery?.clientName || paywall?.gallery?.clientName;
  const { subscribe, busy, error: payError, testDialog } = useSubscribe(slug, token, { clientName });
  useTitle(gallery?.title || paywall?.gallery?.title || 'Client Gallery');

  async function choosePlan(code) {
    try {
      await subscribe(code);
      setShowPlans(false);
      setMsg('Thank you! Your subscription is active and your gallery stays online.');
      setReloadKey((k) => k + 1);
    } catch {
      /* error shown by the hook */
    }
  }

  async function cancelSub() {
    const ok = await dialog.confirm({
      title: 'Stop auto-renewal?',
      message: `You won’t be charged again. Your gallery stays available until ${fmtDate(gallery?.access?.until)}.`,
      icon: 'info', confirmLabel: 'Stop renewal', cancelLabel: 'Keep renewing',
    });
    if (!ok) return;
    try {
      await api(`/client-galleries/${slug}/subscription/cancel`, { method: 'POST', token });
      setMsg('Auto-renewal stopped.');
      setReloadKey((k) => k + 1);
    } catch (err) {
      setMsg(err.message);
    }
  }

  function logout() {
    tokenStore.set(keyFor(slug), null);
    nav('/client');
  }

  if (!token || loadErr?.status === 401) {
    return (
      <section className="section container center-cta" style={{ paddingTop: 160 }}>
        <h1>Please sign in</h1>
        <p className="lead">Your session has ended. Enter your gallery password again.</p>
        <Link to="/client" className="btn btn--primary">Client login</Link>
      </section>
    );
  }
  if (loadErr) {
    return (
      <section className="section container center-cta" style={{ paddingTop: 160 }}>
        <h1>Gallery unavailable</h1>
        <p className="lead">{loadErr.message}</p>
      </section>
    );
  }

  /* ----- Paywall: free period over ----- */
  if (paywall) {
    const g = paywall.gallery;
    return (
      <section className="paywall">
        {g.cover && <img src={g.cover} alt="" className="paywall__bg" />}
        <div className="container paywall__inner">
          <div className="paywall__head">
            <p className="eyebrow">Private gallery · {g.clientName}</p>
            <h1>{g.title}</h1>
            <p className="lead">
              Your free hosting period ended on {fmtDate(paywall.access.until)}. Your {g.photoCount} photos
              {g.favoriteCount ? ` and ${g.favoriteCount} album picks` : ''} are safe. Choose a plan to keep viewing,
              sharing and downloading them.
            </p>
            {paywall.billing?.mode === 'mock' && <p className="note">Test mode: payments are simulated until Razorpay keys are added.</p>}
            {paywall.billing?.mode === 'off' && <p className="note note--error">Online payment isn’t available right now. Please contact the studio.</p>}
          </div>
          {paywall.billing?.mode !== 'off' && <PlanCards plans={paywall.plans} onChoose={choosePlan} busy={busy} />}
          {payError && <p className="form__err center-cta" role="alert">{payError}</p>}
          <div className="center-cta">
            <p className="muted small">Secure payment by Razorpay · UPI AutoPay, cards & netbanking · Cancel any time</p>
            <button className="btn btn--ghost btn--sm" onClick={logout}>Sign out</button>
          </div>
        </div>
        {testDialog}
      </section>
    );
  }

  if (!gallery) return <div className="section" style={{ paddingTop: 160 }}><Loader /></div>;

  const access = gallery.access || {};
  const picks = gallery.photos.filter((p) => p.favorite).length;
  const locked = !!gallery.selectionSubmittedAt;
  const numbered = gallery.photos.map((p, i) => ({ ...p, number: i + 1, alt: `${gallery.title} · photo ${i + 1}` }));
  const images = filter === 'favorites' ? numbered.filter((p) => p.favorite) : numbered;
  const PAGE_SIZE = { lg: 24, md: 40, sm: 72 }[density] || 40;
  const pages = Math.max(1, Math.ceil(images.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const start = (current - 1) * PAGE_SIZE;
  const pageImages = images.slice(start, start + PAGE_SIZE);
  const showFilter = (f) => { setFilter(f); setPage(1, { scroll: false }); };
  const limit = gallery.selectionLimit || 0;
  const pct = limit ? Math.min(100, Math.round((picks / limit) * 100)) : 0;
  const renewing = ['active', 'authenticated'].includes(access.status);
  const soon = !renewing && access.daysLeft <= 14;

  async function toggle(photo, force) {
    if (locked) {
      toast({ type: 'info', title: 'Selection already submitted', message: 'Contact the studio if you’d like to change it.' });
      return;
    }
    setMsg('');
    const live = gallery.photos.find((x) => x._id === photo._id) || photo;
    const next = force ?? !live.favorite;
    if (next === live.favorite) return;
    if (next && limit && picks >= limit) {
      toast({ type: 'error', title: `You’ve picked ${limit} of ${limit}`, message: 'Remove a photo from your selection to add another.' });
      return;
    }
    setGallery((g) => ({ ...g, photos: g.photos.map((p) => (p._id === photo._id ? { ...p, favorite: next } : p)) }));
    if (next && limit && picks + 1 === limit) {
      toast({ title: `All ${limit} picks chosen!`, message: 'Review them under “Selected”, then submit your selection.', action: { label: 'Review picks', onClick: () => showFilter('favorites') } });
    }
    try {
      await api(`/client-galleries/${slug}/photos/${photo._id}`, { method: 'PATCH', token, body: { favorite: next } });
    } catch (err) {
      toast({ type: 'error', title: 'Couldn’t update your selection', message: err.message });
      setGallery((g) => ({ ...g, photos: g.photos.map((p) => (p._id === photo._id ? { ...p, favorite: !next } : p)) }));
      if (err.status === 402) setReloadKey((k) => k + 1);
    }
  }

  async function submitSelection() {
    const chosen = gallery.photos.filter((p) => p.favorite);
    const ok = await dialog.confirm({
      title: `Send ${picks} photo${picks === 1 ? '' : 's'} to the studio?`,
      message: 'We’ll start on your album with these picks. After you submit, you can’t change them yourself. Just ask us if you need to.',
      icon: 'send',
      images: chosen.map((p) => sized(p.src, 300)),
      confirmLabel: `Submit ${picks} photo${picks === 1 ? '' : 's'}`,
      cancelLabel: 'Keep choosing',
    });
    if (!ok) return;
    try {
      const { submittedAt } = await api(`/client-galleries/${slug}/submit`, { method: 'POST', token });
      setGallery((g) => ({ ...g, selectionSubmittedAt: submittedAt }));
      toast({ title: 'Selection sent to the studio!', message: `Thank you! We’ve received your ${picks} picks and will start on your album.` });
    } catch (err) {
      toast({ type: 'error', title: 'Couldn’t submit', message: err.message });
    }
  }

  const heart = (p) => {
    const live = gallery.photos.find((x) => x._id === p._id) || p;
    return (
      <button
        className={`fav-btn ${live.favorite ? 'is-on' : ''}`}
        onClick={(e) => { e.stopPropagation(); toggle(live); }}
        disabled={locked && !live.favorite}
        aria-pressed={live.favorite}
        aria-label={live.favorite ? 'Remove from selection' : 'Add to selection'}
      >
        <IconHeart filled={live.favorite} />
      </button>
    );
  };

  const planName = gallery.plans?.find((p) => p.code === access.planCode)?.name;
  const films = gallery.videos || [];
  const filmCount = films.length ? ` · ${films.length} film${films.length === 1 ? '' : 's'}` : '';

  return (
    <>
      <section className="ghero">
        <div className="ghero__media" aria-hidden="true">
          <img src={sized(gallery.cover || gallery.photos[0]?.src, 2000)} alt="" referrerPolicy="no-referrer" />
        </div>
        <div className="container ghero__inner">
          <div className="ghero__top">
            <span className="ghero__badge">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
              Private gallery
            </span>
            <button className="ghero__signout" onClick={logout} aria-label="Sign out">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M15 17l5-5-5-5M20 12H9" /></svg>
              <span className="hide-sm">Sign out</span>
            </button>
          </div>

          <div className="ghero__body">
            <div className="ghero__text">
              <h1>{gallery.title}</h1>
              <p className="ghero__meta show-sm">
                {[gallery.clientName, gallery.eventDate && fmtDate(gallery.eventDate), `${gallery.photos.length} photos`, films.length && `${films.length} film${films.length === 1 ? '' : 's'}`].filter(Boolean).join('  ·  ')}
              </p>
              <ul className="ghero__chips hide-sm">
                <li>{gallery.clientName}</li>
                {gallery.eventDate && <li>{fmtDate(gallery.eventDate)}</li>}
                <li>{gallery.photos.length} photos</li>
                {films.length > 0 && <li><a href="#films" className="ghero__filmchip">▶ {films.length} film{films.length === 1 ? '' : 's'}</a></li>}
                {limit > 0 && <li className="hide-sm">Pick up to {limit}</li>}
              </ul>
              <div className={`ghero__host ${soon ? 'is-warn' : ''} ${renewing ? 'is-ok' : ''}`}>
                <span className="ghero__dot" aria-hidden="true" />
                <span>
                  {renewing ? (
                    <>
                      <strong className="hide-sm">{planName || 'Subscription'} plan · </strong>
                      <span className="hide-sm">{access.status === 'authenticated' ? 'starts ' : 'renews '}{fmtDate(access.until)}</span>
                      <span className="show-sm"><strong>{planName || 'Plan'}</strong> · {access.status === 'authenticated' ? 'starts' : 'renews'} {fmtShort(access.until)}</span>
                    </>
                  ) : access.status === 'cancelled' ? (
                    <>Available until <strong>{fmtShort(access.until)}</strong></>
                  ) : (
                    <><span className="hide-sm">Free hosting · <strong>{access.daysLeft} days left</strong></span><span className="show-sm"><strong>{access.daysLeft} days</strong> free hosting left</span></>
                  )}
                </span>
                {renewing ? (
                  <button className="ghero__hostbtn" onClick={cancelSub}>
                    <span className="hide-sm">Stop auto-renewal</span><span className="show-sm">Stop renewal</span>
                  </button>
                ) : (
                  <button className="ghero__hostbtn" onClick={() => setShowPlans((v) => !v)}>
                    {showPlans ? 'Hide plans' : access.status === 'cancelled' ? 'Renew' : 'Keep online'}
                  </button>
                )}
              </div>
            </div>

            <aside className={`gcard ${locked ? 'is-done' : ''}`} aria-label="Your selection">
              <div className="gcard__ring" style={{ '--p': locked ? 100 : (limit ? pct : Math.min(100, picks * 10)) }}>
                <span>{locked ? '✓' : <>{picks}{limit ? <small>/{limit}</small> : null}</>}</span>
              </div>
              <div className="gcard__text">
                <strong className="hide-sm">{locked ? 'Selection submitted' : picks ? `${picks} photo${picks === 1 ? '' : 's'} picked` : 'Choose your favourites'}</strong>
                <strong className="show-sm">{locked ? 'Submitted' : limit ? `${picks} of ${limit} picked` : `${picks} picked`}</strong>
                <small>
                  {locked
                    ? `Sent on ${fmtDate(gallery.selectionSubmittedAt)}. We’re on it!`
                    : limit
                      ? (picks >= limit ? 'All picks chosen. Review and submit.' : `Tap ♥ on up to ${limit} photos for your album.`)
                      : 'Tap ♥ on the photos you love.'}
                </small>
              </div>
              {!locked && (
                <button
                  className="btn btn--primary gcard__btn"
                  onClick={() => {
                    if (picks) showFilter('favorites');
                    const t = gridTop.current || document.querySelector('.toolbar');
                    if (t) window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 150, behavior: 'smooth' });
                  }}
                >
                  <span className="hide-sm">{picks ? 'Review my picks' : 'Start selecting'}</span>
                  <span className="show-sm">{picks ? 'Review' : 'Start'}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
                </button>
              )}
            </aside>
          </div>
        </div>
      </section>

      {showPlans && !renewing && (
        <section className="section section--tight plans-inline">
          <div className="container">
            <p className="lead">
              Subscribe now and you won’t be charged until your current access ends on {fmtDate(access.until)}.
            </p>
            {gallery.billing?.mode === 'mock' && <p className="note">Test mode: payments are simulated until Razorpay keys are added.</p>}
            <PlanCards plans={gallery.plans || []} onChoose={choosePlan} busy={busy} />
            {payError && <p className="form__err" role="alert">{payError}</p>}
          </div>
        </section>
      )}

      {films.length > 0 && (
        <section className="cfilms" id="films" aria-label="Your films">
          <div className="container">
            <div className="cfilms__head">
              <div>
                <p className="eyebrow">Your films</p>
                <h2>Relive it in motion</h2>
              </div>
              <div className="cfilms__tools">
                <span className="cfilms__count">{films.length} film{films.length === 1 ? '' : 's'}</span>
                <button type="button" className="cfilms__all" onClick={() => setFilm(0)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" /></svg>
                  {films.length > 1 ? 'Play all' : 'Play film'}
                </button>
              </div>
            </div>
            <FilmCards videos={films} onPlay={setFilm} />
          </div>
        </section>
      )}
      {film != null && <VideoModal videos={films} index={film} onIndex={setFilm} onClose={() => setFilm(null)} allowDownload={gallery.allowDownload} />}

      <div className="toolbar">
        {limit > 0 && <span className="toolbar__progress" style={{ width: `${pct}%` }} aria-hidden="true" />}
        <div className="container toolbar__inner">
          <div className="seg" role="tablist">
            <button role="tab" aria-selected={filter === 'all'} className={filter === 'all' ? 'is-on' : ''} onClick={() => showFilter('all')}>
              All <span className="seg__n">{gallery.photos.length}</span>
            </button>
            <button role="tab" aria-selected={filter === 'favorites'} className={filter === 'favorites' ? 'is-on' : ''} onClick={() => showFilter('favorites')}>
              ♥ Selected <span className="seg__n">{picks}{limit ? `/${limit}` : ''}</span>
            </button>
          </div>
          <div className="density" role="radiogroup" aria-label="Photo size">
            {[['lg', 'Large', 2], ['md', 'Medium', 3], ['sm', 'Small', 4]].map(([d, label, n]) => (
              <button key={d} role="radio" aria-checked={density === d} aria-label={`${label} photos`} title={`${label} photos`} className={density === d ? 'is-on' : ''} onClick={() => setDensity(d)}>
                <span className={`density__ico density__ico--${n}`} aria-hidden="true">{Array.from({ length: n * n }, (_, k) => <i key={k} />)}</span>
              </button>
            ))}
          </div>
          <div className={`toolbar__actions ${!picks && !locked ? 'is-idle' : ''}`}>
            {locked ? (
              <span className="badge">Selection submitted</span>
            ) : (
              <button className="btn btn--primary btn--sm" disabled={!picks} onClick={submitSelection}>
                {picks ? `Submit ${picks} pick${picks === 1 ? '' : 's'}` : 'Submit selection'}
              </button>
            )}
          </div>
        </div>
      </div>

      <section className="section section--tight">
        <div className="container">
          {msg && <p className="note" role="status">{msg}</p>}
          {images.length === 0 ? (
            <div className="gallery__empty">
              <span aria-hidden="true">♡</span>
              <p>{filter === 'favorites' ? 'No photos selected yet. Tap the heart on the photos you love.' : 'Your photos will appear here soon.'}</p>
              {filter === 'favorites' && <button className="btn btn--ghost btn--sm" onClick={() => showFilter('all')}>Browse all photos</button>}
            </div>
          ) : (
            <>
            <div className="pager-info" ref={gridTop}>
              <span>
                Showing <strong>{start + 1}–{start + pageImages.length}</strong> of <strong>{images.length}</strong>
                {filter === 'favorites' ? ' selected' : ''} photos
              </span>
              {!locked && filter === 'all' && <span className="gallery__hint muted">Tip: double-tap a photo or press <kbd>F</kbd> in the viewer to pick it</span>}
              {pages > 1 && <span className="muted pager-info__page">Page {current} of {pages}</span>}
            </div>
            <Gallery
              key={`${filter}-${current}-${density}`}
              images={pageImages}
              lightboxImages={images}
              indexOffset={start}
              onLightboxClose={(idx) => { const pg = Math.floor(idx / PAGE_SIZE) + 1; if (pg !== current) setPage(pg); }}
              layout="grid"
              density={density}
              thumb={(src) => sized(src, density === 'lg' ? 1000 : 640)}
              full={(src) => sized(src, 2000)}
              onDouble={locked ? undefined : (p) => toggle(p, true)}
              lightboxKeys={locked ? undefined : { f: (p) => toggle(p), l: (p) => toggle(p) }}
              renderOverlay={(p) => heart(p)}
              renderActions={(p) => (
                <span className="lightbox__actions">
                  {heart(p)}
                  {gallery.allowDownload && (
                    <a className="icon-btn" href={downloadUrl(p.src)} download target={downloadUrl(p.src) !== p.src ? '_blank' : undefined} rel="noreferrer" aria-label="Download photo"><IconDownload /></a>
                  )}
                </span>
              )}
            />
            <Pagination page={current} pages={pages} onChange={(n) => setPage(n)} />
            </>
          )}
        </div>
      </section>
      {showTop && (
        <button className="to-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6" /></svg>
        </button>
      )}
      {testDialog}
    </>
  );
}
