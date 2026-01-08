'use client';

type AgentTokenResponse = {
  agent_token: string;
  expires_at: string;
};

type AgentChatResponse = {
  reply: string;
};

type AgentError = {
  error: string;
  code?: string;
  requestId?: string;
};

type ExportArtifact = {
  key: string;
  url: string;
  expires_at?: string;
  content_type?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.defrag.app';
const AGENT_BASE = process.env.NEXT_PUBLIC_AGENT_URL || 'https://agent.defrag.app';

const cachedTokens = new Map<string, { token: string; expiresAt: number }>();

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function getAgentToken(options?: { mem?: boolean; tools?: boolean; export?: boolean }): Promise<string> {
  const now = Date.now();
  const key = `${options?.mem ?? true}-${options?.tools ?? true}-${options?.export ?? true}`;
  const cached = cachedTokens.get(key);
  if (cached && cached.expiresAt - now > 60_000) return cached.token;

  const authToken = getAuthToken();
  if (!authToken) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}/auth/agent-token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      mem: options?.mem ?? true,
      tools: options?.tools ?? true,
      export: options?.export ?? true,
    }),
  });

  if (!res.ok) {
    throw new Error('Failed to mint agent token');
  }

  const data = (await res.json()) as AgentTokenResponse;
  const expiresAt = new Date(data.expires_at).getTime();
  cachedTokens.set(key, { token: data.agent_token, expiresAt });
  return data.agent_token;
}

function makeRequestId(): string {
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoObj?.randomUUID) {
    return `req_${cryptoObj.randomUUID()}`;
  }
  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint8Array(16);
    cryptoObj.getRandomValues(bytes);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `req_${hex}`;
  }
  return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export class AgentRequestError extends Error {
  requestId?: string;
  code?: string;

  constructor(message: string, requestId?: string, code?: string) {
    super(message);
    this.name = 'AgentRequestError';
    this.requestId = requestId;
    this.code = code;
  }
}

export async function chatAgent(
  message: string,
  pageContext?: string,
  options?: { memoryEnabled?: boolean }
): Promise<{ reply: string; requestId: string }>{
  const token = await getAgentToken({ mem: options?.memoryEnabled ?? true, tools: true, export: false });
  const reqId = makeRequestId();
  const res = await fetch(`${AGENT_BASE}/agent/chat`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      'x-request-id': reqId,
    },
    body: JSON.stringify({ message, pageContext, memoryEnabled: options?.memoryEnabled }),
  });

  const requestId = res.headers.get('x-request-id') || '';
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: 'Request failed' }))) as AgentError;
    throw new AgentRequestError(err.error || 'Request failed', err.requestId || requestId, err.code);
  }

  const data = (await res.json()) as AgentChatResponse;
  return { reply: data.reply, requestId };
}

export async function runAgentTool(
  name: string,
  args?: Record<string, unknown>,
  options?: { export?: boolean }
): Promise<{ result: unknown; requestId: string }>{
  const token = await getAgentToken({ mem: true, tools: true, export: options?.export ?? false });
  const reqId = makeRequestId();
  const res = await fetch(`${AGENT_BASE}/agent/tool`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      'x-request-id': reqId,
    },
    body: JSON.stringify({ name, args }),
  });

  const requestId = res.headers.get('x-request-id') || '';
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: 'Request failed' }))) as AgentError;
    throw new AgentRequestError(err.error || 'Request failed', err.requestId || requestId, err.code);
  }

  const result = await res.json();
  return { result, requestId };
}

export async function exportNatalSafeJson(
  profileId?: string
): Promise<{ artifact: ExportArtifact; requestId: string }>{
  const { result, requestId } = await runAgentTool(
    'natal_export',
    profileId ? { profile_id: profileId } : undefined,
    { export: true }
  );
  const artifact = (result as { artifact?: ExportArtifact })?.artifact;
  if (!artifact?.url) {
    throw new Error('Export failed');
  }
  return { artifact, requestId };
}
