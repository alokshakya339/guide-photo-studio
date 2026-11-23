import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Icon, WhatsAppIcon } from '../Icons.jsx';
import { IMG, STUDIO } from '../data.js';
import { Label, usePage, waLink, pad, useSwipe, PhotoBox, LbPhoto } from '../lib.jsx';
import { HeartDivider, Heart, Floral } from '../Decor.jsx';
import { api, galleryToken, sized, downloadUrl, asset } from '../api.js';
import { useValidation } from '../useValidation.jsx';
import { checkSlug } from '../validation.js';

const toSlug = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, '-');
const LOGIN_RULES = {
  name: (v) => (String(v || '').trim() ? checkSlug(toSlug(v)) : 'Please enter your gallery name — it’s in the message we sent you.'),
  password: (v) => (!v ? 'Please enter your password.' : v.length > 100 ? 'That password is too long.' : ''),
};
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
const inr = (paise) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format((paise || 0) / 100);

function IconDownload(p) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>;
}
function IconLock(p) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}><rect x="4" y="10" width="16" height="11" rx="3" /><path d="M8 10V7a4 4 0 018 0v3" /></svg>;
}
function HeartFill({ on, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20.5s-7.5-4.6-7.5-10.4A4.2 4.2 0 0112 7.6a4.2 4.2 0 017.5 2.5c0 5.8-7.5 10.4-7.5 10.4z"
        fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------------- Login ---------------- */
export function ClientLogin() {
  usePage('Client Gallery', 'Sign in to your private BabySteps photo gallery.');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [name, setName] = useState(params.get('g') || '');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const lv = useValidation(LOGIN_RULES);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(params.get('expired') ? 'Your session has ended. Please sign in again.' : '');

  // Stay signed in until the client signs out (or the 2-day session ends): skip the form.
  useEffect(() => {
    const slug = galleryToken.current();
    const wanted = params.get('g') ? toSlug(params.get('g')) : null;
    if (slug && !params.get('expired') && (!wanted || wanted === slug)) navigate(`/client/${slug}`, { replace: true });
  }, [params, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    const slug = toSlug(name);
    if (!lv.check({ name, password }, e.currentTarget)) { setErr(''); return; }
    setBusy(true); setErr('');
    try {
      const { token } = await api(`/client-galleries/${encodeURIComponent(slug)}/login`, { method: 'POST', body: { password, brand: 'babysteps' } });
      galleryToken.set(slug, token);
      navigate(`/client/${slug}`);
    } catch (e2) {
      setErr(e2.status === 429 ? 'Too many attempts — please wait a few minutes and try again.' : e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="cl">
      <div className="cl-art">
        <img src={IMG.newborn} alt="" />
        <div className="cl-art-copy">
          <p className="bh-script">Your little moments,</p>
          <p className="caps-line">kept safe in one private place.</p>
        </div>
      </div>
      <div className="cl-panel">
        <Floral className="fl cl-fl" flip />
        <form className="cl-card" onSubmit={submit} noValidate>
          <span className="cl-lock"><IconLock width={22} height={22} /></span>
          <Label>Client gallery</Label>
          <h1 className="h2">Welcome <em>back</em></h1>
          <HeartDivider />
          <p className="muted">View your photos, heart your favourites for the album and download your memories. Your gallery name and password are in the message we sent you.</p>
          <label className="cl-field">
            <span>Gallery name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. baby-aarav" autoComplete="username" autoCapitalize="none" spellCheck="false" maxLength={50} {...lv.field('name')} />
            {lv.error('name')}
          </label>
          <label className="cl-field">
            <span>Password</span>
            <span className="cl-pass">
              <input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" maxLength={100} {...lv.field('password')} />
              <button type="button" onClick={() => setShow((s) => !s)}>{show ? 'Hide' : 'Show'}</button>
            </span>
            {lv.error('password')}
          </label>
          {err && <p className="cl-err" role="alert">{err}</p>}
          <button className="btn btn-dark btn-block" type="submit" disabled={busy}>{busy ? 'Opening…' : 'Open my gallery'}</button>
          <p className="cl-help">Can't find your details? <a href={waLink('Hi BabySteps! I need help accessing my client gallery.')} target="_blank" rel="noreferrer">Message us on WhatsApp</a></p>
        </form>
      </div>
    </section>
  );
}

/* ---------------- Gallery ---------------- */
function Paywall({ data, slug }) {
  const g = data.gallery || {};
  return (
    <section className="cg-state">
      {g.cover && <img className="cg-state-bg" src={sized(g.cover, 1600)} alt="" />}
      <div className="cg-state-card">
        <span className="cl-lock"><IconLock width={22} height={22} /></span>
        <Label>{g.title}</Label>
        <h1 className="h2">Keep your <em>memories</em></h1>
        <p className="muted">
          Your free gallery period has ended. Your {g.photoCount} photos{g.favoriteCount ? ` and ${g.favoriteCount} favourites` : ''} are safe —
          renew hosting to keep viewing and downloading them.
        </p>
        {data.plans?.length > 0 && (
          <ul className="cg-plans">
            {data.plans.map((p) => <li key={p.code}><b>{p.name}</b><span>{inr(p.amount)} / {p.period === 'yearly' ? 'year' : 'month'}</span></li>)}
          </ul>
        )}
        <div className="cg-state-actions">
          <a className="btn btn-dark" href={waLink(`Hi BabySteps! I'd like to renew hosting for my gallery "${slug}".`)} target="_blank" rel="noreferrer"><WhatsAppIcon size={18} /> Renew with us</a>
          <Link className="btn btn-line" to="/client" onClick={() => galleryToken.set(slug, null)}>Sign out</Link>
        </div>
      </div>
    </section>
  );
}

function VideoEmbed({ v }) {
  if (v.kind === 'youtube') return <iframe src={`https://www.youtube-nocookie.com/embed/${v.ref}?rel=0`} title={v.title || 'Film'} allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" />;
  if (v.kind === 'drive') return <iframe src={`https://drive.google.com/file/d/${v.ref}/preview`} title={v.title || 'Film'} allow="autoplay; fullscreen" allowFullScreen loading="lazy" />;
  return <video src={asset(v.ref)} poster={v.poster ? asset(v.poster) : undefined} controls preload="metadata" />;
}

export function ClientGallery() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const token = galleryToken.get(slug);
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [view, setView] = useState('all');
  const [box, setBox] = useState(-1);
  const [toast, setToast] = useState('');
  const [confirm, setConfirm] = useState(false);
  usePage(state.data?.title ? `${state.data.title} · Gallery` : 'Your Gallery');

  const loadedAt = useRef(0);
  const load = useCallback(async () => {
    if (!token) { navigate(`/client?g=${slug}`, { replace: true }); return; }
    try {
      const data = await api(`/client-galleries/${slug}`, { token });
      loadedAt.current = Date.now();
      setState({ loading: false, data, error: null });
    } catch (e) {
      if (e.status === 401) { galleryToken.set(slug, null); navigate(`/client?g=${slug}&expired=1`, { replace: true }); return; }
      setState({ loading: false, data: e.data || null, error: e });
    }
  }, [slug, token, navigate]);
  useEffect(() => { load(); }, [load]);

  // Photo links are signed and expire (~1 day). iPhone Safari keeps tabs alive for days and restores them
  // without reloading, so refresh the links when the gallery comes back after a while…
  useEffect(() => {
    const STALE = 60 * 60 * 1000;
    const wake = () => { if (document.visibilityState === 'visible' && loadedAt.current && Date.now() - loadedAt.current > STALE) load(); };
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('pageshow', wake);
    window.addEventListener('focus', wake);
    return () => { document.removeEventListener('visibilitychange', wake); window.removeEventListener('pageshow', wake); window.removeEventListener('focus', wake); };
  }, [load]);
  // …and once more if a photo fails to load (expired link or a network blip), at most once a minute.
  const lastRetry = useRef(0);
  const onPhotoFail = useCallback(() => {
    if (Date.now() - lastRetry.current < 60 * 1000) return;
    lastRetry.current = Date.now();
    load();
  }, [load]);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 2800); };
  const g = state.data;
  const photos = g?.photos || [];
  const favs = photos.filter((p) => p.favorite);
  const shown = view === 'fav' ? favs : photos;
  const submitted = Boolean(g?.selectionSubmittedAt);
  const limit = g?.selectionLimit || 0;

  const toggle = async (photo) => {
    if (submitted) { flash('Your selection is submitted — contact us to make changes.'); return; }
    const next = !photo.favorite;
    if (next && limit && favs.length >= limit) { flash(`You can pick up to ${limit} photos for your album.`); return; }
    setState((s) => ({ ...s, data: { ...s.data, photos: s.data.photos.map((p) => (p._id === photo._id ? { ...p, favorite: next } : p)) } }));
    try {
      await api(`/client-galleries/${slug}/photos/${photo._id}`, { method: 'PATCH', token, body: { favorite: next } });
    } catch (e) {
      setState((s) => ({ ...s, data: { ...s.data, photos: s.data.photos.map((p) => (p._id === photo._id ? { ...p, favorite: !next } : p)) } }));
      flash(e.message);
    }
  };

  const submitSelection = async () => {
    setConfirm(false);
    try {
      const { submittedAt } = await api(`/client-galleries/${slug}/submit`, { method: 'POST', token });
      setState((s) => ({ ...s, data: { ...s.data, selectionSubmittedAt: submittedAt } }));
      flash('Thank you! Your album selection has been sent to the studio.');
    } catch (e) { flash(e.message); }
  };

  // Lightbox keyboard
  const step = useCallback((d) => setBox((b) => (b + d + shown.length) % shown.length), [shown.length]);
  useEffect(() => {
    if (box < 0) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setBox(-1);
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [box, step]);
  const swipe = useSwipe({ onPrev: () => step(-1), onNext: () => step(1) });

  const signOut = () => { galleryToken.set(slug, null); navigate('/client'); };
  const access = g?.access;
  const pct = useMemo(() => (limit ? Math.min(100, Math.round((favs.length / limit) * 100)) : 0), [favs.length, limit]);

  if (state.loading) {
    return <section className="cg-loading"><span className="cg-spinner" /><p className="bh-script">Opening your gallery…</p></section>;
  }
  if (state.error?.status === 402) return <Paywall data={state.data} slug={slug} />;
  if (state.error) {
    return (
      <section className="cg-state">
        <div className="cg-state-card">
          <Label>Client gallery</Label>
          <h1 className="h2">{state.error.status === 410 ? <>Gallery <em>closed</em></> : <>Something went <em>wrong</em></>}</h1>
          <p className="muted">{state.error.message}</p>
          <div className="cg-state-actions">
            <a className="btn btn-dark" href={waLink(`Hi BabySteps! I need help with my gallery "${slug}".`)} target="_blank" rel="noreferrer"><WhatsAppIcon size={18} /> Contact the studio</a>
            <button className="btn btn-line" onClick={signOut}>Back to sign in</button>
          </div>
        </div>
      </section>
    );
  }

  const live = box >= 0 ? shown[box] : null;
  return (
    <>
      <section className="cg-hero">
        <img src={sized(g.cover || photos[0]?.src, 2000)} alt="" referrerPolicy="no-referrer" />
        <div className="wrap cg-hero-copy">
          <p className="caps-line light">Private gallery · {g.clientName}</p>
          <h1>{g.title}</h1>
          {g.eventDate && <p className="cg-date">{fmtDate(g.eventDate)}</p>}
          <div className="cg-stats">
            <span><b>{photos.length}</b> {photos.length === 1 ? 'photo' : 'photos'}</span>
            {g.videos?.length > 0 && <span><b>{g.videos.length}</b> {g.videos.length === 1 ? 'film' : 'films'}</span>}
            <span><b>{favs.length}</b> {favs.length === 1 ? 'favourite' : 'favourites'}</span>
            {access && !access.subscribed && <span className={access.daysLeft <= 14 ? 'warn' : ''}><b>{access.daysLeft}</b> days of access left</span>}
          </div>
        </div>
      </section>

      <div className="cg-bar">
        <div className="wrap cg-bar-row">
          <div className="cg-tabs" role="tablist">
            <button role="tab" aria-selected={view === 'all'} className={view === 'all' ? 'on' : ''} onClick={() => setView('all')}>All photos <small>{photos.length}</small></button>
            <button role="tab" aria-selected={view === 'fav'} className={view === 'fav' ? 'on' : ''} onClick={() => setView('fav')}><Heart size={14} /> Favourites <small>{favs.length}</small></button>
          </div>
          <div className="cg-actions">
            {limit > 0 && (
              <span className="cg-limit" title="Album picks">
                <span className="cg-limit-track"><i style={{ width: `${pct}%` }} /></span>
                {favs.length} / {limit} album picks
              </span>
            )}
            {submitted
              ? <span className="cg-done"><Icon name="check" size={16} /> Selection sent {fmtDate(g.selectionSubmittedAt)}</span>
              : <button className="btn btn-dark btn-sm" disabled={!favs.length} onClick={() => setConfirm(true)}>Submit selection</button>}
            <button className="cg-signout" onClick={signOut}>Sign out</button>
          </div>
        </div>
      </div>

      <section className="section cg-body">
        <div className="wrap">
          {!submitted && photos.length > 0 && (
            <p className="cg-tip"><Heart size={16} /> Tap the heart on the photos you love most — we'll use your favourites to design your album.</p>
          )}
          {shown.length === 0 ? (
            <div className="cg-empty">
              <p className="bh-script">{view === 'fav' ? 'No favourites yet' : 'Photos coming soon'}</p>
              <p className="muted">{view === 'fav' ? 'Tap the heart on any photo to add it here.' : 'Your photos are being edited with love. We’ll let you know the moment they’re ready.'}</p>
            </div>
          ) : (
            <div className="cg-grid">
              {shown.map((p, k) => (
                <figure key={p._id} className={`cg-photo ${p.favorite ? 'fav' : ''}`} style={{ '--d': `${(k % 12) * 40}ms` }}>
                  <button className="cg-open" onClick={() => setBox(k)} aria-label={`Open photo ${k + 1}`}>
                    <PhotoBox src={p.thumb || sized(p.src, 900)} w={p.w} h={p.h} alt={`Photo ${k + 1}`} imgProps={{ loading: 'lazy', referrerPolicy: 'no-referrer' }} onFail={onPhotoFail} />
                  </button>
                  <figcaption>
                    <span className="cg-no">{pad(photos.indexOf(p) + 1)}</span>
                    <span className="cg-tools">
                      <button className={`cg-heart ${p.favorite ? 'on' : ''}`} onClick={() => toggle(p)} aria-pressed={p.favorite} aria-label={p.favorite ? 'Remove from favourites' : 'Add to favourites'}><HeartFill on={p.favorite} /></button>
                      {g.allowDownload && <a className="cg-dl" href={p.download || downloadUrl(p.src)} download target="_blank" rel="noreferrer" aria-label="Download photo"><IconDownload /></a>}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}

          {g.videos?.length > 0 && view === 'all' && (
            <div className="cg-films">
              <div className="center-head"><Label>Your films</Label><h2 className="h2">Moments <em>in motion</em></h2></div>
              <div className="cg-film-grid">
                {g.videos.map((v) => (
                  <figure key={v._id} className="cg-film"><div className="cg-film-frame"><VideoEmbed v={v} /></div>{v.title && <figcaption>{v.title}</figcaption>}</figure>
                ))}
              </div>
            </div>
          )}

          <p className="cg-foot">Photos © {STUDIO.name}. Questions? <a href={waLink(`Hi BabySteps! A question about my gallery "${slug}".`)} target="_blank" rel="noreferrer">Message us on WhatsApp</a>.</p>
        </div>
      </section>

      {live && (
        <div className="lightbox cg-lb" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={() => setBox(-1)} {...swipe.bind}>
          <button className="lb-btn lb-close" aria-label="Close" onClick={() => setBox(-1)}><Icon name="close" /></button>
          <button className="lb-btn lb-prev" aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); step(-1); }}><Icon name="left" /></button>
          <figure onClick={(e) => e.stopPropagation()} key={live._id} style={swipe.style}>
            <LbPhoto src={sized(live.src, 2000)} thumb={live.thumb || sized(live.src, 900)} w={live.w} h={live.h} alt={`Photo ${box + 1}`} imgProps={{ referrerPolicy: 'no-referrer' }} onFail={onPhotoFail} />
            <figcaption className="cg-lb-bar">
              <span>{pad(box + 1)} / {pad(shown.length)}</span>
              <button className={`cg-heart ${live.favorite ? 'on' : ''}`} onClick={() => toggle(live)} aria-pressed={live.favorite}><HeartFill on={live.favorite} /> {live.favorite ? 'Favourite' : 'Add to favourites'}</button>
              {g.allowDownload && <a className="cg-dl" href={live.download || downloadUrl(live.src)} download target="_blank" rel="noreferrer"><IconDownload /> Download</a>}
            </figcaption>
          </figure>
          <button className="lb-btn lb-next" aria-label="Next photo" onClick={(e) => { e.stopPropagation(); step(1); }}><Icon name="right" /></button>
        </div>
      )}

      {confirm && (
        <div className="cg-modal" role="dialog" aria-modal="true" onClick={() => setConfirm(false)}>
          <div className="cg-modal-card" onClick={(e) => e.stopPropagation()}>
            <p className="bh-script">Send your selection?</p>
            <p className="muted">You've picked <b>{favs.length}</b> favourite{favs.length === 1 ? '' : 's'}. Once sent, we'll start designing your album — changes after this go through the studio.</p>
            <div className="cg-state-actions">
              <button className="btn btn-dark" onClick={submitSelection}>Yes, send it</button>
              <button className="btn btn-line" onClick={() => setConfirm(false)}>Keep choosing</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="cg-toast" role="status">{toast}</div>}
    </>
  );
}
