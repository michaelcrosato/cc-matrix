# Build progress

Title: Bar Cry (50 candidates; cryptographic random selection recorded in dev/out/title-pick.json).

Dev folder: `Bar-Cry-Far-Cry-2-gpt-6.1-sol-max-20261105-072516`
Deliverables: `Bar-Cry-Far-Cry-2-gpt-6.1-sol-max-20261105-072516.html` and `exit-interview.json` in this root.

## Current state
- Read TASK.md and reading PLAN.md in full.
- Engine setup next, followed by deterministic simulation, procedural art/UI/audio, networking, and end-to-end checks.
- No agents used. Engine will remain read-only.
- Testing toolkit cheatsheet at ~/dev/TESTING-TOOLKIT.md is absent; use installed Playwright and viewport-matrix directly.

## Work remaining
Build every never-cut feature from PLAN.md; package and test the finished single HTML; write feedback/About and exit interview.

## Implementation checkpoint
- Engine pinned at `ea717c7`; baseline starter: 6 tests passed. Read engine AGENTS.md/GAME-GUIDE and AI Hub v1 client 1.4.0 protocol.
- Added procedural basin terrain/site, fourteen places, roads, river, original props, twelve weapons with three rust tiers and reload poses, custom mercenary bodies/actions.
- Added deterministic seat routing, firearms, fire/wind/smoke/regrowth, AI perception/flanking, health/surgery/fever/buddy rescue, suspension/buoyancy vehicles, interactions, seven story contracts and three endings, co-op round rules, compact saves/digest.
- Currently running first headless integration probes; next: UI/audio/net, simulation coverage and browser checks, packaging.
- Found and corrected the native level format-2 header syntax and a weapon schema field mismatch. No engine edits.

## Page and network checkpoint
- UI/audio/network modules implemented: paper map/HUD, title, merc choice, pause, settings, controls/rebinding, developer pages, ledger/dealer/dialogue/endings/About, mobile notice.
- AI Hub connection/card and host-sequenced turns, BroadcastChannel rooms, WebRTC invite/reply codes implemented. Full integration verification still pending.
- First headless world now advances 60 steps successfully (`c03b46bde2c9a9ca` in the probe before later edits).
- Added a looping attract director and code-only songs/effects/formant voices. Music is initialized to 0.1.
- Next: first bundled browser boot; fix integration issues, exercise game systems, whole-campaign bot, replay/capture/lockstep tests, hub harness and viewport/WebKit checks.

## Integration issues found and fixed
- Native schema collisions (weapon description field, reserved stock.kind, built-in prop names).
- Scene setup queues spawns: pass setup data directly, then spawn the campaign after scenery; query only once setup is committed.
- Capture checks caught shared button arrays in seat routing. Each component now owns its input arrays, including remote actor intents.
- Attract mode could restart the world before the first render; it now starts counting idle time only after the engine is ready.
- Software WebGPU high quality stalled the first warm render. Software adapters now use the engine's low quality preset and reduced vegetation; real adapters keep full detail. Browser recheck pending.
- Campaign bot and simulation test suite added, including golden/capture, survival, vehicles, fire, economy, 2/4-seat agreement, designer entries and all endings. First full run is in progress.

## Browser milestone
- The bundled game now boots with `__engine.ready === true` and no engine or page errors on software WebGPU.
- Root cause of GPU startup stalls was the engine eagerly warming a batch for every gun part/tier/pose. Authored gun geometry is now assembled into one native prop batch per variant, preserving all twelve silhouettes and reload poses while reducing warm-up memory. No engine changes.
- Inspected the title PNG: actual terrain/fire/trees render under the title UI. Fixed auction-slip typography overflow and added nearby grass/thorn silhouettes.
- First sim suite: 8 passed / 7 failed; shared undefined NPC aim caused several failures. Corrected it, vehicle exit re-entry, and moved the prologue fire away from the mandatory healing lesson. Second run is in progress.

## Campaign and polish checkpoint
- A full later-contract run completed to the Serve ending at step 8602. It used actual crate carry/drop, fire weapons/spread, tank explosions, boat physics, a gunfight, buddy consequence and tape playback.
- Bot fixes: explicitly choose a primary weapon for the salt-pan fight; steer the boat west instead of teleporting a still-seated player; approach NPCs within real use range; route through town streets. Full physical prologue/Receipts probe is running with these fixes.
- Added actual hand-held syrette, pill bottle, surgery tool/lighter and wrench props; real-time medical/body cameras; a low downed camera; rain particles; native fever look; pad-only aim assistance; contextual held-use pad mapping for repairs/revives; a locator that clicks faster with proximity; persistent burnt scenery on load; irreversible broken guns.
- Added browser acceptance driver (`tests/game/page.mjs`), audio DSP/offline check, responsive screenshots, phone notice and WebKit checks. Driver not yet run.
- `npm run check` most recently passed types, formatting, asset rules and pinned-engine check; one unused glyph-refresh import remained and is now wired correctly. Check rerun pending.
- Exit interview writer and JSON exist; update feedback counts/results once final tests pass, then rebuild so About stays identical.

