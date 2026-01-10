'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

interface UserListItem {
  id: string;
  email: string;
  role: string;
  created_at: string | null;
  plan: string;
  stripe_customer_id: string | null;
}

interface AdminStats {
  total_users: number;
  total_profiles: number;
  active_subscriptions: number;
}

interface AIConfig {
  ai_provider: string;
  ai_configured: boolean;
  supports_chat: boolean;
  supports_vision: boolean;
  supports_image: boolean;
  image_enabled: boolean;
  openai_configured: boolean;
  openai_model: string;
  openai_key_prefix: string | null;
}

interface AdminConfig {
  dev_admin_enabled: boolean;
  dev_admin_email: string | null;
  dev_admin_expires_at: string | null;
  admin_mutations_enabled: boolean;
  stripe_configured: boolean;
  stripe_webhook_configured: boolean;
  ai_provider: string;
  ai_configured: boolean;
  image_enabled: boolean;
  openai_configured: boolean;
  app_base_url: string;
  api_base_url: string;
}

interface Invite {
  email: string;
  created_at: string | null;
  expires_at: string | null;
  accepted_at: string | null;
}

interface AbuseMetrics {
  total_requests: number;
  rate_limit_blocked: number;
  concurrency_blocked: number;
  size_blocked: number;
  by_endpoint: Record<string, number>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.defrag.app';
const DEV_MODE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEV === 'true';

export default function AdminPage() {
  const { token, isAuthenticated } = useAuth();
  const router = useRouter();
  
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [aiConfig, setAIConfig] = useState<AIConfig | null>(null);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [abuseMetrics, setAbuseMetrics] = useState<AbuseMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [impersonateResult, setImpersonateResult] = useState<{token: string; expires_at: string} | null>(null);
  
  // Quick Action States
  const [activeTab, setActiveTab] = useState<'users' | 'invites' | 'metrics'>('users');
  const [quickActionEmail, setQuickActionEmail] = useState('');
  const [quickActionPlan, setQuickActionPlan] = useState('insight');
  const [quickActionLoading, setQuickActionLoading] = useState(false);
  const [quickActionResult, setQuickActionResult] = useState<{type: 'success' | 'error'; message: string} | null>(null);

  const fetchAdminData = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    setError('');
    
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // Fetch all admin data in parallel
      const [statsRes, configRes, aiConfigRes, usersRes, invitesRes, metricsRes] = await Promise.all([
        fetch(`${API_URL}/admin/stats`, { headers }),
        fetch(`${API_URL}/admin/config`, { headers }),
        fetch(`${API_URL}/admin/ai/config`, { headers }),
        fetch(`${API_URL}/admin/users?limit=50`, { headers }),
        fetch(`${API_URL}/admin/beta/invites`, { headers }).catch(() => null),
        fetch(`${API_URL}/admin/metrics/abuse`, { headers }).catch(() => null),
      ]);
      
      if (!statsRes.ok || !configRes.ok || !aiConfigRes.ok || !usersRes.ok) {
        const failedRes = [statsRes, configRes, aiConfigRes, usersRes].find(r => !r.ok);
        if (failedRes?.status === 401) {
          setError('Not authenticated - sign in with the dev admin email');
        } else if (failedRes?.status === 403) {
          setError('Not authorized - admin role required');
        } else {
          setError(`API error: ${failedRes?.status}`);
        }
        setLoading(false);
        return;
      }
      
      const [statsData, configData, aiConfigData, usersData] = await Promise.all([
        statsRes.json(),
        configRes.json(),
        aiConfigRes.json(),
        usersRes.json(),
      ]);
      
      // Optional data
      const invitesData = invitesRes?.ok ? await invitesRes.json() : { invites: [] };
      const metricsData = metricsRes?.ok ? await metricsRes.json() : null;
      
      setStats(statsData);
      setConfig(configData);
      setAIConfig(aiConfigData);
      setUsers(usersData.users);
      setInvites(invitesData.invites || []);
      setAbuseMetrics(metricsData);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Quick Action Handlers
  const handleGrantBeta = async () => {
    if (!token || !quickActionEmail.trim()) return;
    setQuickActionLoading(true);
    setQuickActionResult(null);
    
    try {
      const res = await fetch(`${API_URL}/admin/beta/grant`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: quickActionEmail.trim(), plan_key: quickActionPlan }),
      });
      
