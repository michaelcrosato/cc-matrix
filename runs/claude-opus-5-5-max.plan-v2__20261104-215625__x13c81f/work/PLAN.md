# Build plan

You build this game alone, from this file and TASK.md. TASK.md wins any conflict.

- **Paths** are relative to your dev folder (the one TASK.md tells you to create). The finished single HTML goes where TASK.md says, under the name TASK.md gives.
- **The title is yours.** Pick it as TASK.md says. Nothing in the fiction depends on it. Keep it in one constant (`src/content/identity.js`) used by the title screen, the page `<title>`, About and the hub card. Below it is just "the game".
- **Everything here ships working.** No TODOs, placeholders or stubs. If you run short, make the game shorter, never thinner: cut encounter sizes, side rooms and decorative prefabs before any mechanic. Every feature in §8.7 must still happen in a real play of the game.
- **Work in the order of §16.** Each milestone leaves a playable game.
- **§2 was tested on this computer for this plan,** except where a line says otherwise. Trust it over your memory of Three.js and Rapier. Extra research is your choice; none is required.

---

## 1. The game

**Pitch.** A straight-faced B-movie in inked pulp-comic style. Postal Inspector Dash Mercer is sent to the remote Principality of Zlatovia to bring back the President's 74-year-old mother, who was kidnapped from a beekeeping retreat by a honey-farming valley whose people have been "Sweetened" by a parasitic hive. The kidnappers mailed a ransom note, which made it a postal matter.

**Genre and camera.** Third-person, over-the-shoulder action-horror shooter with survival-horror resource management, plus on-rails, turret, stealth and quick-time set-pieces. The camera sits behind the right shoulder and tightens when aiming. Scoped weapons go first-person. Exit-interview catalogue genre: `Horror`.

**Length.** 45–60 minutes for a first-time player: 5 chapters, 16 zones, 4 bosses, plus the Harvest Siege arena mode (solo, couch co-op, AI Hub co-op).

**Originality rule.** TASK.md asks for an original game inspired by the source. Use its mechanics and pacing. Use nothing else from it: no names, characters, dialogue, catchphrases, music, level layouts, creature designs or visual style. Everything in the table's right column is this game's own.

| What makes the source distinctive | This game's own form |
|---|---|
| Lone quipping agent, VIP rescue | Postal Inspector Dash Mercer; postal puns are her one-liners |
| Young VIP you escort | Mrs. Winifred "Winnie" Pruitt, 74, the First Mother: bridge shark, handbag, zero gratitude |
| Hostile rural cult, parasite control | The Sweet Communion of the Medovina Valley; hosts are "the Sweetened", ruled by a hive queen |
| Hammy villains, radio taunts | Mayor Slatko (megaphone), Prior Vosk (organ, stilts), Trent "Dead Letter" Vail (ex-partner) |
| Laser sight, planted feet, shoot-then-melee crowd control | Same loop, tuned in §4–5, with an ink comic hit language |
| Grid inventory case | The Parcel Case |
| Wandering weapon merchant | Mr. Fenwick, relentlessly cheerful door-to-door arms salesman |
| Save points with calm music | Rural mailboxes: "Mail a Report" |
| Rural crowd siege, power-tool stalker | Barricading the village Post Office; the Harvester |
| Giant, knife duel, cart ride, regenerating horrors, blind stalker, partner interlude, shooting gallery, arena mode | Wicker Effigy, letter-opener duel, runaway honey wagon, Wax Effigies with UV scope, the Penitent, playing as Winnie, Fenwick's Test Range, Harvest Siege |

**Pillars.** Every design call serves one of these.

1. **Stand and deliver.** Aiming plants your feet. The laser wavers, then settles. Patience is rewarded and panic is punished.
2. **One bullet, one boot.** Shoot a head and kick the crowd. Shoot a knee and slam the kneeler. Melee costs no ammo and hits groups, so good play is cheap.
3. **Greed and squeeze.** A case that's never big enough, ammo that's nearly enough, treasure worth a detour, a salesman who always has what you can't quite afford.
4. **Straight-faced camp.** Nobody in the fiction knows it's funny. Villains monologue, the hero quips, and the horror is still real.
5. **Something new every five minutes.** No zone repeats another zone's idea.

---

## 2. Tested facts and recipes

### 2.1 Versions and imports

```
npm i three@0.180.0 @dimforge/rapier3d-compat@0.19.3 playwright@1.63.0 \
      @fontsource/bangers@5.3.0 @fontsource/barlow-condensed@5.3.0 @fontsource/special-elite@5.3.0 @fontsource/creepster@5.3.0
```

- `esbuild` 0.28.2 is a global CLI here; call it with `execFileSync('esbuild', …)`.
- Import only from `three/webgpu`, `three/tsl` and `three/addons/…`. An addon that imports bare `three` is fine: in r180 both share `three.core.js` (checked: same `Object3D`).
- Do **not** add an esbuild alias for `three`. Aliases match by prefix and break `three/webgpu`.
- r180's class is `THREE.PostProcessing`. Newer docs call it `RenderPipeline`.
- The AI Hub repo's `lib/kit` targets r186 and Rapier 0.20. Don't use it; TASK.md's versions win.

### 2.2 Build: one file, everything inline

Inline Three.js, Rapier, fonts and the hub client. No CDN: it's 3–4 MB, opens from `file://`, runs offline, and stays clear of the hub's network rule in sessions. Tested shape of `tools/build.mjs`:

```js
execFileSync('esbuild', ['src/main.js','--bundle','--format=esm','--target=es2022','--minify',
  '--loader:.woff2=dataurl','--outfile=dist/bundle.js','--log-level=warning'], { stdio:'inherit' });
const client = readFileSync('hub/session.js','utf8').replace(/\n$/,'');       // never minify or edit it
const bundle = readFileSync('dist/bundle.js','utf8');                         // esbuild already escapes </script
writeFileSync('dist/game.html', ['<!doctype html>','<html lang="en"><head>','<meta charset="utf-8">',
  '<script>',client,'</script>', HEAD_TAGS, `<style>${css}</style>`, '</head><body>',
  '<script type="module">',bundle,'</script>','</body></html>',''].join('\n'));   // join, never String.replace: bundles contain $&
```

- Tests use `dist/game.html`. A `--release` flag copies it to the deliverable path from TASK.md.
- Fonts: `import url from '@fontsource/bangers/files/bangers-latin-400-normal.woff2'`, then `document.fonts.add(await new FontFace('Bangers', \`url(${url})\`).load())`. Same pattern for the other faces (`barlow-condensed-latin-600-normal`, `special-elite-latin-400-normal`, `creepster-latin-400-normal`). Tested from `file://`, including use in 2D canvases.

`HEAD_TAGS`, each `<meta>` written exactly as `name` then `content` (the hub reads them with a regex):

```html
<title>{TITLE} — {tagline}</title>
<meta name="description" content="{one or two sentences}">
<meta name="theme-color" content="#d9951f">
<link rel="icon" href="data:image/svg+xml,…a postage stamp with a bee…">
<meta name="hub:source" content="Resident Evil 4">
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1–4">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="6">
<meta name="hub:session-goal" content="Survive the Harvest Siege and top the score">
<meta name="hub:session-howto" content="Stick/WASD move · L2/RMB aim · R2/LMB fire · Cross/E kick · Square/R reload">
```

Do not add `hub:webgpu`: the game falls back to WebGL2. Goal stays under 60 characters, howto under 80.

### 2.3 Headless browser

Launch Chromium with **all five** flags, on the default headless shell:

```js
const browser = await chromium.launch({ args: ['--enable-unsafe-webgpu','--enable-features=Vulkan',
  '--use-vulkan=swiftshader','--use-webgpu-adapter=swiftshader','--use-angle=swiftshader'] });
```

- **TASK.md's three flags are not enough.** With only those, the device is lost right after the first render ("A valid external Instance reference no longer exists"), nothing draws, screenshots stay blank, and a frame counter still climbs to a false 60 fps.
- With all five, `page.screenshot()` shows the real WebGPU canvas, and a heavy scene runs at 1–3 fps.
- `channel:'chromium'` (new headless) aborts on this machine.
- A frame count proves nothing. Always watch these, and fail the test on any:

```js
renderer.backend.device.lost.then(i => state.deviceLost = i.message);
renderer.backend.device.addEventListener('uncapturederror', e => state.gpuErrors.push(e.error.message));
```

- Rapier's "using deprecated parameters for the initialization function" warning is harmless.
- Under pointer lock, Playwright's `page.mouse.move` produces absurd `movementX` values. Test mouse-look by dispatching `new MouseEvent('mousemove',{movementX,movementY})`.
- Firefox launched with default settings got no WebGL context here and threw inside `renderer.init()`. So catch that: if neither backend starts, show a plain "needs WebGPU or WebGL 2" card (in a session, call `AIHub.fail`). Run browser tests on Chromium; use WebKit for the fallback and phone profiles.

### 2.4 Rendering limits that fail silently

