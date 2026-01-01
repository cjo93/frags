import crypto from "node:crypto";

// Deterministic JSON stringify with stable key ordering.
export function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => canonicalStringify(item));
    return `[${items.join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  const serialized = entries.map(([key, val]) => `${JSON.stringify(key)}:${canonicalStringify(val)}`);
  return `{${serialized.join(",")}}`;
}

export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}
