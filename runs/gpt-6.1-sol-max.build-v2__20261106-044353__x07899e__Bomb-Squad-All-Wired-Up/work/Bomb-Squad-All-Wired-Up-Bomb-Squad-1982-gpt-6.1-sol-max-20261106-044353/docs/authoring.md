# Authoring a board or dispatch

Open Pause → Developer tools → Board / case authoring. The editor always copies an authored relay template into scratch memory. Campaign definitions and ordinary records are protected.

1. Select a component with **Next component**, or **Add component**. Set X/Y and the left/right terminal offsets using the native controller-readable sliders. A socket and its terminals must fit the PCB; overlapping sockets are rejected.
2. Rotate its shape or color pattern. **Toggle job in order** removes an existing job or appends the selected component to the ordered repair list.
3. Select the board's shape or color rule. **Rebuild unambiguous spare tray** supplies exactly one compatible spare identity per job, with quantities when jobs share an identity. Incorrect installations can always be removed; dropped parts return to reusable stock.
4. Select cells 0–19 and paint/erase the evidence mask. A cell is an index into the game's exact 4×5 digit glyph, row-major. Truth is derived from the chosen case code, never painted as an arbitrary answer. **Fill complete evidence stencil** makes a self-contained practice board. In a multi-board case, smaller packs combine to establish certainty.
5. Set the scratch case fuse. **Validate scratch board** checks references, distinct order, reachable anchors, stock quantities and unambiguous replacements. Resolve every diagnostic before export or playtest.
6. **Export JSON** exposes the exact versioned JSON and offers a download. **Import JSON** accepts that format, validates it, and reports errors without replacing the good scratch model. **Playtest scratch copy** uses the real simulation and normal input, labels the result developer modified, and excludes it from ordinary records.

The browser acceptance adds C5 at (134,130), adds it to the order, rebuilds stock, fills all stencil cells, exports/imports version 1, and disposes the resulting device with ordinary controls. The roundtrip and successful scratch disposal are recorded in the authoring browser evidence.

## Content schema

Exports have `format: "wired-board"`, `version: 1`, `case: {name,duration,digits}` and `board`. Board IDs, component IDs, terminal offsets, order, rule, stock IDs/quantities and mask indices remain stable across authoring, networking and tests. Use `Wired.validateBoard(board)` for a reusable pack and `Wired.validateCase(state)` to prove the combined case has a unique solution for every digit.

To add a campaign dispatch, add a definition to `Wired.CASES` in `src/content.js`: ID, number, title/site/theme, digit and board counts, four party-size timer values, job count, brief, field lesson, taunt, success/failure and ending. The generator instantiates valid board templates and seeded spare arrangements from those fields. Board count must be divisible by digit count. Give a new theme a native landmark in `src/art.js`, or reuse quay, relay, or central dressing. Run `node tools/verify.mjs sim engine` after editing data; full acceptance is `node tools/verify.mjs`.

## Tuning semantics

Pause → Developer tools → Live tuning sliders. A changed value cancels current holds safely and marks the run modified. Recovery window changes apply to new faults; existing fault deadlines persist. Solder safe-band, heat, cooling, penalty and extinguish values apply immediately. New-case fuse multiplier applies to subsequent starts; simulation speed applies now. The precision slider adjusts the slowed tool motion, and hint delay controls repeat coaching. **Reset authored defaults** restores the entire tuning group coherently. Hub gameplay controls are disabled; standalone host tuning is authoritative and replicated.
