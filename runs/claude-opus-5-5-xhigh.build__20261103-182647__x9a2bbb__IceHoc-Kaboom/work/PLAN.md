# Ice Hoc-Kaboom

**The build plan for the game TASK.md describes** (source: ice hockey, over-the-top arcade style). Read TASK.md first, then
this file whole. Everything here is required unless a line says otherwise. Numbers are starting values: they are
exposed as dev-mode sliders (section 15.3), and the build tunes them.

---

## 0. The game at a glance

| | |
|---|---|
| **Title** | **Ice Hoc-Kaboom** (logo text `ICE HOC-KABOOM`; use exactly "Ice Hoc-Kaboom" wherever the name is written) |
| **Deliverable** | `IceHoc-Kaboom-IceHockey-claude-opus-5-5-max-20261103-174816.html` in this folder (the folder holding TASK.md) |
| **Dev folder** | `IceHoc-Kaboom-IceHockey-claude-opus-5-5-max-20261103-174816/` in this folder |
| **Also in this folder** | `exit-interview.json` (TASK.md's shape), beside the HTML |
| **Genre** | Arcade sports: 3-on-3 ice hockey with goalies. A fight minigame sits inside it, and a story campaign (the Cup Run) frames it. Party versus for 1–4 players, local or online through AI Hub |
| **Perspective** | A 2.5D TV broadcast camera: the engine's `threequarter` ground view (pitch 55°) over a rink that runs left–right and tracks the puck. An `Overhead` option uses the engine's `topdown` view. An ice-level `brawler` view takes over for fights, instant replays, player intros and celebrations |
| **Engine** | my-3D2dge v0.85.2, the handoff package, full engine (all modules), patched as section 4 lists |
| **Look** | The engine's native look: PS1-era pixel art (`res: 'ps1'`, `expand: true`) and HD Humanoid rigs, plus new hockey gear, rinks, crowds and effects |
| **Online** | AI Hub Session Protocol v1, `shared-world` mode, 1–4 seats |

**The core loop, in one sentence (put it at the top of the game's source):** skate, dangle and rip the puck past the
goalie while you hammer rivals through the glass; fill your team's BOOM meter to go KABOOM; win the scrap when the
gloves drop; outscore them before the final horn.

**Pillars** (judge every feature against these):
1. **It plays like hockey.** Skating carries momentum and stops in a spray of snow. The puck rims the curved boards.
   Passes land tape to tape, one-timers are a thing, and goalies make real saves with reflexes, positioning and rebounds.
2. **Over the top.** Checks shatter the glass, gloves drop, KABOOM mode turns the slapshot into a fireball that blows the
   goalie into his own net, and fans throw power-ups and octopi onto the ice. The goal horn is huge.
3. **Hockey culture and its voice.** The old barn, the arena organ, the ice resurfacer (our "Flood Wagon"), chirping,
   the three stars, hats for a hat trick, the handshake line. A broadcast booth that never shuts up, in hockey's own
   jargon.
4. **10-foot, controller first.** A DualSense on a TV. Keyboard and mouse are just as native. Prompts show the device
   used last.

**What the demo contains** (it is a complete vertical slice, every feature shown):
- **Cup Run**, the story: 5 chapters, 5 arenas and 5 rival teams, with cutscenes, one choice per chapter, 3 stars per
  chapter, a boss final and an end sequence with credits.
- **Exhibition**: any 2 of 6 teams in any of 5 arenas, 1–4 local players on any sides, options and unlockable cheats.
- **Practice**: 7 drills from Coach Marge that teach every mechanic.
- **Online**: AI Hub sessions for 1–4 players, one period, versus.
- **Records, Settings, About/Credits**. **Attract mode** on every title and menu screen. **Dev mode** from the pause menu.

### Title pick (as TASK.md says)
I brainstormed 50 playful riffs on "ice hockey" silently, then rolled a real random number with
`python3 -c "import secrets; print(secrets.randbelow(50) + 1)"`. It came up **35: "Ice Hoc-Kaboom"** ("hockey" with an
explosion at the end, which is also the name of the game's signature mechanic). The file and folder names follow the
pattern `[GameTitle-SOURCE-…]`, with the title's spaces dropped and SOURCE written `IceHockey`.

---

## 1. Deliverables, folders and working rules

```
./TASK.md  ./STAGE.md  ./PLAN.md                 (given)
./IceHoc-Kaboom-IceHockey-claude-opus-5-5-max-20261103-174816.html   (the game: one self-contained file)
./exit-interview.json                            (TASK.md's shape, checked to parse)
./IceHoc-Kaboom-IceHockey-claude-opus-5-5-max-20261103-174816/      (every dev file)
    engine/          the handoff package, copied whole (my-3d2dge.js patched; API.md, API-INDEX.md, AI_GUIDE.md, tools/, docs/, kits/)
    vendor/          session.js (AI Hub client 1.4.0, verbatim), harness.html, bridge.js, round.js (test only)
    src/             the game, one file per module (section 5.2), concatenated in name order into one IIFE
    tests/           run.mjs (the one test command) and its suites (section 18)
    tools/build.mjs  writes the single HTML (and build/game.js for the headless tests)
    build/           build output for tests: game.js, dev.html
    hub/             served for the AI Hub harness: harness.html, bridge.js, round.js, game.html (a copy of the build)
    shots/           screenshots for review (not shipped)
    ENGINE-CHANGES.md   every change to the engine and why (section 4); its summary also goes in the About screen
    package.json     pins playwright 1.63.0 (copy the handoff's)
```

- **Getting the engine**: `git clone --depth 1 https://github.com/michaelcrosato/my-3d2dge.git`, made **inside the dev
  folder** (e.g. `dev/_src/`), then copy `dist/handoff/` (4.9 MB) to `dev/engine/` and delete the clone. For the hub,
  use a sparse checkout, because the whole repo is very large (a full clone passed 780 MB before I stopped it):
  `git clone --depth 1 --filter=blob:none --sparse https://github.com/michaelcrosato/ai-hub.git _hub && cd _hub && git sparse-checkout set lib/hub`,
  then copy `lib/hub/{session.js,harness.html,bridge.js,round.js,README.md}` and `lib/hub/examples/arena.html` (the
  shared-world example) to `dev/vendor/`, and delete the clone.
- **This machine's `/tmp` is a small tmpfs that was 98% full while I planned.** Never clone or write there. Before you
  run Playwright, Chromium or npm, set `TMPDIR` to `dev/.tmp/` and create that folder.
- **Other agents share this machine.** Read only your own files. Serve with `python3 -m http.server 0 --bind 127.0.0.1`
  (the OS picks the port; parse it from the output), and fetch the page once to confirm it is this game: the
  `<title>` must contain "Ice Hoc-Kaboom". Stop only the processes you started, by their PID: never `pkill`,
  `killall` or `fuser -k`.
- **Single-file build** (`node tools/build.mjs`) writes the HTML in this order:
  `<!doctype html><html lang="en"><head><meta charset="utf-8">`, then **`<script>` + vendor/session.js verbatim +
  `</script>` as the first script** (the hub requires it right after `<meta charset>`), then the viewport meta,
  `<title>Ice Hoc-Kaboom</title>`, the hub metas (section 14.1), and the page style (black background, full-window
  canvas `#screen`, `image-rendering: pixelated`, `touch-action: none`). Then `</head><body>`, the boot splash markup
  from `E.bootSplash('ICE HOC-KABOOM')` (or the template's static `#e3-boot` div with the title changed), and
  `<canvas id="screen">`. Then the engine inlined in a `<script>`, then the game inlined in a `<script>` (one IIFE).
  Nothing loads from the network.
- **No TODOs, placeholders or stubs** may ship. `tests/run.mjs` greps the built HTML's game script for `TODO`, `FIXME`,
  `placeholder`, `stub` and `lorem`, and fails if it finds one.

---

## 2. Engine and hub facts the build relies on (verified while planning)

Read `engine/API.md` whole, as the handoff README says. Grep `engine/API-INDEX.md` for names and read the
`AI_GUIDE.md` sections you need. The facts below are the ones this plan depends on.

**Research done while planning** (for the About screen and the exit interview, together with whatever the build
adds): I read the engine's handoff package (README, API.md, the AI_GUIDE sections on standard features, views,
players, audio, the Shell, testing and the sports recipe, `kits/sports.js`, the headers of `modules/fight.js`,
`arcade.js` and `drive.js`, `docs/ASSETS.md`, and the engine source for the font, the pad glyphs, the input presets,
the audio voice, the dialog voice, the Humanoid's weapons and `solvePose`, and `ik3`). I read the AI Hub protocol,
the harness's checks and the shared-world example. No web research on hockey; the hockey culture here is general
knowledge.

- **Start from the SPORTS kit** (`engine/kits/sports.js`, slice at line 159). It is a 2v2 game in `threequarter` with a
  TileMap cage, a Body ball that bounces and curls, passes led to the teammate, `E.arc` lobs, a held shot meter, a
  formation AI, `game.allowJoin({ max: 4 })`, radio commentary through a non-modal `E.Dialog`, and a `bot()` that
  plays a match through `game.input`. Copy its structure and replace everything hockey changes. The FIGHTING kit and
  `modules/fight.js` show the engine's fight conventions; the fight here is bespoke (section 7.11), not `E.Fighter`.
- **Fixed step**: `update(dt)` runs at 120 Hz with exact steps, so the same inputs and seed give the same game.
  `game.advance(s)` runs steps headless. `new E.Game()` is headless in Node (draw is skipped).
- **Views**: `threequarter` (pitch 55), `topdown` (80), `brawler` (25). `game.setView(id)`; a scene's
  `views: [...]` limits the cycle. The ground plane is x east, y south, z up; 16 units = 1 m = one tile.
- **Characters**: `new E.Humanoid({ size, build: 'heroic' | 'bulky', weapon, outfit, hair, hat, sleeves, armor, colors })`;
  `rig.update(dt, state)` (vx, vy, facing, attack, pose, expr, down, flip, crouch, sprint, land…); `rig.J` holds
  the joints in the rig's frame. **`rig.solvePose` may be wrapped per rig** (`const base = rig.solvePose;
  rig.solvePose = function () { base.call(this); /* move J */ }`); this is how skating and stick-handling are added.
  `E.ik3(a, b, L1, L2, hint)` (two-bone IK) and `E.V3` (vector helpers) are exported. Weapons are drawn inside
  `_drawHD` and `_drawClassic` (search `o.weapon === 'staff'`, around lines 4536 and 4616); new gear goes there.
  `E.MOVES` has `jab cross hook uppercut haymaker elbow` for the fights. Poses: `cheer guard kneel crouch wave hips down
  die block`. `rig.drawPortrait(g, x, y, size, { zoom, turn })` draws live portraits.
- **The pixel font (5x7, `G57` near line 1320) has no PlayStation symbols.** `✕ ○ □ △` render as `?`, while the
  engine's `PAD_GLYPHS.playstation` uses them (line 1265). Patch the font (section 4). The engine's pause, settings and
  controls screens are HTML (`E.Shell`), so the symbols already show there.
- **Glyphs**: `game.input.glyphs = 'playstation' | 'xbox' | 'auto' | …`; `input.label(action, device)` gives a binding's
  label for that device; `input.lastDevice` is `'keyboard' | 'mouse' | 'gamepad' | 'touch'`. The engine's Controls
  screen already has a "button symbols" option.
- **Input**: presets are plain objects of action → codes (`KeyJ`, `Mouse0`, `Pad0`…`Pad16`; standard mapping: 0 ✕, 1 ○,
  2 □, 3 △, 4 L1, 5 R1, 6 L2, 7 R2, 8 Create, 9 Options, 10 L3, 11 R3, 12–15 d-pad). `E.Input.DEFAULT` holds the menu
  keys. Also: `input.move()`, `pressed/down/released/buffered/consume`, `input.padAim` (right stick),
  `input.pointer()` (screen px), `game.mouseGround()` (a world point), `input.anyPressed()`, `input.rumble()`,
  `game.allowJoin`, `game.addPlayer({ pad } | { keys: 'right' })`, `E.Input.halfKeys`, and `E.PLAYER_COLORS`.
- **Standard features: don't rebuild them.** The pause menu (`menu: { items: [['Dev Mode', fn]], settings: [...],
  controls: {...}, quit }`), settings saved per game, rebinding, full screen, auto-pause, the corner buttons, the boot
  screen with a crash report, and `game.saves` / `E.store`. `new E.Shell(game, { theme, settings })` themes the HTML
  screens.
- **Audio**: `game.audio` is a chip synth: `sfx(voice)`, `define`, `music(song, { fade, sync })`, `layer`, `sting`,
  `tempo`, `duck`, `onBeat`, and `audio.ctx` (the Web Audio context, null until the first gesture). Its buses
  (`_master`, `_sfxBus`, `_musBus`) are private. Oscillator voices have no filter (only noise voices take `filter`/`q`).
  `E.Dialog` blips `talk.voice` (an sfx) on every second letter (line 8956).
- **Presentation tools**: `game.script(function* () {…})` coroutines, `game.tween`, `cam.frame(list, { margin, zoom })`,
  `game.freeze`, `game.shake`, `game.flash`, `game.hitFx`, `game.particles.{explosion, smoke, fire, sparks, bits, glints,
  dust, ring, text}`, `game.lights.add(x, y, z, r, i, { color })`, `game.weather = { kind: 'snow' }`, and scene
  transitions (`game.go(scene, data, { fade: 'iris' | 'wipe' | … })`).
- **Drive module**: `new E.Car({ x, y, angle, top, accel, brake, turn, grip })`, then
  `car.update(dt, map, { steer, gas, brake })`. It drives the Flood Wagon.
- **Asset store** (`engine/src/assets/sets/*.js`, loaded with `E.addAssets(window.ASSETS[id])`): it has `bench`,
  `bottle`, `bowl`, `snowman`, `campfire-*`, `sled-long`, `speaker`, `cup`, `flag` and pines (core library). Build a
  set of only the entries the game uses with `node engine/tools/asset-set.mjs` and inline it. Everything else is a new
  `E.SHAPES` entry (`docs/ASSETS.md` is the format: read it whole before writing one).
- **Tools**: `node engine/tools/check.mjs <page>[#scene]` plays a page in Chromium and reports errors, look notes and
  `game.debug.snapshot()`. `node engine/tools/filmstrip.mjs <page> --steps "…" --seed 1` records frames to judge
  motion. **AI Hub**: read `vendor/README.md` (the protocol) whole; the shared-world example is the hub repo's
  `lib/hub/examples/arena.html`.

---

## 3. Design decisions in brief (why this shape)

- **3-on-3 + goalies** (the arcade standard), on a rink a little shorter than the NHL's: big plays, readable at 10 feet,
  enough bodies for passing plays and hits. No offside, icing or penalties: the only penalty is the fight loser's trip
  to the sin bin, which gives a power play.
- **Home teams wear dark jerseys and away teams white**, as in the pros. That is the clearest team read on a TV, and
  it is never color alone: the two teams differ in light versus dark.
- **One broadcast camera, never split screen**: like a TV game. Local players are marked by colored rings and P-tags.
- **Everything is data**: teams, players, arenas, chapters, cutscenes, objectives, commentary, power-ups and tuning,
  so designers can extend the game without touching systems.

---

## 4. Engine changes (make them in `engine/my-3d2dge.js`, log each in ENGINE-CHANGES.md)

1. **Font**: add `✕ ○ □ △` to `G57` (5 wide, 7 tall). For example `✕: '.....|#...#|.#.#.|..#..|.#.#.|#...#|.....'`,
   `○: '.....|.###.|#...#|#...#|#...#|.###.|.....'`, `□: '.....|#####|#...#|#...#|#...#|#####|.....'`,
   `△: '.....|..#..|.#.#.|.#.#.|#...#|#####|.....'`. Why: PlayStation prompts on the canvas showed `?`.
2. **Hub controller rule**: in the gamepad poll, while button 8 (Create) is held, ignore button 9 (Options) entirely.
   Why: AI Hub reserves Create + Options. Harmless outside the hub.
3. **Hockey gear on Humanoid** (in both `_drawHD` and `_drawClassic`), all drawn in the rig's depth-sorted `ops`:
   - `weapon: 'stick'`: a shaft from `J.stickTop` through the lower hand to `J.blade` (the heel), then the blade along
     `J.bladeDir2` (6 u long, 1.2 u tall). Taped knob and tape on the blade; shaft in `colors.stick`.
     `weapon: 'gstick'` is the goalie's, with a wider paddle. The game's solvePose wrapper sets
     `J.stickTop / J.blade / J.bladeDir2` and the hands.
   - `hat: { style: 'hockey' }` is a rounded shell with a clear visor; `hat: { style: 'mask' }` is a goalie mask (a
     painted shell in `colors.hat` and `colors.trim`, plus cage bars over the face).
   - `skates: true` draws a boot in `colors.boot` and a 1-px steel blade under each foot.
   - Goalie gear: `pads: true` (lower legs 1.8x as wide, plus a pad rectangle in front of each shin in `colors.pads`),
     `blocker: true` (a rectangle at `handR`), `catcher: true` (a mitt disc with a pocket line at `handL`).
   - `number: '19'` and `letter: 'C'`: the jersey number drawn with the tiny font on the torso's back, or on the chest
     when the chest faces the camera; the letter on the chest. `stripes: '#111'` draws vertical stripes over the torso
     and sleeves (the referees).
   Why: the source's look rests on sticks, helmets, skates and goalie pads, and the rig had none of them.
4. **Audio**: (a) periodic waves `organ` (drawbar harmonics 1, 2, 3, 4, 6, 8 at 1, .8, .55, .4, .2, .15) and `brass`
   (saw-like, odd-heavy) for `sfx` voices and music tracks; (b) `lp` / `lpTo` / `q` on oscillator voices (a lowpass
   biquad, optionally swept); (c) a public `audio.bus(name)` returning the `master`, `sfx` or `music` gain node, plus
   a `voice` bus (made in `_init`, routed to master) with `audio.voiceVolume`, applied in `applyVolume`. Why: the
   organ, the goal horn and gibberish voices need them.
5. **Dialog voice hook**: if `talk.voice` is a function, call `voice(ch, index, text, page)` for each newly shown letter
   instead of `sfx(voice)`. Why: each speaker babbles in their own voice.
6. Anything else changed along the way goes in ENGINE-CHANGES.md: what, where, why.

---

## 5. Architecture

### 5.1 Runtime shape
- **One `E.Game`**: `new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter',
  input: HOCKEY_KEYS, menu: { items: [['Objectives & Info', () => Match.showInfo()], ['Restart Game', () =>
  Match.restart()], ['Dev Mode', () => Dev.open()]], settings: SETTINGS, controls: CONTROL_NAMES, quit: 'title' },
  autoPause: !HUB, id: 'ice-hoc-kaboom' })`. The closures run later, so modules defined further down are fine. In an
  AI Hub session (`HUB` true), build it with `items: []`, `quit: false` and `autoPause: false` (section 14).
- **Scenes** (`game.start({ scenes, scene, boot: { title: 'ICE HOC-KABOOM', steps } })`):
  `title`, `attract`, `sides` (exhibition side select), `setup` (exhibition teams, arena, options), `storymap`,
  `cutscene`, `match` (pausable: all hockey play, including the shootout and the story games), `flood` (pausable: the
  intermission minigame), `results`, `practice` (pausable: drills), `records`, `about`, `credits`, `session` (AI Hub:
  card → play → end) and `lab` (dev only: the animation lab).
- **Boot steps**: bake the floor TileMap of the first arena (the others lazily at match start, behind the boot or
  a "loading" card); register the synth voices and songs; build the logo sprites; validate the data tables (fail loudly
  in dev); load the save.
- **Deep links** (not in sessions; for tests and tools): `#attract`, `#story/<1-5>`, `#cutscene/<id>`,
  `#match/<home>/<away>/<arena>`, `#fight`, `#kaboom`, `#shootout`, `#flood`, `#practice/<1-7>`, `#results`,
  `#about`, `#records`, `#lab`, `#dev` (a match with the Dev panel open).

### 5.2 Source modules (`src/`, concatenated in this order into one IIFE)
Each module is `const Name = (() => { … return { … }; })();`, the kit's style. Simulation modules never touch the
DOM, audio or particles directly: they emit events (5.4).

| File | Module | Responsibility |
|---|---|---|
| `00-head.js` | – | `'use strict'`, `const E = My3D2dge`, the hub flags (`HUB = window.AIHub && AIHub.active`), the `game` instance, short-hands |
| `01-util.js` | `U` | math (angle helpers, segment–circle and segment–segment tests, quantize), RNG streams `RNG.sim` / `RNG.fx` (from `E.rng`), name sanitizer (NFD → ASCII; other characters → `?`) |
| `02-events.js` | `Bus` | `emit(type, data)`, `on(type, fn)`; a per-match event log |
| `03-tuning.js` | `T` | every tunable number: defaults, live values, slider metadata (`min`, `max`, `step`, `group`, `label`), `reset(key)`, `resetAll()`, persisted in `E.store('dev:tuning')` |
| `04-data-teams.js` | `TEAMS` | 6 teams (section 11.1): colors, logos (string sprites), players, ratings, voices, goal songs |
| `05-data-arenas.js` | `ARENAS` | 5 arenas (11.2): floor palette, boards style, ads, crowd, props, lights, weather, hazards, music, organ |
| `06-data-story.js` | `STORY` | chapters, cutscene scripts, choices, objectives, unlocks |
| `07-data-text.js` | `TEXT` | commentary lines by event, chirps, tips, three-stars lines, credits and About pages |
| `10-synth.js` | `Synth` | babble voices, goal horn, organ, crowd bed, skate noise; sfx defines; songs |
| `11-glyphs.js` | `Glyphs` | device-aware prompt chips: PS / Xbox button badges, keycaps and mouse icons, as sprites; `Glyphs.chip(g, action, x, y)`; `{pass}`-style tokens in text |
| `12-ui.js` | `UI` | 10-foot widgets: the tile menu, card carousel, list with sliders, buttons, big banners, toasts; focus by d-pad, stick, keys and mouse hover; click to pick; sounds |
| `20-rink.js` | `Rink` | geometry (rounded rectangle, lines, dots, creases, nets, panels, benches), collision queries, the floor TileMap, board/glass/net drawing, the scuff layer |
| `21-rigs.js` | `Rigs` | the SkaterRig, GoalieRig, RefRig and FanRig factories, solvePose overlays (skating, stick, goalie stances, fight holds), and accessories (dropped gloves, helmets, hats, octopus) |
| `22-skater.js` | `Skater` | the pure `skateStep(state, intent, params, dt)`, the action state machine, ratings → multipliers |
| `23-puck.js` | `Puck` | puck physics with substeps, possession, pickup and battles, deflections, posts, net and goal detection |
| `24-goalie.js` | `Goalie` | positioning, the save solver, save types, freeze or rebound, poke, the Kaboom blast, manual control (shootout) |
| `25-ai.js` | `AI` | team roles, decisions, steering, difficulty, item greed, fight AI, chirp AI |
| `26-match.js` | `Match` | the match: phases, faceoffs, clock, goals, periods, OT, shootout, final, stats, three stars, objectives, the sin bin; it owns the entities; `Match.step(dt)` |
| `27-hits.js` | `Hits` | checks, impulses, knockdowns, the glass, grudges |
| `28-fight.js` | `Fight` | the fight minigame |
| `29-boom.js` | `Boom` | BOOM meters and KABOOM mode |
| `30-items.js` | `Items` | fan throws, power-ups, hazards, arena hazards (thin ice, the mascot, the Discount Drop) |
| `31-camera.js` | `Cam` | the broadcast director: follow, lead, zoom, punch-in, fight, replay and intro framing |
| `32-replay.js` | `Replay` | the ring buffer, instant replay, the highlight reel for the credits |
| `33-talk.js` | `Talk` | the commentary booth, chirp bubbles, tips, subtitles, voices |
| `34-hud.js` | `Hud` | the score bug, meters, indicators, the radar, prompts, banners, the fight HUD, lower-thirds |
| `35-fx.js` | `Fx` | event → particles, lights, shakes, crowd reactions, sounds (the only place simulation events become sensory) |
| `36-crowd.js` | `Crowd` | fans in the stands (excitement, waves, signs, glass pounders), the organist, the bench players |
| `40-scene-title.js` … `56-scene-lab.js` | scenes | one file per scene in 5.1, numbered from 40 upward |
| `70-dev.js` | `Dev` | the dev panel (15.3), cheats, warps, debug overlays, the sound test, the animation lab |
| `71-drills.js` | `Drills` | the 7 practice drills, built from match primitives |
| `80-net.js` | `Net` | AI Hub connect, the own card, host and client sync (section 14) |
| `90-start.js` | – | the scene table, deep links, `game.start`, `game.debug`, `window.__game` |

### 5.3 Entities (plain objects, owned by `Match`)
- `Skater`: `{ id, team, slot, def, x, y, z, vx, vy, vz, facing, state, stateT, turbo, hasPuck, ctrl: { kind: 'human' |
  'cpu' | 'remote', input, player, seat }, intent, items: {}, grudge: {}, stats, rig }`. States: `skate`, `stop`,
  `wind`, `shoot`, `pass`, `check`, `deke`, `poke`, `stun`, `down`, `getup`, `celebrate`, `faceoff`, `fight`, `bin`,
  `frozen` (pond plunge), `buried` (snowbank), `slip`.
- `Goalie`: `{ id, team, def, x, y, facing, state, save, size, blastT, rig }`. States: `ready`, `shuffle`, `butterfly`,
  `glove`, `blocker`, `stack`, `poke`, `cover`, `blasted`, `celebrate`, `manual`.
- `Puck`: `{ x, y, z, vx, vy, vz, owner, lastTouch, prevTouch, onFire, inNet, out }`.
- `Ref`: one referee and one linesman. `Item`: `{ kind, x, y, vx, vy, t, z }`. `Hazard`: thin-ice patches, holes,
  the mascot, octopi, rats.
- `Intent` (what any controller produces, and what the network carries): `{ mx, my (−1..1), aim (world point or
  null), held: { shoot, lob, turbo }, press: { pass, shoot, deke, lob, chirp, switch } }`.

### 5.4 The match step (fixed order; deterministic; `Match.step(dt)`)
1. **Intents**: humans from their inputs (or network packets on the host); the AI for CPU skaters (they re-think every
   0.12–0.3 s and steer in between).
2. **Phase logic**: faceoff timers, stoppages, celebrations, replays, fights, period ends.
3. **Actions**: start passes, shots, checks, dekes, pokes, gloves and chirps, which emit events.
4. **Movement**: `Skater.skateStep` for each skater, then skater–skater pushes, then board collisions.
5. **Puck**: if it has an owner, it follows the blade; otherwise it integrates in 4 substeps, ray-tested against boards,
   posts, nets, goalies, sticks and bodies. This emits shots, saves, posts, deflections, goals and outs.
6. **Goalies**: positioning and the save solver (5 and 6 interleave inside the substeps).
7. **Hits**: contacts in the check state, knockdowns, glass, grudges.
8. **Items and hazards**.
9. **Boom, Kaboom and sin-bin timers**.
10. **Clock**: period end, OT, shootout.
11. **Consumers** (they never feed back into the simulation): stats, objectives, `Talk`, `Fx`, `Crowd`, `Net`. These
    use `RNG.fx` only.
12. **Replay recorder**: every second step (60 Hz).
13. **Camera director**. 14. **Rig updates** from entity state.

**RNG**: the simulation draws only from `RNG.sim`, seeded per match (story: chapter number × 1000 + attempt;
exhibition: a seed from `Date.now()` taken at setup and shown in the Dev panel; session: from `AIHub.rng('sim')` on
the host). Particles, crowd and commentary draw from `RNG.fx`.

### 5.5 Debug handle (tests and tools read it)
`game.debug = { snapshot(), warp(target, opts), set(key, value), cheat(name, on), event(type, data), seed(n) }`.
`snapshot()` returns `{ scene, mode, phase, period, clock, score, shots, puck: { x, y, z, owner }, skaters: [{ id,
team, x, y, state, ctrl }], goalies: [{ x, y, state }], boom, kaboom, fight, items, sinBin, story: { chapter, stars,
step }, attract: { segment, visited }, dev: { open }, net: { role, players }, errors: game.errors.length }`.
`window.__game = { game, scenes, Match, T, Dev, Net, STORY }`.

---

## 6. Controls (one game on every device)

### 6.1 Actions and default bindings (`HOCKEY_KEYS`, built from `E.Input.DEFAULT`'s menu keys)
| Action | DualSense | Keyboard | Mouse | With the puck | Without the puck |
|---|---|---|---|---|---|
| move | left stick, d-pad | WASD, arrows | – | skate | skate |
| `pass` | ✕ (Pad0) | J | right button | pass toward the aim | switch to the teammate nearest the puck; if a CPU teammate has the puck, **call for the pass** |
| `shoot` | □ (Pad2) | K | left button | tap: wrist shot; hold: slapshot wind-up, release to fire | body check |
| `deke` | ○ (Pad1) | L, Space | – | deke (spin move) | poke check |
| `lob` | △ (Pad3) | I | middle button | saucer pass | hold 0.5 s near a rival: drop the gloves (or accept a challenge) |
| `turbo` | R2 (Pad7), R1 (Pad5) | Shift | – | turbo (hold) | turbo (hold) |
| `chirp` | L1 (Pad4) | C | – | chirp | chirp |
| `switch` | L2 (Pad6) | Q | – | – | switch player (always) |
| `camera` | R3 (Pad11) | V | – | cycle Broadcast / Overhead | same |
| pause | Options | Esc, P | – | pause menu (engine) | |

- **Why these keys**: WASD to move, the mouse to aim, left click to shoot and right click to pass, Shift to sprint
  (turbo) and Space to dodge (deke) are what PC players expect from sports and action games. J/K/L/I give
  keyboard-only players the engine's usual action cluster.
- **Aim**: with the mouse, when the pointer moved in the last 2 s, a reticle sits on the ice at `game.mouseGround()`:
  passes go to the teammate nearest it (within 80 u), else to the point; shots aim at the goal mouth where the line
  through the reticle meets it. On a pad, the right stick (`input.padAim`) aims the same way while deflected. Otherwise
  aim follows the move direction.
- **Context reuse**: in a fight, ✕ jab, □ haymaker, ○ duck, △ yank. In the shootout when defending, the stick slides
  the goalie, ✕ butterfly, □ poke, ○ dive. Flood Wagon: the stick steers toward that screen direction, R2/Shift is gas,
  ✕ honks.
- **Two on one keyboard**: `E.Input.halfKeys(HOCKEY_KEYS, 'left' | 'right')` gives P1 WASD + F G H R T Y and P2 the
  arrows + `. / , L ; '` and the numpad, each half taking pass, shoot, deke, lob, turbo, chirp in order. The side
  select screen shows both layouts with keycaps.
- **Controls screen names** (`menu.controls`): pass "Pass / Switch", shoot "Shoot / Check", deke "Deke / Poke",
  lob "Saucer / Gloves", turbo "Turbo", chirp "Chirp", switch "Switch player", camera "Camera". Hide the
  preset's unused `attack dash skill jump` (`false`).

### 6.2 Prompts and glyphs
- `Glyphs.chip(g, action, x, y, { device })` draws the binding for the device used last (`input.lastDevice`, per
  player). **Gamepad**: a round dark badge with the PlayStation symbol in its color (✕ blue `#7aa7ff`, ○ red
  `#ff6b6b`, □ pink `#ff8ad8`, △ green `#4fe3a1`). With **Settings → Button symbols: Xbox**, the badge shows A, B, X or
  Y in green, red, blue or yellow. Shoulders and triggers are rounded rectangles (L1 R1 L2 R2, or LB RB LT RT).
  **Keyboard**: a keycap with the key's label. **Mouse**: a 7×10 mouse icon with the pressed button lit.
- **Settings → Button symbols** (`PlayStation` default, `Xbox`) sets `game.input.glyphs`. Keep it in sync both ways
  with the engine's own Controls option.
- Text with tokens (`"Hold {shoot} for a slapshot"`) is laid out by `Glyphs.text(g, str, x, y, opts)`, which replaces
  each `{action}` with a chip.

---

## 7. Systems (rules, numbers, behavior)

All distances in world units (u), times in seconds. `T.name` marks a tunable (Appendix A has every default).

### 7.1 The rink (`Rink`)
- **Arena map**: a TileMap of 70 × 44 tiles (1120 × 704 u); rink center `C = (560, 400)`.
- **Rink**: a rounded rectangle with half-length 432, half-width 192 and corner radius 96 (x 128–992, y 208–592).
  `Rink.inside(x, y, r)`, `Rink.normalAt(x, y)` and `Rink.clamp(body, r)` are analytic: no stair-stepped corners.
- **Markings** (painted by `floorTex(x, y)`, baked once per arena): red center line (5 u) at `C.x`; blue lines (5 u)
  at `C.x ± 108`; red goal lines (2 u) at `C.x ± 376`; 5 faceoff circles of radius 72 (center, and the end-zone dots at
  `C.x ± 280, C.y ± 112`); neutral-zone dots at `C.x ± 84, C.y ± 112`; creases (half-discs of radius 28, light blue
  `#9fd3ff` with a red rim); the center-ice logo (the home team's logo sprite scaled x3, sampled per pixel); ice
  `#e9f3fb` with subtle noise, cool shading near the boards and a faint sheen. Outside the rink: rubber matting or
  concrete; the pond uses snow.
- **Goals**: the mouth spans `y = C.y ± 16` (32 wide, from post center to post center), the crossbar is at z 20, and
  the net runs 20 deep behind the goal line. Posts are cylinders of r 1.5. The net's mesh is translucent white (a
  blend at .35, lines every 3 px) and **bulges** where the puck hits (6 control points that spring back, k = 18).
- **Boards**: 17 high (white, with a 2-u yellow kick plate, ads on the straight runs, and a top cap in the home
  color). Glass rises 28 above the boards on the sides and 40 at the ends. It is split into **48 panels** (14 per side,
  4 per end, 3 per corner arc), each with a state of `ok`, `cracked` or `shattered`, and the stanchions show between
  them.
- **Drawing order**: the floor first, then the scuff decals, then the far (north) boards, glass, benches, sin bins and
  stands as background (skaters are always in front of them), then the end and corner panels queued one by one (`r.queue`
  at the panel's center, so they sort per panel), then the near (south) boards queued **cut low** (6 u, no glass, only
  the top rail), so they never hide play. Glass draws with `px.blend(.25)`, a white highlight streak, and crack lines
  or an empty frame by state.
- **Stands**: north of the benches (y 0–176) in 5 stepped tiers (TileMap wall types 24–64 high, with `face`
  materials per arena), and at the west and east ends (x 0–112 and 1008–1120). Nothing is built south of the near
  boards' apron; the near crowd is the screen-space silhouette row (section 8).
- **Benches and sin bins** sit on the far side, outside the boards (y 184–208): the home bench at x `C.x−216…C.x−72`,
  the away bench at `C.x+72…C.x+216`, the sin bins at `C.x−60…C.x−12` (home) and `C.x+12…C.x+60` (away), and the
  scorekeeper between them. Each team's bench holds 2 sitting spares and its coach standing. A skater in the sin bin
  sits in the box, visible.
- **Scuff layer**: a grid of 54 × 24 cells (16 u) of `scuff` 0..1 and `melt` 0..1. Skating adds
  `0.0025 × speed/132` per step to its cell, a hockey stop +0.12, a knockdown +0.2 in radius 1, Kaboom skates
  `melt` +0.05 a step. Draw with `r.decal`: each cell over .05 draws 1–4 scratch lines (a pattern from the cell's hash,
  alpha by scuff), and melt draws blue-grey puddles with a shine. The Flood Wagon clears both.

### 7.2 Skating (`Skater.skateStep`, pure: the network prediction runs it too)
- Max speed `T.skateMax` 132 × the speed rating (`0.85 + 0.05 × Spd`), × `T.turboMul` 1.45 with turbo, × 0.94 when
  carrying the puck, and × 0.6 while winding up a slapshot.
- Acceleration `T.skateAccel` 300 × `(1 − 0.6 (v/vmax)²)` along the stick. Gliding with no input decelerates by
  `T.iceGlide` 28.
- **Turning**: the velocity heading rotates toward the stick direction at `lerp(T.turnSlow 5.0, T.turnFast 2.6,
  v/vmax)` rad/s. The sideways component of velocity relative to the facing decays at `T.edgeGrip` 6/s, which gives
  carves rather than slides.
- **Hockey stop**: when the stick points more than 120° from the velocity at speed > 60, the skater enters `stop`
  (at least 0.22 s): deceleration `T.stopDecel` 700, a snow spray (event `stop`), the torso turned 70°. The skater then
  accelerates the new way.
- Facing follows velocity (the AI may skate backward at 0.75× speed to keep facing the puck, using C-cut legs).
- **Turbo** meter 0..1: drains `T.turboDrain` 0.45/s while held and moving, and regenerates `T.turboRegen` 0.18/s
  once released for 0.6 s.
- **Bodies**: r 7. Masses: heroic 1.0, bulky 1.35, goalie 1.6 (The Vault 2.2). Skater–skater overlap pushes them
  apart with a restitution of .3. A collision without the check state is a "bump": no knockdown unless the closing
  speed is above `T.accidentalHit` 180.
- **Boards**: reflect the normal velocity × .3 and keep 85% of the tangential. Faster than 120 into the boards: a
  "rattle" event (sound, glass shake).

### 7.3 The puck (`Puck`)
- r 1.6, drawn as a black ellipse of 3×2 px with a 1-px highlight, plus a shadow. Above 300 u/s it gets a streak; the
  **Puck trail** setting chooses Off, Streak or Glow (neon).
- Free motion: `v −= (T.puckFriction 26 + T.puckDrag 0.12 × |v|) dt`. Gravity 700 in the air. Hitting the ice: vz ×
  −0.3, and speed × 0.9 when vz was below −60. Speed cap 760.
- **4 substeps** per step, each a swept test against: the boards (restitution `T.boardBounce` .62 normal, .92
  tangential; the glass .5 when z > 17); posts (.82 plus a **ping** event; the crossbar when z is 19–21 inside the
  mouth); the net (from behind or the sides .2, a "net" sound); goalies (section 7.6); sticks (pickup or deflection);
  bodies (r 7: .35, a "body" event; a shot hitting a skater is a **block**). Over the glass top, or through a
  shattered panel: **out of play**, then a faceoff at the nearest end-zone dot.
- **Goal**: the puck's center crosses the goal line inside the mouth (`|y − C.y| < 16 − 1.6`) with z < 20 − 1.6,
  moving inward. The puck stays in the net (`inNet`; the bulge plays).
- **Possession**: the owner's blade point is `pos + R(facing) · [11, hand × 4]` (`hand` +1 right shot, −1 left, from
  the player data). The puck eases toward the blade at k = 30/s and weaves ±3 across (`sin(t × 9)`) at low speed.
- **Pickup**: a loose puck within `T.pickupRadius` 8 × the handling multiplier of the blade point (or 10 of the body
  center), at z < 6, after the skater's `pickupCooldown` (0.25 s once it releases the puck). If the relative speed is
  under 300 it is taken. Faster, it is caught with chance `clamp(1.3 − rel/450 + 0.08 (Hnd − 3), 0.1, 1)`, otherwise
  it deflects off the blade (reflected around the blade's normal at 0.5×).
- **Puck battles**: when opposing blades are both within 8 of a loose or carried puck, every 0.2 s the one with the
  higher `Hnd + Hit/2 + RNG.sim() × 3` takes it (a "battle" event, stick-clack sounds).

### 7.4 Passing
- **Target**: the teammate whose bearing is nearest the aim within 75°; otherwise the nearest teammate ahead; with
  mouse or right-stick aim, the teammate nearest the reticle within 80, otherwise a pass to the space at the reticle.
- **Lead**: aim at `mate.pos + mate.v × tFlight × 0.9`, iterated twice; speed `clamp(220 + 0.9 d, 240, 420) ×
  (0.9 + 0.033 Pas)`; angular error σ = `0.06 × (1.3 − 0.1 Pas)` rad.
- **Interception**: an opponent's blade that comes within 8 of the puck's path tries a pickup (7.3).
- **Saucer pass** (`lob`): `E.arc` with apex 10 and speed × 0.8. It can't be intercepted while z > 6, lands near the
  mate and wobbles on landing.
- **Receiving**: the pass sets `receiving` on the target. The CPU turns to it; a lone human's control switches to the
  receiver at once (auto-switch, standard in hockey games).
- **One-timer**: a receiver who presses shoot while a pass is on its way and within 0.35 s of arriving, or who holds
  shoot when it arrives, fires on contact: speed = the slap formula at charge .85 × `T.oneTimerBonus` 1.15, and the
  aim error halves. The prompt `{shoot} ONE-TIMER!` pops over the human receiver while the pass flies.
- **Call for pass**: a human without the puck whose CPU teammate carries it presses `pass`; the carrier passes to
  them within 0.3 s if the lane is clear, otherwise as soon as it opens (up to 1.2 s). The human's indicator flashes
  "!".

### 7.5 Shooting
- `shoot` with the puck: released within 0.18 s it is a **wrist shot**: `T.wristSpeed` 330 × shot multiplier
  (`0.85 + 0.05 Sht`), lift 2–10 at the goal, error σ 5 × (1.3 − 0.1 Sht). Held longer it is a **slapshot**: the
  skater winds up (slowed to 0.6×; a meter fills over `T.slapCharge` 0.9 s; a poke or check can strip it). On release:
  speed `(T.slapBase 380 + T.slapGain 160 × charge) × shot multiplier`, lift 4–18, σ `7 × (1.3 − 0.1 Sht) × (1.4 −
  0.4 charge)`.
- **The aim point in the net**: without aim input, the open side (the side farther from the goalie's center) at mid
  height. With stick aim, up and down on the stick pick near or far side (mirrored for each attack direction). With the
  mouse, where the reticle's line meets the mouth. Slapshots go **top shelf** (z 14–18) when the goalie is down.
- Turbo adds +12% speed, the Lumber item gives +30% and zero error, and KABOOM turns a charge ≥ .95 into a **KABOOM
  shot** (7.10).
- Every shot is logged with type (`wrist`, `slap`, `onetimer`, `kaboom`, `deke`, `rebound`, `deflect`), speed and
  distance. "On goal" means the shot's line crosses the goal line inside the mouth. Shots from anywhere count
  (dump-ins too).

### 7.6 Goalies (`Goalie`)
- **Positioning**: on an arc in front of the goal center, radius 10–26 (out to 26 to cut the angle when the puck is
  far, back to 10 when it is close), on the bisector toward the puck. Lateral speed `T.goalieLateral` 150 × (0.85 +
  0.05 Rfx), with T-push bursts to 230. When the puck is behind the net, the goalie hugs the post on the puck's side.
  Idle animations: tapping the posts, a crouch bounce.
- **Save solver**: whenever the puck's line will cross the goal line inside the mouth within 1 s (a shot, pass or
  deflection), predict the crossing `(yc, zc, tc)`. After a reaction delay (`T.goalieReact` 0.16 − 0.015 (Rfx − 3) +
  difficulty offset, plus 0.08 if **screened** by a body within 14 of the shot line, plus 0.12 if **deked** within the
  last 0.5 s at under 70 range), the goalie moves toward `yc`, picks a save type and, when the puck crosses the
  goalie's plane, tests its **save shape**. All widths scale with `0.9 + 0.033 Size` × the item and boss factors:
  - standing: `|dy| < 8`, z 0–22;
  - butterfly (zc < 9): `|dy| < 14`, z 0–10, plus the upper body `|dy| < 6`, z 10–20;
  - glove (high, catching side) and blocker (high, other side): a reach disc of r 5 out to `dy ±15`, z 10–21;
  - stack (desperation, needs `|dy| > 12` in under 0.2 s): `|dy| < 18`, z 0–8, then 1 s to get up.
- **Outcome**: glove saves freeze (`T.gloveCatch` 0.55; then a whistle and a faceoff in that zone). Pad and blocker
  saves **rebound** at 0.35 v, ±50° away from the net. Butterfly saves: 40% smother, 60% rebound. Rebounds are live.
- **Poke check**: when a carrier comes within 22 in front, a 40% (× Rfx) chance to strip the puck.
- **Kaboom blast**: a KABOOM shot that hits a goalie blows them back (`blasted`, 1.2 s, flailing into the net). With
  `T.kaboomBlast` 0.6 the puck carries through (a goal); otherwise it drops dead in the crease.
- **Manual goalie** (shootout only, for the defending human): the stick moves along the arc and in or out; ✕
  butterfly, □ poke, ○ stack toward the stick. Glove and blocker reach is automatic within the standing shape.
- **Balance targets** (checked by `tests/balance.mjs`, 18.4): wrist shots from more than 150 away saved 88–96%;
  one-timers across the crease 40–60%; breakaway dekes 45–65%; KABOOM shots on target 20–40% saved.

### 7.7 Checking, the glass, grudges (`Hits`)
- `shoot` without the puck starts `check` (0.3 s): a lunge of +60 along the facing and a shoulder-lead pose.
- **Contact** with a rival (r 8 each) during `check`: `impulse = T.checkPower 1.0 × (closing speed + 60) × (attacker
  mass / target mass) × (0.8 + 0.067 Hit) × (turbo 1.45) × (KABOOM 2.0) × (Poutine 1.6)`.
  - Below 90: **bump**. The target staggers 0.25 s; a carrier loses the puck 50% of the time.
  - 90 up to `T.knockdown` 150: **check**. The target stumbles 0.5 s and loses the puck.
  - 150 and up: **BIG HIT**. The target is knocked down (`down` for 1.4 s: a tumble, then a belly slide at 0.8 ×
    impulse along the normal, then `getup` 0.5 s). Hit-stop 0.07 s, a shake of 3, a zoom punch to 1.1, the crowd
    goes "OHHH", BOOM +18, and the target's grudge against the hitter +35.
- **The glass**: a body sliding or knocked into the boards faster than `T.glassCrack` 170 cracks the panel there. If
  the panel was already cracked, or the speed is over `T.glassShatter` 240, it shatters: shards (`bits` in light blue
  and white), a crash, the front-row fans flinch, BOOM +8 or +15, and the commentary calls it. A shattered panel lets
  the puck out. At the next stoppage two glass techs skate out and put a new panel in (1.5 s, cosmetic).
- **Accidental contact** knocks the referee or the mascot over too (comedy). Goalies can be knocked down only by a
  KABOOM check (the crowd boos).
- **Grudge** (per ordered pair, 0..100): +35 for being big-hit, +10 for being checked, +15 for being chirped, +10
  when the rival big-hits a teammate. It decays 4/s after 3 s of peace.

### 7.8 Deke and poke
- **Deke** (`deke` with the puck): 0.45 s, a sideways cut of +90 toward the stick (alternating when the stick is
  neutral), a spin animation (a spin-o-rama with turbo). Checks in its first 0.3 s miss with chance `0.7 + 0.04 (Hnd −
  3)`. Cooldown 0.8 s. A goalie within 70 "bites" (7.6). A deke that leaves a defender behind within 1 s is a
  `deke_beat` event (BOOM +6, commentary).
- **Poke** (`deke` without the puck): 0.35 s, the blade reaches 18 ahead. If it passes within 8 of a carried puck,
  steal chance is `T.pokeBase 0.55 + 0.08 (pokerHnd − carrierHnd)`. A miss leaves the poker off balance for 0.3 s.

### 7.9 Chirping (`chirp`)
Pressing chirp makes the skater shout a line from `TEXT.chirps` at the nearest rival within 120: a speech bubble (2 s,
tiny font, wrapped to 90 px) and babble in their voice. BOOM +3; the target's grudge +15; cooldown 4 s. CPU skaters
chirp after big hits and goals (30%), and the human's chirps raise the chance that a CPU rival with Fight ≥ 4
challenges.

### 7.10 The BOOM meter and KABOOM mode (`Boom`)
- **One meter per team**, 0..100, × `T.boomGain` 1.0. Gains: big hit +18, check +6, glass crack +8 or shatter +15,
  fight win +45, fight loss +5, goal +20, shot on goal +4, save (to the goalie's team) +5, completed pass +2,
  one-timer +6, deke beat +6, chirp +3, BOOM Box item +40, mascot down +10, perfect Flood Wagon +30, Doris's organ
  (chapter 5) +30.
- **At 100 → KABOOM** for `T.kaboomTime` 15 s, or until the other team scores. A screen flash, an explosion burst over
  the team's bench, "KA-BOOM!" (title font, shaking), the arena lights tint the team's color with a pulse, flame
  cannons in the Dome, and the music's `kaboom` layer fades in (drums and distorted bass). For that team: infinite
  turbo, the slapshot charges 2× faster, a full charge fires a **KABOOM shot**, checks are 2× strong, skates throw
  sparks and leave molten `melt` trails, and their goalie reacts 0.03 s faster. The meter then resets to 0.
- **KABOOM shot**: 760 u/s with zero error. The puck is a fireball (a glowing sprite, fire particles every step, a light
  following it). Into the goalie → the blast (7.6). Into a skater → an explosion and a knockdown. Into the boards → an
  explosion, and a hit panel shatters. A KABOOM goal: the net tips back in an explosion, a confetti and fire burst, a
  double horn and fireworks in the Dome.
- **Gilded Mode** is the Grizzlies' KABOOM (chapter 5): the same rules with gold flames.

### 7.11 Fights and the sin bin (`Fight`)
- **Trigger**: a human-controlled skater within 40 of a rival when either holds a grudge ≥ 40 against the other gets
  the prompt `HOLD {lob} — DROP THE GLOVES`. Holding △ for 0.5 s challenges. A CPU rival accepts with
  `clamp(0.4 + 0.12 (Fgt − 3) + grudge/200, 0.1, 0.95)` (forced in chapter 3 when the Bruise Brothers are involved).
  A human rival (local or online) gets `HOLD {lob} TO ACCEPT` for 3 s. Declining is **turtling**: the decliner's team
  BOOM −10 and the challenger's +10, and the crowd boos. A **CPU** with Fgt ≥ 4 and grudge ≥ 70 near a human-controlled
  skater challenges them the same way. At most one fight per 60 s of clock and `T.fightMax` 3 per game.
- **Staging**: a whistle; the clock stops; the camera moves to `brawler`, zoom 1.6, framing the two (`cam.frame`).
  Gloves and helmets drop as sprites on the ice; the other skaters circle at 50; the referee and the linesman hover;
  the crowd stands; the organ plays the fight vamp. The fight HUD shows two portraits with balance and stamina bars.
- **Fighters**: balance 100 (`T.fightBalance`) and stamina 100 (regen 25/s); damage × `0.8 + 0.067 Fgt`.
  - **Jab** (✕): 0.25 s, 6 damage, 8 stamina, staggers 0.12 s (rig: `jab`).
  - **Haymaker** (□): wind-up 0.35 s (a clear telegraph: the arm draws back, a glint), active 0.1, recover 0.35. 18
    damage (+6 if held up to 0.6 s), 22 stamina. A whiff leaves you open for 0.5 s (rig: `haymaker`, or `hook`
    alternating).
  - **Duck** (○): 0.35 s, immune to haymakers and half damage from jabs; 10 stamina; cooldown 0.4 (pose: `crouch` +
    lean back).
  - **Yank** (△): 0.3 s. If it lands, the rival's guard breaks for 0.6 s and they lose 15 stamina. **Three yanks
    within 4 s pull the jersey over their head** (their rig gets `hood: true` in jersey color): blind for 1.5 s.
  - With no stamina, everything is 40% slower.
  - The CPU fighter ducks a haymaker wind-up with probability = its skill, and otherwise mixes jabs, haymakers and
    yanks by personality.
- **End**: balance ≤ 0 → that fighter falls (`down`); the winner raises a fist (`cheer`); a crowd roar; the winner's
  team BOOM +45. The loser goes to the **sin bin** for `T.sinBin` 20 s of play clock (a "POWER PLAY" banner and timer
  under the score bug), seated in the box, then steps out through the box door. If 20 s pass, the linesmen separate
  them: a draw with no penalty and BOOM +10 each. Play resumes with a faceoff at the nearest dot.

### 7.12 Fan throws, power-ups and hazards (`Items`)
- **Throws**: every `T.itemEvery` 25–45 s of play, and 25% of the time right after a big hit or goal, a fan in the
  stands throws (a lob arc from the crowd over the glass) onto the neutral or attacking zone. The item slides to a stop
  and lasts 12 s (blinking for its last 3). Arena pools are in 11.2.
- **Pickup**: a skater body within 12. Icons and timers show over the holder's head.

| Item | Look | Effect |
|---|---|---|
| HOT SAUCE | red bottle (store `bottle`) | infinite turbo 8 s, fire trail |
| GRANDMA'S TAPE | white tape roll | 10 s: can't lose the puck to pokes or checks below a big hit; passes can't be intercepted |
| POUTINE | bowl of fries (store `bowl`) | 10 s: can't be knocked down; every check is a big hit (×1.6) |
| LUMBER | a stick with a lightning bolt | the next 3 shots: +30% speed, zero error |
| BRICK PADS | a brick | the holder's goalie grows ×1.35 for 12 s |
| BOOM BOX | a boombox | +40 team BOOM |
| HOT COCOA (pond only) | a steaming thermos | turbo refilled + 20% speed 8 s |

| Hazard | Where | Effect |
|---|---|---|
| OCTOPUS | Grindhouse, Dome, cheat | a slip patch r 10: skaters crossing it `slip` (1.2 s, legs up, a slide); at the next stoppage the referee picks it up and twirls it overhead |
| RUBBER RAT | Grindhouse | scurries randomly for 10 s; trips skaters (as slip) |
| HATS | after any hat trick | 20–40 hats rain from the stands (cosmetic, swept up at the stoppage) |

- **AI item greed**: a CPU skater not involved in the play (not the carrier, its marker or the pressure player)
  detours to an item within 120 (`T.aiItemGreed`).
- **Arena hazards**:
  - **Thin ice** (pond): 3 elliptical patches (40 × 24) at fixed spots outside the creases, each with integrity 100.
    A knockdown on a patch costs 50 and a big hit there 100. At 0 the patch breaks into a hole: black water, ripples
    and a splash. A skater who enters a hole is `frozen` for 3 s (rig tinted icy blue inside a translucent block),
    then pops out at the edge. A puck that falls in is lost, then a faceoff. Holes refreeze (as a darker patch) after
    30 s or at intermission.
  - **Snowbanks** (pond): the boards are snowbanks with no glass. Restitution .3 and a snow puff. A big hit into one
    leaves the target `buried` for 1.5 s with only the head and skates showing.
  - **Polar Pete** (mall): the mascot skates figure eights in the neutral zone during play. A moving obstacle (mass
    1.5) that can be checked ("MASCOT DOWN!", BOOM +10); it gets up after 3 s and waves.
  - **Discount Drop** (mall): every 40 s a ceiling claw lowers a crate to center ice; it breaks into a power-up.

### 7.13 Team AI (`AI`)
- **Cadence**: each CPU skater re-thinks every `lerp(0.3, 0.12, skill)` s and reacts after `lerp(0.35, 0.1, skill)`
  s; between decisions it steers. Steering: seek the target, stay 12 from the boards unless chasing the puck, keep 40
  from teammates, and avoid rivals while carrying.
- **With the puck** (offense):
  - **Carrier**: shoot when in the shooting zone (within 200 of the net, within ±60° of its axis, at most one body in the
    lane), or when a one-timer pass is on. Pass when pressured (a rival within 26 ahead) or when a teammate is clearly
    better placed (open lane, at least 60 closer to the net). Deke when a defender is square in front within 30 (40%
    × Hnd/3). Otherwise carry toward the net, slaloming around defenders, with turbo in open ice.
  - **Support forward**: get open on the far side at the dot height (about 150 from the goal line); once the carrier
    crosses the blue line, drift to the far post or the slot for a one-timer.
  - **Point**: stay at the blue line as an outlet; crash the net for rebounds when aggression is high.
- **Without the puck** (defense):
  - **Pressure**: the nearest skater intercepts the carrier's position 0.3 s ahead, then checks (when Hit ≥ 3 and
    `RNG.sim() < aggression`) or pokes.
  - **Cover**: marks the most dangerous rival without the puck (in the passing lane, or between them and the net).
  - **Home**: guards the slot between the puck and its own net.
- **Loose puck**: each team sends the skater who can reach the predicted puck position first. The rest take offense or
  defense spots according to which team will probably win the race.
- **Faceoffs**: centers face off at the dot; wingers line up on both sides; the point man behind.
- **Difficulty** (Settings): Rookie, Pro, All-Star, Legend set AI skill .35 / .55 / .75 / .95, CPU goalie reaction
  offsets +.06 / +.02 / 0 / −.02 s, and the human team's goalie −.03 / −.01 / 0 / +.01. Light rubber-banding (CPU
  skill −.1 while it leads by 3 or more) on Rookie only.
- **Teammates of humans** use the same AI and also obey call-for-pass. Team tactics from story choices: **Finesse**
  (pass bias +30%, speed +4%) or **Grit** (check bias +30%, BOOM gain +15%).

### 7.14 Match flow (`Match`)
- **Configuration**: `{ home, away, arena, periods: 3, periodLen: 120, ot: 'sudden' (120 s, 3-on-3) | 'none',
  shootout: true, intros: true, replays: 'auto', flood: 'ask' | 'always' | 'never', difficulty, cheats, objectives,
  script, humans: [{ team, input }] }`.
- **Phases**: `intro` → `faceoff` → `play` ⇄ `stoppage` → `goal` → `replay` → `faceoff` … `periodEnd` →
  `intermission` (Flood Wagon) → `faceoff` … `final` → `results`. Also `fight`, `ot`, `shootout` and `celebration`.
  The clock counts down only in `play`. The engine's pause freezes everything.
- **Faceoff**: the referee holds the puck, raises an arm and drops it after a random 0.6–1.2 s. Each center presses
  `pass` or `shoot` when it drops; the earlier press within 0–0.25 s after the drop wins (a press before the drop is a
  slow, mistimed swipe); a CPU center reacts after its skill delay. The winner's swipe sends the puck back to a
  teammate.
- **Stoppages**: a frozen puck, the puck out of play, after a fight, at the end of a sin-bin call. Each brings a
  whistle, a 1.5 s pause, a lower-third stat card (shots, hits, faceoffs %), an organ sting, and then the faceoff.
- **Goals**: the horn (3 s), the red goal light spinning behind that net, the team's goal song sting, the crowd jumping,
  the scorer's celebration (chosen by personality: fist pump, sniper aim, knee slide, stick guitar, a bounce off the
  glass), and teammates converging. "GOAL!" in the title font, the scoring summary (scorer and assists, the
  last two touches by the scorer's team), then an **instant replay** (7.16), then a center faceoff.
- **Hat trick**: a player's third goal makes hats rain, and the commentary calls it. **Hoser Hat Trick**: one player
  with a goal, an assist and a fight win in one game, shown as a toast.
- **Periods**: the buzzer at 0:00, then the period summary card. **Intermission**: the Flood Wagon minigame (offered
  per the `flood` option; skipping runs a 6 s AI resurfacing fast-forward), then the next period. Teams switch ends
  every period.
- **Overtime**: sudden death; a tie after it goes to the shootout (exhibition and story). In session mode: at most 60
  s of sudden death, then a tie.
- **Shootout**: 3 rounds each (home first), then sudden-death rounds. A shooter starts at center with the puck and an
  8-second shot clock; the attempt ends on a shot, a save, a goal, or the puck going backward. Humans shoot for their
  team (the skaters rotate) and play goalie against the CPU's shooters (6.1). The HUD shows big ✓ and ✗ marks.
- **Final**: the final horn, the winning team celebrates, the losers slump (`kneel`), then **results**.
- **Stats** per skater: goals, assists, shots, hits, big hits, takeaways, fights won, turbo used, top shot speed.
  Per goalie: saves and shots against. Per team: everything summed, plus BOOM filled and Kabooms.
- **Three stars**: rank players by `3 G + 2 A + 0.5 bigHits + 1.5 fightsWon + 0.3 shots` (goalies:
  `0.12 saves + 2 × (save% − .85) × 10`) and announce the third, second and first stars, each with a portrait card and a
  commentary line.
- **Objectives**: declarative `{ id, text, on: 'goal' | 'hit' | …, where(e, match) }` counters plus a `need`, checked
  live. A star toast when one is met.

### 7.15 Camera director (`Cam`)
- **Play**: focus on the puck (or carrier) plus a lead of 0.25 s of puck velocity. If a lone human's skater is more
  than 220 from the puck, shift 25% toward them. With several local humans, `cam.frame([puck, ...humans],
  { margin: 60, zoom: [.78, 1] })`. `cam.smooth` .15; bounds from `map.bounds(view)`.
- **Zoom**: 1.0 (Settings → Camera distance: Near 1.15, Normal 1.0, Far 0.85); 1.15 at faceoffs; a 1.1 punch on big
  hits (0.3 s); out to 0.85 briefly when the puck flies faster than 400.
- **Fights**: `brawler`, zoom 1.6, framing the fighters. **Celebrations**: 1.3 on the scorer. **Intros**: a dolly
  along the lineup. **Replays**: 7.16. Then back to the player's camera setting (Broadcast `threequarter` or Overhead
  `topdown`, cycled by the `camera` action and saved).

### 7.16 Instant replay (`Replay`)
- **Recorder**: every second step, push `{ puck, skaters and goalies: { x, y, z, vx, vy, facing, rigState }, events }`
  into an 8 s ring buffer. `rigState` is the object passed to `rig.update`, so the replay re-poses rigs exactly.
- **Goal replay**: once the celebration has played for 1.5 s, cut (a puck-shaped wipe) to the last 4 s before the goal
  at 0.5× in the `brawler` view following the puck at zoom 1.25, with letterbox bars, a "REPLAY" bug, and the
  recorded events re-firing their effects. ✕ (or confirm) skips. Setting: Replays Auto or Off. Big-hit and Kaboom
  replays (3 s) also play at the next stoppage when Replays is Auto: when such an event happens, copy its clip (2 s
  before to 1 s after) out of the ring buffer, because the buffer will have moved on by the stoppage.
- **Highlights**: keep the 3 best clips of a story run (goal type and hit power score them) in memory for the end
  credits.

### 7.17 Commentary (`Talk`)
- **Booth**: CHUCK WALLOP (play-by-play) and MOOSE PLUNKETT (color), with live portraits (rigs in suits) in a bottom
  subtitle box. Two lines at most; non-modal, auto-advancing (`talk.say(text, { modal: false, auto: 2.4, portrait,
  name })`).
- **Selection**: each event type has a pool (`TEXT.talk[type]`) with priority and cooldowns: a global 1.2 s, the
  same line 120 s, the same type 6 s. Goals, fights, Kabooms and glass breaks interrupt; filler (Moose's anecdotes)
  only plays after 8 s of quiet play. Variables: `{name} {team} {victim} {goalie} {score} {arena} {period}`.
- **Voices**: every line babbles (10.1) in the speaker's voice. Settings: Commentary On/Off, Subtitles On/Off,
  Voices volume.
- **Tips** (Coach Marge) are separate: a banner just below the score bug with glyph chips, shown the first time its
  trigger fires per save profile (Appendix D).

### 7.18 HUD (`Hud`; it keeps clear of `game.cornerArea()` and inside a 92% title-safe area)
- **Score bug** (top center, about 200 × 30): team logo chips, abbreviations, scores at font scale 2, the period
  (`1ST 2ND 3RD OT SO`), the clock `m:ss`, and under each team its BOOM meter (80 × 4; flames and a countdown while in
  KABOOM).
- **Power play** strip under it: `POWER PLAY MUK 0:14`, with the sin-binned player's tag.
- **Player markers**: a colored ring decal under each human's skater (P1–P4 in `E.PLAYER_COLORS`, the seat colors
  online), a chevron with `P1` above, and an arrow on the screen edge when they are off screen. A turbo bar (16 × 2)
  under the chevron. The shot meter above the shooter while charging (gold when full).
- **Radar** (bottom right, about 108 × 48): the rink outline, skaters as team-colored dots, humans as larger dots with
  rings, the puck white.
- **Prompts** (bottom center, above the subtitles): context chips (`{shoot} ONE-TIMER!`, `HOLD {lob} DROP THE GLOVES`,
  `{pass} SKIP`).
- **Banners**: GOAL!, SAVE!, POST!, BIG HIT!, THROUGH THE GLASS!, KA-BOOM!, FIGHT!, POWER PLAY, HAT TRICK!, PERIOD
  2, FINAL, in the title font with shake and color cycling (honoring reduce motion).
- **Fight HUD**: two portraits with bars at the top corners, and the fight control chips at the bottom.
- **Lower-thirds** at stoppages: one broadcast-style stat card for 3 s.

---

## 8. Art direction

**Base**: the engine's native look (`res: 'ps1'`, `expand: true`, HD Humanoids at size 1.2–1.3, lit scenes, shaded with
`E.tones`, props, particles), aimed at Symphony of the Night and Metal Slug quality, as AI_GUIDE asks. Act on every
look note from `tools/check.mjs`.

- **Skaters**: build `heroic` at size 1.2 (enforcers `bulky` at 1.3). Long-sleeved jersey (`outfit: 'shirt'`,
  `sleeves: 'long'`, `colors.cloth` the jersey, `trim` the stripe), breezers in `pants`, socks in the team color, skates,
  big gloves (`glove`), a hockey helmet, number and letter, `weapon: 'stick'`, and shoulder pads (`armor: true`, plate
  in the jersey color). Hair shows under the helmet (some flow, mullets on the Lumberjacks). Beards come from a darker
  skin tone on the jaw: add a `beard` color option if needed and log it.
- **Goalies**: `bulky` at 1.3 (The Vault 1.75), pads, blocker, catcher, mask, `gstick`, and pad and mask colors per
  team.
- **Referees**: `heroic` at 1.15, white shirt with black stripes, orange armbands (`trim`), a black helmet, a whistle
  (one dot).
- **Crowd**: as in the SPORTS kit: two small fans per stand tile (4 × 5 shirt, 3 × 3 head), colored 70% home and 30%
  away, swaying. Excitement drives them: claps, standing, jumping on goals, hands on heads after a big hit, a wave
  around the arena when quiet for 20 s. Fans hold signs (tiny-font text: `BARN BURNER`, `KABOOM!`, `MARGE 4 PM`,
  `SAVE THE ICEBOX`, `PIPESY ♥`). Behind each net, 4–6 bigger **glass pounders** (Humanoid at size 0.9 in the classic
  style) bang the glass when play comes near. On the near side, a row of dark head-and-shoulder silhouettes is drawn
  in screen space along the bottom edge when the camera is low (the broadcast foreground).
- **Team logos**: a 24 × 24 string sprite each (`E.sprite` rows plus a palette of 4–6 colors), used at center ice (×3),
  in the score bug (scaled down to 12 or 16), on menu cards (×3) and on bench banners. Section 11.1 describes them.
- **Effects**: ice spray on stops and turns (white `dust` and `bits`); a skate shower when someone is hit; glass shards;
  a puck streak; a slapshot shockwave ring; KABOOM fire, explosions and sparks; steam from melt; snow (weather) at the
  pond; confetti; hats; an octopus splat; a flying tooth on a big fight punch (a white bit, "chiclets"); dizzy stars
  circling a knocked-down head; sweat drops in fights; turbo speed lines.
- **Lighting**: canvas lights in every arena (11.2 lists them). Goal lights pulse red behind the net. KABOOM tints the
  arena. Spotlights sweep during intros and the title.
- **UI style**: dark blue-black panels (`E.ui.box` gradients) with ice-white text and a gold accent (`#ffd36a`),
  with team colors on cards. Theme the engine's HTML screens with `new E.Shell(game, { theme })` in the same colors and
  a large font: body text at least 24 CSS px at 1080p (check a screenshot).

---

## 9. Animation (the engine's procedural rigs plus new hockey motion)

Hockey motion is added by **wrapping `rig.solvePose`** on each skater and goalie rig (`Rigs`). It overrides feet,
knees, hips, torso lean, hands and stick joints (`E.ik3` for knees and elbows) from a small state the Skater passes
in (`skate: { phase, push, lean, stop, back, cross }`, `stick: { blade: [f, s, z], top, follow }`). Fights, cheers and
falls use the engine's own `attack` moves, `pose`, `down` and `flip`. Every animation below must play in all three views.

| Motion | How |
|---|---|
| Skating stride | Phase advances by `speed / 22`. Each foot pushes back and out diagonally (3 o'clock or 9 o'clock), then recovers under the hip. Knees bend 35°, hips drop 2.5, the torso leans .35 rad (.5 with turbo). The free arm swings when not stick-handling |
| Glide | Feet parallel, knees soft, a slight sway |
| Crossovers | Turning hard at speed: the outside foot crosses over in front, alternating |
| Hockey stop | The torso turns 70° off the velocity, both blades skid sideways with a deep knee bend, a spray at the feet |
| Backward C-cuts | The hips swing, the feet trace C shapes (AI defenders only) |
| Stick-handling | The blade weaves ±3 in front; the hands follow (the top hand at the hip, the bottom hand 40% down the shaft) |
| Pass / saucer | The blade sweeps back to front toward the target; a saucer flicks up at the end |
| Wrist shot | Weight shift, a fast sweep, a high follow-through |
| Slapshot | Wind-up (the stick rises behind the shoulder and holds while charging), downswing to the ice, follow-through pointing at the target |
| One-timer | A short wind-up already held, then the strike on contact |
| Deke | Spin-o-rama (a 360° body spin with `flip`-like twist), toe drag (the blade pulls the puck back across) |
| Check | The shoulder leads (lean into it), the stick across the chest |
| Hit reaction / fall | A stagger (bump); `down` + `flip` tumble + a belly slide (big hit); squashed against the glass (`rig.kick(-.4)`) when hit into it; `getup` from a kneel |
| Poke | The stick shoots forward along the ice in a lunge |
| Slip | Feet fly up, landing on the back, a spin-slide (octopus, rat) |
| Goalie | A ready crouch (pads together, glove up), shuffle and T-push, butterfly (knees down, pads flared), glove and blocker saves, pad stack, poke, covering the puck, celebrating, blasted (flailing backward into the net) |
| Faceoff | Centers crouch with sticks down; the referee raises an arm and drops the puck; the swipe |
| Celebrations | Fist pump, sniper aim (the stick held like a rifle), knee slide, stick guitar, bouncing off the glass, a team huddle |
| Fights | Gloves off (sprites fall), circling in `stance: 'guard'`, one hand gripping the rival's jersey (the hand held at the rival's shoulder), `jab`, `haymaker` and `hook` from `E.MOVES`, a duck, jersey over the head (`hood`), the knockdown, the winner's `cheer` |
| Bench and coach | Spares sit (a sit pose via solvePose: hips at bench height, knees forward); Coach Marge gestures (`wave`, `hips`) |
| Story set pieces | The handshake line (two lines sliding past, hands out), the Cup lift (`cheer` with the Cup sprite held at the hands), the Flood Wagon driver seated and steering, Polar Pete's dance (a bulky white rig, a big round head from an extra ball drawn over it, ears), the organist playing (hands bobbing on the beat via `audio.onBeat`) |

**Animation lab** (`#lab`, also in the Dev panel): one skater, one goalie and one referee on a small rink, a list of
every motion above, a slider for speed and phase, and a `brawler` / `threequarter` / `topdown` toggle. Film each
motion with `tools/filmstrip.mjs` (`--seed 1`) and check: the wind-up, the strike, the settle, no snaps or backward
sweeps.

---

## 10. Audio (all synthesized in code; no audio files)

### 10.1 Voices: babble (Animalese/Simlish style)
- `Synth.babble(text, voice, { onLetter })` turns a line into syllables. Each letter that sounds (vowels, and
  consonants as onsets) is a 55–85 ms blip: a `pulse` or `saw` source through two bandpass filters at the vowel's
  formants (a: 800/1200 Hz, e: 500/1900, i: 300/2300, o: 500/900, u: 350/700; consonants borrow the next vowel and add
  a 10 ms noise click for `s t k p` sounds). Pitch is the voice's base × (a letter-hash offset of ±3 semitones). `!`
  raises the last 4 syllables by 4 semitones; `?` glides the last syllable up; `,` and `.` add 120 / 220 ms pauses.
  It runs on the engine's new `voice` bus.
- A voice is `{ base: Hz, range: semitones, speed: syllables/s, wave, formantShift, gruff (noise mix) }`. Marge: low,
  gruff, slow. Dunny: mid and bright. Snipes: high and fast. Lou: very low, soft and slow. Lemmy: mid and wobbly
  (vibrato). Glitterman: nasal (formants × 1.15), fast. Chuck: mid-high, very fast. Moose: low and gruff. The referee
  barks single syllables. The crowd's chant mixes 6 voices.
- It hooks into `E.Dialog` through the voice hook (section 4) for cutscenes and the booth, and into chirp bubbles,
  intros ("Number NINE… DUNNY… MACPHAIL!"), the referee's calls and crowd chants. Its randomness comes from `RNG.fx`
  so it never changes the simulation.

### 10.2 Sound effects (`audio.define` voices; custom graphs where noted)
Skate stride swish (filtered noise, pitch by speed, one per push); hockey stop "shhhk" (noise, a bandpass sweep down);
puck on stick "tock"; pass "thwap"; wrist shot "snap"; slapshot crack plus whoosh; one-timer (a louder crack); **post
"PING"** (triangle 1850 Hz, 0.9 s decay, a slight detune: the most recognizable sound in hockey); crossbar ping (2100
Hz); puck on boards (a low thud and a rattle); puck on glass (a sharp clack and a ring); net swish; body check thump
plus a babble "oof"; big hit (a deeper thump, a glass rattle, crowd "OHHH"); glass crack (a sharp tick) and glass
shatter (a noise burst and a descending sine tinkle cluster of 12 voices); the referee's whistle (a two-tone pea
whistle with vibrato); **the goal horn** (a custom graph: 3 detuned `brass` oscillators at 98, 147 and 196 Hz through
the lowpass `lp: 900`, 0.25 s attack, 2.6 s hold, then release, plus noise "air"); the period buzzer (square at 220 Hz,
1.5 s); punches (a thud and a whoosh); dizzy stars twinkle; power-up pickup (an arpeggio); item throw (a whoosh);
octopus "splort"; KABOOM explosion (engine `explode` + a sub-bass drop); the Flood Wagon engine (a looped low saw
putter, pitch by speed), its horn "A-OOGA"; menu move, select and back (soft organ blips).

### 10.3 Crowd and organ
- **Crowd bed**: two looped noise sources (bandpass 400 Hz and 1.2 kHz, an LFO swell) whose gain follows
  `Crowd.excitement` (0..1: raised by shots, near misses, hits, goals; decays). Plus reactions: "OHHH" (a swell
  sweeping down), "AHHH" (a near miss), cheer (a burst with high-voiced babble), boo (low, filtered babble), the
  "KA-BOOM!" chant (6-voice babble on the beat, with claps), and claps in rhythm.
- **The organ** (`organ` wave, a Leslie-like vibrato of 6 Hz at .004): original stings only. A rising charge fanfare
  (G4 C5 E5 G5 – E5 G5), a chromatic walk-up vamp for faceoffs, a clap-along vamp ("da-da-da da-da"), a sad trombone
  slide for an opponent's penalty, a fight vamp (minor and tense), and a goal sting per team. In the Ol' Icebox, Doris
  the organist plays them visibly. **Never copy existing chants or songs** (no "Charge!" bugle call, no stadium rock
  standards).

### 10.4 Music (engine song format; the new `organ` and `brass` waves; named layers)
| Song | Use | Character |
|---|---|---|
| `theme` | title, attract | arena chip-rock anthem: saw power chords, a driving square lead, drums; the "Ice Hoc-Kaboom" hook |
| `menu` | menus, setup | a relaxed loop from the theme's chords |
| `locker` | cutscenes (locker room) | gritty bass and a snare shuffle, organ pads |
| `pond` | pond cutscenes, the pond arena's stoppages | a folksy pulse-wave fiddle tune in 6/8 |
| `grind` | Grindhouse | a punk loop |
| `mall` | MegaMall | cheesy synth-pop |
| `final` | Dome cutscenes, the final | epic, brass |
| `play` | under play (quiet) | a low pulse plus layers `drive` (in the third period and OT), `kaboom` (KABOOM mode), `fight` (fights) |
| `flood` | the Flood Wagon minigame | an original skaters' waltz (3/4, organ) |
| `victory`, `defeat` | results | a fanfare, a sad trombone |
| `credits` | the end credits | the theme as a ballad, then full band |
| goal stings ×6 | one per team | 2 bars over the horn |

**Mix**: buses `music` (setting), `sfx` (setting), `voice` (setting: Voices) and the crowd (on sfx, plus its own
setting: Crowd). Duck the music under the commentary voice (−4 dB) and in the pause menu (the engine does this).

---

## 11. Content

### 11.1 Teams (3 skaters + 1 goalie each; ratings 1–5: Spd / Sht / Pas / Hit / Fgt / Hnd; goalies Rfx / Size / Reb)
| Team | Abbr | Home dark / away white trim | Logo (24×24) | Players |
|---|---|---|---|---|
| **Mukluk Falls Muskrats** | MUK | brown `#5a3a22`, gold `#e8b43a`, cream `#f3e6c8` | a buck-toothed muskrat face in a gold ring | #9 Duncan "Dunny" MacPhail, C, playmaker 4/3/5/3/2/4, shoots L · #19 Priya "Snipes" Sandhu, sniper 5/5/3/2/2/5, R · #44 Lou "Big Lou" Beaudoin, enforcer D (bulky) 2/4/2/5/5/2, R · G #31 Lemmy "The Sieve" Kowalchuk 3/4/3 (trait: **Talks to Posts**: 20% of goals within 4 of a post ring off it instead) |
| **Dryfork Drillers** | DRY | black `#1d1d22`, orange `#f07a1a` | an oil derrick with a drop | #7 "Rig" McCoy, C 3/3/4/3/3/3 · #15 "Gusher" Gomez 4/4/3/2/2/4 · #2 "Drill Bit" Dobbs, D 3/2/2/4/3/2 · G #35 Derrick Okafor 2/3/2 |
| **Logjam Lumberjacks** | LOG | red plaid `#b3262a` + black, cream | a bearded log face | #10 Axel Sundqvist, C 3/4/3/3/3/3 · #27 "Sawdust" Sally Lindgren 4/4/3/3/2/4 · #88 "Big Timber" Thibodeau, enforcer (bulky) 2/3/2/5/4/2 · G #1 "Stumpy" O'Rourke 3/4/3 |
| **Grindhouse Bruise Brothers** | GRD | purple `#4b2a6b`, lime `#9be04a` | a fist inside a gear | #66 Rocco Bruiser (bulky) 3/3/2/5/5/2 · #67 Rollo Bruiser (bulky) 3/3/2/5/5/2 · #12 "Mumbles" Malone 4/4/3/2/3/4 · G #29 "Tank" Tankersley 3/5/2 |
| **Megaplex Marauders** | MEG | teal `#18b5b0`, magenta `#e0389a` | a shopping cart flying a pirate flag | #23 Chad Glitterman, C 4/3/4/2/1/4 · #8 "Zoom" Zhang 5/3/3/2/2/4 · #5 "Promo" Perkins, D 3/3/3/4/3/3 · G #40 "Kiosk" Kingsley 4/3/4 |
| **Gilded Grizzlies** | GLD | gold `#d9a520`, black `#141414`, white | a grizzly head in a crown | #1 Sterling Glitterman Jr. 5/5/4/3/2/5 (**Golden Twister**) · #91 "Silk" Sullivan 4/3/5/2/2/5 · #55 "Brick" Brickowski (bulky) 3/4/2/5/5/2 · G #00 **The Vault** 5/5/5 (boss: size 1.75) |

- **Rating multipliers**: speed `0.85 + 0.05 Spd`; shot speed `0.85 + 0.05 Sht`, shot error `1.3 − 0.1 Sht`; pass
  speed `0.9 + 0.033 Pas`; check `0.8 + 0.067 Hit`; fight damage `0.8 + 0.067 Fgt`; pickup radius `0.85 + 0.05 Hnd`.
  Goalie reaction `−0.015 (Rfx − 3)`, save shapes × `0.9 + 0.033 Size`, freeze chance `+0.06 (Reb − 3)`.
- **Golden Twister** (Sterling): in the offensive zone, 1 in 3 carries end in a 0.6 s spin with a golden glow
  (telegraphed), then a curving shot (spin 1.2, like the SPORTS kit's curl) that cuts the CPU goalie's save chance by
  25%. Checking him during the spin is a guaranteed big hit and BOOM +10.
- **The Vault**: size 1.75; the first two KABOOM shots only stagger him ("VAULT LOCKED"). After the second, "THE
  VAULT IS CRACKED!": size 1.4 and Rfx −1 for the rest of the game. Weak to cross-crease one-timers (lateral speed ×
  0.8) and dekes (he bites 1.5×).
- **Coach and staff portraits**: Coach Marge Pelletier (grey bun, cardigan, whistle), Old Gus (90, cap, the Flood
  Wagon driver), Doris (organist, beehive hair), Goldie Glitterman (gold fur coat, sunglasses), Polar Pete (mascot),
  and Chuck and Moose (suits; Moose is missing teeth).

### 11.2 Arenas
| Arena | Chapter | Look | Lights | Items | Hazard | Music |
|---|---|---|---|---|---|---|
| **The Ol' Icebox** (Mukluk Falls) | 1, title, practice | wooden barrel-vault beams, string lights, 1962 championship banners, wooden stands, fans in toques, Doris's organ booth, a hand-painted scoreboard, ads (`MUKLUK MUFFLER & TIRE`, `KOWALCHUK'S PEROGIES`, `BAIT 'N' BAGELS`) | ambient .65 warm, 6 hanging lamps over the ice (light radius 260) | Hot Sauce, Tape, Poutine, BOOM Box | – | organ, `play` |
| **Lake Kabonk** (pond) | 2 | a frozen lake at dusk, snowbank boards, pines, two cabins with lit windows, a bonfire with fans in parkas, string lights on poles, snowmen (store) | ambient .45 blue dusk, bonfire flicker, cabin windows, string lights; weather snow .5 | Hot Cocoa, Tape, Lumber, BOOM Box | thin ice ×3, snowbanks | `pond` |
| **The Grindhouse** | 3 | a steel-truss mill arena, chain-link above the end boards, steam pipes, rowdy stands, a cage-match vibe, ads (`RUSTBELT SCRAP`, `IRON GUT CHILI`) | ambient .5 cool green, flickering fluorescents (`RNG.fx`), steam vents | Poutine, Lumber, BOOM Box | octopus throws after goals, rubber rats | `grind` |
| **MegaMall Ice Palace** | 4 | a rink in a mall atrium: storefront neon, escalators, a fountain, a food court, ads on every inch (`GLITTERMAN MEGAPLEX — COMING SOON!`) | ambient .7, neon emissives in magenta and teal, fountain glow | Discount Drop crates (any item) | Polar Pete, Discount Drop | `mall` |
| **The Kaboom Dome** | 5 | a huge arena: gold-trimmed boards, flame cannons in the corners, laser lights, fireworks, a sold-out crowd, a jumbotron frame on replays | ambient .55, strong white ceiling lights, moving spotlights in intros, flame light on goals and Kabooms | Hot Sauce, Brick Pads, BOOM Box | octopus (rare), Gilded Mode | `final` |

Every arena uses the same rink geometry. Walls, stands and props come from the TileMap (`types` for tiers with `face`
materials), `r.shape` / `E.SHAPES` (new entries: `locker`, `bench-box`, `organ`, `net`, `glass-crew-cart`,
`flood-wagon`, `flame-cannon`, `cabin`, `fountain`, `escalator`, `storefront`, `scoreboard`, `kaboom-cup`) and
`r.prop` (lamps, banners, signs, torches as bonfire, trees).

### 11.3 Story: THE CUP RUN

**Premise**: Mukluk Falls (pop. 812) has one thing: the Ol' Icebox, a 1950s barn where the town learned to skate.
Developer Goldie Glitterman bought the land and plans a "Megaplex Parking Experience". Coach Marge digs up **Town
Bylaw 1897-B**: *any rink that houses the Kaboom Cup shall stand forever.* So the Muskrats, a ragtag team of three
skaters, a superstitious goalie and a 72-year-old coach, have to win the regional Kaboom Cup: five games, five
barns, five rivals. **Tone**: a small-town sports-movie comedy told like a hockey broadcast, with hockey clichés
played with a straight face, chirps that rhyme, and big heart. PG: no blood, no slurs, no swearing (a beep and
babble stand in for "a curse word").

**Chapter flow**: storymap (a snowy highway map; the team bus drives between 5 town stops, each showing its stars and
lock) → pre-game cutscene (with one choice) → [chapter 1: optional warm-up drills 1–3] → player intros → the game (its
objectives listed on the pause screen and a pre-game card) → intermission Flood Wagon (offered) → post-game cutscene →
results and three stars → stars and unlocks → back to the map. **A loss**: a short Marge pep talk (a different one for
each chapter, in TEXT) and Retry or Back to Map. Progress autosaves (`game.saves`) after each chapter and choice.

**Choices** (one per chapter; they set the game's team tactic, 7.13): chapter 1 "Clean and fast" (Finesse) / "Mean and
loud" (Grit); chapter 2 the same two; chapter 3 "Let Lou loose" (Lou Fgt +1, fights likelier) / "Keep it on the ice" (Lou
Pas +1); chapter 4 "Ignore the bear" / "Hunt the bear" (the AI targets Polar Pete); chapter 5 "Doris plays early"
(the organ boost at the start of the 2nd period) / "Doris plays late" (at 5:00 left in the 3rd, +50% stronger).

| # | Chapter | Arena / rival / rules | New mechanic spotlighted | Objectives (★ each) |
|---|---|---|---|---|
| 1 | **Home Opener** | Ol' Icebox vs Dryfork Drillers, 3 × 1:30; the rivals play one difficulty step below the setting (never below Rookie) | skating, passing, shooting, one-timers, checking, BOOM meter, Flood Wagon | Win · Score a one-timer · Land 3 big hits |
| 2 | **Pond Rules** | Lake Kabonk vs Logjam Lumberjacks, 3 × 1:30 | KABOOM mode (Marge explains it), power-ups, thin ice, snowbanks | Win · Break the ice under a Lumberjack · Trigger KABOOM |
| 3 | **Gloves Off** | Grindhouse vs Bruise Brothers, 3 × 1:30, they challenge often | fights, the sin bin, power plays, hazards (octopi, rats), chirps | Win · Win 2 fights · Score a power-play goal |
| 4 | **Mall Brawl** | MegaMall vs Megaplex Marauders, 3 × 1:30 with no OT, then a **Shootout Showcase** every time (it decides a tie; otherwise it is a bonus round for mall money and a toast) | the mascot, Discount Drop, the shootout and manual goalie | Win · Score a KABOOM goal · Knock down Polar Pete |
| 5 | **The Kaboom Cup** | Kaboom Dome vs Gilded Grizzlies, 3 × 2:00, OT and shootout if tied | the boss: Sterling's Golden Twister, The Vault, Gilded Mode, Glitterman's Gilded Boost (Grizzlies +10% speed from the 3rd period), Doris's organ counter (Muskrats BOOM +30 and +10% speed for 20 s) | Win · Beat The Vault with a deke goal · One player scores a hat trick |

**Script beats** (TEXT holds the full lines; these set the voice. Speakers in caps, choices in brackets):

*Chapter 1 pre-game (locker room)*
- MARGE: "Sit down, shut up, and listen. I got a letter."
- MARGE: "Goldie Glitterman bought the land under the Icebox. Wants to pave it for a {c=#ffd36a}Megaplex Parking
  Experience{/c}."
- DUNNY: "A parking… experience? Beauty. Wait. No. Not beauty."
- SNIPES: "This barn's got more character than his whole bank account. And his haircut."
- MARGE: "Bylaw 1897-B. Any rink that houses the Kaboom Cup stands forever. So we win the Cup."
- LOU (knitting): "Five games, then. Like the five petals of the wild rose."
- LEMMY: "Pipesy says we win. Clang's not so sure. Clang's a pessimist."
- GLITTERMAN (in the doorway): "Enjoy the barn, folks. I've ordered the parking meters. Gold ones."
- MARGE: "Captain. Tell 'em how we play tonight." [CLEAN AND FAST / MEAN AND LOUD]
- DUNNY: "We get pucks deep, we get bodies to the net, and we— uh— {$tacticLine}"
- MARGE: "Warm-up's on. Then we drill the Drillers."

*Chapter 1 post-game*: CHUCK: "The Muskrats take the opener! The Icebox is ROCKIN'!" · GLITTERMAN: "Beginner's luck.
The meters are still on order." · MARGE: "Pack your long johns. Lake Kabonk. Pond rules."

*Chapter 2 pre-game (the lake at dusk, by the bonfire)*: BIG TIMBER: "Welcome to the woods, Muskrats. We don't check.
We FELL." · SNIPES: "Cute beard. Did you grow it, or did a beaver move in?" · LEMMY: "The ice is talking. It says
'crack'." · MARGE: "Thin ice is a tool. Hit 'em where it's thin." · MARGE: "And listen. When the whole team's hummin'
— hits, passes, the crowd losin' its mind — the ice starts to shake. That's a KABOOM. Fill the meter and let it
rip." · LOU: "Like thunder in a teacup." · [tactic choice]
*Post*: BIG TIMBER: "You hit like a falling spruce. Good on ya." · DUNNY: "Thanks! You smell like one!" · MARGE: "Next
stop, the Grindhouse. Bring a mouthguard. Bring two."

*Chapter 3 pre-game (the Grindhouse's dim locker room)*: ROCCO: "Well, well. Lou Beaudoin." · ROLLO: "Lou 'The
Library' Beaudoin." · ROCCO: "Heard you knit now." · ROLLO: "Heard you purl." · LOU: "I have retired from fisticuffs,
gentlemen." · MARGE: "Retire after the game." · MARGE: "In this barn they drop the gloves, you drop 'em back. Win the
scrap, win the barn. Lose it, you sit in the sin bin and think about your choices." · [LET LOU LOOSE / KEEP IT ON THE
ICE]
*Post*: ROLLO: "He knitted me a scarf." · ROCCO: "For my neck." · ROLLO: "Which he bruised." · LOU: "There is an ice pack
in the pocket." · MARGE: "Next, the Megaplex. Glitterman's turf. Watch your wallets."

*Chapter 4 pre-game (rink-side under the neon)*: CHAD (filming himself): "What's up, Mall Rats! Smash that glass,
bro!" · DUNNY: "We're Muskrats." · CHAD: "Same content, bro." · GLITTERMAN (to Lemmy): "Name your price, goalie." ·
LEMMY: "…Pipesy says no. Clang says no with a curse word." · POLAR PETE: (a dance and a muffled babble) · MARGE:
"That bear's on the ice all game. Treat him like furniture." [IGNORE THE BEAR / HUNT THE BEAR] · MARGE: "And win or
tie, the mall's got a Shootout Showcase after. Mall money. We want it."
*Post*: GLITTERMAN: "Fine. The Final. My Grizzlies. My Dome. My rules." · SNIPES: "Your Dome's gonna need a new roof."

*Chapter 5 pre-game (the Dome's tunnel, then the spotlight intro)*: STERLING: "I've never lost. Not once. Not even
at Go Fish." · SNIPES: "There's a first time for everything, Goldilocks." · THE VAULT: "…" · LEMMY: "He's very big,
Pipesy." · MARGE: "Forty-six years behind that bench. I've seen better teams. Prettier teams. Teams that could spell."
· MARGE: "Never saw one that wanted it more. Go make it go KABOOM." · [DORIS EARLY / DORIS LATE]
*In-game*: when the Grizzlies' Gilded Boost starts, GLITTERMAN on the jumbotron: "Synergy, boys!" When Doris
plays, MARGE: "DORIS! PLAY THE SONG!" (the organ's charge fanfare, the crowd claps, the boost).
*Post (win), the ending*: the handshake line (both teams) → Dunny lifts the Kaboom Cup, which goes off in a confetti
explosion. CHUCK: "THE KABOOM CUP IS… KA-BOOMING!" → GLITTERMAN: "My parking meters…" → MARGE: "Bylaw 1897-B, Goldie.
Look it up." → GUS: "Yep." → the Flood Wagon drives a lap with the team on top → **credits** over the run's highlight
replays (7.16), then Coach Marge: "Same time next year." → the title, with the **Cup on display** in the Icebox from
then on.

**Unlocks** (15 stars in all; exhibition cheats): 3★ Big Heads (`headR` × 1.8) · 6★ Octopus Rain · 9★ Glow Puck · 12★
Always KABOOM (for humans) · 15★ Retro Rigs (`style: 'classic'`). Finishing the story makes the Gilded Grizzlies and
The Vault playable in exhibition and adds the Cup to the title screen.

### 11.4 Practice: Coach Marge's Drills (at the Ol' Icebox, house lights half on)
| # | Drill | Pass condition | Teaches |
|---|---|---|---|
| 1 | Wheels | skate through 6 gates in order in 25 s (one gate wants a hockey stop) | skating, turbo, stops |
| 2 | Tape to Tape | 5 completed passes to moving teammates + 1 saucer over a sled | passes, saucers, aim |
| 3 | Top Shelf | hit 4 corner targets on an empty net (wrist and slap) | shots, aim, lift |
| 4 | One-Timers | 3 one-timer goals on Lemmy from Dunny's cross-crease feeds | one-timers |
| 5 | Finish Your Check | big-hit 3 training dummies into the glass and break a panel | checks, turbo hits, glass |
| 6 | Gloves Off | win a spar with Big Lou (he goes easy) | the fight controls |
| 7 | KABOOM! | with a full meter, score with a KABOOM shot and survive Lou's KABOOM check | KABOOM mode |

Each drill opens with a Marge line (voiced) and a prompt panel with glyph chips, tracks its counter in the HUD, and
saves its completion. Completing all 7 earns the "Marge Approved" badge (Records). Chapter 1 offers drills 1–3 as
its warm-up.

### 11.5 Text pools (in `07-data-text.js`; sizes are the minimums)
Commentary: 18 event types × 4–8 lines (≈ 110 lines) plus 20 Moose filler anecdotes; chirps: 30; tips: 14;
three-stars lines: 12; loss pep talks: 5; menu blurbs: 1 per item; About pages (12.1). Appendix D has samples for each.

---

## 12. Screens and flows (10-foot UI)

**Rules for every screen**: at most 6 choices visible; big tiles and cards; one line of help; a legend at the bottom
with glyph chips (`{pass} SELECT  {deke} BACK`, as keycaps or mouse icons for keyboard and mouse). D-pad, stick,
arrows and WASD move focus; ✕ / Enter / Space pick; ○ / Esc / Backspace go back. **The mouse hovering a tile focuses
it and a click picks it.** Focus has an animated gold border, a slight scale-up and an organ blip. No dense tables
anywhere: stats are a few big numbers.

1. **Title**: the Ol' Icebox at night, spotlights sweeping the ice, two teams skating lazily (AI). The logo slams in
   with an explosion and the horn, then `PRESS ANY BUTTON` (`TAP` is never shown; see 15.2). Then the main menu: 6 tiles
   in 2 rows: **CUP RUN** (Continue/New when a save exists), **EXHIBITION**, **PRACTICE**, **RECORDS**, **SETTINGS**
   (the engine's settings screen: `game.menu('settings')`), **ABOUT**. The version label (`E.versionLabel()` + the
   game's version) sits small in a corner, and the engine corner buttons stay at the top right.
2. **Exhibition → Sides**: every joined player is a token in the middle column (CPU); push left or right to join HOME
   or AWAY; ✕ to ready. "Press START on a free controller, or 2 on the keyboard, to join" (`game.allowJoin({ max: 4
   })`). The keyboard halves show their keys. Mouse: click HOME or AWAY to move the keyboard player's token.
3. **Exhibition → Setup**: 3 big cards side by side: HOME team, ARENA, AWAY team (left/right on a focused card cycles
   it; each team card shows its logo ×3, name, and 4 pip bars: Speed, Shooting, Hitting, Goalie). Below, one row of
   option chips: Periods (1/2/3), Period length (1:00 / 1:30 / 2:00 / 3:00 / 4:00), Difficulty, Cheats (unlocked
   ones). **FACE OFF!** starts.
4. **Story map**: the bus on a snowy highway with 5 stops (each a town sign with its logo and earned stars). The stop
   in focus shows the chapter title and objectives. Click a stop to pick it.
5. **Cutscene**: the set (the locker room or rink-side), characters staged, `E.Dialog` boxes with live portraits,
   babble and typed text; choices are 2 big options. ✕ advances; holding ○ for 1 s skips the scene (with a fill ring).
6. **Pre-game card**: matchup logos, the arena, the objectives with ★ slots, the tactic chosen. ✕ FACE OFF.
7. **Match** (HUD 7.18). **Pause** (engine): Resume, Objectives & Info (the story objectives, or the exhibition's
   setup), Restart Game, **Dev Mode**, Settings, Controls, Full screen, Quit to title.
8. **Intermission**: the period summary card (goals, shots, hits: big numbers), then `{pass} DRIVE THE FLOOD WAGON`
   or `{deke} SKIP`.
9. **Results**: the final score huge, the **three stars** revealed one by one (portrait cards, a stat line, a
   commentary line), the objectives ticking ★, then CONTINUE / REMATCH / MAIN MENU.
10. **Records**: big numbers with a label each: Hardest Shot (km/h = u/s ÷ 16 × 3.6), Biggest Hit, Most Goals in a
    Game, Fights Won, KABOOMs, Story Stars x/15, Drills x/7. Two pages at most.
11. **About**: section 12.1's pages, paged with L1/R1, left/right or a click on the arrows.
12. **Credits**: the end roll over highlight replays.

### 12.1 About / Credits screen
Pages (at most 8 lines each, in the large font): **Credits** (game design and code: Claude Opus 5.5, `claude-opus-5-5`,
for Michael Crosato's cc-matrix; engine: my-3D2dge v0.85.2, MIT; AI Hub session client 1.4.0; every sound, voice and
song synthesized in code; asset-store props from CC0 sets, listed by name) · **Source Information** (every field TASK.md
lists) · **Testing Feedback** · **Engine Feedback** · **Prompt Feedback** · **Engine changes** (the summary of
ENGINE-CHANGES.md). The builder fills the feedback pages at the end with the same text as the chat reply and
`exit-interview.json`, writing "unknown" for anything that can't be confirmed.

---

## 13. Settings (via `menu.settings`; the engine's Display, Sound, Comfort and Controls stay)
Button symbols (PlayStation / Xbox) · Difficulty (Rookie / Pro / All-Star / Legend) · Period length (exhibition default)
· Camera (Broadcast / Overhead) · Camera distance (Near / Normal / Far) · Commentary (On / Off) · Subtitles (On / Off) ·
Voices volume · Crowd volume · Player intros (On / Off) · Replays (Auto / Off) · Flood Wagon (Ask / Always / Never) ·
Puck trail (Off / Streak / Glow) · Tips (On / Off) · Reset tips. Every one is read live.

---

## 14. Online: AI Hub sessions (`Net`, shared-world)

### 14.1 Page tags (in `<head>`, after the session client)
```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="5">
<meta name="hub:session-goal" content="Outscore the other team in one 3-minute period">
<meta name="hub:session-howto" content="Stick/WASD skate · ✕/J pass · □/K shoot · ○/L deke · R2/Shift turbo">
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1-4">
```

### 14.2 Flow (when `AIHub.active`)
1. There is no title, attract or menu. Boot first calls
   `info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true })`. If `info` is null, carry on
   exactly as outside a session. Otherwise it picks the teams and the arena (step 2), builds the arena, and calls
   `AIHub.ready()` (step 4).
2. **Teams**: even seats (0, 2) are HOME and odd seats (1, 3) AWAY; with one player, that player is HOME vs the CPU.
   The two teams and the arena are picked by `AIHub.rng('setup')`, the same on every copy; the host's first snapshot
   confirms them. The CPU fills the rest. In a 2v1, the lone human's CPU teammates get AI skill +.15.
3. **Our own card** (scene `session`, until `start`): the arena at night with spotlights; each player's skater lined
   up on their team's blue line with a nameplate in their seat color (names sanitized for the pixel font, drawn on
   the canvas, never put into HTML); "HOW TO WIN: Outscore the other team in one 3-minute period"; THIS PLAYER'S
   CONTROLS as glyph chips for their device; a ✓ on each ready player; the countdown from the `card` event. Enter or
   ✕ (button 0), or a click or tap on READY, calls `AIHub.answer('ready')`. △ (button 3), T, or a click on MORE TIME
   calls `AIHub.answer('more')` (pressing again takes it back). The card changes nothing in the round.
4. Call `AIHub.ready()` once the arena is built, with no key press.
5. On `start`, show a big 3–2–1 while `AIHub.time() < 0`, then a faceoff at time 0. The match config is 1 period of
   3:00, then sudden-death OT capped at 1:00, then a tie. Replays are 3 s, there are no intros and no Flood Wagon;
   fights and items are on.
6. **The host** (`info.isHost`) runs `Match.step` with all CPU AI and the remote players' intents. It calls
   `AIHub.finish({ standings, scores, stats, awards })` exactly once: at the final horn, on `time-up` (at once, with
   the current score), or when a round that began with 2+ players is down to one human (`leave`; the leavers are left
   out of the standings). Standings list the winning team's remaining players in one array and the losers in the
   next; a tie puts everyone in one array. With 1 player,
   `standings: [[id]]` and `won: true | false`. `scores` maps each id to their own points (goals + assists); `stats`
   maps each id to `{ Goals, Assists, Hits, Fights }`; `awards` are the three stars that are humans
   (`{ id, title: '1st Star', detail }`).
7. **Leaving**: a human who leaves becomes a CPU skater. The hub voids the round when the host leaves.
8. On `end`: stop input and sound (`audio.music(null)`, mute), freeze on the final score, and send nothing more.
9. **No pausing in a session**: the gameplay scene is not `pausable` and `autoPause` is off. Options (or Esc) opens a
   small non-pausing overlay (Sound, Music, Voices, Button symbols, Camera, Back), during which the local skater
   coasts. There is no Quit, Restart or Dev Mode. Create + Options belongs to the hub (engine patch 2). Use no
   `alert`, `confirm`, `prompt` or `window.open`, and no network but the hub.
10. **Server copies** (`info.server`: the host with no player): they run the same host code with no local input or
    camera and draw only a small "HOSTING" line.

### 14.3 Netcode (it stays within 20 messages a second per copy and 16 KB per message)
- **Clients → host**, 15 Hz, unreliable, `{ t: 'in', s: seq, at: AIHub.time() rounded, mx, my (×100 rounded),
  h: bits (shoot, lob, turbo), c: [pass, shoot, deke, lob, chirp, switch] press counters (mod 256), ax, ay (aim, or
  omitted) }`. The host turns counter differences into presses, so a lost packet loses no taps, and treats the
  latest packet as held state. The host acknowledges with `ack` per player.
- **Host → all**, 15 Hz, unreliable, under 1,200 bytes: `{ t: 's', n: tick, at, ph: phase code, p: period,
  k: clock ×10, sc: [h, a], b: [boomH, boomA, kaboomFlags], pk: [x, y, z, vx, vy, vz, owner], e: [[id, x, y, vx, vy,
  facing (0–255), state code, stateT ×10, flags], × 8 (6 skaters + 2 goalies)], ack: { playerId: seq }, it: items,
  f: fight state (when fighting), ev: [recent events with ids, each repeated in 4 snapshots] }`. Integers only.
- **Reliable host messages** (rare): `setup` (teams, arena, seat → skater map), `phase` changes (goal, period end,
  final, fight start and end), and `glass` and `hole` state changes.
- **Clients render** others interpolated about 120 ms behind the newest snapshot (two snapshot intervals less a
  margin; tune it with the harness's latency and jitter settings). **Their own skater is predicted**: it
  starts from the snapshot's authoritative state at `ack`, re-applies the pending intents with `Skater.skateStep`
  (ignoring collisions), and blends the drawn position toward the result over 0.1 s, snapping when off by more than
  48. While the client's skater owns the puck, the puck is drawn at its predicted blade. Each client plays effects,
  sounds and commentary from the snapshot events it receives (deduplicated by id); the host sends commentary line ids
  inside the events. Instant replays run on each copy from its own snapshot history.
- **Budget**: the host sends 15 snapshots a second plus a few reliable messages, so it stays under 20/s. Each client
  sends 15 inputs a second plus rare reliable messages.

---

## 15. Attract mode, touch-only devices and dev mode

### 15.1 Attract mode (scene `attract`)
- **Idle timer** on title, menus, side select, setup, the story map, records and about: 10 s without any input (keys,
  buttons, clicks, wheel, a mouse move of more than 8 px, a stick or trigger past .3) → `game.go('attract', null,
  { fade: 'dissolve' })`. Not during cutscenes, matches or the engine's open menus, and never in sessions.
- **The reel**: a script (`game.script`) of segments, each built on the real match simulation with every skater on
  AI, cheats free (infinite turbo, forced events, warping the puck or players). Each loop picks a new arena and teams.
  1. *Puck Drop* (8 s): the intro spotlights, a faceoff, play.
  2. *Big Hits* (8 s): a forced turbo big hit into the glass, which shatters.
  3. *Highlight Goal* (12 s): a set-up 2-on-1, a cross-crease pass, a one-timer goal, the horn and the instant replay.
  4. *Gloves Off* (10 s): an AI-vs-AI fight to a knockdown.
  5. *KABOOM!* (10 s): forced KABOOM mode, a KABOOM shot that blasts the goalie into the net.
  6. *Fan Frenzy* (7 s): items thrown and grabbed; an octopus slip.
  7. *Story teaser* (8 s): 3 cutscene lines with portraits and babble.
  8. *Flood Wagon* (6 s): the AI driver resurfacing scuffed ice.
  9. *Records card* (5 s): the logo, `PRESS ANY BUTTON`, and the top records.
  The loop is about 75 s, then it starts again.
- **Overlay**: a `DEMO` tag, the logo bug, and `PRESS ANY BUTTON` (glyph per device) blinking. On touch-only devices
  it reads "Controller or keyboard required" instead.
- **Any input** ends it: back to the title with that input consumed (`input.consumeAll()`), so it triggers nothing
  else. The audio follows the settings (browsers stay silent until a first gesture anyway).

### 15.2 Touch-only devices
- **Detection**: `matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches`, no gamepad
  seen, and no key pressed since load. Re-check on `gamepadconnected` and the first `keydown`; either one switches to
  normal at once.
- **Touch-only**: no touch controls anywhere (`touch: []` on every scene, the engine's touch buttons hidden). The title
  shows a large banner, "Controller or keyboard required", and a big **SETTINGS** button (a tap opens
  `game.menu('settings')`); the engine's corner menu button stays. Taps don't start the game. The attract mode runs by
  the same 10 s rule, and taps don't leave it (only to open Settings).

### 15.3 Dev mode (scene overlay `Dev`, from the pause menu's **Dev Mode** item; also `#dev`)
- Choosing it closes the engine's pause menu and opens the Dev panel. While the panel is open the match holds its own
  `devPause` flag (the engine's `game.paused` is false, so the panel can read input), unless **Live** is toggled on: the panel docks to the right at 45% width and the game runs behind it, so slider
  changes show at once.
- **Navigation**: L1/R1 (or Tab, or a click) switch tabs; up/down move; left/right adjust (hold to accelerate; L2/R2
  ×10 steps); △ (or R) resets the row; **RESET ALL TO DEFAULTS** is the first row of TUNING; ○ / Esc closes. The mouse
  hovers to focus rows, drags sliders and clicks toggles. Each row shows its value and its default.
- **TUNING** tab: every `T` key with a slider (Appendix A), grouped Skating, Puck & Passing, Shooting, Goalies,
  Hitting, AI, BOOM & Items, Fights, Match. Values persist in `E.store('dev:tuning')`. **Log tuning** prints a JSON of
  the non-default values to the console, for designers.
- **CHEATS**: infinite turbo; god mode (no knockdowns); always KABOOM; puck magnet (the puck comes to the human's
  blade); freeze AI; CPU goalies off; big heads; octopus rain; glow puck; retro rigs; instant BOOM full (an action).
- **WARP**: start any chapter or cutscene; jump to period 2, 3 or OT, or the shootout; set the clock to 0:10; score
  +1 for home or away; win or lose this game now; spawn each item or hazard at center; start a fight; start KABOOM;
  break the thin ice; shatter a panel; trigger the Flood Wagon; go to results, attract, about or the lab.
- **DEBUG**: overlays (bodies and radii, blade points, AI roles and targets, the puck's predicted path, goalie save
  shapes, grudge numbers, rig skeletons via `rig.debug(r)`), FPS, slow motion (1, .5, .25), frame step (paused: ✕
  advances one step), free camera (the stick pans, the triggers zoom), hide the HUD (screenshot mode), the RNG seed,
  and a **sound test** (play every sfx, song, layer, organ sting and voice, including a babble line per character).
- **Not available in AI Hub sessions.**

---

## 16. Build order and milestones
Build in this order. Each milestone ends with its tests passing (`node tests/run.mjs`) and a look at its screenshots.
The game must be playable from M3 on.

| M | Deliverable | Acceptance |
|---|---|---|
| **M0 Setup** | dev folder, the engine copied, the vendor files, `tools/build.mjs`, `tests/run.mjs` running an empty suite, `src/` skeleton, a title scene that boots in the browser and headless, ENGINE-CHANGES.md started | the built HTML opens from `file://` with no errors (`tools/check.mjs`); the headless boot test passes |
| **M1 Rink, skating, rigs** | `Rink` geometry and drawing (ice, lines, boards, glass panels, nets, benches), the floor TileMap, `skateStep`, SkaterRig (stride, glide, stop, crossovers, stick idle), the broadcast camera, the animation lab | unit tests for geometry and skating; filmstrips of stride and stop look right; screenshots of the Icebox rink in all 3 views |
| **M2 Puck play** | the puck, possession, stick-handling, passes (lead, saucer), one-timers, wrist and slap shots, goal detection, posts, net bulge, Goalie v1 (positioning, save solver, rebounds, freeze), HOCKEY_KEYS, mouse and right-stick aim, glyph chips, font patch, HUD v1 | headless: a pass reaches a stationary and a moving mate; a shot into an empty net scores; a shot at the goalie is saved; a post hit emits `post`; glyph labels per device |
| **M3 First playable match** | Match flow (faceoffs, clock, stoppages, goals, celebrations, periods, final, results, three stars), team AI, the referee, the crowd v1, audio v1 (sfx, the horn, the organ, the crowd bed, the theme), Exhibition Setup (1 player) | AI vs AI plays 3 periods with no errors and 3–12 goals; a bot-driven human match (the bot of 18.3) completes; `balance.mjs` runs |
| **M4 Over the top** | checks, knockdowns, the glass, turbo, deke, poke, BOOM and KABOOM, items and hazards, chirps, commentary with babble voices, instant replay, Fx | headless: the big-hit threshold, glass crack then shatter, KABOOM start, shot and end, item effects, replay playback ends and returns to a faceoff |
| **M5 Fights, OT, multiplayer, menus** | fights and the sin bin, OT and the shootout (manual goalie), local 1–4 players and side select, all 10-foot menus, settings, records, about | headless: a fight from gloves to a winner and the sin bin timer; a shootout to a decision; 4 inputs each moving their own skater; mouse hover focus and click in menus (browser) |
| **M6 Story and content** | all 5 arenas dressed (lights, props, crowds, hazards), all 6 teams, the story map, the cutscene runner and every script, choices, objectives, stars and unlocks, the Flood Wagon minigame, the 7 practice drills, the boss (The Vault, Golden Twister, Gilded Mode, Boost and organ), the ending and credits with highlights, saves | the whole-story playthrough test passes (18.3); screenshots of every arena and every cutscene set |
| **M7 Attract, touch, dev** | the attract reel, idle detection, touch-only mode, the Dev panel (all 4 tabs), the sound test | headless: idle 10 s → attract; all 9 segments visited; any input → title; dev slider change and reset; browser: a touch-only emulation shows the banner and attract runs |
| **M8 AI Hub** | `Net` (connect, card, host and client, prediction, events, finish), the metas, session flow | the fake-hub headless test (18.5) passes; the real harness passes in all 4 configurations (18.6) |
| **M9 Polish and balance** | tuning passes with `balance.mjs`, act on `check.mjs` look notes, every screenshot reviewed at 1280×720 and 1920×1080, the About pages and `exit-interview.json` filled in, the final build | the full `node tests/run.mjs` is green; no TODO or placeholder strings; `exit-interview.json` parses; the HTML runs from `file://` with no network requests |

---

## 17. Risks and how to de-risk them
| Risk | Why it is risky | De-risk |
|---|---|---|
| Skater and stick animation | new motion on a procedural rig decides whether it reads as hockey | built first (M1) in the animation lab; filmstrip every motion; keep solvePose overrides small and data-driven; fall back to the engine's poses for rare states |
| Puck feel (possession, passes, one-timers) | the core of the fun; easy to get floaty or sticky | every constant a slider from day one; headless pass and shot tests; play it at M2 before building on it |
| Goalie believability | too good is frustrating, too weak is boring | a physical save solver (reaction, lateral speed, shapes) rather than dice; `balance.mjs` shoots 200 shots per type and checks the save-rate bands in 7.6 |
| Curved boards, glass and depth sorting | custom drawing in a tile engine | far boards as background, end and corner panels queued per panel, near boards cut low; screenshots in all views at M1 |
| Netcode under latency, loss and limits | shared world, 20 msgs/s, unreliable packets | a pure `skateStep` for prediction; press counters; snapshots under 1,200 bytes (a test asserts it); a fake hub in Node with latency and loss before the real harness |
| Hub compliance | a session fails the harness's checklist | follow 14.2 step by step; the harness at M8 in all 4 configurations; no pause, quit or dialogs in sessions |
| Audio quality (babble, horn, organ) | voices can sound like noise | the sound test in Dev from M4; tune formants by ear; keep the voice bus quieter than the sfx bus |
| PlayStation glyphs in the pixel font | they rendered as `?` | the font patch plus glyph chips at M2; a test renders each chip |
| Scope | a big demo | milestones in value order; data-driven content; the systems shared by story, drills, attract and sessions (all are `Match` configs) |
| Determinism (replays, tests, attract) | hidden `Math.random` use | only `RNG.sim` in the simulation; a test runs the same seed twice and compares a state hash |

---

## 18. Testing

**One command**: `node tests/run.mjs` builds, then runs every suite in order and prints **only failures** plus one
line: `ICE HOC-KABOOM TESTS: 214 passed, 0 failed (headless 9 suites, browser 3, hub 4) in 182 s`.
`--quick` runs only the headless suites; `--only <suite>` reruns one (after changing the code it covers). Headless
suites load `build/game.js` into a `vm` context with the stand-ins from `engine/kits/test.mjs` (`window`,
`addEventListener`, `location`). They drive the game with `game.advance`, `input.tap` and `input.hold`, and read
`game.debug.snapshot()`. No subagents or workflows review anything; the scripts decide.

### 18.1 Unit (pure functions)
Rink inside, normal and clamp at corners; the faceoff dot table; `skateStep` (time to top speed, stop distance, turn
radius at speed, turbo drain); puck friction distance; board reflection angles; post ping; goal-line crossing (inside
vs post); pass lead hits a moving mate; shot aim stays inside the mouth for σ = 0; save-shape tests; impulse
thresholds; BOOM gain table; fight damage and stamina; tuning reset and resetAll; the glyph label per device and
setting; the name sanitizer; snapshot encode, decode and size (< 1,200 bytes for 8 entities, 3 items and 4 events);
input packet press counters across a dropped packet; objective predicates.

### 18.2 Systems (headless game)
- A faceoff leads to possession within 2 s.
- A scripted wrist shot from the slot at an empty net scores.
- A slapshot at the goalie from the blue line is saved.
- A one-timer cross-crease scores at least 4 of 10 seeded tries.
- A turbo check at full speed knocks down; a second hit into the same panel shatters it, and the puck leaves through
  it → a faceoff.
- Holding △ near a rival with a grudge starts a fight; scripted jabs win it; the loser is in the sin bin for 20 s; a
  power-play banner shows.
- Filling BOOM starts KABOOM; a KABOOM shot blasts the goalie; it ends after 15 s.
- Each item applies its effect and expires; thin ice breaks after a big hit; a skater in a hole is frozen 3 s.
- The period ends at 0:00 → intermission → the next period; OT is sudden death; the shootout reaches a decision.
- Results show three stars.
- 4 local players each move only their own skater.
- Replay plays and returns.
- The same seed and inputs twice give the same state hash after 60 s (determinism).

### 18.3 Scripted playthrough of the whole game (`tests/play-story.mjs`)
From boot: title → CUP RUN → for chapters 1 to 5: advance the cutscene (tap confirm; take choice 1 in chapters 1, 3
and 5, choice 2 in 2 and 4), run warm-up drills 1–3 in chapter 1 by script, then play the match with **the bot
controlling the human team's skater through `game.input`** (the CPU intent turned into stick and buttons, as in the
SPORTS kit's `bot()`), with dev tuning giving the home team AI skill .95 and the rivals .3 so each game is won in real
play. Play 1 period for real, then warp the clock to 0:05 for the remaining periods, keeping the lead. Play the
intermission Flood Wagon once with the bot steering, the chapter 4 Shootout Showcase, and the chapter 5 boss phases
(the Boost and organ events must fire). Then the post-game, results, the map, the ending, credits and back to the
title. Assert at each stage: the expected scene and chapter, at least one goal per game, no errors, stars recorded,
the save written, and every chapter's new mechanic event seen (one-timer, kaboom_start, thin_ice_break, fight_end,
mascot_down, shootout_end, vault_cracked or a boss goal). If real play hasn't produced a chapter's signature event by
the end of its first period, trigger it with the Dev warp (`game.debug.warp('breakIce')` and the like), then assert
that the game handled it (its consequences, commentary and objective). Also play **Practice drills 1–7** by script and
assert each passes.

### 18.4 Other headless suites
- **Attract**: idle 10 s from the title → attract; run 80 s; all 9 segments visited; tapping confirm → title with
  the input consumed.
- **Dev**: open from the pause menu item; change 3 sliders (the values apply to the match); reset one; reset all
  (all defaults); a cheat toggles; warps work.
- **Exhibition**: 60 s with 4 players, each scheme.
- **Balance** (`balance.mjs`; it also prints a table when run alone): 20 AI-vs-AI games at Pro, averaging 5–10 goals
  a game; save % .78–.90; at least 2 fights per 10 games; KABOOM 1–4 per game; plus 7.6's shot-type bands.
- **Text**: every TEXT pool meets its minimum; every `{token}` resolves; no line wider than its box at scale 1.

### 18.5 Fake-hub network test (headless, Node)
Two to four `vm` contexts, each with the engine, the game and a fake `AIHub` (an in-memory bus with configurable
latency 150 ± 50 ms and 5% loss). It runs connect → card (scripted ready) → start → 60 s of scripted play → time-up.
Assert: the host's and clients' scores match; a client's own-skater error stays below 12 u on average; presses are
never lost; `finish` is called once with valid standings; a leaving client's skater turns CPU; a server-mode host
works.

### 18.6 Browser suites (Playwright 1.63, Chromium; `TMPDIR` set)
- `engine/tools/check.mjs` on the built HTML and on `#match/muskrats/drillers/icebox`, `#fight` and `#kaboom`: no
  errors, and every look note handled.
- **Menus and input**: keyboard navigation through the main menu; mouse hover moves focus and a click picks;
  `lastDevice` changes switch the prompt chips; Settings → Xbox changes the chips.
- **Touch-only**: `--size 390x844@3` with coarse-pointer emulation shows the banner and SETTINGS, and attract starts
  after 10 s.
- **Hub harness**: serve `dev/hub/` (`python3 -m http.server 0 --bind 127.0.0.1`, confirm the page title, kill by
  PID afterwards). Open `harness.html?game=game.html&players=2&auto=1`; then
  `&players=4&latency=150&jitter=50&loss=5&auto=1`; then the same with `&scenario=host-leave`; then
  `&players=2&scenario=server&auto=1`. Each waits for `document.body.dataset.complete === 'true'` and asserts
  `window.__hubCheck.pass === true`, printing the failed checks otherwise. Then the game outside a session still
  reaches the title.

### 18.7 Screenshots (only for what scripts can't judge; `tests/shots.mjs`)
At 1280×720 and 1920×1080: title, the attract segments, side select with 4 players, setup, every arena at a faceoff,
a big hit and shattered glass, a fight, KABOOM mode, a goal celebration, a replay, results with three stars, a
cutscene with a portrait, the story map, a drill, the Flood Wagon, the Dev panel, Settings with Xbox glyphs, the
About pages, the session card (from the harness), and the touch-only banner at 390×844. Look at every one, comparing
against the look target (8) and the 10-foot rules (12).

---

## 19. Definition of done (TASK.md → where it is met)
- [ ] Genre and perspective chosen and used (0, 7.15). Title from a real RNG (0).
- [ ] Single HTML with the given name, the dev folder, no network requests (1).
- [ ] Built on the handoff engine; changes logged (4) and summarized in About.
- [ ] Native look with new hockey art (8); native animation with new hockey motion (9).
- [ ] All audio in code; gibberish voices (10).
- [ ] AI Hub sessions passing the harness, plus local multiplayer for the game on its own (14, 6.1, 12).
- [ ] Feature-complete demo: story, exhibition, practice, records and every mechanic shown in play, drills and attract
      (11, 12, 15.1).
- [ ] Dev mode from the pause menu with live sliders and reset to defaults (15.3).
- [ ] Attract mode after 10 s idle on title and menus; any input exits (15.1).
- [ ] 10-foot, controller-first UI; native keyboard and mouse (aim, hover focus, click); prompts follow the last
      device; PlayStation glyphs with an Xbox option (6, 12).
- [ ] Touch-only: "Controller or keyboard required", the settings button, attract runs (15.2).
- [ ] Narrative tone: hockey broadcast and small-town hockey comedy (11.3, Appendix D).
- [ ] No TODOs, placeholders or stubs (a test enforces it).
- [ ] Source Information, Testing Feedback, Engine Feedback and Prompt Feedback in the chat reply **and** the About
      screen; `exit-interview.json` in TASK.md's exact shape, parsing as JSON. Suggested `aiHub` values: name
      "Ice Hoc-Kaboom"; tagline "Over-the-top 3-on-3 arcade hockey"; description "Glass-shattering hits, dropped
      gloves and explosive KABOOM slapshots as the Mukluk Falls Muskrats fight to save their rink. Story, exhibition
      and up to four players."; type "Game"; genre "Sports"; source "Ice hockey"; series ""; players "1–4"; controls
      "Stick/WASD skate · ✕/J pass · □/K shoot · ○/L deke · △/I saucer & gloves · R2/Shift turbo"; tags
      `["arcade", "sports", "versus", "comedy", "pixel art", "story"]`. The Source Information `plan` field is
      `PLAN.md`.

---

## Appendix A: Tuning defaults (`T`; every row is a Dev slider)
| Group | Key | Default | Min–max | Meaning |
|---|---|---|---|---|
| Skating | skateMax | 132 | 80–200 | top speed (u/s) at rating 3 |
| | skateAccel | 300 | 120–600 | acceleration |
| | iceGlide | 28 | 0–120 | coasting deceleration |
| | turnSlow / turnFast | 5.0 / 2.6 | 1–10 | rad/s at low and top speed |
| | edgeGrip | 6 | 1–20 | sideways decay /s |
| | stopDecel | 700 | 300–1400 | hockey-stop deceleration |
| | turboMul | 1.45 | 1–2 | turbo speed factor |
| | turboDrain / turboRegen | 0.45 / 0.18 | 0–2 | meter per second |
| Puck & passing | puckFriction / puckDrag | 26 / 0.12 | 0–80 / 0–.5 | puck deceleration |
| | boardBounce | 0.62 | .2–1 | boards restitution |
| | pickupRadius | 8 | 4–16 | blade pickup |
| | passMin / passMax | 240 / 420 | 150–600 | pass speeds |
| | saucerApex | 10 | 4–24 | saucer height |
| Shooting | wristSpeed | 330 | 200–500 | wrist shot |
| | slapBase / slapGain | 380 / 160 | 200–600 / 0–400 | slapshot |
| | slapCharge | 0.9 | .3–2 | seconds to full |
| | oneTimerBonus | 1.15 | 1–1.6 | one-timer factor |
| | shotError | 1.0 | 0–3 | scales all shot σ |
| Goalies | goalieReact | 0.16 | .05–.4 | base reaction (s) |
| | goalieLateral | 150 | 60–300 | lateral speed |
| | goalieReach | 1.0 | .6–1.6 | save-shape scale |
| | gloveCatch | 0.55 | 0–1 | glove freeze chance |
| | reboundSpeed | 0.35 | 0–.8 | rebound factor |
| | kaboomBlast | 0.6 | 0–1 | blast carries the puck in |
| Hitting | checkPower | 1.0 | .3–3 | impulse scale |
| | knockdown | 150 | 60–300 | big-hit threshold |
| | glassCrack / glassShatter | 170 / 240 | 80–400 | board-impact speeds |
| | accidentalHit | 180 | 80–400 | knockdown with no check |
| AI | aiSkillHome / aiSkillAway | by difficulty | 0–1 | skill overrides (dev) |
| | aiAggression | 0.5 | 0–1 | check vs poke |
| | aiItemGreed | 120 | 0–300 | item detour range |
| | aiShootRange | 200 | 80–400 | shooting zone |
| BOOM & items | boomGain | 1.0 | 0–4 | all BOOM gains |
| | kaboomTime | 15 | 5–40 | KABOOM seconds |
| | itemEvery | 35 | 8–120 | mean seconds between throws |
| Fights | fightBalance | 100 | 40–200 | fighter balance |
| | fightGrudge | 40 | 0–100 | prompt threshold |
| | fightMax | 3 | 0–10 | per game |
| | sinBin | 20 | 5–60 | seconds |
| Match | periodLen | 120 | 30–300 | exhibition period (s) |
| | gameSpeed | 1.0 | .25–2 | `game.timeScale` |
| | crowdHype | 1.0 | 0–2 | crowd reaction scale |

## Appendix B: Event catalogue (`Bus`; consumers: stats, objectives, Talk, Fx, Crowd, Net, Replay)
`faceoff_drop`, `faceoff_won{team, by}`, `possession{by}`, `pass{from, to, kind}`, `pass_complete`,
`intercept{by}`, `shot{by, kind, speed, onGoal}`, `save{goalie, kind, freeze}`, `post{by, bar}`,
`block{by}`, `goal{team, by, assists, kind, ppg}`, `stop{by}`, `rattle{x, y}`, `hit{by, victim, power, big}`,
`glass{panel, state}`, `knockdown{victim}`, `deke{by}`, `deke_beat{by, victim}`, `poke{by, ok}`,
`chirp{by, target, line}`, `gloves{by, target}`, `turtle{by}`, `fight_start{a, b}`, `fight_hit{by, kind, dmg}`,
`fight_end{winner, loser}`, `sin_bin{who, t}`, `sin_bin_end{who}`, `item_throw{kind}`, `item{by, kind}`,
`hazard{kind, victim}`, `thin_ice_break{patch}`, `plunge{victim}`, `mascot_down{by}`, `boom{team, n}`,
`kaboom_start{team}`, `kaboom_end{team}`, `kaboom_shot{by}`, `blast{goalie}`, `vault_cracked`, `twister{by}`,
`period_end{n}`, `intermission`, `ot_start`, `shootout_start`, `shootout_attempt{by, ok}`, `shootout_end{team}`,
`final{winner}`, `hat_trick{by}`, `hoser_hat_trick{by}`, `boost_start`, `organ_boost`.

## Appendix C: Cutscene data format
```js
{ id: 'ch1-pre', set: 'locker', music: 'locker',
  cast: [{ id: 'marge', at: [96, 60], facing: Math.PI / 2 }, { id: 'dunny', at: [70, 92] }, /* … */],
  steps: [
    { cam: [96, 72], zoom: 1.4, t: 0 },
    { say: 'marge', text: 'Sit down, shut up, and listen. I got a letter.', expr: 'angry' },
    { move: 'glitterman', to: [130, 40], t: 1.2 },
    { pose: 'lou', pose: 'kneel' },
    { sfx: 'organ-sting-sad' },
    { choice: { who: 'marge', text: "Captain. Tell 'em how we play tonight.",
                options: [['CLEAN AND FAST', { tactic: 'finesse' }], ['MEAN AND LOUD', { tactic: 'grit' }]] } },
    { wait: 0.4 } ] }
```
The runner (`game.script`) plays steps in order: `say` waits for the dialog to close; `move` and `cam` tween; a
`choice` sets story flags (saved). Hold ○ to skip, which applies the default choice.

## Appendix D: Writing samples (the voice to match; TEXT holds the full pools)
**Booth: CHUCK (play-by-play: present tense, rapid verbs, crescendo)**
- "Puck's dropped and we're under way at {arena}!"
- "{name} with speed, through center, over the line—"
- "{name} dangles, dances, and DEKES!"
- "Big wind-up… {name} with the CLAPPER!"
- "{name} SHOOTS — {name} SCORES!"
- "TOP SHELF, where Grandma hides the cookie tin!"
- "Bar down! They heard that one in the parking lot!"
- "One-timer — BANG! {name} buries it!"
- "Five-hole! Right between the pads!"
- "Glove save, and a BEAUTY!"
- "Off the POST! The iron says no!"
- "OH! {victim} just got a free trip to next Tuesday!"
- "THROUGH THE GLASS! Somebody get a broom!"
- "The gloves are off! {a} and {b} are going at it!"
- "The meter's full… it's… KA-BOOOOM!"
- "The puck went in, and the GOALIE went with it!"
- "Polar Pete is DOWN! Somebody check on the bear!"
- "HAT TRICK! Here come the hats!"
- "That's the end of the {period}. {home} {hs}, {away} {as}."

**Booth: MOOSE (color: folksy, mangled metaphors, ex-enforcer)**
- "He stopped that with his face, Chuck. You can't teach that."
- "Ding-dong, nobody home."
- "He hit him so hard his ancestors felt it."
- "That's a delivery, Chuck, and nobody signed for it."
- "That glass is coming out of somebody's paycheque."
- "Now THIS is hockey. Grab a seat. Grab a hot dog. Grab two."
- "Octopus on the ice. It's tradition, Chuck. Don't ask which tradition."
- "I played eleven seasons. Lost fourteen teeth. Found nine."
- "My first coach said I had the hands of a surgeon. Then he saw me skate."
- "Thin ice? I never skated on the thick stuff."
- "Somebody call the fire department. And my mother."

**Chirps (rhymes and comparisons, PG)**
- "Nice flow! Did your mom cut it with a skate blade?"
- "You skate like a fridge on a waterbed!"
- "Is that a stick or a toothpick?"
- "Your five-hole's wider than the highway!"
- "You're a pylon with a pulse!"
- "Hey goalie, want a net? You're not using yours!"
- "Your slapshot couldn't pop a bubble!"
- "You've got the hockey sense of a boiled perogy!"
- "Nice turnover! Bake it yourself?"
- "My grandma checks harder, and she's ninety!"

**Tips (Coach Marge; `{action}` becomes a glyph chip)**
- "Skate with the stick. Hold {turbo} to turbo. It runs out, so pick your moments."
- "{pass} passes. Point where you want it to go."
- "Tap {shoot} for a wrister. Hold it for a slapshot. Let go to fire."
- "Pass coming your way? Hit {shoot} for a ONE-TIMER."
- "No puck? {shoot} checks, {deke} pokes, {pass} switches to whoever's closest."
- "With the puck, {deke} dekes past a check. Fools goalies too."
- "Hits, passes, saves, goals: they fill the BOOM meter. Fill it and the whole team goes KABOOM."
- "Somebody's got a grudge. Hold {lob} to drop the gloves."
- "In a scrap: {pass} jab, {shoot} haymaker, {deke} duck, {lob} yank the sweater."
- "Fans throw goodies on the ice. Skate over 'em."
- "Power play! They're a skater short. Move it and shoot."
- "{lob} with the puck flips a saucer over their sticks."
- "{chirp} chirps. Gets in their heads."
- "Shootout! In net: {pass} butterfly, {shoot} poke, {deke} dive."

**Three stars (CHUCK)**: "The third star: {name}, who hit everything but the Flood Wagon." · "Second star: {name},
with {g} goals and a smile that could melt the ice." · "And the first star of the game… {name}!"
