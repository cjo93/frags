#!/usr/bin/env bash
set -euo pipefail

AGENT_BASE=${AGENT_BASE:-http://localhost:8787}
TOKEN=${AGENT_TOKEN:?Set AGENT_TOKEN to a valid agent JWT}

req_id() {
  printf 'smoke_%s' "$(date +%s)"
}

curl -sS "$AGENT_BASE/health" | jq .

curl -sS "$AGENT_BASE/agent/status" | jq .

curl -sS "$AGENT_BASE/agent/chat" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Request-Id: $(req_id)" \
  --data '{"message":"hello","memoryEnabled":true}' | jq .

curl -sS "$AGENT_BASE/agent/tool" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Request-Id: $(req_id)" \
  --data '{"tool":"natal_export","args":{}}' | tee /tmp/agent-tool.json | jq .

ARTIFACT_URL=$(jq -r '.artifact.url // empty' /tmp/agent-tool.json)
if [ -n "$ARTIFACT_URL" ]; then
  curl -sS "$ARTIFACT_URL" >/tmp/agent-artifact.svg
  echo "Artifact saved to /tmp/agent-artifact.svg"
fi

curl -sS "$AGENT_BASE/agent/export" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Request-Id: $(req_id)" \
  --data '{"title":"Safe Export","safe_json":{"profile":{"name":"Test"},"note":"hello"}}' | jq .
