'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getDashboard, DashboardData } from '@/lib/api';

interface AuthContextType {
  token: string | null;
  user: DashboardData['user'] | null;
  billing: DashboardData['billing'] | null;
  profiles: DashboardData['profiles'];
  constellations: DashboardData['constellations'];
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    if (!token) return;
    try {
      const dashboard = await getDashboard();
      setData(dashboard);
    } catch {
      // Token invalid, clear it
      logout();
    }
  };

  const login = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setData(null);
  };

  // Initialize from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (stored) {
      setToken(stored);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Fetch dashboard when token changes
  useEffect(() => {
    if (token) {
      setIsLoading(true);
      getDashboard()
        .then(setData)
        .catch(() => logout())
        .finally(() => setIsLoading(false));
    }
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        token,
        user: data?.user ?? null,
        billing: data?.billing ?? null,
        profiles: data?.profiles ?? [],
        constellations: data?.constellations ?? [],
        isLoading,
        isAuthenticated: !!token && !!data,
        login,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
