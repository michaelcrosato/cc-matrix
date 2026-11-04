# Eye of the Bolt-Holder

A build plan for a real-time, first-person party dungeon crawler inspired by **Eye of the Beholder** (Westwood Associates / SSI, 1991). It is built on the my-3D2dge engine and ships as one HTML file. It is written for the developers (human or AI) who will build the demo from TASK.md and this file alone.

- **Title.** I brainstormed 50 playful riffs on the source's name and picked one with a real RNG (Python `secrets.randbelow(50)` returned index 5): **Eye of the Bolt-Holder**.
- **File-name forms.** GameTitle = `EyeOfTheBoltHolder`, SOURCE = `EyeOfTheBeholder1991`. Fill these into your TASK.md's bracket pattern, for example `EyeOfTheBoltHolder-EyeOfTheBeholder1991-<model>-<timestamp>`.
- **Pitch.** Hasp, the City of a Thousand Locks, is being locked in from below. Doors bolt themselves, wells cap shut, and a granary will not open for axes. The Council of Keys sends a party of four (later up to six) down through the Drains, the Tumbler Halls of the dead locksmiths' guild, the Gloam Deeps of the eye-cult and, at last, the Eye's Vault. The party moves one cell at a time in real time: it swings each hand as it comes off cooldown, memorizes spells at camp, eats rations, weighs plates with rocks and finds the loose stone. At the bottom it turns three Great Locks to strip the cage from **the Bolt-Holder**, a floating amber Eye held in a cage of seven iron bolts that hurls lightning, gazes joints stiff and rains iron.

---

## 0. Ground rules for the builders

1. **TASK.md wins on deliverables.** Names, folders, the single HTML, the About screen, the reply and `exit-interview.json` follow your TASK.md exactly. This plan says how; §11 has the templates.
2. **Folders.** Your dev folder is the bracket name; the bundled `.html` and `exit-interview.json` go in the root beside TASK.md.
   - Keep every clone, cache and `node_modules` inside your dev folder (in `_ref/` and similar). `/tmp` on this machine is a shared tmpfs and it was full during planning (a `git clone` into it failed with "No space left on device").
   - Read nothing outside your folder that you don't need. Other agents share the machine.
3. **Processes and ports.**
   - Prefer `file://` and headless Node.
   - When you need a server (only the AI Hub harness does), bind `127.0.0.1` on port 0 and read the port it gets. Check that the page is your game before trusting a result.
   - Stop only processes you started, by PID. Never use pkill, killall or `fuser -k`.
4. **Tests.** One command runs every test and prints only failures plus a one-line count (§14). Rerun it only after changing the code it covers. Use screenshots only for what a script can't check. Don't use subagents or workflows to debate, review, judge or audit.
5. **No stubs.** Everything in this plan is required unless it is marked *optional*. If time runs short, cut quantity (fewer side items, smaller side rooms), never a system or a floor. There must be no TODOs, placeholders or dead menu entries.
6. **Engine changes are allowed.** Keep each one small and list it in `PATCHES.md` (what and why). The About screen and the Engine Feedback answers draw on it.

---

## 1. Research summary

### 1.1 The source, and what we keep

**Confirmed facts** (Giant Bomb, MobyGames, oldgames.sk):
- Eye of the Beholder was developed by Westwood Associates and published by SSI in 1991, for MS-DOS and almost at once for the Amiga.
- A party of four created heroes is joined by up to two recruitable NPCs.
- The Lords of Waterdeep send the party into the sewers, and the way out is sealed behind them.
- At the bottom waits the beholder crime lord Xanathar.

**What made it distinctive** (from knowledge of the game, not re-verified), and how this plan uses each part:

| Source trait | How we turn it into our game |
|---|---|
| First person on a grid, 90° turns, everything in real time | Step, turn and strafe one cell at a time. Monsters act on their own clocks, so there are no turns. |
| Party of 4 to 6 in rows; the front two melee; the back rows need reach, missiles or spells | Formation of three rows of two, with reach weapons in row 2 and missiles, thrown weapons and spells from anywhere (§4.6) |
| Every hand is an action; it greys out on cooldown; damage shows on the portraits | Two hand slots on every party card, each with a cooldown wipe and damage pops (§5.2) |
| Vancian magic: mages learn from scrolls into a spellbook and memorize; clerics pray; both at camp | Camp menu with Rest, Memorize, Pray and Scribe (§4.8, §4.9) |
| Paperdoll and backpack; the item held on the cursor is thrown, placed and dropped; food and rations | The party's **Hand** (the held item), throwing, putting down and alcoves; a food meter (§4.5, §4.9) |
| Puzzle vocabulary: pressure plates held down by items, levers, buttons, keys of many shapes, illusory walls, loose-stone switches, teleporters, spinners, pits to the level below, wall niches, inscriptions, dart traps, hidden "special quests" | All of them, wired as data (§4.2). Floors 1 to 3 each have one hidden deed (special quest). |
| Monster groups share a cell; the sidestep "dance" | Cell capacity by size. Attack wind-ups that a step can dodge make sidestepping an intended skill (§4.7). |
| Terse second-person messages, a stately intro, formal NPCs, a few moral choices | Style guide and scripts (§7.2, §7.3), plus Veil's choice on floor 3 |

**What we change:**
- The world and characters are original: no Waterdeep, Forgotten Realms, Xanathar, beholders or AD&D rule text.
- The UI is controller-first for a TV at 10 feet.
- Steps are tweened, and the 3D view fills the screen with dynamic light and shadow.
- Monster attacks are telegraphed.
- Music has combat layers, and voices are babble.
- Hints escalate, so no puzzle can strand the player.

### 1.2 The engine (my-3D2dge v0.85.2)

- **The handoff** (`dist/handoff/`) is the 2D engine. `my-3d2dge.js` is readable and includes every module, among them `grid` (E.Grid, E.Fog), `story` (E.Story) and `rpg`. It also holds the docs (API.md, API-INDEX.md, AI_GUIDE.md, docs/ASSETS.md), the tools (`tools/check.mjs`, `filmstrip.mjs`, `replay.mjs`, `asset-find.mjs`, `asset-sheet.mjs`, `asset-set.mjs`), 22 2D kits and a template game whose `game/test.mjs` shows how to test without a browser.
- **The 3D engine.** The handoff's genre playbook sends "First-person dungeon (Wizardry, Dungeon Master, Eye of the Beholder)" to the 3D engine's `'fixed'` camera and the **3D CRAWLER** kit. That engine is not in the handoff folder but sits in the same repository: `dist/my-3d2dge-3d.js`, v0.85.2, an ES module whose header is its manual. It uses three.js r182 and Rapier 0.19.3. It attaches `E.World3D`, `E.THREE`, `E.TSL` and `E.RAPIER` to the 2D engine, which still runs the loop, the scenes, the input, the menus, the sound and the rigs.
- **The crawler slice** (`src/starter3d/70-crawler.js`, 561 lines) already does most of the core loop:
  - cells of 2×2 tiles with tweened steps, turns, strafes and a bump lurch;
  - a fixed camera at eye height 25;
  - a party of four on cards with `rig.drawPortrait`;
  - gates (`world.thing('door')`, one with an iron lock), a lever `THING`, plates and a dart trap;
  - monsters walked on `E.Grid` paths, an `E.Fog` automap and a bolt projectile;
  - real time via `E.Turns 'atb'`, and a bot.

  Use it as the reference for the camera, the tweens and the things. Restructure the rest: the kit mixes rules with the 3D world, and we separate them (§3.5).
- **Spike run during planning.** I took the repository's `dist/kits/my-3d2dge-3d-crawler.html` and pointed its import map at jsDelivr: `three@0.182.0/build/three.webgpu.min.js`, `three.tsl.min.js` and `@dimforge/rapier3d-simd-compat@0.19.3/rapier.mjs`. These are byte-identical to the vendored copies by SHA-256. Opened from `file://` in headless Chromium 1243 (Playwright 1.63.0) with SwiftShader WebGL 2 (`?backend=webgl#crawler`):
  - it booted with no console errors;
  - `CRAWLER.run(600)` gave the same hash twice (`e3880e33`);
  - `CRAWLER.bot()` won: lever, key, unlock, plate, Warden and stair, all four alive.

  The native look is chunky pixel 3D with brick walls, flagstone floors and live portrait cards. **So the core technical bet works: one HTML file, opened from disk, with the engines inlined and three.js and Rapier from a CDN.**
- **Engine names this plan relies on** (look up details in API-INDEX.md and the 3D header):

  | Area | Names |
  |---|---|
  | Game and scenes | `new E.Game({ canvas, res: 'ps1', expand: true, bg: null, input, menu })`, `game.start({ scenes, scene, boot: { steps } })`, `game.go`, `game.advance(s)`, `game.debug` |
  | Timing and scripts | `game.timeScale`, `game.script` (coroutines), `game.tween`, `game.after` |
  | Input | `game.input` (`pressed`, `down`, `tap`, `hold`, `press(code)`, `clicked()`, `pointer()`, `padAxes`, `lastDevice`, `label(action)`, `glyphs`) |
  | Settings and saves | `game.settings.define`, `game.saves` (3 slots plus autosave), `menu: { items, settings, saves }` |
  | Sound | `game.audio` (`define`, `sfx`, `music`, `layer`, `sting`, `duck`, `ctx`) |
  | Text, UI and rigs | `E.Dialog` (`talk.shown`, `talk.voice`), `E.Story`, `E.Menu`, `E.ui.box/bar`, `E.font.text/title`, `E.Humanoid` / `E.Blob` with `rig.drawPortrait`, `E.MOVES` |
  | Grid module | `E.Grid` (`path`), `E.Fog` |
  | 3D world | `new E.World3D(game, { level, … })`, `world.thing(kind, …)`, `E.World3D.THINGS.<kind>` (pen-drawn things), `world.mob`, `world.pen`, `world.glow`, `world.light`, `world.arc`, `world.project`, `world.camera` (`'fixed'`), `overlay: { fov }` plus `world.overlay.pen` (first-person hands), `world.prepare()`, `world.dispose()` |
  | 3D settings | `E.World3D.SETTINGS` (cards or puppets, picture resolution, shadows, filter) |

### 1.3 AI Hub (Session Protocol v1, client 1.4.0)

