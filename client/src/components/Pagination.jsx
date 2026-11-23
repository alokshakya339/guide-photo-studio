import Select from './Select.jsx';

/** Page numbers with ellipses: 1 … 4 5 6 … 20 */
function pageList(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, pages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((n) => set.add(n));
  if (page >= pages - 2) [pages - 1, pages - 2, pages - 3].forEach((n) => set.add(n));
  const nums = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out = [];
  nums.forEach((n, i) => {
    if (i && n - nums[i - 1] > 1) out.push(`gap-${n}`);
    out.push(n);
  });
  return out;
}

const Arrow = ({ dir }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {dir === 'left' ? <path d="m15 6-6 6 6 6" /> : <path d="m9 6 6 6-6 6" />}
  </svg>
);

export default function Pagination({ page, pages, onChange, label = 'Gallery pages' }) {
  if (pages <= 1) return null;
  const go = (n) => onChange(Math.min(pages, Math.max(1, n)));
  return (
    <nav className="pager" aria-label={label}>
      <button className="pager__btn pager__step" onClick={() => go(page - 1)} disabled={page === 1} aria-label="Previous page">
        <Arrow dir="left" /> <span>Previous</span>
      </button>

      <ol className="pager__nums">
        {pageList(page, pages).map((n) =>
          typeof n === 'string' ? (
            <li key={n} className="pager__gap" aria-hidden="true">…</li>
          ) : (
            <li key={n}>
              <button
                className={`pager__btn pager__num ${n === page ? 'is-on' : ''}`}
                onClick={() => go(n)}
                aria-label={`Page ${n}`}
                aria-current={n === page ? 'page' : undefined}
              >
                {n}
              </button>
            </li>
          )
        )}
      </ol>

      <div className="pager__compact">
        <Select
          size="sm"
          value={page}
          onChange={(v) => go(Number(v))}
          ariaLabel="Go to page"
          options={Array.from({ length: pages }, (_, i) => ({ value: i + 1, label: `Page ${i + 1} of ${pages}` }))}
        />
      </div>

      <button className="pager__btn pager__step" onClick={() => go(page + 1)} disabled={page === pages} aria-label="Next page">
        <span>Next</span> <Arrow dir="right" />
      </button>
    </nav>
  );
}
