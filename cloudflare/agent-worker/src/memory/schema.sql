CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL, -- fact|preference|constraint|style|episode|note
  content_json TEXT NOT NULL,
  embedding_json TEXT,
  source TEXT,
  sensitivity TEXT DEFAULT 'normal', -- normal|sensitive
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memories_user_created ON memories(user_id, created_at);

CREATE TABLE IF NOT EXISTS memory_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- recall|write|tool|redaction|error
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memory_events_user_created ON memory_events(user_id, created_at);

CREATE TABLE IF NOT EXISTS conversation_turns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  role TEXT NOT NULL, -- user|assistant
  content TEXT NOT NULL,
  tokens_est INTEGER,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversation_turns_user_created ON conversation_turns(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversation_turns_thread ON conversation_turns(thread_id, created_at);

CREATE TABLE IF NOT EXISTS tool_audit (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tool TEXT NOT NULL,
  request_id TEXT NOT NULL,
  status TEXT NOT NULL, -- ok|error
  redacted_output_ref TEXT,
  redacted_output_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tool_audit_user_created ON tool_audit(user_id, created_at);
