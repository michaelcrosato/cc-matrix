#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
if [[ "${1:-}" == "--package-only" ]]; then
	exec /home/micha/.local/share/pipx/venvs/playwright/bin/python "$project_dir/test_package.py"
fi
exec /home/micha/.local/share/pipx/venvs/playwright/bin/python "$project_dir/test_game.py" "$@"
