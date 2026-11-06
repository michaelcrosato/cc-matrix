# PLAN.md audit

Written by `node tools/audit.mjs`. Every line of PLAN.md sections 1 to 18 that says anything (tables, bullets, numbered items, prose), with its evidence. "test" names a check in `tools/tests`; `node tools/test.mjs` proves those pass. "data" compares the plan's numbers or words with the game's data. Appendices A to C are the code those sections use: the sim suite covers them.

Lines: 488. Failing: 0. Not requirements on the game (headers, notes, reported facts): 55.

| Line | | PLAN.md | Evidence |
| --- | --- | --- | --- |
| 3 | ok | You are building this game from this plan and your brief, with | not a requirement: how to read the plan |
| 5 | ok | **Words used here.** "The brief" is your TASK.md. "The game" i | not a requirement: words used; TITLE is checked at line 52 |
| 7 | ok | Sections: 1 The game · 2 Originality · 3 What is already prove | not a requirement: a table of contents |
| 13 | ok | **Pitch.** You arrive on the Halcyon Peninsula with 15,000 cre | code: START_CREDITS; test: starts with 15,000 |
| 15 | ok | **Genre.** Racing simulation with a career, tuning and car col | file: ../exit-interview.json |
| 17 | ok | **Perspective.** Third-person chase camera (near and far), a b | code: CAM_MODES; code: class TvDirector |
| 19 | ok | **What makes the source distinctive, and what it becomes here: | not a requirement: a heading for the table below |
| 21 | ok | Source trait / In this game / | not a requirement: table header |
| 23 | ok | Cars treated as the characters, each with its own feel / 14 ca | code: cyl: 3; test: all five layouts |
| 24 | ok | You must earn the right to race / Three licences, 12 tests, br | test: all gold gives the Pico |
| 25 | ok | Money, parts and patience / A dealer row, used cars, a parts s | test: buys the Kite; test: pays for weight stage 1 |
| 26 | ok | Long, calm menus between races / A diorama map, a turntable sh | test: nine buildings on the Map |
| 27 | ok | Television replays / After every race: a replay director with  | code: class TvDirector; test: triangle changes camera |
| 28 | ok | Oil changes, car wash, prize cars, trophies / Service Bay, mud | test: a wash removes mud; test: a cup on the shelf |
| 29 | ok | Rally and endurance / One-on-one gap racing on dirt, and a ten | test: two legs of three wins the rally; code: class PitCrew |
| 30 | ok | Catalogue voice / Sincere, precise, gently dry writing (sectio | data matches the plan (line:622) |
| 32 | ok | **Pillars.** When a decision is unclear, pick what serves thes | not a requirement: a heading for the pillars |
| 34 | ok | 1. **The corner is the game.** Braking, line and throttle deci | not a requirement: a pillar for choosing between options, no feature of its own |
| 35 | ok | 2. **Every car is a character.** If two cars feel the same, fi | test: all five layouts; code: CAR_MODELS |
| 36 | ok | 3. **The garage is the story.** Progress is a car that is your | not a requirement: a pillar |
| 37 | ok | 4. **Calm between storms.** Menus breathe. Nothing shouts. The | not a requirement: a pillar |
| 39 | ok | **What the player can and cannot do** (the Handbook, section 7 | code: CARS CANNOT BE DAMAGED OR FLIP OVER, BY DESIGN.; code: THERE IS NO COCKPIT VIEW; test: a stopped AI car recovers by itself |
| 41 | ok | **The first ten minutes**, on a new save: title, a short greet | test: three used cars; test: the first nudge is to the dealer; test: then the licence centre; test: a short greeting |
| 47 | ok | Build an original game in the genre, inspired by the source. * | code: 'INSPIRED BY' |
| 49 | ok | - No real car makers or models. Use only the fictional marques | code: TSUBAME PICO 660 |
| 50 | ok | - No real or source circuits. Use the layouts in Appendix B; t | data matches the plan (tracks) |
| 51 | ok | - Nothing from the source's logo, menu layout, fonts, tagline, | code: DAWN PATROL CUP |
| 52 | ok | - The title is a playful riff on the source's name, as the bri | code: export const TITLE = 'GRAN TUMBLEWEED' |
| 53 | ok | - About and credits say "inspired by" and name the source, as  | code: 'INSPIRED BY' |
| 59 | ok | The director tested the riskiest parts against the real kit (P | not a requirement: reports what the director tested |
| 61 | ok | Question / Result / | not a requirement: table header |
| 63 | ok | One HTML from `file://`? / Yes. Bundle with esbuild, inline af | code: --bundle; test: boots into the menu |
| 64 | ok | Chase camera? / Use preset `fixed`: its `step()` leaves the ca | code: preset: 'fixed' |
| 65 | ok | Does a racing game read at 480×270? / Very well. A car seen fr | not a requirement: a fact the director found |
| 66 | ok | Car models as data? / Yes. Side-profile polygons (`slab`) extr | code: slab: o.body |
| 67 | ok | Split screen on one TV? / Yes. Two `Engine.start` calls in two | test: the second engine is disposed |
| 68 | ok | Hub conformance with WebGPU in iframes? / Passes: 2 players; 4 | test: host leaves |
| 69 | ok | The engine's `Vehicle`? / An arcade vehicle (default top speed | code: stepCar(e.c |
| 70 | ok | Is a real car model feasible and stable? / Yes. Appendix A has | test: keyboard driver finishes |
| 71 | ok | `Engine.headless` and `check.mjs --headless`? / Work for a gam | test: check.mjs replays to the same fingerprint |
| 72 | ok | Pixel ghost cars? / `toonMaterial(color, { dissolve: true })`  | code: mat.dissolve = 0.35 |
| 73 | ok | Rain and night? / `Precipitation`, `applySky(engine, skyAt(hou | code: new Precipitation |
| 75 | ok | **Not proven.** No human has driven these cars, and there was  | not a requirement: reports what is not proven: only a human can settle handling feel, and this computer has none |
| 79 | ok | 1. **Menus and `loadGame`.** `loadGame` frees the scene's obje | code: new MenuScene(app |
| 80 | ok | 2. **Pausing.** `engine.paused` and `timeScale = 0` make `dt`  | test: pausing stops the sim |
| 81 | ok | 3. **Volumes.** Engine defaults are master 0.8, sfx 1, music 0 | test: reset restores music to 10% |
| 82 | ok | 4. **The engine's settings panel** is a DOM panel that isn't b | code: settings: { button: false } |
| 83 | ok | 5. **Touch.** The engine adds on-screen controls on touch devi | code: touch: false |
| 84 | ok | 6. **Pads.** The engine merges all pads into one and reads but | code: engine.input.gamepadButtons = {} |
| 85 | ok | 7. **`wasPressed` works inside engine hooks only.** It didn't  | code: window.addEventListener('keydown', (e) => { if (hub.time() |
| 86 | ok | 8. **`input.commands` last one rendered frame** and `fixedUpda | code: if (f === this.frame) return |
| 87 | ok | 9. **Lights.** The pool holds 4 to 16 lights and only serves r | code: priority: 8 |
| 88 | ok | 10. **Shadows on cars.** Set `receiveShadow = false` on car me | code: m.receiveShadow = false |
| 89 | ok | 11. **Vertex colours blend across shared vertices.** For hard- | code: b.tri(a, e0, d, col) |
| 90 | ok | 12. **Far plane.** The `fixed` rig defaults to near 0.2, far 2 | code: cam.far = 6000 |
| 91 | ok | 13. **The HUD font is uppercase 5×7.** Draw all UI text throug | code: safeName(p.name |
| 92 | ok | 14. **Two engines.** `__PIXEL_ENGINE__` holds the last one sta | code: e2.audio.persist = false |
| 93 | ok | 15. **Sound unlock.** The AudioContext opens on a key, click o | code: PRESS A KEY OR CLICK FOR SOUND; test: a pad press asks for sound; test: the title says so; test: Settings says so |
| 94 | ok | 16. **`engine.step(n)` draws nothing.** For a screenshot, step | not a requirement: a note for screenshots |
| 95 | ok | 17. **On software WebGPU** the engine logs `quality medium → l | not a requirement: a note: FPS is out of scope |
| 96 | ok | 18. **Port printing.** `python3 -m http.server 0 --bind 127.0. | test: no port |
| 97 | ok | 19. **No Math.random in anything a replay or the hub reads.**  | code: mulberry(setup.seed; test: no ${name} in the game |
| 98 | ok | 20. **`file://`.** The kit's note that modules don't load from | test: boots into the menu |
| 106 | ok | - Pixel Engine as it ships. Unzip the kit into `src/` so `src/ | file: src/pixel-engine.js; file: src/index.html; file: src/main.js |
| 107 | ok | - Plain modern JavaScript modules, esbuild to bundle (it's alr | code: --bundle |
| 108 | ok | - The hub client `session.js`, pasted unmodified as the first  | test: the hub client is unmodified and the first script after the charset |
| 109 | ok | - Keep the hub's `harness.html`, `bridge.js` and `round.js` in | file: tools/hub/harness.html; file: tools/hub/bridge.js; file: tools/hub/round.js |
| 139 | ok | Three engine Games, each with `name`, `setup`, `fixedUpdate`,  | test: has the hook ${h} |
| 141 | ok | - **MenuScene**: title, map, every menu set (showroom, parts s | code: export class MenuScene |
| 142 | ok | - **RaceScene**: everything driven: race, licence test, test d | code: export class RaceScene |
| 143 | ok | - **ReplayScene**: plays recorded poses with the replay direct | code: export class ReplayScene |
| 145 | ok | `src/main.js` exports `createGame()` so `check.mjs --headless` | code: export function createGame; code: window.__GAME__ = this.app.handle(); test: check.mjs replays to the same fingerprint |
| 149 | ok | `RaceSim` is plain JS with no engine imports. `RaceScene.fixed | code: sim.step(inputs); code: for (let sub = 0; sub < 4; sub++); code: ctx.physics.alpha; code: fingerprint() { |
| 151 | ok | The engine's Rapier world stays empty apart from whatever a pr | code: Math.hypot(c.x - k.x, c.z - k.z) < 1.5; code: k.m.rotation.x; test: a hit cone adds 1 s |
| 155 | ok | `src/game/input/pad.js`, once per frame at the end of `update` | code: ctx.input.send({ pads; code: Math.round(v * 255) / 255; test: axes are quantised to 1/255; test: a pad arrives by commands |
| 157 | ok | `src/game/input/actions.js` turns keys, mouse and latched pad  | code: moveTimer[ax] = 0.35; code: moveTimer[ax] = 0.09; code: dx + dy > 3; test: first menu repeat at 0.35 s; test: then every 0.09 s; test: any key resets idle; test: a 2 px mouse move does not; test: a 5 px mouse move does; test: a stick at 0.3 does |
| 159 | ok | Filters on driving input: keyboard steering goes toward ±1 at  | code: ? 6 : 3.2; code: dt / 0.1; code: dead = 0.08; code: this.steerCurve; test: keyboard steering goes toward 1 at 3.2 a second; test: and returns at 6 a second; test: keyboard throttle ramps over 0.1 s; test: an 8% deadzone on the stick; test: the response curve; test: a trigger that reports only 0 or 1 gets the ramp; test: an analog trigger follows the pedal; test: Steering response changes it |
| 163 | ok | Profile JSON in `localStorage` under a key from `TITLE`, with  | code: SAVE_KEY; code: SAVE_VERSION; test: migrates to the current version |
| 167 | ok | `?scene=race&track=harbour&car=works&hour=21&rain=1&laps=2&ai= | test: race flag; test: licence flag; test: replay flag; test: dev flag; code: withUrlOptions |
| 171 | ok | So the rest of the game can be built later: all content is dat | test: brochure line too long; file: docs/adding-content.md; file: src/game/models/sheets.js |
| 177 | ok | Appendix A is working code. Port it as is first, confirm the r | test: on ${k} lap |
| 181 | ok | Each car has four wheels with loads from static weight, aero,  | test: all five layouts |
| 185 | ok | Assist / Default / Sim input / Effect / | not a requirement: table header |
| 187 | ok | ABS / On / `abs` / Off: brakes can lock, tyres smoke and steer | code: c.absOn = true; test: a standing test starts on the lights; test: ABS off: the brakes lock; test: ABS on: they do not |
| 188 | ok | Traction control 0–10 / 5 / `tcs` = value/10 / Trims drive to  | code: inp.tcs = Math.min(1,; test: Traction control acts when it is on; test: and not when it is off |
| 189 | ok | Stability control 0–10 / 5 / `asm` = value/10 / Moment against | code: inp.asm = Math.min(1,; test: Stability control acts when it is on |
| 190 | ok | Automatic gears / On / `auto` / Off: L1/R1 or Q/E. Downshift r | test: a downshift that would over-rev is refused |
| 191 | ok | Driving line / Off / render only / Dashes along the racing lin | code: export function buildDrivingLine; test: three failures offer the line |
| 193 | ok | Licence tests may force an assist off (the brief card says so) | code: Object.entries(t.assists); test: the assists screen |
| 197 | ok | - **Rolling start** for races: double file, 12 m apart, 150 m  | test: a rolling start; code: -150 - Math.floor(k / 2) * 12; test: everyone is held near 90 km/h; test: green when the leader reaches the line; test: the player starts last |
| 198 | ok | - **Standing start** with five red lights for licence tests th | test: a standing test starts on the lights; code: hold: true; test: five red lights; test: a held car does not creep |
| 199 | ok | - **Race order** from laps and `s`. A lap counts when `s` wrap | code: e.lastS > L * 0.9 && s < L * 0.1; test: the lap count continues through the pit |
| 200 | ok | - **After the flag**, an AI takes the player's car for a cool- | code: e.autoDrive = true;; code: this.startTv(); test: an AI takes the car after the flag; test: the camera drops to TV; test: the cool-down lap goes on behind them |
| 201 | ok | - **Slipstream.** Within 25 m behind another car and under 2 m | code: gap < 25; test: the car behind is in the slipstream; test: no slipstream at 30 m; test: no slipstream 3 m to the side; test: no slipstream at 90 km/h; test: a slipstream carries more speed |
| 202 | ok | - **Recovery.** Hold Triangle or R for 1 s when off the road o | code: recover(e.i); code: RECOVERY ENDS THE ATTEMPT; test: R held for 1 s recovers a stopped car; test: Triangle held for 1 s recovers; test: with 2 s of no contact; test: a stopped AI car recovers by itself; test: recovery ends the attempt |
| 203 | ok | - **Wrong way** sign when the heading opposes the tangent abov | code: WRONG WAY; test: a wrong way sign, heading opposed, above 5 m/s; test: HUD: wrong way |
| 204 | ok | - **Reverse.** Hold brake at a standstill for 0.4 s: reverse e | test: reverse moves backward; code: e.brakeHold > 0.4 |
| 205 | ok | - **Rain.** `tr.muScale = 0.78`, an overcast sky, spray partic | code: tr.muScale = 0.78; test: in the rain; test: rain: muScale 0.78 |
| 209 | ok | `aiDrive` is pure pursuit with understeer feed-forward and a y | code: aiDrive(c, tr, this.line, e.speeds |
| 211 | ok | - **Pace** is `skill`. Each event gives a range (section 6). A | test: slowest at the front |
| 212 | ok | - **Human touches:** a slow sine on `lane` (±0.6 m), and once  | code: e.lapse = 2; code: Math.sin(e.phase + this.time * 0.3) * 0.6; test: a low-pace car has one 2-second lapse a lap; test: a high-pace car has none |
| 213 | ok | - **Rubber band:** off by default, a Dev slider up to ±3% of p | test: a slider writes to env; code: this.env.rubber; test: the rubber band is off by default; test: an AI car ahead of the player eases off under the rubber band; test: and one behind pushes on |
| 214 | ok | - **Field variety:** AI cars come from the event's pool, with  | code: eventRoster; code: aiInstall; test: the field comes from the event's pool; test: and every car in the pool races; test: tuned cars carry a tune |
| 215 | ok | - **Endurance:** AI pits when mean wear is under 0.3 or fuel u | code: mean < 0.3 ; test: worn tyres send the AI to the pits in a ten-lap race; test: low fuel sends the AI in too; test: nobody pits in a short race |
| 216 | ok | - **Speed profiles** are per car and track: compute on the fir | code: profileCache; test: a speed profile is computed once per car and track |
| 220 | ok | Used on Kestrel, Harbour and Saltline (the three tracks with p | code: tr.wallR[i] = PIT_WIDTH + 2; code: c.inPit =; test: the barrier opens out at the pits; test: has a pit lane |
| 222 | ok | Crossing the marked entry line at `t` inside the lane hands th | test: a ten-lap race: the apron takes you into the pits; code: PIT_SPEED = 60 / 3.6; code: P.tyres = mean < 0.7 ? 4 : 0; code: (1 - c.fuel) * 100 * 0.1; code: skipTyres(; test: 60 km/h in the lane; test: 0.1 s per percent of fuel sets a 50% stop; test: tyres stay on above 0.7; test: skipping the tyres leaves only the fuel; test: Circle or Esc skips the tyres; test: HUD: a stop timer |
| 226 | ok | Red Clay's surface is `dirt`, with a `gravel` edge. Tyres matt | code: start: 'stagger'; code: startDelay: 3; code: contact: false; code: * (this.tr.surface === 'dirt' ? 0.5 : 1); test: crests lift the car; test: a 3 s staggered start; test: rally: no contact; test: the rival is solid; test: a clock gap for the HUD; test: default stability halves on dirt; test: dirt builds up |
| 230 | ok | Chase near (6.8 m back, 2.4 up), chase far (8.5, 3.1), bonnet  | code: back: 6.8, up: 2.4; code: back: 8.5, up: 3.1; code: back: 0, up: 1.05; code: this.fovBase + 8; code: dt * 8; code: E.shake.add; test: chase near: 6.8 back; test: chase far: 8.5 back; test: bonnet: 0.2 forward; test: FOV 66 at speed; test: the position spring runs at about 8 a second; test: the right stick orbits; test: and it springs back; test: B turns it round; test: C cycles the camera; test: a right drag looks around |
| 234 | ok | Record every car at 30 Hz into Float32Arrays: x, y, z, yaw, pi | code: this.frame % 2 === 0; code: FIELDS = 12; test: a recording holds 30 frames a second |
| 236 | ok | **The director:** per track, auto-place camera posts every ~28 | code: s += 240 + rnd() * 80; code: this.heli; code: prefer that car; test: posts every 280 m or so; test: tele lenses, FOV 18 to 30; test: authored shots: start line, gantry, helicopter; test: a cut every 4 to 8 s; test: the director cuts to the car that slides; test: with nothing happening it stays on the player |
| 238 | ok | **Controls:** Cross play/pause, left/right scrub, L1/R1 change | test: cross pauses; test: triangle changes camera; code: p.buttons[7] > 0.3; code: s.hudOn = !s.hudOn; test: right scrubs on; test: R1 changes the focus car; test: Triangle: ${m}; test: a drag orbits in Free; test: the wheel zooms; test: R2 holds slow motion at 0.25; test: the HUD hides; test: a click on a car focuses it |
| 240 | ok | **Saving:** keep the last race in memory. `Save` writes a comp | test: a compressed replay is saved; test: saved replay plays; code: THE STORAGE IS FULL; test: the compressed copy holds 10 a second; test: quantised to 16 bits, 9 numbers a car; test: a polite refusal; test: the slot is as it was |
| 246 | ok | All of this is data in `src/game/data/`. Physics rows for the  | test: brochure line too long |
| 250 | ok | The **Halcyon Peninsula**: a fictional stretch of coast, mount | code: WASH THEIR CARS ON SUNDAYS |
| 254 | ok | Id / Car / Year / Layout / PS / kg / Price (CR) / Where / | not a requirement: table header |
| 256 | ok | pico / Tsubame Pico 660 / 1991 / FF / 64 / 720 / 4,800 / Used  | data matches the plan (car) |
| 257 | ok | kite / Tsubame Kite 1.6 RS / 1996 / FF / 148 / 1,040 / 12,500  | data matches the plan (car) |
| 258 | ok | ginga / Kaminari Ginga S / 1994 / FR / 205 / 1,230 / 14,800 /  | data matches the plan (car) |
| 259 | ok | moth / Castellan Moth 1.8 / 1998 / FR / 135 / 860 / 24,000 / D | data matches the plan (car) |
| 260 | ok | ryu / Kaminari Ryu 2.0T / 1999 / 4WD turbo / 280 / 1,340 / 39, | data matches the plan (car) |
| 261 | ok | longhorn / Ironwood Longhorn 428 / 1969 / FR / 420 / 1,610 / 4 | data matches the plan (car) |
| 262 | ok | brandt32 / Brandt 3.2 CSR / 2000 / FR / 320 / 1,450 / 58,000 / | data matches the plan (car) |
| 263 | ok | heck / Brandt Heck 3.6 / 1997 / RR / 360 / 1,380 / 92,000 / De | data matches the plan (car) |
| 264 | ok | libeccio / Vespucci Libeccio / 1995 / MR / 380 / 1,250 / 135,0 | data matches the plan (car) |
| 265 | ok | kiteCup / Tsubame Kite Cup Racer / 2000 / FF / 210 / 930 / Pri | data matches the plan (car) |
| 266 | ok | ryuRally / Kaminari Ryu Rally Spec / 1999 / 4WD turbo / 330 /  | data matches the plan (car) |
| 267 | ok | works / Kaminari Ginga Works GT / 2000 / FR / 560 / 1,180 / Pr | data matches the plan (car) |
| 268 | ok | corsa / Vespucci Libeccio Corsa / 1998 / MR / 620 / 1,100 / Pr | data matches the plan (car) |
| 269 | ok | type9 / Halcyon Type 9 Prototype / 2001 / MR / 780 / 930 / Pri | data matches the plan (car) |
| 271 | ok | Marque personalities, for text and badges: **Tsubame** (small, | code: const BADGES = {; code: MARQUES |
| 273 | ok | Starting credits: **15,000**. All three used cars are affordab | test: every used car is affordable from the start |
| 275 | ok | Selling returns 50% of the price. You can't sell your last car | test: a prize car cannot be sold; test: cannot sell the last car; test: half the price; code: PRIZE CARS ARE NOT FOR SALE |
| 279 | ok | Tyre / `tyreMu` / `alphaP` / dirt, gravel factor / Wear × / Pr | not a requirement: table header |
| 281 | ok | Street / 0.95 / 0.14 / 0.45 / 0.8 / 600 (close to stock on Pic | data matches the plan (tyre) |
| 282 | ok | Sport / 1.00 / 0.125 / 0.50 / 1.0 / 1,200 / | data matches the plan (tyre) |
| 283 | ok | Semi-slick / 1.12 / 0.115 / 0.42 / 1.4 / 4,800 / | data matches the plan (tyre) |
| 284 | ok | Racing slick / 1.30 / 0.105 / 0.35 / 2.2 / 12,000 / | data matches the plan (tyre) |
| 285 | ok | Rally dirt / 0.84 / 0.17 / 0.72 / 1.2 / 2,500 / | data matches the plan (tyre) |
| 287 | ok | Appendix B's car rows are the stock setups: a car keeps its ow | test: tyres replace the stock row |
| 291 | ok | Each one changes numbers in `tunedParams`. "Slider" means a se | test: an exhaust adds power |
| 293 | ok | Category / Part / Effect / Price / | not a requirement: table header |
| 295 | ok | Engine / Sport exhaust / power ×1.04; louder, deeper engine so | data matches the plan (part); code: d.sportExhaust = true |
| 296 | ok | Engine / Intake and ECU / power ×1.06 / 1,800 / | data matches the plan (part) |
| 297 | ok | Engine / Stage 1, 2, 3 (exclusive) / power ×1.10, ×1.20, ×1.35 | data matches the plan (part); code: [1, 1.1, 1.2, 1.35] |
| 298 | ok | Engine / Turbo kit 1, 2 (exclusive) / Turbo cars: power ×1.15, | data matches the plan (part); code: [1, 1.15, 1.35]; code: [1, 1.25, 1.5] |
| 299 | ok | Weight / Stage 1, 2, 3 (exclusive) / mass ×0.95, ×0.90, ×0.85; | data matches the plan (part); code: [1, 0.95, 0.9, 0.85] |
| 300 | ok | Drivetrain / Clutch and flywheel / `shiftTime` 0.11 / 1,200 / | data matches the plan (part); code: d.shiftTime = 0.11 |
| 301 | ok | Drivetrain / Race gearbox / `shiftTime` 0.08; slider: Gearing  | data matches the plan (part); code: d.shiftTime = 0.08 |
| 302 | ok | Drivetrain / Limited-slip diff / slider: LSD (`lsd` 0.2 to 0.8 | data matches the plan (part); code: has('lsd') |
| 303 | ok | Suspension / Sport / `loadK` 0.085, `cgH` ×0.96; slider: Balan | data matches the plan (part); code: d.loadK = 0.085 |
| 304 | ok | Suspension / Race / `loadK` 0.07, `cgH` ×0.92; sliders: Balanc | data matches the plan (part); code: d.loadK = 0.07; code: lowRide |
| 305 | ok | Brakes / Sport pads / `brakeG` +0.15 / 1,500 / | data matches the plan (part) |
| 306 | ok | Brakes / Race kit / `brakeG` +0.40; slider: Balance (`brakeF`  | data matches the plan (part) |
| 307 | ok | Aero / Street kit / `clA` +0.15, `cdA` +0.02; a lip spoiler ap | data matches the plan (part); code: lipSpoiler |
| 308 | ok | Aero / Big wing / `clA` +0.50, `cdA` +0.06; slider: Downforce  | data matches the plan (part); code: bigWing |
| 309 | ok | Tyres / see table / / / | not a requirement: points at the tyre table, checked above |
| 310 | ok | Body / Paint (any of the 16 palette colours) / Model recolours | data matches the plan (paint) |
| 311 | ok | Body / Rims (4 styles) / Hub colour and spoke pattern change / | data matches the plan (rims) |
| 313 | ok | Displayed power and weight come from `tunedParams`. Event limi | test: an engine part shows the dyno; code: rpmPeak |
| 317 | ok | - **Oil change, 250 CR.** Each 40 km after the first 200 km si | test: 0.5% per 40 km past 200; test: fresh oil gives 2%; test: never worse than -8% |
| 318 | ok | - **Car wash, 50 CR.** No performance effect ("It is simply po | test: a wash removes mud; code: setDirt |
| 322 | ok | Each test is data: `{ id, title, carId, track, startS, startSp | data matches the plan (test:330); test: the clock waits for the first movement; test: a rolling test runs from the start; test: stopping short of the box fails; test: running past the box fails |
| 324 | ok | `Cn` below is corner index n of that track's list (`tr.cornerS | code: tr.cornerS[at.c] |
| 326 | ok | **Licence C, "Provisional".** Car: Kite (stock, street tyres). | test: Licence C is won on the fourth test; test: reward 2000; test: all gold gives the Pico |
| 328 | ok | Id / Title / Section / Lesson / | not a requirement: table header |
| 330 | ok | C-1 / Start and Stop / Standing, 400 m along the long straight | data matches the plan (test) |
| 331 | ok | C-2 / First Corner / Rolling 60 km/h, C0 −100 m to C1 +100 m / | data matches the plan (test) |
| 332 | ok | C-3 / Cone Weave / Rolling 50 km/h down the straight through 6 | data matches the plan (test); test: six cones; test: a hit cone adds 1 s |
| 333 | ok | C-4 / The Short Loop / C2 −50 m to C6 +50 m / Link corners, ke | data matches the plan (test) |
| 335 | ok | **Licence B, "Club".** Car: Ginga. Reward: 5,000 CR. All gold: | code: reward: 5000; code: car: 'moth'; test: Licence B pays 5,000; test: all gold on B: the Moth |
| 337 | ok | Id / Title / Section / Lesson / | not a requirement: table header |
| 339 | ok | B-1 / Threshold / Proving straight, rolling 160 km/h, ABS off, | data matches the plan (test); test: B-1 forces ABS off |
| 340 | ok | B-2 / Hairpin Exit / Kestrel, C5 −150 m to C7 +60 m. Traction  | data matches the plan (test); test: B-2 forces traction control to 0 |
| 341 | ok | B-3 / Three Layouts / Proving C7 to C10, driven three times in | data matches the plan (test); test: B-3 is driven in the Kite, Ginga and Ryu |
| 342 | ok | B-4 / One Lap of Kestrel / Kestrel, flying lap / Rhythm / | data matches the plan (test) |
| 344 | ok | **Licence A, "National".** Reward: 10,000 CR. All gold: 25,000 | code: reward: 10000; code: credits: 25000, helmet: true; test: Licence A pays 10,000; test: all gold on A: 25,000; test: and a gold helmet on the shelf |
| 346 | ok | Id / Title / Car / Section / Lesson / | not a requirement: table header |
| 348 | ok | A-1 / Blind Crest / Brandt 3.2 / Cedar, C3 −100 m to C5 +100 m | data matches the plan (test) |
| 349 | ok | A-2 / Switchbacks / Moth / Cedar, C7 to C10, uphill / Momentum | data matches the plan (test) |
| 350 | ok | A-3 / Red Clay / Ryu Rally / Red Clay, C7 to C10, dirt / Rotat | data matches the plan (test) |
| 351 | ok | A-4 / Harbour at Night / Libeccio / Harbour Lights, flying lap | data matches the plan (test); test: A-4 has no margin for error |
| 353 | ok | After each attempt: medal, time, gap to the next medal, then * | test: a result card; code: WATCH YOUR REPLAY; code: DEMONSTRATION; test: three failures offer the line |
| 357 | ok | Points per round: 10, 8, 6, 5, 4, 3, 2, 1. Most points wins th | test: first prize; test: second pays 60%; test: most points wins; test: a race advances the day; test: series bonus |
| 359 | ok | Id / Event / Needs / Restriction / Rounds (track, laps) / AI p | not a requirement: table header |
| 361 | ok | dawn / Dawn Patrol Cup / C / ≤210 PS / Kestrel 2; Harbour at d | data matches the plan (event) |
| 362 | ok | fellow / Front-Drive Fellowship / C / FF, ≤230 PS / Cedar 2; S | data matches the plan (event) |
| 363 | ok | feather / Featherweight Trophy / B / ≤1,100 kg / Cedar 3; Kest | data matches the plan (event) |
| 364 | ok | society / Rear-Drive Society / B / FR / Kestrel in rain 3; Sal | data matches the plan (event) |
| 365 | ok | clay / Red Clay Rally / B / Any; dirt tyres advised / Red Clay | data matches the plan (event) |
| 366 | ok | touring / Peninsula Touring Trophy / A / ≤520 PS / Cedar 3; Ha | data matches the plan (event) |
| 367 | ok | h200 / Harbour Lights 200 / A / Any / Harbour, 10 laps, dusk i | data matches the plan (event) |
| 368 | ok | gp / The Halcyon Grand Prix / A and Touring or H200 won / Any  | data matches the plan (event) |
| 370 | ok | Twenty-two races and twelve tests is about three hours for a n | test: tyres wear over distance; test: fuel falls over distance; code: wear: 0.5; test: ten laps |
| 372 | ok | **Winning the GP:** a podium scene, the Type 9 reveal, then th | test: the ending plays; test: the ending card |
| 376 | ok | The Arcade Gate on the map skips the career: **Quick Race** (a | test: every race option; test: the best lap becomes a ghost; test: a duel starts; test: the Arcade pays no credits |
| 380 | ok | **Home Garage:** your cars on a turntable with mileage, oil, w | code: LAST RACE LEFT; code: buildShelf; test: Assists tab; code: collectedShare(p) |
| 382 | ok | **Museum:** all 14 cars with their brochure text and silhouett | code: toSilhouette; code: NOT YET MET; code: app.profile.seen[e.carId] = true; code: LENGTH; test: an unseen car is unnamed; test: and a dark silhouette; test: a car seen in a race is known; test: with its brochure; test: a circuit page: length; test: then the record |
| 390 | ok | - Art space is 480×270 (height stays 270; width follows the wi | code: ui.w; code: safeName; test: wide: ${[...over] |
| 391 | ok | - **One idea per screen.** At most 7 focusable items on a scre | test: has ${seen[id].items} focusable items, at most 7; test: brochure line too long |
| 392 | ok | - Focus is a thick animated box that slides to the next item w | code: this.frameRect(x, y, w, h, col, 2); code: sfx('tick'); test: the focus box slides there; test: and arrives on the item; test: a tick on focus |
| 393 | ok | - Every screen has a prompt row along the bottom showing what  | test: has a prompt row; test: prompts Back |
| 394 | ok | - Menus move with the left stick or D-pad, with repeat; L1/R1  | test: a right click goes back; test: hover moves the focus on the Map; code: a.wheel && now.slider; test: and hides after 2 s idle; test: no cursor during a race; test: the wheel nudges a slider by a step; test: a drag turns the car |
| 398 | ok | `src/game/ui/glyphs.js` draws glyphs as `hud.sprite` rows, abo | test: the Xbox glyph setting; code: DISC; code: XBOX |
| 402 | ok | Action / DualSense / Keyboard / Mouse / | not a requirement: table header |
| 404 | ok | Steer / Left stick / A/D or ←/→ / Optional mouse steering (Set | code: mouseOn; code: KEYS_SOLO; test: mouse steering steers; test: keyboard steering goes toward 1 at 3.2 a second |
| 405 | ok | Throttle / R2 (analog) / W or ↑ / Left button with mouse steer | code: input.isDown('MouseLeft') ? 1 : 0; test: the left button is the throttle |
| 406 | ok | Brake, reverse / L2 (analog) / S or ↓ / Right button with mous | code: input.isDown('MouseRight') ? 1 : 0; test: the right button is the brake |
| 407 | ok | Handbrake / □ / Space / / | code: BTN.square; code: hand: ['Space']; test: Space is the handbrake |
| 408 | ok | Shift up, down / R1, L1 / E, Q (also Left Shift, Left Ctrl) /  | code: up: ['KeyE', 'ShiftLeft']; test: ${k} changes gear |
| 409 | ok | Camera / △ (tap) / C / / | code: cam: ['KeyC']; test: C cycles the camera |
| 410 | ok | Look back / ○ (hold) / B (hold) / / | code: back: ['KeyB']; test: B turns it round |
| 411 | ok | Look around / Right stick / / Right drag / | code: pad.axes[2]; code: input.isDown('MouseRight'); test: a right drag looks around |
| 412 | ok | Recover / △ (hold 1 s) when off the road or stopped / R (hold  | code: d.triHold >= 0.4; code: recover: ['KeyR']; test: a tap of Triangle is the camera; test: a hold is recovery |
| 413 | ok | Pause / Options / Esc / / | test: options pauses |
| 414 | ok | Confirm, back / ✕, ○ / Enter, Esc or Backspace / Left click, r | test: a right click goes back; code: back: ['Escape', 'Backspace'] |
| 416 | ok | Add `Tab`, `F` keys and arrows to `input.preventKeys` as neede | code: engine.input.preventKeys.add; test: Options is ignored while Create is held; code: 'dual-rumble'; test: vibration on a ${ty}; test: vibration on a gear shift; test: the Vibration setting stops it |
| 421 | ok | Title → (Continue / New Game) → Map | test: title has New Game, Settings, About |
| 422 | ok | Map → Licence Centre / Event Hall / Dealer Row / Tuning Street | test: opens by pad; test: handbook; test: ${item} by pad |
| 423 | ok | Event → round card → race → results → (replay) → next round →  | test: a round has results; test: on to the next round |
| 424 | ok | Pause (Options/Esc): Resume, Restart, Retire, Assists, Setting | test: all pause items |
| 429 | ok | Screen / What it is / | not a requirement: table header |
| 431 | ok | **Title** / The diorama at dusk, the title in pixel letters ov | test: title has New Game, Settings, About; code: tiny |
| 432 | ok | **Map** / The peninsula diorama (section 8). Nine buildings. S | test: nine buildings on the Map; code: ctx.camera.rayAt; code: statusStrip(ui, app) |
| 433 | ok | **Licence Centre** / The tower on the proving ground. Three li | test: test card; code: ui.say('arai', this.test.brief |
| 434 | ok | **Event Hall** / Event cards by licence tier, locked ones dimm | code: open.ok ? e.restriction : open.why; code: IT DOES NOT QUALIFY; test: a warning for a rear-drive car in a front-drive event; test: and it cannot enter |
| 435 | ok | **Dealer Row** / Used lot and three dealer showrooms. Turntabl | test: triangle shows the brochure; code: startTestDrive(id, null; code: nextRoom; test: Square is a test drive; test: one lap; test: on the same car |
| 436 | ok | **Tuning Street** / Eight tiles, four to a page: Engine, Weigh | test: parts in a tile; code: TILES.slice(this.page * 4; code: SETUP_SLIDERS.filter |
| 437 | ok | **Service Bay** / Oil change and car wash, with short animatio | code: washAnim; code: dripAnim; test: a wash costs 50; test: the brushes come out; test: the mud dissolves as they go; test: oil costs 250 |
| 438 | ok | **Home Garage** / As in section 6 / | code: LAST RACE LEFT; code: THIS IS YOUR RIDE; code: SELL FOR |
| 439 | ok | **Museum** / As in section 6 / | code: NOT YET MET; code: miniMap(ui, x + 10, 86; test: an unseen car is unnamed; test: a circuit page: length |
| 440 | ok | **Theatre** / Last race, saved replays, slots / | test: saved replay plays; code: LAST RACE |
| 441 | ok | **Arcade Gate** / Quick Race, Time Trial, Couch Duel as big ti | test: every race option |
| 442 | ok | **Race HUD** / Top-left: position `P3/8` (scale 2), lap. Top-r | code: `P${car.pos}`; code: BEST ${formatTime; code: 'KM/H'; code: wearColour; code: 'FUEL'; code: 'ABS'; test: HUD: position; test: HUD: lap; test: HUD: speed; test: HUD: PIT |
| 443 | ok | **Results** / One large table of at most 8 rows, then prize mo | test: all results items; code: cr(shown); test: the prize counts up; test: with the register at the end |
| 444 | ok | **Handbook** / Pages, one topic each: controls for your device | test: turns a page; code: WHAT YOU CAN AND CANNOT DO |
| 445 | ok | **Settings** / Tabs. **Sound:** Master, Effects, Music (defaul | test: Picture tab has Look and Pixel size; test: Controls tab; test: Assists tab; test: Settings has About |
| 449 | ok | At boot, if `matchMedia('(any-pointer: fine)')` is false and ` | test: a touch-only device gets the gate; test: a tap opens Settings; test: a Back button appears; test: attract runs on a touch-only device; test: a tap returns to the gate; test: a connected pad lifts the gate |
| 453 | ok | The engine reports `Failed to start`. Catch it and show a plai | test: no WebGPU: a plain line; code: hub.fail( |
| 459 | ok | **Base:** the engine's native look: 3D low-poly, toon material | code: setLookLayer; code: toonMaterial |
| 463 | ok | Use the car kit (C2): a side-profile slab for the body, a narr | code: carDef({ id; code: slab: o.cabin |
| 465 | ok | - **Wheels** as separate meshes: a steer pivot, then a spin gr | code: spin = wheelMesh; test: the front wheels steer; test: the wheels spin |
| 466 | ok | - **Body motion** in a parent Group: pitch from `c.ax`, roll f | code: this.body.rotation.x = this.pitch; test: the body pitches; test: the body rolls; test: the wheels stay on the road |
| 467 | ok | - **Lamps:** tail lamps `glow` in `orange`, and separate brake | code: this.brake.visible = on; code: new Trail; test: brake lamps on under braking; test: on at dusk and night |
| 468 | ok | - **Parts on the model:** lip spoiler, big wing, wheel styles  | code: hasPart(this.install, 'aeroWing'); code: rally: true; test: a big wing appears on the model; test: a lip spoiler appears on the model; test: paint recolours the model; test: a rally car has mud flaps and a roof vent |
| 469 | ok | - **Mud:** a slightly larger shell of the lower body in `orang | code: this.mudMat.dissolve = 1 - d * 0.75; test: mud shows on a dirty car; test: mud dissolves pixel by pixel; test: a rally leaves mud on the car |
| 470 | ok | - **Ghost:** the model with every mesh's material swapped for  | test: the other copy shows as a ghost; code: 'GHOST'; test: a ghost is stippled at 0.35 on every mesh; test: and casts no shadow |
| 474 | ok | `src/game/render/trackmesh.js` builds from the `tr` record: | code: export function buildTrackMesh |
| 476 | ok | - **Road:** quads per sample. Two close shades of the surface  | code: i % 4 < 2 ? theme.road : theme.road2; code: const dark = shade(theme.road, 0.72); code: s * (h + 1.6) |
| 477 | ok | - **Skirts:** ribbons from the road edge outward, 4 to 6 colum | code: cols = [0, 3, 8, 16, 30, 55, 85, 120] |
| 478 | ok | - **Barriers** at `±(width/2 + wallL/R)`: armco, tyre stacks,  | code: theme.barrier === 'armco'; code: theme.barrier === 'concrete'; code: theme.barrier === 'catch'; code: theme.barrier === 'tyres' |
| 479 | ok | - **Braking boards** at 300, 200, 100 m before major corners. | code: of [300, 200, 100] |
| 480 | ok | - **Skid marks:** a ring buffer of dark quads laid where `c.sl | code: class SkidMarks |
| 481 | ok | - **Merging:** `mergeStaticMeshes` for the static world, as th | code: mergeStaticMeshes(this.statics |
| 485 | ok | Each has its own look and landmark. Build them from primitives | code: const DRESS = { |
| 487 | ok | Track / Hour / Look / Landmarks and props / | not a requirement: table header |
| 489 | ok | **Kestrel Park** / 15:00 / Rolling English-style parkland, dee | code: bladeMesh; code: new Boids(26; code: haybaleDef; test: something in the world moves |
| 490 | ok | **Cedar Ridge** / 10:00 / Mountain forest, thin mist particles | code: d.tunnel = [s0, s1]; code: new WaterSurface({ size: [26, 18]; code: d.pine(x, y, z, 13); test: something in the world moves; test: the tunnel darkens the sky |
| 491 | ok | **Harbour Lights** / 21:00, or dusk 18:30 / Night city on the  | code: HOTEL FENN; code: fw.position.set; code: fireworksOn; code: lampPools; test: fireworks at Harbour Lights |
| 492 | ok | **Saltline Speedbowl** / 18:30 / Endless white salt at sunset  | code: blimp; code: dustDevil; code: d.flag(c.x, c.y + 34; test: something in the world moves |
| 493 | ok | **Red Clay Stage** / 17:00 / Orange canyon, low sun / Canyon w | code: theme.canyon; code: d.cactus(; test: something in the world moves |
| 494 | ok | **Proving Ground** / 11:00 / An old airfield / Control tower ( | code: 'LICENCE', [t.x; code: sock.wind; code: examiner's van; test: something in the world moves |
| 498 | ok | `applySky` gives a flat background, sun and ambient. Add depth | code: engine.ambient.intensity = s.ambientIntensity; code: const ring = (R, col; code: night < 0.6; test: Harbour at 21:00 is night |
| 502 | ok | The Map is a chunky island about 60×40 m, with a small road lo | code: ROAD_LOOP; code: new CarView(id, { scale: 0.42 }); code: showHome; code: boats; code: gulls; code: setNight; code: hourFor; test: morning at the start; test: dusk by the National licence; test: night for the Grand Prix |
| 506 | ok | Register in code, sizes whole art pixels, palette colours: tyr | code: tyreSmoke; code: dirtDust; code: gravel; code: sparks; code: rainSpray; code: exhaustPop; code: foam; code: confetti; code: firework; code: new Trail |
| 510 | ok | Transitions with `engine.screen.cover('wipe' or 'blinds')` and | code: e.screen.cover(kind; code: E.screen.flash('white'; code: E.hitstop(0.05); test: a hit-stop on a very hard one; test: no hit-stop on a soft wall hit |
| 516 | ok | **Base:** the engine's rig, `HERO_MODEL`, `HERO_RIG`, `ClipDef | code: compileClips(ALL_CLIPS; code: o.material = toonMaterial; test: clip ${c.name} |
| 518 | ok | **New clips to author as `ClipDef` data:** | not a requirement: a heading for the clip list |
| 520 | ok | - `PitJack`: crouch and pump a jack lever. | data matches the plan (clipdef) |
| 521 | ok | - `PitWheelGun`: kneel, gun to the hub, pull a wheel, fit a wh | data matches the plan (clipdef) |
| 522 | ok | - `PitFuel`: hold a fuel hose to the flank. | data matches the plan (clipdef) |
| 523 | ok | - `MarshalFlag`: wave a flag overhead (`Wave` upper body, with | data matches the plan (clipdef) |
| 524 | ok | - `ExaminerClipboard`: note something, look up, nod. | data matches the plan (clipdef) |
| 525 | ok | - `DealerPresent`: an open-handed sweep toward the car. | data matches the plan (clipdef) |
| 526 | ok | - `MechanicWipe`: wipe hands on a rag, look at the car. | data matches the plan (clipdef) |
| 527 | ok | - `PodiumCheer`: arms up, small jump; `PodiumBow`: a formal bo | data matches the plan (clipdef); code: 'PodiumBow' |
| 528 | ok | - `CrowdCheer`: a looping bob for instanced stand-ins. | data matches the plan (clipdef) |
| 530 | ok | **Procedural and mechanical motion:** | not a requirement: a heading for the list below |
| 532 | ok | - Car body pitch, roll, heave; wheels steer and spin; engine s | code: v.shake =; code: w.pivot.rotation.y = -steer; test: the engine shakes the car at idle; test: the front wheels steer |
| 533 | ok | - Turntable and slow orbit camera; a car sinking on its spring | code: v.settle = o.settle; code: .car.settle = 0.16; code: this.orbit += dt * 0.09; test: a car sinks on its springs when bought |
| 534 | ok | - **Dyno:** the car on rollers, wheels spinning, curve drawn l | test: an engine part shows the dyno; code: dynoCurve |
| 535 | ok | - **Pit stop:** the crew runs in, jack lifts the car 0.15 m wi | code: view.jack = target; code: p.play(i < 4; test: the crew run in; test: the jack lifts the car 0.15 m; test: the car comes down |
| 536 | ok | - **Car wash:** spinning brushes that travel the car, foam par | code: ctx.particles.burst('foam'; code: s.car.setDirt(had * (1 - f)); test: they travel the car; test: foam flies; test: the mud dissolves as they go |
| 537 | ok | - Start gantry lights, flags as `clothGrid`, the windsock, the | code: setLights(n, green); code: sock.step(dt); code: bladeMesh.rotation.z; code: wheel.rotation.z; code: blimp.position.set; test: five red lamps light on the gantry; test: something in the world moves |
| 538 | ok | - **Podium:** a `Timeline` scene (shots, cues, subtitles), con | code: new Timeline({ bars: 0.5, shots: [{ at: 0, position: P(b, 0, 2.2, 12); code: 'confetti'; code: so.carX; test: confetti on the podium; test: a Timeline scene |
| 539 | ok | - **Prize reveal:** dark set, one lamp comes on, then another, | code: this.cover = new Mesh; code: light(-3, 5, 2; test: the prize set starts dark; test: one lamp comes on; test: then another; test: the cover slides away; test: a fanfare; test: a voice line |
| 545 | ok | Everything is code. No audio files. All sound goes through one | code: export class AudioMix |
| 547 | ok | **Music volume defaults to 10%** on first launch and in every  | test: music at 10% on a fresh profile; test: music at 10% in a session; test: the music slider moves in 5% steps; test: is well under a thump |
| 551 | ok | `src/game/audio/enginesynth.js` is a Web Audio graph built on  | code: class EngineSynth; test: spectral centroid rises with rpm |
| 553 | ok | - Firing frequency `f0 = rpm / 60 × cylinders / 2`. Saw at `f0 | test: spectral centroid rises with rpm; code: (rpm / 60) * (cyl / 2) |
| 554 | ok | - Gain `0.35 + 0.65 × throttle`. Rev-limiter stutter at redlin | code: (0.35 + 0.65 * throttle); code: this.limT; code: this.crackle++; test: full throttle is louder than a closed one; test: the limiter stutters at the redline; test: overrun crackle with the sport exhaust; test: and none without it |
| 555 | ok | - Per-car data: cylinders (3 for the Pico, 4, 6, V8 for the Lo | code: cyl: 10; code: cyl: 12; code: cyl: 8; test: the Pico has three cylinders; test: the Longhorn a V8; test: the Corsa a V10; test: the Type 9 a V12 |
| 556 | ok | - Turbo cars: a sine whistle rising with `spool`, and a filter | code: 1500 + 3400 * spool; code: this.puffGain; test: a spooled turbo whistles; test: and the whistle rises with spool |
| 557 | ok | - Connect to `audio.context.destination` once `audio.unlocked` | code: v.master * v.sfx; test: the synth follows the car |
| 561 | ok | Other cars: up to 3 nearest get `ctx.audio.loop` voices with ` | code: this.audio.loop('carLoop'; code: spatialize(listener, it; code: Math.log2(Math.max(0.25, it.rpm / 3000)); test: other cars are looping voices pitched by rpm; code: this.tyre = loop; code: this.gravel = loop; code: this.wind = loop; code: this.rain = loop; code: this.crowd = loop; code: this.kerb =; code: 'wheelGun'; code: lapChime; code: beepGo |
| 563 | ok | **Menu sounds:** tick (focus), confirm, back, denied, the cash | code: tick: {; code: confirm: {; code: back: {; code: denied: {; code: register: {; code: whirr: {; test: a tick on focus; test: a confirm; test: a back; test: a denied; test: a cash register; test: a camera whirr in showrooms |
| 567 | ok | Eight original pieces as `Song` data (`bpm`, `tracks`, `patter | test: eight pieces and a fanfare |
| 569 | ok | Piece / Where / Feel / BPM / Key and harmony / | not a requirement: table header |
| 571 | ok | Lounge / Title, Map / Bossa lounge, soft sine lead / 92 / D♭:  | data matches the plan (song) |
| 572 | ok | Catalogue / Dealer Row, Museum / Vibraphone-like (sine, vibrat | data matches the plan (song) |
| 573 | ok | Socket Set / Tuning, Service / Light funk, muted square / 108  | data matches the plan (song) |
| 574 | ok | Examination / Licence Centre / Sparse, metronomic, polite / 12 | data matches the plan (song) |
| 575 | ok | Apex / Day races / Driving chiptune rock / 156 / E minor: i–VI | data matches the plan (song) |
| 576 | ok | City Lights / Night races / City-pop groove / 118 / B♭: Imaj7– | data matches the plan (song) |
| 577 | ok | Red Clay / Rally / Twangy, galloping / 132 / G mixolydian / | data matches the plan (song) |
| 578 | ok | The Long Drive / Replay, credits / Calm arpeggios that open ou | data matches the plan (song) |
| 580 | ok | Plus a short fanfare for medals and wins. Races start with mus | code: fanfare: {; code: music('fanfare'); code: MUSIC IN RACES; test: no music in races when asked; test: a sting or fanfare on results |
| 584 | ok | Animalese-style gibberish, written in code. `src/game/audio/vo | test: the same words make the same sound; test: a voice is audible; code: A: [800, 1150]; code: E: [400, 2000]; code: I: [300, 2400]; code: O: [450, 800]; code: U: [325, 700]; code: 0.065 +; test: Ms. Arai speaks |
| 586 | ok | Speaker / Pitch / Manner / | not a requirement: table header |
| 588 | ok | Ms. Arai, chief examiner / 210 Hz / Even, unhurried / | data matches the plan (speak) |
| 589 | ok | Benno, mechanic / 130 Hz, square / Gravelly, short / | data matches the plan (speak) |
| 590 | ok | Mr. Fenn, dealer / 180 Hz / A little lilt at line ends / | data matches the plan (speak); code: sp.manner === 'lilt' |
| 591 | ok | Dell, race commentator / 160 Hz, faster / Excited, on replays  | data matches the plan (speak); code: sp.manner === 'fast' |
| 597 | ok | **Voice.** The source's writing is a catalogue written by peop | data matches the plan (line:622) |
| 599 | ok | **Cast.** Only these four, each with a few lines per location. | code: 'arai'; code: 'benno'; code: 'fenn'; code: 'dell'; test: four speakers |
| 603 | ok | Car / Text / | not a requirement: table header |
| 605 | ok | Pico / A city car of 660 cc, made to fit where other cars can  | data matches the plan (bro) |
| 606 | ok | Kite / The Kite was a family hatchback until the engineers sta | data matches the plan (bro) |
| 607 | ok | Ginga / A front-engined, rear-drive coupe in good used conditi | data matches the plan (bro) |
| 608 | ok | Moth / Two seats, one purpose, 860 kg. Castellan removed what  | data matches the plan (bro) |
| 609 | ok | Ryu / Turbocharged, four-wheel drive, born for a rally rule th | data matches the plan (bro) |
| 610 | ok | Longhorn / A large American coupe of the old school: seven lit | data matches the plan (bro) |
| 611 | ok | Brandt 3.2 / A four-door sedan, according to the catalogue. Th | data matches the plan (bro) |
| 612 | ok | Heck / The engine sits behind the rear axle, where Brandt has  | data matches the plan (bro) |
| 613 | ok | Libeccio / Named for the south-west wind. A mid-engined V8 wit | data matches the plan (bro) |
| 614 | ok | Kite Cup / A stripped Kite for a one-make series, with a roll  | data matches the plan (bro) |
| 615 | ok | Ryu Rally / Works gravel specification: long travel, short gea | data matches the plan (bro) |
| 616 | ok | Works GT / The Ginga as the factory would like to remember it. | data matches the plan (bro) |
| 617 | ok | Corsa / Homologated in the strictest sense of the word: Vespuc | data matches the plan (bro) |
| 618 | ok | Type 9 / Built by a small works team on the Peninsula, in a sh | data matches the plan (bro) |
| 622 | ok | - **Ms. Arai, first meeting:** "Welcome to the Peninsula. A li | data matches the plan (line) |
| 623 | ok | - **Ms. Arai, C-1 brief:** "Accelerate to the marker, then bri | data matches the plan (line) |
| 624 | ok | - **Ms. Arai, fail:** "The box has not moved. Please try again | data matches the plan (line) |
| 625 | ok | - **Ms. Arai, gold:** "Thank you. That was correct." | data matches the plan (line) |
| 626 | ok | - **Mr. Fenn, on the Kite:** "A previous owner. One careful we | data matches the plan (line) |
| 627 | ok | - **Benno, oil:** "Your oil is tired. It has seen things. Two  | data matches the plan (line) |
| 628 | ok | - **Benno, new wing:** "You now have more downforce. You also  | data matches the plan (line) |
| 629 | ok | - **Dell on the results card:** "Lap record at Kestrel Park. O | code: LAP RECORD AT {TRACK}. {TIME}. THE WINDMILL DID NOT TURN TO LOOK.; test: Dell on a lap record |
| 630 | ok | - **Loading tips:** "BRAKE IN A STRAIGHT LINE. A TYRE HAS ONLY | data matches the plan (line) |
| 631 | ok | - **Map blurbs:** Licence Centre, "EVERY DRIVER BEGINS WITH A  | data matches the plan (line) |
| 633 | ok | Write the rest in this voice: all test briefs and tips, event  | test: line uses the font |
| 639 | ok | After **10 s without input** on the title or the Map, start `s | test: attract starts after 10 s idle; test: any input returns to the title; test: no attract before 10 s; test: attract starts at 10 s on the Map; test: any input returns to the Map; test: and the save is untouched |
| 641 | ok | # / Clip / Shows / Seconds / | not a requirement: table header |
| 643 | ok | 1 / Title card, `DEMO`, music / Identity / 3 / | data matches the plan (clip) |
| 644 | ok | 2 / Showroom: three cars on the turntable, brochure text, Mr.  | data matches the plan (clip) |
| 645 | ok | 3 / Tuning: dyno pull with before and after curve, new wing ap | data matches the plan (clip) |
| 646 | ok | 4 / Licence B-1 demonstration, medal awarded / Licences / 10 / | data matches the plan (clip) |
| 647 | ok | 5 / Kestrel Park: AI race, starts in chase, cuts to TV cameras | data matches the plan (clip) |
| 648 | ok | 6 / Red Clay: the Ryu over a crest, dust, a handbrake hairpin  | data matches the plan (clip) |
| 649 | ok | 7 / Harbour Lights at night, then a pit stop with the crew / N | data matches the plan (clip) |
| 650 | ok | 8 / Saltline: slipstream at 300 km/h past the blimp / Speed /  | data matches the plan (clip) |
| 651 | ok | 9 / Podium, prize car reveal / Rewards / 8 / | data matches the plan (clip) |
| 652 | ok | 10 / Credits card: `PRESS ANY BUTTON` / Call to action / 4 / | data matches the plan (clip) |
| 654 | ok | Each race clip is a real `RaceScene` with AI on every car, `en | code: god: true; test: race clips run real scenes; test: attract never changes the save |
| 660 | ok | `DEV MODE` is an ordinary item in the pause menu (hidden only  | test: Dev Mode is on the pause menu; test: dev mode opens from the Map; test: dev flag; test: no quit, restart or Dev Mode |
| 662 | ok | **Live sliders** (left/right changes it at once, ✕ resets one, | test: dev slider changes env live; test: triangle resets all; code: reset: () => { s.set(app, s.def); test: Cross resets one slider; test: the mouse drags a slider; test: Reset all clears it |
| 664 | ok | Slider / Default / Range / Sim hook / | not a requirement: table header |
| 666 | ok | Grip / 1 / 0.5–1.5 / `env.gripScale` / | data matches the plan (slider); test: Grip: more grip covers more road |
| 667 | ok | Power / 1 / 0.5–2 / `env.powerScale` / | data matches the plan (slider); test: Power: double power accelerates harder |
| 668 | ok | Brake strength / 1 / 0.5–1.5 / `env.brakeScale` / | data matches the plan (slider); test: Brake strength: weak brakes stop longer |
| 669 | ok | Downforce / 1 / 0–2 / scales `clA` / | data matches the plan (slider); test: Downforce: more load at speed |
| 670 | ok | Tyre wear / 1 / 0–5 / `env.wearRate` / | data matches the plan (slider); test: Tyre wear: five times |
| 671 | ok | Fuel use / 1 / 0–5 / `env.fuelRate` / | data matches the plan (slider); test: Fuel use: five times |
| 672 | ok | Steering rate / 3 / 1–8 / `inp.steerRate` / | data matches the plan (slider); test: Steering rate: turns in faster |
| 673 | ok | Stability strength / 1 / 0–2 / scales `asm` / | data matches the plan (slider); test: Stability strength scales asm |
| 674 | ok | Traction strength / 1 / 0–2 / scales `tcs` / | data matches the plan (slider); test: Traction strength scales tcs |
| 675 | ok | AI pace / event / 0.7–1.05 / `skill` / | code: v < 0.7 ? null : v; code: max: 1.05; test: AI pace: a lower pace covers less road |
| 676 | ok | AI rubber band / 0 / 0–0.03 / adds to `skill` by gap / | data matches the plan (slider) |
| 677 | ok | Wall speed loss / 1 / 0–2 / scales the barrier's `keep` / | data matches the plan (slider); test: Wall speed loss: a harder wall keeps less speed |
| 678 | ok | Slipstream / 0.65 / 0.4–1 / `dragScale` / | data matches the plan (slider); test: the Slipstream slider changes it |
| 679 | ok | Prize money / 1 / 0–5 / career / | data matches the plan (slider); test: Prize money scales the purse |
| 680 | ok | Chase distance, FOV / 8.5, 58 / 4–14, 40–90 / camera / | code: def: 8.5, min: 4, max: 14; code: def: 58, min: 40, max: 90; test: the Chase distance slider moves it; test: the FOV slider moves it |
| 682 | ok | **Tools:** | not a requirement: a heading for the tool list |
| 684 | ok | - Teleport along the track (scrub `s`), finish now in position | test: teleport moves the car; code: FINISH NOW IN POSITION; code: END RACE; test: finish now in position 2; test: end race places you last |
| 685 | ok | - Time scale 0.25, 0.5, 1, 2, 4. Pause and frame step. Save st | test: load state goes back; test: one frame steps while paused; code: SCALES = [0.25, 0.5, 1, 2, 4]; test: the Slipstream slider changes it |
| 686 | ok | - God mode (no wall loss, no wear, no fuel use). | test: god mode on; test: God mode: no wear, no fuel use |
| 687 | ok | - Free camera; engine debug panel (`engine.showDebug`). | code: FREE CAMERA; code: app.engine.showDebug; test: the free camera flies; test: the engine debug panel opens |
| 688 | ok | - Overlays: racing line and speed profile, wheel load and slip | test: overlay ${k} on |
| 689 | ok | - Give credits; unlock all cars; pass all tests with gold; win | test: give credits; test: unlock all cars; test: all tests at gold; test: jump to an event; code: RESET THE SAVE |
| 690 | ok | - Hour of day, rain toggle, field size, change car on the spot | test: rain toggles by restarting; code: HOUR OF DAY; code: FIELD <; code: CHANGE CAR; code: START ATTRACT MODE NOW; test: hour of day restarts at that hour; test: field size restarts with fewer cars; test: change car on the spot; test: start attract now |
| 692 | ok | Sliders persist for the session and are cleared by Reset. Meda | code: if (app.devActive()) { o.notSaved = true; code: !app.devActive() && me?.bestLap; code: DEV; test: no record with a slider off default; test: no medal with a slider off default; test: with sliders at default the record is saved; test: HUD: the DEV tag |
| 698 | ok | The brief points to the AI Hub session protocol, in the hub re | file: tools/hub/README.md |
| 702 | ok | Why ghost and not shared world: every copy runs its own physic | not a requirement: the reason for ghost mode |
| 704 | ok | **Tags,** in `<head>`, after the client: | not a requirement: a heading for the tags below |
| 707 | ok | <meta name="hub:session" content="1"> | code: name="hub:session" content="1"; test: the tag ${k} comes after the client |
| 708 | ok | <meta name="hub:session-players" content="1-4"> | code: hub:session-players" content="1-4"; test: the tag ${k} comes after the client |
| 709 | ok | <meta name="hub:session-mode" content="ghost"> | code: hub:session-mode" content="ghost"; test: the tag ${k} comes after the client |
| 710 | ok | <meta name="hub:session-minutes" content="4"> | code: hub:session-minutes" content="4"; test: the tag ${k} comes after the client |
| 711 | ok | <meta name="hub:session-goal" content="Lowest time wins: same  | code: hub:session-goal"; test: the goal tag |
| 712 | ok | <meta name="hub:session-howto" content="Steer stick or A D. R2 | code: hub:session-howto"; test: the how-to tag |
| 713 | ok | <meta name="hub:webgpu" content="required"> | code: hub:webgpu" content="required"; test: the tag ${k} comes after the client |
| 716 | ok | The hub's examples also carry `hub:type` and `hub:players`: us | code: hub:type" content="Game"; code: hub:players" content="1-2"; test: the tag ${k} comes after the client |
| 718 | ok | **A round:** | not a requirement: a heading for the list below |
| 720 | ok | - When `AIHub.active`: no title, no menus, no attract, no Dev  | code: if (hub && hub.active); code: if (this.session) return; test: no quit, restart or Dev Mode |
| 721 | ok | - `AIHub.rng('round')` picks the same round on every copy: tra | code: hub.rng('round'); code: ROUNDS = [['kestrel', 2], ['cedar', 2], ['harbour', 2], ['saltline', 4]]; code: ROUND_CARS = ['ginga', 'ryu', 'brandt32', 'kite']; test: the same car on every copy; test: the same track on every copy; test: a track from the round's list; test: the same hour, rain and laps on every copy |
| 722 | ok | - **Own card** (`card: true`), so the round opens in the game' | code: card: true; test: host leaves; test: M asks for more time, Enter answers Ready |
| 723 | ok | - Call `AIHub.ready()` as soon as the scene is built, with no  | code: hub.ready(); test: the round starts; test: a touch-only device still calls ready |
| 724 | ok | - **Start:** on `start`, three red lights with `AIHub.time()`  | code: hold: true; code: sim.go(); test: three red lights; test: the controls are locked; test: green at zero, and the car goes; test: no AI cars in a round |
| 725 | ok | - **While racing:** at 10 Hz, `AIHub.send({ t: 'g', a: trackId | code: hub.send({ t: 'g', a: sim.tr.id; code: hub.progress({ score; code: BUFFER = 150; test: about 10 messages a second; test: sent unreliably; test: small: ${net.size} bytes; test: interpolated through a 150 ms buffer |
| 726 | ok | - **Finish:** `AIHub.result({ time: Math.round(AIHub.time()),  | code: hub.result({ time: Math.round(tl()); code: t: 'done'; test: a finished player can follow another ghost |
| 727 | ok | - **`time-up`:** if not finished, `AIHub.result({ score: total | code: hub.on('time-up'; test: time up: a result; test: by distance |
| 728 | ok | - **`leave`:** remove that ghost. **`end`:** stop input and al | code: hub.on('leave'; code: app.mix.stopAll(); test: end stops the sound; test: no engine synth left; test: the mix is at zero |
| 729 | ok | - **Menu:** Options or Esc opens settings over the running rac | test: it never pauses; test: no quit, restart or Dev Mode; test: back closes it; test: Options is ignored while Create is held |
| 730 | ok | - **Rules:** no `alert`, `confirm`, `prompt`, `window.open`, n | code: safeName(p?.name; test: no ${name} in the game; test: no other network |
| 731 | ok | - If the device is touch-only: show the required-input message | code: CONTROLLER OR KEYBOARD REQUIRED; test: and shows the required-input message; test: on time up it reports a score of 0 |
| 735 | ok | Your brief's phrase "as well as for the game on its own" is re | test: outside a session it still reaches the title; test: a duel starts |
| 737 | ok | **Couch Duel** (Arcade Gate): two players, one TV, split scree | test: the second engine is disposed; test: pad 1 is P1, pad 2 is P2; code: KEYS_P2; code: e2.audio.persist = false; code: k === 0 ? -0.6 : 0.6; test: no pads: P1 on WASD; test: one pad: the pad is P1; test: one pad: the keyboard is P2; test: two pads: pad 2 is P2; test: Enter and Space remapped |
| 739 | ok | **Also:** Time Trial's ghost can be raced in turn by whoever h | code: PASS THE PAD; test: pass the pad; test: the first lap becomes the ghost; test: a slower lap does not replace it; test: a faster one does; test: the ghost comes back next time |
| 745 | ok | The brief says exactly what this must contain. Build it once,  | file: ../exit-interview.json |
| 747 | ok | 1. Fill in the exit-interview file the brief names, in the exa | file: ../exit-interview.json |
| 748 | ok | 2. `tools/build.mjs` reads that file and embeds it, so the in- | code: exit-interview.json |
| 750 | ok | **The About screen** is paged for the TV, reached from Title,  | test: About opens from the title; test: ${item} by pad; code: new AboutScreen(app) |
| 752 | ok | - **Source Information:** date, source, plan (this plan's file | test: About has ${f} |
| 753 | ok | - **Testing Feedback, Engine Feedback, Prompt Feedback:** each | test: five sections |
| 754 | ok | - **Credits:** the game's title and maker line; "Inspired by"  | code: 'THREE.JS'; code: 'RAPIER'; code: 'SWEETIE 16'; code: KIT_CREDITS; test: the kit's CREDITS.md is there; test: the wheel scrolls it |
| 756 | ok | Paginate long answers. Never use a dense wall: it's still a TV | code: n + need > 17; test: wide: ${[...over] |
| 758 | ok | Use the same answers in your final chat reply, as the brief re | not a requirement: done in the final report |
| 760 | ok | **The `aiHub` block:** type `Game`, genre `Racing`, source and | file: ../exit-interview.json |
| 762 | ok | **Research:** the director's research on the kit, the hub prot | not a requirement: no web research was done; the exit interview says so |
| 768 | ok | The brief's rules: one command that prints only failures and a | code: tests: ${passed} passed, ${failed} failed |
| 770 | ok | Write `node tools/test.mjs [suite...]`. Suites cache by file h | code: cache[s]?.hash === hash |
| 772 | ok | Suite / Runs in / Covers / | not a requirement: table header |
| 774 | ok | `sim` / Node, seconds / The regression table in Appendix B ±3  | test: on ${k} lap; test: same inputs give the same race; test: tyres wear over distance |
| 775 | ok | `data` / Node / Every id resolves; every event winnable with a | test: has a qualifying car; test: brochure line too long |
| 776 | ok | `career` / Node / Money, licences, unlocks, prizes, oil, days; | test: migrates to the current version |
| 777 | ok | `headless` / Node, `Engine.headless` / Menu flows by actions:  | test: a replayed recording ends on the same fingerprint; test: reset restores music to 10% |
| 778 | ok | `play` / Node, `Engine.headless` / **The whole game by script: | test: no dev tools were used; test: the game is finished |
| 779 | ok | `browser` / Playwright, the built HTML from `file://` / Boots  | test: a touch-only device gets the gate; test: the second engine is disposed |
| 780 | ok | `audio` / Playwright / `enginesynth` rendered in an `OfflineAu | test: spectral centroid rises with rpm; test: tyre squeal is counted; test: is well under a thump |
| 781 | ok | `hub` / Playwright, harness served on an OS-picked port from a | test: host leaves; test: outside a session it still reaches the title |
| 783 | ok | **Machine notes.** | not a requirement: a heading for the notes |
| 785 | ok | - Chromium flags that worked for WebGPU: `--enable-unsafe-webg | not a requirement: a machine note, used in tools/tests/_browser.mjs |
| 786 | ok | - System Python has Playwright: `from playwright.sync_api impo | not a requirement: a machine note |
| 787 | ok | - The kit's `check.mjs` picks its own port. For the harness, r | test: no port |
| 788 | ok | - One or two browsers at a time. Close them. Stop only your ow | not a requirement: a machine note, followed |
| 789 | ok | - In tests, drive time with `engine.step(n)` rather than waiti | not a requirement: a machine note, followed |
| 791 | ok | **Look at these at 1920×1080**, when their code changes, becau | not a requirement: done by eye: see tools/shots.py and the final report |
| 797 | ok | Risky and central first. After each step, the game should run. | not a requirement: the build order; each step is checked at its own line |
| 799 | ok | 1. **Pipeline.** Kit in `src/`, `tools/build.mjs` (C1), a blan | file: tools/build.mjs; file: tools/test.mjs |
| 800 | ok | 2. **Sim in Node.** Port Appendix A and B. The `sim` suite mus | test: same inputs give the same race |
| 801 | ok | 3. **One car on one track.** Track mesh, car kit, chase camera | code: class ChaseCam; code: class EngineSynth |
| 802 | ok | 4. **A race.** AI field, rolling start, results, replay record | test: a rolling start; test: all results items |
| 803 | ok | 5. **All tracks, dressed.** Hour, night, rain, dirt, crests, s | code: const DRESS = { |
| 804 | ok | 6. **Menu world.** UI widgets, glyphs and prompts, Map, Dealer | test: nine buildings on the Map |
| 805 | ok | 7. **Career.** Licences and medals, events, tuning, setup slid | test: wins ${id} |
| 806 | ok | 8. **Pit stops and rally,** then the Harbour Lights 200. | code: class PitCrew; test: two legs of three wins the rally |
| 807 | ok | 9. **Attract mode, Dev mode, Settings, touch gate, About.** | test: attract starts after 10 s idle; test: five sections |
| 808 | ok | 10. **Multiplayer.** Hub round first (harness), then Couch Due | test: host leaves; test: the second engine is disposed |
| 809 | ok | 11. **Whole-game playthrough script,** balance, audio mix, voi | test: the game is finished |
| 810 | ok | 12. **Finish.** Exit interview, final build, every suite green | file: ../exit-interview.json |
| 812 | ok | **If budget runs short,** cut content counts and never feature | not a requirement: the budget did not run short: full content, nothing cut |
| 820 | ok | The brief asks for / Here / | not a requirement: table header |
| 822 | ok | Genre and perspective picked / §1 / | file: ../exit-interview.json |
| 823 | ok | Title: playful riff, brainstormed, picked by real RNG / Yours, | code: export const TITLE = 'GRAN TUMBLEWEED' |
| 824 | ok | Whether to research / §15 / | file: ../exit-interview.json |
| 825 | ok | One HTML, named as the brief says, dev files in the named subf | file: tools/build.mjs |
| 826 | ok | Build on the kit, engine unchanged / §3, §4 / | file: src/pixel-engine.js |
| 827 | ok | Art: engine's style as base, new assets for the source's feel  | code: CAR_MODELS |
| 828 | ok | Animation: engine's system as base, new animations / §9 / | code: GAME_CLIPS |
| 829 | ok | Audio in code; gibberish voices; music at 10% by default / §10 | test: the same words make the same sound; test: music at 10% on a fresh profile |
| 830 | ok | Online: hub protocol, in a session and on its own / §14, C4 / | test: host leaves; test: the second engine is disposed |
| 831 | ok | Share the machine; `file://` first; OS-picked ports; own PIDs  | test: '--bind', '127.0.0.1'; test: boots into the menu |
| 832 | ok | Performance out of scope; add detail freely / §3 fact 17, §8 / | not a requirement: a note: performance is out of scope |
| 833 | ok | Headless tests; a scripted whole-game run; one command; one-li | test: the game is finished; code: tests: ${passed} passed, ${failed} failed |
| 834 | ok | No subagents to review or debate / §16 / | not a requirement: a rule on process: no subagents were used |
| 835 | ok | Original game, feature-complete demo, long enough to show ever | test: the game is finished |
| 836 | ok | Infrastructure for designers to continue / §4 Designer tools / | file: docs/adding-content.md |
| 837 | ok | Dev mode from the pause menu, live sliders, reset / §13 / | test: dev slider changes env live |
| 838 | ok | Attract mode at 10 s, any input exits, may cheat / §12 / | test: attract starts after 10 s idle; test: attract never changes the save |
| 839 | ok | Narrative tone like the source's / §11 / | data matches the plan (line:622) |
| 840 | ok | 10-foot, controller-first, native keyboard and mouse, not dens | test: has ${seen[id].items} focusable items, at most 7; test: prompts follow the mouse |
| 841 | ok | Prompts follow last input; PlayStation glyphs, Xbox option / § | test: the Xbox glyph setting; test: prompts follow the keyboard |
| 842 | ok | Touch-only gate, settings button, attract runs / §7 / | test: a touch-only device gets the gate |
| 843 | ok | No TODOs, placeholders or stubs / §17, below / | grep: none in the game |
| 844 | ok | Effort as you see fit / §17 sets the order and what may shrink | not a requirement: a note on effort |
| 845 | ok | This computer: pad stubs, touch profiles, Web Audio checks, 10 | test: the second engine is disposed; test: a touch-only device gets the gate; test: spectral centroid rises with rpm |
| 846 | ok | Source Information, Testing, Engine and Prompt Feedback in cha | test: five sections |
| 847 | ok | Exit interview file in the brief's exact shape / §15 / | file: ../exit-interview.json |
| 851 | ok | - [ ] `node tools/test.mjs` is all green, with the hub suite p | test: host leaves |
| 852 | ok | - [ ] The scripted playthrough finishes the career with no Dev | test: no dev tools were used |
| 853 | ok | - [ ] The built HTML runs from `file://`, with `session.js` un | test: the hub client is unmodified and the first script after the charset; file: src/pixel-engine.js |
| 854 | ok | - [ ] Music starts at 10% on a fresh profile and in a session. | test: music at 10% on a fresh profile; test: music at 10% in a session |
| 855 | ok | - [ ] Grep for `TODO`, `FIXME`, `placeholder`, `stub`, `coming | grep: none in the game |
| 856 | ok | - [ ] Every menu item does something. Every car, track, test a | test: every item on ${id} does something; test: every car can be obtained; test: every circuit is driven in the career; test: opens by pad |
| 857 | ok | - [ ] You looked at the 1080p screenshots. | not a requirement: done by eye: see the audit notes in the final report |
| 858 | ok | - [ ] About/Credits shows real answers. The exit-interview fil | test: About has ${f}; file: ../exit-interview.json |
| 859 | ok | - [ ] No stray servers or browsers of yours left running. | not a requirement: checked by process id after each browser run |
| 114 | ok | The folder map | all 54 paths present |
