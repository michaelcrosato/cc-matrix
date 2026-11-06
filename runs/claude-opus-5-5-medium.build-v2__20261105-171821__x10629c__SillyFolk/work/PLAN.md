# Game Plan: a village life sim, one bus ride from the Big City

Source: *Animal Crossing: City Folk*. You build an **original** game inspired by it, from this plan and your TASK.md, without its author. Read TASK.md first, then this whole file once.

**Contents:** 0 Using this plan · 1 The game · 2 Engine and packaging (verified recipes) · 3 Time, calendar, weather · 4 The village · 5 You: avatar, movement, tools · 6 Things to do · 7 Money · 8 Home · 9 Neighbours · 10 Town services · 11 The City · 12 The year · 13 Day One · 14 Writing bible · 15 UI and UX · 16 Art direction · 17 Animation · 18 Audio · 19 Multiplayer · 20 Title, attract, pause, settings, dev mode, About, saves · 21 Code architecture · 22 Testing · 23 Build order and cut rules · 24 Finish checklist and TASK.md coverage

---

## 0. Using this plan

- **Title.** It is yours to choose, the way TASK.md says: brainstorm silently, pick with a real random number generator, do it first. This plan says "the game" throughout. The riff must stand on its own joke (see *Originality* in section 1).
- **Names and paths.** TASK.md names your deliverable HTML, your dev folder and your exit interview file. This plan never does. Every path below is relative to your dev folder.
- **[verified]** means the author ran it on engine kit 0.46.0, on this machine, before writing this. Treat it as known good. If your kit is newer and something differs, read the kit's `CHANGELOG.md`.
- **Numbers are defaults.** They live in one tuning table (section 20). Change them when play shows they're wrong.
- **Content counts are written floor → target.** Every system ships. Under pressure, content may drop to its floor; a system never ships half-built (section 23).
- **Changing a decision:** you may, if it fails in practice. Keep the pillar it served.

---

## 1. The game

**Pitch.** You step off the last bus at the end of the line and, within ninety seconds, owe a goose 8,000 beans. The village is tiny, its neighbours are odd and opinionated, and every day has something to catch, dig, grow, sell, overhear or regret. One bus ride away, the Big City glows: salons, auctions, couture, a theatre, and a magpie selling art that is "only forty percent stolen". The village keeps time whether you're there or not, and it will mention it.

| Field | Decision |
|---|---|
| **Genre** | Life sim / social sim (AI Hub genre: `Life Sim`) |
| **Perspective** | Isometric 3/4 orthographic diorama: engine `iso` preset, yaw 45°, pitch 35°, zoom 1.6, with 90° camera turns. Same camera indoors, as a dollhouse cutaway. Chosen from side-by-side renders: straight-on (yaw 0) reads flat and roofs turn into colour blocks; 45° reads like a tabletop model and suits the engine's pixel pipeline. |
| **Length** | A 16-day calendar year, about 2.5 to 5 hours to live fully; most features are reachable in the first hour; a player can sleep ahead to any season without dev mode. Play continues after the ending. |
| **Players** | 1 solo; 1–4 in AI Hub sessions; 1–4 visiting on its own (section 19) |

**What makes the source distinctive, and our version of it:**

| The source's essence | Our version |
|---|---|
| The world runs on a clock and calendar, with or without you | Village Time or Real Clock, a different tune every hour, weeds and letters that pile up, neighbours who noticed you left |
| A small town of animal neighbours with personality and gossip | Eight odd misfits with tics, routines, feuds and a memory of what you did |
| Cheerful debt to a shopkeeper who owns everything | Mrs. Gander, a terrifyingly courteous goose and the village's bean counter |
| Collect everything, donate to a museum | Fish, bugs, fossils and art, one pun at a time, for a near-sighted curator |
| City Folk's signature: a bus to a city of shops | The Big City: bus ballads, neon nights, salon, couture fashion check, auction, theatre, shady art dealer, home-rating bureau, fortunes, café, crowds |
| Visiting friends' towns | AI Hub round, and Visit mode on its own |
| Warm, deadpan writing and babbling voices | Writing bible (section 14), code-made gibberish voices |
| Seasonal holidays | Four festivals, three contests, concerts, snow |
| Self-expression | Pixel patterns, a village chime you compose, furniture sets, outfits, hair |

**Pillars**

1. **The village has a pulse.** It keeps time, remembers and carries on.
2. **Neighbours are the game.** They should be the thing a player tells a friend about.
3. **Small verbs, big satisfaction.** Shake, swing, cast, dig. Each has anticipation, impact, a sound, a sparkle and usually a joke.
4. **Two worlds, one bus.** Home is slow and soft. The City is loud and lit. The ride between them is a threshold you feel.
5. **Nothing is urgent.** No failure, no combat, no game over, no stamina. The debt is a running joke. In Village Time the clock stops while you talk or browse.
6. **Ten feet away.** Big type, few choices on screen, everything within two presses.

**Not in the game:** combat, stamina, terraforming, touch controls, voice or text chat, couch split-screen.

**Originality (hard rules).** TASK.md asks for an original game inspired by the source. Genre and mechanics are fair game. Its names, characters, art, music, maps and look are not.

- No character, name or term from the series: no Nook, Bells, Gyroids, K.K., Resetti, Happy Home Academy, Able Sisters, Stalk Market or turnips.
- No species-for-role copies: no raccoon or tanuki shopkeeper, owl curator, mole scold, dog musician, hedgehog tailors, kappa driver, shih tzu clerk, fox art dealer, poodle stylist, giraffe couturier.
- Neighbours are species the series' villager roster doesn't use (wombat, quokka, moose, platypus…), which also gives the game its own silhouette.
- No melody from the series, no imitation of a recognisable tune. All music is newly composed.
- No copying of its character designs or UI layouts. No rolling-log curved horizon.
- The title is a pun that works by itself, not the source's name with a letter changed; its logo never carries the source's name.
- The source is named only where TASK.md requires it: About/Credits and the catalogue fields.

---

## 2. Engine and packaging: verified recipes

The kit is a WebGPU engine that renders chunky low-poly 3D as pixel art at 480×270. Read the kit's `GUIDE.md` whole and `ASSETS.md` whole; search `API.md` and `LIBRARY.md`. What follows is what those docs don't tell you for *this* game.

### What was tested

| Question | Result [verified] |
|---|---|
| **Browser flags for WebGPU here** | **The engine needs `--use-angle=swiftshader`.** With only `--enable-unsafe-webgpu --enable-features=Vulkan --use-webgpu-adapter=swiftshader`, as TASK.md lists them, it never renders: the device is lost (`Instance dropped in popErrorScope`), `gpuRecoveries` climbs, the frame count sticks, the picture stays blank. Use the kit's own `check.mjs` set: `--enable-unsafe-webgpu --enable-features=Vulkan --use-vulkan=swiftshader --use-angle=swiftshader --use-webgpu-adapter=swiftshader`. |
| One HTML on `file://`, WebGPU on | Works. Boots in 1–2 s on the software GPU. Inline modules avoid the `file://` module ban the guide warns about. |
| Engine byte-identical inside the page | Works, including inside Hub harness iframes: recipe below |
| Packs in one file | `loadPack('packs/<id>.json')` works from `window.__PIXEL_ASSETS__` data URLs |
| Custom character rig | `buildModel` pivots + `compileClips` + `THREE.AnimationMixer` work. `crossFadeTo` blends. `Animator`, `PoseLayers` and `restPoseOf` are **not** exported by the kit; `validateClip`, `renderSheet`, `gaitClip`, `SpringChain`, `Squash` are. |
| `Engine.headless` in Node | Runs a scene with water, grass, weather, packs and custom rigs. 3,600 steps took 54 ms on a small scene. `hud` works there with `canvas: null`. |
| Mixed-case text via `hud.sprite` | Legible at 1080p. 3,000 glyphs a frame changing every frame showed no measurable slowdown. (`hud.text` is uppercase only.) |
| `engine.paused = true` | **The game's `update` stops, so a menu drawn there dies.** `timeScale = 0` keeps `update` running with `dt = 0`. See the pause rule below. |
| Rotating or zooming the iso camera live | `engine.setCamera({...}, { syncUrl: false })` every frame is cheap (31 calls: 3 ms) |
| Wheel for tools instead of zoom | `minZoom === maxZoom` locks the engine's wheel and +/− zoom; `input.wheel` still reads in `update` |
| Mouse | `input.pointer` tracks hover with no button held; `camera.rayAt` + a ground plane gives the tile |
| Stub DualSense | `input.gamepadButtons` with custom codes works; `isDown('PadCross')` true, `input.snapshot()` shows it |
| See-through occluders | Swapping a mesh to a shared `toonMaterial(c, { dissolve: true })` with `.dissolve = 0.55` works |
| `applySky` every frame, `Mirror`, `RenderView` | No errors, no GPU errors |
| Music at 10% | Tracks summing to about 1.0 volume: −34 dBFS RMS at 10%, peak 0.91 at 100% (no clipping). The engine recipes' 0.12 + 0.05 volumes would be far too quiet at 10%. |
| AI Hub harness, shared world, own card, on the engine | All scenarios pass: 2 players; 4 with `latency=150&jitter=50&loss=5`; `scenario=host-leave`; `scenario=server` |
| Serverless WebRTC between two pages on `file://` | Works with `iceServers: []`, even across browser contexts; invite code about 600 characters after deflate + base64. BroadcastChannel works only within one browser context. |
| Touch profiles (Chromium, Pixel 7, iPad Pro 11) | `touch: false` gives no controls; `settings: { button: 'top-right' }` shows ⚙ and a tap opens the panel |
| Portrait with the default aspect | Art width collapses to 132 px. Use `aspect: 'fixed'`. |
| `python3 -m http.server 0` through a pipe | Prints nothing until flushed, so a script waiting for the port hangs. Use `python3 -u`. |

### Layout and packaging

```
kit/                the engine kit as downloaded, unmodified (check.mjs, docs, packs/)
vendor/session.js   lib/hub/session.js, unmodified
src/pixel-engine.js byte-for-byte copy of kit/pixel-engine.js
src/engine.js       export * from './pixel-engine.js';   every module imports from here
src/main.js         page entry
tools/build.mjs     writes the single HTML your TASK.md names
```

`tools/build.mjs` runs `esbuild src/main.js --bundle --format=esm --target=esnext --external:./pixel-engine.js`, escapes `</script` in the result, and writes:

