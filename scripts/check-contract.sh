#!/bin/sh
# QR-5: the committed client must be exactly what the contract generates. orval regenerates into a scratch
# copy of its inputs, never in place: orval's `clean` empties the folder first, and an interrupted check,
# or a dev server watching src/, must never see the committed client disappear.
set -eu

scratch=node_modules/.cache/contract-check
rm -rf "$scratch"
mkdir -p "$scratch/src/api"
# Everything orval reads: its config, the contract, the mutator it imports, and package.json, from which it
# picks version-specific output. Under node_modules/, the config still resolves `orval` from the root.
cp orval.config.ts package.json "$scratch/"
cp -R contract "$scratch/contract"
cp src/api/transport.ts "$scratch/src/api/transport.ts"

(cd "$scratch" && orval --config orval.config.ts --quiet)

if ! diff -r src/api/generated "$scratch/src/api/generated" >"$scratch/diff.txt"; then
  cat "$scratch/diff.txt" >&2
  echo "contract: src/api/generated is not what contract/openapi.yaml generates — run \`bun run generate\`" >&2
  exit 1
fi
echo "contract: src/api/generated matches contract/openapi.yaml"
