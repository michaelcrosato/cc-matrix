# Making more of this game

Everything a designer touches is a text file in this folder. Running from the repository root,
`pav` and the window read these files at each load (dev mode has **Reload content**), so edits need
no rebuild. A new file also needs one line in `content.rs`'s `FILES`, so it is embedded for the
browser; a test fails if you forget.

Check your work: `pav case_check` lints everything (every error names the file and line),
`pav case_check path=<file>` parses one, and `pav balance case=<n>` runs the bot over seeds.

## Add a case
Copy `cases/case0.toml`. The top sets the `surgeon` (`mara`, `pet`, `both`), `plate`, the eight
instruments of the `ring` (clockwise from up), `timer` in seconds, `par` (the score ranks are
percentages of: take it from `pav balance`), the patient's chart and `fate` lines, and the `before`
and `after` story scenes. `guided = true` highlights targets; `gift = true` wakes the gift at once.

Each `[[phase]]` has an `objective` (the NOW line), `checkpoint = true` if a death retries from here,
`plate` to cross-fade to, `meter` for the monitor, a `strain`, a list of `[[phase.spawn]]` and a list of
`[[phase.event]]`. A phase ends when every required hazard and the strain are gone.

`drain` scales how fast this case's hazards cost vitals. A hazard with `required = false` isn't on the
chart: it doesn't hold the phase open, and clearing it pays a quarter of the points and builds no chain,
the same as a dose of the IV. Otherwise a slower player would have more to score. After changing a case,
run `pav balance` for its suggested `par`, and `cargo test -p pav_core --test surgery difficulty_table
-- --ignored --nocapture` for wins and times at each difficulty.

- Spawn kinds: `incision laceration pool bleeder foreign polyp tumor burn bone nodule sac crown eye ember
  tether tendril closure furnace`. Lines take `pts`, things take `at`, `r`, `axis` (degrees, the pull),
  `tag` (`hook shard splinter ember cyst inflammation seed`), `hidden = true` (needs the Scanner),
  `optional = true` (doesn't hold the phase up). A `bone` has `to` (its home) and `angle` (how it starts).
- Triggers on an event: `at_time`, `vitals_below`, `on_beat`, `remaining` (tasks left), `on_clear`.
- What it does: `spawn`, `say = [speaker, line]`, `cue`, `banner`, `code = true` (a scripted stop),
  `shake`, `plate`, `gift = true`, `vitals`, `push` (camera).

Add the case to the campaign by numbering it next and raising `CASES` in `content.rs`.

## Add a strain
A strain is a state machine in `strain/<name>.rs` with its numbers in data
(`strain = { kind = "...", waves = 3, count = 6, beats = 12, ... }`). Implement start, tick and killed, add
it to `StrainKind` in `strain/mod.rs`, and teach the bot if it needs a new gesture (`bot.rs`).

## Add a line of dialogue
Story files are `[[line]]` lists: `who`, `expr`, `text`, plus stage commands on the same or their own line:
`set`, `enter` with `at` (`left right centre farleft farright`), `exit` (a name, or `all`), `music` (`tender`
`tense` `title`), `cue`, `camera` (`paper`, `or`), `flash`, `shake`. Write it deadly serious. In-op callouts are in
`callouts.toml` by trigger; `nurse` means whoever is calling the operation.

## Add a character
Copy `rigs/mara.toml`. `pitch`, `wave`, `pace` and `jitter` are the voice. `palette` names the colours. Each
`[[part]]` is a closed outline, layered by `z` (back hair 0, shoulders 1, face 3, eyes 3.6 to 4.4, front hair
5), with `chaikin` rounding, `mirror`, a `role` (`brow lid eye iris pupil hair head`) and `spring` for hair.
Every character needs the four expressions `neutral alarmed stern soft`: brow moves, lids, irises, and
the mouth's `closed` and `open` shapes. `pav case_check` says what's missing.

## Add a plate or a set
A plate (`plates/*.toml`) is `lobes` (`x, z, a, b, h`: ellipses of tissue), a palette, `pulse` and `breathe`,
`veins`, `vessels` and `ridges` as polylines. A set (`sets/*.toml`) is cards: `[[layer]]` with `z` behind the
stage, `color`, `points`, `chaikin`, `emissive`, `monitor = true` for a live trace, `repeat = [count, spacing]`, and
`rain = true`.
