import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useTitle } from '../components/common.jsx';
import { useAccount } from './AccountContext.jsx';

/** Only allow redirects back into this site (never "//evil.com" or "https://…"). */
export const safeNext = (v) => (typeof v === 'string' && /^\/(?!\/)[\w\-./?=&#%]*$/.test(v) ? v : '/account');

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function passwordHint(p) {
  if (!p) return '';
  if (p.length < 8) return 'At least 8 characters.';
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return 'Mix letters and numbers.';
  return '';
}

/** Two-panel card: studio photo + the form. */
export function AuthShell({ eyebrow, title, intro, children, image = '/images/wedding/w15.jpg' }) {
  return (
    <section className="acct-auth">
      <div className="acct-auth__card">
        <div className="acct-auth__art" aria-hidden="true">
          <img src={image} alt="" />
          <div>
            <p>Guide Photo Studio</p>
            <strong>Your invitations and gift cards, <em>in one place.</em></strong>
          </div>
        </div>
        <div className="acct-auth__body">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="etitle">{title}</h1>
          {intro && <p className="acct-auth__intro">{intro}</p>}
          {children}
        </div>
      </div>
    </section>
  );
}

export function Field({ label, error, hint, children }) {
  return (
    <label className={`acct-field ${error ? 'has-err' : ''}`}>
      <span>{label}</span>
      {children}
      {error ? <small className="field-err" role="alert">{error}</small> : hint ? <small className="acct-field__hint">{hint}</small> : null}
    </label>
  );
}

export function PasswordInput({ value, onChange, autoComplete = 'current-password', invalid, inputRef }) {
  const [show, setShow] = useState(false);
  return (
    <span className="acct-pw">
      <input ref={inputRef} type={show ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} maxLength={100} aria-invalid={invalid || undefined} autoCapitalize="none" spellCheck={false} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>{show ? 'Hide' : 'Show'}</button>
    </span>
  );
}

/* ---------------- Log in ---------------- */
export function Login() {
  useTitle('Log in');
  const { user, login } = useAccount();
  const [q] = useSearchParams();
  const nav = useNavigate();
  const [f, setF] = useState({ email: '', password: '' });
  const [errs, setErrs] = useState({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const next = safeNext(q.get('next'));
  if (user) return <Navigate to={next} replace />;

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!EMAIL_RX.test(f.email.trim())) er.email = 'Please enter a valid email address.';
    if (!f.password) er.password = 'Please enter your password.';
    setErrs(er); setErr('');
    if (Object.keys(er).length) return;
    setBusy(true);
    try { await login(f.email.trim(), f.password); nav(next, { replace: true }); }
    catch (e2) { setErr(e2.message); setBusy(false); }
  };

  return (
    <AuthShell eyebrow="Welcome back" title={<>Log <em>in</em></>} intro="Edit your wedding invitation, see your RSVPs and check your gift cards.">
      <form className="acct-form" onSubmit={submit} noValidate>
        <Field label="Email" error={errs.email}>
          <input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" maxLength={160} aria-invalid={errs.email ? true : undefined} />
        </Field>
        <Field label="Password" error={errs.password}>
          <PasswordInput value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} invalid={Boolean(errs.password)} />
        </Field>
        <div className="acct-form__row"><Link to="/account/forgot" className="acct-link">Forgot password?</Link></div>
        {err && <p className="acct-alert" role="alert">{err}</p>}
        <button className="ebtn ebtn--dark acct-form__submit" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        <p className="acct-form__alt">New here? <Link to={`/account/register${q.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} className="acct-link">Create an account</Link></p>
        <p className="acct-form__alt">Looking for your wedding photos? <Link to="/client" className="acct-link">Client gallery login</Link></p>
      </form>
    </AuthShell>
  );
}

/* ---------------- Register ---------------- */
export function Register() {
  useTitle('Create account');
  const { user, register } = useAccount();
  const [q] = useSearchParams();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '', acceptTerms: false });
  const [errs, setErrs] = useState({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const next = safeNext(q.get('next'));
  if (user) return <Navigate to={next} replace />;
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }); setErrs((x) => ({ ...x, [k]: '' })); };

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (f.name.trim().length < 2) er.name = 'Please enter your name.';
    if (!EMAIL_RX.test(f.email.trim())) er.email = 'Please enter a valid email address.';
    const ph = passwordHint(f.password) || (!f.password ? 'Please choose a password.' : '');
    if (ph) er.password = ph;
    if (!f.acceptTerms) er.acceptTerms = 'Please accept the privacy policy to continue.';
    setErrs(er); setErr('');
    if (Object.keys(er).length) return;
    setBusy(true);
    try { await register({ ...f, name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim() }); nav(next === '/account' ? '/account?welcome=1' : next, { replace: true }); }
    catch (e2) { setErrs(e2.data?.fields || {}); setErr(e2.message); setBusy(false); }
  };

  return (
    <AuthShell eyebrow="Create your account" title={<>Join <em>us</em></>} intro="Create your wedding invitation yourself, track RSVPs and keep all your gift cards in one place." image="/images/home/couple-3.jpg">
      <form className="acct-form" onSubmit={submit} noValidate>
        <Field label="Your name" error={errs.name}><input value={f.name} onChange={set('name')} autoComplete="name" maxLength={80} aria-invalid={errs.name ? true : undefined} /></Field>
        <div className="acct-form__two">
          <Field label="Email" error={errs.email} hint="We’ll send a link to confirm it."><input type="email" value={f.email} onChange={set('email')} autoComplete="email" maxLength={160} aria-invalid={errs.email ? true : undefined} /></Field>
          <Field label="Mobile (optional)" error={errs.phone}><input value={f.phone} onChange={set('phone')} inputMode="tel" autoComplete="tel" maxLength={18} placeholder="+91 98765 43210" aria-invalid={errs.phone ? true : undefined} /></Field>
        </div>
        <Field label="Password" error={errs.password} hint="At least 8 characters, with letters and numbers.">
          <PasswordInput value={f.password} onChange={set('password')} autoComplete="new-password" invalid={Boolean(errs.password)} />
        </Field>
        <label className={`acct-check ${errs.acceptTerms ? 'has-err' : ''}`}>
          <input type="checkbox" checked={f.acceptTerms} onChange={set('acceptTerms')} />
          <span>I agree to the <Link to="/privacy" target="_blank" className="acct-link">privacy policy</Link>.</span>
        </label>
        {errs.acceptTerms && <small className="field-err">{errs.acceptTerms}</small>}
        {err && !Object.keys(errs).some((k) => errs[k]) && <p className="acct-alert" role="alert">{err}</p>}
        <button className="ebtn ebtn--dark acct-form__submit" disabled={busy}>{busy ? 'Creating your account…' : 'Create account'}</button>
        <p className="acct-form__alt">Already have an account? <Link to={`/account/login${q.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} className="acct-link">Log in</Link></p>
      </form>
    </AuthShell>
  );
}

/* ---------------- Forgot password ---------------- */
export function Forgot() {
  useTitle('Forgot password');
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!EMAIL_RX.test(email.trim())) { setErr('Please enter a valid email address.'); return; }
    setBusy(true); setErr('');
    try { await api('/account/forgot', { method: 'POST', body: { email: email.trim() } }); setSent(true); }
    catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };
  return (
    <AuthShell eyebrow="Reset your password" title={<>Forgot <em>password?</em></>} intro={sent ? null : 'Enter the email you signed up with and we’ll send you a link to choose a new password.'}>
      {sent ? (
        <div className="acct-done" role="status">
          <p>If there’s an account for <b>{email.trim()}</b>, a reset link is on its way. It works for 1 hour.</p>
          <p className="acct-field__hint">Can’t see it? Check your spam folder, or try again in a few minutes.</p>
          <Link to="/account/login" className="ebtn ebtn--line">Back to log in</Link>
        </div>
      ) : (
        <form className="acct-form" onSubmit={submit} noValidate>
          <Field label="Email" error={err}><input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(''); }} autoComplete="email" maxLength={160} aria-invalid={err ? true : undefined} /></Field>
          <button className="ebtn ebtn--dark acct-form__submit" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
          <p className="acct-form__alt"><Link to="/account/login" className="acct-link">Back to log in</Link></p>
        </form>
      )}
    </AuthShell>
  );
}

