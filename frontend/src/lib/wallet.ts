const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  'https://api.defrag.app';

type WalletErrorPayload = {
  code?: string;
  message?: string;
  error?: string;
  detail?: string;
  request_id?: string;
  requestId?: string;
};

export class WalletError extends Error {
  status: number;
  code?: string;
  requestId?: string;

  constructor(message: string, status: number, code?: string, requestId?: string) {
    super(message);
    this.name = 'WalletError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export async function downloadPkpass(profileId?: string): Promise<{ requestId?: string }>{
  const token = getAuthToken();
  if (!token) {
    throw new WalletError('Sign in to add your Mandala Card.', 401, 'unauthorized');
  }

  const res = await fetch(`${API_BASE}/wallet/pass`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`
    },
    body: profileId ? JSON.stringify({ profile_id: profileId }) : undefined
  });

  const requestId = res.headers.get('x-request-id') || undefined;
  const contentType = res.headers.get('content-type') || '';
  const isPkpass = contentType.includes('application/vnd.apple.pkpass');

  if (res.ok && isPkpass) {
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return { requestId };
  }

  let payload: WalletErrorPayload = {};
  try {
    payload = (await res.json()) as WalletErrorPayload;
  } catch {
    payload = {};
  }

  const message = payload.message || payload.error || payload.detail || 'Wallet pass unavailable.';
  const code = payload.code;
  const errRequestId = payload.request_id || payload.requestId || requestId;
  throw new WalletError(message, res.status, code, errRequestId);
}
