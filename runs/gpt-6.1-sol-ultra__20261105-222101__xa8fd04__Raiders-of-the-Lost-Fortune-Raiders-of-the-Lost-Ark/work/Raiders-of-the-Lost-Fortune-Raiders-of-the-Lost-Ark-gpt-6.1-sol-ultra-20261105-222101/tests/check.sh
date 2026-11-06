#!/usr/bin/env bash
set -euo pipefail
test_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
exec /home/micha/.local/share/pipx/venvs/playwright/bin/python "$test_dir/check.py"
