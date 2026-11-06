#!/usr/bin/env bash
set -euo pipefail
task_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
python3 "$task_dir/build.py"
exec /home/micha/.local/share/pipx/venvs/playwright/bin/python "$task_dir/tests/run.py" "$@"
