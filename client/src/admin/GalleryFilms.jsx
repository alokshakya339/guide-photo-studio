import { useState } from 'react';
import { useToast } from '../components/Toast.jsx';
import { useDialog } from '../components/Dialog.jsx';
import VideoModal from '../components/VideoModal.jsx';

const SOURCE = { drive: 'Google Drive', youtube: 'YouTube', file: 'Video file' };

/** Admin: films (videos) delivered in a client gallery, streamed from Drive / YouTube / a video URL. */
export default function GalleryFilms({ g, setG, call, onChanged }) {
  const toast = useToast();
  const dialog = useDialog();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [play, setPlay] = useState(null);
  const films = g.videos || [];
  const base = `/admin/client-galleries/${g.slug}/videos`;

  async function add(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      const r = await call(base, { method: 'POST', body: { text } });
      setG(r);
      setText('');
      onChanged?.();
      toast({
        title: `${r.added} film${r.added === 1 ? '' : 's'} added`,
        message: [r.skipped ? `${r.skipped} already in the gallery.` : `${g.clientName} can watch ${r.added === 1 ? 'it' : 'them'} now.`, ...(r.errors || [])].join(' '),
      });
    } catch (err) {
      toast({ type: 'error', title: 'Couldn’t add films', message: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function rename(v, title) {
    if (title.trim() === (v.title || '')) return;
    try {
      setG(await call(`${base}/${v._id}`, { method: 'PATCH', body: { title } }));
      toast({ title: 'Film renamed', duration: 2000 });
    } catch (err) {
      toast({ type: 'error', title: 'Couldn’t rename', message: err.message });
    }
  }

  async function move(i, d) {
    const ids = films.map((v) => v._id);
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try { setG(await call(`${base}/order`, { method: 'PUT', body: { ids } })); } catch (err) { toast({ type: 'error', title: 'Couldn’t reorder', message: err.message }); }
  }

  async function remove(v) {
    const ok = await dialog.confirm({
      title: 'Remove this film?',
      message: `“${v.title}” will no longer be visible to ${g.clientName}. The file itself stays in your Google Drive.`,
      tone: 'danger', images: v.poster ? [v.poster] : undefined, confirmLabel: 'Remove film',
    });
    if (!ok) return;
    try {
      setG(await call(`${base}/${v._id}`, { method: 'DELETE' }));
      onChanged?.();
      toast({ title: 'Film removed' });
    } catch (err) {
      toast({ type: 'error', title: 'Couldn’t remove', message: err.message });
    }
  }

  return (
    <section className="gfilms">
      <div className="gfilms__head">
        <h3>Films <span className="muted">({films.length})</span></h3>
        <small className="muted">Streamed straight from Google Drive, so there’s no upload size limit.</small>
      </div>

      <form className="drive" onSubmit={add}>
        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'Paste Google Drive video links (one per line) or a shared folder link\nhttps://drive.google.com/file/d/…/view\nhttps://drive.google.com/drive/folders/…   ·   YouTube (unlisted) and .mp4 links work too'}
        />
        <div className="drive__foot">
          <small className="muted">Share the videos or folder as <b>“Anyone with the link can view”</b>. A folder adds every video inside it.</small>
          <button className="btn btn--primary btn--sm" disabled={busy || !text.trim()}>{busy ? 'Adding…' : 'Add films'}</button>
        </div>
      </form>

      {films.length > 0 && (
        <ul className="gfilms__list">
          {films.map((v, i) => (
            <li key={v._id} className="gfilms__item">
              <button type="button" className="gfilms__thumb" onClick={() => setPlay(i)} aria-label={`Preview ${v.title}`}>
                {v.poster && <img src={v.poster} alt="" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                <span>▶</span>
              </button>
              <div className="gfilms__info">
                <input defaultValue={v.title} key={v.title} aria-label="Film title" onBlur={(e) => rename(v, e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
                <small className="muted">{SOURCE[v.kind]}</small>
              </div>
              <div className="gfilms__ctl">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === films.length - 1} aria-label="Move down">↓</button>
                <button type="button" onClick={() => remove(v)} aria-label="Remove film">✕</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {play != null && <VideoModal videos={films} index={play} onIndex={setPlay} onClose={() => setPlay(null)} allowDownload />}
    </section>
  );
}
