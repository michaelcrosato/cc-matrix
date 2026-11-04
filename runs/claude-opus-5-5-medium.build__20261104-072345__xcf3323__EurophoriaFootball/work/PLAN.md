# EUROPHORIA FOOTBALL

**Over-the-top arcade football. The build plan for TASK.md.**

The title was picked the way TASK.md asks: 50 riffs on "European football" were brainstormed, then Python's
`secrets.randbelow(50)` (OS entropy, not a seeded generator) chose index 0, **Europhoria Football** (Euro + euphoria).
Use exactly this title everywhere: the title screen, `<title>`, the About screen, the AI Hub card, the exit interview.
Do not pick again.

| | |
|---|---|
| **In one line** | A broke seaside club gets into the continent's biggest cup because of a typo, and its fans' euphoria carries it to the final. It plays as 5-a-side arcade football with super strikes, slide tackles that send people flying, dives, VAR, and a crowd that is your power bar. |
| **Genre** | Arcade sports: 5-a-side football (4 outfield players and a keeper a side) with a story-driven cup run. 1 to 4 local players; online versus through AI Hub. |
| **Perspective** | A TV broadcast camera: side-on, raised 40° (a custom engine `View`), scrolling with play. Classic three-quarter (55°) and Aerial (80°) are options in Settings. Replays use turned angles. |
| **Engine** | my-3D2dge v0.85.2, the handoff package (`dist/handoff` of github.com/michaelcrosato/my-3d2dge), full engine, changed only as §5 lists. |
| **Online** | AI Hub Session Protocol v1 (github.com/michaelcrosato/ai-hub `lib/hub`), mode `shared-world`, 2–4 players. |
| **Work root** | The folder that holds TASK.md, STAGE.md and this PLAN.md. |
| **Dev folder** | `EurophoriaFootball-EuropeanFootball-claude-opus-5-5-max-20261103-174834/` inside the work root. All dev files go here. |
| **Deliverable** | `EurophoriaFootball-EuropeanFootball-claude-opus-5-5-max-20261103-174834.html` in the work root: one file, everything inlined, runs from `file://`. |
| **Exit interview** | `exit-interview.json` in the work root, next to the HTML, in TASK.md's exact shape. |

Who this is for: the developers (people or AI models) who build the game from TASK.md and this file alone. Where this
plan and TASK.md seem to disagree, TASK.md wins. Where this plan gives a number, it is a starting value for tuning in
dev mode, not a law.

---

## Contents

