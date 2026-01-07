import { UserAgentDO } from "./do/UserAgentDO";
import { getOrCreateRequestId } from "./util/requestId";
import { jsonResponse } from "./util/respond";
import { requireAuth } from "./auth/verify";
import { enforceRateAndConcurrency, releaseConcurrency } from "./abuse/enforce";
import { LIMITS } from "./abuse/limits";
import { readJsonWithLimit } from "./util/body";
import {
  buildArtifactKey,
  getSignedArtifactUrl,
  renderExportToSvg,
  sanitizeExportPayload,
  verifySignedArtifactUrl,
  writeArtifact
} from "./export";

export { UserAgentDO };

const metrics = {
  requests: 0,
  errors: 0,
  rateLimited: 0,
  toolCalls: 0,
  exports: 0,
  memoryRecalls: 0
};

let warnedMissingD1 = false;

function getClientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "0.0.0.0"
  );
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const requestId = getOrCreateRequestId(req);
    const url = new URL(req.url);
    const isProd = (env.ENVIRONMENT || "development") === "production";
    metrics.requests += 1;

    try {
      if (isProd && !env.AGENT_DB) {
        return jsonError("D1 binding required", "missing_binding", 500, requestId);
      }
      if (!isProd && !env.AGENT_DB && !warnedMissingD1) {
        console.warn("D1 binding missing; running in limited dev mode.");
        warnedMissingD1 = true;
      }

      if (req.method === "GET" && url.pathname === "/health") {
        return jsonResponse({ ok: true }, { status: 200, requestId });
      }

      if (req.method === "GET" && url.pathname === "/agent/status") {
        return jsonResponse(
          {
            ok: true,
            do: true,
            d1: Boolean(env.AGENT_DB),
            r2: Boolean(env.AGENT_R2),
            vectorize: Boolean(env.AGENT_MEM_INDEX),
            ai: Boolean(env.AI),
            tools: true,
            build: env.BUILD_VERSION || env.ENVIRONMENT || "unknown",
            metrics
          },
          { status: 200, requestId }
        );
      }

      if (url.pathname === "/agent/chat" && req.method === "POST") {
        const auth = await requireAuth(env, req);
        if (!hasScope(auth.scopes, "agent:chat")) {
          return jsonError("Forbidden", "forbidden", 403, requestId);
        }
        const exportAllowed = auth.exportAllowed && hasScope(auth.scopes, "agent:export");

        const body = await readBodyWithLimit(req, LIMITS.chat.maxBodyBytes);

        const ip = getClientIp(req);
        const abuse = enforceRateAndConcurrency({
          endpoint: "chat",
          userId: auth.userId,
          ip,
          isDevAdmin: auth.isDevAdmin
        });
        if (!abuse.ok) {
          metrics.rateLimited += 1;
          return rateLimitResponse(abuse.response, requestId);
        }

        ctx.waitUntil(logRequest("agent.chat", requestId, auth.userId));
        try {
          const id = env.USER_AGENT_DO.idFromName(auth.userId);
          const stub = env.USER_AGENT_DO.get(id);
          const doReq = new Request("https://do/agent/chat", {
            method: "POST",
            headers: forwardHeaders(req.headers, requestId, auth.userId, {
              memoryAllowed: auth.memoryAllowed,
              toolsAllowed: auth.toolsAllowed,
              exportAllowed,
              origin: url.origin
            }),
            body
          });
          const res = await stub.fetch(doReq);
          return withReqId(res, requestId);
        } finally {
          releaseConcurrency(abuse.releaseKey);
        }
      }

      if (url.pathname === "/agent/tool" && req.method === "POST") {
        const auth = await requireAuth(env, req);
        if (!hasScope(auth.scopes, "agent:tool") || !auth.toolsAllowed) {
          return jsonError("Forbidden", "forbidden", 403, requestId);
        }
        const exportAllowed = auth.exportAllowed && hasScope(auth.scopes, "agent:export");

        const body = await readBodyWithLimit(req, LIMITS.tool.maxBodyBytes);

        const ip = getClientIp(req);
        const abuse = enforceRateAndConcurrency({
          endpoint: "tool",
          userId: auth.userId,
          ip,
          isDevAdmin: auth.isDevAdmin
        });
        if (!abuse.ok) {
          metrics.rateLimited += 1;
          return rateLimitResponse(abuse.response, requestId);
        }

        ctx.waitUntil(logRequest("agent.tool", requestId, auth.userId));
        try {
          const id = env.USER_AGENT_DO.idFromName(auth.userId);
          const stub = env.USER_AGENT_DO.get(id);
          const doReq = new Request("https://do/agent/tool", {
            method: "POST",
            headers: forwardHeaders(req.headers, requestId, auth.userId, {
              memoryAllowed: auth.memoryAllowed,
              toolsAllowed: auth.toolsAllowed,
              exportAllowed,
              origin: url.origin
            }),
            body
          });
          const res = await stub.fetch(doReq);
          if (res.ok) metrics.toolCalls += 1;
          return withReqId(res, requestId);
        } finally {
          releaseConcurrency(abuse.releaseKey);
        }
      }

      if (url.pathname === "/agent/export" && req.method === "POST") {
        const auth = await requireAuth(env, req);
        if (!hasScope(auth.scopes, "agent:export") || !auth.exportAllowed) {
          return jsonError("Forbidden", "forbidden", 403, requestId);
        }
        if (!env.AGENT_R2) {
          return jsonResponse({ ok: false, error: "R2_DISABLED", requestId }, { status: 503, requestId });
        }

        const body = await readJsonWithLimit<{ title?: string; safe_json?: unknown; safeJson?: unknown }>(
          req,
          LIMITS.export.maxBodyBytes
        );
        const safeJson = body.safe_json ?? body.safeJson;
        if (safeJson == null) {
          return jsonError("Missing safe_json", "bad_request", 400, requestId);
        }

        const ip = getClientIp(req);
        const abuse = enforceRateAndConcurrency({
          endpoint: "export",
          userId: auth.userId,
          ip,
          isDevAdmin: auth.isDevAdmin
        });
        if (!abuse.ok) {
          metrics.rateLimited += 1;
          return rateLimitResponse(abuse.response, requestId);
        }

        ctx.waitUntil(logRequest("agent.export", requestId, auth.userId));
        try {
          const sanitized = sanitizeExportPayload(safeJson);
          const rendered = renderExportToSvg(body.title ?? "Safe Export", sanitized);
          const key = buildArtifactKey(auth.userId, "svg");
          await writeArtifact(env, key, rendered.bytes, rendered.contentType, {
            requestId,
            userId: auth.userId
          });
          const signed = await getSignedArtifactUrl(env, key, 900, url.origin);
          metrics.exports += 1;
          return jsonResponse(
            {
              ok: true,
              artifact: {
                key,
                url: signed.url,
                expires_at: signed.expiresAt,
                content_type: rendered.contentType
              },
              truncated: rendered.truncated,
              bytes: sanitized.bytes
            },
            { status: 200, requestId }
          );
        } finally {
          releaseConcurrency(abuse.releaseKey);
        }
      }

      if (req.method === "GET" && url.pathname.startsWith("/agent/artifacts/")) {
        if (!env.AGENT_R2) {
          return jsonResponse({ ok: false, error: "R2_DISABLED", requestId }, { status: 503, requestId });
        }
        const ip = getClientIp(req);
        const abuse = enforceRateAndConcurrency({
          endpoint: "artifact",
          userId: `artifact:${ip}`,
          ip,
          isDevAdmin: false
        });
        if (!abuse.ok) {
          metrics.rateLimited += 1;
          return rateLimitResponse(abuse.response, requestId);
        }
        try {
          const key = decodeURIComponent(url.pathname.replace("/agent/artifacts/", ""));
          const exp = Number(url.searchParams.get("exp"));
          const sig = url.searchParams.get("sig") || "";
          const ok = await verifySignedArtifactUrl(env, key, exp, sig);
          if (!ok) return jsonError("Forbidden", "forbidden", 403, requestId);

          const obj = await env.AGENT_R2.get(key);
          if (!obj) return jsonError("Not Found", "not_found", 404, requestId);

          const headers = new Headers();
          obj.writeHttpMetadata(headers);
          headers.set("etag", obj.httpEtag);
          headers.set("cache-control", "private, max-age=3600");
          headers.set("x-request-id", requestId);
          return new Response(obj.body, { status: 200, headers });
        } finally {
          releaseConcurrency(abuse.releaseKey);
        }
      }

      return jsonError("Not Found", "not_found", 404, requestId);
    } catch (e) {
      metrics.errors += 1;
      if (e instanceof Response) return normalizeErrorResponse(e, requestId);
      return jsonError("Internal Error", "internal_error", 500, requestId);
    }
  }
};

