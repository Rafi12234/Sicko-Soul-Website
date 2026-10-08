#!/usr/bin/env bash
# Sicko Soul safer cPanel deployment: stage -> preflight -> activate -> verify.
# Keeps last working releases and rolls the APPLICATION back on activation failure.
# The live gateway still restarts once at cutover; strict zero-downtime requires
# a permanently running reverse proxy and separate blue/green upstreams.
set -Eeuo pipefail
umask 077

REPO="${SICKO_REPO_DIR:-/home/sickosou/repositories/Sicko-Soul-Website}"
FRONTEND="${SICKO_FRONTEND_DIR:-/home/sickosou/sicko-frontend-prod}"
BACKEND="${SICKO_BACKEND_DIR:-/home/sickosou/sicko-backend-prod}"
DEPLOY_MARKER="${SICKO_DEPLOY_MARKER:-/home/sickosou/.sicko-deployed-source}"
STATUS_FILE="${SICKO_DEPLOY_STATUS_FILE:-/home/sickosou/.sicko-deploy-status.json}"
PUBLIC_ORIGIN="${SICKO_PUBLIC_ORIGIN:-https://sickosoul.shop}"

SOURCE_SHA="$(tr -d '\r\n' < "$REPO/source-commit.txt")"
[[ "$SOURCE_SHA" =~ ^[0-9a-f]{40}$ ]] || { echo 'ERROR: Invalid release source SHA.' >&2; exit 1; }
[[ -f "$BACKEND/.env" ]] || { echo 'ERROR: Backend .env missing.' >&2; exit 1; }
for file in frontend-release.tar.gz backend-release.tar.gz gateway-server.cjs; do
  [[ -s "$REPO/$file" ]] || { echo "ERROR: Missing $file" >&2; exit 1; }
done

FRONT_RELEASE="$FRONTEND/releases/$SOURCE_SHA"
BACK_RELEASE="$BACKEND/releases/$SOURCE_SHA"
FRONT_ACTIVE="$FRONTEND/release"
BACK_ACTIVE="$BACKEND/current"
GATEWAY="$FRONTEND/server.js"
GATEWAY_BACKUP="$FRONTEND/.sicko-gateway-previous.cjs"
OLD_FRONT=""
OLD_BACK=""
OLD_SHA=""
LEGACY_FRONT=""
ACTIVATED=0
PREPARED=0
BACK_PID=""
FRONT_PID=""

status() {
  local state="$1"
  local tmp="${STATUS_FILE}.tmp.$$"
  mkdir -p "$(dirname "$STATUS_FILE")"
  printf '{"source":"%s","state":"%s"}\n' "$SOURCE_SHA" "$state" > "$tmp"
  mv -f "$tmp" "$STATUS_FILE"
}

stop_probe() {
  if [[ -n "$FRONT_PID" ]]; then kill "$FRONT_PID" 2>/dev/null || true; wait "$FRONT_PID" 2>/dev/null || true; FRONT_PID=""; fi
  if [[ -n "$BACK_PID" ]]; then kill "$BACK_PID" 2>/dev/null || true; wait "$BACK_PID" 2>/dev/null || true; BACK_PID=""; fi
}

swap_link() {
  local target="$1" destination="$2" temp="${2}.sicko-next.$$"
  rm -f "$temp"
  ln -s "$target" "$temp"
  mv -fT "$temp" "$destination"
}

restore_link() {
  local prior="$1" active="$2"
  if [[ -n "$prior" ]]; then
    swap_link "$prior" "$active"
  else
    rm -f "$active"
  fi
}

rollback() {
  echo 'ERROR: Activation was unhealthy. Reverting the application release...' >&2
  restore_link "$OLD_BACK" "$BACK_ACTIVE"
  restore_link "$OLD_FRONT" "$FRONT_ACTIVE"
  if [[ -n "$LEGACY_FRONT" ]]; then
    # The pre-existing frontend was a directory, not a symlink.
    rm -f "$FRONT_ACTIVE"
    mv "$LEGACY_FRONT" "$FRONT_ACTIVE"
  fi
  if [[ -f "$GATEWAY_BACKUP" ]]; then cp -p "$GATEWAY_BACKUP" "$GATEWAY"; fi
  mkdir -p "$FRONTEND/tmp" "$BACKEND/tmp"
  touch "$FRONTEND/tmp/restart.txt" "$BACKEND/tmp/restart.txt"
  echo 'Restored the previous application pointers and requested a Passenger restart.' >&2
}

finish() {
  local rc="$?"
  trap - EXIT
  stop_probe
  if (( rc != 0 )); then
    if (( ACTIVATED == 1 )); then rollback || echo 'CRITICAL: Automatic rollback failed; restore previous release manually.' >&2; fi
    status failed || true
  fi
  exit "$rc"
}
trap finish EXIT
trap 'echo "ERROR: Deployment command failed at line $LINENO" >&2' ERR

