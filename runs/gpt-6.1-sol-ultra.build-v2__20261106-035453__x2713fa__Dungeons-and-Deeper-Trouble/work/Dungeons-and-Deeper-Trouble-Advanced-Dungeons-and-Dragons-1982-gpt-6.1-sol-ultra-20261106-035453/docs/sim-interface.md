# Simulation contract

Load `src/config.js`, `src/content/campaign.js`, `src/sim/geometry.js`, `src/sim/simulation.js`, then optional `src/sim/director.js`. Each publishes one global and has no DOM, storage, audio, transport or timer dependency. The engine's fixed-step lifecycle calls `sim.step(dt)` at 1/120 second. Rendering must only read the state.

## Public production API

```js
const sim = new DTSim.Simulation({seed: 7, players: [1], mode: 'solo'});
sim.submit(1, {
  mx: 0, my: 0, ax: 1, ay: 0, // ground directions, each component -1..1
  focus: false, sprint: false, heldInteract: false,
  actions: [{id: 1, type: 'fire'}]
});
sim.step(1 / 120);
```

`submit` accepts IDs matching a present seat. Discrete action IDs increase monotonically per player. Retransmitted IDs cannot spend another arrow or repeat an interaction. Supported action types are `fire`, `interact`, `dash` (`dodge` alias), `travel` with a landmark `target`, and `quiver`. `run` aliases sprint, `revive` aliases heldInteract. Input held state expires after 0.45 seconds without a heartbeat. Bow presses draw for 0.18 seconds and recover for 0.22 seconds; a hold never auto-repeats.

- `snapshot()` returns a detached JSON-compatible current state. `restore(snapshot)` applies a network snapshot atomically without replacing the guaranteed-solvable section checkpoint.
- `save()` returns `{schema:1,version,state,checkpoint,idCounter}`. `load(payload)` validates schema/content version and restores both current and restart states. Local storage policy is the application owner's responsibility.
- `join(id)` adds at most a second ranger at a safe anchor with protection. `leave(id)` removes the seat and its pending commands. Tools and ammunition belong to the party.
- `restart()` atomically restores current section inventory, creatures, pickups, fog, flags and positions, preserving already spent reserves and statistics. Managed Hub rounds reject voluntary restart.
- `assistedContinue()` resumes a defeated expedition at the last guaranteed checkpoint with three reserves and an assisted result mark.
- `clearInput(id?)` releases held and pending actions. `getCave()`, `isVisible(worldX,worldY)`, `context(id)`, `path(from,to,radius=5)`, `moveClear(from,to,radius)` and `acoustic(from,to,maxDistance)` are read-only simulation queries.

## State

`state.phase`: `map`, `cave`, `victory` or `defeat`. `cave` is null on the map; section IDs are `chalk`, `root`, `tide`, `ember`, `rime`. `node` is the wilderness landmark. `time` is simulation seconds; `tick` is the step sequence. `version` identifies the content contract. Seed is stable and current authored encounters do not randomize progression.

Party fields: `players`, `quiver`, `reserves`, `tools:{axe,boat,key}`, `relics:['half-ember','half-rime']`, `flags`, `cleared`, `stats`, `checkpoint`, `objective`, `notice`, `noticeTime`, `transition`, `outcome`. Statistics include shots, hits, banks, recovered shafts, treasures, deaths, restarts, revives, damage, elapsed time and assisted status.

Ranger record: `{id,x,y,z,vx,vy,aim,hp,maxHp,down,invuln,bow,draw,recover,dash,dashCooldown,focus,revive,anim,animTime,lastAction,tether}`. `aim` and attack angles are radians; 0 points east. `down` is remaining revive seconds, zero when upright. `bow` is `idle|draw|recover`; `draw` and `recover` count down. `dash` is remaining evade seconds. Animation names include idle, walk, run, listen, bow, dash, hurt, down, revive, pickup, climb, celebrate.

Enemy record extends its static content definition with `{z,aim,state,timer,phase,hp,maxHp,home,cueClock,heard,target,hitPlayers,attackDir,attackOrigin,vx,vy,defeatedAt,woundedCycle,mustSwoop}` as appropriate. States are dormant, investigate, windup, attack, recover, stunned, defeated. `target` is a remembered sound origin; it does not magically follow a hidden ranger. `phase` increases for each telegraphed attack.

