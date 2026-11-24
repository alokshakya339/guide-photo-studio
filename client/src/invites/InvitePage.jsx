import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import Royal from './templates/Royal.jsx';
import Editorial from './templates/Editorial.jsx';
import { BlushGarden, MarigoldMela, MidnightDeco, ModernMinimal } from './templates/Collection.jsx';
import Temple from './templates/Temple.jsx';
import Scroll from './templates/Scroll.jsx';
import Codex from './templates/Codex.jsx';
import Rajwada from './templates/Rajwada.jsx';
import Cinema from './templates/Cinema.jsx';
import '../invite.css';
import '../invite-ancient.css';
import '../invite-rajwada.css';
import '../invite-garden.css';
import '../invite-mela.css';
import '../invite-deco.css';
import '../invite-minimal.css';
import '../invite-cinema.css';

/** Theme registry: add a new theme here and it becomes available in Admin → Invitations. */
export const TEMPLATES = {
  royal: { name: 'Royal Indian', C: Royal },
  editorial: { name: 'Guide Studio Editorial', C: Editorial },
  floral: { name: 'Blush Garden', C: BlushGarden },
  marigold: { name: 'Marigold Mela', C: MarigoldMela },
  midnight: { name: 'Midnight Deco', C: MidnightDeco },
  minimal: { name: 'Modern Minimal', C: ModernMinimal },
  temple: { name: 'Ancient Temple', C: Temple },
  scroll: { name: 'Sacred Scroll', C: Scroll },
  codex: { name: 'Royal Codex', C: Codex },
  rajwada: { name: 'Rajwada Royal', C: Rajwada },
  cinema: { name: 'Cinema Reel', C: Cinema },
};

const FONTS = {
  cormorant: "'Cormorant Garamond', Georgia, serif",
  playfair: "'Playfair Display', Georgia, serif",
  marcellus: "'Marcellus', Georgia, serif",
};
const tokenKey = (slug) => `invite-token-${slug}`;
const getToken = (slug) => { try { return localStorage.getItem(tokenKey(slug)) || ''; } catch { return ''; } };

/** /invite/:slug — loads the invitation (preview link, password gate), applies its colours and renders the theme. */
export default function InvitePage() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const preview = params.get('preview') || '';
  const [token, setToken] = useState(() => getToken(slug));
  const [inv, setInv] = useState(null);
  const [error, setError] = useState('');
  const [pw, setPw] = useState('');
  const [pwErr, setPwErr] = useState('');

  useEffect(() => {
    setInv(null); setError('');
    api(`/invites/${slug}${preview ? `?preview=${encodeURIComponent(preview)}` : ''}`, { headers: token ? { 'x-invite-token': token } : undefined })
      .then((d) => { setInv(d); if (!d.locked) document.title = `${d.partner1} & ${d.partner2} · Wedding Invitation`; })
      .catch((e) => setError(e.message));
  }, [slug, preview, token]);

  useEffect(() => {
    document.body.classList.add('inv-body');
    return () => document.body.classList.remove('inv-body');
  }, []);

  const unlock = async (e) => {
    e.preventDefault();
    setPwErr('');
    try {
      const r = await api(`/invites/${slug}/unlock`, { method: 'POST', body: { password: pw } });
      try { localStorage.setItem(tokenKey(slug), r.token); } catch { /* ignore */ }
      setToken(r.token);
    } catch (e2) { setPwErr(e2.message); }
  };

  if (error) {
    return (
      <div className="inv-msg">
        <p className="inv-msg__brand">Invites by Guide Studio</p>
        <h1>{error}</h1>
        <a href="/invites">Discover our wedding invitations →</a>
      </div>
    );
  }
  if (!inv) return <div className="inv-msg"><span className="inv-spinner" aria-label="Loading" /></div>;

  const t = inv.theme || {};
  const style = {
    ...(t.primary ? { '--inv-primary': t.primary } : {}),
    ...(t.accent ? { '--inv-accent': t.accent } : {}),
    ...(t.background ? { '--inv-bg': t.background } : {}),
    ...(t.font && FONTS[t.font] ? { '--inv-serif': FONTS[t.font] } : {}),
  };

  if (inv.locked) {
    return (
      <div className={`inv-lock inv-lock--${inv.template || 'royal'}`} style={style}>
        {inv.coverPhoto && <img src={inv.coverPhoto} alt="" />}
        <form onSubmit={unlock} className="inv-lock__card">
          <p className="inv-lock__k">A private invitation</p>
          <h1>{inv.partner1} <i>&amp;</i> {inv.partner2}</h1>
          <p>Please enter the password shared by the family.</p>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" aria-label="Password" autoFocus />
          {pwErr && <p className="inv-err" role="alert">{pwErr}</p>}
          <button className="inv-btn">Open invitation</button>
        </form>
      </div>
    );
  }

  const key = TEMPLATES[inv.template] ? inv.template : 'royal';
  // An unpublished invitation opened with its preview link: clearly marked, RSVPs & blessings off.
  const draft = inv.preview && inv.status !== 'published';
  const Theme = TEMPLATES[key].C;
  return (
    <div className={`inv inv--${key} ${draft ? 'is-draft' : ''}`} style={style}>
      {inv.preview && <div className="inv-preview">{draft ? 'Preview · not published yet · RSVPs are off' : 'Preview · only people with this link can see it'}</div>}
      {draft && <div className="inv-watermark" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <span key={i}>Preview</span>)}</div>}
      <Theme inv={inv} slug={slug} token={token} preview={preview} />
    </div>
  );
}
