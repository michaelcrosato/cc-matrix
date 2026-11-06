# Buzz Comb Party

An original six-garden arcade shooter inspired by Buzz Bombers (1983). Spray bees into combs, use those combs to redirect workers, feed them to Pip the hummingbird, conserve cans and keep the flowers out of your parking space. Red harvests open the pageant's shield buds. The ordinary-input automated solo/co-op campaigns take about 10½ minutes.

Open the final HTML one directory above this folder. It is self-contained, works with `file://`, has no runtime network dependencies, and may be moved anywhere. The folder name and final basename follow TASK.md. `exit-interview.json` beside the final HTML supplies catalogue/release metadata.

- `npm run build` reproduces the HTML from these sources and the current interview.
- `npm test` runs the quiet aggregate checks; only failures and one final count are printed. `npm test -- sim`, `-- browser`, `-- hub` or `-- build` selects a group.
- Tests use Node and the workstation's existing Playwright Python 1.63 environment. No dependency install, browser download or development server is needed for standalone. The Hub test starts and shuts down its own loopback HTTP server on an OS-assigned port.

Controls: A/D or arrows move, Space sprays, E calls Pip, Escape pauses. Mouse movement chooses a column and holding left sprays; right calls. Standard pad: left stick / D-pad, Cross or R2 spray, Square call, Options pause, Circle back. PlayStation symbols are default; Xbox is in Controls. All native key/button bindings can be changed.

Local co-op offers keyboard + pad, two pads, or one shared keyboard. Shared keyboard: P1 A/D, Space, E; P2 arrows, period, slash. Both cans share score, stock and bird cooldown. The setup assigns pads exclusively. Online shared-world 1–2 player co-op is supplied by AI Hub; there is no standalone room broker. Online Options is local and the shared world continues.

Touch: drag the lower garden; safe assisted fire avoids Pip and valuable wax. Tap a comb for contextual Harvest / Clear, or cancel. Clear uses normal travel and ammo. The native menu button remains available; portrait and landscape keep the same collision arena.

After ten idle seconds on the front end, a looping simulation showcase starts. Any input returns to title and is consumed. Attract and assisted runs cannot write ordinary records.

Pause → Developer Tools opens controller-navigable encounter/phase selection, single stepping, freeze/slow motion, stock protection, unlimited spray, collision/ledger inspection, object spawning, live tuning/reset and validated JSON export/import. Mutation marks a run assisted. Timing changes affect existing motion immediately; entry timing is baked on encounter start/restart. New normal runs always use defaults. Online sessions expose local options only.

Author content in `src/content.js`; see `docs/content-guide.md`. The rendering-independent simulation, wire format and ownership rules are in `docs/contracts.md`. Research/provenance, engine patches, distinct test-discovered issues and full evidence are in `docs/` and `evidence/`.

Verification limits: controller and touch inputs are emulated. Chromium/WebKit are browser checks, not physical iOS. Hub conformance uses the official local coordinator with real game frames, not the live catalogue. Nobody listened to the generated audio; objective signal checks cover it. Human difficulty/fairness remains unconfirmed. No usage/cost estimate is made; metadata says “added on import”.
