# Keystone Bumbling Beat — network integration

The user-requested AI Hub integration reference was fetched directly using `gh api` from `michaelcrosato/ai-hub/lib/hub` on 2026-11-05. No game-source internet research was done. Current reference: AI Hub Session Protocol v1, unmodified client version 1.4.0.

## Single-file packaging

Paste the exact contents of `session-client.js` into a classic script immediately after `<meta charset="utf-8">`, before any game scripts. Do not bundle or transform this script. Bundle `hub.js` with the game's main module normally.

Required head tags:

```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-2">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-goal" content="Catch the crooks before closing time.">
<meta name="hub:session-howto" content="Move: stick / A D. Jump: Cross / Space. Duck: down. Lift: up.">
<meta name="hub:session-minutes" content="4">
```

Add `<meta name="hub:webgpu" content="required">` only if the game cannot run without WebGPU.

## Root game contract

```js
const bridge = new HubBridge({
  onStart: ({in: countdownMilliseconds}) => {},
  onInput: (input, fromSeat) => {},
  onState: (snapshot, fromHostSeat) => {},
  onLeave: ({id, reason}) => {},
  onTimeUp: ({graceMs}) => {},
  onEnd: ({reason, standings}) => {},
  onStatus: info => {},
  onJoin: info => {},
  onFinished: outcome => {},
  onError: text => {},
});
const info = await bridge.connect(); // null outside AI Hub
// Build world, load physics, then:
bridge.ready();
```

Session copies skip the title, attract mode and title menus. In a session, start actual simulation only when `bridge.canPlay()` is true (waits for synchronized `AIHub.time() >= 0`). Do not pause the authoritative simulation from a local game menu in a session; the hub owns the round clock. On `onEnd`, stop game input, simulation traffic and sound. Ignore Options while controller Create is held.

Properties: `active`, `connected`, `isHost`, `server`, `me`, `host`, `players`, `started`, `finished`, `ended`. `info()` returns a plain safe object. `inspect()` adds traffic counts/errors for tests. In AI Hub a host can be a dedicated copy with `server: true`; in that case `me` is not in `players`, so create no local playable cop. Every seat sends its controls to this host.

Call guest `bridge.sendInput({move, jump, duck, interact, downUse, dash})` every frame. Move is -1..1; duck and downUse are held states, other actions are pulses latched over the 10 Hz network interval. Host `onInput` receives authenticated seat id; consume jump/interact/dash once and retain movement/duck until the next packet. Clear stale remote controls if a seat leaves. Per-seat input sequence numbers reject replays without rejecting another guest's first message.

Call host `bridge.sendState(snapshot)` every frame. Only JSON snapshots, below 16 KB; transport caps them at 10 Hz. Guest `onState` accepts only the host's increasing sequence. Guests display snapshots and do not step a second authoritative simulation. Passing `true` as the second argument forces a packet for end/initial states; use sparingly.

Host finishes a team round once:

```js
bridge.finish({score: teamScore, won: caughtAllCrooks, stats: {Catches: count}});
```

This reports all current seats tied, identical team scores, per-seat copies of stats, and `won`. An optional explicit `scores` object or `awards` array is accepted. On hub `time-up`, callback runs synchronously; if game does not finish in that callback the adapter reports a loss with the latest snapshot's numeric score. `finish()` is idempotent. Guests cannot finish. A session's leaving/quit/restart belongs to the hub, so `disconnect()` does nothing there. `fail(message)` reports fatal inability to play.

## Standalone multiplayer

Local co-op on one screen is owned by the root game.

Direct online co-op uses standard WebRTC data channels with manual signaling, no game server, chat, broker, custom names or audio exchange. These methods are never called in AI Hub:

1. Host `await bridge.createOffer()` returns an invite string to copy to a friend.
2. Guest `await bridge.acceptOffer(inviteString)` returns a reply string to return to host.
3. Host `await bridge.acceptAnswer(replyString)` connects.
4. Both copies receive `onJoin(info)` once the channel is open; host starts a fresh 2-cop run, guest displays snapshots.

The peer connection uses a public STUN server for address discovery. Restrictive NATs may need TURN, which this server-free single HTML intentionally does not provide. The UI should describe direct connection failure honestly rather than promise universal matchmaking.

