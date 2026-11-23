// Server-side rendering entry (built to dist-ssr/ by `npm run build`, used by server/src/seo.js).
// Renders a page to HTML so visitors, Google and AI crawlers get the full content before any JavaScript runs.
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import App from './App.jsx';
import { applyContent, resetContent } from './content.js';

// Admin-saved content is site-wide, so it's applied once and re-applied only when it changes.
let applied = null;

/** @returns {string} the page's HTML (the inside of <div id="root">) */
export function render(url, rawContent) {
  const key = JSON.stringify(rawContent || {});
  if (key !== applied) { resetContent(); applyContent(rawContent || {}); applied = key; }
  return renderToString(
    <React.StrictMode>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </React.StrictMode>,
  );
}
