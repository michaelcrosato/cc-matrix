# Eye of the Bolt-Holder (dev folder)

A real-time, first-person party dungeon crawler inspired by Eye of the Beholder (1991), on my-3D2dge v0.85.2.

- **Build:** `node tools/build.mjs` writes the single HTML file and `exit-interview.json` into the folder above.
- **Test:** `node tests/run.mjs` (all suites; `--fast` skips the browser, harness and playthrough suites; name suites to
  run only those). It prints only failures and one line of counts.
- **Play:** open the built HTML file in a browser (three.js and Rapier load from jsDelivr). Controller, or keyboard and
  mouse. Add `?backend=webgl` to force WebGL 2.
- **Look:** `node tests/shoot.mjs` takes the three-resolution screenshots and the slow-motion filmstrips into `shots/`.
- **Look (ad hoc):** `node tests/browser/look.mjs "key=Enter;wait=800;shot=name"` takes screenshots into `shots/`.

Layout: `src/` (the game, concatenated in file order), `engine/` (the two engine files, patched: PATCHES.md), `hub/`
(the AI Hub client, unmodified, and its harness), `tests/` (the Node harness, suites, browser checks), `tools/`.
The sim (files 20-31) is pure and deterministic: it never touches the view, the DOM, sound or `Math.random`.
