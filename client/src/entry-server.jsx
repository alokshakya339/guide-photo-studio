// Server-side rendering entry (built to dist-ssr/ by `npm run build`, used by server/src/seo.js).
// Renders a page to HTML so visitors, Google and AI crawlers get the full content before any JavaScript runs.
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import App from './App.jsx';
import { applySite, resetSite } from './site.js';
import { setSsrData } from './api.js';

/**
 * @param {string} url       the page address, e.g. "/blog/some-post"
 * @param {object} site      /api/site response (editable content)
 * @param {object} data      API responses keyed by path, e.g. { "/blog": [...] }
 * @param {Set}   [collect]  when given, the API paths this page asks for are added to it (first, discovery pass)
 * @returns {string} the HTML that goes inside <div id="root">
 */
export function render(url, { site, data = {}, collect = null } = {}) {
  resetSite();
  applySite(site);
  setSsrData(data, collect);
  try {
    return renderToString(
      <React.StrictMode>
        <StaticRouter location={url}>
          <App />
        </StaticRouter>
      </React.StrictMode>,
    );
  } finally {
    setSsrData({}, null);
  }
}
