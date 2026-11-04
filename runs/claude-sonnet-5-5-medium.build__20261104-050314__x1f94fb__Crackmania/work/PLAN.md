# CRACKMANIA — build plan

**Title: CRACKMANIA** ("crack the clock"). Picked as TASK.md asks: 50 riffs on "TrackMania" were brainstormed, then
one was drawn with an OS-entropy RNG (Python `secrets.randbelow(50)` over the list → index 8 → *Crackmania*).
The name works three ways and the game leans on all of them: a *crack* driver (an expert), *cracking* a track's
clock, and the puzzle mode's *cracks* (gaps in a track you fill with blocks). The finale track is called "The Big
Crack" (a jump over a canyon).

This plan is for the developers (possibly other AI models) who will build the game from TASK.md and this file alone.
Read sections 0–3 whole before writing code; sections 4–12 and the appendices are the reference you build each
system from.

---

## 0. Deliverables, names and ground rules

| What | Exact name / place |
| --- | --- |
| Game title (title screen, About, hub tags) | `CRACKMANIA` (display), `Crackmania` (file-safe) |
| SOURCE token in file names | `TrackMania2003` |
| Dev folder (all source, tools, tests) | `Crackmania-TrackMania2003-claude-opus-5-5-max-20261103-174810/` in the folder that holds TASK.md and PLAN.md |
| The single-file game | `Crackmania-TrackMania2003-claude-opus-5-5-max-20261103-174810.html` in that same root folder (beside TASK.md) |
| Exit interview | `exit-interview.json` in the root, beside the HTML (shape in TASK.md; must parse as JSON) |
| Engine source | `https://github.com/michaelcrosato/my-3d2dge`, commit `4390a98` (v0.85.2): `dist/handoff/` (2D engine, docs, tools) **plus** `engine/my-3d2dge-3d.js` and `vendor/` (the 3D layer; see §2.2) |
| AI Hub client | `https://github.com/michaelcrosato/ai-hub`, `lib/hub/` at commit `f8835e4` (protocol 1, client 1.4.0) |

Ground rules from TASK.md that shape every decision:
- Everything is drawn and synthesized by code (no image or sound files). Voices are Animalese-style gibberish.
- No TODOs, placeholders or stubs in the shipped game. Every feature listed here ships working.
- Other agents share this machine: work only inside the dev folder (plus a scratch dir of your own), never kill
  processes you did not start, bind servers to `127.0.0.1` on an OS-picked port (`python3 -m http.server 0 --bind
  127.0.0.1`), and stop them by PID. During planning `/tmp` (a 9.8 GB tmpfs) was **full**; put clones, npm caches and
  build output on the main disk (e.g. `npm_config_cache=<devfolder>/.npm-cache`, `TMPDIR=<devfolder>/.tmp`).
- One test command prints only failures and a one-line count (§9). Screenshots only for what a script can't check.
- Final chat reply and the in-game About/Credits screen carry Source Information, Testing Feedback, Engine Feedback and
  Prompt Feedback (TASK.md lists the fields; "Plan" = `PLAN.md`). Write "unknown" for anything you can't confirm.

---

## 1. The game in one page

**Pitch.** An original arcade time-attack stunt racer in the spirit of TrackMania (Nadeo, PC, 21 Nov 2003). Short
tracks built from blocks (loops, kickers, boost pads, banked bends), a clock you race against, a ghost of your best
run, medals, coppers to spend on track pieces, and an editor where every track — yours or ours — is just blocks on a
grid. Three environments with their own car and handling. Original names, art, music, tracks and characters.

**What the source is (research done for this plan).** TrackMania (2003): developer Nadeo; publishers Focus Home
Interactive (FR), Digital Jesters (UK), Enlight (US, June 2004); director Florent Castelnérac; music Henri-Pierre
Pellegrin. Solo modes **Race, Puzzle and Survival** (Survival — three computer ghost cars, finish last and you're out,
first or second ranks you up — arrived with the Power Up! update), each with tracks in every environment; three
environments **Desert, Rally (countryside) and Snow (alpine)**, each with its own car (muscle "speed" cars, rally
super-minis, alpine 4x4s); a **track editor** whose grid-snapped blocks ("bricks": roads, checkpoints, long bends,
loop-the-loops, jumps) are **bought with coppers** earned from bronze/silver/gold medals; a **car painter**;
multiplayer by **hot seat, LAN and Internet**; tracks and skins shared online. Metacritic 74. TrackMania's DNA, which
this game must capture: *the clock is the enemy*, *instant respawn/restart*, *ghosts and checkpoint splits*, *stunts
are the route*, *tracks are toys anyone builds*, *terse, playful presentation*.

**Genre:** arcade racing (time attack) + track-building puzzle. **Perspective:** third-person chase camera (far
chase, close chase, hood cam) in races; an orbiting three-quarter overhead camera over a 3D grid in the editor and
puzzles; trackside TV cameras in replays.

**Look:** the engine's native style — low-resolution 3D (the game's 320x240-class buffer, `expand: true`), toon
shading with ink outlines on code-drawn parts, crisp nearest-filtered pixel textures baked by code, PS1/N64-era
racer. Bright TrackMania colours: red/white curbs, chunky gates with flip-digit time boards, chevron boost pads.

**Modes (all ship):**
1. **Race** — 15 tracks (5 per environment), medals Bronze/Silver/Gold/Author, coppers, unlocks.
2. **Puzzle** — 6 puzzles: start, checkpoints and finish are placed; you get a limited block inventory; build a route,
   then drive it. Faster routes earn better medals.
3. **Survival** — per environment, a 5-round gauntlet against three ghost rivals (the "Ghost Guild"); last place is
   out, 1st/2nd rank you up.
4. **Build** — the track editor (place/rotate/raise/remove blocks, coppers cost, undo/redo, test drive, validate by
   driving, 6 save slots, share codes).
5. **Hot Seat** — 2–8 players take turns on one controller/keyboard; standings over a cup of tracks.
6. **Split Screen** — 2–4 local players at once (pads or keyboard halves); cars are ghosts to each other.
7. **Online** — AI Hub sessions in the hub's `ghost` mode: everyone time-attacks the same track for 3 minutes and sees
   the others as ghost cars (TrackMania's own online model).
8. **Replays** — watch any run with chase/TV/orbit cameras, scrub, save to 10 slots.
9. **Garage** — paint shop for the three cars (colours, 8 patterns, number, rims).
Plus: title + attract mode, Dev Mode (pause menu), Settings, About/Credits, touch-only gate.

**Characters (original):** **Coco Asphalte**, a cheerful track architect in a hard hat (host, tutorials, story);
**Monsieur Drapeau**, the flag man at every start gate; the **Ghost Guild** rivals — **Tex Mirage** (cocky),
**Mlle Gravillon** (precise), **Bobo Yeti** (chaotic). Cars: **Coyote** (Dustbowl muscle car), **Pebble** (Hedgerow
rally hatch), **Moose** (Frostpeak 4x4). Environments: **Dustbowl** (desert: hot asphalt, big air), **Hedgerow**
(countryside: tight lanes, loose gravel), **Frostpeak** (alpine: thin air, thin ice).

---

## 2. Technology and architecture

### 2.1 Stack (decided)

| Layer | Choice |
| --- | --- |
| Game shell | my-3D2dge **2D engine** v0.85.2 (`dist/handoff/my-3d2dge.js`, classic script, every module): fixed 1/120 s steps, scenes, input with rebinding/glyphs, pause menu, settings, boot screen, audio synth, particles, rigs (`E.Humanoid`), pixel font/UI, `E.store`, `game.advance`/`game.debug` for headless tests |
| 3D | my-3D2dge **3D engine** (`engine/my-3d2dge-3d.js` from the repo, ES module, same commit): `E.World3D` (terrain backdrop, sky, fog, sun + shadows, the **pen** for code-drawn parts, particles in 3D, cameras incl. split screen, filters, `world.shape` props, rig actors) on **three.js r182** (WebGPURenderer, falls back to WebGL 2) |
| Physics queries | **Rapier 0.19.3** (`@dimforge/rapier3d-simd-compat`, WASM embedded) — our **own** `RAPIER.World` holding the track's fixed colliders; used only for ray casts and shape casts. The car is **not** a Rapier body (§4.4) |
| Bundling | **esbuild** (dev dependency) bundles three + Rapier + the 3D engine + game modules into one inline `<script type="module">`; the 2D engine is inlined as a classic `<script>` before it; AI Hub `session.js` is the first script in `<head>` |
| Tools | Node 24 (present), Playwright 1.63.0 (as the handoff pins) + Chromium for browser checks, Python 3 for the hub harness server |

Why the 3D layer: TrackMania needs loops, jumps, wall-hugging bends and a chase camera; the 2D engine's views (mode 7,
iso) can't do loops. The handoff README says the 3D engine isn't in the package but is in the repository and the site;
TASK.md lets you add any system and change the engine. The 3D engine runs **on top of** the 2D engine (it's how the
engine's own 3D kits are built), so input, menus, settings, audio and tests stay the engine's.

Why not the engine's `world.vehicle`: it is a rolling ball steered on the ground plane (decision D62 in the repo's
`docs/DECISIONS.md`) — it cannot drive a loop. Why not Rapier's ray-cast vehicle controller: D62 measured it landing
on its roof after a hump, and a sprung rigid body spike for this plan bounced off a 12 m loop at 150 km/h. The car is a
**kinematic surface-following arcade model** that was prototyped and validated headless for this plan (§4.4,
Appendix A): with the Coyote's tuning it holds a 12 m loop on full throttle from ~47 km/h entry (coasting needs ~107),
drops off the top below that, and clears a two-cell gap from a 15° kicker at ≥ ~150 km/h, landing upright.

### 2.2 Getting the engine files

```sh
git clone https://github.com/michaelcrosato/my-3d2dge.git <scratch>/my-3d2dge && git -C <scratch>/my-3d2dge checkout 4390a98
# into the dev folder:
engine/my-3d2dge.js                 <- dist/handoff/my-3d2dge.js          (2D engine, all modules, classic script)
engine/my-3d2dge-3d.js              <- engine/my-3d2dge-3d.js             (3D engine, ES module; header = its manual)
engine/vendor/three-0.182.0/        <- vendor/three-0.182.0/              (three.core/webgpu/tsl .min.js)
engine/vendor/rapier3d-simd-compat-0.19.3/rapier.js <- vendor/...         (ESM, wasm embedded as base64)
engine/docs/                        <- dist/handoff/{API.md,API-INDEX.md,AI_GUIDE.md,docs/ASSETS.md}, docs/ENGINE-3D.md
engine/tools/                       <- dist/handoff/tools/{check.mjs,filmstrip.mjs,asset-find.mjs,asset-sheet.mjs,asset-set.mjs,asset-lib.mjs}
engine/assets/                      <- dist/handoff/src/assets/sets/<set>.js (only the sets you load; see §7.4)
hub/session.js                      <- ai-hub lib/hub/session.js (paste verbatim, never edit)
tools/hub/{harness.html,bridge.js,round.js} <- ai-hub lib/hub/ (test harness only; not shipped)
```
Read, in this order: the 3D engine's header (lines 1–260 of `my-3d2dge-3d.js`), `API.md` (whole), `docs/ENGINE-3D.md`,
`docs/ASSETS.md`, then grep `API-INDEX.md` as needed. The 3D starter slices in the repo (`src/starter3d/00-shell.js`,
`50-racing.js`) show the idioms (`W3 = E.World3D`, boot steps, `world.pen`, split screen).

### 2.3 Units, axes and conventions (everyone must use these)

- **Engine units:** 16 units = 1 metre. **x east, y south, z up.** Angles in radians from +x toward +y (0 = east,
  π/2 = south). All simulation state is in engine units; tuning tables are in metres, m/s, km/h and degrees and are
  converted once when loaded (`U = 16`).
- **Frames:** a car/block frame is `(f, r, u)` = forward, right, up, unit vectors in engine axes, with
  **`u = f × r`** and **`r = u × f`** (x east, y south, z up is left-handed as drawn; the cross-product formulas are the
  usual ones). Facing east, right is +y (south).
- **three.js** works in metres with y up: `E.World3D.toThree(x, y, z) = (x/16, z/16, y/16)`. That swap is a
  reflection, so **a triangle wound for Rapier (its normal `(b-a)×(c-a)` along the surface's up, engine axes) must be
  wound the other way (a, c, b) for three.js**, or three culls the road from above (the engine's own note on
  `world.track`). A test checks both (§9).
- **Track grid:** cell = **32 m × 32 m** (512 units), level = **8 m** (128 units). Grid **32 × 32 cells × 16
  levels**; cell (cx, cy) spans x ∈ [32·cx, 32·cx+32] m, y likewise; level L sits at z = 8·L m. Headings N/E/S/W;
  N = −y.
- **Time:** the simulation runs in the engine's fixed steps (1/120 s). Race times are **integer step counts**;
  display `M:SS.cc` (hundredths, rounded down); ties broken by steps. Store milliseconds as `steps * 1000 / 120`.
- **Randomness:** gameplay never calls `Math.random`; use `E.rng(seed)` streams (deco scatter, rival variation,
  bot jitter). Cosmetic FX may use the engine's particle randomness. (In hub sessions `Math.random` is seeded anyway.)

### 2.4 Engine changes (make them first, list them in `engine/CHANGES.md`, mention them in Engine Feedback)

| # | File | Change | Why |
| --- | --- | --- | --- |
| E1 | 3D, `class Pen` | add `frame(x, y, z, f, r, u, k = 1)`: sets `ox/oy/oz`, `k`, `ca=1, sa=0` and `this.M = [f[0], r[0], u[0], f[1], r[1], u[1], f[2], r[2], u[2]]` (same layout `frameOf()` returns) | draw a car in any orientation (upside down in a loop) without Euler singularities |
| E2 | 3D, `Camera3D.place()` and the `'fixed'` pose | if the pose has `up: [x, y, z]` (engine axes) use `cam.up.set(up[0], up[2], up[1])` before `lookAt`, and skip `rotateZ(roll)`; make sure the fixed pose object passes `up` through | a chase camera that follows the car round a loop |
| E3 | 3D, `makeBatches()` + `Pen` + the world's draw | a second set of tube/ball/box/cone batches with a transparent toon material (`transparent: true, opacity: .42, depthWrite: false`, no outline shell); `pen.ghost = true` routes parts into them; begin/end them with the others | translucent ghost cars (TrackMania's ghosts). Materials made with the world, never mid-game |
| E4 | 2D, `Input.tick` | keep `this.padValues = p.buttons.map(b => b.value ?? (b.pressed ? 1 : 0))`; add `analog(action)`: max over the action's codes of `padValues[n]` for `PadN`, and `1` for any held key/mouse code | analog R2/L2 throttle and brake |
| E5 | 2D, input + settings | `this.glyphs = 'playstation'` by default; the `glyphs` setting's options become `[['playstation','PlayStation'], ['xbox','Xbox']]`, default `'playstation'` | TASK.md: PlayStation glyphs, Xbox as the option |
| E6 | 3D, `World3D` statics | export `World3D.TOON_BANDS = TOON_BANDS` | track/prop materials in the same toon bands as the pen's parts |

Do **not** fork more of the engine than needed; when an engine API does what a section says, use it.

### 2.5 Folder layout and modules

