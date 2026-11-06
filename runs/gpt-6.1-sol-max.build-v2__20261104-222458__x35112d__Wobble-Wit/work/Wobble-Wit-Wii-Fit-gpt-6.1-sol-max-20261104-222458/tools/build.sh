#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 tools/make-page.py
cd engine
CARGO_BUILD_JOBS=4 scripts/build-web.sh --single-file --scene fit --title "Wobble Wit — A little less wobble" --description "A five-day wellness holiday staffed by talking gym equipment. Eleven activities. One very patient clam." --theme-color '#8fdde0' --out ../../Wobble-Wit-Wii-Fit-gpt-6.1-sol-max-20261104-222458.html
