#!/usr/bin/env bash
set -euo pipefail
dev="$(cd "$(dirname "$0")/.." && pwd)"
"$dev/engine/scripts/build-web.sh" --single-file --scene fit --title 'Wii Fit Together' --out "$dev/game.raw.html"
python3 "$dev/scripts/bundle.py"
