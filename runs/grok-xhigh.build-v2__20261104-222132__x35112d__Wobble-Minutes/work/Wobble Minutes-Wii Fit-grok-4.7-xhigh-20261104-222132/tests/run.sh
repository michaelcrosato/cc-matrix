#!/usr/bin/env bash
# One command for Wobble Minutes. Prints failures and a final "N passed, 0 failed" line.
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENGINE="$ROOT/engine"
MODE="${1:-all}"
export CARGO_BUILD_JOBS="${CARGO_BUILD_JOBS:-8}"
export PLAYWRIGHT_HOST_PLATFORM_OVERRIDE="${PLAYWRIGHT_HOST_PLATFORM_OVERRIDE:-ubuntu24.04-x64}"

summarize() {
  python3 "$ROOT/tests/summarize.py"
}

run_core() {
  local log code total_p=0 total_f=0 chunk
  log="$(mktemp "$ROOT/notes/.cargo-XXXXXX")"
  cd "$ENGINE"
  set +e
  cargo test -q --offline --locked -p pav_core --lib games::fit -- --test-threads=2 >"$log" 2>&1
  code=$?
  cargo test -q --offline --locked -p pav_core --test fit -- --test-threads=2 >>"$log" 2>&1
  code=$((code + $?))
  cargo test -q --offline --locked -p pav_audio -p pav_ui -- --test-threads=2 >>"$log" 2>&1
  code=$((code + $?))
  chunk="$(summarize <"$log")"
  local sum_code=$?
  if [[ $sum_code -ne 0 || $code -ne 0 ]]; then
    printf '%s\n' "$chunk"
    rm -f "$log"
    return 1
  fi
  printf '%s\n' "$chunk" | tail -n 1
  rm -f "$log"
  return 0
}

run_browser() {
  python3 "$ROOT/tests/browser.py"
}

run_hub() {
  python3 "$ROOT/tests/hub.py"
}

case "$MODE" in
  core) run_core ;;
  browser) run_browser ;;
  hub) run_hub ;;
  all)
    run_core || exit 1
    run_browser || exit 1
    run_hub || exit 1
    ;;
  *)
    echo "usage: tests/run.sh [core|browser|hub|all]" >&2
    exit 2
    ;;
esac