| Trap | What happens | Do this |
|---|---|---|
| `renderer.compileAsync()` with an MRT pass | Invalid pipelines ("Color target has no corresponding fragment stage output"); objects vanish | Never call it. Warm up by placing one of every prefab in view behind the loader and `await post.renderAsync()` once |
| More than 7 shadow-casting lights | Each costs 2 of the 16 sampled textures in every lit material. The 8th fails validation and materials disappear with no exception | Max **6** at once: sun plus a pool of 5. Non-shadow lights are effectively free (64 point lights on one toon material tested fine). Use them lavishly; TASK.md's unlimited budget still can't exceed this |
| Adding/removing lights, or toggling `visible`, during play | Changes the light set, which rebuilds lit materials and hitches (three's design; not timed here) | Fixed pool per zone; set `intensity = 0` |
| `computeVertexNormals()` on non-indexed geometry | Every facet becomes an ink line | Keep the primitives' smooth normals; merge indexed geometry |
| Compute shaders | WebGL2 fallback has none (three's design; not run here) | Animate FX in TSL (`instanceIndex`, `time`). 2,600 TSL bees tested on both backends |

Also tested:

- `WebGPURenderer` falls back to WebGL2 by itself (Chromium with no flags, WebKit), and the same TSL looks the same.
- A code-built `SkinnedMesh` (rigid segments, vertex colours, one merged geometry) with `AnimationMixer`, toon material and shadows works.
- These settings give the look in §2.5: `antialias:false`, `renderer.toneMapping = THREE.NoToneMapping`, `shadowMap.type = THREE.PCFShadowMap`, sun shadow camera ±45 m, 4096 map, `bias -0.0006`, `normalBias 0.03`.

Not tested, but the test scenes showed the need:

- Keep the sun's shadow camera centred on the player, since zones are bigger than its 90 m box.
- Backlit figures go nearly black. Add a weak non-shadow directional fill (about 0.6) parented to the camera, and check it in screenshots.

### 2.5 The look: `src/render/ink.js` (tested exactly as printed)

```js
import * as THREE from 'three/webgpu';
import { pass, mrt, output, normalView, uniform, Fn, vec2, vec3, vec4, float, screenUV, screenSize, screenCoordinate,
  luminance, smoothstep, mix, max, abs, fract, floor, step, time, sin, dot } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';

export const INK = {
  lineWidth: uniform(1.6), bands: uniform(5), boil: uniform(1.2), halftone: uniform(1), dotSize: uniform(7),
  ink: uniform(new THREE.Color(0x120c08)), on: uniform(1),
};

// One view of the scene through the filter. `view` maps the screen to this view's image, `xs` widens a texel for split screen.
export function inkView(scene, camera, view = screenUV, xs = 1) {
  const sp = pass(scene, camera);
  sp.setMRT(mrt({ output, normal: normalView }));
  const color = sp.getTextureNode('output'), normal = sp.getTextureNode('normal'), depth = sp.getTextureNode('depth');
  const node = Fn(() => {
    const px = vec2(xs, 1).div(screenSize), scale = screenSize.y.div(1080), tick = floor(time.mul(8));
    // Hand-drawn wobble: the sampling point drifts and "boils" at 8 Hz.
    const wob = vec2(sin(view.y.mul(90).add(tick.mul(1.7))), sin(view.x.mul(120).add(tick.mul(2.3)))).mul(INK.boil).mul(px).mul(scale);
    const at = view.add(wob), w = px.mul(INK.lineWidth).mul(scale.max(0.7));
    const n = (o) => normal.sample(at.add(w.mul(o))).xyz, d = (o) => depth.sample(at.add(w.mul(o))).r;
    const nEdge = n(vec2(1, 1)).sub(n(vec2(-1, -1))).length().add(n(vec2(1, -1)).sub(n(vec2(-1, 1))).length());
    const d0 = d(vec2(0, 0));
    const dEdge = abs(d(vec2(1, 1)).sub(d(vec2(-1, -1)))).add(abs(d(vec2(1, -1)).sub(d(vec2(-1, 1)))));
    const lineN = smoothstep(0.7, 1.15, nEdge).mul(float(1).sub(smoothstep(0.985, 0.9995, d0)));
    const lineD = smoothstep(0.0006, 0.0022, dEdge.mul(float(1).sub(d0).mul(40).add(0.4).max(0.25)));
    const line = max(lineN, lineD);
    const base = color.sample(view).rgb, lum = luminance(base).max(0.0001);
    // Posterise brightness, keep hue: every light falloff becomes a hard band.
    const flat = base.mul(floor(lum.mul(INK.bands).add(0.5)).div(INK.bands).max(0.06).div(lum));
    // Halftone only in the darkest bands; dots grow toward black.
    const c = screenCoordinate.xy.div(scale.mul(INK.dotSize));
    const dots = fract(vec2(c.x.mul(0.8).add(c.y.mul(0.6)), c.y.mul(0.8).sub(c.x.mul(0.6)))).sub(0.5).length();
    const inked = mix(flat, INK.ink, step(dots, smoothstep(0.30, 0.07, lum).mul(0.66)).mul(0.82).mul(INK.halftone));
    // Vignette and paper grain.
    const vig = smoothstep(0.95, 0.35, view.sub(0.5).length());
    const grain = fract(sin(dot(screenCoordinate.xy.add(tick), vec2(12.9898, 78.233))).mul(43758.5453)).sub(0.5).mul(0.035);
    return vec3(mix(inked, INK.ink, line.mul(0.95)).mul(mix(0.72, 1, vig)).add(grain));
  })();
  return { sp, color, node };
}

export function createInk(renderer, scene, camera) {
  const post = new THREE.PostProcessing(renderer);
  const v = inkView(scene, camera);
  const glow = bloom(v.color, 0.18, 0.3, 0.9);
  post.outputNode = vec4(mix(v.color.rgb, v.node, INK.on).add(glow.rgb.mul(0.6)), 1);
  return post;
}

// Lasers, smoke, sparks: transparent, no depth write, invisible to the edge detector.
export function asFX(material) {
  material.transparent = true;
  material.depthWrite = false;
  material.mrtNode = mrt({ normal: vec4(0, 0, 0, 0) });
  return material;
}
```

Materials: `new THREE.MeshToonNodeMaterial({ color, gradientMap })`, where `gradientMap` is a shared 5-texel `DataTexture` `[70,70,160,255,255]`, `RedFormat`, `NearestFilter`. FX: `asFX(new THREE.MeshBasicNodeMaterial({ color }))`. Palette swaps set `INK.ink`, fog, sky and light colours per zone.

**Split screen (tested).** Build `inkView(scene, camA, vec2(screenUV.x.mul(2), screenUV.y), 2)` and `inkView(scene, camB, vec2(screenUV.x.sub(0.5).mul(2), screenUV.y), 2)`, give both cameras aspect `(w/2)/h`, and composite with `mix(b.node, a.node, step(screenUV.x, 0.5))` plus a 6 px ink bar at the seam. Rebuild `post.outputNode` and set `post.needsUpdate = true` when entering or leaving split, so the second pass only runs when needed.

### 2.6 Rapier

- **Queries see nothing until the first `world.step()`.** Step once after building a zone, before baking nav.
- **Terrain:** a trimesh from the same vertices as the visible mesh (`ColliderDesc.trimesh(new Float32Array(pos.array), new Uint32Array(index.array))`) matches to 2 µm. Heightfield index order is easy to get wrong; skip it.
- **Actors:** kinematic position-based body, capsule collider, one `world.createCharacterController(0.02)` each: `setUp({x:0,y:1,z:0})`, `setMaxSlopeClimbAngle` (50°, in radians), `enableSnapToGround(0.35)`, `enableAutostep(0.4,0.2,false)`, `setSlideEnabled(true)`. Feed the delta to `computeColliderMovement(collider, delta, QueryFilterFlags.EXCLUDE_SENSORS, filterGroups)`, then `setNextKinematicTranslation(p + computedMovement())`.
- **Rays and shape casts hit sensors** unless you pass `QueryFilterFlags.EXCLUDE_SENSORS`.
- **Collision groups** are `(membership << 16) | filter`, on colliders and as `filterGroups`. This table is the plan's design; only the ragdoll's group value was run:

| Group | Bit | Collides with |
|---|---|---|
| STATIC | 1 | everything |
| PLAYER | 2 | static, prop, enemy |
| ENEMY | 4 | static, prop, player (not other enemies: crowds separate by steering, otherwise they jam) |
| PROP | 8 | static, player, enemy, prop, ragdoll |
| RAGDOLL | 16 | static, prop |
| SENSOR | 32 | none (triggers use your own box tests) |

- **Ragdoll:** capsule bodies with `RAPIER.JointData.spherical(anchorA, anchorB)` via `world.createImpulseJoint`, `setAngularDamping(0.6)`. Stable in test.
- **Budget:** 60 character controllers, 30 dynamic bodies, a 29k-triangle trimesh and 8 rays cost ~6 ms per step, so the sim runs ~170 steps/s with no renderer. That is why tests skip rendering (§15).

### 2.7 AI Hub: what passes

Fetch once with `curl -fsSO` into `hub/`, from `https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/`: `session.js`, `harness.html`, `bridge.js`, `round.js`, `README.md`, `examples/arena.html`. Read the README: it is the contract. This skeleton passed every harness scenario with a heavy WebGPU scene in every copy (2 and 4 players on a poor network, host leaving, server copy):

```js
const info = await AIHub.connect({ mode:'shared-world', seats:[1,4], card:true });
if (!info) return startStandalone();             // not in a session: title screen, attract, everything
// A session opens straight into the round: no title, menus or prompts other than the card.
addEventListener('keydown', e => { if (e.key === 'Enter') AIHub.answer('ready'); });
AIHub.on('card', c => drawCard(c));
if (!info.server) startRendererInBackground();   // never block ready() on shaders; a server copy never renders
await RAPIER.init();                             // about 30 ms
buildSimAndArena();
AIHub.ready();                                   // once, no key press
AIHub.on('start', () => unlockAudio());
AIHub.on('message', (data, from) => net.receive(data, from));
AIHub.on('leave', ({ id }) => sim.dropPlayer(id));
AIHub.on('time-up', () => { if (AIHub.isHost) finishRound(); });   // at once, in the handler: graceMs is 5 s
AIHub.on('end', ({ reason }) => endRound(reason));                  // stop input, sends and sound; hub shows results
setInterval(pumpSimAndNet, 50);                  // a timer, not rAF: four software-rendered copies crawl
// Play begins when AIHub.time() >= 0; draw the countdown before that.
```

Details that fail the check if missed:

- The pasted client must be byte-exact and appear **once**. For client 1.4.0, SHA-256 from `/*! aihub-session ` through its last line (LF endings) is `529eac78c54cfff0e60d375a9c63f66d1a594327ddcc262a2bdf9b1f2fb6582a`; if you fetch a newer client, trust the fetched files and skip this hash. Never put the banner text anywhere else in the page.
- Any `[AIHub]` console warning fails, so never exceed 20 sends/s (burst 40) or 16 KB. Keep your own token bucket at 18/s and keep unreliable messages under 1,100 bytes.
- No `alert`, `confirm`, `prompt`, `window.open`, sockets, navigation or external `fetch`. Catch every promise (`requestPointerLock()`, `requestFullscreen()`, `playEffect()`, `audio.resume()`): an unhandled rejection counts as an error.
- The harness pokes synthetic keys with `code:'w'`, not `KeyW`. Map by `e.code`, falling back to `e.key`.
- On its own the game must draw and survive Enter/Space presses with no errors, and must leave `Math.random` alone. A DOM title over the canvas guarantees the "drawn" check even if WebGPU is unavailable.
- In a session `localStorage` is an empty in-memory copy, so never depend on saved data there. Hub names are text: `textContent` only.
- `Create + Options` belongs to the hub: ignore Options while Create is held.

Run it like the hub does. Serve your dev folder from Node (`server.listen(0,'127.0.0.1')`), open with the five flags plus `--no-sandbox --autoplay-policy=no-user-gesture-required`, viewport 1280×860:

```
/hub/harness.html?game=/dist/game.html&players=N&latency=150&jitter=50&loss=5&auto=1&scenario=S&play=8000
```

Wait for `body[data-complete="true"]`, then require `window.__hubCheck.pass`. Scenarios: `players=2,3,4` with `standard`, `players=3` with `host-leave`, `players=2` with `server`. Each took 10–15 s here.

---

## 3. Architecture

```
tools/build.mjs  tools/test.mjs
hub/             session client, harness (fetched, unedited)
docs/CONTENT.md  how to add a zone, enemy, weapon, item, script command (the designer's manual)
STATUS.md        your own progress notes, so a context reset costs nothing
src/main.js      boot: session / standalone / test modes
src/core/        loop, rng, events, tunables, save, coverage
src/input/       action map, gamepad, keyboard+mouse, device tracking, virtual pads, bot injection
src/phys/        Rapier wrapper: statics from pieces, character controllers, queries, ragdolls, debris
src/sim/         player, weapons, damage, enemies + AI, nav, partner, director, inventory, shop, qte, script runner, triggers, bosses, siege, chapter flow
src/content/     DATA ONLY: identity, weapons, items, enemies, shop stock, tunable defaults, zones/*, dialogue, documents, music patterns
src/art/         palette, toon materials, prefab kit, character builder + outfits, weapon models, clip library, FX
src/render/      renderer start, ink, light pool, camera rig, split screen, view sync
src/audio/       engine and buses, reverb, sfx recipes, voice, music
src/ui/          focus engine, glyphs, HUD, all screens, comic cutscene overlay
src/net/         hub session flow, snapshot codec, rate limiter
src/bot/         one brain shared by attract mode and the playthrough test
tests/
```

**Sim and view are separate.** `src/sim` never touches the renderer, the DOM or audio. It owns state and may own CPU-only `Bone` hierarchies, because hit zones and mixers run there. It emits events on a bus; view, audio, UI and net subscribe. `?test=1&norender=1` runs the same code with no renderer at all, stepped by hand.

**The sim is an object you can create and throw away,** with no module-level state: attract mode, retries and tests each make their own. On zone change call `world.free()` and dispose the old geometries and materials, so attract can loop for hours without running out of memory.

**Loop.** Fixed 60 Hz:

```js
acc = min(acc + realDt * timeScale, 0.25); while (acc >= STEP) { sim.step(STEP); acc -= STEP; }
```

- `timeScale` handles hit-stop and slow motion by changing the step count; `dt` is never varied.
- Rendering uses `renderer.setAnimationLoop`.
- In a session a 50 ms `setInterval` also pumps the sim and net. A server copy has only the timer.
- Standalone pauses on `visibilitychange`; sessions never pause.

**Determinism.** All sim randomness comes from seeded streams in `core/rng.js` (from `AIHub.rng('siege')` in a session). `Math.random`, `Date.now` and `performance.now` are banned in `src/sim`, and a test greps for them. Visual-only randomness uses a separate cosmetic stream.

**Tunables.** `tunables.define('enemy.hpMult', { label, min, max, step, def, group })`. Gameplay reads `T.enemy.hpMult` every time and never caches it, so dev sliders apply live. Defaults live in `src/content/tunables.js`.

**Content is data.** So the rest of the game can be built later with ordinary tools, every zone, enemy, weapon, item, shop list, dialogue line and script is plain JSON-able data, documented in `docs/CONTENT.md`. A zone:

```js
{ id:'ch1.lane', title:'Hive Lane', palette:'dusk', music:'explore', reverb:'outdoor', size:[30,120],
  terrain:{ seed:11, bumps:0.4, path:[[15,0],[14,60],[16,120]] },
  pieces:[ {kit:'fence',at:[4,0,10],ry:0,len:30}, {kit:'farmhouse',at:[24,0,40],ry:-90,windows:['vault']} ],
  lights:[ {kind:'lantern',at:[12,3,30]} ],
  entry:{at:[15,0,2],ry:0}, exits:[ {to:'ch1.square',box:[10,0,118,20,3,120]} ],
  spawns:[ {id:'e1',type:'sweetened',gear:'pitchfork',at:[14,0,40],wake:'seen'} ],
  pickups:[ {item:'ammo9',n:15,at:[22,1,38],in:'crate'} ],
  triggers:[ {box:[10,0,30,20,3,34],once:true,run:'ambush'} ],
  scripts:{ ambush:[ ['say','dash','Friendly town.'], ['wake','e1'], ['music','tension'] ] },
  bot:[ ['go',[15,50]], ['fight'], ['go',[15,118]] ] }
```

Script commands, the single language for level events and cutscenes: `say radio cam anim move wait wake spawn give flag if music sfx qte letterbox panel fade objective gate save chapterEnd`. Dev mode can copy the current zone as JSON and load a zone JSON dropped on the window.

**Nav.** At zone load (after one `world.step()`), rasterise a 0.5 m walkable grid with down-rays and capsule overlap tests, with an 8-neighbour step-height check. `flowTo(target)` is a Dijkstra flow field, cached per target cell and refreshed at 4 Hz. Enemies, Winnie and the bot all use it, adding separation steering for crowds. Ladders, windows and gaps are explicit links that carry the action to play.

**Hits.** Bullets ray-cast statics with `EXCLUDE_SENSORS` to get a stopping distance, then test ray against analytic capsules built from bone world positions (head sphere, torso, 2 arms, 2 legs). Deterministic, precise and independent of the renderer.

**Test hook.** `window.__GAME`:

- `state()`: mode, screen, chapter, zone, objective, cutscene, qte, focus, last device, player hp/ammo/weapon/pos, enemy count, partner, money, backend, `deviceLost`, `gpuErrors`, audio gains, coverage.
- `step(n)` and `input(padState)`.
- `teleport`, `setFlag`, `goZone`.

---

## 4. Controls and feel

### Controls

Prompts always show the current device (§13).

| Action | DualSense (standard index) | Xbox glyph | Keyboard + mouse |
|---|---|---|---|
| Move | Left stick | LS | WASD |
| Look / aim | Right stick | RS | Mouse |
| Aim (hold) | L2 (6) | LT | Right mouse |
| Fire / throw | R2 (7) | RT | Left mouse |
| Context: interact, kick, QTE | Cross (0) | A | E (Space also kicks and answers QTEs) |
| Reload | Square (2) | X | R |
| Parcel Case | Triangle (3) | Y | Tab |
| Knife, parry | L1 (4) | LB | V |
| Winnie: Follow / Wait | R1 (5) | RB | C |
| Quick-turn; Back in menus | Circle (1) | B | Q; Esc in menus |
| Sprint | L3 (10) toggle | LS click | Shift (hold) |
| Swap shoulder | R3 (11) | RS click | Middle mouse |
| Quick slots (weapons, grenades) | D-pad (12–15) | D-pad | 1–4, wheel cycles |
| Map and files | Touchpad (17) or Create (8) tap | View | M |
| Pause | Options (9) | Menu | Esc |

### What the player can and can't do

Teach this in play, and repeat it in the Field Manual:

- You can't shoot while sprinting.
- There is no free jump: vaults, ladders and gaps are prompted.
- Aiming slows you to a shuffle.
- Fire without aim raises the weapon for 1.2 s rather than doing nothing.
- A locked door says why, with a prompt and a sound.

### Feel numbers

All are tunables.

| Thing | Value |
|---|---|
| Walk / sprint / aim shuffle | 3.2 / 5.4 / 0.9 m/s (shuffle slider reaches 0 for true planted feet) |
| Explore camera | offset right 0.55, up 1.62, back 2.4; FOV 58; spring arm with a 0.2 m `castShape` so it never clips walls |
| Aim camera | offset 0.42, 1.55, 1.25; FOV 42; 0.16 s ease |
| Scope | first-person at eye, FOV 18 (×3) and 9 (×6) |
| Stick look | explore 150°/s, aim 70°/s, with a squared response curve and 0.15 radial dead zone |
| Laser | real 3D beam from muzzle to first hit (`asFX`), glowing dot at the hit. Sway starts at 1.2° and settles to 0.3° over 0.6 s; moving resets it |
| Aim assist (pad only) | sensitivity ×0.55 within 2.5° of a head or chest; on L2 press, pull to the nearest target within 6°. Slider 0–100% |
| Mouse | 0.12°/count, no assist, pointer lock in play |
| Hit-stop | 60 ms at timeScale 0.2 on kicks, slams, crits; camera kick and shake scaled by a setting |
| Kick | 0.75 s, invulnerable the first 0.5 s, 200° arc radius 2.4 m, knocks everyone down |
| Knife | 0.35 s, range 1.6 m; a 0.18 s parry window deflects thrown objects and staggers melee attackers |
| Pad rumble | `gamepad.vibrationActuator?.playEffect?.('dual-rumble', …).catch(…)` on shots, hits, QTEs; setting to disable |

Pointer lock: request on a click in play, catch rejection, and if lost mid-play (Esc does this without a keydown) open pause via `pointerlockchange`. Chrome refuses re-lock for about a second after Esc, so show "Click to resume" rather than retrying. When unlocked, `movementX/Y` still drive look.

---

## 5. Combat

### Hit zones and reactions

The heart of the game.

| Zone | Damage | Reaction | Opens |
|---|---|---|---|
| Head | ×2.5, crit 12% chance for kill | Hands to face, 1.4 s stagger (if damage ≥ 12) | **Kick** prompt within 2.2 m |
| Leg | ×0.8 | Kneels, 2.2 s | **Slam** prompt ("Fragile"), 70 damage |
| Arm | ×0.7 | Flinch 0.8 s, drops weapon, fights bare-handed | — |
| Body | ×1 | Small flinch; interrupts a windup if damage ≥ 20 | — |
| Downed | — | On the ground 2 s | **Stomp** prompt, 60 damage |
| Behind, unaware | — | Sneak approach | **Silent Stab** prompt, instant kill on basics |

Arithmetic the player discovers: pistol head (45) + kick (40) kills a 60 HP Sweetened with one bullet.

Feedback:

- Comic burst sprites at the hit: BLAM, KRAK, THWAK, SPLAT, BZZT, in Bangers on `CanvasTexture`, with a setting to turn them off.
- Ink-and-honey splats instead of realistic gore.
- A small tick on hit, a bigger one on head.
- Neighbours pause 0.2 s when someone near them is kicked.

### Weapons

Prices in zlats (Zl). Case size is w×h cells.

| Id | Name | Size | Mag | Damage | Cadence | Reload | Notes | Price / source |
|---|---|---|---|---|---|---|---|---|
| pistol | Mailguard Service Pistol | 3×2 | 15 | 18 | 0.30 s | 1.6 s | Laser steadies fastest | Start |
| shotgun | Registered Pump | 7×2 | 6 | 9 × 8 pellets | 0.95 s | 0.5 s/shell | 6° cone, falloff past 12 m, knocks groups back | Free in Post Office, or 3,000 |
| rifle | Airmail Bolt Rifle | 8×2 | 5 | 110 | 1.4 s | 2.6 s | Scoped, pierces 2, takes the UV lens | 6,000, or Test Range prize |
| smg | Bulk Rate SMG | 4×2 | 30 | 8 | 0.085 s | 2.0 s | Spread blooms; plentiful ammo | 7,500 (ch3) |
| magnum | Final Notice Magnum | 4×2 | 6 | 140 | 1.1 s | 2.8 s | Pierces 3, heavy kick | 18,000 (ch4) |
| launcher | Express Parcel | 8×2 | 1 | 2,500 in 6 m | single use | — | One shot, then gone | 25,000 (ch4), free at finale |
| frag | Parcel Bomb | 1×2 | — | 200 in 5 m | — | — | Cook-free; arc shown on aim | Drop, 450 |
| smoke | Smoker Can | 1×2 | — | Stuns 6 s in 6 m | — | — | Kills a Hivehead's swarm outright | Drop, 300 |
| flame | Flame Bottle | 1×2 | — | 25/s in 3 m for 6 s | — | — | Panics crowds, burns wicker and wax | Drop, 350 |
| knife | Letter Opener | — | — | 14; 30 on staggered | 0.35 s | — | No ammo; breaks crates; parries | Start |

**Tuning at Fenwick:** Power, Cadence, Reload, Capacity, 5 levels each (+12% per level; capacity +25%). Level prices 500 / 1,200 / 2,500 / 5,000 / 9,000 × tier (pistol, shotgun 1; rifle, smg 1.3; magnum 2). Maxing all four unlocks one Exclusive: pistol crit ×5, shotgun double pellets, rifle power ×1.5, smg capacity ×3, magnum power ×2.

### Enemies

Damage is to the player (100 HP base, 200 max).

| Type | HP | Speed | Attacks | Rules |
|---|---|---|---|---|
| Sweetened | 60 | 1.4–2.2 m/s, bursts 3.4 | Pitchfork 18 (thrust 2 m, 0.7 s windup), sickle 14, grab 8/s until mashed free | Amber eyes, hums, may open doors, climbs ladders |
| Thrower | 50 | 1.6 | Hatchet 16; honey jar makes a slick that slows you | Keeps 8–15 m away; projectiles can be shot or parried |
| Hivehead | 70 (comb) | 1.8 | Dart 10 at range, swarm 6/s nearby | From chapter 2, a headshot kill has a 25% chance (+5% per chapter) of bursting the neck into a dripping comb with an orbiting swarm. Smoke or fire kills it instantly |
| Keeper | 90 | 1.5 | Flame smoker cone 12/s at 4 m | Veil hat absorbs the first head hit; shooting the tank on the back explodes it |
| Harvester | 900 | 2.0, charges 4.5 | Motor-saw: kills on Standard and Priority Mail, 70 on Assisted, after a 1 s telegraph | Woven skep head. Heard before seen. A head hit ≥ 60 staggers 2 s. Drops a 2,500 Zl gem |
| Monk | 80 | 1.8 | Censer flail 20 | Abbey basic |
| Shield Monk | 80 + 60 shield | 1.4 | Shove 15 | Hive-frame shield blocks the front; aim at the legs or break it |
| Crossbow Monk | 60 | 1.4 | Explosive bolt 35 in 2 m | Keeps range; laser-painted warning line before firing |
| Catapult crew | 60 each | — | Honey pot 30 in 3 m, burning pool | Kill the crew or shoot the pot in flight |
| Choir Monk | 50 | 0.8 | None | Chant makes nearby enemies 25% faster and tougher. Kill first |
| Penitent | 1,400 (back comb only, hits there ×2) | 1.2, charges 6 | Claw 60, charge 80 | Blind: hunts by sound (below). When a charge hits a wall it is stuck 3 s with its back open |
| Wax Effigy | Immortal until 2–4 queen cells (40 HP each) die | 1.0 | Grab 40 | Stands still until you pass. Limbs re-form. Cells show only through the UV lens |

**Crowd rules, which make or break the feel:**

- At most `T.enemy.maxAttackers` (default 3) hold an attack token. Others circle at 2.5–4 m, shuffle and hum.
- Tokens re-issue after 0.5–1.4 s per enemy.
- Every melee attack has a visible, audible windup.
- Anyone off screen behind the player doesn't attack in the first 1.5 s after arriving.
- Interrupted windups go on cooldown.

**Perception.** Each enemy has a vision cone (100°, 25 m) plus noise events with a radius: gunshot 30 m, sprint 10 m, walk 3 m, shuffle 0. Gunshots wake neighbours.

**Director.** Tracks accuracy, damage taken, ammo and health. Enemy aggression moves ±15%.

| Drop rule | Value |
|---|---|
| Chance a kill drops something | 55% |
| Zlats | 45% (40–120 Zl) |
| Ammo for a weapon you own, weighted to what you lack | 35% |
| Yarrow | 12% |
| Grenade | 8% |

**Difficulty.** Selected at New Game.

| | Enemy damage | Enemy HP | Drops | QTE window |
|---|---|---|---|---|
| Assisted | ×0.6 | ×0.8 | ×1.3 | ×1.5 |
| Standard | ×1 | ×1 | ×1 | ×1 |
| Priority Mail | ×1.4 | ×1.25 | ×0.8 | ×0.8 |

**Environment.**

- Explosive mead barrels: 150 in 4 m.
- Hanging hives: shoot to drop a swarm on whoever is below.
- Bear traps (shootable, hold you 1.5 s, 15 damage).
- Tripwire charges.
- Breakable crates and pots (contain pickups).
- Sprint into a door to kick it open, knocking down anyone behind it.
- Lanterns: shoot to spill burning oil.

---

## 6. Case, items, money, saving

**Parcel Case.** Grid 10×6, upgraded to 12×7 (8,000 Zl, ch2) and 14×8 (20,000 Zl, ch4). Items occupy shaped rectangles and rotate.

| Item | Size | Stack |
|---|---|---|
| Pistol ammo | 1×1 | 30 |
| Shells | 2×1 | 15 |
| Rifle ammo | 2×1 | 10 |
| SMG ammo | 2×1 | 60 |
| Magnum ammo | 2×1 | 10 |
| Herbs, grenades | 1×2 | 1 |
| Cough Drops | 1×1 | 3 |

Treasures go in a separate Pouch and keys on a Key Ring; neither uses grid space. Full case: a prompt to rearrange, discard or leave it. Picking up with no room opens the case with the item floating on the cursor.

**Healing is herbs, because the honey is poison.** The player learns that in the first zone.

| Mix | Effect |
|---|---|
| Yarrow | +30 HP |
| Yarrow + Yarrow | +60 HP |
| Yarrow × 3 | Full heal |
| Yarrow + Foxglove | Full heal |
| Yarrow + Foxglove + Goldenseal | Full heal, +20 max HP |
| Cough Drop (from Winnie) | +10 HP, instant, no case time |

**Money.** Zlats. Target income: ch1 ~6k, ch2 ~12k, ch3 ~15k, ch4 ~20k, ch5 ~15k.

- Treasures sell for 500–8,000 Zl. Gems set into the Reliquary of St. Melisende (3 sockets) sell for far more than apart: greed made visible.
- **Dead Letters:** 12 wax-sealed envelopes hanging on strings: 1 in zone 1.2, 4 in 2.1, the rest spread through chapters 3–5. Shoot them down. Rewards at 6 and 12 from Fenwick (a stamp album worth 5,000 Zl, then a free Tune level on any weapon).
- Treasure Map (1,000 Zl) marks all of it.

**Fenwick.** Found at the end of zone 1.4, in 2.1, 3.2, 4.1, between 4.3 and 4.4, and before 5.1. Announced by a music-box jingle, a striped umbrella and a lit lantern visible from afar. The shop pauses play.

**Save.** Mailboxes at the start of most zones: "Mail a Report" saves to `localStorage` in a versioned JSON blob wrapped in try/catch (slot auto, plus chapter, inventory, upgrades, flags, stats). Settings save separately. Death reloads the last zone-start checkpoint with the inventory you entered with. `Continue` loads the last report.

---

## 7. Winnie (partner AI)

1.50 m, 60 HP, follows at 2.5 m on the flow field, walks fast and complains about it.

- **Follow / Wait** (R1 / C). Wait near a hive box or wardrobe makes her hide inside, untargetable ("At my age.").
- **Line of fire.** She ducks automatically when your laser crosses her. Your bullets can still hit her if you're careless.
- **Handbag swat.** Hits an adjacent enemy every 8 s and staggers it. This opens your Kick prompt.
- **Cough Drop.** When you drop below 30 HP she tosses one (30 s cooldown).
- **Grabbed.** Enemies can seize her and carry her toward the nearest exit; shoot the carrier's legs. Carried out after 12 s, or reduced to 0 HP: game over.
- **Abilities used by level scripts.** Pick a lock (8 s, you defend her), boost over a wall, jump you catch (QTE).
- **Healing her:** when she's hurt, stand beside her for a "Give Herb" context prompt that uses your weakest herb.
- **Idle behaviour:** she knits. Every kill near her can draw a remark, with a shared 12 s cooldown.

HUD gets a small second stamp with her HP and Follow/Wait state whenever she's with you.

---

## 8. Campaign

Every zone: a landmark visible from the entry, a golden path lit by amber lanterns, at least one optional nook with treasure, no unexplained invisible walls. Interiors have corridors ≥ 3 m wide and ceilings ≥ 3 m so the camera has room. Enemy counts below are design targets at Standard; add more if the scene wants them, since TASK.md puts no limit on detail or enemies.

### Chapter 1: Return to Sender (Sladka village, dusk)

- **1.1 Crash Field.** Comic-panel intro. Biplane swarmed by bees, crash-lands among hives and flowers. Teach move and look. Take the Parcel Case from the wreck (case tutorial: place ammo, rotate an item). An old farmer holds out a honey spoon and prompts "Decline" or "Shoot"; either way his smile widens and he comes at you (aim and fire tutorial). 2 more climb from the hives. First radio call. First mailbox: save tutorial.
- **1.2 Hive Lane.** Walled lane, side farmhouse. 5 Sweetened, 1 Thrower on a roof. Stagger + Kick tutorial, window vault, knife a crate, bear trap and tripwire lesson, first treasure, first Dead Letter.
- **1.3 Festival Square.** Bunting, bonfire, mead barrels, and a parade float carrying a 6 m papier-mâché Winnie in a crown. 16 Sweetened, 2 Throwers, all humming. They notice you. At 45 s or 8 kills a motor coughs to life: the Harvester. Objective: reach the Post Office on the north side.
- **1.4 Sladka Post Office.** Two floors and a back yard. Push sorting cabinets across 3 windows and the door (each takes a prompt and time). Shotgun upstairs. Ladders hit the upper windows: kick them away. Mail chute drops you from upstairs to the cellar as an escape. Siege lasts 100 s, about 30 enemies in waves; the Harvester breaks the door at 60 s. At 100 s a distant organ note drifts across the valley; every enemy stops, sets down its weapon and walks away in step, humming. Back yard: Fenwick and the first shop (buy, sell, tune tutorial). Results: **DELIVERED** stamp.

### Chapter 2: Postage Due (Apiary Terraces, gold noon)

- **2.1 Apiary Terraces.** Big three-level hillside with ramps and ladders, three routes. About 20 enemies spread out; Keepers, Throwers (parry lesson) and the first Hivehead burst, then smoke grenades (Dispatch explains smoke calms bees). Hanging hive traps. 4 Dead Letters, Treasure Map for sale. **Fenwick's Test Range** tent: a 60 s shooting-gallery run (below).
- **2.2 Wax Mill.** Interior plus waterwheel. Lever puzzle: 3 sluice levers, order hinted by a document. Starting the wheel raises the bridge and draws a 40 s attack. Hanging wax vats: shoot to spill on anyone below. Earns the Field Gate crest.
- **2.3 Harvest Field. Boss: the Effigy and the Mayor** (§8.6).

**Test Range.** Pick from 3 loaned weapons. Flat cut-outs pop on rails: Sweetened (+points), Mail Carriers (−points, don't shoot), Bonus Bees (fast). Three score tiers pay a Commemorative Stamp, with the rifle free at top tier. Also playable from the title once found.

### Chapter 3: Signature Required (Chapel and gorge, blue night, amber lamps)

- **3.1 Chapel of St. Melisende.** Graveyard, then nave. Bell puzzle: a cursor-driven close-up of 4 hand bells. Mouse hovers and clicks; pad moves focus. The order comes from a hymn sheet. Opens the crypt. Winnie is in a cell, already beating a Sweetened with her handbag. Escort begins. Crumbling floor: she jumps, you catch (QTE).
- **3.2 Night Lane.** Sladka by night, 15–20 enemies. Follow/Wait in earnest. First carrier grab. Hide her in a hive box while you clear. Boost her over a wall to open a gate from the far side. Lockpick-and-defend for 8 s. Fenwick under the lych-gate (SMG).
- **3.3 Gorge Wagon.** 90 s on rails down the gorge on a runaway honey wagon; Winnie works the brake and shouts. Free aim and fire from the moving wagon, targets on trestles and in pursuit carts, duck and jump QTEs (press, mash), hanging hives, a collapsing bridge. Crash at the Abbey gates. Prior Vosk reveals the prophecy over the abbey's speaking-tubes.

### Chapter 4: Dead Letter Office (Mead Abbey, violet moon, bone)

- **4.1 Abbey Ramparts.** Courtyard and walls. Catapult crews, Crossbow and Shield Monks. Reach the mounted **Mead Cannon** on the wall (turret mode: R2 fires, it overheats) and clear the courtyard. Fenwick in the gatehouse (magnum, launcher). A hook snatches Winnie through a window: "Bring a coat, young lady!"
- **4.2 Abbey Library. Play as Winnie, 3 minutes.** She can't aim or fight. She walks, throws books (noise lure, uses the sound system), hides in wardrobes, and swats from behind to stagger and slip past. Monks carry lanterns whose light pools show where they can see. Caught: back to the cell, with a new insult. Goal: reach the pneumatic mail tube and send Dash the Abbey plans, then open the portcullis. Dash comments by radio.
- **4.3 Reliquary Catacombs.** Part A, the Penitent's hall: walk or shuffle, never sprint or fire near him without a plan. Shoot a hanging bell to lure him, bait a charge into a wall, then shoot the back comb. Part B, the Wax Corridors: the darkest place in the game. A UV lens waits in a chest at the entry (Dispatch: "Bees see ultraviolet"). Effigies stand motionless until you pass, then walk. Through the lens, queen cells glow. Kill all the cells.
- **4.4 Dead Letter Office. Boss: Trent Vail** (§8.6).

### Chapter 5: First Class (Organ Nave and Honey Crypt, crimson and gold)

- **5.1 Organ Nave. Boss: Prior Vosk** (§8.6).
- **5.2 Honey Crypt. Boss: Queen Regina, then the escape** (§8.6). Ending panels, credits, results, and a last telegram (§9).

### 8.6 Bosses

Each is a data-driven phase machine in `src/sim/bosses/`. Every boss exposes `botHint()` so the bot can beat it.

**Effigy and Mayor** (2.3). A 12 m wicker giant with the Mayor on its shoulders shouting through a megaphone, in a 110 m field with 3 stone wells and exploding hay wagons.

- Attacks: stomp (ring shockwave, 6 m, telegraphed), swing an uprooted tree, Mayor lobs bomb jars.
- Loop, 3 rounds: shoot the 2 shoulder fire pots (120 HP each). The straw ignites and it panics, lumbers to the nearest well and kneels to douse itself. Get close: Cross to climb, mash to scale its back, press to cut the rope lacing and fall clear (QTE). The chest opens: 20 s to shoot the comb heart (800 HP per round).
- End: collapse in flames, dodge QTE. The Mayor, crushed: "I demand… a recount."

**Trent "Dead Letter" Vail** (4.4). A huge mail-sorting hall with conveyors, pigeonholes and pneumatic tubes. Opens with a dialogue duel of 6 knife QTEs mixed into his monologue; a miss costs health, not death.

- Then the fight, 2,200 HP: he dashes between pillars, throws blades (parry them), lays tripwire charges (phase 2), and rushes with a long combo you must parry (phase 3; a perfect parry opens a heavy Kick).
- Reward: the Postmaster's Key.

**Prior Vosk at the Organ** (5.1). The 40×80 m nave. Vosk at the console in the gallery, 3.2 m tall on hidden stilts. **Four pipe ranks are the music and the attacks.** Each has a glowing bellows valve (500 HP). Destroying a rank ends its attack and mutes its voice in the score:

| Rank | Attack |
|---|---|
| Pedal | Floor shockwaves |
| Tenor | Swarm column that chases you |
| Alto | Summons Choir Monks |
| Soprano | Rains shards of stained glass |

With all four silent, he descends in terrible quiet. Stilt sweeps (40). Shoot both stilts (300 HP each) to topple him, then a big prompted melee. 1,800 HP. "You have… no ear…"

**Queen Regina** (5.2). A 14 m bloated queen in a honey lake ringed with walkways. Winnie, being "crowned", shrugs off the ceremony: she has been stung so often she's immune.

- 6,000 HP, damaged only through her 3 crown combs, and only while they are smoked open.
- Phase 1: swarm waves, spit pools. Winnie walks through the swarm to crank a giant smoke bellows; protect her for 6 s to open the combs for 12 s.
- Phase 2, below 50%: tail slam lanes, a wall of bees that hurts everywhere outside the smoke (15/s).
- Phase 3, below 15%: Winnie hurls the launcher from the balcony: "Young lady! Special delivery!" Pick it up, one slow-motion shot; a miss gives a second chance.
- Escape: 90 s run through the collapsing crypt with honey rising behind you, Winnie in tow, 2 gap QTEs, up to Fenwick's mail biplane ("Door-to-door aviation, neighbor!").

### 8.7 Feature coverage

Record each id with `coverage.hit(id)` where it happens. The full playthrough plus the UI tests must hit all of them. A test fails on any missing.

| Area | Ids |
|---|---|
| Move | `sprint` `quickturn` `shoulder_swap` `vault` `ladder_climb` `ladder_kick` `door_kick` `gap_jump` `push_cabinet` `mail_chute` |
| Shoot | `aim` `fire` `reload` `headshot` `leg_kneel` `arm_drop` `crit` `pierce` `scope` `shoot_projectile` `grenade_frag` `grenade_smoke` `grenade_flame` |
| Melee | `kick` `slam` `stomp` `silent_stab` `knife` `parry` `grab_break` |
| World | `barrel` `hive_drop` `bear_trap` `tripwire` `crate_break` `vat_spill` `lantern_spill` |
| Enemies | `kill_sweetened` `kill_thrower` `hivehead_burst` `hivehead_smoked` `kill_keeper` `kill_harvester` `kill_monk` `kill_shield` `kill_crossbow` `kill_catapult` `kill_choir` `kill_penitent` `wax_cell` `kill_wax` |
| Case | `case_open` `case_rotate` `case_sort` `case_full` `combine_herb` `use_heal` `max_hp_up` `discard` `pouch` `key_item` |
| Economy | `shop_buy` `shop_sell` `shop_tune` `exclusive` `treasure_socket` `dead_letter` `treasure_map` `case_upgrade` |
| Save | `save_mailbox` `continue_load` `game_over` `retry` |
| Story | `radio_call` `cutscene_skip` `file_read` `map_open` `qte_press` `qte_mash` `qte_alt` `qte_miss` |
| Winnie | `partner_follow` `partner_wait` `partner_hide` `partner_grab_saved` `partner_swat` `partner_lockpick` `partner_boost` `partner_catch` `partner_cough_drop` `partner_heal` |
| Set-pieces | `siege_post_office` `organ_note` `range_game` `puzzle_levers` `puzzle_bells` `rail_ride` `mounted_gun` `play_winnie` `book_lure` `sound_stealth` `uv_scope` `escape_run` |
| Bosses | `boss_effigy` `boss_trent` `boss_organ` `organ_rank_muted` `boss_queen` `launcher_finish` `ending` |
| Modes | `results_screen` `attract` `attract_exit` `siege_round` `siege_revive` `mail_drop` `couch_join` `dev_mode` `dev_slider` `dev_reset` `settings_change` `glyphs_xbox` `manual_open` `about_open` |

---

## 9. Story and writing

**Tone.** Pulp B-movie played dead straight, in the source's spirit but entirely its own. Short lines. Heroes quip, villains monologue and overact. Nobody winks at the camera. Dialogue is English subtitles over gibberish voices (§12), so the writing carries everything: captions are always on.

**Cast.**

- **Dash Mercer** (she), 38, U.S. Postal Inspector. Deadpan. Navy pea coat, peaked cap, mustard satchel strap. Keeps a mental tally of postal violations.
- **Dispatch, Deputy Postmaster Ozzie Quill** (he), on the radio. Dry. Treats horror as paperwork.
- **Mrs. Winifred "Winnie" Pruitt** (she), 74, the First Mother. Lavender suit, pillbox hat, steel-clasp handbag. Calls Dash "young lady".
- **Mr. Fenwick** (he). Seersucker suit, boater, bee veil, cart with striped umbrella. Unstoppably upbeat. "Territory's territory, neighbor."
- **Mayor Bogdan Slatko** (he). Vast, jolly, sash, waxed moustache, megaphone. Civic pride as menace.
- **Prior Ignatius Vosk** (he). Gaunt, 3.2 m on stilts, beaked veil. Purple prose. Hates being interrupted. Misread the prophecy.
- **Trent "Dead Letter" Vail** (he). Dash's ex-partner, supposedly dead, long grey coat, gravel voice.
- **Queen Regina.** No voice of her own: all hosts speak in unison, in capitals.

**The joke under the plot.** The cult's prophecy says "the First Mother shall come across the water and crown the Queen." They read a newspaper. They kidnapped the President's mother because of her title.

**Lines to build from.** Write the rest in this voice.

*Intro panels.*
> CAPTION: Six days ago Mrs. Winifred Pruitt, seventy-four, bridge champion and mother of the President of the United States, vanished from a heritage beekeeping retreat in the Principality of Zlatovia.
> CAPTION: The Secret Service lost her. The FBI has no jurisdiction. Then the kidnappers made a mistake.
> CAPTION: They mailed a ransom note. Book rate. Insufficient postage.
> DASH: Inspector Dash Mercer, U.S. Postal Inspection Service. We always deliver.

*In the plane.*
> DISPATCH: Zlatovia signed the Universal Postal Union, which makes this legal, technically. Try not to start a war.
> DASH: What's the local threat, Ozzie?
> DISPATCH: Bees.
> DASH: Bees.
> DISPATCH: Honey is the chief export. Also the only export. Tourists report the locals are very friendly. Then tourists stop reporting.
> DASH: Put me down for overtime.

*First kill.*
> FARMER: Sladko. Sladko. Try. Very sweet.
> DASH: I'm watching my sugar.
> DISPATCH: Inspector, my instruments say you discharged a firearm at a member of the public.
> DASH: He came at me with a pitchfork, Ozzie.
> DISPATCH: Was the pitchfork properly addressed?
> DASH: …No.
> DISPATCH: Then carry on.

*The float.*
> DASH: Why is there a twenty-foot papier-mâché senior citizen in a crown?
> DISPATCH: I'll open a file.

*Siege.*
> DASH: Sorry. We're closed.
> *(after the organ note)* DASH: They're leaving. Nobody leaves a post office that fast.
> DISPATCH: Nobody leaves a post office at all, Inspector. There's a line.

*Fenwick.*
> FENWICK: Well HEY there, neighbor! Fenwick's the name, door-to-door's the game! Those folks out there seem awful worked up. You know what'd calm 'em down? Twelve-gauge.
> DASH: How did you get here?
> FENWICK: Territory's territory, neighbor.
> *(buy)* Now THAT'S what I call a sound investment!
> *(sell)* I'll take it off your hands, and I won't ask whose hands it was in.
> *(leave)* Tell your friends! While you've got 'em!
> *(asked about the veil)* Allergic! Deathly! That's why I wear the hat!

*Mayor.*
> MAYOR: Inspector! This is your Mayor speaking! Sladka welcomes careful drivers, and also you!
> MAYOR: Tonight we crown the Harvest! Tomorrow we render the guests! There will be a cakewalk!
> DASH: Mr. Mayor, you're under arrest for mail fraud.
> MAYOR: Ho! Ho ho! I am the Mayor. I am under nothing.
> *(on the Effigy)* VOTE SLATKO!
> *(crushed)* I demand… a recount.
> DASH: Your term's up.

*Rescue.*
> WINNIE: You're late. I was told the mail always gets through.
> DASH: Inspector Mercer, ma'am. Postal Service. Your son sent me.
> WINNIE: My son sends a fruit basket. Where's the Secret Service?
> DASH: They lost you, ma'am.
> WINNIE: Typical. And you're going to rescue me with that little gun?
> DASH: I have a bigger one in the case.
> WINNIE: Then pick it up, young lady. I have a hair appointment Thursday.

*Winnie, in play.*
> *(wait)* I'll wait. I've been waiting on my son to call since the inauguration.
> *(hide)* In the beehive. At my age. When this is over I am speaking to your supervisor.
> *(grabbed)* Unhand me, you sticky little man!
> *(drop)* Here. Cough drop. Don't make a face, it's horehound.
> *(kill)* Good. That one owed me money.
> *(lockpick)* Hold them off, dear. I learned this in the Eisenhower years.

*Prophecy.*
> PRIOR: It is WRITTEN, Inspector. "And the First Mother shall come across the water, and she shall crown the Queen, and the valley shall be sweet forever."
> DASH: You kidnapped her because of a newspaper headline?
> PRIOR: …The prophecy was very clear.
> WINNIE: It's a job description, you twit. And I'm Episcopalian.

*Trent.*
> TRENT: Hello, Dash. Still delivering?
> DASH: They told me you died on the Anchorage route.
> TRENT: They told you what the file said. I wrote the file.
> TRENT: Everything nobody claims ends up down here. Every letter. Every parcel. Every agent. Welcome to the Dead Letter Office.
> *(dying)* You always were… by the book.
> DASH: Somebody has to read it.

*Organ.*
> PRIOR: You stand before the greatest instrument in Christendom, Inspector!
> DASH: I'm here about the noise complaint.
> PRIOR: You have… no ear…
> DASH: Return to sender.

*Queen.*
> ALL HOSTS: MOTHER. MOTHER. CROWN US.
> WINNIE: I have raised a President, a Congressman and a very disappointing orthodontist. You do not frighten me, dear.
> WINNIE: Young lady! Special delivery!
> DASH: Return. To. Sender.

*Ending.*
> WINNIE: You'll do, young lady. Tell your supervisor I said so. And fix your collar.
> FENWICK: Same time next year, neighbor?
> TELEGRAM: INSPECTOR STOP VICE PRESIDENT'S DOG MISSING STOP RANSOM POSTCARD ARRIVED STOP WE BELIEVE IT IS THE WRONG STAMP STOP

**Dash's combat barks** (15% on special kills, 8 s cooldown): Return to sender. Postage due. Signature required. No forwarding address. Handle with care. Fragile. This side up. Address unknown. Try the next window. Sorry we missed you. That's first class.

**The Sweetened mutter** in a mock tongue, captioned when close: *Sladko… Med! Med! Prva Majka! Za Kraljicu!*

**Documents** (Special Elite on paper, about 80 words each, at least 8):

1. Retreat brochure.
2. Mayor's Harvest Festival schedule ("4 pm Crowning. 5 pm Rendering. 6 pm Cakewalk.").
3. A keeper's diary, going wrong.
4. A child's undelivered letter.
5. Mill sluice notice (lever clue).
6. Hymn sheet (bell clue).
7. The Prophecy, annotated by Vosk.
8. Fenwick's Terms and Conditions.
9. Dash's Incident Report with form numbers.
10. Winnie's bridge score sheet, with notes on her captors.

**Loading tips** are deadpan: *"A Sweetened with no head cannot be reasoned with. Neither can one with a head."*

**Stamps** carry the game's punctuation: **UNDELIVERABLE** slams down on death, **RETURN TO SENDER** on retry, **DELIVERED** at chapter end. Rank stamps: Express, First Class, Standard, Bulk Rate, Dead Letter.

---

## 10. Art direction

**Base.** Three.js's native toolkit: `MeshToonNodeMaterial`, built-in and addon geometries (Box, Cylinder, Lathe, Extrude, Tube, `RoundedBoxGeometry`, `ConvexGeometry`), TSL. All art is built in code; no model or image files. Generic props may lean on those library primitives; everything that makes the game feel like itself is new.

**Style: a pulp horror comic printed cheap.** Big flat shapes, hard bands, thick wobbling ink lines, halftone in the shadows, one hot accent. The filter (§2.5) does half the work; give it silhouettes, not noise.

- Avoid fine detail that turns to ink mush at 10 feet.
- Amber eyes, red laser and honey gold read through anything.
- The ink filter draws lines where depth and normals change, so model bold bevels, overhangs and stacked forms.

**Palettes** (one per chapter; ink stays `#120c08`, paper `#e9d8a6`).

| Chapter | Sky / fog | Key light | Hemisphere sky / ground | Accent |
|---|---|---|---|---|
| Dusk (1, Siege) | `#c98a3a` | `#fff0d0` 3.0 | `#ffe6b8` / `#4a3320` | Honey `#f2b632` |
| Noon (2) | `#d8c27a` | `#fff6e0` 3.4 | `#fff2c8` / `#5a5a30` | Grass `#6d7a3c` |
| Night (3) | `#1b2740` | moon `#9fb4d8` 1.4 | `#33466a` / `#120c10` | Lantern `#ffb040` |
| Abbey (4) | `#2c2240` | moon `#c8b8e8` 1.6 | `#3a3050` / `#0e0a12` | Candle `#ff9a3a` |
| Crypt (5) | `#3a1408` | `#ffb030` 2.2 | `#6a2a10` / `#120805` | Honey glow, blood `#a3161a` |

**Sky.** Gradient dome in TSL, sun or moon disc, flat cloud shapes, 2–3 layers of cut-out mountain silhouettes as far meshes.

**Characters** are one `SkinnedMesh` each: shaped primitives (capsules, lathes, tapered cylinders) merged with vertex colours, weighted to one bone or blended across a joint within ±8 cm, smooth normals kept. Each enemy gets its own material clone so it can flash on hit. Set `frustumCulled = false`. Silhouette first:

| Character | Silhouette |
|---|---|
| Dash | 1.72 m, flared pea coat, peaked cap, bright mustard satchel. Seat-colour armband and laser in multiplayer |
| Winnie | 1.50 m, bell skirt, pillbox hat, big handbag, lavender `#8d7bb0` |
| Fenwick | Boater and veil, striped suit (ring vertex colours), cart with striped umbrella |
| Sweetened | Generator: 6 outfits × 3 builds × 4 hats, hex comb swelling on the neck, amber emissive eyes, pitchfork / sickle / hatchet / pan |
| Hivehead | The body with a dripping hex comb for a head, TSL swarm orbiting |
| Keeper | Huge drum veil hat, padded off-white suit, tank on back |
| Harvester | 2.3 m, woven skep head, leather apron, two-handed motor-saw |
| Monks | Hoods, rope belts, censers; Shield Monk with hive-frame shield; Choir with arms raised |
| Wax Effigy | Pale melted statues, slow TSL drip, bees in the seams |
| Penitent | 2.6 m, iron blindfold, gauntlets, comb hump on the back, chains |
| Trent | 1.85 m, long grey coat, blade arm |
| Mayor / Effigy | Vast sash-and-top-hat man on a 12 m wicker giant: lashed cylinders of straw, burning-ember TSL when lit |
| Prior | 3.2 m black robe over stilts, beaked veil |
| Queen | 14 m segmented abdomen, thorax, crown combs, glistening TSL, rig of 12–16 bones plus scripted motion |

**Prefab kit** (`src/art/kit/`). One builder per entry returns merged geometry and its colliders from the same numbers, so visuals and physics never disagree.

- Village: farmhouse, cottage, barn, post office, well, fence, wall, gate, stall, parade float, cart, hive box, straw skep, barrel, crate, lantern post, bunting, tree, rock, flower field, biplane wreck.
- Terraces and mill: terrace wall, ramp, ladder, mill, waterwheel, wax vat, hanging hive, test-range tent.
- Chapel and gorge: chapel, gravestone, pews, bell frame, trestle, rail, honey wagon, bridge.
- Abbey: curtain wall, gatehouse, catapult, mounted cannon, bookshelf, wardrobe, library gallery, mail tube, catacomb arch, reliquary niche, pigeonhole wall, conveyor.
- Finale: organ pipes and console, stained-glass window, column, honey lake surface, walkway, smoke bellows, biplane.

**Lights.** Use many non-shadow point lights for lanterns, candles, fires (flicker via intensity). Max 6 shadow lights (§2.4); hand the 5 pool slots to whichever lights are nearest the player.

**FX** (`asFX`, instanced quads animated in TSL, CPU pool for bursts). Comic star muzzle flash, ink-honey splat quads on surfaces, shell casings, dust, smoke puffs, embers, fire, sparks, bee swarms by the thousand, honey drips, comic onomatopoeia sprites, stamp-shaped ink wipes between zones. Dynamic debris (crate planks, barrel staves) are real Rapier bodies. Deaths go to ragdoll with kick impulses applied, sink after 10 s.

---

## 11. Animation

**System.** `THREE.AnimationMixer`, `AnimationClip`, `QuaternionKeyframeTrack`, `crossFadeTo`, `AnimationUtils.makeClipAdditive` for hit reacts. Clips are authored in code through a small pose DSL:

```js
clip('kick', 0.75, { 0: P.stand, .15: P.kickWind, .32: P.kickStrike, .75: P.stand }, { events: { .32: 'kickHit' } })
// P.kickStrike = { hips:[…], spine:[…], thighR:[x,y,z], … }  in degrees, unlisted bones held
```

**Rig.** 18 bones: hips, spine, chest, neck, head, armL/R, foreL/R, handL/R, thighL/R, shinL/R, footL/R, weapon. Same names for all humanoids so clips share. After the mixer runs, procedural layers add: chest and head yaw/pitch toward the aim, a recoil kick, a look-at target, and a two-bone IK left hand on long weapons.

**Clips required.**

- *Shared humanoid:* idle, walk, run, turn180, hurt small and big, knockdown, getup, death ×2 (or ragdoll trigger), interact, push, vault, ladder up and down.
- *Dash:* aim pistol, aim long, shuffle, fire (additive), reload ×4 by weapon family, throw, knife, parry, kick, slam, stomp, silent stab, grabbed, break free, mail report, gap jump, catch, climb for QTEs, scope.
- *Sweetened and family:* shamble ×2, sprint, thrust, swipe, grab, overhand throw, stagger head, kneel, climb in window, hum and sway, ablaze panic, pick up and carry.
- *Keeper:* flame. *Harvester:* rev, swing, overhead, stagger.
- *Monks:* censer, shield hold, shove, crossbow, chant.
- *Wax Effigy:* wake, walk, re-form. *Penitent:* listen, charge, stuck, claw.
- *Winnie:* walk, huff, knit, swat, lockpick, duck, hide, boost, jump, carried, throw book.
- *Fenwick:* sales idle, flourish, tip hat.
- *Bosses:* Mayor wave and lob; Effigy stomp, swing, panic, douse, collapse; Trent dash, combo, throw, die; Prior play organ, stilt walk, sweep, topple; Queen scripted.

Root motion is code-driven; clip events drive sim hits. Mixers tick in the sim so hit zones match what's on screen.

---

## 12. Audio

No audio files, nothing fetched: everything comes from Web Audio nodes or `AudioBuffer`s filled by JS loops. A test greps for audio URLs and `new Audio(`.

**Graph.** Voices and sources → `music` / `sfx` / `voice` buses → `master` → `DynamicsCompressor` → destination. **Music bus default is exactly 0.10 and shows as 10% in Settings.** SFX 100%, voice 100%, master 100%. `AudioContext` starts or resumes on the first gesture, with `.catch`. Session: on `start`. Stop everything on hub `end`.

**Space.** `ConvolverNode` per zone with generated impulse responses (decaying noise): outdoor 0.4 s, room 1.6 s, nave and crypt 3.5 s. 3D sources use `PannerNode`, listener on the camera.

**Sound recipes.**

| Sound | Recipe |
|---|---|
| Gunshot | Noise burst → bandpass 400–2,500 Hz by weapon, plus sine thump (60→40 Hz), tail in reverb |
| Reload, bolt | Short filtered clicks |
| Footsteps | Noise → filter by surface (dirt, wood, stone, honey squelch) |
| Kick / slam | Body thump + cloth noise, comic slap |
| Swarm hum | 5 detuned saws 170–240 Hz → bandpass, slow AM; level follows bee density |
| Motor-saw | Saw + square through `WaveShaper`, throttle LFO; rev up on telegraph; audible far before the Harvester is seen |
| Fire, wood break, glass, bell, wax splash, stamp thunk, mail chute rattle, telegraph ticks, UI tick and confirm | Noise, filters and envelopes, small buffers |
| Bell | FM pair, inharmonic ratio 1:2.76 |
| Organ note | Additive drawbar sines with slow attack |

**Voices: gibberish from the actual line.**

For each subtitle, walk the text. Each vowel group makes one syllable, 65–110 ms: oscillator at the speaker's pitch → 2 parallel bandpass formants → envelope.

| Vowel | Formants (Hz) |
|---|---|
| a | 800, 1200 |
| e | 500, 1900 |
| i | 300, 2300 |
| o | 500, 900 |
| u | 350, 800 |

- A leading consonant adds a 15–30 ms noise tick (high-passed for s, t, k, f; low thump for b, d, g, m, n).
- Contour: `?` rises, `.` falls, `!` is louder and higher.
- Hash the word to seed detune, so a line always sounds the same.
- Lip-flap: jaw or head bob while speaking.

| Speaker | f0 | Colour |
|---|---|---|
| Dash | 190 | Dry, quick, flat contour |
| Dispatch | 120 | Monotone, radio bandpass 400–2,500 Hz + crackle |
| Winnie | 260 | Quavery (6 Hz vibrato ±3%), staccato |
| Fenwick | 170 | Fastest, huge bouncy contour |
| Mayor | 95 | Slow, boomy; megaphone waveshaper when on the Effigy |
| Prior | 75 | Very slow, long reverb |
| Trent | 105 | Gravel: noise amplitude-modulated into the source |
| All Hosts / Queen | 55–220 | 5-voice unison chord with buzz |
| Sweetened | 130 ± 40 | Nasal, mumbled, overlapping |

**Music: original, generative, code-scheduled.** Lookahead scheduler (25 ms timer, `currentTime`). Instruments:

- Plucked cimbalom and gusle (Karplus-Strong rendered to buffers)
- Saw pads with vowel formants (choir)
- Frame drum, anvil and stomp (noise and sine)
- Additive organ
- Music box (FM)
- Oom-pah piano (decaying triangle pairs)

Home scale is D Phrygian dominant (D Eb F# G A Bb C). The motifs are this game's own:

- **Harvest Hymn:** `D4 Eb4 F#4 D4 | G4 F#4 Eb4 D4`, answered by `A4 Bb4 A4 G4 | F#4 Eb4 D4 –`. Everything sinister quotes this.
- **Fenwick's Jingle** (G major, 2/4, 116 BPM, oom-pah): `G4 B4 D5 B4 | C5 E5 D5 B4 | A4 C5 B4 G4 | A4 F#4 G4 –`.
- **Postmark Waltz** (D major, 3/4, 72 BPM, music box): `F#5 A5 D6 | C#6 A5 E5 | D5 F#5 A5 | G5 E5 C#5`.

| State | Music |
|---|---|
| title | Slow choir, organ drone, Hymn on cimbalom, 60 BPM |
| explore | No beat: D1 + A1 drone, sparse scale plucks every 2–5 s, wind |
| tension | Adds heartbeat kick (70 BPM) and tremolo saws |
| combat | 132 BPM 7/8 stomp, frame drum, gusle riff on the Hymn, brass-saw stabs; intensity 0–3 from the Director |
| siege | Combat plus chanting choir, one layer every 30 s |
| harvester | Replaces the beat with motor drone and off-beat anvil |
| safe | Postmark Waltz at mailboxes |
| shop | Fenwick's Jingle (comic contrast) |
| boss | 150 BPM organ and drums |
| organ boss | 4-voice organ fugue on the Hymn, voices tied to ranks |
| finale | Hymn doubled in speed; turns major when the launcher lands |
| results | Short jazzy fanfare; a stamp thunk on the rank |
| game over | Hymn descends and slows like a stopped record, then the stamp |

---

## 13. UI and UX: 10-foot, controller first

DOM over the canvas, scaled from one unit (`--u: calc(100vh / 1080)`). Same screens for all inputs.

**Rules.**

- Minimum 32 px text at 1080p; captions 44 px; 5% safe area.
- At most 7 entries on a menu, one idea per screen, nothing that looks like a web page or data table.
- Focused item: amber brush-stroke behind it plus a tick sound.
- Fonts: Bangers for headings, stamps and bursts; Barlow Condensed 600 for everything readable and all numerals; Special Elite for documents; Creepster for the logo only.

**Input and focus engine (`src/ui/focus.js`).**

- Accept any pad the browser reports with `mapping: 'standard'`; the DualSense is the design target. Poll `navigator.getGamepads()` every frame.
- D-pad, left stick, arrows and WASD move focus spatially, with repeat 400 ms then 120 ms.
- Cross, Enter and Space confirm. Circle and Esc go back. L1/R1 and Q/E change tabs (L2/R2 in the case, where L1/R1 rotate). Right stick and wheel scroll.
- Hover moves focus, click activates, and every control is also tappable for the touch-only settings path.
- In world close-ups (bell puzzle, Test Range start, levers), the mouse ray-picks objects: hover highlights, click uses. On pad the same objects are focus stops.

**Prompts follow the input used last.** Any pad button or stick past the dead zone → pad. Key, click, or >4 px of mouse → keyboard and mouse. Glyphs swap on the next frame everywhere, including QTEs and the Field Manual. All glyphs are inline SVG drawn in code:

- PlayStation Cross, Circle, Square, Triangle, L1, L2, R1, R2, sticks, D-pad, Options, Create, touchpad
- Xbox A, B, X, Y, LB, LT, RB, RT, View, Menu (Settings option, default PlayStation)
- Keycaps
- Mouse with lit button or wheel

**HUD** (minimal, bottom right): postage-stamp frame with Dash's inked portrait (changes with HP), thick ink HP bar, big ammo numerals `12 / 45`, weapon icon, quick-slot strip while switching. Winnie's small stamp when present. Objective fades in top left on change. Context prompts centre-low, large. Damage is an ink-bleed vignette; low HP adds a heartbeat and desaturation via an `INK` uniform. Money shows only when it changes.

**Screens.**

| Screen | Content |
|---|---|
| Title | Logo in Creepster with honey drips, live village scene behind, menu: Continue, New Game, Chapters, Harvest Siege, Test Range, Settings, About. 10 s idle → attract. Sub-menus count too |
| New Game | 3 difficulties as 3 big stamps, one line each |
| Pause | Resume, Field Manual, Settings, Dev Mode, Restart from Report, Quit to Title, About. Game frozen behind ink wash |
| Parcel Case | Huge grid (64–80 px cells), side panel with big item art, name, one sentence, 4-pip stats. Tabs: Case, Pouch, Key Ring. Pad: move cursor, Cross picks up and drops, L1/R1 rotates, Square uses, Triangle combines, R3 auto-sorts, L2/R2 change tab, Circle closes. Mouse: drag, wheel rotates, right-click uses, on-screen Sort button. Keys: arrows move, Enter picks up, R rotates, Q/E change tab, T sorts, Tab or Esc closes |
| Fenwick | Three tabs: Buy, Sell, Tune. A rotating 3D model of the selected item under a spotlight, rendered in the live scene; left list of 5–7 rows; big price; Fenwick's line; Tune shows 4 fat pip bars |
| Map | Ink-on-paper 2D canvas from zone data: footprints, player arrow, objective, mailboxes, Fenwick, and treasures if the map was bought |
| Files | One document at a time on paper, scroll with stick |
| Radio | Comic panel portraits slide in, captions below, skippable |
| Cutscene | In-engine cameras plus comic-panel layouts, letterbox, hold Cross/Esc 1 s to skip |
| QTE | Large glyph in an ink burst at screen centre, shrinking timer ring; mash and alternate variants; failure has a real consequence. A Settings option makes mash into hold |
| Results | Stats as big stamps: time, accuracy, kills, treasure, deaths; rank stamp thuds down |
| Game over | UNDELIVERABLE stamp, Retry, Last Report, Quit |
| Field Manual | 6 big illustrated pages: moving, aiming and zones, melee, the case, Fenwick, Winnie; glyphs live. States what you can't do too |
| Settings | Tabs: Audio (Master, Music 10%, SFX, Voice), Controls (stick and mouse sensitivity, invert Y, aim assist, toggle-aim, rumble, glyph set), Display (fullscreen, ink lines, halftone, comic bursts, camera shake, caption size, FOV), Game (mash→hold). Reset to defaults |
| About / Credits | Pages: Source Information, Testing Feedback, Engine Feedback, Prompt Feedback, Credits. Same text as the exit-interview file (§17). Large type, stick scroll |

**Touch-only devices** (`maxTouchPoints > 0`, no fine pointer, no pad connected). No touch controls. Title shows **"Controller or keyboard required"** and a Settings button. Settings work by tap. Attract mode runs. If a pad or key appears, the normal menu returns.

---

## 14. Attract, Harvest Siege, multiplayer, dev mode

### 14.1 Attract mode

10 s with no input on any title or menu screen starts it. **Any** input (key, mouse move or click, pad button or stick, tap) exits at once back to the same menu.

- It runs a sandboxed sim that never touches the save, driven by the bot through the same virtual pad a player uses, with god mode, infinite ammo and no-clip allowed.
- Looping reel of about 90 s, 12–15 s per scene: Square brawl (kicks, slams) → Post Office siege and Harvester → Case and shop screens operating themselves → Effigy fire and climb → Gorge Wagon → Winnie stealth → Organ → Queen and launcher.
- A corner stamp says DEMO and "Press any button" (glyph or key by last device).
- Music follows the current scene at the normal bus level.

### 14.2 Harvest Siege (arena mode)

The Festival Square at dusk. 5:00 clock, 1–4 players.

- **Waves.** Every 40 s or when 5 or fewer remain; up to `16 + 6×players` alive; mix escalates Sweetened → Throwers → Keepers → Hiveheads; Harvester at 2:30 and 4:15.
- **Score.** Kill 100 × chain (chain grows with kills within 6 s, up to ×8); headshot +50; kick or slam kill +150; Harvester 5,000.
- **Mail Drops** parachute in every 45 s: Cross opens one for ammo plus a weapon, grenade or herb. Everyone starts with pistol, knife, 2 Yarrow.
- **Down, not out.** A downed player crawls; a teammate holds Cross 2 s to revive. Solo gets one self-revive. All down ends the round.
- **Standalone end screen:** rank stamp and a local top-5 table.

### 14.3 Multiplayer

**In an AI Hub session** (`AIHub.active`, protocol in `hub/README.md`, skeleton in §2.7):

Mode `shared-world`, seats `[1,4]`, the game's own card. The round is Harvest Siege, with no title screen, attract, saves or dev mode.

- **Card** (`card:true`): the Square behind an ink wash, the game's name, each player in seat colour with a ready tick, how to win, this player's controls in the right glyphs, time left. Enter, Cross or a click answers Ready; Triangle, M or a click asks for More Time. No menus or choices; use `AIHub.rng('card')` for anything random.
- **Authority.** The host (possibly a playerless `server` copy, which skips renderer, audio and input) runs the sim. Each copy moves its own player immediately and reports it.
- **Traffic:**

| Message | Direction | Reliable | Rate | Contents |
|---|---|---|---|---|
| `me` | client → host | no | 12 Hz | time, position, yaw, pitch, state, weapon |
| `act` | client → host | yes | batched, ≤ 5 Hz | shots with hit claims `[enemyId, zone]`, kick, pickup, reload, revive |
| `s` | host → all | no | 12 Hz | time, players, enemies as small int arrays; under 1,100 bytes (round-robin enemies across messages if more) |
| `ev` | host → all | yes | batched, ≤ 5 Hz | spawn, death, drop, damage, explosion, score, wave, down, revive, over |

- **Always talking.** `me` and `s` go out on schedule even when nothing moved: the check requires traffic both ways, and an idle player must still produce it.
- **Hits.** The shooter's copy claims; the host checks the enemy is alive and within range + 2 m. Others are drawn 120 ms behind, interpolated. Late snapshots are dropped by `at`, as in `hub/examples/arena.html`.
- **End.** On clock, all down or `time-up`, the host sends a final reliable `ev`, then `AIHub.finish({ standings, scores, stats, awards })`: standings are groups of ids, best first, over players still present (`[[2],[0,3],[1]]`), stats `{Kills, Headshots, Kicks}` per id. Awards under 24 characters: *Postmaster General* (top score), *Special Delivery* (most kicks), *Return to Sender* (most headshots). Omit `won` so individual ranks count.
- **Leave:** drop the avatar. **`end`:** stop, show the reason, hub shows results.
- **Pause:** Options opens a Settings-only overlay and the world keeps running. No Quit, Restart or Dev Mode.
- Seat colours (`#e8443a #3b82f6 #22c55e #f5b700`) tint laser and armband. No chat, emotes or custom names.

**On its own** (`AIHub.connect` gives `null`): the full game as designed, plus **couch co-op**, the natural multiplayer for a TV with no network or server. Harvest Siege → "2 Players": the second person presses Cross on another pad (first device stays P1; keyboard and mouse can be either). Split screen per §2.5, one HUD per player scaled to its half. Same sim, same rules, up to 2 players. Campaign is single-player. Add no other networking outside sessions; the About "Online" field says: AI Hub sessions only.

### 14.4 Dev mode

Pause → Dev Mode. Same 10-foot screen, usable by pad, mouse or keys. Hidden in sessions.

**Tools.** God mode, infinite ammo, no-clip fly camera, teleport (zone and mailbox list), chapter jump, skip cutscene, spawn enemy (type picker, at the laser dot), kill all, give any item, weapon or money, max upgrades, freeze AI, time scale. Overlays: colliders, hit zones, nav grid, triggers, spawners, vision cones. Toggles: ink, halftone. Stats: backend, frame time, enemy count. Test any QTE, voice line or music state. Copy position, copy zone JSON, load zone JSON (file drop), reset save, dump state.

**Live sliders with a Reset to Defaults button** (each applies instantly, shows its value and default):

| Group | Sliders |
|---|---|
| Player | Walk, sprint, aim shuffle speed, max HP, laser sway, recoil |
| Combat | Head / leg / arm damage multipliers, crit chance, kick damage and radius, stagger thresholds, parry window, aim assist |
| Enemies | HP multiplier, speed multiplier, damage multiplier, max attackers, token delay, windup time, spawn rate, Hivehead burst chance, Harvester speed |
| Economy | Drop rate, ammo share, money multiplier, shop price multiplier |
| Partner | Winnie HP, carry time, swat cooldown |
| Feel | FOV, camera distance, hit-stop length, QTE window, siege wave interval, music level |

---

## 15. Testing

TASK.md's rules apply: headless scripts first, screenshots only for what a script can't check, no subagents or workflows to debate, review, judge or audit. Keep one or two browsers open, close them after, keep files in your folder.

**One command:** `npm test` (→ `tools/test.mjs`) prints only failures and a one-line count, e.g. `412 passed, 0 failed`. `npm test -- <group>` runs one group. Rerun a group only after changing the code it covers.

**Fast sim.** Tests load `dist/game.html?test=1&norender=1&seed=7` and call `__GAME.step(n)` in a loop. Real-time rendering on SwiftShader is 1–3 fps, so never wait on it. Serve over `file://`, or Node on `listen(0,'127.0.0.1')` for the harness; confirm the page is yours before trusting a result. Stop only what you started.

**The bot** (`src/bot/`). It reads the zone's `bot:` list, walks the flow field, aims at the nearest head, fires, reloads, kicks and slams on prompt, answers QTEs, operates levers, buys from a shopping list, and uses each boss's `botHint()`. Same brain as attract mode. A `--fair` run plays without cheats and may die; the coverage run uses god mode where needed.

| Group | Checks |
|---|---|
| `lint` | No `TODO`, `FIXME`, `XXX`, `placeholder`, `stub`, `not implemented` in `src`. No `Math.random`, `Date.now`, `performance.now` in `src/sim`. No audio URLs or `new Audio(`. No banner text outside the client. No `alert`, `confirm`, `prompt`, `window.open` |
| `build` | Single HTML, client hash matches, metas exact and in order, no network requests but the page itself, game title in `<title>` |
| `sim` | Damage table, hit zones, stagger → kick → kill arithmetic, weapon stats and upgrades, case fitting and rotation, herb mixes, shop math, director drops, save/load round trip, tunables apply live, nav reaches every exit in every zone |
| `playthrough` | The bot beats every chapter in order to the ending on seed 7, chapter by chapter so one can rerun alone. Coverage ids from it are recorded |
| `ui` | Pad stub (`addInitScript` replacing `navigator.getGamepads` with a `mapping:'standard'` pad) and keyboard each walk every screen. Prompts flip with last device. Xbox glyph setting works. Focus never escapes. Hover moves focus. Case and shop by pad, mouse, keys. Create+Options ignored. No overflow at 1280×720 and 1920×1080 |
| `modes` | Idle 10 s → attract; any input exits; it never writes the save. Touch-only (WebKit iPhone profile, `page.touchscreen.tap`) shows the message, Settings by tap, attract runs. Dev mode opens from pause; sliders change sim values; reset restores defaults. Couch co-op joins with two stub pads |
| `render` | With the five flags: backend `webgpu`, no `deviceLost`, no `gpuErrors`, screenshot well above a blank page's size in each palette, warm-up covers all prefabs. No flags: backend `webgl2`, still drawing. Fails if more than 6 shadow lights exist |
| `audio` | `OfflineAudioContext` renders of a gunshot, a voice line for each speaker and a bar of each music state are non-silent and unclipped. Voice length tracks text length. Music bus reads exactly 0.10 by default |
| `hub` | All harness scenarios of §2.7 plus "on its own" (opens, Enter and Space, draws, no errors, `AIHub.active` false, `Math.random` untouched). No `[AIHub]` warnings |
| `delivery` | Exit-interview file parses and matches TASK.md's shape, About screen shows all four sections with every Source Information field |

**Coverage.** Across `sim`, `playthrough`, `ui` and `modes`, every id in §8.7 must be hit, or the run fails and names what's missing. A rare id like `crit` or `kill_harvester` may come from a `sim` scenario, but must be reachable in real play.

**Eyes only for what scripts can't judge.** Screenshots at 1920×1080 of: title, HUD in each palette, case, shop, a crowd, each boss. Check silhouettes at thumbnail size (a stand-in for 10 feet). Fix what's muddy.

---

## 16. Build order

Each milestone ends with its tests green, and a playable `dist/game.html`.

| # | Milestone | Done when |
|---|---|---|
| M0 | **Skeleton.** Package, build, test runner, renderer with ink, sim loop, input, fonts, identity constant, hub client pasted, hub skeleton with a bare Square | `build`, `render`, `hub` groups green from day one |
| M1 | **One person, one enemy.** Zone loader, kit builders with colliders, character builder and mixer, camera, aim, laser, pistol, one Sweetened, Crash Field blocked in | Bot walks and kills in `norender`; screenshot reads as the game |
| M2 | **The loop.** Hit zones, staggers, kick, slam, knife, parry, nav, crowd tokens, director, FX, bursts, core SFX | A 15-enemy brawl feels right by the sim's numbers; `sim` group |
| M3 | **The squeeze.** Focus engine, glyphs, HUD, case, items, herbs, shop, tuning, save, settings, pause | `ui` group for those screens |
| M4 | **Chapter 1, whole.** Script runner, dialogue, voices, music, QTE, radio, comic panels, Lane, Square, Harvester, Post Office siege, results, game over, dev mode with all sliders, bot route | Bot finishes ch1; `audio` group; dev mode tests |
| M5 | **Front end.** Title, attract, Field Manual, About, touch-only | `modes` group |
| M6 | **Multiplayer.** Harvest Siege, session traffic, own card, couch co-op split | `hub` green with real gameplay; two stub pads play |
| M7 | **Chapter 2.** Terraces, Keepers, Hiveheads, grenades, Test Range, mill puzzle, Effigy | Bot beats it |
| M8 | **Chapter 3.** Winnie AI and commands, chapel, bell puzzle, Night Lane, Gorge Wagon | Bot beats it; partner ids hit |
| M9 | **Chapter 4.** Monks, cannon, play-as-Winnie, Penitent, Wax and UV, Trent | Bot beats it |
| M10 | **Chapter 5.** Organ with musical ranks, Queen, launcher, escape, ending, full attract reel | Full playthrough to credits; coverage complete |
| M11 | **Finish.** Balance by `--fair` runs and sliders, 1080p eye pass, tips, documents, `docs/CONTENT.md`, all feedback, About, exit interview, `--release` | Every test group green against the released file |

Do M6 before the later chapters: it shapes the sim, and the hub check keeps a failing game out of sessions. Performance is out of scope per TASK.md: don't spend time on frame rate or optimisation. Spend it on detail, enemies, effects and lights (within §2.4's limit).

---

## 17. Delivery

Before you finish, per TASK.md's own wording:

- **Package.** The single HTML at the path and name TASK.md gives; dev files stay in the dev folder.
- **About / Credits screen and chat reply** both hold Source Information, Testing Feedback, Engine Feedback and Prompt Feedback, answering TASK.md's questions in its order. Write "unknown" for anything you can't confirm. Date, Source, Environment and Model come from TASK.md. For the rest:

| Field | Value |
|---|---|
| Usage | `added on import` |
| Plan | This file's name |
| Genre and Perspective | §1 |
| Tech | Three.js r180 WebGPU with WebGL2 fallback, TSL, Rapier 0.19.3, Web Audio, Gamepad API, esbuild, hub client version |
| Art Direction | Pulp-comic ink filter over toon materials; all art built in code |
| Animation | `AnimationMixer` with code-authored clips, procedural aim layers, Rapier ragdolls |
| Audio | Generative Web Audio music at 10% by default, synthesised SFX, Animalese-style voices; no audio files |
| Online | AI Hub sessions (shared world) only |
| Testing | What TASK.md allowed: headless scripts, scripted playthrough, hub harness, screenshots |
| Research | What you actually did, or none beyond this plan |

- **Exit-interview JSON** where TASK.md puts it, in exactly its shape, every value filled, checked with `JSON.parse`. Have `tools/build.mjs` inline this file for the About screen so the two can't disagree. Suggested catalogue block, with your own name, tagline, description and tag choices:
  - `type` `Game`, `genre` `Horror`, `source` `Resident Evil 4`, `series` `Resident Evil`, `players` `1–4`
  - `controls`: "Stick/WASD move, L2/RMB aim, R2/LMB fire, Cross/E kick, Square/R reload, Triangle/Tab case"
  - `tags`: `3d`, `third-person`, `co-op`, `story`, `comedy`, `boss fights`
- **Testing Feedback** answers come from what really happened; count issues as you go in `STATUS.md`.
- **No loose ends.** `npm test` green on the released file. Search once more for stubs. Close your browsers and any server you started.
