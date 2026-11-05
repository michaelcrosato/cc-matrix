# CRACKMANIA — dev folder

An original arcade time-attack stunt racer inspired by TrackMania (2003), built on my-3D2dge v0.85.2 (2D engine + 3D
engine, three.js r182, Rapier 0.19.3). The playable single file is `../Crackmania-TrackMania2003-claude-opus-5-5-xhigh-20261104-050308.html`.

```sh
npm install                      # esbuild + Playwright (Chromium is expected in the Playwright cache)
node tools/build.mjs             # -> the single HTML file in the parent folder
node tools/test.mjs              # every headless suite; prints only failures and one count line
node tools/test.mjs --browser    # + Playwright checks of the built file from file://
node tools/test.mjs --hub        # + the AI Hub harness (2 players; 4 with latency and loss; host leaving)
node tools/bake.mjs              # re-bake the author times (src/data/medals.js) after a tuning change
node tools/shot.mjs '#race/D3' name 6000   # a screenshot of a deep link into check-output/
node tools/exit-interview.mjs    # ../exit-interview.json from src/data/about.js
```

Deep links: `#race/D3`, `#editor`, `#puzzle/PD2`, `#survival/hedgerow`, `#split/2/S2`, `#hotseat/D1`, `#garage`,
`#replay/last`, `#about`, `#credits`, `#attract`, `#lab/blocks`, `#lab/physics`, `#menu/<page>`.

Layout: `engine/` (the engine, its docs and tools; `engine/CHANGES.md` lists what was changed), `hub/session.js` (AI Hub
client, verbatim), `src/` (the game: `track/` blocks, mesher, physics, scenery; `car/` simulation, drawing, cameras;
`race/` runs, ghosts, the bot, medals; `modes/`, `scenes/`, `editor/`, `ui/`, `audio/`, `story/`, `data/`), `tools/`
(build, tests, bake, browser and hub checks). New content: add a turtle program to `src/data/tracks.js` (or export one
from the editor's Dev Mode), then `node tools/bake.mjs`.
