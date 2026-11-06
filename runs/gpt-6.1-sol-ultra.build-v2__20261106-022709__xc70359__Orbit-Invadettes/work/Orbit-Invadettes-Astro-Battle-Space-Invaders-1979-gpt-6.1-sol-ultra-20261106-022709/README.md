# Orbit Invadettes

Open the single HTML in the parent directory directly in a browser. It contains the pristine Hub client, full pinned engine, all original sprite data, synthesized audio and game code. It needs no network in standalone play.

- Move: A/D or arrows, stick/D-pad, or a horizontal mouse target.
- Hold fire: Space, left mouse, R2 or Cross.
- Repair nearest bunker: Q, right mouse, L1 or Square.
- Pause/options: Escape or Options.
- P2 on a shared keyboard: arrows, period to fire, slash to repair, Backspace to pause.
- Touch: drag horizontally to move, clear lanes auto-fire, second contact intentionally cuts cover, temporary repair button spends salvage.

Local co-op is simultaneous. AI Hub provides online shared-world sessions; this file does not create standalone online rooms.

## Build and verify

From this directory:

```sh
node tools/build.mjs
node tools/test.mjs
```

Build requires the already installed Bun executable. Verification uses Node and the installed Python Playwright1.63.0 environment. Browsers are already present; the suite does not install any. The one verification command prints only failures and one aggregate count, with details in evidence/. It starts an owned loopback server on an OS-selected port only for Hub verification and closes its browsers/server afterward.

The native engine and Hub client are pinned in vendor/. Upstream engine is unchanged; full license is retained in the exported HTML. Read research/RESEARCH.md for inspected source evidence and limits; src/*-CONTRACT.md for simulation, assets/audio and shared authority.

Balance values and six authored formations live in src/content.js. Pause → Developer tools exposes all encounters, both flagship phases, deterministic seeds, resource/deployment tools, diagnostics, time/step controls and live balance sliders. Changing a world marks it assisted; ordinary and assisted local records have separate views. Hub disables local world mutations.

The exact exit-interview.json at the parent root mirrors report.json, which is bundled into the in-game paged About/Credits.
