'use client';

import { useCallback, useMemo, useState } from 'react';
import { AgentChatPanel, AgentMessage } from './AgentChatPanel';
import { chatAgent } from '@/lib/agentClient';
import { useAgentSettings } from '@/lib/agent-settings';

export function AgentDock() {
  const { enabled, memoryEnabled } = useAgentSettings();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [requestId, setRequestId] = useState('');

  const pageContext = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${document.title} - ${window.location.pathname}`;
  }, []);

  const handleSend = useCallback(async (text: string) => {
    const id = `m_${Date.now()}`;
    setMessages((prev) => [...prev, { id, role: 'user', content: text }]);
    setLoading(true);
    try {
      const res = await chatAgent(text, pageContext, { memoryEnabled });
      setMessages((prev) => [
        ...prev,
        { id: `a_${Date.now()}`, role: 'assistant', content: res.reply },
      ]);
      setRequestId(res.requestId);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `e_${Date.now()}`, role: 'assistant', content: 'Something went wrong. Try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  }, [pageContext, memoryEnabled]);

  if (!enabled) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed z-40 rounded-full bg-neutral-900 text-white shadow-lg w-14 h-14 flex items-center justify-center right-4"
        style={{
          bottom: 'calc(var(--safe-area-inset-bottom) + 1rem)',
        }}
        aria-label="Open agent"
      >
        Ask
      </button>
      <AgentChatPanel
        open={open}
        onClose={() => setOpen(false)}
        messages={messages}
        onSend={handleSend}
        loading={loading}
        requestId={requestId}
        memoryEnabled={memoryEnabled}
        toolsUsed={[]}
      />
    </>
  );
}
