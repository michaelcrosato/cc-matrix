#!/usr/bin/env bash
set -eu
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
exec "${PLAYWRIGHT_PYTHON:-/home/micha/.local/share/pipx/venvs/playwright/bin/python}" verify.py
