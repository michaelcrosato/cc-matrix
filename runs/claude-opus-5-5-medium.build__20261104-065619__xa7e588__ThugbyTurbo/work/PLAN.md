# THUGBY TURBO

*Over-the-top arcade rugby sevens. Big hits, bigger hair, seven a side.*

This is the build plan for the developers (people or AI models) who will make the demo described in `TASK.md`. Read
`TASK.md` first, then this file. Everything the build needs is here or in the engine's handoff package. Every engine API
named below was checked against **my-3D2dge v0.85.2** (`github.com/michaelcrosato/my-3d2dge/tree/main/dist/handoff`) and
the **AI Hub Session Protocol v1, client 1.4.0** (`github.com/michaelcrosato/ai-hub/tree/main/lib/hub`). Where this plan
says "verify", the builder checks the detail in a spike before relying on it.

---

## 0. Read this first

**The core loop, in one sentence (put it at the top of the game's source):**
*Run at their line, pass it backwards, smash through or step round them, ground it over the line and kick the
conversion, while seven lunatics in the other colours try to flatten you, and the referee looks the other way.*

**Where things are:** the game in one page (§2); architecture (§4); controls (§6); every rule and number (§7); content
(§9); build order (§17); risks (§18); tests (§19); the done list (§21).

**Working rules on this machine (from TASK.md):** keep every dev file in the dev subfolder; read no files outside what
the build needs (other agents share the directory, ports and processes); prefer `file://` and the engine's headless
tools; a server (only the AI Hub harness needs one) binds `127.0.0.1` on a port the OS picks, and you confirm the page
is yours before trusting a result; stop only processes you started, by PID (never `pkill`, `killall`, `fuser -k`).

**Hard requirements from TASK.md, and where this plan covers each:**

| TASK.md asks for | Where |
|---|---|
| Title riffing on the source, picked by a real RNG | §1 |
| Genre and perspective that fit the source | §2, §5 |
| A single HTML file, a dev subfolder, the file names | §1, §4.6 |
| Built on the engine's handoff package; changes allowed | §3 |
| Native art style plus new rugby art; native animation plus new rugby animations | §10, §11 |
| All audio written in code; Animalese-style gibberish voices | §12 |
| AI Hub multiplayer, and multiplayer on its own | §15 |
| A feature-complete, polished vertical slice that shows every mechanic | §7, §8, §9 |
| Dev mode from the pause menu, live sliders, reset to defaults | §14 |
| Attract mode after 10 s idle; any input exits | §13 |
| 10-foot, controller-first UI; native keyboard and mouse; glyphs follow the last device; Xbox option | §6, §10.6 |
| Touch-only: "Controller or keyboard required" plus Settings; attract still runs | §6.6 |
| Writing in the source's style | §9.3, §9.5 |
| No TODOs, placeholders or stubs | §21 |
| Source info and feedback in the chat reply and an in-game About/Credits screen; exit-interview.json | §20 |
| Headless tests behind one command; a scripted playthrough of the whole game | §19 |

---

## 1. Title, names and deliverables

**Title: THUGBY TURBO.** Picked as TASK.md says: 50 playful riffs on the word "rugby" were brainstormed silently,
then one was drawn with a real random number generator: Python's `secrets.randbelow(50)` (OS entropy) returned 16,
entry #17 of 50: **"Thugby Turbo"**. Record this in the About screen. Do not re-pick it.

| Thing | Name |
|---|---|
| Title on screen | THUGBY TURBO |
| GameTitle in file names | `ThugbyTurbo` |
| SOURCE in file names | `Rugby` |
| Dev subfolder (in this folder) | `ThugbyTurbo-Rugby-claude-opus-5-5-max-20261103-174828/` |
| The deliverable (in this folder, beside PLAN.md) | `ThugbyTurbo-Rugby-claude-opus-5-5-max-20261103-174828.html` |
| Exit interview (in this folder, beside the HTML) | `exit-interview.json` |
| Page `<title>` | `Thugby Turbo` |
| Settings/save id (`new E.Game({ id })`) | `thugby-turbo` |

The HTML is one self-contained file: the AI Hub session client first in `<head>`, then the engine and the game inlined.
No CDN is needed (the engine has no dependencies); do not add any.

---

## 2. The game in one page

**Genre:** arcade sports, rugby sevens played for laughs and for keeps (NBA Jam's turbo and "on fire", Mutant League's
cartoon violence, Speedball's crowd-thrown power-ups), wrapped in a short story campaign, with couch and online party
multiplayer for 1 to 4 players. Sevens is the real format that suits an arcade game best: seven a side on a full
pitch, short halves, open space, sudden-death extra time, and the scoring team kicks off.

**Perspective:** a TV broadcast camera. The pitch runs left to right across the screen, seen from the stand at a 40°
pitch (a custom engine view, `'broadcast'`), panning with the ball. Heights read well (kicks, lineout jumps, the
posts), and passing across the pitch is up and down the screen. Players can switch to a high 55° camera
(`'threequarter'`) or near-overhead (`'topdown'`). Conversions and penalty kicks cut to a behind-the-kicker camera
(§5.4).

**Tone:** a live Saturday broadcast on CHANNEL THUD. Two commentators (breathless Barry Bellows and bone-dry Ros
Rucker), a whistle-happy, short-sighted referee, a gruff coach with rules for everything, rival captains who trash-talk
in gibberish with subtitles, mud, meat pies, a giant chicken mascot and a sin bin that is an actual bin. Affectionate,
loud, never mean.

**What makes it rugby (all in the demo):** passing only backwards (L1 and R1 pass up and down the line); tackles that
end in rucks; tries you must ground, then a conversion from in line with where you scored; scrums, lineouts, kick-offs,
22 drop-outs, penalties with a choice (tap, kick at goal, kick to touch), drop goals, knock-ons and forward passes,
offside lines, advantage, yellow cards and the sin bin, the hooter that waits for the ball to go dead.

**What makes it over the top (all in the demo):** a turbo button; big hits charged by holding the button that launch
people into orbit; sidesteps, spins, fends and dummies; a team HYPE meter that unlocks supers (THUNDER RUN, HURRICANE
HIT); a player who scores twice running is ON FIRE; fans throw power-ups onto the pitch (meat pie, iron shoulders, mega
boot, grease jersey, air horn); each stadium has a hazard (mud, a chicken pitch invader, flame jets, lightning); the
referee only calls foul play he can see, and he can be flattened ("REF DOWN, ANYTHING GOES!"); instant replays of the
biggest moments; a boss who needs two tacklers.

**Modes:** MEGA CUP (the story: training plus four matches, about 25-35 minutes), EXHIBITION (any two teams, any
stadium, 1-4 local players, versus or co-op), TRAINING GROUND (nine drills, each also a tutorial), RECORDS (arcade
tables with initials), SETTINGS, ABOUT & CREDITS. Online: AI Hub shared-world sessions for 2-4 players (§15.2).

---

## 3. Tech stack and the engine

**Base:** the my-3D2dge handoff package v0.85.2, full engine (`my-3d2dge.js`, 1.2 MB, readable, every module inside).
It is a 2D engine with a 3D world: x east, y south, z up, 16 world units a tile; characters are procedural 3D skeletons
(`E.Humanoid`) drawn as pixel art; `res: 'ps1'` (320x240) with `expand: true` fills any screen (about 427x240 on 16:9).
Canvas 2D and Web Audio only. No other libraries.

**Research done for this plan** (the builder may cite it under Research, adding its own): the handoff package's
`README.md`, `API.md`, `AI_GUIDE.md`, `kits/README.md`, `kits/sports.js`, parts of `kits/brawler.js`, the template
`game/`, `tools/check.mjs`, the headers of `modules/story.js` and `modules/arcade.js`, and the engine source around
settings, the shell, input labels, half keyboards, dialogs and actions; the AI Hub `lib/hub/README.md`, `retrofit.md`,
`session.js` and `examples/arena.html` (the shared-world pattern).

**Read before writing code (in this order):** `API.md` whole; `kits/sports.js` whole (the closest kit: a ball as an
`E.Body`, passes led to the receiver, `E.arc` lobs, formations, a match clock, `allowJoin`, a radio commentator, a
deterministic `run()` proof and a `bot()`); `kits/brawler.js` around its knockdown code (`knock`, `getUp`, launch arcs);
`AI_GUIDE.md` sections Standard features, Frame order, Players, Humanoid, Audio, Shell, Testing without a browser,
Recorded sessions, Sports recipe, Building a big game; `docs/ASSETS.md` before drawing any prop; `modules/story.js` and
`modules/arcade.js` headers. Search `API-INDEX.md` for names; do not read it whole.

**Engine features this game uses:** scenes and `game.go` transitions; `TileMap` (the pitch, stands, boards) with
`floorTex`, `cut` walls, floor tags; `E.Body`; `E.Humanoid` and `rig.drawPortrait`; `E.ACTIONS` / `E.Action` (paired
animations: the tackle is a takedown's cousin); `E.MOVES` and custom attack specs; `E.arc`; `E.sees` and `r.sightCone`
(the referee's eyes); `r.marker` (off-screen arrows); `r.pick` and `game.mouseGround` (mouse in the world);
particles, `game.hitFx`, `freeze`, `shake`, `flash`; canvas lighting; `game.weather`; `game.tween`, `game.script`,
`E.until`; `E.Dialog` (commentary radio, `modal: false`), `E.Story` (cutscenes as data), `E.Menu`; `E.Arcade` (attract
cycle, records with initials, CONTINUE countdown); `game.settings` (own settings), the standard pause, settings and
controls screens (`menu: { items, settings, controls, quit }`); `game.saves`; `game.allowJoin` / `addPlayer` (local
multiplayer); `game.audio` music (named layers), `sting`, `define`, `sfx`; `game.debug`, `game.advance`,
`input.tap/hold/press/feed` (tests); `E.rng`.

**Facts found during research that the build must respect:**
- The pixel font has no `✕ ○ □ △` glyphs: `input.label('x')` returns `'✕'` for a PlayStation pad, which the canvas
  font draws as `?`. Fix in the engine font (patch 1) and draw coloured button badges for prompts anyway (§10.6).
- The standard setting `glyphs` (Controller group) defaults to `'auto'`. TASK.md wants PlayStation by default: override
  it from the game (§6.4). Its `apply` only touches `game.input`; apply it to every player and to joiners.
- `Input.halfKeys` gives two keyboard players fixed button lists (F G H R T Y V B / . / , L ; ' K M) in the order of the
  preset's actions. Our layouts (§6.3) need patch 2.
- `E.Menu` has no font scale; 10-foot menus need patch 3 (or a small BigMenu of our own).
- `E.Dialog` blips one sound every second letter; Animalese needs a per-letter hook (patch 4).
- While `game.paused`, or during hit-stop (`game.freeze`), the scene's `update` does not run (only input ticks); at
  `game.timeScale = 0` it runs with `dt` 0 (so a dev panel can still read input). In an AI Hub shared world nothing may
  stop the host's world: sessions use `pausable: false`, `autoPause: false`, `corner: false`, `menu: { quit: false }`
  and no `game.freeze` (§15.2).
- `E.VIEWS` takes custom views: `E.VIEWS.broadcast = new E.View('broadcast', 'Broadcast', 0, 40, 1, 1)`, then scenes
  name `'broadcast'`. `E.charView` draws rigs from the sprite-like angle at pitch 40 to 89.
- Headless (Node, no DOM) `new E.Game()` skips drawing; `rig.update` still costs time. Keep the simulation free of rig
  state so tests can skip rig updates (§4.4).
- The settings screen lists every settings group except Controls, Controller and Touch, so dev sliders must not be
  `game.settings` items (they would show in Settings); the dev panel is the game's own (§14).

**Engine patches (allowed by TASK.md; keep each small, list them in `engine/PATCHES.md` and the About screen's Engine
Feedback):**

| # | Patch | Why |
|---|---|---|
| 1 | Add `✕ ○ □ △` to the 5x7 font (`G57`) | PlayStation labels render as `?` |
| 2 | `Input.halfKeys(preset, side)` uses `preset.halves[side]` (per-action code lists) when present | two keyboard players need sensible layouts |
| 3 | `E.Menu` option `scale` (font scale, row height, box padding) | 10-foot menus |
| 4 | `E.Dialog` option/field `onLetter(ch, index, text)` called for each letter typed; `voice: null` keeps the default blip off | per-letter babble voices |

Anything else found missing during the build (a bug, a gap) may be patched the same way and listed.

---

## 4. Architecture

### 4.1 Layers and the one rule that makes everything else work

```
 Devices (pad, keys, mouse)   AI brains   Network intents   Test scripts   Attract director
              \                   |              |                |              /
               '----------->  INTENTS (one per on-field player, per step)  <----'
                                          |
                                   MATCH SIMULATION  (rules, physics, contact, set pieces, AI-free)
                                          |
                                 MATCH STATE (plain, serialisable)  ---> replay ring buffer
                                          |                         ---> network snapshots (host)
                                   PRESENTATION  (rigs, camera, HUD, FX, audio, commentary)
```

**The rule: the simulation reads only intents and writes only `MatchState`; presentation reads only `MatchState` and
events.** Then the same presentation draws a live match, an instant replay (recorded states), an online client
(interpolated snapshots) and the attract demo; the same simulation runs headless for tests, as the host of an online
match, and for the AI Hub "server" seat with nothing drawn.

### 4.2 Source layout (the dev subfolder)

```
ThugbyTurbo-Rugby-claude-opus-5-5-max-20261103-174828/
  engine/my-3d2dge.js        handoff engine v0.85.2 + patches (engine/PATCHES.md lists them)
  vendor/aihub-session.js    lib/hub/session.js 1.4.0, byte-for-byte unmodified
  src/                       the game, concatenated in file-name order into one IIFE by build.mjs
    00-core.js        TT namespace, constants, TUNE registry, RNG, event bus, helpers, config flags
    01-data-teams.js  teams, kits, rosters, AI styles
    02-data-venues.js stadiums, weather, hazards, crowd, boards, skylines
    03-data-content.js power-ups, commentary lines, story nodes, drills, records, credits text
    10-pitch.js       pitch geometry, TileMap, line texture, posts, stands, boards, sin bin
    11-ball.js        ball states, flight, oval bounce, out of play
    12-players.js     player entities, stats, movement, turbo, states, control assignment
    13-anim.js        custom E.ACTIONS, attack specs, rig post-processing (carry, dive...), anim-state codes
    14-laws.js        forward pass, knock-on, offside lines, touch, scoring, fouls, advantage, cards
    15-match.js       match state machine: phases, clock, halves, hooter, restarts, sudden death, stats
    16-contact.js     tackles, big hits, dive and gang tackles, fends, sidesteps, cheap shots, interceptions
    17-setpieces.js   ruck, scrum, lineout, kick-off, 22 drop-out, set kicks, penalty choice
    18-ai.js          team shape, carrier decisions, defence, set-piece AI, difficulty, referee AI
    19-arcade.js      hype, supers, ON FIRE, power-ups, venue hazards, ref down
    20-intent.js      Intent type, device → intent, mouse picking, auto-switch, controller seats
    30-render.js      pitch and stadium drawing, actors, ball, crowd, lights, weather, FX
    31-hud.js         score bug, meters, player cards, prompts and glyph badges, radar, banners, markers
    32-voice.js       commentary director, babble synth, referee calls
    33-audio.js       songs (layers), SFX definitions, crowd bed
    34-replay.js      state ring buffer, replay playback
    40-ui.js          BigMenu helpers, cards, letterbox, 10-foot widgets, CSS for the HTML shell
    41-scenes-front.js  title, main menu, attract wiring, touch-only screen, about, records
    42-scenes-modes.js  cup hub, story scene, join, exhibition setup, training selector, results, credits
    43-scene-match.js   the match scene (live, drill, attract, session variants)
    50-dev.js         dev panel, tuning sliders, cheats, events, debug overlays, hotkeys
    60-net.js         AI Hub session: connect, card, host, client, snapshots, intents, reporting
    90-start.js       new E.Game, settings, boot steps, game.start, game.debug, window.__thugby
  page.html          the page template (head: session client, hub metas; body: boot splash, canvas)
  build.mjs          builds build/game.js and the final single HTML in the parent folder
  test/run.mjs       the one test command (§19)
  test/lib/*.mjs     vm loader, fake AIHub network, helpers
  test/*.test.mjs    suites
  test/browser.mjs   Playwright checks (opt-in flag)
  test/hub.mjs       AI Hub harness runs (opt-in flag)
  tools/             copies of the handoff tools (check.mjs, filmstrip.mjs, replay.mjs, asset-*.mjs) + package.json
  hub/               harness.html, bridge.js, round.js from ai-hub lib/hub (local testing only)
  docs/DATA.md       data formats for designers (teams, venues, power-ups, drills, story, commentary, TUNE)
```

### 4.3 Core objects

- **`TT`**: one namespace object inside the IIFE holding every module's exports (`TT.Match`, `TT.TUNE`, ...).
  `window.__thugby = { game, TT }` for tests and tools.
- **`TUNE`**: the balance registry. Each entry `{ key, label, group, value, min, max, step, unit }` (table in §14.2).
  Simulation code reads `TUNE.v.runSpeed` (the live value), never a literal. `TUNE.reset(key?)`, `TUNE.set(key, v)`
  (clamped), `TUNE.defaults()`. Difficulty and cheats are layers over it (`TUNE.layer('difficulty', {...})`), so
  "reset to defaults" restores the base values and keeps the chosen difficulty.
- **RNG**: `TT.rng = E.rng(seed)` per match (one stream for the simulation; a second, `TT.fxRng`, for cosmetic
  choices). Simulation code never calls `Math.random`. Seeds: a fresh one per match standalone; fixed in tests; from
  `AIHub.rng('match')` online.
- **Event bus**: `TT.bus.on(name, fn)`, `TT.bus.emit(name, data)`. The simulation emits; commentary, audio, hype, stats,
  replays, banners, rumble, records and the attract director listen. Events (with data): `kickoff, pass, catch,
  dummy, offload, knockOn, forwardPass, interception, tackle, brokenTackle, bigHit, monsterHit, missedTackle,
  diveTackle, gangHold, fend, sidestep, spin, lineBreak, ruck, ruckWon, jackal, useIt, turnover, scrum, scrumEngage,
  scrumWon, pushoverTry, lineout, lineoutWon, notStraight, kick, kickCaught, touch, deadBall, dropOut, try,
  conversion, penaltyGoal, dropGoal, foul, advantage, advantageOver, penalty, choice, tapGo, freeKick, card, sinBinIn,
  sinBinOut, penaltyTry, superStart, superEnd, onFire, fireOut, powerupThrow, powerupTake, powerupEnd, hazardWarn,
  hazard, refDown, refUp, hooter, halftime, fulltime, suddenDeath, replayStart, replayEnd`.
- **`MatchState`** (plain object, serialisable; the whole truth of a match): `{ t, seed, phase, sub, phaseT, half,
  clock, hooter, suddenDeath, score:[h,a], hype:[h,a], dir:[+1,-1], possession, lastTouch, advantage, ball, players[14],
  ref, powerups[], hazards[], setpiece, cards[], stats, events[] }`. A player record: `{ id, team, role, x, y, z, vx,
  vy, facing, st, stT, turbo, stun, flags, ctl, anim }` where `anim` is the compact rig-drive record (§11.1).
- **`Intent`** (what one on-field player wants this step): `{ move:[x,y] (ground direction, length ≤ 1), turbo,
  press:{ x, sq, ci, tri, l1, r1 }, held:{ x, sq, ci, l1, r1 }, released:{ x, ci, l1, r1 }, aim:[x,y]|null (a ground
  point: mouse or stick target), click:{ id }|null (a teammate clicked), t (time stamp for timing mini-games) }`.
  Buttons are named by the pad's face (`x` = ✕ / A, `sq` = □ / X, `ci` = ○ / B, `tri` = △ / Y) because their meaning
  depends on context (§6.1).
- **Controller seats**: `TT.seats = [{ kind: 'local' | 'remote' | 'script', input, team, playerId, color, name }]`.
  Each step `TT.control.assign()` (auto-switch, §7.2) decides which on-field player each seat drives; every other player
  gets an AI intent.

### 4.4 Fixed step, determinism and speed

- The engine runs `update(dt)` at exactly 120 steps per second. The match simulation steps once per update with that
  `dt` (times `TUNE.v.gameSpeed`). Nothing in the simulation reads wall-clock time.
- Same seed + same intents = same match (the kit-style proof, §19.3, hashes it). Timers are counted in seconds of
  match time, not frames.
- Presentation work (rig updates, particles, camera) happens in the scene's update after the simulation step, guarded by
  `TT.cfg.present` (true in the browser, false by default headless) so a full headless match runs in about a second.
  Tests that check animation state turn it on.

### 4.5 `game.debug`

```js
game.debug = {
  snapshot() { return { scene, phase, sub, half, clock, score, hype, possession, ball: {x,y,z,state,holder},
    players: [...{ id, team, role, x, y, z, st, ctl }], ref: { x, y, facing, down }, setpiece, cards, powerups,
    hazards, lastEvents, cup: { round, results }, attract, dev: { open }, session, replay } },
  teleport(id, x, y), give(id), force(name, opts),   // force: every dev EVENT (§14.4); the attract director uses it too
  tune(key, value), seed(n), step(seconds), drill(id), go(scene, data)
};
```

### 4.6 Build and bundle

`node build.mjs`:
1. Concatenates `src/*.js` in name order inside `(() => { 'use strict'; const E = My3D2dge; ... })();` into
   `build/game.js` (with `/* ==== file ==== */` separators).
2. Writes the final HTML to `../ThugbyTurbo-Rugby-claude-opus-5-5-max-20261103-174828.html` from `page.html`:
   `<!doctype html>`, `<meta charset="utf-8">`, then **the session client inline as the first script in `<head>`**
   (unmodified, its `/*! aihub-session 1.4.0` banner intact), then the viewport meta, the hub tags (§15.2), the
   catalogue tags (`hub:type` Game, `hub:players` 1-4), `<title>Thugby Turbo</title>`, styles (full-screen canvas, the
   10-foot CSS for the HTML shell, §10.6), then in `<body>`: `E.bootSplash('THUGBY TURBO')` markup, the canvas, the
   engine inline, the game inline.
3. Escapes any `</script` inside inlined code (`<\/script`).
4. Prints the output size.

`page.html` is also the dev page: open it with `?dev=src` to load the files separately for debugging. Never edit the
final HTML by hand.

---

## 5. The pitch, the stadium and the camera

### 5.1 Geometry (world units; 16 = one tile; display metres = units / 10.24, so the field is "100 m")

| Feature | Value |
|---|---|
| Field of play (try line to try line) | 1024 (64 tiles): `X0` to `X1`, halfway `CX` |
| In-goal depth | 96 each end; dead-ball lines at `X0 - 96`, `X1 + 96` |
| Width (touchline to touchline) | 576 (36 tiles): `Y0` to `Y1`, centre `CY` |
| Apron (grass beyond touch and dead-ball lines) | 48 |
| 22 m lines | `X0 + 225`, `X1 - 225` |
| 10 m lines (dashed) | `CX ± 102` |
| 5 m lines (dashed, parallel to the try lines) | `X0 + 51`, `X1 - 51` |
| 5 m and 15 m lines (dashed, parallel to touch) | `Y0 + 51`, `Y0 + 154`, `Y1 - 154`, `Y1 - 51` |
| Goalposts | on each try line at `CY ± 29`; crossbar z 34; uprights to z 120; padding z 0-20 in the home colours |
| Corner flags | the four corners of the field and of each in-goal |
| Sin bin | a green dumpster stencilled SIN BIN, south of the halfway line on the apron (`CX + 60, Y1 + 30`) |

The TileMap is about 90 x 50 cells (no chunking needed): the field and in-goals are floor (`'grass'`, `'ingoal'`,
`'apron'`, `'mud'` tags); the **north side** (far side, top of the screen) has a stand of three tiers (`h` 34, 44, 54,
`face: 'stone'` or `'plank'` by venue) with the crowd on it; **both ends** have two-tier stands behind the dead-ball
lines; the **south side** (near side, bottom of the screen) has only advertising boards (`h` 14, `cut: true, cutH: 4`,
so they drop low when they would hide play) and the dugouts. Bodies are stopped by stand walls; the ball is not stopped
by anything except the ground (out of play is a rule, not a wall).

### 5.2 Pitch drawing

`floorTex(x, y, tag)` like the sports kit's: mown stripes 32 wide alternating along x; grain from `E.hash2`; worn
lines (white, 2 px; dashed lines 16 on, 16 off); in-goal areas a slightly different green with the home crest painted
large (a 96x96 stencil from a string sprite, at 60% strength); `mud` patches brown with puddle highlights (venue 1);
scorch marks are decals (lightning, flame jets). Venue colours tint the grass (`E.tones`).

### 5.3 Camera

- Default view `'broadcast'` (yaw 0, pitch 40). `views: ['broadcast', 'threequarter', 'topdown']`; R3, V or Settings,
  Camera cycles them. Camera zoom: the scene's `camera: { zoom: [.7, 1.4], start: .9 }`.
- Focus each update: the ball (or its carrier) plus 40 units of lead in the attacking direction, y pulled 25% toward
  `CY` so both sides of the line show; `cam.smooth = .22`; `cam.bounds` to the stadium.
- A kick in the air longer than 60 units: `cam.frame([ball, landing], { margin: 40, zoom: [.7, 1] })` until caught or
  bounced; then back to follow.
- Set pieces: focus on the mark at zoom 1.15 (scrum, lineout), 1.0 (ruck: stays on follow).
- Replays: zoom 1.35 on the key actor, letterbox bars, 0.5x.
- Controlled players and the ball carrier draw with `xray: { actors: true }` so they stay findable in a crowd.

### 5.4 Behind-the-kicker camera (conversions and penalty goals)

A second custom view: `E.VIEWS.posts = new E.View('posts', 'Kicker', yaw, 22, 1, 1)` with yaw chosen so the target
posts are straight up the screen (90 or 270 depending on which end: **verify the sign in the M3 spike** by rendering
the posts and checking the crossbar is level and far). The TileMap re-bakes per view the first time (one boot step:
"Painting the posts"). Fallback if it looks wrong: stay in `'broadcast'` and show an inset aim gauge.

---

## 6. Controls (10-foot, controller-first)

### 6.1 Gamepad (any pad in the browser's standard mapping; PlayStation glyphs by default, Xbox in brackets)

| Button | With the ball | Without the ball | In menus |
|---|---|---|---|
| Left stick / D-pad | run; aims kicks | run | move the focus |
| R2 [RT] (held) | TURBO | TURBO | |
| L1 [LB] | pass up the screen (tap: short; hold: long, skips a man); in a tackle: offload | switch to the teammate above you on the line | previous tab |
| R1 [RB] | pass down the screen (as L1); in a tackle: offload | switch to the teammate below you | next tab |
| ✕ [A] | sidestep (stick side; tap twice: spin); in the in-goal: dive to ground it | tackle (tap); hold and let go in range: BIG HIT | confirm |
| □ [X] | fend (hand-off) | dive tackle | reset a slider (dev) |
| ○ [B] | kick: tap = grubber; hold = punt (power meter, stick aims, stick pulled back at release = bomb); in the opponents' 22, hold = drop goal | switch to the player nearest the ball | back |
| △ [Y] | SUPER: Thunder Run (Hype full) | SUPER: Hurricane Hit (Hype full) | context action (hub card: more time) |
| Options [Menu] | pause | pause | |
| R3 | camera view | camera view | |
| Set pieces | ✕ times and mashes; L1/R1 alternate to push (scrum) and pick a pod (lineout); ○ powers set kicks | | |

Pass **"up"** means toward the far touchline (top of the screen), **"down"** toward the near one, whichever way the team
attacks. Floating glyph tags over the two receivers say which button reaches whom (§10.5), so nobody has to think about
it. Options is ignored while Create is held (the AI Hub's corner bar).

### 6.2 Keyboard and mouse (the same game; PC keys)

| Key / mouse | With the ball | Without the ball | In menus |
|---|---|---|---|
| W A S D (or arrows) | run | run | move the focus |
| Shift (held) | turbo | turbo | |
| Q / E | pass up / down (hold: long); offload | switch up / down the line | tabs |
| Space | sidestep (double-tap: spin); dive in the in-goal | tackle; hold → BIG HIT | confirm (Enter too) |
| F | fend | dive tackle | |
| C | kick (tap / hold; drop goal in their 22) | switch to the player nearest the ball | |
| R | super | super | |
| Esc / P | pause | pause | back |
| Mouse move | hovering a teammate highlights him and shows whether a pass to him is legal (green) or forward (red) | hovering a teammate highlights him | hover moves the focus |
| Left click | pass to the hovered teammate | take control of the hovered teammate | pick |
| Right button (hold, let go) | kick toward the cursor: a landing ring follows the mouse, the meter fills toward it | | |
| Wheel / - = | camera zoom (engine) | | scroll |
| V | camera view | | |
| ` (backquote) | dev panel, once Dev Mode is on (§14) | | |
| Set pieces | Space times and mashes; Q/E alternate (scrum) or pick a pod (also W/S, or click a pod); set kicks: the mouse aims, hold the left button for power | | |

The mouse is native, not a stand-in: clicking a teammate passes or switches, the cursor aims kicks, hover focuses every
menu and card, clicking a lineout pod picks it, and set kicks aim and power with the mouse.

### 6.3 Presets and two players on one keyboard

One preset object `KEYS`, built as the sports kit builds its own: start from `E.Input.DEFAULT` (its moves and its menu
actions `start pause confirm cancel`), delete `attack dash skill jump`, add `x, sq, ci, tri, l1, r1, turbo` with the
codes in the tables above (pad codes: `Pad0` ✕, `Pad1` ○, `Pad2` □, `Pad3` △, `Pad4` L1, `Pad5` R1, `Pad7` R2,
`Pad9` Options, `Pad11` R3; L2 is left free). Use it on every play scene (`input: KEYS`). `KEYS.halves` (patch 2):

| Half | Move | Turbo | ✕ | □ | ○ | △ | L1 | R1 | Start / pause |
|---|---|---|---|---|---|---|---|---|---|
| left (P1) | WASD | LeftShift | Space | F | C | R | Q | E | 1 / Esc |
| right (P2) | arrows | Comma, Numpad0 | Period, Numpad1 | Slash, Numpad2 | Semicolon, Numpad3 | Quote, Numpad6 | KeyK, Numpad4 | KeyL, Numpad5 | 2, Enter / Backspace |

`menu: { controls: { x: 'Sidestep / Tackle', sq: 'Fend / Dive tackle', ci: 'Kick / Switch to ball', tri: 'Super',
l1: 'Pass up / Switch up', r1: 'Pass down / Switch down', turbo: 'Turbo' } }` names them on the Controls screen; every
one is rebindable there.

### 6.4 Prompts and glyphs follow the last device

- Every prompt is built from actions, never literal keys: `TT.glyph(g, action, x, y, input)` draws a badge for the
  device in `input.lastDevice` (`'gamepad'` → a pad badge in the chosen family; `'keyboard'` → a keycap with
  `input.codeLabel(code)`; `'mouse'` → a mouse icon with the button lit when the action has a mouse binding, else the
  keycap). Text prompts use markup `"{b:x} TACKLE  {b:ci} SWITCH"` parsed by `TT.prompt()`.
- Override the standard `glyphs` setting from the game: `{ key: 'glyphs', group: 'Display', label: 'Controller
  buttons', type: 'select', value: 'playstation', options: [['playstation', 'PlayStation ✕ ○ □ △'], ['xbox', 'Xbox A B X
  Y']], apply: (g, v) => g.players.forEach(p => p.glyphs = v) }`, and set `input.glyphs` on each joiner. It then shows
  in Settings, Display (the settings screen), where TASK.md wants it.
- Badges: PlayStation ✕ blue `#6a9cf0`, ○ red `#f05a64`, □ pink `#e07ac8`, △ green `#4ad0a0` on a dark disc; L1/R1/R2
  as rounded pills. Xbox A green `#5ac85a`, B red `#e8503a`, X blue `#3a86e8`, Y yellow `#f0c830`; LB/RB/RT pills.
  Keycaps light grey with a dark shadow, wide for Space and Shift. All string sprites designed at 9-11 px, drawn at
  scale 1 in the HUD (scale 2 on big prompts).

### 6.5 Assists

Settings, Game: **Auto-switch** (Assisted: to the defender nearest the ball each time the ball is passed or kicked, and
on ✕ when no one is in range; Full: always the best defender; Manual: only by buttons and mouse). **Pass assist** (On:
a pass button with no legal receiver on that side throws to the nearest legal one on the other side; Off: it is a
dummy, §7.4). **Hold or toggle** turbo.

### 6.6 Touch-only devices

- Detect: `matchMedia('(any-pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches` and no gamepad
  has been seen and no key pressed. Re-check on `gamepadconnected`, `keydown` and `pointermove` with a mouse: any of
  them leaves touch-only mode at once.
- In touch-only mode: no touch buttons or stick anywhere (`game.input.touchEnabled = false`, every scene `touch: []`);
  the title shows **CONTROLLER OR KEYBOARD REQUIRED** (scale 2) with "Connect a controller or a keyboard to play." and a
  big **SETTINGS** button (tap → `game.menu('settings')`); the attract mode still starts after 10 s; a tap during it
  goes back to the title.

---

## 7. Match systems (rules and numbers)

All numbers are `TUNE` defaults (§14.2). "u" = world units.

### 7.1 Match flow and clock

Phases (`state.phase`), each with a watchdog (any phase longer than its limit resolves itself and emits a `watchdog`
event that tests fail on):

```
intro → kickoff → play ⇄ (tackle → ruck → play)
                       ⇄ (knockOn | forwardPass → scrum → play)
                       ⇄ (touch → lineout → play)
                       ⇄ (foul → [advantage] → penalty → choice → setKick | tapGo | kickToTouch→lineout)
                       ⇄ (deadBall → dropOut → play)
          → try → celebrate [→ replay] → conversion → kickoff (the scoring team kicks off)
          → dropGoal | penaltyGoal → kickoff
hooter → (next stoppage) → halftime → kickoff (2nd half, other team) → hooter → fulltime | suddenDeath → results
```

- Halves: `halfLength` = 120 s of **running** clock (stops at stoppages: set-piece setups, conversions, penalties,
  celebrations, replays, cutscenes). The TV clock shows sevens time, 0:00 to 7:00 per half (`shown = run × 420 /
  halfLength`). Settings: 2 / 3 / 4 / 5 minute halves (120 / 180 / 240 / 300 s).
- At zero: the HOOTER sounds; the half ends at the next stoppage (ball dead, a score, a tackle completed, a set piece
  awarded), so the last play is live. If open play runs 30 s past the hooter, the next tackle ends it.
- Kick-offs: the first half by the home team; the second by the away team; after any score, by the team that scored.
- Level at full time in the cup or with "Sudden death" on: SUDDEN DEATH extra time, the first score of any kind wins
  ("GOLDEN POINT"); if 120 s pass with no score in Exhibition, it's a draw; in the cup it goes on.
- Halftime: a 6-8 s dressing-room overlay (the coach's line in the cup, the stats in Exhibition); ends on ✕.

### 7.2 Players, movement, turbo and control

- **Roles** (sevens): PROP (loosehead), HOOKER, PROP (tighthead): the forwards; SCRUM-HALF, FLY-HALF, CENTRE, WING: the
  backs. The scrum-half takes the ball from rucks and scrums; the fly-half takes kick-offs and set kicks; the hooker
  throws lineouts; forwards form scrums and lineouts.
- **Stats** 1-10: SPD, POW, HND (hands), KCK, TKL. Derived: top speed `runSpeed × (0.8 + 0.04 × SPD)`; acceleration
  `accel × (1.15 - 0.03 × POW)`; turning at 10 rad/s (8 with the ball).
- **Movement:** an `E.Body` (`r` 5, `friction` 0, `gravity` 700) per player; velocity approaches `intent.move × speed`
  at the acceleration; carrying the ball costs 4% speed; mud costs 20% (§7.18).
- **Turbo:** held, it multiplies speed by `turboMult` (1.45) and drains a 3.0 s tank; it refills at 0.3 tank per second
  after 0.6 s of not using it. Turbo also adds 10% to tackle and fend strength and, with the ball, 5% to the chance a
  tackle breaks. Empty: it sputters (no effect, a puff sound).
- **States** (`st`): `idle, run, carry, pass, kick, sidestep, spin, fend, charge, tackling, diving, tackled, ground,
  getUp, stunned, ruck, scrum, lineout, lift, celebrate, binned, sentOff, walkout`. Each has its own timer `stT`. Only
  `idle/run/carry/charge` accept movement intents.
- **Control and switching:** each human seat drives one player of its team.
  - The team gains the ball: the seat takes the carrier (if two humans share a team, the one whose player is nearer).
  - Defending: Assisted auto-switch (§6.5); L1/R1 move control to the next teammate up/down the screen; ○ to the one
    nearest the ball; a mouse click on a teammate. Never onto a player held by another seat, in the sin bin, or on the
    ground.
  - Controlled players show a ring under their feet and a chevron with the seat label (P1-P4, or the hub name) in the
    seat colour.

### 7.3 The ball

- States: `held` (carried; drawn at the carry hand), `pass` and `kick` (in flight), `loose` (rolling or bouncing),
  `dead` (stoppage), `placed` (in a ruck, on the tee, at the scrum feed).
- Physics: an `E.Body` (`r` 3, `gravity` 600, `bounce` 0.45) updated with the map, so it bounces off the stands'
  walls as the sports kit's ball does off its boards (on the field there are no walls: out of play is decided by the
  lines, below); air drag 0.3/s; rolling friction 1.4/s; wind (§7.18) pushes it while airborne.
- **The oval bounce** (the soul of loose-ball chaos): on each ground contact with vertical speed above 30, rotate its
  ground velocity by `±U(0, 70°) × bounceChaos` and scale its rebound height by `U(0.3, 1.25)`; a grubber bounces
  higher at random ("sat up nicely"); all from `TT.rng`. Spin (end over end for kicks, spiral for passes) is drawn from
  `ball.rot`.
- Out of play: the ball's centre crossing a touchline (or the carrier's feet touching one) is **touch** → lineout to the
  team that did not touch it last, at the x where it crossed (moved 51 u from the try lines). Crossing a dead-ball line
  or touch-in-goal: if the attackers put it there → **22 drop-out** to the defenders; if the defenders did and it was
  not a kick from in-goal → 5 m scrum to the attackers.
- Pick-up: a loose ball below z 9 within 9 u of a player whose state accepts it (and 4.5 u if it moves faster than
  210) is gathered; at full sprint 15% are fumbled forward (a knock-on) unless HND ≥ 8.

### 7.4 Passing

- **Who receives:** legal receivers are teammates not in front of the passer (`(rx - px) × dir ≤ 4`), within 220 u,
  standing and not binned. L1 picks among those above the passer (smaller y), R1 among those below. Tap: the nearest by
  `|dy|` within 110 u (short pass). Hold more than 0.25 s: the second-nearest on that side, or the nearest if he is the
  only one (long pass, 300 u/s).
- **Flight:** aim at the receiver's lead point `rx + rvx × t × 0.9` (t from distance / speed), launched with
  `E.arc(..., { apex: 6 })` for short, `apex: 10` long; 230 u/s short.
- **Catch:** in the receiver's 10 u reach and below z 30: chance = `catchBase × (0.9 + 0.01 × HND)`, minus 0.06 for a
  long pass, minus `pressurePenalty` (0.12) with a defender within 20 u, minus 0.06 in rain; Grease Jersey and Iron
  Shoulders do not change it; a pass from or to a player ON FIRE is always caught. A miss either drops forward
  (knock-on) or spills loose (50/50 by the ball's direction).
- **Forward pass:** judged as the law does, relative to the passer: if `(ball velocity - passer velocity) · dir > 4
  u/s` at release, it is forward. The referee always calls it (whistle when caught or grounded): scrum to the other
  team. Only a mouse click on a man in front (or no assist) can throw one; the hover shows it red first.
- **Dummy:** a pass button with no legal receiver on that side (and pass assist off, or nobody anywhere) is a dummy:
  the carrier sells it; each defender within 40 u with eyes on the carrier "buys it" with 40% (turns toward the fake
  receiver for 0.3 s); +4 hype per defender sold.
- **Offload:** within the first 0.15 s of being tackled (not a big hit), L1/R1 pops a short pass to a legal receiver
  within 50 u; catch chance -0.1; +6 hype.
- **Interception:** a pass that flies within 10 u of an opponent below z 24 can be taken: the CPU tries with
  `0.15 × interceptMult`; a human holding ✕ near the lane (within 12 u) tries with 0.45. Success: the ball and +12 hype,
  and usually a long run.

### 7.5 Running moves

- **Sidestep (✕ with the ball):** an impulse of `sidestepPower` (140 u/s) perpendicular to the run toward the stick's
  side (no stick: away from the nearest defender), for `sidestepEvade` (0.25 s) any tackle attempt whiffs; cooldown
  0.6 s. A whiffed tackler stumbles (0.5 s). +6 hype when it beats a committed tackler.
- **Spin (✕ twice within 0.25 s):** 0.4 s evade, a full 360° body spin, 15% speed loss after; beats big hits too.
- **Fend (□ with the ball):** opens a 0.3 s `fendWindow` (the stiff arm out). A standard tackle arriving inside it
  fails with `fendBeat` (0.7) + 0.03 × (carrier POW - tackler TKL); a big hit fails with half that. A beaten tackler
  is shoved back 20 u and sits down (0.8 s). Cooldown 0.8 s. +6 hype.
- **Line break:** the carrier gets past the defensive line (every opponent but at most one, the deep sweeper, is now
  behind him, nearer his own try line): banner "LINE BREAK!", +8 hype, support runners turbo.
- **Grounding a try:** in the in-goal, ✕ dives and grounds (with style: +3 hype); otherwise the ball is grounded by
  itself after 2.5 s in the in-goal, when within 16 u of the dead-ball line, or when tackled there (always a try,
  arcade law). Running toward the posts before grounding makes the conversion easier: a real decision with the clock
  and the chasers.

### 7.6 Kicking

- **Grubber (tap ○):** along the ground 140-200 u ahead (stick aims within ±45°), `vz` 40, extra bounce chaos.
- **Punt (hold ○, release):** the meter fills in 0.9 s; while it fills the carrier runs straight on and the stick only
  aims. Distance `lerp(120, kickMax (520), power) × (0.75 + 0.03 × KCK)`; apex 60-110; aimed by the stick (forward
  cone ±70°; no stick: straight). Over 0.9 of the meter is the "sweet spot": +8% distance and true flight; outside, a
  random hook of up to ±(11 - KCK)°.
- **Bomb / up-and-under (punt with the stick pulled back at release):** apex 150, distance × 0.5; it hangs, and chasers
  can contest the catch (§7.11).
- **Kick to touch:** any punt aimed across a touchline goes out where it crosses: lineout to the other team (or to the
  kicking team from a penalty, §7.12).
- **Drop goal (hold ○ inside the opponents' 22, or within 300 u of their posts and facing them):** aimed at the posts
  (the stick nudges it ±8°); power and accuracy as a punt; good if it passes between the uprights above the crossbar:
  3 points. In that zone the stick pulled back at release still gives a bomb, and the stick pushed toward a touchline
  a cross-field punt; otherwise a held kick is the drop goal (the prompt says so: "{b:ci} HOLD: DROP GOAL").
- **Mouse:** right button hold and release kicks toward the cursor; the landing ring is drawn where it will come down at
  the current fill; the kind follows the same rules (in their 22 facing the posts: a drop goal).
- A landing marker (a pulsing ring decal) shows where every kick will come down, for both teams.

### 7.7 Tackling

- **Tackle (tap ✕ without the ball):** reaches 14 u (`tackleRange`) in front (within ±70° of facing). Chance =
  `tackleBase (0.78) × (0.9 + 0.02 × TKL - 0.02 × carrier POW)`, plus 0.1 from the side or behind, plus the
  difficulty bonus, minus 0.05 if the carrier is on turbo. Success: the paired `tackle` action (§11.2), then a ruck. Failure: "broken
  tackle": the tackler falls (0.6 s), the carrier staggers 0.4 s and goes on (+5 hype to the attack).
- **Big hit (hold ✕, let go in range):** charging takes `bigHitCharge` (0.7 s) to full; the charger moves at 1.15x and
  glows. Let go within 18 u: chance `0.7 + 0.2 × charge`. Full charge = **MONSTER HIT**: the carrier is launched
  (`bigHitLaunch`: 30-60 u back, z 20-40, a full flip), lands heavily and slides; the ball pops loose with
  `spillChance` (0.5), forward = knock-on; hit-stop 0.12 s, flash, shake 6, rumble, the crowd "OOOOH", a replay. Held
  past 1.2 s the charge goes red: a frontal hit then is a **high shot** (a foul, a yellow card if seen). A missed big
  hit sprawls the hitter for 1.0 s.
- **Dive tackle (□ without the ball):** a 0.35 s lunge of 30 u (`diveRange`); contact trips the carrier (an ankle tap:
  he falls forward, a tackle); a miss leaves the diver down for 1.2 s.
- **Gang tackle:** players with `immovable` (the boss, BIG UNIT; anyone in THUNDER RUN is simply unstoppable) are only
  "held" by the first successful tackle (they slow to 40% and drag the tackler); a second tackle within 1.0 s brings
  them down; otherwise they shrug it off after 1.2 s and the tackler is flung aside.
- **Cheap shot:** ✕ on an opponent without the ball (within 14 u) is a shoulder barge: the victim is flattened for
  1.6 s. It is a foul only if the referee sees it (§7.13). Unseen: +8 hype and Barry: "The ref's missed that completely!"
- **Collisions:** launched bodies hitting other players knock them down (1.0 s); hitting the referee is REF DOWN.

### 7.8 The breakdown: ruck, jackal, "use it"

- After a successful tackle the carrier goes to ground and places the ball behind him (toward his team). The ruck
  mark is the ball. The nearest two attackers and one or two defenders within 80 u commit (CPU); a human joins by
  running into the 16 u ruck zone (his player then locks into the ruck pose).
- **The contest** (`ruckTime`, 1.6 s): a tug-of-war bar from -1 (defence) to +1 (attack), starting at +0.2 + 0.1 ×
  (attackers - defenders committed). Each second each side adds 0.02 × the POW of its committed players. Mashing: a
  side with a human seat (its controlled player committed, or the tackled carrier) is driven by that seat's presses of
  ✕, each worth `mashWeight` (0.05), several humans adding up; a side with no human presses at `cpuMash` per second (±
  20%). Worked example, two attackers (POW 8 + 6) against one defender (POW 8): the commitment adds +0.12 a second, so a
  human who does not mash against a CPU at 9 presses a second ends at 0.3 + (0.12 - 0.45) × 1.6 = -0.23 (turnover); one
  mashing at 12 against a CPU at 6 ends at +0.97.
- **Jackal:** the first defender to reach the ball, if he arrives before any attacker and within 0.35 s of the tackle,
  may press □ to jackal: the bar swings -0.5 at once ("JACKAL!"). Pressing □ while not first is **hands in the ruck**: a
  foul if seen.
- **Result:** bar ≥ 0: the attacking scrum-half (or the nearest attacker) has the ball at the base; < 0: turnover, the
  defence picks it up and play goes on the other way. The attack's human seat switches to the receiver.
- **"USE IT!":** once the ball is at the base, the referee wants it out within 3 s (a countdown ring around the ball);
  if not, a scrum to the other team.
- **Offside line:** while a ruck is on, each team's offside line is its hindmost committed player's feet; a non-ruck
  player in front of his line who moves toward the ball when it comes out is offside (§7.13). The AI retreats; the HUD
  draws the line.

### 7.9 Scrum

- Awarded for a knock-on, a forward pass, an unplayable ruck ("use it"), not straight, the 5 m restarts. The mark: at
  least 51 u from touch and from the try lines. The non-offending team feeds.
- **Setup** (1.5 s): the three forwards each side bind (props either side of the hooker), scrum-halves at the side,
  backs line up 51 u behind the last feet.
- **Engage:** the referee calls **CROUCH** (0.6 s), **BIND** (0.6 s), **SET!** A ring closes on SET: ✕ within ±0.12 s
  = PERFECT (+0.25 on the push bar), ±0.25 s = GOOD (+0.1), later = nothing. Pressing before SET appears = **early
  engagement**: a free kick to the other team.
- **Push** (2.0 s): alternate L1 / R1 (Q / E): each alternating press adds `scrumPushWeight` (0.05); repeating a button
  counts half. The feeding team starts +0.15; each side adds 0.01 per second per POW point of its three forwards. CPU
  presses at its difficulty's rate.
- **Result:** the side with the bar on its side wins the ball at the scrum-half. Bar beyond 0.85: the losing scrum
  collapses (SCRUM PENALTY to the winners); if that winner is attacking within 50 u of the try line: **PUSHOVER TRY!**
  (5 points, grounded at the scrum's y, so converted from in line with it).

### 7.10 Lineout

- After touch. The line: three pods (FRONT, MIDDLE, BACK) 16 u apart from 51 u in from touch; each team's three
  forwards stand in their line, the throwing team's hooker throws.
- **Call** (up to 2.5 s): each side picks a pod: L1/R1 or up/down (or click a pod). The throwing team's call is shown
  only to its own players when the opponent is human on another device; on a shared screen, both are shown (honest
  couch play).
- **Throw:** ✕ stops a moving needle; in the green band = a good throw, in the edges = a wobbly one, outside = **NOT
  STRAIGHT** (scrum to the other team).
- **Jump:** the throwing team's jumper is lifted at its pod (lifters hoist him to z 60: "INTO ORBIT!"). If the defenders
  chose another pod, the throwers win it. If they chose the same pod, their jumper contests: attack score = 0.6 ×
  throw quality (0-1, from the needle) + 0.04 × jumper HND + 0.15; defence score = 0.6 × timing (1 - |press - arrival|
  / 0.3, clamped 0-1, from ✕ pressed as the ball arrives) + 0.04 × jumper HND; the higher score takes it ("STOLEN!").
  The winner taps it down to his scrum-half. CPU calls by weights (front .4, middle .35, back .25, never the same three
  times running); a CPU defence picks the right pod with its difficulty's read chance, and its timing error is drawn
  from its scrum timing σ.

### 7.11 Kick-offs and 22 drop-outs

- Kick-off from the centre spot by the fly-half (drop kick). The kicker aims a reticle (stick or mouse) on the
  receiving half and holds ○ (or the left mouse button) for power, letting go to kick. It must travel 102 u ("10 m"):
  short = "NOT TEN!" → a free kick to the receivers at halfway; straight into touch = a scrum to the receivers at
  halfway.
- Receivers catch automatically when the ball comes to a player in reach (10 u, z < 30). When a chaser and a receiver
  both reach a high ball, it's a **contest**: each presses ✕ as it arrives; the better timing (CPU: by difficulty and
  HND) takes it, the other is bumped down.
- 22 drop-out: the same, by the defending team from its own 22 line, distance unlimited.

### 7.12 Tries, conversions, penalties, free kicks

- **Try:** 5 points; celebration (each player has a celebration, §11.2), then a replay if earned (§7.20), then the
  conversion.
- **Conversion** (and **penalty goal**) set kick, in the behind-the-kicker camera:
  1. **Place:** move the tee back along the line through the grounding point parallel to touch (stick up/down, mouse
     drag or wheel), 51-400 u from the try line; the angle and the distance read out ("38 M").
  2. **Aim:** a reticle on the posts' plane, moved by the stick or the mouse; it sways a little (more for low KCK and
     higher difficulty); a windsock and arrow show the wind.
  3. **Power:** hold ○ (or the left mouse button) and let go: a meter needs to reach the distance's mark (shown); a
     tight accuracy band near the top adds no hook; elsewhere hooks up to ±(12 - KCK)°.
  4. **Flight:** the ball flies in 3D with the wind; it scores if it crosses the try line's plane between the uprights
     above the crossbar; hitting an upright is a DOINK (it bounces off, missed).
  A 20 s shot clock runs (the crowd's slow hand-clap speeds up). Conversion 2, penalty goal 3. CPU kicks are the same
  flight with an error drawn from its kicker's stats.
- **Penalty:** after a seen foul (and no advantage gained) the non-offending team's captain chooses on a big three-card
  screen (stick or mouse; CPU chooses by score, time and distance): **TAP & GO** (play restarts at once; the offenders
  are put 102 u back), **KICK AT GOAL** (if within 400 u; a set kick for 3), **KICK FOR TOUCH** (a punt aimed at the
  touchline; the kicking team throws in at the lineout).
- **Free kick** (early engagement, not ten): as a penalty, but no kick at goal.
- **Penalty try:** a seen foul against a carrier within 60 u of the try line with no defender between him and the line:
  7 points, no conversion.

### 7.13 The referee and the laws he calls

- **Referee Nigel Blewitt** is a Humanoid on the pitch (black kit, whistle). He runs to a spot 50 u behind the ball on
  the attacking side and 40 u toward the far touchline (so he never stands between play and the camera), at 95 u/s,
  steering round players; he turns to face the ball at 4 rad/s. His eyes: `E.sees(ref, offender, { range: refRange
  (260), fov: refFov (1.4) })` at the moment of the foul and again 0.3 s later. A "Show the ref's view" setting (default
  on) draws his `r.sightCone` faintly on the grass: the over-the-top tactic of fouling behind his back is part of the
  game.
- Always called (they are not about being seen): forward pass, knock-on, touch, not straight, early engagement, use it.
- Called only if seen: **high shot** (an over-charged frontal big hit): penalty + yellow card; **cheap shot** (a hit on
  a player without the ball): penalty, a yellow card for the same player's second; **offside** (a defender ahead of his
  offside line closing on the ball within 30 u when it comes out of a ruck, scrum or lineout): penalty; **hands in the
  ruck**: penalty.
- **Advantage:** a seen foul by team A while team B has the ball or a loose ball near it: the referee calls ADVANTAGE B
  (arm out) and play goes on; if B gains 100 u or scores within 5 s, ADVANTAGE OVER; if B loses the ball or 5 s pass
  without gain, play comes back for the penalty at the mark.
- **Cards and the sin bin:** a yellow card sends the player to the sin bin (the dumpster on the touchline) for `sinBin`
  (30 s of running clock); his team plays with six; the AI shape adapts. A second yellow for the same player is a red
  card: off for the match. A banner, the ref's card held high, the crowd boos, and a sad trombone.
- **Ref down:** a launched body, the chicken or a flying bystander hitting the referee floors him for 8 s: no fouls are
  called at all (cards, offside, cheap shots all free), "REF DOWN! ANYTHING GOES!", then he gets up and play goes on.
- The referee's calls appear as speech balloons over him ("CROUCH!", "BIND!", "SET!", "USE IT!", "ADVANTAGE!", "PLAY
  ON!", "HANDS AWAY!", "PENALTY!", "KNOCK ON!", "FORWARD!", "NOT STRAIGHT!") with his babble voice and arm signals.

### 7.14 Scoring

| Score | Points |
|---|---|
| Try (and pushover try) | 5 |
| Conversion | 2 |
| Penalty goal | 3 |
| Drop goal | 3 |
| Penalty try | 7 |

### 7.15 Hype and supers

- A HYPE meter per team (0-100), shown on the score bug. Gains (× `hypeMult`): tackle 4, broken tackle 5, sidestep or
  fend that beats a man 6, dummy 4 per man sold, offload 6, line break 8, big hit 10, monster hit 16, interception 12,
  jackal or ruck turnover 8, scrum won 6, lineout steal 8, try 15, conversion 5, drop goal 10, unseen cheap shot 8, air
  horn 40.
- Full: "△ SUPER!" flashes on the meter and over the team's controlled players.
- **THUNDER RUN** (△ with the ball): `superTime` (4 s); the carrier is on fire, 1.35x speed, unstoppable (tacklers
  bounce off and fly like skittles), the ball cannot be knocked loose; ends on a pass, a kick, a try or time.
- **HURRICANE HIT** (△ without the ball): the controlled defender locks onto the carrier and homes in at 2x speed for
  up to 2 s; contact is a guaranteed monster hit with the ball loose and everyone within 30 u knocked over; if the ball
  is passed first, it re-targets the new carrier once.
- CPU teams use supers: Thunder Run in the opponents' half with space ahead; Hurricane Hit when the opposing carrier is
  within 120 u of their try line.

### 7.16 ON FIRE

A player who scores two tries in a row (no opposing score between) is ON FIRE until the other team scores or 90 s pass:
unlimited turbo, passes and catches never fail, fends ×1.5, tackles on him ×0.6, kicks +20% distance, a flame trail
(emissive), a music layer, "HE'S ON FIRE!".

### 7.17 Power-ups (thrown on by the crowd)

Every `powerupEvery` (30 ± 10 s) of open play a fan in the stand throws one onto the pitch (an `E.arc` from the crowd
to a spot at least 80 u from the ball); one at a time; it stays 15 s (blinking for the last 3). The first player to run
over it takes it. The CPU diverts one off-ball player if it is within 100 u.

| Power-up | Looks | Effect |
|---|---|---|
| MEAT PIE | a steaming pie in a foil tray | turbo refilled and unlimited for 6 s |
| IRON SHOULDERS | riveted shoulder pads | 15 s: his tackles and fends always win; his hits are monster hits |
| MEGA BOOT | a golden boot with wings | his team's next kick: ×1.6 distance, on fire; a set kick's accuracy band ×2 (60 s) |
| GREASE JERSEY | a glistening jersey | 8 s: tackles on him fail 70% |
| AIR HORN | a red air horn | +40 hype for his team at once; the crowd goes barmy |

### 7.18 Venues: weather and hazards (one twist each; data in §9.2)

| Venue | Weather | Hazard |
|---|---|---|
| Muddington Park | rain (0.7) | **mud** patches (4-6 floor-tag blobs): speed ×0.8, acceleration ×0.6, tackles +10%, ball skids; catches -6% in rain; kits get muddier as the match goes on (rig colours mixed toward brown by each player's time in mud and on the ground) |
| Port Grumble Docks | gusty wind | **wind** that shifts every 15-25 s (strength 0-1, a windsock on the HUD) pushes airborne balls (40 u/s² × strength × `windMult`); **CAPTAIN CLUCKY**, the giant chicken mascot, invades every 50-70 s, runs across on an `E.Path` for about 6 s, bowling over everyone in his way (the carrier drops the ball), chased by the referee |
| The Furnace | clear night | **flame jets**: grates 32 u inside each touchline (8 a side) erupt in sequences; each glows orange for 1.0 s (the warning), then burns for 1.2 s; anyone within 12 u is TOASTED (stunned 1.2 s, smoking, briefly blackened; a toasted carrier drops the ball); fireworks on every try |
| The Megadome | thunderstorm (rain 0.9) | **lightning** every 20-30 s: a crackling ring (36 u) warns for 1.4 s at a spot 60-200 u from the ball, then a strike: a flash, thunder, a scorch decal; anyone inside is stunned 1.5 s (drawn as a skeleton for two frames: a shared `build: 'skeleton'` rig drawn in their place) and a carrier inside drops the ball |

`hazardEvery` (×1.0) scales every hazard's frequency; 0 turns them off.

### 7.19 AI

Both CPU teams and the CPU teammates of humans run the same brain; difficulty and the team's style (§9.1) change its
numbers, never its logic. Shapes are recomputed every 0.25 s per team (staggered); decisions every 0.15 s plus the
reaction delay.

- **Attack shape** (team in possession; carrier at `(cx, cy)`, attacking direction `d`): six support slots in a
  staggered line behind the carrier, three each side: slot k at `(cx - d × (18 + 10k), cy ∓ 44k)` (spacing 44 to the
  open side, 36 to the blind side), clamped 20 u inside touch. Forwards take the k = 1 slots, backs the wider ones, the
  wing the widest open-side slot; then nearest-first; a reassignment needs a 20 u improvement (hysteresis). Supporters
  never stand in front of the carrier (they check stride to stay 6 u behind). After a line break they turbo.
- **Defence shape:** a line at `cx + d × 30` facing the attack (behind the offside line when there is one), defenders
  paired to attackers by y order ("man on man drift") so the line slides with the attack; the nearest defender by
  intercept time is the **tackler** (aims at the carrier's predicted position), the second the **cover** (20 u behind
  and inside); the **sweeper** (the wing or fly-half) sits 140 u deep at `lerp(cy, CY, .5)` to field kicks, and joins
  the line when the ball is within 200 u of his try line. With six men (sin bin) the line spaces wider.
- **Tackler decisions:** in range and facing, after `aiReaction`: try with `0.6 + 0.3 × aggression`; a big hit if POW
  ≥ 7 or aggression ≥ 0.6 and the carrier is coming head on (charging from 40 u out); a dive tackle when chasing a
  faster carrier from 18-30 u behind; cheap shots on the nearest support runner when the referee is not looking, with
  the team's `cheapShots` rate.
- **Carrier decisions** (CPU carriers, and the human's teammates when they have the ball): score each option and take
  the best, with noise by difficulty: run forward (space in a 30° cone ahead), pass to each legal receiver (his space
  minus defenders near the lane), sidestep (a tackler committing within 22 u: 25% × skill), fend (a tackler within 16 u
  and POW ≥ 6: 40%), kick (deep in his own 22 under pressure: to touch; behind a flat line with a fast chaser: grubber
  or chip; the last 20 s, trailing by 3 or less, in range: drop goal), dive in the in-goal (or run to the posts when no
  defender is within 60 u). Steer toward the widest gap in the defensive line; keep 20 u inside touch; turbo in space
  and when racing to the line; keep 30% of the tank.
- **Loose ball:** the two nearest from each team chase its predicted rest point; the rest keep their shape.
- **Kicks:** the receiving team's nearest (or the sweeper) goes to the landing marker, a second supports; the kicking
  team's two fastest chase. (There is no offside in open play in this game; this is deliberate.)
- **Set pieces:** see each set piece above. CPU kick-offs aim short and contestable, 120-200 u past halfway toward a
  touchline. CPU penalty choice: kick at goal within 300 u when the score is close or late; kick to touch from far; tap
  & go within 50 u of the line or when trailing late.
- **Difficulty** (the player's Settings choice shifts each cup opponent one step):

| | Rookie | Pro | Legend |
|---|---|---|---|
| `aiReaction` | 0.40 s | 0.25 s | 0.14 s |
| Tackle chance | -0.12 | 0 | +0.08 |
| `cpuMash` | 6/s | 9/s | 12/s |
| Decision noise | 0.35 | 0.20 | 0.08 |
| Interception × | 0.5 | 1 | 1.5 |
| Scrum timing σ | 0.25 s | 0.12 s | 0.06 s |
| Early engagement | 8% | 3% | 0% |
| Lineout read | 0.25 | 0.35 | 0.45 |

### 7.20 Instant replay

- A ring buffer keeps the `MatchState` of the last 5 s at 60 Hz (every other step).
- Triggers: monster hits, supers, tries that came from a run of 200 u or more or beat a man, drop goals, pushover
  tries, interception tries; at most one replay in 30 s (tries always). Setting: Replays Big moments (default) / All
  tries / Off.
- Playback: the window from 2.5 s before to 1 s after the event, at 0.5x, through the normal presentation (states fed
  to the rigs), camera at zoom 1.35 on the key actor, letterbox bars, "INSTANT REPLAY" in the corner, Barry: "Let's see
  that again!"; any button skips. After a try it plays in the celebration, before the conversion. Never in AI Hub
  sessions.

### 7.21 Stats and the Player of the Match

Per team: possession % (time holding the ball), territory % (ball in the opponents' half), tries, conversions
made/attempted, penalties conceded, tackles made/missed, big hits, monster hits, metres carried (`units / 10.24`), line
breaks, turnovers won, offloads, cards. Player of the Match (winning side): tries × 10 + monster hits × 4 + tackles + metres
/ 10 + line breaks × 3 + turnovers × 3. Results show four tiles: TRIES, BIG HITS, METRES, POSSESSION.

---

## 8. Modes, scenes and flow

```
boot → title ─(10 s idle)→ attract ─(any input)→ title
         │ PRESS START
         ▼
       menu ─(10 s idle)→ attract
         ├─ MEGA CUP ─→ cup hub ─→ story (prologue) → training (optional) → story (pre-match) → [join] → match
         │                 ▲                                                                        │
         │                 └──── results (win: next round; loss: CONTINUE? 10 s) ←───────────────────┘
         │                 final won → story (trophy) → story (third half) → credits → title
         ├─ EXHIBITION → join → setup (teams, venue, weather, time, halves) → match → results → rematch | menu
         ├─ TRAINING GROUND → drill list → match (drill) → next drill | list
         ├─ RECORDS → three tables (attract-style)
         ├─ SETTINGS → the standard settings screen (game.menu('settings'))
         └─ ABOUT & CREDITS → five pages
AI Hub session: boot → card (the game's own) → match (session) → end overlay (no title, no menus)
```

| Scene | What it is |
|---|---|
| `title` | Night stadium under floodlights behind the logo; two Mudlarks passing a ball in the background (the real presentation, a tiny CPU loop); "PRESS START" (or the touch-only message); E.Arcade drives the idle cycle (`idle: 10`) |
| `menu` | BigMenu (scale 2): MEGA CUP (CONTINUE if a cup save exists), EXHIBITION, TRAINING GROUND, RECORDS, SETTINGS, ABOUT & CREDITS; a one-line description of the focused item; 10 s idle → attract |
| `attract` | the match scene with `{ attract: true }` (§13) |
| `cup` | the bracket: four big cards (ROUND ONE, QUARTER-FINAL, SEMI-FINAL, GRAND FINAL) with the opponent crest, venue, result or NEXT or LOCKED; PLAY NEXT MATCH, TRAINING, TEAM SHEET (seven portraits with nickname and role; ✕ on one shows its five stat bars), BACK |
| `story` | runs one `E.Story` node on a staged set (clubhouse, pitch-side, tunnel, podium; §9.3), then `go(next)`; ✕ turns pages, △ skips the scene |
| `join` | "PRESS START TO JOIN" (pads) or 2 (keyboard right half); each seat moves left/right to HOME, AWAY or CPU; in the cup only HOME; ✕ ready; up to 4 |
| `setup` | Exhibition: HOME and AWAY team cards (left/right to change; crest, name, three bars: SPEED, POWER, SKILL), VENUE (picture card), WEATHER (Venue default / Clear / Rain / Wind / Storm), TIME (Day / Dusk / Night), HALVES (2-5 min), SUDDEN DEATH (On/Off); PLAY |
| `match` | the match (pausable); data `{ home, away, venue, weather, time, half, cup, drill, attract, session, seed }` |
| `results` | the score with crests, PLAYER OF THE MATCH (portrait, two stats), four stat tiles, CONTINUE; a record set → initials (E.Arcade letter wheel) |
| `training` | the nine drills as big cards with a tick when done; ✕ plays one |
| `records` | three tables, one a page: BIGGEST WINS (margin), MOST TRIES IN A MATCH, BIGGEST HIT (metres flown); initials |
| `about` | five pages (§20); L1/R1 or left/right turns them |
| `credits` | rolls over the third half (§9.3), then the title |
| `card` | the AI Hub card (§15.2) |

**Deep links** (for `tools/check.mjs`, filmstrips and screenshots, read from `location.hash` at start as the kits do):
`#title`, `#menu`, `#cup`, `#training`, `#training/<n>`, `#match` (an Exhibition with the defaults), `#match/<venue>`,
`#attract`, `#records`, `#about`, `#credits`, `#card` (the session card with made-up players, for screenshots only).

**Pause menu** (standard, adjusted): Resume, RESTART MATCH, DEV MODE, Settings, Controls, Full screen, Quit to title
(none of these in a session, §15.2).

**Saves:** `game.saves` with `menu: { saves: false }` (no manual save slots: arcade); the cup autosaves at the cup hub
and after each match: `{ round, results: [[home, away]], seeds, difficulty, stats }` with `place: 'MEGA CUP'`, `level:
round`. CONTINUE on the menu loads `game.saves.latest()`. Records and unlocks in `E.store` (`thugby:records`,
`thugby:unlocks`). Winning the cup unlocks the MEGACORP MAULERS in Exhibition and a BIG HEADS cheat (Settings, Game).

---

## 9. Content

### 9.1 Teams and rosters

Kit colours map to Humanoid `colors`: `cloth` jersey, `trim` collar and cuffs, `pants` shorts, `boot` boots, `belt`
the shorts' band (trim colour). Headgear: `hat: { style: 'helmet', color }` is a scrum cap, `'band'` a headband. If two
teams' home jerseys differ in luminance by less than 60, the away team wears its away kit.

**MUDDINGTON MUDLARKS** (the player's team; pub side from the Muddy Duck). Home: sky blue `#4aa0e0`, trim mud brown
`#5a3a1e`, shorts `#3a2a1a`, boots `#1a1410`. Away: cream `#e8dcc0`, trim `#4aa0e0`. Crest: a brown mudlark on a blue
shield. Style: balanced (aggression .5, pass .55, kick .3, cheap shots .1).

| # | Name "Nickname" | Role | Build, size | Look | SPD POW HND KCK TKL |
|---|---|---|---|---|---|
| 1 | Dougie "The Fridge" McAllister (captain) | Prop | bulky 1.35 | bald, pale skin, scrum cap brown | 4 9 5 3 8 |
| 2 | Kev "Gravy" Boatwright | Hooker | bulky 1.25 | short ginger, headband | 5 8 6 3 7 |
| 3 | Sione "Tiny" Taufa | Prop | bulky 1.42 | short black, brown skin | 4 10 4 2 8 |
| 4 | Priya "Pocket Rocket" Nandakumar | Scrum-half | heroic 1.05 | ponytail black, brown skin | 8 4 9 6 6 |
| 5 | Ffion "Boots" Pritchard | Fly-half | heroic 1.12 | long auburn, pale | 6 5 8 9 5 |
| 6 | Marcus "The Bus" Odhiambo | Centre | heroic 1.30 | spiky black, dark skin | 7 8 6 4 7 |
| 7 | Jamie "Wheels" Whitlock | Wing | heroic 1.10 | spiky blond, pale | 10 4 7 5 4 |

Also: COACH GORDON GRISTLE (ex-prop, 60s: bulky 1.3, bald with grey fringe, flat cap `hat: 'cap'`, `outfit: 'coat'`
brown), BIG DAVE (the bus driver: bulky 1.35, beanie-like `hat: 'band'`, hi-vis jacket `coat` `#e8e030`).

**BRAMBLEWICK BADGERS** (round one; a village side). Home: black `#24242a`, trim white `#f0f0f0`, shorts white. Away:
white, trim black, shorts black. Crest: a badger's striped face. Style: cautious (aggression .3, pass .4, kick .5,
cheap shots .05). Difficulty base: Rookie.

| # | Name "Nickname" | Role | Build, size | Look | SPD POW HND KCK TKL |
|---|---|---|---|---|---|
| 1 | Edna "Nan" Pemberton (captain, 74) | Prop | bulky 1.25, `hunch: .2` | short grey hair, knitted scrum cap cream | 3 8 6 4 8 |
| 2 | Barnaby "Barn Door" Pike | Prop | bulky 1.38 | bald, ruddy | 3 9 3 2 7 |
| 3 | Wilf Hollins | Hooker | bulky 1.2 | short brown | 4 7 5 3 6 |
| 4 | Pip Tanner | Scrum-half | heroic 1.0 | spiky ginger | 7 3 7 5 5 |
| 5 | Clementine Ashby | Fly-half | heroic 1.1 | ponytail blonde | 5 4 7 8 4 |
| 6 | Ollie "Badger" Brock | Centre | heroic 1.25 | short black, grey streak | 6 7 5 3 6 |
| 7 | Tilly Fenwick | Wing | heroic 1.08 | long black | 8 3 6 4 4 |

**PORT GRUMBLE GULLS** (quarter-final; a flashy harbour side). Home: white `#f4f4f0`, trim teal `#1fa89a`, shorts navy
`#1e2a50`. Away: teal, trim white, navy. Crest: a gull with a chip. Style: running and kicking (aggression .45, pass
.75, kick .5, cheap shots .1). Difficulty base: Pro, reaction 0.3 s. Mascot: CAPTAIN CLUCKY.

| # | Name "Nickname" | Role | Build, size | Look | SPD POW HND KCK TKL |
|---|---|---|---|---|---|
| 1 | Sal "Salty" Pereira | Prop | bulky 1.32 | short black | 4 8 5 3 7 |
| 2 | Kenji "Kipper" Ito | Hooker | bulky 1.2 | spiky black | 6 7 7 3 6 |
| 3 | Mo "Anchor" Haddad | Prop | bulky 1.38 | bald | 4 9 4 2 8 |
| 4 | Lulu Fairweather | Scrum-half | heroic 1.02 | ponytail red | 8 4 9 6 5 |
| 5 | Jonty "Silky" Swift (captain) | Fly-half | heroic 1.15 | long golden, a headband | 7 5 9 9 4 |
| 6 | Dexter "Jet" Okoro | Centre | heroic 1.25 | short, dark skin | 8 7 7 4 6 |
| 7 | Bree "Breeze" Lindqvist | Wing | heroic 1.1 | long platinum | 10 4 8 5 4 |

**FURNACE FORGE IRONSIDES** (semi-final; foundry hard men and women). Home: charcoal `#3a3a44`, trim molten orange
`#f07a1e`, shorts black. Away: orange, trim charcoal. Crest: an anvil in flames. Style: big hitters (aggression .85,
pass .35, kick .25, cheap shots .35, line speed fast). Difficulty base: Pro. Most wear scrum caps in orange.

| # | Name "Nickname" | Role | Build, size | Look | SPD POW HND KCK TKL |
|---|---|---|---|---|---|
| 1 | Grigor "The Kiln" Petrov | Prop | bulky 1.4 | bald, a soot smudge (skin darker) | 4 10 3 2 9 |
| 2 | "Rusty" Nailor | Hooker | bulky 1.25 | short rust-red | 5 8 5 3 8 |
| 3 | Bertha "Big Bertha" Blunt | Prop | bulky 1.4 | ponytail black | 4 10 4 2 9 |
| 4 | Smudge Cole | Scrum-half | heroic 1.05 | spiky black | 7 5 7 5 6 |
| 5 | Ingot Ingram | Fly-half | heroic 1.15 | short blond | 6 6 7 8 6 |
| 6 | Adaeze "Anvil" Okafor (captain) | Centre | bulky 1.32 | short black, dark skin | 7 9 6 3 9 |
| 7 | Flint Mackay | Wing | heroic 1.12 | spiky grey | 9 6 6 4 6 |

**MEGACORP MAULERS** (the grand final; a billionaire's bought-in super team; unlocked after the cup). Home: gold
`#e8c040`, trim purple `#5a2a8a`, shorts `#3a1a5a`. Away: purple, trim gold. Crest: a gold "M" in a purple diamond.
Style: everything (aggression .7, pass .6, kick .45, cheap shots .25, supers eagerly). Difficulty base: Legend. Owner:
SIR RUPERT GOLDBRICK (cutscenes only: heroic 1.15, `outfit: 'coat'` purple, `hat: 'crown'` gold, a monocle drawn as one
pixel ring).

| # | Name "Nickname" | Role | Build, size | Look | SPD POW HND KCK TKL |
|---|---|---|---|---|---|
| 1 | "BIG UNIT" Brannigan (captain, the boss) | Prop | bulky **2.0** | bald, a gold headband | 6 12 6 3 10 (POW beyond the scale on purpose) |
| 2 | Leverage Lou | Hooker | bulky 1.25 | slicked short | 6 8 7 3 7 |
| 3 | "Bonus" Barrington | Prop | bulky 1.38 | short blond | 5 9 5 2 8 |
| 4 | Synergy Jones | Scrum-half | heroic 1.05 | ponytail violet | 9 5 9 6 6 |
| 5 | Chad Sterling III | Fly-half | heroic 1.15 | long gold, smug | 7 6 9 10 5 |
| 6 | Vance Capitale | Centre | heroic 1.28 | spiky black | 8 8 7 5 7 |
| 7 | Hedge Fundsworth | Wing | heroic 1.12 | short silver | 10 5 8 6 5 |

BIG UNIT is `immovable` (gang tackle needed), his fend flings tacklers 40 u, all his tackles are big hits, and his
super is the UNIT TRAIN (a 6 s Thunder Run). He gets a spotlight entrance.

Commentators and referee (portraits only, plus the referee on the pitch): BARRY BELLOWS (heroic 1.1, comb-over, a
blazer `coat` maroon, headset drawn as a dark band), ROS RUCKER (heroic 1.1, short grey bob, cauliflower ear: a pink
pixel blob; blazer navy), NIGEL BLEWITT (heroic 1.1, black kit with green trim, short brown hair, big ears).

### 9.2 Venues (data: `{ id, name, time, weather, wind, lights, grass, stands, crowd, boards, skyline, hazard, music }`)

| Venue | Look | Skyline beyond the far stand | Boards (fictional sponsors) | Music |
|---|---|---|---|---|
| **Muddington Park** (Mudlarks' home; the training ground too, by day without rain) | overcast day; a small wooden stand (`face: 'plank'`) and grass banks; the Muddy Duck pub behind the east in-goal | low hills, a church spire, drizzle | THE MUDDY DUCK · PIES & PINTS, BIG DAVE'S BUSES, CHANNEL THUD | "Mud and Glory" |
| **Port Grumble Docks** | dusk, orange sky; a concrete stand; shipping containers stacked behind one end | cranes, a lighthouse, gulls wheeling | SEAGULL-PROOF CHIPS, KRAKEN INSURANCE, GRUMBLE'S GRAVY | "Grumble Shanty" |
| **The Furnace** | night, floodlights (4 towers); black steel stands (`face: 'stone'` dark); glowing grates | chimneys belching sparks, a red glow | FORGEWORKS STEEL, TURBO TONIC, MEGA MEAT PIES | "Forge Floor" |
| **The Megadome** | night storm; a huge gold and purple bowl, a jumbotron on the far stand, lasers on tries | city towers, a GOLDBRICK HOLDINGS sign | GOLDBRICK HOLDINGS, CHANNEL THUD, TURBO TONIC | "Megadome Mayhem" |

Lighting (every scene is lit, as the look target asks): day `lights.enabled = true` with ambient 0.95 and a warm tint;
dusk ambient 0.65 with floodlights; night 0.45 with floodlights (a light pool under each tower, `lights.add` every
draw) and emissive fire, sparks and flames. Crowd: stand tiles hold two figures
each (as the sports kit) in the two teams' colours (home 70%), bobbing; they jump on scores and boo cards; a Mexican wave
rolls round when play is stopped longer than 8 s. Floodlight towers: tall lamp props or custom shapes on the stand
corners.

### 9.3 The Mega Cup: story beats and script

Write all story text in this voice: broadcast hype, pub banter, clichés turned up to eleven. Lines are `E.Story` nodes
(data in `03-data-content.js`), spoken with portraits and babble voices; ALL CAPS shouts shake (`{shake}`); pauses with
`{w=.4}`. The lines below are the spine; add up to two more per scene in the same style, no more.

1. **Prologue: the Muddy Duck** (clubhouse set: plank floor `E.tex.planks`, plaster walls, a bar of counters, barrels,
   stools, a dartboard, a pie warmer glowing, warm lamps; threequarter view, zoom 1.5).
   - BIG DAVE: "So I'm filling in the form, right. 'Mega Cup.' I thought it was a tea thing."
   - GRISTLE: "It's the TURBO SEVENS MEGA CUP, Dave. Live on Channel Thud. Against teams with dieticians."
   - THE FRIDGE: "We've got a dietician." *(nods at the pie warmer)*
   - GRISTLE: "Gristle's Rule Number One: nobody laughs at the Mudlarks. Rule Number Two: we train. Now. Yes, you too,
     Dave."
   - Choice: TRAIN (→ training) / SKIP TO THE CUP.
2. **Round one vs Bramblewick Badgers, Muddington Park** (pitch-side set: the two captains face to face at halfway,
   zoom 1.4).
   - BARRY: "Welcome to a damp Muddington Park, where the Mudlarks open their Mega Cup against the Bramblewick Badgers!"
   - ROS: "Damp is generous, Barry. I've seen drier rivers."
   - NAN PEMBERTON: "I've propped since before your dad had teeth, sonny. I've had hip replacements tougher than you."
   - GRISTLE: "She's seventy-four, lads. Do NOT go easy on her. She bites."
   - Halftime, GRISTLE: "Rule Three: hold the ball. Rule Four: see Rule Three."
   - Won: BARRY: "The Mudlarks are through! Ros, are they any good?" ROS: "They're... present, Barry."
3. **Quarter-final vs Port Grumble Gulls, Port Grumble Docks.**
   - JONTY SWIFT: "Gorgeous evening. Gorgeous ground. Gorgeous me. Do try to keep up, darlings."
   - GRISTLE: "Watch the wind. Watch the chicken. Don't ask about the chicken."
   - Halftime, GRISTLE: "Pass it like it's hot. It IS hot. It's Port Grumble. Everything here's been deep-fried."
   - Won: ROS: "That chicken has more caps than I do."
4. **Semi-final vs Furnace Forge Ironsides, The Furnace.**
   - ANVIL OKAFOR: "We forge champions here. Everyone else, we melt down for scrap."
   - GRISTLE: "Don't stand on the glowing bits. Wheels. Wheels, look at me. The GLOWING bits."
   - Halftime, GRISTLE: "They hit hard? Hit harder. Then hide behind Tiny."
   - Won: BARRY: "A PUB TEAM IN THE MEGA CUP FINAL! Somebody pinch me!" ROS: "Gladly, Barry."
5. **Grand final vs Megacorp Maulers, The Megadome** (tunnel set; lights down, a spotlight for BIG UNIT).
   - SIR RUPERT GOLDBRICK: "Charming little pub team. I'll buy the lot of you. The pub, the pies, the muddy bird. Name
     your price."
   - THE FRIDGE: "Not for sale."
   - GRISTLE: "The pies are for sale. Two-fifty. WE'RE not."
   - BIG UNIT: "*(one long babble roar)*" BARRY: "BIG UNIT BRANNIGAN! Two metres of pure invoice!" ROS: "You'll need two
     men to bring him down, minimum. Bring a ladder."
   - Halftime, GRISTLE: "I've written the big speech. In my head. It's very moving. Pretend I said it. NOW GET OUT
     THERE!"
6. **Victory** (podium set: confetti, fireworks, the MEGA CUP trophy, a gaudy golden cup twice a man's height).
   - BARRY: "THE MUDDINGTON MUDLARKS ARE MEGA CUP CHAMPIONS! A PUB TEAM, ROS! A PUB TEAM!"
   - ROS: "I need a lie down, Barry."
   - SIR RUPERT: "I'll buy the trophy, then." GRISTLE: "Rule Five: no."
7. **The third half** (back at the Muddy Duck; everyone cheering, Nan Pemberton and Captain Clucky included; the cast
   sings the club song in a babble choir with lyrics on screen):
   *"Oh Muddington, oh Muddington, your mud is in my soul / We lost our boots, we lost our teeth, we never lost the
   ball..."* GRISTLE: "Last orders!" → credits.
- **A lost match:** GRISTLE: "Rule Six: we go again." → E.Arcade `continue(10)`: CONTINUE? (✕ retries the match with a
  new seed; at zero, back to the cup hub with the match still NEXT).

Drawn-out cutscenes are skippable (△); a skipped scene never blocks progress.

### 9.4 Training Ground (Coach Gristle's drills)

Each drill is a match scene with a scripted setup, a goal predicate, a prompt line with glyphs, and a **SHOW ME** (△)
button where the coach's AI does it once ("Watch me, you muppets"). Its `auto` script is the same one the tests use to
prove it can be completed. ○ / Esc leaves; a failed attempt resets in 1 s.

| # | Drill | Setup | Goal | Teaches |
|---|---|---|---|---|
| 1 | LEGS | you with the ball at your 22, cones to the try line | run to the line on turbo, dive (✕) over | moving, turbo, grounding |
| 2 | HANDS | you and four runners in a line | five passes, both directions, then a long pass; a forward pass to Wheels shows the whistle | L1/R1, long pass, the backwards rule |
| 3 | FEET | three tackle bags and a defender | sidestep twice, spin once, fend the defender | ✕ sidestep and spin, □ fend |
| 4 | HIT | a runner coming at you, then another | a tackle, a BIG HIT (hold ✕), a dive tackle (□), switching (○ and L1/R1) | defence |
| 5 | RUCK | three tackles in a row | win two rucks by mashing, then jackal one (□) | breakdown |
| 6 | BOOT | you with the ball | a grubber into the in-goal and chase it; a punt into touch; a drop goal from 30 m | kicking |
| 7 | SET PIECES | the forwards | win a scrum (✕ on SET, alternate L1/R1), win a lineout (call a pod, throw) | scrum, lineout |
| 8 | POSTS | a try just scored out wide | convert it: place, aim, power | set kicks |
| 9 | TURBO TIME | hype full, a meat pie on the pitch | take the pie, then THUNDER RUN through three defenders to score | power-ups, supers |

### 9.5 Commentary

The director listens to the bus, picks a line by category with priorities (a try beats a pass), cooldowns (no category
twice in 6 s, no line twice in a match: shuffle bags), alternates Barry (play-by-play, first) and Ros (colour, a beat
later, 40% of the time), fills `{$player}` (nickname), `{$team}`, `{$score}`, `{$venue}`, and shows it on the radio
dialog (`modal: false`, `auto: 2.2`, at the bottom, portraits). Setting: Commentary On / Text only / Off. Write at least
six lines per category in this voice:

| Category | Lines (Barry unless marked Ros) |
|---|---|
| kick-off | "And we're underway at {$venue}!" · "Big boot to get us going!" · Ros: "Here we go. Mind the mud." |
| try | "HE'S GONE OVER! TRY TIME!" · "Under the sticks! You could drive a bus through that gap!" · "Dotted down! {$player}, take a bow!" · "In at the corner! Somebody check the paint on that touchline!" · Ros: "Textbook. If the textbook was written by a hurricane." |
| big hit | "OH, THAT'S A BIG ONE!" · "He'll feel that in the morning. And the morning after." · "Absolutely SHUDDERING!" · Ros: "I felt that in my old knee, Barry." |
| monster hit | "MONSTER HIT! That's gone into orbit!" · "Put him in Row Z!" · "Somebody get that man a postcode, he's lost!" |
| sidestep / spin | "Left him for dead!" · "Feet like a ballroom dancer!" · Ros: "Lovely footwork. Questionable haircut. Lovely footwork." |
| fend | "HAND-OFF! Right in the chops!" · "He's fended him into next week!" |
| dummy | "Oh, the dummy! They've bought it, the whole shop!" |
| line break | "He's through! There's daylight!" · "The line's been cut like a birthday cake!" |
| knock-on | "Knock-on. Butter fingers." · "Dropped it like a hot pie!" |
| forward pass | "Forward! The ref's not having that." · Ros: "Forward by a country mile, Barry." |
| ruck / jackal / turnover | "JACKAL! He's pinched it!" · "Turnover! Stolen like a pie at a buffet!" |
| scrum | "Crouch... bind... SET! And they've hit like freight trains!" · Ros: "That scrum's going backwards, and so is their dignity." |
| pushover try | "PUSHOVER TRY! They've shoved them over the line like a wardrobe!" |
| lineout | "He's been lifted so high he can see his house!" · "Stolen at the lineout! Cheeky!" |
| conversion made / missed | "Straight between the sticks!" · "Bang! Two more!" · "Wide! Hooked it like a fisherman." · "DOINK! Off the upright!" |
| drop goal | "DROP GOAL! Cheeky, cheeky!" |
| penalty / advantage | "Penalty! The ref's arm is out!" · "Advantage being played..." · "Advantage over." |
| unseen cheap shot | "Ooh... the ref's missed that one completely." · "What the ref doesn't see, Ros..." Ros: "...is still assault, Barry." |
| yellow / red | "YELLOW CARD! Off to the sin bin, and I mean an actual bin!" · "RED CARD! Early bath!" |
| ref down | "THE REF'S DOWN! Anything goes, Barry!" (Ros says it; Barry: "Anything goes, Ros!") |
| on fire | "HE'S ON FIRE!" · "Somebody call the fire brigade! Actually, don't, let it burn!" |
| super | "THUNDER RUN! Get out of the way!" · "HURRICANE HIT INCOMING!" |
| power-up | "Somebody's chucked a meat pie on the pitch!" Ros: "Is that... gravy?" · "IRON SHOULDERS! He's a walking wardrobe!" · "The MEGA BOOT! Stand well back!" · "Grease jersey! Slippery as a sardine!" · "AIR HORN! The crowd's gone barmy!" |
| hazards | "It's CAPTAIN CLUCKY! The mascot's on the pitch again!" · "Mind the flames! That's a well-done winger!" · "Lightning strike! That's one way to clear a ruck!" · "He's in the mud! Half man, half puddle!" |
| hooter / half / full / sudden death | "There's the hooter! Ball has to go dead!" · "Half-time here at {$venue}: {$score}." · "FULL TIME! {$team} win it, {$score}!" · "That's it! Somebody get the kettle on!" · "Golden point! Next score wins the lot!" |

### 9.6 Records and unlocks

E.Arcade tables (`id: 'thugby'`), modes `margin`, `tries`, `hit` (metres flown × 10), seeded with ten fictional
entries each (initials of the cast: "NAN 34", "BIG 12"...). After an Exhibition or cup match, any qualifying number
opens the initials wheel. Unlocks as in §8.

---

## 10. Art direction and presentation

### 10.1 The engine's look target, applied

`res: 'ps1'`, `expand: true`; HD Humanoids at size 1.0-1.42 (the boss 2.0), every character dressed (outfit `shirt`
jerseys, `sleeves: 'short'`, hair, headgear, a real palette); `propSize: 1.3`; textured floors (`floorTex`) and walls
(`face`, `roof`); 3-8 props per screen (corner flags, the dugouts' benches, water bottles on the touchline, kit bags,
cones, floodlight towers, sponsor boards, the sin bin, cameramen on the touchline as small Humanoids with a box camera);
effects on every hit; `E.font.title` logos with 3-4 colour gradients and depth; light in every night scene; portraits in
every dialog. Act on every look note `tools/check.mjs` prints. Compare screenshots with the best PS1-era sports games,
not with NES ones. Performance is out of scope (TASK.md): favour detail (full crowds, lights, particles, shadows) over
frame rate.

### 10.2 Characters

Colours shaded with `E.tones` where drawn by hand. Each team's players differ in build, size, hair, skin and headgear so
they read as people, not clones; jersey colours carry the team. Mud builds up on kits at Muddington (`rig.C.cloth` and
`pants` mixed toward `#5a3a1e` by `mud` 0-0.6, restored at the next match). Stunned players get orbiting stars (a
three-frame string sprite) over their heads. The ball carrier gets a subtle white outline in busy moments.

### 10.3 New art assets (all drawn by code)

| Asset | How |
|---|---|
| Oval ball (laces, panel lines; 16 turns) | `E.sprite` strings 9x6, drawn with `rot` (cached), end-over-end flicker for kicks |
| Goalposts with pads, crossbar | `r.queue` lines and rects projected with `r.w`, depth-sorted with the ball |
| Pitch markings, in-goal crest | `floorTex` |
| Stands, crowd, flags, banners | TileMap tiers + `r.queue` figures (as the sports kit), `banner` props in team colours |
| Sponsor boards with text | south boards as cut walls with text drawn on their faces through `r.queue` |
| Floodlight towers, jumbotron (shows score, portraits, TRY!) | custom shapes (`docs/ASSETS.md` format) or `r.queue` boxes; the jumbotron draws `rig.drawPortrait` |
| Skylines per venue | the TileMap has `outside: false`; each draw paints `r.sky([...])`, then the venue's silhouettes (hills, cranes, chimneys, towers) anchored to the far stand's projected top edge (`r.w` of its back corners), then the map, so the stand meets the skyline whatever the camera does |
| Sin bin dumpster | a custom shape (green metal box, lid, SIN BIN stencil); the binned player drawn inside |
| Kicking tee, cones, tackle bags, corner flags, water bottles, kit bags | small custom shapes or string sprites |
| Power-up sprites (pie, pads, boot, jersey, horn) | string sprites 12-14 px with a glint |
| Captain Clucky | an `E.Blob` (`R: 14`, white and yellow, `wings`, `feet`, a red comb and beak drawn over it) |
| Flame grates and jets, scorch decals, lightning bolt | decals, `particles.fire`, `px.line` zig-zags, emissive queue items |
| Crests (5 teams), the Channel Thud bug, the MEGA CUP trophy | string sprites and a custom shape |
| Button badges (PlayStation, Xbox, keycaps, mouse) | string sprites (§6.4) |
| Clubhouse, tunnel, podium sets | small TileMaps with store props (`kenney-furniture`, `kaykit-restaurant-bits` via `E.addAssets`; check with `tools/asset-find.mjs`) |

### 10.4 Effects

Tackles: dust (`particles.dust`), grass divots (`bits` in greens), mud splats (`bits` browns) at Muddington. Big hits:
`game.hitFx` (no damage number: leave `damage` out and check none shows), `freeze(.08)`, `shake(4)`, sparks. Monster
hits: `freeze(.12)`, `flash`, `shake(6)`, a ring, a 1.1x zoom punch tweened back, a "WHUMP" text particle. Tries:
confetti `bits` in the scorers' colours, crowd jump, fireworks at night (`particles.explosion` high in the sky),
lasers at the Megadome. ON FIRE and supers: `fire` particles trailing, emissive glow. Weather from `game.weather`.

### 10.5 HUD (canvas, anchored to `r.W` and `r.H`, clear of `game.cornerArea()`)

| Where | What |
|---|---|
| Top left | The TV score bug: crests, three-letter names (MUD, BAD, GUL, IRN, MEG), scores, the half and the sevens clock (with HOOTER flashing past time); each team's HYPE bar under its name (flashing "△ SUPER" when full); sin-bin timers as small dumpster icons with seconds |
| Top centre | Event banners (`E.font.title` scale 3-4, popped in with a tween, 1.2-2 s): TRY!, MONSTER HIT!, LINE BREAK!, ON FIRE!, SIN BIN!, REF DOWN!, PUSHOVER TRY!, DROP GOAL!, CONVERTED!, WIDE!, KNOCK-ON, FORWARD!, ADVANTAGE, HOOTER! |
| Top right | The radar: the pitch small, dots in team colours, white ball, controlled players ringed |
| Bottom corners | One card per human seat: the controlled player's live portrait, nickname, turbo bar, power-up icon and seconds |
| Bottom centre | Context prompts (two or three badges with a word: "{b:x} STEP  {b:sq} FEND  {b:ci} KICK"), above the commentary lower-third |
| In the world | Seat rings and chevrons; L1 / R1 badges over the two receivers; the landing ring of every kick; offside lines (dashed, team colour, "OFFSIDE" at the ends) during rucks, scrums and lineouts; the ref's sight cone; the "USE IT" ring; off-screen arrows (`r.marker`) for the ball and each controlled player |
| Set pieces | Big centred widgets: the scrum's SET ring and push bar (with both teams' colours), the lineout's three pod buttons and the throw needle, the kick meter (vertical, with the sweet band), the set kick's reticle and wind arrow, the penalty choice's three cards |

### 10.6 Menus and screens: 10-foot rules

- Everything readable at 3 m on a TV: body text never below the 5x7 font at scale 1 on the ps1 buffer (about 30 TV
  pixels high at 1080p); menu entries at scale 2; titles 3-4. No more than seven choices on a screen, and no tables of
  numbers: results show four big numbers, team cards three bars.
- Focus is unmistakable (a glowing box, ▸ markers, a sound); d-pad and stick move it, ✕ picks, ○ goes back; the mouse
  over an item moves the focus, a click picks it (E.Menu does both); every card-style screen does the same with
  `input.pointer()` / `input.clicked()`.
- The standard HTML pause, settings and controls screens (engine's `E.Shell`) stay (they are the engine's standard
  features), restyled for a TV with CSS in the page: `.esh { font-size: 20px }`, `.esh button { font-size: 18px;
  padding: 14px 20px; min-height: 56px }`, `.esh-mod { width: min(720px, 100%) }`, `.esh h2 { font-size: 34px }`,
  `.esh-row { padding: 12px 0 }`, the theme in team colours (accent `#f0c040`, paper `rgba(16,20,28,.92)`).
- Every screen shows its prompts with the badges of the device used last.

### 10.7 Camera direction (TV flourishes)

Walk-outs before kick-off (both teams jog out of the tunnel to the halfway line; captains shake hands; 6 s, skippable);
a slow push-in on the kicker before a set kick; the replay angle; the crowd and jumbotron cut-ins at scores (a 1 s
picture-in-picture of the scorer's portrait on the jumbotron); the camera never shakes during menus.

---

## 11. Animation

### 11.1 How (native system, extended)

- Everything is the engine's Humanoid rig, driven by continuous values (`rig.update(dt, state)`).
- **Paired and multi-body moves** are `E.ACTIONS` entries (`{ beats, setup, at }` like the engine's `takedown`), run by
  `new E.Action(name, { body, other })`; the action moves the bodies and gives `rigState()` / `otherState()`.
- **New poses** are `rig.solvePose` wrappers that move joints after the base solve (as Emberdeep does): the ball carry,
  arms-out celebrations, the scrum bind, the lineout lift, the referee's signals.
- **New strikes** are attack specs in the `E.MOVES` format with `hand`, `kick`, `lunge`, `hop`, `crouch`, `lean`,
  `twist`, `blade: 0`.
- **The anim record:** each player's `anim` in `MatchState` is what the rig needs, compactly: `{ m (move id), ph
  (phase), u, p (pose id), dn (down 0-1), air, fl (flip 0-1), cr (crouch), ex (expression), hu (hurt), arms (custom pose
  id), w (pose weight) }`. The host and replays fill it from actions; online clients and replays feed it to rigs. A
  player who is just running has no `anim` beyond velocity (the gait comes from `vx, vy`).
- Check every new move with `tools/filmstrip.mjs` contact sheets (wind-up, strike, follow-through, clean settle) and with
  `rig.debug(r)` and `game.timeScale = .25`.

### 11.2 The rugby move set

| Move | Built as |
|---|---|
| Carry | `solvePose` wrap: the ball arm's hand at the far hip, elbow tucked; two hands on the ball when a pass is coming (the last 0.2 s before the pass button is likely, i.e. when a receiver is lined up) |
| Pass (short, long) | a spec: `hand: 'both'`, a swing across the body from the far hip to the receiver's side at chest height, `twist`, `wind .06 active .08 recover .18`; long: bigger wind and twist |
| Offload | a one-handed pop (`hand: 'L'`, short) while falling in the tackle |
| Dummy | the pass spec stopped at the end of the wind, then the carry |
| Sidestep | a lateral hop (`hop`), the body leaning away, the legs crossing (velocity impulse) |
| Spin | `spin: true` with the ball held in both hands, `blade: 0` |
| Fend | `thrust` with `hand: 'L'`, `blade: 0`, held (`hold .6`), stiff arm at shoulder height |
| Tackle (paired) | `E.ACTIONS.tackle`: beats lunge .12, wrap .15, fall .35, ground .3: the tackler drives low (crouch, lean) with arms wrapping the carrier's waist; both go down (`down` 0→1), the carrier back or sideways; dust |
| Big hit (paired) | `E.ACTIONS.bigHit`: charge .1, impact .06, launch .5, land .3: the carrier flies (an arc, `flip` 0→1), lands heavily (`land: 1`), slides; the hitter stands over him with a flex (`pose: 'guard'`, `expr: 'shout'`) |
| Dive tackle (paired) | `E.ACTIONS.diveTackle`: the diver flies flat (`down: 1` with `z` above the ground: a superman dive), arms forward; the carrier trips and falls forward |
| Try dive | `E.ACTIONS.tryDive`: the carrier dives flat with the ball held out, slides 12 u on the grass, a puff of dust |
| Get up | the engine's `getUp` |
| Ruck | bodies bent at the hips (`crouch`, a lean), heads down, legs churning (`run: 1`), one or two lying in it (`down: .6`); a dust cloud over the pile |
| Scrum | three a side bound in a row (`solvePose`: arms over the neighbours' shoulders), bent flat-backed, `run` in place while pushing; a collapse is `down: 1` |
| Lineout lift (three bodies) | the jumper rises to z 60 with arms up (`pose: 'cheer'` blend), two lifters crouched below with arms up holding (`pose: 'cast'` with the hands raised); timed together by one action on the jumper and one on each lifter |
| Lineout throw | a two-handed overhead throw (`hand: 'both'`, from behind the head) |
| Catch high ball | `air` with arms up |
| Punt, grubber, drop kick | the engine's `kick` with the ball drawn from the hands to the foot through the wind-up; the drop kick bounces the ball once first |
| Place kick | three run-up steps on an angle, the `kick` with a big lean and follow-through (`hold .8`); the kicker's crouched pre-kick stance beforehand |
| Celebrations (one per player, from a pool of six) | knee slide (`down: .4` travelling), aeroplane arms (`solvePose` arms out, banking), the flex (`pose: 'guard'`, `expr: 'shout'`), the cocky one (`pose: 'hips'`), the bow, the belly flop (`down: 1` with a bounce) |
| Referee signals | try (arm up, pointing down), penalty (arm out and up toward the team), advantage (arm out flat, held), scrum (arm out low), the card held high (a yellow or red rect at `rig.hand('R')`), the whistle at the mouth |
| Stunned, toasted, zapped | `hurt`, a head sway (`solvePose` small roll), stars; toasted: colours darkened briefly, smoke; zapped: the skeleton rig drawn for two frames |
| Sin bin sulk | inside the dumpster, `pose: 'kneel'`, `expr: 'angry'` |
| Walk-out and handshake | a jog; captains shake hands (`solvePose`: right hands meet) |

---

## 12. Audio (all in code: the engine's chip synth and Web Audio; no files)

### 12.1 Music (song objects for `game.audio.music`, with named layers for `audio.layer`)

| Song | Where | Character | Layers |
|---|---|---|---|
| "Thugby Turbo!" | title, menus | glam-rock stomp, 152 bpm, square lead, saw bass, handclaps; the crowd chants "THUG-BY!" on the 2 and 4 | `base`, `chant` |
| "Mud and Glory" | Muddington | brass-band march on pulses, 126 bpm | `base`, `drums` (in when the ball is in an opponents' 22), `hype` (a team's meter full / ON FIRE) |
| "Grumble Shanty" | Port Grumble | a shanty in a rolling 6/8 feel (steps: 3), accordion-ish pulse12 | same three |
| "Forge Floor" | The Furnace | industrial: low saw ostinato, anvil hits (noise + triangle ping), 132 bpm | same three |
| "Megadome Mayhem" | the final | minor-key, fast drums, arpeggios, 160 bpm | same three |
| "Half-Time Pub Piano" | halftime, clubhouse | honky-tonk, triangle + pulse | none |
| "Third Half" | credits | the club song, a babble choir over it | none |
| Stings (`audio.sting`) | | try fanfare; monster-hit brass stab; ON FIRE riff; yellow-card sad trombone; drop-goal ding-dong; victory jingle; defeat jingle; kick-off drum roll | |

### 12.2 Sound effects (`audio.define` voices)

Whistle (short, long, triple for full time), the HOOTER (a loud square and saw blare), tackle thud (low sine + noise),
big-hit crunch (noise burst + falling sine + boom), pass whoosh, catch slap, punt thump, grubber tap, ball bounce (a
hollow "bok": triangle 300→180), DOINK (triangle 1200 ringing), scrum engage crunch, ruck grunts (babble), air horn
(square chord), pie munch, turbo whoosh and sputter, super charge (a rising arpeggio), flame jet roar (filtered noise
sweep), lightning crack and thunder, chicken squawk (square, vibrato up and down), mud squelch, card ding and the crowd
boo, the slow hand-clap, menu select/confirm/cancel (engine presets).

### 12.3 Voices: Animalese-style babble

- Patch 4 gives `E.Dialog.onLetter(ch, i, text)`. `TT.babble.letter(ch, speaker)` plays one syllable per letter: letters
  map to semitone offsets (vowels lower and 30% longer), `freq = speaker.base × 2^(semi/12)`, a 45-75 ms voice of the
  speaker's wave (`sfx({ wave, freq, to: freq × 0.94, dur, vol, vib })`), louder and higher for capitals, a rise over the
  last three letters before `?`, a jump on `!`; spaces and punctuation are silent beats.
- Speakers: Barry (square, base 330, fast), Ros (triangle, 220, measured), Gristle (saw, 140, gravel: a second voice an
  octave down), Nigel (pulse12, 260, nasal), Big Dave (triangle, 160), each player (pitch from size and build:
  80-300), Nan (pulse, 380 with vibrato), Sir Rupert (square, 200, slow), Big Unit (saw, 70, one roar), the stadium PA
  (square, 180, with an echo: the same syllable 180 ms later at half volume).
- In play: players grunt short babble bursts on tackles, rucks and scrums; the referee babbles his calls; the crowd
  chants in a choir of five detuned voices on the beat (`audio.onBeat`).

### 12.4 The crowd

A looping bed of filtered noise whose volume follows excitement (ball near a try line, a line break, a big hit) with
swells, roars on scores, a groan on misses, boos on cards, the slow hand-clap at set kicks; a Crowd volume slider in
Sound.

---

## 13. Attract mode

- On `title` and `menu` (and `records`, `about`): 10 s without any input starts it. One `new E.Arcade(game, { id:
  'thugby', idle: 10, demo: 300, scores: 8, hud: false })`; those scenes call `arcade.attract(dt)` each step; when
  `arcade.phase` turns `'demo'` they `game.go('match', { attract: true })`; the director calls `arcade.endDemo()` and
  goes back to the title at its end (the `'scores'` phase then shows the records with `arcade.drawTable`); an exit by
  input calls `arcade.wake()`. Our own idle check (below) also counts mouse movement and sticks.
- It is a CPU vs CPU match (teams and venue rotate through all four venues across loops) with cheats on: no clock,
  hype on demand, events forced. A **director** (`game.script`) walks a showcase list, using the same `game.debug.force`
  calls as the dev panel, each step when the previous one finished (or 12 s passed):
  1. walk-out and kick-off; 2. a run with a sidestep and a fend; 3. a pass chain along the line with a dummy; 4. a
  MONSTER HIT and its replay; 5. a ruck with a jackal; 6. a knock-on and a scrum; 7. a kick to touch and a lineout; 8. a
  power-up thrown on and taken; 9. the venue's hazard; 10. THUNDER RUN to a try, the celebration, the replay; 11. the
  conversion in the kicker's camera; 12. a cheap shot behind the ref's back, then one he sees: a yellow card and the sin
  bin; 13. a player ON FIRE scoring; 14. a drop goal. Then the logo and the records for 8 s, then the title.
- Overlays: "DEMO" top centre, a blinking "PRESS ANY BUTTON" (or "CONTROLLER OR KEYBOARD REQUIRED" on touch-only), the
  logo small in a corner; the HUD and commentary as in a real match.
- Any input exits at once: a key, a mouse button or movement over 8 px, a pad button or a stick past 0.5, a tap. The
  exiting input is consumed (`consumeAll`) so it does not also pick a menu item. It returns to the title.
- Attract never writes saves or records and never runs in an AI Hub session.

---

## 14. Dev mode

### 14.1 The panel

- Pause menu → **DEV MODE** (in every pausable scene: matches and drills) turns dev mode on for the visit and opens
  the panel over the play. After that, ` (backquote) toggles it from the keyboard. Its JUMP tab reaches every other
  part of the game.
- A canvas panel, 10-foot sized (scale 1 rows, eight rows visible, scrolling), docked on the right 45% of the screen.
  Tabs: **TUNING · CHEATS · EVENTS · VIEW · JUMP** (L1/R1 or Q/E or click). D-pad or stick moves the focus; left/right
  changes a slider (held: repeats and speeds up); ✕ toggles or fires; □ resets the focused slider; △ switches
  **FROZEN** (the match stopped, `timeScale` 0, the default) and **LIVE** (the match runs; the panel stays and takes the
  mouse: hover focuses, drag a slider bar, click a tab, wheel scrolls); ○ / Esc closes.
- Every change applies at once to the running match (the simulation reads `TUNE.v`), and **RESET ALL TO DEFAULTS** sits
  at the top of TUNING (with a confirm press). Values are kept for the visit (and in `E.store` `thugby:tune` so a
  reload keeps them; the reset clears it).

### 14.2 TUNING (the most important gameplay variables)

| Key | Label | Default | Min | Max | Step |
|---|---|---|---|---|---|
| `runSpeed` | Run speed | 100 | 60 | 160 | 5 |
| `turboMult` | Turbo multiplier | 1.45 | 1 | 2.2 | .05 |
| `turboTank` | Turbo tank (s) | 3 | 1 | 8 | .25 |
| `turboRegen` | Turbo refill (/s) | .3 | .05 | 1 | .05 |
| `accel` | Acceleration | 850 | 300 | 2000 | 50 |
| `passSpeed` | Pass speed | 230 | 120 | 400 | 10 |
| `catchBase` | Catch chance | .95 | .5 | 1 | .01 |
| `pressurePenalty` | Catch pressure penalty | .12 | 0 | .4 | .01 |
| `tackleRange` | Tackle reach | 14 | 8 | 30 | 1 |
| `tackleBase` | Tackle success | .78 | .3 | 1 | .01 |
| `bigHitCharge` | Big hit charge time (s) | .7 | .2 | 2 | .05 |
| `bigHitLaunch` | Big hit launch | 1 | .2 | 3 | .1 |
| `spillChance` | Monster hit spill chance | .5 | 0 | 1 | .05 |
| `fendWindow` | Fend window (s) | .3 | .05 | .8 | .05 |
| `fendBeat` | Fend strength | .7 | 0 | 1 | .05 |
| `sidestepPower` | Sidestep power | 140 | 40 | 300 | 10 |
| `sidestepEvade` | Sidestep evade (s) | .25 | .05 | .6 | .05 |
| `diveRange` | Dive tackle reach | 30 | 10 | 60 | 2 |
| `kickMax` | Kick distance | 520 | 200 | 900 | 20 |
| `windMult` | Wind strength | 1 | 0 | 3 | .1 |
| `bounceChaos` | Oval bounce chaos | .6 | 0 | 1 | .05 |
| `ruckTime` | Ruck length (s) | 1.6 | .5 | 4 | .1 |
| `mashWeight` | Ruck mash weight | .05 | .01 | .12 | .005 |
| `scrumPushWeight` | Scrum push weight | .05 | .01 | .15 | .005 |
| `hypeMult` | Hype gain | 1 | 0 | 3 | .1 |
| `superTime` | Super length (s) | 4 | 1 | 10 | .5 |
| `powerupEvery` | Power-up every (s) | 30 | 5 | 120 | 5 |
| `hazardEvery` | Hazard frequency | 1 | 0 | 3 | .1 |
| `aiReaction` | CPU reaction (s) | .25 | 0 | 1 | .05 |
| `aiAggression` | CPU aggression | .5 | 0 | 1 | .05 |
| `cpuMash` | CPU mash rate (/s) | 9 | 2 | 20 | 1 |
| `refRange` | Ref sight range | 260 | 60 | 600 | 10 |
| `refFov` | Ref sight angle (rad) | 1.4 | .4 | 3.14 | .05 |
| `sinBin` | Sin bin (s) | 30 | 5 | 120 | 5 |
| `halfLength` | Half length (s) | 120 | 20 | 600 | 10 |
| `gameSpeed` | Game speed | 1 | .25 | 2 | .05 |

### 14.3 CHEATS (toggles)

God mode (my team cannot be tackled), infinite turbo, hype always full, always ON FIRE, ref blind (sees nothing), ref
strict (sees everything), CPU frozen, no clock, big heads (`headR` × 1.8 on every rig).

### 14.4 EVENTS (one press each; the same `game.debug.force(name)` the attract director and tests use)

Score a try (home / away), give P1 the ball, ball to the opponents' 5 m line, knock-on → scrum, touch → lineout, foul →
penalty (then the choice), yellow card, kick-off, 22 drop-out, a ruck now, monster hit on the carrier, spawn each
power-up, trigger the venue's hazard (and each other venue's), ON FIRE for P1's player, Thunder Run, Hurricane Hit,
replay the last 5 s, the hooter, skip to halftime, skip to full time, sudden death, set score (+5 / -5 each team),
set clock (-30 s).

### 14.5 VIEW (debug overlays) and JUMP

VIEW: AI shape slots and roles, the referee's cone (always), offside lines (always), tackle and fend ranges, pass lanes
and legal receivers, rig skeletons (`rig.debug`), the engine's frame-rate readout, slow motion (0.25x), frame step (□
advances one step while FROZEN), state readout (phase, timers, possession). JUMP: any cup round's match or cutscene, any
drill, the victory, the third half, the credits, a session-style match (halves 75 s, no replays).

---

## 15. Multiplayer

### 15.1 On its own: local play (1-4 on one machine)

- `game.allowJoin({ max: 4, onJoin })` on the join screen: Start on a free pad, or 2 for the keyboard's right half
  (patch 2's layouts). Each seat picks HOME, AWAY or CPU; in the cup everyone is on the Mudlarks (co-op).
- One shared screen (the broadcast camera follows the ball; nobody needs their own view). Each seat has its colour
  (`E.PLAYER_COLORS`), ring, chevron, HUD card and its own glyphs (its own device).
- Co-op (all humans on one team vs CPU) and versus (any split, CPU filling the rest). Each human controls one player at
  a time (§7.2). The pause says who paused (engine).

### 15.2 AI Hub sessions (the protocol at lib/hub/README.md)

**Mode: `shared-world`, 2-4 players.** One match, the host's copy runs it (all 14 players' rules, contact, AI, ball,
referee); every other copy sends what its player does and draws what the host sends. It is the most fun mode for a team
sport and the architecture (§4.1) is built for it. **Fallback:** if the 4-player lossy harness run still fails at the
end of M8, switch the declared mode to `parallel` (every player plays the same seeded 3-minute match against the CPU;
`progress` and `result({ score: points for - points against + 100 })`), which the same architecture supports with no
network code; record the decision in the About screen.

**Tags in `<head>`** (after the session client):

```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="2-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="4">
<meta name="hub:session-goal" content="Score more points than the other team">
<meta name="hub:session-howto" content="Stick/WASD run · L1/R1 or Q/E pass · ✕/Space tackle or step · ○/C kick">
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1-4">
```

**Flow:**
1. At load, `AIHub.active` (true from the first line) builds the game with session options: `pausable: false` on the
   match, `autoPause: false`, `corner: false`, `fullscreen: false` (the hub owns full screen), `menu: { quit: false,
   items: [] }`, no title, no attract, no saves, no records, no dev mode, no replays, no cutscenes, no pause.
2. `const info = await AIHub.connect({ mode: 'shared-world', seats: [2, 4], card: true })`; `null` → the normal game
   (title).
3. Setup from `AIHub.rng('setup')` (the same on every copy, no messages needed): the home side is the Mudlarks, the away
   side one of the four rivals, the venue one of four, the weather the venue's. Seats: even ids HOME, odd AWAY (2
   players 1v1, 3 players 2v1, 4 players 2v2); CPU fills the rest. Halves: `min(75, (limitMs / 1000 - 40) / 2.6)` s
   of running clock (75 when `limitMs` is 0); no sudden death (a draw is a tie).
4. Build the match (boot steps), then show **our card** (scene `card`) and call `AIHub.ready()` once, with no key press.
   The card: the venue at dusk, both teams lined up, each human's player in front with the hub name in the seat colour
   (`#e8443a`, `#3b82f6`, `#22c55e`, `#f5b700`) and a READY tick from the `card` event's `ready`; "HOW TO WIN: score more
   points than the other team"; this player's controls as badges for its device (five lines at most); the countdown
   from `card.left` ("STARTS IN 12"), "PAUSED: players asked for more time" while `paused`; the title music. Enter or ✕
   (button 0) or a tap on READY → `AIHub.answer('ready')`; △ (button 3), M, or a tap on MORE TIME →
   `AIHub.answer('more')`. Nothing on the card draws from `Math.random` (use `AIHub.rng('card')`).
5. `start` → a 3-2-1 countdown while `AIHub.time() < 0` (big numbers over the kick-off), the whistle at 0, play.
6. Full time (host): `AIHub.finish({ standings, scores, stats, awards })`: standings `[[winning side's ids], [losing
   side's ids]]` or `[[everyone]]` for a draw; scores `{ id: their side's points }`; stats per id (tries, tackles, big
   hits, metres); awards (Player of the Match, Biggest Hit). A last reliable snapshot `{ over: 1 }` first.
7. `time-up` → the host finishes at once with the current score (within `graceMs`).
8. `leave` → that seat's player goes back to the CPU; if a side has no humans left the match still runs to full time.
9. `end` → stop simulation, input and sound (`audio.stopMusic`, mute), show "FULL TIME" under the hub's results.
10. `AIHub.server` (a host with no player): run the same host code with no local seat; `draw` returns at once.

**Messages** (JSON; at most 20 a second leave a copy, bursts to 40; unreliable ones under about 1,200 bytes):

| Message | Direction | Reliable | Rate | Contents |
|---|---|---|---|---|
| `i` (intent) | client → host | no | 15/s | `{ t: 'i', s: seq, at: AIHub.time(), m: [mx, my] (×100 ints), h: held bits, p: [[action, at, id], ...] (presses of the last 1 s, deduplicated by id), pos: [x, y] when its player is free-running }` |
| `s` (snapshot) | host → all | no | 12/s | `{ t: 's', at, ph: phase code, c: clock×10, sc: [h, a], hy: [h, a], b: [x, y, z, state, holder], r: [x, y, f, down], P: [[id, x, y, z, f×100, st, ctl, anim...], ...14] }`, ints only, anim fields only when not default |
| `e` (events) | host → all | yes | ≤ 5/s, bundled every 200 ms | `{ t: 'e', l: [[id, name, data], ...] }`: scores, phase changes, set-piece setups (with their parameters and timestamps), cards, banners, power-ups, hazards, commentary keys, `over` |
| `ctl` | host → one | yes | on change | which on-field player the seat now drives |

- **Client-side feel:** like the hub's arena example, each copy moves its own controlled player at once from its own
  stick while that player is free-running (`idle/run/carry/charge`) and reports `pos`; the host takes that position
  (clamped to what the player could have run since the last report, +20 u) and decides everything else: contact, the
  ball, the laws. When the host puts the player into any other state (tackled, ruck, scrum...), the client follows the
  host's state and eases its drawn position to the snapshot's.
- **Everyone else on a client** is drawn from snapshots interpolated 120 ms behind (positions lerp, facing by the short
  arc, discrete states switch at snapshot boundaries); the same presentation code as live play draws them (rigs from
  the `anim` record, §11.1). Events trigger the same commentary, sound, banners and particles locally. No snapshot for
  1 s: a small "WAITING FOR THE HOST..." note.
- **Timing mini-games online:** the host stamps each set piece's key moment (scrum SET, lineout throw arrival, kick-off
  catch) with `AIHub.time()` in its event; clients show the cue against their own `AIHub.time()` and send their press
  with its `at`; the host judges the press by `|at - T|` (the hub keeps clocks within about 15 ms).
- **Snapshot budget:** 99% of snapshots ≤ 1,100 bytes (tested, §19.3); if a build exceeds it, send players 0-6 and 7-13
  in alternate snapshots.
- **Rules in a session:** no network but the hub; no chat, emotes or custom names (names from the hub, never inserted
  as HTML: the pixel font draws them, accents stripped with `normalize('NFD')` and any other character it lacks shown
  as a dot); no `alert`, `confirm`, `prompt`, `window.open` or navigation; no title, restart
  or quit; Options is ignored while Create is held; no hit-stop (`game.freeze` would stall the host's sends: hits use
  `particles.impact`, sparks, shake and a sound instead, and each copy may hold its drawn frame for 60 ms); nothing
  outside a session changes.

---

## 16. Settings and accessibility (own settings via `menu.settings`)

| Key | Group | Label | Options (default first) |
|---|---|---|---|
| `glyphs` (override) | Display | Controller buttons | PlayStation ✕ ○ □ △ · Xbox A B X Y |
| `uiScale` | Display | TV text size | Large · Normal (Large raises HUD prompts to scale 2 and the shell CSS above) |
| `camera` | Display | Camera | Broadcast · High · Overhead (the views of §5.3; R3 and V cycle them in play) |
| `difficulty` | Game | Difficulty | Pro · Rookie · Legend |
| `halves` | Game | Half length | 2 min · 3 · 4 · 5 |
| `suddenDeath` | Game | Sudden death in Exhibition | On · Off |
| `autoSwitch` | Game | Auto-switch | Assisted · Full · Manual |
| `passAssist` | Game | Pass assist | On · Off |
| `turboMode` | Game | Turbo | Hold · Toggle |
| `commentary` | Game | Commentary | On · Text only · Off |
| `replays` | Game | Replays | Big moments · All tries · Off |
| `refCone` | Game | Show the ref's view | On · Off |
| `bigHeads` | Game | Big heads (after the cup) | Off · On |
| `crowd` | Sound | Crowd volume | slider .8 |

The engine's standard settings stay (volume, music, effects, reduce motion, shake, flashes, pixel scaling, filter,
frame rate) and are honoured: shake, flash and zoom punches go through `game.shake` / `game.flash` / tweens that check
`game.reduceMotion`. Information is never in colour alone: teams have crests and three-letter names, seats have labels,
lines have words.

---

## 17. Build order and milestones

Each milestone ends with its tests passing (`node test/run.mjs`) and, where it says so, screenshots looked at. Do the
riskiest work first (M1-M2.5).

| M | Build | Exit criteria |
|---|---|---|
| **M0 Scaffold** | the dev folder; copy the engine, tools and `package.json` (`npm install`; Playwright's Chromium is already cached on this machine at `~/.cache/ms-playwright`, else `npx playwright install chromium`); fetch `session.js`, `harness.html`, `bridge.js`, `round.js` (`curl -fsSO https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/<file>`); `build.mjs`, `page.html` with the hub tags; the vm loader and `test/run.mjs`; a placeholder-free stub (a title scene with the logo). Practical notes: `/tmp` on this machine was full during planning, so keep scratch files in the dev folder; take the engine's `dist/handoff` with `git clone --depth 1` of my-3d2dge (about 150 MB) and the hub files with `curl` (the ai-hub repository is over 5 GB: do not clone it) | `node test/run.mjs` prints `N passed, 0 failed`; the built HTML passes `tools/check.mjs`; a test asserts the session client is the first script in `<head>` and unmodified |
| **M1 Pitch, players, ball (spikes)** | geometry, TileMap, `floorTex` lines, posts, stands, boards; the `broadcast` view; 14 dressed Humanoids in formation; one human-controlled player with turbo; the carry pose; the loose oval ball, pick-up; the camera; the radar. **Spikes:** a superman dive (`down: 1` at height) and the tackle as a paired `E.Action`; `r.pick` on a teammate; 14 rigs + crowd on screen | ball physics tests; screenshots of the pitch in three views at 1280x720 and 1920x1080 look like a broadcast; the dive and tackle filmstrips read |
| **M2 Core loop** | passing (L1/R1, legal receivers, catches, knock-ons), the tackle → simple ruck → recycle, tries and grounding, conversions (simple), kick-off (simple), the clock, halves, hooter, full time; attack and defence shapes; auto-switch; `MatchState` and intents in place | a CPU v CPU match plays to full time with scores and no stalls (watchdog never fires); a scripted human scores a try |
| **M2.5 Net spike** | `MatchState` snapshot encoding; the fake hub (in-process, latency/jitter/loss); host + one client in Node: the client's intents move its player, its snapshots draw | the loopback test passes; snapshot size test passes |
| **M3 Laws and set pieces** | forward pass, knock-on → scrum; touch → lineout; set kicks with the kicker camera (yaw spike); penalties and the choice; free kicks; drop goals; 22 drop-outs; the referee (runs, sees, calls, signals); offside lines; advantage; cards and the sin bin; penalty try; "use it" | law and set-piece tests; CPU v CPU matches visit every set piece (coverage) |
| **M4 Arcade layer** | sidestep, spin, fend, dummy, offload, interceptions; big and monster hits; dive and gang tackles; cheap shots; hype and supers; ON FIRE; power-ups; the four hazards and weather; ref down; instant replay | a test per system; across 20 seeded CPU matches with forcing, every event fires |
| **M5 Presentation** | the full HUD with badges; commentary and babble (patch 4); music and SFX; crowd; lights; effects; every animation in §11.2 polished; venue dressing (boards, floodlights, jumbotron, skylines); patches 1 and 3 | `tools/check.mjs` look notes acted on; screenshots of each venue, set piece and HUD state reviewed; filmstrips of every move reviewed |
| **M6 Modes and content** | title, menu, cup hub, the story scenes and sets, halftime talks, results, victory, third half, credits; Exhibition setup; the join screen and local multiplayer (patch 2); the Training Ground's nine drills with SHOW ME; records and initials; About & Credits; saves and CONTINUE; unlocks | the scripted full playthrough passes (§19.4); save and continue tests pass |
| **M7 Platform** | the attract mode and its director; touch-only mode; dev mode (panel, tuning, cheats, events, view, jump, hotkeys); own settings and the glyph override; the TV CSS for the shell; device-following prompts everywhere | attract, dev, glyph and touch-only tests pass |
| **M8 AI Hub** | session options; connect; our card; host, client and server paths; intents, snapshots and events; finish, time-up, leave, end | the loopback suite (4 players, 150 ms ± 50, 5% loss; host leave; server) passes; the real harness passes in all four configurations (§19.6); standalone still plays |
| **M9 Balance, polish, ship** | tune with the dev panel to the targets in §19.7; difficulty through the cup; a bug bash; final About text and exit interview | every test passes; the final HTML checked in Chromium (no errors); the About screen's text is real; `exit-interview.json` parses |

---

## 18. Risks and how to de-risk them

| Risk | Why it is risky | De-risk |
|---|---|---|
| The AI plays like bees round a jam pot | 14 players chasing the ball look nothing like rugby | role slots and "only two chase" (§7.19) from M2; metric tests (defensive line spread ≥ 300 u across 6 players, support depth behind the carrier, no more than 3 players within 40 u of the ball in open play 90% of the time) |
| Phases that never end | a ruck with nobody committed, a ball stuck under a pile, a set piece waiting forever | a watchdog on every phase (§7.1); tests fail on any watchdog; the attract director doubles as a soak test |
| Tackles, dives and scrums look wrong | rigs are procedural; flat dives and binds are new | M1 spikes; paired `E.ACTION`s; filmstrip reviews; fallbacks: the engine's `down` and `getUp`, `crouch` and `lean` alone |
| Clutter at 427x240 with 15 rigs and a crowd | the player loses the ball and himself | contrasting kits (luminance rule), seat rings, x-ray outlines, the ball carrier outline, zoom .9, the radar, off-screen arrows; screenshot review in M1 and M5 |
| The backwards-pass rule frustrates | new players pass forward and get whistled | receivers are chosen behind by default; the L1/R1 badges show only legal receivers; the mouse hover shows red for forward; drill 2 teaches it |
| Online shared world | lag, loss, a contact sport, timing mini-games | the state/presentation split from M2; the M2.5 spike; client-moved own player; time-stamped presses; ints in snapshots; the loopback suite; no replays or cutscenes online; fallback to `parallel` (§15.2) |
| Hub compliance traps | the engine pauses, quits, goes full screen and stores by default | the session option list (§15.2); harness runs early in M8 (a minimal card can be tried at M2.5) |
| Glyphs and fonts | the font lacks PS symbols; pads report odd names | patch 1; badges; label tests with `input.glyphs` both ways |
| Determinism and flaky tests | randomness and timing | `TT.rng` only in the simulation; fixed seeds in tests; no wall clock in the simulation |
| The single-file bundle | script order, the session client first, `</script>` in strings | `build.mjs` checks; a test parses the final HTML; `tools/check.mjs` on the final file |
| Slow headless tests | rigs cost time | `TT.cfg.present = false` headless |
| Scope | a lot of content | the order above makes the game whole by M4; content after; every system stays even if story lines get shorter |
| Touch-only false positives | touch laptops | require no fine pointer; leave the mode on any key, mouse or pad |

---

## 19. Testing

### 19.1 One command

`node test/run.mjs` (from the dev folder) rebuilds, runs every headless suite, and prints **only failures** (`FAIL
suite › case: message`) and **one line**: `N passed, M failed (S suites, T s)`; exit code 1 on any failure. `--only
<suite>` reruns one suite (rerun a suite only after changing the code it covers). `--browser` adds the Playwright
checks, `--hub` the AI Hub harness runs (both print the same way). Tests are scripts that play the game and check its
state through `game.advance` and `game.debug`; screenshots only for what a script cannot check; no subagents or
workflows to debate, review, judge or audit (TASK.md).

### 19.2 The harness

`test/lib/load.mjs` creates a `vm` context with stand-ins (`window` = the context, `addEventListener`,
`removeEventListener`, `location { hash, search }`, `matchMedia(() => ({ matches: false }))`, `navigator {
getGamepads: () => [] }`, `performance`, a quiet `console`), runs `engine/my-3d2dge.js` then `build/game.js`, and
returns `{ game, TT, E }` (no DOM, so the engine is headless). Helpers: `snap()`, `advance(s)`, `tap(action, seat)`,
`hold(action, on, seat)`, `feed(pointer events)`, `untilPhase(name, maxS)`, `playMatch(opts)` (CPU v CPU or autopilot),
`fakeHub(n, { latency, jitter, loss, server, hostLeave })` (several contexts wired through an in-process network with
`AIHub` stand-ins that implement `connect`, `ready`, `answer`, `time`, `on`, `send`, `finish`, `rng`, `active`).

### 19.3 Suites (what each checks)

| Suite | Checks |
|---|---|
| `boot` | boots headless with no errors; every scene enters and exits cleanly; `game.debug.snapshot()` fields present; the final HTML has the session client first, unmodified, and every hub tag |
| `ball` | pass arcs land within 4 u of the lead point; punts land within 5% of their predicted spot without wind; the oval bounce stays within its angle and height bounds and is the same for the same seed; touch at the right x; dead-ball → drop-out |
| `laws` | backward and flat passes legal; forward (relative to the passer) whistled; a sprinting lateral pass legal; knock-on → scrum to the other team; tries only when grounded in the in-goal; 5/2/3/3/7 scoring; conversion geometry (in line with the grounding); the hooter waits for a stoppage; sudden death ends on the first score |
| `contact` | tackle success over 400 seeded tries within ±5% of the formula; big hits launch beyond 30 u; the fend window beats tackles at the expected rate; a sidestep makes tackles whiff; BIG UNIT needs two tacklers; a cheap shot seen (ref facing) is a penalty and unseen (ref turned away) is not |
| `breakdown` | ruck results match §7.8's worked example (two attackers against one: a human at 0/s loses to a CPU at 9/s, at 12/s beats a CPU at 6/s); jackal swing; hands in the ruck; "use it" → scrum; offside flagged only when seen |
| `setpieces` | scrum timing windows (perfect, good, early engagement → free kick); push outcomes; pushover try; lineout calls, steals and not straight; kick-off ten metres; shot clock; penalty choices each lead to the right restart |
| `arcade` | hype gains per event; each super starts, works and ends; ON FIRE starts on the second try and ends on the opponents' score; each power-up spawns, is taken and expires; each hazard warns then strikes and drops a carrier's ball; ref down silences fouls for 8 s |
| `ai` | 30 seeded CPU v CPU matches (30 s halves): no watchdog, no errors, scores 0-80 a side, tries per match 2-14 on average 4-9, both teams pass, tackle, kick, ruck and scrum; shape metrics (§18); the AI never stands offside at a set piece |
| `control` | auto-switch modes; L1/R1 and ○ switching; mouse click on a teammate passes or switches; a seat never takes a player held by another seat |
| `input` | `label()` gives ✕ ○ □ △ by default on a pad, A B X Y after `settings.set('glyphs', 'xbox')`, keys on the keyboard; prompts change with `lastDevice`; half-keyboard layouts (patch 2) map as §6.3; the font draws ✕ ○ □ △ (patch 1: no `?` glyph used) |
| `replay` | the ring buffer holds 5 s; a replay plays and the match resumes exactly where it was |
| `proof` | the kit-style proof: a scripted 600-step match from seed 7 gives the same hash twice |
| `drills` | each drill completes with its `auto` script; each one's failure path resets |
| `attract` | 10 s of idle on the title starts it; a 4-minute attract loop fires every showcase step once; a key, a pad button and a mouse move each return to the title without picking anything; touch-only mode shows the message and still runs it |
| `dev` | DEV MODE from the pause menu opens the panel; each slider changes `TUNE.v` and the simulation (run speed → measured speed); reset restores every default; each cheat and event works |
| `saves` | the cup autosaves; CONTINUE resumes at the right round; records and unlocks persist; a bad save falls back |
| `local` | four seats join (pads and the right keyboard half); 2v2 and co-op matches run with each seat driving its own player |
| `net` | loopback: 2 players clean; 4 players at 150 ± 50 ms and 5% loss for 60 s of play; clients' players move from their intents; snapshots ≤ 1,100 bytes 99% of the time and under 12/s; events arrive once; `finish` once with valid standings at full time; `time-up` finishes within grace; a leaver's player goes CPU; host leave ends cleanly; server mode runs with no local seat; card answers ready on Enter; no `Math.random` use on the card |

### 19.4 The scripted playthrough of the whole game

`playthrough.test.mjs`: title → PRESS START → menu → MEGA CUP → prologue (pages turned) → TRAIN → each of the nine
drills by its `auto` script → pre-match scene → round one played honestly by the autopilot (the human seat driven by the
CPU brain through the intent interface, like the sports kit's `bot()`; halves 30 s) until won (retry with CONTINUE if
lost; the test fails after three losses) → results → cup hub (autosave checked) → quarter-final, semi-final and grand
final (halves 30 s; god mode allowed for the final only, so the boss's gang-tackle rule is still exercised by the CPU)
→ victory → third half → credits → title. It asserts the scene order, the saves, the unlocks, and no errors or
watchdogs anywhere.

### 19.5 In a browser (what scripts cannot check)

- `node tools/check.mjs <final html>` (and `#scene` deep links: `#match`, `#cup`, `#training`, `#attract`): no errors,
  look notes acted on; `--size 1920x1080` and `--size 390x844@3` (touch-only screen).
- Screenshots to look at (once per milestone that changes them): each venue in each view; kick-off, ruck, scrum,
  lineout, set kick, penalty choice; a monster hit; a replay; the HUD with 1 and 4 seats; each menu screen; the dev
  panel; the hub card; results; credits.
- Filmstrips (`tools/filmstrip.mjs --seed 1`) of every move in §11.2.
- A pad by hand if one is available (else `input.press('Pad0')` scripted in Playwright).

### 19.6 The AI Hub harness

Serve the dev folder's `hub/` (holding the harness files and a copy of the built HTML) with `python3 -m http.server 0
--bind 127.0.0.1` (note the port it prints and its PID), fetch the copied HTML from that port and check its `<title>`
is "Thugby Turbo" (another agent's server may hold a port: never trust a page you have not checked), then with
Playwright open `harness.html?game=<html>&players=2&auto=1`; `&players=4&latency=150&jitter=50&loss=5&auto=1`;
the same with `&scenario=host-leave`; and `&players=2&scenario=server`. Wait for `document.body.dataset.complete ===
'true'`; pass when `window.__hubCheck.pass` is true; print failing checks only. Stop only the server you started, by its
PID. Then open the HTML on its own to confirm it still plays outside a session.

### 19.7 Balance targets (tuned with the dev panel, measured by the `ai` suite and by hand)

A Pro v Pro CPU match: 4-9 tries, 60% of conversions, 1-3 monster hits, 2-4 scrums, 2-4 lineouts, a card every two or
three matches, a power-up taken every 40 s. A new human on Pro wins round one about four times in five and loses the
final at the first try about half the time. Turbo runs out in about one long break. A big hit should feel like an event,
not every tackle.

---

## 20. About & Credits screen and the exit interview

- **About & Credits** (`about` scene, five pages at scale 1-2, L1/R1 or left/right, ✕ closes):
  1. THUGBY TURBO: made with the my-3D2dge engine v0.85.2 (`E.versionLabel()`), the AI Hub session client 1.4.0; by
     the model that built it; the title's RNG pick; "an original game inspired by rugby; every team, person and place
     is made up".
  2. SOURCE INFORMATION: Date 2026-11-03 17:48:28 · Source: rugby (over-the-top arcade style) · Plan: PLAN.md · Genre
     and perspective · Tech · Art direction · Animation · Audio · Online · Testing · Research · Environment · Model ·
     Usage (estimates only if available; "unknown" otherwise).
  3. TESTING FEEDBACK (the four answers). 4. ENGINE FEEDBACK (the six answers, including the patches and why). 5. PROMPT
     FEEDBACK (the four answers).
  The builder writes these from the real build at the end (M9); "unknown" for anything that can't be confirmed. The
  same text goes in the final chat reply.
- **`exit-interview.json`** in this folder, beside the HTML, in exactly TASK.md's shape; suggested `aiHub` values:
  name "THUGBY TURBO", tagline "Big hits, bigger hair, seven a side", description "Over-the-top arcade rugby sevens:
  turbo runs, monster hits, a referee who only sees half of it, and a pub team's run at the Mega Cup.", type "Game",
  genre "Sports", source "Rugby", series "", players "1–4", controls "Stick or WASD run, L1/R1 or Q/E pass, ✕ or Space
  tackle and sidestep, ○ or C kick, R2 or Shift turbo, △ or R super", tags `["sports", "arcade", "comedy", "pixel art",
  "versus", "co-op"]`. Check it parses (`node -e "JSON.parse(require('fs').readFileSync('exit-interview.json','utf8'))"`).

---

## 21. Definition of done

- [ ] `ThugbyTurbo-Rugby-claude-opus-5-5-max-20261103-174828.html` in this folder plays from `file://` with no errors;
      the dev subfolder holds the sources, tests and tools.
- [ ] Every system in §7 works in play and is shown by the cup, the drills or the attract mode; nothing is stubbed; no
      TODO or placeholder text anywhere (grep the sources for TODO, FIXME, TBD, lorem, placeholder).
- [ ] Mega Cup (prologue, training, four matches, victory, third half, credits), Exhibition (any teams, venues,
      weather, 1-4 players), Training Ground, Records, Settings, About & Credits all reachable and complete.
- [ ] Controller-first 10-foot UI; PlayStation glyphs by default, Xbox in Settings; keyboard and mouse native; prompts
      follow the last device; touch-only screen with Settings; attract mode after 10 s, any input exits.
- [ ] Dev mode from the pause menu: live sliders for §14.2, reset to defaults, cheats, events, overlays, jumps.
- [ ] All audio in code; babble voices for every speaker; music per scene with layers.
- [ ] Local multiplayer 1-4; AI Hub shared-world passes the harness in all four configurations; outside a session the
      game is unaffected.
- [ ] `node test/run.mjs` passes, including the scripted playthrough; browser checks and screenshots reviewed.
- [ ] Engine patches listed in `engine/PATCHES.md` and in Engine Feedback.
- [ ] About & Credits pages and the chat reply carry Source Information, Testing, Engine and Prompt Feedback;
      `exit-interview.json` parses.
