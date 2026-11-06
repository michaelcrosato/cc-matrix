# Wii Fine

A balance-and-wellness comedy on the Pavilion engine (cloned into `engine/`). Five days at Tippy Cay,
a resort staffed by talking gym equipment. Source: Wii Fit (original game, same genre).

```
tests/run.sh [core|browser|hub|all]   one command, prints only failures and a count
tools/build.sh                        exit-interview.json -> about-data, single-file page next to this folder
tools/gen_sets.py, tools/gen_clips.py the first layout of the sets and the hand-keyed clips
notes/                                decisions.md (gaps), feedback.md (testing log)
engine/crates/pav_core/src/games/fit/ the game: mod.rs (flow, save), events.rs (every event and its bot),
                                      core.rs (the Balance Core), check.rs (Morning Wobble Check),
                                      story.rs (Big Stand, Medley, attract, dev mode), screens.rs, run.rs,
                                      rules.toml / script.toml / charts.toml / sets/*.toml (all data)
engine/anim/fit.json                  hand-keyed clips
engine/crates/pav_ui/src/fit_ui.rs    the UI, a pure view of the game's UiFrame (glyphs.rs: button glyphs)
engine/crates/pav_audio/src/fit.rs    sound effects, voices and songs
```

Everything is data you can edit while the game runs from `engine/` (`cargo run -p pav_app -- --scene fit`, or
`pav` for the tools): `rules.toml` (every balance number), `script.toml` (all text), `charts.toml`, `sets/*.toml`.

## Add an event

1. `events.rs`: add a `Kind`, a `Spec` (name, set, coach, camera, day), and arms in `Run::new`, `step`, `score`,
   `bot`, `hud`, `sprites`, `pose` and `prompts`. Write its numbers as a struct in `rules.rs` (they become Dev Mode
   sliders for free) and its text in `script.toml` (`tips.<key>`).
2. Add the kind to `ALL_KINDS`. The Schedule, the Attract list (`story.rs`) and the tests read from it.
3. `tests/fit.rs`: add its key to `KEYS`; the bot must earn 2 stars and idle input under 1.

## Add a set

Write `sets/<name>.toml` (copy one: a `[camera]`, a `[view]`, `[[object]]`s), add it to `SETS` and `set_text` in
`world.rs`, and use its index as `Spec.set`.

## Add a song

`pav_audio/src/fit.rs`: add a `Song` (BPM, steps per beat, chord roots per bar, tracks of tokens) and a line in
`song()`; start it with `SimEvent::Music { song }`.

## Controls

Pad (DualSense standard mapping): stick leans/walks, Cross acts, L1/L2 left step, R1/R2 right step, Square waves,
Triangle schedule, Options pauses. Keyboard: WASD or arrows, Space, Q/E, F, Tab, Esc, Shift jogs/fine lean.
Mouse: cursor offset is the lean in events; click places and acts. Glyphs follow the device used last.
