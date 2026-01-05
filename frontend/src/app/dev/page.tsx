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

interface ConfigStatus {
  dev_admin_enabled?: boolean;
  dev_admin_expires_at?: string;
  ai_provider?: string;
  ai_configured?: boolean;
  stripe_configured?: boolean;
}

export default function DevPage() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const [testingToken, setTestingToken] = useState(false);
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

  // Fetch config status if we have a token
  useEffect(() => {
    if (currentToken && currentToken.length >= 32) {
      fetchConfigStatus(currentToken);
    }
  }, [currentToken]);

  const fetchConfigStatus = async (authToken: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.defrag.app';
      const res = await fetch(`${apiUrl}/admin/config`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConfigStatus(data);
      }
    } catch {
      // Ignore errors
    }
  };

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

  const handleTestToken = async () => {
    if (token.length < 32) {
      setError('Token must be at least 32 characters');
      return;
    }
    
    setTestingToken(true);
    setError('');
    setConfigStatus(null);
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.defrag.app';
      const res = await fetch(`${apiUrl}/admin/config`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!res.ok) {
        setError(res.status === 401 ? 'Invalid or expired token' : `Error: ${res.status}`);
        setTestingToken(false);
        return;
      }
      
      const data = await res.json();
      setConfigStatus(data);
      setTestingToken(false);
    } catch {
      setError('Network error - check API URL');
      setTestingToken(false);
    }
  };

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
            
            {/* Config Status */}
            {configStatus && (
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-2">
                <h3 className="text-sm font-medium text-gray-300 mb-3">System Status</h3>
                <StatusRow label="AI Provider" value={configStatus.ai_provider || 'disabled'} ok={configStatus.ai_configured} />
                <StatusRow label="Stripe" value={configStatus.stripe_configured ? 'configured' : 'not configured'} ok={configStatus.stripe_configured} />
                {configStatus.dev_admin_expires_at && (
                  <StatusRow 
                    label="Token Expires" 
                    value={new Date(configStatus.dev_admin_expires_at).toLocaleString()} 
                    ok={new Date(configStatus.dev_admin_expires_at) > new Date()} 
                  />
                )}
              </div>
            )}
            
            <div className="space-y-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition"
              >
                Go to Dashboard
              </button>
              
              <button
                onClick={() => router.push('/admin')}
                className="w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg font-medium transition"
              >
                Admin Panel
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
            
            {/* Config status after test */}
            {configStatus && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-2">
                <p className="text-green-400 text-sm font-medium">✓ Token Valid</p>
                <StatusRow label="AI Provider" value={configStatus.ai_provider || 'disabled'} ok={configStatus.ai_configured} />
                <StatusRow label="Stripe" value={configStatus.stripe_configured ? 'configured' : 'not configured'} ok={configStatus.stripe_configured} />
                {configStatus.dev_admin_expires_at && (
                  <StatusRow 
                    label="Expires" 
                    value={new Date(configStatus.dev_admin_expires_at).toLocaleString()} 
                    ok={new Date(configStatus.dev_admin_expires_at) > new Date()} 
                  />
                )}
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleTestToken}
                disabled={testingToken || token.length < 32}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-500 border border-gray-600 rounded-lg font-medium transition"
              >
                {testingToken ? 'Testing...' : 'Test Token'}
              </button>
              
              <button
                type="submit"
                disabled={validating || token.length < 32}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-medium transition"
              >
                {validating ? 'Validating...' : 'Enter Dev Mode'}
              </button>
            </div>
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

function StatusRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-gray-400">{label}</span>
      <span className={ok ? 'text-green-400' : 'text-amber-400'}>
        {ok !== undefined && (ok ? '✓ ' : '○ ')}
        {value}
      </span>
    </div>
  );
}