```html
<!doctype html><html lang="en"><head><meta charset="utf-8">
<script>/* vendor/session.js, unmodified: the first script, right after meta charset */</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="hub:session" content="1"> <!-- and the other hub tags, section 19 -->
<title>…</title>
<style>html,body{margin:0;height:100%;background:#1a1c2c}#app{position:fixed;inset:0}</style>
<script>window.__PIXEL_ASSETS__={'packs/kenney-furniture.json':'data:application/json;base64,…','packs/kenney-nature.json':'…'};</script>
<script id="pixel-engine-src" type="text/plain">/* kit/pixel-engine.js, byte for byte (it contains no </script) */</script>
<script>(function(){var u=URL.createObjectURL(new Blob([document.getElementById('pixel-engine-src').textContent],{type:'text/javascript'}));var m=document.createElement('script');m.type='importmap';m.textContent=JSON.stringify({imports:{'./pixel-engine.js':u}});document.head.appendChild(m);})();</script>
</head><body><div id="app"></div><script type="module">/* the esbuild bundle */</script></body></html>
```

This keeps the engine exactly as it ships, as TASK.md and the guide require: a test asserts its text appears unchanged in the page. Everything is inline, with no network at runtime. With both packs the page is about 8 MB before your game's code; trimming packs to the models you name is optional. In Node, and if you serve `src/` during development, `./pixel-engine.js` resolves natively.

### Engine start

```js
const touchOnly = navigator.maxTouchPoints > 0 && !matchMedia('(any-pointer: fine)').matches;
Engine.start(game, withUrlOptions({
  container: document.getElementById('app'),
  aspect: 'fixed',            // always 480×270: every screen is laid out once
  quality: 'high',            // 16 pooled lights (session rounds: 'medium')
  camera: { preset: 'iso', yaw: 45, pitch: 35, zoom: 1.6, minZoom: 1.6, maxZoom: 1.6 },
  settings: { button: touchOnly ? 'top-right' : false, key: 'your-game-key' },
  touch: false, touchBar: false, background: PALETTE.ink,
}));
```

Zoom 1.6 gives 32 art pixels a metre, about 15 m across and 15 m of ground depth. To turn or zoom, tween with `engine.setCamera({ preset:'iso', yaw, pitch:35, zoom:z, minZoom:z, maxZoom:z }, { syncUrl:false })`. Keep movement camera-relative with `ctx.camera.groundBasis()`, so all four turns play the same. Catch a failed start and show a plain full-page message naming the browsers that have WebGPU; in a session call `AIHub.fail(message)` instead.

### Rules this game must follow

- **One `Game` object, one scene, no `loadGame`.** The town, City and interiors are `Group`s at far-apart offsets (town at origin, City at x = 500, interiors from x = 1000), shown one at a time. Doors become `await engine.screen.cover('iris', { center })`, move, `reveal`. Transitions are instant, neighbours keep living while you're indoors, and one recording covers the whole game (a level unload would split replays).
- **Pause rule.** Never set `engine.paused` or `timeScale = 0` for menus or dialogue. Keep an own `world.frozen` flag that skips simulation; `update` keeps running, so UI animates and water keeps moving.
- **Movement is our own tile collision**, not Rapier: circle against tile grid plus building rectangles, height from a pure `groundHeight(x, z)`. It's deterministic, fast headless, and trivial to run for four players on a Hub host. Rapier sits idle except for any toy you add.
- **Gameplay in `fixedUpdate`, presentation in `update`, randomness from `ctx.random` forks, page data through `ctx.input.send`** (guide rule 4): save loads, real-clock readings, typed characters.
- **Guard `document`, `localStorage`, `drawSheet`** so the game imports in Node. `src/core/storage.js` falls back to memory.

### Input

```js
input.gamepadButtons = { 0:'PadCross',1:'PadCircle',2:'PadSquare',3:'PadTriangle',4:'PadL1',5:'PadR1',6:'PadL2',7:'PadR2',8:'PadCreate',9:'PadOptions',10:'PadL3',11:'PadR3',12:'PadUp',13:'PadDown',14:'PadLeft',15:'PadRight',16:'PadPS',17:'PadTouch' };
```

The default map presses platformer keys (0 is Space), so replace it. `input.moveAxis()` merges left stick and WASD/arrows. Right stick arrives as `input.mouseDelta`, readable only inside `update` (it resets at frame end). Add `Tab` and any function keys to `input.preventKeys`. For typed text, add your own `keydown` listener and `input.send({ t: 'key', key: e.key })`.

**Last device:** pad when any `Pad*` code is held or pressed or a stick is tilted; keyboard/mouse when another key is pressed or `input.pointer` moved. **Any input** (attract, idle) is the same test.

### Text and UI

Write your own bitmap font as data, drawn glyph by glyph with `hud.sprite(x, y, rows, { '#': color }, { shadow: false })`: 5×7 caps, lowercase with 2-pixel descenders, proportional, 1 px tracking, 12 px line height. `ink` on a `white` panel with `sand` trim is verified legible at 1080p (cap height 28 screen pixels: the smallest text allowed anywhere).

### Models and rigs

```js
const RIG = { joints:['Pelvis','Torso','Head','ArmR','ArmL','LegR','LegL'], root:'Pelvis',
  mirror:{ArmR:'ArmL',ArmL:'ArmR',LegR:'LegL',LegL:'LegR'}, soles:[], trace:[], limits:{}, fps:30 };
// in model(): nest { group:[...], at:[x,y,z], pivot:true, name:'Head' } for each joint, Pelvis outermost
const obj = buildModel(def, { catalog }).object;
const clips = compileClips(CLIP_DEFS, RIG, obj);
const mixer = new THREE.AnimationMixer(obj);        // mixer.update(dt) in update()
mixer.clipAction(clips.find(c => c.name === 'Walk')).play();
```

Every critter has all seven joints, even if a snail's legs are empty groups, so every clip validates against every rig. Add extras (`Neck`, `Tail`) by turning them in code after `mixer.update`. Faces are small parts you scale or hide from code (blink, smile, talk). Hair and hats attach to the `Head` group.

**Colours.** `model()` slots take only the 16 palette names. To use an off-palette accent, swap after the build: traverse, and where `mesh.material.color` matches a slot colour, assign `toonMaterial(0xf5a6c0)` [verified]. Allow at most four off-palette colours in the whole game (blossom pink is one). The same swap puts a pattern texture on a shirt: `toonMaterial(PALETTE.white, { map })`.

**Library notes.**
- `kenney-furniture` is near real size (bed 1.14×0.75×2.25 m, sofa 1.96×0.92×0.82 m); its `plant-small*` are tiny, so scale them. Slots: `wood metal metalLight metalDark carpet carpetDarker lamp plant`. Its defaults are nearly all orange and sand, so **recolour every set through `palette`**.
- `kenney-nature` has `dirt grass stone` slots. Its orange trunks look wrong: remap them, or write your own trees (recommended, for seasons and fruit).

### Surfaces

The ground is most of the screen and decides whether characters read. **The library's `meadow`, `flagstones` and `snow-drifts` are too noisy at this zoom** [verified by render]. Write quiet ones: a flat base plus sparse specks.

```js
const full = c => ({ path: 'M0 0H32V32H0Z', fill: c });   // without a base layer the gaps render BLACK
export const lawn = textureDef({ id:'lawn', about:'Quiet lawn', tags:['surface'], size:[32,32], tile:true,
  palette:{ a:'green', b:'lime' }, layers:[ full('a'), { pattern:'scatter', colors:['b'], count:9, size:1, seed:4 } ] });
TEXTURE_LIBRARY.add(lawn);
```

Rendered and approved: summer `green`+`lime`; spring `lime`+`green`+`white`; winter `white`+`mist`. **Autumn grass and paths must differ:** sand grass needs an orange path; winter paths are `mist`.

### Occluders

Every frame, test the camera-to-player line against the bounding boxes of trees and buildings. Swap hits to shared dissolve materials (a small cache per colour, `.dissolve = 0.55`), and swap back with a little hysteresis. Don't clone per object.

---

## 3. Time, calendar, weather

**Two clocks,** chosen on the first run and changeable in Settings:

- **Village Time (default).** 1 game minute = 0.8 real seconds, so a full day takes about 19 minutes. The clock stops during dialogue, menus and shop screens. Day One runs at half speed until the errands are done.
- **Real Clock.** The device's time and date, like the source. Season from month (Mar–May spring, Jun–Aug summer, Sep–Nov autumn, Dec–Feb winter); Sunday is Market Day, Saturday is Show Day, other days are Errand Days; the contest falls on the second Wednesday of the season's middle month, the festival on its last Saturday. Story beats follow days played, not dates. Readings arrive through `input.send`.

**Calendar.** Four seasons of four days each, sixteen days a year: **Market Day, Errand Day, Show Day, Festival Day**. New day at 05:00. The HUD reads "Spring · Market Day · 9:42 AM". After Day 16 the year rolls over with the same calendar.

**Bed** saves and offers: *Sleep till morning · Nap till noon · Nap till dusk · Hibernate until the next festival* (with a scolding from Mrs. Gander). Hibernate lets anyone reach every season without dev mode.

**Season change** happens overnight behind a full-screen almanac page turning, with a title card and a sting. Reskin ground, canopies and props under cover (filter changes rebuild the pipeline once, so hide that too).

| Season | Ground | Trees | Air |
|---|---|---|---|
| Spring | lime, white specks | blossom pink, then lime | petals, showers, rainbow after rain |
| Summer | green | deep green | fireflies, cicadas, thunder evenings (`screen.flash` + rumble) |
| Autumn | sand, orange specks | orange, red, sand | blowing leaves, mushrooms, ground fog (`groundFog`) |
| Winter | white, snow footprints (`Decals`) | bare or snow-capped | `Precipitation('snow')`, frosted windows, snowballs |

**Weather** is seeded per day with an hourly start and stop: spring sun 60 / rain 30 / fog 10; summer sun 70 / rain 20 / storm 10; autumn sun 50 / wind 30 / rain 20; winter snow 60 / clear 40. Rain waters flowers, wakes snails, fills puddles, brings out umbrellas, and switches the music variant.

**Day and night.** `applySky(engine, skyAt(hour))` each game minute. `skyAt(h).night` drives windows (glow parts on at 0.35), lamp lights (`ctx.lights`), fireflies, stars.

