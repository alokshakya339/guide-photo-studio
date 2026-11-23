import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '../components/Toast.jsx';
import { useDialog } from '../components/Dialog.jsx';
import { SITE } from '../site.js';

const digits = (s) => String(s || '').replace(/\D/g, '');
/** Indian numbers typed without country code get +91. */
const waNumber = (s) => {
  const d = digits(s);
  return d.length === 10 ? `91${d}` : d;
};

export function galleryLink(slug) {
  return `${window.location.origin}/client?g=${encodeURIComponent(slug)}`;
}

function message({ clientName, title, slug, password }) {
  const first = String(clientName || '').split(/\s+/)[0] || 'there';
  return [
    `Hi ${first}! Your photos from “${title}” are ready to view.`,
    '',
    `Open your private gallery: ${galleryLink(slug)}`,
    `Gallery name: ${slug}`,
    password ? `Password: ${password}` : 'Password: (the one we shared with you earlier)',
    '',
    `— ${SITE.name}`,
  ].join('\n');
}

/**
 * Modal that shows a client gallery's login details and lets the studio share them.
 * If `gallery.password` is set (just created / just reset) it is shown once; otherwise the
 * password is hidden (only a hash is stored) and the studio can reset it here.
 */
export default function CredentialsModal({ gallery, call, onClose, onReset }) {
  const toast = useToast();
  const [g, setG] = useState(gallery);
  const dialog = useDialog();
  const [busy, setBusy] = useState(false);
  const [custom, setCustom] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const text = message(g);
  const copy = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ type: 'info', title: `${label} copied`, duration: 2200 });
    } catch {
      toast({ type: 'error', title: 'Couldn’t copy', message: 'Select the text and copy it manually.' });
    }
  };

  async function reset(e) {
    e?.preventDefault();
    if (!g.password) {
      const ok = await dialog.confirm({
        title: 'Set a new password?',
        message: `${g.clientName}’s current password for “${g.title}” will stop working immediately. You’ll get the new one to share.`,
        tone: 'danger', icon: 'edit', confirmLabel: 'Set new password',
      });
      if (!ok) return;
    }
    setBusy(true);
    try {
      const r = await call(`/admin/client-galleries/${g.slug}/password`, { method: 'POST', body: { password: custom || undefined } });
      setG((x) => ({ ...x, ...r }));
      setShowCustom(false);
      setCustom('');
      onReset?.();
      toast({ title: 'New password set', message: 'Share it with the client now: it won’t be shown again.' });
    } catch (err) {
      toast({ type: 'error', title: 'Couldn’t reset password', message: err.message });
    } finally {
      setBusy(false);
    }
  }

  const wa = `https://wa.me/${waNumber(g.clientPhone)}?text=${encodeURIComponent(text)}`;
  const mail = `mailto:${g.clientEmail || ''}?subject=${encodeURIComponent(`Your photos: ${g.title}`)}&body=${encodeURIComponent(text)}`;

  return createPortal(
    <div className="creds" role="dialog" aria-modal="true" aria-label="Client gallery login details" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="creds__card">
        <div className="creds__head">
          <div>
            <p className="eyebrow">Client login details</p>
            <h3>{g.title}</h3>
            <p className="muted small">{g.clientName}{g.clientPhone ? ` · ${g.clientPhone}` : ''}{g.clientEmail ? ` · ${g.clientEmail}` : ''}</p>
          </div>
          <button className="creds__x" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <dl className="creds__list">
          <div>
            <dt>Gallery link</dt>
            <dd><code>{galleryLink(g.slug)}</code><button type="button" onClick={() => copy(galleryLink(g.slug), 'Link')}>Copy</button></dd>
          </div>
          <div>
            <dt>Gallery name</dt>
            <dd><code>{g.slug}</code><button type="button" onClick={() => copy(g.slug, 'Gallery name')}>Copy</button></dd>
          </div>
          <div>
            <dt>Password</dt>
            {g.password ? (
              <dd className="creds__pw"><code>{g.password}</code><button type="button" onClick={() => copy(g.password, 'Password')}>Copy</button></dd>
            ) : (
              <dd className="creds__hidden">
                <span>Hidden for security</span>
                <small>Passwords are stored encrypted and can’t be viewed. Reset it to send the client a new one.</small>
              </dd>
            )}
          </div>
        </dl>

        {g.password && <p className="creds__warn">Share it now: this password won’t be shown again after you close this window.</p>}

        <div className="creds__share">
          <a className="btn btn--primary" href={wa} target="_blank" rel="noreferrer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.28-.2-.57-.35M12.05 21.79a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88a9.83 9.83 0 0 1 9.88 9.89c0 5.45-4.44 9.88-9.88 9.88" /></svg>
            {g.clientPhone ? `WhatsApp ${String(g.clientName).split(/\s+/)[0]}` : 'Share on WhatsApp'}
          </a>
          <a className="btn btn--ghost" href={mail}>Email</a>
          <button type="button" className="btn btn--ghost" onClick={() => copy(text, 'Message')}>Copy message</button>
        </div>

        <details className="creds__preview">
          <summary>Preview message</summary>
          <pre>{text}</pre>
        </details>

        <div className="creds__reset">
          {showCustom ? (
            <form onSubmit={reset} className="creds__custom">
              <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="New password (min 6) — leave empty to generate" minLength={6} autoFocus />
              <button className="btn btn--ghost btn--sm" disabled={busy}>{busy ? 'Saving…' : 'Set'}</button>
            </form>
          ) : (
            <>
              <button type="button" className="link-btn" onClick={reset} disabled={busy}>{busy ? 'Resetting…' : g.password ? 'Generate a different password' : 'Reset password'}</button>
              <button type="button" className="link-btn" onClick={() => setShowCustom(true)}>Set my own password</button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
