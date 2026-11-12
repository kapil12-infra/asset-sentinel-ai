import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@asset-sentinel/shared';
import { api, setUnauthorizedHandler, tokenStore } from './api/client';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  acceptToken: (token: string) => Promise<void>;
  setUser: (u: User) => void;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(!!tokenStore.get());

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!tokenStore.get()) return;
    api.auth.me().then(setUser).catch(logout).finally(() => setLoading(false));
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      loading,
      setUser,
      logout,
      async login(email, password) {
        const r = await api.auth.login(email, password);
        tokenStore.set(r.token);
        setUser(r.user);
      },
      async register(name, email, password) {
        const r = await api.auth.register(name, email, password);
        tokenStore.set(r.token);
        setUser(r.user);
      },
      async acceptToken(token) {
        tokenStore.set(token);
        setUser(await api.auth.me());
      },
    }),
    [user, loading, logout],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside AuthProvider');
  return c;
}
