# Dragon Quilt Builders

*A build plan for an original block-building action RPG inspired by Dragon Quest Builders.*
Written for the developers (human or AI) who will build the demo from `TASK.md` and this file alone.
Plan date: 2026-11-03. Engine: my-3D2dge handoff v0.85.2 (commit `4390a98`). AI Hub client: session.js 1.4.0 (ai-hub commit `f8835e48`).

---

## 0. At a glance

| | |
|---|---|
| **Title** | **Dragon Quilt Builders** (picked by RNG; see §1) |
| **Pitch** | The patchwork realm came apart at the seams when the dragon **Frayvern** pulled out its Golden Thread and swallowed everyone's *Knack*, the gift of making things. You are the last **Builder**. Break blocks, gather materials, get *Notions* (ideas for recipes), craft, and build rooms block by block. Win the hearts of quirky residents, raise the town of **Thimbleton**, defend it from a monster siege, and unpick the knotted boss **Gnarlgrim**. |
| **Genre** | Sandbox action RPG with block building, crafting and town building. Same family as the source: real-time combat and a story told in chapters. |
| **Perspective** | Third-person **isometric 2.5D** over a true voxel world. The camera turns in 90° steps (Q/E or the right stick) and zooms. **Three-quarter** is an optional view in Settings. Characters are the engine's 3D puppet rigs drawn as pixel art. Why iso: it shows two side faces and the top of every block, so 3D building reads clearly with a fixed camera, and it is the engine's native strength. |
| **Core loop** | Explore → break blocks and gather → get a Notion → craft at a station → build rooms and Patterns → residents move in and give Cheer → town levels up and unlocks more → the story pushes you into harder regions and finally a siege and a boss. |
| **Demo scope** | "Chapter One: A Stitch in Time", about 60–75 minutes for a new player. It has 5 residents, 6 regions, 8 room types, 30+ block and object types, 17 quests, a mini-boss, a siege with 3 waves and a final boss. After the credits, free play continues. A co-op **Quilting Bee** round (AI Hub shared world, 1–4 players) is also playable solo from the title. |
| **Deliverable** | One self-contained HTML file in this folder's root: `DragonQuiltBuilders-DragonQuestBuilders-claude-opus-5-5-max-20261103-174740.html`. Dev files live in the subfolder of the same name. `exit-interview.json` sits beside the HTML. |

The source's distinctive elements, and what each becomes here (all names, characters, art, music and places are original):

