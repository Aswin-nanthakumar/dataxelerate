import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, post, tokenStore } from '../api/client';

const AuthContext = createContext(null);

export const ROLE_LABELS = {
  administrator: 'Administrator',
  city_planner: 'City Planner',
  transport_authority: 'Transportation Authority',
  analyst: 'Analyst',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('uf_user') || 'null'); } catch { return null; }
  });
  const [booting, setBooting] = useState(Boolean(tokenStore.access));

  useEffect(() => {
    if (!tokenStore.access) return;
    (async () => {
      try {
        const res = await api('/auth/me');
        setUser(res.data.user);
        localStorage.setItem('uf_user', JSON.stringify(res.data.user));
      } catch {
        tokenStore.clear();
        setUser(null);
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await post('/auth/login', { email, password });
    tokenStore.set(res.data.accessToken, res.data.refreshToken);
    setUser(res.data.user);
    localStorage.setItem('uf_user', JSON.stringify(res.data.user));
    return res.data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await post('/auth/logout', { refreshToken: tokenStore.refresh }); } catch { /* ignore */ }
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user, login, logout, booting,
    role: user?.role || null,
    isRole: (...roles) => roles.includes(user?.role),
  }), [user, login, logout, booting]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
