# Whiff Fit: how this folder works

A five-day balance comedy at a resort staffed by talking gym equipment, built on the Pavilion
engine (Shardfall, from commit 49ef2ba; `notes/engine.diff` holds the changes to its existing files). `PLAN.md` in the parent folder is the design this was built from.

## Layout
- `engine/`: the engine, with the game in `crates/pav_core/src/games/fit/`:
  - `mod.rs` the `FitGame` state, `flow.rs` what each screen does in a tick, `screens.rs` every menu
    and screen as data, `run.rs` card/3-2-1/play/result, `events/*.rs` one file per event,
    `check.rs` the morning test, `finale.rs` the Big Stand, `medley.rs` the Medley,
    `meta.rs` saves and wardrobe, `intent.rs` input to per-event intent, `attract.rs` attract mode,
    `bot.rs` the bot that plays it all.
  - Data: `rules.toml` (every number), `script.toml` (all the words), `charts.toml` (Step Party),
    `sets/*.toml` (one room per set).
  - `crates/pav_ui/src/fit_ui.rs` draws the UI the sim describes, `glyphs.rs` the button prompts; `crates/pav_audio/src/music.rs` and
    `voice.rs` are the songs and gibberish; `crates/pav_app/src/weblink.rs` joins the game and its page.
- `tools/`: `make_props.py`, `make_sets.py`, `make_clips.py` write the JSON props, TOML sets and
  `anim/fit.json`; `build.sh` builds the one-file page; `tour.py`, `shots.sh` take captures.
- `tests/run.sh [core|browser|hub|all]`: the one test command. Prints failures and a count. `tests/look.py` takes 1080p screenshots of the finished page; `tests/boot_time.py` times the page's boot.
- `hub/`: the AI Hub client and harness, as downloaded.
- `notes/`: decisions, testing feedback, credits, and `plan-audit.md`: the plan section by section, with where each thing is and how it was checked.

Running from `engine/`, `pav` reads `rules.toml`, `script.toml`, `charts.toml` and the sets from
disk at every `load`, so changing them needs no rebuild: `./target/debug/pav play scene=fit bot=true`.
The browser build embeds them. Add `?fast=1` to the page to skip shadows and ripples on software renderers.

## Add an event
1. Copy `events/breath.rs`; give it `start`, `tick` (returns `Some(score)` at the end), `stop`, `hud`, `bot`.
2. Add a line each to `EventKind` (key, name, coach, opening day, set, lane), `ALL`, `EventState` and its `each!` macro, in `events/mod.rs`.
3. Add it to a pavilion in `island.rs`, `card.<key>` lines in `script.toml`, a group in `rules.rs` and `rules.toml`.
4. `tests/fit.rs` then requires its bot to earn 2 stars and idle input to earn none. Add it to `ATTRACT` in `attract.rs`.

## Add a set
Add a function to `tools/make_sets.py` (or write `sets/<name>.toml` by hand: a `stage` marker, `[view]`, objects), add it to `Set` and `SETS` in `world.rs`.

## Add a song
Write a function in `pav_audio/src/music.rs` (tracks of a patch and a pattern of scale degrees over a chord progression), add it to `song()`, a constant in `world.rs`'s `song` module, and play it with `SimEvent::Music`.
