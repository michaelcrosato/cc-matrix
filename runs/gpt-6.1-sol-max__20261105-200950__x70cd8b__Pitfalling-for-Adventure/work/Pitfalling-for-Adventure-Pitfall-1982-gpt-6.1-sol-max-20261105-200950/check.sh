#!/usr/bin/env bash
set -euo pipefail
task_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
python3 "$task_dir/build.py"
task_python="/home/micha/.local/share/pipx/venvs/playwright/bin/python"
if [[ ! -x "$task_python" ]]; then
	task_python="python3"
fi
exec "$task_python" "$task_dir/test.py" "$@"