**Absence** (both clocks, using a real timestamp kept in the save). After a real day or more away: +3 weeds per day (cap 40), 1–3 **dust bunnies** per day in your home (tiny, cowardly, net or stomp them, cap 8), mail piling up, and a first-talk line from each neighbour ("Oh. You're alive. Dorrit owes me a pie."). Flowers wilt but don't die. Nothing is lost.

---

## 4. The village

An 80×64-tile map (1 tile = 1 m), five acres by four, each 16×16, authored as rows of characters in `src/data/townMap.js`. Tests flood-fill it: every door, stop and activity must be reachable. Fronts and doors face south or east, so the default camera sees them. North is cliff and waterfall; south is the sea. The map is original: don't reproduce any source town.

| | Col 1 | Col 2 | Col 3 | Col 4 | Col 5 |
|---|---|---|---|---|---|
| **A** (upper terrace, +2 m) | Pine wood | **Museum** | Waterfall and pool | Pear orchard, ramp | **Lookout** bench (stargazing) |
| **B** | **Bus stop**, road out | Dorrit, Tavi, Nib; ramp up | River, north bridge | Bartleby, Ottoline; ramp up | Mossy wood, Rocco |
| **C** | **Town Hall & Post** | **Plaza**: Old Pear tree, Old Bell, notice board, benches | River bend, south bridge, pond | **Mrs. Gander's store**, **Mothwick's** | **Your plot**, Ozzie, Yolanda |
| **D** (beach) | Tide pools | Dock | River mouth | Lighthouse | Palm grove, driftwood |

- **Hide the map's edges on all four camera turns:** a deep forest ring outside the walkable area on three sides, sea to the south.
- **Terrain:** 16×16 chunks of merged meshes, one per surface, rebuilt when a tile changes. Cliff faces are textured boxes. One big `WaterSurface` under terrain with holes where water tiles are (`foamAt` high, so foam stays rare).
- **Worn paths:** tiles walked often turn to path and heal slowly. The village shapes itself to you.
- **Wind:** `swayObject` on canopies and grasses with one shared `WindUniforms`.
- **Starting population:** about 55 trees, 6 rocks, flowers around homes, driftwood, shells, clothesline, chimneys that smoke.

---

## 5. You: avatar, movement, tools

**Avatar.** A small round person of no particular species, and a running joke ("What *are* you? No, don't tell me."). About 1.5 m to the crown, head about 55% of height: the proportions verified as readable at zoom 1.6. Eyes (6), hair (8) in colours (8), outfit, hat. Set by the bus conversation (section 13), then changed at the salon and mirror.

**Movement.** Tiptoe 1.2 m/s (light tilt or Ctrl), walk 2.6, jog 4.2 (full tilt or plain WASD), run 6.0 (hold Circle/Shift). Running wears paths, spooks bugs and tramples flowers. Quick turns, squash on stopping, dust at speed. Pressing the tool button with empty hands gets a once-per-session gag: *"You can't jump. You're in escrow."*

**Targeting.** The target is the interactable within 1.2 m in a 70° cone, else the tile under `position + facing × 0.9`. A bouncing pixel chevron marks it; a chunky highlight marks the tile; a context prompt shows in the corner. With a mouse, hover drives all of this instead.

**Tools** (equipped one at a time; L1/R1, wheel or 1–6):

| Tool | Use |
|---|---|
| Net | Press to ready (holds pose, slows you), release to sweep: 1.8 m reach, 90° cone |
| Rod | Cast at water; press again to reel (section 6) |
| Shovel | Dig, refill, bury, hit rocks |
| Axe | Three hits fell a tree; shovel removes the stump |
| Watering can | Waters the target tile and its neighbours |
| Slingshot | Shoots balloons; pad auto-aims the nearest ahead, mouse aims |

**Bare-hand verbs:** talk, pick up, shake a tree, pull a weed, pick a flower, knock, sit, read, push a snowball. **Pockets:** 15 slots.

**Reveal.** A first catch or find plays the hold-up pose, a jingle and its line ("You caught a pike! Someone should tell it about the other end of the hook."). Repeats are quick.

---

## 6. Things to do

**Fishing.** Shadows (S, M, L, XL) drift in water tiles (3 per water acre). Cast lands a bobber; a nearby shadow turns and comes. **1–3 false nibbles** (small dip, plip, faint rumble), then the **bite**: hard plunge, splash, "!", strong rumble. Reel window 0.6 s; miss and it flees. No other penalty.

**Bugs.** About 1.5 per acre, by season, hour, weather and spot. Spook radius: run 3 m, jog 2, walk 1.2, tiptoe 0.5. Some sit on trunks, flowers, lamps or rocks. Hitting a rock can release a pill bug.

| Fish (floor 14 → target 18) | Beans | Where | When | Line |
|---|---|---|---|---|
| Minnow | 60 | river | not winter | "That's… that's all of it." |
| Perch | 150 | river | all, day | "It was just sitting there. On purpose." |
| Crawfish | 200 | pond | spring, summer | "It has opinions about your thumbs." |
| Carp | 300 | pond | all | "Carp diem! …Sorry. It made me say that." |
| Trout | 400 | river | spring, autumn | "It isn't pouting. That's just its face." |
| Catfish | 800 | pond | summer, autumn, night | "It claims to be a different catfish online." |
| Pike | 900 | river | autumn, winter | "Someone should tell it about the other end of the hook." |
| Eel | 1,200 | river | summer, autumn, dusk on | "Slippery. Also, it knows what you did." |
| Salmon | 1,500 | river mouth | autumn | "It came all this way and now look." |
| Golden Carp | 5,000 | pond | spring, dawn, rare | "It looks expensive and it knows." |
| Sturgeon | 6,000 | river mouth | winter, rare | "Older than the Mayor. Slightly faster." |
| Sardine | 100 | sea | all | "Comes with its own sense of confinement." |
| Mackerel | 250 | sea | summer, autumn | "Holy it." |
| Sea Bream | 500 | sea | spring, summer | "Very calm. Suspiciously calm." |
| Flounder | 700 | sea | all | "Both eyes on you. Literally." |
| Pufferfish | 1,800 | sea | summer, dusk on | "It's taking this very personally." |
| Moonfish | 4,000 | sea | summer, autumn, late, rare | "It's bigger than your whole debt. Almost." |
| Old Boot | 10 | anywhere | any (not for the museum) | "Somewhere, a fish is walking funny." |

| Bug (floor 14 → target 18) | Beans | Where | When | Line |
|---|---|---|---|---|
| Cabbage Butterfly | 90 | flowers | spring, summer, day | "It's very sorry about the cabbage." |
| Pill Bug | 100 | under rocks | all | "It has rolled up and refused to comment." |
| Ladybird | 120 | flowers | spring | "It came for the aphids and stayed for the drama." |
| Pond Skater | 130 | water | summer | "Technically walking on water. Not technically impressed." |
| Cricket | 130 | grass | autumn, night | "It was just getting to the good part." |
| Moth | 150 | lamps | all, night | "It has found the lamp. It has found its purpose." |
| Grasshopper | 160 | grass | summer, autumn | "It didn't save anything for winter either." |
| Dragonfly | 180 | near water | summer, autumn | "Four wings and still somehow caught." |
| Bumblebee | 200 | flowers | spring, summer | "It's too busy for this, and it says so." |
| Snail | 200 | rocks, rain only | spring, summer | "Not the Mayor. Probably." |
| Cicada | 250 | trunks | summer, day | "Seventeen years underground for this." |
| Swallowtail | 300 | flowers | summer, day | "Fancy. It wants you to know that." |
| Firefly | 300 | by water | summer, night | "Dimmer up close. Aren't we all." |
| Woolly Bear | 350 | trunks | autumn | "Yolanda wants to know where it got that sweater." |
| Praying Mantis | 400 | flowers | summer, autumn | "It isn't praying. It's negotiating." |
| Snow Flea | 600 | snow | winter, midday | "Technically a bug. Emotionally, a snowflake." |
| Stag Beetle | 2,000 | trunks | summer, night, rare | "It has been waiting for someone to try that." |
| Rhino Beetle | 2,500 | trunks | summer, late, rare | "You're not sure who caught whom." |

**Digging.** Three star-shaped cracks a day (`Decals` `crack`) hide fossils; a sparkle spot hides a bag of beans. Bags can be **buried and grown into a beanstalk** in 2 days, tripling them ("Beans are currency, dear. You can't plant them." "You can absolutely plant them. You didn't hear it from me."). One rock a day pays out when struck.

**Trees.** Shake to drop what's in the canopy: pears (100 beans, regrow in 2 days), one tree a day has a bag or furniture, one has a wasp nest. Wasps chase you; a sting means a puffy-eye face until medicine or morning, and neighbours comment. Foreign fruit (500) comes from Gran's letters and can be planted. Saplings take 3 days, with a visual stage each day.

**Flowers.** Four species, 3–5 colours. Plant, water, and hybrids appear beside touching same-species pairs that were watered (15% a night). Unwatered flowers wilt in 2 days. **Weeds:** 3 a day; pull by hand; neighbours notice.

**Balloons.** Three a day drift over with a present on a string. Slingshot it; it falls somewhere awkward.

**Beachcombing.** Six new shells a day, 15–300 beans, plus driftwood oddities.

**Stargazing.** Sit on the Lookout bench at night: the camera glides up (`fixed` preset, `Timeline`) to a star field with six original constellations you can name in the Almanac ("The Overdue Library Book", "The Big Spoon"). Press on a **shooting star** to wish; a present arrives in the morning.

**Snow.** In winter, push a snowball and it grows. Stack two (body, head) near each other: a snowman appears, comments on the proportions, and mails a gift if they were good.

---

## 7. Money

**Beans** are the currency. Plenty of jokes: a hill of beans, spilling them, the bean counter.

**Debt.** Mrs. Gander's terms, payable at the store, never enforced, never forgotten.

| Home tier | Added debt | Result |
|---|---|---|
| 1 Starter shack | 8,000 | One 6×6 room |
| 2 Proper cottage | 30,000 | One 8×8 room |
| 3 Cottage with annex | 80,000 | Plus a 6×6 side room |
| 4 Two storeys | 150,000 | Plus an 8×8 upstairs, and a plaque |

