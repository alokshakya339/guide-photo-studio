import { Link } from 'react-router-dom';
import { usePage } from '../lib.jsx';

export default function NotFound() {
  usePage('Page not found');
  return (
    <section className="notfound wrap">
      <span className="nf-code">404</span>
      <h1 className="page-title">This page took a <em>tiny detour</em></h1>
      <p className="muted">The page you are looking for doesn't exist.</p>
      <Link className="btn btn-dark" to="/">Back to home</Link>
    </section>
  );
}
