import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Icon, WhatsAppIcon } from './Icons.jsx';
import { Logo } from './Decor.jsx';
import { STUDIO, JOURNEY, IMG } from './data.js';
import { waLink, pad } from './lib.jsx';
import InstallApp from './InstallApp.jsx';

const NAV_L = [['/portfolio', 'Portfolio'], ['/services', 'Services & Pricing'], ['/about', 'Our Studio'], ['/blog', 'Blog']];
const NAV_R = [['/contact', 'Contact']];
const MENU = [
  ['/', 'Home', 'Start here'],
  ['/portfolio', 'Portfolio', 'Maternity, newborn, baby & family'],
  ['/services', 'Services & Pricing', 'Packages, process & FAQs'],
  ['/about', 'Our Studio', 'Our story & the team'],
  ['/blog', 'Blog', 'Guides & tips for parents'],
  ['/gift-cards', 'Gift Cards', 'Give the gift of memories'],
  ['/contact', 'Contact', 'Check dates & book'],
  ['/client', 'Client Gallery', 'View & download your photos'],
];

/* Scroll to top (or to #hash) on every route change. */
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      return () => clearTimeout(t);
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
    return undefined;
  }, [pathname, hash]); // not `search`: filter changes (?cat=…) must not jump to the top
  return null;
}

/* Keep <link rel="canonical"> and og:url in sync with the route during in-app navigation.
   The server injects them on first load (server/src/seo.js) using SITE_URL; we keep that origin
   and swap only the path (no query string or hash, no trailing slash). */
function CanonicalManager() {
  const { pathname } = useLocation();
  useEffect(() => {
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    let origin = window.location.origin;
    try { origin = new URL(link.getAttribute('href') || '', window.location.href).origin; } catch { /* keep current origin */ }
    const url = `${origin}${pathname === '/' ? '/' : pathname.replace(/\/+$/, '')}`;
    link.setAttribute('href', url);
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', url);
  }, [pathname]);
  return null;
}

