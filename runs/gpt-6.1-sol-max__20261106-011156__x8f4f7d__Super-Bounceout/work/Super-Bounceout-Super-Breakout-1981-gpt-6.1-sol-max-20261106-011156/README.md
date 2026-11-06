# Super Bounceout

Make a little space. A complete four-sector paddle arcade game inspired by Atari’s 1981 home version of Super Breakout.

The deliverable is the HTML file beside this directory. Open it directly in a current browser. Three.js r180 and Rapier 2D 0.19.3 load from pinned CDN URLs; Google Fonts supplies the display fonts. The game uses WebGPU by default, with Three.js’s native WebGL 2 compatibility backend. Internet is required to download these dependencies. No installation or game server is required for solo or couch play.

## Play

| Input | Move | Serve / timed POP | Pause |
| --- | --- | --- | --- |
| Standard controller | Left stick or D-pad | Cross / A | Options / Menu |
| Keyboard | A/D or arrows | Space | Esc / P |
| Mouse | Move over the field | Click the field | Menu |
| Touch | Drag anywhere on the field | Tap to serve; POP timing is assisted | Menu |

Couch co-op: Pilot 1 uses A/D, mouse, or the first pad. Pilot 2 uses arrows and Enter, or a second pad. The two pilots control separate stacked paddles and share the campaign and serves.

The four sectors introduce classic brick clearing and ceiling shrink, captive balls and scoring multipliers, Double’s twin-ball play, and Progressive’s advancing walls. A timed POP gives 2.4 seconds of powered returns, adjacent-brick damage and double points, with a three-second recharge. When eight or fewer bricks remain, a POP also aims toward a remaining brick. Cruise provides a slower ball and wider paddle without ceiling shrink. Each cleared field gives an extra serve, up to seven.

After ten idle seconds on the title or its information/settings menus, attract mode plays the game and rotates through the variants. Any input returns to the title. A private-room lobby stays open while waiting for other pilots.

Pause → Developer Tools exposes ball speed, paddle size/speed, POP timing, wall interval and simulation speed. It also includes default reset, single stepping, physics lines, infinite serves, autopilot, additional balls/serves, captive release, field clear and stage skip. Developer flights do not save personal bests.

## Multiplayer

AI Hub uses the official, unmodified session client 1.4.0 and Protocol v1 ghost mode. Each of 1–4 players plays a separate field; ghost paddles, progress and scores travel through the Hub. The game handles start countdown, player departure, time-up, results and end. There are no standalone signaling connections in a Hub session.

Outside the Hub, Online Race creates or joins a six-letter private room via PeerJS 1.5.5 and WebRTC. Up to four players race for score. The host launches, all players see remote paddles and scores, and the host can rematch after everyone finishes. Signaling needs internet; connections across different NAT/firewall configurations remain unknown. Two browser pages on this computer were successfully tested using real public signaling and a real local WebRTC data channel. No microphone, chat, account or custom names are used.

## Build and verify

From this directory:

```sh
python3 build.py
./tests/run.py --visual
```

The single test command prints only failures and its final count. It starts and stops its own server on an OS-assigned localhost port, uses one browser at a time, and closes its pages. Omit `--visual` to skip screenshot artifacts. The Python entry point uses this workstation’s existing Playwright environment; no browser installation is needed.

Tests include the full four-sector AI physics playthrough, real WebGPU pixel readback, keyboard/mouse/gamepad controls, PS/Xbox glyphs, pause, live developer tuning, offline audio samples, touch assistance, portrait camera bounds, attract mode, completion/replay, `file://` with real CDN dependencies, three official Hub harness scenarios, and a two-page standalone room including results and rematch. Final verification: **43 checks passed, 0 failed**. Each of the three official Hub scenarios also passed its 15-check protocol checklist. Test reports and visual artifacts are in `tests/`.

The individual source files are concatenated into one module by `build.py`. Their shared bindings are intentional; the lint configuration disables unused-binding warnings across those concatenated files. `config.js` contains stage descriptions, balance defaults and the palette; `physics.js` constructs the fields and owns rules and Rapier contacts. The renderer, sound rack, transport and UI are separated into the other JavaScript files.

The root `exit-interview.json` and the game’s About/Credits screen contain the same source information and feedback. Usage is recorded as `added on import`.

