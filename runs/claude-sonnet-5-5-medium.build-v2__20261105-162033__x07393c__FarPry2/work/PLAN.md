# PLAN: an original first-person war-zone survival shooter, inspired by Far Cry 2

You are building this game without me. This plan makes the decisions, so you can spend your effort on building. Your brief outranks this plan; this plan outranks the engine's docs on what to build, and the engine's docs outrank this plan on how an API behaves.

- **"Your brief"** is the prompt you were given. It names the deliverable's file and the dev subfolder. This plan never does.
- **All paths here are relative to the dev folder.**
- **"Verified"** means I ran it on this machine, on engine 0.46.0, on 2026-11-04. If the kit you download is newer, read the `CHANGELOG.md` entries after 0.46.0 before relying on section 3.
- **The title is yours.** Run your brief's procedure (50 titles, a real random number generator) as your first act. Put the result in `src/content/title.js` as `GAME_TITLE`, and use that constant wherever the title appears. This plan says "the game".
- **No stubs, ever.** If you run short, cut whole features in the order in section 26 so nothing is left half-built.

Contents: 1 The game · 2 Setting, cast, story · 3 Verified engine facts · 4 Architecture · 5 World · 6 Fire, wind, time, weather · 7 Player · 8 Weapons and wear · 9 The body · 10 Soldiers and AI · 11 Vehicles · 12 Buddies · 13 Stones, safehouses, side content · 14 Missions · 15 Writing · 16 UI and UX · 17 Dev mode · 18 Attract mode · 19 Multiplayer · 20 Art · 21 Animation · 22 Audio · 23 Packaging · 24 Testing · 25 Build order · 26 Cut order · 27 Done, reports, coverage table

---

## 1. The game

**Genre:** open-world first-person shooter with survival pressure and systemic fire.
**Perspective:** first person on foot, at the wheel and in story scenes, with an optional chase camera in vehicles only. The source's best ideas (a gun jamming, tablets in your palm, pliers in your own forearm, a paper map in your hands while someone shoots at you) only work through your own eyes and hands.
**Length:** 45 to 75 minutes for the story, with side content on top. A co-op/versus round lasts 6 minutes.

**Pitch.** You come to a dying country to kill the man who drew its maps. Your gun rusts, your truck dies, your blood has a fever with a timetable, and the grass burns whoever lit it. Two armies pay you to make things worse. Your only friends are for hire, and you may have to finish one yourself.

**Five pillars.** Every feature serves one of these. If a choice is unclear, choose what serves them.
1. **Everything fails.** Guns rust and jam, trucks stall, your body turns on you. Plans are negotiated with your equipment.
2. **Fire is your best weapon and your worst neighbour.** Grass burns by wind on a grid. Scars stay in the world and on your map.
3. **Hands, not menus.** Map, tracker, tablets and surgery happen in your hands while the world goes on.
4. **Friends are a resource you can spend.** They rescue you, offer better plans and die for real.
5. **Nobody is right.** The writing never lets you feel clean, and it never lectures.

**Core loop.** Take a contract. Prepare at a safehouse (loadout, sleep to choose the hour, read the wind). Drive out, running or skirting checkpoints and hunting stones on the way. Scout, light the grass, shoot, clear the jam, survive the fever. Get out. The world has changed: land burned, a village emptied, a friend gone. Sleep and take another contract.

**Original, not a recreation.** Build in the genre and use similar mechanics, but invent everything else: country, people, factions, story, map, weapons' names, models, music. Never use the source's proper nouns, characters, plot, map, level layouts, music, logos or look. The only allowed references to it are the riff in your title and the "Source" credit.

| What makes the source distinctive | Our original form |
| --- | --- |
| Fictional war-torn country, two rotten factions | The Sorrel: the Concord and the Harvest Front (section 2) |
| Hunting an arms dealer who sells to both sides; recorded interviews | Hunting the Surveyor who sells maps to both sides; his notes in your map's margins, found at trig points |
| Recurring tropical illness, pills | Blackwater fever, quinine tablets, clinic runs (section 9) |
| Guns that degrade and jam | Wear, jams, rust you can see, guns that fall apart (section 8) |
| Spreading grass fire with wind | 5 m fire grid, wind, slope, permanent scars that regrow green (section 6) |
| Map and GPS held in hand | Paper map and GPS held in hand, and the map turns out to be the plot (sections 14, 16) |
| Buddies who rescue you and can die, mercy kills | Three hired friends, rescues, alternate plans, heal-or-finish choices (section 12) |
| Diamonds as money, hidden cases found by beep | Rough stones, cases, the tracker's beep (section 13) |
| Self-surgery animations | Four original field-surgery scenes (section 9) |
| Bleak, literary, cynical writing | Section 15 |

Content limits: an invented country that maps to no real nation, people or flag. A mixed international cast. No child soldiers, no sexual violence. Civilians are not targets: they flee, and the Ledger counts them. The clinic's emblem is a green cross, because the Red Cross emblem is legally protected.

---

## 2. Setting, cast, story

**The Sorrel.** A former colony on a high red-grass plateau, named by a company for the colour of the grass at the end of the dry season. The game takes place in one basin, **the Kettle**: savanna, thorn woodland, a salt pan, a slow river called **the Mercy**, a rocky ridge, an open-pit diamond mine. A truce holds at the railway town of **Mile Forty**, because both armies do their shopping there.

**The armies.**
- **The Concord:** the old government's officers, slate fatigues, navy berets, white armbands. They talk about peace as if it were an invoice. HQ: **Fort Clement**. Leader: **Colonel Aurelio Vance**, soft-spoken, always cleaning something.
- **The Harvest Front:** populist militia, mismatched sand and orange with red headcloths. They say they are feeding the people, and they burn the fields. HQ: **the Granary**. Leader: **Mother Ansa**, a former schoolteacher who corrects your grammar before sending you out to do something terrible.

**The target.** **Emil Harrow, the Surveyor:** the old company's cartographer, who drew every road and border in the Sorrel. He now sells both armies maps of each other, including minefields, and some of them are wrong.

**You.** **Aster**, a silent contractor with forged papers as a surveyor's assistant. You were paid to kill Harrow. Your contract includes a map with a note in the margin, in Harrow's hand: *MIND THE FEVER. YOU ARE LATE ALREADY. E.H.*

**Others.**
- **Sister Odile** runs the Mercy Mission clinic at Mile Forty. She smokes, and she is exact and unsentimental. She controls the tablets.
- **Tibor** sells guns from a rail shed. Everything he sells has been returned at least once.
- **Old Bakr** drives the goods train and talks all the time.

**Buddies (section 12).**
- **Ines Carvalho:** ex-bush pilot who lost her plane; dry.
- **Dov Halpern:** ex-sapper, two fingers short; speaks in small parables.
- **Mags Oyelaran:** struck-off army medic; talks while she works on you.

**The twist.** Harrow paid for your contract himself. He is dying of the same fever. Each burn he steered you toward (the East Siding, the Cut, the Long Field) lies on one arc across the Kettle: a firebreak. Burned grass cannot burn twice, so a refugee column can walk that scar to the mined pass at the border while both armies try to burn them out. *You have been drawing for me.* He has one more thing for you: the only honest map of the minefield.

**Ending.** You choose who gets that sheet.
- **Walk out** with the stones and the sheet, alone.
- **Give it to the column** and hold the pass behind them.

Either way, your surviving buddies come for the stones at the end, and the last thing you do is light the grass. A Ledger of what you did follows, then the credits.

**The central line,** which is never explained: *A map is a promise made by someone who has already left.*

---

## 3. Verified engine facts

The kit's guide is written with a platformer in mind. These are the traps and answers for a first-person open-world game. I ran these unless a line says "not run". Read `GUIDE.md` whole as the kit asks, and `ASSETS.md` before writing models; search `API.md`, don't read it whole.

**Single file on `file://` works.** The kit says modules don't load from `file://`, but that only applies to separate files. An inline `<script type="module">` holding the esbuild bundle of game plus engine boots on `file://`, with `__PIXEL_READY__` resolving in 2 to 3 s (software WebGPU, 1280 m terrain, 150k grass blades). See section 23.

**First-person traps:**

| Trap | Fix |
| --- | --- |
| The `first` rig's far plane is 160 m | In `setup`: `const cam = ctx.camera.camera; cam.far = 1000; cam.updateProjectionMatrix();` |
| The rig turns the view while KeyE or KeyQ is held, which breaks PC use keys | Replace the instance's `step` (below). Re-install after any `engine.setCamera`, in `onCameraChange` |
| `input.wantsPointerLock` is overwritten every frame while the preset is `first`, so menu clicks grab the pointer | Define an accessor (below) |
| Default pad mapping presses keyboard codes (R2 = KeyC, Square = KeyJ...) | Replace `input.gamepadButtons` with `Pad*` codes (below). `isDown`, `wasPressed` and `consumePress` then work on them and keep the devices apart |
| Right stick arrives as `input.mouseDelta` at `gamepadLookSpeed` (500) px/s, 0.0025 rad per unit | Keep that path so recordings still work. Scale by device in your `step` |
| `engine.paused` didn't stop anything under `step()` | Pause with `engine.timeScale = 0`. `update` still runs with `dt = 0`, `wasPressed` and `isDown` work, `fixedUpdate` stops. So menus live in `update`; animate them with your own frame counter, not `dt` |
| Esc under pointer lock may never reach you as a keydown (browser behaviour, not run here) | Open the pause menu on `pointerlockchange` to null during play |
| `requestPointerLock()` can reject shortly after Esc, and an unhandled rejection fails the hub check (browser behaviour, not run here; the accessor above I ran, but not with a real click) | Always `.catch(() => {})`. Re-lock from a `pointerup` listener when the game wants the lock. Test a real click on a menu item early |

```js
// src/core/look.js: call in setup() and in onCameraChange() when the preset is 'first'
export function installLook(ctx, cam) {          // cam: your own state { override, enabled, sensX, sensY, invertY }
  ctx.camera.step = function (u) {
    if (cam.override) {                          // scenes, attract, chase camera
      this.camera.position.set(...cam.override.position);
      this.camera.lookAt(...cam.override.target);
      this.focus.copy(this.camera.position);
      return;
    }
    const k = cam.enabled ? 1 : 0;               // 0 while a menu is open or the map cursor has the stick
    this.yaw -= u.input.mouseDelta.x * 0.0025 * cam.sensX * k;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch - u.input.mouseDelta.y * 0.0025 * cam.sensY * (cam.invertY ? -1 : 1) * k));
    this.focus.copy(u.target);
    this.camera.position.copy(u.eye);            // from your game's eyePosition(ctx)
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  };
}
// In setup():
ctx.input.gamepadButtons = { 0:'PadCross', 1:'PadCircle', 2:'PadSquare', 3:'PadTriangle', 4:'PadL1', 5:'PadR1', 6:'PadL2', 7:'PadR2',
  8:'PadCreate', 9:'PadOptions', 10:'PadL3', 11:'PadR3', 12:'PadUp', 13:'PadDown', 14:'PadLeft', 15:'PadRight' };
let wantLock = false;
Object.defineProperty(ctx.input, 'wantsPointerLock', { get: () => wantLock, set() {}, configurable: true });
```

**Things attached to the camera.** `scene.add(cam); cam.add(viewModelGroup);` follows the camera with no lag. Give the group `setLookLayer(group, 'actors')` and `castShadow = false`. The near plane is 0.05 m.

**The map in your hands works.** A `THREE.DataTexture` (RGBA `Uint8Array`, nearest filter, `colorSpace = SRGBColorSpace`) on a `PlaneGeometry` with `toonMaterial(0xffffff, { map })`, parented to the camera, reads crisp. It needs no DOM, so it also runs in Node. Draw into the array yourself.

**Terrain.**
- `new Terrain({ size:[1280,1280], cells:[512,512], bands, steep, rock })` generates in about 0.4 s. Rapier's heightfield attach takes about 15 ms.
- The mesh is non-indexed: 6 vertices per cell at index `6 * (ix + iz * nx)`, with a 3-component `Float32` `color` attribute.
- Recolour a cell with `col.setXYZ(base + k, r, g, b)`, using components of `new THREE.Color(hex)`.
- Then set `col.addUpdateRange(start, count)` (in array elements) and `col.needsUpdate = true`. If a later update doesn't show, drop the ranges and upload the whole attribute at up to 4 Hz. Never call `land.update()` after painting: it recomputes the colours.
- Add 40 to every height so the ground stays above y = 0 (fog and maths are simpler).

**Sky.** `applySky(engine, skyAt(hour))` drives sun and ambient light well, but its sky colours are cartoon cyan by day. Keep its sun and ambient, and draw your own dome:
```js
const dome = new Mesh(new SphereGeometry(900, 24, 16), new MeshBasicNodeMaterial({ vertexColors: true, side: BackSide, fog: false }));
dome.frustumCulled = false; dome.castShadow = dome.receiveShadow = false; scene.add(dome);   // per frame: dome.position.copy(camera position)
```
Good verified gradient for 16:30: top `#7fa6b8`, middle `#e9c98f`, horizon `#d98a4e`. Fill in the hour table from section 6.

