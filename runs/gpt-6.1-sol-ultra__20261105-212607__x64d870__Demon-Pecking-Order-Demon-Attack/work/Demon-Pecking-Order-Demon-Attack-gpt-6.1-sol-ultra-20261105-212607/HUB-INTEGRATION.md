# Integration

Paste `session.js` **unmodified**, as the first script in `<head>`, immediately after `<meta charset>`. It is the official AI Hub Session Protocol v1 client, version 1.4.0. Then include these tags:

```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-2">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Defend the outpost through six assaults and defeat the demon flagship together.">
<meta name="hub:session-howto" content="Left stick / A D: move. Cross / Space: fire. Square / Shift: repel pulse. Options / Esc: pause.">
<meta name="hub:session-minutes" content="6">
<meta name="hub:webgpu" content="required">
```

Paste `hub.js` inside the game's script. Construct it after engine resources have loaded:

```js
const network = new HubLink({
  onJoin: info => { /* Set up player entities from info.players. */ },
  onStart: info => startRun(info),
  onInput: (input, id) => { remoteInputs[id] = input; },
  onState: state => displayRemoteWorld(state),
  onEnd: detail => { freezeRun(); stopAudio(); },
  onTimeUp: () => { network.finish(score, false); },
  onLeave: detail => removeDisconnectedPlayer(detail.id),
  onFinish: result => showStandaloneResult(result),
  onStatus: text => { statusElement.textContent = text; }
});
await network.init();
```

`init()` must run without a key press. With AI Hub active, immediately show the arena; the hub supplies the round card, so do not show the game's title, difficulty selection or menus first. `onStart` fires at the synchronized play start after the hub's three-second countdown. Until then, simulate no gameplay. The host runs physics and sends snapshots; the client only displays snapshots and sends local controls. `AIHub.server` is supported: construct players using `network.players`; no local ship exists when `network.server` is true. Its id may be outside the players array.

During play call `sendInput(input)` on clients and `sendState(snapshot)` on the host every frame. The adapter throttles controls to about 14 Hz and snapshots to 10 Hz, with ordered sequence numbers. Its onInput callback has `(input,id)` arguments. Keep each state snapshot below 15 KB. Call `updateScore(score)` as the score changes; `finish(score,won,terminalSnapshot)` once on victory or defeat, after switching the snapshot to its terminal result screen. The terminal world is applied and acknowledged by clients before the host finishes the session, with a 1.2-second fallback for absent clients. Time-up is handled with a result even if onTimeUp is omitted. On Hub end freeze all gameplay, stop accepting input, and mute audio. Quitting/restarting/returning to title must do nothing in Hub sessions. Ignore controller Options while Create is held.

Outside Hub sessions, `openPanel()` displays create/join controls; `hostRoom()` and `joinRoom(code)` are also available directly. WebRTC uses PeerJS 1.5.5 and its public signaling service. There is no chat, microphone, camera or player-created name. A standalone co-op run begins automatically when the second cannon connects. The library loads only after an explicit create/join action outside AI Hub, never during a Hub session. Public signaling and cross-network NAT traversal depend on network availability.

To retain the controller focus system inside the online overlay, scope its focusable query to `#dpo-online-panel` when that element exists. Its buttons and input are normal focusable elements; activation should call `document.activeElement.click()`. Room entry accepts a standard hardware keyboard or the platform's on-screen keyboard. Back calls `close()` and closes the overlay.

For local deterministic multiplayer tests, call `hostRoom({local:true})`, pass the resulting `LOCAL-XXXXXX` room code into the second page's `joinRoom(code)`, and use the same origin. This transport is exclusively a developer test path; normal rooms use real WebRTC.

# Tests

One command in this folder:

```sh
/home/micha/.local/share/pipx/venvs/playwright/bin/python network-tests.py
```

The command starts its own loopback server on an OS-assigned port, closes its browser and server, and prints only failures and a one-line count. It covers local two-page inputs and snapshots, departure, public PeerJS plus real WebRTC, and official AI Hub harness scenarios (standard shared world, dedicated server, and host departure). The harness fixture tests the adapter independently of game rendering. `game-network-tests.py` runs two-page checks and all three official harness scenarios against the final packaged game, including artificial latency, jitter and packet loss, and writes `network-results.json`.

`network-tests.py --online-only` runs only the external signaling/WebRTC check. No screenshots are required for these state-level checks.

# Sources

- AI Hub Session Protocol v1, client 1.4.0: https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/README.md
- Unmodified official client: https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/session.js
- Official harness: https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/harness.html
- PeerJS official API concepts: https://peerjs.com/client/getting-started
- PeerJS pinned package: https://registry.npmjs.org/peerjs/1.5.5
