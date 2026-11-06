#!/usr/bin/env bash
# Builds the single-file game: the page (hub client, about data), then the wasm, then the pack.
set -euo pipefail
here=$(cd "$(dirname "$0")/.." && pwd)
name=$(basename "$here")
python3 "$here/tools/make_page.py"
cd "$here/engine"
export CARGO_BUILD_JOBS=8
scripts/build-web.sh --single-file --scene fit --title "We Stand — A wellness resort you did not enter" \
  --description "A balance-and-wellness comedy on a resort staffed by talking gym equipment." \
  --theme-color "#46bec8" --out "$here/../$name.html" 2>&1 | tail -3
ls -la "$here/../$name.html"
