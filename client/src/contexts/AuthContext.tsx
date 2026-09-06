import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api';
import { AuthCtx, User } from '../types';

export const AuthContext = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('ce_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    api<User>('/auth/me')
      .then(setUser)
      .catch(() => { localStorage.removeItem('ce_token'); setToken(null); })
      .finally(() => setLoading(false));
  }, [token]);

  const login = useCallback((t: string, u: User) => {
    localStorage.setItem('ce_token', t);
    setToken(t); setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ce_token');
    setToken(null); setUser(null);
  }, []);

  if (loading) return null; // block rendering until auth loads

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuth: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}