## Verification in flight
- Physical prologue probe now reports `Prologue complete 1`; it is continuing through Receipts. Process was started by exec session 30239 (`out/physical.mts`); do not stop unrelated processes.
- Browser tier is running in exec session 16815 after recording a fresh opening golden and bundling. It will print failures/count when complete. It includes actual desktop/pad controls, live sliders, map ticking, surgery, About parity, offline synthesized audio, real 10-second attract timing, phone and WebKit notice, and tablet/wide PNGs under `out/page/`.
- Main page split into `main.ts` and `boot.ts`; CSS split into four modules so source files stay small. A final unused Person type import was removed after the last check.
- Source README and ENGINE-FEEDBACK.md now describe current behavior. Update final interview feedback counts and test evidence after finishing tests.
- Outstanding: finish/fix sim tier, run/fix page tier, run real four-configuration hub harness and standalone tabs/RTC tests, inspect PNGs, final check/acceptance, rebuild after final interview.

## Resource and driver notes
- First page-tier run was interrupted by Chromium OOM while the long travel probe also held ~700 MB. Browser/physics runs are now serialized. Software adapters additionally disable optional GPU features; real adapters retain full features. This is presentation only.
- Node Playwright is 1.64.1 but installed WebKit is build 2359; the page driver now supplies its existing executable path rather than requesting/downloading build 2370.
- Page tier rerun is exec session 11260. Do not start another browser while it runs.
- Added buddy firearms/fighting during rescue and alternate plans, contextual pad repair/revive use, native post fever effects, original medical props, and a proper broken-gun state. Golden/sim checks need regeneration after these latest changes.

## Current acceptance results
- Page tier reached 77 passed / 3 failed. The remaining cases were the reset check reading the engine's sparse overrides instead of its setting getter, the Back glyph colliding with the movement action named back, and a too-short virtual pad pulse during a GPU scene restart. Corrected the getter test and glyph routing; the pad pulse now spans the software-renderer transition.
- A held native action requires an explicit check.signals entry. Added it to the drive/map-hold actions after the opening probe caught the schema rejection. Future dependent build/test shell commands use set -e.
- Latest page rerun is exec session 84066 (golden regenerated, bundle built). Wait for it before starting other browsers.
- Co-op now resets all simulation tuning, cheats, movement overrides and input modes to a shared preset. Camera, audio and other presentation preferences remain local. Fixed bled-out players being able to move/revive; a probe confirms down=-1 and moved=0.
- Vehicle wheels now spin/steer with suspension travel; drive pose holds until exit. Buddy NPCs now use real guns during rescue and alternate-plan accompaniment.
- Still required before finish: green sim/page tiers, actual hub harness + standalone tabs/RTC, static check, final acceptance, final interview counts and rebundle. Do not claim these passed yet.

## Latest source changes and active run
- Browser milestone remains 80/80 on the prior packaged build. Several subsequent source fixes need page validation after rebundling.
- Current CPU tier is exec session 12784 (opening golden regenerated, then `verify sim`). Do not run a browser concurrently with this suite; memory is shared with other jobs.
- Added compact save support for the original seed, car/boat positions and HP, carried supplies/cargo attachments, buddy positions/health and permanent death, plus remaining timers. Save tests use the `snapshot` action and `gameSave` component rather than a huge engine capture.
- Added actual pickup/boat cargo loading and clinic unloading, real delayed machete strikes/blade animation, grenade selection/fuse/bounce, mouse-wheel weapon selection, recoil/spread metadata, corpse ray hits/mercy, and breakable strikes.
- Expanded live movement sliders. The travel bot temporarily raises sprint speed for physical travel through Receipts and restores it afterwards; balance combat remains a separate concern. Burn regrowth default is now 180 game minutes (three real minutes) to prevent regrowth under an active fire front; the short regrowth test explicitly uses 18.
- All four alternate plans now have world objectives: radio hut, fourth crate, engineer escort, boat fuel. Briefings are actually shown. Added the ladder to the mine ropeway. Fixed all-buddies-dead story progression.
- Title/attract now reuse their simulation through the mode action instead of rebuilding the GPU stage on every input. This avoids repeated shader allocations. Attract no longer interrupts in-game pause menus or a waiting network lobby.
- Co-op uses shared presets, unique seat positions, safe bleed-out behavior, network pause/quit flow and host-disconnect signals. Embedded hub uses Settings only; standalone co-op offers a leave path. Story-only people/beds are excluded from Contract Run interaction.
- Most recent static check had only an unused strikeEntity import and save Seat optionality errors; these have been corrected in source. Run format/check again before final acceptance.
- Remaining priorities: green sim suite; actual hub harness + standalone transport tests; final page and final acceptance; inspect remaining viewport PNGs; concrete testing issue counts in interview writer, regenerate JSON and rebuild. No engine changes, no subagents, no dependency additions.

## Active verification after final core fixes
- Restarted the stale CPU runner after finding a bot dead zone: botIntents stopped within 1 m while useKey required 0.35 m. It now moves down to 0.1 m. New sim run is exec session 1235; no browser should run concurrently.
- Latest golden is being regenerated by that command before the sim tier. The preceding run's hash was 99be6c2442c76215, superseded if this regeneration changes it.
- Current source has cargo attachment/clinic unloading and an extended compact Save format. Added tests for saved vehicles/original seed/dead buddy, cargo loading and final bleed-out.
- Added real machete blade/attack timing, corpse/mercy ray mapping, public breakable strikes, normal weapon spread/recoil, suppressor noise distance and mouse-wheel slots. All network button presses now latch until sent; menu presses are excluded.
- Current static cleanup: strikeEntity is now actually used; p.seat optionality in save load was corrected. Run format/check again after sim fixes.
- Page last achieved 80/80, but later source changes still need rebundle/page/final checks. Real hub harness and standalone tabs/RTC are still unrun and must be completed.
