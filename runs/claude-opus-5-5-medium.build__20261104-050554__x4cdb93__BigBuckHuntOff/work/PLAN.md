# Big Buck Hunt-Off

Build plan for the developers who will make this game from `TASK.md` and this file alone. Read `TASK.md` first, then this
plan top to bottom once; after that, use it as a reference. Everything here is a decision unless it says "optional".
Where a number is given, it is the starting default (a dev slider where marked), to be tuned in play.

---

## 0. At a glance

| | |
|---|---|
| **Title** | **Big Buck Hunt-Off** (on screen: `BIG BUCK HUNT-OFF`). Picked as TASK.md asks: 50 riffs on "Big Buck Hunter Pro" brainstormed, one drawn with Node's `crypto.randomInt` (it drew #33 of 50). |
| **Dev subfolder** | `BigBuckHuntOff-BigBuckHunterPro-claude-opus-5-5-max-20261103-174813/` (GameTitle and SOURCE in PascalCase with spaces and punctuation dropped) |
| **Deliverable** | `BigBuckHuntOff-BigBuckHunterPro-claude-opus-5-5-max-20261103-174813.html` in this folder's root (beside `PLAN.md`), plus `exit-interview.json` beside it |
| **Genre** | Arcade light-gun hunting shooter (a shooting gallery in a living landscape), with party versus and bonus mini-games |
| **Perspective** | First person, on rails: a fixed vantage per site with scripted camera pans over a pseudo-3D heightfield landscape. Plus a slow-motion bullet cam on trophy kills, side-on x-ray Shot Chart cards in the tallies, and 2D screens for menus and the Lodge |
| **Players** | 1 to 4 on one screen (simultaneous, competitive); 1 to 4 online in AI Hub sessions (ghost mode) |
| **Engine** | my-3D2dge v0.85.2 handoff package (full engine `my-3d2dge.js`), extended with new modules |

**Pitch.** It's the 41st Annual Big Buck Hunt-Off at Whisker Lake Lodge. You sit in a tree stand, a blind or a canoe and
look out over a landscape that lives: deer, elk and moose wander, graze, stop and bolt across creek fords, cornfields,
alpine meadows and frozen bogs. Pick out the bucks (only the bucks), pump your rifle between shots, and go for clean,
long, running shots for big points. Shoot a doe and you sit out the rest of the site. After each site an x-ray Shot
Chart shows exactly where every round went. Each hunt ends with a legendary trophy animal and a silly bonus round, and
your total climbs the Hunt-Off standings against the lodge regulars. Friends can play on the same couch with their own
reticles, or online through AI Hub.

**Core loop (one sentence, put it at the top of the game code):** spot the bucks, shoot clean, pump, never shoot a doe;
bag them before they're gone, then read your shots in x-ray and climb the standings.

**Session lengths:** Hunt-Off campaign about 17 minutes (3 hunts); a single hunt about 6 minutes; Party Quick Draw
about 5 minutes; an AI Hub round 3 minutes; Practice Range about 3 minutes.

### 0.1 Where each TASK.md requirement is covered

This stage writes the plan only (STAGE.md: "Don't build it yet: plan it"). The game's HTML and `exit-interview.json`
are build-stage outputs; this plan names them, specifies them and gives the exit interview's filled template.

| TASK.md asks for | Covered in |
|---|---|
| Genre(s) that fit the source | 0 (genre), 1.2, 2 |
| Camera perspective(s) | 0 (perspective), 5.1, 5.13 (bullet cam), 5.14 (Shot Chart), 5.18 (Lodge) |
| Title: a riff on the source's name, 50 brainstormed, one picked by a real RNG | 0 (Big Buck Hunt-Off, #33 of 50 by `crypto.randomInt`) |
| Research (our choice) | 1.1 (each fact confirmed, reported or unknown), Appendix F |
| Package: one HTML file with the exact name; downloadable dependencies optional | 0, 3.5 (bundle layout, build checks), 10 |
| Tech stack on the handoff package; the engine may change; new systems, art, animation | 3.1, 4.1, Appendix C (engine changes) |
| Art direction: engine's native style, new art for the source's feel, library for generic props | 2, 5.3 (steps 4-5), 5.4, 5.5 |
| Animation: engine's native system, new animations | 5.4 (Quadruped gaits and poses), 5.5 (Humanoid and Blob poses) |
| Audio: music, sfx and voices in code; gibberish voices | 5.19 (E.Babble), 5.20 (songs, ambience, sfx) |
| Online: AI Hub lib/hub | 5.26 (ghost mode), 3.5 (metas, client first), 9.4 (harness) |
| Working environment: dev subfolder, modules then one bundle in root, CDN allowed, shared machine etiquette, `file://`, server on 127.0.0.1 port 0, stop only own PIDs | 0, 3.2, 3.3, 3.5, 9.4 |
| Performance budget unlimited (FPS out of scope) | 5.3 (detail, effects, second render pass for scopes), 8 (renderer row) |
| Testing: headless scripts with `game.advance` and `game.debug`, a scripted playthrough of the whole game, one command that prints only failures and a one-line count, rerun only after changes, screenshots only where scripts can't check, no subagent or workflow reviews | 9.1-9.5, the Tests paragraph of each system in 5, Appendix D (debug handle) |
| Goal: an original game inspired by the source | 1.2, 1.3, 1.4 |
| Scope: feature-complete, polished vertical slice showing all features; world, characters, themes, tone; infrastructure to build the rest with designer tools | 5 (all systems), 6 (all content), 4.2 (registries and designer tools), 7 (M6 slice first) |
| Dev mode from the pause menu: standard tools, live sliders for key variables, reset to defaults | 5.22, Appendix A, Appendix C (3) |
| Attract mode: 10 s idle on title or menu, AI demo loop, any input exits, may cheat | 5.21, 9.2 (flow/attract) |
| Multiplayer: AI Hub integration and the game on its own | 5.11 (local 1-4), 5.26 (hub; runs normally when `connect()` answers null) |
| Narrative tone like the source | 2, 6.8 (story beats), 6.9 (barks) |
| 10-foot, controller-first UI; DualSense or any standard pad; KB+M native with the genre's keys; mouse aims, clicks and hover-focuses; prompts follow the last device; PlayStation glyphs with an Xbox option; no dense web-style screens | 5.12, 5.17, 5.23, 5.24, Appendix C (2) |
| Touch-only devices: no touch controls, "Controller or keyboard required", the settings button, attract mode runs | 5.25 |
| Done: no TODOs, placeholders or stubs | 3.5 (build check), 9.2 (unit/lint), 10 |
| Source Information (every field, "unknown" when unconfirmed) in the chat reply and an About & Credits screen | 5.27, Appendix E.1 |
| Testing, Engine and Prompt Feedback answers | 5.27, Appendix E.2 |
| `exit-interview.json` in the exact shape, beside the HTML, checked to parse | Appendix E.3 (filled template, validated) |

---

## 1. The source: what to capture, what not to copy

### 1.1 What research confirmed about Big Buck Hunter Pro

Research done while planning, on 2026-11-03: pages read directly were Wikipedia's "Big Buck Hunter" article, the
Highway Games product listing for the Big Buck Hunter Pro cabinet, and Macworld's review of the iPhone port. Giant
Bomb, TV Tropes, MobyGames and the Sinden wiki refused the fetch (HTTP 403) and one retailer page was rate-limited
(HTTP 429); for those, only search-result summaries were seen. **Confirmed** below means read on a fetched page;
**reported** means seen only in search summaries; **unknown** means not found. Use "unknown" in the reports for
anything not confirmed.

