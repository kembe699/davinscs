#!/usr/bin/env bash
# Build the FlippedPOS offline installer.
#
# Produces a zip a shop can copy to a Windows PC, unzip, and run start.bat on.
# The zip carries source rather than a prebuilt image: Docker compiles it on
# first run, which keeps the download in single-digit megabytes instead of
# roughly half a gigabyte. That is the right trade here because an offline
# install still has to reach MASTER_API_URL to pull its licence on first login,
# so the machine has connectivity at setup time anyway.
#
# Contents come from `git archive`, so only committed files ship — an untracked
# scratch file or a local .env cannot leak into a customer package by accident.
#
#   bash scripts/build-offline-package.sh            # builds from HEAD
#   bash scripts/build-offline-package.sh --ref main
set -euo pipefail

cd "$(dirname "$0")/.."

REF="HEAD"
[ "${1:-}" = "--ref" ] && REF="${2:?--ref needs a value}"

STAMP="$(date +%Y%m%d)"
SHA="$(git rev-parse --short "$REF")"
OUT_DIR="dist-offline"
NAME="FlippedPos_Offline_${STAMP}_${SHA}"
STAGE="${OUT_DIR}/${NAME}"

if ! git diff --quiet "$REF" -- Dockerfile docker-compose.yml start.bat stop.bat .env.docker.example 2>/dev/null; then
  echo "NOTE: packaging files differ between your working tree and ${REF}."
  echo "      The package is built from ${REF}; commit your changes to include them."
fi

rm -rf "$STAGE"
mkdir -p "$STAGE"
git archive "$REF" | tar -x -C "$STAGE"

# Everything below is what the customer needs and nothing else.
rm -rf "$STAGE/.windsurf" "$STAGE/dist-offline"
rm -f  "$STAGE/.gitattributes" "$STAGE/cookie.txt" "$STAGE/cookies.txt"

# .env.example is the developer reference for every setting including the cloud
# ones, and it carries live third-party keys. An install needs only
# .env.docker.example, so the reference copy does not travel with the package.
rm -f  "$STAGE/.env.example"

# Fail loudly rather than shipping a credential.
if [ -f "$STAGE/.env" ]; then echo "ERROR: .env is in the package — aborting." >&2; exit 1; fi
LEAKS=$(grep -rlE 'connect\.sid|re_[A-Za-z0-9]{20,}|PESAPAL_CONSUMER_(KEY|SECRET)=.+|FIREBASE_SERVICE_ACCOUNT=\{|BEGIN (RSA|OPENSSH) PRIVATE KEY' "$STAGE" 2>/dev/null || true)
if [ -n "$LEAKS" ]; then
  echo "ERROR: possible credentials found in the package:" >&2
  echo "$LEAKS" >&2
  exit 1
fi

for required in Dockerfile docker-compose.yml start.bat stop.bat .env.docker.example package.json server/index.js; do
  [ -e "$STAGE/$required" ] || { echo "ERROR: $required missing from the package" >&2; exit 1; }
done

( cd "$OUT_DIR" && zip -qr "${NAME}.zip" "$NAME" )
rm -rf "$STAGE"

echo "Built ${OUT_DIR}/${NAME}.zip  ($(du -h "${OUT_DIR}/${NAME}.zip" | cut -f1))"
echo "Copy it to the Windows PC, unzip, and run start.bat."
