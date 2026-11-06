#!/usr/bin/env bash
# One command for every test. Prints only failures and a final count: `tests/run.sh [core|browser|hub|all]`.
set -u
cd "$(dirname "$0")/../engine"
part="${1:-all}"
pass=0; fail=0
run_core() {
  out=$(CARGO_BUILD_JOBS=8 cargo test -q --locked -p pav_core --test fit 2>&1)
  p=$(echo "$out" | grep -E "^test result" | sed -E 's/.* ([0-9]+) passed; ([0-9]+) failed.*/\1/' | paste -sd+ | bc)
  f=$(echo "$out" | grep -E "^test result" | sed -E 's/.* ([0-9]+) passed; ([0-9]+) failed.*/\2/' | paste -sd+ | bc)
  pass=$((pass + ${p:-0})); fail=$((fail + ${f:-0}))
  if [ "${f:-0}" != "0" ] || ! echo "$out" | grep -q "^test result"; then echo "$out" | grep -vE "^(warning|\s+\||\s+-->|\s*$|\s+=)" | tail -40; [ "${f:-0}" = "0" ] && fail=$((fail+1)); fi
  out=$(CARGO_BUILD_JOBS=8 cargo test -q --locked -p pav_audio -p pav_ui 2>&1)
  p=$(echo "$out" | grep -E "^test result" | sed -E 's/.* ([0-9]+) passed; ([0-9]+) failed.*/\1/' | paste -sd+ | bc)
  f=$(echo "$out" | grep -E "^test result" | sed -E 's/.* ([0-9]+) passed; ([0-9]+) failed.*/\2/' | paste -sd+ | bc)
  pass=$((pass + ${p:-0})); fail=$((fail + ${f:-0}))
  if [ "${f:-0}" != "0" ]; then echo "$out" | grep -E "FAILED|panicked" | head -20; fi
}
run_py() {
  out=$(python3 "../tests/$1" 2>&1); code=$?
  p=$(echo "$out" | grep -E "^RESULT" | sed -E 's/RESULT ([0-9]+) passed, ([0-9]+) failed/\1/' | tail -1)
  f=$(echo "$out" | grep -E "^RESULT" | sed -E 's/RESULT ([0-9]+) passed, ([0-9]+) failed/\2/' | tail -1)
  pass=$((pass + ${p:-0})); fail=$((fail + ${f:-0}))
  echo "$out" | grep -E "^FAIL" | head -30
  [ $code -ne 0 ] && [ -z "$p" ] && { echo "$1 crashed"; echo "$out" | tail -15; fail=$((fail+1)); }
}
case "$part" in
  core) run_core ;;
  browser) run_py browser.py ;;
  hub) run_py hub.py ;;
  all) run_core; run_py browser.py; run_py hub.py ;;
esac
echo "$pass passed, $fail failed"
[ "$fail" = "0" ]
