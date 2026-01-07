function nowIso(): string {
  return new Date().toISOString();
}

function id(prefix: string): string {
  const rand = crypto.getRandomValues(new Uint8Array(12));
  const hex = [...rand].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${prefix}_${hex}`;
}

export async function writeMemoryEvent(
  env: Env,
  userId: string,
  eventType: string,
  payload: unknown,
  meta?: { source?: string; confidence?: number }
): Promise<void> {
  if (!env.AGENT_DB) return;
  const eventId = id("mev");
  const payloadJson = JSON.stringify(payload);
  const ts = nowIso();
  try {
    await env.AGENT_DB.prepare(
      "INSERT INTO memory_events (id, user_id, event_type, payload_json, created_at, source, confidence) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(eventId, userId, eventType, payloadJson, ts, meta?.source ?? null, meta?.confidence ?? null)
      .run();
  } catch {
    await env.AGENT_DB.prepare(
      "INSERT INTO memory_events (id, user_id, event_type, payload_json, created_at) VALUES (?, ?, ?, ?, ?)"
    )
      .bind(eventId, userId, eventType, payloadJson, ts)
      .run();
  }
}

export type MemoryRow = {
  id: string;
  user_id: string;
  type: string;
  content_json: string;
  embedding_json: string | null;
  source: string | null;
  sensitivity: string | null;
  created_at: string;
  updated_at: string;
};

export async function insertMemory(env: Env, params: {
  userId: string;
  type: string;
  content: unknown;
  embedding?: number[];
  source?: string;
  sensitivity?: "normal" | "sensitive";
  maxItems?: number;
}): Promise<string> {
  if (!env.AGENT_DB) return "mem_disabled";
  const memId = id("mem");
  const ts = nowIso();
  await env.AGENT_DB.prepare(
    "INSERT INTO memories (id, user_id, type, content_json, embedding_json, source, sensitivity, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(
      memId,
      params.userId,
      params.type,
      JSON.stringify(params.content),
      params.embedding ? JSON.stringify(params.embedding) : null,
      params.source ?? null,
      params.sensitivity ?? "normal",
      ts,
      ts
    )
    .run();

  if (params.maxItems) {
    await env.AGENT_DB.prepare(
      "DELETE FROM memories WHERE user_id = ? AND id NOT IN (SELECT id FROM memories WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?)"
    )
      .bind(params.userId, params.userId, params.maxItems)
      .run();
  }

  return memId;
}

export async function getPinnedMemories(env: Env, userId: string, limit: number): Promise<MemoryRow[]> {
  if (!env.AGENT_DB) return [];
  const types = ["fact", "preference", "constraint", "style"];
  const res = await env.AGENT_DB.prepare(
    `SELECT * FROM memories WHERE user_id = ? AND type IN (${types.map(() => "?").join(",")})
     ORDER BY updated_at DESC LIMIT ?`
  )
    .bind(userId, ...types, limit)
    .all<MemoryRow>();

  return res.results ?? [];
}

export async function getMemoriesByIds(env: Env, userId: string, ids: string[]): Promise<MemoryRow[]> {
  if (!env.AGENT_DB) return [];
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(",");
  const stmt = env.AGENT_DB.prepare(
    `SELECT * FROM memories WHERE user_id = ? AND id IN (${placeholders})`
  );
  const res = await stmt.bind(userId, ...ids).all<MemoryRow>();
  return res.results ?? [];
}

export type ConversationTurn = {
  id: string;
  user_id: string;
  thread_id: string;
  role: string;
  content: string;
  tokens_est: number | null;
  created_at: string;
};

export async function insertConversationTurn(env: Env, params: {
  userId: string;
  threadId: string;
  role: "user" | "assistant";
  content: string;
  tokensEst?: number;
  maxTurns: number;
  requestId?: string;
  tokenBudget?: number;
  model?: string;
}): Promise<void> {
  if (!env.AGENT_DB) return;
  const turnId = id("turn");
  const ts = nowIso();
  try {
    await env.AGENT_DB.prepare(
      "INSERT INTO conversation_turns (id, user_id, thread_id, role, content, tokens_est, created_at, request_id, token_budget, model) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(
        turnId,
        params.userId,
        params.threadId,
        params.role,
        params.content,
        params.tokensEst ?? null,
        ts,
        params.requestId ?? null,
        params.tokenBudget ?? null,
        params.model ?? null
      )
      .run();
  } catch {
    await env.AGENT_DB.prepare(
      "INSERT INTO conversation_turns (id, user_id, thread_id, role, content, tokens_est, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(
        turnId,
        params.userId,
        params.threadId,
        params.role,
        params.content,
        params.tokensEst ?? null,
        ts
      )
      .run();
  }

  await env.AGENT_DB.prepare(
    "DELETE FROM conversation_turns WHERE user_id = ? AND id NOT IN (SELECT id FROM conversation_turns WHERE user_id = ? ORDER BY created_at DESC LIMIT ?)"
  )
    .bind(params.userId, params.userId, params.maxTurns)
    .run();
}

export async function getRecentTurns(env: Env, userId: string, limit: number): Promise<ConversationTurn[]> {
  if (!env.AGENT_DB) return [];
  const res = await env.AGENT_DB.prepare(
    "SELECT * FROM conversation_turns WHERE user_id = ? ORDER BY created_at DESC LIMIT ?"
  )
    .bind(userId, limit)
    .all<ConversationTurn>();

  const rows = res.results ?? [];
  return rows.reverse();
}

export async function insertToolAudit(env: Env, params: {
  userId: string;
  tool: string;
  requestId: string;
  status: "ok" | "error";
  argsJson?: unknown;
  durationMs?: number;
  redactionApplied?: boolean;
  redactedOutputRef?: string | null;
  redactedOutputJson?: unknown;
}): Promise<void> {
  if (!env.AGENT_DB) return;
  const auditId = id("tad");
  const argsJson = params.argsJson ? JSON.stringify(params.argsJson) : null;
  const trimmedArgs = argsJson && argsJson.length > 2000
    ? `${argsJson.slice(0, 2000)}...`
    : argsJson;
  const redactedJson = params.redactedOutputJson
    ? JSON.stringify(params.redactedOutputJson)
    : null;
  const trimmedJson = redactedJson && redactedJson.length > 4000
    ? `${redactedJson.slice(0, 4000)}...`
    : redactedJson;
  const ts = nowIso();
  try {
    await env.AGENT_DB.prepare(
      "INSERT INTO tool_audit (id, user_id, tool, request_id, status, args_json, duration_ms, redaction_applied, redacted_output_ref, redacted_output_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(
        auditId,
        params.userId,
        params.tool,
        params.requestId,
        params.status,
        trimmedArgs,
        params.durationMs ?? null,
        params.redactionApplied ?? null,
        params.redactedOutputRef ?? null,
        trimmedJson,
        ts
      )
      .run();
  } catch {
    await env.AGENT_DB.prepare(
      "INSERT INTO tool_audit (id, user_id, tool, request_id, status, redacted_output_ref, redacted_output_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(
        auditId,
        params.userId,
        params.tool,
        params.requestId,
        params.status,
        params.redactedOutputRef ?? null,
        trimmedJson,
        ts
      )
      .run();
  }
}
