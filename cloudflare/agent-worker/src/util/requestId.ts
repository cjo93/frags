export function getOrCreateRequestId(req: Request): string {
  const existing = req.headers.get("x-request-id");
  if (existing && existing.trim().length > 0) return existing.trim();

  // Simple deterministic-ish ID for logs; good enough for now.
  const rand = crypto.getRandomValues(new Uint8Array(16));
  const hex = [...rand].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `req_${hex}`;
}
