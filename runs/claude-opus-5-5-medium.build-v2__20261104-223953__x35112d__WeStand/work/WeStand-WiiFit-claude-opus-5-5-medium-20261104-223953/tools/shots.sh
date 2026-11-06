#!/usr/bin/env bash
# Screenshots for what scripts cannot judge: one frame per screen, with the bot playing. Usage: shots.sh [width height] [names...]
cd "$(dirname "$0")/../engine"
out=../notes/cap; mkdir -p $out
w=${W:-1280}; h=${H:-720}
shot() { # name scene ticks
  printf 'load scene=%s\nplay bot=true ticks=%s\ncapture width=%s height=%s out=%s/%s.png\n' "$2" "$3" "$w" "$h" "$out" "$1" | ./target/debug/pav repl >/dev/null 2>&1
}
for spec in "$@"; do
  IFS=: read -r name scene ticks <<< "$spec"
  shot "$name" "$scene" "$ticks"
done
