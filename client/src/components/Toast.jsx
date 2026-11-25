import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMounted } from './common.jsx';

const ToastCtx = createContext(() => {});

/**
 * toast({ type: 'success' | 'error' | 'info', title, message?, action?: { label, href?, onClick? }, duration? })
 * Shown top-right (top on phones), auto-dismiss with a progress bar, pauses on hover.
 */
export const useToast = () => useContext(ToastCtx);

let seq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const mounted = useMounted();
  const dismiss = useCallback((id) => setToasts((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x))), []);
  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback((opts) => {
    const id = ++seq;
    const t = { id, type: 'success', duration: opts?.type === 'error' ? 7000 : 5000, ...opts };
    setToasts((list) => [...list.slice(-3), t]); // keep at most 4 on screen
    return id;
  }, []);

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      {mounted && createPortal( /* added after mount: no portals in server-rendered HTML */
        <div className="toasts" aria-live="polite" aria-relevant="additions">
          {toasts.map((t) => <ToastItem key={t.id} t={t} onDismiss={() => dismiss(t.id)} onGone={() => remove(t.id)} />)}
        </div>,
        document.body
      )}
    </ToastCtx.Provider>
  );
}

const ICONS = {
  success: <path d="m7 12.5 3.2 3.2L17 9" />,
  error: <><path d="M12 7.5v5.5" /><path d="M12 16.5h.01" /></>,
  info: <><path d="M12 11v5" /><path d="M12 7.5h.01" /></>,
};

function ToastItem({ t, onDismiss, onGone }) {
  const [paused, setPaused] = useState(false);
  const left = useRef(t.duration);
  const started = useRef(Date.now());

  useEffect(() => {
    if (t.leaving) {
      const id = setTimeout(onGone, 260);
      return () => clearTimeout(id);
    }
    if (paused || !t.duration) return undefined;
    started.current = Date.now();
    const id = setTimeout(onDismiss, left.current);
    return () => {
      clearTimeout(id);
      left.current -= Date.now() - started.current;
    };
  }, [paused, t.leaving, t.duration, onDismiss, onGone]);

  const act = t.action;
  return (
    <div
      className={`toast toast--${t.type} ${t.leaving ? 'is-leaving' : ''}`}
      role={t.type === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="toast__top">
        <span className="toast__icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">{ICONS[t.type] || ICONS.info}</svg>
        </span>
        <div className="toast__text">
          <strong>{t.title}</strong>
          {t.message && <p>{t.message}</p>}
        </div>
        <button className="toast__x" onClick={onDismiss} aria-label="Close notification">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>
      <div className={`toast__actions ${act ? '' : 'toast__actions--single'}`}>
        {act && (act.href ? (
          <a className="toast__primary" href={act.href} target={act.external === false ? undefined : '_blank'} rel="noreferrer" onClick={onDismiss}>{act.label}</a>
        ) : (
          <button className="toast__primary" onClick={() => { act.onClick?.(); onDismiss(); }}>{act.label}</button>
        ))}
        <button className="toast__dismiss" onClick={onDismiss}>Dismiss</button>
      </div>
      {t.duration > 0 && !t.leaving && (
        <span className="toast__bar" style={{ animationDuration: `${t.duration}ms`, animationPlayState: paused ? 'paused' : 'running' }} aria-hidden="true" />
      )}
    </div>
  );
}
