// The site's routes — shared by the browser (main.jsx) and server-side rendering (entry-server.jsx).
import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './Layout.jsx';
import Home from './pages/Home.jsx';
import { Portfolio, Category } from './pages/Portfolio.jsx';
import Services from './pages/Services.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';
import NotFound from './pages/NotFound.jsx';
import { Blog, Post } from './pages/Blog.jsx';
import GiftCards from './pages/GiftCards.jsx';
import Privacy from './pages/Privacy.jsx';
import Videos from './pages/Videos.jsx';

// Rarely-visited, heavy screens load only when opened (keeps the public site's download small).
// They are private (noindex), so the server never pre-renders them.
const ClientLogin = lazy(() => import('./pages/ClientGallery.jsx').then((m) => ({ default: m.ClientLogin })));
const ClientGallery = lazy(() => import('./pages/ClientGallery.jsx').then((m) => ({ default: m.ClientGallery })));
const Unsubscribe = lazy(() => import('./pages/Unsubscribe.jsx'));
const Admin = lazy(() => import('./admin/Admin.jsx'));
const wait = (el) => <Suspense fallback={<div style={{ minHeight: '60vh' }} />}>{el}</Suspense>;

export default function App() {
  return (
    <Routes>
      <Route path="admin" element={wait(<Admin />)} />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="portfolio" element={<Portfolio />} />
        <Route path="portfolio/:slug" element={<Category />} />
        <Route path="videos" element={<Videos />} />
        <Route path="services" element={<Services />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="blog" element={<Blog />} />
        <Route path="gift-cards" element={<GiftCards />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="blog/:slug" element={<Post />} />
        <Route path="client" element={wait(<ClientLogin />)} />
        <Route path="client/:slug" element={wait(<ClientGallery />)} />
        <Route path="unsubscribe/:token" element={wait(<Unsubscribe />)} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
