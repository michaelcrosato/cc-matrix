# Ka-Splat! online module

`online.js` exports `Online`. Bundle it into the single module script; remove the `export` keyword when concatenating. Paste **all of `hub/session.js`, unmodified**, as the first script in the HTML head, immediately after `<meta charset>`.

Required head tags:

```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-2">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Catch the bombs. Keep the rooftop dry through eight waves.">
<meta name="hub:session-howto" content="Move: left stick, A/D, arrows or mouse. Splash: Cross, Space or tap.">
<meta name="hub:session-minutes" content="5">
```

If WebGPU is mandatory also add `<meta name="hub:webgpu" content="required">`.

## Interface

Construct `new Online(callbacks)` before loading a scene, then `await online.init()`. Its promise returns Hub info or null. Hub start events are buffered by the official client, so attach this early. When game assets are all loaded call `online.ready()`. The official Hub card handles ready input. Do not show a title, settings or online UI while `online.hubActive` is true. Wait for `onStart` before advancing the game; the module waits out the three-second synchronized countdown itself.

Properties: `connected`, `isHost`, `localId` (null for a Hub server with no player), `players` (current `{id,name,color}` seats), `hubActive`, `server`, `ended`, `started`, `status`.

Callbacks:

- `onConnected(info)`: setup one bucket per `players` seat. Server has no local bucket and must still simulate all player buckets.
- `onStart()`: start/reset the game. In standalone called only when the host presses Start brigade. In Hub called on synchronized timeline zero.
- `onCountdown(ms)`: synchronized Hub countdown, for display if desired.
- `onInput(playerId, {x,splash,seq})`: host receives a specific bucket's absolute world x and splash action. Clamp x further to the game arena. Includes host's local input, delivered immediately.
- `onSnapshot(snapshot)`: guests render this authoritative world without stepping their own game physics.
- `onStatus(text)`: connection status.
- `onLeave(id,reason)`: remove the bucket for a departing player, or return to local single player when a standalone guest departs. Hub host departing is followed by `onEnd`.
- `onTimeUp()`: host should finish with current score if desired; fallback `finish(lastScore,false)` follows automatically unless already finished.
- `onEnd(reason)`: stop input, game advancement, audio and networking. Hub supplies its own result overlay.

Methods:

- `sendInput({x,splash})`: call every animation tick from a player copy. Internally sends at most about 12 Hz; splash is latched on its rising edge and included in the next packet (within 85 ms). The host gets its own input through the callback too. Never called from a dedicated server.
- `broadcast(snapshot,force=false)`: host sends world, at most about 12 Hz. Keep JSON below 16 KB. Call on every host tick. Include `score` so fallback time-up result has the current team score.
- `finish(score,won)`: host reports Hub shared team result once. Standalone game results remain game UI and snapshots. Finish only after sending final snapshot using `broadcast(snapshot,true)`.
- `start()`: standalone host starts/restarts both copies. Returns false in Hub or while disconnected.
- `disconnect()`: standalone leaves peer, resets to single player. No-op in a Hub session.
- `mount(element)`: inserts working standalone invitation/reply controls, status and Start brigade button. Mount in the online menu; don't replace its children afterward. Buttons have normal focus behavior. Controller menus can query their visible `button,textarea` elements.
- `createOffer()`, `acceptOffer(code)`, `acceptAnswer(code)`: public manual WebRTC methods if custom UI is preferred.

Inputs and snapshots use reliable ordered messages. Hub transport is the only network used inside Hub; RTCPeerConnection is created solely after a standalone Host/Join action. Standalone WebRTC uses Google STUN for NAT discovery, with no relay, so restrictive NATs can require AI Hub. Data is sent directly between peers. Both sides must leave the game open during code exchange.

## Harness

Official files are preserved in `hub/`. Serve the game root and open:

`/Ka-Splat-Kaboom-gpt-6.1-sol-ultra-20261105-215656/hub/harness.html?game=../../Ka-Splat-Kaboom-gpt-6.1-sol-ultra-20261105-215656.html&players=2&auto=1`

Wait for `document.body.dataset.complete === 'true'`, then inspect `window.__hubCheck.pass`. Repeat with `scenario=server`, `scenario=host-leave`, and `latency=150&jitter=50&loss=5`. Two players match the game's advertised supported range; a four-player test intentionally exceeds it.
