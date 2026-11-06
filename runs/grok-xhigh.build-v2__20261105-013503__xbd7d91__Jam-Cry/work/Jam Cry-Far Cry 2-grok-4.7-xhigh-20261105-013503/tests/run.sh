#!/usr/bin/env bash
# One test command. Prints failing lines only, then PASS n FAIL f.
set -u
DEV="$(cd "$(dirname "$0")/.." && pwd)"
ENGINE="$DEV/engine"
LOGS="$DEV/test-logs"
mkdir -p "$LOGS"
mode="${1:-all}"
pass=0
fail=0

show_fail() {
  grep -E 'FAILED|^error(\[|:)|panicked at|^FAIL:' "$1" || true
}

take_py() {
  local log="$1"
  show_fail "$log"
  local c f
  c="$(grep -E '^CHECKS ' "$log" | tail -1 | awk '{print $2}')"
  f="$(grep -c '^FAIL:' "$log" || true)"
  [[ -n "$c" ]] || c=0
  pass=$((pass + c - f))
  fail=$((fail + f))
  if [[ "$c" == 0 && "$f" == 0 ]]; then
    echo "FAIL: $log produced no checks"
    fail=$((fail + 1))
  fi
}

take_cargo() {
  local log="$1" expect="$2"
  show_fail "$log"
  if ! grep -q '^test result:' "$log"; then
    echo "FAIL: $expect did not finish"
    fail=$((fail + 1))
    return
  fi
  # Sum every cargo result. Doc-tests often add a 0-passed line after the real suite.
  local p=0 f=0 line np nf
  while IFS= read -r line; do
    np="$(sed -n 's/.* \([0-9][0-9]*\) passed.*/\1/p' <<<"$line")"
    nf="$(sed -n 's/.* \([0-9][0-9]*\) failed.*/\1/p' <<<"$line")"
    p=$((p + ${np:-0}))
    f=$((f + ${nf:-0}))
  done < <(grep '^test result:' "$log")
  if [[ "$p" == 0 ]]; then
    echo "FAIL: $expect ran 0 tests"
    fail=$((fail + 1))
  fi
  pass=$((pass + p))
  fail=$((fail + f))
}

cargo_tests() {
  local log="$1" expect="$2"
  shift 2
  (
    cd "$ENGINE"
    CARGO_BUILD_JOBS=12 CARGO_TARGET_DIR="$ENGINE/target" \
      cargo test --offline --color never "$@"
  ) >"$log" 2>&1 || true
  take_cargo "$log" "$expect"
}

run_sim() {
  cargo_tests "$LOGS/sim-combat.log" "sim-combat" -p pav_core --test merc -- --test-threads=8 \
    look_and_stick_follow_yaw hits_use_zones_and_walls_block \
    jams_match_the_curve_and_a_slap_shortens_the_clear \
    a_worn_gun_breaks_and_a_jammed_soldier_stops fever_pills_blackout_and_healing
  cargo_tests "$LOGS/sim-world.log" "sim-world" -p pav_core --test merc -- --test-threads=8 \
    fire_runs_downwind_and_respects_breaks exposure_smoke_and_noise \
    squad_caps_shooters_and_breaks post_remans_only_when_nobody_is_looking \
    vehicles_climb_break_and_float
  cargo_tests "$LOGS/playthrough.log" "playthrough" -p pav_core --test merc -- --test-threads=8 \
    bot_plays_all_three_endings
}

run_ui() {
  cargo_tests "$LOGS/ui-shell.log" "ui-shell" -p pav_core --test merc -- --test-threads=8 \
    shop_tracker_and_shell fiction_has_no_source_names_and_no_audio_files
  cargo_tests "$LOGS/ui-audio-bus.log" "audio-bus" -p pav_audio -- \
    music_bus_tracks_the_gain gun_families_voices_and_crackle_differ explosion_is_loud_then_silent
  cargo_tests "$LOGS/ui-view.log" "first-person" -p pav_view -- first_person_yaw_zero_faces_north
  local audio="$LOGS/audio-files.log"
  find "$DEV" -type f \( -name '*.wav' -o -name '*.mp3' -o -name '*.ogg' \) ! -path '*/target/*' >"$audio" || true
  if [[ -s "$audio" ]]; then
    echo "FAIL: audio files present"
    cat "$audio"
    fail=$((fail + 1))
  else
    pass=$((pass + 1))
  fi
  # One combined log for the ui/audio group.
  cat "$LOGS/ui-shell.log" "$LOGS/ui-audio-bus.log" "$LOGS/ui-view.log" >"$LOGS/ui-audio.log"
}

run_py() {
  local log="$1"
  shift
  python3 "$@" >"$log" 2>&1 || true
  take_py "$log"
}

run_browser() {
  run_py "$LOGS/launch-a.log" "$DEV/tests/browser.py" launch1
  run_py "$LOGS/launch-b.log" "$DEV/tests/browser.py" launch2
  run_py "$LOGS/hooks.log" "$DEV/tests/browser.py" hooks
  run_py "$LOGS/webkit.log" "$DEV/tests/browser.py" webkit
  run_py "$LOGS/net.log" "$DEV/tests/browser.py" net
  cat "$LOGS/launch-a.log" "$LOGS/launch-b.log" "$LOGS/hooks.log" "$LOGS/webkit.log" "$LOGS/net.log" >"$LOGS/browser.log"
}

run_hub() {
  run_py "$LOGS/hub.log" "$DEV/tests/hub.py"
}

case "$mode" in
  sim) run_sim ;;
  ui|audio) run_ui ;;
  browser) run_browser ;;
  hub) run_hub ;;
  all)
    run_sim
    run_ui
    run_browser
    run_hub
    ;;
  *)
    echo "FAIL: unknown mode $mode"
    fail=$((fail + 1))
    ;;
esac

# Pass count cannot go negative if a script's CHECKS was smaller than FAIL lines.
if [[ "$pass" -lt 0 ]]; then pass=0; fi
echo "PASS $pass FAIL $fail"
[[ "$fail" == 0 ]]
