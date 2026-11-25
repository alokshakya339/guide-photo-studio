import { useEffect, useRef, useState } from 'react';

const BASE = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  constructor(message, status, details, data) {
    super(message);
    this.status = status;
    this.details = details;
    this.data = data;
  }
}

export async function api(path, { method = 'GET', body, token, headers: extra } = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(extra || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status, data.errors, data);
  return data;
}

/** Simple GET hook: { data, error, loading, reload }. */
/*
 * Server-side rendering hand-over. On the server, `collect` records which API paths a page asks for (first pass),
 * and `data` holds their responses (second pass) so the HTML is rendered with real content. In the browser the same
 * data arrives in window.__SSR__, so the first render matches the server's HTML and nothing is fetched twice.
 */
const ssr = { data: {}, collect: null };
export function setSsrData(data, collect = null) { ssr.data = data || {}; ssr.collect = collect; }

export function useApi(path, deps = []) {
  const has = Boolean(path) && Object.prototype.hasOwnProperty.call(ssr.data, path);
  if (ssr.collect && path) ssr.collect.add(path);
  const [state, setState] = useState(() => (has ? { data: ssr.data[path], error: null, loading: false } : { data: null, error: null, loading: true }));
  const [tick, setTick] = useState(0);
  const preloaded = useRef(has); // already have server data for the first render → skip the first fetch
  useEffect(() => {
    let alive = true;
    if (!path) return undefined;
    if (preloaded.current) { preloaded.current = false; return undefined; }
    setState((s) => ({ ...s, loading: true }));
    api(path)
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error) => alive && setState({ data: null, error, loading: false }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, tick, ...deps]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}

/** Token persisted in localStorage (wrapped in try/catch for private mode). */
export const tokenStore = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      if (value) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};
