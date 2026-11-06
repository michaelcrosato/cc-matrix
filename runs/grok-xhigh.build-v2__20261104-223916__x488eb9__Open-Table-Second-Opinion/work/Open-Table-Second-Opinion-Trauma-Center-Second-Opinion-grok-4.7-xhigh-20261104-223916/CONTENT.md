# Adding content

The operation sim in `src/core/sim.js` does not need an edit to add a case, a strain you already have, a site, a character, or a story node. Put the new data in `src/data/content.js` and, for a new portrait, `src/art/field.js`.

## A case

Add an object to `CASES` and its id to `ORDER`.

- `id`, `name`, `patient`, `chapter`, `doctor` (`vale`, `sokolova`, or `both`), `site`, `clock`, `vitals`, `drain`, `par`, `brief`.
- `phases`: a list of `{ name, objects, strain, strainOpts, flags, at, tutorial, dim, tilt, device }`.
- An object is a plain spec. `addObj` fills `origin`, `axis`, `depth`, stitch `pairs`, salve `cells`, and a mass `guide`. Set `order` so a pool is cleared before the thing under it. `needsWindow` waits for the retractor. `hidden` waits for sonar.
- `at` entries are `{ t, do }` and fire from `runScript` names that already exist (`lurch`, `look`, `breath`, and the rest in the sim). A new verb is the one change that touches the sim.
- A second-opinion film is a `LIGHT[id]` entry `{ mark: [x, y], text, right, wrong }` in field pixels. The story node sends the player there with `{ event: 'op', caseId, wait: true }` only after a chart scene; cases without a `LIGHT` entry go straight to the operation.

`par` is the score a clean run should beat by about five percent for an S. Rank is score/par: S at 95%, A at 80%, B at 60%, C at 40%.

## A strain

The six strains are `staccato`, `legato`, `tremolo`, `dacapo`, `fermata`, and `cantor`. Put `strain: 'legato'` (and `strainOpts`) on a phase. `spawnStrain` builds the organs. A new kind of parasite means a new branch in `spawnStrain` and `stepStrain`. Tuning that already exists is `strains.speed`, `health`, `spawn`, `damage`, and `beat` in `src/config.js`.

## A site

`site` on the case is a name `fieldFor` already paints: `forearm`, `abdomen`, `flank`, `heart`, `brain`, `implant`, `mediastinum`, `ship`. A new site is a new branch in `TissueField` in `src/art/field.js`. The sim only stores the name.

## A character

Add an id to `CAST` with `name`, `role`, and `hue`. Add the same id to `PEOPLE` with `lines` for the ward. `EXPR` can add a face. The story `who` field uses that id. Busts are drawn by `GAME.Art.bust`. The ward shows a saved patient when their id is in `WARD[chapter]` and in the save.

## A story node

`NODES` is a map of id to a list of steps.

- A line is `{ who, say, expr }`.
- A choice is `{ who, say, choices: [{ text, goto }] }`. Skip does not pick one.
- `{ event: 'op', caseId, wait: true }` then `{ goto: 'cN_out' }` runs the operation and resumes on the way out.
- `{ event: 'ward', chapter, wait: true }` opens the walkable ward.
- `{ event: 'credits', wait: true }` opens the credits. The last page resumes the story.
- `{ end: true }` returns to the title.

Wire the first node from `start`, or from the previous node's `goto`. The sim is not involved.
