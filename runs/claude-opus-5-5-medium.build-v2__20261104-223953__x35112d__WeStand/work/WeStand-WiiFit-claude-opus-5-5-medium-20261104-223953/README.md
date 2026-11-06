# We Stand: dev folder

A balance-and-wellness comedy on a resort of talking gym equipment, built on the Pavilion engine.
The plan is `../PLAN.md`; decisions it left open are in `notes/decisions.md`.

- `engine/`: the engine with the game in it. The game is `crates/pav_core/src/games/fit/`.
- `tools/`: `build.sh` makes the single HTML; `gen_props.py`, `gen_sets.py` and `gen_clips.py` first drew the props, set maps and hand-keyed clips (their outputs are plain data, editable by hand); `make_page.py` and `page.template.html` make the page; `shots.sh` takes screenshots.
- `tests/`: `tests/run.sh [core|browser|hub|all]` prints failures and one line of counts. `tests/dev/` holds the screen tours and timing probes.
- `hub/`: the AI Hub client and harness, as downloaded.

## Numbers and words, with no rebuild
Run the tools from `engine/`, and these are read from disk at each `load`: `games/fit/rules.toml` (every balance number; ranges and help in `rules.rs`, which also makes Dev Mode's sliders), `games/fit/charts.toml`, `games/fit/sets/*.toml`. `script.toml` holds every word and is read once per run. In the game, Pause > Dev Mode has live sliders, jumps, cheats and time controls.

```
cd engine
cargo build --locked -p pav_tools --bin pav
./target/debug/pav capture scene=fit/event/tide ticks=120 width=1280 height=720 out=out.png
printf 'load scene=fit\nplay bot=true ticks=6000\ncapture out=out.png\n' | ./target/debug/pav repl
```
Doors for tools and tests: `fit`, `fit/medley`, `fit/event/<name>`, `fit/stand`, `fit/stand/<phase>`, `fit/day/<n>`, `fit/free`, `fit/credits`.

## Add an event
1. A file in `games/fit/events/`: a state struct with `start`, `tick`, `bot`, `hud`, `score`. `breath.rs` is the shortest pattern.
2. A line in `EvKind` and in the `Ev`, `each!` and `ALL_EVENTS` lists in `events/mod.rs` (its key, name, day, set, lane).
3. A group of numbers in `rules.rs` (`group!`), added to `Rules` and `GROUPS`.
4. A goal and how-to in `run.rs`, and a mat: a `MATS` entry in `tools/gen_sets.py` (or a `mat_<key>` spot and object by hand in `sets/hub.toml`).
5. `tests/fit.rs` then checks it by itself: the bot must earn 2 stars, idling under 1. Add it to `ATTRACT` to show it in the demo.

## Add a set
A room file in `games/fit/sets/`, with a `[game] spots` table of named places and the `[view]` recipe (see any set). Add it to `SETS` in `mod.rs` and give it a number in `events/mod.rs`. Set origins are placed in code, 400 m apart: write coordinates from the map's corner.

## Add a song
A `const Song` in `pav_audio/src/music.rs`: BPM, steps per beat, chord roots per bar, and tracks of a patch and a pattern (semitones above the chord root, `R` for a rest). Give it a number in `song()` and `SONG_IDS`. `SimEvent::Music { song }` plays it. Sounds are the same idea in `fit_sfx`, by number in `games/fit/mod.rs`.

## Add words, a clip or a prop
Words: `script.toml`. A line may begin `Speaker: `. Clips: `anim/fit.json` (`anim_reload` and `animsheet` in `pav repl` show them with no rebuild). Props: format-2 JSON in `assets/props/lib/core/`; rebuild `pav` to see a new one.