      if (!res.ok) {
        const text = await res.text();
        setQuickActionResult({ type: 'error', message: text });
      } else {
        setQuickActionResult({ type: 'success', message: `Granted ${quickActionPlan} access to ${quickActionEmail}` });
        setQuickActionEmail('');
        fetchAdminData();
      }
    } catch {
      setQuickActionResult({ type: 'error', message: 'Network error' });
    } finally {
      setQuickActionLoading(false);
    }
  };

  const handleRevokeBeta = async () => {
    if (!token || !quickActionEmail.trim()) return;
    setQuickActionLoading(true);
    setQuickActionResult(null);
    
    try {
      const res = await fetch(`${API_URL}/admin/beta/revoke`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: quickActionEmail.trim() }),
      });
      
      if (!res.ok) {
        const text = await res.text();
        setQuickActionResult({ type: 'error', message: text });
      } else {
        setQuickActionResult({ type: 'success', message: `Revoked access from ${quickActionEmail}` });
        setQuickActionEmail('');
        fetchAdminData();
      }
    } catch {
      setQuickActionResult({ type: 'error', message: 'Network error' });
    } finally {
      setQuickActionLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    if (!token || !quickActionEmail.trim()) return;
    setQuickActionLoading(true);
    setQuickActionResult(null);
    
    try {
      const res = await fetch(`${API_URL}/admin/beta/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: quickActionEmail.trim(), ttl_hours: 168 }),
      });
      
      if (!res.ok) {
        const text = await res.text();
        setQuickActionResult({ type: 'error', message: text });
      } else {
        const data = await res.json();
        setQuickActionResult({ 
          type: 'success', 
          message: `Invite created! Token: ${data.invite_token?.slice(0, 16)}...` 
        });
        setQuickActionEmail('');
        fetchAdminData();
      }
    } catch {
      setQuickActionResult({ type: 'error', message: 'Network error' });
    } finally {
      setQuickActionLoading(false);
    }
  };

  const handleResetAbuseMetrics = async () => {
    if (!token || !confirm('Reset all abuse metrics? This cannot be undone.')) return;
    
    try {
      const res = await fetch(`${API_URL}/admin/metrics/abuse/reset`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (res.ok) {
        fetchAdminData();
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    if (!DEV_MODE_ENABLED) {
      router.replace('/');
      return;
    }
    
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    
    fetchAdminData();
  }, [isAuthenticated, router, fetchAdminData]);

  const handleImpersonate = async (user: UserListItem) => {
    if (!token || !config?.admin_mutations_enabled) return;
    
    try {
      const res = await fetch(`${API_URL}/admin/impersonate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: user.id, duration_minutes: 15 }),
      });
      
      if (!res.ok) {
        const text = await res.text();
        alert(`Error: ${text}`);
        return;
      }
      
      const result = await res.json();
      setImpersonateResult(result);
      setSelectedUser(user);
    } catch {
      alert('Network error');
    }
  };

  const useImpersonationToken = () => {
    if (!impersonateResult) return;
    localStorage.setItem('token', impersonateResult.token);
    window.location.href = '/dashboard';
  };

  if (!DEV_MODE_ENABLED) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-gray-400">Loading admin data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-500"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="inline-block px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-semibold rounded-full mb-2">
              ADMIN PANEL
            </div>
            <h1 className="text-2xl font-bold">System Administration</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm"
            >
              ← Dashboard
            </button>
            <button
              onClick={() => router.push('/settings')}
              className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-lg text-sm"
            >
              Back to Settings
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="text-3xl font-bold text-white">{stats.total_users}</div>
              <div className="text-gray-400 text-sm">Total Users</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="text-3xl font-bold text-white">{stats.total_profiles}</div>
              <div className="text-gray-400 text-sm">Total Profiles</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-400">{stats.active_subscriptions}</div>
              <div className="text-gray-400 text-sm">Active Subscriptions</div>
            </div>
          </div>
        )}

        {/* Config Status */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {config && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <h3 className="font-semibold mb-3">System Config</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Dev Admin</span>
                  <span className={config.dev_admin_enabled ? 'text-amber-400' : 'text-gray-500'}>
                    {config.dev_admin_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                {config.dev_admin_expires_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Token Expires</span>
                    <span className={new Date(config.dev_admin_expires_at) > new Date() ? 'text-amber-400' : 'text-red-400'}>
                      {new Date(config.dev_admin_expires_at).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Admin Mutations</span>
                  <span className={config.admin_mutations_enabled ? 'text-amber-400' : 'text-gray-500'}>
                    {config.admin_mutations_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Stripe</span>
                  <span className={config.stripe_configured ? 'text-green-400' : 'text-red-400'}>
                    {config.stripe_configured ? 'Configured' : 'Not Configured'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Webhook</span>
                  <span className={config.stripe_webhook_configured ? 'text-green-400' : 'text-red-400'}>
                    {config.stripe_webhook_configured ? 'Configured' : 'Not Configured'}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {aiConfig && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <h3 className="font-semibold mb-3">AI Config</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Provider</span>
                  <span className={aiConfig.ai_configured ? 'text-green-400' : 'text-amber-400'}>
                    {aiConfig.ai_provider}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <span className={aiConfig.ai_configured ? 'text-green-400' : 'text-red-400'}>
                    {aiConfig.ai_configured ? 'Configured' : 'Not Configured'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Chat</span>
                  <span className={aiConfig.supports_chat ? 'text-green-400' : 'text-gray-500'}>
                    {aiConfig.supports_chat ? '✓ Enabled' : '○ Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Vision</span>
                  <span className={aiConfig.supports_vision ? 'text-green-400' : 'text-gray-500'}>
                    {aiConfig.supports_vision ? '✓ Enabled' : '○ Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Image Gen</span>
                  <span className={aiConfig.image_enabled ? 'text-green-400' : 'text-gray-500'}>
                    {aiConfig.image_enabled ? '✓ Enabled' : '○ Disabled'}
                  </span>
                </div>
                {aiConfig.openai_model && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Default Model</span>
                    <span className="text-gray-300 font-mono text-xs">{aiConfig.openai_model}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions Panel */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-8">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Grant/Revoke Access */}
            <div className="space-y-3">
              <label className="block text-sm text-gray-400">User Email</label>
              <input
                type="email"
                value={quickActionEmail}
                onChange={(e) => setQuickActionEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              
              <div className="flex gap-2">
                <select
                  value={quickActionPlan}
                  onChange={(e) => setQuickActionPlan(e.target.value)}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
                >
                  <option value="insight">Insight</option>
                  <option value="integration">Integration</option>
                  <option value="constellation">Constellation</option>
                  <option value="beta">Beta</option>
                  <option value="pro">Pro (legacy)</option>
                </select>
                
                <button
                  onClick={handleGrantBeta}
                  disabled={quickActionLoading || !quickActionEmail.trim() || !config?.admin_mutations_enabled}
                  className="flex-1 px-3 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Grant Access
                </button>
                
                <button
                  onClick={handleRevokeBeta}
                  disabled={quickActionLoading || !quickActionEmail.trim() || !config?.admin_mutations_enabled}
                  className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Revoke
                </button>
              </div>
              
              <button
                onClick={handleCreateInvite}
                disabled={quickActionLoading || !quickActionEmail.trim() || !config?.admin_mutations_enabled}
                className="w-full px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Invite Link
              </button>
            </div>
            
            {/* Quick Status & Result */}
            <div className="space-y-3">
              {quickActionResult && (
                <div className={`p-3 rounded-lg text-sm ${
                  quickActionResult.type === 'success' 
                    ? 'bg-green-500/10 border border-green-500/30 text-green-400' 
                    : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}>
                  {quickActionResult.message}
                </div>
              )}
              
              {!config?.admin_mutations_enabled && (
                <div className="p-3 rounded-lg text-sm bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  ⚠️ Admin mutations are disabled. Set SYNTH_ADMIN_MUTATIONS_ENABLED=true to enable.
                </div>
              )}
              
              <div className="text-xs text-gray-500 space-y-1">
                <p>• <strong>Grant Access</strong>: Give a user a plan without Stripe</p>
                <p>• <strong>Revoke</strong>: Remove manually-granted access</p>
                <p>• <strong>Invite Link</strong>: Create a 7-day registration invite</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'users' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'invites' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Invites ({invites.length})
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'metrics' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Abuse Metrics
          </button>
        </div>

        {/* Users Table */}
        {activeTab === 'users' && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <h3 className="font-semibold">Users</h3>
            <button
              onClick={fetchAdminData}
              className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded"
            >
              Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-400 font-medium">Email</th>
                  <th className="text-left px-4 py-2 text-gray-400 font-medium">Role</th>
                  <th className="text-left px-4 py-2 text-gray-400 font-medium">Plan</th>
                  <th className="text-left px-4 py-2 text-gray-400 font-medium">Created</th>
                  <th className="text-left px-4 py-2 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-gray-800 hover:bg-gray-800/30">
                    <td className="px-4 py-2">
                      <div className="font-medium">{user.email}</div>
                      <div className="text-gray-500 text-xs font-mono">{user.id.slice(0, 8)}...</div>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        user.role === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-700 text-gray-300'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        user.plan === 'constellation' ? 'bg-purple-500/20 text-purple-400' :
                        user.plan === 'integration' ? 'bg-blue-500/20 text-blue-400' :
                        user.plan === 'insight' ? 'bg-green-500/20 text-green-400' :
                        'bg-gray-700 text-gray-400'
                      }`}>
                        {user.plan}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-400">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-2">
                      {config?.admin_mutations_enabled ? (
                        <button
                          onClick={() => handleImpersonate(user)}
                          className="px-2 py-1 text-xs bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded"
                        >
                          Impersonate
                        </button>
                      ) : (
                        <span className="text-gray-500 text-xs">Mutations disabled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Invites Table */}
        {activeTab === 'invites' && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-semibold">Beta Invites</h3>
              <button
                onClick={fetchAdminData}
                className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded"
              >
                Refresh
              </button>
            </div>
            {invites.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No invites found. Create one using Quick Actions above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="text-left px-4 py-2 text-gray-400 font-medium">Email</th>
                      <th className="text-left px-4 py-2 text-gray-400 font-medium">Created</th>
                      <th className="text-left px-4 py-2 text-gray-400 font-medium">Expires</th>
                      <th className="text-left px-4 py-2 text-gray-400 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invites.map((invite, i) => {
                      const isExpired = invite.expires_at && new Date(invite.expires_at) < new Date();
                      const isAccepted = !!invite.accepted_at;
                      return (
                        <tr key={i} className="border-t border-gray-800 hover:bg-gray-800/30">
                          <td className="px-4 py-2 font-medium">{invite.email}</td>
                          <td className="px-4 py-2 text-gray-400">
                            {invite.created_at ? new Date(invite.created_at).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-4 py-2 text-gray-400">
                            {invite.expires_at ? new Date(invite.expires_at).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              isAccepted ? 'bg-green-500/20 text-green-400' :
                              isExpired ? 'bg-red-500/20 text-red-400' :
                              'bg-amber-500/20 text-amber-400'
                            }`}>
                              {isAccepted ? 'Accepted' : isExpired ? 'Expired' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Abuse Metrics */}
        {activeTab === 'metrics' && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-semibold">AI Abuse Metrics</h3>
              <div className="flex gap-2">
                {config?.admin_mutations_enabled && (
                  <button
                    onClick={handleResetAbuseMetrics}
                    className="px-3 py-1 text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded"
                  >
                    Reset
                  </button>
                )}
                <button
                  onClick={fetchAdminData}
                  className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded"
                >
                  Refresh
                </button>
              </div>
            </div>
            
            {abuseMetrics ? (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="text-2xl font-bold text-white">{abuseMetrics.total_requests}</div>
                    <div className="text-gray-400 text-xs">Total Requests</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="text-2xl font-bold text-red-400">{abuseMetrics.rate_limit_blocked}</div>
                    <div className="text-gray-400 text-xs">Rate Limited</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="text-2xl font-bold text-amber-400">{abuseMetrics.concurrency_blocked}</div>
                    <div className="text-gray-400 text-xs">Concurrency Blocked</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="text-2xl font-bold text-purple-400">{abuseMetrics.size_blocked}</div>
                    <div className="text-gray-400 text-xs">Size Blocked</div>
                  </div>
                </div>
                
                {abuseMetrics.by_endpoint && Object.keys(abuseMetrics.by_endpoint).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-2">By Endpoint</h4>
                    <div className="space-y-1">
                      {Object.entries(abuseMetrics.by_endpoint).map(([endpoint, count]) => (
                        <div key={endpoint} className="flex justify-between text-sm bg-gray-800 rounded px-3 py-2">
                          <span className="text-gray-400 font-mono text-xs">{endpoint}</span>
                          <span className="text-white">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                Metrics not available. The endpoint may not be configured.
              </div>
            )}
          </div>
        )}

        {/* Impersonation Modal */}
        {impersonateResult && selectedUser && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold mb-4">Impersonation Token Generated</h3>
              
              <div className="bg-gray-800 rounded p-3 mb-4">
                <div className="text-sm text-gray-400 mb-1">Target User</div>
                <div className="font-medium">{selectedUser.email}</div>
              </div>
              
              <div className="bg-gray-800 rounded p-3 mb-4">
                <div className="text-sm text-gray-400 mb-1">Expires</div>
                <div className="font-medium">{new Date(impersonateResult.expires_at).toLocaleString()}</div>
              </div>
              
              <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3 mb-4">
                <p className="text-amber-400 text-sm">
                  ⚠️ This will log you in as {selectedUser.email}. Your dev admin session will end.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={useImpersonationToken}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium"
                >
                  Use Token & Switch
                </button>
                <button
                  onClick={() => {
                    setImpersonateResult(null);
                    setSelectedUser(null);
                  }}
                  className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
