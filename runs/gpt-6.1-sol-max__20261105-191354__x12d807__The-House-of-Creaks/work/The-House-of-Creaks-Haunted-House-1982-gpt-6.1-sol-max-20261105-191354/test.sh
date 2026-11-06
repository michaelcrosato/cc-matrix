#!/usr/bin/env bash
set -euo pipefail
TASK_TEST_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
exec /home/micha/.local/share/pipx/venvs/playwright/bin/python "$TASK_TEST_DIR/test.py"