/* ---------------- Reset password (from the email link) ---------------- */
export function Reset() {
  useTitle('Choose a new password');
  const [q] = useSearchParams();
  const token = q.get('token') || '';
  const { setUser } = useAccount();
  const nav = useNavigate();
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    const h = passwordHint(pw) || (!pw ? 'Please choose a password.' : '');
    if (h) { setErr(h); return; }
    setBusy(true); setErr('');
    try {
      const d = await api('/account/reset', { method: 'POST', body: { token, password: pw } });
      setUser(d.user);
      nav('/account?reset=1', { replace: true });
    } catch (e2) { setErr(e2.message); setBusy(false); }
  };
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return (
      <AuthShell eyebrow="Reset your password" title={<>Link <em>not valid</em></>} intro="This reset link is incomplete. Please request a new one.">
        <Link to="/account/forgot" className="ebtn ebtn--dark">Request a new link</Link>
      </AuthShell>
    );
  }
  return (
    <AuthShell eyebrow="Reset your password" title={<>Choose a <em>new password</em></>} intro="You’ll be logged in straight away, and signed out on any other devices.">
      <form className="acct-form" onSubmit={submit} noValidate>
        <Field label="New password" error={err} hint="At least 8 characters, with letters and numbers.">
          <PasswordInput value={pw} onChange={(e) => { setPw(e.target.value); setErr(''); }} autoComplete="new-password" invalid={Boolean(err)} />
        </Field>
        <button className="ebtn ebtn--dark acct-form__submit" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button>
        {err && /expired|used|valid/.test(err) && <p className="acct-form__alt"><Link to="/account/forgot" className="acct-link">Request a new link</Link></p>}
      </form>
    </AuthShell>
  );
}