Arrows: `{id,owner,x,y,z,vx,vy,life,bounces,energy,hit,origin,lastSafe}`. Collision is swept in ground coordinates. Release uses the renderer-agreed real bow attachment `[9.15 forward, .488 side, 21.96 high]` rotated by aim. Ordinary partner damage is suppressed. A rebound can hit its owner. Damaging hits spend the shaft; misses, armor deflections and ooze hits produce a unique recoverable pickup at a validated reachable floor point.

Pickups: `{id,kind,x,y,count,guard?,stash?,recovered?}`. Kinds include arrows, heart, treasure, axe, boat, key, half-ember, half-rime. Overflow remains on the floor. Authored arrow supplies retain remaining `_supplyBase` units for the live supply-yield multiplier, while spider-hoarded `_recoveredUnits` remain unscaled; loose missed shafts are always one arrow. Guard IDs must be defeated before taking progression rewards.

## Visibility and sound

`explored` and `visible` hold integer cell indices `cy * cave.width + cx`. Convert with tile size 16. Permanent memory is written only by rangers. Arrow light lasts only while a projectile flies and is clipped by the ordinary wall LOS. Never draw hidden enemy shadows, labels or effects just because their cells were explored earlier. `isVisible()` is the renderer's authoritative predicate.

`noise` is capped at ten recent `{id,x,y,kind,loudness,time,life,owner}` events. Actor hearing uses path distance around solid geometry and unresolved gates. `owner:null` marks a creature cue; a player ID marks a lure/footstep/release. Noise events expire after 1.6 seconds. `cues` holds at most two audible coarse cardinal descriptions, with the direction of the first navigable path step rather than a silhouette through a wall. Bat cues set `masked` while visible traces still describe the same encounter.

`events` is capped at 16 recent ID-tagged events. Audio/presentation consumes each unique ID once. Event types: voice, sound, fire, bank, arrow-land, dry-fire, armor, ooze-shed, enemy-hit, enemy-defeat, telegraph, attack, recovery, investigate, theft, pickup, tool, bank-lesson, hurt, self-hit, down, revive, reserve-spent, respawn, checkpoint, restart, room, travel, locked, cave-enter, ladder, join, leave, victory, defeat, quiver. A `sound` event supplies `cue`; other event types carry kind/position/duration where relevant. A voice event has readable `text` and cue `guide`.

## Content rendering

`DTContent.caves[id]` includes ASCII `rows` (`#` wall, `.` floor), width/height, tile size, rooms (cell rectangles), world spawn/exit/safe anchors, world-space enemies/pickups/props, cell-space tracks, and world-space banks `{id,a:[x,y],b:[x,y],lesson?}`. Palette is `{floor,floorAlt,wall,wallSide,accent,fog,light,theme}`. Root's gate is a dynamic `gates` record `{cx,cy,w,h,requires:'bankLesson'}`; its bridge is physically blocked until the banked gong shot succeeds.

Wilderness nodes use a 900×500 composition space; render and hit testing must apply the same scale. Edges are `{from,to,requires}`. Navigation validates every radius-aware edge, including fractional start/goal anchors beside thin banks, and revalidates cached endpoints when actors move inside one cell. Creature steering requests its actual collision radius and follows the first safe node. Local/remote players follow the same party visibility and separation boundary. The hard tether is 250 world units and appears in the ranger `tether` field before blocking outward travel.

## Developer isolation

`dev(action,value)` supports heal/health, infiniteHealth, infiniteAmmo, noclip, reveal, warp(section ID), spawn(creature kind), seed(integer), restart, continue. It marks the run assisted. `setTunable(key,value)` applies a bounded live setting; `resetTunables()` restores the one defaults record. Hub mode rejects mutation and tunables. UI/transport must restrict these APIs to the authority and keep experimental/attract saves separate.

`DTDirector.ExpeditionDirector(sim,id)` is the acceptance/replay driver. Call `update(dt)` before the normal simulation step. It reads state and submits only production commands; `done`, `errors` and `progress` expose evidence. It must not be confused with the separate cheating attract loop.
