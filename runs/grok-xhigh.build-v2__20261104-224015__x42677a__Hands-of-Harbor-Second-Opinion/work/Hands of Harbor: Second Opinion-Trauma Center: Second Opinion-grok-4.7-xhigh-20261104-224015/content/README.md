# Adding a Night Ward case

Cases, lines, and strains are Rust tables the sim reads directly. Edit them and run `tests/run_all.py`. A bad speaker, an empty line, or a banned source name fails `story_lines_are_filled_and_music_defaults_quiet`.

## A case

`engine/crates/pav_core/src/games/surgery/content.rs` holds `CASES`. Each `CaseDef` is a name, a patient, a starting plate, a timer, a par score, opening vitals, and phases.

A phase is a `PhaseDef`: a spawn list, whether it saves a checkpoint, a strain id (`NO_STRAIN` if none), a plate (`KEEP_PLATE` to keep the current one), a callout id, a scripted Code count, a gift bit (`G_HUSH`, `G_ECHO`, `G_DUET`), and the heat flag.

A spawn is `s(kind, x, z, hidden, drain, axis)`. Kinds are the `K_` constants in `kinds.rs` (laceration, pool, bleeder, and the rest of the tray). `x` and `z` are on the plate, about −3 to 3. Hidden spawns stay down until a scanner pass. Drain is how fast an open hazard pulls vitals.

Wire the new case into `CASES` and give it a scene name `surgery/case/N` in `mod.rs` if it should boot on its own. Par is the S-rank line (100%). Ranks sit at 50, 70, 85, 100, and 115 percent of par.

## A strain

Strains are phases inside a case, not a separate file. Set `strain` on the phase to the strain id from `kinds.rs`. The strain runs when that phase becomes current. Parameters that used to be a toml block (length, intensity) are the fields already on `PhaseDef` and the tune sliders in `tune.rs`.

## A line

`story.rs` stores paper-theatre lines as `Line { who, text }`. `block(case_id, after)` returns the lines before a case and the lines after it. Add the strings to the matching `BEFORE_N` or `AFTER_N` list. `who` must be a cast name already used in the file (Mara Quill, Pet Nwosu, Bashir Haddad, Teddy Lark, Ottoline Voss, Cordelia Vane). Keep the text in the Night Ward voice. Do not use Hope Hospital, Caduceus, Stiles, GUILT, or Healing Touch.

## A character

Speaking parts are the `who` strings above. A new speaker is a new name used consistently in `story.rs`, plus a paper rig if they should stand on stage. Rigs are the card builders in the surgery view. Seat colours for the four surgeons are `SEAT_COLOR` in `content.rs`.

## Check

From the dev folder, `python3 tests/run_all.py` prints only failures and `N passed, M failed`. The ignored balance sheet is separate:

`cargo test -p pav_core --test surgery -- --ignored --nocapture balance_sheet`
