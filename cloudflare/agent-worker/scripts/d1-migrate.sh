#!/usr/bin/env bash
set -euo pipefail

DB_NAME=${D1_DB:-defrag-agent-db}
MODE=${D1_MODE:---remote}

wrangler d1 execute "$DB_NAME" --file=./src/memory/schema.sql "$MODE"

has_column() {
  local table=$1
  local column=$2
  local out
  out=$(wrangler d1 execute "$DB_NAME" --command "SELECT name FROM pragma_table_info('$table') WHERE name = '$column';" --json "$MODE" 2>/dev/null || true)
  python3 - "$out" <<'PY'
import json, sys
try:
    payload = json.loads(sys.argv[1])
    results = payload[0].get("results") if payload else []
    sys.exit(0 if results else 1)
except Exception:
    sys.exit(1)
PY
}

add_column() {
  local table=$1
  local column=$2
  local type=$3
  if has_column "$table" "$column"; then
    return 0
  fi
  wrangler d1 execute "$DB_NAME" --command "ALTER TABLE $table ADD COLUMN $column $type;" "$MODE"
}

# Additive migrations for existing databases (safe to re-run)
add_column "memory_events" "source" "TEXT"
add_column "memory_events" "confidence" "REAL"

add_column "conversation_turns" "request_id" "TEXT"
add_column "conversation_turns" "token_budget" "INTEGER"
add_column "conversation_turns" "model" "TEXT"

add_column "tool_audit" "args_json" "TEXT"
add_column "tool_audit" "duration_ms" "INTEGER"
add_column "tool_audit" "redaction_applied" "INTEGER"
