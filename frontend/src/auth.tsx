import { createContext, useContext, useMemo, useState } from 'react';

export type UserRole = 'student' | 'admin';

type AuthState = {
  role: UserRole | null;
  loginAs: (role: UserRole) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole | null>(() => {
    const saved = localStorage.getItem('demo_role');
    if (saved === 'student' || saved === 'admin') {
      return saved;
    }
    return null;
  });

  const value = useMemo<AuthState>(
    () => ({
      role,
      loginAs: (nextRole: UserRole) => {
        localStorage.setItem('demo_role', nextRole);
        setRole(nextRole);
      },
      logout: () => {
        localStorage.removeItem('demo_role');
        setRole(null);
      },
    }),
    [role]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
