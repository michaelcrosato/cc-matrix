# Attack of the Timelout

Open the single HTML in the workspace root to play. Solo works directly from `file://` and requires no development files. Online rooms load pinned PeerJS1.5.5 after selecting Online; public signaling and WebRTC need internet. AI Hub uses its own unmodified inline client instead.

Controls: A/D or arrows to slide, Space to fire, Shift to brake, Escape to pause. A mouse sets a horizontal target, with left/right buttons for fire/brake. Standard controllers use left stick/D-pad, Cross/R2, Square/L2 and Options. Touch uses relative horizontal dragging, automatic fire and a brake button only when charged.

The campaign has eight authored waves and a three-phase finale. Destroy the fleet to advance. Intercept hostile weapons to fill the shared brake; only hostile motion slows. Green crosses stop being shootable after landing. Their marked segments always reserve an escape. Solo has three integrity pips; co-op machines recover at wave clear. Records distinguish solo, co-op and assisted rules, with six-character controller entry. Developer changes and demonstrations cannot submit normal scores.

Pause → Dev Mode opens encounter jumps, invulnerability, hitboxes, trajectories, AI, single-step, refills, arsenal inspection and live tuning. Tuning lasts only for the visit. Native settings and Controls provide sound buses, comfort options, glyphs and rebinding.

From this directory:

```sh
npm run build
npm test
```

The build is a deterministic single-file assembly using the pinned local esbuild dependency. The quiet test runner prints failures and one total. Logs, browser evidence, audio measurements and network reports are in `test-artifacts`. Tests use installed Playwright Python1.63.0 and browsers; none are downloaded. Optional `--state`, `--engine`, `--package`, `--network`, `--audio`, `--browser`, `--hub`, `--peer`, and `--online-gameplay` selectors run affected coverage.

Design and provenance: `docs/research.md`, `docs/authoring.md`, `docs/build-notes.md`, `docs/network.md`, `docs/audio.md`, `docs/verification.md`. Builder metadata is both in the game's About screen and the root `exit-interview.json`. `PROGRESS.md` in the workspace root records resumable status.
