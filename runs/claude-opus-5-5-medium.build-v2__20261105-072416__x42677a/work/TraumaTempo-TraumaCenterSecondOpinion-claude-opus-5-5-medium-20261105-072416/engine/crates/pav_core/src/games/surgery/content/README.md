# Making more of the game: the designer guide

Everything here is a text file. Native builds read them from disk: edit, reload the case (or use
the dev panel's *Reload content*), no rebuild. `pav case_check path=<file>` checks one file and names
the line of any error; `cargo test -p pav_core --test surgery` lints all of them. **A new file must
also be listed in `FILES` in `../content.rs`**; a test fails if one is missing.

## Add a case
Copy `cases/case0.toml`, list it in `FILES`, and give it a slot in `load()`.
- `surgeon`, `plate`, `timer` (s), `par` (the score for rank S; `pav balance` suggests one), `patient`, `life`,
  `diagnosis`, `fate` (the line on the results screen), `before`/`after` (story scene ids), `gift`
  (`none`, `hush`, `echo`, `duet`), `gift_locked`, `music`, `ring` (8 instruments, clockwise from up).
- Each `[[phase]]`: `now` (the NOW line), `guide` (highlights targets), `checkpoint` (retry here), `spawn`, `say`
  (`{who, text, at}`), `strain` + `params`, `meter` (ECG beats to the bar), `reveal_plate` (crossfades from the cut),
  `code_shocks` (a scripted stop), `banner`, `linger`.
- A phase ends when its blocking hazards and strain are done. `[[phase.trigger]]` adds a twist: `at_time`,
  `vitals_below`, `on_clear`, `on_beat`, then `spawn`, `say`, `cue`, `banner`, `gift_full`, `vitals_hit`.
- Spawn kinds: `incision` (a b c) · `closure` · `lacer` (a b) · `bleeder` (a ang) · `pool` (a r) · `object` (a ang sub:
  0 hook 1 shard 2 splinter; `hidden`) · `polyp` · `tumor` (a r ang) · `patch` · `burn` · `bone` (a b ang). `optional = true`
  doesn't hold the phase open. x runs -9..9 and z -4..4.2; angles are degrees.

## Add a strain
A strain is a state machine in `../strain.rs`: add a `StrainKind`, a `start_strain` arm and a tick. It reads the heart's
`r_wave` and spends `beat_worth` per beat, so its speed-up is clamped for you. Teach the bot (`../bot.rs`), then add
the name to `STRAINS` in `content.rs` and to `cover.rs`.

## Add a line of dialogue
In `story/*.toml`, a scene is a list of `line`s, played in order: `{ who, expr, text }`, or a stage command
`set`, `enter` + `x`, `exit`, `music`, `cue`, `camera` (`paper`, `or_wide`), `flash`, `shake`. Commands can share a line
with text. `who = "narrator"` is a caption with no speaker. In-op barks live in `callouts.toml`.

## Add a character
Copy `rigs/bashir.toml`. `[colors]` names colours for the shared parts in `_face.toml` (`skin shade blush scrubs iris
brow`). `[[part]]` adds hair and accessories: `z` is the layer (a new layer draws an ink line), `points` a closed outline, `chaikin`
how many times to round it, `layer` what moves it (`head`, `hair`, `eyes`, `brow`, `lid`). `[expr.*]` needs at least `neutral`,
`alarmed`, `stern`, `soft`. `[voice]` sets the gibberish: `base` pitch, `wave`, `speed`, `jitter`, `bright`.

## Add a plate or set
`plates/*.toml`: `lobes` (ellipses raising the tissue), `vessels`, four colours, `pulse`, `noise`, `veins`, `bone`.
`sets/*.toml`: `card`s (`rect` or `points`, `z` for parallax, `emissive`, `blink`), `rain`, `lamp`, `back`.
