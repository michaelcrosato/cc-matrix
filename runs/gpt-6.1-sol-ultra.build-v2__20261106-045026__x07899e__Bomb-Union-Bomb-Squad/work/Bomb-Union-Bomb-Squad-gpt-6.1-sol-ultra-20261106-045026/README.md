# Bomb Union

Open the single HTML in this folder's parent to play. Solo works directly on a file URL with no external requests; standalone cooperation needs secure PeerJS Cloud signaling and WebRTC connectivity. Embedded rounds use only the official AI Hub client.

`npm run build` produces the exact root artifact named in TASK.md. `npm test` runs quiet consolidated verification. Focused groups: `sim`, `net`, `browser`, `campaign`, `audio`, `peer`, `hub`, `touch`, `controller`, `package`. Tests use installed Playwright Python 1.63 and Chromium. Every HTTP fixture binds only 127.0.0.1 on an OS-selected port and shuts down its owned server/browser.

Architecture and authoring: docs/sim-contract.md, docs/net-contract.md, docs/art-contract.md, docs/authoring.md, docs/controls.md. Evidence and observed defects are in docs/testing.md and evidence/. Research, exact third-party revisions, and engine changes are in docs/research.md and docs/engine-changes.md.

The game includes guided training, three complete cases, one-to-four-player cooperation, seeded retry, native controller settings/rebindings, touch assistance, dev tuning/fault controls, a versioned board editor and JSON import/export, and a separate actual-simulation attract playlist.

No audio or image files are loaded by the game. All game artwork uses native procedural shapes, pixel primitives and humanoid rigs; all sound uses native synthesis/Web Audio. The original source screenshot was inspected for research; evidence/ retains original game captures and test records.
