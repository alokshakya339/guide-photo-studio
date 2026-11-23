import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';

/**
 * The signed-in customer for the whole site. The session lives in an httpOnly cookie set by the server, so the
 * browser never stores a token — we just ask /api/account/me who is signed in.
 */
const AccountCtx = createContext(null);

export function AccountProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still checking, null = signed out

  const refresh = useCallback(async () => {
    try { const d = await api('/account/me'); setUser(d.user); return d.user; } catch { setUser(null); return null; }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (email, password) => {
    const d = await api('/account/login', { method: 'POST', body: { email, password } });
    setUser(d.user);
    return d.user;
  }, []);
  const register = useCallback(async (body) => {
    const d = await api('/account/register', { method: 'POST', body });
    setUser(d.user);
    return d.user;
  }, []);
  const logout = useCallback(async () => {
    try { await api('/account/logout', { method: 'POST' }); } finally { setUser(null); }
  }, []);

  const value = useMemo(() => ({ user, loading: user === undefined, setUser, refresh, login, register, logout }), [user, refresh, login, register, logout]);
  return <AccountCtx.Provider value={value}>{children}</AccountCtx.Provider>;
}

export const useAccount = () => useContext(AccountCtx);

/** Calls the API and turns "session expired" into a redirect-to-login instead of a confusing error. */
export function useAccountCall() {
  const { setUser } = useAccount();
  return useCallback(async (path, opts) => {
    try { return await api(path, opts); } catch (e) {
      if (e.status === 401 && e.data?.code === 'auth') setUser(null);
      throw e;
    }
  }, [setUser]);
}
