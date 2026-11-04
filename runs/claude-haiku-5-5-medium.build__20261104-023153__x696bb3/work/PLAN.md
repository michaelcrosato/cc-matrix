# SKILLER7

*Seven Killers, One Mountain.*

**Title.** Picked the way TASK.md says: 50 playful riffs on "Killer7" were brainstormed silently, then one was drawn
with a real random number generator (Python `secrets.randbelow(50)`, OS entropy): index 13, **Skiller7**. It reads three
ways at once (SKI + KILLER + SKILL), and the whole design leans on that. In file and folder names, GameTitle is
`Skiller7` and SOURCE is `Killer7`.

**Pitch.** Piz Nada is a neutral micro-state on one mountain, and it has snowed there for a hundred years. On the top
floor of its sanatorium, in Room 7, a 104-year-old former ski champion called Oma Holle lies under a mountain of
featherbed. When she shakes it, seven killers step out of her wardrobe. The Canton's Department of Discretion sends
them "guests" to check out: agents of Mister Föhn, the warm wind that makes people laugh until they disappear. You move
on rails through a grand hotel, a ski village, a summit conference, a black ski run, a gondola and a glacier vault.
Then you stop, look through your persona's eyes, scan for the laughing, invisible Whiteouts, and shoot their Warm Spot
before they reach you.

---

## 0. How to use this plan

- **TASK.md + PLAN.md are the whole brief.** TASK.md decides deliverables and process. This plan decides design. Where
  this plan gives a number, use it as the default and expose the important ones as live dev sliders (§7.22).
- **Everything in the game is original.** We take Killer7's *structure* (rail movement, stop-and-aim first-person
  scanning, weak-point instant kills, one body with several killer personas, a save room, a blood economy, cryptic
  hint-givers, chapters called targets, bosses with odd rules) and its *tone*. We do not use its names, characters,
  art, music, levels or look.
- **Build in this order:** a playable greybox golden path first, then systems to full depth, then content, then polish
  (§12). The scope is sized to be built whole. TASK.md forbids TODOs, placeholders and stubs, so build every system and
  piece of content in this plan.
- **Mark every engine change** in the engine files with `// S7 PATCH:` and a reason, and keep a list for the
  hand-back's Engine Feedback (§16).

---

## 1. At a glance

| | |
|---|---|
| Title | **SKILLER7** (shown with that spelling; `Skiller7` in file names) |
| Tagline | Seven Killers, One Mountain |
| Source | Killer7 (Grasshopper Manufacture / Capcom, 2005) |
| Genre | On-rails action-adventure shooter: rail movement, first-person scan-and-shoot, persona-switch puzzles, boss fights. AI Hub catalogue genre: **Shooter** |
| Perspective | Third-person cinematic rail cameras (fixed, dolly, follow and crane shots that hard-cut) while moving; **first person** while aiming; a schematic top-down map in the pause menu |
| Players | 1 in the campaign. 1–4 in **Echo Run** (AI Hub ghost mode; solo, you race your own recorded echo) |
| Length | about 45–60 min: Target 00 "Turn-Down Service" (about 12 min), Target 01 "Après" (35–45 min), epilogue. Echo Run rounds take about 2 min |
| Engine | my-3D2dge **v0.85.2** handoff (the 2D engine runs the game) plus the engine's own **3D module v0.85.2** (three.js r182, Rapier 0.19.3 from a CDN) |
| Look | The engine's native style: PS1-resolution picture (`'pixels'`), characters as pixel-art rigs drawn on cards, the 3D module's **Comic cel** filter (flat bands of light, ink lines). Stark white snow, black shadows, saturated red |
| Animation | The engine's procedural rigs (`E.Humanoid`, `E.Blob`, `E.MOVES`, poses), extended with new hats, accessories, weapons, skis and poses; first-person weapon models with the overlay pen |
| Audio | All in code: engine chip-synth songs, engine SFX voices, our own WebAudio laughter synth and Animalese-style gibberish voices |
| Online | AI Hub Session Protocol v1, `ghost` mode (Echo Run). On its own, the game runs without the hub |
| Ship | `Skiller7-Killer7-claude-opus-5-5-max-20261103-174752.html` and `exit-interview.json` in this folder. Dev files go in `Skiller7-Killer7-claude-opus-5-5-max-20261103-174752/` |

---

## 2. Killer7 → Skiller7: what we keep, what is ours

| What makes Killer7 distinctive | Skiller7 (original) |
|---|---|
| Hold one button to run along fixed rails; junction icons; a quick 180° turn | Rails through hotel halls and village lanes; **downhill ski rails** with momentum and hockey stops; **lifts** (T-bar, gondola) you can shoot from; **ski jumps**; an **avalanche chase** |
| Stop, aim in first person, scan to reveal invisible laughing suicide bombers, weak spots that kill at once | **Whiteouts**: Föhn-touched people who laugh themselves invisible. You hear them, see their **footprints in the snow and their breath**, and a **Scan** pulse reveals them. Shoot the glowing **Warm Spot** and they thaw on the spot ("THAW.") |
| One body, seven personas, each with a gun and a field ability | **Oma Holle's Seven**: a ski patrolman, a downhill racer, a telemark aristocrat, a fur-coated tycoon, a yodeler, a press photographer and an avalanche engineer |
| A cleaner who retrieves fallen personas | **The Sweep** skis in from Room 7 and chips frozen personas out of the ice |
| A save room with a maid and a TV | **Room 7**: Sister Rosalind, the **Cuckoo Clock** (save), the **Wax Bench** (upgrades: you wax your skills), the **Wardrobe** of seven coats (persona select) |
| Thin blood heals, thick blood buys upgrades | **Red** (shared; heals and fuels skills) and **Rime** (upgrade crystals) |
| A cryptic ghost and a grotesque hint-giver | **Pim the Lift Boy** (the ghost of a 1926 lift attendant on a floating chairlift seat) and **Murmel** (a resort-mascot marmot bungeed to a ski rack: "Gratuity is customary.") |
| A handler on the phone, political allegory, an eternal game between two gods | **The Concierge** (hotel euphemisms for murder), the **Thaw Accord**, Oma Holle against **Mister Föhn** over a chessboard of ice |
| Cel shading, flat colour, heavy black shadows, huge type | Comic-cel filter and ink. White-on-white snow made readable by ink outlines. Red on snow. Huge title cards |
| Chapters called targets, each ending in a strange boss | **Target 00** (the Bellcaptain in an elevator shaft). **Target 01** (an oompah band you shoot on the beat; the Powder King: a laughing snowman colossus, a slalom duel, and an interview on a stuck chairlift) |

---

## 3. Deliverables, folders, ground rules

**At the end, this folder holds:** TASK.md, STAGE.md (if present), PLAN.md, the built game
`Skiller7-Killer7-claude-opus-5-5-max-20261103-174752.html`, `exit-interview.json` beside it, and the dev folder
`Skiller7-Killer7-claude-opus-5-5-max-20261103-174752/` with every source, tool and test. If your TASK.md gives the
names with a different model or date, use your TASK.md's names (GameTitle `Skiller7`, SOURCE `Killer7`).

**Shared machine rules (from TASK.md):**
- Read only the files you need. Other agents share this directory, the machine's ports and its processes.
- Prefer `file://` and the engine's headless tools. Only the AI Hub harness needs a server. Start it with
  `python3 -m http.server 0 --bind 127.0.0.1` (it prints the port), check that the served page really is your game
  (its `<title>` starts with "Skiller7"), and stop it by its own PID. Never pkill, killall, fuser -k, or kill whatever
  holds a port.
- `/tmp` on this machine is a small tmpfs and may be full. Keep large files (vendor copies, screenshots, logs) inside
  the dev folder, and run Node and Playwright with `TMPDIR` pointing at a `tmp/` folder inside it (Chromium's
  profiles go there). Playwright's Chromium 1243 is already installed in `~/.cache/ms-playwright`.
- Don't use subagents or workflows to debate, review, judge or audit.
- One test command prints only failures and a one-line count (§14). Rerun it only after changing code it covers. Use
  screenshots only for what a script can't check.

---

## 4. Tech stack and pinned sources

**Pinned commits** (the repositories move daily; pin them for reproducibility):
- my-3d2dge: `4390a9852fe0ad01e1699a160f2a331931bb1a72` (engine v0.85.2). Raw files come from
  `https://raw.githubusercontent.com/michaelcrosato/my-3d2dge/4390a9852fe0ad01e1699a160f2a331931bb1a72/<path>`
- ai-hub: `f8835e4824fbf9bbb4bac3a35e88e3ab197fdd1e` (session client 1.4.0). Raw files come from
  `https://raw.githubusercontent.com/michaelcrosato/ai-hub/f8835e4824fbf9bbb4bac3a35e88e3ab197fdd1e/<path>`

`tools/fetch-deps.mjs` downloads these once, idempotently:

