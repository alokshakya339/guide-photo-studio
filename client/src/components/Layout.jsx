import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { SITE } from '../site.js';
import { useMounted } from './common.jsx';
import { useAccount } from '../account/AccountContext.jsx';
import InstallApp from './InstallApp.jsx';
import {
  IconInstagram, IconFacebook, IconYoutube, IconPhone, IconMail, IconPin, IconClock, IconArrow, IconWhatsApp,
} from './Icons.jsx';

const CAREERS = { to: '/careers', label: 'Careers', hint: 'We’re hiring · join the team' };
const CLIENT_GALLERY = { to: '/client', label: 'Client Gallery', hint: 'View & download your photos' };

const NAV = [
  { to: '/', label: 'Home', end: true, hint: 'Start here' },
  { to: '/portfolio', label: 'Portfolio', hint: 'Weddings, pre-wedding & portraits' },
  { to: '/films', label: 'Films', hint: 'Wedding films & reels' },
  { to: '/services', label: 'Services & Pricing', hint: 'Packages, process & FAQs' },
  { to: '/about', label: 'Our Studio', hint: 'Our story & the team' },
  { to: '/gift-cards', label: 'Gift Cards', hint: 'Give the gift of memories' },
  { to: '/invites', label: 'Invites', hint: 'Digital wedding invitations' },
  { to: '/blog', label: 'Blog', hint: 'Tips, ideas & stories' },
  { to: '/contact', label: 'Contact', hint: 'Check dates & enquire' },
];


/** Header account link: "Log in" when signed out, the customer's first name when signed in. */
function AccountLink({ className = '', onDark }) {
  const { user, loading } = useAccount();
  if (loading) return <span className={`nav__account ${className}`} aria-hidden="true" />;
  const label = user ? String(user.name || 'Account').split(' ')[0] : 'Log in';
  return (
    <Link to={user ? '/account' : '/account/login'} className={`nav__account ${className} ${onDark ? 'is-light' : ''}`} aria-label={user ? 'My account' : 'Log in to your account'}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>
      <span>{label}</span>
    </Link>
  );
}

/** Header link to the private client gallery login (gallery name + password). */
function ClientGalleryLink({ className = '', onDark }) {
  return (
    <Link to="/client" className={`nav__account nav__gallery ${className} ${onDark ? 'is-light' : ''}`} aria-label="Client gallery login">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
      <span>Client gallery</span>
    </Link>
  );
}

// Desktop header: logo left, links centred, account + booking right (the logo is the way home).
// Films and Services & Pricing stay out of the header (desktop bar and menu); the footer still links to them.
const HEADER_HIDDEN = ['/', '/films', '/services'];
const NAV_DESKTOP = NAV.filter((n) => !HEADER_HIDDEN.includes(n.to));
const NAV_MENU = NAV.filter((n) => !HEADER_HIDDEN.slice(1).includes(n.to)); // the menu keeps Home

