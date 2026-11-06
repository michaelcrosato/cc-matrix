# Build progress

## Task and paths
- Build PLAN.md using TASK.md requirements; no subagents.
- Selected title with secrets.choice from 50 candidates.
- Dev folder: `Trauma-Tempo-Encore-Trauma-Center-Second-Opinion-gpt-6.1-sol-max-20261105-051847/`
- Final deliverable: `Trauma-Tempo-Encore-Trauma-Center-Second-Opinion-gpt-6.1-sol-max-20261105-051847.html` in root.
- Exit interview: `exit-interview.json` in root.

## Decisions
- Fully bundled single HTML, Three.js r180 WebGPU with WebGL2 fallback, Rapier 0.19.3.
- Seeded pure-data simulation shared by player, bot, co-op, attract, and hub server.
- All art as procedural geometry; Web Audio only; embedded fonts.
- Files and test artifacts inside dev folder (viewport-matrix output follows supplied testing-tool instruction).

## Completed
- Read all PLAN.md sections and TASK.md.
- Checked environment. viewport-matrix and Playwright present. Referenced ~/dev/TESTING-TOOLKIT.md is absent; use supplied command guidance.

## Next
1. Install pinned packages, download/read hub protocol/client/harness.
2. Implement sim/data/bot and tests, then view/audio/input/UI.
3. Verify browser, hub, responsive screenshots; fix findings.
4. Finalize about/exit interview, authoring docs, build and deliver.

## Testing findings
- Issues caught: 0. Critical: 0. Keep concrete findings here as tests run.

## Implementation milestone
- Installed pinned Three.js r180, Rapier 0.19.3, esbuild 0.28.2 and Playwright 1.63.0; embedded fonts installed.
- Downloaded and read AI Hub v1 protocol, pristine client 1.4.0, real harness files.
- Implemented modular simulation, all eight tools plus syringe/Defib, seven strains, scoring, gifts, checkpoints, bot, and compact snapshots.
- Operation data covers all seven main procedures, Last Patient, Grand Rounds. Story has 17 scenes / 272 lines and 60+ barks.
- Added procedural 3D room, organs, busts, tools, skinned strains, TSL ink post-processing, Rapier effects, AnimationMixer clips.
- Added UI shell, controller/keyboard/mouse input, synthesized audio, settings, dev tools, saves, attract, couch co-op, hub shared-world/session card.
- Bundled build produces root HTML already; not final yet.
- First Chromium WebGPU boot succeeds without page errors; screenshot inspection and full verification underway.

## Concrete bugs found so far
1. Phase ordering blocked emergency cleanup in Grand Rounds (critical); fixed by allowing hazard tools independently.
2. Legato repeatedly spawned bleeders beyond four-clamp budget (critical); bounded attack spawns.
3. Coda still attacked with severed arms (critical); now downbeat attacks require arms.
4. Two JavaScript unary/exponent expressions failed the first build (non-critical); fixed.
- Current tally: 4 issues, 3 critical.

## Remaining
- Inspect screenshots, polish any layout/rendering problems.
- Finish bot pacing, Grand Rounds balance, all simulation rules and tests.
- Build unified quiet test runner, browser playthrough/input/audio/save/dev/touch tests, real hub harness scenarios.
- Responsive viewport matrix and visual inspection.
- Finalize honest About feedback, exit-interview.json, authoring docs and final rebuild.

## Simulation verified
- `node tests/run-all.mjs sim`: 60 passed, 0 failed.
- Normal campaign bot completes all procedures at A or S; imprecise/delayed bot completes all main procedures on Intern; idle fails; Grand Rounds 1–4 seats completes with contributions.
- Rule coverage includes beat pressure, input curves, all instruments, gifts, scoring, retry/assist, seven strains, snapshot MTU, determinism, data/story lint.
- Added finish gel to Coda’s three sites and the missing Grand Rounds antidote sites.
- Browser suite now running (WebGPU, WebGL2, WebKit; controls; campaign UI; saves/settings/dev; audio; attract; mobile notice).

## Further bugs fixed
5. A finished incision could nick the patient immediately while the player released the button; added a short safe release interval.
6. Forceps treated an axis of zero as the default 90°; fixed null handling.
7. Dropping an incompletely extracted item moved its anchor, eventually making a long pull impossible (critical); it now springs back to its original anchor.
8. The bot released a grip to use the IV, and could swing a scalpel before its simulated reaction delay elapsed; fixed held inputs and crossing behavior.
9. Recurring spore cleanup could distract the bot forever from the spawning nest; it now treats the source first and spawn counts are bounded.
10. Portrait placement, tray framing and excessive wet glints failed visual inspection; adjusted.
- Tally so far: 10 distinct issues; 4 critical (1, 2, 3, 7). Finalize after browser/hub checks.

## Browser pass 1
- WebGPU, WebGL2 and WebKit boot + inked nonblank screenshots passed.
- Analog controls/disconnect, dev live resets, audio synth rendering, fail/notes, Android/iPhone touch notice and Firefox fallback passed.
- One common navigation bug caused multiple failures: clip-path screen reveals allowed quick clicks through to a previous menu. Replaced clipping with an opacity transition.
- Fixed queued test-warp phase hints overwriting an immediately selected tool, and reordered attract segments to show three operations promptly.
- Browser pass 2 is running. Real Hub suite is now implemented against downloaded harness.
- Tally additions: menu click-through (issue 11), phase hint input race (12), attract operation cadence (13). Critical count remains 4; navigation race was intermittent and recoverable.

