# Auto Motley Motor — complete

## Deliverables
- Game: `Auto-Motley-Motor-Auto-Racing-gpt-6.1-sol-max-20261106-041247.html` in this workspace root; 1,462,954 bytes, self-contained.
- Reporting: `exit-interview.json` beside the HTML; exact required schema, embedded in the game’s paged About/Credits.
- Development: `Auto-Motley-Motor-Auto-Racing-gpt-6.1-sol-max-20261106-041247/` contains sources, pinned vendor references, build/test tools, docs and evidence.
- SHA-256: `3bff322a4e501a0e5077be75de37b6cddeb0d28a9e0cc49c36b237aec921d9c1`.

## Verification
- Full core/integration suite: **171 checks, 0 failures**.
- Final packaging: **8 checks, 0 failures**. Final visual capture: **2 checks, 0 failures**.
- All **4 official Hub conformance scenarios pass**, including latency/loss, host leave and actorless server. Final Hub rerun passed after the last UI polish.
- Legal AI laps on all 25 course/car combinations; full input-driven eleven-stop tour and ending; classic five-lap trial; complete scored AI/couch/direct duels and rematches.
- Shared keyboard, pad+keys, two pads, analog triggers, controller-loss safety, Chromium phone and WebKit tablet touch stand-ins.
- Real WebRTC from file and loopback URLs; host loss, readiness, scoring, result/rematch, 150 ms application delay and 5% state loss.
- Code-only audio measured offline/live, music .10, mute; attract boundary/no saves; dev/reset/unranked records; corrupt storage/ghost handling; final single-file packaging and report schema.
- Native headless rendering and hidden straight timing pass. Final TV setup still and four-frame steering/skid/braking filmstrip inspected.
- **13 unique issues fixed; 5 critical.** See development docs/issues.md and docs/validation.md. No required work remains.

## Architecture for later work
- Full my-3D2dge 0.89.1 pinned at 8ecc2f62353761187bdfe226f327b7ea5d2eb691, unchanged upstream engine. vendor/engine links to the pinned sparse handoff.
- Official AI Hub client 1.4.0 / protocol 1 pinned at 35a1047f2067b2af3de3943f0fe452f39105d869, inlined unmodified first after charset. vendor/hub includes harness/bridge/round support.
- src/data.js, world.js, sim.js, storage.js, art.js, audio.js, net.js, ui.js, main.js and style.css. Plain modules bundled into a single HTML by tools/build.mjs.
- Simulation alone advances each E.Car once per 1/120-second step; E.Race.update is not used. reverse:0, frozen grids, directed gates, retained contact motion, incident arbitration, safe anchors, one shared authority model.
- Native E.Shell, shapes, materials, rigs, pixels, tweens, particles and audio buses are the presentation foundation.
- Network uses a Worker-backed monotonic scheduler, Hub timeline/transport or standalone RTC. Actor identity is separate from authority. Online balance tools are read-only.
- All five connected original courses and five motors/four profiles work. Time trial 2/5 laps, guided tour, AI/couch/RTC/Hub pursuit, free drive/passport/hidden timed airfield, personal ghosts, dev tools, settings and ten-second attract are implemented.
- Title was chosen using Python secrets.randbelow(50) from fifty private candidates; method/index retained in development build-config.json.

## Commands
Run from the development folder:
- `node tools/build.mjs` rebuilds both development index.html and the root deliverable, embedding the current root exit interview.
- `node tools/test.mjs all` is the quiet test entry. Filters include core, sim, grand, package, browser, tour, input, couch, seats, touch, audio, direct, loopback, hub and visual.
- Documentation: docs/research.md, docs/architecture.md, docs/authoring.md, docs/validation.md. Evidence: docs/evidence/.

## Limits and environment
Cross-NAT/TURN internet, real remote devices, physical pads/touch/TV, real iOS and listening remain unknown; permitted stand-ins were tested. No persistent servers or browser processes remain. All generated files stay in this workspace/development folder. No sibling projects or pre-existing parent git changes were modified. Usage is exactly “added on import”; no cost/token/time estimate is made.