function Navbar() {
  const mounted = useMounted();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
  }, [open]);
  // Transparent, light-on-dark header only while it sits over the home page's photo hero.
  const over = pathname === '/' && !scrolled && !open;
  const darkApp = pathname.startsWith('/client/') || pathname.startsWith('/admin'); // galleries + admin keep the dark theme

  return (
    <>
    <header className={`nav ${scrolled || pathname !== '/' ? 'nav--solid' : ''} ${open ? 'nav--open' : ''} ${over ? 'nav--over' : ''}`}>
      <div className="container nav__inner nav__inner--bar">
        <Link to="/" className={`nav__logo ${over || darkApp ? 'is-light' : ''}`} aria-label={`${SITE.name} home`}>
          <img className="nav__logo-dark" src="/images/brand/logo-dark.png" alt={SITE.name} width="120" height="48" />
          <img className="nav__logo-light" src="/images/brand/logo.png" alt="" aria-hidden="true" width="120" height="48" />
        </Link>
        <nav className="nav__links" aria-label="Main">
          {NAV_DESKTOP.map((n) => <NavLink key={n.to} to={n.to} end={n.end}>{n.label}</NavLink>)}
        </nav>
        <div className="nav__actions">
          <ClientGalleryLink onDark={over} />
          <AccountLink onDark={over} />
          <button
            className="nav__burger"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <span /><span /><span />
          </button>
        </div>
      </div>
    </header>
    {mounted && createPortal( /* menu drawer: added after mount, so server HTML and first browser render match */
      <div className="nav__drawer" hidden={!open} aria-label="Menu">
        <div className="drawer__scroll">
          <p className="drawer__eyebrow">Menu</p>
          <ol className="drawer__links">
            {[...NAV_MENU, CLIENT_GALLERY, CAREERS].map((n, i) => (
              <li key={n.to} style={{ '--i': i }}>
                <NavLink to={n.to} end={n.end} className="drawer__link">
                  <span className="drawer__num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="drawer__text">
                    <strong>{n.label}</strong>
                    <small>{n.hint}</small>
                  </span>
                  <IconArrow width={20} height={20} className="drawer__arrow" />
                </NavLink>
              </li>
            ))}
          </ol>

          <div className="drawer__quick" style={{ '--i': NAV.length + 1 }}>
            <a href={`tel:${SITE.phoneRaw}`}><IconPhone width={20} height={20} /><span>Call</span></a>
            <a href={`https://wa.me/${SITE.whatsapp}`} target="_blank" rel="noreferrer"><IconWhatsApp width={20} height={20} /><span>WhatsApp</span></a>
            <a href={SITE.social.instagram} target="_blank" rel="noreferrer"><IconInstagram width={20} height={20} /><span>Instagram</span></a>
          </div>

          <Link to="/services" className="drawer__promo" style={{ '--i': NAV.length + 2 }}>
            <img src={SITE.promo?.image || '/images/wedding/w05.jpg'} alt="" loading="lazy" />
            <span>
              <small>{SITE.promo?.label}</small>
              <strong>{SITE.promo?.text}</strong>
            </span>
            <IconArrow width={18} height={18} />
          </Link>

          <p className="drawer__meta" style={{ '--i': NAV.length + 3 }}>
            <IconClock width={16} height={16} /> {SITE.hours}
            <br />
            <IconPin width={16} height={16} /> Arun Vihar, Sector 37, Noida
          </p>
        </div>

        <div className="drawer__ctas">
          <AccountLink className="drawer__account" />
          <Link to="/portfolio" className="btn btn--ghost">Our work</Link>
          <Link to="/contact" className="btn btn--primary">Book a session <IconArrow width={18} height={18} /></Link>
        </div>
      </div>,
      document.body
    )}
    </>
  );
}

