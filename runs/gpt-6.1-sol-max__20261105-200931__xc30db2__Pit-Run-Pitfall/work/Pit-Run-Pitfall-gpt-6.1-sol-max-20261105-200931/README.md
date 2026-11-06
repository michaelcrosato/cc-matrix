# Pit & Run

Six treasures. One sunset. Still got the hat.

Open **../Pit-Run-Pitfall-gpt-6.1-sol-max-20261105-200931.html** in a current browser. It is a single-file release; the pinned Three.js and Rapier libraries download from jsDelivr. WebGPU is the default renderer, with a WebGL 2 compatibility path.

## Play

- Move: WASD / arrow keys / left stick.
- Jump: Space / Cross / A. Release early for a shorter hop.
- Vines catch airborne scouts automatically. Jump again to release; move to pump.
- Ladders: up/down, or E / Square / X to traverse automatically.
- Pause: Escape / Options. Menus also support arrows, Enter, mouse hover/click and touch.
- Touch: drag on the left; tap on the right. A contextual ladder button appears nearby. Edge jumping is assisted.
- Six large glowing treasures open the eastern gate. Two are underground. Small caches are optional score.
- Flags refill hearts and update the shared checkpoint. Falls cost five seconds; co-op rescues cost eight more.
- Couch co-op: choose 1–4 scouts. Scout 1 uses WASD/Space/E; scout 2 arrows/right Shift/right Ctrl. Each gamepad takes the corresponding seat.

## Multiplayer

AI Hub sessions use Session Protocol v1 shared-world mode for 1–4 scouts, including dedicated server mode. The host simulates the world. Other copies send inputs and receive authoritative snapshots. The bundled session.js is unmodified.

Outside AI Hub, **Bring a friend → Link two devices** supports a direct two-player WebRTC expedition. The host sends the invite; the guest returns a reply; the host pastes it. Both keep the page open. This has been tested with two local browser pages; connectivity between unrelated Internet networks is unknown and depends on their NAT/firewall rules. Use AI Hub where direct links are blocked.

**Same-browser expedition** uses BroadcastChannel. Serve both copies from the same local address and choose the same camp name.

## Developer tools and authoring

Pause → Developer camp exposes run speed, jump impulse, gravity, hazard rhythm, daylight budget and simulation speed. Sliders apply immediately. There are invulnerability, free flight, collision geometry, telemetry, region travel, health/time refills, all-treasure unlock and reset-to-defaults tools. These tools are available to the standalone host.

Level data and treasure/camp/ladder definitions live at the top of world.js. The six regions are authored as reusable geometry builders. Player animation clips live in graphics.js. Game rules and physics are in game.js; controls, menus, audio and networking have their own source files.

## Build and verification

Build from this directory:

    node build.mjs

One verification command:

    bash test.sh

For updated visual-review captures:

    bash test.sh --visual

Tests use the installed Python Playwright environment, cached dependency copies and an automatically allocated loopback port. No server or browser remains running afterward. The command prints failures and a single count. Details go to test-results.json. It covers native WebGPU startup from file://, physics/traversal/hazards, a full controller playthrough with invulnerability (no developer travel), keyboard, an emulated standard gamepad, multitouch, audio synthesis, standalone WebRTC and four official AI Hub harness cases. The continuous bot enables invulnerability to remove damage variance; it still uses normal collision, running, jumps, vines and ladders.

Visuals are captured with ?renderer=webgl because this machine's software WebGPU canvas can be blank in screenshots. This optional URL parameter selects Three.js's compatibility backend; the default game and automated state tests use WebGPU.

Source information and feedback are embedded in About and in ../exit-interview.json. Usage is intentionally “added on import”.
