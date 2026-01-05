'use client';

import Link from 'next/link';
import type { ChatMessage as ChatMessageType } from '@/lib/api';

interface ChatMessageProps {
  message: ChatMessageType;
  isPreview?: boolean;
  upgradeRequired?: string;
}

export function ChatMessage({ message, isPreview, upgradeRequired }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`${isUser ? 'ml-auto max-w-[80%]' : 'mr-auto max-w-[85%]'}`}>
      <div
        className={`
          px-4 py-3 text-sm leading-relaxed
          ${isUser
            ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white'
            : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800'
          }
        `}
      >
        {/* Message content */}
        <div className={isPreview ? 'relative' : ''}>
          <p className="whitespace-pre-wrap">{message.content}</p>
          
          {/* Preview fade overlay */}
          {isPreview && (
            <div 
              className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-neutral-900 to-transparent pointer-events-none"
              aria-hidden="true"
            />
          )}
        </div>

        {/* Citations */}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-1">Sources</p>
            <div className="flex flex-wrap gap-2">
              {message.citations.map((citation, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 bg-neutral-50 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
                >
                  {citation.layer}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Preview upgrade prompt */}
      {isPreview && upgradeRequired && (
        <div className="mt-3 p-4 border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
            This is a preview of relational synthesis.
          </p>
          <p className="text-sm text-neutral-500 dark:text-neutral-500 mb-4">
            Full interpretation is available in the Constellation tier.
          </p>
          <Link
            href="/pricing"
            className="inline-flex px-4 py-2 text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-80 transition-opacity"
          >
            Unlock full synthesis
          </Link>
        </div>
      )}
    </div>
  );
}
