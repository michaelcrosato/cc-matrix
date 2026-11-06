# Release verification

Final shipped artifact: **384 checks passed**, including 30 native simulation/content cases, 80 deterministic network checks, 47 packaging/demo checks, 34 audio/input checks, 112 integrated Chromium checks, 16 WebKit checks, 64 official Hub checks and one build. The final artifact SHA-256 is `60b2be456020eff56a7bde227073ecb631fcdc26322a991698d91e6da02d4311`. No required check remains failing.

Run `node tools/verify.mjs` from the development directory. It builds the exact shipped HTML, then aggregates native simulation/content checks, Hub protocol and native network cases, all three online expeditions and a hidden-server expedition, package/provenance checks, coded audio/input/multitouch, integrated browser UI and the untouched official Hub browser harness. Successful output is one passing-count line. Failing tools print only actionable failures. `evidence/verification.json` is the machine-readable report and `evidence/hub-report.json` records the exact tested HTML hash.

## Evidence

- `tests/sim.test.mjs`: native coyote time, buffered/variable jump, crouch, safe drops, permanent ladder traversal on all rooms/routes, temporary expiry grace, safe endpoints, stable IDs, contact deduplication, high/low redirects, durability/heavy ore, simultaneous break/collision/pickup ordering, reproducible supplies, bounded unarmed recovery, expired key replacement, co-op pickups/rescue/departure, explicit door interaction/jam, failure/retry, tuning and roundtrip continuation mid-jump/mid-ladder.
- Normal-input solo scripted expeditions, seed99, finish SUN/MOON/STAR in139.99/121.20/182.67simulation seconds. They assert ordered feature events across all chambers, armed→broken→renewed, unique key collection, three doors, extraction waves and victory. No invulnerability, teleports, grants or completion shortcuts are used. Simultaneous local co-op also completes with both miners alive.
- `tests/hub-unit.mjs`, `hub-native.mjs`, `hub-expedition.mjs`: authenticated ownership, countdown/ready, no replica authority, input edges under loss, visibility clock handoff with no RAF, stale epoch rejection, acknowledgments, key carrier departure, first-tick prediction, message bounds, exactly-once finishes, time-up/end and server scheduling. Every route completes with150ms latency±50ms jitter and5%packet loss in a little over two simulation minutes on the recorded seeded routes; hidden nonplayer authority also completes with substantial margin. These are deliberately uninterrupted skilled input streams with more than12minutes of Hub deadline margin, not a measured first-player10minute experience.
- `tools/hub-check.mjs`: the unchanged official checker and vendored harness run one player, two players with the prescribed faults, host leave, and two players plus hidden authority. Both `__hubCheck.pass` and body completion are asserted by the checker. The wrapper verifies served game identity, pristine client placement,15minute metadata, correct how-to card fields and a stable artifact hash. It starts an owned server bound127.0.0.1 at an OS-selected port and closes it in `finally`.
- `tests/audio-browser.py`: actual offline music/SFX/voice energy and amplitude, default0.1music, independent controls/mute, native buses, event deduplication, steps/rungs, pause/reset/dispose, native rebinding, keyboard edges, separate pads and actual multitouch/assisted actions.
- `tests/browser.py`: file launch, no console/native errors, title/gameplay, pad-only screens, mouse, native rebind/settings, checkpoint retry, practice, Developer sliders/reset, virtual ten-second attract boundary/wake cleanup, and actual portrait/landscape touch. Browser stand-ins are the installed Playwright1.63environment; no browsers were installed.
- `tests/packaging.mjs`: exact hand-in names, feedback schema/order/nonempty strings, source/version/title/catalogue consistency, complete inline JavaScript parsing, no relative script/style/media dependencies, pristine first Hub script and full attract feature coverage on every looped route using the real contact path. The kiosk stages its last-contact redirect so normal bot skill cannot skip the broken-pick demonstration.
- tests/webkit.py: independent WebKit file launch, uncropped phone geometry, real touch jump, pause/settings and native error checks in portrait and landscape.
- Screenshots in `evidence/`: title, opening, dense Motherlode, unarmed recovery, pause, Developer, About, portrait tracking/edge warnings, landscape and reduced-flash composition. Scripts establish mechanics; images establish composition and silhouette/readability.

## Unique defect ledger

Critical means a defect prevents launch/control/progression/completion, loses authoritative game state, or breaks a mandatory mode. Separate repeated assertions of one cause count once. The following26distinct implementation defects were found across test, visual and contract/state review; every one is fixed. Five are critical. Test-oracle corrections are excluded.