OLD_SHA="$(cat "$DEPLOY_MARKER" 2>/dev/null || true)"
if [[ "$SOURCE_SHA" == "$OLD_SHA" ]]; then
  echo "Source $SOURCE_SHA is already marked deployed."
  exit 0
fi

status preparing
echo "=== Staging $SOURCE_SHA while retaining current production ==="
mkdir -p "$FRONTEND/releases" "$BACKEND/releases"
# Do not overwrite the live release. Recreate only the pending release directory.
if [[ -L "$FRONT_ACTIVE" && "$(readlink -f "$FRONT_ACTIVE")" == "$FRONT_RELEASE" ]] ||
   [[ -L "$BACK_ACTIVE" && "$(readlink -f "$BACK_ACTIVE")" == "$BACK_RELEASE" ]]; then
  echo 'ERROR: Target release is already active; refusing to overwrite it.' >&2
  exit 1
fi
rm -rf "$FRONT_RELEASE" "$BACK_RELEASE"
mkdir -p "$FRONT_RELEASE" "$BACK_RELEASE"
tar -xzf "$REPO/frontend-release.tar.gz" -C "$FRONT_RELEASE"
tar -xzf "$REPO/backend-release.tar.gz" -C "$BACK_RELEASE"
for file in "$FRONT_RELEASE/server.js" "$BACK_RELEASE/dist/src/server.js" \
            "$BACK_RELEASE/dist/src/scripts/migrate-production.js" \
            "$BACK_RELEASE/prisma/schema.prisma" "$BACK_RELEASE/package-lock.json"; do
  test -f "$file"
done
test -d "$FRONT_RELEASE/.next"
# dotenv/config uses process.cwd(); leave the only writable secret in the existing root.
ln -s "$BACKEND/.env" "$BACK_RELEASE/.env"

ACTIVATE="${SICKO_NODE_ACTIVATE_PATH:-}"
if [[ -z "$ACTIVATE" ]]; then
  ACTIVATE="$(find /home/sickosou/nodevenv/sicko-backend-prod -path '*/bin/activate' -print -quit 2>/dev/null || true)"
fi
[[ -f "$ACTIVATE" ]] || { echo 'ERROR: Backend Node environment activation file missing.' >&2; exit 1; }
set +u
# shellcheck disable=SC1090
source "$ACTIVATE"
set -u

cd "$BACK_RELEASE"
# Stage dependencies in the NEW release; never mutate live node_modules.
npm ci --omit=dev --no-audit --no-fund
# Check production configuration before running any schema migrations.
NODE_ENV=production node -e "import('./dist/src/config/env.js')"

# Database rollback is NOT attempted: migrations must remain backward-compatible.
echo 'Applying forward-compatible database migrations...'
npm run migrate:production

free_port() {
  node -e 'const n=require("net").createServer();n.listen(0,"127.0.0.1",()=>{console.log(n.address().port);n.close()})'
}
BACK_PORT="$(free_port)"
FRONT_PORT="$(free_port)"
[[ "$BACK_PORT" != "$FRONT_PORT" ]] || FRONT_PORT="$(free_port)"

NODE_ENV=production PORT="$BACK_PORT" API_PREFIX=/api/v1 \
 FRONTEND_ORIGIN=https://sickosoul.shop SICKO_DEPLOY_READINESS_ONLY=true \
 node "$BACK_RELEASE/dist/src/server.js" > "$BACK_RELEASE/deploy-smoke.log" 2>&1 &
BACK_PID="$!"

wait_backend() {
  local body
  for _ in $(seq 1 "${SICKO_PREFLIGHT_ATTEMPTS:-45}"); do
    if ! kill -0 "$BACK_PID" 2>/dev/null; then break; fi
    body="$(curl -fsS --connect-timeout 1 --max-time 2 "http://127.0.0.1:$BACK_PORT/api/v1/health" 2>/dev/null || true)"
    if printf '%s' "$body" | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{try{const x=JSON.parse(s);process.exit(x.data?.status==="ok"&&x.data?.database==="connected"?0:1)}catch{process.exit(1)}})' ; then return 0; fi
    sleep 1
  done
  echo 'ERROR: New backend failed readiness; last log lines:' >&2
  tail -n 20 "$BACK_RELEASE/deploy-smoke.log" >&2 || true
  return 1
}
wait_backend

cd "$FRONT_RELEASE"
NODE_ENV=production HOSTNAME=127.0.0.1 PORT="$FRONT_PORT" \
 NEXT_PUBLIC_API_BASE_URL=/api/v1 \
 SICKO_INTERNAL_API_BASE_URL="http://127.0.0.1:$BACK_PORT/api/v1" \
 node "$FRONT_RELEASE/server.js" > "$FRONT_RELEASE/deploy-smoke.log" 2>&1 &
FRONT_PID="$!"

