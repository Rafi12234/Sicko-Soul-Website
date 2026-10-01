#!/bin/bash
set -Eeuo pipefail

REPO="/home/sickosou/repositories/Sicko-Soul-Website"
DEPLOY_MARKER="/home/sickosou/.sicko-deployed-source"
LOCK_FILE="/home/sickosou/.sicko-deploy.lock"

# Prevent two deployments from running at the same time.
exec 9>"$LOCK_FILE"

if ! flock -n 9; then
  echo "$(date -Is) Another Sicko Soul deployment is already running."
  exit 0
fi

cd "$REPO"

echo "$(date -Is) Checking for Sicko Soul release..."

git fetch origin \
  "+refs/heads/cpanel-release:refs/remotes/origin/cpanel-release" \
  --quiet

REMOTE_SHA="$(git rev-parse origin/cpanel-release)"
LOCAL_SHA="$(git rev-parse HEAD)"

echo "Remote release commit: $REMOTE_SHA"
echo "Local release commit:  $LOCAL_SHA"

# Update the local release checkout when GitHub has a newer release.
if [ "$REMOTE_SHA" != "$LOCAL_SHA" ]; then
  echo "$(date -Is) Updating local release checkout..."

  git reset --hard "$REMOTE_SHA"
  git clean -fd
fi

SOURCE_FILE="$REPO/source-commit.txt"

if [ ! -f "$SOURCE_FILE" ]; then
  echo "ERROR: source-commit.txt does not exist."
  exit 1
fi

SOURCE_SHA="$(tr -d '\r\n' < "$SOURCE_FILE")"

DEPLOYED_SHA=""

if [ -f "$DEPLOY_MARKER" ]; then
  DEPLOYED_SHA="$(tr -d '\r\n' < "$DEPLOY_MARKER")"
fi

echo "Release source:  $SOURCE_SHA"
echo "Deployed source: ${DEPLOYED_SHA:-none}"

# THIS is the important check.
# We care about what is actually deployed, not only Git HEAD.
if [ "$SOURCE_SHA" = "$DEPLOYED_SHA" ]; then
  echo "$(date -Is) Source $SOURCE_SHA is already deployed."
  exit 0
fi

echo "$(date -Is) Deploying source $SOURCE_SHA..."

if /bin/bash "$REPO/deploy-cpanel.sh"; then
  echo "$(date -Is) Sicko Soul deployment completed."
else
  EXIT_CODE=$?

  echo "$(date -Is) ERROR: Sicko Soul deployment failed with exit code $EXIT_CODE."
  exit "$EXIT_CODE"
fi