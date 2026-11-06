#!/usr/bin/env bash
# The one test command: tests/run.sh [core|browser|hub|all]. Prints only failures and a count.
set -u
here=$(cd "$(dirname "$0")" && pwd)
what=${1:-all}
passed=0; failed=0
tally() { # reads a test command's own "N passed, M failed" or cargo's result lines
  local out=$1
  while read -r p f; do passed=$((passed + p)); failed=$((failed + f)); done < <(printf '%s\n' "$out" | sed -n -E 's/^test result: [a-zA-Z]+\. ([0-9]+) passed; ([0-9]+) failed.*/\1 \2/p; s/^([0-9]+) passed, ([0-9]+) failed$/\1 \2/p')
}
core() {
  cd "$here/../engine"
  local o
  o=$(CARGO_BUILD_JOBS=${CARGO_BUILD_JOBS:-8} cargo test -q --locked -p pav_core --test fit 2>&1); printf '%s\n' "$o" | grep -E '^(error|test .* FAILED|thread .* panicked|---- )|panicked at|FAILED' | cut -c1-400; tally "$o"
  o=$(CARGO_BUILD_JOBS=${CARGO_BUILD_JOBS:-8} cargo test -q --locked -p pav_audio -p pav_ui 2>&1); printf '%s\n' "$o" | grep -E '^(error|test .* FAILED|thread .* panicked|---- )|panicked at|FAILED' | cut -c1-400; tally "$o"
}
py() { cd "$here"; local o; o=$(python3 "$1" 2>&1); printf '%s\n' "$o" | grep -vE '^[0-9]+ passed, [0-9]+ failed$' | cut -c1-600; tally "$o"; }
case $what in
  core) core ;;
  browser) py browser.py ;;
  hub) py hub.py ;;
  all) core; py browser.py; py hub.py ;;
  *) echo "usage: tests/run.sh [core|browser|hub|all]"; exit 2 ;;
esac
echo "$passed passed, $failed failed"
[ "$failed" -eq 0 ]