wait_frontend() {
  for _ in $(seq 1 "${SICKO_PREFLIGHT_ATTEMPTS:-45}"); do
    if ! kill -0 "$FRONT_PID" 2>/dev/null; then break; fi
    if curl -fsS --connect-timeout 1 --max-time 5 "http://127.0.0.1:$FRONT_PORT/" -o /dev/null 2>/dev/null; then return 0; fi
    sleep 1
  done
  echo 'ERROR: New frontend failed readiness; last log lines:' >&2
  tail -n 20 "$FRONT_RELEASE/deploy-smoke.log" >&2 || true
  return 1
}
wait_frontend
stop_probe
PREPARED=1

echo 'Candidate passed isolated backend/database/frontend health checks.'
status activating
# Preserve the old runtime. The first upgrade converts the old frontend
# directory into a retained legacy release; later upgrades use only symlinks.
if [[ -f "$GATEWAY" ]]; then cp -p "$GATEWAY" "$GATEWAY_BACKUP"; fi
if [[ -L "$BACK_ACTIVE" ]]; then
  OLD_BACK="$(readlink "$BACK_ACTIVE")"
elif [[ -e "$BACK_ACTIVE" ]]; then
  echo 'ERROR: backend/current must be a symlink.' >&2; exit 1
fi
if [[ -L "$FRONT_ACTIVE" ]]; then
  OLD_FRONT="$(readlink "$FRONT_ACTIVE")"
elif [[ -d "$FRONT_ACTIVE" ]]; then
  LEGACY_FRONT="$FRONTEND/releases/legacy-${OLD_SHA:-first-install}"
  [[ ! -e "$LEGACY_FRONT" ]] || { echo "ERROR: $LEGACY_FRONT already exists." >&2; exit 1; }
  mv "$FRONT_ACTIVE" "$LEGACY_FRONT"
  # Ensure even a failure between rename and symlink creation restores the old dir.
  ACTIVATED=1
elif [[ -e "$FRONT_ACTIVE" ]]; then
  echo 'ERROR: Unexpected frontend release path type.' >&2; exit 1
fi

ACTIVATED=1
swap_link "$BACK_RELEASE" "$BACK_ACTIVE"
swap_link "$FRONT_RELEASE" "$FRONT_ACTIVE"
cp -p "$REPO/gateway-server.cjs" "$GATEWAY"
chmod 644 "$GATEWAY"
mkdir -p "$FRONTEND/tmp" "$BACKEND/tmp"
touch "$FRONTEND/tmp/restart.txt" "$BACKEND/tmp/restart.txt"

# Require the NEW PROCESS's runtime SHA, not a marker modified by the deployer.
# A stale Passenger process cannot satisfy this check.
echo 'Waiting for newly activated gateway, homepage, API, and database...'
healthcheck() {
  local body
  body="$(curl -fsS --connect-timeout 2 --max-time 5 "$PUBLIC_ORIGIN/__sicko_gateway_health" 2>/dev/null || true)"
  if ! printf '%s' "$body" | node -e 'const expected=process.argv[1];let s="";process.stdin.on("data",x=>s+=x);process.stdin.on("end",()=>{try{let x=JSON.parse(s);process.exit(x.status==="ok"&&x.backend===true&&x.frontend===true&&x.runtimeSource===expected?0:1)}catch{process.exit(1)}})' "$SOURCE_SHA"; then return 1; fi
  curl -fsS --connect-timeout 2 --max-time 5 "$PUBLIC_ORIGIN/api/v1/health" \
    | node -e 'let s="";process.stdin.on("data",x=>s+=x);process.stdin.on("end",()=>{try{let x=JSON.parse(s);process.exit(x.data?.status==="ok"&&x.data?.database==="connected"?0:1)}catch{process.exit(1)}})' || return 1
  curl -fsS --connect-timeout 2 --max-time 10 "$PUBLIC_ORIGIN/" -o /dev/null || return 1
}
verified=0
for _ in $(seq 1 "${SICKO_ACTIVATION_ATTEMPTS:-35}"); do
  if healthcheck; then verified=1; break; fi
  sleep 1
done
if (( verified != 1 )); then
  echo 'ERROR: New production runtime did not pass health checks.' >&2
  exit 1
fi

# Brief probation catches immediate crashes after initial readiness.
for _ in $(seq 1 "${SICKO_PROBATION_CHECKS:-3}"); do
  sleep "${SICKO_PROBATION_INTERVAL_SECONDS:-5}"
  healthcheck || { echo 'ERROR: New runtime failed its post-activation probation.' >&2; exit 1; }
done

# Commit marker only after all production probes succeed; preserve old release.
TMP_MARKER="${DEPLOY_MARKER}.tmp.$$"
printf '%s\n' "$SOURCE_SHA" > "$TMP_MARKER"
status active
mv -f "$TMP_MARKER" "$DEPLOY_MARKER"
ACTIVATED=0
trap - EXIT
stop_probe
printf '=== Sicko Soul release %s is active and healthy ===\n' "$SOURCE_SHA"
