# AI Hub integration research

Fetched 2026-11-05 with `gh api` from `michaelcrosato/ai-hub`, branch `main`, directory `lib/hub`.

Primary references:

- Protocol: https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/README.md
- Client: https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/session.js
- Shared-world example: https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/examples/arena.html
- Test harness: https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/harness.html

Protocol version 1; client version 1.4.0. `session.js` is an exact, unmodified source download. SHA256: `6ab6be43898e2db069bc21a94757d77d9c3f2a0cb76f01186490d3bd88d8717a`.

## Required HTML assembly

Paste `session.js`, unmodified, into the first script immediately after `<meta charset>` in `<head>`. The bundler can inline its complete bytes. Add these metas:

```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-2">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Defend the coast together and defeat the flagship">
<meta name="hub:session-howto" content="Aim: stick or mouse · fire: R2 or click · barrage: Cross or Space">
<meta name="hub:session-minutes" content="4">
```

Set minutes to the final demo duration. Omit `hub:webgpu` when the WebGPU renderer has a working WebGL fallback; use content `required` only if the game cannot run without WebGPU.

## Adapter API

`network.js` is a plain script defining `window.KerfuffleNetwork`. It has no imports and can be pasted into the final HTML. Constructor callbacks:

```js
const net = new KerfuffleNetwork({
  onStatus({ text, state, room, players, kind }) {},
  onSession(info) {},
  onStart(info) {},
  onState(snapshot) {},
  onInput(input, seat) {},
  onLeave(seat) {},
  onEnd(reason) {},
  onTimeUp() {},
});
```

- `await net.initHub()` returns hub info or null. Call after building the scene and installing callbacks. In a hub round, bypass the title/attract/menu screens and show the world waiting behind the hub card.
- `net.ready()` calls hub ready automatically, with no gesture. Call once the scene and game can start.
- `net.tick(localInput, snapshot)` must run every animation frame, including while waiting. `snapshot` is used only by the host. Guests send their input at 15Hz; host sends world snapshots at 12Hz. Keep the entire JSON message below 16KB. Snapshots are reliable so their potentially large size does not cause fragmented unreliable losses.
- `net.onStart` callback fires once, when the shared clock reaches zero after the hub countdown. `net.canPlay` gates simulation and input.
- `net.active`, `net.kind` (`offline`, `hub`, `room`), `net.isHost`, `net.isServer`, `net.localSeat`, `net.players`, `net.room`, `net.started`, `net.ended` are public.
- `net.info` gives `{kind,active,me,host,isHost,server,players,room}`. Player names must be inserted with `textContent`.
- Host runs all world simulation. Consume own input directly and remote input in `onInput(input,seat)`. Remote clients only render host snapshots; they do not simulate target hits or scoring independently.
- Dedicated server: `isHost=true`, `isServer=true`, `localSeat=null`. It runs the world with both remote gunners; it has no player or local input. The root loop may skip rendering on that copy.
- `net.finish({won,scores,stats})` is host only and once only. It reports a team tie for every remaining player. `scores` is `{0:number,1:number}` and optional `stats` is `{0:{Hits:number},1:{Hits:number}}`.
- `onTimeUp` must immediately call a game finish/report function, which calls `net.finish` within the hub grace period.
- `onEnd` must stop input and all sound. It follows both normal end and host disconnect. The hub owns results and teardown.
- `onLeave` lets the authority disable the disconnected cannon. The game can continue with one gunner. The roster callback follows it.
- While in hub mode, restart, quit, and title actions must do nothing; Create+Options belongs to the hub, so ignore Options when Create is held.

## Standalone online

No transport service is contacted in AI Hub mode. Outside a session, `host()` / `join()` lazily load PeerJS **1.5.5** from jsDelivr and use its public room-signalling service plus direct WebRTC data channels. Public service availability and restrictive NAT traversal are external dependencies; a room can fail with an actionable status message. No chat, voice or custom names are added.

