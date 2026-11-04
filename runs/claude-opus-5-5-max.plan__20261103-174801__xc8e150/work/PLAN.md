# Densha de Halo!

*A playful riff on* **Densha de Go!** ("Go by train!"). Here it's "Hello by train!" (*harō*, ハロー, Japanese for "hello"), and the halo is the
ring-shaped **Halo Line**, the loop railway around Akari City. The title was picked with a real RNG
(`python3 -c "import secrets; print(secrets.randbelow(50)+1)"` → **27**) from 50 riffs brainstormed silently, as TASK.md asks.

- **Display title:** `Densha de Halo!` (title screen logo: `DENSHA DE HALO!`)
- **File-name tokens:** GameTitle = `DenshaDeHalo`, SOURCE = `DenshaDeGo`.
  - Dev folder: `DenshaDeHalo-DenshaDeGo-<model-tag>-<timestamp>/`
  - Deliverable: `DenshaDeHalo-DenshaDeGo-<model-tag>-<timestamp>.html` in the root folder (beside TASK.md), with `exit-interview.json` next to it.
  - Take `<model-tag>-<timestamp>` from **your** TASK.md. In the TASK.md this plan was written from, that's `claude-opus-5-5-max-20261103-174801`.
- **Plan file:** this file, `PLAN.md`. In the game's Source Information, "Plan" = `PLAN.md`.
- **Research behind this plan:**
  - Read in the engine handoff package (v0.85.2): `README.md`, `API.md`, `modules/road.js`, `kits/road.js`, the template game and its tests, the
    Shell, input glyphs, the chip-audio internals, the Dialog voice code, the Humanoid pose blend, `modules/mode7.js`'s rig billboards and
    `docs/ASSETS.md`.
  - Read the AI Hub `lib/hub` README, its three examples and the harness checks.
  - The source's mechanics come from general knowledge of *Densha de Go!*. No web research was done.

---

## 0. How to use this plan

1. Read TASK.md, then this plan once end to end. Section numbers (§) are used throughout.
2. Read these in the engine handoff package, in this order: `README.md`, then `API.md` (all of it), then `modules/road.js` (150 lines; the
   renderer you will fork), then `kits/road.js` (a whole pseudo-3D game: scenes, HUD, bot and proof), then `game/test.mjs` and `kits/test.mjs`
   (headless testing), then `docs/ASSETS.md` (shapes and `E.shapeSprite`). Look names up in `API-INDEX.md` with grep; don't read it end to end.
3. From the AI Hub, read `lib/hub/README.md` (all of it) and `lib/hub/examples/ghost.html`, which is your template.
4. **Fetching the sources** (put each in its own new, empty folder inside your dev folder, e.g. `_src/engine`, `_src/hub`):
   - Engine: `git clone --depth 1 https://github.com/michaelcrosato/my-3d2dge.git` (~150 MB). Copy `dist/handoff/` into your dev folder as
     `engine/` (see §3.2).
   - Hub: the full repo is over 1 GB. Clone only `lib/hub`:
     `git clone --depth 1 --filter=blob:none --sparse https://github.com/michaelcrosato/ai-hub.git && cd ai-hub && git sparse-checkout set lib/hub`.
5. **Machine notes from planning.** `/tmp` is a small shared tmpfs and was **100% full**, which made `git clone` there fail. Run npm, Playwright and
   Chromium with `TMPDIR=<dev folder>/.tmp`. Other agents share the ports and processes. Prefer `file://` and headless Node tests. When you need a
   server (the hub harness), run `python3 -m http.server 0 --bind 127.0.0.1`, read the port it prints, check the page is yours, and later stop it by
   **its own PID** (never pkill, killall or fuser -k).
6. TASK.md rules that apply throughout: no TODOs, placeholders or stubbed features. All audio is made in code. Voices are gibberish. Tests go behind one
   command that prints only failures plus a one-line count. Don't use subagents or workflows to review or judge.

Engine version at plan time: **my-3D2dge v0.85.2** (handoff package). Hub: **Session Protocol 1, client `session.js` 1.4.0**.

---

## 1. The game on one page

**Pitch.** You're the rookie driver on the Halo Line, a 20.6 km loop railway around Akari City. In one day of service, from the depot at dawn
to the last train at midnight, you drive five shifts round the ring. Chief Instructor **Tetsuo Hoshino** rides with you. He has driven this ring for
38 years and was never once late, and today is his last day. Every stop has to land on the mark, every arrival on the second, and every signal gets
pointed at and called out. Close the ring and earn your halo.

**Core loop (one sentence, put it at the top of the game code):** *Read the line ahead, notch power and brake to keep the timetable, and stop
each train exactly on the mark: on time, smoothly and by the book. Then do it again at the next station.*

