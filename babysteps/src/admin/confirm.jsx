import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

/**
 * Admin confirm dialog in the BabySteps style, replacing the browser's "localhost says" popup.
 *
 *   if (!(await askConfirm({ title: 'Delete gift card?', message: '…', confirmLabel: 'Delete', danger: true }))) return;
 *
 * `requireText` makes the person type a word (e.g. a gallery name) before the confirm button unlocks.
 * Resolves true when confirmed, false when cancelled (button, Esc or clicking outside).
 */
export function askConfirm(opts) {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const done = (ok) => {
      root.unmount();
      host.remove();
      resolve(ok);
    };
    root.render(<ConfirmDialog {...(typeof opts === 'string' ? { message: opts } : opts)} onDone={done} />);
  });
}

function ConfirmDialog({ title = 'Are you sure?', message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, requireText, onDone }) {
  const [typed, setTyped] = useState('');
  const confirmBtn = useRef(null);
  const input = useRef(null);
  const locked = Boolean(requireText) && typed.trim() !== requireText;

  useEffect(() => {
    (requireText ? input : confirmBtn).current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onDone(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDone, requireText]);

  return (
    <div className="ad-modal ad-confirm" role="presentation" onClick={() => onDone(false)}>
      <form
        className="ad-modal-card ad-confirm-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="ad-confirm-title"
        aria-describedby="ad-confirm-msg"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); if (!locked) onDone(true); }}
      >
        <span className={`ad-confirm-icon ${danger ? 'danger' : ''}`} aria-hidden="true">{danger ? '!' : '?'}</span>
        <h3 id="ad-confirm-title">{title}</h3>
        {message && <p id="ad-confirm-msg" className="ad-confirm-msg">{message}</p>}
        {requireText && (
          <label className="ad-field">
            <span className="ad-label">Type <b>{requireText}</b> to confirm</span>
            <input ref={input} className="ad-input" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck="false" />
          </label>
        )}
        <div className="ad-confirm-actions">
          <button type="button" className="ad-btn" onClick={() => onDone(false)}>{cancelLabel}</button>
          <button ref={confirmBtn} type="submit" className={`ad-btn ${danger ? 'ad-btn-danger' : 'primary'}`} disabled={locked}>{confirmLabel}</button>
        </div>
      </form>
    </div>
  );
}
