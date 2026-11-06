# AI Hub and standalone co-op

Researched the live AI Hub protocol README, session.js, bridge.js, round.js,
retrofit.md, and the examples listing through GitHub's authenticated CLI on
2026-11-05. Source: https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub

The unmodified `session.js` is protocol 1, client 1.4.0. Paste its exact text
as the first head script immediately after charset. Do not bundle or minify
that script: AI Hub recognizes and upgrades the unmodified client.

Required head metadata:

```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-2">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Cross four jungle trials and rescue your expedition pal">
<meta name="hub:session-howto" content="Move: stick/WASD. Jump/grab: Cross/Space. Action: Square/X. Pause: Options/Esc.">
<meta name="hub:session-minutes" content="6">
```

Only add `hub:webgpu=required` if there is no working WebGL2 renderer fallback.

## Game integration

`JungleOnline` in online.js takes callbacks:

- `onStart()` begins the expedition on host and guest.
- `onInput(input, from)` updates host input for the remote player.
- `onSnapshot(state)` updates guest state and visuals.
- `onStatus(message, online)` updates room status UI with plain text.
- `onTimeUp()` should show time-up and report the team's current score.
- `onEnd(event)` stops all input, simulation, and audio.
- `onDisconnect()` optional standalone partner disconnect notice.

Call `await online.init()` after creating the module. When `hubActive` is
true, skip the title/menus/attract mode and call `online.ready()` when loading
is finished. The hub draws the teaching card. The module calls onStart only
after the hub clock reaches zero. `online.running` stays false before that.

The host (`isHost`) simulates the world and calls `sendSnapshot(state)` every
frame. The guest sends `sendInput(input)` every frame and only draws received
snapshots. Both functions throttle themselves to approximately 14 messages
per second. Brief boolean button presses are retained across packet intervals.
Snapshots must fit in the protocol's 16KB JSON limit; prefer below 1200 bytes.

In a server scenario, `server=true`, `playerIndex=-1`, and `isHost=true`:
simulate both players from incoming input without assigning local input to
either player. `playerCount` reports the number of actual players.

Call `finish(score, won)` on natural victory/failure. On time-up the module
invokes onTimeUp and, if still unreported, automatically reports last snapshot
score with won=false. All players tie because this is a cooperative result.
Host departure is handled by the hub itself. Session leave/restart/title
actions must be disabled. The module never opens external networking in an
AI Hub session, including PeerJS CDN imports.

## Standalone rooms

`await createRoom()` returns a six-character code immediately and opens a
PeerJS 1.5.5 WebRTC room using the public PeerJS broker. `joinRoom(code)` joins.
When connected, host `startGame()` starts both peers. Real internet connectivity
depends on the public broker and the peers' NAT/firewall configuration; no
authenticated TURN relay is configured.

Same-browser tabs use BroadcastChannel on the same origin as a direct route.
`createRoom({local:true})` creates LOCAL-XXXXXX, which skips PeerJS completely
and supports deterministic two-page tests. This route is for two tabs in one
browser profile only; ordinary six-character rooms also support it automatically.
Leaving closes only this game's connection, peer, and channel. Same-browser
peers send heartbeat packets; a closed or suspended partner is detected within
about eight seconds, and the host can accept a new partner.

## Verification

`/home/micha/.local/share/pipx/venvs/playwright/bin/python network-check.py`
checks 13 conditions: room creation, joining, synchronized start, guest input,
host state, packet throttling, stale snapshot rejection, departure notification,
solo reset, start gating, invalid code rejection, rejoining an active expedition,
and detecting a hard-closed partner tab. It starts and stops its
own ephemeral 127.0.0.1 server and prints only failures and one count line.
Result: 13 passed, 0 failed. Adding `--internet` runs three further checks in
separate browser contexts, which cannot share BroadcastChannel: public-broker
WebRTC connection, guest input delivery, and host state delivery. The full
command passed 16 checks, 0 failed, on this machine. Cross-device NAT traversal
without a TURN relay remains unconfirmed.

Vendored harness: `hub-harness.html`, `bridge.js`, and `round.js`, unmodified.
Serve the game root and open
`hub-harness.html?game=../GAME.html&players=2&auto=1&limit=12`.
Wait for body.dataset.complete==='true' then inspect window.__hubCheck.pass.
Repeat with scenario=server, and scenario=host-leave. Test with latency=150,
jitter=50, loss=5. The game advertises two seats, so the four-seat protocol
stress case is outside the supported seat range.

`hub-check.py` performs four integrated harness runs against the final root
HTML: standard two-player time-up, dedicated server with no local player,
host departure, and natural victory through both bell actions and cage rescue
with 150ms latency, 50ms jitter, and 5% packet loss. It also checks that game
simulation starts only after synchronized clock zero, freezes after hub end,
audio pauses after end, and the server has no player index. The first run
passed all 83 checks with no failures; detailed reports are saved in
`hub-test-results.json`.
