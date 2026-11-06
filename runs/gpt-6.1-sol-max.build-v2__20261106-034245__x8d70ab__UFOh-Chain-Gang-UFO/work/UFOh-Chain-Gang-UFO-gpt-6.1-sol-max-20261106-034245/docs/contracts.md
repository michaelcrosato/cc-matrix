# Runtime contract

All source modules are ordinary ES modules with named exports. The custom single-file builder wraps each module; engine and released Hub client are inlined separately, unchanged. The engine is exposed as `globalThis.My3D2dge`. No third-party runtime other than those pinned files.

## Authority

`World` in `src/simulation.js` is deterministic, independent of display/audio, stepped at 1/120 second by `E.Game`. `new World({seed,mode:'mission'|'score',players:[{id,name}],attract:false,balance})`. Methods: `step(dt,intents)`, `snapshot()` (JSON world with players/enemies/shots/blasts/boss, t, tick, status, score, sector, wave, events), `applySnapshot(snapshot)` for nonhosts, `command(name,data)` for standalone tools, `exportContent()` / `importContent(json)`. `world.state` is its mutable authority data. `world.events` is the last 256 event records, each `{id,type,t,x,y,player,...}` with monotonic IDs. Status is `running`, `extracting`, `victory`, or `defeat`. Players use ID values verbatim, with numeric IDs in Hub. Ready shield is `shield <= 0`; shield is seconds left. Hull starts at 3, `down` marks wrecks, `active` marks participation. Actor IDs are stable integers. World bounds are always x=0..960, y=0..540. Debug/attract cannot write records.

Intent object keyed by player ID: `{mx,my,aim:null|radians,fire:boolean,seq:number}`. Normalized, clamped and sanitized by authority. Angles increase clockwise in the x-right/y-down plane. Host alone simulates enemies/collisions/mission. `removePlayer(id)` clears participation and rescales remaining boss health fairly. Rendering consumes snapshots without gameplay writes or gameplay RNG.

## Audio module

`createAudio(game)` returns `{unlock(),setScene(name),event(event),update(dt),stop(),setPaused(boolean),debug()}`. It uses native `game.audio` synth, native music sequencing and sfx/music/voice buses. Must not create audio until unlock. Names: title, mission, boss, victory, defeat. Event types: shot, shield, ready, hurt, kill, fusion, hunter, warning, missile, chain, rescue, bossPhase, victory, defeat, sector, focus, confirm. Events include x/y/player/depth/kind where applicable. All audio original and generated in code; default native music setting 0.10. Export test helpers/data as appropriate. No engine edits.

## Hub module

`createHubAdapter({hub,createWorld,onWorld,onEnd,onEvent})` returns object with async `connect()`, `tick(dt,localIntent,{overlay:false})`, `getWorld()`, `getPresentation(alpha)` (may return world snapshot), `diagnostics()`, `dispose()`, fields `active`, `ended`, `running`, `isHost`, `localId`, `info`. `createWorld(options)` is `new World(options)`, `onWorld(world)` sets application world, `onEnd(reason)` stops sound/input, `onEvent(event)` feeds presentation/audio. Calls connect mode shared-world/seats[1,2], initializes all members, ready once without gesture. Countdown is gated on time>=0. Host local intent uses same format as remote. World snapshot packets at <=8Hz and intent at <=10Hz, reliable; member/sender checks and stale sequence/input expiry. Include ack. Snapshot arrays may be compacted by network codec but world snapshot remains plain JSON. Render interpolation/reconciliation is local. On time-up final state then finish once. Server host has no local pilot. leave/end handled without world-changing dev access. Only Hub transport. Adapter should have unit tests with fake Hub; official browser harness integration is root-owned.

## App / screens

`E.Game({view:'overhead',res:[640,360],expand:true,input:...})` owns clock, native scenes, native menus/settings/rebinding/pause, font and primitives. Additional invisible touch sticks, local device pairing, content tools, attract and six-letter entry extend this foundation. Local world pause is real; Hub overlays remain live and send neutral intent. Stable debug surface is `window.__game` with `{game,world getter,audio,hub,ui,debug}` and `game.debug.snapshot()/command()`. Only standalone commands can mutate the world. Headless tests import source modules and use native game.advance with draw validation.
