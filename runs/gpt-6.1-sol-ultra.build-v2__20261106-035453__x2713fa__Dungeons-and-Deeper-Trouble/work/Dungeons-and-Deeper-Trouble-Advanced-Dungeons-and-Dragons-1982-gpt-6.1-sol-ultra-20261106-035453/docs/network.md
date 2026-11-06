# Network implementation and handoff

## Actual substrate

AI Hub protocol v1, unmodified session client 1.4.0, repository commit `35a1047f2067b2af3de3943f0fe452f39105d869`. Client, README, harness, bridge, round coordinator and examples are under `vendor/hub`. The client must be the first script after the head charset. Read README, client, shared-world example, harness and support contracts. Metadata: seats `1-2`, mode `shared-world`, goal and how-to, expected duration.

WebRTC APIs checked against [W3C Recommendation](https://www.w3.org/TR/webrtc/) and the [official peer connection guide](https://webrtc.org/getting-started/peer-connections). One reliable ordered RTCDataChannel carries commands and state. ICE gathering completes before exporting each signal. Default public STUN discovery: `stun:stun.l.google.com:19302`. No signaling backend or TURN credentials. WAN/NAT reachability is unknown; local production-browser pairing is testable.

## Integration API

Load `src/net/network.js` after the Hub client. `DTNet.connectHub(hooks)` resolves to an adapter or null outside Hub. `DTNet.createPeer(hooks,options)` returns manual direct pairing controller. Options can set seed or ICE servers (tests use no external STUN).

Hooks:
- `init({mode,authority,dedicated,localId,playerIds,seed})`: create a new authoritative world or presentation copy. Dedicated has `localId:null` and is not a roster player.
- `applyInput(id,held,events)`: production commands. Held may be null when only new actions arrived out of order; preserve old held in this case. Held keys mx/my/ax/ay in [-1,1], focus/run/revive. Events: fire/interact/dodge/quickstep/travel/quiver/map/continue, optional target/node string or index.
- `snapshot()`: JSON dynamic state only, at most 192 KiB; avoid static map geometry. `restore(state)`: atomic client replacement.
- `removePlayer(id)`: remove avatar and all pending interactions. `status(text)`: user-facing text. `stop(reason)`: clear input, stop world-affecting actions and sound. `timeUp()`: optional mark withdrawal. `result()`: optional stats.

Adapter methods: `input(held,events=[])` each sample, `update(dt)` every frame (including countdown and menus), `canStep()` gate simulation, `finish(won,stats)` once, `inspect()` diagnostics. Authority, dedicated, localId and playerIds are exposed. Only authority steps shared simulation. A dedicated authority must not rely on focus or an avatar.

Direct peer methods: `await offer()` returns invitation; guest `await answer(invitation)` returns reply; host `await accept(reply)` connects. Hook init runs only after open data channel and validated version/role/nonce handshake. `cancel()` / `close()` release connections. Clipboard UI is root-owned; text fallback is always possible. Host owns save, guest never writes solo save. On guest loss authority removes their avatar and continues. Host loss stops guest; reconnect is a fresh pairing epoch and full state.

## Protocol

Packets have `dt:1`, content `dt-expedition-1.0.0`, nonce and typed payload. All incoming commands are range and roster checked. Guests queue numbered one-shot actions until snapshot acknowledgments; authority processes each contiguous action id once per peer epoch. Held state has independent monotonic sequence and a 500ms timeout. A short press therefore survives packet loss and acknowledgments cannot duplicate arrows. Periodic snapshots reconcile all progression; large state uses bounded reliable chunks applied atomically.

All game sends use one 65ms minimum interval, at most 16 per rolling second, below Hub's 20. Guest input aims at 15Hz, snapshots 8Hz. Snapshot bodies >13KB are chunked to 9KB payloads under 16KB JSON. The reliable channel avoids unreliable fragmentation. Counters record rate, size, action deduplication, sequences and peers.

Hub calls connect, installs lifecycle listeners, initializes world and calls ready once without gesture. No title/attract/pairing appears in managed rounds. `canStep` waits for the common zero clock. Hub owns start/end. Time-up finishes unfinished expedition as team defeat; active players tie. Leave removes avatar; host departure obeys coordinator end. End stops traffic/input/sound through hook. No standalone RTCPeerConnection is constructed while Hub active.

## Evidence

Implementation and actual artifact integration are verified below. Final aggregate results are in reports/test-results.json. WAN and physical-device verification remain unknown.

## Focused protocol evidence

`node tests/network.test.cjs`: 14 passed. Coverage includes loss/reordering and a pulse shorter than send interval, deduplication, epoch/nonce/version rejection, stale held resets after resumption, atomic chunk assembly, rolling message limit and packet bytes, local action IDs, departed input rejection, dedicated no-player and tied finish-once, countdown/end rules, malformed signaling, and unchanged vendor bytes. These are unit checks; they do not replace actual production WebRTC or final artifact Hub tests.

## Real standalone transport evidence

`/home/micha/.local/share/pipx/venvs/playwright/bin/python tests/network-browser.py`: 9 passed, 0 failed using two separate Chromium contexts, real RTCDataChannel, actual complete ICE offer/answer and the production adapter from file://. Verified full bootstrap, one-shot input shorter than the send interval, one arrow debit, contested pickup once, tool/relic agreement, guest removal and solo continuation, fresh pairing, clean host loss, malformed invitation before socket construction, and no runtime errors. Fixture uses small deterministic hook state; production-campaign synchronization and final-artifact pairing still require the main integration checks. Report: `reports/network-browser.json`.

One initial fixture assertion incorrectly expected an existing disconnected peer object to have been destroyed by receiving malformed text; it was corrected to cancel the prior connection before checking that parsing creates no new socket. This was a test setup issue, not a game defect.

### Integration correction

N-001 (moderate, code inspection): movement-only input samples omitted aim, which transport defaults would have reset east. `Link.input` now retains the last deliberate aim. Added regression; latest protocol result is **15 passed**, real RTC result **9 passed**. Held input additionally accepts simulation-native `sprint`/`heldInteract` aliases. No critical/game-breaking network defect found in these checks.

## Hub bring-up evidence

The unchanged upstream harness was run with the production adapter and a small hook-state fixture before main integration: **6 scenarios passed, 79 conformance checks**. Cases: two players, 150ms latency/50ms jitter/5% loss, adverse host departure, dedicated no-player authority, one player, and explicit two-player guest removal. Owned ephemeral loopback server and browser closed. `reports/hub-bringup.json` preserves this substrate evidence. These results are **not final artifact acceptance**; rerun `tests/network-hub.py` without arguments after the root HTML exists.

N-002 (moderate, adversarial Chromium test): cancelling before Chromium's `createOffer()` settles could leave the old offer promise pending. Pending operations now race explicit cancellation and a 30-second timeout, use captured peer objects, and check generation before changing state. Immediate retry cannot be closed by an older operation's rejection. Added real-browser cancel/immediate-retry regression; latest **15 protocol checks and 10 real WebRTC checks pass**. Test-discovered network defects: one (N-002), zero critical. Pending bring-up browser was stopped by its recorded Python PID after the formerly unbounded cancellation test; its driver/browser closed with the connection. Subsequent tests close normally.

## Actual root artifact evidence

First actual delivered-HTML Hub run passed six scenarios and 73 unchanged harness checks. Main integration originally used an ignored `hub:session-duration` tag; root was notified to use documented `hub:session-minutes`. A final run after that build correction is pending. The actual-artifact harness now also checks game roles and cleanup: skipped title/attract, stopped adapter after end, actual dedicated no-local-player roster, continuing authority after guest removal, and packet/rate limits.

`tests/network-campaign.py` loads the exact root deliverable from `file://` into two separate Chromium contexts, exchanges real production WebRTC offer/answer, and supplies commands through the app's normal sampled-input and `app.send` path. The clock uses fixed `game.advance` steps without drawing; there are no state edits, warps, grants, cheats, skipped guardian phases or victory injection. The host follows the same read-only expedition director as the simulation acceptance test; the guest follows the leader and assists with production bow/interact/dodge commands.

Latest production network campaign: **9 passed, 0 failed**, including a complete standard-rules two-ranger expedition, remote sub-send-interval press spending one shaft, every projectile applying at most one wound, authored contested cache crediting exactly seven arrows, matching tools/relics/quiver/enemy wounds, guest solo-save isolation, finish-once, and zero engine/browser errors. Both copies reached victory with all tools and two relic halves, assisted=false. See `reports/network-campaign.json`.

An initial automation used two independent route directors; they chose opposite routes around the Drowned Archive loop and stopped at the intended party tether. Both copies agreed exactly, and human players could backtrack; this was an automation coordination failure, not a transport defect. The test now uses a coordinated leader/follower. Its initial report is preserved as `reports/network-campaign-independent-bots.json`.

N-003 (**critical/game-breaking for guest-departure continuation**, test-discovered): an abandoned host RTCPeerConnection remained alive after its guest's data channel closed. It later entered ICE `failed`, which closed the continuing authority and halted solo play. The longer production guest-departure/full-clear test caught the delayed failure, which an immediate continuation assertion missed. `Peer.lost` now detaches callbacks and closes transport while retaining the host's in-process authority. Established-connection failure routes through the same departure handler. Added real-browser assertion that the orphaned PC is already gone. Protocol15 and RTC10 pass; production full-departure rerun underway. Original evidence preserved at `reports/network-campaign-guest-leave-before-fix.json`.

The fixed actual-artifact guest-departure branch now passes **9/9**: two peers play through the axe, guest leaves, avatar is removed, authority stays live with its orphaned transport closed, and the remaining ranger completes all remaining caves and both guardians under standard rules. No cheats, assists, deaths, restarts, runtime errors or save contamination. Evidence: `reports/network-campaign-guest-leave.json` (artifact SHA included). This demonstrates a full valid solo finish after departure, including the time beyond the former delayed ICE failure.

Network test-discovered game defects total: **2**, of which **1 critical** (N-002 cancellation retry moderate; N-003 delayed disconnect halt critical). N-001 was inspection-found, and independent-director deadlock was test automation.

## Existing-expedition join/reconnect evidence

Root added current-host state preservation to `networkHooks.init` and an Invite action for an eligible active expedition. `tests/network-lifecycle.py`: **9 passed**, actual root HTML and real RTCDataChannel. A solo ranger enters the cave and fires before pairing. Joining preserves cave/time/quiver/enemy and supply state and the in-flight arrow (owner remapped to host seat0); guest receives the complete matching snapshot and a validated nearby protected spawn. Departure retains authority; reconnect uses a fresh input epoch and complete current state; host loss stops the actual guest and exposes its connection-ended flow. No world-state edits or grants. Report: `reports/network-lifecycle.json` with artifact SHA. Browser closed normally.

## Final actual-artifact Hub matrix

Latest actual delivered HTML: **6/6 scenarios, 93 checks passed** = 79 unchanged upstream conformance checks plus 14 game-specific role/lifecycle/traffic checks. Cases include normal two-player, 150±50ms/5% adverse network, adverse host departure, dedicated authority, one-player, and explicit guest removal. Verified dedicated server's localId=null, no phantom avatar, actual advancing simulation, live authority independent of focus, all managed copies bypassing title/attract and stopping on end, and actual removal of the departing avatar. Recorded rates and sizes stay within caps. Owned loopback server/browser closed. Report: `reports/hub-harness.json` includes actual artifact SHA. Interview-only edits after this do not alter the tested network implementation; final root packaging smoke still applies.

## Default pairing UI and bounded STUN fallback

N-004 (moderate, test-discovered/environment-specific): public STUN discovery did not answer on this machine. The default UI previously timed out after15 seconds without an invitation, although local host candidates could pair correctly. Default discovery now tries documented public STUN for4.5 seconds, then closes that attempt and creates a fresh peer with no STUN server. It waits for this fresh peer's ICE gathering to complete before exporting. Host and guest use the same bounded fallback; cancellation and generation isolation still apply. Custom ICE configuration can retain its own timeout.

A fallback invitation/reply explicitly says **LAN** and that wide-area pairing may need a relay. Host candidates are local/LAN connectivity only; this is not evidence of WAN/NAT success. No relay credentials or signaling backend are embedded. The final UI default-path test uses no ICE override.

`tests/network-default-ui.py`: **6 passed**, actual root HTML, actual Host / Join / Connect UI methods, default public STUN configuration, real two-context RTCDataChannel, complete ICE export on both peers, full bootstrap, and a genuine shared bow command. The host’s public discovery was unresponsive and fell back successfully in4.93 seconds; the guest completed its default ICE gathering in0.13 seconds without needing fallback. The host UI exposed local-only scope. Report: `reports/network-default-ui.json`, original failure: `reports/network-default-stun-before-fix.json`. Browser closed normally. Protocol15 and direct RTC10 also reran after the patch and pass.

Final network test-discovered defect count: **3 total, 1 critical**: N-002 (moderate cancellation retry), N-003 (critical delayed ICE failure halting solo continuation), N-004 (moderate default discovery fallback). N-001 retained aim and the null-Hub boot fallback were inspection findings. All fixed; physical controllers/devices, human audio listening and WAN/NAT coverage remain unknown.

## Final suite navigation regression (in progress)

A later full-orchestrator co-op run caught SIM-005: follower stopped at a reflecting bank while both authoritative copies agreed. The driver already used `moveClear`; read-only reproduction showed `sim.path` returned a first edge crossing the physical bank because it checked cell-center occupancy but not connecting-edge clearance. Actual actor position(386.92494,412.15378) is valid while its tile center(392,408) lies on the bank; first returned node(408,408) was unreachable by `moveClear`. Reversing the same route also returned no path because a valid off-center goal occupied a blocked-center tile. Simulation agent owns the navigation fix and regression; no test-only collision bypass or state mutation is used. Network campaign rerun is pending that patch. This is a moderate simulation defect, outside the three transport defect count.

SIM-005 path geometry fix is now verified in the affected real-network campaign: **9/9 passed**, full standard-rules co-op victory after rebuilding with actual start/goal anchor and connecting-edge validation. Follower command steering additionally smooths only to consecutive `moveClear(...,5)`-reachable route nodes, so it cannot skip a near corner through a bank; it still fails rather than bypassing an invalid first nav edge. No world mutations or collision exceptions. `reports/network-campaign.json` is the latest affected rerun. Root will run the final consolidated suite after source/metadata stabilization.
