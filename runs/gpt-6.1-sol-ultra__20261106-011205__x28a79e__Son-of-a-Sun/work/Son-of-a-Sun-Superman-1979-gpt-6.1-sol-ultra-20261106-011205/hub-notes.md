# Multiplayer adapter

`hub.js` exports `OnlineLink`. The official unmodified `session.js` 1.4.0 is also in this folder. Paste its exact contents as the first script in the final HTML head immediately after `<meta charset>`. The adapter can then be inlined into the main module by removing its `export` keyword.

## Interface

```js
const online = new OnlineLink({
  onRole(role, info) {},  // role = solo | host | guest; info has me/server/players/mode
  onStatus(text) {},
  onStart(info) {},      // Hub: fires only when AIHub.time() reaches zero
  onInput(input, id) {}, // Host receives controls; id is the actual sender
  onState(state, id) {}, // Guest receives authoritative host snapshot
  onLeave(id, reason) {},
  onTimeUp() {},         // Host should synchronously call finish with real score
  onEnd(reason) {},      // Stop simulation, input and audio
  onRoundEnd(result) {}, // Standalone host's result notification
});
await online.init();    // Hub connection, null outside Hub
online.ready();         // Call after rendering/physics/assets are usable
```

Properties: `active` (in an AI Hub session), `role`, `connected`, `status`, `me`, `server`, `players`, `playing`, `ended`, `mode`, `info`.

Host/solo owns physics and mission state. For Hub, create one hero for every `online.players` id. A server has `server === true` and no local hero: simulate the entire world using remote input, without requiring local camera or pad. Guests send continuous input snapshots through `sendInput(input)`; host sends compact serializable snapshots through `sendState(state)`. The adapter throttles each stream to about 14 messages/second, within the 20/sec Hub allowance. Main should still process input every frame. Hub message payload including the wrapper must remain below 16 KB. State messages carry monotonically increasing sequence numbers.

Call `online.finish({score, won, stats})` from the host on a normal ending or time-up. All remaining team members tie; `stats` is a per-player stats object assigned to each player. Only the host reports. The adapter has a false/zero fallback result on time-up if the callback doesn't report one, so a loaded game never silently voids through a missing callback. On Hub `end`, input, simulation, network and audio must stop; no title/restart/quit navigation is allowed inside a session. Controller Create+Options belongs to Hub, so ignore Options whenever Create is held.

## Standalone co-op

Direct peer-to-peer co-op between devices, without a game server:

1. Host awaits `online.createOffer()` and shows returned SUN1 code in a selectable text field.
2. Partner pastes it, awaits `online.acceptOffer(code)`, and sends the returned reply code back.
3. Host awaits `online.acceptAnswer(reply)`.
4. Both sides get `connected = true` and `onStart` when the reliable WebRTC data channel opens.

Host is id 0; partner is id 1. Both roles use the same `sendState` / `sendInput` API. ICE uses Google's public STUN service only when the player explicitly chooses standalone direct co-op. No TURN relay is bundled, so restrictive NATs can prevent this connection; AI Hub is the online alternative. The manual codes are signaling descriptions only. There is no text/voice chat and no public lobby.

For quick same-browser tests or tab co-op: `online.host('ROOM')` on one tab, `online.join('ROOM')` on another. BroadcastChannel rooms support host plus three guests, use no external network, and are unavailable inside Hub. `online.close()` disconnects standalone transport and returns to solo. It deliberately does nothing in an active Hub session.

## Required final HTML tags

```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Save the city together: rescue citizens, stop the tram, and defeat the sun-stealing machine.">
<meta name="hub:session-howto" content="Move: left stick / WASD. Look: right stick / mouse. Rise: Cross / Space. Descend: Circle / Ctrl. Boost: R2 / Shift. Rescue: Square / E. Freeze: L2 / Q. Heat vision: R1 / left mouse.">
<meta name="hub:session-minutes" content="8">
<meta name="hub:webgpu" content="required">
```

Outside of Hub these tags have no behavior. Adjust howto to final controls if needed.

## Official protocol and harness

Fetched directly using `gh api` from the user-specified repository; no research/search was performed. This is AI Hub Session Protocol v1, client 1.4.0. Files `harness.html`, `bridge.js`, and `round.js` are exact downloaded test tools. Serve the development folder on an OS-assigned loopback port. Harness URL: `harness.html?game=RELATIVE_GAME.html&players=2&auto=1`; inspect `window.__hubCheck.pass` and wait until `document.body.dataset.complete === 'true'`.

Required stress cases: players=4 with latency=150,jitter=50,loss=5; scenario=host-leave; players=2,scenario=server. The harness and game must share the same origin. A server scenario has a fifth non-player frame that is the authoritative host. Hub-only traffic uses `AIHub.send`; no WebRTC/BC/socket is created during a Hub session.
