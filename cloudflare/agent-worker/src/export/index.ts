import { redactDeep } from "../tools/redact";

const EXPORT_LIMITS = {
  maxJsonBytes: 96 * 1024,
  maxDepth: 6,
  maxArrayItems: 80,
  maxStringChars: 2000,
  maxLines: 140,
  maxLineChars: 160,
  maxSvgBytes: 256 * 1024
} as const;

const DROP_KEYS = new Set([
  "id",
  "user_id",
  "profile_id",
  "reading_id",
  "session_id",
  "db_id",
  "inputs_hash",
  "internal",
  "debug",
  "tokens",
  "token",
  "secret",
  "api_key",
  "private_key",
  "service_config"
]);

const DROP_REGEX = /(token|secret|api[_-]?key|private[_-]?key|password|cookie|authorization|internal|debug|session_id)$/i;

export type SanitizedExport = {
  safe: unknown;
  truncated: boolean;
  bytes: number;
};

export type RenderedExport = {
  bytes: Uint8Array;
  contentType: string;
  truncated: boolean;
};

export function sanitizeExportPayload(input: unknown): SanitizedExport {
  const redacted = redactDeep(input);
  const { value, truncated } = limitValue(redacted, 0);
  let safe = value;
  let bytes = byteLength(JSON.stringify(safe));
  let trimmed = truncated;

  if (bytes > EXPORT_LIMITS.maxJsonBytes) {
    const preview = JSON.stringify(safe);
    safe = {
      notice: "Export trimmed for size. See backend for full data.",
      preview: preview.slice(0, EXPORT_LIMITS.maxJsonBytes)
    };
    bytes = byteLength(JSON.stringify(safe));
    trimmed = true;
  }

  return { safe, truncated: trimmed, bytes };
}

export function renderExportToSvg(title: string, exportData: SanitizedExport): RenderedExport {
  const jsonText = JSON.stringify(exportData.safe, null, 2) ?? "";
  const rawLines = jsonText.split("\n");
  const lines = rawLines.slice(0, EXPORT_LIMITS.maxLines).map((line) =>
    line.length > EXPORT_LIMITS.maxLineChars ? `${line.slice(0, EXPORT_LIMITS.maxLineChars)}...` : line
  );
  const truncated = exportData.truncated || rawLines.length > EXPORT_LIMITS.maxLines;

  const padding = 28;
  const lineHeight = 18;
  const headerLines = [
    title || "Safe Export",
    `Generated: ${new Date().toISOString()}`,
    truncated ? "Note: output truncated for safety." : "Note: sanitized for safety."
  ];
  const displayLines = [...headerLines, "", ...lines];
  const width = 900;
  const height = padding * 2 + displayLines.length * lineHeight;

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="100%" height="100%" fill="#0f0f10"/>`,
    `<text x="${padding}" y="${padding + lineHeight}" fill="#f5f5f5" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="13">`,
    ...displayLines.map((line, idx) => {
      const y = padding + lineHeight + idx * lineHeight;
      return `<tspan x="${padding}" y="${y}">${escapeXml(line)}</tspan>`;
    }),
    "</text>",
    "</svg>"
  ].join("");

  const bytes = new TextEncoder().encode(svg);
  if (bytes.byteLength > EXPORT_LIMITS.maxSvgBytes) {
    const fallbackLines = [
      title || "Safe Export",
      `Generated: ${new Date().toISOString()}`,
      "Note: export too large to render in full."
    ];
    const fallbackSvg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${padding * 2 + fallbackLines.length * lineHeight}" viewBox="0 0 ${width} ${padding * 2 + fallbackLines.length * lineHeight}">`,
      `<rect width="100%" height="100%" fill="#0f0f10"/>`,
      `<text x="${padding}" y="${padding + lineHeight}" fill="#f5f5f5" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="13">`,
      ...fallbackLines.map((line, idx) => {
        const y = padding + lineHeight + idx * lineHeight;
        return `<tspan x="${padding}" y="${y}">${escapeXml(line)}</tspan>`;
      }),
      "</text>",
      "</svg>"
    ].join("");
    return {
      bytes: new TextEncoder().encode(fallbackSvg),
      contentType: "image/svg+xml; charset=utf-8",
      truncated: true
    };
  }

  return {
    bytes,
    contentType: "image/svg+xml; charset=utf-8",
    truncated
  };
}

