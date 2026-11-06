# B-17 Cross Channel Chaos

One bomber. Six stations. Bring everyone home.

An original arcade flight game inspired by **B-17 Bomber (Intellivision, 1982)**. Plan Operation Copper Tide, cross the Channel, answer clock-bearing fighter warnings, evade coastal flak, bomb Greyhaven’s armed transport and return to Rookfield. The completed operation takes roughly 10–12 active minutes; optional targets and three payload/difficulty choices make it replayable.

## Play

Open the root delivery file in a browser:

`../B-17-Cross-Channel-Chaos-B-17-Bomber-gpt-6.1-sol-ultra-20261106-043517.html`

The HTML includes engine, game, geometry, synthesized audio, dependency notices and the released AI Hub client. It does not require a web server, install, CDN or adjacent assets. `game.html` is the same built artifact inside this development directory.

Use **Fly a sortie** for the operation, **Practice** for directional gunnery, bomb calibration or a damaged return, or **Co-op crew** for two people sharing one bomber. The title starts a labeled demonstration after ten idle seconds; any deliberate input returns to the menu.

The common flight loop is:

1. Choose a route, payload and skill level in the briefing.
2. Launch and add power. Navigation hold follows the selected route; moving the flight stick takes control.
3. Answer fighter warnings at the correct gun. The AI holds flight while you work another station.
4. Open the bombsight before the target, watch the predicted impact reference, then release deliberately.
5. Open the map, commit a return to Rookfield and reach the home approach for assisted recovery.

A safe abort is a complete outcome. Your final bomb does not prevent a return.

## Controls

Prompts follow the device used last. PlayStation symbols are the default; Settings also offers Xbox symbols.

| Action | Keyboard / mouse | Standard controller |
| --- | --- | --- |
| Bank / pitch | WASD | Left stick |
| Aim / look | Mouse; WASD can traverse a gun | Right stick |
| Fire / release | Left click or Space | R2 |
| Fine aim / zoom | Right mouse | L2 |
| Throttle, in pilot seat | Q / E | L1 / R1 |
| Station wheel | Tab | Triangle |
| Pilot / threatened gun / sight | 1 / 2 / 3 | Station wheel |
| Gun bearing | Arrow keys | D-pad |
| Operational map | M | Square |
| Navigation hold | H | L3 |
| Bomb doors / salvo, in sight | B / V | L1 / R1 |
| Extinguisher | F | Circle |
| Jettison payload | Hold J for 1.5 seconds | Hold R3 for 1.5 seconds |
| Pause | Escape | Options |

Mouse hover changes menu focus. Keyboard arrows, Enter and Escape navigate menus. Controller navigation uses stick/D-pad, Cross and Circle. Settings includes flight inversion, aim sensitivity, caption size and independent audio controls.

On touch devices, drag the invisible left region to fly and the right region to aim. Context actions offer the threatened gun, firing, bombsight, release or home when useful. The menu exposes the map and emergency actions. Jettison requires a deliberate hold and can be canceled before it completes.

## Cooperation

Standalone supports two standard controllers, or keyboard/mouse plus one controller, with two native first-person views. Stations, ammunition, bombs, fuel and aircraft damage are shared. Selecting an occupied station requests a handover; select it again to exchange duties. The pilot holds flight-command permission. AI resumes vacated duties, and a remaining human can continue after a partner disconnects.

Remote two-person cooperation is provided through **AI Hub Session Protocol v1**, using the released client and shared-world authority. Host snapshots and validated commands feed the same simulation as standalone play. A playerless host runs simulation independently of rendering. Standalone does not supply an internet-room service.

## Developer tools and content

Pause → **Dev mode** exposes invulnerability, infinite stores, independent free camera, collision/attack/trigger visualization, beat jumps, fighter/flak spawning, subsystem damage and repair, pause/step, state export and deterministic restart. Live flight/combat/resource sliders have canonical reset values. Test runs are marked, and world-changing tools are unavailable during Hub rounds.

In free camera, WASD translates, Q/E changes height, the right stick turns, and fine aim accelerates movement. Mission authoring moves a waypoint and its associated target in metres, validates/imports JSON and exports the definition. Authored operation data lives in `content/mission.js`; original geometry/material/attachment documentation is in `content/art.md`.

## Build and verification

The supplied workstation already has Node, Bun, Ruff, browsers and Python Playwright. From this directory:

```sh
npm run build
npm run verify
```

`build` uses Bun to inline the complete native engine and locally pinned Three.js/Rapier dependencies into both delivery copies. `verify` rebuilds first and is the quiet entry point: it prints failures and a final count, and writes detailed evidence under `docs/verify/` and `tests/`.

Relevant subsets can be selected without rerunning unchanged coverage:

```sh
node tools/verify.mjs --suite=static,sim,package
node tools/verify.mjs --suite=browser
node tools/verify.mjs --suite=split
node tools/verify.mjs --suite=public
node tools/verify.mjs --suite=hub-unit,hub
```

Browser-only diagnostic filtering is also available:

```sh
/home/micha/.local/share/pipx/venvs/playwright/bin/python tests/browser-verify.py --cases=pause,touch,firefox
```

The public-operation test uses the real briefing, keys, mouse and map to fly the full sortie. Browser scenarios exercise menus, settings, credits, pause, live tools/editor, both couch configurations, glyphs, disconnect/handover, attract exits, touch multitouch/context/holds, native WebKit rendering, persistent first-person geometry in both split viewports, and a copied offline artifact. Hub verification uses the downloaded official harness with normal and impaired transport, departures and playerless authority. Audio checks inspect synthesized output rather than relying on a listener.

See `docs/testing.md`, `docs/acceptance.md`, `docs/CONTROLS.md`, `docs/research.md` and machine-readable result files for the actual evidence and limits. No physical controller, real phone, second human or listening test is claimed.

## Native technology and rendering

- my-3D2dge **0.89.1**, revision `8ecc2f62353761187bdfe226f327b7ea5d2eb691`, with its native World3D extension.
- Three.js **0.182.0** and Rapier **0.19.3**, locally bundled.
- Native fixed stepping, input/settings/menu foundation, humanoid portraits, material/shape registry and 3D pen.
- Original flight, shared station authority, swept projectiles, bomb ballistics, mission/scoring, AI, procedural sound and Hub transport adapter.

The default uses the engine’s native **WebGL 2** backend. An explicit `?backend=webgpu` exercises the native WebGPU diagnostic route. The supplied SwiftShader WebGPU route lost its device during an isolated scene test; the underlying cause is unknown. Incompatible renderers receive a useful support screen. A packaging compatibility shim supplies standard WebGPU enum constants when absent so the native WebGL path can initialize without a WebGPU implementation.

All visuals are code-authored geometry. Music, effects and crew gibberish voices are synthesized in code; music starts at 10% on a fresh device. Required MIT and Apache notices are embedded in the artifact and available from About/Credits. The original game is credited as inspiration without affiliation.

`content/credits.json` is the single source for the in-game Source Information, Testing Feedback, Engine Feedback and Prompt Feedback, and is copied to the root `exit-interview.json`. Usage is recorded as **added on import**.
