import { redactDeep } from "./redact";
import { insertToolAudit, writeMemoryEvent } from "../memory/db";

type ToolName = "natal_export_full";

export async function runTool(env: Env, userId: string, requestId: string, name: string, args: unknown): Promise<unknown> {
  if (name !== "natal_export_full") {
    throw new Response("Tool not allowed", { status: 400 });
  }

  try {
    const safe = await natalExportFull(env, userId, requestId, args);
    await writeMemoryEvent(env, userId, "tool", { name, requestId });
    await insertToolAudit(env, {
      userId,
      tool: name,
      requestId,
      status: "ok",
      redactedOutputJson: safe
    });
    return safe;
  } catch (e) {
    await insertToolAudit(env, {
      userId,
      tool: name,
      requestId,
      status: "error"
    });
    throw e;
  }
}

async function natalExportFull(env: Env, userId: string, requestId: string, args: unknown): Promise<unknown> {
  const validatedArgs = validateNatalExportArgs(args);
  const url = new URL("/tools/natal/export_full", env.BACKEND_URL).toString();

  const res = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-request-id": requestId,
        "x-user-id": userId
      },
      body: JSON.stringify({ args: validatedArgs })
    },
    8000
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Response(`Backend tool failed: ${text}`, { status: 502 });
  }

  const raw = await res.json<unknown>();
  const redacted = redactDeep(raw);

  // "Safe export" wrapper: keeps a stable contract to the frontend
  return { safe_json: redacted };
}

function validateNatalExportArgs(args: unknown): Record<string, unknown> {
  if (args == null) return {};
  if (typeof args !== "object" || Array.isArray(args)) {
    throw new Response("Invalid tool args", { status: 400 });
  }
  return args as Record<string, unknown>;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    throw new Response("Upstream timeout", { status: 504 });
  } finally {
    clearTimeout(timeout);
  }
}