function Footer() {
  const { pathname } = useLocation();
  // Home and Contact already end with an enquiry form, so skip the footer's own call-to-action there.
  const showCta = pathname !== '/' && !pathname.startsWith('/contact') && !pathname.startsWith('/careers');
  const F = SITE.footer || {};
  const strip = (F.strip || []).map((x) => (typeof x === 'string' ? x : x?.src)).filter(Boolean).slice(0, 6);
  const year = new Date().getFullYear();
  const wa = `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(`Hi ${SITE.name}, I’d like to check availability for my date.`)}`;
  const insta = SITE.social.instagram;
  const handle = (String(insta || '').match(/instagram\.com\/([^/?#]+)/) || [])[1];
  const instaLabel = F.instagramLabel || (handle ? `@${handle}` : 'Follow on Instagram');
  return (
    <footer className="footer dark-zone">
      <div className="footer__glow" aria-hidden="true" />

      {showCta && <div className="container footer__cta">
        <div>
          <p className="footer__eyebrow"><span /> {F.eyebrow || `Now booking ${year}–${String(year + 1).slice(2)} weddings`}</p>
          <h2 className="footer__headline">{F.title ?? 'Let’s tell'} {F.titleAccent && <em>{F.titleAccent}</em>}{F.titleRest ?? ''}</h2>
        </div>
        <div className="footer__cta-actions">
          <Link to="/contact" className="btn btn--primary">Check your date <IconArrow /></Link>
          <a href={wa} target="_blank" rel="noreferrer" className="btn btn--ghost"><IconWhatsApp /> WhatsApp</a>
        </div>
      </div>}

      {strip.length > 0 && (
        <a className="footer__strip" style={{ '--n': strip.length }} href={insta} target="_blank" rel="noreferrer" aria-label="Follow us on Instagram">
          {strip.map((src) => <img key={src} src={src} alt="" loading="lazy" />)}
          <span className="footer__strip-cta"><IconInstagram /> {instaLabel}</span>
        </a>
      )}

      <div className="container footer__grid">
        <div className="footer__brand">
          <img src="/images/brand/logo.png" alt={SITE.name} className="footer__logo" />
          <p>{SITE.tagline}. Based in {SITE.location}.</p>
          <div className="socials">
            <a href={SITE.social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><IconInstagram /></a>
            <a href={SITE.social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><IconFacebook /></a>
            <a href={SITE.social.youtube} target="_blank" rel="noreferrer" aria-label="YouTube"><IconYoutube /></a>
          </div>
        </div>
        <div>
          <h4>Visit the studio</h4>
          <ul className="footer__contact">
            <li><IconPin /> <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SITE.mapQuery || SITE.address)}`} target="_blank" rel="noreferrer">{SITE.address}</a></li>
            <li><IconClock /> <span>{SITE.hours}</span></li>
          </ul>
        </div>
        <div>
          <h4>Say hello</h4>
          <ul className="footer__contact">
            <li><IconPhone /> <a href={`tel:${SITE.phoneRaw}`}>{SITE.phone}</a></li>
            <li><IconMail /> <a href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
            <li><IconWhatsApp /> <a href={wa} target="_blank" rel="noreferrer">Chat on WhatsApp</a></li>
          </ul>
        </div>
        <div>
          <h4>Explore</h4>
          <ul className="footer__links">
            {NAV.slice(1).map((n) => <li key={n.to}><Link to={n.to}>{n.label}</Link></li>)}
            <li><Link to="/client">Client gallery login</Link></li>
            <li><Link to="/careers">Careers <span className="footer__tag">Hiring</span></Link></li>
            <li><Link to="/privacy">Privacy policy</Link></li>
          </ul>
        </div>
      </div>

      <div className="container">
        <p className="footer__wordmark" aria-hidden="true">Guide <em>Photo</em> Studio</p>
      </div>

      <div className="container footer__bottom">
        <span>© {new Date().getFullYear()} {SITE.name}. All photographs are the property of {SITE.name}.</span>
        <div className="footer__bottom-links">
          <Link to="/privacy">Privacy</Link>
          <Link to="/admin">Studio admin</Link>
        </div>
      </div>
    </footer>
  );
}

const tabIcon = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
const TABS = [
  { to: '/', label: 'Home', end: true, icon: <svg {...tabIcon}><path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1v-8.5Z" /></svg> },
  { to: '/portfolio', label: 'Work', icon: <svg {...tabIcon}><rect x="3" y="7" width="14" height="14" rx="3" /><path d="M7 3h11a3 3 0 0 1 3 3v11" /><path d="m7 16 2.5-2.5L14 18" /></svg> },
  { to: '/contact', label: 'Book', primary: true, icon: <svg {...tabIcon} strokeWidth="2"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13.5" r="3.5" /></svg> },
  { to: '/films', label: 'Films', icon: <svg {...tabIcon}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m10 9.5 5 2.5-5 2.5Z" fill="currentColor" /></svg> },
  { to: '/services', label: 'Pricing', icon: <svg {...tabIcon}><path d="M3 12V4.5A1.5 1.5 0 0 1 4.5 3H12l9 9-9 9-9-9Z" /><circle cx="7.5" cy="7.5" r="1.4" /></svg> },
];

/** App-style bottom tab bar (phones only). */
function TabBar() {
  const { pathname } = useLocation();
  return (
    <nav className="tabbar" aria-label="Quick navigation">
      {TABS.map((t) => {
        const active = t.end ? pathname === t.to : pathname.startsWith(t.to);
        return (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={`tabbar__item ${t.primary ? 'tabbar__item--primary' : ''} ${active ? 'is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <span className="tabbar__icon">{t.icon}</span>
            <span className="tabbar__label">{t.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) { window.scrollTo(0, 0); return undefined; }
    // Links like /services#corporate-enquiry: wait for the target to render, then scroll to it.
    // Scroll once more after content above it (API data) has loaded and shifted the layout.
    let tries = 0;
    const timers = [];
    const find = () => {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (el) {
        el.scrollIntoView({ block: 'start' });
        timers.push(setTimeout(() => el.scrollIntoView({ block: 'start' }), 700));
      } else if (tries++ < 20) timers.push(setTimeout(find, 100));
      else window.scrollTo(0, 0);
    };
    find();
    return () => timers.forEach(clearTimeout);
  }, [pathname, hash]);
  return null;
}

/** On phones the WhatsApp button waits until the visitor scrolls past the first screen,
 *  and stays off pages that already have WhatsApp/contact actions. */
function useWhatsAppVisible() {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);
  // Hide while a form is on screen so the button never covers fields or submit buttons.
  const [overForm, setOverForm] = useState(false);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return undefined;
    const visible = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
      setOverForm(visible.size > 0);
    }, { threshold: 0.05 });
    const watch = () => document.querySelectorAll('main form, footer.footer').forEach((f) => io.observe(f));
    watch();
    // forms can mount after data loads
    const mo = new MutationObserver(watch);
    const main = document.getElementById('main');
    if (main) mo.observe(main, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); setOverForm(false); };
  }, [pathname]);
  const hiddenHere = pathname.startsWith('/contact') || pathname.startsWith('/client') || pathname.startsWith('/admin');
  return { scrolled, hiddenHere, overForm };
}

