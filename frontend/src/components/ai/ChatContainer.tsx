'use client';

import { useState, useRef, useEffect } from 'react';
import { sendChatMessage, type ChatResponse, type ChatMessage as ChatMessageType } from '@/lib/api';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

interface Message extends ChatMessageType {
  id: string;
  isPreview?: boolean;
  upgradeRequired?: string;
}

interface ChatContainerProps {
  profileId?: string;
  constellationId?: string;
  initialMessage?: string;
}

export function ChatContainer({ profileId, constellationId, initialMessage }: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send initial message if provided
  useEffect(() => {
    if (initialMessage && messages.length === 0) {
      handleSend(initialMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = async (content: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response: ChatResponse = await sendChatMessage(content, {
        thread_id: threadId ?? undefined,
        profile_id: profileId,
        constellation_id: constellationId,
      });

      setThreadId(response.thread_id);

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        ...response.message,
        isPreview: response.preview,
        upgradeRequired: response.upgrade_required,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      
      // Remove the user message if it failed
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-scroll">
        {messages.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Ask questions about this profile&apos;s synthesis. The AI will provide interpretations
                based on the computed layers.
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            isPreview={message.isPreview}
            upgradeRequired={message.upgradeRequired}
          />
        ))}

        {isLoading && (
          <div className="mr-auto max-w-[85%]">
            <div className="px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-600 dark:text-neutral-400">
            <p>{error}</p>
            <p className="mt-1 text-xs text-neutral-500">Try again or refresh the page.</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <ChatInput 
        onSend={handleSend} 
        disabled={isLoading || messages.some(m => m.isPreview)} 
        previewLocked={messages.some(m => m.isPreview)}
      />
    </div>
  );
}
