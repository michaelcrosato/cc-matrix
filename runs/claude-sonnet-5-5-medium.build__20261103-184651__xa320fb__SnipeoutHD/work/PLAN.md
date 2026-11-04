# SNIPEOUT HD

> *Anti-gravity. Anti-everyone.*

An original anti-gravity combat racer inspired by **Wipeout HD**, built on the my-3D2dge engine (the handoff package
plus its real-3D add-on). This file is the build plan. **TASK.md** is the brief and **PLAN.md** is how to build it. The
builders may be other AI models working without the planner. Every number here is a starting value, unless this file
says a value was checked (the track layouts and jump flights were checked with a script during planning: §4.3, App. C).

**Title.** TASK.md asks for a playful riff on the source's name, picked by a real random number generator. Fifty riffs
were brainstormed (none reuses "Wipeout" itself). One was drawn with Python's `secrets.randbelow(50)`, which reads
OS entropy, and came out as entry 19 of 50: **Snipeout HD**. The title doubles as the league's slang, kept in the
fiction: to be *sniped out* is to lose a race to a weapon in its last few hundred metres. The combat mode is called
SNIPEOUT.

**Names on disk (exact):**

| What | Path (relative to this folder, the one holding TASK.md) |
| --- | --- |
| Dev folder (all source, tests, tools) | `SnipeoutHD-WipeoutHD-claude-opus-5-5-max-20261103-174728/` |
| The deliverable, one HTML file | `SnipeoutHD-WipeoutHD-claude-opus-5-5-max-20261103-174728.html` |
| Exit interview | `exit-interview.json` (beside the HTML) |

GameTitle = `SnipeoutHD` (the title with spaces removed). SOURCE = `WipeoutHD`.

---

## 0. How to use this plan

1. Read §1 (the game on one page), then §2 (architecture), then the system you are building in §3. The content you
   need is in §4.
2. Build in the order in §5. Each milestone has exit tests. Do not start polish (M12) before every feature in §8 exists.
3. A system must be complete before it is pretty. The brief forbids TODOs, placeholders and stubs in the delivered
   demo. A small but complete feature beats a large unfinished one. If you must cut, cut **quantity** (props, lines of
   dialogue, number of songs), never a **feature** listed in §8.
4. The rules from TASK.md that bind every step:
   - Keep all files in the dev folder.
   - Read nothing outside it, except the pinned downloads in §2.1.
   - Never touch other agents' processes or ports. A server binds `127.0.0.1` on port 0 and is stopped by its own PID.
   - Testing runs behind one command (§7).
   - No subagents or workflows to debate, review, judge or audit.
5. **/tmp on this machine is a shared, nearly full tmpfs** (97–99 % used while planning). Point every tool at a temp
   folder inside the dev folder: `TMPDIR=$PWD/.tmp` for Node, Playwright and Chromium. Put downloads in the dev folder
   (`vendor/`, `engine/`), never in /tmp.

---

## 1. The game on one page

**Genre:** anti-gravity combat racing (arcade), with a survival score-attack mode (OVERCLOCK) and a combat-points mode
(SNIPEOUT).
**Perspective:** third-person chase camera behind the craft. This is the default. △ / C cycles it through a near
chase, a far chase and a cockpit (nose) view. A look-back button gives a rear view. Trackside "TV" cameras are used for
the race intros, replays, spectating after elimination, the podium and the attract mode. This is the source's own
camera set, and the right one for a racer at 300–800 km/h.

**What makes Wipeout HD distinctive, and where it goes in Snipeout HD:**

| Source trait | Snipeout HD mechanic / UX |
| --- | --- |
| Hover craft glued to roller-coaster tracks: banks, crests, drops, jumps, tunnels | Track-space hover physics on a banked 3D ribbon, with gap and drop jumps, tunnels and overpasses (§3.1, §3.2) |
| Airbrakes as the core skill | Analog left/right airbrakes (L2/R2, Q/E) for tighter turns and slides, and both at once to brake |
| Pitch control | Nose-down for speed and short jumps, nose-up for crests and long glides |
| Side-shift and barrel roll | Side-shift on the ground (L1/R1, Z/X). A barrel roll in the air gives a boost but costs shield |
| Speed pads and weapon pads | Blue chevron pads boost. Amber pads give a random weapon, weighted by position |
| Absorb | Turn the held weapon into shield energy instead of firing it |
| Shield energy, pit lane, elimination | Energy is lost to walls, weapons and rolls. A green pit strip recharges it. At 0 the craft is eliminated |
| Ten weapons | SWARM, SEEKER, MINEFIELD, CANNON, RAILSHOT, TREMOR, BULWARK, AUTOPILOT, NITRO, SIPHON (§3.4) |
| Speed classes | SPARK → FLARE → STORM → SINGULARITY, each faster (§4.2) |
| Corporate teams, sleek liveries, graphic-design branding, deadpan announcer | Six original teams (§4.1), fictional sponsors, the Authority's race control, a gibberish-voiced announcer that names every pickup |
| Zone mode (survive rising speed in an abstract skin) | OVERCLOCK mode with the neon-grid skin (§3.3) |
| Eliminator | SNIPEOUT mode (points for hits and eliminations, respawns) |
| Electronic soundtrack | Six original synthesized songs that build in layers (§3.10) |
| HD presentation: speed, bloom, 60 fps sheen | World3D's bloom, FOV kick, speed lines, exhaust trails, pixel-perfect HUD |

