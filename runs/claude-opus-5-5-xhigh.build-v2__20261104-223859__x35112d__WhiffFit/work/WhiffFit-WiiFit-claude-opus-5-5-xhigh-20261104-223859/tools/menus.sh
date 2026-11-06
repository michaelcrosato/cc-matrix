#!/usr/bin/env bash
# A contact sheet of the flow's screens, walked through by keys, from engine/.
mkdir -p out; W=640; H=360
cap() { printf 'capture width=%s height=%s out=out/m_%s.png\n' $W $H "$1"; }
press() { printf 'input press=%s ticks=2\ninput ticks=%s\n' "$1" "${2:-12}"; }
{
  echo "load scene=fit"
  printf 'input ticks=30\n'; cap title
  press confirm; press confirm; cap names
  press confirm; printf 'input ticks=60\n'; cap look
  press menu_down; press menu_down; press confirm 240; cap intro
  for i in 1 2 3 4 5 6 7 8 9 10 11 12; do press confirm 30; done; cap morning
  for i in 1 2 3 4 5 6; do press confirm 30; done; printf 'input ticks=120\n'; cap check
  printf 'input ticks=500\n'; cap check2
  printf 'play bot=true ticks=1400\n'; printf 'input ticks=60\n'; cap report
  press confirm 60; press confirm 60; press confirm 60;  printf 'input ticks=30\n'; cap island0
  for i in 1 2 3; do press confirm 40; done; printf 'input ticks=40\n'; cap island
  press schedule 20; cap schedule
  press confirm 20; cap events
  press pause 20; cap pause
  press menu_down; press menu_down; press confirm 20; cap calendar
  press back 12; press menu_down; press menu_down; press confirm 20; cap settings
  press back 12; press menu_down; press confirm 20; cap howto
  press back 12; press menu_down; press confirm 20; cap about
  press back 12; press menu_down; press confirm 20; cap dev
  press tab_r 10; cap dev2; press tab_r 10; press tab_r 10; cap dev3
} | ./target/debug/pav repl 2>&1 | grep -iE '"error"|panick' | cut -c1-300
cd out
magick \( m_title.png m_names.png m_look.png +append \) \( m_intro.png m_morning.png m_check.png +append \) \( m_check2.png m_report.png m_island.png +append \) \( m_schedule.png m_events.png m_pause.png +append \) \( m_calendar.png m_settings.png m_howto.png +append \) \( m_about.png m_dev.png m_dev3.png +append \) -append sheet_m.png