| Fact | Status | Where |
|---|---|---|
| Arcade game designed by Play Mechanix, produced and distributed by Raw Thrills; released January 23, 2006 (a retailer database lists 2005) | confirmed | Wikipedia; Highway Games |
| Two guns on one cabinet; 1-2 players; single, versus and co-operative play, plus a head-to-head "Shootout" mode | confirmed | Wikipedia; Highway Games |
| Shoot the males as they cross the screen; a player who shoots a female is out (the iPhone port: hitting a doe ends the scene, bucks already taken still count) | confirmed | Wikipedia; Macworld |
| A hunt is split into five screens called treks, and a bonus round ends the session; a round ends when all males are shot or some escape | confirmed | Wikipedia |
| Points depend on distance, the animal's weight or size, rack points, accuracy and bonus critters | confirmed | Wikipedia; Macworld |
| A buck dies to one shot in the vitals or two anywhere on the body; after each scene a screen shows where the shots landed (the iPhone port) | confirmed | Macworld |
| Animals graze until a few seconds pass or the first shot, then bolt; each scene has three bucks, often with a doe (the iPhone port) | confirmed | Macworld |
| Five huntable animals: whitetail deer, elk, pronghorn antelope, moose, bighorn sheep; hunts organized by species, not region | confirmed | Highway Games |
| Critters for bonus points: mountain lions, raccoons, possums, skunks, blackbirds, bluebirds, squirrels, foxes, wolves, rabbits | confirmed | Highway Games |
| 15 bonus rounds, also sold as "Bonus Only" (named: Duck Hunt, Pappy's Moonshine, Pie in the Sky, Boars Gone Wild, Mug Shot, Turkey Hunt) | confirmed | Highway Games |
| Monthly national tournaments | confirmed | Wikipedia |
| Pump-action guns ("pump to reload" speech call) | reported | search summary of a Big Buck Hunter Reloaded change log; the iPhone port reloads after every shot (Macworld, confirmed) |
| Head shots, heart shots, or "peppering" a buck | reported | search summary of Giant Bomb |
| Tone: playful, jokey (the review's "Freeze, gopher!"), rural humor in the bonus round names | confirmed in spirit | Macworld; Highway Games |
| The announcer's exact lines, the cabinet's art and music | unknown | (not researched on purpose: we don't copy them) |

### 1.2 Distinctive elements, turned into our mechanics

| Source element | Our version (original) |
|---|---|
| Two pump guns, head to head | Up to 4 simultaneous reticles, each with its own pump-action rifle; shared animals, first hit takes it |
| Bucks only, a doe puts you out | Bucks/bulls are targets; does, fawns and calves are protected. Classic rule: shoot one and you're benched for the site (a Casual setting turns it into a points penalty) |
| Sites (treks) and a bonus round | 3 hunts, each with 3 sites, a legendary **Trophy** encounter and a bonus game, all on one landscape per hunt with walk-in camera moves between vantages |
| Distance, weight and accuracy scoring | Points = species base (from antler size) × distance × hit zone × running bonus, plus accuracy, clean sweep and critter bonuses |
| Head and heart shots; a screen showing where shots landed | Real 3D hit zones on every animal (heart, lungs, head, neck, shoulder, gut, ham, legs, antlers), shown afterwards on our own **x-ray Shot Chart** |
| Critters for bonus points | 12 critter designs across the hunts; some protected (skunk, Bessie the cow, eagle, loons) with comic penalties |
| Goofy bonus rounds | Crow Patrol, Saucer Season, Snowball Standoff (ours) |
| Tournaments | The Hunt-Off campaign against rival regulars; AI Hub rounds as an online Hunt-Off |
| Pump to reload | Pump (rack) after every shot; when the tube is empty, the pump reloads it |
| Loud announcer | An emcee with short all-caps barks, plus a folksy guide and rivals who talk in Animalese gibberish with captions |

### 1.3 Additions that make it a better game
- **The call** (grunt, bugle, moose grunt): a limited button that makes nearby animals stop and look for a moment: a
  skill shot setup, and the key to two trophies.
- **The scope**: a round magnifying lens around your reticle (works for four players on one screen), with gentle sway
  and a hold-breath button for long shots across a valley.
- **Hills, cover and light**: animals vanish behind ridges, trunks and fog banks; dawn mist, dusk backlight, snowfall.

### 1.4 Do not copy
No names, logos, characters, art, music, sounds, bonus-round concepts, levels or look from Big Buck Hunter. Our title,
cast, hunting grounds, bonus games, writing and art are our own. Whitetail deer, elk and moose are real animals every
hunting game shares (the source also had pronghorn and bighorn sheep); our hunts, sites, trophies and critter roles
are original, and none of our bonus games matches the source's named rounds. Reticle colors are the AI Hub seat colors (red, blue,
green, gold), not the cabinet's gun colors. No gore: hits throw puffs of fur and dust; animals fold up and lie down.

---

## 2. Look, sound and tone

**Art direction: the engine's native retro-modern pixel style** (its Look target: PS1/N64-era 2D, shaded with
`E.tones`, outlined pixel art, the 5x7 font, `E.font.title` logos). Internal resolution `res: [480, 270]` with
`expand: true` (a 16:9 screen shows 480 x 270; wider screens show more landscape). The world is drawn by our own
pseudo-3D renderer (section 5.3) in the engine's pixels: a heightfield landscape a column at a time like the early-90s
voxel terrain games, with billboards (trees, rocks, animals) scaled by distance.

New art made for this game: every animal and critter (procedural rigs), antlers, hunting props (tree stand, ground
blind frame, canoe bow, paper targets, trap house, scarecrow Hank, snowmen, farm dressing: barn, porch, corn rows),
the Lodge, the logo, glyph icons, HUD pieces. Generic props come from the engine's library and asset store
(pines, broadleaf trees, bushes, rocks, stumps, logs, fences, hay bales, tents, signposts, campfire rings: 5.3,
step 4).

Per-hunt palettes:
- **Hollow Creek** (autumn morning): pale blue sky to peach horizon, low eastern sun, olive and ochre grass, russet
  leaf litter, orange oaks, red maples, white birches, dark teal creek with white riffles, valley mist.
- **Bugle Ridge** (alpine dusk): deep blue to orange-pink sky, sun setting behind the peaks (backlit animals with warm
  rim outlines), gold aspens, dark spruce, grey talus, gold-green meadow, a lake below catching the sunset.
- **Muskeg Lake** (first snow, overcast): grey-blue sky, falling snow, white and blue-grey ground, black spruce, orange
  tamaracks, brown reeds and cattails, dark water with ice at the edges, dense far fog.

**Tone and writing**: like the source, short, loud and folksy. The emcee barks in all caps ("BUCKS ONLY!", "HEART
SHOT!", "DOE! YOU'RE OUT!"); the guide is dry and homespun; the rivals are small-town braggarts. Lines stay under
about 60 characters so they read at 10 feet. Sample lines are in 6.8 and 6.9; write the rest in the same voice.

**Audio**: everything synthesized in code (engine chip synth plus small Web Audio graphs). Bluegrass-flavored chiptune
music (banjo-roll pulse arpeggios, fiddle square leads, triangle bass, washboard noise drums), nature ambience, layered
gunshots with valley echoes, animal calls, Animalese/Simlish gibberish voices. Section 5.20.

---

## 3. Setup, folders and build

### 3.1 Getting the engine and the hub client
The plan was written against **engine handoff v0.85.2 (my-3d2dge commit 4390a98)** and **AI Hub lib/hub (ai-hub commit
f8835e4, session client 1.4.0)**. A copy fetched while planning is at
`/home/micha/.cache/x2e02c0-plan-research/{engine,hub}` (sparse clones: `engine/dist/handoff/`, `hub/lib/hub/`). Copy
from it, or clone again the same way into a new, empty folder inside the dev subfolder:

```sh
git clone --depth 1 --filter=blob:none --sparse https://github.com/michaelcrosato/my-3d2dge.git vendor/engine-src
git -C vendor/engine-src sparse-checkout set dist/handoff
git clone --depth 1 --filter=blob:none --sparse https://github.com/michaelcrosato/ai-hub.git vendor/hub-src
git -C vendor/hub-src sparse-checkout set lib/hub
```

Read in the handoff: `README.md`, `API.md` (whole), `AI_GUIDE.md` (as needed), `docs/ASSETS.md` (whole, before
drawing props), `API-INDEX.md` (grep only), `modules/mode7.js` header (our renderer borrows its view cache and its
Backdrop-turning trick), `modules/arcade.js` header, `kits/kart.js` (Mode 7 usage), `game/` (template and its test).
In the hub: `README.md` (whole), `examples/ghost.html` (the pattern we follow), `harness.html`.

### 3.2 Environment notes (this machine)
- `/tmp` is a nearly full tmpfs (99-100% used by others). Point scratch space at the dev folder: `export
  TMPDIR=$PWD/.tmp` before Playwright, Chromium or anything that writes temp files. Never delete other people's files.
- Node 24 is installed; Playwright's browsers are cached in `~/.cache/ms-playwright` (chromium-1243). `npm install`
  in `vendor/engine-src/dist/handoff` installs the pinned Playwright 1.63.0 for the engine's tools (if it wants a
  different Chromium build than the cache has, run `npx playwright install chromium` there).
- Other agents share this machine, its ports and processes. Prefer `file://` and headless Node. The hub harness needs a
  server: `python3 -m http.server 0 --bind 127.0.0.1` (it prints the port), record its PID, check the page title is
  ours before trusting a result, and stop only that PID.

### 3.3 Dev folder layout

```
BigBuckHuntOff-BigBuckHunterPro-claude-opus-5-5-max-20261103-174813/
  engine/my-3d2dge.js           the full engine, our copy (changes listed in Appendix C)
  engine/modules/vista.js       NEW engine module: E.Lens, E.Heightfield, E.Vista (renderer), E.Impostors
  engine/modules/quadruped.js   NEW engine module: E.Quadruped (four-legged rig) and antler generators
  engine/modules/babble.js      NEW engine module: E.Babble (gibberish voices) and audio echo helper
  engine/assets/nature.js       the few store entries we use, cut with tools/asset-set.mjs
  hub/session.js                AI Hub client 1.4.0, verbatim (never edited)
  hub/harness.html bridge.js round.js   for the conformance check only (not bundled)
  src/*.js                      the game, in numbered files (3.4)
  build/manifest.json           the script order, shared by the build and the tests
  build/build.mjs               bundles everything into the single HTML in the work root
  index.html                    the dev page: loads the same scripts as separate files
  tests/run.mjs                 THE test command (section 9)
  tests/lib/*.mjs               the headless loader, the hub stub, the bot driver, Playwright helpers
  tests/unit/*.test.mjs, tests/flow/*.test.mjs, tests/browser/*.test.mjs
  tools/                        copies of the engine's check.mjs, filmstrip.mjs, replay.mjs (paths fixed up)
  .tmp/                         scratch (gitignore-style: never bundled)
```

### 3.4 Game source files (order = load order)

| File | Holds |
|---|---|
| `00-core.js` | `const E = My3D2dge`; constants (`M = 16` world units per metre); `def(kind, id, spec)` registries; event bus; RNG streams; `TUNING` (dev settings); `Records` (E.store); the core-loop comment |
| `01-game.js` | `new E.Game(...)` (options in 5.24), our `E.Shell` with theme, help and game settings, E.Arcade instance |
| `10-world.js` | World: loads a hunt's Heightfield, props, water, sky, weather; caches up to 2 hunts |
| `11-props.js` | prop registry, custom prop painters, scatter rules, occluder volumes and their spatial grid |
| `12-fx.js` | world-space particles, screen-space weather, banners' shake; cosmetic RNG only |
| `20-species.js` | species presets for E.Quadruped (whitetail, elk, moose, canid, cow), palettes, antler specs |
| `21-critters.js` | 12 critter designs: rigs (E.Blob or E.Quadruped presets), behaviors, points, penalties |
| `22-cast.js` | Humanoid cast (Dub, Granny Mae, Dwayne, Loretta, Earl, the Emcee) and their voices |
| `30-actors.js` | animal and critter runtime: orders, paths on terrain, herds, senses, reactions, wounds, death |
| `31-patterns.js` | spawn pattern library (cross, emerge, graze, herdPass, ridgeRun, wade, bolt, charge, decoyDoe) |
| `32-site.js` | Site runtime: script runner, camera director, end rules, per-site results |
| `40-weapon.js` | rifle (pump, tube, reload), scope (lens, sway, breath), call |
| `41-aim.js` | reticle control per device, aim assist |
| `42-shot.js` | shot resolution (rays against zones, occluders, terrain, water), impacts, spook events |
| `43-score.js` | scoring, bonuses, penalties, stats, stars, ranks, rivals |
| `50-players.js` | player slots: device, color and reticle shape, weapon, score, benching; joining |
| `51-hud.js` | HUD, banners, score pops, captions, prompts |
| `52-glyphs.js` | PlayStation, Xbox, keyboard and mouse glyph icons; prompt labels by last device |
| `53-ui.js` | UIKit: focus lists and grids, cards, mouse hover focus, clicks, back, UI sounds |
| `60-tally.js` | site tally and x-ray Shot Chart |
| `61-trophy.js` | trophy encounters and the Trophy Cam |
| `62-bonus.js` | bonus game framework and the three bonus games |
| `63-range.js` | Practice Range stations |
| `70-audio.js` | songs, sfx definitions, ambience beds, gunshot echoes |
| `71-barks.js` | barks and captions; dialog scenes with portraits and Babble voices |
| `80-hollow.js`, `81-bugle.js`, `82-muskeg.js`, `83-range-map.js` | each hunt's map, vantages, sites, trophy, bonus |
| `85-story.js` | story beats, rivals' scores, ceremony |
| `90-title.js`, `91-menu.js`, `92-hunt.js`, `93-lodge.js`, `94-about.js` | scenes |
| `95-attract.js` | attract director and HunterBot |
| `96-dev.js` | dev mode: tuning rows, tools, debug overlays, free camera, Animal Lab, Sound Lab |
| `97-hub.js` | AI Hub ghost-mode integration |
| `99-start.js` | `game.debug`, `game.stateHash`, deep links, boot steps, `game.start` |

### 3.5 The bundle
`node build/build.mjs` writes `../BigBuckHuntOff-BigBuckHunterPro-claude-opus-5-5-max-20261103-174813.html`:

```html
<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<script>/* hub/session.js, byte for byte */</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Big Buck Hunt-Off</title>
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="3">
<meta name="hub:session-goal" content="Most points in 3 minutes wins. Bucks only, never does!">
<meta name="hub:session-howto" content="Aim: mouse or left stick · Shoot: click or R2 · Pump: R or Square">
<meta name="hub:type" content="Game"><meta name="hub:players" content="1-4">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none;cursor:none}</style>
</head><body>
<!-- E.bootSplash('BIG BUCK HUNT-OFF') markup -->
<canvas id="screen"></canvas>
<script>/* engine/my-3d2dge.js */</script>
<script>/* engine/modules/vista.js, quadruped.js, babble.js; engine/assets/nature.js */</script>
<script>/* src/*.js in manifest order, each in its own <script> or concatenated inside one IIFE per file */</script>
</body></html>
```

The build asserts: the session client is the first script right after `<meta charset>` and matches `hub/session.js`
exactly (hash); every hub meta is present; goal is at most 60 characters and howto at most 80; no `TODO`, `FIXME`,
`XXX`, `placeholder` or `lorem` anywhere in `src/` or the new modules; no `fetch(`, `WebSocket`, `RTCPeerConnection`,
`alert(`, `confirm(`, `prompt(` or `window.open` in game code. It runs from `file://` with no network. No CDN is needed.

---

## 4. Architecture

### 4.1 The stack

```
 AI Hub client (session.js)  ─ first script; inert outside a session
 my-3D2dge full engine       ─ game loop (fixed 1/120 s steps), scenes, input (keys, mouse, pads, players),
                               standard menus (E.Shell HTML: pause, settings, controls, help), settings, saves,
                               E.store, audio synth + music clock, E.Arcade (tables, initials), E.Dialog,
                               E.Humanoid, E.Blob, E.Backdrop, E.View, px/font/ui drawing, tweens, scripts, paths
 NEW engine modules          ─ E.Lens, E.Heightfield, E.Vista, E.Impostors   (vista.js)
                               E.Quadruped, E.Antlers                         (quadruped.js)
                               E.Babble, audio echo send                      (babble.js)
 Game (src/)                 ─ content registries, actors and AI, sites, weapons, shots, scoring, players,
                               HUD/UI, modes and scenes, attract, dev mode, hub link
```

We do not use `E.Mode7` itself (its floor is flat); `vista.js` reuses its ideas: `view(k)` caching for drawing rigs at a
distance's scale, and drawing a Backdrop through a stand-in renderer whose `ix` turns with the heading.

### 4.2 Conventions
- **Units**: 16 world units = 1 m (`M = 16`). x east, y south, z up (the engine's). Content data is written in
  metres and degrees and converted on load.
- **Angles**: yaw 0 = east (+x), pi/2 = south (+y). Site data uses bearings in degrees relative to the site's base
  yaw (negative = left of centre) and distances in metres: `[bearing, dist]`.
- **Time**: everything in seconds of game time; `update(dt)` only (fixed steps). Gameplay never reads `performance.now`.
- **Randomness**: never `Math.random` in gameplay. `RNG.stream(name)` returns `E.rng(seed)` generators: `world`
  (map generation: seed per hunt, always the same map), `spawn` (site variations: seed per run), `ai` (per animal,
  seeded from the run seed and the animal's id), `bot`, and `fx` (cosmetic only; may be drawn from freely, so its
  draws never shift the others). In an AI Hub session the run seed comes from `AIHub.rng('hunt')`. A test greps `src/`
  and the new modules for `Math.random` (there should be none).
- **Registries** (`def(kind, id, spec)`): `species`, `critter`, `hunt`, `site`, `trophy`, `bonus`, `pattern`, `prop`,
  `bark`, `voice`, `song`, `beat` (story). Content refers to other content by id and never edits core code. This is
  what lets the rest of the game be built out later with designer tools: a new hunt, site, species, critter or bonus
  game is data (plus at most a small painter), authored with the dev free camera's position and bearing readout and
  previewed in the Animal Lab and Sound Lab.
- **Event bus**: `bus.on(name, fn)`, `bus.emit(name, data)`. Events: `shot`, `hit`, `kill`, `wound`, `miss`, `doe`,
  `critter`, `penalty`, `spook`, `escape`, `lost`, `siteStart`, `siteEnd`, `trophySpotted`, `bark`, `pump`, `reload`,
  `call`. HUD, barks, audio, stats, the bot and the hub link listen; gameplay code emits.
- **Determinism**: the same seed and inputs give the same game (the engine's fixed step plus our streams).
  `game.stateHash = () => [every actor's x, y, state, hp, every player's score, rounds]`.

### 4.3 Scenes and flow

Engine scenes (`game.go(name, data, { fade })`):

| Scene | pausable | What |
|---|---|---|
| `title` | no | live Hollow Creek vista behind the logo; PRESS START; idle 10 s starts the attract mode (5.21) |
| `attract` | no | the demo playlist; any input returns to `title` |
| `menu` | no | main menu and its sub-pages (one scene, a page stack): Hunt-Off, Single Hunt, Party Hunt, Bonus Games, Practice Range, The Lodge, Settings, About & Credits. Idle 10 s on a top-level page starts the attract mode too |
| `hunt` | **yes** | all gameplay: a hunt's segments (below), the Range, bonus-only and party modes |
| `lodge` | no | the trophy room (side view, engine props and lights) |
| `about` | no | About & Credits pages (5.27) |
| `hub` | no (pausing is off in sessions) | the AI Hub round: own card, the timed Hub Hunt-Off, final standings |
| `animallab`, `soundlab` | no | dev-only labs (reachable from dev mode and deep links) |

Segments inside `hunt` (one scene, so the loaded world, timers and particles survive between them):

```
huntIntro (establishing pan, hunt card, briefing dialog)
  -> site 1: siteIntro -> play -> siteEnd -> tally -> walk (camera walks the trail to the next vantage)
  -> site 2 ...  -> site 3 ...
  -> trophyBrief (campfire legend dialog) -> trophy (play) -> trophyEnd (Trophy Cam / "the one that got away") -> tally
  -> bonusBrief (host dialog) -> bonus (play) -> bonusTally
  -> huntResults (total, rank, rivals, initials via E.Arcade) -> outro dialog
  -> next hunt (Hunt-Off campaign: autosave, then load the next world) or back to the menu
```

Pause menu items (`menu: { items }`): Restart site, Restart hunt, Dev mode. Standard: Resume, Settings, Controls, Full
screen, Help, Quit to title (`quit: 'title'`).

### 4.4 The frame

`update(dt)` (each fixed step), in this order: input and reticles -> weapons (pump timers, scope, breath, calls) ->
shots fired this step are resolved -> site script and spawns -> actors (AI, movement, gaits, rigs) -> director camera ->
fx -> HUD state, barks, audio cues -> hub link (session only).

`draw(r)`: `vista.draw(r, lens)` as one `r.overlay`: sky and Backdrop, terrain raster, billboards far to near (props,
animals, critters, world particles), foreground dressing, weather, fog and grade, then the scope lenses, reticles,
score pops; then the HUD overlay. Engine lighting, the engine camera and engine particles are not used in Vista scenes
(the overlay is unlit and screen-space); the Lodge uses the engine's normal side view, props and lights.

### 4.5 The test handle
`game.debug` (Appendix D): `snapshot()`, `aimAt(p, actorId, zone)`, `fire(p)`, `pump(p)`, `scope(p, on)`,
`call(p)`, `goto(huntId, segment)`, `spawn(kind, opts)`, `skip()`, `bagAll()`, `bot(on, opts)`, `seed(n)`,
`tuning(key, value)`. Tests, `tools/check.mjs` and the bot use it.

---

## 5. Systems

Each system lists what to build, its numbers and how to test it (test names refer to section 9).

### 5.1 Lens and the camera director (`vista.js`: `E.Lens`; `32-site.js`: Director)

**Projection** (a sheared perspective: verticals stay vertical, which suits billboards and the column renderer):
- Camera `{ x, y, z, yaw, pitch, fov }` (fov = degrees across the screen's height; pitch + = looking down).
- Screen `W x H`, centre `cx = W/2`, `cy = H/2`; focal `f = (H/2) / tan(fov/2)`; `horizonY = cy - f * tan(pitch)`.
- Forward `F = (cos yaw, sin yaw)`, right `R = (-sin yaw, cos yaw)`.
- `project(P)`: `d = P - C`; `D = d.F` (forward distance); `L = d.R`; null if `D < 1 m`; `k = f / D` (pixels per unit);
  `sx = cx + L*k`; `sy = horizonY - (P.z - C.z)*k`. Returns `[sx, sy, k, D]`.
- `ray(sx, sy)`: direction `dir = F + R*((sx - cx)/f) + up*((horizonY - sy)/f)`; the point at forward distance D is
  `C + D*dir`. Shots, picking and the bot all use this.
- **Magnifying about a point** (the scope lens): the same camera with focal `f*mag`, centred so screen point `s0` lands
  on the lens centre: `s' = c_lens + (s - s0)*mag`. The lens is an exact zoom of the main view, so the shot through its
  centre is the main view's ray through `s0`.
- **Rigs and props** are drawn as orthographic billboards: an `E.View('vista', 'Vista', yawDeg, pitchDeg, k, 1)` with
  `yawDeg = -yaw*180/pi - 90` (Mode 7's formula) and `pitchDeg` = the angle from the camera down to the object,
  clamped to 4..30 degrees, quantized to 2 degrees; views cached by (k in 1/32 steps below 1, 1/16 above; yaw in 2
  degree steps; pitch).

**Director** (per site, deterministic; keyed to site time, never to player input, so all players and all AI Hub copies
see the same frame): keyframes `[t, { bearing, pitch, fov, ease, dur }]`; optional `follow` mode in single player
(yaw eases toward the centroid of live bucks, clamped to the site's bearing range, smoothed over 0.8 s). Single player
also gets a 0.4 degree recoil kick per shot (recovers in 0.25 s) and a slow breathing drift (0.15 degrees); local
multiplayer and hub rounds use keyframes only and no kick. Canoe vantage: a gentle bob (z +-4 cm, roll +-0.6 degrees,
period 3.1 s). Walk-ins: the camera follows an `E.Path` along the trail (eye 1.7 m over the terrain, 6.5 m/s, head bob)
between vantages, 4-8 s, skippable.

**Tests** (unit/lens): project then ray returns the same point; horizon row matches pitch; magnified lens centre ray
equals the main ray at `s0`; director keyframes reproduce the same yaw at the same time across two runs.

### 5.2 Terrain (`vista.js`: `E.Heightfield`)

Each hunt is one landscape: a **core** of 1024 x 1024 m at 1 m height samples (Float32, 4 MB) and a **far ring** of
4096 x 4096 m at 8 m samples (the same noise, no features) for distant hills. A 1 m RGBA colour map covers the core
(4 MB); a ground-type map (Uint8) picks a 64 x 64 micro-texture for near pixels. Generation (boot step or a loading
card, about 1 s per hunt; headless runs skip the colour bake):

1. **Base**: fBm of `E.noise2` (5 octaves, lacunarity 2, gain 0.5) with domain warping; amplitude and scale per hunt.
2. **Features**, in order, from the hunt's data (coordinates in metres in the core):
   - `ridge { path, height, width }`: a raised Gaussian profile along a Catmull-Rom spline (`E.Path`).
   - `river { path, width, depth, banks }`: carves a channel with sloped banks; marks water.
   - `lake { center, radii, depth, level }`: a bowl; marks water at `level`.
   - `flatten { poly, z: number | 'avg', falloff }`: meadows, fields, the farmyard.
   - `field { poly, crop: 'corn', rowsDeg }`: ground type and row texture; corn-row props scattered by rule.
   - `trail { path, width }`: slight flattening, a dirt ground type; the walk-in paths follow trails.
   - `clearView { vantage, bearings: [a, b], dist: [near, far] }`: lowers any terrain between the vantage's eye and
     the fan's far edge so nothing unplanned blocks the play area (authored hills in the fan stay, under a margin).
   - `snow { above, amount }`, `burn { poly }`: ground types.
3. **Water**: level and mask; a lake or river surface is drawn at its level wherever the ground is below it.
4. **Ground types** by rules (slope, height, distance to water, masks, noise): grass, dry grass, leaf litter, dirt,
   rock, talus, mud, reeds, snow, ice, corn, burn. Each has a macro colour and a micro tile.
5. **Light** (bake): normals from central differences; Lambert with the hunt's sun direction and colours; a cheap
   ambient occlusion (height minus a blurred height); sun shadows by marching toward the sun in 2 m steps; tree shadows
   stamped as soft ellipses offset along the sun direction after scatter. Dithered into the colour map.
6. **Scatter** (`E.gen.scatter` with the `world` seed): forests, groves and single trees, bushes, rocks, logs, stumps,
   reeds, tall grass, corn rows, snowdrifts, by mask rules per hunt; never inside a site's play fan except authored
   cover. Each placed prop registers its occluder volumes in a 32 m spatial grid (5.9).

Sampling: `height(x, y)` bilinear (core, else far ring); `color(x, y)`; `type(x, y)`; `normal(x, y)`;
`water(x, y)` gives the surface level or null; `rayHit(origin, dir, maxD)` marches 0.5 m steps (growing with distance)
then bisects.

**Tests** (unit/terrain): a hunt's generation hash is stable for its seed; a river's bed is at least its depth below
the banks; lake water level and mask agree; `clearView` leaves the fan's sightline clear (rays from the eye to 50
sample points in the fan reach their target); `rayHit` agrees with brute-force sampling within 0.1 m.

### 5.3 The renderer (`vista.js`: `E.Vista`)

`vista.draw(r, lens, opts)` draws a full frame into the game buffer as one `r.overlay(g => ...)`. `vista.render(g, lens,
rect)` is the same pass into any rectangle (the scope lens, the Trophy Cam, the title).

1. **Sky and Backdrop.** An `E.Backdrop` per hunt (sky gradient, stars, cloud and fog layers, far mountain layers)
   drawn above the horizon through a stand-in renderer whose `ix = yaw * f * 10` so it turns with the camera (as
   `mode7.js drawSky` does). Our own sun or moon disc with a dithered glow is placed by its world bearing and elevation
   (not the Backdrop's screen-fixed sun). Dusk adds dithered additive god rays.
2. **Terrain raster** (front to back, one column at a time, into a `Uint32Array` frame with alpha 0 for sky, then
   `putImageData` into a scratch canvas drawn over the sky):
   - for column `sx`: ground direction `F + R*((sx - cx)/f)`; march D from 1 m with step `max(0.15 m, D*0.0075)` to
     the core's edge, then the far ring with coarser steps, to the hunt's far distance (about 3 km), stopping when
     the column is full;
   - at each step, sample height `h`; `y = horizonY - (h - C.z)*f/D`; if `y` is above the column's current top (the
     column fills from the bottom of the screen upward), fill from `y` down to that top with the ground colour, shaded
     by distance fog (`fogNear..fogFar`) and height fog (valley mist below `mistTop`), and for near spans (D < 25 m)
     with per-pixel micro-texture (the pixel's ground point found on the plane of that sample) and ordered dither;
     the column's top becomes `y`;
   - record an **occlusion breakpoint** `(D, y)` each time the column's top changes (typed arrays, up to 512 per
     column): `occY(col, D)` is the topmost terrain pixel drawn by samples nearer than D;
   - water: where the ground is under the water level, draw the surface at the level: the sky colour at the mirrored
     row, darkened and tinted, with animated ripple bands and sun glints; shoreline foam; ice edges in Muskeg.
3. **Billboards**, gathered each frame, sorted far to near, each `{ x, y, z, D, k, bounds: [w, h], draw }`:
   - skip if off screen or past the fog's far edge; compute its screen box from its world bounds;
   - if `occY(col, D - 0.6 m)` is below the box's bottom for every column, draw straight onto the frame;
     if it is above the box's top everywhere, skip it; otherwise draw it into a screen-sized scratch canvas, clear
     each column below `occY` (`clearRect(x, occY, 1, ...)`), and draw the box onto the frame. The 0.6 m bias keeps
     hooves from being clipped by the ground they stand on;
   - fog: billboards past `fogNear` are drawn through a fog tint (pre-tinted impostor levels, or `px.blend` with the
     fog colour at stepped alpha).
4. **Impostors** (`E.Impostors`): props are drawn from sprites pre-rendered at 24 scale levels (k from 0.01 to 3
   pixels per unit, geometric) and up to 8 facings, picked at the nearest level at or below the needed k and drawn
   with nearest-neighbour `drawImage` scaling of at most 1.12x (`E.ctx2d` contexts: smoothing off). Library shapes
   come from `E.shapeSprite(id, { view, facing, size })` with a Vista view at that scale; custom props from our
   painters `paint(g, k, variant)`. Levels are built lazily and pre-warmed in boot steps for the current hunt. Near
   trees (D < 40 m) sway: their top rows are drawn shifted by a sine of time (wind).
5. **Animals and critters** are drawn live each frame: `rig.draw(g, sx, sy, view)` with the cached view for their k
   and pitch, plus a 1-pixel outline (draw the rig's silhouette offset 4 ways in the outline colour into the scratch
   canvas, then the rig). The outline colour is per hunt (warm orange at dusk reads as rim light). LOD: below 1.2
   pixels per unit skip ear, tail and eye details; below 6 pixels tall draw a 3-tone silhouette (but always draw
   antlers, 5.4).
6. **World particles** (`12-fx.js`): dust, dirt, bark chips, leaves, water droplets, snow puffs, glass and clay shards,
   feathers, breath vapour; projected each frame, drawn as `px.rect`/`px.disc` sized by k (at least 1 pixel). Cap 1500.
7. **Foreground dressing** per vantage, in screen space with slight parallax: tree-stand rail, blind window edges,
   canoe bow, grass tufts and leaves at the bottom corners. Plus near grass-tuft billboards 3-8 m out that hide
   hooves.
8. **Weather and grade**: screen-space snow, leaves or drizzle in three parallax layers (cosmetic RNG); the hunt's
   colour grade; a light vignette.
9. **Scope lenses**: for each scoped player, render the world again into a `2R x 2R` scratch canvas with the
   magnified lens (5.1) about that player's swayed aim point, mask it to a circle (a `px.disc` mask with
   `destination-in`), draw it at the reticle, then the scope ring, crosshair and breath arc. R = 54 px at 480 x 270.

The renderer must also be callable with a flat terrain (all heights 0, `opts.flat`) for milestone M1 and as the
fallback in section 8.

**Tests**: unit/vista (headless): occlusion breakpoints are monotonic per column; `occY` matches a brute-force
reference for random columns; billboard sort is far to near. browser/vista: no errors; screenshots of each hunt's
three vantages at fixed seeds go in `tests/out/` for review; a pick-agreement check (5.9).

### 5.4 Four-legged rigs (`quadruped.js`: `E.Quadruped`)

Built like the engine's Humanoid: a 3D skeleton posed by math every step from continuous inputs, drawn as shaded pixel
volumes through any `E.View`. API:

```js
const rig = new E.Quadruped({ species: 'whitetail', sex: 'buck', size: 1, colors: {...}, antlers: { points: 8, seed: 3 } });
rig.update(dt, { x, y, z, vx, vy, facing, ground: (x, y) => h, gait: 'auto', alert: 0..1, graze: 0..1, look: { x, y, z },
                 hurt: 0..1, limp: legIndex | -1, jump: 0..1, dead: 0..1, call: 0..1 /* bugle or grunt pose */, splash });
rig.draw(g, ox, oy, view);            // inside a billboard
rig.J                                 // joints in world space after update (headless too)
rig.zones()                           // hit volumes in world space (5.9)
rig.drawXray(g, x, y, scale, hits)    // side-on x-ray for the Shot Chart
rig.drawMount(g, x, y, size)          // head-and-antlers plaque for the Lodge and HUD icons
rig.debug(g, view)                    // skeleton overlay for dev mode
```

**Skeleton** (local frame: x forward, y right, z up, units = world units at `size: 1` for a whitetail; other species
scale it): pelvis, mid-spine, withers, neck base, neck mid, head, muzzle, ears L/R, tail base and tip; four legs, each
top joint (shoulder or hip), elbow or stifle, knee or hock, fetlock, hoof.

| Whitetail rest pose (units; 16 = 1 m) | |
|---|---|
| Spine: pelvis -> withers | (-10, 0, 14.5) -> (8, 0, 15.8) (shoulder height 1.0 m) |
| Torso cross-sections (at x: top z, bottom z, half width) | chest x 5: 15.8, 8.8, 3.2; belly x -2: 14.8, 9.6, 3.4; rump x -9: 14.6, 10.4, 3.0 |
| Fore leg top (shoulder joint) / hind leg top (hip joint) | (8, +-2.4, 10.8) / (-10, +-2.6, 12) |
| Fore bones: humerus, forearm, cannon, pastern+hoof | 3.8, 4.6, 3.8, 1.4 (a gentle zigzag at rest) |
| Hind bones: femur, tibia, cannon, pastern+hoof | 4.6, 5.2, 4.4, 1.4 (stifle forward, hock back) |
| Neck base -> head | (9, 0, 15.5) -> (14.5, 0, 22.5), about 50 degrees up; head 5.5 long, muzzle tipped 25 degrees down |
| Ears, tail | ears 2.8 long at the back of the skull; tail base (-11.5, 0, 14.6), 3.5 long |

Elk: x1.5 with a longer neck, dark neck mane, pale rump patch. Moose: x1.9, long legs (legs x1.15 relative), humped
withers, long heavy head with a dewlap ("bell"), short tail. Fawn and calf: x0.6 with big ears, spots on fawns.
Canid preset (fox, coyote, wolf): digitigrade legs, bushy tail, pointed ears. Cow preset (Bessie): bulky, black and
white patches, a bell.

**Gaits** (per-leg phase offsets [LF, RF, LH, RH] and stance share of the cycle):

| Gait | Offsets | Stance | Notes |
|---|---|---|---|
| walk | 0.25, 0.75, 0, 0.5 | 0.65 | 4-beat; head nods with each fore step |
| trot | 0, 0.5, 0.5, 0 | 0.45 | diagonal pairs; small body bob |
| gallop | 0.5, 0.6, 0, 0.1 | 0.30 | spine flexes +-5%, body pitches, a flight phase |
| bound | 0.45, 0.5, 0, 0.05 | 0.25 | the whitetail escape: big arcs, tail flagged up showing white |

Stride length grows with speed; the cycle frequency is speed / stride. `gait: 'auto'` picks by speed with blending.
Hooves in stance are locked to the ground point where they touched down (no sliding); in swing they arc from lift-off
to the predicted next touchdown (body position + velocity x the remaining swing and half a stance). Leg solve: the
fetlock target sits above the hoof; the cannon bone's angle comes from the phase (upright in stance, folded in
swing: fore cannons fold back, hind cannons angle forward); then `E.ik3` from the top joint to the knee or hock with
the bend hint (fore elbows bend back, hind stifles bend forward). Body pitch and roll follow the ground under the four
hooves (`ground(x, y)`); the heading turns toward the velocity with a limit, leaning into turns.

**Poses** (continuous weights, blended): idle (breathing, weight shifts, ear flicks, tail swish), graze (neck to the
ground, jaw chewing), alert (head high, ears forward toward `look`, a foreleg stomp now and then), look-at (head and
neck turn within limits), startle (crouch, then spring), jump (legs tucked over a log, fence or creek), call (elk:
neck stretched and mouth open while the bugle sounds; moose: head low, grunting), hurt (a flinch: body roll, head
toss, 0.25 s), limp (one leg's stride cut to 40%), death (1.0 s: front knees buckle, chest drops, hind legs give, the
body rolls about 70 degrees onto its side away from the shot, the head settles last), dead (lying, still).

**Antlers** (`E.Antlers`): generated 3D polylines from a seed, drawn after the head with 1-3 pixel thickness by k,
bone-coloured with darker bases and a dark outline:
- whitetail: main beams sweep back, out and forward; tines rise from the beam; brow tines; `points` 4-12 (typical);
  the trophy has 14 with kickers and a drop tine;
- elk: long beams sweeping back, 5-7 tines per side, a long dagger fourth tine (the trophy is 7 x 7);
- moose: palmate paddles with points along the rim, spread 40-55 inches (the trophy 72 inches).
Readability: every animal is drawn (and zoned) at `animalScale` 1.1, an arcade size boost (dev slider); antlers are
drawn at x1.15 more (dev slider) and grow with distance, x(1 + max(0, (D - 80 m) / 150 m)) capped at 1.6, so bucks
read at range; an optional assist setting adds a one-pixel glint on antler tips.

**Tests** (unit/quadruped): every joint is finite through each gait at several speeds; planted hooves move less than
0.5 units during stance; the death pose ends with the pelvis below 40% of standing height; zones follow joints
(the heart sphere stays inside the chest); antler generation is deterministic per seed and has the requested points.
Visual: `tools/filmstrip.mjs` strips of walk, trot, gallop, bound, graze-to-alert, death for each species, reviewed by
eye (the one thing a script can't judge), from the Animal Lab deep link.

### 5.5 Critters, people and other rigs
- **Small critters** use the engine's `E.Blob` (feet, ears, tail, wings, mouth options) plus small extra drawing (a
  raccoon's mask and ringed tail, a skunk's stripe, a beaver's flat tail, a turkey's fan and wattle).
- **Birds** (crows, grouse, ducks, ravens, eagle, loons): Blob with wings and `flap`; flight on arcs and `E.Path`s.
- **Canids and the cow** use `E.Quadruped` presets.
- **People** are `E.Humanoid`s (size 1.3): Uncle Dub (bulky, blaze-orange cap, canvas coat, grey beard), Granny Mae
  (chibi, grey bun, shawl, rolling pin), Cousin Dwayne (heroic, mirrored shades, camo), Loretta Pruitt (heroic,
  ponytail, red flannel), Big Earl (bulky, overalls, chili pot), the Emcee (cap, bow tie, microphone). They appear as
  dialog portraits (`talk.say(lines, { name, portrait: rig })`), in the Lodge, and in-world in bonus games (Granny on
  her porch; Loretta at the trap house; Earl by the lake fire). Use their engine poses: `wave`, `cheer`, `hips`
  (Dwayne's taunt), `throw` (Granny's crow-scaring rolling pin wave), `kneel`.
- **Snowmen** (bonus): stacked shaded discs with stick arms and hats, a throw animation, a topple.

### 5.6 Animal AI (`30-actors.js`, `31-patterns.js`)

Each animal is an actor `{ id, species, sex, rig, x, y, z, vx, vy, heading, state, orders[], hp, fear, wounded,
bagger, ... }`. States: `hidden` (behind cover, not yet out), `enter`, `walk`, `trot`, `run`, `graze`, `look`, `stop`,
`jump`, `wade`, `wounded`, `dying`, `dead`, `exit`, `gone`.

- **Orders** come from spawn patterns, as a queue: `['walk', { to: 0.4 }]`, `['graze', 3]`, `['look', 1.5]`,
  `['trot', { to: 0.8 }]`, `['run', { to: 1 }]`, `['exit']`. Movement follows the actor's path (an `E.Path` of
  terrain points; z from the heightfield); path points can carry `jump` marks (logs, fences, the creek) where the rig
  leaps.
- **Herds**: followers trail their leader's path at `[back, side]` offsets with 0.1-0.4 s reaction delays (from the
  `ai` stream) and keep 1.5 m apart.
- **Senses and spooking**: a gunshot emits `noise` at the shooter (loudness 1, heard to 400 m) and at the impact
  (0.6 within 40 m). Each animal adds fear by loudness and distance; past its threshold it startles (alert 0.15-0.45 s),
  then flees along its path (or the pattern's escape route) at run speed. A near miss (impact within 4 m) bolts it at
  once with a jump. Fleeing animals that hear more shots speed up 10%. Species temper: whitetail skittish (threshold
  0.35), elk herd-minded (the herd flees together), moose stubborn (threshold 0.7; may stop and stare instead).
- **Calls** (5.8): within the call's radius, animals that are not panicking stop and look toward the caller for
  `callFreeze` seconds (1.4 +- 0.2), then go on (moose may take a few steps toward you). Each animal answers a call at
  most twice per site. Bull elk may bugle back. Trophies have their own rules (6.3).
- **Wounds and death**: zone damage (5.9) reduces hp; at 0 it dies. A wounded animal limps (speed x0.6, the hit
  leg's stride cut) and heads for the nearest exit; further hits take more hp; if it leaves the frame it is **LOST**
  (a penalty). A killed
  animal plays `dying` then lies `dead` with a tag over it (the bagger's colour, its points) until the site ends.
- **Exits**: an animal past its path's end or outside the camera's bearing range plus 10 degrees is `gone`; a buck
  that goes is **ESCAPED** (its HUD icon is crossed out).
- **Visibility** (for quick-shot bonuses and the bot): on screen, and an analytic ray from the camera to its chest is
  clear of terrain and occluders.

**Spawn patterns** (data; each places one or more actors with paths in site-relative `[bearing, dist]` points and
order queues; variations from the `spawn` stream):

| Pattern | What it does |
|---|---|
| `cross(path, gait)` | enters at the path's start, crosses, exits |
| `emerge(cover, path)` | waits hidden behind a cover prop, steps out alert, then goes on |
| `graze(point, secs)` | walks in, grazes with glances up, wanders off |
| `herdPass(path, n, spacing)` | a leader and followers on one path |
| `ridgeRun(path)` | a fast run along a crest, silhouetted against the sky |
| `wade(path)` | moves through water: slow, splashing, legs hidden below the surface |
| `bolt(bed, dir)` | bedded down unseen; jumps up and runs at the first shot or after a time |
| `decoyDoe(buck)` | a doe timed to cross in front of a buck (patience test) |
| `stand(point, secs)` | stops broadside in the open (an easy shot, used sparingly) |
| `charge(target)` | runs straight at the vantage (Big Mo, the timberline bull) |
| `fight(a, b, secs)` | two bulls lock antlers, then split |

**Tests** (unit/ai): a shot within hearing makes calm animals flee within 0.5 s; a near miss bolts at once; calls
freeze non-panicking animals for 1.2-1.6 s and never more than twice each; followers keep spacing; a wounded buck that
exits counts as lost; a killed buck stays dead and tagged; every pattern runs to `gone` or `dead` without errors.

### 5.7 Sites (`32-site.js`)

A site is data plus a script:

```js
def('site', 'hollow-1', {
  hunt: 'hollow', name: 'Creek Crossing', vantage: 'creekStand',       // the hunt's vantage: x, y (m), eye height, base yaw
  frame: { bearings: [-38, 38], fov: 34, pitch: 3 },                  // the play fan; camera limits
  director: [[0, { bearing: -12 }], [6, { bearing: 4, dur: 8, ease: 'inOutSine' }], [30, { mode: 'follow' }]],
  time: 60, bucks: 3,                                                 // bucks scheduled (the HUD shows them)
  props: [['log', [-20, 32]], ['bush', [14, 28]]],                     // authored cover, [bearing, dist]
  script: function* (S) {                                             // a game.script coroutine; S = the site API
    yield 1.2; S.bark('start');
    S.pattern('cross', { kind: 'doe', path: [[-35, 44], [-5, 36], [30, 46]], gait: 'walk' });
    S.pattern('cross', { kind: 'fawn', follow: S.last, back: 2.5 });
    yield 5;
    S.pattern('graze', { kind: 'buck', points: S.rng.int(5, 8), at: [10, 34], secs: 4 });
    yield E.any([E.until(() => S.bucksLeft <= 2), 14]);
    S.pattern('herdPass', { kinds: ['buck', 'doe', 'buck'], path: [[38, 28], [0, 24], [-40, 40]], gait: 'bound', splash: true });
    yield E.until(() => S.allResolved);                               // every buck spawned so far bagged, escaped or lost
  },
  critters: [['squirrel', { tree: [-30, 22], at: 8 }], ['rabbit', { path: [[20, 15], [5, 12]], at: 20 }]]
});
```

- `S` gives: `pattern`, `spawn`, `bark`, `say` (captions), `rng` (with `int`, `pick`, `chance`), `time`, `bucksLeft`,
  `actors`, `players`, `on(event, fn)` (bus events such as calls and shots, cleared when the site ends),
  `allResolved`, `last` (the last actor spawned).
- **End rules**: the site ends when every scheduled buck is bagged, escaped or lost and the script has finished, or
  when time runs out (TIME!: the rest flee), or when every player is benched. Then `siteEnd` (1.5 s of the last
  animals running off), then the tally.
- In AI Hub rounds and Party Quick Draw, sites are **time-boxed**: they run their full time and their scripts loop
  their waves; bucks keep coming.
- Results per player: shots, hits, kills by zone, distances, bonuses, penalties, stars, the Shot Chart records.

**Tests** (flow/sites): for each site at seeds 1-3: the bot (cheat aim) bags every buck and the site ends early with a
clean sweep; with no shots the site ends on time with every buck escaped; shooting the first doe benches the player
and (single player) ends the site; the bucks scheduled equal the bucks spawned; no errors.

### 5.8 Rifle, scope and call (`40-weapon.js`) and aiming (`41-aim.js`)

**Rifle** (each player): `rounds` left (5 when full; dev slider 1-10) and a `chambered` flag. A site starts with 5
rounds and one chambered. The HUD shows 5 shell icons (rounds) and a chamber light.
- Fire: needs a chambered round and 0.1 s since the last shot. It spends a round and empties the chamber.
  Fire with an empty chamber: a dry click, the reticle shakes, and the PUMP prompt flashes (a bark the first two times
  per hunt).
- Pump: with rounds left, racks in 0.22 s (two clicks) and chambers the next one. With none left, the pump reloads:
  1.25 s, five shell clicks, 5 rounds and one chambered. So a tube is 5 shots. Pumping while racking or reloading does
  nothing.
- **Auto-pump** setting (off by default; Easy difficulty and the attract bot turn it on) racks 0.12 s after each shot.
- Bonus games use their own tube (10-12) and a faster rack (0.15 s).

**Scope** (hold, or toggle by setting): raises in 0.15 s; draws the lens (5.3 step 9) at x3.5 magnification (dev
slider 1.5-6); pad reticle speed x0.45 while scoped. **Sway**: the aim point drifts by
`A * (0.6 sin 1.3t + 0.4 sin(2.9t+1), 0.5 sin(1.7t+2) + 0.3 sin 3.3t)` screen pixels, `A = 2.6` (slider). **Hold
breath** (held): sway x0.15 for up to 3.0 s (slider), the meter refills at 1.2 per second after letting go; emptying it
forces an exhale and doubles sway for 1.5 s. The lens view drifts with the sway; its crosshair stays centred; the shot
goes through the swayed point.

**Call** (species-specific sound: whitetail grunt, elk bugle, moose grunt): 2 charges per player per site (slider
0-5), 3 s cooldown, radius 200 m, effect in 5.6. A call is a shared event: in multiplayer, everyone's animals stop.

**Reticle** (each player, in screen pixels of the 480 x 270 buffer):
- Mouse: the reticle is the pointer (`input.pointer()`), absolute; keeps its place when the pointer leaves.
- Stick: `input.move()` (left stick, d-pad, and for keyboard-only players WASD and arrows) gives a velocity: max 400
  px/s (slider), response curve `|v|^1.7`, 0.15 s ramp to full speed; the right stick (`input.padAim`) adds fine aim at
  x0.3; scoped x0.45.
- **Aim assist** (pads and keyboard only, never the mouse; setting Off / Light / Strong; default Light): friction x0.65
  (Light) or x0.45 (Strong) when the reticle is within 8 px of a live target's projected hit volume; Strong also pulls
  25% of the way toward the vital zone per second while the stick moves toward it. Never toward does or protected
  critters.
- Each player's reticle has its own shape as well as colour: P1 circle-cross, P2 diamond, P3 square brackets, P4
  triangle. Benched players' reticles turn grey with a BENCHED tag.

**Tests** (unit/weapon): fire, pump and reload timings at 1/120 s steps; dry fire with an empty chamber; auto-pump;
reload refills the tube; sway is deterministic for a time and shrinks while holding breath; breath empties after 3.0
s and forces the shaky phase; calls spend charges and respect the cooldown. (unit/aim): stick curve and ramp; mouse
absolute; assist friction applies to bucks and not to does; scoped speed scale.

### 5.9 Shot resolution and hit zones (`42-shot.js`)

A shot is analytic (it works headless and matches what is drawn): the player's ray (5.1) at the swayed aim point.
Candidates, nearest forward distance wins:
1. **Animals**: bounding sphere first; then every zone the ray crosses on that animal (spheres and capsules from
   `rig.zones()`); the scoring zone is the highest-priority zone crossed on the first animal hit: heart > head >
   lung > neck > shoulder > gut > ham > leg > antler. A doe or fawn in front of a buck takes the shot.
2. **Critters**: spheres (and a capsule for long ones).
3. **Occluders**: tree trunks (vertical cylinders), rocks (spheres), logs (capsules), fence posts, hay bales, the barn,
   stand and blind frames (boxes); looked up along the ray's ground track in the 32 m grid. Foliage, bushes, reeds,
   grass and corn do not block shots (they only hide).
4. **Terrain**: `rayHit` up to the nearest candidate's distance.
5. **Water**: the surface plane where the mask says water.

| Zone (whitetail at rest, local units) | Volume | Damage | Lethal | Score x | Callout |
|---|---|---|---|---|---|
| heart | sphere r 1.5 at (6, 0, 10.6): low in the chest, just behind the fore leg | 9 | yes | 2.0 | HEART SHOT! |
| head | sphere r 2.0 at the skull | 9 | yes | 1.8 | HEADSHOT! |
| lung | ellipsoid radii (3.6, 2.7, 2.6) at (4.5, 0, 12.2) | 9 | yes | 1.6 | LUNG SHOT! |
| neck | capsule neck base to head base, r 1.8 | 9 | yes | 1.4 | NECK SHOT! |
| shoulder | sphere r 2.2 at each fore leg top | 9 | yes | 1.2 | SHOULDER! |
| gut | capsule (3, 0, 12.2) to (-8, 0, 12.4), r 3.1 | 0.6 | no | 0.7 | GUT SHOT |
| ham | sphere r 3.0 at (-9, 0, 12.4) | 0.5 | no | 0.6 | HAM HIT |
| leg | a capsule per bone, r 1.1 (upper bones) and 0.8 (lower) | 0.4 | no | 0.5 | LEG HIT |
| antler | capsules along beams and tines, r 0.35 | 0 | no | 0 | ANTLER PING! (no damage; spooks) |

Zones are rebuilt from the joints every step (they bend, run and fall with the rig) and every zone stays inside the
drawn body, so a shot just off the silhouette misses.

Hit points: whitetail 1, elk 1.5, moose 2 (a lethal zone kills any of them; a deer drops to two gut shots, a moose to
four). Elk and moose zones scale with the rig.
Effects by what was hit: fur puff and thump (animal), feathers (bird), bark chips and a wood knock (trunk), sparks and a
ricochet whine (rock), dirt clods and a thud (terrain), a splash column (water), nothing but the echo (sky). Every shot
emits spook noise (5.6). Same-step hits on one animal by two players: the better zone gets it; equal zones share the
kill (SHARED! half points each).

Hits are stored in the animal's local frame (position, heading, body pitch and roll at the moment) for the Shot Chart.

**Tests** (unit/shot): rays through each zone's centre on a posed whitetail, elk and moose return that zone; a ray
through the heart from the side passes the lung first and still scores heart; a trunk in front blocks; a crest in
front blocks; a doe in front of a buck takes the shot; antler ping does no damage; water plane splash; equal-zone
same-step hits share. **browser/pick** (the WYSIWYG check): render each live animal of a busy scene as a flat ID
colour into an offscreen canvas, sample 300 pixels inside the silhouettes (not antlers) and cast analytic rays: at
least 95% must hit the animal drawn there; sample 300 pixels 3 px outside the silhouettes: at most 5% may hit it.

### 5.10 Scoring (`43-score.js`)

```
kill points = round( base(species, antlers) x distanceMult x zoneMult x (running ? 1.25 : 1) x (trophy ? 3 : 1) ) + quick + multi
running = the animal was moving faster than its species' trot speed when hit; zoneMult = the killing shot's zone
base: whitetail 100 + 15 per point; elk 150 + 20 per point; moose 200 + 6 per inch of spread
distanceMult = clamp(1 + (metres - 25) / 75, 1, 3.5)          (100 m = 2.0; 175 m = 3.0)
quick = +50 if the kill comes within 1.0 s of the buck first being visible
multi = DOUBLE! +250 for a second kill within 1.5 s, TRIPLE! +750 for a third
```

Site bonuses: **Accuracy** `round(hits / shots x 1000)` when at least 50% (hits on any target count; antler pings
don't); **Clean sweep** +1000 (every buck bagged, every kill one shot in a lethal zone); **No penalties** +200.
Critters: fixed points (6.7). Penalties: doe or fawn: benched for the site (Classic) or -300 (Casual); skunk -100 and a
green stink cloud over the screen for 3 s; Bessie -500; eagle or loon -400; a lost wounded animal -100. Scores never go
below 0 per site.

**Stars** per site (antlers, 1-3): 1 for bagging a buck, 2 for bagging every buck, 3 for a clean sweep with no
penalties. **Rank** after a hunt, against its par (tuned to the bot's average): Greenhorn < 40%, Tenderfoot < 60%,
Woodsman < 80%, Sharpshooter < 100%, Big Game Pro < 125%, Legend of the Lodge from 125%.

**Rivals** (Hunt-Off campaign): Big Earl, Loretta Pruitt and Cousin Dwayne post preset scores per hunt (start at 55%,
85% and 100% of par; tune). The HUD shows Dwayne's score for the hunt as the one to beat; beating him gives +1000
BRAGGING RIGHTS and a grumble.

**Tests** (unit/score): the formula for given inputs (table-driven); multi-kill windows; accuracy threshold; clean
sweep only with one-shot lethal kills; penalties per setting; stars; ranks at the boundaries; scores never negative.

### 5.11 Players and local multiplayer (`50-players.js`)
- `game.players` (engine): P1 is `game.input` (mouse and keyboard, or a pad); players 2-4 join with Options/Start on a
  free pad (`game.allowJoin({ max: 4, onJoin })`) on the Party Hunt join page; a second keyboard half
  (`keys: 'right'`, arrows to aim) is allowed but not advertised.
- Colours are the AI Hub seat colours: P1 `#e8443a` red, P2 `#3b82f6` blue, P3 `#22c55e` green, P4 `#f5b700` gold,
  plus the reticle shapes (5.8) so colour is never the only cue.
- Shared camera (director keyframes only), shared animals, first hit takes it; each player has their own rifle, calls,
  score, stats; benching is per player (benched players watch); the site's end rules (5.7) apply to everyone.
- The tally shows a column per player; hunt results show a podium; the winner may enter initials.
- A pad unplugged pauses with the engine's message (per player).

**Tests** (flow/party): two and four scripted players join; each has its own tube and score; a doe benches only its
shooter; a shared kill splits points; the podium orders players by score.

### 5.12 HUD, prompts and glyphs (`51-hud.js`, `52-glyphs.js`)

10-foot rules: the HUD is sparse and large. At 480 x 270: key numbers at font scale 2 (14 px), banners at scale 3-4,
captions at scale 1 with a shadow in a dark band; 12 px safe margins; clear of `game.cornerArea()` and, on a phone,
`input.touchArea()`.

- **Top centre**: site name and clock (0:42); under it a row of buck icons (antler silhouettes: hollow = to come,
  filled in the bagger's colour = bagged, crossed = escaped or lost).
- **Player panels** (P1 bottom left, P2 bottom right, P3 top left, P4 top right): score, five shell icons with a
  chamber light, call charges (horn icons), breath arc while scoped, BENCHED tag.
- **Centre banners**: BUCKS ONLY!, HEART SHOT!, DOE! YOU'RE OUT!, TROPHY!, TIME!, with an extruded `E.font.title`
  style, 0.9 s, a whoosh.
- **Score pops** in the world over the animal: "+425 HEART SHOT 86 m" in the shooter's colour.
- **Captions** (barks and dialog) lower centre with the speaker's name and colour.
- **Prompts** lower centre, contextual (PUMP!, HOLD [L2] TO SCOPE, CALL [△]), shown only when relevant and for a
  limited number of times per hunt.
- **Rival tag** (campaign): top left under P3's place: "DWAYNE 4,600".
- **Hold to see standings** (Tab or Create; unbound in hub rounds): a centre table of players' scores.

**Glyphs**: `Prompts.label(action, player)` decides the family by the player's last device: `gamepad` -> the pad's
glyph (`input.label(action, 'gamepad')` gives '✕', '○', '□', '△', 'R2', 'L2', 'R1', 'L1' with PlayStation symbols, or
'A', 'B', 'X', 'Y', 'RT', 'LT', 'RB', 'LB' with Xbox); `keyboard` or `mouse` -> one KB+M family: actions bound to a
mouse button show the mouse icon once the mouse has been used this session, others show the key (R, Q, Shift, Space,
Esc, Tab, Enter). `52-glyphs.js` draws each as a pixel icon: PS shapes in their colours (blue cross, red circle, pink
square, green triangle) on dark discs, trigger and bumper tabs, stick icons, Options and Create pills; Xbox letters on
coloured discs; keycaps (wide for Space, Shift, Enter); a mouse with the left, right or wheel highlighted. The default
button symbols are **PlayStation**; Settings > Controller > Button symbols offers Xbox (engine setting, default changed:
Appendix C).

**Tests** (unit/prompts): with a pad last used, labels are PlayStation glyphs by default and Xbox letters after
`settings.set('glyphs', 'xbox')`; with the mouse used, fire shows the left-click icon and pump shows R; every action
the HUD prompts has an icon in all three families; every caption and banner fits the screen width at its scale
(`E.font.width`).

### 5.13 Feedback and juice
- Shot: a 1-2 px screen shake (comfort setting respected), reticle bloom, gunshot with a valley echo (5.20), a pad
  rumble (0.35, 0.08 s) for the shooter.
- Kill: hit-stop 0.04 s (`game.freeze`), callout banner for lethal zones, score pop, the bagged tag; a stronger rumble.
- Doe: a red-tinted flash (flashes setting respected), the sad-trombone sting, the emcee's groan, the BENCHED reticle.
- Multi-kills, long shots (150 m and more: LONG SHOT!), running shots: their own barks.
- **Trophy Cam** (trophy kills, and in single player the last buck of a site if it was a heart shot; setting On /
  Trophies only / Off): the sim runs at `game.timeScale = 0.15` while the camera flight takes 1.4 s of unscaled time
  (`game.real`): the lens flies from the vantage along the shot's ray to 3 m from the impact, the fov narrows, a
  bullet streak leads; at impact the animal flashes to its x-ray look (skeleton, heart and lungs) for 0.35 s; normal
  speed for its collapse; back to the vantage with a fade; time scale restored. Skippable (confirm). Never during
  local multiplayer or hub rounds (they show the Shot Chart only). Under Reduce motion it is a still x-ray card.
- Skunk: a green dithered cloud over 60% of the screen fading over 3 s, a "pfft" and a stink chord.

### 5.14 Tally and the Shot Chart (`60-tally.js`)
A full-screen card over the dimmed, frozen vista, one beat at a time (10-foot friendly), confirm to skip ahead:
1. SITE CLEAR or TIME!, the site's name.
2. For each bagged animal, a card: its x-ray side view (`rig.drawXray`: a dithered translucent body, skeleton lines,
   heart red and lungs pink, entry marks where each round went, labelled HEART / LUNG / GUT...), its distance, antler
   points or spread, and its points line counted up with ticks.
3. Critters, penalties, accuracy, clean sweep, no-penalty bonus, site total; the stars (antler icons) pop in.
4. Party: a column per player, then the site's leader. Campaign: the standings strip against the rivals.
Prompt: [✕] CONTINUE (per device). Confirm is ignored for the first 0.6 s (Space pumps in play and confirms here, so
a late pump doesn't skip a card). Auto-advances after 12 s in the attract mode.

### 5.15 Trophy encounters (`61-trophy.js`)
A trophy site is a site with a legend, one named animal and rules of its own (6.3). Shared parts: a campfire legend
dialog before it (Uncle Dub), tension music layers in when the trophy is on screen, the trophy shows a TROPHY tag the
first time it's seen, its HUD icon is gold, it has 1.5x the species' hp and ignores the call except where its rules
say, and a miss makes it bolt (its window ends). Bagged: Trophy Cam, TROPHY BAGGED!, x3 points, its mount unlocks in
the Lodge. Escaped: THE ONE THAT GOT AWAY (no penalty). Saved in records either way (seen, bagged, best distance).

### 5.16 Bonus games (`62-bonus.js`)
A framework for 30-second shooting galleries on the same landscape at a bonus vantage: a target spawner on a
timeline, thrown or flying targets on ballistic arcs (`E.arc`-style maths in world space) or `E.Path`s, the same rifle
rules with a bigger tube and faster rack, per-target points, protected targets with penalties, a PERFECT bonus (every
target hit with no misses doubles the bonus total), and a bonus tally. The three games are in 6.4. Bonus Only mode plays
any of them from the menu; they keep their own high-score tables.

### 5.17 Modes and menus (`90-title.js`, `91-menu.js`, `92-hunt.js`, `94-about.js`, `53-ui.js`)

**Title**: the logo (`E.font.title`, wood-and-brass gradient with a blaze-orange outline, "THE 41ST ANNUAL" above it)
over a live vista (Hollow Creek at dawn, deer grazing, slow pan); PRESS [START] in the last device's glyph; the
engine's corner menu button (settings) at top right. CONTINUE appears in the menu when an autosaved Hunt-Off exists.

**Main menu** (big cards, one column, focus with d-pad, stick or arrows; hover with the mouse moves the focus; click or
confirm picks; cancel goes back; a prompt bar at the bottom shows confirm and back glyphs):

| Entry | What it does |
|---|---|
| HUNT-OFF (or CONTINUE HUNT-OFF) | the campaign: Hollow Creek, Bugle Ridge, Muskeg Lake in order, rivals and standings, ceremony; autosave after each hunt (`game.saves` autosave slot) |
| SINGLE HUNT | pick one of the three hunts (card with species, time of day, trophy silhouette, best score) |
| PARTY HUNT | the join page (players press Options or Start on their pads; the mouse player is P1), then pick a hunt or QUICK DRAW (site 1 of each hunt plus Saucer Season, time-boxed; a short loading card raises each landscape between them) |
| BONUS GAMES | pick Crow Patrol, Saucer Season or Snowball Standoff |
| PRACTICE RANGE | Uncle Dub's range: the tutorial (6.5) |
| THE LODGE | the trophy room (5.18) |
| SETTINGS | the engine's settings screen (`game.menu('settings')`) |
| ABOUT & CREDITS | 5.27 |

**Difficulty** (picked on the hunt card, remembered): Easy (Strong assist, auto-pump, animals x0.85 speed, +1 call),
Normal, Pro (no assist, animals x1.15 speed, does mixed in more often, scope sway x1.3).

### 5.18 The Lodge, records and saves (`93-lodge.js`)
- A cozy side-view room built with the engine's own 2D pipeline: a `side` view, a PlatformMap floor of `wood` tiles and
  a log back wall (`back` tiles, `plank` material), engine props and shapes (fireplace from custom shape, table, chairs,
  bench, bookcase, barrel, lamps; `light: true`), warm canvas lighting with a flickering fire, Uncle Dub in a rocking
  chair (Humanoid, idle; waves when focused), a sleeping hound (Blob).
- The trophy wall: plaques for Old Iron Rack, The Duke, Big Mo (dark silhouettes until bagged, then `rig.drawMount`),
  each hunt's best buck, and the records chalkboard (E.Arcade tables per mode with initials, preloaded with DUB, MAE,
  DWN, LOR, ERL). Focus moves along the wall (d-pad, stick, arrows, mouse hover); the camera pans to it; a big info
  card shows its story, distance, date bagged.
- Stats card: hunts played, shots, accuracy, bucks bagged, does shot, longest shot, favourite rifle sound (a joke line).
- `Records` in `E.store`: best scores per mode and hunt, stars per site, trophies, stats, the Range badge. In AI Hub
  sessions storage is a throwaway memory store (the client's), so nothing special is needed.

### 5.19 Dialog, barks and voices (`71-barks.js`, `babble.js`)
- **Dialog** scenes use `E.Dialog` with Humanoid portraits; `voice: null` and our Babble voice plays the line. Story
  beats are data (`def('beat', ...)`): a list of `[speaker, line]` with optional pose and expression.
- **Barks**: categories (6.9) with 3-6 lines each; picked without repeating the last two (fx stream); the emcee shouts
  them as a caption plus a short Babble burst; at most one bark per 1.2 s, high-priority barks (doe, trophy, triple)
  cut in.
- **E.Babble** (Animalese/Simlish style): each line becomes syllables (letter pairs; vowels pick the pitch step),
  12-16 syllables a second, each a 40-70 ms blip through a band-pass "formant" filter per vowel; per character: base
  pitch, waveform, speed, pitch spread, warble. Exclamations rise at the end; questions rise; ALL-CAPS barks are louder
  and faster. Voices: Emcee (140 Hz square, boomy, echo), Uncle Dub (105 Hz saw with noise grit, slow), Granny Mae (260
  Hz sine with vibrato), Dwayne (185 Hz 12.5% pulse, nasal), Loretta (225 Hz triangle, bright), Earl (95 Hz square,
  slow and warm). Uses `game.audio.ctx` and the exposed sfx bus (Appendix C); silent headless.

### 5.20 Audio (`70-audio.js`)

**Music** (engine song notation; bluegrass chiptune):

| Song | Where | Sketch |
|---|---|---|
| `hoedown` | title, menus | 140 bpm, G major: pulse-25% banjo rolls in 16ths, square fiddle melody, triangle root-fifth bass, washboard noise and rimshots |
| `lodgefire` | Lodge, About | 84 bpm, warm square "harmonica" with vibrato over triangle chords, soft brushes |
| `stalk` | hunt sites (layers) | 96 bpm pads and pulse ostinato at low volume; layer `drums` comes in when bucks are on screen, layer `tension` (heartbeat kick, tremolo) when a trophy is on screen (`audio.layer`) |
| `jamboree` | bonus games | 160 bpm hoedown, fast fiddle |
| `results` | tallies, hunt results | 110 bpm strut |
| `fanfare`, `siteclear`, `doe`, `escaped`, `newrecord` | stings (`audio.sting`) | trophy fanfare; clear jingle; sad trombone slide; two-note fall; initials theme |

**Ambience** beds per hunt: wind (filtered noise, slow swells), birdsong chirps (random sine and pulse blips by time of
day), creek or lake lapping, distant crows (Hollow), elk chirps and distant bugles (Bugle), loon calls and ice creaks
(Muskeg).

**SFX** (engine voices, lists with `delay` for layering): rifle shot (noise crack 0.05 s high-passed + 60 Hz sine
thump 0.15 s + low noise tail 0.6 s + two echoes at 0.35 s and 0.8 s, quieter and darker, the echo delay longer across
open valleys); dry click; pump rack (two band-passed clicks 0.09 s apart with a slide); shell inserts; scope raise
(cloth swish); breath in and out; calls (grunt: 90 Hz saw wobble; bugle: sine 500 -> 1800 Hz glide with vibrato and
a noisy scream; moose: 70 Hz saw "waugh"); impacts (fur thump, wood knock, rock ricochet whine 3000 -> 1200 Hz,
dirt thud, splash); hooves by gait; animal voices (snort, cow-elk chirp, turkey gobble trill, duck quack, crow caw,
squirrel chatter, marmot whistle, wolf and coyote howls, loon wail, beaver slap); crow flap; clay break; scarecrow
bonk; snowball splat; UI focus tick, confirm, back; score ticks; banner whoosh; stink; slow-mo whoosh.
A Sound Lab dev scene plays every song, sfx and voice for review.

### 5.21 Attract mode and the HunterBot (`95-attract.js`)

**Idle detection**: any key, mouse button, mouse movement over 3 px, wheel, pad button or stick past the dead zone, or
touch resets it. After **10 s** idle on `title` or a top-level `menu` page, go to `attract`. Any input in `attract`
returns to `title` (the input is swallowed). On touch-only devices it runs the same.

**Playlist** (loops; fixed seeds so it is the same every time; a DEMO banner and a blinking PRESS ANY BUTTON):
1. Hollow Creek site 1, bot playing, 35 s, then 8 s of its tally with Shot Charts.
2. Bugle Ridge site 2: scoped long shots with hold-breath, a call that freezes a bull, 25 s.
3. Saucer Season, 15 s.
4. Muskeg Lake trophy: Big Mo's charge, a heart shot, the Trophy Cam, 20 s.
5. The high-score tables (`cab.drawTable`), 8 s; the Lodge's trophy wall pan, 6 s; the title, 5 s.

**HunterBot** (also the test driver and the balance tool; `bot.cheat` for the attract mode): picks the best visible
legal target (bucks first, value over distance, the ones about to escape first; critters when no buck is up; never
does or protected critters, and never fires if the ray's first hit would be one), moves its reticle with a critically
damped spring toward the target's vital zone with lead for motion (reaction delay and aim noise from the `bot` stream by
skill: novice, average, expert), scopes past 90 m, holds breath when scoped, calls when its target runs fast, fires
when its error is under 2 px, pumps after every shot. Cheats in attract: infinite rounds, auto-pump, perfect aim,
sees through cover but only fires on clear rays.

### 5.22 Dev mode (`96-dev.js`)

Reached from the pause menu's **Dev mode** item (any pausable scene), and by the deep link `#dev`. Choosing it resumes
the game underneath and opens a Shell screen `dev` (HTML, engine-styled, works with pad, keys and mouse; sliders turn
with left/right; Appendix C adds `rows` to custom Shell screens and `hidden` to settings so these stay off the normal
Settings screen). The game keeps running behind it (game actions are held back while the screen is open), so changes
show live; **Freeze** stops the sim.

- **Live sliders** (each a `game.settings` key in a hidden `Dev` group, saved, read through `TUNING`): every row of
  Appendix A, with **Reset to defaults** (`game.settings.reset('Dev')`) and a reset per row (confirm on the row).
- **Tools** (buttons): Freeze / Unfreeze, Slow motion (0.25x), Skip segment, Bag all bucks, Spawn buck / doe /
  trophy / critter at the reticle (the terrain point under it), Kill all, Refill and infinite ammo, God mode (no doe
  penalty, no stink), Jump to hunt / site / trophy / bonus (pickers), Bot plays (novice / average / expert), Free
  camera, Animal Lab, Sound Lab, Unlock all trophies, Reset save data (asks first), Copy snapshot (logs JSON).
- **Overlays** (toggles): hit volumes and the last ray, occluder volumes, actor state labels and fear bars, paths with
  bearing/distance marks, the play fan, occlusion lines, the engine's frame-rate readout (`settings.showFps`).
- **Free camera**: WASD or the left stick moves, the mouse (held right button) or the right stick looks, Q/E or L1/R1
  for height; a readout of position (m) and bearing/distance from the current vantage, to author paths; cancel exits.
- **Animal Lab** (`#animallab`): every species, sex, critter and person, every gait and pose, turntable and distance
  sliders, x-ray and mount previews. **Sound Lab** (`#soundlab`): plays every song, layer, sting, sfx and voice.

**Tests** (flow/dev): the pause menu lists Dev mode; opening it shows screen `dev`; setting `dev.animalSpeed` to 2
doubles a walking deer's speed within one step; Reset to defaults restores every Dev key; God mode prevents benching;
Jump to site loads it; Free camera moves the lens.

### 5.23 Settings and accessibility
Our settings (in `menu.settings`, group Game): Difficulty (Easy/Normal/Pro), Aim assist (Off/Light/Strong), Reticle
speed (slider), Auto-pump (toggle), Scope (Hold/Toggle), Doe rule (Classic/Casual), Trophy Cam (On/Trophies only/Off),
Antler glint (toggle), Large captions (toggle), Rival tag (toggle). The engine's standard ones stay: volume, music,
effects, reduce motion (no shake, no camera flights, no slow-mo), screen shake, flashes, screen filter, button symbols,
vibration, dead zone, rebinding. Information is never colour alone (reticle shapes, icons with text).

### 5.24 Input map and game options (`01-game.js`)

```js
const HUNT = {                       // our preset (game input option). Check game.input.map after creation: if the engine does
                                     // not merge its own start/pause/confirm/cancel into a custom preset, add them here
                                     // (start: Enter, Pad9; pause: Escape, KeyP, Pad9; confirm: Enter, Space, Pad0; cancel: Escape, Backspace, Pad1)
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  fire:   ['Mouse0', 'Pad7', 'KeyJ'],          // left click, R2
  pump:   ['KeyR', 'Space', 'Pad2', 'KeyK'],   // R, Space, Square
  scope:  ['Mouse2', 'Pad6', 'KeyL'],          // right click, L2
  breath: ['ShiftLeft', 'Pad5'],               // Shift, R1
  call:   ['KeyQ', 'Pad3'],                    // Q, Triangle
  board:  ['Tab', 'Pad8'],                     // hold: standings (unbound in hub rounds)
};
const game = new E.Game({ canvas: 'screen', res: [480, 270], expand: true, view: 'side', input: HUNT, id: 'bigbuckhuntoff',
  menu: { items: [['Restart site', ...], ['Restart hunt', ...], ['Dev mode', () => dev.open()]], settings: [/* 5.23 */],
          controls: { fire: 'Shoot', pump: 'Pump / reload', scope: 'Scope', breath: 'Hold breath', call: 'Call', board: 'Standings' },
          quit: 'title' } });
```
Every Vista scene sets `camera: { zoom: false }` (the wheel and -/= belong to the game), `touch: []`, and hides the OS
cursor (the canvas has `cursor: none`; our reticle or a pixel arrow is drawn instead). The wheel (down) also pumps:
a `wheel` listener calls `input.press('Act:pump')` and `input.release('Act:pump')` on the next step (or use the input
change in Appendix C). Menus: d-pad,
left stick, arrows/WASD move; Cross/Enter/Space confirm; Circle/Esc/Backspace back; L1/R1 or Q/E switch tabs; mouse
hover focuses and click picks.

### 5.25 Touch-only devices
`touchOnly = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches`, re-checked when a
key, mouse or pad is used (then it is cleared for the visit). While true: no touch buttons anywhere (`touch: []`,
`input.touchEnabled = false`), the title shows **Controller or keyboard required** in a big panel, the engine's corner
menu (settings) button stays usable, a tap does not start a game, and the attract mode runs after 10 s (a tap exits
it to the title as any input does). **Tests** (flow/touch): with `matchMedia` stubbed to touch-only, the title shows the
message, START does nothing from a tap, the attract mode starts after 10 s; a keydown clears it.

### 5.26 AI Hub (`97-hub.js`): ghost mode

Why ghost: every player runs the same seeded hunt on their own device (fair, robust under latency and loss) and sees
the others' reticles and shots as ghosts, like players at one cabinet; scores race on the hub's board.

**Flow** when `AIHub.active` (checked at startup; the session client is the page's first script):
1. Boot step "Calling the hub": `info = await AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true })`. If it is
   `null`, start normally (title).
2. Build the round's hunt: `hunt = ['hollow', 'bugle', 'muskeg'][((info.round || 1) - 1) % 3]` (rounds count from
   1; keep the index non-negative); the run seed from `AIHub.rng('hunt')`. `AIHub.active` is known synchronously at
   load, so `01-game.js` creates the engine with `autoPause: false`, `corner: false` and `menu.quit: false` when it is
   true; the `hub` scene is not pausable; there is no title, attract or menu. (If `connect()` then answers `null`, the
   game simply runs its normal title with those options; nothing else changes.)
3. Scene `hub`, **our own card**: a lodge chalkboard over the hunt's vista: BIG BUCK HUNT-OFF, the hunt's name, the
   players in their seat colours with ready ticks (from the `card` event's `ready`), how to win ("Most points in 3
   minutes. Bucks only, never does!"), this player's controls as glyphs, the time left (`left`). Enter, Cross or a
   click on READY -> `AIHub.answer('ready')`; Triangle, M or a click on MORE TIME -> `AIHub.answer('more')`. No
   randomness except `AIHub.rng('card')`. `AIHub.ready()` is called as soon as the hunt is built (no key press).
4. On `start`: a 3-2-1 from `AIHub.time()` (negative during the countdown); play begins at time 0.
5. **The Hub Hunt-Off timeline** (3:00; every segment time-boxed and keyed to `AIHub.time()`, so all copies stay in
   the same segment): 0:00-0:06 establishing pan and BUCKS ONLY!; 0:06-1:00 site A; 1:00-1:05 walk-in; 1:05-1:55 site
   B; 1:55-2:00 walk-in; 2:00-2:30 the hunt's bonus game; 2:30-2:55 the trophy (time-boxed); 2:55-3:00 final tally,
   then `AIHub.result({ score, stats: { 'Bucks bagged': n, Accuracy: '72%', 'Longest shot': '143 m' } })`.
   Sites A/B: Hollow 1+2, Bugle 1+3, Muskeg 1+3. A doe benches the player until the next segment.
6. **Clock**: each frame, if the local segment clock drifts more than 0.25 s from `AIHub.time()`, advance extra fixed
   steps (catching up, no draw) or hold; past 2 s behind (a hidden tab), jump to the segment the hub clock is in.
7. **Reporting**: `AIHub.progress({ score, label: 'Site 2 · 3 bucks' })` once a second; `result` once at the end or at
   `time-up` (at once, with the current score, if not sent).
8. **Ghosts**: 10 times a second, `AIHub.send({ t: 'g', s: segment, a: [yawMilli, pitchMilli], sc: scoped, p: score },
   { reliable: false })` (aim as angles from the scripted camera); on each shot, a reliable `{ t: 'shot', s, a, res:
   'buck' | 'doe' | 'critter' | 'miss', pts, zone }`. Received ghosts draw as their seat-colour reticle shape at 60%
   opacity with the name under it (drawn in the pixel font; names are never put in HTML), their shots as small puffs
   and "+pts" in their colour; a standings strip shows everyone's latest score. Ghosts never touch the local world.
   `leave` removes a ghost.
9. On `end`: stop input, stop music and sounds, show ROUND OVER with `standings` (names and colours) until the hub
   removes the page. No alerts, dialogs, popups, new windows, sockets or fetches, ever.
10. Create + Options belongs to the hub: nothing is bound to Create (Pad8) in sessions, and Options is ignored while
    Create is held.

**Tests**: flow/hub (headless, `tests/lib/hubstub.mjs`: a fake `AIHub` with a controllable clock and event emitter):
connect -> card drawn -> `ready()` called once without input -> `start` -> segments change on the hub clock ->
progress at least once a second -> exactly one result (also on early `time-up`) -> `end` stops input; ghost sends at
most 10/s unreliable plus shot events; spawns are identical in two copies that shoot differently (spawn logs equal);
`Math.random` consumption by cosmetics doesn't change spawns. browser/hub: the real harness (section 9.4).

### 5.27 About & Credits and the reports (`94-about.js`)
Pages (one idea per page, big text, L1/R1 or left/right to turn, back to leave): SOURCE INFORMATION (every field of
TASK.md's list: date, source, plan, genre and perspective, tech, art direction, animation, audio, online, testing,
research, environment, model, usage), TESTING FEEDBACK, ENGINE FEEDBACK, PROMPT FEEDBACK (the answers to TASK.md's
questions, written by the builders at the end), CREDITS (my-3D2dge v0.85.2 by Michael Crosato, MIT; Kenney asset
entries used, CC0; AI Hub session client 1.4.0; "all music, sounds and voices synthesized in code"; the cast).
The same text goes in the final chat reply and in `exit-interview.json` (Appendix E).

---

## 6. Content

### 6.1 Hunts and maps

| Hunt | Species | Time and weather | Host / rival | Map (1024 m core) |
|---|---|---|---|---|
| **Hollow Creek** | whitetail deer | autumn morning, valley mist, falling leaves | Uncle Dub; Granny Mae hosts the bonus | rolling hardwood hills; a creek meanders north to south; Granny Mae's farm (red barn, cornfield, pasture, fences) in the south-east; a hardwood ridge in the west; Fog Glade, a clearing in the north-west |
| **Bugle Ridge** | elk | alpine dusk, sun behind the peaks | Loretta at the trap house | a high meadow ringed by aspens; a valley with a talus slope opposite; a timberline saddle to the west; a lake below; peaks in the Backdrop |
| **Muskeg Lake** | moose | first snow, overcast, fog banks | Big Earl by the lake fire | a lake with reed shallows and a beaver lodge; spruce bog to the north; a burned clearing with charred snags to the east; a snowy shore |

Vantages per hunt (positions in metres in the core; authored with the dev free camera): three site vantages, the
trophy vantage and the bonus vantage, linked by trail paths for the walk-ins.

### 6.2 Sites

| Site | Vantage | FOV | Distances | Bucks | Time | Spawns (outline) | Critters |
|---|---|---|---|---|---|---|---|
| Hollow 1 **Creek Crossing** | tree stand 4.5 m up over a ford | 34° | 18-50 m | 3 | 60 s | a doe and fawn cross first; a 6-pointer grazes on the bank, drinks; two bucks bound across the ford with a doe between them | squirrel on an oak (50), rabbit (75) |
| Hollow 2 **Cornfield Edge** | ground blind at the field corner | 28° | 30-90 m | 4 | 70 s | pairs burst out of the corn rows (emerge), run the fence line; one jumps the fence; a 10-pointer last | turkeys x3 (150), skunk (-100), Bessie the cow (-500) |
| Hollow 3 **Hardwood Ridge** | rock outcrop on the ridge | 32° | 25-70 m | 4 | 75 s | deer weave between trunks (wait for gaps); a buck bedded behind a log bolts at the first shot; a decoy doe | raccoon in a log (100), squirrels (50) |
| Bugle 1 **Aspen Park** | knoll above the meadow | 28° | 40-80 m | 3 | 75 s | a herd of 8 cows with 2 bulls grazes; a satellite bull bugles in the aspens and steps out when called | marmot (75), grouse flush (150), eagle (-400) |
| Bugle 2 **Talus Slope** | across the valley | 22° | 100-180 m | 3 | 75 s | elk traverse the far slope (scope and hold breath); rockfall startles them | coyote on the ridge (250) |
| Bugle 3 **Timberline Saddle** | facing the sunset | 26° | 50-90 m | 4 | 70 s | groups cross the saddle as backlit silhouettes; a bull charges downhill toward you, then veers | grouse (150), marmot (75) |
| Muskeg 1 **Reed Shallows** | a canoe offshore (bobbing) | 30° | 35-80 m | 2 (+3 cows, a calf) | 70 s | moose wade through reeds (legs below the water); a cow and calf cross close | ducks (150), beaver (100), loons (-400) |
| Muskeg 2 **Spruce Bog** | a bog edge in fog | 36° | 20-50 m | 3 | 70 s | fog banks drift; moose loom out close; one stands and stares instead of running | snowshoe hare (125), raven (100) |
| Muskeg 3 **Burn Clearing** | a snowy rise over the burn | 26° | 50-110 m | 3 | 75 s | moose trot across; two bulls lock antlers (fight) then split; a wolf pack chases a cow through (don't hit her) | wolves x3 (300), raven (100) |

FOV is the vertical field of view in degrees, telephoto-ish so animals read at 480 x 270: at 28° a whitetail (head
up, about 23 units tall before the `animalScale` boost) is about 26 px tall at 30 m, 16 px at 50 m and 10 px at 80 m,
where the scope (x3.5) makes it 34 px. Keep most shots inside 90 m; longer ones are scope shots by design.

### 6.3 Trophies

| Trophy | Where | Rules |
|---|---|---|
| **Old Iron Rack** (14-point whitetail) | Fog Glade at dawn, 60-100 m, 45 s | appears in 3 windows of 3.5 s between fog banks; a doe walks in front of him in window 3; he ignores calls until window 3 (then freezes 1.0 s) |
| **The Duke of Bugle Ridge** (7 x 7 bull elk) | dark timber edge, 70-120 m, 50 s | he bugles from the trees (panned left or right so you can hear where); each of your calls draws him to the next opening for 4 s (4 openings); a cow leads him through the second; calling a fifth time sends him off |
| **Big Mo** (72-inch bull moose) | the lake shore, 110 m in to 20 m, 45 s | bursts from the reeds and charges the stand over about 8 s; a lethal hit drops him; a gut or ham hit slows him; at 15 m he flattens the stand (screen tilt and crash: BIG MO SAYS NO!) and the trophy is lost; if missed he retreats and charges again, three times |

### 6.4 Bonus games (30 s each)

| Bonus | Host | Targets and rules |
|---|---|---|
| **Crow Patrol** (Hollow) | Granny Mae on her porch | crows flap up from Granny's corn in bursts, swoop and land on Hank the scarecrow: crows 100, the golden crow 500; hitting Hank -250 ("Hank's got feelin's!"); 10 rounds, rack 0.15 s |
| **Saucer Season** (Bugle) | Loretta at the trap house | clay saucers from the trap: singles, doubles, crossing pairs, a high tower; 75 each, golden clay 500; 12 rounds |
| **Snowball Standoff** (Muskeg) | Big Earl | snowmen pop up behind drifts and lob snowballs at you: shoot snowballs in the air (75) and knock hats off (150); a snowball that lands splats over part of the screen for 2 s; at 20 s the Snowmoose rises (a giant snow moose: its top hat 1000); 12 rounds |

Each has a PERFECT bonus (every target hit, no misses: the bonus total doubles) and its own high-score table.

### 6.5 Practice Range (Uncle Dub's)
A flat field with berms and paper targets (custom props whose hit zones are flat rings), 7 stations, each a short line
from Dub, an objective, and a check:
1. **Aim and fire**: three paper bucks at 20 m.
2. **Pump**: fire, pump, fire; then empty the tube and reload.
3. **Shot placement**: a paper buck with the vital ring: put one in the heart (the zone callout shows).
4. **Bucks only**: a moving target track alternating paper bucks and does: shoot only bucks (a doe hit is explained,
   not punished).
5. **Scope and breath**: a 150 m target: hold the scope, hold breath, fire (each named by its glyph).
6. **The call**: a mechanical deer runs a rail; call to stop it, then shoot.
7. **Critters**: tin squirrels pop up; a tin skunk with a DON'T sign.
Then "You'll do. Go win that Hunt-Off." and the Range badge in the Lodge. Prompts always use the last device's glyphs.

### 6.6 Species (gameplay numbers)

| Species | Target / protected | Shoulder, length | Walk / trot / run (m/s) | Antlers | hp | Points |
|---|---|---|---|---|---|---|
| whitetail | buck / doe, fawn | 1.0 m, 1.8 m | 1.3 / 3.4 / 8.5 | 4-12 points; trophy 14 | 1 | 100 + 15/point |
| elk | bull / cow, calf | 1.5 m, 2.4 m | 1.4 / 4.0 / 9.0 | 5x5 to 6x6; trophy 7x7 | 1.5 | 150 + 20/point |
| moose | bull / cow, calf | 1.9 m, 2.9 m | 1.5 / 4.5 / 8.0 (charge 9.5) | 40-55 in spread; trophy 72 in | 2 | 200 + 6/inch |

### 6.7 Critters (12 designs)

| Critter | Rig | Behaviour | Points | Hunts |
|---|---|---|---|---|
| squirrel | Blob (cat ears, bushy tail, feet) | climbs a trunk, runs a log, chatters | 50 | Hollow |
| rabbit / snowshoe hare | Blob (rabbit ears, feet) | hops in arcs, freezes, bolts (hare is white) | 75 / 125 | Hollow / Muskeg |
| wild turkey | Blob + fan and wattle | struts, gobbles, runs, flushes | 150 | Hollow |
| raccoon | Blob + mask, ringed tail | peeks from a hollow log, ducks back | 100 | Hollow |
| skunk (protected) | Blob + stripe | waddles; if shot: stink cloud | -100 | Hollow |
| Bessie the cow (protected) | Quadruped cow | grazes in the pasture, moos | -500 | Hollow |
| crow / raven | Blob bird | flies over in loose flocks, caws | 100 | Hollow bonus / Muskeg |
| grouse | Blob bird | flushes from cover with a whirr, flies low | 150 | Bugle |
| marmot | Blob | pops up on rocks, whistles, ducks | 75 | Bugle |
| coyote / wolf | Quadruped canid | trots the ridge, howls; wolves chase in a pack | 250 / 300 | Bugle / Muskeg |
| eagle (protected) | Blob bird, big | soars in circles high up | -400 | Bugle |
| duck / loon (protected) / beaver | Blob bird; Blob swimmer | ducks flush and fly; loons float and wail; the beaver swims with a wake and slaps | 150 / -400 / 100 | Muskeg |

### 6.8 Cast and story beats

**Cast**: the Emcee (announcer of the Hunt-Off), Uncle Dub (your guide), Granny Mae (farm owner, Crow Patrol host),
Cousin Dwayne (rival, boastful), Loretta Pruitt (rival, sharp and kind), Big Earl (rival, here for the chili).

| Beat | When | Lines (write more in the same voice; keep each under about 60 characters) |
|---|---|---|
| welcome | first Hunt-Off start | EMCEE: "Welcome to the 41st Annual Big Buck Hunt-Off!" / EMCEE: "Three hunts. One trophy wall. Zero does!" / DUB: "Name's Dub. Forty years guidin'. Lost twice. On purpose." |
| rivals | after welcome | DWAYNE: "Hope you packed a lunch, cuz. You'll be here a while." / LORETTA: "Ignore him. He shot a mailbox in '09." / EARL: "I'm mostly here for the chili." |
| hollow intro | Hollow Creek start | DUB: "Whitetails thick as ticks out here." / DUB: "Bucks got antlers. Does don't. Can't tell? Don't pull." / DUB: "Pump after every shot. This rifle's older'n me." |
| iron rack legend | before the trophy | DUB: "Old Iron Rack. Fourteen points." / DUB: "Walks in the fog so nobody can count 'em." / DUB: "Been dodgin' hunters since your daddy wore diapers." |
| crow patrol | before the bonus | GRANNY: "Crows ate my sweet corn. Every last ear!" / GRANNY: "Shoot the crows, sugar. Not Hank." |
| hollow outro | after results | DWAYNE (behind): "Scope's crooked. That's all that is." or DWAYNE (ahead): "Told ya. Bring a lunch." |
| bugle intro | Bugle Ridge start | DUB: "Elk hear a bugle, they come lookin' for a fight." / DUB: "Give 'em a call and they'll stop to see who's talkin'." |
| duke legend | before the trophy | DUB: "The Duke don't come out for just anybody." / DUB: "Answer him back. Make him curious." |
| saucer season | before the bonus | LORETTA: "Pull!... That's what you say. Then you shoot it." |
| muskeg intro | Muskeg Lake start | DUB: "Moose ain't skittish. Moose is a truck with opinions." / EARL: "Chili's on the fire if you live." |
| big mo legend | before the trophy | DUB: "Big Mo don't run from you." / DUB: "He runs AT you. Hold steady." |
| snowball standoff | before the bonus | EARL: "The snowmen are back. They want revenge." |
| ceremony | after Muskeg results | EMCEE: placement line ("Our new Hunt-Off champion!" / "There's always next year!"), DUB: "Hang it on the wall, kid." Then the Lodge with the new mounts, then the credits page |

### 6.9 Barks (emcee unless noted)

| Category | Lines |
|---|---|
| start | BUCKS ONLY! / HERE THEY COME! / EYES SHARP, HUNTERS! / THREE BUCKS ON THE MOVE! (count from the site) |
| kill | NICE SHOT! / BAGGED 'EM! / WHAT A SHOT! / DOWN HE GOES! |
| zones | HEART SHOT! / HEADSHOT! / LUNG SHOT! / NECK SHOT! / SHOULDER! / GUT SHOT... FINISH HIM! |
| long / running / quick | LONG SHOT! CALL THE PAPER! / RUNNING SHOT! / QUICK DRAW! |
| multi | DOUBLE! / TRIPLE! THE CROWD GOES MILD! |
| miss | MISSED HIM CLEAN! / THAT'S A LOT OF DIRT YOU KILLED! / BARK'S DEAD, BUCK AIN'T! |
| pump / reload | PUMP IT! / RELOAD, HOSS! |
| doe | DOE! YOU'RE OUT! / THAT'S A DOE! HOLSTER UP! / AW, NOT MAMA! / A FAWN?! GO SIT IN THE TRUCK! |
| protected | OH, THE STINK! / THAT'S BESSIE!! / THAT'S THE NATIONAL BIRD, BUDDY! / NOT THE LOON! |
| escape / lost | HE'S GETTIN' AWAY! / GONE LIKE A RUMOR! / WOUNDED AND LOST... |
| trophy | TROPHY SPOTTED! / THAT'S OLD IRON RACK! / THE DUKE! / HERE COMES BIG MO! / TROPHY BAGGED! / THE ONE THAT GOT AWAY... |
| end | SITE CLEAR! / TIME! / CLEAN SWEEP! |
| critters | CRITTER BONUS! / SQUIRREL! / TURKEY DINNER! |
| Dub (tips, quieter) | "Wait for him to clear that tree." / "Hold your breath. Steady as a church pew." / "Give him a grunt." |

### 6.10 Items and unlockables
There are no pickups or power-ups in play; the player's kit and the goals are:
- **The kit**: the pump rifle (5-round tube), the scope, and a call per hunt (a grunt tube at Hollow Creek, a bugle at
  Bugle Ridge, a moose call at Muskeg Lake), introduced by Dub in each hunt's briefing with its glyph.
- **Special targets** that play the power-up role: the golden crow, the golden clay, the Snowmoose's hat; quick-draw,
  long-shot and multi-kill bonuses.
- **Unlockables kept in the Lodge**: the three trophy mounts, each hunt's best-buck plaque, stars per site (27 in all),
  the Range badge, the Hunt-Off champion plaque (first place in the campaign), high-score entries with initials.
- Everything is playable from the start (no locked hunts): the demo must show all of it.

---

## 7. Build order and milestones

Build the spine first, one hunt to a full vertical slice, then widen. Each milestone ends with its tests passing
(`node tests/run.mjs`) and, where it says so, screenshots looked at.

| # | Milestone | Delivers | Done when |
|---|---|---|---|
| M0 | Setup | dev folder, engine and hub copies, manifest, build script, dev page, test runner and headless loader, `game.debug` stub with snapshot | `node tests/run.mjs` runs (one smoke test); the bundle opens from `file://` with no errors |
| M1 | Gallery on a flat floor | E.Lens, Vista with flat terrain, Backdrop sky, billboards with impostors (library trees and rocks), static deer silhouettes, P1 reticle (mouse and pad), fire with analytic sphere hits, a minimal HUD | shooting a silhouette works by mouse and pad; lens tests pass; screenshot looks like a pixel landscape |
| M2 | The deer | E.Quadruped whitetail (skeleton, 4 gaits, poses, antlers, outline, LOD, zones, x-ray, mount), Animal Lab | quadruped tests pass; filmstrips of every gait and the death look right |
| M3 | The land | E.Heightfield (base, features, water, ground types, light bake, scatter, occluders), terrain raster with occlusion, water, fog and mist, Hollow Creek map, custom props (corn, reeds, tall grass, birch, barn, stand, blind) | terrain and occlusion tests pass; Hollow's three vantages screenshot well; animals hide behind crests |
| M4 | Shooting for real | rifle (pump, tube, reload), scope lens with sway and breath, call, aim assist, full shot resolution with zones, occluders, terrain and water, impacts and particles, scoring v1, banners and pops | weapon, aim, shot and score tests pass; pick-agreement check at 95% |
| M5 | Living animals and sites | actors, orders, paths on terrain, herds, spooking, calls, wounds, death, patterns, the site runtime and director, Hollow sites 1-3, the tally and Shot Chart, walk-ins | ai and site flow tests pass; a person can play Hollow Creek's three sites start to finish |
| M6 | Vertical slice | Old Iron Rack and the Trophy Cam, the bonus framework and Crow Patrol, hunt results with E.Arcade initials and ranks, records, the Lodge v1, story beats with portraits | the Hollow hunt plays from its card to its results; the slice playthrough test passes |
| M7 | Sound and voice | songs, layers and stings, ambience beds, every sfx, gunshot echoes, E.Babble voices, barks and captions, the Sound Lab | every sound plays in the Sound Lab; barks fit on screen; headless runs stay silent |
| M8 | Front end | title with logo and live vista, main menu and pages (UIKit), the Shell theme and help, settings, glyph prompts (PS default, Xbox option, KB+M), difficulty, the touch-only gate, the Practice Range | prompts, touch and menu flow tests pass; menus work with pad, keys and mouse hover |
| M9 | Party | up to 4 local players: joining, colours and shapes, per-player rifles and HUD panels, benching, shared kills, the director-only camera, party tallies and podium, Quick Draw | party flow tests pass; two pads and a mouse play a hunt together |
| M10 | Bugle Ridge and Muskeg Lake | elk and moose presets, canid and cow, the two maps, six sites, The Duke and Big Mo, Saucer Season and Snowball Standoff, all critters, the Hunt-Off campaign with rivals, autosave and ceremony | site tests pass for all 9 sites; the campaign playthrough test passes |
| M11 | Attract and dev mode | the idle timer, the attract playlist and HunterBot, dev mode (Shell rows, sliders, reset, tools, overlays, free camera), deep links | attract and dev tests pass |
| M12 | AI Hub | session flow, own card, the Hub Hunt-Off timeline, ghosts, reporting, end handling; the bundle with the session client first | hub stub tests pass; the harness passes with 2 players, with 4 players at latency 150, jitter 50, loss 5, and with `scenario=host-leave` |
| M13 | Polish and balance | bot balance runs and tuning (pars, rivals, speeds, windows), look passes on every vantage (palettes, fog, props, lights), animation passes, About & Credits with the reports, `exit-interview.json`, final full test run | Definition of done (section 10) holds |

Keep the game playable from M1 on; keep the full test command green after every milestone.

---

## 8. Risks and how to de-risk them

| Risk | Why it matters | De-risk |
|---|---|---|
| **The custom renderer** (column terrain, occlusion of billboards, scope second pass) is slow or wrong | everything is seen through it | M1 ships it with a flat floor behind the final interfaces; M3 adds heights with unit tests for breakpoints and `occY` against brute force; screenshots per vantage. Fallback if hills fail: keep the flat floor and fake relief with Backdrop hill layers and big "ridge" billboards; the game logic doesn't change. Performance is out of scope, but keep it playable: typed arrays, no allocation per pixel, impostors, skip billboards fully hidden |
| **Animals don't read** (deer at a distance look like blobs; bucks vs does unclear) | the core skill is telling bucks from does | the Animal Lab and filmstrips in M2; strong silhouettes, outlines, antlers always drawn with the readability boost, LOD that never drops antlers; screenshots at 20, 60, 120 and 200 m; the Antler glint assist |
| **Hits don't match what you see** | unfair misses kill a shooting game | zones are built from the same joints that are drawn; dev overlay shows volumes and rays; the pick-agreement browser check (95%) every run |
| **Gaits slide or pop** | broken animation ruins the look | hoof locking, a planted-hoof test, filmstrips per gait; tune speeds to strides |
| **Hub ghost sync** (copies drift apart, spawns differ, protocol misses) | the hub drops games that fail its check | timeline keyed to `AIHub.time()`; cameras scripted; spawn RNG separate from cosmetics; a headless hub stub test; the real harness in M12 with latency and loss; build-time check of the client and metas |
| **Input breadth** (mouse absolute vs stick velocity, up to 4 players, prompts by device, glyph defaults, menus by hover) | 10-foot and KB+M must both feel native | one InputRouter per player tested headless with `input.press`, `input.feed` and pad codes; the Range teaches every control with live glyphs |
| **Audio that sounds cheap** | gunshots and calls sell the fantasy | layered voices with echoes; the Sound Lab for quick iteration; volume balance pass in M13 |
| **Content volume** (9 sites, 3 trophies, 3 bonus games, range) | time | data-driven sites and patterns, one hunt fully done before the others, the dev free camera's bearing/distance readout for authoring, the bot for quick runs |
| **Engine assumptions** (overlay drawing bypasses engine lighting, particles, weather, camera; HTML shell over the canvas) | surprises late | own fx, weather and grade from M1; check that the pause menu, settings and corner draw over our overlay in M1 |
| **Bundle mistakes** (client not first or edited, missing metas, network calls) | hub rejection, broken file | build-time assertions (3.5); tests run against the bundle as well as the dev page |
| **Touch-only false positives** (touch laptops) | blocks real players | needs coarse pointer and no fine pointer; cleared by any key, mouse or pad input |

---

## 9. Testing

### 9.1 One command
`node tests/run.mjs` runs every headless suite (unit and flow) in Node with the engine headless (`new E.Game()` has no
DOM there; `game.advance(seconds)` runs exact 1/120 s steps; `input.tap`, `hold`, `press`, `feed` drive it;
`game.debug.snapshot()` reads it). It prints **only failures** and one line: `214 passed, 0 failed (41.2 s)`; exit code 1
on any failure. `node tests/run.mjs <filter>` runs matching suites only: rerun a suite only after changing the code it
covers. Flags: `--browser` adds the Playwright checks (9.3), `--hub` the harness (9.4), `--balance` the bot statistics
(9.5, prints a table; not pass/fail). Do not use subagents or workflows to debate, review, judge or audit; the tests and
your own looks at screenshots decide.

The loader (`tests/lib/load.mjs`) builds a `vm` context with stand-ins (`window`, `addEventListener`, `location` with
a hash, `matchMedia`, `navigator`, optional `AIHub` stub), loads `engine/my-3d2dge.js`, the new modules, the asset set
and `src/*.js` in manifest order, and returns `{ E, game, D: game.debug, step, tap, hold, press, feed, until }`. A
second loader extracts the scripts from the built HTML so the bundle itself is smoke-tested.

### 9.2 Suites (headless)
- **unit/lens, unit/terrain, unit/vista, unit/quadruped, unit/ai, unit/weapon, unit/aim, unit/shot, unit/score,
  unit/prompts**: as listed in each system above.
- **unit/lint**: no `Math.random` in `src/` or the new modules; no TODO-like markers or placeholder text; every registered site,
  trophy, bonus, critter, beat and bark id referenced exists; every bark and caption fits the screen at its scale.
- **flow/sites**: every site at seeds 1-3 with the cheat bot (clean sweep, early end) and with no shots (time out,
  escapes); doe benching; protected critter penalties.
- **flow/playthrough** (the scripted playthrough of the whole game): title -> PRESS START -> menu -> HUNT-OFF ->
  for each hunt: intro dialog skipped -> 3 sites with the average bot -> tallies -> trophy (cheat bot bags it; Trophy
  Cam runs and time scale returns to 1) -> bonus -> results with initials entered -> next hunt (autosave written) ->
  ceremony -> Lodge shows 3 trophy mounts -> About pages -> title. Checks at each step through the snapshot; no errors
  (`game.errors` empty); total under 30 simulated minutes.
- **flow/modes**: Single Hunt for each hunt; Bonus Only for each game; Practice Range with scripted inputs completing
  every station; Party with 2 and 4 bots; Quick Draw.
- **flow/attract**: 10 s idle on the title starts the attract mode; it cycles through its playlist (snapshot shows each
  clip); a key, a mouse move, a pad button each return to the title.
- **flow/dev**: 5.22's checks.
- **flow/touch**: 5.25's checks.
- **flow/hub**: 5.26's checks with the stub.
- **flow/determinism**: the same seed and scripted inputs twice give the same `stateHash` after 60 s of a site; a run
  with extra cosmetic RNG draws gives the same spawn log.
- **flow/saves**: records, trophies and the Hunt-Off autosave survive a reload (stubbed `E.store`); CONTINUE resumes at
  the next hunt.

### 9.3 Browser checks (`--browser`, Playwright, Chromium from the cache, `TMPDIR` set)
- `tools/check.mjs` on the bundle and on deep links (`#title`, `#menu`, `#hunt/hollow/1`, `#hunt/bugle/2`,
  `#hunt/muskeg/3`, `#trophy/muskeg`, `#bonus/crow`, `#range`, `#lodge`, `#about`, `#attract`, `#party/2`,
  `#animallab`): no errors or warnings; screenshots saved to `tests/out/` (look at them: palettes, fog, readability,
  HUD at 10 feet).
- `--size 390x844@3` and a touch-only emulation: the title shows the message and the settings button.
- **browser/pick**: the pick-agreement check (5.9).
- **browser/glyphs**: a gamepad is emulated via `navigator.getGamepads` stub: prompts show PlayStation glyphs; after
  switching the setting, Xbox; mouse movement switches prompts to mouse icons.
- Filmstrips (`tools/filmstrip.mjs ... --seed 1`) of gaits, deaths, the Trophy Cam and banners: review by eye; these
  are the only checks that need eyes.

### 9.4 AI Hub harness (`--hub`)
Copy `hub/harness.html`, `bridge.js`, `round.js` next to a copy of the bundle in `tests/out/hub/`; start
`python3 -m http.server 0 --bind 127.0.0.1` there (record the PID and port); open
`harness.html?game=<bundle>&players=2&auto=1` in Playwright; confirm the frames' title is "Big Buck Hunt-Off"; wait for
`document.body.dataset.complete === 'true'`; require `window.__hubCheck.pass === true`; print failing checks. Repeat
with `&players=4&latency=150&jitter=50&loss=5&auto=1` and with `&scenario=host-leave`. Stop the server by its PID.

### 9.5 Balance (`--balance`)
Runs each site 20 times per bot skill (novice, average, expert) at different seeds and prints, per site: mean score,
bucks bagged %, does shot, time used, accuracy. Targets: average bot bags 70-85% of bucks and scores near par; novice
40-60%; expert above 95% with a clean sweep at least half the time. Set the hunts' par and the rivals' scores from
these numbers.

---

## 10. Definition of done (from TASK.md)
- [ ] `BigBuckHuntOff-BigBuckHunterPro-claude-opus-5-5-max-20261103-174813.html` in the work root runs from `file://`,
      single file, no network; dev files in the subfolder.
- [ ] Every system in section 5 and all content in section 6 present; no TODOs, placeholders or stubs.
- [ ] Engine native style (pixel art, E.tones shading, outlines, pixel font) and native animation (Humanoid, Blob,
      and our procedural Quadruped in the same spirit); new art for animals, antlers and hunting props.
- [ ] All music, sound and voices synthesized in code; gibberish voices.
- [ ] Controller-first 10-foot UI; KB+M native (mouse aims and clicks, hover focuses); prompts follow the last device;
      PlayStation glyphs by default with an Xbox option; no dense web screens.
- [ ] Touch-only: no touch controls, "Controller or keyboard required", the settings button, the attract mode runs.
- [ ] Attract mode after 10 s idle on title and menus; any input exits.
- [ ] Dev mode from the pause menu with live sliders (Appendix A), reset to defaults, and the tools.
- [ ] Local 1-4 players; AI Hub ghost mode passing the harness (2 players; 4 with latency and loss; host leaving).
- [ ] `node tests/run.mjs` green, with the full scripted playthrough; browser checks and screenshots reviewed.
- [ ] About & Credits screen, the chat reply and `exit-interview.json` (parses as JSON) carry Source Information,
      Testing, Engine and Prompt Feedback (Appendix E).

---

## Appendix A. Dev sliders (defaults)

| Key (`dev.*`) | Default | Range | What |
|---|---|---|---|
| animalSpeed | 1.0 | 0.25-2 | all animal speeds |
| spook | 1.0 | 0-2 | fear from gunshots and impacts |
| doeShare | 1.0 | 0-2 | how many does and fawns spawns include |
| spawnRate | 1.0 | 0.5-2 | time between spawn waves |
| siteTime | 1.0 | 0.3-3 | site time limits (x) |
| reticleSpeed | 400 | 150-900 | pad reticle px/s |
| assist | 0.65 | 0-1 | aim-assist friction factor (1 = none) |
| rounds | 5 | 1-10 | rounds in a full tube |
| rackTime | 0.22 | 0-0.6 | pump time (s) |
| reloadTime | 1.25 | 0.2-3 | empty-tube reload (s) |
| scopeMag | 3.5 | 1.5-6 | scope magnification |
| sway | 2.6 | 0-6 | scope sway amplitude (px) |
| breath | 3.0 | 1-6 | hold-breath seconds |
| calls | 2 | 0-5 | calls per site |
| callFreeze | 1.4 | 0-4 | seconds animals stop on a call |
| distanceSlope | 75 | 25-200 | metres per +1 distance multiplier |
| heartMult / headMult / lungMult | 2.0 / 1.8 / 1.6 | 0.5-4 | zone multipliers |
| runningMult | 1.25 | 1-2 | running-shot multiplier |
| antlerBoost | 1.15 | 1-2 | antler drawing scale |
| animalScale | 1.1 | 0.8-1.5 | arcade size boost for every animal (drawing and hit zones together) |
| fog | 1.0 | 0-2 | fog density (look) |
| timeOfDay | 0 | -1..1 | shifts the sun and grade (look) |
| timeScale | 1.0 | 0.1-2 | game speed |

## Appendix B. Data shapes

```js
def('hunt', 'hollow', { name: 'Hollow Creek', species: 'whitetail', seed: 1101, palette: 'autumn-morning',
  sun: { bearing: 95, elevation: 12, color: '#ffd8a0', ambient: '#6a7a9a' }, fog: { color: '#cdd6e0', near: 160, far: 900, mistTop: 6 },
  backdrop: { sky: ['#8fb4e0', '#f0c8a0'], layers: [/* E.Backdrop layers */] }, weather: { kind: 'leaves', amount: .3 },
  terrain: { base: { amp: 22, scale: 280, octaves: 5, warp: 45 }, features: [/* 5.2 */] },
  scatter: [{ props: [['oak', .4], ['maple', .3], ['birch', .3]], spacing: 7, where: 'forest' }, /* ... */],
  vantages: { creekStand: { at: [604, 556], eye: 4.5, yaw: 12, kind: 'treestand' }, /* ... */ },
  trails: [['creekStand', 'fieldBlind', [[604, 556], [700, 610], [760, 640]]], /* ... */],
  sites: ['hollow-1', 'hollow-2', 'hollow-3'], trophy: 'iron-rack', bonus: 'crow-patrol', par: 6000,
  rivals: { earl: 3300, loretta: 5100, dwayne: 6000 }, ambience: 'hollow', voiceHost: 'granny' });
def('species', 'whitetail', { rig: 'deer', size: 1, speeds: [1.3, 3.4, 8.5], hp: 1, temper: .35, targets: ['buck'],
  protected: ['doe', 'fawn'], antlers: { kind: 'typical', points: [4, 12] }, base: p => 100 + 15 * p, call: 'grunt' });
def('critter', 'skunk', { rig: 'blob', look: {...}, behavior: 'waddle', points: -100, protected: true, effect: 'stink' });
def('bonus', 'crow-patrol', { hunt: 'hollow', vantage: 'porch', time: 30, tube: 10, rack: .15, host: 'granny',
  timeline: function* (B) { /* spawns targets on arcs */ }, targets: { crow: 100, golden: 500, hank: -250 } });
def('beat', 'iron-rack-legend', { lines: [['dub', 'Old Iron Rack. Fourteen points.', { pose: 'kneel' }], /* ... */] });
def('bark', 'doe', { lines: ["DOE! YOU'RE OUT!", "THAT'S A DOE! HOLSTER UP!", 'AW, NOT MAMA!'], priority: 3 });
```

## Appendix C. Engine changes (keep this list; it goes in the Engine Feedback)
1. **New modules** `vista.js` (E.Lens, E.Heightfield, E.Vista, E.Impostors), `quadruped.js` (E.Quadruped,
   E.Antlers), `babble.js` (E.Babble): general systems with engine-style headers (manual, API, rules), loaded after
   the full engine. Why: the engine's floor views are flat and orthographic, Mode 7 is a flat floor, and it has no
   four-legged rig or voice synth.
2. **Default button symbols**: `STANDARD_SETTINGS.glyphs.value = 'playstation'` (TASK.md asks for PlayStation glyphs by
   default; the Xbox option stays in the same setting).
3. **E.Shell**: custom screens accept `rows: [settingKeys]` (render `_row(k)` for each), and settings specs accept
   `hidden: true` (left out of the standard Settings screen), for the dev mode's tuning rows.
4. **Audio**: `audio.bus('sfx' | 'music')` returns the bus node for custom Web Audio graphs (Babble voices), and
   `audio.echo({ delay, feedback, mix })` adds an echo send used by gunshots. Both headless-safe (null without a
   context).
5. Optional: wheel steps as bindable codes (`WheelDown`, `WheelUp`) so pump-on-wheel shows on the Controls screen.

## Appendix D. `game.debug` and the snapshot

```js
game.debug = {
  snapshot() { return { scene, segment, mode, hunt, site, siteTime, attract, devOpen, paused: game.paused,
    players: [{ n, device, score, rounds, chambered, benched, scoped, breath, calls, reticle: [x, y] }],
    actors: [{ id, kind, sex, state, x, y, z, hp, wounded, bagger, visible }], bucksLeft, results, stars,
    trophy: { seen, bagged }, cam: { yaw, pitch, fov }, hub: { active, phase, progressSent, resultSent, ghosts },
    records: { trophies, best }, errors: game.errors.length }; },
  aimAt(p, actorId, zone = 'heart') {}, fire(p) {}, pump(p) {}, scope(p, on) {}, breath(p, on) {}, call(p) {},
  goto(huntId, segment) {}, spawn(kind, opts) {}, skip() {}, bagAll() {}, bot(on, { skill, cheat }) {}, seed(n) {},
  tuning(key, value) {}
};
```

## Appendix E. The reports: Source Information, feedback, the exit interview

TASK.md requires Source Information, Testing Feedback, Engine Feedback and Prompt Feedback in the final chat reply and
on the in-game About & Credits screen (5.27), and `exit-interview.json` in the work root beside the HTML. Every value is
either confirmed or "unknown". The builders check every row below against what actually happened and update it; the
values here are what is known at planning time.

### E.1 Source Information

| Field | Value at planning time | Builders |
|---|---|---|
| Date | 2026-11-03 17:48:13 | keep (TASK.md's) |
| Source | Big Buck Hunter Pro (arcade, 2006; designed by Play Mechanix, made and distributed by Raw Thrills): confirmed (1.1) | keep |
| Plan | PLAN.md (the planning stage itself had no plan: "none") | keep "PLAN.md" |
| Genre and Perspective | genre and perspective as in section 0 | update if anything changed |
| Tech | my-3D2dge v0.85.2 handoff (full engine) with new modules `vista.js`, `quadruped.js`, `babble.js`; vanilla JavaScript, Canvas 2D, Web Audio; AI Hub session client 1.4.0; tests on Node 24 (headless `vm`) and Playwright 1.63.0 with Chromium | update to the versions actually used |
| Art Direction | the engine's native pixel style at 480 x 270; new procedural animals, antlers, hunting props; library trees, rocks, generic props | confirm |
| Animation | engine-native procedural rigs: E.Humanoid (people), E.Blob (critters), new E.Quadruped (four-legged animals) | confirm |
| Audio | all synthesized in code: chiptune songs, layered sfx with echoes, ambience, gibberish voices | confirm |
| Online | AI Hub Session Protocol v1, ghost mode, 1-4 players | confirm, and say whether the harness passed |
| Testing | allowed: as TASK.md's Testing paragraph (unlimited headless tests, one command, scripted playthrough, screenshots only where scripts can't check, no subagent reviews); run so far: none (nothing is built yet) | replace "run so far" with what ran and its results |
| Research | planning: Wikipedia, the Highway Games listing and Macworld's review read directly; Giant Bomb, TV Tropes, MobyGames and the Sinden wiki refused the fetch (403), a retailer page was rate-limited (429): search summaries only; engine handoff and AI Hub docs | add the builders' own research, or keep as is |
| Environment | Claude Code CLI (headless); Linux (WSL2); browser unknown | name the browser if one was used (Playwright Chromium for checks) |
| Model | planning: Anthropic, claude-opus-5-5, reasoning effort max | the builders' own model and effort |
| Usage | unknown (no estimate is available at planning time) | an estimate if one is available, else "unknown" |

### E.2 Feedback
The builders answer TASK.md's questions from their own build, in order: Testing Feedback (how many issues testing
caught; how many were critical or game-breaking; the most helpful test; the least helpful test), Engine Feedback (what
they liked most; where they got stuck or guessed wrong; the most important thing they built themselves; the hardest
part of using the engine; what they changed in the engine and why: start from Appendix C; the one thing they'd change),
Prompt Feedback (what they liked most; what was confusing; the hardest thing; what they'd change). At planning time
every one of these is "unknown": nothing has been built or tested.

### E.3 exit-interview.json
Exactly TASK.md's shape. Here it is filled with the planning-time values (it parses as JSON); the builders replace each
"unknown" they can confirm (model, usage, the feedback answers) and update the other values to what actually shipped,
then save it in the work root beside the HTML and check it parses:
`node -e "JSON.parse(require('fs').readFileSync('exit-interview.json', 'utf8'))"`.

```json
{
  "sourceInformation": {
    "date": "2026-11-03 17:48:13",
    "source": "Big Buck Hunter Pro (arcade, 2006; designed by Play Mechanix, made and distributed by Raw Thrills)",
    "plan": "PLAN.md",
    "genre": "Arcade light-gun hunting shooter (a shooting gallery in a living landscape) with party versus and bonus mini-games",
    "perspective": "First person on rails: a fixed vantage per site with scripted pans over a pseudo-3D heightfield landscape; a slow-motion bullet cam on trophy kills; side-on x-ray Shot Charts; 2D menus and Lodge",
    "tech": "my-3D2dge v0.85.2 handoff package (full engine) with new modules vista.js, quadruped.js and babble.js; vanilla JavaScript, Canvas 2D and Web Audio; AI Hub session client 1.4.0; Node 24 headless tests; Playwright 1.63.0 with Chromium",
    "artDirection": "The engine's native retro-modern pixel style (PS1/N64-era 2D) at 480x270, with new procedural animals, antlers and hunting props, and library trees, rocks and generic props",
    "animation": "The engine's native procedural rigs posed by math every step: E.Humanoid for people, E.Blob for small critters, and a new procedural E.Quadruped for deer, elk, moose, canids and the cow; engine tweens and scripts for UI and camera",
    "audio": "All synthesized in code: bluegrass chiptune songs on the engine synth, layered sound effects with valley echoes, ambience beds, Animalese-style gibberish voices",
    "online": "AI Hub Session Protocol v1 in ghost mode for 1-4 players: the game's own card, a timed 3-minute round, ghost reticles and shots, progress and result reporting",
    "testing": "Allowed: unlimited headless testing with the engine's game.advance and game.debug, including a scripted playthrough of the whole game, behind one command that prints only failures and a one-line count, rerun only after changing covered code; screenshots only for what scripts can't check; no subagents or workflows to debate, review, judge or audit",
    "research": "Planning stage (2026-11-03): read directly: Wikipedia 'Big Buck Hunter', the Highway Games listing for the Big Buck Hunter Pro cabinet, Macworld's review of the iPhone port; Giant Bomb, TV Tropes, MobyGames and the Sinden wiki refused the fetch (HTTP 403) and a retailer page was rate-limited (HTTP 429), so only search summaries were seen for them; plus the my-3D2dge v0.85.2 handoff docs and the AI Hub Session Protocol v1 docs",
    "environment": "Claude Code CLI (headless); Linux; browser unknown",
    "model": "unknown",
    "usage": "unknown"
  },
  "testingFeedback": [
    "unknown",
    "unknown",
    "unknown",
    "unknown"
  ],
  "engineFeedback": [
    "unknown",
    "unknown",
    "unknown",
    "unknown",
    "unknown",
    "unknown"
  ],
  "promptFeedback": [
    "unknown",
    "unknown",
    "unknown",
    "unknown"
  ],
  "aiHub": {
    "name": "Big Buck Hunt-Off",
    "tagline": "Bucks only. Bragging rights forever.",
    "description": "An arcade light-gun hunting shooter in living pixel landscapes: bag the bucks, spare the does, and win the Hunt-Off alone, on the couch or online.",
    "type": "Game",
    "genre": "Shooter",
    "source": "Big Buck Hunter Pro",
    "series": "Big Buck Hunter",
    "players": "1–4",
    "controls": "Aim: mouse or left stick · Shoot: left click or R2 · Pump: R or Square · Scope: right click or L2 · Call: Q or Triangle",
    "tags": [
      "first-person",
      "arcade",
      "pixel art",
      "versus",
      "comedy",
      "retro"
    ]
  }
}
```

## Appendix F. Research sources
Read directly:
- Big Buck Hunter, Wikipedia: https://en.wikipedia.org/wiki/Big_Buck_Hunter
- Big Buck Hunter Pro arcade machine, Highway Games: https://www.highwaygames.com/arcade-machines/big-buck-hunter-pro-arcade-machine-9210/
- Big Buck Hunter Pro (iPhone) review, Macworld: https://www.macworld.com/article/1144021/bigbuckhunterreview.html

Search summaries only (the pages refused the fetch or rate-limited it):
- Giant Bomb: https://www.giantbomb.com/games/3030-22443/
- MobyGames: https://www.mobygames.com/game/wii/big-buck-hunter-pro
- TV Tropes: https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/BigBuckHunter
- Sinden wiki: https://www.sindenwiki.org/wiki/Big_Buck_Hunter_Pro
- MPA Amusement listing: https://mpamusement.com/collections/video-games/products/big-buck-hunter-pro-arcade-shooting-game
- Big Buck Hunter Reloaded change log: https://docs.google.com/document/d/1fqWR3bvlkIrAa-nVDMO4MPC2EuG-U5Sm9P8Pve_QNMk/mobilebasic

Engine and online docs: the my-3D2dge handoff v0.85.2 (`README.md`, `API.md`, `AI_GUIDE.md`, `API-INDEX.md`, module
headers, kits) and the AI Hub Session Protocol v1 (`lib/hub/README.md`, `examples/ghost.html`, `harness.html`).
