#!/usr/bin/env bash
set -euo pipefail
surgery_root=$(cd "$(dirname "$0")/.." && pwd)
cd "$surgery_root/engine"
CARGO_BUILD_JOBS=6 cargo build --locked --profile dist --target wasm32-unknown-unknown -p pav_surgery > "$surgery_root/build-web.log" 2>&1
python3 "$surgery_root/tools/bundle.py"