function forwardHeaders(
  src: Headers,
  requestId: string,
  userId: string,
  flags?: { memoryAllowed?: boolean; toolsAllowed?: boolean; exportAllowed?: boolean; origin?: string }
): Headers {
  const h = new Headers();
  h.set("content-type", src.get("content-type") || "application/json");
  h.set("x-request-id", requestId);
  h.set("x-user-id", userId);
  if (typeof flags?.memoryAllowed === "boolean") {
    h.set("x-memory-allowed", flags.memoryAllowed ? "true" : "false");
  }
  if (typeof flags?.toolsAllowed === "boolean") {
    h.set("x-tools-allowed", flags.toolsAllowed ? "true" : "false");
  }
  if (typeof flags?.exportAllowed === "boolean") {
    h.set("x-export-allowed", flags.exportAllowed ? "true" : "false");
  }
  if (flags?.origin) {
    h.set("x-origin", flags.origin);
  }
  return h;
}

function withReqId(res: Response, requestId: string): Response {
  const h = new Headers(res.headers);
  h.set("x-request-id", requestId);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

async function readBodyWithLimit(req: Request, maxBytes: number): Promise<ArrayBuffer> {
  const contentLength = req.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new Response("Payload Too Large", { status: 413 });
  }

  const buf = await req.arrayBuffer();
  if (buf.byteLength > maxBytes) {
    throw new Response("Payload Too Large", { status: 413 });
  }
  return buf;
}

