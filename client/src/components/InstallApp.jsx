import { useEffect, useState } from 'react';

const KEY = 'gps-install-dismissed';
const DAYS = 30;
const standalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
const dismissedRecently = () => { try { return Date.now() < Number(localStorage.getItem(KEY) || 0); } catch { return false; } };
const isIosSafari = () => {
  const ua = navigator.userAgent || '';
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios && /safari/i.test(ua) && !/crios|fxios|edgios|gsa\//i.test(ua);
};

/**
 * "Install the app" card. Chrome / Edge / Android: real install button (beforeinstallprompt).
 * iPhone Safari (no install API): a short "Share → Add to Home Screen" hint. Shown once after a few seconds,
 * "Not now" hides it for 30 days, never shown inside the installed app.
 */
export default function InstallApp({ name = 'Guide Photo Studio', icon = '/icons/icon-192.png' }) {
  const [deferred, setDeferred] = useState(null);
  const [mode, setMode] = useState(null); // 'prompt' | 'ios'
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (standalone() || dismissedRecently()) return undefined;
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); setMode('prompt'); };
    const onInstalled = () => { setMode(null); setDeferred(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    if (isIosSafari()) setMode('ios');
    const t = setTimeout(() => setReady(true), 9000);
    return () => { clearTimeout(t); window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);

  const later = () => {
    try { localStorage.setItem(KEY, String(Date.now() + DAYS * 864e5)); } catch { /* ignore */ }
    setMode(null);
  };
  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice.catch(() => ({}));
    setDeferred(null);
    if (outcome === 'accepted') setMode(null); else later();
  };

  if (!mode || !ready) return null;
  return (
    <div className="pwa-card" role="dialog" aria-label={`Install the ${name} app`}>
      <img src={icon} alt="" width="44" height="44" />
      <div className="pwa-card__text">
        <strong>Get the {name} app</strong>
        {mode === 'prompt'
          ? <span>Quick access from your home screen — no app store needed.</span>
          : <span>Tap <b aria-label="Share">Share <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg></b> then <b>“Add to Home Screen”</b>.</span>}
      </div>
      <div className="pwa-card__btns">
        {mode === 'prompt' && <button type="button" className="pwa-card__go" onClick={install}>Install</button>}
        <button type="button" className="pwa-card__no" onClick={later}>{mode === 'prompt' ? 'Not now' : 'Got it'}</button>
      </div>
    </div>
  );
}
