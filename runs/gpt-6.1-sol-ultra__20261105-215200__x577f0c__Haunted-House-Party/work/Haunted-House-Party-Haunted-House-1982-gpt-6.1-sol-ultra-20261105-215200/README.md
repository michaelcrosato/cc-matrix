# Haunted House Party

An original isometric survival-horror puzzle adventure inspired by Atari's Haunted House (1982).

Open the single HTML file in the parent folder. It also runs from a static web server. The initial load needs an internet connection for Three.js r180, Rapier 0.19.3 and optional fonts. All game logic, geometry, textures, animation, sound synthesis, UI and the AI Hub client are inside the HTML. WebGPU is preferred; Three.js provides a WebGL 2 fallback.

## Play

- WASD / left stick: move. Mouse: click to walk through a navigable route.
- Space / Square: strike a match.
- E / Cross: contextual pickup, swap, lock, stairs or exit.
- Shift / Circle: dodge. Q / Triangle: drop the held object.
- Tab / L1: house journal. Escape / Options: pause menu.
- Local player 2: arrows, Enter, right Shift, /, Backspace; or a second standard gamepad.
- Touch: drag anywhere to move; light is automatic. Tap contextual actions; double-tap to dodge.

Find the key in the Foyer, open the east wing upstairs, and find three urn fragments across the upper three floors. Carry urn pieces to join them. The attic vault requires two joined pieces. Escape through the front door with the completed urn. The moon scepter protects its bearer, but each player can carry only one object. Nine shared nerves are all you get.

The title starts an AI-played attract loop after ten idle seconds. Any input returns to the title. The pause menu contains live balance sliders and developer tools, including floor warp, invulnerability, reveal, urn assembly, door unlock and restoring nerves.

## Multiplayer

Bring a friend starts two-player shared-screen play. Play online creates a six-character room code for up to four players. Internet play uses PeerJS/WebRTC, with a BroadcastChannel transport for tabs on the same origin. No chat or voice is transmitted. In AI Hub, shared-world play uses the official Session Protocol v1, host authority and the hub's transport, timing and results. The official session client is pasted unmodified as the first head script.

## Build and verify

`python3 build.py` rebuilds the single HTML in the parent directory from these development sources. `./test.sh` runs the headless checks and prints failures plus a one-line count. Tests use only an OS-assigned loopback port and stop their own HTTP server/browser processes. Detailed results and diagnostic images remain in this folder. Add `?renderer=webgl` to the game URL for a software-browser screenshot diagnostic; the default renderer requests WebGPU.

`exit-interview.json` in the parent folder contains catalogue metadata, source information and feedback. `credits.json` mirrors that information for the in-game About screen. Usage is added on import.
