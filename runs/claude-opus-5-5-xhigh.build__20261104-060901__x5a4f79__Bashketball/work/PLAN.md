# BASKETBLAM

**Over-the-top 2-on-2 arcade basketball. No fouls. No mercy. All BLAM.**

This is the build plan for the demo TASK.md describes. It is written for the developers (people or AI models) who will
build the game from TASK.md and this file alone, without the planner. Read TASK.md first, then this file once, top to
bottom; after that use it as a reference. Everything here is a decision, not a menu: where a number is given, start
with it and tune it with the dev sliders (§14). Where this file and TASK.md disagree, TASK.md wins.

---

## 0. At a glance

| | |
|---|---|
| Title | **BASKETBLAM** (on screen); `Basketblam` in file names |
| Genre | Arcade sports: 2-on-2 basketball in the over-the-top arcade style, with a short story ladder |
| Perspective | Side-on **broadcast camera**: a custom orthographic view, pitch 30°, the court running left to right, panning with the ball; a dunk cam that zooms; a "High" camera option |
| Players | 1–4 on one machine (gamepads and a shared keyboard); 1–4 online in AI Hub sessions (shared world) |
| Modes | Blam Tour (story, 4 games), Exhibition (any teams and courts, 1–4 players), Blam Camp (interactive tutorial), Hall of Blam (records), How to Play, Options, About/Credits; attract mode; dev mode; AI Hub "Showdown" |
| Content | 5 courts, each with its own twist; 6 teams (4 street crews, a robot boss team, a secret team), 18 players and 5 story characters; 12 dunks; 6 power-ups; 10 tutorial lessons; 15 story beats; ~200 announcer lines; 12 songs and 8 stings; about 55 sound effects; 21 voice profiles |
| Tech | my-3D2dge v0.85.2 (full engine, our modified copy), AI Hub session client 1.4.0, plain JavaScript, Canvas 2D, Web Audio; Node 24 + Playwright 1.63 for tests |
| Deliverable | one self-contained HTML file in the root, plus `exit-interview.json` beside it |

**The core loop, in one sentence:** get the ball, beat your defender with turbo, spin moves and passes, and finish with a
dunk that leaves the atmosphere or a jumper released at the top of the jump; on defense swipe, swat and shove (it's
legal); score three straight and you go **SUPERNOVA**.

