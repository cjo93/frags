'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { ChatContainer } from '@/components/ai';

export default function ProfileAskPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const profileId = params.id as string;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-neutral-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-neutral-950">
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/profile/${profileId}`}
              className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              ← Back to profile
            </Link>
            <h1 className="text-sm font-medium text-neutral-900 dark:text-white">
              Ask AI
            </h1>
          </div>
        </div>
      </header>

      {/* Chat area - full height minus header, with bottom padding for fixed input */}
      <main className="flex-1 max-w-3xl w-full mx-auto flex flex-col pb-32" style={{ height: 'calc(100dvh - 57px)' }}>
        <ChatContainer profileId={profileId} />
      </main>
    </div>
  );
}
