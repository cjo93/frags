const DENY_KEYS = new Set([
  "internal",
  "debug",
  "secrets",
  "tokens",
  "token",
  "key",
  "api_key",
  "secret",
  "db_id",
  "user_id",
  "service_config"
]);

const DENY_REGEX = /(token|secret|api[_-]?key|private[_-]?key|password|cookie|authorization)/i;

export function redactDeep(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(redactDeep);
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (DENY_KEYS.has(k.toLowerCase())) continue;
      if (DENY_REGEX.test(k)) continue;
      out[k] = redactDeep(v);
    }
    return out;
  }
  return input;
}
