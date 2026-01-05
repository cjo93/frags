'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

/**
 * /dev - Founder/Dev Admin Access Page
 * 
 * Security:
 * - Only available when NEXT_PUBLIC_ENABLE_DEV=true
 * - Requires a 32+ character secret token (SYNTH_DEV_ADMIN_TOKEN from backend)
 * - Token is stored in localStorage as the auth token
 * - All access is logged server-side
 * 
 * Usage:
 * 1. Set NEXT_PUBLIC_ENABLE_DEV=true in Vercel/local env
 * 2. Visit /dev
 * 3. Paste your SYNTH_DEV_ADMIN_TOKEN value
 * 4. Click "Enter Dev Mode" → redirects to /dashboard
 */

const DEV_MODE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEV === 'true';

export default function DevPage() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);
  const { login, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  // Redirect if dev mode is disabled
  useEffect(() => {
    if (!DEV_MODE_ENABLED) {
      router.replace('/');
    }
  }, [router]);

  // If already authenticated, show exit option
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentToken(localStorage.getItem('token'));
    }
  }, [isAuthenticated]);

  if (!DEV_MODE_ENABLED) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-500">Dev Mode Disabled</h1>
          <p className="text-gray-400 mt-2">This page is not available in this environment.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (token.length < 32) {
      setError('Token must be at least 32 characters');
      return;
    }
    
    if (token === 'DEV_ADMIN') {
      setError('The hardcoded "DEV_ADMIN" token is no longer supported. Use your actual secret.');
      return;
    }
    
    setValidating(true);
    
    try {
      // Test the token by hitting the dashboard endpoint
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.defrag.app';
      const res = await fetch(`${apiUrl}/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!res.ok) {
        const text = await res.text();
        setError(res.status === 401 ? 'Invalid token' : `Error: ${text}`);
        setValidating(false);
        return;
      }
      
      // Token works - store it and redirect
      login(token);
      router.push('/dashboard');
    } catch (err) {
      setError('Network error - check API URL');
      setValidating(false);
    }
  };

  const handleLogout = () => {
    logout();
    setCurrentToken(null);
  };

  const isDevAdminSession = currentToken && currentToken.length >= 32 && currentToken !== 'DEV_ADMIN';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <div className="max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="inline-block px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-semibold rounded-full mb-4">
            FOUNDER ACCESS
          </div>
          <h1 className="text-2xl font-bold">Dev Admin Mode</h1>
          <p className="text-gray-400 mt-2 text-sm">
            Enter your secret token to access the app with full Constellation tier.
          </p>
        </div>

        {isDevAdminSession ? (
          <div className="space-y-6">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <p className="text-green-400 text-sm">
                ✓ You are currently in dev admin mode
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Token: {currentToken?.slice(0, 8)}...{currentToken?.slice(-4)}
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition"
              >
                Go to Dashboard
              </button>
              
              <button
                onClick={handleLogout}
                className="w-full py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-lg font-medium transition"
              >
                Exit Dev Mode
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-300 mb-2">
                Dev Admin Token
              </label>
              <input
                id="token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter your 32+ character secret token"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-gray-500"
                autoComplete="off"
              />
              <p className="text-gray-500 text-xs mt-2">
                This is the value of SYNTH_DEV_ADMIN_TOKEN from your backend env vars.
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={validating || token.length < 32}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-medium transition"
            >
              {validating ? 'Validating...' : 'Enter Dev Mode'}
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-gray-800">
          <p className="text-gray-500 text-xs text-center">
            ⚠️ Dev admin access is fully audited. All actions are logged with timestamps.
          </p>
        </div>
      </div>
    </div>
  );
}