/* ---------------- Verify email (from the email link) ---------------- */
export function Verify() {
  useTitle('Confirm email');
  const [q] = useSearchParams();
  const token = q.get('token') || '';
  const { user, setUser } = useAccount();
  const [state, setState] = useState('working');
  const [msg, setMsg] = useState('');
  const once = useRef(false);
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    api('/account/verify', { method: 'POST', body: { token } })
      .then(() => { setState('ok'); if (user) setUser({ ...user, emailVerified: true }); })
      .catch((e) => { setState('error'); setMsg(e.message); });
  }, [token, user, setUser]);
  return (
    <AuthShell eyebrow="Confirm your email" title={state === 'ok' ? <>Email <em>confirmed</em></> : state === 'error' ? <>Link <em>didn’t work</em></> : <>One <em>moment…</em></>}>
      {state === 'working' && <p className="acct-auth__intro">Confirming your email address…</p>}
      {state === 'ok' && (
        <div className="acct-done" role="status">
          <p>Thank you — your email is confirmed. Your gift cards and invitation tools are ready.</p>
          <Link to={user ? '/account' : '/account/login'} className="ebtn ebtn--dark">{user ? 'Go to my account' : 'Log in'}</Link>
        </div>
      )}
      {state === 'error' && (
        <div className="acct-done" role="alert">
          <p>{msg}</p>
          <Link to={user ? '/account' : '/account/login'} className="ebtn ebtn--line">{user ? 'Go to my account' : 'Log in'}</Link>
        </div>
      )}
    </AuthShell>
  );
}
