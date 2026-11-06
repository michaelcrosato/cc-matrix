# Dungeons and Deeper Trouble

Open the single HTML beside this development folder. It contains the engine, game, native art, procedural animations, synthesized audio and session client; no sibling files or installation are needed to play. A modern browser with Canvas 2D and Web Audio is sufficient. Direct co-op additionally uses WebRTC.

Find the axe, folded ferry and Index Key, then recover both halves of the Wayfarer’s Crown. Missed arrows can be retrieved. Follow tracks, listen around corners, and use bright bank stones to turn a shaft into a different passage.

- Keyboard: WASD, Shift run, mouse aim, left click fire, right click listen, E interact/hold revive, Space quickstep, Tab field map, R count arrows, Escape pause.
- Controller: twin sticks, R2 fire, L2 listen, Cross interact, Circle quickstep, Triangle map, Square count arrows, Options pause. PS glyphs default; Xbox glyphs and rebinding in Settings/Controls.
- Touch: invisible left movement zone, right tap to shoot/drag to aim/hold to listen, left double tap quickstep. Nearby actions appear only when useful. Bank and aim assistance are available.

Two rangers share arrows and tools. Couch play uses keyboard/mouse plus a controller or two controllers; Options joins a free pad. Couch pause is explicitly shared. Direct online play uses an invitation and reply exchanged through your own communication channel. Host owns progress; guests keep their solo save. Some networks need a TURN relay and cannot connect; no relay service is bundled. AI Hub owns its rounds and does not overwrite local saves.

Pause contains Developer Tools, live balance pages/reset, diagnostics, checkpoint restart and About/Credits. Developer changes mark an expedition assisted and leave ordinary saves alone. A ten-second idle title starts an isolated attract replay; any input dismisses it.

Build and verify from this folder:

```sh
npm run build
npm test
```

The quiet test command prints failures and one count; detailed reports remain in `reports/`. `npm test -- --only=browser,product` selects affected suites during development. Browser tests use the workstation’s installed Playwright Python environment. No browsers or packages are downloaded.

`docs/authoring.md` explains actual campaign data, the optional Cairn chamber example and validator. `docs/architecture.md`, `docs/research.md`, `docs/verification.md` and subsystem records document implementation and evidence. First-play duration and real TV/controller/touch/iOS/WAN/human-listening checks are unknown; deterministic sprint replays are not human pacing tests.
