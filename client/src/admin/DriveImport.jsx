import { useState } from 'react';
import { useToast } from '../components/Toast.jsx';

/**
 * Paste Google Drive photo links (or a shared folder link, or any image URLs), one per line.
 * Resolves them on the server and hands the image URLs to onAdd(urls).
 * With `onText`, the pasted text is handed over as-is instead (client galleries resolve Drive
 * links on the server and accept Drive only); it should resolve truthy when photos were added.
 * With `onCopy`, a "Copy full size" button is shown too (originals copied into cloud storage) and the
 * plain import becomes "Link only". `locked` disables both while a copy is running.
 */
export default function DriveImport({ call, onAdd, onText, onCopy, locked = false, driveOnly = false, saveToLibrary = false, compact = false, children }) {
  const toast = useToast();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(!compact);

  async function go(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    if (onText) {
      try { if (await onText(text)) setText(''); } finally { setBusy(false); }
      return;
    }
    try {
      const { images, errors } = await call('/admin/cms/resolve-links', { method: 'POST', body: { text, saveToLibrary } });
      if (images.length) {
        await onAdd(images.map((i) => i.url));
        setText('');
      }
      if (errors.length) toast({ type: 'error', title: images.length ? 'Some links were skipped' : 'Nothing imported', message: errors.join(' ') });
      else if (!images.length) toast({ type: 'error', title: 'No photos found in those links' });
    } catch (err) {
      toast({ type: 'error', title: 'Import failed', message: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!text.trim()) return;
    setBusy(true);
    try { if (await onCopy(text)) setText(''); } finally { setBusy(false); }
  }

  if (!open) {
    return (
      <button type="button" className="btn btn--ghost drive__toggle" onClick={() => setOpen(true)}>
        <DriveIcon /> Import from Google Drive
      </button>
    );
  }
  return (
    <form className="drive" onSubmit={go}>
      <div className="drive__head">
        <DriveIcon />
        <strong>Import from Google Drive</strong>
        {compact && <button type="button" className="link-btn" onClick={() => setOpen(false)}>Hide</button>}
      </div>
      <textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={driveOnly
          ? 'Paste a shared Google Drive folder link (or photo links, one per line)\nhttps://drive.google.com/drive/folders/…'
          : 'Paste Google Drive photo links (one per line) or a shared folder link\nhttps://drive.google.com/file/d/…/view\nhttps://drive.google.com/drive/folders/…'}
      />
      <div className="drive__foot">
        {onCopy ? (
          <small className="muted">
            Share the folder as <b>“Anyone with the link can view”</b>. <b>Copy full size</b> stores the original photos in the
            gallery (client downloads are full quality and keep working if the Drive folder changes). <b>Link only</b> is instant
            but shows Google’s ~2000px version and breaks if the Drive files are removed. Sub-folders need their own link.
          </small>
        ) : (
          <small className="muted">Share the files or folder as <b>“Anyone with the link can view”</b>.{driveOnly ? ' Photos inside sub-folders need their own folder link.' : ' Other image URLs work too.'}</small>
        )}
        <span className="drive__btns">
          {onCopy && <button type="button" className="btn btn--primary btn--sm" onClick={copy} disabled={busy || locked || !text.trim()}>Copy full size</button>}
          <button className={`btn btn--sm ${onCopy ? 'btn--ghost' : 'btn--primary'}`} disabled={busy || locked || !text.trim()}>{busy && !onCopy ? 'Importing…' : onCopy ? 'Link only' : 'Import photos'}</button>
        </span>
      </div>
      {children}
    </form>
  );
}

function DriveIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.2 3h7.6l6.2 10.7-3.8 6.6L12 9.4Z" fill="#facc15" />
      <path d="M8.2 3 2 13.7l3.8 6.6L12 9.4Z" fill="#22c55e" />
      <path d="M5.8 20.3h12.4l3.8-6.6H9.6Z" fill="#3b82f6" />
    </svg>
  );
}
