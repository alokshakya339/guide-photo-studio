import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './account/account.css';
import './styles.css';
import './editorial.css';
import { loadSite, applySite } from './site.js';
import { setSsrData } from './api.js';

const el = document.getElementById('root');
const app = (
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Pages rendered on the server (SSR) arrive with their HTML and the data used to make it: reuse both.
const pre = window.__SSR__;
if (pre && el.hasAttribute('data-ssr')) {
  applySite(pre.site);
  setSsrData(pre.data);
  ReactDOM.hydrateRoot(el, app, { onRecoverableError: (e) => console.warn('[hydration]', e?.message || e) });
} else {
  // No server HTML (dev server, private pages, or SSR off): pull editable content from the CMS, then render.
  loadSite().finally(() => ReactDOM.createRoot(el).render(app));
}

// Installable app + fast repeat visits: register the service worker in production builds only.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // pick up a new version when people come back to the tab
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    }).catch(() => {});
  });
}
