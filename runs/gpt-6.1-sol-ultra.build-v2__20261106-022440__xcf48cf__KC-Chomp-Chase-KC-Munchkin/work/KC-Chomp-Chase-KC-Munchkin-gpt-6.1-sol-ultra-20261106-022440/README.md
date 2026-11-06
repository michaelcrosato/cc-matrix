# K.C. Chomp Chase

Open the root `KC-Chomp-Chase-KC-Munchkin-gpt-6.1-sol-ultra-20261106-022440.html` directly in a browser. The same file is also generated at `build/game.html`. There are no runtime asset requests or CDN dependencies.

Catch twelve moving snacks while three hungry predators chase you. Four bright snacks reverse the chase. Surviving snacks accelerate; intercept their committed routes using cross-links, paired tunnels and the rotating pen. The six-stage campaign includes disappearing walls and a seeded board. Standalone is untimed, with five shared lives and solo or simultaneous couch co-op. AI Hub supplies transport for across-device shared-world co-op and its own time limit.

Move with WASD, arrows, a standard pad's stick or D-pad, or a touch drag. Space / south face reveals walls. Escape / Options opens the menu. With two keyboard players, P1 uses WASD and F; P2 uses arrows and period. Two pads, or one pad and keyboard, are also supported. Menu controls can be rebound in the native Controls screen. PS symbols are the default; Xbox symbols are available there.

The workshop supports wall painting, moving two hero starts and twelve snacks, paired tunnels, a permanent pen, validation, undo/redo, three save slots, renaming, JSON import/export, and playtesting. Return to the editor from the playtest's pause menu or results. Invalid imports retain the current maze. Settings, records and workshop slots use local versioned saves and recover from unavailable or corrupt storage.

## Build and verify

No install is needed on the supplied workstation. Run these from this development directory:

```sh
npm run build
node tools/test.mjs
```

The one test command reports only failures and a passed/failed/skipped count. `--unit`, `--browser`, and `--hub` select a relevant group during iteration. Browser tests use the installed Playwright 1.63 Python environment. Hub tests start their own loopback server on an OS-selected port and close their own browser/server. No fixed port is required. Do not edit the vendored session client: build verifies its unchanged bytes as the first script after the charset meta.

`game.debug.snapshot()` provides bounded diagnostics. Mutating debug commands require `?test=1` or visible Developer Tools, and are disabled in Hub. Developer Tools are reachable from standalone pause, visibly mark a run assisted, and expose live rules, seed/stage selection, restart/advance, single step and state inspection. Assisted records are excluded from normal saves. Title screens enter an isolated AI demonstration after ten idle seconds; real input returns to title.

## Evidence and expansion

- `docs/research.md`: primary evidence and known unknowns.
- `docs/rules.md`: one authoritative movement/encounter/topology contract.
- `docs/coverage.md`: stage and mechanic coverage.
- `docs/authoring.md`: add authored stages or validated workshop boards.
- `docs/balance.md`: measured legal-input bot play and first-human timing limitations.
- `docs/upstream.md`: exact engine and Hub revisions, transport and harness results.
- `docs/issues.md`: unique testing and review findings.
- `tests/`, `tools/hub/results.json`: reproducible checks and recorded evidence.

The root `exit-interview.json` is the release-information source used by the build's About/Credits screens. Usage is **added on import**. Physical controllers, actual phones/iOS devices, televisions, and human listening are not claimed; browser profiles, emulated pads and signal checks are used instead.
