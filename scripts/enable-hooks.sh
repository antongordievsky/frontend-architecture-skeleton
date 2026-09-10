#!/bin/sh
# D-25: switch the repository's hooks on, once. Writing git's config on every install is needless, and
# the agent's sandbox refuses it. Outside a git checkout (a tarball, the image) there is nothing to do.
git rev-parse --git-dir >/dev/null 2>&1 || exit 0
[ "$(git config --get core.hooksPath)" = .githooks ] || git config core.hooksPath .githooks
