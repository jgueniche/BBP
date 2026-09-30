#!/usr/bin/env bash
# Local test bench: @supabase/lite (REST, auth and storage APIs) on the local
# Postgres database, behind a small CORS proxy for the browser.
#
#   scripts/local/lite.sh bootstrap copine_app   # let lite create auth/storage, then stop
#   scripts/local/lite.sh start copine_app       # API on :54321, proxy on :54320
#   scripts/local/lite.sh stop
#
# Writes .local-bench/env.local (Supabase URL and keys for `next start`).
set -euo pipefail

CMD="${1:?usage: lite.sh bootstrap|start|stop [database]}"
DB="${2:-copine_app}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BENCH="$ROOT/.local-bench"
PROJECT="$BENCH/lite"
LITE_VERSION="0.11.0"
API_PORT=54321
PROXY_PORT=54320

mkdir -p "$PROJECT/supabase/.temp"
if [[ ! -x "$BENCH/node_modules/.bin/lite" || ! -d "$BENCH/node_modules/postgres" ]]; then
  npm install --prefix "$BENCH" --no-audit --no-fund "@supabase/lite@$LITE_VERSION" "postgres@3" >/dev/null
fi

write_config() {
  cat > "$PROJECT/supabase/config.toml" <<TOML
[api]
port = $API_PORT

[db]
driver = "postgres"
url = "postgres://postgres:postgres@127.0.0.1:5432/$DB"

[auth]
enabled = true
jwt_secret = "local-bench-only-secret-0123456789abcdef"
jwt_expiry = 3600
enable_signup = true
publishable_key = "env(SUPABASE_PUBLISHABLE_KEY)"
secret_key = "env(SUPABASE_SECRET_KEY)"

[auth.email]
enable_confirmations = false

[storage]
enabled = true
TOML
  if [[ ! -f "$PROJECT/.env" ]]; then
    (cd "$PROJECT" && LITE_TELEMETRY=0 "$BENCH/node_modules/.bin/lite" --no-telemetry generate-keys >/dev/null)
  fi
}

run_lite() {
  (cd "$PROJECT" && set -a && . ./.env && set +a &&
    EXPERIMENTAL_STORAGE=1 LITE_TELEMETRY=0 exec "$BENCH/node_modules/.bin/lite" --no-telemetry start --no-admin)
}

wait_for() {
  for _ in $(seq 1 60); do
    curl -s -o /dev/null "http://127.0.0.1:$1/auth/v1/health" && return 0
    sleep 0.5
  done
  echo "lite did not answer on :$1" >&2
  return 1
}

# Whatever listens on a port (lite forks: its pid file is not enough).
stop_port() {
  local pids
  pids="$(lsof -tiTCP:"$1" -sTCP:LISTEN 2>/dev/null || true)"
  [[ -n "$pids" ]] && kill $pids 2>/dev/null || true
  for _ in $(seq 1 20); do
    lsof -tiTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1 || return 0
    sleep 0.25
  done
}

stop_all() {
  for pidfile in "$BENCH"/lite.pid "$BENCH"/proxy.pid; do
    [[ -f "$pidfile" ]] && kill "$(cat "$pidfile")" 2>/dev/null || true
    rm -f "$pidfile"
  done
  stop_port "$API_PORT"
  stop_port "$PROXY_PORT"
}

case "$CMD" in
  bootstrap)
    write_config
    stop_all
    run_lite > "$BENCH/lite-bootstrap.log" 2>&1 &
    wait_for "$API_PORT"
    stop_port "$API_PORT"
    ;;
  start)
    stop_all
    write_config
    run_lite > "$BENCH/lite.log" 2>&1 &
    echo $! > "$BENCH/lite.pid"
    wait_for "$API_PORT"
    node "$ROOT/scripts/local/cors-proxy.mjs" "$PROXY_PORT" "$API_PORT" > "$BENCH/proxy.log" 2>&1 &
    echo $! > "$BENCH/proxy.pid"
    # shellcheck disable=SC1091
    . "$PROJECT/.env"
    cat > "$BENCH/env.local" <<ENV
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:$PROXY_PORT
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SECRET_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV
    echo "lite on :$API_PORT, proxy on :$PROXY_PORT, env in $BENCH/env.local"
    ;;
  stop)
    stop_all
    ;;
  *)
    echo "unknown command: $CMD" >&2
    exit 1
    ;;
esac
