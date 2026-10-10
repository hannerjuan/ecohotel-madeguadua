import { onAuthStateChanged, type User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { auth, loginWithGoogle, logout } from '../lib/firebase';

interface AuthState {
  user: User | null;
  isAdmin: boolean;
  /** true mientras se conoce el estado de la sesión. */
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(
    () =>
      onAuthStateChanged(auth, async (current) => {
        setUser(current);
        if (current) {
          // El servidor decide quién es administrador; el navegador solo lo muestra.
          try {
            setIsAdmin((await api.me()).isAdmin);
          } catch {
            setIsAdmin(false);
          }
        } else {
          setIsAdmin(false);
        }
        setLoading(false);
      }),
    [],
  );

  const value: AuthState = {
    user,
    isAdmin,
    loading,
    login: async () => {
      try {
        await loginWithGoogle();
      } catch (err: any) {
        if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') throw err;
      }
    },
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
