# Wobble Wit

A five-day wellness comedy at Tippy Cay. Open the HTML in the parent folder in a WebGPU-capable browser. Everything needed to play is embedded; no server or downloads are needed. A controller or keyboard is required. Touch-only devices show the demonstration and Settings.

- Lean / walk: left stick, WASD, arrows, or mouse. Shift makes keyboard lean finer.
- Action: Cross / A, Space, Enter, or left click.
- Left / right steps: shoulders or triggers, Q / E, or left / right mouse buttons. Hold both to brace.
- Schedule: Triangle / Y or Tab. Pause: Options / Menu or Esc. F11: fullscreen.
- Menus: D-pad / stick / arrows / WASD; hover and click also work. Q / E change dev tabs.

Begin a New Stay, choose one of four guest cards, a preset name and a look. Pip's morning check gives your Balance Age. Visit activity mats or fast-travel through the Schedule. Bank enough resort minutes, then end the day at your cabana. New pavilions open each day. The day-five Big Stand ends with thirty seconds of doing nothing. Both endings unlock Free Play.

Play Together supports 2–4 guests taking turns on one pad through the three-event lagoon medley. AI Hub ghost sessions use its unmodified 1.4.0 client and the same activity code. The session host handles the card, clock and results.

## Build and verify

`tools/build.sh` creates the exact single-file deliverable in the parent folder and imports `../exit-interview.json` into its editable plain-text About data.

`tests/run.sh [core|browser|hub|all]` reports failures and one count. Core tests cover the complete five-day bot run on three seeds, every activity against idle/careless input on five seeds, input/spring behavior, saves/snapshots/replay, pause, dev tuning, attract and a four-guest medley. Browser checks use keyboard/mouse, a standard pad stub, generated audio buffers and touch profiles. Hub tests use one local server on an OS-selected loopback port, shut down by PID when done. WebKit checks the unsupported-WebGPU message; it is not real iOS Safari.

The dev menu is in Pause. It includes activity/day/finale jumps, bot/no-tip cheats, minutes/unlocks, time controls, live difficulty sliders and diagnostics. It is disabled in online sessions.

## Extend the resort

- Rules are `engine/crates/pav_core/src/games/fit/rules.toml`. They hot-load in native tools.
- Activities live in `events/mod.rs`, enumerated once in `ROSTER`. Add a Kind, rules, bot, goal and scene index to add an event.
- Native set files are `fit/sets/*.toml`, placed in one Sim, 200 metres apart. Add the file to `world::SETS` to add a set.
- Original named-part props are `engine/assets/props/lib/core/fit_*.json`; `tools/make-art.py` records their readable construction and set layouts.
- Motion poses are `engine/anim/fit.json`. `tools/make-text-motion.py` records the authored source keys.
- Coach dialogue and award titles are `fit/script.toml`. Rhythm notes are `fit/charts.toml`.
- Add music arrangements to `pav_audio/src/music.rs`. Tracks use the synth's sample clock and independent music/SFX/voice gains. Gibberish voices and the 32-effect bank are in `voice.rs`.
- `pav_ui/src/fit_ui.rs` is the same pure painter in native captures and the browser. FitGame owns every menu and focus value.

Art and original FIT clips are CC0. Font and motion-library credits are in the About screen and the engine's `store/CREDITS.md`. Source inspiration: Wii Fit; all resort characters, props, writing and arrangements are original.
