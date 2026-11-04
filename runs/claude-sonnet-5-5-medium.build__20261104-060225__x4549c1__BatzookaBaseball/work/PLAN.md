# Batzooka Baseball

*The build plan for the over-the-top arcade baseball demo that TASK.md asks for. Read TASK.md first. This plan settles
everything TASK.md leaves open: the title, genre, cameras, architecture, every system, the content, the build order, the
risks and the tests. A capable developer (or model) should be able to build the whole demo from TASK.md and this file
alone, without the planner.*

**Title: BATZOOKA BASEBALL.** Picked the way TASK.md asks. Fifty playful riffs on "baseball" were brainstormed and
numbered without being shown, then a real RNG drew the number (`python3 -c "import secrets; print(secrets.randbelow(50) + 1)"`
printed **37**: *Batzooka Baseball*). The name also gives the game its signature mechanic: the **Batzooka**, a
rocket-powered bat that the crowd's roar charges up.

---

## 0. At a glance

| | |
|---|---|
| Game | **Batzooka Baseball**, an original over-the-top arcade baseball game |
| Pitch | Pitch fireballs, swing a rocket-powered bat, rob homers by climbing the wall of a moon dome, and empty the benches in slapstick dust clouds, on a barnstorming tour to save a cornfield ballpark from a mega-corporation. |
| Core loop | Win the duel at the plate (pitch or swing on timing and aim), then survive the chaos after contact (field, throw, run, slide), while big plays charge the Batzooka meter that unlocks supers. |
| Genre | Arcade sports (baseball), plus a slapstick brawler mini-game (the Rhubarb) and a short story Tour with light upgrades |
| Perspective | **Plate Cam**: a pseudo-3D Mode 7 view from behind the catcher for every pitch and swing. **Broadcast Cam**: a three-quarter view of the park for fielding and baserunning. **Moonshot Cam**: a Mode 7 chase camera for home runs. Replays use a turned view. |
| Players | 1–4 on one machine (versus or co-op); 1–4 online in AI Hub sessions (a ghost-mode Derby round) |
| Modes | Tour (story: 5 road games and a boss), Exhibition, Batzooka Derby (home-run derby), Spring Training (tutorial); plus attract mode and dev mode |
| Engine | my-3D2dge v0.85.2 handoff package, full engine (`my-3d2dge.js`, every module), with the small documented changes in §3.3 |
| Look | The engine's native look: HD Humanoid rigs drawn as pixel art at `res: 'ps1'` with `expand: true`; textured TileMap ballparks; lit night games; particles everywhere |
| Audio | The engine's chip synth only: original music, sound effects and Animalese-style babble voices. No audio files. |

**Exact deliverable names.** In file names, TASK.md's `[GameTitle-SOURCE-…]` is written with GameTitle = `BatzookaBaseball` and SOURCE = `Baseball`:

- dev folder: `BatzookaBaseball-Baseball-claude-opus-5-5-max-20261103-174819/` (inside this folder)
- the game, a single file: `BatzookaBaseball-Baseball-claude-opus-5-5-max-20261103-174819.html` (in this folder, beside PLAN.md)
- `exit-interview.json` (in this folder, beside the .html)

**Traceability.** Where each TASK.md requirement is handled:

| TASK.md asks for | Where |
|---|---|
| Genre and perspective | §2, §6.12 |
| Title by RNG | top of this file |
| Single HTML package | §12 |
| Built on the handoff engine; engine may change | §3, §4 |
| Art direction (engine style plus new baseball assets) | §8 |
| Animation (engine rigs plus new baseball motion) | §8.3 |
| Audio in code; Animalese voices | §6.15, §6.16 |
| Online: AI Hub `lib/hub` | §6.21 |
| Multiplayer on its own | §6.20 |
| Dev folder, bundling, shared machine (ports, processes) | §4.1, §11.1, §12 |
| Feature-complete vertical slice; infrastructure for the rest | §1, §6, §7, §9 |
| Dev mode from the pause menu, live sliders, reset to defaults | §6.23 |
| Attract mode after 10 s idle, any input exits | §6.22 |
| Narrative tone in the source's style | §6.15, §7.5, §7.9 |
| 10-foot, controller-first UI; native keyboard and mouse; glyphs follow the last device; Xbox option | §6.13, §6.14, §6.24 |
| Touch-only devices | §6.26 |
| No TODOs, placeholders or stubs | §12 |
| Source Information and feedback in the chat reply and an About/Credits screen | §6.27, §12 |
| exit-interview.json | §6.27, §12 |
| Testing: headless, one command, scripted playthrough | §11 |

---

## 1. Design pillars

1. **The duel at the plate.** Baseball is a duel of timing and guesswork. Every pitch is seen from the Plate Cam: the
   pitcher picks a pitch and spot and times the release, then steers the ball a little in flight. The batter reads it,
   aims the sweet spot and times the swing. The result comes straight from timing and aim, so it is readable and fair.
2. **Chaos after contact.** At the crack of the bat the camera cuts wide. The ball becomes the star: fielders chase its
   shadow, dive, climb walls and fire throws at the bases, while runners turbo, slide and bowl over catchers.
3. **Baseball's texture.** The count, the diamond, the chalk lines, the organ, the PA voice echoing names, the crowd's
   roar and groan, the play-by-play duo, vendors, mascots, the between-innings show. It must feel like a day (or a
   night) at the ballpark.
4. **Over the top.** Every system has a turned-to-eleven version: pitches that catch fire, vanish or zig-zag; a bat
   that fires the ball like a rocket; fielders who climb walls and throw lasers; benches that empty into cartoon dust
   clouds; parks on a volcano, by the sea, on the moon, in a graveyard and in a corporate megadome.
5. **Ten feet away, one controller.** Big, bold and few things on screen at once. Every prompt shows the button on the
   device used last. Keyboard and mouse feel native: the mouse aims the bat and the pitch and clicks bases to throw.
6. **Readable rules.** Real baseball where it is fun, arcade-simple where it is fussy. §6.1 lists the rules kept,
   simplified and dropped, and Spring Training teaches what the player can and cannot do.

**Tone.** The voice of old-time radio play-by-play turned up to arcade volume: tall tales, baseball slang, warm
hyperbole and running gags. It is never mean, and its violence is cartoon slapstick (§6.15).

---

## 2. Genre and perspective

**Genre: arcade baseball.** The source is baseball "over the top, arcade style", so the game is a full arcade baseball
game: real innings, counts, outs and runs, with exaggerated physics, super moves and a meter. Two other genres are woven
in to carry the over-the-top tone:
- a **brawler mini-game** (the Rhubarb), a 12-second bench-clearing scrum built on the engine's beat-'em-up tools;
- a **story Tour** with light RPG progression (Fan Bucks, team upgrades, rewards from beaten rivals), which gives the
  demo a beginning, a middle, an end and a boss.

**Perspective: two main cameras over one world.** Every great arcade baseball game splits the screen's job: the duel
is seen from behind the plate, the play after contact from up high. Both cameras draw the same world (the same TileMap
and world coordinates), so cutting between them is seamless.