**Fog.** In `groundFog`, `top` is world Y and everything below it sits in thick mist (it looks like a lake). For distance haze only: `groundFog({ color, top: -60, amount: 0.55, near: 200, far: 950 })`, then `scene.fogNode = fog.node`.

**Grass.** `GrassField` is an `InstancedMesh` and honours `setMatrixAt`. `geometry.getAttribute('aRoot')` holds `[x, z, phase, height]` per blade. To burn a blade: `setMatrixAt(i, zeroScale)`, then `instanceMatrix.needsUpdate = true`. Verified good look: `height:[0.55,1.2], width:0.13, base:PALETTE.orange, tip:PALETTE.sand`, about 3 blades per m².

**Flames.** The library's `fire-burst` is an explosion ring, not grass fire. Write your own strip. In `textureDef`, `size` is the whole strip, frames are equal slices, and each frame's `pixels` layer is placed with `at:[i*w,0]`:
```js
textureDef({ id:'grass-flame', about:'Licking grass flame', tags:['fx'], size:[40,14], frames:4, palette:{a:'red',b:'orange',c:'sand',d:'white'},
  layers:[0,1,2,3].map(i => ({ at:[i*10,0], pixels:FRAMES[i], legend:{a:'a',b:'b',c:'c',d:'d'} })) });
// new SpriteBatch(spriteSheet(def), { capacity: 1800 }); batch.set(i, { frame }) every ~0.1 s
```
Sprites of this sheet at 1.6 to 3.2 m look right. By night, one `ctx.lights.request({ color:0xff7a30, intensity:40, radius:60, flicker:'torch' })` over a fire front turns the grass deep red, which is very good.

**People.**
- A `model()` with nested `pivot:true` groups named as `HERO_RIG`'s joints works with the hero's clips: `compileClips(HERO_CLIPS, { ...HERO_RIG, spine: undefined }, build.object)`.
- `new Ragdoll(physics, object, HERO_RAGDOLL)` also works on it. It costs about 15 draws per person.
- Use this soldier as your starting point (as written it passes `checkModel` with no problems or warnings; shoulders about 1.12 m, head top about 1.74 m, faces +Z):
```js
const limb = (name, len, w, c, kids = [], at = [0,0,0]) => ({ group:[{ box:[w,len,w], at:[0,-len/2,0], c }, ...kids], at, pivot:true, name });
const foot = (name) => ({ group:[{ box:[0.12,0.1,0.26], at:[0,-0.05,0.05], c:'boot' }], at:[0,-0.22,0], pivot:true, name });
export const soldier = model({ id:'soldier', about:'Soldier on the hero rig', tags:['actor'], floats:true, collider:'none',
  palette:{ cloth:'slate', dark:'night', skin:'plum', boot:'ink', beret:'navy', strap:'white' },
  parts:[{ group:[
    { box:[0.34,0.2,0.2], at:[0,0.06,0], c:'dark' },
    { group:[
      { box:[0.38,0.5,0.22], at:[0,0.25,0], c:'cloth' },
      { box:[0.06,0.56,0.24], at:[0.1,0.25,0], rot:[0,0,28], c:'strap' },
      { group:[{ box:[0.2,0.22,0.2], at:[0,0.11,0], c:'skin' }, { box:[0.24,0.07,0.24], at:[0.01,0.25,0], rot:[0,0,-8], c:'beret' }], at:[0,0.52,0], pivot:true, name:'Head' },
      limb('ArmR',0.25,0.11,'cloth',[limb('ForearmR',0.16,0.09,'cloth',[limb('HandR',0.08,0.08,'skin',[],[0,-0.16,0])],[0,-0.25,0])],[-0.25,0.47,0]),
      limb('ArmL',0.25,0.11,'cloth',[limb('ForearmL',0.16,0.09,'cloth',[limb('HandL',0.08,0.08,'skin',[],[0,-0.16,0])],[0,-0.25,0])],[0.25,0.47,0]),
    ], at:[0,0.04,0], pivot:true, name:'Torso' },
    limb('LegR',0.3,0.13,'dark',[limb('ShinR',0.22,0.11,'dark',[foot('FootR')],[0,-0.3,0])],[-0.14,0,0]),
    limb('LegL',0.3,0.13,'dark',[limb('ShinL',0.22,0.11,'dark',[foot('FootL')],[0,-0.3,0])],[0.14,0,0]),
  ], at:[0,0.62,0], pivot:true, name:'Pelvis' }] });
```

**Custom rigs work too,** with `p` offsets on any joint. For first-person hands, use a rig like `{ joints:['Root','Weapon','Mag','Bolt','ArmR','HandR','ArmL','HandL'], root:'Root', mirror:{}, soles:[], trace:[], limits:{}, fps:30 }`, a model with those pivot names, `compileClips`, and a `THREE.AnimationMixer`. A key looks like `[6, { Weapon:{ r:[0,0,-35], p:[-.05,.06,.05] } }, 'out']`.

**Checks.** Use plain distance tests in `fixedUpdate` for sites and pickups: the engine triggers' `tag:'character'` belongs to the platformer hero.

**Movement.** `CharacterController` stays grounded on the heightfield and is right for a grounded soldier. `PlatformerCharacter` (triple jumps, ground pounds) is not. `speed` is set in the constructor and read as a plain field; `setInput(move, jump, jumpHeld)` takes a move vector of length up to 1.

**Vehicles.** `new Vehicle(physics, { size:[0.95,0.45,2.2], mass:12, power:160, topSpeed:26, wheelRadius:0.42, suspension:0.45, stiffness:30, grip:2.6, at, yaw })` reaches 22 m/s in 3 s on the terrain and stays upright. The defaults only reach 7 to 11 m/s on the same ground.

**Navigation.** `new NavGrid(640, 640, { cell:2, origin:[-640,0,-640] })`: a long `path()` took 26 ms, a short one 2 ms, and one `flowTo()` 114 ms. So use `path` with a budget (at most 2 per fixed step, queued) and never use flow fields here.

**HUD.** 480×270 art pixels at 16:9. Font is 5×7 with a 6 px advance, drawn uppercase. It has exactly: A-Z, 0-9, space and ``. , : ; ! ? ' " - + = / ( ) [ ] { } % _ # & * @ < > | \ ~ ^ $ ` ° ·`` plus curly quotes. There is **no em dash or ellipsis**, so write `-` and `...`; unknown characters draw as `?`. Scale 1 is about 28 px tall on a 1080p screen, which I judged readable as the smallest size. `hud.width` follows the screen's aspect, so anchor everything. `hud.text` doesn't wrap: write your own wrapper.

**Audio.**
- Default volumes: master 0.8, sfx 1, music 0.6, persisted by the engine. `resetVolumes()` returns to those, so implement your own reset.
- `renderSound(def)` is pure and works in Node.
- `audio.play(defOrName, { pitch, volume, pan })` and `audio.loop(...)` with `voice.set({ volume, pan, muffle, pitch })` cover everything.
- No audio files are needed, and none are allowed.

**Tests in Node.**
- `Engine.headless(createGame(), { camera:{ preset:'first' }, viewport:{ width:1920, height:1080, dpr:1 } })` runs at far faster than real time (300 steps took about 60 ms on a bare scene).
- A pad works: `globalThis.navigator.getGamepads = () => [pad]`, with `pad = { connected:true, mapping:'standard', axes:[0,0,0,0], buttons:[...{pressed,value}] }`.
- Mouse works: `input.setPointer(x, y, down)`, read back through `input.buttonEvents`; `input.addPointer(dx, dy, wheel)` adds movement.
- `spriteSheet`, `textureMap`, `buildModel` and the HUD all work in Node. Only `drawSheet` needs a canvas: don't use it.

**Hub.** I ran the real harness against an engine-weight shared-world page, with `card:true` and with the `LOOK` from section 6 for the two-player runs. All four scenarios the hub uses pass in 12 to 17 s, with `AIHub.ready()` called about 3 s after load (one straggler took 6.6 s):
- `players=2&auto=1`
- `players=4&latency=150&jitter=50&loss=5&auto=1`
- the same four-player settings with `&scenario=host-leave`
- `players=2&auto=1&scenario=server`

A software-rendered copy only draws about 2 frames a second there, so **the net tick and the card's Enter key must not depend on the render loop** (section 19). For the server copy, `await Engine.headless(game, {})` in the browser page plus `setInterval(() => e.step(6, 1/60), 100)` works and needs no GPU.

**Same-computer link.** `BroadcastChannel` works between two `file://` pages of one browser profile (verified).

**A local server, when you need one.** `python3 -m http.server 0 --bind 127.0.0.1` buffers its "port" line when its stdout is a pipe, so a script waiting for it hangs forever. Run it as `python3 -u -m http.server 0 --bind 127.0.0.1`, or print the port some other way.

**Software rendering runs at about 1 fps here.** That is expected. Treat the performance budget as unlimited: add as much detail, enemies, effects, lights and shadows as a scene needs. FPS targets and optimization are out of scope and handled later. Never judge the game by real time in a headless browser. Drive tests with `e.step(n)` and read state. For a real picture, set `e.manual = false`, wait 10 s or more, and take a Playwright `page.screenshot`. That produced correct frames for me with the flags in section 24.

---

## 4. Architecture

Unzip the kit **into the dev folder root** so `pixel-engine.js` and `check.mjs` sit at its top. The kit's tools find the engine by looking upward, so `node check.mjs --headless src/game.js` and `node check.mjs --sheets src/art/models.js` then just work. Never edit `pixel-engine.js`. Replace the kit's `game.js` and `index.html` with yours, and delete its `examples/` and `packs/` when you are done with them: the game loads no packs, so the credits and the bundle stay simple.

```
pixel-engine.js check.mjs GUIDE.md API.md ...   the kit, as shipped
index.html                the dev page: same <head> order as the bundle (section 23), loads src/main.js
vendor/session.js         AI Hub client, unmodified (downloaded from the hub's repository)
vendor/hub/               harness.html bridge.js round.js (tests only, never bundled)
tools/build.mjs           esbuild + inline: writes the one HTML file your brief names
src/main.js               browser boot only: hub connect, touch check, Engine.start
src/game.js               export createGame(options); the Game hooks; the mode machine; no DOM at import
src/core/                 actions.js look.js tuning.js save.js rng.js state.js events.js
src/world/                terrain.js roads.js sites.js grass.js sky.js fire.js wind.js map-texture.js
src/actors/               player.js soldier.js squad.js buddy.js civilian.js fauna.js rig.js
src/combat/               weapons.js projectiles.js damage.js viewmodel.js
src/body/                 health.js fever.js surgery.js
src/vehicles/             vehicle.js driving.js repair.js train.js
src/missions/             runner.js steps.js scripts.js ledger.js
src/ui/                   hud.js menu.js screens/*.js glyphs.js prompts.js dialogue.js pixfont.js touchgate.js about.js
src/dev/                  devmode.js sliders.js overlays.js
src/attract/              director.js beats.js
src/net/                  session.js hubSession.js linkSession.js soloSession.js round.js host.js client.js card.js
src/audio/                sfx.js music.js voice.js ambience.js
src/art/                  models.js textures.js viewmodels.js clips.js   (data only: exports for check.mjs --sheets)
src/content/              title.js weapons.js sites.js roads.js missions.js dialogue.js notes.js about.js tuning-defaults.js
tests/                    run.mjs lib/ suites/
```

**Patterns to follow:**
- **One Game object, one Engine.** `createGame()` builds the world once. Title, attract, campaign and round are modes on it (`game.mode`). Don't use `engine.loadGame` between them: it would throw away the terrain. For New Game and Attract use `world.reset()`, which clears fire, sites and actors and repaints the base colours.
- **Data over code.** All content lives in `src/content/` and `src/art/` as plain data. Adding a weapon, site, mission, line of dialogue or model must not need a code change. This is what lets the rest of the game be built later "with normal designer tools": tables, the sheets tool and dev mode's placement readout. Keep a one-page `DESIGNERS.md` in the dev folder saying how to add each.
- **Actions, not keys.** `src/core/actions.js` maps an action to its pad code and its keyboard/mouse codes (section 16). All gameplay asks for actions. In `fixedUpdate` use `input.consumeAny(codes)`; in `update` use `wasPressed`.
- **Gameplay in `fixedUpdate`, presentation in `update`.** All randomness comes from `ctx.random.fork(name)`, never `Math.random`. Cosmetic forks are made in `setup`.
- **`TUNING`.** Every balance number lives in `src/content/tuning-defaults.js`, copied to a live `TUNING` object. Systems read `TUNING.x` at the moment of use and never cache it, so sliders act instantly.
- **`game.state()`.** One plain JSON snapshot for every test: `{ mode, screen, focus, device, glyphSet, notice, attract, mission, step, hp, stones, tablets, syrettes, weapon:{id,cond,jammed,mag}, fever, pos, yaw, vehicle, hour, wind, fire:{burning,burnt}, prompts:[...], subtitle, buddies, ledger }`. Expose it in `ready(ctx)` as `window.__GAME__ = game` when `window` exists. Give `status()` a useful one-liner and `fingerprint()` a hash of hp, stones, weapon state, fire counts and actor positions.
- **Sim and view apart.** A soldier is data plus an optional view; a fire cell is data plus sprites. In a round, a client's soldiers are puppets with no brain and no collider, driven by snapshots. Write them this way from the first day, because retrofitting it is the expensive part of section 19.
- **Simulation bubble.** Sites within 260 m of the player are live; others are counters. Vehicles on patrol are simulated within 400 m. This keeps the code simple and headless tests fast.
- **Guard the page.** Any code that touches `window`, `document`, `navigator` or `localStorage` checks that it exists. `src/game.js` must import cleanly in Node.
- **Issues log.** Keep `tests/ISSUES.md`: one line per bug testing catches, marked critical or not. Your brief asks how many there were at the end.

