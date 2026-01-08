'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AgentChatPanel, AgentMessage } from './AgentChatPanel';
import { AgentRequestError, chatAgent, exportNatalSafeJson } from '@/lib/agentClient';
import { useAgentSettings } from '@/lib/agent-settings';
import { useAuth } from '@/lib/auth-context';

type ToolError = { message: string; requestId?: string; code?: string };

export function AgentDock() {
  const { enabled, memoryEnabled, selectedProfileId, setSelectedProfileId } = useAgentSettings();
  const { profiles, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [requestId, setRequestId] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<ToolError | null>(null);
  const [exportArtifact, setExportArtifact] = useState<{ url: string; expires_at?: string } | null>(null);

  const pageContext = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${document.title} - ${window.location.pathname}`;
  }, []);

  useEffect(() => {
    if (!selectedProfileId && profiles.length === 1) {
      setSelectedProfileId(profiles[0].id);
    }
  }, [profiles, selectedProfileId, setSelectedProfileId]);

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
    } catch (err) {
      if (err instanceof AgentRequestError && err.requestId) {
        setRequestId(err.requestId);
      }
      setMessages((prev) => [
        ...prev,
        { id: `e_${Date.now()}`, role: 'assistant', content: 'Something went wrong. Try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  }, [pageContext, memoryEnabled]);

  const handleExport = useCallback(async () => {
    if (exporting) return;
    setExportError(null);
    setExportArtifact(null);
    if (!isAuthenticated) {
      setRequestId('');
      setExportError({ message: 'Sign in to export your profile.' });
      return;
    }
    if (profiles.length === 0) {
      setRequestId('');
      setExportError({ message: 'Create a profile to export.' });
      return;
    }
    if (!selectedProfileId && profiles.length > 1) {
      setRequestId('');
      setExportError({ message: 'Select a profile to export.' });
      return;
    }
    const profileId = selectedProfileId || (profiles.length === 1 ? profiles[0].id : undefined);
    setExporting(true);
    try {
      const res = await exportNatalSafeJson(profileId);
      setExportArtifact({ url: res.artifact.url, expires_at: res.artifact.expires_at });
      setRequestId(res.requestId);
    } catch (err) {
      if (err instanceof AgentRequestError) {
        if (err.requestId) setRequestId(err.requestId);
        setExportError({ message: err.message || 'Export failed. Try again.', requestId: err.requestId, code: err.code });
      } else {
        setExportError({ message: 'I couldn’t fetch that yet. Try again.' });
      }
    } finally {
      setExporting(false);
    }
  }, [exporting, isAuthenticated, profiles, selectedProfileId]);

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
        onExport={handleExport}
        exportLoading={exporting}
        exportError={exportError}
        exportArtifact={exportArtifact}
        profiles={profiles}
        selectedProfileId={selectedProfileId}
        onSelectProfile={setSelectedProfileId}
      />
    </>
  );
}