function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; }, [open]);

  const link = ([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>;

  return (
    <>
      <header className={`header ${scrolled ? 'solid' : ''}`}>
        <div className="wrap header-row">
          <nav className="nav nav-l" aria-label="Primary">{NAV_L.map(link)}</nav>
          <Link to="/" className="brand" aria-label={`${STUDIO.name} home`}>
            <Logo label={STUDIO.name} />
          </Link>
          <nav className="nav nav-r" aria-label="Secondary">
            {NAV_R.map(link)}
            <NavLink className="nav-client" to="/client"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="3" /><path d="M8 10V7a4 4 0 018 0v3" /></svg>Client Login</NavLink>
            <Link className="nav-book" to="/contact#book">Book a session</Link>
          </nav>
          <button className="menu-btn" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
            <span /><span />
          </button>
        </div>
      </header>

      <div className={`menu ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="menu-top">
          <Logo className="menu-logo" label="" />
          <button className="menu-close" aria-label="Close menu" onClick={() => setOpen(false)}><Icon name="close" /></button>
        </div>
        <nav>
          {MENU.map(([to, label, hint], i) => (
            <NavLink key={to} to={to} end={to === '/'} style={{ transitionDelay: `${open ? 120 + i * 60 : 0}ms` }} onClick={() => setOpen(false)}>
              <small>{pad(i + 1)}</small>
              <span>{label}<em>{hint}</em></span>
            </NavLink>
          ))}
        </nav>
        <Link className="btn btn-dark btn-block" to="/contact#book" onClick={() => setOpen(false)}>Book a session</Link>
        <div className="menu-foot">
          <a href={STUDIO.phoneHref}>{STUDIO.phone}</a>
          <a href={STUDIO.instagram} target="_blank" rel="noreferrer">{STUDIO.instagramHandle}</a>
        </div>
      </div>
    </>
  );
}

const strip = () => [
  '/images/reels/DZIQSwENw-A.jpg', IMG.newborn, '/images/reels/DabxMOPhell.jpg',
  IMG.cake, '/images/reels/DY3h0-sSLXL.jpg', IMG.milestone,
];

function Footer() {
  const handle = STUDIO.instagramHandle;
  return (
    <footer className="footer">
      <div className="footer-glow" aria-hidden="true" />

      <div className="wrap footer-cta">
        <div>
          <p className="footer-eyebrow"><span /> Now booking newborn & maternity sessions</p>
          <h2 className="footer-headline">Let's capture your little one's <em>first steps</em></h2>
        </div>
        <div className="footer-cta-actions">
          <Link className="btn btn-gold" to="/contact#book">Book a session <Icon name="arrow" size={16} /></Link>
          <a className="btn btn-line light" href={waLink('Hi BabySteps! I would like to check availability.')} target="_blank" rel="noreferrer"><WhatsAppIcon size={18} /> WhatsApp</a>
        </div>
      </div>

      <a className="footer-strip" href={STUDIO.instagram} target="_blank" rel="noreferrer" aria-label={`Follow us on Instagram ${handle}`}>
        {strip().map((src) => <img key={src} src={src} alt="" loading="lazy" />)}
        <span className="footer-strip-cta"><Icon name="insta" size={20} /> {handle}</span>
      </a>

      <div className="wrap footer-grid">
        <div className="footer-brand">
          <Logo className="footer-logo" label={STUDIO.name} />
          <p className="footer-script">Timeless memories.</p>
          <p className="footer-tag">Beautifully captured. Forever cherished.</p>
          <div className="footer-socials">
            <a href={STUDIO.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><Icon name="insta" size={19} /></a>
            <a href={waLink('Hi BabySteps!')} target="_blank" rel="noreferrer" aria-label="WhatsApp"><WhatsAppIcon size={19} /></a>
            <a href={STUDIO.phoneHref} aria-label="Call"><Icon name="phone" size={18} /></a>
            <a href={`mailto:${STUDIO.email}`} aria-label="Email"><Icon name="mail" size={18} /></a>
          </div>
        </div>
        <div>
          <h4>Visit the studio</h4>
          <ul className="footer-contact">
            <li><Icon name="pin" size={18} /><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(STUDIO.mapQuery)}`} target="_blank" rel="noreferrer">{STUDIO.address}</a></li>
            <li><Icon name="calendar" size={18} /><Link to="/contact#book">By appointment — book online</Link></li>
          </ul>
        </div>
        <div>
          <h4>Say hello</h4>
          <ul className="footer-contact">
            <li><Icon name="phone" size={18} /><a href={STUDIO.phoneHref}>{STUDIO.phone}</a></li>
            <li><Icon name="mail" size={18} /><a href={`mailto:${STUDIO.email}`}>{STUDIO.email}</a></li>
            <li><WhatsAppIcon size={18} /><a href={waLink('Hi BabySteps!')} target="_blank" rel="noreferrer">Chat on WhatsApp</a></li>
          </ul>
        </div>
        <div className="footer-explore">
          <h4>Explore</h4>
          <ul className="footer-links">
            {MENU.slice(1).map(([to, label]) => <li key={to}><Link to={to}>{label}</Link></li>)}
          </ul>
          <ul className="footer-links sessions">
            {JOURNEY.map((j) => <li key={j.slug}><Link to={`/portfolio/${j.slug}`}>{j.title}</Link></li>)}
          </ul>
        </div>
      </div>

      <div className="wrap">
        <p className="footer-wordmark" aria-hidden="true">Baby<span>Steps</span></p>
      </div>

      <div className="wrap footer-bottom">
        <span>© {new Date().getFullYear()} {STUDIO.name}. A sub-brand of {STUDIO.parent}, Noida. · <Link to="/privacy">Privacy Policy</Link></span>
        <button type="button" className="footer-totop" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          Back to top
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></svg>
        </button>
      </div>
    </footer>
  );
}

const TABS = [['/', 'Home', 'home'], ['/portfolio', 'Portfolio', 'photos'], null, ['/services', 'Pricing', 'tag'], ['/client', 'Gallery', 'user']];

/* Phone/tablet bottom tab bar with a raised Book button in the middle. */
function TabBar() {
  const { pathname } = useLocation();
  return (
    <nav className="tabbar" aria-label="Quick links">
      {TABS.map((t) => t ? (
        <NavLink key={t[0]} to={t[0]} end={t[0] === '/'} className="tab">
          <Icon name={t[2]} size={22} /><span>{t[1]}</span>
        </NavLink>
      ) : (
        <Link key="book" to="/contact#book" className={`tab tab-book ${pathname === '/contact' ? 'active' : ''}`}>
          <i><Icon name="camera" size={24} /></i><span>Book</span>
        </Link>
      ))}
    </nav>
  );
}

/**
 * Discourage saving the studio's photos on public pages: no right-click menu, no drag-to-desktop and
 * no long-press "Save image" on phones. (Screenshots can't be blocked by any website.)
 * Client galleries are excluded — downloads there follow each gallery's own setting.
 */
function ProtectPhotos() {
  const { pathname } = useLocation();
  const on = !pathname.startsWith('/client');
  useEffect(() => {
    if (!on) return undefined;
    const isPhoto = (t) => t instanceof Element && (t.tagName === 'IMG' || t.tagName === 'PICTURE' || t.closest?.('picture, .lb, [data-photo]'));
    const block = (e) => { if (isPhoto(e.target)) e.preventDefault(); };
    document.body.classList.add('no-save');
    document.addEventListener('contextmenu', block);
    document.addEventListener('dragstart', block);
    return () => {
      document.body.classList.remove('no-save');
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('dragstart', block);
    };
  }, [on]);
  return null;
}

export default function Layout() {
  return (
    <>
      <ProtectPhotos />
      <ScrollManager />
      <CanonicalManager />
      <Header />
      <main><Outlet /></main>
      <Footer />
      <a className="wa-fab" href={waLink('Hi BabySteps! I would like to know more about your sessions.')} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp">
        <WhatsAppIcon size={26} />
      </a>
      <TabBar />
      <InstallApp />
    </>
  );
}
