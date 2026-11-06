# Fare Cry — complete

Built the game from PLAN.md and TASK.md, with an original title selected by a real random draw from 50 candidates.

## Hand-in
- `Fare-Cry-Far-Cry-2-gpt-6.1-sol-max-20261105-075003.html` — self-contained playable game in the workspace root.
- `exit-interview.json` — final Source Information, feedback and AI Hub catalogue metadata beside the HTML.
- `Fare-Cry-Far-Cry-2-gpt-6.1-sol-max-20261105-075003/` — modular source, package lock, build/test tools, original Hub client, licence notices, designer guide and verification artifacts.

## Final verification
- `node tools/test.mjs`: **42 passed, 0 failed**.
- Scripted C1–C8 and E1/E2 campaign, twists and all three endings; failed-job reissue and lower pay checked.
- **66/66 feature ids covered**; attract reel **86.36%**.
- WebGPU and WebGL2, keyboard/mouse/controller glyphs, live sliders, physical map, visible monocular markers, generated audio and touch-only flow checked.
- Official AI Hub cases: 2/3/4 seats, host leave, server host, and default four-copy WebGL2. Joining-player keyboard case pickup/delivery, shared fire, revive, 65/50 scores and packet budgets checked. Same-computer lobby/traffic/results checked.
- **24 native viewport/browser combinations** clean across phone/foldable/tablet/desktop/ultrawide. WebKit substitutes for real iOS Safari.
- Original Hub client remains byte-for-byte the first script. Root interview matches in-game About metadata. Licences and fonts are embedded. No runtime external requests in standalone checks.
- Final HTML: 3,605,286 bytes; SHA-256 `b3b8003c92efd71371d7bfbcb1ce46311323b163a9d84b45b0ae75a70d988868`.

## Review/reproduction
Read `docs/DESIGNER.md` and `docs/issues-log.md` in the source folder. The issue log records 24 corrected product issues, including 7 critical issues, and separate environmental/test-tool corrections. Final reports and screenshots are under `test-output/`; the warmed driving view and native viewport gallery were personally inspected.

`node_modules` and the duplicate temporary harness site were removed. Run `npm ci` in the source folder to restore dependencies, then `npm run build` / `npm test`. The HTML opens directly from disk. Test servers and browsers closed through their fixtures; no persistent dev server was started.

No required work remains. Final reply should link the game and interview and include all requested Source Information and Testing/Engine/Prompt feedback. Usage must stay "added on import"; do not estimate cost.
