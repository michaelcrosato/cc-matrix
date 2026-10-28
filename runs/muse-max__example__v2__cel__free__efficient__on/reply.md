Done — **Wahoo Wheels 64** is ready. Open [Wahoo-Wheels-64-Mario-Kart-64-muse-wonder-1.0-max-20261027-1637.html](/home/micha/dev/cc-matrix/runs/muse-max__example__v2__cel__free__efficient__on/work/Wahoo-Wheels-64-Mario-Kart-64-muse-wonder-1.0-max-20261027-1637.html) directly in a WebGPU browser (Chrome/Edge, WebGPU enabled). No server needed. Dev notes are in [README-dev.md](/home/micha/dev/cc-matrix/runs/muse-max__example__v2__cel__free__efficient__on/work/Wahoo-Wheels-64-Mario-Kart-64-muse-wonder-1.0-max-20261027-1637/README-dev.md).

Title was picked by RNG from 50 brainstormed titles: Node `Math.random()` index 49 → “Wahoo Wheels 64”.

Smoke result: Node syntax parse of the embedded module passed, all 45 `$('#…')` IDs resolve, CDN URLs returned HTTP 200, and a local `http.server` fetch of the exact file returned HTTP 200 (74,382 bytes). Per the brief’s testing limits, no screenshots, visual review, or subagents were run, so in-browser WebGPU rendering itself is unverified here.

Play: Grand Prix, Time Trial, VS (1–4P splitscreen) and Battle across 3 tracks and 8 racers, with drift-boost (blue/orange/purple), hop, item boxes (shroom/triple/banana/shell/star/bolt/bomb), boost pads, rubber-banded AI, countdown boost start, wrong-way and off-track warnings, minimap, pause and results. Attract mode starts after 10s idle on the title screen; any input exits it. Settings include Invert Horizontal/Vertical axes, vibration, shake, audio and difficulty. Touch-only devices get a “Controller or keyboard required” notice with a Settings button, as specified.

## Source Information

- Date: 2026-10-27 16:37
- Source: Mario Kart 64 for N64
- Tech: Three.js 0.180.0 `WebGPURenderer` (WebGPU only, no fallback), Rapier 0.19.3 via `@dimforge/rapier3d-compat`, Web Audio API, Gamepad API, Canvas 2D minimap, CDN import map
- Art Direction: Stylized cel-shaded — `MeshToonMaterial` with 4-step gradient map and inverted-hull outlines
- Animation: Procedural — wheel spin, hop squash, drift lean, driver bob, spring chase cameras
- Testing: Lightweight only — syntax parse, DOM-ID resolution, CDN and HTTP reachability; no screenshots or subagents
- Environment: Muse Code CLI (headless); Linux; browser unknown
- Model: Meta, muse-wonder-1.0, reasoning effort max
- Usage: unknown

### Testing Feedback

- How many issues did testing catch? Two: a double-toggle pause (keyboard event plus polled input) and paused/finished states falling through to the title orbit camera. Both were fixed before handoff.
- How many would be considered critical / game breaking? One — the frozen-state render fallthrough would have kept physics stepping behind the pause menu.
- What was the most helpful test you ran? The DOM-ID resolution check across all 45 lookups; it proves every menu, HUD and settings control is wired to a real element.
- What was the least helpful test you ran? The HTTP 200 fetch; it proves delivery mechanics only, not that WebGPU frames render.

## Engine Feedback

- What did you like most about the engine? (Three.js rendering engine.) The import-map WebGPU build and toon materials made the cel look cheap to get: one gradient map sells the whole cast.
- Did you get stuck or guess wrong? Yes — Rapier rotation locking and the `timestep` stepping order; arcade velocity writes to dynamic bodies were the stable answer.
- What was the most important thing you had to build yourself? The entire race brain: spline progress/lap tracking, drift-charge state machine, item economy and rubber-banding. The engine gives bodies and meshes, not a kart game.
- What was the hardest part about using the engine? Splitscreen viewport/scissor management across four cameras while keeping HUD layers aligned per quadrant.
- If you had to remove or overhaul one thing from engine, what would that be? The split WebGL/WebGPU material expectations; toon/points behaviour differing by renderer costs guessing time.
- If you could change one thing about the engine, what would it be? A first-class arcade vehicle helper for Rapier, so every kart project stops reinventing velocity-write steering.

## Prompt Feedback

- What did you like most about this prompt? The hard constraints were testable: single file, pinned versions, named features, and explicit “no stubs” done criteria.
- What was confusing? The `[GameTitle-SOURCE-…]` filename placeholder — whether SOURCE meant the literal word or the source title. I slugified the source title into the filename.
- What was the hardest thing to do? Fitting a complete 4-player splitscreen racer with physics, items and attract mode into one self-contained file without build tooling.
- If there was one test you could of run, what would that test be? A headless WebGPU playthrough that starts a race, holds accelerate and drift for a full lap, and asserts lap 2 begins — explicitly out of scope under the brief’s lightweight-testing rule.