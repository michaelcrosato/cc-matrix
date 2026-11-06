# Wee Teeter: dev folder

- Build: `node build.mjs` writes `../WeeTeeter-WiiFit-claude-opus-5-5-xhigh-20261104-221037.html`, copies it to `tests/hub/game.html`, and rewrites `game/index.html` (the dev page).
- Test: `npm install` once (Playwright 1.63.0; the browsers are already on this computer), then `node tests/run.mjs [rules|browser|hub|all]`. It prints only failures and one count line.
- Designers: `game/data/README.md` says how to add a tier, pose, chart, course, tray, line or day without touching code.
- Deep links on the page: `#hub`, `#act/stork/1`, `#day/3`, `#ending`, `#class`, `#about`, `#attract`.
- Engine changes: the Dialog's text and box shadows follow `talk.shadow` (`engine/my-3d2dge.js`). Nothing else.
