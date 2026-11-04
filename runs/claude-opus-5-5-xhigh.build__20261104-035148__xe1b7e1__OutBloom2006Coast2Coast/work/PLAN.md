# OutBloom 2006: Coast 2 Coast

> *One day. One road. Every flower in bloom.*

This is the build plan for a feature-complete demo inspired by **OutRun 2006: Coast 2 Coast**. Read it together with
`TASK.md`; where the two seem to disagree, `TASK.md` wins and this plan bends.

**Title.** It was picked the way `TASK.md` asks: fifty playful riffs on the source's name were brainstormed silently,
then Python's `secrets.randbelow(50)` drew #49, **OutBloom 2006: Coast 2 Coast**. The title is final, so don't re-roll it.
"Bloom" carries three meanings and the whole design leans on them: flowers (the world), love in bloom (the passenger),
and the over-bright 2000s *bloom lighting* the source era is remembered for (the look).

**The pitch.** An arcade road racer on the engine's pixel-art pseudo-3D road. You drive an open-top dream car, with a
demanding passenger beside you, across the island of **Bellafiore** in a single day. You start on the Alba Coast at
sunrise and race to the Vespera Coast before the sun sets. A run is five one-minute stages. At every checkpoint the road
forks, so you choose your own route: 15 stages, 16 routes and 5 goals, each goal with its own ending. A clock counts down
the whole way, and traffic, drifts, slipstreams and your passenger's whims fill the minutes in between.

---

## Contents

1. Quick facts
2. What makes the source distinctive, and how OutBloom plays it
3. Originality rules
4. Deliverables, folders and setup
5. Architecture
6. Engine changes
7. Systems (the full spec of every mechanic)
8. Content (world, stages, goals, cars, cast, traffic, requests, missions, unlocks, music, writing)
9. Art direction and asset recipes
10. Build order and milestones
11. Risks and how to de-risk them
12. Testing
13. Definition of done: every TASK.md requirement and where it lives
- Appendices: A. tuning defaults (the dev sliders) · B. input map · C. glyphs · D. the debug handle and events · E. research notes

---

## 1. Quick facts