- **Modes.** `parallel`, `ghost` (each copy runs its own round and shows the others' characters when they are in the same area) and `shared-world`.
- **The client.** `session.js` is pasted unmodified as the first script in `<head>`, right after `<meta charset>`. In a session it seeds `Math.random`, gives the page its own in-memory storage and hands fullscreen to the hub.
- **Tags.** `hub:session`, `hub:session-players`, `hub:session-mode`, `hub:session-goal` (at most 60 characters), `hub:session-howto` (at most 80) and `hub:session-minutes`.
- **The flow.** `AIHub.connect({ mode, seats, card? })` returns `info`, or `null` when there is no hub (then the game plays on its own). `AIHub.ready()` is called once, with no key press. The round starts on `start`, and play begins when `AIHub.time() >= 0`.
- **Reporting.**
  - `progress({ score, label })` is taken about once a second.
  - `result({ time | score })` is sent once.
  - On `time-up` the game reports within `graceMs`.
  - On `end` input and sound stop.
- **Messages.** `send(data, { reliable })` takes JSON of at most 16 KB, at most 20 a second.
- **Rules.**
  - The network goes only through the hub.
  - There are no dialogs or popups, and no quitting or returning to the title in a session.
  - Names come from the hub and never become HTML.
  - Options is ignored while Create is held.
- **The test.** The harness (`harness.html` plus `bridge.js` and `round.js`, served beside the game) passes the game when `window.__hubCheck.pass` is true. Run it with `?game=GAME.html&players=2&auto=1`, then with `players=4&latency=150&jitter=50&loss=5&auto=1` and `&scenario=host-leave`.

---

## 2. The game at a glance

- **Genre.** A real-time, first-person, grid-based party RPG dungeon crawler (a "blobber") with lock-and-key puzzles.
- **Perspective.**
  - First person at the party's eyes on a 4-way grid, with tweened steps and quarter turns.
  - A top-down parchment automap screen.
  - Full-screen overlay screens (party, camp, map), drawn over the dimmed 3D view.
- **Pillars.**
  1. *Every cell is a decision.* Step, turn and sidestep in real time.
  2. *Every hand is a weapon.* Per-hand cooldowns and formation rows.
  3. *Every lock has a key, and some keys are rocks.* Physical puzzles built from a small, consistent vocabulary.
  4. *A party you care about.* Live portraits, hunger, levels, deaths and NPCs with voices.
- **Length.** Four floors plus a race floor, about 50 to 75 minutes for a first play of the campaign. Every system appears by the end of floor 2, and floors 3 and 4 deepen them.
- **Modes.**
  - Campaign: New Game, Continue and Load.
  - **Rat Run**: a solo time trial against your best-run ghost.
  - **AI Hub ghost race** (the Rat Run, 1 to 4 players).
  - Attract demo.
- **The player can:**
  - move, strafe and turn;
  - fight with any hand, fire crossbows and bows, throw anything, and cast 9 arcane spells and 9 prayers;
  - read and scribe scrolls, zap wands;
  - equip 10 body slots and a 12-slot backpack per member;
  - pick up, put down, throw and place items in alcoves;
  - open doors, pull levers, press buttons and loose stones, weigh plates, insert keys and wards, and pick locks or disarm traps (thieves);
  - cross pits (Feather Step), see secrets (Find Seams, goggles), rest, eat, memorize and pray;
  - level up, raise the dead, recruit and dismiss NPCs, make one moral choice, and save and load anywhere out of combat.
- **The player cannot:** jump, look freely (the view is grid-locked), walk diagonally, buy things (there are no shops or gold), or cross pits without the spell.

---

## 3. Architecture

### 3.1 Stack (pinned)

| Piece | Version | Where from | Used for |
|---|---|---|---|
| my-3D2dge 2D engine (full, readable) | v0.85.2 | repo `dist/handoff/my-3d2dge.js` | the loop of exact 1/120 s steps, scenes, input with rebinding and glyphs, pause menu, settings, saves, chip synth and music, rigs and moves, font, UI, Menu, Dialog, `grid` and `story` modules |
| my-3D2dge 3D engine | v0.85.2 | repo `dist/my-3d2dge-3d.js` (ES module) | `E.World3D`: level from text, things, mobs drawn as cards, pen, lights, fog, 3D particles, fixed camera, overlay pen |
| three.js | r182 (npm 0.182.0) | `https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.min.js` and `three.tsl.min.js` (the core loads relative to them) | the renderer: WebGPU, falling back to WebGL 2 |
| Rapier | 0.19.3 | `https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-simd-compat@0.19.3/rapier.mjs` (wasm inlined) | the 3D engine's physics, used for mobs only |
| AI Hub session client | 1.4.0 | `https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/session.js` | sessions (pasted unmodified) |
| Playwright | 1.63.0 | npm (Chromium 1243 is already installed here, in `~/.cache/ms-playwright`) | browser tests, the hub harness |
| Node | 24 | local | build and tests |

The game itself is plain JavaScript with no other libraries.

### 3.2 Fetching (tested during planning; about 12 MB)

```sh
cd <dev folder>
git clone --depth 1 --filter=blob:none --sparse https://github.com/michaelcrosato/my-3d2dge.git _ref/engine-src
git -C _ref/engine-src sparse-checkout set --no-cone /dist/handoff/ /dist/my-3d2dge-3d.js /src/starter3d/ /vendor/ /docs/ENGINE-3D.md
mkdir -p hub && for f in README.md session.js harness.html bridge.js round.js; do
  curl -fsS -o hub/$f https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/$f; done
npm init -y >/dev/null && npm i -D playwright@1.63.0
```

- The planning spike used commit `4390a98` (2026-11-03); its `my-3d2dge.js` header reads v0.85.2. If HEAD has moved, check that both engine files still say v0.85.2. If they don't, pin that commit with `git fetch --depth 1 origin 4390a9852fe0ad01e1699a160f2a331931bb1a72`, then check it out.
- Copy `dist/handoff/my-3d2dge.js` to `engine/my-3d2dge.js` and `dist/my-3d2dge-3d.js` to `engine/my-3d2dge-3d.js`; these are the copies you patch.
- `_ref/` is reference only: read the handoff docs, the kits, `src/starter3d/00-shell.js` and `70-crawler.js` there.

### 3.3 Folder layout

```
<root>/                                   TASK.md, STAGE.md, PLAN.md (given)
  EyeOfTheBoltHolder-EyeOfTheBeholder1991-<model>-<stamp>.html     the deliverable (built)
  exit-interview.json
  EyeOfTheBoltHolder-EyeOfTheBeholder1991-<model>-<stamp>/         the dev folder
    README.md            how to build, test and play
    PATCHES.md           every engine change and why
    CONTENT.md           the content formats for designers (maps, legends, wiring, text)
    package.json         { "type": "module" }, playwright 1.63.0
    engine/              my-3d2dge.js (2D, patched), my-3d2dge-3d.js (3D, patched)
    hub/                 session.js (unmodified), harness.html, bridge.js, round.js, README.md
    src/                 the game; the files are concatenated in this order (see ORDER in tools/build.mjs)
      00-core.js         namespace B, constants, rng, events, tuning B.T (defaults and ranges)
      01-util.js         dice, grid helpers, direction maths, text helpers
      10-data-items.js  11-data-monsters.js  12-data-spells.js  13-data-classes.js
      14-data-text.js    every player-facing string: messages, inscriptions, descriptions, dialogue
      15-data-floors.js  four floors and the race floor: maps, features, wiring, items, monsters, events, walkthroughs
      16-data-music.js   songs, stings, sfx voices, voice profiles
      20-sim-state.js    new game, serialize and deserialize, hash
      21-sim-map.js      floor runtime, cell queries, E.Grid and E.Fog
      22-sim-wiring.js   triggers and actions
      23-sim-party.js    movement, formation, hunger, light
      24-sim-items.js    inventory, equipment, Hand, use, throw, put down
      25-sim-combat.js   hands, to-hit, damage, rows, projectiles, statuses
      26-sim-monsters.js AI, movement, attacks, telegraphs, drops
      27-sim-magic.js    slots, memorize, cast, spell effects
      28-sim-camp.js     rest, interruptions, eating
      29-sim-progress.js XP, levels, special quests, death and raising, NPC join and leave
      30-sim-boss.js     the Bolt-Holder's phases and attacks
      31-sim.js          B.Sim: update(dt, commands) -> events; the commands' dispatcher
      40-view3d.js       Presenter: builds a World3D per floor, mirrors state, consumes events
      41-view-things.js  THINGS: wall features, doors, floor items, decor
      42-view-creatures.js  creature recipes (cards and pen-drawn bodies), animation from state
      43-view-fx.js      spells, hits, telegraphs, first-person weapon overlay
      44-view-null.js    NullView for Node and tests
      50-audio.js        sfx, music director (layers), babble voice synth
      60-input.js        action map (pad, keys, mouse), Controls -> commands, idle detection
      61-ui-kit.js       panel, focus system, glyph badges, prompts, layout helpers
      62-ui-hud.js       party bar, log, compass, Hand, prompts, boss bar, race HUD
      63-ui-party.js     paperdoll, backpack, details, sheet
      64-ui-magic.js     cast menu, targeting
      65-ui-camp.js      camp, rest, memorize, pray, scribe, formation, eat
      66-ui-map.js       automap, journal, reader (notes)
      67-ui-dialog.js    E.Story and E.Dialog glue, choices, babble hookup
      68-ui-shell.js     title, creation, about and credits, game over, ending, touch notice, floor cards
      70-dev.js          Dev Mode
      71-attract.js      attract director and vignettes
      72-bot.js          walkthrough runner (tests, attract, dev auto-play)
      73-hub.js          AI Hub session, ghosts, race
      80-cutscenes.js    intro and ending stages and scripts
      90-main.js         E.Game, boot steps, scenes, game.debug
    tools/build.mjs      bundles the single HTML
    tests/run.mjs        the one command; tests/*.test.mjs suites; tests/browser/*.mjs
    shots/               screenshots for review (not tests)
    _ref/                clones (not shipped)
```

### 3.4 The build: one HTML file

`node tools/build.mjs` concatenates `src/` in ORDER into one IIFE and writes the root `.html` in this order:

```html
<!doctype html><html lang="en"><head><meta charset="utf-8">
<script>/* hub/session.js, byte for byte (the build checks its SHA-256 against hub/session.js) */</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Eye of the Bolt-Holder</title>
<meta name="description" content="…">  <meta name="hub:type" content="Game">  <meta name="hub:players" content="1-4">
<meta name="hub:session" content="1">  <meta name="hub:session-players" content="1-4">  <meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="4">
<meta name="hub:session-goal" content="Fastest party out of the Rat Run wins">
<meta name="hub:session-howto" content="Move WASD/stick · Turn Q E/d-pad · Use F/✕ · Strike Space/□">
<script>window.__hubInfo = (window.AIHub && AIHub.active) ? AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true }) : null;</script>
<script type="importmap">{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.min.js",
  "three/webgpu": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.webgpu.min.js",
  "three/tsl": "https://cdn.jsdelivr.net/npm/three@0.182.0/build/three.tsl.min.js",
  "@dimforge/rapier3d-simd-compat": "https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-simd-compat@0.19.3/rapier.mjs" } }</script>
<style>/* as the 3D template: #stage, #view under #screen; black; no selection */</style></head><body>
<div id="e3-boot">EYE OF THE BOLT-HOLDER · Starting…</div>
<div id="stage"><canvas id="view"></canvas><canvas id="screen"></canvas></div>
<script>/* engine/my-3d2dge.js (classic) */</script>
<script type="module">/* engine/my-3d2dge-3d.js (module) */</script>
<script type="module">/* the game: src/ concatenated, no import/export */</script>
</body></html>
```

- Module scripts run in document order after the 3D engine's imports resolve, so the game sees `E.World3D`; this is the template's own ordering and the spike proved it.
- If `E.World3D` is missing (the CDN was unreachable), the game draws a boot error: "The 3D libraries could not load. Check the connection and reload." It never shows a blank screen.
- Write the game code with no `import` or `export`, so Node's `vm` can run the same files as a script.
- The build prints the file's size, the session client's checksum, and a lint warning if a `src/` file in the sim layer mentions `world`, `World3D`, `document` or `audio`.

### 3.5 Runtime layers

```
 pad / keys / mouse ─► Controls (60-input) ─┐
 bot (tests, attract, dev) ─────────────────┼─► commands ─► SIM (20–31: pure, deterministic, JSON state) ─► events
 hub ghost messages ─► ghosts (view only)   │                    ▲                                         │
 UI screens (61–68) ─ read state, send ─────┘                    │                                         ▼
                                                     B.T tuning (Dev sliders)        Presenter (40–44) · Audio (50) · HUD feedback
```

- **Sim.** It owns all state (`B.S`), advances on `sim.update(dt, cmds)` in each fixed step using the scaled `dt`, and pushes events (`B.S.events`, cleared each step). It never touches `world`, the DOM, audio or `Math.random`; all randomness comes from `B.rng(stream)`. It runs the same in Node.
- **Presenter.** It builds one `E.World3D` per floor and mirrors the sim every frame:
  - It draws the camera pose from the party tween, doors from their open values, items, monsters' positions and animations, and lights.
  - It turns events into one-shot effects: sparks, damage numbers, shakes, flashes.
  - It never writes sim state.
  - In Node it is `NullView`.
- **UI.** Drawn on the 2D overlay (`r.overlay`, `E.ui`, `E.font`) over the clear canvas (`bg: null`).
  - It changes the game only through commands.
  - It animates on unscaled real time, so it stays snappy while the world is slowed.
- **Audio.** Driven by events (sfx), by state (music layers) and by dialogue (babble).
- **Commands** are plain JSON objects, so the bot, the attract mode, the tests and the hub race all drive the game the same way:

  | Family | Commands |
  |---|---|
  | Movement | `{ c: 'move', d: 'f'\|'b'\|'l'\|'r' }`, `{ c: 'turn', s: -1\|1 }` |
  | World | `{ c: 'use' }`, `{ c: 'putDown' }`, `{ c: 'throw' }`, `{ c: 'examine' }` |
  | Combat | `{ c: 'strike' }`, `{ c: 'hand', m, h: 'main'\|'off' }`, `{ c: 'cast', m, spell, target }` |
  | Inventory | `{ c: 'inv', op: 'take'\|'place'\|'swap'\|'use'\|'drop', ref }` |
  | Camp | `{ c: 'camp', op: 'rest'\|'stopRest'\|'memorize'\|'forget'\|'scribe'\|'eat'\|'swapRows', … }` |
  | Party | `{ c: 'select', m }`, `{ c: 'dismiss', m }` |

### 3.6 State (also the save format; version 1)

```js
S = { v: 1, seed, rng: { combat, ai, loot, world },   // 32-bit states of a small PRNG (mulberry32), one per stream
  time, playTime, floor: 'f1', diff: 'normal',
  party: { cx, cy, dir, tween: { from:[x,y,yaw], t, dur, kind } | null, queued: cmd|null, hand: itemRef|null, selected: 0,
           members: [ member×≤6 ], formation: [i0..i5], light: 1, floating: 0, seeing: 0, steady: 0, freeHinge: 0 },
  member = { id, name, race, cls, look, lvl, xp, hp, max, food, stats: { str, dex, con, int, wis }, state: 'ok'|'down'|'dead',
             status: { poison, held, … (seconds left) }, slots: { head, neck, body, arms, main, off, ring1, ring2, feet, quiver },
             pack: [12], book: [spellIds], prep: { 1: [ids], 2: [...], 3: [...] }, slotsUsed: {1, 2, 3}, cool: { main, off },
             ward: 0, layOnHands: 1, npc: null|'tamsin'|'durgan'|'veil', voice },
  floors: { f1: { doors: { id: { open, locked } }, plates: { id: down }, levers: { id: on }, items: { 'x,y': [itemRef] },
                  alcoves: { id: [itemRef] }, monsters: [ mon ], fog: '<base64 bitset>', flags: {}, wanderers, visited }, … },
  mon = { id, type, cx, cy, slot, hp, max, state, timer, wind, aware, status: {}, dir, drop },
  itemRef = { id, n?, charges?, rust?, uid },
  flags: {}, story: E.Story state, quests: [...], special: { sq1, sq2, sq3 }, notes: [ids], log: [last 100],
  stats: { kills, secrets, deaths, potions, rests, steps } }
```

- **Saves.** `game.saves.write = () => ({ data: S, place: floorName, level: party's top level })`; `read` rebuilds the sim, then the presenter. The save version is migrated through `menu.saves.migrate`.
- **Determinism.** `B.hash(S)` is a 32-bit FNV of a stable JSON of the state without `events`. The same seed and the same command script must give the same hash (§14).

### 3.7 Scenes and flow

| Scene | What it is |
|---|---|
| `boot` | the engine boot screen: `W3.init`, building the title stage, the worlds of floors 1–4 and the race, `prepare()`. In a hub session only the race world is built. |
| `title` | the menu; the attract mode starts after 10 s idle |
| `attract` | the demo vignettes |
| `create` | the party of four |
| `cutscene` | the intro and the ending stages |
| `play` | the dungeon, with overlays: party, cast, camp, map, journal, reader, dialogue, dev |
| `floorcard` | the fade on stairs and the floor's name |
| `over` | game over |
| `ending` | the end, stats and credits |
| `about` | About and Credits |
| `race` | the Rat Run, solo or in a hub session |
| `hubcard` | the session's own card |

- Overlays are states of `play`, not scenes, so the 3D view keeps drawing behind them.
- While a party, cast or camp overlay is open, `game.timeScale` is set by the Settings → *Time in menus* option: 0 (pause), 0.25 (slow, the default) or 1 (real time).
- Dialogue always pauses the world. The engine's pause menu (Options or Esc) pauses fully.

### 3.8 Units and conventions

- **Cells.** A cell is 32 world units (2 m) and is written (cx, cy); its centre is (cx·32+16, cy·32+16). The level text has 2×2 tiles per cell, as the kit has.
- **Directions.** Direction `dir` is 0 for N, 1 for E, 2 for S and 3 for W; `DX = [0, 1, 0, -1]`, `DY = [-1, 0, 1, 0]`; yaw = −π/2 + dir·π/2.
- **Heights.** The eye is at z 25 and the camera sits 4 units behind the cell centre (as in the kit). Walls are 48 tall, and the ceiling is a slab at z 50 drawn by the pen.
- **Wall features** are addressed by **the open cell you stand in and the way you face**: `(x, y, 'N')` means the feature on the wall north of (x, y). The thing is drawn on that wall's face, half a cell from the centre.
- **Monster slots in a cell.** Four quadrants (NW, NE, SW, SE) for small monsters, two halves for medium ones and the centre for large ones, drawn 8 units from the centre.

### 3.9 Engine changes to make (log them in PATCHES.md)

1. **Button symbols.** Default to `'playstation'`, offer only PlayStation and Xbox, and label the setting "Button symbols". Patch the `glyphs` entry in the 2D engine's standard settings.
2. **Pause items.** Make `menu.items` accept a function, so a session hides Dev Mode, Load and Quit. Check `v()` in the pause builder first; patch it if it doesn't call functions.
3. **Audio.**
   - Add a public `audio.bus(name)` returning the `sfx`, `music` or new `voice` gain node.
   - Add a "Voices" volume setting.
   - Add `sfx(name, { pan })` through a StereoPannerNode, used for flank and rear hits and for monster sounds by bearing.
4. **Beards.** Add `beard: 'full' | 'braided' | null` to `E.Humanoid`, drawn in the hair colour over the jaw in `draw` and `drawPortrait`. Dwarves need beards.
5. **Touch.** Make sure `input.touchEnabled = false` hides every touch button and the touch stick while keeping the top-right menu button (§5.7).
6. Anything else you need, kept small. For example, if `world.box` with a side style does not match the level's walls, a `world.wallBlock(cx, cy, …)` helper (§13, risk 3).

---

## 4. Systems and mechanics

All the numbers below are defaults in `B.T` (tuning). The **★ ones are Dev Mode sliders** (§8). Difficulty multiplies on top: Easy has monster damage ×0.7, monster HP ×0.8 and hunger ×0.5; Hard has monster damage ×1.3, monster HP ×1.25 and rest interruptions ×2.

### 4.1 Movement and the grid

- **The commands.**
  - Forward, back, strafe left and strafe right move one cell.
  - Turning left or right takes a quarter turn.
  - **One move is buffered** while a tween runs (the last one pressed), and a held direction repeats as soon as the tween ends.
- **Durations.** A step takes ★0.28 s and a turn ★0.20 s, eased smoothstep (the kit's `place()`). Settings → *Step animation* offers Smooth (those values), Quick (0.16 s / 0.12 s) or Instant (0 s / 0 s, as the source did).
- **When things happen.** The party's logical cell changes when the step **starts**, so targeting and monster adjacency use the new cell at once. Arrival effects happen when the step **ends**: plates, pits, teleporters, spinners, trap plates, item messages and auto-hints.
- **Blocked moves.** A wall, a closed door, gate or secret wall, a monster, or the boss blocks a move. The view lurches forward and back (the kit's `bump`), a thud plays, and a message shows at most once every 2 s:
  - "You can't go that way."
  - "The gate will not budge."
  - "Something blocks the way!" (a monster)
  - "It is locked." (a locked door)
- **Head bob.** A 0.8-unit dip on each step. It is off under *reduce motion*.
- **Stairs.** Entering a stair cell fades out over 0.4 s, shows the floor card (the floor's name in the title font and one line of flavour, 1.6 s, skippable with any button), fades in at the paired arrival cell and autosaves.
  - Floor 1's up-stair is sealed: "The grate above is bolted fast. There is no way back."

### 4.2 Dungeon features and the wiring language

Every feature is data in `15-data-floors.js` (§7.4). Each wall feature is a `THING` drawn on the wall face (§6.2).

| Feature | Map / table | Behaviour | Interaction (✕ / F / click) |
|---|---|---|---|
| Wooden door `+` | map | swings on hinges; monsters can't pass a closed one | ✕ facing it: open or close |
| Gate (portcullis) `=` | map + wiring | rises and falls (0.9 s); passable when open > 0.85 | none; the wiring opens it |
| Locked door `L` / `K` | map + `lock: keyId, kind: 'simple'\|'warded'` | opens with its key; the key is used up ("The Iron Key turns. The door opens.") | ✕ with the key in the Hand or anywhere in a pack (it picks the right one); a thief can pick a *simple* lock |
| Magic seal `M` | map | a door of runes; opens to the Unlatch spell, scroll or wand | cast Unlatch while facing it |
| Secret wall `H` | map + wiring | looks exactly like a wall; slides into the floor (1.2 s, grinding) when wired | none; a loose stone, a catch or an event opens it |
| Illusory wall `I` | map | looks exactly like a wall; walks like floor; passing through plays a 0.15 s dissolve flash and "The wall is an illusion!" | walk into it |
| Pressure plate `P` | map + wiring | down while the party, any item or a medium or large monster is on it. Modes: `hold` (open while down), `latch` (stays done once triggered), `toggle` | stand on it, put an item down on it, throw an item onto it |
| Dart trap `T` | map | on entry fires darts at 2 members for ★1d4 each ("Darts fly from the walls!") | a thief sees it glint; a thief facing it with ✕ disarms it (DEX check: 50% + 10% × DEX bonus + 5% × level; a failure fires it) |
| Open pit `O` | map | entering it drops the party to the floor below at the pit's landing cell: 1d6 to each member, a camera drop and a fade. Feather Step floats over it. Items put into it fall to the landing. | none; wiring can bridge it |
| Trapdoor `o` | map | looks like floor (a thief or Find Seams shows thin seams); on entry it opens and falls as a pit, then stays an open pit | none |
| Teleporter `^` | map + `to: [x, y, dir], silent, on` | moves the party instantly. A *silent* one has no effect (the source's trick); a visible one swirls and whooshes. Wiring can switch it off. | walk in |
| Spinner `S` | map | sets a random facing on entry (from the `world` RNG stream) with a soft grinding sound ("You feel a twisting underfoot."). Only the compass gives it away. | walk in |
| Stairs `<` `>` | map + `to: floor, at: [x, y, dir]` | change floors | walk in |
| Lever | wall feature | toggles up and down (clank); fires its wire on each change | ✕ facing it |
| Button | wall feature | momentary press (click); fires its wire | ✕ facing it |
| Loose stone / catch | wall feature | a subtle, visible odd stone or brass rivet (not invisible); glints under Find Seams or the goggles; fires its wire once | ✕ facing it |
| Alcove | wall feature + `holds: [items], accepts: filter` | a niche that shows its items | ✕: take the top item into the Hand, or place the held item |
| Keyhole | part of a door or a wall feature | takes keys of its shape | ✕ with the key |
| Inscription | wall feature + `text` | a carved plaque; the text goes to the log and to Journal → Notes | ✕ or Examine facing it |
| Candle sconce | wall feature | lit or unlit; a light; part of a sequence wire | ✕ facing it: light it |
| Great Lock | wall feature (floor 4) | turns over 2.0 s; boss mechanic (§4.7.4) | ✕ facing it |
| Brazier niche | wall feature `torch` | decor light, from the level's `t` tile (the kit's NICHE trick) | none |
| Safe room | cell list | no rest interruptions there | none |

**The wiring language** (data, designer-facing). `wires: [{ when, mode, do, fail, once }]`.

- **Triggers (`when`):**
  - `{ lever: id }`, `{ button: id }`, `{ catch: id }`
  - `{ plate: id }` and `{ plates: [ids], all: true }`
  - `{ buttons: [ids], within: s }` (all pressed within s seconds)
  - `{ enter: [x, y], from?: dir }`, `{ leave: [x, y] }`
  - `{ alcove: id, accepts: 'kind:key' | itemId }`
  - `{ killed: [monster ids] }` or `{ group: name }`
  - `{ flag: name }`
  - `{ sequence: [feature ids], order: true }` (wrong order: `fail`)
  - `{ timer: s }` after another wire
  - `{ loops: n, at: [x, y] }` (the teleporter hint)
- **Actions (`do` / `fail`):**
  - doors: `['open'|'close'|'toggle', doorId]`
  - pits: `['bridge', pitId]`, `['pitOpen', id]`
  - teleporters: `['teleporter', id, on]`
  - moving the party or items: `['teleport', [x, y, dir]]`, `['spin']`
  - text: `['msg', textId]`, `['hint', textId]`, `['story', nodeId]`, `['cutscene', id]`
  - things in the world: `['give', itemId, [x, y] | alcoveId]`, `['spawn', type, [x, y], n]`
  - progress: `['xp', n]`, `['flag', name, value]`, `['quest', id, state]`, `['special', id]`
  - feedback: `['sfx', name]`, `['music', cue]`, `['shake', n]`, `['light', id, on]`
  - other: `['return']` (an alcove gives its item back), `['reset', ids]`
- **Lint.** The content lint (§14) checks every id and every coordinate.
- **Hints escalate.** When `Hints` is on, each puzzle carries `hints: [[seconds or loops, textId], …]`, shown when the player lingers or loops. No puzzle can softlock:
  - a spare rock sits in every plate room;
  - the riddle returns its key;
  - the Bent Key is placed at the riddle;
  - the Wand of Unlatching is placed before the magic seal;
  - the pits' landing has a ladder back up.

### 4.3 The party: races, classes, stats, formation

- **Stats.** STR, DEX, CON, INT and WIS each run from 3 to 18. The modifier is −2 (3–5), −1 (6–8), 0 (9–12), +1 (13–15), +2 (16–17) or +3 (18).
  - STR: melee and thrown to-hit and damage.
  - DEX: missile to-hit, Defense and cooldown (−4% per point of modifier).
  - CON: HP per level, poison resistance.
  - INT: mage slots (+1 level-1 slot at 16+).
  - WIS: cleric slots (+1 level-1 slot at 15+, +1 level-2 slot at 17+).

| Race | Mods | Classes | Trait |
|---|---|---|---|
| Human | — | all six | gains 5% more XP |
| Dwarf | +1 CON, −1 DEX | Fighter, Cleric, Thief | resists poison 50%; has a beard |
| Elf | +1 DEX, −1 CON | Fighter, Ranger, Mage, Thief | resists Hold 50% |
| Halfling | +1 DEX, −1 STR | Fighter, Cleric, Thief | +1 to-hit with slings, darts and thrown weapons |

| Class | HP die | To-hit bonus | Armour | Weapons | Abilities | XP × |
|---|---|---|---|---|---|---|
| Fighter | d10 | +level | all, shields | all | +1 to-hit at every level | 1.0 |
| Paladin | d10 | +level | all, shields | all | Lay on Hands: heal 2×level once per rest; Mend ×1 from level 3 | 1.2 |
| Ranger | d8 | +level | up to chain, no shield | all | two weapons with no penalty; +1 to-hit with bows and crossbows; *Tracking* (the automap shows monsters within 4 cells) | 1.15 |
| Cleric | d8 | +¾ level | up to scale, shields | blunt only: mace, flail, warhammer, staff, sling | prayers; Turn the Dead | 0.95 |
| Mage | d4 | +½ level | robes only | dagger, staff, darts, sling | spells; reads scrolls | 1.1 |
| Thief | d6 | +¾ level | leather and studded, buckler | light weapons, short bow, crossbows, darts, sling | picks simple locks (needs Lockpicks); sees and disarms traps and trapdoors; backstab ×2 damage on sleeping, held or unaware monsters | 0.9 |

- **Off-hand weapons** take −2 to-hit, except for Rangers. **Hit points:** level 1 gets the full die plus the CON modifier; each later level gets half the die plus 1 plus the CON modifier, at least 1.
- **Formation.** Six places in three rows of two: front 1–2, middle 3–4, back 5–6. With four members, rows 1 and 2 are filled. Members are swapped in Camp → Formation, or with ✕ on two portraits in the Party screen.
  - **Row 1** melees.
  - **Row 2** melees only with *reach* weapons (spear, glaive).
  - **Row 3** uses missiles, thrown weapons and spells only.

### 4.4 Character creation (`create` scene)

- **The roster.** A 2×2 roster of slots, each showing **Create** or **Premade**, plus **Quick Start**, which fills all four with the premade party (§7.9).
- **Editor steps.** Each step is one big panel with ✕ to go on and ○ to go back:
  1. **Race:** 4 tiles.
  2. **Class:** the allowed ones.
  3. **Look:** ◀ ▶ through 6 presets for each race and sex. Each preset is an `E.Humanoid` option set (hair, skin, palette, hat, beard), drawn as a large live portrait.
  4. **Stats:** 4d6 drop lowest, then race modifiers, re-rolled until the class minimums are met (Fighter STR 9, Paladin STR 12 and WIS 13, Ranger STR 13 and DEX 13, Cleric WIS 9, Mage INT 9, Thief DEX 9). □ re-rolls without limit; ✕ keeps.
  5. **Name:** a list of 12 suggestions for the race; △ picks a random one; □ opens the on-screen keyboard, a 10×4 letter grid (✕ types, □ deletes, R1 for case, Options when done). Physical keys type directly.
- **Starting gear by class.**
  - Fighter: long sword, wooden shield, leather armour.
  - Paladin: long sword, wooden shield, chain shirt.
  - Ranger: two short swords, leather armour.
  - Cleric: mace, Key of the Threshold (holy symbol), leather armour.
  - Mage: dagger and spellbook (Spark Dart, Find Seams, Slumber), plus a Traveller's Robe.
  - Thief: short sword, darts ×6, leather armour, Lockpicks.
  - Everyone gets 1 Ration and starts at food 100%.
- **Begin the Descent** starts the intro cutscene.

### 4.5 Items, inventory, equipment and the Hand

- **Slots for each member.** `head, neck, body, arms` (bracers), `main, off` (hands), `ring1, ring2, feet, quiver`, plus a **backpack of 12**.
  - Two-handed items fill main and lock off.
  - Ammo (bolts, arrows, sling stones) and darts stack up to 30; nothing else stacks.
  - There is no weight.
- **The Hand.** The party holds one item at a time, as the source held one on the mouse cursor. With the mouse it follows the cursor; otherwise it sits above the cards, bottom centre, with its name.
  - **Use ✕** with an item in the Hand:
    - facing an alcove, it places the item;
    - facing a keyhole with a fitting key, it inserts it;
    - with no target, it stows the item in the first free pack slot (the selected member first).
  - **Hold ✕ for 0.4 s** (**H** on the keyboard) puts it down on the front cell's floor, or on your own cell if the front is blocked. Putting it down on a plate presses the plate; putting it into a pit drops it to the landing.
  - **Throw ○** (**G**) sends it forward up to ★4 cells (+1 at STR 16+).
    - It passes over pits and plates.
    - It stops before walls and closed doors and lands in the last open cell, pressing a plate if it lands on one.
    - It stops at the first monster and hits it: thrown weapons do their dice plus STR; other items do 1d2. It then drops in that cell.
- **Picking up.** Picking up (✕ with nothing in the Hand) takes the top item in the front cell if it is open and free of monsters, otherwise in your own cell. Floor items show at the 4 quadrant spots; a fifth item and more show as a little pile.
- **Use** (□ in the Party screen):
  - eat a ration, drink a potion;
  - read a scroll (a mage casts it at once, or uses Scribe at camp to learn it);
  - read a note;
  - zap a wand (as a hand action when it is held).
- **Monster drops.** Each monster has a drop table rolled on the `loot` stream (§7.6). Named monsters have fixed drops. Thieving Latchkins drop what they stole.
- **Rust.** A Rustling's hit can rust a metal main-hand weapon (−2 damage, up to −4, shown as "Rusted"). It is permanent; spare weapons are placed.

### 4.6 Combat (real time)

- **Every hand is an action.** Using a hand does what its item does:

  | Item in the hand | What using it does |
  |---|---|
  | weapon | attacks the front cell, if the member's row may reach it |
  | missile weapon | fires ammo from the quiver along the facing line, up to 6 cells |
  | thrown weapon (dagger, darts, hand axe, spear) | throws it |
  | spellbook or holy symbol | opens the cast menu |
  | wand | zaps |
  | shield | **Brace**: +3 Defense for 2 s |
  | nothing | punches (1d2) |

  Using a hand starts its cooldown: the weapon's speed (§7.7) × ★attack cooldown × (1 − 0.04 × DEX modifier). Casting a spell puts **both** of the caster's hands on 2.5 s.
- **Party Strike** (□, Space, right-click in the view). Every member whose main hand is ready, and whose main-hand item can act from their row, acts at once:
  - the front row melees;
  - row 2 attacks with reach weapons;
  - anyone holding a missile or thrown weapon fires it.

  Spellbooks and holy symbols are skipped, because a spell needs a choice. With nothing in front, the front row "swings at the air."
- **To-hit.** d20 + to-hit bonus (class) + STR modifier (melee and thrown) or DEX modifier (missile) + weapon bonus + ★party to-hit + buffs ≥ the target's Defense.
  - A natural 20 always hits for double dice; a natural 1 always misses.
  - Damage is the weapon's dice + STR modifier (1.5× for two-handed weapons), × ★party damage, at least 1.
  - A miss shows MISS on the hand slot.
- **Party Defense.** 10 + armour + shield + DEX modifier + helm, bracers and rings + buffs.
- **Monster attacks.** A monster's attack roll is d20 + its attack bonus ≥ the member's Defense; its damage is its dice × ★monster damage.
- **Who gets hit.** It depends on where the attacker stands relative to the party's facing:
  - from the front: a random conscious member of the front-most occupied row;
  - from the left: the left column (places 1, 3, 5), front-most first;
  - from the right: the right column (2, 4, 6);
  - from behind: the back-most occupied row.

  The HUD shows red chevrons on the edge the hit came from (§5.2), and the hit sound is panned.
- **Projectiles** (bolts, arrows, darts, thrown items, Spark Darts, Locking Bolts) move cell by cell at their own speed (8 cells/s for missiles, 6 for Spark Dart, 5 for monster bolts) and hit the first creature in their path.
  - A monster bolt reaching the party's cell hits the party, through the side it came from.
  - A party projectile hits the monster in the target cell's slot nearest the shooter's column.
  - Spent ammo drops in the cell where it stopped, with a 50% chance to be recovered.
- **Statuses** (seconds left, in `member.status` and `mon.status`):

  | Status | Effect |
  |---|---|
  | Poisoned | 1 HP every 6 s for 60 s, or until Purge or an Antidote |
  | Held | can't act for 4 to 10 s; Free Hinge or the Lidless Ward prevents it |
  | Asleep (monsters) | wakes when damaged; takes ×2 damage |
  | Slowed | intervals ×1.5 |
  | Blessed / Steady | +1 to-hit and +1 to saves |
  | Warded | an absorb pool |
  | Floating | over pits; no plates |
  | Seeing | secrets glint |
  | Turned | undead flee |

  A **save** is a d20 roll ≥ 15 − level/2 − WIS or CON modifier.

### 4.7 Monsters and their AI

#### 4.7.1 Size and cells
- Small monsters take 1 of 4 units in a cell, medium 2 and large 4; a cell holds 4 units.
- Monsters never enter the party's cell or walls, closed doors or pits. Fliers ignore pits and plates.
- Small monsters don't weigh plates; medium and large ones do.

#### 4.7.2 Minds (per type in §7.6)
- **States.**
  - `asleep`: placed sleeping; noise wakes it.
  - `idle` and `patrol`: a list of cells to walk.
  - `hunt`: paths to the party with `E.Grid` A*. Cells that are full are blocked, so others take the side and back cells, and **flanking happens on its own**.
  - `engage`: next to the party it faces, winds up and strikes.
  - `ranged`: in line with a clear view and in range, it shoots.
  - `keepAway`: casters hold 3 cells off and step back if you close in.
  - `flee`: cowards below 25% HP run for 6 s; thieves flee after a steal.
  - `turned`, `held`, `asleep`.
- **Awareness.**
  - A monster becomes aware when the party's cell is in its sight radius (★sight) and its field of view (E.Fog-style shadowcasting from the monster, or the symmetric check `fog.visible` from the party, as the kit does).
  - **Noise** (combat, doors, levers, falls) wakes monsters within 4 cells; hounds hear to 6.
  - A monster forgets the party after 12 s out of sight and goes back to `patrol`.
- **Movement.** One cell per `move` seconds (per type), drawn as a glide.

#### 4.7.3 Attacks
- **Every melee attack telegraphs.** The wind-up (★0.5 s; heavy monsters 0.8 s) is a visible animation with a sound. The strike lands only if the party is still next to the monster when the wind-up ends; otherwise "The rat's bite snaps on air." **This makes the sidestep a skill.**
- **Re-engaging.** After the party changes cell, a monster next to it waits ★0.6 s before starting a new wind-up (the "dance" is fair but not free).
- **Intervals.** Each type has its own interval × ★monster interval.

#### 4.7.4 The Bolt-Holder (boss, floor 4)

It hovers over the arena's centre cell (6,3) with **HP ★320** and Defense 15. It is immune to Hold, Sleep and Poison, and it **absorbs lightning**: Forked Lightning heals it for half, and it gloats "The Bolt-Holder drinks the lightning!"

| Phase | When | Behaviour |
|---|---|---|
| **1: Caged** | the start | It takes ×0.2 damage through the cage and attacks every 3.5 s. Each of the 3 **Great Locks** (west, east and north walls) turned with ✕ (2.0 s, during which the party can't act) slides out 2 of its 7 bolts ("The Bolt-Holder shrieks!"). When all 3 are turned, the cage opens. |
| **2: Unbolted** | all locks turned | It takes full damage, attacks every 2.8 s and **drifts** one cell toward the party's flank every 4 s (it never enters pillar cells). At 50% HP it **relocks** one lock at random ("It wrenches a bolt home!"): damage taken is ×0.5 until that lock is turned again. |
| **3: Wrath** | HP below 25% | It attacks every 2.2 s and summons 2 Gazers every 12 s (4 at most). |

Its attacks, picked by its position and line of sight:
- **Chain Lightning** (any phase): telegraphed for 0.8 s by a cyan glow and a flicker along the row or column toward the party. The bolt runs along the line until a pillar or wall: 3d6 to 2 members. Leave the line, or put a pillar between you, to dodge it.
- **Locking Gaze:** the iris narrows for 1.0 s, then 1 or 2 members without the Lidless Ward or Free Hinge are Held for 4 s ("Your joints lock!"). It needs line of sight, and pillars block it.
- **Bolt Rain:** marks the party's cell and 2 open neighbouring cells with glowing rings (`world.arc`) for 1.5 s, then iron bolts slam down: 2d6 to 2 members if the party is still in a marked cell.
- **Cage Slam** (adjacent only): 2d8 to the side facing it.

On death the Eye cracks, the bolts fly off, and the north lock wall becomes the **Stair to the Light** (✕ there starts the ending).

### 4.8 Magic

- **Mages** cast from their **spellbook** (an off-hand item). The book holds the spells they know; new ones come from scrolls through Camp → Scribe, which always succeeds and uses up the scroll.
- **Clerics** need their **holy symbol** in a hand. They may prepare any prayer of a level they can cast.
- **Memorizing.** Both choose what fills their slots in Camp → Memorize or Pray. The choice persists ("same as before" is the default), and slots refill after a full rest. Casting spends a slot.
- **Scrolls.** A mage can cast a scroll directly, and the scroll is used up. The Scroll of Raising works for clerics and paladins.
- **Wands** have charges and anyone can use one.
- **Slots by caster level, 1 to 8:**

  | Caster | Spell level | Lv1 | Lv2 | Lv3 | Lv4 | Lv5 | Lv6 | Lv7 | Lv8 |
  |---|---|---|---|---|---|---|---|---|---|
  | Mage | 1 | 1 | 2 | 2 | 3 | 3 | 4 | 4 | 4 |
  | Mage | 2 | 0 | 0 | 1 | 2 | 2 | 2 | 3 | 3 |
  | Mage | 3 | 0 | 0 | 0 | 0 | 1 | 2 | 2 | 3 |
  | Cleric | 1 | 1 | 2 | 2 | 3 | 3 | 3 | 4 | 4 |
  | Cleric | 2 | 0 | 0 | 1 | 2 | 2 | 3 | 3 | 3 |
  | Cleric | 3 | 0 | 0 | 0 | 0 | 1 | 1 | 2 | 2 |

  Bonus slots come from INT and WIS (§4.3) and from the Robe of the Lintel (+1 level-1 slot).
- **Targets.**
  - `front`: the cell in front.
  - `line`: down the facing line.
  - `member`: picked on the cards.
  - `party`.
  - `door`: the door in front.
- **Spell effects** are × ★spell power. The spell list is in §7.8.

### 4.9 Camp, rest and food

- **Camp** (L3, C, or the HUD's camp icon) is refused while any aware monster is within 6 cells: "You may not rest with enemies near."
- **Camp menu tiles:** Rest, Memorize, Pray, Scribe, Formation, Eat, Save Game, Load Game, Settings and Leave Camp.
- **Resting.** An hour passes every 0.4 s of real time. Each hour every conscious member heals ★1 + CON modifier (at least 1) × ★rest heal.
  - After 8 hours, slots refill to the prepared spells, Lay on Hands returns, and Down members wake at 1 HP.
  - During rest, clerics first cast their prepared Mends on the wounded (as the source let the party do), then pray to restore them.
  - Rest stops early when everyone is full and every slot is ready, or when ○ is pressed.
- **Interruptions.** Each hour has a ★4% chance (0 in safe rooms and once the floor's wanderer budget is spent: floor 1: 3, floor 2: 3, floor 3: 4, floor 4: 0) of spawning a wanderer group from the floor's spawn list, 2 cells away and aware. "You are awakened by something moving!" The camp closes.
- **Food** runs 0 to 100 for each member.
  - It drains −1 every ★60 s of play and −15 per full rest. ★Hunger rate scales it.
  - At 25: "Cobb is hungry." At 0: "Cobb is starving!" A starving member loses 1 HP every 30 s and heals nothing from rest.
  - A Ration gives +50 and an Iron Ration +100. Loaves of the Hearth fills everyone.
  - **Eat** at camp feeds every member below 60% from the party's smallest food items.

### 4.10 Experience, levels and hidden deeds

- **XP for kills** is split evenly among conscious members, then × class and race multipliers and × ★XP gain.
- **Base thresholds:** level 2 at 100, 3 at 250, 4 at 500, 5 at 900, 6 at 1500, 7 at 2400 and 8 at 3600 (the demo's cap).
- **Discoveries.** A found secret gives +25 to each member and plays the `secret` sting. There are 3, marked `secret: true` in the floor data: the floor 1 closet (SW1/H1), the floor 1 illusory wall (I1) and the floor 2 catch (SW2). A hidden deed (special quest) gives +100 to each member, plays a jingle and shows "A hidden deed is done!". There are 3 deeds in all; Journal → Deeds counts them.
- **Level-up.** On the next rest or at once (the default is at once, with the "level up" sting): new HP, to-hit and slots, a portrait smile and a toast "Brannoc has reached level 3!".
- **Target pace** (the bot checks it, §14): about level 3 at the end of floor 1, 4 at the end of floor 2, 5 on floor 3, and 5 or 6 at the boss.

### 4.11 Down, death, raising and game over

- **Down.** At 0 HP a member is **Down**: unconscious, greyed portrait, can't act. A Down member hit again becomes **Dead** (bones on the card).
- **Waking.** Healing wakes a Down member at the healed amount; a full rest wakes them at 1 HP.
- **Raising the dead.** Raise from Rest (cleric spell level 3), the Scroll of Raising (2 placed) or the **Shrine of the Threshold** (floor 2 Vault, one use) brings a dead member back at 1 HP.
- **Game over.** If no member is conscious, the screen reads "THE PARTY IS LOST" over the frozen view, with Load last save, Load game and Title.

### 4.12 NPCs, dialogue and choices

- **Recruits.** Three NPCs can join, up to 6 in the party: **Tamsin Pell** (floor 1), **Durgan Copperhand** (floor 2) and **Sister Veil** (floor 3). Their scripts are in §7.9.
- **Dismissing.** Dismiss is in the Party screen, behind a confirm. A dismissed NPC goes home and is gone for good.
- **How it runs.** Dialogue is `E.Story` nodes through `E.Dialog`:
  - the speaker's live rig portrait, its mouth moving as it speaks;
  - a **babble voice** (§6.5);
  - choices picked with the d-pad and ✕, or a click;
  - story flags kept in the save (`story.state()`).
- **Veil's choice** changes floor 3 (§7.4.3).
- **Barks.** Short, non-modal lines (`modal: false, auto: 2`) for Snick, the Bolt-Holder and party barks.

### 4.13 Messages, Examine, Journal, notes and hints

- **The log.** The three newest lines at the bottom left, fading after 8 s; the full history is in Journal → Log.
- **Examine** (R3, X or middle click) describes what is in front in the source's voice, for example:
  - "A wall of slick stone. One stone sits proud of the rest."
  - "The Drain Rat looks badly hurt."
  - "A Rusty Dagger and a Rock lie here."
- **The Journal** (from the Party and Map screens or the pause menu) has four tabs:
  - **Quests**: the main thread, the NPCs and Veil.
  - **Notes**: every inscription and note read, readable again.
  - **Deeds**: found out of 3.
  - **Log**.
- **Hints** (Settings → Hints, on by default) are first-time tips that use the player's own glyphs, for example "Rats! Press □ to strike with everyone who's ready.", plus each puzzle's escalation.

### 4.14 Automap

- **What it records.** `E.Fog` per floor, with a sight radius of 4 in the dungeon. A cell counts as seen when it is visible; walls are drawn next to seen floor.
- **The screen** (§5.3) shows:
  - walls, and doors in their states;
  - stairs, plates (once seen pressed or stood on), alcoves, inscriptions (a quill), teleporters (once used), the spinner (once noticed);
  - NPCs, the party arrow, and monster dots for a Ranger's Tracking.
- **A minimap** in the top-right is *optional*. The default HUD has only the compass, to keep the 10-foot view clean.

### 4.15 Saves

- **Where.** The engine's `game.saves`: 3 slots plus the autosave.
  - Save and Load sit in Camp and in the pause menu (when out of combat, `saves.canSave`).
  - The autosave runs on every floor arrival and after the boss.
- **The title.** Continue loads `latest()`.
- **Hub sessions.** The client gives the page in-memory storage, so add no code. Hide Save and Load in a session.

### 4.16 Settings (the engine's, plus a *Game* group)

- **The engine's own:** volume, music, effects, mute, reduce motion, shake and flashes, pixel scaling, screen filter, frame rate, the 3D Display settings (cards or puppets, resolution, shadows, filter) and Controls (rebinding, dead zone, vibration, **Button symbols: PlayStation / Xbox**).
- **Ours** (`game.settings.define`, group 'Game'):

  | Setting | Options | Default |
  |---|---|---|
  | Difficulty | Easy / Normal / Hard | Normal |
  | Time in menus | Pause / Slow / Real time | Slow |
  | Step animation | Smooth / Quick / Instant | Smooth |
  | Head bob | on / off | on |
  | Hints | on / off | on |
  | Level up | At once / On rest | At once |
  | Voices volume | slider | 0.8 |

---

## 5. UI and UX: 10-foot, controller-first

### 5.1 Principles

- **Resolution.** `res: 'ps1'` with `expand: true`. The HUD is laid out for **320×240 (4:3) up to about 427×240 (16:9)** in game pixels and anchored to `r.W` and `r.H`.
  - At 1080p one game pixel is about 4.5 screen pixels, so the 5×7 font reads at about 31 px from the sofa.
  - Body text is the normal 5×7 font; headings use `scale: 2`; nothing interactive uses the tiny 3×5 font.
- **Few, big things.** At most about 12 focusable things per screen region. Every screen shows ○ Back at the bottom right. Cut density before you shrink anything.
- **One look: "lockwork brass."**
  - Panels: `bg ['#1c1813', '#0e0c0a']`, border `#b8924a`, focus `#ffd36a` (double border plus a slow pulse), text `#f0e6d0`.
  - Stat colours: HP `#e0463c`, spell slots `#4a8aff`, food `#c8a040`.
  - Rivets: 2×2 dots `#e8c878` in the panel corners.
  - Title text: `E.font.title` with `colors ['#fff6d8', '#ffd36a', '#c8923a', '#6a4a1a']` and `depthColor '#2a1a08'`.
- **Keyboard and mouse are native, not stand-ins.** The same screens, with hover moving the focus, click acting, drag and drop in the Party screen, the mouse wheel scrolling lists and the Hand following the cursor (§5.4).
- **Prompts always follow `input.lastDevice`** (§5.5).

### 5.2 The play HUD (over the full-screen 3D view)

| Element | Where (game pixels) | Content |
|---|---|---|
| Compass | top centre, 64×16 | "W  **N**  E", with the facing letter at scale 2. It changes instantly on spinners: the only clue. |
| Floor toast | top left | the floor's name for 3 s on arrival |
| Party bar | bottom, `H−50` to `H−2` | one card per member in formation order. Row groups are 4 px apart, with tiny labels FRONT, MID and BACK above them. |
| Card (about 66×46) | — | live portrait 30×30 (`drawPortrait`, wince when hurt, grey when Down, bones when Dead); the name (cut to 7 letters); HP bar and `hp/max`; a 2-px food strip under the portrait; **two hand slots** 15×15 with the item icon, a cooldown wipe (dark, sweeping), a "ready" glint and MISS or damage pops; status icons in a row of 6×6 (poison drop, chain, Zz, shield, bowl) |
| Selected card | — | brass double frame; the L2 and R2 glyph badges under its hand slots |
| Log | above the bar, left | 3 lines, newest at the bottom, with a shadow |
| Prompts | above the bar, right | up to 4 `[glyph] Verb`, e.g. `✕ Pull lever · □ Strike · △ Party · Create Map` |
| Hand | above the bar, centre | held item icon and its name (unless the mouse cursor carries it) |
| Hit chevrons | screen edges | red chevrons on the left, right or bottom edge for 0.6 s on flank or rear hits; a red vignette on front-row hits |
| Mouse helpers | top right under the engine corner | small icons for Map, Camp, Party and Journal, mouse only; hidden for the pad |
| Boss bar | under the compass | THE BOLT-HOLDER, 200×6, with 3 lock pips (turned or locked) |
| Race HUD | top left | timer `02:13.4`, checkpoint label, crowns, and in a session the standings in seat colours |

Keep clear of `game.cornerArea()`, the engine's top-right menu button.

### 5.3 Screens

Every screen is drawn over the dimmed 3D view, takes focus navigation (§5.4) and shows its prompts.

- **Party (△, I).**
  - **Top:** member tabs, one 32-px portrait each (L1 and R1 switch).
  - **Left:** the paperdoll, a large live rig portrait framed by 20×20 slots: Head, Neck, Body, Arms, Main, Off, Ring, Ring, Feet, Quiver.
  - **Centre:** the backpack, 4×3 slots of 22×22.
  - **Right:** details: a 32×32 icon, the name, a type line, stats (damage, speed, Defense, classes) and the description (§7.7 tone).
  - **Bottom:** `HP 11/11 · Defense 14 · Lv 2 Fighter · XP 140/250 · Food ███░`.
  - **Actions:** ✕ takes or places (it carries the item into the Hand, or swaps), □ Use, △ Drop at your feet, R2 Sheet. ○ returns a carried item, then closes the screen.
  - **The Sheet tab** shows the stats and their modifiers, class abilities, resistances and the spellbook or the prayers. Dismiss (NPCs) is here, behind a confirm.
- **Cast.** Opened by a caster's book or symbol hand.
  - A centred panel of about 260×150, with level tabs L1, L2, L3 (shoulders switch them).
  - Rows read "Spark Dart ×2", with a description and the target type.
  - ✕ casts. A `member` target then moves the highlight across the cards (◀ ▶, ✕). A `line`, `front`, `door` or `party` spell fires at once. ○ cancels.
- **Camp (L3, C).** The view darkens and a small campfire light glows in the cell. Tiles in 2 rows of 5 (§4.9).
  - **Rest** shows a rest panel: the hours counting, HP ticking up on the cards and ○ Stop.
  - **Memorize** and **Pray**: known spells on the left (grouped by level, with descriptions) and slots on the right. ✕ on a spell fills the next free slot of its level, ✕ on a slot empties it, △ "Same as before".
  - **Scribe**: scrolls in the party's packs that the mage doesn't know; ✕ learns one.
  - **Formation**: the 2×3 places; ✕ twice swaps two members.
  - **Eat**: a confirm, then a summary of who ate what.
  - **Save** and **Load** open the engine's slot screens (`saves.show`).
  - **Settings** opens `game.menu('settings')`.
- **Map (Create, M).**
  - A parchment-coloured panel with the floor's explored cells at 8 to 10 px per cell, and a legend row at the bottom.
  - L1 and R1 switch between visited floors; the d-pad or stick pans a map larger than the screen; ○ closes.
  - Dev *reveal* shows everything.
- **Journal (J, or the tab from Party or Map).** Quests, Notes, Deeds and Log. Notes open the **Reader**, a parchment page with the note's text at the normal size, paged with the d-pad.
- **Dialogue.** `E.Dialog` at the bottom: portrait on the left, name in brass and 3 lines a page. ✕ finishes the line, then turns the page; ○ fast-forwards; choices are a vertical list.
- **Title.**
  - **The view.** The Drain-gate stage from the intro (§7.3, stage B) at night. The camera pushes slowly toward the grate, the torches flicker, and every 12 s the great bolt slides home with a shake and a thud.
  - **The logo.** **EYE OF THE BOLT-HOLDER** in `E.font.title`, scale 4, brass colours (§5.1), with a slow glint across it, and "A thousand locks. One eye." under it.
  - **The menu,** a centred `E.Menu`: Continue (only when a save exists), New Game, Load Game, Rat Run, Settings, About & Credits.
  - **The bottom line:** the prompts for the last device and the version (`E.versionLabel()`, plus the game's own version).
  - **Music:** `title`.
  - **The attract mode** starts after 10 s idle (§9). The touch notice is shown on touch-only devices (§5.7).
- **Creation:** §4.4. **The floor card:** §4.1. **About and Credits:** §11. **Touch notice:** §5.7.
- **Game over.** "THE PARTY IS LOST" in the title font over the frozen, darkened view; one line from the floor ("The Drains keep what they take."); then Load last save · Load game · Title.
- **Ending.** The ending cutscene (§7.3), then the credits roll (the §11 Credits page, scrolling), then the stats panel (time, kills, secrets 3, deeds 3, deaths, levels) and Title. The `ending` song plays.

### 5.4 Focus navigation and the mouse

- **One focus system** (`61-ui-kit.js`) for every screen.
  - Each screen registers its widgets as rects with an id, an action and optional explicit neighbours.
  - The d-pad and the left stick (menus use the engine's `up/down/left/right`, which include the stick) move to the nearest widget in that direction, by geometry; explicit neighbours override.
  - Holding a direction repeats (`input.repeat`, 0.35 s, then 0.1 s).
- **The mouse.**
  - Moving the pointer over a widget focuses it; a left click acts as ✕; a right click on a slot acts as □; the wheel scrolls lists.
  - Party screen drag and drop: mouse-down carries the item, mouse-up places it.
- **Mouse in the 3D view.** Each frame, project the interactables in front with `world.project`: the front wall's feature, the items in the front and own cells, doors, the monsters in front and alcoves. Each gets a screen hotspot.
  - Hovering one outlines it (a soft brass rim drawn with the pen around the thing) and shows a tooltip, e.g. "Lever — click to pull".
  - A left click on a hotspot uses it. With an item in the Hand, a left click on the lower view puts it down and a left click on the upper view throws it, as in the source.
  - A right click anywhere in the view is **Party Strike**.
- **Party cards.** A click on a hand slot uses that hand (the source's core gesture); a click on a portrait selects; a right click on a portrait opens that member in the Party screen.

### 5.5 Prompts and glyphs

- **One painter, `glyph(g, x, y, action)`**, draws a badge for the action's binding on the last device:

  | Device | Badge |
  |---|---|
  | Pad, PlayStation (default) | ✕ blue, ○ red, □ pink, △ green, drawn as shapes on a dark disc; L1, R1, L2, R2, L3, R3, Options and Create as rounded labels; D-pad and stick icons |
  | Pad, Xbox (Settings → Controls → Button symbols) | A green, B red, X blue, Y yellow letters; LB, RB, LT, RT, View, Menu |
  | Keyboard | a keycap with the bound key (`input.codeLabel`) |
  | Mouse | a mouse icon with the left or right button lit |

  Never print raw codes. Build every prompt string from `input.label(action)` through the painter, so rebinding just works.
- **When the prompts change.** They switch the moment `lastDevice` changes: a pad button or a stick past the dead zone, a key, or a mouse move of more than 4 px or a click.

### 5.6 Input map (all rebindable except the menu actions)

| Action | Gamepad (standard mapping) | Keyboard | Mouse |
|---|---|---|---|
| Step forward / back | Left stick ↑ ↓, D-pad ↑ ↓ | W / S, ↑ / ↓, Numpad 8 / 5 or 2 | — |
| Strafe left / right | Left stick ← → | A / D, Numpad 4 / 6 | — |
| Turn left / right | D-pad ← →, right stick ← → (a flick, repeating every 0.35 s while held) | Q / E, ← / →, Numpad 7 / 9 | — |
| Use / interact / take / place / stow | ✕ (tap) | F | left click on a thing in the view |
| Put the Hand's item down | ✕ (hold 0.4 s) | H | left click on the lower view |
| Throw the Hand's item | ○ | G | left click on the upper view |
| Party Strike | □ | Space | right click in the view |
| Select member previous / next | L1 / R1 | Tab / Shift+Tab, or 1–6 | click a portrait |
| Selected member's main / off hand | R2 / L2 | 1–6 main hand (and select); Shift+1–6 off hand | click a hand slot |
| Party screen | △ | I | portrait right click, HUD icon |
| Camp | L3 | C | HUD icon |
| Examine ahead | R3 | X | middle click |
| Automap | Create (acts on release; ignored when Options was pressed while Create was held) | M | HUD icon |
| Journal | (from the Party or Map tabs, or the pause menu) | J | HUD icon |
| Pause menu | Options | Esc, P | the engine's corner button |
| Menus | D-pad / stick, ✕ confirm, ○ back, L1 / R1 tabs | arrows, Enter, Backspace or Esc | hover, click, wheel |

**Implementation notes.**
- Define your own play actions (`fwd, back, strafeL, strafeR, turnL, turnR, use, strike, selPrev, selNext, handMain, handOff, party, camp, examine, map, journal, throw, putDown`) in the play scene's `input` map, as the kit did.
- **Don't use the engine's merged `left/right` in play**: they merge the d-pad and the stick, and here they mean different things.
  - Read the left stick from `input.padAxes[0]` and `[1]`, with the dead zone and a 0.5 threshold, for move and strafe.
  - Read the right stick X from `padAxes[2]`, as a flick with re-arm, for turning.
  - The d-pad codes are `Pad12` to `Pad15`.
- **Hub rule.** While Create (`Pad8`) is held, ignore Options (`Pad9`), and don't toggle the map on Create's release if Options went down in between.
- **Idle detection** (attract mode): any action pressed, any `input.held` code, a stick past 0.3, a pointer move over 4 px or a click.

### 5.7 Touch-only devices

- **Detection.** `matchMedia('(pointer: coarse)')` with no `(hover: hover)`, and no keyboard or gamepad input seen yet. On such devices `input.touchEnabled = false`: no touch buttons and no stick.
- **The title** shows a panel: "**Controller or keyboard required.** Connect a controller or a keyboard to play." The engine's top-right menu button stays and opens Settings.
- **The attract mode runs** after the same 10 s idle. A touch exits it to the title, which shows the notice again.
- **The notice hides** the moment a key or a pad button arrives, and play works normally from then on.

---

## 6. Presentation: art, animation and audio

### 6.1 Art direction

- **The base is the engine's native 3D look,** the one the spike showed: code-drawn textures, `world.res = 'pixels'` (chunky low-res pixels), toon light, outlines on, characters as **cards** (`world.look = 'card'`: the rigs drawn as pixel art from the camera's own angle) and fog for the source's distance falloff.
- **Lighting.** `torchShadows: 2`, `torchLights: 6`, the party's lantern as a `world.light` at the eyes, and `glowLights: 4` for spells.
- **New art** wherever the source's feel needs it: wall features, doors, floor items, the creatures in §6.3, the boss, the brass UI, item icons and the stages for the title and the cutscenes.
- **Props.** For generic set dressing (bones, barrels, crates, chains, cobwebs, banners, candles, tables), search the store first with `node tools/asset-find.mjs "bones"`, using `kaykit-dungeon-remastered`, `kenney-mini-dungeon` and `kenney-graveyard`. Cut a set with `tools/asset-set.mjs`, load it with `E.addAssets`, and place props with `world.shape(id, …)` or `{ shape }` in the legend.

| Floor | Ground (`level.ground`, `colors`) | Walls (`side`, `color`) | Fog | Ambient `[sky, ground, power]` | Signature dressing |
|---|---|---|---|---|---|
| 1 The Hasp Drains | flagstone `#3e4a44 / #2a332f / #55615a`; a floor colour function paints dark-green **water channels** (6 units wide) down the Rat Channel and Cistern cells | brick `#4a5048` | `#06080a`, 24 → 150 | `#4a5a5a, #1a201e, 2.6` | floor drains (grates), dripping pipes (pen tubes), slime streaks, rusty chains, rat bones, sluice wheels |
| 2 The Tumbler Halls | tiles `#5a4a3a / #3e3228 / #7a6450` | block `#6a5a48` | `#0a0806`, 40 → 220 | `#7a6048, #2a2018, 3.0` | turning **wall gears** (pen rings of teeth, slowly rotating), anvils, workbenches, cogs on the floor, forge glow (orange lights) in the Workshop |
| 3 The Gloam Deeps | plain `#2a2434 / #1a1622 / #3a3248` | block `#2e2838` | `#040306`, 20 → 130 | `#3a3a5a, #141220, 2.2` | carved **eye reliefs** on walls (pen), shut-eye banners, bone piles, pale blue candles in the Chapel (lights) |
| 4 The Eye's Vault | tiles `#3a3e46`; the arena floor colour function adds faint cyan rune lines | block `#30343c` | `#020204`, 30 → 200 | `#2a3040, #0c0e14, 2.0` | the boss's amber light, cyan lightning flashes, the 3 Great Locks' rune lights going out as they turn |

- **Item icons.** Make about 60 of them as `E.sprite` strings, designed at 12×12 and drawn at ×1 on the cards and ×2 in the Party screen. Shade them with `E.tones`.
- **Item models.** Each floor item also gets a tiny **3D model drawn with the pen**, lying flat at its quadrant spot:
  - blade (sword, dagger): a thin box with a cross-guard;
  - axe or mace: a head on a haft;
  - crossbow; bolts or arrows: thin tubes;
  - potion: a ball and a neck, in its colour;
  - scroll: a tube; book: a box;
  - key: a ring plus a shaft with teeth, in the key's colour;
  - rock: a grey lump of balls; ration: a wrapped box;
  - gear: a ring of boxes; ward: a toothed disc.

### 6.2 The 3D presenter (`40–44`)

- **Building a floor.**
  - Map each cell to 2×2 level tiles (`#` → `##`, open → `..`). A torch wall feature turns the tile on its open side into `t`, the kit's NICHE trick.
  - Make `new E.World3D(game, { level, look: 'card', res: 'pixels', torchLights: 6, torchShadows: 2, torchPower: 18, ambient, fog, sky: fogColour, camera: { mode: 'fixed' }, overlay: { fov: 60 }, onDraw })`.
  - Create all of the floor's lights at build time (lantern, candles, forge glows, the boss), as the engine requires.
  - Build every floor's world at boot and `prepare()` it, so a floor change never compiles a shader mid-game. On a floor change, swap the active world.
- **Each frame,** from the sim state:
  - **Camera:** `world.camera.fixed = { x, y, z: EYE + bob, yaw, pitch: −0.04, fov: 74 }`, from the party's tween (the kit's `place()`). A bump adds the lurch, a hit adds `game.shake`, a pit fall drops z by 40 and fades.
  - **Doors and gates:** `world.thing('door', …, { w: 32, h: 46, swing })`; set `t.open` toward the sim's state and call `world.setSolid` when it opens.
  - **Secret walls** (and **illusory walls**): a movable wall block that is **indistinguishable from the level's walls**. Try `world.box({ fixed: true, side: <the floor's side style>, color })` first; if it doesn't match, add a `wallBlock` helper to the 3D engine that reuses the level's wall material (risk 3, §13). A secret block sinks into the floor when opened; an illusory one never moves (the party's step through it is masked by the dissolve).
  - **Wall features:** custom `E.World3D.THINGS`, drawn with the pen on the wall face (local +y out of the wall, as the kit's `wallLever`).

    | THING | How to draw it |
    |---|---|
    | `wallLever` | the kit's |
    | `wallButton` | a square stone and a brass boss that presses in |
    | `catch` | a slightly proud stone with a crack, or a brass rivet plate; glints under Seeing |
    | `alcove` | a dark recessed box that draws its items inside |
    | `keyhole` | per key shape: iron round, warded cross, gear toothed, bone skull, ward discs |
    | `plaque` | a stone tablet with dark glyph dashes |
    | `grate`, `pipe`, `chain`, `gearWall` (rotating), `eyeRelief` | decor |
    | `candle` | a holder, a wax stick and a flame glow when lit, paired with its light |
    | `greatLock` | a big wheel with rune glow, spun over 2 s |
    | `undergate` | a great door with 3 keyholes and 7 bolt bars that slide when a ward goes in |
    | `cage` | bars |
    | `shrine` | a ring of tiny rat statues |
    | `clockFace` | a dial with 4 gear sockets and hands that move once the clock is whole |
    | `altarSlab` | a floor slab |
    | `stairs` | the kit's `stair` (down), plus `stairUp` |
    | `pitEdge` | a dark hole with a lip; a bridge slab when bridged |
    | `plate` | the kit's |
    | `teleporterField` | a soft swirl glow, only when not silent |

  - **Floor items:** pen models at the quadrant spots of the visible cells (`onDraw`).
  - **Monsters:** cards (`world.mob` with `rig`, `blob` or `orb`) are steered toward their slot's position with `vx`/`vy` as the kit does (`fly: true` for fliers). Their `anim` comes from the sim: attack phase, hurt flash, `die` pose, sink. Pen-drawn creatures are drawn in `onDraw` from their sim state and a local animation clock (§6.3).
  - **Projectiles and FX:** `world.glow` for bolts and orbs, pen bars for lightning, `game.particles` for sparks, embers, smoke and damage `text`, and `world.arc` for floor telegraphs (Bolt Rain).
  - **First-person overlay:** with `world.overlay.pen`, draw the striking member's weapon swinging across its side of the view: left for places 1, 3 and 5, right for 2, 4 and 6. The crossbow rises and kicks; a caster's hand glows in the spell's colour.
  - **Hover outlines and name tags:** project with `world.project`, then draw them in the HUD.
- **NullView** implements the same interface (`enter(floor)`, `frame(r)`, `event(e)`, `pick(sx, sy)`) as no-ops for Node.

### 6.3 Creature recipes

The sizes follow the engine's guidance (heroes `size` 1.2 to 1.4, bosses larger). Every rig gets a real palette.

| Creature | Build | Recipe | Animation notes |
|---|---|---|---|
| Drain Rat | card, `E.Blob` | `{ R: 3.6, ears: 'cat', tail: true, feet: true, mouth: 'fangs', colors: { base: '#6a5a50', dk: '#3e342e', lt: '#9a8a7a', eye: '#ff6a4a' } }` | fast squash scurry; the wind-up is a rear-back squash |
| Bloat Leech | pen | 5 balls (r 4 → 2.5) along a sine curve on the floor, `#b89a9a` with `#7a5a5a` rings; a mouth ring of 6 small balls; a wet glint | the body undulates; it lunges out 6 units on the strike |
| Latchkin | card, `E.Humanoid` | `{ size: .85, build: 'chibi', hunch: .5, hood: true, outfit: 'tunic', bladeLen: 5, eyeGlow: '#ffd24a', colors: { skin: '#7a8a5a', hair: '#4a3a2a', cloth: '#6a4a32', pants: '#3a2e22', metal: '#9a9aa8' } }`, plus a pen ring of keys at the belt | the `thrust` move; it stays in a crouch-run while fleeing |
| Drain Ooze | card, `E.Blob` | `{ R: 8, face: 'front', mouth: true, colors: { base: '#5a8a3a', dk: '#2e5a22', lt: '#9ad06a', spec: '#e8ffd0' } }` | a slow wobble; it slams by squashing down; it splashes green particles |
| Rat Knot | pen | 6 rat-body balls in a ring with ear cones, tails as tubes knotted at the middle | the ring wobbles and turns; two bites a strike |
| Snick, the Latch-Boss | card, `E.Humanoid` | `{ size: 1.0, build: 'bulky', hunch: .3, hat: { style: 'crown', color: '#c8a040' }, armor: true, outfit: 'coat', bladeLen: 9, eyeGlow: '#ffd24a', colors: { skin: '#7a8a5a', cloth: '#5a3a2a', plate: '#a08040' } }`, plus a pen cape of hanging keys | the `overhead` move; it rattles its keys at 50% when it calls for help |
| Tinker Skeleton | card, `E.Humanoid` | `{ size: 1.2, build: 'skeleton', outfit: 'coat', bladeLen: 7, colors: { bone: '#d8cfb4', cloth: '#5a4030', metal: '#8a8a90' } }`, plus a pen hammer head on the blade | the `overhead` and `slash` moves; it collapses into bones on death |
| Rustling | card, `E.Blob` | `{ R: 4.2, horns: true, feet: true, mouth: true, colors: { base: '#b8642a', dk: '#7a3a18', lt: '#e8a060' } }` | the horns twitch; it throws rust-flake particles when it hits |
| Brass Spider | pen | abdomen ball r 7 and cephalothorax r 4.5 in `#b8923a`; 8 legs of 2 tubes each with procedural tetrapod gait (sine phase lifts); 4 red eye glows | legs step; it lunges on the strike; it falls apart into parts on death |
| Clockwork Sentinel | card, `E.Humanoid` | `{ size: 1.6, build: 'bulky', armor: true, hat: { style: 'helmet', color: '#8a6a3a' }, bladeLen: 14, eyeGlow: '#ff8a3a', colors: { cloth: '#6a4a2a', plate: '#b08a4a', metal: '#c8a868', skin: '#5a4a3a' } }`, plus a pen wind-up key turning on its back | the `twohand` move with a 0.8 s wind-up; the key spins faster during it |
| Lidless Hound | pen | a quadruped (adapt the 3D horror kit's dogs, `src/starter3d/40-horror.js`): pale `#c8b8b0`, smooth eyeless head, long jaw | run, leap and bite |
| Gloam Seer | card, `E.Humanoid` | `{ size: 1.25, build: 'heroic', outfit: 'robe', hood: true, weapon: 'staff', eyeGlow: '#8ae0ff', colors: { cloth: '#d8d0e8', hair: '#3a2a4a', skin: '#b8b0c8', trim: '#6a4a9a' } }`, plus an eye-sigil glow over the staff | the `cast` pose while charging a Locking Bolt (cyan glow growing) |
| Gloam Warden | card, `E.Humanoid` | `{ size: 1.35, build: 'heroic', armor: true, hat: { style: 'helmet', color: '#2a2434' }, weapon: 'staff', eyeGlow: '#e8e8ff', colors: { cloth: '#2a2434', plate: '#4a4458', metal: '#9a98a8', skin: '#b8b0c8' } }`, plus a pen halberd blade on the staff | the `thrust` move (reaches two cells) |
| Gazer | card orb plus pen | an orb `{ color: '#e8a040', r: 4 }`; pen iris (a flattened ball `#3a8a6a`), pupil, two lid slabs, 3 fin cones | blinks; the pupil tracks the party; it glows before Spark Gaze |
| Lockjaw Golem | card, `E.Humanoid` | `{ size: 1.9, build: 'bulky', armor: true, weapon: null, eyeGlow: '#7ad8ff', colors: { cloth: '#3a3e46', plate: '#5a606a', skin: '#4a4e56' } }`, plus a pen **padlock head** (box body and shackle tube) instead of a hat | the `haymaker` move; heavy footstep shakes |
| **The Bolt-Holder** | pen | an eye ball r 14 (sclera `#e8e0c8` with red vein bars); a flattened amber iris r 7 (`#e8a030`) facing the party; a black pupil r 3.5 that dilates; upper and lower lid slabs that blink and narrow for the Gaze; **7 radial iron bolts** (bars 22 long and 2.5 thick, with 5×5×3 heads) that slide out 2 per Great Lock (the 7th, the keystone, never moves); cyan lightning arcs (jagged pen bars) between neighbouring bolt heads; a ±3 bob; an amber `world.light`; red tint and crack lines in phase 3 | it must not read as a beholder: no eyestalks, no mouth, no tentacles. It reads as a caged iron lantern-eye. |
| Ghosts (race) | card, `E.Humanoid` | a hooded cloak in the player's seat colour, `fade 0.45`, a lantern glow in the seat colour, and the hub name as a HUD tag | they glide between the cells they report |

**People** (portraits and cutscenes):
- the party (§7.9);
- Keywarden Imelda Strake: heroic, band crown, coat, navy and silver;
- Magister Abel Lintel: robe, pointed hat, long white hair;
- Ysolde Vane: robe, long hair, ghost blue, drawn translucent;
- Tamsin: size 0.9, ponytail, green hood;
- Durgan: bulky, braided beard, iron helmet;
- Veil: robe, hood, eyes shut (draw them closed).

### 6.4 Animation list (new, on the engine's rigs, tweens and pen)

- **Party view.** Step glide with bob; turn ease; bump lurch; pit fall (drop and fade); teleport (a cut or a swirl); spinner (a short wobble only when *visible*: none for silent spinners); hit shake; level-up glow on the card; KO slump (the portrait tinted grey); death toll (the card turns to bones); first-person weapon swings for each weapon family (blade, axe, blunt, spear thrust, crossbow, bow, sling, throw, punch); casting hand glows.
- **World.** Gates rising with a chain rattle and wooden doors swinging; levers flipping and buttons and catches pressing in; plates sinking; secret walls sinking; the trapdoor dropping open; the pit bridge rising; teleporter swirl; gears turning; candles lighting and guttering; the Great Locks spinning; the Undergate's 7 bolts drawing back one by one; the clock's hands moving once it is whole; the boss's bolts sliding, lids blinking, iris dilating and lightning arcing.
- **Monsters.** Idle, move glide, wind-up telegraph (the move's `wind` phase, at least 0.5 s), strike, hurt flash and recoil, death (the `die` pose, then sink; blobs squash flat; constructs fall apart into pen parts; the leech curls).
- **UI.** Cooldown wipes; damage pops; card shake; chevrons; focus pulse; toast slides; the title logo shimmer.

### 6.5 Audio: code only, no files

- **The music director.** It plays a song per floor through `game.audio.music(song, { fade: 1 })`. Every dungeon song carries a `fight` track (drums and bass, `on: false`) that comes in with `audio.layer('fight', 1, .5)` when any monster engages and goes out 4 s after the last one. Stings use `audio.sting`. All songs are original, in the step-sequencer format (`{ bpm, steps, tracks: [{ wave, vol, notes }] }`).

  | Song | Feel | Seed motif (original) |
  |---|---|---|
  | `title`, "The City of a Thousand Locks" | 76 bpm, D minor, bell pulses over a low triangle | `D4 - F4 A4 G4 - F4 E4 \| D4 - - - C4 E4 G4 F4 \| E4 - D4 C#4 D4 - - -` |
  | `drains` | 60 bpm, a sparse drone, a lonely pulse every 8 bars, drips as sfx | low `A1` drone; a `pulse25` figure `A3 . C4 . E4 . . . \| D4 . C4 . B3 . . .` |
  | `tumbler` | 96 bpm in 6/8, ticking percussion | `drums` `h . h c . h` over `E2 . B2 E2 . B2` |
  | `gloam` | 54 bpm, sine pads, a tritone colour | `C3` plus `F#3` pads, a choir-like sine line in long notes |
  | `vault` / `boss` | 138 bpm, saw bass, lightning arpeggios | `A2 A2 . A2 C3 . A2 . \| G2 G2 . G2 Bb2 . G2 .`, arps `A4 E5 A5 E5` |
  | `camp` | 70 bpm, a lullaby | the title motif in a major key, triangle |
  | `ending` | 84 bpm, D major | the title motif resolved |
  | stings | — | `levelUp`, `deed`, `secret`, `wardFound`, `gameOver`, `victory`, `npcJoin` |

- **Sound effects** (`audio.define`, the engine's voice format; the kit's `SOUNDS` are the template). Define every one of these:
  - steps per floor: wet stone, metal grating, dust, stone;
  - turn, bump, door open and close, gate grind, lever clank, button click, catch click, plate thunk, secret-wall grind, illusion shimmer, trapdoor, fall and land;
  - teleporter whoosh (visible ones only), spinner grind, dart volley;
  - key turn, lock fail, lockpick scratch and snap, alcove place and take;
  - item pickup, drop and throw whoosh, land clatter, eat crunch, drink glug, scroll unroll, wand zap;
  - swings (blade, axe, blunt), crossbow and bow twangs, sling whirr;
  - hits (flesh, metal, bone, ooze), miss whiff, crit clang, party hurt;
  - level up, death toll, raise;
  - each spell: cast, travel loop and impact;
  - monster voices for each type (squeak, slurp, chitter, rattle, clank, growl, chant, gaze hum);
  - boss: roar, lightning crack, bolt slam, lock turn and shriek;
  - UI: move, confirm, back, error, tab;
  - ambience loops per floor: drips, distant gears, whispers, a low hum.

  Pan by bearing with the patched `{ pan }` (§3.9).
- **Voices: the babble synth** (`50-audio.js`, on `game.audio.ctx` and routed to the voice bus).
  - **Per-speaker profile:** `{ base: Hz, range: semitones, rate: syllables/s, wave, formant: ×, breath: 0..1, vib: [Hz, depth], echo: 0..1 }`. The profiles:

    | Speaker | base Hz | range | rate | wave | other |
    |---|---|---|---|---|---|
    | Narrator | 95 | 3 | 9 | triangle | echo 0.2 |
    | Keywarden | 170 | 4 | 12 | square | |
    | Lintel | 120 | 5 | 10 | saw | |
    | Tamsin | 300 | 7 | 15 | pulse | |
    | Durgan | 105 | 4 | 11 | square | |
    | Ysolde | 220 | 5 | 9 | sine | echo 0.4 |
    | Veil | 240 | 3 | 10 | triangle | breath 0.5 |
    | Snick | 260 | 8 | 16 | square | |
    | Bolt-Holder | 70 | 6 | 8 | saw | ring mod 30 Hz, echo 0.5 |

    The party members also get profiles from their race and sex.
  - **Driving it.** Set `talk.voice = null`. Each update, read `talk.shown`; for every two new letters (and on every vowel), emit a syllable.
  - **The syllable:**
    - The vowel picks a formant pair (F1/F2): a 800/1200, e 400/2000, i 300/2300, o 450/800, u 325/700, × `formant`.
    - The letter's code picks the pitch inside `range`, so a word always sounds the same.
    - Plosives (b d g k p t) add a 10 ms noise click; fricatives (f s v z h) add a 40 ms high-passed noise; nasals (m n) add a low hum.
    - `?` rises at the end, `!` is louder and higher, `.` pauses 0.15 s and `,` pauses 0.08 s.
  - **The voice:** an oscillator into two parallel band-pass filters (Q 8) into a gain envelope (5 ms attack, 0.6× hold, 30 ms release), then the bus.
  - **Barks:** short babble for party pain ("Oof!"), effort ("Hah!"), level-up ("Yes!") and casting, and for monster taunts.
  - **Test it in Node.** `babble.plan(text, profile)` returns syllable events (time, pitch, F1, F2, noise) and must be deterministic (§14). In Node there is no AudioContext, so the synth is a no-op.

---

## 7. Content

### 7.1 World bible (all original)

- **Hasp, the City of a Thousand Locks.** A walled river port that grew rich on locks. Its sigil is a key crossed with a bolt. It is ruled by the **Council of Keys** under **High Keywarden Imelda Strake**, stern and practical. The city's wizard is **Magister Abel Lintel**, dry, old and worried.
- **The Tumblerwrights' Guild.** The finest locksmiths in the world. Their halls sat under the city until a disaster sealed them a century ago. Their last guildmistress, **Ysolde Vane**, haunts the halls.
- **The Undergate.** The guild's masterwork: a gate beneath the city's foundations that seals something older, which this demo only hints at. To watch it, the guild forged **the Watcher**, an eye that never closes, and gave it **seven Great Bolts** to hold. The Watcher learned to love holding. It now calls itself **the Bolt-Holder** and turns the locks of Hasp from below: "Every lock is a promise. I keep them all."
- **Its servants.**
  - **Latchkins**: small sewer goblins who worship keys and steal iron. Their chief is **Snick, the Latch-Boss**.
  - The guild's own clockwork and its dead workers, wound up again.
  - The **Gloam-folk** of the deep, pale people who believe the Eye is a god and call themselves the **Lidless**: their Seers, Wardens and hounds.
- **The quest.** Gather the **Three Wards** (copper from the Drains, brass from the Guild Vault, iron from the Lidless Reliquary), open the Undergate and close the Eye.
- **The humour.** The title is playful; the prose is earnest. Wit comes in small doses: Tamsin's quips, dry item descriptions, the Rat King's crown.

### 7.2 Writing style guide

The model is the source's voice: terse, second-person, past the fourth wall never.

- **Messages** are one short sentence, present tense, addressed to "you" or naming a member. Use plain words and full stops; keep exclamation marks for danger and wonder.
  - "You hear a click in the distance."
  - "There is a loose stone here."
  - "The bolt will not move."
  - "This key does not fit."
  - "The Iron Key turns. The door opens."
  - "A hidden door grinds open!"
  - "The wall is an illusion!"
  - "The floor gives way!"
  - "You feel a twisting underfoot."
  - "Nothing happens."
  - "Darts fly from the walls!"
  - "Cobb is hungry."
  - "Odelia is poisoned!"
  - "Brannoc swings at the air."
  - "The Drain Rat dies."
  - "You may not rest with enemies near."
  - "You are awakened by something moving!"
  - "A hidden deed is done!"
  - "Ysa has reached level 3!"
- **Inscriptions** are in CAPITALS, formal and a little archaic: "NOT EVERY STONE IS STONE."
- **Narration** (intro and ending) is stately, in the third person, with short paragraphs and one image each.
- **NPCs** speak formally but each in their own voice:
  - Tamsin: quick and cheeky.
  - Durgan: gruff and practical.
  - Ysolde: sorrowful and old-fashioned.
  - Veil: hushed and strange, always talking about eyes.
  - The Bolt-Holder: grand, slow, with CAPITALS for its emphasis.
- **Item descriptions** are 1 to 2 dry sentences: "It has seen better days, and better locks."
- **Never** use modern slang, game-mechanic jargon in the fiction (say "slots" only in menus), or the source's names.

### 7.3 Story beats and cutscenes

The cutscenes are 3D stages, small `E.World3D` sets built at boot, with rigs, a camera moved by `game.script` and `game.tween`, dialogue boxes, babble voices and stings. Any button speeds the text; holding Options or Esc for 1 s skips the cutscene.

**INTRO** (about 75 s):
- *Stage A*, the Council Hall at night: pillars, banners, two braziers, a long table, Strake and Lintel.
- *Stage B*, the Drain-gate: a stair down into the dark, a grate, and the party's four rigs.

1. NARRATOR: "Hasp. The city of a thousand locks."
2. NARRATOR: "For three hundred years its Tumblerwrights forged the finest locks in the world, and its people slept soundly behind them."
3. NARRATOR: "Then the locks began to turn by themselves."
4. STRAKE: "Doors bolt themselves in empty houses. Wells cap shut. Last night the east granary locked forty men inside and would not open for axes."
5. LINTEL: "It comes from below. Past the Drains, past the old guild halls… from the Undergate itself."
6. STRAKE: "You were recommended to me as people who open things. Go down. Find what holds our bolts, and break its grip."
7. *(Stage B)* NARRATOR: "The Drain-gate groans open. You step down into the dark."
8. NARRATOR: "Behind you, the grate crashes shut. A great bolt slides home with a sound like a closing tomb."
   - The camera shakes, a pen-drawn bolt slides across the grate, and the torches gutter.
9. NARRATOR: "Somewhere far below, something blinks."
   - Cut to black. An amber eye opens for 0.5 s, with the boss's hum.
10. Play begins on floor 1 with the log line "The grate above is bolted fast. There is no way back."

**Mid-game beats** (in-dungeon, through E.Story):
- Tamsin freed (floor 1).
- Snick's barks.
- Ysolde's ghost twice (floor 2).
- Durgan (floor 2).
- Veil's choice (floor 3).
- The Undergate opening (floor 3, a 10 s in-engine moment: the camera holds, seven bolts draw back one by one, a deep chord).
- The Bolt-Holder's taunts (floor 4).

**ENDING** (about 60 s):
- *Stage C*, the Vault after the battle: light pours from the cracked Eye.
- *Stage D*, the city square at dawn: houses, doors swinging open, Strake, Lintel and the party.

1. NARRATOR: "The Eye cracks from lid to lid, and its light goes out."
2. NARRATOR: "One by one, the seven Great Bolts fall silent."
3. *(Stage D)* NARRATOR: "Above, in the city of a thousand locks, every door swings open at once."
4. STRAKE: "Hasp is in your debt. The guild's last forge will cast your names into the Undergate itself."
5. LINTEL: "Yet the Undergate was built to keep something in. With its Watcher gone…"
6. NARRATOR: "Far beneath the city, in a darkness older than locks, something tries the door."
7. Title card **THE END**, then the credits roll (§11), then the stats: time, kills, secrets found out of 3, hidden deeds out of 3, deaths and the party's levels. Back to the title.

### 7.4 The floors

- **Legend** (one character per cell):

  | Char | Meaning |
  |---|---|
  | `#` | wall |
  | `.` | floor |
  | `@` | start or arrival |
  | `<` `>` | stairs |
  | `+` | wooden door |
  | `=` | gate |
  | `L` `K` | locked door |
  | `M` | magic seal |
  | `H` | secret wall |
  | `I` | illusory wall |
  | `P` | plate |
  | `T` | dart trap |
  | `O` | pit |
  | `o` | trapdoor |
  | `^` | teleporter |
  | `S` | spinner |
  | `U` | the Undergate |
  | `*` | pit landing |
  | `B` | the boss |

- **Coordinates** are (x, y) with y = 0 at the top; the rulers above each map give x.
- **Wall features** are given as *(stand x, y, face)*.
- **Checked during planning:** every walkthrough below was checked with a reachability script (each target reachable with only the doors opened so far, and every gated area unreachable before its gate). It came to 157 checks, including both of Veil's branches and the Sump. Your content lint repeats them (§14).

#### 7.4.1 Floor 1: The Hasp Drains (22×17)

*"Cold water talks to itself in the channels. The walls sweat."* (floor card)

```
    0000000000111111111122
    0123456789012345678901
  0 ######################
  1 #.....=.#####........#
  2 #.....#######........#
  3 ##+#####.########L####
  4 ##.#####H########.####
  5 #....###.....####.####
  6 #....###......P.=.####
  7 #............#########
  8 #....###.....#########
  9 ##.######I##.#########
 10 ##=#####...#...T....##
 11 ##.#####...########=##
 12 ##.##..#...###.......#
 13 ##..+..#######.......#
 14 ##@##..########L######
 15 ##<############>######
 16 ######################
```

**Areas:**

| Area | Cells |
|---|---|
| Wardens' Walk | (2,9 – 2,14) |
| Wardens' Post (safe room) | (5..6, 12..14) |
| Rat Channel | (1..4, 5..8) |
| Latchkin Den | (1..5, 1..2) |
| Tamsin's cage | (7,1) |
| The Junction | (8..12, 5..8) |
| closet | (8,3) |
| plate corridor | (13..17, 6) |
| Snick's Hall | (13..20, 1..2) |
| Rat King's lair | (8..10, 10..12) |
| Sluice | (12..19, 10) |
| Ooze Cistern | (14..20, 12..13) |

**Stairs:** up (2,15) is *sealed*; down (15,15) leads to floor 2's (2,1), facing E. Arriving from floor 2's up-stair puts the party at (15,13), facing N.

**Features and wiring:**

| Id | What | At | Wire / text |
|---|---|---|---|
| LV1 | lever | (2,11) E | toggle gate G1 (2,10) |
| N1 | inscription | (1,6) W | "THE WARDENS KEEP TO THE LEFT CHANNEL. THE BITERS KEEP TO THE RIGHT." |
| D1 | door | (2,3) | |
| LV2 | lever | (5,2) E | open G3 (6,1), once; then story `tamsin` |
| AL1 | Rat Shrine alcove | (4,5) N | "A ring of tiny stone rats surrounds an empty seat." Accepts `ratKingsCrown`, which completes deed **SQ1**, then gives `ringOfMending` into AL1 |
| SW1 | loose stone | (9,5) N | open secret H1 (8,4), the closet; +25 XP |
| N2 | inscription | (10,8) S | "NOT EVERY STONE IS STONE." (I1 is the wall beside it) |
| I1 | illusory wall | (9,9) | leads to the lair; +25 XP the first time through |
| P1 | plate (hold) | (14,6) | open G2 (16,6) while down. Hint after 20 s on or by it: "Something heavy might hold it down." |
| L1 | lock (simple) | (17,3) | `ironKey` (a thief can pick it) |
| T1 | dart trap | (15,10) | 2 members ×1d4 |
| B1 / B2 | buttons | (13,10) N / (18,10) S | both within ★6 s open G4 (19,11), latching. After 2 failed tries: "Two buttons, one gate. Perhaps they must be pressed together." |
| N4 | inscription | (14,13) S | "BY ORDER OF THE DRAINWARDEN, THIS DOOR OPENS FOR HIS KEY ALONE." |
| L2 | lock (warded) | (15,14) | `drainwardensKey` |
| D2 | door | (4,13) | to the Post |
| N3 | inscription | (6,12) N | "WARDENS' POST. BAR THE DOOR AND REST. SLEEP LIGHTLY." (safe room) |
| torches | brazier niches | (12,5) N, (20,1) E, (2,12) W, (20,13) E | |

**Items:**

| Where | Items |
|---|---|
| Wardens' Walk | (2,13) rustyDagger; (2,12) rock |
| Wardens' Post | (5,13) ration ×2; (6,14) tornPage |
| Rat Channel | (3,8) leatherCap; (1,5) sling and slingStones ×12 |
| Latchkin Den | (1,1) ironKey; (3,2) shortSword; (5,1) darts ×5 |
| closet | (8,3) scroll wardOfBrass, potionHealing |
| Junction | (10,7) rock |
| Rat King's lair | (9,11) ratKingsCrown; (10,12) ration |
| Snick's Hall | (20,1) lightCrossbow; (20,2) bolts ×12; (13,1) leatherArmor; (13,2) ration |
| Sluice | (19,10) potionHealing |
| Ooze Cistern | (20,12) ironRation; (14,12) scroll sparkDart |

**Monsters** (group at a cell):

| Area | Monsters |
|---|---|
| Rat Channel | (3,6) Drain Rat ×3; (1,8) Drain Rat ×2, asleep |
| Latchkin Den | (3,1) Latchkin ×2; (5,2) Latchkin ×1 |
| Junction | (11,7) Bloat Leech |
| Rat King's lair | (9,11) Rat Knot; (8,10) Drain Rat ×2 |
| Snick's Hall | (18,1) **Snick**; (15,2) Latchkin ×2 |
| Sluice | (17,10) Drain Rat ×3 (patrol 13–19) |
| Ooze Cistern | (16,12) Drain Ooze; (19,13) Drain Ooze |

Wanderers (rest interruptions): Drain Rat ×2 or Latchkin ×2, spawning at (3,7), (11,5) or (17,12).

**Events and hints:**
- At the start, the log line from the intro, then the movement hint ("Move with ◀▲▼▶ (shows the player's glyphs); turn with …").
- (2,9), once: hint "Rats! Press □ to strike with everyone who's ready."
- LV2: story `tamsin`.
- (5,13), once: "This old wardens' post has a sturdy door. A good place to rest." plus a camp hint.
- Snick, on sight: bark `snick1`. At 50% HP: spawn Latchkin ×2 at (13,2) and bark `snick2`. On death: bark `snick3`; he drops `copperWard`, `drainwardensKey` and `amuletOfVigor`.
- Entering the lair: "The stench of rats is overwhelming."
- Down the stairs: the floor card *THE TUMBLER HALLS*.

**Walkthrough** (the bot's data, in order):
1. Take the dagger and the rock.
2. LV1, then G1.
3. Clear the Rat Channel; read N1.
4. D1; clear the Den; take the ironKey; LV2; Tamsin joins.
5. Junction: kill the leech; SW1, then H1, then the closet.
6. Put the rock on P1 (stand at (13,6) facing E, hold ✕); G2.
7. L1 with the ironKey; kill Snick and take his drops.
8. Read N2, then through I1; clear the lair; take the crown; AL1, which completes SQ1; take the ring.
9. B1, then run to (18,10), then B2; G4 opens.
10. Cistern: clear the oozes; L2; down the stairs.

#### 7.4.2 Floor 2: The Tumbler Halls (22×17)

*"The air smells of oil and old smoke. Somewhere, gears are turning."*

```
    0000000000111111111122
    0123456789012345678901
  0 ######################
  1 #<@..........###.....#
  2 #...####.....K.......#
  3 ########.....###.....#
  4 #.....##########.....#
  5 #.P.P.=...#....####.##
  6 #.....#...M....####.##
  7 #.....#...#....####.##
  8 ##=########...>####.##
  9 ##..P##############.##
 10 ####.o.############.##
 11 ####O#.####.#######^##
 12 ####.#.####=#######.##
 13 ####.#.##.....###....#
 14 ####............+.S..#
 15 #########.....###....#
 16 ######################
```

**Areas:**

| Area | Cells |
|---|---|
| Landing | (1..3, 1..2) |
| Workshop | (8..12, 1..3) |
| Clock Hall | (16..20, 1..4) |
| Endless Hall | (19, 5..12) |
| Spinner Room | (17..20, 13..15) |
| Tumbler Lock Room | (9..13, 13..15) |
| Durgan's cell | (11,11) |
| Pit Run | (4, 9..14) |
| trapdoor passage | (5..6, 10) and (6, 11..13) |
| Riddle | (2..3, 9) |
| Weight Hall | (1..5, 4..7) |
| Antechamber | (7..9, 5..7) |
| Guild Vault | (11..14, 5..8) |

**Stairs:** up (1,1) leads to floor 1's (15,13), facing N. Down (14,8) leads to floor 3's (1,2), facing S. Arriving from floor 3's up-stair puts the party at (13,8), facing W. **Pits O1 and O2 drop the party to floor 3's Sump landing (2,15).**

**Features and wiring:**

| Id | What | At | Wire / text |
|---|---|---|---|
| N5 | inscription | (8,3) S | "THE TUMBLERWRIGHT'S CREED: THE FIRST FALLS. THE SECOND RISES. THE THIRD FALLS." |
| K1 | lock (warded) | (13,2) | `gearKey` |
| CN1–CN4 | gear niches | (16,1) N, (17,1) N, (19,1) N, (20,1) N | each accepts a `tumblerGear` |
| CF | clock face | (18,1) N | when CN1–CN4 are full, the hands move, it chimes, and it gives `tumblerwrightsGoggles` into CF: deed **SQ2** |
| AL2 | alcove | (19,6) W | holds `tumblerGear` (II) |
| SW2 | catch (a brass rivet) | (19,8) E | teleporter TP1 off: "Something clicks deep in the wall. The air in the corridor stills." +25 XP |
| TP1 | teleporter (silent) | (19,11) | to (19,5), facing S. Each pass counts a loop: at 2, "The corridor seems longer than it should."; at 4, Ysolde's whisper (story `ysoldeHint`) |
| SP1 | spinner | (18,14) | random facing |
| D3 | door | (16,14) | |
| LA, LB, LC | levers (start up) | (10,15) S, (11,15) S, (12,15) S | when A is down, B up and C down: open G5 (11,12), latching. A wrong set after all three have moved: tumblers clatter |
| O1 | pit | (4,11) | P2 bridges it |
| P2 | plate (latch) | (4,9) | bridge O1: "A stone bridge grinds up out of the pit." |
| O2 | trapdoor | (5,10) | falls |
| N6 | inscription | (3,9) N | "I HAVE TEETH, YET NEVER BITE. I TURN, YET HAVE NO FEET. GIVE ME WHAT OPENS, AND I OPEN." |
| AL3 | riddle alcove | (2,9) W | accepts any item of kind `key`; open G6 (2,8), return the item. "The alcove takes the key, turns it, and gives it back. Far off, a gate rises." |
| P3 + P4 | plates (all, latch) | (2,5), (4,5) | open G7 (6,5): "With a loud CLACK, the gate locks open." |
| N7 | inscription | (8,5) N | "THE GUILD VAULT. WHAT IS SEALED BY ART, ART UNSEALS." |
| M1 | magic seal | (10,6) | Unlatch (spell, scroll or wand): "The runes unravel like smoke." |
| AL4 | altar alcove | (14,6) E | holds `brassWard` |
| SH1 | Shrine of the Threshold | (12,5) N | ✕ raises one dead member, once: "The shrine's key turns. Cobb draws breath." |
| torches | | (10,1) N, (20,4) E, (9,13) W, (11,8) S | forge glow lights in the Workshop |

**Items:**

| Where | Items |
|---|---|
| Workshop | (9,1) tumblerGear I; (12,3) gearKey; (11,3) warhammer; (8,1) scroll featherStep; (10,3) guildLedger; (8,2) ration ×2 |
| Clock Hall | (16,4) scroll unlatch; (20,3) potionHealing |
| Endless Hall | AL2 holds tumblerGear II |
| Spinner Room | (20,15) tumblerGear III; (17,15) chainShirt |
| Lock Room and cell | (13,15) ironShield; (9,15) tumblersPick; (13,13) ration; (11,11) tumblerGear IV (Durgan hands it over) |
| trapdoor passage | (6,10) potionGreaterHealing (the trapdoor's bait) |
| Pit Run | (4,13) rock; (5,14) rock |
| Riddle | (3,9) bentKey |
| Weight Hall | (5,7) ironIngot; (1,7) wandUnlatching (3 charges); (1,4) ration ×2 |
| Guild Vault | (12,8) scroll frostbite; (11,5) scrollRaising; (13,5) lockbreaker; (14,5) ironRation |

**Monsters:**

| Area | Monsters |
|---|---|
| Workshop | (10,2) Tinker Skeleton ×2; (11,1) Rustling ×3 |
| Clock Hall | (18,3) Brass Spider |
| Endless Hall | (19,9) Rustling ×2 (patrol) |
| Spinner Room | (20,13) Brass Spider |
| Lock Room | (12,14) Tinker Skeleton ×2 |
| Pit Run | (4,13) Brass Spider |
| Weight Hall | (3,6) Tinker Skeleton ×2 |
| Guild Vault | (12,6) **Clockwork Sentinel** (drops ringOfWarding) |

Wanderers: Rustling ×2 or Tinker Skeleton ×1, spawning at (10,2), (18,2) or (11,14).

**Events:**
- On arrival, the floor card.
- First entry into the Clock Hall: story `ysolde1` (Ysolde fades in at (18,2) as a translucent rig).
- Entering (11,13), once: story `durgan1`, spoken through the bars.
- G5 opening: story `durgan2`.
- After the Sentinel dies: story `ysolde2`.
- Falling: "The floor gives way!" The party drops to floor 3 at (2,15), with 1d6 to each.
- Down the stairs: the floor card *THE GLOAM DEEPS*.

**Walkthrough:**
1. Clear the Workshop; take Gear I, the gearKey, the warhammer, the scroll and the ledger; read N5.
2. K1; Ysolde; kill the spider; take the unlatch scroll.
3. Endless Hall: take Gear II from AL2; SW2 switches TP1 off.
4. Spinner Room: avoid (18,14) by going (19,13), (18,13), (17,13), (17,14); take Gear III and the chain shirt.
5. D3; clear the Lock Room; LA down, LC down; G5 opens; Durgan joins and hands over Gear IV.
6. (Optional) the clock deed: back through the Endless Hall, with TP1 now off; CN1–CN4; CF gives the Goggles.
7. West: kill the spider; take a rock; from (4,12) facing N throw it, so it lands on P2 and bridges O1.
8. Take the bentKey; read N6; place the key in AL3 (it comes back); G6 opens.
9. Weight Hall: clear it; take the wand; put the ingot on P4 and stand on P3; G7 latches open.
10. Read N7; Unlatch M1 (Odelia's scribed spell, the scroll or the wand).
11. Kill the Sentinel; take the brassWard from AL4; down the stairs.

#### 7.4.3 Floor 3: The Gloam Deeps (24×18)

*"The stone here is black and warm, and it watches you."*

```
    000000000011111111112222
    012345678901234567890123
  0 ########################
  1 #<########....#.......##
  2 #@########....#.......##
  3 #.########............##
  4 #.....####....#.......##
  5 #.....######U##.......##
  6 #.....######>######L####
  7 #.....###.###.###.#.####
  8 #...................####
  9 ###########.#######.####
 10 #########.....##.......#
 11 #########.....##.......#
 12 #############=#######=##
 13 #############.H........#
 14 #...################...#
 15 #.*.####################
 16 #<..####################
 17 ########################
```

**Areas:**

| Area | Cells |
|---|---|
| Ossuary | (1..5, 4..8) |
| **The Seers' Gauntlet** | (6..19, 8), with dodge niches (9,7), (13,7), (17,7) and the side passage (11,9) |
| Lidless Chapel | (15..21, 1..5); the altar is a floor slab at (18,3) |
| Undergate Hall | (10..13, 1..4) |
| Penance Hall | (9..13, 10..11) |
| Veil's cell | (13,13) |
| Veil's tunnel | (15..19, 13) |
| Barracks | (16..22, 10..11) |
| Reliquary | (20..22, 13..14) |
| **Sump** (isolated) | (1..3, 14..16) |

**Stairs:**
- Up (1,1) leads to floor 2's (13,8), facing W.
- Down (12,6) leads to floor 4's (6,11), facing N.
- The Sump's ladder (1,16) leads up to floor 2's (6,10), facing S, the potion cell east of the trapdoor; from there the path runs south to (6,14).
- Arriving from floor 4's up-stair puts the party at (12,4), facing N.

**Features and wiring:**

| Id | What | At | Wire / text |
|---|---|---|---|
| N8 | inscription | (3,4) N | "HERE LIE THE EYELESS, WHO SAW TRUE." |
| L3 | lock (warded) | (19,6) | `boneKey` |
| C1–C6 | candle sconces | C1 (16,1) N, C2 (16,5) S, C3 (18,1) N, C4 (18,5) S, C5 (20,1) N, C6 (20,5) S | `sequence` in order C1 → C6: `robeOfTheLintel` appears on the altar (18,3), deed **SQ3**. A wrong candle: every candle gutters out ("The candles gutter and die."). Each lit candle turns on its pale blue light. |
| N9 | inscription | (11,4) S | "HERE THE GUILD SET ITS WATCHER. COPPER, BRASS AND IRON: THREE WARDS FOR ONE GATE." |
| U1 | the Undergate | from (12,4) facing S | 3 ward keyholes. Each insert is permanent and draws back bolts: copper 2, brass 2, iron 3. With all three it opens: the Undergate moment (§7.3) |
| LV3 | lever | (13,11) E | open G8 (13,12); then story `veil` |
| H2 | secret wall | (14,13) | opens on flag `veilHelped` ("Push where the moss does not grow.") |
| LV4 | lever | (22,10) N | open G9 (21,12) |
| AL5 | reliquary alcove | (22,14) E | holds `ironWard` |
| torches | | (1,6) W, (9,10) W, (16,11) W, (10,1) N | the Gauntlet has none: the Seers' bolts light it |

- **The Seer's Psalm** (an item in the Ossuary) gives the candle order in the source's voice: "*One for the Lid, in the north-west. Two for the Lash, in the south-west. Three for the Iris, north and centre. Four for the Pupil, south and centre. Five for the Lens, in the north-east. Six for the Light, in the south-east.*"

**Items:**

| Where | Items |
|---|---|
| Ossuary | (1,8) boneKey; (5,4) seersPsalm; (2,5) scroll forkedLightning; (4,8) potionAntidote; (3,6) bone ×2 |
| Gauntlet niches | (13,7) heavyCrossbow; (17,7) bolts ×10 |
| Lidless Chapel | (21,5) scroll blazingOrb; (15,1) potionHealing; the altar (18,3) gets robeOfTheLintel from SQ3 |
| Undergate Hall | (13,1) ironRation and wandSparks (8 charges) |
| Penance Hall | (9,11) ration ×2; (13,10) quickstepBoots |
| Barracks | (22,11) wardensBlade; (16,10) potionHealing ×2; (20,10) ration ×2 |
| Reliquary | (20,14) scrollRaising; (22,13) bracersOfDefense; (21,14) ironRation; AL5 holds ironWard |
| Sump | (3,16) ration |

**Monsters:**

| Area | Monsters |
|---|---|
| Ossuary | (4,6) Lidless Hound ×2 |
| Gauntlet | (19,8) Gloam Seer ×2 (keepAway) |
| Lidless Chapel | (18,2) Gazer ×2; (20,4) Gloam Seer |
| Undergate Hall | (11,2) Lidless Hound, asleep |
| Penance Hall | (11,10) Gloam Warden ×2 |
| Barracks | (18,10) Gloam Warden ×2; (21,11) Gloam Warden ×2. On flag `veilRefused`, add (17,11) Gloam Warden ×2. |
| Veil's tunnel | (17,13) Gazer |

Wanderers: Lidless Hound ×1 or Gazer ×2, spawning at (3,6), (11,10) or (19,10).

**Veil's choice** (the story is in §7.9):
- **Help her.** If a place is free she joins; if the party is full she gives the `lidlessWard` amulet. Either way she opens H2, so the tunnel leads straight to the Reliquary and the party can skip the barracks.
- **Refuse her.** `veilRefused` is set: 2 more Wardens join the barracks and H2 stays shut, so the party must fight through and pull LV4.

**Walkthrough:**
1. Ossuary: kill the hounds; take the boneKey and the Psalm (read it), the scroll and the antidote.
2. The Gauntlet, from niche to niche, dodging bolts; kill the Seers at the end.
3. L3; the Chapel: kill the Gazers and the Seer; light C1 → C6 for SQ3 and take the robe.
4. Undergate Hall: read N9; insert copper and brass (2 of 3).
5. Penance Hall: kill the Wardens; LV3; Veil, then help her. H2 opens; the tunnel; AL5 holds the ironWard.
   - *Refused branch:* the Barracks, LV4, G9, AL5.
6. Insert iron at U1; the Undergate opens; down the stairs.

#### 7.4.4 Floor 4: The Eye's Vault (13×14)

*"The air hums like a struck bell."*

```
    0000000000111
    0123456789012
  0 #############
  1 ###.......###
  2 ###.#...#.###
  3 ###...B...###
  4 ###.#...#.###
  5 ###.......###
  6 ######=######
  7 ####.....####
  8 ####.....####
  9 ######.######
 10 ######.######
 11 ######@######
 12 ######<######
 13 #############
```

**Areas:**
- the Approach (6, 9..10);
- the Golem Antechamber (4..8, 7..8);
- the Vault Door G10 (6,6);
- **the Arena** (3..9, 1..5), with pillars at (4,2), (8,2), (4,4) and (8,4): they are wall cells that block lightning and the Gaze;
- the Bolt-Holder over (6,3).

**Stairs:** up (6,12) leads to floor 3's (12,4), facing N.

**Features:**

| Id | What | At | Wire / text |
|---|---|---|---|
| N10 | inscription | (4,8) W | "BEYOND WAKES THE WATCHER. TURN ITS LOCKS, AND IT IS BLIND." |
| G10 | Vault Door (gate) | (6,6) | opens when `golemA` and `golemB` are killed: "The Vault Door grinds open." |
| GL1 | Great Lock West | (3,3) W | turning it takes 2 s |
| GL2 | Great Lock East | (9,3) E | |
| GL3 | Great Lock North | (6,1) N | after the boss dies it becomes **the Stair to the Light**; ✕ there starts the ending |
| torches | | (8,7) E, (4,7) W | plus the locks' rune lights |

**Monsters:** the Approach (6,9) Gazer ×2; the Antechamber (5,7) **Lockjaw Golem** `golemA` and (7,7) `golemB`; the Arena (6,3) **the Bolt-Holder** (§4.7.4).

**Events:**
- First step into (6,5): the boss intro. The camera tilts up to the Eye, the barks `eye1` and `eye2` play, and the boss music starts.
- Cage open: `eye3`. Phase 3: `eye4`. Death: `eye5`, then the `eyeDeath` moment (the Eye cracks, the bolts fly, white-out), then GL3 becomes the stair.
- Autosave after the boss.

**Walkthrough:**
1. Kill the Gazers.
2. Read N10.
3. Kill both golems; G10 opens.
4. The Arena: turn GL1, GL2 and GL3 between attacks, using the pillars against the lightning; then fight the exposed Eye; re-turn the relocked lock.
5. ✕ at GL3: the ending.

### 7.5 The Rat Run (race floor, 14×12; hub ghost race and solo time trial)

```
    00000000001111
    01234567890123
  0 ##############
  1 #....L...###>#
  2 #....###.###.#
  3 #....###.###.#
  4 #....###.###=#
  5 #....###.P...#
  6 #=######.....#
  7 #.#.##.#######
  8 #.#.##.#######
  9 #......#######
 10 #@############
 11 ##############
```

- **Start** at (1,10), facing N. The party is the premade four at level 2 (Odelia with Spark Dart ×2, Cobb with Mend ×2). Hunger and camp are off.
- **The route:**
  1. Lever RLV at (1,8) E opens gate RG1 (1,6).
  2. The Rat Room (1..4, 1..5) holds Drain Rat ×3 at (3,3) and ×2 at (2,5). The alcove RAL at (1,2) W holds the `ironKey`.
  3. The lock RL (5,1) takes the ironKey.
  4. The corridor (8,2..4) holds Latchkin ×2 at (8,3).
  5. The Plate Room (8..12, 5..6): put the rock from (11,6) on plate RP (9,5), which opens RG2 (12,4) while it is down.
  6. Exit `>` at (12,1).
- **The side loop** (3,7)–(6,9) holds Drain Rat ×2 at (5,9) and **Rat Crowns** (score coins). There are 6 crowns: (3,7), (6,7), (4,9), (1,1), (4,5) and (10,6).
- **Scoring:**
  - Checkpoints are worth +100 each: lever, Rat Room cleared, key, door, plate.
  - The exit is worth +500 and gives the **time**.
  - Each kill is +10; each crown is +25.
- **The label** is the last checkpoint ("Key found", "Door open", "Escaped!").

### 7.6 Bestiary

Def is the Defense the party rolls against. Atk is added to the monster's d20. Int is the attack interval in seconds and Move is seconds per cell. Sight is in cells. Size is S (1 unit of a cell's 4), M (2) or L (4). XP is split among the conscious members.

| Id | Name | Floor | Size | HP | Def | Atk | Dmg | Int | Move | Sight | XP | Special | Drops |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| rat | Drain Rat | 1, race | S | 4 | 11 | +1 | 1d3 | 1.4 | 0.6 | 4 | 20 | swarms | 10% ration |
| leech | Bloat Leech | 1 | M | 14 | 10 | +2 | 1d4 | 2.4 | 1.4 | 3 | 60 | heals itself by the damage it deals | — |
| latchkin | Latchkin | 1, race | S | 7 | 12 | +2 | 1d4 | 1.8 | 0.7 | 5 | 40 | 15% of hits steal a non-quest pack item, then it flees 6 s; it flees below 25% HP | what it stole; 30% darts ×3; 10% spear; 5% paddedJerkin |
| ooze | Drain Ooze | 1 | M | 18 | 8 | +2 | 1d6 | 2.6 | 1.6 | 3 | 70 | blunt does ½; a hit corrodes body armour −1 (−2 at most) | — |
| ratknot | Rat Knot | 1 | M | 22 | 11 | +3 | 1d6 | 1.8 | 1.0 | 4 | 120 | bites 2 members a strike | ratKingsCrown (placed) |
| snick | Snick, the Latch-Boss | 1 | M | 40 | 13 | +4 | 1d8+1 | 2.0 | 0.8 | 6 | 400 | at 50% HP calls 2 Latchkins; barks | copperWard, drainwardensKey, amuletOfVigor |
| skeleton | Tinker Skeleton | 2 | M | 16 | 12 | +3 | 1d6 | 2.0 | 1.0 | 5 | 60 | undead; immune to Sleep, Hold and Poison; blunt does ×1.5 | 20% handAxe |
| rustling | Rustling | 2 | S | 6 | 14 | +2 | 1d2 | 1.6 | 0.7 | 4 | 45 | 25% of hits rust a metal main-hand weapon (−2 damage, −4 at most) | — |
| spider | Brass Spider | 2 | M | 22 | 13 | +4 | 1d6 | 1.5 | 0.6 | 5 | 110 | 30% of hits poison | 25% potionAntidote |
| sentinel | Clockwork Sentinel | 2 | L | 50 | 16 | +5 | 2d6 | 2.8 | 1.6 | 5 | 350 | construct: immune to Sleep, Hold, Poison and Turn; lightning does ×1.5; 0.8 s wind-up | ringOfWarding, potionGreaterHealing |
| hound | Lidless Hound | 3 | M | 20 | 13 | +5 | 1d8 | 1.3 | 0.5 | 6 (hearing) | 120 | always aware within 6 cells | — |
| seer | Gloam Seer | 3 | M | 18 | 12 | +3 | 1d4 | 2.2 | 1.0 | 6 | 180 | casts a **Locking Bolt** (projectile, 2d6, 6 cells) every 6 s in line; a **Hold** (1 member, 6 s, save) every 12 s; keepAway at 3 | 30% staff; 20% potionHealing; 15% elixirClarity |
| warden | Gloam Warden | 3 | M | 26 | 15 | +6 | 1d10 | 2.2 | 0.9 | 5 | 150 | reach: strikes from 2 cells in a clear line | 25% glaive; 15% studdedLeather |
| gazer | Gazer | 3, 4 | S | 10 | 14 | +4 | 1d3 | 2.0 | 0.8 | 5 | 90 | flies; **Spark Gaze** (1d6, ranged, line of 3 or less) every 3 s | — |
| golem | Lockjaw Golem | 4 | L | 60 | 17 | +7 | 2d8 | 3.0 | 1.8 | 5 | 400 | construct; lightning ×1.5, blunt ×1.25 | golemA: potionGreaterHealing |
| boltholder | The Bolt-Holder | 4 | L | 320 | 15 | +8 | see §4.7.4 | 3.5 / 2.8 / 2.2 | drift 4 s | all | 3000 | phases, locks, absorbs lightning | — |

**Balance targets** (the bot measures them, §14). On Normal, with the premade party plus the NPCs:
- a single Drain Rat dies to one or two hits;
- a fresh party survives the first Rat Channel fight above 60% HP;
- Snick takes 20 to 40 s and is the first time a member is likely to go Down;
- the Sentinel takes 30 to 60 s;
- the boss takes 2.5 to 5 minutes.
- The party should use 1 to 3 potions and 1 to 2 rests per floor.

### 7.7 Items

Speed is the cooldown in seconds. Classes are F (Fighter), P (Paladin), R (Ranger), C (Cleric), M (Mage) and T (Thief). Two-handed is 2H. Defense values are "+n".

**Weapons:**

| Id | Name | Stats | Classes | Found | Description |
|---|---|---|---|---|---|
| rustyDagger | Rusty Dagger | 1d3, 1.2, throwable | all | f1 (2,13) | "Pitted and dull, but sharper than your fingernails." |
| dagger | Dagger | 1d4, 1.2, throwable | all | Mage start, drops | "A plain blade. It goes where you put it." |
| shortSword | Short Sword | 1d6, 1.6 | F P R T | f1 (3,2); Ranger and Thief start | "Short enough for a drain, long enough for a rat." |
| longSword | Long Sword | 1d8, 2.0 | F P R | Fighter and Paladin start | "Hasp steel, with a lockwright's mark on the tang." |
| wardensBlade | Warden's Blade | 1d8+2, 2.0, +2 to-hit | F P R | f3 (22,11) | "Black as wet slate. It never seems to dull." |
| handAxe | Hand Axe | 1d6, 1.8, throwable | F P R | skeleton drops | "Balanced for splitting kindling, or Latchkins." |
| lockbreaker | Lockbreaker | 1d10+1, 3.0, 2H, +1 to-hit | F P | f2 (13,5) | "A guild axe made for doors that would not open. It does not argue." |
| mace | Mace | 1d6+1, 2.0, blunt | F P R C | Cleric start | "Flanged iron on an oak haft. Honest work." |
| copperhandsMaul | Copperhand's Maul | 1d8+1, 2.4, blunt | F P C | Durgan's | "Dwarf-forged. The copper bands are for luck, and for weight." |
| warhammer | Warhammer | 1d6+1, 2.4, blunt | F P R C | f2 (11,3) | "Half tool, half argument." |
| staff | Quarterstaff | 1d6, 1.8, 2H, blunt | all | Seer drops; Veil's | "Ash, iron-shod at both ends." |
| spear | Spear | 1d6, 2.2, **reach**, throwable | F P R T | Latchkin drops (10%) | "Long enough to reach past a friend." |
| glaive | Glaive | 1d10, 2.8, 2H, **reach** | F P R | Warden drops | "A Warden's polearm, its blade etched with a shut eye." |
| tumblersPick | Tumbler's Pick | 1d6+1, 1.8, ×2 vs constructs | F P R T | f2 (9,15) | "A locksmith's pick-hammer. Clockwork hates it." |

**Missile weapons and ammo:**

| Id | Name | Stats | Classes | Found | Description |
|---|---|---|---|---|---|
| sling | Sling | 1d4, 2.0, ammo slingStones | all | f1 (1,5) | "Leather and string. Older than locks." |
| shortBow | Short Bow | 1d6, 1.8, ammo arrows, 2H | F P R T | Ranger start (in pack) | "Elf-made, light as a thought." |
| lightCrossbow | Light Crossbow | 1d8, 2.6, ammo bolts, 2H | F P R T | f1 (20,1) | "Wound by a crank. Someone loved this, before the Latchkins." |
| heavyCrossbow | Heavy Crossbow | 1d10+1, 3.4, ammo bolts, 2H | F P R | f3 (13,7) | "It punches through mail, and patience." |
| darts | Darts | 1d3, 1.2, thrown, stack | all | f1 (5,1); Thief start | "Little iron wasps." |
| slingStones / arrows / bolts | ammo | stack 30 | — | f1 (1,5) ×12; Ranger ×20; f1 (20,2) ×12, f3 (17,7) ×10 | "Bolts: the city's other export." |

**Armour and wearables:**

| Id | Name | Stats | Classes | Found | Description |
|---|---|---|---|---|---|
| travellersRobe | Traveller's Robe | body +0 | M | Mage start | "Many pockets, all of them full of crumbs." |
| paddedJerkin | Padded Jerkin | body +1 | all | Latchkin drops (5%); Veil's | "Quilted, and quietly proud of it." |
| leatherArmor | Leather Armour | body +2 | F P R C T | starts; f1 (13,1) | "Boiled, stitched and smelling of both." |
| studdedLeather | Studded Leather | body +3 | F P R T | Warden drops (15%) | "Leather with ambitions." |
| chainShirt | Chain Shirt | body +4 | F P R C | Paladin start; f2 (17,15) | "Ten thousand little rings, all of them cold." |
| scaleMail | Scale Mail | body +5 | F P C | Durgan's | |
| robeOfTheLintel | Robe of the Lintel | body +2, +1 INT, +1 level-1 slot | M | f3, SQ3 | "Embroidered with doors. Every door is open." |
| buckler | Buckler | shield +1 | F P R C T | Durgan's | |
| woodenShield | Wooden Shield | shield +1 | F P C | Fighter and Paladin start | |
| ironShield | Iron Shield | shield +2 | F P C | f2 (13,15) | |
| leatherCap | Leather Cap | head +1 | F P R C T | f1 (3,8) | |
| ironHelm | Iron Helm | head +1 | F P R C | Durgan's | |
| ratKingsCrown | Rat King's Crown | head +1 | all | f1 lair | "Twisted tin, worn by something with too many tails." |
| tumblerwrightsGoggles | Tumblerwright's Goggles | head +0; always **Seeing** (secrets and traps glint) | all | f2, SQ2 | "The world's seams show plainly through them." |
| lidlessWard | Lidless Ward | neck: immune to Hold and Gaze | all | f3, Veil | "Shaped like a shut eye. What it cannot see cannot hold you." |
| amuletOfVigor | Amulet of Vigor | neck: +1 CON | all | f1, Snick | |
| bracersOfDefense | Bracers of Defense | arms +2 | all | f3 (22,13) | |
| ringOfMending | Ring of Mending | 1 HP every 30 s | all | f1, SQ1 | "Warm, as if someone just took it off." |
| ringOfWarding | Ring of Warding | +1 Def, +1 saves | all | f2, Sentinel | |
| quickstepBoots | Quickstep Boots | cooldowns −10% | all | f3 (13,10) | |

**Consumables and readables:**

| Id | Name | Effect | Found |
|---|---|---|---|
| ration | Ration | +50 food | 14 placed (f1: 4, f2: 5, f3: 5), plus one each at the start and rat drops |
| ironRation | Iron Ration | +100 food | 4 placed: f1 (20,12), f2 (14,5), f3 (13,1), f3 (21,14) |
| potionHealing | Potion of Healing | 2d4+2 | 6 placed (f1 (8,3), (19,10); f2 (20,3); f3 (15,1), (16,10) ×2), plus Seer drops |
| potionGreaterHealing | Potion of Greater Healing | 4d4+4, wakes a Down member | f2 (6,10); the Sentinel's and golemA's drops |
| potionAntidote | Antidote | cures poison | f3 (4,8) and drops |
| elixirClarity | Elixir of Clarity | restores 1 spent slot of the highest level | Seer drops (15%) |
| scroll ×9 | Scroll of *spell* | a mage casts it or scribes it | §7.4 |
| scrollRaising | Scroll of Raising | a cleric or paladin reads it: Raise from Rest | f2 (11,5), f3 (20,14) |
| wandUnlatching | Wand of Unlatching | Unlatch, 3 charges, anyone | f2 (1,7) |
| wandSparks | Wand of Sparks | Spark Dart (2 darts), 8 charges | f3 (13,1) |

**Tools, keys, wards, quest items, lore and junk:**

| Id | Name | Effect | Found |
|---|---|---|---|
| lockpicks | Lockpicks | 6 uses; a failed pick snaps one | Thief start, Tamsin |
| holySymbol | Key of the Threshold | a cleric's holy symbol | Cleric start |
| veilsLantern | Veil's Lantern | a holy symbol | Veil's |
| spellbook | Spellbook | holds known spells | Mage start |
| ironKey / drainwardensKey / gearKey / boneKey / bentKey | keys | as wired | §7.4 |
| copperWard / brassWard / ironWard | the Three Wards | the Undergate | §7.4 |
| tumblerGear (I–IV) | Tumbler Gear | the clock deed | f2 |
| tornPage / guildLedger / seersPsalm | notes | lore and hints (§7.9) | f1 (6,14), f2 (10,3), f3 (5,4) |
| rock / ironIngot / bone | junk | heavy things for plates | §7.4 |
| ratCrown | Rat Crown (coin) | race score | race |

### 7.8 Spells

Arcane spells come from the spellbook and its scrolls. Prayers are to the Warder of Thresholds, the city's god of doors. The numbers are × ★spell power.

| Id | Name | Kind and level | Target | Effect | Look |
|---|---|---|---|---|---|
| sparkDart | Spark Dart | arcane 1 | line | 1 + ⌊lvl/2⌋ darts (3 at most), each 1d4+1, always hitting the first monster within 6 cells | violet-white glows, sparks |
| wardOfBrass | Ward of Brass | arcane 1 | member | +3 Def until it absorbs 8 + lvl damage, or until rest | brass shimmer on the card |
| findSeams | Find Seams | arcane 1 | party | 90 s of Seeing | gold outlines |
| slumber | Slumber | arcane 1 | front | sleep 20 s: living S and M monsters, an HP pool of 10 + 3×lvl, lowest first | drifting z's |
| unlatch | Unlatch | arcane 2 | door | opens a magic seal or a simple lock | a ghost key turns |
| frostbite | Frostbite | arcane 2 | front | 2d6 cold to all in the front cell, and Slowed 10 s | blue shards, a frost ring |
| featherStep | Feather Step | arcane 2 | party | 120 s of Floating | the view rises 3 units; wind |
| forkedLightning | Forked Lightning | arcane 3 | line | 3d6 (+1d6 per level above 5) to every monster along 5 cells; it bounces back once off a near wall and never hurts the party; **it heals the Bolt-Holder** | jagged cyan bars, a flash |
| blazingOrb | Blazing Orb | arcane 3 | line | at the first monster cell or wall: 3d6 + lvl fire to all there, half to the 4 neighbouring cells' monsters | an orange orb, an explosion, a light flash |
| mend | Mend | prayer 1 | member | heals 1d8 + 1 + ⌊lvl/2⌋; wakes a Down member | green glints |
| steadyHand | Steady Hand | prayer 1 | party | +1 to-hit and saves, 60 s | a golden hand icon |
| turnDead | Turn the Dead | prayer 1 | front | undead flee 12 s; undead with HP ≤ 2×lvl crumble | a white flare |
| purge | Purge Venom | prayer 2 | member | cures poison and heals 1d4 | |
| holdFast | Hold Fast | prayer 2 | front | humanoids are Held 10 s (25% save) | golden chains |
| loaves | Loaves of the Hearth | prayer 2 | party | all food to 100 | bread, a warm glow |
| greaterMend | Greater Mend | prayer 3 | member | heals 3d8 + lvl; wakes Down | |
| raise | Raise from Rest | prayer 3 | dead member | back at 1 HP | a rising light |
| freeHinge | Free Hinge | prayer 3 | party | cures Held; immune to Hold and Gaze for 120 s | a hinge sigil on the cards |

### 7.9 The party, the NPCs and their scripts

**The premade party** (Quick Start; also the Rat Run's at level 2):

| Place | Name | Race and class | STR DEX CON INT WIS | HP | Gear | Prepared |
|---|---|---|---|---|---|---|
| 1 | Brannoc Ironside | Human Fighter | 17 12 16 9 10 | 12 | longSword, woodenShield, leatherArmor, ration | — |
| 2 | Ysa Thornfeather | Elf Ranger | 14 17 12 12 13 | 8 | shortSword ×2, leatherArmor, shortBow and arrows ×20 (pack), ration | — |
| 3 | Father Cobb | Dwarf Cleric (beard) | 13 9 16 10 16 | 10 | mace, holySymbol, leatherArmor, ration | Mend ×2 |
| 4 | Odelia Fenn | Human Mage | 8 14 11 17 11 | 4 | dagger, spellbook (Spark Dart, Find Seams, Slumber), travellersRobe, darts ×4, ration | Spark Dart, Slumber |

**The NPCs:**

| Name | Race and class, level | STR DEX CON INT WIS | HP | Gear | Prepared |
|---|---|---|---|---|---|
| Tamsin Pell | Halfling Thief 2 | 10 17 13 13 9 | 12 | dagger, darts ×6, leatherArmor, lockpicks | — |
| Durgan Copperhand | Dwarf Fighter 3 | 17 10 17 11 10 | 28 | copperhandsMaul, buckler, ironHelm, scaleMail | — |
| Sister Veil | Human Cleric 4 | 10 13 12 14 17 | 23 | staff, veilsLantern, paddedJerkin | Mend ×3, Steady Hand, Purge ×2, Hold Fast |

**Scripts** (E.Story nodes; the choices are in brackets):
- **tamsin** (after LV2; she steps out of the cage):
  - "Took you long enough! Three days in a birdcage, and the little latch-thieves poking me with forks."
  - "Tamsin Pell, journeywoman of the Lockwrights. Or I was, before the locks went mad."
  - "You're going down, aren't you? Toward the thing that's doing this. Take me along. I open what your keys can't."
  - **[Join us]** "Then let's go and annoy something big." She joins.
  - **[Go home, Tamsin]** "Suit yourself. Take these. You'll need them more than me." She gives the lockpicks and leaves: "Mind the right channel. That's where they nest."
- **durgan1** (through the bars):
  - "Don't stand there gawping. Those levers on the wall behind you are the Tumbler Lock. My own design, and I'm locked on the wrong side of it."
  - "The creed is carved in the workshop. First falls, second rises, third falls. Can't reach the blasted things from in here."
- **durgan2** (when G5 opens):
  - "Ha! Durgan Copperhand thanks you. The guild's dead and gone, but its halls aren't done with me yet."
  - "Whatever's below took my brothers' work and twisted it. I'd like a word with it. A hammer-shaped word."
  - "And take this gear. Found it in my cell. Looks like it belongs to the big clock."
  - **[Come with us]** He joins.
  - **[Find your own way out]** "Hmph. Then luck to you." He leaves; the gear is given either way.
- **ysolde1** (the Clock Hall):
  - "Living feet, in the Tumbler Halls. It has been a long time."
  - "I was Guildmistress Ysolde Vane. We forged the Watcher for the Undergate: an eye that would never close, for a lock that must never open."
  - "We gave it seven Great Bolts to hold. And it learned to love holding. Now it holds the whole city, one lock at a time."
  - "Three Wards open the Undergate: copper, brass and iron. Ours, the brass, sleeps in the Guild Vault. What is sealed by art, art unseals."
  - "And if you would do an old woman a kindness, the Great Clock has lost its four gears. Let it tell the hour once more."
- **ysoldeHint** (a whisper): "The guild hid its catches in plain sight. Look to the walls."
- **ysolde2** (after the Sentinel): "Close its eye, little keys. Close it for all of us." She fades.
- **veil** (after LV3):
  - "Do not look at me so. Your eyes are loud, surface-folk."
  - "I am Veil, once a Seer of the Lidless. I shut my eyes to the Watcher's voice, and for that they chained me here to be… corrected."
  - "You seek the Iron Ward. The Wardens keep it in the Reliquary, past their barracks. There is another way. I know the stones that move."
  - "Take me from this place and I will show you. Leave me, and pray the Wardens are asleep."
  - **[We will help you]** If a place is free: "Then I walk with you." If the party is full: "Then take this. It kept me sane." (the `lidlessWard`). Either way: "Push where the moss does not grow." H2 opens and `veilHelped` is set.
  - **[Stay here, seer]** "Then go with your eyes open. It will find you." `veilRefused` is set.
- **Snick's barks:**
  - `snick1`: "MINE! All the shiny bolts are MINE!"
  - `snick2`: "Latchkins! To your king!"
  - `snick3`: "…not… fair…"
- **The Bolt-Holder's lines:**
  - `eye1`: "Little keys. You have come so far, only to be turned."
  - `eye2`: "Every lock is a promise. I KEEP THEM ALL."
  - `eye3`: "You… unbolt… ME?"
  - `eye4`: "Then be locked in the dark FOREVER!"
  - `eye5`: "Who… will keep… the promises…?"
- **The notes:**
  - **tornPage**: "…they take the bolts, all the iron, every nail and hinge, down the right channel to HIM. Snick says HE pays in shiny. Snick says HE sees everything…"
  - **guildLedger**: "Tumbler Lock, cell 4: the creed governs it. Undergate wards: copper to the Drainwarden, brass to the Vault, iron to the Lidless, who swore to keep it. Watcher: bolts tested, seven of seven. God help us if it learns to like it."
  - **seersPsalm**: the candle order (§7.4.3).

---

## 8. Dev Mode (from the pause menu; hidden in hub sessions)

- **The panel** is a 10-foot list in the game's own style.
  - L1 and R1 switch tabs; up and down move between rows; left and right change a slider (hold to speed up).
  - ✕ toggles or runs a row, □ resets the row, △ resets the page, ○ goes back.
  - The mouse drags sliders and clicks toggles.
- **Storage.** Changes apply live and persist in storage key `boltholder.dev`. **Reset to defaults** is a row at the top of Tuning.

| Tab | Rows |
|---|---|
| **Tuning: Combat** | Party damage × (0.25–4, default 1) · Party to-hit (−5…+10, 0) · Attack cooldown × (0.25–3, 1) · Spell power × (0.25–4, 1) |
| **Tuning: Monsters** | Monster HP × (0.25–4, 1) · Monster damage × (0.25–4, 1) · Monster interval × (0.25–3, 1) · Sight (1–10 cells, 5) · Wind-up (0.1–1.5 s, 0.5) · Re-engage delay (0–2 s, 0.6) · Boss HP × (0.25–4, 1) · Loot chance × (0–3, 1) |
| **Tuning: Exploration** | Step time (0.05–0.6 s, 0.28) · Turn time (0.05–0.5 s, 0.2) · Throw range (1–8, 4) · Trap damage × (0–4, 1) · Button window (2–15 s, 6) |
| **Tuning: Survival** | Hunger rate × (0–5, 1) · Rest heal × (0–5, 1) · Rest interruption (0–50%, 4) · XP gain × (0–5, 1) · Time in menus (0–1, 0.25) |
| **Cheats** | God mode · Infinite spells · No cooldowns · No hunger · One-hit kills · Noclip · Reveal map · Show secrets · Freeze monsters · Give all keys and wards |
| **Warp** | floor ◀ ▶, then that floor's named waypoints (data: `waypoints` in each floor, e.g. "F1 Start", "F1 Latchkin Den", "F1 Snick's Hall", "F1 Cistern", "F2 Landing", "F2 Clock Hall", "F2 Endless Hall", "F2 Lock Room", "F2 Weight Hall", "F2 Vault", "F3 Ossuary", "F3 Gauntlet", "F3 Chapel", "F3 Penance", "F3 Barracks", "F3 Undergate", "F4 Antechamber", "F4 Arena", "Rat Run") · Next floor · Boss · Ending |
| **Party** | Heal all · Revive all · +1 level for everyone · Max food · Give item (by category) · Learn every spell · Fill every slot · Add NPC (Tamsin, Durgan, Veil) · Reset to the premade party |
| **Spawn** | monster type ◀ ▶, then Spawn in front (group size ◀ ▶) · Kill all on this floor · Clear wanderers |
| **Debug** | Overlays: cell and facing; monster AI states and timers over each monster; wiring lines on the automap; sim time per step; the last 20 events · **Auto-play to floor end** (the walkthrough bot, with or without cheats) · Start the attract mode now · Play the intro or ending · Sound test (every sfx, song and voice, with a test line) · Fake hub ghosts (2 dummies walking a loop) |

---

## 9. Attract mode

- **The trigger.** 10.0 s with no input (§5.6) on the title or any of its menus (Load, Rat Run, About). This includes touch-only devices.
- **The `attract` scene** runs a **director of vignettes**. Each vignette is data:

  ```js
  { name, floor, at: [x, y, dir], party: 'demo',
    cheats: { god: true, infiniteSpells: true, noHunger: true, noclip: false },
    steps: [ bot commands ], seconds }
  ```

  - The `demo` party is the premade four at level 5 plus Tamsin and Durgan, knowing every spell, with good gear.
  - The steps use the same commands as players (§3.5), so the bot is the one in `72-bot.js`.

| # | Vignette | What it shows | About |
|---|---|---|---|
| 1 | The Drains | take the dagger; LV1 and the gate rising; into the Rat Channel; Party Strike on the rats (damage pops); read N1 | 18 s |
| 2 | Latchkins | the Den fight; LV2; Tamsin's lines typing with babble (auto-advancing) | 16 s |
| 3 | Stones and plates | the rock put down on P1, G2 rising; walking through I1 (the dissolve) | 14 s |
| 4 | Spellcraft | Spark Dart down a corridor, Mend on a card, Blazing Orb on skeletons (f2 Workshop) | 14 s |
| 5 | The Party screen | it opens; the focus moves; a sword is equipped; the automap opens and closes | 12 s |
| 6 | Clockwork | the Sentinel fight with Forked Lightning (×1.5) | 14 s |
| 7 | The Gauntlet | ducking Seer bolts into the niches | 14 s |
| 8 | The Bolt-Holder | a Great Lock turned, Chain Lightning dodged behind a pillar, Bolt Rain, the cage opening | 22 s |
| 9 | Title | the logo and "Press any button" | 5 s |

- **The loop.** After vignette 9 it starts over. A "DEMO" tag sits top left, and "Press [glyph] / any key" blinks at the bottom centre.
- **Any input exits at once.** The input is consumed so the title menu doesn't act on it; the title scene, its music and its camera come back. The demo never writes saves, settings or dev storage, and never touches the player's party.
- **Robustness.** Every vignette is time-boxed. If a step stalls for more than 4 s or throws, the director skips to the next vignette (and logs it in dev builds).

---

## 10. Multiplayer

### 10.1 AI Hub session (`AIHub.active`): the Rat Run ghost race, 1 to 4 players

1. **Boot. Connect first, build second.** The harness gives each copy **about 11 s to say hello** (`connect()`) and **20 s more to call `ready()`**. A 3D page reaches the game's module only after three.js and Rapier have downloaded, so:
   - Put a tiny classic script in `<head>`, right after the session client: `window.__hubInfo = (window.AIHub && AIHub.active) ? AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true }) : null;`. It runs during parsing, before any module.
   - The game module then does `const info = await window.__hubInfo`. Events that arrive before handlers attach are kept, so nothing is lost.
   - If `info` is `null`, boot normally.
   - In a session, build only the race world and the UI, and skip the title, attract and menus.
2. **Seeding.** Seed every `B.rng` stream from `AIHub.rng('deal')`, so every copy deals the same monsters and rolls at the start.
3. **Our own card** (the `hubcard` scene, drawn over the race floor's first view) shows:
   - the logo and "THE RAT RUN";
   - the goal, "Fastest party out of the Rat Run wins";
   - the controls, with glyphs for this device;
   - every player in their seat colour (`info.players[i].color`) with a ✓ when ready (`card.ready`);
   - "Ready ✕ / Enter · More time △" and the countdown (`card.left`).

   ✕ or Enter sends `AIHub.answer('ready')`; △ sends `AIHub.answer('more')`, and pressing it again takes it back. The card has no menus or choices, and any randomness on it comes from `AIHub.rng('card')`.
4. **Ready and start.** Call `AIHub.ready()` as soon as the race sim and its `World3D` exist, with no key press; `prepare()` may finish during the card's countdown. On `start`, show the countdown 3-2-1 from the negative `AIHub.time()`; input unlocks at 0. Measure this in M0 and M6 with `players=4`. On this machine's SwiftShader, aim for hello under 3 s and ready under 12 s.
5. **During the run.**
   - Every 100 ms, `AIHub.send({ t: 'g', area: 'race', cx, cy, dir, x, y, yaw, cp, hp }, { reliable: false })`.
   - About once a second, `AIHub.progress({ score, label })`.
   - **Ghosts** are the others' cloaked rigs in their seat colours, with name tags drawn with `E.font` (never as HTML). They are lerped to the reported positions, shown when the `area` matches, and never block or affect anything.
6. **Finishing.** Reaching `>` sends `AIHub.result({ time: Math.round(AIHub.time()), stats: { Kills, Crowns } })` and `send({ t: 'done', time })`. The screen shows "Escaped in 01:42.3. Waiting for the others."
7. **A wipe** sends `result({ score })` once and shows "Your party fell. The others run on."
8. **`time-up`** sends `result({ score })` if nothing was sent yet. **`leave`** removes that ghost. **`end`** clears and locks the input, stops the music and sfx, and shows the reason; the hub draws the results.
9. **The rules in a session.**
   - No saves, no Dev Mode.
   - The pause menu shows only Resume, Settings and Controls.
   - No `alert`, `confirm`, `prompt` or `window.open`, and no network but the hub.
   - Options is ignored while Create is held.
   - `<meta name="hub:session-minutes" content="4">`.

### 10.2 On its own

- **Rat Run from the title** is the same race, solo, on the local clock (the code is shared in `73-hub.js`, with its clock and ghost source swapped).
- **The best-run ghost.** The best time and a 10 Hz trail of `{ t, cx, cy, dir }` are kept in storage `boltholder.ratrun`, and the trail runs beside you as a **golden ghost**.
- **The results** show time, best, crowns and kills, with Run again and Title.
- The campaign is single-player.

---

## 11. About and Credits, and the final report

- **The About and Credits screen** opens from the title and the pause menu. Its pages are switched with L1 and R1 and scrolled with the d-pad:
  1. **The game:** the title, the tagline "A thousand locks. One eye.", the version and the build date.
  2. **Source Information:** every field of TASK.md's list (Date, Source, Plan, Genre and Perspective, Tech, Art Direction, Animation, Audio, Online, Testing, Research, Environment, Model, Usage).
  3. **Testing Feedback** (4 answers).
  4. **Engine Feedback** (6 answers).
  5. **Prompt Feedback** (4 answers).
  6. **Credits:**
     - the game by (your model);
     - the engine: my-3D2dge (MIT);
     - three.js (MIT), Rapier (Apache-2.0), the AI Hub session client;
     - any store asset sets used (Kenney, KayKit, ambientCG, CC0);
     - "Inspired by Eye of the Beholder (Westwood Associates / SSI, 1991). No names, text or assets from it are used."

  Write "unknown" for anything you can't confirm.
- **One source of truth.** Keep the text in `14-data-text.js` as `B.ABOUT`. `tools/build.mjs` writes `exit-interview.json` from that same object and checks that it parses. Your chat reply copies the same text.
- **Prefilled values** (confirm or replace them with your own run's facts):

  | Field | Value |
  |---|---|
  | Source | Eye of the Beholder (Westwood Associates / SSI, 1991; MS-DOS and Amiga) |
  | Plan | `PLAN.md` |
  | Genre and Perspective | real-time, first-person, grid-based party RPG dungeon crawler; a first-person party view with tweened steps and quarter turns, plus a top-down automap |
  | Tech | my-3D2dge v0.85.2 (the 2D engine from `dist/handoff`) and my-3D2dge 3D v0.85.2 (three.js r182 WebGPU / WebGL 2 and Rapier 0.19.3, via jsDelivr); AI Hub session client 1.4.0; Node 24 and Playwright 1.63.0 for the tests; plain JavaScript in one HTML file |
  | Art Direction | the engine's native retro-modern look: code-drawn low-res 3D (pixel resolution, toon light, outlines, fog), rigs as pixel-art cards, procedural textures, pen-drawn creatures and mechanisms, a brass "lockwork" UI |
  | Animation | the engine's procedural rigs and moves (E.Humanoid, E.Blob, E.MOVES), a tweened first-person camera, pen-animated creatures and mechanisms, first-person weapon overlays |
  | Audio | the engine's chip synth (step-sequencer music with combat layers and stings, synthesized sfx); voices from a custom WebAudio formant babble synth (Animalese/Simlish style) |
  | Online | AI Hub Session Protocol v1, ghost mode, 1 to 4 players (the Rat Run); a solo time trial against the local best ghost |
  | Testing, Research, Environment, Model, Usage | your run's facts (the planning research is §1 of this plan) |

- **`exit-interview.json`** (in the root, exactly TASK.md's shape). The `aiHub` part:

  ```json
  "aiHub": { "name": "Eye of the Bolt-Holder", "tagline": "A thousand locks. One eye.",
    "description": "A real-time, first-person party dungeon crawl beneath Hasp, the City of a Thousand Locks: four floors of drains, clockwork halls and eye-cults, levers, plates and keys, spells memorized at camp, and the caged Eye that holds the city's bolts.",
    "type": "Game", "genre": "RPG", "source": "Eye of the Beholder (1991)", "series": "Eye of the Beholder", "players": "1–4",
    "controls": "Stick/WASD move · D-pad/Q E turn · ✕/F use · □/Space strike · L2 R2/1-6 hands · △/I party",
    "tags": ["3d", "first-person", "fantasy", "retro", "exploration", "boss fights"] }
  ```

  Fill `sourceInformation`, `testingFeedback` (4), `engineFeedback` (6) and `promptFeedback` (4) as plain text. Check it with `node -e "JSON.parse(require('fs').readFileSync('exit-interview.json','utf8'))"`.

---

## 12. Build order and milestones

Each milestone ends **shippable**: it builds, the one command passes and nothing half-done is visible. Build floor 1 completely before starting floor 2. The percentages are the rough share of effort.

| # | Milestone | Build | Exit criteria (tests in §14) |
|---|---|---|---|
| **M0** | Foundation and spikes (10%) | Fetch (§3.2); folder skeleton; `tools/build.mjs`; `tests/run.mjs` with the Node harness and one browser smoke; `NullView`. Spikes: (a) the bundled page boots from `file://` to a corridor of floor 1's geometry; (b) THINGS: lever, button, catch, alcove with items, keyhole, plaque, `wallBlock` (it must match the level walls) and the illusion pass-through; (c) a pen creature (the leech) and a boss sketch; (d) `babble.plan` plus a playable voice; (e) the hub harness passing against a stub page with our metas | `node tests/run.mjs` green; the bundle opens from disk with no errors; harness `__hubCheck.pass` on the stub |
| **M1** | The dungeon (15%) | `15-data-floors.js` (all 5 maps and tables, §7.4); the floor loader; movement; every feature in §4.2 with wiring; stairs and pits between floors; the Presenter building all floors (geometry, things, lights, fog); the automap; the log; Examine; Dev Warp, Noclip and Reveal map | content lint plus the walkthrough reachability for every floor; unit tests for every feature; walking all floors by hand with Warp |
| **M2** | The party and the fight (15%) | races, classes, stats, formation; items, inventory, equipment, the Hand (take, put down, throw, place); combat (hands, cooldowns, rows, reach, missiles, Party Strike, statuses); all 16 monster types' minds and their visuals (§6.3); the HUD (§5.2); the glyph painter and prompts; the input map for pad, keys and mouse; the Party screen with focus navigation; first-person weapon overlays | combat maths and AI unit tests; UI-flow tests (Party screen, equipping, prompts per device); a scripted floor 1 fight sequence passes |
| **M3** | Magic, camp, progress (12%) | all 18 spells, the Cast menu and targeting; scrolls, wands, Scribe; Camp: Rest (interruptions, safe rooms), Memorize, Pray, Formation, Eat; food; XP and levels; Down, Dead, Raise; game over; saves (3 slots plus the autosave); character creation; the premade party | **floor 1 is completed by the bot with real rules on Normal**; the save and load round-trip hash; the creation flow test |
| **M4** | Story and the deep floors (18%) | E.Story scripts for all NPCs and barks (§7.9); recruiting and dismissing; Veil's two branches; floors 2–4 content (items, monsters, events, hints, deeds); the Undergate; **the Bolt-Holder** (§4.7.4); intro and ending stages and scripts; per-floor music with fight layers; every sfx; the babble voices | **the full playthrough bot passes, start to ending, on both Veil branches**; every deed is reachable |
| **M5** | The shell (10%) | the title (3D stage, logo, menu); the **attract mode** (§9); **Dev Mode** (§8); Settings (§4.16) including PlayStation and Xbox glyphs; the touch-only notice; About and Credits; game over and ending screens; floor cards | attract tests (start at 10 s, any input exits, every vignette runs); Dev Mode tests (a slider changes behaviour, reset works); the touch notice test |
| **M6** | Multiplayer (8%) | the hub session flow (§10.1) with our own card, ghosts and reporting; the solo Rat Run with the best ghost | the Node hub simulation passes; **the harness passes** for `players=2`, `players=4&latency=150&jitter=50&loss=5` and `&scenario=host-leave` |
| **M7** | Polish and ship (12%) | juice (telegraph clarity, hit-stop on crits, card shakes, ambience); a balance pass with the bot's metrics plus hand play using the Dev sliders; the look review (§14.6) at 1920×1080, 1280×720 and 1024×768; text overflow fixes; About text; `exit-interview.json`; the reply | the whole command green; screenshots reviewed; JSON parses; the bundle is under the deliverable name in the root |

---

## 13. Risks and how to de-risk them

| # | Risk | Why it is risky | De-risk |
|---|---|---|---|
| 1 | The 3D engine is outside the handoff and loads from a CDN | module order, `file://`, an offline viewer | The planning spike proved `file://` with a jsDelivr import map works and matches the vendored checksums. Pin the versions. Show a clear boot error if `E.World3D` is missing. *Optional, only if a reviewer needs an offline file:* inline the libraries as Blob URLs behind an import map injected before any module. |
| 2 | Separating the sim from the 3D world | the kit mixes them; tests need Node | Define the Sim, Presenter and Command interfaces in M0. The `lint` test suite fails if a sim file (`20-`–`31-`) mentions `world`, `World3D`, `document`, `audio` or `Math.random` (the build only warns). Every system gets a Node test. |
| 3 | Secret and illusory walls that must look exactly like the level walls | level walls are baked and instanced | Spike it in M0: `world.box` with the floor's `side` style, compared side by side in a screenshot. If it doesn't match, add `wallBlock` to the 3D engine using the level's wall material (PATCHES.md). Mask the illusion step with a 0.15 s dissolve. |
| 4 | Pen-drawn creatures and the boss take time and can look poor | five bespoke bodies | Prototype the leech in M0 and the boss early in M4. Borrow from the horror kit's dogs. Judge motion with `tools/filmstrip.mjs`. Keep cards (rigs and blobs) for the other 11 types. |
| 5 | The 10-foot UI is complex (paperdoll, backpack, details, spell targeting) | many widgets, three input styles | One geometric focus system; screens as data; UI-flow tests in Node (focus moves, carry and place); screenshots at three sizes. |
| 6 | Real-time balance | swingy fights, wipes | ★Tuning sliders, difficulty multipliers, the bot's balance report (§14.5) every milestone, attack telegraphs and the re-engage delay. |
| 7 | Content volume (4 floors plus a race) | time | Data-driven floors; the lint and walkthrough tests from M1; floor 1 finished before floor 2; cut only side items and dressing, never a system or a floor. |
| 8 | The hub harness running a heavy 3D page (up to 4 iframes on SwiftShader) | it allows about 11 s for hello (`connect`) and 20 s more for `ready()`; it then plays about 6 s of random arrow and WASD keys, calls time-up and wants a `result` within its 5 s grace | Call `connect()` from a classic script in `<head>` before the modules load (§10.1). A session builds only the race world, calls `ready()` before `prepare()` finishes, and uses low 3D resolution and 1 torch shadow. Run the harness at M0 with a stub page carrying the real libraries, and again at M6. |
| 9 | Determinism (saves, bots, hub fairness) | hidden `Math.random`, frame-dependent timing | Our own seeded RNG streams kept in the state; everything in the fixed steps; hash tests twice; the save → load → same-hash test. |
| 10 | Audio | autoplay rules, an extra bus | The engine starts sound after the first input. The babble synth uses `game.audio.ctx` and the patched voice bus. In Node it is silent but `babble.plan` is tested. |
| 11 | Attract mode stalls | bots in a changing game | Vignettes with cheats, time boxes, skip on a stall, a test that runs all of them. |
| 12 | Input semantics (d-pad turns, the stick strafes; the hub's Create+Options) | the engine merges directions | Own action names; raw `padAxes` for the sticks; tests for every mapping; the Create+Options rule test. |
| 13 | Text overflow at 320 px wide (4:3) | long names and descriptions | Layout helpers measure with `E.font.width`; a test lays out every screen at 320×240 and 427×240 and fails on any overflow. |

---

## 14. Testing

### 14.1 The one command

`node tests/run.mjs [suite …] [--fast]`, run from the dev folder.

- It runs every suite in §14.3 by default; `--fast` skips the browser suites, and naming suites runs only those.
- **It prints only failures** (`FAIL <suite>: <check>: <detail>`) and **one final line**: `412 passed, 0 failed · 11 suites · 38.4 s`.
- The exit code is 1 on any failure. Rerun it only after changing the code a suite covers.

### 14.2 The Node harness (as in `game/test.mjs` and `kits/test.mjs`)

- Load `engine/my-3d2dge.js`, then every `src/` file in ORDER, into a `vm` context.
- **Stand-ins:**
  - `window` (the context itself), `addEventListener() {}`, `location { hash: '', search: '' }`;
  - `matchMedia(q) → { matches: q === flags.coarse, addEventListener() {} }`;
  - a Map-backed `localStorage`;
  - `navigator { getGamepads: () => [] }`;
  - `performance`;
  - an `AIHub` stub that is inactive by default.
- `E.World3D` is absent, so the game uses `NullView` and skips the 3D boot steps.
- **Driving it.** `game.advance(seconds)` (exact 1/120 s steps); `game.input.tap(action)`, `hold(action, on)` and `press(code)` (pad and key codes); `input.feed('down' | 'move' | 'up', x, y)` for the mouse.
- **`game.debug`** is the handle the tests read:

  | Member | What it does |
  |---|---|
  | `snapshot()` | scene, floor, cell, dir, the party (HP, food, statuses, cooldowns), nearby monsters, flags, the Hand, the open UI screen and its focus id |
  | `state()` | the full sim state |
  | `hash()` | the state's hash |
  | `cmd(c)` | injects a command |
  | `warp(floor, x, y, dir)` | moves the party |
  | `give(id)` | adds an item |
  | `cheats` | the cheat toggles |
  | `bot` | the walkthrough runner |
  | `layout(screen, W, H)` | every widget's rect, for the overflow test |

### 14.3 Suites and what they check

| Suite | Covers |
|---|---|
| `lint` | Every map is rectangular and walled. Every legend character is known. Every wall feature stands on an open cell facing a wall. Every wire's ids, every item, monster, spell and text id, and every lock and key pair exist. Stairs pair up. **The walkthrough reachability and sealed checks** for every floor and branch (the planning script's logic, §7.4). There is no unused text id, and no `src/` sim file breaks the layer rule. |
| `movement` | steps, turns, strafes, the buffer and repeat; bumps on walls, doors and monsters; the timing of arrival effects; the head-bob setting; stairs and floor cards |
| `features` | each door, gate, lock (key used up, picking, warded refusal), magic seal (spell, scroll, wand), secret wall, illusion, plate (hold, latch, toggle; party, item and monster weight; small monsters don't count), dart trap (and disarm), pit, bridge, trapdoor and landing, teleporter (silent; the loop count and hint; the switch), spinner (seeded), lever, button and its window, catch, alcove (accepts, returns), candles in sequence and the wrong order, Great Locks |
| `items` | equip rules (class, two-handed, quiver stacks); pack moves; the Hand (take from the front or own cell, stow, put down, throw range and landing, a throw onto a plate, into a pit, hitting a monster); use (eat, drink, read, scribe); rust; stolen items returned when the thief dies |
| `combat` | to-hit and damage with a fixed seed (expected values over 10,000 rolls within bands); crits; cooldowns and the DEX scaling; rows and reach; missiles and ammo recovery; Party Strike choosing the right hands; flank and rear targeting; telegraph dodges (a step during the wind-up makes it miss); re-engaging; statuses ticking and curing |
| `monsters` | waking by sight and noise; hunting with A* and flanking around a full cell; keepAway and ranged Seers; fleeing and stealing Latchkins; fliers over pits; cell capacity by size; drops; the boss's phases, locks, relock, absorbing lightning, summons and its attacks' telegraphs and dodges |
| `magic` | every spell's effect and target; slot tables; memorizing and praying persisting; rest refills; scroll casting; wands' charges; the Robe's extra slot |
| `camp` | refusal near enemies; heal per hour; cleric auto-Mend; interruptions (seeded; safe rooms; the wanderer budget); food drain and starving; Eat; level-up timing (at once or on rest) |
| `progress` | XP split and multipliers; thresholds; HP and slots on level-up; deeds; Down and Dead rules; Raise (spell, scroll, shrine); game over; NPCs joining, the full-party path for Veil, dismissing |
| `save` | save at a sample point on each floor, then load: the same `hash()`; the version field; a bad save is refused gracefully |
| `determinism` | the same seed and command script give the same hash twice, and the same again after a save and load mid-script |
| `ui` | title → New Game → Quick Start → skip intro → play. Every screen opens and closes; focus moves by d-pad and by mouse hover; carry and place in the Party screen; Cast targeting; Camp → Rest, Memorize, Formation; Map; Journal; dialogue choices. **Prompts follow the last device** (`label()` and the badges for keyboard, pad and mouse). The **Xbox setting turns ✕ into A**. The pause menu has Dev Mode, which disappears in a session. Text overflow at 320×240 and 427×240. |
| `dev` | each slider changes its system (e.g. Monster HP × 2 doubles a spawned rat's HP); Reset restores every default; every cheat works; Warp to every waypoint; spawning; storage persists |
| `attract` | 10 s idle on the title starts it, 9.9 s does not; each vignette runs to its end with no errors; any key, button, stick or pointer input exits within one step to the title; it doesn't write saves or settings; on the touch flag the notice shows and the attract mode still runs |
| `babble` | `plan()` is deterministic; vowels pick their formants; punctuation sets pauses and contours; profiles differ |
| `hub` (Node) | the stub becomes active, and the test runs the `<head>` connect line itself (`window.__hubInfo = AIHub.connect(…)`, §3.4): the title is skipped; `connect` gets `ghost` and `[1, 4]`; `ready()` is called once with no input; the card answers ready and more; play starts at `time() ≥ 0`; sends stay at 10 Hz or less, unreliable; progress about every second; `result` once on the finish (a time), a wipe or `time-up` (a score); fake messages make ghosts; `leave` removes one; `end` stops input and sound; no Save or Dev Mode in session menus; Options is ignored while Create is held |
| **`playthrough`** | §14.4 |
| `browser` (Playwright) | §14.5 |
| `harness` (Playwright) | §14.5 |

### 14.4 The scripted full playthrough

- **The bot** (`72-bot.js`) reads each floor's `walkthrough` data (§7.4) and plays by the game's real rules through commands. It runs at **Normal, with no cheats**, using the premade party plus every NPC who agrees to join.
- **Its moves:**
  - it paths with A* (doors it may open, pits and trapdoors it must avoid, the spinner it avoids when it can);
  - it faces and uses features, puts items down and throws them;
  - it fights: it faces attackers, uses Party Strike when a hand is ready, sidesteps telegraphed blows when it can, and backs out of Seer lines into niches;
  - it casts usefully: Spark Dart on lines, Mend below 50%, Blazing Orb on groups, Unlatch on the seal, Free Hinge at the boss;
  - it rests when the party is below 60% or out of slots in a safe spot, eats when hungry, drinks below 25%;
  - it takes every deed.
- **The run** goes New Game → floor 1 → 2 → 3 → 4 → ending scene. Then it runs again from a floor 3 save with **Veil refused**.
- **Assertions at each checkpoint:**
  - floor flags, keys, wards and NPCs as expected;
  - the deeds done (3);
  - no wipe;
  - the level pace (§4.10, ±1 level);
  - game time under 90 minutes;
  - no `game.errors`.
- **It writes a balance report** (`tests/out/balance.txt`): each fight's duration and HP lost, Downs, potions, rests, food used and the time per floor. It *fails* only on gross bands: a wipe, a single fight over 3 minutes (the boss: over 6 minutes), or floor 1 cleared without a single member below 70% (too easy).

### 14.5 Browser checks

**Settings.** Playwright 1.63.0 with Chromium 1243, run with `args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-webgpu-adapter=swiftshader', '--disable-vulkan-surface', '--autoplay-policy=no-user-gesture-required']`.

- **`browser`** (the bundled root HTML opened from `file://…html?backend=webgl`):
  - it boots to the title with no `pageerror` or console errors, and no request other than jsDelivr;
  - the 3D view is not blank (the canvas has a spread of colours);
  - Enter → Quick Start → skip the intro → play; `game.debug.snapshot()` shows floor 1 at (2,14);
  - a scripted 20 s walk and fight with no errors;
  - it waits 10.5 s on the title and attract starts, then a key press returns to the title;
  - with `isMobile, hasTouch` (390×844@3), the touch notice is drawn and no touch buttons show;
  - the engine's `tools/check.mjs` also runs on the page with `--seconds 6`, and its errors fail the suite.
- **`harness`.** Copy `hub/harness.html`, `bridge.js`, `round.js` and the bundled HTML into `tests/out/hub/`. Serve that folder with a `node:http` server on `127.0.0.1:0`; this suite starts the server and closes it itself, and it checks that `GET /` of the game returns our `<title>`. Then open:
  1. `harness.html?game=<file>&players=2&auto=1`
  2. `…&players=4&latency=150&jitter=50&loss=5&auto=1`
  3. `…&scenario=host-leave&auto=1`

  For each, wait for `document.body.dataset.complete === 'true'` and require `window.__hubCheck.pass === true`. Print the failing checklist rows on a failure.

### 14.6 Looking (only what scripts can't judge)

- **Screenshots** to `shots/` (by `tests/shoot.mjs`, not part of pass or fail) at 1920×1080, 1280×720 and 1024×768:
  - the title;
  - creation;
  - each floor's signature room;
  - every monster at 1 and 2 cells;
  - the boss in each phase;
  - the Party, Cast, Camp, Map and Journal screens;
  - dialogue;
  - Dev Mode;
  - the attract caption;
  - the touch notice;
  - About.

  Check that walls, secret and illusory blocks look identical, that text is readable at TV distance, that the glyphs are right, and that nothing overlaps the engine's corner button.
- **Filmstrips** with `tools/filmstrip.mjs --seed 1` for:
  - the weapon overlay swings;
  - a monster wind-up and strike;
  - a gate rising;
  - the illusion pass;
  - the boss's bolts sliding;
  - the lightning telegraph.

  Each motion must wind up, act and settle with no snaps.
- **Hand play** with a controller and with keyboard and mouse through floor 1, with the Dev sliders open, to tune the feel.

---

## 15. Definition of done (TASK.md coverage)

| TASK.md asks for | Where in this plan | Done when |
|---|---|---|
| A title riffing on the source, picked by a real RNG | Title (top) | the title screen reads **EYE OF THE BOLT-HOLDER** |
| Genre and perspective that fit | §2 | — |
| A single HTML file plus a dev folder named by the pattern | §0, §3.3, §3.4 | the root `.html` boots from disk |
| Built on the handoff (engine changes allowed) | §1.2, §3.1, §3.9 | PATCHES.md lists every change |
| The engine's native style and animation as the base, with new assets for the source's feel | §6 | the §14.6 review passes |
| Audio in code only, babble voices | §6.5 | no audio files; every speaker babbles |
| AI Hub multiplayer, and the game on its own | §10 | the harness passes; solo play is unaffected |
| A feature-complete demo showing every mechanic, polished | §4, §7 | the playthrough bot passes; every system in the §4 tables exists |
| Dev Mode from the pause menu with live sliders and a reset | §8 | `dev` suite |
| Attract mode after 10 s, any input exits | §9 | `attract` suite |
| Controller-first 10-foot UI; native keyboard and mouse; prompts follow the last device; PlayStation glyphs with an Xbox setting; no dense web screens | §5 | `ui` suite plus the screenshots |
| Touch-only: no touch controls, a notice and the settings button, attract mode runs | §5.7 | `attract` and `browser` suites |
| A writing style like the source's | §7.2, §7.3, §7.9 | — |
| Headless tests, a scripted full playthrough, one command | §14 | `node tests/run.mjs`: 0 failed |
| No TODOs, placeholders or stubs | §0 | grep finds no `TODO`, `FIXME` or `placeholder` in `src/` |
| Source Information and the three feedback sets in the chat reply and the About screen | §11 | About pages filled; the reply copies them |
| `exit-interview.json` in the exact shape, parsing | §11 | the parse check passes |
