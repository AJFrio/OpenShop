#!/usr/bin/env bash
# End-to-end local smoke test: zero Cloudflare connectivity, zero real credentials.
#
# Generates local config → builds frontend → seeds local KV/R2 → starts
# `wrangler dev --local` headless → asserts public + admin API behavior → kills worker.
# Exit 0 = all assertions passed.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

PORT="${SMOKE_PORT:-8787}"
BASE="http://localhost:${PORT}"
LOG="${TMPDIR:-/tmp}/openshop-smoke-worker.log"
READY_TIMEOUT_SECONDS=120
WORKER_PID=""

log() { printf '\n▶ %s\n' "$1"; }
pass() { printf '✅ %s\n' "$1"; }
fail() { printf '❌ %s\n' "$1"; exit 1; }

cleanup() {
  if [[ -n "$WORKER_PID" ]] && kill -0 "$WORKER_PID" 2>/dev/null; then
    kill "$WORKER_PID" 2>/dev/null || true
    wait "$WORKER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# 1. Local config (idempotent; hand-edited wrangler.toml is preserved with a warning)
log 'Generating local config'
node scripts/dev/build-local-config.mjs

# 2. Frontend build (worker serves dist via the ASSETS binding)
log 'Building frontend'
npm run --silent build

# 3. Seed local KV (+ best-effort local R2 media)
log 'Seeding local KV'
node scripts/dev/seed-local.mjs

# 4. Start worker headless
log "Starting wrangler dev --local on port ${PORT} (log: ${LOG})"
rm -f "$LOG"
npx wrangler dev --local --port "$PORT" >"$LOG" 2>&1 &
WORKER_PID=$!

log 'Waiting for readiness'
ready=0
for _ in $(seq 1 "$READY_TIMEOUT_SECONDS"); do
  if curl -sf -o /dev/null "$BASE/api/health"; then
    ready=1
    break
  fi
  if ! kill -0 "$WORKER_PID" 2>/dev/null; then
    echo "----- worker log -----"; cat "$LOG" || true
    fail 'worker process exited before becoming ready'
  fi
  sleep 1
done
[[ "$ready" == "1" ]] || { echo "----- worker log -----"; cat "$LOG" || true; fail 'worker did not become ready in time'; }
pass "worker ready at ${BASE}"

json_field() { # json_field <body> <js-expression on obj>
  node -e 'const obj=JSON.parse(process.argv[1]); const get=process.argv[2]; const v=get.split(".").reduce((o,k)=>o?.[k], obj); process.stdout.write(String(v))' "$1" "$2"
}

# 5. Assertions

body="$(curl -sS "$BASE/")"
status="$(curl -sS -o /dev/null -w '%{http_code}' "$BASE/")"
[[ "$status" == "200" ]] || fail "GET / expected 200, got ${status}"
grep -q '<div id="root">' <<<"$body" || fail 'GET / HTML missing <div id="root">'
grep -q '<title>OpenShop</title>' <<<"$body" || fail 'GET / HTML missing OpenShop title'
pass 'GET / returns 200 HTML with expected markup'

body="$(curl -sS "$BASE/api/products")"
status="$(curl -sS -o /dev/null -w '%{http_code}' "$BASE/api/products")"
[[ "$status" == "200" ]] || fail "GET /api/products expected 200, got ${status}"
count="$(node -e 'process.stdout.write(String(JSON.parse(process.argv[1]).length))' "$body")"
[[ "$count" -ge 6 ]] || fail "GET /api/products expected >=6 products, got ${count}"
pass "GET /api/products returns JSON array with ${count} products"

body="$(curl -sS "$BASE/api/collections")"
status="$(curl -sS -o /dev/null -w '%{http_code}' "$BASE/api/collections")"
[[ "$status" == "200" ]] || fail "GET /api/collections expected 200, got ${status}"
count="$(node -e 'process.stdout.write(String(JSON.parse(process.argv[1]).length))' "$body")"
[[ "$count" -ge 2 ]] || fail "GET /api/collections expected >=2 collections, got ${count}"
pass "GET /api/collections returns JSON array with ${count} collections"

status="$(curl -sS -o /dev/null -w '%{http_code}' "$BASE/api/store-settings")"
[[ "$status" == "200" ]] || fail "GET /api/store-settings expected 200, got ${status}"
body="$(curl -sS "$BASE/api/store-settings")"
name="$(json_field "$body" storeName)"
[[ -n "$name" ]] || fail 'GET /api/store-settings returned empty storeName'
pass "GET /api/store-settings returns settings (storeName=${name})"

body="$(curl -sS -X POST "$BASE/api/admin/login" -H 'Content-Type: application/json' -d '{"password":"local-dev-password"}')"
status="$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$BASE/api/admin/login" -H 'Content-Type: application/json' -d '{"password":"local-dev-password"}')"
[[ "$status" == "200" ]] || fail "POST /api/admin/login expected 200, got ${status}"
token="$(json_field "$body" token)"
[[ -n "$token" && "$token" != "undefined" ]] || fail 'POST /api/admin/login did not return a token'
pass 'POST /api/admin/login returns token JSON'

# Exercise admin product CREATE (touches Stripe sync — must degrade gracefully with
# the reserved sk_test_local_no_network sentinel) and DELETE to restore state.
create_body="{\"id\":\"smoke-product-$(date +%s)\",\"name\":\"Smoke Test Product\",\"description\":\"Created by scripts/dev/smoke.sh\",\"price\":9.99,\"currency\":\"usd\",\"images\":[],\"collectionId\":null,\"variants\":[],\"variants2\":[]}"
status="$(curl -sS -o /tmp/openshop-smoke-create.json -w '%{http_code}' -X POST "$BASE/api/admin/products" \
  -H 'Content-Type: application/json' -H "X-Admin-Token: $token" -d "$create_body")"
[[ "$status" == "201" ]] || { echo "create response: $(cat /tmp/openshop-smoke-create.json)"; fail "POST /api/admin/products expected 201, got ${status}"; }
created_id="$(json_field "$(cat /tmp/openshop-smoke-create.json)" id)"
[[ -n "$created_id" && "$created_id" != "undefined" ]] || fail 'product create returned no id'
pass "POST /api/admin/products creates product (id=${created_id})"

status="$(curl -sS -o /dev/null -w '%{http_code}' -X DELETE "$BASE/api/admin/products/${created_id}" -H "X-Admin-Token: $token")"
[[ "$status" == "200" ]] || fail "DELETE /api/admin/products/${created_id} expected 200, got ${status}"
pass "DELETE /api/admin/products cleans up (${created_id})"

log 'All smoke assertions passed'
