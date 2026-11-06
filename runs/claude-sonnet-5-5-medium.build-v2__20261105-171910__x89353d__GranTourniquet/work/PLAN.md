# PLAN: a racing life in chunky pixels

You are building this game from this plan and your brief, without the director. Where they disagree on a file or folder name, the brief wins. Where the plan makes a design call, follow it; where it leaves room, use your judgment and keep it consistent.

**Words used here.** "The brief" is your TASK.md. "The game" is the game: you pick its title as the brief says, and every on-screen use reads one constant, `TITLE`, in `src/game/data/meta.js`. All paths are relative to your dev folder. The finished single HTML goes where the brief says, under the name the brief gives.

Sections: 1 The game · 2 Originality · 3 What is already proven · 4 Architecture · 5 Driving and racing · 6 Content · 7 Screens and controls · 8 Art · 9 Animation · 10 Audio · 11 Writing and cast · 12 Attract mode · 13 Dev mode · 14 Multiplayer · 15 About, credits and the exit interview · 16 Testing · 17 Build order · 18 Done checklist. Appendices: A simulation code · B data · C code recipes.

---

## 1. The game

**Pitch.** You arrive on the Halcyon Peninsula with 15,000 credits, no licence and an appetite. You buy a tired second-hand hatchback, pass your first test, win a little money, spend it on brake pads, and go back for more. Thirty hours of that life, compressed into a three-hour demo: a calm, reverent, slightly obsessive driving game about the difference between cars, drawn in 480×270 pixels.

**Genre.** Racing simulation with a career, tuning and car collecting. For the hub catalogue: `Racing`.

**Perspective.** Third-person chase camera (near and far), a bonnet view, and television cameras in replays. Menus are a 3D diorama of the peninsula, seen from a slow three-quarter camera. Why: the chase view is what makes a car's silhouette and body roll readable at 480×270, and television replays are the source's quiet signature.

**What makes the source distinctive, and what it becomes here:**

| Source trait | In this game |
| --- | --- |
| Cars treated as the characters, each with its own feel | 14 cars across FF, FR, MR, RR and 4WD. A four-wheel tyre model makes layout, weight and power felt. Each has its own sound, silhouette, tail-light signature and brochure text |
| You must earn the right to race | Three licences, 12 tests, bronze, silver and gold, with an examiner and a demonstration |
| Money, parts and patience | A dealer row, used cars, a parts street, real settings. Every part changes numbers you can feel, hear or see |
| Long, calm menus between races | A diorama map, a turntable showroom, lounge music at 10%, slow camera moves, one idea per screen |
| Television replays | After every race: a replay director with trackside cameras, slow motion and a free camera |
| Oil changes, car wash, prize cars, trophies | Service Bay, mud that washes off, prize-car reveals, a trophy shelf, a Museum |
| Rally and endurance | One-on-one gap racing on dirt, and a ten-lap night race with tyre wear, fuel and an animated pit crew |
| Catalogue voice | Sincere, precise, gently dry writing (section 11) |

**Pillars.** When a decision is unclear, pick what serves these, in this order:

1. **The corner is the game.** Braking, line and throttle decide everything. The licences teach it; medals reward it.
2. **Every car is a character.** If two cars feel the same, fix the data.
3. **The garage is the story.** Progress is a car that is yours and that you made better.
4. **Calm between storms.** Menus breathe. Nothing shouts. Then the green light.

**What the player can and cannot do** (the Handbook, section 7, says this in-game): cars cannot be damaged or flip over, by design. You can hit walls and other cars and it costs you time. You cannot leave the circuit past the barriers. There is no cockpit view. Assists can be turned off one by one. A stopped or lost car can be put back on the road at any time.

**The first ten minutes**, on a new save: title, a short greeting from the examiner, Dealer Row with exactly three used cars you can afford, Licence Centre with test C-1 (15 seconds of driving and you have a medal), then the rest of Licence C, then the first race. Every step is a one-line nudge on the map; none of it is forced after the first car is bought.

---

## 2. Originality

Build an original game in the genre, inspired by the source. **Do not recreate the source.** That means:

- No real car makers or models. Use only the fictional marques in section 6.
- No real or source circuits. Use the layouts in Appendix B; they are original.
- Nothing from the source's logo, menu layout, fonts, tagline, event names, licence names, music or sound. Mechanics such as licence tests, tuning and oil changes are fair genre mechanics; their names and look here are our own.
- The title is a playful riff on the source's name, as the brief asks. It must read as its own name and a joke, must not contain the source's name unchanged, and the title screen must not imitate the source's logo.
- About and credits say "inspired by" and name the source, as the brief asks.

---

## 3. What is already proven

The director tested the riskiest parts against the real kit (Pixel Engine 0.46.0) and the real hub harness (client 1.4.0) on this machine, on Chromium with software WebGPU. These results are facts, not suggestions:

| Question | Result |
| --- | --- |
| One HTML from `file://`? | Yes. Bundle with esbuild, inline after escaping `</script`. 5.2 MB plus the game. The test scene boots in under a second. Recipe in C1 |
| Chase camera? | Use preset `fixed`: its `step()` leaves the camera alone, so set position, look-at and FOV yourself in `update()`. Far plane 6000 works. Recipe in C3 |
| Does a racing game read at 480×270? | Very well. A car seen from the chase camera is about 40 art pixels wide and instantly readable, and kerbs, banking and night lighting all hold up |
| Car models as data? | Yes. Side-profile polygons (`slab`) extruded across the width. Recipe in C2 |
| Split screen on one TV? | Yes. Two `Engine.start` calls in two side-by-side containers, each 240×270 art, each with its own camera, input and audio. A second engine can start and be disposed during play while the first keeps running, and the first re-frames to full screen by itself |
| Hub conformance with WebGPU in iframes? | Passes: 2 players; 4 players with `latency=150&jitter=50&loss=5`; `scenario=host-leave`; and the game's own card |
| The engine's `Vehicle`? | An arcade vehicle (default top speed 16 m/s, no gearbox, no load transfer), so tuning couldn't be felt. **Don't use it.** The tested car model in Appendix A replaces it |
| Is a real car model feasible and stable? | Yes. Appendix A has run every car on every track, plus an 8-car race with contact, airborne crests, reverse, manual gears, wear and fuel. A driver limited to keyboard-style digital inputs laps all ten sampled car and track pairings with no recoveries |
| `Engine.headless` and `check.mjs --headless`? | Work for a game whose `createGame()` builds models and HUD. The replay check passes |
| Pixel ghost cars? | `toonMaterial(color, { dissolve: true })` cloned per ghost with `material.dissolve = 0.35` gives a stippled ghost. At 0.55 it is too faint to read |
| Rain and night? | `Precipitation`, `applySky(engine, skyAt(hour))` and `ctx.lights` following a car all work and look right. Drops close to the camera look large: keep `count` modest and the `area` wide |

**Not proven.** No human has driven these cars, and there was no real pad, TV or listener here, only AI and scripted drivers. Treat the handling as a strong start and tune the feel yourself (steering rate, response curve, camera) in build step 3. Medal times, prizes and AI pace ranges are first estimates; your whole-game bot and play-testing should adjust them. The menus, engine sound, voices, music, pit stop and replay director are designed here but weren't prototyped.

### Engine facts that will otherwise cost you hours

1. **Menus and `loadGame`.** `loadGame` frees the scene's objects, the music and the lights. Keep all menus in **one** engine Game (`MenuScene`) so music never restarts. Use `loadGame` only to go between Menu, Race and Replay.
2. **Pausing.** `engine.paused` and `timeScale = 0` make `dt` 0 and drop queued presses. Pause a race by not stepping the simulation, and keep the engine running so the menu animates and reads input.
3. **Volumes.** Engine defaults are master 0.8, sfx 1, music 0.6. On first launch call `audio.setVolume('music', 0.1)`. `audio.resetVolumes()` restores 0.6, so your own reset must set 0.1 again.
4. **The engine's settings panel** is a DOM panel that isn't built for a pad. Start with `settings: { button: false }`, build your own Settings screen, and drive `engine.settings.set({...})` and `audio.setVolume` from it. (`settings.key` is where the engine saves them: leave it for the first engine, and pass `key: false` on a second engine.)
5. **Touch.** The engine adds on-screen controls on touch devices by default. The brief forbids them: pass `touch: false`.
6. **Pads.** The engine merges all pads into one and reads buttons as digital keys. Analog triggers and a second pad aren't exposed. Set `input.gamepadButtons = {}` and poll `navigator.getGamepads()` yourself (section 4, Input). The standard mapping is 0 Cross, 1 Circle, 2 Square, 3 Triangle, 4 L1, 5 R1, 6 L2, 7 R2, 8 Create, 9 Options, 10 L3, 11 R3, 12–15 D-pad.
7. **`wasPressed` works inside engine hooks only.** It didn't fire when polled from an outside `requestAnimationFrame` loop. Anything outside a hook (the hub card's Enter) uses a plain `keydown` listener on `window`.
8. **`input.commands` last one rendered frame** and `fixedUpdate` can run zero or more times. Latch them once per frame at the top of whichever hook runs first (compare `ctx.engine.frame`).
9. **Lights.** The pool holds 4 to 16 lights and only serves requests within about 24 m plus their radius of `cameraTarget`. Give the player's headlights high priority. Fake everything else at night: `glow` parts, plus vertex-coloured light pools baked into the road.
10. **Shadows on cars.** Set `receiveShadow = false` on car meshes (keep `castShadow = true`). Otherwise the rear faces, which you stare at all race, show saw-tooth shadow acne.
11. **Vertex colours blend across shared vertices.** For hard-edged kerbs and lines, give each colour run its own quad with unshared vertices.
12. **Far plane.** The `fixed` rig defaults to near 0.2, far 200. Set `camera.near = 0.5; camera.far = 6000; camera.updateProjectionMatrix()`. Pass `minZoom: 1, maxZoom: 1` or the wheel changes your FOV.
13. **The HUD font is uppercase 5×7.** Draw all UI text through `ctx.hud`. Check characters the font lacks (hub names can contain anything: fall back to `P1`, `P2`).
14. **Two engines.** `__PIXEL_ENGINE__` holds the last one started, so keep your own handles. Each has its own `AudioManager`. Set `audio.persist = false` on the second before muting it, or the mute is saved for the first. Mute the second one's music and let one mix own all sound.
15. **Sound unlock.** The AudioContext opens on a key, click or tap. A pad press may not count as a user gesture. Call `audio.unlock()` on any pad press, check `audio.unlocked`, and if sound is still locked show a small speaker-off icon and the line `PRESS A KEY OR CLICK FOR SOUND` on the title and Settings.
16. **`engine.step(n)` draws nothing.** For a screenshot, step, then set `e.manual = false` and wait for a frame.
17. **On software WebGPU** the engine logs `quality medium → low` at start. That is an info line, not an error. Expect 15 to 50 fps here. The brief makes FPS out of scope: never treat FPS as a failure and don't simplify the game for it.
18. **Port printing.** `python3 -m http.server 0 --bind 127.0.0.1` prints its port late when piped, because stdout is buffered. A script waiting on that line hangs forever. Run it with `python3 -u -m http.server ...`. Stop it by the PID you started.
19. **No Math.random in anything a replay or the hub reads.** Use `ctx.random` and its forks.
20. **`file://`.** The kit's note that modules don't load from `file://` is true of `src/index.html`. The bundled HTML does load from `file://`, so test that (the brief prefers it). `check.mjs` serves `src/` by itself on a port it picks, for model sheets and quick checks.

---

## 4. Architecture

### Stack