Finishing tier 4 earns a gold-edged deed and Mrs. Gander's first compliment, which she immediately regrets. A diligent player clears tier 4 around Day 16 (expected income: 1–3k on Day 1, about 15k a day by midgame). Paint jobs (roof and wall colours) cost extra.

**Store.** Mrs. Gander's, three tiers by lifetime spend (25k, 120k), with a new exterior each. Daily rotating stock is shown **as real objects on real shelves**: walk up, press to get price and yes/no. To sell, talk to her: your Pockets open and she quotes as you browse, no table. Stock: 2 furniture, 2 clothes, 1 wallpaper, 1 floor, tools, seeds, stationery, "today's oddity". Hours 8:00–22:00.

**Cheese market** (our own speculative game). **Old Rind**, a whispering stoat, sells cheese wheels at the plaza on Market Day mornings (06:00–12:00) for 90–110 beans. Prices change at 08:00 and 14:00 on the next three days; pattern per season: Rising, Falling, Wobble or Spike (peak 3–6×), shown on the notice board. Wheels go bad at the next Market Day (then worth 1 bean, with a visible smell). Sell at the store.

**Bean Jar** (Town Hall). Deposit and withdraw; 0.5% interest per season ("We are very interested."). **Lost & Found** bin: leave things, find things. **Catalogue:** everything you've owned can be reordered at Post on big one-item cards; it arrives by mail next day. **Selling a gift a neighbour gave you** works, and they will hear about it.

---

## 8. Home

