#!/usr/bin/env bash
#
# smoke-test-dev-admin.sh
# Quick smoke test for dev admin functionality
#
# Usage:
#   ./scripts/smoke-test-dev-admin.sh [API_URL] [DEV_ADMIN_JWT]
#
# Example:
#   ./scripts/smoke-test-dev-admin.sh https://api.defrag.app <jwt>
#   ./scripts/smoke-test-dev-admin.sh  # Uses defaults from env vars

set -euo pipefail

# Configuration
API_URL="${1:-${SYNTH_API_URL:-https://api.defrag.app}}"
TOKEN="${2:-${SYNTH_DEV_ADMIN_JWT:-${SYNTH_DEV_ADMIN_TOKEN:-}}}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Helpers
pass() { echo -e "${GREEN}✓ PASS${NC}: $1"; }
fail() { echo -e "${RED}✗ FAIL${NC}: $1"; exit 1; }
warn() { echo -e "${YELLOW}! WARN${NC}: $1"; }
info() { echo -e "  INFO: $1"; }

# Validate inputs
if [ -z "$TOKEN" ]; then
    fail "No token provided. Pass a JWT or set SYNTH_DEV_ADMIN_JWT env var"
fi

if [ ${#TOKEN} -lt 32 ]; then
    fail "Token looks too short (got ${#TOKEN})"
fi

if [ "$TOKEN" = "DEV_ADMIN" ]; then
    fail "The 'DEV_ADMIN' token is no longer supported. Use a proper secret."
fi

echo "============================================"
echo "Dev Admin Smoke Test"
echo "============================================"
echo "API URL: $API_URL"
echo "Token:   ${TOKEN:0:8}...${TOKEN: -4}"
echo ""

# Test 1: Health check (no auth)
echo "--- Test 1: Health Check ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
if [ "$HTTP_CODE" = "200" ]; then
    pass "Health endpoint returns 200"
else
    fail "Health endpoint returned $HTTP_CODE"
fi

# Test 2: Dashboard with dev admin token
echo ""
echo "--- Test 2: Dashboard (Dev Admin Auth) ---"
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/dashboard" -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    PLAN=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['billing']['plan_key'])" 2>/dev/null || echo "parse_error")
    if [ "$PLAN" = "constellation" ]; then
        pass "Dashboard returns constellation plan"
    else
        warn "Dashboard returned plan '$PLAN' instead of 'constellation'"
    fi
else
    fail "Dashboard returned $HTTP_CODE: $BODY"
fi

# Test 3: Billing status
echo ""
echo "--- Test 3: Billing Status ---"
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/billing/status" -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    ENTITLED=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['entitled'])" 2>/dev/null || echo "false")
    if [ "$ENTITLED" = "True" ]; then
        pass "Billing status shows entitled=True"
    else
        warn "Billing status shows entitled=$ENTITLED"
    fi
else
    fail "Billing status returned $HTTP_CODE"
fi

# Test 4: Admin users list
echo ""
echo "--- Test 4: Admin Users List ---"
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/admin/users?limit=5" -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    USER_COUNT=$(echo "$BODY" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['users']))" 2>/dev/null || echo "0")
    pass "Admin users endpoint accessible (found $USER_COUNT users)"
elif [ "$HTTP_CODE" = "403" ]; then
    fail "Admin endpoint returned 403 Forbidden - dev admin not working"
else
    fail "Admin users returned $HTTP_CODE: $BODY"
fi

# Test 5: Admin config status
echo ""
echo "--- Test 5: Admin Config Status ---"
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/admin/config" -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    DEV_ENABLED=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['dev_admin_enabled'])" 2>/dev/null || echo "false")
    if [ "$DEV_ENABLED" = "True" ]; then
        pass "Admin config shows dev_admin_enabled=True"
    else
        warn "Admin config shows dev_admin_enabled=$DEV_ENABLED"
    fi
else
    fail "Admin config returned $HTTP_CODE"
fi

# Test 6: AI config status
echo ""
echo "--- Test 6: AI Config Status ---"
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/admin/ai/config" -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    AI_PROVIDER=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['ai_provider'])" 2>/dev/null || echo "unknown")
    AI_CONFIGURED=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['ai_configured'])" 2>/dev/null || echo "unknown")
    IMAGE_ENABLED=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['image_enabled'])" 2>/dev/null || echo "unknown")
    if [ "$AI_CONFIGURED" = "True" ]; then
        pass "AI configured (provider: $AI_PROVIDER, image_enabled: $IMAGE_ENABLED)"
    else
        info "AI not configured (provider: $AI_PROVIDER)"
        pass "AI config endpoint accessible"
    fi
else
    fail "AI config returned $HTTP_CODE"
fi

# Test 7: AI Chat endpoint (if configured)
echo ""
echo "--- Test 7: AI Chat (Dev Admin) ---"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/ai/chat" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "message=Hello")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    pass "AI chat endpoint returned 200"
elif [ "$HTTP_CODE" = "503" ]; then
    info "AI chat returned 503 (not configured) - expected if no AI key set"
    pass "AI chat endpoint accessible"
else
    warn "AI chat returned $HTTP_CODE"
fi

# Test 8: AI Image endpoint (should return not_enabled)
echo ""
echo "--- Test 8: AI Image Generation ---"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/ai/image" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"prompt":"test"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    STATUS=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null || echo "unknown")
    if [ "$STATUS" = "not_enabled" ]; then
        pass "AI image endpoint returns 'not_enabled' (expected until configured)"
    elif [ "$STATUS" = "success" ]; then
        pass "AI image generation working!"
    else
        info "AI image status: $STATUS"
        pass "AI image endpoint accessible"
    fi
else
    warn "AI image returned $HTTP_CODE"
fi

# Test 9: Invalid token rejection
echo ""
echo "--- Test 7: Invalid Token Rejection ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/dashboard" -H "Authorization: Bearer invalid_token")
if [ "$HTTP_CODE" = "401" ]; then
    pass "Invalid token correctly rejected with 401"
else
    warn "Invalid token returned $HTTP_CODE (expected 401)"
fi

# Test 10: Old DEV_ADMIN token rejection
echo ""
echo "--- Test 10: Legacy 'DEV_ADMIN' Token Rejection ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/dashboard" -H "Authorization: Bearer DEV_ADMIN")
if [ "$HTTP_CODE" = "401" ]; then
    pass "Legacy 'DEV_ADMIN' token correctly rejected"
else
    fail "Legacy 'DEV_ADMIN' token was accepted (security issue!)"
fi

echo ""
echo "============================================"
echo -e "${GREEN}All smoke tests passed!${NC}"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Visit /dev in the frontend to enter dev mode"
echo "  2. Navigate to /dashboard to verify full access"
echo "  3. Visit /admin to see the admin panel"
