# Build progress

Title: Treasure of Tarmin After Dark (selected using secrets.choice from 50 original riffs).
Development folder: `Treasure-of-Tarmin-After-Dark-Advanced-Dungeons-and-Dragons-Treasure-of-Tarmin-1983-gpt-6.1-sol-ultra-20261106-040805`

## Current work
- Read PLAN.md and TASK.md, and game-toolchain skill.
- Checking pinned engine/Hub contracts and source research.
- Next: deterministic campaign, World3D presentation/UI, real WebRTC and Hub integration.

## Verification and issues
No tests run yet. No defects recorded.

## Integration milestone
- Pinned and vendored engine v0.89.1 revision 8ecc2f62353761187bdfe226f327b7ea5d2eb691; Three.js 0.182.0; Rapier 0.19.3.
- Pinned Hub session client 1.4.0 revision 35a1047f2067b2af3de3943f0fe452f39105d869 unmodified; bridge remains harness-only.
- Single HTML packaging proof passed file:// WebGL2 boot with zero page errors. All dependencies embedded; no runtime CDN.
- Authored 3-floor state/content, full item/enemy roster, dual strengths, inventory, checkpoints and staged boss implemented in src/core.js/content.js.
- Native World3D shapes/puppets/overlay hands and procedural score/SFX/gibberish implemented in src/view.js/audio.js.
- UI/main/save modules implemented. Root integrating exact command schemas and testing every visible affordance.
- Core first pass: 22 checks passed; normal-rules route 134 commands, all floors, gate, secret, boss phases, separate treasure claim. Net first pass: 25 checks passed.
- Real WebRTC test has connected two isolated browser contexts, fought an encounter, and synchronized host state. Official Hub harness running next.
- Agents: simulation owns core/content/pure tests; network owns net/harness; presentation owns view/audio. Root owns UI/save/build/report/integration.

## Known fixes / issue ledger (preliminary)
Simulation: gate landed on occupied enemy tile; gate could be farmed repeatedly; downed ally revived on descent; initial exploration attack rejected its own round; departure retargeted announced intent. Network: end callback shadowed; time-up accepted later commands; guest synchronous UI feedback and peer close cleanup corrected during integration. Final actual counts pending agent reports.

## Next work
- Run final UI smoke and fix native engine integration issues.
- Complete official Hub scenarios and real UI WebRTC flow.
- Add one verify command aggregating core/net/browser tests, input/audio/attract/dev/save/full replay evidence.
- Inspect title, combat, Spirit hall, boss, pack/map/dev and phone frames.
- Update canonical report.json, root exit-interview.json, in-game credits and final hand-in from actual evidence.

## Completed integration evidence
- Final root HTML normal-rules replay passed: 134 production actions, 61 steps, 27 rounds, all seven foes, 12 rests, gate, secret, every boss seal, and explicit treasure claim. No cheats or modified tuning.
- Browser integration reached 37/38; the single failure was a fixed-duration test wait for the native pause menu, which subsequently opened correctly. Converted to state-based wait. Gamepad, glyphs, six-slot pack, dev sliders/reset, saves, attract isolation, offline audio, phone menus all passed.
- Official Hub first five scenarios passed 71/71. Real release UI WebRTC passed 21/21 including normal connection/combat/rest/handoff/contested loot and explicitly seeded revive/descent/boss edge scenarios.
- Core now34 checks; transport33 checks. Full verification command tools/verify.mjs aggregates those plus release browser/compatibility/real UI WebRTC/official Hub.
- Current refinements: actual trap operations and armed-opening consequence; encounter jump controls; controller combat cycling and revive; source-time-correct countdown; native menu input gating; terminal audio stop; active-lobby attract exclusion; valid continuation after victory.
- Root exact final basename will include source year1983, to match TASK's SOURCE field; rename development folder only after active agent processes finish.

## Release candidate verification
- Full aggregate verification passed **245/245** on the renamed standalone artifact, including real Enter and R2 inputs through the boss preparation beats, not just direct simulation commands.
- Found and fixed one critical controller/keyboard completion bug: attack during boss preparation recursed. UI now continues the phase and the model rejects invalid preparation attacks without mutation. Core regression count is35.
- Added pad-only live slider adjustment, right-stick report scrolling, and simultaneous two-thumb touch movement/look; browser suite passed47 checks.
- WebGPU, WebKit WebGL2, and Firefox's helpful unsupported-renderer message all passed (7 compatibility checks).
- Real release WebRTC21, official Hub86, transport35, persistence8 and packaging/report6 checks passed.
- Final small input-policy fix adds standard L3 map binding and consumes game pause/map during Hub's reserved Create+Options chord. Rebuilding and running the complete suite one last time; canonical issue ledger/report now36 issues total, including1 critical found and fixed.
- Source modules, required HTML, report and exact development folder names are final. No external CDN or neighboring runtime asset files are needed. Real devices, cross-network NAT reachability and human listening remain unconfirmed.

## Complete — final delivered artifact
- **246/246 verification checks passed** with `npm run verify` against the final root HTML.
- Breakdown:35 rules/content,35 authority/transport,8 persistence,6 packaging/report,48 delivered-browser/input/audio/save/attract/dev checks,7 renderer compatibility,21 actual release WebRTC,86 official Hub/state/lifecycle checks.
- Browser full normal-rules victory includes real keyboard Enter and controller R2 transitions through the boss's two preparation beats. Standard-pad live sliders, long-panel scrolling, reserved Hub chord, simultaneous touch movement/look, audio output/mute/terminal stop, and phone menu checks passed.
- Final artifact SHA256: `8614b85c2329438a1dc1cc338d6c6d704d0824431209540e17a0b30168392a6c`.
- Root HTML and development build are byte-identical. Root exit-interview.json parses and equals canonical report.json; About/Credits embeds that same object.
- All final browser/compatibility/WebRTC/Hub evidence refers to that artifact. Scripted network edge scenarios and rendering pauses used for screenshots/network isolation are explicitly recorded; no real-device or human-listening claims are made.
- Final ledger:36 distinct issues corrected, including1 critical boss-preparation recursion. No known critical issue remains. Probe/test fixture mistakes are excluded from defect counts.
- Python harnesses pass Ruff and syntax checks. Native engine/addon sources remain byte-identical to the pinned revision. Third-party license notices are embedded in the HTML.
- All owned browsers and local test servers closed. Required files: final single HTML, exit-interview.json, this PROGRESS.md, and the named development folder. No further required work remains.
