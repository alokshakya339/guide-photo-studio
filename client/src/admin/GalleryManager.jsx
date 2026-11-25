import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../components/Toast.jsx';
import { useDialog } from '../components/Dialog.jsx';
import { Lightbox } from '../components/Gallery.jsx';
import CredentialsModal from './Credentials.jsx';
import DriveImport from './DriveImport.jsx';
import GalleryFilms from './GalleryFilms.jsx';
import { uploadToR2 } from './r2Upload.js';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const fileName = (src) => decodeURIComponent(String(src).split('/').pop().split('?')[0]);
// Full-size copies carry their original file name; signed storage URLs don't make readable names.
const photoName = (p) => p.name || fileName(p.src);
// Stored value of a photo ("r2:<key>" for full-size copies — their `src` is a temporary signed URL).
const refOf = (p) => p.ref || p.src;

/** Admin view of one client gallery: every photo, the client's picks and notes, add / remove photos. */
export default function GalleryManager({ slug, call, token, onBack, onChanged }) {
  const toast = useToast();
  const [g, setG] = useState(null);
  const dialog = useDialog();
  const [filter, setFilter] = useState('all');
  const [creds, setCreds] = useState(false);
  const [view, setView] = useState(null);
  const [error, setError] = useState('');
  const [r2, setR2] = useState(false); // cloud storage configured → "Copy full size" available
  const [progress, setProgress] = useState(null); // { done, total, failed, current } while copying

  const load = useCallback(() => call(`/admin/client-galleries/${slug}`).then(setG).catch((e) => setError(e.message)), [call, slug]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { call('/admin/client-galleries-storage').then((r) => setR2(Boolean(r.r2))).catch(() => setR2(false)); }, [call]);
  // Closing the tab mid-copy would stop it — ask first.
  useEffect(() => {
    if (!progress) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [progress]);

  if (error) return <div><button className="btn btn--ghost btn--sm" onClick={onBack}>← All galleries</button><p className="note note--error">{error}</p></div>;
  if (!g) return <p className="muted">Loading gallery…</p>;

  const picks = g.photos.filter((p) => p.favorite);
  const shown = filter === 'picks' ? picks : filter === 'notes' ? g.photos.filter((p) => p.note) : g.photos;
  const images = shown.map((p) => ({ ...p, alt: photoName(p) }));
  const coverRef = g.coverRef ?? g.cover;

  // Photos come only from Google Drive: the server reads the pasted folder / photo links.
  async function addFromDrive(text) {
    try {
      const r = await call(`/admin/client-galleries/${slug}/photos`, { method: 'POST', body: { text } });
      setG(r);
      onChanged?.();
      const notes = [r.skipped ? `${r.skipped} already in the gallery were skipped.` : '', r.errors?.length ? `Skipped: ${r.errors.join(' ')}` : ''].filter(Boolean).join(' ');
      toast({
        type: r.errors?.length ? 'info' : undefined,
        title: `${r.added} photo${r.added === 1 ? '' : 's'} added from Google Drive`,
        message: notes || `${g.clientName} can see them now.`,
      });
      return true;
    } catch (err) {
      toast({ type: 'error', title: 'Couldn’t add photos', message: err.message });
      return false;
    }
  }

  // Copy full size: every photo in the Drive folder(s) is downloaded and stored in cloud storage (R2).
  async function copyFromDrive(text) {
    let list;
    try {
      list = await call('/admin/client-galleries-drive/list', { method: 'POST', body: { text } });
    } catch (err) {
      toast({ type: 'error', title: 'Couldn’t read the Drive folder', message: err.message });
      return false;
    }
    const n = list.files.length;
    const ok = await dialog.confirm({
      title: `Copy ${n} photo${n === 1 ? '' : 's'} from Drive?`,
      message: `Full-size originals are copied into ${g.clientName}’s gallery, so they keep working even if the Drive folder changes later.${list.errors.length ? ` (${list.errors.length} link${list.errors.length === 1 ? '' : 's'} skipped: ${list.errors.join(' ')})` : ''} Keep this screen open until it finishes. On a phone, Wi-Fi is best.`,
      confirmLabel: `Copy ${n} photo${n === 1 ? '' : 's'}`,
    });
    if (!ok) return false;
    setProgress({ done: 0, total: n, failed: 0, current: '' });
    try {
      const { added, errors } = await uploadToR2({ slug, drive: list.files, token, onProgress: setProgress });
      await load();
      onChanged?.();
      toast({
        type: errors.length ? (added ? 'info' : 'error') : undefined,
        title: `${added} photo${added === 1 ? '' : 's'} copied from Drive`,
        message: errors.length ? `${errors.length} failed: ${errors.slice(0, 3).join(' · ')}${errors.length > 3 ? ' …' : ''}` : `${g.clientName} can see them now, in full quality.`,
        duration: errors.length ? 12000 : undefined,
      });
      return added > 0;
    } catch (err) {
      toast({ type: 'error', title: 'Copy stopped', message: err.message });
      await load();
      return false;
    } finally {
      setProgress(null);
    }
  }

  async function remove(p) {
    const ok = await dialog.confirm({
      title: 'Remove this photo from the gallery?',
      message: p.favorite ? `${g.clientName} picked this photo for their album. It will be removed from their selection too.` : `${photoName(p)} will no longer be visible to ${g.clientName}.`,
      tone: 'danger', images: [p.thumb || p.src], confirmLabel: 'Remove photo',
    });
    if (!ok) return;
    try {
      setG(await call(`/admin/client-galleries/${slug}/photos/${p._id}`, { method: 'DELETE' }));
      onChanged?.();
      toast({ title: 'Photo removed', message: `${photoName(p)} is no longer in the gallery.` });
    } catch (err) {
      toast({ type: 'error', title: 'Couldn’t remove photo', message: err.message });
    }
  }

  async function setCover(p) {
    await call(`/admin/client-galleries/${slug}`, { method: 'PATCH', body: { cover: refOf(p) } });
    setG((x) => ({ ...x, cover: p.src, coverRef: refOf(p) }));
    onChanged?.();
    toast({ title: 'Cover photo updated', duration: 2500 });
  }

  async function copyPicks() {
    const list = picks.map((p) => `${photoName(p)}${p.note ? `  — note: ${p.note}` : ''}`).join('\n');
    try {
      await navigator.clipboard.writeText(list);
      toast({ type: 'info', title: `${picks.length} picked file names copied`, message: 'Paste them for your editor or album designer.' });
    } catch {
      toast({ type: 'error', title: 'Couldn’t copy', message: 'Your browser blocked clipboard access.' });
    }
  }

  async function changeLimit() {
    const cur = g.selectionLimit || 0;
    const v = await dialog.prompt({
      title: 'Album pick limit',
      message: `How many photos can ${g.clientName} pick for the album?`,
      defaultValue: String(cur), type: 'number', placeholder: '0', hint: 'Enter 0 for unlimited picks.', confirmLabel: 'Save limit',
      validate: (x) => (x === '' || Number.isNaN(Number(x)) || Number(x) < 0 ? 'Enter a number (0 = unlimited)' : ''),
    });
    if (v == null) return;
    const n = Math.max(0, Math.floor(Number(v)));
    if (!Number.isFinite(n)) return toast({ type: 'error', title: 'Enter a number (0 = unlimited)' });
    const picked = g.photos.filter((p) => p.favorite).length;
    try {
      await call(`/admin/client-galleries/${slug}`, { method: 'PATCH', body: { selectionLimit: n } });
      setG((x) => ({ ...x, selectionLimit: n }));
      onChanged?.();
      toast({
        title: n ? `Pick limit set to ${n}` : 'Pick limit removed',
        message: n && picked > n
          ? `${g.clientName} has already picked ${picked}. They’ll need to remove ${picked - n} before adding more.`
          : n ? `${g.clientName} can pick up to ${n} photos.` : `${g.clientName} can pick as many photos as they like.`,
      });
    } catch (err) {
      toast({ type: 'error', title: 'Couldn’t change the limit', message: err.message });
    }
  }

  async function reopen() {
    await call(`/admin/client-galleries/${slug}/reopen`, { method: 'POST' });
    load();
    onChanged?.();
    toast({ title: 'Selection re-opened', message: `${g.clientName} can change their picks again.` });
  }

  return (
    <div className="gm">
      <button className="btn btn--ghost btn--sm gm__back" onClick={onBack}>← All galleries</button>

      <header className="gm__head">
        <div className="gm__cover">{g.cover ? <img src={g.cover} alt="" /> : <span>No cover</span>}</div>
        <div className="gm__info">
          <p className="eyebrow">Client gallery · {g.slug}</p>
          <h2>{g.title}</h2>
          <p className="muted">
            {g.clientName}
            {g.clientPhone && <> · <a href={`tel:${g.clientPhone}`}>{g.clientPhone}</a></>}
            {g.clientEmail && <> · <a href={`mailto:${g.clientEmail}`}>{g.clientEmail}</a></>}
          </p>
          <div className="gm__stats">
            <span><strong>{g.photos.length}</strong> photos</span>
            {(g.videos || []).length > 0 && <span><strong>{g.videos.length}</strong> films</span>}
            <span><strong>{picks.length}</strong>{g.selectionLimit ? `/${g.selectionLimit}` : ''} picked</span>
            <span className="gm__limit">
              Pick limit: <strong>{g.selectionLimit || 'Unlimited'}</strong>
              <button type="button" className="link-btn" onClick={changeLimit}>Change</button>
            </span>
            <span>{g.selectionSubmittedAt ? <>Submitted {fmtDate(g.selectionSubmittedAt)}</> : 'Still selecting'}</span>
            <span className={`access-chip access-chip--${g.access?.locked ? 'locked' : g.access?.status}`}>
              {g.access?.locked ? 'Hosting locked' : `Hosting until ${fmtDate(g.access?.until)}`}
            </span>
          </div>
          <div className="gm__actions">
            <button className="btn btn--ghost btn--sm" onClick={() => setCreds(true)}>🔑 Login details</button>
            {picks.length > 0 && <button className="btn btn--ghost btn--sm" onClick={copyPicks}>Copy picked file names</button>}
            {g.selectionSubmittedAt && <button className="btn btn--ghost btn--sm" onClick={reopen}>Re-open selection</button>}
          </div>
        </div>
      </header>

      <DriveImport call={call} driveOnly onText={addFromDrive} onCopy={r2 ? copyFromDrive : undefined} locked={Boolean(progress)}>
        {progress && (
          <div className="drive__progress" role="status">
            <span><b>Copying from Drive {progress.done} / {progress.total}</b>{progress.failed ? ` · ${progress.failed} failed` : ''}</span>
            <span className="drive__progress-bar"><i style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} /></span>
            {progress.current && <small>{progress.current}</small>}
          </div>
        )}
      </DriveImport>

      <GalleryFilms g={g} setG={setG} call={call} onChanged={onChanged} />

      <div className="gm__bar">
        <div className="seg" role="tablist">
          {[['all', `All (${g.photos.length})`], ['picks', `Client picks (${picks.length})`], ['notes', `With notes (${g.photos.filter((p) => p.note).length})`]].map(([k, label]) => (
            <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? 'is-on' : ''} onClick={() => setFilter(k)}>{label}</button>
          ))}
        </div>
      </div>

      {images.length === 0 ? (
        <p className="muted gm__empty">{filter === 'all' ? 'No photos yet. Paste a Google Drive folder link above.' : 'Nothing here yet.'}</p>
      ) : (
        <div className="gm__grid">
          {images.map((p, i) => (
            <figure key={p._id} className={`gm__item ${p.favorite ? 'is-pick' : ''}`}>
              <button type="button" className="gm__thumb" onClick={() => setView(i)} aria-label={`View ${p.alt}`}>
                <img src={p.thumb || p.src} alt="" loading="lazy" />
                {p.favorite && <span className="gm__heart" title="Picked by the client">♥</span>}
                {coverRef === refOf(p) && <span className="gm__badge">Cover</span>}
              </button>
              <figcaption>
                <span title={p.alt}>{p.alt}</span>
                {p.note && <q title={p.note}>{p.note}</q>}
              </figcaption>
              <div className="gm__ctl">
                <button type="button" onClick={() => setCover(p)} disabled={coverRef === refOf(p)}>Set cover</button>
                <button type="button" onClick={() => remove(p)}>Remove</button>
              </div>
            </figure>
          ))}
        </div>
      )}

      {view != null && <Lightbox images={images} index={view} onIndex={setView} onClose={() => setView(null)} />}
      {creds && <CredentialsModal gallery={g} call={call} onClose={() => setCreds(false)} />}
    </div>
  );
}
