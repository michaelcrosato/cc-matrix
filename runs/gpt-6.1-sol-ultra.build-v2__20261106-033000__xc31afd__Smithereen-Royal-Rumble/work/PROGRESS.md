# Progress

Title: Smithereen Royal Rumble
Development folder: `Smithereen-Royal-Rumble-Stone-Sling-Smithereens-1980-gpt-6.1-sol-ultra-20261106-033000`

## Status
- **COMPLETE.** Game, reports, visual review, and final verification are finished.
- Final `npm run verify`: **449 checks, 0 failures** against the published single-file artifact.
- Applied game-toolchain skill.
- Source manual confirms simultaneous hold/release, temporary crew/launcher interruptions, 3/7/13 scoring, ten weighted bouts. Historical source year differs from supplied 1980 label, retained as requested.

## Work remaining
None. Deliver the root HTML and exit-interview.json; development sources and evidence remain in the named subfolder.

## Bugs and evidence
No implementation tests yet.

## Implementation checkpoint
- Randomly selected from 50 title riffs using Python secrets: **Smithereen Royal Rumble**.
- Downloaded 129 handoff files under vendor/engine at 8ecc2f6 (0.89.1), 9 Hub files under vendor/hub at 35a1047 (1.4.0). No engine source changes.
- CONTRACT.md defines root simulation/runtime and three delegated modules. Agents own view/audio, UI/input, and online/harness.
- Implemented src/content.js (five authored courts, ten rivals), src/sim.js (120Hz authoritative simulation, shared predictor, swept collision, support collapse, all stones, dedup score, interruptions/protection, legal-command AI, outcomes), src/persistence.js, src/main.js runtime/tour/attract, metadata.json, deterministic esbuild script.
- Installed pinned esbuild 0.25.12 and Playwright 1.63.0 under development directory. npm12 needed package.json allowScripts instead of project --allow-scripts flag; corrected.
- Initial headless all-court AI matches completed with genuine collapse and demolition. They were too brief at original hp (15–25s), so increased readable material hp to wood1.5 / stone4 / reinforced6 for longer learning windows. Retesting/tuning pending.
- Online agent reports 33 transport/lifecycle checks passed before browser harness integration; official harness still required.
- Next: integrate delegated modules, build browser artifact, run simulation regressions/full tour and real devices/Hub harness, inspect visuals, finish reports.

## Integration and verification checkpoint
- Native engine presentation, E.Shell TV UI, independent keyboard/pad/touch adapter, code-only three-bus audio, authoring/developer pages, and Hub authority are integrated. Deterministic build emits ~1.48 MB offline HTML and interview at required root paths.
- Full tour driver reached all ten bouts and five courts, taught an actual hit, used all stones, both interruption targets, collapse, normal results and championship/replay. Included losses and weighted total reconciliation. First run: 123 assertions, one test-wait issue (launcher recovery still legitimately in progress); fixed the test wait. Production runtime bugs found during cross-module review fixed: fractional dev speed, settings persistence for bindings and pads, health-fraction tuning references, difficulty case mismatch, next-action charge duration lock, AI error slider scaling, and future target-return prediction.
- Official Hub four cases passed: normal, latency150/jitter50/loss5, host-leave, server-without-player. Extra game-specific firing caught remote client paused by iframe blur during countdown; input agent corrected pre-start blur handling. Retest pending.
- UI automated device checks initially 27/27 passed. Visual review found TV title last entries clipped and native START overlapping custom touch menu; fixed title composition and set native touch setting off for custom gesture ownership.
- Phone visual review found cropped castles at native DPR1 minimum scale. View agent fixing with native custom side projection and adaptive320px portrait buffer; physical client-space bounds regression added.
- Using touch:'never' to remove native START was an incorrect engine guess: it means unsupported touch and displays a blocking notice. Replaced with public settings touch=off plus custom gesture filter; no engine source changes.
- Distinct observed browser bugs so far: clipped TV menu (medium), redundant native touch START (low), remote Hub pause before start (medium), cropped phone battlefield (high/game-breaking), touch-never unsupported overlay introduced during fix (high/game-breaking). Keep final bug count aligned with agent evidence.