## Hub verified
- `node tests/run-all.mjs hub`: 7 passed, 0 failed (105.2s).
- Real harness: 2p; 3p and 4p at 150±50 ms / 5% loss; host leaves; server copy; 4p WebGL2 fallback; standalone unseeded/nonblank behavior.
- No protocol warnings or page errors. Pristine client hash matches release 1.4.0.
- Added jitter-tolerant reliable keyframe reconciliation, immediate local tip prediction, independent session sites and smooth remote motion before this pass.

## Visual refinement
- Reviewed 1080p Title, Menu, Story, Chart, Operation, Settings, Danger and Hush images.
- Story review exposed a low hair cap covering eyes and the operating table/drape occluding busts. Raised the hairline, corrected torso profile winding, and hid field/table during story/chart and lamp during operations.
- Reused cast busts and disposed reconciled meshes; fixed tray trophies being rebuilt every frame and stale entity closures after network keyframes.
- Added five procedural story sets and native 3D face cut-ins.
- Unified input tokens now refresh immediately for keyboard, mouse, PlayStation and Xbox. Story skip and card more-time have correct dedicated tokens.
- Browser pass 2: 17 passed, 1 failed; remaining failure was the UI test omitting the real first-encounter strain-card confirmation. Test now handles it with actual Enter input.

## Next
1. Re-run browser suite after recent UI/view changes.
2. View corrected character/operation screenshots; viewport matrix phone/tablet/wide screens including WebKit.
3. Finalize honest About/exit JSON and authoring docs; final build, validation and root deliverables.

## Responsive verification
- viewport-matrix: 19 clean screenshots, 0 issues, 0 failed. Includes iPhone SE, current iPhones in portrait/landscape, iPad, Android, foldable, tablet, desktop and ultrawide on Chromium/WebKit.
- Report/contact sheet: `/tmp/viewport-matrix/trauma-tempo-20261105-051847/` (tool-directed output outside repo).
- Manually viewed representative phone, foldable, portrait/landscape tablet, laptop and ultrawide PNGs.
- Added a browser check for all settings pages and a Consult chart at 375×667, 756×352, 640×400, 768×1024 and 2560×1080. It is running now.
- Reduced the UI root’s minimum to 5px for short embedded/landscape frames, kept all normal 1080p sizes, and kept phone settings in two columns.
- Touch notice now hides Scrub In and disables underlying gameplay buttons; only Settings is available to touch-only users. Keyboard/pad input leaves the notice.

## Completion details
- Attract loop now includes a voiced story snippet, every strain and gift, a rank stamp, and title, over about three minutes. Any input exits without saving.
- Added world-space Defib charge rings so Last Patient remains playable without a HUD.
- Surgical tip and held objects now sit visibly above the specimen tray.
- Finalizing small shared-screen/current-seat details, feedback data and exit interview before final combined test.

## Code complete / final checks
- Node suite now has 66 passing checks, including task scaling, exclusive grabs, synchronized shocks, feeder regeneration bounds, wrong-link regrowth and concurrent sutures.
- Shared event presentation now gives Hub clients the same barks, grades, tool sounds and cut-ins as the host.
- Extracted objects use actual Rapier poses for their arc, collision pile and landing clink.
- Added a real offline file:// check of the root hand-in, plus a rendered extraction/trophy regression.
- Rendered strain review found a real graphics-only crash: Float32 cylinder endpoints could create index −1/65535 in skin weights. Clamped normalized positions. The browser graphics cases now draw every strain on WebGPU, WebGL2 and WebKit.
- Extracted strain trophies now have safe guide-geometry defaults.
- Numbered stitch gates use square, readable label textures; musical staves paint onto infected organs; TV secondary type increased where appropriate.
- Feedback ledger finalized at 24 tracked issue groups, 8 critical; see docs/TESTING-NOTES.md. About data and root exit-interview.json are filled in, Usage stays added on import.
- Final expected combined count is 94 (66 sim + 21 browser + 7 hub). This is not yet the final executed combined result.
- Final rendered visual sweep is running as exec session 15874. It writes artifacts/final-*.png. Earlier visual run failed before Adagio due the skin index issue; fixed and quick rendered Adagio now succeeds.
- Development server still runs at http://127.0.0.1:37593 in owned exec session 26147; close it when finished.

## Remaining finish steps
1. Wait for final visual sweep, inspect images (especially characters, strains, cut-in, report, card). Fix only concrete findings.
2. Run `node tests/run-all.mjs` on the final build; ensure all checks pass. Final feedback currently says 94 checks, update if needed.
3. Recheck changed short-screen UI through viewport matrix or screenshots; previous full matrix had 19 clean images.
4. Check root exit-interview.json parses, final HTML matches dist/game.html, no unresolved markers. Update this progress log with final outcomes; stop owned server.
5. Final response links the root HTML, exit JSON and dev docs, and includes all four required Source Information / Testing Feedback / Engine Feedback / Prompt Feedback blocks. Cite official Hub protocol if referencing research.
