# Network integration

`hub-session.js` is the unmodified official AI Hub Session Protocol v1 client 1.4.0, downloaded 2026-11-05. Inline it as the first head script immediately after charset. `net.js` exports `createNetwork(callbacks)`. No sockets, PeerJS, or BroadcastChannel are created when AI Hub is active.

Required head metadata:

```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Catch all three crooks together before closing time">
<meta name="hub:session-howto" content="Move with stick or A/D; Cross or Space jumps; down ducks; up uses lifts">
<meta name="hub:session-minutes" content="5">
```

Call `await net.initHub()` after engine initialization. It calls connect, registers events, and calls ready without any player gesture. A non-null result means Hub mode; hide all title prompts and wait for onStart. It fires at the shared clock's zero, after the three-second countdown. `net.server` is true for a host copy without a local player; run the simulation and show it, but generate no local input. `net.me` is the stable seat index, or -1 for that server.

Standalone: `await net.host()` creates a six-character room and opens PeerJS 1.5.5 signaling. `await net.join(code)` joins. The room opens on the public PeerJS service, using direct WebRTC data channels; same-origin tabs connect directly using BroadcastChannel. PeerJS is loaded from jsDelivr only on standalone Create/Join actions. Status explains if only local tabs are available. Up to four officers share a room. Host calls `net.start({count:net.players.length})`. This invokes onStart on host and guests. Do not also start a second game outside the callback.

Simulation: call `net.sendInput(input)` from a guest each animation frame; call `net.sendState(snapshot)` from a host each animation frame. Both throttle internally to 14.3 messages/second, below Hub's 20. Input fields are `{x,jump,duck,up,down,action}`; x is clamped, jump/action/up/down taps are retained across throttled frames. Full snapshots must stay below 16KB. Only host simulates the world. Guests display snapshots.

Callbacks: onStatus({role,status,code,players,me,server,hub,started,transport}); onStart(info); onInput(input,stableSeatIndex); onState(snapshot); onFinish({score,won}) for standalone guests; onTimeUp({graceMs}); onEnd(reason); onLeave({id,seat,reason}); onDisconnect({wasPlaying,role}). Roles are offline/host/guest. `isHost` is true offline, allowing the ordinary game loop. `players` contains `{id,name}` (and Hub colors in a session); insert names using textContent. In standalone rooms seats are 0..3 and stay stable while a round runs. A player leaving may create a gap; use `p.id` for a standalone seat, and the initial Hub player ordering for Hub seats.

Finish: host calls `net.finish(score,won)`. Hub gets one tied team standing including every remaining player, equal scores, and a team win/loss. Standalone guests get onFinish. On Hub time-up, finish immediately; on Hub end, stop all input, simulation, network, and audio. Hub owns restart/quit/title and Create+Options; ignore Options while Create is held. `net.leave()` is disabled in Hub sessions.

Official harness files are included for local testing: harness.html, bridge.js, round.js. `net-hub-test.html` exercises the network module alone. The final game should also pass the harness itself. `test-network.py <URL-of-net-test.html>` runs the standalone browser checks, printing only failures and one count line.
