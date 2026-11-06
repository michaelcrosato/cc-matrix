# Hub integration and harness review

Inspected 2026-11-06. Vendored repository `vendor/hub-repo`, commit `35a1047f2067b2af3de3943f0fe452f39105d869`. Protocol 1; released client 1.4.0. Reviewed README, session.js, shared-world arena example, harness.html, bridge.js, round.js, scripts/hub-check.mjs, scripts/lib/hub-client.mjs and scripts/lib/serve.mjs.

## Bootstrap and ownership

- Paste **exact** `lib/hub/session.js` as the first script in head, immediately after charset; exclude it from minification, escaping or other transforms. Its released banner-to-last-line LF-normalized SHA-256 is `529eac78c54cfff0e60d375a9c63f66d1a594327ddcc262a2bdf9b1f2fb6582a`. Use `findClients()` from the vendored checker support module to assert exactly one pristine client.
- Declare session 1, seats 1-2, mode shared-world, minutes 15, plus goal and controls metadata. `AIHub.active` is available before any game script. `AIHub.connect({mode:'shared-world', seats:[1,2]})` resolves to info or null. Null means ordinary standalone flow.
- After connect returns, info includes `me`, `players:[{id,name,color}]`, `host`, `isHost`, `server`, `seed`, `round`, `limitMs`, `mode`. Players use zero-based IDs. Never assume `me` is a player: with `server:true` the hidden host has no seat in players.
- Install lifecycle handlers and initialize simulation/runtime, then `AIHub.ready()` exactly once without gesture or sound permission. Default Hub card requires no game-specific Ready UI.
- `start({in})` means countdown began, **not gameplay began**. `AIHub.time()` is milliseconds, -Infinity before start, negative during three-second countdown. Tick only at time >=0. Clock is wall time independent of menus and game speed.
- Only `AIHub.isHost` advances canonical world. A dedicated server must initialize and ready, tick, send snapshots, handle leave/time-up, and finish; it requires no renderer/input/audio.
- `AIHub.on(type,fn)` returns unsubscribe. Events queued before registration are delivered asynchronously in order after first handler attaches.

## Messaging and completion

- `AIHub.send(data,{to,reliable})`; default reliable=true, omitted to broadcasts to every other copy. It returns false when dropped. `AIHub.on('message',(data,from)=>...)`: authenticate the actual `from`, not a player ID inside data. Send client intent to `AIHub.host`; accept snapshots only from that host.
- Hard JSON limit 16,384 bytes; 20 outgoing messages/second per copy, burst 40. Aim at <=1,200 bytes for unreliable messages. Count combined snapshot/keyframe/event sends, not each type independently. A 10Hz snapshot + 2Hz keyframe schedule and 12Hz client intent are within budget.
- Reliable messages preserve order; unreliable messages may be lost or reordered. Carry epoch, monotonically increasing input/snapshot sequences, repeated edge counters + host acknowledgements, and bounded critical event IDs. Reject old chamber epochs, old sequences and nonplayer senders. Silence neutralizes held intent. Use one bounded send scheduler.
- `AIHub.rng(label)` returns a new generator **starting from the beginning** each call. Retain one gameplay generator and one presentation generator. Shared-world does not seed Math.random. Serializable owned PRNG initialized from session seed is suitable for canonical simulation restore; keep cosmetic randomness independent.
- `leave({id,reason})` has already removed that ID from AIHub.players. Remove/recover its entity/key, preserve remaining roster. No migration: host leave voids round and end follows.
- Host finishes exactly once: `AIHub.finish({standings:[remainingPlayerIds],scores:{[id]:score},won:boolean,stats?,awards?})`. For co-op, every remaining ID is in the same inner array. `stats` is `{[id]:{name:value}}`; awards are `[{id,title,detail}]`. Finish loss on wipe or time-up, victory on extraction.
- `time-up({graceMs})` requires finish within supplied grace (current default 5,000ms). Do not wait for another simulation tick, input, menu or sound.
- `end({reason,standings})`: stop gameplay/input/network schedulers and all sound immediately. Do not offer local restart/title for active Hub. No external socket/server/broker fetch, chat/voice/emote/custom names, dialogs, popups or navigation. Ignore Options when Create held.
- Active online pause/settings overlay sends neutral local intent, while authority and deadline continue. Disable engine automatic hidden-page/disconnect pause in online mode. Render Hub player names via text, never HTML.

## Official test harness

Required browser support files are only `harness.html`, `bridge.js`, `round.js`, all side-by-side. Harness imports the latter two as ES modules and loads game URLs only at its own origin. It does not need session.js separately when game embeds it. Serve our own folder on `127.0.0.1` with OS-selected port; assert fetched game title/metadata before trusting results.

The harness URL is `<base>/<harness-dir>/harness.html?game=<same-origin-game-path>&players=2&latency=150&jitter=50&loss=5&auto=1&scenario=standard&play=8000`. Supported scenario values: standard, host-leave, server. `limit` is seconds and `seed` fixes the round seed. Server adds a hidden authority **copy**, not an extra player seat.

Wait by state for BOTH `document.body.dataset.complete === 'true'` and `window.__hubCheck.pass === true`. On failure retain failed check details and harness log. Harness default timing may take tens of seconds; software rendering can take longer. It automatically checks hello, metadata/seats, ready with no input, countdown, directional input, two-way traffic, time-up/result, end, protocol misuse and errors. Host-leave expects void. Server expects the nonplayer authority to send snapshots and finish a played round.

Cover standard with players=1 and players=2; two-player 150ms latency / 50ms jitter / 5% loss; two-player host-leave; and two-player + server. Add game assertions for actual canonical progression, carrier departure, stale/duplicated inputs and post-end silence because official conformance alone does not prove gameplay.

### Running the unchanged CLI checker

`node vendor/hub-repo/scripts/hub-check.mjs /path-to-game.html --base http://127.0.0.1:<OS-port> --players 1,2 --json` requires a Node Playwright 1.63.0 dependency resolved from the vendored checker location or ancestor. No browser installation needed. The official script accesses harness at **/lib/hub/harness.html** on base, so expose that path or copy required files to development lib/hub. A local Node staticHandler server binds 127.0.0.1 port 0 itself when --base omitted, but defaults document root to vendor/hub-repo, requiring artifact under that origin.

Do **not** use `--record` (catalogue writes). Checker otherwise writes only its own `.cache/hub-check.json`. With `--base`, disk-only pristine client check silently skips when game is outside vendored checker root; separately run `findClients()` on final root HTML. An absolute HTTP game URL also skips that static check.

The installed Python Playwright environment can wrap unchanged harness directly without installing Node packages. This gives identical `window.__hubCheck` checks while keeping own quiet aggregate runner. Run official harness, assert both completion conditions, and independently assert client pristine + standalone file:// launch. Keep at most one browser with a few contexts; close all contexts, browser and owned HTTP server.
