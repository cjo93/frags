import { getPinnedMemories, getMemoriesByIds } from "./db";
import { writeMemoryEvent } from "./db";
import { embedText } from "./embed";

export async function recallMemorySnippets(env: Env, userId: string, query: string): Promise<string[]> {
  const snippets: string[] = [];

  const pinned = await getPinnedMemories(env, userId, 12);
  for (const row of pinned) {
    snippets.push(formatMemoryRow(row.type, row.content_json));
  }

  // Optional semantic recall
  const idx = env.AGENT_MEM_INDEX;
  if (idx) {
    const qVec = await embedText(env, query);
    if (qVec) {
      const res = await idx.query(qVec, { topK: 8, filter: { user_id: userId } });
      const ids = (res.matches ?? []).map((m) => m.id).filter(Boolean);
      const rows = await getMemoriesByIds(env, userId, ids);
      for (const r of rows) snippets.push(formatMemoryRow(r.type, r.content_json));
    }
  }

  await writeMemoryEvent(env, userId, "recall", {
    pinned: pinned.length,
    semantic: Boolean(env.AGENT_MEM_INDEX)
  });

  // De-dup + cap
  return [...new Set(snippets)].slice(0, 16);
}

function formatMemoryRow(type: string, contentJson: string): string {
  try {
    const obj = JSON.parse(contentJson);
    return `[${type}] ${JSON.stringify(obj)}`;
  } catch {
    return `[${type}] ${contentJson}`;
  }
}