- Pixel Engine as it ships. Unzip the kit into `src/` so `src/pixel-engine.js`, `src/check.mjs` and the docs sit together, and never edit `pixel-engine.js`. Your game lives in `src/game/`. Replace the starter: `src/index.html` loads `./main.js`, and `src/main.js` starts the game. Read the kit's `GUIDE.md` whole, and `ASSETS.md` before writing models.
- Plain modern JavaScript modules, esbuild to bundle (it's already installed). No other runtime libraries, no CDN.
- The hub client `session.js`, pasted unmodified as the first script after `<meta charset>`.
- Keep the hub's `harness.html`, `bridge.js` and `round.js` in `tools/hub/`, for tests only. Fetch them with `gh api` or `curl` from the hub repository named in the brief.

### Folder map

```
src/                       the kit, unzipped (pixel-engine.js, check.mjs, docs...)
src/index.html, main.js    dev page and boot
src/game/app.js            App: profile, settings, input, audio mix, scene switching
src/game/sim/sim.js        Appendix A: tracks, car model, AI. Pure JS, no engine, no DOM
src/game/sim/race.js       RaceSim: field, laps, flags, starts, pit lane, slipstream, results, replay feed, events
src/game/sim/tuning.js     tunedParams(carId, install) → car parameters
src/game/sim/career.js     pure rules: money, licences, events, prizes, oil, days
src/game/data/             meta, cars, tyres, parts, tracks, licences, events, text, songs, about
src/game/input/            pad.js, actions.js, prompts.js
src/game/ui/               ui.js, widgets.js, glyphs.js, screens/*.js
src/game/scenes/           menu.js, race.js, replay.js
src/game/render/           trackmesh, dressing, carkit, carview, camera, sky, particles, skid
src/game/models/           cars.js, props.js, buildings.js (ModelDefs; `check.mjs --sheets` draws them)
src/game/audio/            mix, enginesynth, sfx, voice, music
src/game/net/              hub.js, couch.js
src/game/dev/devmode.js    src/game/attract/director.js
tools/build.mjs            makes the single HTML
tools/test.mjs             the one test command
tools/tests/               the suites
tools/medals.mjs           computes medal times from demonstrations
docs/adding-content.md     how a designer adds a car, track, test or event
```

### Scenes

Three engine Games, each with `name`, `setup`, `fixedUpdate`, `update`, `cameraTarget`, `status`, `fingerprint`, `dispose`:

- **MenuScene**: title, map, every menu set (showroom, parts street, service bay, garage, museum, licence centre, event hall, theatre foyer), each a Group that is shown or hidden. One music stream runs throughout.
- **RaceScene**: everything driven: race, licence test, test drive, time trial, attract clips, couch duel, hub round. Built from a `RaceSetup` plain object.
- **ReplayScene**: plays recorded poses with the replay director.

`src/main.js` exports `createGame()` so `check.mjs --headless` and your tests can run it in Node. Guard all `document` access. In `update`, `status()` returns something like `race kestrel lap 2/3 p3/8 3:12.4` or `menu dealer focus=kite`. Set `window.__GAME__` in `ready(ctx)`, with `state()` (scene, screen, focus, race, profile), `press(action)`, and direct test hooks.

### Simulation

`RaceSim` is plain JS with no engine imports. `RaceScene.fixedUpdate` calls `sim.step(inputs)`, which runs 4 substeps of `stepCar` (240 Hz) for every car and `collideCars` per substep. Eight to twelve cars is nothing: the whole car table across all tracks runs in seconds in Node. It keeps previous poses so `update` can interpolate with `ctx.physics.alpha`. It emits an event queue (`shift`, `kerb`, `wallHit`, `carHit`, `lockup`, `lap`, `pitIn`, `flag`) that audio, particles and the HUD consume. `fingerprint(ctx)` returns a hash of quantised positions, laps and wear.

The engine's Rapier world stays empty apart from whatever a prop wants. Car-to-wall and car-to-car are in `sim.js`. Cones are a small circle check in `race.js`, then a tumble animation.

### Input

`src/game/input/pad.js`, once per frame at the end of `update`: read `navigator.getGamepads()` for each pad in standard mapping, quantise axes and triggers to 1/255, and if anything changed call `ctx.input.send({ pads: [...] })`. It arrives as `input.commands` next frame, so the engine's recordings replay it, at the cost of one frame of latency. Latch (engine fact 8).

`src/game/input/actions.js` turns keys, mouse and latched pad state into per-player actions: `steer`, `throttle`, `brake`, `handbrake`, `shiftUp`, `shiftDown`, `camera`, `lookBack`, `pause`, `confirm`, `back`, `info`, `tabL`, `tabR`, `moveX`, `moveY`, with key repeat for menus (first repeat at 0.35 s, then every 0.09 s). It tracks the last device used for prompts, and it tracks idle time for attract mode (any key, pad change over 0.2, mouse move over 3 px, or touch resets it).

Filters on driving input: keyboard steering goes toward ±1 at 3.2 per second and returns to 0 at 6 per second. Keyboard throttle and brake ramp over 0.1 s. Analog stick has an 8% radial deadzone and a gentle response curve (`|x|^1.4`), adjustable in Settings. A trigger that reports only 0 or 1 gets the keyboard ramp.

### Saves

Profile JSON in `localStorage` under a key from `TITLE`, with a version number and a migration switch. Wrap it in try/catch (`file://` and private modes can refuse). Save after every purchase, test and race. In a hub session the client supplies an empty storage; the game simply plays the round.

### URL flags for development and tests

`?scene=race&track=harbour&car=works&hour=21&rain=1&laps=2&ai=7&pace=0.92`, `?scene=licence&test=B-2`, `?scene=replay`, `?attract=1`, `?dev=1`, plus the engine's own (`?seed=`, `?debug=1`). Use `withUrlOptions` for the engine's.

### Designer tools

So the rest of the game can be built later: all content is data in `src/game/data/`, validated by `tools/tests/data.mjs` (ids resolve, restrictions are satisfiable, every car has text, every test has medals). Track layouts are short corner lists. Models go through `check.mjs --sheets`. `docs/adding-content.md` shows, in a few lines each, how to add a car, track, test, event and song.

---

## 5. Driving and racing

Appendix A is working code. Port it as is first, confirm the regression numbers in Appendix B, then extend it. Change numbers only with the regression test running.

### The model, in words

Each car has four wheels with loads from static weight, aero, heave, banking, and longitudinal and lateral transfer. Peak grip per tyre is `mu × load` with load sensitivity. Drive and brake forces share a friction circle with the slip-angle force. There is no wheel-spin state: the differential limits drive by what the wheels can carry, and overflow means wheelspin (rpm flare, smoke, lost side grip). That is why it is stable at 240 Hz and why layout matters: FF understeers under power, FR steps out if provoked, RR punishes a mid-corner lift, MR rotates quickly, 4WD digs out.

### Assists

| Assist | Default | Sim input | Effect |
| --- | --- | --- | --- |
| ABS | On | `abs` | Off: brakes can lock, tyres smoke and steering goes away; on: brakes stop at about 90% of what the tyre has left after cornering |
| Traction control 0–10 | 5 | `tcs` = value/10 | Trims drive to the driven tyres' remaining grip |
| Stability control 0–10 | 5 | `asm` = value/10 | Moment against yaw that grip doesn't explain |
| Automatic gears | On | `auto` | Off: L1/R1 or Q/E. Downshift refused if it would over-rev |
| Driving line | Off | render only | Dashes along the racing line, red where the speed profile says brake. The examiner offers it after three failed attempts at a test |

Licence tests may force an assist off (the brief card says so). Assists live per profile and can be changed from the pause menu.

### Starts, laps, finish

- **Rolling start** for races: double file, 12 m apart, 150 m before the line, at 80 km/h. Everyone is held to 90 km/h (soft limiter) until the leader reaches the line; then green lights on the gantry. The player starts last of the field. Field sizes: 6 to 8.
- **Standing start** with five red lights for licence tests that ask for it, for the hub round, and for couch duels.
- **Race order** from laps and `s`. A lap counts when `s` wraps past 90% to under 10% going forward.
- **After the flag**, an AI takes the player's car for a cool-down lap, the camera drops to television cameras, and the results come up over it.
- **Slipstream.** Within 25 m behind another car and under 2 m laterally, above 100 km/h: `c.dragScale = 0.65`. Show a tiny icon and raise wind noise. It matters on Saltline.
- **Recovery.** Hold Triangle or R for 1 s when off the road or stopped: put the car on the racing line at this `s`, at zero speed, with 2 s of no-contact. AI cars do this by themselves after 3 s stopped. In a licence test, recovery ends the attempt.
- **Wrong way** sign when the heading opposes the tangent above 5 m/s.
- **Reverse.** Hold brake at a standstill for 0.4 s: reverse engages and the brake pedal drives it (`inp.reverse = true`, throttle from brake). Any throttle returns to first.
- **Rain.** `tr.muScale = 0.78`, an overcast sky, spray particles. One event round uses it; Dev mode and Arcade can set it anywhere.

### AI

`aiDrive` is pure pursuit with understeer feed-forward and a yaw damper, a speed target from `speedProfile`, and a lane shift to pass.

- **Pace** is `skill`. Each event gives a range (section 6). Assign ascending by grid so the slowest starts at the front; that makes the player hunt through the field, and the leader is a rabbit.
- **Human touches:** a slow sine on `lane` (±0.6 m), and once a lap for low-pace cars a 2-second `skill − 0.04` lapse.
- **Rubber band:** off by default, a Dev slider up to ±3% of pace.
- **Field variety:** AI cars come from the event's pool, with `tunedParams` applied by event.
- **Endurance:** AI pits when mean wear is under 0.3 or fuel under 0.12.
- **Speed profiles** are per car and track: compute on the first race with that pair and cache them. `racingLine` runs once per track at load (a few ms).

### Pit lane

Used on Kestrel, Harbour and Saltline (the three tracks with pit buildings, all on the start straight, on the driver's right). Data: `pit: { in: s, box: s, out: s }`. In that range set `tr.wallR` to `pitWidth + 2` so the barrier opens out, and set the surface to apron.

Crossing the marked entry line at `t` inside the lane hands the car to an autopilot at 60 km/h to its box, where it stops. The crew runs: tyres (4 s if wear under 0.7), fuel (0.1 s per percent). Press Circle or Esc to skip tyres. Then the car drives out to the merge. A lap count continues through it. Show `PIT` and a stop timer. AI cars use the same autopilot.

### Rally

Red Clay's surface is `dirt`, with a `gravel` edge. Tyres matter through `tyreTable`. Each round is one-on-one against a rival, no contact (`rules.contact = false`), with a 3 s staggered start, time decides. The rival is rendered solid, and the HUD shows the gap. The crests launch cars at speed (0.66 s of air per 2 minutes in testing), so make landing a moment: dust, body bounce, a thump. On dirt, default stability control halves, and the handbrake (rear lock, 28% side grip) is how you rotate in hairpins.

### Cameras

Chase near (6.8 m back, 2.4 up), chase far (8.5, 3.1), bonnet (0, 1.05, 0.2 on the car). Cycle with Triangle or C. Look-ahead 8 m, look height 1.1. FOV 58, rising to 66 with speed. Position spring ~8/s. Low-pass the camera's yaw a little so slides read: the camera shouldn't be nailed to the car. Hold Circle or B for look back. Right stick or right-drag orbits around the car and springs back. Small shake on kerbs and impacts via `engine.shake`. Recipe C3.

### Replays

Record every car at 30 Hz into Float32Arrays: x, y, z, yaw, pitch, roll, steer, rpm, throttle, gear, flags (brake, sliding, airborne, in pit). Playback interpolates. Replays never re-simulate.

**The director:** per track, auto-place camera posts every ~280 m at 15 to 25 m off the road and 3 to 8 m up (tele, FOV 18 to 30, tracking), and add a few authored shots per track (start-line low, helicopter on the straight, bridge or gantry). Pick the next post ahead of the focus car, cut every 4 to 8 s, and when a battle or a slide happens prefer that car. Bars and a small `REPLAY` tag top-left.

**Controls:** Cross play/pause, left/right scrub, L1/R1 change focus car, Triangle change camera mode (Director, Chase, Bonnet, Free), R2 hold slow motion ×0.25. Mouse: click a car to focus it, drag to orbit in Free, wheel to zoom. HUD hide toggle for a clean view.

**Saving:** keep the last race in memory. `Save` writes a compressed copy (10 Hz, Int16 quantised, base64) to storage, 3 slots, and refuses politely if storage is full. Time trial's best lap is stored the same way as the ghost.

---

## 6. Content

All of this is data in `src/game/data/`. Physics rows for the cars and all track corners are in Appendix B.

### World

The **Halcyon Peninsula**: a fictional stretch of coast, mountains and salt flats with a long, slightly eccentric love of motor cars. People here wash their cars on Sundays and argue about tyre pressures at weddings.

### Marques and cars

| Id | Car | Year | Layout | PS | kg | Price (CR) | Where |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pico | Tsubame Pico 660 | 1991 | FF | 64 | 720 | 4,800 | Used lot |
| kite | Tsubame Kite 1.6 RS | 1996 | FF | 148 | 1,040 | 12,500 | Used lot |
| ginga | Kaminari Ginga S | 1994 | FR | 205 | 1,230 | 14,800 | Used lot |
| moth | Castellan Moth 1.8 | 1998 | FR | 135 | 860 | 24,000 | Dealer |
| ryu | Kaminari Ryu 2.0T | 1999 | 4WD turbo | 280 | 1,340 | 39,000 | Dealer |
| longhorn | Ironwood Longhorn 428 | 1969 | FR | 420 | 1,610 | 47,000 | Dealer |
| brandt32 | Brandt 3.2 CSR | 2000 | FR | 320 | 1,450 | 58,000 | Dealer |
| heck | Brandt Heck 3.6 | 1997 | RR | 360 | 1,380 | 92,000 | Dealer |
| libeccio | Vespucci Libeccio | 1995 | MR | 380 | 1,250 | 135,000 | Dealer |
| kiteCup | Tsubame Kite Cup Racer | 2000 | FF | 210 | 930 | Prize | Featherweight Trophy |
| ryuRally | Kaminari Ryu Rally Spec | 1999 | 4WD turbo | 330 | 1,230 | Prize | Red Clay Rally |
| works | Kaminari Ginga Works GT | 2000 | FR | 560 | 1,180 | Prize, or 310,000 after Licence A | Harbour Lights 200 |
| corsa | Vespucci Libeccio Corsa | 1998 | MR | 620 | 1,100 | Prize, or 520,000 after Licence A | Peninsula Touring Trophy |
| type9 | Halcyon Type 9 Prototype | 2001 | MR | 780 | 930 | Prize only | The Halcyon Grand Prix |

Marque personalities, for text and badges: **Tsubame** (small, clever, swallow badge), **Kaminari** (thunder; serious Japanese-flavoured performance), **Castellan** (English; a shed, a lathe, a principle), **Brandt** (German-flavoured engineering, polite and terrifying), **Ironwood** (American; displacement as a moral position), **Vespucci** (Italian-flavoured; beautiful, a little dramatic), **Halcyon Works** (the Peninsula's own tiny race shop).

Starting credits: **15,000**. All three used cars are affordable, and buying the Kite or Ginga leaves very little: that is the point.

Selling returns 50% of the price. You can't sell your last car, so no save can get stuck. Prize cars can't be sold: "Prize cars are not for sale. It is simply not done."

### Tyres

| Tyre | `tyreMu` | `alphaP` | dirt, gravel factor | Wear × | Price |
| --- | --- | --- | --- | --- | --- |
| Street | 0.95 | 0.14 | 0.45 | 0.8 | 600 (close to stock on Pico and Kite) |
| Sport | 1.00 | 0.125 | 0.50 | 1.0 | 1,200 |
| Semi-slick | 1.12 | 0.115 | 0.42 | 1.4 | 4,800 |
| Racing slick | 1.30 | 0.105 | 0.35 | 2.2 | 12,000 |
| Rally dirt | 0.84 | 0.17 | 0.72 | 1.2 | 2,500 |

Appendix B's car rows are the stock setups: a car keeps its own `tyreMu`, `alphaP` and `tyreTable` until the player buys tyres. `tyreTable` maps `dirt` and `gravel` to the factor; other surfaces use `SURFACES`. Wear × goes in `wearX`.

### Parts

Each one changes numbers in `tunedParams`. "Slider" means a setting becomes available on the Setup tab once bought. Each visible result is listed.

| Category | Part | Effect | Price |
| --- | --- | --- | --- |
| Engine | Sport exhaust | power ×1.04; louder, deeper engine sound and crackle on lift | 900 |
| Engine | Intake and ECU | power ×1.06 | 1,800 |
| Engine | Stage 1, 2, 3 (exclusive) | power ×1.10, ×1.20, ×1.35; `rpmPeak` +0, +200, +400; `redline` and `upshift` +0, +200, +500 | 3,000, 8,000, 20,000 |
| Engine | Turbo kit 1, 2 (exclusive) | Turbo cars: power ×1.15, ×1.35. Others: ×1.25, ×1.50 and `turbo: true`, `turboLag: 0.8`; turbo whistle and blow-off appear | 6,000, 15,000 |
| Weight | Stage 1, 2, 3 (exclusive) | mass ×0.95, ×0.90, ×0.85; `cgH` ×0.99, ×0.98, ×0.96 | 1,500, 4,500, 12,000 |
| Drivetrain | Clutch and flywheel | `shiftTime` 0.11 | 1,200 |
| Drivetrain | Race gearbox | `shiftTime` 0.08; slider: Gearing (`final` ×0.85 to ×1.15, labelled ACCELERATION to TOP SPEED) | 5,000 |
| Drivetrain | Limited-slip diff | slider: LSD (`lsd` 0.2 to 0.8) | 2,500 |
| Suspension | Sport | `loadK` 0.085, `cgH` ×0.96; slider: Balance (`rollF` 0.45 to 0.70, labelled TURNS IN to STABLE) | 2,000 |
| Suspension | Race | `loadK` 0.07, `cgH` ×0.92; sliders: Balance, Ride height (`cgH` a further ×1.00 to ×0.90; below ×0.94 kerbs jolt the body) | 6,000 |
| Brakes | Sport pads | `brakeG` +0.15 | 1,500 |
| Brakes | Race kit | `brakeG` +0.40; slider: Balance (`brakeF` 0.50 to 0.75) | 5,000 |
| Aero | Street kit | `clA` +0.15, `cdA` +0.02; a lip spoiler appears on the model | 2,500 |
| Aero | Big wing | `clA` +0.50, `cdA` +0.06; slider: Downforce (×0.5 to ×1.5); a large wing appears on the model | 6,000 |
| Tyres | see table | | |
| Body | Paint (any of the 16 palette colours) | Model recolours, shown under showroom lights | 500 |
| Body | Rims (4 styles) | Hub colour and spoke pattern change | 300 |

Displayed power and weight come from `tunedParams`. Event limits read those numbers. Engine sound follows `rpmPeak` and exhaust. Show a dyno pull (section 9) on buying any engine part: the before and after curve drawn in the HUD, with the engine sound rising.

### Service Bay

- **Oil change, 250 CR.** Each 40 km after the first 200 km since a change takes 0.5% of power, down to −8%. `c.oil` carries it. A fresh change gives a small bonus of +2% for the first 100 km. The mechanic says so in one line.
- **Car wash, 50 CR.** No performance effect ("It is simply polite."). Mud builds up on dirt (`dirt` 0..1 on the car) and the wash removes it: see section 8.

### Licences

Each test is data: `{ id, title, carId, track, startS, startSpeed, standing, end, limits, assists, medals, brief, tip, demo }`. `limits` says what fails the attempt (off the road, a stop outside the box, recovery). Times run from the first movement, or from the start line for rolling tests. Compute `medals` with `tools/medals.mjs`: run the AI demonstration in the sim at `skill: 0.97`, time T, then gold = T×1.03, silver = T×1.09, bronze = T×1.18, rounded to 0.01 s, and freeze the numbers in the data. A test passes at bronze. A licence is won when all four tests have at least bronze.

`Cn` below is corner index n of that track's list (`tr.cornerS[n]` is its apex).

**Licence C, "Provisional".** Car: Kite (stock, street tyres). Track: Proving Ground. Reward: 2,000 CR. All gold: the Pico as a prize.

| Id | Title | Section | Lesson |
| --- | --- | --- | --- |
| C-1 | Start and Stop | Standing, 400 m along the long straight, stop inside a 30 m white box | The brake is a pedal with a far end |
| C-2 | First Corner | Rolling 60 km/h, C0 −100 m to C1 +100 m | Turn in, apex, unwind |
| C-3 | Cone Weave | Rolling 50 km/h down the straight through 6 cones at 40 m spacing. A hit cone adds 1 s | Weight moves |
| C-4 | The Short Loop | C2 −50 m to C6 +50 m | Link corners, keep your head up |

**Licence B, "Club".** Car: Ginga. Reward: 5,000 CR. All gold: Castellan Moth as a prize.

| Id | Title | Section | Lesson |
| --- | --- | --- | --- |
| B-1 | Threshold | Proving straight, rolling 160 km/h, ABS off, stop inside a box 150 m on. Locking up is allowed and costs time | Squeeze, don't stamp |
| B-2 | Hairpin Exit | Kestrel, C5 −150 m to C7 +60 m. Traction control 0 | Feed the throttle |
| B-3 | Three Layouts | Proving C7 to C10, driven three times in Kite, Ginga, Ryu; times added | FF, FR, 4WD in the same corners |
| B-4 | One Lap of Kestrel | Kestrel, flying lap | Rhythm |

**Licence A, "National".** Reward: 10,000 CR. All gold: 25,000 CR and a gold helmet on the trophy shelf.

| Id | Title | Car | Section | Lesson |
| --- | --- | --- | --- | --- |
| A-1 | Blind Crest | Brandt 3.2 | Cedar, C3 −100 m to C5 +100 m | Trust the road you remember |
| A-2 | Switchbacks | Moth | Cedar, C7 to C10, uphill | Momentum |
| A-3 | Red Clay | Ryu Rally | Red Clay, C7 to C10, dirt | Rotate with the handbrake |
| A-4 | Harbour at Night | Libeccio | Harbour Lights, flying lap, no margin for error | Everything, by lamplight |

After each attempt: medal, time, gap to the next medal, then **Retry**, **Watch your replay**, **Demonstration** (the AI drives it, label `DEMONSTRATION`, examiner's voice over), **Back**. Three failures in a row: the examiner offers the Driving line for this test.

### Events

Points per round: 10, 8, 6, 5, 4, 3, 2, 1. Most points wins the series. Prize money is paid every round to the top four in the ratio 100%, 60%, 40%, 20%. The Bonus and prize car come only from winning the series. Each race advances the day counter.

| Id | Event | Needs | Restriction | Rounds (track, laps) | AI pace | AI pool | 1st prize | Bonus |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dawn | Dawn Patrol Cup | C | ≤210 PS | Kestrel 2; Harbour at dusk 2; Kestrel 3 | .86–.90 | Pico, Kite, Moth | 1,500 | 3,000 |
| fellow | Front-Drive Fellowship | C | FF, ≤230 PS | Cedar 2; Saltline 4 | .88–.91 | Kite, Kite (tuned), Pico (tuned) | 2,000 | 5,000 |
| feather | Featherweight Trophy | B | ≤1,100 kg | Cedar 3; Kestrel 3; Harbour at dusk 3 | .90–.93 | Moth, Kite Cup, Pico (tuned) | 3,000 | 8,000 + Kite Cup Racer |
| society | Rear-Drive Society | B | FR | Kestrel in rain 3; Saltline 5 | .91–.94 | Ginga, Brandt 3.2, Longhorn | 3,500 | 10,000 |
| clay | Red Clay Rally | B | Any; dirt tyres advised | Red Clay, 2 laps, 3 legs against one rival each | .91–.95 | Ryu, Ryu Rally | 4,000 | Ryu Rally Spec |
| touring | Peninsula Touring Trophy | A | ≤520 PS | Cedar 3; Harbour at night 3; Saltline 6; Kestrel 4 | .93–.96 | Brandt 3.2, Heck, Libeccio, Longhorn, Ryu (tuned) | 6,000 | 40,000 + Libeccio Corsa |
| h200 | Harbour Lights 200 | A | Any | Harbour, 10 laps, dusk into night, one stop needed, field of 8 | .92–.95 | Heck, Libeccio, Brandt 3.2 (tuned) | 20,000 | Ginga Works GT |
| gp | The Halcyon Grand Prix | A and Touring or H200 won | Any | Kestrel 5; Cedar 5; Saltline 8; Harbour at night 5 | .96–.99 | Works, Corsa, Libeccio (tuned) | 30,000 | Type 9, ending |

Twenty-two races and twelve tests is about three hours for a new player. The ten-lap endurance needs exactly one stop at default rates: in testing, tyres fall to zero by lap 9 and the tank empties on lap 9 or 10, and lap time drifts from 117 s to 135 s. Short races use `wearRate` ×0.5.

**Winning the GP:** a podium scene, the Type 9 reveal, then the credits, then the ending card, in the catalogue voice: "You may keep driving. Most people do."

### Arcade

The Arcade Gate on the map skips the career: **Quick Race** (any track, any car, laps, field size, Easy .85 / Normal .92 / Hard .98, hour, rain), **Time Trial** (any track and car, ghost of your best), **Couch Duel** (section 14). Every car and track is open here from the first minute, so someone trying the demo can see everything quickly. It pays no credits.

### Home Garage and Museum

**Home Garage:** your cars on a turntable with mileage, oil, wear and setup; choose your ride; sell; a trophy shelf with a 3D cup or medal for every win; your stats (days, km, wins, gold medals, % collected).

**Museum:** all 14 cars with their brochure text and silhouette (unowned cars show as a dark silhouette until seen in a race), plus a page per track: map, length, corners, records.

---

## 7. Screens and controls

### 10-foot rules

- Art space is 480×270 (height stays 270; width follows the window, so lay out from anchors and check 360, 480 and 640 wide). One art pixel is 4 screen pixels at 1080p. Body text is the HUD font at scale 1 (28 px tall on a TV, the floor). Titles are scale 2 or 3. Never smaller.
- **One idea per screen.** At most 7 focusable items on a screen, at most 6 numbers in a spec panel, at most 4 lines of prose, at most 60 characters a line. If a screen needs more, make it paged or tabbed. No tables wider than a few columns, no scrolling walls.
- Focus is a thick animated box that slides to the next item with a tick sound. There is always exactly one focused thing.
- Every screen has a prompt row along the bottom showing what the buttons do right now. Same screens for every input. Back is always there.
- Menus move with the left stick or D-pad, with repeat; L1/R1 change tab. Keyboard: arrows or WASD, Enter, Esc, Q/E or Tab for tabs. Mouse: hover moves focus, left click confirms, right click goes back, wheel scrolls or nudges sliders, drag rotates cars in showrooms. Hide the cursor after 2 s idle and during races.

### Prompts and glyphs

`src/game/ui/glyphs.js` draws glyphs as `hud.sprite` rows, about 11×11 art pixels. PlayStation set: ✕ ○ □ △, L1 R1 L2 R2, Options, sticks, D-pad. Xbox set (Settings: Button glyphs): A B X Y, LB RB LT RT, Menu. Keyboard: keycap sprites with the key name. Mouse: left, right, wheel icons. `prompt(action, label)` picks by the last device used and redraws the moment the player switches. Default glyphs: PlayStation.

### Controls

| Action | DualSense | Keyboard | Mouse |
| --- | --- | --- | --- |
| Steer | Left stick | A/D or ←/→ | Optional mouse steering (Settings) |
| Throttle | R2 (analog) | W or ↑ | Left button with mouse steering |
| Brake, reverse | L2 (analog) | S or ↓ | Right button with mouse steering |
| Handbrake | □ | Space | |
| Shift up, down | R1, L1 | E, Q (also Left Shift, Left Ctrl) | |
| Camera | △ (tap) | C | |
| Look back | ○ (hold) | B (hold) | |
| Look around | Right stick | | Right drag |
| Recover | △ (hold 1 s) when off the road or stopped | R (hold 1 s) | |
| Pause | Options | Esc | |
| Confirm, back | ✕, ○ | Enter, Esc or Backspace | Left click, right click |

Add `Tab`, `F` keys and arrows to `input.preventKeys` as needed. While Create is held, ignore Options: Create + Options belongs to the hub. Vibration: `gamepad.vibrationActuator?.playEffect('dual-rumble', ...)` on kerbs, impacts, lock-ups and gear shifts, guarded, with a Settings toggle.

### Flow

```
Title → (Continue | New Game) → Map
Map → Licence Centre | Event Hall | Dealer Row | Tuning Street | Service Bay | Home Garage | Museum | Theatre | Arcade Gate | Settings | About
Event → round card → race → results → (replay) → next round → podium / prize
Pause (Options/Esc): Resume, Restart, Retire, Assists, Settings, Handbook, Dev Mode
```

### Screens

| Screen | What it is |
| --- | --- |
| **Title** | The diorama at dusk, the title in pixel letters over it, a car driving past. `PRESS START`-style prompt for the last device. Continue, New Game, Settings, About. 10 s idle starts attract mode |
| **Map** | The peninsula diorama (section 8). Nine buildings. Stick or hover moves between them (the mouse picks with `camera.rayAt` and a ray-to-sphere test per building, and a click goes in), the camera glides, a card names the place with one line of text. A status strip: credits, day, licence, current car. A one-line nudge says what to try next |
| **Licence Centre** | The tower on the proving ground. Three licence cards, then four test tiles with medal icons. Test card: title, car, target times, the examiner's brief spoken in gibberish with subtitles |
| **Event Hall** | Event cards by licence tier, locked ones dimmed with the reason. Event card: restriction, rounds with mini-maps, prize. Warns if the current car doesn't qualify |
| **Dealer Row** | Used lot and three dealer showrooms. Turntable under lamps, slow orbit, attendant's voice. Card: name, year, layout, PS, kg, price, then the brochure lines on △. ✕ Buy, □ Test drive (one lap of Proving Ground), L1/R1 next showroom, left/right next car |
| **Tuning Street** | Eight tiles, four to a page: Engine, Weight, Drivetrain, Suspension, Brakes, Aero, Tyres, Body. In a tile, up to 5 parts, each with an effect in plain words and a before/after number. Setup tab: sliders for what you own, one line saying what each does. □ Test drive. A mechanic in the bay works and comments |
| **Service Bay** | Oil change and car wash, with short animations. Mechanic line |
| **Home Garage** | As in section 6 |
| **Museum** | As in section 6 |
| **Theatre** | Last race, saved replays, slots |
| **Arcade Gate** | Quick Race, Time Trial, Couch Duel as big tiles, then two or three simple picker screens, never one dense form |
| **Race HUD** | Top-left: position `P3/8` (scale 2), lap. Top-right: time, best lap, gap to next car. Bottom-right: speed (scale 3) and gear (scale 3) with a segmented rev bar and shift light. Bottom-left: mini-map dots (track polyline, cars in colour), tyre wear as four coloured squares, fuel bar when it matters, ABS/TCS/STB flashes when they act. Flags and messages centre-top. Keep the middle clear. Couch Duel uses a compact version for 240 wide |
| **Results** | One large table of at most 8 rows, then prize money counting up with a soft register sound, then points. Continue, Retry, Watch Replay, Save Replay |
| **Handbook** | Pages, one topic each: controls for your device, what you can and cannot do, assists, tyres and wear, pit stops, tuning in plain words, rally, medals. Reachable from pause and from the Map |
| **Settings** | Tabs. **Sound:** Master, Effects, Music (default 10%), Voices. **Picture:** Pixel size (fine or chunky), Look (native, plus `playstation`, `arcade`, `vhs_rental`, `no_filters`), Quality, Frame cap, Fullscreen. **Controls:** Button glyphs (PlayStation or Xbox), Vibration, Steering response, Mouse steering, Units (km/h or mph). **Assists:** defaults. Reset to defaults. About |

### Touch-only devices

At boot, if `matchMedia('(any-pointer: fine)')` is false and `(pointer: coarse)` is true, and no pad is connected and no key has been pressed, the title shows **CONTROLLER OR KEYBOARD REQUIRED** and a gear button. A tap on the gear opens Settings, which accept taps on every item (tap = hover + confirm; a Back button appears). No on-screen controls, ever (`touch: false`). After 10 s attract mode runs; a tap returns to this screen. A key press or a connected pad lifts the gate at once.

### Browsers without WebGPU

The engine reports `Failed to start`. Catch it and show a plain line: this game needs WebGPU (a recent Chrome or Edge, Safari 26, or Firefox 141 on Windows). In a hub session also call `AIHub.fail(message)`.

---

## 8. Art

**Base:** the engine's native look: 3D low-poly, toon materials, the 16-colour palette (`ink plum red orange sand lime green teal navy blue sky cyan white mist slate night`), pixel outlines, 480×270 (`LOOK_PRESETS.none`). Tag cars and people with `setLookLayer(obj, 'actors')`. Build the race world from your own models and geometry; use the library for generic props (`oak`, `pine`, `birch`, `snowy-pine`, `boulders`, `rock`, `cactus`, `lamp-post`, `fence`, `crate`, `barrel`, `haystack`, `signpost`, `bench`). Packs aren't needed; if you use one, inline it as `__PIXEL_ASSETS__` data.

### Cars

Use the car kit (C2): a side-profile slab for the body, a narrower slab for the glass, a roof slab, sill, lamps, then per-car extras. Make the tail distinct on every car, because that's what the player sees: lamp shape and placement, spoiler, exhausts, width. Add:

- **Wheels** as separate meshes: a steer pivot, then a spin group, tyre plus hub, with a visible spoke bar. Wheel positions from each car's own wheelbase and track.
- **Body motion** in a parent Group: pitch from `c.ax`, roll from `c.ay`, heave from `c.vy`; wheels stay on the road. This is the single best thing you can do for feel.
- **Lamps:** tail lamps `glow` in `orange`, and separate brake-lamp meshes in `red`, bright, visible only under braking. Headlights `glow` `sand`, on at dusk and night, with a `ctx.lights` request 12 m ahead for the player's car and a small red one behind.
- **Parts on the model:** lip spoiler, big wing, wheel styles and paint come from the install. Rally cars get mud flaps and a roof vent.
- **Mud:** a slightly larger shell of the lower body in `orange`, `toonMaterial(c, { dissolve: true })`, its `dissolve` tied to `1 − dirt`. The car wash tweens it back so the mud dissolves pixel by pixel.
- **Ghost:** the model with every mesh's material swapped for one clone of `toonMaterial(seatColour, { dissolve: true })`, `dissolve = 0.35`, no shadow, with a name tag above it in HUD text.

### Tracks

`src/game/render/trackmesh.js` builds from the `tr` record:

- **Road:** quads per sample. Two close shades of the surface colour in alternating 8 m bands (the classic speed cue). Darker rubber on the racing line in braking zones (a shade darker where `speeds` falls). Edge lines, centre dashes on the pit straight, a start grid and a chequered start line. Kerbs alternate `red` and `white` every 4 m on the inside of corners (where `|kappa|` is high), about 1.6 m wide, slightly raised. Hard colour edges need unshared vertices.
- **Skirts:** ribbons from the road edge outward, 4 to 6 columns a side, out to 60–120 m. Height comes down from road level to a flat ground plane below the track's lowest point, plus noise, giving embankments and hills. Shorten a skirt where another part of the circuit is close (a coarse 20 m distance check at build time). Terrain colours in bands and blotches.
- **Barriers** at `±(width/2 + wallL/R)`: armco, tyre stacks, concrete, or catch fence per track, with `red`/`white` paint where the corner is hard.
- **Braking boards** at 300, 200, 100 m before major corners.
- **Skid marks:** a ring buffer of dark quads laid where `c.sliding || c.locked`.
- **Merging:** `mergeStaticMeshes` for the static world, as the guide says. Beyond that, performance is out of scope, so dress generously: crowds, flags, props, lights.

### Track dressing

Each has its own look and landmark. Build them from primitives and the library. These are the dressing lists:

| Track | Hour | Look | Landmarks and props |
| --- | --- | --- | --- |
| **Kestrel Park** | 15:00 | Rolling English-style parkland, deep green, white fences | Grandstand and pit building on the straight, a windmill on the hill, oaks, hay bales, marshal posts with cloth flags, a tiny church. Kestrel bird flock (`Boids`) |
| **Cedar Ridge** | 10:00 | Mountain forest, thin mist particles | Pines by the thousand, rock cuts, a tunnel on the rise after C6 (box arch with lamps; darkens the sky while inside), a red steel viaduct overhead, a waterfall (`WaterSurface` plus particles), a hut and hikers |
| **Harbour Lights** | 21:00, or dusk 18:30 | Night city on the water, walls close | City blocks with lit windows (vertex colours and `glow`), neon signs in the game's own invented words, cranes and stacked containers, water along the front straight (`WaterSurface`), a Ferris wheel turning in the distance, street lamps with baked pools on the road, fireworks when the race is won |
| **Saltline Speedbowl** | 18:30 | Endless white salt at sunset | A huge banked bowl, tall grandstand, a flag tower, a blimp circling, flat mesas on the horizon. Dust devils at distance |
| **Red Clay Stage** | 17:00 | Orange canyon, low sun | Canyon walls (tall skirts), cacti, a rusted water tower, wooden spectator stands, arrows and warning boards before crests, dust trails that hang in the air |
| **Proving Ground** | 11:00 | An old airfield | Control tower (Licence Centre), hangars, painted boxes, cones, a windsock (`clothGrid`), the examiner's van |

### Sky and night

`applySky` gives a flat background, sun and ambient. Add depth: a far ring of silhouettes at 2 to 3 km per track (hills, mesas, skyline) in two or three flat palette colours, a sun or moon disc, a few chunky clouds. For night, raise `engine.ambient.intensity` until the road reads, then let baked lamp pools, `glow` windows and the headlight do the work. Raw `skyAt(21)` with no lights is close to black.

### Diorama

The Map is a chunky island about 60×40 m, with a small road loop and tiny cars (the car models at 0.25 scale) driving around it. Buildings: Licence Centre (tower), Event Hall (mini grandstand), Dealer Row (three glass showrooms), Tuning Street (garage with sparks), Service Bay (spinning brushes), Home Garage (house with a roll-up door), Museum (columns), Theatre (marquee with lights), Arcade Gate (neon arch). Boats, gulls, clouds. **The sky slowly moves with your progress:** morning at the start, dusk by the National licence, night lights for the Grand Prix. Show the current car parked at Home.

### Particles

Register in code, sizes whole art pixels, palette colours: tyre smoke (`mist`), dust (`sand`, `orange`), gravel spray, sparks (`sand`, `orange`), rain spray, exhaust pop (`orange`, `sand`), car-wash foam, confetti, fireworks. Taillight `Trail`s at night.

### Screen flow

Transitions with `engine.screen.cover('wipe' or 'blinds')` and `reveal`. `engine.screen.flash` on the green light. `engine.hitstop(0.05)` on a very hard wall hit only.

---

## 9. Animation

**Base:** the engine's rig, `HERO_MODEL`, `HERO_RIG`, `ClipDef`, `compileClips`, and procedural tools (`Timeline`, `tweens`, `Squash`, `clothGrid`). Existing hero clips include `Idle`, `IdleLook`, `Walk`, `Run`, `Wave`, `Sit`, `SideFlip`. Recolour the hero by swapping mesh materials by name for overalls and race suits. Check new clips with `analyzeClip`.

**New clips to author as `ClipDef` data:**

- `PitJack`: crouch and pump a jack lever.
- `PitWheelGun`: kneel, gun to the hub, pull a wheel, fit a wheel, stand.
- `PitFuel`: hold a fuel hose to the flank.
- `MarshalFlag`: wave a flag overhead (`Wave` upper body, with the flag mesh parented to the hand).
- `ExaminerClipboard`: note something, look up, nod.
- `DealerPresent`: an open-handed sweep toward the car.
- `MechanicWipe`: wipe hands on a rag, look at the car.
- `PodiumCheer`: arms up, small jump; `PodiumBow`: a formal bow.
- `CrowdCheer`: a looping bob for instanced stand-ins.

**Procedural and mechanical motion:**

- Car body pitch, roll, heave; wheels steer and spin; engine shake at idle and on the limiter; exhaust pop.
- Turntable and slow orbit camera; a car sinking on its springs when "bought".
- **Dyno:** the car on rollers, wheels spinning, curve drawn live, exhaust shake.
- **Pit stop:** the crew runs in, jack lifts the car 0.15 m with a tween, wheels swap, crew runs off.
- **Car wash:** spinning brushes that travel the car, foam particles, mud dissolving.
- Start gantry lights, flags as `clothGrid`, the windsock, the windmill, the Ferris wheel, the blimp.
- **Podium:** a `Timeline` scene (shots, cues, subtitles), confetti, the winner's car rolling in.
- **Prize reveal:** dark set, one lamp comes on, then another, the car under a cover that slides away with a `Timeline`, fanfare, voice line.

---

## 10. Audio

Everything is code. No audio files. All sound goes through one mix module.

**Music volume defaults to 10%** on first launch and in every hub round (engine fact 3). Test it. The Settings slider moves in 5% steps. Engine, tyres and effects sit well above it.

### Engine sound (the most important sound in the game)

`src/game/audio/enginesynth.js` is a Web Audio graph built on any `BaseAudioContext`, so a test can render it offline:

- Firing frequency `f0 = rpm / 60 × cylinders / 2`. Saw at `f0`, square at `f0 / 2`, triangle at `2 × f0`, filtered noise for exhaust, through a low-pass whose cutoff rises with throttle and rpm.
- Gain `0.35 + 0.65 × throttle`. Rev-limiter stutter at redline. Overrun crackle on lift with the sport exhaust.
- Per-car data: cylinders (3 for the Pico, 4, 6, V8 for the Longhorn, V10 for the Corsa, V12 for the Type 9), filter character, exhaust loudness.
- Turbo cars: a sine whistle rising with `spool`, and a filtered noise puff on lift.
- Connect to `audio.context.destination` once `audio.unlocked`, scaled by `audio.volume.master × sfx` every frame, respecting `muted`. Node has no context: guard it, and let tests read the synth's last rpm and throttle.

### Other cars and the world

Other cars: up to 3 nearest get `ctx.audio.loop` voices with `spatialize` and `pitch` from rpm. Also: tyre squeal (band-limited noise, gain from `use` and `sliding`), gravel and dirt rumble, kerb rumble (a square buzz at a rate from speed), wind (noise, gain from speed²), gear clunk, wall and car thumps (`layers`), brake lock chirp, handbrake ratchet, crowd swell near stands, rain, the pit crew's wheel gun, the lap chime, start lights beeps, and the final flag.

**Menu sounds:** tick (focus), confirm, back, denied, the cash register for money, a soft camera whirr in showrooms.

### Music

Eight original pieces as `Song` data (`bpm`, `tracks`, `patterns`, `order`), `square`, `triangle`, `saw`, `sine`, `noise` only. Write new melodies; never imitate the source's music. Style: warm, jazzy, unhurried in menus; propulsive in races. Use seventh and ninth chords in arpeggios or comping, syncopation, a walking bass, brushed noise drums.

| Piece | Where | Feel | BPM | Key and harmony |
| --- | --- | --- | --- | --- |
| Lounge | Title, Map | Bossa lounge, soft sine lead | 92 | D♭: ii7–V7–Imaj7–vi7 with a turnaround |
| Catalogue | Dealer Row, Museum | Vibraphone-like (sine, vibrato), very slow | 76 | Fmaj7–Em7–Dm7–G7 |
| Socket Set | Tuning, Service | Light funk, muted square | 108 | A minor pentatonic over Am7–D9 |
| Examination | Licence Centre | Sparse, metronomic, polite | 120 | C: bass pulse, three-note motif |
| Apex | Day races | Driving chiptune rock | 156 | E minor: i–VI–III–VII, a lead hook |
| City Lights | Night races | City-pop groove | 118 | B♭: Imaj7–iii7–vi7–IV |
| Red Clay | Rally | Twangy, galloping | 132 | G mixolydian |
| The Long Drive | Replay, credits | Calm arpeggios that open out | 84 | D: Imaj7–V/vi–vi7–IVmaj7 |

Plus a short fanfare for medals and wins. Races start with music on by default, and there's a Settings option to drive with no music.

### Voices

Animalese-style gibberish, written in code. `src/game/audio/voice.js`, `say(text, speaker)`: each letter of the text becomes a syllable of 65 to 85 ms, vowels pick formants through two band-pass filters over a saw (a 800/1150, e 400/2000, i 300/2400, o 450/800, u 325/700 Hz), consonants add a 12 ms noise click, the base pitch comes from the speaker, the sentence end falls, and `?` rises. A Voices slider in Settings. Subtitles always show the line in full. The same words always make the same sound, so characters seem to really be saying it.

| Speaker | Pitch | Manner |
| --- | --- | --- |
| Ms. Arai, chief examiner | 210 Hz | Even, unhurried |
| Benno, mechanic | 130 Hz, square | Gravelly, short |
| Mr. Fenn, dealer | 180 Hz | A little lilt at line ends |
| Dell, race commentator | 160 Hz, faster | Excited, on replays and results |

---

## 11. Writing and cast

**Voice.** The source's writing is a catalogue written by people in love with the subject: sincere, exact, formally polite, a touch translated, and funny only by being deadpan. Numbers appear with respect. Sentences are short. Nothing is "awesome". Nobody calls the player a champion. A car is never "sick". Keep to that here. All on-screen text is uppercase in the HUD font, so write it to be read that way.

**Cast.** Only these four, each with a few lines per location. **Ms. Arai** at the Licence Centre has examined everyone on the Peninsula, and has never raised her voice. **Benno** at Tuning Street and the Service Bay and in the pits believes every car is one oil change from happiness. **Mr. Fenn** at Dealer Row can recite every car's kerb weight and still gets emotional. **Dell** does commentary: gibberish over replays, with subtitles of plain facts. They appear as the hero model, recoloured, in their set. No plot. The story is your car.

### Brochure text

| Car | Text |
| --- | --- |
| Pico | A city car of 660 cc, made to fit where other cars can only wish to go. At 720 kg it has little to hold back and little to push. It teaches the first lesson: momentum is expensive. |
| Kite | The Kite was a family hatchback until the engineers stayed late. The 1.6-litre engine asks to be revved, and the front tyres do all of the work. Brake before the corner and it will thank you. |
| Ginga | A front-engined, rear-drive coupe in good used condition. The steering speaks clearly and the rear axle answers the right foot. Many drivers learned to drive in this car. Some learned twice. |
| Moth | Two seats, one purpose, 860 kg. Castellan removed what the car did not need, then removed a little more. The power figure is modest. That is not the figure that matters. |
| Ryu | Turbocharged, four-wheel drive, born for a rally rule that no longer exists. Power arrives late and then all at once. In the rain, very little can keep it in sight. |
| Longhorn | A large American coupe of the old school: seven litres, 420 PS, and brakes that remember a simpler time. It does not like corners, and it says so. On a long straight nobody asks it to apologise. |
| Brandt 3.2 | A four-door sedan, according to the catalogue. The straight six reaches 7,900 rpm with an even temper, and the balance is close to 50:50. Businessmen bought it for the leather. Others did not. |
| Heck | The engine sits behind the rear axle, where Brandt has insisted for forty years that it belongs. Traction is wonderful. Lifting in mid-corner is not recommended. This is written in the manual. |
| Libeccio | Named for the south-west wind. A mid-engined V8 with a low nose and a high opinion of itself. Light on the front wheels at speed. Precise, if you are. |
| Kite Cup | A stripped Kite for a one-make series, with a roll cage where the rear seats used to be. 210 PS through the front wheels asks for a patient foot. |
| Ryu Rally | Works gravel specification: long travel, short gearing, and a bonnet that has seen weather. On dirt it is another species. On tarmac it seems to be looking for the exit. |
| Works GT | The Ginga as the factory would like to remember it. 560 PS, carbon panels, and a wing with its own opinion about corner speed. |
| Corsa | Homologated in the strictest sense of the word: Vespucci built twenty-five road cars so that it could race this one. 620 PS. 1,100 kg. Do not lift. |
| Type 9 | Built by a small works team on the Peninsula, in a shed, for one race. 780 PS, 930 kg, a closed cockpit and no radio. It stops as well as it goes, which takes some time to believe. |

### Lines to set the tone

- **Ms. Arai, first meeting:** "Welcome to the Peninsula. A licence is not difficult to obtain. It is only difficult to deserve."
- **Ms. Arai, C-1 brief:** "Accelerate to the marker, then bring the car to rest inside the white box. Please remember: the brake is also a steering wheel."
- **Ms. Arai, fail:** "The box has not moved. Please try again."
- **Ms. Arai, gold:** "Thank you. That was correct."
- **Mr. Fenn, on the Kite:** "A previous owner. One careful weekend. She has 88,000 kilometres and no regrets."
- **Benno, oil:** "Your oil is tired. It has seen things. Two hundred and fifty credits."
- **Benno, new wing:** "You now have more downforce. You also have more drag. There is no third thing."
- **Dell on the results card:** "Lap record at Kestrel Park. One minute, fifty-one. The windmill did not turn to look."
- **Loading tips:** "BRAKE IN A STRAIGHT LINE. A TYRE HAS ONLY SO MUCH GRIP TO SHARE." "SLOW IN, FAST OUT. THIS HAS BEEN TRUE FOR SOME TIME." "A WASHED CAR IS NOT FASTER. IT IS SIMPLY POLITE."
- **Map blurbs:** Licence Centre, "EVERY DRIVER BEGINS WITH A CLIPBOARD." Dealer Row, "THREE SHOWROOMS AND A USED LOT. BRING MONEY." Tuning Street, "WHAT YOU BUY HERE YOU WILL FEEL." Service Bay, "OIL AND SOAP." Home Garage, "EVERYTHING YOU HAVE EARNED." Event Hall, "THE ROAD BETWEEN YOU AND THE GRAND PRIX." Museum, "CARS YOU HAVE MET." Theatre, "WATCH IT AGAIN, MORE SLOWLY." Arcade Gate, "NO LICENCE REQUIRED. NO MONEY EITHER."

Write the rest in this voice: all test briefs and tips, event introductions, and part descriptions in one plain line each.

---

## 12. Attract mode

After **10 s without input** on the title or the Map, start `src/game/attract/director.js`. Any input (key, click, pad, tap) stops it at once and returns to where the player was. It never runs in a hub session. It may cheat freely. It loops:

| # | Clip | Shows | Seconds |
| --- | --- | --- | --- |
| 1 | Title card, `DEMO`, music | Identity | 3 |
| 2 | Showroom: three cars on the turntable, brochure text, Mr. Fenn | Cars, catalogue voice | 10 |
| 3 | Tuning: dyno pull with before and after curve, new wing appears | Tuning | 8 |
| 4 | Licence B-1 demonstration, medal awarded | Licences | 10 |
| 5 | Kestrel Park: AI race, starts in chase, cuts to TV cameras, a pass | Racing, replay cameras | 20 |
| 6 | Red Clay: the Ryu over a crest, dust, a handbrake hairpin | Rally | 12 |
| 7 | Harbour Lights at night, then a pit stop with the crew | Night, endurance | 20 |
| 8 | Saltline: slipstream at 300 km/h past the blimp | Speed | 10 |
| 9 | Podium, prize car reveal | Rewards | 8 |
| 10 | Credits card: `PRESS ANY BUTTON` | Call to action | 4 |

Each race clip is a real `RaceScene` with AI on every car, `env` god settings, and hard cuts to skip dull parts. Since the player's profile isn't touched, nothing here can change the save. On a touch-only device it runs the same way.

---

## 13. Dev mode

`DEV MODE` is an ordinary item in the pause menu (hidden only in a hub session), also opened from the Map's pause and with `?dev=1`. It's a pad-friendly panel over the running game, 10-foot like the rest, in tabs.

**Live sliders** (left/right changes it at once, ✕ resets one, △ resets all, mouse drags). They write to the sim's `env` or the rules:

| Slider | Default | Range | Sim hook |
| --- | --- | --- | --- |
| Grip | 1 | 0.5–1.5 | `env.gripScale` |
| Power | 1 | 0.5–2 | `env.powerScale` |
| Brake strength | 1 | 0.5–1.5 | `env.brakeScale` |
| Downforce | 1 | 0–2 | scales `clA` |
| Tyre wear | 1 | 0–5 | `env.wearRate` |
| Fuel use | 1 | 0–5 | `env.fuelRate` |
| Steering rate | 3 | 1–8 | `inp.steerRate` |
| Stability strength | 1 | 0–2 | scales `asm` |
| Traction strength | 1 | 0–2 | scales `tcs` |
| AI pace | event | 0.7–1.05 | `skill` |
| AI rubber band | 0 | 0–0.03 | adds to `skill` by gap |
| Wall speed loss | 1 | 0–2 | scales the barrier's `keep` |
| Slipstream | 0.65 | 0.4–1 | `dragScale` |
| Prize money | 1 | 0–5 | career |
| Chase distance, FOV | 8.5, 58 | 4–14, 40–90 | camera |

**Tools:**

- Teleport along the track (scrub `s`), finish now in position N, end race, restart, reset car.
- Time scale 0.25, 0.5, 1, 2, 4. Pause and frame step. Save state and load state (sim JSON).
- God mode (no wall loss, no wear, no fuel use).
- Free camera; engine debug panel (`engine.showDebug`).
- Overlays: racing line and speed profile, wheel load and slip bars, surface tint, collision circles, AI targets and lanes, telemetry strip (speed, throttle, brake, ax, ay).
- Give credits; unlock all cars; pass all tests with gold; win the current event; jump to any event, test or menu set; reset the save.
- Hour of day, rain toggle, field size, change car on the spot, start attract now.

Sliders persist for the session and are cleared by Reset. Medals and records earned with sliders off default aren't saved, and the HUD shows a small `DEV` tag so a tester knows.

---

## 14. Multiplayer

The brief points to the AI Hub session protocol, in the hub repository's `lib/hub/README.md`. Read it whole. Two things to build:

### In a session: ghost mode

Why ghost and not shared world: every copy runs its own physics at 240 Hz with no input lag. A shared world through a host, at up to 20 messages a second with 150 ms of latency each way, would make a precise driving game feel wrong. Ghost also needs no host, so it survives anyone leaving.

**Tags,** in `<head>`, after the client:

```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="4">
<meta name="hub:session-goal" content="Lowest time wins: same car, same track">
<meta name="hub:session-howto" content="Steer stick or A D. R2 or W go. L2 or S brake.">
<meta name="hub:webgpu" content="required">
```

The hub's examples also carry `hub:type` and `hub:players`: use `Game`, and `1-2` for players on one device. Your exit interview's players field is `1–4`, counting sessions.

**A round:**

- When `AIHub.active`: no title, no menus, no attract, no Dev mode, no saves. Await `connect` before anything else, then `Engine.start` a `RaceScene` with `seed: info.seed`. If `connect` returns `null`, play as on its own.
- `AIHub.rng('round')` picks the same round on every copy: track and car from a fixed list, tuned to about 4 minutes: Kestrel 2 laps, Cedar 2, Harbour 2, Saltline 4; cars Ginga, Ryu, Brandt 3.2, Kite. All get the same stock setup and default assists. Hour and rain also come from the same rng.
- **Own card** (`card: true`), so the round opens in the game's world: the cars lined up at the start, each seat's colour shown, the track map, how to win, the controls for the last-used device, the countdown from the `card` event. Enter or ✕ answers Ready; △ or M answers More time (also on-screen buttons for mouse and tap). It has no other choices. Use `AIHub.rng('card')` for anything random in it. Read Enter from a `window` `keydown` listener (engine fact 7; tested).
- Call `AIHub.ready()` as soon as the scene is built, with no key press. The harness waits 20 s for this, so build only this round's track. Keep the build fast and don't load extras in a session.
- **Start:** on `start`, three red lights with `AIHub.time()` at −3, −2, −1, green at 0. Controls lock until then. Standing start, no AI cars.
- **While racing:** at 10 Hz, `AIHub.send({ t: 'g', a: trackId, x, y, z, yaw, v, s, lap, steer, br }, { reliable: false })`, values rounded to keep it small. Draw others as ghost cars, interpolated through a 150 ms buffer, in seat colours with name tags. They never collide or affect anything. `AIHub.progress({ score: totalMetres, label: 'LAP 1/2 P2' })` on the same tick.
- **Finish:** `AIHub.result({ time: Math.round(AIHub.time()), stats: { 'Best lap': seconds, 'Top km/h': n, 'Walls': n }, awards: [...] })` once. `AIHub.send({ t: 'done', time })` reliable. Then an AI drives your car while you wait, and your camera can follow another ghost.
- **`time-up`:** if not finished, `AIHub.result({ score: totalMetres, stats })` at once.
- **`leave`:** remove that ghost. **`end`:** stop input and all sound including `enginesynth`; the hub shows results over the game.
- **Menu:** Options or Esc opens settings over the running race (Sound, Button glyphs, Handbook). It never pauses and offers no quit or restart. Ignore Options while Create is held.
- **Rules:** no `alert`, `confirm`, `prompt`, `window.open`, no navigation, no other network, no chat. Names only in HUD text, with the `P1` fallback.
- If the device is touch-only: show the required-input message, still call `ready()`, and on `time-up` report `score: 0`. A connected pad or key lifts it, as usual.

### On its own

Your brief's phrase "as well as for the game on its own" is read two ways, and this plan satisfies both. **First**, the game runs fully outside a session: `AIHub.active` false means none of the session rules apply and no network is used. **Second**, multiplayer also exists without the hub, on one screen:

**Couch Duel** (Arcade Gate): two players, one TV, split screen, any track and car, with optional AI cars and real contact. Implementation (the two-engine pattern with a shared plain-JS state is tested): `src/game/net/couch.js` makes the page two side-by-side containers and starts a second engine in the second. One `RaceSim` is shared: P1's `RaceScene.fixedUpdate` steps it, P2's only draws it. P2's engine has `settings: { button: false, key: false }`, `audio.persist = false`, muted; one mix plays both cars' engines, panned left and right. Pads are read raw, so P1 is pad 0, P2 is pad 1; with one pad, the pad is P1 and the keyboard is P2; with none, P1 is WASD and P2 is arrows, with Enter and Space remapped. Each side has its own compact HUD. On leaving, `engine2.dispose()`, hide the second container, restore the first to full width.

**Also:** Time Trial's ghost can be raced in turn by whoever holds the pad ("Pass the pad", best time wins), using the same ghost view.

---

## 15. About, credits and the exit interview

The brief says exactly what this must contain. Build it once, as data, then show it two ways:

1. Fill in the exit-interview file the brief names, in the exact shape the brief gives, and check it parses.
2. `tools/build.mjs` reads that file and embeds it, so the in-game **About/Credits** screen and your final chat reply can't drift apart.

**The About screen** is paged for the TV, reached from Title, Map and Settings:

- **Source Information:** date, source, plan (this plan's file name), genre and perspective, tech, art direction, animation, audio, online, testing, research, environment, model, usage (`added on import`, exactly as the brief says). "unknown" for anything you can't confirm.
- **Testing Feedback, Engine Feedback, Prompt Feedback:** each question from the brief, with your answer. Answer honestly from what really happened, at the end of the work.
- **Credits:** the game's title and maker line; "Inspired by" the source; Pixel Engine with version; three.js r186 (MIT) and Rapier (Apache-2.0) and the Sweetie 16 palette by GrafxKid, from the kit's `CREDITS.md`, which also says what it asks you to ship: embed its text on a scrollable page.

Paginate long answers. Never use a dense wall: it's still a TV.

Use the same answers in your final chat reply, as the brief requires. Don't estimate usage; write what the brief says to write.

**The `aiHub` block:** type `Game`, genre `Racing`, source and series for the source named in your brief, players `1–4`, controls in one line (`Stick or WASD to steer, R2 or W to go, L2 or S to brake`), and tags such as `3d`, `pixel art`, `vehicles`, `retro`, `third-person`, `versus`. The name is your title. Write the tagline and description yourself, in the catalogue voice.

**Research:** the director's research on the kit, the hub protocol and the source is folded into this plan. You don't need web research unless you want it. In Source Information, report what you yourself did.

---

## 16. Testing

The brief's rules: one command that prints only failures and a one-line count; rerun only after changing what it covers; screenshots only for what a script can't check; no subagents or workflows to debate, review, judge or audit.

Write `node tools/test.mjs [suite...]`. Suites cache by file hash, so an unchanged suite is skipped. Output: failures, then `tests: 212 passed, 0 failed`.

| Suite | Runs in | Covers |
| --- | --- | --- |
| `sim` | Node, seconds | The regression table in Appendix B ±3 s; 0–100; each car laps each track; determinism (same inputs, same hash); reverse, manual gears, airborne; contact doesn't explode; wear and fuel over ten laps |
| `data` | Node | Every id resolves; every event winnable with a car that's obtainable by then; every test has medals; all text fits the 60-character line and 4-line card |
| `career` | Node | Money, licences, unlocks, prizes, oil, days; a save survives a version migration |
| `headless` | Node, `Engine.headless` | Menu flows by actions: new game, buy car, test, tune, race, results, save. `engine.replay` ends on the same `fingerprint`. Use `check.mjs --headless` too. Music at 0.1 on a fresh profile; Reset sets it back |
| `play` | Node, `Engine.headless` | **The whole game by script:** a bot presses real actions through real screens: buys the Kite, passes licences, wins events (driving through the input layer, using `aiDrive` as its brain with `skill` 1.0), tunes, buys, pits, reaches the Grand Prix, sees the ending. Dev tools off. It reports money at each step, and fails if the game can't be finished without cheating |
| `browser` | Playwright, the built HTML from `file://` | Boots with no console errors. Pad stub (`add_init_script` replacing `navigator.getGamepads`, standard mapping) drives every top-level screen. Prompts swap on input change; Xbox glyphs setting. Mouse hover moves focus, click confirms. Attract starts at 10 s, any input exits. Dev mode sliders change `env`, Reset restores. Touch-only profile (Chromium with `has_touch`, `is_mobile`) shows the gate, the settings tap works, and attract runs. Couch Duel with two pad stubs: two engines up, then disposed, no errors. About shows every field |
| `audio` | Playwright | `enginesynth` rendered in an `OfflineAudioContext`: non-silent, and spectral centroid rises with rpm. Analyser on the live mix is non-silent in a race. `audio.counts` shows shifts, kerbs, tyre, voice. Music at 10% produces a level well under effects |
| `hub` | Playwright, harness served on an OS-picked port from a folder holding the HTML and `tools/hub/` | `?game=<html>&players=2&auto=1`, `&players=4&latency=150&jitter=50&loss=5&auto=1`, and `&scenario=host-leave`. Pass means `window.__hubCheck.pass`. Also opens the game outside a session and checks it still reaches the title |

**Machine notes.**

- Chromium flags that worked for WebGPU: `--enable-unsafe-webgpu --enable-features=Vulkan --use-vulkan=swiftshader --use-angle=swiftshader --use-webgpu-adapter=swiftshader`.
- System Python has Playwright: `from playwright.sync_api import sync_playwright` (don't add `-I`). Node needs `npm install playwright@1.63.0` in your own folder.
- The kit's `check.mjs` picks its own port. For the harness, run `python3 -u -m http.server 0 --bind 127.0.0.1` (the `-u` matters) in a folder with the game, and confirm you got your own page.
- One or two browsers at a time. Close them. Stop only your own PIDs. Keep all files in your folder, not `/tmp`. WebKit here has no WebGPU, so it can't run this engine: note that in testing feedback rather than chasing it.
- In tests, drive time with `engine.step(n)` rather than waiting. Treat "Target closed" as memory, not a bug: run fewer browsers.

**Look at these at 1920×1080**, when their code changes, because no script can judge them: each car in the showroom (`check.mjs --sheets` first), each track at the start and at a corner, Map at day and night, a race HUD, a results screen, Settings, Handbook page, Tuning, the Harbour at night, the rally crest, the pit stop, the podium, Couch Duel, the attract mode's first clips. At each ask: can this be read from ten feet? Is one idea on screen?

---

## 17. Build order

Risky and central first. After each step, the game should run. Run the matching suite before moving on.

1. **Pipeline.** Kit in `src/`, `tools/build.mjs` (C1), a blank scene from `file://`, `tools/test.mjs` skeleton.
2. **Sim in Node.** Port Appendix A and B. The `sim` suite must match the numbers. Add `RaceSim`.
3. **One car on one track.** Track mesh, car kit, chase camera, race HUD, pad and keyboard. Spend real time here until driving feels good on the stick, the keyboard and at speed. Body motion, sound and smoke are part of feel, so do the engine sound now.
4. **A race.** AI field, rolling start, results, replay recording and director.
5. **All tracks, dressed.** Hour, night, rain, dirt, crests, slipstream.
6. **Menu world.** UI widgets, glyphs and prompts, Map, Dealer Row, Garage, saves.
7. **Career.** Licences and medals, events, tuning, setup sliders, service, prizes, podium, Museum, Handbook.
8. **Pit stops and rally,** then the Harbour Lights 200.
9. **Attract mode, Dev mode, Settings, touch gate, About.**
10. **Multiplayer.** Hub round first (harness), then Couch Duel.
11. **Whole-game playthrough script,** balance, audio mix, voices, music, polish, screenshots.
12. **Finish.** Exit interview, final build, every suite green, chat reply.

**If budget runs short,** cut content counts and never features. Floors: 10 cars covering all five layouts, 5 tracks including one dirt and one night, 9 licence tests across three licences, 5 events including rally and endurance. Every feature in this plan still works with fewer items. Never leave a stub, a placeholder or a menu item that goes nowhere: the brief forbids it.

---

## 18. Done checklist

**Requirements, with where each is covered:**

| The brief asks for | Here |
| --- | --- |
| Genre and perspective picked | §1 |
| Title: playful riff, brainstormed, picked by real RNG | Yours, as the brief says; `TITLE` constant, §2 guardrails |
| Whether to research | §15 |
| One HTML, named as the brief says, dev files in the named subfolder | §4, C1 |
| Build on the kit, engine unchanged | §3, §4 |
| Art: engine's style as base, new assets for the source's feel | §8, C2 |
| Animation: engine's system as base, new animations | §9 |
| Audio in code; gibberish voices; music at 10% by default | §10 |
| Online: hub protocol, in a session and on its own | §14, C4 |
| Share the machine; `file://` first; OS-picked ports; own PIDs only | §16 |
| Performance out of scope; add detail freely | §3 fact 17, §8 |
| Headless tests; a scripted whole-game run; one command; one-line count | §16 |
| No subagents to review or debate | §16 |
| Original game, feature-complete demo, long enough to show everything | §1, §2, §6 |
| Infrastructure for designers to continue | §4 Designer tools |
| Dev mode from the pause menu, live sliders, reset | §13 |
| Attract mode at 10 s, any input exits, may cheat | §12 |
| Narrative tone like the source's | §11 |
| 10-foot, controller-first, native keyboard and mouse, not dense | §7 |
| Prompts follow last input; PlayStation glyphs, Xbox option | §7 |
| Touch-only gate, settings button, attract runs | §7 |
| No TODOs, placeholders or stubs | §17, below |
| Effort as you see fit | §17 sets the order and what may shrink |
| This computer: pad stubs, touch profiles, Web Audio checks, 1080p screenshots | §16 |
| Source Information, Testing, Engine and Prompt Feedback in chat and on an About/Credits screen | §15 |
| Exit interview file in the brief's exact shape | §15 |

**Before you stop:**

- [ ] `node tools/test.mjs` is all green, with the hub suite passing all three runs.
- [ ] The scripted playthrough finishes the career with no Dev tools.
- [ ] The built HTML runs from `file://`, with `session.js` unmodified and first in `<head>`, and `pixel-engine.js` unedited in `src/`.
- [ ] Music starts at 10% on a fresh profile and in a session.
- [ ] Grep for `TODO`, `FIXME`, `placeholder`, `stub`, `coming soon`: nothing in the game.
- [ ] Every menu item does something. Every car, track, test and event is reachable.
- [ ] You looked at the 1080p screenshots.
- [ ] About/Credits shows real answers. The exit-interview file parses as JSON. Your chat reply carries the same information.
- [ ] No stray servers or browsers of yours left running.

---

## Appendix A: `src/game/sim/sim.js`

Tested code. It ran every car on every track, an 8-car race with contact, and the checks in Appendix B. Port it as is, then extend it.

**How the pieces connect:**

- Per fixed step (60 Hz), get one input per car, then 4 times: `stepCar` for each car, `collideCars(field)` when contact is on.
- `env` is optional per step: `gripScale`, `powerScale`, `brakeScale`, `aeroScale`, `wearRate`, `fuelRate`, `wallLoss`, `kerb`. Dev mode's sliders write here.
- Car-level fields the race code sets: `c.dragScale` (slipstream), `c.oil` (service), `c.inPit` (pit lane surface).
- `tr.wallL`, `tr.wallR` are per-sample barrier distances from the road edge. `tr.muScale` is rain. `tr.cornerS[n]` is corner n's apex.
- Everything is deterministic for the same inputs.
- Add reverse by setting `inp.reverse`. Add AI lapses and pit autopilot in `race.js`, not here.

```js
// src/game/sim/sim.js: the race simulation. Pure JS, no engine, no DOM. Metres, seconds, kg, newtons, radians. Y up.
// Heading yaw: 0 faces +Z; forward = (sin yaw, cos yaw); the driver's right = (-cos yaw, sin yaw). Steer > 0 turns right.
export const G = 9.81, RHO = 1.2;
export const SURFACES = { // mu multiplies the tyre; drag is rolling drag in g at speed; tyre tables below may override mu
  asphalt: { mu: 1, drag: 0 }, kerb: { mu: 0.94, drag: 0.004 }, grass: { mu: 0.5, drag: 0.09 }, gravel: { mu: 0.55, drag: 0.16 },
  dirt: { mu: 0.62, drag: 0.02 }, apron: { mu: 0.9, drag: 0.004 },
};

// ---------- Track: a closed polygon with rounded corners, [x, z, radius, y, width, bankDeg] per corner ----------
export function buildTrack(def, step = 4) {
  const C = def.corners, n = C.length, px = [], pz = [], key = [];
  const T0 = C.map((c, i) => {
    const a = C[(i - 1 + n) % n], b = C[(i + 1) % n];
    let ux = a[0] - c[0], uz = a[1] - c[1], vx = b[0] - c[0], vz = b[1] - c[1]; const ul = Math.hypot(ux, uz), vl = Math.hypot(vx, vz); ux /= ul; uz /= ul; vx /= vl; vz /= vl;
    const ang = Math.acos(Math.max(-1, Math.min(1, ux * vx + uz * vz))), t = c[2] / Math.tan(ang / 2), bx = ux + vx, bz = uz + vz, bl = Math.hypot(bx, bz), d = c[2] / Math.sin(ang / 2);
    return { inX: c[0] + ux * t, inZ: c[1] + uz * t, outX: c[0] + vx * t, outZ: c[1] + vz * t, cx: c[0] + (bx / bl) * d, cz: c[1] + (bz / bl) * d, r: c[2] };
  });
  const push = (x, z, k) => { px.push(x); pz.push(z); key.push(k); };
  const line = (x0, z0, x1, z1, ci, f0, f1) => { const m = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0))); for (let i = 0; i < m; i++) { const f = i / m; push(x0 + (x1 - x0) * f, z0 + (z1 - z0) * f, ci + f0 + (f1 - f0) * f); } };
  const midX = (C[n - 1][0] + C[0][0]) / 2, midZ = (C[n - 1][1] + C[0][1]) / 2; let cx = midX, cz = midZ; // s = 0 is the middle of the last edge
  for (let i = 0; i < n; i++) {
    const t = T0[i]; line(cx, cz, t.inX, t.inZ, i - 1, i === 0 ? 0.5 : 0, 0.85);
    const a0 = Math.atan2(t.inZ - t.cz, t.inX - t.cx); let da = Math.atan2(t.outZ - t.cz, t.outX - t.cx) - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    const m = Math.max(1, Math.round(Math.abs(da) * t.r)); for (let k = 0; k < m; k++) { const f = k / m, a = a0 + da * f; push(t.cx + t.r * Math.cos(a), t.cz + t.r * Math.sin(a), i - 1 + 0.85 + 0.15 * f); }
    cx = t.outX; cz = t.outZ;
  }
  line(cx, cz, midX, midZ, n - 1, 0, 0.5);
  const m = px.length, smooth = (a, r) => { const o = new Float64Array(m); let s = 0; for (let i = -r; i <= r; i++) s += a[(i + m) % m]; for (let i = 0; i < m; i++) { o[i] = s / (2 * r + 1); s += a[(i + r + 1) % m] - a[(i - r + m) % m]; } return o; };
  const sx = smooth(smooth(px, 7), 7), sz = smooth(smooth(pz, 7), 7), cum = new Float64Array(m + 1);
  for (let i = 0; i < m; i++) cum[i + 1] = cum[i] + Math.hypot(sx[(i + 1) % m] - sx[i], sz[(i + 1) % m] - sz[i]);
  const length = cum[m], N = Math.round(length / step), ds = length / N, A = () => new Float64Array(N);
  const tr = { def, N, ds, length, x: A(), z: A(), y: A(), width: A(), bank: A(), tx: A(), tz: A(), kappa: A(), slope: A(), wallL: A().fill(def.runoff ?? 9), wallR: A().fill(def.runoff ?? 9), cornerS: new Array(n).fill(0), surface: def.surface ?? 'asphalt', edge: def.edge ?? 'grass', muScale: 1 };
  const ease = (f) => f * f * (3 - 2 * f), attr = (k, q) => { const ci = Math.floor(k), f = ease(k - ci), a = C[(ci + n) % n], b = C[(ci + 1 + n) % n]; return a[q] + (b[q] - a[q]) * f; };
  for (let i = 0, j = 0; i < N; i++) {
    const s = i * ds; while (cum[j + 1] < s) j++;
    const f = (s - cum[j]) / (cum[j + 1] - cum[j]), q = (j + 1) % m, k = key[j];
    tr.x[i] = sx[j] + (sx[q] - sx[j]) * f; tr.z[i] = sz[j] + (sz[q] - sz[j]) * f; tr.y[i] = attr(k, 3); tr.width[i] = attr(k, 4); tr.bank[i] = (attr(k, 5) * Math.PI) / 180;
  }
  for (let j = 0, ci = 0; j < m && ci < n; j++) if (key[j] >= ci - 1 + 0.925) tr.cornerS[ci++] = cum[j]; // s at each corner's apex
  for (const [cs, cl, ch] of def.crests ?? []) for (let i = 0; i < N; i++) { const d = (i * ds - cs) / cl; if (Math.abs(d) < 1) tr.y[i] += ch * (0.5 + 0.5 * Math.cos(Math.PI * d)); }
  for (let i = 0; i < N; i++) { const p = (i - 1 + N) % N, q = (i + 1) % N, dx = tr.x[q] - tr.x[p], dz = tr.z[q] - tr.z[p], l = Math.hypot(dx, dz); tr.tx[i] = dx / l; tr.tz[i] = dz / l; tr.slope[i] = (tr.y[q] - tr.y[p]) / l; }
  for (let i = 0; i < N; i++) { const p = (i - 1 + N) % N, q = (i + 1) % N; tr.kappa[i] = (tr.tx[p] * tr.tz[q] - tr.tz[p] * tr.tx[q]) / (2 * ds); tr.bank[i] *= Math.sign(tr.kappa[i] || 1); } // kappa > 0 turns right; bank > 0 pushes right
  return tr;
}
// t > 0 is the driver's right of the centreline: right = (-tz, tx). Search near the last index, so crossings can't confuse it.
export function locate(tr, px, pz, hint, out) {
  let best = hint, bd = Infinity;
  for (let k = -12; k <= 12; k++) { const i = (hint + k + tr.N) % tr.N, d = (px - tr.x[i]) ** 2 + (pz - tr.z[i]) ** 2; if (d < bd) { bd = d; best = i; } }
  const dx = px - tr.x[best], dz = pz - tr.z[best];
  out.i = best; out.s = (best * tr.ds + dx * tr.tx[best] + dz * tr.tz[best] + tr.length) % tr.length; out.t = -dx * tr.tz[best] + dz * tr.tx[best];
}
export function racingLine(tr, margin = 1.6, iters = 1500) { // elastic band: each point relaxes to its neighbours' midpoint, inside the track
  const off = new Float64Array(tr.N), px = Float64Array.from(tr.x), pz = Float64Array.from(tr.z), kappa = new Float64Array(tr.N), N = tr.N;
  for (let it = 0; it < iters; it++) for (let i = 0; i < N; i++) {
    const p = (i - 1 + N) % N, q = (i + 1) % N, dx = (px[p] + px[q]) / 2 - tr.x[i], dz = (pz[p] + pz[q]) / 2 - tr.z[i], lim = tr.width[i] / 2 - margin;
    off[i] = Math.max(-lim, Math.min(lim, -dx * tr.tz[i] + dz * tr.tx[i])); px[i] = tr.x[i] - off[i] * tr.tz[i]; pz[i] = tr.z[i] + off[i] * tr.tx[i];
  }
  for (let i = 0; i < N; i++) { const a = (i - 3 + N) % N, c = (i + 3) % N, ax = px[i] - px[a], az = pz[i] - pz[a], bx = px[c] - px[i], bz = pz[c] - pz[i], la = Math.hypot(ax, az), lb = Math.hypot(bx, bz); kappa[i] = (2 * (ax * bz - az * bx)) / (la * lb * (la + lb)); }
  return { off, px, pz, kappa };
}
export function speedProfile(tr, line, c, surfMu = 1) { // the fastest the car can follow the line, friction circle included
  const N = tr.N, v = new Float64Array(N), ds = tr.ds, m = c.mass, muEff = c.tyreMu * (c.clA > 0.5 ? 0.76 : 0.86) * surfMu, down = (RHO * c.clA) / (2 * m), dragK = (0.5 * RHO * c.cdA) / m;
  const grip = (sp) => muEff * (G + down * sp * sp);
  for (let i = 0; i < N; i++) {
    const k = Math.max(Math.abs(line.kappa[i]), 1e-5), tb = Math.tan(Math.abs(tr.bank[i])) * (Math.sign(tr.bank[i]) === Math.sign(line.kappa[i]) ? 1 : -1), muB = (muEff + tb) / Math.max(0.2, 1 - muEff * tb), den = k - muB * down;
    v[i] = Math.min(den > 1e-5 ? Math.sqrt((muB * G) / den) : 110, c.vMax ?? 110);
  }
  const left = (sp, i) => { const A = grip(sp), lat = sp * sp * Math.abs(line.kappa[i]); return Math.sqrt(Math.max(0.0025 * A * A, A * A - lat * lat)); };
  for (let pass = 0; pass < 2; pass++) {
    for (let i = N - 1; i >= 0; i--) { const j = (i + 1) % N, a = left(v[j], j) * 0.82 + dragK * v[j] * v[j]; v[i] = Math.min(v[i], Math.sqrt(v[j] * v[j] + 2 * a * ds)); }
    for (let i = 0; i < N; i++) { const j = (i + 1) % N, a = Math.min(left(v[i], i), (c.powerW * 0.85) / (m * Math.max(v[i], 8))) - dragK * v[i] * v[i]; v[j] = Math.min(v[j], Math.sqrt(Math.max(v[i] * v[i] + 2 * a * ds, 1))); }
  }
  return v;
}

// ---------- Car ----------
export function torqueShape(x, d) { // torque against rpm / rpmPeak; peak power lands at x = 1
  const low = d.turbo ? 0.5 : 0.62, rise = Math.min(1, low + (1 - low) * Math.min(1, x / 0.7)), fall = x <= 1 ? 1 - 0.14 * Math.max(0, (x - 0.7) / 0.3) : 0.86 - 0.9 * (x - 1);
  return Math.max(0.05, rise * fall);
}
export function carParams(d) { // d: a row of the car table after tuning
  const L = d.wheelbase, powerW = d.powerPS * 735.5, omega = (d.rpmPeak * 2 * Math.PI) / 60;
  return { ...d, mass: d.massKg, L, a: L * (1 - d.frontWeight), b: L * d.frontWeight, T: d.track ?? 1.5, h: d.cgH ?? 0.5, R: d.wheelR ?? 0.31, Izz: d.massKg * (0.25 * L * L + 0.35), powerW, Tpeak: powerW / (omega * torqueShape(1, d)), tyreMu: d.tyreMu ?? 1, alphaP: d.alphaP ?? 0.125, clA: d.clA ?? 0.1, cdA: d.cdA ?? 0.7, aeroF: d.aeroF ?? 0.45, rollF: d.rollF ?? 0.56, loadK: d.loadK ?? 0.1, lsd: d.lsd ?? 0, brakeF: d.brakeF ?? 0.62, brakeG: d.brakeG ?? 1.25, rearStiff: d.rearStiff ?? 1.3, lock: d.lock ?? 0.6, shiftTime: d.shiftTime ?? 0.16, idle: d.idle ?? 900, launch: d.launch ?? 3200, awdFront: d.awdFront ?? 0.4, engineBrake: d.engineBrake ?? 0.16 };
}
export function newCar(p, tr, i = 0, t = 0) {
  const rx = -tr.tz[i], rz = tr.tx[i], y = tr.y[i];
  return { p, x: tr.x[i] + rx * t, z: tr.z[i] + rz * t, y, vy: 0, yaw: Math.atan2(tr.tx[i], tr.tz[i]), vx: 0, vz: 0, r: 0, delta: 0, ax: 0, ay: 0, gear: 1, shift: 0, rpm: p.idle, spool: 0, fz: [0, 0, 0, 0], fy: [0, 0, 0, 0], use: [0, 0, 0, 0], loc: { i, s: i * tr.ds, t }, u: 0, w: 0, beta: 0, sliding: false, spinning: false, locked: false, airborne: false, onTrack: true, surface: tr.surface, wear: [1, 1, 1, 1], fuel: 1, wallHits: 0, contact: 0, rev: 0 };
}
const curve = (x) => { const a = Math.abs(x), v = a < 1 ? Math.sin((a * Math.PI) / 2) : Math.max(0.86, 1 - 0.07 * (a - 1)); return x < 0 ? -v : v; };
const XF = (p) => [p.a, p.a, -p.b, -p.b], XR = (p) => [-p.T / 2, p.T / 2, -p.T / 2, p.T / 2];
// One substep (4 per fixedUpdate). inp: { steer -1..1, throttle, brake, handbrake, abs, tcs 0..1, asm 0..1, auto, up, down, steerRate }
export function stepCar(c, inp, dt, tr, env = {}) {
  const p = c.p, sn = Math.sin(c.yaw), cs = Math.cos(c.yaw), u = c.vx * sn + c.vz * cs, w = -c.vx * cs + c.vz * sn;
  c.u = u; c.w = w; locate(tr, c.x, c.z, c.loc.i, c.loc);
  const i0 = c.loc.i, halfW = tr.width[i0] / 2, off = Math.abs(c.loc.t) - halfW, kerbW = env.kerb ?? 1.6;
  const sName = c.inPit ? 'apron' : off < -0.1 ? tr.surface : off < kerbW && tr.surface === 'asphalt' ? 'kerb' : tr.edge, surf = SURFACES[sName];
  c.surface = sName; c.onTrack = off < kerbW;
  const tyreOnSurf = (p.tyreTable?.[sName] ?? surf.mu) * (env.gripScale ?? 1) * (tr.muScale ?? 1);

  // Heave: a sprung mass over the surface, so crests lighten the car and jumps leave the ground.
  const bk = tr.bank[i0], gy = tr.y[i0] + tr.slope[i0] * (c.loc.s - i0 * tr.ds) - c.loc.t * Math.sin(bk);
  const gyRate = tr.slope[i0] * u, pen = gy - c.y, wn = Math.sqrt(G / 0.08), Fs = pen > -0.02 ? Math.max(0, p.mass * G * (1 + pen / 0.08) + 2 * 0.5 * p.mass * wn * (gyRate - c.vy)) : 0;
  c.vy += (Fs / p.mass - G) * dt; c.y += c.vy * dt; if (c.y < gy - 0.25) { c.y = gy - 0.25; c.vy = Math.max(c.vy, gyRate); }
  const heave = Fs / (p.mass * G); c.airborne = Fs <= 0;

  // Steering stops near the front tyres' peak at this speed and opens with body slip, so counter-steer is always there.
  const au = Math.max(Math.abs(u), 5), beta = Math.abs(u) > 3 ? Math.atan2(w, Math.abs(u)) : 0; c.beta = beta;
  const limit = Math.min(p.lock, Math.atan((p.L * p.tyreMu * G * 1.1) / (au * au)) + p.alphaP * 0.9 + Math.abs(beta));
  const rate = (inp.steerRate ?? 3) * dt; c.delta += Math.max(-rate, Math.min(rate, inp.steer * limit - c.delta));
  const sd = Math.sin(c.delta), cd = Math.cos(c.delta);

  // Loads: static, aero, heave, banking, then longitudinal and lateral transfer.
  const aero = 0.5 * RHO * p.clA * (env.aeroScale ?? 1) * u * u, bankLoad = Math.cos(bk) + Math.max(0, (u * u * tr.kappa[i0] * Math.sin(bk)) / G), fw = p.b / p.L;
  const sF = (p.mass * G * bankLoad * heave * fw) / 2 + (aero * p.aeroF) / 2, sR = (p.mass * G * bankLoad * heave * (1 - fw)) / 2 + (aero * (1 - p.aeroF)) / 2;
  const dLong = (p.mass * c.ax * p.h) / p.L / 2, dLatF = (p.mass * c.ay * p.h * p.rollF) / p.T, dLatR = (p.mass * c.ay * p.h * (1 - p.rollF)) / p.T, fz = c.fz; // +ay pushes right: load moves to the left wheels
  fz[0] = Math.max(0, sF - dLong + dLatF); fz[1] = Math.max(0, sF - dLong - dLatF); fz[2] = Math.max(0, sR + dLong + dLatR); fz[3] = Math.max(0, sR + dLong - dLatR);
  const Fz0 = (p.mass * G) / 4, Fmax = [0, 0, 0, 0], sL = [sF, sF, sR, sR];
  for (let i = 0; i < 4; i++) Fmax[i] = fz[i] * p.tyreMu * tyreOnSurf * (0.72 + 0.28 * Math.sqrt(Math.max(0, c.wear[i]))) * Math.max(0.82, Math.min(1.08, 1 - p.loadK * (fz[i] / Fz0 - 1)));

  // Gearbox and engine. rpm follows the road, the clutch slips below launch speed.
  const gears = p.gears, Gk = gears[c.gear - 1] * p.final, wheelRpm = (Math.abs(u) / p.R) * (60 / (2 * Math.PI));
  let rpm = wheelRpm * Gk; const clutchRpm = p.idle + p.launch * inp.throttle; if (rpm < clutchRpm) rpm = clutchRpm;
  if (c.shift > 0) c.shift -= dt;
  if (c.shift <= 0) {
    if (inp.auto !== false) {
      if (rpm > p.upshift && c.gear < gears.length && inp.throttle > 0.1) { c.gear++; c.shift = p.shiftTime; }
      else if (c.gear > 1) { const down = wheelRpm * gears[c.gear - 2] * p.final; if (down < p.upshift * 0.8 && (inp.throttle < 0.2 || down < p.rpmPeak * 0.8)) { c.gear--; c.shift = p.shiftTime * 0.6; } }
    } else {
      if (inp.up && c.gear < gears.length) { c.gear++; c.shift = p.shiftTime; }
      if (inp.down && c.gear > 1 && wheelRpm * gears[c.gear - 2] * p.final < p.redline) { c.gear--; c.shift = p.shiftTime * 0.6; }
    }
  }
  c.rpm = Math.min(rpm, p.redline + 200);
  const x = rpm / p.rpmPeak, throttle = rpm >= p.redline || c.fuel <= 0 ? 0 : inp.throttle;
  if (p.turbo) c.spool += ((throttle > 0.5 && rpm > p.rpmPeak * 0.4 ? 1 : 0.15) - c.spool) * Math.min(1, dt / (p.turboLag ?? 0.6));
  const boost = p.turbo ? 0.55 + 0.45 * c.spool : 1, Te = throttle * p.Tpeak * torqueShape(x, p) * boost * (env.powerScale ?? 1) * (c.oil ?? 1), eb = (1 - throttle) * p.engineBrake * p.Tpeak * Math.min(1, x);
  let drive = c.shift > 0 || inp.handbrake ? 0 : ((Te - eb) * Gk * 0.9) / p.R; if (inp.reverse) drive = -Math.min(3500, Math.abs(drive));
  c.fuel = Math.max(0, c.fuel - throttle * (rpm / p.redline) * dt * (env.fuelRate ?? 0.0018));
  const split = p.layout === '4WD' ? p.awdFront : p.layout === 'FF' ? 1 : 0;

  // Traction control trims drive to what the driven tyres have left after cornering.
  const free = (i) => Math.sqrt(Math.max(0.04 * Fmax[i] * Fmax[i], Fmax[i] * Fmax[i] - c.fy[i] * c.fy[i])), cap = (l, r) => 2 * Math.min(l, r) + p.lsd * Math.abs(l - r);
  if (inp.tcs > 0 && drive > 0) { const fA = cap(free(0), free(1)), rA = cap(free(2), free(3)), allow = (split === 1 ? fA : split === 0 ? rA : Math.min(fA / split, rA / (1 - split))) * (1.05 - 0.35 * inp.tcs); drive = Math.min(drive, allow); }
  const axle = (F, l, r) => { // the differential: open splits evenly and is held back by the lighter wheel; lsd lends it the other wheel's grip
    const mag = Math.abs(F), sign = Math.sign(F), low = Math.min(l, r), top = cap(l, r); let a = mag / 2, b = mag / 2, spin = false;
    if (mag > top) { spin = true; a = l <= r ? low : top - low; b = l <= r ? top - low : low; } else if (mag / 2 > low) { a = l <= r ? low : mag - low; b = l <= r ? mag - low : low; }
    return [a * sign, b * sign, spin];
  };
  const [d0, d1, s0] = axle(drive * split, Fmax[0], Fmax[1]), [d2, d3, s1] = axle(drive * (1 - split), Fmax[2], Fmax[3]), fxD = [d0, d1, d2, d3]; c.spinning = s0 || s1;

  // Tyres: lateral force from slip angle, longitudinal from drive and brake, both inside the friction circle.
  const Bmax = p.brakeG * p.mass * G * (env.brakeScale ?? 1), xf = XF(p), xr = XR(p), tanP = Math.tan(p.alphaP); let Ff = 0, Fr = 0, M = 0; c.sliding = false; c.locked = false;
  for (let i = 0; i < 4; i++) {
    const isF = i < 2, vf = u - c.r * xr[i], vr = w + c.r * xf[i], vLong = isF ? vf * cd + vr * sd : vf, vLat = isF ? -vf * sd + vr * cd : vr, lim = Math.max(1, Fmax[i]), dir = Math.abs(vLong) < 0.3 ? 0 : Math.sign(vLong);
    let Fx = fxD[i], locked = false, bd = inp.brake * Bmax * (isF ? p.brakeF : 1 - p.brakeF) * 0.5; const hb = !isF && inp.handbrake; if (hb) bd = 1e9;
    if (bd > 0) { if (inp.abs !== false && !hb) bd = Math.min(bd, Math.sqrt(Math.max(0.04 * lim * lim, lim * lim - c.fy[i] * c.fy[i])) * 0.9); else if (bd > lim) { bd = lim * 0.82; locked = true; c.locked = true; } Fx -= bd * dir; }
    let rho = Math.abs(Fx) / lim, latCap; if (locked) latCap = 0.28; else if (rho > 1) { Fx = Math.sign(Fx) * lim * 0.95; latCap = 0.3; rho = 1; } else latCap = Math.max(0.3, Math.sqrt(1 - rho * rho));
    const tanA = vLat / Math.max(Math.abs(vLong), 3.5), peak = tanP * Math.max(0.35, Math.pow(fz[i] / Math.max(1, sL[i]), 0.8)) * (isF ? 1 : 1 / p.rearStiff), Fy = -lim * latCap * curve(tanA / peak);
    c.fy[i] = Fy; c.use[i] = Math.abs(tanA / peak); if (Math.abs(tanA) > peak * 1.3 && Math.abs(u) > 4) c.sliding = true;
    c.wear[i] = Math.max(0, c.wear[i] - dt * (env.wearRate ?? 0.0012) * (p.wearX ?? 1) * (0.15 + c.use[i] * c.use[i] + rho * rho));
    const bFf = isF ? Fx * cd - Fy * sd : Fx, bFr = isF ? Fx * sd + Fy * cd : Fy; Ff += bFf; Fr += bFr; M += xf[i] * bFr - xr[i] * bFf;
  }
  // Drag, surface, grade, banking; ASM adds a moment against yaw that grip doesn't explain.
  const drag = 0.5 * RHO * p.cdA * (c.dragScale ?? 1) * u * Math.abs(u), sd2 = Math.sign(u); Ff -= drag + 0.012 * p.mass * G * sd2 + surf.drag * Math.min(1, Math.abs(u) / 15) * p.mass * G * sd2 + p.mass * G * tr.slope[i0]; Fr += p.mass * G * Math.sin(bk);
  if (inp.asm > 0 && Math.abs(u) > 6) { const excess = c.r - Fr / p.mass / Math.max(Math.abs(u), 6), lim = inp.asm * p.mass * 6; M += Math.max(-lim, Math.min(lim, -excess * inp.asm * p.Izz * 9)); }
  const f = Math.min(1, dt / 0.05); c.ax += (Ff / p.mass - c.ax) * f; c.ay += (Fr / p.mass - c.ay) * f;
  c.vx += ((Ff * sn - Fr * cs) / p.mass) * dt; c.vz += ((Ff * cs + Fr * sn) / p.mass) * dt;
  if (Math.abs(u) < 0.25 && inp.throttle < 0.02 && inp.brake > 0.1) { c.vx *= 0.8; c.vz *= 0.8; }
  c.r += (M / p.Izz) * dt; c.r *= 1 - Math.min(0.9, dt * (Math.abs(u) < 2 ? 12 : 0.15)); c.yaw -= c.r * dt; c.x += c.vx * dt; c.z += c.vz * dt;

  // Barrier: track-space, slides the car along and takes speed; the wall turns the nose back to the road.
  const nowT = -(c.x - tr.x[i0]) * tr.tz[i0] + (c.z - tr.z[i0]) * tr.tx[i0], wallT = halfW + (nowT > 0 ? tr.wallR[i0] : tr.wallL[i0]);
  if (Math.abs(nowT) > wallT) {
    const side = Math.sign(nowT), rx = -tr.tz[i0] * side, rz = tr.tx[i0] * side, pen2 = Math.abs(nowT) - wallT; c.x -= rx * pen2; c.z -= rz * pen2;
    const vn = c.vx * rx + c.vz * rz;
    if (vn > 0) { c.vx -= rx * vn * 1.3; c.vz -= rz * vn * 1.3; const keep = Math.max(0.6, 1 - vn * 0.012 * (env.wallLoss ?? 1)); c.vx *= keep; c.vz *= keep; c.wallHits++; c.contact = Math.max(c.contact, vn); }
    let e = Math.atan2(tr.tx[i0], tr.tz[i0]) - c.yaw; while (e > Math.PI) e -= 2 * Math.PI; while (e < -Math.PI) e += 2 * Math.PI; if (Math.abs(e) < 2.2) c.yaw += e * Math.min(1, dt * 2.5); c.r *= 0.95;
  }
}
// Car against car: three circles down each car's length, pushed apart with a soft impulse and a little yaw.
export function collideCars(cars) {
  for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) {
    const a = cars[i], b = cars[j]; if ((a.x - b.x) ** 2 + (a.z - b.z) ** 2 > 36 || Math.abs(a.y - b.y) > 3) continue;
    let hit = false;
    for (const oa of [-1.35, 0, 1.35]) for (const ob of [-1.35, 0, 1.35]) {
      const ax = a.x + Math.sin(a.yaw) * oa, az = a.z + Math.cos(a.yaw) * oa, bx = b.x + Math.sin(b.yaw) * ob, bz = b.z + Math.cos(b.yaw) * ob, dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz), r = 1.75;
      if (d >= r || d < 1e-4) continue;
      hit = true; const nx = dx / d, nz = dz / d, push = (r - d) / 2; a.x -= nx * push; a.z -= nz * push; b.x += nx * push; b.z += nz * push;
      const rel = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz; if (rel >= 0) continue;
      const ma = a.p.mass, mb = b.p.mass, J = (-(1 + 0.25) * rel) / (1 / ma + 1 / mb); a.vx -= (J * nx) / ma; a.vz -= (J * nz) / ma; b.vx += (J * nx) / mb; b.vz += (J * nz) / mb;
      a.r += ((J * oa * Math.sign(nx * Math.cos(a.yaw) - nz * Math.sin(a.yaw))) / a.p.Izz) * 0.25; b.r -= ((J * ob * Math.sign(nx * Math.cos(b.yaw) - nz * Math.sin(b.yaw))) / b.p.Izz) * 0.25;
      a.contact = Math.max(a.contact, -rel); b.contact = Math.max(b.contact, -rel);
    }
    if (hit) { a.touching = b; b.touching = a; }
  }
}
// ---------- AI: pure pursuit with understeer feed-forward and a yaw damper, a speed target from the profile, overtaking offset ----------
export function aiDrive(c, tr, line, speeds, o = {}, field = null) {
  const u = Math.hypot(c.vx, c.vz), p = c.p, look = Math.max(7, u * (o.lookT ?? 0.62)), idx = (c.loc.i + Math.round(look / tr.ds)) % tr.N;
  let lane = o.lane ?? 0, slow = 1;
  if (field) for (const b of field) { // a car ahead and close: pick the side with room, lift if it is blocking
    if (b === c) continue; let gap = (b.loc.s - c.loc.s + tr.length) % tr.length; if (gap > tr.length / 2) gap -= tr.length;
    if (gap <= 1 || gap > 6 + u * 0.7) continue; const closing = u - Math.hypot(b.vx, b.vz), lat = b.loc.t - c.loc.t;
    if (closing > -1 && Math.abs(lat) < 2.4) { const lim = tr.width[idx] / 2 - 1.2, side = lat > 0 || b.loc.t > lim - 2.4 ? -1 : 1; lane = Math.max(-lim - line.off[idx], Math.min(lim - line.off[idx], line.off[idx] + side * 3.2 - line.off[idx])); if (gap < 8) slow = Math.min(slow, 0.97); }
  }
  c.laneNow = (c.laneNow ?? 0) + (lane - (c.laneNow ?? 0)) * 0.03;
  const rx = -tr.tz[idx], rz = tr.tx[idx], tx = line.px[idx] + rx * c.laneNow - c.x, tz = line.pz[idx] + rz * c.laneNow - c.z, sn = Math.sin(c.yaw), cs = Math.cos(c.yaw);
  const fwd = tx * sn + tz * cs, rgt = -tx * cs + tz * sn, curv = (2 * rgt) / Math.max(1, fwd * fwd + rgt * rgt), uch = o.uch ?? 26;
  const delta = Math.atan(curv * p.L) * (1 + (u * u) / (uch * uch)) - (o.yawDamp ?? 0.05) * (c.r - u * curv);
  const au = Math.max(Math.abs(c.u), 5), limit = Math.min(p.lock, Math.atan((p.L * p.tyreMu * G * 1.1) / (au * au)) + p.alphaP * 0.9 + Math.abs(c.beta));
  const err = speeds[(c.loc.i + Math.round((u * 0.1) / tr.ds)) % tr.N] * (o.skill ?? 1) * slow - u;
  let throttle = err > 0.3 ? 1 : err > -0.3 ? 0.4 : 0; if (Math.abs(c.beta) > 0.16 && Math.abs(c.u) > 5) throttle *= 0.4;
  return { steer: Math.max(-1, Math.min(1, delta / limit)), throttle, brake: err < -0.4 ? Math.min(1, -err / 4 + 0.15) : 0, abs: true, auto: true, tcs: o.tcs ?? 0.7, asm: o.asm ?? 0.6, steerRate: 6 };
}
```

---

## Appendix B: data and regression numbers

### Tracks

```js
// src/game/data/tracks.js: every circuit as a closed polygon with rounded corners. Corner: [x, z, radius, y, width, bankDeg].
// s = 0 is the middle of the edge from the last corner to the first (the start line). runoff: metres from the road edge to the barrier.
// Every track but Cedar Ridge is right-handed overall, so the infield is on the driver's right: pit lanes go there, the main grandstand opposite. Cedar Ridge is left-handed and has no pits.
// pit: metres from the start line along the start straight. crests: [s, half length, height].
export const TRACKS = {
  kestrel: { name: 'Kestrel Park', surface: 'asphalt', edge: 'grass', runoff: 9, hour: 15, pit: { in: -260, box: 0, out: 260 }, corners: [
    [640, 0, 60, 0, 13, 0], [760, 190, 110, 2, 13, 0], [640, 330, 50, 6, 13, 0], [780, 470, 80, 8, 13, 0], [700, 720, 70, 12, 13, 0], [470, 760, 40, 14, 13, 0],
    [430, 520, 28, 14, 13, 0], [300, 560, 70, 12, 12, 0], [230, 760, 90, 10, 12, 0], [40, 800, 80, 8, 13, 0], [-120, 640, 120, 4, 13, 0], [-60, 340, 60, 2, 13, 0],
    [-190, 190, 70, 0, 13, 0], [-130, 0, 60, 0, 14, 0] ] },
  cedar: { name: 'Cedar Ridge', surface: 'asphalt', edge: 'grass', runoff: 5, hour: 10, crests: [[990, 40, 1.8]], corners: [
    [0, 420, 90, 0, 12, 0], [140, 620, 70, -6, 12, 0], [60, 780, 60, -12, 12, 0], [210, 930, 80, -20, 12, 0], [480, 960, 130, -32, 12, 2], [700, 800, 100, -38, 13, 3],
    [720, 520, 60, -36, 12, 0], [560, 420, 40, -28, 12, 0], [640, 240, 26, -20, 12, 0], [420, 270, 26, -10, 12, 0], [520, 90, 30, -2, 12, 0], [380, -60, 70, 6, 12, 0],
    [160, -150, 90, 8, 12, 0], [0, -60, 60, 4, 12, 0] ] },
  harbour: { name: 'Harbour Lights', surface: 'asphalt', edge: 'apron', runoff: 1.2, hour: 21, pit: { in: -280, box: 0, out: 280 }, corners: [
    [420, 0, 18, 0, 12, 0], [420, 190, 16, 0, 11, 0], [620, 190, 16, 1, 11, 0], [620, 400, 20, 2, 11, 0], [470, 520, 40, 3, 11, 0], [470, 660, 16, 3, 11, 0],
    [210, 660, 30, 2, 11, 0], [170, 610, 24, 2, 11, 0], [110, 660, 30, 2, 11, 0], [-60, 660, 16, 1, 11, 0], [-60, 420, 18, 1, 11, 0], [-190, 420, 16, 0, 11, 0],
    [-190, 200, 22, 0, 11, 0], [-300, 110, 30, 0, 11, 0], [-300, 0, 18, 0, 12, 0] ] },
  saltline: { name: 'Saltline Speedbowl', surface: 'asphalt', edge: 'apron', runoff: 3, hour: 18.5, pit: { in: -200, box: 0, out: 200 }, corners: [
    [632, 0, 215, 0, 18, 16], [0, 1095, 215, 0, 18, 16], [-632, 0, 215, 0, 18, 16] ] },
  redclay: { name: 'Red Clay Stage', surface: 'dirt', edge: 'gravel', runoff: 4, hour: 17, crests: [[420, 36, 2.6], [1660, 30, 2]], corners: [
    [240, 0, 40, 0, 9, 0], [300, 160, 25, 4, 9, 0], [170, 260, 30, 8, 9, 0], [280, 400, 20, 12, 9, 0], [120, 470, 16, 16, 9, 0], [0, 360, 30, 14, 9, 0],
    [-120, 470, 20, 18, 9, 0], [-300, 380, 35, 20, 9, 0], [-220, 220, 18, 14, 9, 0], [-380, 120, 30, 8, 9, 0], [-300, -40, 35, 4, 9, 0], [-60, -60, 40, 1, 9, 0] ] },
  proving: { name: 'Proving Ground', surface: 'asphalt', edge: 'apron', runoff: 14, hour: 11, corners: [
    [1040, 0, 80, 0, 28, 0], [1040, 240, 80, 0, 16, 0], [800, 240, 40, 0, 14, 0], [720, 150, 30, 0, 14, 0], [600, 240, 30, 0, 14, 0], [480, 150, 30, 0, 14, 0], [360, 240, 40, 0, 14, 0],
    [200, 240, 22, 0, 14, 0], [200, 130, 22, 0, 14, 0], [40, 130, 22, 0, 14, 0], [40, 240, 22, 0, 14, 0], [-160, 240, 80, 0, 16, 0], [-160, 0, 80, 0, 28, 0] ] },
};
```

Lengths from `buildTrack`: Kestrel 3,430 m, Cedar 3,216 m, Harbour 2,973 m, Saltline 2,909 m, Red Clay 2,209 m, Proving 3,020 m. Kestrel's corner apexes, as a check on your port: 383, 593, 757, 940, 1193, 1413, 1638, 1764, 1968, 2154, 2372, 2669, 2862, 3052.

### Car physics

```js
// src/game/data/cars.js, physics rows: the stock setup of each car. Prices, years and text are in section 6.
const sport = { tyreMu: 1.0, alphaP: 0.125, tyreTable: { dirt: 0.5, gravel: 0.5 } };
export const CARS = {
  pico:     { layout: 'FF', massKg: 720, powerPS: 64, rpmPeak: 6500, redline: 7000, upshift: 6700, wheelbase: 2.36, frontWeight: 0.6, track: 1.3, cgH: 0.5, gears: [3.4, 2.0, 1.36, 0.97, 0.78], final: 4.4, tyreMu: 0.92, alphaP: 0.14, cdA: 0.62, clA: 0.02, wheelR: 0.27, rollF: 0.62, tyreTable: { dirt: 0.45, gravel: 0.45 } },
  kite:     { layout: 'FF', massKg: 1040, powerPS: 148, rpmPeak: 7200, redline: 7600, upshift: 7350, wheelbase: 2.48, frontWeight: 0.62, track: 1.45, gears: [3.2, 1.9, 1.35, 1.03, 0.82], final: 4.3, tyreMu: 0.98, alphaP: 0.13, cdA: 0.66, clA: 0.04, rollF: 0.62, tyreTable: { dirt: 0.45, gravel: 0.45 } },
  ginga:    { layout: 'FR', massKg: 1230, powerPS: 205, rpmPeak: 6800, redline: 7300, upshift: 7000, wheelbase: 2.55, frontWeight: 0.53, track: 1.5, gears: [3.3, 1.95, 1.4, 1.03, 0.82], final: 3.9, cdA: 0.65, clA: 0.08, lsd: 0.3, rollF: 0.56, ...sport },
  moth:     { layout: 'FR', massKg: 860, powerPS: 135, rpmPeak: 6600, redline: 7200, upshift: 6900, wheelbase: 2.3, frontWeight: 0.5, track: 1.42, cgH: 0.45, gears: [3.3, 2.0, 1.4, 1.05, 0.85], final: 4.1, cdA: 0.6, clA: 0.03, lsd: 0.2, rollF: 0.54, ...sport },
  brandt32: { layout: 'FR', massKg: 1450, powerPS: 320, rpmPeak: 7400, redline: 7900, upshift: 7650, wheelbase: 2.73, frontWeight: 0.51, track: 1.55, cgH: 0.5, gears: [3.2, 2.0, 1.45, 1.1, 0.88, 0.74], final: 3.4, cdA: 0.68, clA: 0.12, lsd: 0.3, rollF: 0.55, ...sport },
  ryu:      { layout: '4WD', massKg: 1340, powerPS: 280, rpmPeak: 6400, redline: 7000, upshift: 6700, wheelbase: 2.6, frontWeight: 0.56, track: 1.5, gears: [3.1, 1.9, 1.4, 1.05, 0.82], final: 4.1, cdA: 0.72, clA: 0.1, turbo: true, turboLag: 0.7, lsd: 0.4, rollF: 0.55, ...sport },
  longhorn: { layout: 'FR', massKg: 1610, powerPS: 420, rpmPeak: 5800, redline: 6400, upshift: 6100, wheelbase: 2.72, frontWeight: 0.55, track: 1.58, cgH: 0.54, gears: [2.8, 1.9, 1.4, 1.0, 0.75], final: 3.5, cdA: 0.8, clA: 0.05, lsd: 0.3, rollF: 0.6, tyreMu: 1.0, alphaP: 0.13, tyreTable: { dirt: 0.5, gravel: 0.5 } },
  heck:     { layout: 'RR', massKg: 1380, powerPS: 360, rpmPeak: 6800, redline: 7300, upshift: 7050, wheelbase: 2.35, frontWeight: 0.39, track: 1.52, cgH: 0.46, gears: [3.3, 2.1, 1.5, 1.15, 0.92, 0.76], final: 3.5, cdA: 0.62, clA: 0.15, lsd: 0.4, rollF: 0.58, rearStiff: 1.45, tyreMu: 1.04, alphaP: 0.12, tyreTable: { dirt: 0.5, gravel: 0.5 } },
  libeccio: { layout: 'MR', massKg: 1250, powerPS: 380, rpmPeak: 7600, redline: 8200, upshift: 7900, wheelbase: 2.45, frontWeight: 0.42, track: 1.55, cgH: 0.44, gears: [3.0, 2.0, 1.45, 1.1, 0.88], final: 3.9, tyreMu: 1.05, alphaP: 0.115, cdA: 0.62, clA: 0.25, lsd: 0.4, rollF: 0.5, aeroF: 0.42, tyreTable: { dirt: 0.5, gravel: 0.5 } },
  kiteCup:  { layout: 'FF', massKg: 930, powerPS: 210, rpmPeak: 8000, redline: 8500, upshift: 8250, wheelbase: 2.48, frontWeight: 0.6, track: 1.5, cgH: 0.44, gears: [3.0, 2.05, 1.55, 1.25, 1.03], final: 4.4, tyreMu: 1.18, alphaP: 0.11, cdA: 0.68, clA: 0.3, lsd: 0.5, rollF: 0.6, brakeG: 1.5, tyreTable: { dirt: 0.45, gravel: 0.45 } },
  ryuRally: { layout: '4WD', massKg: 1230, powerPS: 330, rpmPeak: 6400, redline: 7000, upshift: 6700, wheelbase: 2.6, frontWeight: 0.56, track: 1.5, gears: [3.1, 1.9, 1.4, 1.05, 0.82], final: 4.6, tyreMu: 1.0, alphaP: 0.17, cdA: 0.72, clA: 0.1, turbo: true, turboLag: 0.7, lsd: 0.5, rollF: 0.55, tyreTable: { dirt: 0.72, gravel: 0.72 } },
  works:    { layout: 'FR', massKg: 1180, powerPS: 560, rpmPeak: 7400, redline: 8000, upshift: 7750, wheelbase: 2.62, frontWeight: 0.5, track: 1.62, cgH: 0.42, gears: [2.7, 2.0, 1.56, 1.26, 1.05, 0.9], final: 3.6, tyreMu: 1.32, alphaP: 0.115, cdA: 0.72, clA: 1.05, lsd: 0.5, rollF: 0.52, aeroF: 0.44, brakeG: 1.8, tyreTable: { dirt: 0.4, gravel: 0.4 } },
  corsa:    { layout: 'MR', massKg: 1100, powerPS: 620, rpmPeak: 7800, redline: 8400, upshift: 8150, wheelbase: 2.55, frontWeight: 0.43, track: 1.62, cgH: 0.4, gears: [2.7, 2.0, 1.56, 1.26, 1.05, 0.9], final: 3.65, tyreMu: 1.36, alphaP: 0.11, cdA: 0.74, clA: 1.4, lsd: 0.5, rollF: 0.5, aeroF: 0.43, brakeG: 1.9, tyreTable: { dirt: 0.4, gravel: 0.4 } },
  type9:    { layout: 'MR', massKg: 930, powerPS: 780, rpmPeak: 8200, redline: 8800, upshift: 8550, wheelbase: 2.75, frontWeight: 0.44, track: 1.6, cgH: 0.34, gears: [2.6, 2.0, 1.6, 1.3, 1.1, 0.95], final: 3.45, tyreMu: 1.5, alphaP: 0.095, cdA: 0.78, clA: 2.6, lsd: 0.6, rollF: 0.5, aeroF: 0.43, brakeG: 2.3, tyreTable: { dirt: 0.4, gravel: 0.4 } },
};
```

For cars with no `tyreTable` entry on a surface, `SURFACES[surface].mu` applies. `tunedParams` starts from these rows, applies the parts in section 6, then calls `carParams`. When the player buys tyres, that tyre's `tyreMu`, `alphaP`, table and wear factor (`wearX`) replace the stock ones. Speed profiles take the surface grip: `speedProfile(tr, line, p, tr.surface === 'dirt' ? (p.tyreTable?.dirt ?? 0.62) : 1)`.

Extra per-car data for audio and models: cylinders, exhaust character, tail-lamp style, wheel positions (from wheelbase and track).

### Regression: spec sheet

Full throttle on a long flat road, `tcs: 0.5`. Your `sim` suite should match within 5%. These are also the numbers the Showroom can show.

| Car | 0–100 km/h (s) | 0–200 km/h (s) | Top speed (km/h) | 100–0 km/h (m) |
| --- | --- | --- | --- | --- |
| Pico 660 | 10.5 | - | 163 | 45 |
| Kite 1.6 RS | 7.4 | 36.1 | 214 | 43 |
| Ginga S | 6.6 | 24.0 | 243 | 43 |
| Moth 1.8 | 6.7 | 31.2 | 219 | 42 |
| Brandt 3.2 | 6.1 | 17.6 | 278 | 42 |
| Ryu 2.0T | 4.4 | 17.3 | 243 | 41 |
| Longhorn 428 | 6.5 | 15.9 | 285 | 43 |
| Heck 3.6 | 4.8 | 13.8 | 301 | 40 |
| Libeccio | 5.0 | 12.8 | 279 | 40 |
| Kite Cup | 5.8 | 18.6 | 219 | 35 |
| Ryu Rally | 4.0 | 13.1 | 217 | 41 |
| Works GT | 4.4 | 9.8 | 289 | 32 |
| Corsa | 3.8 | 8.2 | 299 | 30 |
| Type 9 | 3.4 | 7.0 | 314 | 27 |

### Regression: laps at 97% AI pace

Seconds, second lap, assists as in `aiDrive`, `wearRate: 0`, `fuelRate: 0`. Your port should match within ±3 s. They also tell you what to expect when setting event laps and hub rounds.

| Car | Kestrel | Cedar | Harbour | Saltline | Red Clay | Proving |
| --- | --- | --- | --- | --- | --- | --- |
| Pico 660 | 136 | 133 | 150 | 75 | 163 | 128 |
| Kite 1.6 RS | 125 | 124 | 140 | 64 | 157 | 118 |
| Ginga S | 122 | 120 | 135 | 59 | 146 | 115 |
| Moth 1.8 | 123 | 121 | 135 | 61 | 145 | 115 |
| Brandt 3.2 | 120 | 118 | 133 | 58 | 145 | 112 |
| Ryu 2.0T | 117 | 115 | 127 | 57 | 139 | 110 |
| Longhorn 428 | 121 | 120 | 135 | 58 | 147 | 113 |
| Heck 3.6 | 115 | 113 | 126 | 62 | 137 | 108 |
| Libeccio | 114 | 112 | 126 | 59 | 137 | 106 |
| Kite Cup | 110 | 109 | 125 | 54 | 143 | 105 |
| Ryu Rally | 116 | 114 | 126 | 58 | 115 | 109 |
| Works GT | 104 | 102 | 115 | 49 | 142 | 97 |
| Corsa | 101 | 99 | 111 | 54 | 137 | 94 |
| Type 9 | 92 | 90 | 105 | 41 | 129 | 87 |

Heck on Saltline is slow because the RR car overcooks at the AI's speed there; don't read too much into one outlier, and if a pairing like this troubles an event, set `vMax` on that car's profile. A keyboard-style driver (digital steering through the section 4 filter, digital throttle and brake, assists at 5, 90% pace) laps within 3 to 6 s of these numbers on ten sampled pairings, with no recoveries and two light wall touches in all (Works GT at Cedar). Keep that true: rerun it if you make handling harder.

---

## Appendix C: code recipes

Each was run in the engine. Adapt freely.

### C1. `tools/build.mjs`: one HTML

```js
// node tools/build.mjs <the HTML path your brief names>
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
const out = process.argv[2], bundle = 'tools/.bundle.js';
execFileSync('esbuild', ['src/main.js', '--bundle', '--format=esm', '--target=esnext', '--charset=utf8', '--legal-comments=none', `--outfile=${bundle}`], { stdio: 'inherit' });
const js = readFileSync(bundle, 'utf8').replace(/<\/script/gi, '<\\/script');
rmSync(bundle);
const session = readFileSync('tools/hub/session.js', 'utf8'); // the client, unmodified
const metas = readFileSync('tools/hub-metas.html', 'utf8');    // the hub:* tags from section 14
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><script>${session}</script><title>${process.env.TITLE ?? ''}</title>
${metas}
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#row{display:flex;width:100vw;height:100vh}#p1{position:relative;width:100vw;height:100vh;overflow:hidden}#p2{display:none;position:relative;height:100vh;overflow:hidden}</style>
</head><body><div id="row"><div id="p1"></div><div id="p2"></div></div><script type="module">${js}</script></body></html>`;
writeFileSync(out, html);
```

Don't minify: the client must stay unmodified for the hub to replace it, and the engine stays as it ships. `src/main.js` calls `Engine.start` with `document.getElementById('p1')`. For a Couch Duel, `p1.style.width = p2.style.width = '50vw'; p2.style.display = 'block'`, and then start the second engine. The engine re-frames by itself.

### C2. The car kit (`src/game/models/cars.js`)

```js
import { model } from '../../pixel-engine.js';
// Side profile as an outline of [z, y] points (z forward), extruded across the car with rot [0, -90, 0].
export function carDef(o) {
  const w = o.width ?? 1.72, g = o.glassWidth ?? w - 0.26;
  const parts = [
    { name: 'body', slab: o.body, depth: w, at: [0, 0, 0], rot: [0, -90, 0], c: 'paint' },
    { name: 'glass', slab: o.cabin, depth: g, at: [0, 0, 0], rot: [0, -90, 0], c: 'glass' },
    ...(o.roof ? [{ name: 'roof', slab: o.roof, depth: g - 0.08, at: [0, 0, 0], rot: [0, -90, 0], c: 'paint' }] : []),
    { name: 'sill', box: [w + 0.02, 0.12, (o.length ?? 4.2) - 0.5], at: [0, 0.26, 0], c: 'dark' },
    { mirror: [{ box: [o.lampW ?? 0.42, o.lampH ?? 0.12, 0.05], at: [w / 2 - (o.lampW ?? 0.42) / 2 - 0.04, o.lampY ?? 0.72, o.tailZ ?? -2.1], c: 'lamp', glow: true }], axis: 'x' },
    { box: [0.46, 0.12, 0.05], at: [0, (o.lampY ?? 0.72) - 0.2, o.tailZ ?? -2.1], c: 'plate' },
    { mirror: [{ box: [0.34, 0.1, 0.05], at: [w / 2 - 0.21, o.headY ?? 0.66, o.noseZ ?? 2.1], c: 'head', glow: true }], axis: 'x' },
    ...(o.extra ?? []),
  ];
  return model({ id: o.id, about: o.about, tags: ['vehicle', 'car'], palette: { paint: 'red', glass: 'navy', dark: 'ink', lamp: 'orange', head: 'sand', plate: 'white', trim: 'slate', ...(o.palette ?? {}) }, parts, collider: 'none' });
}
export const hatch = carDef({ id: 'kit-hatch', about: 'Second-hand hot hatch', length: 3.9, width: 1.66, tailZ: -1.92, noseZ: 1.93, lampY: 0.86, lampH: 0.2, lampW: 0.2, headY: 0.68,
  body: [[-1.92,0.3],[1.93,0.3],[1.95,0.62],[1.55,0.82],[0.72,0.92],[-1.82,0.98],[-1.92,0.72]],
  cabin: [[-1.72,0.92],[0.86,0.9],[0.18,1.36],[-1.3,1.38]],
  roof: [[-1.42,1.36],[0.24,1.34],[0.14,1.42],[-1.34,1.44]] });
export const coupe = carDef({ id: 'kit-coupe', about: 'Rear-drive coupe with a long bonnet', length: 4.4, width: 1.74, tailZ: -2.17, noseZ: 2.18, lampY: 0.78, headY: 0.62,
  body: [[-2.17,0.3],[2.18,0.3],[2.2,0.54],[1.78,0.72],[0.5,0.88],[-1.2,0.92],[-2.12,0.95],[-2.17,0.7]],
  cabin: [[-1.28,0.9],[0.62,0.86],[-0.1,1.27],[-0.8,1.28]],
  roof: [[-0.9,1.26],[-0.02,1.25],[-0.14,1.32],[-0.8,1.33]],
  extra: [{ box: [1.5, 0.05, 0.3], at: [0, 1.06, -1.96], c: 'trim' }, { mirror: [{ box: [0.06, 0.12, 0.2], at: [0.6, 1.0, -1.96], c: 'trim' }], axis: 'x' }] });
```

Those two read clearly in the game; use them as the starting silhouettes for the Kite and Ginga. Derive the other 12 the same way: a low wedge for the Libeccio, a long bonnet and short tail for the Longhorn, a three-box shape for the Brandt, a sloped tail with the engine bump for the Heck, a tiny open car with a windscreen slab for the Moth, a tall upright box for the Pico, and for the Type 9 a narrow cockpit (`glassWidth` under 1) over wide fenders with a fin and a full-width wing. Paint comes through `buildModel(def, { palette: { paint: 'blue' } })`. After building, set every mesh to `castShadow = true; receiveShadow = false`. Use `check.mjs --sheets` on the module, and look at the rear view first.

### C3. Camera and placing a car (`src/game/render/camera.js`, `carview.js`)

```js
await Engine.start(game, withUrlOptions({ container, camera: { preset: 'fixed', position: [0, 5, -10], target: [0, 1, 0], fov: 58, minZoom: 1, maxZoom: 1 }, settings: { button: false }, touch: false, seed }));
// in setup:
const cam = ctx.camera.camera; cam.near = 0.5; cam.far = 6000; cam.updateProjectionMatrix();
// in update(ctx, dt), with interpolated car state c:
const sn = Math.sin(c.yaw), cs = Math.cos(c.yaw);
want.set(c.x - sn * back, c.y + height, c.z - cs * back);
camPos.lerp(want, 1 - Math.exp(-dt * 8));
cam.position.copy(camPos);
cam.lookAt(c.x + sn * 8, c.y + 1.1, c.z + cs * 8);
cam.fov = 58 + 8 * Math.min(1, Math.abs(c.u) / 80); cam.updateProjectionMatrix();
view.position.set(c.x, c.y, c.z);
view.rotation.set(pitch, c.yaw, roll, 'YXZ'); // pitch from -c.ax * 0.004 plus the road's slope; roll from c.ay * 0.008 plus the road's bank
// cameraTarget(ctx) returns the focus car's position: shadows and lights follow it.
```

### C4. Hub session skeleton (`src/game/net/hub.js`)

This shape passed the harness with its own card. Keep `connect` first.

```js
const hub = window.AIHub;                       // undefined on the dev page, which has no client
const info = hub ? await hub.connect({ mode: 'ghost', seats: [1, 4], card: true }) : null;
if (!info) return startOnItsOwn();              // not a session, or no hub after all
const engine = await Engine.start(new RaceScene(hubRoundSetup(hub.rng('round'))), { container, seed: info.seed, /* as C3 */ });
let done = false, last = 0;
hub.on('card', (c) => race.card = c);           // left, paused, starting, ready, asking, asked: draw them
hub.on('start', () => race.armLights());
hub.on('message', (data, from) => ghosts.receive(data, from));
hub.on('leave', ({ id }) => ghosts.remove(id));
hub.on('time-up', () => { if (!done) { done = true; hub.result({ score: Math.floor(race.metres) }); } });
hub.on('end', () => race.stopEverything());     // no input, no sound
addEventListener('keydown', (e) => {            // a plain listener: wasPressed doesn't work outside engine hooks
  if (hub.time() !== -Infinity) return;
  if (e.code === 'Enter') hub.answer('ready');
  if (e.code === 'KeyM') hub.answer('more');
});
hub.ready();                                    // once built, no key press
// per frame, from RaceScene.update, once hub.time() >= 0 and not done:
if (performance.now() - last > 100) {
  last = performance.now();
  hub.send({ t: 'g', a: trackId, x, y, z, yaw, s, lap }, { reliable: false });
  hub.progress({ score: Math.floor(race.metres), label: `LAP ${lap}/${laps} P${pos}` });
}
// on the finish line: done = true; hub.result({ time: Math.round(hub.time()), stats }); hub.send({ t: 'done', time });
```

Also poll the pad on the card: ✕ answers `ready`, △ answers `more`. And wrap the start: if `Engine.start` rejects, `hub.fail(message)`.

### C5. Road bands with hard colour edges (`src/game/render/trackmesh.js`)

```js
// from(h) and to(h) give the two edges of the band as t offsets, for half-width h. Quads share no vertices.
function band(tr, from, to, lift, colourAt) {
  const pos = [], col = [], c = new Color(), up = from(1) < to(1);
  const P = (i, f) => { const k = i % tr.N, t = f(tr.width[k] / 2); return [tr.x[k] - tr.tz[k] * t, tr.y[k] + lift - t * Math.sin(tr.bank[k]), tr.z[k] + tr.tx[k] * t]; };
  for (let i = 0; i < tr.N; i++) {
    const a = P(i, from), b = P(i, to), d = P(i + 1, from), e = P(i + 1, to);
    c.set(colourAt(i));
    for (const v of up ? [a, b, d, b, e, d] : [a, d, b, b, d, e]) { pos.push(...v); col.push(c.r, c.g, c.b); }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  const m = new Mesh(g, toonMaterial(0xffffff, { vertexColors: true }));
  m.receiveShadow = true;
  return m;
}
// band(tr, (h) => -h, (h) => h, 0, (i) => (i % 4 < 2 ? road : shade));                                   the road, in 16 m pairs of bands
// band(tr, (h) => s * h, (h) => s * (h + 1.6), 0.02, (i) => cornerHere(i, s) ? (i % 2 ? red : white) : road);   kerbs, s = -1 or 1
// band(tr, (h) => s * (h - 0.5), (h) => s * (h - 0.25), 0.03, () => white);                              edge lines
```

Note the winding: quads built from low `t` to high `t` use `[a, b, d, b, e, d]`. Getting it the other way round makes the road vanish into the ground plane. Don't draw white lines on dirt.