```
Crackmania-TrackMania2003-claude-opus-5-5-max-20261103-174810/
  package.json          { "type": "module", devDependencies: { "esbuild": "^0.25", "playwright": "1.63.0" } }
  engine/               (2.2) + CHANGES.md
  hub/session.js
  src/
    entry.js            browser entry: import '../engine/my-3d2dge-3d.js'; import { boot } from './main.js'; boot()
    main.js             createGame({ headless }) -> { game, api }: E.Game, input maps, settings, scenes, boot steps,
                        deep links (#race/D3 ...), session detection, game.debug
    config.js           TUNING (defaults, metres) + CFG (live, engine units) + reset(); every dev slider reads CFG
    lib/v3.js           vec3/quat/frame helpers in engine axes (cross, rotateAbout, slerp, orthonormalize, quatFromFrame)
    track/blocks.js     the block catalogue (§4.1): footprint, ports, path(s) -> frame, surfaces, gates, costs, env
    track/geometry.js   ribbon + cross-section mesher -> { render: {pos, uv, idx}[] per material, collide: {pos, idx, surface} }
    track/track.js      Track: occupancy (cx,cy,L), place/remove/rotate, port links, jump links, route extraction,
                        validation state, serialize (JSON) / share code (base64url) / deserialize
    track/turtle.js     turtle program -> placements (content format, §6.1)
    track/physics.js    TrackPhysics: own RAPIER.World, colliders per block (handle -> {surface, blockId}), base
                        plate + chasms, boundary walls, prop colliders; ray(), shapeCast(), groundBelow()
    track/view.js       TrackView: three meshes per block (pre-made materials per env), base plate, supports,
                        rails; gates/boards/boost chevrons drawn with the pen each frame (animated)
    track/deco.js       seeded scenery scatter + trackside dressing (turn-warning chevrons, tyre stacks, stands)
    env/envs.js         DUSTBOWL / HEDGEROW / FROSTPEAK: terrain height+colour, sky, fog, sun, ambient, palettes,
                        textures, cross-section style, support style, props, car, music
    env/textures.js     pixel-art texture bakers (asphalt, lines, curbs, dirt, ice, snow, sand, grass, rock strata)
    car/sim.js          CarSim (§4.4): the validated model + steering, grip, drift, surfaces, boost, walls, landing,
                        flop, lane assist; deterministic; no rendering
    car/draw.js         pen models of Coyote/Pebble/Moose, paint patterns, wheels, suspension, lights, effects
    car/camera.js       chase/close/hood/TV/orbit/free cameras (loop-safe up vector, FOV by speed)
    car/sound.js        engine/tyre/wind/scrape synth (WebAudio via game.audio.ctx; no-op headless)
    race/run.js         Run: countdown, step timer, gates (CP any order, finish), respawn/restart, splits, events
    race/ghost.js       record 30 Hz, int16 delta + smallest-three quaternion, base64; playback with interpolation
    race/bot.js         autopilot: route sampling, racing line, speed profile, pure-pursuit control, skill, cheats
    race/medals.js      thresholds from author time; baked table import
    modes/campaign.js   env/track select, medals, rewards, unlocks, story beats
    modes/puzzle.js     puzzle defs: fixed blocks, inventory, build zone, no-build cells; reward rules
    modes/survival.js   gauntlets, rival generation, ranks
    modes/hotseat.js    players, turns, attempts, cup standings
    modes/split.js      2–4 local players, viewports, join flow
    modes/online.js     AI Hub session flow (ghost mode), own card, ghost traffic, reporting
    modes/replay.js     replay viewer
    modes/garage.js     paint shop
    editor/editor.js    editor scene (also hosts puzzles): cursor, palette, costs, undo/redo, test, validate, slots, codes
    editor/palette.js   palette categories, block icons (baked top-down thumbnails)
    ui/kit.js           10-foot UI kit: focus grid (spatial nav, hover focus, click), tiles, buttons, sliders,
                        letter wheel, toasts, panels, prompt bar
    ui/glyphs.js        PlayStation / Xbox / keyboard / mouse glyph sprites; prompt(action) by last device
    ui/hud.js           race HUD (single and per viewport)
    ui/screens.js       title, main menu, env/track select, results, multiplayer, replays list, about, touch gate
    ui/dev.js           Dev Mode overlay (tools, tuning sliders, info)
    story/story.js      characters, beats, first-time tips, dialog runner (E.Dialog + babble)
    audio/music.js      songs (engine notation) and stings
    audio/babble.js     gibberish voice synth
    attract/attract.js  idle detection + attract sequence
    data/tracks.js      15 race tracks (turtle programs + metadata)
    data/puzzles.js     6 puzzles
    data/medals.json    baked author times (tools/bake.mjs writes it)
    data/text.js        every string the player reads (tone guide §8.3)
    save/profile.js     profile in E.store (versioned, migrations), records, ghosts, slots, settings glue
  tools/
    build.mjs           esbuild + inline -> ../Crackmania-TrackMania2003-claude-opus-5-5-max-20261103-174810.html
    test.mjs            THE one command (§9): node tools/test.mjs [suite ...] [--browser] [--hub]
    node-env.mjs        headless loader (§9.1: import hooks + document stub + engine load)
    tests/*.mjs         suites
    bake.mjs            runs the bot on every track/puzzle -> src/data/medals.json
    browser.mjs         Playwright checks of the built HTML (file://)
    hub.mjs             serves 127.0.0.1:0 and runs the AI Hub harness
    hub/                harness.html, bridge.js, round.js
```

All game modules are ES modules that read the engine from `globalThis.My3D2dge` (`const E = globalThis.My3D2dge`).
`main.js` must not touch `document`, `window` or `location` when `headless` (guard with `typeof`), so tests can
import it.

### 2.6 Runtime structure

```
boot (E.Game boot steps, engine boot screen with our messages)
  1 'Starting the engines'      await E.World3D.init(game)
  2 'Reading your profile'      profile.load()
  3 'Pouring asphalt'           envs: for each of 3 environments -> new E.World3D(game, { terrain, sky, fog, sun,
                                ambient, camera: { mode: 'fixed', far }, overlay: { fov: 80 } (hood cam), onDraw }); materials,
                                textures; TrackView;
                                TrackPhysics (own RAPIER.World); pen batches incl. ghost (E3)
  4 'Building the garage'       garage world (a small level-rows workshop, §5.9)
  5 'Compiling tracks'          turtle programs -> Track objects; puzzles; checks in dev builds
  6 'Teaching cacti to wave'    title showcase: load D3 into Dustbowl, start the demo bot (cheat mode)
  7 'Building the shaders'      world.prepare() for every world
scenes (E.Game scenes; pausable where noted)
  title, menu (front-end pages: main, env select, track select, puzzle select, survival select, multiplayer,
               hot seat setup, split join, replays list, garage entry, options shortcut, about),
  attract, race (pausable: single race, puzzle validation run, survival round, hot seat turn, split race, online
               round, editor test drive), results, editor (pausable; also puzzles), replay (pausable), garage,
  story (dialog over the current backdrop), credits, touchgate
```
One `World3D` per environment lives for the whole session (switching environments = switching which world draws and
steps; worlds that aren't shown don't step). Loading a track rebuilds only the track's meshes and colliders (fast;
materials are pre-made — never create a material after boot, it stalls a frame to build its shader).

The **track ground**: the World3D `terrain` provides the scenery outside the grid (dunes and mesas, farmland hills,
snowy mountains) and sits at **−60 m under the grid**; our own **base plate** mesh covers the grid at z = 0 with holes
for "chasm" cells, so a chasm shows a deep canyon whose walls are the terrain's rock strata ("the crack"). Set
`game.particles.ground` to our ground query after each world switch so dust and sparks land on the plate, not 60 m
below (check whether World3D re-assigns it; if it does, override after it).

### 2.7 Build to a single file

