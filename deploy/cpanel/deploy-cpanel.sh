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

echo "=== Sicko Soul deployment started ==="

test -f "$FRONTEND_ARCHIVE"
test -f "$BACKEND_ARCHIVE"
test -f "$SOURCE_FILE"

SOURCE_SHA="$(tr -d '\r\n' < "$SOURCE_FILE")"

if [ -f "$DEPLOY_MARKER" ]; then
  DEPLOYED_SHA="$(tr -d '\r\n' < "$DEPLOY_MARKER")"

  if [ "$SOURCE_SHA" = "$DEPLOYED_SHA" ]; then
    echo "Release $SOURCE_SHA is already deployed."
    exit 0
  fi
fi

echo "Deploying source commit: $SOURCE_SHA"

#
# Backend
#

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
test -f "$BACKEND_STAGE/prisma/schema.prisma"

rm -rf "$BACKEND/dist"
rm -rf "$BACKEND/prisma"

cp -a "$BACKEND_STAGE/dist" "$BACKEND/dist"
cp -a "$BACKEND_STAGE/prisma" "$BACKEND/prisma"

cp "$BACKEND_STAGE/app.js" "$BACKEND/app.js"
cp "$BACKEND_STAGE/package.json" "$BACKEND/package.json"
cp "$BACKEND_STAGE/package-lock.json" "$BACKEND/package-lock.json"
cp "$BACKEND_STAGE/prisma.config.ts" "$BACKEND/prisma.config.ts"

rm -rf "$BACKEND_STAGE"

#
# Activate the CloudLinux Node environment
#

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

# CloudLinux's activate script references variables that may initially be unset.
# Temporarily disable nounset while sourcing it.
set +u

# shellcheck disable=SC1090
source "$ACTIVATE"

set -u

cd "$BACKEND"

#
# Install backend packages only when package-lock changes
#

LOCK_HASH="$(sha256sum package-lock.json | awk '{print $1}')"
LOCK_MARKER="$BACKEND/.package-lock.sha256"

INSTALLED_HASH=""

if [ -f "$LOCK_MARKER" ]; then
  INSTALLED_HASH="$(cat "$LOCK_MARKER")"
fi

if [ "$LOCK_HASH" != "$INSTALLED_HASH" ]; then
  echo "Backend dependencies changed. Installing packages..."

  npm install --include=dev --no-audit --no-fund

  printf '%s\n' "$LOCK_HASH" > "$LOCK_MARKER"
else
  echo "Backend dependencies unchanged."
fi

#
# Production database migration
#

echo "Running Prisma production migrations..."

npm run prisma:migrate:deploy

#
# Frontend
#

echo "Preparing frontend..."

FRONTEND_NEW="$FRONTEND/release.new"
FRONTEND_OLD="$FRONTEND/release.old"

rm -rf "$FRONTEND_NEW"
rm -rf "$FRONTEND_OLD"

mkdir -p "$FRONTEND_NEW"

tar -xzf "$FRONTEND_ARCHIVE" -C "$FRONTEND_NEW"

test -f "$FRONTEND_NEW/server.js"
test -f "$FRONTEND_NEW/package.json"
test -d "$FRONTEND_NEW/.next"

if [ -e "$FRONTEND/release" ]; then
  mv "$FRONTEND/release" "$FRONTEND_OLD"
fi

mv "$FRONTEND_NEW" "$FRONTEND/release"

printf '%s\n' 'require("./release/server.js");' \
  > "$FRONTEND/server.js"

#
# Restart Passenger applications
#

mkdir -p "$FRONTEND/tmp"
mkdir -p "$BACKEND/tmp"

touch "$FRONTEND/tmp/restart.txt"
touch "$BACKEND/tmp/restart.txt"

printf '%s\n' "$SOURCE_SHA" > "$DEPLOY_MARKER"

rm -rf "$FRONTEND_OLD"

echo "=== Sicko Soul deployment completed successfully ==="