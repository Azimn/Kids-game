#!/usr/bin/env sh
set -eu
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DEST=${1:-"$SCRIPT_DIR/build"}
mkdir -p "$DEST"
cat "$SCRIPT_DIR"/archive_parts/part*.b64 | tr -d '\r\n' | base64 -d > "$DEST/canonical_source.tgz"
echo '691f6e61a70bfe4fe4965edfa49a1b85d7d1db35d3d9215c5c75171fbd6c2485  '"$DEST"'/canonical_source.tgz' | sha256sum -c -
tar -xzf "$DEST/canonical_source.tgz" -C "$DEST"
rm "$DEST/canonical_source.tgz"
