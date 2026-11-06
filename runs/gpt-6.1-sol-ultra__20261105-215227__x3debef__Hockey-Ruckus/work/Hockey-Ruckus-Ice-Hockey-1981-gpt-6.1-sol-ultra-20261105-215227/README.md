# Hockey Ruckus

Open the HTML in the parent folder. The game, Three.js r180, Rapier 0.19.3, generated art and audio are bundled into it. An optional Google Fonts stylesheet supplies Barlow; system fonts work offline. WebGPU is preferred, with WebGL 2 fallback. `?webgl=1` explicitly chooses the fallback.

## Play

- **Ruckus Cup:** beat three home teams on regular and turbo ice. The champion badge saves locally. Losing offers a rematch at the same rink.
- **Quick Match:** a classic three-minute game, regular or turbo, with sudden death on a tie.
- **Practice:** five guided drills teach skating, passing, shooting, checking and scoring.
- **Versus:** two local players, AI Hub online sessions, same-origin tab quick rooms, or direct WebRTC invitation/answer.
- **Attract:** ten seconds without title-screen input starts AI play; any input returns to the clubhouse.

Standard controller: left stick skate; right stick aim; Cross/A hold-release shot; Square/X pass; Circle/B check; Triangle/Y switch; Options/Menu pause. Settings select PlayStation or Xbox prompts. Keyboard: WASD, Space, E, Shift, Q, Esc; mouse aims/clicks to shoot and right-click passes. Player two uses arrows/J/K/L/U. Touch uses an invisible left thumbstick and a contextual hold/release shot or check button.

Pause → Dev Bench exposes skate speed, shot power, ice drag, check stun, AI skill and clock rate. Includes defaults, puck reset, goals and end-match tools. Dev tools are unavailable in multiplayer.

## Multiplayer

**AI Hub:** first-head-script Session client and protocol metadata are embedded. Shared-world host authority supports normal player-host and dedicated-server sessions. The game readies itself automatically, follows Hub time, exchanges 15 Hz input/snapshots and reports standings. Hub owns the round lifecycle.

**Quick room:** open two copies under the same origin/device. Host creates the six-character code; guest joins it. Host starts the match. Browser BroadcastChannel is used, so this is explicitly for same-origin tabs.

**Direct online:** host selects Make Invitation and sends its connection text. Guest pastes it and selects Join Invitation, then sends its own answer text to host. Host pastes that answer and selects Accept Answer, then Start Match. Uses WebRTC data channels and STUN; no hosted signaling or TURN relay. Connectivity through restrictive NAT is unknown; use AI Hub or a LAN there. Disconnects offer an AI continuation.

## Build and test

`npm run build` regenerates the parent HTML and `exit-interview.json`. `npm test` runs all automated checks sequentially and prints only failures plus a single count. Python Playwright is expected at the workstation's documented pipx location; override `PLAYWRIGHT_PYTHON` elsewhere. No browser download is performed. Test HTTP servers bind 127.0.0.1 on OS-selected ports and shut themselves down.

The tests cover native WebGPU boot, actual simulated gamepad and keyboard/mouse/touch input, all practice lessons, all three cup rounds and retry/save, developer tools, settings, attract mode, credits, offline audio samples, Rapier trajectories, pass/check/save/angles/overtime, direct WebRTC, short input taps, the official AI Hub harness with latency/jitter/loss and dedicated server, and symmetric disconnect recovery. Visual composition was inspected separately using WebGL 2 screenshots because headless WebGPU captures can be blank.

`PLAN.md` records design and source research. `title-selection.json` records all 50 silently brainstormed candidates and the random choice. `metadata.js` generates the About screen and the root exit interview. User input and balance variables stay in ordinary editable modules; `build.mjs` packages them.

Actual controller hardware, listening, physical touch devices, real iOS Safari and cross-internet NAT behavior are unknown.
