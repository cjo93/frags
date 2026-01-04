'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
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

// Get initial token from localStorage (client-only)
function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

type LoadState = 'idle' | 'loading' | 'done' | 'error';

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize token from localStorage synchronously (no effect needed)
  const [token, setToken] = useState<string | null>(getStoredToken);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loadState, setLoadState] = useState<LoadState>(() => 
    getStoredToken() ? 'loading' : 'idle'
  );

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
    setToken(null);
    setData(null);
    setLoadState('idle');
  }, []);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const dashboard = await getDashboard();
      setData(dashboard);
    } catch {
      logout();
    }
  }, [token, logout]);

  const login = useCallback((newToken: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', newToken);
    }
    setToken(newToken);
    setLoadState('loading');
  }, []);

  // Fetch dashboard when token changes
  useEffect(() => {
    if (!token) return;
    
    let cancelled = false;
    
    getDashboard()
      .then((dashboard) => {
        if (!cancelled) {
          setData(dashboard);
          setLoadState('done');
        }
      })
      .catch(() => {
        if (!cancelled) {
          logout();
        }
      });
    
    return () => { cancelled = true; };
  }, [token, logout]);

  // Derive isLoading from loadState
  const isLoading = loadState === 'loading';

  const value = useMemo(() => ({
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
  }), [token, data, isLoading, login, logout, refresh]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
