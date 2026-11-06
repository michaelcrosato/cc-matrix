#!/usr/bin/env bash
# Contact sheets of the events mid-play, from engine/: tools/shots.sh [ticks] [w] [h]
ticks=${1:-600}; w=${2:-640}; h=${3:-360}
mkdir -p out
for e in breath_bloom pose_parade tempo_squats plank_standoff step_party floatie_spin morning_lap tide_table paddle_slalom tray_trek cannonball_cup big_stand; do
  printf 'load scene=fit/event/%s\ninput ticks=20\ninput press=confirm\ninput ticks=190\nplay bot=true ticks=%s\ncapture width=%s height=%s out=out/%s.png\n' "$e" "$ticks" "$w" "$h" "$e" | ./target/debug/pav repl >/dev/null 2>&1
done
cd out
magick \( breath_bloom.png pose_parade.png tempo_squats.png +append \) \( plank_standoff.png step_party.png floatie_spin.png +append \) \( morning_lap.png tide_table.png paddle_slalom.png +append \) \( tray_trek.png cannonball_cup.png big_stand.png +append \) -append sheet.png
