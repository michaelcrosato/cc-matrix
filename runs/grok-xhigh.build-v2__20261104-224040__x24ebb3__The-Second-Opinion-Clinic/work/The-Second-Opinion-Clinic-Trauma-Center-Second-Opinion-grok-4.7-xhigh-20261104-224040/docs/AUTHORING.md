# Authoring The Second Opinion Clinic

The operation sim is plain data. A new case is an object in `src/content/ops.js`. A new scene is an object in `src/content/story.js`. The bot plays any entity `toolFor` understands, so a case does not need its own script.

## Add an operation

Push an object onto `OPS` in `src/content/ops.js`.

- `id` is a short key (`op11`). `n` is its story number. `title`, `patient`, `age`, `job`, `hook`, and `objective` are the briefing lines.
- `arena` is one of `forearm`, `stomach`, `ferry`, `bone`, `liver`, `kidney`, `lung`, `heart`, `chest`, `spine`. The view colours that name.
- `time` is seconds. `vitals` is `{ start, drain }` or `start` as an array when there are several tables. `doses` is the syringe count.
- `tools` lists the tools this case unlocks. The eight hand tools are scalpel, forceps, suture, drain, syringe, gel, laser, and scanner. Dressing is a close-up tool the sim already knows.
- `gifts` is `quiet`, `look`, or both. Leave it empty when the case unlocks a gift on a stage instead.
- `par` is the skill-1 bot score on seed 1. Measure it with `node tests/run.mjs cal` and paste that integer. Do not lower it to make a rank easier.
- `stages` is an array. Each stage has `say` (one HUD line) and `spawn` (entity specs). Optional `strain` starts a named strain. Optional `codeblue` or `massage` runs that beat. A stage clears when its required entities are done, or when the strain says so.
- Entity specs are `{ id, kind, x, z, ... }`. Kinds include pool, hook, wound, gel, polyp, cyst, fragment, plate, eye, tumor, core, pore, magnet, and dressing. `hidden` and `hiddenBy` keep a piece under another. `table` sends it to another table.
- `follow` and `reyes` are rank lines: `{ S, A, B, C }`.
- Couch seats come from the Consult screen. Set `partner: true` only when a second surgeon is part of the case.

Run `node tests/run.mjs sim` after the new case. Idle input must lose. The skill-0.7 bot must clear it.

## Add a scene

Push an object onto `SCENES` in `src/content/story.js`, in play order.

- `id` is a short key. `set` is the room name the busts stand in. `title` is the heading.
- `op` is an operation id, or omit it for a scene that ends the night.
- `lines` is 8 to 16 rows. Each row is `{ who, say }`. `who` is a cast id. `say` is one line, at most 57 characters, using only letters, digits, and `. , : ; ! ? - + % / ( ) [ ] ' " # & * = < >`. The HUD uppercases it. Write `...` with three dots.

The campaign runner walks `SCENES` from first to last and writes the save.

## Add a strain

Add a branch in `src/sim/strains.js`.

- `startStrain(sim, name)` spawns the strain's pieces and sets `sim.strain`.
- `tickStrains(sim, dt)` moves it. Call the existing note helpers (`noteEyeLaser`, `noteSob`, `notePlate`) from the tool that hits the piece.
- A stage lists `strain: 'your-name'`. The stage clears when `sim.flags.strainDead` is set.
- Keep the strain's numbers in `src/core/config.js` (`strainSpeed`, `strainHp`) so Dev Mode can slide them.

## Add a character

Add a key to `CAST` in `src/content/story.js`.

- `name` and `role` are the HUD label. `color` is the bust colour (`#rrggbb`).
- `pitch` is the voice multiplier (1 is normal). `speed` and `timbre` are there for the syllable renderer.
- Scene lines use the key as `who`. The bust list in `src/view/stage.js` draws a primitive for each id you add there.

## Dev Mode

Pause during an operation, then Dev mode. Balance lists every key in `DEFAULTS`. Left and right nudge the focused value. Reset copies the defaults back. Cheats, Jump, and Actions call `devCheat`. Copy op JSON prints the current case on the console.

## Tests

From this folder:

```
node tests/run.mjs
```

Prints only failures and one count line. Exit 0 when nothing failed.

| Filter | What it runs |
| --- | --- |
| sim | Tool rules, gifts, rank, sliders, codec, determinism, balance |
| content | Story length, About fields, banned strings, campaign save |
| audio | One voice and one effect, and every song parses |
| browser | Pad stand-in, keys, mouse, attract, touch gate, dev sliders |
| launch | Two file boots, fresh-profile music, aimed tool |
| hub | Five shared-world harness URLs |
| cal | Print Resident bot scores. Not part of the default |
| all | Every filter except cal |

The default, with no argument, is sim + content + audio.