`tools/build.mjs`:
1. esbuild `entryPoints: ['src/entry.js'], bundle: true, format: 'esm', minify: true, legalComments: 'inline'`, with
   a tiny plugin that resolves `three`, `three/webgpu` → `engine/vendor/three-0.182.0/three.webgpu.min.js`,
   `three/tsl` → `.../three.tsl.min.js`, `@dimforge/rapier3d-simd-compat` → `engine/vendor/rapier3d-simd-compat-0.19.3/rapier.js`
   (use a plugin `onResolve`; esbuild's `alias` option does not reliably take sub-paths like `three/webgpu`).
2. Write the HTML: `<!doctype html><html lang="en"><head><meta charset="utf-8">`, then **`<script>` + hub/session.js
   verbatim**, then the viewport meta, `<title>CRACKMANIA</title>`, the hub metas (§5.7), a `<style>` (stage + two
   canvases as the engine's 3D pages use: `#view` under `#screen`, `image-rendering: pixelated`, black background),
   `</head><body>`, the engine boot splash markup (`E.bootSplash('CRACKMANIA')` — get the string at build time by
   loading the 2D engine in Node), `<div id="stage"><canvas id="view"></canvas><canvas id="screen"></canvas></div>`,
   `<script>` + the 2D engine `</script>`, `<script type="module">` + the bundle `</script>`.
3. Escape `</script` inside inlined code as `<\/script`. Expect ~5 MB. No network fetches at run time.
4. The file must run from `file://` (inline module scripts and base64 WASM need no server) and from the hub's server.
**Validated while planning:** exactly this pipeline (esbuild 0.25.12 with the resolve plugin, the 2D engine inline as
a classic script, one inline module with three + Rapier + the 3D engine + a test scene) produced a **4.47 MB** file
that booted from `file://` in Playwright 1.63's headless Chromium with **zero errors**: three fell back to **WebGL 2**
(no WebGPU adapter headless), the terrain, sky, a pen-drawn outlined car with its shadow and the pixel HUD all drew.
Expected console warnings: Rapier's "deprecated parameters for the initialization function", "No available
adapters", "WebGPURenderer: WebGPU is not available" — not errors. **Fallback** if inlining ever breaks: keep the
bundle for the 3D engine + game only and add an import map to jsDelivr
(`https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.min.js`, `.../three.tsl.min.js`,
`https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-simd-compat@0.19.3/rapier.mjs`) — TASK.md allows CDN deps.

---

## 3. Player experience and controls

### 3.1 The core loop (must feel instant)

Track select → **flyover** (2.5 s camera sweep along the route with the track name; any button skips) → **3-2-1-GO**
(start-gate lights, Monsieur Drapeau drops the flag, beeps, gibberish count) → drive → each checkpoint shows the split
and the delta to your best (blue `-0.42` ahead, red `+0.31` behind) → **FINISH** (slow-mo 0.6 s, camera swings
round) → results (time, delta, medal drop-in, coppers count-up) → **Retry is one button and takes under half a
second.** In play: **Respawn** puts you at the last checkpoint, standing, the clock still running (TrackMania 2003's
classic respawn); **Restart** goes back to the start with a short 1-second "READY... GO". Both work at any moment,
including mid-air. The ghost of your best run (translucent) races with you; Coco's ghost (the author time, generated
by the bot) can be switched on in Settings.

### 3.2 Input maps (`game.input` presets; prompts always from `game.input.label(action)` + our glyph sprites)

Race (`RACE_INPUT`; analog via E4 `input.analog`):

| Action | DualSense (standard mapping) | Keyboard | Notes |
| --- | --- | --- | --- |
| steer | left stick X (analog), d-pad ←/→ | ←/→, A/D | `input.move()[0]`; keyboard steering ramps (see §4.4 `steerRamp`) |
| gas | R2 (Pad7, analog), ✕ (Pad0) | ↑, W | analog value 0..1 |
| brake / reverse | L2 (Pad6, analog), □ (Pad2) | ↓, S | brake + steer at speed = drift (§4.4) |
| respawn (last CP) | ○ (Pad1) | Enter, Backspace | TrackMania habit |
| restart (from start) | △ (Pad3) | Delete, R | |
| camera (far → close → hood) | R1 (Pad5) | C (also 1/2/3 pick one) | |
| ghost on/off | L1 (Pad4) | G | |
| horn (just for fun: two-tone toot + gibberish "beep beep") | R3 (Pad11) | H | |
| pause | Options (Pad9) | Esc, P | engine standard |

Mouse in races: none (racing doesn't aim); the cursor hides while driving and reappears on menus.

Menus (engine `up/down/left/right/confirm/cancel` + ours): d-pad/left stick move focus; ✕/Enter/Space choose;
○/Esc/Backspace back; L1/R1 or Q/E switch tabs; △/Y "secondary" (e.g. ghost toggle on track select, reset on a
slider); **mouse hover moves the focus, click chooses, wheel scrolls lists**. Repeat on hold (`input.repeat`).

Editor (`EDIT_INPUT`, §5.4) and replay (`REPLAY_INPUT`, §5.8) have their own tables in their sections.

Rumble (`input.rumble`): wall hits (∝ impact), hard landings, boost pads (short), checkpoint (tiny), finish.

**AI Hub reserved:** in a session, ignore Options (pause) while Create (Pad8) is held.

### 3.3 10-foot UI rules (apply everywhere)

- Buffer is `res: 'ps1', expand: true` (~427×240 on 16:9). Primary text: pixel font at **scale 2** (14 px of 240 ≈
  6% of screen height). Secondary text scale 1, never the `tiny` font for anything the player must read. Big numbers
  (timer, speed) use a custom chunky digit sprite at 2–3× (§7.6).
- Tiles at least 96×64 buffer px, 8 px gaps, 12 px safe margins (and keep clear of the engine's top-right corner
  buttons: `game.cornerArea()`).
- One focused element always visible (accent border + 1.08× scale tween + a soft glow); spatial navigation; hover =
  focus; click = choose. Every screen has a back path (○/Esc/right-click).
- A **prompt bar** along the bottom of every screen: `[glyph] Select  [glyph] Back  [glyph] ...` — glyphs follow
  `input.lastDevice` (PlayStation shapes by default; Xbox letters if the Settings "Button symbols" is Xbox; keycaps
  for keyboard; mouse icons when the mouse was last used).
- No dense data screens: at most 6 numbers on any results/records panel; lists show 5–7 rows at scale 2 with
  scrolling.
- Colour is never the only signal (deltas carry `+`/`−`, medals carry letters B/S/G/A on their icons).

---

## 4. Core systems

### 4.1 Blocks (the catalogue)

Every track — campaign, puzzle, editor — is a list of placements `{ type, cx, cy, L, rot }` (rot = heading of the
block's local +x: 0 E, 1 S, 2 W, 3 N). In its **local frame** a block's entry is the centre of the west face of local
cell (0,0) at level 0, heading +x; local y is to the right (south when rot = 0). Footprint offsets below are
`(along, right, levels)`.

| Type | Token | Footprint (along × right × levels) | Exit (local cell, heading) | Geometry | Surface | Cost (¢) | Envs |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Start | `ST` | 1×1×1 | (1,0) → +x | straight; spawn at s = 8 m; start arch at s = 10 m | road | 0 (max 1) | all |
| Finish | `FN` | 1×1×1 | (1,0) → +x | straight; finish arch at s = 16 m | road | 0 (≥1) | all |
| Checkpoint | `CP` | 1×1×1 | (1,0) | straight; gate at s = 16 m | road | 15 | all |
| Straight | `S` | 1×1×1 | (1,0) | straight | road | 5 | all |
| Boost | `BO` | 1×1×1 | (1,0) | straight + boost pad (s 10–22 m) | road+boost | 40 | all |
| Turn, tight | `L1`/`R1` | 1×1×1 | side cell | quarter circle r = 16 m | road | 8 | all |
| Turn, wide | `L2`/`R2` | 2×2×1 | (1, ±2) heading ±y | quarter circle r = 48 m | road | 15 | all |
| Turn, sweeping | `L3`/`R3` | 3×3×1 | (2, ±3) heading ±y | quarter circle r = 80 m | road | 25 | all |
| Banked turn | `BL2`/`BR2` | 2×2×2 | as L2/R2 | r = 48 m, bank 0→28°→0 (sin ramp) | road | 30 | Dustbowl, Frostpeak |
| Hill up/down (steep) | `U1`/`D1` | 1×1×2 | (1,0), level ±1 | smoothstep rise 8 m over 32 m (max grade 37.5%: launches you at speed) | road | 10 | all |
| Hill up/down | `U2`/`D2` | 2×1×2 | (2,0), level ±1 | smoothstep rise 8 m over 64 m (max 18.75%) | road | 15 | all |
| Kicker | `KI` | 1×1×2 | none (air) | concave arc to a **15° lip, 4.2 m high** at s = 32 m (arc radius 123.6 m) | road | 30 | all |
| Landing | `LA` | 2×1×2 | (2,0) | air entry; smoothstep descent from +3 m to 0 over 64 m | road | 20 | all |
| Gap | `GAPn` | n×1×2 reserved air | — | nothing (a reserved corridor); the track's **chasm** list (default: its level-0 GAP cells) cuts the base plate | — | 0 | all |
| Loop | `LOOPR`/`LOOPL` | 2×2×4 | (2, ±1) → +x | §4.2: 12 m-radius loop with a one-cell sideways shift; lane assist | road | 120 | all |
| Crossing | `CR` | 1×1×1 | all four faces | flat square deck, 4 ports | road | 20 | all |
| Bumps | `BU` | 1×1×1 | (1,0) | three 0.5 m humps (`z = 0.5·sin²(3πs/32)`) | road | 10 | Hedgerow |
| Dirt straight / turns | `DS`, `DL1`/`DR1`, `DL2`/`DR2` | as S / L1 / L2 | | | dirt | as base | Hedgerow, Dustbowl |
| Ice straight / turns | `IS`, `IL1`/`IR1`, `IL2`/`IR2` | as S / L1 / L2 | | | ice | as base | Frostpeak |
| Deco items | (editor only) | 1×1 | — | scenery props from §7.4 | — | 5–25 | per env |

Turtle rules (§6.1) for where the next block goes follow from the "Exit" column: a turn of size n fills the n×n square
`c0 + a·h + b·s` (a, b ∈ [0, n)) and exits into `c0 + (n−1)·h + n·s` heading `s` (s = the turn side); a loop fills a
2×2×4 box and exits into `c0 + 2h + s` with the heading unchanged; hills occupy their cells on both levels they span;
a kicker reserves the level above its cell; `GAPn` reserves n cells on levels L and L+1.

**Ports and links.** A port = (world cell, face, level, heading). Two blocks connect when a port of one and a port of
the other share the face, level, and opposite headings. Straight-like blocks are symmetric (drivable both ways); turns,
hills, kickers, landings, loops, start and finish are directional for the route (a car can still drive them
backwards physically). **Jump links:** a kicker links to the first landing (or any block whose entry faces it) found
along its heading within 5 cells, on the kicker's level or up to 3 levels lower. The **route** is the chain of links
from Start to Finish (§4.8); the editor shows unlinked ports as red arrows.

### 4.2 Block paths (centrelines and frames)

Each block type exports `path(s) -> { p, t, u }` for s ∈ [0, len] in local metres (p position, t unit tangent, u unit
up), plus `width(s)`, `bank`, and `surface(s)`. Right is `r = u × t`. Formulas (local frame, entry at (0,0,0), +x
forward, +y right):

- **Straight** (n cells): `p = (s, 0, 0)`, `t = (1,0,0)`, `u = (0,0,1)`, `len = 32n`.
- **Turn R, radius ρ = 32n − 16** (n = 1, 2, 3): `φ = s/ρ`, `p = (ρ sin φ, ρ(1 − cos φ), 0)`, `t = (cos φ, sin φ, 0)`,
  `len = πρ/2`. L mirrors y. Check: n = 1 exits at (16, 16) — the centre of the south face of cell (0,0).
- **Banked**: as the turn; bank `β(φ) = 28°·sin(2φ)` (0 at both ports, 28° mid-bend); `u = cos β·ẑ + sin β·r̂_in` where `r̂_in` points to the
  turn centre (right for R). The road edge on the outside rises; the ports stay flat.
- **Hill Un** (rise H = 8 m over len = 32n): `z(s) = H·(3x² − 2x³)`, x = s/len; `t ∝ (1, 0, z'(s))`;
  `u ∝ (−z'(s), 0, 1)`. D mirrors (descends). The U1 crest has radius ≈ 21 m: above ~60 km/h the car takes off (by
  design); U2's crest (≈ 85 m) holds the car up to ~150 km/h.
- **Kicker**: `z(s) = ρk − sqrt(ρk² − s²)`, ρk = 123.6 m, s ∈ [0, 32]: lip angle 15°, lip height 4.2 m.
- **Landing**: `z(s) = 3·(1 − (3x² − 2x³))`, x = s/64.
- **Loop R** (exit one cell right, two cells ahead, same heading). Let `S = 32 + 2π·12 + 32` (≈ 139.4 m) be the
  total centreline length and `y(s) = 32·(3q² − 2q³)` with q = s/S (the sideways shift spread over the whole piece).
  For s ∈ [0, 32]: `p = (s, y, 0)`; for the circle (θ = (s − 32)/12 ∈ [0, 2π]): `p = (32 + 12 sin θ, y, 12(1 − cos θ))`,
  `u0 = (−sin θ, 0, cos θ)`; for s ∈ [32 + 24π, S]: `p = (32 + (s − 32 − 24π), y, 0)` — i.e. the circle's bottom is at
  local x = 32, entering and leaving there, shifted sideways. Tangent = normalized derivative (numerical, h = 0.01 m);
  up = `u0` Gram–Schmidt'ed against t. At the circle's bottom points the entry and exit lanes are ~23 m apart, more
  than a road width, so the ribbons never touch. L mirrors y. The loop block has **lane assist** (§4.4 step 7).
- **Crossing**: a flat 32×32 m deck; its "path" for routing is the straight line through the two opposite ports the
  route uses.

Port frames must match exactly between linked blocks (position within 1 cm, tangent and up within 0.5°): a test checks
every link of every shipped track (§9).

### 4.3 Geometry, materials and colliders

**Ribbon mesher.** Sample each block path every 1 m (curves) or per cell (straights; 4 segments), and at each sample
lay the environment's **cross-section** (a list of (lateral offset, height, uv.u, part) points) along `r` and `u`.
Parts: `road`, `line` (baked into the road texture), `curb`, `rail` (vertical barrier), `bank` (snowbank / hedge /
stone wall), `underside`. Output per part: render triangles (three winding) + UVs (u across in metres/2, v along in
metres/4 so the pixel textures tile at ~8–12 cm per texel) and collision triangles (Rapier winding, engine units) with a
surface tag.

| Env | Road width | Curb | Elevated edge | Ground-level edge | Supports under elevated pieces |
| --- | --- | --- | --- | --- | --- |
| Dustbowl | 14 m asphalt, yellow centre dashes, white edges | 1 m red/white, +0.2 m, drivable | steel guard rail 0.9 m (solid) | sand (base plate) | concrete pillars 1.4 m square every 16 m along both edges |
| Hedgerow | 12 m tarmac (or dirt), white edges | 0.8 m white/green | low stone wall 0.8 m (solid) | grass verge; hedges on some pieces (deco) | earth embankment (45° grassy slopes, drivable, slow) |
| Frostpeak | 12 m packed-snow road (or ice), orange edge poles every 8 m (deco) | 0.8 m blue/white | snowbank 1.2 m (sloped, low grip: pushes you back) | snow | rock-and-snow embankment |

- Turns and banked turns get the elevated-edge barrier on their **outer** edge even at ground level (Dustbowl: tyre
  wall instead of rail).
- Loops get 0.5 m lips both sides. Kickers and landings get curbs only. Gaps get nothing.
- **Base plate** (per track): one mesh of the grid's cells minus the track's chasm cells (§6.3); environment ground
  texture (sand ripples / mown grass stripes / snow with sparkles). Collider: one trimesh, surface = the env's
  off-road surface. **Chasm walls**: for each chasm cell edge that borders plate, a vertical quad down 60 m with the
  terrain rock texture (canyons) or down 2 m to a water surface mesh (streams, ponds; water is a `water` trigger). **Boundary**: a 2 m wall all round the grid (Dustbowl: striped concrete barriers; Hedgerow: dry
  stone wall; Frostpeak: snow fence) with a collider.
- **Materials** (made once per world at boot): `MeshLambertNodeMaterial({ map })` for road/curb/ground/supports with
  the baked textures (`NearestFilter`, repeat, sRGB) — this matches the engine's level look; walls/rails/props in
  `MeshToonNodeMaterial({ map, gradientMap: World3D.TOON_BANDS })` (E6). Track meshes are environment (not added to
  `world._obj`), so the "objects" filter mode leaves them alone. Cast/receive shadows on all track meshes.
- **Gates, boards, boost chevrons, edge poles, flags** are drawn with `world.pen` every frame (animated; a few dozen
  parts each). Gate posts also get box colliders.
- **Colliders** live in `TrackPhysics`'s own `RAPIER.World` (gravity irrelevant, never stepped with bodies; call
  `pw.step()` once after adding/removing colliders so queries see them). One trimesh collider per block (road + curbs
  + lips + underside) tagged with its surface(s) — if a block mixes surfaces (boost pad), split it into one collider
  per surface. Barriers/walls as separate trimesh colliders tagged `wall`. `Map(collider.handle → { blockId, surface })`.
- Rapier 0.19.3 JS facts verified while planning: `castRayAndGetNormal(ray, maxToi, solid, flags, groups,
  excludeCollider, excludeBody)` → `{ timeOfImpact, normal, collider, featureType, featureId }` (camelCase);
  `castShape(pos, rot, vel, shape, targetDistance, maxToi, stopAtPenetration, ...)` → `{ time_of_impact, witness1,
  witness2, normal1, normal2, collider }` (snake_case `time_of_impact`); `projectPoint(p, solid)` → `{ point,
  isInside, collider, ... }`; `intersectionsWithShape(pos, rot, shape, cb)`. Take a wall normal as `normal2` flipped,
  if needed, so it opposes the motion.

### 4.4 The car (validated model — build exactly this, then tune with Dev Mode)

The car is **not** a physics body. Each step (1/120 s) it probes the track with four wheel rays, follows the surface
it's on with velocity-level constraints, and flies ballistically when the surface can't hold it. This is what makes
loops hold when you're fast and drop you when you're slow — TrackMania's feel — and it's deterministic.

State (engine units): `p` (chassis reference point: centre of the wheelbase, `ride` above the road), `v`, frame
`f, u` (r derived), `grounded`, `n` (surface normal last step), `kappa` (filtered curvature), `load` (normal load per
unit mass), `slip` (detach timer),
`air` (seconds airborne), `flop` (crash-recovery timer), `boostT`, `drift`, `surface`, `blockId`, per-wheel `d` (for
drawing suspension), `steerVis`, `slide` (for FX/sound), `impact` (last impact speed).

```text
step(car, ctl{steer -1..1, gas 0..1, brake 0..1}, dt):
  g = (0, 0, -G)                                   G = CFG.gravity (default 1.5 g = 14.7 m/s²)
  1 PROBE: for each wheel mount m_i = p + f·lx_i + r·ly_i (lx = ±wheelbase/2, ly = ±track/2):
       origin = m_i + u·0.5 m; ray along −u, length 0.5 m + ride + reach (reach = 0.9 m)
       hit -> point_i, normal_i, d_i = toi − 0.5 m, surface_i (collider map)
  2 SURFACE: if 4 hits: n = normalize(cross(FR − RL, FL − RR)), flipped to agree with u   (plane through the
       contacts: smooth on a faceted mesh — averaging triangle normals made the car let go at the top of the loop)
     else if ≥ 2 hits: n = normalize(Σ normal_i); else no surface.  d̄ = mean d_i.
  3 CONTACT:
     if n:
       vn = v·n;  pull = g·n  (> 0: gravity pulls the car off this surface)
       if grounded: k0 = −((n − car.n)·v̂) / max(1, |v|·dt);  car.kappa += (k0 − car.kappa)·min(1, dt/0.04)
       else car.kappa = 0
       vt2 = |v|² − vn²;  Aeff = A·min(1, sqrt(vt2) / 15 m/s)   A = CFG.adhesion (0.35 g), fading out at low speed
       load = vt2·car.kappa − pull + Aeff                         (normal load per unit mass; ≥ 0: the surface holds you)
       car.slip = load >= 0 ? 0 : car.slip + dt
       stay = grounded ? (car.slip < 0.06 s && d̄ < ride + reach)
                       : (vn < 0 && d̄ < ride + 0.6·reach)        (landing)
     grounded = n && stay
  4 GROUNDED:
     if just landed: impact = −vn; if u·n < 0.3 -> FLOP (step 8); else v −= n·vn,
                     v *= 1 − clamp((impact − 6 m/s)·0.02, 0, 0.25); landing FX (dust ring, thump, shake ∝ impact)
     u = normalize(u + (n − u)·min(1, 30·dt));  f = normalize(f − u(f·u));  r = u × f
     v −= n(v·n)                                                  (no motion into or off the surface)
     s = v·f
     a = g − n(g·n)                                               (gravity along the surface: slopes matter)
     traction = surface.grip·max(0, load)                         (what the tyres can pass on: μ·N/m)
     gas:   if s < vtop: a += f·min(traction, gas·A0·(1 − (max(s,0)/vtop)^1.6))
     brake: if s > 0.5 m/s: a −= v̂·min(traction, brake·B) (clamp so v doesn't reverse this step)
            else: a −= f·min(traction, brake·Arev) while s > −vrev   (reverse)
     coast: if gas = 0: a −= v̂·1.2 m/s²;  rolling: a −= v̂·surface.roll;  aero: a −= v·cd·|v|
     boost: if boostT > 0: a += f·CFG.boostAccel; boostT −= dt
     steering (bicycle model): δmax = lerp(δlo, δhi, clamp(|s|/vtop, 0, 1)^0.7)
       steerIn: keyboard input ramps to ±1 over 0.12 s and back over 0.08 s; sticks apply directly (deadzone by engine)
       drift = brake > 0.5 && |steer| > 0.5 && s > 60 km/h (TrackMania's brake-drift)
       yawRate = s·tan(steer·δmax)/wheelbase·(drift ? 1.3 : 1)
       f = rotate(f, about u, yawRate·dt); r = u × f
     grip: vlat = v·r; maxDv = grip·surface.grip·(load/G)·(drift ? driftGrip : 1)·dt   (= the tuned grip on flat
           ground; more when pressed into a loop or bank, less over a crest or upside down)
           dv = clamp(−vlat, −maxDv, maxDv); v += r·dv; slide = |vlat| − |dv|
     v += a·dt;  p += v·dt;  p += n·(ride − d̄)·min(1, 25·dt)        (ride-height spring on position)
     car.n = n;  surface = most common surface_i;  boost pad: entering a boost collider while grounded ->
       v += f·CFG.boostDv (cap at 1.3·vtop), boostT = CFG.boostTime (re-arm after leaving that pad)
  5 AIRBORNE:
     v += g·dt;  v −= v·cdAir·|v|·dt;  p += v·dt;  air += dt
     f = rotate(f, about u, ctl.steer·airYaw·dt)                  (air steering)
     f = normalize(f + (v̂ − f)·min(1, 1.5·dt)); r = normalize(u × f); u = normalize(f × r)   (nose follows the arc)
     u = normalize(u + (ẑ − u)·min(1, 0.8·dt)), re-orthonormalize   (gentle roll levelling: no side landings after a
                                                                       mistimed loop)
  6 WALLS (both states, after moving): cast the chassis box (half extents L/2, W/2, 0.45 m; centre p + u·0.35 m;
     rotation from (f, r, u)) from the old to the new position with castShape (targetDistance 0.02 m). Ignore hits
     whose normal nw has |nw·u| > 0.65 (that's ground, step 3 owns it). On a wall hit: move to the contact
     (time_of_impact), vN = v·nw; v −= nw·vN·(1 + e) (e = 0.15); v *= 1 − 0.1·min(1, |vN|/10);
     turn f toward the wall tangent by up to 0.25 rad; slide the remaining motion once more; sparks at witness1;
     scrape sound while touching; |vN| > 15 m/s = crash (shake, rumble, big sparks). If the box starts overlapping
     a wall (intersectionsWithShape), restore the previous p and remove the inward velocity.
  7 LANE ASSIST (only on blocks with assist: loops): find the nearest centreline sample of the current block, lateral
     error e (along r) and its rate; f = rotate(f, about u, clamp(−0.35·e/1m − 0.08·ė/(1 m/s), −1, 1)·1.2·dt).
     CFG.loopAssist (on by default; a Setting and a Dev slider) scales it.
  8 FLOP: when landing on the side/roof (u·n < 0.3) or stuck upside down: 0.6 s animation that rotates the car
     upright onto the surface below, v *= 0.3, inputs ignored. Cartoonish, keeps flow; respawn is still one button.
  9 OUT OF BOUNDS: p.z < −25 m (fell into a chasm or off the world) -> auto-respawn after a 0.4 s fade.
```

Prototype results (headless, Rapier 0.19.3 trimesh ribbons, Appendix A's code exactly as printed: Coyote tuning,
G = 1.5 g, adhesion 0.35 g, ride 0.55 m, reach 0.9 m): **12 m loop on full throttle** — 40 km/h entry drops off the
top, 47 km/h holds (46 km/h over the top), 59–102 km/h hold; **coasting** — 101 km/h drops off, 107 km/h holds;
**15° kicker, 64 m gap, landing pad from +3 m** — 135 km/h at the lip falls into the gap, 161 / 181 / 194 km/h land
upright 9 / 29 / 45 m into the pad after 1.65–2.07 s of air. Two lessons from the spike: averaging triangle normals
instead of the four-point plane made the car let go on every flat facet of the loop (keep the plane fit); without
traction limits the engine pushed the car up the loop from any speed (keep `traction`). In a full-course run with a
sideways-shifted loop (as the loop block has), the car stayed on only with lane assist — keep it on loop blocks.

**Car tuning (defaults; all live in Dev Mode):**

| | Coyote (Dustbowl) | Pebble (Hedgerow) | Moose (Frostpeak) |
| --- | --- | --- | --- |
| Body L×W×H (m) | 4.4 × 1.9 × 1.25 | 3.8 × 1.75 × 1.35 | 4.1 × 1.95 × 1.7 |
| Wheelbase / track / wheel radius (m) | 2.7 / 1.6 / 0.36 | 2.4 / 1.5 / 0.32 | 2.5 / 1.65 / 0.45 |
| ride (m) | 0.55 | 0.50 | 0.70 |
| vtop | 230 km/h | 195 km/h | 175 km/h |
| A0 (accel at 0) / B (brake) / Arev, vrev | 12 / 24 m/s² / 6, 40 km/h | 14 / 28 / 6, 40 | 11 / 22 / 6, 40 |
| δlo / δhi (steer at 0 / top speed) | 34° / 7° | 36° / 9° | 32° / 9° |
| grip (lateral, asphalt) | 15 m/s² | 18 m/s² | 14 m/s² |
| driftGrip | 0.55 | 0.70 | 0.60 |
| airYaw | 1.2 rad/s | 1.5 rad/s | 1.0 rad/s |
| cd / cdAir | 0.0004 /m | 0.0004 | 0.0005 |
| adhesion | 0.35 g | 0.35 g | 0.40 g |

Global: gravity 1.5 g; boostDv 10 m/s; boostAccel 7 m/s²; boostTime 1.2 s; wall e 0.15.

**Surfaces** (`grip` multiplier per car, `roll` = rolling resistance m/s²):

| Surface | Coyote | Pebble | Moose | roll | FX / sound |
| --- | --- | --- | --- | --- | --- |
| road (asphalt / tarmac / packed snow road) | 1.0 | 1.0 | 1.0 | 0.15 | tyre squeal |
| dirt | 0.75 | 0.95 | 0.85 | 0.6 | brown dust, crunch |
| grass (verge, embankment) | 0.55 | 0.60 | 0.65 | 2.5 | green bits |
| sand (Dustbowl plate) | 0.50 | 0.55 | 0.60 | 4.0 | sand plume |
| snow (Frostpeak plate, snowbank) | 0.60 | 0.65 | 0.90 | 1.2 | snow spray |
| ice | 0.30 | 0.35 | 0.55 | 0.05 | ice hiss, sparkles |
| boost | as road | | | 0.15 | chevrons flash |

### 4.5 Cameras (`car/camera.js`; all through `world.camera` in `'fixed'` mode with `up`, E2)

Set `world.camera.mouseLook = false` (no pointer lock in races). Compute in steps, place in `onDraw` interpolated with
`game.alpha` (the engine leaves a pose set in `onDraw` to the game).
- **Far chase (default):** target `T = p + u·1.2 m + f·3 m`; smoothed frame `fc` (forward) and `uc` (up) chase the
  car's `f, u` at 6/s and 4/s while grounded; in the air `fc` follows `v̂` and `uc` eases to ẑ at 1.5/s (the camera
  doesn't spin with flips). Position `T − fc·(6.5 m + 0.012 s·|v|) + uc·2.0 m`. FOV 70° + 12°·clamp((kmh − 100)/150,
  0, 1) + 6° while boosting (reduce-motion: no FOV kick). If a ray from T to the camera hits the track, pull in.
- **Close chase:** 4.2 m back, 1.3 m up, FOV 75°. **Hood:** `p + f·0.6 + u·1.15`, look along f, up u, FOV 80°; the
  pen draws the bonnet and a dashboard strip (the overlay pen, as the shooter kit draws a gun) so it reads as a car.
- **Flyover (intro):** samples the route; the camera rides 25 m above and 30 m beside the route from start to finish
  over 2.5 s (smoothstep), then cuts behind the car.
- **Finish orbit:** 10 m radius around the car, 0.35 rad/s, slight slow-motion (`game.timeScale = .35` for 0.6 s).
- **TV (replays):** trackside spots generated along the route every ~5 blocks, 25 m to the side and 6 m up; the
  nearest spot with a clear line of sight films; FOV narrows to keep the car ~1/4 of screen height.
- **Orbit/free (replays, results):** right stick / mouse drag orbit, triggers / wheel zoom.
- **Editor:** orbit around the cursor (yaw, pitch 25°–80°, distance 60–400 m), smoothed (§5.4).
- Split screen: one `world.addCamera()` per extra viewport, each with its own chase state.

### 4.6 A run (`race/run.js`)

- Phases: `intro` (flyover) → `countdown` (3 s; 1 s on restart) → `racing` → `finished` | `abandoned`.
- The clock counts **steps** from GO; the car is held (brakes on, gas revs the engine sound only) before GO.
- **Gates:** each CP/finish gate is a plane (point, normal = path tangent, half-width = road half-width + 1 m,
  height 7 m above the road along u). A crossing = the segment from the previous to the new car position crosses
  the plane within those bounds. **Checkpoints count once each, in any order, either direction** (TrackMania).
  **Finish counts only forward and only with every checkpoint passed**; otherwise show "MISSING CHECKPOINT" once.
- **Respawn:** to the last checkpoint passed (or the start): car at the gate (or spawn) frame, `v = 0`, upright,
  `boostT = 0`; the clock keeps running; respawn counter +1; warp-in FX (glints, a quick scale-in, rising arpeggio).
- **Restart:** new run object; ghost recording restarts; respawn counter 0.
- **Splits:** per run, the step count at each CP in the order passed; compare to the best run's splits (by order).
- Events emitted for HUD/sound/FX: `cp(i, steps, delta)`, `finish(steps, delta, medal)`, `respawn`, `restart`,
  `boost`, `land(impact)`, `wall(impact)`, `flop`, `missingCp`.

### 4.7 Ghosts and replays (`race/ghost.js`)

- Record every 4th step (30 Hz): position (int16 deltas in 1/16 unit — 1/256 m; a key frame every 30 samples with
  float32 absolutes), orientation (smallest-three quaternion, int16), speed (uint8 km/h/2), flags (grounded, boost,
  brake). ≈ 15 KB per minute; stored base64 in the profile (best run per track, 10 replay slots).
- Playback: interpolate position (lerp) and orientation (slerp) at any time; wheel spin and steering are derived
  (speed, yaw rate). Ghost cars draw with `pen.ghost = true` (E3) in a light tint of their paint.
- A **replay** is a ghost plus metadata (track id or embedded custom track, car, paint, time, date, events with step
  numbers: CPs, respawns, finish).
- Coco's ghost (author run) is not stored: regenerate it by running the bot (deterministic, ~0.2 s) when needed.

### 4.8 The autopilot (`race/bot.js`) — used by tests, medal baking, Survival rivals, attract mode, Dev Mode

1. **Route:** walk links from Start's exit port to Finish, following each block's path in the traversed direction
   and jump links over gaps; crossings go straight through. Sample every 2 m: `{ p, t, u, r, halfWidth (road/2 −
   1.2 m), surface, flags: kicker|landing|loop|boost|gate, block }`. A route that doesn't reach Finish is an editor
   error ("Route broken at ...").
2. **Racing line:** lateral offsets e_i ∈ [−hw, +hw], start at 0, 80 iterations of curvature smoothing with clamping
   (`e_i ← clamp(e_i + 0.5·((e_{i−1} + e_{i+1})/2 − e_i) − 0.3·κ_i·hw, −hw, hw)`, κ signed in the surface plane); force
   e = 0 on loops, kickers, landings, gates and boost pads (the line goes through pads).
3. **Speed profile:** `vmax_i = min(vtop·1.3, sqrt(a_lat / |κ_i|))`, a_lat = skillGrip·grip·surfaceGrip (+ g·sin(bank)
   on banks); full speed through loops and kickers; then a backward pass with braking B·skillBrake and a forward pass
   with the car's acceleration curve. Flag tracks where the speed before a kicker is below what its gap needs
   (`v ≥ sqrt(g·gapLength/sin(30°))`·1.1) — a test fails on that.
4. **Control (each step):** nearest route index (search a ±15-sample window after the last one, by 3D distance — never
   jump between a loop's two lanes); lookahead point at `6 m + 0.35 s·|v|`; α = angle to it in the car's (f, r)
   plane; `steer = clamp(1.6·α/δmax(v))`; `gas = 1` if v < target − 0.5 m/s; `brake = clamp((v − target)/5)` if
   v > target + 1 m/s; in the air: steer 0, gas 1.
5. **Recovery:** off the route by more than hw + 3 m for 0.6 s, slower than 1 m/s for 1.5 s after GO, or two flops in
   a row → respawn.
6. **Skill 0..1:** grip use 0.75 + 0.25·skill, brake margin ×(1.25 − 0.25·skill), lookahead jitter ±0.4 m·(1 −
   skill) from `E.rng(seed)`, a lazy line (e scaled by 0.6 + 0.4·skill). Skill 1, no cheats = the **author** driver.
7. **Cheats (attract/demo only):** lane snap (pull p toward the line, 4 m/s max), +10% grip, auto-respawn instantly.

### 4.9 Medals (`race/medals.js`, `tools/bake.mjs`)

- Author time = the bot at skill 1 without cheats (campaign and puzzle reference solutions), baked by
  `node tools/bake.mjs` into `src/data/medals.json` (`{ id: { author, gold, silver, bronze } }` in steps). Re-bake
  after any tuning change (Dev Mode has "Re-bake this track" for live tuning; tests fail if a baked value no longer
  matches a fresh bot run within 1 step).
- **Gold = author × 1.06 rounded up to 0.1 s; Silver = × 1.2 rounded up to 1 s; Bronze = × 1.5 rounded up to 1 s**
  (TrackMania's ratios). Multipliers are Dev sliders; a track may carry `medalScale` to adjust.
- Editor tracks: author = your validation time; the same ratios.
- Medal icons carry letters (B, S, G, A). The Author medal is "Coco's Time".

---

## 5. Modes and features

### 5.1 Profile, progression and the coppers economy (`save/profile.js`, `modes/campaign.js`)

Profile (one per browser; `E.store` key `crackmania:profile`, `version: 1`, with a `migrate()` hook): name (letter
wheel), coppers, per-track records `{ bestSteps, bestSplits, medal: 0..4, ghost, attempts }`, puzzle records, survival
best rank per gauntlet, unlocked packs and patterns, garage paint per car, 6 custom track slots, 10 replay slots, seen
story beats, first-time tips seen. In AI Hub sessions the hub gives the page empty, temporary storage: nothing to do.

**Coppers (¢).** Start with **300 ¢**. Rewards are paid **once per medal tier** (earning Gold first time pays Bronze +
Silver + Gold):

| | Bronze | Silver | Gold | Author |
| --- | --- | --- | --- | --- |
| Race (× env: Dustbowl 1, Hedgerow 1.25, Frostpeak 1.5) | 60 | 90 | 150 | 300 |
| Puzzle | 80 | 120 | 200 | 300 |

Survival: 50 ¢ per round survived beyond your previous best for that gauntlet, plus 300 ¢ the first time a gauntlet is
cleared. Dev slider: copper multiplier.

**Spending.** Editor blocks cost coppers when placed (refunded 100% when removed; table §4.1). Editor **packs** unlock
families of blocks: BASIC (start, finish, checkpoint, straights, turns, hills, crossing) free; STUNTS (kicker, landing,
boost, bumps) 250 ¢; LOOPS & BANKS 600 ¢; SURFACES (dirt and ice variants) 200 ¢; SCENERY 150 ¢. Garage patterns:
3 free, the other 5 at 100 ¢ each. Prices show on every tile; "Not enough coppers" plays the error buzz and shakes the
wallet.

**Unlocks.**
- Dustbowl D1 and D2 open at start; each next track opens when the previous one has any medal.
- An environment's **Puzzles** open when its 2nd race has a medal; its **Survival** when its 3rd race has a medal.
- **Hedgerow** opens with medals on 3 Dustbowl races; **Frostpeak** with medals on 3 Hedgerow races.
- Build, Hot Seat, Split Screen, Garage and Replays are open from the start (MP modes offer every track of unlocked
  environments plus custom tracks).
- Story beats fire on these events (§8.2). Golds on all 15 race tracks trigger the ending and the credits roll.

### 5.2 Race (campaign)

Front end: **Environment select** (three big cards with the car, the env emblem, medal count `G 3/5`, a lock with the
requirement) → **Track select** (5 tiles: number, name, a baked minimap of the route, best time, medal icon, lock;
△ toggles "race Coco's ghost") → run (§4.6) → **Results** (time big; best and delta; medal drop-in with sting; next
medal target "SILVER 0:31"; coppers count-up; buttons **Retry** (△ / R), **Next track** (✕ / Enter), **Replay** (□ /
V), **Save replay**, **Menu** (○ / Esc)). Pause menu items in races: Resume, Restart, Respawn, Camera, Ghosts,
**Dev Mode**, Settings, Controls, Quit to menu (`menu.items` may be a function; check the engine's `v(...)` wrapper
and return per-scene items).

HUD (`ui/hud.js`, per viewport): top centre timer `0:23.41` (big digits); under it, for 2 s after a CP, the split and
delta; top left `CP 1/3` with a flag icon and the respawn count if > 0; top right the next medal target with its icon
(and "BEST 0:31.20" under it); bottom right speed (big digits + `KM/H`, or MPH by setting) and a boost flame icon while
boosting; centre: countdown digits (3 → 2 → 1 → GO!, scale 6, pop tween), "MISSING CHECKPOINT", "FINISH!", "NEW
RECORD!". Bottom centre after a flop or when stopped for 2 s: prompt `○ Respawn  △ Restart`. Edge vignette + speed
lines above 200 km/h (reduce-motion: off).

### 5.3 Puzzle (`modes/puzzle.js`; runs inside the editor scene)

A puzzle = environment, **fixed blocks** (start, checkpoints, finish; sometimes more), a **build zone** (rectangle of
cells and levels), **no-build cells** (chasms, hedges, rocks, a pond — drawn as such), an **inventory** (block type →
count) and a reference solution (for its author time and for tests). The editor runs in puzzle mode: the palette shows
only inventory blocks with remaining counts (`R2 ×1`), fixed blocks show a lock and can't be moved, placement outside
the zone is refused, no coppers are spent. **Validate** = drive from start through all CPs to finish; medals by time
against the solution's baked thresholds. Several routes are possible; the inventory includes extra pieces so a smarter
route (a boost, a wider bend) beats the obvious one. First-time Coco tip explains it in three lines.

### 5.4 Build — the track editor (`editor/editor.js`)

Opening: environment and slot select (6 slots with names, env emblem, validated mark and author time) → the editor.

Screen: the 3D track with an **orbit camera** around the cursor; a translucent **grid** at the cursor's level (pen
bars every cell within 6 cells of the cursor, brighter on the cursor's row/column); the **cursor** (a pulsing cell
outline + a ghost preview of the selected block, green if it fits, red if it collides / is outside the grid / you
can't afford it; small arrows on its ports, blue when they'd link); placed blocks' open ports show red arrows. Top
bar: track name, env, coppers (or puzzle counts), status chips `START ✓ FINISH ✓ CP 2 ROUTE ✓ VALIDATED 0:41.20`.
Bottom: the **palette** carousel (categories ROADS / TURNS / HILLS / STUNTS / SURFACES / SCENERY as tabs; 48×36 px
icons baked top-down from each block's geometry; name, cost, lock if the pack isn't owned). Left: a short prompt list.

| Action | DualSense | Keyboard / mouse |
| --- | --- | --- |
| move cursor (camera-relative, repeats) | left stick | WASD / arrows; mouse hover picks the cell under the pointer on the cursor's level (ray–plane) |
| palette item / category | d-pad ←/→ / ↑/↓ | Tab / Shift+Tab categories, 1–9 items, mouse click on a tile |
| place | ✕ | Space / Enter / left click |
| remove block under cursor | □ | Delete / Backspace / right click |
| rotate selected block | R1 (cw) / L1 (ccw) | R / Shift+R / mouse wheel |
| level up / down | R2 / L2 | E / Q / Shift+wheel / PageUp / PageDown |
| orbit / tilt camera | right stick | middle-drag or Alt+left-drag; wheel+Ctrl zooms |
| test drive from Start | △ | T |
| undo / redo | L3 / R3 | Ctrl+Z / Ctrl+Y |
| editor menu | Options | Esc |

Editor menu: Resume, **Validate** (a run from Start; finishing with every CP sets the author time and medals; any
edit afterwards clears it), Test drive, Save, Save as, Load, Rename (letter wheel), Environment (only when empty),
Share code (shows a base64url code in a large box; Copy uses `navigator.clipboard` when allowed), Import code (a text
field; keyboard paste), Clear track (asks), Dev Mode, Settings, Exit. Test drive returns to the same cursor and
camera. Undo/redo stack of 200 operations (place, remove, rotate, rename) with coppers refunded/charged.

Rules: one Start (free), at least one Finish (free), any number of CPs; blocks can't overlap (3D occupancy) but can
sit above others with ≥ 1 level of clearance (supports are generated automatically and never block a lane under
them); gaps under kickers are reserved automatically when a kicker is placed (shown hatched). A track is shareable
and playable in Hot Seat / Split Screen once validated. A Dev Mode button "Export as content" prints a `data/tracks.js`
entry (placements + metadata) — the designer workflow for growing the game later.

### 5.5 Survival (`modes/survival.js`)

Per environment a **gauntlet of 5 rounds** = that environment's race tracks 1→5 (rounds may include tracks not yet
open in Race: Survival is their preview). Each round: you vs the **Ghost Guild** — Tex Mirage, Mlle Gravillon, Bobo
Yeti — as ghost cars with name tags. Their runs are bot runs generated at round start (behind a 1-second "WARMING UP
THE GHOSTS" card; deterministic per gauntlet + round): skills `base + 0.03·round + 0.02·rankIndex` with bases 0.78 /
0.86 / 0.93 and different seeds (Tex jittery-fast, Gravillon clean, Bobo late braker). Place by finish time (DNF after
the last rival finishes + 15 s = last). **1st: +2 ranks, 2nd: +1, 3rd: stay, 4th: out.** Ranks: ROOKIE → DRIVER →
RACER → PILOT → ACE → MANIAC → CRACKMANIAC. Between rounds: standings card with portraits and a rival quip (§8.2).
Clearing round 5 = "GAUNTLET CLEARED" + rewards. Best rank per gauntlet is recorded.

### 5.6 Hot Seat and Split Screen (`modes/hotseat.js`, `modes/split.js`)

**Hot Seat** (TrackMania 2003's local mode): 2–8 players (default names PLAYER 1…; letter wheel to rename), attempts
per turn 1/2/3, a cup of 1–5 tracks (pick or random). Turn order rotates per track. Before each turn a full-screen
card "PASS THE CONTROLLER TO {NAME}" (Coco babbles; any button when ready). The leader's best run drives as a ghost.
Scoring per track: 10-8-6-5-4-3-2-1 by best time; cup standings after each track; a podium at the end with each
player's car in their paint colour (assign 8 distinct colours).

**Split Screen:** 2–4 players at once. Join screen: each pad presses ✕ or Options to join (`game.allowJoin({ max: 4 })`),
keyboard players join with Enter (left half: WASD + F/G/H) or Numpad Enter (right half: arrows + . / ,), per the
engine's half-keyboard support. Layout `rows` for 2, `grid` for 3–4 (`game.splitScreen(n, { layout })`,
`world.addCamera()` per extra viewport; filters are off while split — engine rule). Same countdown; cars are ghosts to
each other (no collisions, TrackMania style). Each viewport has its own HUD; a player who finishes sees their place;
the race ends when all finish or 30 s after the first finish. Best of 1 / 3 races.

### 5.7 Online — AI Hub sessions (`modes/online.js`; protocol at `ai-hub/lib/hub/README.md`)

Mode **`ghost`**: each player runs their own copy of the round; positions are exchanged so each copy shows the others
as ghost cars; nothing they do affects your world. This *is* TrackMania online (cars never collide).

Head metas (in the built HTML):
```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="3">
<meta name="hub:session-goal" content="Best time in 3 minutes wins; retry as often as you like">
<meta name="hub:session-howto" content="R2/W gas · L2/S brake · stick/arrows steer · Circle/Enter respawn">
<meta name="hub:type" content="Game"><meta name="hub:players" content="1-4">
```
Flow when `AIHub.active` (true from the first line):
1. Skip title, attract and menus entirely. Boot, then `const info = await AIHub.connect({ mode: 'ghost', seats: [1, 4],
   card: true })`. If `info` is null, run the normal game.
2. Pick the round's track with `AIHub.rng('track')` from the session list **D1, D2, D3, R1, R2, S1, S2** (the same
   pick on every copy; the seed changes per round, so rounds rotate tracks); load it.
3. **Own card** (§ "The card" in the README): the track flyover looping, the track name, each player's name in their
   seat colour (`info.players[].color`: #e8443a, #3b82f6, #22c55e, #f5b700) with a READY tick from the `card` event's
   `ready` ids, the goal, the controls for this player's device, and the time left (`card.left`). Enter / ✕ / a tap →
   `AIHub.answer('ready')`; △ (button 3) or M → `AIHub.answer('more')`. The card has no menus and draws no
   `Math.random` (use `AIHub.rng('card')` for any jitter). Call `AIHub.ready()` once the world is built — no key press.
4. On `start`, show 3-2-1-GO against `AIHub.time()` (play begins at 0). Then **time attack**: unlimited restarts and
   respawns; the round clock (3:00 from `AIHub.time() = 0`) shows top centre; your best time top right.
5. Every ~100 ms send `{ t: 'g', area: trackId, run: runCounter, ms, p: [x, y, z] (rounded 0.1 unit), q: [x, y, z, w]
   (4 decimals), v: kmh, f: flags }` with `AIHub.send(data, { reliable: false })` (≤ 10/s, well under the 20/s limit,
   < 200 bytes). On a new best, send `{ t: 'best', ms }` reliably. Receivers buffer 150 ms and interpolate; a ghost
   whose `area` differs is hidden; show name tags in seat colours (names drawn by the pixel font on canvas — never as
   HTML).
6. Each second `AIHub.progress({ score, label })`: with a best, `score = 2e6 − bestMs`, label `BEST 0:42.31`; without,
   `score = cpsThisRun·1000 + metresAlongRoute`, label `CP 2/3`.
7. At 3:00 by `AIHub.time()` (or 5 s before `info.limitMs` if that is sooner) — or at once on `time-up` — call `AIHub.result({ time: bestMs })` if you have a finish,
   else `AIHub.result({ score })`, exactly once, then show "WAITING FOR THE OTHERS" with live ghosts. Include `stats:
   { Runs: n, Respawns: n }`.
8. On `end`: stop input and sound (`game.audio.mute(true)`, freeze), show the hub's standings line if given.
9. On `leave`: remove that ghost. If WebGL 2/WebGPU init fails: `AIHub.fail('3D graphics are not available')`.
10. In a session: no Quit to title, no title/attract/editor/garage, no `alert/confirm/prompt`, no `window.open`, no
    network except the hub; Options is ignored while Create (Pad8) is held.
The Multiplayer menu outside the hub shows an **Online** tile that explains: "Online races run in AI Hub sessions —
open CRACKMANIA from AI Hub with friends."

### 5.8 Replays (`modes/replay.js`)

From results ("Replay") or the Replays list (10 slots: track, time, car, date; delete with □). Viewer: the run's
ghost drawn as a normal (opaque) car with its paint, the HUD's timer and CP splits replayed, camera modes **Chase / TV
/ Orbit** (R1 / C cycles), play/pause (✕ / Space), scrub (left stick or ←/→; hold for 4×), speed 0.25×–4× (L2/R2 or
−/=), restart (△ / Home), exit (○ / Esc), mouse: drag to orbit, wheel to zoom, click the timeline bar to seek.
Custom-track replays embed the track.

### 5.9 Garage — paint shop (`modes/garage.js`)

A small **workshop world** (a separate `E.World3D` with a text `level`: brick walls, a car lift, torches, shelves,
crates, barrels, a tyre rack — core shapes plus a few custom ones) with a turntable. Pick car (locked cars show a
silhouette and the unlock requirement), then: **Body colour**, **Accent colour** (24-swatch grids, plus HSV sliders),
**Pattern** (Solid, Twin Stripes, Side Stripe, Checker Roof, Flames, Lightning, Number Panel, Two-Tone), **Pattern
colour**, **Number** (00–99, drawn on doors and roof with a 3×5 pixel digit font made of thin boxes), **Rims**
(6 colours), **Helmet colour**. Live preview spins; △ toggles "lights on". Saved per car; used in every mode, replays,
hub ghosts (others see their seat colour, you see your paint).

### 5.10 Dev Mode (`ui/dev.js`; pause menu → "Dev Mode")

An overlay panel (left 45% of the screen, game visible and paused, or running in slow motion if chosen) with three
tabs (L1/R1, Q/E, click):
- **TOOLS:** Teleport to next / previous checkpoint; Finish now (records the current time); Award medal (B/S/G/A);
  Unlock everything; +1000 coppers; Reset profile (asks); Bot drives (toggle, skill slider); Re-bake medals for this
  track; Time scale 0.25× / 0.5× / 1×; Frame step (while paused); Free camera (fly with sticks/WASD); Show probes
  (wheel rays, contact plane, normal, κ, slip); Show colliders (wireframe of collision triangles, pen bars); Show route
  and racing line; Show gates; Show FPS and draw stats (`renderer.info`); Jump to (any track / puzzle / gauntlet
  round / scene by deep link).
- **TUNING:** live sliders with a value readout and the default marked; ←/→ adjust (hold accelerates), □ resets the
  row, △ **Reset all to defaults**; mouse drags. Rows: gravity, adhesion, loop assist; for the current car: vtop, A0,
  brake, steer low/high, grip, drift grip, air yaw, ride, cd; surfaces: ice/dirt/sand/snow grip; boost Δv/accel/time;
  wall restitution; landing loss; camera distance/height/FOV/FOV-by-speed; medal ratios gold/silver/bronze; rival
  skill base/step; copper multiplier. Values live in `CFG` (session-only unless "Keep tuning" is on, then
  `E.store('crackmania:dev')`).
- **INFO:** car state (speed, grounded, surface, block, κ, slip, air time, boost), run (steps, CPs, respawns), track
  (id, blocks, author time, medal times), build version (`E.versionLabel()`), backend (`E.World3D.backend`).

### 5.11 Attract mode (`attract/attract.js`)

On the **title and every front-end menu screen** (not the editor, garage, settings or pause), 10 s without any input
(keys, mouse movement/clicks, pad buttons or stick past the dead zone) starts the attract loop; **any input** returns to
the title (the input is consumed). A "DEMO — PRESS ANY BUTTON" banner pulses at the bottom; the CRACKMANIA logo sits
small in a corner. Segments (each with a caption card; ~100 s total, then loops):
1. **Race** — D5 "The Big Crack", bot with cheats, chase cam with TV-cam cuts at the loops and the canyon jump (25 s).
2. **Build** — a time-lapse of R1 being built: blocks drop in one by one with the bounce tween, the camera orbits,
   coppers tick down; then a 3-second test drive (15 s).
3. **Puzzle** — PS1 "Icy Connect": missing pieces fly into place, VALIDATE, a gold medal drops (15 s).
4. **Survival** — round on R2 vs the Ghost Guild; standings card with Tex's quip (20 s).
5. **Split screen** — two bots on S2, `rows` layout (15 s).
6. **Garage** — the three cars spin through paint jobs; the medal case (10 s).
The bots may cheat freely (lane snap, perfect grip, instant respawn). Attract also runs on touch-only devices (§5.12).

### 5.12 Touch-only devices and the About screen

- **Touch-only gate** (`matchMedia('(pointer: coarse)')` true, `(any-pointer: fine)` false, no gamepad connected, no
  key pressed yet): the title shows the logo, a large **"Controller or keyboard required"** and a **SETTINGS** button
  (tap → `game.menu('settings')`). No touch controls anywhere (scenes declare `touch: []`; hide the engine's touch
  buttons). Attract mode runs after 10 s; a tap returns to the gate. A `gamepadconnected` event or any key press
  leaves the gate for the normal title.
- **About / Credits** (main menu → About): pages with large text: CRACKMANIA + version; **Source Information** (every
  field of TASK.md's list, filled from a `data/about.js` table the builder completes at the end — "unknown" where not
  confirmable); **Testing Feedback**, **Engine Feedback**, **Prompt Feedback** (the builder's answers, same as in the
  final reply and `exit-interview.json`); **Credits**: built on my-3D2dge v0.85.2 (MIT), three.js r182 (MIT), Rapier
  0.19.3 (Apache-2.0), AI Hub session client 1.4.0; any CC0 asset sets used (Kenney, KayKit); "Inspired by TrackMania
  (2003) by Nadeo. CRACKMANIA is an original homage and is not affiliated with Nadeo or Ubisoft." The ending's credits
  roll reuses these pages with music.


### 5.13 Settings (the engine's screens, plus ours)

The engine's standard Settings and Controls screens are used as they are (no settings UI of our own): Display (full
screen, pixel scaling, screen filter, frame rate), Sound (volume, music, effects, audio offset), Comfort (reduce
motion, shake, flashes), Controls (rebinding per device, dead zone, vibration), plus `E.World3D.SETTINGS` (3D picture
Pixels/Balanced/Full, shadows, filter; "Characters" cards/puppets for the crowd and hosts). Ours, via
`menu.settings` (group **Game**): **Button symbols** PlayStation / Xbox (E5), **Speed units** km/h / mph, **Default
camera** Far / Close / Hood, **My ghost** on / off, **Coco's ghost** off / on, **Loop assist** on / off, **Steering
sensitivity** 0.5–1.5 (slider), **Hints** on / off (first-time tips). Subtitles are always on (voices are gibberish).

---

## 6. Content

### 6.1 The turtle format (how the shipped tracks are written)

A track program is a start cell, a heading and a space-separated token list (`track/turtle.js` compiles it into
placements; the editor's own format is the placement list, and both serialize the same way). The turtle stands in the
cell it will fill next, at level L (start 0), heading h.

| Token | Places | Then |
| --- | --- | --- |
| `ST`, `CP`, `FN`, `BO`, `BU`, `KI` | that block in the current cell (KI also reserves L+1) | move 1 cell |
| `S`, `Sn`, `DS`, `DSn`, `IS`, `ISn` | n straights (road / dirt / ice) | move n cells |
| `L1 R1 L2 R2 L3 R3`, `DL1 DR1 DL2 DR2`, `IL1 IR1 IL2 IR2`, `BL2 BR2` | the turn whose entry is the current cell (size n fills n×n) | to `c0 + (n−1)h + n·side`, heading = side |
| `U1 D1 U2 D2` | hill over 1 or 2 cells, spanning levels L..L+1 (U) or L−1..L (D) | move 1 or 2 cells, L ±1 |
| `LOOPR`, `LOOPL` | loop filling the 2×2 cells ahead/aside, levels L..L+3 | to `c0 + 2h + side`, heading unchanged |
| `CR` | crossing (may be entered again later from the side) | move 1 cell |
| `GAPn` | reserves n cells on L and L+1 (at L = 0 they become chasm cells: no base plate) | move n cells |
| `DROPn`, `RISEn` | nothing | L −n / +n (before a landing) |
| `LA` | landing (2 cells) at level L | move 2 cells |

Compiler errors: out of the 32×32×16 grid, overlapping occupancy (except a `CR` crossed at right angles), no `ST` or
`FN`, a kicker with no landing within 5 cells ahead. The planning-time walker that checked every program below used
exactly these rules (all pass, no overlaps); port it to `turtle.js` and keep it as a test.

**Jump speeds** (G = 1.5 g, 15° lip, landing pad 2 cells long): `GAP1` needs ≈ 100 km/h at the lip, `GAP2` ≈ 150,
`GAP3` ≈ 185 on the same level; each `DROP` level lowers that by ~15–20 km/h. Every gap in the shipped tracks has a
boost pad or a long straight before it; the bot test fails a track whose speed plan can't make its gaps.

### 6.2 Environments

| | DUSTBOWL (desert) | HEDGEROW (countryside) | FROSTPEAK (alpine) |
| --- | --- | --- | --- |
| Tagline | Hot asphalt, big air | Tight lanes, loose gravel | Thin air, thin ice |
| Car | COYOTE — V8 muscle coupe, bouncy, drifty | PEBBLE — rally hatch, grippy, nimble | MOOSE — boxy 4x4, heavy, sure-footed on snow |
| Time of day | late afternoon, low warm sun from WSW, long shadows | bright midday | dusk alpenglow; headlights and street lamps on |
| Sky / fog | `#3a7fd8` → `#f6d29a`; fog `#f2d6a6` 600–1800 m | `#4aa0f0` → `#d8ecff`; fog `#d8ecff` 500–1500 m | `#2a5aa8` → `#f0d8e8`; fog `#e6eef8` 400–1300 m |
| Terrain outside the grid | dunes (`6·noise(x/80) + 3·noise(x/23)` m) and 6–8 flat-topped **mesas** 40–120 m tall, 300–900 m out, red/orange/cream strata | rolling hills (`25·noise/300 + 6·noise/60` m), patchwork fields (green / wheat / ploughed by a 60 m cell hash) with dark hedge lines, forest clumps, a far church spire | mountains rising to 400 m peaks at ~1.5 km (ridged noise), snow with blue shade, grey rock strata on steep slopes, pine forests near the grid |
| Base plate | sand ripples (`#e3b673`/`#d49a55`, pebble specks) | mown grass stripes (`#5a9a3a`/`#6aaa4a`, flower specks) | snow (`#eef3fa`, blue `#c8d6ea` shade, sparkle texels) |
| Accent (UI) | orange `#ff9a2a` | green `#6ad04a` | ice blue `#6ad8ff` |
| Boundary | striped concrete barriers | dry-stone wall | snow fence |
| Music | "Heat Shimmer" | "Hedge Fund" | "Thin Ice" |

Terrain height inside the grid is −60 m (under the plate; seen only through chasms), rising to 0 at the grid edge.

### 6.3 Race tracks (15) — programs validated on the 32×32 grid

Start heading is E for all. Lengths are centreline estimates; the bot bakes the real author times. "Teaches" is what
the track is for; the first-time tips (§8.2) fire on D1, D2, D3.

| # | Name | Start | Program | ≈ m | CP | Teaches / signature |
| --- | --- | --- | --- | --- | --- | --- |
| D1 | Sunburn Strip | (3,5) | `ST S2 BO S2 R2 S CP S2 L2 S2 U2 D2 S FN` | 731 | 1 | gas, steer, a boost, a checkpoint, a hill |
| D2 | Cactus Kicker | (2,4) | `ST S3 BO S KI GAP2 LA CP S R1 S2 L2 S2 BO S KI GAP2 LA S FN` | 933 | 1 | jumps over chasms; brake for the tight right |
| D3 | Looping Mesa | (2,3) | `ST S2 BO S2 LOOPR S CP S BR2 S2 U2 S2 D2 BR2 S BO S2 FN` | 998 | 1 | the loop; banked bends at full throttle |
| D4 | Rattlesnake Ridge | (3,14) | `ST S R1 L1 S CP S U1 S3 R2 BO KI GAP2 DROP1 LA L1 R1 S CP S BO S2 L2 S2 FN` | 1020 | 2 | chicanes, a raised ridge, a jump down |
| D5 | The Big Crack | (2,2) | `ST S BO S2 LOOPR S CP S U2 S2 BR2 S BO KI GAP3 LA S CP S BR2 S BO S2 LOOPR S BR2 S2 D2 S CP S2 BL2 S BO S2 FN` | 1896 | 3 | finale: two loops, the 3-cell canyon jump |
| R1 | Cabbage Corner | (3,3) | `ST S2 R1 DS2 DL1 S2 BU S CP S R2 S2 L1 BU S2 FN` | 695 | 1 | tarmac ↔ dirt grip, bumps |
| R2 | Hay Fever | (2,10) | `ST S U2 S D2 S CP S R2 DS3 U1 D1 S KI GAP1 LA L1 S CP S2 FN` | 907 | 2 | crests that throw you (U1), a short jump |
| R3 | Crossroads | (7,10) | `ST S2 CR S2 R2 S R2 S2 R1 S2 CP CR S L2 S U2 S D2 FN` | 927 | 1 | a figure-eight through a crossing |
| R4 | Mill Pond Mile | (2,2) | `ST S3 R3 S2 BO S3 L3 S CP S2 R3 BO KI GAP2 LA S R2 S2 CP S3 FN` | 1348 | 2 | fast sweepers, a jump over the mill pond |
| R5 | Tractor Pull | (2,10) | `ST S BO S2 U2 S DR2 DS2 DL1 BU S CP S LOOPL S2 R2 S BO KI GAP2 LA S CP R2 S3 D2 S BO S2 CP S2 FN` | 1611 | 3 | finale: elevated farm ridge, dirt, a left loop |
| S1 | First Flake | (3,4) | `ST S2 IS2 S R2 S CP S2 L2 IS2 S2 FN` | 631 | 1 | ice: lift off before the bend |
| S2 | Pine Slalom | (2,6) | `ST S2 R1 L1 L1 R1 S2 CP S U2 S2 D2 R2 S CP S2 FN` | 756 | 2 | slalom on snow, braking points |
| S3 | Avalanche Drop | (2,6) | `ST S U2 S U2 S U2 S CP S R2 S BO KI GAP3 DROP2 LA S CP S BO S2 L2 S2 D1 S FN` | 1182 | 2 | climb three levels, a huge drop jump |
| S4 | Glacier Loop | (2,4) | `ST S2 BO S IS2 LOOPR S CP S BR2 IS2 S BR2 S2 BO S2 FN` | 898 | 1 | a loop entered off ice, banked ice bends |
| S5 | Yeti Summit | (2,16) | `ST S BO S U2 S U2 S CP S L2 S U2 S2 R2 BO KI GAP2 LA S CP S R2 S2 LOOPR S IS2 D2 S D2 S CP R2 S2 D2 S BO S FN` | 1925 | 3 | finale: summit road, jump, loop, icy descent |

Environment rules for tokens: dirt (`D*`) and bumps only in Hedgerow (and dirt in the editor's Dustbowl Surfaces
pack); ice (`I*`) only in Frostpeak; Frostpeak's plain `S`/turns are packed-snow road (surface `road`), its `IS` is
ice.

**Chasms per track** (each track's data carries a `chasms` list: cells with no base plate, and what is below them):
D2 — its two level-0 `GAP2`s are **canyons** (rock walls, 60 m deep); D5 — its `GAP3` is on level 1, and the three
cells under it are marked canyon too: *the Big Crack*; R2 — its level-0 `GAP1` is a **stream** (water 2 m down);
R4 — its level-0 `GAP2` is the **mill pond** (water). Water: falling in = splash + respawn; canyon: fall, fade,
respawn. Elevated gaps elsewhere (D4, R5, S3, S5) have plain ground below — you land on the plate and can drive back
or respawn.

Session tracks for AI Hub rounds: D1, D2, D3, R1, R2, S1, S2. Title showcase: D3. Attract race: D5.

### 6.4 Puzzles (6) — fixed blocks and inventories computed from validated solutions

Coordinates are (cx, cy, level, heading). "Solution" is the reference route (it also bakes the medal times); the
**inventory** is the solution's pieces plus extras. The player may find other routes inside the build zone.

| # | Env | Name | Fixed | Build zone (x, y, levels) | No-build cells | Solution | Inventory |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PD1 | Dustbowl | Missing Bend | ST (4,8,0,E), CP (8,11,0,S), FN (11,14,0,E) | 2–14, 6–16, 0–1 | rocks at (6,10), (10,9), (9,15) | `ST S2 R2 S CP S L2 S FN` | S×6, R2, L2, R1, L1, BO |
| PD2 | Dustbowl | Mind the Gap | ST (3,6,0,E), CP (13,6,0,E), FN (15,8,0,S) | 1–17, 2–11, 0–1 | **canyon**: all cells x = 8–9, y = 2–11 | `ST S BO S KI GAP2 LA S CP S R1 S FN` | S×6, BO, KI, LA, R1, R2 |
| PR1 | Hedgerow | Hedge Maze | ST (3,3,0,E), CP (7,5,0,E), FN (11,7,0,E) | 2–12, 2–9, 0–1 | hedges at (4,4), (4,5), (6,3), (7,3), (8,3), (6,6), (7,6), (7,7), (8,7), (11,5), (11,6) | `ST S DR1 DS DL1 S CP S R1 S L1 S FN` | S×7, DS×2, DR1, DL1, R1, L1, R2 |
| PR2 | Hedgerow | Over and Under | ST (4,12,0,E), CP (4,14,0,S), FN (4,16,0,S) | 2–10, 6–18, 0–2 | pond at (7,14), (8,14) | `ST S2 L2 S L2 S L2 U1 S2 D1 CP S FN` | S×8, L2×3, U1, D1, R1, L1 |
| PS1 | Frostpeak | Icy Connect | ST (3,5,0,E), CP (7,8,0,S), FN (11,11,0,E) | 2–13, 3–13, 0–1 | rocks at (5,9), (9,6) | `ST S IS R2 S CP S L2 IS S FN` | S×4, IS×3, R2, L2, R1, L1 |
| PS2 | Frostpeak | Summit Puzzle | ST (3,8,0,E), CP (11,8,2,E), FN (13,16,0,S) | 2–15, 6–18, 0–3 | pines at (8,12), (10,14) | `ST S U2 S U2 S CP R2 S KI GAP1 DROP2 LA S FN` | S×6, U2×2, D2×2, R2, KI, LA, BO |

PR2 forces a bridge (the CP lies straight south of the start, so the route must pass over the start straight).
PD2's canyon forces the kicker. PS2 can be solved slowly with D2×2 or fast with the kicker. Tests place each solution
through the editor API and validate it with the bot.

### 6.5 Survival gauntlets

DUSTBOWL GAUNTLET = D1→D5, HEDGEROW GAUNTLET = R1→R5, FROSTPEAK GAUNTLET = S1→S5; rivals per §5.5.

### 6.6 Scenery and trackside dressing (`track/deco.js`, seeded by track id)

Candidates: grid cells with no track piece at any level, no reserved air, no chasm, at least 4 m from any road edge.
Fill rates and mixes:
- **Dustbowl** 35% of candidates: saguaro cactus 40%, barrel-cactus cluster 20%, rocks 20%, rolling tumbleweed 5%,
  oil pumpjack 5% (≥ 2 cells from road), billboard 10% (only beside straights, facing the road).
- **Hedgerow** 50%: trees 35%, bushes 20%, hay bales 15%, fences along verges 10%, cows 5%, barn or farmhouse 5%
  (needs a free 2×2), windmill 2%.
- **Frostpeak** 45%: snowy pines 55%, rocks 15%, chalets 8%, snowmen 5%, ice blocks 5%, one ski-lift pylon line if
  a free row of 6 cells exists.
Always: a **chevron sign** on the outside of every tight turn (R1/L1, DL1/DR1, IL1/IR1) and of any turn the bot's speed
plan enters above 150 km/h (readability at 240 px tall); tyre stacks (Dustbowl) / hay bales (Hedgerow) / snowbanks
(Frostpeak) on the outside of turns; two grandstands with a waving crowd near start and finish; Monsieur Drapeau beside
the start gate; banners on checkpoint gates. Props are solid: simple colliders (cylinders r 0.4–0.8 m for trunks and
cacti, boxes for buildings and billboard posts).


### 6.7 Items, rivals and unlockables (what the player collects and fights)

TrackMania has no pickups, and neither does CRACKMANIA: speed comes from the road. **On the track:** boost pads
(chevrons), checkpoints, kickers, loops, banked bends, dirt/ice/bumps surfaces. **Opponents:** the clock (medal
times), your own ghost, Coco's ghost (author time), the Ghost Guild in Survival, other players' ghosts in hot seat,
split screen and AI Hub rounds. **Collected and spent:** coppers (¢) from medals and Survival; medals (B/S/G/A) per
track and puzzle; Survival ranks; editor packs (STUNTS, LOOPS & BANKS, SURFACES, SCENERY); garage patterns; the three
environments and their cars; saved replays and custom tracks.

---

## 7. Art direction and animation

### 7.1 The look

The engine's native 3D style is the base: the game's own low resolution (`World3D.SETTINGS` "3D picture: Pixels" by
default; Balanced/Full selectable), toon bands, ink outlines on pen parts, crisp nearest-filtered textures, sun with
shadows, fog to the horizon, the filter setting (None / Comic cel / Pixel) left to the player. Design for 240 px tall:
big shapes, high-contrast curbs and edge lines, chevron boards before tight turns, saturated gates. Colour script:
Dustbowl warm oranges/teal sky; Hedgerow greens/yellows/white; Frostpeak whites/blues with pink sky and warm lamps.
TASK.md treats performance as unlimited: dress scenes generously (sun shadows on, dense scenery, crowds, animated
props, lamps) — but still never create materials after boot.

### 7.2 Textures (`env/textures.js`; bake with `E.mkCanvas(w, h)` → `THREE.CanvasTexture`, NearestFilter, repeat)

64×64 or 128×128 px tiles drawn pixel by pixel with `E.tones()` ramps and `E.hash2`/`E.noise2` speckle: asphalt (dark
grey, aggregate speckles, faint cracks, white edge lines and a yellow dashed centre at the right texel columns),
tarmac (lighter, patched), dirt (ruts, pebbles), packed snow road (blue-white with tyre tracks), ice (blue, white
streaks), red/white and blue/white curb stripes (1 m period), boost chevrons (separate emissive overlay), sand ripples,
mown grass stripes, snow with sparkle texels, concrete (pillars, barriers with orange/white stripes), earth embankment,
rock strata (terrain colour function: bands by height with noise), stone wall, steel rail.

### 7.3 Cars (`car/draw.js`, the pen, frame from E1; 25–45 parts each, outlines automatic)

Draw at the interpolated pose (`game.alpha`). Body pitch/roll lean from acceleration (≤ 4°, smoothed) on top of the
physics frame; each wheel at its probe's compression (spring-smoothed, so landings squash), spinning with speed, front
wheels turned by the steer angle; brake lights glow (pen `glow`) while braking; headlights in Frostpeak; exhaust puffs
at idle and a flame + glow while boosting; a helmet (ball + visor) visible through the windscreen.
- **Coyote:** long low body box, raised hood with a scoop, fastback cabin with dark glass slabs, chrome bumpers,
  side exhausts (tubes), wide rear tyres, twin stripes by default.
- **Pebble:** short tall hatch, big roof vent, rally wing, mud flaps, four-lamp light pod on the bonnet, diagonal
  livery slab by default.
- **Moose:** tall boxy 4x4, roll bar, roof rack with lamps, spare wheel on the tailgate, snorkel, knobbly big wheels.
Paint system: `primary`, `accent`, `pattern` (8, §5.9) as extra thin boxes/slabs on top of the body (stripes, checker
squares, flame wedges via `slab`, lightning zig-zag), `number` from a 3×5 digit font of tiny boxes on doors and roof,
`rims`, `helmet`. Ghosts draw the same parts with `pen.ghost = true` (E3) tinted toward white.

### 7.4 Characters and props

Characters are `E.Humanoid` rigs (the engine's animation system: poses, moves, `drawPortrait` for dialogs):
- **Coco Asphalte** — `build: 'heroic'`, hard hat (`hat: { style: 'helmet', color: '#ffd030' }`), ponytail, orange
  hi-vis coat with reflective trim, clipboard held (pen in hand via `rig.hand()` in 3D scenes); portrait in dialogs.
- **Monsieur Drapeau** — chibi build, cap, white shirt, black trousers; holds a chequered flag (pen-drawn on `rig.hand()`);
  idle sway, raises the flag at "3", drops it on GO (pose + custom arm offset), cheers at your finish.
- **Ghost Guild** — Tex Mirage (`hat: 'cap'` styled as a cowboy hat in tan, poncho cape), Mlle Gravillon (goggles via
  `hat: 'band'`, racing jacket), Bobo Yeti (`build: 'bulky'`, white `hood`, fur colours). Portraits on Survival cards;
  their ghost cars in their colours (Tex orange, Gravillon violet, Bobo white).
- **Crowd** — `style: 'classic'` humanoids (cheap) on the grandstands, `wave`/`cheer` poses on a stagger, louder
  cheering when you pass a gate or finish.
- **Driver** — your helmeted driver on the results podium (`pose: 'cheer'`) beside the car.

Props: use the engine's core shapes and store sets where they fit (`tree`, `pine` (snow material), `bush`, `rock`,
`fence`, `barrel`, `crate`, `sign`, `lamppost`; `kenney-graveyard:hay-bale`, `kenney-holiday:snowman`,
`kenney-holiday:cabin-fence`, `kenney-nature:log-large`, `kenney-pirate:palm-detailed-straight` for the Dustbowl
oasis; cut only the entries used into a set of your own with `tools/asset-set.mjs`). **New shapes** (asset entries per
`docs/ASSETS.md`, checked with `tools/asset-sheet.mjs`): saguaro cactus (3 variants), barrel-cactus cluster, mesa
rock arch, billboard frame (the poster drawn by the pen: "COPPER COLA", "LOOP INSURANCE", "COCO ASPHALTE BUILDS
TRACKS"), grandstand, tyre stack, traffic cone, chevron sign board, barn, farmhouse, chalet, stone-wall segment, ski-lift
pylon, snow pole, ice block, igloo, workshop car lift. **Moving props drawn by the pen each frame:** pumpjack (rocking
beam), Dustbowl water-pump windmill and Hedgerow windmill (turning blades), tumbleweeds (rolling, bouncing), cows
(grazing head bob, tail swish; ball/box/tube parts), ski-lift chairs (moving on the cable), flags on poles (waving),
gate flip-digit boards (your current time and checkpoint split flip in), start lights (5 red → green), finish confetti
cannons, boost chevrons (lit in sequence).

### 7.5 Effects (game.particles in 3D, the pen, the camera)

Dust plumes by surface (sand/dirt/snow colours) from the rear wheels ∝ speed and slide; tyre smoke on asphalt slides;
skid marks (dark thin pen slabs on the road, last 200, fading over 8 s); sparks on wall scrapes (`particles.sparks`)
and on hard landings with the chassis; landing dust ring (`particles.ring`); boost: exhaust flame glows, a speed-line
overlay, FOV kick, chevron flash; checkpoint: gate ring flash + `glints`; respawn: glints + scale-in; finish: confetti
(`bits` in env colours), fireworks over the stands after a medal; splash at the mill pond; snow puffs off pine
branches when you pass close. Screen shake and flashes follow the engine's comfort settings.

### 7.6 UI art (pixel sprites via `E.sprite`, `E.font`, `E.ui`)

Logo: `E.font.title('CRACKMANIA', …, { scale: 4, colors: ['#fff6d0', '#ffd060', '#ff8a2a', '#c8402a'], depth: 3 })`
with animated crack lines (pen-free 2D `px.line` zig-zags growing across the letters, then a puff of asphalt bits).
Medal icons B/S/G/A (16 px discs with ribbon and letter), copper coin, flag, lock, env emblems (cactus, cabbage,
snowflake), car silhouettes, chunky timer digits (9×14 px, outlined), **controller glyphs**: PlayStation (✕ ○ □ △ in
their shapes and colours, L1 R1 L2 R2, Options, Create, sticks, d-pad), Xbox (A B X Y in coloured circles, LB RB LT
RT, Menu, View), keyboard keycaps (letter or word), mouse (left/right/wheel). Panels: `E.ui.box` with a dark
translucent gradient and the environment accent border.

### 7.7 Animation list (everything that moves, built on the engine's rigs, tweens and scripts)

Car: suspension, lean, wheel spin and steer, brake/head lights, boost flames, landing squash, flop roll-over, respawn
scale-in, finish slow-motion. Camera: flyover intro, chase lag, FOV with speed, TV cuts, finish orbit. Characters:
Coco's dialog gestures (pose changes per line among the engine's poses `wave`, `hips`, `cheer`, `cast`, plus
`point: true` to point) and portrait expressions (`expr: 'smile' | 'shout'`), Drapeau's flag routine, the crowd, the
podium cheer, Survival rivals' portraits reacting (`smile` when ahead, `wince` when beaten). World: windmills, pumpjack, cows, tumbleweeds, ski-lift, flags, start lights, flip boards,
confetti, fireworks. UI: tile focus scale, medal drop-in (outBack) and shine sweep, coppers count-up with coin ticks,
palette slide, block drop-in with bounce in the editor and the attract build time-lapse, logo crack, unlock "stamp".

---

## 8. Audio, story and text

### 8.1 Music and sound (all synthesized; `game.audio` + `game.audio.ctx`)

Songs in the engine's notation (`{ bpm, steps, tracks: [{ wave, vol, notes, name, on }] }`, drums `k s h o c t`),
looping, with **layers** (`audio.layer`) so intensity rises in play (drums and lead join after the first checkpoint;
everything drops to bass + pad while paused via `duck`):

| Song | Where | Feel |
| --- | --- | --- |
| Crack the Clock | title, menus, attract | upbeat electro-funk, 128 bpm, slap-bass triangle, square lead hook |
| Heat Shimmer | Dustbowl races | desert surf-rock electro, 140 bpm, E minor pentatonic, twangy pulse12 lead |
| Hedge Fund | Hedgerow races | bouncy Euro-house, 126 bpm, offbeat hats, major key |
| Thin Ice | Frostpeak races | airy trance, 136 bpm, saw arpeggios, sine pad |
| Blueprint | editor, puzzles | chill lo-fi, 96 bpm, soft triangle chords |
| Ghost Guild | Survival | tense half-time drum & bass, 170 bpm |
| Paint Job | garage, replays | jazzy chiptune, 110 bpm |
| Victory Lap | credits, gauntlet cleared | anthem |

Stings (`audio.sting`): countdown (three low beeps, high GO), checkpoint chime (bright two-note up), new record
(arpeggio), finish fanfare, medal stings (bronze 3 notes, silver 4, gold arpeggio + crash, author extended), unlock
stamp, Survival elimination (descending wah), rank up.

**Car sound** (`car/sound.js`, WebAudio nodes made once per car voice; volume follows `game.audio.volume ×
sfxVolume`, silent when muted, paused or headless): engine = two detuned oscillators + a sub through a waveshaper and
lowpass (Coyote: saw + sub, deep; Pebble: pulse/square, buzzy; Moose: saw + filtered noise, gravelly); a simulated
gearbox — `gear = 1..5` from speed bands, `rpm = idle + (speed within band)·(redline − idle)`, a 60 ms dip and blip on
shifts; throttle opens the filter. Tyres: band-passed noise ∝ slide, colour by surface (squeal / crunch / hiss / ice
whine). Wind: low-passed noise ∝ speed². Scrape: noise while touching a wall. One-shots via `audio.sfx` voices: boost
whoosh, landing thump (∝ impact), crash, respawn warp, horn (two-tone square toot + a babble "beep beep"), CP
chime, gate whoosh-by, crowd cheer (noise swell + many tiny babbles), UI move/confirm/back/error, coin tick, block
place thunk / remove pop / rotate click / level blip, puzzle piece "click-in".

### 8.2 Story beats and characters (`story/story.js`)

Delivered with `E.Dialog` (portrait = the speaker's rig; typewriter text; each line voiced by babble §8.4; ✕/Enter/click
advances; ○ skips the scene). Lines are short. Beats fire once (recorded in the profile):

| Beat | Trigger | Lines |
| --- | --- | --- |
| Welcome | first boot, after "PRESS START" | COCO: "Bonjour! I am Coco Asphalte. I build tracks." / "You drive them. Fast. Then faster." / "Beat my clock and I pay you in coppers. Allez!" |
| Tips: D1 | first D1 run (non-modal lines, `talk.say(..., { modal: false, auto: 3 })`, at the right moments) | "Hold {gas} to go. Steer with {steer}." / at the CP: "Checkpoints remember you. {respawn} puts you back there." / after a respawn or 25 s: "{restart} starts again. Nobody is watching. Except the clock." |
| Tips: D2 | first kicker | "Jumps need speed. The canyon does not negotiate." |
| Tips: D3 | before the loop | "Loops love speed. Keep your foot down." |
| First medal | first medal ever | "A medal! I knew you were not just a passenger." |
| Puzzles open | event | "I built a track and lost some pieces. Find a way from start to finish. The fastest way wins." |
| Survival opens | event | TEX: "Three ghosts. One road." / GRAVILLON: "Finish last, go home." / BOBO: "Hrrm. Bobo is hungry." |
| Hedgerow opens | event | COCO: "A farmer called. He wants a race track in his cabbage field. I said yes before he finished." |
| Frostpeak opens | event | COCO: "Next: the mountain. The asphalt is frozen. So am I. Allez!" |
| Editor first open | event | "My toolbox. Every block costs coppers." / "A track counts only once you drive it, start to finish." |
| Environment cracked | golds on all 5 races of an env | "You cracked {ENV}. I will need more asphalt." |
| Ending | golds on all 15 | "Fifteen tracks. Fifteen golds. The clock is crying in a corner." / "Now build your own. I will be watching. With a stopwatch." → credits roll |

Results quips (one per result, by medal; random from a small pool with `E.rng`): none — "The clock wins this round.
Again?" · Bronze — "Bronze. The colour of honest effort." · Silver — "Silver! Almost shiny enough." · Gold — "Gold.
Coco approves." · Author — "You beat my own time. Rude. Magnificent." Survival: rank up — GRAVILLON "Not bad. For a
living person."; BOBO "Bobo likes you. Bobo still wins."; elimination — TEX "Go home, rookie. Take the scenic route.";
gauntlet cleared — all three: "...We will haunt you next season." Hot Seat card: COCO "No peeking at the other times."
Boot messages: "Pouring asphalt", "Polishing medals", "Counting coppers", "Teaching cacti to wave", "Warming up the
ghosts", "Inflating the loops", "Hiding the cabbages".

### 8.3 Writing style (TrackMania 2003's)

TrackMania's text is sparse, functional and a little cheeky: menu words, track names, medal messages, almost no
story. Keep that: **UI labels are one or two words in capitals** (RACE, PUZZLE, SURVIVAL, BUILD, MULTIPLAYER, GARAGE,
REPLAYS, OPTIONS, ABOUT; RETRY, NEXT, VALIDATE). **Host lines are at most ~60 characters**, one joke at most, dry, never
mean; a French word now and then (Bonjour, Allez, Voilà, Bof) for Coco only. Track names are two or three words with a
pun or a place (Sunburn Strip, Hay Fever, Yeti Summit). Prompts are verbs (`✕ DRIVE`, `○ BACK`). All strings live in
`data/text.js` with `{gas}`-style placeholders filled from `game.input.label()` (`{steer}` reads "the left stick",
"←/→" or "A/D" by device).

### 8.4 Gibberish voices (`audio/babble.js`)

Animalese-style: each letter of the line is one syllable (55–75 ms by speaker speed). Vowels pick formants (a 800/1200
Hz, e 400/2000, i 300/2300, o 450/800, u 325/700) as two band-pass filters (Q≈6) over the speaker's oscillator;
consonants add a 12–18 ms tick (fricatives s f h z: high-passed noise; plosives b d g k p t: a click); pitch = speaker
base × (1 + 0.15·hash(letter)), rising on "?", falling on "." and "!"-boosted; pauses: comma 120 ms, full stop 220 ms;
spaces 40 ms. Speakers: Coco (triangle, 330 Hz, quick), Drapeau (square, 200 Hz), Tex (pulse12, 240 Hz, nasal Q 9),
Gravillon (sine + triangle, 300 Hz, clipped), Bobo (saw, 120 Hz, slow, growly), crowd (many random short babbles,
random pitches, low volume). The dialog typewriter reveals one letter per syllable so mouths and text stay in sync.
Headless: no-op. Honour mute/volume.

---

## 9. Testing

### 9.1 Headless loader (validated while planning: three r182 and Rapier load and step in Node 24)

```js
// tools/node-env.mjs — the engine, the 3D engine and the game in Node, no browser
import { registerHooks } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const ROOT = fileURLToPath(new URL('..', import.meta.url)), V = ROOT + 'engine/vendor/';
const MAP = { 'three': 'three-0.182.0/three.webgpu.min.js', 'three/webgpu': 'three-0.182.0/three.webgpu.min.js',
  'three/tsl': 'three-0.182.0/three.tsl.min.js', '@dimforge/rapier3d-simd-compat': 'rapier3d-simd-compat-0.19.3/rapier.js' };
registerHooks({ resolve: (spec, ctx, next) => MAP[spec] ? { url: pathToFileURL(V + MAP[spec]).href, format: 'module', shortCircuit: true } : next(spec, ctx) });
vm.runInThisContext(readFileSync(ROOT + 'engine/my-3d2dge.js', 'utf8'), { filename: 'my-3d2dge.js' });  // globalThis.My3D2dge
export const E = globalThis.My3D2dge;
// World3D bakes textures on canvases: hand it the 2D engine's headless stand-in canvas
const standIn = () => { const d = globalThis.document; delete globalThis.document; const c = E.mkCanvas(1, 1); globalThis.document = d; return c; };
globalThis.document = { createElement: standIn, getElementById: () => null, querySelector: () => null, addEventListener() {}, removeEventListener() {} };
await import(pathToFileURL(ROOT + 'engine/my-3d2dge-3d.js').href);                                   // E.World3D, E.THREE, E.RAPIER
export async function makeGame(o = {}) {
  const { createGame } = await import(pathToFileURL(ROOT + 'src/main.js').href);
  const g = await createGame({ headless: true, ...o }); await g.game.booted; return g;                 // { game, api }
}
```
In Node, `new E.Game({ headless: true })` has no screen and skips `draw`; `E.World3D.init(game)` returns after
`RAPIER.init()` without a renderer; worlds build their meshes but never render. Rapier prints a harmless "deprecated
parameters" warning on init — filter it from test output.

### 9.2 The one command

`node tools/test.mjs [suite ...] [--browser] [--hub] [--all]` loads the engine once, runs the suites in-process, and
prints **only** `FAIL <suite>: <check>: <detail>` lines and one summary line (`247 checks, 0 failed, 12.4 s`); exit
code 1 on any failure. `--browser` adds §9.5, `--hub` adds §9.6, `--all` both. Each suite lists the source files it
covers (`covers: ['src/car/**', 'src/track/**']`) so you rerun only what a change touches. Use `game.advance(s)`,
`input.hold/tap/press`, `game.debug.snapshot()` and the `api` handle (load track, place car, run bot, editor
operations, fake AI Hub) — the engine's `game/test.mjs` pattern.

`game.debug.snapshot()` returns at least: `{ scene, page, mode, env, track, run: { phase, steps, cps, cpTotal,
respawns, finished, medal }, car: { x, y, z, kmh, grounded, surface, block, up }, profile: { coppers, medals, unlocked
}, ui: { focus, prompt }, attract, touchGate, hub: { active, phase }, errors: game.errors.length }`.

### 9.3 Suites and what they check

| Suite | Checks (each a named check) |
| --- | --- |
| `turtle` | every track and puzzle program compiles; no overlaps; in bounds; expected CP counts; kicker→landing links; puzzle fixed blocks equal the solution's ST/CP/FN cells; inventories cover the solutions |
| `blocks` | every block type: path is C0/C1 continuous (Δp < 1 cm, Δt < 0.5° between samples), unit t/u, u ⊥ t; mesh has no NaN; Rapier winding normals agree with u (dot > 0.5) and three winding is the reverse; **every link in every shipped track**: port frames match (1 cm, 0.5°) |
| `physics` | (Coyote unless noted) 0→100 km/h in 2.3–3.3 s; reaches ≥ 97% vtop on a long straight; 100→0 braking in 12–22 m; R2 at 90 km/h holds the lane, R2 at 130 km/h and R1 at 80 km/h run wide (they need braking); BR2 holds at 150 km/h; **loop block on full throttle from ≥ 60 km/h: grounded all the way, exits upright; from ≤ 40 km/h: detaches at the top; coasting from ≥ 115 km/h holds, ≤ 95 km/h fails** (re-measure and update these numbers if tuning changes); ice: acceleration capped by traction (≤ 0.35 × asphalt's from standstill); U1 crest at 120 km/h: airborne; kicker at the D2 approach: lands on the landing; wall at 100 km/h at 30°: no penetration, speed kept 40–90%; ice cornering speed < 70% of asphalt's; boost pad adds ≥ 9 m/s; flop recovers upright within 1 s; respawn → at the CP, v = 0, upright; 10 s of identical inputs twice → identical state hash |
| `race` | CPs count once each, in any order, either direction; finish refused before all CPs ("MISSING CHECKPOINT"); clock runs through respawns; restart resets; splits and deltas vs best; medal thresholds from author (1.06/1.2/1.5 with rounding); results rewards paid once per tier; records saved |
| `ghost` | a recorded bot run plays back within 2 cm / 1° of the live car at every sample; encode/decode round trip exact; size < 25 KB/min |
| `bot` | skill 1 finishes all 15 tracks and 6 puzzle solutions with 0 respawns; steps equal `medals.json` (±1); skill 0.8 finishes slower; speed plan reaches every gap's required speed |
| `campaign` | unlock rules (D1–D2 open; next on medal; puzzles/survival/env gates); coppers ledger (rewards, block costs, refunds, packs, patterns); story beats fire once; profile save/load/migrate |
| `editor` | place/rotate/raise/remove with occupancy and costs; refuse overlaps, out-of-grid, unaffordable; kicker reserves its gap; undo/redo 50 random ops returns to the same state and coppers; validate (bot drive) sets author + medals; any edit clears validation; save/load slots; share code round trip; export-as-content output compiles |
| `puzzle` | fixed blocks locked; inventory counts enforced; zone and no-build cells enforced; each reference solution placed through the editor API validates and earns at least Gold at skill 1 |
| `survival` | rival runs deterministic per gauntlet+round; placing rules (+2/+1/0/out); rank names; elimination ends the run; clearing pays once |
| `hotseat` | 3 players × 2 attempts × 2 tracks with scripted bot turns → correct standings and points; pass-the-controller cards between turns |
| `split` | 2 and 4 players: viewports and cameras created and removed; each car finishes; HUD per viewport; no car–car collisions |
| `online` | with a **fake AIHub** object (connect → info, card events, start, time, send/receive, time-up, end, leave): no title/menus; `ready()` once without input; Enter answers ready on our card; ghost messages ≤ 10/s and < 1 KB; progress each second; exactly one `result`; input and sound stop on `end`; outside a session nothing changes |
| `ui` | title → menu → every page reachable by keys only and by simulated mouse clicks (`input.feed`), and back; focus never lost; prompt glyphs switch keyboard ↔ gamepad (PlayStation) ↔ Xbox setting; Dev Mode opens from the pause menu, a slider changes `CFG` live, Reset restores defaults; attract starts after 10 s idle on title and on the main menu, not in the editor; any input exits; touch-only flag shows the gate with Settings |
| `playthrough` | **the whole game, scripted**: fresh profile → welcome beat → all 15 races driven by the bot as the player through the real menus (pressing the real buttons) → medals, coppers and unlocks as designed → the 6 puzzles solved through the editor UI → each gauntlet run (bot at skill 1 clears it) → build and validate a 12-block track in the editor, save, reload, share code → paint a car in the garage → save and reopen a replay → hot seat (2 players) and split screen (2 players) races → golds everywhere → ending beat and credits → final profile matches expectations; 0 engine errors |

### 9.4 Rules for testing

- Keep checks state-based (snapshot fields, profile values, physics numbers). Use screenshots only for looks.
- Rerun a suite only after changing code it covers; run `--all` before each milestone exit and at the end.
- Don't use subagents or workflows to review, judge or audit (TASK.md). Fix the first failure first.

### 9.5 Browser checks (`tools/browser.mjs`, Playwright 1.63 + Chromium; built HTML opened from `file://`)

Launch Chromium with `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist
--autoplay-policy=no-user-gesture-required`. Checks: no page errors or console errors; boot finishes within 60 s;
`window.__crack.snapshot().scene === 'title'`; the canvas is not blank (pixel variance); `?backend=webgl` also boots;
deep links `#race/D3`, `#race/R3`, `#race/S3`, `#editor`, `#puzzle/PD2`, `#survival/hedgerow`, `#split/2/S2`,
`#garage`, `#replay/last`, `#about`, `#lab/physics`, `#lab/blocks` each reach their scene; the bot's D1 and D3 times in
the browser equal `medals.json` (determinism Node ↔ browser); attract starts after 10 s idle and a key press ends it;
a touch-only context (`hasTouch: true, isMobile: true`, 390×844) shows the gate text and the Settings button and runs
attract. Screenshots to `check-output/` for review: title, each environment at a signature spot (D3 loop, D5 canyon
jump mid-air, R3 crossing, S3 drop, Frostpeak lamps), HUD at a CP split, results with a medal, editor with palette,
puzzle zone, survival standings, split screen ×4, garage, replay TV cam, Dev Mode, About. The engine's
`tools/check.mjs` also works on the built file (`node engine/tools/check.mjs <file>#race/D3`) — act on its look notes.

### 9.6 AI Hub harness (`tools/hub.mjs`)

Copy `harness.html`, `bridge.js`, `round.js` and the built HTML (as `game.html`) into `<devfolder>/.hubtest/`;
start `python3 -m http.server 0 --bind 127.0.0.1 --directory .hubtest`, read the port it prints, fetch `game.html`
and confirm its `<title>` is CRACKMANIA (it's ours, not another agent's server); then in Playwright open
`harness.html?game=game.html&players=2&auto=1&limit=45`, wait for `document.body.dataset.complete === 'true'`, require
`window.__hubCheck.pass === true`; repeat with `players=4&latency=150&jitter=50&loss=5&auto=1&limit=45` and with
`&scenario=host-leave`. Print failing checks' names and details. Stop the server by its PID. (The round respects
`info.limitMs`: end the time attack 5 s before it when shorter than 3 minutes.)

---

## 10. Build order and milestones

Each milestone ends with its exit checks green (`node tools/test.mjs <its suites>`), a build, and a short look in the
browser. Do them in order — later ones lean on earlier ones (the bot in M3 is what tests everything after it).

| M | Scope | Exit |
| --- | --- | --- |
| **M0 Foundations** (de-risk first) | dev folder, engine copy (§2.2), engine changes E1–E6, `package.json`, `node-env.mjs`, `test.mjs` skeleton, `build.mjs`; a Dustbowl world (terrain, sky, sun, fog), one straight block mesh, a pen box car, HUD text | headless boot test green; the built single HTML opens from `file://` in headless Chromium with no errors and a non-blank 3D picture under the HUD |
| **M1 Drive** | blocks ST/FN/CP/S/turns/hills; ribbon mesher, cross-sections, base plate, boundary, colliders; CarSim complete (§4.4); far/close/hood cameras; Coyote model; minimal HUD | `physics` (flat, turns, crest, walls, determinism), `blocks` for those types; D1 drivable |
| **M2 Stunts + catalogue** | kicker/gap/landing/chasm, loop + lane assist, boost, banked, crossing, bumps, dirt/ice/snow, supports, rails; turtle compiler; all 15 tracks; `#lab/blocks`, `#lab/physics` | `turtle`, `blocks`, loop/jump `physics` checks; screenshots of every track |
| **M3 Racing** | run rules, gates, respawn/restart, splits, basic results; ghosts; bot; `bake.mjs`; `medals.json` | `race`, `ghost`, `bot` |
| **M4 Worlds and art** | three environments (terrain, sky, plate textures, palettes), Pebble and Moose, paint system, deco + trackside dressing, new shapes, animated props, FX, Drapeau, crowd, gates' boards and lights | screenshots reviewed (§9.5 list); check.mjs look notes handled |
| **M5 Sound** | car synth, SFX, songs, stings, babble | headless no-op verified; manual listen in browser; mute/volume honoured |
| **M6 Front end + campaign** | UI kit, glyphs, prompt bar, title, menus, env/track select, results, profile, unlocks, coppers, story beats, tips, settings, per-scene pause items | `ui` (minus attract/dev), `campaign` |
| **M7 Editor + Puzzle** | editor scene, controls, palette, packs, undo/redo, test drive, validate, slots, codes, export; puzzle mode; 6 puzzles | `editor`, `puzzle` |
| **M8 Modes** | Survival, Hot Seat, Split Screen, Replays, Garage | `survival`, `hotseat`, `split`, replay/garage checks in `ui` |
| **M9 Online** | AI Hub ghost mode, own card | `online`; `--hub` all three runs pass |
| **M10 Shell features** | Dev Mode, attract mode, touch gate, About/Credits, ending + credits roll | full `ui`; `--browser` |
| **M11 Finish** | `playthrough`; balance pass with Dev sliders (re-bake medals); polish; final build; About texts; `exit-interview.json`; final reply | `node tools/test.mjs --all` green; deliverables in place (§12) |

---

## 11. Risks and how to de-risk them

| Risk | Mitigation |
| --- | --- |
| Car physics through loops/jumps feels wrong or is unstable | Build exactly the validated model (§4.4, Appendix A); keep the four-point plane fit, the curvature filter and the 0.06 s detach grace; lane assist on loops; physics tests encode the intended behaviour (fast holds, slow falls); `#lab/physics` and live sliders for tuning; re-bake medals after tuning |
| Bundling three + Rapier + the ESM 3D engine into one file that runs from `file://` | Prove it in M0 before anything else; esbuild plugin resolution; escape `</script`; fallback import map to jsDelivr (allowed) |
| Headless testing of a 3D engine | The loader in §9.1 was run successfully during planning; keep pure logic (track model, CarSim, run, bot, economy, editor ops) free of three.js calls so most suites don't depend on rendering at all |
| Block seams (cracks, bumps, wrong normals at joints) | Shared exact port frames; per-link tests; ribbons sample the exact end points; `#lab/blocks` shows every block in a row |
| Bot can't drive some track (bake, Survival, attract and tests all depend on it) | Route window search (no lane jumping in loops), recovery rules, speed plan that knows gaps; the `bot` suite over all content; skill 1 must finish with 0 respawns — if not, fix the track (add a boost, widen a bend) rather than the bot |
| Node vs browser determinism of baked times | No wall-clock or renderer reads in simulation; same V8 + same Rapier WASM; browser check compares D1/D3 times |
| Editor is clumsy on a pad at 10 feet | Build cursor + palette first in M7 and try: a 10-block track with only the pad in under 2 minutes; mouse parity (hover picks cells); big icons; red/green preview |
| AI Hub conformance | All session code in `modes/online.js`; fake-hub unit suite; the real harness in three configurations; README rules as a checklist |
| Shader stalls on track load / editing | All materials and pen batches (incl. ghost) made at boot; `world.prepare()`; only geometry changes later; dispose old geometries |
| WebGPU vs WebGL 2 | three falls back by itself; test `?backend=webgl`; never read back from the GPU (engine rule) |
| Scope | Build each feature's minimal complete form end to end first (e.g. garage with colours and 3 patterns), then deepen; nothing ships half-done |
| Shared machine, full `/tmp` | Caches and temp files inside the dev folder; only your own PIDs; servers on 127.0.0.1 with an OS port |

---

## 12. Finishing: deliverables, About, exit interview, final reply

- `Crackmania-TrackMania2003-claude-opus-5-5-max-20261103-174810.html` in the root (beside TASK.md), built by
  `node tools/build.mjs` from a clean checkout of the dev folder; opens from `file://` with no errors; passes the hub
  harness; title screen reads **CRACKMANIA**.
- The dev folder holds everything needed to rebuild and retest (`npm install`, `node tools/test.mjs --all`,
  `node tools/build.mjs`); `engine/CHANGES.md` lists E1–E6 and anything else changed, with the reason.
- About/Credits pages and the final chat reply carry the same **Source Information** (Date `2026-11-03 17:48:10`;
  Source `TrackMania (2003, Nadeo)`; Plan `PLAN.md`; Genre and Perspective `Arcade racing (time attack) and
  track-building puzzle; third-person chase camera, orbiting editor camera`; Tech `my-3D2dge v0.85.2 (2D engine + 3D
  engine), three.js r182 (WebGPU/WebGL 2), Rapier 0.19.3, esbuild (build), Playwright 1.63 (tests)`; Art Direction
  `the engine's native low-res toon 3D with ink outlines and code-drawn pixel textures`; Animation `engine rigs, poses,
  tweens and scripts plus code-driven car/prop animation`; Audio `engine chip synth songs, WebAudio car synth, Animalese-
  style gibberish voices`; Online `AI Hub Session Protocol v1, ghost mode`; Testing `headless Node suites with
  game.advance/game.debug, a scripted whole-game playthrough, Playwright checks of the built file, the AI Hub
  harness`; Research `what you actually did`; Environment `Claude Code CLI (headless); Linux; browser unknown`; Model
  `Anthropic, <your model id>, reasoning effort <yours>`; Usage `estimates or "unknown"`) and the answers to the
  **Testing / Engine / Prompt Feedback** questions (TASK.md lists them).
- `exit-interview.json` beside the HTML, in TASK.md's exact shape, every value filled, plain text, checked with
  `node -e "JSON.parse(require('fs').readFileSync('exit-interview.json','utf8'))"`. Suggested `aiHub` block:
  `name` "CRACKMANIA", `tagline` "Crack the clock.", `description` "Block-built stunt tracks, loops and canyon jumps
  against the clock: race, solve track puzzles, survive the Ghost Guild and build your own tracks.", `type` "Game",
  `genre` "Racing", `source` "TrackMania (2003)", `series` "TrackMania", `players` "1–4", `controls` "R2/W gas, L2/S
  brake, left stick/arrows steer, Circle/Enter respawn, Triangle/Delete restart", `tags` ["3d", "arcade", "vehicles",
  "versus", "retro", "low-poly"].
- Final reply: a short summary of the game plus the four information blocks above.

---

## Appendix A — the validated car core (reference code from the planning spike)

Engine units (`U = 16` per metre), z up, `dt = 1/120`. `pw` is TrackPhysics' Rapier world (fixed trimesh colliders
only), `RAPIER` the module (`E.RAPIER`). This exact code produced §4.4's prototype results; §4.4 adds steering, the
grip/drift model, surfaces, boost, walls, flop, landing loss and lane assist on top of it. Vectors are `[x, y, z]`
arrays.

```js
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const add = (a, b, k = 1) => [a[0]+b[0]*k, a[1]+b[1]*k, a[2]+b[2]*k], dot = (a, b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const len = a => Math.hypot(a[0], a[1], a[2]), norm = a => { const l = len(a) || 1; return [a[0]/l, a[1]/l, a[2]/l]; };
// Coyote-like tuning in engine units (cd: 0.0004 per metre = 0.0004/U per unit)
const T = { ride: .55*U, reach: .9*U, A0: 12*U, vtop: 64*U, cd: .0004/U, adhesion: .35*9.81*U, align: 30, mu: 1 };
const WHEELS = [[1.35*U, -.8*U], [1.35*U, .8*U], [-1.35*U, -.8*U], [-1.35*U, .8*U]];   // FL, FR, RL, RR (right = +y)
function probe(c) {
  const r = cross(c.u, c.f), hits = [];
  for (const [lx, ly] of WHEELS) {
    const o = add(add(add(c.p, c.f, lx), r, ly), c.u, U * .5);            // from half a metre above the floor
    const h = pw.castRayAndGetNormal(new RAPIER.Ray({ x: o[0], y: o[1], z: o[2] }, { x: -c.u[0], y: -c.u[1], z: -c.u[2] }),
      U * .5 + T.ride + T.reach, true);
    if (h) hits.push({ point: add(o, c.u, -h.timeOfImpact), normal: [h.normal.x, h.normal.y, h.normal.z], d: h.timeOfImpact - U * .5 });
  }
  return hits;
}
function step(c, ctl, dt, G) {
  const g = [0, 0, -G], hits = probe(c);
  let n = null, d = 0;
  if (hits.length === 4) { n = norm(cross(add(hits[1].point, hits[2].point, -1), add(hits[0].point, hits[3].point, -1))); if (dot(n, c.u) < 0) n = n.map(x => -x); }
  else if (hits.length >= 2) n = norm(hits.reduce((s, h) => add(s, h.normal), [0, 0, 0]));
  if (n) d = hits.reduce((s, h) => s + h.d, 0) / hits.length;
  if (n) {
    const vn = dot(c.v, n), pull = dot(g, n);                              // pull > 0: gravity pulls the car off
    const k0 = c.grounded ? -dot(add(n, c.n, -1), norm(c.v)) / Math.max(1, len(c.v) * dt) : 0;
    c.kappa = c.grounded ? c.kappa + (k0 - c.kappa) * Math.min(1, dt / .04) : 0;
    const vt2 = Math.max(0, len(c.v) ** 2 - vn * vn);
    const aEff = T.adhesion * Math.min(1, Math.sqrt(vt2) / (15 * U));       // adhesion fades out below 15 m/s
    c.load = vt2 * c.kappa - pull + aEff;                                   // normal load per unit mass
    c.slip = c.load >= 0 ? 0 : c.slip + dt;
    c.grounded = c.grounded ? (c.slip < .06 && d < T.ride + T.reach) : (vn < 0 && d < T.ride + T.reach * .6);
  } else c.grounded = false;
  if (c.grounded) {
    c.u = norm(add(c.u, add(n, c.u, -1), Math.min(1, T.align * dt)));
    c.f = norm(add(c.f, c.u, -dot(c.f, c.u)));
    c.v = add(c.v, n, -dot(c.v, n));
    const traction = T.mu * Math.max(0, c.load);                            // what the tyres can pass on (μ·N/m)
    let a = add(g, n, -dot(g, n));
    const sp = dot(c.v, c.f);
    if (ctl.gas) a = add(a, c.f, Math.min(traction, T.A0 * Math.max(0, 1 - (Math.max(0, sp) / T.vtop) ** 1.6)));
    a = add(a, c.v, -T.cd * len(c.v));
    const r = cross(c.u, c.f), vl = dot(c.v, r), maxDv = traction * dt;    // (§4.4's grip model replaces this line)
    c.v = add(c.v, r, -Math.max(-maxDv, Math.min(maxDv, vl * Math.min(1, 12 * dt))));
    c.v = add(c.v, a, dt); c.p = add(c.p, c.v, dt);
    c.p = add(c.p, n, (T.ride - d) * Math.min(1, 25 * dt));
    c.n = n;
  } else {
    c.v = add(c.v, g, dt); c.v = add(c.v, c.v, -T.cd * .3 * len(c.v) * dt); c.p = add(c.p, c.v, dt);
    c.f = norm(add(c.f, add(norm(c.v), c.f, -1), Math.min(1, 1.5 * dt)));
    const r = norm(cross(c.u, c.f)); c.u = norm(cross(c.f, r)); c.n = c.u;
  }
}
// state: { p, v: [0,0,0], f: [1,0,0], u: [0,0,1], n: [0,0,1], grounded: false, kappa: 0, slip: 0, load: 0 }
// Track ribbons are triangles wound so (b−a)×(c−a) points along the surface's up in engine axes; after adding
// colliders, call pw.step() once so ray queries see them.
```

## Appendix B — what was verified during planning (so you can trust it)

| Claim | How it was checked |
| --- | --- |
| The 3D engine, three r182 and Rapier 0.19.3 load and step headless in Node 24 | §9.1 loader run against a copy of the engine files: a terrain `World3D` built, stepped by `game.advance(1)`, `world.hash()` returned, 0 errors |
| The single-file bundle runs from `file://` | §2.7 pipeline, Playwright 1.63 Chromium: booted, WebGL 2, 0 errors, picture drawn |
| The car model holds loops and lands jumps | Appendix A, extracted from this file and run in Node with Rapier trimesh ribbons: loop thresholds and kicker landings as listed under §4.4 "Prototype results" |
| A sprung Rapier rigid body bounces off the loop | Spring-damper raycast wheels on a dynamic cuboid launched into the air at the loop entry at 150 km/h (and bottomed out with strong downforce) |
| Rapier JS result field names | §4.3 list from a probe (`timeOfImpact` vs `time_of_impact` differ by query) |
| All 15 track programs and 6 puzzle solutions fit the grid with no overlaps | a grid walker implementing §6.1's rules |
| AI Hub protocol, metas, harness checks | read from `ai-hub/lib/hub/README.md`, `session.js`, `harness.html`, `examples/ghost.html` at commit f8835e4 |
