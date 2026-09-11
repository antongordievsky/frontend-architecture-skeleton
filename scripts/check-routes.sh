#!/bin/sh
# D-05: the committed route tree must be exactly what the route files generate. `tsr` regenerates into a
# scratch copy of its inputs, never in place, so a check never rewrites the tree it is checking. The route
# files are compared too: the generator rewrites a route's path when it no longer matches its file name.
set -eu

scratch=node_modules/.cache/routes-check
rm -rf "$scratch"
mkdir -p "$scratch/src"
cp tsr.config.json "$scratch/"
cp -R src/routes "$scratch/src/routes"

if ! (cd "$scratch" && tsr generate) >"$scratch/generate.log" 2>&1; then
  cat "$scratch/generate.log" >&2
  echo "routes: tsr generate failed" >&2
  exit 1
fi

if ! diff src/routeTree.gen.ts "$scratch/src/routeTree.gen.ts" >"$scratch/diff.txt" ||
  ! diff -r src/routes "$scratch/src/routes" >>"$scratch/diff.txt"; then
  cat "$scratch/diff.txt" >&2
  echo "routes: src/routeTree.gen.ts is not what src/routes generates — run \`bun run routes\`" >&2
  exit 1
fi
echo "routes: src/routeTree.gen.ts matches src/routes"
