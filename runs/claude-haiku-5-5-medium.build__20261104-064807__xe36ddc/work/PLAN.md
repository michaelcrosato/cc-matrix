# CRICKET KERFUFFLE

*An over-the-top arcade cricket game, where every ball causes a commotion and the tea is always stewed.*

Title picked as TASK.md asks: 50 playful riffs on "cricket" were brainstormed silently, then a real random number generator chose one (`python3 secrets.randbelow(50)` returned 47, entry #48: **Cricket Kerfuffle**). Don't re-roll it. A *kerfuffle* is a fuss or commotion, very British and very village cricket.

**Core loop, in one sentence:** smash the ball or bowl it past the bat, run like a startled hen between the wickets, and win the match before the rain, the cow or Lord Thrumpton gets in the way.

This plan is for the developers (people or AI models) who build the game from TASK.md and this file alone. Its parts:
§1 deliverables and ground rules · §2 the game in brief · §3 architecture · §4 units and coordinates · §5 every system (each with how to test it) · §6 art · §7 animation · §8 content · §9 build order and milestones · §10 risks · §11 testing · §12 final checklist · §13 where each TASK.md requirement is met.

Numbers in this plan are **starting values**. Each one marked *(T)* is a live dev-mode slider (§5.19), so tune by playing, not by guessing.

---

## 1. Deliverables, names and ground rules

### 1.1 Names (use exactly)
- GameTitle token: `CricketKerfuffle`. SOURCE token: `Cricket`.
- Dev folder (all working files): `CricketKerfuffle-Cricket-claude-opus-5-5-max-20261103-174825/`, inside the folder that holds TASK.md and this PLAN.md.
- The single-file game: `CricketKerfuffle-Cricket-claude-opus-5-5-max-20261103-174825.html`, in that same root folder, beside TASK.md.
- `exit-interview.json`, also in that root folder, beside the .html.
- If *your* TASK.md gives a different model or timestamp suffix, use your TASK.md's suffix with the same GameTitle and SOURCE tokens.
- On screen the title is **CRICKET KERFUFFLE**. In the AI Hub catalogue it is `Cricket Kerfuffle`.

### 1.2 Sources to build on
- **Engine:** my-3D2dge **v0.85.2**, handoff package: `https://github.com/michaelcrosato/my-3d2dge/tree/main/dist/handoff` (commit `4390a98` when this plan was written). Copy the whole `dist/handoff/` folder into `<dev>/engine/` and treat it as yours to change (§3.5 lists the planned engine changes).
- **AI Hub:** Session Protocol v1, client **1.4.0**: `https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub`. Download only the files you need with `curl -fsSO https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/<file>`: `README.md`, `session.js`, `harness.html`, `bridge.js`, `round.js` and `examples/parallel.html`. **Don't `git clone` ai-hub:** a shallow clone took over 5 GB of disk when this plan was written.
- **Read before coding.** Read these whole: `engine/API.md`, `engine/kits/sports.js` (the closest kit: ball as a Body, aftertouch, formations, a radar, commentary on Dialog's radio, a bot), `engine/docs/ASSETS.md`, `engine/modules/arcade.js` (tables, initials, attract helpers) and the hub `README.md`. In `engine/AI_GUIDE.md`, read these sections: *Standard features*, *Frame order*, *Scenes*, *Camera*, *Players*, *Motion and timing*, *TileMap*, *Humanoid*, *Audio*, *Text and UI*, *Lighting*, *Testing without a browser* and the final *Checklist*. Search `engine/API-INDEX.md` for names; don't read it whole.
- **Machine etiquette (from TASK.md).** Other agents share the machine.
  - Read only your own folder.
  - `/tmp` may be full, so clone into `<dev>/.cache/` or `~/.cache/<unique-name>/`.
  - When a server is needed, run `python3 -m http.server 0 --bind 127.0.0.1` from the folder to serve, parse the port it prints, and confirm the page is yours (fetch it and check for `<title>Cricket Kerfuffle`).
  - Stop only the processes you started, by PID. Never use pkill or killall, and never kill whatever holds a port.

### 1.3 Ground rules that shape everything
- No TODOs, placeholders or stubs: every feature in this plan ships complete. Where the plan offers a simpler fallback (§10), the fallback must be complete too.
- All audio is synthesized in code: no audio files. Voices are Animalese/Simlish-style gibberish (§5.13).
- Controller first, for a TV seen from 10 feet away (§5.14 and §5.15). Keyboard and mouse must feel native. Touch-only devices get no touch controls (§5.15.6).
- The game runs from `file://` with no network requests. The AI Hub client only talks to the hub when the hub opened the page.
- The performance budget is unlimited (TASK.md), so FPS tuning is out of scope. Still avoid pathological designs, such as re-baking the floor every frame (§5.11).

---

## 2. The game in brief

| | |
|---|---|
| Genre | Arcade sports (cricket), over the top, with a comedy story campaign |
| Perspective | 2.5D in the engine's projected-3D views. A **broadcast camera** (TV-style, behind the bowler, looking down the pitch at the batter) for every delivery. A high **wide camera** that follows the ball round the ground. A side-on **review camera** for third-umpire replays and a **close-up camera** for celebrations. Story scenes use the three-quarter view. |
| Players | 1 to 4 on one machine: versus, co-op and 2v2, all on one shared screen. 1 to 4 on separate devices through AI Hub sessions (*Super Over Showdown*, parallel mode). |
| Tone | Village cricket's gentle eccentricity: tea, cake, drizzle, the vicar as umpire, a cow at deep midwicket. Delivered in the voice of the cricket commentary box (digressive, plummy, dry, given to long tangents) and of Wisden-style match reports. Then turned up to arcade bombast: flaming bats, triple-ball bowling machines, sixes through the pub window. |
| Session | Story campaign of about 40 minutes (5 chapters). A Quick Match takes 4 to 12 minutes. A Super Over Showdown takes 2 minutes. |

**What the player can do:**
- Bat: aim with the stick or mouse; play a ground, lofted or defensive shot, or leave; charge down the pitch; use a signature special.
- Run: call runs, send the partner back, dive for the crease.
- Bowl: pick 1 of 3 deliveries or a special; place the pitching marker; time the release meter; add aftertouch swing or drift; choose the field; bowl over or round the wicket.
- Field: chase with the active fielder, dive, take catches on a timing ring, throw to either end for run-outs.
- Review an umpire's decision once per innings.
- Pick up arcade items, smash stadium targets, survive chaos events, go ON FIRE.

**What the player can't do:** walk freely around the ground, edit teams or players, or play innings longer than 5 overs (no Test matches). In story mode the player always captains Kerfuffle CC. Each screen's help and the Nets mode make these limits clear.

**Modes:** Story (*The Grand Kerfuffle*), Quick Match, Super Over Showdown (bat or bowl; high-score tables), Nets (practice, lessons and the "Six Machine" challenge), Versus (local 2–4), AI Hub session (parallel Super Over), plus Attract mode, Dev mode and About/Credits.

---

## 3. Architecture

### 3.1 Stack
- **my-3D2dge v0.85.2**, the full engine (`engine/my-3d2dge.js`, every module built in). Use these parts:
  - `E.Game` scenes, boot steps, the standard pause menu, settings, controls, full screen and saves;
  - `E.TileMap` for the ground;
  - custom `E.View`s;
  - `E.Humanoid` rigs, `E.Attack` specs and `E.ACTIONS`;
  - `E.Body`, particles, lights and weather;
  - `E.Dialog`, `E.Menu`, `E.font`, `E.ui`;
  - `game.script`, `game.tween`, `E.Path`;
  - the `arcade` module (`E.Arcade` tables and initials), the `story` module (`E.Story` for cutscene data) and the `songs` module (jingles);
  - the chip synth `game.audio`, plus our own Web Audio voice synth on the engine's audio context.
- **AI Hub session client 1.4.0**, pasted unmodified.
- **Node 18+** for the build and the headless tests. **Playwright 1.63.0** (pinned by `engine/package.json`) for the browser checks and the AI Hub harness.
- Nothing else. No libraries, no CDN, no fetch.

### 3.2 Folder layout (inside `<dev>`)
```
engine/                 copy of dist/handoff (modified: see 3.5 and engine/CHANGES-KERFUFFLE.md)
vendor/aihub/           session.js (unmodified), harness.html, bridge.js, round.js, README.md
src/                    the game: plain script fragments, concatenated in name order into one IIFE
  00-head.js            'use strict'; const E = My3D2dge; shared helpers (clamp, lerp, ...)
  01-const.js           units, geometry, enums (4)
  02-tuning.js          TUNING registry: defaults, difficulty multipliers, live get/set, persistence (5.19)
  03-rng.js             seeded streams: play, cosmetic, hub (3.4)
  04-bus.js             event bus: on(type, fn), emit(type, data); a 200-entry event log for dev mode
  05-store.js           profile: campaign progress, stars, unlocks, settings mirror, high-score ids
  06-assets-store.js    the few store entries used, cut by engine/tools/asset-set.mjs (6.3)
  07-assets-kerfuffle.js our new shapes and materials, as a standalone set file (6.5)
  10-data-teams.js      teams and players (8.2)
  11-data-grounds.js    ground recipes (8.3)
  12-data-deliveries.js delivery catalogue (8.4)
  13-data-shots.js      shot catalogue and the resolver table (8.5)
  14-data-specials.js   signature specials (8.6)
  15-data-arcade.js     items, stadium targets, chaos events (8.7)
  16-data-story.js      chapters, scenes, beats, goals (8.8)
  17-data-lines.js      commentary lines, match-report templates, UI copy (8.9)
  18-data-music.js      songs and stings (8.10)
  20-ball.js            ball physics and the trajectory predictor (5.1)
  21-bowling.js         delivery choice, marker, meter, release, aftertouch (5.2)
  22-batting.js         shot resolver, timing, contact, edges (5.3)
  23-running.js         running between wickets (5.4)
  24-fielding.js        fielders, interception, catches, throws, keeper (5.5)
  25-umpire.js          decisions, LBW, run-out, stumping, review (5.6)
  26-rules.js           match state, laws, scoring, scorecard (5.7)
  27-ai.js              CPU batting, bowling, captain, fielding, autopilot (5.8)
  28-hype.js            Hype meter, ON FIRE, specials runtime (5.9)
  29-chaos.js           items, targets, chaos events, weather, time of day (5.10)
  30-ground.js          TileMap builder from a ground recipe, floor texture, stands, crowd, panoramas (6.3)
  31-cast.js            rig factory: kits, gear, bat, faces, portraits (6.4)
  32-anim.js            pose library: stance, shots, bowling action, fielding, umpire signals (7)
  33-fx.js              trails, flames, stumps and bails, splinters, fireworks, confetti (6.6)
  34-camera.js          views and the camera director (5.11)
  35-replay.js          recorder, Owl-Eye replay, third-umpire screen (5.11)
  40-audio.js           SFX voices, crowd engine, music glue, stings (5.13)
  41-voice.js           gibberish speech synth (5.13.3)
  42-commentary.js      commentary director and captions (5.12)
  43-glyphs.js          button and key icons, device-following prompts (5.14.3)
  44-hud.js             match HUD (5.15.2)
  45-ui.js              10-foot widgets: big menus, cards, panels, sliders (5.15)
  50-title.js 51-attract.js 52-front.js (main menu, setup, versus lobby) 53-story.js (map, cutscenes)
  54-match.js (gameplay scene) 55-results.js 56-nets.js 57-showdown.js 58-about.js
  60-hub.js             AI Hub session flow (5.17)
  70-dev.js             dev panel (5.19)
  80-debug.js           game.debug: snapshot, force*, bot hooks (11.2)
  99-start.js           new E.Game(...), scenes, boot steps, game.start
tools/build.mjs         concatenate src -> dist/game.js; write dist/index.html (dev page) and the single-file game
tools/serve.mjs         start python3 http.server on port 0 at 127.0.0.1; return { port, pid, stop() }
test/run.mjs            THE one test command (11.1)
test/suites/*.mjs       the suites
test/hub/               harness files + the built game, served for the harness run
dist/                   game.js, index.html (loads ../engine/my-3d2dge.js and game.js: quick iteration)
DESIGN-NOTES.md         short: how to add a team, a ground, a chapter, a delivery, a shot, a line
```

### 3.3 How the code is organized
- **Simulation and presentation are separate.** The match simulation lives in `20–29`. It is pure and deterministic: fixed steps of 1/120 s, seeded RNG, no drawing and no audio. Presentation lives in `30–45`: it reads the simulation's state and listens on the event bus. Tests drive the simulation headless. The attract mode and the AI drive it through the same input interface a player uses.
- **Registries.** All content is data keyed by id: teams, players, grounds, deliveries, shots, specials, items, targets, events, chapters and lines. Systems look things up by id, and content never edits system code. Adding a ground means a new recipe in `11-data-grounds.js` plus any new shapes. `DESIGN-NOTES.md` says how, for each kind of content.
- **Event bus.** The rules emit events: `ball:released`, `ball:pitched`, `bat:contact {timing, shot}`, `ball:edge`, `ball:beaten`, `runs {n}`, `boundary {4|6}`, `wicket {how}`, `catch:dropped`, `appeal`, `decision {out, review}`, `extra {kind}`, `over:end`, `innings:end`, `match:end {result}`, `hype:full`, `fire:on|off`, `special {id}`, `item {id}`, `target:hit {id}`, `chaos {id}`, `rain:start|end`, `review:start|result`, `milestone {fifty|hattrick|maiden}`. Commentary, crowd, HUD, camera, Hype, achievements and the coverage tracker (§11) all subscribe.
- **TUNING.** One registry of the live gameplay variables. Systems read `T('ballSpeed')` at each use and never cache it, so dev sliders take effect at once.
- **The delivery director.** One state machine runs each ball (§5.7.3): `setup → runup → release → flight → inPlay → dead → between`. Each state has explicit exits and a timeout, so play can never stall.
- **Scenes** (`game.go(name, data)`): `title`, `attract`, `front` (main menu, mode select, setup, versus lobby), `storymap`, `cutscene`, `match` (pausable), `results`, `nets` (pausable), `showdown` (pausable), `about`, `hubcard` and `hubround` (pausable). Story, Quick Match, Showdown, Nets and the attract mode all run inside the `match` scene machinery, using a `MatchConfig` (§5.7.1).

### 3.4 Determinism and randomness
- `RNG.play`: gameplay randomness (seam, AI errors, fielding). Seeded per match from `MatchConfig.seed`.
- `RNG.cosmetic`: crowd, particles and commentary-line choice, so gameplay never depends on them.
- In AI Hub sessions, the over's deliveries come from `AIHub.rng('over')` and each ball's fielding stream from `AIHub.rng('field' + n)`, so every copy faces identical balls whatever the player does (§5.17).
- Never call `Math.random` in simulation code. It is fine for engine-internal cosmetics.

### 3.5 Planned engine changes
Make each change in `engine/my-3d2dge.js`. Log every one in `engine/CHANGES-KERFUFFLE.md`; About/Credits and the exit interview report them.
1. **Cricket bat:** a new Humanoid `weapon: 'bat'`. Add it next to the `o.weapon === 'sword'` branch in the HD draw, which uses `ops.push({ d, f })` with `J.handR`, `J.bladeDir` and `o.bladeLen`. It is a flat willow blade: length `o.batLen` (default 15 units: 5 handle, 10 blade), width 1.7 units, a darker edge line, a toe, and a coloured sticker band. Grip in `colors.grip`, blade in `colors.willow`. Give it a two-handed grip: the left hand IK'd to the handle, 2.5 units above the right hand (`E.ik3` from the left shoulder), applied in the draw pose. Add a smear for swings.
2. **Cricket gear:**
   - `pads: true`: white leg guards over the shins and knees, with buckles in `colors.trim`;
   - a `brim` hat style (umpire's and sun hats);
   - `hat: { style: 'helmet', grille: true }`: a batting helmet with a face grille;
   - `gloves: 'batting' | 'keeper'` for bigger hands;
   - `face: { moustache: 'handlebar' | 'walrus' | null, beard: 'full' | 'goatee' | null, glasses: true }`.
3. **Audio voice bus:** add `_voiceBus` beside `_sfxBus` and `_musBus`, a `voiceVolume` setting in the Sound group (label "Voices"), and `audio.bus(name)` returning the sfx, music or voice gain node, so the game's own Web Audio nodes follow the player's volumes.
4. **Button symbols:** in the standard settings table (`glyphs`, around line 2999), set the default to `'playstation'` and the options to `[['playstation','PlayStation'],['xbox','Xbox (A B X Y)']]`.
5. **Hub's Create + Options:** while `game.hubActive` is set and Pad8 (Create) is held, Pad9 (Options) must not open the pause menu.
6. **Floor bakes:** `TileMap._floor` keeps at most 6 baked floors (it clears the cache past that). Raise the limit to 10, so the four match cameras and the story views never re-bake (§5.11).
7. Any engine bug found along the way: fix it, and add one line about it to the log.

### 3.6 Build and bundle (`node tools/build.mjs`)
1. Concatenate `src/*.js` in name order inside `(() => { ... })();`, giving `dist/game.js`. Fail on a syntax error: run `new Function` on it in Node.
2. Write `dist/index.html`, which loads `../engine/my-3d2dge.js` and `game.js` as separate scripts (fast iteration).
3. Write the single file `../CricketKerfuffle-Cricket-claude-opus-5-5-max-20261103-174825.html`, in exactly this order:
   - `<!doctype html><html lang="en"><head><meta charset="utf-8">`;
   - **the session client** (`vendor/aihub/session.js`, byte-for-byte) as the first `<script>`;
   - viewport meta, `<title>Cricket Kerfuffle</title>`;
   - the hub tags (§5.17.1) and catalogue tags `hub:type`=`Game`, `hub:players`=`1-4`;
   - the page CSS (from `engine/game/index.html`), `</head><body>`;
   - the engine's boot splash markup (from `engine/game/index.html`, title CRICKET KERFUFFLE);
   - `<canvas id="screen"></canvas>`;
   - the engine inlined in a `<script>`, then `dist/game.js` inlined in a `<script>`.
   Escape any `</script>` inside the inlined code.
4. Print the size and the SHA-1 of the client block. The bundle test (§11) checks the block is identical to `vendor/aihub/session.js`.

---

## 4. Units, coordinates and constants (`01-const.js`)

- **Engine convention:** 16 world units = 1 m (docs/ASSETS.md). x east (screen right), y south (screen down in yaw-0 views), z up.
- **The pitch** runs along x = 0. The **striker's stumps are at y = 0** (the far end, top of the broadcast screen). The **bowler's stumps are at y = 320** (20 m; the near end, bottom of the screen). The striker's popping crease is at y = 20 and the bowler's at y = 300. Return creases are at x = ±21. The pitch strip is 48 units wide (3 m).
- The camera always looks from behind the current bowler, so the bowling end is always at +y. At each change of ends, the batters swap logical places and the field is recomputed relative to the new striker. Visually, the "far-end panorama" (§6.3) switches to the other end's.
- **Stumps:** physics box x ∈ [−3, 3], z ∈ [0, 12], depth 1. Drawn slightly larger for readability: 6 units wide, 12.5 tall, with two bails.
- **Ball:** physics radius 0.6 units. Drawn as a 4×4 px sprite at minimum, with a 2 px shadow disc, a trail and a glow at night. Leather red `#b8202a` with a cream seam, white at night, pink at the Megadome.
- **Players:** Humanoid size 1.15–1.25 (about 28–30 units tall), so `E.HEIGHTS` defaults hold.
- **Batter's frame (handedness):** angles are measured from "straight" (toward the bowler, +y), positive toward the **off side**. A right-hander (RHB) faces −x in stance, so the off side is −x (screen left in the broadcast view). For a left-hander, everything mirrors (x → −x). Store `hand = +1` (RHB) or `−1` (LHB). The world direction for a batter-frame angle θ is `[−hand·sin θ, cos θ]`.
- **Boundary:** an ellipse per ground (rx × ry, about 560–760 units, i.e. 35–48 m) centred on the pitch midpoint (0, 160), scaled by `boundaryScale` *(T)*.
- **Physics constants:**

  | Constant | Value |
  |---|---|
  | `gravity` *(T)* | 160 u/s² (real) |
  | `ballSpeed` *(T)* | scale 0.62 on nominal pace (a "140 km/h" ball travels at 386 u/s and reaches the bat in about 0.75 s) |
  | `pitchBounce` *(T)* | restitution 0.55 (times the ground's pitch factor) |
  | Outfield rolling decay | exp(−k·dt), k = 0.55 (ground factor; wet ×1.6) |
  | Grass bounce for hit balls | restitution 0.42 |
  | `runSpeed` *(T)* | 120 u/s |
  | `fieldSpeed` *(T)* | 105 u/s |
  | `throwSpeed` *(T)* | 420 u/s |

  At these values a single takes about 2.9 s, and a fielder 30 m away gathering in 1.2 s makes a close run-out.

---

## 5. Systems and mechanics

### 5.1 Ball physics and predictor (`20-ball.js`)
- **State:** `{ x, y, z, vx, vy, vz, spin (rad/s about z, signed), swingA (lateral accel), age, phase: 'held'|'delivery'|'hit'|'rolling'|'dead', pitched, bounces, lastTouch: {kind, id}, carried (hit and not yet bounced), trail[] }`.
- **Step (1/120 s), in order:**
  1. Gravity: vz −= g·dt.
  2. While `phase === 'delivery'` and not yet pitched, add swing: a lateral acceleration perpendicular to the ball's ground velocity, `swingA · min(1, age/0.35)` (late swing).
  3. Drift for spin.
  4. Drag: v ×= (1 − 0.02·dt).
  5. Integrate.
  6. Ground contact at z ≤ 0:
     - **On the pitch** (|x| ≤ 24 and y in −20..340), for a delivery: vz' = −vz · pitchBounce · ground.bounce · delivery.bounce. Horizontal speed × (0.86 − spinGrip). Turn the ground velocity by `turn° · ground.turn · T('spin')` plus the ball's stored seam deviation `ball.seamDev`. That deviation is drawn once **at release** from RNG.play (normal, σ = `seam` *(T)* · ground.seam · delivery.seam degrees) and kept on the ball. Emit `ball:pitched`.
     - **On grass** (any ball after the bat): bounce at 0.42; below 25 u/s vertically it becomes `rolling`, with decay k.
  7. Boundary check (§5.7.4).
  8. Target and item checks (§5.10).
  9. Stumps check (§5.6).
- **Solving a delivery** (`solveDelivery(release, target, kmh, deliveryType)`): given the release point (x = ±8 for over or round the wicket, y = 300, z = 34), the pitch target (tx, ty) and the speed, find the initial velocity that lands at the target *without* swing, using `E.arc`-style closed-form projectile maths with the delivery's dip. Swing and aftertouch then move the real pitching point. That is the point of swing, and what the batter must read.
- **Predictor** (`predict(ballState, seconds, opts)`): runs the same step function on a copy and returns sampled points `{t, x, y, z, phase}` every 1/120 s. It is used for:
  - the batting timing (when the ball reaches the contact plane);
  - the AI's reads;
  - fielder interception;
  - the landing point of a catch;
  - LBW (the path continued past the pad);
  - the Owl-Eye tube.

  The step function draws no random numbers (the seam deviation is already on the ball), so the prediction equals reality exactly. The AI adds its own perception error on top.
- **Tests (unit-ball):**
  - 50 random solved deliveries without swing pitch within 1 unit of the target;
  - an outswinger to a right-hander lands on the off side of the target (−x) and an inswinger on the leg side;
  - a leg break pitched on middle turns toward −x for a right-hander;
  - the predictor matches the stepped simulation within 0.01 units over 3 s;
  - rolling balls stop;
  - a ball dropped from z = 50 bounces lower each time.

### 5.2 Bowling (`21-bowling.js`)
**The flow for a human bowler:**
1. **Between balls**:
   - R1 (Space) cycles the field preset (Attacking, Balanced, Defensive, or Spin attack for spinners);
   - L1 (Shift) switches over or round the wicket;
   - the stick, WASD or the mouse moves the **pitch marker**: a ring on the pitch, clamped to y ∈ [20, 230] and |x| ≤ 30, with labelled length bands *yorker / full / good / short / bouncer* drawn faintly on the pitch the first few overs;
   - the delivery panel at the bottom shows the bowler's 3 deliveries on ✕ □ ○ and the special on △ (greyed out until Hype is full).
2. Pressing a delivery button starts the **run-up**: pace bowlers run 2.0 s, medium 1.5 s, spinners 0.9 s. The marker can still move during the run-up, at half speed.
3. **The release meter**: during the last 0.7 s, a needle sweeps a bar left → right → left at `meterSpeed` *(T)* (1.4 Hz). The centre zone (width `meterSweet` *(T)* 0.18 of the bar, scaled by bowler skill) is green. Press any delivery button or click (✕/J/LMB) to release:
   - **green**: accuracy scatter ±2 units, pace and spin 100–105%;
   - **amber**: scatter ±10, 90%;
   - **red edge**: scatter ±18, 80%;
   - **the far-right red tip** (the last 6%) is an **overstep**: a no-ball and a FREE HIT;
   - **no press**: auto-release at the end with an amber result.
4. **Aftertouch**: for 0.25 s after release, the stick's horizontal push adds swing (seamers) or drift (spinners), up to the delivery's allowance ±0.6. The mouse's horizontal movement does the same.
5. **Specials** (△ when Hype is full) skip the meter (always green) and add their effect (§8.6).

**CPU bowlers** use the same pipeline: the AI chooses a delivery and a target (§5.8), its meter press lands at a skill-based offset, and the result goes through the same code.

**Delivery types** are data (§8.4): pace, swing, spin and medium families, each with nominal km/h, length band limits (a bouncer pitches ≥ 140 units from the batter's crease), swing, seam, turn, bounce and dip multipliers, FX and AI weights. The HUD shows the speed after release ("143 KM/H") and the delivery name in small type.

**Wides and no-balls:**
- A **wide** is a ball passing the striker's popping crease more than 26 units to the off side or more than 18 to the leg side of the middle-stump line (x = 0, measured in the striker's frame), without touching the bat or the batter. A ball passing above z = 40 (a head-high bouncer) is also a wide.
- A **no-ball** comes from an overstep, or a full toss above z = 26 at the crease ("a beamer": over the top, the commentators gasp).

**Tests:**
- meter green → pitches within 3 units of the marker;
- red tip → `extra:noBall` and the next ball is `freeHit`;
- no input → amber auto-release;
- aftertouch right → pitch point moves +x;
- run-up durations per family;
- a field-preset cycle changes the fielder targets;
- over/round moves the release x.

### 5.3 Batting (`22-batting.js`)
- **Stance:** the striker takes guard with the body 8 units to the leg side of the stumps line, side-on, the bat grounded and the head turned to the bowler (§7). The non-striker backs up at the bowler's end.
- **Inputs:**
  - **aim** (the stick, WASD, or the mouse's ground point relative to the batter via `game.mouseGround()`: the mouse wins while it moved in the last second, else the stick). Aim is **in screen space**: push toward where the ball should go as you see it, turned into a ground direction with `game.view.screenDirToGround`. Down is straight back past the bowler, left and right go across the field, up goes behind the batter (fine). An aim arrow on the grass at the batter's feet shows the direction live;
  - **shot** ✕/J/LMB (ground), **loft** □/K/RMB (in the air), **block** ○/L/Q (defend);
  - **special** △/I/F;
  - **charge** R2/E: before the ball pitches, step 24 units down the pitch. This turns a good length into a half-volley, but a miss off a spinner means a stumping chance.
  - No button means a **leave**: the bat goes up. Against a bouncer above z = 28 the batter ducks or sways by himself when leaving or blocking.
- **Timing model:** each shot in the catalogue has `contactAt` (seconds from press to the bat's contact moment, e.g. a drive 0.13 s, a cut 0.11, a block 0.08). The predictor gives `tArrive`, when the ball reaches the shot's contact plane (front-foot shots y ≈ 36, back-foot y ≈ 14; a charge moves it). With Δ = (tPress + contactAt) − tArrive:

  | Grade | Window | Result |
  |---|---|---|
  | PERFECT | \|Δ\| ≤ `perfectMs` *(T)* 40 ms | full power, true direction |
  | GOOD | ≤ `goodMs` *(T)* 85 ms | 85% power, ±6° error |
  | EARLY / LATE | ≤ `okMs` *(T)* 150 ms | 60% power; direction pulled (early: toward leg) or sliced (late: toward off / behind), launch +8° (skier risk) |
  | MISS | beyond 150 ms | beaten: the ball goes on to pads, stumps or keeper |

  Presses made after the ball passed the contact plane are ignored. Show a big timing word for 0.6 s (PERFECT in gold, GOOD, EARLY, LATE), on by default.
- **Shot resolver:** maps (button, stick sector in the batter's frame, ball length at pitch, ball line and height at contact) to one shot from the catalogue (§8.5). For example: ✕ + off sector + full ball = cover drive; ✕ + leg + short = pull; □ + leg + short = hook; □ + behind = scoop; □ + straight vs a yorker = helicopter. A neutral stick uses the shot's natural direction for that ball.
- **Reach check:** each shot has a contact zone (line range and height range relative to the batter). Outside the zone by up to `edge` *(T)* × 4 units gives an **edge**:
  - a thin edge goes to the keeper or slips: speed 35–55% of the incoming, deflected 150–175°, slight rise;
  - a thick edge goes to third man or gully;
  - an inside edge goes onto the pad or stumps ("dragged on").

  Further outside is a **miss**.
- **The outgoing ball:**
  - direction: the aim direction, else the shot's natural direction, plus the timing error, plus RNG.play noise of σ 2°;
  - speed: `shot.speed × batter.power × timingFactor × (1 + 0.25·incoming/386) × T('batPower' or 'loftPower')`, × 1.2 when ON FIRE;
  - launch angle: from the shot (ground 2–10°, lofted 28–48°), plus timing (early lofted shots go higher).

  Ground shots bounce and roll. Lofted shots carry.
- **Visual alignment:** the swing's animated contact is timed to `contactAt` through `E.Attack` phases (the wind phase ends at contact). During the last 30 ms, the ball's *drawn* position is pulled toward the bat's sweet spot, cosmetically only. Contact spawns splinters or sparks at the bat and plays the "tock".
- **Tests (unit-shots, sim):**
  - every resolver row gives its shot;
  - Δ = 0 gives PERFECT and Δ = 60 ms gives GOOD;
  - a press 200 ms early misses;
  - a ball 6 units outside a drive's zone edges behind;
  - stick straight plus PERFECT ✕ on a half-volley gives a direction within ±10° of straight;
  - a charge then a miss vs spin with the keeper up gives a stumping;
  - leaving a ball on the stumps gets the batter bowled;
  - leaving a ball 20 units outside off is safe;
  - ducking a bouncer leaves the batter not out with no wide called unless z > 40.

### 5.4 Running between wickets (`23-running.js`)
- **Calls:** after contact (or byes and leg byes when the ball beats the bat and gets past the keeper), the striker's call is shown in a speech bubble: **YES / NO / WAIT**, with a glyph prompt "R1 RUN" or "L1 STAY". The human presses **R1/Space** to run, **again** at the crease to turn for another run, and **L1/Shift** to send both back. **R1 within 50 units of the crease** while a throw is coming in makes the batter **dive**: the bat slides the last 20 units, so the bat is grounded 0.15 s sooner, and he gets up after 0.6 s.
- **The partner:** the non-striker is the AI (1P), or the second human in co-op (§5.16.5). The AI partner follows the human's YES and NO. In co-op both must call YES within 0.4 s, or there's a **mix-up**: both may run to the same end, and whoever left his crease is the one run out. The two gibberish shouts overlap.
- **Movement:** batters accelerate at 600 u/s² to `runSpeed` *(T)*, turn at the crease in 0.25 s, carry the bat, and slow 15% on sand or wet ground. Runs count as each batter grounds the bat beyond the far popping crease; a short run is not modelled.
- **AI calling** (also used for the YES / NO / WAIT bubble hint): compare the batters' time to complete the next run with the fielding side's earliest time to break the stumps at the far end (§5.5 interception plus throw time). Margin > 0.35 s gives YES. Margin < −0.15 s gives NO. In between it's WAIT, and the CPU decides by aggression.
- **Tests:** a push to cover with R1 once gives 1 run and the strike rotates; R1 twice on a slow outfield shot gives 2; L1 mid-run sends both back to their crease; a co-op mix-up gives exactly one run-out; a dive beats a throw arriving 0.1 s after the undived time.

### 5.5 Fielding (`24-fielding.js`)
- **Positions:** field presets are lists of `{ pos: 'slip1', θ, d }` in the batter's frame (§8.4.2), so a left-hander gets the field mirrored. Between balls, fielders walk to their spots (and teleport if more than 3 s away). As the bowler runs in they **walk in** a few steps, crouched (the engine pose `crouch`, with forward motion).
- **Interception:** on contact, the predictor samples the ball every 0.05 s. For each fielder, find the earliest t where dist(fielder, ball(t)) ≤ fieldSpeed·(t − reaction 0.18 s) + reach (catch reach 9 for aerial balls at z ∈ [4, 40]; stop reach 6 on the ground; dive +18).
  - The best fielder **chases**, the second-best **backs up**, the keeper and bowler run to their stumps, and the rest hold.
  - If no interception exists before the boundary, the nearest deep fielder chases anyway (it reads well) and a FOUR or SIX follows.
- **Catches** (the ball carried from the bat):
  - **CPU side:** success p = clamp(fielder.catch × difficulty − 0.25·(ball speed/400) − 0.3·(dive ? 1 : 0), 0.05, 0.97), drawn from RNG.play.
  - **Human side** (Manual or Assisted fielding, §5.15.5): the **catch ring** QTE. An outer ring shrinks onto an inner ring at the catch point over `catchRing` *(T)* 0.9 s. ✕/J/LMB within `catchWindow` *(T)* ±110 ms of the overlap catches, and a PERFECT press with a dive becomes a "SCREAMER!" with slow-mo. Early or late is a juggle (50% then a 2nd ring of 0.4 s). No press or a miss is DROPPED. In Assisted mode, easy chances (p > 0.85) are caught automatically.
- **Ground fielding:** the fielder gathers when the ball is within reach: 0.25 s for a stop, a dive stop on ✕ if the ball passes within 18 units. A misfield chance (1 − fielder.ground) × 0.1 lets the ball through.
- **Throws:**
  - **Human:** after gathering, **✕/J/LMB throws to the striker's end** (the keeper's end), **□/K/RMB to the bowler's end**, **○/L/Q lobs back to the keeper** (no shy). With the mouse, clicking either set of stumps in the world (or its icon) throws there. A press within 0.3 s of gathering is a "rocket": throw speed +20%.
  - **CPU:** throws to the end with the better run-out margin.
  - The throw follows an `E.arc` toward the stumps with error N(0, `throwError` *(T)* × distance/480). A **direct hit** is when the path crosses the stumps box. Otherwise the keeper or bowler, if within 10 units of the stumps, collects and breaks them in 0.2 s. A missed shy with nobody backing up gives **overthrows**: the ball runs on, and the batters may run more.
- **Keeper:** stands 160 units back to pace and 24 units (standing up) to spin and medium. Catches edges (CPU p from keeper skill; human edges use the catch ring too), collects deliveries, stumps after a charge-and-miss (0.25 s), and receives throws.
- **Tests:**
  - an interception is found for a ball hit straight at mid-off;
  - nobody intercepts a perfectly placed cover drive into a gap at 450 u/s on a fast outfield → FOUR;
  - a CPU catch with p = 0.97 under a seeded RNG gives "caught";
  - a human ring press at the overlap catches, and no press drops;
  - a ✕ throw with the striker 30 units short and a direct hit is OUT;
  - a missed shy with no backup gives ≥ 1 overthrow;
  - no fielder is ever more than 15 s in one state (stuck check, run in bot-match).

### 5.6 Umpiring and dismissals (`25-umpire.js`)
- **Bowled:** the ball enters the stumps box with bails on (the stumps check in the ball step); the bails fly as physics sprites. **Hit wicket:** a back-foot shot with an EARLY/LATE grade has a 1.5% chance; the bat clips the stumps, comically. **Caught:** §5.5. **Run out:** stumps broken while the batter heading to that end hasn't grounded his bat. **Stumped:** the keeper breaks the stumps while the striker is out of his ground after a miss, and not attempting a run.
- **LBW:** if the ball meets the front pad box before the bat (box around the leading leg: 6×4×16), evaluate the truth:
  1. pitched outside leg stump → not out;
  2. impact outside off stump *and* a shot was offered → not out;
  3. the predictor continues from the impact with the pad removed: does it hit the stumps box (inflated by the ball radius)? → out.

  If the predicted path is within 1 unit of the stumps' edge, the result is **UMPIRE'S CALL**: the on-field decision stands on review.
  - **The on-field decision:** the umpire is "right" with probability `umpire.accuracy` (Rev. Hollis 0.86, others 0.92), from RNG.play. Wrong decisions are what reviews are for.
- **Appeals:** the fielding side appeals ("HOWZAT!" in gibberish, arms up) for every LBW candidate, caught-behind edge and close run-out. Umpire signals follow (§7).
- **The Kerfuffle Review System (KRS):** each side has 1 review per innings. After a decision, the batting side (on OUT) or the fielding side (on NOT OUT) has 4 s to press **△/I/F "REVIEW"** (the CPU reviews when its truth confidence > 0.7). The review plays the **Owl-Eye** replay (§5.11.4): the ball path tube, the pitching and impact markers, a three-light verdict (PITCHING, IMPACT, WICKETS), each green, red or amber for umpire's call. Then OUT or NOT OUT is stamped like a slot machine. A successful review is kept; a failed one is lost.
- **Third umpire** (automatic, no review used): run-outs and stumpings with a margin under 0.15 s, and catches where the ball touched the ground within 0.05 s of the catch, are sent upstairs. The side-on review camera replays in slow-mo and a big screen reveals OUT or NOT OUT.
- **Tests (unit-umpire):** the three LBW truth rules; umpire's call; the accuracy draw is seeded; a review overturns a wrong decision and is kept; a failed review is lost; a run-out margin of 0.1 s triggers the third umpire; a stumping requires the striker out of his ground.

### 5.7 Match rules and scoring (`26-rules.js`)

#### 5.7.1 MatchConfig and state
```js
MatchConfig = { mode: 'story'|'quick'|'showdown'|'nets'|'attract'|'hub'|'versus',
  teams: ['ker','mud'], ground: 'green', overs: 2, wickets: 5, ballsPerOver: 6, maxOversPerBowler: 'auto',
  difficulty: 'village'|'county'|'test'|'kerfuffle', kerfuffleRules: true, timeOfDay: 'day'|'dusk'|'night',
  weather: 'clear'|'overcast'|'rain'|'fog', toss: true, scenario: null | { innings, target, battingFirst, preset },
  humans: { bat: [inputIndex...], bowl: [...] }, seed, superOver: true, reviewsPerInnings: 1, chapter: null }
```
- `maxOversPerBowler: 'auto'` means ceil(overs / 5): one over each for 1–5-over innings, so several bowler types appear.
- The match state holds the innings array: runs, wickets, legal balls, extras `{wd, nb, b, lb}`, batter cards (runs, balls, 4s, 6s, how out), bowler cards (balls, runs, wickets, maidens), ball records, partnership, target, revised target, free-hit flag, reviews left, Hype, ON FIRE, items held, and the result.
- `rules.applyBall(state, outcome) → { state, events[] }` is a **pure function**. Every ball record is kept for the results screen, the highlights and the report.

#### 5.7.2 The laws (arcade cut)
- An over is 6 legal balls. Wides and no-balls add 1 run and are re-bowled.
- **FREE HIT** after a no-ball: the only dismissal is run out. The umpire circles his finger and the HUD flashes FREE HIT.
- The strike changes on odd runs and at the end of each over.
- An innings ends at the overs limit, the wickets limit, or (2nd innings) when the target is passed.
- **Result:** won by N runs (side batting first) or by N wickets (chasing side), with "B balls to spare" text. A **tie** goes to a **Super Over**: each side bats 1 over with 2 wickets, the side batting second in the match bats first, and if it's tied again the side with more boundaries in the Super Over wins. This is the real rule simplified, and it is shown as a tooltip.
- Byes and leg byes come from running after a miss (leg bye if it hit the pad).
- Milestones: fifty (rare in short games, but supported), hat-trick (three wickets in three of a bowler's balls) and maiden.

#### 5.7.3 The delivery director (per ball; every state has a timeout)

| State | Contents | Exit |
|---|---|---|
| `setup` | fielders to positions, batter guard, bowler at the mark; human chooses delivery/marker or waits; HUD prompts; CPU bowler "thinks" 0.6 s | the bowler starts the run-up (human press, or CPU after 0.6–1.2 s); 20 s idle in Quick Match shows a nudge prompt |
| `runup` | bowler runs; marker; meter; charge allowed | release |
| `release`/`flight` | ball spawned; aftertouch 0.25 s; batter swing window | contact, miss, leave, or the ball reaching y < −30 |
| `inPlay` | fielders chase; batters run; throws; catches; boundary | dead-ball condition |
| `dead` | umpire signal; appeals; decision; review window; replay (if enabled) | done, or 12 s cap |
| `between` | score update, events, commentary, over end, bowler select (human: big portrait picker), innings end | next `setup` |

**Dead-ball conditions:** the ball crosses the boundary; a catch is completed; bowled; a run-out or stumping is completed; the ball is settled (in the keeper's or bowler's hands, or a fielder within 32 units of the stumps holding it, with both batters grounded, for 0.8 s); or a hard cap of 15 s in `inPlay` (a fielder fetches it and the umpire calls dead).

**Pacing:** between balls takes ≤ 2.5 s excluding replays. Replays and celebrations are skippable with ✕/J/LMB.

#### 5.7.4 Boundaries
When the ball crosses the boundary ellipse: if it touched the ground since leaving the bat (or was rolling), it's FOUR; if it carried over on the full, SIX. A ball hit over the boundary keeps flying for the show: into the stands (crowd scatter, a spectator catch "Crowd catch!", a cheer), into a stadium target (§5.10), or into the sea or pub.

#### 5.7.5 The Kerfuffle Method (rain rule; Dustbowl Downs, and a dev-mode trigger)
When rain cuts the overs of the 2nd innings: resources R(o, w) = (o / O) · (1 − 0.07·w), where o = overs left, O = overs at the start of the innings and w = wickets lost. Revised target = floor(firstInningsRuns × R_after / R_before) + 1, never less than the current score + 1. It is shown on a chalkboard card by Mrs Crumb with absurd working ("carry the scone") and a big new target. Test it with fixed numbers.

#### 5.7.6 Tests (unit-rules)
Legal ball counting with wides and no-balls; free hit; strike rotation on 1, 2 and 3 runs and at over end; each innings-end condition; result texts; the Super Over trigger and its tie-break; the Kerfuffle Method numbers; max overs per bowler; the scorecard totals equal the sums of the ball records.

### 5.8 AI (`27-ai.js`)
- **Difficulty** multiplies TUNING (§5.19.2): Village, County, Test, Kerfuffle!.
- **CPU batting:**
  1. Read the ball: the predictor, plus a perception error σ = `aiBatSkill` *(T)* 55 ms × (1.3 vs mystery or special balls, 0.8 vs full tosses) × batter technique.
  2. Choose the intent from the match situation: required rate vs current rate, wickets in hand, balls left, plus `aiAggression` *(T)* 0.5 and the batter's style (slogger, accumulator, blocker). Ball type: full and straight → drive or loft; short → pull or hook (or duck if hook-shy); wide outside off → cut or leave; good length on the stumps → defend unless aggressive; yorker → block or helicopter if a slogger.
  3. Choose a direction: the largest angular gap between fielders within 25 units for ground shots; for lofted shots, the direction with the fewest deep fielders, toward the shorter boundary.
  4. Press at the predicted time + the error. Run calls as in §5.4.
- **CPU bowling:** a per-batter plan from the bowler's type, weighted by the batter's weaknesses (data: `weak: ['short','spin']`). Pace: mostly good length on off stump, a bouncer every ~5, a yorker at the death. Swing: an outswinger set-up then an inswinger. Spin: flighted outside off, then a googly or doosra. The target scatter is `aiBowlAccuracy` *(T)* 10 units × the meter result (offsets drawn by skill). Use the special when Hype is full in the last over or vs a set batter.
- **CPU captain:** picks the next bowler (one not over the limit, preferring a type change and a bowler who suits the ground), picks a field preset by situation (attacking when defending a big total or vs a new batter; defensive at the death), and chooses bat or bowl at the toss (bat on a flat pitch, bowl when overcast).
- **CPU fielding:** §5.5.
- **Autopilot** (`ai.autopilot(side, role, { cheat })`) produces **virtual input** through `input.hold/tap` exactly as a player's would. It powers the bots in tests, the dev toggles Auto-bat and Auto-bowl, and the attract mode. `cheat` options: perfect timing, a chosen shot or outcome, a guaranteed catch, never out.
- **Tests:** the bot-match suite (CPU vs CPU, each ground, plausible statistics, §11.3); the AI never presses after the contact plane; an aggressive chaser with 20 needed off 6 lofts more than 50% of balls; a defensive AI at 0 required leaves or blocks.

### 5.9 Hype, ON FIRE and specials (`28-hype.js`)

**The Kerfuffle meter (Hype)** belongs to each team, 0–100, and is shown at the bottom centre. Gains are × `hypeGain` *(T)*.

| Gain | Batting | Bowling or fielding |
|---|---|---|
| Large | six +25, stadium target +30 | wicket +30, maiden +20 |
| Medium | four +15, three runs +10 | screamer catch +15, direct hit +15 |
| Small | PERFECT +8 | beaten the bat +8, dot ball +6 |
| Any side | chaos crowd moments +5 | |

At 100, △ "SPECIAL READY" pulses and the crowd chants "KER-FUF-FLE!". Using the special empties the meter.
- **Specials** belong to characters (§8.6): the batting special uses the current striker's, the bowling special the current bowler's. A player without one uses the generic *Kerfuffle Shot* (a guaranteed PERFECT lofted hit, fire trail) or *Kerfuffle Ball* (a green-meter delivery with +15% pace and double swing).
- **ON FIRE:**
  - **Batter:** `fireStreak` *(T)* 3 consecutive boundaries. The bat burns with flame particles and the music brings in its `fire` layer (`audio.layer('fire', 1)`, §5.13.4). Timing windows ×1.5 and shot power ×1.2. It ends on a dot ball or a wicket, or after 6 balls.
  - **Bowler:** 3 consecutive dot balls or wickets. The ball burns with a trail: pace +10%, edge zone ×1.4. It ends when a boundary is conceded, or after 6 balls.
  - Commentary and crowd go wild, with a sting and a screen flash (respecting the Comfort settings).
- **Tests:** three boundaries give `fire:on` and widened windows; a dot ball gives `fire:off`; at Hype 100, △ consumes it and emits `special`; each special's effect flag is observable in the snapshot (e.g. `ball.fx === 'vanish'` during its invisible window).

### 5.10 Items, stadium targets, chaos events, weather and time of day (`29-chaos.js`)
- **Kerfuffle rules** (a match setting, on in story from chapter 2, default on in Quick Match) enable items and specials. Off gives "purist arcade": no items, no specials, no chaos (so players can see what is core and what is extra).
- **Items** (§8.7.1):
  - At the start of each over, with probability 0.35 × `chaosRate` *(T)* per ground, a batting item token floats over a random outfield spot (an RNG.play seed). The ball passing through its 14-unit sphere (in the air or along the ground) gives it to the batting side.
  - Bowling items are earned by 2 dot balls in an over.
  - Items **auto-apply** on their next relevant event. No extra buttons: the HUD shows a held item icon labelled "ARMED".
- **Stadium targets** (§8.3): each ground has 3–4 landmark boxes in world space (a sphere or box per target). A ball whose flight passes through one triggers it: bonus runs added to the batting score as "KERFUFFLE BONUS +N", Hype +30, slow-mo 0.4 s, particles, crowd and commentary, plus a target state (a broken window sprite, a spinning weathervane, a jumbotron glitch). It resets each match. Bonus runs count toward totals and targets, and the scorecard lists them as "Bonus".
- **Chaos events** (§8.7.3) are scripted mini-events with a per-ground pool, firing between balls (never mid-delivery) at a per-over chance × `chaosRate` *(T)*. Examples: Doris the cow wanders onto the outfield and blocks a fielding lane for 2 overs (fielders path round her); seagulls steal a ball stopped in the outfield (byes); bees chase a fielder (−30% speed for 1 over); the tide comes in; the rain delay; dust devils; ghost fielders phasing; Thrumpton's advert break.
- **Weather and time of day:**
  - `game.weather` for rain (the delay) and dust or leaves (cosmetic).
  - **Fog** is our own screen overlay: dithered translucency (`px.blend`) whose strength grows with distance from the camera focus. Fielders beyond 400 units fade, and the ball is only visible within 260 units of the batter unless lit. It is drawn after the world and before the HUD.
  - **Overcast:** swing ×1.5, ambient 0.78 with a blue-grey tint.
  - **Day:** lights enabled with ambient 0.92, plus moving cloud-shadow decals.
  - **Dusk:** ambient 0.7, warm.
  - **Night:** ambient 0.42; four floodlight pylons each add `lights.add(x, y, 220, 1100, .75, { color: '#fff4dc' })`; the ball is drawn `emissive`.
- **Tests:** a forced item spawn on the ball's predicted path is collected and applied; a target hit adds its bonus and emits `target:hit`; each chaos event can be forced (dev and test) and resolves within its time without errors; overcast doubles the measured swing displacement vs clear (allowing for the 1.5 factor); night enables 4 lights.

### 5.11 Camera director and replays (`34-camera.js`, `35-replay.js`)

#### 5.11.1 Views
Four custom orthographic views, made once. Never tween zoom in a match: each new zoom re-bakes the TileMap floor, because `_floor` caches by view id, yaw, pitch and scale. So use fixed views and cut between them, like TV.

| View | `new E.View(...)` | Use |
|---|---|---|
| broadcast | `('broadcast','Broadcast', 0, T('camPitch') 12, T('camScale') 1.45, 1)` | every delivery: bowler at the bottom, pitch, batter, keeper and slips at the top, the far-end panorama behind them |
| wide | `('wide','Wide', 0, 55, T('wideScale') 0.8, 1)` | ball in play round the ground |
| review | `('review','Side-on', 90, 8, 2.4, 1)` | third umpire and run-out replays: the crease seen side-on |
| close | `('close','Close-up', 0, 22, 2.6, 1)` | wickets, celebrations, umpire signals, specials' wind-ups |

- Scenes set `camera: { zoom: false }` (the director frames shots; no player zoom). `game.setView(view)` cuts, and the engine snaps the camera on a view change.
- **Why pitch 12° and scale 1.45:** a strongly foreshortened, telephoto TV look. A Humanoid about 29 units tall draws 29 × cos 12° × 1.45 ≈ 41 px. The 300 units from the bowler's crease to the striker's crease take 300 × sin 12° × 1.45 ≈ 90 px. On a 240-px-tall screen that places the striker's feet at about 47% of the height and the bowler's crease at about 85%. The keeper (y −160, 48 px above the striker's feet), the slips and the far-end panorama fill the top, and the bowler runs into view from below the bottom edge. In M1, check that the TileMap floor bakes correctly at this low pitch; if it doesn't, use 15° and scale 1.35.
- **Warm the floor bakes** in a boot step ("Mowing the outfield"): draw one frame in each view with `game.advance(0, { draw: true })`, or by calling `map.drawFloor` on an offscreen renderer once per view. The first cut then never hitches.

#### 5.11.2 The director
- A small state machine of named shots: `broadcastSetup`, `broadcastBall`, `wideFollow`, `boundaryCrowd`, `wicketClose`, `catchFollow`, `reviewSideOn`, `celebration`, `overCard`.
- **The broadcast framing:** choose the focus point each frame so the striker's feet sit at 47% of `r.H` and the bowler's popping crease at about 85%, on any aspect ratio. A taller screen shows more panorama above and more run-up below; a wider one shows more of the off and leg sides.
- **Cut rules:**
  - Cut to **wide** 0.12 s after contact when the predicted ball path leaves the broadcast frame within 0.8 s (the screen's edges, or north of y −185, behind the panorama, §6.3), or the shot is lofted.
  - Stay **broadcast** for blocks, leaves, misses, edges to the keeper and slips, and stumpings.
  - In **wide**, `game.focus` leads the ball: the point between the ball and its predicted landing or interception point, with `cam.smooth = 0.22`. At the boundary, hold on the crowd for 0.8 s.
  - For a **wicket**, cut to close on the stumps or catcher at timeScale 0.35 for 0.8 s, then to the umpire's signal.
  - A **review** runs on the review cam (§5.11.4).
  - **Between balls**, hard-cut back to broadcast. Every camera change inside a match is a hard cut; the engine's fades (`game.go(..., { fade })`) are only for scene changes.
- **Screen shake and flash** respect the Comfort settings (`game.shake`, `game.flash`).

#### 5.11.3 The recorder
- A ring buffer of the last 10 s at 60 Hz: each actor's rig input state (the object passed to `rig.update`), the ball state, the bails and particles' seeds, and the HUD values.
- The **instant replay** after big moments (six, wicket, screamer, target smash, special) re-poses the rigs from the recorded states on the broadcast cam (or the cam that suits the moment), at 0.5× speed with a "REPLAY" bug and the ball's trail line. Replay frequency is a setting (Always / Big moments / Never); any button skips.
- **Highlights reel:** the results screen keeps the recorded windows of the match's top 3 moments (scored by event weight), up to 3 × 6 s, in memory only.

#### 5.11.4 Owl-Eye and the third umpire
- **Owl-Eye** (LBW reviews, and the dev toggle "Show trajectory"): the ball path drawn as a translucent tube (`px.polyDither` segments) from release to impact, then the predicted continuation in a different colour to the stumps. Pitching and impact markers are discs on the pitch. Then a three-light verdict panel and the stamp.
- **Third-umpire screen:** the review cam replays the crease at 0.25×, freezes at the moment the bails break, and zooms a "TV" frame overlay. A big OUT or NOT OUT reveal ticks between them like a slot reel for 1.2 s, then lands with crowd and commentary.

#### 5.11.5 Tests
The director picks wide for a lofted drive and broadcast for a block; a review sequence completes and returns to `between`; the recorder replays a recorded six with the same ball positions within 0.5 units; the dev and test flag `warmViews` covers 4 bakes; bakes stay ≤ 10 entries during a full match (instrument `map.floors` size).

### 5.12 Commentary and narrative text (`42-commentary.js`, `17-data-lines.js`)
- **The commentators**:
  - **Sir Aubrey Fennimore-Wolde**: plummy, unhurried, given to tangents about cake, pigeons, buses and his late Aunt Hermione;
  - **Dazza Keegan**: a retired coastal fast bowler, blunt, "mate";
  - in reviews only, **Professor Priya Statsworth**, the Owl-Eye analyst ("Clipping the bails by a whisker of a whisker").
- **The director:**
  - It subscribes to the bus, scores candidate lines by event priority, and plays at most one exchange per ball (1–2 lines, the second often the other commentator's reply).
  - It respects `commentaryRate` *(T)* and stays quiet during the run-up and release; it talks from contact to `between`.
  - Lines are picked from pools by tag, with a per-line cooldown (no repeat within 20 balls), from `RNG.cosmetic`.
  - Template variables: `{batter} {bowler} {fielder} {team} {opp} {ground} {runs} {need} {balls} {target} {kmh} {speed} {item} {score}`.
  - Idle filler (pigeons, cake from listeners, buses passing) plays at most once per over.
- **Presentation:** an `E.Dialog` instance with `modal: false`, `auto: 2.6`, `place: 'bottom'`, alpha 0.85, and the speaker's portrait (a live Humanoid close-up), name in their colour. Text is typed with the gibberish voice (§5.13.3), at most 2 lines of ~42 characters, readable from 10 feet. Setting: Commentary captions on/off; voices have their own volume.
- **Narrative voice everywhere:**
  - Results show a 2–3-sentence **match report in Wisden style** (§8.9.3).
  - Loading lines ("Rolling the pitch", "Whitening the creases", "Brewing the tea", "Polishing the ball on a trouser leg", "Counting the crowd's umbrellas").
  - Menu tooltips, chapter cards and the Almanack-style ending all use the same dry, affectionate register.
- **Tests:** every event type has ≥ 3 lines per relevant commentator; no line exceeds 2 × 42 characters after template fill with the longest names; no repeat within 20 balls in a 200-ball bot run; captions are off when the setting is off.

### 5.13 Audio (`40-audio.js`, `41-voice.js`, `18-data-music.js`)

#### 5.13.1 SFX
Engine voices via `audio.define(name, voice)`, combining layers. Starting recipes:

| Name | Recipe |
|---|---|
| `bat` ("tock") | `[{wave:'noise',freq:2400,to:900,dur:.04,vol:.35,filter:'bandpass'},{wave:'sine',freq:620,to:380,dur:.09,vol:.4},{wave:'triangle',freq:1240,dur:.05,vol:.15}]` |
| `batSweet` | the above + `{wave:'sine',freq:880,to:1320,dur:.12,vol:.2}` (a ring for PERFECT) |
| `edge` | `{wave:'noise',freq:5200,dur:.02,vol:.25,filter:'highpass'}` + a thin click |
| `pitchThud` | `{wave:'sine',freq:140,to:80,dur:.06,vol:.3}` + soft noise |
| `stumps` | wooden clatter: three short triangles at 700/540/860 Hz staggered 25 ms + noise; `bails`: two high ticks |
| `gloves` | keeper's pop (low noise burst, lowpass) |
| `throwWhoosh` | swept noise |
| `dive` | a long lowpass noise slide |
| `board` | ball hitting the boundary boards (wood knock) |
| `glass` | smash: a noise burst plus random high sine tinkles from RNG.cosmetic |
| `splash` | a noise burst falling from 3000 to 400 Hz (lowpass, 0.35 s) plus a low sine plop at 90 Hz, then a few soft droplet ticks |
| `gull` | pitch-swept squawk with vibrato |
| `moo` | a saw at 110→95 Hz, lowpass, vibrato |
| `bees` | a buzzing saw with tremolo |
| `steam` | the Thrumptonator: noise hiss plus a piston thump |
| `firework` | rising whistle plus a boom |
| `hypeFull`, `fireOn`, `special` | arpeggio stings |
| menu | `select`, `confirm`, `cancel` (engine presets) |

Throttle with the engine's 35 ms duplicate guard.

#### 5.13.2 The crowd engine
Its own Web Audio graph on `audio.bus('sfx')`:
- an **ambient bed**: pink-ish noise through 3 bandpass filters (200, 800 and 2000 Hz), level = ground crowd size × 0.15, with a slow LFO murmur;
- **applause**: dense random short noise grains (handclaps) at 30–90 per second, from RNG.cosmetic;
- **cheer and roar**: a vowel-formant "AAAH" made from 6 detuned saws through formant filters (F1 750, F2 1250);
- **"OOOH"** (F1 400, F2 800) for near misses, and a groan;
- **chant**: "KER-FUF-FLE" as three formant syllables on the music beat (`audio.onBeat`), with claps.

Intensity follows events (a six gives a roar of 2 s and 30 s of excited murmur). Rain mutes it to 30% plus umbrella rustle.

#### 5.13.3 Gibberish voices (Animalese/Simlish style)
`voice.say(text, profile, { onSyllable })` turns text into syllables (vowel groups, with consonant onsets):
- **Each syllable** is one source (saw for voiced sounds, plus a short noise burst for plosive and fricative onsets). It goes through two bandpass formant filters set to the syllable's vowel (a 800/1200, e 500/1900, i 300/2300, o 500/900, u 350/700 Hz; Q ≈ 6) and a gain envelope (attack 8 ms, hold, release 30 ms). Length is 55–110 ms × profile speed.
- **Pitch** = profile base × (1 + small RNG.cosmetic jitter ±4%), × a declination of −12% across the phrase. It rises 25% at '?', with +30% and louder for '!' and CAPS. Gaps of 40 ms at spaces, 150 ms at punctuation.
- **Profiles** (a blank speed means 1.0):

  | Speaker | Base | Speed | Character |
  |---|---|---|---|
  | Aubrey | 105 Hz | 1.25 (slow) | vibrato 5 Hz |
  | Dazza | 135 Hz | 0.85 | flat |
  | Priya | 210 Hz | 0.9 | crisp |
  | Edie | 240 Hz | 0.9 | |
  | Basil | 120 Hz | | tremolo, wobbly |
  | Dev | 170 Hz | | precise |
  | Pip | 290 Hz | fast | |
  | Mrs Crumb | 220 Hz | | warm, low Q |
  | Rev. Hollis | 150 Hz | | soft |
  | Thrumpton | 160 Hz | | nasal: formants ×1.2, glide |
  | Ghosts | | | noise-voiced whisper, reverb (feedback delay 180 ms) |
  | Thrumptonator | 90 Hz | | ring-modulated at 30 Hz |
  | Players | | | random base 140–260 Hz |

- **Uses:** the Dialog's typing calls `onSyllable` to sync the portrait's mouth. Short shouts ("YES!", "NO!", "WAIT!", "HOWZAT!", "OUT!") use the same synth with exaggerated pitch envelopes.
- Route through `audio.bus('voice')` (engine change 3). Create the nodes lazily after the first gesture (the engine's `audio.ctx`).

#### 5.13.4 Music
Original songs in the engine's step notation (`{ bpm, steps, tracks: [{ wave, vol, notes, name, on }] }`), each with named layers for dynamic intensity: `base`, `drums` (in when the Hype meter is > 50), `fire` (in when ON FIRE). Matches play the ground's track at low volume under the crowd. Between overs the music rises; during deliveries it ducks (`audio.layer`). Stings use `audio.sting(song, { at: 'beat' })`.

| Track | Feel | Notes for the composer |
|---|---|---|
| `title` | "The Kerfuffle March": jaunty brass-band march, 120 bpm, square lead and triangle tuba bass, snare rolls | I–IV–V in B♭, a cheeky chromatic run every 4th bar |
| `map` | the minibus travels: bouncy 6/8 | |
| `green` | pastoral summer afternoon, 96 bpm, pulse-12 woodwind lead | cuckoo-like two-note motif |
| `hall` | stately minuet with a harpsichord-like square arpeggio, 3/4 | |
| `bay` | surf-rock: saw with vibrato as twangy guitar, driving drums, 150 bpm | |
| `downs` | the conjurer's mystery waltz: minor key, tremolo | storm variant with rain drums |
| `dome` | stadium rock anthem: chant-able hook, 128 bpm, layered | a spooky organ layer for the ghosts |
| `tea` | gentle waltz for tea intervals and story scenes | |
| `showdown` | a tense countdown loop | |
| `attract` | a title remix | |

Stings: `four`, `six`, `wicket`, `over`, `hype`, `fire`, `special`, `win` (fanfare), `lose` (sad trombone slide), `toss`, `chapter`.

#### 5.13.5 Tests
Headless audio is silent, so test the structure:
- every `sfx()` name used in the code is defined;
- `voice.syllables('Howzat!')` gives 2 syllables with a rising last pitch;
- songs parse (each track's token count equals `steps × bars` for its length) and stay in their note range;
- music layers switch on `fire:on`;
- the `end` hub event mutes everything.

In a browser smoke run, `audio.failed` is null after a synthetic key press.

### 5.14 Input and controls

#### 5.14.1 The action map
Built from `E.Input.DEFAULT` with the engine's attack/dash/skill/jump removed, these actions added, and menu confirm/cancel overridden so J selects and L backs out, matching gameplay.

| Action | Batting | Bowling | Fielding | Pad (standard mapping) | Keyboard | Mouse |
|---|---|---|---|---|---|---|
| move/aim | shot direction | pitch marker; aftertouch | steer the active fielder | left stick, d-pad | WASD, arrows | pointer (aim and marker) |
| `shot` | ground shot | delivery 1, meter release | catch, dive, throw to striker's end | ✕ (Pad0) | J | left click |
| `loft` | lofted shot | delivery 2 | throw to bowler's end | □ (Pad2) | K | right click |
| `block` | defend | delivery 3 | lob back to keeper | ○ (Pad1) | L, Q | — |
| `special` | signature shot; REVIEW | signature delivery; REVIEW | — | △ (Pad3) | I, F | — |
| `run` | run / again / dive | cycle field preset | switch fielder | R1 (Pad5) | Space | — |
| `back` | stay / send back | over/round the wicket | — | L1 (Pad4) | Shift | — |
| `charge` | charge down the pitch | — | — | R2 (Pad7) | E | — |
| `pause` | engine | | | Options (Pad9) | Esc, P | corner button |
| `confirm` / `cancel` (menus) | | | | ✕ / ○ | Enter, Space, J / Esc, Backspace, L | click / — |

- Mouse clicks also pick menu items and things in the world: stumps to throw at, fielders in the field-preset preview, pins on the story map, and the review button.
- **Hover moves the focus** in every menu (E.Menu does this; our widgets in `45-ui.js` must too).
- The Backquote key (`) toggles the dev panel. It's keyboard-only and not rebindable.
- Create (Pad8) is never bound (in hub sessions it belongs to the hub).
- All rebindable through the engine's Controls screen. Pass `menu.controls` names: `{ shot: 'Ground shot / Bowl / Catch', loft: 'Lofted shot / Alt delivery', block: 'Defend / Alt delivery', special: 'Special / Review', run: 'Run / Field', back: 'Stay / Over-Round', charge: 'Charge' }`.
- **Two players on one keyboard:** build each half's preset with `E.Input.halfKeys(KERFUFFLE_KEYS, 'left' | 'right')`. List the actions in the order shot, loft, block, run, back, special, so they land on F G H R T Y (left half) and on `.` `/` `,` L `;` `'` (right half). halfKeys has six buttons, so add **charge** by hand: Q for the left half, Numpad0 for the right. Check neither collides, and that the mouse stays with player 1. The Controls screen shows a page per player.

#### 5.14.2 Mouse feel
In batting, the aim arrow follows the pointer's ground point (`game.mouseGround()`). Left and right clicks are the two main shots, like the classic mouse-click browser cricket games PC players know. In bowling, the marker sits under the pointer, a click starts the run-up, and a click releases. In fielding, the active fielder runs toward the pointer while the right button is held (optional) and a click on stumps throws. The cursor is a small cricket-ball reticle drawn by the game; the system cursor is hidden over the canvas only in play.

#### 5.14.3 Glyphs and prompts (`43-glyphs.js`)
- `prompt(action)` draws an **icon** for the binding on `input.lastDevice`:
  - **gamepad:** PlayStation glyphs by default. ✕ blue `#7aa7ff`, ○ red `#ff6b6b`, □ pink `#ff8ad8` and △ green `#5fd38a` shapes on dark discs, 9×9 px. Shoulder and trigger pills read L1 R1 L2 R2, and there are a stick and a d-pad icon. With the **Button symbols** setting on **Xbox**: A green, B red, X blue and Y yellow letter discs, and LB RB LT RT pills. Read the symbol family with `input.padStyle()`, set by the engine's `glyphs` setting (engine change 4).
  - **keyboard:** a keycap with `input.codeLabel(code)` ('J', 'Space', 'Shift').
  - **mouse:** a mouse icon with the left or right button lit. Actions without a mouse binding fall back to their keycap.
- Find the code from the action's bindings (`input.map[action]` after the player's rebinding) filtered by device: gamepad codes `Pad\d+`, mouse `Mouse\d`, else keys. Don't render `input.label()`'s strings ✕ ○ □ △ through `E.font`: the 5×7 font lacks those glyphs.
- Prompts change on the very next frame after the device changes. The helper `prompts([['shot','GROUND'],['loft','LOFT']])` lays out a row.
- **Tests:** after `press('KeyJ')` the shot prompt shows the keycap J; after `press('Pad0')` it's a PS cross; with the setting on xbox it's an A disc; after a mouse click the LMB icon; rebinding shot to KeyU shows U.

### 5.15 UI and UX: 10-foot, controller first

#### 5.15.1 Screen and type
- `res: 'ps1', expand: true` (320×240 at least; a 16:9 TV shows 427×240), so every HUD anchors to `r.W` and `r.H`.
- Body text uses the 5×7 font at scale 1 with a drop shadow (31 px tall on a 1080p TV). Headings use scale 2. Logos use `E.font.title`.
- One decision per screen. At most 6 menu items. No tables of numbers, no scrolling lists of more than 8 rows, no paragraphs of more than 3 lines.
- The **focus** is a big animated cricket-ball cursor plus a gold highlight bar. Every focusable element has a hover rectangle for the mouse.
- Footer prompts on every screen: "✕ Select ○ Back", using live glyphs.
- Keep the engine's top-right corner area clear (`game.cornerArea()`).

#### 5.15.2 The match HUD (pixel overlay, `44-hud.js`)
- **Score bug** (top left): the batting team's 3-letter code with its colour chip, a big `47/2`, and overs `3.4`. When chasing, a second line: "NEED 12 FROM 8" (gold if gettable, red if hard).
- **This over** strip (top right): 6 balls as small discs (`•` dot, 1 2 3, 4 blue, 6 gold, W red, wd/nb grey).
- **Striker card** (bottom left): a mini portrait plus "PLUCKROSE 31* (14)". **Bowler card** (bottom right): "TWISTLETON 1-12".
- **Kerfuffle meter** (bottom centre): 120×6 bar, with "△ SPECIAL" when full and a flame overlay when ON FIRE.
- **Transient callouts** (centre, big, 0.9 s): FOUR!, SIX! MAXIMUM!, WICKET!, FREE HIT, ON FIRE!, KERFUFFLE BONUS +10, PERFECT.
- **Contextual prompts** sit near the action: "R1 RUN / L1 STAY" by the striker, the catch ring and "✕ CATCH!" at the ball, the throw picker icons at both stumps. Tutorial hints (chapter 1, Nets) show the full control row.
- In bowling: the delivery panel (4 glyph buttons with names), the meter (140×10, bottom centre) and the speed readout after release.
- In wide cam only: a **radar** (top right, under the over strip): an ellipse with fielders as team-colour dots and the ball as a white dot.
- The commentary caption sits at the bottom centre, shown from contact onward, never during the run-up.
- **Tests:** the HUD draws on 320×240, 427×240, 640×270 and 320×690 (via `--size` in the browser smoke) without overlapping the corner area or each other. Write a simple rectangle-overlap check in the HUD layout code, unit-tested.

#### 5.15.3 Screens
| Screen | Contents |
|---|---|
| Title | the village green at golden hour, the pavilion, a batter knocking up, Doris the cow, the logo, and "PRESS" with the confirm glyph for the last device. Then a menu of six: STORY (opens Continue, when a save exists, and New Game), QUICK MATCH, VERSUS, SUPER OVER SHOWDOWN, NETS, EXTRAS (opens Settings and About/Credits). |
| Story map | a painted county map, 5 ground pins on a road `E.Path`, the minibus driving between them, 3 stars per chapter, Play / Replay |
| Cutscene | a three-quarter vignette (the pavilion tea room, Thrumpton's car on the green) with posed rigs, `E.Dialog` with portraits and markup (`{shake}`, `{wave}`, `{c=#..}`), skippable with a hold-✕ ring (1 s) |
| Match setup | big rows: Teams (left/right cycles a team card with kit and stars), Ground (a card with a panorama thumbnail), Overs 1–5, Wickets 2/3/5/10, Difficulty, Time of day, Weather, Kerfuffle rules, Players (join status). One row focused at a time, values change with left/right or a mouse click on the arrows. |
| Toss | captains on the square, a coin flipped in 3D (sprite rotation frames), "Call: ✕ HEADS ○ TAILS", then "BAT ✕ / BOWL ○" |
| Bowler select | 3–5 big portrait cards (type icon, overs left, special name) |
| Innings break / Tea interval | "TEA" card, a summary in 3 big numbers (runs, wickets, top scorer), the target. In story, pick a tea treat (§8.7.1, 3 cards). |
| Results | winner banner, margin, Player of the Match portrait, 3 key stats, the Wisden-style report (≤ 3 sentences), stars earned (story), "▶ Highlights" (the highlight reel), Rematch / Continue / Menu |
| About / Credits | paged (◀ ▶): 1 Source Information, 2 Tech and Engine, 3 Art, Animation and Audio, 4 Online and Testing, 5 Testing Feedback, 6 Engine Feedback, 7 Prompt Feedback, 8 Credits. One topic per page, ≤ 10 short lines. |
| Pause (engine) | Resume, our items (Restart Match, Match Info, Dev Mode), then the engine's Settings, Controls, Full screen and Quit to title. In hub sessions there is no Restart, Dev Mode or Quit (`menu.quit: false`); Full screen stays (the client hands it to the hub). |
| Showdown | choose Bat or Bowl, play the over, then initials and a table (`E.Arcade.enter` / `drawTable`) |
| Nets | lessons list, free practice (choose deliveries for the bowling machine or a dummy batter), Six Machine (12 balls, targets, score) |

#### 5.15.4 Settings (`menu.settings`, group 'Game'; plus the engine's standard groups)

| Setting | Values (default first) |
|---|---|
| Difficulty | County / Village / Test / Kerfuffle! |
| Default overs | 2 / 1 / 3 / 5 |
| Default wickets | 5 / 3 / 10 / 2 |
| Kerfuffle rules | On / Off |
| Pitch marker (batting) | On / Off |
| Timing feedback | On / Off |
| Fielding | Assisted / Manual / Auto |
| Running | Manual / Auto |
| Replays | Big moments / Always / Never |
| Commentary captions | On / Off |
| Commentary voices | On / Off |

Button symbols live in the engine's Controller group (PlayStation by default, or Xbox). Voices volume lives in Sound (engine change 3). The Comfort group (reduce motion, shake, flashes) is the engine's, and it is honoured by all our FX.

#### 5.15.5 Assists
Fielding: Assisted catches easy chances automatically, and Auto fields everything. Running: Auto follows the AI's YES and NO. Pitch marker. Difficulty. These go in Settings and in match setup.

#### 5.15.6 Touch-only devices
- **Detection:** `matchMedia('(any-pointer: fine)').matches === false && navigator.maxTouchPoints > 0`, and no gamepad or keyboard event seen yet.
- The game creates **no touch buttons** (no scene declares `touch`; set the engine's touch-button setting to hidden).
- The title shows a large panel: **"Controller or keyboard required"**, a pad and keyboard pictogram, and a big **Settings** button (a tap opens `game.menu('settings')`; the engine's corner menu button stays too). No other menu entries respond to taps.
- **The attract mode still runs** after 10 s idle. A tap exits it back to this panel.
- The moment a gamepad connects or a key is pressed, the panel goes and the normal title appears.
- **Test:** headless with a stubbed `matchMedia` gives `snapshot().ui.touchGate === true`, no touch buttons, and attract starting after 10 s. A `press('Pad0')` clears the gate.

### 5.16 Modes

#### 5.16.1 Story: *The Grand Kerfuffle*
5 chapters (§8.8) on the story map. Each chapter is a `MatchConfig` scenario plus scripted beats: `game.script` generators that wait on bus events, for example "after innings 1, play the scene `thrumptonArrives`". Each has 3 **Kerfuffle Goals** (stars), and a loss offers Retry or "Retry on Village difficulty".
- Chapter 1 teaches through **lessons in the Nets** (§5.16.3), then plays the match with contextual tips.
- Saves go through `game.saves`' autosave slot (§5.20), with `saves.write = () => ({ data: profile.story, place: chapterName, level: n })`. Don't set `menu: { saves: true }`: the story has no save points.
- Quick Match unlocks a team when you beat it. Dev mode can unlock all.

#### 5.16.2 Quick Match
Any 2 of the 6 teams, any of the 5 grounds, plus the setup options. 1–4 players can join here (§5.16.5).

#### 5.16.3 Nets
- **Lessons** (scripted, each checks success before moving on):
  1. Aim and ground shot.
  2. Lofted shot.
  3. Defend and leave.
  4. Running (with a fielder).
  5. Charge vs spin.
  6. Bowling: marker and meter.
  7. Aftertouch.
  8. Specials and Hype.
  9. Catch ring.
  10. Throws.
  11. Reviews.

  Chapter 1 runs lessons 1–4 and 6. Later chapters run the others when first needed, from the chapter's beats.
- **Free practice:** the bowling machine with chosen deliveries, line and length (or random), or bowling at a dummy batter.
- **Six Machine:** 12 balls; score = runs + target bonuses; with a table.

#### 5.16.4 Super Over Showdown
- **Bat:** 6 balls from the Thrumptonator 3000 (seeded deliveries, a mixed set: express, bouncer, yorker, slower ball, banana swing, Triple Threat as the 6th ball), 2 wickets, Kerfuffle rules on. Score = runs.
- **Bowl:** defend 14 against Kev Malone (a slogger), and score = (14 − runs conceded) × 10 + wickets × 25.
- `E.Arcade` tables per variant with initials. The same Bat mode is the AI Hub round (§5.17).

#### 5.16.5 Versus and local multiplayer (1–4 on one screen)
- In match setup, players join through `game.allowJoin({ max: 4, onJoin })`: Start on a free pad, or 2 on the keyboard (which gives the keyboard's right half). Each joined player moves left or right to pick a team (player colours `E.PLAYER_COLORS`).
- **Roles:**
  - 1v1: each human does everything for their side.
  - 2v2, or 2 humans co-op vs CPU: when batting, the two humans are the two batters. Each controls running for their own man, and the one on strike also plays the shots, so mix-ups are possible (§5.4). When bowling, they alternate overs, and the other takes the fielding (catch rings and throws).
  - 2v1: the solo player does all roles for their side.
- One shared camera, because cricket is a one-camera sport. Prompts appear by each player's actor in their colour, using their own device's glyphs (`players[i].lastDevice`).
- The pause shows who paused ("P2 PAUSED", engine).
- **Tests:** `game.addPlayer({ keys: 'right' })` gives P2 the bowler in a 1v1; co-op running agreement; mix-up run-out; the per-player prompt device.

### 5.17 Online: AI Hub session (parallel Super Over) (`60-hub.js`)

#### 5.17.1 Tags (in `<head>`, after the client)
```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="parallel">
<meta name="hub:session-minutes" content="2">
<meta name="hub:session-goal" content="Most runs from one over (6 balls, 2 wickets) wins">
<meta name="hub:session-howto" content="Aim: stick/WASD/mouse · Hit: Cross/J/click · Loft: Square/K · Run: R1/Space">
```
Keep the goal ≤ 60 characters and the howto ≤ 80 characters; the bundle test counts them.

#### 5.17.2 Flow when `AIHub.active`
1. Skip the title, attract and menus. Boot runs as normal. `AIHub.active` is already true on the first line, so decide at `new E.Game(...)`: pass `autoPause: false` (frames in the harness don't all have focus, and a paused copy would stall its round) and `menu: { quit: false, ... }`, and set `game.hubActive = true` (engine change 5).
2. `const info = await AIHub.connect({ mode: 'parallel', seats: [1, 4], card: true })`. If it returns `null`, start the normal standalone game.
3. Build the round from `info.seed` via `AIHub.rng('over')`: the 6 deliveries (type, target, kmh), the ground (always the Megadome at night, so it looks the same for all), the batting side (Kerfuffle CC: Edie and Dev open, Pip comes in at the first wicket), and the field (the defensive preset).
4. **Our card** (scene `hubcard`): the Megadome at night, the Thrumptonator steaming, and the players in their seat colours (`info.players`, names drawn as pixel text, never inserted as HTML) with READY ticks from the `card` event. Below: "MOST RUNS FROM ONE OVER WINS", this player's controls as glyph prompts for their last device, and the time left (`card.left`), plus "Paused: most players want more time" and "Starting…" states. ✕/Enter/click on READY calls `AIHub.answer('ready')`; △/T/click on MORE TIME calls `AIHub.answer('more')`. The card draws no `Math.random`: cosmetic noise comes from `AIHub.rng('card')`. It changes nothing in the round.
5. Call `AIHub.ready()` as soon as the round is built, with no key press needed.
6. On `start`: a countdown "3, 2, 1, PLAY!" while `AIHub.time() < 0`. The first ball's run-up begins at `time ≥ 0`.
7. Play the over (scene `hubround`, the match machinery with `mode: 'hub'`). The pause menu has no Quit, Restart or Dev Mode (§5.15.3), and there are no replays (the clock is ticking).
8. Call `AIHub.progress({ score: runs, label: runs + '/' + wkts + ' (' + balls + ' balls)' })` at the start and after every ball.
9. The over ends after 6 legal balls or 2 wickets: call `AIHub.result({ score: runs, stats: { 'boundaries': b, 'sixes': s, 'best shot': name } })` once. Then show "Waiting for the others…" over the Megadome crowd.
10. On `time-up`, if no result has been sent: call `result({ score: runs })` at once.
11. On `end`: stop input (`game.input.clear()` plus a flag that ignores all actions), stop music and sfx (`audio.stopMusic()`, mute), and freeze the scene with "Round over", or "You sat this one out" for reason `sat-out`. The hub shows the results.
12. Never call `send()`. No storage carries over (the client gives empty storage). No `alert`, `confirm`, `prompt` or `window.open`.

#### 5.17.3 Tests
- **hub-mock suite (Node):** a fake `AIHub` object before the game loads checks that `connect` is called with parallel and [1, 4], `ready` is called with no input, the deliveries are identical across two runs with the same seed and different player inputs, there's one progress per ball, one result, a time-up mid-over gives an immediate result, and `end` stops input and audio.
- **browser-hub suite:**
  1. Copy the bundle to `test/hub/game.html` beside `harness.html`, `bridge.js` and `round.js`.
  2. Serve with `tools/serve.mjs` and confirm the title tag.
  3. Run Playwright at `harness.html?game=game.html&players=1&auto=1`, then `players=2`, then `players=4&latency=150&jitter=50&loss=5`.
  4. Wait for `document.body.dataset.complete === 'true'` (90 s) and require `window.__hubCheck.pass === true`. Print any failing check names and details.
  5. Open the bundle outside a session (`file://`) and see the title scene.

### 5.18 Attract mode (`51-attract.js`)
- **Trigger:** on the title and every front-end menu scene (main menu, mode select, setup, story map), the `idle` timer resets on any input: an action press, any key, mouse movement (`input.mouse.t` changed), a click, any gamepad button or stick past the dead zone (`input.padMove`), or a touch. At **10 s** it calls `game.go('attract', { segment: next })`. Never in hub sessions.
- **Exit:** any input (the same list) returns at once to the title and consumes the input (`input.consumeAll()`, so it doesn't also pick a menu item). The idle timer restarts. Nothing is saved; settings are untouched.
- **What it shows:** a looping **showreel** of real gameplay on the real match machinery, with cheating autopilots on both sides (perfect timing, chosen outcomes, guaranteed catches, never-ending innings). It cycles through 10 segments (~25 s each), each a small data script `{ ground, timeOfDay, weather, teams, setup, balls: [{ delivery, target, shot, dir, grade, outcome, extra }] }`:
  1. Village Green: Doris the cow ambles across the outfield; a cover drive runs through a Golden Teapot token (item collected) for FOUR (wide cam, applause, commentary).
  2. A lofted straight SIX through the pub window (target smash, slow-mo, replay).
  3. Basil's leg-break hits the pad: a huge appeal, given NOT OUT, the Kerfuffle Review System, Owl-Eye, OUT. The next batter is bowled by the googly (stumps cartwheel, the umpire's OUT signal).
  4. Thrumpton Hall, overcast: an outswinger edged to slip, then a diving catch on a PERFECT ring.
  5. Sunburnt Bay: a bouncer ducked, then the next one hooked for six into the sea, and the tide event.
  6. A quick single, then a direct-hit run-out, third umpire, OUT.
  7. Dustbowl Downs: the Vanishing Ball special, a stumping, then the rain delay with the covers and the Kerfuffle Method card.
  8. Three boundaries, ON FIRE, the Tea-Kettle Slog special onto the jumbotron.
  9. The Megadome at night in fog: the Thrumptonator's Triple Threat, ghost fielders, fireworks, a victory celebration and a Wisden-style report card.
  10. The high-score table (`cab.drawTable`) and a "PRESS ANY BUTTON" title flash.

  Then it loops.
- **On screen:** "DEMO" blinking (bottom centre) and "PRESS ANY BUTTON" (the device-appropriate glyph), plus a TV-style caption per segment (the ground's name). Segments start with a wipe transition.
- **Tests:**
  - **attract-coverage suite:** idle 10 s on the title gives the attract scene. Advance 12 minutes of game time: every segment ran at least once and the coverage flags were set (item, chaos, four, six, target, review, bowled, caught, run-out, third umpire, stumping, special, ON FIRE, rain, fog, ghosts, night), with no errors.
  - Then `press('KeyA')` returns to the title, a mouse move (`input.feed('move', ...)`) exits, and `press('Pad3')` exits.
  - Touch-only: attract runs and a tap exits.

### 5.19 Dev mode (`70-dev.js`)
- **Reach:**
  - the **pause menu item "Dev Mode"** (`menu.items`) in every pausable scene;
  - Backquote as a keyboard shortcut;
  - hidden in hub sessions.

  It opens as a full-screen 10-foot panel over the paused game. Values apply instantly. Resume to see them in play.
- **Navigation:** L1 and R1 (or Tab, or a click on a tab) switch tabs. Up and down (or hover) select a row. Left and right adjust; hold to accelerate; the mouse drags slider knobs and the wheel scrolls. ✕ toggles or activates, △ resets the selected row to its default, ○ goes back.
  - **"Reset all to defaults"** is the first item of the TUNING tab.
  - A **"DEV" badge** shows on the HUD while any value differs from its default.
- **Persistence:** tuning persists through `E.store.set('kerfuffle:dev', ...)` (dev mode is hidden in hub sessions, whose storage is memory-only anyway).

#### 5.19.1 Tabs
1. **TUNING** (sliders, each showing its current value against the default):

   | Key | Label | Default | Min | Max | Step |
   |---|---|---|---|---|---|
   | ballSpeed | Ball speed scale | 0.62 | 0.35 | 1.0 | 0.01 |
   | gravity | Gravity (u/s²) | 160 | 100 | 300 | 5 |
   | pitchBounce | Pitch bounce | 0.55 | 0.30 | 0.80 | 0.01 |
   | swing | Swing × | 1.0 | 0 | 3 | 0.05 |
   | spin | Spin turn × | 1.0 | 0 | 3 | 0.05 |
   | seam | Seam σ (°) | 2.5 | 0 | 8 | 0.1 |
   | perfectMs | Perfect window ±ms | 40 | 10 | 120 | 1 |
   | goodMs | Good window ±ms | 85 | 30 | 200 | 1 |
   | okMs | Mistime window ±ms | 150 | 60 | 300 | 1 |
   | batPower | Ground shot power × | 1.0 | 0.5 | 2 | 0.05 |
   | loftPower | Lofted power × | 1.0 | 0.5 | 2 | 0.05 |
   | edge | Edge zone × | 1.0 | 0 | 3 | 0.05 |
   | runSpeed | Batter run speed | 120 | 70 | 200 | 1 |
   | fieldSpeed | Fielder speed | 105 | 60 | 180 | 1 |
   | throwSpeed | Throw speed | 420 | 250 | 700 | 5 |
   | throwError | Throw error | 6 | 0 | 30 | 0.5 |
   | catchRing | Catch ring time (s) | 0.9 | 0.3 | 2 | 0.05 |
   | catchWindow | Catch window ±ms | 110 | 30 | 300 | 5 |
   | aiBatSkill | CPU timing error (ms) | 55 | 5 | 200 | 1 |
   | aiAggression | CPU aggression | 0.5 | 0 | 1 | 0.05 |
   | aiBowlAccuracy | CPU bowling scatter | 10 | 0 | 40 | 0.5 |
   | meterSpeed | Bowling meter speed (Hz) | 1.4 | 0.5 | 3 | 0.05 |
   | meterSweet | Meter sweet zone | 0.18 | 0.05 | 0.5 | 0.01 |
   | hypeGain | Hype gain × | 1.0 | 0 | 4 | 0.1 |
   | fireStreak | ON FIRE streak | 3 | 2 | 6 | 1 |
   | boundaryScale | Boundary size × | 1.0 | 0.6 | 1.3 | 0.01 |
   | chaosRate | Chaos rate × | 1.0 | 0 | 3 | 0.1 |
   | commentaryRate | Commentary rate × | 1.0 | 0 | 2 | 0.1 |
   | camPitch | Broadcast pitch (°) | 12 | 8 | 30 | 1 |
   | camScale | Broadcast scale | 1.45 | 1.0 | 2.4 | 0.05 |
   | wideScale | Wide cam scale | 0.8 | 0.5 | 1.2 | 0.05 |
   | timeScale | Game speed | 1.0 | 0.1 | 2.0 | 0.05 |

   The camera sliders rebuild their view on release, accepting a re-bake.
2. **TOGGLES:**
   - overlays: show hitboxes and zones (bat zone, pad box, stumps box, catch spheres), show the trajectory (Owl-Eye tube live), show AI intent (the CPU's read and target), show fielder assignments (chaser and backup lines), skeleton overlay (`rig.debug(r)`), frame stats (`game.stats`);
   - play: slow motion (timeScale 0.25), invincible batter, infinite Hype, always ON FIRE, auto-bat (autopilot bats for you), auto-bowl, no chaos events;
   - settings overrides: weather (clear, overcast, rain, fog), time of day, mute commentary.
3. **JUMP:**
   - story: start chapter N (1–5) at beat X;
   - match flow: start a Quick Match preset, skip to the last over, win the innings, lose the innings;
   - set the score (runs and wickets sliders, then Apply);
   - force: the next delivery (type and target), the next outcome (dot, 1, 4, 6, bowled, caught, LBW, run out, stumped), a review, the rain delay, a chaos event (list), an item spawn;
   - trigger a Super Over;
   - other: play attract segment N, unlock all, reset save (confirm twice).
4. **INFO:** the snapshot (scene, match state, last ball record), RNG seeds, engine and game versions (`E.versionLabel()`), the last 20 bus events, the last 10 commentary lines, the TileMap bake count.

#### 5.19.2 Difficulty multipliers (applied over TUNING, not shown as sliders)

| Level | Multipliers |
|---|---|
| Village | perfectMs ×1.5, goodMs ×1.4, ballSpeed ×0.85, aiBatSkill ×1.6, aiBowlAccuracy ×1.5, catchWindow ×1.5, meterSweet ×1.4 |
| County | ×1 |
| Test | perfectMs ×0.75, goodMs ×0.8, ballSpeed ×1.1, aiBatSkill ×0.7, catchWindow ×0.8 |
| Kerfuffle! | Test plus chaosRate ×2; the CPU uses specials at 70 Hype |

#### 5.19.3 Tests
- Open dev mode the way a player does: pause with `input.tap('pause')`, then pick the Dev Mode item. If the engine's pause menu can't be driven headless, check the item is in the `menu.items` config, then call the same `dev.open()` its callback calls.
- Set ballSpeed to 0.8, then the next delivery's speed reflects it. Reset gives 0.62.
- "Reset all" restores every key.
- A forced outcome six gives `boundary 6` on the next ball. Jump to chapter 3 gives the scene `cutscene` with chapter 3.
- The panel is navigable by keys, pad and mouse: `input.feed` move, down and up on a slider changes its value.

### 5.20 Saves, unlocks and high scores
- `game.saves`' **autosave slot** stores the story progress: chapter reached, stars, tea treats chosen, best results. It is written after each chapter result and on the story map. The title's **Continue** loads `saves.latest()`, and Story → New Game asks before overwriting it.
- `E.store` keys:
  - `kerfuffle:profile`: unlocks, stats (total sixes, fastest ball), seen lessons;
  - `kerfuffle:dev`: tuning;
  - `arcade:kerfuffle:<mode>`: tables, kept by `E.Arcade`.
- A version field with a migrate function; a bad save falls back to a new profile. Storage-blocked play works (engine).

### 5.21 About/Credits and the exit interview
- **About/Credits** (§5.15.3) shows Source Information, Testing Feedback, Engine Feedback and Prompt Feedback exactly as the builder reports them in the chat reply, plus credits:
  - engine my-3D2dge v0.85.2 (MIT, Michael Crosato), with our engine changes listed;
  - AI Hub session client 1.4.0;
  - CC0 asset sets used via the engine's store (Kenney, KayKit, ambientCG; list the set ids);
  - everything else original and synthesized in code.
- Prefill what is known, and write "unknown" for anything you can't confirm:

  | Field | Value |
  |---|---|
  | Date | 2026-11-03 17:48:25 |
  | Source | Cricket (over the top arcade style) |
  | Plan | PLAN.md |
  | Genre and Perspective | as in §2 |
  | Tech | my-3D2dge v0.85.2 (full engine, modified), AI Hub session client 1.4.0, plain JavaScript, Web Audio; tests on Node and Playwright 1.63.0 |
  | Art Direction | the engine's HD Humanoid pixel style, 320×240 expanded, canvas lighting, with new cricket assets (§6) |
  | Animation | the engine's procedural Humanoid rigs, E.Attack specs, E.ACTIONS and joint post-processing (§7) |
  | Audio | chip-synth music and SFX, a crowd engine and gibberish formant voices, all code |
  | Online | AI Hub Session Protocol v1, parallel Super Over for 1–4 players |
  | Testing | headless engine (game.advance, game.debug), scripted playthroughs, Playwright browser checks, the AI Hub harness |
  | Research | the builder's own, plus "plan stage: the engine handoff docs and kits; the AI Hub protocol, examples and harness" |
  | Environment | Claude Code CLI (headless); Linux; browser unknown |
  | Model | as your TASK.md says |
  | Usage | if known, else unknown |

- **`exit-interview.json`** follows TASK.md's exact shape, and the test suite parses it. Suggested `aiHub` values:
  ```json
  { "name": "Cricket Kerfuffle", "tagline": "Over-the-top arcade cricket, with tea",
    "description": "Smash sixes through the pub window, bowl flaming yorkers and save the village green from Lord Thrumpton across five outrageous grounds. Up to four players on one screen, or Super Over showdowns in AI Hub sessions.",
    "type": "Game", "genre": "Sports", "source": "Cricket", "series": "", "players": "1–4",
    "controls": "Stick/WASD/mouse aim · Cross/J/click hit · Square/K/right-click loft · Circle/L block · R1/Space run",
    "tags": ["sports", "arcade", "comedy", "versus", "co-op", "retro"] }
  ```

---

## 6. Art direction and assets

### 6.1 Style
The engine's native look: HD Humanoids at size 1.15–1.25, pixel art drawn only with engine primitives (`px.*`, `E.font`, sprites, shapes, props; no anti-aliased canvas calls), every surface shaded with `E.tones` (cool shadows, warm highlights), canvas lighting in every scene, 3–8 props on screen, and effects on every hit. Make it look like a 32-bit TV sports broadcast painted by a pixel artist with a sense of humour: saturated summer greens, cream whites and red leather, then each ground's own palette.

### 6.2 Palettes (the base of each ground; `E.tones` derives shades)

| Ground | Grass light / dark stripe | Pitch | Sky | Accent |
|---|---|---|---|---|
| Village Green | `#6fae4a` / `#5e9c3e` | `#c9b98a` (worn ends `#b39f6c`) | `#8fc4ff`→`#ffe6b0` (golden hour) | pavilion green `#2f6b3a`, pub red `#8a2a2a` |
| Thrumpton Hall | `#5f9f55` / `#4f8c48` (diagonal mowing) | `#c4b892` | overcast `#9aa6b4`→`#cfd6dc` | navy `#22305a`, gold `#d8b04a`, stone `#c8bfa8` |
| Sunburnt Bay | sand `#e8d39a` / `#dcc287`, wet `#bfa772` | hard `#d8c49a` | `#3fb8ff`→`#bff0ff` | teal `#1fb5a8`, yellow `#ffd23a`, sea `#2a8ad0` |
| Dustbowl Downs | parched `#a8a85a` / `#97974e` | cracked `#d4b37a` with rough `#b8915a` | hot `#ffcf8a` then storm `#4a4f63` | purple `#5a2a7a`, silver `#c8ccd8` |
| The Megadome | night `#2f7a3a` / `#286a32` (floodlit) | `#b8a888` | `#0a0a1e` with stars and laser beams | violet `#7a3aff`, gold lightning `#ffcf3a`, ghost `#a8e0ff` |

### 6.3 The ground (`30-ground.js`): built from a recipe
- **The TileMap** (16-unit cells) covers the boundary ellipse plus stands plus surroundings, about 2200×2000 units (138×125 cells). Pass `chunks: true` so each view bakes its floor in squares as the camera reaches them, rather than in one huge canvas per view.
  - `floorTex(x, y, tag, view)` paints: mown stripes 32 units wide with grain noise; the square (a lighter rectangle of old pitches); the pitch with creases (popping, bowling and return creases, 1-unit white lines), footmarks and wear patches that grow per over (re-bake only between innings); the boundary rope (a 2-unit white or coloured band with a 1-px shadow); surroundings tagged per ground (`road`, `carpark`, `sand`, `water`, `gravel`).
  - Floor tags drive outfield speed and running speed (sand, wet).
- **Stands and buildings** are TileMap walls with `face` and `roof` materials:
  - the village pavilion: `timber` and `plaster` walls, `tiles` roof, a veranda of shapes, a clock;
  - the Hall's facade: `stone`, with `windows`;
  - beach huts: striped `plank`;
  - the Megadome: `metal` tiers ×3 with `cut: true` (the near side cuts low for the wide cam).
- **Crowd:** spectators as small queued sprites on stand tiers and on picnic blankets and deck chairs round village boundaries. Draw 2–4 px figures in palette variety, grouped in segments of 8–12 per queue item for cost. States: idle sway, cheer (jump), wave (a travelling cheer phase), umbrellas (rain), boo. A six into the stands scatters a segment.
- **Props:** engine props and core shapes (trees, benches, hedges, fences, lampposts) and store sets (Kenney fantasy-town hedges, tents, boats; KayKit furniture chairs; Kenney food cakes for the tea room). Cut only the entries used with `node engine/tools/asset-set.mjs <sets> --ids ... --name kerfuffle-store --out src/06-assets-store.js`, and load it with `E.addAssets(window.ASSETS['kerfuffle-store'])`.
- **Far-end panorama** (broadcast cam only): the orthographic broadcast view can't show the far stands behind the batter the way a telephoto TV lens does. With the §5.11.1 numbers the far boundary sits 130–170 px above the striker's feet, at or past the top edge, so the stands would be cut off and there'd be no sky. So paint, once per ground end at match start, an offscreen pixel canvas (screen-wide, about 120 px tall): sky, far scenery (hills, sea, skyline), stands with crowd dots, the **sight screen** centred behind the batter, and the scoreboard (with **live numbers** drawn on top each frame).
  - Queue it as one `r.queue` item at world y = −190 with `{ bias: -1 }`, with its base on the ground line there, so it draws in front of the floor beyond and behind the keeper (y −160) and slips (about −145). With the §5.11.1 numbers its base sits about 57 px above the striker's feet on screen. Paint it about 120 px tall: a 16:9 screen shows its lower ~60 px, and taller screens show more.
  - Give it a slight horizontal parallax of 0.3 against the camera's x.
  - Anything north of y −185 is hidden behind it, so the camera director treats that region as outside the broadcast frame (§5.11.2): a ball heading there (byes past the keeper, a glance to fine leg) gets a cut to the wide cam.
  - Two panoramas per ground, one for each end, swapped at change of ends.
- **Test:** each ground builds without engine warnings (unknown materials, uneven rows); the bake count stays ≤ 10; the panorama canvas is created for both ends; screenshots are reviewed (§11.5).

### 6.4 Cast dressing (`31-cast.js`)
- **Factory:** `makeRig(player, role)` returns a Humanoid from team kit plus personal look plus role gear.
  - **Batters:** `weapon: 'bat'`, `pads: true`, gloves batting, a helmet with grille (or a cap: Basil and Edie wear caps, for character), long sleeves.
  - **Bowlers and fielders:** `weapon: null`, a cap or sun hat, short sleeves. The bowler holds a ball sprite in the right hand until release (draw at `rig.worldOffset(J.handR)`).
  - **Keeper:** keeper gloves, pads, helmet up to spinners.
  - **Umpires:** a white `coat` outfit, a `brim` hat, Rev. Hollis with a dog collar (a trim colour) and glasses.
- **Builds:** chibi for comic villagers (Basil, Mrs Crumb, Pip), heroic for stars (Edie, Shazza, Peregrine), bulky for sloggers (Gaz, Kev, Big Terry). Ghosts are heroic, translucent (`alpha: .55` on `r.actor`, a `ghost` afterimage, pale blue `eyeGlow`), with beards. The Thrumptonator is a shape plus code (§6.5), not a rig.
- **Faces:** `expr` changes with events (`shout` on appeals, `smile` after boundaries, `wince` when beaten, `angry` for Thrumpton). Portraits use `rig.drawPortrait(g, x, y, 40, { zoom: 3, turn: .4 })`.
- §8.1 and §8.2 describe each star's look; turn those descriptions into rig options (build, size, hair, hat, outfit, colours, face) in `10-data-teams.js`. Squad players are generated from their team's palette with variations: skin, hair style and colour, build, and handedness (30% left-handed).

### 6.5 New assets to make
Write them as one standalone **set file**, `src/07-assets-kerfuffle.js`, in the store's format: `(window.ASSETS = window.ASSETS || {}).KERFUFFLE = { set: 'KERFUFFLE', format: 1, materials, shapes }`. The game loads it once with `E.addAssets(window.ASSETS.KERFUFFLE)` and draws entries as `'KERFUFFLE:stumps'` and so on. Because the file has no dependency on the game's code, the asset tool can draw it on its own: check each entry with `node engine/tools/asset-sheet.mjs src/07-assets-kerfuffle.js#<id>`, read the picture, and fix what it lints.

| Id | What | Used in |
|---|---|---|
| `stumps` | three ash stumps with grooves, two bails (bails also as 3×1 sprites for physics) | all |
| `sightscreen` | a white boarded screen on a scaffold, 60 wide | all (wide cam) |
| `scoreboardHut` | a village hut with hanging number plates (numbers drawn live) | green, downs |
| `jumbotron` | a giant screen frame (content drawn live) | dome |
| `pavilionClock`, `veranda` | pavilion details | green |
| `teaUrn`, `teapot`, `cakeStand` | tea-room set (with the store's cakes) | cutscenes |
| `deckchair` | striped canvas deck chair (3 colourways) | green, hall, bay |
| `umbrellaOpen` | crowd umbrella (rain) | downs |
| `covers` | blue tarpaulin over the pitch, rolled or spread (params `spread: 0..1`) | rain delay |
| `roller` | heavy groundsman's roller | green, cutscene |
| `floodlight` | lattice pylon with a lamp bank (`lights`) | dome, night matches |
| `adBoard` | boundary board with a sponsor name painted (params `text`, colours): *Crumb's Cakes*, *Leaning Wicket Ales*, *Thrumpton Holdings*, *Kerfuffle Teas* | all |
| `pubFront` | the Leaning Wicket's frontage, with a breakable window sprite | green |
| `greenhouse` | the glass-pane vicarage greenhouse (shatterable) | green |
| `churchSpire`, `weathervane` | the weathervane spins on hit (`params: { angle }` in 16 steps) | green |
| `oakTree` | the big oak inside the boundary (a large `tree` variant), with a beehive | green |
| `fountain` | a tiered fountain with water drawn live | hall |
| `phantomCar` | Thrumpton's vintage car (original design: long bonnet, running boards) | green, hall |
| `peacock` | sprite frames: walk and display fan | hall |
| `beachHut` | striped hut | bay |
| `pier`, `ferrisWheel` | pier with a Ferris wheel (`params: { angle }` turning) | bay |
| `iceCreamVan` | van with a giant cone | bay |
| `inflatableShark` | the shark | bay |
| `seagull` | sprite frames: flap, glide, carry a ball | bay |
| `topHat` | giant magician's top hat on the boundary | downs |
| `waterTower` | a timber water tower: a round tank on four braced stilts, with a ladder | downs |
| `hotAirBalloon` | drifting on an `E.Path` | downs |
| `caravan` | magician's caravan | downs |
| `megadomeTier`, `vipBox`, `laserRig`, `ghostBell` | Megadome set | dome |
| `thrumptonator` | the steam bowling machine: brass boiler, pipes, a throwing wheel (`params: { angle }`), pressure gauge, smoke from `particles.smoke` | dome, showdown, hub |
| `minibus` | the Kerfuffle Express (map and cutscene) | map |
| `cow` | Doris: a Friesian built from parts, with leg-swing animation via params (`step: 0..15`) | green |
| `coin` | toss coin sprite frames (8) | toss |
| `itemTokens` | sprites (16×16): Golden Teapot, Lucky Horseshoe, Giant Bat, Cake Slice, Sticky Gloves, Banana Peel, Fog Machine | items |

### 6.6 Effects (`33-fx.js`)
- **Ball:** a trail (the last 12 positions, fading), a shadow, a speed-streak for >140 km/h, a glow at night.
- **Bat contact:** splinters (`particles.bits`, willow colours) and an impact star on PERFECT.
- **Bowled:** stumps knocked back, bails as physics sprites spinning away, a dust burst and a camera shake of 2. With a special: the stumps cartwheel high (over the top) and land in the keeper's hands.
- **ON FIRE:** flame particles on the bat or ball (`particles.fire`) with an emissive glow.
- **Specials:**
  - Tea-Kettle Slog: a steam-whistle trail and steam puffs;
  - Vicar's Revenge: a holy-light ray and a choir chord;
  - The Grandad: three dust puffs;
  - Peregrine Swoop: a feather trail;
  - Sunburn Bouncer: heat haze (a row-offset shimmer on the overlay);
  - Vanishing Ball: a puff of purple smoke, gone for 0.3 s, then a puff again;
  - Triple Threat: two hologram balls (cyan, flickering) and one real one (a seam glint);
  - Grudge Ball: a red outline;
  - Ectoplasmic Edge: ghost trails.
- **Sixes:** the ball lands in the stands with a crowd scatter and a "crowd catch" arm. Fireworks on sixes at night (`particles.explosion` small, no shake) and confetti on wins.
- **Weather:** rain (engine), puddles on the covers, fog overlay, dust devils (`particles.dust` spirals), drifting cloud shadows.
- **Rule:** all effects respect Comfort settings (reduce motion: no shake, shorter flashes).

---

## 7. Animation (`32-anim.js`)
Base: the engine's procedural Humanoid. Build cricket-specific motion from four tools:
- **(a)** `E.Attack` specs with custom `a0/a1/z0/z1/reach/hand:'both'/plane/lunge/crouch/lean/twist/hold`, and phases timed so that "active" starts at the shot's `contactAt`;
- **(b)** poses (`pose`, `expr`, `stance`, `crouch`, `run`, `down`);
- **(c)** `rig.solvePose` post-processing (wrap it per rig) to place hands with `E.ik3` for two-handed bat grips, the bowling arm's vertical windmill and umpire signals;
- **(d)** `E.ACTIONS` entries for dives, slides and the run turn (`{ beats, setup, at }`).

Check every motion with `node engine/tools/filmstrip.mjs dist/index.html#<scene> --steps "..." --seed 1`. Each must wind up, strike and settle back without snapping or sweeping backwards.

| Role | Animations |
|---|---|
| Batter | stance (side-on, knees flexed, bat tapping), trigger step, front-foot and back-foot defence, leave (bat high), duck and sway, drives (straight, cover, on), cut, pull, hook, flick, glance, sweep, slog-sweep, lofted drive, scoop, upper cut, helicopter (a full wrist whirl: bat rotates 360° after contact), charge (2 quick steps), run carrying the bat, the crease turn (an `E.ACTIONS` pivot with the bat grounded), the dive (body flat, bat stretched: `down` plus a lunge), walk-off (`hunch`, slow), celebrations (bat raised for 50 or a six; a bat twirl), dejection (`kneel`) |
| Bowler | run-up (pace: accelerating; spin: 4 steps), the bound (a hop), the delivery stride: front arm up, then the bowling arm windmills over the top in the vertical plane, the right hand IK'd round a circle centred on the shoulder (radius = the arm's length) over 0.18 s, with the release at the top front. Then the follow-through (a stoop, then running off to the side of the pitch). A spinner's version is shorter with a wrist flick. Also the appeal (both arms up, `shout`), the aeroplane celebration (arms out, a curved run), a knee slide, hands on head |
| Fielders | walking in (crouched), the ready position, chase, slide stop, pick-up, overarm throw (wind back, sling: the `throw` move), underarm flick, the diving catch (an `E.ACTIONS` full-length dive and roll), the high catch (hands cupped above the eyes), juggle, drop, the catch celebration (ball tossed up), backing up |
| Keeper | crouch, rise with the ball, catch (gloves up), dive, stumping (whip the bails: a fast hand arc), standing up to spin |
| Umpire | stand with hands behind back, slight crouch at delivery. Signals: OUT (finger raised slowly; Rev. Hollis takes 1.2 s), FOUR (arm waved across the chest), SIX (both arms up), WIDE (arms out horizontally), NO BALL (one arm out), BYE (palm up), LEG BYE (touch a raised knee), FREE HIT (circling finger over the head), REVIEW (draws a TV rectangle in the air), DEAD BALL (crossing wrists) |
| Others | Thrumpton's sneer and monocle-adjust (a hand to the eye), Mrs Crumb pouring tea, Doris grazing and walking, seagulls flap, the peacock's fan display, ghosts float (a z bob plus alpha flicker), the mascot runner in a chicken costume (a hood plus beak colours) chased by two stewards, the crowd |

Animation tests: filmstrips reviewed (§11.5); and headless checks that every shot's "active" phase begins within ±8 ms of its `contactAt`, the bowling hand passes over the head (z > head z) during the stride, and every signal ends back at rest.

---

## 8. Content

### 8.1 Cast (main characters)
| Name | Role | Look (rig) | Voice |
|---|---|---|---|
| **Edie Pluckrose** | Kerfuffle CC captain; fast bowler and big hitter; the vicar's daughter, unflappable | heroic, size 1.2; auburn ponytail; cream kit, green cap and trim; freckles (portrait detail) | 240 Hz, brisk |
| **Basil Thwaite** | 74-year-old leg-spinner; claims he once bowled out a duke | chibi, walrus moustache, bald under a faded green cap, cardigan (coat outfit, beige) | 120 Hz wobbly |
| **Dev Mistry** | opening batter; leaves everything; quotes statistics | heroic; neat black hair; glasses; helmet | 170 Hz precise |
| **Pip Larkin** | teenage keeper; never stops chirping | chibi; spiky blonde hair; oversized gloves | 290 Hz fast |
| **Mrs Agatha Crumb** | tea lady, scorer and tactical genius; runs the Nets lessons | chibi; grey bun; floral apron (robe outfit) | 220 Hz warm |
| **Rev. Hollis** | umpire (village matches); kind; questionable eyesight | heroic; white coat, brim hat, dog collar, glasses | 150 Hz soft |
| **Lord Rufus Thrumpton-Vane** | villain; out LBW, first ball, on this green on 4 June 1975 and has never forgiven it | bulky; tweed coat, handlebar moustache, monocle hand, flat cap | 160 Hz nasal |
| **Sir Aubrey Fennimore-Wolde** | commentator | portrait: grey swept hair, bow tie, panama | 105 Hz |
| **Dazza Keegan** | commentator | portrait: sunburnt, zinc cream on nose, cap backwards | 135 Hz |
| **Prof. Priya Statsworth** | Owl-Eye analyst | portrait: sharp bob, headset | 210 Hz |

### 8.2 Teams (6) and players
Each team has 11 players: 3–4 hand-made stars, and the rest generated from the team's name pool and palette. Player stats are 1–10: `bat` (timing), `power`, `tech` (vs pace and spin), `bowl` (type, skill, pace), `field` (`speed`, `catch`, `ground`, `throw`) and `style`.

| Team (code) | Kit | Home | Stars (role · special) | Name pool (for generated squad) |
|---|---|---|---|---|
| **Kerfuffle CC** "The Teapots" (KER) | cream `#f2ead8`, green trim `#2f6b3a`, green caps | Village Green | Edie Pluckrose (fast bowler, slogger · *Tea-Kettle Slog* / *Vicar's Revenge*), Basil Thwaite (leg-spin · *The Grandad*), Dev Mistry (opener · *Statistical Certainty*), Pip Larkin (keeper · *The Chirp*) | Hodge, Pemberton, Allsop, Twigg, Moss, Fairweather, Hobbs, Nettles |
| **Lower Muddleford Mutineers** (MUD) | mud brown `#6a4a2a`, orange `#e07a2a` | Village Green (away) | Gaz Gristle (captain, slogger · *The Long Handle*), Big Terry Dunstable (medium dobber · *Dibbly-Dobbly Doom*), Nan Gristle (wily off-spin) | Clod, Furrow, Bagshaw, Wurzel, Pratt, Muckle |
| **Gentlemen of Thrumpton** (GEN) | white, navy `#22305a` stripes, gold `#d8b04a` caps | Thrumpton Hall | Hon. Peregrine Twistleton-Smythe (swing · *The Peregrine Swoop*), Fortescue (butler-fielder, safest hands · *Silver Tray Save*: a guaranteed catch), Lady Araminta Fitch (elegant bat · *The Croquet Drive*) | Ffoulkes, Carstairs, Montague, St John-Smythe, Pargeter |
| **Sunburnt Bay Larrikins** (LAR) | teal `#1fb5a8`, yellow `#ffd23a`, zinc stripes | Sunburnt Bay | Shazza Brannigan (express pace · *Sunburn Bouncer*), Kev "Thongs" Malone (slogger · *Boardwalk Bludgeon*), Big Wal (keeper) | Dunno, Bluey, Sandy, Robbo, Gazza, Davo |
| **Magic Circle XI** "The Conjurers" (MAG) | purple `#5a2a7a`, silver, short capes | Dustbowl Downs | The Great Spinaldo (mystery spin · *Vanishing Ball*), Madame Zsa-Zsa Flick (googly bowler · *Sawn in Half*: the stumps split comically for a wicket), Houdini Jnr (keeper · *Lightning Stumping*: wider stumping window) | Presto, Abra, Mystique, Prestidigitate, Sleight |
| **Thrumpton's Thunderbolts** (THR) | black, violet `#7a3aff`, gold lightning; ghosts pale `#a8e0ff` | The Megadome | Lord Thrumpton-Vane (captain, bat · *Grudge Drive*; bowls the *Grudge Ball*), the Thrumptonator 3000 (bowling machine · *Triple Threat*), Dr Ebenezer Grimble (ghost bat · *Ectoplasmic Edge*), the Eternal XI of 1882 (ghost fielders that phase) | ghosts: Bartholomew, Silas, Ignatius, Obadiah, Cornelius |

Batting orders: stars at 1–5. Bowlers: each team has 4–5 bowlers covering ≥ 2 families.

### 8.3 Grounds (5) and the Nets
| Ground | Boundary rx×ry | Pitch (bounce/turn/seam/pace) | Outfield | Default time / weather | Ends | Stadium targets (bonus) | Chaos pool |
|---|---|---|---|---|---|---|---|
| **Kerfuffle Village Green** | 560×600, gentle slope (the ball rolls 8% faster down it) | 1.0 / 1.0 / 1.2 / 0.95 | long grass, k ×1.25 | sunny, then golden hour in innings 2 | Pavilion End / Leaning Wicket End | Pub window +6, Vicarage greenhouse +10, Church weathervane +12, Beehive in the oak +4 (bees!) | Doris the cow, bees, church bells (a dot ball rings them) |
| **Thrumpton Hall** | 620×620 | 1.0 / 0.9 / 1.1 / 1.0 (swing ×1.5 overcast) | manicured, fast k ×0.8 | overcast | Hall End / Orangery End | Fountain +6 (lost ball), Phantom car windscreen +10, Hall window +8 | peacocks crossing (deflect ground balls), Fortescue's tea tray crossing |
| **Sunburnt Bay** | 640×520 (sea side flattened) | 1.25 / 0.9 / 1.0 / 1.15 | sand k ×1.6, running −15% | blazing midday | Pier End / Dunes End | Ferris wheel +12, Ice-cream van +6 (ice-cream rain), Inflatable shark +8 | seagulls steal a stopped ball (2 byes), the tide (sea-side boundary shrinks 15% over the innings), surf spray |
| **Dustbowl Downs** | 600×600 | 1.05 / 1.6 / 0.9 / 0.9 (rough patches outside off: turn ×1.5) | bumpy, fast k ×0.85, random small deflections | hot, then a thunderstorm (rain delay in innings 2) | Top Hat End / Water Tower End | Giant top hat +8 (doves), Water tower +10 (brief shower), Hot-air balloon +15 (on a path) | rain delay (Kerfuffle Method), dust devils, rabbits from the hat run across |
| **The Thrumpton Megadome** | 760×760 | 1.1 / 1.0 / 1.0 / 1.2 | lightning fast k ×0.7 | midnight, floodlights, fog banks | Jumbotron End / Old Pavilion End | Jumbotron +15, VIP box +12, Ghost bell +12, Laser rig +8 | fog banks, ghost fielders phase (for 0.5 s a ghost can't stop or catch the ball: it passes through), fireworks, Thrumpton's advert break between overs ("THRUMPTON PARKING: PARK LIKE A LORD": a 3 s non-interactive card, skippable) |
| *Nets* | behind the village pavilion: two netted lanes, the bowling machine, practice stumps | as Village Green | — | day | — | Six Machine targets (6 floating boards) | — |

### 8.4 Deliveries
#### 8.4.1 Catalogue (speeds nominal km/h; swing + = away from a right-hander; turn in degrees, + = away from a right-hander)
| Id | Family | km/h | Swing | Seam | Turn | Bounce | Dip | Notes |
|---|---|---|---|---|---|---|---|---|
| express | pace | 138–148 | 0.1 | 1.0 | 0 | 1.0 | 0 | stock fast ball |
| bouncer | pace | 135–145 | 0 | 1.0 | 0 | 1.25 | 0 | must pitch ≥ 140 from the batter |
| yorker | pace | 136–146 | 0.15 | 0.5 | 0 | 0.9 | 0.1 | length band 0–24 from the crease |
| slower | pace | 105–115 | 0 | 1.2 | 0 | 0.95 | 0.3 | looks like an express until late (no speed shown until it pitches) |
| outswing | swing | 125–135 | +1.0 | 1.0 | 0 | 1.0 | 0 | |
| inswing | swing | 125–135 | −1.0 | 1.0 | 0 | 1.0 | 0 | |
| wobble | swing | 120–130 | ±0.3 random | 3.0 | 0 | 1.0 | 0 | |
| dobber | medium | 100–110 | 0.1 | 1.5 | 0 | 0.95 | 0.1 | |
| cutter | medium | 105–115 | 0 | 1.0 | +3 | 0.95 | 0 | |
| knuckle | medium | 95–105 | wobbly flight | 0.5 | 0 | 0.9 | 0.25 | |
| legbreak | spin | 78–88 | drift −0.3 | 0.3 | +9 | 1.05 | 0.2 | |
| googly | spin | 76–86 | drift +0.2 | 0.3 | −8 | 1.05 | 0.2 | |
| topspin | spin | 80–90 | 0 | 0.3 | 0 | 1.2 | 0.35 | |
| offbreak | spin | 80–90 | drift +0.3 | 0.3 | −8 | 1.0 | 0.15 | |
| armball | spin | 88–96 | +0.3 | 0.3 | 0 | 0.95 | 0 | |
| doosra | spin | 78–88 | 0 | 0.3 | +8 | 1.05 | 0.2 | |
| piston | machine | 160–170 | 0 | 0.8 | 0 | 1.05 | 0 | the Thrumptonator only |
| steamBouncer | machine | 150 | 0 | 1.0 | 0 | 1.35 | 0 | steam trail |
| spinCycle | machine | 95 | 0 | 0 | ±14 random | 1.1 | 0.3 | |

Swing base acceleration: 60 u/s² × swing × `T('swing')` × ground factor. Each bowler lists 3 deliveries from their family (plus a special).

#### 8.4.2 Field presets (θ° from straight, + = off side; distance in units; the keeper is extra)
- **Attacking pace:** slip1 165/150, slip2 158/150, slip3 151/152, gully 132/150, point 95/230, cover 58/260, mid-off 14/300, mid-on −14/300, fine leg −162/(boundary − 30).
- **Balanced:** slip1 165/150, point 95/240, cover 55/270, mid-off 12/320, mid-on −12/320, midwicket −60/270, square leg −95/250, fine leg −160/(b − 30), third man 155/(b − 30).
- **Defensive:** point 95/250, deep cover 55/(b − 30), long-off 12/(b − 30), long-on −12/(b − 30), deep midwicket −60/(b − 30), deep square −95/(b − 30), fine leg −160/(b − 30), third man 155/(b − 30), cover 40/260.
- **Spin attack:** slip 160/40, short leg −100/50, silly point 100/50, cover 55/240, mid-off 12/280, mid-on −12/280, midwicket −60/240, deep square −95/(b − 30), long-on −15/(b − 30). The keeper stands up at 24.

### 8.5 Shots (resolver rows; sectors in batter-frame degrees, + off side, 0 straight, ±180 behind)
| Button | Length | Sector | Shot | contactAt | Launch | Speed (u/s) | Zone line / z |
|---|---|---|---|---|---|---|---|
| ✕ | full | −25..25 | straight drive | 0.13 | 3° | 440 | −6..8 / 0..14 |
| ✕ | full | 25..75 | cover drive | 0.13 | 4° | 450 | −4..14 / 0..14 |
| ✕ | full | −75..−25 | on drive | 0.13 | 4° | 430 | −8..6 / 0..14 |
| ✕ | full/good | −130..−75 | flick off the pads | 0.12 | 6° | 400 | −10..2 / 0..18 |
| ✕ | full/good | −180..−130 | leg glance | 0.11 | 3° | 330 | −10..0 / 0..20 |
| ✕ | good | 25..75 | back-foot punch | 0.12 | 5° | 410 | −4..14 / 6..22 |
| ✕ | short | −130..−60 | pull | 0.12 | 8° | 460 | −6..10 / 14..32 |
| ✕ | short/good (line > 8 off) | 75..125 | square cut | 0.11 | 5° | 460 | 6..22 / 6..26 |
| ✕ | any | 125..180 | late cut / dab | 0.10 | 2° | 300 | 4..20 / 2..22 |
| ✕ | any | other | push (in that direction) | 0.12 | 3° | 320 | −8..12 / 0..24 |
| □ | full | −30..30 | lofted straight hit | 0.14 | 38° | 330 | −6..8 / 0..16 |
| □ | full | 30..80 | inside-out lofted cover | 0.14 | 34° | 320 | −2..16 / 0..16 |
| □ | full/good | −110..−30 | slog / slog-sweep (vs spin) | 0.15 | 36° | 335 | −10..8 / 0..20 |
| □ | short | −140..−60 | hook | 0.12 | 30° | 340 | −6..10 / 18..38 |
| □ | short | 60..120 | upper cut | 0.11 | 34° | 310 | 4..20 / 18..36 |
| □ | any | 150..180 or −180..−150 | scoop / ramp (over the keeper) | 0.12 | 42° | 260 | −4..6 / 0..20 |
| □ | yorker | −30..30 | helicopter (360° follow-through) | 0.12 | 40° | 350 | −4..6 / 0..6 |
| ○ | full/good | any | forward defence | 0.08 | 0° | 60 | −8..12 / 0..20 |
| ○ | short | any | back defence (duck if z > 28) | 0.08 | 0° | 50 | −8..12 / 8..28 |
| none | — | — | leave (duck or sway if z > 28) | — | — | — | — |

Lengths are measured from the striker's popping crease to where the ball pitched (or would pitch): yorker ≤ 24, full 24–70, good 70–130, short > 130.

### 8.6 Specials
| Special | Owner | Kind | Effect |
|---|---|---|---|
| Tea-Kettle Slog | Edie | bat | guaranteed PERFECT lofted hit in the aimed direction, +25% distance, a steam-whistle trail; any delivery |
| Vicar's Revenge | Edie | bowl | a 155 km/h inswinging yorker, green meter, holy-light trail; the edge zone ×1.5 vs the batter |
| The Grandad | Basil | bowl | a leg-break that bounces three times (each bounce turns +6°) and still reaches the stumps at a crawl; the batter's timing windows halved (the shock) |
| Statistical Certainty | Dev | bat | shows the exact perfect timing marker (a ring closing on the bat) for 1 ball; GOOD guaranteed, PERFECT if pressed on the marker |
| The Chirp | Pip | field | while bowling: on the next ball a CPU batter's timing error doubles (it gets flustered), or a human batter's timing windows shrink by 30%; costs 50 Hype |
| The Long Handle | Gaz (CPU) | bat | a lofted hit with power ×1.4 |
| Dibbly-Dobbly Doom | Big Terry (CPU) | bowl | an 80 km/h ball that wobbles in the air; batters mistime it (AI σ ×2) |
| Peregrine Swoop | Peregrine | bowl | banana swing ×3, late |
| Silver Tray Save | Fortescue | field | the next catch chance is guaranteed (a tray flourish) |
| The Croquet Drive | Araminta | bat | a ground shot that can't be stopped (it passes through fielders) and goes for FOUR |
| Sunburn Bouncer | Shazza | bowl | a 152 km/h bouncer with heat haze; ducking makes it a dot, a hook without PERFECT gives a top-edge catch |
| Boardwalk Bludgeon | Kev | bat | a huge hit, +40% distance, but caught if a fielder is under it |
| Vanishing Ball | Spinaldo | bowl | invisible from 40% to 65% of the flight (smoke puffs); the shadow is still drawn (fair) |
| Sawn in Half | Zsa-Zsa | bowl | a googly; a bowled wicket splits the stumps |
| Lightning Stumping | Houdini Jnr | field | the stumping window triples for 1 over |
| Grudge Ball | Thrumpton | bowl | an LBW-seeking yorker; the umpire's accuracy +10% on that ball (a running joke: it doesn't help him) |
| Grudge Drive | Thrumpton | bat | a power drive straight at the bowler |
| Triple Threat | Thrumptonator | bowl | releases 3 balls: 2 holograms on different lines and lengths, 1 real one (with a seam glint every 0.1 s); only the real one matters |
| Ectoplasmic Edge | Grimble | bat | the ball passes through the first fielder it meets |

### 8.7 Items, tea treats and chaos
#### 8.7.1 Items (Kerfuffle rules)
| Item | Side | Effect |
|---|---|---|
| Golden Teapot | bat | the next scoring shot's runs ×2 (the bonus is shown) |
| Lucky Horseshoe | bat | the next dismissal is overturned ("The ball hits the horseshoe! NOT OUT!") |
| Giant Bat | bat | the bat is drawn 1.6× bigger; zones and windows ×1.4 for 2 balls |
| Cake Slice | bat or bowl | Hype +40 |
| Sticky Gloves | bowl | the next catch chance is guaranteed |
| Banana Peel | bowl | the next run attempt: batters slip mid-pitch (−40% speed for 1 s) |
| Fog Machine | bowl | the next ball: the batter's pitch marker is hidden; CPU σ ×1.5 |

**Tea treats** (story, at the innings break, pick one): Victoria Sponge (Hype +40), Builder's Tea (timing windows +10% for 2 overs), Cucumber Sandwiches (run speed +10% for the innings).

#### 8.7.2 Stadium targets
See §8.3. Each is an entry `{ id, ground, shape: 'box'|'sphere', at, size, bonus, hype: 30, state, fx, line }`.

#### 8.7.3 Chaos events
Each event is `{ id, ground, when: 'between'|'overStart', chance, duration, run(game, match) generator }`. Each must end by itself and restore the field:
- Doris the cow: walks the outfield on a path; fielders path round her; she leaves after 2 overs, or at once if a ball hits her, harmlessly ("She's taken it on the flank and seems pleased");
- bees from the hive: chase a fielder (−30% speed) for 1 over;
- church bells: cosmetic, plus a commentary line;
- peacocks: wander and deflect ground balls ±25°;
- Fortescue's tea tray: a fielder runs on with tea; play pauses 3 s;
- seagulls: a stopped ball in the outfield is carried 30 units (2 byes);
- the tide: the sea-side boundary moves in a step at each over's start (the ellipse's sea-side radius shrinks, up to 15% over the innings). **Don't re-bake the floor for it.** Draw the advancing water edge and the moved rope as animated `r.decal` bands over the baked sand, and tag wet sand logically (a y threshold) for the slower outfield;
- the rain delay (scripted in chapter 4; available in Quick Match weather "rain"): rain, covers, tea scene, the Kerfuffle Method;
- dust devils: deflect aerial balls passing through ±10°;
- rabbits: cosmetic;
- fog banks: change the fog density over 2 overs;
- ghost phasing: a ghost fielder is intangible for 0.5 s at random;
- fireworks: on sixes at night;
- the advert break: a 3 s card between overs at the Megadome;
- the mascot pitch invader: a chicken costume, chased by stewards; cosmetic, 1 over, any ground in Quick Match with Kerfuffle rules.

### 8.8 Story: *The Grand Kerfuffle* (5 chapters)
The writing style is dry, affectionate and digressive, like the commentary box; short lines; no line over 2 × 42 characters; markup for comic timing (`{w=.5}`, `{shake}`).

**Prologue** (cutscene on the village green at dawn, after New Game):
- AUBREY (narrating, as *The Kerfuffle Almanack*): "Kerfuffle-on-the-Wold. Population: two hundred and twelve, and a cow called Doris."
- AUBREY: "Nothing of note has happened here since the hailstorm of 1953,{w=.4} which was rained off."
- *The Phantom crunches across the square. Tyre marks on the pitch. Mrs Crumb drops a scone.*
- THRUMPTON: "Fourth of June, 1975. First ball. Given out leg before by a vicar{w=.3} who was looking at a butterfly."
- EDIE: "That was my grandfather. He still talks about that butterfly."
- THRUMPTON: "I have purchased the deeds to this green. On Monday it becomes the Thrumpton Parking Plaza.{w=.3} Four hundred spaces.{w=.3} No cricket."
- MRS CRUMB: "Over my dead sponge."
- THRUMPTON: "Unless... you beat my teams in the Grand Kerfuffle. Five matches. My grounds. My rules.{w=.3} Your umpires. I'm not a monster."
- EDIE: "Done. We'll play you anywhere.{w=.3} Bring cake."
- *Title card: THE GRAND KERFUFFLE.*

| # | Chapter | Opponent · ground | Scenario | Teaches | Beats | Kerfuffle Goals (stars) |
|---|---|---|---|---|---|---|
| 1 | **A Gentle Knock** | Lower Muddleford · Village Green | full match, 2 overs each, KER bats first, at the player's difficulty (Muddleford are the weakest side, so it plays gently) | Nets lessons 1–4 and 6: aim, ground, loft, defend, run, bowl | pre: Gaz's challenge ("by warm-up I mean a thrashing"); Nets with Mrs Crumb ("Watch the ball, dear, not the cake"); after innings 1: Thrumpton watches from the car ("With the heater on"); win: "Beginner's luck. Thrumpton Hall next. Dress code: impeccable." | win · smash the pub window · hit a six |
| 2 | **Tea on the Lawn** | Gentlemen of Thrumpton · Thrumpton Hall (overcast) | "Kerfuffle posted 24 after a top-order collapse, chiefly due to peacocks." The Gentlemen need 25 from 2 overs: **you bowl and field** | lessons 7–11: aftertouch, Hype specials, catch ring, throws, reviews (the KRS appears) | pre: Peregrine ("Do mind the peacocks; they bite"); Fortescue announces tea "at the fall of the third wicket, or at four, whichever is more dignified"; mid: the ball comes back sticky ("Is that... marmalade?"), a review tutorial; win: "I shall have Fortescue polish your trophy. With marmalade." | win · take a PERFECT-ring catch · win a review |
| 3 | **Sand in the Sandwiches** | Sunburnt Bay Larrikins · Sunburnt Bay | chase 30 from 2 overs vs pace: **you bat** | bouncers (duck, hook), hard running and the dive, the tide | pre: the minibus breaks down and the team pushes it ("Statistically, sunscreen doesn't melt at—" / "Mate."); mid: the tide warning; win: Shazza warns "He's been buying ringers. Weird ones. See-through ones." | win · hook a six · win with a dive making the crease |
| 4 | **Now You See It** | Magic Circle XI · Dustbowl Downs | full match, 2 overs each; a rain delay in innings 2, the Kerfuffle Method | spin (lesson 5: charge), stumpings, the rain delay, tea treats | pre: Spinaldo ("Pick a card. It will be the card of your downfall."), Basil ("I bowled leg-spin to a magician once. He sawed my stumps in half."); mid: rain, covers, the tea room scene, Mrs Crumb's chalkboard ("carry the scone..."); win: Spinaldo reveals the ghosts and the midnight booking | win · stump a batter · hit the hot-air balloon |
| 5 | **The Midnight Final** | Thrumpton's Thunderbolts · The Megadome (night, fog) | full match, 3 overs each; the final over of the KER chase is the Thrumptonator's boss over; a Super Over if tied | ON FIRE emphasis, Triple Threat, ghosts, fog, the Super Over | pre: the Megadome ("No tea. No cake. No interval. Just ADVERTS."); the ghosts rise ("We have waited one hundred and forty-four years for a match that wasn't rained off." / EDIE: "Then let's give you one."); mid: fog rolls in; the Thrumptonator wheeled out ("Steam-powered. Never misses. Never gives anyone out leg before on a butterfly."); **win ending:** Thrumpton demands one exhibition ball against Rev. Hollis, who gives him out LBW first ball, again. Thrumpton laughs for the first time in 51 years: "Plumb. Absolutely plumb." He tears up the deeds, the ghosts depart in peace ("Worth the wait."), and the Almanack closes: "Lord Thrumpton-Vane now polishes the tea urn on Saturdays and is said to be adequate at fine leg." Then credits. | win · survive the Thrumptonator's over without losing a wicket · hit the jumbotron |

**Losses** (every chapter): a short consolation, e.g. MRS CRUMB: "Never mind, dear. Even the best of us get a golden duck. Have a scone and go again." Then Retry / Retry on Village / Map.

The beats run as `game.script` generators on the bus (for example, `yield E.until(() => match.innings === 1 && match.phase === 'between')`, then play the scene). Story scene data goes through `E.Story` nodes, with speakers mapped to portraits.

### 8.9 Lines
#### 8.9.1 Commentary starter set (write ≥ 3 per event per commentator in this voice; A = Aubrey, D = Dazza)
- **match start:** A "Good afternoon from {ground}, where the sun is out, the tea is stewed, and {team} are about to play cricket, after a fashion." D "Should be a cracker. Or a shambles. Probably both."
- **dot:** A "Defended. A stroke of great dignity and no ambition whatsoever." D "Nothing doing." A "Left alone. The ball goes by like a gossip past a closed door."
- **beaten:** A "Beaten all ends up! He could not have missed that more if he'd brought a map." D "Played and missed. Dreadful. Lovely ball, mind."
- **single:** D "Tip and run." A "A quick single, taken with all the urgency of a vicar late for a fête."
- **four:** A "FOUR! Struck with the elegance of a swan, and the violence of an angry swan." D "Too short, too wide, too bad. Four."
- **six:** A "That is MAXIMUM! Somebody alert the air-traffic people." D "That's gone into the next postcode, mate."
- **six into the pub:** A "Through the window of the Leaning Wicket! Last orders, I fear, have been called by the ball."
- **greenhouse:** A "Into the vicarage greenhouse. There goes the marrow competition."
- **bowled:** A "Bowled him! The stumps are doing cartwheels, which is more than the batsman managed." D "Timber!"
- **caught:** D "Up, up... and taken. Safe as houses." A "A catch of quiet magnificence. Someone get that fielder a scone."
- **dropped:** A "Dropped! Butter, I think, would have had a firmer grip." D "Oh, he'll be buying the drinks tonight."
- **LBW:** A "A huge appeal! The Reverend raises... raises... yes, eventually, the finger." D "Plumb. Plumber than a plumber."
- **run out:** A "Yes! No! Wait! Sorry! The four stages of grief, conducted at a sprint." D "Run out by a country mile."
- **stumped:** A "Down the pitch, through the gate, and the bails are off before you can say Kerfuffle."
- **wide:** D "Wide. Wide enough to land a plane."
- **no-ball:** A "No-ball! He's overstepped, which in this village is practically a felony. Free hit to come."
- **ON FIRE:** D "The bat is literally smoking. Someone fetch a bucket." A "Willow ablaze! Health and Safety will want a word."
- **special:** A "Oh, he's going for something special. I can't look. I'm looking."
- **review:** PRIYA "Owl-Eye has it... pitching in line... hitting... and it's clipping the bails by a whisker of a whisker."
- **rain:** A "And down it comes. The covers are on, the umbrellas are up, and the crowd are discussing the weather, which is the only thing they love more than cricket."
- **the cow:** A "There's a cow on the outfield. A Friesian, I believe. She's at deep midwicket and, frankly, better positioned than their fine leg."
- **idle filler:** A "A Mrs Hepplewhite of Lower Muddleford has sent in a lemon drizzle. Mrs Hepplewhite, you are a saint." A "There's a pigeon at short leg who has, I think, been there since Tuesday." D "Lovely day for it." A "Is it? I hadn't noticed. I've been looking at this cake."
- **win:** A "And that's the match! Victory for {winner}, for common sense, and for the scone." **loss:** D "That's that, then. Shake hands, have a sandwich, try again."

#### 8.9.2 Shouts (gibberish voice, captions in speech bubbles)
"YES!", "NO!", "WAIT!", "TWO!", "HOWZAT!", "OUT!", "CATCH IT!", "MINE!", "SORRY!", and the crowd's "KER-FUF-FLE!".

#### 8.9.3 Match report templates (results screen; fill from the ball records; pick by the shape of the result)
- "{winner}, set {target}, were indebted to {topBat} ({topRuns}{notOut}, {sixes} sixes, one of them through {targetHit}). Play was held up for {delayMins} minutes while {chaosThing} was persuaded off the square."
- "{loser} never recovered from {collapse}. {topBowl} took {wkts} for {runs} with a mixture of guile, swing and, in one instance, marmalade."
- "A tie, decided by a Super Over of almost unbearable tension, at the end of which {hero} was carried from the field on the shoulders of the scorer."

### 8.10 Music
See §5.13.4. Sketch each song in the notation and audition it in the Nets (a dev-mode "Jukebox" row on the JUMP tab plays each song and sting).

---

## 9. Build order and milestones
Each milestone ends with its tests green (`node test/run.mjs`), a bundle build, and a look at the screenshots it touched. Commit nothing outside `<dev>` except the final .html and the exit interview.

| M | Name | Builds | Exit criteria |
|---|---|---|---|
| **M0** | Scaffold | the dev folder; the engine copied; vendor hub files; `tools/build.mjs` producing `dist/` and the single-file bundle with the client first; `test/run.mjs` running a first suite plus the bundle checks; `tools/serve.mjs`; a first title scene with the logo (finished in M4) | `node test/run.mjs` prints `N passed, 0 failed`; the bundle opens from file:// to the title; `engine/tools/check.mjs` passes on the bundle |
| **M1** | **The Nets spike (feel first)** | the Village Green TileMap (basic floor texture), the broadcast and wide views; the batter rig with the **bat** (engine change 1) and pads; the bowling machine; the ball physics and predictor; the timing model and ground, loft and block shots for 6 resolver rows; the shadow, pitch marker and timing words; the cut to the wide cam; boundary detection (4 and 6); the TUNING registry and a minimal dev panel (sliders only) | unit-ball and unit-shots green; filmstrips of 3 shots and the bowling machine look right; a human can hit PERFECT drives reliably after 10 balls on County (play it) |
| **M2** | Match loop | rules (§5.7), the delivery director, running (§5.4) with the AI partner, fielding (§5.5) for the CPU side, umpire decisions and signals (bowled, caught, LBW, run out, stumped), innings, target, result, toss, Super Over; the CPU batting and bowling AI; Quick Match 1P vs CPU with the human batting and the CPU bowling | unit-rules and unit-umpire green; sim scenarios for running, wickets and boundaries green; **bot-match** (CPU vs CPU, Village Green) completes with a result and no stuck balls |
| **M3** | Human bowling and fielding, and the hub early | §5.2 in full (panel, marker, meter, aftertouch, over/round, field presets), catch ring, throws, keeper, bowler select, captain AI; **AI Hub parallel Super Over** (§5.17) with our card | sim scenarios for bowling, catching and throws green; **hub-mock** green; **browser-hub** passes with 1, 2 and 4 players (latency and loss); a full 1P Quick Match playable in both roles |
| **M4** | Presentation | the camera director (all shots) and the close and review views; the recorder, replays, Owl-Eye, the third umpire and KRS; the HUD (§5.15.2); glyph prompts (§5.14.3, engine change 4); front-end menus, setup and pause items; settings; the 10-foot layout; the touch-only gate; commentary with captions; the gibberish voice synth (engine change 3); SFX, the crowd engine, music with layers | prompt and glyph tests green; HUD layout tests green on 4 sizes; browser smoke screenshots reviewed; commentary tests green |
| **M5** | The arcade layer | Hype, ON FIRE, every special (§8.6), items, tea treats, stadium targets, chaos events, weather and time of day (fog, night lights), difficulty levels | sim scenarios for each special, item, target and chaos event green (forced via debug) |
| **M6** | Content | all 5 grounds with their art (§6.3, §6.5), panoramas, props and palettes; the 6 teams and 66 players with rigs, portraits and voices; the story map, the 5 chapters, cutscenes, beats, goals and stars, the endings; the Nets lessons and Six Machine; Showdown Bat and Bowl with tables; Versus with 2–4 players; saves, unlocks; Wisden-style reports; all music | **bot-campaign** completes the story; bot-match on all grounds; local MP tests green; screenshots of every ground and kit reviewed |
| **M7** | Attract, dev, about, polish | the attract showreel (10 segments) and its coverage; the full dev panel (4 tabs, every toggle and action); About/Credits pages; engine changes logged; balance passes with the dev sliders (aim: a County CPU chase of 30 off 2 overs succeeds about 50% vs a competent human); final bundle; exit-interview.json | **all suites green**, including attract-coverage, dev, bundle and the browser hub runs; no TODO or FIXME strings in `src/` (a test greps for them); the final reply written |

Work inside each milestone in this order: simulation (with unit tests), then presentation, then scenario tests, then screenshots.

---

## 10. Risks and how to de-risk them

| # | Risk | Why it is risky | De-risk now | Complete fallback if it fails |
|---|---|---|---|---|
| 1 | **Batting feel and readability** in an orthographic view | the depth and height of a fast ball are ambiguous without perspective; batting is the game | M1 first: the shadow disc, the pitch marker, the trail and length bands; the timing words; tune `camPitch`, `camScale`, `ballSpeed` and the windows with dev sliders; human playtest after M1 | raise the pitch marker to always-on with a closing timing ring (Statistical Certainty's visual) as the default "Classic" assist |
| 2 | **Bat and two-handed shots on the rig** | the engine rig has swords, not bats; two-handed IK in the draw pose could fight the attack specs | engine change 1 in M1 plus a filmstrip of each shot family; put the left hand on the handle by IK *after* the attack pose; keep `hand: 'both'` specs | a one-handed bat hold (the left hand following loosely), which still reads as a bat at 40 px |
| 3 | **Bowling action (windmill)** | there's no stock move for a vertical overarm arc | `solvePose` post-processing with an `E.ik3` circle over 0.18 s; filmstrip; compare with the `throw` move | the engine's `throw` move with a higher `z1` and a hop, which reads as overarm |
| 4 | **Physics, predictor and AI coherence** | the AI, LBW, catches and Owl-Eye all depend on the predictor matching reality | one step function shared by the sim and the predictor; no randomness inside it (the seam deviation is stored at release); unit test the match within 0.01 units | the AI and fielders read a simpler ballistic prediction, and LBW and Owl-Eye use the recorded real path up to impact plus a ballistic continuation from it |
| 5 | **Floor baking with big grounds and several views** | each view and scale bakes the floor; the cache clears past 6; zoom tweens re-bake | fixed views (no zoom tweens), raise the limit to 10 (engine change 6), warm the bakes in boot, chunked bakes; instrument `map.floors` | smaller grounds (rx 520) and only 3 views (close becomes broadcast with a tighter focus) |
| 6 | **Stalled deliveries** (a fielder never reaches the ball, a ball never settles) | a stuck game is game-breaking | a timeout on every director state; the 15 s inPlay cap; the bot-match stuck check | already complete: the timeouts are the fallback |
| 7 | **AI Hub conformance** | the client must come first; no blur pause; ready with no key; Enter on our card; time-up and end handling | M3 early; harness runs in the test command; `autoPause: false` in sessions; `card: true` handled with keys, pad and clicks | use the hub's own card (`card: false`), which removes the Enter check |
| 8 | **Content volume** (5 grounds, 6 teams, story, lines) | it can crowd out polish | data registries plus the ground recipe builder; a squad generator; stars hand-made only; content in M6 after systems are final | fewer props per ground and shorter line pools (≥ 3 per event), never fewer grounds or chapters |
| 9 | **Gibberish voice quality and clipping** | many simultaneous syllables could clip or sound harsh | a voice bus with a compressor (`DynamicsCompressorNode`); max 2 voices at once (queue); audition in the dev Jukebox | simpler square-blip voices with per-speaker pitch, still gibberish |
| 10 | **The attract mode looping forever without errors** | long unattended runs find rare bugs | it uses the real machinery with cheats; the attract-coverage test runs 12 minutes; `game.errors` stays empty | fewer segments (keep ≥ 6, covering the coverage list) |
| 11 | **Input conflicts** (J/K/L confirm and cancel, hub Create + Options, rebinding) | wrong menu behaviour annoys at once | a custom preset with confirm J and cancel L; engine change 5; tests for prompts and rebinding | — |
| 12 | **Bundle size or an inline `</script>`** | a broken single file is a broken deliverable | the build escapes it, then a bundle test opens the bundle headless and in a browser | — |

---

## 11. Testing

### 11.1 The one command
`node test/run.mjs [suite ...]`, run from `<dev>`:
- it runs every suite, or only those named;
- it prints **only failures**, as `FAIL <suite> › <case>: <detail>`;
- then one line: `142 passed, 0 failed (14 suites, 63.4 s)`;
- the exit code is 1 on any failure.

Browser suites need `cd engine && npm install && npx playwright install chromium` once. Our suites load Playwright from `engine/node_modules` (`createRequire(new URL('../engine/package.json', import.meta.url))`), so one install serves both the engine's tools and our tests. If Playwright is missing, the runner prints that as a failure; it never skips silently.

Rerun only the suites covering the code you changed (`node test/run.mjs unit-ball sim-batting`).

### 11.2 How the game is driven headless
- Load `engine/my-3d2dge.js` and `dist/game.js` into a `vm` context with the stand-ins `window`, `addEventListener`, `location` and `matchMedia` (as `engine/kits/test.mjs` does), then `game = E.current`.
- Drive with `game.advance(seconds)` (exact 1/120 s steps), `game.input.tap/hold/press/release`, and `input.feed` for the mouse. Seed `Math.random = E.rng(7)` and `MatchConfig.seed`.
- `game.debug` (80-debug.js) provides:
  - `snapshot()`: `{ scene, mode, ui: { device, glyphs, touchGate, prompts: [...], menuFocus }, match: { innings, runs, wkts, balls, over, target, need, freeHit, striker, nonStriker, bowler, hype: [a, b], fire, items, result }, ball: { phase, x, y, z, v, pitched, fx }, last (the last ball record), director: { state, shot }, story: { chapter, beat, flags }, attract: { active, segment }, hub: { active, phase, sent: { progress, result } }, dev: { open, changed: [...] }, coverage: {...}, errors }`;
  - `idealPress()`: the step to press for a PERFECT on the current ball;
  - `forceDelivery(spec)`, `forceOutcome(kind)`, `startMatch(cfg)`, `startChapter(n, beat)`, `setTuning(k, v)`, `spawnItem(id, at)`, `triggerChaos(id)`, `skipTo(state)`.
- **The coverage tracker** marks features as they happen (each delivery family, shot family, dismissal, special, item, target, chaos event, camera shot, review, rain, fog, night, Super Over, mix-up, dive, overthrow). Bot and attract suites assert on it.

### 11.3 Suites
| Suite | What it checks |
|---|---|
| `unit-ball` | §5.1 tests |
| `unit-rules` | §5.7.6 |
| `unit-shots` | §5.3: resolver rows, timing grades, edges |
| `unit-umpire` | §5.6 |
| `unit-ui` | HUD layout overlap on 4 sizes; the glyph mapping for codes; line lengths after the template fill (§5.12); hub tag lengths |
| `sim-batting` | ~12 scenarios (§5.3 tests), driven by real input at `idealPress() ± offsets` |
| `sim-bowling` | ~8 scenarios (§5.2) |
| `sim-running-fielding` | ~12 scenarios (§5.4, §5.5) |
| `sim-arcade` | every special, item, target and chaos event forced once: its effect observable, no errors, the state restored afterwards |
| `sim-front` | title → menu by keys, pad and mouse (hover and click); settings items exist; the pause menu has our items; dev mode open, slider change, reset; the About pages hold every Source Information field and the 3 feedback lists; the touch-only gate; prompts follow the device; Xbox glyph setting |
| `sim-mp` | local players join; roles; co-op agreement and mix-up; per-player prompts |
| `bot-match` | CPU vs CPU, 2 overs, on each of the 5 grounds and the 3 times of day. Each must finish with a result. Totals must be plausible (runs 5–90 per innings, extras < 30%). No director state may exceed its timeout, and every ball must end within 15 s. There must be no errors, and the coverage must include ≥ 1 four, ≥ 1 wicket and ≥ 1 run. |
| `bot-campaign` | New Game → prologue → chapters 1–5 → ending → credits, all by virtual input from the autopilot. The autopilot uses the AI's judgment (no cheats) at Village difficulty, with up to 3 retries per chapter. All beats must fire in order, all goals be evaluated, the save show complete and Continue work after a reload. It also asserts the duration and that there are no errors. |
| `attract-coverage` | §5.18 |
| `dev` | §5.19.3 |
| `hub-mock` | §5.17.3 |
| `bundle` | the file name; the session client is the first script after the charset meta, identical to vendor; hub and catalogue tags are present and valid; no external URLs in `src=` or `fetch(`; no `TODO`, `FIXME` or `placeholder` in `src/`; `exit-interview.json` (when present) parses and every value is non-empty |
| `browser-smoke` | Playwright via `engine/tools/check.mjs` on the bundle and deep links (`#match`, `#nets`, `#about`, `#dev`; implement hash deep links in `99-start.js` for tools only): no errors or engine warnings; its look notes printed as failures only if they're severe (low contrast or flat areas on the match scene). Screenshots are saved to `test/out/` |
| `browser-hub` | §5.17.3 harness runs |

### 11.4 Balance tests (run in M7; they report, not gate)
`node test/balance.mjs` runs 200 CPU-vs-CPU balls per difficulty and per ground, and prints the run rate, wickets per over, boundary share and extras share. Targets at County: about 8–11 runs an over, about 0.6 wickets an over, extras below 10%. Tune with the dev sliders, then copy the values into the defaults.

### 11.5 Screenshots and filmstrips (what scripts can't check)
Review with your own eyes, saved under `test/out/`:
- the title;
- each ground in broadcast and wide (10 shots) at 427×240, plus one at 320×690 and one at 640×270;
- each team kit (6);
- the HUD in batting, bowling and fielding;
- the third-umpire screen, Owl-Eye, an ON FIRE batter, each special's FX (still frames);
- the story map, a cutscene with portraits, the results screen with its report;
- the dev panel (legible at 10 feet: view at 1920×1080 scaled to 25%);
- the touch-only gate and each About page;
- filmstrips: 6 shot families, the pace and spin bowling actions, the dive, the diving catch, umpire signals OUT, FOUR and SIX.

---

## 12. Final delivery checklist
- [ ] `CricketKerfuffle-Cricket-claude-opus-5-5-max-20261103-174825.html` in the root: one file, opens from file:// to the title, no network requests, and the AI Hub client is the first script in `<head>`.
- [ ] Every feature in §5 is present and reachable in play: no TODOs, placeholders or stubs.
- [ ] Attract mode after 10 s idle on the title and menus; any input exits.
- [ ] Dev mode from the pause menu: live sliders with reset to defaults, toggles and jumps.
- [ ] AI Hub: the harness passes for 1, 2 and 4 players, and the game runs standalone outside a session.
- [ ] Controller-first 10-foot UI; keyboard and mouse native; prompts follow the last device; PlayStation glyphs, with Xbox in Settings; the touch-only gate.
- [ ] All audio in code, with gibberish voices.
- [ ] `node test/run.mjs` prints `… passed, 0 failed`.
- [ ] The About/Credits pages and the **chat reply** both carry Source Information, Testing Feedback, Engine Feedback and Prompt Feedback, with "unknown" where unconfirmed.
- [ ] `exit-interview.json` in the root: the exact shape from TASK.md, parses as JSON, every value filled.
- [ ] `engine/CHANGES-KERFUFFLE.md` lists the engine changes, and the Engine Feedback answers name them.
- [ ] All processes you started are stopped by PID.

---

## 13. Where each TASK.md requirement is met
| TASK.md requirement | Plan |
|---|---|
| Genre and perspective chosen to fit cricket (over-the-top arcade) | §2, §5.11 |
| Title: a riff on the name, 50 brainstormed, picked by a real RNG | header |
| Single HTML file, named as given | §1.1, §3.6 |
| Build on the my-3d2dge handoff; free to change the engine | §1.2, §3.1, §3.5 |
| Engine's native style plus new source-specific art | §6 |
| Engine's native animation plus new animations | §7 |
| All audio in code, with gibberish voices | §5.13 |
| Online: AI Hub lib/hub, and the game on its own | §5.17, §5.16.5 |
| Dev subfolder and bundling; file:// preferred; servers on port 0; PID-only stops | §1.2, §3.2, §3.6, §11 |
| Performance budget unlimited | §1.3, §6 |
| Headless testing with game.advance and game.debug, a scripted full playthrough, one command with failures and a count | §11 |
| A feature-complete vertical slice that captures the source's world, characters, themes and tone | §2, §8 |
| Dev mode from pause, live sliders and reset | §5.19 |
| Attract mode after 10 s idle; any input exits; AI may cheat | §5.18 |
| Multiplayer | §5.16.5, §5.17 |
| Narrative tone like the source's | §5.12, §8.8, §8.9 |
| 10-foot controller-first UI; native keyboard and mouse; hover focus; device-following prompts; PS glyphs with an Xbox option; no dense data screens | §5.14, §5.15 |
| Touch-only: no touch controls, "Controller or keyboard required", the settings button, attract runs | §5.15.6 |
| No TODOs, placeholders or stubs | §1.3, §11.3 (the bundle grep), §12 |
| Source Information and feedback in the chat reply and an About/Credits screen | §5.21, §12 |
| exit-interview.json in the exact shape | §5.21, §11.3, §12 |
