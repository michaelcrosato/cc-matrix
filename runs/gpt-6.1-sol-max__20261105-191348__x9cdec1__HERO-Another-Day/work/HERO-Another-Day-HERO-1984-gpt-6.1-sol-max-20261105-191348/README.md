# H.E.R.O. Another Day

Open the HTML beside this folder. The complete solo game and two-player couch mode work directly from `file://`, without downloads. Three.js r180, Rapier 0.19.3, procedural art, animations, music, effects, voices, and the AI Hub session client are embedded.

## Play

Rescue PIP, DOT, and GUS, one miner per tether. Bring each back to LAST LIFT on the surface. Green stations restore the whole kit. Amber passages need a charge; charges attach to nearby rubble. Move clear of the 1.7-second fuse. Ledges restore fuel, water drains air faster, and the bottom chamber has lava and cycling steam.

| Action | PlayStation / standard pad | Keyboard and mouse |
|---|---|---|
| Move | Left stick | A / D; arrows in solo |
| Jetpack | Cross / L1 | Space / W |
| Aim | Right stick | Mouse |
| Pulse | R2 / R1 | Left click / J |
| Charge | Square | E / right click |
| Rescue / supplies | Triangle | F |
| Pause | Options | Escape / P |

Settings switch PlayStation and Xbox glyphs. Music starts at 10%. Touch uses invisible left and right sticks: left moves and flies; right aims and fires. Rescue is assisted, and a contextual charge button appears beside rubble.

Couch player two uses a second controller, or arrows to move, Right Ctrl to fly, Enter to fire, Right Shift for a charge, and `/` to rescue. The shared camera follows player one; stay together.

## Co-op

The standalone Co-op Crew screen hosts or joins a six-character room. Same-browser tabs use BroadcastChannel. Other devices use PeerJS 1.5.5 and WebRTC through the public PeerJS signaling service, loaded only when opening an online room. Cross-device online play needs a network connection and WebRTC access. The room screen reports whether the broker connected. The host owns simulation and sends snapshots; joining players send controls. There is no chat or custom-name communication.

AI Hub uses its unmodified session client 1.4.0, shared-world mode, 1–4 seats, synchronized starts, host authority, late/left players, a playerless host, and team results. Session network traffic goes only through AI Hub.

## Developer tools

Pause → Developer tools. Live controls cover horizontal speed, jet acceleration, fuel and air drain, damage, blast radius and creature speed. The bench also has invulnerability, flying through walls, refill, sector warps, clear rubble and reset defaults. Room clients use the host's balance. Tuned or developer shifts do not set a best time.

After ten idle seconds on the title screen, a looping AI pilot demonstrates the three rescue routes. Any input returns to the title.

## Build and test

```sh
npm run --silent build
npm run --silent test
```

The test command starts its own HTTP server on `127.0.0.1` with an OS-assigned port, closes its browser and server, and prints only failures plus one count. It checks the single HTML from `file://`, with drawing suspended for state checks, physical controls and the complete default-balance campaign, menus, gamepad, audio, local network co-op, multitouch, and the official AI Hub harness with two and four players, loss/jitter, host departure, and a playerless host. Tests use the Playwright Python environment supplied on this workstation.

`npm run --silent test -- --visual` also saves 1920×1080 compatibility-renderer screenshots. `?state-test=1` suspends drawing for automated state checks; `__game.testing.render()` draws a verification frame. This machine's software WebGPU adapter can lose or stall its device even on a minimal cube. The game uses WebGPU on hardware adapters, selects Three.js's WebGL compatibility backend for known software adapters, and rebuilds its canvas in compatibility mode after a reported hardware device loss. `?renderer=webgpu` forces the native path; `?renderer=webgl` explicitly selects the compatibility backend for visual inspection. Actual hardware WebGPU, physical controllers and cross-internet connectivity are unknown here.

`tests/campaign.js` flies the entire campaign with physical controls and default values: no teleport, invulnerability, no-clip or balance changes. Targeted component checks use developer positioning to isolate a hazard or mechanic.

## Sources and licenses

Source inspiration: H.E.R.O. (1984), from native model knowledge. No source-game assets or audio files are used. The explicitly supplied AI Hub integration specification and client/harness were downloaded; there was no internet search or source-game research.

Three.js is MIT licensed, Rapier is Apache 2.0 licensed, and the optional PeerJS client is MIT licensed. Required source metadata and the testing, engine and prompt exit interviews appear in About / Credits and in `../exit-interview.json`.
