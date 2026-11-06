# River Razzle network integration

Sources researched via the authenticated GitHub CLI:
- https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub
- https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/README.md
- Protocol 1; unmodified client 1.4.0 is vendored as `session.js`.

Place the exact, unmodified contents of `session.js` in the first script in head, immediately after `<meta charset="utf-8">`. Do not bundle that client into the module: storage and fullscreen interception must precede game initialization. `bridge.js`, `round.js`, and `harness.html` are the official local conformance harness, not production dependencies.

Required head tags:
```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-2">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Clear every river bridge together. Keep your squadron fueled and flying.">
<meta name="hub:session-howto" content="Left stick to steer and control speed; Cross or R2 to fire; Square to pulse. Keyboard: WASD/arrows, Space, X.">
<meta name="hub:session-minutes" content="5">
<meta name="hub:webgpu" content="required">
```
The prompt controls should match the final implementation. WebGPU tag is needed only if a WebGL2 fallback is not playable.

```js
const network = new Network({
  onStart: ({ delay, players, localId, isHost, server, embedded }) => startRun(delay),
  onInput: (input, fromId) => remoteInputs.set(fromId, input),
  onSnapshot: snapshot => applyHostSnapshot(snapshot),
  onStatus: status => refreshLobby(status),
  onEnd: event => stopInputAndAudio(event),
  onTimeUp: ({ graceMs }) => network.finish(score, false, { Bridges: bridges }),
  onLeave: ({ id, reason }) => removeWingmate(id),
});
await network.init();
// AFTER physics, world and renderer are ready:
network.ready();
```

`onStart` arrives at the beginning of a countdown, with delay in milliseconds. Wait for `network.time() >= 0` before simulating. The hub owns start and end; skip the title screen and don't allow return/restart during `network.embedded` sessions. Host runs the world even when `network.server === true`, with no local player. `network.players` includes only actual participants; their ids are `0..N-1`. Find a participant's plane index with `players.findIndex(p => p.id === id)`. `localId` on a nonplayer host is not among those ids.

During play, every rendered game frame calls `network.update(dtSeconds, {x,y,fire,pulse}, snapshot)`. The host sends snapshots at 15 Hz; guests send their own inputs to the host at 15 Hz. A guest only renders authoritative host state. `snapshot` must be JSON smaller than 16 KB including packet framing; avoid sending scene objects or full procedural scenery. `network.finish(teamScore, won, stats)` works only on host and only once. In a Hub session this produces valid tied team standings for all remaining participants. Time-up automatically falls back to a losing team result with the last snapshot's score if the game callback does not finish within 100ms. End prevents all further network sends; the game must also stop input and audio.

Status callback:
`{active,embedded,mode,isHost,localId,hostId,server,code,count,players,started,ended,message}`.
- `active`: true for AI Hub or tab room.
- `embedded`: AI Hub session, online across devices via the Hub relay.
- `mode`: `solo`, `room`, or `hub`.
- `count`: number of participants.

Standalone local same-screen co-op belongs to the game input/simulation layer. Optional tab co-op is explicitly same-browser tabs via BroadcastChannel:
- `createRoom()` returns a random four-character code synchronously.
- `await joinRoom(code)` returns success as a boolean.
- `startStandalone(delayMs = 1500)` triggers `onStart` locally and in the joined tab. Only the host can start. It supports one pilot while waiting, or two connected pilots.
- `leaveRoom()` notifies the peer and resets solo state.
- `?room=ABCD` attempts an automatic join during `init()`.
- The host continues if a guest leaves. The guest stops if the host leaves. Heartbeats detect missed tab departures after ten seconds.
- `debug()` returns role, traffic counts, sequence counters, and clock without changing game state.
- `destroy()` closes channels, interval timers, subscriptions, and unload handler.

The game's normal solo start can bypass `startStandalone` entirely when `network.active` is false. Menus should name tab co-op clearly as same-browser tabs, and AI Hub as cross-device online co-op. No external sockets, brokers, chat, names, or voice are introduced.

Verification: `node --no-warnings network-test.mjs` prints only failures and one count line. It uses real Node BroadcastChannel transport and mocked AI Hub messages. The official browser conformance harness must still run against the final game:
`harness.html?game=../GAME.html&players=2&auto=1`, repeated with `&scenario=server` and `&scenario=host-leave`. Wait for `document.body.dataset.complete === "true"`, then assert `window.__hubCheck.pass === true`.