1. [The game in one page](#1-the-game-in-one-page)
2. [Controls, prompts and devices](#2-controls-prompts-and-devices)
3. [Tech stack, folder layout, build](#3-tech-stack-folder-layout-build)
4. [Architecture](#4-architecture)
5. [Engine changes](#5-engine-changes)
6. [Systems and mechanics](#6-systems-and-mechanics)
7. [Content](#7-content)
8. [Art and animation](#8-art-and-animation)
9. [Build order and milestones](#9-build-order-and-milestones)
10. [Risks and how to de-risk them](#10-risks-and-how-to-de-risk-them)
11. [Testing](#11-testing)
12. [Definition of done and hand-back](#12-definition-of-done-and-hand-back)
- [Appendix A: tuning defaults (dev sliders)](#appendix-a-tuning-defaults-dev-sliders)
- [Appendix B: network messages](#appendix-b-network-messages)
- [Appendix C: data shapes](#appendix-c-data-shapes)
- [Appendix D: music sketches](#appendix-d-music-sketches)

---

## 1. The game in one page

### 1.1 Core loop

> Win the ball, pass it about, beat your man, hit it like a train, and keep the crowd fed until they lift you into
> EUROPHORIA.

Each match: possession, then chances, then the crowd's Euphoria rises, then a Europhoria burst and a Super Strike,
then a goal, a celebration and a replay, then the kickoff again. Each cup round: a tabloid back page, a team talk, the
match, the result, then the next stop on the map.

### 1.2 Pillars

1. **Football first, circus second.** Passing, shooting, tackling and keeping must feel good with every over-the-top
   (OTT) extra switched off (dev mode has a "pure football" toggle). The OTT layer rewards good football; it never
   replaces it.
2. **The crowd is the power bar.** Euphoria is not an abstract meter: it is the noise of your fans. They chant, wave
   scarves, light flares and unfurl the tifo as it fills.
3. **Broadcast drama.** It is framed like football on TV: a side-on camera, a score bug, two commentators, replays,
   a fourth official's board, VAR.
4. **Couch and TV first.** A DualSense at 10 feet is the reference device. Big type, few choices per screen, glyph
   prompts, every screen usable with the d-pad and ✕/○. Keyboard and mouse are native too.
5. **Everything is data.** Teams, stadiums, story, commentary, drills, events, supers, chants and songs are entries in
   registries, so the rest of the game can be built out by adding data (§4.6).

### 1.3 From the source to the mechanics

| What makes European football itself | What it becomes in the game |
|---|---|
| Terraces, chants, scarves, flares, tifos | The Euphoria meter (§6.9), crowd states and chants (§6.18), the tifo and flares at Europhoria |
| Tactical schools: route one, tiki-taka, gegenpressing, catenaccio, galácticos | Each opponent's AI profile and gimmick (§6.13, §7.1); "parking the bus" is literal |
| Cold rainy nights, snow, the orange ball, floodlights | Weather that changes ball physics and visibility (§6.19) |
| Dives, cards, the referee, VAR | A Theatrics (dive) button, referee strictness, cards, advantage, VAR checks (§6.10) |
| Cup magic, giant-killing underdogs | The Cup Run story (§6.24, §7.3) |
| Tabloid back pages, commentary clichés, punditry | Tabloid screens between matches, two-voice commentary (§6.17, §7.4) |
| Sticker albums | The Sticker Album (§6.31, §7.5) |
| Goal celebrations | A celebration picker after every goal (§6.21) |
| Penalty heartbreak | Shootouts, the Panenka (§6.11, §6.12) |
| Nutmegs, step-overs, rainbow flicks, bicycle kicks, diving headers | Skill moves and the air-ball moves (§6.5, §6.6) |
| Action replays | Goal replays from turned camera angles (§6.15) |
| Pitch invaders, seagulls, beach balls on the pitch, floodlight failures | Matchday events (§6.20) |

### 1.4 How long the demo is, and where each mechanic shows up first

At the default half length (2:00 of real time per half) a cup match takes about 6 minutes. The full demo is about 45–60
minutes: the cup run (5 matches and their story beats), 9 training drills, Kick-About, Penalties, the Sticker Album, and
the attract mode. Every mechanic is required at some point in the cup run, in this order:

| Mechanic | Taught in training drill | Required first in |
|---|---|---|
| Run, sprint, stamina, pass, shoot, power, aim | 1, 2, 3 | Qualifying Round (Hoofington) |
| Lobs, crosses, headers, volleys, corners, goal kicks | 4 | Qualifying Round (Hoofington are all about the air) |
| Tackles, slides, barges, switching, interceptions | 6 | Round of 16 (Pasapasa keep the ball) |
| Through balls, one-twos | 2 | Round of 16 |
| Skill moves, nutmegs; snow physics, the orange ball | 5 | Quarter-final (Stahlpresse press you) |
| Free kicks, penalties, cards, advantage, dives, VAR, the bus | 7, 9 | Semi-final (Lucchetto) |
| Euphoria, Europhoria, Super Strikes, the Save Duel | 8 | All matches; the final requires a Super Strike for its challenge |
| Golden goal, penalty shootout | 7 | Any drawn cup tie; Penalties mode; the attract mode shows one |
| Celebrations, replays, matchday events, weather | none | All matches |

---

## 2. Controls, prompts and devices

### 2.1 Action table

The reference pad is the PS5 DualSense in the browser's standard mapping (engine codes `Pad0`..`Pad16`). Prompts show
PlayStation glyphs by default; Settings → Controller → Button symbols switches to Xbox (A B X Y).

| Action id | With the ball | Without the ball | Pad (PS / Xbox) | Keyboard | Mouse (in play) |
|---|---|---|---|---|---|
| move | run / dribble | run | L-stick, d-pad | WASD, arrows | — |
| `sprint` | sprint (stamina) | sprint | R2 / RT (`Pad7`) | Left Shift | — |
| `pass` | ground pass to the teammate the stick points at | standing tackle (poke) | ✕ / A (`Pad0`) | J | Left click: pass toward the cursor (click a teammate to pass to them) |
| `shoot` | hold to charge, release to shoot; stick aims | slide tackle | □ / X (`Pad2`) | K | Right button held: charge, release to shoot at the cursor |
| `lob` | lob, cross from wide, chip near the keeper | shoulder barge | ○ / B (`Pad1`) | L | Middle click: lob toward the cursor |
| `through` | through ball into space | switch player | △ / Y (`Pad3`) | I | — |
| `skill` | skill move (by stick direction, §6.6) | — | R1 / RB (`Pad5`) | E | — |
| `switch` | hold with pass: one-two | switch to the teammate nearest the ball | L1 / LB (`Pad4`) | Q | Left click on a teammate while defending: switch to them |
| `dive` | Theatrics (dive) | Theatrics | L2 / LT (`Pad6`) | C | — |
| `euphoria` | trigger Europhoria when the meter is full | same | L1 + R1 together | Space (also Q + E) | — |
| pause | pause menu (engine) | | Options (`Pad9`) | Esc, P | the corner's menu button |
| confirm / cancel | menus (engine) | | ✕ / ○ | Enter, Space / Esc, Backspace | click / right click |

- **Mouse aim (keyboard and mouse players).** When the mouse moves over the canvas in play, mouse aim switches on: a
  pixel reticle sits on the pitch under the pointer (`game.mouseGround()`). Passes, shots and lobs then aim at it, and
  moving still uses WASD. It switches off after 3 s without mouse movement, or when the stick is used. The wheel zooms
  the camera (the engine's own player zoom). In every menu the pointer's hover moves the focus and a click picks.
- **Celebrations and the Save Duel** reuse the face buttons (✕ □ ○ △ / J K L I).
- **Keepers** are AI-controlled except in penalties (§6.11) and the Save Duel (§6.9). After a catch, the human side's
  keeper waits up to 2 s for ✕ (throw toward the stick) or □ (kick long), then the AI distributes.

### 2.2 Input preset

Define one preset, `EF.KEYS`, as a **fresh object**: first copy `up, down, left, right, start, pause, confirm, cancel`
from `E.Input.DEFAULT`, then add the game's actions **in this order**: `pass, shoot, lob, through, sprint, skill,
switch, dive, euphoria` (the SPORTS kit's `Object.assign({}, E.Input.DEFAULT, {...})` would keep DEFAULT's own `skill`
key in its old place and break the order). The order matters: `Input.halfKeys` gives two players sharing one keyboard
8 buttons each in declaration order (left half F G H R T Y V B, right half . / , L ; ' K M, plus numpad 1–8). The
ninth action, `euphoria`, gets no half-keyboard key, so on a shared keyboard Europhoria is the `switch` + `skill` chord
(the same chord as L1 + R1). Detect the chord in the controller: both down within 120 ms. A test checks the halves'
mapping (§11.3).

Mouse buttons: bind `Mouse0` to `pass`, `Mouse2` to `shoot`, `Mouse1` to `lob`, but read them only while mouse aim is
on, so a click on the canvas cannot fire a pass from a gamepad session.

### 2.3 Prompts and glyphs

- Prompts follow `game.input.lastDevice` (`'keyboard' | 'mouse' | 'gamepad' | 'touch'`), per player
  (`game.players[i].lastDevice`).
- **Never pass pad symbols to `E.font`.** The pixel font is ASCII plus a few symbols and draws `'?'` for ✕ ○ □ △. Build
  `EF.Glyphs` (§4.2, `02-glyphs.js`): pixel-art icons drawn by code, 12×12 at scale 1 (24×24 at scale 2):
  - PlayStation: ✕ blue `#6aa0ff`, ○ red `#ff5a5a`, □ pink `#ff7ad0`, △ green `#3ad6a0` on a dark disc; L1 R1 L2 R2 as
    rounded pills; Options and Create as small capsules; L and R sticks as discs with an arrow.
  - Xbox: A green, B red, X blue, Y yellow discs with the letter; LB RB LT RT pills; Menu, View.
  - Keyboard: a keycap with `input.codeLabel(code)` (W, Shift, Space, J…), widened to fit.
  - Mouse: a mouse outline with the left, right or middle button lit, and a wheel.
- `EF.prompt(r, x, y, action, label, { player, scale })` draws the icon for the action's binding on the player's
  device, then the label. `EF.promptWidth(...)` is there for centring. The binding comes from the input's map after the
  player's rebinding: take the first pad code or key code for the action (the logic of `input.label()`), then map it to
  an icon.
- **Default PlayStation.** In `new E.Game({ menu: { settings: [...] } })`, redefine the standard `glyphs` setting (a
  game's own settings are defined after the standard ones and replace a spec with the same key):
  `{ key: 'glyphs', group: 'Controller', label: 'Button symbols', type: 'select', value: 'playstation', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']], apply: (g, v) => { g.input.glyphs = v; for (const p of g.players) p.glyphs = v; } }`.
  Check that the Controls screen shows it under Controller. If it does not, change `STANDARD_SETTINGS.glyphs` in the
  engine instead (§5).
- Prompts on screen: context prompts near the controlled player (for example "□ VOLLEY" in the air-ball window, "L1+R1
  EUROPHORIA!" when the meter is full), set-piece prompts in a bottom bar, menu prompts in a footer
  ("✕ SELECT  ○ BACK  L1/R1 PAGE"). Settings → Game → Prompts: Always / While learning (the default: a prompt shows
  until the player has used that action 3 times) / Off.

### 2.4 Shared keyboard, controllers joining

Kick-About's setup screen calls `game.allowJoin({ max: 4 })`: Start (Options) on a free pad, or 2 on the keyboard
(player 2 takes the right half; player 1 moves to the left half by itself). Each player's icon then moves left (HOME),
centre (CPU, which means not playing) or right (AWAY) with the stick or d-pad, and ✕ marks ready (§6.27). In the cup run,
extra players can join the Kippers for co-op the same way on the pre-match team-talk screen.

### 2.5 Touch-only devices

There are no touch controls. Every scene sets `touch: []` (no touch buttons), and `input.touchEnabled = false` (no
touch stick); check on a phone-sized `tools/check.mjs` run that nothing touch-related is drawn. On a
device with a coarse pointer, no fine pointer and no gamepad, the title shows a panel: "CONTROLLER OR KEYBOARD
REQUIRED". Under it is one big SETTINGS button (a tap opens `game.menu('settings')`), and the engine's corner menu button
stays. The attract mode still starts after 10 s; a tap goes back to the title. A key press or a gamepad connecting
clears touch-only mode at once (§6.33).

---

## 3. Tech stack, folder layout, build

### 3.1 Stack

- **Engine:** my-3D2dge v0.85.2, the handoff package: `my-3d2dge.js` (the full engine, readable, every module), the
  cards (`API.md` read whole, `API-INDEX.md` searched, `AI_GUIDE.md`), `docs/ASSETS.md`, `tools/` (check, filmstrip,
  replay, asset tools), `kits/sports.js` (the starting point for the match). Get it with a sparse clone into
  `<dev folder>/.scratch/` (not `/tmp`, §3.4):
  `git clone --depth 1 --filter=blob:none --sparse https://github.com/michaelcrosato/my-3d2dge.git .scratch/my-3d2dge`,
  then `git -C .scratch/my-3d2dge sparse-checkout set dist/handoff src/mocap tools examples/cmu-lib docs` (about 30 MB).
  Copy only what is needed into the dev folder, and delete `.scratch/` (with its `.git`) before hand-back, so no nested
  repository is left in the work root.
- **Animation clips:** the engine repository's mocap system: `src/mocap/readable.js`, `src/mocap/mocap.js`, the sets
  `src/mocap/sets/quaternius.js`, `mesh2motion.js`, `cmu.js`, the CMU soccer takes `examples/cmu-lib/CMU_10.js` and
  `CMU_11.js` (kick soccer ball), and `tools/anim-set.mjs` (with `tools/mocap-lib.mjs`) to cut one small set for the game
  (§8.3). Licences: Quaternius CC0, Mesh2Motion CC0, CMU free for all uses. Credit them on the About screen.
- **AI Hub client:** `session.js` 1.4.0 from `https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/session.js`,
  pasted unmodified. Harness for testing: `harness.html`, `bridge.js`, `round.js` from the same folder.
- **Language:** plain JavaScript (ES2022) in one IIFE, as the engine's rules require. No libraries, no CDN, no network
  requests outside the hub client's `postMessage`.
- **Tools:** Node 24 (on this machine), Playwright 1.63.0 (the version `dist/handoff/package.json` pins), Python 3 for a
  local server only when the hub harness needs one.

### 3.2 Folder layout (inside the dev folder)

```
EurophoriaFootball-EuropeanFootball-claude-opus-5-5-max-20261103-174834/
  package.json            # { "type": "module", devDependencies: { playwright: "1.63.0" }, scripts: { build, test } }
  engine/
    my-3d2dge.js          # the handoff engine, with the changes in §5 (marked "// EF:" at each change)
    CHANGES-ENGINE.md     # each engine change: where, what, why (feeds the exit interview's engine feedback)
    API.md API-INDEX.md AI_GUIDE.md ASSETS.md   # copied for reference
  vendor/
    session.js            # AI Hub client 1.4.0, unmodified
    mocap/readable.js mocap.js   # from the engine repo, unmodified
  mocap/
    ef-clips.js           # the game's own clip set, written by tools/anim-set.mjs (§8.3)
  src/                    # the game, as numbered fragments (§4.2); the build wraps them in one IIFE
  tools/
    build.mjs             # builds build/game.js, build/index.html (dev page) and the single-file deliverable
    test.mjs              # THE test command (§11): prints only failures and one count line
    harness/              # harness.html, bridge.js, round.js from ai-hub lib/hub (for the online test)
    lib/                  # test helpers: vm loader, fake hub, scripted bots, assertions
    check.mjs filmstrip.mjs replay.mjs   # copied from the handoff tools/
  build/                  # generated: game.js, index.html
  shots/                  # screenshots and filmstrips (generated, for things a script can't check)
```

### 3.3 Build

`node tools/build.mjs` does four things:

1. **Concatenate** `src/*.js` in file-name order into `build/game.js`, wrapped as
   `(() => { 'use strict'; const E = My3D2dge, { px, clamp, lerp, approach, TAU } = E; ... })();`. Each fragment is
   plain code that shares the wrapper's scope (no IIFE of its own). Put `//# sourceURL=` comments per fragment so
   errors name the file.
2. **Inject** the About data: read `../exit-interview.json` if it exists (else a stub with "unknown" values) and emit
   `EF.ABOUT = {...}` as the first line inside the IIFE, so the About screen and the exit interview never disagree.
3. **Write `build/index.html`**: the dev page, which loads `../vendor/session.js` first in `<head>`, then
   `../engine/my-3d2dge.js`, `../vendor/mocap/readable.js`, `../vendor/mocap/mocap.js`, `../mocap/ef-clips.js`,
   `game.js`.
4. **Write the deliverable** `../EurophoriaFootball-EuropeanFootball-claude-opus-5-5-max-20261103-174834.html`, with the
   same scripts inlined in the same order. The `<head>` must be exactly in this order:
   1. `<meta charset="utf-8">`
   2. `<script>` + session.js, unmodified + `</script>` (the hub requires it as the first script, right after charset)
   3. `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, `<title>Europhoria Football</title>`, a description meta
   4. the hub session metas: `hub:session` = `1`; `hub:session-players` = `2-4`; `hub:session-mode` = `shared-world`;
      `hub:session-minutes` = `4`; `hub:session-goal` = `Outscore the other side before the final whistle`;
      `hub:session-howto` = `Move: stick/WASD · Pass ✕/J · Shoot □/K (hold) · Lob ○/L · Sprint R2/Shift` (at most 80 characters)
   5. catalogue metas: `hub:source` = `European football`, `hub:type` = `Game`, `hub:genre` = `Sports`, `hub:players` = `1–4`
   6. the page style (from `game/index.html` of the handoff: black, full window, `image-rendering: pixelated`)

   The `<body>` holds the boot splash markup (`E.bootSplash('EUROPHORIA FOOTBALL')`, as `game/index.html` has it) and
   `<canvas id="screen">`, then the engine, mocap, clip set and game scripts. Escape any `</script` inside inlined code
   as `<\/script`. Check for it: the build fails if an inlined file contains `</script`.

### 3.4 Environment notes for this machine

- Other agents share this machine. Work only inside the dev folder and the work root's deliverables. Do not read other
  run folders.
- `/tmp` (a tmpfs) was full during planning, and Claude Code's own temp folder lives there, so command output can be
  lost. Redirect long output to files in the dev folder and read those. Set `TMPDIR` to `<dev folder>/.tmp` for npm,
  git and Playwright.
- Playwright's Chromium may already be installed (`~/.cache/ms-playwright`). Run `npx playwright install chromium`
  only if a test says it is missing.
- Servers: only the hub harness needs one. See §11.6 for the exact way to start it, check it, and stop it by PID.

---

## 4. Architecture

### 4.1 Runtime overview

```
          ┌──────────── controllers (all produce an Intent each step) ────────────┐
          │ HumanController(input, mouseAim)  BotController(teamBrain)            │
          │ RemoteController(net buffer)      ScriptController(attract/training)  │
          └───────────────┬──────────────────────────────────────────────────────┘
                          ▼ Intent per controlled footballer
 ┌───────────────────── Match (simulation, update(dt), world units, seeded RNG) ──────────────────┐
 │ Pitch · Ball · Footballers(10) · Keepers · Referee · Rules (state machine, clock, restarts)    │
 │ Euphoria · SetPieces · TeamBrains(2) · MatchEvents(random) · Stats                             │
 └──────────────┬────────────────────────────────────────────────────────────────────────────────┘
                ▼ typed events on EF.bus (goal, shot, pass, tackle, foul, card, whistle, bounce…)
   Presentation: Camera · Crowd · Commentary · Audio (sfx, music, crowd engine, babble) · HUD ·
                 Replay recorder · Rumble · Stats/Stickers · Network host (forwards events)
                ▼ draw(r)
   MatchView: pitch floor/walls, stands & crowd, goals & nets, actors (rigs), ball, effects, HUD overlay
```

- **The Match is pure simulation.** It reads Intents, moves bodies, applies rules, and emits events. It never reads
  input devices, never plays sounds, never draws. Everything else reacts to its events and reads its state. This one
  rule makes the bots, the attract mode, replays, tests and the network host all work the same way.
- **Animation runs on the presentation side.** Rigs are updated from each footballer's state (`velocity`, `facing`,
  `action`, `actionU`, `pose`), not from input. A client on the network does the same from snapshot state.
- **The fixed step.** The engine runs `update(dt)` at 1/120 s. The sim uses `dt` everywhere and never `Math.random`:
  it uses `match.rng = E.rng(seed)`. Cosmetic randomness (crowd, particles, voices) uses `EF.fxRng`, a separate stream,
  so the same seed and inputs give the same match whatever the presentation does.

### 4.2 Modules (src fragments, in load order)

| File | Holds | Key names it exports (on `EF`) |
|---|---|---|
| `00-core.js` | the namespace `EF`, registries `EF.def/EF.get/EF.all`, the event bus `EF.bus.on/off/emit`, the tuning table `EF.T` and `EF.tune(key)`, RNG streams, small math helpers, deep-link parsing; then, in this order, the `broadcast` View, the `EF.KEYS` preset (§2.2), the `EF.SETTINGS` list (§6.31), and `new E.Game({...})` (§4.7), because the Game reads all three when it is created | `game`, `EF.def`, `EF.bus`, `EF.T`, `EF.tune`, `EF.fxRng`, `EF.KEYS`, `EF.SETTINGS` |
| `01-input.js` | `HumanController`, mouse aim, the euphoria chord, the intent recorder (for tests and attract), touch-only detection | `EF.Intent`, `EF.HumanController`, `EF.touchOnly()` |
| `02-glyphs.js` | glyph icons and `EF.prompt` (§2.3) | `EF.Glyphs`, `EF.prompt` |
| `03-audio.js` | SFX voices, songs, `EF.Crowd` audio (the crowd engine), `EF.Babble` (gibberish voices), `EF.Chant` (sung chants), rumble helpers; all no-ops headless | `EF.sfx`, `EF.music`, `EF.crowdAudio`, `EF.babble` |
| `04-art.js` | palettes, kits as rig colours, ball sprites, card/whistle/flag/glove sprites, crest painter, custom `E.SHAPES` (goal frame, corner flag, dugout, floodlight pylon, team bus, trophy, ad board, camera tower, podium) | `EF.kitColors`, `EF.drawCrest`, `EF.BALLS` |
| `05-anim.js` | the clip library (`Mocap.load(MOCAP.EF)`), `EF.Anim.play(rig, clip, o)`, procedural moves (body tilt recipes, keeper dives, header, bicycle, dive, celebrations), football kick specs | `EF.Anim`, `EF.KICKS` |
| `10-pitch.js` | pitch geometry constants, the TileMap (stands, boards, aprons, nets), floor textures by stadium (stripes, wear, mud, snow, wet sheen, puddles), lines, out-of-play tests | `EF.Pitch`, `P.X0 P.X1 P.Y0 P.Y1 P.CX P.CY P.GH P.BAR` |
| `11-ball.js` | ball physics (Body, surfaces, spin/curl, drag, posts and bar, net, boards), possession and dribble touches, ball trails, super-strike flight paths | `EF.Ball` |
| `12-footballer.js` | the Footballer entity: body, stats, stamina, state machine, action execution (pass, shoot, lob, through, skill, tackle, slide, barge, dive, air moves), contact and knockdowns | `EF.Footballer` |
| `13-keeper.js` | keeper positioning, shot reading, save decisions, dives, catches, parries, punches, distribution, rushing out | `EF.Keeper` |
| `14-team-ai.js` | `TeamBrain` (phase, formation spots, pressing, marking, runs), the ball-carrier decision model, set-piece routines, difficulty | `EF.TeamBrain`, `EF.BotController` |
| `15-rules.js` | the match state machine, the clock (game minutes, stoppage time), restarts, half time, full time, golden goal, shootout bookkeeping | `EF.Rules` |
| `16-referee.js` | the referee character, foul judgement, advantage, cards, theatrics judgement, VAR sequence, referee personalities | `EF.Referee` |
| `17-euphoria.js` | per-team Euphoria, gains and decay, Europhoria, Super Strikes (registry `super`), the Save Duel | `EF.Euphoria`, `EF.SaveDuel` |
| `18-setpieces.js` | kickoff, goal kick, corner, free kick, penalty, shootout controllers and their UIs' state | `EF.SetPiece` |
| `19-crowd.js` | stand layout, fans (sprites, and classic-style rigs in the front rows), crowd mood, crowd animation states, tifo, flares, Mexican wave, the crowd throw-back | `EF.CrowdView`, `EF.mood` |
| `20-events.js` | matchday events (registry `event`): seagull, beach ball, pitch invader, floodlight flicker, flare smoke, drone, fireworks | `EF.MatchEvents` |
| `21-camera.js` | the broadcast camera director (follow, lead, zoom by context, set-piece framing, cinematic moments, replay cameras) | `EF.Camera` |
| `22-replay.js` | the ring-buffer recorder and the replay player | `EF.Replay` |
| `23-commentary.js` | the commentary director (event to line pools, priority, cooldowns, pairs, variables), the radio box, the PA announcer | `EF.Commentary` |
| `24-hud.js` | score bug, clock, Euphoria gauges, name tags, stamina, power meter, reticles, radar, notices, prompts, the Save Duel ring, the fourth official's board | `EF.HUD` |
| `30-ui.js` | the 10-foot UI kit: a screen stack and widgets (Tile, Button, List, Slider, Toggle, Tabs, Card, Pager) with d-pad, stick, keyboard, mouse hover and click | `EF.UI` |
| `31-front.js` | scenes: `title`, `setup` (Kick-About), `penaltysetup`, `album`, `about`; the touch-only notice | scenes |
| `32-cup.js` | scenes: `cup` (bracket and story beat player: tabloid, travel map, talk, team talk, results), `tunnel` (walkout; also the AI Hub card), `ending` (ceremony, parade, credits) | scenes |
| `33-match.js` | scene `match`: builds a Match from options, runs it, MatchView drawing, half time, results overlay; deep-link parts | scene |
| `34-training.js` | scene `training`: drill select, the drill runner (registry `drill`) | scene |
| `40-attract.js` | the idle watcher (10 s on title and menu scenes) and scene `attract` (a scripted showcase, §6.29) | scene |
| `41-devmode.js` | the dev panel (tabs Tune, Cheats, Warp, Info), the pause-menu entry, F1, tuning persistence and reset | `EF.Dev` |
| `42-hub.js` | AI Hub sessions: scene `hubwait` (connecting), connect, card, ready, start, host role (sim, snapshots, events), client role (input, interpolation), server mode, leave, time-up, end, finish, the SESSION SETTINGS overlay | `EF.Hub` |
| `43-saves.js` | the save schema (cup progress, stickers, unlocks, records), `game.saves` hook-up, migrations | `EF.Save` |
| `50-teams.js` | team, formation, tactic and referee data (§7.1) | data |
| `51-stadiums.js` | stadium data (§7.2) | data |
| `52-story.js` | the cup's story beats, tabloids, team talk lines, challenges, stickers (§7.3, §7.5) | data |
| `53-commentary-lines.js` | the commentary line pools (§7.4) | data |
| `54-drills.js` | training drills (§7.6) | data |
| `55-audio-data.js` | songs and chants (§7.8, Appendix D) | data |
| `90-start.js` | `game.debug`, `EF.test` hooks, boot steps, the content validation run, `game.start({...})` | — |

### 4.3 Core contracts

**Intent** (what a controller asks of one footballer for this step):

```js
{ move: [x, y],            // ground direction, length 0..1 (screen direction already turned to ground: view.screenDirToGround)
  aim: [x, y] | null,      // explicit aim (mouse reticle direction) or null (aim with move)
  aimPoint: {x, y} | null, // the reticle's ground point (mouse), for passes to a spot
  sprint: false,
  pass: B, shoot: B, lob: B, through: B, skill: B, sw: B, dive: B,   // B = { down, pressed, released, held (seconds) }
  euphoria: false,         // pressed this step (the key, or the chord)
  target: null }           // a teammate picked by a mouse click, or null
```

Every controller (human, bot, remote, script) returns one. `Footballer.act(intent, dt)` is the only way a footballer
does anything. Tests drive footballers by feeding Intents through `ScriptController`, or by pressing actions on
`game.input` (`input.tap('pass')`, `input.hold('shoot')`) through a `HumanController`.

**Footballer state** (what the presentation, replays and the network read):

```js
{ id, side, role, team, data /* roster entry */, body /* E.Body */, facing, stamina, ctl /* controller */,
  state: 'run' | 'kick' | 'slide' | 'poke' | 'barge' | 'skill' | 'air' | 'down' | 'stunned' | 'celebrate' | 'dive'
       | 'keeper-set' | 'keeper-dive' | 'keeper-hold' | 'off' /* sent off */ | 'setpiece',
  action: null | 'pass' | 'shot' | 'chip' | 'volley' | 'header' | 'bicycle' | 'divingHeader' | 'stepover' | ...,
  actionT, actionU /* 0..1 */, pose, expr, downT, cards: 0..2, sentOff: false, human: playerIndex | null }
```

**Match state** (sim): `{ mode, half, clock /* real s */, minute /* game min */, stoppage, score: [a, b], possession,
lastTouch, euphoria: [a, b], europhoria: { side, t }, setpiece, shootout, cards, stats, rngSeed }`. Modes:
`'kickoff' | 'play' | 'stoppage' | 'setpiece' | 'goal' | 'celebrate' | 'replay' | 'var' | 'halftime' | 'fulltime' |
'extratime' | 'shootout' | 'over'`.

**Events on `EF.bus`.** Each is `{ type, t /* match time */, side, who /* footballer id */, x, y, z, ...data }`. Types:
`kickoff whistle touch pass passDone intercept shot onTarget woodwork save catch parry tip goal ownGoal out corner
goalKick crowdThrow tackleWon tackleFailed slide barge knockdown foul advantage card sendOff dive diveWon diveBooked var
varDecision penaltyAwarded penaltyTaken shootoutKick skill nutmeg rainbow air header volley bicycle euphoriaGain
euphoriaFull europhoria superStrike saveDuel saveDuelResult celebrate replayStart replayEnd half fulltime extraTime
goldenGoal shootoutStart shootoutEnd event stamina`. Listeners: audio, commentary, crowd, camera, HUD, stats, stickers
and challenges, replay markers, hub host, rumble.

### 4.4 Scenes and flow

```
boot ──► (AIHub.active?) ──yes──► hub: connect ─► tunnel (as the hub card) ─► match (session) ─► end screen
   └──no──► title ◄──────────────────────────────── any input ◄── attract (after 10 s idle on title/menus)
             ├─ CUP RUN ──► cup (bracket ▸ beats: tabloid ▸ travel ▸ talk ▸ team talk) ─► tunnel ─► match ─►
             │               cup (result ▸ tabloid ▸ stickers) ─► … ─► final ─► ending (ceremony ▸ parade ▸ credits) ─► title
             ├─ KICK-ABOUT ─► setup ─► tunnel (short) ─► match ─► results ─► setup | title
             ├─ PENALTIES ──► penaltysetup ─► match { shootoutOnly } ─► results
             ├─ TRAINING ───► training (drill list ▸ drill ▸ result)
             ├─ STICKER ALBUM ► album
             ├─ OPTIONS ────► game.menu('settings')
             └─ ABOUT & CREDITS ► about
```

- Gameplay scenes (`match`, `training`) set `pausable: true` (when not in a hub session). Title, menus, cup screens,
  results and the attract mode do not.
- **Deep links** (for tests, `tools/check.mjs` and the dev Warp tab): `#title`, `#attract`, `#setup`, `#match`,
  `#match/<stadiumId>`, `#match/corner`, `#match/freekick`, `#match/penalty`, `#match/shootout`, `#match/super`,
  `#match/duel`, `#cup`, `#cup/r1`…`#cup/r5` (r1 the Qualifying Round … r5 the final; `#cup/final` works too),
  `#ending`, `#training/<drillId>`, `#album`, `#about`, `#dev/anim/<move>` (the animation gallery, §11.7). Queries:
  `?seed=N` (fixes the match RNG), `?touchonly=1` (forces touch-only mode), `?dev=1` (opens the dev panel at start).

### 4.5 Simulation, presentation and network roles

| Role | Runs the Match sim | Reads local input | Draws | Sends |
|---|---|---|---|---|
| Single machine (normal) | yes | yes (1–4 players) | yes | — |
| Hub host with a player | yes | its own player | yes | snapshots and events |
| Hub host as server (`AIHub.server`) | yes | no | no (draws nothing) | snapshots and events |
| Hub client | no: it applies snapshots to a mirror Match used for drawing | its own player | yes | its Intent |

The MatchView and the rig animation code are the same in all four. Only where the state comes from differs.

### 4.6 Registries: the designers' language

`EF.def(kind, id, spec)` registers content; `EF.get(kind, id)` and `EF.all(kind)` read it. Kinds: `team`, `formation`,
`tactic`, `referee`, `stadium`, `super`, `celebration`, `event`, `drill`, `beat`, `lines` (commentary pools), `chant`,
`song`, `sticker`, `challenge`, `ball`, `teamtalk`. Content refers to other content by id only. At boot,
`EF.validate()` checks every reference (a team's stadium, a player's super, a beat's team and photo, a line pool's
speaker) and reports problems through `game.fail` (red box). The test suite runs the same check (§11.3). Adding a team,
a stadium or a cup round means adding entries, not code. Appendix C shows each shape.

### 4.7 The Game object

```js
// first: the Game resolves its view, preset and settings when it is created
E.VIEWS.broadcast = E.VIEWS.broadcast || new E.View('broadcast', 'Broadcast', 0, 40, 1, 1);   // as kits/pinball.js registers its view
const session = !!(window.AIHub && AIHub.active);   // session.js ran first (§3.3), so this is known from the first line
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'broadcast', bg: '#06070c', id: 'europhoria-football',
  input: EF.KEYS,
  corner: !session,                         // the hub has its own corner bar
  menu: {
    settings: EF.SETTINGS,                  // §6.31: defined in sessions too (gameplay reads game.settings)
    controls: { pass: 'Pass / Tackle', shoot: 'Shoot / Slide', lob: 'Lob / Barge', through: 'Through ball / Switch',
                sprint: 'Sprint', skill: 'Skill move', switch: 'Switch / One-two', dive: 'Theatrics', euphoria: 'Europhoria' },
    items: session ? [] : [['Restart match', () => EF.restartMatch()], ['Dev mode', () => EF.Dev.open()]],
    quit: session ? false : 'title', saves: false } });
```

Saves go through `game.saves` from our own menus, not through the pause menu. Theme the engine's standard HTML screens
(pause, settings, controls) to match the game with `new E.Shell(game, { theme: { ink: '#fff6e0', paper: '#0d1430',
accent: '#ffc83a', muted: '#9aa6c8', danger: '#ff5a4a', line: '#2a3a6a' } })`, created once in `00-core.js`.

---

## 5. Engine changes

The engine is ours to change. Keep every change small and marked `// EF:`, and record each one in
`engine/CHANGES-ENGINE.md` (what, where, why). Planned changes:

1. **Dialog voices that babble (`E.Dialog`).** In `Dialog.update` the box calls `this.game.audio.sfx(this.voice)` on
   every second newly shown letter (search for `this._blip++`). Change it so that `voice` may be a function: call
   `voice(ch, index, line)` once for each newly revealed character (including spaces and punctuation, which the
   function uses for pauses). Allow `say(text, { voice })` to set the voice for that call only, and restore it after.
   `EF.babble.voiceFor(speakerId)` returns such a function (§6.22.4).
2. **Shirt patterns and numbers (`E.Humanoid`).** In the shirt branch of the draw code (search for
   `const t = tones(C.cloth), plate = [shL, shR`), after the base fill, draw the kit pattern clipped to the torso plate,
   when `o.kit` is set: `{ pattern: 'hoops' | 'stripes' | 'halves' | 'sash' | 'plain', color2, number, numberColor }`.
   Build hoops as 3 bands: quads from lerps between the shoulder line (shL to shR) and the hip line (hL to hR) at
   fractions .2–.33, .5–.63, .8–.93. Build stripes as 3 vertical bands from lerps across the plate, halves as the
   left half of the plate, and a sash as a diagonal band from shL to hR. Use `px.poly` in `tones(color2).base`, and
   `.sh` on the side away from the light. Draw the number (1 or 2 digits, `E.font` `'tiny'`, `numberColor`) at the
   torso centre when the rig faces away from the camera (`!facingCam`). Sleeves take the shirt colour (they already do
   with `sleeves: 'short'`). Fallback if this proves hard: plain shirts in the main colour with `trim` in `color2`, and
   no numbers.
3. **Whole-body tilt (`E.Humanoid`).** A generalisation of the built-in roll (`_roll(u)`, applied when state `flip` is
   set). Add a state `tilt: { axis: 'forward' | 'right', angle, pivot: 'feet' | 'hips', lift }`. After `solvePose()`,
   rotate every joint in `J` (except `bladeDir`, which only turns) about the pivot by `angle` around the axis in the
   rig's frame `[forward, right, up]`:
   - axis `forward` (a sideways fall: keeper dives, sideways tumbles): `r' = r·cos a + u·sin a`, `u' = −r·sin a + u·cos a`;
   - axis `right` (pitching forward or back: diving headers, bicycle kicks): `f' = f·cos a − u·sin a`, `u' = f·sin a + u·cos a`;

   then raise the whole body by `lift`, and by however much is needed to keep every joint above the floor (as `_roll`
   does). Set `this.mocapTilt = { body: M, head: M }` (the 3×3 rotation, rows forward/right/up) for that step so the
   face, hair and belt details tilt with the body (`_offsets` reads it). Move the cape and hair points for this step
   only and put them back before they simulate, exactly as `_roll` does with `this._unroll`. Keep the built-in `flip`
   untouched.
4. **Named audio buses (`Audio`).** Add `audio.bus(name)`: it returns a `GainNode` (created on first use, connected to
   the master gain) whose volume follows `game.settings[name]` when that setting exists. It returns null when there is
   no audio context (headless, or sound blocked). We use buses `voices` and `crowd`. Also add `audio.now()` (the
   context's `currentTime`, or 0) and expose `audio.noiseBuffer()` (the engine's existing noise buffer), so the crowd
   engine and the babble voice synthesise with the engine's own context, master volume and mute.
5. **Accented capitals in the 5×7 font.** Add glyphs for `É È Á Ó Ü Ö Ä Ñ Ç` and lower-case `é è á ó ü ö ä ñ ç`, drawn
   in the font's style (copy the base letter's bitmap and add the mark in the rows above, for capitals in the
   ascender space). Names and chants use them ("OLÉ!", "ESTADIO PASAPASA"). Until this lands, write them in ASCII; the
   content validator warns about any character the font cannot draw.
6. **Only if needed:** if the standard `glyphs` setting cannot be redefined from the game (§2.3), set
   `STANDARD_SETTINGS.glyphs.value` to `'playstation'` and its options to PlayStation and Xbox.

Do not change anything else without adding it to `CHANGES-ENGINE.md`.

---

## 6. Systems and mechanics

Units are world units (1 tile = 16), seconds and radians. `EF.T.<key>` marks a value tuned live in dev mode
(Appendix A).

### 6.1 Pitch and stadium geometry

- **Field** (inside the lines): length `L = 832` (52 tiles) along x; width `W = 512` (32 tiles) along y. Home side
  (side 0) attacks +x in the first half; the sides swap at half time.
- **Goals:** mouth 96 wide (`GH = 48` either side of `CY`), crossbar `BAR = 36` high, net 30 deep. Posts and bar are
  drawn as white 2-px bars (as the SPORTS kit does with `r.queue`) and collide as cylinders of radius 2.
- **Markings:** halfway line; centre circle radius 64; penalty area 112 deep and 320 wide; goal area 40 deep and 176
  wide; penalty spot 80 from the goal line; penalty arc radius 72 around the spot (outside the box only); corner arcs
  radius 8. Paint them in the floor texture, worn a little (the kit's `line(x, y)` approach, extended).
- **The TileMap** is generated from rows, as the SPORTS kit does. From north to south: the north stand (5 tiers, wall
  heights 34/44/54/64/74; each stadium can change this), the north apron (1 tile), the north boards (`h: 26`), the field,
  the south boards (`h: 26`, `cut: true, cutH: 6`, so they drop low when they would hide play), the south apron
  (2 tiles: dugouts, photographers, the fourth official), the outside. From west to east: the west end stand (4 tiers),
  low end boards (`h: 18`), the goal-end apron (3 tiles: the ball goes out here), the goal and its net floor, the field,
  then the same mirrored. Legend tags: `grass`, `net`, `apron`, `out`, `mud`, `puddle`.
- **The ball and the boards:** the touchline boards bounce the ball (Body vs walls). A ball higher than a board flies
  over it into the stands. The goal-line ends have no boards on the line: a ball that crosses the goal line outside the
  goal is out (§6.11).
- **Out-of-play tests:** `P.crossedGoalLine(ball)`, `P.inGoal(ball)`, `P.overTouchline(ball)`, `P.inBox(side, x, y)`,
  `P.inGoalArea(side, x, y)`. All are unit-tested.

### 6.2 The ball

- `new E.Body({ r: 3, friction: 0, bounce: EF.T.ballBounce /* .55 */, gravity: EF.T.ballGravity /* 600 */ })`, plus our
  fields `spin`, `roll` (for the sprite's turn), `lastTouch`, `trail`.
- **Rolling:** on the ground, `v *= exp(−dt · EF.T.ballFriction · surface)`. Surfaces: grass 1.0, wet 0.7 (it skids),
  hard and dry 0.8, snow 1.7, mud 3.0, puddle 4.0 (stops dead and splashes). In the air: `v *= exp(−dt · .12)`.
  Bounce by surface: grass .55, wet .45, snow .35, mud .2.
- **Curl:** while `|spin| > 0` and the speed is over 20, turn the velocity across its path by `spin · dt` (the kit's
  formula); `spin *= exp(−1.4·dt)`. Aftertouch sets spin (§6.5).
- **Woodwork:** if the ball's centre comes within `3 + 2` of a post's axis (z under `BAR`) or of the bar's axis,
  reflect the normal component with restitution .7. Emit `woodwork` (a "DOINK", and the crowd's "OOOH").
- **Goal:** the ball's centre is past the goal line by more than its radius, `|y − CY| < GH − 3`, and `z < BAR − 3`.
  Then emit `goal` (or `ownGoal` if the last touch was the defending side's), and hand over to Rules.
- **Net:** inside the goal box the ball bounces off the net's sides, back and top with restitution .2 and heavy damping.
  The net mesh (a 7×4 grid of points a side) gets an impulse at the hit point and springs back (k 60, damping 8). Draw
  the mesh as dithered white lines (`px.polyDither`, or lines at 50% blend).
- **Possession:** a loose ball becomes a footballer's when it is within 9 of his feet, `z < 9`, its speed is under
  `EF.T.trapSpeed` (210), and he has no `cool` (0.3 s after he kicked) and no `stun`. A faster ball is trapped only
  within 4.5, and the first touch knocks it 4–10 units away, depending on the player's skill stat. The sprite's
  `roll` advances with speed, and it uses 4 frames, not 2.
- **Dribble touches:** the owned ball sits ahead of the feet: offset `7 + 2·sin(stridePhase)` when running, `10–14`
  when sprinting (a knock-on gap a poke can reach), `5` when standing. A turn of more than 100° within 0.2 s slows the
  owner to ×0.7 for 0.2 s.
- **Super-strike paths** (registry `super`, §6.9): a ball with `superPath` set ignores friction and spin and follows
  its path function for its flight. Paths: `wobble` (a sine across the path), `zigzag` (3 sharp turns), `hammer` (hits
  the ground 3 times, shaking the screen, and keeps its speed), `meteor` (straight up off-screen, then down onto the
  goal), `around` (steers round every body in front of it), `split` (3 balls; only one is real; the decoys burst into
  confetti at the goal line), `rocket` (straight, with flames: the team super for non-captains).

### 6.3 Footballers: movement, stamina, dribbling

- Body: `new E.Body({ r: 5, friction: 0, gravity: 700 })`. Rig: an HD `E.Humanoid({ weapon: null, size, build, hair,
  hat, colors, kit })` (§8.1).
- **Speed:** `run = EF.T.runSpeed (88) × (0.85 + 0.3 × pace/100)`. Sprint ×`EF.T.sprintMul` (1.45); ×1.35 with the
  ball. Acceleration `EF.T.accel` (900). Turn rate: 14 rad/s without the ball, 9 with it (`E.approachAng`, as the kit
  does).
- **Stamina** (0–100): sprinting drains `EF.T.staminaDrain` (20/s). It regains `EF.T.staminaRegen` (14/s) after 0.5 s
  without sprinting. Below 25 the sprint multiplier is only 1.15 and the player's tag shows a sweat drop. At stoppages a
  tired player puts his hands on his knees (§8.3).
- **Stats** (0–100): `pace, shoot, pass, tackle, skill, keep, weight, temper`. `temper` drives the AI's foul and dive
  tendency.
- **Sent off:** state `off`. He walks to the tunnel and leaves the match. The team plays on with 3 outfield players,
  and its formation drops the role marked `drop` in the formation spec.

### 6.4 Passing

- **Choosing the receiver:** candidates are the teammates except the passer (the keeper only when the stick points
  back toward his own goal). The direction is `intent.aim || intent.move || facing`. Score each candidate by
  `cos(angle between direction and candidate)` (it must be under the pass-assist cone: Off 20°, Low 35°, High 70°;
  `EF.T.passAssistDeg` sets High), minus `distance/1200`, plus `0.15 × openness`. Openness is
  `min(1, nearest opponent's distance / 40)`. With no candidate in the cone, the pass goes along the direction into
  space. A mouse click on a teammate (`intent.target`) overrides all of this.
- **Ground pass:** speed `clamp(d · 1.5 + 90, EF.T.passSpeedMin /*150*/, EF.T.passSpeedMax /*300*/)`. It leads the
  receiver: aim at `receiver + receiver.v · (d / speed) · 0.8`. The pass stat adds an angle error with σ = `(100 −
  pass)/100 · 0.06` rad, doubled if an opponent is within 12 of the passer.
- **Through ball (`through` with the ball):** aim 50–90 units ahead of the receiver along his run (forwards make the
  run as the pass is played), at a speed that arrives as he does. It lands well in space or is intercepted.
- **Lob / cross (`lob`):** `E.arc(from, to, gravity, { apex })` lands at the receiver's led position. Apex 30 when
  short, 55 when longer than 250. From a wide position in the final third (more than 150 from the centre line, within
  250 of the goal line) it is a cross to the penalty spot area, or to the teammate nearest it. The receiver then
  attacks the ball in the air (§6.5).
- **One-two (`switch` held + `pass`):** control stays with the passer. He runs on toward goal while the receiver plays
  the ball first time into his path 0.35 s after he receives it. The passer must be within 220 of the receiver.
- **Interceptions:** an opponent within 6 of a moving ball (z < 9) takes it if his tackle stat allows, else deflects
  it (with a speed loss, at a random angle up to 45°). Keepers in their box catch passes too.
- **Events:** `pass` (with `to`), `passDone` when a teammate receives it, `intercept`.

### 6.5 Shooting, air moves

- **Charge:** hold `shoot`; the meter fills over `EF.T.shotChargeTime` (0.8 s); release to shoot. Power `p` is 0..1.
  Speed `= 180 + p · (EF.T.shotSpeedMax /*420*/ − 180)`. Lift `vz = 25 + p · 90`. If `p > 0.95`, add a 50% chance of
  `vz + 40` (blazed over the bar).
- **Sweet spot:** releasing at `p` in 0.78–0.90 gives a **Screamer**: speed ×1.15, a white streak trail, a hit-stop of
  0.05 s, and the keeper's save rating ×0.75. The meter shows the zone in gold.
- **Aim:** the stick's component across the goal (screen up and down) picks the target y: `CY + aimY · (GH − 6)`. With
  no stick and shot assist on, the target is the corner farther from the keeper. Mouse aim: the target y is the
  reticle's y, clamped to the mouth. Accuracy error: σ = `(100 − shoot)/100 · 0.08`, plus 0.04 under pressure, plus
  0.05 when shooting across the body (more than 100° from facing). The error is drawn from `match.rng`.
- **Aftertouch curl:** for 0.4 s after the kick, stick input across the ball's path adds spin, up to ±1.6
  (`EF.T.curlStrength` 3.2 per second, the kit's formula). Emit `curl` once per shot (for training and stats).
- **Chip:** `lob` with the ball within 160 of goal while the keeper is more than 24 off his line: `E.arc` lands just
  under the bar behind the keeper (apex 45).
- **Air moves:** each step, predict the ball's path for the next 0.6 s. If a controlled player can reach a point on it
  where the ball is between z 6 and 40 (the **air-ball window**), the HUD shows the move's prompt. Pressing `shoot`
  (finish at goal) or `pass` (cushion it to a teammate) does:

  | Ball height at contact | Condition | Move | Ball speed out |
  |---|---|---|---|
  | 22–40 | facing goal (within 110°) | **header** (a jump if z > 28) | 220–300 |
  | 22–40 | facing away from goal (more than 110°) | **bicycle kick** (slow motion 0.35× for 0.4 s) | 380–460 |
  | 8–22 | any | **volley** (a side volley if the ball comes from the side) | 300–420 |
  | 4–14 | sprinting, the ball crossing in front | **diving header** | 260–320 |

  Contact happens at the move's active phase. The player's body is steered to meet the predicted point (a short dash
  of up to 40 units). Quality: the closer the contact point to the ideal, the less aim error. Events: `air`, `header`,
  `volley`, `bicycle`. CPU players use the same rules.
- **Events:** `shot` (power, sweet, target), `onTarget` (when the predicted crossing point is inside the frame).

### 6.6 Skill moves (`skill`)

| Input | Move | Effect | Euphoria |
|---|---|---|---|
| R1 + stick sideways | **step-over** (0.35 s) | a defender within 20 in front is wrong-footed with chance `0.35 + 0.5·(skill − his tackle)/100` (at least .15, at most .9): he stumbles (stunned 0.4 s) and you burst 12 sideways | +8 |
| R1 with a defender straight ahead within 16 | **nutmeg** | the ball goes through his legs and you run round him; chance `0.45 + 0.4·skill/100`; on failure he takes the ball | +12, an "OLÉ!" from the crowd |
| R1 + stick back | **spin turn** (0.45 s, `rig.spin` 2π) | you keep the ball and cannot be tackled for 0.2 s in the middle of it | +6 |
| R1 twice within 0.3 s | **rainbow flick** | the ball goes over your head forward (vz 110, 60 forward); a defender within 24 in front is beaten (stunned 0.6 s) | +12 |
| R1 + stick forward, nobody close | **knock-on** | the ball is pushed 40 ahead and you sprint onto it | +2 |

Skill moves cost 8 stamina and have a 0.6 s cooldown. Events: `skill` (with its kind), `nutmeg`, `rainbow`.

### 6.7 Defending

- **Standing tackle / poke** (`pass` without the ball): 0.25 s; the toe reaches 9 (`EF.T.tackleReach`). It wins the
  ball if the ball is within reach and on the near side of the carrier. A miss costs 0.3 s of recovery. If it touches
  the carrier's body and not the ball, it is a light foul candidate.
- **Slide tackle** (`shoot` without the ball): a slide at `EF.T.slideSpeed` (190), decaying with `exp(−3·dt)`, over
  0.45 s. The hitbox is a capsule along the feet (length 12, radius 4). Ball first: the ball shoots off in the slide's
  direction at 150, and the tackle is fair. Man first: a foul candidate (§6.10), and the victim is **launched**: an OTT
  cartwheel (0.6 s in the air, `vz` 120, spinning with a tilt about the forward axis, stars) before he hits the ground
  (state `down`, 0.9–1.4 s). The slider gets up after 0.6 s.
- **Shoulder barge** (`lob` without the ball): a 0.3 s lunge; its hitbox is a circle of radius 7 at the shoulder. Hit
  the carrier side-on: if `weight + rng·30 > his weight + rng·30` he stumbles and loses the ball; else you bounce off.
  From behind it is a foul candidate.
- **Switching:** `switch` or `through` (without the ball) switches to the teammate nearest the ball; pressing again
  takes the next nearest. Settings → Game → Switching: **Auto** (switches by itself on a loss of possession and when a
  pass reaches a teammate), **Assisted** (the default: Auto, but never while you hold sprint), **Manual**. A mouse click
  on a teammate while defending switches to him.
- **Knockdowns:** a foul, a heavy barge, a super strike through a body, or a collision at a closing speed over 220
  knocks the victim down: state `down` for `downT` (0.8–1.4 s), then he gets up (§8.3). Emit `knockdown`. Use
  `game.hitFx` at the contact point with `power` by severity (it gives hit-stop, shake, a star, sparks and rumble).

### 6.8 Goalkeepers

- **Positioning:** on the bisector of the angle from the ball to the two posts, at distance
  `clamp(8 + (400 − ballDist) · 0.06, 6, 36)` from the goal line. He shuffles sideways (facing the ball), crouched in
  the set pose when the ball is within 200. He comes out to **rush** a carrier who is through on goal (within 120, no
  defender between) and **smothers** at his feet (a low forward dive).
- **Reading a shot:** on `shot`, predict where the ball crosses the goal line (y, z) and when (`tCross`). After his
  reaction time (`EF.T.keeperReaction`, 0.18 s, ±40% by the keep stat and difficulty, ×1.3 against Screamers), he
  moves or dives toward the point. Reach: the dive covers `EF.T.keeperReach` (48) laterally in 0.35 s, plus 12 of arm
  reach (in z: 0–40 on a high dive).
- **Outcome** when he gets there: `q` = how well he reached it (0..1), times the shot speed factor (`1 − (speed − 200)/400`,
  at least .2), times keep/100. If `q > .7` and the speed is under 260, a **catch** (he holds it: state `keeper-hold`).
  Else if `q > .35`, a **parry** (the ball rebounds at 40–60% speed, away from the goal centre, so rebounds happen) or
  a **tip** round the post or over the bar (a high ball near the frame becomes a corner). Else a goal.
- **Distribution:** hold up to 2 s (the human side waits for ✕ throw / □ long kick, then the AI decides). Throw:
  E.arc to the open teammate nearest the keeper (an underarm roll if he is within 120). Long kick: E.arc 300–450 toward
  the most advanced teammate (route-one teams always kick long). Opponents must stay 60 away while he holds it.
- **Animation:** the set stance; side shuffles; the dive (tilt about the forward axis ±70–95°, lifted 2 on a low dive
  and 14 on a high dive, arms over the head with IK to the ball); the catch (hands to the chest); the parry (`jab`);
  the tip (one arm up); the get-up; the throw (`OverhandThrow`), §8.3.

### 6.9 Euphoria, Europhoria, Super Strikes, the Save Duel

**Euphoria** is each side's crowd, 0–100, drawn as the "EUPHORIA" gauge under the team's name in the score bug, in 3
segments.

| Event | Euphoria (× `EF.T.euphoriaGain` and the team's crowd factor) |
|---|---|
| a completed pass | +2, +1 more for each pass in an unbroken chain (at most +8 a pass) |
| a successful skill move | +6 to +12 (§6.6) |
| a tackle that wins the ball | +6; a slide that wins it cleanly +8 |
| a shot on target | +5; the woodwork +7; a Screamer +4 more |
| a save (the keeper's side) | +6; a catch from a Screamer +10 |
| a goal | +35 to the scorer's side; −10 to the other |
| a celebration picked in time (§6.21) | +5 to +15 by the celebration |
| a dive that wins a foul | +5; a dive that gets booked −20 (the crowd boos) |
| decay | −`EF.T.euphoriaDecay` (1.5) per second when above 0 and not in Europhoria |

- **Thresholds:** 34 (stamina regenerates 25% faster), 67 (shots charge 20% faster; the fans wave their scarves and
  sing), 100 (**EUROPHORIA READY**: the gauge flashes, the prompt "L1+R1 EUROPHORIA!" shows, the tifo is held ready).
- **Europhoria** (press `euphoria` when full): `EF.T.europhoriaTime` (8 s of game time; it keeps counting through
  stoppages and slows with slow motion). The
  side gets speed +12%, free sprinting, a tackle reach of +25%, and the keeper +30% reach. The music's Europhoria layer
  comes in, the side's fans light flares and unfurl the tifo, the LED boards turn to the team's colours, and the
  side's players glow faintly (emissive outline). One **Super Strike** is unlocked for the side during Europhoria. The
  gauge drains to 0 over the duration. Emit `europhoria`.
- **Super Strike:** during Europhoria, any shot charged to `p ≥ 0.9` becomes a super strike. The captain's is his own
  (registry `super`, §7.1); any other player's is the team super `rocket`. The sequence: 0.6 s of charge-up (the
  shooter rises 6, the camera zooms to 1.4, time slows to 0.3×, a radial burst, the super's name in big letters), then
  the strike at `EF.T.superSpeed` (520) along its path. The keeper cannot save it normally:
  - **Save Duel** (the defending side has a human): a timing ring shrinks around the keeper (1.0 s, at real speed even
    though the game is in slow motion: count it in unscaled time, `dt / game.timeScale`, so tests stay exact) toward a
    target circle, with the glyph of `pass` (✕). Press within ±60 ms of
    the target for **PERFECT** (a catch: Euphoria +15 for the defenders, the crowd erupts). Within ±140 ms gives
    **GOOD** (a parry: the ball spins away). Otherwise **MISS** (a goal: the keeper and the ball go into the net
    together, OTT). Several human defenders: the one controlling the player nearest the keeper takes the duel.
  - CPU keeper against a human's super: save chance Easy 15%, Normal 30%, Hard 45%, Europhoric 55%. The outcome is
    shown with the same animations.
- Events: `euphoriaGain`, `euphoriaFull`, `europhoria`, `superStrike`, `saveDuel`, `saveDuelResult`.

### 6.10 The referee, fouls, advantage, cards, theatrics, VAR

- **The referee** is a Humanoid on the pitch (black kit, a whistle sprite). He follows play 60–90 from the ball,
  stays out of passing lanes, and is a Body the ball can hit (he falls over comically: `down` and an "OOOH"). He has a
  personality (registry `referee`): `strictness` (0.6–1.4), `gullibility` (how often he buys dives, 0.2–0.7),
  `varHappy` (0–1), `voice`.
- **Foul judgement:** on a tackle, slide or barge contact with a body before the ball (or with no ball near), compute
  `severity = closingSpeed/150 × (fromBehind ? 1.5 : 1) × (late ? 1.4 : 1) × (slide ? 1.2 : 1)`. `fromBehind`: the
  tackler is more than 120° from the victim's facing. `late`: the victim had passed more than 0.4 s earlier. It is a
  foul if `k = severity × strictness × EF.T.foulStrictness` is over 0.5. Cards on the same `k`: a yellow above 1.3, a
  straight red above 2.4, and a second yellow is a red. Settings → Game → Cards: Off (fouls, no cards) / Normal /
  Strict (`k` ×1.3).
- **Advantage:** if the fouled side still has the ball 0.8 s after the foul, show "ADVANTAGE!" (the referee's arms
  forward) and play on. Any card waits for the next stoppage ("the referee will come back to that").
- **Restart:** a direct free kick where the foul happened; a penalty if a defender fouls inside his own box. The
  referee's whistle, the jog over, the card (he raises it high: §8.3), the player's protest (`Angry` or `Shrug` clip).
  The crowd boos the card.
- **Theatrics (`dive`):** the player flops theatrically (§8.3). The referee judges:
  - if an opponent touched him (any contact within the last 0.5 s), or an opponent is within 8 and closing: it is a
    foul with chance `gullibility × (1.2 − d/14)` (at least .1), else play on;
  - if no opponent is within 14 and there was no contact in 0.5 s: **SIMULATION!**, a yellow card for the diver, the
    crowd boos, Euphoria −20.

  The diver is down for 1.2 s either way. AC Lucchetto's AI dives in the box on purpose.
- **VAR:** checks every penalty award, and goals scored within 3 s of an unpunished foul in the build-up (with
  `varHappy` chance). The sequence (2.5 s): "VAR CHECK" in a TV-style lower third, the referee holds a hand to his ear,
  the crowd hums, beeps play. Then the decision: on a penalty with a "soft" foul (severity under 0.8), it is
  overturned with 50% chance (the referee draws a TV rectangle with both hands: "NO PENALTY"). Otherwise
  "PENALTY STANDS" or "GOAL STANDS". The clock stops during VAR. Events: `var`, `varDecision`.

### 6.11 Set pieces and restarts

Each restart is a `SetPiece` controller with the steps setup (place the players, 0.6–1.2 s) → aim (a human taker
gets up to 6 s, then auto) → take → play. The match mode is `setpiece` while it runs.

- **Kickoff:** the kicking side's two forwards stand in the centre circle, everyone else in their own half; the
  opponents stay out of the circle until the ball is played (the kit's `kickHold`, 2.5 s). The whistle, then ✕ passes.
- **Goal kick** (the ball over the goal line, last touched by the attackers): the keeper places it at the edge of the
  goal area; opponents leave the box. A human side: ✕ short pass (stick picks the target) or ○ long (E.arc toward the
  stick's direction, 300–420).
- **Corner** (over the goal line, last touched by the defenders, including keeper tips): the nearest attacker jogs to
  the corner flag. A human taker moves a ground ring (the target) inside the box with the stick for up to 4 s, then
  presses ○ or ✕ to cross it there (E.arc with apex 55, curling in- or out-swinging by the stick's side at release), or
  □ for a short corner pass to the nearest teammate. Attackers run to the near post, the far post, the penalty spot and
  the edge of the box (for a volley). Defenders mark goal-side. When the ball is in the air the human gets the
  attacker nearest the ring (auto-switch), and the air-ball prompt shows (§6.5).
- **Free kick** (a foul outside the box): within 320 of goal it can be shot. A wall of 2 defenders stands 40 from the
  ball and jumps (`z` +10 for 0.35 s) when the shot is taken. The human aims a reticle across the goal frame (the stick
  moves it in y and z), holds □ for power and releases, then curls with the stick (aftertouch). ✕ passes and ○ lobs
  instead. Farther out: pass, lob or shoot as in open play.
- **Penalty:** the taker stands at the spot and the keeper on his line. The taker aims a cursor over 6 zones (top or
  bottom × left, centre or right) and holds □ for power: below 0.2 aimed centre is a **Panenka** (a slow chip down the
  middle); 0.2–0.9 places it; above 0.9 is a blast with a 25% chance of going over. A human keeper picks a dive
  direction with the stick and presses ✕ at or just before the kick: diving early (more than 0.25 s before) shows it,
  and the CPU taker may change sides. A CPU keeper guesses with weights from difficulty and the taker's habit. Shots
  are saved, hit the post, go over or score by the keeper rules (§6.8) with the dive committed.
- **Crowd throw-back** (instead of throw-ins): a ball that flies over the touchline boards into the stands is thrown
  back by a fan (an arc from the front row) to the nearest player of the side that did not kick it out. The banner:
  "INTO THE CROWD!" Emit `crowdThrow`.

### 6.12 Match flow, clock, extra time, shootouts

- **The clock:** `EF.T.halfLength` (Settings: 1:30 / 2:00 / 3:00 / 4:00 real time per half; 2:00 by default) maps to
  45 game minutes. The score bug shows game minutes (`37'`). The clock runs in `play` and `setpiece`, and stops for
  goals, celebrations, replays, VAR, cards and half time.
- **Stoppage time:** add 1 game minute for every 12 real-time seconds the clock was stopped in the half (goals,
  celebrations, replays, VAR, cards, knockdowns over 1.5 s), at least 1 and at most 5. At 44' the
  fourth official holds up his LED board ("+3") on the south apron, with a HUD notice. The half ends at 45 + stoppage,
  at the first moment the ball is not in a dangerous attack (not in either final third), or 15 s of game time later at
  most.
- **Half time:** a 4 s overlay: the score, two big stats (shots, possession), a commentary pair. The sides swap
  ends. The second half's kickoff goes to the side that did not kick off the first.
- **Full time:** the three-blast whistle and the results (§6.23). In a **cup tie** a draw goes to **golden-goal extra
  time** (60 real seconds, shown as 91'–105'), then to a **penalty shootout**. In Kick-About: Settings → Draws: Allowed
  (the default) / Golden goal / Penalties.
- **Shootout:** 5 kicks each, alternating, then sudden death. It ends early when one side cannot be caught. The HUD
  shows a row of ✓/✗ dots per side. Takers go through the roster in order (keepers last). The camera sits behind the
  taker. The crowd's tension music: a heartbeat under a held chord (§6.22).

### 6.13 Team AI, tactics and difficulty

**TeamBrain** (one per side), each step:

1. **Phase:** `attack` when the side has the ball, `defend` when the other side has it, `transition` for 1 s after a
   change, `loose` when nobody has it (the 2 nearest chase it).
2. **Formation spots** (registry `formation`). Each role has `base [u, v]`, `att [du, dv]`, `def [du, dv]`,
   `pull [ku, kv]` and `uRange`. `u` runs from the side's own goal line (0) to the opponent's (1); `v` runs across the
   pitch from the north touchline (0) to the south (1). Spot = `base + (phase is attack ? att : def) + pull ⊙ (ballUV
   − [.5, .5])`, with `u` clamped to `uRange`. Tactics then shift it: defenders' `u += (line − .5) · .2`;
   `v = .5 + (v − .5) · width`. Convert to world x, y by the side's direction.
3. **Pressing:** the nearest `pressers` (1, or 2 for high-press teams) go at the carrier when he is within the press
   zone (`u_ball > 1 − press`, in the defending side's frame). They tackle when within reach with probability
   `aggression × 3` per second (a poke), or slide when he is going past within 30 (`aggression × .8` per second;
   `temper` adds from-behind attempts). The others mark the opponent nearest their spot, standing 35% of the way from
   him toward the ball (covering the lane).
4. **The ball carrier** decides every `EF.T.aiReaction` seconds (0.25, scaled by difficulty) by utility:
   - `shoot = clamp(1 − d/shootRange, 0, 1) × openAngle × (1 − .3·blockers) × (europhoria ? 1.5 : 1) × shootBias`;
   - `pass(t) = laneClear(t) × openness(t) × (.4 + .6·progress(t)) × (short ? shortBias : 1) × (1 − risk(t)·(1 − passRisk))`,
     where `laneClear` comes from the distance of opponents to the pass segment (the kit's `segDist`);
   - `through`, `lob`/cross (wide in the final third with teammates in the box, `× longBall`), `dribble`
     (`space ahead / 80 × dribble`), `skill` (a defender in front: `skill × stat`), `dive` (in the box with a defender
     close: `dive × temper`);
   - pick the best, plus noise with σ = `(1 − EF.T.aiAccuracy) × .3`. A CPU **shot** holds `shoot` until its chosen
     power, as the kit's `brain()` does.
5. **Runs:** when a teammate has the ball in midfield, the forward farthest from the ball runs in behind if the space
   is there; after a one-two pass the passer runs on; attackers attack crosses (§6.11).
6. **Keeper:** §6.8.
7. **Euphoria use:** the CPU triggers Europhoria when full and in the attacking half, or as the team's gimmick says.

**Difficulty** (Settings → Game → Difficulty):

| | Easy | Normal | Hard | Europhoric |
|---|---|---|---|---|
| `aiReaction` (s) | .38 | .25 | .16 | .10 |
| `aiAccuracy` | .60 | .80 | .90 | .97 |
| `aiAggression` | .30 | .50 | .70 | .85 |
| CPU keeper reaction (s) | .26 | .19 | .15 | .12 |
| CPU Euphoria gain | ×.8 | ×1 | ×1.15 | ×1.3 |

**Tactic profiles** (registry `tactic`): numbers `press, pressers, line, width, tempo, passRisk, shortBias, longBall,
dribble, skill, shootRange, shootBias, foul, dive, euphoriaUse` and a `gimmick` id. The gimmicks:

- `routeone` (Hoofington): the keeper always kicks long; 60% of their passes are lobs toward the striker; their
  defenders head every high ball away.
- `keepball` (Pasapasa): short passes, ×2 preference for a pass back when pressed; they keep the ball rather than
  shoot until the pass chain reaches 4.
- `gegenpress` (Stahlpresse): for 3 s after losing the ball, 3 players swarm the carrier; high line; tempo 1.
- `catenaccio` (Lucchetto): line .15, 3 defenders; counterattacks with long passes; fouls (`foul .6`); dives
  (`dive .5`); **the bus**: when leading after 60', a team bus (a solid 18 deep and 60 wide (y), 30 high, a `map.solid`
  of the `team-bus` shape) drives on in front of their goal, covering the middle 60% of the mouth. Shots must go round
  it, be chipped over it (under the 36 bar), or be a super strike, which smashes it (the windows break, the bus drives
  off, Euphoria +10). The commentary goes wild: "They've LITERALLY parked the bus!"
- `galacticos` (Opulence): dribble .7 and skill .8; Euphoria gain ×1.3 ("they hand out clappers"). Their captain's
  **Golden Moment**: at 80', if they are behind or level, Europhoria triggers by itself.

### 6.14 Camera

- **Broadcast view** (`'broadcast'`, pitch 40°). The scene sets `camera: { zoom: [.8, 1.8], start: 1.25 }`. At 1.25
  on a 16:9 screen (427×240 game pixels) it shows about 340 units of the pitch's length and 300 of its width. The
  player can zoom with the wheel, `-` and `=`, and Settings.
- **The director** (`game.focus` every update; not `follow`): focus = the ball + 0.3 s of its velocity, pulled 25%
  toward the human's controlled player. It is smoothed by `cam.smooth` (.15) and kept in `cam.bounds`. Its height is
  `ball.z × .4`, so lofted balls stay framed.
- **Context zoom** (eased with `game.setZoom` through a tween): set pieces 1.4 on the taker, then 1.25; corners frame
  the box (`cam.frame`, zoom .9–1.25); a super strike 1.4 on the shooter, then follow; goals 1.5 on the scorer for the
  celebration; the shootout 1.5 behind the taker.
- **Cinematics:** `game.timeScale` slow motion (0.3) for super strikes, bicycle kicks and Save Duels; hit-stop
  (`game.freeze`) for big tackles and Screamers; shake (`game.shake`) for woodwork, the hammer super and fireworks;
  flashes (`game.flash`) for goals and Europhoria. All of them already respect the comfort settings.
- **Alternative cameras** (Settings → Game → Camera): Broadcast (default), Classic (`'threequarter'`), Aerial
  (`'topdown'`). The scene's `views` lists all three; `V` cycles them in dev builds. Every view must look right
  (§11.7).
- **Replay cameras:** `game.rotateView(±45)` around the action, and a low "pitchside" custom view (pitch 20°).

### 6.15 Action replay

- **Recorder:** a ring buffer of the last 8 s at 60 Hz (every other step) of the ball (x, y, z, roll, super path
  state), each footballer, the referee and any event actor: x, y, z, vx, vy, facing, state, action, actionU, pose,
  expr, tilt, downW, mocap clip id and time, glow. It also records sound cues: each `touch`, `shot`, `woodwork` and
  `goal` event with its time.
- **Player:** on `goal` (when Settings → Replays is On), after the celebration it plays from 4.5 s before the goal to
  0.8 s after, at 0.5× speed, from a turned camera (rotate ±45°, zoom 1.4, tracking the ball). The rigs are driven
  from the recorded states through `rig.update` (gait comes from velocity). A "REPLAY" tag, scanlines (an overlay),
  and the recorded sounds replayed at 0.5× pitch. A commentary line ("Let's see that again…"). ✕, Enter or a click
  skips it. The jumbotron in the Euphorium shows "REPLAY" too.
- Replays are skipped in hub sessions (§6.28). The attract mode uses them (§6.29).

### 6.16 HUD (10-foot)

Drawn in `r.overlay` in game pixels, anchored to `r.W` and `r.H`. It keeps clear of `game.cornerArea()` and inside a
5% safe margin (TVs overscan).

- **Score bug** (top left): the two crests (12 px), the 3-letter codes, the score in large type, the clock
  (`37'`, `45+2'`; "ET", "PENS"), each team's Euphoria gauge (3 segments), and a red card icon per player sent off.
- **Name tags:** a triangle in the player's colour (`E.PLAYER_COLORS`) over each human-controlled footballer, with the
  name (font scale 1) and a stamina bar that shows only below 60. CPU-only matches (attract) show the ball carrier's
  name.
- **Power meter** over the shooter: the fill, the gold sweet spot, a pulse at full.
- **Reticles:** the corner ring, the free-kick reticle across the goal, the penalty cursor, the mouse aim reticle.
- **Radar** (top right, under the corner area; Settings → Radar): the pitch at 1/9 scale, team dots in kit colours
  plus a shape per side (circle home, square away, so colour is not the only cue), the ball in white, humans with a
  ring.
- **Notices** in the centre (`E.font.title`, a scale-4 gradient): KICK OFF, GOAL!, HALF TIME, FULL TIME, ADVANTAGE!,
  YELLOW CARD (with the player's name), RED CARD, VAR CHECK, SIMULATION!, INTO THE CROWD!, EUROPHORIA!, the super's
  name, PERFECT / GOOD / MISS.
- **Commentary box** (bottom centre): an `E.Dialog` radio box (`modal: false, auto`), 2 lines, with Barry's or Trev's
  live portrait.
- **Prompts:** §2.3.
- **Save Duel ring:** around the keeper in world space (an `r.queue` emissive ring), with the glyph.
- **Off-screen arrows** at the screen's edges for the ball and for human-controlled players.

### 6.17 Commentary

- **Commentators:** BARRY BELLOW (play-by-play: excitable, shouty, puns) and TREV BRICKLEY (co-commentator, an
  ex-centre-half: deadpan, dry, practical). Each is a portrait rig (a Humanoid with a headset) and a babble voice.
- **Director:** it listens to events. Each event type maps to a line pool (registry `lines`). A pool entry is
  `{ who, text, reply?, when? }`: `when` is a condition on the match (score state, minute, side, streaks, weather,
  stadium); `reply` is the partner's answer, said straight after. Rules:
  - priorities: goal 100, super 95, saveDuel 90, red card 85, penalty 80, woodwork 70, card 65, VAR 60, dive 55,
    save 50, near miss 45, bicycle and header goals 45, skill 30, tackle 25, generic 10;
  - each event type has an 8 s cooldown; at least 3.5 s between lines; a higher priority interrupts a lower one;
  - no line repeats within a match (keep the used ids);
  - variables `{$player}`, `{$team}`, `{$opp}`, `{$score}`, `{$minute}`, `{$stadium}`, `{$keeper}`, `{$ref}` through
    `Dialog`'s `vars`;
  - idle chatter (weather, the stadium, the cup, banter pairs) when nothing has been said for 12 s.
- **Display:** the radio box. **Voice:** the babble voice reads the line as gibberish (§6.22.4); Settings → Commentary
  On/Off (subtitles stay with voices off: Settings → Voices volume).
- **PA announcer** (the stadium's voice: "ding-dong" chime, echoing babble, text at the top of the screen):
  attendance, goal scorers, substitution-style jokes ("Would the owner of a minibus with three wheels…").

### 6.18 Crowd

- **Layout:** the stands from the TileMap tiers. Fans are spaced 6–8 units apart along each tier; each stadium sets a
  density, so a stadium has 400–1,600 fans. Each end (and part of the long stand) belongs to a side: the home end,
  the away end (smaller), and a mixed main stand.
- **Fans:** pixel sprites drawn by code (`r.queue`): 3 frames (idle, arms up, jump) × 4 kinds (plain, scarf, flag,
  drummer), palette-swapped per side (shirt in the kit colours, skin, hair). The front row of each stand is
  `E.Humanoid({ style: 'classic', size: .9 })` rigs drawn with `every: 3`, so they cheer, wave and boo with real poses.
- **Mood** (per side, 0..1, smoothed): it rises with danger (the ball in the final third, shots), spikes on goals,
  dips on conceding. **States** set the animation: idle bob; tense (they lean in when a shot is coming); **jump**
  (goal, save, super); despair (hands on heads after a miss); **boo** (thumbs down after dives and cards); **scarf
  wall** (Euphoria ≥ 67: scarves held up, swaying to the chant); **Mexican wave** (Euphoria ≥ 67 and 2 goals up: a
  phase sweeping round the stands); **Europhoria** (flares in the front rows: fire, smoke and red light; the tifo,
  §8.2, unrolls over the side's end: scrolled in over 1 s, held, rolled away at the end).
- **The crowd throw-back:** §6.11.

### 6.19 Weather, pitch condition, lighting

- **Rain** (`game.weather = { kind: 'rain', amount, wind }`): the floor texture gets a wet sheen and puddles (tag
  `puddle`: the ball stops and splashes); the surface is "wet" (§6.2); slides go 25% farther; players kick up spray.
- **Snow:** `kind: 'snow'`; snowy floor (the lines cleared and brushed); surface "snow"; the **orange ball** is
  automatic; footprints as fading decals.
- **Sun:** the hard dry surface; a heat shimmer over the far stand (dithered offset bands); bright light, high ambient.
- **Fog** (Lucchetto, second half): a custom overlay of dithered layers that thickens with distance from the camera's
  focus. The radar matters more in fog.
- **Night and dusk:** `game.lights.enabled = true`, ambient .45 (night) or .6 (dusk). Four floodlight pylons (§8.2) at
  the corners, each `game.lights.add(x, y, 220, 520, .9, { color: '#fff0d0' })`. Lamp glow on the pylons
  (emissive). Where WebGPU is available, `game.enableGPU({ map })` adds shadows; it falls back to canvas lighting by
  itself. Set both ambients so they match (`gpu.ambient`, `lights.ambient`), as the ADVENTURE kit does.
- **Wind** (the Smokehouse): lofted balls drift `wind × 20` units/s across.

### 6.20 Matchday events

Registry `event`: `{ stadiums, chance, when: { minute: [a, b], ballLoose, notSetPiece }, start(match), update(match, dt),
done(match), line }`. At most one per half; none during set pieces or the last 5 game minutes. Everything they do goes
through `match.rng`, so a seed replays them.

1. **Seagull** (the Smokehouse): a white `E.Blob({ wings: true })` lands on a loose, slow ball. The ball is pinned
   until a player runs within 10 (the gull flaps away with a squawk). The commentary has fun with it.
2. **Beach ball** (Pasapasa): a fan throws a big beach ball onto the pitch (a Body of radius 7 with a light, bouncy
   physics: bounce .9, gravity 200). It deflects the real ball and bodies for 20 s, then the referee pops it.
3. **Pitch invader** (the Smokehouse: KIPPER KEITH, the club mascot in a giant smoked-fish costume; Stahlpresse: the
   STEEL STAG). He runs a zig-zag across the pitch with 2 stewards in hi-vis chasing. The ball bounces off him; a
   human who tackles him gets +10 Euphoria and a sticker (§7.5).
4. **Floodlight flicker** (night matches): the floodlights stutter and fail for 4 s (ambient .12); the ball and the
   players' tags glow (emissive). The PA apologises ("The fish-oil generator…").
5. **Flare smoke** (Lucchetto): red smoke from the curva drifts across a band of the pitch for 15 s (an overlay plus
   particles; cosmetic).
6. **Drone and fireworks** (the Euphorium): a camera drone flies over (cosmetic); fireworks above the stands at goals
   and at Europhoria (`particles.explosion` high in the sky, coloured light, a small shake).

### 6.21 Celebrations

- After a goal, the scorer runs toward the nearest corner flag or the side's fans, and 4 celebrations show as glyph
  prompts (✕ □ ○ △) for 1.2 s. The picked one plays for 2–3 s, and teammates run in to pile on. A CPU scorer, or no
  pick, plays the player's signature celebration.
- Registry `celebration` (§8.3): knee slide, backflip, cartwheel, aeroplane, robot dance, shirt over the head (a
  **yellow card**, as in real football: the referee books him at the restart), corner-flag dance, badge kiss, helicopter
  (breakdance), the Kipperton **fish slap** (two players mime slapping each other with a kipper: a fish sprite in one
  hand). Euphoria +5 to +15 each; the shirt-over-head gives +15 and a yellow.

### 6.22 Audio (all in code)

#### 6.22.1 Music (the engine's song format, original compositions)

| Song id | Where | Character |
|---|---|---|
| `anthem` | title, tunnel walkout, trophy ceremony | the EUROPHORIA ANTHEM: a grand cup-competition anthem in its own melody (Appendix D) |
| `menu` | menus, setup, album | an upbeat 128 bpm loop on the anthem's chords |
| `travel` | the travel map | a jaunty road-trip tune (whistled lead: sine with vibrato) |
| `tabloid` | tabloid screens | a press-room stinger and a short loop (typewriter ticks in the drums) |
| `dressing` | team talks | a warm low loop |
| `europhoria` | in the match, as a layer | drums, brass stabs and bass, faded in by `audio.layer` during Europhoria; otherwise matches have no music, only the crowd |
| `halftime` | the half-time overlay | a light jazzy jingle |
| `goal` | `audio.sting('goal', { at: 'bar' })` | a 2-bar fanfare |
| `tension` | shootouts, the Save Duel | a held chord and a heartbeat (the kick drum at 60 bpm) |
| `victory`, `defeat` | results | a fanfare; a sad trombone (saw with vibrato, falling) |
| `villain` | Baron von Bullion's scenes | a minor, oily waltz |
| `ceremony` | the trophy lift | the anthem, full and fast |
| `credits` | credits, the album | the anthem as a music box (triangle and sine) |
| `training` | training | a laid-back loop |
| `attract` | attract mode | the anthem's high-energy remix |

#### 6.22.2 Sound effects

Define them with `audio.define(name, voice)` (the engine's voices: wave, freq, to, dur, vol, filter, arp, vib). The
list: touch, pass, shot, screamer (a thump and a rising noise whoosh), super charge (rising arp) and release (boom
plus sizzle), bounce by surface (a grass thump, a wet splash, a snow crunch), woodwork "DOINK" (triangle 1400 → 1100
with a ring), net swish (highpass noise, 0.3 s), catch (a slap), parry (punch), whistle (short, long, two blasts at
half time, three at full time), card (a snap), slide (a grass rip), knockdown thud, skill swish, nutmeg ding,
Euphoria segment chime, Europhoria chord stab, Save Duel ticks and the result (perfect ding / miss buzz), VAR beeps,
the PA chime, a seagull squawk (sine with bends), the beach ball boing, floodlight power-down (a falling saw buzz),
the bus horn, fireworks (`explode`), menu move, select and back (the engine's `select`, `confirm`, `cancel`), the
sticker shimmer, heartbeat. Rumble (`game.input.rumble`) on shots (by power), tackles, the woodwork, goals and the Save
Duel.

#### 6.22.3 The crowd engine (`EF.crowdAudio`, WebAudio through the `crowd` bus, §5.4)

- **Bed:** 3 looping noise sources through bandpass filters (300 Hz Q .7, 900 Hz Q 1, 2500 Hz Q 1.2) into gains. The
  level = `size × (.25 + .75 × excitement)`. Excitement follows the crowd mood (§6.18), smoothed over 0.3 s up and
  1.5 s down.
- **Reactions:** an "OOOH" (noise through 2 formant bandpasses sweeping from F1 400 / F2 800 to F1 600 / F2 1000 over
  0.8 s) on near misses and the woodwork; a **roar** (the bed to full, plus a brighter band, 3 s) on goals; **boos**
  (a low "oo" formant, the pitch falling) on dives and cards; whistles from fans (high sine chirps) at fouls; **claps**
  (noise bursts) in rhythm with chants.
- **Chants** (`EF.Chant`, registry `chant`): a choir of 8 voices per side. Each voice is a sawtooth plus a pulse,
  detuned ±12 cents, through 2 bandpass formants per syllable vowel (a: 800/1200, e: 500/1800, i: 300/2300, o:
  500/900, u: 350/700). Syllables follow a melody in the engine's note syntax, with claps and drums. Each team has a
  chant (§7.8). Triggers: the scarf wall (Euphoria ≥ 67), after goals, at kickoffs. The **OLÉ** chant rises on each
  pass of a chain from 5 passes on (one "OLÉ!" per pass).
- Headless: every call is a no-op (no audio context). The crowd bus volume follows Settings → Crowd.

#### 6.22.4 Babble voices (`EF.babble`, Animalese/Simlish-style)

- Each character of a line, as `Dialog` reveals it (§5.1), makes a 50–70 ms syllable:
  - **source:** a sawtooth (bright voices) or pulse (nasal voices) at `f0 × letterPitch × contour`. `letterPitch` is a
    fixed table per letter (±15%). The contour rises toward a `?`, falls toward a `.`, and is louder and higher on
    `!` and on capitals;
  - **formants:** 2 bandpass filters at the vowel's formants. A consonant uses the next vowel's formants plus a 10–15
    ms noise burst: highpass 3–5 kHz for s, z, f, sh; a click (bandpass 2 kHz, 5 ms) for t, k, p, b, d;
  - **envelope:** attack 5 ms, hold, release 30 ms;
  - **pauses:** a space is 30 ms of silence, `,` 120 ms, `.` `!` `?` 220 ms.
- **Speaker profiles** (registry on the speaker's data): `{ f0, wave, formantShift, rate, breath (a noise mix), vibrato, echo }`.
  Barry: f0 160, saw, rate 1.1, bright. Trev: f0 95, pulse, rate .85, dull (formants ×.9). Mags: f0 215, saw, breath
  .25 (raspy). The referee: f0 135, short. The PA: f0 120 with an echo (a 180 ms delay, feedback .35). Players: f0
  110–260 by character. Baron von Bullion: f0 80, vibrato (6 Hz, 3%). Each voice routes through the `voices` bus.
- Only one voice speaks at once (the commentary queue makes sure); celebrations get short shouts ("Yeesh!", "Wahey!")
  as babble.

### 6.23 The 10-foot UI kit and the screens

**UI kit (`30-ui.js`):** a screen stack (`UI.push(screen)`, `UI.pop()`), widgets with focus:

- **Tile** (a big card with an icon or portrait, a title at scale 2, a line of text), **Button**, **List** (at most 6
  rows visible), **Slider** (left/right change it, held repeat with acceleration; mouse drag), **Toggle**, **Choice**
  (left/right cycles), **Tabs** (L1/R1, Q/E, or click), **Pager** (the album and About pages).
- **Navigation:** d-pad, left stick (past half way, repeated with `input.repeat`), arrows and WASD. ✕ / Enter / Space /
  a click picks. ○ / Esc / Backspace / a right click goes back. Hovering the mouse moves the focus; the focus ring
  follows the pointer only while it moves. Spatial navigation: the nearest widget in the pressed direction.
- **Style:** `E.ui.box` gradient panels (paper `#0d1430` to `#16224a`, a gold `#ffc83a` focus border with a 2-px glow
  and a gentle pulse), `E.font.title` for headings, `E.font.text` with a drop shadow for body text. **Type sizes:**
  menu items at scale 2 at least; body text at scale 1 of the 5×7 font at least (never the `'tiny'` font for anything a
  player must read); titles at scale 3–4. Each screen has one main action, at most 6 choices in view, and a prompt
  footer with glyphs.
- **Sounds:** move, select and back blips; focus changes give a light rumble (.1, 30 ms) on pads.

**Screens:**

- **Title** (`title`): the logo "EUROPHORIA FOOTBALL" (`E.font.title` scale 4, a gold gradient, depth 3), the subtitle
  "OVER-THE-TOP ARCADE FOOTBALL", the Euphorium at night behind it (stands, crowd, floodlights, a slow pan), Daz
  Pilchard doing keepy-uppies in front, fireworks every 8 s. "PRESS START" blinks with the right glyph. Then the main
  menu, as 7 tiles: CUP RUN (with "CONTINUE: QUARTER-FINAL" when a save exists), KICK-ABOUT, PENALTIES, TRAINING,
  STICKER ALBUM, OPTIONS, ABOUT & CREDITS. The version label (`E.versionLabel()` plus the game's version) sits in a
  bottom corner. On touch-only devices, the notice panel (§2.5).
- **Kick-About setup** (`setup`): 4 steps, one per screen: TEAMS (home and away carousels of big crest tiles; a kit
  toggle), STADIUM (5 tiles with a painted thumbnail), CONDITIONS (weather: As the stadium / Sun / Rain / Snow / Fog;
  time: Day / Dusk / Night; ball style; half length; difficulty), PLAYERS (the controller side picker, §6.27). Then
  START MATCH.
- **Penalties setup** (`penaltysetup`): two teams, then the side picker.
- **Results** (`results`): the scoreline huge, up to 4 scorer lines with minutes, Player of the Match (portrait and
  name), 3 big stats (shots, possession %, tackles), stickers earned, then CONTINUE.
- **Sticker Album** (`album`): a page per team (2 × 3 big stickers: a live portrait, the name, the position); special
  pages (stadiums, characters, shinies). Unearned stickers are silhouettes with "?". L1/R1 turns pages with a flip
  tween.
- **About & Credits** (`about`): paged (L1/R1): Source Information, Testing Feedback, Engine Feedback, Prompt Feedback
  (all from `EF.ABOUT`, §3.3), then Credits (engine, mocap libraries and their licences, the AI Hub client, the model).
  Large type, one block per page.
- **Pause:** the engine's standard pause menu (themed), with our items Restart match and Dev mode.

### 6.24 The Cup Run (campaign) flow

- **The bracket screen** (`cup`): the Kippers' path as 5 big stacked cards (QUALIFYING ROUND, ROUND OF 16,
  QUARTER-FINAL, SEMI-FINAL, FINAL), each with the opponent's crest, the stadium, and the result once played. The
  current card is focused, and a bus icon moves along the path. NEW CUP RUN / CONTINUE.
- **The beat player** runs a beat's steps (registry `beat`, §7.3) in order:
  - `tabloid`: a newspaper page (THE DAILY ROAR masthead, the headline at `E.font.title` scale 3, black on newsprint,
    a "photo" (a live rig posed in a box, desaturated), a subhead and 2 lines of body). The paper drops in spinning
    (an old-film spin tween), with a typewriter tick.
  - `travel`: a stylised map of a fictional Europe (pixel coastlines drawn from a polygon list), with the minibus "The
    Old Trout" driving a dotted route to the next city.
  - `talk`: dialogue with portraits (`E.Dialog`, modal, babble voices), possibly with choices (`choices`, `onChoice`)
    that set flags.
  - `teamtalk`: 3 big cards (§7.3): HAIRDRYER, ARM ROUND THE SHOULDER, TACTICS BOARD (which then asks for a formation:
    2-2 / 1-2-1 / 2-1-1). Extra local players can join here.
  - `challenge`: the Gaffer's Challenge card for this match (an optional objective).
  - `tunnel`: the walkout (below).
  - `match`: plays the match with the round's options.
  - `result`: the bracket advances; the tabloid for a win or a loss; stickers; the autosave.
- **Losing** a round: the "KNOCKED OUT!" tabloid, then CONTINUE? with a 10 s countdown (arcade style; ✕ retries the
  round from its team talk, ○ returns to the title).
- **Tunnel walkout** (`tunnel`): both teams line up in the tunnel, then walk out onto the pitch in two lines with the
  referee. The anthem plays. The handshake line: each player passes the other line, arm out. Captains and the referee
  at the centre circle, then the coin toss (a sprite flip). This scene also works as the AI Hub card (§6.28).
- **Ending** (`ending`): the trophy ceremony (a podium on the pitch, the Europhoria Cup (§8.2) lifted by Daz with all
  the Kippers jumping, confetti and fireworks, the anthem), then the parade (Kipperton harbour by day: the team on top
  of a fishing trawler on wheels driving along the harbour road, the crowd on both sides throwing scarves, gulls), then
  the closing tabloid, then the credits roll (names scrolling over the parade, the About credits).

### 6.25 Training

Scene `training`: a list of 9 drills (§7.6), each with a completion tick. The coach (Mags, then Sandra for
defending) explains each step in a short modal dialog, then the drill runs on the training ground with a goal and
counters on the HUD ("PASSES 3/5"). Success: a fanfare and the next step. A drill's last step completes it (saved).
Dummies are footballers driven by `ScriptController`s (static, slow-walking, or attacking).

### 6.26 Penalties mode

A shootout from the start (`match { shootoutOnly: true }`) between two picked teams in a picked stadium. 1 player
(against the CPU) or 2 (versus): each human takes his side's kicks and keeps goal for his side. Best of 5, then sudden
death. Results as §6.23.

### 6.27 Local multiplayer

- 1–4 players: each joined input (`game.players`) picks a side on the PLAYERS screen: a big row of controller icons,
  each in its player's colour, moved left (HOME), centre (CPU, which means sitting out) or right (AWAY), then ✕ for
  ready. At least one human must be on a side. Co-op (humans on the same side) and versus both work.
- Each human controls one footballer at a time and switches on his own. Two humans on a side never hold the same
  footballer: switching skips held ones. Each human has his own prompts (their device) and colour tag.
- One shared screen: the broadcast camera follows the ball. When humans are far apart, it widens toward them
  (`cam.frame` with a zoom range of .9–1.25).
- The pause shows who paused (the engine does: "P2 PAUSED").

### 6.28 Online: AI Hub sessions (shared-world)

Read the protocol (github.com/michaelcrosato/ai-hub `lib/hub/README.md`) whole before building this. The flow:

1. `session.js` is the first script (§3.3). `AIHub.active` is true from the first line in a session. Then the game
   creates `E.Game` with `corner: false` and `menu: { quit: false }`, skips the title and the attract mode, and every
   scene has `pausable: false`.
2. Boot goes to scene `hubwait` ("CONNECTING…" over the stadium backdrop) and runs
   `const info = await AIHub.connect({ mode: 'shared-world', seats: [2, 4], card: true })`. With `null`, go to the title
   and run as a normal game.
3. **Set up from the shared seed** (the same on every copy): `const R = AIHub.rng('setup')`: the two teams (from the 6),
   the stadium (from the 5), its weather. Sides: players in seat order alternate HOME (ids at even positions in
   `info.players`) and AWAY. With 3 players, the side with 1 human gets the **underdog boost**: Euphoria gain ×1.5.
   Each human controls one footballer of his side. The half length fits the round:
   `min(90, (info.limitMs/1000 − 50)/2)` seconds, and at least 45.
4. **The card:** scene `tunnel` in card mode: the two teams in the tunnel, the hub players' names in their seat
   colours (`#e8443a`, `#3b82f6`, `#22c55e`, `#f5b700`) with ✓ for those in `card.ready`; "HOW TO WIN: Outscore the
   other side before the final whistle"; this device's controls (glyph prompts); the time left from `card.left`
   ("PAUSED" when `card.paused`); "READY ✕/Enter" and "MORE TIME △/T" buttons (also tapped or clicked). Enter, ✕ or a
   click on Ready calls `AIHub.answer('ready')`; △, T or a click on More time calls `AIHub.answer('more')` (again to
   take it back). Nothing on the card changes the round; it has no menus. Call `AIHub.ready()` once the match is built,
   with no key press.
5. **Start:** on `start`, go to `match` in session mode. A 3-2-1 countdown follows `AIHub.time()` (negative); play
   begins at `AIHub.time() >= 0`.
6. **Host** (`AIHub.isHost`): runs the sim. Remote humans' footballers use `RemoteController`s fed by their input
   messages (Appendix B: stick, held bits, cumulative press counters so a lost packet never loses a press; neutral
   after 500 ms without input). It sends a snapshot 14 times a second (unreliable, under 1,100 bytes) and coalesced
   events at most 5 times a second (reliable). That keeps it at 19 messages a second or fewer, under the limit of 20.
7. **Client:** sends its Intent 15 times a second (unreliable) and rare reliable messages (the Save Duel press with its
   `AIHub.time()`, the celebration pick). It renders 100 ms behind the newest snapshot, interpolating positions (and
   extrapolating up to 150 ms when snapshots are late). It runs rig animation, crowd, audio and commentary locally from
   the snapshot state and the host's events. The client's own player is drawn where the host says (no prediction).
   Instead, every button press gives instant local feedback: the glyph flashes, a kick sound, rumble.
8. **Save Duel online:** the host sends `duel` with its start time. The defending client shows the ring on the same
   timeline and sends its press time. The host resolves when the press arrives, or 300 ms after the window closes
   (a miss).
9. **Server mode** (`AIHub.server`, the host has no player of its own): run the host code with no local player, no
   camera and no input; draw nothing.
10. **Leaving:** on `leave`, that player's footballer goes back to the CPU. The round goes on (the hub voids it only if
    the host leaves).
11. **Time-up:** on `time-up`, the host calls `finish` at once with the current score.
12. **Finish** (the host, once; at full time or on time-up):
    `AIHub.finish({ standings, scores, stats, awards })`. `standings`: the winning side's players (still in the round)
    tied first, the other side's second; a draw is one group with everyone. `scores`: each player's side's goals.
    `stats`: per player `{ Goals, Shots, Tackles }`. `awards`: `[{ id, title: 'Player of the Match', detail }]` for the
    human with the best match rating. Before it, send a last reliable snapshot with `over: 1`, so every copy shows the
    same final score.
13. **End:** on `end` (any reason), stop taking input, stop sending, stop all sound (music, the crowd engine, voices),
    and show "FULL TIME" with the score, or "ROUND VOID" for `void` or `host-left`, "YOU SAT THIS ONE OUT" for
    `sat-out`. The hub draws its results over it.
14. **Rules:** no other network access; no `alert`/`confirm`/`prompt`/`window.open`; no names typed by players (names
    come from `info.players` and are drawn with `E.font`, never inserted as HTML); Options while Create (button 8) is
    held is the hub's, so ignore it. In a session, Options (or Esc) alone opens **our own** canvas overlay, SESSION
    SETTINGS (volume, music, effects, voices, crowd, button symbols; built with `EF.UI`), not the engine's menu, so
    nothing pauses: the match goes on, on the host above all, and the player's footballer goes to the CPU while the
    overlay is open. Dev mode, the attract mode, saves and the cup do not exist in sessions. A draw at full time
    stands in a session (no extra time or shootout), so a round fits its minutes.

### 6.29 Attract mode

- **The idle watcher** runs on `title` and every front-end and cup menu screen (not in matches, training or story
  dialogs). Any input resets it: a key, a mouse move of more than 4 px, a click, the wheel, a touch, a pad button, or a
  stick past the dead zone. After **10.0 s** without input it goes to `attract`. In tests: `game.advance(9.9)` leaves
  the title showing; `game.advance(0.2)` more starts the attract mode.
- **The attract scene** is a director script (`game.script`) over a real AI-versus-AI match that **cheats freely**: it
  places players and the ball, sets the Euphoria, forces outcomes (the save fails, the volley goes in), and turns on
  everyone's infinite stamina. Segments, about 90 s per loop:
  1. **MATCHDAY LIVE** (30 s): a random stadium (it cycles through all 5 over loops). The captain is given the ball 230
     from goal with the gauge full: Europhoria, the super strike, the Save Duel (it fails), the goal, a celebration,
     the replay.
  2. **SET-PIECE SPECIAL** (15 s): a corner, then a bicycle kick goal (forced).
  3. **THE DARK ARTS** (15 s): Lucchetto: a dive in the box, the penalty, VAR CHECK, "PENALTY STANDS", the goal; then a
     Simulation booking.
  4. **SHOOTOUT** (15 s): 3 kicks a side, including a Panenka.
  5. **WEATHER REPORT** (10 s): 2.5 s cuts: rain at the Smokehouse, the snow and the orange ball, fog and flares,
     fireworks in the Euphorium.
  6. **TITLE CARD** (5 s): the logo, "PRESS START", the cup records (fastest cup win, biggest win).
- A banner "DEMO · PRESS ANY BUTTON" (with the right glyph) stays at the bottom. Commentary and the crowd play as in a
  match.
- **Any input** (the watcher's list) goes straight back to `title`, with the focus on the first tile. The press that
  exits is swallowed (`input.consumeAll()`), so it does not also pick a menu item.
- On touch-only devices it runs the same way; a tap goes back to the title.

### 6.30 Dev mode

- **Reach it:** the pause menu's "Dev mode" item, the backquote key (`` ` ``) or F1 in any scene (call
  `preventDefault()` on F1's keydown, or Chrome opens its help page), or `?dev=1`. It is never available in AI Hub
  sessions. Opening it from the pause menu resumes the game (`game.resume()`) and opens the panel over the running
  scene. The panel takes the input while it is open; the match keeps running behind it, with every human's footballer
  handed to the CPU, so slider changes can be watched live. A **Freeze** toggle stops the sim instead.
- **The panel:** a canvas drawer on the right 40% of the screen, translucent (`E.ui.box` with alpha .9), 4 tabs (L1/R1,
  Q/E, or click): TUNE, CHEATS, WARP, INFO. Rows are navigated with the d-pad or stick; left/right changes a value
  (holding speeds it up); ✕ toggles or runs; ○, Esc or F1 closes. The mouse hovers, clicks and drags sliders.
  - **TUNE:** every `EF.T` slider (Appendix A), grouped (Movement, Ball, Passing & Shooting, Keepers, Defending &
    Rules, Euphoria, AI, Match). Each shows its value, its default and a ↺ when changed. At the top: **RESET ALL TO
    DEFAULTS**; on each row, □ resets that one. Changes apply at once and are kept in `E.store('ef:tuning')`, so they
    survive a reload until reset. A dev-panel badge shows on the HUD while any value differs from its default.
  - **CHEATS:** infinite stamina (per side), Euphoria always full (per side), invincible keeper (per side), the CPU
    controls everyone (watch mode), "pure football" (no Euphoria, supers or events), freeze the clock, a goal for home
    / away, set the clock to 44' / 89', slow motion (0.25×) and step one frame (while frozen), show hitboxes and
    contact capsules, show the AI (formation spots, roles, the pass lanes it scores, its decision text over the
    carrier), show the ball's predicted path and the air-ball window, show `rig.debug` skeletons, mute the crowd.
  - **WARP:** go to any scene and part: every deep link (§4.4), each cup round's pre-match beat, half time, extra time,
    a shootout, the results, the ending, the album, about; trigger now: a corner, a free kick, a penalty, a matchday
    event (pick one), a super strike, a Save Duel, a foul with a yellow or a red, a dive, VAR, a celebration (pick
    one), a replay; unlock everything (the cup's rounds, stickers, balls); reset the save. Two galleries: ANIMATION
    (every move of §8.3 on a loop, on a chosen rig, in every view, at 1×, 0.25× or frame by frame; deep link
    `#dev/anim/<move>`) and SOUND TEST (every SFX, song, chant and voice, with sliders for the speaker profiles).
  - **INFO:** the version and build, the seed, the scene and mode, `game.debug.snapshot()` pretty-printed, counts
    (bodies, particles, fans, lights, rigs drawn), the frame time (`game.stats`), the hub role when relevant.
- Dev mode never changes a save unless WARP's unlock or reset is used (it asks first, with its own confirm row).

### 6.31 Saves, settings, unlocks, stickers

- **Saves:** `game.saves` with `write = () => ({ data: EF.Save.data(), place: roundName, level: roundIndex })` and `read`.
  It autosaves after each cup match and at the start of each round. CUP RUN → CONTINUE loads `saves.latest()`. Data
  (versioned, with `migrate`): `{ v: 1, cup: { round, results: [{ opp, score, pens }], flags: { loyal } , teamTalks },
  stickers: { id: true | 'shiny' }, unlocks: { balls: [] }, records: { fastestCup, biggestWin }, drills: { id: true } }`.
- **Our settings** (`EF.SETTINGS` in `new E.Game({ menu: { settings } })`; group Game unless noted): difficulty (Easy /
  Normal / Hard / Europhoric), half length (1:30 / 2:00 / 3:00 / 4:00), pass assist (Off / Low / High), shot assist
  (On / Off), switching (Auto / Assisted / Manual), cards (Off / Normal / Strict), draws in Kick-About (Allowed / Golden
  goal / Penalties), prompts (Always / While learning / Off), commentary (On / Off), replays (On / Off), camera
  (Broadcast / Classic / Aerial), radar (On / Off); group Sound: Voices (slider .8), Crowd (slider .8); group
  Controller: Button symbols (PlayStation / Xbox, §2.3). The engine supplies the rest (volume, music, effects, reduce
  motion, shake, flashes, screen filter, zoom, rebinding).
- **Unlocks** ("items"): balls for Kick-About: Classic (white panels), Winter Orange (automatic in snow), The Golden
  Ball (win the cup), Old Leather (finish all 5 Gaffer's Challenges). Matches have no pickups: football stays
  football.
- **Stickers:** §7.5. Earning one shows a toast with the sticker sliding in (sound: shimmer).

### 6.32 About and credits

The About pages render `EF.ABOUT` (§3.3) in this order: Source Information (every field TASK.md lists: Date, Source,
Plan, Genre and Perspective, Tech, Art Direction, Animation, Audio, Online, Testing, Research, Environment, Model,
Usage), Testing Feedback (4 answers), Engine Feedback (6 answers), Prompt Feedback (4 answers), then the credits.
"unknown" stays "unknown". The test suite checks that every field is present and non-empty (§11.3).

### 6.33 Touch-only detection

`EF.touchOnly()` is true when `?touchonly=1` is set, or when `matchMedia('(any-pointer: coarse)').matches` and not
`matchMedia('(any-pointer: fine)').matches` and no gamepad is connected (`navigator.getGamepads()`). It becomes false
for the rest of the visit on the first `keydown` or `gamepadconnected`. While it is true: the title shows the notice
and the SETTINGS button; menus still answer taps (to reach settings and about); play cannot start (the tiles show
"CONTROLLER OR KEYBOARD REQUIRED" when tapped); the attract mode runs.

---

## 7. Content

In a football game the usual content words map like this. **Levels** are the 5 cup rounds, each in its own stadium
with its own weather and events (§7.2), plus the training ground. **Enemies** are the 5 opposing clubs, each with its
own tactics and gimmick; the final's Olympique Opulence is the boss team, with a boss keeper and a boss captain
(§7.1). The referees are the neutral hazard. **Items** are the unlockable balls, the stickers and the team-talk buffs;
there are no pickups in matches (§6.31). **Story beats** are in §7.3.

Tone everywhere: British football broadcasting and tabloid back pages, turned up. That means puns (fish puns for the
Kippers), commentary clichés, deadpan replies, affectionate and never mean. National stereotypes are off-limits: the
opponents' jokes come from their **football philosophies**, their food, weather and stadiums. All names are original;
none is a real club, player or person. Text is ASCII except the accented letters §5.5 adds.

### 7.1 Teams

Each team: name, short code, nickname, city, stadium, kits (home, away, keeper), crest, formation, tactic, chant,
signature celebration, 5 players (number, name, position, build, size, hair, skin, hair colour, stats, captain's super).
Kit colours give rig colours: `cloth` (shirt), `pants` (shorts), `boot`, `belt` (= shorts), `trim` (socks and collar),
`glove` (keepers), plus `kit: { pattern, color2, number, numberColor }` (§5.2).

**KIPPERTON ATHLETIC** — "The Kippers", KIP. A fishing town on the cold north coast. Home: the Smokehouse. Kit: tangerine
`#f08a24` and navy `#1c2a5a` hoops, navy shorts, tangerine socks; away: white with a tangerine sash. Crest: a navy shield
with a smoked kipper crossed over an anchor. Formation 2-1-1 (the team talk can change it). Tactic `plucky` (balanced:
press .55, line .45, tempo .7, passRisk .5). Chant "KIP-PER-TON!". Celebration: the fish slap. Manager: MAGS MULLIGAN
(a fishmonger turned manager: flat cap, scarf, a voice like a foghorn).

| # | Name | Pos | Build / size / hair | Key stats | Notes |
|---|---|---|---|---|---|
| 1 | WALLY CRABB | GK | bulky 1.2, bald | keep 76, weight 80 | 41, a part-time lighthouse keeper; huge gloves |
| 4 | SANDRA "THE HARBOUR WALL" OKAFOR | DEF | bulky 1.2, short | tackle 88, weight 95, temper 40 | barges like a trawler |
| 6 | AGGIE NOWAK | MID | heroic 1.12, ponytail | pass 90, skill 70 | the brains; Polish grandmother in the stands |
| 7 | TOMMY "TWINKLETOES" TRAN | FWD | heroic 1.08, spiky | pace 95, skill 92 | step-overs for breakfast |
| 9 | DAZ PILCHARD (captain) | FWD | heroic 1.15, short | shoot 90, pace 80 | super **THE SMOKED KIPPER** (path `wobble`, smoke trail, the ball briefly shaped like a fish) |

**AFC HOOFINGTON** — "The Hoofers", HOO (Qualifying Round). Brown `#6a4a2a` and amber `#e8a830` stripes. Crest: a
muddy boot. Formation 2-2. Tactic `routeone` (longBall .6, press .4, line .4, tempo .5, foul .25). Chant: a
foghorn-low "HOOOOF!" on every clearance. Celebration: Cheering_Two_Hands.

| # | Name | Pos | Notes |
|---|---|---|---|
| 1 | ALF STOPPARD | GK | long kicks only |
| 3 | GAZ HOOPER | DEF | heads everything |
| 5 | DUNCAN DUNSTABLE | DEF | bulky; weight 92 |
| 8 | KEV LUMP | MID | "Lump it!" |
| 9 | NORMAN "THE NODDER" NEEDHAM (captain) | FWD | headers 95; super **ROW Z RETURN** (`meteor`: a hoof into the sky that comes down onto the goal) |

**REAL PASAPASA** — "Los Pasitos", RPP (Round of 16). White `#f4f2ec` with lilac `#9a7ad0` trim; away lilac. Crest: a
sun over two arrows passing. Formation 1-2-1. Tactic `keepball` (shortBias .9, passRisk .2, tempo .85, press .55,
dribble .25). Chant: "OLÉ!" rising with every pass; white handkerchiefs waved. Celebration: the corner-flag dance.

| # | Name | Pos | Notes |
|---|---|---|---|
| 1 | PACO PORTERO | GK | |
| 4 | RAFA RONDO | DEF | |
| 6 | TITO TOQUE | MID | one touch, always |
| 8 | IKER INTERIOR | MID | |
| 10 | PEPITO PASARELA (captain) | MID | chibi build 1.0 (tiny); super **EL PASODOBLE** (`zigzag`: the ball dances 3 steps in rhythm) |

**SV STAHLPRESSE 04** — "Die Pressen", SVS (Quarter-final). Steel grey `#6a7078` and hazard orange `#ff7a1a` halves.
Crest: a cog with a hammer. Formation 1-2-1, high line. Tactic `gegenpress` (press .9, pressers 2, line .7, tempo 1,
stamina use high). Chant: a drum and "HEY! HEY! HEY!". Celebration: the robot.

| # | Name | Pos | Notes |
|---|---|---|---|
| 1 | MANNI MAUER | GK | |
| 2 | FRANZI FLEISS | DEF | never stops running |
| 5 | UWE UMSCHALT | MID | transitions |
| 7 | JURGEN JAGD (JÜRGEN once §5.5 lands) | FWD | the hunter |
| 9 | KLAUS HAMMERSCHMIDT (captain) | FWD | bulky 1.25; super **DER HAMMERSCHLAG** (`hammer`: 3 forge-hammer bounces, each shaking the screen) |

**AC LUCCHETTO** — "I Lucchetti", the Padlocks, ACL (Semi-final). Burgundy `#7a1a2a` with silver `#c8ccd4`; away silver.
Crest: a padlock in a laurel wreath. Formation 2-1-1 played deep, switching to 3-1 (the MID drops into the back line)
when they lead after 60', which is also when the bus arrives. Tactic `catenaccio` (line .15, press .3, foul .6, dive .5,
longBall .35 on the counter). Chant: a slow minor hum and a curva drum; flares. Celebration: the badge kiss.

| # | Name | Pos | Notes |
|---|---|---|---|
| 1 | ROCCO RIPARO | GK | |
| 3 | DINO DIFESA | DEF | |
| 5 | MARCO MARCATURA | DEF | man-marks your best player |
| 7 | FABIO FALLO | MID | the diver (temper 90): goes down in the box at the first touch |
| 10 | SALVATORE SERRATURA (captain) | FWD | the lone counter-attacker; super **LA CHIAVE** (the key; `around`: it curves round every body in its way) |

**OLYMPIQUE OPULENCE** — "Les Milliardaires", OPU (Final; the boss team). Gold `#e8c040` and black `#141414`
stripes. Crest: a crown on a stack of coins. Formation 1-2-1, attacking. Tactic `galacticos`. Owner: BARON VON
BULLION. Chant: polite golf claps (they're paid to be there) and a hired brass band. Celebration: the helicopter.

| # | Name | Pos | Notes |
|---|---|---|---|
| 1 | GUNNAR "THE VAULT" VAULT | GK | **the boss keeper**: bulky, size 2.0, reach +40%, catches anything under 300 |
| 4 | CASPIAN CASH | DEF | |
| 8 | BENTLEY BLING | MID | skill 90 |
| 11 | SERGEI SOVEREIGN | FWD | pace 96 |
| 10 | MAXIMILIEN D'OR (captain) | FWD | vain superstar; Golden Moment (§6.13); super **LA BOTTE D'OR** (`split`: 3 golden balls, one real) |

**Referees** (registry `referee`): ARTHUR HALTWHISTLE (strictness 1.3, gullibility .2; the qualifying round and the
final: "the best in Europe"), PIERRE PATIENCE (.7, .5; round of 16), INGRID IRONSIDE (1.1, .3; quarter-final),
SERGIO SEVERO (1.2, .7, varHappy .9; semi-final: dramatic, falls for everything, loves VAR). Kick-About picks one at
random.

**Formations** (registry `formation`; `u, v` as in §6.13; `drop` is the role a red card removes):

| Id | Roles and base spots `[u, v]` | drop |
|---|---|---|
| `2-2` | GK [.03,.5]; DEFL [.22,.3]; DEFR [.22,.7]; FWDL [.60,.32]; FWDR [.60,.68] | FWDR |
| `1-2-1` | GK; DEF [.22,.5]; MIDL [.42,.28]; MIDR [.42,.72]; FWD [.64,.5] | MIDR |
| `2-1-1` | GK; DEFL [.22,.32]; DEFR [.22,.68]; MID [.45,.5]; FWD [.68,.5] | MID |
| `3-1` | GK; DEFL [.16,.25]; DEF [.13,.5]; DEFR [.16,.75]; FWD [.55,.5] | DEFL |

Each role also gets `att`, `def`, `pull` and `uRange`. Defenders: att [+.14, 0], def [0, 0], pull [.45, .55], uRange
[.08, .62]. Midfielders: att [+.12, ±.06 outward], def [−.12, ∓.04], pull [.55, .45], uRange [.15, .85]. Forwards:
att [+.18, 0], def [−.12, 0], pull [.5, .6], uRange [.35, .95]. Tune them by watching AI-versus-AI matches with the AI
overlay on (§6.30).

### 7.2 Stadiums

| Id | Name, city | Time / weather | Pitch | Stands and skyline | Crowd | Events |
|---|---|---|---|---|---|---|
| `smokehouse` | THE SMOKEHOUSE, Kipperton | dusk → night, rain .7, wind .4 | wet, mud in the goalmouths, 6 puddles, worn centre | a small main stand with a corrugated roof (3 tiers), terraces with fishing nets behind each goal (2 tiers); skyline: smokehouse chimneys trailing smoke, the harbour, a lighthouse with a sweeping beam, gulls | 600, 80% home (tangerine and navy), a brass band | seagull, floodlight flicker, Kipper Keith |
| `pasapasa` | ESTADIO PASAPASA, Solera | sunny afternoon | hard and dry (friction .8), perfect stripes | a white-walled bowl (5 tiers) with terracotta roofs; skyline: palms, a cathedral dome, hills | 1,400, white handkerchiefs | beach ball |
| `stahlpresse` | STAHLPRESSE ARENA, Eisenhutte | night, snow .6 | snow, lines brushed clear, orange ball | a steep steel arena (5 tiers) under a roof truss; skyline: steelworks chimneys with glowing furnaces, steam, snowy mountains | 1,600, a scarf wall, drums | Steel Stag pitch invader, floodlight flicker |
| `lucchetto` | STADIO LUCCHETTO, Castelfortezza | dusk → night; fog from the 2nd half | grass, a little uneven (random small deflections) | an old bowl (4 tiers) with a steep curva end; skyline: medieval walls, a bell tower, cypress trees | 1,200, flares, the curva drum | flare smoke |
| `euphorium` | THE EUPHORIUM, Aurelia | night, clear | perfect | a huge golden dome stadium (6 tiers), LED rings, a jumbotron above the north stand; skyline: the dome's ribs, searchlights, lasers | 1,600, mixed, confetti cannons | drone, fireworks |
| `rec` | KIPPERTON REC (training) | overcast morning | patchy | no stands: a fence, a few parents on a bench, the sea wall; cones, dummies, rebound boards | 8 | none |

Each stadium also lists: its board sponsor texts (fictional and funny: "SMOKY JOE'S KIPPERS", "GULL INSURANCE: WE
COVER EVERYTHING", "PIE-O-MATIC", "EUROPHORIA COLA", "BULLION BANK: MONEY TALKS", "STAHLPRESSE: WE PRESS HARDER",
"CASTELFORTEZZA LOCKSMITHS"), its light setup, its floor palette and its music override.

### 7.3 The story (Cup Run beats)

The premise: the Continental Federation meant to invite KINGSBRIDGE ALBION to the EUROPHORIA CUP, Europe's grandest
knockout competition. A clerk typed KIPPERTON instead, and the rules say an invitation is an invitation. Kipperton
Athletic (population 3,112; floodlights powered by fish oil; fourteen pounds in the kitty) are going to Europe in a
minibus with three good tyres.

**Prologue** (`prologue`)
- Tabloid, THE DAILY ROAR: **"FISH OUT OF WATER!"** — "Typo sends tiny Kipperton into the Europhoria Cup. 'Rules are
  rules,' shrugs the Federation."
- Talk at the Smokehouse:
  - MAGS: "Right, you lot. Fourteen quid in the kitty, a minibus with three good tyres, and a letter that says EUROPE."
  - DAZ: "Gaffer, do they have chips in Europe?"
  - MAGS: "They have EVERYTHING in Europe, Darren. Including teams that'll eat us for breakfast."
  - SANDRA: "Let 'em try. I've got an appetite and all."
  - MAGS: "That's the spirit. First up, at home: AFC Hoofington. Route-one merchants. Keep your heads up. Literally."
  - Choice: [ "LET'S PLAY" ] / [ "TRAINING FIRST" ] (the second goes to Training, then back to the cup).

**Qualifying Round** — vs AFC Hoofington at the Smokehouse (rain, dusk). Referee Haltwhistle.
- Pre: **"THE LONG AND THE SHORT OF IT"** — "Hoofington's aerial bombardment heads for Kipperton's puddles."
- NEEDHAM (on a portrait card): "We don't pass, love. We 'oof."
- Challenge: **Score a header.**
- Win: **"KIP KIP HOORAY!"**; loss: **"BATTERED!"**
- After: MAGS: "Not bad. Not good. But not bad." TREV (a commentary card): "A proper cold night, and they've warmed it up."

**Round of 16** — vs Real Pasapasa at Estadio Pasapasa (sun). Referee Patience.
- Travel: the minibus heads south, with a postcard: "WISH YOU WERE HERE (IT'S HOT)".
- Pre: **"PASS THE PARCEL"** — "Kippers must stop the passing masters... if they can find the ball."
- PEPITO: "You will chase the ball until you are dizzy, little fishes."
- Challenge: **Win the ball back 5 times.**
- Win: **"SOLE-DESTROYING FOR SOLERA!"**; loss: **"PASSED OUT"**
- After: AGGIE: "I counted. They made 412 passes." MAGS: "And we made two goals. Football's a funny old game."

**Quarter-final** — vs SV Stahlpresse 04 at the Stahlpresse Arena (night, snow). Referee Ironside.
- Travel: snow chains on the minibus; the map turns white.
- Pre: **"PRESSED FOR TIME"** — "The Steel Machine never stops running. Kipperton's bus barely starts."
- KLAUS: "We run. You run. We run more."
- Challenge: **Nutmeg an opponent.**
- Win: **"KIPPERS MELT THE STEEL!"**; loss: **"CRUSHED"**
- After: TOMMY: "Did you see his face when it went through his legs?" SANDRA: "Did you see mine? Frozen solid."

**Semi-final** — vs AC Lucchetto at Stadio Lucchetto (dusk, then fog). Referee Severo.
- Pre: **"PADLOCK AND KEY"** — "Can Kipperton crack Europe's meanest defence? Locksmiths on standby."
- SALVATORE: "Nobody scores against Lucchetto. Nobody. We lock the door and we eat the key."
- MAGS (before the match): "They'll dive, they'll moan, and if they go ahead they'll park the bus. Don't fall for any
  of it."
- Challenge: **Score from a free kick.**
- Win: **"THEY PARKED THE BUS — WE STOLE IT!"**; loss: **"LOCKED OUT"**

**Before the final** (`villain`) — a hotel lobby, night.
- BARON VON BULLION: "Mister Pilchard. Fifty million. A gold-plated jet ski. And all the caviar you can eat."
- Choice: [ "I'M A KIPPER, MATE. ALWAYS." ] → flag `loyal`: the final starts with Euphoria +20 and the sticker LOYAL
  KIPPER. / [ "...DOES THE JET SKI COME IN ORANGE?" ] → DAZ: "Only joking, Gaffer! Kipper till I die." MAGS: "You
  nearly gave me a heart attack." (Euphoria +10.)

**Final** — vs Olympique Opulence at the Euphorium (night, fireworks). Referee Haltwhistle.
- Pre: **"DAVID VS GOLDIATH"** — "Fish-oil floodlights meet the richest club on Earth."
- MAXIMILIEN: "I have three Golden Boots. You have... boots."
- Challenge: **Score a Super Strike.**
- Win: the ending (§6.24): the ceremony; the parade; **"THE PLAICE TO BE: KIPPERS ARE KINGS OF EUROPE!"**; an epilogue
  line: "Kingsbridge Albion have demanded a recount." Credits.
- Loss: **"SO CLOSE! Golden boys break Kipper hearts"**, then CONTINUE? (retry the final).

**Team talks** (registry `teamtalk`; MAGS says one line from a pool of 3 for each):
- **HAIRDRYER** ("Get out there and TERRIFY them!"): +10% speed and tackle strength for the first 15 game minutes; the
  referee's strictness +20%.
- **ARM ROUND THE SHOULDER** ("Just enjoy it. Your mum's watching."): stamina regen +25% for the match; Euphoria starts
  at +15.
- **TACTICS BOARD** ("Here's the plan."): pick the formation (2-2 / 1-2-1 / 2-1-1); pass accuracy +10%.

**Gaffer's Challenges** (registry `challenge`): the 5 above. Each is an event condition (for example `header` events
with `goal` within 0.5 s by a Kipperton player). Completing one shows a toast during the match, gives a shiny sticker
afterwards, and all 5 unlock the Old Leather ball.

### 7.4 Commentary pools

Write at least **300 lines** in total, at least **12 per major event** (goal, shot saved, near miss and woodwork,
tackle, foul, card, dive, super strike, Save Duel, skill move, header and volley, kickoff, half time, full time,
weather, matchday events, VAR, penalty, shootout), with banter pairs (`reply`) in about a third of them. Write
original lines only: no famous real commentary quotes. Samples to set the voice:

- **kickoff:** BARRY "And we're underway at {$stadium}! Lovely evening for it, Trev." / TREV "It's raining sideways,
  Barry."
- **goal:** BARRY "OH, YOU BEAUTY! {$player} has absolutely LEATHERED it!"; "GET IN! Back of the net from {$player}!"
  / TREV "Keeper had no chance. None. Nada. Zilch."; BARRY "{$team} lead, and the away end is a washing machine!"
- **goal, the Kippers:** BARRY "OH MY COD! KIPPERTON HAVE SCORED!"; "That's a plaice in history for {$player}!"
- **near miss:** BARRY "OHHH! Inches! INCHES!" / TREV "He'll see that one in his sleep."
- **woodwork:** BARRY "DOINK! Off the woodwork!" / TREV "You could hear that in the car park."
- **header:** BARRY "Rises like a salmon! A kipper, actually, but you get the idea."
- **bicycle:** BARRY "AN OVERHEAD KICK! ARE YOU KIDDING ME?!" / TREV "I tried that once. Spent a week in traction."
- **nutmeg:** BARRY "Through the legs! He'll hear about that in the canteen."
- **slide that launches:** BARRY "He's taken man, ball, and most of the grass!" / TREV "That's a booking in any
  country."
- **dive:** BARRY "Oh, he's gone down like a sack of spuds!" / TREV "There was more contact at my wedding, Barry."
- **simulation booked:** TREV "Yellow card for the amateur dramatics. Quite right."
- **card:** BARRY "The referee reaches for his pocket... and it's YELLOW!"
- **VAR:** BARRY "Here we go. VAR. Put the kettle on." / TREV "Put two on."
- **super strike:** BARRY "WHAT HAS HE DONE TO THAT BALL?!" / TREV "That's not football. That's sorcery."
- **Save Duel perfect:** BARRY "AND THE KEEPER'S GOT IT! FINGERTIPS! UNBELIEVABLE!"
- **the bus:** BARRY "They've only gone and LITERALLY parked the bus!" / TREV "Has it got a ticket?"
- **half time:** BARRY "That's the half-time whistle. Time for a pie, Trev?" / TREV "Two pies, Barry."
- **full time, a Kipperton win:** BARRY "They'll be dancing on the harbour wall in Kipperton tonight!"
- **seagull:** BARRY "And a seagull has taken possession!" / TREV "Better first touch than some I've seen."
- **rain:** TREV "Proper weather, this. Separates the men from the boys. And the boys from their boots."

The PA has 20 lines; tabloids have the headlines in §7.3; each story speaker has 5 or more lines for their beats.

### 7.5 Stickers

51 stickers in the album:
- 30 players (5 a team, earned by playing them, the Kippers from the start);
- 6 crests (earned by playing them);
- 5 stadiums (earned by playing there);
- 5 shiny Gaffer's Challenges;
- 5 specials: MAGS MULLIGAN (finish the prologue), KIPPER KEITH (tackle the invader), BARRY & TREV (hear 50 lines),
  THE BUS (score past it), LOYAL KIPPER (the loyal answer).

Each sticker: `{ id, kind, ref, name, how }`. The album shows "how" under a silhouette.

### 7.6 Training drills (registry `drill`)

| # | Id | Title | Teaches | Steps (each with Mags's or Sandra's lines) |
|---|---|---|---|---|
| 1 | `move` | ON YOUR MARKS | run, sprint, stamina | weave through 6 cones; sprint the straight; recover your stamina |
| 2 | `passing` | PASS MASTER | pass, through ball, one-two | 5 passes to moving teammates; 2 through balls; 1 one-two |
| 3 | `shooting` | HIT THE TARGET | power, aim, the sweet spot, curl, chip | hit the 4 corner targets; 1 Screamer; curl one round a dummy; chip the keeper |
| 4 | `air` | HEADS UP | lobs, crosses, headers, volleys, bicycle | cross from the wing; score a header; score a volley; bonus: a bicycle kick |
| 5 | `skills` | SHOW BOAT | step-over, nutmeg, spin, rainbow, knock-on | beat 4 dummies, one with each move |
| 6 | `defending` | THE HARBOUR WALL | poke, slide, barge, switching, interceptions | win the ball 3 times without fouling; switch to the free man; intercept 2 passes |
| 7 | `setpieces` | DEAD BALLS | corners, free kicks, penalties, keeping in penalties | score from a corner; bend a free kick over the wall; score a penalty; save a penalty |
| 8 | `euphoria` | FEED THE CROWD | Euphoria, Europhoria, Super Strike, Save Duel | fill the gauge with tricks and passes; trigger Europhoria; score a Super Strike; win a Save Duel |
| 9 | `theatrics` | THE DARK ARTS | dives and the referee | win a foul with a dive after contact; get booked for a dive with nobody near (it's on purpose: "now you know") |

### 7.7 Matchday events

§6.20 lists the 6 events and their stadiums. Each has 3 or more commentary lines and its own sound.

### 7.8 Chants and songs

- KIPPERTON: "KIP-PER-TON!" (G4 G4 C5), 3 claps, repeated; then "WE'RE GOING UP THE COAST" on the anthem's first
  phrase.
- HOOFINGTON: a long low "HOOOOOF!" (G2 sliding up to C3) on each long ball.
- PASAPASA: "O-LÉ!" (E5 C5), one per pass of a chain; handkerchiefs.
- STAHLPRESSE: drum `k . k . k k k .` and "HEY! HEY! HEY!" (A4 A4 A4).
- LUCCHETTO: a slow minor hum (A3 C4 E4 D4 C4), the curva drum.
- OPULENCE: polite golf claps, and a brass band playing 4 bars of the anthem out of tune (detuned +30 cents).
- Song sketches: Appendix D.

---

## 8. Art and animation

### 8.1 The look

- The engine's native style, at its best (the API card's Look target): `res: 'ps1'`, `expand: true`; HD Humanoid rigs
  with real palettes from `E.tones`; textured floors; props on every screen; lights in every scene; title fonts with
  extrusion; effects on every hit.
- **Players:** `E.Humanoid({ weapon: null, build: 'heroic' | 'bulky' | 'chibi', size: 1.08–1.25 (the boss keeper 2.0),
  hair, sleeves: 'short', colors, kit })`. The `cap` hat only for Mags; a `band` (headband) for a few players.
  Keepers: their own kit colours and `glove`. The referee: black, with yellow trim. Shaded with `E.tones`; outlines on.
  At the default zoom 1.25, players are about 28 px tall.
- **The pitch:** mown stripes 32 wide (alternating light and dark), grain noise, worn patches (the goalmouths and the
  centre circle by stadium), painted lines, mud and snow and puddles by tag, and a wet sheen (lighter dither in rain).
- **Readability:** the ball always has a shadow (smaller and fainter with height, as the kit does); humans have colour
  tags; the radar uses shapes as well as colours; text over the pitch has outlines.
- **Budget:** TASK.md treats performance as unlimited. Add the detail, fans, effects, lights and shadows each scene
  needs. Do not spend time on frame-rate targets or optimisation.

### 8.2 Assets to make (new) and to take (library)

New, made in code for this game:
- **Goals:** posts and bar (2-px white bars), side and back nets (the dithered mesh with ripple), the net floor shadow.
- **Corner flags:** a pole and a 3-frame waving flag (`E.anim`) in the home colours.
- **Floodlight pylons:** a custom shape: a lattice tower (lines), a lamp bank (glow material), a light cone (§6.19).
- **Stands:** TileMap tiers with seat-row textures (the floor texture on the tier tops in the stadium's seat colours);
  roofs (corrugated, a truss, the dome's ribs) drawn as `r.queue` polygons; vomitories (dark gaps) every 8 tiles.
- **Ad boards:** the far boards' faces show scrolling LED text (sponsors; "GOAL!" after goals; team colours at
  Europhoria).
- **Jumbotron** (the Euphorium): a frame and a screen showing the score, the crest, "REPLAY" and "GOAL!" animations.
- **Dugouts, the fourth official's LED board, photographers with flashing cameras** (south apron).
- **Crests:** a painter for shapes (shield, roundel, circle), fields, rings, and charges (kipper, anchor, boot, sun,
  arrows, cog, hammer, padlock, laurel, crown, coins), drawn at 12, 24 and 64 px.
- **Balls:** 4-frame sprites for Classic, Winter Orange, Golden and Old Leather; super-strike variants (the smoked
  kipper shape, a golden glow).
- **Cards, the whistle, the coin, a kipper (the fish-slap prop), a pie** (half-time jokes), sprites.
- **The team bus** (Lucchetto livery), **the trawler-on-wheels** (the parade), **the minibus "The Old Trout"** (the
  travel map), **the podium**, **the Europhoria Cup** (a big-eared silver cup on a plinth: a shape of turned profiles,
  metal material).
- **Tifos:** one per team, a large banner painted by code over a stand section (the crest and a slogan: "KIPPER ARMY",
  "OLÉ OLÉ", "STAHL!", "LA CHIAVE SIAMO NOI", "MONEY TALKS").
- **Fans:** the sprite fans (§6.18); the mascots (Kipper Keith: a Humanoid with a fish-head sprite over his head
  joint; the Steel Stag: a stag head with antlers); stewards in hi-vis.
- **The tabloid page, the travel map, the bracket cards, the sticker frames:** UI art in code.
- **Weather and pyro overlays:** fog layers, flare smoke, confetti, fireworks (particles).

From the engine's library (generic props, `node tools/asset-find.mjs`): benches (`bench`, `kenney-holiday:bench`) for
the dugouts and the training ground; `lamppost` and `kenney-graveyard:lightpost-double` on the harbour road; `fence`
and `kenney-fantasy-town:hedge` at the rec ground; `kenney-holiday:snowman` outside the Stahlpresse Arena;
`kenney-fantasy-town:stall-red` market stalls (the pie stand, the Kipperton harbour); `kenney-pirate:flag` on the
trawler; palms (`r.prop('palm')`) at Solera; `crate`, `barrel` and `sign` at the harbour. Load an asset set with its
script before `game.js` and `E.addAssets(window.ASSETS['kenney-holiday'])`, or cut the few entries the game uses into
a set of its own with `tools/asset-set.mjs`.

### 8.3 Animation

Three sources, all on the engine's Humanoid rig: (a) the engine's own animation (gait from velocity, `E.MOVES`-style
attack specs, poses, expressions); (b) mocap clips through `Mocap.drive(rig, lib)` (set `rig.mocap` each step,
`rig.mocapW` to fade, `rig.mocapMask = 'upper'` for the arms over the legs); (c) procedural recipes: the tilt state
(§5.3) and joint post-processing (wrap `rig.solvePose`, as the API card shows).

**Cut the clip set** (run in the scratch clone of the engine repository):

```sh
node tools/anim-set.mjs src/mocap/sets/quaternius.js src/mocap/sets/mesh2motion.js src/mocap/sets/cmu.js \
  examples/cmu-lib/CMU_10.js examples/cmu-lib/CMU_11.js \
  --clips "QUATERNIUS:Slide_Start,QUATERNIUS:Slide_Loop,QUATERNIUS:Slide_Exit,QUATERNIUS:Hit_Knockback,QUATERNIUS:LayToIdle,QUATERNIUS:OverhandThrow,QUATERNIUS:Roll,Victory,Cheer_One_arm,Cheering_Two_Hands,Dance_Simple,Angry,Backflip,Help_Two_Arms,Death_C,Dodge_left,Dodge_right,Greeting,Cartwheel,Jump_Twist,Breakdance_Helicopter,Shrug,Fall_On_Face,Get_Up_Face_Down,Get_Up_From_Back,Get_Up_From_Side,Run_Quick_Stop,Wave_Hello,10_02,10_05,11_01" \
  --name EF --title "Europhoria Football" --out <dev folder>/mocap/ef-clips.js \
  --credit "Quaternius Universal Animation Library 1 and 2 (CC0); Mesh2Motion (CC0); CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu), free for all uses; created with funding from NSF EIA-0196217."
```

If a name is in more than one set, the tool says so: prefix it `SET:`. If a clip's name differs, check the set's
catalog (`src/mocap/catalogs/*.json`) and fix the list. Expect about 150–250 KB. The CMU soccer takes play only a
window around the kick: find the contact time once (the frame where the right foot's forward reach peaks), store it in
`EF.Anim.CLIPS`, and sample from `contact − 0.45 s` to `contact + 0.35 s`.

| Moment | Source | How |
|---|---|---|
| idle, jog, run, sprint | engine | the gait from velocity; `sprint: true` adds the lean |
| dribble touch | engine spec | `touch: { rel, kick: true, a0: .2, a1: 0, z0: .08, z1: .12, reach: 4, wind: .03, active: .04, recover: .08 }` every stride |
| pass | engine spec | `pass: { rel, kick: true, a0: .6, a1: -.1, z0: .15, z1: .2, reach: 6, wind: .08, active: .08, recover: .16, twist: .4 }` (inside foot) |
| shot | spec, plus mocap for power ≥ .8 | `shot: { rel, kick: true, a0: .05, a1: 0, z0: .3, z1: 1.1, reach: 7, wind: .12, active: .1, recover: .26, lean: -.25, lunge: 2 }`; at high power blend `10_02`'s kick window in over the spec (`mocapW` 1, then fading to 0 in the recovery) |
| penalty run-up and kick | mocap | `11_01` (the run-up and kick), with root motion supplied by the body |
| chip / lob | spec | `chip: { a0: .1, a1: 0, z0: .1, z1: 1.4, reach: 5.5, lean: -.4 }` |
| volley | spec | `volley: { a0: .4, a1: -.2, z0: .9, z1: 1.2, reach: 7, hop: 2, lean: -.4, twist: .6 }` |
| header | procedural | `air: true` with a z arc; tilt forward 20° (axis `right`); the head snaps forward at contact (post-process `J.head`) |
| diving header | procedural | tilt +75° about `right` (pivot hips, lift 6), arms back; lands with `down` 0.5 s; up with `Get_Up_Face_Down` |
| bicycle kick | procedural | tilt −140° about `right` (pivot hips, lift up to 14 at contact), with `axekick`-style kick: `{ kick: true, a0: .1, a1: 0, z0: 2.2, z1: 1.5, reach: 6 }`; lands on the back (`down`); up with `Get_Up_From_Back` |
| slide tackle | mocap | `Slide_Start` → `Slide_Loop` → `Slide_Exit` (the body supplies the travel) |
| poke tackle | spec | `poke: { kick: true, a0: .3, a1: 0, z0: .1, z1: .1, reach: 7.5, lunge: 3, wind: .05, active: .08, recover: .15 }` |
| barge | engine move | `bash`, with a lean |
| launched by a slide | procedural | tilt about `forward` spinning 1.5 turns over 0.6 s while the body flies (vz 120), stars; then `down: 1`; up with `LayToIdle` or `Get_Up_From_Side` |
| knocked back | mocap | `Hit_Knockback`, then `LayToIdle` |
| wrong-footed | mocap | `Dodge_left` / `Dodge_right` at `mocapW` .7, with `hurt` |
| step-over | spec | two quick `kick` specs sweeping across the ball (`a0` from ±.9 to ∓.3), 0.15 s apart |
| spin turn | engine | `rig.spin` from 0 to 2π over 0.45 s |
| rainbow flick | spec | heel flick: `{ kick: true, a0: 3.0, a1: 2.6, z0: .1, z1: 1.3, reach: 4 }` (behind, upward) |
| skid stop | mocap | `Run_Quick_Stop` (upper body, `mocapMask: 'upper'`) on hard stops |
| theatrical dive | procedural + mocap | launch forward (tilt +80° about `right`, lift 8), land, 2 sideways rolls (tilt about `forward` spinning 2 turns while sliding 30), lie clutching a shin (`down: 1`, `expr: 'wince'`, hands to `J.kneeR`); if booked, up with `Shrug` |
| protests | mocap | `Angry`, `Help_Two_Arms`, `Shrug` (upper) |
| tired | procedural | lean 30°, hands to the knees (post-process `J.handL`/`J.handR` toward `J.kneeL`/`J.kneeR`) at stoppages when stamina is under 25 |
| keeper set | engine | `pose: 'guard'`, crouch .3 |
| keeper dive | procedural | tilt ±(70–95)° about `forward` (pivot feet), lifted 2 (low) to 14 (high) on an arc; lateral speed 260 easing to 0; hands IK'd (`E.ik3`) to the ball's point; then `down` on the side; up with `Get_Up_From_Side` |
| keeper catch / parry / tip | procedural / engine | hands to the chest (catch); `jab` toward the ball (parry); one arm up with a jump (tip) |
| keeper throw | mocap | `OverhandThrow`; an underarm roll as a spec with the arm low |
| smother | procedural | a low forward dive (tilt +80° about `right`, lift 2) |
| celebrations | mocap + procedural | knee slide: `Slide_Loop` with arms out (post-process); `Backflip`; `Cartwheel`; aeroplane: run with the arms horizontal (post-process) and a lean into the turn; robot: `Dance_Simple` at 0.6× speed with the arms bent square (post-process); shirt over head: `hood: true` with the hood in the shirt colour plus `Cheering_Two_Hands`; corner-flag dance: `Dance_Simple`; badge kiss: `Greeting`; helicopter: `Breakdance_Helicopter`; fish slap: two players face each other, alternating `jab` with a kipper sprite in the hand; pile-on: teammates `Victory` / `Cheer_One_arm` |
| referee | engine + procedural | whistle (hand to mouth), points to the spot (`point: true`), the card raised high (hand above the head; the card sprite at `rig.hand('R')`), advantage (both arms forward), the VAR rectangle (both hands trace a box), hand to the ear; knocked over by the ball (`Fall_On_Face`, then up) |
| manager | mocap | pacing (gait), `Angry` (conceding), `Victory` (scoring), `Help_Two_Arms` (instructions), `Cheering_Two_Hands` |
| tunnel and handshakes | engine + procedural | a walk; an arm forward (`point: true`) as the lines pass |
| crowd front rows | engine | classic-style rigs with `pose: 'cheer'`, `wave`, arms down for boos |

Check every attack and every procedural move with `tools/filmstrip.mjs` (§11.7): a wind-up, a strike, and a settle
without jerks or backward sweeps.

---

## 9. Build order and milestones

Each milestone ends with its tests passing (`node tools/test.mjs`), the build working, and a short note in the dev
folder's `PROGRESS.md`. Do them in order: each one builds on the last, and the risky parts come early.

**M0 — Setup (½ day).** The dev folder; the engine copied; `vendor/` filled; `package.json`; `tools/build.mjs`
producing `build/game.js`, the dev page and the deliverable; `tools/test.mjs` with its vm loader and one smoke test;
the SPORTS kit's game (`kits/sports.js`) copied in as a single first fragment (its own IIFE wrapper removed, since the
build adds one) and running through the pipeline (proof: its `run(600)` hash is the same twice). From M1 on it is
replaced, piece by piece, by the fragments of §4.2.
*Done when:* `node tools/build.mjs && node tools/test.mjs` passes, and `node tools/check.mjs` on the deliverable shows
the kit's cage match.

**M1 — The football sandbox (the feel).** The broadcast view; the pitch geometry and TileMap (§6.1); the ball (§6.2);
5-a-side footballers with movement, stamina and dribbling (§6.3); pass, through, lob, one-two (§6.4); shooting with
the meter, sweet spot, aim, curl and chip (§6.5, without air moves); possession; goals; kickoffs; a temporary formation
AI (the kit's, widened to 5); the camera director (§6.14); the score bug and power meter; `EF.T` with the TUNE tab only
(a minimal dev panel); the Intent architecture with `HumanController`, `BotController` and `ScriptController`.
*Done when:* a human can play a goal-scoring match against the CPU that already feels good; the physics unit tests
pass (§11.3).

**M2 — Characters and animation (risky; early).** Engine changes §5.2 (kit patterns) and §5.3 (tilt); the clip set
cut and loaded; every animation row of §8.3 for outfield players and keepers; kits for all 6 teams.
*Done when:* filmstrips of the pass, the shot, the slide, the launched victim, the keeper's low and high dives, the
header, the bicycle kick, the dive and 3 celebrations look right (§11.7).

**M3 — The rest of football.** Air moves (§6.5), skill moves (§6.6), defending (§6.7), keepers in full (§6.8), the
rules machine (§6.12: the clock, stoppage, halves, extra time, the shootout), set pieces (§6.11), the referee, fouls,
advantage, cards, theatrics and VAR (§6.10).
*Done when:* the rules and set-piece tests pass, and an AI-versus-AI match produces corners, free kicks, cards and
penalties.

**M4 — Team AI and balance.** TeamBrains with formations, tactics and gimmicks (§6.13, §7.1); difficulty; the AI overlay
in dev mode; the soak test (§11.4) tuned to its targets.
*Done when:* 20 seeded AI-versus-AI matches per tactic pair meet the soak targets.

**M5 — The over-the-top layer.** Euphoria, Europhoria, Super Strikes (all 7 paths), the Save Duel (§6.9); the bus;
celebrations (§6.21); cinematics.
*Done when:* every super strike's test passes and the Save Duel's timing windows are exact.

**M6 — Presentation.** The 6 stadiums (§7.2) with stands, skylines, lights and weather (§6.19); the crowd view and mood
(§6.18); matchday events (§6.20); replays (§6.15); the HUD in full (§6.16); the commentary director and its lines
(§6.17, §7.4); audio in full: songs, SFX, the crowd engine, chants, babble voices (§6.22, engine changes §5.1, §5.4,
§5.5).
*Done when:* screenshots of each stadium at its time of day look right, and the audio smoke test plays without
errors.

**M7 — Front end and 10-foot UI.** The UI kit (§6.23), glyphs and prompts (§2.3), title, Kick-About setup with the
controller side picker (§6.27), results, settings integration (§6.31), touch-only (§6.33), About (§6.32).
*Done when:* every screen can be used with a pad only, a keyboard only, and a mouse only (scripted UI tests, §11.3).

**M8 — The Cup Run.** The beat player and its step kinds, tabloids, the travel map, team talks, challenges, stickers,
the album, saves, the ending with the ceremony, the parade and the credits (§6.24, §7.3, §7.5).
*Done when:* the scripted full playthrough passes (§11.5).

**M9 — Training and Penalties.** The 9 drills (§6.25, §7.6) and Penalties mode (§6.26).
*Done when:* each drill's scripted solve passes.

**M10 — Attract and dev mode.** The idle watcher and the attract director (§6.29); dev mode in full (§6.30).
*Done when:* the attract tests pass (it starts at 10.0 s, shows every segment, and any input exits) and every WARP
entry runs without errors.

**M11 — AI Hub online.** §6.28 in full; the fake-hub loopback tests (§11.6), then the real harness in Chromium.
*Done when:* `window.__hubCheck.pass` is true for 2 players, for 4 players with latency 150, jitter 50 and loss 5,
for the host-leave scenario, and for the server scenario.

**M12 — Bundle, polish, hand-back.** The final build; the full test pass; the look notes from `tools/check.mjs` acted
on; screenshots reviewed; `exit-interview.json` written and validated; the About pages generated from it; the chat
reply (§12).

---

## 10. Risks and how to de-risk them

| Risk | Why it is risky | De-risk |
|---|---|---|
| **Football-specific animation** (keeper dives, bicycle kicks, diving headers, dives) | The rig has no such moves; a bad dive ruins the game's look | M2 is early. Build the tilt state first, on one rig, in a test scene (`#dev` with an animation gallery: every move on a loop, every view). Filmstrip each move. Fallbacks: the built-in `flip` roll and `down`, sideways `Dodge_*_RM`, `Dive_Roll` from CMU |
| **Kit patterns in the engine's torso painter** | It is drawn code inside the rig | A self-contained change behind `o.kit`; fallback: solid shirts with trim and no numbers (§5.2) |
| **AI quality with 10 players** | Bad AI makes matches dull or broken: clumps, stuck players, no shots | A parametric formation model and utility scoring (§6.13), not ad hoc rules; the AI overlay; the soak test with numeric targets (§11.4) from M4 on |
| **The feel of ball control** | Sticky ball versus loose ball; passes that miss | Dev sliders from M1; unit tests for pass accuracy; play it often from M1 |
| **Netcode under latency and loss** | Shared-world football has a contested ball | Host authority with interpolation, input counters that survive loss, and the rate budget (§6.28, Appendix B). The sim/presentation split is in place from M1. Build a loopback fake hub with latency, jitter and loss in Node first (§11.6), then the real harness |
| **Hub protocol details** (the card, ready, server mode, time-up, end) | The hub keeps a game that fails its check out of sessions | Follow the README's checklist line by line; run the harness's automatic check for every scenario it lists (§11.6) |
| **Audio synthesis** (the crowd and babble) | WebAudio code is easy to get wrong, and silent in tests | One audio smoke page (`#dev` → sound test: every SFX, song, chant and voice on a list); headless no-ops tested; one screenshot-free check that no audio errors reach `game.errors` |
| **Many systems, one IIFE** | Name clashes, load-order bugs | Numbered fragments with one namespace; the content validator; the full playthrough test |
| **Scope** | It is a lot of game | Data-driven content; the milestone order puts the core first; each milestone ends playable. The list in §12 is the scope: build all of it, but do the core well before the extras are polished |
| **Determinism** (tests and replays) | `Math.random` in sim code breaks proofs | A lint test greps `src/` for `Math.random` outside cosmetic code; the determinism test (§11.4) |
| **Bundle correctness** | `</script>` in inlined code; the order of hub metas and `session.js` | The build checks both; a test parses the deliverable's `<head>` order (§11.8) |

---

## 11. Testing

### 11.1 The one command

`node tools/test.mjs` runs every suite and prints **only failures** (one line each: `FAIL <suite> <test>: <detail>`) and
one last line: `Europhoria tests: <passed> passed, <failed> failed (<seconds> s)`. It exits with 1 on any failure.
`node tools/test.mjs <suite> [...]` runs only the named suites, so after a change you rerun only the suites that cover
it. The suites: `unit`, `rules`, `ai`, `content`, `ui`, `saves`, `attract`, `dev`, `playthrough`, `determinism`,
`hubsim` (Node), then `browser`, `hub` (Playwright; skipped with a note if Chromium is missing). Don't use subagents or
workflows to review or judge anything: the tests and screenshots are the judges.

### 11.2 Headless harness

`tools/lib/load.mjs` creates a vm context with the stand-ins the kits' test uses (`window` = the context,
`addEventListener` as a no-op, `location: { hash, search }`), plus `matchMedia` (returns `{ matches: false,
addEventListener() {} }`), `navigator` (`{ maxTouchPoints: 0, getGamepads: () => [] }`), and `performance`. It runs
`vendor/session.js` first (in Node it stays inactive: no parent frame), then the engine, the mocap scripts, the clip
set and `build/game.js`. It returns `{ E, game, EF, I: game.input, snap: () => game.debug.snapshot() }`.
`game.advance(seconds)` steps exactly. `input.tap` and `input.hold` press actions. `EF.test` gives the setup hooks:
`startMatch({ home, away, stadium, seed, halfLength, humans })`, `giveBall(side, idx, x, y)`, `place(id, x, y)`,
`setEuphoria(side, v)`, `forceShot(...)`, `simUntil(predicate, maxSeconds)`, `cheat(name, on)`.

`game.debug.snapshot()` returns `{ scene, part, mode, half, clock, minute, stoppage, score, ball: [x, y, z], owner,
humans: [{ p, id, name, x, y, state }], euphoria: [a, b], europhoria, cards, sentOff, setpiece, shootout, stadium,
weather, cup: { round, results }, attract: { active, segment, idle }, dev: { open, changed }, hub: { active, role,
sent, received }, ui: { screen, focus }, errors: game.errors.length }`. `game.debug.teleport(x, y, z)` moves the
controlled footballer. Every test also checks that `game.errors` stayed empty.

### 11.3 Unit and system tests (Node)

- **unit/ball:** a pass at a moving receiver arrives within 8 units of him, for 50 seeded cases; curl turns a shot by
  the expected angle, ±10%; bounces off the boards keep within the bounce factor; each post and the bar reflect; the
  goal-line test with the ball over the line by r − 1 (no goal) and r + 1 (goal); a ball over the bar gives no goal;
  the net stops the ball within 0.5 s; each surface's friction order (mud < snow < grass < hard < wet in rolling
  distance, shortest to longest).
- **unit/input:** `Input.halfKeys(EF.KEYS, 'left')` puts `pass … dive` on F G H R T Y V B and `'right'` puts them on
  . / , L ; ' K M; the `switch` + `skill` chord fires `euphoria` on a half keyboard and on a pad (L1 + R1); Space
  fires it on a full keyboard; mouse buttons do nothing while mouse aim is off.
- **unit/footballer:** sprint drains and regains stamina at the set rates; turning with the ball slows him; each skill
  move's success rule at the probability extremes (with a fixed rng); the air-ball window chooses header, volley,
  bicycle or diving header by height and facing; the receiver picked by the stick direction for 8 directions;
  pass-assist cones.
- **unit/keeper:** save chance falls as shot speed rises and as the target moves to the corners; a catch under 260 well
  reached; parries go away from the goal centre; tips over the bar give corners.
- **rules:** the corner versus goal kick by last touch; the crowd throw-back side; a foul from behind is a foul and one
  from the front with the ball first is not; severities give yellow, red, and a second yellow → red; a sent-off side
  plays with 3 and drops the formation's `drop` role; advantage plays on when possession stays; a penalty for a foul in
  the box; VAR overturns only soft penalties; the clock maps 2:00 real time to 45 game minutes; stoppage time is within
  1–5; extra time is golden goal; the shootout ends early when a side can't catch up and goes to sudden death after 5
  each; the shirt-over-head celebration gives a yellow.
- **euphoria:** every gain in the table; decay; thresholds; Europhoria lasts 8 s; one super a Europhoria; each super path
  reaches the goal mouth from 230 out with no errors (7 cases); Save Duel windows: a press at the target ±59 ms is
  PERFECT, ±61 ms is GOOD, ±141 ms is MISS.
- **ai:** players reach their formation spots within 1.5 s when the ball is placed (each formation, each phase); the
  pressing count matches the tactic; the ball carrier never stands still for more than 2 s; the bus appears for
  Lucchetto when leading after 60' and not otherwise; Opulence's Golden Moment fires at 80' when behind or level.
- **content:** `EF.validate()` reports nothing; every team has 5 players with one captain and one GK; every captain has
  a registered super; every stadium's events exist; every beat's team, stadium and photo exist; every drill's steps
  run; every text uses only characters the font can draw; every commentary pool for a major event has at least 12
  lines; at least 300 lines in total; every sticker is reachable (its `how` refers to an event that exists).
- **ui:** with only pad actions (`input.tap('down')`, `'confirm'`, `'cancel'`) a script can reach every screen from the
  title and back. With only the mouse (`input.feed('move', x, y)` and clicks at a widget's centre) every menu item can
  be focused by hover and picked by click. The keyboard (`press('ArrowDown')`, `press('Enter')`) does the same.
  `EF.prompt` gives PlayStation icons for pad codes by default and Xbox after `game.settings.set('glyphs', 'xbox')`;
  keycaps when `lastDevice` is the keyboard; mouse icons when it is the mouse. Touch-only (`?touchonly=1`): the title
  shows the notice and the SETTINGS button, and the play tiles cannot start a match.
- **saves:** a write/read round trip; a migration from a v0 shape; CONTINUE resumes at the right round; dev unlocks only
  after their confirm.
- **attract:** at the title, `advance(9.9)` leaves it on the title; `advance(0.2)` more starts `attract`; during the
  attract run every segment shows (snapshot `attract.segment` over 95 s: all 6); `input.tap('confirm')`, a key press, a
  mouse move and a pad axis each return to the title, and that press does not pick a menu item.
- **dev:** every slider changes `EF.T` and a match responds (for example `runSpeed` 120 → a sprint covers more ground in
  1 s); RESET ALL restores every default exactly; every WARP entry runs with no errors; dev mode cannot open when the
  fake hub says `active`.

### 11.4 Balance soak and determinism

- **soak** (part of `ai`, tagged slow; run it after AI changes): 20 seeded AI-versus-AI matches at a half length of
  60 s, for each of 4 pairings (each tactic once against Kipperton at Normal). Targets per match on average: 2–7 goals,
  8–20 shots, 55–85% pass completion, possession 35–65% for each side, at least 1 corner and 1 free kick in 4 matches,
  no player stuck (no movement for more than 4 s in play), no ball stuck (not moving and not owned for more than 3 s in
  play). It reports the averages, so tuning has numbers to work with.
- **determinism:** a scripted match (the kit's `proof()` pattern: a seed, scripted inputs for 1,800 steps) hashed twice
  gives the same hash. Then a replay re-run gives the same final state hash as the live run.
- **lint:** no `Math.random` in sim files (`10-`..`18-`, `20-`); no `ctx.arc`, `ctx.stroke`, `ctx.fillText` or canvas
  gradients on the game buffer; no `alert`, `confirm`, `prompt`, `window.open`, `fetch`, `WebSocket` or `RTCPeerConnection`.

### 11.5 The scripted playthrough (the whole game)

`playthrough` runs the whole game headless, as a player would, through the real scenes and the real input. It drives
the human with a **bot**: the kit's approach (`SPORTS.bot()`) of asking the CPU brain what it would do and giving
that as the stick and buttons, plus scripted forcing where a beat needs it. Half length 30 s; difficulty Easy; the
"Euphoria always full" cheat is off.

1. The title, then CUP RUN, NEW CUP RUN; the prologue's beats are advanced with `confirm`; LET'S PLAY.
2. For each round: the bracket, the tabloid, the travel map, the talk, a team talk (cycling the 3 kinds over the
   rounds), the challenge card, the tunnel. Then the match, played by the bot to the final whistle. If the bot loses or
   draws, `EF.test` grants a win through the real path: it plays on with the "Euphoria always full" and "invincible
   keeper" cheats, and records that it did so. Then the results, stickers, the autosave, and the post-match beats.
3. The semi-final must show the bus at least once (forced: a Lucchetto lead after 60' by the dev goal cheat). The
   villain beat takes the loyal choice.
4. The final, then the ending: the ceremony, the parade, the tabloid, the credits, then the title.
5. Then: CONTINUE is gone or points to a finished cup; the album shows the earned stickers; Kick-About with 2 local
   players (one on each side) plays 20 s; PENALTIES plays a full shootout; TRAINING solves drill 1 by script; ABOUT
   pages through to the end; the attract mode starts after 10 s idle and exits on a key.
6. Checks along the way: the snapshot's scene at every step; no errors; the save after each round; each round's
   challenge events seen; at least one corner, one free kick, one card, one super strike and one replay over the run.

Target time: under 2 minutes headless. It is the slowest suite, so run it after changes to flow, scenes, the cup, saves
or content.

### 11.6 Online tests

- **hubsim (Node):** a fake hub (`tools/lib/fakehub.mjs`) implements the client API (`connect`, `ready`, `answer`, `on`,
  `send`, `time`, `finish`, `progress`, `rng`, `active`, `isHost`, `server`, `players`) between 2–4 vm contexts, with a
  network of set latency, jitter and loss. It steps all copies in lockstep with `game.advance`. Checks: each copy reaches
  the card with no key press and calls `ready()`; `answer('ready')` on Enter; the match starts on `start` and play waits
  for time ≥ 0; the host's message rate stays at 20/s or under, with bursts under 40, and every message is under 16 KB
  (snapshots under 1,100 bytes); with 150 ms latency, 50 ms jitter and 5% loss, a client's drawn ball stays within 24
  units of the host's 95% of the time; a press is never lost (counters); a goal on the host shows on every client within
  0.5 s; `leave` hands a footballer to the CPU; `time-up` makes the host finish at once; `finish`'s standings put the
  winners first and tie a draw; the server mode runs with no local player and draws nothing; on `end`, input, sending and
  sound stop; host-left shows ROUND VOID.
- **hub (Playwright):** the real harness. Copy `harness.html`, `bridge.js` and `round.js` into `tools/harness/`. Start a
  server for the **work root**, bound to localhost on a port the OS picks, in the background, and remember its PID:
  `python3 -m http.server 0 --bind 127.0.0.1 --directory <work root>`. Read the port from its first output line
  ("Serving HTTP on 127.0.0.1 port N"). Fetch
  `http://127.0.0.1:N/EurophoriaFootball-EuropeanFootball-claude-opus-5-5-max-20261103-174834.html` and check that its
  `<title>` is "Europhoria Football" before trusting any result (another process could hold the port). Then open, in
  turn:
  - `http://127.0.0.1:N/<dev folder>/tools/harness/harness.html?game=/<game>.html&players=2&auto=1`
  - `...&players=4&latency=150&jitter=50&loss=5&auto=1`
  - `...&players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave`
  - `...&players=2&scenario=server&auto=1`

  Wait for `document.body.dataset.complete === 'true'`, then assert `window.__hubCheck.pass === true`. Print the failed
  checklist lines on failure. Then open the game alone (no session) and check that it reaches the title with no errors.
  Stop the server with `kill <PID>` (only that PID; never `pkill`, `killall` or `fuser -k`).

### 11.7 Browser checks and screenshots (only for what a script can't check)

- `browser` suite: `node tools/check.mjs <deliverable>` (errors, coverage, the look notes; act on every look note), at
  1280×720, at 1920×1080, and at 390×844@3 with `?touchonly=1`. Deep links: `#match`, `#match/euphorium`,
  `#match/stahlpresse`, `#cup/r1`, `#ending`, `#album`, `#about`, `#attract`. It also checks that the page made no
  external requests.
- **Filmstrips** (`tools/filmstrip.mjs ... --seed 1 --crop ...`), each looked at by eye after the animation code
  changes: pass, shot (low and high power), volley, header, bicycle kick, diving header, slide, poke, barge, the
  launched victim, the get-ups, the keeper's low dive, high dive, catch, parry, tip and throw, the theatrical dive, each
  skill move, each celebration, the referee's card and VAR, a super strike of each path. Use the dev gallery's deep
  links (`#dev/anim/<move>`) so each strip starts on the move.
- **Screenshots** by eye: each stadium at its time of day, in each camera view; the title; every front-end screen
  (10-foot legibility: compare the text size to §6.23's minimums at 1920×1080); the tabloid; the album; the HUD during
  Europhoria; fog; rain; snow.

### 11.8 Bundle checks (part of `browser`)

The deliverable exists in the work root under its exact name. Its `<head>` starts with `<meta charset="utf-8">`, then
the `session.js` script, and that script is byte-identical to `vendor/session.js`. The hub metas are present with the
values in §3.3, and `hub:session-howto` is at most 80 characters. No external URLs are loaded. It runs from `file://`.
`exit-interview.json` parses, has every key of TASK.md's shape, has no empty value, uses a genre from the allowed list,
and has 3–6 lowercase tags.

---

## 12. Definition of done and hand-back

**Done means all of this is in and working, with no TODOs, placeholders or stubbed features:**

- [ ] The cup run: prologue, 5 rounds with their beats, team talks, challenges, the villain beat, the ending with the
      ceremony, the parade and the credits; losing and CONTINUE; saves and CONTINUE.
- [ ] Kick-About with all 6 teams and 5 stadiums, conditions, ball styles, 1–4 local players in co-op or versus.
- [ ] Penalties mode; Training with 9 drills; the Sticker Album with 51 stickers; About & Credits.
- [ ] Every mechanic of §6.3–§6.12 and §6.21; the team AI with 5 tactic profiles and gimmicks; 4 difficulties.
- [ ] Euphoria, Europhoria, 7 super-strike paths, the Save Duel.
- [ ] 6 stadiums with weather and lighting; crowd states, chants, the tifo and flares; 6 matchday events; replays; the
      HUD; commentary with 300+ lines; the PA.
- [ ] All audio in code: 15 songs, the SFX list, the crowd engine, chants, babble voices; no audio files.
- [ ] Controls for pad (PlayStation glyphs by default, Xbox in Settings), keyboard and mouse; prompts follow the last
      device; touch-only devices get the notice and the settings button.
- [ ] The attract mode after 10 s idle on the title and menus; any input exits.
- [ ] Dev mode from the pause menu (and `` ` `` / F1): TUNE sliders with reset to defaults, CHEATS, WARP (with the
      animation and sound galleries), INFO.
- [ ] AI Hub shared-world sessions passing the harness in all 4 runs; the game unchanged outside sessions.
- [ ] `node tools/test.mjs` passes in full; the screenshots and filmstrips have been looked at.
- [ ] The single HTML file in the work root; `exit-interview.json` beside it; `engine/CHANGES-ENGINE.md` written.

**Hand-back** (TASK.md's "Source Information" section and exit interview):

1. Write `exit-interview.json` in the work root, in TASK.md's exact shape. Fill every value (write "unknown" where you
   cannot confirm something), use plain text, and check that it parses. Suggested `aiHub` values: name "Europhoria
   Football"; tagline "Over-the-top arcade football"; description "A broke seaside club rides its fans' euphoria
   through Europe's grandest cup: 5-a-side arcade football with super strikes, dives, VAR and a crowd that powers your
   team."; type "Game"; genre "Sports"; source "European football"; series ""; players "1–4"; controls "Stick/WASD move
   · ✕/J pass · □/K shoot · ○/L lob · R1/E skill · R2/Shift sprint · L1+R1/Space Europhoria"; tags e.g. ["arcade",
   "pixel art", "comedy", "versus", "co-op", "retro"].
2. Source Information values: Date "2026-11-03 17:48:34"; Source "European football (over the top arcade style)";
   Plan "PLAN.md"; Genre and Perspective "arcade 5-a-side football with a story cup run; TV-broadcast side-on camera
   (40°), with classic three-quarter and aerial options"; Tech "my-3D2dge v0.85.2 (handoff package, modified: see
   CHANGES-ENGINE.md), its mocap player and clips (Quaternius, Mesh2Motion, CMU), AI Hub session client 1.4.0, plain
   JavaScript; Node 24 and Playwright 1.63 for tests"; Art Direction "my-3D2dge's native PS1-era pixel art with HD
   Humanoid rigs; new kits, stadiums, crowds, crests, tabloids"; Animation "the engine's procedural Humanoid rig with
   mocap clips through Mocap.drive and new procedural moves (body tilt)"; Audio "the engine's chip synth for music and
   SFX, plus a WebAudio crowd engine, sung chants and Animalese-style babble voices; no audio files"; Online "AI Hub
   Session Protocol v1, shared-world, 2–4 players"; Testing, Research, Environment ("Claude Code CLI (headless); Linux;
   browser unknown" unless known), Model, Usage: fill in from the build. For Research, the planning stage read the
   engine's handoff docs (README, API.md, parts of AI_GUIDE.md, docs/ASSETS.md, docs/MOCAP.md), the SPORTS kit, the
   template game and its test, the mocap catalogs, and the AI Hub's README, session.js, retrofit.md and arena example.
   Add whatever the build stage reads.
3. Rebuild so the About pages carry the same text (§3.3), and rerun the `browser` suite.
4. Reply in chat with the Source Information, Testing Feedback, Engine Feedback and Prompt Feedback (the same answers as
   the JSON), and a short summary.

---

## Appendix A: tuning defaults (dev sliders)

| Key | Default | Min | Max | Step | Group | What it does |
|---|---|---|---|---|---|---|
| `runSpeed` | 88 | 60 | 130 | 1 | Movement | base run speed (u/s), before the pace stat |
| `sprintMul` | 1.45 | 1.1 | 2.0 | .05 | Movement | sprint multiplier |
| `accel` | 900 | 300 | 2000 | 50 | Movement | acceleration (u/s²) |
| `staminaDrain` | 20 | 5 | 50 | 1 | Movement | per second of sprint |
| `staminaRegen` | 14 | 5 | 40 | 1 | Movement | per second at rest |
| `ballFriction` | 1.1 | .3 | 3 | .05 | Ball | rolling decay on grass |
| `ballBounce` | .55 | .1 | .9 | .05 | Ball | restitution on grass |
| `ballGravity` | 600 | 300 | 1000 | 10 | Ball | |
| `trapSpeed` | 210 | 120 | 320 | 5 | Ball | the fastest ball trapped at 9 units |
| `passSpeedMin` | 150 | 80 | 250 | 5 | Passing & Shooting | |
| `passSpeedMax` | 300 | 200 | 450 | 5 | Passing & Shooting | |
| `passAssistDeg` | 70 | 0 | 90 | 5 | Passing & Shooting | the High pass-assist cone |
| `shotChargeTime` | .8 | .3 | 2 | .05 | Passing & Shooting | seconds to full power |
| `shotSpeedMax` | 420 | 250 | 600 | 10 | Passing & Shooting | |
| `curlStrength` | 3.2 | 0 | 8 | .1 | Passing & Shooting | aftertouch spin per second |
| `keeperReaction` | .18 | .05 | .5 | .01 | Keepers | seconds |
| `keeperReach` | 48 | 24 | 80 | 1 | Keepers | lateral dive reach |
| `tackleReach` | 9 | 4 | 16 | .5 | Defending & Rules | |
| `slideSpeed` | 190 | 100 | 300 | 5 | Defending & Rules | |
| `foulStrictness` | 1 | 0 | 2 | .05 | Defending & Rules | × the referee's own |
| `diveSuccess` | 1 | 0 | 2 | .05 | Defending & Rules | × the referee's gullibility |
| `euphoriaGain` | 1 | 0 | 4 | .1 | Euphoria | × every gain |
| `euphoriaDecay` | 1.5 | 0 | 6 | .1 | Euphoria | per second |
| `europhoriaTime` | 8 | 3 | 20 | .5 | Euphoria | seconds |
| `superSpeed` | 520 | 300 | 800 | 10 | Euphoria | |
| `aiReaction` | .25 | .05 | .8 | .01 | AI | seconds between decisions (Normal; difficulty scales it) |
| `aiAccuracy` | .8 | .3 | 1 | .05 | AI | |
| `aiAggression` | .5 | 0 | 1 | .05 | AI | |
| `halfLength` | 120 | 20 | 300 | 10 | Match | real seconds (Settings sets it; the slider overrides it while changed) |
| `gameSpeed` | 1 | .25 | 2 | .05 | Match | `game.timeScale` |

## Appendix B: network messages

All JSON. Numbers rounded (positions to integers, angles in hundredths of a radian).

- **Client → host, `i` (input), unreliable, 15/s:**
  `{ t: 'i', s: seq, at: Math.round(AIHub.time()), m: [mx100, my100], a: [ax100, ay100] | 0, h: heldBits, c: [pass, shoot, lob, through, skill, sw, dive, euphoria] }`.
  `heldBits`: 1 sprint, 2 pass, 4 shoot, 8 lob, 16 through, 32 skill, 64 sw, 128 dive. `c` holds cumulative press
  counts since the round started: the host takes `c[k] > last[k]` as a press, so a lost packet loses no presses. The
  host keeps the newest by `s`.
- **Client → host, reliable, rare:** `{ t: 'duel', id, at }` (the Save Duel press, in `AIHub.time()` ms);
  `{ t: 'cel', k: 0..3 }` (the celebration pick); `{ t: 'menu', open: true|false }` (the settings overlay: the host
  gives that footballer to the CPU while open).
- **Host → all, `s` (snapshot), unreliable, 14/s, under 1,100 bytes:**
  `{ t: 's', n, at, b: [x, y, z, vx, vy, vz, spin100, owner], p: [[x, y, z, vx, vy, f100, st, act, u100, flags], ×10],
  r: [x, y, f100, st], m: [mode, clock10, minute, s0, s1, eu0, eu1, euSide, euT10, setpiece], c: [[hubId, footballerIdx], ...] }`.
  `st` and `act` are small integer codes from a shared table; `flags` packs cards, glow, human-held and down.
- **Host → all, `E` (events), reliable, at most 5/s:** `{ t: 'E', n, list: [[eventSeq, at, type, data], ...] }`,
  coalescing the events of up to 200 ms: goal, whistle, card, VAR, commentary line ids (so every copy shows the same
  lines), sfx cues, the super strike's start, the duel's start, celebrations, set-piece starts, half time, full time.
  Clients apply each `eventSeq` once, in order.
- **Host → all, last:** a reliable `s` with `over: 1`, then `AIHub.finish(...)`.

## Appendix C: data shapes

```js
EF.def('team', 'kipperton', { name: 'KIPPERTON ATHLETIC', short: 'KIP', nick: 'THE KIPPERS', city: 'KIPPERTON',
  stadium: 'smokehouse', formation: '2-1-1', tactic: 'plucky', chant: 'kipperton', celebration: 'fishslap',
  crowd: { factor: 1 }, manager: 'mags',
  kits: { home: { shirt: '#f08a24', color2: '#1c2a5a', pattern: 'hoops', shorts: '#1c2a5a', socks: '#f08a24', number: '#ffffff' },
          away: { shirt: '#eef0f4', color2: '#f08a24', pattern: 'sash', shorts: '#eef0f4', socks: '#1c2a5a', number: '#1c2a5a' },
          keeper: { shirt: '#3ac06a', color2: '#1a5a30', pattern: 'plain', shorts: '#1a1a1a', socks: '#3ac06a', glove: '#f4f4f0' } },
  crest: { shape: 'shield', field: '#1c2a5a', ring: '#f08a24', charges: ['kipper', 'anchor'] },
  players: [
    { id: 'crabb', name: 'WALLY CRABB', num: 1, pos: 'GK', build: 'bulky', size: 1.2, hair: 'bald', skin: '#e0b090', hairColor: '#c8c8c8',
      stats: { pace: 60, shoot: 30, pass: 55, tackle: 40, skill: 20, keep: 76, weight: 80, temper: 30 }, voice: { f0: 120, wave: 'pulse' } },
    { id: 'pilchard', name: 'DAZ PILCHARD', num: 9, pos: 'FWD', captain: true, super: 'smoked-kipper', build: 'heroic', size: 1.15,
      hair: 'short', skin: '#f0c8a8', hairColor: '#5a3a22', stats: { pace: 80, shoot: 90, pass: 70, tackle: 45, skill: 75, keep: 10, weight: 60, temper: 50 },
      voice: { f0: 150, wave: 'saw' }, celebration: 'fishslap' } /* ...3 more */ ] });

EF.def('formation', '1-2-1', { roles: {
  GK: { base: [.03, .5], keeper: true },
  DEF: { base: [.22, .5], att: [.14, 0], def: [0, 0], pull: [.45, .55], uRange: [.08, .62] },
  MIDL: { base: [.42, .28], att: [.12, -.06], def: [-.12, .04], pull: [.55, .45], uRange: [.15, .85] },
  MIDR: { base: [.42, .72], att: [.12, .06], def: [-.12, -.04], pull: [.55, .45], uRange: [.15, .85] },
  FWD: { base: [.64, .5], att: [.18, 0], def: [-.12, 0], pull: [.5, .6], uRange: [.35, .95] } }, drop: 'MIDR' });

EF.def('tactic', 'keepball', { press: .55, pressers: 1, line: .5, width: .6, tempo: .85, passRisk: .2, shortBias: .9,
  longBall: .05, dribble: .25, skill: .3, shootRange: 170, shootBias: .8, foul: .1, dive: .1, euphoriaUse: 'attack', gimmick: 'keepball' });

EF.def('referee', 'severo', { name: 'SERGIO SEVERO', strictness: 1.2, gullibility: .7, varHappy: .9, voice: { f0: 135, wave: 'saw' } });

EF.def('stadium', 'smokehouse', { name: 'THE SMOKEHOUSE', city: 'KIPPERTON', capacity: 3112, time: 'dusk',
  weather: { kind: 'rain', amount: .7, wind: .4 }, surface: 'wet', mud: [[.06, .5, 40], [.94, .5, 40]], puddles: 6,
  grass: ['#3f7a34', '#4a8a3c'], wear: .6, lines: '#e8ece0',
  stands: { north: { tiers: 3, roof: 'corrugated', seats: '#3a3a48' }, west: { tiers: 2, kind: 'terrace' }, east: { tiers: 2, kind: 'terrace' } },
  crowd: { size: 600, home: .8 }, skyline: [['chimney', .12, 90, { smoke: true }], ['lighthouse', .85, 120, { beam: true }]],
  lights: { ambient: .55, floodlights: 4, color: '#fff0d0' }, boards: ["SMOKY JOE'S KIPPERS", 'GULL INSURANCE: WE COVER EVERYTHING', 'PIE-O-MATIC'],
  events: ['seagull', 'floodlight', 'invader-keith'], music: null });

EF.def('super', 'smoked-kipper', { name: 'THE SMOKED KIPPER', path: 'wobble', params: { amp: 18, freq: 7 }, trail: 'smoke',
  color: '#f08a24', ball: 'kipper', sfx: 'super-kipper', lines: 'super-kipper' });

EF.def('celebration', 'kneeslide', { name: 'KNEE SLIDE', clip: 'Slide_Loop', proc: 'armsOut', travel: { speed: 120, t: 1.1 },
  euphoria: 8, crowd: 'roar' });

EF.def('event', 'seagull', { stadiums: ['smokehouse'], chance: .6, when: { minute: [10, 80], ballLoose: true, notSetPiece: true },
  start(m) { /* spawn the gull on the ball */ },
  update(m, dt) { /* pin the ball; flap away when a player is within 10 */ return this.gone; },   // true when finished
  lines: 'event-seagull' });

EF.def('drill', 'passing', { title: 'PASS MASTER', coach: 'mags', stadium: 'rec', teaches: ['pass', 'through', 'oneTwo'],
  setup(m) { /* two teammates, cones */ },
  steps: [ { say: ['Five passes. Feet, not faces.'], goal: { event: 'passDone', count: 5 } },
           { say: ['Now a through ball. Into space.'], goal: { event: 'passDone', where: { kind: 'through' }, count: 2 } },
           { say: ['One-two. Give it and go.'], goal: { event: 'passDone', where: { kind: 'oneTwo' }, count: 1 } } ],
  reward: { sticker: null } });

EF.def('beat', 'r2-pre', { round: 2, steps: [
  { kind: 'travel', to: 'solera', postcard: "WISH YOU WERE HERE (IT'S HOT)" },
  { kind: 'tabloid', headline: 'PASS THE PARCEL', sub: 'Kippers must stop the passing masters... if they can find the ball.',
    photo: { team: 'pasapasa', player: 'pasarela', pose: 'hips', expr: 'smile' } },
  { kind: 'talk', lines: [['pasarela', 'You will chase the ball until you are dizzy, little fishes.']] },
  { kind: 'teamtalk' }, { kind: 'challenge', id: 'recover5' }, { kind: 'tunnel' }, { kind: 'match' } ] });

// EF.lines(pool, entries) is shorthand for EF.def('lines', pool, entries)
EF.lines('goal', [
  { who: 'barry', text: 'OH, YOU BEAUTY! {$player} has absolutely LEATHERED it!' },
  { who: 'barry', text: 'GET IN! Back of the net from {$player}!', reply: { who: 'trev', text: 'Keeper had no chance. None. Nada. Zilch.' } },
  { who: 'barry', text: 'OH MY COD! KIPPERTON HAVE SCORED!', when: m => m.lastGoal.team === 'kipperton' } ]);
```

## Appendix D: music sketches

Starting points in the engine's song format (`audio.music(song)`); refine by ear. All of them are original.

**`anthem`** (108 bpm, `steps: 2`, so each token is an eighth note; 8 bars, then loop):

```js
{ bpm: 108, steps: 2, tracks: [
  { name: 'lead', wave: 'pulse', vol: .12, notes:
    'G4 - C5 - E5 - G5 - | F5 - E5 D5 E5 - C5 - | A4 - D5 - F5 - A5 - | G5 - - - - - . . | E5 - G5 - C6 - B5 A5 | G5 - E5 - F5 - D5 - | C5 - E5 D5 C5 - B4 - | C5 - - - - - . .' },
  { name: 'counter', wave: 'square', vol: .06, notes:
    'E4 - E4 - G4 - C5 - | C5 - C5 B4 C5 - A4 - | F4 - F4 - A4 - D5 - | D5 - - - B4 - . . | C5 - E5 - G5 - G5 F5 | E5 - C5 - D5 - B4 - | A4 - C5 B4 A4 - G4 - | E4 - - - - - . .' },
  { name: 'bass', wave: 'triangle', vol: .3, notes:
    'C3 . G2 . C3 . G2 . | F2 . C3 . F2 . C3 . | D3 . A2 . D3 . A2 . | G2 . D3 . G2 . B2 . | C3 . G2 . E3 . C3 . | F2 . A2 . G2 . B2 . | A2 . F2 . G2 . G2 . | C3 . G2 . C3 . . .' },
  { name: 'drums', wave: 'drums', vol: .1, notes: 'k . h . s . h . | k . h k s . h h' } ] }
```

- **`europhoria`** (a layer, 140 bpm, `steps: 4`): drums `k . h k s . h . | k k h . s . h k`; bass on C2 and G2 in
  sixteenths; brass stabs (saw, short `gate: .4`) on the off-beats: `. . C5 . . . E5 . | . . G5 . . . E5 .`. Start it
  with the tracks `on: false` and bring them in with `audio.layer(name, 1, .4)` when Europhoria starts.
- **`tension`** (60 bpm, `steps: 4`): a held minor chord (3 triangle tracks: A3, C4, E4, each held with `-` over 4
  bars); the heartbeat as a lub-dub on every beat (drums `k k . .`, the second hit on a quieter second drum track).
- **Kipperton chant** (a chant entry, 120 bpm): syllables `KIP PER TON` on `G4 G4 C5`, vowels `i e o`, then 3 claps;
  repeated twice, then `WE'RE GO-ING UP THE COAST` on the anthem's first phrase.
