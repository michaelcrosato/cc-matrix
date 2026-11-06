#!/usr/bin/env bash
# Builds the single page, waiting for memory: other agents share this machine and the OOM killer
# ends big compiles. Output: tests/out/game.html
cd "$(dirname "$0")/../engine" || exit 1
mkdir -p ../tests/out
for try in 1 2 3 4 5 6 7 8 9 10 11 12; do
  # Wait for 3.5 GB available.
  for i in $(seq 1 120); do
    avail=$(free -m | awk 'NR==2{print $7}')
    [ "$avail" -gt 3500 ] && break
    sleep 5
  done
  if CARGO_BUILD_JOBS=4 scripts/build-web.sh --single-file --scene surgery/title --title "Diorama Center: Second Opinion" --description "You are the hands: a surgical action melodrama." --theme-color "#0a1a1e" --out ../tests/out/game.html > ../tests/out/build.log 2>&1; then
    echo "built on try $try"
    tail -1 ../tests/out/build.log | grep -oE "game.html: .*"
    exit 0
  fi
  if grep -qE "^error\[|^error: (expected|cannot|no )" ../tests/out/build.log; then
    grep -E "^error" -A6 ../tests/out/build.log | cut -c1-200 | head -40
    exit 2
  fi
  echo "try $try killed; waiting"
  sleep 20
done
exit 3
