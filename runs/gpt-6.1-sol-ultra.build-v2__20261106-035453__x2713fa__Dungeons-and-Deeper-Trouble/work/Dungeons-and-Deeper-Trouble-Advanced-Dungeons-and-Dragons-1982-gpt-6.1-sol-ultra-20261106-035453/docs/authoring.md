# Authoring another passage

The entire expedition is authored in `src/content/campaign.js`. Engine code has no room names or encounter coordinates. The `compile` helper rasterizes explicit room rectangles and axial corridors into one map; it does not generate a random maze. Geometry supplied to the renderer is exactly the geometry used by collision, visibility and acoustics.

Run `node scripts/validate-content.mjs` before rebuilding; `npm test` additionally plays the full expedition and exercises all systemic rules. A valid content edit must preserve the tool chain, a free and reachable arrow supply before every mandatory guardian, a safe section spawn and a tool-gated ladder exit. The content version is `dt-expedition-1.0.0`; change it deliberately when old saves no longer describe the campaign.

## Units and schema

A floor cell is 16 world units. Designer room/corridor/track coordinates are cells; `enemy`, `pickup` and `prop` helpers turn their cell positions into world centers. Explicit bank endpoints are authored in cell-edge coordinates and compiled into world units. Every stable ID must be unique across the whole campaign. Prop IDs automatically get their section prefix.

A section definition supplies:

- `id`, `name`, `subtitle`, `width`, `height`, `spawnCell`, `exitCell`, `entrance`.
- `rooms:[{id,name,x,y,w,h,purpose,tip}]`; each is a real decision, lesson, encounter or reward, not a counted empty rectangle.
- `links:[{points:[[x0,y0],[x1,y1]],width?:3}]`; axial, explicit and connected to the room interiors.
- `enemies:[{id,kind,x,y,...}]`; creature definitions in `creatures` provide durability, hearing, cue, speed, windup, active/recovery timings and readable caption.
- `pickups:[{id,kind,x,y,count,guard?,stash?}]`; supplies keep unclaimed overflow. A guard uses a stable enemy ID. Spider stashes need no damaging shot to access.
- `banks:[{id,a:[cellX,cellY],b:[cellX,cellY],lesson?}]`; both arrow and actor collision use these segments. A 45-degree bevel permits a readable 90-degree bank.
- `props` and `tracks`; these decorate the same world while clues remain visible without hearing audio.
- `anchors`, `exitGuard`, `reward` and optional `next`; guaranteed-solvable restart snapshots are committed on entry, before carrying/consuming supplies. `next:'rime'` commits the second guardian wing independently.
- Optional `gates:[{id,cx,cy,w,h,requires,reason}]`; an unresolved flag blocks collision/navigation/acoustics. Root's bank-shot bridge uses this pattern.

## A real optional chamber

The shipped `chalk-cairn` / **The Unmarked Cairn** is a worked expansion: a designer-authored chamber at `[51,23,11,10]`, connected to the main route with `[[46,27],[51,27]]`, containing a heart, an optional silver feather, an old journal line, bones and a distinct purpose. It is part of the full replay evidence, not an unused example.

```js
// Add a small optional room beyond an existing junction; IDs stay stable.
room('chalk-cairn','The Unmarked Cairn',51,23,11,10,
  'Optional heart and recovered expedition journal.',
  'Someone left the heavy things and carried on. Their arrows are still sound.');
// In links: {points:[[46,27],[51,27]]}
// In pickups: pickup('chalk-cairn-heart','heart',56,28)
// In pickups: pickup('chalk-cairn-treasure','treasure',57,27)
// In props: prop('bones',54,26)
```

To move a guard, change only its helper coordinates and run validation. To retune its cue, change the relevant `creatures` record's hearing/caption/windup. To add an encounter, choose an existing creature kind and a new stable ID, place a supply margin on its reachable approach, and update the command director's optional route only if it must demonstrate new critical content. New room tips and captions are original writing; source text is not copied.

## Validation and balance evidence

The validator checks global IDs, passable entity/prop spawns, room purpose, all-section floor connectivity, spawn/ladder validity, map-graph reachability, and arrow supply vs authored damage budget. The 52-case simulation suite checks tool-order reachability, bank gate state, no abandoned required item, free supplies at the between-guardian checkpoint, whole-section rollback, atomic pickup and reserves, and all enemy/guardian behaviors. `reports/simulation-tests.json` records the real standard-rules complete playthrough and its maximum serialized snapshot size.

First-play duration is a design target, not a verified human timing. The director uses perfect map knowledge, sprints, preselected shot angles and deterministic tactical evasion, and completes in about 141 simulation seconds. It is evidence of correctness and a fast replay, not a claim that an unfamiliar player will finish that quickly or that 18–25 minutes has been human certified.