**Working rules from your brief:** keep every file inside your own folder (not `/tmp`, not a parent). Don't read other agents' folders. Other agents share this machine, so keep to one or two browsers at once and close them. Don't run `playwright install`; use `npm install playwright@1.63.0` in your folder. `uv run --with pillow ...` is the way to get Python packages. Stop only processes you started, by PID, and never use `pkill`, `killall` or `fuser -k`. "Target closed" or "page crashed" means memory ran out: run fewer browsers rather than retrying. If you serve anything, confirm the page's title is your game before trusting a result.

---

## 5. World

The whole game happens on one continuous 1280 × 1280 m terrain (x and z from -640 to 640, +x east, -z north, 512 × 512 cells at 2.5 m). Heights have a +40 offset.

**Height function,** built up in this order:
1. `40 + 14*fbm(x*.0032, z*.0032) + 2.5*fbm(x*.02, z*.02)`.
2. The north ridge: up to +42 m with ridged noise around (-130, -520), radius 260.
3. The west escarpment: rising +30 m for x < -520, cut by the Pass at (-590, -430).
4. The salt pan: flattened to y = 36 around (200, 470), radius 150.
5. The mine: a terraced pit at (150, -300), radius 70, 24 m deep.
6. The river: a channel along its polyline, 14 m wide and 3 m below the banks.
7. The stamps: flatten around each site (radial falloff) and along each road (5 m wide, 3 m shoulder).

Generate once in `setup`; don't run erosion.

**Ground colour:** per cell after generating, in palette colours: sand and orange for grass, red for dirt and roads, plum for rock (slope), mist and white for the salt pan, green for riverbank and thorn woodland, teal near water. Keep a copy of the base colours for scars and regrowth.

**Water:** one `WaterSurface` strip per river segment, with river depth 1 m everywhere. Wading halves your speed and stops sprinting. Vehicles cross only at the two bridges and the ford.

