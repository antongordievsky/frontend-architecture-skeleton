#!/bin/sh
# QR-5: the committed client must be exactly what the contract generates. Regenerate in place, compare
# with what was there, and always put the original back, so `check` never changes the tree.
set -eu

backup=node_modules/.cache/contract-check
rm -rf "$backup"
mkdir -p "$backup"
cp -R src/api/generated "$backup/generated"
trap 'rm -rf src/api/generated && cp -R "$backup/generated" src/api/generated' EXIT

orval --config orval.config.ts --quiet

if ! diff -r "$backup/generated" src/api/generated >"$backup/diff.txt"; then
  cat "$backup/diff.txt" >&2
  echo "contract: src/api/generated is not what contract/openapi.yaml generates — run \`bun run generate\`" >&2
  exit 1
fi
echo "contract: src/api/generated matches contract/openapi.yaml"
