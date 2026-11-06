# Hockey Ruckus multiplayer

Researched 2026-11-05 from AI Hub's repository using the authenticated `gh` CLI:
- https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub
- README.md, session.js, bridge.js, round.js, harness.html.
- Protocol 1, unmodified embedded client version 1.4.0. `hub-session.js` must be the first script in `<head>`, immediately after charset. The game's renderer and physics can load afterward.

## Integration

`new HockeyNet({onStatus,onRemoteInput,onSnapshot,onStart,onDisconnect,onTimeUp,onEnd,onConnected,onSignal,onHub,onFinish})`.

`await net.init()` connects only when `AIHub.active`. `net.ready()` is called by the game after assets, renderer and physics have loaded, without needing any input. The hub owns its learning card and countdown; the game suppresses its title screen in this mode. `onStart` has `{hub,mode:'online',time:180,duration:180,turbo:false,theme:0,countdownMs,info}`. The game must not advance before hub time reaches zero. Call `net.finish(game.scores, stats)` once at game end; time-up invokes `onTimeUp` and has a fallback valid result from the last snapshot's scores. On `onEnd`, stop all input and all sound. Quit/restart menu actions must have no effect during a hub round. Holding Create (button 8) means Options (button 9) must be ignored.

The authority is `net.role==='host'`. Every other copy is a guest. `net.server` is true when the hub's authoritative copy has no local player; `net.team` is -1 in that case. It must still simulate the game and send snapshots, while team 0 and team 1 inputs arrive through `onRemoteInput(input,team,id)`. In normal hosted play team 0 is the host and team 1 the guest. `net.isHub` and `net.hub` are aliases. `players` contains current hub player ids/names/colors (insert their names only through textContent).

`net.sendInput(input)` and `net.sendSnapshot(snapshot)` may be called each frame; they send at 15Hz. Input is `{x,z,aimX,aimZ,shoot,pass,check,switch}`; shoot is held and pass/check/switch are latched across throttled sends so short taps survive. Monotonic sequence numbers discard stale packets. Host accepts input only from registered hub players; guest accepts snapshots only from the hub's host. Hub traffic uses only AIHub.send, and stops on end. Finish standings rank every present player once and exclude the server.

## Standalone

Quick room: `net.createLocalRoom()` (or `await net.createRoom({local:true})`) returns a six-character code. Another browser tab from the same origin joins with `await net.joinRoom(code)`. BroadcastChannel is intentionally same-origin and does not connect separate devices. `onConnected` tells both copies when ready. The host calls `net.startMatch(config)`; both copies get `onStart`. Host uses game snapshots, guest sends local input. Clean leave and heartbeat expiry notify `onDisconnect`.

Direct connection: `await net.createRoom()` creates a real WebRTC data channel and returns an HR1 invitation. Send that complete invitation to the other player using an existing communication tool. Guest uses `await net.joinRoom(invitation)`, which returns an HR1 answer. The host uses `await net.receiveSignal(answer)`. ICE candidates are gathered before generating each code, so no server is needed to exchange candidates. STUN uses Google's public STUN server; there is no TURN relay. Restricted NAT/firewalls may prevent direct connections; AI Hub or a shared LAN is the fallback. No WebRTC, STUN or BroadcastChannel is created during AI Hub sessions.

`net.getSignal()` returns the current full invitation/answer. Signaling methods throw readable errors for invalid codes. `net.leave()` cleans up only the game's own peer connection/channel/timers and is disabled in Hub rounds.

## Checks

Run: `/home/micha/.local/share/pipx/venvs/playwright/bin/python network-dev/test-network.py`

9/9 checks passed in real headless Chromium, using two tabs and actual browser transports:
1. Quick-room handshake and shared start.
2. Bidirectional quick-room input and snapshots.
3. Short pass/check/switch taps survive 15Hz throttling.
4. Quick-room disconnection.
5. Real WebRTC invitation/answer connection and shared start.
6. Bidirectional WebRTC input and snapshots.
7. Invalid signaling validation.
8. Fake AI Hub dedicated server lifecycle, team mapping, valid standings, no traffic after end.
9. Fake AI Hub time-up produces a valid result using cached scores.

No application defects were found by these checks. One syntax-check invocation used Node's CommonJS default and was corrected to `node --input-type=module --check < network.js`; this was a test-command configuration error, not a game defect.

The official harness and its dependencies are present here as `harness.html`, `bridge.js`, `round.js`; the final assembled game still needs official harness runs for standard, degraded network, host-leave and dedicated-server scenarios.

## Final assembled-game validation

The assembled single HTML was tested with real WebGPU SwiftShader (not a WebGL substitute). Final tested application SHA-256: `bbd6c11457dca251f4216b866128aee13f38d0127fdc74bcea480395158a0b59`.

`test-hub-game.py`: **9/9 passed**. Official Hub harness passed normal, latency 150ms/jitter 50ms/loss 5%, host-leave, and dedicated-server cases. Every remaining copy initialized WebGPU, advanced frames, and ended in final state. Explicit post-end title/back/pause/Escape/activity attempts did not restart the game or music. Actual two-page standalone game verified shared start, guest keyboard movement on the host, authoritative score/clock replication, guest-disconnect host AI continuation, and host-disconnect guest AI continuation. Guest recovery preserves a loose puck's authoritative Rapier position at x=7,z=4 and restores offline team 0. No page errors or failed requests occurred.

`test-network.py`: **9/9 passed** after final input transport changes. The short-action check now includes shoot as well as pass/check/switch, verifying taps survive throttled frames. This suite also tests actual WebRTC signaling/data transfer with two browser tabs.

Review identified and the main implementation corrected guest physics synchronization on authority takeover, guest offline team/HUD reset, wrong-team AI replacement in dedicated-server disconnects, and Hub end/back/input guards. Ignoring Options while Create is held was also aligned with the protocol. The final runnable checks did not encounter additional product defects. A first assembled-game run was interrupted during a previously known broken-build boot; that boot failure is the same bundling defect diagnosed by the main agent, not a separate networking issue.

All test HTTP servers bind to 127.0.0.1 on an OS-selected port. Each run closes its own browser and server.
