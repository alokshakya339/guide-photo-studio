const base = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

const paths = {
  shield: <><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  gift: <><rect x="3" y="8" width="18" height="13" rx="2" /><path d="M12 8v13M3 12h18M12 8S10.5 3 8 3.5 7 8 12 8zM12 8s1.5-5 4-4.5S17 8 12 8z" /></>,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" />,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  pin: <><path d="M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  youtube: <><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="M10 9.3v5.4l4.6-2.7z" fill="currentColor" /></>,
  insta: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  left: <path d="M15 6l-6 6 6 6" />,
  right: <path d="M9 6l6 6-6 6" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  star: <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3z" fill="currentColor" stroke="none" />,
  home: <><path d="M4 10.5L12 4l8 6.5V19a1.5 1.5 0 01-1.5 1.5H15v-5.5H9v5.5H5.5A1.5 1.5 0 014 19v-8.5z" /></>,
  photos: <><rect x="7" y="3" width="14" height="14" rx="2.5" /><path d="M17 21H6a3 3 0 01-3-3V7" /><path d="M7 14l3.5-3.5 3 3L16 11l5 5" /></>,
  camera: <><path d="M4 8.5A1.5 1.5 0 015.5 7h2.3l1.4-2h5.6l1.4 2h2.3A1.5 1.5 0 0120 8.5v9a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 17.5v-9z" /><circle cx="12" cy="13" r="3.4" /></>,
  tag: <><path d="M3 12V4.5A1.5 1.5 0 014.5 3H12l9 9-9 9-9-9z" /><circle cx="7.5" cy="7.5" r="1.4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0115 0" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  sparkle: <path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7z" />,
  quote: <path d="M7 17c-2 0-3-1.5-3-3.5C4 10 6 7 9 6l.6 1.2C8 8 7.2 9.3 7 10.6c1.8 0 3 1.2 3 3s-1.2 3.4-3 3.4zm9 0c-2 0-3-1.5-3-3.5 0-3.5 2-6.5 5-7.5l.6 1.2c-1.6.8-2.4 2.1-2.6 3.4 1.8 0 3 1.2 3 3s-1.2 3.4-3 3.4z" fill="currentColor" stroke="none" />,
};

export function Icon({ name, size = 22, ...rest }) {
  return <svg {...base} width={size} height={size} {...rest}>{paths[name]}</svg>;
}

export function WhatsAppIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.7 11.8 11.8 0 004.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" />
    </svg>
  );
}

// Little baby footprint used as decoration.
export function Footprint({ size = 28, flip = false, style }) {
  return (
    <svg width={size} height={size * 1.5} viewBox="0 0 20 30" style={{ transform: flip ? 'scaleX(-1)' : undefined, ...style }} aria-hidden="true">
      <ellipse cx="10" cy="20" rx="6.5" ry="9" fill="currentColor" />
      <circle cx="4" cy="7" r="2.2" fill="currentColor" />
      <circle cx="8.2" cy="4.2" r="2" fill="currentColor" />
      <circle cx="12.3" cy="3.6" r="1.8" fill="currentColor" />
      <circle cx="15.6" cy="5" r="1.6" fill="currentColor" />
      <circle cx="17.6" cy="8" r="1.4" fill="currentColor" />
    </svg>
  );
}
