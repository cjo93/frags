'use client';

import React, { useState, useRef, useEffect } from 'react';

interface ActionProposal {
  action: string;
  args?: Record<string, any>;
  requires_confirmation?: boolean;
  rationale?: string;
}

interface VoiceOverlayProps {
  userId: string;
}

export default function VoiceOverlay({ userId }: VoiceOverlayProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [actions, setActions] = useState<ActionProposal[]>([]);
  const [log, setLog] = useState<string[]>(['(idle)']);
  
  const esRef = useRef<EventSource | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const addLog = (msg: string) => {
    if (!isMountedRef.current) return;
    setLog((prev) => [msg, ...prev].slice(0, 50)); // Keep last 50 messages
  };

  const clearActions = () => {
    if (!isMountedRef.current) return;
    setActions([]);
  };

  const speak = (text: string) => {
    if (!text || !isMountedRef.current) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const executeAction = async (proposal: ActionProposal) => {
    if (!sessionId) {
      addLog('no session id yet');
      return;
    }

    // Show confirmation for actions that require it
    if (proposal.requires_confirmation) {
      const ok = confirm(proposal.rationale || `Run ${proposal.action}?`);
      if (!ok) {
        // Log declined action to Spiral
        try {
          await fetch('/api/agent/action/decline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: sessionId,
              action: proposal.action,
              args: proposal.args || {},
              reason: 'user_cancelled_confirm',
            }),
          });
        } catch {
          // ignore decline logging errors
        }
        addLog(`declined: ${proposal.action}`);
        return;
      }
    }

    try {
      const res = await fetch('/api/agent/action/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          action: proposal.action,
          args: proposal.args || {},
        }),
      });
      
      const data = await res.json();
      const status = res.ok ? 'ok' : data?.error || 'failed';
      addLog(`execute ${proposal.action}: ${status}`);

      // Handle action responses
      if (data?.type === 'navigate' && data?.route) {
        // Would navigate: window.location.href = data.route;
        addLog(`nav: ${data.route}`);
      } else if (data?.type === 'audio' && data?.ref) {
        addLog(`audio: ${data.ref}`);
      }
    } catch (err) {
      addLog(`execute ${proposal.action}: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  };

  const start = () => {
    if (streaming || esRef.current) return;

    setStreaming(true);
    setLog(['(connecting...)']);
    clearActions();
    setSessionId(null);

    const prompt = encodeURIComponent('read todays briefing');
    const url = `/api/agent/session?user_id=${userId}&prompt=${prompt}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener('session', (event: Event) => {
      const customEvent = event as MessageEvent;
      try {
        const data = JSON.parse(customEvent.data);
        if (isMountedRef.current) {
          setSessionId(data.session_id);
          addLog(`session: ${data.session_id} pass_level=${data.pass_level}`);
        }
      } catch (err) {
        addLog(`parse error (session): ${err}`);
      }
    });

    es.addEventListener('narration_start', () => {
      addLog('narration_start');
    });

    es.addEventListener('narration_chunk', (event: Event) => {
      const customEvent = event as MessageEvent;
      try {
        const data = JSON.parse(customEvent.data);
        addLog(`chunk: ${data.text.substring(0, 50)}...`);
        speak(data.text);
      } catch (err) {
        addLog(`parse error (chunk): ${err}`);
      }
    });

    es.addEventListener('narration_end', () => {
      addLog('narration_end');
    });

    es.addEventListener('action_proposal', (event: Event) => {
      const customEvent = event as MessageEvent;
      try {
        const data = JSON.parse(customEvent.data) as ActionProposal;
        if (isMountedRef.current) {
          setActions((prev) => [...prev, data]);
        }
        addLog(`proposal: ${data.action}`);
      } catch (err) {
        addLog(`parse error (proposal): ${err}`);
      }
    });

    es.addEventListener('final', () => {
      addLog('final');
      cleanup();
    });

    es.addEventListener('cancelled', () => {
      addLog('cancelled');
      cleanup();
    });

    es.onerror = () => {
      addLog('error: connection lost');
      cleanup();
    };
  };

  const stop = async () => {
    window.speechSynthesis.cancel();
    
    if (sessionId) {
      try {
        await fetch(`/api/agent/session/${sessionId}/cancel`, { method: 'POST' });
      } catch (err) {
        addLog(`cancel error: ${err}`);
      }
    }
    
    cleanup();
  };

  const cleanup = () => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    if (isMountedRef.current) {
      setStreaming(false);
      clearActions();
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', padding: '24px', maxWidth: '600px' }}>
      <h2>DEFRAG Voice</h2>
      <p>Live voice layer: streaming narration + interrupt + action proposals.</p>
      
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={start}
          disabled={streaming}
          style={{
            fontSize: '16px',
            padding: '10px 14px',
            marginRight: '6px',
            cursor: streaming ? 'not-allowed' : 'pointer',
          }}
        >
          ▶ Read Aloud
        </button>
        <button
          onClick={stop}
          disabled={!streaming}
          style={{
            fontSize: '16px',
            padding: '10px 14px',
            cursor: !streaming ? 'not-allowed' : 'pointer',
          }}
        >
          ■ Stop
        </button>
      </div>

      {actions.length > 0 && (
        <div style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {actions.map((proposal, idx) => (
            <button
              key={idx}
              onClick={() => executeAction(proposal)}
              style={{
                fontSize: '14px',
                padding: '8px 12px',
                backgroundColor: proposal.requires_confirmation ? '#f0ad4e' : '#5cb85c',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {proposal.rationale ? `${proposal.action} — ${proposal.rationale}` : proposal.action}
            </button>
          ))}
        </div>
      )}

      <div
        style={{
          marginTop: '16px',
          whiteSpace: 'pre-wrap',
          backgroundColor: '#111',
          color: '#eee',
          padding: '12px',
          borderRadius: '8px',
          maxHeight: '300px',
          overflowY: 'auto',
          fontSize: '12px',
        }}
      >
        {log.join('\n')}
      </div>
    </div>
  );
}
