import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, DemoAccount } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string, portal?: string) => Promise<User>;
  loginWithRole: (role: UserRole) => Promise<User>;
  logout: () => Promise<void>;
  demoAccounts: DemoAccount[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_CREDENTIALS: Record<UserRole, { email: string; pass: string }> = {
  institution: { email: 'institution@greenfield.edu', pass: 'password123' },
  reviewer: { email: 'reviewer@aicte.gov.in', pass: 'password123' },
  admin: { email: 'admin@aicte.gov.in', pass: 'password123' }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('aicte_token'));
  const [loading, setLoading] = useState<boolean>(true);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);

  useEffect(() => {
    // Fetch demo accounts list
    api.getDemoAccounts()
      .then(setDemoAccounts)
      .catch((err) => console.error('Failed to load demo accounts', err));

    // Verify existing token
    if (token) {
      api.getMe()
        .then((userData) => {
          setUser(userData);
          localStorage.setItem('aicte_user', JSON.stringify(userData));
        })
        .catch(() => {
          // Token invalid
          localStorage.removeItem('aicte_token');
          localStorage.removeItem('aicte_user');
          setToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, pass: string, portal?: string): Promise<User> => {
    setLoading(true);
    try {
      const res = await api.login(email, pass, portal);
      localStorage.setItem('aicte_token', res.access_token);
      setToken(res.access_token);
      const me = await api.getMe();
      setUser(me);
      localStorage.setItem('aicte_user', JSON.stringify(me));
      return me;
    } finally {
      setLoading(false);
    }
  };

  const loginWithRole = async (role: UserRole): Promise<User> => {
    const creds = DEMO_CREDENTIALS[role];
    if (creds) {
      return await login(creds.email, creds.pass, role);
    }
    throw new Error(`Unknown demo role: ${role}`);
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.logout();
    } finally {
      localStorage.removeItem('aicte_token');
      localStorage.removeItem('aicte_user');
      setToken(null);
      setUser(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loading,
        login,
        loginWithRole,
        logout,
        demoAccounts
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