- `await net.host()` creates a room and returns a six-character code. Show code and Launch/Cancel controls. Roster initially has Gunner 1; `onSession` updates when Gunner 2 connects.
- `await net.join(code)` connects as seat 1; show a waiting message. Errors reject and are also delivered through status callback.
- `net.start()` called by the host begins the game on both copies. It works with one or two gunners. It returns false when unavailable.
- `net.leave()` closes only this game's Peer and its own channels, returning to offline mode. It is disabled in hub mode.
- Local co-op and offline simulation are handled by the game, without this transport.

## Harness procedure

Download harness.html, bridge.js and round.js unmodified into the development folder. Serve that folder on `127.0.0.1` with port 0 and read the chosen port from the server output. Confirm the target page title. In one browser, run these sequentially:

1. `harness.html?game=index.html&players=2&auto=1`
2. `harness.html?game=index.html&players=2&latency=150&jitter=50&loss=5&auto=1`
3. `harness.html?game=index.html&players=2&scenario=host-leave&auto=1`
4. `harness.html?game=index.html&players=2&scenario=server&auto=1`

Wait for `document.body.dataset.complete === 'true'`; require `window.__hubCheck.pass === true`. This game declares a maximum of two players, so four-player harness runs are outside its advertised range. The harness checks traffic, automated ready, synchronized start, time-up/result, disconnect, server authority, and forbidden dialogs/popups/sockets. Network-only state must stay within the hub's 20 messages/sec and 16KB per-message limits.

## Isolated verification performed

Twenty-four checks passed for offline defaults, hub initialization/roster, automated ready, shared-clock countdown, start once, host snapshots, remote input and seat, duplicate/stale packet rejection, unknown seat rejection, player removal, time-up report, valid remaining-player standings, once-only finish, stopped traffic on end, remote authority checks, dedicated server without local seat, and standalone rooms blocked during hub mode. These tests used an isolated stub hub, not the full game/harness. Full game verification is separate.

Actual standalone online verification also passed: one headless Chromium browser with two pages, real jsDelivr PeerJS loading, public signalling, room creation, join/roster, shared start, host snapshot delivery, guest input reaching seat 1, and team finish reaching the guest. Seven checks passed. Both pages called leave and the browser/context were closed afterwards. This confirms connectivity on this workstation's network; restrictive NAT behaviour elsewhere is unknown.

### Final-state and input-edge integration

`net.tick(input,snapshot)` returns true only when it actually sends an input or snapshot. Guests can use that return value to consume queued switch/broadside edges only after transmission. The host must consume each remote action edge once after applying it; merge pending edges with OR while new packets arrive to preserve edges during jitter.

`net.publish(snapshot)` sends an authority snapshot immediately, bypassing the 12Hz throttle. `net.finish({won,scores,stats,snapshot})` optionally publishes that terminal snapshot before reporting the result. This ensures the final state is placed on the reliable transport before the round ends, particularly for standalone clients.

The assembled game passed the full AI Hub harness: 53 checks, zero failures across standard two-player, 150ms latency/50ms jitter/5% packet loss, host-leave, and two-player dedicated-server scenarios. The checked build preceded later input-edge and end-state fixes; final verification follows those changes.

Final assembled-game verification: **68 checks, zero failures**. The four official harness scenarios account for 53 checks. Fifteen further checks used two actual game pages and real standalone networking: room creation, online lobby attract exclusion, join/roster, start, authority snapshot delivery, guest weapon switching exactly once, a second switch, guest aiming, firing, one broadside, a complete accelerated four-stage patrol, terminal snapshot, matching final scores and victory flag, and stopped transport at the result. Test entry point: `test-hub.py`; set `KERFUFFLE_TEST_URL` to a server that serves this game's development directory. Results: `hub-test-results.json`. The agent-owned temporary HTTP server (PID 576436, 127.0.0.1:33591) was stopped after verification.
