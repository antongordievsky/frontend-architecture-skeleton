#!/bin/sh
# D-21 and D-12: the production form's security headers and cache rules, asserted against a running
# web-prod. Plan 01's review found the cache bug this test now guards (a missing asset cached as HTML).
set -eu

base=${1:-http://localhost:${PROD_PORT:-8080}}
failures=0

header() { curl -sS -o /dev/null -D - "$base$1" | tr -d '\r' | grep -i "^$2:" | cut -d' ' -f2-; }
status() { curl -sS -o /dev/null -w '%{http_code}' "$base$1"; }
# Some answers are only told apart by what they carry: a 200 from the SPA fallback looks like a 200 from
# the backend until you read the body (QR-23, plan 08).
body() { curl -sS "$base$1"; }
expect() {
  if [ "$2" = "$3" ]; then
    echo "ok    $1"
  else
    echo "FAIL  $1: got '$2', want '$3'"
    failures=$((failures + 1))
  fi
}

csp="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
asset=$(curl -sS "$base/" | grep -oE '/assets/[^"]+\.js' | head -n 1)

expect 'CSP on the entry' "$(header / content-security-policy)" "$csp"
expect 'CSP on a client route' "$(header /transactions content-security-policy)" "$csp"
expect 'nosniff' "$(header / x-content-type-options)" 'nosniff'
expect 'referrer policy' "$(header / referrer-policy)" 'strict-origin-when-cross-origin'
expect 'no Server header' "$(header / server)" ''
expect 'the entry is revalidated' "$(header / cache-control)" 'no-cache'
expect 'a client route falls back to the app' "$(status /transactions)" '200'
expect 'a hashed asset is cached for a year' "$(header "$asset" cache-control)" 'public, max-age=31536000, immutable'
expect 'a missing asset is a 404' "$(status /assets/does-not-exist.js)" '404'
expect 'a missing asset is not cached' "$(header /assets/does-not-exist.js cache-control)" ''
# D-04: the stand-in backend answers on this origin, so the app needs no base URL and no CORS. A page of
# transactions is never cached: a reload must show what the server holds now, not what it held before.
#
# The status alone proves nothing here, and a deliberate break showed it (QR-23, plan 08): with the
# reverse_proxy removed, /api/transactions still answered 200 — the SPA fallback handed back index.html,
# which is a 200 with no-cache too. So both assertions read the kind of answer, not its code.
expect 'the stand-in answers through the production form' \
  "$(header '/api/transactions?limit=1' content-type)" 'application/json;charset=utf-8'
expect 'and answers with a page, not the app shell' \
  "$(body '/api/transactions?limit=1' | head -c 9)" '{"items":'
expect 'a page of transactions is not cached' "$(header '/api/transactions?limit=1' cache-control)" 'no-cache'

if [ "$failures" -ne 0 ]; then
  echo "$failures header check(s) failed"
  exit 1
fi
