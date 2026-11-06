# Urn Welcome networking

`network.js` exports `Network`. It has no module dependencies. Paste `hub/session.js` unchanged as the first script immediately after `<meta charset>` in the final HTML, as required by AI Hub Protocol v1 (client 1.4.0).

Required head metadata:

```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-2">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Recover the three urn fragments and escape together.">
<meta name="hub:session-howto" content="Move: left stick / WASD. Interact: Cross / E. Light: Square / Space. Map: Triangle / M. Pause: Options / Esc.">
<meta name="hub:session-minutes" content="8">
```

Construct with callbacks `onStatus(text)`, `onSnapshot(state)`, `onInput(input, playerIndex)`, `onStart(startInfo)`, `onEnd(result)`, optional `onTimeUp()`. After the renderer, physics and game state have loaded, call `await net.init()`. It connects and calls ready automatically in a hub session. No title menu or prompt is allowed in that session. `onStart` fires when the hub's three-second countdown expires.

`startInfo` includes `{ hub, info, localIndex, playerCount, server, role }`. In dedicated-server sessions, the authoritative copy has `server=true`, `localIndex=-1`: simulate all explorers but apply no local input. Other copies are guests, including player index zero. Normal hosted sessions have host player index zero and guest index one. `net.active` means AI Hub owns lifecycle and networking.

During play, the authoritative world calls `net.broadcast(serializableState)` every frame; it is throttled to 12 Hz. Guest copies call `net.sendInput(input)` every frame, throttled to 15 Hz. Each guest receives snapshots through `onSnapshot` and never simulates gameplay authority. Host receives each guest's controls through `onInput(input,index)`.

Call `net.finish(won, score, stats)` from the host on victory/defeat. Hub players tie as a co-op team. `onTimeUp` can call `finish` with the final score; otherwise the wrapper reports defeat automatically. `onEnd` must stop gameplay/input/audio. Ignore Options when Create is held in a hub session. A departed player generates neutral controls with `disconnected:true`.

Outside AI Hub, `net.host()` returns a four-letter local tab code. `net.join(code)` connects another tab on the same browser origin. These are local tabs only. For remote co-op, the host calls `await net.createOffer()`, sends that invitation string to the guest; guest calls `await net.acceptOffer(invitation)` and sends the returned answer string; host calls `await net.acceptAnswer(answer)`. A real reliable WebRTC data channel carries the same gameplay messages. Public STUN assists connectivity. There is no hosted game or signalling server and no TURN relay, so some restrictive NATs may prevent remote connections. The UI should explain this honestly.

`onStart` fires on both copies once a standalone peer joins. `beginRound()` clears standalone result guards for a rematch. `disconnect()` closes only this game's channels. Hub disconnects are governed by the hub, so it does nothing when active.

Run the real browser transport checks with:

```sh
/home/micha/.local/share/pipx/venvs/playwright/bin/python test-network.py
```

It owns its ephemeral 127.0.0.1 HTTP server and Chromium browser, and closes both. It checks BroadcastChannel and actual WebRTC data-channel pairing, controls, snapshots, result reporting, disconnects and rematch reset.

For hub conformance, serve the final game and `hub/harness.html` under the same server root. Open `hub/harness.html?game=../GAME.html&players=2&auto=1`. Run again with `scenario=server`, `scenario=host-leave`, and simulated `latency=150&jitter=50&loss=5`. The supported seat range is 1–2, so use two players. The completed result is `window.__hubCheck`.
