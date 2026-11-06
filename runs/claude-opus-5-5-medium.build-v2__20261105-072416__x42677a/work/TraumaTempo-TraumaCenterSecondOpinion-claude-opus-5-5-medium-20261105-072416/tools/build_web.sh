#!/usr/bin/env bash
# Builds the single-file game into the work folder's root. Run from anywhere.
set -u
here=$(cd "$(dirname "$0")/.." && pwd)
name=$(basename "$here")
cd "$here/engine"
[ -f web/about.json ] || cp crates/pav_ui/src/surgery/about.json web/about.json
for attempt in 1 2 3 4 5 6; do
  for w in $(seq 1 90); do
    avail=$(awk '/MemAvailable/{print int($2/1048576)}' /proc/meminfo)
    [ "$avail" -ge 4 ] && break
    sleep 10
  done
  out=$(CARGO_BUILD_JOBS=${JOBS:-3} scripts/build-web.sh --single-file --scene surgery/title --title "Trauma Tempo" --description "Eight instruments, a failing heart, and a parasite that keeps time: a surgical-action melodrama." --theme-color "#102a2c" --out "$here/../$name.html" 2>&1); code=$?
  if echo "$out" | grep -q "signal: 9\|signal: 15\|SIGKILL\|SIGTERM"; then sleep 30; continue; fi
  echo "$out" | grep -vE "^\s*(Compiling|Finished|Downloaded|Downloading|Blocking)" | cut -c1-400 | tail -15
  exit $code
done
echo "gave up"; exit 1
