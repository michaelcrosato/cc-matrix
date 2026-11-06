# Acceptance ledger

This ledger names implementation and observed tests; it does not equate source research with implementation evidence.

| Requirement | Implementation | Evidence |
| --- | --- | --- |
| Fixed simultaneous artillery / charge timing | sim.js: command, step, projectile, powerOf; app.js input adapter | Short/medium/full hold, no auto-fire/wrap, buffer/cancel, independent releases; native browser keyboard and pad stubs |
| Source's composition and tactical targets | Native side view; five mirrored castles, stationary inward catapults and crews across water | TV charge capture, mirrored collision/geometry tests, reachability for every court/stone |
| Accurate range hint and last impact | Shared predict/stepProjectile; separate remembered hit per stone; optional full arc; mouse/arrow reference | Six mirrored prediction/live cases; fresh native frame capture; hover/focus and real input checks |
| Three stones | Round, masonry with neighbour chipping, deterministic apex split | All weapon flight/split cases, no inconsistent gravity, tour and attract weapon coverage |
| Swept collision | Expanded slab sweeps, stable first-hit ordering, explicit terrain/water planes | High-speed thin wall, water-first, live/predicted impact agreement, finite values |
| Structural destruction / supports | Stable block IDs, explicit foundation/support roles, connectivity collapse, visual debris | Actual collider removal, cascade/no extra direct score, every isolated last block finishable, same-tick mutual draw |
| Crew/launcher interruption and recovery | Endpoint states, cancellation, latest endpoint and return protection | Both interruption cases, overlapping disable, fragment dedup, fresh input after recovery, native repair/protection captures |
| Scoring / outcomes / deadline | 3/7/13 direct points, winner-only bout multiplier, percent-health/time tie rule, one result | Timeout ordering, mutual draw, full-tour totals, exactly-once results and network finish |
| Five courts / ten-bout tour | Village, Quarry, High Keep, Lakeside, Royal; ten authored rival profiles | Full-tour driver enters through app.startTour, plays all bouts, lessons, stone changes, temporary hits and collapse, results and replay; artifacts/tour.json |
| Learning and opponent identity | Real first-shot/first-hit lesson triggers; forgiving first opponent; native poses and captions | Tour driver lesson coverage; TV lesson/charge captures; no lessons run in Hub |
| Quick and local modes | Quick setup / rematch / court choice, local one-bout or ten-bout war, explicit seat choices | Real menu route; two-keyboard simultaneous holds; two pads; pad disconnect; keyboard/pad ownership |
| Native renderer / animation | Full unchanged engine; custom native shape/material registries, original humanoid poses, machine state animation | Native draw headless errors check; title, charged shot, collapse, repair/protection, remnant and result images |
| Code audio | Native song/instrument/effects buses; lute march, impact patches, short formant speech; 10% music | OfflineAudioContext finite nonzero unclipped mix; muted/isolated buses; default setting and voice route tests; no audio-file requests |
| TV/controller-first menus | Native E.Shell TV mode, native focus/settings/controls, curated large screens | TV title button bounds; hover focus; real pad navigation/glyph family; rebind/fire; functional scale and sliders; About pages |
| Touch / phone/tablet | Pointer-ID ownership, safe cancel, temporary halo, full lane plus fresh-frame target inset | WebKit iPhone/iPad profiles with synthetic long holds/cancel (capture stub for synthetic pointer IDs); target framing/pixel checks; actual phone-size capture |
| Pause / focus / disconnect | Native pause plus explicit cancellation; live hosted overlays | Escape regression, frozen local tick, focus loss and unplug; Hub authority continues through local menu; Create+Options ignored |
| Attract | Throwaway real simulation after 1200 idle steps; three 30-second segments with authored legal-command goals | Exact 9.9917/10 threshold, consumed keyboard/pointer/pad exit; three courts, all stones, interruptions, protected recovery and collapse; no save writes |
| Persistence | Native validated settings; game-specific versioned between-bout save with weighted-score validation | Corrupt/missing/old/denied storage; save round trip and complete tour/replay; local and Hub never write solo save |
| Developer mode | Pause tools, scenarios, seat AI toggle, restore/clear/force, step, speed, invulnerability, support/arc overlays | Browser enters from pause; tuning applies/resets; health fraction preservation; local mutation marking; hosted diagnostics read only |
| Court authoring | Stable IDs, select/move/add/remove/material/foundation/support controls, connectivity validation, collapse preview, text import/export | Valid/invalid court round trip, browser export/import preserving blocks; all shipped courts validated and reachable |
| Real Hub multiplayer | Released first inline client, shared-world 2–2/3-minute metas; automatic ready/start; authority independent of local seat | Unmodified official harness normal, impaired, host leave, server; actual charge/release harness rounds normal/server; passive ACK traffic |
| Hub fairness and reliability | Authenticated sender -> seat, monotonic commands, bounded hold duration, retry queue, compact full health snapshots | Fake-network asymmetric begin/release delay, duplicates/stale sender rejection, dropped/reordered snapshots, stale baseline ACK, actual false-send retry and one launch |
| Hub budget / lifecycle | 140 ms snapshots; local 14/s token bucket, ordered critical queue, size check, final baseline, exactly-once finish/end | Actual and deterministic packet/size checks; valid standings, time-up, host leave, server host, no game input/messages/audio after end |
| Packaging / reporting | Node deterministic inline bundler with script syntax check; unchanged client; MIT notice; metadata single source | File:// final-artifact browser checks, no external runtime requests; inline script parse/version/client equality; report schema and catalogue consistency |

## Hardware limitations
No physical controller/touchscreen, real iOS device, TV, human listener or remote second player was available. Standard pad stubs, WebKit phone/tablet profiles, independent Hub frames and rendered waveforms are evidence only for those stand-ins. Acoustic quality is unknown. Browser software drawing can run slower than a real device; FPS targets and optimization are outside the brief.

## Visual evidence
- title.png: TV composition, all menu actions in frame and focus hierarchy.
- charge.png: lane, useful arc space, charge bar, native machinery/crews and range diamond.
- collapse.png: changing authored silhouette and rubble.
- repair.png / protected-return.png: status, repair pose and gold protection shields.
- last-fragment.png: smallest remaining objective.
- result.png / credits.png: calculation/ceremony and reporting legibility.
- phone.png: full lane, target enlargement and touch occlusion at phone dimensions.
