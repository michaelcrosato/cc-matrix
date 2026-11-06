# ComBop multiplayer

The supplied AI Hub source was downloaded directly, without search or general web research. Its README identifies AI Hub Session Protocol v1 and client 1.4.0. The raw, unmodified client is `session.js`; inline it as the first script directly after the HTML charset declaration.

Required head metadata:

```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="2-2">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Score five knockouts. Bank shots around cover and dodge incoming shells.">
<meta name="hub:session-howto" content="Move: left stick / WASD. Aim: right stick / mouse. Fire: R2 / mouse. Dash: L2 / Space.">
<meta name="hub:session-minutes" content="3">
```

If WebGPU has no WebGL fallback, also include `<meta name="hub:webgpu" content="required">`.

## Adapter contract

`createOnline(callbacks)` from `hub.js` returns:

- `connectHub(): Promise<info|null>`: immediately returns null outside a hub session; in the hub joins shared-world with two seats.
- `ready()`: call after all game loading is complete. No button press may be required.
- `host(): Promise<string>`: standalone host invitation code.
- `join(invitation): Promise<string>`: standalone guest return code.
- `accept(returnCode): Promise<void>`: host accepts the guest. Both copies start on their `onStart` callback when the data channel opens.
- `sendInput(input)`: client-to-host. Call every frame; rate capped under twenty per second.
- `sendSnapshot(state)`: host-to-clients. Call every frame; same cap.
- `finish([score0,score1])`: host submits valid hub standings or sends standalone final scores. Once per round.
- `leave()`: closes standalone networking. Deliberately does nothing in the hub.
- `time()`: hub's shared clock, or standalone time since connection. A hub round plays when this reaches zero.
- `inspect()`: lifecycle, transport, sent/received counts, seat and connection state.
- Getter properties: `active`, `inHub`, `isHost`, `isServer`, `seat`, `players`, `connected`, `started`, `ended`.

Callbacks: `onStatus(text)`, `onInput(input,seatIndex)`, `onSnapshot(state)`, `onPeer({joined,seat,name,reason})`, `onStart(info)`, `onEnd(event)`, `onTimeUp(event)`.

In hub sessions, the host can have no seat. If `isServer` is true, `seat` is -1; it runs the whole world and receives both players' inputs. Do not attach local input to either tank. AI Hub's player names are text only. Never use `innerHTML` for them.

When `onTimeUp` arrives, host calls `finish(currentScores)` immediately. When `onEnd` arrives, stop input, outgoing traffic and all audio. Hide title, restart and quit actions in a hub round. Ignore controller Options while Create is held.

## Standalone direct connections

Uses browser-native WebRTC with a reliable ordered data channel. Invitation and return codes contain gzipped SDP (prefix `CBZ1.`); browsers without CompressionStream use raw `CB1.` codes. In the verified local two-page connection, invitation was 703 characters and return code was 629 characters. Exact lengths vary with network candidates.

Outside AI Hub only, Google STUN discovers public connection addresses. No public game broker or match server is required. There is no TURN relay. Restrictive NATs/firewalls may prevent direct connections; AI Hub sessions are the alternative. Creating codes is limited to six seconds of ICE gathering; all discovered local candidates are retained.

## Verification performed

Chromium headless, two pages on OS-assigned loopback HTTP server. Fourteen transport assertions passed: standalone hub detection, code encoding, two peer roles, exactly one start callback, bidirectional payload integrity and seat routing, authority guards, invalid input rejection, final score delivery, disconnect notification and packet counters. All opened browser/server resources were closed. Node syntax check passed.

The supplied harness and dependencies are saved as `harness.html`, `bridge.js`, and `round.js`. To test the final root artifact from the workspace server use `/ComBop-Combat-1977-gpt-6.1-sol-ultra-20261105-212552/harness.html?game=../ComBop-Combat-1977-gpt-6.1-sol-ultra-20261105-212552.html&players=2&auto=1`. Also run `&scenario=server`, `&scenario=host-leave`, and a latency/jitter/loss case. Passing is `window.__hubCheck.pass === true` once `document.body.dataset.complete === 'true'`.
