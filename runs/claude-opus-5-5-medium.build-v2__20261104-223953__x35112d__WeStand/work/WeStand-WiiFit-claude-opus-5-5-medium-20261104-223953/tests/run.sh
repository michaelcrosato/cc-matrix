#!/usr/bin/env bash
# One command: tests/run.sh [core|browser|hub|all]. Prints failures and one line of counts.
set -uo pipefail
here=$(cd "$(dirname "$0")/.." && pwd)
what=${1:-all}
pass=0; fail=0
count() { # reads "N passed, M failed" from a script's last line
  local out="$1"; printf '%s\n' "$out" | grep -E '^FAIL|panicked|^error' | cut -c1-400
  local l; l=$(printf '%s\n' "$out" | tail -1); local a b
  a=$(sed -nE 's/^([0-9]+) passed.*/\1/p' <<<"$l"); b=$(sed -nE 's/.* ([0-9]+) failed.*/\1/p' <<<"$l")
  pass=$((pass + ${a:-0})); fail=$((fail + ${b:-1}))
}
core() {
  cd "$here/engine" || exit 1
  local out
  out=$(CARGO_BUILD_JOBS=8 cargo test -q --locked -p pav_core --test fit 2>&1; CARGO_BUILD_JOBS=8 cargo test -q --locked -p pav_audio -p pav_ui 2>&1)
  printf '%s\n' "$out" | grep -E -- '--- FAILED|panicked|^error' | cut -c1-400
  while read -r a b; do pass=$((pass + a)); fail=$((fail + b)); done < <(printf '%s\n' "$out" | sed -nE 's/^test result: .*\. ([0-9]+) passed; ([0-9]+) failed.*/\1 \2/p')
}
[[ $what == core || $what == all ]] && core
[[ $what == browser || $what == all ]] && count "$(python3 "$here/tests/browser.py" 2>&1)"
[[ $what == hub || $what == all ]] && count "$(python3 "$here/tests/hub.py" 2>&1)"
echo "$pass passed, $fail failed"
[[ $fail == 0 ]]
