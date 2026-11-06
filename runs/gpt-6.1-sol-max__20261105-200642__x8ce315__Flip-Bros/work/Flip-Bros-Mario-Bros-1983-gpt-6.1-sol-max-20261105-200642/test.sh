#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
node build.mjs
exec /home/micha/.local/share/pipx/venvs/playwright/bin/python test.py "$@"