For same-browser/same-origin two-tab play, `bridge.openLocalRoom(null, true)` returns a six-character host code. Guest uses `bridge.openLocalRoom(code, false)`. `onJoin(info)` fires on each copy after the handshake. This mode uses `BroadcastChannel` and does not work between different devices. Label it as a same-device/tabs room in UI.

`bridge.begin()` marks a standalone run's clock. `bridge.disconnect()` closes peer/room transports and restores solo state. `destroy()` tears down subscriptions and all adapter-owned timers/channels.

## Tests

Single command:

```
node Keystone-Bumbling-Beat-Keystone-Kapers-gpt-6.1-sol-ultra-20261105-215824/hub-tests.mjs
```

The script prints failures only plus one final count. It runs 15 module-level tests and one combined browser test with two Chromium pages, including real BroadcastChannel and direct WebRTC signaling/data. It starts its own loopback server on an OS-selected port and closes it after the test. `--unit-only` skips browser transport testing. Can aggregate via `import {runHubTests} from './hub-tests.mjs'`: await `runHubTests({browser:true})` returns `{passed,failed,failures}` without printing.

Results: **16 checks passed, 0 failed**. Testing caught/fixed one critical bug and one minor standalone-restart issue before delivery: dedicated-server copies receive guest seat 0 and seat 1 with independent sequence counters, so replay rejection must track last sequence per seat. A new standalone run now clears the previous finish marker.

The root game must also run the official AI Hub harness against the final HTML to test lifecycle plus simulation integration. Serve `harness.html`, `bridge.js`, `round.js` beside the game's HTML using an OS-selected localhost port, then visit `harness.html?game=GAME.html&players=2&auto=1`. Add variants `&scenario=server`, `&scenario=host-leave`, and network latency/jitter/loss. Success is `window.__hubCheck.pass === true` and `document.body.dataset.complete === 'true'`.

## Final HTML official harness result

The final root HTML was tested with unmodified official harness assets using `hub_harness_test.py` on 2026-11-05. **53 checks passed, 0 failed**:

- Standard, 2 seats: 13 pass.
- Adverse simulated network, 150 ms latency / 50 ms jitter / 5% loss, 2 seats: 13 pass.
- Host leaves: 13 pass; remaining copy receives host-left/void end.
- Dedicated server with 2 player copies: 14 pass; non-player host runs world, receives both independent input streams, broadcasts state, finishes team result.

Report: `hub-harness-results.json`. All copies ready without a key, synchronized round start, traffic in both directions, valid time-up finish, final end delivery, no protocol or runtime/dialog/socket violations. Private test server and browser closed after the suite. A separate read-only review flagged `onEnd` pause audio/input handling to the root agent: protocol requires fully stopping audio and ignoring further input, which the official harness does not inspect acoustically.


## Final integration regressions

The bridge transport suite now includes duplicate room-join retries without restarting an existing host, real BroadcastChannel leave/pruned seats/rejoin with fresh input sequence, and real WebRTC channel close emitting exactly one leave. Result: **16 network checks passed, 0 failed**. Local transport leave is idempotent, prunes departed names, clears replay counters, and updates status.

`network_app_checks.py` exports quiet `run_checks(browser, base_url, game_url)` for the root aggregator. It uses two real game pages for 10 checks: room authority with a forced pre-join guest attract replay, actual snapshots, one ride for held E, remote down+E lift descent, shared case reports, guest control after advancing, a complete shift and restart, guest leave persisting across case loads and successful rejoin, surviving-seat stability under controlled dedicated-host metadata, and no runtime errors. Lift waits extend from 10 to 45 wall seconds only when simulation steps are advancing. Failures include exact stage and both copies' controls/state diagnostics. The dedicated-host mapping stand-in preserves the actual guest keyboard and BroadcastChannel stream while avoiding a third software-GPU world.

A diagnostic run of the earlier build identified the exact source of its held-E timeout: the guest retained local attract mode after joining, so its first input exited attract and was consumed. Root fixed attract state on join/start/state and restricts attract to solo transport. Updated app integration checks are included in the root's final suite.
