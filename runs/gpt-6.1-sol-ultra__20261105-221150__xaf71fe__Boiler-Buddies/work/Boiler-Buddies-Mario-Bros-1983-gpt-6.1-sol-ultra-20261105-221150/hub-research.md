# Network integration research

Researched 2026-11-05 using `gh api` against the user's requested repository.

Primary source: https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/README.md

The current specification is AI Hub Session Protocol v1, client 1.4.0. A game embeds the unmodified `session.js` as its first script after the charset declaration. Boiler Buddies uses `shared-world` and seats `[1,2]`. Required head tags describe mode, range, goal, and controls; WebGPU availability can be declared with `hub:webgpu=required`.

The host owns physics and game state. Other copies send input to the host, which broadcasts snapshots. Snapshots are sent reliably 12 times per second, inputs 15 times per second, below the Hub's 20-message-per-second ceiling. Messages must remain below 16 KB. Reliable snapshots avoid the loss amplification of fragmented unreliable packets. Incoming sequence numbers discard stale input/state. Remote input expires after half a second without a packet.

`Network.initHub()` opens the protocol and installs start/message/leave/time-up/end listeners. The game calls `Network.ready()` after its engine has finished loading, without requiring user input. `onStart` arrives at the Hub's synchronized countdown; `Network.canStart` becomes true after that countdown. Hub sessions skip the game's own title/online menus and let the Hub show its instruction card. `Network.localSeat === -1` identifies a server host without a local player. Such a copy still simulates every player.

At time-up, the host reports a valid team result. On `end`, the game must stop input and audio and network traffic. In a session it must not allow title navigation, restarting, or leaving; Create + Options belongs to the Hub. All network messages go through `AIHub.send`; no public signaling is ever loaded in a Hub session.

Standalone multiplayer uses WebRTC data channels through PeerJS 1.5.5, loaded only when the player opens a room. The public PeerServer brokers room-code signaling; game state travels peer to peer. A same-browser BroadcastChannel route is tried first, which permits reliable local two-tab testing without the public service. Both routes carry the same host-authority state/input messages. No custom names, chat, voice transport, or emotes are implemented.

PeerJS primary documentation: https://peerjs.com/client/getting-started
Pinned standalone client: https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js

## Interface

```js
const network = new Network({
  onStart(info) {}, // {mode,isHost,localSeat,playerIds,players,countdownMs,server,room}
  onInput(input, seat) {}, onState(snapshot) {}, onStatus(text) {},
  onTimeUp(event) {}, onEnd(reason) {}, onLeave(id, reason) {}, onFinish(result) {}
});
await network.initHub();
network.ready();
// Outside the Hub:
const code = await network.host();
await network.join(code);
// Each render, as appropriate:
network.sendInput({x, jump, kick, drop});
const remoteInput = network.getInput(1);
network.publish(serializableSnapshot);
network.finish({won:true, score:12300});
```

## Module verification

Eleven scripted module checks passed: room creation and both start callbacks; host state transport; sanitized/clamped guest input; short pressure pulses retained through throttling; stale input expiry; finish delivery; disconnect delivery; server-host mode; Hub input/state transport; time-up result; end stopping traffic. No defects were found by these checks. Three real WebRTC checks passed using isolated browser contexts: room signaling, host world snapshots, and guest input including pressure pulses. After the main build script fixed an inline-JavaScript escaping bug, all 40 upstream harness checks passed across standard, dedicated-server, and host-leave scenarios, with two players, 150 ms latency, 50 ms jitter, and 5% packet loss. The repeatable scripts are `test-network.py` and `test-hub.py`.
