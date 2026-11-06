# Why Fit: dev notes

A fitness comedy inspired by Wii Fit, built on Pixel Engine 0.46.0 (the kit's files at this folder's root are untouched).

- `node tools/build.mjs` bundles `src/main.js` with esbuild into one html (`../WhyFit-WiiFit-claude-sonnet-5-5-medium-20261105-012138.html`) and writes `../exit-interview.json` from `src/data/about.js`.
- `node tools/test.mjs` runs everything (`--fast` = Node tests only; names filter files). It prints failures and one count line.
- `node tools/shot.mjs` / `node tools/shots-all.mjs 1920x1080 [names]` take composited screenshots into `shots/`.
- `node tools/clip-sheet.mjs Tree` draws a clip sheet without a GPU (needs a display-less Node; see notes in the file).
- Designers: everything tunable is data in `src/data/` (poses, reps, charts, boards, week, lines, unlocks, stars) plus live sliders in Dev Tools (pause menu).