## Final refinement checkpoint
- Initial integrated npm run verify: **406 checks**, one failed assertion due to Web Audio float32 gain .10000000149 being compared with exact decimal .1. Changed assertion to tight tolerance; no audio defect.
- Updated online recovery regression now **39/39** (was35): a real crew hit cleared production charge but left the network begin latch; this blocked fresh Fire after recovery. Fixed retirement and observed the regression fail twice before the fix, pass after.
- Added practice/tour separation and replay-preserves-save regressions; teaching now requires a real castle impact, not a temporary crew hit. AI profiles favor intended tactics; error slider scales profile error and timing changes lock to the next action.
- Final full-tour evidence before natural-loss variant:718.24 simulated bout seconds (~12min), all10bouts/all5courts, actual demolition in8bouts plus2timeouts, all3stones,93crew/162launcher interruptions,80cascade block removals. This is a skilled test driver, not an ordinary-human timing estimate.
- Added natural passive-player loss in bout4 to explicitly verify advance after defeat. Added exact attract threshold, prior menu/focus restoration, and an~86s two-court showcase with real40s deadline/ceremony segments.
- Phone target inset now uses actual remaining objective blocks, magnifies the last fragment, and preserves the complete lane. View diagnostics/test assertions added; final captures pending.
- Credits visual review found source heading scrolled offscreen by focus on bottom actions. UI agent implementing short readable pages and visibility regression.
- Metadata now documents9 distinct observed player-facing issues,3 critical, actual tests and limits, engine wrong guesses, and prompt feedback. Complete issue list: development artifacts/issues.json.
- All final reports derive from metadata.json. Pending: final build + full verification, inspect final inset/credits captures, publish/report exact count.

## Closing review
- Full integrated run passed446 checks. Final taught-stone wrap fix added2 UI regressions; targeted UI49, view/audio36, artifact51 all passed. Then visual review of the resulting credits capture exposed a native renderer-captured exception that pageerror checks had missed.
- Issue11: a deferred author overlay iterated app.editorBlocks after ui.draw cleared it during a screen transition. Moved presentation publication into update and captured the array/selection for queued rendering. Added a game.errors assertion across the full author/menu path. Final complete verification rerun is in progress; expected449 assertions.
- Issue10 was observed with a focused browser: holding Space to confirm a menu and sending its physical autorepeat began an unrequested gameplay charge. Non-navigation repeat events are now consumed until fresh press; regression passes.
- Final controlled tour evidence:743.45 simulated bout seconds; all10 bouts/all5courts, one natural loss in bout4 still advances,7 demolition outcomes/3 timeouts, allstones,89crew hits,156launcher hits,71cascade removals, teaching requires actual castle hit, championship/replay and totals verified.
- Final files currently published: root Smithereen-Royal-Rumble-Stone-Sling-Smithereens-1980-gpt-6.1-sol-ultra-20261106-033000.html and root exit-interview.json. Build is deterministic and artifact is self-contained. metadata.json now records11 fixed player-facing issues,3 critical; no engine source modifications.

## Final acceptance — complete
- Final formatted-source build passed **449 checks, 0 failures** through `npm run verify`; final code and exact output artifact both tested.
- Breakdown: simulation/tour134; native draw19; Hub authority39; artifact/report schema51; UI/devices50; official Hub/browser86; browser/audio34; native view/audio36.
- Final artifact: `Smithereen-Royal-Rumble-Stone-Sling-Smithereens-1980-gpt-6.1-sol-ultra-20261106-033000.html` (1518774 bytes). SHA-256: `30e5d311ab8335f538ced2f1f4215657a12fbee09abd318b580c916c30427fce`.
- Required interview: root `exit-interview.json`, parsed and schema-validated; About uses the same metadata source. Usage remains exactly `added on import`.
- Inspected final title, charged battlefield, collapse, repair/protection, phone whole-lane/inset/last fragment, results and clean credits screenshots. No native error banner remains.
- Applied Biome formatting to owned JS modules, then rebuilt and reran the full suite. Native engine and released Hub client remain unmodified.
- Fixed11 observed player-facing issues,3 critical; full ledger in development `artifacts/issues.json`.
- Every test browser and owned loopback harness server closed. No deployment/server is required to play the root HTML offline. Online entry is through AI Hub.
- Testing limits: no physical controller/touch device/TV/real iOS Safari/remote human/listener; audio signals validated, acoustic quality unknown.
