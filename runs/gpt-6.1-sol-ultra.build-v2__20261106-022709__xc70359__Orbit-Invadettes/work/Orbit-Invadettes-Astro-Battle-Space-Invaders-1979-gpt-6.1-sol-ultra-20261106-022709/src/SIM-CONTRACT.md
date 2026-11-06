# Simulation contract

ES modules `content.js` and `sim.js`; no DOM/engine dependencies. Field 480×270. Cannons y246, x18..462; breach y230. Bunker center x80/186/294/400, 16×8 cells of 3px, left center-24, top202. Bunker `.mask` and `.original` are row-major numeric 0/1 arrays, `.cols=16,.rows=8,.cell=3,.x` left,.y top,.center` center x.

`createWorld({seed,players=1,difficulty=1,ids})`, `stepWorld(world,commands,dt=1/120)`, `repairPreview(world,seat)`, `startEncounter(world,index)`, `setTuning(world,key,value)`, `serialize(world)`, `deserialize(data)`. Commands seat-indexed `{move:-1..1,fire,repair,targetX?}`; repair is already an edge. World has `tick,time,seed,rng,epoch,encounter,status,reason,score,reserve,extraAwarded,assisted,players,enemies,bullets,pickups,bunkers,formation,boss,saucer,events,tuning,difficulty,location,encounterTime,transitionTime,nextEncounter,killCount,stats,intro`. Encounter 0..5 formations,6 boss. status playing/transition/victory/defeat. `events` is reset each step; consumer must handle every step to retain all effects.

Players stable `.seat,.id,.x,.y,.alive,.respawn,.protected,.charges,.score,.kills,.repairs,.recovery,.active`. `.protected` and `.respawn` seconds. `alive=false,respawn>0` pending; alive=false respawn0 spectator. `.active=false` departed seat. Bullets `.id,.x,.y,.vy,.owner` seat (friendly) or -1(enemy), `.kind='shot'/'bomb'/'heavy'`, `.r`; pickups `.id,.x,.y,.life`. Enemy `.id,.row,.col,.x,.y,.type='ordinary'/'armour'/'bombardier',.hp,.maxHp,.telegraph,.flash`; all enemy x/y absolute, synchronized from formation. Formation `.x,.y,.dir,.timer,.beat,.initial,.interval`; `.x` offset from authored start x. Boss `.x,.y,.phase=1/2,.emitters=[{x,y,hp,maxHp,open,telegraph}],.hp,.maxHp,.open,.cycle,.safeLane,.telegraph,.age,.hit`; emitter x/y absolute.

Repair preview returns `{bunker:index,cells:[row-major indices],usable,reason}`; stable nearest bunker even demolished. Every cell drawn is exactly a collision cell. `TUNING` array `{key,label,min,max,step,default,description}` and `DIFFICULTIES` array contain shared slider/preset data. Export `WAVES`, `LOCATIONS`, `FIELD`, `tuningForDifficulty`, `validateContent` from content. `startEncounter` is a dev helper; caller marks assisted. `setTuning` validates bounds and marks assisted. `killPlayer`, `spawnSaucer`, `spawnEnemy`, `leaveSeat` additionally exported for dev/session actions; these never execute without explicit caller action.

Implementation and verification in progress; final tests will document actual normal-run durations and found issues.

## Verified implementation

- All requested APIs implemented. `deserialize` accepts a JSON string or plain object and returns a detached snapshot. `serialize` returns a JSON string.
- Additional helpers: `repair(world,seat)`, `clearShot(world,x)`, `resetTuning(world)`, `random(world)`, `sweepY(...)`. Dev helpers do not mark assisted automatically; caller must do so except set/resetTuning, which do.
- Events carry unique monotonic `id` and `tick`; kinds include the core list plus `drop,feedback,reverse,telegraph,saucer-hit,shield,blocked,emitter-break,boss-hit,boss-phase,cleared,pickup-expire,leave`.
- Bunker repair preserves missile-radius clearance at every active cannon, including exact column boundaries. Touch clearShot checks the same width as collision.
- `leaveSeat` marks active=false, gone=true, alive=false, respawn=0 and preserves ID/score/seat. No deployment or score is awarded. Future attack orders scale by active seat count.
- `tests/sim.test.mjs` exports synchronous `runSimulationTests()` returning `{passed,failed,results,campaigns}`. Direct CLI prints only failures and one count. 34 checks currently pass, including ordinary-input full STANDARD solo/co-op campaigns with normal damage/resources, all formations and both flagship phases. No assisted flag, invulnerability, wave jumps, or tuning overrides in those completion runs.
- Before the final aperture refinement, seed137 solo took552.0s (one loss), co-op306.9s (two losses); additional solo seeds1/42/2026 won at520.4/511.7/553.8s. Final runner reports current exact durations in returned campaigns.
