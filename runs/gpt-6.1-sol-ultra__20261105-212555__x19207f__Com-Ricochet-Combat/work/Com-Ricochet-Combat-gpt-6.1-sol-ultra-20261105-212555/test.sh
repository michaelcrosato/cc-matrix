#!/usr/bin/env bash
set -euo pipefail
game_dev_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
node "$game_dev_dir/build.mjs"
exec "$HOME/.local/share/pipx/venvs/playwright/bin/python" "$game_dev_dir/verify.py"
