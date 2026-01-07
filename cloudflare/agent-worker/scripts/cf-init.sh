#!/usr/bin/env bash
set -euo pipefail

DB_NAME=${D1_DB:-defrag-agent-db}
BUCKET_NAME=${R2_BUCKET:-defrag-agent-artifacts}
INDEX_NAME=${VECTORIZE_INDEX:-defrag-memory-index}

wrangler d1 create "$DB_NAME" || true
wrangler r2 bucket create "$BUCKET_NAME" || true
wrangler vectorize create "$INDEX_NAME" --dimensions=1024 --metric=cosine || true

echo "If this was a new D1 database, copy the database_id into wrangler.toml."
