# Astro Battle Jam

**Cut a lane. Patch the planet.** An original finite planetary-defense shooter inspired by the Astrocade interpretation of Astro Battle / Space Invaders.

Open the named `.html` in the parent directory in a modern browser. It is the complete, self-contained cartridge, including the full native engine, original pixel assets, synthesized audio, credits and Hub client. There are no runtime downloads. `index.html` is an identical development copy.

A standard run has six authored formations across Jade Coast, Amber Relay and Violet Crown, followed by The Big Rude's two-phase flagship encounter. Surviving enemies accelerate, both sides erode the four cell-mask bunkers, and every fourth kill drops salvage. Catch it, then rebuild around your current firing corridor. An invader crossing the breach line or exhausted deployments ends the team defense.

Move with A/D or arrows, a mouse target, or the left stick/D-pad. Hold Space/left click/R2/Cross to fire; Q/right click/L1/Square repairs the nearest bunker. Options or Escape opens the local overlay. PlayStation prompts are the default, with Xbox labels in settings. The short control card explains touch movement, clear-lane auto-fire, intentional second-contact firing through cover, and contextual repair.

Standalone co-op shares one world and six total starting deployments. Choose Local Co-op, then join the other seat with Options on a spare standard pad, or 2 on a shared keyboard. Two pads and keyboard/mouse plus a pad are supported. On a shared keyboard, P1 uses A/D, Space and Q; P2 uses arrows, period and slash. Seats lock at deployment and returning controllers reclaim them. AI Hub supplies online sessions; there is no standalone remote room or matchmaking service.

Four difficulties use all six formations and the same flagship. Records are separated by difficulty, solo/co-op and assisted status. The pause menu contains developer encounter/resource tools, seed entry, selected spawns, diagnostics, exact step/time controls and live balance sliders. Changes mark the run assisted. In a live Hub session, mutations are disabled and only local settings/diagnostics remain available.

## Build and verification

No package installation is needed. The build uses Node's standard library; browser tests use the already installed Python Playwright 1.63.0 environment.

```sh
npm run build
npm test
```

`node tools/test.mjs` is the single quiet verification command. It prints failures and one total count, returns nonzero on failure, and writes detailed evidence under `evidence/`. Optional suite arguments are `simulation`, `engine`, `session`, `browser`, and `hub`.

The simulation suite includes ordinary-action standard solo and co-op campaign clears, both defeat causes, cell erosion, repair corridors, deployment accounting and flagship windows. The engine suite drives the actual exported scripts headlessly, including a complete ordinary campaign, draw paths, menus and attract loops. Browser tests open an isolated copy of the final artifact from `file://`; exercise native input, controller stubs, touch profiles, audio and Firefox/WebKit smoke paths. Hub tests bind an owned loopback server on an OS-chosen port and run the pinned official harness at 150 ms latency, 50 ms jitter and 5% loss, including host departure and server-only authority. Additional semantic tests verify remote repair, death, respawn, overlays and terminal agreement. The server is closed by its owning process.

Normal campaign bots observe the world and return ordinary move/fire/repair commands. They do not edit state, grant resources, jump encounters or disable damage. Developer, attract and isolated collision/network fixtures are reported separately from normal completion evidence. A fast bot clear is not a measurement of a novice human's first run.

Physical gamepad feel, human listening, real TV distance and physical iOS behavior are unknown. Phone/tablet and gamepad tests are emulations. Audio assertions prove finite signals, bounded gains and mute silence, not aesthetic quality.

## Source and provenance

See `evidence/research.md`, `evidence/issues.json`, `vendor/engine/PATCHES.md`, and `src/report.json`. The last object is the single source for the in-game source/feedback pages and the generated root `exit-interview.json`.

Original game code and pixel assets were authored for this task. The full engine remains unchanged under its included MIT license. The pristine AI Hub session client is the first script after the character-set declaration, as required by Protocol v1.
