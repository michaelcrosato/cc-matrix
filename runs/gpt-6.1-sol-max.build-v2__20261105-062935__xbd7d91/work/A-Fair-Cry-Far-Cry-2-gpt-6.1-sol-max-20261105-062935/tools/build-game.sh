#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 tools/page.py
TASK_TITLE=$(python3 -c 'import tomllib; print(tomllib.load(open("engine/game/merc/strings.toml","rb"))["title"])')
TASK_SLUG="${TASK_TITLE// /-}-Far-Cry-2-gpt-6.1-sol-max-20261105-062935"
TASK_OUTPUT="$(pwd)/../${TASK_SLUG}.html"
(cd engine && CARGO_BUILD_JOBS=10 scripts/build-web.sh --single-file --scene merc --title "$TASK_TITLE" --description "Every bullet has a buyer. A first-person contract in the last dry season." --theme-color '#2a2420' --out "$TASK_OUTPUT")
python3 tools/check-package.py "$TASK_OUTPUT"
