#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
python3 build.py >/dev/null
exec /home/micha/.local/share/pipx/venvs/playwright/bin/python test-game.py