| Dragon Quest Builders | Dragon Quilt Builders |
|---|---|
| The dark lord took the power to build; you are the legendary Builder | Frayvern swallowed the *Knack*; only you can still make things. NPCs marvel at beds and doors ("You *made* that? On purpose?!") |
| A goddess guides you as a voice from the sky (Rubiss) | **Granny Gossamer**, the Great Quilter who stitched the world: a warm, scatterbrained voice in golden dialog boxes |
| Banner of Hope founds a base; base level rises | **Banner of Mending**: planting it stitches a glowing border on the ground. **Cheer** points raise the **Town Level** (1–5), which widens the border and unlocks recipes |
| Inspiration: touching new materials gives recipe ideas | **Notions** ("You've got a notion!"; *notions* is the sewing-shop word for haberdashery) |
| Rooms recognised from walls ≥2 high, a door and a light, then typed by their furniture | Same rule. 8 room recipes (Bedroom, Workshop, Kitchen, Mess Hall, Smithy, Guard Post, Snug, Quilters' Hall) |
| Blueprints that residents help build | **Patterns**: ghost-block layouts. Residents take materials from the Town Chest and place blocks too |
| Resident requests (the "!" over their heads), gratitude hearts | Requests with "!" balloons. **Cheer bubbles** (hearts) float over happy residents; walk through them to collect |
| Hunger, day/night, sleeping in beds | **Belly** meter, a 12-minute day, sleep through the night in a bed |
| Weapons double as block-breaking tools with tiers | Darning Stick → Cobble Club → Copper Bodkin → **Seam Ripper**, the only tool that cuts Black Knots |
| Base-defence sieges; bosses beaten with things you built | The Siege of Thimbleton (3 waves). Gnarlgrim can only be *Tangled* by the **Bobbin Ballistas** you build and fire |
| Teleport portals between areas | **Bobbin Portals** |
| Punny, warm, earnest localisation with quirky dialects | The same tone (§7.10, §6.15) |
| Online co-op building (DQB2) | Co-op **Quilting Bee** rounds in AI Hub sessions |

---

## 1. Title selection

TASK.md asks for a playful riff on the source's name, picked by a real RNG from 50 silently brainstormed titles. Fifty riffs were written. None uses the trademark "Dragon Quest" verbatim. Examples of the kinds of riff: Wagon Quest Builders, Dragon Crest Bricklayers, Dragon Quarry Builders. One was picked with Python's `secrets.randbelow(50)`, which draws from OS entropy (`os.urandom`), not a seeded PRNG. Result: index 42, **"Dragon Quilt Builders"**.

The pick sets the whole art and writing direction: the world is a patchwork quilt. Every block is a fabric patch with stitched seams, the villain unravels things, tools are sewing tools, and puns are sewing puns.

File naming (fixed; do not improvise): GameTitle = `DragonQuiltBuilders`, SOURCE = `DragonQuestBuilders`.
- Dev folder: `./DragonQuiltBuilders-DragonQuestBuilders-claude-opus-5-5-max-20261103-174740/`
- Deliverable: `./DragonQuiltBuilders-DragonQuestBuilders-claude-opus-5-5-max-20261103-174740.html`
- Exit interview: `./exit-interview.json`

On-screen title (logo, `<title>`, About screen, AI Hub name): **Dragon Quilt Builders**.

---

## 2. Design pillars

1. **Everything is a patch.** Each block is a 16-unit fabric square with stitched edges. Building feels like quilting: colourful, cosy and tactile. Breaking a block makes a satisfying *rrrip* and a burst of fabric scraps. Placing one makes a *stitch!* and a squash-in.
2. **You are the only one with the Knack.** NPCs cannot build. Every bed, door and lantern you make visibly changes their lives: they use your rooms, sleep, eat, cook, help, and thank you. Make that cause and effect loud: popups, hearts, jingles.
3. **Readable at ten feet.** Big chunky pixels (`res: 'ps1'` scaled to the TV), a few large UI elements, controller-first prompts, never dense web-style screens.
4. **Warm, punny, earnest.** Dragon Quest-style writing: short lines, exclamation marks, gentle jokes, distinct voices, and a silent hero.
5. **Data-driven and designer-ready.** Blocks, items, recipes, rooms, monsters, residents, quests, waves, songs and world stamps are all plain data tables. The building mechanic doubles as the level editor: dev mode exports any region you build as a stamp.

---

## 3. Deliverables, folder layout, commands

```
./PLAN.md, ./TASK.md, ./STAGE.md                      (given)
./DragonQuiltBuilders-DragonQuestBuilders-claude-opus-5-5-max-20261103-174740.html   (built; the game)
./exit-interview.json                                  (written at the end; parses as JSON)
./DragonQuiltBuilders-DragonQuestBuilders-claude-opus-5-5-max-20261103-174740/
    engine/            copy of my-3d2dge dist/handoff v0.85.2 (my-3d2dge.js is modified, see §4.2)
    vendor/aihub/      session.js (unmodified client 1.4.0), harness.html, bridge.js, round.js (testing only)
    src/               game modules, concatenated in file-name order (see §5.2)
    src/index.template.html
    tools/build.mjs    bundles everything into the root HTML; also writes dev/index.html
    tools/hub-serve.mjs  serves a folder on 127.0.0.1:<OS port> for the hub harness (prints the port; kills only its own PID)
    tests/run.mjs      THE test command (see §11)
    tests/lib/*.mjs    headless loader, fake hub bus, autopilot
    tests/unit/*.test.mjs, tests/play/*.test.mjs, tests/net/*.test.mjs, tests/browser/*.mjs
    dev/index.html     loads engine + src files separately (debugging, file://)
    check-output/      screenshots and filmstrips (git-ignored)
```

Getting the dependencies:
- Do not clone into `/tmp`, which is a small shared tmpfs and nearly full. Work inside the dev folder.
- Engine:
  ```
  git clone --depth 1 --filter=blob:none --sparse https://github.com/michaelcrosato/my-3d2dge.git _eng
  cd _eng
  git sparse-checkout set dist/handoff
  ```
  Then copy `dist/handoff/*` into `engine/` and delete `_eng`.
- Hub: `curl -fsSO` the four files from `https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/` (session.js, harness.html, bridge.js, round.js) into `vendor/aihub/`. Read `lib/hub/README.md` (the protocol) once, whole.
- Inside `engine/`, run `npm install` (Playwright 1.63.0 is pinned) and `npx playwright install chromium`. Both are for the browser checks only.

Commands (run from the dev folder):

| Command | What it does |
|---|---|
| `node tools/build.mjs` | Writes the root HTML: `<meta charset>`, then **session.js inlined unmodified as the first script in `<head>`**, the hub meta tags, the boot splash, the engine, then `src/*.js` in order. Also writes `dev/index.html`. Fails on a missing file or a syntax error (`node --check` on each module first). |
| `node tests/run.mjs` | Every headless suite. Prints **only failures** and one final line: `N passed, M failed (12.3 s)`. Exit code 1 on failure. |
| `node tests/run.mjs --only voxel,rooms` | A subset (rerun only what the change covers). |
| `node tests/run.mjs --browser` | Adds the Playwright suites: the AI Hub harness checks and the screenshot capture. Still one line of output plus failures. |
| `node engine/tools/check.mjs <html>#<scene>` | The engine's browser checker (errors, look notes, snapshot). |
| `node engine/tools/filmstrip.mjs <html>#play --steps "..." --seed 1` | Frame-by-frame strip, for judging animations. |

Ports and processes: `tools/hub-serve.mjs` runs `python3 -m http.server 0 --bind 127.0.0.1` and parses the printed port. It fetches the game page and checks that its `<title>` contains "Dragon Quilt Builders" before trusting anything. It kills only the PID it spawned. Never use `pkill`, `killall` or `fuser -k`. Prefer `file://` and headless Node everywhere else.

---

## 4. Tech stack

### 4.1 Stack
- **my-3D2dge v0.85.2, full engine** (`engine/my-3d2dge.js`, which already contains every module: story, grid, songs, ...). Plain ES2020 JavaScript, no framework, no bundler beyond `tools/build.mjs` (string concatenation).
- **Canvas 2D pixel rendering** through the engine's renderer. `res: 'ps1'` (320×240) with `expand: true`, so a 16:9 TV shows about 427×240 game pixels at a whole-number scale. GPU lighting is not used (it requires a TileMap); canvas lighting is.
- **Audio:** the engine's chip synth and music sequencer, plus our own Web Audio formant voice synth (§6.17) on the engine's `AudioContext`.
- **AI Hub Session Protocol v1**, client 1.4.0, shared-world mode (§6.21).
- **Node 18+** for headless tests (`vm` contexts, as `engine/game/test.mjs` does). **Playwright** (pinned by the handoff) for the browser checks.
- No external runtime dependencies and no CDN. The HTML must work from `file://`.
- **Performance:** the budget is unlimited (TASK.md), so add detail, lights and effects freely. FPS targets and optimisation are out of scope. The atlas and culling design in §6.1 exists for correctness and a smooth feel, not as an optimisation target.

### 4.2 Engine changes (keep a list; it goes into the About screen and the exit interview)
Edit `engine/my-3d2dge.js` directly, with a `// DQB:` comment on every change:
1. **Input:** an `input.wheelSteps()` accessor (whole notches this step, from `deltaY`) that works while `camera.wheel` is `false`, so the wheel can cycle the hotbar. A right-stick flick helper, `input.flick('x')`, which returns -1/0/1 once per push past 0.6 with a 0.25 s rearm.
2. **Dialog:** an `onLetter(ch, index, page)` hook called for each newly shown character (default: the old single blip). Our voice synth uses it per speaker.
3. **Audio:** a third bus, `audio._voiceBus` (master → voice), with `audio.voiceVolume` and a standard setting, "Voices" (0–100%).
4. **Humanoid weapons:** new weapon kinds `'stick'`, `'club'` and `'ripper'`, drawn next to the existing `'sword'`/`'staff'` code using the same blade/tip joints, so `rig.tip()`, smears and moves keep working.
5. **Glyph default:** `input.glyphs` defaults to `'playstation'` for this game. Our Settings item "Button glyphs" (PlayStation / Xbox) writes it.
6. **Body ceilings:** none in the engine; `VoxelBody` (§6.1.6) handles them in game code. If the renderer, Body or Input need anything else, add it the same way and log it.

Do **not** rebuild the standard features: pause menu, settings, rebinding, full screen, boot screen, save slots. Adjust them with `new E.Game({ menu: {...} })` and `game.saves`.

---

## 5. Architecture

### 5.1 Principles
- **One namespace.** `globalThis.DQ` holds every module. Each `src/NN-name.js` is an IIFE that adds to `DQ` and reads only what earlier files defined.
- **Logic and drawing are split.** Every system has `update(dt)` with no rendering, and a separate `draw(r)`. All logic runs headless in Node: `new E.Game()` is headless without a DOM and `draw` is skipped. UI screens are state machines (focus index, open tab, scroll), driven by input actions and testable headless; drawing reads that state.
- **Determinism.** No `Math.random` in game logic. Use named seeded streams, `DQ.rng(label)` (built on `E.rng(seed ^ hash(label))`). World seed `20261103`. In a hub session, shared streams come from `AIHub.rng(label)`. Cosmetic randomness (particles, weather) uses its own streams.
- **Event bus.** `DQ.events.on(name, fn)` and `emit(name, payload)` decouple systems. Quests, tutorials, the HUD, audio stingers, stats and tests all listen. Events:
  - Blocks and items: `blockBroken`, `blockPlaced`, `objectPlaced`, `objectRemoved`, `itemGained`, `itemUsed`, `crafted`, `notion`
  - Town: `roomFormed`, `roomLost`, `cheer`, `townLevel`, `patternPlaced`, `patternDone`
  - Residents and combat: `npcArrived`, `talk`, `monsterKilled`, `builderHurt`, `builderKO`
  - Story and time: `questStep`, `questDone`, `timeOfDay`, `siegeWave`, `bossPhase`, `chapterClear`
- **One context object.** `DQ.ctx = { game, world, builder, town, story, quests, npcs, monsters, ui, audioX, tuning, events, net, mode }` is created per play session. Systems receive it in their constructor and never reach for globals beyond `DQ`.
- **Data tables** live in `src/0x-data-*.js` as JSON-compatible literals: no functions in data except clearly marked `make` generators for stamps. Designers edit those files.

### 5.2 Modules (`src/`, concatenated in this order)

| File | Owns | Key API |
|---|---|---|
| `00-core.js` | `DQ` namespace, constants (`T=16`, world sizes), `hash`, `rng`, event bus, `DQ.ctx` factory, logging | `DQ.rng(label)`, `DQ.events` |
| `01-data-blocks.js` | Block registry (§7.2) | `DQ.BLOCKS[id]`, `DQ.blockId(key)` |
| `02-data-items.js` | Items, recipes, notions (§7.3–7.4) | `DQ.ITEMS`, `DQ.RECIPES` |
| `03-data-objects.js` | Placeable objects and their `E.SHAPES` entries (§7.5) | `DQ.OBJECTS` |
| `04-data-rooms.js` | Room recipes, town levels (§7.6–7.7) | `DQ.ROOMS`, `DQ.LEVELS` |
| `05-data-world.js` | Regions, stamps (ASCII layers), POIs, portals, plant scatter, spawn tables (§7.1) | `DQ.WORLD` |
| `06-data-npcs.js` | Residents: look, voice, schedule, job, dialog nodes (§7.8) | `DQ.NPCS` |
| `07-data-monsters.js` | Monster and boss stats, AI params, drops (§7.9) | `DQ.MONSTERS` |
| `08-data-quests.js` | Quests, steps, conditions, rewards, `E.Story` nodes, cutscene ids (§7.10) | `DQ.QUESTS`, `DQ.STORY_NODES` |
| `09-data-audio.js` | Songs, jingles, sfx voices, voice profiles (§7.11–7.12) | `DQ.SONGS`, `DQ.SFX`, `DQ.VOICES` |
| `09b-data-tuning.js` | Tuning defaults and slider metadata (§6.19) | `DQ.TUNING_DEFS` |
| `10-voxel-world.js` | Voxel storage, edits, queries, collision, raycast, save diff | `DQ.VoxelWorld` (§6.1) |
| `11-voxel-render.js` | Face-sprite atlas, column-run rendering, cutaway, water, void fringe, overlays | `DQ.VoxelRenderer` |
| `12-worldgen.js` | Terrain, layers, ores, trees, water, stamps, plants, portals | `DQ.generateWorld(world, def)` |
| `13-physics.js` | `VoxelBody` (ceilings, auto-hop, water, void), stair ramps | `DQ.VoxelBody` |
| `14-input.js` | Action presets, intents, cursor modes, mouse picking, glyph icons and prompt strings | `DQ.Controls`, `DQ.Glyphs` |
| `15-builder.js` | Player entity: stats, equipment, actions (swing, break, place, use, eat, interact), KO and respawn | `DQ.Builder` |
| `16-inventory.js` | Bag, hotbar, chests, Town Chest, equipment, stacks, overflow | `DQ.Bag`, `DQ.Chest` |
| `17-crafting.js` | Stations, recipe availability, crafting, notion unlocks | `DQ.Crafting` |
| `18-objects.js` | Object instances: doors, lights, beds, stations, traps, ballistas, portals, plants (regrowth) | `DQ.Objects` |
| `19-rooms.js` | Room detection and classification, room registry | `DQ.Rooms` |
| `20-town.js` | Banner, border, Cheer, town level, Patterns (ghosts, progress, helpers) | `DQ.Town` |
| `21-nav.js` | Voxel navigation graph, A*, flow fields, breaker paths | `DQ.Nav` |
| `22-npcs.js` | Resident AI: schedule, needs, jobs, helping, fighting, Cheer bubbles | `DQ.Residents` |
| `23-monsters.js` | Monster AI, spawning, despawning | `DQ.Monsters` |
| `24-combat.js` | Damage, hit effects, knockback, i-frames, drops, the Lost Bundle | `DQ.Combat`, `DQ.Drops` |
| `25-siege.js` | Siege director (prep, waves, fail/retry), boss directors | `DQ.Siege` |
| `26-bosses.js` | Sir Buttonsworth, Gnarlgrim, Tangle mechanics | `DQ.Bosses` |
| `27-time.js` | Day clock, lighting by hour, weather, sleep | `DQ.Clock` |
| `28-story.js` | Quest director (steps on events), `E.Story` wrapper, cutscene scripts, objective targets | `DQ.Quests`, `DQ.Cutscenes` |
| `29-ui-hud.js` | HUD, prompts, popups (Notion, Room, Level), Cheer, damage numbers, objective marker, cursor | `DQ.Hud` |
| `30-ui-menus.js` | Title, name entry, Satchel (Bag/Map/Journal), crafting, chest, travel, banner, dialog skin, results, credits, About | `DQ.Menus` |
| `31-audio.js` | Music director (per region, time and town level layers), sfx defs, Animalese voice synth | `DQ.AudioX` |
| `32-save.js` | `game.saves` read/write, versioning, migrate, autosave | `DQ.Save` |
| `33-dev.js` | Dev mode panel, cheats, sliders, overlays, stamp export | `DQ.Dev` |
| `34-attract.js` | Attract-mode director (vignettes, AI builder, cheats) | `DQ.Attract` |
| `35-ai.js` | Shared AI "autopilot" (walkTo, breakAt, placeAt, craft, talk, fight). Used by attract, tests and Bee bots | `DQ.Autopilot` |
| `36-net.js` | AI Hub session flow, message codec, host and client logic, loopback | `DQ.Net` |
| `37-bee.js` | Quilting Bee rules (hub round and solo challenge), its world, scoring | `DQ.Bee` |
| `38-scenes.js` | Scenes: title, attract, newgame, intro, play, results, credits, bee, hubcard | `DQ.Scenes` |
| `99-main.js` | Creates `E.Game`, settings, menu, boot steps, `game.debug`, starts | — |

### 5.3 Game object and scenes
```js
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'iso', views: ['iso', 'threequarter'],
  input: DQ.Controls.PLAY, id: 'dragon-quilt-builders',
  menu: { saves: { slots: 3, version: 1, migrate: DQ.Save.migrate },
          items: [['Satchel', openSatchel], ['Dev Tools', DQ.Dev.open], ['About & Credits', openAbout]],   // Dev Tools hidden in a hub session
          settings: DQ.SETTINGS, controls: DQ.Controls.NAMES, quit: 'title' } });
```
- **Scenes:** `title` (menu and attract countdown), `attract`, `newgame` (name, look), `intro` (story crawl), `play` (`pausable: true`, `camera: { zoom: false }`: the engine's continuous player zoom stays off, because our own zoom steps call `game.setZoom`, §6.1.3), `results` (chapter clear), `credits`, `about` (also openable over the pause menu), `bee` (Quilting Bee, solo or hub), `hubcard` (the game's own AI Hub card).
- **Boot steps** (`game.start({ boot: { title: 'DRAGON QUILT BUILDERS', steps } })`):
  1. "Unrolling the quilt" (world generation)
  2. "Threading the needles" (face-sprite atlas, icons)
  3. "Waking the residents" (nav graph)
  4. "Tuning the voices" (audio definitions)

  Boot messages: "Counting the buttons", "Untangling yarn", "Ironing the seams".
- **`play.update(dt)` order:**
  1. `Controls.intent()`
  2. `Builder.update`
  3. block actions
  4. `Objects.update` (doors, traps, ballistas, plants)
  5. `Residents.update`
  6. `Monsters.update`
  7. `Combat.resolve`
  8. `Drops.update`
  9. `Town.update` (rooms debounce, Cheer, Patterns)
  10. `Quests.update`
  11. `Clock.update` (spawns, weather)
  12. `Siege.update`
  13. camera (`game.focus` on the builder with lead)
  14. `Hud.update`

  A modal UI (dialog, menu, cutscene) short-circuits gameplay updates. The world still animates (particles, water) and the clock pauses.
- **`play.draw(r)` order:**
  1. void background
  2. `VoxelRenderer.queue(r)` (sets `r._map`)
  3. objects (`r.shape`)
  4. Pattern ghosts
  5. town border stitches
  6. drops
  7. actors (builder with `xray`, residents, monsters)
  8. cursor
  9. lights (`game.lights.add`)
  10. `r.overlay` (HUD, popups, dialog, menus)
- **`game.debug`:**
  - `snapshot()` returns `{ scene, day, hour, builder: {x,y,z,hp,maxHp,belly,equip}, bag: {id:n}, town: {level, cheer, border, rooms:[type]}, quests: {id: step|'done'}, residents: [{id,x,y,state}], monsters: n, siege: {phase, wave}, boss: {id, hp, phase}, errors: n }`.
  - Helpers: `teleport(x,y,z)`, `give(id,n)`, `flag(k,v)`, `beat(id)` (jump to a story beat), `world` (the VoxelWorld), `ctx`.

---
## 6. Systems

### 6.1 Voxel world (the riskiest system; built first, see §9 MS1)

The engine's `TileMap` is a heightmap: one wall type per cell, no passages under things. Building needs real 3D blocks (roofs, bridges, tunnels, mixed-material walls), so the game has its own `VoxelWorld`. It plugs into the engine where the engine expects a map.

#### 6.1.1 Data
- Block size `T = 16` world units (one tile). Axes: x east, y south, z up.
- Story world: `W = 144, D = 144` columns, `H = 24` levels. Bee world: `48 × 48 × 16`.
- `vox: Uint8Array(W*D*H)`, column-major: `idx(x,y,z) = (y*W + x)*H + z`, so a column is contiguous.
- `meta: Map<idx, {rot, hp}>` holds stair rotation and partial damage. Damage heals back after 4 s without hits.
- `colVer: Uint32Array(W*D)` holds per-column versions for render caches. `topZ: Uint8Array(W*D)` is the highest solid level + 1, kept on edit.
- **Objects** (furniture, doors, lights, plants) are *not* voxels. They live in `DQ.Objects` with an anchor cell `(x,y,z)` and occupy that cell (doors and portals occupy 2 levels). `world.objAt(x,y,z)` is indexed by `Map<idx, obj>`.
- Block properties from `DQ.BLOCKS`: `solid`, `opaque`, `liquid`, `hp`, `tier`, `drop`, `tex`, `light`, `shape` (`'cube' | 'stair'`), `placeable`.
- **Level 0 is Backing Cloth** (unbreakable). Below and outside the world is the **Unravel**, a void. Anything falling below z = −16 (through a void hole or off the world's edge) respawns at its last safe position after a 0.6 s "unravel" effect. The builder takes 4 damage.

#### 6.1.2 API (`DQ.VoxelWorld`)
```
get(x,y,z) → id            set(x,y,z,id,{by, silent}) → bool (emits blockPlaced/blockBroken, bumps colVer of the column and 4 neighbours)
solidAt(x,y,z)  opaqueAt(x,y,z)  liquidAt(x,y,z)   (integer cells; outside the world and below level 0 is void, which reads as air)
topZ(x,y)                  standLevels(x,y) → levels L where solid(L-1) and air(L), air(L+1)
groundAt(px,py,r,z,step)   highest solid top ≤ z+step under the circle footprint, −Infinity over void (world units; feeds E.Body-style physics)
ceilingAt(px,py,r,z)       lowest solid bottom above z within the footprint (head bumps)
collide(body)              push a circle out of blocks overlapping [z+step, z+h) (same algorithm as TileMap.collide, per level)
raycast(o,d,maxT) → {x,y,z, nx,ny,nz, t} | null          3D DDA (Amanatides–Woo) through cells
pickScreen(sx,sy) → {x,y,z, n:[nx,ny,nz], obj} | null     view ray through the screen pixel (see 6.1.5)
bounds(view) → {x0,y0,x1,y1}                             camera clamp (as TileMap.bounds)
T, solids=[] , _liftOrder(view,x,y,z,k)                  the renderer's hooks (see 6.1.4)
diff() → [[idx, id], ...]   applyDiff(list)               save and network: cells that differ from the generated base world
hash() → u32                                              tests and net convergence
```
Generation writes `base` (a copy of `vox` taken after `generateWorld`), so `diff()` is a cheap scan. Saves store only the diff (typically under 30 KB).

#### 6.1.3 Rendering: face-sprite blitting per block, queued per column run
- **Face atlas.** For each `(view id, zoom step)` the renderer pre-renders a small sprite for every material and visible face: `top`, `faceA` (the camera-facing side on the viewer's left) and `faceB` (right). In three-quarter view there is `top` and `front`. Each material gets 4 variants (picked by `hash(x,y,z) & 3`).
  - Sprites are rasterized per pixel with `E.tones(base)`. The pattern functions are in §8.1. Each face is an exact parallelogram of the projected block face, snapped to whole pixels. All blocks of a view and zoom project to the same shapes, so one atlas serves the whole world. It is rebuilt only when the zoom step changes. A 90° turn keeps iso faces identical, and the renderer only swaps which world face maps to A/B.
  - Light: top = `base`, faceA = `sh`, faceB = `deep`, following the engine's "light from the viewer's upper left".
- **Zoom steps.** Zoom is quantized to `[0.75, 1, 1.25, 1.5, 2]` (default 1). Our own zoom actions (− / =, right stick ↑/↓) step through them with `game.setZoom(step)`. The play scene sets `camera: { zoom: false }`, so the engine's continuous player zoom stays off and the atlas only ever needs these five scales. The chosen step is remembered in our settings (`dqZoom`).
- **Run queueing.** For each visible column, split its opaque solid blocks into runs `[z0, z1)`. Queue each run once:
  ```js
  r.queue(cx*16+8, cy*16+8, z0*16, g => drawRun(g, r, cx, cy, z0, z1), { occluder: true, top: z1*16 })
  ```
  `drawRun` blits, bottom to top, each block's visible faces: a side face shows where the neighbour column is not opaque at that level, and the top face shows where the block above is not opaque or is cut away. Then come overlays: crack stages on damaged blocks, contact AO (a 2-px dark band on side faces at a run's bottom where it meets the ground), top-face edge AO (a dark band along an edge whose neighbour is one level higher), and sun-shadow tint on tops that have a taller column within 2 cells toward the light. Overlays use `px.blend(g, a, 'multiply', ...)` with shared per-view overlay sprites.
- **Visible columns.** Invert the four screen corners to the ground plane at `z = 0` and at `z = H*16`. Take the cell bounding box plus 2 cells of margin, then clamp it. That is about 500–700 columns at zoom 1.
- **Liquids.** Water blocks are queued separately: `r.queue(..., z*16, drawWater)`. The water top is drawn with `px.blend(.7)` and a 4-frame shimmer, plus side faces next to air. Blocks under water get a blue multiply tint.
- **Void and fringe.** Behind the world, draw a deep-navy gradient (`r.sky(['#06051a','#0d0b2a','#141238'])`) with drifting cream "lint motes" and a faint stitched grid. Edge columns and void holes get frayed fringe threads: 1-px lines hanging 1–2 blocks below the lowest block, swaying with time. These are queued just before their column.
- **Cutaway** (seeing inside roofs, tunnels and canopies). Each frame, set `cut = heroLevel + 2` when an opaque block sits at a level in `[heroLevel+2, heroLevel+6]` in either of these places:
  - the hero's own column;
  - any of the 3 columns toward the camera. Step from the hero's cell by `(round(view.fx), round(view.fy))`, the ground direction that points at the camera; in iso both components are ±1.

  Ordinary 2-high room walls (levels `heroLevel` and `heroLevel+1`) are never cut; the x-ray silhouette shows the hero behind them.

  Blocks at `z ≥ cut` within radius 6.5 cells of the hero are skipped. A 1.5-cell band at the edge is drawn every other pixel (`px.polyDither`). A block just below the cut with a block above it gets a "cross-section" overlay: a darker top with a diagonal stitch hatch. The cut eases in and out over 0.2 s (the radius grows from 0). It stays on for 0.5 s after the hero leaves cover (hysteresis), so it does not flicker at doorways. Dev toggle: "Cutaway: auto / always / off".
- **X-ray.** The builder, remote players and bosses use `r.actor(..., { xray: { color, actors: false } })`. They show as tinted silhouettes behind blocks (the engine does this through `occluder` queue items).
- **Draw cost guard.** No baking hitches: blits are cheap. If a frame queues more than 2,500 runs (extreme zoom-out), draw the far columns' top faces only.

#### 6.1.4 Depth sorting
The renderer sorts by `view.order(x,y,z) = fx*x + fy*y + z*1e-3`. Runs in one column sort bottom to top, and columns sort by depth. For things that stand on blocks or sit under overhangs, the renderer calls `r._map._liftOrder(view, x, y, z, k)` for every queued item above `z > .5`. `VoxelRenderer.queue` sets `r._map = world`. Call it before queuing any actor or object: the renderer reads `r._map` at queue time and resets it to null at the start of every frame. Implement both directions:
- **Lift.** If the item's cell has a run whose top is `≤ z+1` and it is the highest such run, return `max(k, order(center, run.z0*16) + .002 + z*1e-5)`.
- **Sink.** If the item's cell has a run with `z0*16 ≥ z + 20` (an overhang above its head), return `min(k, order(center, thatRun.z0*16) - .002)`.

Also provide `world.T = 16` and `world.solids = []` (the renderer reads both). Test with a diorama (§11.2): a hero under a roof, on a bridge with a body below, beside and behind 2- and 3-high walls, on stairs, and in a doorway. Write a filmstrip check in all 4 rotations.

#### 6.1.5 Picking (mouse and touch-free targeting)
Use the line of sight through a screen pixel, as `TileMap.pick` computes it: P and N from the view rows. Clip to the world box and run the 3D DDA from the camera side. The first opaque or solid block hit, with the entry face normal, is the **break target**. `hit + normal` is the **place target**. Objects take part through `world.objAt` (placed objects count as hit targets, so the mouse can click a bench or a bed). Actors are picked with the engine's `{ pick: entity }` on `r.actor`/`r.shape` and `r.pick(sx, sy)` (the last frame's draws). Actor picks win over blocks when both are under the pointer. Respect the cutaway: cut blocks are not pickable.

#### 6.1.6 Physics (`DQ.VoxelBody extends E.Body`)
- Builder body: `r = 5, h = 28` (fits under a 2-block ceiling), `eye = 22, chest = 16`, `step = 2`, `gravity = 800`.
- **`update(dt, world)`.** Run `E.Body.update` (it calls `world.collide` and `world.groundAt`). Then check the ceiling: if `vz > 0` and `z + h > ceilingAt(...)`, clamp `z` and set `vz = 0`.
  - **Stairs:** in a stair cell the ground is a ramp along the stair's `rot` (0 → 16 over the cell), so walking up stairs needs no jump.
  - **Water:** in water, speed ×0.55. A column with water 2 or more levels deep blocks walkers like a wall (bodies cannot enter, and a falling body is pushed out to `lastSafe`). The builder cannot swim, as in the source.
- **Auto-hop** (setting, on by default). Moving into a 1-block ledge with 2 free levels above it, on the ground, for over 0.08 s triggers `jump(215)` with a small forward boost.
- **Safe positions.** Store `lastSafe` every 0.5 s while standing on solid ground that is not near a void edge.
- **No block may be placed inside a body.** `Builder.place` checks every builder, resident and monster AABB first, then shows "Something's in the way!"
- **`world.escape(body)`** moves a buried body to the nearest standable cell within 4 cells. It runs after any set() that could bury something (worldgen stamps, Tangle blocks).

### 6.2 Camera and views
- `game.follow(builder.body, { z: 14, lead: 18 })`, with `game.cam.bounds = v => world.bounds(v)` and `cam.smooth = .12`.
- **Rotation:**
  - Q/E keys, or a right-stick flick (`input.flick('x')`), turn by ±90° with `game.rotateView(±90)`.
  - Cover the snap with a 0.18 s crossfade: grab the previous frame's buffer before turning and blend it out with `px.blend` on the overlay. Play a soft "whoosh" (`sfx('whoosh', {vol:.2})`).
  - Movement keeps working in screen space (`view.screenDirToGround`).
- **Zoom:** right stick ↑/↓ or `−`/`=` step through the zoom levels (§6.1.3). In play the mouse wheel belongs to the hotbar; it zooms only on the Map screen. R3/R resets rotation and zoom (`game.resetCamera()`, then zoom step 1).
- **Settings → Camera view:** Isometric (default) or Three-quarter. It switches with `game.setView`; the atlas has entries for both.
- Cutscenes take the camera with tweens on a proxy focus object and give it back on exit.

### 6.3 The Builder (player)
- **Look:** chosen at New Game. Look A: spiky hair and a bandana. Look B: ponytail and an apron. Four palette swatches. Name entry (default "Patch") on an on-screen letter grid that works with a pad, keys or mouse; typing letters works directly. The builder never speaks (Dragon Quest tradition); choices are shown as menu options.
- **Rig:** `new E.Humanoid({ size: 1.0, build: 'chibi', ...look })`. Its head top must stay ≤ 28 units; assert in a test via `rig.worldOffset` of the head joint.
- **Stats:**
  - HP 40 (+10 per Heartpatch, ×3 in the story, so 70 max). Belly 100. Base attack 4.
  - Equipment slots: weapon, body, shield.
  - No experience levels. Growth comes from Heartpatches, gear and the town (as in DQB1).
- **Movement (tunable):** walk 78, sprint ×1.45 (Belly drains ×1.5), accel 900, friction 10 when no input, jump 215, air control 0.6, coyote 0.08 s, jump buffer 0.12 s.
- **Swing** (□ / LMB / J), using the equipped weapon:
  - A tap swings a 2-hit combo (`E.Combo(['slash','backslash'], { window: .3 })`): 0.38 s per swing, active from 0.35 to 0.6 of it.
  - Each swing hits monsters in a 70° arc within 22 units (`E.inArc` with `dz` ±14).
  - If no monster is in the arc, the swing hits the **break target**:
    1. It deals the weapon's `blockDmg`; the block's HP is `DQ.BLOCKS[id].hp`.
    2. Crack overlays show at 33%, 66% and 90%.
    3. At 0 HP the block breaks: fabric-scrap particles in its tones, a *rrrip* sfx, and the drop spawns.
    4. Blocks above a tool's tier go *clink*: sparks, no damage, and the prompt "Too tough for your Darning Stick!"
- **Spin Stitch** (unlocked in M5): hold swing for 0.6 s. A charge glow and rising tone play. Release for a 360° `spin` move: 1.5× damage, knockback 180, radius 26. It does not break blocks.
- **Place** (△ / RMB / K), using the selected hotbar item:
  - **Block:** set at the place target, if it is in reach (4.5 blocks from chest to cell centre), empty, not inside a body, and inside the world. The block pops in with a squash tween (scale 0.6 → 1.08 → 1 over 0.12 s), a stitch spark and a "stitch" sfx.
  - **Object:** placed with facing = the builder's facing, snapped to 90°. A green or red ghost preview shows validity.
  - **Usable** (food, Heartpatch, Banner): use it.
  - A full hotbar is fine; place takes one item from the bag stack.
- **Interact** (○ / F / RMB on an NPC or object): talk, open a chest, use a station, sleep, man a ballista, travel by portal, pick up the Lost Bundle, plant the Banner (on the marked spot).
- **Eat:** use food from the hotbar or bag. Belly and HP restore (§7.3), with a munch ×3 animation.
- **Hurt:** i-frames 0.8 s, knockback 90, flash, `expr: 'wince'`, a rumble of .35.
- **KO** at 0 HP:
  1. The `'die'` pose plays, then an *unravel* effect: the rig dissolves into thread particles.
  2. Granny says "Oh, dearie, you've come undone!"
  3. Fade, then respawn at the Banner (or the start point before it exists) with full HP and Belly 60.
  4. A **Lost Bundle** stays at the KO spot (map marker) holding 50% (rounded down) of each material stack. Tools and key items are never lost. On Relaxed, nothing is lost. During the siege or boss, KO instead retries from the siege checkpoint (§6.12).
- **Belly** drains 1 point every 9 s of real time (100 → 0 in 15 minutes); sprint ×1.5, fighting ×1.2. At 0, HP drops 1 every 4 s. "Your belly is rumbling!" warnings show at 25% and 10%.

### 6.4 Input, controls, prompts (controller first, keyboard and mouse native)

Action presets (`DQ.Controls.PLAY`, `DQ.Controls.MENU`) are passed to `game.input.use(...)`. The engine keeps the d-pad and arrow keys on movement and menus. The tables below are the defaults; players rebind through the standard Controls screen (`menu.controls` names them).

| Action | DualSense (standard mapping) | Xbox glyphs | Keyboard / mouse |
|---|---|---|---|
| Move | Left stick / D-pad | LS / D-pad | WASD / arrows |
| Camera turn 90° | Right stick ←/→ (flick) | RS | Q / E |
| Zoom | Right stick ↑/↓ | RS | − / = |
| Reset camera | R3 | RS click | R |
| Jump (menus: confirm) | ✕ | A | Space (menus: Enter/Space) |
| Swing / break (hold: Spin Stitch) | □ | X | Left click (keyboard-only: J) |
| Place / use item | △ | Y | Right click (keyboard-only: K) |
| Talk / interact (menus: back) | ○ | B | F (menus: Esc/Backspace) |
| Hotbar previous / next | L1 / R1 | LB / RB | Wheel, 1–8, [ / ] |
| Sprint (hold; toggle in Settings) | R2 | RT | Left Shift |
| Builder's Eye (precision cursor, hold) | L2 | LT | C |
| Satchel (Bag, Map, Journal) | Create | View | Tab / I (Bag), M (Map), N (Journal) |
| Map shortcut | Touchpad click (button 17, if reported) | — | M |
| Pause menu | Options | Menu | Esc / P |

- **Cursor modes** (`Controls.cursorMode`):
  - **Auto** (stick or keys used last). The target cell is the neighbour cell in the builder's facing, rounded to 8 directions.
    - Break target: the first solid block in that cell at level L0 (feet), then L0+1, then L0−1.
    - Place target: L0−1 if it is empty (fills holes), else L0, else L0+1, else L0+2. So walls 3 high can be stacked from the ground and pits get filled.
  - **Mouse** (the mouse moved or clicked in the last 2 s). The target follows `world.pickScreen` under the pointer. LMB swings at that block and RMB places there. The builder turns to face the target.
  - **Builder's Eye** (hold L2 / C). The builder stands still and a precision cursor appears at the auto target.
    - Stick, d-pad or WASD step the cursor one cell (repeat .16 s), clamped to reach.
    - R1 or Space raises the cursor one level; R2 or Shift lowers it.
    - Swing and place act at the cursor.
    - On screen: a grid of stitched dots around the cursor and a level number.
- **Cursor display:** a stitched wireframe cube (12 projected edges, 1-px dashed cream thread, pulsing). The break target highlights the block's faces. The place target shows a 50%-alpha ghost of the held block or object. Out of reach, it turns red and dashed, with "Too far".
- **Glyph icons** (`DQ.Glyphs.draw(g, actionOrCode, x, y)`). The engine font lacks ✕○□△, so the game draws its own 9×9 pixel icons:
  - PlayStation: ✕ blue `#7aa7ff`, ○ red `#ff6a6a`, □ pink `#ff8ad8`, △ green `#55dca8`, on dark discs.
  - Xbox: A green, B red, X blue, Y yellow letters on discs.
  - L1/R1/L2/R2/LB/RB/LT/RT as rounded rectangles. Sticks as rings with L or R. Options/Create as pills.
  - Keyboard keycaps are rounded light-grey rectangles with the key's label from `input.label()`; Space is wide.
  - Mouse: a mouse body with the left or right button filled, or a wheel.
  - Which family shows follows `input.lastDevice`: gamepad → `settings.glyphs` (PlayStation default, Xbox optional); keyboard → keycaps; mouse → mouse icons for mouse-bound actions and keycaps for the rest.
  - Every prompt is built from `game.input.label(action)`, never hard-coded.
- **Context prompts** (bottom left, at most 3): e.g. `□ Break Earth`, `△ Place Cobble`, `○ Talk to Wren`, `○ Craft`, `○ Sleep`, `○ Man the Ballista`. They change with the cursor target and the hotbar item.
- **Menus:** all of the game's own screens use `MENU` actions. Mouse hover moves the focus, click confirms, wheel scrolls lists. L1/R1 or Q/E switch tabs.
- **Rumble:** hits .35, block break .15, boss slam .8 (respects the vibration setting).
- **AI Hub rule:** while Create (Pad8) is held in a session, ignore Options. In a session, the Satchel opens on Create *release* if Options was not pressed during the hold.
- **Touch-only devices:** see §6.22.
- **Action map** (`DQ.Controls.PLAY`, in the engine's preset format `{ action: [codes] }`; the engine adds `up/down/left/right/start/pause/confirm/cancel` to every preset):
  ```js
  jump: ['Space','Pad0'], swing: ['Mouse0','KeyJ','Pad2'], place: ['Mouse2','KeyK','Pad3'], interact: ['KeyF','Pad1'],
  sprint: ['ShiftLeft','Pad7'], eye: ['KeyC','Pad6'], hotPrev: ['BracketLeft','Pad4'], hotNext: ['BracketRight','Pad5'],
  hot1..hot8: ['Digit1'..'Digit8'], camLeft: ['KeyQ'], camRight: ['KeyE'], zoomIn: ['Equal'], zoomOut: ['Minus'],
  camReset: ['KeyR','Pad11'], satchel: ['Tab','KeyI','Pad8'], map: ['KeyM','Pad17'], journal: ['KeyN']
  ```
  - The right stick is read from `input.padAim`: flicks give `camLeft`/`camRight` through `input.flick('x')`, and holding ↑/↓ zooms (one step per 0.35 s). The wheel comes from `input.wheelSteps()`.
  - `DQ.Controls.MENU` uses the engine's defaults, plus `tabPrev: ['KeyQ','Pad4']` and `tabNext: ['KeyE','Pad5']`.
  - Verify that the browser's context menu (right click) and Tab focus moves are suppressed on the canvas. The engine prevents defaults for bound keys; check this in the browser suite.
- **Intent** (`Controls.intent()` → one plain object per step). This is the only thing `Builder.update` reads, so the player, the attract AI, the tests and the Bee bots all drive the same code path:
  ```js
  { move: [gx, gy],            // ground direction, length ≤ 1 (already turned through view.screenDirToGround)
    jump, jumpHeld, sprint,     // booleans
    swing, swingHeld, swingReleased, place, interact,
    hot: null | -1 | +1 | 0..7, // previous/next or a direct slot
    eye: false,                 // Builder's Eye held
    cursor: null | { x, y, z }, // an explicit target cell (mouse pick, Builder's Eye, AI)
    camTurn: 0 | -1 | 1, zoom: 0 | -1 | 1 }
  ```

### 6.5 Items, bag, hotbar, chests
- **Bag:** 40 slots, stacks of 99. Key items are separate and unlimited.
- **Hotbar:** 8 slots that reference item ids in the bag, DQB style. A count of 0 shows a greyed slot. Pickups fill an empty hotbar slot with new placeable or usable items.
- **Pickups:** broken blocks and defeated monsters drop item entities that bounce out, bob and spin. After 0.3 s they magnetize to a builder within 1.5 blocks and are auto-picked with a "pickup" blip. A toast shows "+3 Straw" (stacked toasts, bottom right). If the bag is full, the drop stays and the toast says "Your bag is full!". Drops despawn after 5 minutes.
- **Chests:** 20 slots. Interact opens a two-pane screen (bag | chest) with "Store all materials".
- **Town Chest:** from Town Level 2, any chest inside the border can be made the Town Chest (interact → "Make this the Town Chest"). Residents put gifts in and take materials out of it for Patterns, and Marigold cooks from it. Exactly one Town Chest exists.

### 6.6 Crafting, stations, Notions
- **Stations:** Pocket (from the Bag tab "Pocket Notions"), Mending Bench, Hearth Pot, Thimble Forge. A station screen lists known recipes for that station.
  - Each row: icon, name, and ingredients as icons with have/need counts. Have ≥ need shows white with a tick icon, otherwise red with a cross icon (counts in text too, never colour alone). The pixel font has no ✓ or ✗, so draw them as `DQ.Glyphs` icons.
  - Quantity picker ×1, ×5 or Max. Confirm crafts.
  - At most 6 rows per page. A large detail pane shows the description.
- **Crafting feedback:** the builder hammers at the station (a `bash` loop for 0.5 s), sparkles fly, a "ta-da" chime plays, and the item's icon pops above the station. Crafted items go into the bag.
- **Notions** (inspiration). Each recipe has `notion: { on: 'pickup'|'quest'|'level'|'talk'|'start', key }`. The first time the trigger fires:
  1. The recipe unlocks.
  2. The builder strikes a thinking pose (a `kneel` blend for 0.4 s, then `'cheer'`).
  3. A thought bubble shows the item icon above the head for 2 s.
  4. A harp-gliss jingle plays.
  5. The popup reads "**You've got a notion!** Straw Bed. Craft it at a Mending Bench."
  - Popups queue and never overlap.
  - The Journal's Notions page lists all known recipes.

### 6.7 Objects
Data is in §7.5. Behaviour:
- **Doors** (2 levels high, 1 cell): they swing open with a tween when a builder or resident is within 1 cell, and close after they leave. Monsters treat closed doors as walls and attack them (door HP 30/50). A broken door drops nothing and breaks the room.
- **Lights** (torch, lantern, Glow Patch, hearth, forge, banner): each frame, add `game.lights.add(x, y, z+12, radius, intensity, { color })` for lights within the view plus 2 cells. Torch flames come from the engine's shape `flames`. Torches count as room lights.
- **Beds:** interact at night (19:00–05:00) with no monster within 8 blocks: fade to black, a "Zzz" jingle, and time jumps to 06:00. HP is restored, Belly −10, and an autosave runs. During the day: "It's not bedtime yet!" Residents use beds at night (§6.10).
- **Stations:** interact opens crafting. A station must be inside the town border to count for rooms; it works anywhere.
- **Pin Trap:** a floor object. Monsters on it take 8 damage every 0.8 s and are slowed ×0.6. Builders and residents are unharmed.
- **Bobbin Ballista** (HP 150):
  - Unmanned: during a siege it auto-fires at the nearest regular monster within 10 blocks every 5 s (20 damage); it never targets bosses.
  - Manned (interact):
    1. The builder sits behind it and the camera eases toward the ballista's facing.
    2. Stick or mouse aims within ±60°, with aim-assist snapping to the nearest monster in a 12° cone.
    3. □/LMB fires a spool bolt: 260 u/s, 30 damage, pierces 1. It counts as a *Tangle hit* on Gnarlgrim.
    4. Reload takes 2.5 s (a crank animation plus a click-clack).
    5. ○ dismounts.
  - When destroyed it becomes a "Broken Ballista". Interact with 2 Planks to repair it fully.
- **Bobbin Portals** (prebuilt at POIs): touching one *discovers* it (a jingle and "Portal attuned: Corduroy Crags"). Interact opens a travel list of discovered portals: a swirl transition to the destination, ending in front of that portal.
- **Plants** (tufts, cotton puffs, berry bushes, flowers, puffballs, dead bushes): object-plants that break in one hit with any tool and drop items (§7.3). They regrow at their original spot after 1 in-game day if the cell is still free.
- **Ancient Buttons** (S3 collectibles): big golden button objects that glint. Interact to collect.
- **The Banner of Mending:** interact opens the Banner screen: town name, level, a Cheer bar to the next level, the room list, residents and their mood, and the next unlock.

### 6.8 Rooms (`DQ.Rooms`)
**The rule** (as in the source): a room is an enclosed floor area of **2 to 64 cells**, surrounded on every side by walls **at least 2 blocks high**. It must have **at least one door** in its perimeter and **at least one light** inside. A roof is optional. The room must be inside the town border to count for Cheer, but rooms are detected anywhere so the HUD can say "Rooms only count inside the town border!"

**Algorithm** (debounced 0.3 s after any `blockPlaced`, `blockBroken`, `objectPlaced` or `objectRemoved` inside the border + 2 cells):
1. Collect candidate floor levels L in the region: levels where a cell has solid(L−1) and air at L and L+1, or an object at L that is not a door.
2. For each L, classify every cell in the region:
   - WALL: opaque solid blocks at both L and L+1.
   - DOOR: a door object at L, set in a straight wall: the two cells beside it along the wall are WALL or DOOR. A door on a corner does not count.
   - FLOOR: not solid at L and L+1, solid below, an object allowed.
   - OPEN: anything else, including low walls of 1 block and void.
3. Flood-fill FLOOR cells (4-connected). A component is a room if it:
   - never reaches an OPEN cell, a region edge or the border;
   - has a size of 2–64;
   - touches ≥ 1 DOOR;
   - contains ≥ 1 light object.
4. Classify it by the objects on its cells against `DQ.ROOMS`, in priority order. The first match wins; otherwise it is a **Snug**.
5. Match it to the previous room set by cell overlap ≥ 70%. Emit `roomFormed` (new, or its type changed) and `roomLost`.
6. **Cheer** is awarded the first time a room of each type forms in a "slot". A room's identity is its type plus a hash of its rounded centre, so rebuilding the same room does not pay again; each type pays at most `maxAwards` times (§7.6).
7. On `roomFormed`: a big centred banner ("ROOM COMPLETE! Bedroom") in stitched letters, a fanfare jingle, confetti scraps over the room, and a room-name label floating over its centre for 3 s. Residents react with `cheer` poses.

The overlay "Dev → Show rooms" tints room cells by type and shows OPEN leak cells in red with a cross icon. Use it to explain failures.

**Leak hints:** when a nearly enclosed area fails, the builder looks at the Banner screen or uses Builder's Eye over it. The HUD names the first missing requirement: "Missing: a door" / "a light" / "walls must be 2 blocks high" / "too big (max 64)".

### 6.9 Town: Banner, border, Cheer, levels, Patterns (`DQ.Town`)
- **Planting.** Use the Banner on the marked plaza spot in Thimbleton. That runs a cutscene: the banner rises, a golden light ring expands, and the **border stitch** runs around the town square.
  - The border is a square of side `2r+1` around the banner, with `r` from §7.7.
  - On the ground it is an animated dashed running stitch (cream thread, 2-px dashes moving along the edge), drawn at each border cell's surface height.
  - In the void, at night, it glows faintly.
- **Cheer sources:** rooms (§7.6), quest rewards, and Cheer bubbles from residents (+5 each, §6.10).
  - Collecting a bubble: it flies to the HUD banner icon, which pulses, with a two-note "ding".
  - On reaching a level threshold:
    1. Town Level up (a cutscene of about 4 s): the banner glows, a new stripe stitches itself onto it, and the border grows outward in an animated sweep.
    2. A popup lists the unlocks.
    3. The Lv-up jingle plays.
    4. The next resident arrives at the following dawn (or immediately if it is daytime, walking in from the east road).
- **Patterns** (blueprints):
  - **Pattern data:** `{ id, name, size:[w,d,h], layers: [ASCII rows per level], legend: { ch: blockKey | {obj, facing} }, reward }`.
  - **Placement:** the player uses a Pattern scroll (key item) and a ghost footprint follows the cursor. Turn it 90° with L1/R1 (pad), or the mouse wheel or [ / ] (keyboard); the camera still turns with Q/E and the right stick. Confirm on valid ground inside the border: flat ± 1 level, no objects in the way (blocks in the way are OK; they are shown as "remove").
  - **Ghosts:** each unbuilt cell draws a translucent ghost of its target block (`px.blend(.35)`) with a dashed outline; wrong blocks get a red cross icon. The HUD shows a panel: "Quilters' Hall: 37/129", then the materials still needed (have/need, e.g. Cobble 12/35).
  - **Building:** placing the right block into a ghost cell counts it, with a sparkle and a short arpeggio. Objects in ghost cells (door, lanterns) count the same way.
  - **Helpers:** residents with the `helper` job (Professor, Wren, and Mortimer by day) take the needed materials from the Town Chest. Each walks to an unbuilt ghost cell they can reach and places a block with a hammer animation and a "tok". Rate: `tuning.helperRate` blocks/min each (default 6). If the chest lacks materials, they say so in a balloon ("Need Planks!") and idle.
  - **Completion:** when every cell matches, a celebration cutscene plays (§7.10) and the reward and Cheer are granted. The structure counts as a special room ("Quilters' Hall") if its rules match (§7.6).

### 6.10 Residents (`DQ.Residents`)
- Each resident is a `VoxelBody` plus a `Humanoid` or `Blob` rig, with a profile from `DQ.NPCS` (§7.8): `job`, `schedule`, `needs`, `voice`, `fighter` stats, and dialog nodes.
- **Schedule** (hours of the day clock; each block picks a target):

  | Time | Activity |
  |---|---|
  | 06–08 | Wake, stretch (`wave` pose), go to the plaza |
  | 08–18 | Job: see below; between tasks, wander inside the border |
  | 18–20 | Supper: sit at a Mess Hall stool if one exists and eat (+bubble) |
  | 20–21 | Socialise near the Banner (talk balloons `note`, `dots`) |
  | 21–06 | Sleep in a free bed in a Bedroom (+bubble at 06:00); without one, sleep on the ground beside the Banner (mood −1, a "No bed..." balloon) |
- **Jobs:**
  - **Wren** (gatherer): each morning she puts 3 random basics (straw, branch, cotton) into the Town Chest. In sieges she uses a slingshot (4 damage, range 6 blocks, 1.2 s).
  - **Mortimer** (guard): patrols the border at night with a lantern and fights monsters inside the border with a club (8 damage, `overhead`). In sieges he leads the defence. He needs a Guard Post to stand watch from (+bubble).
  - **Marigold** (cook): with a Kitchen, cooks at the Hearth Pot (stirring loop) twice a day from Town Chest ingredients into the chest. At 18:00 she sets a dish on the Mess Hall table. In sieges she throws hot pies (5 damage, arc).
  - **Professor Selvage** (helper): builds Patterns from the Town Chest at the helper rate, or reads in the Workshop. In sieges he hides in the Hall.
  - **Lintwick** (fluff-farmer): puts 2 Lint into the Town Chest daily and dances (a Blob hop loop) when happy. In sieges he rolls into monsters (3 damage + knockback).
- **Needs and Cheer bubbles.** At most once per day per need, each satisfied need spawns a floating pink heart bubble (+5 Cheer) over the resident, which stays until collected:
  - sleep: slept in a bed
  - meal: ate a dish
  - comfort: their favourite room exists (Wren: Bedroom, Mortimer: Guard Post, Marigold: Kitchen, Professor: Workshop, Lintwick: a Bedroom with a Felt block in its walls)

  Collect a bubble by walking within 2 blocks of it. Unhappy residents show a `dots` balloon and say why when you talk to them.
- **Requests:** a resident with an available quest shows a bouncing "!" balloon (`story.emote`). Talking starts it, and its steps appear in the Journal and HUD. When the steps are done, a "?" balloon shows; talk to them to turn it in.
- **Arrival cutscene:** the resident walks in along the east road, the camera pans to them, and they say their intro line. "Mortimer has moved into Thimbleton!" shows with a jingle.
- **Navigation** (`DQ.Nav`):
  - **Graph:** nodes are standable `(x, y, L)`. Edges:
    - 8-neighbour moves (diagonals only if both orthogonal neighbours are open), cost 1 (diagonal 1.41)
    - step up 1 level (a hop), cost 2
    - drop down 1–3 levels, cost 1.5
    - doors open for residents, closed for monsters
  - **A\*** with a binary heap, capped at 3,000 expanded nodes. Smooth paths by line-of-walk. Re-path when an edit touches a path cell.
  - **Stuck rule:** if a resident has not progressed for 8 s and is off-screen, teleport them to the target. On screen, try a hop, then re-path.
- **Talk:** dialog with a portrait (`rig.drawPortrait`) and the resident's voice. Lines vary by flags, time of day, mood and town level (`E.Story` nodes with `if` conditions).

### 6.11 Monsters and combat (`DQ.Monsters`, `DQ.Combat`)
- **AI states:** `idle/wander → notice` (a "!" over the head plus a squeak, 0.3 s) `→ chase → windup` (telegraph: flash, crouch or squash, a sound) `→ attack → recover`. Then `→ flee` (below 20% HP for Lintlings) or `→ hurt` (stagger 0.25 s) `→ dead` (pop, particles, drops, `monsterKilled`).
  - Aggro uses radius `tuning.aggro`, scaled by type (§7.9), plus `world.raycast` sight from eye height.
  - Leash: return home after chasing 24 blocks away from home.
- **Spawning:**
  - Region tables (§7.1) by day or night. Spawn on standable cells under open sky, ≥ 10 blocks from the builder, outside the town border, never inside rooms or during cutscenes.
  - Rate: 1 spawn per `tuning.spawnEvery` s (day 8, night 5) while the active count is below `tuning.maxMonsters` (default 10).
  - Despawn: more than 40 blocks away for 20 s.
- **Damage:**
  - `dmg = max(1, round((atk − def/2) × U(0.9, 1.1)))`, where U is drawn from the combat stream.
  - Builder crits: 5%, ×1.5 (Spin Stitch never crits).
  - Multipliers: `tuning.monsterHp`, `tuning.monsterDmg`, `tuning.builderAtk`, and difficulty (Relaxed 0.5 damage taken, Normal 1, Hard 1.4).
- **Hit feedback:**
  - `game.hitFx(x,y,z,{ power, damage, angle })` (hit-stop, shake, impact star, damage number), plus `E.knockback(builder, mon, 120, 40)`.
  - Monster hits on the builder: knockback 90, i-frames 0.8 s, a red vignette flash under `game.flash` limits.
  - Each move has its own sound.
- **Drops:** rolled on death from the drop table (`tuning.dropRate` multiplier on chances); items fly out.

### 6.12 Siege and bosses (`DQ.Siege`, `DQ.Bosses`)
- **Siege director** (used once in the story, M13–M14, and in the Bee round). It is a `game.script` generator:
  1. **Prep.** Mortimer's rally line, then a 90 s countdown banner ("The Knotted army approaches! 1:30"). Build defences meanwhile; the music turns tense with the drum layer.
  2. **Autosave checkpoint** `siege`.
  3. **Waves** W1 → W2 → W3 (§7.9). Each wave spawns over 10 s from the east road (96,76), the Rift (96,80) and the north path (72,52). It ends when all of its monsters are defeated. Between waves: a 25 s breather with "Wave cleared!" and a repair prompt.
  4. **Boss.** Gnarlgrim enters through the Rift (cutscene, §7.10).
- **Monster targets in sieges:** first the Banner (HP 300; its HP bar is on the HUD during the siege), then ballistas, then the nearest town-structure block in the way (flagged `town` when placed inside the border), then residents, then the builder.
  - Monsters path with **breaker A\***: wall blocks count as passable at cost 8 per block, and doors at cost 4.
  - On reaching a blocking block or door, a monster attacks it (Lintling 3, Pinhog 6, Frayed Knight 8, Knotbrute 25, Gnarlgrim 60 block damage per hit).
- **Fail:** the Banner falls, or the builder is KO'd while Gnarlgrim is active. Then "The Banner has fallen..." / "You've come undone...", and a choice: "Try again from the start of the siege" (reload the checkpoint) or "Return to title". Waves already cleared stay cleared only within a single attempt.
- **Sir Buttonsworth** (mini-boss, Button Quarry floor):
  - Intro: he rises from a heap of buttons.
  - Moves:
    - **Slam:** wind .6 s; a shockwave ring of radius 3 blocks expands over .5 s. Jump to avoid it; it deals 12.
    - **Button Volley:** wind .4 s; 5 buttons in a 50° spread (`E.Bullets`, 110 u/s, 8 damage).
    - **Stomp Charge:** wind .7 s; charges 140 u/s toward the builder, breaks blocks in its path, and is dizzy for 2 s after hitting a wall. Dizzy takes double damage.
  - Below 50% HP he summons 3 Lintlings once.
  - The arena has 4 cobble pillars that break under charges.
  - Defeat: he pops into buttons and drops the Golden Needle and 3 Steel Thread.
- **Gnarlgrim the Knotted** (final boss, in and around the Thimbleton plaza), HP 600 in three phases (100–66%, 66–33%, 33–0%):
  - **Tightly wound.** Def 25, so normal hits do about 1 damage. Mortimer and Granny hint "Use the Ballistas!" after 3 such hits.
  - **Tangled.** 2 manned-ballista hits within 8 s, or 1 hit during his charge, make him Tangled for 5 s: he sits in a heap with `down: .6`, his chest **Heart Knot** glows, and his def drops to 0.
    - Hits on the Heart Knot (front arc) with the Seam Ripper do ×4, other weapons ×2.
    - A stagger plays at 100 damage per Tangle; leaving the Tangle triggers a roar knockback.
  - **Phase 1:** Yarn Slam (ring, radius 3.5) and Tangle Toss (lobbed yarn ball via `E.arc`, landing in 1.1 s on a shadow telegraph; 10 damage and leaves a temporary Tangle block for 20 s).
  - **Phase 2:** adds Charge (breaks blocks in its path and targets a ballista) and summons 4 Lintlings at the phase start.
  - **Phase 3:** all moves 25% faster, a double Tangle Toss, and a Knotbrute summon.
  - Phase transitions: a roar (`shout` expression) and a knockback ring; the music switches to the next layer.
  - Defeat cutscene: he unravels into heaps of yarn (thread particles) and the Golden Thread fragment flies into the Banner. The rift heals (§7.10).

### 6.13 Day, night, lighting, weather (`DQ.Clock`)
- One day = `tuning.dayMinutes` (12) real minutes; the story starts on Day 1 at 08:00.
- **Phases:** dawn 05–07, day 07–17, dusk 17–19, night 19–05.
- `game.lights.enabled = true` always. `ambient` follows the hour: night .30 with a cool blue tint, dawn and dusk .65 with a warm tint, day 1.0. Use `lights.tint`, setting `lights.dark` per phase, then `lights.refresh()`.
- Light sources add light pools (§6.7). At night, stars twinkle in the void, Mothlets spawn and Frayed Knights roam the Rift.
- **HUD clock:** a sun/moon dial with "Day 3".
- **Weather (cosmetic, engine `game.weather`):** the Fraying always has `ash` (purple tint). The Glen rains lightly some days (Day 2 afternoon, Day 4 morning). Weather resets per region when it changes.
- **Sleeping** is in §6.7. **Night-time Granny line:** the first night she warns "Monsters get bolder after dark, dearie. A lit room is a safe room!"

### 6.14 Health and hunger
- The HUD shows HP as a red patch bar with numbers ("HP 32/40") and Belly as a bread-loaf bar.
- Low HP (< 25%) adds a heartbeat sfx and a red vignette (follows the reduce-flash setting).
- Food is in §7.3. Eating restores Belly and HP; raw Thimbleberries restore Belly +5.
- Starving: HP −1 every 4 s, with the prompt "Your belly is empty! Eat something!"

### 6.15 Story, quests, dialog, cutscenes (`DQ.Quests`, `DQ.Cutscenes`)
- **Engine pieces:** `E.Story` (story module) runs conversations as data nodes, with `who`, `say`, `choices`, `set`, `quest`, `done`, `emote` and `event`. One `E.Dialog` instance is skinned as a Dragon Quest-style box: a dark indigo panel with a cream stitched border (dashed 1-px line 2 px inside the edge), a name tab, a portrait at the left, typed text with Animalese blips, and a bobbing arrow sprite at page end (the font has no ▼).
- **Granny Gossamer's box:** a golden stitched border with gold text and a glowing spool portrait (a custom portrait function).
- **Text:** 3 lines per page, at most 52 characters per line, `E.font` scale 1 (≈ 31 px tall on a 1080p TV).
- **Quest data** (§7.10): `{ id, title, giver, steps: [{ text, done: condition }], reward, next, unlock }`. Conditions are data:
  - `{ have: {item: n} }`, `{ crafted: id }`, `{ placed: objId }`, `{ room: type }`, `{ level: n }`, `{ talk: npc }`
  - `{ killed: {monster: n} }`, `{ at: poi, radius }`, `{ pattern: id }`, `{ flag: k }`, `{ siegeDone: true }`, `{ boss: id }`
- **Quest director:** evaluates the current steps on relevant events (cheap) and once per second as a fallback. It advances steps and emits `questStep`/`questDone`. Rewards: `{ cheer, items, notions, flags, heartpatch }`. HUD: "Quest complete: Wren's Bed" with a jingle.
- **Objective tracker** (top centre; switch it off per quest with Track on/off in the Journal, or entirely with the HUD tracker setting): the quest title, the current step text, and a marker. The marker is the engine's `r.marker(x,y,z,{label})`, which becomes an edge arrow off screen, with the distance in blocks. Targets: the POI, NPC or Pattern from the step, or for gather steps the nearest matching plant or block within 40 blocks (scanned once per second).
- **Cutscenes** are `game.script` generators: camera tweens on a proxy, dialog awaits (`yield E.until(() => !talk.open)`), NPC walks (autopilot), and effects.
  - Skip: hold ○, Esc or right click for 1 s (a fill ring shows) to jump to the end state.
  - Every cutscene has `apply()`, which sets its end state. Skipping and tests call it.
- **Writing style** (Dragon Quest-like):
  - Short, punchy lines; exclamations; earnest heroism softened with jokes; sewing puns; NPCs with verbal tics.
  - The silent Builder answers only through choices ("Of course!" / "What's a bed?").
  - System lines are cheerful: "You got 3 Straw!", "Thimbleton is now Level 2!", "A Lintling bounces into view!"
  - Avoid modern slang. Keep it family-friendly. Never reuse Dragon Quest names, places or iconic phrases verbatim.
  - **Font-safe text.** In-game strings use only ASCII plus the font's extra glyphs (♥ ★ ← → ↑ ↓ • × ♪ ▸ ©). Use no em dashes, curly quotes, ✓ ✗ ▼ ♭ or controller symbols inside strings. Button prompts embed tokens such as `{btn:swing}`; the HUD text renderer swaps each token for the `DQ.Glyphs` icon of the current device, built from `input.label`. A test scans every string table for characters outside the allowed set.

### 6.16 UI screens and HUD (10-foot, controller first; `DQ.Hud`, `DQ.Menus`)
All UI is pixel art drawn with `E.ui`, `E.font` and `px` inside `r.overlay`. Panels are dark felt (`E.ui.box` gradient `#2a2350 → #1a1636`) with stitched cream borders. Text is at least scale 1 at 240p; headers scale 2; the title logo scale 3–4. At most about 6–8 entries per screen and generous spacing: no dense tables. Information is never conveyed by colour alone (icons plus text).

- **HUD (in play):**
  - Top left: HP bar, Belly bar, and the equipped weapon icon.
  - Top centre: the objective tracker.
  - Top right, *below* `game.cornerArea()`: the clock dial with the day, and the Banner badge (level, Cheer bar).
  - Bottom centre: the hotbar. 8 slots of 22×22 px; the selected slot is raised and outlined, with its name and count above. L1/R1 or wheel glyphs sit at the ends.
  - Bottom left: context prompts.
  - Bottom right: pickup toasts.
  - Centre: Notion, Room, Level and Quest popups (queued, 2.5 s each).
  - Siege: the Banner HP bar and the wave label. Boss: a big HP bar with the name, phase pips and a "TANGLED!" flash.
  - **Fades:** the HUD fades to 30% when idle for 6 s outside combat, and returns at full opacity on any input, damage or popup.
- **Title:**
  - Behind the menu, a living diorama: the finished Thimbleton built from the attract stamp, at dusk, with a slow camera pan. The logo reads "DRAGON QUILT BUILDERS", each letter a patchwork fabric colour with a stitched outline and extrusion (`E.font.title`), and a needle-and-thread dragon emblem.
  - Menu (`E.Menu`, centred bottom): Continue (if a save exists), New Game, Load Game (`saves.show('load')`), Quilting Bee (solo challenge), Settings (`game.menu('settings')`), About & Credits.
  - "Press ✕ / Enter" prompt; a version label (`E.versionLabel()`).
  - After 10 s without input, the attract mode starts.
- **New Game:** name entry (letter grid plus keyboard typing), look A/B, 4 palettes, difficulty (Relaxed/Normal/Hard). The live rig preview turns.
- **Intro crawl:** 4 pages over the quilt void with Granny's voice and gentle music. Skippable.
- **Satchel** (Create / Tab / M / N), with tabs switched by L1/R1 or Q/E:
  - **Bag:** a category strip (Materials, Building, Furniture, Food, Tools, Key) and a 6×4 grid of large slots. Detail pane: icon at ×3, name, a Dragon Quest-style description, the count. Actions: ✕ Assign to hotbar, △ Use/Eat/Equip, □ Drop 1/All. The "Pocket Notions" button opens pocket crafting.
  - **Map:** described below.
  - **Journal:** active quests (giver portrait, steps with tick icons), completed ones, and the list of known Notions.
- **Map screen:**
  - The world drawn top-down at 2 px per column from top-block base colours, shaded by height. Water is blue satin; void is navy with stitched edges; unexplored areas are blank linen (fog revealed within 10 blocks as you go).
  - Markers: you (an arrow), the Banner, residents, discovered portals, quest targets, the Lost Bundle.
  - Controls: the stick pans, R2/L2 zoom, ✕ sets a waypoint marker, ○ goes back. Mouse: drag to pan, wheel to zoom, click to set a waypoint.
- **Crafting, Chest, Travel and Banner screens:** §6.5–6.9.
- **Pause menu:** the engine standard, plus Satchel, Dev Tools (hidden in hub sessions) and About & Credits. Save/Load come through `menu: { saves }` (enabled when `saves.canSave`: no monsters within 12 blocks, no siege or cutscene).
- **Results** (chapter clear): the Builder's name and a portrait card. Stats: play time, blocks placed, blocks broken, items crafted, rooms built, monsters defeated, Cheer earned. Then "Continue to credits".
- **Credits:** a scroll over the finale party, ending on "To be continued... Chapter Two: The Calico Coast" (a story teaser, not a stub) and "Thank you for playing!". Then back to free play in Thimbleton (`credits.onDone → play`), with all systems active.
- **About & Credits** (title menu and pause menu): pages for Credits, Source Information, Testing Feedback, Engine Feedback, Prompt Feedback and Licenses (§6.24).

### 6.17 Audio (`DQ.AudioX`)
- **Music** (all original, in the engine's step sequencer format; §7.11 lists every song):
  - The director picks the song by context: title, intro, cave, field per region, town (day/night), siege, mini-boss, boss, Bee round, results, credits. It crossfades with `music(song, { fade: 1 })`.
  - **Dynamic town theme:** extra layers come in with town level (`audio.layer('strings', 1, 2)` at Lv2, `'bells'` at Lv3, `'drums'` at Lv4).
  - Jingles use `audio.sting(song, { at: 'beat' })` over ducked music.
- **SFX:** custom voices defined with `audio.define(name, voice)` (§7.12). Footsteps by top material, every 0.28 s while walking. Sound comes from code only, never files.
- **Animalese voices** (`DQ.AudioX.voice`), driven by the Dialog `onLetter` hook:
  - **Letters and pauses.** For each letter shown (skip spaces): punctuation adds a 90 ms pause, and `?` lifts the last 3 syllables by 20%.
  - **Each letter becomes one syllable**, 55–70 ms (shorter at fast text speed):
    1. A **consonant onset**:
       - s/z/c/x: highpass noise at 4 kHz, 18 ms
       - t/d/k/g/p/b/q: click (bandpass noise at 1.5 kHz, 8 ms, plus a low thump)
       - m/n/l/r/w/y/v/f/h/j: a soft voiced onset (lowpass 600 Hz)
    2. A **vowel body**: a sawtooth or pulse at the speaker's pitch × (1 + letter-hash × range), through two `BiquadFilter` bandpasses at the vowel formants. The vowel is the next vowel in the word.

       | Vowel | F1 (Hz) | F2 (Hz) |
       |---|---|---|
       | a | 800 | 1200 |
       | e | 500 | 1900 |
       | i | 300 | 2300 |
       | o | 500 | 900 |
       | u | 350 | 800 |

       Formants scale with the speaker's `formant` factor.
  - **Contour:** +8% at word starts, falling 6% across a sentence. ALL-CAPS words are 15% louder and higher.
  - **Determinism:** pitch jitter comes from `hash(char, index, speakerSeed)`, never `Math.random`.
  - Routed through `_voiceBus` (the "Voices" volume setting). Profiles are in §7.8. The Builder is silent.
  - In headless runs, voice calls are no-ops (`audio.ctx` is null).

### 6.18 Save and load (`DQ.Save`)
- Uses `game.saves` (3 slots plus autosave, with place and level labels).
- `write()` returns:
  ```
  { data: { v: 1, seed, world: world.diff(), objects: Objects.serialize(),
            builder: {...}, bag, hotbar, chests,
            town: {cheer, level, patterns, townChest},
            residents: [...], story: story.state(), quests,
            clock: {day, hour}, stats, explored (RLE),
            lostBundle, flags },
    place: regionName, level: 'Town Lv ' + level }
  ```
- `read()` regenerates the base world from the seed, then applies the diff and the objects, then recomputes rooms and the nav graph.
- **Autosave:** on `questDone`, after sleeping, at the siege checkpoint, and every 5 minutes when `canSave`.
- The title's Continue uses `saves.latest()`. `migrate(data, from)` is a stub for future versions; v1 is the only version, so implement it as identity with a version check.
- In a hub session nothing is saved; the client's storage is in-memory anyway.

### 6.19 Dev mode (`DQ.Dev`, from the pause menu → "Dev Tools")
A full-screen pixel panel with tabs (L1/R1 or the mouse). Every toggle and slider takes effect immediately and is saved under `E.store('dqb-dev')`. It is hidden and disabled in hub sessions.

| Tab | Tools |
|---|---|
| **Cheats** | God mode; Creative bag (infinite materials, every recipe known); Fly / no-clip (Space up, Shift down); Instant break; No hunger; One-hit kills; Freeze time of day; Invisible to monsters |
| **Warp** | Teleport list: Lint Hollow, Thimbleton plaza, Corduroy Crags, Button Quarry, Tweedwood Lint Camp, Calico Coast shipwreck, Frayed Verge, Knot Gate, Knotted Spire top, the Rift. Plus "Teleport to cursor" |
| **Spawn** | Any monster (×1/×5), either boss, any item ×1/×10/×99, any resident (arrive now) |
| **Story** | Jump to beat: Start / Banner / Lv2 / Lv3 / Lv4 / Hall built / Seam Ripper / Spire / Siege / Boss / Chapter clear. Each beat calls `DQ.Quests.applyBeat(id)`, which sets flags, quests, residents, rooms (via stamps) and inventory to a consistent state. Also: complete the current quest step, set the town level, add Cheer ±50, set the hour, start or skip a siege wave |
| **Tuning** | Live sliders (below) with **Reset to defaults** (all, or a single slider with △) |
| **Debug** | Overlays: collision cells, room detector, nav graph and NPC paths, monster aggro rings, cutaway radius, light radii, Pattern ghost status. Perf readout: frame ms, queued runs, actors, lights. Time scale 0.25×–4×. Frame step (while paused, ✕ advances 1 step). Cutaway auto/always/off. Hub net stats (msgs/s, bytes), shown only in Bee solo/loopback |
| **World** | Export a stamp: mark two corners with the cursor, then copy JSON to the clipboard and offer a download. Save and load a dev snapshot. Regenerate the world |

**Sliders** (`DQ.TUNING_DEFS`: key, label, min, max, step, default):

| Slider | Default | Range |
|---|---|---|
| Walk speed | 78 | 40–140 |
| Sprint multiplier | 1.45 | 1–2.5 |
| Jump velocity | 215 | 150–320 |
| Gravity | 800 | 400–1400 |
| Reach (blocks) | 4.5 | 2–8 |
| Builder attack × | 1.0 | 0.25–4 |
| Block damage × | 1.0 | 0.25–5 |
| Max HP base | 40 | 10–200 |
| Belly drain × | 1.0 | 0–4 |
| Monster HP × | 1.0 | 0.25–4 |
| Monster damage × | 1.0 | 0–4 |
| Monster speed × | 1.0 | 0.5–2 |
| Aggro radius (blocks) | 8 | 2–20 |
| Max monsters | 10 | 0–40 |
| Spawn interval night (s) | 5 | 1–30 |
| Day length (min) | 12 | 2–60 |
| Cheer × | 1.0 | 0.25–5 |
| Drop rate × | 1.0 | 0–5 |
| Siege wave size × | 1.0 | 0.25–3 |
| Helper build rate (blocks/min) | 6 | 0–60 |
| Ballista reload (s) | 2.5 | 0.5–6 |
| Tangle window (s) | 8 | 2–20 |

Gameplay code reads `DQ.tuning.get(key)` every time (no cached copies), so sliders are live.

### 6.20 Attract mode (`DQ.Attract`)
- **Start and exit.** It starts after 10 s without input on the title screen or its menus (main menu, Load list, About). It does not start on the Settings screen or during name entry, where the player is busy choosing. **Any input exits it** to the title with a fade: any key, mouse button, mouse movement over 8 px, gamepad button, or stick past 0.5. On touch-only devices it also runs, and a tap exits.
- **Isolation.** It builds its own `ctx` with a separate world (generated from the seed, plus `stampDemoTown()`: a pre-built Lv4 Thimbleton with rooms, the Hall, ballistas and residents). It never touches the player's save or settings. Sound plays at 60% volume, if unlocked.
- **The AI builder** is `DQ.Autopilot` running the vignettes below with cheats: invulnerable, infinite materials, placement at 0.15 s per block, teleporting between vignettes behind a wipe transition.
- **Overlay:** a small logo top left, "DEMO" top right (below the corner area), and a blinking "Press any button" with the current device's glyph.
- **Vignettes**, looping forever with a 4 s logo card between loops (each written as a `game.script` and also run by a test):

| # | Vignette | Length |
|---|---|---|
| 1 | "Morning in Thimbleton": camera glide; residents at their jobs; banner flutter | 12 s |
| 2 | "Gathering": breaks turf and tufts in the Glen; pickups; a Notion popup | 14 s |
| 3 | "Crafting": opens the Mending Bench menu (scripted focus moves) and crafts a Straw Bed | 10 s |
| 4 | "Raising a room": walls 2 high, door, bed, torch, then "ROOM COMPLETE! Bedroom" and Cheer bubbles | 24 s |
| 5 | "Skirmish": a combo and a Spin Stitch against Lintlings and a Pinhog; drops | 16 s |
| 6 | "Nightfall": the hour jumps to 21:00; lanterns glow; Mothlets; residents go to bed | 10 s |
| 7 | "Siege": a wave at the walls; ballista fire; Mortimer fights; a Knotbrute smashes a wall | 18 s |
| 8 | "Gnarlgrim": Gnarlgrim at 30% HP; manned ballista hits → TANGLED → Seam Ripper strike → he unravels; confetti | 16 s |
| 9 | "Quilting Bee": 3 bot builders in seat colours raise the Quilt Barn on the Bee world | 10 s |

### 6.21 Multiplayer: AI Hub sessions and the Quilting Bee (`DQ.Net`, `DQ.Bee`)
**Mode:** `shared-world` (co-op building is the source's multiplayer), 1–4 players, 8-minute rounds. Head tags, written by `build.mjs`:
```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="8">
<meta name="hub:session-goal" content="Raise the Quilt Barn together, then defend it">
<meta name="hub:session-howto" content="Move stick/WASD · Jump ✕/Space · Break □/Click · Place △/Right-click">
```
Also include a description meta, `hub:type` ("Game") and `hub:players` ("1": players per device, as in the hub's example pages; sessions take 1–4 through `hub:session-players`). `session.js` (unmodified, between its banner and last line) is the first script after `<meta charset>`.

**Session flow** (only when `AIHub.active`; otherwise nothing changes):
1. No title, attract, menus or saves. Boot straight into `bee` with the Bee world generated (fixed seed `0xBEE` plus the Bee stamp; identical on every copy).
2. `info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true })`. If it returns `null`, fall back to the normal game (title).
3. The **game's own card** (`hubcard` scene):
   - The logo, the players lined up as builders in seat colours (`#e8443a`, `#3b82f6`, `#22c55e`, `#f5b700`; names drawn with the pixel font, never inserted as HTML), the goal, this player's control glyphs, ready ticks, and the countdown from the `card` event (`left`).
   - **Ready:** Enter, ✕ or a click → `AIHub.answer('ready')`. **More time:** △, T or a click → `AIHub.answer('more')` (a second press takes it back).
   - Nothing here changes the round. Any card randomness uses `AIHub.rng('card')`.
4. Call `AIHub.ready()` once, as soon as the world is built (no key press).
5. On `start`: a 3-2-1 countdown while `AIHub.time() < 0`. Play begins when `AIHub.time() ≥ 0`.
6. **Round clock:** 8:00, or `limitMs` if shorter.
   - **Build phase** (5:00): raise the Quilt Barn Pattern, scaled by player count:

     | Players | Barn walls | Blocks |
     |---|---|---|
     | 1 | 2 high | 38 |
     | 2 | 3 high | 57 |
     | 3–4 | 3 high + 10 Felt crenellations | 67 |

     Plus a door and 2 torches.
   - **Raid phase** (3:00): 3 waves from the corners. Knotbrutes target the barn and the Banner (HP 200).
7. **Scores** (per player):
   - +3 per Pattern block placed (the host credits the placer)
   - +5 per monster defeated (Knotbrute +15)
   - +5 per door or torch crafted and placed in the Pattern
   - +1 per 5 items gathered
8. **Host ends the round.** At the time limit, on `time-up` (within `graceMs`), or when every player has left, the host calls `AIHub.finish({ standings, scores, won, stats })`:
   - `standings`: arrays of ids by score, ties grouped.
   - `won`: the Pattern is complete and the Banner HP > 0.
   - `stats`: per id `{ Blocks, Monsters }`.
   - Awards: "Master Quilter" for the most blocks, "Knot Cutter" for the most kills.
9. On `end`: stop input, `audio.mute(true)` and `music(null)`, show "Round over", then do nothing more. On `leave`: remove that builder (its placed blocks stay). In **server mode** (`AIHub.server`): run the host simulation with no local builder, camera or input, and skip drawing except a 1-fps static "Hosting the Bee" frame.
10. **The round never pauses.** Build the game with `autoPause: false`, `corner: false` and `menu: false` when `AIHub.active`, and make the `bee` scene `pausable: false` in a session. Options/Esc only show the toast "Round in progress!". There are no settings menus mid-round, and settings are at their defaults in a session, because the hub gives the game empty storage.
11. **A hidden tab keeps the world running.** `requestAnimationFrame` stops in hidden tabs, so while `document.hidden`, a `setInterval` of 250 ms calls `game.advance(elapsed)` (capped at 1 s per call). The host keeps simulating and every copy keeps sending; the hub voids a round only after 20 s hidden.
12. **Names** come from the hub and are drawn with the pixel font. Characters it lacks become `?`. They are never inserted as HTML.

**Authority and messages.** Every copy runs the voxel world locally and keeps it in sync through edits. The host owns monsters, drops, Pattern progress, the clock and scores. Each client owns its own builder's movement, inventory and hotbar.

| Msg | Direction | Reliable | Rate | Payload (compact arrays, integers) |
|---|---|---|---|---|
| `p` | client → host | no | 10 Hz | `[t, x, y, z, facing×100, anim, heldItem, hp]` |
| `a` | client → host | yes | ≤ 6 Hz, batched | `ops: [['place', x,y,z, block, rot], ['break', x,y,z], ['hit', monId, dmg, kx, ky], ['take', dropId], ['craft', item]]` |
| `s` | host → all | no | 10 Hz | `{ t, P: [[id,x,y,z,f,anim,held,hp]...], M: [[id,kind,x,y,z,f,hp,state]...], ph, left, prog, bhp }`, kept under 1,100 bytes (if more than 24 monsters, alternate halves) |
| `e` | host → all | yes | ≤ 6 Hz, batched | `ev: [['vox', x,y,z, id, by], ['drop', id, item, n, x,y,z], ['gone', dropId], ['got', to, item, n], ['hurt', to, dmg, kx, ky], ['fx', kind, x,y,z], ['phase', name], ['score', id, n]]` |

- Per copy that is ≤ 16 messages/s, under the 20/s cap. Every payload stays far below 16 KB; assert this in tests.
- **Prediction:** a client applies its own place/break immediately and marks the cell pending; the host's `vox` event confirms or corrects it. Monsters on clients interpolate between snapshots (100 ms buffer).
- **Hits:** a client sends `hit` when its local swing overlaps a monster's interpolated position, and the host applies damage. Old or out-of-order snapshots are dropped by `t`.
- **Networking goes only through `AIHub.send`/`on`.** No sockets, fetch, `alert`, `window.open` or navigation. "Quit to title" does nothing in a session.

**Outside the hub (the game on its own).** The title's **Quilting Bee** runs the same round solo: the local copy is the host, with a `LoopbackNet` that implements the same `send`/`on` surface in process. Optionally 1–3 **bot builders** run on `DQ.Autopilot` ("Bee with friends: bots on/off"). This exercises the host code paths outside the hub. Best scores go to `E.store`.

**The Bee world: Bumblebee Meadow** (stamp `beeMeadow`, 48×48×16, fixed seed `0xBEE`, a 2-column void ring):

| Feature | Location / rule |
|---|---|
| Banner (HP 200) | (24,26) |
| Pattern site (Quilt Barn, 7×5) | (26..32, 16..20), pre-placed when the round starts |
| Mending Bench and Hearth Pot | (20,26) |
| Supply Crate | (22,28). Interact for 10 Planks, once per 60 s per player |
| Trees | 6, NE (34..44, 6..14) |
| Stone outcrops with gravel | 4, NW (4..12, 6..14) |
| Cotton puffs and berry bushes | 6, S (16..32, 38..44) |
| Tufts | W (4..10, 24..34) |
| Monster spawns | the 4 corners |

- Every Bee recipe is known from the start; there are no town levels.
- Each player keeps their own bag.
- The barn needs Cobble, Planks and Felt (Red only: berries give dye), plus a Lattice Door and 2 Wick Torches. Lint for the torches comes from the Supply Crate (2 Lint on each player's first use) and from the few Lintlings that roam the meadow during the build phase.

### 6.22 Touch-only devices
Detection: `matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches`, and no gamepad seen and no `keydown` yet. Re-evaluate when a pad connects or a key is pressed.

On such devices:
- Every scene has `touch: []` and `input.touchEnabled = false`: **no touch controls**.
- The title shows a stitched panel, "**Controller or keyboard required**", with the line "Connect a controller or keyboard to play." The engine's corner **settings/menu button** stays (`corner` on).
- The attract mode runs as usual, and a tap returns to the title panel.

### 6.23 Settings and accessibility (additions to the standard Settings)
| Setting | Default |
|---|---|
| Button glyphs | PlayStation, or Xbox (sets `input.glyphs`) |
| Camera view | Isometric, or Three-quarter |
| Auto-hop | On |
| Sprint | Hold, or Toggle |
| Text speed | Slow, Normal, Fast |
| Voices volume | 80% |
| HUD tracker | On |
| Difficulty | Normal (Relaxed / Hard) |
| Cutaway | Auto (Always, Off) |
| Screen shake and flashes | Engine standard |

Reduce motion: the engine handles it; the game also disables the camera crossfade and reduces confetti density.

### 6.24 About/Credits screen and exit interview
- `tools/build.mjs` reads `./exit-interview.json`, if present, and embeds its `sourceInformation`, `testingFeedback`, `engineFeedback` and `promptFeedback` as `DQ.ABOUT`. The About pages render them.
  - If the file is missing during development, a dev-only notice says so. A release build fails without it.
  - Order matters: write `exit-interview.json` before the final build.
- **Credits page:**
  - "Dragon Quilt Builders: an original game inspired by Dragon Quest Builders (Square Enix). Not affiliated with or endorsed by Square Enix. No assets from the original."
  - Design, code, art, music and writing: the AI model (Anthropic, claude-opus-5-5) under direction.
  - Engine: my-3D2dge v0.85.2 (MIT) by michaelcrosato, with the list of our engine changes.
  - AI Hub Session client 1.4.0.
  - Plan: PLAN.md.
- **Source Information** fields (TASK.md), with "unknown" where something cannot be confirmed:
  - Date `2026-11-03 17:47:40`
  - Source `Dragon Quest Builders`
  - Plan `PLAN.md`
  - Genre and perspective: "Sandbox action RPG (block building, crafting, town building); isometric 2.5D third person, rotatable"
  - Tech, art direction, animation, audio, online, testing, research, environment (`Claude Code CLI (headless); Linux; browser unknown`), model (`Anthropic, claude-opus-5-5, reasoning effort max`), usage
  - Research: the plan stage read the engine handoff (API card, guide, the renderer, TileMap, Body and Dialog source) and the AI Hub protocol and examples. It did no web research on the source game. Add whatever research the build stage does.
- **Testing, Engine and Prompt Feedback** answer TASK.md's questions in order. The same text goes in the final chat reply.
- **`exit-interview.json`** (the exact shape in TASK.md). Validate it with `node -e "JSON.parse(require('fs').readFileSync('exit-interview.json','utf8'))"`. Suggested `aiHub` values:

  | Field | Value |
  |---|---|
  | name | "Dragon Quilt Builders" |
  | tagline | "Stitch a frayed world back together" |
  | description | "Gather, craft and build block by block to mend a patchwork kingdom unravelled by a dragon. Raise rooms for quirky residents, defend your town and unpick a knotted boss, or raise a barn together in co-op Quilting Bee rounds." |
  | type | "Game" |
  | genre | "RPG" |
  | source | "Dragon Quest Builders" |
  | series | "Dragon Quest" |
  | players | "1–4" |
  | controls | "Stick/WASD move · ✕/Space jump · □/Click break · △/Right-click place · L1 R1/wheel items · ○/F talk" |
  | tags | ["building", "crafting", "co-op", "fantasy", "comedy", "pixel art"] |

### 6.25 Autopilot: the shared AI (`DQ.Autopilot`)
The attract mode, the scripted playthrough test, the Bee bots and cutscene NPC walks all use one task runner. It emits **intents** (§6.4), so the AI plays through the real builder, physics, crafting and UI code; it never edits state directly unless a cheat says so.
- **Setup:** `const ap = new DQ.Autopilot(ctx, builder, { cheats: { god, teleport, infinite, fastPlace }, ui: true })`. Each task is a `game.script` generator; `ap.run(task)` returns its script, and `ap.intent()` is read once per step in place of `Controls.intent()`.
- **Tasks:**

  | Task | What it does |
  |---|---|
  | `walkTo(x, y, z, { radius = 1 })` | Paths with `DQ.Nav` and steers along it, hopping on step-ups. With `cheats.teleport`, a path longer than 40 blocks, or one that fails, becomes a teleport behind a `'wipe'` transition |
  | `face(x, y)` | Turns the builder toward a point |
  | `breakAt(x, y, z)` | Walks into reach, sets `intent.cursor` and swings until the block is gone |
  | `placeAt(x, y, z, item, rot)` | Walks into reach, selects the hotbar slot (it adds the item to the hotbar if needed) and places |
  | `buildStamp(stamp, origin, { rate })` | Places a stamp's cells bottom-up, near to far, never trapping itself (it stands outside the footprint) |
  | `craft(recipeId, n)` | With `ui: true`, walks to the station, interacts and drives the crafting screen through MENU actions; with `ui: false`, calls `Crafting.craft` beside the station |
  | `talk(npcId, choices = [])` | Walks to the NPC, interacts, confirms pages, and picks choices by index |
  | `fight({ filter, spin = true })` | Approaches the nearest match, combos, uses a Spin Stitch when 2 or more are within 2 blocks, and backs off on a wind-up telegraph |
  | `manBallista(id, target)` | Mounts the ballista, aims and fires until the target is Tangled or dead |
  | `wait(s)`, `until(fn, timeout)` | Waits |

- **Failure:** every task has a timeout (walk 30 s, break 8 s, craft 10 s, fight 60 s) and fails with an `apFail` event `{ task, reason, at }`. Tests assert there are none. The attract mode skips to the next vignette instead.
- **Cheats** are applied by the Autopilot before the task: `god` sets the dev god flag, `infinite` tops up the bag, `fastPlace` sets the place cooldown to 0.15 s, and `teleport` is described under `walkTo`.

---
## 7. Content

### 7.1 The world: the Patchwork Realm around Thimbleton (144 × 144 columns, 24 levels, seed 20261103)

```
 x→ 0                 48                 96                 143
y 0 +-------------------+------------------+------------------+
  | CORDUROY CRAGS      |                  |   TWEEDWOOD      |
  |  Button Quarry(22,18)                  |   Lint Camp      |
  |  ledge button(48,8) |                  |   (116,30)       |
  |   Lint Hollow(38,40)>exit(50,42)      |   hollow-tree    |
48|...................  GINGHAM GLEN  .....|...button(134,52)|
  |  stream ~           (meadow)           |                  |
  |      ~       THIMBLETON  banner(72,76)  Rift(96,80)        |
  |        ~     border r=10..20       east road → (143,76)   |
96|   ~                                     |FRAYED VERGE| THE FRAYING
  | CALICO COAST         (glen south)       |x92-98 |KnotWall x99-100
  |  shipwreck+button(22,126)               |       | Knotted Spire(124,124)
  |  sea x<14, y>132                        |       | gate y112-114
143+-------------------+------------------+------------------+
```
Surface levels are approximate (generated with `E.noise2` plus per-region shaping). The outer 2-column ring is void with frayed fringe.

| Region | Area | Surface | Top / under | Features | Spawns (day / night) |
|---|---|---|---|---|---|
| **Lint Hollow** (start) | centre (38,40), floor 12×10 | floor L7, rim L13–14 | earth, stone walls | Dead bushes (branches), 6 loose earth blocks, one Lintling. A dark 6-block tunnel (2-high, roofed: tests the cutaway) with stairs up to the exit at (50,42). A "darkness zone" (ambient .15 until a torch is placed at the marked spot) | 1 scripted Lintling |
| **Gingham Glen** | x 44–100, y 44–104 (minus the town) | L9 ± 2, gentle hills | grass / 3 earth / stone | Tufts (1 per 12 cells), cotton puffs, thimbleberry bushes near the town, buttercups, a shallow stream (1-deep water) from (30,58) winding to the coast at (18,132), trees in small groves | Lintling 70%, Dyed Lintling 30% / Lintling 40%, Mothlet 60% |
| **Thimbleton** | banner spot (72,76) on a cobble plaza 5×5 | L9 flattened in radius 12 | grass, cobble ruins | Ruined foundations: three 1-high cobble outlines of old houses (hints for room shapes), a broken well, a pond 3×4 (decor water), the east road (planks path) to the world's eastern edge (141,76), the Thimbleton Bobbin Portal at (70,80) | none inside the border |
| **Corduroy Crags** | x 4–60, y 4–56 | L11–20 ridges | stone, gravel on slopes, grass in hollows | Exposed copper (levels 7–12) and coal (8–14) veins as blobs, 4–7 blocks each, Poisson-spaced. The Button Quarry. A Bobbin Portal at the Hollow exit (52,44) and at the Quarry rim (34,20). The Ancient Button on a stone pillar ledge at (48,8), L19 (a stairs puzzle) | Lintling, Pinhog / Lintling, Pinhog |
| **Button Quarry** | open pit (22,18), 16×14, floor L6 | rim L15 | stone terraces | Ramp from the east, terraces with coal and copper, 4 cobble pillars, boss arena floor 12×10. Sir Buttonsworth sleeps here (wakes on entry after M10) | Pinhog (before the boss) |
| **Tweedwood** | x 92–140, y 6–60 | L10 ± 2 | grass / earth | Dense voxel trees: trunk 3–5 Plaid Logs, Pompom leaf blob radius 2, Poisson spacing ~4. Puffballs in shade, bluebells at the edges. The Lint Camp at (116,30): Lintwick in a Knot Cage (a 1×1 object, HP 30, tier 2), 3 Dyed Lintlings, knot-fence decor. A hollow tree with the Ancient Button at (134,52). A Bobbin Portal at (110,36) | Dyed Lintling / Mothlet, Dyed Lintling |
| **Calico Coast** | x 4–60, y 100–140 | sand L7–8; sea L5–6 water where height < 7 | sand / sand / stone | Beach, dunes, cotton puffs, a shipwreck stamp (plank hull) holding the Ancient Button at (22,126), a Bobbin Portal at (30,116) | Pinhog / Pinhog, Mothlet |
| **Frayed Verge** | x 92–98, y 92–140 | L9 | frayed cloth patches | The approach to the Knot Wall; a Bobbin Portal at (94,110) | Frayed Knight (night only, plus 2 fixed guards by day near the gate) |
| **The Knot Wall** | x 99–100, y 92–141, up to L17 | — | knot (tier 3) | The **Knot Gate** at y 112–114 (3 wide × 5 high) is the only way through (Seam Ripper) | — |
| **The Fraying** | x 101–140, y 94–140 | L9 ± 3 with void holes | frayed / earth / stone | Void holes (columns emptied entirely, Backing Cloth included: falling in = unravel respawn), dead trees, ash weather, purple ambient. The **Knotted Spire** at (124,124): a 9×9 base of knot and frayed blocks up to L22, with an outer spiral ramp 2 wide (stairs blocks), and a pedestal with the Golden Thread fragment on top | Frayed Knight, Knotbrute (rare) / the same, ×1.5 |
| **The Rift** | (96,80), radius 3 | void | — | A frayed hole east of town that is the siege's spawn point. Re-stitched at the chapter's end (a wave turns it into meadow) | Frayed Knight at night |

Stamps (`DQ.WORLD.stamps`, ASCII layers bottom to top with a legend; `' '` means keep the existing block, `.` air):
- `lintHollow`, `thimbletonRuins`, `buttonQuarry`, `lintCamp`, `shipwreck`, `knotGate`, `knottedSpire`, `rift`
- `portalPad` (×6), `demoTown` (the attract/title diorama: Lv4 Thimbleton), `beeMeadow` (48×48 Bee world)
- `beat_*` stamps for dev story beats (the rooms a player would have built by then)

Worldgen order:
1. heightmap
2. layers
3. ores
4. water fill
5. trees
6. plants (objects)
7. stamps
8. portals
9. `escape` sweep
10. nav build
11. `world.base` snapshot

Must be deterministic: test it by `world.hash()` equality across two runs.

### 7.2 Blocks (`DQ.BLOCKS`)
Texture names refer to the patterns in §8.1. "tier" is the minimum tool tier to break it (∞ = never). Every face has stitched seams.

| id | key | Name | hp | tier | Drops | Placeable | Texture (top / side) | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | backing | Backing Cloth | ∞ | ∞ | — | no | navy felt with a square stitch grid | level 0 |
| 2 | earth | Corduroy Earth | 6 | 1 | earth | yes | brown cord crosshatch / vertical cord ribs | |
| 3 | grass | Gingham Turf | 6 | 1 | earth | no (gives earth) | green gingham checks / earth with a 3-texel felt fringe | |
| 4 | sand | Calico Sand | 4 | 1 | sand | yes | pale yellow calico, tiny orange florets | |
| 5 | gravel | Button Gravel | 8 | 1 | pebble ×2 | no | grey with little round bumps | |
| 6 | stone | Tweed Stone | 20 | 2 | stone | yes | grey herringbone tweed | |
| 7 | copperOre | Copper Sequin Seam | 30 | 2 | copperOre | no | tweed with copper sequins (glint frame) | |
| 8 | coal | Charcloth Seam | 24 | 2 | coal | no | tweed with black felt lumps | |
| 9 | log | Plaid Log | 12 | 1 | log | yes | stitched rings / brown bark with tartan stripes | |
| 10 | leaves | Pompom Leaves | 2 | 1 | branch 35% | no | green bobbles with lit tops | |
| 11 | frayed | Frayed Cloth | 24 | 2 | frayedScrap | no | dark plum, torn weave, loose threads | |
| 12 | knot | Black Knot | 60 | 3 | blackYarn | no | tangled black-violet yarn loops | |
| 13 | water | Satin Water | — | — | — | no | blue satin shimmer (translucent) | static; 2+ deep blocks walkers |
| 20 | cobble | Cobble Patch | 22 | 2 | cobble | yes | grey quilted rounded stones | |
| 21 | planks | Plank Patch | 10 | 1 | planks | yes | tan boards with stitched seams | |
| 22 | thatch | Straw Thatch | 4 | 1 | thatch | yes | golden straw courses | |
| 23 | feltRed | Red Felt Patch | 6 | 1 | feltRed | yes | felt with a diamond stitch | also Blue (24) and Yellow (25) |
| 26 | glow | Glow Patch | 6 | 1 | glow | yes | pale gold felt with a stitched star (emissive) | light 48 |
| 27 | stairsPlank | Plank Stairs | 10 | 1 | stairsPlank | yes | planks (wedge) | `rot` from facing |
| 28 | stairsCobble | Cobble Stairs | 22 | 2 | stairsCobble | yes | cobble (wedge) | |
| 29 | tangle | Tangle | 12 | 1 | — | no | black yarn ball | Gnarlgrim residue, vanishes after 20 s |
| 30 | gildedFelt | Gilded Felt | 6 | 1 | gildedFelt | yes | gold felt with sparkle | S3 reward |

### 7.3 Items and materials (`DQ.ITEMS`)
Every item has an `icon`: a block cube rendered from the atlas, `E.shapeSprite` for objects, or a 16×16 `E.sprite` string (marked ✎) to author. Descriptions are in Dragon Quest style; examples are given for a few.

| id | Name | Kind | From | Use / notes |
|---|---|---|---|---|
| earth, sand, stone, log, cobble, planks, thatch, feltRed/Blue/Yellow, glow, stairsPlank, stairsCobble, gildedFelt | (blocks) | block | breaking or crafting | place |
| pebble ✎ | Pebble | material | gravel | Cobble Club, Weapon Rack. "A little stone with big dreams." |
| copperOre ✎ | Copper Ore | material | copper seams | Copper Ingot |
| coal ✎ | Charcloth | material | coal seams | ingots, Hearth Pot, Forge |
| branch ✎ | Branch | material | dead bushes, leaves | torches, doors, club |
| straw ✎ | Straw | material | tufts (1–2) | beds, thatch |
| grain ✎ | Wild Grain | ingredient | tufts 30% | buns, stew |
| cotton ✎ | Cotton Puff | material | cotton puffs (2) | thread, beds, felt, vest |
| thread ✎ | Thread | material | crafted | doors, lanterns, vest |
| lint ✎ | Lint | material | Lintlings, Lintwick | torches. "Fluffy, flammable, faintly judgemental." |
| mothDust ✎ | Moth Dust | material | Mothlets | Glow Patch, Moth Lantern |
| pins ✎ | Pins | material | Pinhogs | Pin Trap |
| steelThread ✎ | Steel Thread | material | Frayed Knights 70%, Sir Buttonsworth ×3 | Ballista, Seam Ripper |
| blackYarn ✎ | Black Yarn | material | Knotbrutes, Black Knots | Gilded Felt alternate recipe (2 feltYellow + 1 blackYarn → 4, after S3). "Tangled beyond all reason." |
| frayedScrap ✎ | Frayed Scrap | material | Frayed Cloth | fuel: replaces the 1 coal in the Hearth Pot's own recipe |
| copperIngot ✎ | Copper Ingot | material | Forge | gear, ballista, lantern |
| dyeRed/Blue/Yellow ✎ | Rose / Bluebell / Buttercup Dye | material | crafted from berries / bluebells / buttercups | felt |
| thimbleberry ✎ | Thimbleberry | food | berry bushes (2) | eat raw: Belly +5. Bun, stew, red dye |
| bluebell ✎, buttercup ✎ | flowers | material | flowers | dyes |
| puffball ✎ | Puffball | ingredient | Tweedwood | roast, stew |
| roastPuffball ✎ | Roast Puffball | food | Hearth Pot | Belly +20, HP +5 |
| bun ✎ | Thimbleberry Bun | food | Hearth Pot | Belly +35, HP +10 |
| stew ✎ | Glen Stew | food | Hearth Pot | Belly +60, HP +20 |
| pie ✎ | Marigold's Hearty Pie | food | Marigold only | Belly +100, HP full |
| darningStick ✎ | Darning Stick | weapon | start | atk 3, blockDmg 6, tier 1 |
| cobbleClub ✎ | Cobble Club | weapon | Bench | atk 7, blockDmg 10, tier 2 |
| copperBodkin ✎ | Copper Bodkin | weapon | Forge | atk 12, blockDmg 12, tier 2, swing ×0.9 time |
| seamRipper ✎ | Seam Ripper | weapon | Forge | atk 9, blockDmg 20, tier 3; ×4 against Black Knots and the Heart Knot |
| quiltedVest ✎ | Quilted Vest | body | Bench | def +3 |
| copperBuckler ✎ | Copper Buckler | shield | Forge | def +4 |
| heartpatch ✎ | Heartpatch | use | quests M5, M8, M10 | max HP +10 (consumed on use, with a sparkle and jingle) |
| banner ✎ | Banner of Mending | key | M1 reward | plant at Thimbleton |
| hallPattern ✎ | Pattern: Quilters' Hall | key | Professor (M10) | place the Pattern |
| goldenNeedle ✎ | Golden Needle | key | Sir Buttonsworth | Seam Ripper |
| goldenThread ✎ | Golden Thread (fragment) | key | Spire top | story |
| ancientButton ✎ | Ancient Button | key | 3 hidden | S3 |
| goldenThimble ✎ | Golden Thimble | key | S3 reward | unlocks Gilded Felt |

Item counts and sources above are the balance defaults. The Dev → Tuning sliders scale drops, damage and drains on top of them; balance changes to the tables themselves go in the data files.

### 7.4 Recipes (`DQ.RECIPES`: station, inputs → output, notion trigger)

| Recipe | Station | Inputs → Output | Notion |
|---|---|---|---|
| Wick Torch | Pocket | 1 branch + 1 lint → 1 torch | pickup lint (Hollow) |
| Mending Bench | Pocket | 3 branch + 4 earth → 1 bench | banner planted (Granny teaches) |
| Straw Bed | Bench | 4 straw + 1 cotton → 1 strawBed | pickup straw |
| Lattice Door | Bench | 3 branch → 1 latticeDoor | banner planted |
| Storage Chest | Bench | 2 log + 2 branch → 1 chest | M3 reward |
| Planks | Bench | 1 log → 3 planks | pickup log |
| Thread | Bench | 2 cotton → 2 thread | pickup cotton |
| Straw Thatch | Bench | 2 straw → 3 thatch | pickup straw |
| Rose / Bluebell / Buttercup Dye | Bench | 2 thimbleberry / bluebell / buttercup → 1 dye | pickup the flower or berry, at Lv3 |
| Cobble Club | Bench | 2 branch + 3 pebble → 1 | pickup pebble |
| Cobble Patch | Bench | 1 stone + 1 earth → 2 cobble | Lv2 |
| Stool | Bench | 2 planks → 1 | Lv2 |
| Plank Table | Bench | 4 planks → 1 | Lv2 |
| Plank Door | Bench | 2 planks + 1 thread → 1 | Lv2 |
| Weapon Rack | Bench | 3 planks + 2 pebble → 1 | M6 start |
| Plank Stairs | Bench | 2 planks → 2 | Lv2 |
| Cobble Stairs | Bench | 2 cobble → 2 | Lv3 |
| Quilted Vest | Bench | 4 cotton + 2 thread → 1 | Lv3 |
| Felt Patch (colour) | Bench | 2 cotton + 1 dye → 4 felt | Lv3 |
| Hearth Pot | Bench | 4 stone + 1 coal (or frayedScrap) → 1 | M8 start |
| Thimble Forge | Bench | 6 stone + 2 coal + 2 cobble → 1 | M9 start |
| Pin Trap | Bench | 3 pins + 1 planks → 2 | Lv4 |
| Glow Patch | Bench | 1 mothDust + 1 feltYellow → 2 glow | pickup mothDust, at Lv3 |
| Moth Lantern | Bench | 1 copperIngot + 1 mothDust + 1 thread → 1 | Lv4 |
| Gilded Felt | Bench | 2 feltYellow + 1 copperIngot (or 1 blackYarn) → 4 | S3 reward |
| Roast Puffball | Hearth | 1 puffball → 1 | pickup puffball |
| Thimbleberry Bun | Hearth | 2 thimbleberry + 1 grain → 1 | Hearth placed |
| Glen Stew | Hearth | 2 puffball + 1 thimbleberry + 1 grain → 1 | M8 reward |
| Copper Ingot | Forge | 1 copperOre + 1 coal → 1 | Forge placed |
| Copper Bodkin | Forge | 2 copperIngot + 1 log → 1 | Forge placed |
| Copper Buckler | Forge | 2 copperIngot + 2 planks → 1 | Forge placed |
| Bobbin Ballista | Forge | 2 log + 2 copperIngot + 2 steelThread → 1 | M10 (Professor) |
| Seam Ripper | Forge | 1 goldenNeedle + 2 copperIngot + 2 steelThread → 1 | Golden Needle picked up |

### 7.5 Objects (`DQ.OBJECTS`; each has an `E.SHAPES` entry, sized for the 26-unit hero)
| id | Name | Cells | Solid | Light | Behaviour | Shape notes (materials) |
|---|---|---|---|---|---|---|
| bench | Mending Bench | 1 | yes | — | crafting station | plank table, a pincushion, 2 spools, scissors (oak, wool, iron) |
| torch | Wick Torch | 1 | no | 64, `#ffb060` | room light | stick + lint wick + `flames` |
| lantern | Moth Lantern | 1 | no | 96, `#ffe7a0` | room light | copper cage, glow material |
| latticeDoor | Lattice Door | 1×2 high | passable | — | door, HP 30 | crossed branches, two leaves that swing |
| plankDoor | Plank Door | 1×2 high | passable | — | door, HP 50 | planks with a stitched heart |
| strawBed | Straw Bed | 1 | low (z 6) | — | sleep slot | frame + straw + a patchwork quilt blanket (feltRed/Blue checks) |
| table | Plank Table | 1 | yes | — | mess hall | core `table` with planks |
| stool | Stool | 1 | low | — | seat | core `stool` |
| chest | Storage Chest | 1 | yes | — | 20 slots, Town Chest flag | core `chest` |
| hearthPot | Hearth Pot | 1 | yes | 48, `#ff8040` | cooking station | stone ring, iron pot, `flames` |
| forge | Thimble Forge | 1 | yes | 56, `#ff7030` | smithing station | a giant thimble-shaped furnace with a glowing mouth |
| weaponRack | Weapon Rack | 1 | yes | — | guard post | planks with 2 clubs |
| pinTrap | Pin Trap | 1 | no | — | trap | a board with coloured pin heads |
| ballista | Bobbin Ballista | 1 | yes | — | turret, HP 150 | wooden frame, steel-thread bowstring, a spool bolt |
| banner | Banner of Mending | 1 | yes | 80, `#ffd870` | town core, HP 300 | pole plus a cloth banner, drawn in code (sine flutter) with a stripe per level |
| portal | Bobbin Portal | 1×2 high | no | 40, `#c8a0ff` | travel | a bobbin-shaped arch with swirling thread (animated in code) |
| cage | Knot Cage | 1 | yes | — | Lintwick, HP 30, tier 2 | knot bars |
| tuft, cottonPuff, berryBush, bluebell, buttercup, puffball, deadBush | plants | 1 | no | — | harvest, regrow 1 day | core `grass`/`bush`/`flowers` recoloured; cotton balls and berries added as parts |
| ancientButton | Ancient Button | 1 | no | glint | collectible | a big gold 4-hole button on a stand |
| lostBundle | Lost Bundle | 1 | no | — | KO stash | a patch-sack |

### 7.6 Rooms (`DQ.ROOMS`, checked in this priority order)
| Type | Requirements (in addition to the room rule) | Cheer | maxAwards | Effect |
|---|---|---|---|---|
| Quilters' Hall | Built from the Hall Pattern (complete), interior 50–64 cells | 100 | 1 | Landmark, plus Professor's comfort |
| Guard Post | Weapon Rack + 2 lights | 30 | 1 | Mortimer's comfort; he stands watch |
| Smithy | Thimble Forge + Chest | 30 | 1 | Forge works faster ×1.5 inside |
| Kitchen | Hearth Pot + Chest | 25 | 1 | Marigold cooks here |
| Mess Hall | Plank Table + 2 Stools | 25 | 1 | Supper spot; residents eat |
| Workshop | Mending Bench + Chest | 25 | 1 | Professor's comfort |
| Bedroom | ≥ 1 Straw Bed | 20 | 3 | Sleep slots = beds; Wren's and Lintwick's comfort |
| Snug | (the room rule only) | 5 | 3 | — |

### 7.7 Town levels (`DQ.LEVELS`)
| Lv | Cheer | Border r (side) | Unlocks | Arrives |
|---|---|---|---|---|
| 1 | 0 | 10 (21×21) | base recipes | Wren, at the planting |
| 2 | 40 | 13 (27×27) | cobble, stool, table, plank door, plank stairs, Town Chest designation | Mortimer |
| 3 | 130 | 16 (33×33) | dyes, felt, quilted vest, cobble stairs, glow patch | Marigold |
| 4 | 250 | 18 (37×37) | pin trap, moth lantern | Professor Selvage (brings the Hall Pattern) |
| 5 | 450 | 20 (41×41) | Chapter clear; Hearty Pie served to everyone | — (Lintwick joins through S1 at any level ≥ 2) |

Expected pacing (keep it when balancing):
- Bedroom (20) + Workshop (25) → Lv2.
- + Guard Post (30) + Mess Hall (25) + M5/M6 rewards (25) + bubbles (about 15) → Lv3.
- + Kitchen (25) + Smithy (30) + M8/M9 rewards (35) + S1 (20) + bubbles (about 30) → Lv4.
- + Hall (100) + boss victory (+150) → Lv5.

### 7.8 Characters
All humans are `E.Humanoid` with `build: 'chibi'` unless noted. Faces use `face: { eyes: 'big' }`. Portraits come from `rig.drawPortrait`.

| Who | Role | Look (Humanoid / Blob options) | Voice (Animalese profile) | Personality, tics, sample lines |
|---|---|---|---|---|
| **The Builder** (player, default "Patch") | Silent hero | Size 1.0. A: `hair:'spiky'`, `hat:{style:'band',color:'#c8443a'}`, `outfit:'tunic'` denim `#3a5f9a` with patch trim `#e8c870`. B: `hair:'ponytail'`, `outfit:'robe'` (apron dress) `#4a8a5a`. Skin `#f2c39a`, a tool-belt colour | silent | Choices only |
| **Granny Gossamer** | The Great Quilter; voice from the sky | No body. Portrait: a glowing golden spool with kind half-moon eyes and a needle "hairpin" (custom portrait function) | 165 Hz, range ±25%, triangle, formant 0.9, slow, vibrato 5 Hz 3% | Warm, scatterbrained, fond of "dearie" and "my little stitch". "Wakey wakey, dearie! Oh good, you're not a pincushion. I'd hate to have stitched you together for nothing." / "Frayvern pulled the Golden Thread right out of the world, and everything came apart at the seams. Worse, he swallowed everyone's Knack! Not a soul can make so much as a potholder." / "But you still have the Knack. You're a Builder, dearie!" |
| **Wren Tuck** | First resident; eager kid | Size 0.85, `hair:'ponytail'` orange `#e07a2a`, `outfit:'shirt'` green `#5aa04a`, freckles drawn on the portrait | 330 Hz ±35%, pulse 25%, formant 1.25, fast | Breathless, curious, invents words ("bildering"). "Whoa! Are you a monster? You don't LOOK like a monster. Monsters don't usually wave." / "You MADE that? With your hands? On PURPOSE?!" / "Granny says people used to sleep on things called 'beds'. Do they bite?" |
| **Mortimer Bodkin** | Old guard, grump | `build:'bulky'` size 1.05, `hair:'bald'`, a white beard drawn on the portrait, `hat:'helmet'` dented, `outfit:'coat'` grey `#6a6a78`, `armor:true`, weapon `'club'` | 110 Hz ±15%, saw with 0.2 noise, formant 0.8, slow | "Hmph." Everything was harder in his day. "In my day we slept on rocks, and we were GRATEFUL for the rocks." / "A club is just a stick with ambition." / (later) "...Not bad, Builder. Not bad at all. Don't let it go to your head." |
| **Marigold Purl** | Cook without a kitchen | Size 1.0, `hair:'long'` blonde, `hat:{style:'cap',color:'#ffffff'}` (chef), `outfit:'robe'` `#e8a0a0` with apron trim | 240 Hz ±30%, triangle, formant 1.1, bouncy alternation | Food puns, big feelings. "I've got Glen Stew in my head and not a single pot to stew it in! It's a crock, I tell you. A CROCK!" / "Supper's on! Wash your paws, Lintwick." |
| **Professor Hemsley Selvage** | Scholar of the Knack | `build:'heroic'` size 1.05 (tall, thin), `hair:'short'` grey, `hat:'pointed'` dark green, `outfit:'robe'` `#3a6a5a`, glasses drawn on the portrait and the rig head | 200 Hz ±20%, pulse12 (nasal), formant 1.15, fast | Long words, "Fascinating!" "A functioning door! Do you realise nobody has hinged anything in forty years?" / "This Pattern is a schematic of considerable grandeur. And considerable lumber." |
| **Lintwick** | Reformed Lintling | `E.Blob({ R: 7, colors: {base:'#cfcad6', dk:'#9a94a8', lt:'#f0eef4'}, feet: true, mouth: true, face: 'front' })` plus a fuzz outline (dithered edge) and button eyes drawn over the eyes | 520 Hz ±40%, sine with an upward chirp, formant 1.4 | Third person, sweet. "Lintwick not bad monster! Lintwick just fuzzy!" / "Lintwick want bed. Soft bed. Lintwick will not shed on it. ...Much." |
| **Gnarlgrim the Knotted** | Frayvern's general | `build:'bulky'` size 2.6, colours black and violet yarn, `eyeGlow` magenta, `cape` (tattered threads), `hat:'crown'` recoloured as knotted spikes, a glowing Heart Knot drawn on the chest | 70 Hz ±10%, saw plus a waveshaper drive, formant 0.7 | Boastful, knot puns. "YOU! The needle in my side! I'll tie you in knots, little Builder!" / "I'm... unravelling...!" |
| **Sir Buttonsworth** | Button Golem mini-boss | `build:'bulky'` size 2.0, tan felt `#c8a878`, big button eyes and a belly button drawn on, `weapon: null` | 90 Hz, square, formant 0.75 | Pompous. "HALT! None shall pass without a proper fastening!" |
| **Frayvern** | The dragon (seen only as a silhouette) | A huge moth-winged dragon silhouette drawn with `px.poly` in the sky during 2 cutscenes | 55 Hz saw with an echo (delay node) | "Mend all the patches you like, Builder. I hold the Golden Thread, and the whole quilt is mine to pull." |

### 7.9 Monsters (`DQ.MONSTERS`; speeds in units/s, aggro in blocks)
| id | Name | Body | HP | Atk | Def | Speed | Aggro | Moves (wind-up telegraphs) | Drops |
|---|---|---|---|---|---|---|---|---|---|
| lintling | Lintling | Blob R6 `#b8b4c0`, fuzz edge, button eyes, `mouth:true` | 8 | 4 | 1 | 34 | 7 | Hop chase; lunge (squash wind .35 s, leap 60) | lint 100%, cotton 15% |
| dyedLintling | Dyed Lintling | Blob R6 `#e88ab8` | 16 | 7 | 2 | 38 | 8 | Double-hop lunge (.3 s) | lint 100%, dyeRed 25% |
| mothlet | Mothlet | Blob R5 `wings:true`, `mouth:'fangs'`, dusty violet; flies at z + 18..28 | 10 | 6 | 1 | 48 | 10 | Circles; swoop dive (rises .4 s, dives at 140); night only | mothDust 100% |
| pinhog | Pinhog | Blob R7 `feet:true` with 10 coloured pins drawn radially | 22 | 9 | 5 | 30 (roll 110) | 8 | Curl (.6 s wind, shake), roll charge for 1.2 s, immune from the front while rolling, dizzy 1.2 s after hitting a wall | pins 80%, pebble 30% |
| frayedKnight | Frayed Knight | Humanoid `build:'heroic'` size 1.1, a muslin "dress-form" mannequin (`#e8dcc0`) with frayed hems, `eyeGlow:'#b070ff'`, `weapon:'sword'` recoloured as a long needle-lance | 40 | 12 | 8 | 40 | 9 | `stance:'ready'`; `thrust` (.3 s wind, lunge); `spin` when surrounded | steelThread 70%, frayedScrap 50% |
| knotbrute | Knotbrute | Humanoid `build:'bulky'` size 1.4, navy yarn `#2a2a48`, `hunch:.3`, `eyeGlow` red, knot bumps on the shoulders | 60 | 14 | 6 | 26 | 10 | `haymaker` (.45 s); block smash 25; shoulder charge (.5 s wind) | blackYarn 100% |
| buttonGolem | Sir Buttonsworth | §7.8 | 220 | 14 | 8 | 30 | arena | Slam, Button Volley, Stomp Charge, summon at 50% (§6.12) | goldenNeedle, steelThread ×3 |
| gnarlgrim | Gnarlgrim | §7.8 | 600 | 18 | 25 (0 Tangled) | 34 (charge 140) | town | §6.12 | none (in the finale, the fragment the Builder carries flies into the Banner) |

**Siege waves** (sizes × `tuning.siegeSize`):
- **W1:** 8 Lintlings + 3 Dyed Lintlings (east road)
- **W2:** 6 Lintlings + 4 Pinhogs + 3 Mothlets (east plus north)
- **W3:** 4 Lintlings + 4 Frayed Knights + 3 Knotbrutes (east plus the Rift)
- **Boss:** Gnarlgrim, with summons at phases 2 and 3

**Bee raid:** 3 waves × (4 + 2 per player) Lintlings, then Pinhogs, then 1 Knotbrute per 2 players.

### 7.10 Story and quests: "Chapter One: A Stitch in Time"
Each quest lists the giver, steps (conditions from §6.15), the reward, and its cutscenes. Main quests are M1–M14; side quests S1–S3 are optional but count toward Cheer.

**Prologue (intro crawl, 4 pages).**
1. "Long ago, Granny Gossamer stitched the Patchwork Realm from a thousand scraps of light."
2. "Its people had the Knack: whatever they dreamed, their hands could make."
3. "Then came Frayvern, the Unraveller. He pulled the Golden Thread from the heart of the world, and swallowed every last bit of Knack."
4. "Now the realm frays at its edges... and nobody remembers how to make a bed."

**M1 "Come Undone"** (Granny; Lint Hollow). The opening cutscene is darkness, then Granny's golden box: "Wakey wakey, dearie!"

| # | Step | Condition |
|---|---|---|
| 1 | Look around (tutorial prompts for move, camera turn and jump) | `{ at: 'hollowLedge' }` |
| 2 | Break 3 Corduroy Earth | `{ have: { earth: 3 } }` |
| 3 | Defeat the Lintling ("A Lintling bounces into view!") | `{ killed: { lintling: 1 } }` |
| 4 | Craft a Wick Torch from the Bag (Notion on picking up Lint) | `{ crafted: 'torch' }` |
| 5 | Light the dark tunnel (place the torch at the marked spot; the darkness lifts) | `{ placed: 'torch', at: 'tunnelMark' }` |
| 6 | Climb out of the Hollow | `{ at: 'hollowExit' }` |

Reward: the Banner of Mending (key). Cutscene: the frayed world revealed, a camera pan over the Glen to the ruins. Granny: "Plant this where Thimbleton used to be, dearie. Folks will come. They always come for a light."

**M2 "Plant the Banner"** (Granny).

| # | Step | Condition |
|---|---|---|
| 1 | Reach the ruins of Thimbleton | `{ at: 'bannerSpot', radius: 3 }` |
| 2 | Plant the Banner (use it) | `{ flag: 'bannerPlanted' }` |

Planting cutscene: the banner rises, a gold light ring spreads, the border stitch runs around, and "Thimbleton has been founded!" appears. Wren walks in from the road. Granny teaches the Mending Bench (a Pocket recipe) and Lattice Door notions.

**M3 "Wren's Bed"** (Wren).

| # | Step | Condition |
|---|---|---|
| 1 | Gather 4 Straw from tufts | `{ have: { straw: 4 } }` |
| 2 | Gather 1 Cotton Puff | `{ have: { cotton: 1 } }` |
| 3 | Make and place a Mending Bench | `{ placed: 'bench' }` |
| 4 | Craft a Straw Bed and a Lattice Door | `{ crafted: ['strawBed', 'latticeDoor'] }` |
| 5 | Build a Bedroom: walls 2 blocks high, a door, the bed and a light inside | `{ room: 'bedroom' }` |

Reward: Cheer +10 and the Storage Chest notion. Wren: "It's... a BED. I'm going to sleep in it for a hundred years!" Her bedtime that night is her first heart bubble.

**M4 "A Place to Make Things"** (Wren).

| # | Step | Condition |
|---|---|---|
| 1 | Craft a Storage Chest | `{ crafted: 'chest' }` |
| 2 | Build a Workshop (bench + chest in a room) | `{ room: 'workshop' }` |

Reward: Cheer +10. This is likely Lv2, and Mortimer arrives at dawn ("Hmph. Another dreamer.").

**M5 "Club Med"** (Mortimer).

| # | Step | Condition |
|---|---|---|
| 1 | Gather 3 Pebbles in the Crags (marker on the nearest gravel) | `{ have: { pebble: 3 } }` |
| 2 | Craft a Cobble Club | `{ crafted: 'cobbleClub' }` |
| 3 | Show it to Mortimer | `{ talk: 'mortimer' }` |

Reward: Spin Stitch technique (cutscene: Mortimer demonstrates on a straw dummy), Heartpatch #1, Cheer +10.

**M6 "Guard Duty"** (Mortimer). Step: build a Guard Post (a Weapon Rack, from the notion at the quest start, plus 2 lights) → `{ room: 'guardPost' }`. Reward: Cheer +15. From now on Mortimer patrols at night.

**M7 "Supper Time"** (Wren and Mortimer, a joint talk). Step: build a Mess Hall (table + 2 stools) → `{ room: 'messHall' }`. Reward: Cheer +10. This is likely Lv3: Marigold arrives ("Is that a TABLE? I could weep!").

**M8 "Hearth and Home"** (Marigold).

| # | Step | Condition |
|---|---|---|
| 1 | Mine 4 Tweed Stone and 1 Charcloth (needs the Cobble Club; marker on the nearest coal) | `{ have: { stone: 4, coal: 1 } }` |
| 2 | Craft a Hearth Pot | `{ crafted: 'hearthPot' }` |
| 3 | Build a Kitchen (Hearth Pot + chest) | `{ room: 'kitchen' }` |
| 4 | Bring Marigold 2 Puffballs from Tweedwood | `{ have: { puffball: 2 }, talk: 'marigold' }` |

Reward: Glen Stew notion, Heartpatch #2, Cheer +15. Marigold starts cooking.

**M9 "Copper Bottomed"** (Mortimer, then Marigold).

| # | Step | Condition |
|---|---|---|
| 1 | Craft a Thimble Forge | `{ crafted: 'forge' }` |
| 2 | Build a Smithy (Forge + chest) | `{ room: 'smithy' }` |
| 3 | Smelt 2 Copper Ingots | `{ crafted: { copperIngot: 2 } }` |
| 4 | Forge a Copper Bodkin | `{ crafted: 'copperBodkin' }` |

Reward: Cheer +20. This is likely Lv4: the Professor arrives with the Hall Pattern ("Fascinating! A functioning door!").

**M10 "The Quilters' Hall"** (Professor).

| # | Step | Condition |
|---|---|---|
| 1 | Place the Hall Pattern inside the town (a suggested site is outlined NE of the banner, 11×9) | `{ flag: 'hallPlaced' }` |
| 2 | Designate a Town Chest so residents can help | `{ flag: 'townChest' }` |
| 3 | Complete the Pattern | `{ pattern: 'hall' }` |

The Pattern (outer 11×9, interior 9×7 = 63 cells) has 129 cells:
- level 1: 35 Cobble (the perimeter minus the door)
- level 2: 35 Planks
- level 3: 36 Planks (a lintel over the door)
- level 4: 18 Felt crenellations, 6 per colour, on every other perimeter cell
- 1 Plank Door
- 4 Moth Lanterns in the interior corners

Reward: Cheer +100, Heartpatch #3, and the Bobbin Ballista notion. Revelation cutscene in the Hall: the Professor reads the old Pattern margins. "The Golden Thread fragment lies atop the Knotted Spire, past the Knot Wall. Only a Seam Ripper can cut a Black Knot. And the only Golden Needle left is fastened to Sir Buttonsworth's chest."

**M11 "Needle in a Haystack"** (Professor).

| # | Step | Condition |
|---|---|---|
| 1 | Go to the Button Quarry | `{ at: 'quarryFloor' }` |
| 2 | Defeat Sir Buttonsworth (intro cutscene) | `{ boss: 'buttonGolem' }` |
| 3 | Forge the Seam Ripper (needs Steel Thread: the Golem drops 3, Frayed Knights more) | `{ crafted: 'seamRipper' }` |

Reward: Cheer +20.

**M12 "Rip It Up"** (Professor).

| # | Step | Condition |
|---|---|---|
| 1 | Cut through the Knot Gate (rip cutscene: the wall unpicks itself in a wave) | `{ flag: 'gateCut' }` |
| 2 | Climb the Knotted Spire | `{ at: 'spireTop' }` |
| 3 | Take the Golden Thread fragment | `{ have: { goldenThread: 1 } }` |

Cutscene: the thread glows, Frayvern's silhouette spreads across the sky ("Mend all the patches you like..."), and Gnarlgrim's roar echoes from the Rift. Granny: "Hurry home, dearie, they're going after Thimbleton!" Autosave.

**M13 "Hold the Line"** (Mortimer).

| # | Step | Condition |
|---|---|---|
| 1 | Return to Thimbleton (portal) | `{ at: 'bannerSpot', radius: 12 }` |
| 2 | Talk to Mortimer, "Ready?" (Yes starts the siege prep; "Not yet" lets you prepare freely) | `{ flag: 'siegeStarted' }` |
| 3 | Survive 3 waves | `{ siegeDone: true }` |

Mortimer suggests building at least 2 Ballistas and some Pin Traps (hint only).

**M14 "Gnarlgrim the Knotted"**. Step: defeat Gnarlgrim → `{ boss: 'gnarlgrim' }`.

Finale cutscene:
1. Gnarlgrim unravels and the Golden Thread fragment flies into the Banner.
2. The Banner flares, and the Rift and the frayed patch east of town re-stitch: a wave of stitches turns void into meadow.
3. Town Lv5.
4. The party: residents dance and cheer, confetti scraps fly, fireworks particles burst, and Marigold serves Hearty Pies.
5. Granny: "You did it, my little stitch. One patch mended... and a great many to go."
6. Results, then credits, then free play.

**S1 "Lintwick's Lament"** (found at the Lint Camp, from Lv2).

| # | Step | Condition |
|---|---|---|
| 1 | Break the Knot Cage (tier 2) | `{ flag: 'lintwickFreed' }` |
| 2 | Lintwick follows you home (he walks or warps along) | `{ at: 'bannerSpot' }` |
| 3 | Build him a Bedroom with at least one Felt block in its walls | `{ room: 'bedroom', felt: true }` |

Reward: Cheer +20 and daily Lint gifts.

**S2 "Bluebell Blues"** (Wren, from Lv3). Steps: craft 4 Blue Felt → `{ crafted: { feltBlue: 4 } }`; place 8 Blue Felt blocks inside the border → `{ placedInTown: { feltBlue: 8 } }`. Reward: Cheer +15. Wren: "It's like the sky came down to visit!"

**S3 "Buttons of Old"** (Professor, from Lv4). Step: find 3 Ancient Buttons (Coast shipwreck, Crags ledge, Tweedwood hollow tree; the map marks their regions with "?") → `{ have: { ancientButton: 3 } }`. Reward: Golden Thimble (Gilded Felt notion) and Cheer +30.

**Talk variety.** Each resident has at least 6 idle lines that vary by time of day, mood, town level and quest state, plus reactions to the player's actions:
- seeing a new room type: "A KITCHEN!"
- Belly low: "You look peckish, Builder."
- the night: "Lock the doors!"

### 7.11 Music (`DQ.SONGS`; original compositions, engine step format)
The leitmotif, **"The Golden Thread"**, is the seed every theme quotes. Melody in B♭ major, eighth notes (`steps: 2`):
```
F4 Bb4 C5 D5 | Eb5 - D5 C5 | Bb4 - G4 C5 | A4 - - - | F4 Bb4 C5 D5 | F5 - Eb5 D5 | C5 Bb4 A4 C5 | Bb4 - - -
chords:  Bb | Eb | Gm | F | Bb | Bb7/D | Eb F | Bb
```

| Song | Use | Key / tempo / metre | Notes |
|---|---|---|---|
| "Overture of Mending" | Title | B♭, 116 bpm, 4/4 | Fanfare intro (square brass), the leitmotif in full, triangle bass, march drums |
| "Granny's Lullaby" | Intro crawl, Granny moments | B♭, 72 bpm, 3/4 | Leitmotif slowed, sine and triangle |
| "Lint Hollow" | Cave and tutorial | D dorian, 88 bpm | Plucky pulse arpeggios, sparse |
| "Thimbleton Days" | Town (day) | F, 96 bpm, 3/4 waltz | 4 layers: base, `strings` (Lv2), `bells` (Lv3), `drums` (Lv4) |
| "Moonlit Hem" | Night (anywhere) | A minor, 72 bpm | Soft triangle melody, the leitmotif in minor |
| "Gingham Glen" | Glen and Coast | D, 112 bpm | Bright pulse melody, walking bass |
| "Corduroy Deep" | Crags and Quarry | E minor, 92 bpm | Low saw drone, clinking noise percussion |
| "Tweedwood Rustle" | Tweedwood | G, 100 bpm, 6/8 | Flute-like pulse12 |
| "The Fraying" | Verge, Fraying, Spire | E phrygian, 66 bpm | Detuned pulses, dissonant intervals, slow noise swells |
| "Snip Snap Skirmish" | Siege waves | C minor, 150 bpm | Driving bass, leitmotif fragments |
| "Sir Buttonsworth" | Mini-boss | F minor, 140 bpm | Pompous march, comedic |
| "Gnarlgrim" | Boss | G minor, 160 bpm | The leitmotif inverted. Layer `fury` from phase 3 |
| "Quilting Bee" | Bee round | C, 128 bpm | Jaunty; layer `raid` comes in at the raid phase |
| "Patchwork Finale" | Results and credits | B♭, 108 bpm | Medley: leitmotif, town waltz, triumphant ending |

Jingles (`loop: false`):

| Jingle | Length | Character |
|---|---|---|
| Notion! | 1.2 s | harp gliss up |
| Room Complete! | 2.5 s | fanfare |
| Town Level Up! | 3.5 s | |
| Quest Complete | 2 s | |
| Item Get | 1 s | |
| Resident Arrives | 2 s | |
| Night Falls | 2 s | descending |
| Morning | 1.5 s | rooster-ish pulse chirps |
| Come Undone | 2.5 s | sad |
| Wave Cleared | 1.5 s | |
| Victory | 3 s | |
| Zzz | 2 s | |

### 7.12 Sound effects (`DQ.SFX`, engine voices; all from code)
- **Blocks:**
  - `hitSoft` (noise lowpass 900 Hz + triangle 180→120, 60 ms), `hitHard` (+ a 2 kHz click)
  - `clink` (pulse 1800→2200, 50 ms, for under-tier)
  - `rip` (noise bandpass 2.5 kHz → 700 Hz over 160 ms, then `pop`: sine 600→200, 40 ms)
  - `stitch` (pulse12 880→1320, 40 ms + a soft click)
  - `crumble` (Tangle and frayed breaks)
- **Actions:**
  - `swing` (noise whoosh), `spinCharge` (rising triangle), `spinRelease`, `jump`, `land`
  - Footsteps by material: grass (soft noise), stone (click), wood (knock), sand (hiss), water (splash)
- **Items and UI:**
  - `pickup` (arpeggio 0-4-7, 90 ms), `notion`, `craft` (tok tok + a chime), `eat` (munch ×3)
  - `zipper` (opening Satchel or Chest: a rising noise ratchet, 250 ms), `uiMove`, `uiConfirm`, `uiCancel`
- **World:**
  - `doorOpen` / `doorClose` (creaks with a pitch slide), `torchLight`, `portal` (swirl)
  - `bubble` (two-note ding for Cheer), `levelUp`, `trap` (pins), `ballistaFire` (thwomp + whoosh), `ballistaReload` (click-clack)
- **Combat:**
  - `monsterHurt` (squeak per type: Lintling high, Knotbrute low), `monsterDie` (pop), `builderHurt`, `heartbeat`
  - Boss: `slam` (boom + low rumble), `roar` (saw drive)
  - Mothlet flaps, Pinhog roll rattle

---
## 8. Art direction and animation

The base is the engine's native look: low-res pixel buffer, shaded HD puppet rigs, stepped-alpha blends, canvas lighting, the 5×7 font and `E.font.title` logos. The new assets make it feel like a cosy patchwork-quilt reimagining of a block-building action RPG. Generic props may come from the engine library and the asset store (`node engine/tools/asset-find.mjs "barrel"`): barrels, crates, pots, signs, sacks, fences, rocks. Everything that defines the game's identity is made new: blocks, characters, monsters, furniture with a sewing twist, the banner, portals, UI, the logo.

### 8.1 Block textures (16×16 texels per face, 1 texel ≈ 1 world unit)
A texel's colour is one of the material's five tones from `E.tones(base)`: `deep`, `sh`, `base`, `lt`, `hi`. Some patterns add an accent colour, and seams use the thread colour. Common rules:
- **Seam:** the outer ring (u or v = 0 or 15) is `deep`. A **running stitch** sits at ring 2 (u or v = 2 or 13): along positions 3–12, texels where `(along % 4) < 2` take the thread colour (default cream `#f1e6c8`; dark blocks use `#c8b890`). That gives each block its stitched-patch look.
- **Faces:** top faces use the full tone set. Side faces shift one tone darker for faceA and two for faceB (§6.1.3). The pattern moves the tone by −1..+2 steps, as engine materials do.
- **Variety:** 4 variants per material, made by offsetting each pattern's hash seed.

| Pattern | Rule (u, v in 0..15) | Blocks (base colour) |
|---|---|---|
| `gingham` | Checks of 4×4: `((u>>2)+(v>>2))&1` → `base`/`lt`; where a light row crosses a light column → `hi` | grass top `#6cb84a` |
| `fringe` | Earth side with the top 3 rows green felt and ragged yarn tufts (rows 3–4 at hashed u) | grass side |
| `cord` | Sides: ribs, `u%3` → `sh`/`base`/`lt`. Tops: crosshatch | earth `#8a5a3a` |
| `calico` | Base plus florets: hashed centres ~5 apart, centre texel accent `#e07a3a`, 4 petals `lt` | sand `#e8d08a` |
| `bumps` | Discs of radius 1.5 on a jittered grid, lit top-left | gravel `#9a96a0` |
| `tweed` | Herringbone: diagonal bands 2 wide that flip direction every 4 rows; speckles | stone `#8c8c9a` |
| `sequins` | Tweed plus 3–4 discs (r 1.5) in `#d07a3a` with a `hi` glint. At draw time one sequin flashes white every ~2 s (overlay) | copper ore |
| `lumps` | Tweed plus 3 black felt blobs `#2a2630` | coal |
| `plaid` | Bark `#7a5032`, vertical stripes at u 4–5 and 11 in `#b0403a`, horizontal at v 7–8 in `#3a6a3a`; crossings darker | log side |
| `rings` | Concentric rings every 2.5 texels, `sh`/`base`, a stitched outer ring, a centre dot | log top `#c89a62` |
| `bobbles` | Pompoms of radius 2 on an offset grid, `lt` top-left and `sh` bottom-right, `deep` gaps; no seam | leaves `#4a9a4a` |
| `torn` | A diagonal weave with gaps (`deep`), 2–3 loose `hi` threads crossing, broken stitches | frayed `#5a3a5a` |
| `loops` | Overlapping yarn loops (ellipse outlines) in `sh`/`lt`; no seam | knot `#2a1a3a` |
| `satin` | Blue with diagonal sheen bands that move by frame (4 frames) | water `#4a8ad0` |
| `grid` | Navy with a large stitch grid every 8 texels | backing `#1a1840` |
| `quiltstone` | Voronoi (5 seeds), `sh` borders, `lt` top-left rims | cobble `#9a9aa8` |
| `boards` | Boards 4 texels tall, `sh` joints, staggered butt ends, stitched board lines | planks `#c8955a` |
| `straw` | Horizontal straw courses `lt`/`base`/`sh` with a ragged lower edge | thatch `#e0b850` |
| `felt` | Speckles 6% plus a diamond stitch `abs(u−7.5)+abs(v−7.5) ≈ 6` in thread colour | felts `#d04a4a`, `#4a6ad0`, `#e8c040` |
| `star` | A stitched 5-point star; emissive (drawn again after lighting, as an `emissive` queue item) | glow `#fff0b0` |
| `gild` | Gold with sparse `hi` sparkles | gildedFelt `#e8b830` |

Check every material with an atlas sheet written to `check-output/atlas.png` (§11.5). Each must read clearly at zoom 1 and 0.75 and be distinct from its neighbours: grass vs leaves, stone vs cobble, sand vs thatch.

### 8.2 World dressing
- **Void:** deep navy with lint motes, frayed fringe on edge columns, and a faint stitched grid in the far background.
- **Thimbleton ruins:** the burned foundation outlines in a darker cobble.
- **Props:** from the core library, recoloured to the palette: barrels, sacks, crates, a well, fences, signs. Place 3–8 per screen in town and at POIs.
- **Plants:** they sway (a 0.5 Hz skew of 1 px).
- **Lighting:** torches flicker (radius ±4 every 0.1 s) from the engine's flames. Dawn and dusk tint the scene warm; night is cool blue with warm pools of light.
- **Weather:** ash in the Fraying, rain on some days in the Glen.

### 8.3 Characters and monsters
See §7.8–7.9 for options. Style rules:
- Chibi proportions, big eyes, distinct silhouettes, 4–6 colours each, the engine's outline.
- Different body language per resident:

  | Resident | Body language |
  |---|---|
  | Wren | bouncy, `run` faster |
  | Mortimer | `stance:'ready'`, slow |
  | Marigold | `hips` idle |
  | Professor | `lean` forward, hands behind back |
  | Lintwick | hop |

- Monsters use `Blob` variety (fuzz, button eyes, pins, wings) and Humanoid builds (mannequin, yarn brute, button golem).
- **Custom draw-over details**, drawn in the actor callback after `rig.draw` at joint positions from `rig.worldOffset`: button eyes, a felt fuzz edge (a dithered 1-px ring), Pinhog pins (radial lines with coloured heads), the Heart Knot glow, Mortimer's beard, the Professor's glasses. Keep each under 30 lines of code.

### 8.4 UI look
- Felt panels (dark indigo gradient) with cream running-stitch borders. Selected items get a gold stitch and a gentle 1-px bob.
- Glyph icons are in §6.4.
- Popups use `E.font.title` with patchwork gradient colours.
- The **logo** is "DRAGON QUILT" at scale 4, each letter in a different fabric colour (gingham green, berry red, denim blue, calico yellow, plum, tan) with a stitched outline, and "BUILDERS" at scale 2 in gold thread. The emblem is a needle-and-thread drawn as a little dragon.
- 10-foot check: at 1920×1080 every glyph and body text is at least 28 px tall. Verify on screenshots.

### 8.5 Effects
- **Block break:** `particles.bits(x,y,z, 10, tonesOfBlock)` plus `dust`, and a pop scale of the block's last frame.
- **Place:** `glints` and the squash tween.
- **Cheer bubble:** a pink heart sprite (8×8) bobbing, then flying in an arc to the HUD.
- **Level up:** confetti in every felt colour, a light ring and a banner stripe stitch.
- **KO and boss defeat:** an *unravel* effect. 40–80 thread particles: custom `particles.add({ kind:'spark' })` with long life, or our own line particles that peel off the rig's bounding area upward with sway.
- **Notion bubble:** a thought cloud plus the item icon.
- **Ballista:** a spool bolt with a thread trail, and a yarn burst on hit.
- **Tangle:** a lobbed yarn ball with a shadow telegraph (`r.groundDisc` pulsing red).
- **Finale:** fireworks (`particles.explosion` in felt colours, no shake) and the re-stitch wave (a sweep along the rift's edge, ring by ring, with a "stitch" sfx per ring).
- Every hit gets hit-stop, shake, sparks and sound (engine `hitFx`). Flashes follow the comfort settings.

### 8.6 Animation (engine-native rigs plus new moves)
The engine's procedural `Humanoid`/`Blob` rigs are the base: `E.MOVES`, poses, `E.Combo`, `rig.kick`, tweens and scripts. Add new moves as `E.MOVES` specs (`{ a0, a1, z0, z1, reach, wind, active, recover, hand, lunge, hop, crouch, lean, twist, hold }`) and new poses through state combinations.

| Character | Animation | How |
|---|---|---|
| Builder | Combat combo | `E.Combo(['slash','backslash'])` |
| Builder | Break block at feet or below | `overhead` (a hammer-like chop) |
| Builder | Break at chest or head | `slash` |
| Builder | Spin Stitch | charge (`crouch` plus a glow) → `spin` with `rig.drawSmear` |
| Builder | **place** (new) | `{ hand:'both', a0:-.2, a1:.15, z0:20, z1:8, reach:9, wind:.05, active:.05, recover:.12, lunge:1.5 }` plus the block pop |
| Builder | **eat** (new) | 3 quick `{ hand:'L', z0:14, z1:24, reach:3, wind:.08, active:.1, recover:.1 }` with `expr:'smile'` |
| Builder | **craft** | a `bash` loop at the station, 0.5 s |
| Builder | **plant banner** | `plunge` two-handed with a 0.3 s hold |
| Builder | **notion** | `pose:'kneel'` blend 0.4 s → `pose:'cheer'` 0.6 s, plus a thought bubble |
| Builder | Sleep | `down: 1` on the bed (z = bed top), Zzz particles |
| Builder | Sit (stools, ballista) | `pose:'crouch'` with a z offset |
| Builder | Hurt, die, unravel | `hurt`, `pose:'die'` → unravel |
| Builder | Wave and cheer (rooms, levels) | `wave`, `cheer` with `rig.kick(.3)` |
| Residents | Walking styles | per §8.3 |
| Residents | Talk gesture | alternate `wave`/`hips` with `expr:'smile'` |
| Residents | Jobs | **stir** (new: a small circular hand loop `{hand:'R', a0:-.4, a1:.4, z0:14, z1:14, reach:8}` repeated), **hammer** (`bash` loop), **read** (`kneel` with hands forward), slingshot (`throw`), Mortimer `overhead`, Marigold pie `throw` |
| Residents | Daily life | `cheer` on rooms and level-ups, `pose:'down'` asleep, `crouch` cowering when hurt |
| Lintwick | Hop, dance | Blob hop and squash (`kick`), a dance loop (squash oscillation + hop + a facing spin) |
| Lintlings | Hop chase, lunge | squash-hop chase; lunge = squash wind then stretch |
| Mothlets | Flight | `flap` 1 → swoop |
| Pinhogs | Roll | curl (`squash .4`, pins shrink inward) → roll (rotating pin angles) → dizzy (stars over the head) |
| Frayed Knight | Fighting | `stance:'ready'`, `thrust`, `spin` |
| Knotbrute | Fighting | `haymaker`, `sweep`, a shoulder charge (`lean` forward) |
| Sir Buttonsworth | Boss moves | `haymaker` (slam), `throw` (volley), a charge with `lean`, a `down` stagger |
| Gnarlgrim | Boss moves | `haymaker` slam, `throw` toss, charge, `down:.6` (Tangled), `expr:'shout'` roar, unravel death |
| Objects | Motion | door swing (tweened rotation of the door leaf), banner flutter (a sine wave across the cloth, 3 px), portal swirl (rotating thread arcs), ballista crank and bolt recoil, plant sway, bed blanket |
| Camera | Cutscenes | eased pans and zooms (tweens), a 90° turn crossfade |

Check every attack and the new moves with `filmstrip.mjs` (wind-up, strike, settle; no backward sweeps). Enemies' wind-ups are longer than the hero's (.3–.6 s).

---

## 9. Build order and milestones
Each milestone ends with: `node tests/run.mjs` green, `node tools/build.mjs` producing a playable HTML, and a short note in `DEVLOG.md` in the dev folder. Build the **core loop end to end early** (MS1–MS6 make Act 1 playable), then widen. Milestones are numbered MS0–MS12; quests keep their own IDs, M1–M14 and S1–S3.

| # | Milestone | Deliverables | Acceptance |
|---|---|---|---|
| **MS0** | Setup | Folder layout, engine copy, `vendor/aihub`, `build.mjs`, `tests/run.mjs` with the loader (vm context with `window`, `addEventListener`, `location` stand-ins, as `engine/kits/test.mjs` does), an empty `DQ` booting to a minimal title scene | Build works from `file://`; the test runner prints `N passed, 0 failed`; `check.mjs` reports no errors |
| **MS1** | **Voxel core** (riskiest; §10) | `VoxelWorld`, `VoxelRenderer` (atlas, runs, AO, cutaway, x-ray, water, void), `VoxelBody`, picking, break/place in a dev "sandbox" scene (a 32×32 diorama stamp), 4 rotations, zoom steps, depth hooks | Unit tests: collision, ground, ceiling, stairs, raycast, pick, diff, hash. Diorama screenshots in 4 rotations × 2 zooms show no sorting errors. Sorting filmstrip; manual play feels solid. Fallbacks in §10 decided by the end of MS1 |
| **MS2** | Builder and controls | Movement, auto-hop, sprint, jump, combo, Spin Stitch, break tiers, place, cursor modes (auto, mouse, Builder's Eye), hotbar, glyph icons and prompts by device, camera controls | Input-driven tests per action (taps and holds); prompt label tests for keyboard, mouse, PlayStation and Xbox |
| **MS3** | Items, crafting, objects | Data tables §7.2–7.5, bag and hotbar, drops and pickups, chests, Pocket and Bench crafting UI, notions, doors, lights, beds, plants and regrowth, `E.SHAPES` for all objects | Craft-chain tests; UI navigation tests (MENU actions, mouse hover/click via `input.feed`); object sheets via `asset-sheet.mjs` |
| **MS4** | World | `generateWorld` with every region, stamps and POI from §7.1, portals, day/night and lighting, weather | Determinism hash test; every POI reachable by nav from the banner (portals allowed); region screenshots |
| **MS5** | Rooms and town | Room detection and classes, Banner planting, border, Cheer, levels, bubbles, Patterns (ghosts, progress, placement UI) | Room test matrix (§11.2); level-up and border-growth tests; Pattern completion test |
| **MS6** | Residents and story (Act 1–2) | Nav/A\*, resident schedule, needs, jobs and helpers; `E.Story` dialog with portraits; quest director; quests M1–M7 and S1; cutscenes with skip; Journal; objective marker | Playthrough test up to Lv3; residents sleep and eat; quests turn in |
| **MS7** | Combat, monsters, bosses (Act 3–4) | All monsters, spawning, combat feel, KO and Lost Bundle, traps, ballistas, Sir Buttonsworth, siege director, Gnarlgrim; quests M8–M14, S2 and S3; the finale | Damage-formula tests, siege and boss state tests, filmstrips of every attack; playthrough to Chapter Clear |
| **MS8** | Audio | Every song and jingle, sfx, Animalese synth with `onLetter`, Voices bus and setting, the music director with layers | Headless: every song id resolves, no audio errors. Browser: a listening pass (record notes), plus a `dev/voices.html` test page cycling through speakers |
| **MS9** | UI polish | Title diorama and logo, New Game, intro, HUD final, Satchel (Bag, Map, Journal), Banner screen, results, credits, About, settings additions, touch-only notice | Screenshot review at 1920×1080 (legibility, 10 ft); keyboard-only, mouse-only and pad-only walkthroughs |
| **MS10** | Save, dev mode, attract | `game.saves` integration, autosave, Continue; Dev Tools (all tabs, sliders with reset, stamp export, beats); Attract (9 vignettes, any input exits) | Save round-trip test (hash and state equal); slider live-effect and reset tests; attract runs 3 loops headless with no errors, and a keypress exits within 1 step |
| **MS11** | Multiplayer | `DQ.Net` (codec, host, client, prediction), the Bee world and rules, `hubcard`, server mode, loopback, solo Bee from the title | Net loopback tests (§11.3); `--browser` harness passes all 4 scenarios |
| **MS12** | Finish | Balance pass with dev sliders; full playthrough under 3 min headless; final screenshots; `exit-interview.json`; About filled from it; final build | §12 checklist all ticked |

Parallel work (for teams): after MS1's API is frozen (end of MS1), MS3 (data and crafting), MS4 (worldgen) and MS8 (audio) can proceed alongside MS2. MS11 can start with the loopback once the Builder and VoxelWorld APIs exist.

---

## 10. Risks and de-risking

| Risk | Why | De-risk (do early) | Fallback |
|---|---|---|---|
| **Voxel rendering in a 2D engine** (sorting, overhangs, cutaway) | The engine sorts single points; overhangs can draw actors over roofs | MS1 first, against the diorama with every hard case (§11.2): lift and sink in `_liftOrder`, runs as occluders, x-ray, cutaway. Use filmstrips in 4 rotations | (a) Draw each block as its own queue item instead of runs; (b) if overhang sorting still glitches, always cut away blocks above `heroLevel+2` within the radius, and let NPCs under roofs be hidden by the roof (sink rule only); (c) as a last resort, limit placement so blocks need support below or a neighbour (no floating roofs). Decide by the end of MS1 and record it in DEVLOG |
| **Render cost / hitches** | Thousands of blits; atlas rebuild on zoom | Face-sprite atlas (no per-run baking), zoom steps, visible-column culling. Perf readout in Debug | Fewer variants, top-only far columns, lower `H` |
| **Body collision in voxels** (stuck, jitter, ceilings) | A new system with heights | Unit tests for every edge case: corners, 1-high step, 2-high gap, stairs, water, void; the `escape()` routine; no placement inside bodies | Make bodies smaller (r 4); disable auto-hop |
| **Room detection** correctness | Many shapes; false positives and negatives frustrate players | A test matrix with 20+ layouts, a leak-hint HUD and a dev overlay | Relax the rule (count 1-high door-adjacent gaps as leaks only) |
| **NPC navigation** in an editable world | Changing graph; residents stuck | Incremental invalidation, A\* caps, the stuck rule (off-screen teleport), a dev path overlay | Residents hop over 1-block obstacles and teleport within the border when stuck for more than 8 s even on screen (a poof effect) |
| **Shared-world netcode** | Latency, loss, message caps, host or server modes | Keep the Bee world small; voxel edits are reliable and idempotent; snapshots are unreliable with timestamps; a loopback suite with simulated latency, jitter and loss; run the harness early (a skeleton round in MS6) | Reduce the Bee round to the build phase plus a single raid wave; lower snapshot rates to 6 Hz |
| **Scope** (17 quests, 8 monsters, 2 bosses) | A large content load | Data-driven tables; finish one vertical path (Act 1) before widening; the scripted playthrough guards regressions | Cut the side quests' extra steps (keep S1–S3 short); keep S3 even if minimal |
| **Animalese quality / annoyance** | Synth voices can grate | Prototype the test page on the first day of MS8; soft envelopes, low volume (.18), a Voices volume setting, text speed | A one-blip-per-two-letters mode |
| **10-foot legibility** | Pixel font at 240p | Text at scale 1 or more; a 1080p screenshot review in MS9 | Use `res: 'snes'` (taller pixels) for menus only, through the scene `res` |
| **Headless testability of UI** | Menus are visual | UI logic as state machines; `game.debug` exposes the UI state; tests drive inputs | — |
| **Determinism** | Attract, tests, replays | Seeded streams only; `game.stateHash` for replays | — |

---

## 11. Testing plan

Rules (from TASK.md):
- One command: `node tests/run.mjs` prints **only failures and a one-line count**. Rerun it only after changing the code it covers; use `--only` with suite names.
- Use the engine's `game.advance(seconds)` and `game.debug` for scripted play. Use screenshots only for what a script cannot check.
- Do not use subagents or workflows to debate, review, judge or audit.

### 11.1 Harness
- `tests/lib/load.mjs` creates a vm context with stand-ins (`window = ctx`, `addEventListener(){}`, `location: {hash, search:''}`, `matchMedia: () => ({matches:false})`). It runs `engine/my-3d2dge.js`, then each `src/*.js` in build order, and returns `{ E, game, DQ }`. Each suite gets a fresh context.
- Helpers:
  - `press(action, s)` (tap, then advance)
  - `hold(action, s)`
  - `run(s)` (advance)
  - `snap()` (`game.debug.snapshot()`)
  - `expect(cond, msg, detail)`
  - `atBeat(id)` (dev beat)
- `tests/run.mjs` imports every `*.test.mjs` it finds, collects `{name, ok, detail}`, prints failures only, and prints the final count. Exit 1 on any failure. `--only a,b` filters by file prefix. `--browser` adds `tests/browser/*`.

### 11.2 Headless suites (what each checks)
| Suite | Checks |
|---|---|
| `voxel.test` | get/set bounds; `topZ` upkeep; `standLevels`; `groundAt` on edges and stairs; `ceilingAt`; `collide` (corner, step, 2-high gap passes, 1-high gap blocks); water depth rules; void respawn; raycast and `pickScreen` in all 4 rotations and 2 views (pick a known block from its projected centre); `diff`/`applyDiff` round trip; hash stability |
| `render-logic.test` | Run splitting; visible-column culling contains the camera's cell; `_liftOrder` lift and sink cases (a hero on a block sorts after it; a hero under a roof sorts before the roof run; a body under a bridge sorts before the bridge); cutaway trigger cases |
| `builder.test` | Walk speed matches tuning; jump clears 1 block, not 2; auto-hop; Builder's Eye cursor moves and levels; break tiers (clink vs break), crack stages, drops; place validity (reach, occupied, inside a body); combo timing; Spin Stitch charge; KO → respawn and Lost Bundle content (50%) |
| `input.test` | Prompt labels per device (keyboard, mouse, PlayStation, Xbox); the glyph setting switches; the Create+Options hub rule; wheel steps cycle the hotbar |
| `items.test` | Stacks, overflow, hotbar refs, chest store-all, Town Chest designation |
| `crafting.test` | Every recipe: inputs consumed, output added; station gating; notion triggers fire once; the quantity picker |
| `objects.test` | Doors open for builders and residents and stay shut for monsters; beds sleep only at night and safely; trap damage; ballista auto and manned fire, reload, repair; portal discovery and travel; plant regrowth after a day |
| `rooms.test` | Matrix: 2×1 snug; 3×3 bedroom; a 1-high wall leak; a corner gap leak; a missing door; a missing light; 65 cells too big; a roofed room; a door on a corner (invalid, since doors must be in straight walls); stairs inside; two rooms sharing a wall; a room outside the border (detected, no Cheer); a type change (bedroom → snug when the bed is removed); every room type in §7.6; the Hall Pattern recognised; awards counted once per slot and capped by maxAwards |
| `town.test` | Planting creates the border; Cheer thresholds → levels; border growth; arrivals at dawn; bubbles spawn once per need per day and collect; Pattern placement validity and rotation; ghost counting; helper placement from the Town Chest; "need" balloon |
| `nav.test` | Paths over steps and stairs and through doors (residents) but not doors (monsters); a breaker path through a wall; re-path after an edit; the stuck rule |
| `npc.test` | Schedule transitions; sleep in an assigned bed; supper at the Mess Hall; Marigold cooks from the chest; Wren's and Lintwick's gifts; requests show "!" and "?" |
| `monsters.test` | Spawn rules (not in the border, not near the builder, night tables); aggro, leash and despawn; each attack's wind-up precedes damage; the damage formula with def/tuning/difficulty; drop tables |
| `siege.test` | Prep → W1–W3 → boss sequencing; monsters target the Banner and break walls; the fail and retry checkpoint; wave sizes scale with tuning |
| `bosses.test` | Buttonsworth patterns and summon at 50%; Gnarlgrim def 25 → ~1 damage; 2 ballista hits in 8 s → Tangled; charge-hit → Tangled; Seam Ripper ×4 on the Heart Knot; phase transitions at 66% and 33%; the defeat cutscene's `apply()` state |
| `time.test` | The day length tunable; ambient by hour; sleep skips to 06:00; Belly drain and starving |
| `quests.test` | Each quest's steps complete from its conditions; rewards granted once; `applyBeat` for every beat yields a consistent snapshot (no errors; flags, residents, rooms present) |
| `save.test` | Mid-game save → load in a fresh context: `world.hash`, bag, quests, town, residents, clock all equal; the autosave triggers |
| `dev.test` | Every slider changes behaviour live (walk speed, monster HP, day length...); Reset restores the defaults; cheats toggle; warp lands on standable cells; spawn works; stamp export → import round trip |
| `attract.test` | Start after 10.0 s idle on the title (not 9.9 s); 3 full loops (about 7 minutes simulated) with no errors and each vignette reaching its end condition; any input (key, mouse move, pad button) returns to the title within 1 step; the player's save is untouched |
| `touch.test` | With `matchMedia` coarse-only stubs and no keys: the title shows the notice, no touch buttons, attract still runs |
| `ui.test` | Satchel tabs, Bag actions, crafting navigation by MENU actions and by `input.feed` mouse hover and click; the name entry; settings additions persist |
| `about.test` | The About pages contain every Source Information field and the three feedback lists from the embedded data |
| **`playthrough.test`** | **Full scripted run, New Game → Chapter Clear → credits → free play.** `DQ.Autopilot` uses real systems: walk with nav, break and place through Builder actions, craft through Crafting, talk through Story choices, fight with combos. Cheats allowed: god mode, teleports to POIs (instead of long walks), extra materials for the Hall, time skips, and a boosted helper rate. **Every quest must complete through its own triggers.** It asserts at each beat: quest states, town level, residents present, room types formed, Notions known, Golden Needle and Seam Ripper obtained, gate cut, siege waves cleared, boss defeated, results scene, credits, back to play. Error count 0 throughout. Target under 3 minutes wall time (big `advance` chunks during travel, 1/120 steps during combat via `game.advance`) |
| `bee.test` | Solo Bee from the title: the Pattern scales with players; the build and raid phases; scoring rules; win and lose |
| `net.test` (loopback) | 2 and 4 game instances in separate vm contexts with a **fake AIHub** (connect, ready, card events, start, `time()`, send/on, leave, time-up, end, `rng`, server flag) over an in-process bus with seeded latency 150 ± 50 ms and 5% loss on unreliable messages. Checks:<br>(1) `connect`/`ready` with no key press; the card answers Ready on Enter and More on Triangle.<br>(2) Bot builders place and break; after quiescence every copy's `world.hash()` is equal.<br>(3) Monsters move on clients from snapshots.<br>(4) Message rate ≤ 20/s per copy (bursts ≤ 40); every payload ≤ 16 KB; unreliable ≤ 1,200 bytes.<br>(5) A player leaving removes their builder.<br>(6) Time-up → the host `finish()` within grace, once, with valid standings (every id once).<br>(7) Server mode (a host with no player) runs the round and finishes.<br>(8) `end` stops input and sound.<br>(9) `AIHub.active` false → the normal title |

### 11.3 Browser suites (`--browser`; Playwright, pinned in `engine/package.json`)
- **`hub-check.mjs`**
  - **Setup:** `tools/hub-serve.mjs` serves a temp copy folder holding the built HTML plus `harness.html`, `bridge.js` and `round.js` on `127.0.0.1:<OS port>`. It confirms the game page title.
  - **Runs** (open `harness.html?game=<file>&...`):
    - `&players=2&auto=1`
    - `&players=4&latency=150&jitter=50&loss=5&auto=1`
    - the same as above with `&scenario=host-leave`
    - `&players=2&scenario=server`
  - **Pass:** wait for `document.body.dataset.complete === 'true'`, then require `window.__hubCheck.pass === true`. On failure, print the harness checklist's failing items.
  - **Standalone:** open the game alone (outside a session) and require that it reaches the title.
  - **Teardown:** kill only the server PID it started.
- **`shots.mjs`** writes screenshots to `check-output/` at 1920×1080 (and 1280×720) for human review:
  - title, New Game, intro
  - Hollow dark/lit, Glen day, Thimbleton at Lv1/Lv3/Lv4 (dev beats), Crags, Quarry boss, Tweedwood, Coast, Fraying, Spire top
  - night town, siege, Gnarlgrim Tangled
  - Bag, Crafting, Map, Journal, Banner screen, Dev Tools, About
  - Bee card, touch-only notice
  - 4 camera rotations, three-quarter view
  - the block atlas sheet
- Also run `node engine/tools/check.mjs <html>#play` (fails on errors; acts on look notes) and `filmstrip.mjs` for every attack and new move.

### 11.4 Manual passes (short, recorded in DEVLOG)
- **Controller only** (DualSense, or the standard mapping): the whole of Act 1, menus, dev sliders.
- **Keyboard only.** Mouse plus keyboard. The prompts switch instantly with the last input.
- **Glyph setting:** Xbox.
- **TV distance:** all text readable from 3 m on a 1080p screen, or approximate it by viewing a 1080p screenshot at 33% scale.
- **Feel:** jump arc, swing hit-stop, break and place rhythm (one block per ~0.4 s feels snappy), camera turn.

### 11.5 Asset checks
- `node engine/tools/asset-sheet.mjs src/03-data-objects.js#bench` (each object) shows every view and facing next to the hero. Fix the lint notes.
- An atlas dump writes every block material and face to `check-output/atlas.png`.

---

## 12. Definition of done (check every line before handing off)
- [ ] `./DragonQuiltBuilders-DragonQuestBuilders-claude-opus-5-5-max-20261103-174740.html` is one file, works from `file://`, has no external requests, and its title shows **Dragon Quilt Builders**.
- [ ] Everything in §6 and §7 is implemented; there are **no TODOs, placeholders or stubbed features** (`grep -rn "TODO\|FIXME\|placeholder" src/` is empty).
- [ ] Chapter One is playable start to finish (M1–M14), S1–S3 work, and free play continues after the credits.
- [ ] All systems are present:
  - voxel building with rotation and cutaway; tools and tiers; crafting and Notions; rooms; Banner, levels and Patterns with helpers
  - residents with schedules, needs, jobs and requests; Cheer bubbles; day/night; Belly
  - combat with 6 monster types plus 2 bosses; the siege; ballistas and traps; portals; Map and Journal; saves
- [ ] Dev mode from the pause menu: cheats, warp, spawn, story beats, debug overlays, **live sliders with Reset to defaults**, stamp export.
- [ ] Attract mode starts after 10 s idle on the title or menus, loops, cheats freely, and any input exits.
- [ ] AI Hub: tags, unmodified `session.js` first in `<head>`, shared-world Bee round, own card, ready without a key press, standings and finish, leave, time-up, end, server mode. **The harness passes all 4 scenarios.** Outside a session the game is unaffected.
- [ ] Controller-first 10-foot UI. PlayStation glyphs by default with a Settings option for Xbox. Keyboard and mouse are native (WASD, Space, Shift, mouse targeting, wheel hotbar, Q/E camera, F talk, Tab bag). Prompts follow the last input device. Mouse hover moves the focus in every menu.
- [ ] Touch-only devices: no touch controls, the "Controller or keyboard required" notice, the settings button, and the attract mode runs.
- [ ] Audio is all code: original music with the leitmotif, sfx, Animalese voices per character, and a Voices volume setting.
- [ ] Tone is Dragon Quest-like throughout (punny, warm, earnest, silent hero). No names, characters, art, music, places or iconic lines from the source.
- [ ] `node tests/run.mjs` and `node tests/run.mjs --browser` pass (only failures are printed, then one count line).
- [ ] `exit-interview.json` exists beside the HTML, parses as JSON, and has exactly the TASK.md shape with every value filled ("unknown" where unconfirmed; `plan`: "PLAN.md").
- [ ] The About/Credits screen shows Source Information, Testing Feedback, Engine Feedback and Prompt Feedback (from the same data as the exit interview), the engine changes and licences.
- [ ] The final chat reply includes Source Information, Testing Feedback, Engine Feedback and Prompt Feedback.
