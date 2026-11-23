import { useCallback, useEffect, useMemo, useState } from 'react';
import DatePicker from '../components/DatePicker.jsx';
import Select from '../components/Select.jsx';
import { Link, NavLink, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useTitle } from '../components/common.jsx';
import { useToast } from '../components/Toast.jsx';
import { useDialog } from '../components/Dialog.jsx';
import { IconArrow, IconWhatsApp } from '../components/Icons.jsx';
import { TEMPLATES } from '../invites/InvitePage.jsx';
import { Editor, customerApi } from '../admin/InvitationsAdmin.jsx';
import { SITE } from '../site.js';
import { useAccount, useAccountCall } from './AccountContext.jsx';
import { Field, PasswordInput } from './AuthPages.jsx';
import { loadRazorpay } from '../razorpay.js';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const slugify = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const SLUG_RX = /^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$/;
const first = (n) => String(n || '').trim().split(/\s+/)[0];
const STATUS_HELP = {
  draft: 'Not live yet — only you can see it. Fill it in, then pay & publish from the “Pay & publish” tab.',
  preview: 'Not live yet. Pay & publish from the “Pay & publish” tab whenever you’re ready.',
  published: 'Live — share the link with your guests.',
  archived: 'Archived. Contact the studio to reopen it.',
};
const statusLabel = (i) => (i.status === 'published' ? 'Live' : i.status === 'archived' ? 'Archived' : i.paymentStatus === 'pending' ? 'Draft · not paid' : 'Paid · with the studio');

