#!/usr/bin/env bash
# Builds the bundle, then runs every suite. Usage: tests/run_all.sh <out-dir>
set -u
cd "$(dirname "$0")/.."
OUT="${1:-/tmp/hb-final}"; mkdir -p "$OUT"
HTML=../HalfBaked-BreakingBad-claude-haiku-5-5-medium-20261102-191613.html
node build.mjs "$HTML" || exit 1
for t in tests/logic.test.cjs tests/maps.test.cjs tests/audio.test.cjs; do node --test "$t" 2>&1 | grep -E "^ℹ (pass|fail)" | sed "s|^|$t: |"; done
python3 -u tests/browser/playthrough.py "$HTML" "$OUT" > "$OUT/playthrough.log" 2>&1; tail -1 "$OUT/playthrough.log"
python3 -u tests/browser/systems.py "$HTML" "$OUT" > "$OUT/systems.log" 2>&1; tail -1 "$OUT/systems.log"
python3 -u tests/browser/hub.py "$HTML" "$OUT" > "$OUT/hub.log" 2>&1; tail -1 "$OUT/hub.log"
python3 -u tests/browser/glyphs.py "$HTML" "$OUT" > "$OUT/glyphs.log" 2>&1; tail -1 "$OUT/glyphs.log"
echo ALL_DONE
