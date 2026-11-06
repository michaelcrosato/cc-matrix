# Cosmic Hitchhikers networking

Researched 2026-11-05 from the authoritative AI Hub repository with `gh api`:
https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub

## Files and version

- `network.js`: game's transport adapter, `export class NetworkSession`.
- `hub-session.js`: exact unmodified upstream Session Protocol v1 client **1.4.0**. Paste this as the FIRST script after `<meta charset>` in `<head>`. Keep this content unmodified so AI Hub can update it.
- `hub-README.md`: upstream protocol specification.
- `hub-harness.html`, `hub-bridge.js`, `hub-round.js`: upstream test tools. The harness expects `bridge.js` and `round.js` beside itself, so copy them under those names when running the browser tests.

Game meta tags:

```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Rescue every creature pair and escape the dying star together.">
<meta name="hub:session-howto" content="Move with left stick or WASD. Aim with right stick or mouse. Cross/Space: tractor beam. Square/Shift: pulse. Options/Escape: pause.">
<meta name="hub:session-minutes" content="5">
```

Add `hub:webgpu=required` only if there is no renderer fallback.

## Integration API

```js
const net = new NetworkSession({
  maxPlayers: 4,
  onInput(id, input) { /* host receives remote player controls */ },
  onSnapshot(snapshot) { /* clients replace world state, then render it */ },
  onStatus(info) { /* UI: info.role, room, players, count, me, server, authority */ },
  onStart(detail) { /* show automatic synchronized round; no title/menu */ },
  onEnd({ reason }) { /* freeze input and gameplay; stop audio */ },
  onTimeUp({ graceMs }) { /* optional: settle gameplay state immediately */ },
  onLeave(id, reason) { /* remove that pilot's entity, or return its control to AI */ },
});
await net.initialize();
// Once renderer/physics/game systems are loaded:
net.ready();
// Every frame, including paused frames so network heartbeats continue:
net.update(localInput, authoritativeSnapshotOrNull, dtSeconds);
// Host simulation executes only when net.info.authority && net.canPlay.
// For a dedicated Hub host, net.info.server is true: do not use local input.
// On host win or loss:
net.finish(teamScore, won);
```

`net.info` returns `{role,room,players,count,hub,me,server,authority,started,ended,connected}`. Roles are `solo`, `host`, `client`. `players` is an array of `{id,name,color}`. In standalone solo, local id is 0. In a not-yet-connected standalone client it is null. In Hub dedicated hosting, `server` is true and local `me` is not an actual player.

`net.canPlay` is false after Hub end, before Hub's synchronized clock reaches zero, and while a standalone joining client is waiting for a host. Attach game's callbacks before calling `ready`.

`onStart` arrives when Hub's countdown begins; wait for `canPlay` before allowing simulation or input. Hub client/network callbacks are attached before `connect` so early events are not lost. Hub messages use the authoritative host id and authorized seat ids. Frames have sequence numbers, and stale frames are ignored.

Input is a small plain object of finite numeric and boolean properties, such as `{x,y,aimX,aimY,beam,pulse,fire}`. Remote positions are never accepted as authoritative. Snapshot is any plain JSON object under the Hub's 16 KB limit. It should contain all gameplay state needed for rendering. Include `score` and either `won:true` or `phase:'victory'` for correct automatic time-up fallback; explicitly calling `finish` also works. Snapshots are sent reliably at 10 Hz; clients send small unreliable input at 10 Hz. Both are within the 20 messages/second limit.

`time-up` always causes the host to call `finish` within the grace window, using its latest score; an optional onTimeUp callback may settle state or call finish first. `finish` is guarded and only reports once. The entire remaining crew ties in a co-op result. `end` stops all module transmission and callbacks for incoming gameplay. The game must also silence audio and stop input, and must not restart/quit/navigate during Hub rounds. Ignore controller Options when Create is held.

## Standalone same-device tabs

- `net.hostRoom(code?)`: opens a BroadcastChannel; returns the sanitized room code or false. Omitting a code securely generates six characters.
- `net.joinRoom(code)`: finds host on same browser origin/storage partition; returns the sanitized code or false. Join attempts retry once a second.
- `net.setRoom(code)`: sanitizes/sets a proposed code; does not connect.
- `net.leave()`: closes standalone channel, clears remote controls and returns to solo; does nothing in Hub.
- `net.destroy()`: removes listeners and closes standalone transport.

Call this mode **Local link (same-device tabs)**. BroadcastChannel does not connect different computers. AI Hub supplies true online multiplayer. Standalone room operations do nothing inside a Hub session; there are no external sockets, brokers or chat.

Host assigns available seat ids 1–3, maintains crew roster, removes silent clients after 5 seconds and clears their input. Clients detect a silent host after 8 seconds. Each tab's pagehide sends a leave event. Keep the transport update running when paused.

## Verification completed

Nine scripted Node assertions passed using native BroadcastChannel between two adapter instances and a stubbed AI Hub client: solo initialization, crew handshake, authoritative snapshot delivery, remote input delivery and non-finite input filtering, leave/roster repair, ready and synchronized start gate, host world traffic, automatic time-up scoring, and no traffic after end. `node --check network.js` passed.

Full-game browser verification must still run the upstream harness after bundling. Suggested queries on the localhost OS-selected port:

- `harness.html?game=../GAME.html&players=2&auto=1&limit=8`
- `harness.html?game=../GAME.html&players=4&latency=150&jitter=50&loss=5&auto=1&limit=8`
- Same with `scenario=host-leave`.
- `harness.html?game=../GAME.html&players=2&scenario=server&auto=1&limit=8`.

Wait for `document.body.dataset.complete === 'true'`; assert `window.__hubCheck.pass === true` and report its failures if not.