/* ---------------- guard ---------------- */
export function RequireAccount({ children }) {
  const { user, loading } = useAccount();
  const loc = useLocation();
  if (loading) return <div className="acct-loading" aria-busy="true"><span /></div>;
  if (!user) return <Navigate to={`/account/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return children;
}

/* ---------------- shell ---------------- */
function AccountShell({ children }) {
  const { user, logout, setUser } = useAccount();
  const toast = useToast();
  const nav = useNavigate();
  const [q, setQ] = useSearchParams();
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (q.get('welcome')) toast({ title: `Welcome, ${first(user.name)}!`, message: 'We’ve emailed you a link to confirm your address.' });
    if (q.get('reset')) toast({ title: 'Password updated', message: 'You’re logged in. Other devices have been signed out.' });
    if (q.get('welcome') || q.get('reset')) { q.delete('welcome'); q.delete('reset'); setQ(q, { replace: true }); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resend = async () => {
    setSending(true);
    try {
      const d = await api('/account/verify/resend', { method: 'POST' });
      if (d.alreadyVerified) setUser({ ...user, emailVerified: true });
      toast({ title: 'Email sent', message: `Check ${user.email} for the confirmation link.` });
    } catch (e) { toast({ type: 'error', title: 'Couldn’t send', message: e.message }); }
    finally { setSending(false); }
  };
  const signOut = async () => { nav('/', { replace: true }); await logout(); };

  return (
    <section className="acct">
      <div className="container">
        <header className="acct__head">
          <div>
            <p className="eyebrow">My account</p>
            <h1 className="etitle">Hello, <em>{first(user.name)}</em></h1>
            <p className="acct__email">{user.email}</p>
          </div>
          <button type="button" className="ebtn ebtn--line" onClick={signOut}>Log out</button>
        </header>
        {!user.emailVerified && (
          <div className="acct-banner" role="status">
            <span>Please confirm your email address — we sent a link to <b>{user.email}</b>. You need it to see gift cards and send your invitation to the studio.</span>
            <button type="button" className="acct-link" onClick={resend} disabled={sending}>{sending ? 'Sending…' : 'Resend link'}</button>
          </div>
        )}
        <nav className="acct__tabs" aria-label="Account sections">
          <NavLink to="/account" end>Invitations</NavLink>
          <NavLink to="/account/gift-cards">Gift cards</NavLink>
          <NavLink to="/account/profile">Profile &amp; security</NavLink>
        </nav>
        {children}
      </div>
    </section>
  );
}

/* ---------------- invitations ---------------- */
export function AccountInvitations() {
  useTitle('My invitations');
  const call = useAccountCall();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useSearchParams();
  const wanted = q.get('new');
  const [creating, setCreating] = useState(Boolean(wanted));
  const nav = useNavigate();
  const load = useCallback(() => call('/account/invitations').then(setData).catch((e) => setErr(e.message)), [call]);
  useEffect(() => { load(); }, [load]);
  const list = data?.invitations || [];

  return (
    <AccountShell>
      {err && <p className="acct-alert" role="alert">{err}</p>}
      {!data ? <div className="acct-loading"><span /></div> : creating || list.length === 0 ? (
        <CreateInvite call={call} first={list.length === 0} initialPackage={wanted} onCancel={list.length ? () => { setCreating(false); q.delete('new'); setQ(q, { replace: true }); } : null} onCreated={(inv) => nav(`/account/invitations/${inv._id}`)} />
      ) : (
        <>
          <div className="acct__bar">
            <p className="acct__muted">{list.length} invitation{list.length === 1 ? '' : 's'}</p>
            <button type="button" className="ebtn ebtn--dark" onClick={() => setCreating(true)}>+ New invitation</button>
          </div>
          <div className="acct-invites">
            {list.map((i) => {
              const url = `/invite/${i.slug}${i.status === 'published' ? '' : `?preview=${i.previewToken}`}`;
              return (
                <article key={i._id} className="acct-invite">
                  <Link to={`/account/invitations/${i._id}`} className="acct-invite__thumb" style={i.coverPhoto ? { backgroundImage: `url(${i.coverPhoto})` } : undefined} aria-label={`Edit ${i.partner1} & ${i.partner2}`}>
                    {!i.coverPhoto && <span>{(i.partner1 || '?')[0]}&amp;{(i.partner2 || '?')[0]}</span>}
                    <em className={`acct-chip is-${i.status}`}>{statusLabel(i)}</em>
                  </Link>
                  <div className="acct-invite__body">
                    <h3>{i.partner1} &amp; {i.partner2}</h3>
                    <p className="acct__muted">{i.weddingDate ? fmt(i.weddingDate) : 'No date yet'} · {TEMPLATES[i.template]?.name || i.template} · {i.package} package</p>
                    <p className="acct-invite__help">{STATUS_HELP[i.status]}</p>
                    {(i.stats.responses > 0 || i.views > 0) && <p className="acct__muted">{i.views} views · {i.stats.responses} RSVPs · {i.stats.guests} guests coming{i.stats.pendingWishes ? ` · ${i.stats.pendingWishes} blessings to approve` : ''}</p>}
                    <div className="acct-invite__actions">
                      <Link to={`/account/invitations/${i._id}`} className="ebtn ebtn--dark">Edit</Link>
                      {i.paymentStatus === 'pending' && i.status !== 'archived' && <Link to={`/account/invitations/${i._id}?tab=share`} className="ebtn ebtn--line">Pay &amp; publish</Link>}
                      <a href={url} target="_blank" rel="noreferrer" className="acct-link">{i.status === 'published' ? 'Open live invitation ↗' : 'Preview ↗'}</a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </AccountShell>
  );
}

function CreateInvite({ call, first: isFirst, initialPackage, onCancel, onCreated }) {
  const [pkgs, setPkgs] = useState(null);
  const [f, setF] = useState({ package: initialPackage || 'signature', partner1: '', partner2: '', slug: '', weddingDate: '', template: 'royal' });
  const [touched, setTouched] = useState(false);
  const [errs, setErrs] = useState({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { api('/invites/packages').then(setPkgs).catch(() => setPkgs([])); }, []);
  const set = (k, v) => setF((x) => {
    const n = { ...x, [k]: v };
    if (!touched && (k === 'partner1' || k === 'partner2')) n.slug = slugify(`${n.partner1} ${n.partner2}`);
    return n;
  });
  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!f.partner1.trim()) er.partner1 = 'Please enter a name.';
    if (!f.partner2.trim()) er.partner2 = 'Please enter a name.';
    if (!SLUG_RX.test(f.slug)) er.slug = 'Use 3–60 lowercase letters, numbers and dashes.';
    setErrs(er); setErr('');
    if (Object.keys(er).length) return;
    setBusy(true);
    try { onCreated(await call('/account/invitations', { method: 'POST', body: { ...f, partner1: f.partner1.trim(), partner2: f.partner2.trim() } })); }
    catch (e2) { setErrs(e2.data?.fields || {}); setErr(e2.message); setBusy(false); }
  };

  return (
    <form className="acct-create" onSubmit={submit} noValidate>
      <div className="acct-create__head">
        <p className="eyebrow">{isFirst ? 'Get started' : 'New invitation'}</p>
        <h2 className="etitle">Create your <em>wedding invitation</em></h2>
        <p className="acct__muted">Choose a package and add your names. Then fill in events, photos and music and preview it as much as you like — you only pay when you’re happy and ready to publish.</p>
      </div>
      <div className="acct-pkgs" role="radiogroup" aria-label="Package">
        {(pkgs || []).map((p) => (
          <button type="button" role="radio" aria-checked={f.package === p.code} key={p.code} className={`acct-pkg ${f.package === p.code ? 'is-on' : ''}`} onClick={() => set('package', p.code)}>
            <strong>{p.name}</strong>
            <span className="acct-pkg__price">{inr(p.price)}</span>
            <small>{p.tagline}</small>
          </button>
        ))}
      </div>
      {errs.package && <small className="field-err">{errs.package}</small>}
      <div className="acct-form__two">
        <Field label="Bride / partner 1" error={errs.partner1}><input value={f.partner1} onChange={(e) => set('partner1', e.target.value)} placeholder="Riya" maxLength={60} /></Field>
        <Field label="Groom / partner 2" error={errs.partner2}><input value={f.partner2} onChange={(e) => set('partner2', e.target.value)} placeholder="Raman" maxLength={60} /></Field>
      </div>
      <div className="acct-form__two">
        <Field label="Your invitation link" error={errs.slug} hint={`${window.location.origin}/invite/${f.slug || 'riya-raman'}`}>
          <input value={f.slug} onChange={(e) => { setTouched(true); set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }} placeholder="riya-raman" maxLength={60} />
        </Field>
        <Field label="Wedding date (optional)" error={errs.weddingDate}><DatePicker value={f.weddingDate} onChange={(v) => set('weddingDate', v)} ariaLabel="Wedding date" invalid={Boolean(errs.weddingDate)} /></Field>
      </div>
      <Field label="Design">
        <Select value={f.template} onChange={(v) => set('template', v)} options={Object.entries(TEMPLATES).map(([value, t]) => ({ value, label: t.name }))} ariaLabel="Design" />
      </Field>
      {err && !Object.values(errs).some(Boolean) && <p className="acct-alert" role="alert">{err}</p>}
      <div className="acct-create__btns">
        <button className="ebtn ebtn--dark" disabled={busy}>{busy ? 'Creating…' : 'Create & start editing'}</button>
        {onCancel && <button type="button" className="ebtn ebtn--line" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}

/** The "Pay & publish" tab inside the editor (customer view): choose/confirm the package, pay, go live, share. */
function SharePane({ inv, setInv, setSaved, save, dirty }) {
  const call = useAccountCall();
  const toast = useToast();
  const [checkout, setCheckout] = useState(null);
  const [pkgs, setPkgs] = useState([]);
  const [busy, setBusy] = useState('');
  const [payErr, setPayErr] = useState('');
  const origin = window.location.origin;
  const preview = `${origin}/invite/${inv.slug}?preview=${inv.previewToken}`;
  const live = `${origin}/invite/${inv.slug}`;
  const unpaid = inv.paymentStatus === 'pending';
  const copy = async (t, what) => { try { await navigator.clipboard.writeText(t); toast({ title: `${what} copied` }); } catch { /* ignore */ } };
  const wa = (text) => `https://wa.me/?text=${encodeURIComponent(text)}`;
  const studioWa = `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(`Hi Guide Studio! About my invitation ${inv.partner1} & ${inv.partner2} (/invite/${inv.slug}).`)}`;

  const loadCheckout = useCallback(() => call(`/account/invitations/${inv._id}/checkout`).then(setCheckout).catch(() => {}), [call, inv._id]);
  useEffect(() => { loadCheckout(); }, [loadCheckout, inv.package, inv.events?.length, inv.weddingDate]);
  useEffect(() => { api('/invites/packages').then(setPkgs).catch(() => {}); }, []);

  const changePackage = async (code) => {
    if (code === inv.package) return;
    setBusy('pkg');
    try {
      const d = await call(`/account/invitations/${inv._id}`, { method: 'PUT', body: { package: code } });
      setInv(d); setSaved(JSON.stringify(d));
      toast({ title: 'Package changed', message: 'The preview now shows what this package includes.' });
    } catch (e) { toast({ type: 'error', title: 'Couldn’t change package', message: e.message }); }
    finally { setBusy(''); }
  };

  const pay = async () => {
    setPayErr(''); setBusy('pay');
    try {
      if (dirty) await save();
      const [order] = await Promise.all([call(`/account/invitations/${inv._id}/pay`, { method: 'POST' }), loadRazorpay()]);
      const rzp = new window.Razorpay({
        key: order.keyId, order_id: order.orderId, amount: order.amount, currency: order.currency,
        name: SITE.name, description: order.description, prefill: order.prefill, theme: { color: '#1d1a17' },
        handler: async (result) => {
          setBusy('verify');
          try {
            const d = await call(`/account/invitations/${inv._id}/pay/verify`, { method: 'POST', body: result });
            setInv(d); setSaved(JSON.stringify(d)); loadCheckout();
            toast({ title: 'Payment received — your invitation is live! 🎉', message: 'Share the link below with your guests.' });
          } catch (e) { setPayErr(e.message); }
          finally { setBusy(''); }
        },
        modal: { ondismiss: () => setBusy('') },
      });
      rzp.on('payment.failed', (r) => setPayErr(r?.error?.description || 'The payment failed. You haven’t been charged.'));
      rzp.open();
    } catch (e) { setPayErr(e.message); setBusy(''); }
  };

  const pkg = checkout?.package;
  return (
    <div className="ivx__pane acct-share">
      {unpaid && inv.status !== 'archived' ? (
        <div className="acct-buy">
          <p className="acct-buy__k">Step 3 of 3 · Pay &amp; publish</p>
          <h4>Happy with your invitation?</h4>
          <p className="acct__muted">Pay once and it goes live straight away at <b>{live.replace(/^https?:\/\//, '')}</b>. You can keep editing after it’s live.</p>
          <div className="acct-buy__pkgs" role="radiogroup" aria-label="Package">
            {pkgs.map((p) => (
              <button key={p.code} type="button" role="radio" aria-checked={inv.package === p.code} className={`acct-pkg ${inv.package === p.code ? 'is-on' : ''}`} onClick={() => changePackage(p.code)} disabled={Boolean(busy)}>
                <strong>{p.name}</strong><span className="acct-pkg__price">{inr(p.price)}</span><small>{p.tagline}</small>
              </button>
            ))}
          </div>
          {checkout?.problem && <p className="ivx__locked">Almost there: {checkout.problem}</p>}
          {checkout && !checkout.enabled && <p className="ivx__locked">Online payment isn’t available right now — message the studio on WhatsApp and we’ll publish it for you.</p>}
          <div className="acct-buy__total">
            <span>Total</span><b>{pkg ? inr(pkg.price) : '—'}</b>
          </div>
          <button type="button" className="btn btn--primary acct-buy__btn" onClick={pay} disabled={!checkout?.enabled || Boolean(checkout?.problem) || Boolean(busy)}>
            {busy === 'pay' ? 'Opening secure payment…' : busy === 'verify' ? 'Confirming payment…' : `Pay ${pkg ? inr(pkg.price) : ''} & publish`}
          </button>
          {payErr && <p className="acct-alert" role="alert">{payErr}</p>}
          <p className="muted small">Secure payment by Razorpay · UPI, cards, net banking and wallets.{checkout?.testMode ? ' (Test mode: use a Razorpay test card.)' : ''}</p>
        </div>
      ) : (
        <>
          <h4>Status</h4>
          <p className="acct-share__status"><em className={`acct-chip is-${inv.status}`}>{statusLabel(inv)}</em> {STATUS_HELP[inv.status]}</p>
          {inv.paidAt && <p className="acct__muted">Paid {inr(inv.paidAmount)} on {fmt(inv.paidAt)} · {inv.package} package. Thank you!</p>}
          {!unpaid && inv.status !== 'published' && inv.status !== 'archived' && <p className="acct__muted">Your payment is received — the studio will publish it shortly.</p>}
        </>
      )}

      <h4>Links</h4>
      {inv.status === 'published' && (
        <div className="ivx__link"><span>Live link for guests</span><code>{live}</code><button type="button" className="link-btn" onClick={() => copy(live, 'Live link')}>Copy</button><a className="link-btn" href={wa(`You're invited! 💌 ${inv.partner1} & ${inv.partner2}\n${live}`)} target="_blank" rel="noreferrer">Share on WhatsApp</a></div>
      )}
      <div className="ivx__link"><span>Private preview</span><code>{preview}</code><button type="button" className="link-btn" onClick={() => copy(preview, 'Preview link')}>Copy</button><a className="link-btn" href={wa(`Have a look at our wedding invitation — a preview, not the final invite 💌\n${preview}`)} target="_blank" rel="noreferrer">Show family</a></div>
      {inv.status !== 'published' && <p className="acct__muted small">The preview is marked “Preview” and guests can’t RSVP or send blessings from it. Publish to get the real link for guests.</p>}

      <h4>Need help?</h4>
      <a className="btn btn--ghost btn--sm" href={studioWa} target="_blank" rel="noreferrer"><IconWhatsApp width={16} height={16} /> Message the studio</a>
    </div>
  );
}

export function AccountInvitationEditor() {
  useTitle('Edit invitation');
  const { id } = useParams();
  const call = useAccountCall();
  const nav = useNavigate();
  const renderShare = useCallback((p) => <SharePane {...p} />, []);
  return (
    <section className="acct acct--editor">
      <div className="container-wide">
        <Editor id={id} call={call} api={customerApi} onBack={() => nav('/account')} backLabel="← My invitations" renderShare={renderShare} />
      </div>
    </section>
  );
}

/* ---------------- gift cards ---------------- */
const CARD_STATUS = { active: 'Active', redeemed: 'Used', expired: 'Expired', cancelled: 'Cancelled' };

function GiftCardRow({ g, kind }) {
  const toast = useToast();
  const copy = async () => { try { await navigator.clipboard.writeText(g.code); toast({ title: 'Code copied', message: g.code }); } catch { /* ignore */ } };
  return (
    <li className={`acct-gc is-${g.status}`}>
      <div className="acct-gc__card" aria-hidden="true"><small>Gift card</small><b>{inr(g.amount)}</b></div>
      <div className="acct-gc__body">
        <p className="acct-gc__code"><code>{g.code}</code> <button type="button" className="acct-link" onClick={copy}>Copy</button> <em className={`acct-chip is-${g.status}`}>{CARD_STATUS[g.status] || g.status}</em></p>
        <p className="acct__muted">
          {kind === 'bought' ? <>For {g.recipientName || 'someone special'} · bought {fmt(g.paidAt || g.createdAt)}</> : <>From {g.senderName || 'a friend'} · received {fmt(g.createdAt)}</>}
          {g.expiresAt && g.status === 'active' ? <> · valid until {fmt(g.expiresAt)}</> : null}
          {g.redeemedAt ? <> · used {fmt(g.redeemedAt)}</> : null}
        </p>
        {kind === 'bought' && g.paid != null && <p className="acct__muted">Paid {inr(g.paid)}{g.method ? ` by ${g.method.toUpperCase()}` : ''}{g.methodDetail ? ` (${g.methodDetail})` : ''}{g.orderId ? ` · Order ${g.orderId}` : ''}</p>}
        {g.message && <p className="acct-gc__msg">“{g.message}”</p>}
      </div>
    </li>
  );
}

export function AccountGiftCards() {
  useTitle('My gift cards');
  const { user } = useAccount();
  const call = useAccountCall();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { if (user.emailVerified) call('/account/gift-cards').then(setData).catch((e) => setErr(e.message)); }, [call, user.emailVerified]);
  const total = useMemo(() => (data?.bought || []).reduce((a, g) => a + (g.paid ?? g.amount), 0), [data]);

  return (
    <AccountShell>
      {!user.emailVerified ? (
        <p className="acct-empty">Confirm your email address to see the gift cards bought with, or sent to, <b>{user.email}</b>.</p>
      ) : err ? <p className="acct-alert" role="alert">{err}</p> : !data ? <div className="acct-loading"><span /></div> : (
        <>
          <div className="acct__bar">
            <p className="acct__muted">{data.bought.length} bought{data.bought.length ? ` · ${inr(total)} in total` : ''} · {data.received.length} received</p>
            <Link to="/gift-cards" className="ebtn ebtn--dark">Buy a gift card</Link>
          </div>
          <h2 className="acct__h2">Bought by you</h2>
          {data.bought.length === 0 ? <p className="acct-empty">No gift cards bought with {user.email} yet.</p> : <ul className="acct-gcs">{data.bought.map((g) => <GiftCardRow key={g.code} g={g} kind="bought" />)}</ul>}
          <h2 className="acct__h2">Sent to you</h2>
          {data.received.length === 0 ? <p className="acct-empty">No gift cards sent to {user.email} yet.</p> : <ul className="acct-gcs">{data.received.map((g) => <GiftCardRow key={g.code} g={g} kind="received" />)}</ul>}
          <p className="acct__muted acct__fine">Gift cards are matched to your account by email address. Bought one with a different email? <a className="acct-link" href={`https://wa.me/${SITE.whatsapp}`} target="_blank" rel="noreferrer">Message us</a> and we’ll help.</p>
        </>
      )}
    </AccountShell>
  );
}

/* ---------------- profile & security ---------------- */
export function AccountProfile() {
  useTitle('Profile & security');
  const { user, setUser, logout } = useAccount();
  const call = useAccountCall();
  const toast = useToast();
  const dialog = useDialog();
  const nav = useNavigate();
  const [p, setP] = useState({ name: user.name, phone: user.phone || '' });
  const [pErrs, setPErrs] = useState({});
  const [pw, setPw] = useState({ current: '', password: '' });
  const [pwErrs, setPwErrs] = useState({});
  const [busy, setBusy] = useState('');

  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy('profile'); setPErrs({});
    try { const d = await call('/account/me', { method: 'PATCH', body: p }); setUser(d.user); toast({ title: 'Profile saved' }); }
    catch (e2) { setPErrs(e2.data?.fields || { name: e2.message }); }
    finally { setBusy(''); }
  };
  const changePw = async (e) => {
    e.preventDefault();
    const er = {};
    if (!pw.current) er.current = 'Enter your current password.';
    if (pw.password.length < 8) er.password = 'At least 8 characters.';
    setPwErrs(er);
    if (Object.keys(er).length) return;
    setBusy('pw');
    try { await call('/account/password', { method: 'POST', body: pw }); setPw({ current: '', password: '' }); toast({ title: 'Password changed', message: 'Other devices have been signed out.' }); }
    catch (e2) { setPwErrs(e2.data?.fields || { password: e2.message }); }
    finally { setBusy(''); }
  };
  const everywhere = async () => {
    if (!(await dialog.confirm({ title: 'Log out everywhere?', message: 'You’ll be signed out on every device, including this one.', confirmLabel: 'Log out everywhere' }))) return;
    await call('/account/logout-all', { method: 'POST' }).catch(() => {});
    await logout();
    nav('/account/login', { replace: true });
  };

  return (
    <AccountShell>
      <div className="acct-profile">
        <form className="acct-form acct-panel" onSubmit={saveProfile} noValidate>
          <h2 className="acct__h2">Your details</h2>
          <Field label="Name" error={pErrs.name}><input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} autoComplete="name" maxLength={80} /></Field>
          <Field label="Mobile" error={pErrs.phone}><input value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} inputMode="tel" autoComplete="tel" maxLength={18} /></Field>
          <Field label="Email" hint={user.emailVerified ? 'Confirmed ✓ — contact the studio to change it.' : 'Not confirmed yet.'}><input value={user.email} readOnly disabled /></Field>
          <button className="ebtn ebtn--dark" disabled={busy === 'profile'}>{busy === 'profile' ? 'Saving…' : 'Save details'}</button>
        </form>
        <form className="acct-form acct-panel" onSubmit={changePw} noValidate>
          <h2 className="acct__h2">Change password</h2>
          <Field label="Current password" error={pwErrs.current}><PasswordInput value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} invalid={Boolean(pwErrs.current)} /></Field>
          <Field label="New password" error={pwErrs.password} hint="At least 8 characters, with letters and numbers."><PasswordInput value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} autoComplete="new-password" invalid={Boolean(pwErrs.password)} /></Field>
          <button className="ebtn ebtn--dark" disabled={busy === 'pw'}>{busy === 'pw' ? 'Saving…' : 'Change password'}</button>
          <hr />
          <p className="acct__muted">Lost a phone or used a shared computer?</p>
          <button type="button" className="ebtn ebtn--line" onClick={everywhere}>Log out of all devices</button>
        </form>
      </div>
    </AccountShell>
  );
}
