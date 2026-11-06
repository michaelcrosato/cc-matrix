# UFOh Orbit content workflow

The complete game lives in source modules and bundles into one standalone HTML. All simulation coordinates use the fixed `ARENA` rectangle, 960×540. Browser size, scaling, drawing and input projection never change that rectangle.

## Add an encounter

1. In `src/data/mission.js`, copy a wave with a unique short `id`. Its `title` is the action banner and its `learning` is the compact objective. `complete:'clear'` requires every scheduled spawn group to appear, all gates to finish warning, and all hostiles to be destroyed; `cleanup:'bounded'` retains the fixed rails and projectile cleanup bounds.
2. Each `spawns` record gives `at` in encounter seconds, `formation`, `type`, center `cx,cy`, `count`, `spacing`, and optional `angle` in radians. `single`, `line`, `cluster`, `ring`, `fusion`, `cross`, `pincer`, and `lane` are reusable formations. Angles are screen-plane clockwise. A fusion formation puts eligible drifters close together. Set `merge:false` to preserve a deliberately spaced chain cluster. Optional `speed` scales a drifter or hunter's normal movement.
3. Put the wave in a sector's `waves` array. A sector supplies stable `id`, readable `name`, brief `subtitle`, and `palette` (`cyan`, `amber`, `violet`, or `coral`) to select a background motif. A sector with `repair:true` repairs one hull and returns the shield at entry. To add a sector, provide its content data and presentation palette; no combat rule changes are required.
4. Pause, open Dev Mode, select a sector/encounter and resume to preview it. Formation spawning is available without changing the canonical mission. Single-step and slow/fast simulation let you inspect fusion, lane and shield timings. Dev overlays expose collisions, real/current aim and warnings. A debug-marked run never writes a genuine score.
5. Export content to JSON, edit it, and import it through the Dev content editor. `validateContent` reports invalid enemy/formation names, duplicate IDs, missing groups and out-of-range numbers. Rejection retains the complete prior working configuration. Successful import restarts the selected encounter and marks the run debug.
6. Run `npm test` after changing content or balance. The legal-input mission scenario checks all sectors, firing, ramming, recharge, fusions, propagation, gunships, all command phases, extraction and victory. Exported content round-trips through the same validator.

## Balance and live edits

`src/data/balance.js` owns canonical defaults and the public `BALANCE_SPECS` slider list. These cover movement/response, cannon slew/cooldown, recharge/exposed speed/immunity, drifter and hunter motion, fusion radius, gunship warning/volley, chain radius and command health/attack timing. `commandWorld(world,'balance',{key:value})` clamps values to declared ranges. Active recharge clamps to a shorter duration; reducing command health clamps each component's remaining and maximum health. Increasing maximum health does not heal existing components. Reset restores canonical defaults. A live edit marks the run debug. Attract creates a fresh canonical configuration.

## Simulation contract

The native engine advances at 120 fixed steps per second. `stepWorld(world, inputs, dt)` takes one intent per pilot: `{mx,my,ax,ay,aim,fire}`. Move and aim are planar vectors; aim is explicit only when `aim:true`. A zero vector preserves bearing. Large designer steps subdivide into fixed collision steps.

The deterministic order is pilot timers/motion/accepted shots; encounter scheduling; warning gates and enemy movement/fusion; swept projectiles; rescue and body contact; expanding cascades; removal and terminal state. Entity IDs and event IDs increase monotonically. Within a body contact batch, stable entity IDs select one contact, and only one ready shield is spent. Shield consumption gives 0.12s contact grace. Hull hits give separate 1.1s immunity and separation. Friendly chain blasts cannot hurt pilots.

A cascade stores its unique ID, initiating owner, depth, count, centroid, points and already-resolved victims. Enemy-fire-initiated chains belong to owner `-1`: points count toward the team total and are excluded from individual contribution. Base enemy scores are 1/3/10; each propagated depth multiplies the base up to ×8. Command craft gives 500 outside this table.

Command components open on a declared periodic window. Cannon hits do one damage, legal shield rams do three, and a cascade does two once per component per chain. Destroying a phase closes its emitters, gives a short safety beat, and introduces the next known threat pattern. Defeating phase three starts real extraction choreography; mission victory follows after three seconds. Score Attack reuses the formation deck and introduces a command craft every seventh signal. It continues until defeat.

`autopilot(world,index)` produces legal move/aim/fire intents. The full mission proof starts from canonical seed and rules with no debug, invulnerability, teleports, enemy deletion, health refill or win command. Attract may use its own invulnerability and scenario setup. Cosmetic randomness belongs to presentation and never advances gameplay randomness.

## Debug API

- `snapshotWorld(world)` returns serializable render state. It excludes content and full event history; events retain monotonic IDs. `exportContent(world)` returns designer JSON.
- `commandWorld(world,'invuln',{value})`, `'refill'`, `'spawn'` (`type,x,y,count,formation,spacing,angle,speed`), `'formation'` (spawn-group fields), `'clear'`.
- `'sector'` (`value,wave`), `'wave'` (`value`), `'phase'` (`value:1..3`), `'restart'`, `'resetSeed'` (`value`), `'step'` (`seconds`).
- `'balance'` (key/value patch), `'resetBalance'`, `'overlays'` (`value`), `'snapshot'`, `'exportContent'`, `'importContent'` (`text`).
- `'disconnect'` (`index`) neutralizes a departing pilot; inactive wrecks cannot be rescued or keep firing.

In AI Hub, world authority remains with the host. Local menus offer inspection only; world-changing developer actions are unavailable. The shared world continues while an individual overlay is open, with neutral local intent. Solo and couch pause freeze simulation.

## Deterministic replay

Every genuine run keeps nonenumerable `world.replay` data separate from render snapshots and network traffic. `exportReplay(world)` returns version, seed, balance/content versions, initial configuration, the complete legal input sequence, developer commands (if any), and terminal metadata. Identical adjacent input frames use run-length compression; changing pointer vectors retain full precision. `replayWorld(record)` reconstructs the canonical state through the same fixed-step simulation. `replayWorld(record,{untilTick})` is a deterministic timeline scrubber. Directly editing internal state is outside replay support; designer changes made through the command/import APIs are recorded. A debug step records its neutral input frame and debug marker without applying the step twice on replay.

The verification suite includes an exact record/reconstruct comparison, a command-and-single-step replay, a full solo mission with all combat milestones, and a canonical two-pilot mission where one pilot goes down through legal movement/fire input, receives a real ready-ring rescue, goes down again, and the surviving pilot completes all three command phases and wins. No successful complete-mission proof uses invulnerability, teleports, health refills, enemy deletion or a win shortcut.
