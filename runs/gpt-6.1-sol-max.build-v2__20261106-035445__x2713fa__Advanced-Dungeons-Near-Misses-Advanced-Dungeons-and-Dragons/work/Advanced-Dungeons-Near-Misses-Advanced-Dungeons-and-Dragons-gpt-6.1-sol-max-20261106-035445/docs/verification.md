# Requirement / evidence ledger

Final verification completed against the packed root HTML. `npm test` is the single quiet entry point; optional suite names restrict reruns after relevant changes. Verbose output is captured under docs/test-output.log. Counts below are actual assertions.

| Requirement | Implementation | Evidence |
| --- | --- | --- |
|29 chambers / full tool graph / reserve budgets | content/campaign.js + shared Geometry.compile |152 content assertions; real optional lunch chamber documented in authoring.md |
| Complete standard-rule expedition | production commands / fixed steps |17 full-clear assertions; playthrough-result.json:294.76 simulated seconds,58 arrows,52 banks,6 recoveries,1 ordinary death,0 voluntary restarts,all tools/both halves,assisted=false |
| Swept arrows / recovery / survival / fog / acoustics / saves | sim + geometry + save |76 adversarial assertions, including current-roster restoration after joins/leaves |
| Original native rigs and animation / draw immutability | render/art.js |95 native headless assertions; browser contact sheet and final scenes |
| Original code-only audio /10% gain / focus / voices | audio/audio.js |73 headless +45 OfflineAudioContext/browser assertions (the45 are included in browser count) |
| Validated protocol / action IDs / nonce epochs | net/network.js |38 protocol assertions including stale asynchronous pack/decode rejection |
| Real standalone direct WebRTC | production data channel |10 transport assertions and11 actual full-game input/progression/latejoin assertions from file:// |
| Hub lifecycle / true server / adverse network / departures | unchanged pinned harness |97 assertions across all six required final-artifact cases; hub-test-report.json |
| Final-file controls, touch, menus, saves, attract, About, audio, WebKit | tests/browser.py |98 browser assertions; source/adverse/physical scopes recorded in browser-report.json |
| Single-file package / pinned unchanged vendors / exact interview | build + package validator |31 assertions; same script order and metadata on delivered artifact |

Final result: `npm test` — **698 checks passed; 0 suites failed.** The final31 package assertions were repeated after the last metadata-only rebuild. JavaScript formatting/lint checks and Python Ruff checks passed.

## Confirmed defects

- SIM-001 (major): stale held interaction could finish a revival beyond the heartbeat timeout. Added freshness validation; regression passed.
- SAVE-001 (critical): a valid-checksummed envelope could contain invalid actor coordinates and break resume. Validated actors and restart state; regression passed.
- SAVE-002 (critical): a denied localStorage property getter could stop construction. Guarded lookup with complete in-memory fallback; regression passed.
- UI-001 (minor): initial TV title actions extended below the viewport. Bounded the card and compacted the action rows; viewport assertions passed.
- UI-002 (major): touch tutorial content intercepted a natural movement thumb position. Moved/compacted touch HUD and made its text pass pointer input through; multitouch/cancel checks passed.
- RENDER-001 (minor): miniature texture helper options used color instead of base/dark/light, silently retaining default palettes. Corrected actual helper arguments and reviewed rendered output.
- SIM-002 (critical): restoring a checkpoint could resurrect a departed seat or remove a late seat. Reconciled restored actors to the current roster and validated both safe anchors; four regression assertions passed.
- NET-001 (high): old asynchronous snapshot packing/decoding could finish in a fresh reconnection. Captured connection nonce and rejected stale completion; two regressions reproduce the old behavior and pass with the fix. Authority progression was unaffected.

Count:8 distinct defects,3 potentially game breaking. Do not count test-director mistakes or repeated assertions. The network combat director was corrected to stop, aim and respect bow recovery against narrow moving rats; that was not a game defect. Initial stopped-clock visual captures were replaced with explicit `advance(...,{draw:true})` frames.

## Presentation and external limits

Purposeful screenshots: title-tv.png, cave-tv.png, guardian-amber.png, guardian-blue.png, results-tv.png and touch-portrait.png. Guardian/result screenshots use clearly separated developer fixtures and are not clear evidence; the command-only director proves completion.

Physical controller, real touch hardware, iPhone/iPad, living-room TV, human listening and WAN/NAT combinations are unknown. Standard pads and touch are emulated; WebKit is a secondary renderer, not real iOS certification. Audio evidence is measured signal, not human listening. The 4m55s clear is an expert known-route replay, not a measured first-player 18–25-minute session. First-player pacing remains unmeasured.
