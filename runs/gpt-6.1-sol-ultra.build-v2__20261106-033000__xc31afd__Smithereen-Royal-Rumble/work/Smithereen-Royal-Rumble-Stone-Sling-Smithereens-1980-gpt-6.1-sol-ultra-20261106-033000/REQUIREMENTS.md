# Requirement and evidence ledger

The complete specification is in ../PLAN.md and ../TASK.md. These rows group related requirements without dropping their distinct acceptance paths.

| Area | Implementation | Observed acceptance |
| --- | --- | --- |
| Native engine / packaging | Full 0.89.1 handoff, adapted artillery fixed-step/predictor design, native View/px/materials/props/Humanoid/Shell/ChipAudio; scripts/build.mjs | tests/artifact.mjs: exact released Hub bytes first, three inline scripts, no runtime asset URLs/absolute paths, metadata schema; exact final file tested |
| Simultaneous charge | sim.js command state machine, capped power, fixed50° elevation, charge-time presets, stone lock, cancel/buffer/reload | simulation.mjs short/full holds, independent simultaneous releases, no unwanted buffer shots; ui-input.py human key/pad/touch cancellation |
| Ballistics | Analytic per-step integration plus segment sweep; same production predictor; split at apex; explicit z-up boundary | Prediction/live agreement all stones both seats, thin-block sweep, all courts' exposed last fragments reachable, no NaN |
| Objective destruction | Stable material blocks, authored directed support paths/foundations, atomic tick impacts and removal, visual debris | Real cascade without score farming, foundations persist, all5 AI courts finish, full tour collapses, browser actual duel demolition |
| Tactical interruption | Crew retreat1.8s, launcher repair2.6s, endpoint max, input cancel, protected return1.25s, throw dedup | Both targets through real shots; overlap/protection/no queued shot fixtures; actual full tour both target kinds |
| Scoring/outcomes | 3/7/13 direct score, winner × bout, loser0, mutual draw,90s normalized-health then score, frozen next actions | Unit ties/outcomes/exactly-once and full10 weighted total reconciliation; browser natural result/rematch |
| Three stones | Round precision, masonry2.6 damage, deterministic3-way split, remembered range per type | All stone predictor/live runs and complete tour coverage, touch/keyboard/pad switching; native distinct art/audio |
| Content / tour | Five different support layouts/moods, ten authored personalities, advance after loss, championship | Actual legal-command tour enters each court/bout, lesson shot+hit, losses advance, save clears at finish, replay begins1 |
| AI | Common legal command interface; production trajectory search, support value, tactical protection at arrival; profile reaction/error | Deterministic all5-court completion; ordinary AI never writes hp/score; bounded search refinements for remnants |
| Devices / TV | Native Shell menus, focus ring/hover, controller polling and explicit local seat assignments, last-device prompts, rebindable keys | ui-input.py two independent keys, two pads, disconnect pause, UI navigation, sliders; title/phone captures reviewed |
| Touch / narrow display | Custom captured pointer holds, cancellation, contextual stone chips/halo; compact native side projection keeps whole lane | Physical client-space bounds regression, real CDP hold/release and chip tap, WebKit iPhone profile and pointercancel |
| Settings / safety | Game-specific validated storage, three sound buses/mute, glyphs/tension/prediction/assist/reduced motion/UI scale, safe focus cancel | Corrupt/old/denied storage; settings retained; native START and unsupported-touch blocker regressions; gameplay never depends on audio |
| Attract | Exact10s front-menu idle threshold, throwaway real bot world, all stones/courts, consumed exit | Exact before/at threshold assertions, shot state observed, no tour writes, keyboard/pad/touch exit coverage |
| Developer | Pause workshop, scenario/AI seats/court/bout, restore/clear/result, pause/step/speed/invulnerability, collision/support/arc | UI navigation and tuning checks, fractional speed and exact step tests, cheated runs marked; hosted diagnostics read-only |
| Court authoring | Version1 editable blocks, material/foundation/support fields, validation/import/export/apply/preview | Valid default roundtrip, malformed support/dimensions rejected, ballistic envelope and connectivity checked; UI author apply/export/import |
| Code-only audio | Native synth custom instrument/patches plus formant gibberish, three buses, music.10 | Production offline music/effects/voice/mix nonzero finite, representative peak<1, all-bus mute0; acoustic quality unconfirmed |
| Hub lifecycle | Active boot bypass, automatic ready, negative-clock wait, authoritative host incl no local seat, reliable intents/snapshots/ACKs, deadline/leave/end | Official harness normal/adverse150±50ms5%loss/host-leave/server cases; __hubCheck.pass and body complete; extra simultaneous firing match |
| Hub fairness/traffic | Authenticated from->seat, seq/duration validation, bounded FIFO retry/cancel reserve, compact hp state, final ACK barrier | hub-unit.mjs duplicate/forgery/rejected-send/reorder tests; max snapshot and packet budget; both confirmed shots and silhouettes agree; no input/audio/messages after end |
| Reports | metadata.json is sole source for game and root exit-interview.json | JSON parse/key/type/order checks, exact model/date/environment/usage, catalogue title/control/player consistency |

## Refinements and justified implementation choices

- Kept engine source unchanged. Custom game systems replace inherited walking, turn queue, angle adjustment, wind, rockets and inventory, following the plan.
- Increased material health after initial native AI play ended in15–25s. The initial complete-tour driver then ran about14min of simulated bout time; subsequent tactical AI refinement favors castle targets for mason/broad personalities. A skilled bot is not a first-time human timing measurement.
- Native Shell is retained, with custom simultaneous-seat routing so one confirm/fire cannot control both seats. Its touch controls are set off through native settings because the game supplies contact holds and a contextual stone selector.
- Compact phone composition uses a public native custom View and320px buffer to avoid fixed-resolution minimum-scale cropping. Physics and collision are identical.
- Local courts author editable block graphs rather than requiring full rigid-body settling. Unsupported blocks immediately leave objective/collision state and become finite cosmetic debris, as specified.
- Hub uses periodic full compact dynamic state rather than fragile lossy block deltas. Static geometry regenerates from court/config; every passive client acknowledges reliable baselines. The host waits for final-state ACKs within supplied grace.
- Standalone has same-device versus. Internet play is entered through AI Hub; no nonfunctional room browser is presented.
- Validation uses documented stand-ins: no physical controller, touch hardware, TV, remote player, listener, or real iOS Safari was available.
