export async function embedText(env: Env, text: string): Promise<number[] | null> {
  if (!env.AI) return null;

  // This is intentionally defensive: model names may vary per account.
  // If this errors, we gracefully skip embeddings.
  try {
    const result = await env.AI.run("@cf/baai/bge-base-en-v1.5", { text });
    const vec = result?.data?.[0] ?? result?.data ?? result?.embedding ?? null;
    if (Array.isArray(vec) && vec.every((n) => typeof n === "number")) return vec as number[];
    return null;
  } catch {
    return null;
  }
}
