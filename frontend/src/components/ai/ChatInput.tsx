'use client';

import { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** If true, input is locked in preview mode with upgrade hint */
  previewLocked?: boolean;
}

export function ChatInput({ onSend, disabled, placeholder = 'Ask about this profile...', previewLocked }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <div className="flex gap-3 items-end">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          enterKeyHint="send"
          className="
            flex-1 px-4 py-3 text-base
            border border-neutral-200 dark:border-neutral-700
            bg-white dark:bg-neutral-900
            text-neutral-900 dark:text-white
            placeholder:text-neutral-400 dark:placeholder:text-neutral-500
            resize-none min-h-[44px]
            focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-500
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        />
        <button
          type="submit"
          disabled={disabled || !message.trim()}
          className="
            px-4 py-3 text-sm font-medium min-h-[44px]
            bg-neutral-900 dark:bg-white
            text-white dark:text-neutral-900
            hover:opacity-80 transition-opacity
            disabled:opacity-30 disabled:cursor-not-allowed
          "
        >
          Send
        </button>
      </div>
      {previewLocked ? (
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            Upgrade to unlock full interpretation.
          </p>
          <a
            href="/pricing"
            className="text-xs text-neutral-600 dark:text-neutral-400 underline underline-offset-2 hover:text-neutral-900 dark:hover:text-white"
          >
            Unlock full synthesis
          </a>
        </div>
      ) : (
        <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">
          Press Enter to send, Shift+Enter for new line
        </p>
      )}
    </form>
  );
}
