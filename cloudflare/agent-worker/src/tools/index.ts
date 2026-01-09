import { insertToolAudit, writeMemoryEvent } from "../memory/db";
import {
  buildArtifactKey,
  getSignedArtifactUrl,
  renderExportToSvg,
  sanitizeExportPayload,
  writeArtifact
} from "../export";

type ToolContext = {
  env: Env;
  userId: string;
  requestId: string;
  origin?: string;
  exportAllowed: boolean;
};

type ToolHandler = (ctx: ToolContext, args: Record<string, unknown>) => Promise<{
  response: unknown;
  redactedOutput?: unknown;
  redactedOutputRef?: string | null;
  redactionApplied?: boolean;
}>;

const TOOL_HANDLERS: Record<string, ToolHandler> = {
  natal_export: runNatalExport
};

export async function runTool(
  env: Env,
  userId: string,
  requestId: string,
  name: string,
  args: unknown,
  opts: { origin?: string; exportAllowed: boolean }
): Promise<unknown> {
  const handler = TOOL_HANDLERS[name];
  if (!handler) {
    throw new Response("Tool not allowed", { status: 400 });
  }

  const validatedArgs = validateToolArgs(args);
  const startedAt = Date.now();
  try {
    const result = await handler({ env, userId, requestId, origin: opts.origin, exportAllowed: opts.exportAllowed }, validatedArgs);
    await writeMemoryEvent(env, userId, "tool", { name, requestId });
    await insertToolAudit(env, {
      userId,
      tool: name,
      requestId,
      status: "ok",
      argsJson: validatedArgs,
      durationMs: Date.now() - startedAt,
      redactionApplied: result.redactionApplied ?? false,
      redactedOutputRef: result.redactedOutputRef ?? null,
      redactedOutputJson: result.redactedOutput
    });
    return result.response;
  } catch (e) {
    await insertToolAudit(env, {
      userId,
      tool: name,
      requestId,
      status: "error",
      argsJson: validatedArgs,
      durationMs: Date.now() - startedAt
    });
    throw e;
  }
}

async function runNatalExport(ctx: ToolContext, args: Record<string, unknown>): Promise<{
  response: unknown;
  redactedOutput?: unknown;
  redactedOutputRef?: string | null;
  redactionApplied?: boolean;
}> {
  if (!ctx.exportAllowed) {
    throw new Response("Forbidden", { status: 403 });
  }
  if (!ctx.env.AGENT_R2) {
    throw new Response("R2 binding missing", { status: 500 });
  }

  const raw = await callToolGateway(ctx, "/tools/natal/export_full", args);
  const sanitized = sanitizeExportPayload(raw);
  const rendered = renderExportToSvg("Natal Export", sanitized);
  const key = buildArtifactKey(ctx.userId, "svg");
  await writeArtifact(ctx.env, key, rendered.bytes, rendered.contentType, {
    requestId: ctx.requestId,
    userId: ctx.userId
  });
  const signed = await getSignedArtifactUrl(ctx.env, key, 900, ctx.origin);

  return {
    response: {
      artifact: {
        key,
        url: signed.url,
        expires_at: signed.expiresAt,
        content_type: rendered.contentType
      },
      truncated: rendered.truncated,
      bytes: sanitized.bytes
    },
    redactedOutput: sanitized.safe,
    redactedOutputRef: key,
    redactionApplied: true
  };
}

function validateToolArgs(args: unknown): Record<string, unknown> {
  if (args == null) return {};
  if (typeof args !== "object" || Array.isArray(args)) {
    throw new Response("Invalid tool args", { status: 400 });
  }
  const out = args as Record<string, unknown>;
  if ("profile_id" in out && typeof out.profile_id !== "string") {
    throw new Response("Invalid profile_id", { status: 400 });
  }
  if ("include_family" in out && typeof out.include_family !== "boolean") {
    throw new Response("Invalid include_family", { status: 400 });
  }
  return out;
}

async function callToolGateway(
  ctx: ToolContext,
  path: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const url = new URL(path, ctx.env.BACKEND_URL).toString();
  const body = JSON.stringify({ args });
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-request-id": ctx.requestId,
    "x-user-id": ctx.userId
  };

  const secret = ctx.env.BACKEND_HMAC_SECRET?.trim();
  if (!secret) {
    throw new Response("Tool gateway misconfigured", { status: 500 });
  }
  const ts = Math.floor(Date.now() / 1000).toString();
  headers["x-tool-timestamp"] = ts;
  headers["x-tool-signature"] = await signPayload(secret, `${ts}.${ctx.userId}.${body}`);

  const res = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers,
      body
    },
    10000
  );

  if (!res.ok) {
    const reqId = res.headers.get("x-request-id") || ctx.requestId || crypto.randomUUID();
    const text = await res.text();
    let detail = "";
    try {
      const parsed = JSON.parse(text);
      detail = (parsed?.detail || parsed?.error || parsed?.message || "").toString();
    } catch {
      detail = text;
    }
    if (res.status === 404 && (text.includes("Profile not found") || detail === "Profile not found")) {
      return Promise.reject(
        new Response(
          JSON.stringify({
            ok: false,
            code: "profile_required",
            message: "Create your profile to unlock readings and exports.",
            request_id: reqId
          }),
          { status: 400, headers: { "content-type": "application/json", "x-request-id": reqId } }
        )
      );
    }
    throw new Response(`Backend tool failed: ${text}`, { status: 502 });
  }

  return await res.json<unknown>();
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

async function signPayload(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return base64Url(sig);
}

function base64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