**Modes (all playable in the demo):** QUICK RACE, SEASON (the campaign, with story), TIME TRIAL (ghost), HOT LAP,
SNIPEOUT, OVERCLOCK, ACADEMY (the tutorial), VERSUS (2-player split screen), REPLAY (from any race's results), ATTRACT
(the demo), and the AI HUB SESSION (online ghost race, inside the hub only).

**Content:** 4 tracks of 3.8–5.0 km, 6 teams with distinct craft, 12 pilots, 4 speed classes, 10 weapons, 6 songs,
10 season events plus a 4-race Grand Prix, an 11-drill academy, an ending.

**Controls.** The controller (DualSense, standard mapping) comes first. The keyboard is native. The mouse drives the
menus and fires.

| Action | Controller | Keyboard / mouse |
| --- | --- | --- |
| Steer | Left stick ←→ (analog), d-pad ←→ | A / D (also ← / →) |
| Pitch nose down / up | Left stick ↑ / ↓, d-pad ↑ / ↓ | ↑ / ↓ |
| Thrust (hold) | ✕ | W |
| Airbrake left / right (analog) | L2 / R2 | Q / E |
| Both airbrakes (brake) | L2 + R2 | S |
| Side-shift (ground) / barrel roll (air) | L1 / R1 | Z / X (or double-tap Q / E) |
| Fire (hold to charge or stream) | □ | Space, left click |
| Absorb weapon | ○ | Left Shift, right click |
| Camera | △ | C |
| Look back (hold) | R3 | B |
| Pause | Options | Esc / P |
| Menus | d-pad / stick, ✕ select, ○ back | arrows or WASD, Enter select, Esc / Backspace back, mouse hover + click |

---

## 2. Tech stack and architecture

### 2.1 Stack (pinned)

| Piece | Version | Where it comes from (download into the dev folder) |
| --- | --- | --- |
| my-3D2dge engine, full edition (runs the game: scenes, input, menus, settings, audio, fonts, rigs, HUD) | v0.85.2 | `https://github.com/michaelcrosato/my-3d2dge/tree/main/dist/handoff`, pinned at commit `4390a9852fe0ad01e1699a160f2a331931bb1a72`. Copy `dist/handoff/` into `engine/handoff/` (the docs `API.md`, `API-INDEX.md`, `AI_GUIDE.md`, `docs/ASSETS.md`, the kits and the tools). The game loads `engine/my-3d2dge.js`, a copy of `dist/handoff/my-3d2dge.js` with the edits in §2.7 |
| my-3D2dge 3D add-on (World3D: the three.js renderer under the game's canvas, terrain, lights, fog, bloom/pixel filters, 3D particles, cameras, split-screen cameras) | v0.85.2 | `https://raw.githubusercontent.com/michaelcrosato/my-3d2dge/4390a9852fe0ad01e1699a160f2a331931bb1a72/engine/my-3d2dge-3d.js` → `engine/my-3d2dge-3d.js`. Its header is its manual: read lines 1–260 |
| three.js (WebGPURenderer, falls back to WebGL 2 by itself) | r182 (`three@0.182.0`) | CDN: `https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.min.js` and `.../three.tsl.min.js` (verified 200, CORS `*`) |
| Rapier (World3D needs it to start; ships do not use it) | 0.19.3 | CDN: `https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-simd-compat@0.19.3/rapier.mjs` (verified: one self-contained ESM with the WASM inlined, default export) |
| AI Hub session client | 1.4.0 | `https://raw.githubusercontent.com/michaelcrosato/ai-hub/f8835e4824fbf9bbb4bac3a35e88e3ab197fdd1e/lib/hub/session.js` → `vendor/aihub-session.js`, **pasted unmodified** |
| AI Hub harness, for tests only, never bundled | same commit | `lib/hub/harness.html`, `bridge.js`, `round.js` → `tests/hub/` |
| Playwright (browser tests only) | 1.63.0 (the handoff's pin) | `npm install` in the dev folder. Chromium 1243 is already in `~/.cache/ms-playwright` on this machine |

**Fetch (verified during planning).** Run from the dev folder. Everything lands inside it:

```sh
mkdir -p .tmp engine vendor tests/hub && export TMPDIR=$PWD/.tmp
git init -q .tmp/my3d && git -C .tmp/my3d remote add origin https://github.com/michaelcrosato/my-3d2dge
git -C .tmp/my3d sparse-checkout set dist/handoff
git -C .tmp/my3d fetch -q --depth 1 --filter=blob:none origin 4390a9852fe0ad01e1699a160f2a331931bb1a72
git -C .tmp/my3d checkout -q FETCH_HEAD
cp -r .tmp/my3d/dist/handoff engine/handoff && cp engine/handoff/my-3d2dge.js engine/my-3d2dge.js
R=https://raw.githubusercontent.com/michaelcrosato/my-3d2dge/4390a9852fe0ad01e1699a160f2a331931bb1a72
curl -fsSL $R/engine/my-3d2dge-3d.js -o engine/my-3d2dge-3d.js
H=https://raw.githubusercontent.com/michaelcrosato/ai-hub/f8835e4824fbf9bbb4bac3a35e88e3ab197fdd1e/lib/hub
curl -fsSL $H/session.js -o vendor/aihub-session.js
for f in harness.html bridge.js round.js; do curl -fsSL $H/$f -o tests/hub/$f; done
```

Why the 3D add-on: Wipeout's identity is three-dimensional (banks, crests, drops, overpasses, a chase camera that rolls
with the track). The handoff's 2D views cannot show that: Mode 7 is flat, and the road module has no true layout. The
handoff README itself points 3D games at this add-on. It keeps the engine's native look: pixel-resolution rendering
(`res: 'pixels'`), its filters, its toon/lambert lighting, its 3D particles, rigs drawn as cards, and the 2D engine's
pixel HUD, fonts and menus on top. Everything else in the game is the handoff engine.

Read in the handoff package: `API.md` (whole), then `AI_GUIDE.md` §Standard features, §Frame order, §Players and
§Testing. Read the World3D header whole. Search `API-INDEX.md` for names; don't read it whole. Useful kits to skim:
`kits/kart.js` (E.Race usage, split screen) and the repo's `src/starter3d/50-racing.js` (World3D racing:
`https://raw.githubusercontent.com/michaelcrosato/my-3d2dge/4390a9852fe0ad01e1699a160f2a331931bb1a72/src/starter3d/50-racing.js`).

### 2.2 Dev folder layout

```
SnipeoutHD-WipeoutHD-claude-opus-5-5-max-20261103-174728/
  package.json            { "type": "module", devDependencies: { playwright: "1.63.0" } }
  index.html              dev page (separate files; serve it: the 3D add-on is an ES module, so file:// can't load it as src)
  engine/
    my-3d2dge.js          the handoff engine + our edits (§2.7), each edit marked  // SNIPEOUT EDIT: <why>
    my-3d2dge-3d.js       the 3D add-on + our edits, marked the same way
    handoff/              pristine copy of dist/handoff (docs, kits, tools) for reference and the tools
  vendor/aihub-session.js the hub client, byte-identical to the pinned file
  src/                    the game: plain scripts (no import/export), loaded in this order (src/manifest.json lists it)
    00-core.js            SN namespace, constants, units, math (vec3, frames), RNG streams, hash, Tune registry, event bus
    01-input.js           SN.INPUT preset, control mapping (input + virtual pad -> ShipControls), double-tap, flick detect
    05-data-teams.js      teams, craft specs, pilots, principals, speed classes
    06-data-weapons.js    weapon definitions and pickup tables
    07-data-tracks.js     the four TrackDefs (§4.3), themes
    08-data-season.js     season tiers, events, Grand Prix, unlock rules
    09-data-story.js      every line of dialogue and announcer callout (§4.5)
    10-data-music.js      the songs and stings (engine tracker format + our extensions)
    11-data-about.js      SN.ABOUT: source info, feedback (feeds the About screen AND exit-interview.json)
    20-track.js           TrackSpline, Track (slices, frames, features, queries, racing line, speed profile)
    25-ship.js            Ship state and the physics step (§3.2)
    27-collide.js         ship-ship collisions
    30-weapons.js         pickups, projectiles, mines, beams, waves, effects on ships, absorb
    35-ai.js              AI pilots (line following, speed control, overtaking, pads, weapons, rubber band)
    40-race.js            Race: lifecycle, laps, sectors, positions, finish, modes' rules, rescue, results
    45-replay.js          input recording, deterministic replay, ghost recording/playback, records
    50-audio.js           synth extensions use, engine hum, SFX catalogue, music director, gibberish voice
    55-glyphs.js          button/key/mouse prompt icons, PlayStation and Xbox sets
    60-render.js          World3D world per track, materials, interpolation, cameras, TV director, split screen
    62-shipkit.js         procedural craft meshes, liveries, animation (flaps, glow, roll), ghosts, explosions
    64-trackmesh.js       track ribbon meshes: surface, walls, neon, pads, tunnels, supports, gantries, overclock skin
    66-scenery.js         theme generators: terrain height/color, buildings, rocks, water, aurora, crowds of props
    68-fx.js              weapon FX, trails, sparks, speed lines, shield flashes, rescue drone, weather
    70-hud.js             race HUD (all modes), split-screen HUD, callouts, name tags, reticles, minimap
    75-ui.js              10-foot widget kit (focus, nav, hover, click, prompts) and every front-end screen
    78-season-ui.js       season hub, briefings (E.Dialog + portraits + voice), GP standings, ending
    80-dev.js             dev mode panel, cheats, sliders, reset, debug overlays
    85-attract.js         idle detection, attract playlist, demo cheats
    90-hub.js             AI Hub session: connect, own card, ghost send/receive, progress/result/time-up/end
    95-main.js            new E.Game, scenes, boot steps, wiring, game.debug
  tests/
    run.mjs               THE one command (§7)
    lib/vm.mjs            loads engine + src/ into a Node vm context (headless game)
    lib/bot.mjs           player bot (drives a human ship through the virtual pad)
    unit/ physics/ race/ weapons/ modes/ flow/ season/ hub/  (Node suites, *.test.mjs)
    browser/*.test.mjs    Playwright suites (bundle loads, renders, screenshots, gamepad stub)
    hub/                  harness.html, bridge.js, round.js (pinned copies) + hub.test.mjs
    out/                  screenshots and reports (git-ignored)
  tools/
    bundle.mjs            builds ../SnipeoutHD-WipeoutHD-claude-opus-5-5-max-20261103-174728.html
    trackcheck.mjs        track validator (App. C algorithm), prints the §4.3 numbers
    medals.mjs            measures the bot's best times per track/class and writes the medal targets (§4.2)
    exit-interview.mjs    writes ../exit-interview.json from src/11-data-about.js and checks it parses
```

### 2.3 The page and the bundle

Script order inside the single HTML file (`tools/bundle.mjs` writes it; everything is inline):

```html
<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<script>/* vendor/aihub-session.js, byte-identical (the hub's rule: first script, right after meta charset) */</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Snipeout HD</title>
<meta name="hub:session" content="1"> <meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost"> <meta name="hub:session-minutes" content="3">
<meta name="hub:session-goal" content="Finish 3 laps first: fastest time wins">
<meta name="hub:session-howto" content="Steer A/D or stick · Thrust W or ✕ · Airbrakes Q/E or L2/R2 · Fire Space or □">
<meta name="hub:type" content="Game"> <meta name="hub:players" content="1-4">
<style>/* as the handoff template: html/body 100%, #stage, #view under #screen, image-rendering: pixelated */</style>
<script type="importmap">{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.min.js",
  "three/webgpu": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.min.js",
  "three/tsl": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.tsl.min.js",
  "@dimforge/rapier3d-simd-compat": "https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-simd-compat@0.19.3/rapier.mjs" } }</script>
</head><body>
<div id="e3-boot">…the handoff template's static boot splash, title SNIPEOUT HD…</div>
<div id="stage"><canvas id="view"></canvas><canvas id="screen"></canvas></div>
<script>/* engine/my-3d2dge.js (classic) */</script>
<script>/* src/*.js in manifest order, concatenated, each prefixed with a  // ==== src/<file> ====  marker (classic) */</script>
<script type="module" onerror="window.__sn3dFail='load'">/* engine/my-3d2dge-3d.js (ES module, inline) */</script>
</body></html>
```

- The game is **classic scripts**. They run first, build the game and call `game.start({ boot })`. The 3D add-on is a
  deferred module, so it finishes later.
- Boot step 1 (`'Waking the 3D engine'`) returns a promise. It polls for `My3D2dge.World3D` every 50 ms, then
  `await E.World3D.init(game)`. If the add-on has not appeared after 30 s, or `__sn3dFail` is set, the step throws
  `Error('The 3D engine could not load (three.js from cdn.jsdelivr.net). Check the connection and reload.')`. The
  engine's boot screen shows that error. Headless (Node), the step returns at once and no renderer is made.
- **Every `src/` file is one IIFE**, `(() => { const E = My3D2dge, SN = globalThis.SN; … })();`. It registers what
  it exports on `globalThis.SN`. Top-level `const`/`let` would collide once the files are concatenated into one
  script, and in the vm context.
- **No file may touch `E.THREE`, `E.TSL` or `E.World3D` at top level.** Only call them inside functions that run after
  the boot step. This keeps every file loadable in Node for the tests.
- The dev page (`index.html`) loads the same files separately. Serve it with
  `python3 -m http.server 0 --bind 127.0.0.1` from the dev folder (note the PID, stop it yourself). Day-to-day checks
  use the bundle, which works from `file://`. The CDN imports work cross-origin: jsDelivr sends
  `Access-Control-Allow-Origin: *`, verified. Chromium treats file:// as a secure context. Wherever WebGPU is missing,
  three.js falls back to WebGL 2 by itself.
- `tools/bundle.mjs` also checks that the inlined hub client equals `vendor/aihub-session.js` byte for byte, that no
  source contains `TODO`, `FIXME`, `XXX` or `placeholder`, and that no `<script src=` remains. It prints the file size.

### 2.4 Units, axes, conventions (bugs hide here: unit-test them first)

- **Engine units everywhere in the sim:** 16 u = 1 m (World3D's `U`). Speeds are u/s, accelerations u/s². Track data
  is written in **metres** and converted once, at load (`×16`). Displayed speed: `km/h = v[u/s] × 0.225`
  (= 3.6 / 16).
- **Axes (the engine's):** x east, y south, z up. This frame is *left-handed*. World3D converts to three.js with
  `toThree(x, y, z) = (x/16, z/16, y/16)`.
- **Angles:** radians from +x toward +y (0 = east, π/2 = south). World3D's camera yaw uses the same.
- **Frames:** for a forward vector `F` and an up vector `U`, **right `R = cross(U, F)`** with the standard cross-product
  formula. Check: F = (1,0,0) east, U = (0,0,1) gives R = (0,1,0) south, which is the right-hand side when heading
  east. Then `U = cross(F, R)`. Write `SN.frame(F, Uhint)` once and unit-test it on 8 headings.
- **Bank:** a positive bank rolls the right edge down. A right-hand turn (heading angle increasing) gets a positive
  bank. Banked `R' = R·cos b − U·sin b` and `U' = U·cos b + R·sin b`. Unit test: in a right turn the right edge is lower
  (`z` of `C + R'·w` < `z` of `C − R'·w`).
- **Time:** the engine's fixed step, 1/120 s (`update(dt)`). The sim never reads wall-clock time. `game.alpha` is only
  for drawing.
- **Randomness:** the sim uses `SN.rng(stream)` (wrapping `E.rng(seed)`), one stream per purpose:
  `race.rng('pickup')` and `race.rng('ai:' + i)`. **Never `Math.random` in the sim.** Cosmetic code (particles,
  confetti) may use it.
- **Track coordinates:** `s` is arc length along the centre line in u, 0 at the start line, wrapping at `L`. `u` is
  lateral, positive to the right (along `R'`). `h` is height above the surface, along `U'`. A ship's race progress is
  `p = lap·L + s`.

### 2.5 Modules and their public surfaces

The sim layer (Node-safe, deterministic): `00-core, 01-input (mapping only), 05–11 data, 20-track, 25-ship,
27-collide, 30-weapons, 35-ai, 40-race, 45-replay`. The presentation layer (browser only, reads the sim, never writes
to it): `50-audio, 55-glyphs, 60–68 render/fx, 70-hud, 75/78-ui, 80-dev (UI side), 85-attract (director side),
90-hub (network side)`.

The sim talks to presentation through **`race.events`**: an array the race clears at the start of each step and fills
during it. Examples: `{ t: 'pickup', ship, weapon }`, `{ t: 'fire', ship, weapon }`, `{ t: 'hit', ship, by, weapon,
dmg }`, `{ t: 'wall', ship, impact }`, `{ t: 'scrape', ship, k }`, `{ t: 'pad', ship, kind }`, `{ t: 'land', ship,
angle }`, `{ t: 'roll', ship, ok }`, `{ t: 'lap', ship, lap, time }`, `{ t: 'finish', ship, place, time }`,
`{ t: 'elim', ship, by }`, `{ t: 'respawn', ship }`, `{ t: 'rescue', ship }`, `{ t: 'wrongway', ship }`,
`{ t: 'lock', ship, target }`, `{ t: 'zone', n }`, `{ t: 'drill', id, ok }`. Presentation reads the events every
step for sounds, particles, HUD callouts and rumble. Tests assert on them.

Key APIs, as a contract the builders keep:

```js
const T = SN.Track.build(SN.TRACKS.solenne)     // throws with a clear message if the data is invalid
T.L; T.slices                                    // slice i at s = i*T.ds (ds ≈ 32 u)
T.frameAt(s, out)                                // { C, F, R, U, w (half width), bank, flags } interpolated
T.surface(s, u, out)                             // { P (surface point), N (normal), wallL, wallR, kind: 'deck'|'gap'|'drop', ceil }
T.locate(P, sHint)                               // local Newton search from sHint -> { s, u, h } (never global)
T.query(x, y, zHint)                             // 2D bucket lookup -> nearest slice with surface below zHint (particles, terrain, cameras)
T.groundBelow(x, y, z)                           // the track surface z under (x, y) below z (via query), else -Infinity: World3D's particleGround
T.line(s) / T.vline(s)                           // AI racing line lateral offset (u) and target speed (u/s) per class
T.features                                       // pads, pit, tunnels, jumps, openEdges, sectors, grid slots, start
const R = new SN.Race({ track: T, mode, cls, laps, seed, entrants, rules })   // entrants: [{ pilot, team, control: 'human'|'ai'|'ghost', input }]
R.step(dt); R.ships; R.events; R.state; R.results(); R.hash()
SN.Ship.step(ship, controls, dt, race)           // the physics step (§3.2)
SN.AI.controls(ship, race) -> ShipControls       // also used by the player bot, autopilot and attract
SN.Replay.record(race) / SN.Replay.play(data)    // deterministic re-simulation
SN.Tune.T.<key>                                  // live gameplay variables (§3.15), SN.Tune.reset()
```

`ShipControls = { steer: -1..1, pitch: -1..1 (+ = nose down), thrust: 0|1, brakeL: 0..1, brakeR: 0..1, fire: bool
(held), firePressed, fireReleased, absorb: bool (pressed), shiftL, shiftR: bool (pressed) }`.

### 2.6 Scenes (engine scenes) and the flow

```
boot steps ──► title ──(10 s idle)──► attract ──(any input)──► title
                 │ (touch-only: notice + SETTINGS button; attract still runs)
                 ▼ START
               menu ──► setup (class → track → team/pilot → laps) ──► loading ──► race ──► results ──► replay
                 │                                                                  ▲        │
                 ├──► season (tiers, events, briefings, GP standings, ending) ──────┘        └──► menu / retry / next
                 ├──► academy (a race mode) · time trial · hot lap · snipeout · overclock · versus (join P2)
                 └──► how to play · settings (engine) · about/credits
AIHub.active ──► session (own card ─► race ─► round over)   (no title, menus or attract)
```

- `race` is the only `pausable: true` scene. It is not pausable in a hub session. Its pause menu is the engine's.
  **`menu.items` may be a function**: the engine calls it each time the pause screen opens and drops falsy entries
  (verified in the engine: `v(this._game.o.menu.items)` then `.filter(Boolean)`), so the items can depend on the
  mode. It has: Resume (engine), **Restart**, **Camera** (cycles), **How to play**, **Dev mode**, Settings,
  Controls, Full screen (engine), and Quit (engine, `quit: 'menu'`; `false` in a session). In Overclock and Hot Lap it
  also has **End run**, which counts as finishing.
- Every scene's `draw(r)` calls `world.draw(r)` for the 3D picture first (the active world: the hangar for menus, the
  track for races and the title), then its 2D UI in `r.overlay`.
- `game.debug = { snapshot(), teleport(s, u), … }` (§7) exposes the state for tests and `tools/check.mjs`.

### 2.7 Engine changes (make them in M0–M2; mark each `// SNIPEOUT EDIT:`)

1. **Button symbols default to PlayStation, and the option lives in Settings.** In `STANDARD_SETTINGS.glyphs`
   (search `glyphs: { group: 'Controller'`): `group: 'Display'`, `value: 'playstation'`,
   `options: [['playstation', 'PlayStation ✕ ○ □ △'], ['xbox', 'Xbox A B X Y']]`.
2. **Font glyphs ✕ ○ □ △** in both pixel fonts (the `G57` 5×7 table and the `GLYPHS` 3×5 table), so `E.font.text`
   can print `input.label()` results. The pretty colored prompt icons are our own (`55-glyphs.js`). These are the
   fallback inside running text.
3. **Analog buttons.** In `Input.tick`, store `this.padValues[i] = b.value` and add
   `input.value(action) → 0..1`: the largest over its bound codes. Keys and mouse give 1 while held. Pad buttons give
   their `value`. Axis codes give the stick magnitude. Tests can set `input._valueOverride[action]`. Airbrakes use it
   (L2/R2 analog).
4. **Synth extensions in `Audio._voice` / `_note`** (search `_voice(p, bus, t0, mul = 1)`). Oscillator voices accept:
   - `lp: { f, q, env, dec }`: a lowpass BiquadFilter at `f` Hz with resonance `q`, opened by `env` Hz that decays over
     `dec` s (acid bass, plucks);
   - `uni: n, det: cents`: n detuned copies (supersaws);
   - `pan: −1..1`.

   Music tracks pass them through: `{ wave: 'saw', lp: {…}, uni: 3, det: 12, pan }`. A note token ending in `!`
   (`'A2!'`) is an accent: louder, and the filter env doubled. Add drum tokens `p` (clap: three 10 ms noise bursts and
   a tail) and `b` (sub boom: sine 55→35 Hz, 0.4 s). Sidechain: `duck: .35` on a drums track dips the music bus by
   that much on every `k` (a 120 ms release). The house and trance songs use it.
5. **World3D particle ground.** In `World3D.draw` (search `g.particles.ground = (x, y, z) => this.level.floorAt`),
   use `this.o.particleGround || ((x, y, z) => this.level.floorAt(x, y, z))`. We pass `(x, y, z) => track surface
   below`, so sparks land on the track, not on the terrain 30 m below.
6. **(If needed) logarithmic depth.** If distant coplanar geometry z-fights, pass `logarithmicDepthBuffer: true` to
   `new THREE.WebGPURenderer` in `init`. Try polygon offset on the decal materials first (§3.7).
7. **Hub rule: Create + Options.** In a session the race is not pausable at all (`pausable: false`), so Options never
   opens our pause. No engine change is needed. Note it in the About screen.

Record every change and its reason in `SN.ABOUT.engineChanges` (shown in About and the exit interview).

### 2.8 Determinism rules

- The sim depends only on the seed, the track and class, the Tune values (snapshotted into each replay), and per-step
  controls. Ships update in grid order and pairs collide in index order.
- `R.hash()` is FNV-1a over the Float32 bits of every ship's `(p, u, h, |v|, energy, lap)` and every projectile's
  `(s, u)`, the same algorithm as World3D's `hashNumbers`.
- Each race records `{ seed, track, cls, mode, laps, entrants, tune, frames[] }`, with `frames` holding the human
  controls per step. Pack them as Int8 steer/pitch, Uint8 brakes, and a bit field. Run-length encode repeated frames.
  Replaying must reproduce `R.hash()` at the end (a test).
- AI uses its own RNG stream. Rigs and particles may use `Math.random` because they never feed back into the sim.

---
## 3. Systems

### 3.1 Track system (`20-track.js`)

**TrackDef (data, metres; §4.3 has all four):**

```js
SN.TRACKS.solenne = {
  id: 'solenne', name: 'PORT SOLENNE', place: 'RIVIERA SPRAWL · MEDITERRANEAN ZONE', tier: 1, theme: 'coast', song: 'solenne',
  width: 28,                       // metres, full width between the walls (per control point override: { w })
  origin: [2048, 2048, 0],         // metres, added to every point (keeps the world inside World3D's terrain square)
  points: [[x, y, z], ...],        // a closed loop in driving order
  widths: { 18: 30 },              // optional per control point width overrides (metres), interpolated between points
  start: 230,                      // metres along the spline from points[0] to the start line (s = 0 after rebasing)
  jumps:  [{ from: 12, to: 14, kind: 'drop', name: 'THE HARBOUR STEP' }],                 // control-point indices
  tunnels:[{ a: { cp: 7, d: 30 }, b: { cp: 9, d: 40 }, style: 'stone' }],
  speedPads:  [{ cp: 1, d: 120, u: 0 }, ...],   // cp + d metres along the track, u metres lateral (+ right)
  weaponPads: [{ cp: 2, d: 80 }, ...],          // a row of three pads across (u = -8, 0, +8), or { u } for one
  pit: { a: { cp: 0, d: 20 }, b: { cp: 1, d: 259 }, side: 'right', w: 8 },
  openEdges: [{ a: {…}, b: {…}, side: 'left' }],  // no wall: a craft can leave the track and fall (rescue)
  banks: [{ from: 15, to: 20, deg: 28 }],         // manual bank over a run of control points (else auto)
  scenery: {...}                                  // theme parameters (§4.3, §3.7)
};
```

**Build (`SN.Track.build(def)`, deterministic, about 10 ms each):**

1. Convert points to u (`×16`, plus the origin). Build a closed **centripetal Catmull-Rom** (α = 0.5) through them:
   App. A, the same code as `tools/trackcheck.mjs`. Sample each segment 64 times, accumulate arc length, then
   **resample at ds = 32 u (2 m)**, giving 1,900–2,520 slices. Record each control point's knot `s` exactly (needed by
   the `{cp, d}` features).
2. Rebase so that `s = 0` is at `start`. Every stored `s` is then `(raw − start) mod L`.
3. Per slice: `C` (centre), `F` (unit tangent from central differences), the plan-view curvature `κ` (signed, from the
   heading change over ±10 m), the width `w` (interpolated per control point; half width `hw = w/2`), the **bank** and
   the frame. Auto bank is `b = clamp(1600 / R_m, 0, 28)°`, signed by `κ` and smoothed over ±40 m (a 120 m radius
   gives 13°, 56 m gives 28°). A manual `banks` entry overrides it with a 60 m blend at each end. Frame:
   `R0 = normalize(cross(Zup, F))`, `U0 = cross(F, R0)`, then rotate both by the bank (§2.4).
4. Features → slice flags and lists:
   - `gap` and `drop` ranges from the jumps;
   - `tunnel` with its ceiling at 12 m;
   - `open` per side; `pit` range and side;
   - pads as rectangles in (s, u): speed pad 8 m long × 6 m wide, weapon pad 6 × 6 m;
   - **8 sectors** at equal s;
   - **grid slots**: 8 slots, 2 per row, rows 16 m apart, the first row 10 m behind the line, at `u = ∓4.5 m`,
     staggered 6 m;
   - **overpasses**: auto-detected exactly as the checker does (App. C), with the clearance stored.
5. **2D bucket grid** (cell 32 m) of slice indices for `T.query(x, y, zHint)`. It feeds particles, the terrain carve,
   scenery placement, trackside cameras and the minimap.
6. Validation (throws with the track id and the reason):
   - length within 1 % of §4.3;
   - every overpass clearance ≥ 12 m;
   - no unintended overlap;
   - every drop has a heading change ≤ 25° and every gap ≤ 10°;
   - no pad in a gap or drop;
   - a weapon pad row fits inside `hw − 1 m`;
   - the pit range has no jump.

**Surface model (`T.surface(s, u)`):**

| Slice kind | Surface point P, normal N | Walls |
| --- | --- | --- |
| `deck` (normal) | `P = C + R'·u`, `N = U'` | at `±hw`, unless the edge is `open` |
| `gap` (a void) | none. The craft is airborne. Below `zLip − 40 m` it is a **fall**, and a rescue follows | none |
| `drop` (step down) | the **lower deck**: flat, at the far edge's height `z1`, following the spline in plan view: `P = (C.x + R'h.x·u, C.y + R'h.y·u, z1 + bank1 tilt)`, where `R'h` is the horizontal part of `R'`, `N = up` tilted by the far edge's bank | at `±hw(s1)` along the plan path |
| `tunnel` | as deck, plus a ceiling at `h = 12 m`: clamp the craft below `12 m − 1.5 m` and cancel its upward velocity | yes |

**`T.locate(P, sHint)`** runs 3 Newton steps: `s += dot(P − C(s), F(s))` (clamped to ±64 u a step, wrapping at L),
then `u = dot(P − C, R')` and `h = dot(P − Psurf, N)`. It is always local to the craft's previous `s`, which makes
overpasses safe: the lower track is never "found" from the upper one. Each craft keeps `s` continuous. Its progress
`p` adds L on each forward wrap and subtracts on a backward one.

**Racing line and speed profile (per track, per class, built at load):**
- *Line:* an elastic band. Start with u = 0 everywhere. Repeat 400 times over all slices:
  `mid = (P[i−1] + P[i+1]) / 2`, `u_i += 0.5·(dot(mid − C_i, R'_i) − u_i)`, clamp `|u_i| ≤ hw_i − 3.5 m`. On a gap
  approach (150 m before the lip to the far edge) pull u toward 0, weight 0.8. That gives the minimum-curvature line.
  Then compute its own plan curvature `κL`.
- *Speed:* `vmax_i = min(top_c, sqrt(alat_c / |κL_i|))`, with
  `alat_c = gripMax_c × 1.15 × skillK` (gripMax is 40 m/s² at SPARK, §3.2; ×1.15 for the airbrakes the AI uses).
  Then a forward pass with
  `a = athr_c·(1 − (v/top_c)²)`, a backward pass with airbrake deceleration `450 u/s² × (top_c/1440)` (28 m/s² at
  SPARK), repeated 3 times around the loop. On a **gap** approach enforce `v ≥ vJump` (1360 u/s = 85 m/s for the
  Karakum gorge, whose checked minimum is 75 m/s). Gap and drop slices ignore curvature.
- These two arrays drive the AI (§3.5), autopilot, the attract mode, the bots in the tests, the medal calibration and
  the TV director's anticipation.

**Minimap:** the plan-view polyline of `C` every 20 m, fitted to a 72 × 72 px box (aspect kept). Overpass upper
sections are drawn last and brighter.

### 3.2 Craft physics and handling (`25-ship.js`, `27-collide.js`)

**State per craft:** `P, V` (world, u and u/s), `F` (heading, unit), the frame `U, R`, `s, u, h, p` (track), `lap`,
`sector`, `grounded`, `airT`, `energy` (0..100), `boostT`, `boostMul`, `weapon`, `charge`, `lockT`, `shieldT`
(bulwark), `autoT`, `rollT` and `rollDir`, `rollDone`, `shiftCD`, `stagger`, `rescueT`, `elim`, `respawnT`,
`finished`, `stats` (hits, kills, wall touches, pads, rolls, best lap…), `prev` (last step's `P`, quaternion; for
drawing).

**Craft constants.** Length 6 m (96 u). Collision is 2 spheres of r = 22 u at ±26 u along F. Hover height
`H0 = 14 u`. Ship half width for the walls: 24 u.

**Class (§4.2) × team stats (§4.1) give the effective numbers.** Stats run 1–10:
- `top = classTop × (0.94 + 0.012·speed)`;
- `athr = 0.55·top × (0.80 + 0.04·thrust)`;
- `steer = 1.9 rad/s × (top/1440)^0.5 × (0.82 + 0.035·handling)`;
- `grip = 5.5/s × (top/1440)^0.5 × (0.82 + 0.035·handling)` (how fast the slide is caught);
- `gripMax = 640 u/s² × (top/1440)^1.5 × (0.82 + 0.035·handling)`: the most lateral acceleration the hover field gives
  (40 m/s² at SPARK). This cap is what makes speed, lines and airbrakes matter;
- `dmgMul = 1.35 − 0.06·shield`;
- `mass = 0.8 + 0.05·shield`.

All of them are also multiplied by the Tune sliders.

**The step** (1/120 s, in this order, for each craft in grid order):

1. **Controls in.** From the human mapping (§3.9), the AI, the replay, the autopilot or the bot. Keyboard steering
   ramps at 6/s toward ±1 so the keys feel analog. The stick passes straight through.
2. **Yaw.** `yawTarget = steer·steerRate·(1 − 0.35·v/top) + (brakeR − brakeL)·airbrakeYaw` (with
   `airbrakeYaw = 1.4 rad/s × (top/1440)^0.5`). `yawRate → yawTarget` at `steerResponse` (9/s). Rotate F about U by
   `yawRate·dt`. While `stagger > 0` (a hit), steering is ignored and the craft wobbles ±0.4 rad/s.
3. **Thrust and drag**, along F:
   - `a = thrust·athr·boostK − cd·v² − coast − brakeDrag`;
   - `cd = athr / top²` (so held thrust settles at `top`);
   - while boosting, `top·boostMul` replaces `top` in `cd` and the thrust is ×1.8;
   - `coast = 40 u/s²` when not thrusting;
   - `brakeDrag = (brakeL + brakeR)/2 × airbrakeDrag × 0.35·top`;
   - slope: add `−300 u/s² × F.z` (downhill speeds you up);
   - pitch: nose-down cuts drag by 3 %·pitch.
4. **Grip and slide.**
   - Split V into the along-F part and the lateral part `vl = dot(V, R)`.
   - The lateral grip available is `gmax = gripMax·(1 + 0.6·max(brakeL, brakeR))`: the airbrake flap works as a
     rudder, which is why airbrakes are the cornering tool.
   - Reduce `vl` toward 0 by `min(|vl|·(1 − e^(−grip·dt)), gmax·dt)`. A turn that needs more than `gmax` (`v²/R`)
     slides outward.
   - **Slip cap:** if the angle between F and V exceeds `slipMax` (35°), rotate F back to 35° from V. The craft
     slides, never spins.
   - **Scrub:** speed `−= scrubK·|vl|·dt` (scrubK 0.35/s). Sliding costs speed.
   - **Side-shift** (a press; grounded; cooldown 0.6 s): a separate lateral velocity `vShift = ±sideShiftSpeed`
     (768 u/s) that decays at `shiftDecay` (12/s), outside the grip cap. That gives about 4 m of sideways jump in
     0.3 s. Thruster puffs.
5. **Hover / air.** Get the surface at the craft's `(s, u)`.
   - **Grounded:** surface present and `h < captureH` (64 u).
     - Spring along N: `aN = k·(Ht − h) − c·vN`, clamped to `[−magnetPull, +900]`, with `k = 220/s²`, `c = 28/s`,
       `magnetPull = 1800 u/s²` and `Ht = H0 − 4·pitch + bob` (bob is `1.2·sin(2.2 t)`).
     - Gravity is cancelled while grounded: the anti-gravity field is the source's fiction.
     - The craft's up vector U slerps to N at 12/s.
     - At crests the spring cannot pull hard enough, so `h` grows past `captureH` and the craft lifts off by itself.
       Ramps launch the same way.
   - **Airborne:** `a = −airGravity·(1 + 0.45·pitch)·Zup` (airGravity 640 u/s² = 40 m/s²). U slerps to the surface
     normal below (if one is within 200 u) or else to Zup at 2/s. `airT += dt`.
   - **Landing** (surface present, `h < H0 + 4`, `vN < 0`): impact angle `θ = atan(−vN / v)`.
     - If `θ > 25°`: energy `−(θ − 25)·0.4·dmgMul`, speed `×(1 − min(0.35, (θ − 15°)/60°))`, and a hard-landing event
       (shake, sparks, a "THUD").
     - Otherwise a soft landing.
     - Either way, resolve the barrel roll (step 7).
   - **Bottoming out:** `h < 5 u` → `h = 5`, `vN = max(vN, 0)`, speed `×0.996` per step, a scrape event.
6. **Integrate** `V += a·dt`, `P += V·dt`. Then `T.locate` → `s, u, h`.
7. **Barrel roll.** Triggers only when airborne with `airT > 0.08 s`:
   - a side-shift press, or
   - a steer flick (steer crosses ≤ −0.7 then ≥ +0.7, or the reverse, and back, within 0.4 s; detected in
     `01-input.js`).

   The roll starts with `rollT = 0.45 s` toward rollDir and costs `rollCost` (10) energy. On landing:
   - a finished roll → boost (`boostMul 1.2`, 1.2 s) + "BARREL ROLL" event;
   - a roll still turning → "BOTCHED": speed ×0.75, energy −5, stagger 0.5 s.

   The visual is a full 360° about F. Long jumps allow several rolls, each costing energy.
8. **Walls** (deck/drop, wall present on that side). `lim = hw − 24 u`. If `|u| > lim`:
   - push P back by `(|u| − lim)` along ∓R';
   - normal speed `vn = dot(V, ±R')`; if `vn > 0`, then `V −= ±R'·vn·(1 + wallBounce)` with `wallBounce` 0.35;
   - tangential scrub: `V −= F·min(v, wallFriction·vn)` with `wallFriction` 0.25;
   - **yaw nudge:** rotate F toward the track tangent by `min(0.5, 0.6·vn/v)` rad (the craft never grinds nose-first);
   - damage `wallDamage·clamp((vn − 150)/120, 0, 12)·dmgMul`;
   - scraping (in contact with `vn ≤ 150`) costs 4 energy/s while `v > 500`;
   - events `wall` / `scrape`.

   **Open edges:** `|u| > hw + 2 m` with no wall means no surface. The craft falls, and a rescue follows (step 11).
9. **Pads and pit** (in track space, grounded only):
   - **Speed pad:** `boostT = min(2.0, max(boostT, padBoostTime))` (0.9 s), `boostMul = padBoost` (1.25). A pad
     re-arms per craft after 0.5 s.
   - **Weapon pad:** if no weapon is held, roll one (§3.4); event `pickup`.
   - **Pit strip:** `energy += pitRecharge·dt` (25/s), a green shimmer FX and a recharge sound loop.
10. **Energy.** Every damage source goes through `SN.Ship.damage(ship, amount, cause, by)`. It applies `dmgMul`.
    `shieldT > 0` (bulwark) or god mode blocks it. Below 25 % a warning plays. At 0 the craft is eliminated (§3.3
    decides between DNF and respawn).
11. **Rescue.** Triggered by:
    - a fall below the kill height (gap: `zLip − 40 m`; otherwise surface − 60 m);
    - leaving an open edge: rescue once the craft is 6 m below the deck, or after 1 s. There is no terrain
      collision, so the fall must end before it would visibly pass through the ground. The terrain carve keeps the
      ground ≥ 10 m below every open edge (§3.7) so the drop reads as a fall;
    - being stuck (`v < 50 u/s` for 3 s while thrusting, outside the countdown).

    The rescue drone lifts the craft back on the centre line at `s_lastGood + 20 m` (the last grounded `s` with
    `|u| < hw`), in 2.5 s with the craft frozen. Energy −10, speed 0, event `rescue`. In OVERCLOCK the rescue costs 20
    energy.
12. **Ship–ship collisions** (`27-collide.js`, after all craft move, pairs in index order): sphere pairs. The craft are
    separated along the contact normal in inverse proportion to mass. Impulse
    `j = −(1 + 0.3)·vn / (1/m1 + 1/m2)`. Damage `0.004·|vn|` each. A `bump` event fires above 120 u/s. Ghost craft
    (hub, dev "ghost AI") skip this.
13. **Launch boost** (countdown): holding thrust raises the revs at 0.6/s; releasing drops them at 0.8/s.
    - At GO, revs in 0.72–0.88 → "PERFECT START" boost (1.0 s, ×1.25).
    - Revs above 0.95 → "STALL" (no thrust for 0.5 s).
    - The HUD shows a rev bar during the countdown.

**Feel targets (checked by the physics tests; tune with the sliders until they hold):**
- 0 → 90 % of top in 2.2–3.0 s (it depends on the THRUST stat: 2.68 s at THRUST 5 by the formula).
- Thrust-only top speed within ±2 % of `top`.
- Lateral grip caps out at `gripMax`. These figures were checked with a 2D model of this exact step during planning
  (KESTREL stats, SPARK, top 328 km/h):
  - full lock with no airbrake, from top speed: path radius 120–150 m over the first second, the nose at the 35° slip
    cap, about 255 km/h after 1.4 s, a slide that settles near 180 km/h if held;
  - full lock with the inside airbrake fully on: radius 45–60 m, about 160 km/h after 1.4 s (the hairpin tool);
  - steady cornering on a 65 m line: about 188 km/h without airbrakes, about 238 km/h with exactly the inside
    airbrake the corner needs.

  The Solenne lighthouse hairpin is taken without a wall touch by the AI at skill 1.
- Side-shift moves the craft about 4 m sideways (768 u/s decaying at 12/s gives 4.2 m).
- Every jump in §4.3 behaves as App. C says, at each class's top speed (gap: clears at ≥ 75 m/s, falls short below
  60 m/s).
