#!/usr/bin/env bash
# Island and stay screens, walked through by keys, from engine/.
mkdir -p out; W=640; H=360
cap() { printf 'capture width=%s height=%s out=out/i_%s.png\n' $W $H "$1"; }
press() { printf 'input press=%s ticks=2\ninput ticks=%s\n' "$1" "${2:-12}"; }
{
  echo "load scene=fit"
  printf 'input ticks=200\n'; cap title
  press confirm; press confirm; press confirm; printf 'input ticks=50\n'; cap look
  press menu_down; press menu_down; press confirm 240
  for i in 1 2 3 4 5 6 7 8 9 10 11 12; do press confirm 30; done; cap morning
  for i in 1 2 3 4 5 6; do press confirm 30; done
  printf 'play bot=true ticks=2100\n'; printf 'input ticks=170\n'; cap report
  press confirm 60; press confirm 60; printf 'input ticks=60\n'
  for i in 1 2 3 4 5 6; do press confirm 40; done; printf 'input ticks=30\n'; cap island
  printf 'input move=[0,-1] ticks=90\n'; cap walk1
  printf 'input move=[-1,-0.6] ticks=130\n'; cap walk2
  press confirm 20; cap sched
  press back 10; press back 10; printf 'input move=[1,1] ticks=120\n'; cap walk3
  press pause 20; press menu_down; press menu_down; press confirm 20; cap calendar
  press confirm 10; press pause 10; printf 'input ticks=4\n'; press wave 60; cap wave
} | ./target/debug/pav repl 2>&1 | grep -iE '"error"|panick' | cut -c1-300
cd out
magick \( i_title.png i_look.png i_morning.png +append \) \( i_report.png i_island.png i_walk1.png +append \) \( i_walk2.png i_sched.png i_walk3.png +append \) \( i_calendar.png i_wave.png +append \) -append sheet_i.png
