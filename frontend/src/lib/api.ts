/**
 * API client for Defrag backend
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.defrag.app';

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new ApiError(res.status, body.detail || 'Request failed');
  }

  return res.json();
}

// Auth
export async function register(email: string, password: string, turnstileToken?: string) {
  return request<{ token: string; user_id: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, turnstile_token: turnstileToken }),
  });
}

export async function login(email: string, password: string, turnstileToken?: string) {
  return request<{ token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, turnstile_token: turnstileToken }),
  });
}

// Dashboard
export interface FeatureFlags {
  synthesis_profile: boolean;
  synthesis_constellation: boolean;
  compute_reading: boolean;
  temporal_overlays: boolean;
  state_models: boolean;
  constellation_create: boolean;
  constellation_compute: boolean;
  ai_preview_allowed: boolean;
  ai_full_allowed: boolean;
}

export interface BillingStatus {
  has_stripe: boolean;
  subscription: {
    status: string;
    price_id: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  } | null;
  entitled: boolean;
  plan_key: string;
  plan_name: string;
  feature_flags: FeatureFlags;
}

export interface DashboardData {
  user: {
    id: string;
    email: string;
    role: string;
    created_at: string | null;
  };
  billing: BillingStatus;
  profiles: Array<{
    id: string;
    name: string;
    created_at: string | null;
  }>;
  constellations: Array<{
    id: string;
    name: string;
    created_at: string | null;
  }>;
  usage_30d: Record<string, number>;
}

export async function getDashboard(): Promise<DashboardData> {
  return request<DashboardData>('/dashboard');
}

// Billing
export async function createCheckout(tier: 'insight' | 'integration' | 'constellation') {
  return request<{ url: string }>(`/billing/checkout?price_tier=${tier}`, {
    method: 'POST',
  });
}

export async function createPortal() {
  return request<{ url: string }>('/billing/portal', {
    method: 'POST',
  });
}

// AI Chat
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{ layer: string; source: string }>;
}

export interface ChatResponse {
  thread_id: string;
  message: ChatMessage;
  preview: boolean;
  upgrade_required?: string;
  preview_note?: string;
}

export async function sendChatMessage(
  message: string,
  options?: {
    thread_id?: string;
    profile_id?: string;
    constellation_id?: string;
  }
): Promise<ChatResponse> {
  const params = new URLSearchParams();
  params.set('message', message);
  if (options?.thread_id) params.set('thread_id', options.thread_id);
  if (options?.profile_id) params.set('profile_id', options.profile_id);
  if (options?.constellation_id) params.set('constellation_id', options.constellation_id);
  
  return request<ChatResponse>(`/ai/chat?${params.toString()}`, {
    method: 'POST',
  });
}

// Profiles
export async function createProfileFromText(name: string, natalText: string, timezone = 'UTC') {
  const params = new URLSearchParams({
    name,
    natal_text: natalText,
    viewing_timezone: timezone,
  });
  return request<{ profile_id: string; person: Record<string, unknown> }>(
    `/profiles/from_natal_text?${params.toString()}`,
    { method: 'POST' }
  );
}