**Kept from the source** (its world, mechanics and tone):
- the first-person cab view;
- a notched master controller;
- braking to a precise stop marker;
- a timetable kept to the second, with a time-based life (**Halo Time**, our version of the source's remaining-time system);
- block signals and ATS;
- horn boards;
- station departure melodies and polite announcements;
- times of day and weather;
- trains with different handling;
- terse arcade feedback ("GREAT!", "OVERRUN!").

**Our own additions:**
- the loop line and the halo theme (route map, life gauge, PERFECT HALO judgment, mascot);
- point-and-call (*shisa kanko*) as a timing layer;
- the craft of a smooth stop (ease the brake off just before you stop);
- passengers and a comfort rating;
- a side-view **Stop Cam** replay of every stop;
- the four-track **Parallel Run** race for 2–4 players;
- a short, warm story with recurring characters.

**Genre:** train driving simulation with arcade scoring. Its AI Hub genre is **Simulation**.
**Perspective:** the main view is the **first-person cab**, drawn in pseudo-3D. Supporting views:
- exterior chase, platform and trackside cameras (attract mode, the View button, the ending);
- a side-view Stop Cam inset after each stop;
- a top-down ring map for stage select.

**Modes:**
- **Career:** S0 tutorial, then five service stages S1–S5 with story; stages unlock in order.
- **Free Run:** any unlocked stage, with time of day, weather, train and difficulty to choose.
- **Duel:** local 2-player split screen on the Parallel Run.
- **AI Hub session:** 2–4 players online in ghost mode, on the Parallel Run.
- **Attract mode:** an AI demo after 10 s idle.
- **Driver's Log:** records and postcards.
- **How to Drive** (help), **Settings**, **About & Credits**.
- **Dev Mode:** opened from the pause menu.

**Length:** S0 takes about 3 min, S1–S4 about 4–6 min each, S5 about 7 min. A full career is about 30–35 min; a Parallel Run about 4 min.

**What the player can do:**
- move one lever through **EB, B8…B1, N, P1…P5** (the train type decides how many notches);
- snap the lever to N, or pull the emergency brake;
- sound the horn;
- press ATS Confirm;
- point and call;
- change camera and look around a little;
- pause, and open Dev Mode (outside sessions).

**What the player cannot do** (say so in S0 and in How to Drive):
- steer (the track does that);
- open or close doors (the conductor does);
- reverse (a big overrun is backed up for you, at a cost);
- move with the doors open;
- choose a route.

---

## 2. Controls (final mapping)

| Action (id) | DualSense (Xbox) | Keyboard | Mouse |
|---|---|---|---|
| Lever toward power (`power`) | **R2** (RT), D-pad ↑, left stick ↑ | **W**, ↑ | wheel up; drag the lever handle forward |
| Lever toward brake (`brake`) | **L2** (LT), D-pad ↓, left stick ↓ | **S**, ↓ | wheel down; drag the handle back |
| Neutral, snap to N (`neutral`) | **R1** (RB) | **N** | click "N" on the notch strip |
| Emergency brake (`eb`) | **L1** (LB) | **Backspace**, X | click the red EB button |
| Point and call (`call`) | **✕** (A) | **E** | **left click** the target in the view (or anywhere in the view while a call is open) |
| Horn, hold (`horn`) | **□** (X) | **Space** | hold the horn button on the dash |
| ATS confirm (`ats`) | **△** (Y) | **Q** | click the ATS button |
| Change view (`view`) | **○** (B) | **C** | click the camera icon |
| Look around (`look`) | right stick | — | right-drag (springs back when released) |
| Pause | Options (Menu) | Esc, P | the corner menu button |
| Menus | D-pad/stick, ✕ confirm, ○ back | arrows, Enter, Esc | hover moves the focus, click picks |

- Holding a lever button repeats: one notch, then a repeat every 0.18 s after 0.25 s (`input.repeat(a, .25, .18)`). Each mouse-wheel notch moves one
  notch, with an 80 ms debounce.
- The keyboard follows PC train-sim habits: Space is the horn, Q acknowledges (the vigilance-key habit), Backspace is the emergency brake, W/S
  move the throttle.
- The **Lever direction** setting ("Up = Power" by default, or "Up = Brake" as on Japanese one-handle cabs) flips only the D-pad, stick and W/S/↑/↓.
  R2/L2 and the mouse wheel stay power/brake.
- Every gameplay action can be rebound through the engine's Controls screen. Name the actions with
  `menu.controls: { power: 'Lever: power', brake: 'Lever: brake', ... }` and hide the engine's unused defaults (`attack: false`, and so on).
- The `call` binding `Mouse0` only counts inside the forward view. Over dashboard widgets, call `input.suppressCode('Mouse0')`, so a click on a cab
  button never also counts as a call.
- **Duel keyboard halves** (from the engine's `halfKeys`, with actions ordered `call, horn, ats, eb, neutral, view`):
  - P1: W/S lever, F call, G horn, H ATS, R EB, T neutral, Y view.
  - P2: ↑/↓ lever, `.` call, `/` horn, `,` ATS, L EB, `;` neutral, `'` view.
  - Show these on the Duel lobby screen.

---

## 3. Architecture

### 3.1 Stack and why

- **my-3D2dge v0.85.2, full engine** (`my-3d2dge.js` from the handoff package). It includes every module, the HTML Shell (pause, settings, controls),
  Menus, Dialog with portraits, Humanoid and Blob rigs, the chip synth, input with glyph labels and rumble, split screen, boot steps, store and
  saves, and the headless `game.advance` / `game.debug` testing.
  - Use the 2D engine only. The three.js 3D engine is not in the handoff package, it runs poorly headless, and its look isn't the engine's
    native pixel style.
- **New module `rail.js`**, our pseudo-3D railway renderer. It is a fork of `modules/road.js` (OutRun-style segments) extended for tracks, platforms,
  trains and rear-facing cameras (§4.1). This is the heart of the game's look.
- **AI Hub client `session.js` 1.4.0**, pasted unmodified as the first script in `<head>`, right after `<meta charset>`.
- **No other libraries and no CDN.** The single HTML inlines everything, so it runs offline from `file://`.
- **Tooling:** Node 18+; Playwright 1.63.0 (as pinned in the handoff `package.json`; reuse an installed Chromium if one is there); python3
  `http.server` for the hub harness only.
- **Resolution:** `res: 'ps1', expand: true` gives 320×240 as a minimum and about 427×240 on 16:9. Anchor all HUD to `r.W`/`r.H`.

### 3.2 Dev folder layout

```
DenshaDeHalo-DenshaDeGo-<model>-<ts>/
  engine/                  copy of dist/handoff (my-3d2dge.js patched per §3.8, tools/, docs/, package.json, kits/ for reference)
  engine/modules/rail.js   NEW: the rail renderer (§4.1), loaded after my-3d2dge.js
  vendor/aihub/            session.js (unmodified), harness.html, bridge.js, round.js (harness files are for tests only, never bundled)
  src/                     the game, in load order (each file one IIFE writing only into the DH namespace):
    00-core.js             DH namespace, E, the E.Game, constants, units, DH.rng, settings definitions, input map (§2)
    01-tuning.js           DH.TUNING defaults + difficulty tables (every dev slider reads/writes here, §4.21)
    05-glyphs.js           prompt badges (§4.15)
    10-art-*.js            drawables: art-train.js, art-cab.js, art-signals.js, art-station.js, art-town.js, art-landmarks.js, art-people.js, art-ui.js
    20-routes.js           route scripts: halo loop + depot (§5.1), zone scenery sets
    21-route-compiler.js   script → segments/objects/strips/things (§4.2)
    22-stages.js           stage definitions S0–S5 + PR (§5.3), story lines, postcards
    30-train.js            dynamics + lever (§4.3)
    31-signals.js          blocks, signals, ATS, other trains (§4.4)
    32-stations.js         approach, stop judgment, dwell/departure (§4.6)
    33-rules.js            speed limits, calls, horn, Halo Time, score, comfort (§4.5, 4.7, 4.9, 4.10)
    34-events.js           crossings, workers, obstruction, door rush, rival, oncoming, fog, glare, tips (§4.11)
    35-autopilot.js        AI driver (§4.19)
    40-sound.js            continuous soundscape + sfx + melodies + music (§4.16)
    41-babble.js           gibberish voices (§4.17)
    50-cab.js, 51-hud.js   cab overlay, HUD, stop gauge, stop cam (§4.14)
    52-story.js            briefings, radio chatter, subtitles, tips (§4.18)
    55-ui-*.js             title, menus, halo map, free run, briefing, results, game over, ending, log, help, about (§4.26)
    60-drive.js            the drive scene (§3.4)
    61-attract.js          attract mode + camera director (§4.20, §4.13)
    62-dev.js              dev mode + debug overlay (§4.21)
    63-hub.js              AI Hub session flow + card + ghosts (§4.23)
    64-duel.js             local split-screen duel (§4.24)
    99-start.js            boot steps, game.start, deep links (#gallery, #stage=S3, #attract, #dev ...)
  index.html               dev page: session.js first, then engine, rail.js, src/*.js (works from file://)
  test/run.mjs             THE one test command (§8)
  test/lib.mjs, test/*.test.mjs, test/browser.mjs, test/hub-harness.mjs
  tools/bundle.mjs         builds ../DenshaDeHalo-DenshaDeGo-<model>-<ts>.html (§9)
  tools/calibrate.mjs      runs the autopilot headless over every stage and prints par times (§4.8)
  ENGINE-CHANGES.md        every engine edit, one line of why each (feeds Engine Feedback)
  shots/                   screenshots for look review (§8.5)
```

**Namespace rule.** Every src file starts with `(() => { 'use strict'; const E = My3D2dge, DH = (window.DH = window.DH || {}); ... })();`.
The only globals are `My3D2dge`, `AIHub` and `DH`. `tools/bundle.mjs` concatenates the files in the same order as `index.html`.

### 3.3 Scenes and flow

```
boot (engine boot steps) ──► AIHub.active? ──yes──► hubCard ─► hubRun ─► hubEnd (stays; the hub removes the game)
                               │no
                               ▼
        ┌──────────────► title ◄──── any input ──── attract (10 s idle on title or any menu screen)
        │                 │
        │   ┌─────────────┼───────────────┬──────────────┬─────────────┬───────────┐
        │   ▼             ▼               ▼              ▼             ▼           ▼
        │ haloMap      freeRun         duelLobby      driversLog     help        about
        │ (career)     (setup)            │
        │   ▼             │               ▼
        │ briefing ───────┴──► drive ──► results ──► next briefing | haloMap      duel ─► duelResults
        │                       │  ▲         └─(S5)─► ending (credits) ─► title
        │                       │  └── pause (Shell): Resume · Retry stage · Retry from last station · Dev Mode · Settings · Controls · How to Drive · Quit
        │                       └──► gameOver ──► retry | continue from last station | haloMap
        └──────────────────────────────────────────────────────────────────────────────────────────────────────────────
```

- `drive`, `duel` and `hubRun` are the `pausable` gameplay scenes. Duel's pause menu has no Dev Mode; the hub's has only Resume, Settings and
  Controls (§4.23).
- Use `game.go(name, data, { fade: 'wipe' })` for scene changes. Use `'iris'` into the Stop Cam and the ending.
- Deep links for testing: `#gallery`, `#stage=S2&s=5400&clock=10:17:30`, `#attract`, `#halomap`, `#results=S1`, `#duel`, `#about`.

### 3.4 Per-step order in `drive` (fixed 1/120 s steps)

1. Input becomes lever and button commands (or the autopilot writes the same commands, §4.19).
2. Train dynamics (§4.3).
3. Other trains move; block occupancy updates; signal aspects update (§4.4).
4. ATS and speed checks (§4.4, §4.5).
5. Events, crossings and fog (§4.11).
6. Station logic: approach, stop, judgment, dwell, departure (§4.6).
7. Call and horn windows (§4.7).
8. Halo Time, score, comfort (§4.9, §4.10).
9. Story triggers and tips (§4.18), then sound parameters (§4.16).
10. Camera (§4.13), then HUD state (§4.14).
11. Network or duel sync (§4.23, §4.24).

**Draw order** (all inside `r.overlay`, screen pixels):
1. `rail.draw` (sky, then the world far to near);
2. weather overlays;
3. the cab;
4. the HUD;
5. call brackets and the glove;
6. subtitles and dialog;
7. toasts and judgments;
8. the Stop Cam inset;
9. the debug overlay.

`draw` only reads state; it never changes it.

### 3.5 Units and coordinates

- `s`: metres along a route from its origin. On the halo route, s = 0 is Akari Central's 6-car stop marker, and the loop wraps at 20,600 m.
- `x`: metres across; **+ is to the right** in the direction of travel. Our track is at x = 0. Trains keep left as in Japan, so the counter-clockwise
  track is at x = +3.8.
- `y`: metres up. A segment's track height is absolute.
- Speeds: m/s inside the code, km/h in the UI. Accelerations are in **km/h/s** in all tables (1 km/h/s = 0.2778 m/s²).
- A train's reference point is its **front**. Cars are 20 m long, so 6 cars = 120 m and 10 cars = 200 m. The cab camera sits 1.5 m behind the front,
  2.9 m above the rail.
- Clock: seconds since midnight (06:40:00 = 24000). Game time drives it (1 s = 1 s). It pauses with the game.
- Characters: **1 m ≈ 15 engine units** (a 26-unit hero ≈ 1.7 m). A rig drawn at k pixels per metre uses a View scaled by k/15 (§4.1).

### 3.6 Determinism and randomness

- All world building and cosmetic randomness uses `DH.rng(label)`:
  - in a hub session, `AIHub.rng(label)`;
  - otherwise `E.rng(hash(label + ':' + stageSeed))`.
- Never use `Math.random`, `Date.now` or `performance.now` in game logic.
- The engine's `rand` and particles use `Math.random`. That's fine for frame-to-frame cosmetics, but no game state may depend on it.
- The hub harness only checks that `AIHub.seeded` is true on every copy. We build every world from our own streams, so all copies match anyway.
- `DH.proof(stageId, seconds)` runs a scripted autopilot drive and returns an FNV hash of the state samples. The test runs it twice and expects
  the same hash.

### 3.7 `game.debug` handle (tests, tools/check.mjs, tools/replay.mjs)

`snapshot()` returns:
- `scene`, `stage`, `s`, `km`, `v` (km/h), `notch` ('B3'), `brakeEff`, `grace`, `score`, `clock` ('06:41:12');
- `nextStop` ({ id, dist }), `lastJudgment`, `signals` (the next 3: { id, dist, aspect }), `limit`;
- `events` (ids fired), `comfort`, `doors`, `pilot`, `ats` ({ ringing, confirmed }), `camera`;
- `attract` ({ active, vignette }), `hub` ({ active, phase, sent, progressCalls }), `players` (duel), `errors`.

Functions:
- `jump(stageId, { s, clock, v })`
- `auto(on, { skill, cheat })`
- `setTod(h)`, `setWeather(w)`
- `forceAspect(signalId, aspect)`, `trigger(eventId)`
- `finishStage(perfect)`, `setGrace(n)`

Also set `game.stateHash = () => [s, v, grace, score]`, which makes recorded sessions catch divergence (`?record=1`, `tools/replay.mjs`).

In the browser, also expose `window.__dh = { game, DH, snapshot: () => game.debug.snapshot() }` for the Playwright checks, as the kits do with
`window.__game`.

### 3.8 Engine changes (keep minimal; log each in `ENGINE-CHANGES.md`)

1. **`engine/modules/rail.js` (new)**: the rail renderer (§4.1). It is a fork of road.js, because road.js can't do multiple tracks, raised platforms,
   long side objects (trains, buildings), rear cameras or square-pixel projection on wide screens.
2. **Dialog voice hook**: let `talk.voice` be a function `(ch, index, text, talk)`, called for each revealed character, so Babble can speak
   syllables (§4.17). Today `voice` is only an sfx name, blipped every second letter (`Dialog.update`, around line 8956).
3. **Settings screen filter**:
   - `ui.show('settings', { groups: ['Dev'], title: 'Dev Mode · Balance' })` shows only those groups.
   - The standard Settings screen hides the `Dev` group (`Shell._settingsRows`).
   - This gives live, controller-navigable sliders for free (§4.21).
4. **Glyphs**:
   - Make the standard `glyphs` setting default to `'playstation'` instead of `'auto'`; TASK.md wants PlayStation glyphs unless the player picks Xbox.
   - Add the 5×7 font glyphs `✕ ○ □ △`, so any `input.label()` text on canvas renders. The font currently has `×` but not these.
5. **ChipAudio accessors**: `audio.bus('sfx' | 'music' | 'master')` and `audio.noiseBuffer()`. The continuous train sound and Babble then route
   through the player's volume, mute and duck settings.
6. **Humanoid poses**:
   - `'bow'`: torso pitched forward about 40°, hands at the thighs, head down.
   - `'point'`: right arm straight forward at shoulder height, index finger out.
   - `'flag'`: right arm raised; the game draws a small flag at `rig.hand()`.
   - Add them next to `cheer`/`wave` in `poseW` and the solver. Check with `tools/filmstrip.mjs`.
7. **Hub button rule**: while `AIHub.active` and Create (`Pad8`) is held, ignore Options (`Pad9`) as pause (hub README, Rules).

After patching, rerun the handoff's own `node game/test.mjs` and `node kits/test.mjs road` to check nothing else broke.

---

## 4. Systems

Each subsection ends with **Tests**. All tests run under `node test/run.mjs` (§8).

### 4.1 Rail renderer (`DH.Rail`, module `rail.js`): the riskiest piece, so build it first

**Model.** A route is a run of **5 m segments**. Each segment has:
- `i`, `s`;
- `curve`: the lateral bend added per segment, `= ±L²/R` m (+ bends right), eased over 20 m at each end;
- `y0`, `y1`;
- `zone`;
- `flags`: tunnel, bridge, crossing, viaduct, quad;
- `tracks`: `[{ id, x0, x1, electrified, kind }]`, with offsets at both segment ends so tracks can diverge;
- the lists of strips and things that touch it.

**Camera.** `{ s, x, h, dir: 1 | -1, fov: 75, horizon: .40, lookX, lookY, pitchPx, rollPx, shake }`.

**Projection.** Keep road.js's two passes (near→far to accumulate the bend and clip at crests, then far→near to paint), but use **square pixels**:

```
depth = 1 / tan(fov/2)
scale = depth / d                    // d = distance ahead of the camera (m), must be > 0.5
sx = cx + scale * (wx - camX) * hw   // hw = W/2
sy = cy - scale * (wy - camY) * hw   // NOTE: hw again. road.js uses hh here, which squashes the world on wide screens
cx = vp.x + W/2 + lookX ;  cy = vp.y + H*horizon + lookY + pitchPx
```
- `wx = segment bend + lateral offset`; `wy = segment height + object height`.
- Pixels per metre at a point: `k = scale * hw`.
- Use horizon 0.40 for the cab (the dash covers the bottom 30%) and 0.50 for full-screen exterior cameras.
- Draw distance is 360 segments (1.8 km). The fog default fades from 900 m.

**Rear view (`dir = -1`).** Walk the segments backward, negate the curve and every lateral offset, and swap the strip ends. This is the forward view
of the mirrored line, so the same painter works. The platform and trackside cameras use it (§4.13).

**Painting, per segment, far→near:**
1. **Ground band.**
   - The full-width ground row is the zone's ground colour, alternating two tones every 4 segments for a sense of speed.
   - On **bridges**, draw water instead: a band 8 m below the deck, with animated glints.
   - At **crossings**, draw an asphalt road band across all x, with white edge lines.
2. **Track beds.** For each track, a ballast quad 3.0 m wide. Side tracks and sidings are darker and rustier.
3. **Sleepers.** Only within 160 m of the camera. Split each segment into 8 slices and draw one dark quad per sleeper (0.24 m along s, 2.4 m
   across). Beyond 160 m the ballast tone stands in.
4. **Rails.**
   - Two quads at ±0.533 m from the track centre, 0.065 m wide, in steel grey.
   - Where the rail is 2 px or wider, add a 1-px bright top line.
   - When wet, the rails get brighter and pick up the sky colour.
5. **Strips** (below): sorted by lateral distance from the camera, farthest first.
6. **Things** (below): also sorted farthest lateral first.
7. **Train slices**: actors are drawn as strips (§4.4), plus their front-face thing.
8. **Catenary wires.**
   - For each electrified track, two 1-px lines between this segment's projected points: the contact wire at y +5.1 and the messenger at +5.9.
   - The wire zig-zags ±0.2 m, alternating per mast. The converging wires are a strong depth cue; keep them.

**Strips** are extrusions along the line: `{ s0, s1, x0, x1, y0, y1, faces: { side, top, under, front, back }, kind }`.
- Each face has a drawer `(g, quad, u0, u1, k, tint)`, where u is metres along s, so patterns repeat in world space (windows every 2.5 m, doors
  every 5 m, a tactile line).
- Which faces show:
  - the **side** nearer to camX (x1 if the strip lies left of the camera, x0 if right; none if it spans the camera);
  - **top** if the camera is above y1;
  - **under** if the camera is below y0 (canopies, overpasses, station roofs);
  - **front** or back where s0/s1 falls inside the slice being painted.
- Strips are used for:
  - platforms: y 0→1.1 m; top face with a white edge line and a yellow tactile strip 0.8 m in;
  - canopies (y 3.6→3.9), station buildings, stair housings;
  - sound walls, fences, retaining walls;
  - truss sides (X pattern);
  - tunnel walls and roof (road.js's tunnel, generalised; roof at 6.2 m; portal face; a wall lamp every 25 m);
  - overpasses: cross strips spanning all x, with an under face;
  - rows of houses and warehouses, viaduct parapets;
  - **trains** (§4.4).

**Things** are point objects: `{ s, x, y, w, h, draw(g, sx, sy, k, ctx) }`.
- `(sx, sy)` is the screen position of the base centre; `k` is pixels per metre.
- Every drawer picks a level of detail from k: below 0.4, a dot or nothing; below 3, a 2–3 tone silhouette; 3 and up, full detail with
  `E.tones` shading.
- `E.sprite` sprites and `E.shapeSprite` bakes are wrapped as things with metres-per-pixel.
- **Humanoids and Blobs** draw through a cached `E.View('rail', 'Rail', yaw, 8, q, 1)`, where `q = round16(k / 15)`. Copy `Mode7.view(k)` in
  `modules/mode7.js`, and turn the yaw so rigs face the camera's side.

**Tint pipeline.** Every colour goes through `tint(hex, depth01, emissive)`:
- mix toward the sky's horizon colour by the fog factor `1 - exp(-(d/fogDist)^2 * density)`;
- then apply the time-of-day grade (§4.12) unless the colour is emissive (signal lamps, lamps, lit windows, LED boards, headlight-lit ground);
- cache the results per frame.

**Night lights.**
- The headlight is an additive trapezoid (`px.blend(g, a, 'add', ...)`) over our track from 3 m to 120 m, plus a boost to rail and sleeper tones
  inside it.
- Lamps and signals get glow discs (`r.glowDisc` or `px.blend` discs).

**API.**
- `new DH.Rail(compiledRoute, { fov, draw, fog })`
- `rail.draw(r, cam, { actors, tod, weather, t })`
- `rail.project(s, x, y)` returns `[sx, sy, k]` (or null) for the last camera. Used for the HUD brackets, the call glove and mouse picks.
- `rail.pick(sx, sy)` returns the call target or thing under a screen point.
- `rail.visible(s, x, y)` checks that a point isn't hidden behind a crest or tunnel.

**`#gallery` deep link.** Thirteen fixed shots, each with a caption:
1. straight, day
2. curve plus hill
3. station approach
4. alongside a platform with a crowd
5. close to a signal
6. tunnel mouth
7. truss bridge
8. crossing with gates down
9. quad track with a train alongside
10. night with headlights
11. rain
12. platform rear camera with a train arriving
13. chase camera

**Tests:**
- Projection math:
  - A point on the centreline straight ahead lands at cx.
  - k halves when the distance doubles.
  - Square pixels: a 1 m × 1 m quad at 20 m measures the same width and height in pixels.
  - Rear view mirrors a point.
- Crest clipping: on a hill, a point beyond the crest returns `visible = false`.
- Strip faces: a platform left of the camera paints its right side face, not the left one.
- `project`, then `pick`, round-trips for a signal.
- The gallery renders all 13 shots with no errors. This is a browser test: a page with `new E.Game({ loop: false })`, drawing with
  `game.advance(0, { draw: true })`.
- **Screenshots** for the look review (§8.5).

### 4.2 Route data and compiler (`20-routes.js`, `21-route-compiler.js`)

Routes are **designer-editable scripts**: sorted arrays of `[s, command, params]`. This is how "the remainder of the game could later be built out
with normal designer tools".
- On loop routes s wraps modulo the length, so `[-230, 'station', ...]` (Akari Central's platform) lands at 20,370.
- Spans may cross the seam.

| Command | Params | Produces |
|---|---|---|
| `zone` | id | scenery set, ground colours, backdrop layers from s on |
| `tracks` | `[{ id, x }]` (optional `to` for a diverge over `len`) | track layout from s (e.g. the quad section) |
| `curve` | `{ len, r, dir: 'L'|'R' }` | segment curves |
| `grade` | `{ len, permille }` | heights, eased over 50 m at both ends |
| `limit` | `{ v, until }` (until optional = line speed change) | limit board at s, END board at until, call point |
| `signal` | `{ id, kind: 'start'|'block'|'home'|'shunt', track }` | signal thing, block boundary, ATS beacon at s−600, call point |
| `station` | `{ id, name, en, side, len, stop: { 6: s, 10: s }, roof: [a, b], melody, crowd, landmark, tracks }`; the command's s is the platform's start (its rear end) and `len` its length | platform strips, canopy, boards, props, crowd spawn, approach board at stop−400, a stop marker board for each key of `stop` |
| `tunnel` | `{ len }` | tunnel strips, portal, lamps, sound zone |
| `bridge` | `{ len, kind: 'truss'|'girder', water }` | deck, truss strips, water band, sound zone |
| `crossing` | `{ id, road, cars, peds, special }` | road band, gates, lamps, crossbuck, waiting traffic; `special` adds the obstruction emitter 350 m before |
| `horn` | `{}` | horn board, horn zone of 150 m |
| `workers` | `{ until, limit, lookout }` | slow-order boards (yellow 25 / end), crew things, lookout rig |
| `overpass` | `{ w, h, kind }` | cross strip |
| `viaduct` | `{ len, h }` | the track raised; ground drawn as rooftops far below |
| `landmark` | `{ id, x, side }` | one hand-drawn landmark thing |
| `scenery` | `{ thing, x, ... }` | a manual placement |

**Auto-generated:**
- catenary masts every 50 m on electrified pairs (lattice in the city, concrete poles in the suburbs);
- km posts every 100 m on the left ("3.4");
- ATS beacons (yellow boxes between the rails);
- call points for every signal, limit board, station approach board, pass board and horn board;
- utility poles with sagging wires along suburban roads; sound walls in the city;
- zone scenery from a **seeded RNG per 50 m cell per side**. Cells occupied by a station, bridge, tunnel, crossing or landmark are skipped.

**Validation** (run at boot in dev, and as a test):
- stations are in order;
- each stop target for n cars lies within `[platform start + 20·n, platform end]`, so the whole train fits;
- home signals stand before their platform's start;
- every limit ends;
- no signal stands in a portal segment;
- block boundaries are strictly increasing;
- each stage's stops exist on its route.

**Tests:** compile both routes; the segment count = length / 5; `curve` at mid-curve has the right sign; the height after a 25‰ × 800 m grade is
+20 m (±0.5); a 600 m bridge sets the flag on 120 segments; validation passes; a corrupted script (a stop outside its platform) fails validation.

### 4.3 Train dynamics and the lever (`30-train.js`)

**Lever.**
- One axis with positions `EB, B8…B1, N, P1…P5`; the trains in §5.2 decide how many notches.
- `power` moves the lever one position toward P and `brake` one toward B. `neutral` snaps it to N. `eb` jumps to EB.
- Leaving EB needs speed = 0 (`EB RELEASE` prompt), then one `power` press per position.
- Each change: a mechanical clack sfx, the handle animation, and a glove follow (§4.14).

**Model, per step (dt = 1/120):**
```
tgtP = notch>0 && doorsClosed && !EB ? aP[notch] * min(1, vk[notch] / max(v,1)) * clamp((vmax - v)/5, 0, 1) : 0
tgtB = EB ? aEB : notch<0 ? aB[-notch] : 0
P += (tgtP - P) * (1 - exp(-dt / tauP))
B += (tgtB - B) * (1 - exp(-dt / (tgtB > B ? tauBapply : tauBrelease)))
res = v > 0 ? r0 + r1*v + r2*v*v : 0                    // km/h/s, v in km/h
grd = -0.0353 * grade_permille(s)                        // km/h/s
adhesion = dry ? 6.0 : TUNING.adhesionRain (2.6)          // km/h/s
if (P > adhesion) slip: P *= .4 for .8 s (SLIP lamp, whine, comfort −2)
if (B > adhesion) slide: B = adhesion * .85 (WSP lamp, judder sound)
a = P - B * sign(v) - res + grd                          // brakes and resistance never push backward
v = v + a*dt (km/h); if v would cross 0 with the brakes on → v = 0 (held by the brakes)
rollback: if v == 0 and B < .2 and grd < 0 → may roll backward (ROLLBACK warning; >1 m costs −2 s)
s += v / 3.6 * dt
jerk = (a - aPrev) / dt (smoothed), used by comfort and the smooth-stop judgment
```

**Default numbers (Halo 8000; every number below is a dev slider or scaled by one):**

| | P1 | P2 | P3 | P4 | P5 |
|---|---|---|---|---|---|
| a0 (km/h/s) | 0.8 | 1.4 | 2.0 | 2.6 | 3.2 |
| vk (km/h) | 15 | 25 | 35 | 40 | 45 |

- Brake: Bn = 0.5·n km/h/s (B8 = 4.0). EB 5.0 with τ = 0.3 s.
- τ apply 0.7 s, τ release 0.5 s, τP 0.3 s. vmax 110 km/h.
- Resistance: r0 = 0.03, r1 = 0.0005, r2 = 0.000012.

**Check values** (these are tests; allow the stated ranges):
- 0→80 km/h on P5, level track: 29–34 s.
- B4 from 80 km/h to a stop: 37–41 s and 425–465 m.
- EB from 80 km/h: 175–195 m.
- Coasting at 80 km/h on level track loses 7–10 km/h per minute.
- (A quick simulation of this model gave 30.4 s, 39.2 s / 439 m, 181 m and 8.2 km/h, and doubling `brakeScale` cut the B4 distance to 232 m.)
- On 25‰ up with P5 at 30 km/h, the train still accelerates. On 25‰ down at N, it gains speed.

**Tests:** the check values above; the lever passes through every position, clamps at the ends, can't leave EB while moving, and gives no traction with
the doors open; rain plus P5 from a stand slips (SLIP flag set); dry track never slips; determinism (the same inputs give the same s after 60 s).

### 4.4 Signals, blocks, other trains, ATS (`31-signals.js`)

**Blocks.** Each `signal` starts a block that runs to the next signal on that track. A block is occupied while any part of any train actor is in it.

**Aspects** (Japanese 4-lamp head, top to bottom Y-G-R-Y). The aspect follows from the clear blocks ahead:
- 0 clear → **R**;
- 1 → **Y**;
- 2 → **YG**;
- 3 or more → **G**.

Route data can force **YY** (restricted), used at the terminal entry in S5.

**Aspect speeds:** G = line speed, YG 65, Y 45, YY 25, R = stop before the signal.

**Starting signals** stay R until the dwell sequence says "ready" (§4.6), and then show the block aspect.

**Sighting.** A signal's aspect shows on the HUD and becomes callable only once it is *sighted*:
- within 600 m, visible (`rail.visible`) and not in fog;
- in fog, within 180 m.

Lamps draw at least 1 px with a glow, so far signals read as points of light.

**Train actors** (`DH.TrainActor`):
- Fields: `{ id, track, cars, livery, s, v, dir, lights, script }`.
- The script is a list of legs: `{ vmax, accel, decel, until: s|clock, stopAt, dwell, waitAspect }`.
- Kinds: the preceding freight (S2), the rival express (S4), oncoming locals, parked trains, players' ghosts (§4.23) and the duel opponent.
- Drawing is all strips:
  - body side y 1.0→3.9 m, with windows, doors and a livery stripe pattern, repeated per car (20 m) with gaps;
  - roof, with a pantograph thing on 2 of the cars;
  - skirt and bogies, as dark boxes;
  - the front-face thing: headlights, tail lights, destination LED "HALO LINE · AKARI CENTRAL", windows, driver silhouette, coupler.
- Oncoming trains face us (headlights). A preceding train shows its tail lights.

**ATS (simplified ATS-S plus a speed check):**
- Passing a signal's beacon (s−600) while that signal shows R starts the ATS bell (a repeating ding), a red **ATS** lamp and the
  `[△] ATS CONFIRM` prompt.
- If `ats` isn't pressed within **5.0 s**, the ATS fires EB (−10 s, −500 pts).
- Confirming starts a soft continuous chime, which stops when the speed is under 15 km/h or the signal clears.
- **Passing a red** (front past the signal while R) is a SPAD: forced EB, −20 s, −1000 pts, banner "SIGNAL PASSED AT DANGER", and a strict
  Hoshino line.
- Speed check: passing a limit board more than 10 km/h over the limit fires ATS EB (on top of the §4.5 penalty).

**Tests:**
- The aspect table, with an actor placed in blocks 0, 1, 2 and 3 ahead.
- A starting signal stays R until ready.
- ATS: passing the beacon at R rings; no confirm within 5 s fires EB; confirming stops the EB.
- SPAD is detected exactly when the front crosses s_signal.
- The S2 freight script reproduces R at signal M6000 when the player follows par (test through the autopilot).

### 4.5 Speed limits (`33-rules.js`)

- The limit in force = min(line speed, every limit board in force over **the whole train length** (the front sets it; it clears when the rear
  passes the END board), the aspect speed of the last passed signal, the slow-order limit).
- **Violation:** more than limit + 3 km/h: "LIMIT!" banner, −2 s, then −1 s per further 5 km/h of the peak excess, and −300 pts. It counts once
  per limit section, re-arming when the speed falls under the limit. The tolerance is a slider.
- The HUD shows the limit in force plus the next limit and its distance (§4.14).

**Tests:** a 70 board; the front passes at 72 (no penalty), then at 76 (one penalty); staying at 80 for 10 s gives no second penalty; the limit clears
only after the rear passes the END board.

### 4.6 Stations: approach, stop, judgment, dwell, departure (`32-stations.js`)

**Approach:**
- At 600 m the announcer starts the PA (§4.17) and the **Stop Gauge** appears (§4.14).
- At 400 m the station approach board ("STOP" or "PASS") is a call point.
- Then the home signal.

**Stop targets.** Each platform has a stop marker per train length ("6", "10"). The stage's train length picks which one counts; the HUD says
"STOP AT 10".

**Stopping.** When v reaches 0 at a stopping station within 50 m of the target, `err = s_front - target` (+ is past the mark):

| err | label | Halo Time | points | then |
|---|---|---|---|---|
| ≤ 0.10 m | **PERFECT HALO!** | +5 s | 1000 | doors open |
| ≤ 0.30 m | **GREAT!** | +3 s | 700 | doors open |
| ≤ 0.70 m | **GOOD** | +1 s | 400 | doors open |
| ≤ 1.00 m | **OK** | 0 | 200 | doors open |
| short 1–5 m | (6 s to creep up and re-stop) → **SHORT** | −1 s per m | 0 | judged where it finally stands; each re-stop −1 s |
| short > 5 m | "MOVE UP" (doors stay shut) | — | — | must creep up |
| over 1–5 m | **OVERRUN** | −2 s per m | 0 | doors open |
| over > 5 m | **OVER THE MARK** | −10 s | −300 | auto back-up at 5 km/h to the mark, then OK |

- The windows scale with difficulty (Easy ×1.5, Expert ×0.7) and the dev slider.
- **Arrival time** = the clock at the stop, against the timetable:
  - within ±2 s: **ON TIME!** (+3 s, 500 pts);
  - late beyond the window: **LATE +n** (−1 s for each second past the window; the multiplier is a slider);
  - early beyond the window: **EARLY** (no bonus, 100 pts).
- **Smooth stop:** if the deceleration at the moment of stopping is ≤ 1.0 km/h/s and EB wasn't used in the last 100 m: **SMOOTH!** (+2 s, 300 pts).
  Teach it in S0 ("ease to B1 just before you stop").
- Passing a stopping station without stopping (the front more than 50 m past the target while moving): −10 s, "MISSED STOP", and the stage
  continues to the next stop. If it was the last stop, the stage ends there and goes to results.
- Stopping at a **pass** station within 50 m: "WRONG STOP" (−5 s); the next `power` continues.

**Dwell and departure** (every beat has a sound; timings for Normal):
1. t+1.0: doors open (chime "pin-pon" ×2; side lamp L/R on the dash). Passengers alight and board (§4.10).
2. The departure melody (the station's own, §5.8) starts at `max(dep − 9 s, t + 6 s)` and lasts 6–8 s.
3. Then the "doors closing" announcement (Mika, gibberish) and the door chime; the doors close (thunk).
4. +1.0 s: the conductor's buzzer (two short buzzes). +1.5 s: the **pilot lamp** lights (all doors closed).
5. The starting signal clears at `max(dep − 3 s, pilot lamp)` if the block allows. A **departure call** opens: "Shuppatsu, shinko!" (§4.7).
6. Power is accepted once the pilot lamp is lit. Pressing power earlier gives a short "DOORS" buzz and no penalty.
- If the train arrived late, the dwell shrinks to at least 12 s, so the train can make time back.
- Events can add time: the **door rush** in S4 re-opens the doors for 8 s.

**Stop Cam** (setting, on by default):
- After each judgment, an inset slides in (or full screen on Easy) for 2.5 s; any button skips it.
- It is a **2D side elevation**: the platform edge, the stop marker post with its number, the train's front car in profile easing to its final
  position, a dimension line ("+0.12 m"), and the door queue marks lining up with the doors.
- Haro-kun pops up on PERFECT.

**Tests:**
- The judgment table at err = 0.05, 0.25, 0.6, 0.95, −2, +3 and +7 (back-up then OK).
- Re-stop counting.
- ON TIME, LATE and EARLY at clock offsets −3, 0, +5.
- SMOOTH when B1 is applied at < 3 km/h; no SMOOTH when B8 is held to the stop.
- Dwell order: doors, melody, close, buzzer, pilot, signal, call.
- Power before the pilot lamp gives no movement.
- A missed stop and a wrong stop each apply their penalty.

### 4.7 Point and call (*shisa kanko*) and the horn (`33-rules.js`)

**Call points:** every signal (once sighted), limit board, station approach board, pass board, crossing (optional, no penalty) and the departure.

**Window.**
- For things on the line, the window opens 180 m ahead and closes 30 m ahead.
- The **GREAT** sweet spot is 120–60 m ahead.
- The departure call's window runs from "signal clear" until 5 s after the doors close; it counts as GREAT if made before the first power notch.
- On screen: a thin white **bracket** around the target (via `rail.project`), with a prompt `[✕] CALL` (glyph per device, §4.15).

**Pressing `call`:**
- The **white-gloved hand** rises from the bottom of the screen and points at the target's screen position (raise 0.15 s, hold 0.4 s, back 0.25 s).
- The driver's voice says the phrase in gibberish (§4.17), with a subtitle in romaji and English.
- Score: GREAT +0.5 s and 100 pts; OK 50 pts. Missing a call costs nothing in Halo Time; Hoshino remarks once per stage.
- **Auto calls** (assist setting) makes the calls for you at the sweet spot, with no score.
- With the mouse, clicking the bracketed thing (`rail.pick`) or anywhere in the view while one call is open does the same.

**Phrases** (aspect-aware; subtitles shown):

| Target | Romaji | English subtitle |
|---|---|---|
| starting signal | Shuppatsu, shinko! | Departure. Proceed! |
| block G | Heisoku, shinko! | Block. Proceed! |
| home G | Jonai, shinko! | Home signal. Proceed! |
| YG | Gensoku! | Reduce speed! |
| Y | Chui! | Caution! |
| YY | Keikai! | Restricted! |
| R | Teishi! | Stop! |
| limit board | Seigen, (number)! | Limit (number)! |
| stop approach | Teisha! | Stopping! |
| pass board | Tsuka! | Passing! |
| crossing | Fumikiri, yoshi! | Crossing, clear! |

**Horn.**
- The horn board starts a 150 m **horn zone**. Holding `horn` for at least 0.5 s inside it gives "HORN +1" (+1 s, 100 pts).
- Leaving the zone without sounding it costs −1 s (Normal/Expert) or nothing (Easy).
- The horn always plays when held (§4.16). Track workers (§4.11) wave when they hear it.

**Tests:** a window opens and closes at the right distances; GREAT vs OK by distance; a call works only while its target is sighted; the departure call
counts as GREAT before power; the auto-calls setting gives no points; a horn hold of 0.6 s in the zone scores; 0.3 s doesn't; a missed zone costs −1 s
on Normal and 0 on Easy.

### 4.8 Timetable and clock (`32-stations.js`)

- Each stage has `startClock` and `stops: [{ id, arr, dep }]`, plus `passes: [{ id, at }]` for display. Show times as `HH:MM:SS`.
- The **timetable card** on the dash lists each stop's ARR and DEP, highlights the next stop, and marks passes as "PASS".
- The **pocket watch** shows the clock, with a ticking second hand.
- **Calibration** (`node tools/calibrate.mjs`): run the autopilot in **min-time mode** (§4.19, "par") over every stage with default tuning and
  print the arrival clocks. Set each timetable so par arrives **6–12 s early** on Normal: a good human can then be on time, and the
  timetable-aware autopilot has room to arrive on the second. The S4 door rush and the S2 freight wait are part of the par run.
- The §5.3 numbers are starting values; replace them with calibrated ones and commit them as data.

**Tests:** the clock advances 1:1 with game time and stops while paused; calibrated par arrives early by 6–12 s at every stop (a guard against tuning
drift); the timetable card highlights the right row.

### 4.9 Halo Time, score, ranks (`33-rules.js`)

**Halo Time** is the life: a pool of seconds.

| Difficulty | Start | Stop windows | Penalties |
|---|---|---|---|
| Easy | 40 s | ×1.5 | half |
| Normal | 25 s | ×1.0 | as listed |
| Expert | 15 s | ×0.7 | ×1.5 |

- The cap is 99 s.
- Changes apply at events (arrival, stop, penalty, bonus), each with a floating "+3 s" or "−2 s" by the ring.
- At ≤ 10 s the ring pulses red and a clock tick plays.
- At **0**, game over at once: the screen desaturates, the halo ring cracks (particles), and Hoshino says "That's enough. Hand me the key."
- S0 shows the ring but freezes it.

**Bonuses and penalties not already covered:**
- obstruction avoided (stopped before the crossing): **HAZARD AVOIDED** +5 s, 800 pts;
- EB with no hazard: −3 s, −200 pts;
- rollback over 1 m: −2 s.

**Score:** the points in the tables above, plus remaining Halo Time × 50 and comfort × 5 at the end of the stage.

**Checkpoints.**
- At every departure (the moment the pilot lamp lights), take a snapshot: s, clock, Halo Time, score, comfort, the events fired, the other train
  actors' state, and the dwell phase.
- The pause menu's **Retry from last station** restores it as it was.
- After a game over, **Continue from last station** restores it with Halo Time set back to the stage's start value and the score halved.
- **Retry stage** starts the stage over.

**Ranks:** let **Max** = the sum of every scoring chance in the stage (each stop PERFECT, each arrival on time, each SMOOTH, every call GREAT, every
horn, the hazard bonus, Halo Time end value = start + bonuses, comfort 100).
- **S** ≥ 90% of Max;
- **A** ≥ 75%;
- **B** ≥ 55%;
- **C** ≥ 35%;
- otherwise **D**.

The ranks show as a red *hanko* stamp on the results screen.

**Tests:** game over fires at 0; Halo Time is capped at 99; Max computes for S1 with no NaN; a perfect autopilot run ranks S; a run with three
overruns ranks C or lower; difficulty multipliers apply.

### 4.10 Passengers, crowds and comfort (`33-rules.js`, `art-people.js`)

- **Door queues.** For the stage's train length, compute the door positions back from the stop target (4 doors per 20 m car, at 2.6 / 7.4 /
  12.6 / 17.4 m from the car front).
- Each door mark gets 0–3 queued Humanoids (the station's `crowd` level times the stage's time-of-day factor), from a seeded stream.
- Mix of looks: commuters (suit and coat, briefcase drawn at `rig.hand()`), students (uniforms), elders, kids, festival visitors (yukata colours,
  S3), and umbrellas in rain.
- **Animation:**
  - idle breathing (built in);
  - heads turn toward the arriving train (facing);
  - kids `pose: 'wave'` at the cab;
  - when the doors open, alighting passengers spawn at the doors and walk to the stairs, and the queued ones walk in and vanish;
  - at departure, the platform staff do `pose: 'point'`, then `'flag'`;
  - at the S5 finale, everyone `'bow'`s.
- **Levels of detail:** full rigs within 60 m; beyond that, cached 2-tone silhouette sprites.
- **Comfort** starts at 100.
  - Penalties: a change of ≥ 3 notches within 0.4 s while moving (−2); EB (−15); slip or slide (−3); more than 5 km/h over a curve limit (−5/s);
    a stop jolt with final decel > 2.0 km/h/s (−8); rollback (−5).
  - It recovers +1 every 8 s of smooth running.
  - A passenger face icon on the dash has 4 moods. Mika gives a line at < 60.

**Tests:** queue counts per crowd level; door positions match the train length and stop target; boarding empties the queues before the doors close;
comfort penalties and recovery; the LOD switches at 60 m.

### 4.11 Events (`34-events.js`)

Data-driven per stage: `{ id, type, at: s | clock | trigger, params }`. Each fires once and is logged in `snapshot().events`.

| type | behaviour |
|---|---|
| `oncoming` | a train actor spawns on the opposite track 1,400 m ahead, heading toward us at 80 km/h; passing gives a whoosh, a pressure jolt (shake) and a toot |
| `preceding` | a train actor ahead on our track with a legs script (S2 freight); it holds blocks |
| `rival` | a same-direction express on the parallel track (S4), scripted relative to our progress: alongside, then pulling ahead, stopping at Koen beside us |
| `crossing` | gates and bells: warning when our ETA < 25 s or within 500 m; gates down in 4 s; up after our rear clears. Waiting kei cars, bikes and pedestrians |
| `obstruction` | a crossing blocked (S3: the festival's takoyaki cart). The special emitter 350 m before flashes red; stop before the crossing. It clears 12 s after we stop |
| `workers` | slow order 25 km/h; a lookout rig with a flag and whistle; the crew steps aside and waves on the horn (bows if we're under the limit) |
| `doorRush` | at a station: Kenji runs, Mika re-opens the doors (+8 s dwell) |
| `festival` | crowd ×2, lantern strings, taiko drum loop near the station |
| `fog` | fog density from s to s, plus sighting distance 180 m |
| `glare` | sun-glare bloom when the track heading points at the low sun; the visor drops |
| `radio` | a story line (§4.18) |
| `tip` | a first-time tutorial tip (once per save, unless "Show tips" is on) |
| `flash` | the oncoming last train flashes its headlights; answer with the horn within 4 s for +2 s (S5) |

**Tests:** each event fires once in its stage under the autopilot playthrough; crossing gates are down while our train is on the crossing; the obstruction
clears only after we stop; the horn makes workers wave; door rush adds 8 s to that dwell.

### 4.12 Time of day, weather and light (`40-sound.js` for audio, `rail.js` for the image)

**Time of day** is a float hour from the stage (or Free Run). It picks one of these grades, blended linearly between neighbours:

| grade | hours | sky (top → horizon) | ambient | notes |
|---|---|---|---|---|
| dawn | 5–7 | #2a2850 → #f0a080 | .70 warm | low sun east, long shadows (darker ground bands) |
| day | 8–15 | #3a78d8 → #bfe0ff | 1.0 | |
| afternoon haze | 14–16 | #5a8ad0 → #e8e0c8 | .95 | |
| sunset | 17–18.5 | #3a2a6a → #ff9a4a | .75 orange | big low sun on the backdrop; glare zones |
| night | 19.5–4.5 | #060818 → #1a2440 | .30 blue | stars, moon, city glow; lit windows; headlights; platform lights stay bright |

- The backdrop is an `E.Backdrop` with layers per zone (mountains, hills, city, sea, clouds). Its `turn` scrolls with the curve × distance travelled.
- **Rain** (S2, Free Run):
  - darker grade (−20%); streaks and windshield droplets that build up;
  - wipers sweep every 1.2 s in the cab;
  - wet rails; puddles on platforms (bright blots);
  - umbrellas on the crowds;
  - rain hiss in the audio, and lower adhesion (§4.3).
- **Fog:** distance fog, larger signal glows, short sighting. Hoshino: "When you can't see, the signals see for you."
- **Glare:** an additive white-orange bloom over the upper half, scaled by `cos(heading − sunHeading)`. The sun visor animates down.

**Tests:** the grade blend is continuous at every boundary hour; rain sets the adhesion; fog sets sighting to 180 m.

### 4.13 Cameras and the director (`60-drive.js`, `61-attract.js`)

| camera | placement | use |
|---|---|---|
| `cab` | s_front − 1.5, x = track, h 2.9, horizon .40 | gameplay (default) |
| `cabMin` | the same, without the dashboard | "Minimal" cab display setting; duel viewports |
| `chase` | behind the rear by 25 m, h 9, x +2, fov 70 | View button; attract |
| `chaseHigh` | rear − 40 m, h 22, x +6 | quad-track shots, the hub card |
| `platform` | on the platform 15 m past the stop target, h 1.7, `dir: -1` | View button at stations; attract; the S5 finale |
| `trackside` | 4 m beside the line at a scripted s ahead, h 2, `dir: -1`; holds while the train passes, then cuts | attract, ending |
| `stopCam` | 2D side view (§4.6) | after every stop |

- `view` cycles through cab → chase → platform (platform only near a station) → cab.
- **Cab feel:**
  - lateral sway ∝ curve × v²;
  - 1-px vertical bumps at rail joints (every 25 m, timed with the joint sound);
  - the view pitches 2–3 px forward under braking and back under power (`pitchPx` follows the smoothed acceleration);
  - a jolt on EB.
  - The "Camera sway" setting scales these; reduce motion turns them off.
- **Look:** the right stick or a right-drag shifts `lookX` up to ±25% of W and `lookY` ±10% of H, springing back. It's a glance, not a free camera.
- **Director** (attract, ending): a list of shots `{ cam, dur, at }`, cut with 0.3 s dissolves.

**Tests:** each camera projects our train's front to the expected screen side; `view` cycles only through the cameras that apply; the director runs
its shots in order.

### 4.14 Cab, HUD, stop gauge (`50-cab.js`, `51-hud.js`)

**10-foot rules:**
- Nothing smaller than the 5×7 font at scale 1. Key numbers (speed, stop distance, Halo Time, notch) at scale 2–3.
- No 3×5 `tiny` font for information.
- A 5% safe margin from the edges.
- Information is never in colour alone: aspects also show as lamp *positions* plus a letter.
- At most 6 HUD groups at once: the Halo ring, the station line, the top-right cluster, the stop gauge, the centre banner (judgments and toasts),
  and the subtitle box.

**Cab** (screen space; the bottom 30% of r.H; scales to any width):
- Windshield frame: pillars at the sides, a top header with a sun visor, wipers (rain), faint glass reflections at night.
- **Dashboard, left to right:**
  1. **timetable card** (station / ARR / DEP, next stop highlighted, PASS rows) with the **pocket watch** clipped beside it;
  2. **speedometer** (analog 0–120, needle smoothing, with a big digital readout under it and the ATS lamps: white "ATS" power, red "ATS");
  3. **notch display**: a big readout ("P3", "N", "B5", "EB") plus a 15-cell strip with the current cell lit, power blue and brake orange;
  4. **BC/MR pressure gauge**;
  5. **pilot lamp** (orange), door side arrows, SLIP and WSP lamps, the comfort face;
  6. **buttons**: ATS confirm, horn, EB (big and round; they depress when used; clickable).
- The **master controller**: Halo 8000 has one T-handle; Halo 3000 has two handles, brake and power, the brake one moving first. It is drawn in
  perspective bottom-left; a **white-gloved hand** rests on it and follows its tween (80 ms per notch).
- Hover with the mouse highlights a widget (focus); click operates it; drag the handle to change notches.

**HUD:**
- **Top-left: Halo Time ring.** A gold halo of 30 px, filling clockwise as a share of 99, with the seconds inside and "HALO" under it.
- **Top-centre: next station.** Line 1: `NEXT  HANABATAKE` (scale 2). Line 2: `1.25 km · ARR 06:42:05` (or `PASS`).
- **Top-right:**
  - the limit in force as a white plate with the number;
  - the next limit, e.g. "▸70 in 320 m";
  - the next sighted signal as a mini 4-lamp head, its letter and distance;
  - the clock.
- **Stop Gauge** (600 m → 0, above the dash, centred):
  - a horizontal bar with the stop marker and our train's nose, and a big "123.4 m" readout;
  - within 30 m it zooms to a ±2 m scale with 10 cm ticks;
  - with **Braking guide** (assist) on: an amber "BRAKE" zone where B4 must start, `d = v²/(2·aB4) + v·τ`, and a ghost marker at the predicted
    stop point.
- **Judgments:** centre screen, `E.font.title` scale 3, colour-coded (PERFECT gold, GREAT cyan, GOOD green, OK white, SHORT orange, OVERRUN red,
  ON TIME gold, LATE red, SMOOTH pink), held 1.2 s, then a smaller list of the Halo Time changes.
- **Toasts** (top-centre under the station line): "HORN +1", "CALL GREAT", "LIMIT!", "ATS!".
- **Subtitles:** a box above the dash with the speaker's name in their colour and a portrait for story characters (§4.18).

**Tests:**
- The HUD state builder (pure function) for given states (approach at 500 m with the guide on, ATS ringing, rain, night).
- Widget hit boxes map clicks to actions.
- Element count ≤ 6.
- Layout at 320×240, 427×240 and 320×690 (upright) keeps everything on screen and out of `game.cornerArea()`.

### 4.15 Input, devices, glyphs, touch-only (`00-core.js`, `05-glyphs.js`)

**Input map** (custom preset):
```js
const KEYS = Object.assign({}, E.Input.DEFAULT, {
  power: ['KeyW', 'ArrowUp', 'Pad7', 'Pad12', 'PadAxisUp'],  brake: ['KeyS', 'ArrowDown', 'Pad6', 'Pad13', 'PadAxisDown'],
  neutral: ['KeyN', 'Pad5'],  eb: ['Backspace', 'KeyX', 'Pad4'],  call: ['KeyE', 'Mouse0', 'Pad0'],  horn: ['Space', 'Pad2'],
  ats: ['KeyQ', 'Pad3'],  view: ['KeyC', 'Pad1'] });
for (const k of ['attack', 'dash', 'skill', 'jump']) delete KEYS[k];
```
- The mouse wheel is handled by our own `wheel` listener (browser only), which turns it into `input.tap('power' | 'brake')`.
- Set the drive scene's `camera: { zoom: false }` so the engine doesn't take the wheel.
- `look` isn't an action. Read `input.padAim` (the right stick) and `input.pan()` (a right or middle drag).

**Prompt badges** (`DH.Glyph.draw(g, action, x, y, scale)`):
- The device comes from `input.lastDevice`, and the badge family from the setting (§4.25), not the controller's name.
- **PlayStation:** a round badge with ✕ (blue), ○ (red), □ (pink), △ (green); pill badges for L1, R1, L2, R2; a D-pad icon with an arrow.
- **Xbox:** A (green), B (red), X (blue), Y (yellow); LB, RB, LT, RT pills.
- **Keyboard:** a keycap with the key label from `input.label(a, 'keyboard')` ("W", "SPACE", "BKSP").
- **Mouse:** a mouse icon with the left or right button lit, or the wheel with an arrow.
- Prompts change on the step the device changes. The title, menus, results and attract all use them.

**Rumble** (`input.rumble`): rail joints .05/.03 s; EB .8/.4 s; slip .3 buzz; obstruction alarm pulses; PERFECT a short .2 tick.

**Touch-only devices:**
- Detect `matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches`, with no gamepad and no key seen.
- Re-check on `gamepadconnected` and `keydown`.
- When touch-only:
  - no touch controls (don't set `touch:` on scenes; `game.input.touchEnabled = false`);
  - the title replaces its menu with a panel "Controller or keyboard required" and a big **SETTINGS** button (`game.menu('settings')`), and the
    engine's corner menu button stays;
  - the **attract mode still runs** after 10 s, and a tap returns to the title.

**Tests:**
- Glyph mapping: PlayStation `call` → ✕; Xbox `call` → A; keyboard `call` → E; mouse `call` → LMB.
- Lever direction flips W/S but not R2/L2.
- Wheel taps.
- Touch-only (stub matchMedia and navigator): the title shows the message; Start can't be reached by taps; attract starts after 10 s; a tap exits it.

### 4.16 Sound: soundscape, sfx, melodies, music (`40-sound.js`)

All sound is made in code. Use the engine's `game.audio` (sfx, `define`, music, `sting`) for one-shots and songs, and a small **continuous
synth** on `audio.ctx` routed through `audio.bus('sfx')` (§3.8) for engine sounds. Build its node graph once; change only parameters each frame.
In headless mode every call does nothing.

**Continuous layers** (parameters from speed, notch and zone):

| Layer | Recipe |
|---|---|
| **VVVF inverter** (Halo 8000) | carrier: square through a bandpass. 0–12 km/h: an async rising tone 300→900 Hz; then stepped "synchronous" bands, each a rising pitch ramp that jumps down at the band edge (bands at 12/24/38/50/65 km/h), the "singing" that makes Japanese EMUs famous; plus a motor sine at 18·v Hz; volume ∝ traction/brake effort (regen under braking) |
| **resistor/motor** (Halo 3000) | low saw at 6·v Hz through a lowpass, a growl that rises with v; a notch-step "clunk" each power notch; contactor clicks |
| rolling | noise through a lowpass at 200 + 12·v Hz, volume ∝ v |
| wind | noise through a bandpass at 800 Hz, volume ∝ v²; louder in tunnels |
| tunnel | low rumble boost plus a feedback delay of 60 ms, 0.3 |
| bridge | hollow girder roar (bandpass 400 Hz) |
| rain | hiss plus random droplet ticks on the glass; wiper squeak/thunk |
| brake squeal | sine 2.6–3.0 kHz with vibrato when braking under 8 km/h |
| compressor | thumps at 3 Hz while stopped, after an air release |

**One-shots:**
- the train: lever clack, EB clunk plus hiss, brake release "pshh" at a full stop, rail-joint "ta-tan" (noise through a lowpass; at each 25 m
  joint, 4 clicks for the bogie spacing), points (rapid clicks);
- doors: door chime, door thunk, conductor buzzer, pilot lamp click;
- warnings: ATS bell (repeating ding), ATS chime, slip whine, the halo ring cracking (game over), the clock tick (≤ 10 s);
- the horn: an air horn of two detuned saws, 349 + 440 Hz, through a lowpass, held while the button is down;
- crossings: bells alternating 700/820 Hz at 2.5 Hz, with Doppler (pitch × (1 ± v/340)) and distance falloff;
- other trains: oncoming whoosh (a noise swell plus a toot);
- ambience: seagulls (sine chirps, harbor), ferry horn (low saw), taiko pattern (festival), cicadas (afternoon noise bursts), crowd murmur (a Babble
  chorus at low volume);
- UI: menu move, confirm, back; judgment jingles (PERFECT: a sparkly arpeggio C-E-G-C-E; GREAT; GOOD; OK; OVERRUN: a dissonant minor 2nd).

**Departure melodies** (*hassha* melodies): 12 original 6–8 s tunes, one per station, on a bell timbre (triangle plus sine an octave up, fast decay,
a light echo).
- Write each as a note list in the engine's note names (`'E5 . G5 A5 ...'` with a bpm).
- Play it once by scheduling every note as an sfx voice with its `delay` (sfx voices take `delay`), through the sfx bus, so it works whether or not
  music is playing.
- Each should be bright, about 2 bars, and end on a resolving note.

**Music** (engine sequencer; `music(song, { fade: 1 })`):

| song | use |
|---|---|
| "Halo Line March" | title and attract |
| "Timetable" | menus and halo map (calm city-pop) |
| "Briefing" | soft |
| "Results" | variants S/A, B/C, D |
| "Game Over" | sting |
| "Parallel Run" | lobby and card, energetic |
| "Evening Halo" | ending and credits, gentle |
| "Commute Groove" | optional driving music (setting, off by default; driving is about the soundscape) |

- Duck the music under dialog (`audio.duck`).

**Tests** (headless): the soundscape parameter function (v, notch, zone → layer volumes and frequencies) is pure and tested (VVVF band edges, wind ∝ v²);
every named sfx and song exists; a browser test counts active nodes after 60 s of driving (no growing leak).

### 4.17 Voices: Babble, gibberish in the Animalese/Simlish style (`41-babble.js`)

`DH.Babble.say(text, voice, { onSyllable, onDone })` and a per-character hook for Dialog (§3.8 #2).

**Syllables:**
- Each word becomes CV syllables from a **hash of the word**, so the same line always sounds the same.
- Japanese-like phonotactics (ka, shi, tsu, ne, ho, ri, n...), about 1 syllable per 2 letters.
- Punctuation shapes the pitch: `?` rises, `!` adds emphasis and a fall, `.` drops at the end, `,` adds a short pause; capitals add stress.

**Synthesis of each syllable** (60–110 ms):
- a consonant burst: noise through a bandpass by consonant class, 15–40 ms;
- then a vowel: a pulse or saw source at f0 through two bandpass formants;
- formants (Hz): a = 800/1200, i = 300/2300, u = 350/1300, e = 500/1900, o = 500/900, scaled by the voice's `size`;
- an envelope with a 6 ms attack and a 30 ms release.
- f0 follows a declination contour with slight random jitter from the word hash.

**Voices:**

| id | who | f0 Hz | rate syl/s | source | character |
|---|---|---|---|---|---|
| hoshino | Chief Instructor | 95 | 9 | saw | gruff, falling contour |
| mika | Conductor | 260 | 13 | pulse 25% | bright, rising ends |
| pa | Station announcer | 190 | 10 | pulse | flat and formal, PA bandpass 300–3000 Hz plus a 120 ms echo |
| haro | Haro-kun | 420 | 14 | pulse 12% | bouncy, +3 semitone wobble |
| driver | the player (calls) | 150 | 11 | square | crisp, loud, clipped |
| kota / fuji / kenji / ren / sato / ota | kid / grandma / salaryman / rival / old driver / station master | 340 / 230 / 140 / 165 / 110 / 120 | 12–14 / 8 / 15 / 12 / 8 / 9 | mixed | as in §5.4 |
| crowd | murmur | random 120–300 | 10 | mixed | quiet chorus |

**Subtitles** are on by default (they carry the meaning). Calls show romaji and English (§4.7).

**Tests:** syllabify is deterministic (same text, same syllables) and its length scales with the text; punctuation changes the contour; every voice id
exists; Dialog calls the voice hook for each character.

### 4.18 Story, dialogue, subtitles, tips (`52-story.js`)

- **Briefings** (before each Career stage):
  - a modal `E.Dialog` with portraits (`portrait: rig`, a Humanoid dressed per §5.4, expressions via `expr`), with Babble voices;
  - behind it, the rail renderer shows the stage's first station at its time of day;
  - then a **stage card**: name, time, weather icon, train, stops, best rank, and "START [✕]".
- **Radio chatter** in play: non-modal `talk.say(line, { name, portrait, auto: 3, modal: false })`, so the train keeps running. It is triggered by
  `radio` events (§4.11) or by rules (first ATS, first yellow, first slip, Halo Time ≤ 10, a missed call). Lines queue so they never overlap.
- **Tips:** the first time each mechanic appears, show a short tip toast with the glyph ("ATS! Press [△] to confirm, then brake."). They are
  remembered in `E.store`, and the "Show tips" setting brings them back.
- **Results lines** by rank (§5.5) and **game over** lines per stage.
- All text lives in `22-stages.js` as data. The style rules are in §5.5.

**Tests:** every stage has a briefing and results lines for S/A/B/C/D; radio lines queue; tips show once per save; no line is longer than 3 rows at 320 px
width (`E.font.wrap`).

### 4.19 Autopilot (`35-autopilot.js`): used by attract, Dev auto-drive, tests and calibration

**Planner.** Over the next 1,500 m, take the constraints:
- line speed;
- limit boards (taking train length into account);
- signal-derived limits (Y 45 and so on);
- red signals: a stop target 25 m before;
- the stop target at the next stopping station;
- slow orders;
- the obstruction (when the emitter is flashing).

**Allowed speed:** `v_allow(d) = sqrt(v_c² + 2·a_plan·max(0, d − v·τ))`, where a_plan = 0.8 × B4 decel. Target v* = min over constraints minus 2 km/h.

**Control:**
- If v < v* − 4, power: the notch is chosen from the speed gap.
- If v > v* + 1, brake with notch `ceil(req / 0.5)`, where `req = (v² − v_c²) / (2·d)` (in matched units).
- **Final stop:** model-predictive. Simulate the train model 12 s ahead for each candidate brake notch, and choose the one whose predicted stop point
  is closest to the target. Inside the last 2 m it eases to B1 (smooth stop). This should hit PERFECT reliably. If it doesn't, the physics or the
  lag model is wrong; fix that, not the bot.

**Timetable (needed for ON TIME and rank S):**
- Every 2 s, pick a cruise cap by bisection: for each candidate, simulate the train model over the rest of the interval (0.1 s steps, with the
  same constraints) and keep the cap whose predicted arrival matches the scheduled `arr` (aim for −0.5 s).
- Coast (N) where that still arrives on time.
- Depart the moment the departure is allowed.
- **Min-time mode** ignores the timetable and drives as fast as the rules allow. This is "par" for calibration (§4.8).

**Procedures:** confirm ATS within 0.5 s; make every call at the sweet spot; horn for 0.8 s at each horn board; EB on the obstruction emitter if it can't
stop with B8; answer the S5 flash.

**Adhesion:** in rain, never pick a power or brake notch whose effort exceeds the adhesion limit (B5 at most with the default 2.6 km/h/s). Plan the
braking with that notch, so the S2 run has no slip or slide.

**Skill** (0–1, a dev slider):
- 1 = perfect;
- 0.6 = human-like: 0.25 s reaction delay, ±3 km/h noise, stop aim ±0.4 m, drawn from `DH.rng('auto')`.

**Cheat flags** (attract): no Halo Time loss; teleport between vignettes; forced events.

**Tests:**
- Skill 1 completes every stage with every stop GOOD or better (PERFECT on ≥ 80% of stops), no game over, every scripted event fired, rank S.
- Skill 0.6 completes every stage with no game over on Normal.
- Its runs are deterministic: proof hash twice.

### 4.20 Attract mode (`61-attract.js`)

**Trigger:** 10 s with no input on **title, haloMap, freeRun setup, duelLobby, driversLog, help or about**.
- Input means any key, gamepad button or stick past the deadzone, mouse move over 4 px, click, wheel or touch.
- The timer is game time measured in those scenes. It is paused while a Shell screen (settings) is open, and restarts on any input.

**Loop**, about 3 min, using the autopilot with cheats and the camera director:
1. **S0 Depot, dawn:** handle close-ups in the cab; a perfect stop at Mark 1, then the Stop Cam.
2. **S1 Hanabatake departure:** platform cam showing the doors, the melody, the buzzer and the pilot lamp; the "Shuppatsu shinko!" call with the glove;
   then the horn board, the oncoming train and the chase cam onto the bridge.
3. **S2 rain:** wipers, the SLIP lamp, ATS bell and confirm, yellow signals, the tunnel mouth, passing Todai-shita alongside the freight.
4. **S3:** the obstruction crossing (trackside cam, then EB), the track workers waving, a chase cam on the climb.
5. **S4:** chaseHigh with the Sky Liner alongside, the door rush (platform cam), sunset glare.
6. **S5:** night headlights, fog, the final approach to Akari Central, the staff bow, PERFECT.
7. **"TODAY'S BEST DRIVERS"** table (top 5 career totals from `E.store`, or seeded defaults with names like "HOSHINO"), then the logo card.
   Then loop.

**Overlay:** a "DEMO" badge, a small logo, and "Press any button" with the device glyph. On touch-only devices it reads "Controller or keyboard
required" instead.

**Rules:** any input goes back to the title (`game.go('title', null, { fade: 'wipe' })`) and resets the idle timer. Attract never writes records or
postcards. It is never shown in hub sessions.

**Tests** (headless):
- `advance(10.2)` on the title enters attract.
- The vignettes advance in order; after the loop's length it is back at vignette 1.
- `tap('confirm')`, `press('KeyA')`, `feed('move')` and a stick tap each return to the title.
- No records are written.
- Touch-only still starts attract.

### 4.21 Dev Mode (`62-dev.js`)

**Reach:** the pause menu item **Dev Mode** (`menu.items`). It is not offered in hub sessions. It opens an `E.Shell` screen with tool buttons and two
sub-screens. Everything works with controller, keyboard and mouse.

**Tools:**
- Auto-drive on/off; autopilot skill;
- God mode (no penalties); freeze Halo Time; time scale (0.25×–4×);
- jump: to the next station approach (600 m out), to km (a km slider plus Go), skip to the next stop (arrive PERFECT), finish the stage (perfect),
  fail the stage (game over);
- time of day (slider, 0–24 h); weather (Clear / Rain / Fog);
- force the next signal's aspect (R / Y / YG / G);
- trigger an event (ATS test, obstruction, door rush, oncoming, workers, flash);
- camera (cab / chase / chaseHigh / platform / trackside);
- debug overlay on/off (also the backquote key, once Dev Mode has been opened this session);
- braking guide on/off;
- unlock all stages; reset save data (asks first, in-game);
- **sound board**: play any sfx, melody, song or Babble voice, to audition them.

**Balance sliders** (live; the `Dev` group, §3.8 #3), with **Reset to defaults** (`game.settings.reset('Dev')`):

| key | label | default | range |
|---|---|---|---|
| `accelScale` | Power acceleration | 1.0 | 0.5–2.0 |
| `brakeScale` | Service brake strength | 1.0 | 0.5–2.0 |
| `brakeLag` | Brake response lag (s) | 0.7 | 0.0–2.0 |
| `ebDecel` | Emergency brake (km/h/s) | 5.0 | 3.0–7.0 |
| `adhesionRain` | Rain adhesion (km/h/s) | 2.6 | 1.0–6.0 |
| `gradeScale` | Gradient effect | 1.0 | 0–2 |
| `resistScale` | Running resistance | 1.0 | 0–2 |
| `graceStart` | Starting Halo Time (s) | 25 | 5–99 |
| `lateCost` | Halo Time lost per second late | 1.0 | 0–3 |
| `overrunCost` | Seconds lost per metre overrun | 2.0 | 0–5 |
| `stopWindow` | Stop window scale | 1.0 | 0.5–3 |
| `onTimeWindow` | On-time window (±s) | 2 | 0–10 |
| `dwell` | Minimum dwell (s) | 12 | 5–60 |
| `callGreat` | Call sweet spot far edge (m) | 120 | 60–200 |
| `limitTol` | Speed tolerance (km/h) | 3 | 0–10 |
| `atsTime` | ATS confirm time (s) | 5 | 2–10 |
| `comfortSens` | Comfort sensitivity | 1.0 | 0–3 |
| `sway` | Camera sway | 1.0 | 0–2 |
| `fov` | Cab field of view (°) | 75 | 60–90 |

- Every system reads `DH.TUNING` each step, so changes apply at once.
- **Debug overlay** (pixel text, top-left):
  - performance: FPS, draw ms;
  - position: s/km, segment and zone;
  - train: v (km/h, m/s), a, jerk, notch, P/B effective, adhesion state;
  - signals: the next 3 signals with their blocks; the preceding train's s;
  - rules: the limit in force, the next stop distance, the autopilot's predicted stop point, Halo Time, score, comfort;
  - the event queue, stage, seed.

**Tests:** each slider changes behaviour live (doubling `brakeScale` shortens the B4 distance by about 45–55%); Reset restores every default; Dev isn't in the
standard Settings list; Dev Mode is missing from the pause menu in a session; each tool does what it says (jump puts s within 1 m; finishing a stage
reaches results).

### 4.22 Progress, Driver's Log, postcards (`55-ui-log.js`)

- **`E.store`** keys: `dh:progress` (`{ unlocked, ranks, best, stats, postcards }`), `dh:tips`, `dh:board` (the attract table). In a hub session the
  client's storage is memory-only, so nothing persists. That is intended.
- The title's **CAREER** opens the halo map with the next unfinished stage selected.
- **Driver's Log** (large cards, no dense tables):
  1. **Records:** per stage, the best rank stamp, score, best stop error and perfect count.
  2. **Postcards:** 8 cards in a 4×2 grid. Each is a rendered miniature of its scene (the rail renderer drawn into a 160×100 buffer) with a caption.
     Selecting one shows it large with a handwritten-style thank-you note.
  3. **Stats:** 4 big numbers: km driven, stops made, perfect stops, calls made.

| # | Postcard | Condition |
|---|---|---|
| 1 | "Your First Halo" from Haro-kun | any PERFECT stop |
| 2 | "Right at My Door!" from Kota | S1: Hanabatake GREAT or better |
| 3 | "Rain or Shine" | S2 with no overrun and no slide |
| 4 | "Takoyaki Saved" | S3: obstruction avoided |
| 5 | "Not One Second" | S4: every arrival ON TIME |
| 6 | "The Last Halo" from Hoshino | finish S5 |
| 7 | "Point, Call, Proceed" | every call in a stage made GREAT |
| 8 | "Gentle Hands" | every stop in a stage SMOOTH |

**Tests:** each condition unlocks its card (driven by `debug`); progress round-trips through `E.store`; unlocks are in order; attract doesn't unlock
anything.

### 4.23 Multiplayer A: AI Hub session, **ghost** mode (`63-hub.js`)

**Head tags** (after `<meta charset>` and the pasted, unmodified `session.js` script):
```html
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1-2">
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="2-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="5">
<meta name="hub:session-goal" content="Best driving score: stop on the mark, on time">
<meta name="hub:session-howto" content="Lever W/S or L2/R2 · Call E/✕ · Horn Space/□ · ATS Q/△">
```
(`hub:type` and `hub:players` are catalogue tags copied from the hub examples; `hub:players` is the local count. The goal is ≤ 60 characters and
the howto ≤ 80.)

**Flow** (the round is the **Parallel Run**, §5.3):
1. `AIHub.active` is true from the first line, so skip the title, attract and menus. Run the boot steps (no key press), then
   `const info = await AIHub.connect({ mode: 'ghost', seats: [2, 4], card: true })`.
   - If it returns `null`, play normally.
2. Build the Parallel Run with `DH.rng` seeded from `AIHub.rng('route')`. Assign tracks by seat: id 0 → x 0, 1 → +7, 2 → −7, 3 → +14 (all four
   tracks run clockwise for the festival race). Then call **`AIHub.ready()` once, with no key press.**
3. **Our own card** (`hubCard` scene), drawn with the rail renderer's `chaseHigh` camera over the four trains at Shotengai:
   - the title;
   - "PARALLEL RUN: four drivers, four tracks, one timetable";
   - the goal; this player's controls (glyphs);
   - each player in their seat colour (names drawn with the pixel font, never put in HTML) with ready ticks;
   - the time left from the `card` event.
   - **Enter, ✕ or a click on READY** → `AIHub.answer('ready')`. **△, T or a click on MORE TIME** → `AIHub.answer('more')` (pressing again takes it
     back).
   - No other choices, and no `Math.random` on the card.
4. On `start`: the 3 s countdown is the Shotengai departure melody. At `AIHub.time() >= 0` the starting signal clears and the round begins.
5. **During play:**
   - every 100 ms: `AIHub.send({ t: 'g', area: 'quad', s, v, n: notch, st: phase }, { reliable: false })` (10 msgs/s, under the 20/s limit);
   - every 1 s: `AIHub.progress({ score, label: 'DAIGAKU · 4,350' })`;
   - on each stop: `AIHub.send({ t: 'j', st, j: 'GREAT', e: 0.21 })` (reliable), which shows as a rival toast ("BLUE: GREAT STOP").
6. **Ghost trains:** the other players' trains are drawn on their tracks at interpolated s (smoothed toward the target, extrapolated by v). Each has
   its stripe in the player's colour and a name tag over its front within 400 m. They never affect our world: no blocks, no signals. A small
   standings panel lists the players' scores.
7. **Finish:** after the last stop's judgment, call `AIHub.result({ score, stats: { 'Perfect stops': n, 'On time': m }, awards: [...] })` **once**,
   send `{ t: 'done', score }`, and show "Waiting for the others" with live standings.
8. **`time-up`:** if not finished, call `AIHub.result({ score })` at once.
9. **`leave`:** remove that ghost.
10. **`end`:** stop input and all sound (music off, the continuous synth to 0, mute) and show the final standings. The hub then removes the game.

**Session rules:**
- The pause menu shows only Resume, Settings and Controls: no Quit, Retry or Dev Mode.
- No `alert`, `confirm`, `prompt` or `window.open`.
- No network except the hub.
- No chat or emotes.
- Options is ignored while Create is held (§3.8 #7).
- Storage is memory-only (the client handles this).
- `AIHub.fail(msg)` if the canvas can't be created.

**Tests:**
- A **mock AIHub** in the Node test (`test/hub-mock.mjs`) checks:
  - connect, then ready is called with no input;
  - play is gated until `time() >= 0`;
  - progress comes at ≥ 1/s;
  - the send rate is ≤ 20/s and every payload < 16 KB;
  - `result` is called exactly once (finish or time-up);
  - `end` silences the game and blocks input;
  - no title or attract scene is ever entered;
  - the Options-with-Create rule holds.
- The **real harness** (§8.4): 2 players with auto; 4 players with `latency=150&jitter=50&loss=5`; and `scenario=host-leave`. Each must reach
  `window.__hubCheck.pass === true`.

### 4.24 Multiplayer B: local Duel, split screen (`64-duel.js`)

- **Lobby:** P1 is in. "P2: press START on a second controller, or 2 on the keyboard" (`game.allowJoin({ max: 2, onJoin })`). Show each half's keys
  (§2). The race starts when both press confirm.
- **Race:** the Parallel Run at noon; P1 on x 0, P2 on x +7. `game.splitScreen(2, { layout: 'auto' })`.
  - Each viewport: the `cabMin` camera, a compact HUD (speed, notch, stop gauge, Halo Time, score).
  - `scene.hud(r)`: the shared clock and the leader.
  - Each player sees the other as a real train on the next track.
  - Prompts follow each player's own device.
- **Results:** both score cards side by side, then the winner's banner with Haro-kun cheering. Rematch / Title.

**Tests:** `game.addPlayer({ keys: 'right' })`; both inputs drive their own trains; two viewports draw; two autopilots finish; the winner is the higher score;
a tie is shown as a tie.

### 4.25 Settings, accessibility, difficulty

**The game's own settings** (group `Game`, via `menu.settings` or Shell items):
- Difficulty: Easy / Normal / Expert.
- **Button symbols: PlayStation / Xbox.** The default is PlayStation; its `apply` sets the standard `glyphs` setting.
- Lever direction: Up = Power / Up = Brake.
- Braking guide: On / Off (default On for Easy, Off otherwise).
- Auto calls: Off / On.
- Subtitles: On / Off (default On).
- Show tips: On / Off.
- Stop Cam: On / Off.
- Cab display: Full / Minimal.
- Driving music: Off / On.
- Camera sway: 0–100%.

**Standard settings** (built in; don't rebuild them): volume, music, effects, reduce motion (turns off sway and flashes), screen filter (CRT/scanlines),
controls rebinding, rumble, and so on.

Everything stays readable with no colour vision: signal letters, judgment words and lamp positions.

**Tests:** each setting applies (glyph family, lever flip, guide visible, auto calls, subtitles off hides the subtitle box); settings survive a reload via
`E.store`.

### 4.26 Front-end screens (`55-ui-*.js`): big, few items, pixel-art, controller-first

- **Title:**
  - The background is the rail renderer's platform camera at Akari Central at dawn, with a Halo 8000 gliding in.
  - Logo: `E.font.title('DENSHA DE HALO!', ...)` (scale 4, gold gradient) with a glowing gold **halo ring** around the final "O", and Haro-kun
    bouncing beside it.
  - Subtitle: "THE HALO LINE · AKARI CITY".
  - `E.Menu`: CAREER · FREE RUN · DUEL · DRIVER'S LOG · HOW TO DRIVE · SETTINGS · ABOUT & CREDITS. Hover moves the focus and click picks.
  - A prompt line with the device glyph, and the version (`E.versionLabel()` plus the game version v1.0).
  - Keep it clear of the top-right corner buttons.
- **Halo Map** (stage select):
  - A gold ring (radius about 0.32 × min(W, H)) with 12 station dots and labels.
  - Each stage is an arc between its stations: glowing when selected, grey when locked, with its rank stamp when done. Haro-kun floats in the centre.
  - The stage card on the right (below on tall screens): name, time, weather, train, stops, best.
  - ←/→ or the stick go round the ring; hover an arc to select it; ✕ or a click to go; ○ back.
- **Free Run setup:** a stage on the ring, plus 4 rows of ←/→ choices (Time, Weather, Train, Difficulty), then START.
- **Briefing:** §4.18.
- **Results:**
  - the rank stamp slams in (a scale tween, a shake, the stamp sound);
  - 5 big lines (Stops, Punctuality, Calls & Horn, Smoothness, Penalties) with a total;
  - Halo Time left; Hoshino's line;
  - any new postcard flip;
  - buttons: NEXT STAGE / RETRY / HALO MAP.
- **Game Over:** the cracked halo; Hoshino's line; RETRY STAGE / CONTINUE FROM LAST STATION (Halo Time set back to the start value, score halved) / HALO MAP.
- **Ending** (after S5's results):
  - the finale cinematic: platform cam; staff and crowd bow; Hoshino gives you his pocket watch (dialog);
  - then credits rolling over a night chase cam circling the whole ring, to "Evening Halo";
  - "THANK YOU FOR RIDING THE HALO LINE";
  - then the title, with S5 marked done.
- **How to Drive:** a Shell `help` screen with keys for the current device and 5 short sections: Lever, Stop on the mark, Be on time, Point and
  call, Signals & ATS.
- **About & Credits:** pixel pages, ↑/↓ to scroll and ←/→ for the page, mouse wheel to scroll:
  1. Credits (an original homage to *Densha de Go!* (Taito), not affiliated; my-3D2dge by Michael Crosato, MIT; the AI Hub client; asset sets if
     used: Kenney, KayKit, ambientCG CC0; made by the building model);
  2. **Source Information** (every TASK.md field);
  3. Testing Feedback;
  4. Engine Feedback;
  5. Prompt Feedback.
  - The text lives in `src/55-ui-about.js` and is filled in at the end, the same as the chat reply and `exit-interview.json` (§9).

**Tests:** each screen opens and closes with confirm and cancel; the halo map wraps; locked stages can't be started; mouse hover selects (`input.feed('move')`);
About contains every Source Information label; results buttons route correctly.

---

## 5. Content

### 5.1 Akari City and the Halo Line

The line runs clockwise as a loop of **20,600 m** with **12 stations**. It is double-track: ours at x 0, the counter-clockwise track at x +3.8.
From 11,800 to 15,600 it is **quad-track**: tracks at −7, 0, +7, +14; island platforms span −5.4…−1.6 and +8.6…+12.4. Line colours: **Halo Gold**
`#f2c230` and **Sky** `#3aa0e0`.

| # | id | In-game name | Meaning | Stop (6-car s) | Platform | Zone | Landmark / character |
|---|---|---|---|---|---|---|---|
| 0 | akari | AKARI CENTRAL | Akari Central | 0 (≡ 20,600) | island + side, 245 m, big roof | downtown | terminal hall with clock tower; Station Master Ota |
| 1 | hanabatake | HANABATAKE | Flower Fields | 1,600 | left, 190 m | suburb-flowers | greenhouses, flower rows; Kota the train-fan kid |
| 2 | kujira | KUJIRA-BASHI | Whale Bridge | 3,450 | right, 175 m | riverside | whale-back steel arch over the river mouth (bridge 2,600–3,200) |
| 3 | minato | MINATO-MAE | Harbor Front | 5,100 | left + freight yard right | harbor | gantry cranes, containers, ferry; seagulls |
| 4 | todai | TODAI-SHITA | Below the Lighthouse | 6,950 | island with passing loop | cliff | lighthouse on the cliff; tunnel 6,050–6,550 |
| 5 | okiku | OKIKU-DERA | Great Chrysanthemum Temple | 8,700 | left, wooden, 185 m | temple-town | five-storey pagoda, temple gate, festival; Grandma Fuji |
| 6 | yuhi | YUHI-ZAKA | Sunset Slope | 10,450 | right, hilltop | hills | terraced houses, sea view, little shrine |
| 7 | shotengai | SHOTENGAI | Shopping Arcade | 12,100 | 2 islands (quad), viaduct | city-elevated | arcade roofs, neon game centre; Kenji's office |
| 8 | daigaku | DAIGAKU-MAE | University | 13,700 | 2 islands (quad) | campus | clock tower, ginkgo trees, bicycles |
| 9 | koen | SAKURA-KOEN | Cherry Blossom Park | 15,300 | 2 islands (quad) | park | sakura, pond, the "Akari Eye" Ferris wheel; petals |
| 10 | hoshimi | HOSHIMI-DAI | Stargazing Heights | 17,100 | left | hills-north | observatory dome |
| 11 | kawasemi | KAWASEMI | Kingfisher | 18,800 | right | river-north | river bridge 19,200–19,500, fishermen, paddies |

- **Stop markers and platform lengths:**
  - Akari Central and the three quad-section stations (Shotengai, Daigaku-mae, Sakura-Koen) have both "6" and "10" markers, with the 10 placed
    8 m past the 6. Their platforms are 220–245 m.
  - Every other station has only a "6" marker, on a platform of about 180 m.
- **The quad transition (11,650–11,800):** the counter-clockwise track swings out from +3.8 to +14 in a gentle S-curve, and tracks −7 and +7 branch
  off. Do the same in reverse at 15,600–15,750. In normal service, 0 and +7 carry clockwise trains (the Halo local and the Sky Liner express), and
  −7 and +14 carry counter-clockwise ones.
- **Station kit** (things and strips): name boards every 40 m (white; big romaji; English meaning smaller; previous and next stations with
  arrows), canopy and columns, benches, vending machines (red/blue/white with lit panels), sorting bins, a platform clock, LED departure board,
  stair housings, a safety fence, door-queue marks, staff at the head end, a Haro-kun poster.
- In-game text is ASCII (the font has no kana or macrons), so names have no macrons: TODAI-SHITA, OKIKU-DERA, SHOTENGAI.

**Zones** (scenery sets; buildings come from a parametric box generator, §5.6):

| zone | s range | ground | buildings (weights) | nature | props | backdrop |
|---|---|---|---|---|---|---|
| downtown | 19,900–700 | concrete | office towers .4, department store .2, hotels .2, overpasses | street trees | billboards (Haro-kun ads), lamp posts, vending machines | city skyline |
| suburb-flowers | 700–2,500 | fields/grass | houses .5 (blue/grey/terracotta roofs), apartments with balconies and laundry .3, greenhouses .1, konbini .1 | flower rows, paddies | utility poles and wires, bikes, crossing mirrors | hills, far city |
| riverside | 2,500–3,600 | water/reeds | boat sheds | reeds, willows | fishermen, rowboats (library) | river mouth, sea |
| harbor | 3,600–5,800 | asphalt | warehouses (long strips with roll-up doors) .5, container stacks .4 | — | gantry cranes, crates/barrels (library), bollards, seagulls | sea, ships |
| cliff | 5,800–7,500 | rock/grass | fishing houses | pines (library), rocks | stone walls, tunnel portals | sea, cliffs |
| temple-town | 7,500–9,300 | gravel | machiya (dark wood, tiled roofs) .6, shops with noren .4 | pines, maples, stone lanterns | lantern strings, torii, stalls | hills, pagoda |
| hills | 9,300–11,700 | slopes | terrace houses | cedars, bamboo | retaining walls, guard rails | sea (left), sunset |
| city-elevated | 11,700–13,200 | rooftops below the viaduct | arcade roofs, neon facades, apartment towers | — | sound walls, billboards | skyline |
| campus | 13,200–14,500 | lawns | university blocks, gym dome | ginkgo | bike rows, students | city |
| park | 14,500–16,000 | grass | pavilion | sakura (petal particles) | lanterns, benches (library) | hills, Ferris wheel |
| hills-north | 16,000–18,000 | grass/forest | houses | cedars | poles | mountains, stars |
| river-north | 18,000–19,700 | paddies/water | farmhouses | reeds | scarecrows, fishermen | mountains |
| depot | depot route | gravel | depot sheds (strips), pits | — | lamps, workers, parked trains | dawn city |

**Depot route** (S0): 1,000 m on a single track with sidings at x ±4.5 holding parked trains (0–350); straight to 400, a curve R 800 L from 400 to 600,
then straight. Stop marks (yellow boards) at 300, 620 and 900. A staff halt platform "DEPOT GATE" on the left at 860–920. A shunting signal at 40.

### 5.2 Trains

| id | name | cab | notches | traction a0 (km/h/s) | brakes | lags (apply/release/power) | vmax | sound | livery |
|---|---|---|---|---|---|---|---|---|---|
| `h8000` | HALO 8000 | modern grey panel, one T-handle, LCD notch display | P5 / B8 | .8 1.4 2.0 2.6 3.2 (vk 15 25 35 40 45) | 0.5·n, EB 5.0 | .7 / .5 / .3 s | 110 | VVVF "singing" | silver, gold halo stripe, sky band |
| `h3000` | HALO 3000 (retro) | green panel, two handles, analog gauges | P4 / B7 | .7 1.3 1.9 2.5 (vk 18 28 36 42) | 0.55·n, EB 4.6 | 1.1 / .8 / .5 s | 100 | resistor growl and clunks | cream, orange stripe |
| `skyliner` | SKY LINER (rival) | — | AI | — | — | — | 120 | — | purple and silver |
| `freight` | MINATO FREIGHT | — | AI | — | — | — | 75 | — | blue loco plus colourful containers |
| `inner` | HALO 8000 inner loop | — | AI | — | — | — | — | — | as h8000 |

- Formations: `h8000-6`, `h8000-10` (S4), `h3000-6` (S2).

### 5.3 Stages

Times are initial values; calibrate them (§4.8). "s" means route metres.

**S0 · DAWN DEPOT** (tutorial). 05:30 dawn, clear, `h8000-6`, depot route, Halo Time frozen.

Steps, each a Hoshino line with a prompt; the next unlocks when the condition holds:
1. P1, reach 10 km/h.
2. N, coast.
3. Brake: get below 5 km/h.
4. Stop at Mark 1 (300); judged with no penalty; Stop Cam explained.
5. The departure call on the shunting signal.
6. Up to 40 under the "40" board.
7. Mark 2 (620), easing to B1: SMOOTH explained.
8. EB demo (pull, stop, release).
9. Mark 3 (900) within 1 m to pass; retry the step on failure.

The certificate stamp follows, then S1 unlocks. Halo Time, ATS and the horn get one sentence each from Hoshino ("You'll meet those in service").

**S1 · FIRST LIGHT LOCAL.** 06:40 dawn into morning, clear, `h8000-6`, Akari Central → Hanabatake → Kujira-bashi.

| stop | arr | dep |
|---|---|---|
| AKARI CENTRAL | — | 06:40:00 |
| HANABATAKE | 06:42:05 | 06:42:30 |
| KUJIRA-BASHI | 06:44:45 | — |

Geometry (route script excerpt, the pattern for every stage):
```
[-230,'station',{id:'akari',side:'island',len:245,stop:{6:0,10:8},roof:[-215,5],melody:'akari',crowd:3,landmark:'terminal'}]
[0,'zone','downtown'] [60,'signal',{id:'AK-S',kind:'start'}] [150,'overpass',{w:18,h:7}]
[200,'limit',{v:45,until:420}] [420,'limit',{v:85}] [520,'curve',{len:260,r:900,dir:'R'}]
[700,'zone','suburb-flowers'] [700,'signal',{id:'B101',kind:'block'}]
[880,'limit',{v:70,until:1260}] [900,'curve',{len:330,r:500,dir:'L'}]
[1050,'horn',{}] [1110,'crossing',{id:'X1',road:6,cars:3,peds:2}] [1250,'signal',{id:'B102',kind:'block'}]
[1380,'signal',{id:'HB-H',kind:'home'}] [1420,'station',{id:'hanabatake',side:'L',len:190,stop:{6:1600},melody:'hanabatake',crowd:2}]
[1660,'signal',{id:'HB-S',kind:'start'}] [1800,'grade',{len:300,permille:8}] [2150,'signal',{id:'B103',kind:'block'}]
[2300,'horn',{}] [2450,'limit',{v:75,until:3250}] [2500,'zone','riverside'] [2600,'bridge',{len:600,kind:'truss',water:'river'}]
[2700,'curve',{len:400,r:1200,dir:'R'}] [2950,'signal',{id:'B104',kind:'block'}] [3250,'signal',{id:'KJ-H',kind:'home'}]
[3290,'station',{id:'kujira',side:'R',len:175,stop:{6:3450},melody:'kujira',crowd:2}]
```

- Events: crossing X1 (normal); `oncoming` at 2,000; Kota waves at Hanabatake (dwell); radio lines (§5.5).
- Teaches: the timetable and clock, the departure procedure, calls, the horn board, a limit board, an oncoming train, crossing bells, melodies and
  announcements.

**S2 · HARBOR RAIN RAPID.** 10:15 day, **rain**, `h3000-6`, Kujira-bashi → Minato-mae → (pass Todai-shita) → Okiku-dera.

| stop | arr | dep |
|---|---|---|
| KUJIRA-BASHI | — | 10:15:00 |
| MINATO-MAE | 10:16:55 | 10:17:20 |
| TODAI-SHITA | pass 10:20:20 | |
| OKIKU-DERA | 10:22:15 | — |

- Geometry: line speed 95 (Rapid); curve R 700 L at 3,700–4,000 (limit 80).
  - Signals: B201 3,900, B202 4,300, MN-H 4,880 (the Minato-mae platform runs 4,925–5,115), MN-S 5,160, **M5600** 5,600, **M6000** 6,000,
    B205 6,600, TD-H 6,850 (main line through, no platform stop), B207 7,600, OK-H 8,480 (the Okiku-dera platform runs 8,530–8,715).
  - Tunnel 6,050–6,550 with a curve R 400 R (limit 60, horn board 5,950).
  - Pass board at 6,550. Freight loop at Todai-shita on the left, 6,750–7,150.
- **Freight script** (260 m long):
  - It joins our track from the Minato yard at 5,250 at **10:16:20** and runs at 45 km/h (12.5 m/s).
  - It **stops with its front at 6,300 from about 10:17:44 for 40 s** (points being set), then pulls on and diverges into the Todai loop at 6,780,
    where it stands.
  - What the player gets, at par:
    - At our 10:17:20 departure its rear is in block M5600–M6000, so the starting signal MN-S shows **Y** (call: "Chui!").
    - Near 10:17:56 we pass M6000's ATS beacon at 5,400. M6000 is **R** (the freight is standing in block 6,000–6,600), so the **ATS bell rings**.
    - We stop before M6000 at about 10:18:56. The freight pulls away at 10:18:24, and its rear clears 6,600 at about 10:19:25, so M6000 turns
      **Y** after a wait of 20–30 s, then **G** once the freight is wholly in the loop (about 10:19:50).
  - We see its tail lights through the rain while we arrive at Minato-mae, and later pass it standing in the loop at Todai-shita.
  - The test (§4.4) checks this sequence with the autopilot.
- Teaches: another train type (two handles, slow brakes), rain slip and slide, yellow signals, ATS confirm, a tunnel, a pass station.

**S3 · TEMPLE HILL LOCAL.** 14:00 afternoon haze, clear, `h8000-6`, Okiku-dera → Yuhi-zaka → Shotengai. The stage **opens during the festival dwell**
at Okiku-dera.

| stop | arr | dep |
|---|---|---|
| OKIKU-DERA | (dwell) | 14:00:00 |
| YUHI-ZAKA | 14:02:40 | 14:03:00 |
| SHOTENGAI | 14:05:30 | — |

- Geometry:
  - crossing X2 at 9,050 (normal);
  - climb **25‰** from 9,200 to 10,300; curve R 600 R at 9,300–9,600; curve R 450 L at 9,900–10,200 (limit 60);
  - horn board 9,450; **workers** with a slow order of 25 from 9,600 to 9,900 (lookout at 9,550);
  - Yuhi-zaka at 10,450;
  - descent **20‰** from 10,700 to 11,450; curve R 500 L at 10,900–11,200 (limit 55);
  - **obstruction emitter at 11,150 for crossing X3 at 11,500** (the festival's takoyaki cart); horn board 11,400;
  - viaduct from 11,700; Shotengai at 12,100.
- Events: festival (crowd ×2, lanterns, taiko), `workers`, `obstruction` at X3 (clears 12 s after we stop), Grandma Fuji bows at Yuhi-zaka, `oncoming`
  at 11,200.
- Teaches: gradients both ways, a slow order and the horn for workers, an emergency stop, a festival crowd.

**S4 · SUNSET RUSH.** 17:30 sunset, clear, **`h8000-10`** (10-car marker), Shotengai → Daigaku-mae → Sakura-Koen, quad track.

| stop | arr | dep |
|---|---|---|
| SHOTENGAI | — | 17:30:00 |
| DAIGAKU-MAE | 17:31:55 | 17:32:15 |
| SAKURA-KOEN | 17:34:05 | — |

- Geometry: line speed 80 (city); curve R 800 R at 12,400–12,800; signals SG-S 12,170, B401 13,000, DG-H 13,500, DG-S 13,770, B403 14,400,
  KO-H 15,100; curve R 1000 L at 14,000; horn board 14,350 (park path).
- **Rival** Sky Liner on x +7:
  - it leaves Shotengai 5 s after us;
  - runs level with us to 12,800 (its driver Ren on the radio);
  - pulls ahead at 95;
  - passes Daigaku-mae;
  - waits at Koen, where it arrives first and stands beside our platform (its driver waves).
- **Door rush** at Daigaku-mae (+8 s). **Glare** from 13,750 to 14,600. Crowd level 3 at every stop. `oncoming` on x +14 at 14,800.
- Teaches: train length and stop markers, making up lost time without speeding, staying calm beside a faster train.

**S5 · THE LAST HALO.** 23:10 night, fog patches, `h8000-6`, Sakura-Koen → Hoshimi-dai → Kawasemi → Akari Central.

| stop | arr | dep |
|---|---|---|
| SAKURA-KOEN | — | 23:10:00 |
| HOSHIMI-DAI | 23:12:15 | 23:12:35 |
| KAWASEMI | 23:14:35 | 23:14:55 |
| AKARI CENTRAL | 23:17:05 | — |

- Geometry:
  - quad ends at 15,600; curve R 600 R at 15,700–16,100;
  - climb 15‰ from 16,100 to 16,900, with **fog 16,200–16,800**;
  - Hoshimi-dai at 17,100;
  - descent 12‰ from 17,500 to 18,200; curve R 700 L at 17,800–18,100 (limit 70);
  - Kawasemi at 18,800;
  - horn board 19,100; river bridge 19,200–19,500;
  - downtown from 19,900; overpass at 20,150; limit 45 at 20,200 (points);
  - **home signal AK-H at 20,350 shows YY** (restricted 25 into the terminal);
  - Akari Central at 20,600.
- Events: `fog`; `oncoming` last train at 19,000 with **flash** (answer with the horn: +2 s); the platform finale (crowd and staff line up, everyone
  bows).
- Then the **ending** (§4.26).
- Teaches: night driving, fog and trusting signals, the YY aspect; the story's close.

**PR · PARALLEL RUN** (Duel and hub; also in Free Run). 12:00 day, clear, `h8000-6`, Shotengai → Daigaku-mae → Sakura-Koen on the quad track. All
four tracks run clockwise ("the Drivers' Festival").

| stop | arr | dep |
|---|---|---|
| SHOTENGAI | — | 12:00:00 |
| DAIGAKU-MAE | 12:01:55 | 12:02:15 |
| SAKURA-KOEN | 12:04:05 | — |

- Every track has its own signals, with identical block timing. No rival AI, door rush or glare.
- In a session the score is the standings (higher wins). The round fits in 5 min with the card and results.

### 5.4 Characters (Humanoid rigs for portraits and on-world figures; Blob for the mascot)

| Character | Role | Look (`E.Humanoid` options) | Voice | Notes |
|---|---|---|---|---|
| **Tetsuo Hoshino** | Chief Instructor, 38 years, last day | `build:'heroic'`, navy coat uniform, cap with a gold badge (`hat:{style:'cap',color:'#1a2a4a'}`), grey hair, white moustache (drawn at the portrait), white gloves | hoshino | dry, proverbial; never quite praises |
| **Mika Aoba** | your conductor | navy uniform, cap, ponytail, armband | mika | warm, exclamation marks |
| **Haro-kun** | Halo Line mascot | `E.Blob({ R: 7, colors: white/cream, wings: true, feet: true, mouth: true })` plus a drawn gold halo ring and headlight-eyes | haro | title, tips, PERFECT, attract host, boot screen |
| **Station Master Ota** | Akari Central | grey coat, red-banded cap | ota | S5 finale |
| **Kota** | train-fan kid at Hanabatake | small (`size:.8`), yellow cap, backpack, camera | kota | waves at every stop |
| **Grandma Fuji** | regular at Okiku-dera/Yuhi-zaka | kimono colours, bun hair, `hunch` | fuji | bows |
| **Kenji** | salaryman, always late | suit, tie, briefcase | kenji | the S4 door rush |
| **Ren Kurosawa** | Sky Liner driver | purple uniform, sunglasses | ren | cocky radio, friendly at the end |
| **Sato** | old driver on the inner loop | like Hoshino, older | sato | the S5 headlight flash |
| crowds, staff, workers | — | seeded outfits by zone; staff in navy with white gloves; workers in orange vests and helmets, the lookout with a flag | crowd | §4.10 |

### 5.5 Writing style guide and script

**Style** (after the source's tone):
- Short, earnest sentences in railway vocabulary.
- Announcements are formal, say the station name twice, and repeat formulas ("The doors on the left side will open.").
- Calls are romaji with English subtitles.
- The instructor is terse and proverbial and hides his warmth; the conductor is cheerful.
- Arcade banners are 1–3 words in capitals.
- Light comedy comes from Japanese railway earnestness, never from mocking it.
- No line wraps past 3 rows at 320 px.

**Banners:** PERFECT HALO! · GREAT! · GOOD · OK · SHORT · OVERRUN! · OVER THE MARK · ON TIME! · LATE +4 · EARLY · SMOOTH! · CALL! · HORN +1 · LIMIT! ·
ATS! · EMERGENCY · HAZARD AVOIDED · MISSED STOP · WRONG STOP · SIGNAL PASSED AT DANGER.

**Announcer (pa):**
- "Thank you for riding the Halo Line. This is a local train for Kujira-bashi."
- "The next station is Hanabatake. Hanabatake. The doors on the left side will open."
- "This is a Rapid service. We will not stop at Todai-shita."
- "Okiku-dera. Okiku-dera. Festival visitors, please mind the gap."
- "The next station is Akari Central, the last stop. Thank you for riding the Halo Line today."

**S0 (Hoshino):**
- "So. You're the new one."
- "Thirty-eight years I drove this ring. Not one second late. Today is my last day."
- "Your paperwork says you can drive. The rails don't read paperwork."
- Steps:
  1. "Lever up: power. P1. Gently."
  2. "N. Let her coast."
  3. "Lever down: brake. Watch the needle, not your hand."
  4. "The yellow board. Put your nose on it."
  5. "Before you move, point at the signal and say it. Shuppatsu, shinko."
  6. "Forty is the limit. Forty is not a suggestion."
  7. "Near the stop, ease off to B1. The passengers' coffee will thank you."
  8. "That is the emergency brake. You will hate the day you need it."
  9. "Last mark. Inside one metre and I sign your card."
- The pass: "...Hmph. Signed. The 06:40 is waiting, Rookie."

**S1:**
- Mika: "Good morning, Driver! Conductor Aoba, at the back. Call me Mika!"
- Hoshino: "Arrive on the second. Early is not on time. Late is not on time."
- Mika: "Melody, doors, my buzzer, then she's all yours!"
- Kota (on the platform): "Haro! Haro! Mister driver!" Mika: "Our biggest fan is here again."
- Hoshino (at the horn board): "The fishermen under the bridge like to know we're coming."

**S2:**
- Hoshino: "Today, the old 3000. She's older than you. Her brakes think slowly. Ask early."
- Mika: "Umbrellas everywhere! The rails will be slippery!"
- Dispatcher: "Halo 1015, freight ahead of you through the cliff tunnel. Expect restrictive signals."
- Hoshino at Y: "Yellow. Forty-five. Don't argue with yellow."
- Mika on slip: "Wheels spinning! Ease the power!"
- Hoshino passing: "Tsuka. Good. Eyes forward."

**S3:**
- Mika: "It's the Chrysanthemum Festival!"
- Hoshino: "Up the hill it's easy to be slow. Down it, easy to be fast."
- Hoshino at the workers: "Horn. Now."
- Mika at the obstruction: "The crossing alarm! Something's on the tracks!"
- Afterwards: "The takoyaki survived. So did we."
- Fuji: "Thank you, driver-san!"

**S4:**
- Hoshino: "Ten cars. Your marker is the 10, not the 6."
- Ren: "Evening, Halo Line! See you at Koen... if you can keep up!"
- Hoshino: "Ignore him. He has his timetable. We have ours."
- Kenji: "Wait! Wait for me!"
- Mika: "One moment please! Doors re-opening!"
- Hoshino: "Eight seconds. Earn them back. Without speeding."
- Hoshino in the glare: "West sun. Squint if you must. Don't guess."

**S5:**
- Mika: "Last train of the night... and Hoshino-san's last run."
- Hoshino: "Don't make it a ceremony. Drive it like any other train."
- Hoshino in the fog: "When you can't see, the signals see for you."
- Hoshino at Sato's flash: "That's Sato. Thirty years. He's flashing for me... Answer him."
- **Finale:**
  - Ota: "Hoshino-san. Thirty-eight years. The whole station is here."
  - Hoshino: "...And the last stop was yours, Rookie."
  - Hoshino: "Here. My watch. It runs two seconds fast. I never told anyone."
  - Hoshino: "A loop has no last station. Every ending is the next departure."
  - Mika: "Welcome to the Halo Line, Driver!"
  - Haro-kun: "Harooo!"

**Results** (Hoshino, by rank; one line per stage per rank, varied):

| rank | S1 line |
|---|---|
| S | "...Exactly there. Exactly then." |
| A | "Good. Now do it four hundred more times." |
| B | "Acceptable. Your brakes are nervous." |
| C | "You drove. That is all I will say." |
| D | "We will talk about this at the depot." |

- Game over: "That's enough. Hand me the key."
- Write the other stages' lines in the same voice.

### 5.6 Art assets

All art follows the engine's native look: PS1-era pixel art drawn with `E.px` primitives and `E.font`, shaded with `E.tones` (`deep`, `sh`, `base`,
`lt`, `hi`), lit by palette per time of day. Every world drawer has 3 levels of detail by k (§4.1).

**New (made for this game; these make it feel like the source):**

| Group | Items | Technique |
|---|---|---|
| Trains | Halo 8000 / 3000 / Sky Liner / freight loco plus containers; body pattern (windows, doors, stripe, skirt, bogies, pantograph); front faces (headlights, tail lights, LED destination, cab windows, driver silhouette) | strips plus a front-face thing |
| Cab | 8000 modern panel, 3000 classic panel, windshield frame, visor, wipers, glass droplets, master controllers, the gloved hand (4 poses: on handle, point, press button, horn), pocket watch, timetable card | screen overlay |
| Line-side | 4-lamp signal (lit states, glow), shunting signal, ATS beacon, limit and END boards, horn board, stop approach and PASS boards, stop markers "6" / "10", km posts, slow-order boards, special emitter, catenary masts (lattice, concrete), wires | things / per-segment lines |
| Stations | platform slab patterns, canopy, columns, name boards, vending machines, bins, clock, LED board, stairs, fence, door marks, Haro-kun poster | strips plus things |
| Town (parametric) | `building({ w, d, h, floors, roof: 'flat'|'gable'|'hip', facade: 'office'|'apartment'|'house'|'shop'|'konbini'|'warehouse'|'machiya', palette, lit })` drawn as boxes (front, side, roof), windows lit at night | strips |
| Landmarks | terminal clock tower, greenhouses, whale-arch bridge, gantry cranes, container stacks, ferry, lighthouse (beam at night), pagoda, temple gate, torii, observatory dome, clock tower, Ferris wheel (turning), sakura trees | things |
| Crossings | road band, crossbuck, flashing lamps, gate arm (tweened), kei cars, bikes | band plus things |
| People | outfits per §4.10 and §5.4; briefcase, umbrella, flag, camera attachments at `rig.hand()` | Humanoid rigs |
| UI | logo plus halo ring, halo map, glyph badges, Halo Time ring, notch display, stop gauge, judgment titles, hanko rank stamps, postcards, weather and time icons, DEMO badge | overlay |

**From the engine's library** (generic props; bake once at boot with `E.shapeSprite(id, { view, facing, size })` into things):
- `tree`, `pine`, `bush`, `rock`, `fence`, `bench`, `lamppost`, `crate`, `barrel`, `sign`;
- `kenney-fantasy-town:hedge*`, `kenney-pirate:boat-row-large`, `kenney-holiday:bench` (load their sets per `src/assets/README.md`);
- `E.prop('tree' | 'pine' | 'bush' | 'flowers' | 'grass' | 'lamp' | 'streetlamp' | 'trashcan' | 'hydrant').frames[0]`.

Search for more with `node tools/asset-find.mjs "<words>"`, and cut what you use into a set of your own (`tools/asset-set.mjs`) so the bundle
stays lean.

### 5.7 Animations (new, on top of the engine's rigs)

- **Gloved hand:** rides the handle (an 80 ms tween per notch), point-and-call (raise, point at the target, return), press ATS, press the horn.
- **Controls:** handle tweens, needles (a critically damped spring), lamp blinks, wiper sweeps, droplets that gather and are wiped away, the visor
  dropping.
- **Train:** doors sliding (exterior and platform cam), the pantograph bobbing with sparks at night, the S5 headlight flash, the back-up crawl.
- **World:** crossing gates and lamps, the obstruction emitter flashing, the lighthouse beam turning, the Ferris wheel turning, falling sakura petals,
  seagulls flapping, festival lanterns swaying.
- **People:** idle and gait (built in); `wave` (kids); `cheer` (festival, the duel winner); new `bow`, `point` and `flag` poses (§3.8 #6) for staff,
  workers and the finale; boarding and alighting walks; umbrellas.
- **Haro-kun:** squash-and-stretch bounce, the halo spinning and glowing, wing flaps, a hop on PERFECT, waving on the title.
- **UI:** the stamp slam, the halo ring cracking (particles), the postcard flip, the halo map's selection glow travelling the ring, the title train
  arriving.
- Check every rig animation with `node tools/filmstrip.mjs index.html#gallery --steps "..." --seed 1`.

### 5.8 Audio assets

Everything in §4.16 and §4.17. Departure melodies, one per station:

| station | melody id | character |
|---|---|---|
| akari | `akari` | stately and bright: a 4-bar bell fanfare |
| hanabatake | `hanabatake` | skipping, pastoral |
| kujira | `kujira` | rolling, wave-like |
| minato | `minato` | jaunty, ends with a ship-horn note |
| todai | `todai` | airy (used when stopping in Free Run) |
| okiku | `okiku` | pentatonic, koto-like |
| yuhi | `yuhi` | warm, falling |
| shotengai | `shotengai` | busy, syncopated |
| daigaku | `daigaku` | a school-bell quote |
| koen | `koen` | light and lilting |
| hoshimi | `hoshimi` | twinkling and high |
| kawasemi | `kawasemi` | quick, bird-like |

---

## 6. Build order and milestones

Each milestone ends **playable** and **green** (`node test/run.mjs`). Don't start the next until the acceptance checks pass. Cut nothing silently.
If time runs short, use the cut order in §7, removing whole features (never stubbing them).

| # | Milestone | Build | Acceptance |
|---|---|---|---|
| **M0** | Setup | the dev folder; engine copied; `index.html` (session.js first); `src/00-core.js`, a minimal title scene (the logo text and a START item; it grows into the real title in M7); `test/run.mjs` with lib.mjs loading engine plus src in a vm; `tools/bundle.mjs`; ENGINE-CHANGES.md | page opens from file:// with no errors; `node test/run.mjs` prints `N passed, 0 failed`; bundle builds and opens |
| **M1** | **Rail renderer** | `rail.js`: segments, square-pixel projection, ground, ballast, sleepers, rails, catenary, strips (platform, canopy, wall, overpass, tunnel, bridge truss), things (signal, boards, masts, trees via shapeSprite), crest clipping, tint, fog, rear view, `project`, `pick`; a small test route; `#gallery` | the §4.1 tests; the 13 gallery screenshots reviewed (§8.5): rails converge cleanly, platforms read as raised, nothing squashed on 16:9 |
| **M2** | Train and cab core | `30-train.js`; lever and input map; the cab overlay (speedo, notch, gauges, handle, glove); the HUD skeleton; camera sway; the continuous sound (VVVF, rolling, joints, brakes); one station stop with judgment and Stop Cam on the test route | §4.3 check values; drive and stop by keyboard and pad; judgment shown; sounds respond to v and notch |
| **M3** | Rules: full S1 | route compiler and the S1 route; signals and blocks; ATS; limits; stations with dwell and departure sequence; timetable and clock; calls and horn; Halo Time, score, ranks; comfort; briefing and results; minimal title → S1 → results flow; story data for S1; first Babble voices | S1 playable end to end by a human; §4.4–4.10 tests |
| **M4** | Autopilot and Dev Mode | `35-autopilot.js`; `DH.proof`; Dev Mode (tools, sliders, Reset, debug overlay, sound board); engine changes §3.8 #3; `tools/calibrate.mjs` | the autopilot ranks S on S1; slider tests; the proof hash is stable; Dev Mode works by pad and mouse |
| **M5** | Multiplayer | PR stage and the quad-track route section; train actors as ghosts; `63-hub.js` with our card; `64-duel.js`; hub harness script | mock-hub tests; **harness passes** with 2p, with 4p plus latency, jitter and loss, and with host-leave; the duel finishes with two autopilots |
| **M6** | Career content | the whole halo route and depot; zones and scenery sets; stations and landmarks; S0–S5 data, events, rival, freight, crossings, workers, obstruction, fog, glare, rain, night; crowds and characters; all story lines; postcards; calibrated timetables | **full playthrough test** (autopilot skill 1 and 0.6 over S0–S5 and PR) passes; every event fires; gallery shots per zone reviewed |
| **M7** | Front end and attract | boot steps and splash; title (touch-only branch); halo map; Free Run; Duel lobby; Driver's Log; How to Drive; About & Credits; game over; ending and credits; **attract mode**; glyph badges everywhere; settings additions | §4.15, 4.20, 4.22, 4.25, 4.26 tests; attract loop screenshots; every screen at 1080p and 720p readable at 10 ft (§8.5) |
| **M8** | Audio and polish | the full soundscape, 12 melodies, all music, all Babble voices; rumble; animation polish (filmstrips); a balance pass with the sliders (a human drives each stage on Normal: an S is hard but possible, a C is easy); accessibility review | sound board audition; node-leak test; no look notes left from `tools/check.mjs` that matter |
| **M9** | Ship | final bundle; About/Credits text; exit-interview.json; the full suite on the **bundle** (headless plus browser plus harness) | §9 checklist all ticked |

**First playable target (end of M3):** S1 driven by a human, start to finish, with real feedback. That's where the fun gets proven or fixed. Tune the
physics and judgment windows there before any content work.

---

## 7. Risks and how to de-risk them

| Risk | Why it's risky | De-risk |
|---|---|---|
| **Rail renderer quality** | It is the whole look; pseudo-3D strips (platforms, trains, buildings) and the rear view are new code | Build it first (M1) on a test route; projection unit tests; the gallery with screenshots before anything else; keep strip faces simple (flat colour plus pattern), add detail later |
| **Stopping feel and precision** | If precise stops feel random, the game fails | The lag model plus the stop gauge's fine scale plus the braking guide; MPC autopilot as proof it can be done; tune in M3 with telemetry (debug overlay); sliders for lag, windows, brake scale; record human sessions (`?record=1`) and replay them |
| **Babble and VVVF synthesis** | They can sound harsh or leak WebAudio nodes | Fixed node graph for the continuous layers; a capped node pool for syllables; the sound board for auditions; master limiter (a DynamicsCompressor on our bus); the leak test |
| **Hub compliance** | Easy to miss a rule (ready without input, one result, stopping on end) | Copy `examples/ghost.html`'s flow; mock-hub tests in M5; run the real harness early, and again on the final bundle |
| **Content volume** | 12 stations, 13 zones, 6 stages | Data-driven scripts; a parametric building generator; seeded scenery per zone; hand-draw only the landmarks; stations from one kit |
| **Determinism** | Tests and hub copies must agree | `DH.rng` streams only; fixed steps; proof hash twice; no wall clock |
| **10-foot legibility** | 320×240 pixels on a TV | Font-size rules (§4.14); screenshots at 1920×1080 and 1280×720 viewed scaled down; at most 6 HUD groups |
| **Engine edits** | Could break standard features | Minimal patches (§3.8); rerun the handoff tests; log them |
| **Disk and /tmp** | /tmp was full on this machine | `TMPDIR` inside the dev folder; clean `_src` clones after copying |
| **Time** | A big scope | Milestone gates; the cut order below |

**Cut order if time runs out** (each cut removes the feature cleanly, including its menu entries and tests):
1. postcards 7–8;
2. the Halo 3000 cab art (it keeps its physics and sound and uses the 8000 cab);
3. the `trackside` camera;
4. the Stats page in the Log;
5. Free Run's train choice.

**Never cut:** any TASK.md requirement (dev mode with sliders, attract, the hub, the 10-foot UI and glyphs, touch-only handling, About/Credits, the exit
interview) or any stage S0–S5 or PR.

---

## 8. Testing

### 8.1 One command

`node test/run.mjs` (from the dev folder; also `npm test`).
- It runs every headless suite and prints **only failures**, each as `FAIL <suite>: <what> (<detail>)`, then **one line**: `57 passed, 0 failed`.
- Exit code 1 on any failure.
- `node test/run.mjs physics stations` runs a subset. Rerun only the suites that cover the code you changed, and the whole run before each milestone
  gate.
- `--browser` adds the Playwright checks (§8.3). `--hub` adds the harness (§8.4). Both need `TMPDIR` set (§0).

`test/lib.mjs`:
- creates a vm context with stand-ins: `window`, `addEventListener`, `removeEventListener`, `location {hash, search}`,
  `navigator {maxTouchPoints, getGamepads}`, `matchMedia`, and optionally a mock `AIHub` (§4.23);
- loads `engine/my-3d2dge.js`, `engine/modules/rail.js`, then `src/*.js` in order;
- returns `{ E, DH, game, I }`.
- Each test drives the game with `game.advance()`, `I.tap/hold/press/feed`, and `game.debug`.

### 8.2 Headless suites (what each asserts)

| suite | asserts (see each §'s Tests) |
|---|---|
| `rail` | projection, square pixels, rear mirror, crest clipping, strip faces, project/pick (§4.1) |
| `route` | compiling, segments, curves, grades, spans, validation good and bad (§4.2) |
| `physics` | check values, lever rules, slip, determinism (§4.3) |
| `signals` | aspects, starting signals, ATS ring/confirm/EB, SPAD, S2 freight (§4.4) |
| `limits` | tolerance, once per section, rear clears (§4.5) |
| `stations` | judgment table, re-stops, on time/late/early, smooth, dwell order, pilot interlock, missed and wrong stops (§4.6) |
| `calls` | windows, GREAT vs OK, sighting, departure call, auto calls, horn zone (§4.7) |
| `timetable` | clock, pause, card, calibrated par early by 6–12 s (§4.8) |
| `score` | Halo Time cap and 0, Max, ranks, difficulty (§4.9) |
| `crowds` | queues, doors, boarding, comfort, LOD (§4.10) |
| `events` | each event fires once and does its effect (§4.11) |
| `tod` | grade continuity, rain adhesion, fog sighting (§4.12) |
| `cameras` | placements, the view cycle, the director (§4.13) |
| `hud` | state builder, hit boxes, element count, layouts at 3 sizes (§4.14) |
| `input` | glyph families, lever flip, wheel, touch-only (§4.15) |
| `sound` | parameter function, names exist (§4.16) |
| `babble` | determinism, contour, voices, Dialog hook (§4.17) |
| `story` | briefings and results lines exist, queueing, tips once, wrap length (§4.18) |
| `autopilot` | skill 1 → S on every stage; skill 0.6 → no game over; proof stable (§4.19) |
| `attract` | 10 s trigger, order, loop, every exit input, no records, touch-only (§4.20) |
| `dev` | sliders live, Reset, hidden from Settings and from sessions, tools (§4.21) |
| `progress` | postcards, store round-trip, unlock order (§4.22) |
| `hub` | the mock-hub contract (§4.23) |
| `duel` | two players, viewports, winner and tie (§4.24) |
| `settings` | each setting applies and persists (§4.25) |
| `screens` | every screen's open, close and routes; About has every label (§4.26) |
| **`playthrough`** | **the scripted whole game:** boot → title → (wait 10 s → attract → input → title) → Career S0…S5 via the menus, driven by the autopilot at skill 1 → results after each → the ending and credits → title; then PR via Duel (2 autopilots) and via the mock hub; asserts no errors (`game.errors` empty), S0 passed, every service stage (S1–S5) rank S, every postcard 1–8 unlocked, every event id fired, and the same proof hash when run twice |

### 8.3 Browser checks (`--browser`; Playwright 1.63.0, file:// first)

1. `node engine/tools/check.mjs <bundle.html>`, plus `#gallery`, `#stage=S2`, `#attract`: no errors; act on its look notes (fill, colour count,
   contrast).
2. A Playwright script on the bundle:
   - the page loads; the title is drawn; after 10.5 s of no input, attract is on (`__dh.snapshot().attract.active`); a key press returns to the
     title;
   - keyboard drive: Enter, then CAREER, then S1 via the menus; hold W for 3 s and the speed is above 0;
   - mouse: hover over the title menu moves the focus, and a click picks;
   - **touch emulation** (`hasTouch`, `isMobile`, with no keyboard events sent): the message and the Settings button show; attract still runs.
3. Audio node count after 60 s of autopilot driving stays bounded.

### 8.4 AI Hub harness (`--hub`)

- Copy `harness.html`, `bridge.js`, `round.js` and the bundle (as `game.html`) into `test/.serve/`.
- Start `python3 -m http.server 0 --bind 127.0.0.1 --directory test/.serve`, read the port from stdout, and confirm that `GET /game.html` is our
  page (its `<title>`).
- In Playwright, open in turn:
  1. `harness.html?game=game.html&players=2&auto=1`;
  2. `&players=4&latency=150&jitter=50&loss=5&auto=1`;
  3. the same with `&scenario=host-leave`.
- Wait for `document.body.dataset.complete === 'true'` and assert `window.__hubCheck.pass === true`. On failure, print the failed checklist items.
- Stop the server **by its PID**.
- Also open the bundle outside the harness to confirm the normal game still runs (the hub's own `hub-check` does this too).

### 8.5 Screenshots (only for what scripts can't judge)

Save them to `shots/` at 1920×1080 and 1280×720:
- the 13 gallery shots;
- each zone at its stage's time of day;
- a station dwell with the crowd boarding;
- the crossing with gates down;
- the obstruction;
- rain wipers;
- fog;
- the rival alongside;
- the S5 finale bow;
- the title, the halo map, a briefing, results with the stamp, game over;
- Driver's Log;
- About;
- the attract DEMO overlay;
- the duel split screen;
- the hub card (from the harness).

Judge each: does it read from 10 feet (view at 25% size)? Does it look like a PS1-era pixel game, not an Atari one? Is any colour flat or muddy?

Filmstrips: the glove's point-and-call, the staff bow and flag, the stamp slam, the crossing gate.

---

## 9. Ship checklist

1. `node tools/bundle.mjs` writes `../DenshaDeHalo-DenshaDeGo-<model>-<ts>.html`:
   - `<meta charset="utf-8">`, then the **unmodified** `session.js` `<script>` as the first script;
   - then the hub meta tags (§4.23), the viewport and the `<title>Densha de Halo!</title>`;
   - the engine's boot splash markup at the very start of `<body>`: copy the template's `#e3-boot` div with the title changed, or generate the
     string `E.bootSplash('DENSHA DE HALO!')` returns at build time in Node;
   - the canvas;
   - then inline scripts: the engine (patched), rail.js, `src/*.js`.
   - No harness files, no external URLs, no `alert`/`confirm`/`prompt`.
2. `node test/run.mjs --browser --hub` passes **on the bundle**: 0 failed.
3. Search **your** code (`src/`, `rail.js`, your engine patches) for `TODO`, `FIXME`, `placeholder`, `lorem` and `stub`: nothing found. The engine's own
   source may use some of these words legitimately.
4. Every TASK.md item is present (the checklist below).
5. **About & Credits** pages filled with: Source Information (Date, Source, Plan = `PLAN.md`, Genre and Perspective, Tech with versions, Art
   Direction, Animation, Audio, Online, Testing, Research, Environment, Model, Usage), Testing Feedback (4 answers), Engine Feedback (6 answers),
   Prompt Feedback (4 answers). Write "unknown" for anything you can't confirm. Put the same text in the chat reply.
6. `exit-interview.json` beside the HTML, in exactly TASK.md's shape. Check that it parses (`node -e "JSON.parse(require('fs').readFileSync('exit-interview.json','utf8'))"`).
   Suggested `aiHub` values, to adjust to what you built:
   - name: "Densha de Halo!"
   - tagline: "Stop on the mark. Leave on the second."
   - description: "Drive the Halo Line, a loop railway around Akari City, from the first train at dawn to the last train at night: stop exactly
     on the mark, keep the timetable to the second, and point and call every signal. Race up to three friends on the four-track Parallel Run."
   - type: "Game"; genre: "Simulation"; source: "Densha de Go!"; series: "Densha de Go!"
   - players: "1–4" (solo, local duel, sessions of 2–4)
   - controls: "Lever W/S or L2/R2 · Call E/✕ · Horn Space/□ · ATS Q/△ · EB Backspace/L1"
   - tags: ["first-person", "vehicles", "arcade", "retro", "versus", "story"]
7. Source Information defaults to start from (make them true):
   - Genre: "Train driving simulation with arcade scoring".
   - Perspective: "First-person cab view (pseudo-3D), with chase, platform and trackside cameras, a side-view stop cam and a ring map".
   - Tech: "my-3D2dge v0.85.2 (full engine, handoff package) + custom rail.js renderer; AI Hub session client 1.4.0; vanilla JS; Node + Playwright 1.63.0 for tests".
   - Art: "the engine's PS1-era pixel style; new code-drawn trains, cab, signals, stations and Japanese townscape; library props via E.shapeSprite".
   - Animation: "engine Humanoid/Blob rigs with new bow/point/flag poses; code-tweened cab controls, gloved hand, doors, gates".
   - Audio: "all procedural WebAudio: VVVF inverter, rail joints, brakes, horn, crossing bells, 12 departure melodies, chip music, Babble gibberish voices".
   - Online: "AI Hub Session Protocol v1, ghost mode, 2–4 players".
   - Research: what you did, e.g. "read the engine handoff docs and the AI Hub protocol; no web research", or what you looked up.
8. Delete scratch clones (`_src/`) and `test/.serve/`, and stop any servers you started.

**TASK.md coverage checklist** (tick each in M9):
- [ ] title by RNG (above)
- [ ] genre and perspective chosen (§1)
- [ ] single HTML plus dev folder (§3.2, §9)
- [ ] built on the handoff engine, changes logged (§3.8)
- [ ] the engine's style plus new source-flavoured art (§5.6)
- [ ] the engine's animation plus new animations (§5.7)
- [ ] all audio in code, gibberish voices (§4.16, §4.17)
- [ ] AI Hub ghost sessions plus the game on its own plus local duel (§4.23, §4.24)
- [ ] feature-complete demo that shows every mechanic (§5.3: each stage's "Teaches")
- [ ] dev mode from the pause menu with live sliders and Reset (§4.21)
- [ ] attract mode after 10 s; any input exits (§4.20)
- [ ] source-like narrative tone (§5.5)
- [ ] 10-foot, controller-first UI; native keyboard and mouse; mouse hover and click in menus and the world; prompts follow the last device;
      PlayStation glyphs with an Xbox option; no dense screens (§2, §4.14, §4.15, §4.25, §4.26)
- [ ] touch-only message, Settings button, attract still runs (§4.15)
- [ ] no TODOs, placeholders or stubs (§9.3)
- [ ] About/Credits plus the chat reply with Source Information and the three feedback sets (§9.5)
- [ ] exit-interview.json valid (§9.6)
- [ ] tests behind one command printing failures plus a one-line count, including the full scripted playthrough (§8)
