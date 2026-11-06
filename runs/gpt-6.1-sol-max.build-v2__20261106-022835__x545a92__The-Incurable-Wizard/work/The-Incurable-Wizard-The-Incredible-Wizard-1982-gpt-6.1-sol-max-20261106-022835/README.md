# The Incurable Wizard

One bolt. Six floors. No known cure.

Open the HTML beside this folder from `file://` to play. There are no runtime downloads or audio files. AI Hub supplies online sessions; standalone co-op shares one screen.

## Build and verify

- `npm run build` writes the byte-identical development/test and root release HTML, and the root exit interview.
- `node tools/verify.mjs` (or `npm test --silent`) runs simulation, full ordinary-command campaigns, packaging, Chromium/Firefox/WebKit input/audio checks, and Hub lifecycle/shared-combat checks. Normal output is failures followed by one count line. The browser runner starts its own localhost server on an OS-selected port and stops it afterward.
- `node tools/verify.mjs --core` runs only deterministic simulation and protocol edge checks after a simulation change.

Installed Python Playwright 1.63.0 is used at `/home/micha/.local/share/pipx/venvs/playwright/bin/python`. No installation is necessary on the supplied workstation. No frame-rate gate is imposed.

## Controls

Left stick / WASD move. Right stick / arrow keys / mouse aim. R2 / Cross / Space / click commit the sole bolt. Options / Escape pause. Touch has two invisible anchored thumb areas and optional visible-target auto-fire. Native Settings includes sound, comfort, glyphs, controls and rebinding.

Couch setup explicitly assigns keyboard + pad, two pads, or a shared keyboard. Shared-keyboard P2 uses IJKL, numpad 8/4/2/6, and right Shift. Online is launched by AI Hub; a title button cannot provide Internet matchmaking because the supplied Hub protocol has no standalone matchmaking API.

## Architecture

`src/content.js` is the designer data and balance defaults. `src/sim.js` owns fixed-step rules, seeded AI, scoring, visibility, checkpoints and serializable state. `platform.js` owns device adapters, versioned storage and the authoritative Hub wire protocol. `art.js` uses the full native render queue, Humanoid/Blob rigs and original shapes/weapon; `audio.js` contains every sound and composition. `main.js` wires the native TV shell, scenes, results, help, credits, developer pages and private attract simulation.

Engine: full my-3D2dge 0.89.1, commit 8ecc2f62353761187bdfe226f327b7ea5d2eb691. Hub: unmodified client 1.4.0, protocol 1, commit 35a1047f2067b2af3de3943f0fe452f39105d869. Engine source is unmodified. Adapters extend native APIs for simultaneous rules, invisible touch sticks and live online overlays. The official Hub script is embedded first after charset, byte for byte.

The logical landscape base is 640×360, expanded to the screen. Portrait uses the engine's 400×640 portrait override. A fixed arena camera fits every route; wheel and pinch zoom are disabled. One tile is always 16 world units. Simulation updates at 120 Hz independently of rendering.

## Evidence

`evidence/verification.json`, `browser-results.json`, `hub-harness.json`, `shared-combat.json` and `audio.json` contain checks and measurements. Research provenance is in `evidence/research.md`. Targeted PNGs cover title, bells, finale, developer panels, credits and touch framing. Hardware/physical-device listening and human first-run pacing are not available; automated pilots are separate evidence.
