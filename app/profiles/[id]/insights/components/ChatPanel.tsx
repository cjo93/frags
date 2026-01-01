"use client";

import { useState } from "react";

interface ChatPanelProps {
  profileId: string;
}

export function ChatPanel({ profileId }: ChatPanelProps) {
  const [input, setInput] = useState("Run compute for this profile and summarize ephemeris.");
  const [stream, setStream] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  async function send() {
    setIsStreaming(true);
    setStream("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        body: JSON.stringify({ message: input, profileId, engineVersion: "1.0.0" })
      });
      if (!res.body) {
        throw new Error("No response body");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        setStream((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (err) {
      setStream(err instanceof Error ? err.message : "Error streaming response");
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div className="space-y-3 rounded border p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">AI assistant</h3>
          <p className="text-sm text-gray-600">
            Streams via OpenAI Responses API; can call the compute tool.
          </p>
        </div>
        <button
          onClick={send}
          className="rounded bg-blue-700 px-3 py-2 text-white hover:bg-blue-600 disabled:opacity-60"
          disabled={isStreaming}
        >
          {isStreaming ? "Streaming..." : "Send"}
        </button>
      </div>
      <textarea
        className="w-full rounded border p-2 text-sm"
        rows={3}
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <div className="h-48 overflow-auto rounded border bg-gray-50 p-2 text-sm whitespace-pre-wrap">
        {stream || "Awaiting response..."}
      </div>
    </div>
  );
}
