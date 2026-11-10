import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthUser } from '@shared/types';
import { http } from '@/shared/api/http';
import { AuthContext } from './AuthContext';

type AuthContextProviderProps = {
  children: ReactNode;
};

export const AuthContextProvider = ({ children }: AuthContextProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const { data } = await http.get<{ user: AuthUser }>('/auth/me');
        if (!cancelled) {
          setUser(data.user);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await http.post('/auth/logout');
    } catch {
      // ignore network errors on logout
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      setUser,
      logout,
    }),
    [user, isLoading, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
