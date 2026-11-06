# AI Hub and direct co-op research

Researched 2026-11-06 using GitHub CLI against the requested repository.

- Protocol: https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/README.md
- Official client 1.4.0: https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/session.js
- Host/guest/server example: https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/examples/arena.html
- Harness: https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/harness.html
- Existing-game retrofit guidance: https://github.com/michaelcrosato/ai-hub/blob/main/lib/hub/retrofit.md

`hub-session.js` is an unmodified copy of the official client. Bundle it as the first script in `<head>`, immediately after `<meta charset>`. It must run before game or dependency code. Use `hub:session=1`, `hub:session-mode=shared-world`, `hub:session-players=1-2`; describe win and controls in the other protocol metas. The game is cooperative and all players tie on the team outcome.

## Main-game integration

`new NetworkLink(callbacks)` supports these callbacks:

- `onMessage(type, payload, from)` receives game data.
- `onStatus(text, detail)` reports connection progress.
- `onRole(role, link)` reports `solo`, `host` or `guest`.
- `onConnected()` after a standalone peer opens.
- `onStart(data)`, `onTimeUp(data)`, `onEnd(data)` and `onLeave({id,reason})` are AI Hub lifecycle hooks.

Call `await link.connectHub()` early, then `link.ready()` when the level can begin. If the return is non-null, skip title, menus and attract mode. The hub owns the ready card. Simulate only after `link.time() >= 0` and only while the round has not ended. `server` indicates the host copy has no player of its own: do not read local input or create an extra player in that copy; still run simulation and snapshots.

The host owns all mission state and player consequences. Non-hosts send input. `send(type,payload,{to,reliable})` passes the data through the session or direct peer. Set `reliable:false` for regular inputs and snapshots. Send at 15 Hz or less; the protocol budget is 20 messages/second and 16 KB/message. Reject snapshots from anyone except `info.host`; host accepts inputs only for `from`.

On a completed rescue or `onTimeUp`, the host calls `finish(won, scores, stats)` once. It emits all remaining player ids in one tied standing. In `onEnd`, stop input, simulation and sound. Session mode does not restart, quit to title, open tabs or use browser dialogs. Ignore controller Options while Create is held.

## Standalone direct co-op

The host calls `await host()` and shares the returned invitation text. A guest calls `await join(invitation)` and shares the returned reply. The host calls `await accept(reply)`. Once both show `connected`, use the same send/onMessage interface. There is one ordered WebRTC data channel and a Cloudflare STUN server; there is no account, signaling service, WebSocket or relay. Direct connectivity works on LAN and many NATs; restrictive networks may need AI Hub instead. No RTC object or external networking is created in a hub session.

## Harness

The unmodified official harness and its imports are under `hub-harness/`. Serve the workspace root and open:

`<dev-folder>/hub-harness/harness.html?game=../../<game-file>.html&players=2&auto=1`

Use `scenario=server` for a dedicated host and `scenario=host-leave` for host departure. `window.__hubCheck.pass` is the required result; `document.body.dataset.complete === 'true'` signals completion. The game supports at most two players, so skip the generic four-player case.

`test_network.py` exports `network_checks(browser, base_url)` for the single game test runner. It opens two temporary pages, validates malformed-code handling, performs a real offer/reply/accept connection, sends state and input in both directions, and checks cleanup. It returns check tuples without printing. It can also be run directly with the installed Playwright Python as a standalone diagnostic.
