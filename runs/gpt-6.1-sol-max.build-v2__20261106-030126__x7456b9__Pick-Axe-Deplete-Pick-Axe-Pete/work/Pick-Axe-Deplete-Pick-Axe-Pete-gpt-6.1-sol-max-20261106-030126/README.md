# Pick Axe Deplete

Big swing. Small warranty.

An original three-chamber arcade platformer inspired by Pick Axe Pete (1982). Chop gold-bearing ore, redirect rocks into rich crashes, chase descending tools and rising keys, then prime the extraction machinery. Play solo, simultaneous local co-op, or shared-world co-op inside AI Hub.

Open the delivered root HTML directly in a browser; it needs no server, install, CDN or asset download. A copy is generated here as `index.html`. AI Hub sessions use its supplied transport and lifecycle; standalone local co-op needs no online service.

Move with A/D or arrows; W/S climbs or ducks. Space jumps, J/left-click chops, Q/right-click redirects, E deliberately enters a door or holds to rescue, Escape pauses. Standard gamepad: stick/D-pad, Cross jump, Square chop, R2 redirect, Circle/down duck, Triangle interact, Options pause. The native Controls screen supports rebinding. Touch: invisible left thumb movement/climb/down, right tap/hold jump, assisted chopping and a contextual action bubble.

The pause menu includes paged settings, help, About/feedback, Developer tools and standalone checkpoint/replay actions. Developer/practice/attract shifts cannot overwrite completed expedition records. Idle title menus start a real demonstration after ten seconds; waking input is consumed.

Build: `node tools/build.mjs`.

Verify: `node tools/verify.mjs` (or `npm test`). This is a quiet aggregate with full gameplay/browser/Hub proof and may take several minutes. Uses the already-installed Python Playwright environment described in TASK.md; no browser installation is needed.

Authoring: `docs/authoring.md`. Research/provenance: `docs/research.md`, `docs/dependencies.md`. Verification and issue ledger: `docs/testing.md`, `docs/issues.json`. Network prediction/authority: `docs/network.md`. Original coded audio and native assets: `docs/audio.md`, `docs/assets.md`.
