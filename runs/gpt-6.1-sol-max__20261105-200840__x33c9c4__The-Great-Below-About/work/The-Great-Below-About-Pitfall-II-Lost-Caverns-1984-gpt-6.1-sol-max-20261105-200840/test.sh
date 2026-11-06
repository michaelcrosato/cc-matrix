#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
exec /home/micha/.local/share/pipx/venvs/playwright/bin/python tests/run.py