function hasScope(scopes: string[], required: string): boolean {
  return scopes.includes("*") || scopes.includes(required);
}

function normalizeErrorResponse(res: Response, requestId: string): Response {
  const status = res.status || 500;
  const code =
    status === 400 ? "bad_request" :
    status === 401 ? "unauthorized" :
    status === 403 ? "forbidden" :
    status === 404 ? "not_found" :
    status === 413 ? "payload_too_large" :
    status === 429 ? "rate_limited" :
    status === 502 ? "upstream_error" :
    "internal_error";
  const message =
    status === 413 ? "Payload Too Large" :
    status === 429 ? "Too Many Requests" :
    status === 502 ? "Upstream Error" :
    res.statusText || "Error";
  return jsonError(message, code, status, requestId);
}

function jsonError(message: string, code: string, status: number, requestId: string): Response {
  return jsonResponse({ error: message, code, requestId }, { status, requestId });
}

async function logRequest(event: string, requestId: string, userId: string): Promise<void> {
  const userHash = await hashUserId(userId);
  console.log(
    JSON.stringify({
      event,
      requestId,
      user: userHash,
      ts: new Date().toISOString()
    })
  );
}

async function hashUserId(userId: string): Promise<string> {
  const data = new TextEncoder().encode(userId);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

function rateLimitResponse(res: Response, requestId: string): Response {
  const retryAfter = res.headers.get("retry-after") || "1";
  const out = jsonError("Too Many Requests", "rate_limited", 429, requestId);
  const headers = new Headers(out.headers);
  headers.set("retry-after", retryAfter);
  return new Response(out.body, { status: out.status, statusText: out.statusText, headers });
}
