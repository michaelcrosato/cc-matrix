# CRACKMANIA (dev folder)

- Build the single file: `npm install` (esbuild, Playwright), then `node tools/build.mjs` -> `../Crackmania-TrackMania2003-claude-opus-5-5-medium-20261104-050311.html` and `../exit-interview.json` (from `src/info.json`).
- Test: `node tools/test.mjs` (headless suites, prints failures and one count line); `--browser` adds the Playwright checks of the built file, `--hub` the AI Hub harness (3 scenarios), `--all` both.
- Look: `node tools/shot.mjs <name> "<js>;;wait:ms;;key:Enter;;shot:name"` screenshots the built file into `check-output/`.
- Source: `src/` (ES modules; `main.js` is the game), engine copies in `engine/` (changes in `engine/CHANGES.md`), the AI Hub client in `hub/session.js` (verbatim).
- Content: tracks are turtle programs in `src/data.js`; Dev Mode's "Export as content" prints an editor track in the same placement format.