/** Light editorial theme on the public pages; the client gallery and admin keep their dark app styling. */
function useEditorialTheme() {
  const { pathname } = useLocation();
  useEffect(() => {
    const on = !pathname.startsWith('/admin') && !pathname.startsWith('/client/'); // /client (login) is light too
    const white = on && pathname === '/'; // home page: white instead of cream (editorial.css → .ed--white)
    document.body.classList.toggle('ed', on);
    document.body.classList.toggle('ed--white', white);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', white ? '#ffffff' : on ? '#f7f3ec' : '#0b0b0c');
  }, [pathname]);
}

export default function Layout() {
  useEditorialTheme();
  const wa = useWhatsAppVisible();
  return (
    <>
      <ScrollToTop />
      <a className="skip" href="#main">Skip to content</a>
      <Navbar />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
      <TabBar />
      <InstallApp />
      <a
        className={`wa-float ${wa.scrolled ? 'is-scrolled' : ''} ${wa.hiddenHere ? 'is-hidden-here' : ''} ${wa.overForm ? 'is-over-form' : ''}`}
        href={`https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent('Hi Guide Photo Studio, I would like to enquire about a shoot.')}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with us on WhatsApp"
      >
        <span className="wa-float__icon">
          {/* WhatsApp glyph (filled) */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.28-.2-.57-.35m-5.42 7.4h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88a9.83 9.83 0 0 1 9.88 9.89c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45h.01c6.55 0 11.89-5.34 11.89-11.89a11.82 11.82 0 0 0-3.48-8.41Z" />
          </svg>
          <span className="wa-float__dot" aria-hidden="true" />
        </span>
        <span className="wa-float__label">Chat with us</span>
      </a>
    </>
  );
}
