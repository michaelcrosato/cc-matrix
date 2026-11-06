# H.E.R.O. After Hours

Open the HTML in the parent directory in a current browser. The delivered file is self-contained: Three.js, Rapier/WASM, the AI Hub session client, geometry, fonts rendered by canvas, animation, music, effects and voices are all embedded or generated in code. No runtime downloads or server are required for standalone play. WebGPU is primary; WebGL2 starts automatically if WebGPU is unavailable and can recover a lost GPU device.

Clock in for four descents and eight rescues. Fly with the prop-pack, shoot critters, blast or melt barricades, conserve power, protect lamps, and avoid lava, hot rock, tentacles and crushing gates. Riding the heat-proof raft saves power. Stand near a miner to secure their rescue balloon. Every rescue sets a checkpoint and restores some equipment. Completing a descent refills the kit. The pause menu contains a field guide, settings, credits and the live dev bench.

- Pilot 1: WASD / arrows, Space to fly, F or mouse to fire, E or right mouse to plant dynamite. J also fires in solo. Mouse aims.
- Pilot 2: IJKL (I flies), N fires, M plants dynamite. Choose “Bring a colleague” on the title screen.
- Standard controllers: left stick moves (up also flies), Cross/A flies, R2/RT fires, Square/X plants dynamite, right stick aims, Options/Menu pauses. Two pads work locally.
- Touch: drag the invisible left stick to move, hold a finger on the right to fly. Laser targets assist automatically. A dynamite action appears near barricades. The small menu button opens all menus.
- Menus: D-pad/left stick or arrows, Cross/A/Enter selects, Circle/B/Escape returns. Left/right tunes focused sliders; right stick or Page Up/Down scrolls credits.

Music defaults to 10%. Settings and legitimate best scores persist locally. Opening the dev bench marks the shift as practice. After ten idle seconds on the title, a looping AI demonstration begins; any input returns to the title.

AI Hub: 1–4 players share one authoritative world. The unmodified protocol-v1 client 1.4.0 is the first script in the document. The host may have no player seat. Input/state/effects use AIHub.send; the host reports a team result. Create + Options remains available to the Hub. Standalone multiplayer is local shared-screen co-op for 1–2; internet co-op is through AI Hub.

To rebuild after editing the authored modules:

```sh
npm run build
```

Run all verification with one command:

```sh
./check
```

It prints only failures and a one-line count. Suites can be selected with `./check --suite smoke`, `mechanics`, `hub`, or `visual`. The tests use the workstation's installed Playwright Python environment. The Hub tests start and shut down their own HTTP server on 127.0.0.1 with an OS-selected port and confirm its game title. No shared ports or processes are modified. Screenshots and structured reports are under `tests/`.

The physical campaign pilot uses invulnerability while retaining Rapier collisions. The attract replay uses the permitted flight/no-clip cheats. Neither automated traversal claims human play-balance validation. Physical controllers, real phones and human listening are unknown. Controller input is emulated; touch is checked with a browser phone profile; synthesized audio is measured with an analyser.

Authored levels live in `levels.js`, and balance defaults live in its DEFAULTS object. `DESIGN.md` records source research and design choices. `credits.json` supplies the in-game credits and the root exit interview. Third-party notices are embedded in the final HTML.