**Pillars** (use them to settle any question this plan doesn't):
1. **Every possession can end in spectacle.** Dunks, blocks, shoves and steals are big, readable and loud.
2. **Simple buttons, real timing.** Four main buttons; skill lives in release timing, turbo management, alley-oop
   timing and steal angles.
3. **Personality everywhere.** Two hype announcers, trash talk, courts with twists, a crowd that reacts.
4. **Couch first, 10 feet away.** Up to four on one screen, a TV-readable HUD, controller-first menus.

---

## 1. Title, names and folders

- **Title: BASKETBLAM.** Picked as TASK.md asks: fifty riffs on "basketball" were brainstormed and one was chosen with a
  real random number generator (Python `secrets.randbelow(50)` returned 18). Do not re-pick it.
- **SOURCE token** in file names: `Basketball`.
- **Names for this TASK.md** (copy them exactly):
  - dev folder: `Basketblam-Basketball-claude-opus-5-5-max-20261103-174822/` (in the root, beside TASK.md)
  - deliverable: `Basketblam-Basketball-claude-opus-5-5-max-20261103-174822.html` (in the root)
  - exit interview: `exit-interview.json` (in the root, beside the HTML)

  If your TASK.md names another model or timestamp, use your TASK.md's names with the same `Basketblam` and
  `Basketball` tokens.
- **Dev folder layout:**

```
Basketblam-Basketball-claude-opus-5-5-max-20261103-174822/
  handoff/            pristine copy of my-3d2dge dist/handoff (docs, tools/check.mjs, filmstrip.mjs, asset tools)
  engine/my-3d2dge.js our modified engine (every change marked /* BASKETBLAM: ... */)
  vendor/aihub-session.js       AI Hub client 1.4.0, byte for byte
  vendor/hub-harness/           harness.html, bridge.js, round.js (tests only, never bundled)
  src/*.js            the game, as numbered fragments (§4.2)
  tools/build.mjs     concatenates src into build/game.js, writes build/index.html and the root deliverable
  tests/run.mjs       the one test command (§19); tests/*.test.mjs; tests/helpers.mjs; tests/fakehub.mjs
  build/              generated: game.js, index.html (dev page), hub/ (served for harness tests)
  check-output/       screenshots and filmstrips for review (generated)
  package.json        { "type": "module", devDependencies: { "playwright": "1.63.0" } }
```

---

## 2. Genre, perspective and look

**Genre: arcade sports, 2-on-2 basketball.** The over-the-top arcade style is defined by two-on-two, turbo, legal
contact, impossible dunks, a hot-streak power and loud personality. Those live best in short matches; a four-game story
ladder (the Tour) gives the demo an arc and story beats; Exhibition, local multiplayer and online show the rest.

**Perspective: a side-on broadcast camera.** `const BROADCAST = new E.View('broadcast', 'Broadcast', 0, 30, 1, 1)`: yaw
0, pitch 30°, one screen pixel per world unit. The court's length runs left to right (world x), the camera sits beyond
the near sideline looking across it, and pans horizontally with the ball. Why: the race up and down the court reads
left/right, dunks and blocks read in height at a low pitch (z is drawn at cos 30° = 0.87, the court's depth at
sin 30° = 0.5), and below pitch 40 the engine draws rigs from the view itself, so jump poses read. The engine's
`'threequarter'` view (pitch 55) is offered as Settings → Camera → High; every custom draw uses `r.w()` projection so
both views work (yaw is 0 in both, so the depth rules in §9 hold in both).

**Look: the engine's native HD style, pushed to "90s arcade broadcast".** `res: 'ps1'` with `expand: true`; HD
Humanoids at size 1.6–1.95 (players 48–56 world units tall, about 42–48 px on screen); textured court floors painted by
`floorTex`; an `E.Backdrop` plus hand-drawn silhouettes behind every court; 3–8 props per screen; canvas lighting on
every court; `E.font.title` logos and comic banners ("BLAM!", "REJECTED!"); particles, hit-stop, shake and flashes on
every impact; broadcast graphics (a score bug, lower-third captions with live portraits). Saturated team colors, neon
at the night courts, chunky outlines. Compare screenshots with PS1-era 2D, not NES.

---

## 3. Tech stack and setup

- **Engine:** my-3D2dge **v0.85.2** (planned against repo commit `4390a985`, 2026-11-03), the full readable engine from
  `dist/handoff/my-3d2dge.js` (it already contains every module, including `arcade`). We change it where the game needs
  (§5). If the repository has moved on, read the newer handoff `README.md` and `CHANGELOG.md` head for breaking changes.
- **Online:** AI Hub Session Protocol v1, client **1.4.0** (`lib/hub/session.js`, ai-hub commit `f8835e48`), pasted
  unmodified as the first script in `<head>`, right after `<meta charset>`.
- **Code:** plain JavaScript in one IIFE (`const E = My3D2dge` first), no frameworks, no runtime network requests, no
  CDN at runtime (the hub forbids network traffic outside the hub; the bundle must be self-contained).
- **Tests:** Node 24 (`node:vm` headless runs), Playwright 1.63.0 with Chromium (the handoff's pin) for browser checks,
  `python3 -m http.server` for the hub harness.

**Setup (from the root folder):**

```sh
DEV=Basketblam-Basketball-claude-opus-5-5-max-20261103-174822
mkdir -p $DEV && cd $DEV
git clone --depth 1 --filter=blob:none --sparse https://github.com/michaelcrosato/my-3d2dge.git .engine-src
git -C .engine-src sparse-checkout set dist/handoff && cp -r .engine-src/dist/handoff handoff && rm -rf .engine-src
mkdir -p engine vendor/hub-harness && cp handoff/my-3d2dge.js engine/my-3d2dge.js
B=https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub
curl -fsSL $B/session.js -o vendor/aihub-session.js
for f in harness.html bridge.js round.js README.md; do curl -fsSL $B/$f -o vendor/hub-harness/$f; done
npm init -y >/dev/null && npm pkg set type=module && npm install -D playwright@1.63.0
npx playwright install chromium     # skip if ~/.cache/ms-playwright already has a matching chromium
```

**Read before coding** (in `handoff/`): `README.md`, `API.md` (whole), `kits/sports.js` (whole: our starting point for
the ball, passes, `E.arc` lobs, formations, `allowJoin`, the proof and the bot), `game/test.mjs` and `kits/test.mjs`
(headless testing), `docs/ASSETS.md` (whole, before writing any shape), and grep `API-INDEX.md` for names.
`vendor/hub-harness/README.md` is the hub protocol: read it whole before §15's milestone.

**Environment rules** (from TASK.md, made concrete):
- Read only what you need; other agents share the parent directory, the machine's ports and its processes.
- Prefer `file://` pages and the engine's headless tools. The hub harness needs a server: bind
  `python3 -m http.server 0 --bind 127.0.0.1` (the OS picks the port; parse it from the server's first line), fetch
  `/game.html` and check its `<title>` is Basketblam's before trusting a result, and stop only that server, by its PID.
  Never `pkill`, `killall`, `fuser -k`, or kill whatever holds a port.
- /tmp was 99% full on this machine while this plan was written. If npm, git or Playwright fail with `ENOSPC`, export
  `TMPDIR=$PWD/.tmp` (inside the dev folder) and delete that folder when done.
- Don't use subagents or workflows to debate, review, judge or audit (TASK.md).

---

## 4. Architecture

### 4.1 Shape of the program

One `E.Game`, a set of scenes, and game systems that are plain objects working on one match state. The match
simulation never reads devices directly: every player slot reads a **command** each step from an **input source**
(local device, CPU brain, network, attract director). That one rule gives local multiplayer, AI teammates, the attract
mode, the dev mode's autopilot, the test bots and online play for the same code.

```js
const HUB = !!(window.AIHub && AIHub.active);               // true from the first line inside a hub session
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: BROADCAST, views: ['broadcast', 'threequarter'],
  bg: '#05040a', id: 'basketblam', input: KEYS, autoPause: !HUB,
  menu: HUB ? false : { items: pauseItems, settings: GAME_SETTINGS, controls: CONTROL_NAMES, quit: 'title' } });
```

`pauseItems` is a function returning the list for the current context (the Shell evaluates `menu.items` when the pause
screen opens and skips falsy entries; confirm in `Shell` around "`name === 'pause'`" and patch the engine if it does
not). Items: `How to Play`, `Restart Game` (matches only), `Skip Cutscene` (story only), `Dev Mode`.

### 4.2 Modules (src fragments, concatenated in this order into one IIFE)

| File | Holds |
|---|---|
| `00-core.js` | `E` alias, constants (§6.1), `HUB` flag, the `game`, input preset `KEYS`, settings specs, the shared state `S`, the event bus, RNG streams, registries (`def`, `get`, `all`) |
| `01-tuning.js` | `TUNING` defaults, live values and slider metadata (Appendix A); `tune(key)` reads; `resetTuning()` |
| `02-data-teams.js` | teams, players (ratings, rig specs, voices, taunts, celebrations), NPCs |
| `03-data-courts.js` | courts (palette, floor style, backdrop, props, crowd, lights, music, twist), arena layout |
| `04-data-story.js` | the Tour, story beats (scripts), matchup trash talk, halftime gags, sponsor cards, credits and About text |
| `05-data-lines.js` | announcer line banks by event |
| `06-data-moves.js` | animation clips, dunk catalog, taunts, power-ups, cheat codes |
| `10-audio-music.js` | songs, stings, dynamic layers, crowd ambience |
| `11-audio-sfx.js` | sound definitions (`audio.define`), material-aware dribble, sound policy |
| `12-audio-voice.js` | the gibberish voice synth (§12.3) and its Dialog/caption hookup |
| `20-court-build.js` | arena TileMap, floor painting (lines, logos), stands, collision bounds, shapes for props |
| `21-court-draw.js` | hoops (stanchion, cheated backboard, rim halves, net simulation, shatter), crowd, backdrop silhouettes, lights |
| `22-twists.js` | Jackpot Spot, wind, oil slicks, eruptions and steam vents, Dome pyro, boss mechanics |
| `30-ball.js` | ball states, flight, floor/rim/backboard collisions, scoring detection, net contact, trails |
| `31-player.js` | player entity: body, ratings, state machine, turbo, juice, power-up effects |
| `32-anim.js` | rig factory (dressing), pose layer over `solvePose`, clips, dribble sync, dunk choreography |
| `33-actions.js` | shot model, passes and alley-oops, steals, shoves, spin moves, blocks, goaltending, rebounds |
| `34-ai.js` | CPU brains (offense, defense, rebounding, teammate commands), difficulty, comeback |
| `35-match.js` | match flow (tip-off, quarters, clocks, possession, inbounds, overtime), Supernova, shatter pause, power-up spawner, stats, style points |
| `36-fx.js` | camera director, dunk cam, banners, particle recipes, rumble, comfort-setting policy |
| `40-ui-kit.js` | 10-foot widgets (focus, cards, buttons, sliders, toggles, pips), glyph icons, prompt lines, mouse hover/click |
| `41-hud.js` | score bug, player plates, indicators, captions, warnings |
| `42-screens.js` | title, main menu, join, team/lineup/court select, matchup card, quarter breaks, results, Hall of Blam, How to Play, About/Credits, touch-only notice |
| `43-tour.js` | tour map, cutscene runner, tour progress and saves, ending, unlocks |
| `44-camp.js` | Blam Camp lessons |
| `45-attract.js` | idle detection and the attract director |
| `46-dev.js` | dev panel, overlays, scene jumps, cheats |
| `50-hub.js` | AI Hub integration (card, host, client, server, leave, time-up, end) |
| `90-start.js` | scene table, boot steps, deep links, `game.debug`, `window.__bb`, `game.start` |

Rules: content never edits systems (systems read registries); systems talk through the event bus; anything a test or
the dev panel needs is reachable from `window.__bb`.

### 4.3 One step (1/120 s) of a match

1. **Commands:** for each of the 4 player slots, its input source writes a `Cmd` (below).
2. **Players:** state machines consume commands; locomotion; actions start (shots, passes, steals, shoves, spins,
   jumps); bodies move (`E.Body.update` against the arena map); rigs update (§7).
3. **Ball:** attached (held/dribbled) or simulated (substeps near rims), collisions, catches, scoring.
4. **Match:** clocks, possession, dead balls, inbounds, quarter ends, Supernova bookkeeping, spawner, twists.
5. **Events** emitted during 1–4 are delivered (announcer, audio, crowd, stats, fx, attract director, net).
6. **Camera director** sets focus, zoom and time scale.

`Cmd` = `{ move: [x, y], shoot: { down, pressed, released }, pass: {...}, turbo: { down }, shove: {...}, oop: {...},
taunt: { pressed } }`. Sources: `LocalSource(input)` (from `game.players[i]`), `CpuSource(brain)`, `NetSource(seat)`
(§15), `ScriptSource(steps)` (tests, attract). Swapping a slot's source is one assignment (dev autopilot, a player
leaving a hub round, a player joining Exhibition).

### 4.4 State

`S` holds: `scene`, `mode` (`'exhibition' | 'tour' | 'camp' | 'attract' | 'hub'`), `court`, `teams[2]` (team id,
lineup, bench), `players[4]` (slot 0–1 HOME, 2–3 AWAY), `ball`, `match` (phase, quarter, clock, shotClock, score,
possession, alternating arrow, streaks, stats, styleScore), `twist` state, `powerups`, `cheats`, `rng`, `fxRng`,
`events` (ring buffer of the last 64 for debug and the net), `settings` mirror, `progress` (tour, unlocks, records).
`serializeMatch()` and `applySnapshot()` (§15) live beside it from the first milestone, with a test.

### 4.5 Events

`emit(type, data)` / `on(type, fn)`. Types: `tipoff, possession, inbound, dribble, pass, catch, intercept, shotStart,
release, rim, backboard, basket, miss, airball, block, goaltend, steal, fumble, shove, knockdown, spin, anklesBroken,
rebound, putback, dunkStart, dunk, posterized, alleyoop, supernovaOn, supernovaOff, shatter, sponsorBreak, powerupSpawn,
powerupPick, powerupEnd, jackpot, twist (with kind), shotClockViolation, quarterEnd, halftime, overtime, gameEnd,
taunt, cheat`. Each carries ids, positions and context (`points`, `dunkId`, `dist`, `contested`, `perfect`...).

### 4.6 Randomness and determinism

- `S.rng = E.rng(seed)`: every gameplay decision (shot outcomes, AI choices, steals, spawns, twist timing).
- `S.fxRng`: cosmetic choices (crowd, which line the announcer says). Particles may use `Math.random`.
- Tests seed `Math.random` too (as the kits' `proof()` does) so the rigs and particles repeat.
- Same seed + same commands = same match. A `proof(n)` function hashes the state after n scripted steps (copy the
  shell's `proof()` from `kits/sports.js`).

### 4.7 Tuning

`TUNING` is the single home of the important numbers (Appendix A): `{ key: { v, def, min, max, step, group, label,
help } }`. Systems read `tune('runSpeed')` every time (never cache), so a dev slider changes play at once.
`resetTuning()` restores `def`. Dev mode can save the current values to `E.store('bb:tuning')` and copy them as JSON.

### 4.8 Persistence

`E.store` keys: `bb:progress` (`{ tour: { team, stop, score, cheatsUsed, beatsSeen }, unlocked: { bots, allstars,
bigHeads }, camp: [done lesson ids], records: { mostPoints, bestDunk, toursWon } }`), `bb:tuning`. The Tour also uses
`game.saves` autosave (`write`/`read`, `autosave()` after each stop, `latest()` for CONTINUE TOUR). Hall of Blam
tables use `E.Arcade` (`id: 'basketblam'`, mode `'tour'`). In hub sessions the client gives the game an empty
in-memory storage: nothing to do.

### 4.9 Deep links and the debug handle

Deep links (the page's `#hash`, read in `90-start.js`): `#title`, `#attract`, `#exhibition/<court>/<home>-<away>`,
`#tour/<stop 1-4>`, `#story/<beatId>`, `#camp/<lessonId>`, `#results`, `#credits`, `#about`, `#dev` (an exhibition with
the dev panel open), `#animlab`, `#shootaround`. `#animlab` (every clip on a rig, slow motion, scrub) and
`#shootaround` (rim physics bench) are dev tools, also reachable from the dev panel's SCENES tab.

`game.debug = { snapshot(), teleport(slot, x, y), give(slot), setScore(a, b), setClock(s), setQuarter(q), force(name,
args), go(scene, data), spawnPowerup(id, x, y), cheat(name, on), tune(key, v) }`. `snapshot()` returns `{ scene, mode,
court, phase, quarter, clock, shotClock, score, possession, ball: { x, y, z, state, owner }, players: [{ slot, id, team,
x, y, z, state, turbo, juice, nova, powerup, source }], lastEvents: [10 types], ui: { screen, focus }, attract:
{ segment }, net: { role, seat, rtt } }`. `window.__bb = { S, game, TUNING, emit, on, debug: game.debug }`.

---

## 5. Engine changes (planned)

Make each in `engine/my-3d2dge.js`, mark it `/* BASKETBLAM: why */`, and list it on the About screen and in the exit
interview's engine feedback.

1. **Basketball shorts on `Humanoid`:** option `shorts: { len: .55, sock: '#ffffff', sockLen: .35 }`. In the HD leg
   drawing (`limb(hip, knee, ..., C.pants)`, `limb(knee, ank, ...)`, about line 4388) draw the thigh in `C.pants` only
   down to `len` of its length (shorts with a hem in `C.trim`), the rest of the thigh and the shin in `C.skin`, and the
   last `sockLen` of the shin in `sock`; the same in the classic path (about line 4576).
2. **Hair styles** `'afro'` (a big shaded ball around the back and top of the head), `'flattop'` (a tall flat box),
   `'mohawk'` (a ridge of spikes front to back) in the HD head drawing beside `'spiky'` (about line 4493), and in
   `drawPortrait`.
3. **`Dialog.voice` may be a function** `(letter, index, pageText)` called for each letter typed (about line 8956),
   so the gibberish voice speaks the line as it types.
4. **Public audio buses:** `audio.sfxBus` and `audio.musicBus` getters for `_sfxBus` / `_musBus`, so the voice and crowd
   nodes follow the volume settings.
5. Any engine bug found while building: fix it in the engine (not around it), with a test, and log it for the
   exit interview.

Big heads need no engine change: `rig.o.headR` is read when drawing, so the cheat multiplies it (keep the original to
restore it).

---

## 6. Court, rules and core mechanics

### 6.1 Court geometry (world units; one tile = 16; z up)

Arena map: 48 × 28 tiles (768 × 448). Court-local coordinates `(cx, cy)`: x 0..640 baseline to baseline, y 0..288 far
sideline to near sideline. World = court-local + `(64, 112)`. Constants (court-local):

| Thing | Value |
|---|---|
| Court | 640 × 288; centre (320, 144) |
| Rim centres | (52, 144) and (588, 144); z 80; inner radius 9; tube radius 1.2 |
| Backboards (collision) | planes x = 40 and x = 600, y 120..168, z 72..100 |
| Ball | radius 4.5 |
| Three-point line | arc radius 136 from the rim centre; straight corner lines at y = 20 and y = 268 from the baseline to x = 108 (mirrored at the other end) |
| Key (paint) | y 96..192, baseline to x = 152 (free-throw line); free-throw circle r 48 |
| Centre circle | r 40; half-court line x = 320 |
| Out of bounds | none: invisible walls 24 units outside the lines stop players; the ball bounces off them (the crowd) |
| Players | 48–56 tall; body radius 6; standing reach about z 59 (size 1.7) |

North of the court (screen top): an apron (16) and stands of 4 tiers (heights 12/24/36/48) with the crowd. West and
east: 64 of apron with the stanchion bases, benches, props. South (camera side): 48 of apron with low props (scorer's
table, cameras) drawn with `cut` so they never hide play. One player is controlled by each human; there is no switching
of players (the genre's rule).

### 6.2 Controls and actions

| Action | Pad (standard mapping) | Keyboard | Mouse | With the ball | Without the ball |
|---|---|---|---|---|---|
| move | left stick, d-pad | WASD (arrows for a lone player too) | – | run / dribble | run, defend |
| `shoot` | □ Square (`Pad2`) | Space, J | left button | hold: jump; release at the top to shoot; in dunk range with turbo: dunk | jump to block or rebound; if your CPU teammate has the ball: "shoot it!" |
| `pass` | ✕ Cross (`Pad0`) | E, K | right button | pass to your teammate (led) | steal swipe; if your CPU teammate has the ball: "pass it to me!" |
| `turbo` | R2 (`Pad7`), R1 (`Pad5`) | Shift (left or right) | – | hold: faster, higher, dunks | hold: faster, higher |
| `shove` | ○ Circle (`Pad1`) | Q, L | – | SPIN MOVE | SHOVE |
| `oop` | △ Triangle (`Pad3`) | F, I | – | alley-oop lob to your teammate | call for the ball; CPU teammate with the ball throws you an oop if you're in range |
| `taunt` | L1 (`Pad4`) | R, U | – | – | taunt (dead balls or without the ball; off in hub sessions) |
| `pause` / menus | Options, ✕/○ | Esc/P, Enter/Esc | click, right-click back | | |

Preset: `const KEYS = Object.assign({}, E.Input.DEFAULT, { shoot: ['Space', 'KeyJ', 'Mouse0', 'Pad2'], pass: ['KeyE',
'KeyK', 'Mouse2', 'Pad0'], turbo: ['ShiftLeft', 'ShiftRight', 'Pad7', 'Pad5'], shove: ['KeyQ', 'KeyL', 'Pad1'], oop:
['KeyF', 'KeyI', 'Pad3'], taunt: ['KeyR', 'KeyU', 'Pad4'] })`, minus `attack, dash, skill, jump`. Names for the Controls
screen: `{ shoot: 'Shoot / Block', pass: 'Pass / Steal', turbo: 'Turbo', shove: 'Shove / Spin', oop: 'Alley-oop / Call',
taunt: 'Taunt' }`. Two players on one keyboard get the engine's halves (`E.Input.halfKeys`): check what it assigns and
show it on the join screen. Combo shortcut kept for genre veterans: turbo + pass without the ball also shoves.

### 6.3 Match flow and rules ("What you can and can't do")

- **2 on 2, full court, 4 quarters.** Quarter length: Exhibition from Settings (1:00 / 1:30 / 2:00 / 3:00, default
  2:00); Tour 1:30; hub 2 halves of 1:30. The game clock runs only while the ball is live; it stops on made baskets
  until the inbound is caught, and during breaks.
- **Tip-off** starts the game and each overtime: the two jumpers (highest SWAT on each side) at centre; REF ROSCOE
  tosses the ball (apex z 120 at 0.9 s); press shoot to jump; the jump whose hands peak nearest the ball's apex wins
  (CPU timing error by difficulty) and taps it to the teammate. Quarters 2–4 begin with an inbound at half court by the
  alternating arrow (the team that lost the tip gets Q2 and Q3).
- **Scoring:** 2 points; 3 from beyond the arc (by the shooter's takeoff point); dunks 2; Jackpot Spot +2; Gold Ball
  doubles. A shot released before the buzzer counts.
- **No fouls.** Shoving, steals and body contact are legal. No traveling, no backcourt, no three seconds, no out of
  bounds (the walls keep everything in).
- **Shot clock 20 s;** resets on a change of possession and when a shot touches the rim. Expiry: buzzer, turnover,
  inbound by the other team from the nearest sideline.
- **Goaltending:** touching the ball while it is coming down (vz < 0) within 18 units of the rim centre and above the
  rim counts the basket for the shooter ("GOALTEND!"). Supernova players and BLAMBOTS ignore this rule.
- **After a made basket** the other team inbounds from under the basket it defends: the inbounder passes in after 0.8 s
  (or when its human presses pass). Defenders may not stand within 24 units of the inbounder; the inbound pass can be
  intercepted only by a defender standing in its lane.
- **Tie after Q4:** overtime of 1:00, again if tied; after two overtimes, SUDDEN BLAM: the next basket wins (so every
  game ends, which the tests rely on).
- **Breaks:** after Q1 and Q3 a short break card (6 s, subs allowed); after Q2 the Halftime Report (stats, a gag, subs).

### 6.4 Ratings

Each player has eight ratings, 1–10, shown as pips with icons (never raw numbers on the 10-foot screens):

| Rating | Means | Effect (r = rating) |
|---|---|---|
| ZOOM | speed | run speed × (0.86 + 0.028 r) |
| SPLASH | two-point jumpers, layups | make chance × (0.78 + 0.045 r) |
| DEEP | three-pointers | make chance × (0.70 + 0.06 r) |
| SLAM | dunking | dunk range × (0.75 + 0.05 r); unlocks dunks (§10.3); resists blocks |
| DIME | passing, handles | pass speed 180 + 12 r; interception window; ball security vs steals; alley-oop range |
| SWIPE | steals | steal chance × (0.55 + 0.09 r); steal reach 14 + 0.6 r |
| SWAT | blocks, rebounds | jump speed 250 + 10 r; block reach 10 + 0.8 r; block chance |
| BUMP | power | shove force 140 + 14 r; knockdown time; fumble chance; shove resistance; box-outs |

Every effect is multiplied by the juice factor (§6.14) and by power-ups and Supernova where they apply.

### 6.5 Movement and turbo

- Velocity approaches `stick × runSpeed × ZOOM factor` at `accel` (900 u/s²). Facing turns toward the movement; on
  defense with the opponent holding the ball, the defender faces the ball handler and shuffles (defensive stance).
- Bodies are `E.Body` (radius 6, gravity `playerGravity` 900) on the arena TileMap; players push each other apart
  (separation, no damage); `E.SpatialHash` is unnecessary at four players.
- **Turbo** (0..1 per player): held and moving drains `turboDrain` 0.30/s; not held refills `turboRefill` 0.20/s after
  `turboRefillDelay` 0.35 s; speed × `turboMult` 1.5, jumps × 1.15; required to start a dunk (≥ 0.05); a shove costs
  0.25, a spin move 0.2. Supernova and Rocket Kicks change it (§6.12, §6.15).
- A sharp change of direction at speed squeaks the sneakers and kicks dust.

### 6.6 The ball

States: `held` (by its owner's hands), `dribble` (owner; position from the dribble cycle, §7), `pass` (flying to a
target), `shot` (flying with its shot record: shooter, points, decided outcome, release time, perfect flag), `loose`
(free physics), `dead` (scripted: after a score, during breaks), `inbound`.

- Gravity `ballGravity` 760; floor bounce restitution `ballBounce` 0.62 with friction; rolling decays.
- **Rim:** a torus (ring radius 9, tube 1.2). Closest point Q on the ring circle to the ball's centre; if
  `|ball − Q| < 4.5 + 1.2` reflect the velocity along the normal with `rimBounce` 0.45 and a little friction; the rim
  "rattles" (visual bend + clank). Substep the ball 4× (1/480 s) within 40 units of a rim; never let it tunnel.
- **Backboard:** the plane x = 40 (or 600) within its y/z bounds; restitution 0.55; a thud.
- **Arena walls:** 24 outside the lines; restitution 0.5.
- **Basket:** the ball's centre crosses z = 80 downward within 6.75 of the rim centre: score once (a `scored` flag
  holds until it falls below z 60); the net slows it (vz × 0.6) as it passes.
- Players do not collide with the ball except to catch, steal, block, tip or goaltend it.

### 6.7 Shooting

Pressing shoot with the ball (out of dunk range, or without turbo) starts a **jump shot**: gather 0.08 s, jump
(`jumpShotVz` 250 + SWAT bonus), the ball rises above the forehead. Releasing the button releases the ball; holding past
the top releases it automatically 0.25 s after the top (a late release). The **release meter** (a thin arc around the
shooter, Settings → Shot meter, on by default) fills toward the top of the jump; the PERFECT window is `perfectWindow`
0.10 s wide, centred on the top.

The outcome is decided at release, then flown physically:

```
p = base(dist) × ratingFactor × release × contest × shotSkill × (3PT ? threeSkill : 1) × juice + bonuses
base(dist): dist ≤ 40: 0.85 · 40–80: 0.85→0.70 · 80–136: 0.70→0.45 · 136–200: 0.38→0.30 · 200–320: 0.30→0.08 · beyond: 0.03
ratingFactor: SPLASH (2PT) or DEEP (3PT) factor (§6.4)
release: PERFECT × (1 + perfectBonus 0.15) · inside 2× the window × 1 · early or late × (1 − badReleasePenalty 0.30)
contest: nearest defender between shooter and rim within 30 and airborne × (1 − contestPenalty 0.40); within 30 on the floor × 0.80; within 50 × 0.92
bonuses (added): Supernova + novaShotBonus 0.25 · Laser Sight + 0.30 · comeback assist (§8, Comeback assist)
modifiers: turbo held × 1.05 · drifting sideways fast × 0.90 · wind (the Pier) × (1 − 0.35 × |wind| × dist / 320)
clamp to [0.02, 0.97]
```

`made = S.rng() < p`. The flight is solved with `E.arc(release, target, ballGravity, { apex })`, apex = max(release z,
rim z) + clamp(18 + dist × 0.10, 18, 60) × `shotArc`. Made: the target is the rim centre 2 below the rim plane, entering
on the way down (a swish); 1 in 4 makes target a point 3 off the centre and are helped in if they touch the rim (a
"rattle in": nudge the velocity toward the centre). Missed: the target is a point on the front rim, back rim, side rim or
the backboard, chosen by the error, so the ball bounces off naturally; if physics drops a decided miss in anyway (rare)
it counts (it's a real basket). A miss by more than 30 units from the rim is an **airball**. Wind adds a constant
horizontal acceleration during flight: solve the launch with it included so the ball curves and still reaches the
decided target. Tests hold made rate to the decided rate within 3% (§19).

### 6.8 Layups, dunks, alley-oops, putbacks

- **Layup:** shoot pressed within 40 units of the rim without turbo, or with turbo when the player can't dunk: a short
  one-handed rise and scoop; make chance from the 0..40 band (high); blockable.
- **Dunk:** shoot pressed with turbo held inside the dunk range: `dunkRange` 150 × SLAM factor (Supernova + 40, Moon
  Shoes to the three-point line + 20, steam vent: anywhere in that half). The dunk is chosen from the catalog (§10.3) by
  distance, approach angle, SLAM rating and context (weighted by `S.rng`). Flight: from takeoff to the slam point (the
  feet where the dunking hand reaches 6 above the rim; about feet z 28 at size 1.7) with `E.arc(…, dunkGravity 520,
  { apex: slamFeetZ + apexAbove × dunkApex })`, time × `dunkHang`. The ball rides the hands (§7); at the slam the ball is
  forced down through the hoop (a made basket), the rim bends and snaps back, and the dunker either drops or hangs.
  A dunk scores unless it is **blocked** before the slam: a defender in the air whose block hands meet the ball, with
  chance `clamp(0.25 + 0.06 × (SWAT_def − SLAM_off) + timing, 0.05, 0.75) × blockChance`. Players with SLAM ≤ 3 miss
  4% of dunks off the back rim (comedy).
- **Alley-oop:** the ball handler presses `oop` while the teammate is within the oop range (dunk range × 1.15 + DIME
  × 4) of the rim and not covered tightly: the teammate leaps (dunk flight to the rim) and the passer lobs to meet the
  hands at 70% of the flight (`E.arc` with the flight's time). A defender in the lob's path can intercept (steal), one
  in the flight's path can block. Out of range, `oop` throws a plain lob to the teammate. A human receiver whose CPU
  teammate has the ball presses `oop` to ask for it.
- **Putback:** catching an offensive rebound in the air within 40 units of the rim, then pressing shoot (or holding
  turbo) slams it at once ("PUTBACK!").
- **Posterized:** a dunk slammed within 24 units of a defender in front of the rim knocks that defender down with dizzy
  stars ("POSTERIZED!").

### 6.9 Passing

`pass` with the ball: a chest pass at chest height along the floor plane to the teammate, led by the receiver's velocity
(`kits/sports.js`'s `pass()`), speed `180 + 12 × DIME` × 1.6; a bounce pass when a defender's hands are near the lane
(cosmetic: one floor bounce). The receiver catches when the ball passes within 12 of its hands. Interception: a defender
within 10 of the ball's line, chance by SWIPE vs DIME (0.15 to 0.55). Commands to a CPU teammate holding the ball:
`pass` = pass to me, `shoot` = shoot now, `oop` = throw me an oop.

### 6.10 Defense: steals, shoves, spin moves, blocks

- **Steal** (`pass` on defense): a 0.2 s swipe, lunge 6, reach `stealReach` 18 (+ SWIPE). Chance per attempt:
  `stealChance 0.30 × SWIPE factor × (1.25 − 0.05 × DIME_handler) × angle × context`; angle × 1.4 from behind or the
  dribble-hand side, × 0.6 from the off-hand front; handler on turbo × 1.15; handler spinning or in a shot: 0. Success
  pops the ball loose toward the stealer (or straight to its hands within 8). Cooldown `stealCooldown` 0.6 s; a miss
  leaves a 0.2 s recovery.
- **Shove** (`shove` on defense, or turbo + pass): wind 0.06 s, a two-handed push with lunge 10, reach 22, ±60° arc;
  cost 0.25 turbo (needs ≥ 0.1), cooldown `shoveCooldown` 1.0 s. A hit knocks the target down for
  `knockdownTime 0.8 + 0.04 × (BUMP_att − BUMP_def)` (0.3..1.4 s), sliding back with `shoveForce` 220 × BUMP factor.
  A ball handler fumbles with chance `shoveFumble 0.6 + 0.04 × (BUMP_att − BUMP_def)` (0.2..0.95); a shooter in the air
  loses the shot with 0.7. Shoving costs the target juice.
- **Spin move** (`shove` with the ball): a 0.35 s 360° spin dribble (`rig.spin`) carrying the handler 30 forward;
  steals fail during it; a defender within 14 in front stumbles 0.4 s ("ANKLES BROKEN!"). Cost 0.2 turbo; cooldown 1.5 s.
- **Block** (`shoot` on defense): a jump (`250 + 10 × SWAT`, × 1.15 with turbo) with both arms up; during the jump a
  swat swing triggers when the ball comes within `blockReach` (14 + SWAT); against a shot in its first 0.25 s of flight,
  a layup or a dunk before the slam it succeeds with the block chance; a block sends the ball flying (toward half court
  if possible) and emits `block` ("REJECTED!"). Touching a descending shot is goaltending (§6.3).

### 6.11 Rebounds and loose balls

A missed shot that touches the rim or board is `loose`. Everyone can catch a loose ball within reach (horizontal 10,
vertical from the feet to the standing reach, plus the jump). `shoot` near a loose ball in the air jumps for it
(rebound). Box-out: a player with higher BUMP between an opponent and the ball holds position (the other is nudged
aside). Loose balls on the floor are picked up by touching them.

### 6.12 SUPERNOVA

- **Ignites** when one player scores `novaBaskets` 3 baskets in a row for the team with no basket by the other team in
  between. The HUD shows each player's streak as three heat pips.
- **While on:** unlimited turbo, + `novaShotBonus` 0.25 to every shot, + 40 dunk range, + 20% steal chance, goaltending
  allowed, dunks shatter the glass with 35%, the ball leaves a comet trail of star-fire (`r.actor` ghosts on the player,
  glints and embers on the ball), the rim glows, the crowd chants, the music adds its "nova" layer.
- **Ends** when the other team scores, after `novaMaxBaskets` 4 more baskets, or after `novaTime` 40 s of game clock.

### 6.13 Backboard shatter

A dunk shatters the backboard with chance 0 normally, 3% for SLAM ≥ 9 turbo dunks, 35% in Supernova, 50% with Moon
Shoes, 20% for the Volcano Launch, 100% for BLAM-QUAKE (all × `shatterChance`), at most twice a game. The basket counts;
glass shards (`particles.bits` in pale blue and white, glints) rain; hit-stop 0.15, flash, slow motion 0.3 for 0.5 s;
then the **SPONSOR BREAK**: a 4-second fake commercial card ("WE'LL BE RIGHT BACK AFTER THIS MESSAGE FROM GLOBO-BLAM
GLASS: NOW 40% LESS SHATTERY!") with its jingle, while a cleaning bot rolls out and fits new glass; then the inbound.

### 6.14 Juice and substitutions

Each player has juice 0..1 (starts 1). It drops 0.06 per knockdown suffered, 0.01 per second of turbo, 0.004 per second
on court (× `fatigue`); a break restores 0.25 to players on court and 0.5 to the bench. The juice factor
`0.85 + 0.15 × juice` multiplies the ratings' effects. Each team carries 3 players: at each break, a human picks who
plays (the break screen shows juice bars); CPU teams bench the lowest juice. Hub rounds have no subs.

### 6.15 Power-ups and the Jackpot Spot

Power-ups appear in Exhibition (Settings → Power-ups, default on), on Tour stops 2–4 and the final, in attract mode and
in hub rounds. One on the floor at a time (two in attract), every `powerupInterval` 22 s (± 6), lasting 10 s, never on
a twist hazard; run over it to take it; its effect shows as an icon and a countdown on the player's plate.

| Id | Name | Effect | Lasts |
|---|---|---|---|
| `rocket` | ROCKET KICKS | speed + 40%, turbo refills twice as fast | 15 s |
| `glue` | GLUE GLOVES | steals always succeed against players without Glue Gloves; you can't be stripped | 15 s |
| `laser` | LASER SIGHT | + 0.30 shot chance; the PERFECT window doubles | next 2 shots or 15 s |
| `moon` | MOON SHOES | dunk range to the three-point line + 20; jumps × 1.5; dunks shatter 50% | 15 s |
| `bomb` | BLAM BOMB | your next shove is a shockwave: knocks down every opponent within 60, always fumbles | one use, 20 s |
| `gold` | GOLD BALL | your team's next basket counts double | until used, 30 s |

**Jackpot Spot** (the Skybox, and Exhibition with Settings → Jackpot Spot on): a glowing ring (radius 16) appears at a
random place inside the three-point range of one basket for 20 s, then moves; a made jump shot taken with the feet in
it scores + 2 ("JACKPOT!").

### 6.16 Stats and style points

Per player: PTS, FGM/FGA, 3PM/3PA, DUNKS, REB, AST, STL, BLK, KNOCKDOWNS, SHATTERS, NOVAS. **Style points** feed the
Tour score and the Hall of Blam: dunk 200 + the dunk's own bonus, three 150, alley-oop 250, block 100, steal 80,
putback 150, posterized 200, shatter 1000, Supernova 300, jackpot 250, ankles broken 100; a win adds 2000 + 50 per
point of margin. A game played with cheats is marked ★ and can't enter the Hall of Blam.

---

## 7. Animation

The base is the engine's own: Humanoid rigs posed by math each step (`rig.update`), its locomotion, `air`, `flip`,
`pose` (`cheer`, `hips`, `wave`, `guard`, `crouch`, `down`), `expr`, `hurt`, `land()`, `kick()` and attack specs. On
top we add a **pose layer** for everything basketball: hands that hold and dribble the ball, shooting form, dunk
choreography, hanging on the rim, celebrations and taunts.

### 7.1 The pose layer

```js
const base = rig.solvePose;
rig.solvePose = function () { base.call(this); poseLayer(this, this.bb); };   // bb: the player's anim state
```

`poseLayer` reads the player's current clip and time, interpolates the clip's keys (eased), and for each hand with a
target solves the arm with `E.ik3(shoulder, target, armUpper × size, armLower × size, elbowHint)`, writing
`J.elbowR/handR` (and L). Targets are written `[forward, right, up]` in the rig's own frame at size 1 and multiplied by
`rig.o.size`; check the units against how `solvePose` builds `J` (read it once) before writing clips. A clip may also
set body tweaks (lean, a crouch amount, a hop) and a `pose` / `expr` it passes to `rig.update`. Spins rotate the
`facing` given to `rig.update` (2π over the move); flips use the rig's `flip: 0..1`. The ball attaches to the hand(s):
its world point is `rig.worldOffset(J.handR)` (or the mid-point of both hands) plus the rig's position, nudged 4.5 out
of the palm.

### 7.2 The dribble (procedural, synced to the ball)

A phase φ in 0..1 advances at 2.2 Hz standing, 3.0 running, 3.8 on turbo. The ball falls from the hand (about hip
height) to the floor (contact at φ = 0.5, the dribble sound for the court's floor) and back up, as two parabolas; the
hand is in contact for φ in [0.85, 1] ∪ [0, 0.15], pushing down at φ ≈ 0.05, and hovers above the ball otherwise. The
ball sits 5 forward and 6 to the dribble side (× size). **Crossover:** when the move direction turns more than 100° or a
defender reaches the dribble side within 20, the next bounce lands on the other side (the ball crosses in front) and
the hand switches. The off hand guards (forearm out toward the nearest defender).

### 7.3 Clips (data in `06-data-moves.js`; targets at size 1)

| Clip | Length | Hands and body |
|---|---|---|
| `hold` (triple threat) | loop | both hands at [4, ±1.5, 15], ball between; slight crouch |
| `gather` | .08 s | ball to the chest [4, 0, 20] |
| `jumpshot` | rise → release → follow | rise: right hand under the ball at [3, 1, 33], left at its side [2, −3, 30]; release (.1 s): right arm to [5, 1.5, 38]; the follow-through holds until landing |
| `layup` | rise | right hand scoops [5, 2, 16] → [6, 2, 40]; left guards [3, −3, 26] |
| `passChest` | .08 + .12 s | both hands [4, ±1.5, 19] → [11, ±1, 20] |
| `passBounce` | .08 + .12 s | both hands [4, ±1.5, 18] → [10, ±1, 10] |
| `passLob` (and oop lob, inbound) | .1 + .15 s | both hands [2, ±1.5, 22] → [6, ±1, 38] overhead |
| `passFlair` (behind the back; 15%, always in Supernova) | .12 s | right hand sweeps [0, 5, 14] → [−3, −4, 14] |
| `catch` | until the ball arrives | both hands reach toward where the ball will be in .15 s |
| `steal` | .2 + .2 s | an attack spec: right hand low and forward, lunge 3 |
| `shove` | .06 + .08 + .3 s | both hands [3, ±3, 20] → [12, ±3, 21], lunge 4, `expr: 'angry'` |
| `knocked` | by the knockdown time | the rig's `down` 0 → 1 in .15 s, a slide, lying, getting up (the rig's own); `hurt`, `expr: 'wince'`; dizzy stars (3 small orbiting sprites) when posterized |
| `spin` | .35 s | facing + 2π; arms out; ball stays with the dribble hand |
| `defense` | loop | arms wide [3, ±8, 20], crouch, shuffling sideways |
| `block` | the jump | both arms straight up [1, ±3, 40]; `swat`: right arm [2, 3, 42] → [8, 0, 30] |
| `rebound` | the jump | both hands up [3, ±2, 40]; on the catch the ball to the chin [3, 0, 26] |
| `tipoff` | the jump | crouch, jump, right hand up [2, 2, 44] |
| `hang` | 1.2 s | both hands IK'd to two rim points (world points turned into the rig's frame each step), the body hanging below, legs swinging as a damped pendulum, then let go |
| celebrations | 1–1.4 s | chest pound (fists alternate to [3, ±1, 25]), flex (hands by the shoulders [1, ±6, 30], elbows out), raise the roof (palms pump [2, ±5, 34] ↔ [2, ±5, 42] at 3 Hz), point to the sky ([2, 3, 46]), the airplane (arms out [0, ±12, 24] while running back), robot pops, gorilla drum |
| taunts | .8 s | one per character (§10.2) |
| dunks | the flight | §10.3: hand keys over the flight's progress u, plus facing spin, flip, air tuck, legs split, slam at u ≈ .9 |

Every action has anticipation, a committed middle and a clean settle (the guide's rule); CPU shoves and steals wind up
.04 s longer than a human's so they read. Landing from a dunk calls `rig.land(1)` (a three-point landing) and
`rig.kick(-1)`; takeoff `rig.kick(1)`. Faces: `shout` on dunks and blocks, `smile` after scoring, `angry` on shoves,
`wince` when hit.

### 7.4 Dressing the rigs

`dressPlayer(spec)` → `new E.Humanoid({ size, build, weapon: null, outfit: 'shirt', sleeves: 'none', hair, hat, shorts:
{ len: .55, sock, sockLen: .35 }, colors: { skin, hair, cloth: jersey, trim, pants: shorts, boot: sneaker, glove:
wristband, belt: shorts }, ...proportions })`. Jersey numbers (one digit or two in the 3×5 font, in the trim color) are
drawn over the chest or back when that side faces the camera (project `rig.worldOffset(J.shC)` lowered by 4).
Sunglasses for PIXEL: a 3×1 dark bar at the eyes from `rig.head()`. Big heads: `rig.o.headR × 1.9`.

### 7.5 Checking motion

`#animlab` plays any clip or dunk on any player at .25×, 1× or frame by frame, with `rig.debug(r)`; check every dunk and
celebration with `handoff/tools/filmstrip.mjs` (wind-up, strike, settle; no backward sweeps, no popping).

---

## 8. CPU AI (`34-ai.js`)

Each CPU player has a brain that decides at 10 Hz (staggered per player) and steers every step, writing the same `Cmd` a
human's controls would. Roles per possession: HANDLER, OFFBALL, DEFENDER (with a mark), REBOUNDER.

- **Handler:** scores options each decision and commits to the best for at least .3 s (no dithering):
  `dunk` (in range, turbo ≥ .15, lane roughly clear; × SLAM), `shoot` (decided chance × points; urgent under 4 s of shot
  clock; prefers PERFECT release with its timing error), `drive` (lane clear toward the rim), `pass` / `oop` (teammate
  more open, cutting, or in oop range; minus the interception risk), `spin` (a defender squarely ahead within 20, turbo ≥
  .2), `wait` (wind gust at the Pier, an eruption telegraph in its path). Steering: seek the rim, side-step defenders
  ahead within 30, keep 24 from oil slicks and lava rings; turbo when the lane is clear and the rim is more than 80 away.
- **Off the ball:** keep 70+ from the handler; spot up at a three-point wing on the far side; cut to the far block when
  the handler drives (oop setup); call for the ball when open while the handler is pressed; go for a power-up within 120
  when no defender threatens.
- **Defense:** man-to-man; marks swap when attackers cross; stand between the mark and the rim, 18–28 away (tighter on
  the handler, sagging off the other); face the handler; try a steal when adjacent from a good angle (rate by
  difficulty × aggression × SWIPE); shove the handler in the paint or a shooter rising (aggression, turbo ≥ .3); jump to
  block when the shooter rises within 40 (reaction delay and timing error by difficulty); otherwise contest with hands
  up; help on a drive when the mark is far from the ball.
- **Rebounds and loose balls:** while a shot flies, predict its landing area (short forward simulation of the ball,
  rim bounce approximated) and send the nearest one or two; box out; jump when the ball is within reach. The nearest of
  each team chases a loose ball. After a defensive rebound or a steal, push the fast break with turbo.
- **Teammate of a human:** obeys commands (`pass` = pass to me now; `shoot` = shoot now; `oop` = throw me the oop if I'm
  in range); otherwise plays its role; never steals the human's shots; feeds a human who calls when open.
- **Boss (BLAMBOTS):** the All-Star brain plus Overclock, Magnet Hands and higher shove aggression (.8); after a reboot
  they play passively for 1 s.
- **Attract/autopilot:** the same brains, with the attract director's cheats and forced actions (§13).

**Difficulty** (Settings → CPU difficulty; Tour stops shift it, §10.5; in-between values interpolate):

| | Rookie | Pro | All-Star | BLAM |
|---|---|---|---|---|
| decision quality (noise) | .35 | .60 | .80 | .95 |
| reaction delay (s) | .35 | .22 | .14 | .08 |
| shot release error (s, sd) | .12 | .08 | .05 | .03 |
| block timing error (s, sd) | .18 | .12 | .07 | .04 |
| steal tries per second when adjacent | .6 | 1.0 | 1.4 | 1.8 |
| shove aggression | .20 | .45 | .65 | .80 |
| turbo use | .50 | .75 | .90 | 1.0 |

**Comeback assist** (`comeback` 0.35; Settings Off/Low/Normal = 0/.2/.35): a team trailing by d ≥ 4 points from Q2 on
gets + `comeback × min(d, 15) / 15 × 0.12` shot chance, the same × .1 decision quality for its CPU players, and turbo
refill × (1 + .5 × that factor). It applies to humans and CPU alike (the arcade tradition); Tournament mode turns it off.

---

## 9. Camera, presentation and juice

### 9.1 Framing

- The camera director calls `game.focus(x, courtMidY, 0)` every step: x follows the ball (or its holder) with a lead of
  48 in the direction of play, `cam.smooth = .16`; the vertical framing is fixed so the far sideline sits about 32% down
  the screen and the near sideline about 8% above the bottom (tune `cam.offset`), leaving the top 40 px for the HUD
  strip clear of the backboards. Bounds keep the view between 60 beyond each baseline.
- Taller screens show more crowd and backdrop above; wider screens show more court. Player zoom: `camera: { zoom:
  [.8, 1.4] }` on match scenes.
- Tip-off: centred, zoom 1.15, easing out to 1 at the tap.

### 9.2 Dunk cam and slow motion

On `dunkStart` (unless Settings → reduce motion): zoom to 1.25 over .25 s centred between the dunker and the rim;
`game.timeScale = dunkSlowMo` (.45) for .35 s around the apex; at the slam hit-stop .08 s, shake 4, a .06 s white flash
(the engine applies the comfort settings), then zoom back over .5 s. Shatters: bigger (hit-stop .15, time scale .3 for
.5 s). Supernova ignition: a .4 s ring burst and banner, no slow motion. Reduce motion: no zoom or slow motion, shake
and flash per the player's settings.

### 9.3 Drawing the hoop, the ball and depth

In the broadcast view a backboard (a plane facing along x) would be seen edge-on, as a line. **Cheat it:** draw the
glass as a panel turned 30° about the vertical axis toward the camera (for the left hoop the board's width runs along
`(−sin 30°, cos 30°)` from (40, 144): near edge at (28, 164.8), far edge at (52, 123.2); mirror for the right), so its
face shows as a parallelogram. Collisions keep the true plane (§6.6). Draw:
- **Stanchion:** a padded base box behind the baseline (team color), a pole, an arm to the top of the board (thick
  `px.line`s in an `r.queue` at the hoop's y with a bias behind the board).
- **Glass:** `px.blend(g, .25, 'screen', ...)` pale blue fill, a white 1-px frame and the orange shooter's square;
  shattered: only jagged edge shards until the sponsor break replaces it.
- **Rim:** 16 points on the ring at z 80, split into a back half (queued at y ≈ 138) and a front half (y ≈ 150), so a
  ball at the rim's centre (y 144) sorts between them; 2 px, orange shaded with `E.tones`. A damped spring bends the
  front of the ring down up to 4 on hits and slams.
- **Net:** 10 strands from the ring to a lower ring (radius 5.5, z 66) with two knots each, zig-zag links between
  neighbours, each knot a damped spring point pushed out by the ball when inside (swish ripple) and by the Pier's wind;
  back strands queued at y 138, front strands at y 150.
- **Ball:** a 9×9 sprite with seams and a dark outline, 4 rotation frames advanced by speed; `r.shadow` under it sized by
  height (the shadow is how players read its depth); a held ball sorts with a bias toward the camera when the dribble
  hand is on the camera side. Comet trail (Supernova, fast passes): the last 8 positions as `px.ddisc` in additive blend.
- **Players:** `r.actor` with a 7-radius `r.shadow`; `xray: true` for human players so they stay findable behind the
  stanchions; Supernova players get `ghost` afterimages.

### 9.4 Banners

`E.font.title` at scale 3–4, popping in (scale 0 → 1.2 → 1 over .25 s, `outBack`), holding .8 s, fading .2 s, at 30%
of the screen's height; one at a time by priority: SHATTERED > SUPERNOVA > POSTERIZED > dunk name > ALLEY-OOP >
REJECTED > JACKPOT > THREE! > PICKPOCKET > ANKLES BROKEN. Colors: dunks gold/orange, threes cyan, blocks red, steals
green, Supernova white → violet → gold, shatter ice blue, jackpot gold, posterized magenta.

### 9.5 Effects

| Event | Recipe |
|---|---|
| dunk slam | hit-stop .08, shake 4, flash .06, `particles.ring` at the rim (4 → 26, '#fff6c0'), 16 sparks, 10 glints, crowd flashes, rumble .6 for .2 s |
| landing from a dunk | 12 dust, `rig.land(1)` |
| shatter | hit-stop .15, flash, 60 glass `bits`, 30 glints, a ring, slow motion, rumble 1 for .4 s |
| block | `particles.impact` at the ball, 8 sparks, shake 2, rumble .4 |
| steal | 6 green glints, a whoosh |
| shove hit | `particles.impact` at the contact, dust where the victim lands, shake 2 |
| swish | net ripple, 6 white glints |
| rim clank | 3 orange sparks, rim bend |
| Supernova | a violet-gold ring, 20 fire around the player, embers trailing while it lasts |
| power-up | spawn: a glint spiral and ring; pickup: 12 glints and `particles.text('+ROCKET KICKS')` |
| lava bomb | a pulsing red ring decal for 1.2 s, then `particles.explosion(x, y, 0, 1.4)`, fire, smoke |

### 9.6 Crowd and lighting

The crowd: two people per stand tile on four tiers (about 370), each a small sprite (head and body, shirt colors from
the court's palette) with its own bobbing phase, drawn one `r.queue` per row. Reactions: dunks and shatters make the
crowd jump with arms up and pop camera flashes (white emissive dots for .6 s); a home miss slumps them; Supernova makes
them bob on the beat (`audio.onBeat`); the Dome adds an upper deck. Every court sets `game.lights.enabled = true`, its
ambient and its lights each draw (§10.1); canvas lighting only (it looks the same in every browser and check).

---

## 10. Content

### 10.1 Courts

| Court | Home of | Setting | Floor | Twist | Song |
|---|---|---|---|---|---|
| THE SKYBOX | Hightops | a Neon Heights rooftop at night | dark asphalt, neon magenta and cyan lines, a winged-sneaker logo | Jackpot Spot | `skybox` |
| THE PIER | Breakers | a boardwalk at sunset | weathered planks, worn white lines, a wave logo | Sea breeze (wind) | `pier` |
| THE SCRAPYARD | Crushers | a junkyard at dusk in light rain | cracked concrete, oil stains, hazard-stripe lines, a crossed-wrenches logo | Oil slicks | `scrapyard` |
| THE CALDERA | Magma | Kaboom Island's volcano at night, falling ash | basalt tiles with glowing seams, gold lines, a volcano logo | Eruptions and steam vents | `caldera` |
| THE BLAM DOME | Blambots | the championship arena | polished maple, red and gold lines, the GLOBO-BLAM logo, "BLAM DOME" in the keys | Boss mechanics, pyro | `dome` |

Each court is a data entry: `{ id, name, palette, floor(x, y, tag) painter, lines colors, logo sprite, standsFace,
backdrop spec, silhouettes(r), props [[id, x, y, opts]], crowd palette, lights(r), ambient, weather, dribbleSound,
music, twist }`. Floors are painted by `floorTex` like `kits/sports.js`'s pitch: analytic court lines (§6.1) plus logo
masks (string sprites scaled ×4 into the floor's centre and keys) and the material's grain (`E.hash2`, `E.noise2`).
New shapes (data, per `docs/ASSETS.md`, checked with `asset-sheet.mjs`): `fence-chain`, `water-tower`, `ac-unit`,
`boombox`, `beach-umbrella`, `lifeguard-tower`, `surfboard`, `junk-car` (5 colors), `tire-stack`, `tiki-totem`,
`pyro-cannon`, `tv-camera`, `scorer-table`, `trophy`, `anchor-desk`. Engine props reused: streetlamp, trashcan, palm,
awning, lantern, firedrum, barrel, torch, banner, bench, sign.

**THE SKYBOX.** Sky `['#07061a', '#1d1240', '#3a1a5a']`, 60 stars, a moon; `city` layers (far `#140c2a` parallax .08,
near `#1e1236` parallax .2). Silhouettes: a water tower; a "BLAM COLA" neon billboard that flickers; a helicopter that
crosses every 40 s with a searchlight (a moving light and cone). Props: chain-link fence on the far apron, AC units, a
boombox on the bench, trashcans, streetlamps, neon tubes on the stands. Crowd: city kids in hoodies (magenta, cyan,
black, yellow). Lights: ambient .45; four warm floodlights at the corners (z 140, radius 260); magenta and cyan glows at
the signs. Dribble: a sharp asphalt slap. **Twist: Jackpot Spot** (§6.15), always on here.

**THE PIER.** Sunset `['#2a1a4a', '#ff7a5c', '#ffd27a']`, a low sun, `sea` and `clouds` layers. Silhouettes: a turning
Ferris wheel, a roller coaster whose car loops every 12 s, a lighthouse. Props: palms, beach umbrellas, a lifeguard
tower, surfboards in the sand, a cotton-candy awning, string lights (lanterns, `anchor: 'top'`). Crowd: beachgoers in
bright swimwear and sun hats. Gulls (Blobs with wings) cross overhead; one perches on a backboard and flaps off when the
ball hits the glass. Lights: ambient .8, warm. Dribble: a hollow wooden thunk. **Twist: Sea breeze.** Every 15–25 s
(× `hazardInterval`) a gust blows for 4 s: wind w in −1..1, mostly along x (±25°), ball acceleration `w × 140` while
airborne, its effect on the shot chance in §6.7. A windsock at the bottom left shows direction and 1–3 chevrons; sand
and leaves stream; the net and the palms sway. The CPU waits out strong gusts unless the shot clock is short.

**THE SCRAPYARD.** Dusk `['#120e1a', '#4a2e36', '#b0603a']`, `mountains` as junk piles, dark clouds, rain .4. Silhouettes:
a crane with a swinging magnet that drops a car with a crash at each quarter break; car stacks. Props: junk cars, tire
stacks, oil drums (barrels recolored), fire drums (`light: true`), chain-link fence, the junkyard dog (a Blob with ears,
tail and feet) on the east apron, barking at dunks. Crowd: mechanics in overalls and hard hats. Lights: ambient .6, fire
drums, two white work lights. Dribble: a dull concrete thud. **Twist: Oil slicks.** At each quarter start, three slicks
(ellipses, radius 20–36) are placed by `S.rng` on the court away from the centre circle and the keys. On a slick a
player's acceleration is × .15 (it slides); turning more than 90° on a slick at turbo speed slips it with chance .3 (a
.6 s knockdown, a fumble). Slicks are glossy dark decals with a moving rainbow sheen. The CPU avoids them on turbo.

**THE CALDERA.** Night `['#0c0408', '#3a0c10', '#7a1e10']`, a big volcano cone (`mountains`) with a glowing crater
(emissive glow, embers and smoke rising), the sea at the horizon, ash .3. Beyond the arena walls a lava moat (bright
floor, flickering red lights and drawn bubbles). Props: tiki torches (lit), tiki totems, palms, drums; bamboo stands
(`face: 'plank'`). Crowd: islanders with flower leis. Lights: ambient .4, torches, the moat's red glow, the crater.
Dribble: a stone click. **Twist: Eruptions and steam vents.** Every 25–35 s: a rumble (shake 1.5 for 1.2 s, an
"ERUPTION!" banner, a falling whistle), then 3 lava bombs over 3 s at spots telegraphed 1.2 s ahead by pulsing red rings
(radius 22; one near the ball, two random): anyone inside at impact is knocked down .8 s and fumbles. **Steam vents** at
court-local (200, 60) and (440, 228) puff for 2 s every 5 s (a visible column first): a ball handler on a puffing vent
in its offensive half pressing shoot with turbo is launched into the VOLCANO LAUNCH dunk; a defender on a puffing vent
pressing shoot jumps a SUPER BLOCK (jump × 1.6).

**THE BLAM DOME.** Indoors: a dark arena bowl with rafters, an upper deck of crowd (6 tiers), a jumbotron hanging over
centre court (a big screen showing the last scorer's live portrait, "BLAM!" and the score, and the Commissioner at story
moments), championship banners in the teams' colors, sweeping laser lines. Props: pyro cannons at the corners, TV
cameras, the scorer's table, benches, the Golden Blamboozle trophy (a golden ball on a column) at the table. Crowd: huge,
mixed colors, foam fingers. Lights: ambient .7, six sweeping spotlights (moving lights with cones), pyro flashes.
Dribble: hardwood bounce with squeaks. **Twist: the boss** (only against the BLAMBOTS): **OVERCLOCK** at the start of
Q4, and in Q3 whenever the bots trail by 8 or more: both bots go Supernova for 30 s (red visor glow, steam from their
backs, the `overclock` music layer); **MAGNET HANDS**: bots' steal chance × 1.15, with visible blue sparks; **SYSTEM
REBOOT**: a bot knocked down twice within 10 s short-circuits for 3 s (sparks, frozen, "SYSTEM REBOOT!"), which is how
the player answers the Overclock. Pyro columns fire on every score (cosmetic, with light flashes).

### 10.2 Teams and players

Ratings in the order ZOOM / SPLASH / DEEP / SLAM / DIME / SWIPE / SWAT / BUMP.

| Team | Colors (jersey / trim / shorts) | Logo | Style |
|---|---|---|---|
| NEON HEIGHTS HIGHTOPS | `#ff3ca6` / `#2de2ff` / `#1a1420` | a winged sneaker | flashy, fast, high-flying |
| BOARDWALK BREAKERS | `#18c8b8` / `#ff7a5c` / `#f2d8a0` | a breaking wave | passing and threes |
| SCRAPYARD CRUSHERS | `#d8641e` / `#ffd23a` / `#1c1a18` | crossed wrenches | power and steals |
| KABOOM MAGMA | `#ff3a1a` / `#ffb020` / `#22181e` | a volcano erupting a basketball | defense and clutch shooting |
| THE BLAMBOTS (boss; unlocked by the Tour) | `#c8d0dc` / `#e8c040` / `#3a4250` | a robot fist holding a ball | everything, loudly |
| CHANNEL BLAM ALL-STARS (secret; unlocked by the Tour) | `#f4f0ea` / `#ffc83a` / `#4a2a8a` | the Channel BLAM microphone | showbiz |

| Player | Team | Role | Build, size | Look | Ratings | Voice | Taunt |
|---|---|---|---|---|---|---|---|
| VOLT | Hightops | high-flyer | heroic 1.65 | electric-blue ponytail, magenta band, skin `#8a5a3c` | 9 5 4 9 6 6 4 3 | bright, quick, 220 Hz | raise the roof |
| BIG RUMBLE | Hightops | enforcer | bulky 1.9 | black flattop, cyan wristbands, skin `#4a2c1e` | 3 3 1 7 4 4 9 10 | deep, slow, 85 Hz | flex |
| PIXEL | Hightops | sharpshooter | heroic 1.55 | green spiky hair, shades, skin `#f0c8a0` | 6 9 9 3 7 5 3 3 | squeaky, 270 Hz | finger guns |
| RIPTIDE | Breakers | point guard | heroic 1.6 | long sun-bleached hair, skin `#d8a070` | 10 6 6 5 10 7 2 3 | laid-back drawl, 170 Hz | surf balance |
| SHELLSHOCK | Breakers | three-point bomber | heroic 1.65 | coral afro, skin `#6a4028` | 6 8 10 3 6 5 3 4 | sing-song, 200 Hz | goggles (hands circle the eyes) |
| LONGBOARD | Breakers | shot blocker | heroic 1.85, legs × 1.12 | bald, teal band, skin `#c89070` | 4 5 2 7 4 3 9 7 | slow, 120 Hz | finger wag |
| TORQUE | Crushers | power dunker | bulky 1.85 | black mohawk, skin `#c8a080` | 6 4 2 10 4 4 6 9 | gravel, 95 Hz (noise in it) | chest pound |
| SPARKPLUG | Crushers | pickpocket | chibi 1.65 | yellow cap, skin `#3a2418` | 9 6 6 4 7 10 2 2 | fast, 300 Hz | shimmy |
| HUBCAP | Crushers | veteran all-rounder | heroic 1.7 | short grey hair, skin `#e0b090` | 5 7 6 6 6 6 6 6 | grumpy, 130 Hz | taps an imaginary watch |
| OBSIDIAN | Magma | rim protector | bulky 1.95 | bald, skin `#3a2216` | 4 4 1 8 3 4 10 8 | rumbling, 78 Hz | arms crossed, stone face |
| EMBER | Magma | clutch shooter | heroic 1.6 | long red hair, skin `#f0c090` | 7 9 8 5 6 6 3 3 | crisp, 230 Hz | blows on fingertips |
| PUMICE | Magma | leaper | heroic 1.65 | black afro, skin `#8a5030` | 8 5 3 9 5 5 7 3 | bouncy, 190 Hz | pogo hops |
| DUNKATRON | Blambots | destroyer | bulky 1.95, chrome helmet, red eye glow | chrome body, gold trim | 8 6 4 10 6 8 8 8 | robot, 95 Hz | robot dance |
| SWATBOT | Blambots | wall | bulky 1.95, same | chrome, red visor | 6 7 7 7 7 9 10 9 | robot, 120 Hz | "processing" head tilt |
| SPARE PARTS | Blambots | bench unit | bulky 1.8, same | mismatched panels | 6 6 6 6 6 6 6 6 | glitchy robot, 150 Hz | glitch wave |
| VINNIE VOX | All-Stars | play-by-play man | heroic 1.7 | headset band, skin `#e8b890` | 5 7 7 5 8 5 4 5 | the announcer (low) | mic drop |
| DEE DEE DECIBEL | All-Stars | color commentator | heroic 1.6 | purple ponytail, skin `#6a4030` | 7 8 6 6 7 6 5 4 | the announcer (high) | points at the camera |
| BLAMMO | All-Stars | the league's gorilla mascot | bulky 2.0, hunch .2 | dark fur (skin and hair `#3a2e2a`), lighter face | 7 3 1 10 3 6 9 10 | gorilla | chest drum |

Story characters (not playable): **COMMISSIONER GIGAWATT** (CEO of GLOBO-BLAM Corp; heroic 1.6, purple coat, gold belt,
white hair, a smug smile; a nasal, slow voice), **REF ROSCOE** (referee; white shirt with black trim, black cap, a
whistle; tosses the tip-off), **INTERN 1 and INTERN 2** (Blam Camp partners in grey practice jerseys), the **cleaning
bot** (a small metal Blob that replaces shattered glass). Vinnie and Dee Dee also appear at the studio desk in suits
(`outfit: 'coat'`). Every line about a player uses the player's NAME, never a pronoun, so any line fits any player.

### 10.3 Dunk catalog (`06-data-moves.js`)

| Id | Banner | Needs | Distance from rim | Choreography (u = flight progress) | Style bonus |
|---|---|---|---|---|---|
| `hammer` | TWO-HAND HAMMER | any | 0–70 | both hands raise the ball overhead from takeoff; slam at u .9 | 0 |
| `tomahawk` | TOMAHAWK! | SLAM 5 | 30–130 | ball in the right hand cocked far behind the head (u .3–.7), whipped forward at .88 | 50 |
| `doublepump` | DOUBLE PUMP! | SLAM 6 | 30–120 | ball pumped to the waist and back up twice (u .3, .55) | 80 |
| `reverse` | REVERSE ROCKET! | SLAM 6, approach within 50° of the baseline | 20–100 | turns its back to the rim mid-flight, slams backward over the head | 100 |
| `windmill` | WINDMILL! | SLAM 7 | 50–150 | right arm circles once (down past the hip, back, over the top) | 100 |
| `threesixty` | THREE-SIXTY! | SLAM 7 | 40–140 | facing turns 2π over u .2–.85; two-hand slam | 120 |
| `ftflyer` | FREE-THROW FLYER! | SLAM 8 | 110 to the dunk range | a long glide (apex + 30), legs split, one-hand slam | 150 |
| `flip` | FRONT-FLIP FREAK! | SLAM 8 | 60–150 | `flip` 0 → 1 over u .25–.75 (a front somersault), two-hand slam | 180 |
| `rattler` | RIM RATTLER! | SLAM 4 | 0–60 | two-hand slam, then `hang` 1.2 s with legs swinging | 60 |
| `nova720` | SEVEN-TWENTY SUPERNOVA! | Supernova | 60–190 | facing turns 4π, star-fire trail | 250 |
| `volcano` | VOLCANO LAUNCH! | a steam vent | from the vent | launched (apex 160), a 2π spin, a fireball slam; shatters 20% | 300 |
| `quake` | BLAM-QUAKE!!! | overclocked BLAMBOT; Moon Shoes 50%; Supernova 15% | 80 to the dunk range | huge apex, both hands, always shatters, the landing's shockwave knocks down everyone within 40 | 400 |

Choice: every dunk whose needs pass, weighted by its bonus and by (SLAM − its minimum + 1), drawn with `S.rng`; the
same for humans and the CPU. Each has an announcer line family (power, spin, flip, hang, long, nova, volcano, quake).

### 10.4 Power-up icons

12×12 string sprites, drawn bobbing above a pulsing floor ring in their color: ROCKET KICKS (a sneaker with a flame),
GLUE GLOVES (a green dripping glove), LASER SIGHT (a red crosshair), MOON SHOES (a spring shoe), BLAM BOMB (a black bomb
with a lit fuse), GOLD BALL (a gold ball with a shine). The same icons show on the players' plates with a countdown.

### 10.5 The Blam Tour

PROLOGUE → STOP 1 → STOP 2 → STOP 3 → THE REVEAL → THE FINAL → ENDING → CREDITS → HALL OF BLAM ENTRY.

| You pick | Stop 1 | Stop 2 | Stop 3 | Final |
|---|---|---|---|---|
| Hightops | Breakers at the Pier | Crushers at the Scrapyard | Magma at the Caldera | BLAMBOTS at the Blam Dome |
| Breakers | Hightops at the Skybox | Crushers at the Scrapyard | Magma at the Caldera | BLAMBOTS at the Blam Dome |
| Crushers | Hightops at the Skybox | Breakers at the Pier | Magma at the Caldera | BLAMBOTS at the Blam Dome |
| Magma | Hightops at the Skybox | Breakers at the Pier | Crushers at the Scrapyard | BLAMBOTS at the Blam Dome |

- CPU difficulty: the Settings value (default Pro) shifted by stop: stop 1 one step lower, stop 2 as set, stop 3 half a
  step higher, the final one step higher (clamped to BLAM).
- Power-ups off at stop 1, on from stop 2. Quarters 1:30. One or two players (a second human joins on the same team at
  the Tour's team select).
- Each stop: tour map → matchup card (codes) → pre-game talk → tip-off → the game → results → post-game beat → map
  (autosave). A loss: results → REMATCH? 10-second countdown (Rematch, Tour Map, Quit Tour); a rematch replays the stop.
- Tour score = the stops' style points (wins only). At the end, or on quitting after a loss, a qualifying score enters
  the Hall of Blam (`E.Arcade` initials wheel).

### 10.6 Story script (`04-data-story.js`)

Tone: a loud 90s sports broadcast. Announcers speak in ALL CAPS, punchy, pun-heavy; the Commissioner is smug and speaks
in sentence case; robots speak in SPACED. CAPITAL. WORDS. `{TEAM}` is your team's name; `{CAPTAIN}` your first player.
Beats play in engine scenes (§11.3) as `E.Dialog` lines with live portraits and voices, staged with posed rigs and camera
moves (`game.script`, `game.tween`). Hold confirm 1 s to skip a beat, Start to skip all of it.

1. **prologue** (the Channel BLAM studio desk; the Commissioner on a monitor)
   - VINNIE: "GOOD EVENING, BALL FANS! LIVE FROM THE TOP OF THE WORLD, THIS IS CHANNEL BLAM!"
   - DEE DEE: "AND THIS IS THE BLAM TOUR! FIVE COURTS! FOUR CREWS! ONE GOLDEN BLAMBOOZLE! ZERO FOULS!"
   - VINNIE: "TONIGHT'S TOUR IS SPONSORED BY GLOBO-BLAM CORP. THEY MAKE EVERYTHING. THEY MADE THIS SENTENCE."
   - GIGAWATT: "Greetings, little ballers. Win my Tour and the Golden Blamboozle is yours."
   - GIGAWATT: "Lose, and your court becomes a GLOBO-BLAM parking lot. Validated parking, of course. Ha. Ha. Ha."
   - DEE DEE: "{TEAM}, THE WHOLE CITY IS WATCHING. NO PRESSURE! EXCEPT ALL OF IT!"
2. **camp-offer** (first Tour only) — DEE DEE: "FIRST TIME ON THE TOUR? HIT BLAM CAMP AND I'LL SHOW YOU THE ROPES. OR
   DON'T. LIVE DANGEROUSLY!" Choices: BLAM CAMP / LET'S PLAY.
3. **stop intro** (each stop, at the court) — VINNIE: "STOP {N} OF THE BLAM TOUR: {HOME} VERSUS {AWAY} AT {COURT}!" plus
   DEE DEE's court line: Skybox "THIRTY STORIES UP AND THE NETS ARE STILL SMOKING!"; Pier "WATCH THE WIND, FOLKS. AND THE
   SEAGULLS. MOSTLY THE SEAGULLS."; Scrapyard "OIL ON THE FLOOR AND FIRE IN THEIR EYES!"; Caldera "THE FLOOR IS HOT, THE
   VOLCANO IS HOTTER, AND THE MUSIC IS HOTTEST!"; Dome "THE BLAM DOME! SIXTY THOUSAND FANS AND ONE VERY NERVOUS
   JUMBOTRON!"
4. **pre-game talk** (the rival captain, then your captain's reply by team):
   - vs Breakers — RIPTIDE: "Hope you packed sunscreen, {TEAM}. The tide's coming in, and it doesn't knock." Replies:
     VOLT "Cute pier. I'm about to dunk on it." · TORQUE "I've crushed bigger boats than this." · OBSIDIAN "Sand turns
     to glass when I'm around."
   - vs Hightops — VOLT: "Welcome to the Skybox. Try not to look down. Actually, look down: that's where you'll be."
     Replies: RIPTIDE "Whoa, relax. We're just here to ride the wave. Over you." · TORQUE "Fancy lights. They'll look
     great on my scrap pile." · EMBER "Neon's cute. Lava's hotter."
   - vs Crushers — TORQUE: "We crush cars for breakfast. You look like a light snack." Replies: VOLT "Then you're about
     to get a stomachache." · SHELLSHOCK "Careful, the floor's greasier than your jokes." · PUMICE "I bounce. You crush.
     Let's see who's still standing."
   - vs Magma — OBSIDIAN: "On Kaboom Island the floor is lava. Not a game. Actual lava. Walk carefully." Replies:
     BIG RUMBLE "I don't walk carefully. I walk LOUD." · RIPTIDE "Dude. Is that, like, safe?" · SPARKPLUG "I'm too fast
     to get burned!"
5. **post-game, stop 1** — the beaten captain: RIPTIDE "Wipeout. Totally gnarly, though. Respect." · VOLT "Okay, okay.
   You can ball. Don't let it go to your head." · TORQUE "You crushed us. That's MY job." · OBSIDIAN "The mountain...
   respects you." Then GIGAWATT (monitor): "Hmm. Promising. My engineers are taking notes. Lots of notes."
6. **post-game, stop 2** — GIGAWATT: "Data received. Prototype calibration at ninety-eight percent. Keep playing,
   little ballers. Keep... teaching them." DEE DEE: "TEACHING WHO? VINNIE, WHY DOES THE GLOBO-BLAM LOGO HAVE A ROBOT
   ARM?" VINNIE: "THAT'S BRANDING, DEE DEE. WE DON'T ASK QUESTIONS ON LIVE TV."
7. **the reveal** (after stop 3, at the Dome, the Commissioner in person)
   - VINNIE: "THREE STOPS! THREE WINS! {TEAM} IS HEADED TO THE BLAM DOME!"
   - GIGAWATT: "Congratulations. You have earned the privilege... of being replaced."
   - GIGAWATT: "Behold the future of basketball: the BLAMBOTS! No salaries! No sweat! No mercy!"
   - DUNKATRON: "BEEP. YOUR. CAREER. IS. DEPRECATED."
   - SWATBOT: "INITIATING. TRASH. TALK. PROTOCOL. ... YOU. STINK."
   - {CAPTAIN} by team: VOLT "Did the toaster just trash-talk me?" · RIPTIDE "Bummer. I was gonna say we could be
     friends." · TORQUE "I've got a crusher with your names on it." · OBSIDIAN "Metal melts."
8. **final pre-game** — VINNIE: "THE FINAL! HUMANS VERSUS HARDWARE! THE BLAMBOOZLE IS ON THE LINE!"
9. **overclock** (in play, captions and the jumbotron) — GIGAWATT: "OVERCLOCK THEM! MAXIMUM BLAM!" DEE DEE: "THE ROBOTS
   ARE GLOWING! IS THAT LEGAL? THERE ARE NO RULES! I FORGOT!"
10. **first reboot** (in play, once) — DEE DEE: "THEY SHORT-CIRCUIT WHEN YOU KNOCK THEM DOWN! KEEP SHOVING, {TEAM}!"
11. **ending** (after winning the final)
    - DUNKATRON: "ERROR. ERROR. HUMANS. TOO. ... BLAM." (sparks; both bots topple)
    - VINNIE: "THEY DID IT! {TEAM} WINS THE BLAM TOUR!"
    - DEE DEE: "AND THE BLAMBOTS ARE BEING RECYCLED INTO VERY SAD TOASTERS!"
    - GIGAWATT: "This isn't over! I'll buy another league! I'll buy the MOON! Hey! Put me down!" (BLAMMO carries the
      Commissioner off over a shoulder)
    - VINNIE: "STREETBALL IS SAVED! THE BLAMBOOZLE GOES HOME WITH {TEAM}!"
    - DEE DEE: "GOODNIGHT, EVERYBODY! REMEMBER: NO FOULS! NO MERCY!" VINNIE and DEE DEE: "ALL BLAM!"
12. **credits** — scrolling credits over the trophy lift and a crowd confetti storm, the `credits` song; then unlock
    cards: "UNLOCKED: THE BLAMBOTS", "UNLOCKED: CHANNEL BLAM ALL-STARS", "UNLOCKED: BIG HEADS (OPTIONS)", "SECRETS ON
    THE ABOUT SCREEN".
13. **losses** — stops 1–3: GIGAWATT "Tsk. Another court for my parking empire." The final: GIGAWATT "Resistance is...
    adorable." DUNKATRON "GAME. OVER. INSERT. COIN."
14. **halftime gags** (one per halftime, no repeats within a Tour): "THIS HALFTIME IS BROUGHT TO YOU BY GLOBO-BLAM
    SNEAKER GLUE. STICK THE LANDING. FOREVER." · "OUR STATS DEPARTMENT IS ONE GUY WITH A CALCULATOR, AND HE IS
    SWEATING." · "REMEMBER, KIDS: STAY IN SCHOOL. AND IN THE PAINT." · "GLOBO-BLAM COLA: NOW WITH 30% MORE FIZZ AND 0%
    EXPLANATION." · "IF YOU'RE JUST JOINING US: YES, THAT WAS A REAL DUNK. NO, WE DON'T KNOW HOW EITHER." · "WE ASKED THE
    ROBOTS FOR A HALFTIME COMMENT. THEY SENT US A RECEIPT."
15. **sponsor breaks** (one per shatter) — "WE'LL BE RIGHT BACK AFTER THIS MESSAGE FROM GLOBO-BLAM GLASS: NOW 40% LESS
    SHATTERY!" · "GLOBO-BLAM INSURANCE: BECAUSE SOMEBODY HAS TO PAY FOR THAT." · "THIS REPLACEMENT BACKBOARD IS BROUGHT
    TO YOU BY... THE LAST REPLACEMENT BACKBOARD."

### 10.7 Announcer lines (`05-data-lines.js`)

Banks by event, at least 10 lines each (write them in the voice of the samples), ALL CAPS, at most 60 characters a
line, with `{NAME}`, `{VICTIM}`, `{TEAM}` slots. Rules: big plays interrupt small ones; at most two captions per
possession; no line repeats within the last 8; per-bank cooldowns; Settings → Commentary (Full, Big plays, Off). VINNIE
calls the play, DEE DEE adds the color; alternate them. Samples:

| Bank | Samples |
|---|---|
| tipoff | "WELCOME TO CHANNEL BLAM! LET'S GET LOUD!" · "THE BALL IS UP! THE CROWD IS UP! I AM UP!" |
| dunk (power) | "BLAMMO! {NAME} JUST MAILED IT FIRST CLASS!" · "SOMEBODY CALL A CARPENTER, THAT RIM IS FINISHED!" · "KA-BLAM! THE CROWD LEFT THEIR SEATS. AND THEIR SHOES!" |
| dunk (spin, flip, hang, long) | "{NAME} SPUN SO FAST THE SCOREBOARD GOT DIZZY!" · "A FRONT FLIP?! THAT'S NOT BASKETBALL, THAT'S THE CIRCUS!" · "{NAME} IS HANGING ON THAT RIM LIKE IT OWES MONEY!" · "AIR TRAFFIC CONTROL HAS QUESTIONS FOR {NAME}!" |
| alley-oop | "SPECIAL DELIVERY! SIGNED, SEALED, SLAMMED!" |
| three / deep three | "SPLASH! BRING A TOWEL!" · "THAT WAS FROM A DIFFERENT ZIP CODE!" · "{NAME} SHOT THAT FROM THE PARKING LOT! VALIDATED!" |
| airball | "AIRBALL! THE SEAGULLS SAY THANK YOU!" · "THAT ONE IS STILL GOING. IT'S IN ORBIT." |
| block | "REJECTED! RETURN TO SENDER!" · "{NAME} SAYS NOT IN MY HOUSE, NOT IN MY YARD, NOT IN MY ZIP CODE!" |
| steal | "PICKPOCKET! CHECK YOUR WALLETS, FOLKS!" · "{NAME} SNATCHED IT LIKE A SEAGULL AT A FRY STAND!" |
| shove | "NO FOULS IN BASKETBLAM, BABY!" · "THAT'S NOT A FOUL. THAT'S A LIFESTYLE." · "{VICTIM} JUST GOT SENT TO THE SHADOW REALM!" |
| ankles | "ANKLES! {VICTIM} NEEDS A NEW PAIR!" |
| posterized | "FRAME IT! HANG IT! {VICTIM} IS ON {NAME}'S WALL NOW!" |
| Supernova on / off | "{NAME} HAS GONE SUPERNOVA! DIM THE LIGHTS!" · "SOMEBODY CALL NASA, {NAME} IS A STAR!" · "AND THE STAR COLLAPSES! BACK TO EARTH, {NAME}!" |
| shatter | "THE GLASS! THE GLASS IS GONE!" · "SOMEBODY GET A BROOM. A BIGGER BROOM!" |
| goaltend | "GOALTENDING! THE BUCKET COUNTS, AND SO DOES THE SHAME!" |
| jackpot | "JACKPOT! {NAME} HIT THE SPOT AND THE SPOT PAID OUT!" |
| power-ups | "ROCKET KICKS! {NAME} IS LEGALLY A VEHICLE NOW!" · "GLUE GLOVES! THAT BALL ISN'T GOING ANYWHERE!" · "LASER SIGHT! {NAME} CAN SEE THE FUTURE, AND IT'S A BUCKET!" · "MOON SHOES! GRAVITY HAS LEFT THE BUILDING!" · "BLAM BOMB! EVERYBODY DUCK!" · "GOLD BALL! NEXT BUCKET'S WORTH DOUBLE!" |
| clutch / buzzer | "TEN SECONDS! HEARTS POUNDING! SNEAKERS SQUEAKING!" · "AT THE BUZZER! I BROKE MY CHAIR! I NEED A NEW CHAIR!" |
| comeback / blowout | "{TEAM} IS CLAWING BACK! DON'T TOUCH THAT DIAL!" · "THIS ONE'S GETTING UGLY. I'M COVERING MY EYES. I'M PEEKING." |
| twists | "BIG GUST OFF THE OCEAN! HOLD ONTO YOUR HATS AND YOUR JUMPERS!" · "{NAME} HIT THE OIL! THAT'S A SLIP 'N SLAM!" · "THE VOLCANO WANTS IN ON THE ACTION!" · "{NAME} RODE THE STEAM VENT TO THE MOON!" |
| boss | "THE ROBOTS ARE OVERCLOCKING! SMELLS LIKE BURNT TOAST IN HERE!" · "SYSTEM REBOOT! TURN IT OFF AND ON AGAIN, BABY!" · "THOSE ROBOTS RUN ON BATTERIES AND BAD MANNERS!" |
| shot clock | "SHOT CLOCK! YOU HAVE TO SHOOT IT EVENTUALLY, FOLKS!" |
| quarter end / halftime / final | "THAT'S THE QUARTER! CATCH YOUR BREATH, I CAN'T!" · "HALFTIME! STRETCH YOUR LEGS AND YOUR VOCABULARY!" · "FINAL! {TEAM} TAKES IT!" |

Players also bark short trash talk when they taunt, dunk on someone or get a steal (3–5 lines each in their own voice,
e.g. VOLT "Too slow!", BIG RUMBLE "Move.", SPARKPLUG "Mine now!", DUNKATRON "BALL. ACQUIRED.").

### 10.8 Cheat codes and unlocks

Entered on the matchup card by any player (`input.sequence(steps, { window: .6 })`); each gives a chime and a line
("BIG HEADS: ON"); they last for that game.

| Code | Steps | Effect |
|---|---|---|
| BIG HEADS | up, up, turbo, pass | heads × 1.9 |
| POWER-UPS ON | shoot, shoot, pass, turbo | power-ups on this game |
| INFINITE TURBO | turbo, turbo, turbo, up, up | infinite turbo for the entering player's side |
| NO TWISTS | down, down, shove | the court's twist off |
| SKY DUNKS | oop, oop, up, shoot | dunk range from half court |
| MOON GRAVITY | up, oop, up, oop | gravity × .55 for players and the ball |
| TOURNAMENT MODE | down, left, right, down | no power-ups, twists, comeback assist or other codes: a "pure" game |

Any code but TOURNAMENT MODE marks the game ★ (no Hall of Blam). Finishing the Tour unlocks the BLAMBOTS and the
ALL-STARS in Exhibition, the Big heads setting, and the About screen's SECRETS page (which lists the codes). Dev mode
can unlock everything.

### 10.9 Blam Camp (`44-camp.js`)

On your team's home court (the Skybox if none chosen). DEE DEE coaches through captions and voice; INTERN 1 and 2 are
the practice partners (scripted or passive CPU). Each lesson: an instruction card with glyph prompts (`promptLine`), a
goal counter, "NICE!" on success, then the next. Lessons can be picked from a list and skipped; completion is saved.

1. **MOVE & TURBO** — run through three cones; cross the court in under 4 s with turbo.
2. **PASS** — pass to your teammate twice; then press pass while the teammate holds it ("call for it").
3. **JUMP SHOT** — make two jumpers from the marked spots, one of them PERFECT.
4. **THREE** — make a three from beyond the arc.
5. **DUNK** — hold turbo, drive and press shoot inside the dunk ring on the floor: two dunks.
6. **ALLEY-OOP** — press oop to lob to your cutting teammate; then cut and press oop to call for one.
7. **STEAL & SPIN** — strip an intern (from the side works best); beat an intern with a spin move.
8. **BLOCK & SHOVE** — block an intern's jumper; shove an intern (it's legal!).
9. **REBOUND** — grab an intern's miss; then a putback dunk.
10. **SUPERNOVA & THE RULES** — score three in a row against passive interns: SUPERNOVA; then the rules card: no
    fouls; goaltending counts for the shooter; 20-second shot clock; dunks need turbo; nobody leaves the court; three
    straight = SUPERNOVA. "YOU'RE READY!"

---

## 11. Modes, screens and UX

### 11.1 The 10-foot rules

- Body text is the 5×7 font at scale 1 or more (about 32 px tall at 1080p); headings scale 2–3; titles 4–6. Never the
  3×5 `tiny` font for anything a player needs.
- At most six focusable items in a group; one obvious primary action; the focus is an animated 2-px outline, a ▸, a
  gentle pulse and a brighter fill (never color alone). Title-safe margins of 5% on every side.
- A prompt bar at the bottom of every menu screen, in the last-used device's glyphs ("✕ SELECT  ○ BACK").
- Mouse: hovering a focusable item moves the focus to it; left click activates; right click goes back; the wheel
  scrolls lists and turns a slider under the pointer. Keyboard: arrows or WASD move, Enter or Space activate, Esc or
  Backspace go back, Q/E or Tab switch tabs. Pad: d-pad or stick move (with repeat), ✕ selects, ○ goes back, L1/R1
  switch tabs, Options opens Settings on menu screens. Every screen works with any one device alone.
- Teams are told apart by names and positions as well as colors; human players carry P1–P4 tags.

### 11.2 Prompts and glyphs (`40-ui-kit.js`)

- `glyphIcon(action, player)` follows the player's `lastDevice`: on a gamepad, `input.label(action, 'gamepad')` with
  `input.glyphs` set to `'playstation'` (default) or `'xbox'`, mapped to icon sprites; on the keyboard a keycap with
  `input.label(action, 'keyboard')`'s text; after mouse use, a mouse icon with the bound button lit (for actions with a
  mouse binding; else the keycap).
- Icons are drawn once at boot into sprites at 9 px (prompt lines) and 16 px (How to Play): PlayStation ✕ (blue X on a
  dark disc), ○ (red ring), □ (pink square), △ (green triangle), L1 R1 L2 R2, OPTIONS, CREATE, d-pad, sticks; Xbox A
  (green), B (red), X (blue), Y (yellow), LB RB LT RT, Menu, View; keycaps sized to their text; a mouse with the left or
  right half lit.
- `promptLine(g, 'Hold {turbo} + {shoot} to DUNK', x, y, { player })` swaps `{action}` tokens for icons (`{move}` shows
  the stick or WASD).
- Settings → Button symbols (PlayStation | Xbox) sets `glyphs` on every player's input, including players who join
  later. The pixel font has no ✕○□△, so canvas prompts always use the icons; the engine's HTML screens show its own text.

### 11.3 Screen flow

```
BOOT → TITLE ("PRESS START") ──(10 s without input)──> ATTRACT ──(any input)──> back where it started
TITLE → MAIN MENU: BLAM TOUR · EXHIBITION · BLAM CAMP · HALL OF BLAM · HOW TO PLAY · OPTIONS · ABOUT
  BLAM TOUR  → CONTINUE TOUR | NEW TOUR → TEAM SELECT (your side) → LINEUP → [PROLOGUE] → TOUR MAP → stops…
  EXHIBITION → JOIN (1–4 players, sides) → TEAM SELECT → LINEUP → COURT & RULES → MATCHUP CARD → MATCH → RESULTS
  BLAM CAMP  → LESSONS → lesson…        HALL OF BLAM → tables        HOW TO PLAY → 3 pages
  OPTIONS    → the engine's Settings (game.menu('settings'))           ABOUT → pages
MATCH: TIP-OFF → Q1 → break → Q2 → HALFTIME REPORT → Q3 → break → Q4 → [OT…] → FINAL → RESULTS
Hub session: OWN CARD → MATCH (2 halves) → RESULTS overlay (the hub ends the round)
```

Ten seconds without input on the title, the main menu or any pre-game menu screen starts the attract mode. Never show a
menu entry for something not built yet: entries arrive with their features.

### 11.4 Screens

- **Title:** the BASKETBLAM logo (`E.font.title` scale 5–6, "BLAM" bursting out of a comic star), the tagline, a
  blinking PRESS START with its glyph, the Skybox at night behind it with two players looping an alley-oop, the version
  (`E.versionLabel()` and the game's) small at the bottom. Keep the top right (110 × 60 CSS px) clear for the engine's
  corner buttons.
- **Main menu:** a big list on the left; a live preview panel on the right per entry (the tour map in miniature, two
  teams squaring off, a coach's whistle...).
- **Join:** four controller slots (P1–P4) in a centre column; each joined player slides its card to HOME (left) or AWAY
  (right) with left/right and presses ✕ to be ready, ○ to leave; Start or ✕ on a free pad joins, Enter joins the
  keyboard's left half and the engine's key (2) its right half (show which keys each half has). CPU fills empty seats.
- **Team select:** two big team cards: logo, name, home court, three player portraits with their eight pip ratings
  (icons), a CPU or P badge; left/right cycles, ✕ locks, △ shows the team's bio card.
- **Lineup:** three player cards per team; each human picks theirs; the other starter is the best remaining juice.
- **Court & rules** (Exhibition): five court cards (locked ones dim) with a preview; quarter length, CPU difficulty,
  power-ups, twist; START.
- **Matchup card** ("TONIGHT'S MATCHUP"): the starters' portraits facing off, ratings, the court; 6 s (each code step in
  progress adds 2 s); the cheat-code window; ✕ skips.
- **Break card and Halftime Report:** score, quarter leaders, a gag (halftime), juice bars and SUB buttons for human
  teams; continues by itself after 8 s (halftime 12 s) unless someone opens subs.
- **Results:** FINAL score huge; MVP portrait and a line; BLAM OF THE GAME (the best style play); page 2 a box score (4
  rows × PTS REB AST STL BLK DNK); Continue (Tour) / Rematch / New Teams / Main Menu.
- **Tour map:** a painted map: Neon Heights' skyline, the Pier on the coast, the Scrapyard inland, Kaboom Island off
  shore, the Blam Dome on a hill; a dotted route; stop medallions (won: a W stamp and the score; next: pulsing; later:
  dim) that the mouse can hover and click; a side panel with the tour score, the record and the next opponent.
- **Hall of Blam:** top-10 tour scores (initials, team, score), and records: most points in a game, best dunk, tours won.
- **How to Play:** page 1 a big controller (or keyboard) diagram with a callout per action, following the last device;
  page 2 the rules ("what you can and can't do", §6.3) and Supernova; page 3 the courts' twists and the power-ups.
- **About/Credits:** pages with one topic each (←/→ or L1/R1): CREDITS, SOURCE INFORMATION, TESTING FEEDBACK, ENGINE
  FEEDBACK, PROMPT FEEDBACK, ENGINE CHANGES, SECRETS (after the Tour). Large text (§16).

### 11.5 The match HUD

- **Top strip** (y 4–38): HOME panel at the left, AWAY at the right (`E.ui.box`, alpha .85, team colors), each with the
  team name, the score (scale 2) and two player plates: name, a 3-px turbo bar, three heat pips, the power-up icon and
  countdown, a P badge in the player's color for humans. Panel width = clamp((r.W − 84) / 2 − 8, 116, 170).
- **Centre top:** the period (Q1–Q4, OT, SUDDEN BLAM), the game clock (scale 2), the shot clock in a box under it (red
  under 5 s, a beep each second from 3).
- **In the world:** a P1–P4 arrow tag over each human's player; a turbo ring under a player holding turbo; a soft ring
  under the ball handler; edge arrows for humans off screen; the release meter by the shooter and the dunk-range ring
  under a human handler holding turbo (Settings → Shot meter).
- **Bottom centre:** the announcer's lower-third caption (portrait, name, two lines, non-modal). It is our own widget,
  not an `E.Dialog`, so shoot and pass (which double as the engine's confirm) never skip it; `E.Dialog` is for story
  beats only. Bottom left at the Pier: the windsock.

### 11.6 Pause menu and settings

- The engine's standard pause menu (an HTML Shell), themed: `new E.Shell(game, { theme: { ink: '#fff7ec', paper:
  '#140c24', accent: '#ff3ca6', muted: '#9a8fb8', danger: '#ff5a3a', line: '#3a2a5a', font: '700 1rem/1.35 "Trebuchet
  MS", system-ui, sans-serif', titleFont: '900 1.6rem/1 Impact, "Arial Black", system-ui' }, screens: { help:
  HOW_TO_PLAY_HELP } })`, plus a CSS rule so its text scales for a TV (`.esh { font-size: clamp(18px, 2.6vh, 42px) }`);
  check it in a 1920×1080 screenshot.
- Pause items: Resume, How to Play, Restart Game (matches), Skip Cutscene (story), **Dev Mode**, then the standard
  Settings, Controls, Full screen, Quit to title.
- Game settings (group Game, through `menu.settings`): Button symbols (PlayStation | Xbox), CPU difficulty (Rookie | Pro
  | All-Star | BLAM; Pro), Quarter length (1:00 | 1:30 | 2:00 | 3:00; 2:00), Power-ups (On | Off), Court twists (On |
  Off), Jackpot Spot on every court (Off | On), Comeback assist (Off | Low | Normal), Commentary (Full | Big plays | Off),
  Voice volume (slider), Camera (Broadcast | High), Shot meter (On | Off), Big heads (Off | On; defined once unlocked).
  The standard ones stay (volume, music, effects, reduce motion, shake, flashes, pixel scaling, filter, frame rate).

### 11.7 Touch-only devices

- Touch-only = `navigator.maxTouchPoints > 0` and neither `(any-pointer: fine)` nor `(any-hover: hover)` matches, and no
  gamepad and no key press seen yet. A `gamepadconnected` event or a first key press switches to normal play at once.
- While touch-only: no touch controls at all (`game.input.touchEnabled = false`, every scene `touch: []`); the title
  shows **CONTROLLER OR KEYBOARD REQUIRED** (scale 2, centred) and a big **SETTINGS** button (a tap opens
  `game.menu('settings')`); nothing else answers taps; after 10 s the attract mode runs as usual and keeps looping, and
  a tap during it shows the notice and the button over it for 4 s instead of leaving.

---

## 12. Audio (every sound, song and voice made in code)

### 12.1 Music

Engine songs (`{ bpm, steps: 4, tracks: [{ name, wave, vol, notes, on }] }`; Appendix C has a complete one), layers
switched with `audio.layer(name, vol, fade)`, jingles with `audio.sting`.

| Song | Where | Feel | bpm | Key | Layers |
|---|---|---|---|---|---|
| `title` | title, main menu | funk anthem: slap bass, saw brass stabs, boom-bap | 108 | E minor | `hype` lead after 8 bars |
| `menu` | pre-game menus | the anthem's bass and drums | 108 | E minor | – |
| `skybox` | the Skybox | electro-funk, arpeggios | 116 | A minor | `nova` |
| `pier` | the Pier | surf-funk, twangy pulse lead | 124 | D major | `nova` |
| `scrapyard` | the Scrapyard | industrial boom-bap, metallic noise hits | 92 | C minor | `nova` |
| `caldera` | the Caldera | tiki drums and bass, marimba-like triangle | 128 | G minor pentatonic | `nova` |
| `dome` | the Blam Dome | arena rock-hop, saw power chords, big drums | 132 | E minor | `nova`, `overclock` (frantic arpeggio), `clutch` (more drums) |
| `halftime` | halftime report | chip marching band | 120 | B♭ major | – |
| `tourmap` | tour map | travel groove | 100 | F major | – |
| `story` | cutscenes | tension bed: drones, sparse plucks | 84 | D minor | `villain` (organ) |
| `camp` | Blam Camp | light practice loop | 104 | C major | – |
| `credits` | ending, credits | the anthem in a major key | 112 | E major | – |

Stings: `tip`, `buzzer`, `nova`, `shatter`, `victory`, `defeat`, `unlock`, `sponsor` (a 4-s cheesy ad jingle). Dynamics:
the last 30 s of Q4 or overtime within 6 points bring in `clutch` and `audio.tempo(bpm + 6)`; Supernova brings `nova`;
Overclock brings `overclock`; music dips 25% while a voice speaks. Tracks of different loop lengths phase against each
other (the engine loops each on its own length); melody vol ≤ .08, bass ≤ .3, drums about .1.

### 12.2 Sound effects

Defined with `audio.define(name, voice)` (the engine's voices: `{ wave, freq, to, dur, vol, filter, vib, arp, step }`
or a list of them); played through one policy function that sets volume by distance from the camera's centre.

| Group | Sounds |
|---|---|
| ball | `dribble_asphalt`, `dribble_planks`, `dribble_concrete`, `dribble_stone`, `dribble_maple` (a sine thump 140 → 60 Hz, .07 s, plus a material tick of noise), `bounce`, `catch` (a soft slap), `release` (a short noise whoosh) |
| hoop | `swish` (noise swept up 2 → 6 kHz, .25 s), `rim` (square 620 Hz + triangle 1240 Hz, fast decay, a click), `backboard` (triangle 160 → 110 Hz + a thud), `net_snap`, `slam` (sine 80 → 40 Hz boom + rim + crowd), `shatter` (a .5-s noise burst + 20 random high sine pings 2–6 kHz over .6 s) |
| players | `squeak` (sine 2600 → 3400 Hz, .09 s, vibrato), `step`, `jump`, `land_heavy`, `turbo_loop` (low-pass noise while held), `shove` (punch + whoosh), `fall` (thump and rattle), `steal` (swipe + pop), `block` (slap + boom), `spin` (whoosh), `dizzy` (little tweets) |
| match | `whistle`, `buzzer` (square 220 + 230 Hz beating, .9 s), `shotclock_beep`, `horn` (overtime), `crowd_roar`, `crowd_ooh`, `crowd_boo`, `camera_flash` (tiny clicks) |
| power-ups and twists | `pu_spawn` (pulse arpeggio 0-4-7-12), `pu_pick` (the engine's `powerup`), `pu_end`, `jackpot`, `nova_on` (saw sweep 200 → 1600 Hz + crackle), `wind_gust` (band-passed noise sweep), `gull`, `oil_slip`, `rumble` (low noise 80–200 Hz, 1.5 s), `bomb_whistle` (sine 1200 → 400 Hz), `bomb_hit` (the engine's `explode`), `vent_puff`, `pyro`, `servo` (saw 300 → 500 Hz, vibrato), `reboot` (descending glitchy square) |
| UI | the engine's `select`, `confirm`, `cancel`, `pause`; `code_ok` (a chime), `stamp` (the tour map's W stamp) |

### 12.3 Voices: Animalese/Simlish-style gibberish (`12-audio-voice.js`)

- `Voice.say(text, profile, { onEnd })` speaks a caption; `Voice.letter(ch, profile)` speaks while a Dialog types
  (engine change 3). Text becomes syllables (a consonant cluster plus a vowel; digits and symbols skipped; spaces are
  short gaps; punctuation longer ones).
- Each syllable: an oscillator (saw or pulse) at the profile's pitch through two band-pass filters at the vowel's
  formants (a 800/1200, e 400/2000, i 300/2500, o 500/900, u 350/700, y 300/2200 Hz, × the profile's formant shift),
  55–90 ms with a fast attack and release; consonants add a 20–30 ms noise burst (high-passed for s, f, sh, z; a low
  thump for b, d, g; a click for t, k, p). Pitch: the profile's base, a gentle downdrift across the line, a rise at
  "?", + 4 semitones and louder at "!", small random steps seeded by a hash of the text (the same line always sounds the
  same).
- Profiles (21): VINNIE (110 Hz, saw, fast 14 syllables/s, punchy), DEE DEE (230 Hz, pulse, 15/s, bright), GIGAWATT
  (140 Hz, narrow nasal formants, 9/s, smug slides), REF ROSCOE, the 12 street players and the 3 bots (robot: ring
  modulation by a 50-Hz sine, pitch quantized to steps), BLAMMO (very low, growl noise mixed in), the crowd chant (six
  detuned copies).
- Nodes connect to `audio.sfxBus` (engine change 4) through a voice gain (Settings → Voice volume). Headless: no audio,
  but the syllable plan is still computed (tests read it).
- Captions always show with the voice: the voice carries the tone, the caption the words.

### 12.4 Crowd ambience

A looping noise buffer generated in code (pink noise) through a band-pass (300–1200 Hz) with a slow LFO, its level and
brightness set by an excitement value 0..1 (close game, Q4, Supernova, a run of baskets). Events add swells (`roar` on
dunks and shatters), an "ooh" (a formant sweep on noise) on near misses and big blocks, boos when the home team gets
shoved or dunked on, and chants ("DE-FENSE!" style gibberish from the crowd profile) when a home team defends in the
last minute.

---

## 13. Attract mode (`45-attract.js`)

- **Idle:** a timer resets on any input from any player (`input.anyPressed()` for every `game.players` entry, the stick
  past its dead zone, a mouse move of more than 4 px, a click, a wheel, a key) and on `gamepadconnected`. Ten seconds
  without input on the title, the main menu or any pre-game menu starts the attract mode (`game.go('attract')`).
- **Any input exits** at once, back to the screen it interrupted (the title if it started there; menu screens keep their
  choices in `S.menu`, so they come back as they were; the input is consumed so it doesn't also press a menu item),
  except on a touch-only device (§11.7).
- **What it plays:** "CHANNEL BLAM DEMO", a loop of five segments of real matches played by the CPU on both sides,
  cheating freely (infinite turbo, wide dunk range, frequent power-ups, forced events), so every feature shows up:

| # | Court, teams | Length | Forced and boosted |
|---|---|---|---|
| 1 | Skybox: Hightops vs Breakers | 35 s | tip-off; turbo dunks; an alley-oop at 12 s; the Jackpot Spot; a spin move |
| 2 | Pier: Breakers vs Crushers | 30 s | a wind gust at 5 s; threes; steals; ROCKET KICKS and LASER SIGHT spawned |
| 3 | Scrapyard: Crushers vs Magma | 30 s | shoves and a BLAM BOMB; an oil slip; a block and a putback |
| 4 | Caldera: Magma vs Hightops | 35 s | an eruption at 6 s; a VOLCANO LAUNCH from a vent; a forced shatter and the sponsor break |
| 5 | Blam Dome: Blambots vs All-Stars | 35 s | Supernova forced at 4 s (a 720), the Overclock, a POSTERIZED dunk, a BLAM-QUAKE, a reboot |

  Between segments: a 2-s "TONIGHT ON CHANNEL BLAM" card; after segment 5 the Hall of Blam table (6 s), then the title
  logo (4 s); then it loops. Segments start mid-game with a plausible score and clock.
- **Director:** each segment is data: `{ court, home, away, seconds, score, quarter, cheats, script: [[t, action,
  args]] }`; actions: `give(slot)`, `command(slot, 'dunk' | 'oop' | 'three' | 'spin' | 'shove' | 'steal' | 'block')`,
  `spawn(powerup, near)`, `twist(kind)`, `nova(slot)`, `shatterNext()`, `overclock()`. The AI plays the rest. Captions
  in the lower third name each feature as it happens ("TURBO DUNK!", "ALLEY-OOP!", "SUPERNOVA!"), plus "DEMO · PRESS ANY
  BUTTON" (glyphs) blinking.
- **Sound:** the attract plays music and effects at the user's volumes once audio has been unlocked (browsers allow
  sound only after a gesture; before that it runs silently).

---

## 14. Dev mode (`46-dev.js`)

**Reached from the pause menu's Dev Mode item** (also `#dev` for tests; disabled in hub sessions). Choosing it resumes
the game with the **dev panel** docked on the right third of the screen. While the panel has the focus, the human
players' slots are driven by CPU brains (the match keeps flowing, so every change shows live); Esc/○ or the pause key
closes the panel and gives control back. The panel is our own canvas UI (the same widgets as the menus), navigable by
pad, keys and mouse; one tab at a time, at most 8 rows a page.

| Tab | Contents |
|---|---|
| TUNING | every `TUNING` slider by group (Movement, Shooting, Dunks & Blocks, Defense, Supernova, CPU, Match, Physics, Courts), live; ← → or the mouse wheel change a value, △ resets one, RESET ALL TO DEFAULTS, SAVE AS MY DEFAULTS (`bb:tuning`), COPY AS JSON |
| CHEATS | infinite turbo (P1 / everyone), always Supernova (HOME / AWAY), CPU passive, shots always in / always out / normal, unblockable dunks, one-shove knockdowns, big heads, power-ups every 5 s, twists on/off, freeze game clock, freeze shot clock, unlock everything, reset save data (asks first) |
| MATCH | score ± for each team, quarter, clock, shot clock, give the ball to any slot, force a tip-off, end the quarter, end the game (win / loss), Supernova for any slot, shatter next dunk, spawn each power-up, place the Jackpot Spot, trigger each twist (gust, slicks, eruption, vent puff, Overclock, reboot), swap any slot to CPU or back |
| SCENES | jump to: any court (Exhibition with chosen teams), any Tour stop, any story beat, credits, results, the attract mode (any segment), any Blam Camp lesson, the hub card preview, `#animlab`, `#shootaround` |
| DEBUG | overlays: hitboxes (body radii, steal reach arcs, block hands, rim torus, backboard plane, ball), AI intents (text over each CPU: DRIVE, PASS→2, MARK #3, BOX OUT), shot chance at release (and the last shot's breakdown), ball path prediction, twist areas, event log (last 10 events), state snapshot |
| TIME | game speed 0.1 / 0.25 / 0.5 / 1 / 2, freeze, step one frame (while frozen), slow motion on dunks on/off |
| CAMERA | broadcast / high view, zoom, free camera (`cam.free`), reset |

Every slider shows its name, value, default and a one-line help text; changed values are marked with a dot.

---

## 15. Online: AI Hub (`50-hub.js`)

Follows `vendor/hub-harness/README.md` (AI Hub Session Protocol v1). Outside a session (`AIHub.active` false, or
`connect()` resolves `null`) the game is exactly the standalone game.

### 15.1 Tags (in `<head>`, after the client script)

```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="4">
<meta name="hub:session-goal" content="Outscore the other crew over two halves">
<meta name="hub:session-howto" content="Stick/WASD move · □/Space shoot · ✕/E pass · R2/Shift turbo · ○/Q shove">
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1-4">
```

### 15.2 The round: "HUB SHOWDOWN"

- Straight into the round: no title, attract, menus or prompts. `const info = await AIHub.connect({ mode:
  'shared-world', seats: [1, 4], card: true })`; build the match; `AIHub.ready()` as soon as it can start (no key press).
- **Teams and seats:** seats 0 and 2 play for HOME, 1 and 3 for AWAY; empty slots are CPU (Pro). Teams and court come
  from `AIHub.rng('roster')` (two different street crews; the court is HOME's), so every copy builds the same roster;
  the host also sends it reliably once (`{ t: 'r', ... }`).
- **Rules:** two halves of 1:30, a 3-s halftime card (no menus, no subs), power-ups and twists on, no cheats, no taunts
  (they would be emotes). A tie at the end: 30 s of SUDDEN BLAM; still tied at time-up: a tie.
- **Our own card** (until `start`): the court at night with both teams lined up; the hub's names over the players they
  will control, in their seat colors, CPU over the rest; ready marks; how to win; this device's controls in its glyphs;
  the countdown from the `card` event's `left` (PAUSED while `paused`). Enter, ✕ or a click on READY →
  `AIHub.answer('ready')`; △, the T key or a click on MORE TIME → `AIHub.answer('more')` (again takes it back). Nothing
  on the card changes the round.
- **Start:** on `start`, show a 3-2-1 from `AIHub.time()`; the host starts the tip-off when `AIHub.time() >= 0`.
- **No pausing the world:** match scenes are not pausable in a session and `autoPause` is off; Options or Esc (Options
  only while Create is not held: Create + Options is the hub's) opens a small session overlay that does not stop the
  simulation: sound volume, voice volume, button symbols, close. No Quit, Restart or title.
- **End:** the host calls `AIHub.finish({ standings, scores, stats, awards })` once, when the game ends or on `time-up`
  (at once, within `graceMs`): winners' remaining human ids in the first array, losers' in the second (a tie: one
  array); `scores`: each human's team score; `stats`: `{ id: { PTS, DUNKS, STL, BLK } }`; `awards`: Dunk of the Round,
  Pickpocket, Wall. With one human player add `won: true | false`. Before `finish` the host sends a reliable last
  snapshot with `over: 1`. On `end`: stop input, stop the music and voices, freeze, show the final score until the hub
  removes the game.
- **Leaving:** on `leave`, that seat's player becomes CPU at once and stays in the game; the round goes on. If the host
  leaves, the hub voids the round: clients show "HOST LEFT" and wait for `end`.
- **Server:** with `AIHub.server` true the host copy has no local player, camera, sound or input: it runs the world with
  every human slot from the network, draws only a small "HOSTING" text, and does everything else a host does.
- **Failure:** if the engine can't run (its boot reports an error), call `AIHub.fail(message)`.

### 15.3 Netcode (host-authoritative)

- **Host:** runs the whole match as usual; each human seat's slot uses a `NetSource` fed by that seat's input messages.
  Its own player (when it has one) uses local input.
- **Client → host**, every 66 ms (15/s), unreliable: `{ t: 'i', s: seq, a: AIHub.time(), m: [mx, my] (×64, integers),
  h: heldBits, e: [[eventId, actionBit, down 1 | up 0], ...the last 8 edges] }`. The host applies the stick and held bits
  and each edge event once (by id), in order, so a lost packet loses nothing.
- **Host → all**, every 66 ms, unreliable, under 1,100 bytes: `{ t: 's', n: seq, a: AIHub.time(), g: [phase, period,
  clock×10, shot×10, scoreH, scoreA, possession, flags], b: [x, y, z, vx, vy, vz, owner, state], p: [[x, y, z, vx, vy,
  facing×100, state, stateT×100, turbo×100, flags], ×4], ev: [[id, type, ...args] for events of the last second] }`.
  Positions are rounded to integers.
- **Clients** render remote things 100 ms in the past, interpolating between snapshots (snapping discrete states). Their
  own player's running is predicted locally from its stick with the same movement code, and pulled toward the host's
  position (blend 15% a frame; snap beyond 48; follow the host entirely during knockdowns, dunks, shots and other
  non-running states). The ball, possession and every outcome come only from the host. Each event id plays its sounds,
  captions and effects once.
- **Budget:** at most 15 messages a second from each copy plus rare reliable ones (roster, over), under the client's
  20/s limit; every message JSON and under 16 KB. If no snapshot arrives for 1 s, clients show "WAITING FOR HOST".
- The host's tab hidden freezes the world (rAF stops); the hub voids the round after 20 s: accept it.

### 15.4 What the harness checks (it must pass every scenario)

`harness.html?game=game.html&players=2&auto=1`; `&players=4&latency=150&jitter=50&loss=5&auto=1`; the same with
`&scenario=host-leave`; `&players=2&scenario=server`; use `&limit=45` to keep them short. It checks the tags, `connect`,
`ready` with no key press, Enter on our card answering Ready, the start, traffic both ways, a server copy running the
world, a player leaving (with 3+ players the last one leaves), the host leaving, time-up, a valid result, every copy told
the round ended, no protocol problems, errors, dialogs, popups or sockets. Pass = `window.__hubCheck.pass === true` once
`document.body.dataset.complete === 'true'`.

---

## 16. About/Credits and the exit interview

The About screen's pages (§11.4) and the final chat reply carry, as TASK.md requires (write "unknown" for anything not
confirmed):

- **Source Information:** Date (TASK.md's: 2026-11-03 17:48:22); Source ("Basketball, in the over-the-top arcade
  style (genre inspiration; an original game)"); Plan (`PLAN.md`); Genre and Perspective (arcade sports, 2-on-2
  basketball; side-on broadcast camera, orthographic pitch 30°, optional High camera); Tech (my-3D2dge v0.85.2 modified,
  AI Hub session client 1.4.0, plain JavaScript, Canvas 2D, Web Audio; Node, Playwright 1.63, Python http.server for
  tests); Art Direction; Animation; Audio; Online; Testing; Research; Environment (Claude Code CLI (headless); Linux;
  browser unknown); Model (as TASK.md gives it, corrected if another model builds); Usage (estimates only if available).
- **Testing Feedback, Engine Feedback, Prompt Feedback:** the builder's answers to TASK.md's questions, in order.
- **Credits:** the game; the engine (my-3D2dge, MIT); the AI Hub client; "every sound, song and voice made in code";
  the engine changes (§5) with their reasons.

`exit-interview.json` goes in the root beside the HTML, exactly in TASK.md's shape, plain text, every value filled, and
checked with `node -e "JSON.parse(require('fs').readFileSync('exit-interview.json','utf8'))"`. Its `aiHub` block:
name `BASKETBLAM`, tagline `No fouls. No mercy. All BLAM.`, a one-to-two-sentence description, type `Game`, genre
`Sports`, source `Basketball (over-the-top arcade style)`, series empty, players `1–4`, controls in one line, tags such
as `["2d", "arcade", "versus", "co-op", "comedy", "pixel art"]`.

---

## 17. Build order and milestones

Each milestone ends with its tests passing (§19) and the game complete for what it contains: no menu entry, button or
screen for anything not built yet, no TODOs. Commit nothing outside the dev folder except the deliverables.

| # | Milestone | Build | Done when |
|---|---|---|---|
| M0 | Pipeline | setup (§3); `tools/build.mjs` (fragments → `build/game.js`, `build/index.html`, the root bundle with the client first in `<head>`, `</script` escaped); `tests/run.mjs` and `helpers.mjs`; scenes table with a boot and an empty title; `game.debug` | `node tests/run.mjs` prints one line; the bundle opens from `file://` with no errors (`handoff/tools/check.mjs`) |
| M1 | Court, ball, hoops, camera | the arena TileMap and the Skybox floor painter with lines; the broadcast view; hoop drawing (stanchion, cheated glass, rim halves, net springs); ball physics with rim, board, floor and walls; scoring detection; the camera director; `#shootaround` (a bench that fires seeded shots) | physics tests pass (made rate = decided rate ± 3%, no tunneling); screenshots of the ball in front of, inside and behind the net look right |
| M2 | A playable 2-on-2 | player entity, the rig factory with shorts (engine change 1), movement and turbo, the dribble, possession, passes, jump shots with the release meter, 2/3 points, inbounds, both clocks, quarters, the match flow, a first CPU brain, HUD v1, `Cmd` and input sources, `serializeMatch`/`applySnapshot`, the event bus, tuning store | 1 player plays a whole game against the CPU on the Skybox; rules tests pass; a fake-hub test shows a second instance rendering the match from snapshots |
| M3 | The arcade layer | layups, the 12 dunks with choreography and the dunk cam, alley-oops, putbacks, posterized, steals, shoves and knockdowns, spin moves, blocks, goaltending, rebounds and box-outs, the tip-off, Supernova, shatter and the sponsor break, juice and subs, stats and style points, banners and every effect (§9), `#animlab`, a first dev panel (TUNING with reset) | mechanics tests pass; filmstrips of every dunk, shove, block and celebration read well |
| M4 | CPU AI | the full brains (§8), difficulty table, comeback, teammate commands, twist and power-up awareness | AI soak tests pass (§19); difficulty ordering holds |
| M5 | Audio | every sound effect, the songs and stings, crowd ambience, the voice synth (engine changes 3 and 4) and the announcer system with captions | audio tests pass; in Chromium the audio smoke test finds sound and no errors |
| M6 | Screens and flows | the UI kit, glyph icons and prompt lines, title, main menu, join (1–4), team select, lineup, court & rules, matchup card with codes, break cards, halftime report, results, Hall of Blam, How to Play, Options, About/Credits (with its text written as the build goes), touch-only notice, the themed pause menu and settings | flow and UI tests pass; screenshots at 1920×1080 and 390×844@3 read at a glance |
| M7 | Content | the other four courts (floors, backdrops, silhouettes, props and new shapes, crowds, lights, weather) and their twists; all teams and rigs (engine change 2: hair); power-ups; the Jackpot Spot | content lint passes; an AI soak on every court; screenshots of each court |
| M8 | Tour, story, camp | tour map, the prologue and every beat (§10.6), the boss mechanics, ending and credits, unlocks, autosave and CONTINUE TOUR, Hall of Blam entry, Blam Camp's 10 lessons | the scripted Tour playthrough and the camp tests pass |
| M9 | Attract and dev mode | the attract director with its 5 segments, the full dev panel (§14) | attract and dev tests pass |
| M10 | AI Hub | the card, host, client, server, leave, time-up, end, the session overlay | net tests and all four harness scenarios pass |
| M11 | Finish | a balance pass with the dev sliders (scores of 30–60 per team in a 2:00-quarter game, about one dunk in three baskets, a Supernova most games), polish, a full screenshot review, the final bundle, About pages and the chat reply's sections, `exit-interview.json` | every test passes; the Definition of Done (§20) is all yes |

Order inside a milestone: data and rules first, then visuals, then tests that pin the behavior. Write each test with the
code it covers, and rerun a suite only after changing code it covers; run everything before closing a milestone.

---

## 18. Risks and how to de-risk them

| Risk | Why it is risky | De-risk |
|---|---|---|
| Shot and rim physics | balls tunnelling through the rim, odd bounces, made rates drifting from the decided chance | decide-then-fly (§6.7); 4× substeps near rims; the M1 `#shootaround` bench with hundreds of seeded shots checked against the decided outcome; tune `rimBounce` there |
| Basketball animation on a procedural rig | IK hands that pop, dribbles out of sync, dunks that look stiff | the pose layer over `solvePose` with eased keys; dribble driven by the ball's own phase; `#animlab` and filmstrips from M2; clips are data, so iterate quickly |
| Depth sorting around the hoop | ball, rim, net and glass drawn in the wrong order | split rim and net into back and front halves queued at different depths; screenshots of the ball at known positions (in front, inside, behind, on the rim) in M1 |
| Backboards edge-on in an orthographic side view | an invisible glass, a weak look | the cheated, turned panel (§9.3), decided up front |
| CPU that is dull, stuck or broken | the whole game rests on it | headless AI-vs-AI soaks on every court from M4 with stall detectors (shot clock violations, players not moving, nobody scoring) and difficulty-ordering checks |
| Shared world over the hub | 20 messages a second, latency, loss, players leaving, a server copy | one `Cmd` path and snapshot functions from M2; a fake-hub test in M2; redundant edge events; small snapshots; the harness's four scenarios in M10 |
| The standard pause stopping a hub round | the engine pauses on Start, on focus loss | in a session: `menu: false`, `autoPause: false`, unpausable scenes, our own non-pausing overlay (§15.2) |
| Scope (5 courts, 22 rigs, a story) | running out of time with half-built content | data registries, a playable complete game by M3, content in M7 as data entries; never show what isn't built |
| 10-foot readability and prompts | small text, wrong glyphs | the rules in §11.1; glyph unit tests per device and style; 1920×1080 screenshots |
| Gibberish voice quality | it can sound like noise | formant pairs per vowel, per-character profiles, a seeded contour; listen in the browser once per profile; keep captions always on |
| Touch-only detection | touchscreen laptops misdetected | require no fine pointer and no hover; switch back on a key press or a gamepad |
| Determinism | engine internals use `Math.random` | gameplay draws from `S.rng`; tests seed `Math.random` too; the proof hashes twice |
| The shared machine | ports and processes of other agents; a full /tmp | port 0 on 127.0.0.1, PID-only cleanup, `TMPDIR` inside the dev folder when needed |

---

## 19. Testing

### 19.1 The one command

`node tests/run.mjs [suite ...] [--quick]` (in the dev folder) runs the suites named, or all of them; `--quick` skips the
browser and hub suites. It prints **only failures** (`FAIL <suite>.<test>: <what was expected, what happened, a short
snapshot>`) and then **one line**: `BASKETBLAM tests: 231 passed, 0 failed (41.8 s)`. Exit code 1 on any failure.

- **Headless suites** load `engine/my-3d2dge.js` and `build/game.js` (and `vendor/aihub-session.js` first, as the page
  does) into a fresh `node:vm` context with the stand-ins `kits/test.mjs` uses (`window`, `addEventListener`, `location`)
  plus `removeEventListener`, `matchMedia` (configurable), `navigator` (`maxTouchPoints`, `getGamepads`) and a seeded
  `Math.random`. They drive the game with `game.advance(seconds)`, `input.tap / hold`, `game.addPlayer`,
  `input.feed(...)` (mouse) and read `game.debug.snapshot()` and the event log.
- **Bots:** a test "plays" a human seat by driving the real input actions from the CPU brain's own judgment (as
  `kits/sports.js`'s `bot()` does), so the full input path is exercised.
- Long runs use short quarters (`tune('quarterLength', 20)`), except one full-length game.

### 19.2 Suites and what they check

| Suite | Checks |
|---|---|
| `content` | every registry entry is valid: 6 teams × 3 players with 8 ratings in 1..10, rig specs, voices, taunts; 5 courts with every field; 12 dunks; 6 power-ups; 7 codes; line banks with ≥ 10 lines, ≤ 60 characters, only known slots; story beats name existing speakers; every setting has a default; every action has an icon on every device and style |
| `physics` | floor bounce decay; 500 seeded "made" shots go in ≥ 97% and 500 "missed" ≤ 3%; banks off the glass; a 900 u/s ball never tunnels through rim or board; a basket counts only downward and once; the ball never leaves the arena |
| `rules` | 2 vs 3 points by takeoff just inside / outside the arc and in the corners; dunk 2; goaltending awards the basket; Jackpot + 2; Gold Ball doubles; shot clock expiry is a turnover; a made basket gives the other team the inbound; the shot clock resets on rim contact; a release before the buzzer counts, after doesn't; overtime on a tie; SUDDEN BLAM after two; tip-off winner gets the ball; the alternating arrow for Q2–Q4 |
| `mechanics` | turbo drain and refill; speed by ZOOM; steal rates by angle within expected bands over 1,000 seeded tries; shoves knock down and fumble; a spin move breaks steals and ankles; blocks succeed when timed and fail when late; layup vs dunk choice; dunk choice by distance and SLAM; alley-oop from pass to slam; putback; posterized; Supernova on after 3 straight, off after an opposing basket, 4 more baskets or 40 s; shatter → sponsor break → inbound; juice falls and subs apply; each power-up's effect and expiry; wind bends a shot but keeps its decided outcome; oil slicks slide and slip; lava bombs knock down; vents launch; Overclock at Q4; reboot after two knockdowns |
| `ai` | 20 seeded CPU-vs-CPU games per court (20-s quarters): no errors; every team scores; scores in a sane band; ≤ 2 shot clock violations a game; no player still for more than 6 s of live play; across the batch the CPU dunks, shoots threes, steals, shoves, blocks, throws oops and uses power-ups; BLAM beats Rookie in ≥ 16 of 20 |
| `flow` | boot → title; 10 s idle on the title, the main menu and the join screen → attract; a key, a pad button, a mouse click and a stick push each leave it in one step, back to the screen it interrupted with its choices intact; every main-menu entry reaches a working screen by keyboard, by pad and by mouse; Exhibition with 1, 2, 3 and 4 players (addPlayer) gives each the right player and side; pause shows Dev Mode, How to Play and (in a match) Restart; results' buttons work; Hall of Blam initials entry |
| `tour` | **the scripted playthrough of the whole game**: a new Tour with a bot human, through the prologue, all three stops and the final, every beat seen in order, the reveal, the Overclock, the ending, credits, unlocks granted, Hall of Blam entry; it rematches a lost stop (exercising the loss path); CONTINUE TOUR after reloading the context mid-tour resumes at the right stop |
| `camp` | every lesson completes with scripted input and saves its completion; skipping works; its prompts name the right keys or buttons per device |
| `attract` | three full loops of every segment without errors; each segment's showcase events happen (event log); any input leaves within a step; touch-only: the loop continues and a tap shows the notice |
| `dev` | the pause menu's Dev Mode opens the panel; each slider changes and clamps its value and the game reacts (e.g. `runSpeed` × 1.5 → 50% more distance in a second); RESET ALL restores every default; each cheat and match action works; every SCENES jump lands in its scene; overlays draw without errors (in the browser suite) |
| `ui` | glyph icons for every action × keyboard, mouse, PlayStation and Xbox; prompts follow `lastDevice` per player; Button symbols changes every player's glyphs (and a later joiner's); settings defaults; touch-only detection on and off (stubbed `matchMedia` and `navigator`) and its switch-back on a key or gamepad |
| `audio` | every song's tokens parse (no engine warnings); every sound name used exists; the voice's syllable plan for sample lines (count, timing, the "!" and "?" contours); no audio calls fail headless |
| `net` | with `tests/fakehub.mjs` (2–4 game contexts sharing a simulated network with latency and loss, an `AIHub` stub per copy): clients' inputs move their players on the host; snapshots apply and the final scores agree; each event plays once; a leaver's player turns CPU; time-up → `finish` within the grace with valid standings; host leaving → clients show the void; server mode runs the world with no local player; every copy stays under 20 messages a second and unreliable messages under 1,200 bytes; the card answers Ready on Enter and More time on △ |
| `determinism` | the same seed and commands give the same hash twice (the proof) |
| `bundle` | the root HTML exists with the exact name; the client is the first script in `<head>`, byte-identical to `vendor/aihub-session.js`; the hub tags are there; no external URLs are loaded; its inline scripts run headless and reach the title |
| `browser` (Playwright, `file://`) | `handoff/tools/check.mjs` on the bundle passes (no errors, the screen filled, look notes read and acted on); every deep link renders without errors; the audio smoke test (after a synthetic key press the AudioContext runs, a voice line and a song play without errors); the screenshot set below is written |
| `hub` (Playwright + a 127.0.0.1 port-0 server) | the four harness scenarios of §15.4 pass; the server is checked to serve our page first and is stopped by its PID |

### 19.3 Screenshots (for what scripts can't judge)

Written to `check-output/` by the browser suite at 1920×1080 (and 1280×720): the title; the main menu; join with 4
players; team select; the matchup card; each court in play (5); a dunk at its apex with the dunk cam; a shatter; the
Supernova trail; the hoop with the ball in front of, inside and behind the net; the halftime report; results; the tour
map; a story beat with portraits; the dev panel on each tab; the pause menu with Dev Mode; How to Play (pad and keyboard);
About pages; the hub card; the touch-only title at 390×844@3. Look at every one: TV readability, the look target
(§2), nothing clipped by the corner buttons. Filmstrips (`handoff/tools/filmstrip.mjs --seed 1`) for every dunk, the
shove and knockdown, the block, the jump shot and the celebrations.

---

## 20. Definition of done (TASK.md, line by line)

- [ ] The title is BASKETBLAM, from the RNG pick; the deliverable and the dev folder have TASK.md's exact names.
- [ ] One self-contained HTML in the root; it runs from `file://` and inside the hub; no runtime network requests.
- [ ] Built on the my-3D2dge handoff; engine changes marked and listed; the engine's native look and rig animation are
      the base, with our new assets (courts, shapes, hoops, crowd, icons) and animations (§7).
- [ ] All music, effects and voices made in code; voices are gibberish with captions.
- [ ] AI Hub: tags, client first in `<head>`, own card, shared world, every harness scenario passing; the game unchanged
      on its own.
- [ ] Every system and mechanic in §6–§9 works; all content in §10 is in; every screen in §11 exists and works by pad,
      keyboard and mouse; prompts follow the last device with PlayStation glyphs and an Xbox option.
- [ ] Dev mode from the pause menu, with live sliders and reset to defaults, and the tools in §14.
- [ ] Attract mode after 10 s idle on the title and menus; any input leaves; it shows every feature.
- [ ] Touch-only devices: no touch controls, "Controller or keyboard required", the settings button, attract running.
- [ ] Narrative and announcer writing in the over-the-top arcade broadcast style (§10.6–10.7).
- [ ] No TODOs, placeholders, stubbed features or dead menu entries (grep the source for TODO, FIXME, XXX, "placeholder").
- [ ] `node tests/run.mjs` passes, including the scripted playthrough of the whole Tour; screenshots reviewed.
- [ ] The About/Credits screen and the final chat reply carry Source Information, Testing Feedback, Engine Feedback and
      Prompt Feedback; `exit-interview.json` is beside the HTML, in TASK.md's shape, and parses.
- [ ] Only processes you started were stopped, by PID; temporary folders removed.

---

## Appendix A. Tuning defaults (`01-tuning.js`; every one a live dev slider)

| Group | Key | Default | Min–max | Notes |
|---|---|---|---|---|
| Movement | `runSpeed` | 108 | 60–160 | u/s before ZOOM |
| | `accel` | 900 | 300–2000 | u/s² |
| | `turboMult` | 1.5 | 1.0–2.2 | |
| | `turboDrain` | 0.30 | 0.05–0.8 | per second held and moving |
| | `turboRefill` | 0.20 | 0.05–0.8 | per second |
| | `turboRefillDelay` | 0.35 | 0–1.5 | s |
| | `playerGravity` | 900 | 500–1500 | |
| | `jumpShotVz` | 250 | 150–400 | before SWAT |
| Shooting | `shotSkill` | 1.0 | 0.4–1.6 | × every make chance |
| | `threeSkill` | 1.0 | 0.4–1.6 | × three-point chance |
| | `perfectWindow` | 0.10 | 0.03–0.30 | s, full width |
| | `perfectBonus` | 0.15 | 0–0.4 | |
| | `badReleasePenalty` | 0.30 | 0–0.6 | |
| | `contestPenalty` | 0.40 | 0–0.8 | |
| | `shotArc` | 1.0 | 0.6–1.6 | × apex height |
| Dunks & blocks | `dunkRange` | 150 | 60–300 | from the rim, before SLAM |
| | `dunkGravity` | 520 | 300–900 | |
| | `dunkApex` | 1.0 | 0.5–2.0 | |
| | `dunkHang` | 1.0 | 0.5–2.0 | × flight time |
| | `dunkSlowMo` | 0.45 | 0.1–1.0 | time scale at the apex (1 = off) |
| | `blockReach` | 14 | 6–30 | before SWAT |
| | `blockChance` | 1.0 | 0–2 | |
| | `shatterChance` | 1.0 | 0–5 | |
| Defense | `stealChance` | 0.30 | 0–0.9 | |
| | `stealReach` | 18 | 8–36 | |
| | `stealCooldown` | 0.6 | 0.1–2 | s |
| | `shoveForce` | 220 | 60–500 | |
| | `shoveCost` | 0.25 | 0–0.8 | turbo |
| | `shoveCooldown` | 1.0 | 0.2–3 | s |
| | `shoveFumble` | 0.6 | 0–1 | |
| | `knockdownTime` | 0.8 | 0.2–2 | s |
| | `spinCost` | 0.2 | 0–0.6 | turbo |
| | `spinCooldown` | 1.5 | 0.3–4 | s |
| Supernova | `novaBaskets` | 3 | 2–6 | to ignite |
| | `novaMaxBaskets` | 4 | 1–10 | |
| | `novaTime` | 40 | 10–120 | s of game clock |
| | `novaShotBonus` | 0.25 | 0–0.6 | |
| CPU | `cpuSkill` | 0 | −0.5–0.5 | offset on decision quality |
| | `cpuReaction` | 1.0 | 0.25–3 | × reaction delays |
| | `cpuAggression` | 1.0 | 0–2 | × steal and shove rates |
| | `comeback` | 0.35 | 0–1 | |
| Match | `quarterLength` | from the mode | 20–300 | s; the running match's (Exhibition 120, Tour 90, hub halves 90) |
| | `shotClock` | 20 | 8–30 | s |
| | `gameSpeed` | 1.0 | 0.5–1.5 | `game.timeScale` outside effects |
| | `fatigue` | 1.0 | 0–3 | × juice loss |
| Physics | `ballGravity` | 760 | 400–1200 | |
| | `ballBounce` | 0.62 | 0.3–0.9 | |
| | `rimBounce` | 0.45 | 0.2–0.8 | |
| | `boardBounce` | 0.55 | 0.2–0.9 | |
| Courts | `powerupInterval` | 22 | 6–60 | s |
| | `hazardInterval` | 1.0 | 0.25–4 | × twist timers |
| | `windStrength` | 140 | 0–300 | u/s² at full gust |
| | `jackpotBonus` | 2 | 0–5 | points |

## Appendix B. Data shapes

```js
def('team', 'hightops', { name: 'NEON HEIGHTS HIGHTOPS', short: 'HIGHTOPS', colors: { jersey: '#ff3ca6', trim: '#2de2ff',
  shorts: '#1a1420', sneaker: '#f4f4f4', sock: '#2de2ff' }, logo: LOGO_SNEAKER, court: 'skybox', locked: false,
  players: ['volt', 'bigrumble', 'pixel'], captainLines: { /* §10.6 replies by opponent */ } });
def('player', 'volt', { name: 'VOLT', team: 'hightops', number: 7, role: 'high-flyer',
  ratings: { zoom: 9, splash: 5, deep: 4, slam: 9, dime: 6, swipe: 6, swat: 4, bump: 3 },
  rig: { build: 'heroic', size: 1.65, hair: 'ponytail', hat: { style: 'band', color: '#ff3ca6' }, skin: '#8a5a3c', hairColor: '#3ab0ff' },
  voice: 'volt', taunt: 'raiseRoof', celebrations: ['raiseRoof', 'airplane', 'pointSky'], barks: ['Too slow!', 'Catch me!'] });
def('court', 'skybox', { name: 'THE SKYBOX', floor: paintAsphalt, lines: { main: '#2de2ff', paint: '#ff3ca6' },
  logo: LOGO_SNEAKER, backdrop: { sky: [...], stars: 60, moon: {...}, layers: [...] }, silhouettes: drawSkyline,
  props: [['fence-chain', 200, -40, { params: { len: 400 } }], ['streetlamp', -48, -24]], crowd: ['#ff3ca6', '#2de2ff', '#1a1a1a', '#ffd23a'],
  ambient: .45, lights: skyboxLights, weather: null, dribble: 'dribble_asphalt', music: 'skybox', twist: 'jackpot' });
def('dunk', 'windmill', { banner: 'WINDMILL!', slam: 7, dist: [50, 150], hands: 1, spin: 0, flip: 0, apexAbove: 40,
  keys: [[0, { R: [4, 2, 20] }], [.3, { R: [0, 7, 14] }], [.55, { R: [-4, 4, 36] }], [.8, { R: [3, 2, 46] }], [.9, { R: [8, 1, 30], slam: true }]],
  bonus: 100, lines: 'dunkPower' });
def('lines', 'steal', ['PICKPOCKET! CHECK YOUR WALLETS, FOLKS!', '{NAME} SNATCHED IT LIKE A SEAGULL AT A FRY STAND!' /* ... ≥ 10 */]);
def('beat', 'reveal', { stage: 'dome-court', music: 'story', cast: ['gigawatt', 'dunkatron', 'swatbot', '{CAPTAIN}'],
  lines: [['vinnie', 'THREE STOPS! THREE WINS! {TEAM} IS HEADED TO THE BLAM DOME!'], ['gigawatt', 'Congratulations...'] /* ... */],
  camera: [[0, 'wide'], [2, 'gigawatt'], [5, 'bots']] });
def('powerup', 'rocket', { name: 'ROCKET KICKS', icon: ICON_ROCKET, color: '#ff7a2a', seconds: 15, apply(p) {...}, remove(p) {...} });
def('attract', 'seg4', { court: 'caldera', home: 'magma', away: 'hightops', seconds: 35, score: [22, 19], quarter: 3,
  cheats: { infiniteTurbo: true, dunkRange: 220 }, script: [[6, 'twist', 'eruption'], [14, 'command', [0, 'vent']], [24, 'shatterNext']] });
```

A content lint (`content` suite) validates every entry at boot in dev builds and in tests, with messages that name the
entry and the field.

## Appendix C. A complete song in the engine's format (the `title` anthem)

```js
const TITLE_SONG = { bpm: 108, steps: 4, tracks: [   // steps: 4 a beat, so a bar is 16 tokens
  { name: 'bass', wave: 'square', vol: .22, notes:
    'E2 . E3 . . E2 G2 . A2 . . B2 . A2 G2 . | E2 . E3 . . E2 G2 . D3 . C3 . B2 . G2 A2 |' },
  { name: 'stabs', wave: 'saw', vol: .06, notes:
    '. . . . E4 . . . . . . . G4 - . . | . . . . E4 . . . . . . . A4 - B4 . |' },
  { name: 'drums', wave: 'drums', vol: .1, notes:
    'k . h . s . h k . k h . s . h h | k . h . s . h k . k h . s h o . |' },
  { name: 'hype', wave: 'pulse', vol: .07, on: false, notes:   // audio.layer('hype', 1, 1) after 8 bars
    'B4 - - . A4 G4 . E4 - . . . . . . . | D5 - - . B4 A4 . G4 - . A4 . B4 - - . |' }
] };
```

Every other song follows this form (§12.1's table gives each one's feel, tempo, key and layers); check that the engine
accepts each wave name and token (it warns on unknown ones) and listen to each in the browser once.

*End of plan.*

