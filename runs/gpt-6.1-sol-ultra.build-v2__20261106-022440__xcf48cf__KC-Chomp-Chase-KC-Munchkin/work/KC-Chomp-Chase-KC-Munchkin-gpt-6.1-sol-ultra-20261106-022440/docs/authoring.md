# Maze authoring

The workshop, campaign and seeded remix share one board format and one authoritative simulation. A board is plain JSON. It does not contain meshes, browser state or audio nodes. Begin in the in-game Maze Workshop with one of the three templates; export JSON after validating and playtesting. To add authored campaign content, add that validated board to `ChompContent.stages` in `src/content.js`. No new collision, AI, movement or network implementation is needed.

## Schema version 1

| Field | Meaning / valid values |
| --- | --- |
| `schemaVersion` | `1` |
| `id`, `name` | Stable short machine ID and readable title |
| `rows` | Exactly 15 strings, each 19 characters; `#` is wall and `.` is floor |
| `spawn` | Exactly two distinct `{x,y}` hero starts, even for a solo board |
| `enemySpawns` | Exactly three distinct `{x,y}` starts; leave at least five Manhattan cells from each hero start |
| `foods` | Exactly twelve `{id,x,y,power,dir}` objects; unique text IDs, four `power:true`, eight `power:false`; optional `dir` is 0 up, 1 right, 2 down, 3 left |
| `tunnels`, `gate`, `invisible` | Boolean mechanic switches |
| `tunnelRow` | `7`; when tunnels are on, floor cells at x=0 and x=18 pair, with open approaches at x=1 and x=17 |
| `gateCenter` | `{x:9,y:7}`; the permanent pen center and its four adjacent cells remain floor |
| `seed` | Stable text seed for gameplay randomness and diagnostics |
| `hint`, `clearCue` | One introductory sentence and a short completion line |
| `releaseTimes` | Three predator release delays in seconds, in role order: follower, interceptor, keeper |
| `enemySpeedScale` | Per-board multiplier for the shared predator-speed setting |
| `palette` | Main wall-accent CSS color |

The rows use screen coordinates: x increases to the right, y increases downward. A cell is addressed by its zero-based column and row. The 19×15 frame normally stays closed. The tunnel preset is the only permitted frame opening. Preserve the center even on boards where its rotating door is disabled, so the same board can safely switch mechanics.

Spawn reservations are strict: hero, predator and food starts must not overlap. Never put food in the center. Put the first snack near a safe hero start; reserve bright food for useful branching routes instead of hiding all four together. Food can overlap other food during play, but every starting identity remains distinct.

## Validation and roundtrip

The runtime API is exposed as `window.ChompContent` (also `globalThis.ChompContent` in headless Node):

```js
const candidate = ChompContent.clone(ChompContent.templates[0]);
candidate.name = 'My midnight supper';
const report = ChompContent.validate(candidate);
if (!report.ok) {
  console.log(report.errors[0].message, report.errors[0].cells);
} else {
  const text = ChompContent.exportBoard(candidate);
  const imported = ChompContent.importBoard(text);
  // imported.board is a fresh clone only after validation succeeds.
}
```

Validation reports actionable errors and cells to highlight. It checks every gate orientation, and separately checks that the outer routes stay connected with the pen excluded. A snack must not become stranded when the door changes. At least four independent loops are required for interception. This is a minimum structural test; play the final three targets before declaring a route enjoyable.

For a useful turning-table shortcut, lengthen the route around the center without disconnecting it. In the delivered third board, the upper-to-right exterior route is 14 cells; entering the center and leaving its next door uses two cells plus a timed wait. A player who sees the turn coming can save time. Simply surrounding the center with open floor makes that machinery decorative.

Invalid imports return `{ok:false,errors}` and no replacement board. Retain the current editor data until a valid import has been accepted. Version storage separately from board schema; the exported board itself stays schema version 1.

## Seeded layouts

```js
const board = ChompContent.generate('MY-SUPPER-42', {
  density: 'normal', // 'open', 'normal', or 'twisty'
  tunnels: true,
  gate: true,
  invisible: false,
});
```

The same seed/options reproduce wall layout, snack positions and initial direction. Random wall segments are accepted only while outer connectivity, useful loops and enough floor remain. Generation makes at most 150 placement attempts, then validates the complete result. A validated authored fallback is explicitly marked `fallback:true` with a diagnostic if it is ever needed. Do not remove the attempt bound or hide fallback use.

## Review before adding a board

1. Validate, export, import and reload it through the workshop.
2. Play from both start positions, with one player and with simultaneous co-op.
3. Use the tunnels and rotating pen; confirm their destinations and timing are readable.
4. Catch the final target using ordinary movement. Check that a shortcut or committed route can win an interception.
5. Check invisible walls with periodic reveals and a deliberate chirp.
6. Run the project's one-command test suite after the content edit. Its content module tests every authored gate state, compares the content graph to the real simulation graph, samples 300 deterministic seeds, rejects corrupt imports, and exercises template serialization. Whole-campaign legal-input and browser checks provide the movement and presentation evidence that schema tests cannot.

Keep authored content deterministic. Animation bob, particles and decorative variation belong to the view's cosmetic stream; they must not alter maze routes, snack ownership or gate state.