| What | Repo path | Dev-folder path | Shipped? |
|---|---|---|---|
| **The whole handoff folder**, layout kept so its tools, kits and tests run unchanged: the 2D engine (full, readable, every module: story, rpg, songs, arcade…), `modules/`, `kits/`, `game/`, `tools/`, `docs/`, `src/assets/` (the store), `API.md`, `API-INDEX.md`, `AI_GUIDE.md`, `package.json` | `dist/handoff/` (a sparse checkout at the pinned commit, or the GitHub tree API plus raw downloads) | `engine/` | only `engine/my-3d2dge.js` is inlined |
| Asset store sets we use | `dist/handoff/src/assets/sets/{kenney-holiday,kenney-furniture,kaykit-furniture-bits,kenney-nature}.js` | `engine/src/assets/sets/` (part of the copy above) | inlined: only the entries we use, cut with `engine/tools/asset-set.mjs` |
| 3D module (ES module, header = its manual) | `dist/my-3d2dge-3d.js` | `engine/my-3d2dge-3d.js` | inlined as a module |
| 3D reference slices (read, don't ship) | `src/starter3d/00-shell.js`, `30-shooter.js`, `40-horror.js`, `60-flight.js` | `ref/` | no |
| three.js r182 (tests only) | `vendor/three-0.182.0/three.webgpu.min.js`, `three.core.min.js`, `three.tsl.min.js` | `vendor/three-0.182.0/` | no (CDN) |
| Rapier 0.19.3 (tests only) | `vendor/rapier3d-simd-compat-0.19.3/rapier.js` | `vendor/rapier3d-simd-compat-0.19.3/` | no (CDN) |
| AI Hub client | ai-hub `lib/hub/session.js` | `vendor/aihub/session.js` | inlined **unmodified**, first script in `<head>` |
| AI Hub harness (tests only) | ai-hub `lib/hub/harness.html`, `bridge.js`, `round.js` | `vendor/aihub/` | no |

**Runtime import map (shipped).** All four URLs were checked: HTTP 200, `Access-Control-Allow-Origin: *`.
```json
{ "imports": {
  "three":        "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.min.js",
  "three/webgpu": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.min.js",
  "three/tsl":    "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.tsl.min.js",
  "@dimforge/rapier3d-simd-compat": "https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-simd-compat@0.19.3/rapier.mjs" } }
```
`three.webgpu.min.js` imports `./three.core.min.js` beside it on the CDN. Rapier's compat build embeds its wasm, so
nothing else is fetched. Inline module scripts and import maps work from `file://`, so the single file plays when
double-clicked (online). The AI Hub localizes these engine URLs when it ingests a game (its shelf has three 0.180–0.186.1
and Rapier 0.19.3). Tests route the URLs to the `vendor/` copies, so they never depend on the network.

**Tooling:** Node 24 (on the machine), Python 3 (the harness server only), Playwright **1.63.0** (pinned as in the
handoff's package.json) with `npx playwright install chromium`. No other libraries, no bundler: the build script
concatenates (§5.8).

**Verified while planning** (a throwaway spike, not part of the build): one HTML file holding the 2D engine (classic
script), the 3D module (inline module) and this import map, opened from `file://` in headless Chromium 1243 through
Playwright 1.63.0, loaded three r182 and Rapier from jsdelivr and booted `E.World3D` with no page errors. Headless
Chromium has no WebGPU, so both `?backend=webgl` and the default ran on WebGL 2. A level with `ground: 'snow'`, a
Humanoid on a card with `pose: false` that our code `place()`d and `rig.update()`d every step, a `'fixed'` camera set in
`draw`, `world.glow` (it already reads as a Warm Spot), `world.project` and the `cel` filter all rendered as expected.
Two lessons: an actor's position reads back from Rapier in float32 (about 3e-6 off), so the sim keeps its own positions
and never reads actors; and `'fixed'` cameras don't cut walls, so every shot must sit in open space (§7.2).

**Why the 3D module.** Killer7 is cinematic third-person rails plus first-person aiming. The handoff's 2D views can't do
first person. The engine's own 3D module (the same engine and release, documented as its 3D side) gives exactly what
we need: `'fixed'` cameras we pose ourselves, a first-person overlay for the gun, `world.project` for the HUD, fog,
lights, shadows, terrain for ski runs, the 2D engine's rigs drawn as cards, and a built-in **Comic cel** filter. The 2D
engine still runs everything else: scenes, the fixed-step clock, input and rebinding, the pause menu and settings,
saves, the Story and Dialog modules, the music clock, the HUD font and widgets.

---

## 5. Architecture

### 5.1 The built page, in order

```html
<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<script>/*! aihub-session 1.4.0 … pasted unmodified … */</script>       <!-- first script, right after charset -->
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Skiller7 — Seven Killers, One Mountain</title>
<meta name="description" content="Seven killers share one body and one mountain. Ride the rails, stop, scan for the laughing invisible Whiteouts and shoot the warm spot.">
<meta name="theme-color" content="#d81e2a">
<link rel="icon" href="data:image/svg+xml,…a red 7 on white…">
<meta name="hub:source" content="Killer7">
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1–4">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="3">
<meta name="hub:session-goal" content="Fastest down the Black Run wins; crits cut time">
<meta name="hub:session-howto" content="Hold W/✕ ski · S/○ stop · RMB/L2 aim · LMB/R2 shoot · Space/L1 scan">
<script type="importmap">{ …§4… }</script>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden} #stage{position:relative;width:100%;height:100%}
#view{position:absolute;left:0;top:0;pointer-events:none;z-index:0} #screen{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;z-index:1;background:transparent}</style>
</head><body>
<!-- E.bootSplash('SKILLER7') markup: the splash shows while scripts load -->
<div id="stage"><canvas id="view"></canvas><canvas id="screen"></canvas></div>
<script>/* engine/my-3d2dge.js v0.85.2 (with S7 PATCHes) */</script>
<script>/* the Skiller7 bundle: src + content, classic script, defines globalThis.S7, starts nothing */</script>
<script type="module">/* engine/my-3d2dge-3d.js v0.85.2: imports three and Rapier through the import map */</script>
<script type="module">S7.start({ World3D: My3D2dge.World3D });</script>
<script>/* watchdog: if S7.started is still false after 20 s, show "The 3D libraries didn't load. Check the connection and reload." with a Reload button; in a session, call AIHub.fail(that message) */</script>
</body></html>
```
The build escapes every `</script` inside inlined code as `<\/script`.

### 5.2 Sim and presenter

```
            game.input ──► Intent layer ◄── Bot (attract, tests)
                               │ intents (move, turn, branch, aim yaw/pitch deltas, fire, scan, skill, interact…)
                               ▼
  ┌──────────────── SIM (deterministic, fixed step 1/120 s, runs in Node) ────────────────┐
  │ rails · walker · camera director · personas · weapons · skills · whiteouts · combat  │
  │ scan · bosses · economy · items · gates · story/beats · saves · results · echo run    │
  └──────────────────────────────┬──────────────────────────────┬────────────────────────┘
                     state (read only)                   events (S7.bus)
                                 ▼                              ▼
        Presenter3D (browser) / NullPresenter (Node)      Audio · UI widgets · HUD
        World3D worlds, actors, rigs, pen, glows,         (headless-safe; audio no-ops
        lights, FX, first-person overlay, camera          without an AudioContext)
```
- **The sim** owns all game state. It uses only the 2D engine (`E.Path`, `E.rng`, `E.Story`, `E.Dialog`, `E.Menu`,
  `game.input`, `game.audio.pos`, `game.saves`, `game.script`, `game.tween`) and our own math. It never touches three.js,
  the DOM or `E.World3D`, and it never reads anything back from the presenter.
- **The presenter** turns state into pictures. It has two hooks: `step(dt)` in the play scene's update after
  `sim.update` (mirror actors, `rig.update`, `world.step`) and `draw(r)` (pen, glows, lights, `world.draw(r)`, then the
  HUD). **NullPresenter** has the same interface and does nothing; Node tests use it.
- **Mouse picking goes through intents.** The UI projects world anchors with `world.project` and turns a hover or a
  click into an intent (`branch = 2`, `interact = 'murmel'`). The sim also keeps its own simple projection (from the
  camera director's pose) for stick-to-branch mapping, so headless play needs no presenter.
- Level geometry exists twice from one source: the presenter builds `World3D` from the area's rows or terrain
  function, and the sim builds a `LevelGrid` from the same data for line of sight and paths.

### 5.3 Source tree (dev folder)

```
Skiller7-Killer7-claude-opus-5-5-max-20261103-174752/
  package.json            { "type": "module", devDependencies: { playwright: "1.63.0" },
                            scripts: { build: "node tools/build.mjs", test: "node tests/run.mjs" } }
  engine/                 a copy of dist/handoff/ (my-3d2dge.js patched; kits/, tools/, src/assets/…) + my-3d2dge-3d.js (§4)
  vendor/                 three-0.182.0/, rapier3d-simd-compat-0.19.3/, aihub/               (§4)
  ref/                    3D starter slices, for reading
  src/
    00-core.js        S7 namespace, VERSION, S7.bus, registries (S7.area/persona/weapon/enemy/item/beat/song/voice),
                      named E.rng streams ('spawn','spread','laugh','fx'), units (M = 16 world units = 1 m)
    01-math.js        vectors, ray–sphere, ray–capsule, segment distance, angles, easing helpers
    02-tuning.js      TUNING table {key: {def, min, max, step, label, group}}, live values, reset, difficulty multipliers
    05-input.js       the S7 input preset, intent layer (human and bot), last-device tracking, idle timer,
                      touch-only detection, mouse modes (look / pointer), stick flick detection
    10-levelgrid.js   LevelGrid from level rows and legend (floor and wall heights, pits, stairs, platforms),
                      terrain sampler, line of sight (tile DDA with heights / terrain ray-march), BFS flow fields
    11-rails.js       RailGraph (nodes, edges as E.Path), Walker (walk, ski, lift, jump, stairs), junctions,
                      gate checks, spot proximity
    12-camera.js      CameraDirector: shots, cuts, blends, aim transition, overrides, shake; sim-side projection
    20-personas.js    roster state, HP, stats, availability, switching, frozen/fallen
    21-weapons.js     fire cycles, magazines, reloads, spread, recoil, hitscan/cone/lob kinds, effective range
    22-skills.js      flare, tuck, longlook, makeitrain + buyout, echo, flash, charge, rescue
    30-whiteouts.js   enemy types, behaviours, warm spots, tells (footprints, breath), laugh scheduling,
                      spawner, waves
    31-combat.js      damage pipeline; hits on enemies, props and targets; crits; explosions; projectiles
                      (snowballs, suitcases, medals, shells); drops and pickup magnet
    32-scan.js        scan pulse, reveal timers, laugh-direction cues
    33-bosses.js      boss controllers: grau, jollyfour, hansi (with phases)
    40-economy.js     Red, Rime, healing, Wax Bench costs and effects
    41-items.js       inventory, key items, collectibles, Dossier entries
    42-gates.js       gate kinds: rope, jump, farbell, buyout, echowall, crystal, exposure, codelock, cornice,
                      serac, icelock, edelweiss, key
    50-story.js       E.Story setup, people (speaker ↔ rig ↔ voice), flags, objectives, beats (game.script),
                      title cards, letterbox
    51-npcs.js        Murmel hints, Pim appearances, phones, frozen tableaux
    52-room7.js       entering and leaving, the clock, the Wax Bench, the Wardrobe, the bed, the telephone
    60-save.js        serialize/deserialize, game.saves wiring, autosave, versions and migrate
    61-results.js     per-target stats and ranks
    70-audio.js       buses, song table, SFX definitions, positional helper, music state (layers, cues), ambience
    71-voice.js       Animalese voice synth and its dialog hookup
    72-laugh.js       laughter synth (styles) and positional emitters
    80-ui-kit.js      canvas widget kit: focus lists, buttons, sliders, toggles, tabs, grids, glyph prompts;
                      pad, keys and mouse (hover focuses, click activates, drag moves sliders)
    81-hud.js         the in-play HUD
    82-screens.js     title, Featherbed ring, junction markers, Wax Bench, Wardrobe, map, Dossier and items,
                      code lock, target cards, results, game over, About/Credits, touch-only notice,
                      attract overlay
    83-shell.js       a themed E.Shell (pause, settings, controls, help, saves) and its pause items
    84-dev.js         dev mode panel and dev overlays
    85-bot.js         the bot: route runner, rail navigation, combat (used by attract mode and tests)
    86-attract.js     attract director: vignettes, cheats, any-input exit
    87-hub.js         AI Hub session flow, Echo Run networking, solo echo recording
    88-echorun.js     Echo Run rules: course, timing, penalties, results
    90-present3d.js   Presenter3D: a world per area, actor mirroring, rigs, accessories, pen drawing,
                      glows, lights, camera
    91-fx3d.js        snowfall, footprint and red-snow decals, breath, scan ring, splashes, flurry transition
    92-firstperson.js weapon models and their animations on the overlay pen
    93-present-null.js NullPresenter
    95-scenes.js      scenes: title, attract, play (Room 7 is a mode of play), results, credits, gameover,
                      echorun, hub
    99-start.js       S7.start(opts): new E.Game, boot steps, scenes, game.debug
  content/
    tuning.js personas.js weapons.js enemies.js items.js shapes.js things3d.js songs.js voices.js
    attract.js echorun.js
    areas/  room7.js 00A-lobby.js 00B-thirdfloor.js 01A-village.js 01B-palais.js 01C-blackrun.js
            01D-gondola.js 01E-archive.js 01F-summit.js
    story/  common.js t00.js t01.js epilogue.js barks.js
  tools/   build.mjs  validate-content.mjs  fetch-deps.mjs
  tests/   run.mjs  lib/node-harness.mjs  lib/browser-harness.mjs  node/*.test.mjs  browser/*.test.mjs
           routes/golden.js (the playthrough's route)  out/ (screenshots, logs, the hub copy; never shipped)
```
`content/things3d.js` only defines `S7.things3d = W3 => { W3.THINGS.chandelier = (pen, t, time) => …; … }`, and
Presenter3D calls it in its init, so nothing there runs in Node. Everything else in `content/` is plain data and runs
anywhere.

### 5.4 The play loop and the mode machine

The play scene (`pausable: true`, `touch: []`):
```
update(dt):  if (ui.modal) { ui.modal.update(dt); return; }   // dev panel, Wax Bench, map… freeze the sim
             intents = Intent.read(game.input | bot)            // one place turns devices into intents
             sim.update(dt, intents)                            // everything in §7, in a fixed order
             presenter.step(dt)                                 // mirror, rigs, world.step (browser only)
draw(r):     presenter.draw(r)                                  // world.draw, then the HUD and screens
```
`sim.update` order: modes → walker → camera director → skills → weapons and projectiles → whiteouts → scan and
reveals → combat resolution → pickups → economy → bosses → triggers and waves → story and beats → results clock →
emit events.

**Modes** (one at a time; `S7.sim.mode`):

| Mode | Enter | Exit | Notes |
|---|---|---|---|
| `rail` | default | — | move, turn, interact, heal, skill, ring, aim |
| `junction` | arrive at a node with 3+ edges | a branch is chosen and move is held | the walker is stopped; branch markers show |
| `aim` | aim held (or toggled) in rail/lift mode, or on a ski edge after a hockey stop | aim released | first person; the walker is stopped except on lifts and `aimOnTheMove` edges |
| `ski` | on a `ski` edge | leave the edge | automatic downhill movement; move = tuck, turn = hockey stop |
| `lift` | board a lift node | the end node | automatic movement; aiming allowed |
| `talk` | interact with an NPC, phone or tableau | the dialog ends | sim frozen except ambience |
| `ring` | hold ring | release (switch) | time × 0.15 |
| `switching` | a persona is chosen | 0.45 s later | invulnerable |
| `cutscene` | a beat script takes the camera | the script ends | skippable with start/pause → "Skip scene?" |
| `frozen` | the active persona's HP reaches 0 | 1.2 s later → `rescue` | the freeze animation |
| `rescue` | after `frozen` | the statue is chipped free | you play the Sweep |
| `gameover` | the Sweep's HP reaches 0 | Continue or Quit | |
| `modal` | a canvas screen opens | it closes | the sim is frozen |

### 5.5 Data formats (the designer's tools)

All content is data in `content/`, checked by `tools/validate-content.mjs` (§14.7). **Units in area data:** x and y
in **tiles** (1 tile = 1 m = 16 world units; row 0 is north, column 0 is west), z in **metres**. The loader multiplies
by 16. Use `.5` for tile centres.

```js
S7.area('00A', {
  title: 'GRAND HOTEL NADA', sub: 'LOBBY', target: 0, music: 'hotel', ambience: 'roomtone',
  world: {                                   // given to new E.World3D(game, …) and parsed by the sim's LevelGrid
    level: { rows: [/* 28 strings of 40 chars */], legend: { /* World3D legend: floor, wall, pillar, stairs,
             platform, pit, torch, mark, shape */ }, ground: 'tiles', colors: { a: '#e8e4dc', b: '#2a2226', size: 2 },
             side: 'block', color: '#3a2a2e' },
    // or terrain: { size, height: (x, y) => z /* world units, pure and shared with the sim */, color, rock, far }
    sky: '#05040a', fog: { color: '#0a0608', near: 40, far: 420 }, ambient: ['#3a2a3a', '#120a0e', 1.2],
    torchLights: 4, torchShadows: 1, lights: 6, glowLights: 6, overlay: { fov: 62 }, look: 'card',
    filter: { bands: 3, ink: 1, inkW: 1.5, punch: 1.4 },  // no `look` and no `res` here: options given to a new world
    camera: { mode: 'fixed', near: 1 }                    // override the player's 3D settings, so they come from §7.21
  },
  nodes: {                                   // t: [x, y, z?]; z defaults to the floor or terrain height there
    r7: { t: [33.5, 20.5], kind: 'room7' },  j1: { t: [28.5, 20.5], kind: 'junction' },
    x1: { t: [20.5, 2.5, 6], kind: 'exit', label: 'STAIRS', to: ['00B', 'x1'], needs: { item: 'servicekey' } }
  },
  edges: [
    { id: 'r7-j1', a: 'r7', b: 'j1', kind: 'walk',  // walk | ski | lift | jump | stairs; via: [[x, y, z?], …] bends
      via: [[31, 20.8]], cams: [{ s: [0, 1], shot: 'fixed', at: [36, 24, 3.2], look: 'hero', fov: 50 }] },
    { id: 'j3-g1', a: 'j3', b: 'g1', kind: 'walk', gate: 'rope', cams: [ … ] }
  ],
  gates:    { rope: { kind: 'buyout', price: 20, who: 'rurik', label: 'MEMBERS ONLY' } },
  spots:    [ { id: 'murmel', node: 's1', kind: 'npc', who: 'murmel', talk: 'murmel_00A' },
              { id: 'pin1', edge: 'j2-j4', s: .7, kind: 'pickup', item: 'pin1' },
              { id: 'phone_bar', node: 'b1', kind: 'phone', talk: 'concierge_bar' } ],
  spawns:   { e1: [12, 6], e2: [14, 6] },        // tile coordinates of spawn points
  waves:    { lobby1: { spawn: [['giggler', 'e1', 0], ['giggler', 'e2', 1.5]], until: 'clear' } },
  triggers: [ { id: 'tut_aim', edge: 'j1-j2', s: .6, once: true, beat: 't00_first_whiteout' },
              { id: 'w_elev', node: 'j4', once: true, wave: 'lobby1' } ],
  props:    [ ['shape', 'reception-desk', 31, 18, 0, { facing: Math.PI }], ['thing', 'chandelier', 20, 14, 5.6],
              ['light', 20, 14, 5.2, { color: '#ffd8a0', reach: 18, power: 1.2, flicker: .05 }] ],
  blocks:   [ [x0, y0, z0, x1, y1, z1] ]          // extra line-of-sight blockers (in tiles/metres): desks, cabins
});
```
- **Camera shots** (per edge, in `cams`; `rcams` when walking b→a, else the same list). Every shot has `s: [s0, s1]`, its
  share of the edge's length; shots must cover [0, 1].
  - `fixed`: `at`, `look` ('hero' | [x, y, z]), `lookUp` (metres above the feet, default 1.1), `fov`.
  - `dolly`: `path` (its own points), the camera slides along it as the hero moves through s0..s1; `look`, `fov`.
  - `follow`: `back`, `side`, `up`, `ahead` (metres), `fov`, `lag` (s). The validator's default for an uncovered
    range is `follow { back: 3.6, side: 1.1, up: 1.9, ahead: 2.5, fov: 55, lag: .12 }`.
  - `crane`: `at`, `zFrom`, `zTo` (metres over s0..s1), `look`, `fov`.
  - `pov`: forced first person (a dramatic corridor).
  - `blend`: seconds of ease between this shot and the last; the default is 0, a hard cut (the Killer7 way).
- **Beats** (`S7.beat(id, function* (G) { … })`) are `game.script` generators: dialogs (`yield G.say(node)`),
  camera overrides (`yield G.cam(shot, seconds)`), waits, spawns, flags, cards (`yield G.card('TARGET 00', …)`). The
  story's nodes and every line of text live in `content/story/*.js` as `E.Story` nodes.
- **Personas, weapons, enemies, items, tuning, songs, voices** are registries with plain objects (§7, §10, §11).
  Adding a persona, an enemy or an area never changes code in `src/`.

### 5.6 Events (`S7.bus.on(type, fn)` / `emit`)

`shot {persona, weapon, from, dir, hit}` · `hit {target, part: 'body'|'warm'|'shield'|'prop', dmg}` · `crit {enemy}` ·
`kill {enemy, type, crit}` · `explode {at, radius, dmg, source}` · `reveal {enemy, by}` · `scan {at, radius}` ·
`laugh {enemy, style, at, loud}` · `pickup {kind, amount, at}` · `heal {amount}` · `hurt {persona, dmg, from}` ·
`freeze {persona, at}` · `rescue {persona}` · `switch {from, to}` · `junction {node, options}` · `gate {gate, ok,
reason}` · `skill {persona, skill}` · `area {from, to}` · `room7 {in}` · `save {slot}` · `beat {id}` ·
`boss {id, phase}` · `music {cue}` · `tutorial {id}` · `result {target, stats, rank}` · `echo {kind}`.
Audio, VFX, HUD splashes, rumble and tutorials only listen. They never change sim state.

### 5.7 The test and tool handle: `game.debug`

```
snapshot() → { scene, mode, area, node, edge, s, dir, speed, persona, hp, red, rime, items, pins, edelweiss,
               flags (story vars), objective, enemies: { alive, revealed }, boss: { id, phase, hp }, aim: { yaw, pitch },
               target, results, time, hash }
teleport(area, node) · setPersona(id) · give(item, n) · addRed(n) · addRime(n) · tune(key, v) · cheat(name, on)
killAll() · revealAll() · freeze(personaId) · wave(id) · beat(id) · boss(id, phase) · skipCutscene() · hash()
bot: { run(route), stop(), status() }
```
`hash()` is a stable hash of the sim state (walker, roster, enemies, economy, flags, rng positions). `game.stateHash`
returns it too, so the engine's recorded sessions (`?record=1`, `engine/tools/replay.mjs`) stop at the first frame
where the game diverges.

### 5.8 Build (`node tools/build.mjs`)

1. Read `engine/my-3d2dge.js`, `engine/my-3d2dge-3d.js`, `vendor/aihub/session.js` and the asset-store sets we use (cut
   down to the entries we use).
2. Concatenate the bundle in this order: `src/0*`–`src/8*`, `content/**` (sorted), `src/9*`. Wrap it in
   `(() => { 'use strict'; … })();`, with the namespace at `globalThis.S7`.
3. Fill the page template (§5.1). The template fills `<title>`, the version line, the build date and the engine
   versions. The boot splash markup comes from the engine itself: load `engine/my-3d2dge.js` in a vm and call
   `E.bootSplash('SKILLER7')`.
4. Write `../Skiller7-Killer7-claude-opus-5-5-max-20261103-174752.html` (the root) and `out/bundle.js` (for the Node
   tests).
5. Fail the build if the bundle contains `TODO`, `FIXME`, `TBD`, `XXX`, `lorem` or `placeholder` (case-insensitive,
   outside the engine), or if `tools/validate-content.mjs` reports an error.

### 5.9 Planned engine changes (`// S7 PATCH:` each)

1. **Humanoid hats** (`_hat` in `engine/my-3d2dge.js`, around line 4628, next to `'cap'`, `'helmet'`, `'band'`): add
   `'beanie'` (a disc and a pompom ball: `h.pom`), `'ushanka'` (a fur disc and ear flaps), `'felt'` (a Tyrolean hat:
   brim, crown, feather `h.feather`), `'beret'` (a flattened disc tilted to one side), `'hardhat'` (a helmet with a brim
   and a headlamp glow), `'racehelmet'` (a full helmet with a visor in `h.visor`), `'pillbox'` (a bellhop cap).
2. **Humanoid accessories** (a new `acc` option drawn in the head block after the eyes, and on the torso): `goggles`
   (a band and two lenses), `visor`, `moustache`, `beard`, `scarf` (a neck ring and two tails that trail with motion),
   `shades`, `cigar` (with an ember glow), `badge`, `bandolier`, `pack`.
3. **Humanoid weapons** (in the `o.weapon` branch, beside `'gun'`): `'revolver'`, `'poles'` (two ski poles, one in
   each hand, barrels at the tips), `'rifle'` (long, with a scope), `'shotgun'`, `'alphorn'` (a long wooden horn: on the
   back in rail mode, held forward with `point: true`), `'camera'` (a box with a flash), `'launcher'` (a tube with a gas
   bottle), `'pistol'` (small).
4. **Skis** (a new option `skis: { color }`): two long lines under the feet along the facing, tips curled, drawn only
   while `rig.state.skis` is true.
5. **Default button symbols: PlayStation.** In `STANDARD_SETTINGS.glyphs` (around line 2999), set the default `value`
   to `'playstation'`. The option list stays (Xbox, PlayStation, Nintendo, Positions).
6. **AI Hub rule:** ignore `pause` from Pad9 (Options) while Pad8 (Create) is held, only when `AIHub.active`.

Every rig change must draw on cards (the 3D world) and in `rig.drawPortrait` (dialogs) alike. Check each one with
`engine/tools/filmstrip.mjs` on a small test page. Then run `node engine/kits/test.mjs` (the kit pages load
`../my-3d2dge.js`, which is our patched engine) and `node engine/game/test.mjs` to prove the 2D kits and the template
still pass. The 3D module stays unpatched unless a blocker shows up; record any change there too.

---

## 6. Controls and 10-foot UX

### 6.1 The action map

The engine's custom input preset (codes: `KeyW`, `Mouse0` left, `Mouse1` middle, `Mouse2` right, `Pad0`…`Pad15` in
the standard mapping). Every action can be rebound on the standard Controls screen.

| Action (id) | DualSense (Xbox glyphs) | Keyboard and mouse | Mode |
|---|---|---|---|
| Move (`move`, hold) | ✕ (A) or left stick up | W / ↑ | rail, junction (go), ski (tuck) |
| Quick turn / hockey stop (`turn`) | ○ (B) or a flick down on the left stick | S / ↓ | rail / ski |
| Pick a branch (`left`/`right`) | left stick or d-pad ← → | A D / ← → / hover a marker (a click goes) | junction |
| Interact / check (`interact`) | △ (Y) | E or F / click the object | rail |
| Heal (`heal`, hold) | □ (X) | H | rail |
| Featherbed ring (`ring`, hold; tap = last persona) | L1 (LB) | Tab (hold; aim at a portrait with the mouse) · 1–7 pick directly | rail |
| Skill (`skill`) | R1 (RB) | Q | rail, aim |
| Aim (`aim`, hold or toggle) | L2 (LT) | right mouse | rail, ski (after stopping), lift |
| Fire (`fire`) | R2 (RT) | left mouse | aim |
| Look / aim | right stick (left stick at 60%) | mouse (look or pointer mode, §7.3) | aim |
| Scan (`scan`) | L1 (LB) | Space or middle mouse | aim (the ring is off while aiming) |
| Reload (`reload`) | □ (X) | R | aim |
| Map (`map`) | Create (View) | M | rail |
| Pause | Options (Menu) | Esc / P | any |
| Menus | d-pad or sticks, ✕ confirm, ○ back | arrows / WASD, Enter or Space, Esc or Backspace; hover focuses, click picks | menus |

- Contextual pairs share a button: L1 is the ring in rail mode and Scan in aim mode; □ is Heal in rail mode and
  Reload in aim mode. These modes never overlap, and the Controls screen lists each action separately.
- **Aim: hold** (default) or **toggle** (setting). Leaving aim mode returns to the rail shot with no input lost.
- **Ski edges:** move = tuck, release = carve (slower), turn = hockey stop (stops on the slope; then aim works). Move
  pushes off again.

### 6.2 Prompts and glyphs

- Every prompt calls `game.input.label(action)`. It follows the last device used (`input.lastDevice`): ✕ ○ □ △ L1 R1
  L2 R2 on a controller (A B X Y LB RB LT RT with the Xbox setting), key names and "Left click", "Right click" on
  keyboard and mouse. With the patch in §5.9, the default is PlayStation, and Settings → Controller → Button symbols
  offers Xbox. Our Settings screen also shows a shortcut toggle, "Controller buttons: PlayStation / Xbox", in group
  Game; it writes the same `glyphs` setting.
- A prompt is a glyph chip (the label in a rounded box drawn with `E.ui.box`) plus a verb in capitals: `△ CHECK  Murmel`.
  Prompts change the moment the device changes.

### 6.3 The mouse in the world and in menus

- **Rail mode:** hovering a junction marker highlights that branch and a click takes it. Hovering an interactable's
  marker (a diamond over it) focuses it; a click interacts. Hovering a Featherbed portrait focuses it; a click picks it.
  The UI turns each into an intent (§5.2).
- **Aim mode:** see §7.3 (look mode with a captured pointer, or pointer mode like a light gun).
- **Menus:** hover moves the focus, a click activates, a drag moves a slider, the wheel scrolls lists and changes
  focused values. The engine's E.Shell screens already work this way; our canvas widget kit (`80-ui-kit.js`) copies
  the behaviour exactly.

### 6.4 Layout rules (a TV at 10 feet)

- `res: 'ps1'`, `expand: true`: at least 320×240 game pixels, growing on the long side (about 427×240 on 16:9). Anchor
  every HUD piece to `r.W` and `r.H`. Keep a **5% safe margin** on every edge (TV overscan).
- Minimum text: the 5×7 font at scale 1 (on a 1080p TV that is about 31 px tall). Important text (prompts, splashes,
  names) uses scale 2; title cards use `E.font.title` at scale 3–5.
- **No dense screens:** at most 7 focusable items on a screen, at most about 40 words of body text at once, one idea per
  screen. Lists longer than 7 page with L1/R1 (Q/E, or the wheel).
- Focus is always obvious: a red bar, the item scaled ×1.1, and a tick sound. Confirm and back are the same everywhere
  (✕ and ○; Enter and Esc).
- Never rely on colour alone. Warm spots are a diamond ring as well as orange. Gates show a persona's face. Damage
  directions are shapes.

### 6.5 Touch-only devices

- **Touch-only** means `matchMedia('(pointer: coarse)')` and no `(any-pointer: fine)` and `navigator.maxTouchPoints >
  0`, and no gamepad connected, and no key pressed yet.
- Then the title shows, centred: **CONTROLLER OR KEYBOARD REQUIRED**, a line "Connect a controller or a keyboard to
  play", and a big **SETTINGS** button (a tap calls `game.menu('settings')`). The corner's menu and full-screen buttons
  stay. There are **no touch controls**: every scene has `touch: []` and `game.input.touchEnabled = false`.
- The idle timer still runs: after 10 s the **attract mode** plays (§7.23). A tap stops it and returns to the notice.
- If a gamepad connects or a key is pressed, the notice is replaced by the normal title at once.
- In an AI Hub session on a touch-only device, call `AIHub.fail('Controller or keyboard required')`.

---

## 7. Systems

Each system lists its rules, its numbers (**Piste** difficulty unless stated) and its tests. Speeds are world units
per second (16 = 1 m).

### 7.1 Rails and movement (`11-rails.js`)

**Graph.** Nodes `{ id, at, kind: junction | room7 | exit | door | stop | lift | npc }` and edges
`{ id, a, b, kind, path (E.Path, catmull), oneWay, gate, cams, tags }`. A walk edge is two-way. Ski, lift and jump
edges are one-way, a → b. Points without z take the floor height (LevelGrid) or the terrain height there.

**Walker state:** `{ edge, s (distance from a), dir (±1), v, mode }`. Each step: `s += dir·v·dt`; the position is
`path.at(s)`. Facing is the path's tangent times dir.

| Rule | Value |
|---|---|
| Walk speed | 85 × persona factor × (1 + 0.08 × Speed level). Factors: Dagny 1.15, Rurik 0.9, Ignaz 0.9, the rest 1.0 |
| Accelerate / stop | to full speed in 0.18 s; to a stop in 0.12 s |
| Quick turn | `dir *= -1` over 0.22 s (the facing turns through 180°); only on two-way edges |
| Pass-through | a node with 2 edges is passed without stopping |
| Junction | a node with 3+ edges: decelerate over the last 1.2 m and stop exactly on it, mode `junction` |
| Dead end | a node with 1 edge: stop |
| Doors and exits | stop with a prompt "△ ENTER"; stair exits (`open: true`) trigger on arrival |
| Stairs | walk edges with slope: speed × 0.85 |
| Ski (downhill) | `v += (g·slope − k·v² − μ)·dt`, with g = 520, slope = −dz/ds along the path, k = 0.0011 (tuck 0.0006, carve 0.0019), μ = 6. Top speed 190 (Dagny tucking: 260). A hockey stop decelerates at 600 and holds you at 0 until move |
| Ski forks | markers appear 2.5 s before the fork; you pick while moving (stick, d-pad, A/D, a click); the default is the branch closest to straight ahead |
| Lift | board with △ at a lift node: a fixed speed (T-bar 120, gondola 140); aim and switch are allowed; you can't get off mid-way |
| Jump | only Dagny, and she must be tucking (skill held) or arrive at speed ≥ 150. A ballistic arc over the edge (apex 2.5 m), landing on b. Anyone else stops at the lip: "TOO FAR TO JUMP." |

**Junction choice.** Each branch's first 1.5 m tangent is projected through the director's camera pose to a screen
angle. The stick picks the branch nearest its angle. D-pad, arrows and A/D cycle. The mouse hover sets it (§6.3). The
highlighted branch starts as the one nearest straight ahead. Holding move (or a click on a marker) takes it. A gated
branch shows the gate's icon and the solver's face. Trying it with the wrong persona plays the gate's line and stays
(§7.13).

**Tests:** the graph builds from every area and every edge's path length is > 0; walking holds speed and stops on
release; quick turn flips dir and only on two-way edges; arrival at a junction stops within 0.1 m; the stick picks
the right branch for each of 8 directions under a known camera pose; a ski edge accelerates on a slope and the hockey
stop brings v to 0; a jump edge refuses everyone but Dagny and lands her on b; lifts carry you end to end in
length / speed seconds.

### 7.2 Camera director (`12-camera.js`)

- Picks the shot that covers the walker's `s` on its edge (`cams`, or `rcams` when dir = −1) and computes the pose
  `{ x, y, z, yaw, pitch, roll, fov }` (yaw from +x toward +y, pitch negative looking down, as `world.camera.fixed`
  takes it).
- Cuts are hard unless a shot asks for `blend`. A cut also happens on area changes, quick turns (when the shot sets
  `rev: true`) and beat overrides.
- **Aim transition:** blend from the current shot to the eye (feet + 1.6 m) over 0.15 s. Leaving takes 0.15 s back.
- **Follow** shots never sink under the floor or terrain: they are clamped to ground + 1.2 m.
- **`'fixed'` cameras don't cut walls** (the 3D module cuts walls only in its `'view'` mode). Every shot must stand in
  open space with a clear line to the hero. Follow shots pull in along the LevelGrid's line of sight when a wall gets
  between them and the hero, and the validator samples each authored shot at 5 points of its range and fails if a wall
  blocks the hero (§14.7).
- **Overrides:** a beat pushes a shot for its length (`G.cam(…)`); boss intros use `orbit`
  (`center, radius, height, speed`).
- **Shake** comes from the engine (`game.shake`, which respects the comfort settings).
- The presenter applies the pose each frame to `world.camera.fixed` (mode `'fixed'`), placed part way between the last
  two steps by `game.alpha`.
- The sim keeps `project(x, y, z)` (yaw, pitch, fov, aspect) for junction mapping and bot aiming.

**Tests:** for every edge in every area, shots cover [0, 1] (the validator); a fixed shot looks at the hero (the
hero's projected point is within 10% of the screen centre, vertically 30–70%); the follow clamp holds on a terrain
edge; the aim transition reaches the eye in 0.15 s ± 1 step.

### 7.3 Aim mode (first person)

- Entering stops the walker (except on lifts and `aimOnTheMove` edges), hides the hero's actor, turns on
  `world.overlay` with the persona's weapon model (§9), and shows the reticle and ammo. Yaw is free (360°); pitch is
  clamped to ±70°. You start looking along the rail's facing.
- **Controller:** max yaw rate 160°/s, pitch 110°/s, response curve `|x|^1.8`, the engine's radial dead zone (.18).
  After 0.35 s past 90% deflection, the rate ramps up 60% over 0.3 s. Invert Y comes from the engine setting
  (`invertAimY`).
- **Aim assist** (controller only; setting Off / Low / High; default Low, High on Bunny Hill): within 3.5° of a
  revealed warm spot or a gate target, turning slows to 55% (Low) or 40% (High); within 5°, magnetism pulls 12%/s
  (Low) or 25%/s (High) toward it.
- **Mouse, look mode** (default): `world.camera.capture = true`, and each step `world.camera.takeMouse()` gives the
  deltas, at 0.12°/px (the sensitivity slider runs 0.03–0.4). The reticle sits at the centre. If pointer lock fails
  (an iframe without permission, `pointerlockerror`), switch to pointer mode and toast "Mouse: pointer mode".
- **Mouse, pointer mode** (setting; like a light gun): `world.camera.mouseLook = false`. The reticle follows
  `input.pointer()`. In the outer 10% of the screen the view pans, up to 120°/s at the edge. The ray goes through the
  reticle's screen point.
- **Sway:** a Lissajous wobble of amplitude 0.7° × (1 − 0.15 × Steady), at least 0.1°, at 0.6 / 0.9 Hz. Telemark's
  scope halves it.
- **Recoil** kicks pitch up by the weapon's `recoil` and recovers at 10°/s.
- **The bot** drives aim with the same intents (yaw and pitch rates), limited to human rates with a 0.25 s reaction
  time (§14.3).

**Tests:** entering and leaving aim holds the walker still; rates and clamps hold; with assist High a still target is
acquired faster than with Off (bot timing); pointer mode maps a screen point to the right world ray (sim projection).

### 7.4 Weapons and shooting (`21-weapons.js`, `31-combat.js`)

Infinite reserve ammunition: every weapon has a magazine and a reload (Killer7's rule). Reloading starts by itself
when you fire an empty gun. **Hitscan:** a ray from the eye along the reticle's direction, plus seeded spread (the
'spread' rng). It is tested against, nearest first: enemy warm spots (spheres), enemy bodies (capsules), shields,
shootable props and gate targets (spheres or boxes), projectiles (snowballs, suitcases, medals), and the LevelGrid's
line of sight (walls, floors, terrain, `blocks`). **Effective range:** beyond `range`, damage falls to 25%. **Far
targets** (bells, insulators: gate targets marked `far`) register only a **scoped Gamsbock shot** (Long Look on);
any other hit on one splashes "TOO FAR." at the hit point, so they stay Ignaz's puzzle whatever the other guns' range.

| Persona | Weapon (`view` model) | Kind | Damage | Interval | Mag | Reload | Spread | Range | Special |
|---|---|---|---|---|---|---|---|---|---|
| Ansel | **Patrol .38** revolver | hitscan | 24 | 0.40 s | 6 | 1.8 s | 0.4° | 60 m | sets the target burning: 5/s for 3 s |
| Dagny | **Pole Guns** (two ski poles with barrels; fire alternates) | hitscan, auto | 6 | 0.07 s | 50 | 1.5 s | 2.0° | 35 m | hold to fire |
| Ignaz | **Gamsbock** hunting rifle | hitscan | 90 | 1.20 s | 5 | 2.4 s | 0° | 120 m (250 scoped) | pierces 1 |
| Rurik | **Bullion** gold pump shotgun | 10 pellets | 9 each | 0.95 s | 6 | 0.45 s a shell | 8° cone | 25 m | knockback; spins a Plow |
| Kasimir | **Alphorn** (a sonic blast) | cone 25°, 18 m | 40 to all | 1.00 s | heat: 5 blasts | overheats 2.5 s | — | 18 m | strong knockback; spins a Plow; shatters snowballs |
| Mireille | **Lady .25** pocket pistol | hitscan | 15 | 0.20 s | 9 | 1.1 s | 0.3° | 70 m | warm spot radius +25% |
| Brigid | **Avalauncher** (a pneumatic shell launcher) | lob: 300 u/s, gravity 300 | 70 splash, 2.5 m | 1.10 s | 4 | 2.8 s | — | 90 m | explodes on contact or after 2 s; staggers a Plow |

**Recoil (°):** .38 1.2 · Pole Guns 0.3 · Gamsbock 3 · Bullion 4 · Alphorn 2 · Lady .25 0.6 · Avalauncher 3.5.
**Power** scales damage by +12% a level. **Speed** cuts reload time by 8% a level.

**Tests:** each weapon's fire interval, magazine and reload times match the table to ±1 step; hitscan picks the
nearest of overlapping volumes; a warm-spot hit is a crit (§7.7); a wall between the eye and the target blocks it; past
range, damage is 25%; a far target ignores every hit except a scoped Gamsbock shot; the shotgun fires 10 pellets inside its cone; the Alphorn hits
everything in its cone; Avalauncher shells follow the arc and splash.

### 7.5 Scan, invisibility, tells and laughter (`32-scan.js`, `72-laugh.js`)

- Whiteouts are **invisible** until revealed (sim: `enemy.revealed = false`; the presenter keeps its actor at
  `visible = false`). They are still in the world: shots hit them, and a hit reveals one for 3 s.
- **Tells while invisible:** fresh **footprints** (outdoors in snow they last 8 s; indoors wet prints last 2.5 s), a
  **breath puff** from head height every 1.2 s, and **laughter**. Laughs are positional, louder and quicker as they
  near. In the HUD, a **laugh ripple** (a red arc at the screen's edge pointing at the source, its thickness the
  loudness) shows the 4 loudest; it can be turned off in Settings.
- **Scan** (aim mode): a ring expands from you to 40 m in 0.6 s. Every Whiteout it touches is revealed for 6 s
  (+0.4 s a Steady level). Cooldown 1.2 s. When revealed and within 30 m, the warm spot shows: an orange-red glow
  (`world.glow`) plus a pulsing diamond ring in the HUD.
- Revealing fades the figure in over 0.25 s with a static flicker. Unrevealing fades it out over 0.4 s.
- Skills that reveal too: Ansel's Flare (all within 30 m for 8 s), Kasimir's Echo (marks through walls for 5 s), and
  Mireille's Flash (reveals what is in its cone).

**Tests:** an unrevealed enemy has `revealed = false` and still takes hits; a scan reveals exactly the enemies within
the ring's radius at the time it passes them; the reveal runs out after 6 s + Steady; footprints are emitted along the
path at stride length; the laugh rate rises as distance falls.

### 7.6 Whiteouts: behaviour, spawns, waves (`30-whiteouts.js`)

| Type | HP | Speed | Contact | Red (body / crit) | Rime (crit) | Behaviour |
|---|---|---|---|---|---|---|
| **Giggler** | 30 | 32–42 | 20 | 8 / 14 | 1 | Walks at you swaying and laughing. Its warm spot is one of head, chest, belly, knee or hand (seeded). Explodes on contact (a 1.5 m radius) |
| **Bellboy** | 18 | 85–100 | 14 | 6 / 12 | 1 | Indoors. Runs and zigzags (±1.5 m at 0.8 Hz). Warm spot in the head |
| **Tobogganer** | 26 | 130–170 downhill | 26 | 10 / 18 | 1 | Outdoors. Rides a sled straight down the fall line at you; the warm spot is in its chest |
| **Snowballer** | 25 | stands | — | 8 / 14 | 1 | Throws a snowball every 2.6 s from 25–60 m (220 u/s; 8 damage; a snowball has 1 HP and can be shot). Indoors it throws ice cubes |
| **Twins** | 40 | 30 | 20 | 12 / 20 | 2 | A body hit (not the warm spot) splits it into two small Gigglers (12 HP, size ×0.7), once. Its warm spot orbits its body slowly |
| **Plow** | 90 | 26 | 30 | 20 / 30 | 2 | Carries an ice-slab shield in front (frontal hits are blocked: "TINK"). Every 3.5 s it stops to laugh and turns its back for 1.2 s; the warm spot is on its back. Knockback or a splash spins it round |
| **Inspector** | 50 | 60 | — | 15 / 25 | 2 | Carries an Edelweiss pass. Never attacks. Blinks between 3 marks every 2.5 s; after 25 s it vanishes and comes back on the next visit |
| **Bloom** | 3 warm spots (or 300 body) | 18 | 45 | 40 / 60 | 4 | Big (×1.8). A Giggler buds off it every 4 s. Each warm spot shot shrinks it; the third kills it |

- **Movement:** levels use a BFS flow field over the LevelGrid toward the player's tile, rebuilt when the player
  changes tile. Terrain moves in a straight line, steering round `blocks`. Whiteouts keep 1 m apart (a spatial hash).
- **Contact:** within 1.5 m of the player they start a 0.35 s "giggle-up" (they swell and shake; you can still kill
  them), then explode: damage, a red burst, knockback. They never explode while you are switching or in Room 7.
- **Waves** come from triggers (`{ spawn: [[type, spawnId, delay]], until: 'clear' | seconds }`). A wave holds up to
  10 alive at once; the rest queue. While enemies are alive, Room 7 doors stay shut ("The door won't open while
  someone is laughing.").
- Difficulty scales speed and damage (§7.25). The `TUNING` sliders `enemySpeed` and `enemyHP` multiply on top.

**Tests:** each type's numbers; Twins split once; a Plow blocks frontal shots and turns; an Inspector blinks and drops
its pass; a Bloom shrinks per spot and buds Gigglers; contact explodes after 0.35 s and damages; flow fields route
round walls (a test map); a wave caps at 10 alive.

### 7.7 Damage, criticals, drops

- **Crit:** a hit on a warm spot kills a regular Whiteout at once and deals ×3 to bosses. Warm spot radius: 5 units
  (31 cm) × (1 + 0.1 × Critical level) (×1.25 for Mireille). On a crit: `game.freeze(.06)`, the splash "THAW." (a big
  white word, ink-outlined, red underline), a glassy crack plus a choir chord, a red burst. Rumble 0.4 for 0.12 s.
- **Body kills:** the figure melts into red slush (sinking over 0.6 s), with a small red burst.
- **Drops:** Red and Rime come out as glints and fly to you within 4 m (or when you leave aim mode). Kills inside
  10 m are collected at once.
- **Player damage:** a short red vignette, `game.flash('#ff2030', .08)`, rumble, and a damage-direction chevron.

**Tests:** a crit kills any regular type in one shot and triples boss damage; the radius grows with Critical; drops
are collected within 4 m and on leaving aim mode; the kill counts feed the results.

### 7.8 Personas and switching (`20-personas.js`)

| # | Persona | Epithet | Look (summary; full rig spec §8.3) | HP | Weapon | Skill (R1 / Q) | Personality |
|---|---|---|---|---|---|---|---|
| 1 | **Ansel Holle** | THE SWEEP | ski patrolman: orange parka, black beanie, goggles on his forehead, a rescue toboggan behind him | 120 | Patrol .38 | **Flare** (12 Red): a flare overhead reveals every Whiteout within 30 m for 8 s; cooldown 20 s. Contextual: **Rescue** (hold △ at a frozen statue) and **Patrol** (crosses rope lines) | quiet, procedural ("Clear.") |
| 2 | **Dagny Holle** | SCHUSS | downhill racer: electric-blue speed suit, silver race helmet with an orange mirrored visor | 80 | Pole Guns | **Tuck** (hold, 2 Red/s): speed ×2 on rails, top speed 260 on skis; needed for jumps and the avalanche | impatient, speed metaphors |
| 3 | **Ignaz Holle** | TELEMARK | old aristocrat hunter: tweed coat, knickerbockers, red socks, green Tyrolean felt hat with a feather, a waxed white moustache | 90 | Gamsbock | **Long Look** (free, aim mode): toggles a ×3.5 scope (fov 62 → 18), sway halved, range 250 m | formal, archaic, hunting terms |
| 4 | **Rurik Holle** | MOGUL | fur-coated tycoon: ushanka, black beard, gold tooth, a cigar with an ember | 150 | Bullion | **Make It Rain** (10 Red): throws coins; Whiteouts within 12 m kneel to grab them for 3 s. Contextual: **Buyout** (pays turnstiles, velvet ropes and Murmel) | prices and deals |
| 5 | **Kasimir Holle** | YODEL | yodeler: white shirt, lederhosen, green braces, grey felt hat with a tuft, brown moustache, the alphorn on his back | 110 | Alphorn | **Echo** (10 Red): a yodel. It opens Echo Walls within 25 m, shatters ice crystals within 15 m, and marks every Whiteout within 40 m through walls for 5 s | jolly menace, sings fragments |
| 6 | **Mireille Holle** | SNAPSHOT | press photographer: trench coat, black beret, black bob, a press badge, a big box camera | 85 | Lady .25 | **Flash** (8 Red, aim mode): stuns Whiteouts in a 35°, 25 m cone for 2.5 s, reveals them, and develops Exposure targets in the cone | wry, French-inflected, light and framing |
| 7 | **Brigid Holle** | AVALANCHE | avalanche-control engineer: red hard-shell with reflective stripes, yellow hard hat with a headlamp, a red braid, an explosives bandolier | 110 | Avalauncher | **Control Charge** (15 Red, aim mode): a long lob (120 m) with a 5 m blast. The only thing that brings down cornices and seracs | dry, engineering terms |

- **Shared:** Red and Rime are Oma Holle's pool. HP and stats are per persona. HP does not regenerate.
- **The Featherbed ring:** hold L1 / Tab. Time slows to ×0.15. Seven portraits sit in a ring (Ansel at the top, greyed
  "ROOM 7 ONLY" outside Room 7). Pick with a stick, the mouse or 1–7; release to switch. A tap of L1 swaps back to the
  last persona. Frozen personas show as ice and can't be picked.
- **Switching:** 0.45 s. A white flurry of feathers and snow bursts; the old persona sinks and fades
  (`actor.sink` → 28, `fade` → 0); the new one rises from it. Invulnerable throughout. Then a switch-in bark (§11.9).
- **The Sweep** can only be picked at the Wardrobe in Room 7, or he takes over when a persona falls (§7.10).
- **Availability:** Target 00 starts with Ignaz, Dagny, Rurik and Ansel. Target 01 adds Kasimir, Mireille and Brigid
  (the card "THREE MORE COATS ARE DRY").
- **No switching** while aiming, during talk, cutscenes, the boss phases that lock it (stated in each boss), or while
  frozen or rescuing.

**Tests:** switching takes 0.45 s and preserves per-persona HP; the ring refuses the Sweep outside Room 7 and refuses
frozen personas; the Target 01 unlock adds three; Red and Rime are shared.

### 7.9 Skills (`22-skills.js`)

The costs and effects are in §7.8. Rules: a skill without enough Red plays a dry click and the HUD flashes the Red
meter; there are no partial skills. Flash, Control Charge and Long Look work only in aim mode. Tuck works while moving
or skiing. Flare, Echo and Make It Rain work in rail or aim mode. Buyout and Rescue are contextual through Interact.

**Tests:** each skill's cost, range, duration and cooldown; each gate kind opens only with its skill (§7.13).

### 7.10 Health, freezing, the Sweep's rescue, game over

- At HP 0 the active persona **freezes**: an ice shell forms over 1.2 s (`world.pen` cyan boxes and balls around the
  rig, which stops updating). The statue stays where it fell (`{ area, edge, s }`).
- The **Sweep takes over.** Ansel steps out of the area's last Room 7 door used, or the area's entry point if none.
  The HUD shows the statue's direction and distance. Enemies near the statue stay.
- At the statue, **hold △ for 1.5 s to chip it free** (it can be interrupted). The persona comes back at 50% HP and
  joins the ring again. You keep playing as Ansel and can switch away at once.
- **If the Sweep's HP reaches 0: GAME OVER.** "THE MOUNTAIN KEEPS YOU." Options: Continue (the last autosave or clock
  save, whichever is newer) or Quit to title. In a boss, Continue restarts the boss (an autosave at every boss start).
- Several frozen personas are allowed; each statue is marked.

**Tests:** HP 0 freezes and hands control to the Sweep at the right spawn; a 1.5 s hold revives at 50%; releasing
early cancels; the Sweep's death is game over; Continue restores the newer save; a boss retry restarts the boss.

### 7.11 Red, Rime, healing, the Wax Bench (`40-economy.js`)

- **Red:** cap 999; start 60. Sources: kills (§7.6), red-snow pickups (5–15), bosses. Uses: healing (1 Red = 1 HP, at
  40 HP/s while you hold heal in rail mode), skills, Buyout gates (velvet rope 20, turnstile 40), Murmel's hints (10;
  free for Rurik).
- **Rime:** no cap. Sources: crit kills, Rime crystals (3–5 each, 16 in the demo), bosses (Grau 10, the band 10, Hansi
  15). Use: the Wax Bench.
- **The Wax Bench** (Room 7): pick a persona, then one of four stats (levels 0–5). Cost per level: **3, 5, 8, 12, 16**
  Rime.
  - **Power:** +12% damage a level.
  - **Speed:** +8% movement and reload speed a level.
  - **Critical:** +10% warm spot radius a level; from level 3, +1 Rime on each crit kill.
  - **Steady:** −15% sway and +0.4 s reveal a level.
  The screen shows one persona at a time (portrait, four big 5-segment bars, the cost, your Rime). Confirm plays a hot
  wax hiss and Rosalind says a line.
- **Expected economy in the demo:** about 180 kills and 80 crits give about 140 Rime, enough for 12–16 levels in all.
  The player can't max everyone; that is the point.

**Tests:** healing converts at 40/s and stops at max HP or 0 Red; the costs follow the table; the effects apply at
once; Red is capped at 999.

### 7.12 Items, keys, collectibles, the Dossier (`41-items.js`)

| Item | Kind | Where | Use |
|---|---|---|---|
| Service Key | key | 00A, behind the bar | opens the stairwell door to 00B |
| Edelweiss Pass ×3 | key | 01B Inspector; 01B the band's tuba; 01C avalanche shelter | the gondola's Delegate Gate (all three) |
| Ember Charm | key, reusable | 01B, the Coastal hall safe (code from the darkroom) | melts ice locks (01E Room 7 door, 01E inner vault) |
| Lift Pin ×7 | collectible | one in each of 00A, 00B, 01A, 01B, 01C, 01D, 01E | lore; all seven unlock Pim's last line in the epilogue |
| Dossier pages ×8 | collectible | §11.10 | story and lore text |
| Exposures ×2 | story | developed with Mireille's Flash (01B press room, 01E ledger) | a code; the ledger reveal |
| Rime crystals ×16 | pickup | hidden on side branches: 00A 2 · 00B 3 · 01A 2 · 01B 3 · 01C 2 · 01D 1 · 01E 3 | Rime (3–5 each) |
| Red snow ×20 | pickup | on rails and in drifts: 00A 2 · 00B 3 · 01A 3 · 01B 3 · 01C 4 · 01D 1 · 01E 3 · 01F 1 | Red (5–15 each) |

The pause menu's **Items & Dossier** screen: at most 12 big item icons in a grid with their name and one line; tabs
(L1/R1): Items · Targets · Documents · Lift Pins · Exposures. Text pages use scale 2 with about 40 words a page.

**Tests:** pickups add once and persist through save and load; keys open their gates; the Dossier lists what was found.

### 7.13 Gates and puzzles (`42-gates.js`)

| Gate | Solver | How it plays | Wrong-persona line |
|---|---|---|---|
| **Patrol Rope** | Ansel | a rope of orange flags across an edge: "CLOSED — PATROL ONLY". He lifts it and passes | "Patrol only. You are not patrol." |
| **Ski Jump** | Dagny | a jump edge (§7.1) | "TOO FAR TO JUMP." |
| **Far Bell / Far Target** | Ignaz | a bell, insulator or similar target 60–90 m away, marked `far`: only a scoped Gamsbock shot registers (§7.4) | "TOO FAR." (at the hit) |
| **Velvet Rope / Turnstile** | Rurik | interact, then a choice: "PAY 20 / 40 RED?" | "Members only. Membership is a matter of means." |
| **Echo Wall** | Kasimir | an ornate wall; Echo within 25 m makes it ring and swing open | (nothing happens; Murmel hints) |
| **Ice Crystals** | Kasimir | resonant crystals blocking an edge; Echo within 15 m shatters them | "The ice hums. It wants a note." |
| **Exposure** | Mireille | a dark target (a blackboard, a frozen ledger): Flash it in aim mode within 25 m and the photo develops (a full-screen picture with the secret) | "Too dark to read. Too dark to see who's reading." |
| **Code Lock** | anyone | a safe with 4 dials: up/down change a dial, left/right move, ✕ opens; the mouse clicks dial arrows or uses the wheel; number keys type | "CLICK. CLICK. Nothing." |
| **Cornice / Serac** | Brigid | a snow overhang or ice towers; a Control Charge within 3 m of the anchor brings it down; a new edge (a snow bridge) or an opened way appears | "Too much snow. Not enough engineer." |
| **Ice Lock** | anyone with the Ember Charm | interact: the ice steams away | "Frozen shut." |
| **Delegate Gate** | anyone with 3 Edelweiss | interact: the passes go into three Edelweiss-shaped slots one by one | "Three flowers. You have {$n}." |
| **Key Door** | anyone with the key | interact | "Locked." |

The branch marker always shows the gate's icon and the solver's face, so the player knows who is needed. Murmel's
hints tell them how. The content validator proves every gate on the golden path can be solved with what the player
has by then (§14.7).

**Tests:** for each gate kind, the right solver opens it and every wrong one is refused with its line; opened gates
stay open after save and load.

### 7.14 NPCs and hints (`51-npcs.js`)

- **Murmel** (three spots: 00A reception, 01A ski school, 01C top station). Interact: a hint picked from a table by
  the current objective (§11.9). The first hint is free; each one after costs 10 Red (free for Rurik). The menu shows
  "BUY A HINT (10 RED)" and "LEAVE".
- **Pim the Lift Boy** (§11.9): a translucent ghost on a floating chairlift seat that rocks gently. His appearances
  are fixed; each gives lore and a nudge.
- **Telephones** (a booth or a house phone, ringing as you near): the Concierge's calls, once each. Each is a story beat.
- **Frozen tableaux** (01A villagers, 01B delegates, 01E deposits): rigs frozen mid-gesture in ice. Check gives a
  line.
- **Sister Rosalind** (Room 7) states the current objective in her own words. **Oma Holle** gives one line per visit,
  from a list that changes with progress.

**Tests:** hints cost 10 (0 for Rurik) and depend on the objective; each phone call fires once; Rosalind's objective
line matches `S7.objective()`.

### 7.15 Story, dialogue, cutscenes, title cards (`50-story.js`)

- One `E.Story` (people, nodes, vars) talking through one `E.Dialog` (`lines: 3`, `voice: null`; our voice synth types
  along, §10.4). `people` maps speaker ids to names, portrait rigs (live `rig.drawPortrait`) and voices.
- **Presentation:** a bottom box at about 70% of the screen width; the name in red capitals; text at scale 2. When a
  line starts, the speaker's name card pops in big for 0.4 s; it shows whenever the speaker changes.
- **Title cards** (`G.card`): a black screen, the white title at scale 4–5 (`E.font.title`, ink outline), a red
  subtitle, the target's black silhouette portrait (`rig.drawPortrait` tinted black), and a sting. Hard cut in, 2.5 s,
  hard cut out (any button skips after 0.8 s).
- **Cutscenes** are beats with letterbox bars (12% top and bottom), director overrides, rigs driven by `anim` poses and
  tweens. Start or Pause opens "Skip scene? YES / NO".
- **Objectives:** `S7.objective()` returns one line from the story flags (for example "Ring for service on the third
  floor."). It shows in the map screen and through Rosalind. There is no HUD objective marker; the map and the hints
  do that job.
- **Tutorials:** one-shot tips with big glyphs ("HOLD ✕ TO WALK"). Each clears when its action is done, and its flag is
  saved. Pause → Help (an E.Shell `help` screen) lists the keys for the last device and short sections on how to play.

**Tests:** every node referenced by an area or beat exists (the validator); a cold-open run (the bot pressing confirm)
reaches play; story state round-trips through a save; skipping a cutscene lands in the same state as watching it.

### 7.16 Room 7 (`52-room7.js`, `content/areas/room7.js`)

- **Every area has a Room 7 door:** a plain door with a frosted stencilled "7". Interact: the screen whites out in a
  flurry (0.6 s) and you stand inside Room 7. Leaving returns you to the door you came through. The area's world stays
  in memory, frozen.
- **Inside** (one persistent world; a rail loop of 6 stops):
  - the **Door**;
  - the **Cuckoo Clock**: save (`game.saves.show('save')`; `saves.canSave` is true only in Room 7);
  - the **Wax Bench**: upgrades;
  - the **Wardrobe**: seven coats, persona select, the Sweep included;
  - the **Bed**: Oma Holle's line;
  - the **Window**: the current area's view as a postcard of falling snow, plus the area's Lift Pin count.
  Sister Rosalind knits in an armchair by the bed (talk: the objective). The telephone on the side table replays the
  current briefing.
- Music: a music-box waltz (§10.1). Entering autosaves.

**Tests:** entering and leaving returns you to the same door; the clock saves to a slot; the Wardrobe can pick the
Sweep; doors refuse while enemies are alive.

### 7.17 Saves and checkpoints (`60-save.js`)

- `game.saves` (3 slots plus the autosave; `menu: { saves: { slots: 3, version: 1, migrate } }`). Save data is
  `{ v: 1, area, node, dir, persona, roster: { id: { hp, stats, frozen, statue, unlocked } }, red, rime, items, pins,
  opened gates, dead waves, collected spots, story: story.state(), results, playtime, difficulty }`. Place: the area's
  title. Level: "TARGET 00" or "TARGET 01".
- **Autosave:** on area entry, on Room 7 entry, and at every boss start (as the boss checkpoint). Never during a session
  (the hub's storage is empty anyway) or during attract mode or bot tests (unless a test asks).
- **Title:** CONTINUE loads `game.saves.latest()`; LOAD opens `saves.show('load')`.

**Tests:** serialize → deserialize → serialize is byte-equal; a save made mid-area restores the walker, roster, items,
flags and opened gates; a version-0 save is migrated or refused cleanly.

### 7.18 Map (`82-screens.js`)

Pause → Map, or Create / M in rail mode. A schematic of the current area's rail graph: visited edges as thick white
lines, unvisited but seen edges dotted, nodes as dots. Icons: Room 7 doors (a 7), Murmel, Pim, phones, gates (a lock
and the solver's face; struck through once opened), exits (an arrow and the destination's name), collected and
missing pickups that you have seen, your persona's portrait at your position, and frozen statues (an ice icon).
L1/R1 cycles visited areas. The objective line sits at the bottom. It is big and sparse: never more than 20 icons.

### 7.19 HUD (`81-hud.js`)

Minimal, like Killer7. Every piece is inside the 5% safe margin.
- **Top left:** the persona's portrait (32 px), their name at scale 2, the HP bar (80×5; white, recent damage in
  red), and the Red thermos (a vertical 6×30 vial; it drains while healing).
- **Top right:** Rime (a crystal icon and a count). In Target 01, the three Edelweiss slots.
- **Bottom centre:** context prompts (§6.2). The junction label of the highlighted branch.
- **Aim mode:** the persona's reticle at the centre (or at the pointer), ammo pips under it, the scan cooldown as a
  ring round it, warm-spot diamonds, laugh ripples, damage chevrons, the scope vignette for Long Look, "RELOADING"
  as a thin bar.
- **Splashes:** THAW. · TOO FAR. · CRITICAL BRAVO (bosses) · RED +n.
- **Statue marker** while rescuing: a direction arrow and metres.
- **Hidden** in cutscenes, in Room 7 (except the prompts) and with the dev toggle.

### 7.20 Menus and screens (`82-screens.js`, `83-shell.js`)

- **Title** (canvas over the Room 7 world: the camera drifts slowly over the bed toward the snowing window). The
  "SKILLER7" logo uses `E.font.title` at scale 5 (white, a red "7", an ink outline). Entries: NEW GAME · CONTINUE
  (only with a save) · LOAD · ECHO RUN · SETTINGS · ABOUT & CREDITS. Version and build at the bottom. Idle for 10 s →
  attract.
- **New Game** asks for the difficulty (Bunny Hill / Piste / Off-Piste), one line each, then the cold open.
- **Pause** (the engine's E.Shell, themed): Resume · Map · Items & Dossier · Personas (the seven cards: portrait, name,
  weapon, skill, stats, HP, status; read-only outside Room 7) · Help · About & Credits · Dev Mode · Settings ·
  Controls · Full screen · Quit to title. Custom items come from `menu.items`, a function, so a session can drop Dev Mode and Quit. An item's
  callback closes the Shell (`shell.hide()`) and opens our canvas modal.
- **Room 7 screens:** the Wax Bench, the Wardrobe (the seven coats in a row; the focused one large with its card).
- **Results** (after each target): the rank badge (Green Circle / Blue Square / Black Diamond / Double Black) and six
  stats (time, Whiteouts thawed, crit %, Red collected, personas frozen, hints bought) with the Concierge's one-line
  note.
- **Game over**, the **target cards**, the **code lock**, the **touch-only notice**, the **attract overlay** ("DEMO ·
  PRESS ANY BUTTON" with a glyph-aware button name).
- **About & Credits** (from the title and from the pause menu): pages of large text holding the Source Information fields,
  Testing Feedback, Engine Feedback and Prompt Feedback exactly as written in the hand-back (§16), then the credits:
  "Made with my-3D2dge v0.85.2 and its 3D module (MIT) · three.js r182 (MIT) · Rapier 0.19.3 (Apache-2.0) · AI Hub
  session client 1.4.0 · Asset store entries converted from Kenney and KayKit CC0 sets" (list only the sets actually
  used) · "Inspired by Killer7 (Grasshopper Manufacture / Capcom, 2005). An original game; no affiliation."
- E.Shell theme: `{ ink: '#f4f1ea', paper: '#0b0a0c', accent: '#d81e2a', muted: '#8a8590', danger: '#ff3a3a',
  line: '#2a262c', font: '600 22px "Arial Narrow", "Helvetica Neue", Arial, sans-serif',
  titleFont: '900 44px Impact, "Arial Black", sans-serif' }`.

### 7.21 Settings

Engine standard (Display, Sound, Comfort, Controller, Touch) plus the 3D settings `picture3d` (default `pixels`),
`shadows3d` (on) and `filter3d` (default **cel**). Define these three ourselves in `menu.settings`, with the same keys
and options as `E.World3D.SETTINGS` but our defaults, so they also exist headless. A world reads them when it is made
and follows any change. Never pass `res` or `filter.look` to a new world: world options override the player's choice.
`look3d` (cards or puppets) is left out: our hats, accessories and weapons are drawn on cards, so characters are always
cards. Our group **Game:**

| Key | Options | Default |
|---|---|---|
| `difficulty` | Bunny Hill · Piste · Off-Piste | Piste (changeable mid-game) |
| `aimToggle` | Hold · Toggle | Hold |
| `aimAssist` | Off · Low · High | Low |
| `padSens` | slider 0.5–2.0 | 1.0 |
| `mouseMode` | Look · Pointer | Look |
| `mouseSens` | slider 0.03–0.4 °/px | 0.12 |
| `laughCues` | On · Off (HUD ripples) | On |
| `textSize` | Normal · Large (dialog at scale 2 or 3) | Normal |
| `voices` | slider 0–1 | 0.8 |
| `padGlyphs` | PlayStation · Xbox (writes the engine's `glyphs`) | PlayStation |

### 7.22 Dev mode (`84-dev.js`)

**Pause → Dev Mode** opens a canvas modal (the sim frozen behind it, half-dimmed). Pages switch with L1/R1 or Q/E.
Up/down picks, left/right adjusts (hold to repeat), △ / Backspace resets the focused value, □ / Delete **resets the
page to defaults** (it asks first), ○ / Esc closes. The mouse hovers and drags sliders. Values apply live (the moment
you close it, the game runs with them) and are saved in `localStorage['s7:dev']`. There is a **Reset all to defaults**
button at the top of every page.

| Page | Contents |
|---|---|
| **Tuning** (sliders) | walk speed (85; 40–200) · ski top speed (190; 100–400) · aim sensitivity (pad; 0.5–2) · aim assist strength (0–1) · enemy speed × (1; 0.3–2) · enemy HP × (1; 0.2–3) · player damage × (1; 0.2–3) · warm spot radius × (1; 0.5–2.5) · scan radius (40 m; 10–80) · reveal time (6 s; 1–15) · spawn rate × (1; 0.3–2) · explosion damage × (1; 0–3) · Red drop × (1; 0–3) · Rime drop × (1; 0–3) · heal rate (40; 10–200) · time scale (1; 0.1–2) · cel bands (3; 2–8) · ink strength (1; 0–1.5) · fog far × (1; 0.3–3) |
| **Cheats** (toggles) | god mode · infinite Red · one-hit kills · reveal all · ghost through gates · all personas · show rails and nodes · show hit volumes and warm spots · show camera shots (frusta and ids) · free camera (fly: the left stick or WASD, the right stick or mouse, Q/E up and down) · hide HUD · slow motion on crits · show FPS and sim hash |
| **Warp** | every area → every node (lists of up to 7, paged) · start any boss or boss phase · jump to any story beat · give items (3 Edelweiss, Service Key, Ember Charm, all pins) · +100 Red · +20 Rime · revive all · kill all · trigger any wave · freeze the active persona (to test the rescue) |
| **Info** | area, edge and s, shot id, mode, alive and revealed enemies, sim hash, seed, version, build date, backend (WebGPU / WebGL 2) |

Hidden in AI Hub sessions. Its overlays (rails, volumes, shots) draw with `world.pen` lines and boxes.

**Tests:** every slider applies (set → snapshot shows the effect); reset restores every default; the free camera
doesn't move the sim; warps land on the named node.

### 7.23 Attract mode (`86-attract.js`, `content/attract.js`)

- **Trigger:** 10 s with no input on the title or any title submenu (Echo Run setup, About, the touch-only notice; the
  timer also counts while an engine Settings screen is open over the title, from real time in `draw`).
- **What plays:** a loop of seven vignettes (§11.12), each 18–25 s, each opening with a caption card. A cheating bot
  plays them: god mode, infinite Red, instant warps between vignettes, aim that snaps to warm spots, reveal all. It
  shows rails, aiming, scanning, crits, persona switching, the ring, skills, the lifts, the avalanche, the gondola,
  both bosses' set pieces and Room 7.
- **Overlay:** the small SKILLER7 logo top left, "DEMO" top right, and "PRESS ANY BUTTON" at the bottom (glyph-aware).
- **Exit:** any key, mouse button, wheel, mouse move over 6 px, gamepad button, stick past the dead zone, or touch. Then
  `game.input.consumeAll()`, a flurry back to the title, and the idle timer resets. The input that exits never
  activates a menu item.
- **Determinism:** seeded. Headless, it runs the full loop with no errors (§14).

### 7.24 Multiplayer: AI Hub session and Echo Run (`87-hub.js`, `88-echorun.js`)

**Echo Run** is the Black Run (01C) as a time trial: you play as Dagny from the start gate to the village. Whiteout
encounters sit at fixed distances with seeded types and warm spots. A Whiteout that reaches you adds **+3 s** and a
stumble. Each crit takes **0.5 s** off. Three routes: BLUE (safe), BLACK (fast, but with Plows), and THE JUMP (the
fastest). Ranks: Double Black < 95 s · Black < 110 s · Blue < 130 s · else Green.

**On its own (no hub):** Echo Run from the title. Your best run is recorded (walker edge, s, aim state and persona
every 0.1 s, about 1,200 samples) in `localStorage['s7:echo']` and replayed as **YOUR ECHO**: a translucent rig in
pale blue with a name tag. Results show your best time and rank. The campaign itself is single-player. In an AI Hub
session the same mode runs over the network (below).

**In an AI Hub session** (`AIHub.active`):
1. At start, skip the title, attract mode and menus. In the first boot step call
   `info = await AIHub.connect({ mode: 'ghost', seats: [1, 4] })`. If it returns `null`, carry on as the normal game.
   Otherwise the next boot steps build the Black Run world for Echo Run.
2. Seed the course from `AIHub.rng('course')`. Show "GET READY" over the start gate, and once the world is built call
   `AIHub.ready()` with no key press. We use the hub's own card (no `card: true`).
3. On `start`, count 3-2-1 against `AIHub.time()`. Play begins when `AIHub.time() >= 0`.
4. **Send** (unreliable, 10 Hz): `{ t: 'g', area: 'blackrun', e: edgeIndex, s: Math.round(s), a: aiming ? 1 : 0,
   y: Math.round(yaw * 100) }`. When you finish, send reliably: `{ t: 'done', time }`.
5. **Receive:** draw each other player as an **echo**: a translucent rig (`actor.fade = .45`) with a scarf in their
   seat colour (`#e8443a`, `#3b82f6`, `#22c55e`, `#f5b700`) and a name tag above (from `world.project`; names are
   drawn as text, never inserted as HTML). Positions ease toward the latest sample. Echoes affect nothing.
6. **Progress** about once a second: `AIHub.progress({ score: metresDown, label: '62% down · +6 s' })`.
7. **Finish:** `AIHub.result({ time: Math.round(AIHub.time() + penaltyMs), stats: { Crits, Penalties, Thawed },
   awards: [{ title: 'Clean Line', detail: 'No penalties' }] })`, once. Then wait, watching the echoes.
8. **`time-up`:** if you haven't finished, `AIHub.result({ score: metresDown })` at once.
9. **`end`:** stop input (`game.input.clear()`, ignore everything) and sound (`game.audio.mute(true)`, stop the
   music), freeze the sim, and show "ROUND OVER". The hub shows the results.
10. **`leave`:** remove that player's echo.
11. **Session rules:** no Quit, no Dev Mode, no saves, no map (Create stays free for the hub's Create + Options); the
    pause menu keeps Resume, Settings, Controls and Help; no `alert` or `confirm`, no new windows or links, no network
    other than the hub; ignore Options while Create is held (§5.9). On a touch-only device, `AIHub.fail` (§6.5).

**Tests:** the harness (§14.5) with players=2 auto; players=4 with latency 150, jitter 50 and loss 5; the host-leave
scenario. Also the game outside a session (`AIHub.active` false): the title appears and Echo Run plays solo with your
echo.

### 7.25 Difficulty, ranks, accessibility

| | Bunny Hill | Piste | Off-Piste |
|---|---|---|---|
| Enemy damage | ×0.5 | ×1 | ×1.5 |
| Enemy speed | ×0.85 | ×1 | ×1.15 |
| Reveal time | ×1.5 | ×1 | ×0.7 |
| Red drops | ×1.3 | ×1 | ×0.8 |
| Aim assist default | High | Low | Off |
| Avalanche speed | ×0.85 | ×1 | ×1.1 |

**Target ranks:** Double Black: crit % ≥ 60, no persona frozen, time ≤ par (Target 00 par 12 min, Target 01 par
40 min). Black: crit % ≥ 40 and at most 1 frozen. Blue: crit % ≥ 20. Otherwise Green.

**Accessibility:** laugh ripples, warm-spot diamonds, every line subtitled (the voices are gibberish anyway), text
size, hold or toggle aim, aim assist, the engine's comfort settings (reduce motion, shake, flashes) respected by every
effect, rumble from the engine's vibration setting, and no colour-only information.

---

## 8. Art direction and rendering

### 8.1 The look

- **The engine's native style:** `res: 'ps1'` with `expand`, the 3D picture at `'pixels'` (the game's own resolution,
  chunky; the `picture3d` setting), characters as **cards** (rigs drawn as pixel art from the camera's angle), plus the
  3D module's **Comic cel** filter (the `filter3d` setting's default; per world `bands: 3, ink: 1, inkW: 1.5, punch: 1.4,
  apply: 'all'`). Light falls in a few flat bands, ink traces edges and silhouettes, colours are pushed.
- **Killer7's feel, made ours:** large flat areas of white snow and black shadow; one accent colour per area; harsh
  single key lights and long shadows (the sun or moon with shadows outdoors, a spot or strong point light indoors);
  saturated **red** only for blood-red things (Red, wounds, the logo, the focus bar). White Whiteouts on white snow are
  made readable by the ink.
- **Typography:** chunky capitals, big, centred, hard cuts. Every chapter and boss gets a title card.
- Run `node engine/tools/check.mjs` (with the CDN routed, §14.4) for its notes on contrast and screen fill, and act on
  them where they apply to a 3D game.

### 8.2 Palettes and lighting per area

| Area | Accent | Key light | Fill and fog | Notes |
|---|---|---|---|---|
| Room 7 | candle amber | one hanging lamp (warm), the window's moonlight (cold) | `#1a1418`, fog off | the window always snows |
| 00A Lobby | oxblood and brass | 3 chandeliers (`#ffd8a0`), moonlight through the revolving door | `#1a1012` | marble checker floor, red runner |
| 00B Third floor | sick green-white | sconces, one failing (flicker .6) | `#0c100c`, near fog | long corridor sightlines |
| 00C Shaft | emergency red | a red rotating beacon, the car's own light | `#100406` | vertical space |
| 01A Village | Glühwein red and candle gold | dusk sun low in the west with shadows; string lights; stall fires (torches) | sky `#2a2440 → #e8a070` | snow ground, timber chalets |
| 01B Palais | committee blue and grey | cold fluorescent panels (several white lights), flag uplights | `#0a0c14` | marble, glass, flags |
| 01C Black Run | course orange (piste poles) | floodlights along the piste, the moon | night `#05070f` | orange nets, black signs |
| 01D Gondola | steel blue and sodium orange | the moon, the cabin's interior light, pylon lamps | storm fog | cable lines against the sky |
| 01E Archive | glacier cyan | cyan glows from the ice (`world.glow`, light: true) | `#02060a`, close fog | frozen people in the walls |
| 01F Summit | violet night and Föhn amber | starlight, an amber glow from the pavilion that warms as the boss nears the end | clears from storm to stars | dripping icicles |

### 8.3 Characters (rig specs; `E.Humanoid`, `size: 1.3` unless stated, `look: 'card'`)

| Who | build | outfit, hair, hat | acc | weapon | colours |
|---|---|---|---|---|---|
| Ansel | heroic, hunch .15 | coat; short `#9a9aa0`; beanie `#18181c`, pom `#f06a1e` | goggles (amber) on the forehead, pack (red, white stripe) | revolver | skin `#e6c8b0` coat/cloth `#d2461e` pants `#1c1c22` boot `#2a2420` trim `#f4f4f4` |
| Dagny | heroic | shirt (a speed suit); ponytail `#f0d890`; racehelmet `#c0c8d0`, visor `#ff8a1e` | — | poles | cloth and pants `#1e5cff`, trim `#ffffff`, boot `#101014` |
| Ignaz | heroic, hunch .1 | coat; short `#e8e8e8`; felt `#2e4a2a`, feather `#e8e0c0` | moustache `#f0f0f0` | rifle | coat `#7a5a3a` pants `#6a4a2a` boot `#8a1a1a` (red socks) trim `#3a2a1a` |
| Rurik | bulky, size 1.4 | coat (fur); short `#1a1410`; ushanka `#4a3a2a` | beard `#1a1410`, cigar | shotgun (gold) | coat `#3a2a20` trim `#d8b040` pants `#141416` |
| Kasimir | heroic | shirt; short `#5a3a1e`; felt `#6a6a6a` with a tuft | moustache `#5a3a1e` | alphorn | cloth `#f0f0e8` pants `#5a3a1e` trim `#2e5a2e` (braces) boot `#4a2e18` |
| Mireille | heroic | coat (trench); short black bob `#141414`; beret `#141414` | badge | pistol (and the camera on a strap: acc camera) | coat `#c8b48a` pants `#2a2a2e` lips `#c81e2a` |
| Brigid | heroic | coat (hard-shell); ponytail `#c8501e`; hardhat `#f0c020` (headlamp) | bandolier | launcher | coat `#c81e1e` trim `#d0d8e0` (reflective) pants `#141416` |
| Oma Holle | chibi, size 1.0 | lying (`down: 1`) under a featherbed of white pen balls; long white hair | — | none | skin `#e8d8c8` |
| Sister Rosalind | heroic | robe `#18181c`; hood true (white coif via colors.hair `#f4f4f4`) | shades styled as round glasses | none | trim `#f4f4f4` |
| The Concierge | heroic | coat (tailcoat) `#101014`; short `#c0c0c8` slicked | badge (a gold key) | none | blank pale eyes (eye `#d0d0d8`) |
| Pim | chibi, size 1.0 | shirt `#2e5a3a`; cap `#2e5a3a` | — | none | fade .6, on a floating chairlift seat (pen) |
| Murmel | `E.Blob({ R: 9, ears: 'cat', feet: true, mouth: true, face: 'front' })` | — | bungee cords (pen lines) to a ski rack | — | white fur `#f4f4f0`, nose `#2a1a1a` |
| Mister Föhn | heroic | coat `#f4efe4` (linen); short black slicked | shades | none | skin tanned `#b8805a`; an ice cream cone that never melts (pen) |

### 8.4 Whiteouts and bosses

- **Whiteouts:** heroic rigs, `hunch .2–.35`, all white (`skin #f6f6f4`, `cloth #ffffff`, `pants #ecedf2`), eyes as
  black slits, a wide black grin (`expr: 'smile'`), après-ski one-pieces with faint pastel tints per individual. Some
  wear white beanies or bellhop pillboxes. Size varies ±8% (seeded). The Plow holds an ice slab (a pen box, cyan, ink
  edges). The Tobogganer sits on `kenney-holiday:sled-long`. The Bloom is size ×1.8 with three glows.
- **Bellcaptain Augustin Grau:** heroic, size 1.4; a red bellhop uniform `#a01818` with gold trim `#e0b040`; a
  pillbox hat; grey skin; the grin.
- **Die Lustigen Vier (the Jolly Four):** a tuba player (bulky), an accordionist, a trumpeter and a snare drummer;
  white-faced Whiteouts in lederhosen and dirndl colours; instruments drawn with the pen (tuba: a brass lathe-like set
  of tubes and balls; accordion: a box whose bellows stretch to the beat).
- **Hansi Pulver, the Powder King:** heroic, size 1.4; tanned `#c89060`; spiky blond hair; a gold ski suit `#e0b040`;
  a gold race helmet; mirrored goggles; skis. **The Avalaugh:** a 12 m snowman built with the pen (three huge snow balls,
  pine-trunk arms, a coal grin that is a black slot, two coal eyes and three gold medals as warm spots).

### 8.5 New shapes and things (`content/shapes.js` as `E.SHAPES` data; `content/things3d.js` as `E.World3D.THINGS`)

Write each following docs/ASSETS.md (copy the nearest entry, check it with `engine/tools/asset-sheet.mjs`). Use the
store for generic props: `kenney-holiday` (snowmen, sleds, snowy firs), `kenney-furniture`, `kaykit-furniture-bits`
(beds, chairs, tables, shelves), `kenney-nature` (rocks, pines), and core shapes (barrel, crate, bench, lamppost,
pine, rock).

- **Room 7:** room7-door, cuckoo-clock (a light), wax-bench (a glowing iron), wardrobe (7 coats; doors open),
  holle-bed (an iron bedstead; the featherbed is pen balls so it can heave), armchair, candlestick-phone, radiator,
  team-photo-1926 (a frame).
- **Hotel:** reception-desk, luggage-rack, luggage-cart, suitcase (projectile), elevator-doors (part open), elevator-car,
  chandelier (a thing with lights), velvet-stanchion with rope, bar-counter, bottle shelf, service-bell (large, on a
  bracket), room-doors numbered 301–317, room-service-cart, revolving-door, sconce (lights).
- **Village:** chalet (timber and plaster, a pitched roof heavy with snow; three sizes), church with a bell tower, a
  frozen fountain, gluehwein-stall (with a fire), string-lights, ski-school hut, ski-rack, phone booth, a lift-station
  hut with a roof drift, turnstile, t-bar pylon, t-bar.
- **Palais:** security arch, flag (two factions: Coastal blue with a white wave; Steppe grey-red with a black sun),
  conference table and chairs, interpreter booth, ornate mirror panel (the Echo Wall), press pinboard, blackboard (the
  Exposure), safe with four dials, a ballroom stage, a dance floor.
- **Mountain:** piste-pole (orange), piste signs (blue, black, red), safety-net, snow cannon, avalanche-shelter hut,
  cornice (a snow overhang with a rock-like part in snow material), crevasse edge, ski-jump ramp, floodlight mast,
  gondola-cabin (windows, a seat, a door), cable pylon with insulators (shootable), glacier station.
- **Archive:** ice wall panels, deposit box frozen in ice (a numbered safe door), frozen-person case, ledger (a frozen
  book on a lectern), ice crystal cluster (the core `crystal`, recoloured), serac (an ice tower), freight elevator.
- **Summit:** a glass signing pavilion, flagpoles, a weather mast, slalom gate (red and blue flags), an old chairlift
  station and chair.

### 8.6 Effects (`91-fx3d.js`)

- **Snowfall:** about 2,000 flakes in several `InstancedMesh` batches of ≤ 1,000 (three r182's limit for dynamic
  instances), with `MeshBasicNodeMaterial`, made when the world is made, wrapped in a 30 m box round the camera,
  drifting with the area's wind. Interiors have none, except Room 7's window.
- **Decals:** footprints and red-snow stains as instanced flat quads, a ring buffer of 1,000 per world (made with the
  world). Footprints fade; red stains stay for the visit.
- **Breath, bursts and glints:** `game.particles.smoke` (white, small), `bits` (red slush), `glints` (Red and Rime
  pickups), `sparks` (shield hits), all drawn in 3D.
- **Warm spots:** `world.glow(x, y, z, 2.2, '#ff6a1e', { core: '#ffe0a0', light: true })` for the four nearest; the
  rest without light.
- **Scan ring:** `world.arc` on the ground plus a pen ring that expands. Echo: concentric pen rings. Flash: a white
  `game.flash` cone and a glow. Flare: a hovering glow with a light.
- **Splashes and cards** are HUD text (§7.19).
- **The flurry transition** (switches, Room 7 doors, attract cuts): a burst of white HUD flakes plus 0.3 s of white
  `game.flash`, honouring reduce motion.
- **Avalanche:** a wall of pen balls and particles rolling down the fall line, with laughing faces (black slots) in it.

---

## 9. Animation

The base is the engine's procedural rigs: gaits from velocity, poses, `E.MOVES`, `expr`, blinking and breathing. New
animation (state written into `anim` / `rig.update`, plus the patches in §5.9):

- **Persona movement:** a walk with a slight forward lean at 85 u/s (the gait from `vx`, `vy`). **Skiing:** no gait (the
  rig gets `vx = vy = 0`), `pose: 'crouch'` with lean 0.25; tuck is a deeper crouch with lean 0.45; carving rocks the
  lean ±0.12 at 0.7 Hz; a **hockey stop** turns the facing 70° in 0.15 s and kicks up a spray of snow particles; the
  skis are drawn (§5.9). **Quick turn:** the facing tweens 180° in 0.22 s with a small hop (`rig.kick`).
- **Ansel** drags a pen-drawn rescue toboggan on a rope from his waist. In rail mode **Kasimir** carries the alphorn
  on his back and swings it forward when aiming. **Mireille** lifts the camera to her eye when she uses Flash.
- **Switch:** sink and fade out, rise and fade in, `pose: 'hips'` for 0.4 s, then the bark.
- **Freeze:** the rig's last pose holds as an ice shell grows (a pen cyan box and balls scaled up over 1.2 s, with
  sparkles). **Thaw (rescue):** the shell cracks (white bits) and the persona kneels (`pose: 'kneel'`), then stands.
- **Heal:** `pose: 'cast'` while drinking from a thermos (a pen cylinder at the hand).
- **Whiteouts:** a lurching laugh-walk (hunch, `run` 0.4, head bob at 2 Hz); a laugh pose (head back:
  `expr: 'smile'`, `pose: 'cheer'` for 0.5 s) every few seconds; a giggle-up before exploding (`rig.kick` swelling,
  shake); melting (`actor.sink` 0 → 28 over 0.6 s while fading); kneeling to grab coins (`pose: 'kneel'`); a stunned
  wobble (`pose: 'guard'`, shake); a Plow's 180° turn (a 0.3 s tween); an Inspector's blink (fade to 0, a puff, fade in
  elsewhere).
- **First-person weapons** (`92-firstperson.js`, the overlay pen in the eye's frame: x ahead, y right, z up): each model
  built from boxes, tubes, cones and balls in the persona's colours, with gloved hands. Every weapon gets bob, sway,
  a recoil kick and a muzzle glow. Reloads:
  - .38: the cylinder swings out and spins, then flicks back;
  - Pole Guns: the poles dip and the mags slap;
  - Gamsbock: the bolt cycles;
  - Bullion: a shell goes in and the pump racks;
  - Alphorn: steam puffs as it heats and a cough when it overheats;
  - Lady .25: the slide;
  - Avalauncher: the drum rotates and the gas bottle hisses.
  Long Look draws a scope ring vignette.
- **Bosses:** Grau rings his bell (`attack` with the `cast` move as a raised arm), throws (the `throw` move), and tips
  his hat (`expr: 'smile'`, a head-tilt pose). The band plays to the beat (arms move with `audio.onBeat`, accordion
  bellows stretch on the downbeat). Hansi crouches, leans into his turns and swings his poles; he crashes into a tumble
  (`flip`). The Avalaugh bobs, its arms swing (pen transforms), and its balls melt (they shrink and drip).
- **Optional extra:** the repository's motion clips (`docs/MOCAP.md`, Quaternius and CMU sets, cut down with
  `tools/anim-set.mjs`) for the band's dancing and the Gigglers' laugh cycle, if procedural poses look stiff in the
  filmstrip checks.
- Check every new motion with `engine/tools/filmstrip.mjs` on a small test page (a rig on a card): it must wind up,
  act and settle with no snaps.

---

## 10. Audio (all in code)

### 10.1 Music (`content/songs.js`; the engine's `audio.music(song, { sync: true, fade: 1 })`)

Songs are written in the engine's step notation (`{ bpm, steps, tracks: [{ name, wave, vol, notes, on }] }`), in an
"alpine noir" style: pulse-wave accordion chords, triangle and saw oompah bass, pulse12 zither arpeggios, sine pads
with vibrato, brushed noise hats. Every play song has an **explore** layer and a **danger** layer (`on: false`).
`audio.layer('danger', 1, .5)` brings the danger layer in while enemies are alive within 40 m, and it fades out
1.5 s after the last one dies.

| Song | Where | Sketch |
|---|---|---|
| `title` | title | a slow minor waltz on pulse, then the SKILLER7 motif (a falling minor sixth and a rising seventh) |
| `room7` | Room 7 | a music box (triangle, high) in 3/4, a ticking clock, distant wind noise |
| `hotel` | 00A–00B | lounge jazz in D minor: a walking bass (triangle), muted trumpet (square with vibrato), brushes; danger: dissonant stabs |
| `shaft` | Grau | a lift-bell motif ("ding") as a rhythm; a faster pulse with each phase (`audio.tempo`) |
| `village` | 01A | an oompah polka in a minor key, half a step flat on purpose; danger: snare rolls |
| `palais` | 01B | bureaucratic minimal: arpeggiated sines, typewriter-click hats, a cold pad |
| `band` | the Jolly Four | a polka with four named tracks `tuba`, `accordion`, `trumpet`, `snare`. Each track's notes are that musician's vulnerability windows (§11.8). 112 → 124 → 136 → 148 bpm |
| `blackrun` | 01C | driving bass and a yodel-like lead with octave jumps; avalanche: tempo up plus a choir pad |
| `gondola` | 01D | suspended pads, creaking-cable rhythm (filtered noise), a slow heartbeat kick |
| `archive` | 01E | drones and crystalline bells (sine arps), a heartbeat |
| `powderking` | Hansi | a cheerful schlager, ironic and distorted; phase 2 drops to a slalom gallop; phase 3 is a lone pad |
| `echorun` | Echo Run | fast, bright, a countdown sting |
| jingles | — | `stage` (a target eliminated), `gameover`, `rank` |

### 10.2 Sound effects (`70-audio.js`; `audio.define(name, voice)` and lists of voices)

- **Weapons:** fire and reload for all seven; dry fire; overheat; scope in and out.
- **Combat:** Scan (a sonar ping and an expanding whoosh); crit (a glass crack, a choir chord); body kill (a slush
  splat); explosion (a wet pop and a low thump); shield TINK; the giggle-up rattle; snowball whoosh and hit.
- **Movement:** footsteps by surface (snow crunch, marble click, wood creak, ice tick); ski swoosh (filtered noise
  following speed); carve hiss; hockey-stop spray; jump and landing; lift hum and clacks; gondola creak; avalanche rumble
  (low noise with an LFO).
- **World:** church bell (inharmonic partials), service bell, cuckoo call, phone ring (a mechanical bell), Room 7 door
  (a soft major chord), Echo (a long yodel echo), Flash (a pop and whine), Flare (a fizz), Make It Rain (coins), Control
  Charge (a deep boom), wax hiss, Edelweiss slot (a chime per pass), ice lock steam.
- **UI:** focus tick, confirm, back, the switch flurry swish, the ring opening, card sting, the THAW splash, RED +n
  blips.
- **Ambience:** wind beds (filtered noise in two bands, slow gusts; the Föhn is a warm, low, whistling gust); hotel room
  tone; the village crowd murmur (gibberish voices at low level, §10.4); the archive's dripping.

### 10.3 Laughter (`72-laugh.js`)

- One synth voice per laugh: a sawtooth or pulse source at the laugh's pitch → two band-pass formant filters for "ha"
  (F1 750 Hz, F2 1200 Hz) → a gain envelope, plus a breath noise burst before each syllable.
- **Styles:**
  - giggle: 6–10 syllables, 90 ms each, high, rising;
  - cackle: 4–6, harsh, a pulse source, pitch falling;
  - chuckle: 3–4, low, soft;
  - wheeze: mostly noise.
  Each Whiteout has a seeded style and pitch (±3 semitones).
- **Positional:** a `StereoPannerNode` from the camera-relative angle, gain from distance (60 m silent), and a lowpass
  at 900 Hz when the LevelGrid line of sight is blocked. At most 8 laughs at once (the nearest).
- It runs on `game.audio.ctx` into our own buses: voice and laugh gains = `sfxVolume × voices × (muted ? 0 : 1)`,
  updated each frame. Headless, there is no AudioContext and it does nothing.

### 10.4 Voices: Animalese-style gibberish (`71-voice.js`, `content/voices.js`)

- **Per letter, synced to the dialog's typing:** each step, compare `talk.shown` with the last count. For each newly
  typed letter (every second one, skipping spaces and punctuation), play a syllable of 55–80 ms. Vowels set the formants
  (a 800/1200, e 400/2300, i 300/2700, o 450/800, u 325/700 Hz); a consonant before a vowel adds a 12 ms noise burst
  (s, z, f: high-passed; t, k, p: a click). Commas pause 120 ms, full stops 250 ms. A "?" rises the last 3 syllables by
  3 semitones; "!" adds gain and a +2 semitone accent. The pitch drifts down over a sentence.
- **Speakers** (base pitch Hz, range in semitones, rate, source, extras):

| Speaker | Pitch | Range | Rate | Source | Extras |
|---|---|---|---|---|---|
| Oma Holle | 420 | ±5 | slow | triangle | a quavering 6 Hz vibrato, quiet |
| Sister Rosalind | 260 | ±2 | clipped | pulse | dry |
| The Concierge | 120 | ±1 | slow | saw | telephone band (bandpass 300–3400 Hz), crackle |
| Mister Föhn | 160 | ±4 | lilting | sine + breath noise | a warm glide between syllables |
| Pim | 520 | ±3 | quick | triangle | an echo (feedback delay 180 ms) |
| Murmel | 200 | ±2 | slow | saw | muffled (lowpass 600 Hz), a ... pause every 3 syllables |
| Ansel | 110 | ±1 | slow | saw | — |
| Dagny | 330 | ±3 | fast | pulse | — |
| Ignaz | 140 | ±2 | slow | saw | a slight tremolo |
| Rurik | 95 | ±2 | medium | saw | a gravelly noise layer |
| Kasimir | 180 | ±7 | bouncy | pulse | yodel octave flips on stressed syllables |
| Mireille | 300 | ±4 | medium | triangle | breathy |
| Brigid | 240 | ±2 | medium | pulse | flat and dry |
| Grau | 150 | ±1 | medium | square | a "ding" on every 5th syllable |
| Hansi | 210 | ±5 | hearty | pulse | a cheerful lilt |
| Whiteouts | 300–500 | ±6 | random | — | laughter fragments inside words |

- Volume comes from the `voices` setting. The ring and barks use the same voices (short phrases).

**Tests (headless):** the voice module is a no-op without an AudioContext; a syllable schedule from text is
deterministic (the same text gives the same list); the dialog hookup counts letters correctly across pages.

---

## 11. Content

### 11.1 World and premise

- **The Free Canton of Piz Nada**, population "discreet": a neutral micro-state of one mountain, one village
  (**Oberglück**), the **Grand Hotel Nada**, a conference palace (the **Palais des Neiges**), ski runs, the
  **Himmelsbahn** gondola, and under the summit glacier the **Glacier Archive**, where the Canton's banks keep the
  deposits of every nation, some of them people. It has snowed for a hundred years.
- **The Thaw Accord:** the **Coastal Federation** and the **Steppe Directorate** will sign it at the summit at
  midnight to end forty years of frozen war. Article Nine makes the Canton open the Archive.
- **Mister Föhn**, the warm wind, wants everything to melt: "Everything comes out in the thaw." People he touches laugh
  until they are invisible: the **Whiteouts**. His agents are the **Warm Front**.
- **Oma Holle**, 104, keeps the mountain frozen by shaking her featherbed. In 1926 a chairlift of eight young skiers
  was caught by an avalanche; she was the only one found alive. Her seven personas have the faces and skills of the
  seven who weren't. (The demo hints at this and never states it.)
- **The Department of Discretion**, through **the Concierge**, sends her "guests" to check out. Is she the hero?
  Who pays the Department? The demo ends on that question.

### 11.2 Writing style guide (Killer7's register, our world)

- **Short, flat sentences**, mostly under 12 words. People answer the question underneath the one asked, or another
  one.
- **Euphemism as menace:** hotel, bank and ski-school vocabulary for violence ("check out", "turn-down service",
  "deposit", "first tracks", "après").
- **Politics as weather, weather as politics:** "A cold front from the Steppe. A warm one from the Coast. We sell
  umbrellas to both."
- **Repetition with drift:** lines recur and change meaning ("Breakfast is at seven." "Count again.").
- **Each voice has a tic:**
  - Ansel: procedure;
  - Dagny: speed;
  - Ignaz: hunting and old manners;
  - Rurik: prices;
  - Kasimir: song;
  - Mireille: light and framing;
  - Brigid: engineering;
  - the Concierge: service;
  - Murmel: ellipses and gratuity;
  - Pim: counting and 1926;
  - Föhn: sunshine;
  - Holle: a child's or an oracle's few words.
- **Title cards** are in capitals, centred, and hard-cut in with a sting.
- **No real nations, politicians, religions or brands.** Swearing is rare and mild. The gore is stylised (red slush,
  no organs).
- Every line in the demo uses this guide; §11.9 has the key scenes in full, and the rest follow them.

### 11.3 Cast

The seven personas (§7.8), Oma Holle, Sister Rosalind, the Concierge (his name plate says AMBROSE), Mister Föhn, Pim
the Lift Boy, Murmel, the targets (Bellcaptain **Augustin Grau**; **Hansi Pulver**, the Powder King), **Die Lustigen
Vier**, and the tableau extras (delegates, villagers, staff).

### 11.4 Enemy table → §7.6. Bosses → §11.8.

### 11.5 Items → §7.12.

### 11.6 The flow, with timings

| # | Beat | Area | Introduces | Approx. minute |
|---|---|---|---|---|
| 1 | Cold open: cards, the phone, "Shake the bed." | Room 7 | dialog, voices, Room 7 | 0 |
| 2 | Lobby: walk, turn, junction, first laugh, aim, scan, crit, Red, heal | 00A | the core loop | 1–4 |
| 3 | Murmel's free hint; Pim in the elevator (Pin 1) | 00A | hints, lore | 4 |
| 4 | Velvet rope: switch to Rurik (ring tutorial), Buyout; the bar fight; the Service Key; the bar phone | 00A | switching, a gate, a key | 5–7 |
| 5 | Third floor: doors open on both sides (quick turn), Twins, a Snowballer cart | 00B | enemy variety | 7–9 |
| 6 | The lookout: Ignaz's Long Look rings the service bell 70 m away | 00B | Far Bell | 9 |
| 7 | The collapsed floor: Dagny's jump | 00B | Ski Jump (indoors) | 9–10 |
| 8 | The ceiling falls (scripted): the Sweep's rescue tutorial; Room 7 "3-7": save, Wax Bench | 00B | death, rescue, saves, upgrades | 10–11 |
| 9 | **Boss: Bellcaptain Grau** in the service shaft; TARGET 00 ELIMINATED; results | 00C | boss, results | 11–14 |
| 10 | Briefing: three more coats, TARGET 01 — APRÈS | Room 7 | all seven | 14–15 |
| 11 | The village hub: chalets, Glühwein market, Plow intro, Tobogganers; the church bell (Ignaz) clears the lift roof | 01A | hub, choices | 15–20 |
| 12 | Palais: security, the Hall of Mirrors (Kasimir's Echo), the Steppe hall Inspector (Edelweiss 1), the press-room darkroom (Mireille), the safe → Ember Charm | 01B | Echo, Exposure, code lock, Inspector | 20–28 |
| 13 | **Mid-boss: Die Lustigen Vier** in the ballroom → Edelweiss 2 | 01B | the rhythm boss | 28–31 |
| 14 | The T-bar (Rurik's turnstile, aim on the lift); the top station (Room 7, Murmel); the patrol rope (Ansel); the cornice (Brigid) → the shelter, Edelweiss 3 | 01C | Patrol, Cornice, lifts | 31–37 |
| 15 | The jump (Dagny) onto the avalanche slope → **LAWINE!** chase; then the downhill to the village | 01C | the avalanche, skiing | 37–40 |
| 16 | The Delegate Gate: three passes; the gondola fight; the power cut; Pim on the roof; Ignaz shoots three insulators | 01D | the moving rail, Far Targets | 40–44 |
| 17 | The Glacier Archive: the ice gallery, Echo crystals, the ledger Exposure (the reveal), the Ember Charm on the inner vault and the Room 7 door, Blooms, Brigid's seracs | 01E | Bloom, story reveal | 44–50 |
| 18 | **Boss: Hansi Pulver**: the Avalaugh, the slalom, the interview; TARGET 01 ELIMINATED; results | 01F | the finale | 50–56 |
| 19 | Epilogue: Föhn and Holle play chess; the Concierge's last call; a teaser card; credits | Room 7 | — | 56–58 |

Target 01's hub is non-linear: 01B and 01C can be done in either order; the gondola needs all three passes.

### 11.7 Area walkthroughs

Sizes are in tiles (1 m). Rail graphs are sketches: build them with the listed nodes, then place cameras for every
edge. Wave notation: count × type @ spawn. **Bold** = golden path.

#### Room 7 (12 × 10; walls 4 m; dark planks; one tall bay window to the north)
```
          [window]
         /        \
     [bed]        [clock]
       |             |
   [wardrobe]     [bench]
         \        /
          [door]  ← every Room 7 door leads here
```
A two-way loop. Fixed shots: one wide from the south-east corner at 3 m; one low over the bed toward the window; a
close shot of Holle's face for her lines. The props are as in §7.16.

#### Target 00 — 00A Grand Hotel Nada, the Lobby (40 × 28; walls 6 m; marble checker floor; red runner)
```
                          [x1 stairwell door → 00B]  (needs the Service Key)
                                    |
                              [m1 mezzanine]
                                    |  (stairs, 4 m up)
 [b2 bar back]—[b1 bar]—[g1 velvet rope]—[j3 stairs foot]
                          (Rurik, 20 Red)    |
                                       [j2 lobby centre]—[j4 elevators: Pim, Pin 1]
                                             |
              [s1 luggage rack: Murmel]—[j1 reception]—[r7 Room 7 door]
                                             |
                                  [d0 revolving door]  (storm: locked)
```
b2 holds the Service Key; b1 holds the bar phone and a Rime crystal (in the fireplace).
- **Start:** Room 7 → the r7 door. Tips: walk (r7 → j1), the first junction at j1.
- **First Whiteout** (a beat on j1 → j2): a laugh, Ignaz's line, the "HOLD L2 TO AIM" tip, a scan tip, one Giggler
  (warm spot on its chest) walking out of the dark of the elevators, a fire tip, a crit → "THAW."; the Red tip, a heal
  tip once below 70%.
- **j4:** Pim in the open elevator car (lore 1, Pin 1 on the car's floor). Wave `elev`: 3 × Giggler @ the shafts.
- **s1:** Murmel's free hint 1.
- **g1:** the velvet rope. The ring tip ("HOLD L1: THE FEATHERBED"), switch to Rurik, pay 20 Red.
- **b1:** wave `bar`: 2 × Giggler + 1 × Bellboy from behind the counter. The bar phone (the Concierge, call 2). A Rime
  crystal in the fireplace. **b2:** the Service Key behind the bar (a pickup).
- **m1:** wave `mezz`: 2 × Bellboy running down from the third floor. x1 needs the Service Key.
- Cameras: a high wide shot from the mezzanine looking down over j2; a low dolly along the reception desk; a
  through-the-chandelier crane on the stairs; a reverse shot in the bar.
- Pickups: Red snow ×2 (tracked in from the storm), a Dossier page ("Grau's employee file") at reception.

#### 00B Third Floor and the Service Shaft (56 × 20, plus the 8 × 8 shaft at the east end; walls 3 m)
```
[x1 stair door]—[c1]—[j5: 305 | 306 | on]—[c2]—[l1 LOOKOUT: the service bell 70 m east across the light well]
                       |      |                   |
                    [r305]  [r306 Twins]          [g2 hole in the floor: JUMP (Dagny)]
                                                  |
                     [c3: SCRIPTED COLLAPSE]—[j6: Room 7 "3-7" | r312 | on]—[c4]—[sh shaft doors (open after the bell)]
                                                                                    |
                                                                         [00C ring rail round the shaft floor]
```
- **c1 → c2:** doors open on both sides as you pass (waves `doors1`, `doors2`: 2–3 × Giggler each, from behind you
  too: the quick-turn tip). r306: wave `twins` (1 × Twins) and a Rime crystal. r305: a Dossier page ("Room service
  menu: the Bellcaptain's specials") and Red.
- **c2:** a room-service cart with a Snowballer throwing ice cubes from 30 m.
- **l1 LOOKOUT:** across the hotel's light well, the giant service bell hangs 70 m away. Only Ignaz's scope reaches it
  (Murmel's hint 3 explains if asked). Ringing it: a deep DING, and the shaft doors at the far end grind open
  (cutscene: 3 s).
- **g2:** the floor has fallen through; Dagny's jump (hint 4).
- **c3, scripted:** the ceiling gives way on the active persona → frozen. The Sweep tutorial: Ansel steps out of the
  "3-7" Room 7 door at j6 and walks back; 2 × Giggler converge on the statue; hold △. Then Rosalind's voice through
  the hotel intercom: "The Sweep only leaves Room 7 when someone's on the floor. Use the wardrobe if you want him back."
- **j6:** Room 7 "3-7": save, the Wax Bench tip (Ignaz's first upgrade is suggested). Pin 2 is on the room-service cart
  at c2. **sh:** autosave, then Grau.
- Pim's appearance 2: sitting on a floating room-service cart at c4.

#### 00C Boss — Bellcaptain Augustin Grau (§11.8)

#### Target 01 — 01A Oberglück, the Village (64 × 48; snow ground; dusk; chalets as shapes, streets as rails)
```
                          [pg Palais gate → 01B]
                                  |
 [ch church square]—[f1 fountain ring, north]—[mk market alley]—[r7a Room 7 door (bakery alley)]
   bell tower                     |                  |
   (Far Bell from mk, 80 m)  [f2 fountain ring, south]  [mu ski school: Murmel]
                                  |
       [ht Hotel steps (Target 01 start)]—[ls lift-station square]—[tb turnstile (Rurik, 40) → T-bar → 01C]
                                  |
                          [gg Delegate Gate (3 Edelweiss) → 01D]
```
- **Start** at ht after the briefing. The "THREE MORE COATS ARE DRY" card; a tip that the ring now has seven.
- **ls:** the lift-station hut is buried under a roof drift. Murmel's hint 5: the church bell.
- **mk:** the market (Glühwein stalls with real fires, string lights); wave `market`: 3 × Giggler + **1 × Plow** (its
  intro; a Rurik or Kasimir tip appears if the Plow takes 4 frontal hits) + 1 × Snowballer on a chalet roof. At the
  alley's end, the **lookout** toward the church tower (80 m): Ignaz rings the bell → the drift slides off the lift
  station.
- **ch:** wave `church`: 2 × Twins. Frozen villagers (tableau lines). Pin 3 on the fountain's frozen basin (f1).
- **tb:** the turnstile (Rurik, 40 Red) → the T-bar ride to 01C (aim allowed: 3 × Snowballer on the slope as you rise).
- **gg:** the Delegate Gate (three slots). A phone booth by the gate (the Concierge, call 4: Edelweiss).
- Pim's appearance 3: above the fountain on his floating seat.
- **Returning from 01C** you arrive at **ls** from the slope's bottom (the downhill).

#### 01B Palais des Neiges (60 × 40; marble; glass; two delegation halls)
```
[e1 entrance]—[sc security arch]—[at atrium]—[hm Hall of Mirrors]—(Echo Wall)—[sp servants' passage]—[bb ballroom backstage]
                                      |   \                                                        |
                                 [cf Coastal hall]  [sd Steppe hall: INSPECTOR → Edelweiss 1]   [br BALLROOM: the Jolly Four]
                                      |   (safe 2-6-0-1 → Ember Charm)       |                         |
                                 [pr press room: DARKROOM → the code]  [ck cloakroom: Room 7 door]  [bx back exit → 01A f1]
```
- **sc:** the metal-detector arch (a scan reminder tip); wave `security`: 2 × Bellboy + 2 × Giggler.
- **at:** a phone (the Concierge, call 5: Article Nine).
- **cf / sd:** the frozen delegations (tableau lines); waves `coast` (Plow + 2 × Giggler) and `steppe` (2 × Twins).
  The **Inspector** blinks between the Steppe hall's three flag stands; kill it for Edelweiss 1.
- **pr, darkroom:** the lights are out; Whiteouts here (`dark`: 3 × Giggler) can only be seen by scan or flash. The
  blackboard is an Exposure: Mireille's Flash develops a line in invisible ink under a cartoon of a chairlift: "THE DAY
  THE EIGHT WENT UP: 26 · 01" (the code is 2-6-0-1; the avalanche was on 26.1.1926) → the Exposure in the Dossier.
- **cf safe:** a code lock: 2-6-0-1 → the Ember Charm, plus a Dossier page ("The Thaw Accord, Article Nine").
- **hm:** the Hall of Mirrors: the Echo Wall (Kasimir) opens the servants' passage. Pin 4 is in the passage. Murmel's
  hint 7 covers it.
- **br:** autosave, then **the Jolly Four** (§11.8) → Edelweiss 2 (it drops from the tuba's bell) and 10 Rime. The back
  exit bx opens to the village (a shortcut).
- **ck:** the Room 7 door (behind the coats).

#### 01C The Black Run (terrain; top 2,300 m → village 1,700 m; about 1.6 km of piste; night floodlights)
```
[tb T-bar top]—[ts top station: Room 7 door, Murmel]—[pr PATROL ROPE (Ansel)]—[cr ridge: CORNICE (Brigid)]—[sb snow bridge*]—[as shelter: Edelweiss 3, Pin 5]
      |                                                                                                            |
 [st start gate]                                                                                           [jp JUMP (Dagny)]
      ║ ski                                                                                                        ║
 [f1 fork: BLUE | BLACK | JUMP (Dagny)]                                                                            ║
      ║ BLUE: long, gentle, 2 waves                                                                                ║
      ║ BLACK: steep, a Plow on the piste, Tobogganers  ◄══ jp lands here (the LAWINE chase, once) ═════════════════╝
      ║ JUMP: a kicker over a gully that rejoins BLACK lower down (about 9 s faster)
 [f2 merge]══ski══[vb village bottom → 01A ls]
```
(* the snow bridge edge exists only after the cornice falls.)
- **ts:** a Room 7 door (so the Sweep can be fetched for the patrol rope), Murmel's hints 9 and 10, Red snow.
- **pr:** the patrol rope ("CLOSED — AVALANCHE DANGER — PATROL ONLY"): only Ansel crosses.
- **cr:** the ridge wears a cornice over a crevasse. Switch to Brigid; a Control Charge brings it down → a snow
  bridge edge (sb) appears (cutscene: 4 s).
- **as:** the avalanche shelter: Edelweiss 3, Pin 5, the Dossier page "The Avalanche of 1926" (a clipping with a team
  photo of eight). Wave `shelter` (2 × Giggler) on the way out.
- **jp:** the way back down is a ski jump (Dagny). Landing on the black slope starts **LAWINE!** (once):
  - the camera cuts to a reverse tracking shot (looking back up at Dagny with the wall of white behind);
  - 25 s of downhill; the avalanche runs at 92% of Dagny's tucked top speed;
  - letting go of tuck for more than 1.5 s lets it catch up, and if it reaches her she freezes (the Sweep spawns at
    the top station);
  - Whiteout faces laugh in the snow wall;
  - 2 forks to choose under pressure.
- **st → f1 → f2 → vb:** the normal downhill. BLUE: waves `blue1` (3 × Giggler on skis: Tobogganer movement, Giggler
  stats) and `blue2` (2 × Tobogganer). BLACK: `black1` (a Plow standing on the piste: hockey-stop and deal with it, or
  take the jump), `black2` (3 × Tobogganer). JUMP (Dagny): a kicker over a gully, a slow-motion beat in the air (time
  ×0.5 for 0.6 s, a fixed side-on shot), then it rejoins BLACK below `black1`. Floodlit fixed shots at the steep bits;
  follow shots otherwise.
- **The T-bar up (from 01A):** a lift edge of about 30 s with Snowballers on the slope (aim on the lift).
- Echo Run uses st → vb with its own wave table (§11.11).

#### 01D Himmelsbahn, the Gondola (terrain valley; a lift edge of about 1.8 km over about 120 s; storm)
```
[gs village station]==lift 0→55%==[mid: POWER CUT]==lift 55→100%==[gl glacier station → 01E]
```
- Board at gs after the Delegate Gate ceremony (the three passes glow into their slots; 3 chimes). The cabin is a pen
  and shape model; the camera is inside (fixed shots through the windows) until you aim.
- **Combat while riding:**
  - cabins on the down cable pass every 15 s with a Snowballer leaning out;
  - **Cable Crawlers** (Gigglers, hand over hand along our cable toward the cabin; they explode on the roof: 20 damage
    and a lurch);
  - 2 × Giggler appear at the windows (they climb up from below).
- **mid:** the power cuts; the cabin swings; Pim sits on the roof (lore 4: "Count again."); Oma Holle's voice in a
  dream fragment. Three frozen **insulators** on the next pylon, 70–90 m away: only Ignaz's scope (Far Targets).
  Then the power comes back and the ride continues. Pin 6 is wedged in the cabin's seat.
- **gl:** autosave; the glacier tunnel.

#### 01E The Glacier Archive (50 × 40; blue ice walls; dark; cyan glows)
```
[gl tunnel]—[ig ice gallery: frozen people]—[ec ECHO CRYSTALS (Kasimir)]—[lv ledger vault: EXPOSURE (Mireille)]
                     |                                                       |
              [r7e Room 7 door: ICE LOCK (Ember Charm)]            [iv inner vault: ICE LOCK (Ember Charm)]
                                                                             |
                                                                [sr SERACS (Brigid)]—[fe freight elevator → 01F]
```
- **ig:** the ice gallery: deposit boxes and people frozen in the walls (tableau lines with account numbers). Pim's
  appearance 5. Wave `gallery`: 3 × Giggler + 1 × Twins. Pin 7 is behind an ice-crystal side branch (Echo).
- **ec:** resonant crystals block the corridor; Kasimir's Echo shatters them (hint 11 if needed).
- **r7e:** the Room 7 door is frozen in the wall: use the Ember Charm.
- **lv:** the frozen ledger on a lectern: Mireille's Flash develops it. The reveal: "ACCOUNT 7 — HOLDER: H. HOLLE —
  CONTENTS: SEVEN (7) PERSONS, DECEASED 26.1.1926 — IN TRUST." Then the persona chatter (§11.9).
- **iv:** the inner vault (the Ember Charm): 15 Rime, a Dossier page ("The Department of Discretion: Standing Orders").
  First **Bloom** (wave `vault`: 1 × Bloom + 2 × Giggler).
- **sr:** the seracs block the freight elevator: Brigid's Control Charge. **fe:** autosave, then the summit.

#### 01F The Summit (terrain; the summit plaza with the glass pavilion; the glacier face below; the old chairlift)
Phase rails: the plaza's **arc rail** (a 120° arc of 30 m radius round the pavilion, 5 nodes behind cover: two
flagpoles, the weather mast, two pavilion pillars); the **slalom rail** (about 700 m down the glacier face, parallel
to Hansi's own rail 15–25 m to the side); the **chairlift** (a fixed first-person scene). See §11.8.

#### Epilogue (Room 7) → §11.9.

### 11.8 Bosses

**Bellcaptain Augustin Grau (00C, the service shaft; 2–3 min; no switching after the intro).**
- **Arena:** the shaft floor (8 × 8) with a ring rail of 4 nodes (walk to dodge); the elevator car runs up and down
  the shaft; its doors face your side when it stops at floors 1, 2 and 3 (high above you).
- **Phase 1:** the car stops at a floor ("DING"). Grau throws 3 suitcases in arcs (shoot them in the air for Red; one
  that lands deals 12 damage, and one in three releases a Giggler). After throwing he **tips his hat** for 1.4 s:
  his warm spot is under it. A crit ends the phase.
- **Phase 2:** the cable snaps. The car free-falls and bounces between floors every 7 s with faster dings; suitcases
  fly from both sides; same hat-tip windows.
- **Phase 3:** he rides the car's roof ringing his bell; 2 Gigglers drop from above every 6 s; the hat-tip window
  shrinks to 1 s.
- **Defeat:** "Checkout… is at… eleven…" He melts into slush; his bell rolls to your feet. TARGET 00 — AUGUSTIN GRAU —
  ELIMINATED. Results.

**Die Lustigen Vier, the Jolly Four (01B ballroom; 3 min; switching allowed).**
- The four stand on the stage; the `band` song plays. **Each musician's warm spot glows only while their own track
  has a note sounding** (from `audio.pos.at` and the track's note string; this works headless on the music clock).
  Shots outside a musician's window are absorbed ("the music protects them": a deflect sparkle).
- Each bar while the band lives, 2 dancing Gigglers waltz in from the dance floor (at most 6 alive), laughing on the
  beat.
- **Killing a musician** (a crit in their window, or 120 body damage inside windows) removes their track from the
  song (`audio.layer(name, 0)`) and raises the tempo (`audio.tempo`): 112 → 124 → 136 → 148.
- **The last one alive plays a solo** (the tuba, if left for last: the warm spot sits in the tuba's bell).
- Edelweiss 2 is wedged in the tuba's bell: it drops whenever the tuba player dies, whatever the order.
- **Defeat:** "Bravo… bravo…" BRAVO splash. 10 Rime.

**Hansi Pulver, the Powder King (01F; 6–8 min; an autosave before each phase).**
- **Intro (the plaza):** "Grüß Gott! You came for a lesson? Lesson one: everything goes downhill." He laughs, the
  Föhn blows, and the snow of the plaza rises into the Avalaugh.
- **Phase 1, the Avalaugh** (the arc rail; switching allowed):
  - a 12 m laughing snowman with **5 warm spots**: three gold medals on its chest and its two coal eyes;
  - it hurls snowballs every 2.2 s (15 damage; shootable);
  - a Giggler buds from its base every 5 s;
  - each crit melts part of it (a ball shrinks and drips);
  - with 2 spots left it sinks and starts **the Thaw**: 40 s, shown as a ring of meltwater spreading across the
    plaza. If the timer ends, it bursts for 60 damage and regrows one spot;
  - after all 5 the snow collapses, and Hansi falls out of it, clicks into his skis and drops down the glacier face.
- **Phase 2, the Slalom** (the slalom rail, `aimOnTheMove`; time ×0.6 while aiming; no switching; any persona, though
  Dagny's tuck keeps you close):
  - he weaves through 6 slalom gates on his own rail;
  - **he can only be hurt while passing a gate** (0.8 s; the flags flash red);
  - between gates he throws gold medals (10 damage; shootable);
  - you need **4 crits** (or 360 body damage within windows);
  - if you fall more than 60 m behind he waits at the next gate, laughing ("Bend the knees!");
  - after the fourth hit he crashes through the last gate into the old chairlift station.
- **Phase 3, the Interview:** a cutscene. The two of you sit on a stuck chairlift in fog; he is human again, losing
  warmth. You are in first person, aim only (no scan or skill). His lines play (§11.9). A shot at any time ends it.
  If you haven't fired after 10 s, he says the "You hesitate" line and lets himself fall. Either way: TARGET 01 — HANSI
  PULVER — ELIMINATED; results. The two endings differ by one line and one Dossier note ("Shot" or "Fell").

### 11.9 Script: the key scenes in full

Speaker tags map to `people` ids. Cards are in capitals.

**Cold open (Room 7).**
```
CARD  THE WINTER OF THE THAW ACCORD.
CARD  THE FREE CANTON OF PIZ NADA. POPULATION: DISCREET.
(The phone rings. Rosalind lifts the receiver and holds it out toward the bed.)
CONCIERGE  Good evening, Madame Holle. A guest has checked into the Grand Hotel who will not be checking out.
CONCIERGE  Bellcaptain Grau. Third floor and below. The Department thanks you for your discretion.
HOLLE      ...Shake the bed, Rosalind.
ROSALIND   She means it's time. She always means it's time.
(Rosalind shakes the featherbed. Feathers. Outside, the snow thickens. The wardrobe doors swing open.)
IGNAZ      Grau. His grandfather carried my luggage in 1925. He never smiled either.
DAGNY      This one's smiling.
RURIK      Everyone smiles when the price is right.
CARD  TARGET 00 — TURN-DOWN SERVICE
```

**First Whiteout (00A).**
```
(A laugh, somewhere in the dark of the elevators.)
IGNAZ   Laughter. In a hotel lobby. At this hour.
DAGNY   Shoot it before it finishes the joke.
(The first crit) IGNAZ   Clean.
```

**Murmel (first meeting, 00A).**
```
MURMEL  Welcome... to Piz Nada... Higher than you think...
MURMEL  Gratuity... is customary... The first one... is on the house...
MURMEL  Hold the button... and you walk... Let go... and you are only standing... Standing is honest...
```

**Pim (00A, the elevator).**
```
PIM  Going up? Nobody's going up. The elevator's been laughing since Tuesday.
PIM  Seven of you. I always count. Count again, later.
```

**The bar phone (00A).**
```
CONCIERGE  The Bellcaptain is on duty tonight. Third floor and below.
CONCIERGE  Do enjoy the bar. It is complimentary, for members.
```

**Grau's intro (00C).**
```
GRAU  Ding. Ding. Ding. Every floor has a bell, and every bell has a floor.
GRAU  Your luggage, Madame? It is very heavy. It is full of everyone you were.
```

**After Grau.**
```
CARD  TARGET 00 — AUGUSTIN GRAU — ELIMINATED
CONCIERGE  Your guest has checked out. Housekeeping has been notified.
CONCIERGE  Breakfast is served at seven. As always. As it was. As it will be.
```

**Target 01 briefing (Room 7).**
```
CONCIERGE  At midnight, at the summit, the Coastal Federation and the Steppe Directorate will sign the Thaw Accord.
CONCIERGE  Forty years of frozen war, ended with a fountain pen.
CONCIERGE  Article Nine requires the Canton to open the Glacier Archive. Every account. Every name. Every body.
ROSALIND   Bodies in a bank.
CONCIERGE  Deposits, Sister.
CONCIERGE  The Föhn has booked a guest onto the mountain. Hansi Pulver. Three Olympic golds. The face on the chocolate.
CONCIERGE  He will ski the summit at midnight and the glacier will weep. The Department would prefer it did not weep.
HOLLE      Hansi. I taught Hansi to fall.
MIREILLE   Then we'll teach him to land.
KASIMIR    Yo-di-ah-hee... hoo.
BRIGID     I'll bring the snow down on him. Gently. Like a mother.
CARD  THREE MORE COATS ARE DRY.
CARD  TARGET 01 — APRÈS
```

**The ledger reveal (01E).**
```
EXPOSURE  ACCOUNT 7 — HOLDER: H. HOLLE — CONTENTS: SEVEN (7) PERSONS, DECEASED 26.1.1926 — IN TRUST.
MIREILLE  We're in the vault.
IGNAZ     We are the vault, mademoiselle.
DAGNY     Don't read it twice. Reading twice is how you fall.
```

**Hansi, the Interview (01F, phase 3).**
```
HANSI  You know what the Föhn told me? The snow is a lie the mountain tells the valley.
HANSI  Every spring the truth runs down into the rivers, and the children drink it.
HANSI  Your grandmother keeps it frozen. Who pays her? Who pays you? Same bank.
(If no shot after 10 s)
HANSI  ...You hesitate. That's new. They usually don't.
(He leans back and lets go of the chair. Fog.)
CARD  TARGET 01 — HANSI PULVER — ELIMINATED
```

**Epilogue (Room 7).**
```
(Mister Föhn sits at the foot of the bed in white linen, eating an ice cream that does not melt.
 Between him and Holle, a chessboard of ice.)
FÖHN       Your move, Frau Holle. You lost a bishop. A very handsome bishop. Three gold medals.
HOLLE      I have seven more pieces.
FÖHN       You have one piece, Holle. Wearing seven coats.
FÖHN       Spring always comes. That's not a threat. It's a weather report.
(He breathes on the window. It drips. Rosalind draws the curtain.)
ROSALIND   Draughty.
(The phone.)
CONCIERGE  The Accord is signed. Nobody remembers signing it. Your next guest arrives with the thaw. Sleep well, Madame.
(If all 7 pins) PIM  Eight on the lift. Seven in the wardrobe. One in the bed. Now you've counted right.
CARD  TARGET 02 — BLACK ICE
CARD  THE SNOW WILL CONTINUE.
→ credits (scrolling, big type) → title
```

**Murmel's hint table** (by objective; then the fallback):
1. (00A, free) the walking line above.
2. (rope) "The bar... is for members... Membership is a matter of means... Who in the family has means...?"
3. (bell 00B) "Ring for service... at the end of the hall... Only an old man's eyes... reach that far..."
4. (gap) "A hole in the floor... is a ski jump... for someone in a hurry..."
5. (01A bell) "The church bell... shakes the snow off the lift station... Someone with a long gun... and long patience..."
6. (gate) "The gondola is for delegates... Three Edelweiss... One in the Palais... one in a tuba... one on the mountain..."
7. (mirrors) "Mirrors lie... Echoes don't... Sing to the wall..."
8. (press room) "The press room is dark... Someone with a flash... could develop a secret..."
9. (patrol rope) "The ridge is closed... Patrol only... The Sweep lives in Room 7... Wake him..."
10. (cornice) "The ridge wears a snow hat... Knock it off... and you have a bridge... Brigid knows how..."
11. (crystals or ice locks) "Ice hums... when it wants a note... Ice weeps... when it meets an ember..."
- Fallback: "Have you tried... being somebody else...?"

**Pim's appearances:** (1) 00A, above. (2) 00B: "Room 7 isn't on the plan. The architect was very sorry. He's in the
walls now." (3) 01A: "Do you know why it never stops snowing here? Somebody upstairs is shaking a bed." (4) 01D: "There
were eight of us on the lift that day. The snow took seven. Count again." (5) 01E: "They froze the whole team in the
photograph. Smile, everybody. Nobody smiled." (6) the epilogue line above, with all 7 pins.

**Concierge calls:** cold open · 00A bar · after Grau · briefing · 01A gate booth: "The gondola is reserved for
delegates. Delegates carry Edelweiss. Edelweiss grows where it likes." · 01B atrium: "The Accord has forty-three
articles. Article Nine is the one with teeth. The others are gums." · 01E (a house phone frozen in the ice): "You are
in the vault. The Department would prefer you didn't read anything. The Department knows you will." · epilogue.

**Tableaux (Check):**
- 01A: "It hasn't stopped snowing since Grandmother was a girl." · "The Föhn came through Tuesday. My husband
  laughed until he wasn't there." · a ski instructor: "Bend the knees. Bend the truth. Same muscles."
- 01B: the Coastal Ambassador: "We have nothing to hide that we haven't already hidden." · the Steppe General:
  "Neutrality isn't a place. It's a direction. Away." · the interpreter: "He says... he is sorry. He is not saying
  that." · a waiter: "The canapés were always frozen. Now they're honest." · a journalist: "Off the record? The record
  is on ice." · a secretary: "Sign here. And here. And under the ice."
- 01E: "Account 4417. Contents: a journalist, 1961." · "Account 2210. Contents: a quarrel between two countries.
  Unopened." · "Account 0889. Contents: the truth about a war. Interest accrues."

**Rosalind (Room 7):** save: "The clock is wound. Your sins are not." · the Wax Bench: "Wax them well. The mountain
notices." · objective lines: one per objective, in her voice (e.g. "The Bellcaptain's luggage is heavy. Ring for
service." · "Three flowers for a gondola. Go and pick them." · "The vault. Read nothing. Read everything.").

**Holle (bed):** "Shake the bed..." · "Hansi always fell to the left." · "Seven coats. Seven hooks. One girl." · "Is it
spring yet? Don't tell me." · "The wind is warm today. Close the window." · "Eight on the lift... no, seven... no..."

**Persona barks** (switch-in · crit · low HP · frozen · revived):

| Persona | Switch-in | Crit | Low HP | Frozen | Revived |
|---|---|---|---|---|---|
| Ansel | "Sweep's on." / "Nobody stays on the mountain." | "Clear." | "Patrol needs patrol." | "...log it..." | "Back on shift." |
| Dagny | "Late. Everyone's always late." / "Point me downhill." | "Gone." | "Slower is worse." | "...cold..." | "I owe you a coffee." |
| Ignaz | "Ah. Weather for it." / "One shot is a conversation." | "Clean." | "I have bled before. In better company." | "...how undignified..." | "Hm. Thawed." |
| Rurik | "Everything has a price. Even this." / "I'll buy the next round." | "Paid in full." | "Bad investment." | "...put it on my tab..." | "Worth every coin." |
| Kasimir | "Yo-di-ah... hoo." / "The mountain sings back if you're rude enough." | "Encore!" | "Sour note." | "...hoo..." | "From the top!" |
| Mireille | "Smile. No, not you." / "Light is a confession." | "Developed." | "Overexposed." | "...out of focus..." | "Back in frame." |
| Brigid | "Fire in the hole. Gently." / "Snow's just water that hasn't decided." | "Controlled." | "Load's shifting." | "...buried..." | "Dug out. Cheers." |

### 11.10 Lift Pins and Dossier pages

**Lift Pins** (slogan · Pim's line in the Dossier):
1. PIZ NADA — HIGHER THAN YOU THINK · "They say three thousand metres. The mountain says otherwise."
2. GRAND HOTEL NADA — ROOMS 1–316 · "There is no Room 7. There never was. Don't knock."
3. OBERGLÜCK CHRISTMAS MARKET · "The Glühwein is warm. That's how they get you."
4. THAW ACCORD — SIGN HERE · "Treaties are written in pencil and signed in pen."
5. I SURVIVED THE BLACK RUN · "Seven didn't."
6. HIMMELSBAHN — HOLD ON TIGHT · "I held on. The lift let go."
7. 1926 TEAM — EIGHT FOR GOLD · "Eight on the lift. Seven on the wall. One in the bed."

**Dossier pages:**
- (target file) TARGET 00 — Augustin Grau, bell captain, 41 years of service, never late, never smiled; smiling
  since Tuesday.
- (target file) TARGET 01 — Hansi Pulver, three Olympic golds, the face of Nada chocolate, instructor to presidents;
  listed "WARM FRONT — COMMANDER".
- Grau's employee file (00A).
- Room service menu: the Bellcaptain's specials (00B).
- The Thaw Accord, Article Nine (01B).
- The Avalanche of 1926: a clipping with a photo of eight (01C).
- Department of Discretion: Standing Orders ("1. Discretion. 2. See 1.") (01E).
- The ski school price list ("Private lesson: 80. Private lesson, no questions: 800.") (01A ski school).

### 11.11 Echo Run course (`content/echorun.js`)

The 01C downhill from st to vb. Encounters sit at fixed metres down the course: 120 (2 × Giggler), 260 (Tobogganer),
420 (Plow on BLACK / 3 × Giggler on BLUE), 600 (2 × Tobogganer), 760 (Twins), 900 (Snowballer pair), 1,100 (3 ×
Giggler), 1,300 (Plow), 1,450 (2 × Tobogganer). Types and warm spots come from `AIHub.rng('course')` (in a session) or
`E.rng(seed)` (solo). The jump shortcut cuts about 9 s. A course-time HUD shows elapsed time and penalties; echoes show
with their names.

### 11.12 Attract vignettes (`content/attract.js`)

1. "HOLD TO MOVE. STOP TO KILL." 00A: walking, a junction, the first scan and crits.
2. "SEVEN KILLERS. ONE BODY." 01A market: the ring opens; every persona fires a shot or uses a skill on a crowd.
3. "SCAN. FIND THE WARM SPOT." 00B corridor: doors open both sides, quick turns, Twins splitting.
4. "LAWINE!" 01C: the avalanche chase.
5. "SKY CABINS." 01D: the gondola fight, Cable Crawlers.
6. "EIN, ZWEI, DREI, VIER." 01B: the band boss, shot on the beat.
7. "THE POWDER KING." 01F: the Avalaugh, then the slalom.
Then the title card for 3 s and loop.

---

## 12. Build order and milestones

Each milestone ends with its tests green (`node tests/run.mjs`) and, where it says so, a screenshot look.

**M0 — Foundations and spikes (first, before anything else).**
- `tools/fetch-deps.mjs`: the pinned files of §4.
- `tools/build.mjs` producing the single HTML with a hello world: a test area (a box room), a hero rig on a card, the
  cel filter on, the import map to the CDN.
- `tests/run.mjs` with one Node suite and one browser suite: the built file over `file://` with the CDN routed to
  `vendor/`, `?backend=webgl`; boot completes; the canvas isn't blank; no console errors.
- **Spike:** an actor placed by our code each step (`fly: true`, `pose: false`, `setSolid(false)`) stays exactly where
  placed after `world.step`. Our own rig update animates it. `world.camera.fixed` set in draw is honoured.
- **Spike:** the first-person overlay draws a pen box in the eye frame.
- **Spike:** `world.project` matches the sim projection within 1 px.
- **Spike:** the vm harness loads the engine and the bundle with the stand-ins (window, addEventListener, location),
  runs `S7.start({ headless: true })` and advances 2 s.
- **Exit:** all green. Note what the spikes taught in the dev folder's `NOTES.md`.

**M1 — Rails and cameras (greybox).**
- LevelGrid, RailGraph, Walker (walk, junction, quick turn, stairs), CameraDirector (fixed, follow, dolly), the
  intent layer with the full input map, glyph prompts, junction markers (stick, keys, mouse).
- A greybox version of 00A (walls and floors only).
- Dev overlays: rails and shots.
- **Exit:** the rails and camera tests of §7.1–7.2; in the browser suite, the greybox lobby is walked end to end with
  a stubbed gamepad and again with keyboard events, and a mouse click takes a junction branch.

**M2 — Aim, weapons, Whiteouts, scan (the core loop).**
- Aim mode (pad and both mouse modes), Ignaz's and Dagny's weapons, hitscan against the LevelGrid, Gigglers and
  Bellboys, waves, the scan, warm spots, crits, Red drops and healing, contact explosions, the laugh synth (positional),
  laugh ripples, footprints and breath.
- The HUD basics.
- **Exit:** §7.3–7.7 tests; a bot clears a lobby wave honestly; a screenshot of aim mode with a revealed Giggler and its
  warm spot.

**M3 — Personas, skills, gates, death.**
- All seven personas with their weapons, skills, first-person models and rig looks (the engine patches §5.9 1–4).
- The Featherbed ring and switching.
- Every gate kind (§7.13), including the code lock UI.
- Freezing, the Sweep's rescue and game over.
- The remaining enemy types.
- **Exit:** §7.8–7.10 and §7.13 tests; a filmstrip of each persona's switch and reload; the kits still pass after the
  engine patches.

**M4 — Meta.**
- Room 7 (world, loop, clock, Wax Bench, Wardrobe), saves and autosave, the economy, items and the Dossier, the map,
  Story and Dialog with portraits, the Animalese voices, beats, title cards, letterbox, tutorials.
- The E.Shell theme and pause items.
- Settings (§7.21) and the glyph default patch.
- **Exit:** §7.11–7.12 and §7.14–7.18 tests; the save round trip; the cold open plays with voices.

**M5 — Target 00 complete.**
- 00A and 00B/00C fully dressed (shapes, lights, props, palette, every camera shot).
- Grau with all three phases.
- Results.
- The hotel and shaft music.
- **Exit:** the playthrough bot finishes Target 00 honestly on Piste; screenshots of each area's main shots and each
  Grau phase.

**M6 — Target 01 complete.**
- 01A to 01F, dressed.
- The Jolly Four, the avalanche, the gondola, the Archive's reveal, Hansi's three phases, the epilogue and credits.
- All songs.
- **Exit:** the playthrough bot finishes the whole demo honestly on Piste (and with god mode on Off-Piste, to catch
  softlocks); the validator's golden-path proof passes; screenshots.

**M7 — Modes and shell.**
- The title flow, difficulty select, attract mode (all vignettes), Echo Run (solo with your echo), the AI Hub session,
  the dev mode panel (every page), the touch-only notice, About & Credits.
- **Exit:** the attract loop runs 3 minutes headless with no errors and exits on input in the browser; the hub harness
  passes (§14.5); the touch-only browser test passes; the dev sliders' tests pass.

**M8 — Polish and ship.**
- Balance passes with the bot's metrics (time to kill, damage taken per area, Red and Rime totals; aim for the
  economy in §7.11).
- Look notes from `check.mjs`, filmstrips, the screenshot review list (§14.6), and a full browser playthrough of the
  golden route driven through real input events: once with a stubbed DualSense, once with keyboard and mouse.
- Write the About text and `exit-interview.json` (§16).
- A final build and the full test run.

---

## 13. Risks and how to de-risk them

| Risk | Why it matters | De-risk | Fallback |
|---|---|---|---|
| The 3D module from a CDN in one `file://` page | Everything rests on it | Proven while planning (§4); M0 repeats the spike in the real build; tests route the CDN to `vendor/` | Inline the vendored three and Rapier as `data:` module URLs in the import map, rewriting three.webgpu's `./three.core.min.js` import to a bare specifier mapped there too |
| Headless tests of a 3D game | TASK.md wants scripted playthroughs | The sim/presenter split from day one; NullPresenter; the sim never reads the presenter | none needed: Playwright covers only boot, look and the hub |
| Rails and cameras feel bad | Hand-placed cameras make or break the Killer7 feel | Validator coverage; a follow-shot default; the dev overlay of shots; a browser test that screenshots every shot of an area for review (`tests/browser/shots.test.mjs`) | the follow shot everywhere, plus hand shots at junctions and set pieces |
| Invisible enemies feel unfair | They are the core challenge | Four tells (laugh, ripple, footprints, breath), a short scan cooldown, bot damage metrics per area, difficulty settings | longer reveal and slower enemies through TUNING defaults |
| Aim feel on pad and mouse | Shooting is half the game | Curves, acceleration and assist from shipped shooters; dev sliders; bot time-to-kill | pointer mode as the mouse default if look mode feels wrong |
| Engine rig patches break other drawing | The engine is shared code | Additive branches only; filmstrips; the kits' test after patching | draw accessories with `world.pen` at joints (puppets and cards) and in a portrait overlay |
| Content volume (9 areas, 3 bosses) | The biggest share of time | Data-driven areas; greybox before dressing; the validator; the golden-path BFS | none: build it all, greybox first so it is always playable |
| AI Hub edge cases | The hub refuses games that fail its check | Follow the ghost example; run the harness's scenarios in M7 | — |
| Many laughs at once | Audio clutter | Cap at the 8 nearest; duck the music in heavy waves | — |
| WebGPU missing | Some browsers | three's WebGPURenderer falls back to WebGL 2 by itself; test both (`?backend=webgl`) | — |
| Determinism drift | The bot, attract mode and replays rely on it | Only E.rng streams in the sim; never Math.random in sim code (a test greps the sim's files); no wall-clock time in the sim | — |

---

## 14. Testing

### 14.1 The one command

From the dev folder: `node tests/run.mjs` (or `npm test`).
- It runs every Node suite, then every browser suite. Each failure prints as `FAIL <suite> › <check>: <detail>`; passes
  print nothing.
- The last line is the count, for example `212 passed, 0 failed (48.6 s)`. The exit code is 1 on any failure.
- Options: `--node` (Node suites only), `--browser` (browser suites only), `--only rails,combat` (named suites).
- Rerun only the suites whose code you changed, then the full run at each milestone's end.

### 14.2 Node suites (`tests/node/`, run in a vm like `game/test.mjs`)

The harness: `ctx = { console (quiet), window, addEventListener() {}, location: { hash: '', search: '' } }` (the
kits' stand-ins), load `engine/my-3d2dge.js` then the dev folder's `out/bundle.js`, call
`S7.start({ headless: true, seed })`, then drive it with `game.advance`, `game.input.tap` / `hold` and `game.debug`.
Guard every browser API the bundle touches (`matchMedia`, `navigator`, `document`, `AudioContext`, `localStorage`,
`requestAnimationFrame`) with `typeof` checks, so the same bundle loads in the vm and in the page.

| Suite | What it covers |
|---|---|
| `core` | registries, the bus, rng streams, the tuning reset, no `Math.random` in the sim's source |
| `rails` | §7.1 |
| `camera` | §7.2 |
| `aim` | §7.3 |
| `weapons` | §7.4 |
| `scan` | §7.5 |
| `whiteouts` | §7.6 |
| `combat` | §7.7 |
| `personas` | §7.8–7.9 |
| `death` | §7.10 |
| `economy` | §7.11 |
| `items` | §7.12 |
| `gates` | §7.13: every kind × every persona |
| `npcs` | §7.14 |
| `story` | §7.15: every node runs to its end with confirm taps; skip equals watch |
| `room7` | §7.16 |
| `saves` | §7.17: the round trip, mid-area restore, migrate |
| `bosses` | each phase reachable through `debug.boss`; each beatable by the bot; the band's windows follow the music clock |
| `echorun` | timing, penalties, ranks, echo recording and playback |
| `hub` | a fake `AIHub` object: the session flow calls connect, ready, progress, result and send in the right order; time-up reports a score; end stops input; nothing else happens outside a session |
| `attract` | 180 s of attract mode: no errors, all 7 vignettes seen, the loop restarts; an input exits to the title |
| `dev` | every slider and toggle applies and resets |
| `voice` | a no-op without an AudioContext; deterministic syllable schedules |
| `determinism` | the same seed and inputs give the same `debug.hash()` at 10 checkpoints, twice |
| **`playthrough`** | §14.3 |

### 14.3 The scripted playthrough (`tests/node/playthrough.test.mjs`, `src/85-bot.js`)

- **The bot plays honestly:** no cheats, no warps, Piste difficulty.
  - It reads `game.debug.snapshot()` and drives intents: hold move, pick branches by BFS over the rail graph toward
    its route's next goal, interact, switch personas, heal below 50%, buy hints never.
  - It fights: enter aim, scan when nothing is revealed, turn at no more than 160°/s toward the nearest revealed warm
    spot after a 0.25 s reaction time, with ±0.3° aim noise; fire; reload when empty; use skills where its route says.
- **Its route** (`content/attract.js` and a full route in `tests/routes/golden.js`) is a list of steps such as
  `{ goto: '00A:j4' }`, `{ interact: 'murmel' }`, `{ switch: 'rurik' }`, `{ gate: 'rope' }`, `{ fight: 'until clear' }`,
  `{ boss: 'grau' }` and `{ dialog: 'advance' }`, covering the whole golden path of §11.6, including the scripted
  rescue.
- **It asserts milestones in order,** each within a game-time budget:
  - each area reached;
  - each gate opened by its intended persona;
  - each pass, key and pin taken;
  - each boss phase passed;
  - TARGET 00 and TARGET 01 results shown;
  - the epilogue reached;
  - the credits and back to the title.
- **It records metrics** (damage taken per area, Red and Rime totals, time per area, deaths) and prints them as one
  line with `--metrics`, for balancing.
- **Variants:** Off-Piste with god mode (proves no softlocks under harder numbers); Bunny Hill honest (it must finish
  faster).

### 14.4 Browser suites (`tests/browser/`, Playwright, headless Chromium)

- Load the **built** single file from `file://` with `?backend=webgl` (and once without, for WebGPU or its fallback).
  Route the four CDN URLs to `vendor/` with `page.route` (`Access-Control-Allow-Origin: *`,
  `Content-Type: application/javascript`).
- **`boot`:** the boot screen, then the title; `S7.started`; no page errors or console errors; the canvas has
  non-trivial pixels (more than 5% non-black, at least 16 colours).
- **`play`:** New Game → the cold open (skipped) → 10 s of scripted play in 00A through keyboard events → the
  snapshot moved; pause opens; Dev Mode opens, one slider changes and the snapshot shows it.
- **`attract`:** 11 s idle on the title → `scene === 'attract'`; a key press → back to the title, and no menu item
  activated.
- **`glyphs`:** a fake gamepad (stub `navigator.getGamepads` with a standard-mapping pad; press buttons) → prompts read
  ✕ ○ △; switch the setting to Xbox → A B Y; a key press → key names.
- **`touch`:** a context with `hasTouch`, `isMobile` and no keyboard used → the notice "CONTROLLER OR KEYBOARD
  REQUIRED" and the SETTINGS button; no touch buttons; after 11 s, attract mode runs; a tap returns to the notice.
- **`mouse`:** hover over a junction marker highlights it; a click takes the branch; menu hover moves the focus.
- **`shots`** (on demand, `--only shots`): one screenshot per camera shot of an area into `tests/out/shots/<area>/`,
  for review.
- **`look`:** screenshots of the §14.6 list into `tests/out/look/` (they never fail on their own; they are for review).

### 14.5 The AI Hub harness (`tests/browser/hub.test.mjs`)

- Copy the built game, `vendor/aihub/harness.html`, `bridge.js` and `round.js` into `tests/out/hub/`.
- Serve that folder with `python3 -m http.server 0 --bind 127.0.0.1` (read the port from its first line; keep its PID).
- Confirm `GET /<game>.html` returns our page (its `<title>` starts with "Skiller7").
- Open `harness.html?game=<file>&players=2&auto=1`, route the CDN, and wait for
  `document.body.dataset.complete === 'true'` (timeout 5 min). Assert `window.__hubCheck.pass === true`; on a failure,
  print the harness's failed checks.
- Repeat with `&players=4&latency=150&jitter=50&loss=5&auto=1`, then with `&scenario=host-leave`.
- Stop the server by its PID in a `finally`.

### 14.6 Screenshot review list (only what scripts can't judge)

- the title;
- the cold open with a card;
- the 00A lobby wide shot;
- aim mode with a revealed Giggler and its warm spot;
- a THAW splash;
- the Featherbed ring;
- each persona in third person and in first person (14 shots);
- Room 7 and the Wax Bench;
- the map;
- the Dossier;
- the code lock;
- each Grau phase;
- 01A at dusk;
- the 01B darkroom flash;
- the band boss;
- the avalanche chase;
- the gondola at the power cut;
- the 01E ledger Exposure;
- the Avalaugh, the slalom and the interview;
- each results screen;
- the epilogue;
- About & Credits;
- the touch-only notice;
- Xbox prompts;
- Echo Run with echoes (from the harness).

Look for readability at TV distance (shrink each shot to 25% and check that the text still reads), ink on white,
palette per area, and nothing clipped by the safe margin.

### 14.7 The content validator and the no-placeholder scan (`tools/validate-content.mjs`)

It runs in the build and as a Node suite. It checks:
- every area: nodes and edges valid; paths of positive length; no orphan nodes; exits point to real areas and nodes;
- camera shots cover [0, 1] on every edge (both directions where `rcams` is set), and at 5 sample points of each
  shot's range the camera stands in open space with a clear LevelGrid line of sight to the hero's chest;
- spawns, waves, triggers, beats and story nodes are referenced only if they exist;
- every speaker has a name, a portrait rig and a voice;
- every gate's solver exists and is unlocked by the time the gate is reachable on the golden path;
- **the golden-path proof:** a BFS over states (area, node, items, personas unlocked, opened gates) shows the demo can
  be finished, and that the gondola needs all three passes;
- every string in `content/` is free of `TODO`, `TBD`, `lorem`, `placeholder` and `XXX`;
- every Lift Pin, Dossier page and Rime crystal sits on a reachable node or edge.

---

## 15. Definition of done (TASK.md traceability)

| TASK.md asks | Where in this plan | Proven by |
|---|---|---|
| Genre and perspective that fit the source | §1, §7.1–7.3 | the playthrough; screenshots |
| Title: a riff picked by a real RNG from 50 | top of this file | — |
| A single HTML file with the right name; CDN dependencies allowed | §3, §4, §5.1, §5.8 | the browser `boot` suite on the built file |
| Built on the my-3d2dge handoff; engine changes allowed | §4, §5.9 | engine patch list in §16 |
| The engine's native style; new art where the source needs it | §8 | screenshot review |
| The engine's native animation; new animations for the feel | §9 | filmstrips |
| All audio in code; Animalese voices | §10 | the `voice` suite; listening |
| Online through the AI Hub library, and on its own | §7.24 | the hub harness (§14.5); the `hub` suite; solo Echo Run |
| A dev subfolder; bundled to the root | §3, §5.3, §5.8 | the build |
| Unlimited performance budget: detail, enemies, effects, lights, shadows | §8 | — |
| Headless tests with game.advance and game.debug; a scripted playthrough; one command | §14 | `node tests/run.mjs` |
| An original game inspired by the source; a complete vertical slice showing every feature | §2, §11 | the playthrough's milestones |
| Infrastructure for designers | §5.5, §14.7 | the validator |
| Dev mode from the pause menu, with live sliders and reset | §7.22 | the `dev` suite |
| Attract mode after 10 s idle; any input exits; it may cheat | §7.23 | the `attract` suites |
| Multiplayer per the hub README | §7.24 | the harness |
| Narrative tone like the source's | §11.2, §11.9 | — |
| 10-foot, controller first; native keyboard and mouse; hover focuses; glyphs follow the last device; Xbox option | §6 | the `glyphs` and `mouse` suites |
| No dense web-style screens | §6.4, §7.18–7.20 | screenshot review |
| Touch-only: no touch controls, the notice and the settings button, attract runs | §6.5 | the `touch` suite |
| No TODOs, placeholders or stubs | §0, §5.8, §14.7 | the build scan |
| Source information, feedback, exit interview | §16 | the About screen; the JSON parses |

---

## 16. Hand-back (the builder's last steps)

1. **The About & Credits screen** (§7.20) and **the chat reply** both carry, in this order:
   - **Source Information:**
     - Date: 2026-11-03 17:47:52;
     - Source: Killer7 (Grasshopper Manufacture / Capcom, 2005);
     - Plan: `PLAN.md`;
     - Genre and Perspective: as §1;
     - Tech: my-3D2dge v0.85.2 (2D engine with its modules, and its 3D module), three.js r182, Rapier 0.19.3, the AI
       Hub session client 1.4.0, plain JavaScript, Node 24 and Playwright 1.63.0 for tests;
     - Art Direction, Animation, Audio and Online: as §8, §9, §10, §7.24;
     - Testing: what you actually ran;
     - Research: what you actually read;
     - Environment: "Claude Code CLI (headless); Linux; browser unknown" unless you know better;
     - Model: as TASK.md states;
     - Usage: only if you have estimates, otherwise "unknown".
   - **Testing Feedback**, **Engine Feedback** and **Prompt Feedback:** your own answers to each question in TASK.md,
     in order. Write "unknown" for anything you can't confirm. List every `// S7 PATCH:` under "What did you change in
     the engine, and why?".
2. **`exit-interview.json`** beside the HTML, in exactly TASK.md's shape. The `aiHub` block:
   - `name`: "Skiller7";
   - `tagline`: "Seven Killers, One Mountain";
   - `description`: "Seven killers share one body and one snowbound mountain. Ride the rails, stop, scan for the
     laughing invisible Whiteouts and shoot the warm spot.";
   - `type`: "Game"; `genre`: "Shooter"; `source`: "Killer7"; `series`: "" (Killer7 is the source itself);
     `players`: "1–4";
   - `controls`: "Hold W/✕ to move, RMB/L2 aim, LMB/R2 shoot, Space/L1 scan, Q/R1 skill, Tab/L1 switch killer";
   - `tags`: ["3d", "story", "first-person", "third-person", "boss fights", "retro"].
   Check that it parses (`node -e "JSON.parse(require('fs').readFileSync('exit-interview.json','utf8'))"`).
3. Delete nothing outside the dev folder. Stop any server you started, by its PID. Leave `tests/out/` out of the
   shipped HTML (it is dev-only).
