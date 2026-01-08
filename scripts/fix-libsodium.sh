#!/usr/bin/env sh
# To mitigate error when running tests:
# error: Cannot find module './libsodium-sumo.mjs' from 'node_modules/.bun/libsodium-wrappers-sumo@0.7.16/node_modules/libsodium-wrappers-sumo/dist/modules-sumo-esm/libsodium-wrappers.mjs'
set -e

BASE="node_modules/.bun"

WRAPPER=$(ls "$BASE" | grep '^libsodium-wrappers-sumo@' | tail -n1)
[ -z "$WRAPPER" ] && exit 0

TARGET="$BASE/$WRAPPER/node_modules/libsodium-wrappers-sumo/dist/modules-sumo-esm/libsodium-sumo.mjs"
SOURCE="../../../libsodium-sumo/dist/modules-sumo-esm/libsodium-sumo.mjs"

if [ ! -e "$TARGET" ]; then
  ln -s "$SOURCE" "$TARGET"
  echo "Patched libsodium-wrappers-sumo for Bun"
fi