| Camera | When | Built with | Why |
|---|---|---|---|
| **Plate Cam** | every pitch, swing, bunt, steal start and pickoff | `E.Mode7` (the mode7 module): a perspective floor (the park's own TileMap floor), the park's Backdrop as the sky, rigs as billboards scaled by distance, and walls, stands and the ball drawn with `m7.add` | The iconic baseball framing. The pitch grows as it comes in, which is what makes timing a swing feel right. Mode 7 is the engine's native perspective view. |
| **Broadcast Cam** | ball in play: fielding, throws, baserunning, rundowns, the Rhubarb, cutscenes | a custom ground view, registered as `E.VIEWS.broadcast = new E.View('broadcast', 'Broadcast', 0, 52, 1, 1)` the way the pinball kit registers its table view, over the park TileMap; `cam.frame` on the ball, its landing marker and the chaser | The engine's richest look (lit TileMap, shadows, props, particles, crowd). Home plate sits at the bottom of the screen, so up on the stick is toward center field. |
| **Moonshot Cam** | home runs and Batzooka blasts | Mode 7 `m7.chase(ball)` in slow motion, then a stands shot and the trot in Broadcast | The spectacle beat |
| **Replay Cam** | after big plays (optional, skippable) | Broadcast data replayed in the engine's `iso` view (yaw 45) at half speed | A second angle on the highlight |

The Broadcast Cam also has the player options **High** (`E.VIEWS.high = new E.View('high', 'High', 0, 70, 1, 1)`) and **Isometric** (the engine's
`iso`), in Settings and on R3 / V.

---

## 3. Tech stack and engine

### 3.1 What to fetch (once, in M0)

Copy everything into the dev folder; never edit anything outside it.

- **The engine handoff package**, from `https://github.com/michaelcrosato/my-3d2dge/tree/main/dist/handoff`: a shallow
  clone into its own temporary folder (or raw files from `https://raw.githubusercontent.com/michaelcrosato/my-3d2dge/main/<path>`).
  Take `my-3d2dge.js` (the full engine, every module), `API.md`, `API-INDEX.md`, `AI_GUIDE.md`, `docs/ASSETS.md`, the
  `tools/` folder (check, filmstrip, replay, asset-sheet, asset-find, asset-lib, asset-set), `package.json` (pins
  Playwright 1.63.0), and `kits/sports.js` and `kits/kart.js` to read (ball and formation code; Mode 7 rigs).
- **The motion clips**, from the same repository (they are not in the handoff): `src/mocap/readable.js`,
  `src/mocap/mocap.js`, `tools/anim-set.mjs` with `tools/mocap-lib.mjs`, `examples/cmu-lib/CMU_124.js` (CMU subject
  124: *Baseball Pitch* 124_01 and 124_02, *Baseball Swing* 124_07, *Baseball Bunt* 124_08, *Underhand Toss* 124_12,
  *Underhand Fast Pitch* 124_13, *2 Foot Jump* 124_11), `src/mocap/sets/quaternius.js` (`Slide_Start`, `Slide_Loop`,
  `Slide_Exit`, `Punch_Jab`, `Punch_Cross`), `src/mocap/sets/mesh2motion.js` (`Victory`, `Cheering_Two_Hands`,
  `Cheer_One_arm`), and `docs/MOCAP.md` (read its usage parts).
- **The AI Hub client and harness**: only these files from `https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/`:
  `README.md` (the protocol), `session.js` (client 1.4.0; pasted **unmodified**), `harness.html`, `bridge.js`,
  `round.js`. Do not clone the ai-hub repository: it is over 5 GB.

### 3.2 Engine features to use (don't reinvent them)

`new E.Game({ res: 'ps1', expand: true, menu: {...} })` · scenes with `pausable`, `view`, `input`, `camera`, `touch` ·
boot steps (`game.start({ boot })`) · `E.TileMap` (floor tags, `floorTex`, wall `types` with `face`, `roof`, `cut`) ·
`E.Body` for players · `E.Humanoid` (builds, outfits, hats, `colors`, poses, `expr`, `attack` specs, `drawPortrait`) ·
`E.Blob` for mascots, gulls and ghosts · `E.Mode7` · `E.Backdrop` · `r.shape` / `E.SHAPES` / `map.solid` · `r.prop`
(lamps, street lamps, banners, torches, braziers, fire drums, lanterns) · `game.lights` · `game.particles` and `game.hitFx` · `game.weather` (ash,
leaves, rain) · `game.flash`, `shake`, `freeze`, `timeScale` · `game.tween`, `game.script`, `E.Path` (blimp, drones,
gulls, camera moves) · `E.arc` (throws) · `E.rng` (seeded streams) · `E.Dialog` (cutscenes, radio chatter, portraits) ·
`E.Menu` · `E.Arcade` (high-score tables and the initials letter wheel) · `game.saves` · `game.settings` and
`settings.define` (sliders, selects, toggles) · `game.input` (custom preset, `label`, `glyphs`, `lastDevice`,
`allowJoin`, `addPlayer`, `halfKeys`, `rumble`, `suppressCode`, `clicked`, `pointer`, `mouseGround`) · `game.audio`
(`define`, `sfx`, `music` with named layers, `sting`, `tempo`, `duck`) · `E.Combo`, `E.Attack`, `E.knockback` (the
Rhubarb) · `E.font.title`, `E.ui.box`, `E.ui.bar` · `game.debug`. Motion clips go through `Mocap.load`, `Mocap.drive`,
`lib.sample`, `rig.mocapW`, `rig.mocapMask` and `MocapReadable.mirror`.

**Already built in; don't rebuild:** the pause menu, the settings screens, control rebinding (with conflict checks),
button-symbol families, full screen, the corner menu button, pausing when focus is lost or a pad is unplugged, the boot
screen and crash report, save slots, the comfort settings (reduce motion, shake, flashes) and screen filters (CRT and
scanlines suit an arcade game).

### 3.3 Engine changes (in the dev folder's copy; list each in `ENGINE-CHANGES.md` and in the About screen's engine feedback)

1. **`weapon: 'bat'`** on `E.Humanoid`: add it to the built-in list (the warning at `this.o.weapon && ![...]`), a rest
   direction (bat up over the back shoulder), a draw branch beside `'staff'`, and `tip()` = the barrel's end. The bat is
   a tapered capsule: knob, thin handle, thick barrel, in `colors.bat` (ash `#c89a5a`; the Batzooka is drawn by the
   game over it). With `grip: 'both'`, IK the left hand to the handle 2.5 U below the right after every
   `solvePose()`, so swings and bunts hold the bat in two hands.
2. **`mitt`** option: `'fielder' | 'catcher' | 'first' | null`, a leather mitt on the glove hand (`handL` for
   right-handed throwers, `handR` for lefties): a pocketed oval about 2.2× the hand's size, in `colors.mitt`. The
   catcher's mitt is rounder and bigger.
3. **Hats:** `hat: 'batting'` (a glossy helmet with a brim and an ear flap on the side facing the pitcher), `hat: 'mask'`
   (a catcher's helmet with a cage of 3 bars over the face), and `hat: 'visor'` (a space helmet for the moon team: a
   dome with a tinted front) and `hat: 'tophat'` (Mortimer Megamax's tall silk hat). Portraits draw them too.
4. **Font:** add the glyphs ✕ ○ □ △ to the 5×7 font, so any `input.label()` text renders (the in-game prompts still use
   the icon renderer, §6.13).
5. **The standard `glyphs` setting** (group Controller, "Button symbols"): default `'playstation'`; options
   `[['playstation', 'PlayStation (✕ ○ □ △)'], ['xbox', 'Xbox (A B X Y)']]`. A DualSense or any standard pad then shows
   PlayStation symbols unless the player picks Xbox.
6. Only if Mode 7 needs it: a helper `m7.quad(pts4, color, depth)` that draws a filled world-space quad sorted with
   the billboards (the fence and the stand faces). It can live in game code over `m7.add` instead.
7. Fix any engine bug the tests uncover, with a line on what and why.

Keep every change small and commented `// BATZOOKA:`. Nothing in the game may depend on code outside the dev folder.

---

## 4. Architecture

### 4.1 Dev folder layout

```
BatzookaBaseball-Baseball-claude-opus-5-5-max-20261103-174819/
  engine/my-3d2dge.js          the engine: handoff v0.85.2 plus the changes in ENGINE-CHANGES.md
  engine/mocap-readable.js     the repo's src/mocap/readable.js (unchanged)
  engine/mocap.js              the repo's src/mocap/mocap.js (unchanged)
  assets/mocap-batzooka.js     the clip set cut by tools/anim-set.mjs (§8.3)
  vendor/aihub-session.js      AI Hub client 1.4.0, byte for byte
  src/*.js                     the game: files concatenated by name into one IIFE (§4.2)
  build/game.js                the concatenated game (written by tools/build.mjs; dev page and tests load it)
  index.html                   dev page: engine, mocap, vendor client, build/game.js as separate scripts
  tools/build.mjs              src → build/game.js; then the single-file bundle → ../<name>.html
  tools/serve.mjs              a static server on 127.0.0.1, port 0 (prints the port; for the hub harness)
  tools/check.mjs, filmstrip.mjs, replay.mjs, asset-sheet.mjs, asset-find.mjs, asset-lib.mjs, asset-set.mjs (handoff)
  tools/anim-set.mjs, mocap-lib.mjs (repo)
  hub/harness.html, bridge.js, round.js, README.md (AI Hub)
  tests/run.mjs                the one command (§11.1)
  tests/lib/*.mjs              the headless loader, assertions, bots
  tests/*.test.mjs             the tests (§11.3)
  package.json                 { "type": "module", devDependencies: { "playwright": "1.63.0" }, scripts: { test, build, check } }
  ENGINE-CHANGES.md            each engine change and why
  NOTES.md                     tuning notes, decisions, the feedback answers as they come
```

### 4.2 Source files

`tools/build.mjs` concatenates `src/*.js` in name order inside one `(() => { 'use strict'; const E = My3D2dge; ... })();`.
Each file adds to one namespace object, `BZ`. Files never reach into each other's locals.

| File | Holds |
|---|---|
| `00-core.js` | `BZ`; `BZ.def(kind, id, spec)` and `BZ.get(kind, id)` registries; the event bus `BZ.bus` (`on`, `off`, `emit`, a ring buffer of the last 200 events); RNG streams `BZ.rng.play / fx / deal`; `BZ.TUNE`, `BZ.TUNE_META`, `BZ.resetTune()`; unit helpers (`feet(u)`, `mph(uPerS)`, angle helpers); constants |
| `01-input.js` | the action preset; input contexts and routing; device tracking; the glyph icon renderer and prompt builder; mouse helpers (pointer → strike-zone plane, pointer → ground → base); touch-only detection |
| `02-audio.js` | SFX definitions; the crowd bed; the music director (song per scene, layers, stings, tempo); the **Babble** voice synth |
| `03-rigs.js` | player rig factory (team uniform + player looks); custom poses and attack specs (swing, bunt, windup, throw, tag, dive, climb, umpire calls); the mocap driver (clip windows, mirrored clips for lefties, blending); Batzooka and mitt overdraw |
| `04-shapes.js` | `E.SHAPES` entries for ballpark objects (§7.12) |
| `05-park.js` | the park builder: geometry from a park def → TileMap rows, legend, types and `floorTex`; fence function, foul lines and bases; stand seats; light rigs; props; the Plate Cam's Mode 7 floor, sky and world billboards |
| `10-rules.js` | the rules engine, pure logic: count, outs, bases, forces, scoring, half-innings, game end, extra innings, mercy rule; line score and box stats |
| `11-pitch.js` | pitch catalog; selection; windup and release ring; flight paths; aftertouch; stamina; calls; the catcher's catch and passed balls |
| `12-bat.js` | the sweet-spot reticle; swing types; the contact model; bunts; contact → launch |
| `13-ball.js` | batted and thrown ball physics; prediction; fence, pole, stands and foul tests; home runs; ground-rule doubles; wind |
| `14-field.js` | fielders: positions, roles, assignment, chase, catch, dive, jump, wall climb, throws, cutoffs, tags, forces, rundowns |
| `15-run.js` | baserunners: the batter-runner, forces, tag-ups, advance and retreat orders, steals, leads, pickoffs, slides, bowl-overs, scoring |
| `16-supers.js` | the Batzooka meter, the supers (pitch, bat, throw, run), turbo |
| `17-rhubarb.js` | the bench-clearing brawl |
| `18-hazards.js` | the six parks' hazards and features |
| `20-ai.js` | CPU pitcher, batter, fielders and runners by difficulty; **the bot**, which turns a CPU brain's choices into player inputs (for tests, the playthrough and the attract mode) |
| `21-cams.js` | Plate Cam, Broadcast Cam, Moonshot Cam, cut-ins, the replay ring buffer, transitions |
| `22-hud.js` | scorebug, count, bases, meters, player cards, prompts, call stamps, radar, radio box, pitch and timing feedback |
| `23-talk.js` | the commentary director (line pools, priorities, rate limit, variables), the PA and the umpire; the cutscene runner |
| `24-crowd.js` | crowd seats and animation; hype; the wave; the jumbotron; the mascot; fireworks; between-innings shows |
| `30-match.js` | the match scene: its phases, update order and draw order |
| `31-derby.js` | the Derby scene (local hot-seat and hub) |
| `32-training.js` | Spring Training lessons |
| `33-tour.js` | Tour map, clubhouse, story flow, rewards, saves |
| `34-menus.js` | title (with its mode menu), team select and joining, results, Playbook (help), About/Credits, pause items |
| `35-attract.js` | the attract director and its segments |
| `36-dev.js` | the dev mode overlay |
| `40-hub.js` | AI Hub session flow, its card, ghosts |
| `50-teams.js` … `56-songs.js` | content data: teams, parks, story, lessons, lines, upgrades, songs |
| `90-start.js` | boot steps, the scenes table, deep links, `game.debug`, `game.start` |

### 4.3 The spine (rules every module follows)

- **One match state, `BZ.M`** (fields in §6.1). The simulation runs only in `update(dt)` (exact 1/120 s steps); `draw`
  only reads state. A whole match can run headless with `draw` skipped.
- **Seeded gameplay.** Gameplay randomness comes only from `BZ.rng.play` (`E.rng(seed)`, re-seeded per match;
  `game.debug.setup({ seed })`). The Derby's pitch sequence comes from `BZ.rng.deal`, which is `AIHub.rng('pitches')` in
  a hub session. Cosmetic randomness (particles, crowd, babble variation) uses `BZ.rng.fx` or the engine's own. Rules,
  pitches, contact and AI never call `Math.random`.
- **Everything is an event.** Each outcome is emitted on the bus (`BZ.bus.emit('homer', { batter, dist, batzooka })`).
  Commentary, crowd, audio, HUD stamps, stats, meter gains, the hub reporter, the attract director and the tests all
  listen. A new listener never edits the rules. The events are listed in Appendix C.
- **Content is data.** Teams, players, parks, pitches, supers, hazards, lessons, story scenes, line pools, upgrades and
  songs are registry entries (`BZ.def('parks', 'caldera', {...})`), referenced by id. Adding a park or a team is a data
  entry, plus a hazard plug-in if it has one. Together with dev mode (live tuning, situations, warps, the gallery)
  and the seeded sims, these data files are the "normal designer tools" TASK.md asks for: the rest of the game can be
  built out by adding entries, not code.
- **Live tuning.** Every balance number lives in `BZ.TUNE` and is described in `BZ.TUNE_META` (label, group, min, max,
  step, default; Appendix A). Code reads `TUNE.x` each time it needs it and never caches it, so dev sliders act at once.
- **Rigs are cosmetic.** Gameplay never reads rig joints: the ball's release and contact points come from fixed
  offsets per player and job (the gallery checks that they match the drawn hand and bat). So headless sims, tests and
  the playthrough can skip `rig.update` (`BZ.cosmetic = false`), which keeps thousands of simulated innings fast.
- **Input through contexts.** Modules ask the context router (§6.14), never raw keys.
- **One debug handle.** `game.debug` serves the tests, the dev mode and the attract director (§11.2).

### 4.4 Scenes and flow

```
boot ──(AIHub.active and connect() gives info)──► hubDerby: card → countdown → round → end overlay
  └──► title ◄──────► attract   (after 10 s with no input on title or top menus; any input returns)
         ├─ TOUR ──► tourMenu (Continue · New · Load) ─► tourMap ⇄ clubhouse
         │             tourMap ─► story ─► match ─► results ─► story ─► tourMap … final ─► ending ─► credits ─► title
         ├─ EXHIBITION ─► teamSelect (join 1–4, sides, teams, park, innings, difficulty) ─► match ─► results
         ├─ DERBY ─► derbySetup (1–4 players, park, length) ─► derby ─► derbyResults (initials, table)
         ├─ SPRING TRAINING ─► lessonList ─► lesson ─► lessonList
         ├─ OPTIONS ─► game.menu('settings') (the engine's screens, with ours added)
         └─ ABOUT ─► about (About · Source Information · Feedback · Credits)

pause menu, on every pausable scene: Resume · Playbook · Pitching Change* · Restart* · Dev Mode* · Settings · Controls ·
Full screen · Quit to title*      (* hidden in AI Hub sessions; Pitching Change only on defense in a match)
```

Deep links for tests and checks: `#title`, `#attract`, `#match` (optionally `#match/<park>`), `#derby`, `#training/<n>`,
`#tour/<stop>`, `#about`, `#gallery` (the animation gallery), `#hubcard` (the hub card with a mock), `#touch`
(forces the touch-only title).

`menu.items` is given as a function that returns entries, with falsy ones skipped. The engine's pause screen evaluates
it each time it opens (engine line ~9470: `v(this._game.o.menu.items)` then `.filter(Boolean)`; confirm this in M0 for
the standard menu).

---

## 5. The ballpark: units and geometry

**Units.** 16 U (world units) is one tile. Players are `size: 1.25` rigs, about 33 U tall. The game shows distances in
feet (`feet = U × 0.32`) and speeds in mph (`mph = U/s × 0.26`). Proportions are arcade, not real: the basepath shows as
96 ft and center field about 380 ft, which reads right.

**Orientation.** Home plate H is in the south and center field in the north (−y); x runs east, so first base is on the
right of the screen. Spray angle θ is measured from straight-away center, + toward right field. Fair territory is
|θ| ≤ 45°.

| Point | Offset from H (x, y) in U |
|---|---|
| plate front edge (the strike-zone plane) | (0, −6) |
| first base | (+212, −212) |
| second base | (0, −424) |
| third base | (−212, −212) |
| pitching rubber | (0, −205) |
| mound | circle r 26 at (0, −200), drawn raised 3 U (a shape; play stays at z 0) |
| batter's boxes | centers (−18, −4) for righties and (+18, −4) for lefties, 12 × 22 |
| catcher | (0, +16), crouched |
| umpire | (0, +30) |
| on-deck circles | 40 U outside each foul line, 70 U from H along it: about (−78, −21) and (+78, −21) |
| dugouts | set into each foul wall, from 110 to 230 U along the line from H, 30 U deep, with benches and a low roof (cut-down walls) |

**Fielders' default spots:** P (0, −200) · C (0, +16) · 1B (+225, −275) · 2B (+105, −395) · SS (−105, −395) ·
3B (−225, −275) · LF (−420, −760) · CF (0, −900) · RF (+420, −760). A park can shift its outfielders back by its
depth.

**Fence.** `r = R(θ)`: a Catmull-Rom curve over θ through five control distances (LF line, LC gap, CF, RC gap, RF line;
per park in §7.2). The fence height `Hf(θ)` defaults to 40 U, with optional sections (the MegaDome's 90-U Mega Wall).
Foul poles stand at θ = ±45°, 150 U tall. **Foul walls** (the stands' front) run parallel to the foul lines, 70 U
outside them, from each pole in toward home until they are 110 U from H (at about (−110, −10) and (+110, −10)). The
**backstop** is the arc r = 110 around H that joins them behind the plate (it passes (0, +110)). Check any new
coordinate against this outline: everything on the field must be inside it.

**Surfaces.**
- Infield dirt: r ≤ 470 and |θ| ≤ 50°, minus the infield grass square (inside the basepaths, inset 22 U); plus 22-U
  basepath strips, the home circle (r 44) and the mound.
- Warning track: dirt from R(θ) − 48 to R(θ).
- Chalk: foul lines 2 U wide to the fence; batter's and catcher's boxes; coaches' boxes; on-deck circles.
- Grass: mowing pattern per park (stripes, checkerboard or diamonds), using `E.hash2` and `E.noise2` grain as the
  sports kit does.
- Beyond the fence: the park's own ground (cornfield, sea, lava, regolith, graves, neon concourse).

**The TileMap is generated** by the park builder from these functions, one cell per 16 U (about 120 × 105 cells for a
park with a 1,180-U center field). Floor tags: `grass`, `dirt`, `track`, `foul`, `out`, and per park `water`, `lava`,
`regolith`, `grave`, `concourse`. Wall types:

Legend characters map to numeric wall type ids (`types: { 1: {...} }`), as in the sports kit:

| Legend char | Use | Settings |
|---|---|---|
| `F` | the fence | h = Hf, padded material per park, `roof: 'plain'` in the park's top-line color |
| `1`–`4` | stand tiers, front to back | h 52 / 64 / 76 / 88; face `'stone'`, `'plank'` or a park material |
| `B` | the backstop | h 64, net look |
| `D` | dugouts | h 20, `cut: true` |

Everything south of the plate is `cut: true`, since it faces the camera. `floorTex` paints the lines and patterns. The
Plate Cam's Mode 7 floor is the same TileMap (`new E.Mode7({ floor: map, sky: park.backdrop })`).

**Who collides with what.** The ball uses the analytic geometry (R(θ), wall segments, poles), not tiles. Players are
`E.Body`s that collide with the TileMap walls. The crowd sits on the stand tiles. Props (light towers, scoreboards,
park features) are `r.shape` entries; solid ones are added with `map.solid`.

---

## 6. Systems

Each system lists what it does, its numbers (starting values in `TUNE`, tuned in play) and its tests (IDs refer to §11.3).

### 6.1 Match flow and the rules engine (`10-rules.js`, `30-match.js`)

**State `BZ.M`:** `mode` ('tour' | 'exhibition' | 'training' | 'attract' | 'derby') · `park` · `teams[0]` = away,
`teams[1]` = home, each `{ def, lineup[9], order, pitcher, bullpen[], runs, hits, errors, meter, turbo, line[] }` ·
`inning`, `half` ('top' | 'bottom'), `outs`, `balls`, `strikes` · `bases[3]` (runner id or null) · `phase` · `ball` ·
`fielders[9]` · `runners[]` · `batter`, `pitcher`, `catcher`, `umpire` · `control` (which human runs which job, §6.20) ·
`stats` (per player: AB, H, 2B, 3B, HR, RBI, BB, K, SB; pitcher: IP, K, BB, pitches) · `seed` · `play` (the live play's
own record: contact, who touched the ball, outs made, runs scored).

**Phases:** `pregame` (lineup cards, "PLAY BALL!") → `halfStart` ("TOP 1ST" card; fielders jog out) → `atBat`
(`walkUp` → `pitchSelect` → `windup` → `pitchFlight`) → `inPlay` (ball live) → `playOver` (calls, runs, replay) → the
next `atBat` or `halfEnd` ("SIDE RETIRED", line score, a between-innings show) → … → `final` (results). Side states:
`cinematic`, `replay`, `rhubarb`, `between`.

**Rules kept:** balls and strikes; four balls is a walk; three strikes is a strikeout; a foul is a strike except with
two strikes, but a foul bunt with two strikes is a strikeout; hit by pitch sends the batter to first; fair and foul by
where the ball lands or is first touched (past the bags) or where it stops or is touched (before them); caught flies
are outs, fair or foul; tag-ups after a catch; force outs and tag outs; runs count when the runner touches home before
the third out, unless the third out is a force or the batter-runner is out before first; home runs (a fair fly over the
fence, or off the pole); ground-rule doubles (a fair bounce over the fence); inside-the-park home runs; errors (a dropped
catch, a wild throw); stolen bases and pickoffs; wild pitches and passed balls; double plays (and triple plays when they
happen); walk-offs; the home team skips the bottom of the last inning when it leads.

**Simplified:** extra innings start each half with a runner on second (the **Bonus Runner**). After 3 extra innings the
game goes to **SUDDEN BOOM**, a Home Run Duel that reuses the Derby rules (§6.18): each side's best slugger takes 5
swings against the Pitch-O-Matic, and the most home-run feet wins (a tie goes on one swing each). The **mercy rule** ends a game at a 10-run lead after 2 full
innings (a setting, on by default). Innings per game are 1, 3, 5 or 9 (Exhibition setting; Tour: 3, or 1 in Quick).

**Dropped**, and listed on Spring Training's "House Rules" card as what you can't do: balks, the infield fly rule,
appeals, interference and obstruction, check swings (every swing is committed), dropped third strikes, intentional
walks, substitutions other than a pitching change, and arguing with the umpire ("believe us, we tried").

**Play over:** the play ends when (a) the ball is dead (home run, foul, caught third out, ground-rule double), or (b) a
fielder holds the ball inside the infield dirt (r < 470) and no runner has moved toward a base for 0.6 s, or (c) the
pitcher holds it on the mound. A runner left between bases when (b) begins is played out: the AI fielder with the ball
chases them (a simple rundown, §6.5) and they go back or on.

**Tests:** T-RULES-01..24 (count, walks, strikeouts, foul with two strikes, foul bunt, HBP force chain, force and tag
outs, the run-scoring timing on the third out, tag-ups, ground-rule double, home run with runners, walk-off, skipping the
bottom of the last inning, extra innings with the Bonus Runner, SUDDEN BOOM, mercy rule, line score and box stats).

### 6.2 Pitching (`11-pitch.js`)

**Repertoire:** each pitcher has five pitches, one per button. Cross is the heater, Circle a breaking ball (curve or
slider), Square an off-speed pitch (changeup, sinker or knuckler), Triangle their signature pitch, and R1 their team's
super pitch (when the meter is full). Catalog in §7.3.

**Delivery, for a human:**
1. **Pick:** press a pitch button (keyboard 1–5, or K / L / J / I / E; mouse: the wheel picks, the left button
   throws). The
   pitcher comes set and the windup starts.
2. **Aim:** during the windup (0.9 s × the pitcher's tempo), the stick, WASD or mouse moves the **target marker** over
   the zone plane, out to 8 U beyond its edges.
3. **Release:** a **release ring** closes on the marker over the last 0.45 s of the windup. Press the same pitch button
   (or the left mouse button) when it meets the marker's inner circle. Release quality q ∈ [0, 1]: perfect within ±40 ms
   (× `TUNE.releaseWindow`), linear down to 0 at ±200 ms; no press means an auto-release with q = 0.3. q adds 0–8% speed
   and sharpens the break by 0–20%. The miss radius around the target is lerp(5, 0.5, q) U × fatigue.
4. **Aftertouch:** for the first 40% of the flight, the stick bends the ball up to ±4 U across and ±3 U up or down,
   × the pitcher's BRK factor × `TUNE.aftertouch`. It costs 0.5 stamina.

**The CPU pitcher** (§6.11) picks from a count-and-batter table, aims at edges with an error by difficulty, rolls q from
its difficulty, and uses aftertouch at higher levels.

**Flight model.** Parametric and exact, so the plate crossing is known at release. With u = t / T, where T = distance
/ speed:
- `pos(u) = lerp(release, target + miss, u) + break(u) + after(u)`
- `z(u)` adds a sag of `4 · u · (1 − u) · sag`, so the pitch arcs
- `break(u) = [bx, bz] · u^k`, where k is the pitch's lateness exponent

Special paths (zig-zag, vanish, wobble, wave) are functions of u (§7.3). The heater's base speed is 340 U/s
(88 mph; flight about 0.57 s over the 193 U from release to the plate), × the pitch's factor × the pitcher's VEL factor
(§7) × (1 + 0.08 · q) × the stamina factor × `TUNE.pitchSpeed`.

**Calls.** At the plate plane the ball's (x, z) is checked against the batter's zone, widened by the ball's radius (1.6 U).
The zone is 12 U wide (x −6..+6), from the knees (z 9 × size/1.25) to the chest (z 25 × size/1.25). A pitch in the zone
that isn't swung at is a strike, outside it a ball. The ball's crossing point shows as a dot for 1.5 s.

**Stamina:** 100 at the start. A pitch costs heater 1.2, breaking 1.6, off-speed 1.0, signature 2.2, super 5 (×
`TUNE.staminaDrain`). Below 40: speed ×0.92, miss ×1.4. Below 15 ("gassed"): ×0.85 and ×2. The CPU calls the bullpen
below 20; a human sees a "BULLPEN'S READY" toast and can use Pitching Change in the pause menu. Each team has one
reliever.

**Catcher:** catches every pitch that crosses inside x ±16, z 0..34. A ball outside that, or in the dirt (z < 2), is a
wild pitch or passed ball with chance 0.35 × (1 − catcher's GLV / 10), and the ball rolls loose to the backstop.

**Pickoffs:** before picking a pitch, L1 plus a base button throws over (the CPU does it rarely). A runner leading off
more than 20 U is tagged out if the throw beats them back.

**Tests:** T-PITCH-01..12 (each pitch's crossing equals the planned target within the miss radius; flight time; break
size and lateness; aftertouch bounded; release quality → speed and miss; stamina drain and fatigue; calls at the zone
edges; wild pitch chance; the super pitches' special paths; pickoff timing).

### 6.3 Batting and the contact model (`12-bat.js`)

**Reticle (the sweet spot).** A circle on the zone plane that the stick or WASD moves (80 U/s, eased) within the zone
±6 U; the mouse places it directly (pointer → zone plane by the zone's projected corners, §6.14). Its radius is
r = 4.2 U for a contact swing and 2.8 U for a power swing, × the batter's CON factor (§7: 0.88–1.15) × `TUNE.sweetSpot` ×
the difficulty's assist. It is drawn as a ring with a dot at its center, and a faint outer ring at 1.6 r (foul-tip range).

**Swings:**

| Button | Swing | Delay to the plate plane | Radius | Max exit speed |
|---|---|---|---|---|
| ✕ / K / Space / left click | Contact | 0.10 s | 4.2 | 720 U/s |
| □ / J / right click | Power | 0.14 s | 2.8 | 860 U/s |
| R1 / E, then a swing button | Batzooka (meter full; arms the next swing) | 0.16 s | 6.3 | 780 × `TUNE.batzookaPower` (1.6) ≈ 1,250 U/s, plus a rocket boost |
| △ / I, held | Bunt (square around; let go to pull back) | none: contact when the ball crosses inside the bunt radius 6 | 6 | 160 U/s |

**Contact.** For a swing pressed at ts, the timing error is `e = ts + delay − tCross` (+ is late). The swing misses if
|e| > the OK window (90 ms × `TUNE.swingTiming` × assist) or if the distance from the ball to the reticle center is
d > 1.6 r. The timing grades are **PERFECT** within ±22 ms, **GOOD** within ±50 ms and **OK** within ±90 ms (all ×
`TUNE.swingTiming` × assist). Otherwise:
- `dn = d / r`. When 1 < dn ≤ 1.6 the swing is a **foul tip**: the ball goes back or out of play (foul), or a weak
  dribbler (0.3 chance).
- `timing = 1 − (|e| / window)^1.5`, `Q = (1 − min(dn, 1)) · timing` (0..1).
- **Spray:** `θ = (e / window) · 48° + ((bx − rx) / r) · 10° + noise(±4°)` for a right-handed batter: early (e < 0)
  pulls to left field (θ < 0), late goes the other way, and an outside pitch (bx > rx) drifts toward right field.
  Negate the timing term for lefties (early pulls to right field). |θ| > 45° is foul.
- **Launch:** `φ = 12° − ((rz − bz) / r) · 35°`. Swinging above the ball (the reticle higher than the ball) drives a
  grounder; swinging under it lofts a fly. A power swing adds +6°; a Batzooka swing clamps φ to 28°–38°.
- **Exit speed:** `EV = lerp(220, EVmax, Q^1.3) × POW factor (0.88–1.15) × (0.9 + 0.1 · pitchSpeed / 340) ×
  TUNE.exitVelocity × park.evMul`.
- **Velocity:** `vx = EV cos φ sin θ`, `vy = −EV cos φ cos θ`, `vz = EV sin φ`. Sidespin has magnitude 3 · |e| (e in
  seconds) and curves the ball further toward the side it was hit: late swings slice to the opposite field, early ones
  hook to the pull side.
- **Feedback** (on for Rookie, Training and the "Timing feedback" setting): "EARLY 34 ms", "PERFECT!", "LATE 12 ms",
  "UNDER IT", "TOPPED".

**Whiffs:** a swing and miss is a strike. A swing with no ball in reach (too early) still counts as a strike when the
pitch crosses.

**Batter's box:** righties stand in the box on the third-base side and lefties on the first-base side. Lefties use the
mirrored mocap swing.

**Tests:** T-BAT-01..14 (perfect center → line drive up the middle; early → pull, late → opposite field; reticle high →
grounder, low → fly; outside 1.6 r → miss, between r and 1.6 r → foul tip; power vs contact radius and exit speed;
Batzooka forced loft; bunt exit; foul beyond 45°; lefty mirror; the assist multipliers; the reticle clamp; mouse
mapping).

### 6.4 Ball physics (`13-ball.js`)

**Integration** at 120 Hz: `v += (g + drag + spin + wind) · dt`, `p += v · dt`.
- g = (0, 0, −520 × park.gravityMul × `TUNE.gravity`)
- drag = −0.05 · v (`TUNE.drag`)
- spin = sidespin × speed × 0.004, across the path
- wind = (wx, wy) × windEffect(z), where windEffect is 0 below 60 U and 1 above 160

**Ground:** at z ≤ 0 the ball bounces: `vz = −vz · e` (grass 0.42, dirt 0.50, track 0.45, regolith 0.55; ×
`TUNE.bounce`), and the speed along the ground ×0.82 on grass and ×0.90 on dirt. Once |vz| < 25 it rolls, slowing by
260 U/s² on grass and 180 on dirt (× `TUNE.rollFriction`) until it stops.

**Fence:** a fair ball with r > R(θ) − 1.6:
- z ≥ Hf(θ) and the ball hasn't touched the ground → **HOME RUN**;
- z ≥ Hf(θ) after a bounce → **GROUND-RULE DOUBLE**;
- otherwise it bounces off the fence: the radial velocity reverses × 0.35 and the tangential part × 0.8.

**Poles:** a ball within 3 U of a pole below 150 U is a home run ("off the foul pole!"). **Foul walls and backstop:**
segment collisions with reflection × 0.4. A ball over them is out of play (foul), drawn flying into the crowd.

**Prediction** (`BZ.ball.predict(ball, secs)`): forward simulation with the same integrator and no randomness. It gives
the first landing point and time, the moments when the ball comes down through catch heights (z ≤ 34 descending), and
samples along the path every 1/30 s for grounder intercepts. Fielding AI, the landing marker and the cameras use it.

**Thrown balls:** `E.arc(from, to, g, { time })`, with the flight time from distance / throw speed and an apex of at
least 6 U. A throw is caught when it passes within the receiver's catch radius at z 0..40. Off-target (error) throws
land 30–60 U wide.

**Display height:** in the Broadcast Cam the ball and its trail are drawn at `z' = z < 40 ? z : 40 + (z − 40) · 0.45`
(`TUNE.heightSquash`), so high flies stay near their shadows on screen. Catching happens at glove heights, where z' = z.
The true shadow and the landing marker (a pulsing X with a ring) are always drawn.

**Tests:** T-BALL-01..12 (range of a 30° launch vs the closed form within 5% before drag; drag lowers range; bounce and
roll stop; fence bounce vs home run vs ground-rule double; poles; foul walls; prediction equals the simulation
exactly; wind; moon gravity; the display squash keeps z' = z at glove height).

### 6.5 Fielding (`14-field.js`)

**Assignment at contact.** For each fielder, compute the earliest **intercept**: for a fly, reaching the predicted
landing point (or a catch-height crossing) before the ball; for a grounder, the first sampled path point where the
fielder's time to get there (reaction + distance / speed) is no more than the ball's. The fielder with the smallest
intercept time is the **chaser**. If the defense is human, the chaser is the controlled fielder, and L1 / Q switches
to the next best.

**Everyone else covers by role:**
- 1B covers first; if 1B is the chaser, P covers it.
- 2B covers second on balls to the left side, SS on balls to the right side.
- 3B covers third; C covers home.
- P backs up home or third on hits to the outfield.
- The outfielder nearest the play backs it up.
- On a ball to the deep outfield, the SS (left side) or 2B (right side) goes out as the **cutoff man**, halfway to
  the outfielder.

**Moving:** fielders are `E.Body` at 132 U/s × SPD factor × `TUNE.fielderSpeed`, with turbo ×1.35 (§6.8). CPU reaction
time comes from the difficulty (§6.11); a human's control starts at once.

**Catching:** a catch is attempted when the ball is within the catch radius (9 U × GLV factor × `TUNE.catchRadius`
across the ground) and the ball's z is in the glove range: 0..34 standing, up to 70 at a jump's top, or up to Hf + 30
in a wall climb. Success:
`p = clamp(0.985 + 0.006 · (GLV − 5) − speedPenalty − 0.08 if diving − difficultyPenalty, 0.5, 0.995)`, where the speed
penalty is 0.05–0.15 for balls above 600 U/s.
A failed catch is an **error**: the ball pops loose (vz 80, random direction from `rng.play`), with a "clank" and a
dizzy-stars gag.

**Throwing:**
- A human presses a base button: ○ first, △ second, □ third, ✕ home (keyboard 1, 2, 3, 4, or L, I, J, K; mouse:
  click the base in the world, §6.14). Hold to power up: a 0.6 s meter on the fielder; let go to throw. Throw speed is 560 U/s × ARM factor
  (0.88–1.15) × (0.85 + 0.35 · power) × `TUNE.throwSpeed`.
- Above 85% power the throw can go wild: `p = (power − 0.85) × 0.8`, plus fatigue.
- With a cutoff man up, a throw to a base far away goes through him; he relays automatically (CPU), or the human
  presses the base again.
- **CPU throws** (and the "Auto throw" assist): for each runner in danger, lead runner first, compare the runner's time
  to the next base with the throw's time. Throw where the out is likely and worth the most; with no likely out, throw to
  the base ahead of the lead runner. After a force at second, the pivot man goes on to first by himself (the double
  play).

**Outs on the bases:**
- **Force out:** a fielder holding the ball touches the forced base (within 8 U) before the runner arrives.
- **Tag out:** a fielder holding the ball comes within 10 U of a runner who is off base. The tag is automatic, with a
  swipe animation.
- **Rundown:** the fielder with the ball runs at the runner; a second fielder covers the base the runner heads for;
  they throw when the runner turns.

**Dive** (R2 / C, or Ctrl): lunges 22 U along the facing in 0.35 s, low (z 0..14), and stays prone for 0.6 s.
**Jump** (R1 / E without the ball): a jump (vz 260, × park.jumpMul), with the glove up to 70. **Wall climb**: R1 within
18 U of the fence while the ball is coming high climbs the fence face (z up to Hf + 26) to **rob a home run**.

**Assists (setting "Fielding")**: *Manual* (you run and throw); *Assisted* (the default: the chaser runs to the ball by
itself, you throw); *Auto* (the CPU fields and throws, and you can still take over by moving the stick).

**Tests:** T-FIELD-01..16 (the chaser on routine flies and grounders; cover roles by situation; catch radius and glove
range; jump and wall-climb ranges; a robbed home run counts as an out; dive; error rates in bounds over 1,000 seeded
tries; a throw's time; the force at first beats a slow runner on a routine grounder; double play 6-4-3; tag out off the
base; rundown resolves; cutoff relay; assisted mode reaches the ball; mouse click-to-throw picks the base).

### 6.6 Baserunning (`15-run.js`)

**Runners** move along the basepath segments at 128 U/s × SPD factor (0.88–1.15) × `TUNE.runSpeed`, with turbo ×1.35. A
runner has a base (0 = the batter), a target, a progress, a state (`onBase`, `lead`, `running`, `returning`, `safe`,
`out`, `scored`) and the flags `forced` and `mustTagUp`.
- The **batter-runner** drops the bat and runs to first 0.25 s after contact, and may overrun first safely.
- **Forced** runners must advance. **Unforced** runners follow the AI, or the human's orders.
- On a **fly ball**, runners go halfway (AI) until it is caught or drops. After a catch they must go back and touch
  (tag up) before advancing.

**Orders (human):**
- R1 / E: advance all runners one base.
- L1 / Q: send all back.
- Hold a base button plus R1 or L1: only the runner heading to that base (○ first, △ second, □ third, ✕ home;
  keyboard 1–4, or L, I, J, K).
- Mouse: left-click a base to send the runner who can reach it; right-click a base to send that runner back.

**Steals and leads:**
- Before the pitch, R1 / E takes an extra lead (+12 U; easier pickoffs).
- Hold L1 / Q and press the target base's button to **steal**: the runner breaks on the windup.
- The catcher throws (AI) to the base, and it's a tag race.
- The CPU runners steal by speed vs the catcher's arm and the pitch type.

**Slides:**
- Within 28 U of a base on a close play, runners slide feet-first automatically (mocap `Slide_Start`, `Slide_Loop`,
  `Slide_Exit`), with dust.
- ✕ / K in the last 40 U is a **headfirst dive**: +10% speed over the last 20 U, more dust, and a hype bonus.

**Bowl-over:** a runner on turbo who reaches home while the catcher holds the ball for a tag rolls POW + 1d6
(`rng.play`) against the catcher's POW + 1d6 + 1. If the runner wins, the ball pops loose and he's safe; if the
catcher wins, he's out and bounces off. Either way it's "COLLISION!": a dust burst, stars, crowd "OOOH".

**Scoring:** a runner who touches home (within 6 U) scores, subject to the third-out rule (§6.1).

**Assists (setting "Baserunning")**: *Manual* or *Auto* (the CPU runs your runners; you can still give orders).

**Tests:** T-RUN-01..14 (forced advance on a walk with the bases loaded; the batter-runner overruns first safely;
tag-up on a deep fly scores from third; leaving early on a caught fly means doubled off; advance all and retreat all;
an individual order; a steal succeeds with a fast runner and is thrown out with a slow one; extra lead raises the
pickoff risk; the slide triggers; the headfirst bonus; bowl-over both ways; turbo speed; the mouse orders).

### 6.7 The Batzooka meter and supers (`16-supers.js`)

**The meter** (per team, 0..100) is the crowd's roar. The jumbotron, the crowd's animation and a music layer all
follow it. Gains, × `TUNE.meterGain` × the Comeback Boost (×1.5 for a team trailing by 3 or more, a setting):

| Event | Gain |
|---|---|
| contact | +6 to +15 by Q |
| single | +10 |
| extra-base hit | +15 |
| home run | +25 |
| strikeout (to the pitcher's team) | +12 |
| diving catch or wall catch | +20 |
| double play | +15 |
| stolen base | +10 |
| headfirst slide safe | +5 |
| winning a Rhubarb | +50 |
| a park target hit | +20 |

At 100: "BATZOOKA READY!", a jumbotron flash, the crowd on its feet, and the music's "hype" layer comes in.

**Supers** (what they cost from the meter):

| Super | Who | Cost | Effect |
|---|---|---|---|
| **BATZOOKA!** | batter: R1 / E arms it, then any swing | 100 | The bat transforms (glowing barrel, nozzle and fins drawn over the bat); the reticle is 1.5× larger and on fire; on contact EVmax = 780 × `TUNE.batzookaPower` (1.6, about 1,250 U/s), loft 28–38°, a rocket boost along v of 900 U/s² for 0.5 s, a smoke and fire trail, the Moonshot Cam. Miss and it's "FIZZLE!": a comic smoke puff, and the meter is spent. |
| **Team super pitch** | pitcher: R1 / E at pitch select | 100 | The team's super path and effect (§7.3); 1.35× speed |
| **Laser Arm** | fielder holding the ball: R1 plus a base button | 50 | A flat, nearly instant throw (1,400 U/s) with a laser trail, never wild |
| **Afterburners** | runners: R1 plus L2 while running | 50 | All runners at ×1.8 for 3 s, with fire trails behind their feet |

The CPU uses supers when its meter is full and the moment is right: a Batzooka with runners on, or behind in the late
innings; a super pitch with two strikes.

**Tests:** T-SUPER-01..10 (gains per event; the comeback multiplier; arming and spending; the Batzooka loft and boost;
fizzle; each super pitch's path; Laser Arm speed and accuracy; Afterburners duration; the CPU's use conditions; the
meter clamps at 100).

### 6.8 Turbo and athletic moves

**Turbo** (per team, 0..100) is held on L2 / Shift by runners or the controlled fielder. It drains 40/s and refills
10/s when not in use, plus 15 per pitch (× `TUNE.turboDrain`, `TUNE.turboPower`). The CPU uses it on close plays.
The dive, jump, wall climb, slides and bowl-over are specified in §6.5 and §6.6. Every athletic move has its own
animation (§8.3), a sound and a particle beat.

### 6.9 The Rhubarb: the bench-clearing brawl (`17-rhubarb.js`)

**Triggers:**
- a hit-by-pitch at 0.9 × the heater's base speed or faster, with chance `TUNE.rhubarbChance` (0.4);
- a bowl-over (0.25);
- the Tour's scripted moment at Caldera Field;
- the dev trigger.

Setting "Rhubarbs: Off" turns them off; an HBP then just awards the base.

**Flow:**
1. "RHUBARB!" stamp; the Broadcast Cam frames the plate area.
2. Six per side pour out of the dugouts (the batter, the on-deck hitter and the nearest teammates against the pitcher,
   the catcher and nearby fielders).
3. 12 seconds of brawling on the dirt around home. Each human controls one fighter (the batter, or the pitcher for the
   defense); the rest are AI.
4. The umpire's whistle: "BREAK IT UP!" Everyone dusts off and walks back.
5. The side with more knockdowns gets +50 meter; a tie gives both +20. A comic "ejection" line follows, though nobody
   is really ejected.
6. The batter takes first base for the HBP.

**Fighting:**
- Stick: move. ✕ / K: punch combo (`E.Combo(['jab', 'cross', 'hook'])`). □ / J: shove (`'bash'`, `E.knockback` 160).
  △ / I: grab and toss (within 12 U: the `throw` move; the foe flies 40 U). ○ / L: dodge (a dash).
- Three hits knock a fighter down: pose `down`, dizzy stars for 2 s, then up again.
- AI fighters approach the nearest foe and throw combos with a 0.25 s wind-up so they telegraph.
- Fights between AI fighters with no human nearby are drawn as **fight clouds**: a smoke ball (`particles.smoke`) with
  fists, feet and a cap popping out.

**Tone:** cartoon slapstick only: bonks, slide whistles, "POW" stamps, no blood.

**Tests:** T-RHU-01..06 (trigger conditions and the setting; duration; scoring by knockdowns; meter award; the batter
on first after; no stray state after it ends).

### 6.10 Hazards, park features and wind (`18-hazards.js`)

Each park has one hazard or feature, as a plug-in `{ init(M), update(M, dt), onBall(M, ball), draw(r), hud() }`. Its
rate is × `TUNE.hazardRate`. It is always **telegraphed** (a sound, a warning stamp, smoke) and introduced by a radio
line the first time it happens.

| Park | Hazard / feature | Rule |
|---|---|---|
| Kernel Field | **Silo Shot** | A home run that hits the silo beyond right field pops it like popcorn: popcorn rains, +300 Fan Bucks, +20 meter. Corn stalks sway with the wind. |
| Barnacle Bay Park | **Gull Patrol** and **Splash Zone** | Gulls circle above 200 U. A fly ball with its apex above 200 has a 25% chance per gull pass of being snatched; the gull carries it 60–140 U, then drops it from z 150 (still in play). A home run to right field lands in the bay: a splash and a boat horn. |
| Caldera Field | **Lava Vents** | Two vents in the gaps (r 820, θ ±22°) erupt every 25 s (3 s of rumble and smoke first). A ball touching an erupting vent is launched (vz +600, a random push from `rng.play`); CPU fielders keep 30 U away and a human is knocked back. Ash falls; the outfield glows. |
| Tranquility Dome | **Low Gravity** and **Meteor Showers** | Gravity ×0.55, exit speed ×0.8, jumps ×2, deep fences. Every 40 s a meteor shower leaves 3 craters (decals) in the outfield for the rest of the half-inning; a grounder rolling through one turns by ±40°. |
| Boneyard Ballpark | **Phantom Fog** and **Ghost Gloves** | Fly balls above 120 U go invisible (only the shadow and the landing marker show) until they come back down. The Haunts' fielders reach +40 U in wall catches (they phase into the fence). |
| MegaMax MegaDome | **Defense Drones**, the **MEGA-TRON** and the **Boss** | Three drones patrol the outfield sky (z 150–250) on `E.Path`s. A fly ball that hits one deflects; a Batzooka hit destroys it (an explosion, +150 Fan Bucks). A ball off the MEGA-TRON jumbotron in center field is worth +300. The boss rules are in §7.1. |

**Wind** (the four open-air parks; the two domes have none): set per game from `rng.play`: a direction and 0–12 U/s² of push on
balls above 60 U. A windsock (a shape) and the banners' sway show it, and a HUD arrow with mph. On the moon the radio jokes that there's no air.

**Tests:** T-HAZ-01..08 (each hazard fires at its rate and has its effect on a scripted ball; telegraphs come before
the event; the hazard rate slider; wind changes range in the right direction).

### 6.11 CPU AI and difficulty (`20-ai.js`)

Four levels: **ROOKIE, PRO, ALL-STAR, BATZOOKA**.

| | Rookie | Pro | All-Star | Batzooka |
|---|---|---|---|---|
| CPU swing timing σ | 60 ms | 42 ms | 30 ms | 20 ms |
| CPU aim error σ | 3.6 U | 2.6 U | 1.8 U | 1.2 U |
| CPU discipline (takes a ball outside the zone) | 0.45 | 0.60 | 0.72 | 0.82 |
| CPU release quality (mean) | 0.50 | 0.68 | 0.80 | 0.90 |
| CPU aftertouch use | 0 | 0.3 | 0.6 | 0.9 |
| CPU fielder reaction | 0.34 s | 0.25 s | 0.19 s | 0.14 s |
| CPU pitch speed | ×0.85 | ×1.0 | ×1.07 | ×1.15 |
| Human sweet spot and timing window | ×1.25 | ×1.0 | ×1.0 | ×0.9 |

The CPU skills are also × `TUNE.cpuBat`, `cpuPitch`, `cpuField` and `cpuRun`.

- **CPU batter:** after its reaction delay it predicts the crossing point with an aim error and moves the reticle
  there. It decides to swing from P(in zone) and its discipline, with a timing error from N(0, σ). It uses power swings
  in hitter's counts (2-0, 3-1) and when it is strong; bunts now and then with a runner on first and no outs; and a
  Batzooka when its meter is full.
- **CPU pitcher:** a pitch-mix table by count (ahead: break it off; behind: heater) with the batter's power in mind. It
  targets the corners, more as the level rises, and uses its super with two strikes when its meter is full.
- **CPU fielders:** §6.5. **CPU runners:** advance by the time race with a margin from the level, tag up when they can
  make it, steal by speed against the arm.
- **The bot** (`BZ.bot`): runs these brains for player 1's side and turns their choices into **input actions**
  (`input.hold`, `input.tap`, the reticle's target as stick moves). Tests, the scripted playthrough and the attract
  mode use it to play the real game through the real controls.

**Tests:** T-AI-01..08 (CPU vs CPU over seeded 9-inning games at Pro (6 games in the default run, 30 with `--full`;
sims run with `M.fast = true`: no walk-ups, shows, replays or cinematics, and the CPU decides at once): runs per team per game between 3 and 9; K% of
plate appearances 12–32%; HR per plate appearance 2–8%; batting average .230–.330; errors per game 0.2–1.5; no game
over 40 minutes of game time; no stuck play, meaning every play ends within 20 s; harder levels win more against easier
ones).

### 6.12 Cameras, transitions and replays (`21-cams.js`)

**Plate Cam** (Mode 7): `m7.cam = { x: H.x + side, y: H.y + 72, h: 36, angle: −π/2, pitch: 9, fov: 46 }` (`TUNE.plateDist`,
`plateHeight`, `plateFov`). `side` is 4 U toward the side away from the batter, so the zone is clear.
- The Plate Cam setting has two choices: *Classic* (the default) and *Close* (dist 52, h 30, fov 42).
- The sky is the park's `E.Backdrop`. The floor is the park TileMap.
- Billboards each frame: pitcher, fielders, batter, catcher, base runners and on-deck hitter with `m7.rig`; light
  towers and props with `m7.shape`; the fence, stand faces, crowd rows, foul poles and scoreboard with `m7.add` quads
  and sprites (far to near); the ball and its shadow with `m7.add` (radius max(1.5, 1.6 · k) px, stitches, the trail of
  a super).
- The umpire isn't drawn in the Plate Cam (he'd fill the screen); his calls show as a cut-in portrait.
- The catcher crouches below the zone, drawn at 85% opacity where he overlaps it.
- Overlays: the zone (a 3×3 grid; the setting is Always / During the pitch / Off), the reticle or target marker, the
  release ring, the crossing dot. These are drawn from `m7.project` of their world points.
- On contact the camera shakes for 0.15 s.

**Plate Cam → Broadcast Cam.** On fair contact or a pop-up: hit-stop 0.06 s (`game.freeze`), a white flash
(`game.flash('#fff', .06)`), then a cut to the Broadcast Cam framing the plate. Within 0.3 s it takes up
`cam.frame([ballShadow, ballDrawn, landingMarker, chaser], { margin: 48, zoom: [.5, 1.1] })` with `cam.smooth = .15`.
- Fouls back over the screen stay in the Plate Cam (the ball shrinks up and away, then "FOUL BALL").
- Pop-ups high over the infield go to the Broadcast Cam, zoomed in.

**Broadcast Cam framing by play:**
- the ball in the air: the ball, its marker and the chaser;
- a fielder with the ball: him, the throw's target base and the lead runner;
- runners only: the lead runner and the next base.

Zoom stays within 0.5–1.1 × `TUNE.fieldZoom`. A wide screen shows more of the park; an upright phone zooms in. After
the play, a cut back to the Plate Cam for the next pitch.

**Moonshot Cam.** When the prediction says a fair ball will clear the fence by 10 U or more (or on any Batzooka hit):
1. `game.timeScale = .4`; Mode 7 `m7.chase(ball, { back: 60, h: 20 })` looks along the flight over the fence;
2. the landing in the stands, a target or the bay: crowd scramble, fireworks, confetti (Broadcast Cam at the landing
   point);
3. normal speed; the **trot** in the Broadcast Cam (the batter jogs the bases, high-fiving the coaches; ×2 speed;
   skippable with ✕).

The whole sequence lasts about 4 s plus the trot.

**Replays.** A ring buffer keeps the last 8 s of the world at 60 Hz: the ball, every body's x, y, z and facing, and each
rig's update inputs. After a big play (home run, diving or wall catch, double play, bowl-over, Batzooka, robbed homer)
the replay runs at ×0.5 in the engine's `iso` view (yaw 45, a new angle on the play), with a "REPLAY" banner and a pulsing
corner, and the jumbotron shows it too. ✕ skips it. The "Replays" setting is On / Big plays only (default) / Off.

**Cutscene cameras:** `game.tween` on a focus point and the zoom, run by the cutscene runner (§6.15).

**Tests:** T-CAM-01..07 (the Plate Cam projects the zone fully on screen at 427×240 and 320×240 for both box sides;
the cut on contact; the framing keeps ball and chaser on screen across 200 seeded batted balls (from snapshots of their
screen positions); the Moonshot Cam trigger; the replay buffer replays positions exactly; skips work; timeScale is
restored).

### 6.13 HUD, prompts and glyphs (`22-hud.js`, `01-input.js`)

**Layout** for a TV at 10 feet, anchored to `r.W` and `r.H` with a 12-pixel safe margin (TV overscan), kept clear of
`game.cornerArea()`:
- **Scorebug**, top left (scale 1 text, the score at scale 2): AWAY and HOME abbreviations with runs; the inning with
  ▲ or ▼; two out pips; the count as **B ●●○ S ●○**; a mini diamond with lit bases.
- **Meters**, top right: the batting team's BATZOOKA gauge (a bat-shaped bar that fills with flame and blinks when
  full); the turbo bar; the wind arrow with mph.
- **Player card**, bottom left: a portrait (`rig.drawPortrait`), the name, one stat line (avg and HR this game) or the
  pitcher's stamina bar.
- **Prompts**, bottom center: 2–5 icon-and-verb pairs for the current context. An action not available now is greyed
  with its reason ("BATZOOKA 63%").
- **Radio box**: the announcers' lines with portraits, bottom left above the player card (2 lines, non-modal, auto
  advance).
- **Call stamps**, center top: STEE-RIKE!, BALL FOUR, FOUL BALL, SAFE!, YER OUT!, HOME RUN!, BATZOOKA!!!, DOUBLE PLAY!,
  RHUBARB!. Drawn with `E.font.title`, scale 3–4, a 3-color gradient, a pop-in tween and shake.
- **Pitch info** after each pitch: "CURVE 71 MPH" (supers show silly speeds: "MEGA HEATER 131 MPH!!").
- **Radar** in the Broadcast Cam, top right under the meters: the diamond and outfield with fielders, runners and
  the ball.
- **Pitching select**: four pitch names around a diamond of face-button icons in their positions (△ top, ○ right,
  ✕ bottom, □ left), plus "R1 SUPER"; the stamina bar. With the mouse: the wheel highlights a pitch, left click throws.
- **Throw targets** in the Broadcast Cam: when a fielder holds the ball, each base shows a ring with its button's icon
  (○ 1B, △ 2B, □ 3B, ✕ HOME). With the mouse the rings take hover (they grow) and clicks.

**Rules:** the important information is at scale 2 or more (the 5×7 font at scale 1 is about 31 px tall on a 1080p
TV); no screen shows more than about 7 items of text at once; information is never in color alone (shapes and icons
too); every HUD piece hides during cutscenes and replays.

**The glyph icon renderer** `BZ.glyph(g, label, x, y, size = 11)` draws the icon for the string `input.label(action)`
returns (the font cannot draw ✕ ○ □ △ in color):
- PlayStation: a dark disc (#1b1d26) with a light rim and the symbol in its classic color: ✕ blue #7aa7ff,
  ○ red #ff6b6b, □ pink #f08ad8, △ green #4fe0b0.
- Xbox: a dark disc with a colored letter: A green #6cc04a, B red #e8584a, X blue #4a8ef0, Y yellow #f4c430.
- Shoulders and triggers (L1, R1, L2, R2, LB, RB, LT, RT): rounded pills with the text.
- Options, Create, Menu, View: small pills. L3, R3, LS, RS: a stick ring with L or R.
- D-pad: a cross with the direction lit.
- Keyboard: a keycap (a light rounded rectangle with dark text; wide for Space, Shift, Enter).
- Mouse: a mouse outline with the left or right half filled, or the wheel lit.

**The prompt builder** `BZ.prompts(ctx)` → `[[action, verb, enabled, why]]`, drawn as icon + verb.
- Labels follow `game.input.lastDevice`: for a gamepad, the `glyphs` family (PlayStation by default, Xbox by setting);
  for the keyboard, keys; for the mouse, the mouse buttons where the action has one and keys for the rest.
- Each player's prompts use their own input (`p.input.label`).

**Tests:** T-HUD-01..08 (`label` → icon type for every action on each device and family; the setting switches the
family; prompts change with `lastDevice` within one step; nothing in the HUD overlaps the corner area or goes outside
the safe margins at 320×240, 427×240 and 320×690; greyed prompts give a reason).

### 6.14 Input and controls (`01-input.js`)

**One preset**, positional, passed as `new E.Game({ input: BZ.KEYS })` and on every scene. Actions are named by the
button's position because the same button does a different job in each context (swing, fastball, throw home, punch).
That also keeps rebinding conflict-free. On the keyboard, the number keys and PC-standard keys come first (below), and
the I J K L cluster is an alternate set laid out like the face buttons.

| Action | DualSense (standard mapping) | Xbox glyph | Keyboard | Mouse |
|---|---|---|---|---|
| `south` | ✕ (Pad0) | A | Space, K | left button |
| `east` | ○ (Pad1) | B | L | – |
| `west` | □ (Pad2) | X | J | right button |
| `north` | △ (Pad3) | Y | I | – |
| `l1` | L1 (Pad4) | LB | Q, Tab | – |
| `r1` | R1 (Pad5) | RB | E | – |
| `l2` | L2 (Pad6) | LT | Left Shift | – |
| `r2` | R2 (Pad7) | RT | C, Left Ctrl | – |
| `view` | R3 (Pad11) | RS | V | – |
| `up/down/left/right` | left stick, D-pad | | W A S D, arrows | – |
| `confirm` | ✕ | A | Enter, Space, K | click a menu item |
| `cancel` | ○ | B | Escape, Backspace, L | – |
| `pause` / `start` | Options (Pad9) | Menu | Escape, P / Enter | – |
| the reticle and pitch target | left stick | | W A S D, arrows | the pointer (absolute) |
| `num1`–`num5` | (face buttons do these jobs) | | 1 2 3 4 5 | – |
| pitch type | face buttons | | 1–5 (or K L J I, E) | wheel to pick, left button to throw |

**What each button does, by context** (prompts and the Playbook show this per device):

| Context | ✕ south | ○ east | □ west | △ north | L1 | R1 | L2 | R2 | stick or mouse |
|---|---|---|---|---|---|---|---|---|---|
| Batting | contact swing | – | power swing | bunt (hold) | steal: hold, plus a base button | arm the BATZOOKA | – | – | aim the reticle |
| Pitching | heater | breaking ball | off-speed | signature | pickoff: hold, plus a base button | super pitch | – | – | aim; aftertouch in flight |
| Fielding (holding the ball) | throw home | throw to 1B | throw to 3B | throw to 2B | switch fielder | Laser Arm (plus a base button) | turbo | – | run; click a base to throw |
| Fielding (chasing) | – | – | – | – | switch fielder | jump / wall climb | turbo | dive | run |
| Running | headfirst dive (near a base) | (base select) | (base select) | (base select) | all back (or one, with a base button) | all advance (or one, with a base button) | turbo; with R1, Afterburners | – | mouse: left-click a base to send, right-click to bring back |
| Rhubarb | punch combo | dodge | shove | grab and toss | – | – | – | – | move |
| Menus | select | back | – | – | previous tab | next tab | – | – | hover focuses, click selects |

- **The keyboard is PC-native first:** WASD and the mouse aim and run; Space swings and confirms; the mouse's left
  button swings, throws at a clicked base and selects; the right button is the power swing; **number keys pick**
  (`num1`–`num5`: 1–5 the pitch type when pitching, 1–4 the base, first to home, wherever a base is chosen); Shift
  is turbo (sprint); Tab switches fielder; E is the super and "go"; Q is the steal or "back" modifier; C or Ctrl
  dives; Escape pauses. The I J K L cluster stays as an alternate set that mirrors the face buttons, for players who
  like a pad layout on keys. Keyboard prompts show the number keys first.
- **Base buttons:** a face button picks a base by its position (○ first, △ second, □ third, ✕ home) in three cases:
  when your fielder holds the ball (a throw), while L1 is held (a steal, a pickoff, sending one runner back), and while
  R1 is held (sending one runner, or a Laser Arm throw). Otherwise the face buttons do their usual jobs.
- **Mouse:** the pointer aims the bat or the pitch (pointer → zone plane by inverse-interpolating the zone's 4
  projected corners). In the Broadcast Cam, `game.mouseGround()` within 26 U of a base hovers it. Fielding and running
  use `input.suppressCode('Mouse0')` / `'Mouse2'` unless the click lands on a base, so a stray click never throws home.
  The wheel is the game's in a match (`camera: { zoom: false }` on the match scene).
- **Device tracking:** `lastDevice` switches on use; prompts follow it the next step. Moving the mouse counts as mouse
  use.
- **AI Hub rule:** in a session, Options is ignored while Create (Pad8) is held (the hub's bar).
- **Local players 2–4** get their own `game.players[i]` inputs: a gamepad each, or half a keyboard each
  (`E.Input.halfKeys`). The mouse belongs to player 1.
- **Rumble:** contact (strength by Q), catches, collisions, Batzooka (strong), Rhubarb hits (`input.rumble`; vibration
  setting).

**Tests:** T-IN-01..10 (each context routes the right action; a press in a menu doesn't leak into play
(`consumeAll`); the mouse mapping onto the zone; a base click throws and a stray click doesn't; the wheel and the number keys
pick pitch types, and the number keys pick bases; Create plus Options in a session is ignored; half-keyboard players; rebinding a positional action changes all
of its contexts' prompts).

### 6.15 Commentary, writing and babble voices (`23-talk.js`, `02-audio.js`)

**The cast's voices:** HAP HARRIGAN (play-by-play; warm, quick, hyperbolic); "BIG" LOU BOMBECK (color; a retired
slugger with malapropisms and tall tales); GLORIA VOX (the PA; slow, echoing); UMPIRE BARB HAMMERSMITH (calls with
gusto); and in the Tour, the captains, GRANDPA IKE and MORTIMER MEGAMAX.

**The commentary director:**
- It listens to the bus and picks a line from the pool for the event's tag (Appendix C, §7.9).
- Lines carry priority: 3 for a home run, Batzooka, Rhubarb, walk-off or robbery; 2 for outs, hits and steals; 1 for
  routine plays. A higher priority line interrupts.
- At most one line every 2.5 s. The same line isn't repeated within 20 lines.
- Variables: `{batter} {pitcher} {team} {dist} {mph} {park} {score}`.
- Hap and Lou alternate on big plays (Hap calls it, Lou reacts).
- Lines show in the radio box (`E.Dialog` with `modal: false`, `auto: 2.4`, portrait, alpha .85). The PA and the
  umpire show as stamps plus their own voice.
- The "Commentary" setting is On / Big plays only / Off.

**Writing style.** It is the source's style: baseball radio broadcasting, turned up.
- Short punchy sentences in the present tense, and one image per line ("That ball had a map and a flashlight").
- Baseball slang: dinger, tater, moonshot, frozen rope, can of corn, chin music, painting the black, Uncle Charlie, the
  heater, cheese, seeing-eye single, worm-burner, Texas leaguer, ducks on the pond, the hot corner.
- Running gags: Lou's stories about 1979; the vendor who always sells out; the mascot's bad luck.
- Lines are no longer than about 90 characters.
- Never mean, no profanity, no real players or teams, and no real quotes.

**Babble** (Animalese/Simlish-style voices, `BZ.babble`):
- **Hooks:** for dialog, set `talk.voice = null` and poll `talk.shown` each update; for each newly typed letter of
  `talk.pages[talk.i]`, play a syllable. Stamps and the PA call `BZ.babble.say(text, voice)` straight.
- **Syllables:** each letter a–z plays one note.
  - Pitch = base × 2^((map[letter] + contour) / 12). Vowels are a 0, e +4, i +7, o +2, u −3, y +5; consonants a small
    offset from a hash.
  - Length = 1 / rate (× 1.3 for vowels, × 0.8 for consonants).
  - Each note is `game.audio.sfx({ wave, freq, to: freq · 1.06, dur, vol, vib }, { vary: 0 })`. s, z and x add a
    10-ms noise burst.
- **Spaces and punctuation:** a space is a 40-ms gap; `.` `,` `!` `?` are longer pauses. After `!` the next 4 notes go
  +3 semitones; `?` rises at the end. A word in capitals is louder and slower.
- **Voice profiles:**

| Voice | Wave | Base Hz | Rate (letters/s) | Other |
|---|---|---|---|---|
| Hap | pulse | 190 | 20 | range 7 |
| Lou | square | 120 | 15 | vib [6, .02] (gravel) |
| Gloria (PA) | triangle | 150 | 9 | an echo copy at +120 ms, 40% volume |
| Umpire Barb | square | 260 | 14 | long vowels held with vibrato ("STEE-RIIIKE") |
| Dot | pulse12 | 300 | 22 | |
| Ike | triangle | 170 | 12 | vib [5, .04] (shaky) |
| Mortimer | saw | 140 | 16 | nasal |
| ENFORCER-9000 | saw plus square | 90 | 18 | pitch quantized to a 3-note arpeggio |
| skeletons | triangle | 220 | 18 | noise "clacks" |
| other captains | | | | a distinct base and wave each (§7.1) |

- **Volume:** the "Voices" slider (`settings.define`, 0–1, default 0.8).
- **Subtitles:** all speech is gibberish, so the text is always on screen.

**Cutscene runner** `BZ.cut(steps)` runs a `game.script` over data steps:
`['say', who, text]`, `['walk', who, x, y]`, `['pose', who, pose, expr]`, `['face', who, angle]`, `['cam', x, y, zoom, secs]`,
`['sfx', name]`, `['music', song]`, `['fx', kind, x, y]`, `['wait', s]`, `['spawn', ...]`, `['call', fn]`.
✕ advances a line; holding ○ for 1 s skips the scene (a ring fills around the icon).

**Tests:** T-TALK-01..07 (every event tag has at least 6 lines; the rate limit; priority interrupts; variables fill in;
no line over 90 characters; babble plays one syllable per letter, deterministically; the skip-hold works).

### 6.16 Music and sound effects (`02-audio.js`, `56-songs.js`)

**Music**, in the engine's song notation (`{ bpm, steps, tracks: [{ name, wave, vol, notes, on }] }`). All original:
no real anthems, and not even public-domain ballpark tunes. The ballpark **organ** is square + triangle an octave
apart with a slow vibrato.

| Song | Mood and makeup |
|---|---|
| `title` "Batzooka!" | 140 bpm; organ riff + chip rock bass + drums; a rocket-whoosh sting on the logo |
| `menu` "Clubhouse Shuffle" | laid-back organ shuffle, 100 bpm |
| `tourmap` "Barnstorm Boogie" | road boogie, 120 bpm |
| one in-game loop per park | Kernel Field county-fair organ; Barnacle Bay 6/8 shanty; Caldera minor drums and saw bass; Tranquility spacey arpeggios; Boneyard spooky organ with a theremin-like vibrato sine; MegaDome synthwave. Ducked at the plate; layers named `base`, `hype` (the meter full), `drums` (runners in scoring position) |
| `rally` | an original organ "rally" climb, played when the home team puts runners on |
| `derby` | breakneck surf rock, 160 bpm |
| `rhubarb` | a frantic chase, 180 bpm |
| `training` | light and bouncy |
| `ending` and `credits` | an anthemic reprise of the title |
| `hubcard` | a title variation, quieter |

**Stings** (`audio.sting`, on the bar): home run fanfare, strikeout sting, Batzooka ignition, inning change,
victory, defeat, between-innings show.

**Sound effects** (`audio.define`; vary by quality):
- **Bat:** "tink" (weak), "crack" (solid), "KRAKOOM" (Batzooka: noise burst + low boom + ring).
- **Gloves:** mitt "POP", glove "thup".
- **Pitches:** a whoosh pitched by speed; foul tip; thud in the dirt.
- **Ball:** bounce, fence clang or thud, pole "ping".
- **Crowd:** a filtered-noise murmur loop as a layer, swelling with the meter; cheer; groan; "OOOH"; boos; gasp.
- **Ballpark:** organ stabs, the PA's echo.
- **Players:** footsteps, slide, dive thump, climb scrabble, throw whoosh, collision crash.
- **Spectacle:** fireworks (boom + crackle), the Batzooka charge (a rising saw and noise), a rocket trail loop, the
  engine's `explode`.
- **Parks:** gull caw, lava rumble, meteor whoosh, ghost "boo", drone buzz, boat horn.
- **Interface:** meter-full ding, turbo whoosh, menu select, confirm and cancel.
- **Rhubarb:** bonk, slide whistle, "pow".

**Tests:** T-AUD-01..04 (every sound name used is defined; every scene sets its music; no unknown-song or unknown-sound
warnings in `game.errors` or the console; the Voices setting scales babble).

### 6.17 Crowd and ballpark life (`24-crowd.js`)

- **Crowd seats** on the stand tiles: 2–3 people a tile, drawn as in the sports kit: little bodies in shirts of the home
  and away colors, skin tones, caps. Over 1,500 in a park, drawn `r.queue` with `every: 2`.
- **Behavior:**
  - They sway when idle, with an amplitude that follows the meter.
  - They jump and cheer on big plays (by side), groan and sit on the other team's.
  - They scramble where a home-run ball lands.
  - **The wave** starts when the meter passes 70: a sine pulse running around the stands.
- **Jumbotron** (a shape and a screen drawn by code): the batter's portrait and name; the replay; "MAKE SOME NOISE!",
  "BATZOOKA!", "SAFE?"; the Derby leaders.
- **Mascots:** a Blob mascot per home park dances on the dugout roof (squash on the beat, `audio.onBeat`) and stars in
  the between-innings shows.
- **Fireworks** (night parks) or **confetti cannons** (day parks) after home runs and wins.
- **Between-innings shows**, one per half-inning (about 4 s, skippable with ✕):
  - the **Mascot Race** (three mascots race the warning track; one always trips);
  - **Dance Cam** (a fan dances on the jumbotron);
  - the **T-Shirt Cannon** (shirts arc into the stands);
  - the **Grounds Crew Shuffle** (rakers dance).
- **Vendors:** babble shouts with text pops in the stands ("PEANUTS!", "GET YER DOGS!").

**Tests:** T-CROWD-01..04 (reactions follow the events by side; the wave starts above 70; between-innings shows end and
hand back; the jumbotron shows the current batter).

### 6.18 Game modes

- **TOUR** (`33-tour.js`), the story (§7.5): Spring Training is offered first (skippable), then five road games in
  order, each with its cutscenes, its rival and its hazard, ending with the MegaDome boss game.
  - The **Tour Map** is a stylized county map with the bus moving along a dotted road between six pins, where you
    choose Play next stop, Clubhouse, Save, or Title.
  - A **loss** gives a "RAIN CHECK" card: Retry (same stop) or Clubhouse first. A win gives Fan Bucks, the rival's
    reward item and the next pin.
  - Tour games last 3 innings (setting "Tour game length": Standard 3 / Quick 1) at the chosen difficulty.
- **EXHIBITION**: Team Select (§6.24), then any unlocked park, innings 1/3/5/9, difficulty, and 1–4 players. Ends at
  the results screen, then Rematch / Change teams / Title.
- **BATZOOKA DERBY** (`31-derby.js`): 1–4 players take turns (hot seat). Each round is 2:00 or 10 outs, whichever
  comes first (setting). The pitcher is the Pitch-O-Matic 3000 machine.
  - **Outs:** any swing that isn't a home run, and any taken strike. Taken balls are free.
  - **Score:** each home run's distance in feet, plus target bonuses: the blimp +500, the MEGA-TRON +300, drones +150,
    the batter's-eye bullseye +200. Every 5th pitch is a **Golden Ball** worth ×2.
  - Three home runs in a row fill the meter, for one Batzooka swing.
  - At the end, initials for the **Moonshot Leaders** table (`E.Arcade` table `'derby'` and its letter wheel).
  - The AI Hub round uses these rules (§6.21).
- **SPRING TRAINING** (`32-training.js`): eight lessons (§7.6) taught by Grandpa Ike, with goals, prompts in the
  player's own glyphs, slow-motion assists, and a stamp when passed. Ends with the "House Rules" card. Each lesson can
  be replayed.

### 6.19 Progression, unlocks and saves

- **Fan Bucks (FB):** a win is worth 500, a loss 150. Bonuses: +50 a home run, +100 a Batzooka, +200 a shutout, plus
  park targets (silo +300, drones +150 each, MEGA-TRON +300).
- **Clubhouse upgrades** (team-wide, three tiers each; §7.8): Lumber (power), Glue Gloves (glove), Jet Cleats (speed),
  Cannon Arms (arm), Hype Machine (meter gain). Each rival beaten gives one free tier of one upgrade.
- **Unlocks:** Exhibition starts with every team and park except the MegaMax Mechanicals and the MegaDome, which
  unlock when you reach the Tour's final. Dev mode can unlock all.
- **Saves:** `game.saves`, three slots and an autosave. The data:
  `{ v: 1, tour: { stop, beaten: [], wins, losses }, fb, upgrades, rewards, unlocked, training: { done: [] }, stats, derbyBest }`.
  - Autosave after each Tour game and lesson; manual save on the Tour Map (`saves.canSave` only there); the title's
    CONTINUE loads `saves.latest()`.
  - Settings save themselves (the engine). Derby tables live in `E.store` (the arcade module).
  - With storage blocked, or in an AI Hub session, everything plays on for the visit.

### 6.20 Local multiplayer (1–4 on one machine)

- Joining happens on Team Select (and Derby Setup): `game.allowJoin({ max: 4 })`. Press Start on a free gamepad or 2 on
  the keyboard (half a keyboard each). Joined players' cards appear in their `E.PLAYER_COLORS`.
- **Sides:**
  - Each player moves their card left (away) or right (home), and can drop out.
  - A side's first human is its **Captain**, the second its **Co-captain**. Sides with no humans are CPU.
  - So the game covers 1P vs CPU, 2P versus, 2P co-op vs CPU, 2v1, 2v2 and 3v1.
- **Duties when a side has two humans:**
  - Defense: the captain pitches, the co-captain controls the fielders after contact.
  - Offense: the captain bats, the co-captain runs the runners (steals, orders).
  - With one human, they do everything.
- **The Derby** takes turns, one player at a time, each with their own device or a shared one.
- **On screen:** one shared screen. The Plate Cam is shared; the Broadcast Cam frames the action. Each human's
  controlled fielder or runner gets a marker arrow in their player color. Prompts show per player at their side of the
  screen (P1 bottom left, P2 bottom right; P3 and P4 just above).
- **Pausing:** anyone's Options pauses ("P2 PAUSED"); a lost controller pauses and names its player (the engine).

**Tests:** T-MP-01..05 (four players join with `addPlayer`; side assignment; duty routing; each prompt uses its own
player's device; a removed player's side falls back to the CPU).

### 6.21 AI Hub integration: the online Derby (`40-hub.js`)

**The mode is `ghost`, 1–4 players.** Everyone plays the same Derby round on their own device, from the same pitch
sequence, and sees the others as ghosts. The others' home runs fly through your sky as comets in their seat color, and
their batters stand as translucent holograms in the on-deck circles and on the dugout rails, swinging when they swing.
Ghosts never affect your round.

Why not a shared-world head-to-head game: real batting timing does not survive 150 ms of latency and 50 ms of jitter
(the hub's own test conditions), and a host-authoritative baseball world is a lot of risk for a demo. A head-to-head
game stays local (§6.20).

**Page tags**, in `<head>`, after the client:
```html
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1–4">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="3">
<meta name="hub:session-goal" content="Hit the most home-run feet in two minutes">
<meta name="hub:session-howto" content="Aim: stick/WASD/mouse · Swing: ✕/Space/click · Power: □/J/right-click">
```
The client `vendor/aihub-session.js` is pasted unmodified as the **first script in `<head>`, right after
`<meta charset>`** (§12).

**Flow when `AIHub.active`:**
1. Boot skips the title, menus and attract mode. The boot steps run, then the `hubDerby` scene in its `loading` state.
2. `const info = await AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true })`. With `null`, the game goes on
   normally to the title.
3. Build the round: the MegaDome at night; the pitch sequence from `BZ.rng.deal = AIHub.rng('pitches')`; wind and
   targets from `AIHub.rng('park')`. Then call **`AIHub.ready()` once, with no key press**.
4. **Our own card** (`hubCard`; its look is the game's):
   - the logo and "BATZOOKA DERBY · ONLINE";
   - the players lined up as batters in their seat colors (`#e8443a`, `#3b82f6`, `#22c55e`, `#f5b700`) with a READY
     check;
   - "How to win: hit the most home-run feet in 2:00";
   - this player's controls as icons for their device;
   - the time left from the `card` event (or "Starting…" when `starting`), "Waiting for more time…" when `paused`, and
     "You asked for more time" when `asked`.
   
   ✕, Enter or a click on READY sends `AIHub.answer('ready')`; △, M or a click on MORE TIME sends
   `AIHub.answer('more')`. The card **never calls `Math.random`**: no particles or weather, and sounds with `vary: 0`.
   It has no menus and changes nothing.
5. `start`: a 3-2-1 countdown while `AIHub.time() < 0`. Play begins at `AIHub.time() >= 0`, and the round clock is
   `min(120000, info.limitMs − 5000) − AIHub.time()` (just 120000 when `limitMs` is missing or 0).
6. **Reporting:**
   - Every second: `AIHub.progress({ score, label: '1,284 ft · 4 HR · 3 outs' })`, from 0 onward. (The harness only
     presses arrows and WASD, so progress must flow without hits.)
   - When the round ends (clock or 10 outs): `AIHub.result({ score, stats: { 'Home runs': n, 'Longest': '512 ft', Outs: k }, awards: [{ title: 'Moonshot', detail: '512 ft' }] })`,
     **once**.
   - On `time-up`: report at once if not yet reported.
7. **Ghost traffic**, at most 20 messages a second and well under 16 KB:
   - 10 Hz unreliable `{ t: 'g', area: 'derby', s: swingPhase, rx, rz, sc: score, o: outs }`;
   - a reliable `{ t: 'hit', n, p: [x, y, z], v: [vx, vy, vz], spin, kind, dist, bz }` on each batted ball, which
     receivers simulate locally with the same physics (cosmetic);
   - a reliable `{ t: 'done', score }` at the end.
   
   `leave` removes that ghost; `message` from unknown ids is ignored.
8. **`end`:** stop input (an `ended` flag: the scene ignores input and the game sends nothing), stop the sound
   (`audio.music(null)` and the effects muted), and show "ROUND OVER" with the standings drawn on the canvas. Names
   are canvas text, never HTML.

**Session rules:**
- **No title or restart:** Quit to title, Restart, Dev Mode and Pitching Change are hidden, and the back gesture is
  swallowed.
- **No popups or sockets:** no `alert`, `confirm`, `prompt`, new windows or sockets.
- **Storage:** the client already gives an empty storage, so add nothing for it.
- **Pause:** the pause menu offers only Resume, Settings and Controls, and the round clock keeps running.

**Tests:**
- Headless T-HUB-01..08 use a mock `AIHub` in the vm context: connect, ready without input, the card's answers, start
  at time 0, progress every second, a single result, time-up, end stopping input and sound, ghost messages at ≤ 20/s
  and applied without changing the local score, and `Math.random` not called during the card.
- Browser: the real harness in Playwright (§11.7).

### 6.22 Attract mode (`35-attract.js`)

- **Starts** after **10 s with no input** on the title (its mode menu included) or the other top-level menus (the Tour
  menu, Team Select before anyone joins, Derby Setup, the lesson list, About). Input means any key, button, click,
  touch, stick past the dead zone, or mouse movement over 4 px.
- **Exits** on any input: back to the title (input consumed, so it doesn't pick a menu item); the idle timer restarts.
- **What it is:** a looping **highlight reel played by the real game**, run by a director over `game.debug` with
  cheats on (forced pitches and contact, infinite meter, no outs).
- **On screen:** a "DEMO PLAY" banner and a pulsing "PRESS ANY BUTTON" (the icon for the device used last; on
  touch-only devices "TOUCH TO RETURN"), plus a caption card between segments.
- **Segments** (§7.11) cover the Plate Cam duel, super pitches, fielding, a diving catch, a Laser Arm throw, a steal and
  slide, a bowl-over, a Batzooka moonshot with fireworks, a Rhubarb, low-gravity wall climbs, the Phantom Ball, the
  drones and boss, the Derby with ghost comets, and the Moonshot Leaders table. One loop takes about 2.5 minutes.
- **Robustness:** each segment has a time limit and moves on by itself if its event doesn't happen.
- **Never** in an AI Hub session.

**Tests:** T-ATT-01..05 (idle 10 s on the title starts it; it doesn't start during play or with the dev panel open;
every segment runs in order without errors and the reel loops; any input returns to the title; touch-only mode still
runs it).

### 6.23 Dev mode (`36-dev.js`)

**Reached** from the pause menu's **Dev Mode** item (any pausable scene; hidden in hub sessions). It is a large,
10-foot-readable panel over the frozen game, with six tabs. L1/R1 or Q/E change tabs; up and down move; left and right
change a value (hold to accelerate); ✕ toggles or activates; △ resets this value (or pins a slider); ○ closes. The
mouse hovers, clicks, and drags sliders.

1. **TUNE**: every `BZ.TUNE` value as a **live slider** grouped as in Appendix A (Pitching, Batting, Ball, Players,
   Over the top, CPU, Camera, Game). Values apply instantly.
   - **Reset to defaults** for all, and a reset per group.
   - "Keep tuning between visits" stores the values in `E.store('bz:tune')`.
   - **Pinned sliders:** △ pins up to 3. While playing, a thin strip at the top shows them; hold Create (Pad8) with
     the D-pad to adjust (keyboard: `[` and `]` adjust, `\` picks the next pin).
2. **SITUATION**: set the inning, half, outs, balls, strikes and score; runners on first, second and third; the
   batter; the pitcher's stamina; both meters and turbo; the park; the wind. Then Apply.
3. **CHEATS** (toggles):
   - Batting and pitching: perfect contact always; every pitch a strike.
   - Meters: infinite meter, infinite turbo.
   - Play: fielders ignore walls (no clip); the CPU plays my side (autoplay); slow motion ×0.25; freeze the AI.
   - Show: the zone always; the predicted pitch path and the timing bar; landing markers and AI targets; catch
     radii and hitboxes.
4. **TRIGGERS**:
   - Force the next pitch (type and spot); force a home run on the next contact.
   - Hazard now; meteor shower; Rhubarb; Batzooka cinematic; replay the last play.
   - End the half-inning; walk-off now; win the game; lose the game.
5. **WARP**:
   - Scenes: title, attract, the gallery, the hub card (mocked), credits.
   - Play: any Tour stop (pregame, game or postgame), any lesson, the Derby, an Exhibition in any park.
   - Save: unlock all, +5,000 FB, reset the save.
6. **INFO**:
   - Live: fps, scene and phase, the ball's position and velocity, the last contact's numbers (timing ms, offset, Q,
     EV, launch, spray), the seed, the input device and glyph family, the last 8 events, `E.versionLabel()`.
   - **Frame step** (one 1/120 s step while frozen) and **Copy snapshot** (JSON to the clipboard).

**The animation gallery** (from WARP) shows every new animation on rigs in turn, at normal speed or slowed, for review
with `tools/filmstrip.mjs`.

**Tests:** T-DEV-01..06 (the pause menu holds Dev Mode; a slider changes `TUNE` and the effect shows in the next pitch;
reset restores the defaults exactly; the situation applies; cheats toggle; warps land in their scene with no errors).

### 6.24 Screens and UX flow (`34-menus.js`)

**Principles:**
- Big cards, never tables: at most 7 items to a screen.
- The focus is obvious: it scales up 10%, gets a bright border and bobs gently.
- A legend at the bottom shows glyph icons ("✕ Select · ○ Back").
- Every screen works with the D-pad/stick, the keyboard (arrows/WASD, Enter/K, Escape/L) and the mouse (hover moves
  the focus, click selects). Menus are pixel art drawn with `E.ui.box`, `E.font` and `E.font.title`.

**Title:**
- The background is the Kernel Field at dusk, seen from the Broadcast Cam, slowly panning, with fireflies; Dot
  Dynamite stands with the Batzooka on her shoulder.
- The logo "BATZOOKA BASEBALL" is drawn with `E.font.title` (scale 4, a gold-orange gradient, depth 3) and a rocket
  trail sweeping under it.
- Menu: CONTINUE (when there is a save), TOUR, EXHIBITION, DERBY, SPRING TRAINING, OPTIONS, ABOUT.
- `E.versionLabel()` in a corner.

**Team Select:**
- Two big team cards (left away, right home): the captain's rig turning, the team name, three stat stars (Power,
  Speed, Pitching), and the park they play in.
- Left and right change the team; up and down move between the team, park, innings and difficulty rows.
- The join row shows P1–P4 cards that slide to a side.

**Results:**
- The final score big; a one-line line score (R H E).
- The game's **three stars** as cards (portrait, one line each).
- FB earned, with a counting-up tween.
- Buttons: Continue, Replay highlights, Rematch.

**Playbook** (help, from the title's OPTIONS and the pause menu): one page per context (Batting, Pitching, Fielding,
Running, Supers, Rhubarb, House Rules). Each shows a picture of the action in the game's own art (a rig in the pose)
and 3–5 big icon + verb lines for the current device.

**About/Credits:** §6.27.

**Tests:** T-UI-01..06 (every screen reachable and back; mouse hover moves the focus; clicks select; keyboard and pad
navigation; no screen over 7 items; the legend icons match the device).

### 6.25 Settings and accessibility

Ours are added with `menu: { settings: [...] }` / `settings.define`, beside the engine's own (volume, music, effects,
reduce motion, shake, flashes, pixel scaling, screen filter, frame rate, controls, dead zone, vibration):
- **Gameplay:** Difficulty (Rookie / Pro / All-Star / Batzooka); Exhibition innings (1/3/5/9); Tour game length
  (Standard / Quick); Mercy rule (On/Off); Comeback Boost (On/Off); Rhubarbs (On/Off); Derby length (2:00 / 10 outs).
- **Assists:** Batting assist (Off / Timing hints / Big sweet spot); Pitching assist (Off / Auto-aim); Fielding
  (Manual / Assisted / Auto); Baserunning (Manual / Auto).
- **Display:** Timing feedback (On/Off); Strike zone (Always / During pitch / Off); Plate Cam (Classic / Close);
  Field camera (Broadcast / High / Isometric); Replays (On / Big plays / Off).
- **Sound:** Commentary (On / Big plays / Off); Voices (a 0–1 slider).
- **Controller:** Button symbols (PlayStation / Xbox), the engine's setting with our default (§3.3).
- **Developer:** "Keep dev tuning" (On/Off).

Reduce motion also softens the camera cuts (fades instead of flashes) and turns off the screen shake in cinematics.

### 6.26 Touch-only devices

- **Detection, at boot:**
  `touchOnly = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches && navigator.maxTouchPoints > 0`.
  It clears for good when a key is pressed or a gamepad connects (`gamepadconnected`, or `input.padId` set).
- **While touch-only:**
  - The title shows a large card: a controller and a keyboard icon, "Controller or keyboard required", and a big
    **Settings** button (it opens `game.menu('settings')`), beside the engine's corner menu button.
  - There are no touch controls: `game.input.touchEnabled = false`, no scene has a `touch` list, and the engine's
    touch-button settings stay hidden.
  - The attract mode runs after 10 s as usual; a tap returns to the title card.
  - Tapping menu items does nothing (the menus need a controller or keyboard), except the Settings button and the
    corner button.

**Tests:** T-TOUCH-01..03 (`#touch` forces the flag: the title shows the card, the menus ignore taps but Settings opens;
the attract mode starts after 10 s; a key press clears the flag).

### 6.27 About/Credits, Source Information and the exit interview

**The About/Credits screen** (from the title's ABOUT) has pages turned by
L1/R1, left/right or clicks. Each page holds at most about 12 lines at scale 1, wrapped to the width.
1. **ABOUT:** the logo; "An original over-the-top arcade baseball game"; the version (`E.versionLabel()`); the controls
   in one line.
2. **SOURCE INFORMATION**, every field TASK.md lists, filled in at the end of the build ("unknown" for anything that
   can't be confirmed):
   - Date: 2026-11-03 17:48:19.
   - Source: baseball (the sport), in the over-the-top arcade style.
   - Plan: `PLAN.md`.
   - Genre and Perspective: §2.
   - Tech: stack, engine and module versions, the changes made, mocap, the AI Hub client version, and Node and
     Playwright for the tests.
   - Art Direction, Animation, Audio: as built.
   - Online: AI Hub Session Protocol v1, a ghost-mode Derby round for 1–4 players, client 1.4.0.
   - Testing: what was allowed and used.
   - Research: what was read.
   - Environment: "Claude Code CLI (headless); Linux; browser unknown", or what is known.
   - Model: as TASK.md gives it.
   - Usage: estimates, or "unknown".
3. **TESTING FEEDBACK:** the four answers.
4. **ENGINE FEEDBACK:** the six answers (including what changed in the engine, §3.3).
5. **PROMPT FEEDBACK:** the four answers.
6. **CREDITS:**
   - Design, code, art, music and writing: the model that built the game (named as in Source Information).
   - Engine: my-3D2dge v0.85.2 (MIT, github.com/michaelcrosato/my-3d2dge).
   - Motion: the CMU Graphics Lab Motion Capture Database (free for all uses); Quaternius and Mesh2Motion (CC0).
   - AI Hub Session client 1.4.0 (michaelcrosato/ai-hub).
   - Any CC0 asset sets used (Kenney, KayKit, ambientCG).
   - "Thanks for playing!"

**The same text** goes in the builder's final chat reply, and in `exit-interview.json` in exactly TASK.md's shape (§12).
Its `aiHub` block should read:
- `name`: "Batzooka Baseball"; `tagline`: "Swing for the moon. Literally."
- `description`: "Over-the-top arcade baseball: fireball pitches, a rocket-powered bat, wall-climbing catches and
  bench-clearing rhubarbs on a barnstorming tour to save a cornfield ballpark."
- `type`: "Game"; `genre`: "Sports"; `source`: "Baseball (over-the-top arcade style)"; `series`: ""; `players`: "1–4".
- `controls`: "Stick/WASD/mouse aim · ✕/Space/click swing · □/J/right-click power · R1/E Batzooka".
- `tags`: ["arcade", "comedy", "versus", "pixel art", "boss fights", "retro"].

---

## 7. Content

All names, teams, parks and lines are original. Stats run 1–10. Batters have POW (power), CON (contact), SPD (speed),
ARM and GLV (glove); pitchers have VEL (velocity), CTL (control), BRK (break) and STA (stamina). Stat 5 is the ×1.0
baseline: a stat's factor is `1 + 0.03 · (stat − 5)` (0.88–1.15), unless a formula says otherwise. B/T is the side
they bat / throw from.

### 7.1 Teams and rosters (`50-teams.js`)

**1. Kernel Falls COMETS** (COM). The heroes: a scrappy farm-town team. Home: Kernel Field.
- **Uniform:** cream jerseys and pants `#f4ecd8`, navy trim, cap and belt `#1e2a5a`, gold socks `#f2c230`.
- **Mascot:** Popcorn Pete, a cream Blob with butter-yellow spots and feet.
- **Team super pitch:** **Corn Popper**: the ball pops three times in flight like a kernel, jittering ±3 U at each pop
  with a "pok!" sound.
- **Lineup:**

| Pos | Name | B/T | POW CON SPD ARM GLV (pitchers: VEL CTL BRK STA) | Look and notes |
|---|---|---|---|---|
| CF | **Dot "Dynamite" Delgado** (captain) | R/R | 9 8 7 7 7 | heroic build, ponytail, warm brown skin; wields the Batzooka; voice pulse12 300 Hz |
| SS | Pep Porter | L/R | 4 8 9 7 9 | twin; chibi build, freckles |
| 2B | Pip Porter | R/R | 4 7 9 6 8 | Pep's twin, mirror palette |
| 1B | Moose Magnusson | L/L | 9 5 3 5 6 | bulky, blond braid |
| 3B | Sunny Sato | R/R | 6 7 6 8 8 | always smiling (`expr: 'smile'`) |
| C | Rosa "Radar" Reyes | R/R | 6 6 4 9 8 | mask, catcher's mitt |
| LF | Lefty Luna | L/L | 5 8 8 6 7 | slap hitter |
| RF | Hank "Hambone" Hollis | R/R | 8 5 5 9 6 | bulky; eats between pitches |
| P | **Grandpa Ike Kowalski** | R/R | 4 8 9 6 | hunch .3, bald, white sides; signature **Butterfly Knuckler**; voice triangle 170 Hz, shaky; the coach |
| RP | Kid Kernel | R/R | 9 5 5 4 | teenager; all heat |

**2. Harbor City KRAKENS** (HCK). Home: Barnacle Bay Park.
- **Uniform:** teal `#1f8a8a`, coral trim `#ff7a5c`, sand pants `#e8d8b0`, sailor-stripe socks.
- **Mascot:** Squidge, a purple Blob with a big mouth.
- **Captain and ace:** **Captain Bettina Brine** (P, R/L, 7 7 8 7). Signature **Riptide Curve** (a curve that dips,
  rises and dips: a sine of amplitude 4 U along its path). Team super **Tidal Wave** (the ball rides a translucent wave
  sprite that rises 10 U and crashes down through the zone). Voice: pulse at 200 Hz.
- **Lineup:** C "Barnacle" Barney Finn · 1B Coral Quinn · 2B Skip Marlin · SS Wade Waters · 3B Gil Gruber ·
  LF Shelly Shoals · CF Dash Seaborne · RF Hook Hardy · RP Rip Tidewell.

**3. Magma City ERUPTORS** (MCE). Home: Caldera Field.
- **Uniform:** charcoal `#2b2b30`, lava orange `#ff6a1a` with yellow trim; caps with flame bills.
- **Mascot:** Sparky, a glowing orange Blob that drips embers.
- **Captain and ace:** **Iggy "The Igniter" Blaze** (P, R/R, 9 6 7 7). Signature **Magma Sinker** (a late drop of
  −10 U with an ember trail). Team super **Meteor Heater** (a fireball at 1.35× speed with a flame trail and heat
  shimmer; the catcher's mitt smokes). Voice: square at 230 Hz, fast. He is a hothead, and he starts the Tour's
  scripted Rhubarb.
- **Lineup:** C Basalt Bruno · 1B Magnus Holt · 2B Cinder Ellis · SS Ashley Pyre · 3B "Hot Corner" Hector Flores ·
  LF Ember Okafor · CF Flint Rocha · RF Sol Vulcan · RP Scorch McGee.

**4. Moonbase METEORS** (MBM). Home: Tranquility Dome.
- **Uniform:** silver `#c8d0e0`, cosmic purple `#6a4cff`, white; `hat: 'visor'` space helmets in the field.
- **Mascot:** Moonpie, a grey cratered Blob that floats.
- **Captain and ace:** **Commander Cosmo Vega** (P, L/L, 6 8 9 8). Signature **Zero-G Floater** (slow, 0.62×; it
  rises 6 U and then drops 12 U late). Team super **Black Hole Ball** (the ball shrinks to a dot with a dark swirl,
  and a batter's reticle within 10 U is pulled 3 U toward it). Voice: sine at 210 Hz with vibrato.
- **Lineup:** C Orbit Okoye · 1B Nova Nakamura · 2B Stella Petrov · SS Quasar Diaz · 3B Rocket Rhodes ·
  LF Astra Bell · CF Halley Brooks · RF Gus Gravitas · RP Pulsar Penn.

**5. Hollowmoor HAUNTS** (HMH). Home: Boneyard Ballpark. Players are `build: 'skeleton'` with `colors.bone`.
- **Uniform:** bone `#e8e0c8`, midnight `#1a1630`, ghost green `#7dffb0`; tattered caps.
- **Mascot:** Boo, a white Blob with a front face, drawn translucent.
- **Captain and ace:** **Count Rattlebones** (P, R/R, 7 8 9 9). Signature **Phantom Forkball** (invisible for
  u 0.35–0.8, then a sharp −8 U drop). Team super **Banshee Ball** (invisible until u 0.85, with a scream sound and
  a screen flicker). Voice: triangle at 220 Hz with clacks.
- **Lineup:** C Mort Graves · 1B Boney Malone · 2B Wailin' Winnie · SS Skelly Kelly · 3B Ezekiel Tomb · LF Shade Murphy ·
  CF Wisp O'Hara · RF Digger Doyle · RP Spook Hennessy.

**6. MegaMax MECHANICALS** (MMX). The boss team. Home: the MegaMax MegaDome. Players are robot Humanoids: metal
colors, `eyeGlow`, helmets, and `build: 'bulky'` for some.
- **Uniform:** chrome `#b8c0cc`, corporate red `#e01e3c`, neon cyan `#2de2e6`.
- **Mascot:** Mr. Synergy, a chrome Blob with wings: a hovering drone with a smiley screen.
- **Ace and boss:** **ENFORCER-9000** (P, R/R, 10 8 6 10, `size: 2.2`, bulky, red eye glow). Signature **Gigavolt
  Heater** (1.25× with an electric zig-zag of ±2 U). Team super **Overclock Laser** (1.5×, perfectly straight, with a
  laser trail; only hittable with a GOOD timing or better).
- **Boss rules:**
  - **Overclock:** his pitch speed rises 5% each inning.
  - **Short circuit:** a home run off him short-circuits him for the next half-inning: speed ×0.85, sparks, a
    stutter in his windup.
  - **Rally Cap:** if the Comets trail entering their last turn at bat, the stands (full of the beaten rival teams)
    start the Rally Cap chant and the Comets' meter fills.
- **Lineup:** C Backstop-X · 1B Forklift · 2B Servo · SS Sprocket · 3B Torque · LF Router · CF Byte · RF Piston ·
  RP Spare Part.

**Non-players:**
- **Mortimer Megamax:** the villain, owner of MegaMax Corp. `outfit: 'coat'`, `hat: 'tophat'` (§3.3), a gold watch
  chain; voice saw at 140 Hz. He watches from a luxury box in the MegaDome.
- **HAP HARRIGAN:** headset band, sweater vest.
- **BIG LOU BOMBECK:** bulky, bald, a 1979 championship ring.
- **GLORIA VOX:** the PA, a portrait only.
- **UMPIRE BARB HAMMERSMITH:** navy coat, cap and mask.
- **Grounds crew, vendors, fans:** generic rigs and the crowd.

### 7.2 Parks (`51-parks.js`)

| Park | Team | Time and sky | Fence LF / LC / CF / RC / RF (U), height | Ground beyond | Lights | Weather | Music |
|---|---|---|---|---|---|---|---|
| **Kernel Field** | Comets | golden late afternoon: a custom Backdrop with hills, farmland, a windmill, clouds, a low sun | 980 / 1080 / 1180 / 1060 / 950, h 40 | cornfield (rows of `cornstalk` shapes), the silo in right, a red-barn scoreboard | ambient 0.85, warm sun tint; string lights come on in the evening | light leaves | county-fair organ |
| **Barnacle Bay Park** | Krakens | bright noon: the `ocean` preset plus gulls | 1000 / 1100 / 1150 / 1000 / 900 (RF h 30), others h 40 | the bay beyond right (a `water` floor with bobbing boats), a pier, a lighthouse in left | lights off (day) | wind out to left | 6/8 shanty |
| **Caldera Field** | Eruptors | dusk: a dark red sky, the volcano, a smoke plume | 920 / 1060 / 1200 / 1100 / 1000, h 50 (basalt) | a lava moat (a `lava` floor, glowing `[r, g, b, glow]`), basalt columns | ambient 0.55; orange lava lights along the fence; 4 light towers | ash | minor drums, saw bass |
| **Tranquility Dome** | Meteors | lunar night: the `space` preset, a big Earth disc, the dome's ribs drawn as arcs | 1350 / 1450 / 1550 / 1450 / 1350, h 60 | regolith with craters, habitat modules, antennas, a rover | ambient 0.55; cold blue-white floods | none ("no air, no wind, no excuses") | spacey arpeggios |
| **Boneyard Ballpark** | Haunts | midnight: a full moon and fog layers | 1000 / 1080 / 1120 / 1080 / 1000, h 36 (an iron cemetery fence) | tombstones, crypts, dead trees, lanterns, candles | ambient 0.45; green and blue lanterns; jack-o'-lantern glow | `leaves` weather, plus fog as Backdrop `fog` layers | spooky organ, theremin |
| **MegaMax MegaDome** | Mechanicals | neon night: the `city-night` preset seen through the dome's glass ribs, holo-billboards | 1000 / 1060 / 1100 / 1060 / 1000, h 40; the **Mega Wall** in left (θ −45° to −20°) is h 90 | a neon concourse floor (cyan grid lines), the luxury box, drones | ambient 0.6; magenta and cyan neon lights; the MEGA-TRON's glow | none (indoors) | synthwave |

**Per-park physics** (in the park def): `gravityMul` (moon 0.55), `evMul` (moon 0.8), `jumpMul` (moon 2.0), `bounceMul`
(dome turf 1.1), and the outfielders' depth shift (moon +200 U). **Floor materials:** grass with the park's mow pattern
(Kernel stripes, Barnacle checkerboard, Caldera dark burnt grass, Tranquility bright astroturf, Boneyard dead brown-green,
MegaDome turf with cyan neon lines).

### 7.3 Pitch catalog (`11-pitch.js` data)

The heater's base speed is 340 U/s. Break is in U at the plate (+x is toward the glove side for a right-handed
pitcher); k is the lateness exponent.

| Pitch | Speed × | Break x, z | k | Special |
|---|---|---|---|---|
| Heater (fastball) | 1.00 | 0, +1.5 | 1.0 | a little "rise" |
| Curve ("Uncle Charlie") | 0.74 | +7, −10 | 2.2 | |
| Slider | 0.86 | +9, −3 | 2.0 | |
| Changeup ("the Pillow") | 0.66 | −3, −6 | 1.6 | |
| Sinker | 0.92 | −4, −6 | 1.8 | |
| Knuckler | 0.60 | 0, −3 | – | wobble: noise of amplitude 4 at 3 Hz from the pitch's own seed |
| *Signatures* | | | | Butterfly Knuckler (knuckler ×1.6 wobble, it flutters), Riptide Curve, Magma Sinker, Zero-G Floater, Phantom Forkball, Gigavolt Heater (§7.1) |
| *Team supers* | ×1.35 unless stated | | | Corn Popper, Tidal Wave, Meteor Heater, Black Hole Ball, Banshee Ball, Overclock Laser (§7.1) |
| Pitch-O-Matic (Derby) | 0.80 | small random breaks from `rng.deal` | – | 80% in the zone; every 5th is a Golden Ball |

Repertoires: Ike (heater, curve, knuckler, Butterfly); Kid Kernel (heater, slider, changeup, signature = a 1.15×
"Kernel Cannon" heater); each rival ace (heater, curve or slider, changeup or sinker, signature); relievers (heater,
slider, changeup, the team's signature).

### 7.4 Supers

The supers are specified in §6.7; each team's super pitch is in §7.1. **Everyone shares** the Batzooka swing (the
Comets' bat is "the original"; rivals have knock-offs drawn in their team colors: the "Krakenzooka", "Lavazooka",
"Lunazooka", "Ghoulzooka" and "MEGAZOOKA 9000"), Laser Arm and Afterburners.

### 7.5 The Tour: story and cutscenes (`52-story.js`)

**The story.** Kernel Field, home of the Comets since forever, is about to become a parking lot. Mortimer Megamax bets
the deed on the Kaboom Cup, a barnstorming tour of the wildest parks in baseball. The Comets' secret weapon is
Grandma Delgado's homemade Batzooka, which only fires when the crowd roars. Each stop is a cutscene (in the Broadcast
Cam, with rigs, poses and dialog portraits), then the game (with scripted radio lines when its hazard first shows),
then a post-game scene.

**Prologue: "Last Game at Kernel Field?"** (Kernel Field at dusk, after a practice)
- HAP: "Good evening, baseball fans, from Kernel Field, where the corn is high and the stakes are higher!"
- *A limousine rolls up the foul line. A bulldozer follows it.*
- MORTIMER: "Enjoy your little cornfield, Comets. Monday it's a parking lot. Premium spaces only."
- DOT: "Over my dead batting glove."
- MORTIMER: "Win the Kaboom Cup and I'll tear up the deed. Lose, and I pave the park AND hang that bat in my lobby."
- IKE: *(opens a dusty crate)* "Your grandma's BATZOOKA. Hickory, duct tape and a surplus bottle rocket. Summer of '62."
- DOT: "What does it do?"
- IKE: "Nothin'. Till the crowd gets loud. Then it does EVERYTHING."
- LOU: "Folks, I haven't seen a bat that dangerous since I swung at my own shadow in '79!"
- → Offer Spring Training ("Learn the ropes with Grandpa Ike?" PLAY · SKIP), then the Tour Map.

**Stop 1: Barnacle Bay Park vs the Krakens.**
- *Pregame:* BRINE: "Ahoy, corn-pickers! The tide's coming in, and it's bringing a whole ocean of hurt!" DOT: "We
  brought sunscreen." LOU: "Watch the gulls, folks. They've got better hands than my old infield."
- *First gull snatch:* HAP: "A seagull just stole a fly ball! Is that legal? Barb says it's... in play!"
- *Win:* BRINE: "Blast it all. Take this. Barnacle Grip Tape. Sticks to anything, except a lead." (Lumber +1.)
- *Loss:* BRINE: "Back to the shallow end, landlubbers!"

**Stop 2: Caldera Field vs the Eruptors.**
- *Pregame:* IGGY: "Hope you packed sunscreen. SPF one million." IKE: "Don't stand on anything that's glowing."
- *First vent:* HAP: "The ground just sneezed lava, and the baseball went with it!"
- *Scripted Rhubarb* (the first time Iggy hits a batter, or in the 2nd inning by script): LOU: "Uh-oh, the benches
  are emptying! Somebody fetch a fire extinguisher and a referee!" BARB (after): "Everybody back in your dugouts
  before I eject the volcano!"
- *Win:* IGGY: "You've got fire, Delgado. Here. Magma Cleats. They're only a little bit on fire." (Jet Cleats +1.)

**Stop 3: Tranquility Dome vs the Meteors.**
- *Pregame:* COSMO: "Welcome to the Moon, Comets. Up here every pop fly is a field trip." HANK: "Is there a snack bar
  on the Moon?" LOU: "Gravity took the day off, folks. Somebody tell the baseball."
- *First meteor shower:* HAP: "Meteor shower in left field! The grounds crew is going to need a bigger rake!"
- *Win:* COSMO: "Mission accomplished, for you. Zero-G Gloves. They catch whatever gravity drops." (Glue Gloves +1.)

**Stop 4: Boneyard Ballpark vs the Haunts.**
- *Pregame:* RATTLEBONES: "We've been dying to play you. Literally. Since 1887." PIP: "I'm not scared." PEP: "You're
  holding my hand." PIP: "You're holding MINE."
- *First Phantom Fog:* HAP: "Where'd it go?! The ball just turned into a rumor!"
- *Win:* RATTLEBONES: "A fine game, mortals. Phantom Pine Tar. It makes the crowd scream louder." (Hype Machine +1.)

**Stop 5 (the final): the MegaMax MegaDome vs the Mechanicals, for the Kaboom Cup.**
- *Pregame:* MORTIMER (on the MEGA-TRON): "Meet my ace. Ninety thousand horsepower. Zero feelings. ENFORCER-9000!"
  ENFORCER: "PREPARE. TO. BE. STRUCK. OUT." DOT: "Then let's give him some feelings." IKE: "Swing when they roar,
  kid."
- *First short circuit:* LOU: "He's smoking! I mean really smoking! Somebody unplug that fella!"
- *Rally Cap* (if trailing in the last inning): HAP: "Listen to this! The Krakens, the Eruptors, the Meteors, even
  the Haunts! They're ALL chanting for the Comets!" (meter → 100)
- *Win, the ending:*
  1. The Batzooka's last moonshot hits the MEGA-TRON, which rains sparks.
  2. MORTIMER: "My jumbotron! My deed! My... reputation!"
  3. The deed flutters into the Batzooka's backblast and burns to confetti.
  4. DOT: "Kernel Field stays. Same time next season?"
  5. ENFORCER: "...I. LIKE. BASEBALL."
  6. **Credits** roll over a blooper reel: rigs doing pratfalls, Hank eating, the mascot race tumble. Then "THE END?
     Exhibition: everything unlocked."
- *Loss:* MORTIMER: "Pave it! Pave it all!" → RAIN CHECK.

### 7.6 Spring Training lessons (`53-lessons.js`)

Each lesson: Ike's intro (two lines), a drill with an on-screen goal ("3 / 3 FAIR BALLS"), prompts, and "LESSON
PASSED!". Lessons 1–2 have slow motion ×0.6 on the first pitches.

| # | Lesson | Drill | Passed when |
|---|---|---|---|
| 1 | **Batting Practice** | slow heaters from Ike; aim and time the contact swing | 3 fair balls |
| 2 | **Power and Bunts** | power swings at meatballs, then bunt | 1 home run with a power swing and 1 fair bunt |
| 3 | **Reading the Zone** | a mix of strikes and balls, curves included | take 2 balls and hit 2 strikes |
| 4 | **On the Mound** | you pitch to a CPU batter | 3 strikes with 3 different pitches, one PERFECT release, one aftertouch |
| 5 | **Leather and Lasers** | fielding: Ike hits flies and grounders | 2 fly catches, a grounder thrown to first in time, a double play |
| 6 | **Wheels** | baserunning | advance on a hit, tag up on a fly, steal second, use turbo, slide in safe |
| 7 | **BATZOOKA!** | the meter is pre-filled | hit a Batzooka home run, throw a super pitch, make a Laser Arm throw |
| 8 | **Rhubarb 101** | a practice brawl with the grounds crew | land 5 punches, 1 shove and 1 toss |
| – | **House Rules** card | what you can't do (§6.1) | – |

### 7.7 Derby

Rules are in §6.18. Targets by park: the blimp (every park but the moon dome, which has a satellite instead), the
jumbotron or scoreboard, the bullseye on the batter's eye, and drones at the MegaDome. The hub round uses the
MegaDome.

### 7.8 Clubhouse upgrades (`55-upgrades.js`)

| Upgrade | Per tier | Costs (FB) for tiers 1 / 2 / 3 |
|---|---|---|
| Lumber | exit speed +5% | 400 / 800 / 1400 |
| Glue Gloves | catch radius +1 U, catch chance +2% | 300 / 700 / 1200 |
| Jet Cleats | run and field speed +4% | 300 / 700 / 1200 |
| Cannon Arms | throws +5%, pitch speed +3% | 400 / 800 / 1400 |
| Hype Machine | meter gain +10% | 500 / 1000 / 1600 |

The clubhouse screen is five big cards with a picture, the tier pips, the cost and "✕ BUY". Grandpa Ike comments on
each purchase.

### 7.9 Commentary line pools (`54-lines.js`)

At least 6 lines per tag (and 10 for the most common: strike, ball, foul, single, out). Samples in the voice to
match:

| Tag | Samples |
|---|---|
| `batter_up` (PA) | "Now batting... number seven... DOT... DYNAMITE... DELGADO!" |
| `strike_called` | "Strike one, right on the black. You could hang a picture on that one." |
| `strike_swinging` | "Swing and a miss! He swung so hard he unscrewed himself from the box!" |
| `ball` | "Ball, low. That one was dragging its feet." |
| `foul_back` | "Fouled straight back! Duck, Lou!" / LOU: "I've been ducking since '79." |
| `strikeout` | "Strike three! Back to the dugout to think about what he's done." |
| `walk` | "Ball four. Take your base, and take a sandwich while you're at it." |
| `single` | "Seeing-eye single through the right side! That ball had a map and a flashlight." |
| `double` | "Into the gap! {batter} is digging for second like there's buried treasure!" |
| `triple` | "Off the wall, he's rounding second, he's going for three! He's SAFE!" |
| `homer` | "Swung on and BELTED! Deep! Way back! That ball has left the zip code!" / "{dist} feet! They'll need a passport to bring that one back!" |
| `batzooka_ready` | "The crowd is ROARING! You know what that means... it's BATZOOKA TIME!" |
| `batzooka_hit` | "KA-BLAMMO! That's not a home run, that's a space program!" |
| `batzooka_fizzle` | "Fizzle! That's the loudest nothing I've ever heard." |
| `super_pitch` | "{pitcher} just threw a pitch that's probably illegal in three states!" |
| `catch_dive` | "Laid out like a welcome mat! What a grab!" |
| `robbery` | "He climbed the wall and STOLE it! Call the sheriff!" |
| `error` | "Clank! You could hear that one in the next county." |
| `double_play` | "Two for the price of one! Around the horn and back for a nap!" |
| `steal_safe` | "He's stealing! ...SAFE! Lock up your valuables, folks." |
| `bowl_over` | "COLLISION AT THE PLATE! Somebody check the catcher's warranty!" |
| `rhubarb_start` | "Here come the benches! It's a rhubarb, folks, a genuine dust-up!" |
| `rhubarb_end` | "Barb's breaking it up. Everybody's dusting off. Nobody's going home, though everybody's going home dirty." |
| `walkoff` | "WALK-OFF! The {team} win it! Pile on, pile on!" (only a home team can walk off; in the Tour the Comets are always the visitors) |
| `lead_change` | "And just like that, we've got ourselves a brand-new ballgame!" |
| `hazard_*` | one pool per park (§7.5's first-time lines plus 5 more each) |
| `between` | "Time for the Mascot Race! My money's on the popcorn." |
| `umpire` (stamps + voice) | "STEE-RIIIKE!" "BALL!" "YER OUT!" "SAFE!" "FAIR BALL!" "FOUL!" "PLAY BALL!" "TIME!" |
| `vendor` | "PEANUTS!" "GET YER DOGS!" "COLD LEMONADE!" |

### 7.10 Music

The list is in §6.16. Every song is written in the engine's notation in `56-songs.js` (a melody, bass and drums at
least; organ voicing for the ballpark tunes; named layers for in-game loops).

### 7.11 Attract reel segments (`35-attract.js`)

| # | Segment (caption) | Park | What's forced | ≈ s |
|---|---|---|---|---|
| 1 | "PLAY BALL!" | Kernel Field | the title flyover, then a pitch duel in the Plate Cam: a called strike, a foul back, then a line-drive single and the throw in | 18 |
| 2 | "SUPER PITCHES" | Caldera | Iggy's Meteor Heater for a swinging strike three; then a fly ball launched by a lava vent | 15 |
| 3 | "LEATHER AND LASERS" | Barnacle Bay | a diving catch in right; a gull snatches a fly; a Laser Arm throw home, a slide and a bowl-over | 20 |
| 4 | "WHEELS" | Kernel Field | a steal of second with a headfirst dive; turbo | 12 |
| 5 | "BATZOOKA!" | MegaDome | Dot arms the Batzooka: the moonshot, the Moonshot Cam, the MEGA-TRON explodes, fireworks, the trot | 20 |
| 6 | "RHUBARB!" | Caldera | HBP into the brawl: fight clouds; Barb breaks it up | 14 |
| 7 | "SIX WILD PARKS" | Tranquility | a low-gravity fly; the CF climbs the wall 3× high for a robbery | 14 |
| 8 | (continued) | Boneyard | the Banshee Ball (an invisible pitch) for a whiff; a ghost wall catch | 14 |
| 9 | "1–4 PLAYERS · PLAY ONLINE IN AI HUB" | MegaDome | Derby swings with three ghost comets (local fakes) | 15 |
| 10 | "MOONSHOT LEADERS" | – | the high-score table, then the title logo and "PRESS START" | 10 |

### 7.12 Art assets to make (`04-shapes.js`, code-drawn sprites)

Use the engine's core library where it fits (`barrel`, `crate`, `bench`, `fence`, `tree`, `pine`, `rock`, `bush`,
`lamppost`, `sign`, `cart`, `table`) and props (`lamp`, `streetlamp`, `banner`, `torch`, `brazier`, `firedrum`, `candle`,
`lantern`, `pot`, `skull`, `cobweb`). Write new `E.SHAPES` entries (check each with `node tools/asset-sheet.mjs`) for:
- **Every park:** the base (a white pillow), home plate, the rubber, the mound, the foul pole, the dugout bench, the
  bat rack, the helmet rack, the water cooler, the rosin bag, a light tower (with `lights:`), a scoreboard frame, the
  jumbotron frame, the batting-practice L-screen, the batting cage net, the Pitch-O-Matic 3000.
- **Kernel Field:** cornstalk, silo, hay bale, red-barn scoreboard, windmill, windsock.
- **Barnacle Bay:** lighthouse, boat, buoy, pier piling, lobster trap.
- **Caldera:** basalt column, lava vent (cone, with glow), warning sign.
- **Tranquility:** habitat module, antenna, satellite dish, rover, airlock.
- **Boneyard:** tombstone (3 shapes by seed), crypt, iron fence section, jack-o'-lantern.
- **MegaDome:** holo-billboard, drone, luxury box, MEGA-TRON.

**Code-drawn sprites:** the ball (5×5, with stitches, 2 rotating frames), the blimp, gulls (a Blob with wings), the
landing marker, the reticles (contact: a thin ring; power: a thick red ring; Batzooka: a ring of fire), the pitch
target and release ring, the zone grid, base rings, the glyph icons (§6.13), the meter gauges, the scorebug, the
Batzooka overdraw (nozzle, fins and a glowing barrel over the bat in the hands), the fight cloud, popcorn, confetti
and fireworks.

---

## 8. Art and animation

### 8.1 Look (the engine's own look target, applied)

TASK.md puts frame-rate targets and optimization out of scope, so add as much detail as each scene needs: big
crowds, many lights, particles, shadows and props.

1. **Resolution:** `res: 'ps1'`, `expand: true`. The HUD anchors to `r.W` and `r.H`. Rigs are `size: 1.15–1.35`
   (bosses 2.2); props use `propSize: 1.3`.
2. **Dressed characters:** every player gets the team uniform, plus hair, skin, build and size of their own, and the
   gear for their job (below). Nobody keeps the defaults.
3. **Backdrops:** every park's sky is an `E.Backdrop` (§7.2), seen in the Plate Cam and the Moonshot Cam. The Broadcast
   Cam shows ground to the screen's edges (the park continues past the stands; `map.outside` is the park's ground
   color).
4. **Textures:** grass with grain and a mow pattern, dirt with speckle, chalk lines slightly worn, the warning track,
   padded fence faces, stone or plank stands.
5. **Props on every screen:** dugouts, bat racks, coolers, light towers, poles, the park's own pieces (§7.12), 3–8 in
   any Broadcast Cam view.
6. **Effects on every hit** (§8.4).
7. **Color:** everything drawn by hand is shaded with `E.tones` and `E.ramp`.
8. **Type:** the `E.font.title` logo and stamps; HUD text with shadows; `E.ui.box` gradient panels.
9. **Light:** night parks run `game.lights` with tower floods and local glows; day parks a warm high ambient.
   Emissive for fire, neon, lasers and the Batzooka.
10. **Faces in dialog:** every speaker has a live portrait (`rig.drawPortrait`), the announcers included.

### 8.2 Rigs and uniforms (`03-rigs.js`)

`BZ.makeRig(player, team, job)` builds an `E.Humanoid` from the team's colors and the player's looks:

| Job | Kit |
|---|---|
| batter | `hat: 'batting'` in the team color, `weapon: 'bat'`, `grip: 'both'`, batting gloves (`colors.glove`) |
| fielder | `hat: 'cap'`, `mitt: 'fielder'` (`'first'` for 1B) |
| catcher | `hat: 'mask'`, `armor: true` (the chest protector, `plate` = the team's dark color), `mitt: 'catcher'` |
| pitcher | `hat: 'cap'`, `mitt: 'fielder'` |
| runner | `hat: 'batting'`, no bat |
| umpire | `outfit: 'coat'` (navy), `hat: 'mask'` |
| robots | metal colors, `eyeGlow`, a stiffer gait (`stride` and `swing` lower), sparks when short-circuited |
| skeletons | `build: 'skeleton'`, `colors.bone` |
| mascots, gulls, ghosts, drones | `E.Blob` (`feet`, `wings`, `mouth`, `face: 'front'`) |

Rigs are cached per player and job and swapped as the job changes (batter → runner → fielder between halves).

### 8.3 New animations

**Motion clips.** One set file, `assets/mocap-batzooka.js`:
```
node tools/anim-set.mjs <repo>/src/mocap/sets/quaternius.js <repo>/examples/cmu-lib/CMU_124.js <repo>/src/mocap/sets/mesh2motion.js \
  --clips 124_01,124_07,124_08,124_12,QUATERNIUS:Slide_Start,QUATERNIUS:Slide_Loop,QUATERNIUS:Slide_Exit,QUATERNIUS:Punch_Jab,QUATERNIUS:Punch_Cross,Victory,Cheering_Two_Hands \
  --name BATZOOKA --out assets/mocap-batzooka.js
```
If a clip name is reported as in two sets, prefix it with `SET:`, as the tool asks. Load `engine/mocap-readable.js`,
`engine/mocap.js` and the set after the engine. Then:
- `const lib = Mocap.load(MOCAP.BATZOOKA)`, and `Mocap.drive(rig, lib)` once per rig that uses clips.
- The CMU takes are long, with several repetitions. Write `tools/clip-windows.mjs` to find one clean window per motion
  (the hands' speed peak marks contact or release; the window runs from the last still moment before it to the next
  one after it) and store them as data: `{ swing: ['124_07', a, b, contactAt], pitch: ['124_01', a, b, releaseAt], ... }`.
- Time-map each window so that its contact or release key lands exactly on the game's moment (the swing delay, the
  release time).
- `rig.mocapW` fades in and out over 0.08 s. Lefties use `MocapReadable.mirror(clip)`, made once at load.
- The bat follows the hands (`rig.mocapBlade = true`, with the `bat` weapon drawn along the knuckle line).
- Review every motion with `tools/filmstrip.mjs` on the `#gallery` page. If a clip reads badly at game size, use the
  procedural fallback in the table (both are written, and the better one is picked by looking at the strips).

| Motion | Source | Notes |
|---|---|---|
| batting stance and waggle | procedural: the bat up and back, knees bent (`crouch` .3), the bat bobbing on a sine with a per-player tempo | |
| contact swing | clip 124_07 window, time-mapped to 0.10 s to the plane | fallback spec `SWING`: `{ rel: true, hand: 'both', a0: 2.4, a1: −2.6, z0: −2, z1: −4, reach: 6, wind: .10, active: .08, recover: .30, lunge: 2.2, twist: 2.2, lean: .25, hold: .35 }` |
| power swing | the same window, stretched to 0.14 s, with a bigger stride (root forward 3 U) | fallback: `SWING` with lunge 3, twist 2.8 |
| Batzooka swing | the power swing plus a recoil hop (`rig.kick`), muzzle flash and smoke | |
| bunt | clip 124_08 window | fallback: the bat held level at the chest with both hands (an IK override) |
| windup and pitch | clip 124_01 window (set, leg lift, stride, release, follow-through); mirrored for lefties; the ball leaves `rig.hand()` at the release key | fallback: the `knee` kick spec (leg lift) chained into `throw` (lunge 2.4, lean .6) |
| underhand toss (Ike's batting practice, Derby intro) | clip 124_12 | |
| fielder's throw | `E.MOVES.throw` plus a crow-hop for outfielders (`hop: .8`) | |
| catch high, low and backhand | procedural: after `solvePose`, IK the glove hand to the ball (`E.ik3`); the body turns to it | |
| dive | procedural: lean forward and blend `down` 0→1 over 0.2 s while the body slides; the glove reaches out | |
| jump catch | `Body.jump` plus `air: true` and the glove IK'd up | |
| wall climb | `climb: true` with vz (hand-over-hand) facing the fence; a reach at the top | |
| feet-first slide | clips Slide_Start → Slide_Loop → Slide_Exit | |
| headfirst dive | procedural: `down` blend, forward lean, both arms out | |
| run and turbo | the engine's gait from velocity; turbo uses `sprint: true` (lean) plus speed lines | |
| tag | a low swipe with the glove hand (custom spec, `hand: 'L'`) | |
| umpire calls | strike: a right-fist punch-out (`cross` with a long `hold`) and `expr: 'shout'`; out: a fist pump (`uppercut`); safe: both arms sweeping out wide (a two-hand spec: a0 1.4 → a1 −0.2) | |
| celebrations | clips Victory and Cheering_Two_Hands; `pose: 'cheer'`; high-fives (two rigs meeting); the dugout bounce | |
| dejection | `pose: 'kneel'`, `expr: 'wince'` | |
| Rhubarb | `E.Combo(['jab', 'cross', 'hook'])` (or clips Punch_Jab and Punch_Cross), `bash`, `throw`, `down` with dizzy stars | |
| catcher | the `crouch` pose; the mitt IK'd to the pitch; popping up to throw | |
| walk-up | walking with the bat on the shoulder; two practice swings | |
| the trot | a jog; high-fives with the base coaches; a cap tip | |

### 8.4 Effects

- **Contact:** sparks and a ring by Q, a white flash 0.06 s, hit-stop 0.06 s, rumble.
- **Broken bat:** on jammed contact (Q < 0.15 against a heater at 1.0× or more, 8% chance from `rng.fx`; cosmetic
  only), wood splinters (`particles.bits` in wood colors) and "CRACK! Broken bat!" on the radio.
- **Pitch trails:** speed lines for heaters; fire for the Meteor Heater; a wave sprite for the Tidal Wave; a dark
  swirl for the Black Hole; a shimmer while invisible; a laser line for the Overclock Laser (emissive); popcorn puffs
  for the Corn Popper.
- **Ball:** a trail above 500 U/s; dust on bounces; sparks off the fence; a splash in water; a lava sizzle; a meteor
  crater decal.
- **Players:** dust on slides and dives; speed lines on turbo; fire trails for Afterburners; stars and a ring on
  collisions; dizzy stars.
- **Spectacle:** fireworks (`particles.explosion` small, plus colored sparks), confetti, popcorn, the crowd wave,
  scoreboard bulbs, the jumbotron, heat shimmer at Caldera.
- **Comfort:** every `shake` and `flash` follows the comfort settings.

---

## 9. Build order and milestones

Build in this order. Each milestone ends with its tests passing (`node tests/run.mjs`), the bundle building, and a
playable build. Temporary scaffolding inside a milestone is fine, but nothing temporary survives M8.

**M0: Foundation.**
- Make the dev folder (§4.1) and fetch the sources (§3.1).
- `npm install`, then `npx playwright install chromium`. If `/tmp` is full on this shared machine (it was while
  planning), run Playwright and Chromium with `TMPDIR=<dev>/.tmp`.
- Write `tools/build.mjs` (concat `src/` into `build/game.js`; bundle `../BatzookaBaseball-Baseball-claude-opus-5-5-max-20261103-174819.html` per §12).
- Write `tests/run.mjs` and the headless loader (§11.2); `index.html`; the `00-core` spine (registries, bus, RNG,
  TUNE); the boot, title and match scene skeletons; the `game.debug` skeleton.
- Make engine changes 1, 2, 4 and 5 (§3.3), and a first `#gallery` scene (rigs on a plain field) to look at the bat and
  mitt; the full gallery comes with dev mode in M5.
- **Done when:** the bundle opens to a title in `tools/check.mjs` with no errors, the smoke test passes, and the
  gallery shows a rig holding a bat and wearing a mitt.

**M1: The at-bat** (the core, and the biggest risk; §10 R1 and R2).
- Field geometry and the Kernel Field TileMap; the Plate Cam with the fence, stands and towers.
- The pitcher, batter and catcher rigs with clips or fallbacks.
- Pitch types, windup, release ring, aftertouch; the reticle, swings and contact model; the count rules and calls.
- Batted-ball physics with home run, foul and fair detection; the Broadcast Cam showing the ball's flight.
- Umpire stamps, basic sounds, the timing feedback and the dev timing bar.
- For this milestone only, a ball in play resolves at its landing as a "HIT!" or "OUT!" stamp by a simple rule. M3
  replaces this with real fielding.
- **Done when:** T-PITCH, T-BAT, T-BALL and T-RULES (the count part) pass; 200 bot at-bats against the CPU give a
  sensible spread (whiffs, fouls, grounders, flies, line drives and some home runs, from the contact readouts); Plate Cam
  screenshots at 1280×720 and 1920×1080 show a readable zone, batter, pitcher and ball.

**M2: The Derby and the AI Hub** (early, to settle the protocol and the bundle; §10 R7 and R8).
- The Derby: local play with 1–4 players hot seat, targets, scoring, the initials table.
- `40-hub.js`: connect, our card, ready, start, progress, result, time-up, end, ghosts.
- The session rules, the meta tags, and the session client placement in the bundle.
- **Done when:** T-DERBY and T-HUB pass headless, and `window.__hubCheck.pass` is true in the real harness for
  `players=2&auto=1`, `players=4&latency=150&jitter=50&loss=5&auto=1` and `&scenario=host-leave`; the bundle still opens normally outside
  a hub.

**M3: Fielding, running and the full game.**
- Fielders (assignment, chase, catch, throw, cutoffs, tags, forces, rundowns); baserunners (forces, tag-ups, orders,
  steals, pickoffs, slides).
- The full rules engine (innings, end of game, extra innings, mercy, errors).
- The human fielding and running controls, mouse included; the CPU brains; line scores and the results screen.
- **Done when:** T-RULES, T-FIELD, T-RUN and T-AI pass (CPU vs CPU sims in range), and a 3-inning game with the bot
  as player 1 (through the real controls) against the CPU plays from start to finish with no stuck play.

**M4: The over-the-top layer.**
- The meter and all supers; turbo; dive, jump and wall climb; headfirst dives; the bowl-over.
- The Moonshot Cam, fireworks and the trot; replays; the crowd, hype and the wave; the jumbotron; mascots;
  between-innings shows; the Rhubarb.
- The commentary director with the babble voices; all music and sound effects.
- **Done when:** T-SUPER, T-RHU, T-CAM, T-TALK, T-AUD and T-CROWD pass, and filmstrips of the swing, pitch, dive,
  slide, wall climb, umpire calls and Rhubarb punches look clean (wind-up, strike, settle).

**M5: The front end, input polish, dev mode and saves.**
- Title (with its mode menu), Team Select with joining (1–4), results, Playbook, the pause items, About/Credits (with
  provisional feedback text, rewritten in M8).
- Our settings; the glyph renderer and prompts (PlayStation by default, Xbox by setting, keyboard, mouse); mouse
  hover and clicks on every screen and in the world.
- The touch-only card; dev mode (all six tabs, pinned sliders, the gallery); saves.
- **Done when:** T-UI, T-IN, T-HUD, T-DEV, T-MP and T-TOUCH pass, and screenshots of the prompts for a PlayStation pad,
  an Xbox setting, the keyboard and the mouse look right.

**M6: Content.**
- All six teams and rosters with the captains' signatures and team supers; the six parks with their looks, lights and
  hazards; the boss rules.
- The Tour (map, clubhouse, rewards, every cutscene, the ending and credits roll); Spring Training's eight lessons.
- All line pools.
- **Done when:** T-HAZ, T-TOUR and T-TRAIN pass, the playthrough test passes, and screenshots of every park in both
  main cameras look like their descriptions.

**M7: The attract mode.**
- The director and the ten segments, the idle detection, exiting on input, touch-only compatibility.
- **Done when:** T-ATT passes and a filmed loop (screenshots every 10 s across one loop) shows every segment.

**M8: Polish, verify and ship.**
- **Balance:** sims and slider sessions; then write the tuned defaults into `TUNE` (the "reset to defaults" values).
- **Look:** act on every `check.mjs` look note; check every park and screen at TV size.
- **Animation:** a filmstrip pass.
- **Writing:** a pass over every line for tone, length and repetition.
- **Feedback:** write the final About text and the four feedback sections.
- **Ship:** grep for leftovers (§12); `exit-interview.json`; the final bundle; every test, the browser checks and the
  hub harness green.

---

## 10. Risks and how to take them down

| # | Risk | Why it is risky | De-risk early | Fallback |
|---|---|---|---|---|
| R1 | The Plate Cam (Mode 7) doesn't read: the batter hides the zone, near rigs look odd, walls sort wrong | Mode 7's billboards are mostly used for karts, not near-camera people | Prototype on day one of M1, with screenshots at both box sides; every camera number in TUNE; the batter offset to the side, the camera shifted 4 U the other way; the catcher at 85% opacity | A custom low `E.View` (pitch 18) from behind the plate, with the ball's size scaled by its distance and drawn by hand (an orthographic view) |
| R2 | Batting isn't fun or fair | Timing, aim and outcome must feel causal | A deterministic pitch path with a known crossing; the dev timing bar and contact readout; timing feedback text; unit tests of the contact mapping; sims of outcome rates; assists by difficulty | Widen the windows and sweet spot by TUNE; an aim assist that pulls the reticle 30% toward the ball |
| R3 | Rules edge cases (forces, tag-ups, third-out timing) | Baseball's rules are subtle | A pure rules module with a table-driven test of 24+ situations; explicit lists of kept and dropped rules | Simplify the case (for example, auto-return runners on caught flies) and say so in House Rules |
| R4 | Fielding AI looks dumb: two fielders on one ball, nobody covering | Roles depend on the situation | A role table by ball direction and runners; a test of coverage in each situation; one chaser at a time | Auto-assign the cover men by the nearest open base |
| R5 | Fly balls leave the screen in the Broadcast Cam | High apexes | The display height squash, the landing marker, `cam.frame` zooming out to 0.5 | A small picture-in-picture "ball cam" in a corner showing the ball against the sky |
| R6 | Mocap clips fit badly (the bat's direction, long takes, mirroring) | CMU takes are raw | The window finder; review in the gallery with filmstrips; procedural fallbacks already written | Use the procedural moves for that motion |
| R7 | The hub protocol fails in the single file | Ordering of scripts, the card, cadence | Build it in M2, run the real harness then and keep it in `--hub`; the mock in headless tests; follow §6.21 to the letter | Parallel mode (drop the ghost traffic and change one meta), if ghosts are the failing check |
| R8 | The bundle breaks: `</script>` inside inlined code, an external request, the file:// origin | Inlining 1.3 MB of code | The build scans for `</script` and `<!--` in the inlined code and fails if it finds them; `check.mjs` lists external requests (there must be none); test both file:// and served | Split the inlined code into several `<script>` blocks |
| R9 | PlayStation symbols missing from the font | The 5×7 font is ASCII plus a few symbols | The icon renderer, plus the four glyphs added to the font; T-HUD checks every label | – |
| R10 | Scope: many systems and much content | A demo with a whole Tour | Strict milestones; content as data; the playthrough test catches regressions | Quick Tour games (1 inning) by default if time runs short (the setting exists anyway) |
| R11 | The attract director is brittle with forced outcomes | Scripted events can miss | A time limit per segment and moving on by itself; forced outcomes through `game.debug.force` | Skip the segment and log it (a test fails if any segment is skipped) |
| R12 | Determinism drifts (tests flake) | Cosmetic code using `Math.random` in the rules | The rng-stream rule; the proof hash twice per run (T-CORE) | – |
| R13 | The shared machine: a full `/tmp`, ports, other agents | Seen while planning | `TMPDIR` in the dev folder; the server on 127.0.0.1 with port 0; stop only your own PIDs | – |

---

## 11. Testing

### 11.1 One command

`node tests/run.mjs` (also `npm test`) runs every headless suite and prints **only failures**, then one line:
`212 passed, 0 failed (38.4 s)`. The exit code is 1 on any failure.
- `--browser` adds the browser checks (§11.6), `--hub` the AI Hub harness (§11.7), `--full` the long balance sims
  (§11.5); `--all` runs everything.
- `--only <suite>` reruns one suite. Rerun a suite only after changing the code it covers.
- Tests and tools play the game headless and read its state. Screenshots are only for what a script can't judge: the
  look, framing and readability.
- Per TASK.md, no subagents or workflows debate, review, judge or audit.

**The shared machine:**
- Prefer file:// and the headless tools.
- The hub harness needs a server: `tools/serve.mjs` binds **127.0.0.1 on port 0** and prints the port the OS picked (or
  `python3 -m http.server 0 --bind 127.0.0.1`). Fetch the page once to confirm it is this game (its `<title>` is
  "Batzooka Baseball") before trusting a result.
- Stop only the processes you started, by their PID. Never use `pkill`, `killall`, `fuser -k`, or kill whatever holds
  a port.
- Don't read files outside the dev folder and this folder, apart from the sources in §3.1.
- If `/tmp` is full, set `TMPDIR=<dev>/.tmp` for Playwright.

### 11.2 The headless harness and `game.debug`

`tests/lib/load.mjs` makes a `vm` context with the stand-ins the kits' test uses (`window`, `addEventListener`,
`location`), plus `navigator`, `matchMedia` and a fake `AIHub` when asked. It runs `engine/my-3d2dge.js`, the mocap
files and `build/game.js` in it, and returns `{ E, game, BZ }`.
- Tests drive the game with `game.advance(seconds)` (exact 1/120 s steps), `game.input.tap / hold`, `addPlayer` and
  `input.feed` (mouse), and read `game.debug.snapshot()`.
- The bots (§6.11) play real controls.
- A determinism check (T-CORE-03) runs the same seeded half-inning twice and compares the hash of its snapshots, then
  once more with `Math.random` seeded differently, where the gameplay hash must not change.

`game.debug` (Appendix D) has `snapshot`, `setup`, `force`, `tune`, `resetTune`, `events`, `bot`, `step`, `skip`,
`warp` and `hubMock`.

### 11.3 The test catalog

| Suite | IDs | Covers |
|---|---|---|
| core | T-CORE-01..05 | registries; the bus; RNG streams; determinism (the same seeded half-inning twice gives the same snapshot hash, and a third run with `Math.random` seeded differently gives the same gameplay hash of score, outs, bases and ball path, which proves the rules never use `Math.random`); TUNE meta complete (every key has a label, range and default) |
| rules | T-RULES-01..24 | §6.1 |
| pitch | T-PITCH-01..12 | §6.2 |
| bat | T-BAT-01..14 | §6.3 |
| ball | T-BALL-01..12 | §6.4 |
| field | T-FIELD-01..16 | §6.5 |
| run | T-RUN-01..14 | §6.6 |
| super | T-SUPER-01..10 | §6.7 |
| rhubarb | T-RHU-01..06 | §6.9 |
| hazards | T-HAZ-01..08 | §6.10 |
| ai | T-AI-01..08 | §6.11 (sims in §11.5) |
| cams | T-CAM-01..07 | §6.12 |
| hud | T-HUD-01..08 | §6.13 |
| input | T-IN-01..10 | §6.14 |
| talk | T-TALK-01..07 | §6.15 |
| audio | T-AUD-01..04 | §6.16 |
| crowd | T-CROWD-01..04 | §6.17 |
| modes | T-TOUR-01..06, T-TRAIN-01..08, T-DERBY-01..06 | Tour progression, rewards, clubhouse purchases change stats, save and load round-trip; each lesson's pass condition is reachable by its lesson bot; Derby outs, scoring, Golden Balls, targets, the initials table |
| mp | T-MP-01..05 | §6.20 |
| hub | T-HUB-01..08 | §6.21, with the mock |
| attract | T-ATT-01..05 | §6.22 |
| dev | T-DEV-01..06 | §6.23 |
| ui | T-UI-01..06 | §6.24 |
| touch | T-TOUCH-01..03 | §6.26 |
| about | T-ABOUT-01..03 | every Source Information field present and non-empty; the four feedback sections present; the version label shows |
| playthrough | T-PLAY-01 | §11.4 |

### 11.4 The scripted playthrough of the whole game (T-PLAY-01)

One test, run by the bot through the real inputs with `BZ.cosmetic = false`, with no errors allowed anywhere
(`game.errors` empty at every step) and a real-time limit (measure the run once, then fix the limit at about 1.5× that,
and at most 5 minutes):
1. Boot to the title. Idle 10.5 s: the attract mode starts. Let its whole reel loop once. A tap returns to the title.
2. **Spring Training:** all eight lessons, by their lesson bots, each reaching "LESSON PASSED!".
3. **New Tour in slot 1, with Tour game length Quick:**
   - Prologue: advance with ✕.
   - Each of the five stops: its pregame, its game, its postgame. In the games the player-1 bot plays at the "Batzooka"
     level against a Rookie CPU, with the dev cheat "perfect contact" on for the bot's side only, so every stop is
     won in bounded time.
   - After each stop: buy one upgrade in the clubhouse; save.
   - Check the scripted Rhubarb at Caldera, the Rally Cap or the boss's short circuit at the MegaDome, the ending and
     the credits roll, and the return to the title.
4. **Load slot 1** and confirm the Tour is complete and everything is unlocked.
5. **Exhibition with four bot players** (two a side) for one inning in a random park; the results screen.
6. **Derby** with two hot-seat bots; the initials entry.
7. **Hub round** with the mock: card, ready, start, progress, result, end.
8. Open the About screen and every page; open the pause menu, then Dev Mode, move a slider, reset it.

### 11.5 Balance sims (part of the `ai` suite)

- Seeded CPU-vs-CPU 9-inning games at Pro must land in the ranges of T-AI-01: 6 games in the default run, 30 with
  `--full` (`M.fast = true` keeps them quick).
- Each difficulty pairing: in the default run, the higher level must score more runs in total over 3 seeded games;
  with `--full`, it must win at least 60% of 10.
- A bot batter against each pitch type: the contact rate is 55–85% at Pro.
- The Batzooka's home run rate on contact is 70–95%.
- The mean Derby round score of the bot is 1,500–4,000 ft.

These sims only report. The defaults are tuned with them and the sliders in M8, and the ranges stay as tests.

### 11.6 Browser checks (`--browser`)

- `node tools/check.mjs <bundle>.html` at the default 1280×720, then with `#match`, `#derby`, `#about`, `#gallery`,
  then `--size 1920x1080`, and `#touch --size 390x844@3` (the touch-only card). There must be no errors, no external
  requests (the bundle is offline), and the canvas covered. Act on every look note.
- `tools/filmstrip.mjs` strips (with `--seed 1`, so they repeat) of the swing (contact, power, Batzooka), the pitch,
  the throw, the dive, the slide, the wall climb, the umpire calls and the Rhubarb punches. Look at each: wind-up,
  strike and settle, with no jerks or backward sweeps.
- **Screenshots only for what scripts can't judge.** Look at each:
  - the Plate Cam in each park and both batter's boxes;
  - the Broadcast Cam on a deep fly;
  - the HUD at 1920×1080 (a TV);
  - prompts for the pad (PlayStation and Xbox), the keyboard and the mouse;
  - the title, Team Select, the Tour Map, the clubhouse, the results, Dev Mode, the About pages;
  - the Moonshot Cam;
  - each hazard;
  - the touch-only card.

### 11.7 The AI Hub harness (`--hub`)

`tests/hub.mjs` (Playwright):
1. Copy the bundle beside `hub/harness.html`, `bridge.js` and `round.js`, and start `tools/serve.mjs` (127.0.0.1,
   port 0).
2. Open `harness.html?game=<bundle>.html&players=2&auto=1`. Wait for `document.body.dataset.complete === 'true'`, then
   require `window.__hubCheck.pass === true`, and print the failing checks if not.
3. Repeat with `players=4&latency=150&jitter=50&loss=5&auto=1`, and with `players=2&scenario=host-leave&auto=1`.
4. Open the bundle alone to confirm it reaches the title outside a session.
5. Stop the server by its PID.

---

## 12. Packaging and hand-off

**`tools/build.mjs` writes the single file** `BatzookaBaseball-Baseball-claude-opus-5-5-max-20261103-174819.html`
into this folder (the dev folder's parent), from this template:
```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<script>/* vendor/aihub-session.js, unmodified, inlined: the first script, right after meta charset */</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Batzooka Baseball</title>
<meta name="description" content="Over-the-top arcade baseball: fireball pitches, a rocket-powered bat, wall-climbing catches and bench-clearing rhubarbs.">
<!-- the hub tags of §6.21 -->
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#screen{width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none}</style>
</head>
<body>
<!-- E.bootSplash('BATZOOKA BASEBALL') markup, as the handoff's index.html has it -->
<canvas id="screen"></canvas>
<script>/* engine/my-3d2dge.js */</script>
<script>/* engine/mocap-readable.js + engine/mocap.js + assets/mocap-batzooka.js */</script>
<script>/* build/game.js */</script>
</body>
</html>
```

**Build rules:**
- **Inlined code:** inline each file as is. If one contains `</script` or `<!--`, stop with an error naming the file
  and line, and fix the source (don't escape blindly).
- **No outside requests:** no CDN and no network; the page works from file://.
- **Size:** the bundle is about 1.5–2 MB, which is fine.
- **The hub client:** after building, check that the bundle's first `<script>` is the hub client, byte-identical to
  `vendor/aihub-session.js`.

**Before handing back:**
1. Every test is green with `node tests/run.mjs --all`, including the playthrough, the browser checks and the hub
   harness.
2. No leftovers: `grep -rniE "TODO|FIXME|XXX|placeholder|lorem|stub|not implemented" src/` finds nothing, and no
   screen, line or button says "coming soon".
3. The About/Credits screen shows the final Source Information and the three feedback sections, answered honestly (the
   number of issues testing caught, how many were critical, the most and least helpful tests; the six engine answers;
   the four prompt answers), with "unknown" where something can't be confirmed.
4. **`exit-interview.json`** sits in this folder beside the .html, in exactly TASK.md's shape, with every value filled
   in (§6.27 for `aiHub`). It must parse:
   `node -e "JSON.parse(require('fs').readFileSync('exit-interview.json','utf8'))"`.
5. `ENGINE-CHANGES.md` is complete, and the same list is in the engine feedback.
6. **The final chat reply** holds the Source Information, the Testing Feedback, the Engine Feedback and the Prompt
   Feedback (as TASK.md requires), and a short summary of the game.

---

## Appendix A: `BZ.TUNE` defaults (the dev sliders)

| Group | Key | Default | Min–max | Meaning |
|---|---|---|---|---|
| Pitching | `pitchSpeed` | 1.0 | 0.5–2.0 | × every pitch's speed |
| | `pitchBreak` | 1.0 | 0–2.5 | × break |
| | `aftertouch` | 1.0 | 0–3 | × in-flight steering |
| | `releaseWindow` | 1.0 | 0.3–3 | × the perfect-release window |
| | `staminaDrain` | 1.0 | 0–3 | × stamina cost |
| Batting | `swingTiming` | 1.0 | 0.3–3 | × the timing windows |
| | `sweetSpot` | 1.0 | 0.4–2.5 | × reticle radii |
| | `exitVelocity` | 1.0 | 0.5–2.0 | × exit speed |
| | `launchSpread` | 1.0 | 0–2 | × the launch-angle response to reticle offset |
| Ball | `gravity` | 1.0 | 0.3–2.5 | × 520 U/s² |
| | `drag` | 0.05 | 0–0.3 | per second |
| | `bounce` | 1.0 | 0.3–1.5 | × surface restitution |
| | `rollFriction` | 1.0 | 0.3–3 | × rolling deceleration |
| | `wind` | 1.0 | 0–3 | × the park's wind |
| Players | `runSpeed` | 1.0 | 0.5–2 | × runners |
| | `fielderSpeed` | 1.0 | 0.5–2 | × fielders |
| | `throwSpeed` | 1.0 | 0.5–2 | × throws |
| | `catchRadius` | 1.0 | 0.5–2.5 | × catch reach |
| | `turboPower` | 1.0 | 0–2 | × the turbo boost |
| | `turboDrain` | 1.0 | 0–3 | × the drain |
| Over the top | `meterGain` | 1.0 | 0–5 | × meter gains |
| | `batzookaPower` | 1.6 | 1.0–3.0 | the Batzooka's exit multiplier |
| | `rhubarbChance` | 0.4 | 0–1 | chance on a hard HBP |
| | `hazardRate` | 1.0 | 0–4 | × hazard frequency |
| CPU | `cpuBat` `cpuPitch` `cpuField` `cpuRun` | 1.0 | 0–2 | × CPU skill |
| Camera | `plateDist` | 72 | 40–140 | U behind the plate |
| | `plateHeight` | 36 | 16–90 | camera height |
| | `plateFov` | 46 | 30–80 | degrees |
| | `fieldZoom` | 1.0 | 0.4–2 | × Broadcast zoom |
| | `heightSquash` | 0.45 | 0.2–1 | drawn height above 40 U |
| Game | `gameSpeed` | 1.0 | 0.25–2 | `game.timeScale` |

## Appendix B: Controls

The full action table and the per-context button meanings are in §6.14. The same tables appear in the Playbook, drawn
with the device's glyphs.

## Appendix C: Bus events

`scene`, `pitchSelect`, `windup`, `release`, `pitchCross`, `swing`, `contact`, `miss`, `call` ({ kind: 'strike' |
'ball' | 'foul' }), `walk`, `hbp`, `strikeout`, `inPlay`, `fielded`, `catch` ({ fly, dive, wall }), `drop`, `throw`,
`throwError`, `out` ({ how: 'fly' | 'force' | 'tag' | 'k' | 'pickoff' }), `safe`, `advance`, `run`, `homer` ({ dist,
batzooka, target }), `groundRuleDouble`, `steal` ({ ok }), `pickoff`, `doublePlay`, `meter` ({ team, value }),
`meterFull`, `super` ({ kind }), `turbo`, `dive`, `climb`, `slide`, `bowlOver`, `rhubarbStart`, `rhubarbEnd`, `hazard`
({ kind }), `halfEnd`, `inningEnd`, `leadChange`, `walkoff`, `gameEnd`, `replay`, `cinematic`, `lesson` ({ id, passed
}), `tourStop` ({ stop, won }), `purchase`, `derbyHit`, `hubState`.

## Appendix D: `game.debug`

| Member | What |
|---|---|
| `snapshot()` | `{ scene, phase, inning, half, outs, balls, strikes, score: [away, home], bases: [ids], batter, pitcher, ball: { x, y, z, vx, vy, vz, mode }, lastContact: { timingMs, dx, dz, Q, EV, launch, spray }, meters, turbo, fielders: [{ pos, x, y, state }], runners: [{ id, base, target, state }], cam: 'plate' \| 'broadcast' \| 'moonshot' \| 'replay', ctx, tour: { stop, fb }, attract: { on, segment }, hub: { active, phase, score, sent }, dev: { open, tab }, touchOnly, device, glyphs, errors }` |
| `setup(o)` | `{ park, away, home, inning, half, outs, balls, strikes, score, bases, batterIdx, meters, turbo, seed, difficulty }`: places a situation at once |
| `force(o)` | `{ nextPitch: { type, x, z, q }, contact: 'perfect' \| 'miss' \| { timingMs, dx, dz, swing }, hazard: 'now', rhubarb: true, homer: true }` |
| `tune`, `resetTune()` | the live TUNE object and the reset |
| `events` | the bus's ring buffer |
| `bot` | `{ on(side, { level, cheats }), off(side) }`: the bot plays that side through its inputs |
| `step(n)`, `skip(phase)` | n fixed steps; jump past a cinematic or phase |
| `warp(scene, data)` | the dev WARP, for tests |
| `hubMock(info)` | installs a fake `AIHub` for headless hub tests |
