#!/usr/bin/env bash
set -euo pipefail
export PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64
exec python3 "$(dirname "$0")/test_game.py" "${1:-all}"
