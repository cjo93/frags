"use client";

import { useState } from "react";

interface ChatPanelProps {
  profileId: string;
}

export function ChatPanel({ profileId }: ChatPanelProps) {
  const [input, setInput] = useState("Run compute for this profile and summarize ephemeris.");
  const [assistantText, setAssistantText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  function readAloud() {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;
    if (!assistantText.trim()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(assistantText);
    window.speechSynthesis.speak(utterance);
  }

  async function send() {
    setIsStreaming(true);
    setAssistantText("");
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
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE blocks delimited by blank lines.
        while (true) {
          const idx = buffer.indexOf("\n\n");
          if (idx === -1) break;
          const block = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);

          const dataLine = block
            .split("\n")
            .find((line) => line.startsWith("data:"));
          if (!dataLine) continue;

          const data = dataLine.slice("data:".length).trim();
          if (!data || data === "[DONE]") continue;

          try {
            const json = JSON.parse(data);
            const delta =
              typeof json?.delta === "string"
                ? json.delta
                : typeof json?.text === "string"
                  ? json.text
                  : typeof json?.output_text === "string"
                    ? json.output_text
                    : null;
            if (delta) {
              setAssistantText((prev) => prev + delta);
            }
          } catch {
            // Ignore non-JSON tool/control events.
          }
        }
      }
    } catch (err) {
      setAssistantText(err instanceof Error ? err.message : "Error streaming response");
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
        <div className="flex items-center gap-2">
          <button
            onClick={readAloud}
            className="rounded border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
            disabled={!assistantText.trim() || isStreaming || typeof window === "undefined"}
          >
            Read aloud
          </button>
          <button
            onClick={send}
            className="rounded bg-blue-700 px-3 py-2 text-white hover:bg-blue-600 disabled:opacity-60"
            disabled={isStreaming}
          >
            {isStreaming ? "Streaming..." : "Send"}
          </button>
        </div>
      </div>
      <textarea
        className="w-full rounded border p-2 text-sm"
        rows={3}
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <div className="h-48 overflow-auto rounded border bg-gray-50 p-2 text-sm whitespace-pre-wrap">
        {assistantText || "Awaiting response..."}
      </div>
    </div>
  );
}
