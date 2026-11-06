# E.T. the Extra-Lost-and-Found

Open the HTML beside this folder. Internet access loads the pinned engine dependencies and optional fonts; all game code, geometry, textures, animations, sounds and Hub client are contained in that single file. It also runs through file://.

A complete adventure: befriend the visitor, gather three transmitter parts, sneak past searchlights, heal flowers, lift a crate, distract adults with candy, play the signal, ride the bicycle, fly through four rings, and say goodbye. Getting caught preserves your discoveries.

## Controls

- Keyboard: WASD move; E interact; Space heartlight / hold to rise in flight; Shift sneak / pedal harder; Q candy; Tab map; Esc pause.
- Pointer: drag to look, click ground or an objective to walk, click prompts and menus.
- Standard controller: left stick move, right stick look, Cross interact, Square heartlight, Circle sneak, R1 candy, R2 pedal harder, L1 map, Options pause. Hold Cross to rise in flight. Settings can show Xbox symbols.
- Touch: an invisible left thumb stick moves, right thumb looks; nearby environmental powers are assisted; contextual prompts pop up. In flight, altitude follows the next ring.

After ten idle seconds on the title, the actual gameplay autopilot runs a looping attract tour. Any input returns to the title.

The pause menu includes Developer mode: four live balance sliders, reset defaults, capture immunity, frozen patrols, resource refills, Rapier collision lines, chapter jumps and autopilot. Settings include music, effects/voices, camera speed, controller symbols, reduced motion and fullscreen.

## Multiplayer

AI Hub Session Protocol v1, ghost mode, 1–4 players. The stock client is embedded without edits. Hub rounds use only Hub networking, report progress and results, handle departures and time-up, and stop input and audio at end.

On its own, Ride with friends creates or joins a four-digit room using PeerJS 1.5.5 WebRTC signaling. Same-origin tabs also use BroadcastChannel. Riders appear as colored ghosts and compete for the fastest homecoming; they cannot collide, chat or change names. The host starts rides and rematches. If the host leaves, guests can continue solo. Public signaling availability and independent WAN/NAT traversal depend on the players’ networks.

## Build and test

From the workspace root, run `python3 <this-folder>/build.py` to regenerate the root HTML from these source files and `exit-interview.json`.

Run `./<this-folder>/test`. To repeat one area, use `./<this-folder>/test --only touch` (or another group-name fragment). It prints failures and one count, starts its own loopback server on an OS-assigned port, verifies the game’s identity, and closes its browser and server. Browser temporary data stays under this folder. It covers the package, file protocol, WebGPU initialization, physics, a complete fixed-step playthrough, melody mistakes, recovery, controller emulation, multitouch, offline synthesized audio samples, local multiplayer, a separate-origin WebRTC probe, and the unchanged AI Hub automatic harness for 2 players, 4 players with loss/jitter, and host departure.

`test-report.json`, `playthrough.json` and `hub-*.json` record the most recent run. Screenshots document title, flight, ending and touch presentation; game state is used for functional assertions. The WebRTC probe records unknown when the public signaling service cannot be confirmed.

Full Source Information and all exit-interview answers are in the root JSON and the in-game About screen. No external art or audio assets are used.
