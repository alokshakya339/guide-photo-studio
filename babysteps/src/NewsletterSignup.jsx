import { useState } from 'react';
import { api } from './api.js';
import { checkEmail } from './validation.js';

/** Footer sign-up for the studio's email updates (offers, new sets, booking windows, parenting tips). */
export default function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [hp, setHp] = useState(''); // honeypot
  const [state, setState] = useState('idle'); // idle | busy | done
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const problem = checkEmail(email, { required: true });
    if (problem) { setErr(problem); return; }
    setState('busy'); setErr('');
    try { await api('/newsletter/subscribe', { method: 'POST', body: { email: email.trim(), website: hp } }); setState('done'); }
    catch (e2) { setErr(e2.message); setState('idle'); }
  };

  return (
    <div className="wrap footer-news">
      <div className="footer-news-copy">
        <h4>The BabySteps letter</h4>
        <p>Offers, new studio sets and open booking dates — plus gentle tips for parents. Once or twice a month, never spam.</p>
      </div>
      {state === 'done' ? (
        <p className="footer-news-done" role="status">💌 You're on the list! Watch your inbox for our next letter.</p>
      ) : (
        <form className="footer-news-form" onSubmit={submit} noValidate>
          <input type="text" name="website" value={hp} onChange={(e) => setHp(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hp" />
          <label className="sr-only" htmlFor="news-email">Email address</label>
          <input id="news-email" type="email" inputMode="email" autoComplete="email" placeholder="Your email address" value={email}
            onChange={(e) => { setEmail(e.target.value); if (err) setErr(''); }} aria-invalid={err ? true : undefined} aria-describedby={err ? 'news-err' : undefined} />
          <button className="btn btn-gold" disabled={state === 'busy'}>{state === 'busy' ? 'Joining…' : 'Subscribe'}</button>
          {err && <small id="news-err" className="footer-news-err" role="alert">{err}</small>}
        </form>
      )}
    </div>
  );
}
