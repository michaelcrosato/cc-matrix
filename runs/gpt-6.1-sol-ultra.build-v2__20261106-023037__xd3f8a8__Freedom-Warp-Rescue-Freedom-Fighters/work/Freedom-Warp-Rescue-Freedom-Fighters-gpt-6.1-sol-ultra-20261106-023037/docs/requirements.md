# Requirement to evidence map

The single command is node tools/verify.mjs. Its artifacts/verification.json records individual results; unchanged successful suites are fingerprinted and reused. package checks always validate the current root artifact and canonical reporting object.

| Requirement | Implementation | Evidence |
| --- | --- | --- |
| Correct source research/platform and random title draw | docs/research.md; identity.json | Original manual/review read, original screenshots inspected; exact recording sound unknown; 50-candidate cryptographic draw recorded |
| Full native engine + original source-specific art | vendor engine 0.89.1; presentation.js | 32 native rendering invariants; final-visual title/rescue/warp/belt/carrier |
| Fixed-step x/y side-on flight and independent aim | config/content/sim/input | Native simulation diagonal/bearing tests, native E.Game120 steps, browser device flight |
| Hyperspace windup/committed vector/recovery, cost/regen/fresh press | World.flight | Burst energy/release/ownership tests; real touch and Q-rebind warp; swept mine/rescue tests |
| Contact rescue, fragile crystals, same-tick exactly-once credit | World.flight/rescue/combat | Same-tick laser/rescue, lingering event rejection, three-hit warning/loss tests |
| Three enemy roles and three mine patterns | content.js, World.enemies/formation | Full operation seenTypes/seenPatterns; native rendering; full Hub co-op |
| Mine state lifecycle and owner-only collapse | World.formation/collapse | Harmless arming and owner-isolation test; authored opening visual |
| Playable onboarding, two sectors, carrier, extraction/ending | content.js and director | Native complete action pilot; exported HTML complete action pilot; two actual Hub copies |
| Carrier organs → prisoners → exposed core | director state machine | All boss phases logged; native/full browser/Hub operation |
| Failure, retry, stable checkpoints, replacements, terminal precedence | director/checkpoint/replacement | Hull/grace, replacement, score restore, deterministic reconstruction, terminal race tests |
| 180-second Evasion; no cannon, real result | mode modifier over same World | Full native180-second pilot, no player shots; controller front end launch |
| Source scores, modest capped chain, rank penalty and no mine farming | rescue/kill/outcome | Rescue/base values, per-owner mine cap/snapshot and replacement tests; results + browser complete run |
| Solo standard pad, keyboard/mouse, real couch shared ship | Input/native bindings, role resolver | Native two-pad / keyboard+pad / join/leave/swap tests; pad-only browser hierarchy |
| Touch multitouch/cancel/assist/context warp/menu | Input contacts and safe auto target | Phone/tablet browser first rescue + warp/cancel/menu; native no-through-crystal auto target |
| PS default / Xbox option; actual rebinding labels | native E.Input + Shell controls | Real browser Q rebind and new prompt; settings/glyph persistence |
| Controller-first menus/settings/close/failure/results | UI over native E.Shell TV theme | Frontend native13 checks; browser screen hierarchy and pause Options resume |
| Ten-second isolated looping attract and any-input exit consumed | main attract context + Input activity | Browser10-second threshold, loop, keyboard/pointer/pad/touch exits, unchanged save data |
| Complete pause developer tools and validated live values/reset | UI dev screens + same World | Browser step/live speed/reset; native all configuration ranges and health scaling; sector/spawn definitions validated |
| Online diagnostics read-only | UI guard + main dev dispatch guard | Hub harness paths, native authority tests; no online private retry |
| Robust settings/bests/checkpoint persistence and excluded debug/demo writes | Store + main eligibility | Denied/malformed storage native tests; browser persistence and attract isolation; native checkpoint restore |
| Code-only music, effects, gibberish; initial music10%; cleanup | Audio + native buses/instruments | OfflineAudioContext finite/non-silent/bounded output, native bus gain, pause/stop node cleanup |
| Hub boot, readiness, seeded world, correct lifecycle | unmodified session.js + Net | Five actual harness scenarios; package client bytes/placement, one-player/server-host native tests |
| Authenticated per-seat authority, stale/duplicate rejection, full snapshots | Net/codec + World snapshots | Native16 network checks; two actual copies exact ledger/score/outcome; genuine complete co-op |
| Protocol size/rate limits + leave/timeup/end | Net metrics and guard/finish | Real co-op max snapshot11559B and10/s host,12/s remote in first evidence; harness impairment/host-leave/server |
| Single HTML file://, no adjacent assets/dependencies | tools/build.mjs | Final artifact browser request/error checks; package equality and unmodified-client test |
| All four About/report groups and exact interview schema | canonical root exit-interview.json embedded by bundler | Package schema/catalogue check, controller About pages, final delivery reply |

Human stand-ins follow TASK.md: controllers, touch and co-op use emulated devices/pages. No physical controller, real iOS device or listening person was available. Visual evidence complements functional state checks, with no FPS criterion.