**Sites.** All in `src/content/sites.js` as data. Tune positions by eye; the arc of the East Siding, the Cut, the Long Field and the Pass is the one thing that must stay (it's the plot).

| Site | At (x, z) | What it is |
| --- | --- | --- |
| Mile Forty | (0, 40) | Truce town, no-fire zone radius 70 until mission M7: inside it your gun is slung and won't fire, and nobody shoots. Station, clinic, Tibor's shed, bar, market, notice board |
| Pump Shed | (-120, 150) | First safehouse, empty |
| Ranger Post | (40, -170) | Concord post with a cage, becomes a safehouse after M2 |
| Water Tower | (470, -180) | Safehouse, guarded by 6 until cleared |
| Fort Clement | (-430, -180) | Concord HQ: colonial stone walls (library `stone-wall`, `battlement`), parade ground, Vance's office |
| The Long Field | (-260, -300) | Concord farmland, 180 × 120 m of tall dry crop, ammo bunker |
| The Granary | (400, 280) | Harvest HQ: silos, tin sheds, Ansa's schoolroom |
| East Siding | (430, -60) | Harvest fuel depot on the railway, 3 tanks |
| Three Wells | (-260, 240) | Village, 12 civilians, wells, cistern |
| Pump Station | (-330, 395) | On the river, feeds Three Wells |
| Salt Pan | (200, 470) | Payroll road across white flats |
| The Cut | (150, -300) | Open-pit mine: headframe, sluice house, spoil heaps |
| Observatory | (-130, -520) | Harrow's trig station on the ridge |
| The Pass | (-590, -430) | Mined border pass; the end |

**Checkpoints** (posts of 4 to 6 soldiers, sandbags, a boom gate, sometimes a technical): P1 (90, -80) north road · P2 (-200, 30) west road · P3 (170, 90) east road · P4 (-320, -90) fort road · P5 (280, -210) mine road · P6 (300, 390) salt road. A cleared post re-mans after `TUNING.postRemanHours` (24 game hours); the source's instant respawn is one of its known annoyances, so we don't copy it.

**Roads** (polylines in `src/content/roads.js`, painted red, flattened):
- Mile Forty to P1, Ranger Post, P5, the Cut.
- Mile Forty to P2, Three Wells, Pump Station.
- P2 to P4, Fort Clement, the Long Field.
- Mile Forty to P3 to the bridge at (250, 80), then forking to the Granary and to East Siding, then on to the Water Tower.
- The Granary to P6 to the Salt Pan.
- The back road: Mile Forty over the bridge at (120, 230) to P6.
- The Long Field by a track to the Pass.
- The Observatory by a switchback track from the Cut.

**The railway:** a polyline from (-640, 110) through Mile Forty (0, 70) to East Siding (430, -60) and on to (640, -110), with a spur north to the Cut. Rails are `mine-rail` pieces or two long boxes, with their own bridge where they cross the river near (270, -5). Four **rail halts** (West Cutting, Mile Forty, East Siding, Cut Spur).

**The Mercy (river):** (600,-640) → (420,-320) → (300,-120) → (250,80) → (120,230) → (-60,300) → (-240,380) → (-420,430) → (-640,470). Road bridges at (250, 80) and (120, 230); a ford at (-60, 300), which a track from Mile Forty uses.

**Plants and scatter** (seeded, stored per cell for the fire):
- About 400 trees (`acacia` shapes and a fat bottle tree), denser in the east woodland. Each has a `addStaticCylinder` trunk.
- Thorn bushes (library `bush` recoloured).
- Termite mounds (own model).
- Boulders and `rock` on the ridge. Library `dead-tree`.
- Reeds on the river.

**Grass:** `GrassField` chunks of 48 × 48 m with about 7,000 blades, `mask` from the fuel map, `ground` from `heightAt`. Build a chunk the first time it comes within 170 m of the camera, hide it beyond 200 m, dispose beyond 320 m. On build, consult the fire grid (burnt cells get no blades).

**Buildings** are `model()` defs with `collider:'parts'` so doorways stay open. Single storey with open doorways; no doors, no ladders. Watchtowers carry a soldier the player can shoot but not climb to.

**Fauna:** gazelle herds in open grass (a small quadruped on its own rig with a keyed run cycle, fleeing gunshots and fire) and vultures circling burnt or corpse-heavy sites (`Boids` with a tiny flapping model). They are atmosphere and can't hurt you.

**Civilians:** walk between points in Mile Forty and Three Wells, using the hero clips. Flee on gunfire. They cannot be killed by the player's bullets (hits are ignored and they flee), and fire makes them flee; the Ledger counts displacement, not bodies.

---

## 6. Fire, wind, time, weather

**The fire grid** is the game's signature system, so write it first and test it hardest.

- 256 × 256 cells at 5 m (`src/world/fire.js`). Arrays: `fuel` (0 none, 1 grass, 2 scrub, 3 tree, 4 building), `state` (0 fresh, 1 burning, 2 burnt, 3 regrowing), `burnEnd` and `burntAt`. Road, water, rock, salt and dirt have no fuel.
- Tick at 4 Hz in `fixedUpdate` (every 15 steps), using `ctx.random.fork('fire')`. Keep a list of burning cells; never scan the grid.
- Each burning cell tries its 8 neighbours with `p = 0.02 * fuelFactor * windFactor * slopeFactor * rainFactor * TUNING.fireSpread`, divided by 1.41 for diagonals. I calibrated 0.02 by simulating this grid: on flat grass the head, flank and back of the fire move at 1.9, 1.9, 1.9 m/s with no wind, 3.9, 2.4, 0.35 at 5 m/s, and 4.9, 2.9, 0.4 at 8 m/s. Larger bases run away quickly (0.08 gives about 10 m/s and burns upwind too).
  - `windFactor = clamp(1 + TUNING.windEffect * windSpeed/5 * 1.6 * cos(angle between neighbour direction and wind), 0.15, 3.5)`
  - `slopeFactor` = 1.4 uphill, 0.7 downhill. `rainFactor` = 0.15 while raining. `fuelFactor`: grass 1, scrub 0.8, tree 0.6, building 0.4.
- Strong wind (above 6 m/s) gives an ember jump: small chance to light a fuel cell 2 to 3 cells downwind, which is how fire crosses a road.
- Burn time: grass 8 to 14 s, scrub 12 to 18 s, tree and building 30 to 40 s.
- **A test must measure the head of the fire at wind 5 m/s and require 2 to 5 m/s,** with flanks clearly slower, so a sprinting or running player can escape and a walking one (3.6 m/s) struggles.
- **Burnt land can't burn again.** That is mechanics and plot at once.
- `ignite(x, z, radius)` is the only way in. Used by flare, molotov, flamethrower, explosions, burning soldiers, wrecks and tracer fire on full-auto from the mounted MG (small chance).
- `burnStrip(polylineId, width)` quietly burns a named strip, for story scars (section 14).

**Effects on the world:**
- A cell going burnt recolours its terrain cells to a speckled ink, night and slate mix, zeroes its grass blades, and swaps any tree to a scorched version (bare black trunk, built by `palette` swap, plus `dead-tree`).
- After `TUNING.regrowHours` (48 game hours) a burnt cell goes to state 3: painted green and lime with short new grass. *The green comes back faster than the people.* It stays state 3 (can't burn) until the next save or day-roll, then back to fresh fuel at half density.
- Actors in a burning cell catch fire: soldiers panic (section 10), players burn (section 9).
- Vehicles in fire lose 6 HP/s. Fuel tanks and drums explode when their cell burns, igniting a radius and throwing a `physics.explode` and `screen.shockwave`.

**What you see:**
- A `SpriteBatch` of flames: 3 per burning cell within 220 m of the camera, at seeded offsets, frame-flipped every 0.1 s.
- `particles.register` smoke columns per fire cluster (cluster = 16 × 16 cell tile), embers, ash drifting downwind.
- Up to 3 `ctx.lights.request` over the nearest clusters (intensity by size, `flicker:'torch'`), released when the cluster dies.
- Sound: one spatialized `audio.loop` for the nearest cluster, volume by size (section 22).
- Burn scars show on your held map.

**Save:** run-length encode `state` into the save JSON.

**Wind.** One vector, a slow random walk (direction changes by up to 15° a minute, speed 0 to 8 m/s). It drives `grass.wind`, `WindUniforms` (trees via `swayObject`) and rain. Read it from the grass, from a strip of red cloth on every post (`clothGrid` + `SoftMesh`), and from a small wind arrow on the GPS. Missions can pin it (`wind` field).

**Time.** Full day = `TUNING.dayMinutes` (30 real minutes). Call `applySky(engine, skyAt(hour))` at up to 10 Hz. Paint the dome from this table, interpolated:

| Hour | Top | Middle | Horizon |
| --- | --- | --- | --- |
| 5.5 | `#3a4a6b` | `#d99a6c` | `#f0b070` |
| 9 | `#6f9fb5` | `#c9d6c4` | `#e3cf9e` |
| 13 | `#7fa6b8` | `#d8dcc0` | `#ecd9a6` |
| 16.5 | `#7fa6b8` | `#e9c98f` | `#d98a4e` |
| 19 | `#2b2f52` | `#8a4f5c` | `#c8643c` |
| 22 | `#0b0f20` | `#141a2e` | `#1c2238` |

Add a sun disc (`glowMaterial`), a moon, and stars at night (a `SpriteBatch` following the camera). Night cuts AI vision (section 10), which is why sleeping until midnight is a tactic.

**Weather.** Dry by default. A dust wind (`particles`, stronger wind, haze raised) and a storm (`Precipitation` rain, lightning `screen.flash` + thunder, fire damped). Storms are rare, scripted for M9, and available from dev mode.

**The look.** The engine's native pixel pipeline plus a light grade. Keep these filters always on and change only parameters, since parameters are free and adding a filter rebuilds the pipeline:
```js
export const LOOK = {
  scene: [{ id:'adjust', params:{ brightness:0, contrast:1.06, saturation:1.05, warmth:0.04 } }, { id:'chromatic', params:{ spread:0 } }, { id:'vignette', params:{ intensity:0.28, softness:0.7, amount:1 } }],
  actors: { pixel:{ size:1, outline:0.45, crease:0.08 }, filters:[] },
  environment: { pixel:{ size:1, outline:0.32, crease:0.05 }, filters:[] },
};
```
Fever, low health and flames adjust `spread`, `saturation`, `warmth` and `intensity` through `engine.setLook` (at up to 15 Hz).

---

## 7. Player

A `CharacterController` capsule with `eyePosition` at feet + 1.55 (crouched 0.95). No visible body. Head-bob and landing dip go in the view group, not the camera.

| Move | Speed (m/s) | Notes |
| --- | --- | --- |
| Walk (stick partly tilted; Caps Lock toggles it on keyboard, never Alt, since Alt+D jumps to the address bar) | 3.6 | Quiet |
| Run (default) | 5.4 | Heard at 25 m |
| Sprint (click L3 or hold Shift while moving forward) | 7.4 | 6 s of stamina, 8 s to refill, heard at 40 m, can't fire or aim |
| Crouch | 2.0 | Quiet; hidden in tall grass |
| Wading | 2.7 | No sprint |

Jump: `jumpSpeed` 8 (about 1.3 m with gravity -24), enough for low walls. Fall damage above 6 m. No prone, no ladders, no ledge grabs.

**Use.** Scan for usable things within 2.5 m and 25° of the view centre, and show one prompt: glyph plus verb (`[glyph] OPEN THE BONNET`). Some are hold-to-use with a ring that fills.

**In a menu or with the map cursor active,** the look stick does nothing. Otherwise the world never pauses except in the pause menu.

**Aim assist** (pad only, on by default, Settings toggle): within 4° of a live enemy's torso, look sensitivity falls 35%; ADS adds a slight pull. Pad look gets a response curve (`tilt^1.6`) on top of the engine's delta.

---

## 8. Weapons and wear

**Slots:** melee (always), sidearm, main, special, plus throwables, plus a mounted MG when on a technical. You carry one of each slot, swapped at safehouse lockers or by picking guns off the ground.

| id | Name | Slot | Mag / reserve | Rate | Damage | Range | Wear per shot | Stones | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `cane` | Cane knife | melee | - | 1.6/s | 55; kills from behind | 2.2 m | - | start | Quiet |
| `m38` | Service revolver | sidearm | 6 / 36 | 3/s | 34 | 45 m | 0.5 | start | Dependable |
| `flare` | Flare pistol | sidearm | 1 / 8 | 0.6/s | 12 + ignite | arcs to 70 m | 0 | given in M3 | Gravity projectile; lights fuel where it lands; sets soldiers alight |
| `tractor` | "Tractor" rifle | main | 30 / 150 | 9/s | 24 | 110 m | 0.35 | 6 | Every soldier has one, mostly rusted |
| `mule` | "Mule" pump gun | main | 6 / 36 | 1.1/s | 10 pellets × 9 | 22 m | 0.8 | 8 | |
| `empire` | "Old Empire" bolt rifle | main | 5 / 30 | 0.8/s | 95 | 320 m | 1.0 | 14 | 6× scope, FOV 12 |
| `weed` | "Weed Burner" flamethrower | special | 120 / 240 fuel | stream | 28/s + ignite | 14 m | 0.12 per unit | 18 | Lights everything in its cone; below condition 20 it can leak and light you |
| `tube` | "Long Tube" rocket launcher | special | 1 / 5 | 0.4/s | 180, blast 6 m | 160 m | 2 | 20 | Lights the blast; wrecks vehicles |
| `mg` | Mounted MG | technical | no ammo; overheats at 6 s, cools in 4 s | 10/s | 20 | 180 m | - | - | |
| `molotov` | Bottle | throw | carry 3 | - | ignite radius 4 m | throw to 25 m | - | 1 each | |
| `charge` | Remote charge | throw | carry 2 | - | 220, blast 7 m | placed | - | 3 each | Plant by holding; second press detonates |

Hip fire has a small spread; L2/RMB aims (FOV 62 to 45; `empire` to 12) with tighter spread and recoil. Hitscan for bullets using `physics.castRay`, with the collider-to-actor map from section 10; rockets, flares and bottles are projectiles integrated per fixed step with a ray per step. Head ×2.5, legs ×0.7, by hit height on the capsule.

**Wear** is the source's spirit made precise:
- Every gun has `cond` 0 to 100. Guns from a safehouse locker start at 100; guns off the ground start at 20 to 55.
- Each shot: `cond -= wearPerShot * TUNING.wearRate * (upgrade ? 0.6 : 1)`.
- Per shot, jam chance: `TUNING.jamRate * 0.12 * (1 - cond/100)^2`. That gives about 1 in 800 at 90, 1 in 33 at 50, 1 in 17 at 30.
- **A jam:** trigger clicks, the gun stays jammed until you press Reload 2 to 4 times (seeded). Each press plays a slap-and-rack animation. Soldiers' guns jam too, and they swear about it (bark plus a pause, an opening for you).
- **Thresholds shown on the gun itself, with no number on the HUD:** at 60 and above it's clean; 30 to 59 rust parts appear (extra named parts toggled visible, red/plum on the barrel and receiver); below 30 tape and a smoke puff on firing; below 10 a rattle; at 0 it **falls apart** (a short animation, the magazine and a piece drop, the slot is empty).
- A small gun icon by the ammo count goes from white to orange to red, the only HUD hint.

**Feedback:** `engine.shake.add`, `hitstop(0.02)` on a hit, muzzle `lights.request({ lifetime:0.06 })`, tracer (`Trail` or sprite) on every third round, `particles.burst('impact')` plus red pixel blood, `Decals` for scorches, hit marker (small X) and rumble. Body-shot soldiers play `HitReact`; a killing shot switches to `Ragdoll` with the bullet's push.

---

## 9. The body

**Health** is 100, shown as 5 segments. It regenerates only to the top of the current segment, after 5 s without damage.
- **Syrette:** L1/Q, hold 0.8 s, +40 HP. Carry 3 (upgrade to 5). The animation: thigh jab, thumb.
- **Field surgery:** below 20 HP the screen drains colour and a heartbeat starts. Pressing Heal runs one of four scenes (about 4 s, can't move or shoot, can be interrupted by another hit), and leaves you at 40 HP with no item used.
  1. Pliers pull a bullet from your forearm.
  2. A knife digs shrapnel from your thigh.
  3. You snap a dislocated finger back.
  4. A lighter cauterises a burn (used whenever the last damage was fire).
  Keyed with the hands rig (section 21), with pixel blood, sound and a grunt. These are a highlight, so make them good.
- **Burning:** catching fire does 8 HP/s plus orange flames at the screen edge until you leave fuel for 2 s or reach water.
- **Down at 0:** if a buddy is available, a rescue scene plays (section 12). Otherwise: *YOU DIED IN THE SORREL. THE PAPERWORK WILL TAKE LONGER.* Then Continue (last save) or Title.

**Blackwater fever.** The source's malaria idea, with a clock you can feel.
- `TUNING.feverMinutes` (default 12) ± 2 between attacks; the interval shrinks by 1 minute after each act. First attack scripted in M0.
- **Onset:** view sways, `chromatic.spread` climbs to 4, saturation falls, warmth up, heartbeat, a line in the subtitle band (*THE FEVER.* or variants), and the prompt `[glyph] TABLET`.
- **With a tablet** (D-pad Down/H, hold 1 s, hand-to-mouth animation): clears over 5 s.
- **Ignored for 25 s, or no tablets:** vision narrows, you fall, and you wake at the nearest safehouse or the clinic hours later, with 20% of your stones gone. Buddy if available: they carry you and complain.
- **Supply:** 3 after M1; Mercy Runs pay 4 each (section 13). Tablets can't be bought with stones. That is the point: Odile wants your time.

---

## 10. Soldiers and AI

**Bodies:** the soldier model in faction palettes (several `skin` values and hat variants), a rifle parented to `HandR`, a `CharacterController` capsule (speed from role), `physics.tag(collider, 'npc')` and a `Map` from collider handle to actor. Clips are in section 21.

**Roles:** rifle (most), mg (slower, heavier burst), sniper (towers, long range), rocket (rare), driver.

**Perception.**
- Vision cone 120°, range `TUNING.enemyVision` (90 m) × stance (crouch 0.55, in tall grass 0.6) × light (night 0.45, doubled if you are lit by fire or muzzle flash).
- LOS by `physics.castRay` to head and chest.
- A suspicion meter fills over about 1.5 s by distance. States: `idle → suspicious → alert → searching → idle`.
- Hearing: gunshot radius per weapon (rifle 120 m), sprint 40 m, run 25 m.
- Squad members share the last known position.
- Close by, a small pixel `?` or `!` floats over the head (HUD text projected through the camera). That is the only detection UI.

**Hostility.** Everyone outside Mile Forty shoots you on sight, with one exception: **while you hold a contract from a faction, you carry its pass**, and its soldiers leave you alone unless you fire near them or walk into their HQ's inner yard. Choosing whose ground to cross becomes a real decision.

**Brain:** a `BehaviorTree` for each soldier, ticked at 10 Hz, in priority order:
1. **On fire:** run in panic (`BurnPanic` clip), scream in gibberish, spread fire to the cells they cross, die in about 5 s.
2. **Fire near and upwind:** flee crosswind.
3. **Grenade or rocket nearby:** dodge.
4. **In combat:** take cover (site cover points, then nearest tree or prop within 12 m), fire bursts of 3 to 5, re-position every 4 to 8 s; one squad member flanks by `NavGrid.path`.
5. **Searching:** walk to the last known position, look about, give up after 20 s.
6. **Duty:** patrol, stand guard, sit by a fire, sleep at night.

Pathing uses a global `NavGrid` at 2 m (slope, water, buildings closed), budgeted per section 3; off the grid or far away they walk straight.

**Shooting at you:** each round has an aim error `lerp(1.2°, 5°, dist/80) / TUNING.enemyAccuracy`, ×1.4 if you are moving fast. Damage per bullet 9. Reaction 0.45 s.

**Vehicles:** patrol technicals follow road polylines with a PD steering controller, chase if alert, and their crews dismount at 25 m.

**Barks** (gibberish voice plus a short subtitle, spatial): at least 15 per faction: spotted, lost you, grenade, jammed, fire, ally down. Examples in section 15.

---

## 11. Vehicles

Three vehicles on `Vehicle` (tuning in section 3; truck heavier and slower): **pickup**, **technical** (pickup with MG on a pintle), **cargo truck** (also a tanker variant for M3). All have `model()` bodies, four wheel meshes posed by `wheelPose`, and suspension from the engine. One train: a kinematic body moved along the railway polyline, with flatcars.

**Driving in first person:** eye at the driver's seat, your hands on a wheel that turns with steering, a dash, a small arrow on the dash pointing to your waypoint. R3/C toggles a chase camera (computed in your `step`, via `cam.override`). You can raise the map while driving, as you should: it's the most famous moment in this kind of game, and it's dangerous.

**Getting in and out:** Use at a door. The player's capsule is disabled while seated and placed by the door on exit. Triangle/F swaps to the technical's gun; the truck rolls on with no driver, and that is your problem.

**Damage:** 100 HP, from bullets, rockets, fire and collisions (over 8 m/s). Below 35: smoke, power × 0.6. Below 10: flames, explodes in 8 s unless you bail. At 0 and not on fire: stalled. **Repair:** stand at the bonnet, hold Use 3 s (wrench animation with sparks), back to 50 HP. The fixed truck coughs for a few seconds. Vehicles in M1 are scripted to break so everyone learns it.

Parking at a safehouse repairs fully overnight.

---

## 12. Buddies

Three hired friends, each a named person with a real arc. All live in the bar at Mile Forty or at safehouses once you've met them.

| | Ines Carvalho | Dov Halpern | Mags Oyelaran |
| --- | --- | --- | --- |
| Met | Freed from the cage, M2 | Tibor's shed, after M2; his plan in M4 | Clinic, after your first Mercy Run |
| Look | Flight cap, sunglasses, sand jacket | Bald, bandoliers, bad left hand | Braids, olive vest, medic's satchel with green cross |
| Perk | Rescues you by truck, from farther away | Gives 2 free charges per mission | +1 syrette at any safehouse; rescues you with 60 HP instead of 40 |
| Offers the alternate plan in | M3 | M4 | M5 |
| Voice | Mid, quick | Low, slow | High, warm, never stops |

**Alternate plans.** On certain contracts the buddy calls (radio squelch, subtitles) with a better way, adding objectives and more risk, in exchange for bonus stones and +1 trust. You can accept or ignore them on the spot. If you take it, they fight beside you on that mission.

**Rescue.** At HP 0 with a buddy available: the screen drops, and you are dragged backward in first person (low camera, sky, their boots, their gunfire) while they swear at you; then you are up at 40 HP (Mags 60) with them next to you, and the buddy is spent for 1 game day. 15% chance they take a wound and are out for 2 days. They remind you of it later.

**Down.** A buddy fighting with you has 200 HP. At 0 they fall, wounded, for 40 s, marked by a floating pixel cross. At their side, a two-button prompt:
- `[Square/E] SYRETTE` (uses one; they're up at 50%, trust +1)
- `[Triangle/F] FINISH IT` (one shot, your sidearm's animation)

If you have no syrettes, only the second option is lit. If the 40 s run out, they die anyway. If they are burning, they ask you to finish it. M6 forces this moment at least once.

A dead buddy stays dead: name scratched on the safehouse wall, their gun leaning under it, one Ledger line, and no more of their lines anywhere. The game must play on without any of them. Write their missions so the alternate plan just doesn't arrive.

**At the end,** every surviving buddy comes to the Pass for the stones (section 14). Those with trust 3 or more first offer to split it, then draw anyway if you refuse.

---

## 13. Stones, safehouses, side content

**Rough stones** are the money.
- Missions pay 5 to 25; cases hold 2 to 6.
- Total available in the demo is about 180; everything for sale costs about 130.
- Spent at **Tibor's** (a gun rack and a table).

**Tibor's stock:** the guns in section 8 (buying one unlocks clean copies at every locker for free, forever), bottles, charges, and four upgrades:
- Cleaning kit (6 stones): wear × 0.6.
- Syrette pouch (5): carry 5.
- Ammo belt (5): +50% reserve.
- Vehicle kit (6): repair in 1.5 s.

**The tracker.** Given in M4. D-pad Left/T raises it in your left hand: a small device with an LED and a beep that speeds up and turns green within 60 m of a stone case. Twelve cases are hidden around the Kettle (wrecks, hollow trees, under a dead man's truck, in guarded sheds).

**Safehouses** (3):
- **Bed:** sleep to Dawn, Noon, Dusk or Midnight, and it saves.
- **Locker:** set your loadout.
- **Crate:** ammo and syrettes.
- A wall for names. Clear the guards first where there are any. Buddies wait here with offers.

**Rail halts** (4): fast travel once visited, 1 stone, 1 game hour. It costs you Old Bakr's latest thought on a black screen with clacking wheels.

**Trig points** (6): stone pillars on hilltops. Use one: a new note in Harrow's hand appears in your map's margin, and you can read it on the map. All six: he leaves you a clean `empire` at a locker. A note that says so.

**Mercy Runs** (3, from Odile, plus M1): carry a crate to a marked place within 5 minutes. Pays 4 tablets. Fail and she says nothing, which is worse.

**The Ledger.** Create/J in play, also in the pause menu, and at the end. One sheet, five big lines, at most (never a table):
- Hectares burned (burnt cells × 0.0025)
- People moved off their land
- Men you were paid to kill
- Friends lost
- Stones earned

Written as Harrow would write it.

**Saving:** single slot, versioned JSON in `localStorage` (`src/core/save.js`), written on sleep and on mission complete, read through `ctx.input.send` so replays stay exact. Main menu's Continue loads it. Dev mode has Quick Save/Load.

---

## 14. Missions

**Format** (`src/content/missions.js`), a sketch:
```js
{ id:'m3', title:'FUEL FOR THE PEACE', giver:'vance', requires:['m2'], pay:15, wind:{ dir:[-0.8,-0.6], speed:5 },
  brief:['vance:m3.brief.1','vance:m3.brief.2'],
  alt:{ buddy:'ines', call:'ines:m3.alt', bonus:5, steps:[ {do:'steal',tag:'tanker',text:'TAKE THE TANKER AT P3'} ] },
  steps:[ {do:'goto',site:'east-siding',r:140,text:'REACH THE SIDING'},
          {do:'destroy',tag:'fuel-tank',n:3,text:'BURN THE TANKS'},
          {do:'leave',site:'east-siding',r:220,text:'GET OUT'},
          {do:'report',to:'vance',text:'REPORT TO VANCE'} ],
  onDone:[ {burnStrip:'A'}, {ledger:{paid:15}} ] }
```
**Step types:** `goto leave talk report use deliver destroy kill collect steal hold escort ride timer choice script`. A step shows its `text` for 5 s at the top when it starts, and always in the map margin. Bots drive these same steps.

Contracts are taken in person (a short FP scene: the camera holds on the giver, subtitles, then Accept or Not Yet) or through the notice board in Mile Forty. After M2, the order within M3/M4 and M5/M6 is free; M5 needs M3 and M6 needs M4 (one faction's path each); M7 needs all four. Acts, for the fever's pace: act 1 is M0 to M2, act 2 is M3 to M6, act 3 is M7 onward.

| # | Title (giver) | Length, time | What happens | Teaches | Alternate plan | Consequence, pay |
| --- | --- | --- | --- | --- | --- | --- |
| M0 | The Goods Line | 2 min, dusk, skippable | You ride Old Bakr's flatcar into the Kettle as he talks. Prompt: raise the map (must do). The margin note. Fever on the platform; you fall | Look, map | - | Fade to the clinic |
| M1 | Mercy Run (Odile) | 7 min, morning | Wake at the clinic. Take a tablet. Given an old `tractor` (cond 45). Drive medicine to Three Wells. On the way back P2 is manned. The 5th shot **jams by script**; then the truck is hit and stalls: repair. Syrette. Report | Walk, use, tablet, drive, waypoint, fire, jam, reload, syrette, repair | - | +3 tablets, 5 stones, Pump Shed |
| M2 | A Cage at the Post (Tibor) | 7 min, best at night | Ines owes Tibor. She's in a cage at Ranger Post (8 Concord, a tower). Scout with the monocular, cross in grass, cane knife, or go loud. Open the cage (hold). Ines fights her way out with you. She explains rescues by doing one if you fall | Monocular, stealth, melee, sleep to choose the hour, safehouse capture, buddy | - | Ranger Post safehouse, 8 stones, Ines |
| M3 | Fuel for the Peace (Vance) | 7 min | Burn the Harvest's 3 tanks at East Siding. Vance hands you the flare pistol. Wind pinned toward the depot: the grass will carry fire if you start it upwind | Flare, wind, fire, chain explosions | Ines: steal the tanker at P3 and drive it in; soldiers hold fire until you're inside | Scar A, 15 stones (+5). A column of smoke visible across the map for a game day |
| M4 | Seed Money (Ansa) | 7 min | Payroll convoy (2 technicals, a truck) crosses the Salt Pan on a loop. Stop it, take the case. It flies out when the truck blows: you get the tracker to find it in the salt | Vehicle combat, MG, tracker | Dov: plant his charges on the bridge, detonate as the convoy crosses | 20 stones (+5), tracker, Dov |
| M5 | The Water Question (Vance) | 7 min | Destroy the pump on the Mercy, because Three Wells "feeds the Harvest" | Charges, defending, moral cost | Mags: first open the bypass and hold the pump house for 60 s, so the cistern fills | Without alt: Three Wells empties, a line of people walks the road to the clinic, its huts go dark, Odile refuses tablets until you do a Mercy Run free. With alt: village stays, pay 10 instead of 20 |
| M6 | The Long Field (Ansa) | 9 min, forced night | Burn the Concord's crop and its ammo bunker. Your highest-trust buddy comes along (with no buddy alive, a Harvest guide named Pell does). At about 70% the wind turns (scripted) and they go down on fire: **Syrette or Finish It** | Night fire, buddy choice | The mission itself | Scar B, 25 stones, the Ledger's first hard line |
| M7 | The Cut (Harrow's note) | 10 min | A note at your safehouse: *You have drawn well. Come and see.* Truce collapses: both armies fight for the mine. Reach the sluice house through crossfire and wildfire, take his ledger. In it: *One contractor, paid in advance, to walk the Kettle.* Signed by him | Three-way fight, technical MG, big fire | A surviving buddy calls: they hold the east road if you go in from the pit side (no bonus stones, +1 trust) | Scar C. Truce over: Mile Forty loses its no-fire zone, Tibor moves his stock into safehouse lockers. Act 2 fever pace |
| M8 | Last Train (Odile) | 7 min | Mile Forty under shells. Hold the platform 120 s while people board. Then ride Old Bakr's train to East Siding on a flatcar MG, 60 s, on rails, under fire. *He says the grass won't burn twice.* The column starts walking the scar | Defence, on-rails MG | - | Column on the map, moving slowly and visibly along the scar |
| M9 | The Surveyor | 10 min, night, storm | Climb to the Observatory (deserters from both armies; no fires, it's raining). Harrow sits at a table with a lamp, as sick as you. The scene: he lays your contract map down; the three scars glow as one line; he draws the last stroke. He offers tablets and the minefield sheet, and asks you to finish your contract, or not | Choice | - | `choice` steps: shoot him or don't (a Ledger line, no other effect). Then who gets the sheet |
| End | The Pass | 3 to 4 min | Either walk to the Pass alone, or take the sheet to the column and hold behind them. Surviving buddies arrive (200 HP, real AI, last lines), with pursuit from both armies. Rain stops. The last grass is yours to light | Everything | - | Ending card, Ledger, credits, title. Continue returns to the last safehouse for free roam |

**Story scars.** On completing M3, M6 and M7, call `burnStrip('A'|'B'|'C')` so the arc exists whatever the player actually burned: A from East Siding west to the Cut, C across the Cut, B from the Cut west through the Long Field to the Pass road. The player sees it first in M9.

**Ending cards:**
- **Walk out:** *You reached the border with a case of stones and a map nobody else will ever use. The guard asks your trade. You tell him: surveyor.*
- **Give it to them:** *They crossed at first light, walking on ash. Nobody has asked who lit it. The fever is not finished with you, and you are out of tablets. It is a good view.*

**Attract, tests and dev mode** can jump to any mission start: each mission has a `setup` that puts the world in the right state (`world.reset`, story flags, scars, buddies, loadout), so `dev.startMission('m6')` is one call.

---

## 15. Writing

**Voice.** Weary, literary and exact. Short declarative sentences. Euphemism as cruelty. Gallows humour without a wink. Nobody explains the theme. Nobody is your friend without a price. People are tired, and they're smart. Think of a war correspondent who stopped filing years ago. Don't quote real authors, and don't imitate the source's lines.

Each mission gets 8 to 15 spoken lines in this voice. Each character has a tic: **Vance** invoices (*conclude, regrettable, the matter of*). **Ansa** corrects grammar. **Odile** counts things. **Tibor** talks about returns. **Bakr** tells you what stations used to be called. **Ines** owes people, or they owe her. **Dov** tells a three-sentence story that ends badly. **Mags** narrates what she is doing to you. **Harrow** writes like a surveyor's notebook.

All game text must be in the HUD font's character set. Subtitle lines stay under 60 characters, two lines at most: split long sentences across lines in sequence.

Use these lines verbatim, and write the rest to match:

- **Bakr, M0:** *Forty miles of track and not one station that remembers its name.* / *They paint the signs over. Whoever won last.* / *You have the look of a man who read about this place. Reading is a good way to visit.* / *Up there they will ask you which side. Say yes.*
- **Odile:** *Three tablets. The fourth you pay for. I do not mean in stones.* / *I do not need you to be good. I need you to be on time.* / *Sixty-one beds. Forty blankets. You are the math.*
- **Vance:** *We do not burn villages. We conclude them.* / *The water question has been a great sorrow to this office.* / *Your invoice will be honoured, regrettably.*
- **Ansa:** *You said less people. Fewer. Fewer people. It will matter by the end of the month.* / *Burn the field. A hungry man learns to read the wind.*
- **Tibor:** *Everything on this rack has been returned at least once.* / *It fires. If you want it to fire twice, that is a different price.*
- **Ines:** *I flew for both of them. Neither paid. Get in.* / *You owe me a truck. You owe me several trucks.*
- **Dov:** *Two fingers I left in this country. I came back to see what they are doing.* / *A man asked me to mine his own road, so he would know where it was safe. He was right for a week.*
- **Mags:** *Hold still. No, you can't feel that. No, that's normal. Hold still.* / *Not today. Today you owe me money.*
- **A burning buddy:** *Don't let it be the fire. Please. Not the fire.*
- **Barks:** *There! In the grass!* / *Who lit that?* / *It's stuck! It's stuck again!* / *Leave him, he's already gone.*
- **Harrow's margin notes,** one per trig point, in order:
  1. *A map is a promise made by someone who has already left.*
  2. *I drew the river where the Company wanted it. The river was slow to comply, but it came round.*
  3. *Both armies buy from me. The Concord pays on time. The Harvest pays in grain and tears. I have eaten better on the tears.*
  4. *You will have noticed that you follow roads. I drew those too.*
  5. *Grass is the only honest border. It goes where the wind tells it, and it keeps a record.*
  6. *By now you have burned what I marked. Look at it from the ridge. Tell me that is not a line.*
- **Harrow, M9:** *You are late. I said you would be. Sit down, it won't take long, neither of us has long.* / *I drew the lines that started this. I would like to draw one more.* / *You have been drawing for me. Look at it.* / *Burned grass cannot burn twice. It is the only safe road in the country, and you built it for wages.*
- **Load-screen epigraphs** (*from Harrow's field notes*): write 12 in the same voice.

---

## 16. UI and UX

**10-foot and controller first.** A PS5 DualSense on a TV at ten feet is the design target. Mouse and keyboard play the same game on the same screens and feel native. Everything is drawn with `ctx.hud` in art pixels; there is no DOM UI at all, so it all works in Node tests. Test the view at 1920×1080.

**Layout rules:**
- Safe area 24 px horizontal, 14 px vertical.
- Menu items at scale 2; the smallest text anywhere is scale 1 (subtitles, prompts).
- At most 6 items on a screen, one idea per screen.
- No tables, no scroll lists, no web-style data screens. Long content is paged.
- A focused item has a full-width bar in `orange` and a small marker. Move and confirm sounds.
- Only the title and pause menus cover the view. Every other screen is in your hands or an overlay with the world visible behind it.

**HUD in play is minimal** and hides 6 s after it last changed:
- 5 health segments, syrette and tablet counts bottom-left.
- Ammo and the gun's condition icon bottom-right.
- A dot reticle (hidden while scoped; the scope has its own black mask).
- Prompts centre-bottom. Subtitles above them with the speaker's name in a colour.
- Mission step at the top for 5 s when it changes.

**Controls** (`src/core/actions.js`):

| Action | DualSense | Xbox glyph | Keyboard and mouse |
| --- | --- | --- | --- |
| Move / look | L stick / R stick | same | WASD / mouse |
| Fire / aim | R2 / L2 | RT / LT | LMB / RMB |
| Use (when a prompt shows), else reload | Square | X | E / R |
| Jump | Cross | A | Space |
| Crouch | Circle | B | C (never Ctrl: Ctrl+W closes the browser tab) |
| Sprint | L3 (click) | LS | Left Shift |
| Melee | R3 | RS | F |
| Next weapon | Triangle | Y | Wheel, or 1-4 |
| Throw / plant | R1 | RB | G |
| Syrette, surgery | L1 | LB | Q |
| Map up / down | D-pad Up | D-pad Up | M or Tab |
| Tablet | D-pad Down | D-pad Down | H |
| Tracker | D-pad Left | D-pad Left | T |
| Monocular (hold) | D-pad Right | D-pad Right | V |
| Pause | Options | Menu | Esc |
| Ledger | Create | View | J |
| **Driving:** gas / brake-reverse / steer | R2 / L2 / L stick | RT / LT / L stick | W / S / A-D |
| Handbrake | Cross | A | Space |
| Get out / repair | Square | X | E |
| Swap to gun | Triangle | Y | F |
| Chase camera | R3 | RS | C |

Use `input.preventKeys.add('Tab')` etc. Analog triggers: each frame, read `navigator.getGamepads()` buttons 6 and 7 `value` and `input.send({ tr:[l2, r2] })` when changed, so recordings keep it, and use it for throttle and brake. Rumble: `pad.vibrationActuator?.playEffect('dual-rumble', {...})`, guarded, Settings toggle.

**Glyphs.** Prompts follow the input used last:
- `device` flips to `kbm` on keydown, mouse button or real mouse movement, and to `pad` on any `Pad*` code or a stick past 0.35.
- `src/ui/glyphs.js` is pixel art as `hud.sprite` rows, about 11 × 11: Cross, Circle, Square, Triangle, L1, L2, R1, R2, L3, R3, D-pad directions, Options, Create; Xbox A, B, X, Y, LB, LT, RB, RT, LS, RS, Menu, View; a key cap drawn around any letter; LMB, RMB, MMB, wheel.
- Settings has **Glyphs: PlayStation / Xbox**, default PlayStation.
- `game.state().prompts` lists what's on screen, so tests can check it.

**The mouse is native.** In menus the pointer is free (no lock), hover moves focus, click activates (read `input.buttonEvents`; convert with `x = (p.x+1)/2*hud.width`, `y = (1-p.y)/2*hud.height`). The wheel scrolls pages. Over the world it aims and looks under pointer lock. On the held map it's a cursor (hover focuses a marker, click sets the waypoint). On Tibor's rack and in dialogue choices, click works too. Keyboard in menus: arrows or WASD, Enter or Space, Esc back. Pad in menus: D-pad or left stick with key repeat, Cross confirms, Circle goes back, L1/R1 change tabs and pages. If the pad disconnects during play, open the pause menu.

**The held map** (`src/world/map-texture.js`). The heart of pillar 3.
- 320 × 240 DataTexture on a plane about 0.5 × 0.375 m, about 0.42 m in front of the camera, tilted, in both hands (the `hand` model and hands rig), filling about 70% of the width, so one texel is about one art pixel. A 0.62 m plane, which I tried first, was too big.
- Baked at start: contour lines every 8 m on sand paper, river, roads, rail, labels in your own 5×7 `pixfont.js`.
- Redrawn at up to 2 Hz on a copy: burn scars (ink), your position and heading, the waypoint, sites you've seen, mission step and Harrow's notes in the margin, wind arrow and clock on a small GPS clipped to the corner.
- Raise and lower takes 0.4 s with paper sound. **The world never stops.** You can walk and drive with it up. While it's up, the look input moves the map cursor.
- Square/LMB on a marker sets the waypoint; Triangle or wheel toggles a closer zoom.
- It works at night because the paper uses a dim lit toon plus a small hand torch `lights.request` following the view group.

**Screens:**
- **Loading:** the engine's, then a black screen with one Harrow epigraph.
- **Title:** live 3D scene (dusk, fixed slow camera over burning grass on the Long Field, music), the title large (scale 4, or 3 if it won't fit), the latest input's *Press [glyph]*. Then the main menu.
- **Main menu:** Continue (when a save exists), New Game, Cash Run, Settings, About and Credits.
- **Pause** (`timeScale = 0`): Resume, Ledger, Settings, Dev Mode, About and Credits, Quit to Title. In a hub session: Resume and Settings only.
- **Settings:** Sound (Music slider **default 10%**, Effects, Voices), Controls (Look sensitivity for pad, for mouse; Invert Y; Aim assist; Rumble; Glyphs), Picture (Fullscreen, for the TV; Pixel size Fine/Chunky via `engine.settings.set`; Quality; Field of view), Comfort (Subtitle size; Reduce flashes; Fever effects reduced), Reset to Defaults. Saved in your own `localStorage` entry and re-applied at boot: `settings:{ button:false, key:false }` hides the engine's panel and stops the engine saving its own copy.
- **Dialogue:** the camera holds on the speaker; subtitles; two big buttons at most.
- **Tibor's rack:** one gun at a time, large (its first-person model turned to the side on a table), name, three bars (Damage, Range, Reliability), price. Left/right cycles. Buy or Take.
- **Locker:** one row per slot, left/right picks.
- **Bed:** Dawn, Noon, Dusk, Midnight, Leave.
- **Ledger:** section 13.
- **Game Over, Ending card, Credits.**
- **About and Credits:** paged, see section 27.

**Touch-only devices.** Detect with `matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches` and no pad connected (verified: true on Chromium with the `iPhone 14`, `iPad Pro 11` and `Pixel 7` profiles, false on a desktop context). Engine option `touch:false` always, so there are never on-screen controls. On such a device the title shows **Controller or keyboard required** (the exact text in `state().notice`, drawn uppercase by the font) and one large **Settings** button (tap works as click: `input.buttonEvents` reports a finger as code `Touch`). Attract mode still starts after 10 s; a tap exits to this screen. A key press or pad connecting clears the gate and shows the normal title.

---

## 17. Dev mode

Pause menu → **Dev Mode** (hidden in a hub session). An overlay with tabs (L1/R1 or Q/E), world visible behind, playing or frozen by a toggle.

| Tab | Contents |
| --- | --- |
| Cheats | God mode, infinite ammo, no jams, no fever, invisible to AI, noclip fly |
| Teleport | Every site, every post, every case, the crosshair point |
| Spawn | Squad of each faction, pickup, technical, truck, a stone case, a buddy |
| World | Hour slider, wind direction and speed sliders, weather (clear, dust, storm), ignite at crosshair, extinguish all, regrow all, sleep +6 h |
| Mission | Start any mission, complete current step, set story flags, give stones, tablets, syrettes, all guns; break gun; force jam; force fever; down a buddy |
| **Balance** | Live sliders (below), **Reset to Defaults** for all, Square/R resets one |
| Debug | Fire-grid overlay, nav overlay, AI state text over heads, counts (actors, burning cells, draw info from `engine.state()`), engine debug panel (`engine.showDebug`), free camera (`engine.setCamera({ preset:'free' })`, restored after; re-install `step` in `onCameraChange`), crosshair coordinates for placing things in `src/content/`, Quick Save/Load, show `status()` |

**Balance sliders** (left/right steps, hold accelerates, mouse drags). Defaults in `src/content/tuning-defaults.js`:

| Slider | Default | Range |
| --- | --- | --- |
| `playerSpeed` multiplier | 1 | 0.5-2 |
| `playerDamageTaken` multiplier | 1 | 0-3 |
| `weaponDamage` multiplier | 1 | 0.25-4 |
| `enemyHealth` multiplier | 1 | 0.25-4 |
| `enemyAccuracy` | 1 | 0.25-3 |
| `enemyVision` (m) | 90 | 20-200 |
| `enemyReaction` (s) | 0.45 | 0.1-2 |
| `wearRate` | 1 | 0-5 |
| `jamRate` | 1 | 0-5 |
| `fireSpread` | 1 | 0-3 |
| `fireDamage` (HP/s) | 8 | 0-30 |
| `windEffect` | 1 | 0-3 |
| `feverMinutes` | 12 | 2-40 |
| `vehicleTopSpeed` (m/s) | 26 | 10-45 |
| `vehicleToughness` | 1 | 0.25-4 |
| `stonesReward` multiplier | 1 | 0-5 |
| `buddyWoundChance` | 0.15 | 0-1 |
| `dayMinutes` | 30 | 2-120 |
| `postRemanHours` | 24 | 1-96 |
| `regrowHours` | 48 | 1-200 |

A test sets every slider, checks the system responds, presses Reset, and checks every value equals its default.

---

## 18. Attract mode

After **10 seconds with no input on the title screen or main menu**, start a looping demo (`src/attract/`). Settings and About are exempt, because people stop to read them. It's a director with a list of beats, using the real game with `cam.override`, god mode, infinite ammo and bot input through the same action layer. It cheats freely: teleports, spawns, sets the hour and wind. A `save.disabled` flag stops it touching saves.

Beats (10 to 14 s each, joined by `engine.screen.cover('dither')` and `reveal`), to show as much as possible:
1. Dusk, driving a technical down the road, first person, raising the map at the wheel.
2. Rolling into a checkpoint, gunfight, the gun jams, slap and rack.
3. Flare into dry grass, the wind takes it, soldiers run burning.
4. Night, the Long Field in flames, chase camera past it.
5. Fever: the view swims, tablet to mouth.
6. Field surgery with pliers.
7. Scoped shot from a ridge at noon.
8. Dragged out by a buddy; syrette or finish it.
9. Tracker beeping to a case in a burnt wreck.
10. Train with the flatcar MG.
11. Tibor's rack, a line of his.
12. The map on a table with the scars glowing.
13. The title.

HUD shows a `DEMO` tag and *Press [glyph]*. **Any input exits** (key, mouse button or real movement, pad button or stick, tap) back to the screen it came from, after `world.reset()`. The loop must run indefinitely without error. It runs behind the touch gate too. Never in a hub session.

---

## 19. Multiplayer

Follow the AI Hub Session Protocol v1 (read `https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/README.md`; also the shared-world example `examples/arena.html` beside it). The hub runs invites, lobby, names, clock and results; the game runs the round. The same code also plays when the game is on its own.

**Mode: `shared-world`, 1 to 4 players.** Four mercs in one burning valley, friends until the stones are counted.

**The round, "Cash Run" (6 minutes):**
- The valley around the Cut: the campaign's terrain, with only the Cut, P5 and the Ranger Post live, 16 to 24 soldiers, wind and fire on.
- Six stone cases in guarded spots, shown by the tracker's beep and a marker when close. One extraction truck on the road south of the pit.
- Everyone starts at a different road end with `tractor` (cond 70), `flare`, `cane`, 2 syrettes, 2 bottles.
- Carry one case at a time (speed × 0.85, you can't sprint); walk it to the truck to bank its stones. Most stones wins.
- Down at 0 HP: you drop the case and bleed for 25 s. Another player can hold Use for 3 s to bring you up (+1 Revive) or just take the case. Bleed out and you return at your road end after 15 s. Friendly fire is on: that's the theme.
- On foot only, in rounds: no player vehicles.
- Ends when the time is up, or when all cases are banked or burned. Standings by stones, ties together.

**Session head tags** go in the template (section 23): `hub:session` 1, `hub:session-players` `1-4`, `hub:session-mode` `shared-world`, `hub:session-minutes` `6`, `hub:webgpu` `required`, `hub:session-goal` *Carry the most diamond cases out of the burning mine*, `hub:session-howto` *Stick/WASD move, R2/mouse fire, Square/E use, carry cases to the truck*.

**Boot order** (`src/main.js`). This is the part that makes the hub work:
```js
const info = (window.AIHub && AIHub.active) ? await AIHub.connect({ mode:'shared-world', seats:[1,4], card:true }) : null;
if (info) {
  const game = createGame({ session: hubSession(info) });        // mode 'round': no title, no menus, no attract
  if (info.server) { const e = await Engine.headless(game, {}); AIHub.ready(); setInterval(() => e.step(6, 1/60), 100); }
  else if (!navigator.gpu) AIHub.fail('This game needs WebGPU');
  else await Engine.start(game, { ...OPTIONS, seed: info.seed });  // game.ready(ctx) calls AIHub.ready() once, with no key press
} else { /* normal start: touch check, title */ }
```
Handle a rejected `__PIXEL_READY__` by `AIHub.fail(message)`. If `connect` answers `null`, run as on your own.

**`src/net/session.js`:** one interface, three implementations, so round code never knows which: `{ kind, me, players:[{id,name,color}], host, isHost, server, time(), rng(label), send(data,{to,reliable}), on(event,fn), ready(), answer(what), finish(outcome), fail(msg) }`.
- `hubSession` wraps `AIHub`.
- `soloSession` is **on its own**: host is you, the other seats are AI mercs (reuse the buddy brain: go to the nearest case, bank it, shoot what shoots you), with your own results screen at the end.
- `linkSession` is **on its own with a friend on the same computer**: `BroadcastChannel('game-link-v1')` between two windows. Host and Join on the Cash Run menu, a simple lobby, `start` carrying a `Date.now()` time base and a seed. It costs little, reuses everything, and is how two-window play gets tested.

The main menu's Cash Run offers: Solo with Hired Guns, Host on This Computer, Join on This Computer, plus one line saying friends online play through AI Hub.

**Netcode.** The host runs the world. Each copy moves its own player from its own stick, at once, never waiting for the network, as `arena.html` does.

| Message | Direction | Rate, kind | Content |
| --- | --- | --- | --- |
| `me` | client → host | 12/s, unreliable | seq, position, yaw, pitch, stance, weapon, hp echo |
| `ev` | client → host | up to 5/s, reliable, batched | shots since last batch (origin, dir, weapon), use, pick up, bank, revive, ignite |
| `s` | host → all | 10/s, unreliable, under 1,100 bytes | time, players, soldiers (`[id,x,z,yaw,state,hp]`, ints, y from terrain), cases |
| `w` | host → all | up to 4/s, reliable, batched | fire cells ignited and burnt, damage per player, downs, deaths, explosions, banks, sounds |

That's at most 17 messages a second per copy; the limit is 20 with bursts of 40, and 16 KB per message. **Drive sends from `setInterval`, not the render loop:** on a software-rendered copy `update` runs about twice a second, and traffic must still flow.

Clients render soldiers as puppets interpolated 150 ms behind; they run fire visuals only; health is host-authoritative. Local shots show muzzle flash and tracers at once, and the host decides hits. Older snapshots are dropped by `at`. In a shared world use `AIHub.rng(label)`, because `Math.random` isn't seeded there; the world is the same static terrain on all copies anyway.

**The server case.** `AIHub.server` true: run the same host code under `Engine.headless` with no player, camera, audio or HUD (`me` isn't in `players`). Don't touch `info.players[me]`.

**Round rules the harness checks:**
- `time-up`: the host calls `AIHub.finish({ standings, scores, stats, awards })` **directly from the event handler**, within `graceMs` (5 s). Every present player appears once.
- `leave`: continue; the host finishes if nobody is left.
- `end`: no more input or sends, `audio.stopMusic()`, `audio.stopLoops()`, mute. The hub shows results.
- `stats` at most 6 names per player (Stones, Downs, Revives, Kills); `awards` up to 3 (*Last Friend* for most revives, *Paid in Full* for most stones, *Arsonist* for most cells lit).

**In a session:** no title, menus or prompts before the round. No dialogs (`alert`, `confirm`, `prompt`), no `window.open`, no navigation, no network except the hub. Quit does nothing. Names come only from the hub (sanitize to the font's characters; HUD canvas, never HTML). No chat, emotes or custom names. **On a pad, ignore Options while Create is held** (Create + Options is the hub's). Sessions get an empty storage, so settings start at defaults, music at 10%.

**The game's own card** (`card:true`). A shared-world card on your live scene with `GAME_TITLE`, the players in their seat colours with ready marks, how to win, this player's controls in their glyphs, time left from the `card` event. Ready: Enter, Cross, or a tap/click on Ready → `AIHub.answer('ready')`. More time: Triangle, key `M`, or tap → `AIHub.answer('more')`. It has no menus, and play begins only at `start`.
**Listen for Enter and M with a plain `window` keydown listener** (verified to pass the harness's card check), because the harness expects an answer within 3 s and the render loop may be slow. Pad buttons can poll in `update`. Everything on the card uses `AIHub.rng('card')` for randomness. When `AIHub.time() >= 0` the round is on; show the 3-2-1 countdown before that.

**Fallback.** If shared-world can't be made stable, ship `ghost` (each copy its own world, others' mercs shown, `progress` and `result` by score, `Math.random` seeded for you) rather than drop multiplayer, and last of all `parallel`.

**Test it:** section 24, all four harness scenarios, and two windows on `linkSession`, plus the game outside a session.

---

## 20. Art

**Base style:** the engine's native 3D-as-pixel-art pipeline at 480×270, toon materials, palette colours only. Make new assets for what makes the game feel like its source. The library covers generic props (use it: `crate`, `barrel`, `sack`, `table`, `chair`, `bed`, `stool`, `boulders`, `rock`, `dead-tree`, `bush`, `reeds`, `stone-wall`, `battlement`, `signpost`, `notice-board`, `market-stall`, `well`, `lamp-post`, `campfire`, `rubble`, `mine-rail`, `shovel`). The library has **no guns, vehicles, acacias or modern buildings**: you write those.

**Workflow** (`ASSETS.md`): plain data in `src/art/models.js`; `node check.mjs --sheets src/art/models.js`; open the PNGs; fix; then check in game. Don't re-check what hasn't changed.

**You must make, as `model()` defs:**
- **People:** soldier (Concord, Harvest; 3 hat variants, 4 `skin` values), mercs (Ines, Dov, Mags, a silhouette each), Odile (veil, cigarette), Tibor (apron), Vance (peaked cap, medals), Ansa (headscarf, spectacles), Harrow (blanket, wide hat), Old Bakr, civilians (4 palettes), all on the rig from section 3.
- **First-person:** arms and hands (sleeve, skin); `cane`, `m38`, `flare`, `tractor`, `mule`, `empire`, `weed` with tank and hose, `tube`, bottle, charge, detonator; each gun with named rust and tape parts; syrette, tablet bottle, pliers, knife, lighter, wrench, monocular, tracker, map plane, GPS; steering wheel and dash for each vehicle.
- **Vehicles:** pickup, technical, cargo truck, tanker, burnt wreck palettes of each, locomotive, flatcar, boxcar, handcar as dressing.
- **Buildings and props:** tin-roof shack, concrete bunker, barracks, watchtower, sandbag run, boom gate, fuel tank, oil drum, silo, water tower, pump station, clinic tent with a green cross, station platform and signal mast, trig pillar, radio mast, mine headframe, sluice house, spoil heap, cage, termite mound, Observatory dome.
- **Nature:** 3 acacia shapes, bottle tree, scorched versions, thorn bush recolour.
- **Textures** (as `textureDef`): `grass-flame`, smoke puff if particles aren't enough, rusted metal and tin (or the library's `rust`, `metal-plates`), cracked earth and thatch from the library.

**Colour direction:** sand, orange and red land; plum shadows; slate and white for the Concord; orange and red for the Harvest; green only where water or new growth is, so regrowth reads as an event. Night is navy and ink with fire as the only warm colour.

**Style rules that matter here:** thin parts must be at least 0.06 m and silhouette parts 0.12 m at world scale, but first-person models are held 0.5 m from the eye, so they may be thinner. Set `floats:true`, `collider:'none'` on view models and people. Static scenery merges with `mergeStaticMeshes` where you can.

---

## 21. Animation

**Base:** the engine's native system. `ClipDef` data at 30 fps, `compileClips`, `THREE.AnimationMixer`, `gaitClip` for walks and runs, `Ragdoll`, `SpringChain`, `Squash`, `twoBoneIK`, tweens for small things, `Timeline` for scenes.

**From `HERO_CLIPS`, reused on all people:** Idle, IdleLook, Walk, Run, Crouch, CrouchWalk, Crawl, Sit, SitDown, StandUp, LieIdle, Sleep, Hurt, HitReact, Death, Wave, Shout, Push, Climb. `analyzeClip` and `validateClip` check your own.

**New, on the people rig** (`src/art/clips.js`):
- **Upper-body, armed versions:** AimIdle, AimWalk (arms holding the rifle, played over the legs), FireRecoil, Reload, ThrowBottle.
- **New whole-body clips:** BurnPanic (arms flailing, a stumbling run), Beg, Surrender, WoundedSit (clutching a side), DragBackward, CarryOver, DriveSit, UnjamSwear, WalkHandsTied, Shrug (Tibor), SmokeIdle (Odile), CleanRifleIdle (Vance), WriteAtDesk (Harrow), TeachPoint (Ansa).

**To layer upper over lower,** split clips by filtering tracks: `new THREE.AnimationClip(name, clip.duration, clip.tracks.filter(t => /^(Pelvis|Leg|Shin|Foot)/.test(t.name)))`, and the rest for the upper body, then play one of each.

**New, on the hands rig** (`src/art/viewmodels.js` + clips):
- Idle sway and walk bob (procedural), ADS raise, fire kick per gun.
- Reload per gun (magazine out and in on `Mag`, bolt on `Bolt`; revolver opens; shells for `mule`; flare breaks open).
- **Unjam** (slap and rack), **falls apart**, equip and holster.
- Cane knife swing, throw, plant, detonator click.
- Tablet to mouth, syrette, **four surgery scenes**, **raise map** and tracker, monocular, wrench on bonnet, hand on wheel and shifter, finish-it.

**Fauna:** gazelle run and graze on its own rig; vulture wing flap.

**Scenes:** use `Timeline` for the M0 ride, the rescue drag, M9, and endings, as `cam.override` plus `lines` and `bars()`. Skip with Cross/Enter (`timeline.skip()`).

---

## 22. Audio

Everything is written in code: `SoundDef` data, `Song` data and generated voices. No audio files. Browsers start sound on the first gesture (the engine handles it; `audio.unlock()` from your own first input). Silent before that, which is fine for attract.

**Music defaults to 10%:** on first boot with no saved settings, `audio.setVolume('music', 0.1)`. The Music slider shows 10%. Your Settings Reset returns it to 0.1 (not `resetVolumes()`, which gives 0.6). Test: clean storage → `audio.volume.music === 0.1`.

**Music** (`Song` data, written for this game, original melodies):
- At least 6: Title, Day (sparse plucked triangle over a low drone), Night (almost nothing), Stalk (tense pulse), Fire and Fight (hand-drum noise, driving low saw), Fever (a detuned Day), End (one line, unaccompanied).
- Style: plucked pentatonic lines, thumb-piano timbres (triangle or sine, short decay), noise-based hand drums, low drones; nothing that imitates another game's score.
- Switch on state with a 12 s minimum dwell, using `audio.playMusic`.

**Effects** (`src/audio/sfx.js`, `audio.register`, layered `SoundDef`s). Every one of these is required:
- Each gun (noise crack + low thump + a tail, plus a distant muffled variant), jam click, slap, rack, magazine, shell, revolver cylinder, flare pop and hiss, flamethrower roar loop, bottle smash, rocket.
- Explosion, ricochet, bullet whip, hit flesh, hit metal, gun falling apart.
- Footsteps by surface (dirt, grass, road, wood, water).
- Breath, heartbeat, syrette hiss, pliers, knife, finger snap, lighter, tablet bottle, grunt.
- Fire loop, wind loop, night insects, day birds and cicadas (chirps from arps and vibrato).
- Engine loop (pitch by speed), gravel, brakes, door, horn, starter cough, wrench, train clack, train whistle.
- Map paper, tracker beep, radio squelch.
- Thunder, rain loop, distant gunfire stingers.
- UI move, confirm, back.

Spatialize with `spatialize` and `voice.set({ muffle })` when blocked. A test renders them all with `renderSound` and checks they aren't silent.

**Voices** (`src/audio/voice.js`): Animalese/Simlish gibberish.
- For each character: base pitch, syllable rate, wave. A syllable is a short layered `SoundDef`, verified to work: `{ wave:'saw', freq:190, freqEnd:170, attack:.005, decay:.09, volume:.3, layers:[{wave:'sine',freq:760,decay:.08,volume:.18},{wave:'sine',freq:1220,decay:.07,volume:.1},{wave:'noise',freq:6000,decay:.012,volume:.08}] }`.
- Build about 12 of them (vowel formant pairs × consonant noise).
- `voice.say(character, text)`: for each word, count vowels, hash the word to pick syllables (so a word always "sounds" the same), play at the character's pitch with `pitch` offsets for intonation (rise on `?`, fall on `.`, pause at `,`), at the Voices slider's level.
- Runs over the subtitle's length; soldiers' barks are spatial.

Check sound by what Web Audio produces (section 24); nobody can listen here.

---

## 23. Packaging

The deliverable is **one HTML file** at the place your brief names, beside the dev folder. Nothing else is needed at runtime; no CDN is used. It must run from `file://` and from any web server.

**Head order is strict:**
```html
<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<script>/* vendor/session.js pasted unmodified, as the first script */</script>
<meta name="hub:session" content="1"> ... the tags from section 19 ...
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GAME_TITLE</title>
</head><body><div id="app"></div><script type="module">/* the bundle */</script></body></html>
```

`tools/build.mjs` (the steps I ran, with `</script` escaped; set `OUT` from your brief):
```js
const js = execFileSync('esbuild', ['src/main.js','--bundle','--format=esm','--target=esnext','--legal-comments=inline','--log-level=warning'], { maxBuffer: 1 << 29 }).toString();
const session = readFileSync('vendor/session.js','utf8');
const html = TEMPLATE.replace('%SESSION%', () => session.replace(/<\/script/gi,'<\\/script')).replace('%BUNDLE%', () => js.replace(/<\/script/gi,'<\\/script'));
writeFileSync(OUT, html);
```
Use function replacers as above, because the engine contains `$` sequences. The bundle is about 5.3 MB before your game is added. Append the licence texts of the engine, three.js and Rapier from the kit's `CREDITS.md` as an HTML comment at the end of the file. esbuild bundles `pixel-engine.js` without you editing it; that satisfies "keep the engine as it ships".

`src/main.js` is the only module that starts the engine. Start options:
```js
const OPTIONS = withUrlOptions({ container: document.getElementById('app'), camera:{ preset:'first', fov:62 }, look: LOOK, touch:false, debugKeys:false, settings:{ button:false, key:false } });
```
`withUrlOptions` keeps the review flags (`?seed=`, `?debug=1`, `?look=`), which are useful and harmless. `debugKeys:false` keeps the engine's R, P and M hotkeys from colliding with yours; dev mode has its own tools.

---

## 24. Testing

Test as much as you like with headless tools. **One command:** `node tests/run.mjs`. It prints only failures and a one-line count, like `412 passed, 0 failed, 3 suites unchanged`. To rerun only after changing covered code, it hashes each suite's covered files into `tests/.stamps.json` and skips unchanged suites unless given `--all`. `--only <suite>` runs one. **Don't use subagents or workflows to debate, review, judge or audit.** Log what testing catches in `tests/ISSUES.md`.

**Suites:**

1. **`static` (Node):** in `src/`: no `Math.random`; no `TODO`, `FIXME`, `placeholder`, `stub`, `coming soon`. Every string in `src/content/` uses only the font's characters; every model passes `checkModel`, every texture `validateTexture`; every `Song` parses; every sound renders non-silent; every mission's site, tag, line and buddy resolves; every `TUNING` key has a slider or a reason.

2. **`systems` (Node, `Engine.headless`, driven by `e.step` and actions):**
   - fire head speed 2-5 m/s, can't cross a road without strong wind, burnt can't re-burn, regrowth, save round-trip of the grid
   - wear math and jam frequency against the formula; jam blocks fire; reload clears it; gun falls apart at 0
   - hit zones; syrette; surgery; down-with-buddy, down-without
   - fever: tablet clears it, ignoring collapses and costs stones
   - perception by stance and night; pass exemption; soldier burn panic
   - vehicle drive to waypoint, damage thresholds, repair, explode
   - map up while driving; cursor sets the waypoint
   - tracker rate; trig note; post cleared then re-manned; rail halt; shop purchase; locker; sleep to hour; save and load
   - pause (`timeScale` 0), menus by pad, by keyboard, by mouse hover and click
   - device switch changes `prompts` glyphs; Xbox setting; settings persistence; music 0.1
   - sliders and Reset; attract starts at frame 601 with no input, not before; any input exits; saves untouched; touch gate state with `matchMedia` stubbed
   - round rules (solo session): bank, drop, revive, time-up finish

3. **`playthrough` (Node):** a bot plays M0 through both endings, using `dev.teleport` between objectives but real actions for every objective (drive the truck, burn the tanks, plant the charge, choose at the buddy). It runs with god mode on and with buddies alive, and once with one buddy dead. After each mission, assert the world state and Ledger. This is the most important test.

4. **`replay` (Node):** record one mission segment, replay it, compare `engine.fingerprint()`.

5. **`browser` (Playwright, one Chromium):** the built single file on `file://`, 1920×1080, with these flags (the ones `check.mjs` uses; correct frames came from them):
   `['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader','--use-webgpu-adapter=swiftshader']`.
   Check:
   - no page, console, game or GPU errors; backend WebGPU
   - `AIHub.active` false
   - title reached; mouse hover moves focus; click activates
   - pad stub via `addInitScript` (`navigator.getGamepads = () => [pad]`); keyboard flows
   - sound by `OfflineAudioContext` rendering of `renderSound` output, or an `AnalyserNode` on `audio.context` after a gesture
   - a phone profile in Chromium (Playwright's `iPhone 14` device, dropping its default browser type, then tap with `page.touchscreen`): shows the notice and Settings, tap opens Settings, attract runs

6. **`hub` (Playwright + a server you started):** copy the built file to `tests/.site/game.html` beside a copy of `vendor/hub/*` (the harness only loads same-origin pages), serve that folder on `127.0.0.1` with an OS-picked port (`python3 -u -m http.server 0 --bind 127.0.0.1`, read the port, kill it by its PID at the end), confirm the page's `<title>`, then for each scenario open `harness.html?game=game.html&<scenario>` and wait for `document.body.dataset.complete === 'true'`, passing when `window.__hubCheck.pass` is true:
   - `players=2&auto=1`
   - `players=4&latency=150&jitter=50&loss=5&auto=1`
   - `players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave`
   - `players=2&auto=1&scenario=server`
   Run them one at a time. They take about 15 s each here. Print `__hubCheck.checks` entries that failed.

7. **`link` (Playwright, two pages of one context on `file://`):** two windows on `linkSession` play a round to its end, with a shared fire, a shared case, and same standings.

**Screenshots** only for what a script can't check, at 1920×1080, once each near the end, and whenever you've changed the art they show: title; day first-person with gun; night fire; held map in a truck; Tibor's rack; dialogue; surgery; dev sliders; hub card; ending. Set `e.manual = false`, wait until 10 s or more have passed, and take the screenshot; about 1 frame a second is normal here.

**Stand-ins for what this computer lacks** (your brief; runs have no display, so everything here is headless): a pad stub, Playwright phone profiles, Web Audio measurement, two pages for a second player, WebKit iPhone only as a rough touch-layout check (the engine needs WebGPU, so expect its failure message and test the notice logic with Chromium's phone profile), and 1920×1080 screenshots for the TV view.

---

## 25. Build order

Each step ends with a playable build and passing tests, and leaves nothing half-done. Do them in order. Write sound, feedback and tests with each feature rather than at the end.

| Step | Do | Done when |
| --- | --- | --- |
| 0 Pipeline | Pick the title. Unzip the kit. Download `vendor/`. `tools/build.mjs`, `tests/run.mjs` with the hub suite. A blank `createGame()` with a shared-world round that does nothing | Single file opens on `file://`; **all four hub scenarios pass from day one**. Keep them passing |
| 1 Walk | Terrain, roads, river, sky, wind, grass, trees. Player, `installLook`, actions, pad codes, device tracking, HUD basics, pause | You can walk the Kettle by pad or mouse |
| 2 Shoot | Hands rig and `tractor` first, soldier rig, one AI squad, damage, health, syrette, wear, jam, reload. SFX for each | A fight at P2 is fun on its own. Add the other guns |
| 3 Burn | Fire grid, flare, bottle, flamethrower, scars, regrowth, soldier panic, day and night. Fire sounds | Lighting a field at night makes you stop and watch |
| 4 Drive | Vehicles, driving view, damage, repair, patrols, posts, train | Run a checkpoint in a pickup and break down after |
| 5 World | All sites, safehouses, Tibor, stones, tracker, fever, tablets, surgery, monocular, held map, rail halts, trig points, save and load | A whole session without missions works |
| 6 Story | Mission runner, dialogue, voices, buddies, rescues, M0 to End, Ledger, endings. Playthrough suite | A bot and you both finish it |
| 7 Shell | Title, all menus, settings, glyph sets, About, touch gate, attract, dev mode | Every screen works by pad, keyboard and mouse |
| 8 Multiplayer | Sim/view puppets, host, client, sessions, Cash Run, card, solo bots, link | Hub and link suites pass with a real round |
| 9 Polish | All music, ambience, feel, art passes, balance with the sliders, screenshots | You'd show it to someone |
| 10 Ship | Final build, About pages, exit interview, chat reply, `node tests/run.mjs --all` | Section 27 is all true |

---

## 26. Cut order

If you can't finish everything, cut whole things from the top of this list. Don't leave stubs, and remove all traces (menu entries, map marks, lines). Keep every feature in the demo reachable and shown.

1. Fauna (vultures first).
2. Same-computer link (keep hub and solo).
3. The game's own hub card (use the hub's card: `card:false`).
4. Chase camera; dust weather.
5. Mercy Runs after the first; trig points down to 3; cases down to 6.
6. M5 (Mags offers her alternate plan in M6 instead: get the field workers out first, for less pay).
7. M4 (give the tracker in M3; use the MG in M7; Dov joins at the bar).
8. M8 (the column just starts walking after M7).
9. Shared-world → ghost → parallel (section 19).

Never cut: fire, wear and jams, fever, the held map, buddy rescue and the finish-it choice, Harrow's twist, dev mode with sliders, attract mode, glyphs and native mouse, touch gate, the hub check, music at 10%, the voices.

---

## 27. Done, reports, coverage

**Done means:** every line below is true and you've checked it.
- [ ] Your title, chosen by the brief's procedure, appears on the title screen and in `<title>`.
- [ ] The one HTML file runs from `file://` with nothing else beside it.
- [ ] `node tests/run.mjs --all` reports 0 failed.
- [ ] All four hub scenarios pass, and the game still runs outside a session.
- [ ] You finished the game yourself by bot, both endings.
- [ ] No TODOs, placeholders or stubbed features anywhere.
- [ ] Every screen shows native prompts for pad (PlayStation and Xbox glyphs) and keyboard/mouse.
- [ ] You looked at the screenshots.
- [ ] `pixel-engine.js` is byte-identical to the copy in the kit's zip (keep the zip in `vendor/` and compare in the `static` suite).

**About and Credits screen** (in-game, paged, reached from main menu and pause; text in `src/content/about.js`). Your brief marks this as critical. It must show:
- **Source Information,** with every field your brief lists: Date (from your brief), Source (Far Cry 2), Plan (the file name of this plan as you received it), Genre and Perspective, Tech (engine and its version, three.js r186, Rapier 0.20, esbuild, your additions), Art Direction, Animation, Audio, Online, Testing, Research, Environment, Model (from your brief), and Usage: *added on import*. Write "unknown" for anything you can't confirm.
- **Testing Feedback, Engine Feedback and Prompt Feedback:** your brief's questions and your honest answers, in order, each on its own page. Don't estimate cost.
- **Credits:** Pixel Engine (MIT), three.js (MIT), Rapier (Apache-2.0), the AI Hub session client, and "Inspired by Far Cry 2; not affiliated".

**Your final chat reply** repeats the same Source Information, Testing, Engine and Prompt Feedback.

**The exit interview file** your brief specifies goes beside the HTML, in the exact JSON shape it gives, every value filled, and must parse. Suggested catalogue values: type `Game`; genre `Shooter`; source `Far Cry 2`; series `Far Cry`; players `1–4`; tags such as `first-person`, `pixel art`, `co-op`, `versus`, `vehicles`, `story`; the name is your title.

**Where each line of your brief is covered:**

| Brief item | Section |
| --- | --- |
| Source, original game, capture world, characters, themes, tone | 1, 2, 15 |
| Genre, perspective | 1 |
| Title by random pick (left to you) | top, 25 |
| Research | 3 (done for you; research more if you want) |
| Single HTML package, CDN allowance, bundle into root | 23 |
| Engine kit kept as shipped, systems added on top | 3, 4, 23 |
| Art direction: native base, new assets, library for generic props | 20 |
| Animation: native base, new animations | 21 |
| Audio in code, Animalese voices, music 10% | 22 |
| Online and multiplayer, in the hub and on its own | 19 |
| Dev subfolder, what not to read, shared ports and processes | 4, 24 |
| Performance out of scope | 3 |
| Testing: headless, scripted playthrough, one command, screenshots only when needed, no review subagents | 24 |
| Effort | Yours to spend; 25 and 26 order it |
| This computer and its stand-ins | 3, 4, 24 |
| Feature-complete vertical slice, infrastructure for later build-out | 4, 14, 25 |
| Dev mode from pause, standard tools, live sliders, reset | 17 |
| Attract mode at 10 s, any input exits | 18 |
| Narrative tone | 15 |
| 10-foot controller first, native keyboard and mouse, hover focus, glyphs, Xbox option | 16 |
| No dense web-style screens | 16 |
| Touch-only notice, settings button, attract runs | 16, 18 |
| Done: no TODOs, placeholders or stubs | top, 26, 27 |
| Source Information, feedback sections, chat reply, About screen | 27 |
| Exit interview | 27 |