- At 3,000 u/s nothing tunnels through a wall or the surface.

**Visual-only motion** (computed in `62-shipkit.js` from the state, never fed back):
- roll = bank + `clamp(yawRate·0.28, ±0.5)` + barrel roll angle;
- pitch = slope + `pitch·7°` + bob;
- airbrake flaps open by `brake·60°`;
- engine glow follows thrust;
- the boost flame lengthens with `boostT`;
- the shield shell flashes on a hit;
- below 25 % energy, damage smoke and sparks.

### 3.3 Race director and modes (`40-race.js`)

**Lifecycle** (`race.state`):

1. `intro`: a 6 s flyover by the TV director (§3.6). The track card shows name, place, length, laps, class. ✕, Enter
   or a click skips it.
2. `grid`: 1.5 s, a chase cam on the player.
3. `countdown`: 3 s with lights (3-2-1-GO) on the start gantry and the HUD, the launch revs and the announcer.
4. `racing`.
5. `finished`: the player crossed the line, or was eliminated.
   - The player becomes a ghost-cam spectator (TV director) while the others finish.
   - After 8 s, or when every craft is done, unfinished craft get an estimated time
     (`t + (remaining distance / their average speed)`) and the results are sealed.
6. `results`: go to the `results` scene.

**Laps and sectors.** A lap counts when the craft crosses `s = 0` forward after passing sectors 1…7 in order. Lap
time, best lap and the final lap's announcer/music layer come from it. **Wrong way:** `dot(F, trackF) < −0.2` and
`v > 300 u/s` for 1.2 s → a HUD warning plus an announcer line.

**Positions:** sorted by `finished` time, then by progress `p`, descending. The order is recomputed every step, with
a "position changed" event for the HUD arrows.

**Elimination:** at energy 0 the craft explodes. In RACE/SEASON it is **DNF** (results show "ELIMINATED"). In
SNIPEOUT, ACADEMY and hub sessions it **respawns** 3 s later at its own `s` on the centre line, with 100 % energy and
2 s of invulnerability (blinking).

**Modes (`rules` objects, one file section each):**

| Mode | Field | Weapons | Rules / win | Medals |
| --- | --- | --- | --- | --- |
| QUICK RACE | 8 craft (player + 7 AI) | on | laps 1–5 (default 3); place = result | gold 1st, silver 2nd, bronze 3rd |
| TIME TRIAL | solo | off (pads dark) | 3 laps; ghost of your best run (§3.13) | per track/class times, measured (§4.2) |
| HOT LAP | solo, flying start (spawn 300 m before the line at 80 % top) | off | unlimited laps; the best lap counts; End run in the pause menu (or 10 laps) | per track/class lap times |
| SNIPEOUT | 8 craft | on, offensive-weighted table, no AUTOPILOT | +1 per hit landed, +3 per elimination, +1 bonus for a RAILSHOT elimination ("SNIPED"); respawns; first to target (10 or 12) or most after 5 min | 1st/2nd/3rd |
| OVERCLOCK | solo, neon skin | off; speed pads off | automatic thrust; zone n every 12 s: `top = SPARK·(0.75 + 0.06·n)`; walls ×1.5 damage; +5 energy per zone cleared; ends at 0 energy | bronze zone 10, silver 20, gold 30, "OVERCLOCKED" 40 |
| ACADEMY | solo (+ drones) | scripted | 11 drills (§4.5), each retried until passed | gold when every drill passed first time |
| VERSUS | 2 humans + 6 AI, split screen | on | race or snipeout, as above | per player |
| SEASON event | as its mode | as its mode | the event's target | the event's medal rule |
| GRAND PRIX | 8 craft × 4 races | on | points 10-8-6-5-4-3-2-1; DNF 0; ties by best finish | champion = gold, 2nd = silver, 3rd = bronze |
| HUB SESSION | each copy: own craft + 7 AI; other humans as ghosts | on | 3 laps FLARE on a seeded track; elimination respawns; `AIHub.result({ time })` | the hub's standings |

**Results data** (`race.results()`): place, pilot, team, time or gap, best lap, points (GP/SNIPEOUT), DNF, medal for
the player, new records, and unlocks triggered (season).

### 3.4 Weapons and pickups (`30-weapons.js`, `06-data-weapons.js`)

Projectiles live in **track space**: `s, u, h` and `vs, vu`. They follow the track through curves, the way the
source's weapons hug it. Each step they advance and wrap with `s`. They hit a craft when `|Δs| < 40 u`, `|Δu| < 34 u`
and `|Δh| < 40 u`. They hit a wall at `|u| > hw` (they explode). In gaps they fly straight on and expire. Every hit
goes through `SN.Ship.damage` and emits `hit`. The 3D FX are in `68-fx.js`.

| Weapon (icon colour) | Fire | Behaviour | Damage / effect | Absorb |
| --- | --- | --- | --- | --- |
| **SWARM** (red) | tap | 3 rockets, lateral spread −1.5/0/+1.5 m growing at 120 u/s, speed `v_ship + 2400`, life 1.4 s | 10 each, jolt (speed ×0.9, stagger 0.2 s) | +16 |
| **SEEKER** (orange) | lock: hold the target ahead in a 25° cone within 3000 u for 0.6 s ("LOCKED" tone), then press | homing missile, speed `v + 2000`, steers u toward the target at 900 u/s, `s` speed matched to catch up; unlocked it flies straight | 24, spin-out stagger 0.5 s | +22 |
| **MINEFIELD** (magenta) | tap | drops 5 mines behind at 0.12 s intervals (`u` at drop, `s − 60 u`); armed after 0.3 s; live 30 s; trigger radius 40 u | 12 each, jolt | +18 |
| **CANNON** (yellow) | hold | 24 bolts at 12/s, speed `v + 4200`, ±0.5 m jitter, aim assist toward a target within ±1.5 m | 2.5 per bolt | +14 |
| **RAILSHOT** (white/cyan): the *snipe* | hold to charge 0.8 s (ring on the HUD), release to fire | hitscan along the track ahead to 4000 u. It hits the first craft within ±32 u of the aim line `u_aim(Δs) = u + Δs·tan(heading vs track)` (aim assist: ±16 u extra if charged fully). A beam is drawn in 3D | 34, big jolt; an elimination by RAILSHOT is a "SNIPED!" | +28 |
| **TREMOR** (green) | tap | a wave rolls forward along the surface from the user, full width, at `v + 1800` for 1.3 s. It hits each **grounded** craft it passes (airborne craft dodge it) | 26, pops the craft up 3 m, stagger 0.4 s | +30 |
| **BULWARK** (blue) | tap | invulnerable for 4 s (walls too); no pickups meanwhile | blocks everything | +12 |
| **AUTOPILOT** (teal) | tap | the AI drives for 5 s (skill 1.0); the HUD counts it down; ends early after a rescue | — | +10 |
| **NITRO** (amber) | tap | boost 2.2 s, `boostMul 1.35`, thrust ×2 | — | +10 |
| **SIPHON** (lime) | tap: it latches onto the nearest craft ahead by itself | beam to the nearest craft ahead within 1500 u (along the track) for 3 s; breaks beyond 1900 u | drains 9/s from the target into you | +20 |

- **Absorb** (○ / Shift / right click): consumes the weapon and adds its absorb value × the `absorbMul` slider.
- **One weapon at a time.** A pad gives nothing while a weapon is held, or while BULWARK or AUTOPILOT runs.
- **Pickup roll:** weighted by position. Pick the table by `pos ∈ {1,2}` front, `{3..5}` mid, `{6..8}` back, then
  apply `pickupLuck` (0 = uniform, 1 = table, 2 = table squared).

  | | SWARM | SEEKER | MINE | CANNON | RAIL | TREMOR | BULWARK | AUTO | NITRO | SIPHON |
  | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
  | front | 2 | 1 | 4 | 3 | 1 | 0 | 3 | 0 | 1 | 1 |
  | mid | 3 | 3 | 2 | 2 | 2 | 1 | 2 | 1 | 2 | 2 |
  | back | 2 | 3 | 1 | 1 | 2 | 3 | 1 | 3 | 3 | 2 |
  | snipeout | 3 | 3 | 2 | 3 | 3 | 2 | 2 | 0 | 1 | 2 |

  The HUD plays a 0.5 s slot-machine spin, then the announcer says the name. Rolls use `race.rng('pickup')`.
- **Warnings for the target:** a seeker lock beeps at the target and shows "LOCK" with an arrow at the bottom centre.
  A railshot charging aimed at you shows a thin red line.

### 3.5 AI pilots (`35-ai.js`)

Each AI craft produces `ShipControls` every step from the track's line and speed arrays and the race state. The same
function drives AUTOPILOT, the attract mode, the player bot in tests, and the medal calibration.

1. **Look-ahead target.** `sL = s + 0.55 s·v + 300 u`. Target point `Q = C(sL) + R'(sL)·uTarget(sL)`.
   - `uTarget` = racing line `T.line` + avoidance offset + pad bias + pit bias.
   - Heading error `e` = the signed angle from F to `(Q − P)` projected on the surface plane.
   - `steer = clamp(2.2·e + 0.25·ė, −1, 1)`, plus seeded noise ±(0.05·(1 − skill)).
2. **Speed.** `vT = T.vline(s + 0.4·v)·skillK` (skillK = 0.86 + 0.14·skill, also scaling `alat`).
   - thrust if `v < vT·1.01`;
   - both airbrakes if `v > vT·1.05`;
   - the inside airbrake (the side of the turn) at `clamp((v²·|κL| − gripMax) / (0.6·gripMax), 0, 1)`, which is
     exactly the extra grip the corner needs, plus `clamp((|e| − 0.12)/0.28, 0, 1)` when the heading error is large;
   - pitch: nose-down on descents steeper than 4 %, nose-up on crests (vertical curvature) and over gaps when short of
     the landing.
3. **Avoidance and overtaking.** A craft ahead within 900 u with `|Δu| < 70 u` and closing → shift `uTarget` by
   ±110 u toward the wider side (blend 0.6 s). It returns to the line after passing. Mines seen ahead (within 1200 u)
   push `uTarget` away by 80 u. A side-shift dodges incoming weapons when skill > 0.7 (reaction 0.25 s).
4. **Pads.** A speed pad within 1500 u ahead and within 120 u of the line → bias `uTarget` onto it (skill-weighted).
   Weapon pads likewise when unarmed. Pit: if energy < 30 % and the pit is ahead within 2500 u → the pit line.
5. **Weapons (per weapon):**
   - SWARM, CANNON: a target ahead within 1800 u and `|Δu| < 60 u`.
   - SEEKER: fire when locked.
   - RAILSHOT: charge when a target is within 3500 u and `|Δu_aim| < 40 u`; release at full charge.
   - MINEFIELD: a craft behind within 1200 u, or simply in the last 30 % of a lap when leading.
   - TREMOR: ≥ 2 craft within 2500 u ahead.
   - BULWARK: a lock warning, or energy < 35 % in traffic.
   - AUTOPILOT: in a technical section (`|κ|` high) or with energy < 40 %.
   - NITRO: on a straight (`|κL| < 1/600 m` for the next 400 m).
   - SIPHON: a target ahead within 1400 u and own energy < 85.
   - Absorb instead when energy < 30 % and the weapon is defensive or useless at that moment.
   - Each pilot's `aggression` (0.4–1.3) scales reaction thresholds and hold times.
6. **Jumps.** Hold `v ≥ vJump` on gap approaches. Barrel roll when the predicted airtime is > 0.6 s, energy > 50 %
   and skill > 0.6, at chance `0.5·aggression` (attract: always).
7. **Mistakes.** For each corner (κ peak), a chance `(1 − skill)·0.15` to brake late by 0.25 s (it may scrape a wall).
8. **Rubber band** (Quick Race, Season, Versus; never Time Trial/Hot Lap/Overclock):
   `top ×= 1 + rb·clamp((p_player − p_ai)/32000, −1, 1)·0.04`, with rb from the difficulty (Easy 1.5, Normal 1.0,
   Hard 0.3) times the `aiRubberBand` slider.
9. **Difficulty** (Settings → Difficulty):

   | | AI skill | aggression | rubber band |
   | --- | --- | --- | --- |
   | Easy | 0.86 | ×0.6 | 1.5 |
   | Normal | 0.93 | ×1.0 | 1.0 |
   | Hard | 0.99 | ×1.3 | 0.3 |

   Each pilot has an offset (§4.1). NULL//SET pilots get +0.02.
10. **Attract cheats.** The AI may cheat freely in attract (TASK.md): infinite energy, pickups forced in rotation so
    all 10 weapons appear, a barrel roll on every jump, aggression 1.5.

### 3.6 Cameras and the TV director (`60-render.js`)

The World3D camera runs in **`'fixed'`** mode. We compute a pose `{ x, y, z, yaw, pitch, roll, fov }` (engine units,
radians; `pitch < 0` looks down) every step into `camera.fixed`. In `onDraw` we **interpolate** between the last two
step poses with `game.alpha` and write `world.camera.pose` (the header allows "a last touch to camera.pose"). Craft
meshes are interpolated the same way (`prev` → current). Set `camera.target = { x, y, z }` to the player craft so the
sun's shadow box follows it.

| Camera | Pose |
| --- | --- |
| **Chase** (default) | eye = `P − Fs·d + Us·hgt`, where `d = camDistance·(1 + 0.15·v/top)` (150 u) and `hgt = camHeight` (46 u). Look at `P + F·120 + U·12`. `Fs`, `Us` are F and U smoothed by slerp at `camLag` (8/s), so the camera swings, never cuts corners. `Us` blends from Zup toward the craft's U at 0.6, so the horizon tilts with the banks. `fov = camFov + camFovBoost·(v/top)²` (72° + 16°) + 6° while boosting. Shake from `game.shake` (impacts, rail hits, landings) |
| **Far chase** | d ×1.5, hgt ×1.6, fov −6° |
| **Cockpit** | eye = `P + F·20 + U·14`, look along F, full craft roll, fov 84° + boost. The craft mesh is hidden except a nose/canopy-rim "dash" mesh |
| **Look back** (held) | the chase eye mirrored in front of the craft looking back (`P + F·d + Us·hgt` → P) |
| **Free fly** (dev) | WASD/stick fly, Q/E or triggers up/down, mouse/right stick turn |
| **Podium / hangar orbit** | an orbit around a point (menus, results podium) |

Roll sign: verify with a screenshot on Karakum's spiral, a right-hand banked turn. The horizon must tilt the way the
track does. If it is inverted, negate the roll in one place (`SN.cam.rollSign`).

**TV director** (intro flyover, attract, replay, spectating, podium intro):
- **Camera spots** are built at load every ~200 m. Each is `C(s) + R'·side·(hw + 15…30 m) + Zup·(6…20 m)`, on the
  outside of curves, alternating sides on straights. Skip a spot if the terrain (`world.ground`) is above it, or if it
  is inside another track section (`T.query`). Tunnel spots go 2 m under the ceiling, 4 m from the wall. Overpass
  spots look up from the lower deck. Each spot stores `s`.
- **Shots:**
  - `trackside`: fixed eye, looking at the target, with the FOV narrowing (40→20°) as the target nears;
  - `heli`: 40 m up, 60 m back, following;
  - `chase`;
  - `nose`;
  - `low`: 1 m above the surface ahead, looking back at the target;
  - `flyby`: along the line 30 m ahead of the target, looking back.
- **Logic:**
  - target = the player (spectate/replay) or the most interesting craft (attract: leader, a close fight within 300 u,
    a weapon fired in the last 2 s, a jump);
  - pick the spot 150–900 u ahead of the target with a clear line (raycast against the track only), hold 2.5–6 s, and
    cut when the target passes the spot by 400 u;
  - every third cut is heli, chase, nose or low;
  - events cut early: an elimination, a railshot or a jump launch;
  - never cut twice within 1.2 s.
- **Intro flyover:** 6 s along the line from `s = −900 m` to the grid at 2.5× the target speed, then a 1 s whip onto
  the grid.

### 3.7 Rendering (`60-render.js`, `62-shipkit.js`, `64-trackmesh.js`, `66-scenery.js`, `68-fx.js`)

**Worlds.** `World3D.init(game)` runs once (boot). Then:
- **Hangar world**, made at boot. A small `level` (text rows):
  - a 24 × 16 tile hall: floor `{ floor: 0 }`, a turntable `{ mark: 'turntable' }` and a podium of three raised floors
    (`{ floor: 24 }` 1st, `{ floor: 16 }` 2nd, `{ floor: 8 }` 3rd, marks `p1 p2 p3`);
  - no torch tiles (`torchLights: 0`); our own lights: 3 coloured `world.light`s plus team-coloured neon strips
    (our meshes);
  - camera `'fixed'`, `fog: false`.

  It is used by the menus, team select (the craft on the turntable), results/podium (pilots as rig **cards** via
  `world.hero({ rig })` posed `cheer` / `wave` / `hips`) and the ending.
- **Track world**, one per track, made by the `loading` scene. At most one is alive besides the hangar: dispose the
  previous with `world.dispose()`. Boot makes PORT SOLENNE's, so the title and attract start at once.

```js
new E.World3D(game, {
  terrain: { size: 65536 /* 4 km */, height: theme.height, color: theme.color, far: 26000, cell: 64, rock: theme.rock, bottom: -3000 },
  sky: theme.sky, fog: theme.fog, ambient: theme.ambient, sun: Object.assign({ shadow: true, area: 900 }, theme.sun),
  torchLights: 0, lights: 4, glowLights: 8, shadows: game.settings.shadows3d !== false,
  filter: { look: game.settings.filter3d || 'clean', bloom: game.settings.bloom !== false },
  camera: { mode: 'fixed', far: 26000, near: 4 }, particleGround: (x, y, z) => track.groundBelow(x, y, z),
  onDraw: (w, r) => SN.render.onDraw(w, r)
});
```

**Terrain carving.** `theme.height(x, y)` = the theme's natural height, combined with a **corridor grid** (cell 16 m,
built from the slices at load):
- near the track: `min(natural, deckZ − clearance(d))`, where `clearance` grows from 3 m at the edge to 0 at 60 m, so
  the ground falls away under elevated decks and meets the track at grade;
- under tunnel slices: `max(natural, ceilZ + 4 m)`, so the rock covers the tunnel;
- portal frames hide the seams.

Keep `height()` fast: it is a few grid lookups and noise (`E.noise2`).

**Materials** (make them all when the world is made, never mid-race):
- `MeshLambertNodeMaterial({ vertexColors: true })` for the track surface, walls and scenery;
- `MeshBasicNodeMaterial` for emissive neon, pads, engine glow and beams. They are bright, so the bloom catches them.
  Set `fog: false` on the overclock skin;
- `MeshToonNodeMaterial` for the craft hulls;
- transparent additive materials for the shield shells, ghosts and beams.

Textures are canvases drawn pixel by pixel at 64–256 px (`NearestFilter`, the engine's native crisp look): track
panels, lane dashes, chevrons, sponsor boards, team logos, window grids. **Pads and painted markings** use
`polygonOffset` (factor −2, units −2) and sit 1 u above the surface. That avoids z-fighting at distance.

**Track meshes** (`64-trackmesh.js`), built in chunks of 40 slices (80 m) for frustum culling:
- **Surface:** 6 lateral strips. Vertex colours: dark graphite panels `#22252c`/`#2a2e36` alternating every 8 m,
  bright edge lines, centre dashes, a tint per theme. The grid boxes and the start/finish chequer are painted near
  `s = 0`.
- **Walls:** 1.6 m barrier panels with a glowing top strip in the theme's neon (`#29c8e8` coast, `#ffb347` desert,
  `#ff3ab4` city, `#7af0ff` arctic). On the outside of curves, **directional chevrons** (emissive arrows pointing the
  way of the turn) every 6 m. Open edges have no wall but a dashed hazard line on the edge.
- **Underside and supports:**
  - the deck's underside and thickness (1.2 m), so the deck reads as a bridge;
  - pylons every 40 m where the deck is more than 4 m above the terrain, at the deck edges; skipped where they would
    stand in another section's driving envelope;
  - overpass decks get piers outside the lower deck's walls.
- **Tunnels:** a 10-segment arch to 12 m, ribs every 12 m, emissive light strips along both upper sides, portal
  facades by style (stone arches, neon frames, ice). Three world lights follow the player through tunnels (warm,
  cool, theme).