export async function writeArtifact(
  env: Env,
  key: string,
  bytes: Uint8Array,
  contentType: string,
  meta?: { requestId?: string; userId?: string }
): Promise<void> {
  if (!env.AGENT_R2) {
    throw new Response("R2 binding missing", { status: 500 });
  }
  if (bytes.byteLength > EXPORT_LIMITS.maxSvgBytes) {
    throw new Response("Artifact too large", { status: 413 });
  }
  await env.AGENT_R2.put(key, bytes, {
    httpMetadata: {
      contentType,
      cacheControl: "private, max-age=3600"
    },
    customMetadata: {
      request_id: meta?.requestId ?? "",
      user_id: meta?.userId ?? ""
    }
  });
}

export async function getSignedArtifactUrl(
  env: Env,
  key: string,
  ttlSeconds: number,
  origin?: string
): Promise<{ url: string; expiresAt: string }> {
  const secret = getSigningSecret(env);
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const signature = await hmacSign(secret, `${key}.${exp}`);
  const path = `/agent/artifacts/${encodeURIComponent(key)}?exp=${exp}&sig=${signature}`;
  const base = origin && origin.startsWith("http") ? origin : "";
  return {
    url: `${base}${path}`,
    expiresAt: new Date(exp * 1000).toISOString()
  };
}

export async function verifySignedArtifactUrl(
  env: Env,
  key: string,
  exp: number,
  signature: string
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(exp) || exp <= now) return false;
  const secret = getSigningSecret(env);
  const expected = await hmacSign(secret, `${key}.${exp}`);
  return timingSafeEqual(expected, signature);
}

export function buildArtifactKey(userId: string, suffix: string): string {
  const rand = crypto.getRandomValues(new Uint8Array(8));
  const hex = [...rand].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `exports/${userId}/${Date.now()}_${hex}.${suffix}`;
}

function limitValue(value: unknown, depth: number): { value: unknown; truncated: boolean } {
  if (depth > EXPORT_LIMITS.maxDepth) return { value: "[truncated: depth]", truncated: true };

  if (Array.isArray(value)) {
    const limited = value.slice(0, EXPORT_LIMITS.maxArrayItems).map((item) => limitValue(item, depth + 1));
    return {
      value: limited.map((item) => item.value),
      truncated: limited.some((item) => item.truncated) || value.length > EXPORT_LIMITS.maxArrayItems
    };
  }

  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    let truncated = false;
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (DROP_KEYS.has(key.toLowerCase())) {
        truncated = true;
        continue;
      }
      if (DROP_REGEX.test(key)) {
        truncated = true;
        continue;
      }
      if (/_id$/i.test(key)) {
        truncated = true;
        continue;
      }
      const next = limitValue(val, depth + 1);
      out[key] = next.value;
      if (next.truncated) truncated = true;
    }
    return { value: out, truncated };
  }

  if (typeof value === "string") {
    if (value.length <= EXPORT_LIMITS.maxStringChars) return { value, truncated: false };
    return { value: `${value.slice(0, EXPORT_LIMITS.maxStringChars)}...`, truncated: true };
  }

  return { value, truncated: false };
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getSigningSecret(env: Env): string {
  const secret =
    env.EXPORT_SIGNING_SECRET?.trim() ||
    env.AGENT_JWT_SECRET?.trim() ||
    env.BACKEND_HMAC_SECRET?.trim();
  if (!secret) {
    throw new Response("Export signing secret missing", { status: 500 });
  }
  return secret;
}

async function hmacSign(secret: string, payload: string): Promise<string> {
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

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
