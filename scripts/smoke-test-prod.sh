#!/usr/bin/env bash
#
# smoke-test-prod.sh
# Production smoke test for defrag.app
#
# Usage:
#   ./scripts/smoke-test-prod.sh [API_URL] [DEV_ADMIN_TOKEN]
#
# Example:
#   ./scripts/smoke-test-prod.sh https://api.defrag.app my-32-char-token-here
#   ./scripts/smoke-test-prod.sh  # Uses defaults from env vars

set -euo pipefail

# Configuration
API_URL="${1:-${SYNTH_API_URL:-https://api.defrag.app}}"
TOKEN="${2:-${SYNTH_DEV_ADMIN_TOKEN:-}}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
SKIPPED=0

# Helpers
pass() { echo -e "${GREEN}✓ PASS${NC}: $1"; ((PASSED++)); }
fail() { echo -e "${RED}✗ FAIL${NC}: $1"; ((FAILED++)); }
warn() { echo -e "${YELLOW}! WARN${NC}: $1"; }
skip() { echo -e "${CYAN}○ SKIP${NC}: $1"; ((SKIPPED++)); }
info() { echo -e "  INFO: $1"; }

echo "============================================"
echo "Production Smoke Test"
echo "============================================"
echo "API URL: $API_URL"
echo ""

# Test 1: Health check
echo "--- Test 1: Health Check ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
if [ "$HTTP_CODE" = "200" ]; then
    pass "Health endpoint returns 200"
else
    fail "Health endpoint returned $HTTP_CODE"
fi

# Test 2: Register/Login JSON format
echo ""
echo "--- Test 2: Auth Endpoints (JSON format) ---"
# Test that JSON body is accepted (don't actually create a user)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrongpassword"}')
if [ "$HTTP_CODE" = "401" ]; then
    pass "Login endpoint accepts JSON body and returns 401 for wrong creds"
elif [ "$HTTP_CODE" = "422" ]; then
    fail "Login endpoint returned 422 - may not accept JSON body"
else
    info "Login returned $HTTP_CODE (expected 401)"
    pass "Login endpoint accessible"
fi

# Test 3: Billing status (unauthenticated)
echo ""
echo "--- Test 3: Billing Status (Unauthenticated) ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/billing/status")
if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "422" ]; then
    pass "Billing status requires authentication"
else
    warn "Billing status returned $HTTP_CODE (expected 401/422)"
fi

# Dev Admin tests (only if token provided)
if [ -z "$TOKEN" ]; then
    echo ""
    echo "--- Dev Admin Tests (SKIPPED - no token provided) ---"
    skip "Admin config (no token)"
    skip "Dashboard access (no token)"
    skip "AI chat (no token)"
else
    echo ""
    echo "--- Test 4: Dev Admin Config ---"
    RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/admin/config" -H "Authorization: Bearer $TOKEN")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" = "200" ]; then
        AI_PROVIDER=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('ai_provider','unknown'))" 2>/dev/null || echo "parse_error")
        AI_CONFIGURED=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('ai_configured',False))" 2>/dev/null || echo "parse_error")
        STRIPE=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('stripe_configured',False))" 2>/dev/null || echo "parse_error")
        pass "Admin config accessible"
        info "AI Provider: $AI_PROVIDER (configured: $AI_CONFIGURED)"
        info "Stripe: $STRIPE"
    elif [ "$HTTP_CODE" = "401" ]; then
        fail "Admin config returned 401 - token invalid or expired"
    else
        fail "Admin config returned $HTTP_CODE"
    fi
    
    echo ""
    echo "--- Test 5: Dashboard (Dev Admin) ---"
    RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/dashboard" -H "Authorization: Bearer $TOKEN")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" = "200" ]; then
        PLAN=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['billing']['plan_key'])" 2>/dev/null || echo "parse_error")
        if [ "$PLAN" = "constellation" ]; then
            pass "Dashboard returns constellation plan for dev admin"
        else
            warn "Dashboard returned plan '$PLAN' instead of 'constellation'"
        fi
    else
        fail "Dashboard returned $HTTP_CODE"
    fi
    
    echo ""
    echo "--- Test 6: AI Chat Endpoint ---"
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/ai/chat" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "message=Hello")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" = "200" ]; then
        pass "AI chat returned 200 (provider configured!)"
    elif [ "$HTTP_CODE" = "503" ]; then
        info "AI chat returned 503 (provider not configured)"
        pass "AI chat endpoint accessible"
    else
        warn "AI chat returned $HTTP_CODE"
    fi
    
    echo ""
    echo "--- Test 7: AI Image Endpoint ---"
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/ai/image" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"prompt":"test"}')
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" = "200" ]; then
        STATUS=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null || echo "unknown")
        if [ "$STATUS" = "not_enabled" ]; then
            info "Image generation not enabled (expected)"
            pass "AI image endpoint accessible"
        elif [ "$STATUS" = "success" ]; then
            pass "AI image generation working!"
        else
            pass "AI image endpoint returned status: $STATUS"
        fi
    else
        fail "AI image returned $HTTP_CODE"
    fi

    echo ""
    echo "--- Test 8: AI Status Endpoint ---"
    RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/ai/status" \
        -H "Authorization: Bearer $TOKEN")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" = "200" ]; then
        PROVIDER=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('provider','unknown'))" 2>/dev/null || echo "unknown")
        EMBED=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('supports_embed',False))" 2>/dev/null || echo "unknown")
        pass "AI status accessible"
        info "Provider: $PROVIDER, Supports Embed: $EMBED"
    else
        fail "AI status returned $HTTP_CODE"
    fi

    echo ""
    echo "--- Test 9: AI Embed Endpoint ---"
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/ai/embed" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"texts":["hello world"]}')
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" = "200" ]; then
        pass "AI embed endpoint working"
    elif [ "$HTTP_CODE" = "503" ]; then
        info "AI embed returned 503 (provider not configured)"
        pass "AI embed endpoint accessible"
    else
        warn "AI embed returned $HTTP_CODE"
    fi
fi

# Summary
echo ""
echo "============================================"
echo "Summary"
echo "============================================"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "${CYAN}Skipped: $SKIPPED${NC}"

if [ $FAILED -gt 0 ]; then
    echo ""
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
else
    echo ""
    echo -e "${GREEN}All tests passed!${NC}"
fi
