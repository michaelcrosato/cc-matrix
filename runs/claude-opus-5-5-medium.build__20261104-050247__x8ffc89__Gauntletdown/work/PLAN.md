# Gauntletdown

*An original, Gauntlet-inspired co-op dungeon crawler for 1–4 players: original heroes, monsters, floors and voices on the my-3D2dge engine, with couch co-op on one screen and online play in AI Hub sessions.*

**Title.** TASK.md asks for a playful riff on the source's name: 50 riffs on "Gauntlet" were brainstormed (Gruntlet, Hauntlet, Gauntlettuce, Dauntlet, Gauntloot, Gauntlore, Gauntlathlon, ...) and one was picked with a real random number generator (Python `secrets.randbelow(50)`, the OS CSPRNG): index 30, **Gauntletdown**. It reads three ways: "throw down the gauntlet" (a challenge), a dungeon that only goes *down*, and a "let-down" for anyone who skips dinner. The whole game is built on those three readings.

**Names (from TASK.md; if your TASK.md gives another model or timestamp, use yours):**

| What | Name |
|---|---|
| Dev subfolder (all dev files) | `Gauntletdown-Gauntlet-claude-opus-5-5-max-20261103-174804/` |
| The deliverable (single file, in this folder's root) | `Gauntletdown-Gauntlet-claude-opus-5-5-max-20261103-174804.html` |
| Exit interview (root, beside the .html) | `exit-interview.json` |
| This plan (for "Plan" in Source Information) | `PLAN.md` |

---

## Contents

0. Read this first
1. The game on one page
2. Deliverables and folder layout
3. Architecture
4. Systems and mechanics (the spec)
5. Content: story, heroes, bestiary, items, floors, lines
6. Build order and milestones
7. Riskiest parts and how to de-risk them
8. Testing
9. Done checklist (every TASK.md requirement, and where it is met)
- Appendix A: `exit-interview.json` prefill
- Appendix B: Source Information draft
- Appendix C: Engine and hub facts this plan relies on (verified while planning)

---

## 0. Read this first

- **Who this is for:** the developers (possibly other AI models) who build the game from TASK.md and this plan, without the planner. Everything below is a decision, not an option, unless it says "optional".
- **Reading list, in order (all in the engine repository, github.com/michaelcrosato/my-3d2dge, folder `dist/handoff/`):** `README.md`; `API.md` (read whole); `AI_GUIDE.md` sections *Genre recipes* (the **Gauntlet** and **Twin-stick shooter** recipes), *Players*, *Heights*, *Bullets*, *Shell*, *Testing without a browser*, *Building a big game: lessons from Emberdeep*; `kits/adventure.js` (a TileMap dungeon in `threequarter`, enemies, lighting); `kits/brawler.js` (a second player who drops in, `cam.frame`); `kits/arcade.js` and `modules/arcade.js` (`E.Arcade`: tables, initials, attract); `docs/ASSETS.md` (shapes and materials). Look things up in `API-INDEX.md` with grep; don't read it whole.
- **Worth adapting from the full repository** (`src/emberdeep/`): `93-autopilot.js` (a bot driving a hero through a virtual input), `62-developer.js` (a developer panel), `30-monsters-core.js` (the `wisp` body), `31-monsters.js` (`bonethrower` lob, `imp`). Adapt, don't paste: they lean on Emberdeep's own helpers.
- **The AI Hub protocol** (github.com/michaelcrosato/ai-hub, `lib/hub/`): `README.md` (Session Protocol v1, read whole), `examples/arena.html` (the shared-world pattern this plan follows), `harness.html`, `bridge.js`, `round.js`, `session.js` (client 1.4.0).
- **House rules from TASK.md that shape the work:** develop in the dev subfolder; don't read files outside what you need (other agents share the machine's folders, ports and processes); prefer `file://` and the engine's headless tools; when a server is needed, bind `127.0.0.1` on a port the OS picks and confirm the page is this game before trusting a result; stop only processes you started, by PID (never `pkill`, `killall`, `fuser -k`); don't use subagents or workflows to debate, review, judge or audit; no TODOs, placeholders or stubbed features in the shipped demo.
- **Interpretations this plan makes (so builders don't have to guess):**
  1. *"Multiplayer: follow lib/hub for multiplayer integration into ai-hub as well as for the game on its own."* In an AI Hub session the game plays in the protocol's **shared-world** mode (1–4 players, each on their own device). On its own (outside a session) it plays solo or **local couch co-op for 1–4 players on one screen**, and the hub code stays dormant, exactly as the protocol requires ("If `connect()` answers `null`, carry on as when `AIHub.active` is false"). There is no other online mode: the protocol forbids sockets or brokers of the game's own.
  2. *"Use the engine's native style/animation as the base"* means: the engine's procedural Humanoid and Blob rigs, `E.MOVES`, poses, materials, props, lighting and particles, with new art and animation added where Gauntlet's identity needs it (listed in 4.22 and 4.23).
  3. *Date, Model, Environment, Usage* in Source Information come from your own TASK.md and session, not from this plan.

---

## 1. The game on one page

**Core loop (one sentence, as the engine's guide asks):** descend floor by floor through a starving dungeon, blasting hordes and the generators that breed them, grabbing keys, food and treasure before your ever-draining life force runs out: together, and racing each other for score.

**Genre:** arcade co-op dungeon crawler: a top-down hack-and-shoot ("hack-and-slash shooter") with maze exploration. Catalogue genre: **Action**.
**Perspective:** **three-quarter overhead** (the engine's `threequarter` view, 55° pitch): it shows wall faces and character faces (the N64-era *Gauntlet Legends* angle) while keeping the maze readable. **Top-down** (`topdown`, 80°) and **isometric** (`iso`) are selectable in Settings. The rules are the same in every view.
**Players:** 1–4. Couch co-op with drop-in and drop-out (gamepads, and up to two players on one keyboard); online 1–4 through AI Hub sessions.
**Session length:** a full descent is about 35–50 minutes (9 floors, 2 treasure rooms, a boss); an AI Hub round is 6 minutes.

### What makes Gauntlet distinctive, and how this game captures it

| Source trait | In Gauntletdown |
|---|---|
| Four archetype heroes with clearly different stats, up to four at once | Berserker, Shieldmaiden, Ranger, Hexer (original characters), each with its own armor, shot, melee, magic and speed; 1–4 players |
| Health ticks down every second; food is life | **Life force** drains 1 per second; roasts, loaves and cider restore it; health is shown as a big number, like the arcade |
| Endless hordes from generators | Six generator types breed monsters until destroyed; crowds jam corridors |
| Monsters come in strength levels and weaken when hit | Ranks 3, 2, 1: a wounded rank-3 monster visibly shrinks to rank 2, then 1 |
| Keys open doors; magic potions clear the screen | A key opens a whole run of doors; a **Blast Flask** strikes every monster on screen |
| "Don't shoot the food"; shooting a potion wastes it | Cider and stew can be shot (and are destroyed); a shot flask detonates at half power |
| Death: can't be shot, drains your health, only magic kills it | **The Tithe**, a reaper that drains up to 200 and only magic can kill |
| The booming announcer ("... needs food badly", "... shot the food") | **The Gaunt**, the dungeon's own voice: terse booming callouts in the same style, with original lines, spoken in deep gibberish under big captions |
| Exits, skip-exits, traps, transporters, treasure rooms, stun tiles, force fields | All present (4.8) |
| Co-op that is also competitive | Individual scores; whoever takes the stairs gets the exit bonus; AI Hub standings are by score |
| Insert-a-coin drop-in, a loop that never ends | Join any time; fallen heroes **rise again**; after the ending, **Descent II** loops the dungeon harder |
| Walls turn into exits if you dawdle | The Gaunt grows impatient: doors open at 3:00, every wall becomes a stair at 4:00 |

### Originality guardrails (non-negotiable)

Build an original game *in the genre* of Gauntlet, not a recreation of it (TASK.md and the system rules):
- No names, characters, art, music, levels or exact lines from any Gauntlet game. Not Thor, Thyra, Merlin or Questor; not "Warrior/Valkyrie/Wizard/Elf" as the class set; not "Wizard needs food, badly", "Elf shot the food", "Remember, don't shoot food", or "Shots do not hurt other players... yet". The lines in 5.6 are original and follow the source's *style*: short, booming, third-person, darkly funny.
- All floors are this plan's own layouts. All music is original composition. Monster designs are this plan's (hunger-themed: ghosts with gaping mouths, kitchen imps, frying-pan friars).
- The title is a riff on the source's name, as TASK.md requires.

---

## 2. Deliverables and folder layout

### The run folder (this folder)

```
PLAN.md, STAGE.md, TASK.md                              (given)
Gauntletdown-Gauntlet-claude-opus-5-5-max-20261103-174804.html   <- the game, one file, works from file://
exit-interview.json                                      <- written last (Appendix A), must parse as JSON
Gauntletdown-Gauntlet-claude-opus-5-5-max-20261103-174804/      <- every dev file
```

### The dev subfolder

Start it as a copy of the engine's `dist/handoff/` (sparse-clone it: `git clone --depth 1 --filter=blob:none --sparse https://github.com/michaelcrosato/my-3d2dge.git` then `git sparse-checkout set dist/handoff`, and copy `dist/handoff/*` into the dev subfolder), so the engine's tools work with their own paths. Then add:

```
<dev>/
  my-3d2dge.js          the full engine (every module included), PATCHED as listed in 3.5
  ENGINE-CHANGES.md     each engine change: what, why, its test (feeds Engine Feedback)
  API.md, API-INDEX.md, AI_GUIDE.md, docs/, tools/, src/assets/ (from the handoff: references, tools, the asset store)
  package.json          from the handoff (pins Playwright 1.63.0); `npm install` once
  hub/                  session.js, harness.html, bridge.js, round.js, README.md, fetched with
                        curl -fsSO https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/<file>
  game/
    src/NN-*.js         the game's source fragments (3.2), concatenated in name order into one IIFE
    game.js             built from src/ (never edited by hand)
    index.html          the dev page: session.js first in <head>, then my-3d2dge.js, then game.js
  build.mjs             builds game/game.js and the single-file deliverable (3.6)
  tests/                run.mjs (the one command) and the suites (section 8)
  docs/DESIGNER.md      how to add a floor, a monster, an item or a line (the "designer tools" note)
  shots/                screenshots for look review (not shipped)
```

The handoff's template game goes: `game/game.js` is overwritten by `build.mjs`, and `game/test.mjs` (and `kits/`, once you have taken what you need) can be deleted. The deliverable is only the single HTML file; the dev folder is the workshop.

### What the finished demo contains

Title screen with attract mode; main menu; class select; How to Play; High Scores; About/Credits (with the four feedback sections); 9 floors in three realms, 2 treasure rooms and a boss; an ending, credits and the Descent II loop; game over, continue and initials entry; the engine's pause menu, settings and controls (adjusted), plus **Dev Tools**; local co-op 1–4; AI Hub shared-world sessions 1–4; the touch-only notice. Audio entirely synthesized in code.

---

## 3. Architecture

### 3.1 Base

- **Engine:** my-3D2dge **v0.85.2**, the full engine (`my-3d2dge.js`, which already includes every module: `arcade`, `grid`, `gen`, ...). Plain Canvas 2D at a fixed low resolution, procedural rigs, chip-synth audio, optional WebGPU lighting. No other libraries, no CDN, no network (which also satisfies the hub's network rule).
- **Start point:** the engine's Gauntlet recipe (*AI_GUIDE.md*): "Start from the ADVENTURE slice (a TileMap dungeon in threequarter or topdown); up to four heroes (`game.allowJoin({ max: 4 })`, `cam.frame(heroes)`), health draining by the second, food and potions, keys for doors; generators spawn monsters until destroyed; hundreds of them walk one shared `E.FlowField` toward the nearest hero, drawn as rigs with `{ every: 3 }`." Take the adventure kit's TileMap, floor texture, lighting and enemy patterns; take the brawler kit's drop-in; take `E.Arcade` for tables and initials. Write the game itself fresh in the module layout below. Don't keep the kit's starter shell or its slices.
- **Display:** `new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], input: GD_INPUT, id: 'gauntletdown', menu: {...} })`. `expand: true` fills any screen: a 16:9 TV shows about 427 × 240 game pixels, scaled about 4.5× at 1080p, so the 5×7 pixel font is about 32 px tall on a TV, readable at 10 feet. Every HUD element anchors to `r.W` and `r.H`.

### 3.2 Modules (`game/src/`, concatenated in name order inside one IIFE)

| File | Responsibility |
|---|---|
| `00-core.js` | `const E = My3D2dge`; constants (`T = 16`); `SESSION = !!(window.AIHub && AIHub.active)`; the `new E.Game(...)` call (session and normal options differ, 4.20); registries `def(kind, id, spec)` / `get(kind, id)` / `all(kind)`; the event bus `bus.on(name, fn)` / `bus.emit(name, data)`; seeded RNG streams (`rng.sim`, `rng.fx`) |
| `01-tune.js` | `TUNE`: every balance number in one table (4.24), with defaults, ranges and labels; difficulty and player-count scaling; the Dev sliders bind here |
| `05-text.js` | All player-facing text: narrator lines (5.6), story (5.1), floor intros, How to Play cards, class quips, About/Credits pages (Source Information and feedback filled in at the end) |
| `10-heroes.js` | `def('heroes', ...)` ×4: stats, rig factory, shot, melee moves, magic power, voice |
| `11-monsters.js` | `def('monsters', ...)` ×7 and `def('boss', 'famish', ...)`: stats per rank, AI kind, rig factory, generator kind, score |
| `12-items.js` | `def('items', ...)` for every pickup, 7 special potions, 5 amulets: art, effect, shootable or not, points |
| `13-art.js` | New art: string sprites, `E.SHAPES` entries (generators with damage states, doors, stairs, plates, pads, runes, pylons, bell, jug, platter, tureen), the `Shade` ghost rig class, realm palettes and materials |
| `15..18-floors-*.js` | `def('floors', ...)`: rows and meta for each floor (5.5), one file per realm plus the banquet |
| `20-level.js` | Floor parser (legend → TileMap, entity lists, door groups, trap groups, transporter pairs, exits, beams); automatic decoration (torches, props) from a hash; lights list; **`validateFloor()`**, shared with the tests |
| `21-sim.js` | The world (`W`): state, step order, damage pipeline, scoring, kill and pickup events |
| `22-sim-heroes.js` | Hero controller: intent → movement, aim, fire, smart melee, plant, magic; drain; pickups; doors; stairs; death and rising; amulets and specials |
| `23-sim-monsters.js` | Monster AI kinds, flow fields (multi-source and single-source), separation, ranks |
| `24-sim-generators.js` | Spawning, ranks, damage states, caps |
| `25-sim-features.js` | Traps, transporters, stun runes, force fields, spikes, cracked and fake walls, impatience, treasure-room clock |
| `26-sim-boss.js` | King Famish's fight as an `E.Script` (phases, attacks, waves, feast) |
| `30-intents.js` | Intents from a local player's input (keyboard, mouse, gamepad), from the network, from the bot |
| `31-bot.js` | The autopilot (attract mode, playthrough tests, Dev "bot plays P1") |
| `40-net.js` | Net roles: local, host, client, server; snapshot and event encoding; client puppets and interpolation; rate limiting; area of interest |
| `41-session.js` | The AI Hub flow: connect, own card, ready, start countdown, time-up, finish, end, leave |
| `50-view.js` | Drawing: floor and walls, decoration, lights, entities (from the sim or from puppets), projectiles, reticle, x-ray, debug overlays |
| `51-hud.js` | Player panels, captions, floor and realm cards, timers, edge arrows, prompts |
| `52-narrator.js` | The callout queue: priority, cooldowns, captions, voice |
| `53-audio.js` | Songs, sound-effect definitions, the **Babble** voice synth, dynamic music layers |
| `60-scenes-front.js` | Title, main menu, class select, How to Play, High Scores, About/Credits, the touch-only notice |
| `61-scenes-play.js` | Play (solo and local co-op), floor cards, treasure rooms, game over, continue, initials, ending, credits, Descent II |
| `62-scenes-session.js` | Session scenes: card, countdown, play, round over, server |
| `63-attract.js` | The attract-mode director |
| `70-dev.js` | Dev Tools: cheats, warp, give and spawn, tuning sliders, overlays |
| `80-debug.js` | `game.debug` (snapshot, teleport, warp, give, spawn, setTune, bot, netStats) and `game.stateHash` |
| `99-start.js` | `game.start({ scenes, scene, boot })` |

Content never edits the core: floors, monsters, items and lines are registry entries (the Emberdeep lesson), so the rest of the game can be built later by adding data in a text editor (`docs/DESIGNER.md` explains how).

### 3.3 Runtime model: simulation, intents, view, network

```
           +---------------- intents ----------------+
 local input (per player) --+                         |
 network 'me' messages -----+--> Hero controllers --> |  SIM (world W: heroes, monsters, generators,
 bot (autopilot) -----------+                         |  items, projectiles, doors, timers, boss, score)
                                                      |        |  events (bus): hit, kill, pickup, door,
                                                      |        |  say, floor, magic, over ...
                                                      v        v
             VIEW (draw from W, or from puppets) <-- NET: local | host (snapshots+events out) | client (in)
                     HUD, narrator, audio, effects listen to the bus
```

- **One simulation, one place.** The sim runs in `solo`, `local`, `attract`, `host` and `server` roles. A `client` runs no monster AI, no generators and no damage; it moves only its own hero (with the same controller and collision, for zero-lag control) and shows everything else from the host's snapshots.
- **Intents** are the only way anything drives a hero: `{ move: [x, y] (ground, length ≤ 1), aim: angle or null, fire: held, magic: pressed, plant: held }`. Local input, network messages and the bot all produce intents. This is what makes the bot, the attract mode, the tests and the netcode the same code path.
- **Entity ids:** every entity has an integer id. Static floor items get ids in reading order of the rows, so every copy derives the same ids from the same data and only removals travel over the network. Dynamic entities (monsters, drops, projectiles) take ids from the host's counter.
- **Damage pipeline (one function for everything):** `damage(target, amount, { by, kind: 'shot'|'melee'|'magic'|'blast'|'contact'|'drain'|'trap'|'fire' })` applies armor and immunities, recomputes monster rank, handles death, awards score and emits `hit`, `kill`, `hurt`.
- **Step order (each 1/120 s):** intents → heroes → generators → monsters → projectiles → features (traps, fields, timers) → pickups and doors → stairs → narrator triggers → net send. The view reads the result in `draw`.
- **Randomness:** gameplay draws from `rng.sim` (`E.rng(seed)`), cosmetic effects from `Math.random`. Tests seed both, so runs repeat exactly.

### 3.4 Scenes and flow

```
boot -> title --(10 s idle)--> attract (loops: demo floors -> high scores -> prologue -> title card) --(any input)--> title
title -> main menu: START DESCENT | HOW TO PLAY | HIGH SCORES | SETTINGS | ABOUT & CREDITS
START -> class select -> floor card -> play <-> pause menu (Resume, How to Play, Dev Tools, Drop out, Settings, Controls, Full screen, Quit)
play -> floor card -> ... treasure room after floors 3 and 6 ... -> boss -> ending -> credits -> DESCENT II or title
all heroes down -> continue (10 s) -> yes: play | no: game over -> initials (each qualifying player) -> high scores -> title
AI Hub session: boot -> session card -> countdown 3-2-1 -> session play -> round over (stays until the hub removes the game)
```

Front-end scenes (title, menu, class select, How to Play, High Scores, About) count as "title/menu screens" for the attract timer. Gameplay scenes are `pausable: true` outside sessions and `pausable: false` in them.

### 3.5 Engine changes (the engine is ours to change; keep each one small and tested)

Record each in `ENGINE-CHANGES.md` (what, why, test). They feed the About screen's Engine Feedback.

| # | Change | Why | Test |
|---|---|---|---|
| E1 | `FlowField.updateMany(points)`: a multi-source BFS seeded at every point at distance 0, rebuilt only when some point's cell or `map.version` changes; also fill `flow.src` (which point each cell is nearest to) | Monsters head for the *nearest* hero with one field for all (the recipe says one field; the engine's field takes one target) | Two targets: each cell's distance is the minimum of the two single-target fields; `src` is correct |
| E2 | Humanoid gear: `weapon: 'axe' \| 'bow' \| 'club' \| 'pan' \| 'scythe' \| 'fork'`, `offhand: 'shield'`, `hat: 'horned'` (optional `'toque'`), drawn next to `'sword'` in `_drawHD` and `_drawClassic` (depth-sorted `ops`), with `tip()` lengths per weapon | The heroes' and monsters' identities (axe, shield, bow, pan, scythe, the King's fork) | Each rig draws in all three views with no errors; `tools/filmstrip.mjs` strips of each class's throw and melee look right |
| E3 | `Bullets`: `bounce: n` (reflect off TileMap walls on the axis that entered the wall, up to n times) and `onWall(b, cx, cy)` (called where a bullet dies on a wall) | The Ricochet amulet; shots that crack walls | A bullet fired at a wall comes back; `onWall` reports the right cell |
| E4 | Input: a `Pad9` press is ignored while `Pad8` is held | The hub's rule: Create + Options is the hub's, so the game ignores Options while Create is held | Press `Pad8`, then `Pad9`: `pressed('pause')` stays false |
| E5 | Settings: the `glyphs` default becomes `'playstation'`; its row also shows on the Settings screen (not only Controls); its `apply` sets every player's input | TASK.md: PlayStation glyphs by default, a Settings option for Xbox (A B X Y) | With `lastDevice = 'gamepad'`, `label('fire')` is `R2` and `label('confirm')` is `✕`; after `set('glyphs', 'xbox')` they are `RT` and `A` |
| E6 | Shell: a TV scale (theme `scale`, a CSS variable multiplying its pixel sizes; the game sets about 1.6 at 1080p and more on bigger screens), a `rows: [settingKeys]` field for any screen (the Dev pages), and settings groups whose name starts with `Dev` hidden from the standard Settings screen | The engine's HTML menus are 14 px: too small at 10 feet. Dev sliders need the same row widgets on their own screen | Headless: `ui.show('dev-tuning', { rows })` raises no error; browser: a 1920×1080 screenshot of Settings and Dev Tools reads at TV distance |
| E7 | Arcade: `cab.enter(score, mode, done, { input })` reads that player's input | Each qualifying player enters initials with their own controller | Player 2's input types the initials |
| E8 | Audio: `audio.bus('sfx' \| 'music' \| 'voice')` returns the gain node, with a new `voice` bus under the master and a standard `voices` volume setting | The Babble voices must follow the player's volume and mute | Headless: returns null without error; browser: muting silences voices |

Don't change the engine's fixed step, scene system, or standard menus beyond these. If something else is needed, add it the same way: smallest change, a test, a line in `ENGINE-CHANGES.md`.

### 3.6 Build and bundle (`build.mjs`)

1. Concatenate `game/src/*.js` in name order inside `(() => { 'use strict'; ... })();` and write `game/game.js` (the dev page and the tests load this).
2. Read `hub/session.js` unmodified. Assert it starts with `/*! aihub-session` and that its SHA-256 equals the file fetched from the hub (keep the hash in `hub/session.sha256`). The hub replaces an unmodified client with each new version; an edited copy is not replaced.
3. Write the deliverable in this order:
   ```html
   <!doctype html><html lang="en"><head>
   <meta charset="utf-8">
   <script>/* hub/session.js, byte for byte */</script>
   <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
   <title>Gauntletdown</title>
   <meta name="description" content="...">
   <meta name="hub:session" content="1">
   <meta name="hub:session-players" content="1-4">
   <meta name="hub:session-mode" content="shared-world">
   <meta name="hub:session-minutes" content="6">
   <meta name="hub:session-goal" content="Score the most: treasure, kills and stairs. Don't starve.">
   <meta name="hub:session-howto" content="Move WASD/stick · Aim mouse/right stick · Fire click/R2 · Magic right-click/△">
   <style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}</style>
   </head><body>
   <!-- E.bootSplash('GAUNTLETDOWN') markup -->
   <canvas id="screen"></canvas>
   <script>/* my-3d2dge.js (patched) */</script>
   <script>/* game/game.js */</script>
   </body></html>
   ```
4. Escape any `</script` inside inlined code (`<\/script`). Assert the output has exactly one `<canvas id="screen">`, the six hub metas, and the client as the first `<script>` right after `<meta charset>`.
5. The file opens from `file://` with no network requests (the browser test checks this).

---

## 4. Systems and mechanics (the spec)

All distances are world units (one tile = 16). Speeds are units per second. Every number marked † is a `TUNE` entry (4.24) and a Dev slider.

### 4.1 Floors, the map and the legend

- A floor is a `def('floors', id, { name, realm, no, music, par, rank, genRank, specials: [], amulets: [], intro: [...], next, rows: [...] })`. `rows` are ASCII strings, all the same width, bordered by walls. The parser builds an `E.TileMap` (wall types per realm, `cut: true, cutH: 6` so walls in front of the camera drop low; `ao: 6`), the entity lists, door groups, trap groups, transporter pairs and beams.
- **Wall height 24**, a little below a hero's head. Hero shots fly at z 12, so they pass over the banquet table (h 10) and are stopped by walls (the engine's `Bullets` already compare `map.heightAt` with the bullet's z).
- Corridors are at least 2 tiles wide; rooms 6–14 tiles across. Floors range from 40×20 (the tutorial) to 64×44.

**The legend (shared by every floor):**

| Char | Meaning | Char | Meaning |
|---|---|---|---|
| `#` | wall (realm stone) | `@` | hero start (author 4; fewer are padded on free neighbours) |
| `%` | accent wall (shelves, bone wall, iron) | `E` | stairs down (exit) |
| `X` | cracked wall (4 HP, shots break it) | `2`–`9` | skip stairs to floor N |
| `+` | door (iron bars); 4-connected runs open together | `O` | transporter pad (paired in reading order: 1st↔2nd, 3rd↔4th) |
| `T` | trap wall, removed when any `^` plate is stepped on | `!` | stun rune |
| `Y` | trap wall, removed when any `v` plate is stepped on | `s` | spikes (cycling) |
| `?` | fake wall: drawn as a wall, walkable (a secret) | `\|` `-` | force-field beam, vertical / horizontal (pylons drawn where it meets walls) |
| `~` | lava or chasm (blocked floor, glows in the Furnace) | `^` `v` | pressure plates |
| `.` | floor | `,` | floor variant (rug, dirt, bone dust) |
| `k` | key | `f` | roast (+100, can't be shot) |
| `b` | loaf (+50, can't be shot) | `j` | cider jug (+100, shootable) |
| `z` | spoiled stew (poison, shootable) | `m` | Blast Flask (magic) |
| `u` | special potion (type from `meta.specials`, reading order) | `a` | amulet (type from `meta.amulets`, reading order) |
| `$` | gold | `*` | gem |
| `h` | chest | `l` | locked chest (needs a key) |
| `w` | crown | `B` | Dinner Bell |
| `g` `n` `o` `i` `y` `x` `t` | monsters: hungerghost, gnasher, pot-lobber, cinder imp, fryar, snatcher, the Tithe (rank from `meta.rank`) | `G` `N` `L` `I` `F` `S` | generators: ash urn, gnasher den, crockery hutch, ember grate, candle shrine, sack heap (rank from `meta.genRank`) |
| `K` | King Famish (boss floor) | `=` | banquet table (low wall, h 10) |
| `P` | a table cell carrying a feast platter (+200, shootable) | `U` | a table cell carrying a soup tureen (the boss floor's ghost generator) |

Per-cell overrides go in `meta.ranks: { 'x,y': 3 }`, set pieces in `meta.props: [[shapeId, cx, cy, facing]]`, snatcher escape points and boss spawn points in `meta.points`.

- **Automatic decoration:** a deterministic pass (`E.hash2(cx, cy)`) puts a torch (`r.prop('torch', ..., { light: true })`) on about one wall face in six along open floor, and 3–8 realm props per room against walls (Larder: barrels, kegs, sacks, crates, hanging hams; Ossuary: skulls, bones, coffins, candelabras, cobwebs, urns; Furnace: braziers, fire drums, anvils, chains). Decoration goes only on empty floor cells beside walls (never on an item, monster, generator, plate, pad, rune, beam, spike or stairs cell). Props that block are made solid with `map.solid`, and the validator re-runs the solvability check (8.3) with them in place, so decoration can never cut a floor in two.

### 4.2 Heroes

| | **Berserker** | **Shieldmaiden** | **Ranger** | **Hexer** |
|---|---|---|---|---|
| Character | Brakka Ironbelly | Hilde Stoutheart | Fenn Quickfletch | Old Mother Wix |
| Look | Humanoid `bulky` size 1.15, `weapon: 'axe'`, `hat: 'horned'`, fur cape, bare arms; red and brown | `heroic` 1.1, `weapon: 'sword'`, `offhand: 'shield'`, `hat: 'helmet'`, `hair: 'ponytail'`; blue and steel | `heroic` 1.05, `weapon: 'bow'`, hood, short cape, `sleeves: 'long'`; green and leather | `chibi` 1.05, `weapon: 'staff'`, `hat: 'pointed'`, `outfit: 'robe'`, `hunch: .3`, `face: { eyes: 'big' }`; yellow and purple |
| Hub seat (colour) | 1 (red `#e8443a`) | 2 (blue `#3b82f6`) | 3 (green `#22c55e`) | 4 (yellow `#f5b700`) |
| Move speed | 62 | 66 | 78 | 64 |
| Armor (damage taken ×) | 0.75 | 0.60 | 0.90 | 1.00 |
| Shot | spinning hand-axe | javelin | arrow | hex-bolt |
| Shot damage | 3, pierces 1 foe | 2 | 1 | 2, plus 1 splash within 12 |
| Shot speed / cooldown | 190 / 0.34 s | 240 / 0.27 s | 300 / 0.15 s | 220 / 0.26 s |
| Melee damage per swing | 5 | 4 | 2 | 1.5 |
| Melee moves (`E.MOVES`) | `overhead` → `spin` | `thrust` → `bash` (shield) | `jab` → `cross` (dagger) | `bash` (staff) |
| Magic power (monsters / generators) | 1.0 / 1.0 | 1.4 / 1.0 | 1.7 / 1.0 | 2.5 / 2.0 |
| Throw animation | `throw` | `throw` | bow draw (new spec, 4.23) | `cast` |
| Voice | low, gruff | firm, mid | quick, light | high, cackling |

- **Health (life force):** starts at 700†, no maximum (numbers above 9999 show as 9999+). Drains 1 per second† for every living hero, all the time on a floor (not on cards or menus).
- **Shooting:** fire is held for auto-fire at the class's cooldown. The shot leaves the weapon hand (`rig.hand('R')`, or 8 ahead at z 12) in the aim direction; range 220 (its `life` is range ÷ speed). Shots are `E.Bullets` on the ground plane, `team: 'hero'`, `data: { owner, kind }`. They pass through allies (but see ally stun below).
- **Smart melee:** when fire is pressed and a non-ghost monster is within reach (hero r + monster r + 8) inside ±50° of the aim, the hero swings its melee combo (`E.Combo`) instead of throwing. Melee hits everything in the arc (`attack.hits` with `E.inArc(hero, aim, m, 22, 1.2)`), with `game.hitFx`. Hungerghosts can't be struck: up close the hero throws point-blank instead.
- **Plant:** holding Plant (Shift, L2) stops the hero, which turns with the movement input and keeps firing: the arcade "stand and shoot" stance. **Keyboard-only firing** (fire from a key while mouse aim is off, below) plants automatically, as in the arcade.
- **Aim:** right stick: its direction through `game.view.screenDirToGround` (pushing it past 0.5 also fires, a setting); mouse: toward the ground point under the cursor (`game.mouseGround()`), with a reticle, while `input.aimSource === 'mouse'` and the mouse moved in the last 3 s or a mouse button is firing (the engine's `aimSource` only changes on mouse or pad input, never on keys, so a stale cursor must not keep aiming); otherwise the hero's facing (the last movement direction). **Aim assist** (Off / Low 8° / High 16°): snaps to the nearest visible monster or generator within that cone and 200 units.
- **Magic (Blast Flask):** pressing Magic with at least one flask uses it: every monster inside the user's screen rectangle (the shared screen in local co-op; the user's own view in a session) takes `4 × magic power` damage (rounded up); generators there take `2 × magic-vs-generators`; the Tithe dies. A white flash, a shockwave ring, a choir sting, the hero's `cast` pose.
- **Carry limits:** 9 keys and 9 flasks (12 with Deep Pockets). Pickups over the limit stay on the floor.
- **Ally stun:** from floor 6 on (and in Descent II), a hero shot that touches an ally stuns that ally for 0.35 s (Settings: Ally stun On/Off; default On). The narrator announces it at floor 6's start.
- **Starving look:** below 200 health the rig hunches (`hunch` rises with hunger), the walk slows its bob, and a heartbeat plays for local players.

### 4.3 Controls and prompts (10-foot, controller-first)

The game is designed around a PS5 DualSense in the browser's standard mapping, played on a TV; keyboard and mouse get the keys PC players expect for a twin-stick shooter, on the same screens. Custom input preset `GD_INPUT` (the engine's menu actions are added by the engine):

| Action | Keyboard and mouse (player 1) | DualSense | Xbox labels (setting) |
|---|---|---|---|
| Move | W A S D (and arrows when alone on the keyboard) | Left stick, D-pad | Left stick, D-pad |
| Aim | Mouse | Right stick | Right stick |
| Fire (hold) | Left click, Space, J | R2, ✕ | RT, A |
| Magic | Right click, Q, K | △, R1 | Y, RB |
| Plant (hold) | Shift | L2 | LT |
| Change camera view | V | (Settings) | (Settings) |
| Zoom | Wheel, - and = | (Settings) | (Settings) |
| Pause and menu | Esc, P | Options | Menu |
| Menus | arrows / mouse hover and click, Enter, Esc or Backspace | D-pad/stick, ✕ confirm, ○ back | A confirm, B back |
| Join (local) | 2 (the keyboard's right half) | Options on a free controller | Menu on a free controller |

- In `GD_INPUT`, list each action's gamepad codes with the prompt you want first (Fire: `Pad7` before `Pad0`, so prompts say R2; Magic: `Pad3` before `Pad5`, so they say △), since a prompt shows an action's first code for the device.
- A second keyboard player (who joined with 2) gets the right half, as the engine splits it: arrows to move, then `.` `/` `,` for Fire, Magic, Plant (and the numpad). Player 1 keeps W A S D with F G H for the same three, plus the mouse.
- **Create (Share) does nothing**: in sessions the hub owns Create + Options (engine change E4).
- **Prompts follow the device used last** (`input.label(action)`): PlayStation glyphs for any controller by default (✕ ○ □ △, L1/R1/L2/R2, Options), Xbox glyphs (A B X Y, LB/RB/LT/RT, Menu) with Settings → Button symbols, key names and "Left click"/"Right click" for keyboard and mouse. Never hard-code a key in text: every prompt, card and help page is built from `label()`. Each local player's panel shows that player's own prompts.
- **The mouse in menus:** hover moves the focus, a click picks (E.Menu does this; class cards and How to Play pages must too). **The mouse in the world:** the reticle; hovering a monster or generator outlines it and shows its name and rank; clicking fires at it.
- **Touch:** no touch controls anywhere (4.19).

### 4.4 Combat and damage

- **Monster HP** is `baseHP × rank`; its **rank** is `ceil(hp / baseHP)` after each hit. When the rank drops, the rig shrinks (scale 1.15 → 1.0 → 0.88) and its palette pales, with a puff: the arcade's "level" system made visible.
- **Hero damage taken** = monster damage × class armor × difficulty × Iron Brew. Hero hit: `hurt` flinch, a red flash on the panel, a small knockback, a pain bark (Babble), a 0.25 s grace before the same monster's contact damage can hit again.
- **Heroes and monsters block each other.** A hero can be boxed in by a horde, as in the arcade; fight out or use magic. Resolve circle overlaps every step with an `E.SpatialHash` (cell 32): monsters push each other apart softly; heroes are pushed out of monsters.
- **Kills:** score = monster points × the rank it spawned at; `game.hitFx` on every hit; a death effect per type (ghost: a wail and a puff; gnasher: a tumble, `pose: 'down'`, then a fade; imp: a small explosion; fryar: smoke; Tithe: a bone burst).
- **Hit feedback:** hit-stop 0.03–0.05 s on melee, shake on magic and generator deaths, damage numbers only on generators and the boss (hordes would drown the screen in numbers).

### 4.5 Monsters

| Monster | Char | Generator | HP / rank | Speed r1/r2/r3 | Attack | Damage r1/r2/r3 | Points / rank | Notes |
|---|---|---|---|---|---|---|---|---|
| **Hungerghost** | `g` | Ash Urn `G` | 2 | 40 / 46 / 52 | flies into a hero, then vanishes | 10 / 20 / 30 | 10 | Can't be struck in melee; floats over runes and spikes; paths around walls like everyone |
| **Gnasher** | `n` | Gnasher Den `N` | 2 | 34 / 38 / 42 | club swing: 0.32 s wind-up, reach 14, every 0.9 s | 6 / 8 / 10 | 10 | The horde; club raised high in the wind-up |
| **Pot-Lobber** | `o` | Crockery Hutch `L` | 2 | 30 / 34 / 38 (flees at 46) | lobs a crock over walls (`E.arc`, apex 40, range 130) every 2.2 / 1.9 / 1.6 s at the hero's position plus lead; a shadow marks the landing 0.6 s ahead | 8 / 10 / 12 splash within 12 | 15 | Keeps 70–110 away, flees inside 56; its crocks are `Bullets` with `grav` and break on landing |
| **Cinder Imp** | `i` | Ember Grate `I` | 3 | 36 / 40 / 44 | bite (reach 10); fireball (speed 110, only with sight, every 1.8 s, 0.35 s mouth glow first) | bite 6 / 8 / 10, fireball 8 / 10 / 12 | 20 | Fireballs destroy shootable food they hit |
| **Fryar** | `y` | Candle Shrine `F` | 3 | 36 / 40 / 44 | frying-pan smack, 0.3 s wind-up | 8 / 10 / 12 | 25 | Visible 2.0 s, invisible 1.4 s (can't be hit; shots pass through); reappears up to 48 closer along its path, with smoke |
| **Snatcher** | `x` | Sack Heap `S` | 3 (rank 1 only) | 72 | steals on touch: a flask, else a key, else the active amulet | none | 100, plus the item back | Then flees to its heap or the nearest `meta.points.escape`; escapes with the item unless killed (then drops it) |
| **The Tithe** | `t` | none (placed, or the impatience timer) | immune | 52 | drains while touching: 6 health per 0.1 s, at most 200 per hero | drain | 1000 × (1–5), drawn from `rng.sim` | Only magic kills it (a flask, or a shot flask's blast); shots clink off; vanishes when it has taken 200 from a hero ("THE TITHE IS PAID") |
| **Dinner Bell** | `B` | none | object | none | a hero who touches it rings it and is **ON THE MENU** | none | none | Every monster targets that hero for 12 s, or until they touch an ally, who is then on the menu (a co-op hot potato); one ring per floor |
| **King Famish** | `K` | boss | 400 × (1 + 0.5 × (players − 1)) | 30 | plates, stomp, eating, charge, fog (5.3) | 10–15 per attack; fog triples the drain | 10,000 | Three phases (5.3) |

**AI (23-sim-monsters.js):**
- **Navigation:** one multi-source `FlowField` toward every living hero (E1), rebuilt when a hero changes cell; each monster steps along `flow.dir`. While the Bell marks a hero, a single-source field toward that hero is used instead. Snatchers fleeing and lobbers keeping their distance use their own fields (toward the escape point; away from the hero by climbing the distance gradient).
- **Activation:** monsters farther than 20 tiles from every hero stand still (they wait in the dark, as in the arcade).
- **Telegraphs:** every enemy attack winds up visibly (raised club, mouth glow, landing shadow, pan drawn back) for at least 0.3 s, longer than any hero swing, as the engine's animation guide asks.
- **Amulet reactions:** Veil: monsters lose track of that hero unless adjacent and wander. Stench: monsters flee from that hero within 64.
- **Hazards:** force fields hurt monsters too (lure hordes through them); spikes and lava don't affect ghosts.

### 4.6 Generators

- HP `4 × rank`† (Dev multiplier); they take shot, melee and magic damage, and lose a rank, with a damage state, every 4 HP. Spawn interval r1 3.0 s, r2 2.2 s, r3 1.5 s (× spawn interval multiplier†, ÷ (1 + 0.25 × (players − 1))). A generator spawns only when a hero is within 15 tiles, it has fewer than 8 living children, and the floor is under its monster cap† (140; 100 in sessions). New monsters emerge into a free neighbouring cell over 0.4 s (rising from the generator with dust) at the generator's current rank.
- Destroyed: debris, a crumble sound, 25 × rank points, and a 10% chance to drop a loaf.
- Generators are static circular obstacles (r 7) in the same overlap pass as bodies, not TileMap walls, so destroying one needs no map change; shots hit them through `shots.hit`.
- Art (4.22): Ash Urn (ghosts), Gnasher Den (gnashers), Crockery Hutch (lobbers), Ember Grate (imps, flat and glowing, shoot it from any side), Candle Shrine (fryars), Sack Heap (snatchers), Soup Tureen (the boss's ghosts). Each has three damage states (intact, cracked, crumbling) as shape params, and breathes (a slow scale pulse) while it spawns.

### 4.7 Items

| Item | Char | Effect | Shootable | Points |
|---|---|---|---|---|
| Key | `k` | +1 key (limit 9) | no | 0 |
| Roast | `f` | +100 health† | no | 10 |
| Loaf | `b` | +50 health | no | 5 |
| Cider jug | `j` | +100 health | yes: destroyed, and the narrator names the culprit | 10 |
| Spoiled stew | `z` | −50 health and Queasy (move × 0.6 for 4 s, green face) | yes: destroying it is good | 0 |
| Blast Flask | `m` | +1 flask (limit 9) | yes: detonates at half the shooter's magic power within 80 | 0 |
| Special potion | `u` | permanent upgrade for the rest of the game (below) | no | 250 |
| Amulet | `a` | a 20 s power (below) | no | 100 |
| Gold | `$` | | no | 100 |
| Gem | `*` | | no | 250 |
| Chest | `h` | opens on touch (lid tween, coins burst) | no | 500 |
| Locked chest | `l` | needs and uses a key; drops a flask, a roast or a key | no | 1000 |
| Crown | `w` | | no | 2500 |
| Feast platter | `P` | +200 health (reachable from beside the table); King Famish eats them | yes | 20 |

Pickups happen on touch (hero r + 4). Food shows a crunchy "chomp" (squash and stretch, crumbs, a rising +100).

**Special potions** (once per hero per type; icons under the panel): **Iron Brew** (damage taken × 0.8), **Ogre Ale** (melee × 1.5), **Quickshot Tonic** (cooldown × 0.75, shot speed × 1.2), **Hardshot Draught** (shot damage +1), **Witchwater** (magic × 1.5), **Featherfoot Cordial** (speed × 1.12), **Deep Pockets** (limits +3).

**Amulets** (20 s each, a ring timer on the panel and around the hero): **Veil** (monsters lose track of you; drawn half-transparent), **Ironskin** (no damage; drain continues; gold shimmer), **Stench** (monsters flee from you; green fumes), **Ricochet** (shots bounce off walls up to 3 times, E3), **Rending** (shots pierce every monster and deal +1).

### 4.8 Level features

| Feature | Behaviour |
|---|---|
| Doors `+` | A hero with a key who pushes into a door cell (within r + 3) opens the whole 4-connected run and uses one key. The bars rise over 0.4 s (`map.set(cx, cy, 0)` per cell, plus a bars sprite that slides up) |
| Cracked walls `X` | 4 HP; any hero shot (via `onWall`, E3) or melee damages them; they collapse into rubble floor with dust. Hide shortcuts and stashes |
| Fake walls `?` | Drawn exactly as walls; walkable; shimmer when touched; the first one found triggers "THAT WALL WAS LYING." |
| Trap plates `^` `v` | One-shot: stepping on any `^` removes every `T` wall (crumble, a rumble); `v` does the same for `Y`. Traps release hordes or reveal treasure |
| Transporters `O` | Stepping on a pad moves the hero to its pair with a swirl (0.6 s cooldown, 0.5 s invulnerable on arrival). Monsters don't use them |
| Stun runes `!` | Heroes stepping on one are stunned 0.8 s (can't move or fire), then immune to runes for 1.5 s |
| Force fields `\|` `-` | Beams cycle 2 s on, 2 s off, flickering for 0.4 s before switching on. On: 12 damage and knockback to anything that touches (monsters too) |
| Spikes `s` | Cycle 1.6 s (0.5 s up, with a 0.25 s tremble before); 15 damage |
| Lava `~` | Blocked floor; glows (floor texels with glow, lights); heat shimmer under GPU lighting |
| Stairs `E` | Stand on the stairs for 1.0 s† (a ring fills around the hero; stepping off cancels) and **everyone** descends; the stair-taker gets the exit bonus |
| Skip stairs `2`–`9` | The same, to floor N ("TOOK THE SHORT WAY DOWN"); a carved number shows the target. Floors and treasure rooms in between are skipped; a realm card still plays when the skip enters a new realm |
| Impatience | At 150 s† "THE GAUNT GROWS IMPATIENT"; at 180 s† every door opens; at 240 s every wall becomes a stair (wall faces glow; pushing into any wall for 1 s descends). From floor 5, the Tithe arrives at 120 s† if none is on the floor |
| Treasure rooms | A 30 s† clock (big, top centre); treasure everywhere, no monsters, drain continues; the stairs are open. When the clock ends, "THE HOARD SLAMS SHUT" and everyone moves on. Taking every treasure: +2000 to whoever took the last |

### 4.9 Floor flow

1. **Floor card** (on entering): realm art behind, "FLOOR 2" big, the floor's name, the narrator's intro line (spoken), and for floors after the first, three numbers per player (score, kills, treasure). Continues on Fire/✕/Enter or after 5 s. In sessions the card is a 2 s banner and play never waits.
2. **Play** until the stairs. Heroes start on the `@` cells.
3. **Descent:** an iris transition (`game.go(..., { fade: 'iris', at: stairTaker })`), the heroes sink into the stairs, a descending arpeggio.
4. **Exit bonus** to the stair-taker: 500 + 5 per second under the floor's `par` (default 150 s).
5. **Realm cards** before floor 1, after each treasure room (entering realms II and III) and before floor 9: a short vignette (the party slides down a chute) and the realm's line (5.1).

### 4.10 Death, rising again, continue, game over, high scores

- **A hero falls** at 0 health: `pose: 'die'` (stagger, knees, topple), a ghostly wisp rises, "BERSERKER HAS BEEN EATEN." Its panel shows **RISE: [Fire]**. Any time later, Fire brings it back beside a living ally with the starting health; the player's continues count goes up and their score is kept (the arcade's drop-in, without coins).
- **Everyone down:** "CONTINUE? 10" (`E.Arcade` continue countdown). Fire or Start from any player: every player rises on the floor's starts. Otherwise **GAME OVER** ("THE GAUNT IS FED."), then each player whose score qualifies enters initials on the letter wheel with their own controller (E7), then the table, then the title.
- **High scores:** `E.Arcade` table `id: 'gauntletdown'`, mode `'descent'`, top 10: initials, score, class icon, deepest floor, continues used. Runs with any Dev cheat on are not recorded (a DEV badge says so).
- **Sessions:** no continue prompt: a fallen hero rises automatically after 5 s beside a living ally with 350 health and loses 250 points (not below 0). If every hero is down at once, the host finishes the round.

### 4.11 Scoring

Kills (4.5), generators (25 × rank), treasure and food (4.7), exit bonus (4.9), treasure-room clear (+2000), the King (10,000), the Iron Gauntlet (+5000 to whoever grabs it). Scores are per player. The HUD shows each score; the floor card shows the round's per-player numbers.

### 4.12 The narrator: "The Gaunt"

- The dungeon itself speaks, in the source's style: short, booming, third person, darkly funny (lines in 5.6). Every line shows as a big caption (bottom centre, 2 lines at most, outlined, scale 2 on wide screens) and is spoken by the narrator voice: deep gibberish with an echo (4.21).
- **Queue rules:** three priorities (critical: dying, starving, shot food, the Tithe, deaths; event: pickups, firsts, traps, stairs; tip: teaching lines). At most one line every 1.2 s; a higher priority cuts a tip; each line has a cooldown (per hero for health lines: 20 s); teaching tips play once per game (kept in `E.store` so a second game skips them; Settings → Tips: On/Off).
- **Triggers:** health crossing 400, 200 and 100; the first of each item, monster and feature; shot food or flasks; the Tithe arriving, leaving and dying; the Bell; impatience stages; stairs; boss phases; game over; high score.
- In sessions the host decides lines about events (`say` events, 4.20) so every copy hears the same thing; a client's own teaching tips are local.

### 4.13 Camera and local co-op

- **One hero:** `game.follow(hero, { z: 12, lead: 12 })`.
- **Several local heroes share one screen**, as in the arcade: `game.cam.frame(livingHeroes, { margin: 64, zoom: [0.8, 1] })` and a **leash**: a hero can't move so that the party's bounding box would exceed the visible ground minus the margin. Measure the visible ground each frame from the four screen corners with `game.view.toGround(cam.x + sx, cam.y + sy)` (it depends on view, zoom, turn and screen shape), and cancel the part of a hero's step that would stretch the box past it. Fallen heroes don't hold the camera.
- **Scene camera:** `camera: { zoom: [0.75, 1.5], start: 1, tall: 1.25 }` (wheel, - and =, Settings).
- **Views:** Settings → Camera view (Three-quarter, Top-down, Isometric) calls `game.setView`; V cycles them in play.
- **Visibility:** heroes draw with `xray: { color: playerColour }`, so a hero behind a wall stays visible; each hero has a ground ring in its player colour and (Settings) a name tag.
- **Joining:** `game.allowJoin({ max: 4, onJoin })` on class select and in play. A player who joins in play picks a free class on a small overlay over their new panel (the game keeps running), then drops in beside the party with full starting health. **Drop out:** the pause menu's "Drop out (P2)" (shown when a player other than 1 paused) removes that player (`game.removePlayer`). Joining is closed (`game.allowJoin(false)`) in the attract mode and in sessions.
- **Classes are unique** in local play (a taken card says TAKEN). With four players, all four classes play.

### 4.14 HUD (canvas pixel art, anchored to `r.W`/`r.H`, clear of `game.cornerArea()`)

- **Player panels**, top edge, one per joined player (up to four, each about `r.W / 4` wide, 34 game pixels tall): a live portrait (`rig.drawPortrait`) on a disc in the player's colour, the class name, **health as a big number** (font scale 2; white, yellow under 400, flashing red under 200), the score, key and flask icons with counts, the amulet icon with its ring timer, special potion icons in a small row. Empty slots (local) pulse "[Options]/[2] TO JOIN"; fallen heroes show "RISE: [Fire]".
- **Centre top:** floor name; in sessions the round clock (from `AIHub.time()` and `limitMs`) and a compact scoreboard of every player (name, score) in seat colours.
- **Bottom centre:** narrator captions.
- **Around the hero:** the stair ring, the amulet ring, the "ON THE MENU" bell icon, a Queasy face.
- **Screen edges:** arrows to allies off screen (sessions) and to the stairs once found or after impatience.
- **Big centre text:** treasure-room clock, CONTINUE, countdowns.
- **10-foot rules:** nothing smaller than the 5×7 font at scale 1; at most three numbers per panel; no tables during play.

### 4.15 Front-end screens (canvas pixel art; big; mouse, keys and controller)

- **Boot:** the engine's boot screen with steps ("Digging the Gaunt", "Setting the table", "Waking the ghosts") and an error report if anything fails.
- **Title:** the GAUNTLETDOWN logo (`E.font.title`, a four-colour iron-and-gold gradient, extruded), a scene behind it: an iron gauntlet tumbling down an endless torch-lit shaft, the four heroes silhouetted at the edge. "PRESS [✕]/[Enter]" pulses. The engine version (`E.versionLabel()`) small at the bottom. Keep the top-right corner clear (the engine's menu and full-screen buttons).
- **Main menu:** START DESCENT, HOW TO PLAY, HIGH SCORES, SETTINGS (`game.menu('settings')`), ABOUT & CREDITS. (In Descent II after an ending: CONTINUE TO DESCENT II on top.)
- **Class select ("CHOOSE YOUR FOOL"):** four big cards, each with its live rig turning slowly (idle; it swings on focus), name and class, five stat rows as 1–5 pips (ARMOR, SHOTS, MELEE, MAGIC, SPEED) and a quip. Each joined player has a cursor in their colour; Fire locks a card; START begins once every joined player has locked. "[Options]/[2] TO JOIN" for empty seats. Hover focuses, click picks.
- **How to Play:** 8 paged cards (5.7), one idea per page, each with a live illustration (a rig, a sprite, a tiny scripted scene), left/right to page.
- **High Scores:** the `E.Arcade` table, drawn large.
- **About & Credits:** paged (5.8), including Source Information, Testing Feedback, Engine Feedback and Prompt Feedback.
- Every screen: Back with ○/Esc/Backspace/right click; idle 10 s starts the attract mode.

### 4.16 Pause menu and Settings

- **Pause** (engine standard, on Esc/P/Options): Resume, How to Play, **Dev Tools**, Restart floor, Drop out (P2–P4), Settings, Controls, Full screen, Quit to title (the engine asks first). The pause menu's How to Play is the game's `E.Shell` help screen (`screens: { help: { keys, sections } }`): the eight cards of 5.7 as sections, with keys from `input.label()`, since the canvas scenes don't run while paused. `menu: { items: [...], controls: { fire: 'Fire', magic: 'Magic', plant: 'Plant' }, quit: 'title' }`. The engine says "P2 PAUSED" when player 2 paused.
- **Settings:** the engine's Display, Sound and Comfort groups (scaled for TV, E6), plus **Game**: Camera view; Button symbols (PlayStation default, Xbox; E5); Difficulty (Easy, Normal, Hard); Aim assist (Off, Low, High); Right stick fires (On); Ally stun (On); Narrator captions (On); Tips (On); Player names (On); HUD size (Normal, Large); Enhanced lighting (WebGPU where available; On on desktop). Sound gains **Voices** (E8). The engine's Controls screen handles rebinding, dead zone, vibration.

### 4.17 Dev Tools (from the pause menu; not in sessions, not in attract)

Four pages (E.Shell screens with the row widgets, E6), each one screen tall, navigable by controller, keys and mouse:

1. **Cheats** (toggles; reset on every load): God mode (no damage, no drain); Noclip; Infinite keys and flasks; Freeze monsters; One-hit kills; Generators off; Show hitboxes; Show flow field; Show net stats (sessions are tested through the harness, but the overlay also works in a dev host); Show bot thoughts; Time scale (0.25, 0.5, 1, 2).
2. **Warp:** Floor 1–9, Treasure Room I and II, Boss phase 2, Boss phase 3, Ending, Game over, Descent II, Restart floor.
3. **Give and spawn:** +3 keys, +3 flasks, a roast, a stew, each amulet, every special, +1000 score, heal the party; spawn monster (type and rank selects, then "Spawn 5 here"), spawn a generator; kill all monsters; destroy all generators; open every door; reveal secrets; next impatience stage; start the attract mode now; Bot plays player 1 (toggle).
4. **Tuning:** a live slider for each † value in 4.24 (applied at once, saved), and **Reset tuning to defaults** (`game.settings.reset('Dev tuning')`).

While any cheat is on, the HUD shows a small DEV badge and high scores are not recorded.

### 4.18 Attract mode and the autopilot

- **Timer:** on any front-end screen, 10 s without input (no key, button, stick past the dead zone, click, wheel, or mouse movement over 4 px) starts the attract mode. **Any input** returns to the title at once and is consumed (it doesn't also pick a menu item).
- **The loop:** "DEMO" banner and a pulsing "PRESS ANY BUTTON". (1) **Floor 2**, 25 s: four bot heroes clear gnashers, melee, eat, open a door, use a flask. (2) **Floor 5**, 20 s: the Tithe, the Dinner Bell, force fields, stun runes. (3) **Floor 7**, 15 s: imps, fireballs, lava and ash. (4) **The banquet**, 20 s: King Famish in phase 2, heroes shooting the food. (5) High scores, 6 s. (6) The prologue, 8 s. (7) The title, 4 s. Then again from (1).
- **Cheats allowed** (TASK.md): bots are invulnerable, have infinite flasks, and are teleported to the next waypoint if stuck for 3 s. A director spawns monsters near the bots when the screen is quiet. Music and effects play at 60%.
- **The autopilot** (`31-bot.js`, adapted from Emberdeep's) produces intents from the sim's state. Goal priority each 0.25 s: (1) health under 250 and food within 20 tiles → go eat; (2) a monster within 7 tiles in sight → aim and fire (keep distance as Ranger or Hexer); (3) a generator within 10 tiles in sight → shoot it; (4) fewer keys than the doors on its route and a key reachable → fetch it; (5) a door it can open → open it; (6) treasure within 12 tiles → take it; (7) the stairs. Magic when 12 or more monsters are on screen. Each goal gets a single-source FlowField. Stuck (under 8 units of progress in 3 s): sidestep, then, if cheats are on, teleport to the next waypoint.
- The same bot, **without** cheats except God mode, plays every floor in the playthrough test (section 8), which proves every floor can be finished.

### 4.19 Touch-only devices

- **Detection:** `matchMedia('(any-pointer: fine)').matches` is false, `navigator.maxTouchPoints > 0`, no gamepad connected, and no key pressed yet.
- **No touch controls:** every scene sets `touch: []`, `game.input.touchEnabled = false`, and the engine's `touch` setting is forced to Hidden.
- **The notice:** the title shows a panel: **"Controller or keyboard required"** with "Connect a controller or a keyboard to play." and a big **SETTINGS** button on the panel (a tap, read with `input.clicked()`, opens `game.menu('settings')`); the engine's corner menu button stays too (corner: true). Taps don't start a game.
- **Attract mode runs** after 10 s, as anywhere; a tap returns to the notice. Connecting a gamepad (`gamepadconnected`) or pressing a key hides the notice for good.

### 4.20 Online: AI Hub sessions (shared world) and the game on its own

**Mode:** `shared-world`, seats `[1, 4]`, the game's **own card** (`card: true`). The host's copy runs the world; other copies send their player's actions and show the world the host sends, following `examples/arena.html`: every copy moves its own hero at once and never waits for the network.

**Page:** the six metas and the unmodified client first in `<head>` (3.6). `hub:session-minutes` 6.

**When `AIHub.active` (known on the first line):**
1. Create the game with the standard menu kept (so a `null` from `connect()` still leaves a normal game) but `corner: false, autoPause: false, backGesture: false, fullscreen: 'button'`. Session scenes are `pausable: false`, so neither the pause action nor the page losing focus can pause the world, and nothing calls `game.menu()` in a session (over a non-pausable scene it would make the scene wait).
2. Skip the title, attract mode, menus and class select. Boot, then `const info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true })`. If `info` is null, run as a normal game (title and all).
3. Build floor 1 for `info.players` (classes by seat: 0 Berserker, 1 Shieldmaiden, 2 Ranger, 3 Hexer; colours from the hub), then call `AIHub.ready()` once, with no key press.
4. **The card** (our scene, until `start`): the logo; "ROUND n"; the players lined up as their heroes in seat colours, each with a READY tick from the `card` event's `ready`; **how to win** ("Most points when the clock runs out: treasure, kills, stairs. Don't starve."); **this player's controls** from `input.label` on their device; the time left from `card.left` (or PAUSED); Ready on Enter, ✕, or a click on READY → `AIHub.answer('ready')`; More time on △, the T key, or a click on MORE TIME → `AIHub.answer('more')` (again takes it back). No menus, settings or choices; any card randomness from `AIHub.rng('card')`.
5. **Start:** on `start`, show 3-2-1 from `AIHub.time()` (negative); play begins at `AIHub.time() >= 0`.
6. **Roles:** `info.isHost` runs the sim. `info.server` (a host with no player): runs the sim, no local hero, camera, input or sound; its draw shows only a dark "HOSTING" frame. Clients run puppets.

**Messages** (JSON, compact arrays, integers):

| Message | From → to | Delivery | Rate | Content |
|---|---|---|---|---|
| `me` | client → host (`to: host`) | unreliable | 12/s | `{ t:'me', at, x, y, a (aim, centiradians), f (fire held), p (plant), q (the floor serial it is on) }` |
| `act` | client → host | reliable | on press (≤ 3/s) | `{ t:'act', k:'magic', n (press counter), v: [halfWidth, halfDepth] }`: the client's visible ground in tiles, so the host's blast strikes what that player sees |
| `s` (snapshot) | host → all | unreliable | 10/s | `{ t:'s', at, q, h:[[id,x,y,a,hp,score,keys,flasks,flags,amuletT]], m:[[id,kindRank,x,y,dirState]], p:[[id,kind,x,y,z,vx,vy,vz]], g:[[id,rank]], b:[hp,phase,x,y,state] }` |
| `e` (events) | host → all | reliable | batched every 125 ms (≤ 8/s) | `{ t:'e', e:[[type,...args], ...] }`: `floor`, `gone` (item id, by), `drop`, `door` (group), `trap`, `wall`, `kill` (id, by, points), `gen`, `magic` (by, x, y), `say` (line key, hero), `hurt`, `stolen`, `bell`, `boss`, `stairs`, `over` |

- **Area of interest:** the snapshot carries monsters and enemy projectiles within ±16 tiles across and ±11 tiles deep of *any* hero (one broadcast for everyone). Target size under 4 KB (100 monsters ≈ 2.5 KB); hard cap 12 KB (drop the farthest). The protocol limit is 16 KB.
- **Rates:** at most 20 messages a second leave a copy (bursts to 40). The host sends 10 snapshots plus at most 8 event batches; clients 12 `me` plus rare `act`s. A token bucket in `40-net.js` enforces it; `AIHub.send` returning false re-queues reliable messages.
- **The host trusts each client's own hero position** (as the arena example does), within reason: clamp the step to 1.5 × that hero's top speed over the elapsed time, reject positions inside walls (keep the last good one).
- **Shots:** a client draws its own shots at once as cosmetic projectiles (they stop at walls and spark on puppets, but never deal damage); the host spawns the authoritative ones from the reported position and aim while `f` is set, at the class's rate. Other heroes' shots are drawn cosmetically on every copy from their `firing` flag and aim in the snapshot. Enemy projectiles are authoritative and travel in snapshots.
- **Pickups, doors, stairs:** decided by the host from reported positions each step. The client hides an item it touched at once and shows it again if no `gone` event arrives within 0.5 s. Health, keys, flasks, score, amulets: host-authoritative, shown from snapshots; hurt effects play when health drops more than the drain explains.
- **Interpolation:** clients keep the last three snapshots and draw puppets at `latest.at − 100 ms`, linearly interpolated, extrapolating up to 100 ms, then easing. Puppet rigs animate from their interpolated velocity.
- **Time-up:** the host calls `AIHub.finish({ standings, scores, stats, awards })` at once (the grace is 5 s): standings by score, ties in one array; `scores` by id; `stats` per id (Kills, Treasure, Food, Floors); awards such as "Glutton" (most food), "Generator Buster", "Stair Finder", "Shot the Supper" (most food shot). No `won` (the results show medals: co-op that competes). The host also finishes when every hero is down at once or the King falls. Never call `progress()` or `result()` (they belong to parallel and ghost).
- **End:** on `end`, stop input (clear it every step), stop sending, stop all sound (`music(null)`, mute), and show "ROUND OVER" with the standings from the event (reasons `void`, `host-left`, `sat-out`, `session-ended` get their own line). The hub then shows its results and removes the game.
- **Leave:** a player who leaves is removed from the world (their hero fades out); if no players remain, the host finishes.
- **Session menu:** Esc or Options (not while Create is held) opens a small canvas overlay that never pauses: Volume, Music, Voices, Button symbols, Close. The hero stands still while it is open. No dev tools, quit, restart, saves or high scores in sessions.
- **Rules kept:** no `alert`, `confirm`, `prompt`, `window.open` or navigation; no network but the hub; names from the hub drawn as canvas text only (non-ASCII letters shown as `?` by the pixel font); the client's seeded storage and fullscreen handling are left alone.
- **Known limit:** a host whose tab is hidden stops simulating (browsers stop animation frames); the hub voids such a round after 20 s, as the protocol says.

**On its own** (no hub, or `connect()` answers null): solo and local co-op, everything above in 4.1–4.19; the hub code does nothing.

### 4.21 Audio (all synthesized in code; no audio files)

**Music** (the engine's song format, original compositions; `sync: true` in play so pause stops it):

| Song | Where | Feel |
|---|---|---|
| "Throw Down" | title, class select | 100 bpm, D minor march: square lead, triangle bass, snare rolls |
| "The Larder" | floors 1–3 | 120 bpm, bouncy minor, plucked pulse, a kitchen-clatter drum loop |
| "The Ossuary" | floors 4–6 | 96 bpm, organ-like pulse12 arpeggios in triplets, low drone |
| "The Furnace Gut" | floors 7–8 | 136 bpm, driving saw bass, anvil hits |
| "Hoard Rush" | treasure rooms | 160 bpm, a frantic jig over a ticking hi-hat |
| "King Famish" | boss | 140 bpm; a layer added per phase (`audio.layer`) |
| "Gauntlet Down" | ending, credits | heroic major fanfare, then a calm theme under the credits |
| "The Gaunt Is Fed" | game over | a slow descending dirge (plays once) |
| "Name Thyself" | initials, high scores | a short jaunty loop |

- **Dynamic layers:** a drums layer fades in when 12 or more monsters are within 8 tiles of any local hero; a heartbeat layer when a local hero is under 200 health.
- **Sound effects** (engine presets where they fit, custom `audio.define` voices otherwise): four hero shots (axe whoosh, javelin swish, arrow twang, hex zap), melee per class, hits, hero hurt, monster deaths per type, generator hit and crumble, spawn, eat (chomp), shot food (splat), stew (gurgle), flask pickup and blast (boom with a choir chord), key pickup (jingle), door (iron rattle), chest, coins, gem, crown, amulet, special potion (power-up arpeggio), stairs (descending arpeggio), trap (rumble), transporter (warp), stun, force field hum and zap, spikes (shing), lava bubble, the Tithe's drone and drain, the Bell (dong), lob whistle and crock shatter, fireball, fryar blink, snatcher giggle, boss stomp, plate throw, chew, roar, collapse; UI move, select, back, join, leave, pause.
- **Voices: the Babble synth** (`53-audio.js`, on the engine's AudioContext and its `voice` bus, E8). Text → syllables (vowel groups with their consonants); each syllable is a 60–140 ms note: a saw or pulse source through two band-pass formant filters chosen by the vowel (a 800/1200 Hz, e 500/1900, i 300/2300, o 500/900, u 350/800; Q 5–8), a short filtered-noise burst for s, sh, t, k, p onsets, 8 ms attack and 30 ms release, pitch from the voice's base with a per-syllable offset hashed from the syllable (the same word always sounds the same), rising at "?", falling at sentence ends, gaps at spaces and punctuation. Voices:

| Voice | Base pitch | Rate (syllables/s) | Character |
|---|---|---|---|
| The Gaunt (narrator) | 78 Hz | 5 | dark formants (× 0.8), echo (0.18 s delay, 0.35 feedback); music ducks under it |
| Berserker | 110 Hz | 7 | square, a little noise (gruff) |
| Shieldmaiden | 190 Hz | 7 | clean saw |
| Ranger | 230 Hz | 9 | quick, light |
| Hexer | 260 Hz | 8 | vibrato, a cackle on "!" |
| King Famish | 58 Hz | 4 | wet gurgle (noise mix, low-pass wobble) |
| Fryar | 170 Hz | 8 | nasal (narrow formants) |
| Snatcher | 420 Hz | 11 | squeaky |
| Gnasher | 120 Hz | 10 | grunts, two syllables at most |

- Heroes bark short gibberish on hurt, low health, pickups, magic and joining; monsters chatter when they spawn and die (rate-limited: at most 3 voices at once, oldest cut). Headless, the synth does nothing (the narrator queue still runs, for tests).

### 4.22 Art direction

**Base:** the engine's native style: PS1/N64-era 2D at `res: 'ps1'`, the HD Humanoid rigs (shaded volumetric limbs, outfits, faces), Blobs, textured TileMap walls and floors with materials, props, canvas lighting with torches and glows, particles, `E.font.title` logos, `E.tones` shading. Aim at the engine's look target (above SNES, level with the best PS1 2D); run `tools/check.mjs` and act on every look note.

**Realms:**

| Realm | Floors | Floor and walls | Palette | Props | Light |
|---|---|---|---|---|---|
| The Larder | 1–3, Treasure Room I | `E.tex.flagstone` in warm grey-brown; walls `face: 'stone'`, accent walls `'plank'` (shelves) | warm umber, mustard, brick red | barrels, kegs, sacks, crates, hanging hams, candles | torches; ambient 0.5 |
| The Ossuary | 4–6, Treasure Room II | pale slate floor with bone dust; walls `'stone'` with `'ruin'` over them, accent walls of stacked bone | bone white, slate blue, verdigris | skulls, bones, coffins, candelabras, cobwebs, urns | cold blue candles, green ghost-fire; ambient 0.38 |
| The Furnace Gut | 7–8 | dark iron plate and brick, lava channels | soot black, iron, ember orange | braziers, fire drums, anvils, chains | lava glow, braziers; ambient 0.32; `game.weather = { kind: 'ash', amount: .4 }` |
| The Banquet | 9 | checkered marble, a long table | royal purple, tarnished gold, candle yellow | chandeliers, banners, a rose window, the throne, candelabras | chandeliers; ambient 0.45 |

**Detail, lights and shadows:** TASK.md treats the performance budget as unlimited, so spend detail freely: 3–8 props a room, torches and glows everywhere light would come from, particles on every hit, pickup and death, a contact shadow (`r.shadow`) under every hero, monster, generator and item, and `game.enableGPU({ map })` (Settings → Enhanced lighting, on by default where WebGPU exists) for wall-cast shadows, colored light and bloom; the canvas lighting stands in elsewhere (the adventure kit shows both).

**From the asset store** (cut into one small set with `tools/asset-set.mjs`, inlined in the bundle): roast (`kenney-food:wholer-ham`), loaf (`kenney-food:loaf`), feast platter (`kenney-food:plate-dinner`), stew bowl (`kenney-food:bowl-soup`, recoloured green), flask (`kenney-mini-dungeon:potion`, recoloured blue), chests (`kaykit-dungeon-remastered:chest`, core `chest`), kegs, barrels, crates, candles (`kaykit-dungeon-remastered`), coffins, urns, gravestones (`kaykit-halloween-bits`, `kenney-graveyard`), spikes (`kaykit-dungeon-remastered:floor-tile-big-spikes`), braziers (`kenney-graveyard:fire-basket`). Check each with `node tools/asset-sheet.mjs`.

**New art (made for this game):**
- **Gear** (engine change E2): Berserker's axe and horned helmet, Shieldmaiden's round shield, Ranger's bow (string drawn to the right hand), Gnasher's club, Fryar's frying pan, the Tithe's scythe, King Famish's giant carving fork.
- **The Shade rig** (Hungerghost): a teardrop sheet with a sine-wave hem that flutters with speed, two glowing eye holes and a gaping mouth that opens as it nears a hero, half-transparent (`px.blend`), with a wisp trail; size and tint by rank.
- **Monster dressing:** Gnasher (`bulky` 0.85, bald, green-grey, `eyeGlow`, club), Pot-Lobber (`chibi` 0.8, a tall white cook's hat, apron, a crock in hand), Cinder Imp (`E.Blob` with horns, wings, tail, fangs, ember palette), Fryar (robe, hood, pan, `eyeGlow`), Snatcher (`chibi` 0.8, hood, a bulging sack on its back drawn from the shoulder joint), the Tithe (`build: 'skeleton'` 1.3, robe, hood, scythe, red `eyeGlow`), King Famish (`skeleton` 2.4, crown, cape, robe, the fork; an open ribcage with the Iron Gauntlet glowing inside, drawn at the chest joint with `rig.worldOffset`).
- **Generators** (`E.SHAPES` entries with a `dmg` param 0/1/2): Ash Urn, Gnasher Den, Crockery Hutch, Ember Grate (emissive), Candle Shrine, Sack Heap, Soup Tureen.
- **String sprites** (8–16 px): cider jug, key (gold), gold pile, gem, crown, the 7 special potions (one colour each), 5 amulets, hero projectiles (axe spinning via `rot`, javelin, arrow, hex-bolt), crock and shards, fireball, HUD icons, class emblems.
- **Floor pieces:** stairs (a dark stairwell with steps and an EXIT glyph; skip stairs carry the floor number), door bars, trap plates, transporter pads (animated swirl), stun runes, force-field pylons and beams, Dinner Bell, fake-wall shimmer.
- **Logo:** GAUNTLETDOWN with a falling gauntlet in place of the "O" of DOWN.

### 4.23 Animation

**Base:** the engine's procedural system: Humanoid and Blob rigs posed every step from velocity and state, `E.MOVES` attacks driven by `E.Attack`/`E.Combo`, poses (`cheer`, `cast`, `die`, `kneel`) and states (`hurt`, `down`, `expr`), `rig.kick` squash and stretch, tweens and `game.script` for choreography.

**New animations:**
- **Hero throws:** Berserker and Shieldmaiden `throw` with a body twist; Ranger's **bow draw and release** (a custom attack spec: left arm forward holding the bow, right hand drawn back to the chin in the wind-up, released at the active phase); Hexer `cast` with a staff flourish.
- **Melee combos** per class (4.2), each checked frame by frame with `tools/filmstrip.mjs` (wind-up, strike, clean settle).
- **Eating:** a quick chomp: head dip, squash and stretch (`rig.kick`), crumbs.
- **Starving gait:** `hunch` rises as health falls; shorter steps.
- **Magic:** `cast` pose, a ring expanding to the screen's edge, the screen flash.
- **Death and rising:** `die` pose, then a wisp rising from the body; rising again: the hero appears lying `down` beside an ally and gets up (`down` eased from 1 to 0) with a gold glint.
- **Descending:** heroes sink step by step into the stairwell (z down over 0.5 s) under the iris.
- **Monsters:** ghosts bob and their hems flutter, mouths chomp on contact; gnashers waddle and raise the club high; lobbers wind up overhand and waddle away; imps flap and their mouths glow before spitting; fryars fade out into smoke and pop back in; snatchers sprint with a bouncing sack; the Tithe glides, scythe swaying, with a stream of red motes from its victim; every spawn rises out of its generator with dust.
- **Rank loss:** a quick shrink tween with a puff.
- **Generators:** breathing pulse while spawning, a shake when hit, crumbling through three states.
- **Items and features:** doors' bars rise; chests' lids open (`r.prop('chest', ..., { open: true })` or a lid tween on the shape); pads swirl; fields crackle; spikes tremble before they rise; walls of the impatience stage glow.
- **King Famish:** scripted (`game.script`): rising from the throne, overhand plate throws, the stomp, walking to a platter and gorging (head bobbing, chewing), the ribcage opening, the charge, the collapse (`die`), the gauntlet tumbling out.
- **Victory:** every hero `cheer`s; the gauntlet is raised.

### 4.24 Difficulty, scaling and the tuning table

| `TUNE` key (Dev slider) | Default | Range | Meaning |
|---|---|---|---|
| `drain` | 1.0 | 0–5 | life force lost per second |
| `startHealth` | 700 | 100–2000 | health at the start and when rising |
| `foodHeal` | 100 | 25–300 | roast and cider (loaf is half, feast double) |
| `heroSpeed` | 1.0 | 0.5–2 | × class speed |
| `shotRate` | 1.0 | 0.5–3 | ÷ class cooldown |
| `shotDamage` | 1.0 | 0.5–3 | × class shot damage |
| `magicPower` | 1.0 | 0.25–3 | × magic damage |
| `monsterSpeed` | 1.0 | 0.25–3 | × monster speed |
| `monsterDamage` | 1.0 | 0–3 | × monster damage |
| `spawnInterval` | 1.0 | 0.25–4 | × generator interval |
| `generatorHp` | 1.0 | 0.25–4 | × generator HP |
| `maxMonsters` | 140 | 20–300 | monsters alive at once (sessions use min(this, 100)) |
| `impatience` | 180 | 30–600 | seconds until every door opens (warning 30 s before; walls become stairs 60 s after) |
| `titheAt` | 120 | 30–600 | seconds until the Tithe arrives (floor 5 on) |
| `hoardTime` | 30 | 10–90 | treasure-room seconds |
| `stairHold` | 1.0 | 0–3 | seconds on the stairs to descend |

**Difficulty** (Settings; multipliers on top of the tuning values): Easy (drain × 0.5, monster damage × 0.7, starting health × 1.3), Normal (× 1), Hard (drain × 1.5, monster damage × 1.3, starting health × 0.85). **Player count:** spawn interval ÷ (1 + 0.25 × (n − 1)); monster cap × (1 + 0.3 × (n − 1)) up to the cap's range; boss HP × (1 + 0.5 × (n − 1)). **Descent II:** every rank +1 (capped at 3), generator ranks +1, drain × 1.5.

**Balance targets** (check with the bot and by playing): a careful solo player on Normal clears each floor in 2–4 minutes and reaches the stairs with 300 or more health, using the food the floor provides; floor food is worth 300–600 health; four players on one screen face visibly bigger hordes but never a frozen jam of 300.

---

## 5. Content

### 5.1 Story and story beats

Told in the source's terse narrator style, all original.

- **Prologue** (title attract card, How to Play page 1): "BENEATH THE TOWN OF HOLLOWMERE, A DUNGEON DIGS DOWN, AND DOWN, AND DOWN. THEY CALL IT THE GAUNT. AT ITS BOTTOM SITS KING FAMISH, WHO HAS EATEN FOR NINE HUNDRED YEARS AND IS STILL HUNGRY. EACH WINTER HE THROWS HIS IRON GAUNTLET DOWN THE PIT AND DARES THE HUNGRY TO FETCH IT. NO ONE HAS CLIMBED BACK UP. TONIGHT, FOUR FOOLS ANSWER. THE GAUNTLET IS DOWN."
- **Game start** (first floor card): "THE GAUNTLET IS DOWN. COME AND GET IT."
- **Realm I, The Larder** (before floor 1): "THE TOP OF THE GAUNT, WHERE THE KING KEEPS HIS SNACKS. YOU ARE THE SNACKS."
- **Realm II, The Ossuary** (after Treasure Room I): "BELOW THE LARDER LIE THE BONES OF THOSE WHO CAME BACK FOR SECONDS."
- **Realm III, The Furnace Gut** (after Treasure Room II): "THE GAUNT'S OWN BELLY. IT IS VERY HOT, AND IT IS DIGESTING."
- **The Banquet** (before floor 9): "THE TABLE IS SET. GUESS WHO IS DINNER."
- **King Famish** (a Dialog with his live portrait, gibberish voice, captions; in sessions it auto-advances and never blocks): intro "AH. DESSERT."; phase 2 "SECOND HELPINGS!"; phase 3 "MORE! MORE! MORE!"; defeat "...still... hungry..."
- **Ending** (after the King falls and the gauntlet is taken; the heroes cheer around the raised gauntlet): "THE KING FALLS. THE IRON GAUNTLET IS YOURS. YOU CLIMB FOR SEVEN DAYS, EATING EVERYTHING ON THE WAY UP. HOLLOWMERE THROWS A FEAST IN YOUR HONOUR. YOU ARE, OF COURSE, STILL HUNGRY."
- **Credits** roll over "Gauntlet Down", then the tag: "THE GAUNT IS NOT DEAD. IT IS ONLY DIGESTING. DESCENT II AWAITS."
- **Descent II card:** "THE GAUNT DIGS DEEPER. SO MUST YOU."

### 5.2 Heroes

As in 4.2, with these class-select quips: Berserker "HITS FIRST. EATS SECOND. THINKS RARELY."; Shieldmaiden "THE SHIELD IS FOR YOU. THE SPEAR IS FOR THEM."; Ranger "FASTEST LEGS IN HOLLOWMERE. FASTEST TO RUN OUT OF ARROWS? NEVER."; Hexer "SHE HAS CURSED BETTER DUNGEONS THAN THIS."

### 5.3 Bestiary

Seven monsters, the Dinner Bell and King Famish (4.5), introduced one or two per floor (5.5), all together by floor 8.

**King Famish (floor 9):**
- **Arena:** the banquet hall: the throne on a dais at the north end (`K`), a long table (`=`) down the middle with three feast platters (`P`) and two soup tureens (`U`), four doorways where gnasher waves enter (`meta.points.wave`), food in the corners, two flasks in side alcoves, pillars.
- **Phase 1 (100–70%), "Dinner is served":** he stays near the throne, throws fans of three plates (lobbed `Bullets` with landing shadows, 10 damage each) every 2.5 s, and stomps (a ring shockwave, 15 damage, jump-free: step out of the ring) when a hero comes within 40. The two tureens breed ghosts (rank 2); break them.
- **Phase 2 (70–35%), "Second helpings":** he walks to the nearest platter and **eats** (2.5 s, healing 5% a second). Every platter shot or eaten by a hero denies him; with none left he roars and rages. The narrator inverts the old rule: "HE IS EATING. SHOOT THE FOOD!" Gnasher waves pour in from the doorways every 12 s.
- **Phase 3 (35–0%), "The Gaunt hungers":** his ribcage opens and the Iron Gauntlet glows inside (shots from the front deal double); he charges along straight lines (a 0.6 s telegraph line on the floor), breathes a cone of famine fog (triple drain while inside) and the Tithe appears. Each flask takes 6% of his health.
- **Defeat:** the collapse, a burst of bones, the gauntlet tumbles out; whoever grabs it gets +5000; "THE GAUNTLET IS DOWN. SO IS THE KING." Then the ending.

### 5.4 Items

As in 4.7. Special potion and amulet placement: F3 Hardshot Draught; F4 amulets Veil and Ricochet; F5 Witchwater and Iron Brew; F6 Ogre Ale (behind a fake wall) and amulet Stench; Treasure Room II Deep Pockets (in its locked chest); F7 Featherfoot Cordial and amulet Ironskin; F8 Quickshot Tonic and amulet Rending.

### 5.5 Floors

Nine floors, two treasure rooms, a boss. Each new floor introduces one or two things and reuses what came before. Every floor passes `validateFloor()` (8.3) and a bot run before the next is built.

**Floor 1, "The Pantry Steps" (The Larder) — complete map** (40 × 20, validated while planning: 4 starts, 1 key, 1 door run, the stairs reachable only through the door):

```
########################################
#@@......#..........#..........#.......#
#@@......#...g......#....$.....#...*...#
#........#..........#..........#.......#
#...b....#..######..#...g......#...h...#
#........#..#.k..#..#..........+.......#
#............g...#.......f.....+...E...#
#........#..#....#..#..........#.......#
#........#..######..#....G.....#...$...#
#........#..........#..........#.......#
####..########..#########..#############
#......................#...............#
#..g......##....G......#.....g.........#
#..........#...........#.........*.....#
#....f.....#....g...........######.....#
#..........#................#..........#
#..$.......####.......$.....#...f......#
#...........................#..........#
#.........g.................#....b.....#
########################################
```

Meta: `rank: 1, genRank: 1, par: 120, music: 'larder'`. Teaches, in order (tips fire as each thing first comes into view): move and aim (start room), fire (the first ghosts), generators (the Ash Urn in the hall: "THAT URN BREEDS THEM. BREAK IT."), food and the drain (the roast after the first fight), the key in the closet, the door, treasure, the stairs. Seven ghosts, two urns, three roasts, two loaves, four golds, two gems, a chest.

**Briefs for the rest** (author them in the legend; keep the counts and the beats):

| Floor | Size | New | Layout and beats | Monsters and generators (rank / gen rank) | Items |
|---|---|---|---|---|---|
| **2, The Root Cellar** (Larder) | 48 × 32 | Gnashers and dens; melee; Blast Flasks; cider (don't shoot it) | Narrow root tunnels (2 wide) where gnashers bunch, so melee comes naturally; three flasks just before a big den room (6 × 10) with three dens ("MAGIC STRIKES ALL YOU CAN SEE"); cider jugs set in a corridor you shoot down; three door runs and three keys: two runs on the way to the stairs, one sealing a side vault with **skip stairs `4`** | 14 gnashers, 6 ghosts; 4 dens, 2 urns (1 / 2) | 3 flasks, 3 cider, 2 roasts, 2 loaves, 3 keys, 2 chests, gold and gems |
| **3, The Smokehouse** (Larder) | 52 × 36 | Pot-Lobbers and hutches; cracked walls; trap plate and trap walls; first special potion; locked chest | Smoking racks in rows (low accent walls) with lobbers behind them throwing over; a cracked wall hides a shortcut and a stash; a `^` plate in a treasure alcove drops `T` walls and releases a held horde of gnashers; **Hardshot Draught** in a side room; a locked chest | 8 lobbers, 12 gnashers, 8 ghosts; 3 hutches, 2 dens, 2 urns (2 / 2) | Hardshot Draught, 2 flasks, cider, 3 roasts, 2 keys, a locked chest |
| **Treasure Room I, The Pantry Hoard** | 32 × 24 | The hoard clock | A ring of pantry shelves around a central heap; gold, gems, a crown, a feast; the stairs in the middle open from the start | none | 30 golds, 8 gems, a crown, 2 roasts |
| **4, The Bone Larder** (Ossuary) | 52 × 36 | Fryars and shrines; transporters; amulets; spoiled stew | Four bone chapels linked only by transporter pairs (`O` ×6); fryars blinking among pews; a stew beside a roast ("CHOOSE"); **Veil** and **Ricochet** amulets | 8 fryars, 10 gnashers, 10 ghosts; 2 shrines, 2 dens, 3 urns (2 / 2) | 2 amulets, 2 stews, 3 roasts, 2 flasks, 3 keys, a locked chest |
| **5, The Choir of Teeth** (Ossuary) | 56 × 40 | The Tithe; stun runes; force fields; the Dinner Bell | A long nave with the Bell at its heart; side aisles lined with stun runes; treasure behind cycling force fields; one Tithe placed in the crypt at the far end; the impatience Tithe arrives at 2:00; **Witchwater** and **Iron Brew** | 1 Tithe, 6 fryars, 8 lobbers, 10 ghosts; 2 shrines, 2 hutches, 2 urns (2 / 3) | 2 specials, 4 flasks, 3 roasts, 2 cider, 3 keys |
| **6, The Crypt of Pickled Kings** (Ossuary) | 56 × 44 | Fake walls and secrets; Snatchers and sack heaps; ally stun begins; `Y` walls and `v` plate | A maze of burial niches (pickled kings in jars) with fake walls hiding three crowns and **Ogre Ale**; snatchers burst from two sack heaps and flee to the edges; **skip stairs `8`** behind a fake wall; the **Stench** amulet | every type so far: 8 gnashers, 6 lobbers, 6 fryars, 8 ghosts, 4 snatchers; 2 sack heaps, one of each other generator (2 / 3) | Ogre Ale, Stench, 3 crowns, 3 flasks, 3 roasts, 4 keys |
| **Treasure Room II, The Reliquary** | 32 × 24 | | Reliquary shelves; a locked chest with **Deep Pockets** (a key lies in the room) | none | 24 golds, 10 gems, a crown, the locked chest, a key |
| **7, The Oven Stair** (Furnace) | 56 × 40 | Cinder imps and ember grates; lava; spikes | A descending switchback over lava channels (`~`) with narrow bridges lined with spikes; imps spitting across the lava; ash falling; **Featherfoot Cordial**, the **Ironskin** amulet | 12 imps, 10 gnashers, 6 lobbers; 4 grates, 2 dens, 2 hutches (2 / 3) | Featherfoot, Ironskin, 4 flasks, 3 roasts, 2 cider, 3 keys |
| **8, The Gristle Gate** (Furnace) | 64 × 44 | The gauntlet run: everything at rank 3 | Long parallel corridors packed with rank-3 hordes and ten generators: the arcade's monster jam; every feature once more; the final approach needs two door runs in series (two keys); **Quickshot Tonic**, the **Rending** amulet; "THE KING SMELLS YOU." | 40 placed monsters of every type, 1 Tithe; 10 generators (3 / 3) | Quickshot, Rending, 6 flasks, 5 roasts, 3 cider, 5 keys |
| **9, The Banquet of King Famish** | 44 × 32 | The boss | 5.3 | King Famish; tureens and waves | 3 platters, 4 roasts, 2 flasks |

Then the ending, the credits, and Descent II (floors 1–9 again, harder, 4.24).

### 5.6 Narrator lines (the Gaunt)

Keys in `05-text.js`; `{CLASS}` is BERSERKER, SHIELDMAIDEN, RANGER or HEXER (in sessions the hub name is shown in the caption beside it).

| Key | Line |
|---|---|
| `welcome_<class>` | WELCOME, BERSERKER. / WELCOME, SHIELDMAIDEN. / WELCOME, RANGER. / WELCOME, HEXER. |
| `start` | THE GAUNTLET IS DOWN. COME AND GET IT. |
| `fading` | {CLASS}, YOUR LIFE FORCE IS FADING. |
| `starving` | {CLASS} IS STARVING! |
| `dying` | {CLASS} IS ABOUT TO PERISH! |
| `eaten` | {CLASS} HAS BEEN EATEN. |
| `rise` | {CLASS} RISES AGAIN. HOW TIRESOME. |
| `tip_food` | LIFE FORCE DRAINS WITH EVERY BREATH. EAT. |
| `tip_dontshoot` | NEVER SHOOT THE SUPPER. |
| `shot_cider` | {CLASS} SHOT THE CIDER! |
| `shot_feast` | {CLASS} SHOT THE SUPPER! |
| `ate_stew` | {CLASS} ATE THE STEW. A POOR CHOICE. |
| `glutton` | {CLASS} EATS FOR FOUR. |
| `tip_stairs` | THE STAIRS GO DOWN. THEY ALWAYS GO DOWN. (Moving, aiming and firing are taught by on-screen prompts built from `label()`, not by the narrator.) |
| `tip_ghost` | HUNGERGHOSTS. THEY HAVE NOT EATEN IN NINE CENTURIES. |
| `tip_generator` | THAT URN BREEDS THEM. BREAK IT. |
| `tip_gnasher` | GNASHERS. ALL TEETH, NO MANNERS. |
| `tip_melee` | TOO CLOSE TO THROW? THEN HIT IT. |
| `tip_lobber` | POT-LOBBERS THROW OVER WALLS. WATCH THE SHADOWS. |
| `tip_imp` | CINDER IMPS. THEY COOK WHAT THEY SPIT ON. |
| `tip_fryar` | THE FRYARS FADE. STRIKE WHEN THEY SHOW THEMSELVES. |
| `tip_snatcher` | A SNATCHER! MIND YOUR POCKETS. |
| `stolen` | {CLASS} HAS BEEN ROBBED! |
| `tithe_comes` | THE TITHE HAS COME TO COLLECT. |
| `tithe_paid` | THE TITHE IS PAID. |
| `tithe_slain` | {CLASS} CHEATED THE TITHE! |
| `bell` | {CLASS} IS ON THE MENU! |
| `bell_pass` | NOW {CLASS} IS ON THE MENU. |
| `tip_magic` | MAGIC STRIKES ALL YOU CAN SEE. USE IT WISELY. |
| `shot_flask` | {CLASS} SHOT THE MAGIC. MOSTLY WASTED. |
| `key_first` | A KEY. HOW THOUGHTFUL. |
| `tip_door` | A KEY OPENS A DOOR. ANY DOOR. ONCE. |
| `treasure_first` | TREASURE! THE GAUNT KEEPS COUNT. |
| `special_<type>` | IRON BREW. {CLASS} FEELS STURDIER. (one per special: OGRE ALE ... HITS HARDER; QUICKSHOT TONIC ... THROWS FASTER; HARDSHOT DRAUGHT ... THROWS HARDER; WITCHWATER ... CRACKLES WITH MAGIC; FEATHERFOOT CORDIAL ... STEPS LIGHTER; DEEP POCKETS ... CARRIES MORE) |
| `amulet_<type>` | THE VEIL. NOW YOU SEE {CLASS}. NOW YOU DON'T. / IRONSKIN. NOTHING BITES {CLASS}. FOR NOW. / STENCH. EVEN GHOSTS GAG. / RICOCHET. MIND YOUR HEADS. / RENDING. NOTHING STOPS THOSE SHOTS. |
| `tip_trap` | THAT PLATE WAS A TRAP. ENJOY. |
| `tip_tele` | STEP ON THE RUNE. ARRIVE ELSEWHERE. |
| `tip_stun` | STUN RUNES. DO NOT DAWDLE ON THEM. |
| `tip_field` | THE FIELD HUMS. WAIT FOR THE QUIET. |
| `tip_secret` | THAT WALL WAS LYING. |
| `ally_stun_on` | FROM HERE ON, YOUR SHOTS STUN YOUR FRIENDS. |
| `ally_shot` | {CLASS}, THAT WAS A FRIEND. |
| `impatient` | THE GAUNT GROWS IMPATIENT. |
| `doors_open` | ALL DOORS ARE NOW OPEN. |
| `walls_stairs` | EVERY WALL IS NOW A STAIR. |
| `stairs` | {CLASS} FOUND THE STAIRS. |
| `skip` | {CLASS} TOOK THE SHORT WAY DOWN. |
| `hoard` | A HOARD! THIRTY SECONDS. GRAB. |
| `hoard_shut` | THE HOARD SLAMS SHUT. |
| `king_near` | THE KING SMELLS YOU. |
| `king_intro` | KING FAMISH WILL SEE YOU NOW. |
| `king_eating` | HE IS EATING. SHOOT THE FOOD! |
| `king_dead` | THE GAUNTLET IS DOWN. SO IS THE KING. |
| `game_over` | THE GAUNT IS FED. |
| `continue` | RISE, OR BE SUPPER. |
| `high_score` | NAME THYSELF, MORSEL. |
| `floor_<n>` | one line per floor card, e.g. F1 "WELCOME TO THE GAUNT, MORSELS.", F2 "MIND THE ROOTS. THEY BITE.", F3 "SMOKED, SALTED, SERVED.", F4 "THE BONES HERE ARE WELL PICKED.", F5 "THE CHOIR SINGS WITH ITS TEETH.", F6 "HERE LIE KINGS, IN BRINE.", F7 "THE OVEN IS ALWAYS ON.", F8 "THE GATE OF GRISTLE. NO ONE CHEWS THROUGH.", F9 "DINNER IS SERVED." |

### 5.7 How to Play cards

1. **The Gauntlet is down.** The prologue in two lines, and the goal: reach the bottom, take back the Iron Gauntlet.
2. **Move and aim.** Prompts for the device in use (left stick/WASD, right stick/mouse).
3. **Throw and strike.** Fire throws; at arm's length it strikes; hold Plant to stand your ground and aim.
4. **Life force drains.** Every second. Eat roasts, loaves and cider. Never shoot the supper. The green stew is spoiled.
5. **Magic.** A flask strikes everything on screen. Shooting a flask wastes most of it. The Tithe dies only to magic.
6. **Keys, doors and stairs.** A key opens one run of doors. Stand on the stairs to go down. Numbered stairs skip floors.
7. **Generators.** They breed monsters until broken. Wounded monsters shrink.
8. **Friends.** Up to four on one screen: a free controller's Options, or 2 on the keyboard, joins. Whoever takes the stairs gets the bonus. Online through AI Hub.

### 5.8 About and Credits (paged)

1. **Credits:** Gauntletdown, version 1.0. Built by the builder model from PLAN.md. Engine: my-3D2dge v0.85.2 by Michael Crosato (MIT). Generic props from the engine's asset store (Kenney, KayKit: CC0). AI Hub Session Protocol v1, client 1.4.0. Inspired by *Gauntlet* (Atari Games, 1985); an original homage with no assets from it. All music, sound and voices are generated in code.
2. **Source Information** (the 13 fields of TASK.md, Appendix B).
3. **Testing Feedback** (the 4 answers).
4. **Engine Feedback** (the 6 answers).
5. **Prompt Feedback** (the 4 answers).

The text matches the chat reply and `exit-interview.json` word for word. Pages wrap and scroll with the stick or arrows; the font stays at least scale 1.

---

## 6. Build order and milestones

Each milestone ends with its tests green (`node tests/run.mjs <suites>`). Build the riskiest thing (online shared world) second, on the smallest slice, before content piles on.

| # | Milestone | Contents | Exit criteria |
|---|---|---|---|
| **M0** | Setup | Dev subfolder from the handoff; `npm install` (Playwright's Chromium is usually cached in `~/.cache/ms-playwright`); `hub/` files; `build.mjs`; `tests/run.mjs` with the vm loader and one check; `ENGINE-CHANGES.md` | `node tests/run.mjs` prints "1 checks, 0 failed"; the built single file opens via `node tools/check.mjs` with no errors |
| **M1** | Core slice | Registries, `TUNE`, floor parser and validator, floor 1; one hero (Berserker) with move, aim, fire, drain; ghosts and urns (generators, ranks, flow field); food, keys, doors, stairs; score; a minimal HUD and captions; `game.debug` | Sim tests for each of those pass; floor 1 validates; the bot (simple form) finishes floor 1 |
| **M2** | Online spike (shared world) | Roles, intents over the network, snapshots and events, puppets and interpolation, the session flow (connect, a plain card, ready, countdown, time-up, finish, end, leave, server), the session menu, E4 | Fake-hub net tests pass with latency, jitter and 5% loss; the hub harness passes all four runs (8.6); the game still runs on its own |
| **M3** | Engine patches and characters | E1–E3, E5–E8; four dressed heroes with their gear; the Shade rig; monster dressing | Each patch's test passes; filmstrips of every class's throw and melee look right in all three views |
| **M4** | Heroes and co-op | All classes and stats; smart melee; plant; magic; shot flasks; every item, special and amulet; join and drop out; class select; shared camera and leash; rising again; continue; four HUD panels | Sim tests for each; a four-player local run (scripted inputs) with joins mid-floor |
| **M5** | Bestiary | Gnasher, Pot-Lobber, Cinder Imp, Fryar, Snatcher, the Tithe, the Bell; all generators with damage states; telegraphs; separation | A behaviour test for each monster (8.4) |
| **M6** | Level features | Cracked and fake walls, plates and trap walls, transporters, runes, fields, spikes, lava, skip stairs, impatience, treasure rooms, realm decoration and lights | A test for each feature |
| **M7** | Content | Floors 2–8, both treasure rooms, realm looks, story cards, every narrator line and floor intro, tips | Every floor validates; the bot finishes every floor (God mode only); look review screenshots |
| **M8** | The boss | Arena, three phases, the feast mechanic, waves, the Tithe, defeat, the gauntlet, ending, credits, Descent II | Boss tests (phases, healing, denial, defeat) and the ending flow |
| **M9** | Front end and meta | Title, menu, How to Play, High Scores, About, game over, continue, initials, pause items, Settings (Game group), Dev Tools (four pages), touch-only notice, the attract mode | UI tests: the attract timer and exit, Dev sliders and reset, glyph setting, touch-only (browser), high scores |
| **M10** | Audio | Nine songs, layers, every sound effect, the Babble synth and voices, the narrator's voice, the Voices setting | Headless: every sound and song name resolves with no engine warning; narrator queue tests; listen in a browser |
| **M11** | Polish and balance | Juice (hit-stop, shake, particles), lighting, animation review with filmstrips, 10-foot review at 1920×1080 and 1280×720, balance with the Dev sliders and bot metrics, session snapshot sizes | Look notes from `tools/check.mjs` addressed; balance targets in 4.24 met; snapshots under 4 KB typical |
| **M12** | Ship | Full suite; full playthrough; the hub harness; the bundle; About text, chat reply and `exit-interview.json` (Appendix A) | Everything in section 9 is true |

**If time runs short**, these can be removed whole (never stubbed): the isometric view option, Enhanced (WebGPU) lighting, Descent II, the second treasure room, the `toque` hat. Everything else is the demo.

---

## 7. Riskiest parts and how to de-risk them

| Risk | Why it is risky | De-risk |
|---|---|---|
| **Shared-world netcode at the hub's limits** | Hordes of 100+ monsters must reach clients under 20 messages a second, 16 KB a message, with 150 ms latency and 5% loss; host and server roles, leaving, time-up | Built second (M2) on the one-floor slice. Sim/intent/view split from day one. One broadcast snapshot (area of interest, integers, compact arrays) at 10 Hz; reliable event batches; the monster cap in sessions; a Node fake hub with latency, jitter and loss in the test suite; the real harness in a browser. **Fallback, only if shared world still fails the harness after M2:** switch the session mode to `ghost` (every copy runs its own floor from the client's seeded `Math.random`; each copy sends its own hero's state and draws the others' heroes as translucent ghosts that affect nothing; scores go to the hub with `progress()` and `result({ score })`). The same intents and hero-state encoding make this a small change. |
| **Crowds** (AI, collision, drawing hundreds of rigs) | A Gauntlet without hordes isn't one | TASK.md puts FPS targets and optimization out of scope, so don't optimize; just build crowds the way the engine's own recipe does, so the game stays playable while testing: one multi-source flow field (E1) instead of per-monster paths, `E.SpatialHash` separation, monsters far from heroes asleep, and the recipe's `r.actor(..., { every: 3, key })` for crowd rigs if a browser check shows the game unplayable. The monster cap (`maxMonsters`) is a gameplay and network number, not a frame-rate one |
| **The bot gets stuck** (attract mode, playthrough test) | Mazes, doors, crowds | Goal-driven with flow fields; stuck detection; waypoints taken from the flow field toward the stairs; teleport when cheats allow; the test fails with the floor and the bot's last goal, so it is fixable |
| **Unwinnable or broken floors** | Keys versus doors, trap walls, transporters, hand-written ASCII | `validateFloor()` (8.3) runs on every floor in the tests; the bot finishes every floor |
| **Engine patches** (Humanoid gear, FlowField, Shell) | Touching shared engine code can break views or menus | Small diffs; a test each; asset-sheet and filmstrip images in all three views; the handoff's own `node kits/test.mjs` still passes after the patches |
| **10-foot readability** | The engine's HTML menus are 14 px | E6 scale; screenshots at 1920×1080 checked by eye; the HUD is pixel art scaled with the picture |
| **Gibberish voices** | Web Audio formant synthesis can sound harsh; many at once get noisy | A Babble prototype on a test page during M3 (well before the audio milestone); cap at three voices; the narrator ducks music; a Voices volume |
| **Session rules versus the engine's standard features** | The engine pauses, shows corner buttons, goes full screen; the hub forbids pausing the world and owns Create + Options | Session game options (4.20), E4, non-pausable session scenes; the harness checks "no protocol problems" and "no dialogs" |
| **The bundle** | The client must be first and unmodified; inlined code must not end the script tag early | `build.mjs` asserts (3.6); a browser test opens the built file from `file://` and fails on any request or error |
| **This machine** | At planning time `/tmp` (a RAM disk shared by other agents) was 99% full; Chromium needs temp space; ports and processes are shared | `export TMPDIR=<dev>/.tmp` before browser tools; servers on port 0 bound to 127.0.0.1, confirmed by fetching the page and checking its `<title>`; stop only your own PIDs |
| **Scope** | Nine floors, a boss, four classes, netcode, a voice synth | Content is data; the build order puts every system on floor 1 first; the cut list in section 6 removes whole extras only |

---

## 8. Testing

### 8.1 The one command

`node tests/run.mjs [suite ...]` runs the suites (all by default: `floors sim play net ui hub`), prints **only failures** (`FAIL <suite> <check>: <detail>`), then one line: `412 checks, 0 failed (floors, sim, play, net, ui, hub)`. Exit code 1 on any failure. Rerun only the suites covering the code you changed. Screenshots are only for what a script can't judge (8.7).

### 8.2 Harness for headless suites

`tests/lib.mjs` loads `my-3d2dge.js` and `game/game.js` into a `node:vm` context (as the handoff's `game/test.mjs` does), with the stand-ins the kits' test uses (`window`, `addEventListener`, `location`) plus `matchMedia`, `navigator` and an optional fake `AIHub`; seeds `Math.random` and `rng.sim`; and gives helpers: `boot()`, `step(seconds)` (`game.advance`), `tap(action, player)`, `hold(action, on, player)`, `snap()` (`game.debug.snapshot()`), `warp(floor)`, `give(...)`, `spawn(...)`, `setTune(key, value)`. Every suite also fails on any `game.errors` entry or engine warning.

`game.debug.snapshot()` returns: `{ scene, mode, floor, t, heroes: [{ cls, x, y, hp, score, keys, flasks, amulet, specials, alive, stunned, queasy }], monsters: { byType, total }, generators, items, doors, impatience, boss: { hp, phase } | null, narrator: lastLineKey, attract, touchOnly, net: { role, sent, received, lastSnapshotBytes } }`.

### 8.3 Floors suite

For every `def('floors')`: rows rectangular and bordered; every character in the legend; 1–4 starts (padded to 4 on free neighbours); at least one stairs; skip targets exist; transporter pads come in pairs; force-field beams end at walls; `u` and `a` counts match `meta.specials` and `meta.amulets`; no generator within 4 tiles of a start; size within 24–72 × 16–48. **Solvable:** from the starts, flood fill through walkable cells (floor, items, monsters, plates, cracked and fake walls), stepping plates when reached (removing `T` or `Y`), following transporter pairs, and opening door runs next to the filled area while keys collected exceed keys used; the stairs must be reached. **No dead content:** every item, monster and generator is reachable once all doors are open (unless `meta.sealedOk`). (This is the algorithm used to validate floor 1 while planning.) The impatience timer opens every door at 3:00, so a player who spends keys badly is never stuck for good; the validator still demands a path with the floor's own keys.

### 8.4 Sim suite (headless, per system)

- **Boot and front end:** the title waits; **10 s idle starts the attract mode** (advance 10.1 s → `attract`), any input returns to the title and is consumed; menus move with keys, pick with confirm.
- **Heroes:** movement and wall collision; aim from facing, from a simulated mouse ground point and from `padAim`; fire rate per class; shot damage, pierce (Berserker), splash (Hexer); smart melee triggers only within reach and arc and never on ghosts; plant stops movement; keyboard-only firing plants.
- **Life force:** 10 s on a floor costs 10 × drain; no drain on cards, menus or pause; food values; cider and stew destroyed by shots with the right narrator key; stew's Queasy slows; carry limits leave extra pickups on the floor.
- **Magic:** a flask damages every monster in the screen rectangle and none outside; generator damage; the Tithe dies only to magic or a shot flask's blast; a shot flask detonates at half power within 80.
- **Monsters:** ranks shrink on damage and score by spawn rank; ghosts vanish on contact and deal rank damage; gnashers wind up before hitting; lobbers keep distance, flee inside 56 and land crocks over a wall (`map.arcClear`); imps fire only with sight; fryars can't be hit while invisible; snatchers steal (flask > key > amulet), flee, escape (item lost) or drop the item when killed; the Tithe drains at most 200 and vanishes; the Bell marks, passes on touch, ends after 12 s; Veil and Stench change targeting.
- **Generators:** spawn only near heroes, under the cap, at their rank; lose ranks with damage; die with points.
- **Features:** a key opens a whole door run and uses one key; cracked walls break by shots; fake walls are walkable; plates remove their walls; transporters move heroes to the pair; runes stun; fields cycle and hurt monsters too; spikes cycle; the stairs need the hold; skip stairs go to their floor; impatience opens doors at 180 s and turns walls into stairs at 240 s; the Tithe arrives at 120 s from floor 5; the treasure-room clock ends the room.
- **Co-op:** `game.addPlayer({ keys: 'right' })` and pads join; classes stay unique; the leash stops a hero leaving the screen; dropping out removes the hero; ally stun from floor 6 only.
- **Death:** falling, rising (beside an ally, start health, continues counted), the continue countdown, game over, initials per player (E7), the table (and no table entry with cheats on).
- **Boss:** phases at 70% and 35%; eating heals; shooting or eating every platter stops it; waves; the open ribcage doubles front damage; defeat → the gauntlet → +5000 → the ending → credits → Descent II.
- **Settings and Dev:** glyphs default PlayStation and the Xbox option changes labels (E5); each Dev slider changes the sim at once; Reset tuning restores every default; each cheat works; warp reaches every floor.
- **Narrator:** priorities, cooldowns, one tip per game, `say` events.
- **Engine patches:** E1–E8 tests (3.5).

### 8.5 Play suite (the scripted playthrough of the whole game)

1. **Full descent, deterministic:** a fixed seed, two bot heroes (Berserker and Hexer) with God mode on and no other cheats, from the title through class select, floors 1–8, both treasure rooms, the boss, the ending, the credits and the first floor of Descent II. Asserts the floor order, that every floor is finished by the bot within a time limit (6 minutes of game time each), the boss's phases in order, the ending scene and the score table. Run twice: the same `game.stateHash` both times.
2. **Balance smoke (no cheats):** one bot hero on Easy, floors 1–3: it reaches floor 4 alive. One bot on Normal, floor 1: finishes with 300+ health. Metrics (time, health at the stairs, food eaten, kills) are written to `tests/out/balance.json` for tuning.
3. **Attract loop:** start the attract mode headless, run 90 s: every segment plays, no errors, it loops; an input exits.
4. **Local four-player:** four scripted inputs (two keyboard halves via `addPlayer({ keys })`, two pads via `addPlayer({ pad })`), joins mid-floor, a drop-out, the leash.

### 8.6 Net suite (Node) and hub suite (browser)

- **Fake hub (Node):** N game copies, each in its own vm context, stepped together on one virtual clock; a fake `AIHub` per copy with `connect`, `ready`, `on`, `send` (`to`, `reliable`), `time`, `finish`, `rng`; a simulated network (latency, jitter, loss, reliable ordering). Checks: host + 2 clients and a server scenario; clients see the host's monsters move; a client's pickup is confirmed (and a race between two clients gives the item to one); doors, kills and narrator lines arrive everywhere; a client's hero takes damage from host monsters; magic from a client works; **no copy sends more than 20 messages in any second**; every message under 16 KB, snapshots under 4 KB in a 100-monster scene; time-up → one `finish` with valid standings within 5 s; leave and host-leave handled; `end` stops input, sends and sound.
- **The real harness (browser, Playwright):** copy `hub/harness.html`, `bridge.js`, `round.js` and the built game into `<dev>/.serve/`; start a static server bound to `127.0.0.1` on port 0 (Node's `http` module listening on port 0, or `python3 -m http.server 0 --bind 127.0.0.1`); fetch the game's URL and confirm its `<title>` is Gauntletdown; open in turn:
  1. `harness.html?game=<file>&players=2&auto=1`
  2. `harness.html?game=<file>&players=4&latency=150&jitter=50&loss=5&auto=1`
  3. the same with `&scenario=host-leave`
  4. `harness.html?game=<file>&players=2&scenario=server&auto=1`

  Wait for `document.body.dataset.complete === 'true'` and require `window.__hubCheck.pass === true`; on failure print each failed check's name and detail. Stop the server by its PID. Note: the harness presses arrow keys and Enter into the frames (its letter keys arrive with `code: 'a'`, which the engine ignores), which is enough for traffic and the Ready check.

### 8.7 UI suite (browser) and screenshots

- **Built file from `file://`:** no errors, no network requests; the title draws (non-blank canvas); 10.5 s idle → `attract`; a key press → `title`; a mouse hover moves the focus on the class cards and a click picks.
- **Touch-only emulation** (`hasTouch`, `isMobile`, no fine pointer): the notice shows (`snapshot().touchOnly`), the corner menu button exists, no touch buttons exist, the attract mode starts after 10 s.
- **Screenshots** (for eyes, not assertions) at 1920×1080 and 1280×720 into `<dev>/shots/`: title, class select, How to Play, floors 1, 4 and 7, four-player HUD, a magic blast, the boss, pause, Settings, Dev Tools, About. Check readability from "10 feet" (the image at a quarter size), the look notes from `node tools/check.mjs`, and filmstrips (`tools/filmstrip.mjs --seed 1`) of every class's throw and melee and every monster's attack telegraph.

---

## 9. Done checklist (every TASK.md requirement, and where it is met)

| TASK.md asks for | Met by |
|---|---|
| Genre and perspective that fit the source | Arcade co-op dungeon crawler, three-quarter overhead (1, 4.13) |
| Title: a riff, 50 brainstormed, picked with a real RNG | Gauntletdown (top of this plan) |
| Single HTML named per TASK.md in the root; dev files in the subfolder | 2, 3.6 |
| Built on my-3D2dge `dist/handoff`, engine changes allowed | 3.1, 3.5 |
| Engine's native style plus new art for the source's feel | 4.22 |
| Performance budget unlimited: as much detail, enemies, effects, lights and shadows as needed; no FPS work | 4.22, 7 (Crowds) |
| Engine's native animation plus new animations | 4.23 |
| All music, sound and voices in code; gibberish voices | 4.21 |
| AI Hub integration, and the game on its own | 4.20, 8.6 |
| Feature-complete demo showing all mechanics; polished vertical slice; infrastructure for more | 4, 5, registries (3.2), `docs/DESIGNER.md` |
| Dev mode from the pause menu, live sliders, reset to defaults | 4.17 |
| Attract mode after 10 s idle on title/menus; any input exits; may cheat | 4.18, 8.4, 8.7 |
| Narrative tone like the source's | 4.12, 5.1, 5.6 |
| 10-foot controller-first UI; native keyboard and mouse; prompts follow the last device; PlayStation glyphs, Xbox option | 4.3, 4.14, 4.15, E5, E6 |
| No dense web-style data screens | 4.14, 4.15, 5.8 |
| Touch-only: no touch controls, the notice, the settings button, attract runs | 4.19, 8.7 |
| No TODOs, placeholders or stubs | 6 (cut list removes whole features only) |
| Source Information, Testing, Engine and Prompt Feedback in the chat reply and an About/Credits screen | 5.8, Appendix B |
| `exit-interview.json` in the exact shape, parsing as JSON | Appendix A (check with `node -e "JSON.parse(require('fs').readFileSync('exit-interview.json','utf8'))"`) |
| Headless testing, a scripted playthrough, one command printing only failures and a count | 8 |
| Server on 127.0.0.1, port 0, confirm the page, stop only your own PIDs | 8.6 |
| No subagents or workflows to debate, review, judge or audit | 0 |

---

## Appendix A: `exit-interview.json` prefill

Write it last, in this folder's root beside the .html, in exactly this shape. Fill every value; "unknown" for anything you can't confirm. Plain text only. The `aiHub` block below is ready to use.

```json
{
  "sourceInformation": {
    "date": "2026-11-03 17:48:04 (your TASK.md's date)",
    "source": "Gauntlet (Atari Games, 1985 arcade)",
    "plan": "PLAN.md",
    "genre": "Arcade co-op dungeon crawler (top-down hack-and-shoot)",
    "perspective": "Three-quarter overhead (top-down and isometric selectable)",
    "tech": "my-3D2dge v0.85.2 (patched), HTML5 Canvas 2D, Web Audio, optional WebGPU lighting, AI Hub session client 1.4.0; tests on Node and Playwright 1.63.0",
    "artDirection": "...",
    "animation": "...",
    "audio": "...",
    "online": "AI Hub Session Protocol v1, shared-world mode, 1-4 players; local co-op 1-4 outside sessions",
    "testing": "...",
    "research": "...",
    "environment": "Claude Code CLI (headless); Linux; browser unknown",
    "model": "(your model and reasoning effort)",
    "usage": "(estimates if available, else unknown)"
  },
  "testingFeedback": ["How many issues did testing catch?", "How many were critical?", "Most helpful test", "Least helpful test"],
  "engineFeedback": ["Liked most", "Stuck or guessed wrong?", "Most important thing built", "Hardest part", "What changed in the engine and why (see ENGINE-CHANGES.md)", "One thing to change"],
  "promptFeedback": ["Liked most", "Confusing", "Hardest", "Would change"],
  "aiHub": {
    "name": "Gauntletdown",
    "tagline": "Four fools. One hungry dungeon.",
    "description": "A one-to-four player co-op dungeon crawl inspired by Gauntlet: blast through hordes, smash monster generators and eat before your life force runs out. Play together on one screen, or online in AI Hub sessions.",
    "type": "Game",
    "genre": "Action",
    "source": "Gauntlet",
    "series": "Gauntlet",
    "players": "1–4",
    "controls": "Move WASD/left stick · Aim mouse/right stick · Fire click/R2 · Magic right-click/△ · Pause Esc/Options",
    "tags": ["top-down", "co-op", "arcade", "fantasy", "comedy", "retro"]
  }
}
```

(The arrays hold your answers, one string per question, in order; the placeholders above show which question goes where.)

## Appendix B: Source Information draft (finish it with your own facts)

- **Date:** from your TASK.md (here 2026-11-03 17:48:04)
- **Source:** Gauntlet (Atari Games, 1985 arcade)
- **Plan:** PLAN.md
- **Genre and Perspective:** arcade co-op dungeon crawler (top-down hack-and-shoot); three-quarter overhead, with top-down and isometric options
- **Tech:** my-3D2dge v0.85.2 (handoff, with the engine changes in ENGINE-CHANGES.md), Canvas 2D, Web Audio, optional WebGPU lighting, AI Hub session client 1.4.0; Node and Playwright 1.63.0 for tests
- **Art Direction:** the engine's PS1-era 2D look: procedural HD rigs, textured materials, canvas lighting; three realms (Larder, Ossuary, Furnace Gut) and a banquet hall; new gear, the Shade ghost rig, generators, sprites; generic props from the engine's CC0 asset store
- **Animation:** the engine's procedural rigs and E.MOVES, with new throws, bow draw, eating, starving gait, generator states, ghost cloth, boss choreography
- **Audio:** nine original chip songs with dynamic layers, synthesized sound effects, gibberish (Babble) voices for the narrator, heroes, monsters and the King; no audio files
- **Online:** AI Hub Session Protocol v1, shared world, 1–4 players; local co-op 1–4 on its own
- **Testing:** what you ran (the suites, counts, the harness runs)
- **Research:** what you looked up (this plan's planner read the engine handoff docs and the AI Hub protocol and harness; Gauntlet facts from the planner's own knowledge, no web research)
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** yours
- **Usage:** your estimates, or unknown

## Appendix C: Engine and hub facts this plan relies on (verified while planning)

- Engine **v0.85.2** handoff: `my-3d2dge.js` is the full engine with every module; `game/test.mjs` shows the vm loader; `kits/test.mjs` shows the stand-ins (`window`, `addEventListener`, `location`); `tools/check.mjs`, `tools/filmstrip.mjs`, `tools/replay.mjs`, `tools/asset-find.mjs`, `tools/asset-sheet.mjs`, `tools/asset-set.mjs`; `package.json` pins Playwright 1.63.0.
- `AI_GUIDE.md` has a **Gauntlet recipe** (ADVENTURE slice, `allowJoin({ max: 4 })`, `cam.frame`, one shared FlowField, rigs with `every`) and a **Twin-stick recipe** (`input.padAim`, pointer aim, an `E.Bullets` pool).
- `E.FlowField` has one target (`update(x, y)`, BFS over 4 neighbours, rebuilt when the target's cell or `map.version` changes): hence E1.
- `E.Bullets` fields: `x, y, z, vx, vy, vz, r, dmg, life, team, color, core, sprite, pierce, grav, data`; wall hits compare `map.heightAt(x, y) > z` (shots and lobs fly over low walls); no bounce: hence E3.
- Input presets bind `pause` to `Escape, KeyP, Pad9`; `PAD_GLYPHS` has `playstation` and `xbox`; the `glyphs` setting defaults to `'auto'` in the Controller group: hence E5. `input.aimSource` is `'move' | 'mouse' | 'pad'`; `input.padAim` is the right stick; `game.mouseGround()` the mouse's ground point.
- Settings: `settings.define({ key, label, type: 'toggle'|'slider'|'select', value, min, max, step, options, group, apply })`, `settings.reset(group)`; E.Shell renders a slider row as a range input, adjustable by keys and pad. Its CSS is 14 px base: hence E6.
- `game.menu('settings')` over a non-pausable scene makes the scene wait (it pauses the game): hence the session's own non-pausing overlay. `_autoPause` only pauses pausable scenes.
- `E.Arcade`: `start`, `add`, `die`, `continue`, `table`, `qualifies`, `enter`, `drawTable`, `card`, `say`, `attract` (idle 20 s by default; this game runs its own 10 s attract director).
- Humanoid weapons are `'sword' | 'gun' | 'staff' | null`, drawn in a depth-sorted list in `_drawHD`: hence E2. `E.MOVES` includes `throw`, `cast`, `bash`, `overhead`, `spin`, `thrust`, `jab`, `cross`.
- Audio: `ChipAudio` has `_master`, `_sfxBus`, `_musBus` on `audio.ctx`: hence E8.
- The asset store has food (`kenney-food`), dungeon props (`kaykit-dungeon-remastered`, incl. spikes and chests), crypt props (`kaykit-halloween-bits`, `kenney-graveyard`), a potion (`kenney-mini-dungeon`), a key sprite (`kenney-tiny-town:tile-0117`); torches, candelabras, chests and doors are also `r.prop` names.
- AI Hub **Session Protocol v1**, client **1.4.0**: the client goes first in `<head>`, unmodified; metas `hub:session`, `-players`, `-mode`, `-goal`, `-howto`, optional `-minutes`; `connect({ mode, seats, card })`, `ready()` once, `answer('ready'|'more')`, `time()`, `send(data, { to, reliable })` (JSON ≤ 16 KB; ≤ 20 messages a second, bursts to 40; unreliable over about 1,200 bytes splits into packets and is lost whole if one is), `finish({ standings, scores, won, stats, awards })` by the host only, events `card`, `start`, `message`, `leave`, `time-up` (`graceMs`, 5 s in the harness), `end`. In shared world `Math.random` is not seeded; `AIHub.rng(label)` is the same on every copy. The harness: `?game=&players=&auto=1`, plus `latency`, `jitter`, `loss`, `scenario=host-leave|server`; pass is `window.__hubCheck.pass`, completion `document.body.dataset.complete === 'true'`; it must be served from the same origin as the game.
