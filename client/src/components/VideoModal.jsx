import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/** Where a client film streams from. Drive files must be shared as "Anyone with the link can view". */
export function videoEmbed(v) {
  if (v.kind === 'drive') return `https://drive.google.com/file/d/${v.ref}/preview`;
  if (v.kind === 'youtube') return `https://www.youtube-nocookie.com/embed/${v.ref}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
  return v.ref;
}

export function videoDownload(v) {
  if (v.kind === 'drive') return `https://drive.google.com/uc?export=download&id=${v.ref}`;
  if (v.kind === 'file') return v.ref;
  return null; // YouTube can't be downloaded
}

/** Full-screen player for a list of films, with prev/next and optional download. */
export default function VideoModal({ videos, index, onIndex, onClose, allowDownload }) {
  const v = videos[index];

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && index < videos.length - 1) onIndex(index + 1);
      if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [index, videos.length, onIndex, onClose]);

  if (!v) return null;
  const dl = allowDownload ? videoDownload(v) : null;

  return createPortal(
    <div className="vmodal" role="dialog" aria-modal="true" aria-label={v.title || 'Film'} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="vmodal__bar">
        <div className="vmodal__title">
          <span className="vmodal__count">{String(index + 1).padStart(2, '0')} / {String(videos.length).padStart(2, '0')}</span>
          <strong>{v.title || `Film ${index + 1}`}</strong>
        </div>
        <div className="vmodal__actions">
          {dl && (
            <a className="vmodal__btn" href={dl} target="_blank" rel="noreferrer" aria-label="Download film">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
              <span className="hide-sm">Download</span>
            </a>
          )}
          <button className="vmodal__btn vmodal__btn--icon" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
      </div>

      <div className="vmodal__stage">
        {index > 0 && (
          <button className="vmodal__nav vmodal__nav--prev" onClick={() => onIndex(index - 1)} aria-label="Previous film">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
          </button>
        )}
        <div className="vmodal__frame" key={v._id || v.ref}>
          {v.kind === 'file' ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={v.ref} poster={v.poster || undefined} controls autoPlay playsInline controlsList={allowDownload ? undefined : 'nodownload'} />
          ) : (
            <iframe
              src={videoEmbed(v)}
              title={v.title || 'Film'}
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          )}
          <span className="vmodal__loading" aria-hidden="true"><i /></span>
        </div>
        {index < videos.length - 1 && (
          <button className="vmodal__nav vmodal__nav--next" onClick={() => onIndex(index + 1)} aria-label="Next film">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
          </button>
        )}
      </div>
      {v.kind === 'drive' && <p className="vmodal__hint">Streaming from Google Drive · if it says “still processing”, try again in a few minutes.</p>}
    </div>,
    document.body
  );
}

const PlayIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" /></svg>
);

/** Films laid out cinema-style: the first one featured large, the rest beside / below it. */
export function FilmCards({ videos, onPlay }) {
  const n = videos.length;
  return (
    <div className={`cfilms__grid cfilms__grid--n${Math.min(n, 4)}`}>
      {videos.map((v, i) => {
        const featured = i === 0 && n !== 2;
        const title = v.title || `Film ${i + 1}`;
        return (
          <button key={v._id || v.ref} type="button" className={`cfilm ${featured ? 'cfilm--featured' : ''}`} onClick={() => onPlay(i)} aria-label={`Play ${title}`}>
            {v.poster && (
              <>
                <img className="cfilm__ambient" src={v.poster} alt="" aria-hidden="true" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <img className="cfilm__img" src={v.poster} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              </>
            )}
            <span className="cfilm__shade" aria-hidden="true" />
            <span className="cfilm__num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            <span className="cfilm__play" aria-hidden="true"><PlayIcon size={featured ? 22 : 18} /></span>
            <span className="cfilm__body">
              {featured && <span className="cfilm__kicker">Featured film</span>}
              <span className="cfilm__title">{title}</span>
              <span className="cfilm__cta"><PlayIcon size={12} /> Watch now</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
