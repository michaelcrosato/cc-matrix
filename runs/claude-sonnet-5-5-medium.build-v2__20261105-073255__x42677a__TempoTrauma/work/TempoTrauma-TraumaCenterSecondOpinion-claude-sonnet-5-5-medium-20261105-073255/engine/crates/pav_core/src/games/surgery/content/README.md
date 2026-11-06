# Designer guide: Tempo Trauma content

Everything a designer changes is text. Run from the repository root and `pav` reads these files at each
`load` (edit, then `pav play scene=surgery/case/3 bot=true`): no rebuild. The browser build embeds them.
Errors name the file (and the case and phase). Check with `pav case_check` or `cargo test -p pav_core --test surgery`.

## Add a case
In `cases.toml` add a `[[case]]` (`id`, `name`, `surgeon` = mara | pet | both | team, `plate`, `timer` seconds,
`par` score, `patient`, `dx`, `fate`, `ring` = which of the eight instrument slots are unlocked). Then one
`[[case.phase]]` per stage with `spawn = ["kind x z …"]`. A phase ends when its field is clear. Fields on a phase:
`now` (the objective line), `say` (`"seconds|speaker|text"`), `checkpoint`, `beats` (nodule step), `rings` (heat ring
every N beats), `fever`, `shocks` (scripted Codes), `rhythm` (strokes on the beat), `hush_wake`/`echo_wake` (grant the
gift), `plate_next` (the next tissue plate after the phase), `drop_vitals`.
Then add the case to `STEPS` in `mod.rs` if it joins the campaign, and a story scene in `story.toml`.

## Spawn kinds
`line x z x2 z2` incision (Scalpel) · `lace x z x2 z2` laceration (Suture) · `pool x z r` (Suction) · `bleeder x z`
(Suture, 3 fast crossings) · `hook x z angle [hidden|covered]` (Forceps along the angle) · `polyp x z` (Laser) ·
`tumor x z r` (Scalpel, Forceps, Gel) · `burn x z r` (Gel) · `bone x z angle gx gz` (Forceps + rotate, then Suture) ·
`nodule x z lvl` (Introit: 0 big, 1 half, 2 fast, 3 Amen, 4 pest; `seen` skips the scan) · `sac x z beats` (Lacrimosa) ·
`eye x z` · `ember x z [1 = roams]` (Dies Irae) · `tendril x z` · `dress x z x2 z2` (the closure).
Field: x -9..9, z -4..4.2. Add a kind: `data.rs` (`Kind`, `make`) and the view in `pav_view/src/surgery/mod.rs`.

## Add a strain
A strain is a state machine on a hazard kind: add its stages in `make`, its per-beat behaviour in
`tick_hazards` (`mod.rs`), a bot rule in `bot.rs`, a motif in `pav_audio/src/music.rs`.

## Add a line of dialogue or a character
`story.toml`: `[[scene]] id set music`, then `[[scene.line]] who expr text`. A new character needs a look in
`pav_view/src/surgery/paper.rs` (`look`), a voice in `pav_audio/src/voice.rs`, a colour/name in `pav_ui/src/surgery/shell.rs`.
`level.toml` is the off-stage room the engine needs; `plates.toml` holds the tissue plates and `rigs.toml` the character rigs.
