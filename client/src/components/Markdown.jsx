import { Link } from 'react-router-dom';

/*
 * Tiny, safe formatter for blog posts — builds React elements (never raw HTML).
 * Supports: ## / ### headings · paragraphs · **bold** · *italic* · [text](url) · - / * lists ·
 * 1. numbered lists · > quotes · ![alt](image) on its own line · --- divider.
 */

const isInternal = (href) => href.startsWith('/') && !href.startsWith('//');
const safeHref = (href) => (/^(https?:|mailto:|tel:|\/)/i.test(href) ? href : '#');

function inline(text, keyBase = 'i') {
  const out = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\))/g;
  let last = 0; let m; let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyBase}-${k++}`;
    if (m[2]) out.push(<strong key={key}>{m[2]}</strong>);
    else if (m[3]) out.push(<em key={key} className="md-em">{m[3]}</em>);
    else {
      const href = safeHref(m[5]);
      out.push(isInternal(href)
        ? <Link key={key} to={href}>{m[4]}</Link>
        : <a key={key} href={href} target="_blank" rel="noreferrer">{m[4]}</a>);
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text = '', resolveImage = (s) => s }) {
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let para = []; let list = null; let quote = [];

  const flushPara = () => { if (para.length) { blocks.push({ t: 'p', v: para.join(' ') }); para = []; } };
  const flushList = () => { if (list) { blocks.push(list); list = null; } };
  const flushQuote = () => { if (quote.length) { blocks.push({ t: 'quote', v: quote.join(' ') }); quote = []; } };
  const flushAll = () => { flushPara(); flushList(); flushQuote(); };

  lines.forEach((raw) => {
    const line = raw.trim();
    let m;
    if (!line) { flushAll(); return; }
    if ((m = line.match(/^(#{2,3})\s+(.*)/))) { flushAll(); blocks.push({ t: m[1].length === 2 ? 'h2' : 'h3', v: m[2] }); return; }
    if (/^---+$/.test(line)) { flushAll(); blocks.push({ t: 'hr' }); return; }
    if ((m = line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/))) { flushAll(); blocks.push({ t: 'img', alt: m[1], src: m[2] }); return; }
    if ((m = line.match(/^>\s?(.*)/))) { flushPara(); flushList(); quote.push(m[1]); return; }
    if ((m = line.match(/^[-*]\s+(.*)/))) { flushPara(); flushQuote(); if (!list || list.t !== 'ul') { flushList(); list = { t: 'ul', items: [] }; } list.items.push(m[1]); return; }
    if ((m = line.match(/^\d+[.)]\s+(.*)/))) { flushPara(); flushQuote(); if (!list || list.t !== 'ol') { flushList(); list = { t: 'ol', items: [] }; } list.items.push(m[1]); return; }
    flushList(); flushQuote(); para.push(line);
  });
  flushAll();

  return (
    <div className="md">
      {blocks.map((b, i) => {
        const k = `b${i}`;
        switch (b.t) {
          case 'h2': return <h2 key={k}>{inline(b.v, k)}</h2>;
          case 'h3': return <h3 key={k}>{inline(b.v, k)}</h3>;
          case 'hr': return <hr key={k} />;
          case 'img': return <figure key={k}><img src={resolveImage(b.src)} alt={b.alt} loading="lazy" referrerPolicy="no-referrer" />{b.alt && <figcaption>{b.alt}</figcaption>}</figure>;
          case 'quote': return <blockquote key={k}>{inline(b.v, k)}</blockquote>;
          case 'ul': return <ul key={k}>{b.items.map((it, j) => <li key={j}>{inline(it, `${k}-${j}`)}</li>)}</ul>;
          case 'ol': return <ol key={k}>{b.items.map((it, j) => <li key={j}>{inline(it, `${k}-${j}`)}</li>)}</ol>;
          default: return <p key={k}>{inline(b.v, k)}</p>;
        }
      })}
    </div>
  );
}

/** Plain text (for reading time / previews). */
export const plainText = (text = '') => String(text).replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[#>*_`-]/g, ' ').replace(/\s+/g, ' ').trim();
export const readingTime = (text) => Math.max(1, Math.round(plainText(text).split(' ').length / 200));