| | |
|---|---|
| Genre | Arcade road racing: an OutRun-style checkpoint racer. A passenger-request "date" layer (*Love in Bloom*) and a mission career (*Coast 2 Coast Tour*) sit on top. |
| Perspective | Third-person chase camera behind the car, on a sprite-scaled pseudo-3D road (the engine's `road` module). Also a high chase and a bumper camera. Side-view vignettes for the start line, endings and the garage, and a stylised overhead map for the career. |
| Players | 1 in every mode. 2 on one machine, split screen (*Versus*). 1–4 online in AI Hub *ghost* sessions. |
| Engine | my-3D2dge **v0.85.2** handoff package (`dist/handoff`, commit `4390a98`), the full engine with every module, changed as listed in §6. |
| Look | Engine-native pixel art at 480×270 (`expand: true`), with a pixel-safe bloom pass, lens flare and dithered fog. |
| Audio | Everything is synthesised in code with the engine's chip synth, extended with instruments and effects (§6, §7.14–7.16). Voices are syllable-synth gibberish. |
| Deliverable | One self-contained HTML file in this folder's root, plus `exit-interview.json` beside it. |

**Names.** Take the model/effort/timestamp part from *your* `TASK.md`. With this `TASK.md` the names are:

- GameTitle slug: `OutBloom2006Coast2Coast`. SOURCE slug: `OutRun2006Coast2Coast` (spaces and punctuation removed, words joined).
- Dev folder: `OutBloom2006Coast2Coast-OutRun2006Coast2Coast-claude-opus-5-5-max-20261103-174755/`
- Bundle: `OutBloom2006Coast2Coast-OutRun2006Coast2Coast-claude-opus-5-5-max-20261103-174755.html`, in the root, beside `TASK.md`.
- Exit interview: `exit-interview.json`, in the root.
- The title on screen and in `aiHub.name` reads exactly **OutBloom 2006: Coast 2 Coast**.

---

## 2. What makes the source distinctive, and how OutBloom plays it

| Source DNA | OutBloom mechanic | Where |
|---|---|---|
| Sun-drenched scenery that changes every minute (beaches, cities, mountains, canyons) | 15 hand-designed stages from 13 biome kits. Time of day runs from dawn to night as the trip goes west. The bloom lighting makes the sun and the sea glare. | §7.2, §8.2 |
| A branching route: choose a road at each checkpoint, with several goals | A five-row pyramid of stages. The road physically forks into two (a new renderer feature). Each goal has its own ending in three moods. | §7.1, §8.2–8.3 |
| Racing the clock, with checkpoints that extend the time | The **daylight clock**: a countdown, extended at each checkpoint gate. When it runs out, "the sun sets" and the run ends. | §7.6 |
| Weaving through civilian traffic | Lane traffic of 11 vehicle types with lane changes. Near misses and overtakes score. | §7.4 |
| The power slide: tap the brake while turning to drift at full speed | The drift model: a brake tap (classic), a quick down-up shift (manual), or the Drift button. Its angle, counter-steer and score are all modelled. | §7.3 |
| Slipstreaming the car ahead | Slipstream builds behind any vehicle and gives a slingshot when you pull out. | §7.3 |
| The passenger and her on-the-fly requests (Heart Attack) | **Love in Bloom**: three original passengers with 14 request types. You earn **petals**, which give a grade (E to AAA "Full Bloom"), and the grade sets the ending's mood. | §7.7, §8.7 |
| The Coast 2 Coast career: missions from characters, miles, unlocks | The **Coast 2 Coast Tour**: 14 postcard missions from four characters, with drift duels, draft dashes, a knockout and a rival-couple duel. You earn **seeds** and plant them in the **Garage Garden** to unlock cars, songs, colours and outfits. | §7.8–7.9, §8.8–8.9 |
| Choosing the song on the car radio before the race | A radio dial with 5 stations of original songs (plus 2 to unlock), switchable during the race. | §7.14, §8.10 |
| Dream cars from one famous marque | Five original open-top cars from the fictional marque **Fioretti**, from a 1962 roadster to a 2026 hypercar. | §8.4 |
| The flag-waving starter at the start line | **Bruno Brezza**, a retired rally champion who waves his sunflower flag at every start and gives the racing missions. | §8.5 |
| Time attack, online racing | Time Trial with ghosts, local split-screen Versus, and AI Hub ghost-mode online races. | §7.10–7.12 |
| Tone: carefree, romantic, cheesy, sunny | Short, peppy, cheeky lines, big friendly banners, and endings that are comic and romantic. | §8.11 |

The core loop, which goes at the top of `src/00-core.js`: **drive fast through a minute of beautiful road, read the bend
and drift it, thread the traffic, please your passenger, pick a fork, beat the clock to the next checkpoint, and do it
five times to reach the coast.**

---

## 3. Originality rules

`TASK.md` forbids recreating the source. Hold to these:

- **No real brands.** No Ferrari or any real maker, model, badge or prancing horse. Every car is a Fioretti, designed
  here (§8.4).
- **No source characters.** No characters or names from the source. The cast is original (§8.5), and there is no
  "Flagman": Bruno is our own character.
- **No source places or layouts.** No source stage names or layouts, and no copied course order. Bellafiore and its 15
  stages are ours (§8.2).
- **No source music.** No melodies, quotes or remixes of the series' songs. Every song is composed fresh in the styles
  the series is known for (Latin fusion, Balearic pop-funk, shuffle, Eurobeat, city pop) (§8.10).
- **No copied UI.** No source logo, HUD layout or typography. Our HUD and menus are designed here (§7.17–7.18).
- **Our own mode names.** *Love in Bloom* (not "Heart Attack"), *Coast 2 Coast Tour*, *Seeds* and the *Garage Garden*
  (not "miles"). The checkpoint banner reads **TIME EXTENDED!**, not the series' phrase.
- **Reinterpreted mission types.** Mission types are new versions with their own names and rules: Drift Duel, Draft
  Dash, Last One Wilts, Heartbreakers (§8.8).
- **About screen disclaimer.** The About screen says: "An original homage. Not affiliated with or endorsed by SEGA or
  Sumo Digital."

---

## 4. Deliverables, folders and setup

### 4.1 Working rules (from TASK.md, made concrete)

- **Stay in your folders.** Work only inside this folder and the dev folder. Other agents share this machine and the
  parent directories, so don't read other runs' folders.
- **Mind the disk.** `/tmp` on this machine is a small, nearly full tmpfs. Keep clones, caches and screenshots inside
  the dev folder (for example `dev/.cache/`), never in `/tmp`.
- **Get only what you need.** Fetch the engine with a shallow clone into the dev folder, then copy `dist/handoff/*`:
  `git clone --depth 1 https://github.com/michaelcrosato/my-3d2dge.git .cache/my-3d2dge`. Pin to v0.85.2 (`4390a98`) and
  note any newer version you take.
- **Don't clone the AI Hub repo** (it is over 5 GB). Download only these four files with `curl -fsSL` from
  `https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/`: `session.js` (the client, pasted verbatim),
  `harness.html`, `bridge.js` and `round.js` (the last three are for the conformance test only).
- **Servers.** Use a server only for the hub harness. Bind 127.0.0.1 on an OS-picked port
  (`python3 -m http.server 0 --bind 127.0.0.1`), read the port it prints, and confirm the page title is ours before
  trusting a result. Stop it by the PID you started. Never use `pkill`, `killall` or `fuser -k`.
- **Prefer offline tools.** Use `file://` and the engine's headless tools for everything else.

### 4.2 Dev folder layout

```
OutBloom2006Coast2Coast-OutRun2006Coast2Coast-…/      (the dev folder)
  engine/                  copy of dist/handoff (engine, docs, tools, kits); my-3d2dge.js is CHANGED (see CHANGES.md)
  engine/CHANGES.md        every engine change: what and why (feeds the exit interview)
  vendor/aihub-session.js  AI Hub client 1.4.0, byte-for-byte as downloaded
  vendor/hub/              harness.html, bridge.js, round.js (tests only, never bundled)
  src/                     the game: plain scripts, one IIFE each, loaded in manifest order
  src/manifest.json        ordered list of src files (single source of truth for page, bundle and tests)
  index.html               dev page: loads the engine, then src files one by one (file:// works)
  build.mjs                writes the single-file bundle into the root
  tests/run.mjs            THE test command (§12)
  tests/suites/*.mjs       headless suites;  tests/browser/*.mjs  Playwright suites
  package.json             playwright 1.63.0 (as the handoff pins)
  .cache/                  clones, screenshots, filmstrips (git-ignored, never bundled)
```

### 4.3 The bundle (`node build.mjs`)

1. Start from the template in `index.html`. Put `<meta charset="utf-8">` first, then **the session client inline as the
   first script in `<head>`**, unmodified, as the hub requires.
2. Add the hub tags: `hub:session` = `1`, `hub:session-players` = `1-4`, `hub:session-mode` = `ghost`,
   `hub:session-goal` = "Fastest to the Flower Sprint goal wins", `hub:session-howto` = "Steer stick/←→ · gas
   R2/✕/W · brake L2/□/S · drift ○/Space", and `hub:session-minutes` = `4`. Add the catalogue tags too: `hub:type` =
   `Game` and `hub:players` = `1-4`.
3. Add `<title>OutBloom 2006: Coast 2 Coast</title>`, the viewport tag and the page CSS from the handoff template.
4. Put `E.bootSplash`-style markup at the start of `<body>` (our title, the sunset colours).
5. Inline `engine/my-3d2dge.js`, then every `src/` file in manifest order, each as its own `<script>`.
6. Write the file into the root, then lint it: no `TODO`/`TBD`/`FIXME`/`placeholder`/`lorem` (case-insensitive), no
   `fetch(`/`WebSocket`/`RTCPeerConnection`/`XMLHttpRequest`/`alert(`/`confirm(`/`prompt(`/`window.open` outside the
   verbatim session client, and no external URLs loaded. The bundle needs no network at all.

---

## 5. Architecture

### 5.1 Runtime shape

- **One game.** `new E.Game({ canvas: 'screen', res: [480, 270], expand: true, input: OB.INPUT, menu: {...}, id: 'outbloom2006' })`
  is created in `src/00-core.js` and exposed as `OB.game`.
- **One namespace.** Every file is `(() => { 'use strict'; const E = My3D2dge, OB = window.OB || (window.OB = {}); … })();`.
  Headless tests give the vm context a `window` (the context itself) and an `addEventListener` stand-in, as
  `kits/test.mjs` does.
- **Data is data.** Stages, cars, requests, missions, songs, lines and unlocks are plain objects in `src/01-data-*.js`,
  validated by the content-lint suite. Designers extend the game by editing these files; the dev tools (§7.23) are the
  in-game half of the "normal designer tools".
- **The sim is pure and deterministic.** `OB.Race` (with `CarSim`, `Traffic`, `Rivals`, `Requests` and `Rules`) runs on
  fixed `dt` steps from seeded streams. It knows nothing about drawing, and drawing only reads its state. Headless tests
  drive the sim through `game.advance` and `input.tap/hold`, exactly as a player would.
- **An event bus decouples everything.** `OB.bus.emit(name, data)` is the only channel from the sim to scoring, the
  passenger, audio, particles, the HUD and mission rules. Tests subscribe to it too, and the event list is Appendix D.
- **Randomness.** Gameplay never uses `Math.random`. Use `OB.rand.stream(label, seed)`, which is `E.rng`. In an AI Hub
  session the traffic stream is `AIHub.rng('traffic')`. Cosmetic effects use their own stream, so that toggling effects
  never changes a run.

### 5.2 Source files (`src/manifest.json` order)

| File | Owns | Key API |
|---|---|---|
| `00-core.js` | game creation, constants, units, `OB.bus`, `OB.rand`, `OB.tuning` (live) + `OB.TUNING_DEFAULTS`, env flags (`OB.env.hub`, `OB.env.touchOnly`, `OB.env.headless`) | `OB.tune(key)`, `OB.bus.on/off/emit`, `OB.rand.stream()` |
| `01-data-world.js` | biome kits, 15 stages, route graph, 5 goals, hub/versus routes, sky presets | `OB.STAGES`, `OB.GOALS`, `OB.KITS`, `OB.ROUTES` |
| `01-data-cars.js` | Fioretti cars, colours, traffic types | `OB.CARS`, `OB.PAINTS`, `OB.TRAFFIC` |
| `01-data-play.js` | request types, mission list, unlock beds, economy constants | `OB.REQUESTS`, `OB.MISSIONS`, `OB.BEDS` |
| `01-data-cast.js` | characters (rig specs, voice params, colours) and every line of text: barks, requests, reactions, endings, briefs, help, credits | `OB.CAST`, `OB.LINES`, `OB.line(key, vars)` |
| `01-data-music.js` | songs (radio, themes, jingles) as engine song objects with instrument tracks | `OB.SONGS`, `OB.STATIONS` |
| `01-data-about.js` | the About & Credits pages and the exit-interview answers (Source Information, the three feedback blocks, the `aiHub` block); `build.mjs` writes `exit-interview.json` from it | `OB.ABOUT` |
| `10-road.js` | `OB.World`: builds an `E.Road` per stage (junctions, strips, grounds), scenery placement from kit rules, landmark placement, roadside object lists, `OB.World.info(stage, z, x)` for physics | `world.stage(id)`, `world.junction(id)`, `info()` |
| `02-shapes.js` | every `E.SHAPES` entry the game adds (cars in three layers, traffic, landmarks, roadside sets, request objects), ids prefixed `ob-`; it assigns `E.SHAPES[...]` and nothing else, so `engine/tools/asset-sheet.mjs` can load it alone | `E.SHAPES['ob-car-orchidea-over']` |
| `11-art.js` | boot-time pre-rendering of the shapes into sprite banks, recolouring, string sprites, glyph and UI icons | `OB.Art.car(model, paint, yawIdx, layer)`, `OB.Art.sprite(id, variant)` |
| `12-cast.js` | Humanoid rigs (driver, passengers and outfits, Bruno, rivals, spectators), seated drawing in cars, portraits, poses per event | `OB.Cast.rig(id)`, `OB.Cast.drawOccupants(…)` |
| `13-fx.js` | screen-space particles (smoke, petals, sparks, dust, spray, confetti, fireworks, lanterns), pixel bloom, lens flare, heat shimmer, sun-shower, aurora, speed lines, skid marks | `OB.FX.emit()`, `OB.FX.post(g, sky, o)` |
| `20-car.js` | `OB.CarSim`: speed, gears, steering, curve push, drift, slipstream, off-road, rails, crests, collisions | `car.step(dt, intent, info)` |
| `21-traffic.js` | `OB.Traffic`: seeded spawn per stage, lanes, lane changes, junction branch choice, ribbon pairs, collisions with cars, near-miss and overtake detection, slipstream source | `traffic.step()`, `traffic.near()` |
| `22-drivers.js` | `OB.Brain`: the AI driver used by rivals, attract mode, tests and bots (racing line, curve speeds, traffic avoidance, drift use, request targeting, fork choice) | `brain.intent(state, world)` |
| `23-race.js` | `OB.Race`: a run from a `RaceConfig`; stages, clock, checkpoints, forks, goal, scoring and Bloom chain, ghosts (record/replay), rules hooks, per-player state (split screen) | `OB.Race.create(cfg)`, `race.step(dt)`, `race.snapshot()` |
| `24-requests.js` | Love in Bloom director: schedules, spawns request objects, evaluates, petals, fork preferences, grade | `OB.Requests.types[type]` |
| `25-missions.js` | the 14 mission rule sets, ranks and rewards | `OB.Rules[kind](cfg)` → hooks |
| `26-progress.js` | the save profile (versioned, migrated), seeds, garden, career, records, ghosts, endings seen | `OB.Profile.load/save`, `grant()`, `buy()` |
| `30-synth.js` | instrument presets on the extended engine audio, the effects bus, `OB.EngineSound` per car, tyre and wind loops, `OB.Ambience` per kit | `OB.Synth.inst(name)`, `engineSound.update()` |
| `31-voice.js` | `OB.Babble`: text → syllables → formant synthesis, moods, barks; the timing the speech bubbles type in | `OB.Babble.say(text, who, mood)` → duration |
| `32-radio.js` | stations, preview, in-race switching, bloom layer, ducking under speech | `OB.Radio.tune(i)` |
| `40-ui.js` | canvas 10-foot UI kit: screens, focus graph (spatial navigation), mouse hover and click, widgets (tile, carousel, toggle, slider, list, postcard, bed, dial), transitions, banners, toasts, glyph prompts, idle tracking | `OB.UI.screen(spec)`, `OB.UI.prompt(g, x, y, act, text)` |
| `41-hud.js` | the race HUD per viewport: clock, speedo, gear, score, Bloom chain, mini-map, passenger panel, request card, banners, hints | `OB.HUD.draw(r, player)` |
| `50-front.js` | scenes: `title`, `menu`, `garage` (car, paint, driver, passenger), `radio`, `howto`, `about` | |
| `51-race-scenes.js` | scenes: `race` (every mode), `startline` cutscene (inside race), `ending`, `results`, `gameover`, initials entry | |
| `52-career.js` | scenes: `tour` (map), `brief`, `debrief`, `garden` | |
| `53-modes.js` | scenes: `trial` (setup), `versus` (join + route), and the `race` split config | |
| `60-attract.js` | idle detection hook-up and the attract director (playlist, cheats, overlay, exit) | |
| `61-dev.js` | dev panel (tabs: Tuning, Cheats, Warp, Audio, Save, Info), debug overlay | `OB.Dev.open()` |
| `70-hub.js` | AI Hub session: detect, connect, own card, start sync, ghost send/receive, progress/result/time-up/end, session rules | |
| `71-touch.js` | touch-only detection and the "Controller or keyboard required" notice | |
| `90-main.js` | settings definitions, Shell theme, boot steps, scene registry, deep links, `game.debug`, `game.stateHash`, `game.start` | |

### 5.3 Scenes and flow

```
boot ─► (AIHub.active) ─► hubcard ─► race[hub] ─► hubover
   └──► title ◄──────────────────────────────── (any input) ◄── attract ◄── (10 s idle on title/menu screens)
          └► menu ─┬─ Arcade Run ───────► garage ► radio ► race[arcade] ─► ending ► results ► menu
                   ├─ Love in Bloom ────► garage ► radio ► race[love]   ─► ending ► results ► menu
                   ├─ Coast 2 Coast Tour ► tour ⇄ brief ► garage* ► radio ► race[mission] ► debrief ► tour
                   ├─ Time Trial ───────► trial ► garage ► radio ► race[trial] ► results ► trial
                   ├─ Versus (2P) ──────► versus(join, route) ► radio ► race[versus, split] ► results
                   ├─ Garage Garden ────► garden
                   └─ Settings · How to Play · About & Credits
race ── time up ─► gameover ► results
pause (engine menu): Resume · Restart · Retire · Dev Mode · Settings · Controls · Full screen · Help · Quit to title
```

`*` A mission may fix the car or the passenger, and the garage then shows only what the mission lets you change.

`race` is **one scene for every mode**: `game.go('race', RaceConfig)`. A `RaceConfig` is
`{ mode, route, car, paint, driver, passenger, song, transmission, rules, rivals, traffic, ghost, players, seed, cheats, bot }`.
`route` is either `{ pyramid: true }` (forks open) or a fixed stage list ending in a goal, or in a sprint goal arch.

### 5.4 Coordinates and units

- **Road position.** `stage` (an id), `z` (world units along that stage's road from its start), `x` (across, in half
  roads: −1 to 1 is the asphalt).
- **Segments.** One segment is 200 units long. Half the road is 2000 units at width factor 1. The camera sits 1000
  units above the road, with a field of view of 100° and a draw distance of 220 segments.
- **Speed** is in km/h. Distance per second is `v × 12` units, so 290 km/h is 3480 units per second (the ROAD kit's
  scale).
- **Lanes.** For N lanes the centres are `x_i = −1 + (2i + 1)/N`. Car half-widths in x: the player 0.24, traffic
  0.17–0.30 by type.
- **Time.** The sim uses only `dt` (1/120 s steps). The hub's `AIHub.time()` is read only for the start sync and the
  reported result.

---

## 6. Engine changes (all in the dev copy; log each in `engine/CHANGES.md`)

The engine is ours to change. These are the planned changes, and each one is needed. Everything else lives in `src/`.

| # | Change | Why |
|---|---|---|
| E1 | **Road junctions.** A segment may carry `split: { s, curveL, curveR }`, the branches' spread in half roads. `draw()` takes `branches: [{ segs, x0, curveAcc }, …]` (the two continuations after a junction) and draws two road surfaces per depth band, each with its own lane marks, rumble and accumulated curve. Grass is split at the median line: the left ground colour left of it, the right one right of it. The road's `cars` and `things` take a `branch` (0 or 1) so they draw on their own branch. `projectBranch(b, z, x, y)` projects onto a branch. | The fork is the source's defining structure. The current module draws one road only. |
| E2 | **Road dressing.** Per-segment `w` (width factor, eased), `lanes`, and per-side grounds `groundL`/`groundR` (`grass`, `sand`, `water` with foam and shimmer rows, `rows` for crop and flower rows in two colours, `cobble`, `snow`, `rock`). **Edge strips** `edgeL`/`edgeR` (`rail`, `wall`, `cliff`, `hedge`, `facade`, `stonewall`) of a given height, drawn as quads like the tunnel walls. **Overhead spans** `span` (`arch`, `bunting`, `canopy`, `gallery` tunnel with open side, `snowshed`). A per-segment `tint` (a multiply colour for tunnels and night) and `lit` (pools of street-lamp light). An `onBand(k, p1, p2, seg)` hook for painting on the asphalt (photo box, skid marks, request markers). | OutRun-style roads need sea on one side, rails, cliffs, arcades and arches. These are generic road-renderer features. |
| E3 | **Analog input.** `input.analog(action)`: the largest of the action's pad button values (`buttons[i].value`, the triggers 6/7), 1 for any held key, 0 otherwise. `input.padValues` holds the values, and `input.setAnalog(action, v)` sets one for tests and bots. | Throttle and brake on R2/L2 must be progressive. The engine reads pad buttons as on/off only. |
| E4 | **Hub combo guard.** When `window.AIHub && AIHub.active`, Options (Pad9) does not pause while Create (Pad8) is held. | The protocol reserves Create + Options for the hub's corner bar. |
| E5 | **Glyph setting.** The standard `glyphs` setting defaults to `'playstation'`, with the options PlayStation and Xbox. | TASK.md: PlayStation glyphs, with a Settings option for Xbox. |
| E6 | **Synth extension.** A track or voice may take `inst` (a preset name) or the explicit fields: `env {a, d, s, r}`, `filter {type, f, q, env, envAmt}`, `unison n` and `detune` cents, `fm {ratio, index, decay}`, `noise` mix, `pan`. Tokens add chords (`C4+E4+G4`), accents (`C4!`) and slides (`C4~`). The drum kit adds `p` clap, `r` rim, `g`/`G` conga low/high, `b` cowbell, `z` shaker, `m` timbale, `y` ride and `T` high tom. Each track may set `send {delay, reverb}`. There is one music effects bus: a tempo-synced delay and a convolution reverb from a generated impulse, with `audio.reverb(amount, fade)`. There is a separate **voice bus** with its own volume. | The series' music is lush jazz-funk and fusion that bare square waves can't carry, and the voices need their own mix. |
| E7 | **Continuous voices.** `audio.loop(spec)` returns `{ set(params, ramp), stop(fade) }` for oscillators and noise that run continuously (engine, tyres, wind, bees, ambience). They follow mute, volume, the effects volume and pause (gain to 0 while `game.paused`), and do nothing headless. | The engine has one-shot sounds only, and a car needs a living engine note. |
| E8 | **Shell theme for 10 feet.** CSS variables for base font size (clamp 22–34 px), focus ring width (4 px), minimum button height (64 px) and panel width (at most 900 px), applied by our `new E.Shell(game, { theme })`. | The standard pause and settings screens must read at TV distance. |

Implemented in game code, not the engine: the sky (`OB.Sky` wraps an `E.Backdrop` plus our own painter layers), the
pixel bloom and other post-effects (they work on the buffer inside an overlay), sprite pre-rendering (`E.shapeSprite`
with a custom `E.View('chase', 'Chase', 0, 9)`), and every UI.

---

## 7. Systems

### 7.1 Road world and route graph (`10-road.js`)

- **Stages.** Each stage is one `E.Road` built from its `sections` (`[n, curve, hill, opts]`; `opts` sets `w`, `lanes`,
  grounds, edges, spans, tunnel, `tint`, `lit`, and `event` for weather or gusts). Stage length is **820–980 segments**,
  plus a **junction of 80 segments** at the end of rows 1–4. Row-5 stages end in a 60-segment **goal run-in** with the
  goal arch and crowd.
- **Junction (fork) rules.**
  1. Junction segments are flat. The first **150 segments of every stage are flat** too, so both branches share one
     height profile across the whole draw distance.
  2. The spread `s` eases from 0 to 2.4 half-roads over the junction (`easeInOut`). The left branch's centre is at
     `−s`, the right branch's at `+s`.
  3. In the median (gore) there are flower-pot crash cushions, then a big **fork sign** showing both stage names, an
     arrow each and a difficulty rating of 1–5 flowers (`OB.Art` draws it, the text in the pixel font).
- **The decision.** At the junction's **decision point** (`s ≥ 1.05`) the player's side `sign(x)` picks the branch.
  - From then on `x` is relative to that branch's centre. The camera follows the absolute position, so the chosen
    branch stays centred while the other slides away.
  - When the junction ends, the race switches to the next stage at `z = 0` with `x` unchanged (already relative). The
    test in §12 proves this is seamless: the road's centre projects to within 1 px across the switch.
- **Before the decision**, `draw()` gets `branches`: the remaining junction segments plus the first 140 segments of
  *both* next stages, each offset by its branch's lateral end position.
- **Checkpoint gate.** It stands at the start of the next stage (segment 2): an arch of flowers with a "CHECKPOINT"
  banner. Passing it extends the clock and shows the stage card.
- **Route graph.** The pyramid is rows 1–5, with stage *(r, c)* forking to *(r+1, c)* on the left and *(r+1, c+1)* on
  the right. That makes **16 routes**, and every row-5 stage ends at its own goal (§8.2). Left branches are always the
  gentler road: fewer hard bends, less traffic, wider lanes.
- **Fixed routes.** Hub, Versus and missions use fixed stage lists. A fork on a fixed route has the other branch closed
  by a striped barrier and a "ROAD CLOSED" sign, drawn and solid. A fixed route may end at a **sprint goal arch** placed
  at the end of any stage.
- **Scenery from kit rules.** Each biome kit lists *placement rules*: `{ sprite, side: 'L' | 'R' | 'both', offset:
  [min, max] (half roads beyond the edge), every: segments, jitter, chance, cluster }` plus *runs* (dense rows such as a
  palm avenue or a fence line). Placement uses the stage's own seed, so the same stage always looks the same. Landmarks
  are stage data (`{ at: fraction, side, kind, offset }`). Nothing is placed within 0.15 half-roads of the asphalt
  unless it is a rail or a strip.
- **Physics queries.** `world.info(stage, z, x)` returns `{ curve, slopeY, curvY (for crests), w, lanes, onRoad,
  ground, edgeL, edgeR, tunnel, hits (scenery touching, from road.hits), cushion (in the gore), gust }` for the sim.
- **Mirror Roads.** An unlockable that builds every stage with its curves negated and its sides swapped. It is a
  build-time flag, and the same code paths run.

### 7.2 Rendering a race frame (`51-race-scenes.js`, `13-fx.js`, `41-hud.js`)

Each viewport is drawn in this order, all in screen pixels; on a split screen it repeats per `r.viewport`:

1. **Sky.** `OB.Sky` for the stage and time of day: gradient, sun or moon, clouds, far layers (sea, hills, mountains,
   mesas, skyline, aurora, balloons, lanterns). It scrolls with `turn` (the curve times speed added up). Near the end of
   a junction it dissolves with an ordered dither over 1.5 s into the chosen stage's sky.
2. **Road.** `stage.road.draw(r, { z, x, h, turn, cars, branches })`. That draws, far to near: bands, grounds, strips
   and spans, with scenery, traffic, rivals, ghosts and request objects interleaved by segment. Fog colour and density
   come from the kit and the time of day.
3. **Asphalt marks** through `onBand`: skid marks (a ring buffer of 400 per stage), the photo box, headlight pools at
   night (additive stepped alpha) and street-lamp pools.
4. **The player's car** at `road.project(z + ahead, x)`: shadow, wheels, the under layer, occupants, the over layer, and
   the lights layer when braking or at night. Then the particles near the car: tyre smoke, sparks, dust or sand,
   spray, backfire.
5. **Screen effects.** Petals and rain, speed lines (above 260 km/h), heat shimmer in the desert and canyon, then the
   **pixel bloom** (below), then the **lens flare** when the sun is on screen and not in a tunnel.
6. **HUD** (§7.18), then dialogue bubbles, banners and toasts, then the debug overlay when it is on.

**Pixel bloom** (`OB.FX.post`), which must look like pixel art and never like blur:

1. Read the viewport's `ImageData`, then sum pixels brighter than a threshold (luma 200 by default, from the kit) into
   a ¼-resolution grid.
2. Blur that grid with two 3×3 box passes and quantise it to 4 levels.
3. Add it back at 4× (nearest neighbour), through a 4×4 Bayer dither and tinted toward the sun's colour.
4. Strength by time of day: dawn 0.55, noon 0.35, sunset 0.7, night 0.6 (neon). Reduce motion keeps it, as it is
   static.

Lens flare is 5 ghosts (hexagons and discs drawn with `px.blend('add')` at stepped alpha) along the line from the sun
through the screen's centre. Its strength scales with how centred the sun is.

**Cameras.** The camera is a setting, and the △/C key cycles it in a race.

| Camera | Height `h` | Car drawn | Notes |
|---|---|---|---|
| **Chase** (default) | 1000 | full size | — |
| **High** | 1350 | 0.8× | — |
| **Bumper** | 380 | not drawn | a bonnet strip and the cockpit edge; the occupants' heads aren't shown |

- **Following.** Camera x is `0.85·x + 0.15·x_lagged`, where `x_lagged` follows `x` at 6/s. In a drift the lag rises
  so the car swings out on screen.
- **Speed.** The field of view widens from 100° to 108° at top speed.
- **Shake.** Rumble strips and off-road driving shake the camera through `game.shake`, which respects the comfort
  settings.

**Night and tunnels.**
- **Tunnels.** The `tint` darkens bands and sprites (multiply). Sodium lamps along the walls flash past as stripes.
- **Night.** The player's headlights cast two additive cones on the asphalt ahead, and traffic shows red tail lights
  and white headlights. Neon is emissive, so it is drawn after the tint.

### 7.3 Car handling (`20-car.js`)

The state is `{ z, x, vx, v (km/h), gear, rpm, drift: { on, dir, a, t, score }, slip, slingT, air, airT, crash: { t, kind },
bumpT, scrape, offroad }`. The intent is `{ steer −1..1 (analog), gas 0..1, brake 0..1, driftBtn, shiftUp, shiftDown }`.
Every number below is a live tuning value (Appendix A), and per-car stats scale them (§8.4).

1. **Engine.**
   - **Acceleration.** `dv = A0·(1 − (v/vtop)^1.6)·gas − drag − brake·240 − offroad`. Here `A0` is taken from the car's
     0–100 km/h time, and `drag = 18 + 0.00025·v²` km/h/s.
   - **Automatic** (the default) shifts at 18/34/50/66/82 % of `vtop`. `rpm` sweeps 1,500–8,000 inside each gear.
   - **Manual.** R1/E shifts up, L1/Q shifts down. There is a rev limiter at the top of each gear and weak pull below
     2,500 rpm. A down-then-up shift within 0.3 s, while steering above 120 km/h, starts a drift (classic input).
   - **Rev start.** Holding gas during the countdown moves `rpm`. If the needle is in the green zone (6,000–7,000) at
     GO, you get **PERFECT START** (+25 km/h). Above 7,500 the wheels spin and you get nothing.
2. **Steering.**
   - **Target.** The lateral-speed target is `vx* = steer · steerRate · min(1, v/70) · (1 − 0.22·v/vtop)`, in half-roads
     per second. `vx` approaches it at `steerResponse` (9/s).
   - **Keyboard.** Steering ramps from 0 to 1 over 0.12 s and returns in 0.08 s. The analog stick is used as read,
     after the dead zone.
   - **Steering assist** (setting: Off/Low/High). Off the road it nudges `vx` back toward the lane at 0/0.3/0.6 per
     second. On High it also brakes by itself before bends the car can't make.
3. **Curve push.** `vx −= curve · (v/vtop)² · curvePush · dt` (curvePush is 0.62 by default). Design targets, which the
   tests check:
   - A curve of 3 at full speed can be held without drifting.
   - A curve of 4 needs a lift or a drift above about 92 % of top speed.
   - Curves of 5–6 need a drift or braking. A clean drift takes a 6 at about 85 % of top speed.
4. **Drift.**
   - **Entry.** Any enabled input starts it while `v > driftMinSpeed` (120) and `|steer| > 0.4`:
     - **Brake tap:** brake above 0.3 for at most `driftTapWindow` (0.35 s), then released.
     - **Down-up shift.**
     - **The Drift button** (○/Space). Held, it keeps the drift deeper, like a handbrake.
     The drift's direction is `sign(steer)`, and the "Drift input" setting picks which inputs are on (default: all).
   - **Angle.** `a` approaches a target at 3.5 rad/s. The target is `dir · (0.35 + 0.40·|steer|)` when steering into the
     drift, `dir · 0.30` with the stick centred, and `dir · 0.12` when counter-steering past 0.5. It is capped at
     `driftAngleMax` (0.75 rad).
   - **Effects.**
     - The curve push is multiplied by `1 − driftGrip · min(1, |a|/0.5)` (driftGrip is 0.85).
     - The steering rate is multiplied by `driftSteerBoost` (1.3).
     - Speed drops by `driftSpeedLoss · |a|/0.75` km/h/s (16).
   - **Exit.** It ends when `|a| < 0.08` for 0.2 s, when `v < 90`, after a crash, or when the curve is below 0.5 with the
     stick centred for 0.4 s.
   - **Drift score.** It accumulates `v · |a| · dt · 10`. At the exit it emits `drift:end { score, length }`.
   - **Visuals.** The yaw frame is `vx·0.16 + a`. Smoke comes from both rear wheels, skid marks are laid, and the tyre
     squeal rises with `|a|`.
5. **Slipstream.**
   - **Building.** The nearest vehicle ahead with `300 < dz < slipRange` (1,800) and `|dx| < slipWidth` (0.22) builds
     `slip` at 1.25/s. Otherwise `slip` decays at 2.5/s.
   - **Effects.** Top speed rises by `slipTopBonus·slip` (+6 %) and drag drops by up to 50 %. Wind lines show at
     `slip > 0.5`.
   - **Slingshot.** Pulling out with `slip ≥ 0.8` gives `slingshotBoost` (+14 km/h, eased over 0.8 s) and emits
     `slingshot`.
6. **Off-road and edges.**
   - **Off-road** (`|x| > 1` on grass, sand, rows or snow): top speed falls to `offroadTop` (50 %), with an extra 120
     km/h/s of drag while above it, plus a bounce and dust or sand.
   - **Water** behind a rail can't be reached. Water with no rail (the causeway shallows): a big splash, then the car is
     put back like a crash.
   - **Rails, walls and cliffs.** `x` is held at the strip (±1.22). The car scrapes: −40 km/h/s, sparks, a screech, a
     rumble, no spin.
7. **Collisions.**
   - **With traffic, rivals or the other player** (`dz` under one car length, about 520 units, and `|dx|` under 90 % of
     the summed half-widths):
     - **Bump**, when the closing speed is below `spinThreshold` (70 km/h): `v = v_other·0.92 − 8`, the cars are pushed
       0.08 apart, and `car:bump` is emitted.
     - **Spin-out** otherwise: 1.3 s of a full 360° spin, `v` drops to 30 % (at least 40 km/h), the other car spins and
       slides aside, and `car:crash` is emitted.
     - A side contact (similar `z`) pushes the cars apart in `x` and costs 8 % of speed.
   - **Scenery** (`hits` beyond the edge): a spin-out above 110 km/h, below that a bump back to the asphalt at half
     speed.
   - **Gore cushions:** a bump, pushing the car toward the nearer branch.
   - **After a spin-out**, the car is put back at `x = ±0.75` facing ahead and blinks for 1 s. It can't crash again
     during that second.
8. **Crests and air.** When the road's vertical curvature at `z + ahead` falls below −k and `v > 200`, the car is
   airborne for about 0.3–0.6 s.
   - **In the air:** the sprite lifts, the shadow stays down, steering is cut to 30 % and there is no curve push.
   - **Landing:** the suspension bounces, sparks fly on a hard landing, and `air:land` is emitted. The passenger reacts.
9. **Gusts** (Seafoam Causeway). Stage events push `vx` with a lateral impulse over 1.2 s, warned by a wind-sock icon
   and spray 1 s ahead.

### 7.4 Traffic (`21-traffic.js`)

- **Spawning.** Vehicles spawn per stage from its traffic mix (§8.6), with a seeded stream per stage visit
  (`runSeed ⊕ stageIndex`, or `AIHub.rng('traffic')` in a hub session). That gives every hub player the same traffic.
  They spawn from `z + 600` to the end of the draw distance and despawn 3,000 units behind the slowest player.
  - **Density.** The stage's density (vehicles per 10,000 units per lane) × the `trafficDensity` tuning × the
    difficulty (Easy 0.75, Normal 1, Hard 1.3).
  - **Spacing.** At least 900 units apart in one lane. A gap of two free lanes is always left somewhere within any
    1,500 units, so the road is never walled off.
- **Behaviour.** Each type has a speed range, and vehicles keep their lane.
  - **Lane changes.** Blocked by a slower car within 1,200 units, a vehicle blinks for 0.8 s, then changes lane over
    1.2 s if the lane is free.
  - **Horn.** The horn (△/H) makes the vehicle ahead within 2,500 units in your lane change lanes if it can. It has a
    2 s cooldown, and the passenger may comment.
- **Junctions.** Each vehicle on a junction is assigned a branch from its stream, so they split naturally.
- **Detection for scoring and requests.**
  - **Overtake:** your `z` passes theirs while `|dx| < 0.9` and there was no contact in the last 0.5 s. Emits
    `overtake`.
  - **Near miss:** passing with an edge-to-edge gap `0 < |dx| − (w1 + w2) < 0.12` half-roads, a closing speed above
    50 km/h and no contact. Emits `nearmiss`.
  - **Slipstream source:** the vehicle ahead, per §7.3.
- **Ribbon pairs.** A Love in Bloom spawn is two vehicles side by side in adjacent lanes at the same speed, with a pink
  ribbon between them. Driving through the gap (`|x − mid| < 0.16`) as you pass snaps it.
- **Drawing.** The yaw frame is chosen from the vehicle's projected screen offset (perspective), plus its lane-change
  angle. Blinkers, brake lights (when slowing) and, at night, head and tail lights all come from the lights layer.

### 7.5 Rivals, bots and the shared driver brain (`22-drivers.js`)

`OB.Brain(params)` returns the same intent a player gives (`steer`, `gas`, `brake`, `driftBtn`), so rivals, the attract
demo, test bots and the Versus "CPU" option all drive through `CarSim`, with no special physics.

- **Line and speed.**
  - **Racing line.** Look ahead 2,500 units. The target is `x* = −0.35 · sign(curve)` into the bend.
  - **Speed.** The curve-safe speed is `vsafe = vtop · sqrt(steerCapacity / (|curve| · curvePush))`. The brain brakes
    when it is over `vsafe` and the drift isn't allowed.
  - **Drift use.** If `drift` is allowed and `|curve| ≥ 4`, it taps the brake when entering and steers into the bend.
- **Traffic.** Pick the free lane with the most room ahead. Prefer slipstreaming a vehicle when the next 3,000 units
  are straight (draft-seeking rivals).
- **Rubber band** (rivals only). The rival's top speed is multiplied by `1 + rivalRubber·clamp(−Δz/16000, −0.08, 0.10)`,
  where Δz is the rival's lead over the player. `rivalSkill` scales its top speed and its cornering.
- **Request targeting** (bots and attract). Objects to hit (balloons, gnomes, bouquets, arches, ribbon gaps) become
  `x*` targets ahead. Objects to avoid (bees, cones, wrong slalom sides) are pushed against in `x*`. For the photo box,
  brake to 40 km/h when 1,500 units out.
- **Forks.** The brain follows a given route plan (`'L'`/`'R'` for each fork), or the passenger's preference.
- **Cheats** (attract mode and the dev menu): `noCollide`, `infiniteTime`, `perfectRequests` (objects come to the car),
  `autoDrift`.
- **Rival personas** are parameter sets: Kiki (drift-happy), the Brambles (draft-seeking), the Lustres (block-and-weave),
  Old Ottavio (late braker).

### 7.6 Run rules: clock, checkpoints, forks, goals, score and the Bloom chain (`23-race.js`)

- **Start line** (S1, and any fixed route's first stage):
  1. The cars sit on a painted grid under a light gantry. Bruno stands at the roadside waving his flag.
  2. A 3-2-1 countdown on the gantry, the passenger's line, then "GO!". This is the rev start of §7.3.
  3. The cutscene can be skipped with ✕/Enter. It plays at most once per session in Arcade mode.
- **The daylight clock** counts down from `startTime` (75 s on Normal). The HUD shows the seconds, and below 10 they
  flash red and a heartbeat tick plays.
  - **Checkpoints.** Each gate adds `checkpointBonus[row]`, which is 58/57/56/55 s for entering rows 2–5.
  - **Difficulty** scales the time: Easy ×1.12, Normal ×1, Hard ×0.92.
  - **At zero** the run is over. The car coasts to a stop, the screen warms to sunset orange, and you see the
    passenger's sigh line and "TIME UP — The sun set over {stage}." Then `gameover` leads to `results`.
- **Stage card at a checkpoint**, about 2.5 s and never covering the road's centre:
  - "TIME EXTENDED! +57", the new stage's name with its 1–5 flower difficulty, and the stage time just driven.
  - Your best split for that stage, when you have one.
- **Fork approach.**
  - **900 segments before the decision point:** the HUD's mini-map pulses both next stages, and a "← LAVENDER RIDGE |
    LEMON CLIFFS →" banner appears with the difficulty flowers.
  - **In Love in Bloom**, about 600 segments before it, the passenger states a preference (§7.7).
- **Goal.**
  1. Passing the goal arch triggers `goal`: 1 s of slow motion (`game.timeScale = .4`), confetti, the crowd and the goal
     fanfare.
  2. Then `ending` plays (§8.3) and `results` follows.
  3. The run's time, score and route (as a string of L/R, such as `LRRL`) are saved.
- **Score, shown in every mode except Time Trial.**
  - **Per second:** `v(km/h) × 2 × bloomLevel`.
  - **Events:** a near miss 500, an overtake 100, a slingshot 300, and on `drift:end` the drift's score. Each is
    multiplied by `bloomLevel`.
  - **At the goal:** the remaining seconds × 1,000, plus a route bonus of Σ stage difficulty × 5,000.
  - The **arcade table** (`E.Arcade`, mode `'arcade'`, and `'love'` for Love in Bloom) takes initials on a letter wheel,
    which also accepts typing.
- **The Bloom chain** is the style multiplier, from level 1 up to level 5, *Full Bloom*.
  - **Earning chain points:** drift time × angle, near misses (+400), slingshots (+300), overtakes (+120), and Perfect
    requests (+800).
  - **Levels** at 1,000 / 3,000 / 6,000 / 10,000 chain points.
  - **Decay.** With no style event for `bloomDecay` (4 s), the points drain 20 % per second. A crash halves them and
    drops a level.
  - **Showing it.** Level 3 and up: the car sheds petals. At level 5 a "FULL BLOOM!" banner appears, roadside flower
    sprites pop open as the car passes (a sprite swap with a burst), and the radio song's `sparkle` layer fades in.
- **Results screen** (big tiles, no tables):
  - **Score, time and route:** the pyramid with your path lit, plus the goal's name.
  - **Your style:** the best drift, near misses and the time spent in slipstream.
  - **Love in Bloom only:** the petals and grade, with a stamp animation.
  - **Rewards:** the seeds earned, and records (*NEW RECORD!*).
  - **Buttons:** Drive again, Change car, Menu.

### 7.7 The passenger and Love in Bloom (`24-requests.js`, `12-cast.js`, `31-voice.js`)

- **The passenger is always in the car.** In every mode the passenger reacts to events with a bark (babble + subtitle
  bubble) and a pose. How often depends on the "Passenger chatter" setting: Full (every event with 35 % chance), Less
  (10 %, requests and goals only) or Off (requests only, silent). In Love in Bloom the requests are the core.
- **Request life cycle** (data in `OB.REQUESTS`; each stage lists 2–3 request slots `{ at: fraction, type, params }`):
  1. **Intro (1.6 s):** the passenger turns to you and says the line. A big card appears ("POP THE BALLOONS!") with the
     type's icon (not colour alone) and the target count. The objects spawn 1,500–2,500 units ahead.
  2. **Active (its window, 180–260 segments, about 12–17 s):** a progress counter ("7 / 12") or a gauge, a window bar,
     live pops and sparkles on each success.
  3. **Rating:** Perfect, Great, Good or Miss, giving **5 / 3 / 2 / 0 petals**. A request type the passenger loves earns
     ×1.2, rounded up. The passenger reacts in tier with a line and a pose.
- **Fork preference** (Love in Bloom). At a fork the passenger may say "Left! I want to see the lavender!". Taking it
  gives +2 petals, refusing it −1 ("Hmph.").
- **Petal penalties:** a spin-out −2, a bump −1 (with a 3 s cooldown), and more than 2 s off-road −1.
- **Grade.** The grade compares petals to the run's maximum (the requests actually met on that route, plus the
  fork preferences): **AAA ≥ 92 % "Full Bloom", AA ≥ 82 %, A ≥ 70 %, B ≥ 55 %, C ≥ 40 %, D ≥ 25 %, E below that**. The
  ending's mood follows from it: **Bloom** (A or better), **Bud** (B–C), **Wilt** (D–E).
- **Mood face.** The passenger's panel portrait shows a mood face (happy, neutral or pouty) from the last 20 s of
  events, and the petal ring fills around it.
- **The request types (all 14)** are specified in §8.7. Each implements `{ spawn(ctx), step(dt, ctx), evaluate() →
  rating, hud(ctx), lines }`, and each is tested with scripted pass and fail runs (§12).

### 7.8 The Coast 2 Coast Tour: the career (`52-career.js`, `25-missions.js`)

- **The Tour map.** A stylised island of Bellafiore (east coast on the right, west on the left), its regions painted per
  biome and the pyramid drawn as roads.
  - **Postcards.** 14 postcards are pinned near the stages they use, each showing its giver's portrait.
  - **Navigation.** The stick or d-pad moves the focus spatially between postcards, the mouse hover focuses one and a
    click opens it, and ✕/Enter opens it too. The map pans to keep the focus in view.
  - **Locked postcards** show a padlock and say what opens them.
- **The brief** is one big postcard: the giver's portrait (with its idle animation), the title, one or two short lines
  in the giver's voice, the rules as icons plus one sentence, the reward seeds per rank, your best rank, and "✕ Start
  ○ Back".
- **Rules.** A mission runs `race` with `rules: OB.Rules[kind](params)`. Its hooks are `onStart`, `onStep(dt)`,
  `onEvent(e)`, `hud(r)`, `isOver()` and `result()`, which returns `{ cleared, rank: 'C' | 'B' | 'A' | 'AAA', stats }`.
  Clearing is rank C or better.
- **The debrief.** A rank stamp (AAA is the "FULL BLOOM" stamp), the seeds counted up, any unlock toasts ("A new bed is
  ready in the Garage Garden: Gardenia GT"), then Retry, Next postcard, or Map.
- **Unlocking.** Clearing a mission opens the giver's next postcard. The **Finale** opens once any 9 missions are
  cleared. Clearing the Finale plays the Tour's closing scene and the credits.
- **Story** (lines in §8.11):
  - **Opening.** Bruno's garage at dawn. He welcomes you to "the Coast 2 Coast Tour, the sunniest race on Earth".
  - **Chapters.** Each giver's first postcard opens with a 3-line intro, and each giver's last mission closes their
    little arc.
  - **Finale.** All four characters gather at the goal you reach for a group photo (Juni's camera flash), then the
    credits roll.

### 7.9 The Garage Garden and the economy (`26-progress.js`, `52-career.js`)

- **The screen.** A sunny garden beside Bruno's garage with flower beds in rows of three.
  - **Each bed is one unlock:** its icon, name, cost in seeds and status (locked behind a mission, plantable, or
    bloomed).
  - **Planting** costs seeds. The bed animates (sprout, bud, bloom with a petal burst) and the item is unlocked.
  - **Navigation:** the d-pad or stick, mouse hover and click. The seed balance sits large at the top.
- **Earning seeds.**
  - **Missions:** the base reward × the rank multiplier (C ×1, B ×1.25, A ×1.5, AAA ×2). A mission pays out only the
    improvement over the best rank already paid for it.
  - **Arcade and Love in Bloom runs:** `floor(score / 20000)`, plus 50 for reaching a goal and 100 the first time you
    see each goal ending (with the tier, to make the 15 vignettes worth collecting).
- **Costs and balance** are in §8.9. The economy test (§12) proves everything can be bought with the seeds from all 14
  missions at rank A plus at most 6 arcade runs.

### 7.10 Time Trial and ghosts

- **Setup.** Pick any of the 15 stages, or a *Full Coast* run with the forks open. Traffic is Off by default and can be
  turned On. There is no passenger request layer, but the passenger still rides and reacts. The clock counts **up**, and
  checkpoints show splits against your best (green ahead, red behind, with a sign, never colour alone).
- **Ghost.**
  - **Recording.** Your best run is sampled at 10 Hz as `[stageIndex, z, x, yawFrame]`, delta-encoded and kept in the
    profile (at most 6,000 samples per run).
  - **Playback.** It is drawn as a translucent car (a 50 % ordered dither in the paint's tones) with a "BEST" tag.
- **Medals.** Bronze, Silver, Gold and Bloom per stage, from the reference bot time × 1.25 / 1.12 / 1.04 / 0.98. These
  are computed by the test suite at build time and stored in the data (`OB.STAGES[id].par`), never computed live.

### 7.11 Versus: two players on one screen (`53-modes.js`)

1. **Join.** The Versus screen calls `game.allowJoin({ max: 2 })`. P2 joins with Start on a second pad, or with 2 on the
   keyboard (which splits it: P1 WASD with F/G/H, P2 the arrows with `.` `/` `,`).
2. **Pick.** Each player picks a car and paint with their own focus, side by side. Then pick a route: Flower Sprint
   (S1 → S2 → S5), Cliff Sprint (S1 → S3 → S6) or Full Coast (S1 → S2 → S5 → S9 → S13 → Goal C). A lone player may set
   P2 to "CPU" (the `OB.Brain` at Normal skill).
3. **Race.** `race` runs with `players: 2` and `game.splitScreen(2, { layout: 'rows' })`, and the scene's `res` is
   `[640, 360]` so each half gets 640×180.
   - **World.** One shared world and traffic. The cars collide and slipstream each other.
   - **Screens.** Each viewport draws its own camera and its own HUD (clock, speed, place "1st/2nd", the gap).
     `scene.hud(r)` draws the centre divider and the countdown.
   - **Engine sounds.** Both players' engine sounds play, each at 70 %.
4. **Win.** The first to the goal wins. If the clock runs out, the player further along wins. Results show both players
   and offer Rematch, Change route or Menu.

### 7.12 AI Hub online (`70-hub.js`)

Follow `lib/hub/README.md` (protocol 1, client 1.4.0) exactly. The mode is **ghost**: each copy runs its own race, and
the copies send each other only their own car.

1. **Detect.** `AIHub.active` is true from the first line.
   - Skip the title, menus, attract mode and the touch notice.
   - Hide **Quit to title**, Restart and Retire (pass `menu.quit: false` at construction), and hide Dev Mode.
   - The garage and radio are skipped: the car is the Orchidea Spider in seat colour, the song is station 1, the
     transmission automatic, and the passenger Marisol (chatter Less).
2. **Connect.** `await AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true })`. If it resolves to `null`, boot to
   the title as normal.
3. **Prepare.** Build the race for the fixed **Flower Sprint** route (S1 → S2 → S5, ending at a sprint goal arch). Take
   traffic from `AIHub.rng('traffic')`. Call `AIHub.ready()` as soon as the boot steps finish, without waiting for a key.
4. **Our own card (`hubcard` scene).**
   - **It shows** the title logo over the start line at dawn, the players lined up as cars on the grid in their seat
     colours with a READY tick, the goal line ("Fastest to the Flower Sprint goal wins"), the controls for the last-used
     device (glyphs), and the countdown from `card.left`.
   - **Answers.** Enter or ✕ (button 0) or a click on READY → `AIHub.answer('ready')`. △ (button 3), T, or a click on
     MORE TIME → `AIHub.answer('more')`.
   - **Limits.** The card draws from `AIHub.rng('card')` only. It has no settings or choices.
5. **Start.** On `start`, run the gantry countdown so that GO lands when `AIHub.time() ≥ 0`. The sim holds the cars
   still until then.
6. **During the race.**
   - **Clock.** In a session the clock counts **up** (race time). There is no time-out, and the hub's limit ends the
     round.
   - **Ghost send, every 100 ms:** `AIHub.send({ t: 'g', area: stageId, z, x, v, yaw, drift }, { reliable: false })`.
   - **Progress, once a second:** `AIHub.progress({ score: metres along the route, label: 'Stage 2/3 · 64%' })`. Start
     both the sends and the progress at `start`, even while the score is still 0: the harness only pokes random keys,
     yet checks that every copy sends and reports.
   - **Ghost cars.** Others are drawn as translucent cars in their seat colour with name tags (the pixel font; any
     glyph it lacks becomes `?`; never HTML), only while they share our `area`, smoothed toward their last state. A
     standings strip on the HUD shows everyone's progress.
7. **Goal.** `AIHub.result({ time: Math.round(AIHub.time()) })`, plus `send({ t: 'done', time })` and
   `stats: { 'Best drift': …, 'Near misses': … }`. Then keep cruising behind a "Waiting for the others…" banner while
   the ghosts keep coming.
8. **Endings.**
   - **`time-up`:** if the race is still going, `AIHub.result({ score: metres })` at once.
   - **`end`:** stop taking input, `stopMusic`, fade the engine loops and mute all audio, freeze the sim, and show
     "Round over" until the hub removes the page.
   - **`leave`:** drop that player's ghost.
9. **Hard rules in a session.** No network except through the hub. No `alert`, `confirm`, `prompt`, `window.open` or
   navigation. The pause menu offers Resume, Settings and Controls only. Options is ignored while Create is held (E4).
   The empty storage the client provides means a fresh profile, which is fine.

### 7.13 Characters and animation (`12-cast.js`)

All characters are engine `E.Humanoid` rigs dressed per §8.5, animated by the rig's own system: poses, expressions,
`point`/`aim`, procedural breathing, and hair. Each one has a portrait from `rig.drawPortrait`.

- **In the car.**
  - **Seating.** The driver (left seat) and passenger (right seat) are drawn between the car's *under* and *over*
    layers, so the bodywork hides their lower bodies. They are rendered seated (`down: .35`, legs hidden), sized to the
    car's scale, and placed on the seat anchors of the car frame shown.
  - **Hair and scarves** stream back with speed: the rig's hair plus a two-segment ribbon for a scarf or long hair,
    whose angle follows speed and steering.
- **Poses**, triggered by bus events:

| Event | Driver | Passenger |
|---|---|---|
| steering | leans into the turn (`lean`), head tilts | sways the other way |
| request intro | — | turns to the driver, `expr: 'shout'`, points ahead (`point`) |
| success | — | `pose: 'cheer'`, `expr: 'smile'`, petals burst over the car |
| fail | — | arms crossed (`pose: 'hips'` while seated), `expr: 'angry'` |
| near miss / big air | — | covers her face (`pose: 'guard'`, `expr: 'wince'`) |
| spin-out | head shake | both hands up (`pose: 'cheer'` with `expr: 'shout'` reads as a scream), "Kyaaa!" bark |
| fork preference | — | points left or right (`point` + `aim`, the rig turned toward that side) |
| goal | one arm up | `pose: 'wave'` at the crowd |
| Juni's photo moments | — | raises her camera (a held sprite), with a flash particle |

- **Bruno.** At the start line he waves his flag: a flag sprite on `rig.hand()`, the arm driven by an `E.MOVES`-style
  spec looping `overhead`, with the flag cloth a 3-segment ribbon. At goals and debriefs he cheers, gives a thumbs-up
  (`point` + `pose: 'hips'`) or facepalms (a hand at his head, `expr: 'wince'`).
- **Endings and garage** use side-view vignettes at size 1.6. The couple step out of the car (a walk cycle from the
  velocity) and play their scene's poses.
- **Spectators** are pre-rendered Humanoid sprites in 3 poses × 4 palettes, waving through two frames, shown at
  checkpoints, goals, beaches and the city.
- **Car animation.**
  - **Frames.** 33 yaw frames covering −90° to +90° (steering and drift) and 32 frames for a full spin.
  - **Body.** It bobs on its suspension (a spring on bumps, rumble strips and landings) and rolls 1 px against the
    wheels when cornering.
  - **Wheels and lights.** The tread alternates between two phases by speed. Brake and reverse lights, blinkers and
    headlights come from the lights layer.
  - **Effects.** Backfire flames on lift-off above 6,000 rpm, and tyre smoke, skid marks, sparks, sand and spray as
    particles.
- **Traffic animation:** lane-change blinkers, brake lights, a spin when hit, and a honk "♪" when you cut one off.
- **Request objects** (§8.7): balloons bob and burst into confetti; gnomes wobble, then fly off with googly eyes popping
  out; bees buzz in sine paths; ribbons flutter and snap; cones tumble; flower arches sway and burst into petals;
  bouquets spin and sparkle.
- **UI animation:** focus pops (a scale-and-bounce tween), wipes with blowing petals between screens, the logo shine
  sweeping across, and garden beds blooming.

### 7.14 Music and the radio (`01-data-music.js`, `30-synth.js`, `32-radio.js`)

- **Code only.** All music is engine song objects (`{ bpm, steps, tracks }`) on the extended synth (E6). There are no
  audio files.
- **The radio screen** is a car-radio faceplate.
  - **Stations.** Five presets, plus two more once unlocked (§8.10). Each station tile shows its frequency ("88.6
    PETAL FM") and the song title.
  - **Tuning.** Left/right tunes. A 0.3 s burst of static plays between stations, then the song starts from its intro.
  - **Choosing.** The mouse hovers and clicks a preset. ✕/Enter or the gas confirms.
  - **Transmission.** △ or T toggles AUTO/MANUAL, shown big.
- **During a race.** D-pad ↑ or R switches station, crossfading over 1 s with a "♪ Coastline Crush · 91.2 SUN FM" card.
  Music ducks to 60 % under the passenger's speech and to 35 % when paused (the engine does that).
- **Song form.** Every radio song is 64–96 bars, about 2–3 minutes, then loops.
  - **Shape:** intro (4 bars) → A → B → chorus → A′ → bridge → chorus′ → turnaround.
  - **Tracks:** at least 6 named tracks (`drums`, `perc`, `bass`, `keys` or `gtr`, `lead`, `pad`) and a `sparkle` layer
    (`on: false`) that Full Bloom brings in.
  - **Mix:** bass below 250 Hz, chords at 300–2,000 Hz, lead at 1–4 kHz, `sends` on keys and lead.
- **Instrument presets** (`OB.Synth.inst`), built from E6 fields:

| Preset | Recipe |
|---|---|
| `epiano` | FM, ratio 1, index 1.8 decaying, plus a soft triangle |
| `slapbass` | saw and square, lowpass with fast envelope, accents |
| `fingerbass` | triangle and sine, short attack |
| `brass` | 3-voice saw unison, filter swell |
| `stab` | short saw chord |
| `steeldrum` | FM, ratio 3.5 |
| `marimba` | sine, fast decay |
| `lead` | pulse with vibrato after 0.15 s and slide |
| `sax` | saw with a bandpass formant and vibrato |
| `pad` | 4-voice detuned saw, slow attack, lowpass |
| `organ` | sines at 1×/2×/3× |
| `pluck` | noise burst into a resonant lowpass (a Karplus-like pluck) |
| `chorusgtr` | 2 detuned square chords, panned |

- **Composition rules**, because builders can't listen:
  - Diatonic melodies on the stated key's scale, and chord tones on strong beats.
  - The bass plays chord roots or fifths on beat 1.
  - No two melodic tracks in the same octave at once.
  - The lead rests at least 25 % of the steps.
  - Drums always run under everything.
  - The progressions, keys, tempos and hooks are listed per song in §8.10. The audio-lint test (§12) checks levels and
    clipping, and the spectrum test checks the mix's bands.

### 7.15 Sound effects, the engine note and ambience

- **Engine** (`OB.EngineSound`, on E7 loops), one per player car:
  - **Sources.** Two saw oscillators at the firing frequency `f = rpm/60 × cylinders/2` and at 2f, plus a square sub at
    f/2, through a lowpass whose cutoff follows throttle (600–4,000 Hz) and a soft-clip shaper.
  - **Character.** Each car has its own cylinder count (4/6/8/12) and filter colour (§8.4).
  - **Gear changes** dip the pitch with a short "chuff". Lift-off above 6,000 rpm adds backfire crackles (noise bursts).
  - **Rivals** get one shared quieter loop for the nearest rival.
  - **Traffic** gets a passing "whoosh": noise rising with closing speed and panned by side.
- **Tyres.** A squeal from 2–3 triangle oscillators near 900–1,400 Hz with a fast random wobble; its gain follows the
  drift angle and hard cornering. Rumble strips give a 30 Hz pulse train. Gravel and sand give lowpass noise crunch.
- **Wind** is bandpass noise rising with v². In the slipstream it hushes (lowpass), then pops back on the slingshot
  whoosh.
- **Crashes** are soft and funny, never harsh: a bump "thunk" (sine drop with noise), a spin (squeal sweep plus the
  passenger's "Kyaaa!"), and a scrape (filtered noise with sparkle ticks).
- **Request sounds:**

| Event | Sound |
|---|---|
| balloon pop | noise click and a rising chirp |
| gnome bonk | "boink": triangle 300→900 Hz with a squeak |
| bee buzz | a loop, saw at 220 Hz with 30 Hz amplitude wobble, panned by position |
| ribbon snap | noise and a pitch drop |
| cone | a hollow "tok" |
| arch | harp gliss (pluck arpeggio) |
| bouquet | chime |
| photo | shutter click and flash zap |
| request success | rising chimes |
| request fail | deflating trombone (saw slide down with vibrato) |

- **Race events:**

| Event | Sound |
|---|---|
| countdown | beeps, then GO |
| checkpoint | whoosh and a bright chord |
| time warning | tick |
| near miss | a short "zing" |
| Full Bloom | sparkle |
| goal fanfare | — |
| crowd cheer | layered noise bursts and a few babble "yay"s |
| seagulls (beach) | — |
| cicadas (vineyard and canyon) | — |
| birds (fields) | — |
| waves | lowpass noise swells |
| city night hum | — |
| fireworks | thump, then crackle |
| horn | per car: a two-tone square pair |

- **Ambience** (`OB.Ambience`) is one quiet loop set per kit. It crossfades at junctions and sits under the music.
  Tunnels raise `audio.reverb` from 0.15 to 0.6 and add an echo-y wash to the engine.
- **UI sounds:** focus tick, confirm, back, error, toggle, slider tick, and planting a seed (a soft pop and a bloom
  sparkle).

### 7.16 Voices: Animalese and Simlish-style babble (`31-voice.js`)

- **Text to syllables.** Lower-case the text and split it into syllables: a consonant onset plus a vowel nucleus.
  Punctuation becomes a pause (comma 80 ms, full stop 160 ms, "…" 300 ms). A run of capitals is shouted (+3 dB, +2
  semitones).
- **Synthesis per syllable** (60–110 ms, on the voice bus):
  - **Source:** a saw and a pulse at `f0`, through two parallel bandpass formants. The vowel sets F1/F2: a 800/1200,
    e 500/1900, i 300/2300, o 500/900, u 350/800 (Hz). Each character scales them by its own factor.
  - **Onsets:** plosives (p b t d k g) get an 8–15 ms noise burst at 2–4 kHz. Fricatives (s z f v h, sh) get 30–50 ms
    of filtered noise (high for s, low for f and h). Nasals and liquids glide `f0`.
  - **Pitch:** `f0` follows an intonation contour. Statements fall at the end, questions rise, and "!" lifts the start.
    A per-syllable jitter comes from an rng seeded by the text, so a line always sounds the same.
- **Moods:**

| Mood | Pitch | Speed | Other |
|---|---|---|---|
| happy | +3 semitones | — | wider contour |
| excited | +5 | +20 % | — |
| angry | −2 | — | louder, clipped decays |
| sad | −4 | −20 % | breathy noise mix |
| scared | +6 | — | tremolo |

- **Per-character voices** (data in `OB.CAST`):

| Character | Base f0 | Formant × | Rate (syllables/s) | Wave | Quirk |
|---|---|---|---|---|---|
| Marisol | 290 Hz | 1.12 | 13 | pulse 25 % | giggle "hee" barks |
| Vivi | 230 Hz | 1.0 | 11 | saw | long "Daaarling" vowels, dramatic swoops |
| Juni | 320 Hz | 1.18 | 15 | pulse 12 % | raspy noise mix |
| Bruno | 110 Hz | 0.8 | 10 | saw | booming, with a laugh bark "Ho ho!" |
| Kiki | 270 Hz | 1.1 | 14 | — | — |
| Lance | 140 Hz | — | — | — | — |
| Lacey | 250 Hz | — | — | — | — |
| Bram/Basil | 125 and 135 Hz | — | — | — | — |
| Ottavio | 100 Hz | — | slow, wavering | — | — |
| Announcer | 150 Hz | — | — | — | big reverb send, used for "CHECKPOINT!" and "GOAL!" |

- **Subtitles always show.** Speech bubbles type the exact line at the babble's pace (the planner returns per-syllable
  times), and the portrait's mouth moves while it types. The voice bus has its own volume (Settings, Sound, Voices).
- **The planner is pure:** `plan(text, who, mood) → { syllables: [{ t, dur, f0, F1, F2, onset }], duration }`. It is
  tested headless (counts, durations, determinism) without Web Audio.

### 7.17 UI and UX for 10 feet: screens and the UI kit (`40-ui.js`, `50-front.js`)

- **Sizes.** Design at 480×270, which is 4× at 1080p and 8× at 4K.
  - **Body text** is never below the 5×7 font at scale 1 (28 px tall at 1080p). Don't use `font: 'tiny'` for anything a
    player reads.
  - **Menu items** are scale 2, headings scale 3–4 (`E.font.title`), with an outline or shadow on everything over the
    world.
- **Density.**
  - At most 7 focusable items per screen, and one main column or carousel. No scrolling lists: page them instead.
  - Every screen has a footer of prompts ("✕ Select ○ Back") and a way back (○, Esc, Backspace or a right-click).
- **Focus.** One thick focus frame per screen: a 2 px outline in a pulsing sun-yellow plus the pop tween.
  - **Spatial navigation:** the d-pad, stick, arrows or WASD move to the nearest item in that direction, with
    `input.repeat` for held directions.
  - **Mouse:** moving over an item focuses it, and a left click activates it. Mouse movement shows the pointer, and it
    hides after 2 s still in races.
- **Screens.**
  - **Title.**
    - **Logo:** "OutBloom" extruded in a pink → orange → gold gradient, a "2006" badge, and "COAST 2 COAST" on a road
      stripe.
    - **Scene:** Sunrise Strand at dawn, the Orchidea parked, petals drifting, the sea glittering with bloom.
    - **Prompt:** "PRESS ✕" or "PRESS ENTER" by device, plus the version label (`E.versionLabel()`).
    - **Music:** "OutBloom!".
    - **Idle:** after 10 s, the attract mode starts.
  - **Main menu.** A horizontal carousel of six big mode cards, each a small live illustration with a one-line
    description: ARCADE RUN, LOVE IN BLOOM, COAST 2 COAST TOUR, TIME TRIAL, VERSUS 2P and GARAGE GARDEN. Below it, a row
    of three: SETTINGS, HOW TO PLAY, ABOUT & CREDITS.
  - **Garage** (one screen, four rows):
    - **Car:** a carousel turning the car on a turntable through its yaw frames, with 3 stat bars (Speed, Acceleration,
      Handling) and a class badge.
    - **Paint:** swatches.
    - **Driver:** Leo or Lea.
    - **Passenger:** Marisol, Vivi or Juni. Her portrait and a one-line bio show, and her favourite requests as icons.
    - Locked items show a padlock and "Plant it in the Garage Garden".
  - **Radio:** see §7.14.
  - **How to Play:** six pages (Driving, Drifting, Slipstream & near misses, Forks & checkpoints, Love in Bloom, Tour &
    Garden). Each page has a live mini-demo (the race renderer in a framed box driven by the bot) and two sentences
    with glyph prompts.
  - **About & Credits:** paged (§7.25).
- **Transitions** use `game.go(…, { fade: 'wipe' })` with a petal overlay. Reduce motion makes them a plain fade.
- **Engine screens.** The pause menu and the Settings, Controls and Help screens are the engine's standard HTML
  (`E.Shell`). Theme them with the sunset palette and the E8 sizes, and give the Help screen our keys and sections (§7.19).

### 7.18 The race HUD (`41-hud.js`)

The HUD anchors to `r.W`/`r.H` per viewport. Each corner holds one cluster, and the road's centre always stays clear.

| Place | Content |
|---|---|
| top centre | **TIME** (label scale 1, digits scale 4, a little sun icon). "+57" flies in at checkpoints. Red and flashing below 10 s. |
| top left | **SCORE** at scale 2, and under it the **Bloom chain**: five flower icons filling, "×3". |
| top right | stage name and stage time (scale 1), and under them the **mini-map**: 15 dots in the pyramid with your path lit and a pulsing dot for you. In a hub session, the standings strip. |
| bottom right | **speed** digits at scale 3 with the unit (km/h or mph), a tachometer arc (green zone, red line), the gear ("A3" or "M4") |
| bottom left | Love in Bloom only: the passenger portrait (40 px), mood face, petal ring and count, and above it the **request card** (icon, call-out, progress, window bar) |
| centre (brief) | banners: request call-outs, CHECKPOINT, TIME EXTENDED!, FORK arrows, SLIPSTREAM!, NEAR MISS +500, FULL BLOOM!, PERFECT START, GOAL! (scale 3, outlined, at most 2.5 s, never two at once: they queue) |
| near the car | the passenger's speech bubble (pixel font, scale 1, at most 2 lines of 34 characters), above the car's right seat |

**Hints.** While the Hints setting is on, they appear at most once each per profile, with glyphs: "Hold R2 to
accelerate", "Tap ○ while steering to drift", "Tuck in behind a car to slipstream", "Steer left or right at the fork",
and "Rev in the green at GO". Rebinding updates them.

### 7.19 Input and prompts (`00-core.js`, `40-ui.js`; Appendix B)

- **The preset.** `OB.INPUT` keeps the engine's menu actions (`up down left right start pause confirm cancel`) and adds
  `gas`, `brake`, `drift`, `shiftUp`, `shiftDown`, `horn`, `camera` and `radio`. Throttle and brake read `input.analog`
  (E3).
- **Controls screen.** It names every action and lets the player rebind them (the engine's Controls screen).
- **Prompts.** `OB.UI.prompt(g, x, y, action, text, { scale })` draws the glyph for `input.lastDevice`:
  - **Controller:** PlayStation by default. The icons are drawn as sprites: ✕ blue, ○ red, □ pink, △ green; L1, R1, L2
    and R2 as pills; Options and Create as small ovals; the d-pad and sticks. Settings, Controller, Button symbols:
    **Xbox** switches to A (green), B (red), X (blue), Y (yellow), LB, RB, LT, RT and Menu/View.
  - **Keyboard:** keycaps showing the bound key (W, ↑, Space, Esc…).
  - **Mouse:** left and right button and wheel icons.
  - **Labels** come from `input.label(action)` after rebinding. We map them to icons (the font has no ○ □ △).
- **Live switching.** Every prompt (HUD hints, menu footers, the hub card, How to Play) follows the device used last,
  from the next frame.
- **Controller hot-plug.** The engine pauses a race when the pad in use is unplugged. Its banner names the player.

### 7.20 Settings (ours, beside the engine's standard ones)

Group "Game" (with `E.Shell` settings items):

| Setting | Options | Default |
|---|---|---|
| Transmission | Automatic / Manual | Automatic |
| Drift input | All / Brake tap / Drift button | All |
| Steering assist | Off / Low / High | Low |
| Difficulty | Easy / Normal / Hard | Normal |
| Speed units | km/h / mph | km/h |
| Camera | Chase / High / Bumper | Chase |
| Passenger chatter | Full / Less / Off | Full |
| HUD size | Large / Extra large (×1.25 scale steps) | Large |
| Hints | On / Off | On |

Under Sound: **Voices** (0–100 %). Under Controller: button symbols PlayStation or Xbox (E5). The engine's reduce
motion, shake and flash settings cut the petals and speed lines, shake and flashes (bloom stays). Settings are saved per
game (`id: 'outbloom2006'`).

### 7.21 Touch-only devices (`71-touch.js`)

- **Detection.** A device is touch-only when it has touch (`navigator.maxTouchPoints > 0` or `ontouchstart`), has no
  fine pointer (`!matchMedia('(any-pointer: fine)').matches`), no gamepad is connected, and no `keydown` has been seen.
  It is re-checked on `gamepadconnected` and on any `keydown`; either one switches to normal play at once.
- **Behaviour.**
  - Pass `touch: []` on every scene and set `input.touchEnabled = false`, so the engine shows no touch buttons.
  - The title shows a large panel: **"Controller or keyboard required"** with a pad and a keyboard icon, plus a big
    **SETTINGS** button (a tap opens `game.menu('settings')`). The engine's corner menu button stays.
  - **The attract mode runs anyway.** It starts after 10 s as usual. Taps don't count as "input" for leaving it, since
    they can't play. A tap only flashes the notice, except a tap on SETTINGS. The notice stays over the demo, dimmed.
- **Test:** `tools/check.mjs --size 390x844@3` (an emulated phone) shows the notice and no touch buttons, and the
  attract scene starts.

### 7.22 Attract mode (`60-attract.js`)

- **The idle clock.** `OB.UI` tracks the last input: any action press, a stick past the dead zone, a mouse move over
  4 px, a wheel or a click. On the **title, menu, garage, radio, tour, garden, trial and versus** screens, 10 s with
  none starts `attract`. The engine's HTML screens (settings, controls) don't count.
- **The playlist.** Each cycle is about 95 s in five segments, and each cycle picks different stages, rotating through
  all 15 on a seeded order:
  1. **Arcade:** the start line, Bruno's flag, the countdown, a perfect start, drifting the first bends, slipstreaming a
     bus (25 s).
  2. **A fork:** the signs, the bot picking a branch, the sky dissolving, the checkpoint and its stage card (15 s).
  3. **Love in Bloom:** a request (balloons, gnomes or ribbons, rotating), the passenger's call-out, a Perfect, petals
     (20 s).
  4. **Tour:** a Drift Duel moment against Kiki, or the Versus split screen with two bots, alternating each cycle
     (20 s).
  5. **A goal ending:** 10 s of a vignette, then the arcade table with initials and "PRESS START" over the title logo
     (5 s).
- **Cheats on:** `noCollide`, `infiniteTime`, `perfectRequests` and `autoDrift`. The bot (`OB.Brain`) drives.
- **On screen:** a "DEMO PLAY" tag and a blinking "PRESS ✕ / PRESS ENTER" (by the last device) over every segment. The
  game's music plays, with sound effects at 60 %.
- **Leaving.** Any input (as defined above) ends the attract mode at once and goes back to the screen and focus it came
  from. The input that woke it is consumed and does nothing else.
- **Never in a hub session.** It never touches the profile: there is no saving, and no records or seeds.

### 7.23 Dev mode (`61-dev.js`)

- **How to reach it.** From the pause menu's **Dev Mode** item (outside hub sessions), or with F9 while paused. The
  panel opens over the frozen race (`timeScale = 0` while open), and Back returns to the pause menu.
- **Looks.** It is a canvas panel in the UI kit, large and pad-navigable (L1/R1 or Q/E switch tabs, the mouse drags
  sliders).
- **Tabs:**
  1. **Tuning:** a live slider for every Appendix A value, in groups (Car, Drift, Slipstream, Traffic, Clock, Rivals,
     Love in Bloom, Camera, World). Each row shows its value, a reset-this-row button and a ● when it differs from the
     default. **RESET ALL TO DEFAULTS** sits at the top. Changes apply on the next step. With "Keep after reload" on,
     values are saved to `E.store('outbloom:dev')`.
  2. **Cheats:** infinite time, no collisions, perfect requests, auto drive (the bot drives you), auto drift, freeze
     traffic, no traffic, invincible mood, show hitboxes, show the debug overlay (stage, segment, z, x, v, rpm, gear,
     curve, drift a and score, slip, Bloom points, request state, traffic count, frames per second), hide the HUD,
     slow motion ×0.25 and fast ×2.
  3. **Warp:** jump to any of the 15 stages at 0/25/50/75/95 %, the next checkpoint or the fork, a forced fork side,
     play any goal ending at any tier, trigger any request type now, spawn a traffic car or ribbon pair ahead, spawn a
     rival, set the time of day and weather, play the attract demo, play the credits, start any mission.
  4. **Audio:** a jukebox (every song with its layers toggled), every sound effect, every character's voice with a
     sample line in each mood, and the reverb amount.
  5. **Save:** give 1,000 seeds, unlock everything, clear the career, set every mission's rank, reset the profile (asks
     first, in the panel), and show the profile as JSON in a read-only, paged view.
  6. **Info:** version, seed, route, last 20 bus events, error count.

### 7.24 Saves and progression data (`26-progress.js`)

One profile in `E.store('outbloom:profile')`, versioned with `v: 1` and a `migrate(from)` table. It is written after
each run, mission, purchase and settings change, never on page close. Where storage is blocked, the game plays on for
the visit.

```js
{ v: 1, seeds: 0, seenIntro: false,
  unlocked: { cars: ['primavera', 'orchidea'], editions: [], paints: ['base'], songs: [0,1,2,3,4], outfits: { marisol: [0], vivi: [0], juni: [0] }, mirror: false },
  last: { car: 'orchidea', paint: 0, driver: 'leo', passenger: 'marisol', station: 0, transmission: 'auto', camera: 'chase' },
  career: { M1: { cleared: true, rank: 'A', best: 41250 }, … },
  goals: { A: { bloom: true, bud: false, wilt: false }, … },
  records: { stage: { S1: { ms, ghost } }, route: { 'LRRL': { score, ms } }, medals: { S1: 'gold' } },
  hints: { drift: true, … } }
```

The arcade tables use `E.Arcade` (ids `'outbloom-arcade'` and `'outbloom-love'`).

### 7.25 About and Credits

The About & Credits screen has big pages, turned with ◀ ▶ (or a click on the arrows), one heading and at most about 8
short lines each:

1. **Credits:** the game; built on the my-3D2dge engine (MIT); AI Hub session protocol; the asset-library credits for
   any store set used (with each set's `credit` line); "Inspired by OutRun 2006: Coast 2 Coast (SEGA / Sumo Digital,
   2006). An original homage. Not affiliated."
2. **Source Information**, the 14 fields of `TASK.md` in its words, with "unknown" where it can't be confirmed:
   Date, Source, Plan (`PLAN.md`), Genre and Perspective, Tech, Art Direction, Animation, Audio, Online, Testing,
   Research, Environment, Model and Usage.
3. **Testing Feedback** (4 answers). 4. **Engine Feedback** (6 answers). 5. **Prompt Feedback** (4 answers).

These pages read from one data object, `OB.ABOUT`, which `build.mjs` also writes into `exit-interview.json`. That keeps
the in-game text and the JSON identical. Fill in the real answers at the end of the build (§10, M9).

---

## 8. Content

### 8.1 Bellafiore and the story

- **The island.** Bellafiore is a sun-soaked island country shaped like a leaf, with an eastern **Alba Coast**
  (sunrise) and a western **Vespera Coast** (sunset). Between them lie lavender ridges, lemon cliffs, sunflower
  prairies, a mountain lake, a red canyon, alpine passes in cherry blossom, an old walled town, wine country, a pink
  lagoon, a jungle, a neon riviera, a starry desert and the windy highlands.
- **The festival.** Every spring, the whole island blooms in a single week, the *Settimana dei Fiori*.
- **The premise.** It is the first morning of the festival. You (Leo or Lea), a young driver with a borrowed Fioretti
  and big dreams, promised your passenger the perfect day: "coast to coast before the sun goes down". Bruno Brezza, a
  rally legend who now runs the island's festival tour, waves you off from the Sunrise Strand.
- **Story beats** (lines in §8.11):

| Beat | Mode | What happens |
|---|---|---|
| Dawn start | Arcade, Love | Bruno: "Morning, champ! The west coast is waiting, and so is the sunset!" The passenger answers with her own opener. |
| Each fork | Love | the passenger's preference, with a reason in character |
| Each checkpoint | all | a line about the next region ("Lavender! Smell that?") |
| Time running low | all | the passenger worries in character |
| Goal | all | the ending vignette for that goal and mood (§8.3) |
| Tour opening | Tour | Bruno's garage. He hands you the Tour's postcard book. |
| Giver intros and outros | Tour | 3 lines each, opening and closing every giver's arc |
| Finale | Tour | the group photo at the goal, Bruno's toast ("To the road, and to whoever's beside you on it!"), then the credits |

### 8.2 The stages (all 15)

Shared rules for every stage:
- 820–980 segments long, with a junction or goal run-in after that.
- The first 150 segments are flat.
- Two or three request slots (in Love in Bloom), never inside the first 120 segments or the junction.
- 4–8 scenery rules and at least 2 landmarks.
- A target time of 52–64 s for the reference bot with the Orchidea on Normal. The test checks every stage falls in
  48–70 s.

Curve values run from −6 to 6 (+ bends right). Hills are in units over the section.

| ID | Name (row/col) | Kit · time of day | Lanes · difficulty | Layout beats (in order) | Landmarks and set pieces | Traffic mix | Love in Bloom slots |
|---|---|---|---|---|---|---|---|
| S1 | **Sunrise Strand** (1/1) | beach · dawn | 3 · ●○○○○ | the start grid; a long straight; 3 gentle S-bends (curves of 2–3); a palm avenue whose fronds meet overhead (a span); a seawall bend (4); a rise and a dip to the junction | the pier with its Ferris wheel (left, mid-stage); pastel beach huts; lifeguard towers; the start gantry with Bruno | hatch 3, van 1, icecream 0.4, bus 0.6 | balloons (12) at 18 %; pass (8) at 62 % |
| S2 | **Lavender Ridge** (2/1) | fields (lavender) · morning | 3 · ●○○○○ | 6 rolling crests (hills of ±1500, small air on 2); long sweepers (2–3); one 4 with a farmhouse on the outside | hot-air balloons in the sky; a stone farmhouse with a water tower; beehive rows (the bees' home) | hatch 2, van 2, pickup 1, camper 1 | bees (8) at 25 %; drift (target 2 long drifts) at 65 % |
| S3 | **Lemon Cliffs** (2/2) | cliffs · morning | 2 · ●●●○○ | the cliff wall on the right (edge `cliff`), a rail and the sea drop on the left; tunnel 1 (60 segments); bends of 4–5; a gallery tunnel open to the sea (light stripes); a 6 hairpin before the junction | a terraced pastel village across the bay; lemon groves; a cliff chapel | scooter 2, hatch 2, van 1, bus 0.5 | cones (10) at 20 %; close (5) at 60 % |
| S4 | **Sunflower Prairie** (3/1) | fields (sunflower) · late morning | 4 · ●○○○○ | very flat; two 30-second straights; wide sweepers (1–2); a level crossing at 50 % with a train in the backdrop | red barns and silos; wind turbines with turning blades; a giant hay-bale sculpture of a sunflower | tractor 1.5, pickup 2, sedan 2, truck 1 | draft (6 s) at 20 %; speed (≥ 250) at 60 % |
| S5 | **Lake Serenata** (3/2) | lake · noon | 3 · ●●○○○ | lake water on the left, pines on the right; a long timber truss bridge (rails both sides, shadow stripes); a waterfall bend (4); a sun-shower event from 55 to 75 % (wet shine, spray, a rainbow in the sky) | a paddle steamer moving on the lake; boathouses; the waterfall | sedan 2, camper 2, van 1, bus 0.5 | arches (7) at 22 %; bouquets (12) at 66 % |
| S6 | **Rosa Canyon** (3/3) | canyon · noon | 2 · ●●●●○ | big dips and crests (±4000, air ×3); bends of 5–6; 3 rock arches (short tunnels); heat shimmer | mesas; a natural rock arch over the road; flowering cacti; a gnome souvenir stand | pickup 2, truck 1, camper 1 | gnomes (10) at 30 %; drift at 70 % |
| S7 | **Cherry Pass** (4/1) | alpine · afternoon | 3 · ●●○○○ | a climb of +6000 overall; 3 hairpin sequences (6, then 5); 2 snow sheds; a petal storm from 40 to 70 %; the descent to the junction | snowy peaks; chalets; cherry trees in bloom; cows in meadows | sedan 2, camper 1, bus 1, van 1 | drift at 25 %; clean at 60 % |
| S8 | **Old Town Fiorenza** (4/2) | town · afternoon | 3 (2 in the gate) · ●●●○○ | cobbles; facades on both sides; bunting spans; a city-gate tunnel; four sharp corners (6, short); a piazza where the road widens to 4 around a fountain sweep | the cathedral dome (photo spot); a flower market; café awnings; a fountain | taxi 2, scooter 3, van 1, bus 1 | photo (cathedral) at 35 %; pass (10) at 70 % |
| S9 | **Vineyard Way** (4/3) | vineyard · late afternoon | 3 · ●●●○○ | rolling hills (±2000); a cypress avenue (dense runs both sides); sweepers (3–4); one 5 below the castle | a hilltop castle; villas; grape rows (ground `rows`); barrel stacks | tractor 1, pickup 2, van 1, sedan 1 | gnomes (10) at 20 %; ribbons (5) at 62 % |
| S10 | **Seafoam Causeway** (4/4) | lagoon · late afternoon | 2 · ●●●●● | water on both sides, behind low rails; long and fast; 5 crosswind gusts; a lift-bridge hump (air); salt pans with pink water | a flamingo flock taking off as you pass; salt pyramids; the lift bridge | sedan 2, truck 2, camper 1 | balloons in the wind (12, drifting sideways) at 25 %; speed (≥ 240) at 65 % |
| S11 | **Golden Bay** (5/1) | beach · sunset | 3 · ●○○○○ | the sea on the right this time; a promenade with lantern strings (lit); gentle sweepers; the run-in to the goal | sailboats; beach volleyball nets; a lantern-festival stage → **Goal A** | hatch 2, icecream 0.5, bus 1, van 1 | bouquets (12) at 25 %; balloons (14) at 62 % |
| S12 | **Orchid Jungle** (5/2) | jungle · sunset | 3 · ●●○○○ | canopy spans (light shafts); a wet road; bends of 3–5; a vine bridge with rails; ruin arches | waterfalls; ancient stone ruins; glowing orchids (emissive); parrots | pickup 2, camper 1, van 1 | arches (8) at 22 %; bees (8) at 60 % → **Goal B** |
| S13 | **Moonlit Riviera** (5/3) | night city · night | 4 · ●●●○○ | a marina promenade; wide sweepers; 2 tunnels under the city with sodium lamps; fireworks over the water from 60 % | the casino with its giant neon flower; yachts with lights; a funicular | taxi 2, sedan 3, bus 1, scooter 2 | close (6) at 30 %; ribbons (6) at 65 % → **Goal C** |
| S14 | **Starlight Desert** (5/4) | night desert · night | 3 · ●●●●○ | long fast straights; big crests (air ×4); 2 bends of 5 | night-blooming cacti (emissive white); a neon motel; a radio-telescope dish; shooting stars | truck 2, pickup 2, camper 1 | draft (6 s) at 25 %; cones (12) at 60 % → **Goal D** |
| S15 | **Aurora Highlands** (5/5) | highlands · twilight | 2 · ●●●●● | stone walls on both edges; blind crests; bends of 5–6 in pairs; a narrow stone bridge | the aurora overhead; standing stones; a castle ruin; heather | sedan 1, camper 1, truck 1, pickup 1 | drift at 20 %; clean at 58 % → **Goal E** |

**Forks** (left/right): S1→S2/S3 · S2→S4/S5 · S3→S5/S6 · S4→S7/S8 · S5→S8/S9 · S6→S9/S10 · S7→S11/S12 ·
S8→S12/S13 · S9→S13/S14 · S10→S14/S15. Each row-5 stage ends at its own goal: S11→A, S12→B, S13→C, S14→D, S15→E.

**S1 in full, the worked example** (`[segments, curve, hill]`):

```
[150,0,0]  start grid at seg 20 (gantry, Bruno at x = −1.6), flat by rule
[70,2,0] [40,0,0] [70,-3,0] [60,0,800] [50,3,-800]
[90,0,0] {span: 'palms', 90 segs}
[60,-2,0] [50,4,0] {edgeL: 'stonewall', groundL: 'water' (the seawall bend)}
[80,0,1200] [70,0,-1200] [60,-3,0]
[40,0,0]   → junction (80) to S2 | S3
```

That totals 890 segments plus the junction. Ground: sea on the left (`water` with foam rows) and sand on the right
(`sand`). Scenery rules: palm (R, offset 0.4–1.6, every 4, jitter 2), umbrella clusters (R, 0.6–2.2, every 9, cluster
3), beach huts (R, 2.4, every 26), lifeguard tower (R, 1.8, every 60), surfboard racks (R, every 33), buoys on the water
(L, every 12, 1.5–4.0).

### 8.3 Goals and endings (5 goals × 3 moods)

Each ending is a 10–14 s side-view vignette. It has a backdrop (the goal's own sky), props, the car arriving and
parking, the couple stepping out, a local character or the crowd, and **3 beats**: an arrival line, the passenger's line
for this mood (one per passenger, so 5 × 3 × 3 = 45 lines), and a caption card. Arcade mode picks the mood from the time
left: Bloom at 20 s or more, Bud at 5 s or more, Wilt below. Love in Bloom picks it from the grade (§7.7).

| Goal | Place | Bloom | Bud | Wilt |
|---|---|---|---|---|
| A | **Lantern Pier**, Porto Lucciola | a thousand lanterns rise; the pier cheers; she kisses your cheek; fireworks | the two of you release one lantern together | the lanterns are already gone, so she sulks: "You owe me gelato." |
| B | **Petal Falls Chapel** | you crash a wedding by accident, she catches the bouquet and winks: "Don't get any ideas. Yet." | the guests wave you in for cake | soaked by the waterfall spray, you run off laughing |
| C | **Grand Hotel Vespera** | red carpet, flashbulbs, fireworks over the bay | the valet takes the keys with a bow | the valet won't park "that dusty thing", so you eat at the noodle cart and she secretly loves it |
| D | **Stargazer Observatory** | the dome opens to a meteor shower and you both make wishes | one shooting star | clouds roll in; the astronomer offers cocoa |
| E | **Finisterra Lighthouse** | the green flash at sunset: "Best. Day. Ever." | the last sliver of sun | the sun is gone and the wind is cold, so you share your jacket |

Caption card: "GOAL C · GRAND HOTEL VESPERA". Underneath is the mood title: "BLOOM: A Star Arrives" / "BUD: Valet
Parking" / "WILT: Noodles Under the Neon". Write all 15 titles in that pattern.

### 8.4 The cars: Fioretti, five open-tops

| Id | Name | Look (recipe, §9.3) | Top km/h | 0–100 s | Steer | Drift grip | Weight | Engine | Class · how to get it |
|---|---|---|---|---|---|---|---|---|---|
| `primavera` | **Primavera 300 Spider** (1962) | round fenders, chrome bumpers, tiny fins, a wood steering wheel; cream | 245 | 5.8 | 2.35 | 0.92 (easy) | 0.85 | 4 cylinders, warm | Novice · start |
| `orchidea` | **Orchidea Spider** (2004), the default | a modern wedge-soft body, twin roll hoops, round tail lamps; coral red | 272 | 4.5 | 2.20 | 0.85 | 1.00 | V8 | Novice+ · start |
| `gardenia` | **Gardenia GT Targa** (1987) | a sharp wedge, pop-up lamps, side strakes, a targa bar; pearl white with pink pinstripes | 292 | 4.0 | 2.00 | 0.78 (hard) | 1.05 | flat-12, rasp | Intermediate · garden, 600 |
| `magnolia` | **Magnolia V12 Barchetta** (1998) | a long bonnet, no roof at all, twin humps; deep blue | 305 | 4.2 | 1.95 | 0.84 | 1.20 | V12, smooth | Intermediate+ · garden, 900 |
| `girasole` | **Girasole Hyper Spider** (2026) | a low canopy-less hypercar, a sunflower-petal rear diffuser, LED strips; sunflower yellow | 330 | 3.0 | 1.85 | 0.80 (tricky) | 1.10 | V12 hybrid with an electric whine | Expert · garden, 1500 (needs the Finale cleared) |

- **Bloom Editions** of the Primavera (400) and the Orchidea (500): +8 km/h, −0.3 s to 100, +0.1 steer, +0.04 drift
  grip, petal decals and a gold trim colour.
- **Paints.** Each car has 4 base paints. Four packs come from the garden (100 each): Pastel, Metallic, Retro and Neon,
  4 paints each.
- **Recolouring.** Paint is a 5-tone ramp swapped with `E.recolor` on the pre-rendered frames; the art uses a key ramp
  (§9.3).
- **Unlock flow.** A car's garden bed only appears once its mission reward has "delivered the seed packet": Gardenia
  after B2, Magnolia after V2, Girasole after the Finale. Until then the bed is locked with that text.

### 8.5 The cast

| Who | Role | Look (Humanoid options) | Personality, and the requests she loves |
|---|---|---|---|
| **Leo** / **Lea** | you, the driver | `build: 'heroic'`, short quiff or ponytail, aviator shades (a face sprite), open-collar shirt; 3 palettes | silent; reacts with body language |
| **Marisol Fontaine** | passenger, florist, giver | long wavy auburn hair, a sunflower clip, a sundress (`outfit: 'robe'`, short sleeves), heart sunglasses | sunny, playful, giggly; loves **balloons, gnomes, bouquets, arches** |
| **Vivienne "Vivi" Montclair** | passenger, socialite, giver | sleek black bob, a silk scarf (ribbon), a cream blazer (`outfit: 'coat'`), pearl trim | dramatic, demanding, secretly soft; loves **clean, speed, photo, pass** |
| **Juniper "Juni" Park** | passenger, stunt photographer, giver | short spiky pink hair, cap backwards (`hat: 'cap'`), cargo jacket, a camera strap | thrill-seeking, fast-talking; loves **close, drift, ribbons, draft** |
| **Bruno Brezza** | the starter, mentor, giver | `build: 'bulky'`, a big grey moustache, panama hat, floral shirt, the sunflower flag | booming, warm, nostalgic: "In my day…" |
| **Kiki Rapido** | rival, the drift queen | short green hair, racing gloves; drives a lime Gardenia | cheeky; taunts with a wink |
| **Bram and Basil Bramble** | rivals, brothers who love the draft | twin beards, overalls; drive a hot-rod pickup | bicker with each other |
| **Lance and Lacey Lustre** | the rival couple | matching gold outfits, sunglasses at night; drive a gold Magnolia | smug glamour |
| **Old Ottavio** | rival, a Knockout surprise | white hair, beret; drives a burgundy Primavera | sweet grandpa, late braker |
| **Locals** | ending extras | a lantern-seller, the wedding party, a valet, an astronomer, the lighthouse keeper | one line each |

**Outfits** (garden, 150 each): Marisol "Picnic Gingham", Vivi "Gala Gown" (with sequins), Juni "Rally Suit".

### 8.6 Traffic and the roadside

**Traffic types** (`OB.TRAFFIC`). Half-width is in half-roads.

| Id | Vehicle | km/h | Half-width | Notes |
|---|---|---|---|---|
| `hatch` | small hatchback | 95–120 | 0.18 | 5 paints |
| `sedan` | family sedan | 100–130 | 0.20 | — |
| `taxi` | city taxi | 90–115 | 0.20 | roof light |
| `van` | delivery van | 85–110 | 0.22 | flower decals |
| `pickup` | pickup | 90–115 | 0.21 | crates in the bed |
| `camper` | camper van | 70–95 | 0.23 | surfboard on top |
| `bus` | tour bus | 70–90 | 0.27 | long: 2 lengths |
| `truck` | flower lorry | 65–85 | 0.30 | potted plants; 2 lengths |
| `tractor` | tractor | 35–50 | 0.24 | farm stages only; blinking orange light |
| `scooter` | scooter | 80–100 | 0.10 | rider rig |
| `icecream` | ice-cream truck | 60–75 | 0.24 | plays its jingle within 3,000 units |

Densities by stage come from §8.2's mix weights × the base density 0.32 (vehicles per 10,000 units per lane). Hard
stages add 0.05.

**Roadside sets per kit.** These are sprites. Core props are `E.prop(name)`, store and own shapes are `E.shapeSprite`,
and ★ marks what we draw new.

| Kit | Ground and strips | Scenery |
|---|---|---|
| beach | sand and water | palm, ★umbrella, ★beach hut, ★lifeguard tower, ★surf rack, rock, ★buoy, ★Ferris-wheel pier |
| fields | `rows` in lavender or sunflower colours | ★cypress, bush, ★farmhouse, ★beehives, ★silo, ★barn, ★wind turbine (animated), ★hay bale, fence |
| cliffs | cliff edge and rail | rock (store `kenney-nature` cliff pieces), ★lemon tree, ★terraced house cluster, ★chapel, sign |
| lake | water and pines | pine, ★boathouse, ★paddle steamer (moving), ★truss bridge (strip and spans), ★waterfall (animated) |
| canyon | rock and sand | ★mesa pillar, ★rock arch (span), cactus in flower (★ a variant of the core cactus), rock, ★souvenir stand |
| alpine | snow and grass | ★cherry tree (blossom, petals), pine, ★chalet, ★cow, ★snow shed (span), rock |
| town | cobble and facades | ★arcade facade (strip), awning, ★market stall, lantern, streetlamp, ★fountain, ★cathedral dome (landmark), banners (bunting span) |
| vineyard | `rows` of grapes | ★cypress, ★villa, barrel, ★castle on a hill (landmark), ★wine cart, fence |
| lagoon | water both sides, low rails | ★flamingo (flock animation), ★salt pyramid, ★lift bridge, lamp |
| jungle | grass and wet | palm, ★giant leaf, ★fern, ★ruin arch (span), ★orchid (emissive), ★waterfall, ★parrot |
| night city | facades and a neon strip | ★neon sign set (6 messages), ★yacht, ★casino flower (landmark), streetlamp (lit), ★funicular |
| night desert | sand | cactus, ★night-bloom cactus (emissive), ★motel sign, ★radio dish, rock |
| highlands | heather and stone walls | ★standing stone, ★castle ruin, rock, bush (heather tint), ★sheep |

**Request objects** (★ all): heart balloon (3 colours), gnome (googly eyes), bee swarm (Blobs with `wings: true`), ribbon
(a pink strip between 2 cars), cone, flower arch, bouquet, photo box (asphalt paint) with a photographer rig, gate
flowers in 5 colours (Memory Lane).

**Signs** (★): the fork sign (two names, arrows, flowers), CHECKPOINT and GOAL arches, ROAD CLOSED barriers, the
wind-sock warning, the stage name boards, and billboards with original fake ads: "Gelato Gelatissimo", "Fioretti — Born
to Bloom", "Radio Petal FM", "Hotel Vespera". Billboards are written in the pixel font.

### 8.7 Love in Bloom requests (all 14)

Thresholds are scaled by the `requestDifficulty` tuning. A miss gives 0 petals and a mood drop.

| Type | Call-out (card) | Setup in the window | Measure | Perfect / Great / Good |
|---|---|---|---|---|
| `pass` | PASS {n} CARS! | traffic ×1.6; n is 6–10 | clean overtakes | ≥ n / ≥ .75n / ≥ .5n |
| `drift` | DRIFT FOR ME! | the window covers the stage's twistiest part | drift score against target T (2 long drifts) | ≥ T / ≥ .7T / ≥ .4T |
| `ribbons` | CUT THE RIBBONS! | k = 4–6 ribbon pairs | snapped / k | 100 % / ≥ 70 % / ≥ 40 % |
| `balloons` | POP THE BALLOONS! | 10–16 balloons at car height in lines and zigzags | popped / total | ≥ 90 % / ≥ 70 % / ≥ 45 % |
| `gnomes` | BONK THE GNOMES! | 8–12 gnomes standing on the road | bonked / total | ≥ 90 % / ≥ 70 % / ≥ 45 % |
| `bees` | DODGE THE BEES! | 6–10 swarms crossing lanes on sine paths | hits (a hit stings: a wobble and a mood drop) | 0 / 1 / 2 |
| `cones` | SLALOM THE CONES! | 8–12 cones on a line | cones passed on the correct alternating side | ≥ 90 % / ≥ 70 % / ≥ 45 % |
| `arches` | THROUGH THE ARCHES! | 6–8 one-lane flower arches that step between lanes | passed / total | 100 % / ≥ 75 % / ≥ 50 % |
| `speed` | KEEP IT OVER {v}! | v is 230–260 (in the player's units) | share of the window above v | ≥ 95 % / ≥ 80 % / ≥ 60 % |
| `clean` | NOT A SCRATCH! | a window of about 15 s with dense traffic | contacts (bumps, crashes, scrapes) | 0 / — / 1 |
| `draft` | STAY IN THE DRAFT! | traffic queues to draft behind | seconds of slipstream above 0.5 | ≥ 6 / ≥ 4 / ≥ 2 |
| `close` | CLOSE CALLS! | denser traffic | near misses | ≥ n / ≥ .7n / ≥ .4n (n is 5–6) |
| `bouquets` | GRAB THE BOUQUETS! | 10–14 bouquets, some on the inside of bends and beside traffic | collected / total | ≥ 90 % / ≥ 70 % / ≥ 45 % |
| `photo` | STOP FOR A PHOTO! | a painted box, 2 segments long, at a landmark, with a photographer | **Perfect:** below 50 km/h with the car wholly inside the box and under 3.0 s lost. **Great:** stopped in the box. **Good:** through the box below 100 km/h. | — |

The photo stop costs clock time, a deliberate risk against the reward. Juni and Vivi say a different line for it.

### 8.8 The Coast 2 Coast Tour missions (14)

| # | Giver · title | Route | Rules (`OB.Rules` kind) | C / B / A / AAA | Seeds (base) and unlock |
|---|---|---|---|---|---|
| B1 | Bruno · **First Light Sprint** | S1 to its checkpoint | `sprint`: reach it with the clock from 52 s | 0 s / 5 s / 9 s / 13 s left | 150 |
| B2 | Bruno · **Drift Duel** | S2 | `driftduel` against Kiki: more drift points by the stage's end. Live points bar for both. | win / +10 % / +25 % / +45 % margin | 200 · the Gardenia bed |
| B3 | Bruno · **Draft Dash** | S4 | `draftdash` against the Bramble Brothers: slipstream points (seconds × speed) plus finishing first | win / +10 % / +25 % / +40 % | 250 |
| B4 | Bruno · **Last One Wilts** | S5 → S8 → S12, then Goal B | `knockout`: 5 racers (you, Kiki, Brambles, Lustres, Ottavio). The last at each checkpoint is out; finish first. | top 2 / 1st / 1st +2 s / 1st +5 s | 300 · the "Lemon Drop Rush" bed |
| M1 | Marisol · **Balloon Bonanza** | S1 | `collect` balloons: 40 spread over the stage | 20 / 26 / 32 / 38 | 150 |
| M2 | Marisol · **Gnome Patrol** | S9 | `collect` gnomes (24) with bees: a bee hit costs 2 | 10 / 14 / 18 / 22 net | 200 · the Picnic Gingham outfit |
| M3 | Marisol · **Memory Lane** | S2 | `memory`: she shows a 5-colour flower sequence (2 s per colour), then 5 gate sets with 3 coloured gates each; drive through the right colour | 3 / 4 / 5 / 5 with no hints shown | 250 · the "Moonflower" bed |
| V1 | Vivi · **Not a Scratch** | S8 | `clean`: zero contacts, ranked by time | under par +12 s / +6 s / +2 s / under par | 200 |
| V2 | Vivi · **Fashionably Fast** | S10 | `speedkeep`: above 240 km/h for the stage, in crosswinds | 70 % / 80 % / 88 % / 95 % | 250 · the Magnolia bed |
| V3 | Vivi · **Heartbreakers** | S11 → Goal A | `heartbreak` against Lance and Lacey: both couples start with 20 petals. Every 2 s behind them drains 1, every pass steals 2 (both ways), and theirs drain the same. End with more than 0, or make theirs 0. | > 0 / ≥ 10 / ≥ 18 / theirs at 0 | 300 · the Gala Gown outfit |
| J1 | Juni · **Close Calls** | S3 | `count` near misses | 8 / 12 / 15 / 20 | 150 |
| J2 | Juni · **Ribbon Cutter** | S7 | `count` ribbons: 16 pairs | 8 / 11 / 14 / 16 | 200 · the Rally Suit outfit |
| J3 | Juni · **The Perfect Shot** | S6 | `photo3`: 3 photo boxes; the score is the sum of photo ratings | 1 Good each / 2 Great / 3 Great / 3 Perfect | 250 · the Mirror Roads bed |
| F | Bruno and all · **Coast 2 Coast** | the full pyramid, forks open | `love`: Love in Bloom rules with all request types, and the passenger you choose | grade B / A / AA / AAA at any goal | 500 · the Girasole bed, the credits |

Every rival mission shows the rival's portrait and a live gap on the HUD.

### 8.9 The Garage Garden: beds and costs

| Bed | Seeds | Bed | Seeds |
|---|---|---|---|
| Gardenia GT Targa | 600 | Song "Lemon Drop Rush" | 300 |
| Magnolia V12 Barchetta | 900 | Song "Moonflower" | 300 |
| Girasole Hyper Spider | 1500 | Paint packs ×4 | 100 each |
| Primavera Bloom Edition | 400 | Outfits ×3 | 150 each |
| Orchidea Bloom Edition | 500 | Mirror Roads | 800 |

That totals **6,150 seeds**. All 14 missions at A (base 3,350 × 1.5) give 5,025. Arcade runs give about 150–350 each, so
the economy test's "everything within 14 A-ranks plus 6 runs" holds.

### 8.10 Music (all original, all in code)

Radio stations, in dial order:

| # | Station | Song | BPM · key | Style and instruments | Progression (per 2 bars) | Hook idea |
|---|---|---|---|---|---|---|
| 1 | 88.6 PETAL FM | **Sunburst Samba** | 128 · D major | Latin fusion: congas, timbales, slap bass, brass stabs, steel-drum lead, e-piano comping | Dmaj7 · Bm7 · Em7 · A7sus4–A7 | the steel drum climbs a 6th and falls by step, with a timbale fill into each chorus |
| 2 | 91.2 SUN FM | **Coastline Crush** | 116 · F major | Balearic pop-funk: four on the floor, a chorus-guitar skank, finger bass, a soft pulse lead, pad | Fmaj7 · Em7 · Dm7 · Gm7–C9 | a breezy 3-note pickup into a long held note |
| 3 | 94.8 SHORE FM | **Shuffle on the Shore** | 110 shuffle (swing in 12/8 feel, steps 3) · B♭ major | jazz shuffle: organ, walking bass, brushed snare, sax lead | B♭6 · G7 · Cm7 · F7 (turnaround) | call and response between the sax and the organ |
| 4 | 99.1 VESPA FM | **Vespa Vendetta** | 152 · A minor | Eurobeat: octave saw bass, supersaw stabs, fast 16th arps, a bright lead | Am · F · G · E7 | the chorus jumps an octave on beat 3 |
| 5 | 103.5 PASTEL FM | **Pastel Highway** | 104 · E♭ major | city pop: DX-style e-piano, slap bass, sax or lead, claps on 2 and 4, pad | A♭maj7 · Gm7 · Fm7 · B♭7sus4 | a sax lick answered by e-piano chords |
| 6 | 106.3 ZEST FM (unlock) | **Lemon Drop Rush** | 140 · G major | acid jazz into breakbeat: breakbeat drums, a rubbery 303-ish bass (resonant filter env), organ stabs | G7 · C7 · G7 · D7–C7 | an organ riff in 4ths |
| 7 | 108.8 MOON FM (unlock) | **Moonflower** | 92 · C♯ minor | a night synth ballad: a pad, marimba arps, a soft lead, a slow kick | C♯m9 · Amaj7 · E · B | a long lead line with a slide |

Other music:

| Song | Use | Notes |
|---|---|---|
| **OutBloom!** | title | 120, C major; a brass fanfare into a samba groove |
| **Garden Party** | menus, the Tour, the garden | 100 bossa nova; e-piano and nylon pluck |
| **Petal Count** | results | 112; a light funk loop |
| **Last Light Lullaby** | the credits and Bloom endings | 84 |

Jingles (played with `sting`):

| Jingle | Feel |
|---|---|
| start fanfare | 2 bars |
| checkpoint | a bright V–I |
| request start | a rising triplet |
| request success | a major arpeggio up |
| request fail | the trombone slide |
| fork tick | — |
| Full Bloom | a sparkle sweep |
| goal fanfare | 4 bars |
| new record | — |
| unlock bloom | — |
| game over | "Sunset Blues", a slow minor-blues turnaround |

Every song needs its named layers and a `sparkle` layer (§7.14).

### 8.11 Writing style and the line bank

**Style.**
- Short, sunny, cheeky, like a peppy arcade passenger who is half sweetheart, half backseat driver.
- Exclamation-heavy but never mean. A touch of cheese and a wink. No profanity.
- **Lengths:** call-outs ≤ 20 characters, in caps. Spoken lines ≤ 40 characters, 1–2 per bubble.
- Banners are 1–3 words. Ending captions are a postcard sentence.
- Each character's voice stays distinct: Marisol bubbly, Vivi theatrical ("Darling…"), Juni breathless slang, Bruno
  booming with "champ".
- **Required counts:** each passenger has ≥ 4 variants for each reaction (request intro per type, Perfect, Great, Good,
  Miss, bump, crash, near miss, air, fork preference left and right, checkpoint, low time, goal, start). Bruno has ≥ 3
  per event.

**Seed lines** (use them, then write the rest in the same voice):

| Who | Event | Lines |
|---|---|---|
| Marisol | start | "Coast to coast? With you? Let's GO!" |
| Marisol | balloons | "Ooh, balloons! Pop them all for me!" |
| Marisol | Perfect | "Eee! You're amazing!" · "Again, again!" |
| Marisol | Miss | "Aww… you missed so many." |
| Marisol | crash | "Kyaaa! My hair!" |
| Marisol | fork left | "Left! I want to smell the lavender!" |
| Marisol | low time | "Hurry, the sun's slipping!" |
| Vivi | start | "Darling, do try not to dent anything." |
| Vivi | speed | "Faster. I refuse to arrive second." |
| Vivi | Great | "Hmm. Adequate. Barely." |
| Vivi | Perfect | "Now THAT is how one arrives!" |
| Vivi | bump | "Was that a… car? Unacceptable." |
| Vivi | fork right | "Right, the cliffs. Everyone who matters goes that way." |
| Juni | start | "Okay okay okay, get me some ACTION!" |
| Juni | close | "Closer! Closer! I need the shot!" |
| Juni | near miss | "WHOA, did you see that?!" |
| Juni | Miss | "Boooring. Give me danger!" |
| Juni | Perfect | "Best shot of my LIFE!" |
| Juni | air | "We're FLYING!" |
| Bruno | start | "Morning, champ! The west coast is waiting!" |
| Bruno | drift | "Ho ho! You drift like my rally days!" |
| Bruno | mission win | "Mamma mia, what a finish!" |
| Bruno | mission fail | "Again, champ! Even I spun out in '79." |
| Announcer | — | "CHECKPOINT!" · "TIME EXTENDED!" · "GOAL!" · "FULL BLOOM!" · "PERFECT START!" · "NEW RECORD!" |

Ending captions (one per goal and mood), for example: "GOAL A · LANTERN PIER: A thousand lanterns, and one just for
you two." · "GOAL E · FINISTERRA LIGHTHOUSE: The green flash. Best. Day. Ever."

Help, briefs and the How to Play text use the same voice, plainly.

---

## 9. Art direction and asset recipes

### 9.1 Rules

- **Base style.** The engine's native style: pixel art at 480×270, shaded with `E.tones` (cool shadows, warm lights, a
  `hi` sparkle). Everything is drawn with `E.px.*`, `E.font`, sprites and shapes. Never use `ctx.arc`, `stroke`,
  `fillText` or canvas gradients on the buffer. Translucency goes through `px.blend` or the dither helpers.
- **Fog and distance.** Use the road module's fog (colour per time of day). Far sprites fade to the fog colour at the
  module's stepped alpha.
- **Palettes.** Every kit has five swatches: `ground`, `ground2`, `accent`, `rock` and `sky` ramps. Time of day applies
  a grade on top: dawn peach and lilac, noon clean and saturated, late afternoon gold, sunset magenta to orange, night
  indigo with neon.
- **Sizes.**
  - **The player's car** is about 128 px wide at the screen's bottom (480 wide).
  - **Traffic** is drawn from the same model scale.
  - **Palms** at the edge reach about 160 px tall near the camera.
  - **Rigs in the car:** heads about 12–14 px, with the upper body showing.
  - **Ending rigs** are about 70 px tall (size 1.6).

### 9.2 Sky presets (`OB.Sky`, in `01-data-world.js`)

Each sky is `{ gradient: [5 colours], sun | moon: { x, y, r, color, halo }, clouds: { kind, color, y, speed },
layers: [...] }`.

- **Layer kinds:** the engine's `sea`, `hills`, `mountains` (snow), `city` (windows), `clouds` and `fog`, plus our
  painter layers: `mesa`, `cliffs`, `village` (terraced houses), `balloons` (drifting), `lanterns` (rising), `aurora`
  (animated ribbons), `stars` (with shooting stars), `skyline-neon` (blinking) and `rainbow` (sun shower).
- **Count.** About 16 presets in all: one per stage, with the beach kit's dawn and sunset variants.

### 9.3 Cars as shapes, pre-rendered

- **Writing the shape.** Each car is a set of `E.SHAPES` entries in `src/02-shapes.js` (`ob-car-orchidea-under`, `-over`, `-lights`), written facing south per the asset card
  (front +y, so *rear* is −y).
  - **Parts:** body side profile as `prism` (outline on x/z, pushed along y), bonnet and boot as `wedge`/`prism`, wheels
    as `cyl` rotated onto the x axis, seats as `box`, roll hoops as `lathe`/`cyl`, lamps as `box` in glow materials.
  - **Materials:** the slot `paint` uses a key ramp of five tones, so recolouring is a pure palette swap. Also `chrome`
    (`steel`), `glass` and `tyre`.
- **Three shapes per car:** `…-under` (floor, seats, dash, wheel), `…-over` (doors, rear deck, bumpers, lamps' housings,
  wheels) and `…-lights` (tail, brake and head lamps only, glow material).
- **Pre-rendering.** At boot, render each with `E.shapeSprite(id, { view: OB.CHASE_VIEW, facing, size })`. The view is
  `new E.View('chase', 'Chase', 0, 9)`, a camera looking north. The facing is `−π/2 + yaw`. That gives 33 yaws (−90° to
  +90°, 5.625° apart) and 32 spin frames.
  - **Check it** with `node engine/tools/asset-sheet.mjs src/02-shapes.js#ob-car-orchidea-over`: the sheet shows every view
    and facing, and its lint flags thin parts.
- **Seat anchors** per yaw are computed by projecting the seat points through the same view and stored with the frames.
- **Traffic.** Ten traffic shapes, rendered at 9 yaws (−40° to +40°) × 2 layers (body and lights).
- **Headless tests skip all pre-rendering.** `OB.Art` hands out stand-in frames with the right `w`/`h` and anchors, so
  the sim and its tests run in about a second.

### 9.4 Scenery and other sprites

- **Core props:** `E.prop(name).frames[0]` for palm, tree, pine, bush, flowers, rock, cactus, streetlamp, sign, fence,
  lamp, awning, lantern and barrel. Tint them with `color` where the kit needs it.
- **Store shapes.** `kenney-nature` gives cliffs, trees and rocks, and `kenney-fantasy-town` houses for villages. Cut
  only the ids used into `src/assets-ob.js` with `engine/tools/asset-set.mjs`. Load it with `E.addAssets` and credit
  the sets on the About screen.
- **New sprites** (★ in §8.6) are either `E.SHAPES` entries rendered at 2–3 facings with `OB.CHASE_VIEW`, or string
  sprites (`E.sprite`) for the small things: balloons, bees, cones, bouquets, petals, glyph icons.
- **Animated scenery** uses `E.anim`: turbines, waterfalls, flags, lanterns, neon, aurora, flamingos.
- **Landmarks** (the Ferris wheel, cathedral, casino flower, castle, lift bridge, radio dish, lighthouse) are shapes or
  custom `draw(g, sx, sy, scale)` objects built with `px.poly`/`px.rect` and toned with `E.tones`.

### 9.5 UI art

- **Logo.** `E.font.title` at scale 5, with `colors: ['#fff4e0', '#ffb3d1', '#ff7a59', '#ffcf4a']`, depth 4 and
  `depthColor: '#5a1e4a'`. A sunflower replaces the "O", and a white shine sweeps across every 6 s.
- **Panels.** `E.ui.box` with `bg: ['#2a1450', '#5a2a6a']` (dusk), a border in `#ffd6a0`, and accents in pink
  `#ff5fa2`, sun `#ffcf4a` and sea `#3ac8e0`.
- **Glyph icons.** 12×12 sprites, drawn at scale 2 for prompts (Appendix C).
- **Postcards and garden beds** are drawn panels with a stamp, a portrait and an icon. Every icon gets a shape or
  letter as well as its colour.

---

## 10. Build order and milestones

Build in this order. Each milestone ends with `node tests/run.mjs` green and a fresh bundle that opens from `file://`.
Earlier milestones may use plain art, but never stubs. Anything built must work fully. Polish comes later, and nothing
is cut.

| Milestone | Build | Done when |
|---|---|---|
| **M0 Foundations** | the dev folder, the handoff engine copied, Playwright installed; `src/manifest.json`, `index.html`, `build.mjs` with the session client inlined first in `<head>`; `tests/run.mjs` printing only failures and a one-line count; `00-core.js` (bus, rand, tuning), `90-main.js` (game, boot steps, a real title scene with the logo); `game.debug` | the bundle opens with no errors (browser smoke test); the headless boot reaches `title` |
| **M1 Road and feel** (the riskiest first) | E1/E2 road junctions and dressing; S1, S2 and S3 with real layouts and first-pass scenery; `CarSim` complete (§7.3); traffic (§7.4); the clock and checkpoints; the HUD core; the Orchidea model pre-rendered (layers and yaws); `OB.Brain` bot; the dev panel's **Tuning** tab and debug overlay | the physics suite passes (curve-hold targets, drift entry and exit, slipstream, bumps, spins, rails); the junction suite shows a seamless switch (≤ 1 px); the bot drives S1→S2 and S1→S3 inside the target times; a filmstrip of a drift through a 5-curve looks right |
| **M2 The Arcade loop** | all 15 stages and 5 goals as real data with the kit rules; the route graph; scoring and the Bloom chain; results and initials; first-pass ending vignettes; title → menu → garage → radio → race; the UI kit with glyph prompts; settings (§7.20) with E5; the profile save; the synth extension E6/E7 with 2 radio songs, the engine note and core sound effects; E3 analog input | the 16-route playthrough passes (the bot reaches every goal in time on Normal); UI navigation passes for pad, keys and mouse; the glyph suite passes; content lint passes for the stages |
| **M3 Platform features** | AI Hub ghost session with our card (§7.12); attract mode (§7.22); touch-only (§7.21); every Dev Mode tab (§7.23) in the pause menu; local Versus split screen (§7.11); E4, E8 | the fake-hub suite and the **harness in a browser** pass (`__hubCheck.pass`, 2 and 4 players, latency and loss); the attract suite passes; touch emulation shows the notice; the dev suite passes (slider changes behaviour, reset restores it); two Versus bots finish |
| **M4 The passenger** | the cast's rigs in the car with layers and anchors; portraits; speech bubbles; the babble voice; Love in Bloom with all 14 request types and their objects; petals, grades, fork preferences; every ending (5 × 3) with all 45 passenger lines | the request suite has a pass and a fail script per type; the grade maths passes; a Love in Bloom playthrough reaches each mood; babble planner tests pass |
| **M5 Career and meta** | rival personas; all 14 missions and their rules; the Tour map, briefs and debriefs; the garden and economy; Time Trial with ghosts and medals; records | every mission is cleared by its bot at C or better and AAA is possible with cheats off; the economy suite passes; ghosts survive record → save → load → replay |
| **M6 Audio content** | all 7 radio songs, 4 themes, every jingle; the full sound-effect list (§7.15); per-car engine notes; ambience per kit; radio switching; ducking; tunnel reverb | audio lint (levels, clipping, silence) and the spectrum bands pass for every song; every sound-effect name in the data exists |
| **M7 Art and effects** | all 13 kits fully dressed; every landmark; all skies; bloom, flare, shimmer and weather (sun shower, petal storm, aurora, fireworks, shooting stars); every car, traffic vehicle, rig and request-object animation (§7.13) | the screenshot review of each stage at 1920×1080 is done and noted in the log; `tools/check.mjs` look notes are acted on; there are no flat empty roadsides |
| **M8 UX polish and balance** | transitions; hints; How to Play pages with live demos; About & Credits; comfort settings; HUD size; balance with the sliders and bot metrics (§11) | the readability suite passes (no text below scale 1, ≤ 7 items per screen); the balance windows hold (§11, R2) |
| **M9 Release** | the full test pass; the final bundle; `exit-interview.json` (parsed); the About pages and the chat reply with the real Source Information and feedback; `engine/CHANGES.md` complete | everything in §13 is ticked |

**Work habits.**
- Rerun only the suite that covers what you changed (`node tests/run.mjs --only physics`), and the full command before
  ending a milestone.
- Write nothing outside the dev folder and the root deliverables (the HTML and `exit-interview.json`).
- Note every engine change in `engine/CHANGES.md` as you make it.

---

## 11. Risks and how to de-risk them

| # | Risk | Mitigation |
|---|---|---|
| R1 | **The fork renderer and the seamless stage switch.** The road module draws one road, so junctions are new code in the hottest path. | Build it first (M1). Keep it simple with the flat-junction rule (§7.1), one shared height profile and per-branch lateral offsets. Unit-test the projection: both branch centres; the road centre and player's screen x before and after the switch within 1 px; the gore cushion pushes to the nearer side. Record a filmstrip of a fork at 250 km/h, and review frames 1–16 for pops. |
| R2 | **Drift and handling feel**, the heart of the game, tuned without hands on a pad. | Every constant is a live slider from M1. The physics suite asserts the design targets (§7.3: a 3 holdable flat out, a 4 needing a lift, a 6 drifted at about 85 %). **Balance windows**, asserted by the bot suite: on Normal, the reference bot finishes the all-left route with 15–30 s spare and the all-right route with 2–12 s. A "sloppy" bot (1 spin per stage) fails at least half the routes. A "no-drift" bot finishes no more than 6 of the 16. |
| R3 | **Car sprites from shapes might look crude, or boot slowly.** | Prototype the Orchidea in M1 and check it with `asset-sheet.mjs` and in-race screenshots. If the shape renderer can't give clean curves at 128 px, draw the body with `px.poly` profiles per yaw band (the ROAD kit's method, 33 frames), which is just as complete. If boot exceeds about 8 s, render the cars a race needs behind a short "Polishing the chrome…" boot step at race start. |
| R4 | **AI Hub conformance**, which is a hard gate. | Integrate in M3 using the ghost example's pattern. `ready()` never waits for input, and the client stays verbatim. Run the official harness in Playwright with 2 and 4 players, `latency=150&jitter=50&loss=5`, and the `host-leave` scenario. Re-run it on the final bundle (M9). |
| R5 | **Audio quality, judged by builders who can't hear.** | Composition rules (§7.14), named instrument presets, and the offline render lint: in Playwright, `OfflineAudioContext` renders 12 s of each song through the real synth code. It asserts a peak under 0.98, RMS between 0.06 and 0.25, no silence over 1 s (except a designed rest), and band energy order (low < 250 Hz present, 1–4 kHz present). It also writes spectrogram PNGs to `.cache/audio/` to look at. |
| R6 | **Content volume** (15 stages, 13 kits, 45 ending lines, 14 missions, 11 songs) causing gaps or placeholders. | Data schemas plus the **content-lint suite**: every stage has its fields, slots, landmarks and par; every goal has 3 moods × 3 passengers; every line key used exists and none is empty; every mission has rules, rewards and a bot; every bed has a cost and a reward source; bundle text has no TODO, placeholder or lorem. M2 lands all stages as real data early. |
| R7 | **10-foot readability.** | UI-kit rules: a minimum scale and an item count, enforced in a debug-build assertion that the readability suite runs headless. Screenshots at 1920×1080 and 1280×720 reviewed in M7 and M8. The HUD's Extra-large size is tested too. |
| R8 | **Headless speed and determinism.** | No pre-rendering headless. All gameplay randomness comes from seeded streams. `game.stateHash` covers the race state. A proof hash of 1,200 scripted steps run twice must match. |
| R9 | **Split-screen layout.** | A per-scene `res` of `[640, 360]`, the rows layout, a HUD scaled for 180-px-tall viewports. Two-bot Versus test and screenshots. |
| R10 | **Single-file bundle under `file://`.** | `build.mjs` lint (§4.3). The Playwright suite opens the root HTML by `file://`: no request leaves the page, there are no console errors, and the title is reached. |
| R11 | **Touch-only false positives** (touchscreen laptops). | Require no fine pointer plus no keydown and no pad. Any key or pad clears the notice at once. Tested with emulation both ways. |
| R12 | **Scope.** | Everything in this plan is in scope, and nothing more. Prefer finishing a system completely before starting the next, in milestone order. |

---

## 12. Testing

### 12.1 The one command

`node tests/run.mjs` runs everything from the dev folder:
- the headless suites first (in about 10 s), then the browser suites;
- `--quick` skips the browser suites, `--only <suite>[,<suite>]` runs only those, and `--update-par` rewrites the
  stages' par and medal times from the reference bot.

**Output.** One line per failure (`FAIL physics/curve-4-needs-lift: held 1.18 at 96% vtop`), then one summary line:
`212 passed, 0 failed, 0 skipped (14.2 s)`. It exits with code 1 on any failure and prints nothing else.

**The harness** (`tests/lib/boot.mjs`), as `game/test.mjs` does it:
- Make a `vm` context with `window` (the context itself), `addEventListener`, `location` and `console` stand-ins.
- Load `engine/my-3d2dge.js` and every file in `src/manifest.json`. The headless `E.Game` skips drawing.
- Return `{ E, game, OB, I: game.input, snap: () => game.debug.snapshot(), events }`.
- **Inputs:** `I.tap`, `I.hold`, `I.setAnalog` (E3), `I.feed` for the mouse. **Stepping:** `game.advance(s)`.
- **Fresh state:** each suite boots a fresh context, so suites never share state.

### 12.2 Headless suites

| Suite | What it proves |
|---|---|
| `core` | boot reaches `title`; no `game.errors`; the bus delivers in order; tuning reset restores every default; rand streams repeat for a seed |
| `road` | every stage builds within its length bounds; the first 150 segments and the junctions are flat; `info()` reports ground, edges and spans as the data says; the scenery is placed the same twice for one seed |
| `junction` | branch centres at the decision point; the side chosen equals `sign(x)`; **seamless switch**: before and after it, the road centre's screen x is within 1 px and the player's z continues; gore cushion hits push to the nearer branch; a closed fork on a fixed route blocks that side |
| `physics` | per-car top speed and 0–100 within 3 %; brakes; the curve-hold design targets; drift entry by all three inputs and none below 120 km/h; counter-steer straightens; drift score accumulates; the slipstream builds and the slingshot fires; off-road slowdown; rails scrape without spinning; bump against spin by closing speed; crest air and steering cut; gusts push |
| `traffic` | the mix and density per stage; the minimum spacing; a two-lane gap always exists; lane changes avoid overlaps; junction branch assignment; ribbon pairs stay paired; overtake and near-miss detection with exact geometry cases; the horn makes the car ahead change lane |
| `race` | the clock, checkpoint bonuses, difficulty scaling; time up → `gameover`; goal → `ending` → `results`; score maths; Bloom chain levels, decay and crash halving; the route string is recorded |
| `playthrough-arcade` | **the bot drives all 16 routes to all 5 goals** on Normal within the R2 balance windows; no errors; every stage enters and every checkpoint fires once |
| `requests` | **for each of the 14 types**, a scripted *pass* run (the bot targets the objects) rates Perfect, and a scripted *fail* run (drive straight in lane 1, or crash on purpose) rates Miss; petals and the favourite ×1.2; fork preference ±; penalties |
| `playthrough-love` | Love in Bloom on 3 routes with 3 passengers reaches Bloom, Bud and Wilt (by scripted quality); every ending vignette runs to its end with every line found |
| `missions` | **every mission** is cleared by its bot at C or better, and AAA is reachable with the "perfect" bot; the failure path works for each; rewards are paid once per rank improvement; unlock chains open the right postcards; the Finale opens at 9 cleared |
| `economy` | 14 missions at A plus 6 arcade runs buy every bed; buying with too few seeds is refused; unlocks take effect in the garage and radio |
| `trial` | a ghost records, saves, loads and replays to the same positions; splits; medals from par |
| `versus` | two players join (pad and keyboard halves); a split-screen race with 2 bots finishes; places; rematch |
| `hub` | with a **fake `AIHub`** in the context (`active: true`, `connect`, `ready`, `on`, `time`, `send`, `progress`, `result`, `answer`, `rng`), check: the title is skipped; `connect` uses ghost and `[1, 4]` with a card; `ready()` comes without input; Enter or ✕ on the card answers ready and △ answers more; the start syncs to `time() ≥ 0`; ghost sends happen at 8–12 Hz with `area`; progress comes once a second; the goal reports `result({ time })`; `time-up` reports `result({ score })` once; `end` stops input and sound; quit, restart and dev mode are hidden; Options with Create held doesn't pause. With `connect` resolving `null`, it boots to the title. |
| `attract` | 10 s idle on each listed screen starts `attract`; 9.9 s doesn't; any key, pad, mouse move or click returns to the same screen and focus, and that input is consumed; a 100 s run emits fork, drift, request-Perfect, rival-or-versus and goal events; no profile writes |
| `touch` | with stand-ins for touch-only media queries: the notice shows, the scenes have no touch buttons, and the attract mode runs; a tap doesn't end the attract mode; a keydown clears the notice |
| `ui` | from the title, every screen in §5.3 is reachable with pad, keys and mouse (`I.feed`), and each has a way back; focus never lands on nothing; the readability assertion (text at scale 1 or more, at most 7 focusable items) holds on every screen |
| `glyphs` | every action's prompt for keyboard, mouse, PlayStation and Xbox; the default is PlayStation; the setting switches to Xbox; rebinding changes the prompt; the device switch updates the prompts on the next step |
| `dev` | the pause-menu Dev Mode item opens the panel; each slider changes its sim effect (for example, top speed changes v after 5 s of full gas); per-row and global reset; cheats work; every warp lands where it says; "Keep after reload" saves and restores |
| `save` | the profile round-trip; a migration from a v0 fixture; blocked storage is survived; settings persist |
| `voice` | the babble planner: syllable counts for fixtures, total duration in range, the same text giving the same plan, moods shifting pitch, punctuation pauses |
| `audio-data` | every song parses (notes, chords, accents, slides); every track has an instrument; every song has a `sparkle` layer; every sound-effect and jingle name used exists |
| `content` | the lint of R6: stages, goals, lines, missions, beds, songs, credits, `OB.ABOUT` fields all filled (no empty, "TBD" or placeholder strings) |
| `determinism` | `proof()`: 1,200 scripted steps from a seed, hashed twice with the same result; the hash differs when the seed differs |

### 12.3 Browser suites (Playwright, `tests/browser/`)

| Suite | What it proves |
|---|---|
| `bundle` | `node build.mjs`, then open the **root HTML by `file://`** at 1920×1080: no console errors, no network requests, the title scene is reached, `game.debug.snapshot().scene === 'title'`; the lint of §4.3 |
| `check` | `node engine/tools/check.mjs <root html>` exits 0; act on its look notes (and record them in the log) |
| `hub-harness` | copy the bundle and `vendor/hub/*` into `.cache/hubtest/`; start `python3 -m http.server 0 --bind 127.0.0.1` in that folder; read the port it prints; confirm `/` serves our title; open `harness.html?game=<bundle>&players=2&auto=1`, then `players=4&latency=150&jitter=50&loss=5&auto=1`, then `&scenario=host-leave`; each must reach `window.__hubCheck.pass === true`; kill the server by its PID |
| `touch-emulation` | `check.mjs --size 390x844@3`: the notice is visible, no touch buttons are drawn, and the snapshot shows attract running after 11 s |
| `audio-lint` | the offline render checks of R5 for every song and jingle |
| `screens` | screenshots of title, menu, garage, radio, race (one per kit), a fork, Love in Bloom request, Tour map, garden, results, ending, Versus split, hub card and dev panel, at 1920×1080, into `.cache/shots/`, for the review in M7 and M8. This suite fails only on errors, never on looks. |

### 12.4 What only eyes can check (screenshots and filmstrips)

Check these with `tools/filmstrip.mjs` or screenshots, and note them in the build log:
- the drift and spin animation (filmstrip);
- a fork at speed (filmstrip);
- bloom and lens flare not smearing pixels;
- night and tunnel tints;
- the car layers and the occupants' alignment at every yaw (a contact sheet of 33 frames);
- each kit's density and composition;
- HUD legibility at 1280×720;
- the hub card's look.

Everything that can be a number, a state or an event is a script instead.

---

## 13. Definition of done: every TASK.md requirement and where it lives

| TASK.md requirement | Where | Proved by |
|---|---|---|
| Genre and perspective that fit the source | §1, §7.2 | screens |
| Title riffing on the name, picked by a real RNG | header | — |
| Single HTML named per TASK.md; may use CDNs | §1 names, §4.3 (we need none) | `bundle` |
| Built on the my-3D2dge handoff; engine changes allowed | §5, §6, `engine/CHANGES.md` | all suites |
| Engine-native art plus new assets that feel like the source | §8.6, §9 | screens |
| Engine animation plus new animations | §7.13 | filmstrips |
| All audio in code; gibberish voices | §7.14–7.16 | `audio-data`, `audio-lint`, `voice` |
| AI Hub multiplayer and the game on its own | §7.11, §7.12 | `hub`, `hub-harness`, `versus` |
| Dev subfolder, bundled to the root | §4 | `bundle` |
| Shared machine: no stray reads, own ports, own PIDs | §4.1 | — |
| Performance unlimited, so add detail | §7.2, §9 | — |
| Headless tests behind one command, with a whole-game playthrough | §12 | `run.mjs` |
| A feature-complete, polished vertical slice showing all mechanics | §7, §8, §10 | playthrough suites |
| Dev mode in the pause menu, with live sliders and reset | §7.23, Appendix A | `dev` |
| Attract mode after 10 s idle; any input exits; cheats allowed | §7.22 | `attract` |
| Narrative tone like the source | §8.11 | `content` |
| 10-foot, controller-first; keyboard and mouse native; hover focus; PlayStation glyphs (Xbox option); prompts follow the last device | §7.17–7.20, Appendices B–C | `ui`, `glyphs` |
| No dense web-style screens | §7.17 | `ui` readability |
| Touch-only: no touch controls, the notice and Settings, attract runs | §7.21 | `touch`, `touch-emulation` |
| No TODOs, placeholders or stubs | §4.3 lint, R6 | `content`, `bundle` |
| Source Information and three feedback blocks in the reply and the About screen | §7.25 | `content` |
| `exit-interview.json` in the exact shape, parsed | §7.25, M9 | `bundle` (parses it, checks every key is non-empty) |

**Final steps (M9), in order:**
1. Run `node tests/run.mjs` and get it green.
2. Run `node build.mjs`.
3. Fill `OB.ABOUT` with the real answers:
   - **Date** and **Model:** from TASK.md.
   - **Plan:** `PLAN.md`.
   - **Usage:** say "unknown" if no estimate is available.
   - **Feedback answers:** from the build log.
4. Rebuild, so the About pages and `exit-interview.json` match.
5. Validate the JSON: `node -e "JSON.parse(require('fs').readFileSync('exit-interview.json','utf8'))"`.
6. Write the chat reply with the Source Information, Testing Feedback, Engine Feedback and Prompt Feedback.

Fill the `aiHub` block as follows:

| Field | Value |
|---|---|
| `name` | "OutBloom 2006: Coast 2 Coast" |
| `tagline` | "One day. One road. Every flower in bloom." |
| `type` | "Game" |
| `genre` | "Racing" |
| `source` | "OutRun 2006: Coast 2 Coast" |
| `series` | "OutRun" |
| `players` | "1–4" |
| `controls` | "Steer: stick/←→/A D · Gas: R2/✕/W · Brake: L2/□/S · Drift: ○/Space · Pause: Options/Esc" |
| `tags` | ["arcade", "vehicles", "pixel art", "retro", "comedy", "versus"] |

---

## Appendix A. Tuning defaults (the Dev Mode sliders)

All of these are live (`OB.tuning`), and `OB.TUNING_DEFAULTS` holds the defaults that reset restores. "×" means a
multiplier on the per-car or per-stage value.

| Group | Key | Default | Range | Meaning |
|---|---|---|---|---|
| Car | `topSpeedScale` | 1.00 | 0.6–1.4 | × car top speed |
| Car | `accelScale` | 1.00 | 0.5–2.0 | × car acceleration |
| Car | `brakeDecel` | 240 | 120–400 | km/h per second at full brake |
| Car | `steerRate` | 2.20 | 1.0–4.0 | half-roads per second at full lock (× car steer / 2.2) |
| Car | `steerResponse` | 9 | 3–20 | per second; how fast lateral speed follows the stick |
| Car | `curvePush` | 0.62 | 0.2–1.2 | the throw outward per curve unit at top speed |
| Car | `offroadTop` | 0.50 | 0.2–1.0 | share of top speed off the asphalt |
| Car | `offroadDrag` | 120 | 0–300 | km/h per second above the off-road top |
| Drift | `driftMinSpeed` | 120 | 60–200 | km/h |
| Drift | `driftTapWindow` | 0.35 | 0.1–0.8 | s, the longest brake tap that counts |
| Drift | `driftGrip` | 0.85 | 0–1 | how much the drift cancels the curve push (× car drift grip / 0.85) |
| Drift | `driftAngleMax` | 0.75 | 0.3–1.2 | rad |
| Drift | `driftSpeedLoss` | 16 | 0–60 | km/h per second at full angle |
| Drift | `driftSteerBoost` | 1.30 | 1–2 | × steering while drifting |
| Slipstream | `slipRange` | 1800 | 600–3000 | units behind a vehicle |
| Slipstream | `slipWidth` | 0.22 | 0.1–0.5 | half-roads |
| Slipstream | `slipTopBonus` | 0.06 | 0–0.2 | × top speed at full slip |
| Slipstream | `slingshotBoost` | 14 | 0–40 | km/h |
| Traffic | `trafficDensity` | 1.00 | 0–3 | × stage density |
| Traffic | `trafficSpeedScale` | 1.00 | 0.5–1.5 | × type speeds |
| Traffic | `spinThreshold` | 70 | 20–150 | km/h of closing speed that spins you |
| Traffic | `bumpSpeedLoss` | 0.08 | 0–0.5 | share of speed lost below the other car's |
| Clock | `startTime` | 75 | 30–150 | s |
| Clock | `checkpointBonus` | 58/57/56/55 | 20–120 each | s for rows 2–5 |
| Rivals | `rivalSkill` | 1.00 | 0.5–1.5 | × rival top speed and cornering |
| Rivals | `rivalRubber` | 0.50 | 0–1 | rubber-band strength |
| Love in Bloom | `petalScale` | 1.00 | 0.5–2 | × petals per rating |
| Love in Bloom | `requestDifficulty` | 1.00 | 0.5–1.5 | × request thresholds and counts |
| Love in Bloom | `bloomDecay` | 4 | 1–10 | s before the chain drains |
| Camera | `cameraHeight` | 1000 | 600–1600 | units (chase) |
| Camera | `cameraFov` | 100 | 70–130 | degrees at rest |
| World | `gameSpeed` | 1.00 | 0.25–2 | `game.timeScale` while racing |

## Appendix B. Input map (defaults; every action rebindable on the Controls screen)

| Action | Keyboard | Mouse | Pad (PlayStation · Xbox) |
|---|---|---|---|
| Steer | A / D, ← / → | — | left stick, d-pad ← → |
| Gas (analog) | W, ↑ | — | R2 · RT (analog), ✕ · A |
| Brake / reverse (analog) | S, ↓ | — | L2 · LT (analog), □ · X |
| Drift (handbrake) | Space | — | ○ · B |
| Shift up / down (manual) | E / Q (also Left Shift / Left Ctrl) | — | R1 / L1 · RB / LB |
| Horn | H | — | △ · Y |
| Camera | C | — | d-pad ↓ |
| Radio: next station | R | — | d-pad ↑ |
| Pause | Esc, P | — | Options · Menu |
| Menus: move · select · back | arrows, WASD · Enter, Space · Esc, Backspace | hover · left click · right click | d-pad, stick · ✕ · A · ○ · B |
| Menus: tab or page | Q / E | wheel | L1 / R1 · LB / RB |
| Versus P2 (shared keyboard) | arrows to steer and gas or brake, `.` drift, `/` horn, `,` camera | — | the second pad |

## Appendix C. Glyphs (`OB.UI.prompt`)

| Engine label | PlayStation icon | Xbox icon | Keyboard and mouse |
|---|---|---|---|
| Pad0 | ✕ blue cross on a dark disc | A green disc | — |
| Pad1 | ○ red ring | B red disc | — |
| Pad2 | □ pink square | X blue disc | — |
| Pad3 | △ green triangle | Y yellow disc | — |
| Pad4 / 5 | L1 / R1 pills | LB / RB pills | — |
| Pad6 / 7 | L2 / R2 trigger shapes | LT / RT trigger shapes | — |
| Pad8 / 9 | Create / Options ovals | View / Menu ovals | — |
| Pad12–15 | d-pad with the arm lit | the same | — |
| left stick | an L stick with arrows | the same | — |
| keys | — | — | a keycap with the key's label (W, ↑, Space, Esc, Enter…), wide caps for long names |
| Mouse0 / 2 / wheel | — | — | a mouse with the left or right button lit, or the wheel |

Every icon is 12×12 at scale 2, with a 1-px dark outline so it reads on any background. The text label beside it is the
action's name ("DRIFT").

## Appendix D. The debug handle and events

`game.debug`:
- `snapshot()` returns `{ scene, mode, stage, seg, z, x, v, gear, rpm, drift: { on, a, score }, slip, air, crash,
  clock, score, bloom: { level, points }, petals, grade, request: { type, state, progress }, route, goal, rivals:
  [{ id, z, x, place }], traffic: n, attract: phase, hub: { active, phase, sent, progress }, ui: { screen, focus },
  lastDevice, glyphs, errors: n }`.
- `events(n)` returns the last n bus events.
- `teleport(stage, pct, x)`.
- `tune(key, v)` and `resetTuning()`.
- `cheat(name, on)`.
- `go(scene, data)`.
- `bot(on, params)`.
- `ui.press(action)` and `ui.click(x, y)`.

`game.stateHash = () => [stage, z, x, v, clock, score, petals]`, rounded.

**Bus events:**

| Area | Events |
|---|---|
| run | `run:start`, `run:end {reason}`, `stage:enter {id}`, `checkpoint {id, bonus}`, `fork:approach {left, right}`, `fork:pref {side}`, `fork:choose {side, next}`, `goal {id, mood}`, `time:low`, `time:up` |
| car | `car:bump {with}`, `car:crash {with}`, `car:scrape`, `car:offroad {on}`, `air:start`, `air:land {hard}`, `start:perfect`, `drift:start {dir}`, `drift:end {score, length}`, `slip:start`, `slip:end`, `slingshot`, `nearmiss {id}`, `overtake {id, kind}`, `gust`, `horn` |
| Love in Bloom | `req:start {type}`, `req:progress {n, of}`, `req:end {type, rating, petals}`, `petals {delta, reason}`, `bloom:level {n}` |
| objects | `obj:pop`, `obj:bonk`, `obj:sting`, `obj:snap`, `obj:cone`, `obj:arch`, `obj:bouquet`, `obj:photo {rating}` |
| rivals and missions | `rival:pass {id, by}`, `rival:out {id}`, `mission:end {id, cleared, rank}` |
| other | `radio:tune {i}`, `ui:screen {name}`, `attract:start`, `attract:end`, `hub:*` |

## Appendix E. Research notes (what the plan relied on)

- **The engine.** my-3D2dge v0.85.2 handoff: `README.md`, `API.md`, `AI_GUIDE.md` (the road-racing recipe, standard
  features, testing, sessions), `docs/ASSETS.md` (shapes, `E.shapeSprite`), `modules/road.js` (the current single-road
  renderer), `kits/road.js` (a complete coast-road slice: clock, checkpoints, radio, bot), `API-INDEX.md` (input,
  glyphs, settings, audio, `E.Arcade`, `E.Road`). Its audio is a chip synth with one-shot voices and step-sequenced
  songs on a game-time music clock. Its gamepad buttons are digital. Its standard menus are HTML.
- **The AI Hub.** `lib/hub/README.md` (Session Protocol v1, client 1.4.0, modes, card, start, reporting, rules, the
  harness checks), `examples/ghost.html` (the ghost pattern: send every 100 ms unreliable, progress once a second,
  result on finish, a result on time-up) and `harness.html` (its checks and its synthetic key pokes).
- **The source**, from Wikipedia and a moegamer retrospective. *OutRun 2006: Coast 2 Coast* (SEGA, developed by Sumo
  Digital, 2006; PS2, PSP, Xbox, PC) has these modes and mechanics:
  - OutRun, Heart Attack (on-the-fly passenger requests rated with heart points and a final grade), Time Attack, and
    the Coast 2 Coast career, whose missions come from characters.
  - Mission types including Test Your Drift, Test Your Slipstream, Avoid the Knockout and Don't Lose Your Girlfriend.
  - Unlocks bought with "OutRun Miles", and up to 6 players online.
  - A brake-tap drift and slipstreaming.
  - The mood: blue skies and escapist fun.

  Nothing here copies its content (§3).
- **Not found, so don't claim it.** Exact request lists, stage counts per course set, the music track list. Write
  "unknown" in Source Information for any such detail.