- **Pads:**
  - speed pad: an 8 × 6 m quad with 3 chevrons whose colours cycle front to back at 6 Hz (the pad meshes' colour
    attribute rewritten each frame, `needsUpdate`), cyan `#3ad8ff`;
  - weapon pad: a 6 × 6 m amber `#ffb000` quad with a pulsing triangle sigil and a light post at the edge;
  - pit strip: green `#3aff8a` with "+" marks and a gantry sign PIT.
- **Gantries:** the start/finish gantry has the 3-light start lights (red → green), a timing board (canvas texture
  showing the race time) and team flags. Sponsor gantries go every ~350 m over the track. Each track also has a
  landmark arch.
- **Drop and gap edges:** the lip face (a vertical face), the far-edge face, and a hazard stripe painted on the lip.
- **Overclock skin:** a **separate world** that the `loading` scene builds for OVERCLOCK runs (and the attract's
  overclock segment), so no fog or sky changes are needed at runtime:
  - theme `overclock`: black sky, black fog close in (near 2400 u, far 9600 u), flat black terrain at −400 m, no
    scenery;
  - the same track chunks built with the overclock materials: a black surface with an emissive grid (lines every 4 m)
    and neon wall lines;
  - each zone changes only the materials' colour, `hsl(zone·37°, 100%, 60%)` (no new materials, so no shader builds);
  - sky colour pulses on the beat; bloom up.

**Craft (`62-shipkit.js`)**, built from code as BufferGeometry, flat-shaded, 200–600 triangles each:
- **Hull:** lofted through 6 cross-sections (an octagon scaled per section, from the needle nose to the tail), with
  per-design profiles;
- **canopy:** dark glossy, with an emissive rim;
- **wings:** flat wedges, swept, with team-coloured tips;
- **fins:** 0–2;
- **engine pods:** 1–3, cylinders with emissive inner discs (team engine colour);
- **airbrake flaps:** 2 hinged boxes at the rear sides (rotate);
- **livery** by vertex colour per part (primary, secondary, accent stripe), the race number, and the team logo
  (a 32 px canvas decal on the top);
- **exhaust trail:** a ribbon of the last 0.35 s of tail positions, alpha fading, team colour;
- **boost flame:** a cone that grows;
- **shield shell:** an ellipsoid at opacity 0 that flashes to 0.6 on a hit, bulwark-blue for BULWARK;
- **explosion:** 8 hull shards flying ballistically for 1.5 s, plus `particles.explosion` and a light flash;
- **rescue drone:** a 4-rotor drone mesh with a tractor beam cone.

The six designs are in §4.1. **Ghosts** (hub players, time-trial ghost) use the same mesh in a transparent additive
material (opacity 0.35) tinted with the seat or ghost colour, plus a name tag.

**Effects (`68-fx.js`)**:
- wall sparks via `game.particles.sparks` at the contact point;
- dust and spray on landings (`dust`; water spray at Solenne and Borealis);
- weapon visuals: rocket meshes with smoke trails, the seeker's spiral trail, mines (spinning spheres, blinking red),
  cannon tracers, the rail beam (a 0.6 m white-cyan cylinder fading over 0.4 s, plus a screen flash), the tremor wave
  (a glowing band of quads riding the surface), the bulwark hex bubble, the autopilot ring, nitro flames, the siphon
  zigzag beam;
- **speed lines** in the HUD (screen-space streaks from the centre, density ∝ `(v/top)²`, more while boosting);
- weather: Borealis snow (instanced flakes near the camera), Karakum heat-haze dust, Meridian light rain (streak
  particles), Solenne sea spray.

**Split screen.** `game.splitScreen(2, { layout: 'rows' })` with `world.addCamera({ mode: 'fixed', far: 26000 })`.
Each viewport's `camera.fixed` is set from its own player's chase or cockpit cam. World3D turns filters off while
split, which is expected.

**Warm-up.** In `loading`, after everything is built, do one hidden frame with every pooled mesh visible in front of
the camera (each weapon FX, both skins, ghosts), call `world.prepare()`, then hide them. No shader stalls mid-race.

### 3.8 HUD (`70-hud.js`): pixel art at game resolution, anchored to `r.W × r.H`

Layout at 427 × 240 (16:9; everything is anchored and scales with `HUD size`):
- **Top left:** POSITION as a big number (`E.font.title`, scale 4) plus `/8` small. LAP `2/3` below it. In SNIPEOUT
  this is the points table (top 4) instead.
- **Top centre:** the race time `1:23.45`. On a lap: the lap time with ±delta vs best (green/red), held 3 s.
  "FINAL LAP" banner.
- **Top right:** the minimap (72 px), craft as team-coloured dots, the player blinking, ghosts hollow.
- **Bottom left:** the weapon slot. A 24 × 24 pixel icon per weapon (§4.4), its name, and prompts `□ FIRE  ○ ABSORB`
  drawn with the glyph icons (§3.9). The pickup roll spin. The railshot charge ring. The autopilot/bulwark countdown.
- **Bottom right:**
  - speed: a segmented bar of 24 segments, cyan → white → magenta in boost, with km/h at scale 2;
  - energy: 20 segments, green > 50 %, yellow > 25 %, red and blinking below; it shakes on damage; "PIT" hint when
    low;
  - the boost indicator.
- **Centre:**
  - the countdown digits (scale 6, pop tween);
  - the rev bar during the countdown;
  - **callouts:** weapon names, PERFECT START, BARREL ROLL, SNIPED!, ELIMINATED, WRONG WAY, PERFECT LAP, NEW RECORD,
    ZONE n. They pop with scale and alpha, last 1.2 s, and stack at most 2;
  - the lock reticle on the projected target (`world.project`), a rotating bracket that turns red when locked;
  - the incoming-lock arrow at the bottom centre.
- **Name tags:** pilot name and position above craft within 2500 u (projected), fading with distance.
- **Radio box:** a small portrait (`rig.drawPortrait`, 28 px) and a subtitle line at the top left under the position
  for pilot banter and the announcer (§3.10).
- **Split screen:** per viewport a compact HUD (position, lap, speed, energy, weapon) via `r.viewport`. Countdown and
  results go over the whole screen in `scene.hud(r)`.
- **Overclock:** ZONE number (scale 4), the zone progress bar (12 s), speed, energy. No position or lap.
- **Hub session:** the ghost players' names and live positions.
- The HUD stays clear of `game.cornerArea()` when the corner shows (it is hidden in play).

### 3.9 Front-end, UI and UX: 10-foot and controller-first (`75-ui.js`, `55-glyphs.js`, `01-input.js`)

**Rules for every screen** (TASK.md: a TV at 10 feet, no dense web-style data screens):
- At most 6 focusable items per screen.
- Labels at font scale ≥ 2 (14 px of 240). Titles at scale 3–4. Body text at scale 2, at most 3 lines.
- One focus at a time. It is drawn as a thick animated chevron frame plus a colour shift plus a 1 px "scanline"
  shimmer. It is never shown by colour alone (TASK and engine rule).
- Navigation:
  - d-pad, stick or arrows (WASD too in menus) move the focus, with `input.repeat` when held;
  - ✕, Enter or Space confirms; ○, Esc or Backspace goes back;
  - L1/R1, Q/E or the mouse wheel switch tabs or pages;
  - **mouse hover moves the focus**, a left click activates, and every screen has a clickable BACK chip at the bottom
    left.
- **A prompt bar** at the bottom of every screen shows the actions for the **last device used**
  (`input.lastDevice`):
  - gamepad: glyph icons;
  - keyboard: keycaps;
  - mouse: mouse icons (left click SELECT, BACK chip).

  It switches the moment another device is touched.
- **Glyph icons (`55-glyphs.js`):**
  - **PlayStation** (the default): ✕ blue `#7cb2e8`, ○ red `#ff6b6b`, □ pink `#ff79c6`, △ green `#3fd8a6`, drawn in
    dark discs of 11 px; L1/R1/L2/R2 as rounded tabs with text; Options and Create as pill icons; the d-pad and stick
    as small icons.
  - **Xbox** (Settings → Button symbols): A green, B red, X blue, Y yellow; LB/RB/LT/RT; Menu and View.
  - **Keyboard:** keycaps sized to the label from `input.label(action, 'keyboard')`.
  - **Mouse:** a mouse with the left or right button lit.

  `SN.glyph.draw(g, action, x, y, { device })` returns the width drawn. **Never hard-code key names.** Always go
  through `input.label` and the actual bindings (rebinding works).
- Animations: menu tiles slide in with `game.tween` (0.18 s, `outBack`), focus chevrons pulse, background light
  streaks drift, and screen changes use the engine's `'wipe'` fade (0.25 s).

**Input mapping (`01-input.js`).** The game's preset, in this order (the order matters for the engine's half-keyboard
split, §3.16):

```js
SN.INPUT = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  start: ['Enter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'], confirm: ['Enter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'],
  thrust: ['KeyW', 'Pad0'], fire: ['Space', 'Mouse0', 'Pad2'], absorb: ['ShiftLeft', 'Mouse2', 'Pad1'],
  brakeL: ['KeyQ', 'Pad6'], brakeR: ['KeyE', 'Pad7'], camera: ['KeyC', 'Pad3'], shiftL: ['KeyZ', 'Pad4'], shiftR: ['KeyX', 'Pad5'],
  brake: ['KeyS'], lookBack: ['KeyB', 'Pad11']
};
```

- In a race, **steer and pitch are not read from up/down/left/right as actions**:
  - steer = `input.padMove[0]` (analog) + digital A/D/←/→/d-pad (ramped);
  - pitch = `−input.padMove[1]` + ↑/↓/d-pad (stick up = nose down).

  W and S are therefore only thrust and brake in a race, while still moving the menu focus elsewhere.
- Airbrakes: `max(input.value('brakeL'), down('brake'))` (analog L2/R2 via engine edit 3).
- Double-tapping Q or E (within 0.25 s) = side-shift.
- Mouse buttons fire and absorb in a race.
- The **virtual pad** `SN.vpad[playerIndex]` (analog values) is merged into the controls. The tests' bots, the
  autopilot and the attract mode drive craft through it, the same path as a human.
- The menu's Controls screen names the actions:
  `menu: { controls: { thrust: 'Thrust', fire: 'Fire weapon', absorb: 'Absorb weapon', brakeL: 'Airbrake left',
  brakeR: 'Airbrake right', brake: 'Both airbrakes', shiftL: 'Side-shift / roll left', shiftR: 'Side-shift / roll right',
  camera: 'Camera', lookBack: 'Look back' } }`.

**Screens:**

