import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../api/endpoints';
import { clearTokens, getToken, setTokens } from '../api/client';
import type { ProfileInput, User } from '../api/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  requestOtp: (phone: string) => Promise<string>;
  verifyOtp: (requestId: string, code: string) => Promise<User>;
  completeProfile: (input: ProfileInput) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);
const USER_KEY = 'qa_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  });
  const [loading, setLoading] = useState(false);

  // Si hay token, confirma el usuario con el backend al cargar la app
  useEffect(() => {
    if (!getToken() || !user) return;
    setLoading(true);
    api
      .me()
      .then((u) => {
        if (u.role) save(u);
      })
      .catch(() => {
        /* en modo demo el mock no persiste entre recargas: se conserva el usuario local */
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = (u: User | null) => {
    setUser(u);
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_KEY);
  };

  const value: AuthState = {
    user,
    loading,
    async requestOtp(phone) {
      const r = await api.requestOtp(phone);
      return r.request_id;
    },
    async verifyOtp(requestId, code) {
      const r = await api.verifyOtp(requestId, code);
      setTokens(r.access_token, r.refresh_token);
      save(r.user);
      return r.user;
    },
    async completeProfile(input) {
      const u = await api.completeProfile(input);
      save(u);
      return u;
    },
    logout() {
      clearTokens();
      save(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

export const homeForRole = (role: User['role']) =>
  role === 'brigadista' ? '/brigadista' : role === 'autoridad' ? '/autoridad' : '/vecino';
