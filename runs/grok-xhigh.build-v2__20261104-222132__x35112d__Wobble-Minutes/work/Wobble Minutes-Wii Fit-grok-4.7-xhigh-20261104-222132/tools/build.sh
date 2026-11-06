#!/usr/bin/env bash
# Copy the exit interview into the page, then pack one HTML file for the work folder.
set -euo pipefail
DEV="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(cd "$DEV/.." && pwd)"
export CARGO_BUILD_JOBS="${CARGO_BUILD_JOBS:-8}"
python3 "$DEV/tools/write_index.py"
TITLE="Wobble Minutes — Five days, one mat"
DESC="Lean through a week of balance games at Tippy Cay, a pastel resort staffed by talking gym gear."
OUT="$WORK/Wobble Minutes-Wii Fit-grok-4.7-xhigh-20261104-222132.html"
cd "$DEV/engine"
scripts/build-web.sh --single-file --scene fit \
  --title "$TITLE" \
  --description "$DESC" \
  --theme-color "#f4e7d4" \
  --out "$OUT"
