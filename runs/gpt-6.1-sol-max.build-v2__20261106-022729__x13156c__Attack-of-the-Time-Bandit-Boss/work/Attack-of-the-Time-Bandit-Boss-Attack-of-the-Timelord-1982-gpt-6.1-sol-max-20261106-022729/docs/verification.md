# Verification evidence

Final artifact: `Attack-of-the-Time-Bandit-Boss-Attack-of-the-Timelord-1982-gpt-6.1-sol-max-20261106-022729.html`  
SHA-256: `b406f1aa8622a6b046ebaf9fc3580c3420967a09122aabdbd431cb62f0e8f6af`  
Size: 1516336 bytes. No source modules, runtime image files, audio files or sibling dependencies are needed.

## One quiet command

From this development directory: `node tools/test.mjs` (or `npm test`). Latest complete run: **67/67 checks passed; 0 failures**. Groups: 28 state, 4 packaging, 23 browser/input/audio and 12 networking checks. Reports contain assertions and parameters in `artifacts/*-results.json`; stdout/stderr from browser runners is retained in `artifacts/*-runner.log`. No performance/FPS gate was added.

## Campaign and exact rules

- Seeded legitimate solo action playthrough, seed 1982: 367.88 simulation seconds, score 3200, all 200 fleet hulls, eight wave clears, all four weapons, all three boss phases, 17 time brakes, 1 hit and one victory. No invulnerability, phase skipping or outcome assignment. A four-pilot action playthrough also clears the complete campaign.
- The actual delivered HTML also completes a legitimate campaign through native `game.advance` and normalized actions: 318.33 simulation seconds, score 3166, modified=false and victory=true. This bot is more accurate than a first human player; this duration is not a claim about first-run human completion time.
- State checks cover all ten tuning values, fixed-step determinism, swept collision ordering, one-hit recovery, stale action expiry, boss armor, bounded rollers and refuge scheduling, simultaneous brake requests, hostile-only slowdown, cleanup, disability/revival, departed players and terminal idempotence.

## Browser/input and visual evidence

Final bundle tested directly through `file://` in Chromium, WebKit and Firefox using installed Playwright 1.63.0. Native Canvas 2D requires no WebGL, so the workstation's Firefox renderer limitation does not block this game.

Standard-mapping DualSense stub, keyboard/mouse targeting and takeover, pad menus and glyphs, real CDP touch pointers plus context brake, pointer cancellation, portrait/landscape and low-DPR narrow geometry, focus loss, controller disconnect, paginated instructions/credits, six-letter picker focus/storage, unavailable storage, live tuning/reset and developer retry isolation all pass. Ten-second attract is exercised through native stepping, displays all weapon families and the finale, consumes wake inputs from all device families and leaves saved records alone.

`artifacts/contact-sheet.jpg`: title, early combat, combined threats, brake, boss, legitimate victory, failure, credits, landscape touch. Individual captures include a portrait touch layout. Capture helpers finish finite CSS transitions before recording; no gameplay state is changed for that visual refresh. Screenshots were used for composition and legibility; gameplay outcomes come from assertions.

## Audio evidence

All six composed lead phrases, representative native effects and the actual filtered syllable generator render finite nonzero signal through OfflineAudioContext. Music lead peaks are approximately 0.0175 at the actual 10% default; effects peak 0.214 and voice 0.079 in the isolated checks. Every muted test bus produces exactly zero peak. Native music/effects/voice/master gains and terminal silence are separately checked. These checks establish signal and lifecycle behavior, not subjective listening quality.

## AI Hub

Revision `35a1047f2067b2af3de3943f0fe452f39105d869`, protocol v1, client 1.4.0. Upstream session client Git blob `472495d5a5939531220e8e0b626bc4be9146102b` matches the vendored file; it is unchanged and is the first script after charset. Harness and bridge/round support use the same revision.

Harness served beside the actual artifact from a private loopback server bound to 127.0.0.1 on an OS-assigned port; title identity was verified before trusting results. All servers and browsers used by the runner are shut down by that runner.

| Parameters | body.dataset.complete | __hubCheck.pass |
| --- | --- | --- |
| `players=2` | true | true |
| `players=4, latency=150, jitter=50, loss=5` | true | true |
| `players=4, latency=150, jitter=50, loss=5, scenario=host-leave` | true | true |
| `players=2, scenario=server` | true | true |

Additional checks verify actual remote movement and owner-tagged shots, invalid input rejection, no PeerJS initialization under Hub, no phantom local cannon on the server host, no transmission/simulation after end, and muted terminal audio. A second stressed four-player scenario explicitly converges on disabled-player recovery, harmless ordnance cleanup, shared score, a guest brake edge retained over intermission, the next wave and terminal result. Boundary fixtures are separate from the legitimate whole-campaign runs.

Measured conformance peaks: 11 host snapshots per rolling second and 13 guest input messages per rolling second (boundary-inclusive observation), below 20; representative Hub unreliable actions at most 49 encoded bytes, below 1,200. Full seeded-run snapshots peak at 1844 bytes, below the 16 KB reliable-message cap. Decorative particles are never transmitted.

## Standalone room evidence and limits

Two independent Chromium contexts establish the default public PeerServer handshake and a real WebRTC connection (`RTCPeerConnection.connectionState === "connected"`). Create, code join, roster, ready, host start, remote movement/fire, a shared brake, authoritative integrity, actual damage loss/results, replay, guest departure, host departure, failed join and solo fallback pass. No BroadcastChannel substitute is used.

Public signaling availability and arbitrary NAT traversal remain external constraints. This verifies real data links on this machine, not every internet topology. Some peers need TURN. Connection failures/timeouts have visible retry and solo routes. Physical controllers, actual iOS hardware, a second human tester and subjective audio listening are unavailable and are not claimed.

## Defects and retained limitations

Ten distinct defects were found and fixed; two were critical (narrow-screen cropping and developer-aided retry record eligibility). `docs/build-notes.md` records discovery and fixes. Test-fixture corrections are excluded from those counts.

The game is complete within the brief: no placeholder systems, unresolved game failures or test-only victory bypass. The supplied single file contains the same patched engine and game modules that were tested. Required source information and ordered feedback are both embedded in controller-readable About/Credits and saved as the parsed root exit interview.