- **Interior:** a dollhouse cutaway with two back walls, one iso camera, no turns [look verified]. Grid 1 m; items 1×1, 2×1, 2×2.
- **Placement mode:** ✕ lifts or drops, L1/R1 rotates, mouse drags. Wallpaper and floor apply from Pockets. Items can't block the door.
- **Interactive furniture (must work):** bed; chairs and sofas you sit on; lamps on/off (real pooled lights); **stereo** plays your collected tunes; **TV** shows a live feed of the plaza (`RenderView`, attached only while you're home); **mirror** really reflects (`Mirror`) and opens the wardrobe; fish tank and bug cage show what you put in; clock; toilet flushes pointlessly.
- **Furniture:** floor 40 → target 60, in sets: Cottage, Mossy, Seaside, City Loft, Bureau, and the absurd Cheese set, plus singles. Most are `kenney-furniture` recoloured through `palette`; the signature pieces are your own models.
- **Exterior:** one model per tier, mailbox with a flag up when there's mail.

**Better Burrows Bureau rating** (section 11). Scored on Show Day nights, result by mail: points for item value, set bonuses (4+ matching), colour harmony, "cozy rules" (lamp by a seat, rug under a table, something growing), music playing, minus clutter. Grades C, B, A, S with a sentence of critique: *"Too many chairs. Who are you expecting?"* Reward furniture at each new grade.

---

## 9. Neighbours

| Name | Species | Type | Tic | Home | Loves / hates |
|---|---|---|---|---|---|
| **Dorrit** | wombat | Hearth | "…mmhm" | Kitchen, too many pots | soup, rain / loud hats |
| **Tavi** | quokka | Sunshine | "isn't it?!" | Everything yellow | everyone / nothing (it's worrying) |
| **Bartleby** | moose | Grouch | "I'd prefer not." | Bare room, one good chair; laundry stuck on his antlers | quiet, pine / being asked |
| **Lady Ottoline** | platypus | Diva | "darling dear" | Faded grandeur, moth-eaten rug | pearls, flattery / mud (she lives in mud) |
| **Rocco** | armadillo | Go-Getter | "let's roll!" | Gym, trophies he awarded himself | protein, fish / stairs |
| **Nib** | lemur | Dreamer | "…or so the moon says" | Books, telescope, loose paper | stars, bugs / alarms |
| **Ozzie** | possum | Schemer | "You didn't hear it from me." | Corkboard and red string; plays dead when surprised | cheese, boxes / Mrs. Gander |
| **Yolanda** | yak | Auntie | "hon" | Everything knitted, including the TV | gossip, wool / secrets she wasn't told |
| **Fitch** (moves in, Day 9) | ferret | Hustler | "no refunds" | Half-unpacked boxes | deals / questions |

**Relationships.** Tavi keeps waving at Bartleby. Ozzie suspects Mrs. Gander of everything. Ottoline and Yolanda are locked in a feud about a scarf. Dorrit feeds everyone. Rocco is training Nib against Nib's will. Lines reference these.

**Routines.** Wake and sleep by type. Daily points of interest: plaza benches, riverbank (they fish, badly), store, museum, each other's doors. Rain: umbrellas or indoors. Night: home, window lit; knock after bedtime and get a sleepy complaint. Paths come from `NavGrid`. Two neighbours chat with bubbles; walk within 2 m to read a piece of it. They hum, sit, stare at bugs, carry things.

**Friendship** 0–100 (stranger, acquaintance, friend, best friend). First talk of the day +3, favour +5–10, gift +2–10 by taste, good letter +3. Hitting someone with the net −2 (it does happen, they do comment).

**Memory** is what sells it. Keep `memory` events: gifts, catches, sales, outfits, net bonks, absences. Lines pull from them: *"Heard you sold the scarf Yolanda knitted you. To the goose. She's not mad. She's knitting about it."*

**Favours.** Two a day, marked with a "!" over their head: fetch a named item, deliver a parcel, catch something within an hour, return a lost thing, trade. Floor 12 → target 20 templates, flavoured per type.

**Letters.** Mail arrives at 09:00: neighbour letters (with presents, per friendship), Gran's passive-aggressive note each season with a foreign fruit or something inexplicable, museum thanks, Bureau results, catalogue orders, the occasional anonymous tip from Ozzie. You write letters at Post, on paper, with an attached gift, using the on-screen keyboard or typing. Replies next day react to what you wrote: their name present, length, gift. *"You wrote 'asdfgh'. I framed it."*

**Move-out and move-in.** A complete bittersweet beat: Rocco talks about leaving on Day 7 (you may argue, and it changes his goodbye), boxes appear, he's gone on Day 9 with a goodbye letter and, if a best friend, his favourite trophy. Fitch moves into his house that same morning. Rocco writes later and rolls back to visit on the last night. Dev mode can trigger any move.

---

## 10. Town services

| Place | Who | What |
|---|---|---|
| **Store** | Mrs. Gander (goose, spectacles, waistcoat, ledger) | Section 7 |
| **Town Hall & Post** | Clementine (capybara, unflappable, a bee lives on her head and she consults it) | Bean Jar, Lost & Found, mail, catalogue, town rating, **Village Chime** editor |
| **Plaza** | Mayor Trundle (snail with sash) | He has been crossing the plaza to cut a ribbon since before you came, and visibly advances each day. He arrives on Festival Day of spring. |
| **Museum** | Dr. Quill (near-sighted pangolin who rolls into a ball when overjoyed) | Section below |
| **Mothwick's** | Madame Mothwick (dramatic moth, nibbles hems when nervous) | Clothes, hats, **pattern studio** |

**Museum.** A hall and four wings you walk through, each donation appearing at once in place:

- **Aquarium** with real tanks and swimming fish, **Insectarium** with live flutter.
- **Fossil Hall:** two original composite skeletons (Moatosaur: skull, torso, tail; Long-Necked Regretodon: skull, neck, torso) plus singles (trilobite, ammonite, amber fly, mystery tooth): 10 pieces.
- **Gallery:** 8 parody paintings of public-domain works: *Mona Llama, Goose with a Pearl Earring, The Great Wave Off Beans, The Starry Bus Stop, The Birth of Venus Flytrap, The Honk, Whistler's Moose, The Cheese of Earthly Delights.*

Dr. Quill misidentifies everything first ("A fossil! Or a very confident potato!") and appraises unidentified fossils. Filling a wing earns a plaque with your name, misspelled.

**Village Chime.** Sixteen steps on a chunky note pad, played on the Old Bell every hour, at doors, and at the finale. A player's first act of authorship; the Hall asks for it on Day 3. Also used as the store door jingle.

**Clothes and patterns.**
- Clothes floor 20 → target 30 (palette plus simple textures), hats 8 → 12, glasses 3 → 6, umbrellas 3 → 6.
- **Pattern studio:** a 16×16 pixel editor with the 16 palette colours, 8 save slots, pen, fill, mirror, undo, playable by pad or mouse with a big grid and live preview on your avatar.
- Patterns go on shirts, umbrellas, signs and ground tiles, and on your **festival firework**. Stored as texture data, shown with `DataTexture` + `pixelTexture` + `toonMaterial(white, { map })`.

**Town rating.** Clementine gives one honest sentence and one hint (trees 40–70, flowers, weeds, litter). A high rating on the last night turns the Old Bell gold.

---

## 11. The City

**The bus.** Press ✕ at the stop; it arrives in seconds, and the ride is a 20-second skippable scene (the bus rocking through a seasonal countryside diorama). **Hester**, a llama driver, sings a ballad about your recent life in gibberish with subtitles, made from memory events: *"♪ Oh, you fished up an old boot and you sold it for ten, / and you'd do it, you'd do it, you'd do it again… ♪"* Floor 20 verse templates, plus choruses. The fare is listening.

**The place.** An L-shaped boulevard around a plaza, about 40×24 tiles, in its own Group. **Day:** bright, busy. **Night:** the signature look: dark street, bright glass, neon. Use `glow` parts, real colored pooled lights at each front, and a whole-scene `bloom` filter. **Bloom's default strength blows out characters and glass; `{ id: 'bloom', params: { amount: 0.3 } }` in the look's `scene` stack keeps them readable** [verified by render]. City nights only, swapped under a transition. Signs are 3D: letters built from your bitmap font as small `glow` boxes (about 0.08 m per pixel), so they read as neon.

**Crowd.** 12–18 pedestrians of assorted species built from the critter generator, walking the boulevard with short overheard lines; a street musician; pigeons (`Boids`) that scatter when you run. Crowd murmur is low-volume gibberish.

**Venues** (each one room, each with its own music and at least one interaction that isn't a menu; open from your first visit, Magda's only after dark):

| Venue | Host | What makes it fun |
|---|---|---|
| **Snip & Gossip** (salon) | Monsieur Fleece, an alpaca with magnificent hair | Live preview of hair and colour on your avatar on a turntable; he tells you one piece of gossip per cut |
| **Maison Plume** (couture) | Flavia Rosé, a flamingo behind a velvet rope | **Fashion check:** a daily theme ("Something damp"); your outfit's tags are judged aloud, 0–5 plumes; plumes unlock the couture rail |
| **Magda's Genuine Articles** (after dark, down an alley) | Magda, a magpie | Three paintings a visit at a premium, some forged. Compare with the catalogue print (a missing star, an extra earring). Forgeries get a very disappointed Dr. Quill. Rare furniture too. "One hundred percent genuine, and only forty percent stolen." |
| **The Palace Theatre** (evenings) | Sir Reginald Bellows, a hippo thespian | A short sketch per visit; press Laugh on the punchline to learn an **emote** (8 in all: laugh, cry, shock, anger, love, shrug, bow, dance) |
| **Pemberton's Auction Rooms** (10:00–18:00) | Pemberton, a dormouse who speaks at double speed | Three lots. Raise your paddle against three AI bidders with hidden limits and a "going once…" clock. You can also consign an item; the result arrives by mail |
| **Better Burrows Bureau** | Agent Brisket, a badger | Explains home scoring, critiques your home in person, gives grade rewards |
| **The Daily Grind** (café) | Languid Lou, a sloth who barely speaks | Three blends: a coffee gives a jog-speed buff until noon, and Lou's three words of the day hint at a rare catch |
| **Madame Nibbles' tent** (plaza) | a goat who eats her tarot cards mid-reading | A daily fortune with half of it chewed off: *"I see a tall stranger. He's holding… (chew) …that part's gone now. Good luck, though."* It nudges luck (fish, finds, friendship) until morning |

---

## 12. The year

| Day | Season, type | What happens |
|---|---|---|
| 1 | Spring, Market | Arrival, errands, tools (section 13) |
| 2 | Spring, Errand | Museum opens with your fossil; Axe and Slingshot go on sale at the store; first City trip |
| 3 | Spring, Show | Compose the Chime; Vesper plays at 20:00 |
| 4 | Spring, **Festival** | **The Seed Toss**; the Mayor arrives |
| 5 | Summer, Market | Season turn; Old Rind's cheese |
| 6 | Summer, Errand | **Fishing Derby** |
| 7 | Summer, Show | Rocco talks about leaving; Vesper |
| 8 | Summer, **Festival** | **The Lantern Float** |
| 9 | Autumn, Market | Rocco leaves; Fitch moves in |
| 10 | Autumn, Errand | **Bug-Off**; mushrooms in the woods |
| 11 | Autumn, Show | Vesper; soup ingredients start to matter |
| 12 | Autumn, **Festival** | **The Great Soup** |
| 13 | Winter, Market | First snow |
| 14 | Winter, Errand | **Snowman Contest** |
| 15 | Winter, Show | A letter from Rocco; Vesper |
| 16 | Winter, **Festival** | **The Long Night**, year-end, credits |

**Show nights.** **Vesper**, a fruit bat, plays tiny accordion hanging upside down from a plaza lamp post ("That's how the notes fall out."). Ask for a mood; she plays one of 6 songs, sings in gibberish, and gives you the record for your stereo. Neighbours gather and sway.

**Festivals** (each a full-village set piece with decorations and its own music):

- **The Seed Toss (spring).** Everyone flings seeds at chalked rings for 90 seconds. Flowers burst from every hit; the town blooms the next morning in the pattern you sowed. The Mayor finally reaches the ribbon, and it's gone.
- **The Lantern Float (summer).** At dusk, pick a lantern colour and a one-line wish, set it on the river at the bridge, and watch hundreds of lights drift to the sea. Fireworks over the beach at 21:00, **including one in your own pattern**. Your wish gets a reply by letter.
- **The Great Soup (autumn).** Dorrit's giant pot on the plaza. Add three ingredients: fish, fruit, mushroom, boot. It's rated from their tags, with neighbours tasting aloud. Good soup means a feast and a reward; bad soup means a village of queasy faces and a gag-gift next day.
- **The Long Night (winter).** The sun sets at 16:00. Carry a string of lights to each door, exchange a gift, then gather at the Old Pear at midnight as it lights up and the Bell plays your Chime, harmonised. Rocco rolls in. Clementine reads the town rating, and at a high rating the Bell turns gold. An almanac of your year (biggest catch, most-sold-to, debt status, who you talked to most) leads into credits. Year Two begins next morning with a letter.

**Contests** (timed 3 game hours; neighbours post real scores from the same rules; trophy furniture for placing): Fishing Derby, biggest fish; Bug-Off, most value; Snowman Contest, best proportions, judged by Bartleby, who would prefer not.

---

## 13. Day One

The first 20 minutes teach by errand. Clock at half speed until done.

1. **Title → New Arrival.** Choose Village Time or Real Clock in one line each.
2. **The bus.** Night, rain, Hester. "End of the line? Nobody gets off there on purpose." She asks your name, what the town's called ("I only drive the bus"), then: *What are you running from? Favourite weather? How do you take bad news?* Answers set hair, colours and eyes. A reflection in the bus window lets you adjust the look. "You look like someone who owes money."
3. **The stop.** Mrs. Gander, ledger open: "You're late. No, you're exactly on time. I've already billed you for being late." She walks you to a roofless shack. "The roof is included. The rain is complimentary. The 8,000 beans are not." Apron on: you work it off.
4. **Errand list** (a short HUD list; each takes about 2 minutes and pays off part of the debt):
   - Fetch a parcel from Dorrit (talk, map, soup joke).
   - Pull weeds, sell one at the store (pick up, sell).
   - Tavi gives you a **Net**: catch a butterfly (sneak, swing, reveal).
   - Bartleby has a **Rod** and would prefer not: catch him a fish anyway (cast, bite).
   - Mayor Trundle lends a **Shovel**, already on his way somewhere: dig the crack on the plaza (dig, fossil).
   - **Watering can** from Clementine: water the Mayor's sapling.
   - Write to Gran at Post (letter UI, on-screen keyboard).
5. **Evening.** "You've paid off 2,000 beans. You're free to go. Not that you were ever not free. Legally." Dusk, lit windows, first hourly chime. Bed saves. Gran's reply and a neighbour's letter are in the mailbox next morning.

Every errand demonstrates a verb. Wandering off is fine: the list waits.

---

## 14. Writing bible

**Voice.** Warm, deadpan, gently absurd. Everyone is a bit rude and it's affectionate. Short lines. Jokes land at the end of the sentence. Sincerity is allowed, rarely, and hits harder for it. Capitalism is a fond joke. No irony about the player's feelings. British-or-American spelling: pick one and hold it.

**Samples to match:**

- **Mrs. Gander:** "No rush on the payment, dear. I've simply noted the time you didn't pay, and I'll be noting it again tomorrow." / "HONK. Pardon me. That was my indoor voice."
- **Mayor Trundle:** "I declare this… ribbon… cut. Has anyone… seen… the ribbon? It was here… in March."
- **Clementine:** "Your letter's stamped. A bee has been living in the stamp drawer. We've agreed to share."
- **Dr. Quill:** "Is it a fossil? It's a fossil! Or a very confident potato! Either way, it goes in the hall!"
- **Dorrit:** "You look peaky, mmhm. I made soup. It's Tuesday's. Tuesday was a good day for soup, mmhm."
- **Tavi:** "I smiled at a rock today and I think it's going really well, isn't it?!"
- **Bartleby:** "You're standing in my good spot. No, there isn't another one. They're all my good spot. I'd prefer not."
- **Lady Ottoline:** "I am technically the Duchess of this river, darling dear. Yes, that one. No, don't touch it."
- **Rocco:** "I rolled here! From over there! That's thirty metres of pure cardio, let's roll!"
- **Nib:** "I wrote you a poem. It's about your hat. It ends badly, or so the moon says."
- **Ozzie:** "Have you ever *seen* Mrs. Gander eat? No. Neither has anyone. You didn't hear it from me."
- **Yolanda:** "Hon, I knitted you a thing. Not sure what it is yet. Give it time, hon."
- **Inspector Pimm:** "Pimm. Department of Continuity. You left. No bed. No goodbye. Do you know what that does to a Tuesday?"
- **Vesper:** "Sit anywhere, friend. I'd offer you a chair, but I'm using the ceiling."
- **Flavia Rosé:** "Darling. Stand in better lighting. No. Further. Keep going."
- **Old Rind:** "Psst. Wheel of cheese? It only goes up. Mostly. Until it goes off."

**Volumes** (floor → target, total about 700 → 1,200 lines):

| Bank | Lines |
|---|---|
| Per type: greetings, weather, time of day, season, absent, hungry, gift reactions, favours, letters | 40 → 80 each (8 types) |
| Unique per neighbour | 12 → 30 each |
| Gossip templates | 30 → 60 |
| Mrs. Gander | 30 |
| Each other named host | 15–30 |

**Mechanics.** Lines are data: `{ id, text, when: { season, weather, hour, friendMin, memory }, weight }`, with tags `{player} {town} {item} {neighbour} {catch}`, `|` for a beat, `*word*` for emphasis, and name colours. Choices are 2–4 options. Each line should be seen once before it repeats. Neighbours speak with their tic often but not always.

---

## 15. UI and UX

Controller first, on a TV at 10 feet. Keyboard and mouse get the same screens and should feel native.

| Action | DualSense (Xbox glyph) | Keyboard | Mouse |
|---|---|---|---|
| Move | Left stick: tilt sets tiptoe, walk, jog | WASD or arrows | Left-click ground to walk there; hold to follow the cursor |
| Run | Hold ○ (B) | Hold Shift | |
| Sneak | Light tilt | Hold Ctrl | |
| Talk, open, pick up, shake, confirm | ✕ (A) | E or Enter | Left-click the thing (walks into reach first) |
| Use tool | □ (X) | Space or F | Right-click where you're aiming |
| Back | ○ (B) | Esc or Backspace | Right-click in menus |
| Pockets | △ (Y) | Tab or I | Click its icon |
| Previous, next tool | L1, R1 (LB, RB) | 1–6 | Wheel |
| Turn camera ±90° | L2, R2 (LT, RT) or right-stick flick | Q, R | |
| Zoom step | Right-stick up, down | + − | |
| Map | Touchpad press or D-pad up | M | Click |
| Almanac | D-pad down | J | Click |
| Emotes | D-pad left | G | Click |
| Pause | Options (Menu) | Esc | |

Create stays unused: **Create + Options belongs to the Hub.** Rumble via `vibrationActuator` (bite, dig, thunder) where available.

**Prompts** follow the last device: PlayStation glyphs for controllers (✕ ○ □ △ L1 R1 L2 R2 Options, drawn as pixel sprites), Xbox glyphs (A B X Y LB RB LT RT Menu) with a Settings option, keycaps and mouse-button icons for keyboard and mouse. Corner prompt shows at most three. **Mouse:** a pixel cursor (OS cursor hidden); hover moves focus in menus and highlights things in the world with a name tooltip; click activates.

**HUD.** Date and time top left, beans top right, tool bottom left, context prompt bottom right. It fades after a few idle seconds and returns on change. Safe margins: 12 art pixels on all sides.

**Dialogue.** Bottom panel, three lines, nameplate, typewriter with voice, skip to end then advance on ✕. The camera eases in a little (`setCamera` tween to zoom 2.0). The speaker faces you.

**Screens** (each is a focused single idea; **never a table**, never tiny text, no scrollbars, pages instead, at most 8 focusable things except the grids below):

| Screen | Form |
|---|---|
| Pockets | 5×3 big cells (art ×2), selected item's name and one sentence, actions on press |
| Tool ring | Pops around you while cycling |
| Map | Pixel map, pins, who's where now |
| Almanac | Tabs: Fish, Bugs, Fossils, Art, Stars, Calendar; big silhouettes that fill in |
| Letter | A sheet of paper with big type; on-screen keyboard grid (pad), typing (keyboard) |
| Name entry | Same keyboard, plus △ for a random suggestion |
| Catalogue | One big item card at a time, by category |
| Placement | In-room grid, nothing else on screen |
| Pattern studio | Big 16×16 grid, palette strip, preview |
| Chime | 16 tall chunky columns |
| Emote wheel | Eight wedges |

**Icons.** About 45 category sprites (16×16 rows, recoloured per item: 4 fish shapes, 5 bug shapes, chair, lamp, shirt…). Don't try to author one per item.

**Touch-only devices** (`touchOnly` above, no pad connected): **no touch controls.** The title shows "Controller or keyboard required" and the settings button (⚙). The attract mode still runs after 10 seconds; a tap exits it. A key press or pad press clears the notice and the game plays normally.

**The engine's ⚙ panel's Reset sets music back to 60%** (its default). On touch-only devices, where the panel is reachable, wrap `audio.resetVolumes` on the instance so it restores 10%. Elsewhere, the game's own Settings replaces the panel.

---

## 16. Art direction

**Base style:** the engine's native 3D-as-pixel-art with the default look (`LOOK_PRESETS.none`): toon bands, pixel outlines, Sweetie 16. Rendered comparisons: `none` and `pixel_world` read best, `dream` blooms too much, `cel_cartoon` stops feeling like pixel art. Use `none`.

**Readability rules.** Quiet ground, loud actors. Dark outlines. Chunky shapes (≥ 0.25 m, per the guide). Doors, windows and signs are the most saturated things on a building. Reference proportions [verified]: cottage walls 4.4×2.2×3.6 m with two wedge roofs and a chimney; critters 1.5 m with a 0.9 m head; `lamp-post`, `notice-board`, `park-bench`, `market-stall`, `fountain` from the library work as they are.

**New assets to make (they're what makes it feel like this game):**

- **Critter generator** (`src/art/critter.js`): parts for head shape, ears, antlers, bills, tails, shell, hair, clothes, from one function. All neighbours, hosts and crowd come from it. Each needs a distinct silhouette at 45 px: moose antlers with laundry, platypus bill and tiara, armadillo bands, lemur ringed tail (`SpringChain`), yak hair curtain, snail shell and sash, goose neck and spectacles, bat hanging, hermit crab in a filing cabinet, flamingo legs, alpaca hair.
- **Buildings:** home ×4 tiers, store ×3, Town Hall with Post flag, Museum with columns, Mothwick's with giant spool, 9 cottages (shared shell, personal decoration), bus and shelter, 8 City fronts with neon, City skyline, lighthouse.
- **Nature:** own trees (pear, pine, palm, plus stages) with seasonal palettes and fruit, flowers (4 species), weeds, saplings, beanstalk, Old Pear (huge), Old Bell, river banks, cliffs, ramps, bridges.
- **Items:** tools; fish and bugs (parametric: body, fins, colour; library `butterfly`/`firefly` sprites are fine for flyers); fossils; 8 paintings (pixel `TextureDef`s with a forgery variant); hats; furniture signature pieces; cheese wheel; snowman; lanterns; balloon.

**Life everywhere.** Blinking, tails, smoke, swaying crowns, cloud shadows, birds (`Boids`), fish rings, laundry, butterflies, puddles, petals, leaves, lit windows. If a screen is ever still for 3 seconds, something's missing. Performance is out of scope: add what the scene needs.

**Every sheet goes through** `node check.mjs --sheets` from your kit (exit 0, no problems; warnings fixed unless you mean them). **Look at the PNGs in the game too.**

---

## 17. Animation

**System:** the engine's clip format (`ClipDef` data at 30 fps, full poses, easing, sine layers), compiled with `compileClips` onto the 7-joint rig, played with `THREE.AnimationMixer`, cross-faded with `crossFadeTo`. Plus `Squash` (stop, land, pick up), `SpringChain` (tails, ears, ribbons), code-driven face parts, and head turns applied after the mixer.

**Clips (floor 30):** Idle, IdleBored, Walk, Jog, Run, Tiptoe, Talk, Listen, Nod, ShakeHead, Laugh, Cry, Shock, Anger, Love, Shrug, Bow, Dance, Wave, Sit, Sleep, PlayDead, HoldUp, PickUp, Give, NetReady, NetSweep, Cast, Reel, Dig, Chop, Water, ShakeTree, Slingshot, PushSnow, Eat, Hum, Sway, Sting, Slip, plus species specials: Mayor's slide, Vesper hanging, Pimm's sideways scuttle, Rocco's roll.

**Feel notes.** Net: 3 frames of anticipation then a fast arc. Tree shake: canopy wobble and leaves. Dig: three dirt chunks, then a hole. Bite: bobber snaps under. HoldUp: both arms, item above head, pause. Dialogue: small nods and talk mouth on syllables. `validateClip(clip, RIG)` returns nothing in tests; check `renderSheet` contact sheets for a few key clips.

---

## 18. Audio

Everything is code: no audio files. Music plays through the engine's `Song` sequencer, effects through `SoundDef`s.

**Music volume defaults to 10%.** The engine's default is 60%, stored under `pixel-engine:audio`. On a profile with no stored audio, call `audio.setVolume('music', 0.1)` before any music starts. **Author tracks hot**: make simultaneous track volumes sum to about 1.0 [verified numbers, section 2], or 10% is inaudible. Settings Reset restores 10%. Test it.

**Music** (all new; easygoing, a little jazzy, lots of walking bass; `stepsPerBeat: 3` gives a swing feel):

| Set | Count (floor → target) |
|---|---|
| **Hourly tunes:** every one of the 24 hours has its own arrangement, each with rain and snow variants, built by `composer.js` from hand-written motifs (transposition, tempo, re-voicing) | 8 → 12 motifs |
| Title, credits, bus ride, bed lullaby | 4 |
| Venues: store, museum, Mothwick's, Hall, City day, City night, salon, couture, Magda's, theatre, auction, café, Bureau | 13 |
| Festivals, contests, season stings | 4 + 1 + 4 |
| Vesper's records | 6 |

On the hour: Bell plays the Chime, then the new tune starts. Indoors, the venue's tune replaces it. At home, your stereo. `parseSong` on every song in tests.

**Ambience** with `audio.loop` voices and `spatialize`: river, surf, rain, wind, crickets, birds, City hum, neon buzz.

**Effects** (floor 40): footsteps per surface, each tool, splashes, bite, pick-ups, reveal jingle, UI tick, confirm, cancel, doors, mail flag, bus engine, HONK, paddle, cheese smell, firework.

**Voices: gibberish, Animalese/Simlish style, code only** [method verified]. Each letter of the typed line triggers a very short syllable: a `SoundDef` of stacked sine harmonics whose weights follow vowel formants (a harmonic stack through `layers`), with noise layers for consonants.

```js
function vowel(f0, f1, f2, f3, dur = 0.09) {            // renderSound: peak about 0.8, 5 ms to render
  const amp = h => { const f = f0*h, g = (c,w,a) => a*Math.exp(-((f-c)**2)/(2*w*w)); return g(f1,90,1)+g(f2,120,.6)+g(f3,180,.25); };
  const layers = []; for (let h = 2; h*f0 < 4000; h++) { const v = amp(h)*.45; if (v > .01) layers.push({ wave:'sine', freq:f0*h, attack:.008, sustain:dur*.55, decay:dur*.45, volume:v }); }
  return { wave:'sine', freq:f0, attack:.008, sustain:dur*.55, decay:dur*.45, volume:Math.max(.08, amp(1)*.45), vibrato:{ depth:.2, rate:18 }, layers };
}
```

Register about 10 syllables per voice archetype (6 archetypes); each character has a base pitch (`play(name, { pitch })`), speed and lilt; question marks rise; capitals are loud; Mrs. Gander's HONK is a square sweep; Pemberton plays at double speed; Lou is low and slow. Singing (Hester, Vesper) uses the same syllables at melody pitches. A separate **Voices** slider scales `volume` per play (the engine has only master, sfx, music channels). Settings offers Gibberish, Soft beeps or Off. Audio unlocks on first input, so attract is silent until then; `audio.counts` still counts, which tests use.

---

## 19. Multiplayer

Follow `https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/README.md` (AI Hub Session Protocol v1); `session.js`, `harness.html`, `bridge.js` and `round.js` sit beside it. Two modes share one host/guest code path behind a `Transport` interface: `send(data, { to, reliable })`, `on('message')`, `players`.

### In an AI Hub session: shared world, "The Bean Bazaar"

When `AIHub.active`, the game opens straight into the round: no title, attract, menus, pause, dev mode, saves or quit. Build only the arena. **Call `AIHub.connect` first thing, before `Engine.start`** (hello times out at 10 s). Call `AIHub.ready()` as soon as the arena is built (the harness allows 20 s with four software-rendered copies, so aim under 8 s) with no key press. If `connect()` answers `null`, there's no hub after all: carry on with the normal start.

```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="5">
<meta name="hub:session-goal" content="Bank the most beans before the last bell">
<meta name="hub:session-howto" content="Move: stick or WASD. Do the thing: Cross or E. Sell at the stall.">
<meta name="hub:webgpu" content="required">
```

**The round.** Five minutes on a 32×24 Fair Green (pond and river strip, small orchard, flower patch, dig cracks, a central stall), in the village's art.

- All verbs are contextual on one button, no tool switching: shake, dig, cast, reel, swing, sell.
- Five pocket slots. Unbanked value counts half at the bell, so trips to the stall matter.
- Neighbours post short orders ("Dorrit wants a pear: double beans").
- A bell announces golden moments (golden fish, a rich tree) at set times. The Mayor inches across the green; bump him for a tip of the sash and small bonus.
- Avatars wear seat colours (`#e8443a #3b82f6 #22c55e #f5b700`) with hub names over their heads (never inserted as HTML). A scoreboard strip shows everyone.

**Own card** (`connect({ mode:'shared-world', seats:[1,4], card:true })`): the plaza, players lined up in their colours, the game's name, who's ready, how to win, this player's controls, time left from the `card` event. Answers: Ready = Enter, Cross or click, `AIHub.answer('ready')`; More time = Triangle, a named key or click, `AIHub.answer('more')`. Nothing else on the card; it changes nothing. Read Enter with a plain `keydown` listener on `window`: the harness pokes a synthetic key and allows 3 s, and software-rendered frames can be slow.

**Protocol duties.**
- Play starts at `AIHub.time() >= 0`; show the 3-second countdown from `start`.
- Host is authoritative. Bell at min(5:00, `limitMs` − 5 s): `AIHub.finish({ standings, scores, stats, awards })` listing every player still in `AIHub.players`, ties grouped. Comic awards ("Most Fish Apologised To").
- On `time-up`, finish at once.
- On `leave`, remove the avatar.
- On `end`, stop input, `audio.stopMusic()` and `stopLoops()`, send nothing.
- `server` copy: `AIHub.server` true, no local player, input or avatar; slow overview camera; runs the world as usual.
- Use `AIHub.rng(label)` for host-independent randomness.

**Session rules to hold.** Network only through the hub. **No RTC or BroadcastChannel objects are even created in a session** (the check watches for sockets): load those modules only when `!AIHub.active`. No chat, emotes, typed names or `alert`/`confirm`/`prompt`/`window.open`. Ignore Options while Create is held. A touch-only player without a pad stays connected as a spectator with the notice on screen.

### On its own: Visit

From the title: **Open my gate** or **Visit a friend**. A guest arrives by bus in the host's town. Same avatars, tools and neighbours; the host's world is authoritative.

| Transport | Use | Note |
|---|---|---|
| **BroadcastChannel** | Two windows on one computer, no typing | Hosts announce on a channel; guests see them listed. Same browser profile only [verified]. |
| **WebRTC with invite codes** | Two computers, no server | A **Gate Pass** (offer) goes to the friend, who pastes it and returns a **Reply Slip** (answer). `CompressionStream('deflate-raw')` + base64 gets about 600 characters; wait up to 4 s for ICE gathering [verified]. Use a public STUN server for the internet; it still works on a LAN if offline. Paste through a pixel-styled DOM textarea (needs a keyboard, and says so); Copy with a selected-text fallback. A knowing joke about friend codes is welcome. |

Up to 3 guests in a star. On join the host sends a chunked reliable town snapshot (tiles, objects, weather, time, neighbours) so the guest builds a temporary town; guests' own save holds only their pockets and beans, written on leaving. Guests may catch, pick fruit, chat through emotes and canned phrases, drop gifts; they can't fell trees, pull flowers or use the bus ("Bus doesn't run while you have company."). Host leaving sends guests home.

### Netcode (both modes)

| Message | Direction | Rate |
|---|---|---|
| `me`: x, z, facing, action | guest → host, unreliable | 10 Hz |
| `do`: action request (catch, pick, sell…) | guest → host, reliable | on action |
| `snap`: all avatars, moving objects (≤ 1,100 bytes) | host → all, unreliable | 10 Hz |
| `ev`: results, spawns, score, bell | host → all, reliable | on change |
| `town`: chunks ≤ 12 KB | host → guest, reliable | once, Visit only |

Keep the Hub's budget everywhere (≤ 20 messages a second, burst 40, ≤ 16 KB): `Transport` enforces it in Visit too, so one code path passes the harness. Own avatar is client-predicted; remote avatars render 120 ms in the past and snap if more than 3 m off. Catches are claimed by the client and validated by the host (still there, in reach). Tested at `latency=150&jitter=50&loss=5`.

---

## 20. Title, attract, pause, settings, dev mode, About, saves

**Title.** The live village diorama with the logo (bitmap font at ×3–4). Menu: **Continue · New Arrival · Visit · Settings · About**. Prompts per device.

**Attract mode.** After **10 seconds with no input on the title/menu screen** (not inside Settings, About or name entry), a looping AI-played demo starts; **any input** (key, button, stick, mouse move, tap) exits to the title at once. It runs on a throwaway demo save and never touches the player's. It cheats freely (teleports, time and season jumps behind quick irises, no clip, infinite beans). Its only job is to show as much as possible: tree shake → butterfly → cast and catch → fossil → neighbour chat with voice → store → furnishing → museum donation → summer lanterns and fireworks → the bus singing → City neon, salon, auction paddle → soup → snowman → Long Night → logo. Beats of 6–10 s, 2–3 minutes a loop, a "DEMO" tag and pulsing prompt (touch-only: "Controller or keyboard required").

**Pause (Options/Esc):** Resume · Map · Almanac · Settings · Save & Quit to Title · About · **Dev Mode**.

**Settings:** Music (**default 10%**), Effects, Voices, Voice style, Text speed, **Controller glyphs: PlayStation or Xbox**, Rumble, Camera shake, Clock: Village Time or Real Clock, Fullscreen (`requestFullscreen`), Picture: pixel size and quality through `engine.settings`, Reset to defaults.

**Dev mode** (from the pause menu; never in a session). Paged, pad-playable, still big type.

| Page | Tools |
|---|---|
| Time | Set hour, next day, set day 1–16 or season, freeze, clock mode |
| World | Weather, teleport to any place or neighbour, noclip, free camera, zoom out overview |
| Player | Beans ±, clear debt, set home tier, give any item, all tools, all emotes, set look |
| Neighbours | Friendship, force favour, move in/out now, show routines |
| Events | Start any festival, contest, concert, Inspector, cheese day, wasps, shooting star, ending |
| Collections | Fill or empty museum, Almanac |
| Debug | Overlays for collision tiles, nav paths, target, NPC state; engine state line; look switcher |
| Save | Save, load, reset, export/import JSON, export recording, replay it |
| **Balance** | Live sliders with **reset per slider and Reset All**, defaults below |

| Slider | Default | Range |
|---|---|---|
| Game minutes per real second | 1.25 | 0.25–20 |
| Walk / jog / run speed (m/s) | 2.6 / 4.2 / 6.0 | 1–6 / 2–8 / 3–12 |
| Camera zoom | 1.6 | 1.2–2.4 |
| Fish per water acre | 3 | 0–10 |
| Bite window (s) | 0.6 | 0.2–2 |
| Max false nibbles | 3 | 0–6 |
| Bugs per acre | 1.5 | 0–6 |
| Bug spook radius at a run (m) | 3 | 0.5–8 |
| Fruit regrow (days) | 2 | 0–6 |
| Weeds per day | 3 | 0–20 |
| Hybrid chance | 0.15 | 0–1 |
| Balloons per day | 3 | 0–20 |
| Sell price × / buy price × | 1 / 1 | 0.2–5 |
| Debt × | 1 | 0.2–5 |
| Favour reward × | 1 | 0–5 |
| Friendship gain × | 1 | 0–5 |
| Neighbour walk speed (m/s) | 1.8 | 0.5–5 |
| Neighbour chat rate × | 1 | 0–5 |
| Rain chance × | 1 | 0–3 |
| Cheese volatility × | 1 | 0–3 |
| Text speed (chars/s) | 35 | 10–200 |

All in one `src/dev/tuning.js` (`{ id, label, default, min, max, step, page }`), read live by the systems; values persist apart from the save.

**About/Credits.** Paged, big type, reachable from title and pause:

- **Source Information** with every field TASK.md lists, in its order (Usage reads "added on import").
- **Testing Feedback**, **Engine Feedback** and **Prompt Feedback**, each question and answer.
- Cast and credits, plus licences: the kit's `CREDITS.md` ships in the page (a `text/plain` script) and is readable on a Licences page; Kenney packs are CC0, credit them anyway.
- "Inspired by Animal Crossing: City Folk" appears once here.

The same text goes in your final chat reply and the exit interview.

**Saves.** `localStorage`, JSON with a `v` field and migrations, autosaved on every door, each game hour, and at the bed. In a session it's the client's memory storage: don't special-case it, just don't load or show saves there. **Inspector Pimm**, a hermit crab who lives in a filing cabinet, appears if the last session ended without bed or Save & Quit: three escalating monologues over a player's lifetime, then one last resigned one. Autosave means this is only comedy; nothing is ever lost.

---

## 21. Code architecture

```
src/main.js           AIHub.active? round : normal start; touch and WebGPU checks
src/game.js           createGame(): the one Game object and its hooks; modes: title, attract, play, round
src/core/             clock, calendar, weather, rng, events, storage, save (pure, no document)
src/world/            tiles, townMap, cityMap, collide, nav, terrainMesh, seasons, occluders, interiors
src/actors/           rig, clips, player, npc, schedule, crowd
src/systems/          tools, fishing, bugs, dig, trees, flowers, stars, snow, economy, cheese, shop,
                      museum, home, placement, rating, mail, favours, memory, town rating,
                      salon, couture, magda, theatre, auction, bureau, cafe, fortune, bus,
                      festivals/ (seedToss, lanternFloat, soup, longNight), contests
src/ui/               font, glyphs, panel, focus, prompts, keyboard, dialogue, screens/*
src/audio/            voice, composer, songs/*, sfx, ambience
src/data/             items, fish, bugs, fossils, art, furniture, clothes, neighbours, dialogue/*, festivals, year
src/art/              critter, models, textures (everything exported for check.mjs --sheets)
src/net/              transport, hub, broadcast, rtc, host, guest, arena, visit, protocol
src/dev/              tuning, devmode, attract
tests/                run.mjs, sim/*, play/*, browser/*, hub/
tools/                build.mjs
```

- **State:** one plain JSON `world` object is the save. Systems are functions over `world` plus `ctx`; presentation reads it. An event bus (`caught`, `sold`, `gift`, `talked`, `day`) feeds memory, stats and tests.
- **Data-driven:** adding a fish, neighbour, furniture set, festival, venue or line needs no code, only a data entry and possibly a model def, so the rest of the game can be built later with normal designer tools. Map rows, dialogue, items, songs, tuning and the year table are all plain data; dev mode's Events page lists them automatically.
- **UI:** a screen stack of plain objects (`open`, `input`, `draw`); focus and hit areas are real data, hover and click resolve against them; `ui.model()` returns the current screen, focus and prompts for tests.
- **Test handle:** `window.__GAME__` (installed in the `ready` hook) exposes `world`, `ui.model()`, `tuning`, and actions; `status()` gives day, hour, place, beans, debt.
- **Replays:** `fingerprint()` hashes day, minute, position, beans, debt and collection counts.

---

## 22. Testing

**One command:** `node tests/run.mjs` prints only failures and a one-line count. `--only sim|play|browser|hub|visit|sheets` for one suite. Rerun a suite only after changing what it covers. Use screenshots only for what a script can't check. Don't use subagents or workflows to debate, review, judge or audit. Keep one or two browsers open at once and close them; keep all files in your folder; stop only your own PIDs.

| Suite | Runs | Checks |
|---|---|---|
| **sim** | Node, under 10 s | Calendar both clocks, Real Clock mapping, weather table, drop tables, cheese patterns, flower rules, debt math, save round trip and migration, map flood fill, line tags resolve, every `Song` parses, every clip validates, voice syllables render and peak under 1 |
| **play** | `Engine.headless`, under 3 minutes | **Scripted playthrough of the whole game** (below), then replay and compare `fingerprint()` |
| **browser** | Chromium on `file://` the built HTML, with the flags from section 2 (not TASK.md's shorter list) | Boots with no errors; engine text unchanged in the page; fresh profile `audio.volume.music === 0.1`, and after Settings Reset; stub pad drives title → play → pause; keyboard and mouse the same; prompts switch glyphs with last device, Xbox option works; attract starts at 10 s, a key, a button, a mouse move each exit it, player save untouched; analyser on `audio.master` shows music and voice levels above silence (use `page.keyboard.press` first to unlock); dev mode opens from pause, a slider changes behaviour, Reset All restores; About has every field; Chromium phone and tablet profiles: no touch UI, notice and ⚙ showing, tap opens settings, attract runs; WebKit: friendly no-WebGPU message and no uncaught error |
| **hub** | Harness (below) | `window.__hubCheck.pass` in every scenario, each run asserted |
| **visit** | Two pages in one context | BroadcastChannel join and movement seen on both; WebRTC with `iceServers: []` join, invite codes round trip; after leaving, the guest keeps pockets and beans and the host's save is unchanged |
| **sheets** | `node check.mjs --sheets src/art/models.js` from the kit | Exit 0 |

**Hub harness.** `tools/build.mjs` copies the HTML to `tests/hub/game.html` beside unmodified `harness.html`, `bridge.js`, `round.js`. Serve that folder with `python3 -u -m http.server 0 --bind 127.0.0.1` and read the port from its first line (`-u`, or it never prints through a pipe). Open `harness.html?game=game.html&auto=1&` plus each of:

- `players=2`
- `players=4&latency=150&jitter=50&loss=5`
- `players=4&latency=150&jitter=50&loss=5&scenario=host-leave`
- `players=2&scenario=server`

Wait for `document.body.dataset.complete === 'true'`. Confirm the page is your game before trusting a result. Stop the server by its PID in a `finally`.

**Playthrough bot** (`tests/play/`): helpers `walkTo`, `talk`, `pressUI`, `useTool`, `sleepTo`, `nextDay`, driving `input.setKey`/`setPointer` on virtual codes through real input, `engine.step` in batches. Raise game speed for dull stretches. Milestones to assert:

1. New Arrival through bus: name, town, look set; debt 8,000.
2. Day One errands done; each tool gained; a letter sent; reply next morning.
3. Fish, bug, fossil caught; a fish sold; beans and memory updated; a neighbour line references it.
4. Tree shaken, sapling planted, flower watered, hybrid formed, weed pulled, balloon shot, wasp sting and cure, bag buried and beanstalk tripled, shooting-star wish delivered.
5. Museum donation appears in each wing; Almanac updates.
6. Each debt tier paid; home tier changes; placement, wallpaper, lamp, stereo, mirror, TV, Bureau grade by mail.
7. City: every venue entered, one interaction each (cut, plume check, forgery spotted, emote learned, auction won, consignment mailed, critique, coffee buff, fortune).
8. Cheese bought, sold at profit, goes bad.
9. Chime composed, heard on the hour; Vesper's record plays on the stereo; pattern drawn, worn, and in the firework.
10. All four festivals and three contests complete with results. Rocco leaves, Fitch arrives, Rocco returns.
11. Bed options, Hibernate jump, season reskins, absence effects (faked timestamp), Inspector Pimm on unclean exit.
12. Long Night, gold Bell at high rating, credits, Year Two starts.

**Stand-ins** are as TASK.md lists: stub `navigator.getGamepads` in `add_init_script`, Playwright touch profiles, Web Audio analysers, two pages. `e.step()` draws nothing: for a picture, set `e.manual = false` and let a frame draw. The software GPU runs 10–20 fps at 1080p, so drive logic in manual time and don't rely on wall-clock speed. Judge the 10-foot view from 1920×1080 screenshots.

**Look at screenshots** for: title, dialogue, Pockets, each season, night, interior, City night, one festival. Check that UI text is legible and actors stand out.

---

## 23. Build order and cut rules

Each step leaves something playable.

1. **Scaffold and packaging.** Title chosen. `tools/build.mjs`, single HTML boots on `file://` with a test scene, test runner printing a count.
2. **UI kit and input.** Font, panels, focus, glyphs, last-device, virtual pad codes, screen stack, keyboard, settings shell, music 10%.
3. **Village walk.** Map data, terrain, season surfaces, collision, camera, turns, occluders, wind, one cottage, your avatar and rig.
4. **Neighbours talk.** Critter generator, clips, routines, dialogue, voices. By now it should be charming. If it isn't, fix it before anything else.
5. **Verbs.** Tools, fishing, bugs, digging, trees, flowers, reveal, puns, Pockets.
6. **Time.** Clocks, calendar, weather, seasons, day and night, bed, absence, hourly music.
7. **Economy and home.** Store, debt, Bean Jar, placement, interactive furniture, Day One script, mail.
8. **Town services.** Museum, Hall, Mothwick's, patterns, Chime, town rating, Almanac, map.
9. **The City.** Bus and ballads, boulevard, crowd, neon, all venues.
10. **The year.** Festivals, contests, Vesper, cheese, Rocco's story, ending, Inspector Pimm.
11. **Multiplayer.** Hub round and harness suite first, then Visit.
12. **Shell.** Attract, dev mode, About, final title flow, touch-only.
13. **Full playthrough suite, polish, content to target.** Then the finish checklist.

**If effort runs short:** cut content to floors first. Next, simplify a venue's fun to a smaller interaction, not to a bare menu. **Never cut:** Day One, neighbours and memory, City, the four festivals, the 10% music rule, controller/keyboard/mouse parity, Settings, attract, dev mode with sliders, Hub pass, About, exit interview. If one Visit transport can't be finished, remove its menu entry entirely: TASK.md allows no TODOs, placeholders or stubs. Anything unfinished must not be visible.

---

## 24. Finish checklist and TASK.md coverage

**Before you finish:**

- [ ] `node tests/run.mjs` shows zero failures; output of the last full run is real, not remembered.
- [ ] Single HTML in the place TASK.md names, opens by double-click on `file://`, no network needed. No TODOs, placeholders or stubs anywhere (`grep`).
- [ ] About/Credits filled with Source Information, Testing, Engine and Prompt Feedback, the same text as your chat reply. "unknown" for anything you can't confirm. Usage says "added on import".
- [ ] Exit interview file written in exactly TASK.md's shape, parses as JSON. Suggested `aiHub` values: type `Game`, genre `Life Sim`, source `Animal Crossing: City Folk`, series `Animal Crossing`, players `1–4`, tags from `pixel art`, `3d`, `comedy`, `exploration`, `versus`, plus your name, tagline, description and controls line.
- [ ] Every process you started is stopped; no stray files outside your folder.

**Where this plan answers each line of TASK.md:**

| TASK.md | Here |
|---|---|
| Source | Header, section 1 |
| Genre, Perspective | Section 1 |
| Game Title (riff, 50 ideas, real RNG) | Sections 0, 1; left to the builder |
| Research | Done for this plan; further research is your choice |
| Package: single HTML, dependencies | Section 2 |
| Tech Stack: riftlight kit, engine as ships | Section 2 |
| Art Direction | Section 16 |
| Animation | Section 17 |
| Audio: code only, gibberish voices, music 10% | Section 18 |
| Online; Multiplayer: Hub and on its own | Section 19 |
| Working environment and deliverable, shared machine | Sections 0, 2, 22 |
| This computer, its stand-ins, sharing it | Sections 2, 22 (and one correction: browser flags, section 2) |
| Performance out of scope, unlimited budget | Sections 16, 22 |
| Testing: headless, one command, playthrough, no debate subagents | Section 22 |
| Effort | Your call; section 23 orders it |
| Goal and scope: original, feature-complete vertical slice, designer-extensible | Sections 1, 12, 21 |
| Dev mode from pause, live sliders, reset | Section 20 |
| Attract mode at 10 s, any input exits, may cheat | Section 20 |
| Narrative tone | Section 14 |
| 10-foot controller-first, DualSense, native keyboard and mouse, glyph switching, Xbox option, no dense screens | Section 15 |
| Touch-only notice, settings button, attract runs | Section 15 |
| Done: no TODOs, placeholders, stubs | Sections 23, 24 |
| Source Information, feedback in chat and About; exit interview with AI Hub block | Sections 20, 24 |
| Testing, Engine, Prompt Feedback questions | Sections 20, 24: answer them from your real experience |
