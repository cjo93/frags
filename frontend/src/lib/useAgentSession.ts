import { useCallback, useRef, useState } from "react";

type AgentEvent =
  | { type: "session"; session_id: string; pass_level?: string }
  | { type: "narration_start"; pass_level?: string }
  | { type: "narration_chunk"; text: string }
  | { type: "narration_end" }
  | { type: "cancelled"; session_id?: string }
  | { type: "final"; ok: boolean }
  | { type: string; [k: string]: any };

export function useAgentSession(apiBase = "") {
  const esRef = useRef<EventSource | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const start = useCallback(async (payload: any) => {
    // SSE via EventSource requires GET, so we'll use a small pattern:
    // 1) POST to create session URL (or pass token); for now we'll keep using POST by opening a fetch stream elsewhere.
    // If you already expose GET SSE, swap this to EventSource(url).
    throw new Error("Implement start() after Task 2 (server GET SSE URL) OR switch frontend to fetch-stream reader.");
  }, []);

  const stop = useCallback(async () => {
    if (!sessionId) return;
    setIsStreaming(false);
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    await fetch(`${apiBase}/agent/session/${sessionId}/cancel`, { method: "POST" });
  }, [apiBase, sessionId]);

  return { sessionId, isStreaming, start, stop, setSessionId, setIsStreaming, esRef };
}
