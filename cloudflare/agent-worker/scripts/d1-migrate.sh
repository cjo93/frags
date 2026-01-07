#!/usr/bin/env bash
set -euo pipefail

DB_NAME=${D1_DB:-defrag-agent-db}
MODE=${D1_MODE:---remote}

wrangler d1 execute "$DB_NAME" --file=./src/memory/schema.sql "$MODE"

# Additive migrations for existing databases (safe to re-run)
wrangler d1 execute "$DB_NAME" --command "ALTER TABLE memory_events ADD COLUMN source TEXT;" "$MODE" || true
wrangler d1 execute "$DB_NAME" --command "ALTER TABLE memory_events ADD COLUMN confidence REAL;" "$MODE" || true

wrangler d1 execute "$DB_NAME" --command "ALTER TABLE conversation_turns ADD COLUMN request_id TEXT;" "$MODE" || true
wrangler d1 execute "$DB_NAME" --command "ALTER TABLE conversation_turns ADD COLUMN token_budget INTEGER;" "$MODE" || true
wrangler d1 execute "$DB_NAME" --command "ALTER TABLE conversation_turns ADD COLUMN model TEXT;" "$MODE" || true

wrangler d1 execute "$DB_NAME" --command "ALTER TABLE tool_audit ADD COLUMN args_json TEXT;" "$MODE" || true
wrangler d1 execute "$DB_NAME" --command "ALTER TABLE tool_audit ADD COLUMN duration_ms INTEGER;" "$MODE" || true
wrangler d1 execute "$DB_NAME" --command "ALTER TABLE tool_audit ADD COLUMN redaction_applied INTEGER;" "$MODE" || true
