# Mechanic and content coverage

All boards use `ChompContent` schema version 1: 19×15 cardinal cells, two hero starts, exactly three predator starts, twelve stable food IDs (eight ordinary/four powered), optional paired row-7 tunnels, permanent pen at (9,7), and shared generator/editor validation. Native world tiles are a presentation concern; content is expressed only in cells.

| Stage | Authorship / route character | Mechanics demonstrated | Automated evidence expected |
| --- | --- | --- | --- |
| Nibble Boulevard | Authored broad horizontal loops and staggered islands; easy first bite at (3,1) | Movement, early turns, interception, power reversal, three enemy tells | Legal-input clear, warning and collection traces |
| Side-Door Supper | Authored vertical islands and side approaches | Paired tunnels, intercepting via opposite side | Tunnel travel and seam encounter checks; stage clear |
| The Turning Table | Authored long central quadrant blocks and open cross-shaped arms | Rotating pen, a timed route that can beat the long detour | All-state graph connectivity; occupancy and gate cadence checks |
| Peek-a-Chew | Authored offset ledges and side loops | Disappearing walls, periodic reveal and intentional chirp | Reveal/cooldown/collision echo checks; legal-input clear |
| Shuffle Snack Shack | Generated deterministically from seed CHOMP-1981 | New validated routes under the same rules | Seed reproducibility, validation and legal-input clear |
| The Midnight Munch | Authored tight central quadrants plus long side detours | All previous mechanics, final-target interception, ending | Whole-campaign completion under normal movement/lives |
| Seeded Supper | Bounded randomized wall-segment authoring, three density choices | Repeatable remix with tunnels/gate/invisibility options | Sampled seed validator, identical initial states, bounded fallback |
| Maze workshop | Three varied known-good templates cloned from campaign | Edit, validate, save/load, import/export and playtest | Invalid-import retention; full editor roundtrip |

Every authored stage was validated during data authoring. A preliminary 100-seed sample produced connected valid boards without fallback. The final test entry point must repeat the applicable assertions after content changes and owns the authoritative reported pass count. Content graph tests do not replace legal-input playthroughs or browser checks.

## Shared validator

`validate(board)` returns `{ok,errors,stats}`. Errors contain a concise actionable `message` and highlighted `cells`. It checks row dimensions/characters, bounded closed frame with paired tunnel mouths, permanent pen approaches, valid non-overlapping starts, safe enemy distances, twelve unique short food IDs and four powered food, cardinal direction values, reachability in all four gate states, outer connectivity when the pen is excluded, and at least four interception loops. Corrupt non-object imports and malformed food entries are rejected rather than thrown. `importBoard(text)` returns a parsed clone only after full validation; `exportBoard(board)` preserves the complete data schema.

## Generator

`generate(seed,{density:'open'|'normal'|'twisty',tunnels:true|false,gate:true|false,invisible:true|false})` uses a retained seeded PRNG for layout and initial travel. It attempts at most 150 wall placements, rejecting disconnected candidates, insufficient loops or too few floor cells. Food placement selects distinct useful floor cells outside player/predator/pen starts. If final validation ever fails, it returns a validated authored fallback marked `fallback:true` with a developer diagnostic. No game-state randomness depends on cosmetic rendering.

## Final release evidence

The final exact-HTML release check is `node tools/test.mjs`: **511 passed, 0 failed, 0 skipped**. It combines 353 content checks, 32 simulation checks (including full ordinary solo/co-op campaigns and 58 normal generated completions), 13 network unit checks, 17 final-file browser cases, 95 official/shared-state Hub checks and one packaging check. `tests/results.json` records the actual tested HTML SHA256; browser and Hub details are preserved separately.

Final screenshots were inspected for title/credits TV readability, board framing and creature distinction, phone safe areas, hint placement, menu ownership, turning-gate motion and accidental wrap copies. The six-frame `tests/screens-motionstrip.png` confirms actors stay in the cabinet after the wrapping fix. Human hardware and listening checks remain unknown.
