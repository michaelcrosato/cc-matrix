#!/usr/bin/env bash
set -euo pipefail
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
exec /home/micha/.local/share/pipx/venvs/playwright/bin/python "$script_dir/test.py" "$@"
