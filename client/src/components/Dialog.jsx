import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Promise-based themed dialogs that replace window.confirm / window.prompt.
 *
 *   const dialog = useDialog();
 *   if (await dialog.confirm({ title, message, confirmLabel, tone: 'danger' })) { … }
 *   const value = await dialog.prompt({ title, message, defaultValue, type: 'number', validate });  // null if cancelled
 */
const DialogCtx = createContext(null);
export const useDialog = () => useContext(DialogCtx);

const ICONS = {
  danger: <><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></>,
  primary: <><path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" /><path d="m8 12 3 3 5-6" /></>,
  info: <><path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>,
  send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" /></>,
};

export function DialogProvider({ children }) {
  const [dlg, setDlg] = useState(null); // { kind, opts, resolve }
  const open = useCallback((kind, opts) => new Promise((resolve) => setDlg({ kind, opts, resolve })), []);
  const api = useRef({
    confirm: (opts) => open('confirm', opts),
    prompt: (opts) => open('prompt', opts),
  }).current;

  const close = (value) => {
    dlg?.resolve(value);
    setDlg(null);
  };

  return (
    <DialogCtx.Provider value={api}>
      {children}
      {dlg && createPortal(<DialogView {...dlg} onClose={close} />, document.body)}
    </DialogCtx.Provider>
  );
}

function DialogView({ kind, opts, onClose }) {
  const {
    title, message, confirmLabel, cancelLabel = 'Cancel', tone = 'primary', icon,
    defaultValue = '', placeholder = '', type = 'text', validate, hint, children, images,
  } = opts || {};
  const [value, setValue] = useState(String(defaultValue ?? ''));
  const [error, setError] = useState('');
  const [leaving, setLeaving] = useState(false);
  const inputRef = useRef(null);
  const okRef = useRef(null);
  const card = useRef(null);

  const finish = (v) => {
    setLeaving(true);
    setTimeout(() => onClose(v), 140);
  };
  const cancel = () => finish(kind === 'prompt' ? null : false);
  const ok = () => {
    if (kind === 'prompt') {
      const err = validate?.(value);
      if (err) { setError(err); inputRef.current?.focus(); return; }
      finish(value);
    } else finish(true);
  };

  useEffect(() => {
    (kind === 'prompt' ? inputRef.current : okRef.current)?.focus();
    if (kind === 'prompt') inputRef.current?.select();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); cancel(); }
      // keep Tab focus inside the dialog
      if (e.key === 'Tab' && card.current) {
        const f = [...card.current.querySelectorAll('button, input, textarea, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
        else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const iconKey = icon || (tone === 'danger' ? 'danger' : kind === 'prompt' ? 'edit' : 'primary');
  const label = confirmLabel || (kind === 'prompt' ? 'Save' : tone === 'danger' ? 'Delete' : 'Confirm');

  return (
    <div className={`dlg ${leaving ? 'is-leaving' : ''}`} onMouseDown={(e) => e.target === e.currentTarget && cancel()}>
      <div
        ref={card}
        className={`dlg__card dlg__card--${tone}`}
        role={tone === 'danger' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby="dlg-title"
        aria-describedby={message ? 'dlg-msg' : undefined}
      >
        <span className="dlg__icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{ICONS[iconKey]}</svg>
        </span>
        <h2 id="dlg-title" className="dlg__title">{title}</h2>
        {message && <p id="dlg-msg" className="dlg__msg">{message}</p>}

        {images?.length > 0 && (
          <div className="dlg__thumbs" aria-hidden="true">
            {images.slice(0, 6).map((src, i) => <img key={i} src={src} alt="" referrerPolicy="no-referrer" />)}
            {images.length > 6 && <span className="dlg__more">+{images.length - 6}</span>}
          </div>
        )}
        {children}

        {kind === 'prompt' && (
          <form className="dlg__form" onSubmit={(e) => { e.preventDefault(); ok(); }}>
            {type === 'textarea' ? (
              <textarea ref={inputRef} rows={3} value={value} placeholder={placeholder} onChange={(e) => { setValue(e.target.value); setError(''); }} aria-invalid={!!error} />
            ) : (
              <input ref={inputRef} type={type} inputMode={type === 'number' ? 'numeric' : undefined} value={value} placeholder={placeholder} onChange={(e) => { setValue(e.target.value); setError(''); }} aria-invalid={!!error} />
            )}
            {error ? <small className="dlg__err" role="alert">{error}</small> : hint ? <small className="dlg__hint">{hint}</small> : null}
          </form>
        )}

        <div className="dlg__actions">
          <button type="button" className="btn btn--ghost" onClick={cancel}>{cancelLabel}</button>
          <button type="button" ref={okRef} className={`btn ${tone === 'danger' ? 'btn--danger' : 'btn--primary'}`} onClick={ok}>{label}</button>
        </div>
      </div>
    </div>
  );
}
