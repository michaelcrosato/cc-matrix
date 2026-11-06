#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node build.mjs >artifacts/build.log
node --check artifacts/bundle-check.mjs
exec /home/micha/.local/share/pipx/venvs/playwright/bin/python tests/run.py "$@"
