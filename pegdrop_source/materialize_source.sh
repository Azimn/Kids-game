#!/usr/bin/env sh
set -eu
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DEST=${1:-"$SCRIPT_DIR/build"}
mkdir -p "$DEST"
tr -d '\r\n' < "$SCRIPT_DIR/canonical_source.tgz.b64" | base64 -d > "$DEST/canonical_source.tgz"
echo '691f6e61a70bfe4fe4965edfa49a1b85d7d1db35d3d9215c5c75171fbd6c2485  '"$DEST"'/canonical_source.tgz' | sha256sum -c -
tar -xzf "$DEST/canonical_source.tgz" -C "$DEST"
rm "$DEST/canonical_source.tgz"
