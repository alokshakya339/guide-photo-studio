import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles.css';
import './pages.css';
import './theme.css';
import './brand.css';
import { loadContent } from './content.js';

const el = document.getElementById('root');
const app = (
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Apply content saved in the admin, then render (falls back to built-in defaults).
// Pages pre-rendered by the server (SSR) are hydrated — React attaches to the HTML that is already on screen.
loadContent().finally(() => {
  if (el.hasAttribute('data-ssr')) hydrateRoot(el, app, { onRecoverableError: (e) => console.warn('[hydration]', e?.message || e) });
  else createRoot(el).render(app);
});

// Installable app + fast repeat visits: register the service worker in production builds only.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    }).catch(() => {});
  });
}
