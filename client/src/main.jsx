import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import { Portfolio, Category } from './pages/Portfolio.jsx';
import { Films, Services, About, Contact, NotFound, Privacy } from './pages/Info.jsx';
import GiftCards from './pages/GiftCards.jsx';
import InvitePage from './invites/InvitePage.jsx';
import Invites from './pages/Invites.jsx';
import { ClientLogin, ClientGallery } from './pages/ClientGallery.jsx';
import Admin from './pages/Admin.jsx';
import Careers from './pages/Careers.jsx';
import { AccountProvider } from './account/AccountContext.jsx';
import { Login, Register, Forgot, Reset, Verify } from './account/AuthPages.jsx';
// The account area (incl. the invitation editor) loads only when a customer opens it.
const acct = (name) => lazy(() => import('./account/Account.jsx').then((m) => ({ default: m[name] })));
const RequireAccount = acct('RequireAccount');
const AccountInvitations = acct('AccountInvitations');
const AccountInvitationEditor = acct('AccountInvitationEditor');
const AccountGiftCards = acct('AccountGiftCards');
const AccountProfile = acct('AccountProfile');
const Wait = ({ children }) => <Suspense fallback={<div className="acct-loading"><span /></div>}>{children}</Suspense>;
import './account/account.css';
import './styles.css';
import './editorial.css';
import { loadSite } from './site.js';
import { ToastProvider } from './components/Toast.jsx';
import { DialogProvider } from './components/Dialog.jsx';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Pull editable content (settings, films, reels) from the CMS, then render.
loadSite().finally(() => root.render(
  <React.StrictMode>
    <ToastProvider>
    <DialogProvider>
    <AccountProvider>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="invite/:slug" element={<InvitePage />} />
        <Route path="admin" element={<Admin />} />
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="portfolio" element={<Portfolio />} />
          <Route path="portfolio/:slug" element={<Category />} />
          <Route path="films" element={<Films />} />
          <Route path="services" element={<Services />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="careers" element={<Careers />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="gift-cards" element={<GiftCards />} />
          <Route path="invites" element={<Invites />} />
          <Route path="client" element={<ClientLogin />} />
          <Route path="client/:slug" element={<ClientGallery />} />
          <Route path="account/login" element={<Login />} />
          <Route path="account/register" element={<Register />} />
          <Route path="account/forgot" element={<Forgot />} />
          <Route path="account/reset" element={<Reset />} />
          <Route path="account/verify" element={<Verify />} />
          <Route path="account" element={<Wait><RequireAccount><AccountInvitations /></RequireAccount></Wait>} />
          <Route path="account/gift-cards" element={<Wait><RequireAccount><AccountGiftCards /></RequireAccount></Wait>} />
          <Route path="account/profile" element={<Wait><RequireAccount><AccountProfile /></RequireAccount></Wait>} />
          <Route path="account/invitations/:id" element={<Wait><RequireAccount><AccountInvitationEditor /></RequireAccount></Wait>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </AccountProvider>
    </DialogProvider>
    </ToastProvider>
  </React.StrictMode>
));

// Installable app + fast repeat visits: register the service worker in production builds only.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // pick up a new version when people come back to the tab
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    }).catch(() => {});
  });
}
