'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { exchangeOAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function AuthCompletePage() {
  return (
    <Suspense
      fallback={(
        <main className="min-h-screen flex items-center justify-center px-6">
          <div className="max-w-sm text-center space-y-3">
            <h1 className="text-xl font-medium">Completing sign-in</h1>
            <p className="text-sm text-neutral-600">Please wait…</p>
          </div>
        </main>
      )}
    >
      <AuthCompleteInner />
    </Suspense>
  );
}

function AuthCompleteInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { data, status } = useSession();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const missingSessionData = status === 'authenticated' && (!data?.provider || !data?.idToken);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const provider = data?.provider;
    const idToken = data?.idToken;
    if (!provider || !idToken) return;
    const inviteToken = params.get('invite') || undefined;

    exchangeOAuth(provider, idToken, inviteToken)
      .then((res) => {
        login(res.token);
        router.replace('/dashboard');
      })
      .catch((err) => {
        setError(err?.detail || 'OAuth exchange failed.');
      });
  }, [status, data, login, router, params]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-sm text-center space-y-3">
        <h1 className="text-xl font-medium">Completing sign-in</h1>
        {error || missingSessionData ? (
          <p className="text-sm text-red-600">{error || 'Missing OAuth session data.'}</p>
        ) : (
          <p className="text-sm text-neutral-600">Please wait…</p>
        )}
      </div>
    </main>
  );
}
