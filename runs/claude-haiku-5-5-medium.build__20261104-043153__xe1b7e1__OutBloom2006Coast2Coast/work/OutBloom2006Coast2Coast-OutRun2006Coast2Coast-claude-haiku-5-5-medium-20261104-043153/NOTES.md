# Build notes (claude-haiku-5-5-medium, 20261104-043153)

Title: OutBloom 2006: Coast 2 Coast (from PLAN.md; its own RNG draw, not re-drawn here).
Engine: my-3d2dge v0.85.2 (commit 4390a98), copied to engine/my-3d2dge.js. No engine changes.
AI Hub: vendor/session.js (1.4.0, verbatim, first script in head). Ghost mode per lib/hub/README.md.

## Layout
- src/ (manifest order): 00 core, 01 data (stages, cars, traffic, requests, passengers, lines, songs), 01-about (about
  and exit-interview text), 10 world, 20 car, 21 traffic, 22 brain, 23 race, 24 requests, 25 missions (Tour), 26 progress
  (profile, beds, seeds), 27 objects, 30 audio, 40 ui, 41 hud, 42 art, 50 front, 51 race scene, 52 results and endings,
  53 tour screens and garden, 54 versus, 55 time trial, 60 attract, 61 dev, 70 hub, 71 touch, 90 main.
- build.mjs writes the bundle to the root (lint: placeholder words and bare fetch/alert/confirm/prompt/sockets; then the
  exit JSON from OB.ABOUT, with empty-field checks).
- tests/run.mjs: THE test command (155 checks; prints failures and one summary line). Runs tests/hub-fake.mjs too.
- tests/browser-smoke.py, tests/browser-touch.py: Chromium over file:// (no console errors, no external requests,
  title; touch phone). tests/hub-harness.py PORT QUERY: the AI Hub harness in Chromium (served from .cache/hubtest).
- Probes (tools, not checks): tests/balance-probe.mjs, tests/par-probe.mjs, tests/mission-probe.mjs.

## Deviations from the plan (what is still not the plan's)
- Stage layouts are 80% of the plan's length (the plan's stage lengths and speed model disagree); stage pars are the bot's times.
- Clock: start 100 s, checkpoint bonus 71 s (plan: 75 and 57). Bot: every route finishes on the default clock.
- Forks: game code (src/43-fork.js, OB.drawStage), on the road module's internals; the branches continue as their stages.
- Rivals are pacers that collide with the car; versus is two races whose cars collide when they meet.
- Tour map: an island with the pyramid, pins and pinned postcards (cards overlap where stages share pins).
- Passengers: Humanoid rigs (portraits and seated in the car). In the car the legs show over the body (one draw pass).
- Art: px drawing in code; vehicle and car bodies are pre-rendered into cached sprites (OB.Art.vehicle, playerCar).
- Audio: songs and jingles on the engine synth with the E6 presets, chords, accents, slides, track sends, reverb and the voice bus.
- Engine changes: E2, E3, E4, E5, E6 (partly), E7, E8 (engine/CHANGES.md). E1 is game code.
- Hub: ghost mode (the plan's §7.12 choice). Shared-world is not built: a game declares one hub mode in its tags, so it would replace ghost mode rather than add to it. This needs a decision.
- Attract: a timed playlist of bot runs, endings and the high-score table (about 100 s a cycle).

## Verified
- tests/run.mjs: 155 passed. tests/hub-fake.mjs: passes (run from the suite).
- Chromium (file://): title, menu, race; no console errors, no external requests. Fork screenshots (approach, junction, decided).
- Chromium touch emulation: notice, Settings button; attract after 11 s idle.
- AI Hub harness (Chromium), final bundle: 2 players PASS; 4 players with latency 150 ms, jitter 50 ms, loss 5% PASS;
  4 players with host-leave PASS.
