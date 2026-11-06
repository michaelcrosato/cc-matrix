# Jungle Scurry networking

The official **AI Hub Session Protocol v1** client is `hub-session.js`, downloaded unmodified from the exact integration repository specified in the prompt. Its version is 1.4.0. Inline this source as the FIRST script immediately after `<meta charset>` in the final single HTML, before import maps or other scripts. The official harness is `harness.html`, with its sibling dependencies `bridge.js` and `round.js`.

Required metas: `hub:session=1`, `hub:session-players=1-2`, `hub:session-mode=shared-world`. Add concise goal/howto and optional session-minutes, and `hub:webgpu=required` if applicable. AI Hub supplies the pre-round card; do not show title or attract mode while `AIHub.active`.

## Module API

`new ExpeditionNet({onStatus,onState,onInput,onStart,onEnd,onTimeUp,onLeave,onJoin,onFinish})`; all callbacks can also be reassigned as properties.

- `await init()`: connects to Hub if present, otherwise remains solo. Returns Hub info or null. Call before loading world. `ready()` after resources load, without waiting for input.
- `mode`: solo, hub, room, webrtc. `hubActive`, `isHost`, `server`, `connected`, `me`, `players`, `status`, `started`, `ended`, `time`, `canPlay`.
- `onStart(info)`: reset world and hide menus. In Hub it fires for the THREE SECOND countdown; run simulation only while `canPlay` (`AIHub.time() >= 0`). Standalone starts immediately.
- `sendInput(input)`: route local controls to host; in host invokes `onInput(input,me)` directly. Server copy ignores local controls. Remote transport throttles to ~15 Hz. Use force for edge changes if desired, but total Hub traffic must remain <=20 messages/sec. Host should hold remote controls between updates and clear them after a timeout.
- `sendState(snapshot)`: host-authoritative JSON snapshot at ~14.7 Hz. Host must simulate ALL players. Guests ONLY render snapshot, never simulate independently. Keep snapshots below 16 KB; ~1200 bytes is ideal for unreliable transport.
- `onState(snapshot)`: guest apply/render authoritative state.
- `onTimeUp()`: host calls `finish({scores,won,stats?})` immediately. All players tie as a team. `finish` is idempotent.
- `onEnd(event)`: stop simulation, input, and sound (Hub only). Never offer restart/quit/title in a session.
- `onLeave({id,reason})`: remove departing remote actor. Hub host leaving voids the round automatically.
- `hostRoom(code?)` returns camp code; `joinRoom(code)` connects a second same-origin tab. Nearby play is **same browser origin** (e.g. two tabs on one device), not an internet relay. `onJoin` fires on handshake. Host calls `begin(payload)` to launch both copies or restart a standalone expedition.
- `createOffer()` returns code. Guest `acceptOffer(code)` returns reply. Host `acceptAnswer(reply)` completes WebRTC negotiation. Copy/paste UI belongs to main. Options can supply `iceServers`; defaults use Google/Cloudflare STUN. Actual internet/NAT traversal without TURN is unknown; direct LAN and same-machine peers are tested.
- `leave()` tears down standalone transport and returns to solo. In Hub it is ignored. Do not create BC/WebRTC while in Hub.

## Verified transports

Node BroadcastChannel smoke: 6/6, including handshake, start, two-way controls/snapshot, team finish, guest leave.

Chromium WebRTC loopback smoke: 7/7, including same checks with real RTC data channel and host-only ICE candidates (no STUN necessary locally). `network-smoke.py` performs that test. Integrate into unified project test command by supplying `GAME_TEST_ORIGIN` pointing at the project server. It prints only failures and one count line. Official game harness remains for main integration once the complete HTML exists.

No issues were caught by these transport smoke checks. No physical controller, remote human/device, or NAT-restricted internet route was available to verify.
