'use client';

import { useEffect, useRef } from 'react';

export type AgentMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  messages: AgentMessage[];
  onSend: (message: string) => void;
  loading: boolean;
  requestId: string;
  memoryEnabled: boolean;
  toolsUsed: string[];
  onExport?: () => void;
  exportLoading?: boolean;
  exportError?: string;
  exportArtifact?: { url: string; expires_at?: string } | null;
};

export function AgentChatPanel({
  open,
  onClose,
  messages,
  onSend,
  loading,
  requestId,
  memoryEnabled,
  toolsUsed,
  onExport,
  exportLoading,
  exportError,
  exportArtifact,
}: Props) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="fixed z-50 bottom-0 right-0 left-0 md:left-auto md:bottom-4 md:right-4 md:w-[380px] bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 shadow-xl rounded-t-2xl md:rounded-2xl"
      style={{
        paddingBottom: 'calc(var(--safe-area-inset-bottom) + 0.5rem)',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Agent chat"
      tabIndex={-1}
    >
      <span tabIndex={0} onFocus={() => inputRef.current?.focus()} />
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <p className="text-sm font-medium">Agent</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Memory: {memoryEnabled ? 'On' : 'Off'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-sm text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
        >
          Close
        </button>
      </div>

      <div className="max-h-[60vh] md:max-h-[520px] overflow-y-auto px-4 py-4 space-y-3 chat-scroll">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={
              msg.role === 'user'
                ? 'ml-auto max-w-[85%] bg-neutral-900 text-white rounded-2xl px-3 py-2 text-sm'
                : 'mr-auto max-w-[85%] bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-2xl px-3 py-2 text-sm'
            }
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto max-w-[80%] bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 rounded-2xl px-3 py-2 text-sm animate-pulse">
            Typing...
          </div>
        )}
      </div>

      <div className="px-4 pb-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
          <span>{requestId ? `Request: ${requestId}` : 'No request yet'}</span>
          <button
            onClick={() => requestId && navigator.clipboard.writeText(requestId)}
            className="text-xs underline underline-offset-4"
            disabled={!requestId}
          >
            Copy
          </button>
        </div>
        {toolsUsed.length > 0 && (
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            Used: {toolsUsed.join(', ')}
          </div>
        )}
        {exportArtifact && (
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-xs text-neutral-600 dark:text-neutral-300 space-y-2">
            <div className="text-sm text-neutral-900 dark:text-neutral-100">Safe export ready</div>
            <a
              href={exportArtifact.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-neutral-900 dark:text-neutral-100 underline underline-offset-4"
            >
              Download image
            </a>
            {exportArtifact.expires_at && (
              <div>Expires: {new Date(exportArtifact.expires_at).toLocaleString()}</div>
            )}
          </div>
        )}
        {exportError && (
          <div className="text-xs text-red-600 dark:text-red-400">{exportError}</div>
        )}
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            disabled={exportLoading}
            className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white underline underline-offset-4 disabled:opacity-50"
          >
            {exportLoading ? 'Exporting...' : 'Export safe JSON'}
          </button>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const value = inputRef.current?.value.trim() || '';
            if (!value) return;
            onSend(value);
            if (inputRef.current) inputRef.current.value = '';
          }}
          className="flex items-end gap-2"
        >
          <textarea
            ref={inputRef}
            rows={2}
            className="flex-1 resize-none rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3 py-2 text-sm"
            placeholder="Ask anything..."
          />
          <button
            type="submit"
            className="tap-target px-3 py-2 rounded-xl bg-neutral-900 text-white text-sm"
            disabled={loading}
          >
            Send
          </button>
        </form>
      </div>
      <span tabIndex={0} onFocus={() => inputRef.current?.focus()} />
    </div>
  );
}
