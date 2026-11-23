import { useEffect, useRef, useState } from 'react';

const yt = (id, params) => `https://www.youtube-nocookie.com/embed/${id}?${new URLSearchParams(params)}`;

/**
 * Silent looping background video that covers its parent (parent needs position: relative + overflow: hidden).
 * - `src`: a self-hosted MP4/WebM (best: no YouTube branding, loads fastest) — or
 * - `youtube`: a YouTube video id, looping `length` seconds from `start`.
 * Shows `poster` until the video is playing, plays only while on screen, and stays a still photo for
 * visitors who prefer reduced motion or are on data saver.
 */
export default function VideoBg({ src, youtube, start = 30, length = 40, poster, className = '' }) {
  const root = useRef(null);
  const [inView, setInView] = useState(false);
  const [ready, setReady] = useState(false);
  const [cover, setCover] = useState(null);

  const allowed =
    typeof window !== 'undefined' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
    !navigator.connection?.saveData;

  useEffect(() => {
    const el = root.current;
    if (!el || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: '200px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => { if (!inView && youtube) setReady(false); }, [inView, youtube]);

  // object-fit: cover for a 16:9 iframe (+120px overscan hides YouTube's top/bottom chrome).
  useEffect(() => {
    const el = root.current;
    if (!el || !youtube || !('ResizeObserver' in window)) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const unit = Math.max(width / 16, (height + 120) / 9);
      setCover({ width: Math.ceil(unit * 16), height: Math.ceil(unit * 9) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [youtube]);

  const play = allowed && inView;

  return (
    <div ref={root} className={`vbg ${ready ? 'is-ready' : ''} ${className}`} aria-hidden="true">
      {poster && <img className="vbg__poster" src={poster} alt="" loading="lazy" />}
      {play && src && (
        <video className="vbg__video" src={src} poster={poster} autoPlay muted loop playsInline preload="metadata" onPlaying={() => setReady(true)} />
      )}
      {play && !src && youtube && (
        <iframe
          className="vbg__frame"
          src={yt(youtube, {
            autoplay: 1, mute: 1, controls: 0, loop: 1, playlist: youtube, start, end: start + length,
            playsinline: 1, rel: 0, modestbranding: 1, disablekb: 1, iv_load_policy: 3,
          })}
          title=""
          tabIndex={-1}
          style={cover || undefined}
          allow="autoplay; encrypted-media"
          onLoad={() => setTimeout(() => setReady(true), 900)}
        />
      )}
    </div>
  );
}
