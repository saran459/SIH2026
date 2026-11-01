import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, DemoAccount } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  loginDemo: () => Promise<User>;
  logout: () => Promise<void>;
  demoAccounts: DemoAccount[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_CREDENTIALS = {
  email: 'reviewer@aicte.gov.in',
  pass: 'password123'
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('aicte_reviewer_token'));
  const [loading, setLoading] = useState<boolean>(true);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);

  useEffect(() => {
    // Fetch demo accounts filtered to reviewer
    api.getDemoAccounts()
      .then((accounts) => {
        setDemoAccounts(accounts.filter((a) => a.role === 'reviewer'));
      })
      .catch((err) => console.error('Failed to load demo accounts', err));

    // Verify existing token
    if (token) {
      api.getMe()
        .then((userData) => {
          if (userData.role !== 'reviewer') {
            throw new Error('Mismatched portal persona');
          }
          setUser(userData);
          localStorage.setItem('aicte_reviewer_user', JSON.stringify(userData));
        })
        .catch(() => {
          localStorage.removeItem('aicte_reviewer_token');
          localStorage.removeItem('aicte_reviewer_user');
          setToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, pass: string): Promise<User> => {
    setLoading(true);
    try {
      // Send portal: 'reviewer' for server-side role validation
      const res = await api.login(email, pass, 'reviewer');
      if (res.role !== 'reviewer') {
        throw new Error(`Access Denied: This portal is reserved for AICTE Scrutiny Officers. Your account role is '${res.role}'.`);
      }
      localStorage.setItem('aicte_reviewer_token', res.access_token);
      localStorage.setItem('aicte_token', res.access_token);
      setToken(res.access_token);
      const me = await api.getMe();
      setUser(me);
      localStorage.setItem('aicte_reviewer_user', JSON.stringify(me));
      return me;
    } finally {
      setLoading(false);
    }
  };

  const loginDemo = async (): Promise<User> => {
    return await login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.pass);
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.logout();
    } finally {
      localStorage.removeItem('aicte_reviewer_token');
      localStorage.removeItem('aicte_reviewer_user');
      localStorage.removeItem('aicte_token');
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
        isAuthenticated: !!user && user.role === 'reviewer',
        loading,
        login,
        loginDemo,
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
