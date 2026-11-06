# Ka-Whoosh!

**A little panic. A lot of splash.**

A complete six-shift rooftop arcade game inspired by Kaboom! (1981). Catch bombs with three stacked water tubs, build a perfect-catch multiplier, collect gold and spend your emergency douse. Solo, two-player couch co-op and online score races are included.

Open `../Ka-Whoosh-Kaboom-1981-gpt-6.1-sol-max-20261105-191412.html` directly in a browser. The HTML embeds Three.js r180, Rapier 0.19.3, the AI Hub session client, fonts, geometry and all synthesized audio. It needs no asset server or CDN. WebGPU is preferred; Three.js's WebGL 2 backend covers unsupported or lost graphics devices.

## Controls

- Move: left stick, D-pad, A/D or arrows, mouse position, or touch drag.
- Emergency douse: Cross / Xbox A, Space, left click, or a second touch.
- Pause: Options / Escape / P. F toggles fullscreen.
- Couch co-op: P1 uses A/D and Space or controller 1. P2 uses arrows and Enter or controller 2. Both share the score and douse meter.
- Menus: D-pad or left stick, Cross / A to choose, Circle / B to return. Right stick scrolls long panels; keyboard arrows and Tab also work.

After ten seconds without input on a title/menu screen, the arcade attract replay starts. Any input returns to the menu.

Pause → **Dev workshop** exposes invulnerability, auto-catch, physics sensor overlay, wave selection, bomb spawns, tub/charge refills and a fast finish. **Balance sliders** adjust fall speed, drop frequency, tub width, move speed, gravity, douse recharge and simulation speed. Reset restores the original balance. Developer shifts are unranked; tools are unavailable in network races.

## Multiplayer

AI Hub uses its unmodified session client 1.4.0 and protocol v1 in **ghost** mode for 1–4 players. The game readies automatically, honors the Hub clock, sends rival tub state and progress, reports scores on completion or time-up, removes departing ghosts and stops on `end`.

Outside AI Hub, **Race a friend** connects two copies through a WebRTC data channel. Host creates and sends an invite; friend pastes it and returns the reply; host pastes that reply and starts the race. No game server or account is needed. STUN helps direct connections; restrictive NAT/firewall combinations without a direct route need AI Hub, because this game does not supply a TURN relay.

## Development

Use the already-installed Node toolchain:

```sh
npm ci --ignore-scripts
npm run build
npm --silent test
```

The build writes the single HTML and `exit-interview.json` in the parent workspace. The test command prints failures and one final count. Its static harness server binds `127.0.0.1` on an OS-assigned port and is stopped by its own process handle. Tests use the preinstalled Python Playwright environment; browsers are not downloaded. Each major device phase and every Hub scenario uses a fresh browser process so software graphics resources do not accumulate between scenarios.

The suite covers a complete six-shift Rapier playthrough, scoring, losses, gold, douse, co-op sensors, deterministic seeds, keyboard, emulated standard gamepad, touch, pause/dev tuning, settings, attract behavior, Web Audio signal, real two-page WebRTC pairing/results, AI Hub conformance with latency/loss and host departure, compatibility rendering and portrait WebKit. Browser evidence and visual-review captures are in `tests/artifacts/`. Headless WebGPU screenshots/readback are unreliable on this machine; its renderer state is checked and the same scene is visually inspected through the compatibility backend.

The supplied integration contract and library packages were downloaded directly. No web research was performed. Title selection used a real OS-backed random draw among 50 candidates; the draw is recorded in `title-draw.json`.

Source details and the exit interview are also available in-game through **About**.
