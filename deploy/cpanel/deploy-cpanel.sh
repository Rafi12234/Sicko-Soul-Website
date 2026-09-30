#!/bin/bash
set -Eeuo pipefail
umask 022

REPO="/home/sickosou/repositories/Sicko-Soul-Website"
FRONTEND="/home/sickosou/sicko-frontend-prod"
BACKEND="/home/sickosou/sicko-backend-prod"
DEPLOY_MARKER="/home/sickosou/.sicko-deployed-source"

FRONTEND_ARCHIVE="$REPO/frontend-release.tar.gz"
BACKEND_ARCHIVE="$REPO/backend-release.tar.gz"
SOURCE_FILE="$REPO/source-commit.txt"
GATEWAY_SOURCE="$REPO/gateway-server.cjs"

echo "=== Sicko Soul deployment started ==="

test -f "$FRONTEND_ARCHIVE"
test -f "$BACKEND_ARCHIVE"
test -f "$SOURCE_FILE"
test -f "$GATEWAY_SOURCE"
test -f "$BACKEND/.env"

SOURCE_SHA="$(tr -d '\r\n' < "$SOURCE_FILE")"

if [ -f "$DEPLOY_MARKER" ]; then
  DEPLOYED_SHA="$(tr -d '\r\n' < "$DEPLOY_MARKER")"
  if [ "$SOURCE_SHA" = "$DEPLOYED_SHA" ]; then
    echo "Release $SOURCE_SHA is already deployed."
    exit 0
  fi
fi

echo "Deploying source commit: $SOURCE_SHA"

echo "Preparing backend..."
BACKEND_STAGE="$BACKEND/.deploy-new"
rm -rf "$BACKEND_STAGE"
mkdir -p "$BACKEND_STAGE"
tar -xzf "$BACKEND_ARCHIVE" -C "$BACKEND_STAGE"

test -f "$BACKEND_STAGE/app.js"
test -f "$BACKEND_STAGE/package.json"
test -f "$BACKEND_STAGE/package-lock.json"
test -f "$BACKEND_STAGE/prisma.config.ts"
test -f "$BACKEND_STAGE/dist/src/server.js"
test -f "$BACKEND_STAGE/dist/src/scripts/migrate-production.js"
test -f "$BACKEND_STAGE/prisma/schema.prisma"

rm -rf "$BACKEND/dist" "$BACKEND/prisma"
cp -a "$BACKEND_STAGE/dist" "$BACKEND/dist"
cp -a "$BACKEND_STAGE/prisma" "$BACKEND/prisma"
cp "$BACKEND_STAGE/app.js" "$BACKEND/app.js"
cp "$BACKEND_STAGE/package.json" "$BACKEND/package.json"
cp "$BACKEND_STAGE/package-lock.json" "$BACKEND/package-lock.json"
cp "$BACKEND_STAGE/prisma.config.ts" "$BACKEND/prisma.config.ts"
rm -rf "$BACKEND_STAGE"

ACTIVATE="$(
  find "/home/sickosou/nodevenv/sicko-backend-prod" \
    -path "*/bin/activate" \
    -print \
    2>/dev/null \
    | head -n 1
)"

if [ -z "$ACTIVATE" ]; then
  echo "ERROR: Backend Node environment activation file not found."
  exit 1
fi

echo "Using Node environment:"
echo "$ACTIVATE"

# CloudLinux activation references variables that may initially be unset.
set +u
# shellcheck disable=SC1090
source "$ACTIVATE"
set -u

cd "$BACKEND"

LOCK_HASH="$(sha256sum package-lock.json | awk '{print $1}')"
LOCK_MARKER="$BACKEND/.package-lock-production.sha256"
INSTALLED_HASH=""
if [ -f "$LOCK_MARKER" ]; then
  INSTALLED_HASH="$(cat "$LOCK_MARKER")"
fi

if [ "$LOCK_HASH" != "$INSTALLED_HASH" ]; then
  echo "Backend dependencies changed. Installing production packages..."
  npm install --omit=dev --no-audit --no-fund
  printf '%s\n' "$LOCK_HASH" > "$LOCK_MARKER"
else
  echo "Backend production dependencies unchanged."
fi

echo "Running lightweight production migrations..."
npm run migrate:production

echo "Preparing frontend..."
FRONTEND_NEW="$FRONTEND/release.new"
FRONTEND_OLD="$FRONTEND/release.old"
rm -rf "$FRONTEND_NEW" "$FRONTEND_OLD"
mkdir -p "$FRONTEND_NEW"
tar -xzf "$FRONTEND_ARCHIVE" -C "$FRONTEND_NEW"

test -f "$FRONTEND_NEW/server.js"
test -f "$FRONTEND_NEW/package.json"
test -d "$FRONTEND_NEW/.next"

if [ -e "$FRONTEND/release" ]; then
  mv "$FRONTEND/release" "$FRONTEND_OLD"
fi
mv "$FRONTEND_NEW" "$FRONTEND/release"

# Passenger starts this gateway. It launches the prebuilt Next standalone server
# and the already-deployed backend on private local ports, then routes /api/v1
# to Express and every other path to Next.js.
cp "$GATEWAY_SOURCE" "$FRONTEND/server.js"
chmod 644 "$FRONTEND/server.js"

mkdir -p "$FRONTEND/tmp" "$BACKEND/tmp"
touch "$FRONTEND/tmp/restart.txt"
touch "$BACKEND/tmp/restart.txt"

printf '%s\n' "$SOURCE_SHA" > "$DEPLOY_MARKER"
rm -rf "$FRONTEND_OLD"

echo "=== Sicko Soul deployment completed successfully ==="
