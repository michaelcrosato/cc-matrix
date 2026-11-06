# Online verification evidence

The exact packaged root HTML is served through a temporary HTTP server bound to `127.0.0.1` on an OS-selected port. The test closes its browser/context and shuts down that server. The official pinned `vendor/hub/harness.html`, `bridge.js`, and `round.js` run unchanged.

`npm test` includes the browser checks through the single quiet runner. `tests/hub-browser.py` writes JSON under `tests/artifacts/` and prints failures plus a final JSON count; targeted flags are `--official-only`, `--manual-only`, `--campaign-only`, `--server-only`, and `--campaign`.

## Proven scenarios

- Released automatic harness: one-seat session; two-seat co-op with 150 ms latency, 50 ms jitter and 5% loss; host departure; dedicated server with two player clients. All official checks pass, including ready/start, transport in both directions, cooperative time-up outcome, no protocol warnings/errors/dialogs/popups/sockets, and no sends/ticks after delivered end.
- Explicit non-host departure: the remaining scout continues; the departed body and pending respawn are removed. The hub may display that departed player last, while the host's active standings contain only the surviving member.
- Visibility: short hidden-host simulation continues; the official hub bridge owns the over-20-second host-hidden void. After its delayed end arrives, returning visibility never resumes the round.
- The official/manual browser group has **28 checks**.
- Full two-player stress campaign: both clients use ordinary actions, with actual 150 ms latency, 50 ms jitter and 5% loss. The host controller reads its authoritative world; the remote controller reads received snapshots. Representative accepted preflight: hub seed 1982 (combat seed 3249287277), victory after 51.458 simulation seconds, six core hits, two airborne interceptions, four ordinary deaths, four renewable refills, score 40,659 matching both copies. Shield masks, core HP, reserves, and final tick agree. See `tests/artifacts/hub-campaign-preflight-standard.json`.
- Full dedicated-server campaign: **one player plus a server**, within the declared 1–2 seat range. The server engine/render loop is stopped and its canvas hidden; its independent adapter timer completes every sector. A read-only omniscient harness planner selects ordinary controls in the remote client; those controls still traverse AI Hub and host validation. No added latency/loss is used for this progression proof. Representative accepted preflight: 84.375 simulation seconds, six core hits, two airborne interceptions, zero deaths, five renewable refills, score 48,347 matching client and server, 10,125 authoritative ticks, and exactly one host finish. See `tests/artifacts/hub-campaign-preflight-server.json`. No charge, reserve, phase, damage, or victory state is granted. The separate official server stress case retains **two player clients** and 150 ms latency, 50 ms jitter and 5% loss; two active players completing the campaign are proved by the normal stress campaign.
- `tests/server-pilot.test.mjs` supplies six read-only/sampled/quantized policy checks, including 100–150 ms holds and input delays. Additional deterministic jitter trials cover random holds of 10–24 ticks and delays of 0–8 ticks. The pilot emits the ordinary action shape and never changes gameplay state.

## Regressions addressed

A direct `finish()` initially could reach the hub before a delayed final snapshot reached another copy. An outcome token is now acknowledged in the normal input stream before guarded finish, with a two-second fallback inside the hub's five-second time-up grace. Simulation halts at the completed tick while handing off the final world.

An early scripted controller was sampled at rendering cadence while its actions were sent at network cadence, advancing its private firing/evading memory ahead of actual transmitted commands. The optional remote `setInputSource` now samples a controller immediately at the actual packet edge, independent of rendering. Normal device controls use the unchanged default path. Provider sampling, countdown, edge persistence, and disposal are covered by a mock regression. The controller policy and game balance stay separate; no resource or damage rule was relaxed.

## Transport measurements

In the retained stress preflight the host sent 434 packets, with zero send drops and a 5187-byte maximum reliable topology/recovery packet. In the dedicated-server preflight it sent 847 packets, with zero drops and a 4808-byte maximum reliable packet. Every packet stayed below the 16384-byte hard limit. Busy ordinary snapshots sometimes exceed the advisory 1200-byte fragmentation size (174 stress and 111 server preflight packets); reliable recovery and final convergence succeed. These are measured protocol observations, not an FPS claim.

Fourteen mock checks additionally cover authority forgery, impossible vectors, sender membership, stale controls/packets, cannon repetition/deduplication, countdown, host-local input, server ticking without rendering, transition time-up, leave, exactly-once completion, end cleanup, topology round trip, false-send retry, final handoff, and packet-cadence input providers.
