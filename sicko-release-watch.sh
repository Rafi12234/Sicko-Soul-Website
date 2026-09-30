#!/bin/bash
set -Eeuo pipefail

REPO="/home/sickosou/repositories/Sicko-Soul-Website"
cd "$REPO"

git fetch origin cpanel-release --quiet
REMOTE_SHA="$(git rev-parse origin/cpanel-release)"
LOCAL_SHA="$(git rev-parse HEAD)"

if [ "$REMOTE_SHA" = "$LOCAL_SHA" ]; then
  exit 0
fi

echo "$(date -Is) New Sicko Soul release detected: $REMOTE_SHA"
git reset --hard "$REMOTE_SHA"
git clean -fd
/bin/bash "$REPO/deploy-cpanel.sh"