| ID | Severity | Discovery | Defect and correction |
| --- | --- | --- | --- |
| D01 | Major | Native scripted probe | Pilot dismounted25units below a target ledge and repeatedly missed it. Climb until actual landing height before dismount. |
| D02 | Critical | State review + regression | Platformer constructor reset private coyote/jump-cut timers on restore. Reapply every serialized field after constructing the native prototype. |
| D03 | Critical | State review + regression | Rebuilding ladder warnings during restore duplicated events and consumed event IDs. Suppress reconstruction events and preserve the event counter. |
| D04 | Major | Geometry review + test | Several temporary ladders ended inside gaps. Choose shortcut columns with safe landings on both adjacent tiers. |
| D05 | Major | Native screenshot | Rock actor draw used world coordinates inside an actor buffer and clipped ore. Use the callback’s local origin. |
| D06 | Critical | Phone screenshot + touch proof | Native fixed-resolution scale clamped to1, cropping the mine and side gates. Permit fractional fit below1. |
| D07 | Minor | Audio/native integration test | Footsteps read `grounded` instead of native `onGround`. Use the native property. |
| D08 | Minor | Hub scheduler unit test | Floating-point accumulator dropped a boundary tick for the hidden authority. Use a stepping epsilon. |
| D09 | Critical | Hub contract review | Initial metadata used unsupported duration/how field names. Use `hub:session-minutes=15` and `hub:session-howto`. |
| D10 | Major | Epoch review + regression | Old unacknowledged action counters could replay across a chamber, while first-new-epoch input could be reset. Track per-entry epochs and reset baselines atomically. |
| D11 | Major | Actual browser touch tap | A short context-bubble tap could end between fixed ticks and lose its action. Retain its edge target until canonical tick consumption; preserve held rescue semantics. |
| D12 | Minor | Integrated title screenshot | Menu subtitles ran into main labels. Give subtitles a separate line and spacing. |
| D13 | Minor | Integrated code review | Expired voice captions stayed on screen. Clear the DOM when the audio caption expires/reset. |
| D14 | Minor | Attract lifecycle review | Attract inherited the ten-second title idle value and skipped its result dwell. Reset idle on attract entry. |
| D15 | Major | Attract feature probe | Ordinary pilot never demonstrated a redirect. Stage a kiosk-only pair, then execute a real canonical timed redirect/collision. |
| D16 | Minor | Native preview warning | Second miner used an unsupported rig build name. Use documented heroic/bulky builds. |
| D17 | Minor | Hub presentation review | Redirect ownership treated Hub miner0as false. Check null/undefined explicitly and resolve the actual owner palette. |
| D18 | Minor | Attract reset review | Cosmetic clock/camera state survived fresh resets, while old event history could replay across chambers. Clear presentation fields only at new-run boundaries and retain seen IDs across chamber changes. |
| D19 | Minor | Actual local co-op browser test | A pad transferred from player one to a joining player two looked like a disconnect and spuriously paused. Ignore that native lost-pad signal when another local seat now owns the pad; retain true unplug pauses. |
| D20 | Minor | Controller audit + native test | Circle/B had menu-back semantics but no off-menu duck mapping. Map it contextually to duck without changing menu navigation or ladder control. |
| D21 | Major | Content audit + route tests | Door routes initially changed speed and seam positions but lacked distinct authored layouts/ore profiles. Added original/mirrored/staggered gaps, route palettes, ore weightings and actual route bonuses. |
| D22 | Major | Expanded normal-input route tests | The pilot released Jump one tick after takeoff and cut evasive jumps. Sustain Jump during ascent and prioritize a falling pick while unarmed. Human jump physics already worked. |
| D23 | Major | Mouse audit + actual browser hold | Clicking a rescue marker sent only a one-tick action. Retain a range-checked mouse target and held Interact until release, consuming the overlapping chop. |
| D24 | Major | Rule audit + collision regression | Unredirected ore collisions could destroy reinforced heavy rocks. Heavy ore now survives drifting collisions and shatters through three chops or a deliberately redirected collision. |
| D25 | Critical | Visibility/clock probe + regression | A visible host could stop stepping when its RAF was suspended in a hidden tab while the Hub deadline continued. A dedicated neutral-local background owner steps the authority, preserves remote controls and hands back without double-stepping; end/finish/dispose stop it. |
| D26 | Minor | Input audit + actual pointer regression | Attract woke on clicks but ignored meaningful pointer motion. Motion now wakes to the menu and hovering a menu choice resets idle, without activating a choice. |

One integrated test initially assumed title idle started at0after browser boot; it now reads the measured idle clock before asserting the exact10second boundary. That was a test-oracle issue and is not included above.

## Verification limits

No physical controller, TV, real iPhone/iPad, second human or listening test was available. Emulated pads, Chromium/WebKit touch and offline audio cannot establish hardware feel, real iOS behavior, TV comfort or listening quality. Those qualities remain unknown. First-success pacing of10–12minutes was not demonstrated; measured repeatable skilled runs take roughly2minutes and no timer gate extends them. The game and its About/feedback report these limits without claiming unavailable tests.
