import { createContext } from 'react';
import type { AuthUser } from '@shared/types';

export type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
