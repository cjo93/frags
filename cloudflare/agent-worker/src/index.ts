import { UserAgentDO } from "./do/UserAgentDO";
import { getOrCreateRequestId } from "./util/requestId";
import { jsonResponse } from "./util/respond";
import { requireAuth } from "./auth/verify";
import { enforceRateAndConcurrency, releaseConcurrency } from "./abuse/enforce";
import { LIMITS } from "./abuse/limits";

export { UserAgentDO };

const metrics = {
  requests: 0,
  errors: 0,
  rateLimited: 0,
  toolCalls: 0,
  memoryRecalls: 0
};

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
    metrics.requests += 1;

    try {
      if (req.method === "GET" && url.pathname === "/health") {
        return jsonResponse({ ok: true }, { status: 200, requestId });
      }

      if (req.method === "GET" && url.pathname === "/agent/status") {
        return jsonResponse(
          {
            ok: true,
            do: true,
            d1: Boolean(env.AGENT_DB),
            vectorize: Boolean(env.AGENT_MEM_INDEX),
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
              toolsAllowed: auth.toolsAllowed
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

      if (url.pathname === "/agent/tool" && req.method === "POST") {
        const auth = await requireAuth(env, req);
        if (!hasScope(auth.scopes, "agent:tool") || !auth.toolsAllowed) {
          return jsonError("Forbidden", "forbidden", 403, requestId);
        }

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
              toolsAllowed: auth.toolsAllowed
            }),
            body
          });
          const res = await stub.fetch(doReq);
          return withReqId(res, requestId);
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
  flags?: { memoryAllowed?: boolean; toolsAllowed?: boolean }
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