| Screen | Contents (10-foot: big, few, focused) |
| --- | --- |
| **Title** | The Solenne track world in a slow TV-director flyby. The SNIPEOUT HD logo: `E.font.title` scale 5, chrome gradient `['#ffffff', '#9ff4ff', '#29c8e8', '#1a2a4a']`, with a pixel "HD" badge and an animated light sweep. The tagline. "PRESS ✕ / ENTER" pulsing (glyph of the last device). The version (`E.versionLabel()`) small at the bottom right. Idle for 10 s → attract |
| **Touch-only notice** | **Detection:** `!matchMedia('(any-pointer: fine)').matches && navigator.maxTouchPoints > 0`, no gamepad connected, and no key pressed yet. Re-check on every key press and on `gamepadconnected`; the notice goes away as soon as one appears. **Shows:** over the title, "CONTROLLER OR KEYBOARD REQUIRED" (scale 2, centred, in a panel) and one big **SETTINGS** button (tap → `game.menu('settings')`). `game.input.touchEnabled = false` and no scene declares `touch`, so there are no touch controls anywhere. The attract still starts after 10 s, and a tap returns to this notice |
| **Main menu** | Hangar world (the player's last craft on the turntable). A vertical list of 6 big tiles: **SEASON · QUICK RACE · CHALLENGES ▸ · VERSUS · ACADEMY · OPTIONS ▸**. CHALLENGES opens TIME TRIAL / HOT LAP / SNIPEOUT / OVERCLOCK; OPTIONS opens SETTINGS / CONTROLS / HOW TO PLAY / RECORDS / ABOUT / DEV MODE. When an autosave exists, the first tile reads **CONTINUE SEASON** (it loads `saves.latest()` and opens the season hub) |
| **Class select** | 4 tiles in a row: SPARK / FLARE / STORM / SINGULARITY, with a top-speed figure and a lock icon plus the unlock hint ("WIN THE ROOKIE LICENCE") |
| **Track select** | One big card at a time (←/→ or L1/R1 or the wheel or a click on the arrows): the track outline at 150 px drawn with px.line, the name (scale 3), place, length, a difficulty pip row, your best time, and a one-line blurb. The hangar background tints to the theme |
| **Team and pilot select** | The craft on the turntable (mouse drag rotates it, the right stick rotates). Team name (scale 3) and logo. **4 stat bars** (SPEED, THRUST, HANDLING, SHIELD) as 10-segment bars. One-line bio. The pilot toggle (2 pilots, portraits via `rig.drawPortrait` at 48 px). ←/→ change team |
| **Laps / confirm** | A summary card (mode, class, track, team, laps), START RACE |
| **Loading** | The track name card, a progress bar, and one tip line ("Absorb a weapon you can't use: shield is worth more than a miss.") |
| **Race** | the HUD (§3.8) |
| **Results** | The top 8 as **one row per craft**: position, team colour chip, pilot, time or gap, best-lap star. The player's row is highlighted. Medal and record banners. Actions: CONTINUE · RETRY · REPLAY · MENU. A podium cutaway (hangar world, top 3 pilot cards cheering, confetti) plays first for 4 s when the player is top 3 |
| **Season hub** | 4 columns (ROOKIE LICENCE, AUTHORITY NOTICE, STORM WARNING, GRAND PRIX), each with 2–4 event tiles: mode icon, track, medal earned. Locked columns are dimmed with the rule shown. Before an event's first run, a briefing (§3.11) |
| **GP standings** | Between races: 8 rows, points, the gap to the leader, NEXT RACE |
| **How to play** | 5 pages (L1/R1): CONTROLS (the controller diagram drawn in pixels, or the keyboard map, by device), RACING (pads, pitch, airbrakes, side-shift, rolls), WEAPONS (10 icons with a one-line effect each, two pages), ENERGY (walls, damage, pit lane, absorb, elimination), MODES |
| **Records** | per track: best race and best lap per class, pilot name. One track per page |
| **About / Credits** | §3.18 |

### 3.10 Audio (`50-audio.js`, `10-data-music.js`): all synthesized, no files

**Music:** the engine's tracker (`game.audio.music(song, { sync: true })`) with the §2.7 extensions. Songs are data:
`{ bpm, steps: 4, tracks: [{ name, wave, vol, lp, uni, det, pan, notes, on }] }`. **Layers** (`audio.layer(name, vol,
fade)`) make the music react:
- the countdown has pads and bass only;
- the drums come in at GO;
- the lead comes in on the final lap;
- after the race, everything but the pads fades out;
- Overclock adds a layer every 2 zones and runs `audio.tempo(min(176, bpm + 3·zone))`.

When a race starts, a "now playing" toast shows (`♪ STACKLINE — NULLPOINT`). Fictional artists, all original.

| Song (id) | Where | BPM / key | Character |
| --- | --- | --- | --- |
| `zero` "Zero Crossing" by HALCYON DRIFT | title, menus | 112, D minor | airy pads, a soft arpeggio, a broken beat |
| `solenne` "Riviera Burn" by SOLSTICE 9 | Port Solenne | 128, A minor | sunny electro-house, four-on-the-floor, offbeat open hats, a pumping saw bass, a pluck lead |
| `karakum` "Sandglass" by DUNE//CODE | Karakum Spire | 140, E Phrygian | big beat, breakbeat drums (k/s pattern), a distorted acid bass (`lp` env), a call-and-response lead |
| `meridian` "Stackline" by NULLPOINT | Meridian Stack | 172 (half-time feel), F minor | drum'n'bass breaks, a reese bass (`uni: 3, det: 18` saw, lowpass), stabs |
| `borealis` "Polar Vector" by AURORA SYSTEMS | Borealis Vault | 136, B minor | trance: rolling 16th bass, a supersaw lead, a long riser every 8 bars |
| `overclock` "Clock Skew" by THE AUTHORITY | Overclock | 120 → 176 | minimal techno that adds a layer per 2 zones |
| stings | lap, final lap, win, podium, eliminated, unlock, medal | — | 1–3 s motifs (`audio.sting`) |

Example, the start of `solenne`, to set the format and the bar:

```js
SN.SONGS.solenne = { bpm: 128, steps: 4, tracks: [
  { name: 'kick',  wave: 'drums', vol: .22, notes: 'k . . . k . . . k . . . k . . . | k . . . k . . . k . . . k . k .' },
  { name: 'hats',  wave: 'drums', vol: .10, notes: '. . o . . . o . . . o . . . o h | . . o . . . o . . . o . . h o h' },
  { name: 'clap',  wave: 'drums', vol: .14, notes: '. . . . p . . . . . . . p . . . | . . . . p . . . . . . . p . p .' },
  { name: 'bass',  wave: 'saw', vol: .16, lp: { f: 300, q: 9, env: 1800, dec: .12 },
    notes: 'A1 . A2 . A1 A2 . A1 . A2 . A1 G2 . A2! . | F1 . F2 . F1 F2 . F1 . F2 . F1 E2 . F2! .' },
  { name: 'pad',   wave: 'saw', vol: .05, uni: 3, det: 14, lp: { f: 1400, q: 1 }, notes: 'A3 - - - - - - - - - - - - - - - | F3 - - - - - - - - - - - - - - -' },
  { name: 'lead',  wave: 'pulse', vol: .07, on: false, notes: 'E5 . C5 . A4 . C5 E5 . G5 . E5 . C5 . . | F5 . C5 . A4 . C5 F5 . A5 . F5 . E5 . .' }
] };
```

Each song needs at least 16 bars of material (A/B sections, a breakdown) so that a 3-minute race doesn't drone.

**SFX** (`audio.define` voices, plus our own WebAudio graphs on the effects bus where a voice can't do it). These
names are referenced by events (§2.5):

| Group | Sounds |
| --- | --- |
| UI | `ui_move` (short pulse blip), `ui_ok` (two-tone up), `ui_back` (down), `ui_locked` (buzz), `ui_tab` (click) |
| Race | `count_beep`, `count_go` (chord), `lap` (chime), `final_lap` (a rising sting), `finish` (fanfare), `wrongway` (siren blip), `pos_up` / `pos_down` (tiny arps) |
| Craft | engine hum (continuous, below), `boost_pad` (whoosh plus a pitch sweep), `pickup_roll` (a ticking arp), `weapon_pad` (sparkle), `airbrake` (filtered noise hiss, looped while braking), `sideshift` (puff), `roll` (a whirr), `roll_boost`, `botch`, `land_soft`, `land_hard` (thud plus clank), `wall_hit` (metal bang, pitch by impact), `scrape` (looped band-passed noise, volume by speed), `bump`, `pit_charge` (looped rising tone), `low_shield` (beep every 0.8 s), `explode` (noise boom plus a sub drop), `eliminated`, `respawn`, `rescue` (drone whine) |
| Weapons | `swarm_fire`, `seeker_lock` (beeps faster to a solid tone), `seeker_fire`, `mine_drop`, `cannon_fire`, `rail_charge` (a rising whine), `rail_fire` (crack plus a long zap), `tremor` (sub rumble), `bulwark_on/off`, `autopilot_on/off`, `nitro`, `siphon` (a crackling loop), `absorb` (a reverse whoosh with a chime), `hit_light`, `hit_heavy` |

**Engine hum.** The four nearest craft each get a persistent graph: saw + detuned square → lowpass → gain →
StereoPanner → the effects bus.
- `f = 48 + 120·(v/top)` Hz with a thrust wobble.
- Cutoff `500 + 2500·(v/top)` (+1500 in boost).
- Others: volume by distance (1/(1 + d/800 u)), Doppler pitch `×clamp(1 + vRel/6000, .85, 1.15)`, pan by the screen
  x of `world.project`.
- The player's hum is louder and centred.
- In a split screen: player 1 pans left, player 2 right.
- All of it is muted on pause, on `game.audio.muted`, and on the hub's `end`.

**Gibberish voice (Animalese/Simlish style), `SN.Voice.say(text, voice)`:**
- Every word is turned into syllables seeded by the word's hash, so the same word always sounds the same ("SEEKER"
  is always "see-kra").
- Syllable count = `max(1, round(letters / 2.6))`.
- Each syllable is a consonant burst (noise, band-passed at 2–5 kHz, 18 ms; picked by the word's letters) followed by
  a vowel: a saw at `f0` through two band-pass "formants" `[F1, F2]` from a 5-vowel table (a: 800/1200, e: 400/2000,
  i: 300/2300, o: 450/800, u: 325/700), lasting `70–110 ms / speed`.
- Pitch: per-syllable jitter ±8 %; down 12 % at a full stop, up 18 % at "?", +10 % and louder at "!".
- Breathiness: 15 % noise.
- `say()` returns its duration. Subtitles and dialog pages wait on it. Headless, it is computed without sound.

| Voice | f0 | Speed | Use |
| --- | --- | --- | --- |
| ANNOUNCER (race control's "ORACLE") | 205 Hz | 0.85 | calm, slightly ring-modulated (×0.4 at 60 Hz) |
| pilots | 95–240 Hz | 1.0–1.3 | per pilot: radio banter, podium |
| principals | 110–190 Hz | 0.9 | briefings |
| KAI-ZERO | 140 Hz | 1.1 | bitcrushed (a WaveShaper step curve) |

`E.Dialog` boxes use `voice: null` (no letter blips) and call `SN.Voice.say` per page.

**Announcer lines** (each spoken as gibberish **and** shown as a subtitle, Settings → Subtitles):
- every weapon name on pickup;
- "THREE", "TWO", "ONE", "GO";
- "FINAL LAP", "PERFECT START", "BARREL ROLL", "SNIPED", "ELIMINATED", "WRONG WAY", "NEW LAP RECORD";
- "ZONE {n}", "OVERCLOCKED", "RACE OVER", "WINNER".

### 3.11 Narrative and writing style (`09-data-story.js`)

The source's register: clipped, corporate, cool, a little ironic. It sounds like a league that sells speed like
mineral water. Race control speaks in capitals and in rules. Teams speak like brochures. Pilots are terse and
competitive. Sponsors are absurd and deadpan. No melodrama, no jokes that wink at the player. Everything is
original: invented league, teams, people and brands.

- **The league:** the **Hoverline Championship**, Season 2161, run by the **Hoverline Authority** ("THE AUTHORITY").
  Its race-control intelligence is called **ORACLE**.
  - Announcement style: `AUTHORITY NOTICE 0417 — ROOKIE LICENCE GRANTED. CLASS: SPARK. GRAVITY: OPTIONAL.`
- **Team copy** (one line each, §4.1). Example:
  `HAMMERHEAD HEAVY INDUSTRIES builds cranes, bridges and the occasional champion. All three survive impact.`
- **Track copy.** Example: `PORT SOLENNE. Old stone, new money. The harbour lights are on a sponsorship contract.`
- **Sponsor boards** (canvas textures, §4.6):
  - `QWIK-FUEL — FILL UP. FALL UP.`
  - `OKTA NOODLE — EAT AT 600 KM/H`
  - `HALCYON BANK — YOUR MONEY, FASTER`
  - `DO NOT LOOK DIRECTLY AT THE FUTURE`
  - `AXON AIR — BREATHE PREMIUM`
  - `VANTA PAINTS — DARKER THAN NOTHING`
- **Story beats (the Season).** You are a test pilot signed to a race seat with your chosen team. Your team principal
  briefs you. The rival collective NULL//SET (pilot KAI-ZERO) needles you. The Authority watches. The beats are listed
  per event in §4.5.

  The arc:
  1. you are a rookie;
  2. you get noticed;
  3. a sponsor ultimatum, and NULL//SET's overclocking scandal (which is why OVERCLOCK trials exist);
  4. the STORM class promotion;
  5. the Grand Prix showdown;
  6. champion, and SINGULARITY unlocked, with a deadpan Authority sign-off.

### 3.12 Season, progression, saves (`08-data-season.js`, `78-season-ui.js`)

- **Tiers:**
  - Tier 1 (SPARK) is open from the start.
  - Tier 2 (FLARE) opens with 3 medals in tier 1, which also **unlocks the FLARE class** everywhere.
  - Tier 3 (STORM) opens with 3 medals in tier 2 and unlocks STORM.
  - The GRAND PRIX opens with both tier-3 events at bronze or better.
  - Winning the GP (any medal) **unlocks SINGULARITY**, the CHAMPION livery (gold trim on every team's craft, a
    toggle in team select) and the ending.
- Events can be replayed to improve a medal. The best medal is kept.
- **Saves:** `game.saves` autosaves after every event and GP race. `game.saves.write` returns
  `{ data, place: 'SEASON 2161', level: 'TIER 2' }`:

  ```js
  data = { v: 1, medals: { [eventId]: 'gold'|'silver'|'bronze' }, gp: { round, points: {pilotId: n}, done }, unlocked: { classes: [...], champion: bool },
           seen: { [briefingId]: true }, records: { 'track/cls/mode': { ms, pilot } }, ghosts: { 'track/cls/mode': base64 }, team, pilot }
  ```

  `menu: { saves: true }` is **not** used (no save points). CONTINUE on the main menu loads `saves.latest()`. In a hub
  session, storage is the hub's in-memory one, so nothing persists. That is expected.

### 3.13 Replays, ghosts, records (`45-replay.js`)

- **Replay** = re-simulate from the race's `{ seed, …, tune, frames }` (§2.8). The `replay` scene runs the sim at
  `timeScale` 1, 2 or 4 (R1/L1, or a click on the speed chip) with the TV director (△ cycles: TV, chase, cockpit,
  heli). A **click on any craft in the picture** (a hit test via `world.project` within 18 px) follows that craft.
  ✕ pauses, ○ exits. On the last frame, assert that `R.hash()` equals the recorded hash. In dev builds, show "REPLAY
  DESYNC" if not (a test guarantees it doesn't happen).
- **Ghosts** (TIME TRIAL, HOT LAP): record the player's `(s, u, h, yaw relative to the track, roll)` at 20 Hz,
  quantised to Int16, base64 in the save. Play back interpolated, as a translucent craft. The ghost never collides.
  Save it only on a new best.
- **Records:** best race and best lap per track/class/mode, with the pilot name. The NEW RECORD callout plus the
  announcer.

### 3.14 Attract mode (`85-attract.js`)

- **Trigger:** 10 s with no input on the title or any front-end screen (`input.anyPressed()`, any `move()` above the
  dead zone, any mouse move or click, or any key). The clock resets on input. It runs on touch-only devices too.
- **Playlist** (loops; each segment 25–40 s, loading the track world in between behind a "DEMO" card):
  1. a SPARK race at Port Solenne with 8 AI, weapons forced in rotation (all 10 weapons appear across the loop), a
     barrel roll on the jump;
  2. a STORM SNIPEOUT at Meridian Stack, with eliminations and respawns, and the Stack Drop;
  3. OVERCLOCK at Karakum Spire, an AI from zone 1 jumping to zone 14 at one zone per 2 s, skin and music climbing;
  4. a FLARE race at Borealis Vault, the Vault jump and the ice tunnel;
  5. a 6 s title card with the logo and "PRESS START".

  Each segment uses the TV director plus occasional chase and cockpit cuts.
- **Cheats allowed:** infinite energy, forced pickups, no rescues, AI aggression 1.5.
- **Overlay:** a "DEMO" chip at the top centre, the logo small at the top left, and "PRESS ANY BUTTON" blinking at the
  bottom (the glyph of the last device). The HUD stays minimal: position list and weapon callouts, so the features
  read.
- **Exit:** **any** input (key, pad button, stick, mouse button, a click, a touch) returns to the title within one
  step. The input is consumed (`input.consumeAll()`), so it doesn't also select anything. The race world stays loaded
  for the title.

### 3.15 Dev mode and live tuning (`80-dev.js`, `SN.Tune` in `00-core.js`)

- **Reach:** the pause menu item **Dev mode**. It is present in every race mode except hub sessions. Front-end
  screens get it through OPTIONS ▸ DEV MODE, so it is reachable without a race too. The panel opens over the paused
  game. ○ or Esc closes it back to the pause menu, and Options resumes. Controller, keyboard and mouse all work (the
  §3.9 widget kit). Tabs switch with L1/R1, Q/E, or a click on a tab.
- **Tune registry:** `SN.Tune.def(key, { def, min, max, step, label, group })`. Read values with `SN.Tune.T[key]`.
  `SN.Tune.reset(key?)` restores one or all defaults. Values live in memory for the session (a "RESET ALL TO
  DEFAULTS" button is always visible). Every replay snapshots them.

| Tab | Contents |
| --- | --- |
| **CHEATS** | God mode (no damage) · Infinite weapon · Give weapon ◀ name ▶ (applies on ✕) · AI weapons off · Freeze AI · Ghost AI (no collisions) · Refill energy · Energy to 10 % · Skip to final lap · Win now (finish 1st / max points / zone +10) · Eliminate all AI · Unlock everything · Reset season progress (asks first, in-panel) |
| **TUNING** (live sliders, ◀ ▶ adjust, hold to speed up, mouse drag on the bar, a reset ↺ per row, RESET ALL) | **Handling:** thrustMul 1 [0.5–2], topSpeedMul 1 [0.6–1.6], dragMul 1 [0.5–2], steerRate 1.9 [0.8–3.5], steerResponse 9 [2–20], gripMul 1 [0.3–2], airbrakeYaw 1.4 [0–3], airbrakeDrag 0.9 [0–2], gripMaxMul 1 [0.4–2], slipMax 35° [10–60], scrubK 0.35 [0–1], sideShiftSpeed 768 [0–1500], shiftDecay 12 [4–30]. **Hover:** hoverHeight 14 [6–30], hoverStiffness 220 [60–600], hoverDamping 28 [5–60], magnetPull 1800 [600–4000], airGravity 640 [200–1500], pitchEffect 1 [0–2]. **Walls & energy:** wallBounce 0.35 [0–1], wallFriction 0.25 [0–1], wallDamage 1 [0–3], pitRecharge 25 [0–100], rollCost 10 [0–30], rollBoost 1.2 [1–1.6]. **Pads & weapons:** padBoost 1.25 [1–1.8], padBoostTime 0.9 [0.2–2.5], weaponDamageMul 1 [0–3], absorbMul 1 [0–3], pickupLuck 1 [0–2]. **AI:** aiSkill 1 [0.5–1.2], aiRubberBand 1 [0–2], aiAggression 1 [0–2]. **Camera:** camDistance 150 [60–300], camHeight 46 [10–120], camFov 72 [50–100], camFovBoost 16 [0–40], camLag 8 [1–20] |
| **WORLD** | Time scale (0.25 / 0.5 / 1 / 2) · Teleport: lap position % slider + GO · Free camera · Overclock zone +1 · Weather on/off · HUD on/off · Debug overlay (centre line, slice frames, racing line coloured by target speed, craft collision spheres, pad rectangles, AI targets, camera spots) |
| **INFO** | live: s, u, h, p, speed (u/s and km/h), energy, lap, sector, position, airborne time, slice index, surface kind, seed, `R.hash()`, World3D backend and `world.stats` (calls, tris, ms), steps per second |

### 3.16 Multiplayer: local split screen and AI Hub sessions

**Local (the game on its own): VERSUS for 2 players on one machine.**
- On the VERSUS screen, `game.allowJoin({ max: 2 })`: player 2 presses Start on another pad, or 2 on the keyboard.
- With two on the keyboard, the engine splits it with `Input.halfKeys` in our preset order (§3.9):
  - **P1:** W/S pitch, A/D steer, F thrust, G fire, H absorb, R/T airbrakes, Y camera, V/B side-shift;
  - **P2:** ↑/↓ pitch, ←/→ steer, `.` (Numpad 1) thrust, `/` (Numpad 2) fire, `,` (Numpad 3) absorb, L / `;`
    (Numpad 4/5) airbrakes, `'` (Numpad 6) camera, K / M (Numpad 7/8) side-shift.

  Both airbrakes together brake (`brake` and `lookBack` get no key in a half). Show both layouts on the join screen
  with keycap glyphs, read from `players[i].label()`, never typed in by hand.
- Both pick teams in turn, then choose RACE or SNIPEOUT, class and track. Split rows, with a compact HUD per
  viewport.
- Each player's prompts use their own device (`players[i].label()`). A pause says "P2 PAUSED" (engine).

**AI Hub (`90-hub.js`): mode `ghost`**, following the protocol (`lib/hub/README.md`, client 1.4.0). Everyone races the
same seeded event on their own device and sees the others as ghosts.
1. **Tags** in `<head>` (§2.3): players `1-4`, mode `ghost`, minutes `3`, goal and howto ≤ 60/80 characters.
2. **`AIHub.active`** → the boot goes straight to the `session` scene: no title, menus, attract or prompts. The engine
   options for the session: `autoPause: false`, the race `pausable: false`, `menu.quit: false`.
3. `const info = await AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true })`. If `null`, run the game normally.
4. **The event:**
   - track = `['solenne', 'karakum', 'meridian', 'borealis'][floor(AIHub.rng('event')() * 4)]`;
   - class FLARE, 3 laps;
   - race seed = `floor(AIHub.rng('race')() * 2^32)`;
   - each human's team by seat (`['kestrel', 'soratek', 'volta', 'caldera'][seat]`), livery accent = seat colour;
   - grid: the humans take slots by seat at the back of the grid (slots 5–8), and AI fill slots 1–4 plus any free
     slots (8 − N AI);
   - every copy simulates its own craft plus the AI. The other humans are **ghosts**: drawn from messages, never
     collided with or targeted.
5. **Own card** (`card: true`): the session scene shows a 3D grid shot of the chosen track with the players' craft
   lined up in seat colours, the names, the ready ticks from the `card` event, the time left (`left`), the goal, and
   this player's controls (the glyphs of the device seen so far, keyboard by default).
   - **Ready:** Enter, ✕ or a tap/click on READY → `AIHub.answer('ready')`.
   - **More time:** △, M, or a tap/click on MORE TIME → `AIHub.answer('more')`; pressing again takes it back.
   - No `Math.random` on the card (use `AIHub.rng('card')` if needed). No menus or choices.
6. Call `AIHub.ready()` once, as soon as the world is built and warm (boot plus the track loading), with no key press.
7. **`start`**: the countdown lights follow `AIHub.time()` (−3000 → 0 ms), and the launch revs work. Racing begins
   when `AIHub.time() ≥ 0`. The race clock is `AIHub.time()`.
8. **Ghost traffic:** `AIHub.send({ t: 'g', p, u, h, y, r, v, lap, fin }, { reliable: false })` at 10 Hz (well under
   20/s), plus `{ t: 'done', ms }` reliable on finishing.
   - On `message`, update that ghost: interpolate toward the latest, 0.1 s behind. Draw it as a ghost craft (§3.7)
     with the name in the seat colour, and add it to the HUD standings.
   - On `leave`, remove it.
9. **Progress:** about once a second, `AIHub.progress({ score: Math.round(p / 16), label: 'LAP 2/3 · 3RD' })`.
10. **Result:**
    - on finishing: `AIHub.result({ time: finishMs, stats: { 'Best lap': '0:41.22', 'Place vs AI': '2nd' },
      awards: [...] })`;
    - eliminations respawn in sessions, so everyone can finish;
    - on `time-up`, if not finished: `AIHub.result({ score: Math.round(p / 16) })` at once.
11. **`end`:** stop the sim, stop all input (ignore `game.input`), stop music, engine hums and SFX, and show "ROUND
    OVER" with the standings from the event. The hub removes the page.
12. **Rules:** network only through the hub (the CDN module loads are the game's own files); no `alert`, `confirm`,
    `prompt` or `window.open` (none anywhere in the game); no chat or custom names. Restart and quit do nothing in a
    session (the items are hidden).

### 3.17 Settings: the game's own, beside the engine's standard ones

`new E.Game({ menu: { settings: [...] } })`, groups `Game` and `Display`:
- **Difficulty:** Easy / Normal / Hard.
- **Speed units:** km/h / mph.
- **Default camera:** Chase / Far chase / Cockpit.
- **HUD size:** Normal / Large (×1.25).
- **Subtitles:** on / off. They cover the announcer and radio; dialog boxes are always text.
- **Announcer voice:** on / off.
- **Speed lines:** on / off.
- **Neon glow** (`bloom`): on / off.
- **Picture** (`picture3d`): PIXELS (the engine's native default) / BALANCED / **HD**. HD is World3D's `'full'`.
- **Shadows** (`shadows3d`): on / off.
- **Filter** (`filter3d`): None / Comic cel / Pixel.
- **Button symbols:** PlayStation (default) / Xbox. This is the engine's `glyphs`, moved to Display (§2.7.1).

World3D reads `picture3d`, `shadows3d` and `filter3d` by those keys. Define them ourselves (same keys, values and
labels), because `E.World3D.SETTINGS` does not exist yet when `new E.Game` runs (§2.3). The engine provides the rest:
volume, music, effects, reduce motion, shake, flashes, full screen, frame rate, and the Controls screen (rebinding,
dead zone, vibration).

### 3.18 About / Credits and the exit interview (`11-data-about.js`)

`SN.ABOUT` is the single source for the **About / Credits** screen (OPTIONS ▸ ABOUT, and after the ending credits) and
for `tools/exit-interview.mjs`, which writes `../exit-interview.json` in exactly TASK.md's shape and checks it parses.

The screen pages (L1/R1), each page big-type and short:
1. **SOURCE INFORMATION:** every TASK.md field, "unknown" where it can't be confirmed. Planned values:
   - Date: 2026-11-03 17:47:28
   - Source: Wipeout HD (Studio Liverpool / Sony, 2008)
   - Plan: PLAN.md
   - Genre and perspective: anti-gravity combat racing; third-person chase camera with cockpit view and trackside TV
     cameras
   - Tech: my-3D2dge v0.85.2 handoff engine + my-3D2dge 3D v0.85.2, three.js r182 (WebGPU/WebGL 2), Rapier 0.19.3,
     AI Hub client 1.4.0
   - Art direction: the engine's native style (pixel-resolution 3D, toon/lambert light, pixel HUD and fonts) plus new
     procedural craft, tracks and neon
   - Animation: the engine's rigs and tweens, plus procedural craft animation
   - Audio: synthesized music, SFX and gibberish voices
   - Online: AI Hub ghost sessions; local split screen
   - Testing; research; environment; model; usage
2. **TESTING FEEDBACK:** the 4 answers.
3. **ENGINE FEEDBACK:** the 6 answers, including the §2.7 changes.
4. **PROMPT FEEDBACK:** the 4 answers.
5. **CREDITS:**
   - "Snipeout HD. An original game inspired by Wipeout HD (not affiliated with Sony Interactive Entertainment)."
   - Engine credits (my-3D2dge, three.js MIT, Rapier Apache-2.0), "all music, sound and voices synthesized in code",
     "built by Anthropic claude-opus-5-5".
   - The fictional teams and artists, with a note that they are fictional.

The builder fills in the feedback answers truthfully at the end of the build (M12). The chat reply repeats them, as
TASK.md demands. The `aiHub` block for the exit interview:

```json
{ "name": "Snipeout HD", "tagline": "Anti-gravity. Anti-everyone.",
  "description": "An anti-gravity combat racer: thread banked neon tracks at 600 km/h, snipe rivals with ten weapons and survive Overclock. Season, time trials, split screen and AI Hub ghost races.",
  "type": "Game", "genre": "Racing", "source": "Wipeout HD", "series": "Wipeout", "players": "1–4",
  "controls": "Stick or A/D steer · ✕ or W thrust · L2/R2 or Q/E airbrakes · □ or Space fire · ○ or Shift absorb",
  "tags": ["3d", "racing", "sci-fi", "vehicles", "arcade", "versus"] }
```

---

## 4. Content

### 4.1 Teams, craft, pilots, principals (`05-data-teams.js`)

Stats run 1–10 (§3.2 turns them into physics). The totals are close (22–24). NULL//SET trades shield for speed, which
makes it the rival.

| Team (base) | SPD | THR | HND | SHD | Livery: primary / secondary / accent / engine glow | Craft and silhouette | One-line copy |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **KESTREL DYNAMICS** (Oslo) | 6 | 6 | 6 | 6 | `#f2f5f8` / `#29c8e8` / `#1a2a4a` / `#7af0ff` | **KD-9 FJORD:** a dart hull, swept delta wings, twin canted tail fins, 2 engines | "Precision is a form of courage. Kestrel has been brave since 2109." |
| **HAMMERHEAD HEAVY INDUSTRIES** (Lagos) | 6 | 4 | 3 | 9 | `#ff7a1a` / `#2b2d33` / `#ffd23f` / `#ffb347` | **HH ANVIL:** a wide flat slab hull, twin hammerhead nose pods, stub wings, 3 engines | "Builds cranes, bridges and the occasional champion. All three survive impact." |
| **SORA-TEK** (Osaka) | 5 | 6 | 9 | 4 | `#f7f7f7` / `#e0213a` / `#16161c` / `#ff5a6e` | **ST TSUBAME:** a narrow needle hull, forward canards, one central fin, long swept wings, 1 large engine | "Sora-Tek does not turn corners. Corners are informed of a change in direction." |
| **VOLTA NERO** (Turin) | 9 | 4 | 4 | 5 | `#141418` / `#e8b84a` / `#c8202a` / `#ffd36a` | **VN SAETTA:** a very long needle nose, a big rear-mounted engine, small rear wings, twin low fins | "Straight lines, beautifully. Everything else, eventually." |
| **CALDERA SYSTEMS** (Santiago) | 5 | 9 | 5 | 5 | `#d8361c` / `#6a2bd8` / `#24202a` / `#ff6a2a` | **CS VOLCÁN:** a twin-boom catamaran, two big engines on the booms, a centre pilot pod | "Geothermal engineering. Zero to everything in four seconds." |
| **NULL//SET** (Berlin; a collective) | 8 | 7 | 5 | 3 | `#0b0b0e` / `#6aff3a` / `#ff2a8a` / `#6aff3a` | **N//S GHOSTLINE:** a faceted stealth wedge, no fins, 2 flat slot engines | "No sponsor. No logo. No comment." |

Craft geometry parameters (ShipKit), in u. Every design is 96 u long and fits inside 96 × 52 × 24 u, so all craft
share one collision shape (§3.2).

| Craft | Hull sections (half-width w, height h at 0 / 20 / 40 / 60 / 80 / 100 % of length, nose to tail) | Wings (half-span from the centre line, sweep) | Fins | Engines (count, radius) |
| --- | --- | --- | --- | --- |
| FJORD | w 2/9/14/16/14/10, h 2/6/9/9/8/6 | 24, sweep 40° | 2 canted 20°, 10 tall | 2 × r5 |
| ANVIL | w 10/16/18/18/18/16, h 3/6/7/7/7/6, plus 2 nose pods r5 at ±14 | 22, sweep 10° (stubs) | 0 | 3 × r4 |
| TSUBAME | w 1/6/10/12/10/8, h 2/5/7/8/7/5, plus canards (half-span 10 at 25 %) | 26, sweep 50° | 1, 14 tall | 1 × r7 |
| SAETTA | w 1/4/8/12/14/12, h 1/4/6/8/9/8 | 20, sweep 30° (rear third) | 2 low, 6 tall | 1 × r9 |
| VOLCÁN | two booms w 6 at ±15, a pod w 7 in the centre (front 70 %) | 24, straight, joining the booms | 2 on the booms | 2 × r7 |
| GHOSTLINE | a faceted wedge: w 4/12/18/20/20/18, h 2/4/6/6/5/3 (flat-shaded facets) | none (the wedge is the wing) | 0 | 2 slots 14 × 3 |

**Pilots** (2 per team, 12 in all). Each has two Humanoid rigs: helmeted for the race and podium cards, bare-headed
for portraits. Common rig options: `{ size: 1.3, build: 'heroic', weapon: null, outfit: 'coat', colors: { cloth:
primary, coat: secondary, pants: accent, trim: secondary, glove: accent, boot: '#1a1a20' } }` and the helmet
`hat: { style: 'helmet', color: secondary }`. Voice `f0` is for §3.10. `skill` is an offset on the difficulty's AI
skill.

| # | Pilot | Team | Look (hair, skin) | Voice f0 | skill | aggression | Banter line |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | INGRID VALE | Kestrel | ponytail, `#f0d080` / `#f2d0b8` | 210 | +0.01 | 0.8 | "Clean lines. Clean wins." |
| 2 | TOMAS BREKKE | Kestrel | short, `#6a4a30` / `#e8c8a8` | 120 | 0 | 0.7 | "Holding position." |
| 3 | AMARA OKAFOR | Hammerhead | short, `#1a1410` / `#8a5a3a` | 200 | +0.01 | 1.0 | "Shield's fine. Is yours?" |
| 4 | DAYO ADEYEMI | Hammerhead | bald / `#6a4028` | 105 | 0 | 1.2 | "Coming through. Literally." |
| 5 | RIN TAKAHARA | Sora-Tek | long, `#14141a` / `#f0d4b8` | 230 | +0.02 | 0.7 | "Too wide. Again." |
| 6 | KENJI MORI | Sora-Tek | spiky, `#202028` / `#e8c8a0` | 130 | 0 | 0.9 | "Apex. Apex. Apex." |
| 7 | LUCA FERRANTE | Volta Nero | short, `#2a1a12` / `#e0b890` | 125 | +0.02 | 1.0 | "Watch the straight. Watch it go." |
| 8 | GIULIA MARCHETTI | Volta Nero | long, `#5a3420` / `#f0c8a0` | 215 | +0.01 | 1.1 | "Ciao. Behind you." |
| 9 | VALENTINA SOTO | Caldera | ponytail, `#2a1810` / `#d8a880` | 205 | +0.01 | 1.2 | "Hot engine. Hotter temper." |
| 10 | MATEO ARAYA | Caldera | short, `#1a1008` / `#c89870` | 115 | 0 | 1.0 | "Launching." |
| 11 | KAI-ZERO | NULL//SET | hood (`hood: true`) and visor, `#0b0b0e` / `#c8b8a8` | 140, bitcrushed | +0.03 | 1.3 | "Rookies make the best wreckage." |
| 12 | HEX | NULL//SET | spiky, `#ff2a8a` / `#e8d0c0` | 175 | +0.02 | 1.2 | "Signal lost. Yours." |

**The race field.** The player plus 7 AI. Every team is represented, the rival is always present, and the player's
teammate is included. AI grid order is by skill, fastest at the front. The player starts **8th, at the back**, as in
the source. In VERSUS the two humans start 7th and 8th.

**Principals** (portraits, briefings): DIRECTOR SOLVEIG HALE (Kestrel, f0 180), CHIEF EMEKA OBI (Hammerhead, 100),
DR. HARUKA ISE (Sora-Tek, 190), SIGNOR ARMANDO VELLUTI (Volta Nero, 110), INGENIERA PAZ ROJAS (Caldera, 170), THE ADMIN
(NULL//SET, 90, bitcrushed; their portrait is a pixel glitch mask, a drawn function).

**The rival** is KAI-ZERO, unless the player races for NULL//SET; then it is LUCA FERRANTE. Lines use `{$rival}` and
`{$rivalTeam}` (E.Dialog vars).

**ORACLE**, the Authority's race control, has as its portrait a drawn emblem: a triangle eye in a hexagon, cycling
white and cyan.

### 4.2 Speed classes

| Class | Top (m/s) | Top (u/s) | km/h | Unlock | Ideal-line lap estimate: Solenne / Karakum / Meridian / Borealis |
| --- | --- | --- | --- | --- | --- |
| SPARK | 90 | 1440 | 324 | from the start | 45.9 / 53.8 / 47.8 / 59.4 s |
| FLARE | 115 | 1840 | 414 | Season tier 1 | 37.3 / 43.3 / 38.1 / 47.7 s |
| STORM | 140 | 2240 | 504 | Season tier 2 | 31.8 / 36.7 / 32.2 / 40.3 s |
| SINGULARITY | 170 | 2720 | 612 | a Grand Prix medal | 27.5 / 31.4 / 27.5 / 34.4 s |

The estimates come from the planning script (App. C): `alat = 40 m/s² × (top/90)^1.5`, thrust `0.55·top`, airbrake
deceleration 28 m/s², on a line about 15 % wider than the centre line. Real AI laps should land within ±25 % of
them, which is a test (§7). Displayed speeds with boosts reach about 830 km/h at SINGULARITY.

**Medal targets** (TIME TRIAL 3 laps, HOT LAP 1 lap) are **measured, not guessed**. In M12, run
`node tools/medals.mjs`: the player bot at skill 1.0, 3 runs per track and class, no rubber band. Then
gold = best × 1.04, silver = × 1.10, bronze = × 1.20, rounded to 0.1 s. Write the numbers into
`07-data-tracks.js`. The test suite checks that every medal number exists and that the bot earns gold.

### 4.3 Tracks (`07-data-tracks.js`): layouts checked during planning

Metres, x east, y south, z up, origin `[2048, 2048, 0]`, driving order. The `cp` indices below refer to these arrays.
`tools/trackcheck.mjs` must reproduce the numbers in each heading. They were computed with the App. A spline at a 2 m
resample.

#### PORT SOLENNE: tier 1, beginner. 3.84 km · tightest 56 m (lighthouse hairpin) · slopes ±5 % (−15 % only inside the jump) · 1 drop jump

> *Old stone, new money. The harbour lights are on a sponsorship contract.* Golden hour on a Mediterranean resort
> city: a seafront main straight, a climb through cliff villas, a tunnel under the old town, the Harbour Step, the
> marina, and a hairpin around the lighthouse pier.

```js
points: [[0,0,3],[300,0,3],[600,0,4],[790,-50,7],[890,-210,14],[905,-420,24],[820,-600,32],[640,-690,36],[420,-670,38],
  [220,-705,36],[40,-645,30],[-110,-565,25.5],[-176,-470,23.6],[-188,-440,23.8],[-205,-375,15],[-195,-250,10],[-255,-120,6],
  [-320,60,4],[-300,260,3],[-200,340,3],[-100,280,3],[-80,120,3],[-40,35,3]],
width: 28, widths: { 18: 30, 19: 30, 20: 30 }, start: 230,   // widths: per control point, metres (the hairpin is wider)
jumps: [{ from: 12, to: 14, kind: 'drop', name: 'THE HARBOUR STEP' }],   // lip 23.6 m, lower deck 15.0 m: an 8.6 m step, 0.65 s air at every speed
tunnels: [{ a: { cp: 7, d: 30 }, b: { cp: 9, d: 40 }, style: 'stone' }],  // under the old town, about 436 m
speedPads: [{ cp: 1, d: 120, u: 0 }, { cp: 4, d: 80, u: -4 }, { cp: 10, d: 80, u: 3 }, { cp: 16, d: 100, u: 0 }, { cp: 21, d: 30, u: -3 }],
weaponPads: [{ cp: 2, d: 80 }, { cp: 7, d: -60 }, { cp: 11, d: 40 }, { cp: 17, d: 60 }],
pit: { a: { cp: 0, d: 20 }, b: { cp: 1, d: 259 }, side: 'right', w: 8 },   // sea side of the main straight
openEdges: [], banks: [],
```

Control points along the track (m, raw from cp0): 0, 302, 602, 800, 992, 1204, 1406, 1610, 1832, 2036, 2226, 2398,
2514, 2546, 2614, 2740, 2884, 3076, 3280, 3412, 3532, 3696, 3790.

- **Theme `coast`:**
  - sky `['#2a1a4a', '#c8506a', '#ffb070']`;
  - sun low in the west (`dir [-0.8, 0.3, -0.35]`, `#ffc890`, 2.4);
  - ambient `['#ffd0c0', '#4a3a5a', 1.6]`;
  - fog `#e89878`, near 12000 u, far 26000 u.
- **Terrain:** the sea to the south (local y > 60: height −4 m, under a water plane at 0 m with gradient bands and a
  sun-glint strip), a beach, then hills rising north to 120 m (noise). The old town plateau covers the tunnel at about
  55 m.
- **Scenery:**
  - the promenade with 60 palm pylons and 14 sponsor boards along the main straight;
  - crowd stands at the start;
  - a glass pit building;
  - 300 old-town houses (white, ochre and pink boxes with terracotta roofs) on the hill;
  - cliff villas with pools;
  - harbour cranes;
  - 40 marina boats (hull and mast);
  - the lighthouse on the pier (red and white rings, a rotating beam light, a landmark for the hairpin);
  - a Ferris wheel turning slowly behind the marina;
  - beach umbrellas;
  - the landmark arch "SOLENNE 2161" at cp3.
- **Music:** `solenne`.

#### KARAKUM SPIRE: tier 1, intermediate. 4.59 km · tightest 55 m · a gorge **gap** jump · a spiral that passes over its own track (24.5 m clearance)

> *A canyon the colour of rust, a spire nobody climbs, and a gorge that keeps what it catches.* Noon in a red-rock
> desert: canyon-floor straights, a plateau with an open edge, the gorge jump (it needs 270 km/h), a tunnel through a
> mesa, a 28°-banked spiral climbing around the Spire, over its own entry, and a long dive home.

```js
points: [[0,0,0],[0,-330,0],[30,-575,2],[130,-740,8],[295,-820,18],[490,-820,29],[620,-778,32],[720,-712,36.5],[742,-696,37.5],
  [765,-680,28],[840,-610,21],[905,-525,16],[935,-360,11],[905,-195,9],[885,-65,7],[870,65,9],[790,165,15],[675,130,21],[655,15,26],
  [740,-50,30],[855,-50,32],[985,30,30],[1035,180,22],[945,310,14],[740,355,8],[490,345,4],[245,345,2],[50,295,0],[-25,165,0]],
width: 26, start: 200,
jumps: [{ from: 7, to: 9, kind: 'gap', name: 'THE GORGE', minSpeed: 75 }],   // cp8 is a virtual apex inside the gap (not drawn); 57 m gap
tunnels: [{ a: { cp: 11, d: 60 }, b: { cp: 13, d: 40 }, style: 'rock' }],   // through the mesa, about 316 m
speedPads: [{ cp: 2, d: 40, u: 0 }, { cp: 6, d: 40, u: -3 }, { cp: 6, d: 80, u: 3 }, { cp: 13, d: 60, u: 0 }, { cp: 20, d: 40, u: 0 }, { cp: 24, d: 120, u: -4 }],
weaponPads: [{ cp: 3, d: 40 }, { cp: 10, d: 60 }, { cp: 14, d: 60 }, { cp: 22, d: 60 }, { cp: 26, d: 60 }],
pit: { a: { cp: 0, d: 10 }, b: { cp: 1, d: 0 }, side: 'left', w: 8 },
openEdges: [{ a: { cp: 5, d: 0 }, b: { cp: 6, d: 60 }, side: 'left' }],   // the plateau rim: fall into the canyon
banks: [{ from: 15, to: 20, deg: 28 }],                                    // the Spire spiral
```

Control points along the track: 0, 330, 578, 773, 958, 1155, 1292, 1412 (lip), 1439 (virtual), 1469 (far edge),
1572, 1680, 1848, 2016, 2148, 2279, 2411, 2536, 2657, 2767, 2883, 3038, 3200, 3362, 3574, 3825, 4070, 4274, 4427.

**Overpass:** raw s ≈ 2208 (lower, under the spiral exit) and ≈ 2928 (upper). **Gorge** (App. C):
- 45–60 m/s hit the far wall: a rescue;
- 75 m/s just clears;
- 90 m/s lands 18 m past the far edge at −13°;
- 170 m/s lands 129 m past at −10°.

- **Theme `desert`:**
  - sky `['#3a78d8', '#9cc8f0', '#f0e0c0']`;
  - sun high (`[-0.3, 0.2, -0.93]`, `#fff2d0`, 3.0);
  - fog `#e8d0a0`, near 14000, far 30000.
- **Terrain:** a meandering canyon floor along the low sections, mesas (flat tops 40–80 m with strata walls: World3D
  `rock: { colors: ['#b85a30', '#d8884a', '#8a3a20', '#e8b070'], band: 48 }`), the gorge cut −60 m under the jump with
  a thin river (an emissive blue strip), and dunes outside.
- **Scenery:**
  - **the Spire:** a 220 m stacked rock column at local (762, 72) inside the spiral (tapering cylinders, strata
    colours);
  - 24 wind turbines with turning rotors on the plateaus;
  - solar fields;
  - carved mesa portals;
  - canyon-wall banners;
  - a half-buried old craft wreck as a landmark at the gorge;
  - dust devils (particles);
  - heat haze.
- **Music:** `karakum`.

#### MERIDIAN STACK: tier 2, advanced. 4.18 km · tightest 52 m · the Stack **drop** · a figure-eight crossover (31.9 m clearance) · night

> *Three hundred storeys of people who have never seen the ground. Tonight they watch you fall past their windows.* A
> vertical megacity at night: an elevated start, the Stack Drop between towers, neon tunnels through buildings, a low
> pass under its own upper deck, and a long climb back to the sky deck.

```js
points: [[0,0,42],[250,-40,42],[480,-160,40],[615,-300,37],[650,-395,36.2],[653,-425,36.4],[655,-490,22],[630,-585,17],
  [460,-700,15],[240,-680,13],[100,-540,11],[0,-360,10],[-100,-180,10],[-260,-40,12],[-480,0,18],[-680,-80,24],[-780,-280,30],
  [-700,-480,36],[-500,-560,40],[-300,-480,42],[-160,-300,42],[-60,-120,42]],
width: 24, start: 190,
jumps: [{ from: 4, to: 6, kind: 'drop', name: 'THE STACK DROP' }],   // cp5 virtual; lip 36.2 m to a lower deck at 22.0 m: a 14.2 m step
tunnels: [{ a: { cp: 8, d: 20 }, b: { cp: 9, d: 80 }, style: 'neon' }, { a: { cp: 13, d: 50 }, b: { cp: 14, d: 40 }, style: 'neon' }],
speedPads: [{ cp: 1, d: 60, u: 0 }, { cp: 3, d: 50, u: 0 }, { cp: 10, d: 80, u: 3 }, { cp: 12, d: 30, u: 0 }, { cp: 17, d: 60, u: -3 }, { cp: 20, d: 60, u: 0 }],
weaponPads: [{ cp: 2, d: 40 }, { cp: 7, d: 60 }, { cp: 12, d: 120 }, { cp: 15, d: 60 }, { cp: 19, d: -40 }],
pit: { a: { cp: 19, d: 35 }, b: { cp: 20, d: 126 }, side: 'right', w: 8 },   // on the sky deck, ending before the crossover
openEdges: [], banks: [],
```

Control points along the track: 0, 258, 518, 714, 815 (lip), 846 (virtual), 912 (far edge), 1012, 1220, 1446, 1646,
1852, 2058, 2272, 2498, 2718, 2946, 3165, 3385, 3605, 3833, 4039.

**Overpass:** raw s ≈ 2082 (low, z ≈ 10 m) under s ≈ 3983 (high, z ≈ 42 m). **The drop** (App. C): every speed
lands. Slow craft land hard (45 m/s: −37°, damage); fast ones smoothly (140 m/s: −12°). The drop sits on a 19°
curve, so the lower deck follows the plan path (§3.1).

- **Theme `city`:**
  - sky `['#05030f', '#1a0f3a', '#3a1a5a']`;
  - moonlight `#8090ff`, 0.5;
  - ambient `['#3a3a8a', '#100818', 1.0]`;
  - fog `#1a1035`, near 6000, far 22000;
  - bloom strong.
- **Terrain:** flat street level at −40 m, dark concrete.
- **Scenery:**
  - 260 megatowers (60–350 m, window-grid emissive textures in three palettes);
  - neon signs and holo billboards (hue-cycling) with the sponsor list;
  - maglev rails with trains moving on loops;
  - sweeping searchlights;
  - flying traffic lanes (small emissive craft on paths);
  - **the Meridian Spire** (a 500 m tower with a beacon) next to the crossover;
  - rooftop helipads with blinking lights;
  - light rain.
- **Music:** `meridian`.

#### BOREALIS VAULT: tier 3, expert. 5.03 km · tightest 44 m (switchbacks) · climbs to +11 % · the Vault **drop** (17.2 m) · a 490 m ice tunnel

> *Minus forty, plus aurora. The Authority recommends not stopping.* An arctic research basin at night: a station
> plateau start, sweeping descents, the Vault drop, the ice tunnel, a frozen lake with an open edge, and a brutal
> switchback climb under the aurora.

```js
points: [[0,0,110],[-350,0,110],[-650,60,104],[-850,220,92],[-905,420,80],[-892,478,76.5],[-878,524,77.2],[-870,552,77.6],
  [-852,612,60],[-800,690,53],[-600,770,47],[-380,800,38],[-150,760,30],[60,820,22],[260,950,14],[480,1000,10],[700,960,10],
  [880,860,12],[1000,700,18],[1020,520,30],[930,380,44],[1000,250,58],[900,120,72],[720,140,84],[560,60,96],[380,0,106],[190,-15,110]],
width: 26, start: 200,
jumps: [{ from: 6, to: 8, kind: 'drop', name: 'THE VAULT' }],   // cp7 virtual; lip 77.2 m, lower deck 60.0 m; a ski-jump lip at +1.7 %
tunnels: [{ a: { cp: 12, d: 30 }, b: { cp: 14, d: 60 }, style: 'ice' }],
speedPads: [{ cp: 2, d: 40, u: 0 }, { cp: 5, d: 15, u: 0 }, { cp: 10, d: 80, u: -3 }, { cp: 15, d: 100, u: 0 }, { cp: 24, d: 60, u: 3 }, { cp: 26, d: 80, u: 0 }],
weaponPads: [{ cp: 3, d: 40 }, { cp: 11, d: 60 }, { cp: 14, d: 100 }, { cp: 17, d: 40 }, { cp: 22, d: 40 }],
pit: { a: { cp: 0, d: 30 }, b: { cp: 1, d: -10 }, side: 'left', w: 8 },
openEdges: [{ a: { cp: 15, d: 0 }, b: { cp: 16, d: 100 }, side: 'right' }],   // the frozen lake
banks: [{ from: 19, to: 22, deg: 26 }],                                        // the switchbacks
```

Control points along the track: 0, 350, 658, 918, 1126, 1186, 1234 (lip), 1264 (virtual), 1330 (far edge), 1424,
1642, 1864, 2098, 2318, 2558, 2784, 3010, 3216, 3418, 3602, 3772, 3924, 4094, 4278, 4458, 4648, 4840.

**The Vault** (App. C): slow craft land hard (45 m/s: −40°); 115–170 m/s land 31–111 m past the far edge at −12 to
−15°. Air time is about 1.0–1.2 s, room for two rolls.

- **Theme `arctic`:**
  - sky `['#020814', '#0a2a4a', '#1a4a6a']`;
  - moon `#a0c8ff`, 0.9;
  - fog `#9ab8d8`, near 9000, far 26000.
- **Terrain:** snowy ridges (`E.noise2` octaves), a glacier valley, the frozen lake (flat at 8 m) around local
  (480, 1000), and dark rock strata on the steep parts.
- **Scenery:**
  - the research station at the start (domes, a radar dish turning, masts with blinking red lights);
  - ice spikes;
  - **aurora ribbons:** 5 tall translucent emissive strips, animated in waves, high in the sky;
  - snowfall near the camera;
  - the ice tunnel (translucent blue walls with inner glow);
  - lake cracks (decals);
  - a frozen-in icebreaker ship as the landmark.
- **Music:** `borealis`.

**Grid, sectors, records:** automatic (§3.1). **Overclock skin:** any track (§3.7).

### 4.4 Weapon icons and pickup look

24 × 24 pixel icons (`E.sprite` strings or px drawing, shaded with `E.tones`), each in its §3.4 colour on a dark
rounded tile:

| Icon | Drawing |
| --- | --- |
| SWARM | three small rockets fanned |
| SEEKER | a missile inside a target ring |
| MINEFIELD | a spiked disc |
| CANNON | three tracer dashes |
| RAILSHOT | crosshairs with a long beam to the right |
| TREMOR | a sine wave over a ground line |
| BULWARK | a hexagon shield |
| AUTOPILOT | a steering yoke with an "A" |
| NITRO | a double flame chevron |
| SIPHON | a zigzag arrow into a droplet |

The same icons go on the How to Play pages and in the dev panel's Give weapon. In 3D, the weapon pad's sigil is the
amber triangle. The HUD shows the icon.

### 4.5 Season events, story beats, academy drills, radio (`08-data-season.js`, `09-data-story.js`)

Speakers: **ORACLE** (the Authority), **PRINCIPAL** (the player's team's principal), **RIVAL** (`{$rival}`), and
**PILOT** (`{$pilot}`, the player). Briefings play before an event's first attempt (then from the event tile's
BRIEFING button). Debriefs play after a result. Each line is one dialog page with a portrait and a gibberish voice.
✕ advances, △ skips all.

| # | Tier / class | Event | Track | Target (gold / silver / bronze) | Briefing → debrief beats |
| --- | --- | --- | --- | --- | --- |
| — | Season open | PROLOGUE (first entry) | — | — | ORACLE: "AUTHORITY NOTICE 0417. ROOKIE LICENCE GRANTED. CLASS: SPARK. GRAVITY: OPTIONAL." · PRINCIPAL: "Welcome to {$team}. Your test laps were adequate. Adequate is where champions start." · PRINCIPAL: "Bring back three medals and the Authority lets you go faster." · RIVAL: "Another rookie. I'll learn your name when I need it for the wreck report." |
| E1 | 1 · SPARK | ACADEMY | Port Solenne | all drills first try / ≤ 3 retries / completed | ORACLE: "ELEVEN DRILLS. REPEAT EACH UNTIL COMPLIANT." → ORACLE: "TRAINING RECORD FILED. YOU MAY NOW RACE OTHER PEOPLE." |
| E2 | 1 · SPARK | RACE 3 laps | Port Solenne | 1st / 2nd / 3rd | PRINCIPAL: "Port Solenne. Wide, forgiving, full of yachts. Win, and the sponsors notice." → win: "First place. The harbour lights flashed our colours. That was contractual." / podium: "A podium. Keep the trophy dust-free; we photograph it." / else: "Finishing is a habit. So is losing. Choose." |
| E3 | 1 · SPARK | TIME TRIAL 3 laps | Karakum Spire | medal times | PRINCIPAL: "No weapons, no excuses. The gorge wants two hundred and seventy kilometres an hour. Arrive with them." → "The clock has accepted your apology." |
| E4 | 1 · SPARK | RACE 3 laps | Karakum Spire | 1st / 2nd / 3rd | RIVAL: "Karakum has a gorge. Most rookies meet the bottom of it." · PRINCIPAL: "Ignore {$rival}. Take the speed pads before the ramp." → win: RIVAL: "Luck. Statistically you're due a wall." |
| — | tier 1 done (3 medals) | PROMOTION | — | — | ORACLE: "AUTHORITY NOTICE 0533. PILOT {$pilot} PROMOTED. CLASS: FLARE." · PRINCIPAL: "They noticed you. That is not always good." (unlocks FLARE) |
| E5 | 2 · FLARE | SNIPEOUT first to 10 | Meridian Stack | 1st / 2nd / 3rd | PRINCIPAL: "Snipeout. A point for every hit, three for every elimination. In the Stack, everyone is a target." · RIVAL: "Stand still. It's more efficient." → "Sniped clean. The Stack's residents filed noise complaints." |
| E6 | 2 · FLARE | OVERCLOCK | Port Solenne | zone 30 / 20 / 10 | ORACLE: "INVESTIGATION 77-B: UNSANCTIONED OVERCLOCKING. ALL PILOTS WILL DEMONSTRATE COMPLIANCE." · PRINCIPAL: "{$rivalTeam} has been running engines hot. The Authority wants to see what an honest engine survives. Show them." → ORACLE: "COMPLIANCE NOTED. ZONE {$zone}." |
| E7 | 2 · FLARE | HOT LAP | Meridian Stack | medal lap times | PRINCIPAL: "One perfect lap. Our sponsor's board meets tomorrow. Give them a number." → "They framed the number. Literally." |
| E8 | 2 · FLARE | RACE 3 laps | Meridian Stack | 1st / 2nd / 3rd | PRINCIPAL: "QWIK-FUEL wants a podium at Meridian, or they paint someone else's craft. No pressure. Some pressure." → podium: "QWIK-FUEL renewed. We are once again flammable." |
| — | tier 2 done | PROMOTION | — | — | ORACLE: "AUTHORITY NOTICE 0610. CLASS: STORM. PILOTS ARE REMINDED THAT WALLS DO NOT MOVE." · RIVAL: "Storm class. Finally, something fast enough to be interesting." (unlocks STORM) |
| E9 | 3 · STORM | RACE 3 laps | Borealis Vault | 1st / 2nd / 3rd | PRINCIPAL: "Borealis. Cold, long, and the Vault is seventeen metres straight down. Land it flat." → "You came back warmer than you left." |
| E10 | 3 · STORM | SNIPEOUT first to 12 | Karakum Spire | 1st / 2nd / 3rd | RIVAL: "Rematch in the canyon. Bring a shield. Bring two." → win: RIVAL: "Fine. The Grand Prix, then." |
| — | E9 + E10 medalled | GP UNLOCK | — | — | ORACLE: "THE HOVERLINE GRAND PRIX. FOUR CIRCUITS. ONE CHAMPION. SPECTATORS ARE ADVISED TO REMAIN BEHIND THE BARRIERS." |
| GP | final · STORM | 4 races × 3 laps: Solenne → Karakum → Meridian → Borealis, points 10-8-6-5-4-3-2-1 | all | champion / 2nd / 3rd overall | between races: ORACLE reads the standings: "LEADER: {$leader}. GAP: {$gap} POINTS." Then a PRINCIPAL or RIVAL line by situation (leading / chasing / behind; 2 each) |
| END | — | ENDING (any GP medal) | hangar podium | — | champion: ORACLE: "AUTHORITY NOTICE 0700. CHAMPION: {$pilot}, {$team}. SINGULARITY CLASS AUTHORISED." · PRINCIPAL: "Champion. I prepared a speech. I'll skip it." · RIVAL: "Enjoy it. Next season, I'm faster." · ORACLE: "THE AUTHORITY REMINDS ALL PILOTS: GRAVITY IS OPTIONAL. CONTRACTS ARE NOT." → the credits roll (About page 5) over a hangar podium orbit. Podium variant: PRINCIPAL: "A Grand Prix podium. The board calls it progress. I call it next year." (SINGULARITY unlocks on any GP medal; the CHAMPION livery needs gold) |

**Academy drills** (E1, and ACADEMY in the menu). Each drill:
- teleports the player to its start (`s`, `u`, a speed);
- shows a big instruction card with **live glyphs** (`{thrust}` becomes ✕, W or a mouse icon by device);
- checks success;
- on failure: "TRY AGAIN" and a reset after 2 s;
- on success: "DRILL CLEAR" plus a chime.

The instructor is ORACLE. The track is Port Solenne at SPARK, solo.

| # | Drill | Start | Instruction (with glyph tokens) | Success check |
| --- | --- | --- | --- | --- |
| 1 | THRUST | grid | "Hold {thrust} to thrust. Reach 250 km/h." | speed ≥ 250 km/h |
| 2 | STEER | cp1 + 60 m | "Steer with {steer} through the three gates." | pass 3 holo-gates (rings at u = −6, +6, −6 m, 80 m apart) within ±3 m |
| 3 | AIRBRAKES | cp18 − 150 m, 220 km/h | "Squeeze {brakeL} or {brakeR} through the lighthouse hairpin. Stay off the walls." | an airbrake > 0.3 held ≥ 0.5 s in the hairpin, no wall hit, exit ≥ 150 km/h |
| 4 | PITCH | cp10 + 0 m (the old-town descent, about −5 %), 200 km/h | "Downhill: hold {noseDown} to pitch the nose down and gain speed." | pitch ≥ 0.5 for 1 s on the descent, and +15 km/h |
| 5 | SPEED PADS | cp16 − 100 m | "Blue chevrons boost you. Hit two speed pads." | 2 speed-pad events (cp16 and cp21 pads) |
| 6 | WEAPONS | cp2 − 100 m | "Amber pads arm you. Collect a weapon, then fire {fire} at the target drone." | a forced SWARM pickup; the TARGET DRONE (a hovering ring craft, 30 HP, on the track at cp3 + 100 m) hit ≥ 1 |
| 7 | ABSORB | cp11 − 100 m | "Not every weapon is worth firing. Collect one and absorb it with {absorb}." | a forced MINEFIELD pickup, then an absorb event (energy goes up) |
| 8 | SIDE-SHIFT | cp15 − 200 m | "Mines ahead. Side-shift with {shiftL} or {shiftR} to slip past." | a mine line at cp15 + 40 m (3 mines spanning 2/3 of the width, the gap on the side away from the racing line) passed with no hit and a side-shift used in the last 1.5 s |
| 9 | BARREL ROLL | cp11 − 100 m (about 2.5 s before the lip), at 300 km/h | "Off the Harbour Step, flick {steer} left-right, or press {shiftL}/{shiftR} in the air. Land the roll for a boost." | a `roll` event with `ok` |
| 10 | PIT LANE | cp21 + 0 m, energy 40 % | "Shield low. Ride the green pit strip to recharge to full." | energy ≥ 99 |
| 11 | FULL LAP | grid, standing start | "Put it together. One lap under sixty seconds." | a lap ≤ 60.0 s at SPARK (the ideal line is about 46 s) |


**Race radio:** a pool of about 30 short lines, gibberish plus subtitle in the radio box, rate-limited to one per
12 s. Triggers: overtaking or being overtaken by a named pilot, a weapon hit, an elimination, the final lap. Speakers
are the pilots (§4.1 banter, plus 2 more each), for example:
- "Make room." / "Too slow, rookie." / "That one stung." / "Shield's holding." / "Pit lane, now." (own team)
- RIVAL: "Behind you. Still." / "Smile for the wreck report."

### 4.6 Sponsors and signage (`66-scenery.js` canvas textures)

Fictional brands for gantries, billboards, wall panels and holograms. Each is a logo (a geometric mark drawn in px)
plus a name and a slogan, in the engine's pixel font at scale 2–4 on 128–256 px canvases:

| Brand | Slogan |
| --- | --- |
| QWIK-FUEL | FILL UP. FALL UP. |
| OKTA NOODLE | EAT AT 600 KM/H |
| HALCYON BANK | YOUR MONEY, FASTER |
| AXON AIR | BREATHE PREMIUM |
| VANTA PAINTS | DARKER THAN NOTHING |
| MERIDIAN TELECOM | ALWAYS ON. ALWAYS. |
| POLARIS COLD STORAGE | WE KEEP IT FROM YOU |
| NOVA-CHROME | SHINE RESPONSIBLY |
| KIBO TEA | STEEPED IN THE FUTURE |
| ORBIT SOCKS | KEEP YOUR FEET IN ORBIT |
| THE AUTHORITY | DO NOT LOOK DIRECTLY AT THE FUTURE |
| SOLENNE TOURISM | COME FOR THE SEA. STAY FOR THE SPEED. |

Signage: SECTOR markers 1–8, PIT, the jump warnings ("GORGE: 270 KM/H MINIMUM"), and chevron boards.

---

## 5. Build order and milestones

The ordering principle: **the riskiest unknown first**. First the 3D stack in one file, then the core loop (one craft
on one track), then a full race (AI and weapons). Breadth comes after that (modes, UI, season, audio), then
integration (attract, dev, hub). Polish is last. Each milestone ends with its tests passing in `node tests/run.mjs`.

| # | Milestone | Deliverables | Exit tests (all automated unless marked 📷 = screenshot review) |
| --- | --- | --- | --- |
| **M0** | Skeleton and stack spike | Dev folder, pinned downloads (§2.1), `package.json`, `tests/run.mjs` and `tests/lib/vm.mjs`, `tools/bundle.mjs`, `index.html`. A minimal `95-main.js`: `new E.Game` with SN.INPUT, the boot steps (the 3D wait/init), a test oval TrackDef rendered as a plain ribbon mesh in a terrain world, a dummy craft box moving along it at 2000 u/s, the chase cam, an overlay text | Node: the game boots headless and `advance(5)` runs with no errors. Browser: the bundle opens from file:// with no page errors; `World3D.backend` is 'WebGPU' or 'WebGL 2'; the #view canvas is non-black over > 30 % of its area; it reaches race view in < 15 s. 📷 the ribbon and box |
| **M1** | Tracks | `20-track.js` complete: spline, slices, frames, bank, features, surface, locate, query, line, speed profile, validation, minimap. `07-data-tracks.js` with all 4 tracks. `tools/trackcheck.mjs` | unit: frame handedness (8 headings), bank sign, closure continuity (`C(L−ε) ≈ C(0)`), arc-length error < 0.1 %, lengths within 1 % of §4.3, overpass clearances (24.5 / 31.9 m ±0.5), the `{cp,d}` feature s-values, the racing line inside the bounds, speed profile ≤ top. 📷 an overhead debug render of each track with features |
| **M2** | One craft that flies right | `25-ship.js`, `27-collide.js` (bodies only), `01-input.js` (mapping, double tap, flick, vpad), Tune registry, engine edits §2.7.1–3 (glyphs default, font glyphs, analog values) and §2.7.5. A player craft on any track, keyboard and pad | physics suite (§7.2): the feel targets of §3.2, walls never crossed at 3000 u/s, no NaN in 10 min of random input, the jumps per App. C at each class, drop landings, overpass stability (s never jumps levels), pads, pit, side-shift lateral 3–5 m, the barrel-roll boost and botch, rescue after a fall, a simple line bot (`T.line` + `T.vline` with PD steering) laps every track × class with 0 rescues |
| **M3** | It looks like the game | `60-render.js` (worlds, interpolation, cameras), `64-trackmesh.js` (surface, walls with neon and chevrons, pads, tunnels, supports, gantries, drop and gap faces), `62-shipkit.js` (6 craft, liveries, flaps, glow, trails, roll), the themes' sky/fog/sun and terrain carve, basic scenery per theme, bloom | browser: each track loads in < 10 s; no shader stalls over 50 ms after GO (frame-time log); 📷 per track: the start grid, a banked corner (roll sign), a tunnel, the jump, the overpass from both decks; all 6 craft on the turntable |
| **M4** | A real race | `40-race.js` (lifecycle, grid, countdown and launch revs, laps, sectors, positions, wrong way, finish, results, elimination), `35-ai.js` (line, speed, control, avoidance, pads, mistakes, rubber band, difficulty), `45-replay.js` (record and replay, hash) | race suite: an 8-AI race on every track × class finishes; no craft stuck > 3 s; ≤ 1 rescue per craft per race; lap times within ±25 % of §4.2; positions consistent with progress; `hash` equal on two runs from the same seed; a replay re-sim gives an equal hash; wrong-way detection; the launch-boost window |
| **M5** | Combat | `30-weapons.js` (pads, roll table, 10 weapons, absorb, lock-on, damage, stagger), AI weapon logic, `68-fx.js` for every weapon, events wired to interim SFX (`audio.define` voices; M9 replaces every one, and none may remain) | weapons suite: each weapon fired by a scripted craft at a target in a fixed setup deals its damage; the target's warning appears; BULWARK blocks; absorb adds energy; MINEFIELD triggers; TREMOR misses airborne craft; SIPHON transfers; RAILSHOT hits within its aim tolerance and misses outside; elimination at 0 (DNF in a race, respawn in SNIPEOUT); in an 8-AI race every weapon is used at least once across 4 seeded races |
| **M6** | HUD and front-end | `70-hud.js`, `55-glyphs.js`, `75-ui.js` (widget kit, every §3.9 screen), settings (§3.17), pause items, the touch-only notice, the About skeleton | flow suite: title → menu → quick race setup → loading → race → results → menu by scripted taps; mouse hover focus (`input.feed('move')`) and click activation; the prompt bar switches device (key, pad stub, mouse); Button symbols switches PS ↔ Xbox labels; the touch-only notice when `matchMedia('(any-pointer: fine)')` is false and `maxTouchPoints > 0` (stubbed in vm), with no touch buttons (`input.touchButtons` never called). 📷 every screen at 1280×720 and 1920×1080 |
| **M7** | Every mode | TIME TRIAL plus ghosts, HOT LAP, SNIPEOUT, OVERCLOCK plus the skin, ACADEMY (11 drills, drone, gates, mine line), VERSUS (join, half keys, split HUD), the REPLAY scene, records | modes suite: each mode starts, plays, and ends with correct results; ghost save/load round-trips and plays back aligned (< 1 m error); Overclock zones advance and the run ends at 0 energy; the academy bot passes all drills; versus with 2 inputs makes 2 viewports and both finish; replay click-to-follow selects the clicked craft (feed a click at a projected position) |
| **M8** | Season and story | `08-data-season.js`, `09-data-story.js`, `78-season-ui.js` (hub, briefings, GP, ending, credits), saves, unlocks | season suite: the **scripted playthrough** (§7.4) of the whole season with the player bot; unlocks fire in order; save → reload → state equal; every dialog line references only defined vars; every event playable |
| **M9** | Sound | engine edit §2.7.4; `50-audio.js`: 6 songs and stings, the full SFX catalogue, engine hums, the music director (layers, final lap, overclock tempo), `SN.Voice` gibberish, announcer callouts, radio | audio suite (headless, no WebAudio): every song parses with no engine warnings and is ≥ 16 bars; each event type maps to an existing sound; `Voice.say` durations are > 0 and stable per word; the music layers react to race events (`audio.pos.layers`). 🔊 a human-free check: in the browser, record `audio.drift` stays < 10 ms and no audio errors |
| **M10** | Attract and dev | `85-attract.js`, `80-dev.js` (panel, cheats, sliders, reset, overlays, info) | flow: 10.0 s idle on the title → attract starts (not at 9.9 s); any of key/pad/click exits within 1 step; the attract shows ≥ 8 distinct weapons and ≥ 3 tracks across one loop (counted from events); dev: every slider changes `SN.Tune.T` and the sim responds (e.g., topSpeedMul 1.5 raises top speed); RESET ALL restores every default exactly; each cheat works |
| **M11** | AI Hub | `90-hub.js`, its own card, ghost send/receive, the session scene | hub suite (Node mock of `AIHub`, §7.6) and the **real harness** (§7.6): `players=2&auto=1`, `players=4&latency=150&jitter=50&loss=5&auto=1`, `…&scenario=host-leave`; `__hubCheck.pass === true` in each |
| **M12** | Polish and ship | scenery density, effects, juice (shake, flashes, rumble via `input.rumble`), the balance pass with the sliders, medal calibration (`tools/medals.mjs`), the About pages filled, `exit-interview.json`, the final bundle | the full `node tests/run.mjs` passes; `tools/bundle.mjs` passes its checks (no TODO, an identical hub client); `node engine/handoff/tools/check.mjs ../<bundle>.html` gives no errors (it will list the CDN files as external, which is expected); 📷 the final screenshot set (§7.7) |

**The vertical slice at the end of M5** must already *play* like the game: a full race with AI and weapons on every
track. If time runs short later, the plan's priorities hold:
1. a feature's existence and correctness (§8);
2. the playthrough test;
3. the look;
4. the quantity of content.

---

## 6. Risks and how to de-risk them

| # | Risk | Why it is risky | De-risk (when) |
| --- | --- | --- | --- |
| 1 | **The 3D stack in one file** (an inline ES module, an import map to the CDN, file://, WebGPU → WebGL 2 fallback, headless Chromium) | Nothing else works if it doesn't. It is new to most builders | **M0 spike first.** Prove the bundle from file:// in Playwright with a picture. If the CDN is blocked in the test environment, retry once, then vendor `three.webgpu.min.js`, `three.core.min.js` (imported by it), `three.tsl.min.js` and `rapier.mjs` as inline modules: rewrite the import map to `data:`/blob URLs made by a tiny classic loader, or inline the files as `<script type="module">` with the specifiers mapped to blob URLs. Keep the CDN as the default (smaller file) |
| 2 | **Frame and handedness bugs** (a left-handed engine frame, bank signs, camera roll sign, `toThree`) | Silent wrongness: mirrored steering, banks the wrong way, a camera rolling backwards | Unit tests in M1 (§7.2) before any physics. One `SN.frame` helper, used everywhere. A screenshot check of the roll on the Karakum spiral (M3) |
| 3 | **Physics at 3,000 u/s** (tunnelling, jitter on crests, stuck on walls, overpasses confusing the track lookup) | The core feel. Hard to see in code review | Track-space walls are analytic (no tunnelling). Local-only `locate`. Invariant tests over long random-input runs (M2). Dev sliders for live tuning. The App. C jump numbers become tests |
| 4 | **AI that finishes on every track** (the jump speeds, hairpins, overpass, open edges, the drop in a curve) | A stuck AI breaks races, attract, the season playthrough and medal calibration | One line/profile generator plus a PD controller, tested on 4 tracks × 4 classes × 4 seeds in M4. A stuck detector, rescue, and a per-track min-speed constraint at the gap |
| 5 | **Determinism** (replays, the hub's fair start, hashes) | Any `Math.random`, dt or order dependence breaks replays | §2.8 rules. A lint test that greps the sim files for `Math.random`, `Date.now` and `performance.now`. Hash-equality tests from M4 on |
| 6 | **Shader stalls and loading hitches** (World3D compiles on first use) | Visible hitches at GO or on the first weapon | Materials only at world creation. The warm-up frame and `world.prepare()` in loading (§3.7). Frame-time logging in the M3 browser test |
| 7 | **Scope** (11 modes, 4 tracks, season, audio, hub) | Running out of time with stubs left (the brief forbids stubs) | Milestone order puts every feature in a minimal complete form before polish. The §8 checklist is the definition of done. Cut quantity, never features |
| 8 | **Hub conformance** (card, ready without keys, time-up, end, ghosts) | The hub keeps failing games out of sessions | The Node mock early (M11 start), then the real harness at 1, 2 and 4 players with network faults and host-leave. The session path shares the race code, so it adds little new code |
| 9 | **Synth music quality** | Bad music undermines the source's identity | The engine edits (filter env, unison) make house/acid/trance timbres possible. Compose at least 16 bars with A/B sections and use layers. A headless check that songs parse. A listen in the browser (the builder has no ears, so check with `audio.pos` and drift) |
| 10 | **Readability at 10 feet** (a 427×240 HUD on a TV) | Tiny text is the default trap | HUD at scale 2 minimum for numbers, the large-HUD option, ≤ 6 items per screen. Screenshots at 1920×1080 scaled down to 50 % must stay legible (📷 M6) |
| 11 | **Analog triggers and DualSense mapping** | The engine reads only `pressed` | Engine edit §2.7.3, tested with a stubbed `navigator.getGamepads()` in Playwright (axes and button `value`) |
| 12 | **/tmp nearly full** (a shared tmpfs) | Playwright and Chromium need temp space | `TMPDIR=<dev>/.tmp` for every tool run (§0) |
| 13 | **Terrain intersecting the track or tunnels** | The ground poking through decks or tunnel interiors looks broken | The corridor grid carve (§3.7) plus portal frames. 📷 every tunnel portal and every elevated section in M3 |

---

## 7. Testing (one command)

**The command:** `cd SnipeoutHD-WipeoutHD-claude-opus-5-5-max-20261103-174728 && TMPDIR=$PWD/.tmp node tests/run.mjs`.
It runs every suite (Node first, then browser, then the hub harness). It prints **only failures** (suite › test:
message, plus the snapshot JSON where useful) and **one final line**:
`412 passed, 0 failed (node 380, browser 22, hub 10) in 96 s`.
- `node tests/run.mjs physics race` runs only the named suites.
- `--node` skips the browser and hub suites.
- Rerun a suite only after changing the code it covers (the suites map to files, listed in `tests/run.mjs`).

### 7.1 Harness

`tests/lib/vm.mjs` follows the handoff's `game/test.mjs` and `kits/test.mjs`:
- a `vm` context with stand-ins `window = ctx`, `addEventListener() {}`, `location: { search: '', hash: '' }`,
  `matchMedia`, `navigator: { maxTouchPoints: 0, getGamepads: () => [] }`;
- it runs `engine/my-3d2dge.js`, then the `src/` files in manifest order;
- `E.current` is the game, and `game.advance(s)` drives it;
- scripted input through `game.input.tap/hold/press`, `input.feed` for the mouse, and `SN.vpad` for analog;
- assertions through `game.debug.snapshot()`.

```js
game.debug = {
  snapshot: () => ({ scene, state, mode, track, cls, t, ships: [{ id, p, s, u, h, v, kmh, energy, lap, place, weapon, airborne, finished, elim }],
                     player: {...}, hudCallouts: [...], focus: ui.focusId, device: input.lastDevice, attract: bool, dev: bool,
                     season: { medals, unlocked }, hub: { connected, sent, progressCount } }),
  teleport(s, u = 0, v = 0), give(weapon), setEnergy(x), finishNow(), events: () => race.events.slice(),
  race: () => race, track: () => track, tune: SN.Tune
};
```

### 7.2 Node suites (fast, about 60 s in all)

- **unit:**
  - math and frames (8 headings), bank sign, `toThree` mapping;
  - the spline: closure, arc length, knot s;
  - each TrackDef validates;
  - feature s-values; `query` returns the right deck at overpasses;
  - the racing line inside the bounds; speed profile ≤ top;
  - Tune def/reset;
  - the input mapping: double-tap, flick, ramped keys;
  - the hash is stable;
  - **lint:** the sim files contain no `Math.random`, `Date.now`, `performance.now`, `alert(`, `confirm(`, `prompt(`
    or `window.open`, and no file contains TODO.
- **physics:**
  - every feel target in §3.2;
  - jumps: Karakum's gap at 70 / 80 / 90 / 140 m/s (fails at 70, clears at ≥ 80, landing window as App. C ±15 %), drops
    land at 45 and 170 m/s;
  - long random-input soak (10 simulated minutes, 4 tracks): no NaN, never `|u| > hw` on walled decks, never `h < 0`;
  - overpass: a craft on the upper deck stays on it (its s stays in the upper range);
  - pads, pit recharge, side-shift, roll ok/botch, rescue after an open-edge fall;
  - launch boost window.
- **race:**
  - 4 tracks × 4 classes × 2 seeds of 8 AI: all finish, no stuck, rescues ≤ 1 per craft, lap times within ±25 % of
    §4.2;
  - positions sorted by progress; wrong way; final-lap event; results;
  - determinism (2 runs, equal hash); replay re-sim equals the hash.
- **weapons:** every row of §3.4, each in a fixed two-craft setup, plus AI usage counts.
- **modes:** time trial (+ ghost round trip), hot lap (flying start, best lap), snipeout (scoring, respawn, the target
  ends it), overclock (zones, tempo events, end), academy (the bot passes 11 drills), versus (2 viewports, half-keys
  labels), grand prix (points table, ties).
- **flow:**
  - title → menu → setup → race → results → replay → menu;
  - pause menu items present (Restart, Camera, How to play, Dev mode, Quit) and absent in a session;
  - settings keys exist;
  - glyph labels per device and setting;
  - touch-only notice;
  - attract timing and exit;
  - dev sliders and reset; each cheat.
- **season:** §7.4.
- **audio:** song parsing, event → sound map, `Voice` durations, the music director's layer changes (headless:
  `audio.pos`).
- **hub (mock):** §7.6.

### 7.3 The player bot (`tests/lib/bot.mjs`)

`bot.drive(playerIndex, { skill: 1, weapons: true, rolls: true })`. Each step it computes `SN.AI.controls(ship, race)`
for the human's craft and writes them into `SN.vpad[i]`. Edge actions (fire, absorb, side-shift) go through
`input.tap`, so the human path (mapping, double-tap, flick) is exercised. `bot.menu(path)` navigates screens by
widget id: it taps the arrows to reach the focus, then confirm.

### 7.4 Scripted playthrough of the whole game (the season suite and the `playthrough` test)

One test plays the game end to end, headless, on fixed seeds, asserting along the way:
1. Boot → title.
2. Wait 10 s → attract (assert it is running, weapons seen, at least 2 tracks across the playlist with
   `game.advance(120)`) → a key press → title.
3. → menu → ACADEMY (the bot passes the drills) → SEASON: prologue → E1…E10 in order, each via the season hub, bot
   driving, ≥ bronze (retry up to 3 times, asserting progress), the briefings advanced by taps.
4. Promotions unlock FLARE and STORM.
5. GP: 4 races; assert the points and the standings screen.
6. The ending lines and the credits play; SINGULARITY is unlocked.
7. Then QUICK RACE at SINGULARITY on Borealis; TIME TRIAL Karakum (a ghost saved, then loaded on the next run); HOT
   LAP Meridian; SNIPEOUT Solenne; OVERCLOCK to zone 10; VERSUS with `game.addPlayer({ keys: 'right' })` and two
   bots; REPLAY of the last race (hash equal).
8. The pause menu → Dev mode → slider → reset → close; Settings → Button symbols → Xbox (labels change); About pages
   1–5.
9. `game.errors.length === 0` throughout.

### 7.5 Browser suites (Playwright, Chromium headless; `tests/browser/`)

- `bundle loads`: file:// URL; no `pageerror`; `My3D2dge.World3D.backend` is set; the boot completes in < 20 s.
- `renders`: in the race, sample the `#view` canvas (`toDataURL` or a screenshot) and require at least 40 % non-black
  pixels and > 24 distinct colours; the HUD canvas is drawn.
- `input devices`:
  - keyboard thrust raises the speed;
  - stubbed `navigator.getGamepads()` (a DualSense-like id, standard mapping): ✕ thrust, L2 `value: .5` halves the
    airbrake, and prompts show ✕/□/○ glyphs;
  - the Xbox setting shows A/X/B;
  - the mouse hovers and clicks a menu tile.
- `screens`: the flow through the menus with screenshots to `tests/out/` (📷 reviewed by the builder only for look:
  layout, legibility, art).
- `split screen`: 2 viewports draw two different camera poses (the pixels differ between the halves).
- `touch-only`: emulate a phone (`hasTouch`, coarse pointer, no keyboard events) → the notice and the SETTINGS button
  are visible, and no engine touch buttons are drawn; after 10 s the attract runs.
- **Performance is out of scope** (TASK.md), but log the median frame time per track to `tests/out/perf.json` for
  information.

### 7.6 AI Hub tests

- **Node mock** (`tests/hub/mock.mjs`): a fake `AIHub` installed before the game's scripts (`active: true`, `connect`
  resolves `info` for seat 1 of 2, events delivered by the test). It asserts:
  - no title or menu scenes are entered;
  - `ready()` is called exactly once with no input;
  - nothing moves before `start`;
  - the race begins at `time() ≥ 0`;
  - `progress` is called ≥ once a second, with a numeric score and a label;
  - `send` is ≤ 20/s, unreliable, ≤ 16 KB;
  - an incoming message creates and moves a ghost;
  - `leave` removes it;
  - `result({ time })` on finish (bot);
  - `time-up` before the finish → `result({ score })` once;
  - `end` → input ignored, music stopped, no further `send`;
  - `card` events: Enter → `answer('ready')`, △ → `answer('more')`.
- **Real harness** (`tests/hub/hub.test.mjs`):
  1. Copy the bundle into a scratch dir inside `tests/out/hub/` with the pinned `harness.html`, `bridge.js` and
     `round.js`.
  2. Spawn `python3 -u -m http.server 0 --bind 127.0.0.1` there (`-u`: unbuffered, so the "Serving HTTP on 127.0.0.1
     port N" line arrives at once), and parse the port from it.
  3. Fetch `/<bundle>.html` and confirm its `<title>` is `Snipeout HD` (it is our page).
  4. Open `harness.html?game=<bundle>.html&players=2&auto=1` in Playwright, wait for `body[data-complete="true"]`
     (timeout 240 s), and read `window.__hubCheck`. Require `pass === true`, and print the failed checks otherwise.
  5. Repeat with `players=4&latency=150&jitter=50&loss=5&auto=1`, and with `&scenario=host-leave`.
  6. Kill the server **by its PID** (the child process you spawned).

### 7.7 Screenshots (only for what scripts can't judge)

Per track:
- grid at the countdown;
- chase cam mid-corner (bank and roll);
- cockpit;
- tunnel;
- jump in flight;
- overpass from below and above (Karakum, Meridian);
- a weapon effect (each weapon once across tracks);
- the Overclock skin at zone 1 and zone 20;
- split screen.

Screens: title, attract with DEMO, every menu screen, team select (each craft), results with podium, the season hub,
a briefing with portrait, the dev panel (each tab), About pages, the touch-only notice, the hub card.

Review them for: legibility at 10 feet (view at 50 %), contrast, colour-only information, a HUD clear of the corner,
nothing clipped at 4:3, 16:9 or 21:9 (`expand: true` sizes: 1024×768, 1280×720, 2560×1080).

---

## 8. Definition of done: every TASK.md requirement, where it lives, how it is proven

| TASK.md requirement | Where in the game | Proof |
| --- | --- | --- |
| Genre and perspective that fit the source | anti-gravity combat racing; chase, far and cockpit cams plus TV cameras (§1, §3.6) | 📷 M3 |
| Title: a riff picked by a real RNG | **Snipeout HD** (§0, `secrets.randbelow`) | — |
| One HTML file named `SnipeoutHD-WipeoutHD-claude-opus-5-5-max-20261103-174728.html` (CDN dependencies allowed) | `tools/bundle.mjs` (§2.3) | browser: bundle loads |
| Dev files in the subfolder; bundle in the root | §2.2 | — |
| Built on the handoff; engine changes allowed | §2.1, §2.7 (marked edits) | About → engine changes |
| Art: the engine's native style plus new assets that feel like the source | pixel-res World3D, toon/lambert, pixel HUD/fonts; new craft, tracks, neon, sponsors (§3.7, §4) | 📷 |
| Animation: the engine's system plus new animations | rigs (cards, poses `cheer` / `wave` / `hips`, portraits that talk), tweens/scripts; new procedural craft animation (roll, flaps, glow, trails, barrel roll, explosions, drone), HUD/menu tweens (§3.7, §3.8) | 📷 |
| Audio all in code; gibberish voices | the synth plus edits, 6 songs, SFX, hums, `SN.Voice` (§3.10) | audio suite |
| Online: AI Hub integration, and multiplayer for the game on its own | ghost-mode sessions (§3.16); local 2P split-screen VERSUS | hub mock + real harness; versus test |
| Feature-complete demo, long enough to show every mechanic | 11 modes, the season with a GP and an ending, the academy (§1, §3.3, §4.5) | the playthrough §7.4 |
| Dev mode from the pause menu; live sliders and reset | §3.15 | flow: dev |
| Attract mode: 10 s idle, AI demo, any input exits, may cheat | §3.14 | flow: attract |
| Narrative tone like the source | §3.11, §4.5 | review |
| 10-foot, controller-first, DualSense standard mapping | §3.9; analog triggers (§2.7.3) | browser: input devices |
| Keyboard native, PC keys; mouse aims, looks, clicks; hover moves focus | §1 controls; mouse menus, fire/absorb, click-to-follow in replays, drag-rotate in team select | flow + browser |
| Prompts follow the last device; PlayStation default; Settings option for Xbox | `55-glyphs.js`; `glyphs` default and option in Settings (§2.7.1) | flow + browser |
| No dense web-style data screens | ≤ 6 items, big type, one row per craft (§3.9) | 📷 |
| Touch-only: no touch controls, "Controller or keyboard required" plus a settings button, attract runs | §3.9 / §3.14 | browser: touch-only |
| No TODOs, placeholders, stubs | bundle lint, unit lint (§2.3, §7.2) | tests |
| Testing: headless scripts, `game.advance` / `game.debug`, a scripted whole-game playthrough, one command, failures only plus a one-line count | §7 | `node tests/run.mjs` |
| Servers on 127.0.0.1 port 0, our page confirmed, stopped by PID | §7.6 | hub test |
| Source Information, Testing/Engine/Prompt Feedback in the chat reply **and** the About/Credits screen | §3.18 | About pages; reply |
| `exit-interview.json` in the exact shape, parses | `tools/exit-interview.mjs` (§3.18) | the script checks `JSON.parse` |

---

## Appendix A: reference code (use as is)

**Centripetal Catmull-Rom (closed) and the arc-length resample.** This is the code the planning checker used. The §4.3
numbers come from it.

```js
// P: [[x, y, z], ...] closed loop; returns dense samples [[x, y, z, segIndex], ...] (k per segment)
function catmullClosed(P, k = 64) {
  const n = P.length, out = [], d = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    const t0 = 0, t1 = Math.sqrt(d(p0, p1)), t2 = t1 + Math.sqrt(d(p1, p2)), t3 = t2 + Math.sqrt(d(p2, p3));   // alpha 0.5
    for (let j = 0; j < k; j++) {
      const t = t1 + (t2 - t1) * j / k, q = [];
      for (let c = 0; c < 3; c++) {
        const A1 = (t1 - t) / (t1 - t0) * p0[c] + (t - t0) / (t1 - t0) * p1[c];
        const A2 = (t2 - t) / (t2 - t1) * p1[c] + (t - t1) / (t2 - t1) * p2[c];
        const A3 = (t3 - t) / (t3 - t2) * p2[c] + (t - t2) / (t3 - t2) * p3[c];
        const B1 = (t2 - t) / (t2 - t0) * A1 + (t - t0) / (t2 - t0) * A2;
        const B2 = (t3 - t) / (t3 - t1) * A2 + (t - t1) / (t3 - t1) * A3;
        q.push((t2 - t) / (t2 - t1) * B1 + (t - t1) / (t2 - t1) * B2);
      }
      out.push([q[0], q[1], q[2], i]);                 // (j === 0: exactly control point i: its knot)
    }
  }
  return out;
}
// resample at a fixed spacing ds; returns { L, ds, pts, knots } (knots[i] = s of control point i)
function resampleClosed(dense, ds) {
  const n = dense.length, acc = [0], knots = [];
  for (let i = 1; i <= n; i++) { const a = dense[i - 1], b = dense[i % n]; acc.push(acc[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])); }
  for (let i = 0; i < n; i++) if (i === 0 || dense[i][3] !== dense[i - 1][3]) knots[dense[i][3]] = acc[i];
  const L = acc[n], m = Math.round(L / ds), step = L / m, pts = [];
  for (let k = 0, j = 0; k < m; k++) {
    const s = k * step; while (acc[j + 1] < s) j++;
    const a = dense[j], b = dense[(j + 1) % n], f = (s - acc[j]) / (acc[j + 1] - acc[j]);
    pts.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]);
  }
  return { L, ds: step, pts, knots };
}
```

**Frame helper (engine axes, left-handed: right = cross(up, forward)):**

```js
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
SN.frame = (F, up = [0, 0, 1], bank = 0) => {          // -> { F, R, U }; bank > 0 lowers the right edge
  const R0 = norm(cross(up, F)), U0 = cross(F, R0), c = Math.cos(bank), s = Math.sin(bank);
  return { F, R: [R0[0] * c - U0[0] * s, R0[1] * c - U0[1] * s, R0[2] * c - U0[2] * s],
              U: [U0[0] * c + R0[0] * s, U0[1] * c + R0[1] * s, U0[2] * c + R0[2] * s] };
};
// test: SN.frame([1,0,0]).R ≈ [0,1,0] (south = right when heading east); SN.frame([1,0,0],[0,0,1],.3).R[2] < 0 (right edge lower)
```

**World3D camera pose from a frame:**
- `yaw = atan2(dir.y, dir.x)` and `pitch = asin(dir.z)` (negative looks down), where `dir` = unit(look − eye);
- `roll = rollSign · atan2(dot(Ucam, Rflat), dot(Ucam, Zup))`, with `Rflat` = unit(cross(Zup, dir)) under the engine
  convention.

Set `rollSign` by the M3 screenshot check.

## Appendix B: gibberish voice (`SN.Voice`)

```js
// say(text, v = { f0, speed, ring, crush, vol }) -> seconds; headless: computes the length, makes no sound
function say(text, v) {
  const words = text.toUpperCase().replace(/[^A-Z0-9?!.' ]/g, ' ').split(/\s+/).filter(Boolean);
  let t = 0; const ctx = game.audio.ctx, out = sfxBus();            // the engine's effects bus: volume settings apply
  for (const w of words) {
    const rnd = E.rng(hashString(w)), n = Math.max(1, Math.round(w.replace(/[^A-Z]/g, '').length / 2.6));
    for (let i = 0; i < n; i++) {
      const ch = w[(i * 2 + 1) % w.length], vi = 'AEIOU'.indexOf(ch), vowel = 'AEIOU'[vi >= 0 ? vi : (rnd() * 5) | 0];
      const dur = (0.07 + rnd() * 0.04) / v.speed, last = i === n - 1;
      const bend = last && /[.]$/.test(w) ? 0.88 : last && /[?]$/.test(w) ? 1.18 : last && /!$/.test(w) ? 1.10 : 1;
      const f = v.f0 * (0.92 + rnd() * 0.16) * bend;
      if (ctx) { consonant(ctx, out, t, 2000 + rnd() * 3000, 0.018); vowelTone(ctx, out, t + 0.012, dur, f, FORMANTS[vowel], v); }
      t += dur + 0.012;
    }
    t += 0.06 / v.speed;                                            // a gap between words
  }
  return t;
}
// FORMANTS = { A: [800, 1200], E: [400, 2000], I: [300, 2300], O: [450, 800], U: [325, 700] }
// vowelTone: saw osc at f (+ vibrato 6 Hz, 1.5 %) -> two bandpass filters (F1, F2; Q 6) summed -> gain env (8 ms attack,
// 30 ms release) [-> ring mod (osc * 60 Hz) for ORACLE; -> WaveShaper step curve for KAI-ZERO]; plus 15 % noise.
```

## Appendix C: planning-script results (`tools/trackcheck.mjs` must reproduce them)

Spline: App. A, k = 48–96, resampled at 2 m (0.5 m for the jumps). Air gravity 40 m/s². Flights start from the lip
with the lip's slope, 0.9 m above the surface.

| Track | Length | Tightest radius | Slopes (outside jumps) | Overpass | Jump |
| --- | --- | --- | --- | --- | --- |
| Port Solenne | 3.84 km | 56 m (s ≈ 3412, lighthouse) | −5 … +5 % | none | drop cp12→14: an 8.6 m step, 0.65 s air at all speeds; impact 45 m/s −30°, 90 m/s −16°, 170 m/s −6° |
| Karakum Spire | 4.59 km | 55 m (s ≈ 2408, the spiral) | −8 … +7 % | s 2208 under s 2928: 24.5 m | gap cp7→9, 57 m: 45 m/s hits the wall 20.6 m low, 60 m/s 6.6 m low, **75 m/s clears** (0 m past, −9°), 90 m/s +18 m (−13°), 115 +49 m, 140 +82 m, 170 +129 m (−10°) |
| Meridian Stack | 4.18 km | 52 m (s ≈ 4167, before the start straight) | −4 … +4 % | s 2082 under s 3983: 31.9 m | drop cp4→6: a 14.2 m step; 45 m/s lands at −37° (hard), 90 m/s −21°, 140 m/s −12°, 170 m/s −11° |
| Borealis Vault | 5.03 km | 44 m (s ≈ 3774, switchbacks) | −6 … +11 % | none | drop cp6→8: a 17.2 m step; 45 m/s −40° (hard), 90 m/s −23°, 115 m/s −15°, 170 m/s −12° (1.2 s air) |

Lap-time estimates are in §4.2. Hard landings (> 25°) cost energy and speed by design (§3.2 step 5). Slow craft
are punished, fast ones reward.

## Appendix D: AI Hub session skeleton (`90-hub.js`)

```js
SN.hub = { active: !!(window.AIHub && AIHub.active), info: null, ghosts: new Map(), lastSend: 0, ended: false, reported: false };
async function startSession() {                               // called from the boot's last step when SN.hub.active
  const info = await AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true });
  if (!info) { SN.hub.active = false; return game.go('title'); }
  SN.hub.info = info;
  const ev = SN.hub.event = { track: ['solenne', 'karakum', 'meridian', 'borealis'][Math.floor(AIHub.rng('event')() * 4)],
                              cls: 'FLARE', laps: 3, seed: Math.floor(AIHub.rng('race')() * 2 ** 32) };
  for (const p of info.players) if (p.id !== info.me) SN.hub.ghosts.set(p.id, { id: p.id, name: p.name, color: p.color, s: [] });
  AIHub.on('card', c => SN.hub.card = c);
  AIHub.on('start', () => SN.hub.started = true);
  AIHub.on('message', (d, from) => { const g = SN.hub.ghosts.get(from); if (g && d.t === 'g') g.s.push(Object.assign({ at: AIHub.time() }, d)); if (g && d.t === 'done') g.done = d.ms; });
  AIHub.on('leave', ({ id }) => SN.hub.ghosts.delete(id));
  AIHub.on('time-up', () => { if (!SN.hub.reported) { SN.hub.reported = true; AIHub.result({ score: Math.round(myShip().p / 16) }); } });
  AIHub.on('end', e => { SN.hub.ended = true; SN.hub.endInfo = e; SN.audio.stopAll(); });
  game.go('loading', { next: 'session', track: ev.track, then: () => AIHub.ready() });   // ready() once the world is warm
}
// in the session scene's update: card UI until started; countdown from AIHub.time(); race.step only when time() >= 0 and !ended;
// every 100 ms: AIHub.send({ t: 'g', p, u, h, y, r, v, lap, fin }, { reliable: false }); every 1000 ms: AIHub.progress({ score, label });
// on finish: AIHub.result({ time: Math.round(AIHub.time()), stats, awards }); AIHub.send({ t: 'done', ms }); SN.hub.reported = true
```

## Appendix E: World3D facts learned in planning (saves the builders an afternoon)

- The 3D add-on is an ES module that imports `three/webgpu`, `three/tsl` and `@dimforge/rapier3d-simd-compat` by bare
  specifier. It needs an import map. It attaches `E.World3D`, `E.THREE`, `E.TSL` and `E.RAPIER`, and throws if the 2D
  engine isn't loaded first.
- `await E.World3D.init(game)` creates one renderer for the page: WebGPU, else WebGL 2 (`?backend=webgl` forces it).
  It makes `#view` under `#screen` if missing. The game must use `bg: null`. It always initialises Rapier (so Rapier
  must be loadable even though craft don't use it). Headless it returns at once.
- `new E.World3D(game, { terrain | level, sky, fog, ambient, sun, lights, glowLights, shadows, filter, camera,
  onDraw, overlay })`.
  - `terrain` coordinates run from 0 to `size` (a power-of-two chunk count): keep tracks inside (hence `origin`).
  - `world.scene` takes your own three.js meshes. Use **node materials only**: MeshLambert / MeshToon / MeshBasic
    NodeMaterial. Never ShaderMaterial, WebGLRenderer or addons.
  - Make the materials at world creation. `world.prepare()` builds the shaders. `world.dispose()` before making the
    next world.
- The camera has modes `view`, `chase`, `first`, `fly`, `fixed`, `zones` and `behind`. We use `fixed` with
  `camera.fixed = { x, y, z, yaw, pitch, roll, fov }`. `camera.far` and `camera.near` are in units.
  `world.addCamera(o)` plus `game.splitScreen(2)` makes a split screen (filters are off while split).
  `world.project(x, y, z)` gives HUD pixels.
- `world.step(dt)` in update and `world.draw(r)` in draw, then the HUD with `r.overlay`.
- `game.particles.*` draw in 3D and land on `particles.ground`. World3D resets that every draw: see edit §2.7.5.
- Its settings keys: `look3d`, `picture3d` (`pixels` | `balanced` | `full`), `shadows3d`, `filter3d` (`clean` |
  `cel` | `pixel`). `filter.bloom` is a boolean in the world's `filter`.
- Its own racing (`world.track`, `world.vehicle`, a Rapier ball) is **not** used. The craft need track-space physics
  at Wipeout speeds (§3.2), and the tracks need tunnels, drops, gaps and overpasses that `world.track` doesn't model.
