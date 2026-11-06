# Deterministic garden simulation

Implemented in `src/sim.js`; independent of DOM, graphics, audio and wall clock. Browser global `GardenSim` and CommonJS export. All mutable state is JSON serializable. `step` substeps unusually large intervals at 60 Hz, capturing presentation events.

## Public contract

- `defaults`: playerSpeed 5.2 cells/s, crawlerSpeed 3.6 cells/s, sentrySpeed 4.2 cells/s, aggression 1, frightDuration 5 s, recoveryDuration 2.5 s, chewDuration 0.9 s, biteCooldown 0.45 s, lives 3.
- `levels`: five authored maps at required 15x9,17x11,19x11,19x13,21x13 sizes, with palettes, quips, trees, nursery, one/two crawlers and shared two sentries.
- `create({garden,players,seed,tuning,custom})`: players can be count or id array. All actor ids are numbers. State has `version:1`, `level`, `players`, `crawlers`, `sentries`, `trees`, `bait`, `lives`, `seeds`, `score`, `combo`, `stats`, `gardenStats`, `status`, `checkpoint`.
- `step(state, commands, dt)`: commands keyed player id, `{dir:[dx,dy],plant:boolean,actionId:string,plantTarget:[x,y],target:[x,y],stop:boolean}`. Null direction continues movement. Stop freezes current smooth position. Direction cancels click path. Diagonal ties resolve horizontally.
- `graph(level)`: `.floor(x,y)`, `.cells`, `.neighbors([x,y])` => `[{cell,dir,arrival,wrap}]`, `.path(start,end)` => array including endpoints, `.edge(a,b)`. Graph checks editable map revisions to avoid stale workshop collision.
- `validate(level)`: string errors, never starts impossible content. Includes dimensions, legal row syntax, entity locations, boundary pairing, connectivity, nursery exits, safe spawn separation and chain path length.
- `plantCell(s,p,requested?)`: legal graph-adjacent cell or null.
- `next`, `retry`: mutate and return same state. Final clear followed by next becomes victory. Retry rolls the complete garden entry state back, including score/resources/metrics.
- `snapshot`, `restore`: deep JSON state copy and validated restoration.
- `removePlayer(s,id)`: removes actor plus bait ownership; pressure immediately adjusts to actor count.
- `bot(s,id,{noBait})`: returns ordinary real commands using tail seeking with hazard-weighted routes. No teleportation, invulnerability or tuning changes.
- `cellToWorld`, `worldToCell`: single 16-unit conversion boundary.

## Simulation details

Continuous movement traverses the same paired-edge graph as AI, pathfinding and editor validation. Immediate reversals exchange endpoints and invert progress without changing the rendered position. Wrap samples stay at mouth endpoints, including crawler history, never drawing a line through the board. Crawler bodies sample distance along compact traveled edges, including explicit wrap markers and corners. Intermediate segments have no collision consequence; only the final body sample is edible.

Contact resolution captures overlaps first, applies dangerous hits, applies surviving-player tail bites and pickups, and finally resolves defeat before clear. Shared damage grace limits simultaneous damage to one life. Head danger is independent of segment count. Bites refresh fright except for spinning sentries. Sentry catch scores once, recovers after its timer, and never becomes dangerous solely by changing colour. Two sentries use trailing and forward-junction targets. Crawler switches forage/pursuit on seeded timers and posts a current warning event. Bait attracts nearby crawlers and creates a dangerous but stationary chew opportunity.

Plant action ids are deduplicated, with accepted/rejected results retained for network snapshots. A dead/respawning keeper receives an explicit rejection. Shared seed spending runs in stable player order. Hub adapter must reject newly arriving plant commands during non-playing report/outcome states itself, as those states do not tick gameplay.

## Tests and observed issues

`node tests/sim-tests.cjs` is quiet except failures plus its single passed/failed line; it also exports a function returning `{passed,failed,failures}` for the parent verifier. Covers all maps and wraps, movement/walls/queued turns/reversal, click arrival and cancellation, chain history, all collision ambiguities, fright/spin recovery, exactly-once resources, co-op contacts, retries/checkpoints, restoration, editor mutation/validation and complete normal-command campaigns.

Successful scripted paths: solo campaign seed 5, two-player campaign seed 271828; all 47 segments cleared. Each garden also clears without planting using seeds [1,1,1,2,2]. Bots are unusually accurate and finish a campaign in about one simulated minute. This proves accessibility/finite progression, but does not establish the plan's 12–18 minute first-human-run target. Human pacing/listening/physical devices remain unverified here.

Implementation review during testing found and corrected three gameplay issues: editable-level graph caches could otherwise go stale; fractional floor coordinates could be accepted; click-to-move could resume after arrival. Protocol review additionally found and corrected missing plant rejection acknowledgements while respawning. No campaign-ending blocker remained in the completed simulation checks.

## Integration review: application seed 1982

The initial bot lost in later two-crawler maps at seed 1982. This was a bot decision issue: it kept its direction while partway across an edge even when another actor approached head-on. Added a short legal-motion lookahead and emergency reversal to bot input decisions. Gameplay speeds, enemy AI, collisions and segment counts remain unchanged. The revised bot wins the actual application's seed 1982 solo in 94.12 seconds with one hit (finishes three lives), and simultaneous co-op in 66.90 seconds with zero hits. Both clear all 47 tails through ordinary movement and planting. Persistent tests now include those actual-seed paths, alongside earlier seeds and every garden's zero-bait path.

Additional arbitrary JSON import validation tested 66 cases covering top-level field and nested entity types. Numeric nursery/spawn fields previously could throw instead of returning errors; now they return useful errors. This is a fifth distinct issue corrected during implementation review/testing. It was not a normal campaign blocker; standalone import callers also catch errors.

The brief's 12–18 minute first-human-run target remains unmeasured. Optimal bot times are not a substitute for human playtesting. No artificial delays or movement/segment changes were added to force duration.

Two further integration issues corrected: Retry no longer clears a run's sticky `modified` flag, protecting normal records after developer actions; `removePlayer` now removes that seat from the garden-entry checkpoint too, preventing Retry from resurrecting a departed teammate. Callers should use the helper rather than manually popping an actor. These bring corrected simulation/import/integration issues to seven, plus the old bot's head-on decision issue. The record-protection failure could have allowed a dev-modified run into normal records; no loading/crash/full-campaign blocker was observed in these fixes.

Snapshot restoration now validates actors/movers, chain history, sentry timers, shared resources, tuning, statistics and nested garden-entry state. Corrupt-but-parseable storage can no longer pass the loader and crash later when an actor is accessed. This eighth corrected simulation/import/integration issue is covered by eight explicit corrupt-state variants and the existing deterministic snapshot continuation check.
