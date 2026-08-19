import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { API_URL } from '../lib/config';

export type User = {
  id: string;
  name: string;
  email: string;
  provider: string;
  avatar_url: string | null;
  referral_code: string;
  created_at: string;
};

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: (token: string, name: string, email: string, avatarUrl?: string) => Promise<void>;
  logout: () => void;
  updateProfile: (name: string) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('aou-auth-token'));
  const [loading, setLoading] = useState(true);

  // Load user on mount
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.ok) setUser(data.user); else { localStorage.removeItem('aou-auth-token'); setToken(null); } })
      .catch(() => { localStorage.removeItem('aou-auth-token'); setToken(null); })
      .finally(() => setLoading(false));
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'login_failed');
    localStorage.setItem('aou-auth-token', data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'register_failed');
    localStorage.setItem('aou-auth-token', data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const loginWithGoogle = useCallback(async (googleToken: string, name: string, email: string, avatarUrl?: string) => {
    const res = await fetch(`${API_URL}/api/auth/google`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: googleToken, name, email, avatar_url: avatarUrl }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'google_login_failed');
    localStorage.setItem('aou-auth-token', data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('aou-auth-token');
    setToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (name: string) => {
    if (!token) return;
    const res = await fetch(`${API_URL}/api/auth/profile`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (res.ok && data.ok) setUser(data.user);
  }, [token]);

  const value = useMemo(() => ({ user, token, loading, login, register, loginWithGoogle, logout, updateProfile }), [user, token, loading, login, register, loginWithGoogle, logout, updateProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
