# Game plan: a balance-and-wellness comedy inspired by Wii Fit

You will build this game from this plan alone. The director is not available for questions.

## 0. How to read this plan

- **Your brief** means the brief in your own working folder. It wins on the title method, file and folder names, dates, the deliverables and the feedback questions. This plan names none of them.
- **Paths** are relative to the dev folder your brief tells you to create. Clone the engine to `engine/` inside it.
- **Numbers** are starting values. Tune them with the dev sliders and the bot. The structure is decided; change it only if it fails in play.
- **Gaps:** if something is not covered, decide, write one line in `notes/decisions.md`, and carry on.
- **Verified** means it was run on this computer on 2026-11-04, against engine commit `49ef2ba` and AI Hub client 1.4.0. Section 15 lists those results.
- **Title:** pick it first, the way your brief says. Keep it in one constant. This plan calls it "the game". The resort's name, Tippy Cay, belongs to the world and does not depend on the title.
- **Reading cost:** you do not need to read the engine's source to start. Read `engine/docs/MAKE_A_GAME.md` whole (about 3k tokens) and `engine/crates/pav_core/src/games/starter.rs`, then use this plan. Search `engine/docs/REFERENCE.md` and `engine/docs/ASSET_STUDIO.md` when you need a tool or a prop field.

## 1. The game in one page

You have won a five-day stay at Tippy Cay, a small wellness resort staffed entirely by talking gym equipment. You do not remember entering. Each morning a relentlessly pleasant wobble cushion tests your balance and gives you a Balance Age. Each day you walk the island, try short stillness, strength, cardio and balance events, and bank minutes in a giant clam. Checkout requires a Balance Age of 40 or better. Day 5 ends in the Big Stand, a finale whose last test is to do nothing at all for thirty seconds while the game tries to make you press something.

- **Genre:** sports mini-game anthology with a light life-sim frame (daily ritual, unlocks, wardrobe). Catalogue genre: Sports.
- **Perspective:** third person throughout, with a camera chosen per activity: 3/4 follow on the island, a mirror-style front view for exercises on the spot, chase for the jog and the paddle, high 3/4 for the table, side view for the dives.
- **Length:** a first run takes 25 to 40 minutes. It shows every feature. Free play follows.

| What makes Wii Fit distinctive | How this game turns it into play |
|---|---|
| A balance board: your centre of pressure is the only verb, and tiny movements matter | The Balance Core (section 4): one analog dot driven by lean. Every event is played through it |
| The body test and the verdict of a fitness age | The Morning Wobble Check and Balance Age. Never weight, BMI or body shape |
| Equipment that talks: cheerful, polite, quietly rude | Pip, a talking wobble cushion, plus a whole staff of talking gear |
| A calm, uncanny instructor | Posey, a faceless wooden artist's mannequin |
| Four disciplines: yoga, strength, aerobics, balance games | Four pavilions, each with its own coach and events |
| The daily ritual: calendar stamps, banked minutes that unlock more | Calendar stamps and the Minute Clam |
| Noticing how long you stayed away | Real-date absence comments from Pip |
| A family sharing one board and comparing progress | Hot-seat Medley, Yesterday You ghosts, AI Hub sessions |
| Clean, quiet, pastel, unintentionally funny | High-key pastel look, gentle lounge music, short deadpan text |

**Pillars.** Check every decision against these.
1. **Small movements, big consequences.** Mastery means doing less. The best moments are held breaths.
2. **Deadpan encouragement.** Everything you do is commented on, kindly, and slightly too honestly.
3. **A daily ritual.** Check in, get a number, do your exercises, get a stamp.
4. **Calm surface, silly underneath.** The screen stays serene while a seagull stands on your head.

**Originality rules.** This is an original game in the same genre, not a recreation.
- Inside the game, use no Nintendo names (Wii, Mii, Balance Board and so on). The only exceptions are the Source line on the About screen and whatever your title's riff requires.
- No white rectangular board with dot eyes. No pale human trainer in a tank top and ponytail. No Mii-style avatars or face editors. No island or plaza from the source series.
- No source music, jingles, menu layouts or screen compositions. Do not quote or paraphrase its lines. Write your own.
- Events have their own names and twists, as specified below.
- Respect bodies: no weight, BMI, body-shape jokes or diet talk anywhere. Pip judges your wobble, your habits and your absences.

## 2. Structure of play

**Boot:** title screen over a slow island sweep. Menu: New Stay or Continue, Play Together, Settings, About. After 10 seconds with no input on the title or any pre-game menu, attract mode starts (section 12).

**New Stay:** choose one of 4 guest slots, pick a name from a list of about 40 funny preset names (no on-screen keyboard), pick a look (6 skin tones, 8 outfits). Then a short intro with Pip at reception, skippable.

**A day:**
1. Wake on the cabana deck. Pip greets you, with an absence comment if real days have passed.
2. Morning Wobble Check (about 70 seconds), Balance Age reveal, Pip's comment.
3. Free time on the island: walk, talk to guests, find lost flip-flops, step on an event mat. The Schedule (Triangle or Tab) lists everything and fast-travels.
4. When the day's minute goal is met, Pip says so. Sleep at your cabana (or choose End Day in the Schedule). A big stamp lands on the Calendar. Next day.

| Day | Opens | Minute goal | Story beat |
|---|---|---|---|
| 1 | Stillness Studio: Breath Bloom, Pose Parade | 3 | Arrival. The checkout rule. "Nobody has asked to leave yet" |
| 2 | Iron Gazebo: Tempo Squats, Plank Standoff | 5 | Big Kettle. Wardrobe opens |
| 3 | Boardwalk: Step Party, Floatie Spin, Morning Lap | 7 | Yesterday You appears as a ghost. "I am not comparing you" |
| 4 | Lagoon: Tide Table, Paddle Slalom, Tray Trek, Cannonball Cup | 9 | Guests start whispering about the Big Stand |
| 5 | The Big Stand, after the morning check | none | Finale, ending, free play |

**Minutes:** the first clear of an event each day banks 1 + stars (0 to 3 stars, so 1 to 4 minutes); repeats bank 1. Resort minutes are openly not real minutes ("Our minutes are longer. It is a wellness thing").

**Endings:** Balance Age 40 or better: you may check out, by rowboat (`LIB/core/rowboat`). Otherwise: the Extended Stay ending, gentle and funny. Both roll credits, then unlock Free Play: every event open, personal bests, star goals, and a calendar that keeps stamping real days.

**Bot rule:** `Game::bot` must be able to play this entire flow, menus included, from New Stay to the credits. That is your scripted playthrough and the base of attract mode.

## 3. Controls

The left stick is both walking and leaning. Prompts always show the glyph for the input used last.

| Action | DualSense (standard mapping) | Keyboard | Mouse |
|---|---|---|---|
| Walk on the island, lean in events | Left stick | W A S D (arrows also walk) | Island: click a place or thing to walk there. Events: cursor offset from screen centre is the lean |
| Fine lean | Stick itself | Hold Shift (half key rate) | Small cursor moves |
| Jog on the island | Hold R2 | Hold Shift | |
| Action: talk, begin, inhale, squat, bounce | Cross | Space | Left button |
| Left step / right step | L1 or L2 / R1 or R2 | Q or Left / E or Right | Left button / right button |
| Brace (hold both) | L2+R2 or L1+R1 | Q+E | Both buttons |
| Wave at someone | Square | F | |
| Schedule | Triangle | Tab | |
| Island camera | Right stick | | Right-drag, wheel zooms |
| Pause | Options | Esc | |
| Menus | D-pad or left stick, Cross confirms, Circle backs, L1/R1 change tabs | Arrows or W A S D, Enter or Space, Esc backs, Q/E change tabs | Hover moves focus, click activates, right-click backs |

Xbox glyphs (Settings option) swap A B X Y, LB RB LT RT, Menu. Ignore Options while Create is held: that pair belongs to the AI Hub. Disable the engine's own keys (F1 to F10, digits, H, Backspace rewind, right-drag tilt) outside dev mode. Keep F11 for fullscreen.

## 4. The Balance Core

One struct, `BalanceCore`, used by every event. Its state is `cob` (the dot, unit disc, x right, y up on screen) and `vel`.

```
target = shaped lean input * reach + wobble(t)
acc    = (target - cob) * stiffness - vel * damping + gust + nudge
vel   += acc * dt
cob   += vel * dt
tip    = |cob| > 1 for tip_time seconds
```

Start with `stiffness 40`, `damping 8.5`, `reach 0.92`, `tip_time 0.35`. `wobble` is `amp * (0.7 * sin(2*pi*1.3*t + a) + 0.3 * sin(2*pi*2.9*t + b))` per axis, phases from `sim.state.rng`, base `amp 0.12`, scaled per event and by fatigue, plus a velocity kick of 0.1 units/s in a random direction every 1 to 2 seconds. Use sim time, never the clock.

**Feel targets** (these numbers give them, by numeric simulation at 60 ticks/s): full stick reaches 90% in about 0.4 s with about 5% overshoot, like a body. Release settles in about 0.45 s. Left alone, the dot wanders at a mean radius of 0.05, at most 0.08. A held full lean does not tip by itself; a gust on top of it does.

**Input shaping** (in `pav_app`, passed as `InputFrame.lean`, screen space):
- **Stick:** deadzone 0.12, response curve `x^1.5` so small motions are fine.
- **Keyboard:** keys move the target at 1.6 units/s and it returns at 1.2 units/s when released. Tapping gives small nudges, so keys feel native, not bang-bang.
- **Mouse:** cursor offset from the screen centre divided by 0.38 of the window height, clamped to the disc. No pointer lock. The device moved last wins.

**Body:** the figure tilts with the dot (`cob * 14` degrees about the feet, engine change in section 14). Beyond |cob| 0.75 an upper-body arm-flail clip fades in. A tip plays a stumble and, over water, a splash. Tips never end the game; they cost time or score.

**HUD, the Puck:** a large circular gauge drawn in egui: a pale disc, a green target ring, a coral dot, and stars at the edge when streaking. It must read from 10 feet. It looks good at 340 px diameter at 1080p (verified). Put it top centre or bottom centre, whichever does not cover the figure in that event.

## 5. Events

**Common frame:** event card (name, one-sentence goal, glyph prompts, one coach line), 3-2-1, play, result (score 0 to 1000, stars at 400, 650 and 850, a deadpan Title, minutes banked, personal best, difference from Yesterday You; Retry or Back).

**Every event has:** a section of tunable numbers in `rules.toml`, a bot that earns at least 2 stars, an idle-input outcome below 1 star, a ghost lane, and an attract segment. Scenes `fit/event/<name>` start an event directly, for tools and tests.

### Stillness Studio (Posey). Set: `studio`, a round white deck on a calm dawn lagoon. Camera: mirror view (yaw 0, tilt 12, distance 8.5, fov 36; the figure faces +Z, toward the camera, and stick right is screen right).

**Breath Bloom** (45 s). Hold Action to inhale, release to exhale, following a guide ring: 4 s in, 4 s out, 5 cycles, the last one longer. `lungs` rises while held and falls when not. Keep the dot inside a centre ring of radius 0.35. Tick score: `0.7 * (1 - clamp(|lungs - guide| / 0.35)) + 0.3 * inRing`. Each good cycle opens a lotus on the water with a rising pentatonic chime; a perfect run blooms the whole pond. Scrub the clip `FIT/Breath` by `lungs`. No fail state. Bot: holds while the guide rises.

**Pose Parade** (3 poses, 20 s each). Six hand-keyed poses with deadpan names: the Patient Heron, the Apologetic Lunge, the Tired Lighthouse, the Folded Deck Chair, the Reluctant Bridge, Seated Disappointment. Day 1 uses the first three. Posey holds the pose beside you. A target ring (radius 0.30 shrinking to 0.18) drifts on a slow Lissajous path (amplitude 0.35, 0.12 Hz). Inside the ring a streak multiplier climbs x1 to x4, one step per 2 s; leaving resets it. At 12 s of pose 2 a gull lands on your head and wobble is x1.6 for 5 s ("There is a bird on you. Accept the bird"). A tip breaks the pose for 1.5 s. Score: time in ring weighted by multiplier. Bot: PD toward the ring centre.

### Iron Gazebo (Big Kettle). Set: `gazebo`, a white iron gazebo at golden hour. Camera: 3/4 front.

**Tempo Squats** (10 reps, about 50 s). Hold Action to go down (2 s to full depth), release to rise (1 s). A guide bar shows the tempo; a low bell marks the bottom. Keep the dot in a band |x| < 0.25; wobble grows 8% per rep. Rep score: `0.7 * timing + 0.3 * band`. Scrub `FIT/Squat` by depth. Gag: rep 10 is followed by "Ten. Also eleven." Bot: follows the guide.

**Plank Standoff** (up to 60 s). Hold Brace and keep the dot in a ring shrinking from 0.40 to 0.20. Releasing, or leaving the ring for more than 1 s, collapses you in a comic flop. Fatigue ramps wobble; at 30 s add tremble; at 45 s Kettle laughs at his own joke and the nudge shakes the screen. Score: seconds survived / 60. Stars at 25, 40 and 55 s. Kettle, who has no arms, plank-talks you through it. Base the pose on one frame of `MESH2MOTION/Pushup`. Bot: survives at least 45 s.

### Boardwalk (Bounce). Set: `boardwalk`, a beach boardwalk at bright midday.

**Step Party** (64 s, 96 BPM, song 4). A rhythm game: notes in two lanes fall to two footprints, left, right or both, on an aerobic step box. Perfect within 55 ms, Good within 120 ms. About 100 notes, data in `charts.toml`, starting with quarter notes and building to eighths and doubles. Bounce bounces on the beat and guests clap on downbeats. Timing uses the audio clock (section 10). Camera: mirror view, slightly high. Bot: presses exactly on each note.

**Floatie Spin** (50 s). Circle the lean (stick, mouse, or rolling W-D-S-A) to spin inflatable rings around your hips. Spin speed is the smoothed angular velocity of the lean while |lean| > 0.4; the sweet band is 6 to 9 rad/s, and a `spin_band_scale` rule widens it for keyboard. "Switch!" flips the required direction every 15 s. Guests toss new rings from left or right: press that side's step within 0.25 s of arrival to catch it. Out of band, rings sink; on the floor they are lost. Maximum 7 rings. Score: rings times time in band. Rings are no-physics entities positioned in code. Bot: 7.5 rad/s circle, presses on arrivals.

**Morning Lap** (about 90 s, one lap of the hub island). Alternate left and right steps to set your pace (1.6 to 2.4 steps/s is the zone). Too fast raises a stitch meter that makes you stumble; too slow and Bounce, the pacer rolling ahead, gets away. The path steers you; lean moves you up to 1.2 m sideways to dodge crabs, sunbathers and towels and to grab ribbons. Flip-flops can be found here too. Score: time in zone, plus ribbons, minus bumps. Camera: chase with per-tick yaw. Use `MESH2MOTION/Jog` scaled to speed. Bot: 2 steps/s, steers to ribbons.

### Lagoon (Commodore Gull). Sets: `tide`, `channel`, `pier`, `tower`.

**Tide Table** (3 boards, 60 s total). You stand on a floating square raft and your lean tilts it. Roll hermit crabs in shells into tide pools. Board 1: 3 shells. Board 2: 5 shells and a moving pool. Board 3: 7 shells, bumpers and a rising tide. Fast shells skip over pools. Write the shell physics as simple 2D code (`a = tilt * g - friction * v`, wall bounce 0.5), not rapier: it is more tunable and bot-friendly. Score: shells potted plus time left. Camera: high 3/4 (tilt 62). Bot: PD steering of the nearest shell toward the nearest pool.

**Paddle Slalom** (about 45 s). Stand on a paddleboard on a long channel and pass buoy gates. Lean x steers. Lean forward speeds up and risks tipping, lean back brakes. Gusts, shown as ripple streaks, push the dot. A tip is a big splash and a 2 s remount. A missed gate adds 2 s. `score = clamp((1.6 * par - t) / (0.8 * par)) * 1000`. Standing on water uses the trick in section 15; a silent `Wake` event every few ticks draws the wake. Camera: chase (tilt 22, distance 10). Bot: steers to gate centres at forward lean 0.5.

**Tray Trek** (about 50 s). Walk a long pier at a fixed pace, carrying a tray with a stack of 5 smoothies. Waves, plank gaps and swooping gulls jolt the tray. Your dot tilts it. Glasses slide with tilt and plop into the sea past the edge. Score: 200 per glass delivered, plus a no-spill bonus. Marjorie receives what is left and comments. Use `STYLE100/Balance_Walk` plus an upper-body `FIT/CarryTray` clip. Bot: counters the jolts it knows are coming.

**Cannonball Cup** (3 dives, about 40 s). The board bounces with a 1.2 s period. Press Action at the bottom of 3 bounces to build power, the 4th press leaps. In the air, hold Action to tuck and lean to rotate. Enter tucked and high for the biggest splash. Three gull judges hold up cards: "6.5", "7", "See me". "We are not here for form. We are here for splash." Score: height x tuck x timing. Camera: side view (yaw 90, tilt 6, distance 14). The splash must be huge: a new `BigSplash` event scales the water dents and particles. This is the attract mode's hero shot. Bot: presses on bottoms, tucks at the apex.

### The Big Stand (finale, about 2.5 minutes). Set: `bay`, a tiny post in the bay at sunset, with the whole cast watching from rafts.

Five phases, reusing event code with new numbers:
1. Breathing, 4 cycles.
2. A pose under rising gusts, 20 s.
3. Step Party for 16 bars with a marching band of guests, wobble on.
4. Brace while waves crash, 20 s.
5. **The Long Stillness:** 30 s of nothing. Music fades to silence, the HUD vanishes except the Puck. At 15 s a fake prompt offers "Press Cross to skip". Pressing anything forfeits the Inner Peace bonus. Then Pip, quietly: "...Oh. You're still here. Good."

A tip drops you in the sea to a groan from the crowd and puts you back; it costs score and cannot end the run. Final Balance Age = morning age minus `final_score / 100` (up to 10).

### Morning Wobble Check. Set: `studio`. About 70 s, four micro-tests, Pip presiding.

| Test | What you do | Metric (0 to 1) |
|---|---|---|
| Stand Still ("This is the whole test") | Hold the dot centred for 8 s; one small nudge at 5 s | Mean distance from centre |
| Lean Targets | A left/right bar: reach "70% left", then two more targets, within 6%, hold 1.5 s; 5 s limit each | Time taken |
| Eyes Closed | 6 s. The screen dims to almost black, the Puck vanishes. A tone's pitch tells your offset, and rumble if the pad has it | Mean distance |
| Step Test | 8 alternating steps to a 100 BPM metronome | Timing |

```
skill = 0.30*still + 0.25*targets + 0.25*blind + 0.20*steps
age   = 24 + 56 * (1 - skill)^1.1 - 2*days_completed - min(total_stars/3, 8)
```
Clamp to 18..99, round. A middling player (skill 0.5) starts at 50 and reaches about 34 by Day 5; a weak one (skill 0.2) starts at 68 and ends near 52, before the finale's bonus. The big number rolls like a slot machine. Pip's comment is chosen by the change since yesterday and by the worst metric. A sparkline of 5 big dots shows the week. Your figure's posture improves as the age falls (a small constant forward slump through the tilt field, shrinking each day): visible progress, no numbers needed.

## 6. Meta systems

- **Minute Clam:** a giant clam at reception that gulps banked minutes with a gibberish burp. Totals unlock wardrobe items.
- **Calendar:** five big days, a stamp per completed day, then real days in free play. No tables.
- **Titles:** after each event Pip awards a deadpan title by score: Human Soup, Acceptable Human, Certified Lean-To, Wobble Enthusiast, Seasoned Tilter, Stillness Intern, Professional Standing Person, Alarmingly Balanced. At least 30, in `script.toml`.
- **Wardrobe:** reuse the engine's `GearLook`, which needs no new drawing (verified): `helm = cap` (sun cap), `helm = hood` (towel turban), `crown`, `halo`; `gloves` (sweatbands), `belt`, `pauldrons` (reads as arm floaties, funny). Plus shirt, pants and shoe colours. Skip `cape`: it draws long sticks.
- **Lost flip-flops:** 5 hidden on the island, for Two-Towel Tom. Reward: Golden Flip-Flops (gold shoes) and a line. This is the exploration layer.
- **Yesterday You:** your best run of each event is recorded and replayed as a tinted figure in a neighbouring lane, from Day 3.
- **Absence comments:** the page passes today's date to the game at boot, and the save stores the last day played. "You were away for 2 days. I did not count them. There were 2." Passing the date in as data keeps the rule that the sim never reads the clock.
- **Saves:** versioned JSON in `localStorage`: guest slots (name, look, day, minutes, stars, bests, ghosts, ages, flip-flops, unlocks) and global settings. Save on every change of day and every result.

## 7. World, cast and writing

**Tippy Cay** is about 64 x 48 m: reception at the centre (Pip's desk, Calendar wall, Minute Clam), a ring path for jogging, four pavilions around it, a row of cabanas, a pier, a diving tower and a water channel in the distance. Palms, grass, sand terraces, sea on all sides, circling gulls.

| Character | What it is | Voice and manner |
|---|---|---|
| **Pip** | Sky-blue round wobble cushion, two dot eyes (`blob` plan, scale 0.7, squash 2.0, plus a small valve) | Front desk and scorekeeper. Relentlessly pleasant. Keeps records of everything. Never technically insults you. Squeaky rubber voice |
| **Posey** | Faceless wooden artist's mannequin (biped with eyes the colour of its skin; verified look in section 8) | Stillness. Serene, short, oddly poetic. Soft wood-block voice. It has no eyes and never blinks; "This has not been discussed" |
| **Big Kettle** | Cast-iron kettlebell (dark `blob` plus a torus handle part; add a `Handle` attach kind) | Strength. Booming, gentle, deeply supportive. No arms or legs, cannot do any exercise |
| **Bounce** | Huge pink exercise ball that never stops hopping (`blob`, scale 1.2, `hop`) | Cardio. Breathless bursts, no full stops |
| **Commodore Gull** | Small gull in a captain's cap: three no-physics entities, wings rotated in code | Lagoon. Dry, officious, steals snacks |
| **Marjorie** | Guest in robe and towel turban (`helm = hood`, white) | On Day 5 for eleven years. Knows everything |
| **Two-Towel Tom** | Guest with two towels | Lost his flip-flops. Asks you to find them |
| **The Twins** | Two identical guests | Do everything in unison, finish each other's words |

**Writing style.** Short polite sentences. Upbeat. Then one line too honest. Fitness facts of doubtful use. Numbers quoted precisely, for no reason. At most 2 lines on screen at 10 feet. Every coach has at least 25 lines, Pip at least 80, guests about 8 each, per day where it matters. Keep all text in `script.toml`.

Tone anchors, all original. Use these and write more like them:
- Pip: "Welcome! You have won a complimentary stay. You did not enter. Nobody enters."
- Pip: "Please stand on me. Gently. I remember everything."
- Pip: "Your Balance Age today is 61. That is a number. Numbers cannot hurt you. This one is trying."
- Pip: "You leaned left 64% of the time. Is everything all right on the right?"
- Pip: "That was your best attempt so far. I am as surprised as you are."
- Pip: "You wobbled 41 times. I stopped counting at 40, out of respect."
- Pip: "Did you know? Standing still burns calories. Not many. Did you know that, though?"
- Pip, on a long pause: "You have been paused for 4 minutes. Pausing is not an exercise. I checked."
- Posey: "Breathe in the sea. Not literally."
- Posey: "Be the heron. The heron does not check the score."
- Big Kettle: "Lift with your legs. I cannot. I have none. Lift for both of us."
- Bounce: "Keep going keep going keep- is that your heartbeat? Mine is just air!"
- Commodore Gull: "That was a dive. I am legally required to say so."
- Marjorie: "Day five? Oh, I'm on day five as well. Eleven years now."

Dialogue types out with voice blips. Action completes the line, then advances. Keep a Text Speed setting.

## 8. Art direction

**Base:** the engine's native look: cel-shaded rounded primitives, soft sun shadows, thin ink outlines on characters. Its big-headed toy figures already suit the tone. Take the look high-key and pastel.

**Palette:** sky `#d6eef6`, sea `#8fdde0`, deck `#fbfaf6`, sand `#f6e7c8`, grass `#bfe6b0`, ink `#263e54`, teal accent `#46bec8`, mint `#78dcaa`, coral `#ff786e`, sun yellow `#ffd166`.

**Base `[view]` for every set.** This exact recipe was verified to give a clean horizon. Vary sky, sun and warmth per set (dawn in the Studio, golden hour at the Gazebo, sunset in the Bay).

```toml
[view]
sky = "#d6eef6"
exposure = 1.0
saturation = 0.95
bloom = 0.15
bloom_threshold = 1.3
outlines_on = "objects"
outline_px = 1.0
outline_darken = 0.55
rim = 0.3
fog = true
fog_start = 25.0
fog_end = 110.0
wind = 0.5
"light.sun_elevation" = 52.0
"light.sun_azimuth" = 160.0
"light.sun_intensity" = 0.62
"light.ambient" = 1.15
"cutaway.height_cut" = false
"cutaway.front_cut" = false
"cutaway.fade" = false

# The sea: water zones near the action, one huge disc beyond them. Fog hides its edge.
[[object]]
name = "far_sea"
shape = { type = "cylinder", half_height = 0.05, radius = 600.0 }
pos = [10.0, -0.12, 6.0]   # the set's centre
color = "#8fdde0"
look = "flat"
body = "fixed"
```

**Shapes.** Use big single objects for decks and platforms (a `cylinder` or `rounded_box` `[[object]]`). Legend tiles with `rounded = true` merge row by row into visible stripes (verified). Use flat tiles only for ground. Water: `zone = { kind = "water", y0 = -2.0, y1 = 0.0, color = "#8fdde0" }`.

**New props.** Hand-write format-2 JSON (`engine/docs/ASSET_STUDIO.md`) into `engine/assets/props/lib/core/<name>.json`; that folder is embedded in every build, including the browser. Use them as `asset = "LIB/core/<name>"`. A rebuild of `pav` is needed before `room_check` can see a new file (verified). A leaning palm (cone trunk, 6 radial ellipsoid fronds) and a kettlebell (sphere and torus) looked good on the first try. Check each with `asset_preview name=x views=true figure=true`.

Make: palm, exercise mat, step box, diving board and tower, paddleboard, buoy, tide raft and pools, shell, tray, smoothie glass, floatie ring, lounge chair, umbrella, cabana, reception desk, pavilion (one prop with `$roles` recoloured for each), calendar wall, Minute Clam, flip-flop, gull body and wing, scorecard, lotus, small raft, towel stack, Kettle's handle.

**From the library (generic only):** `LIB/core/rowboat`, `park_bench`, `lamp_post`, `signpost`, `fence`, `market_stall` (smoothie bar), `round_table`, `chair`. The library has no palms, mats, gym gear or beach props (verified).

**Rich detail is welcome.** The brief sets no performance budget, so add detail freely: grass, swaying fronds (`sway = "leaves"`), `confetti` and `bubbles` particles, point lights at sunset, ripples, cast figures in the background of every set. Screen transitions (iris) on every set change.

**Looks that work (verified):**
- **Posey:** `look = { skin = "#d8b184", shirt = "#d8b184", pants = "#c79f6e", shoes = "#c79f6e", eyes = "#d8b184", scale = 1.05, leg_length = 0.98 }`.
- **Blob colour** comes from `shirt`, not `skin`. Set both.
- **Spa guests:** white `shirt`, `pants`, plus `gear = { helm = "hood", helm_color = "#f5f2ec" }`.

## 9. Animation

**Base:** the engine's puppet (procedural walk, idle, landing, squash and stretch) with motion clips on top.

**Library clips to use:** `MESH2MOTION/Jog`, `MESH2MOTION/Pushup`, `MESH2MOTION/Jumping Jacks`, `CMU/Hop_One_Foot_Loop`, `STYLE100/Balance_Walk`, `CMU/Wave_Hello`, `CMU/Stretch_Yawn`, `MESH2MOTION/Cheering_Two_Hands`, `MESH2MOTION/Victory`, `MESH2MOTION/Sitting_Idle`, `QUATERNIUS/Dance_Loop`. Search with `clips find=word`. There are no yoga or hula clips.

**Hand-keyed clips (verified feasible).** Write readable key poses into `engine/anim/fit.json`. Test without rebuilding: in `pav repl` run `anim_reload`, then `animsheet clip=FIT/Tree frames=1 size=300 out=out/tree.png`. The build embeds every `anim/*.json`. A tree pose, a warrior lunge and a squat were recognisable at the first attempt:

```json
{"set":"FIT","title":"Tippy Cay moves","format":1,"credit":"Hand-keyed for this game (CC0).","legend":[],"fps":30,"sources":{},"clips":{
"Squat":{"clip":"Squat","dur":1.0,"loop":false,"tags":["exercise"],"desc":"Stand to deep squat; scrub clip time with depth.","keys":[
 {"t":0,"hips":[0,0,100],"body":[0,0,0],"chest":[0,0,0],"head":[0,0,0],"armL":[10,10,-95,10,0],"armR":[10,10,-95,10,0],"legL":[0,6,-100,0,0],"legR":[0,6,-100,0,0]},
 {"t":1,"hips":[-22,0,58],"body":[0,28,0],"chest":[0,5,0],"head":[0,-22,0],"armL":[100,4,10,0,0],"armR":[100,4,10,0,0],"legL":[55,10,-60,95,0],"legR":[55,10,-60,95,0],"footL":[-12,0,0],"footR":[-12,0,0]}]},
"Warrior":{"clip":"Warrior","dur":2.0,"loop":true,"tags":["pose"],"desc":"Deep lunge, arms out.","keys":[
 {"t":0,"hips":[0,0,72],"body":[35,0,0],"chest":[-35,-4,0],"head":[-30,0,0],"armL":[0,100,0,0,0],"armR":[0,100,0,0,0],"legL":[70,0,-55,95,0],"legR":[-85,20,-60,0,0],"footR":[10,40,0]},
 {"t":2,"hips":[0,0,72],"body":[35,0,0],"chest":[-35,-4,0],"head":[-30,0,0],"armL":[0,100,0,0,0],"armR":[0,100,0,0,0],"legL":[70,0,-55,95,0],"legR":[-85,20,-60,0,0],"footR":[10,40,0]}]}
}}
```

Field meanings are in `LEGEND` at the top of `engine/crates/pav_core/src/clips.rs`: `hips [forward, right, up]` in percent of standing hip height; `body`, `chest` and `head [turn, lean, tilt]` in degrees; limbs `[forward, out, up, bend, twist]`. The plank attempt pointed its legs up, so start the plank from `MESH2MOTION/Pushup`'s key instead.

**Make:** Breath, Squat, Tree (Heron), Warrior (Lunge), Lighthouse, DeckChair, Bridge, Seated, ArmFlail (upper body), Stumble, StepL, StepR, HipCircle, CarryTray, Tuck, DiveEntry, Flop, Bow, Sleep, Wake, Sigh. Check motion with `filmstrip` and `animsheet`.

**Scrubbing a clip with gameplay** (depth, breath): call `anim.play_clip(id, 0, 1e-6)` and write `anim.clip_t` yourself each tick. A speed of 0 means normal speed, so use a tiny positive value (read in `PuppetState::update`).

## 10. Audio

Everything is synthesised in `pav_audio`; no audio files. Extend it rather than adding a second synth.

- **Buses:** music, sfx and voice, each a gain applied per voice in `Mixer::render`. Settings defaults: **music 10%** as your brief requires (0.10 linear), sfx 80%, voice 80%.
- **New events:** add `SimEvent` variants `Sfx { id, gain, pitch }`, `Syllable { speaker, vowel, pitch }`, `Music { song }`, `BigSplash { pos, size }`. `pav_audio::sounds_for` is a closed match; add arms there.
- **Sequencer:** `pav_audio/src/music.rs`, running inside `Mixer::render` so timing is sample-accurate. A song is BPM, steps per beat and tracks of patch plus pattern, written by hand as arrays of scale degrees over a chord progression. Add a low-pass LFO patch option for pads.
- **Rhythm clock:** the mixer counts rendered samples in an atomic. `pav_app` reads it, runs a small phase-locked clock (`clock += dt; clock += (audio_pos - clock) * 0.05`), subtracts a latency offset (default 0.10 s, Settings: Rhythm Offset), and sends it as `InputFrame.song_pos`. The sim uses `song_pos` when present, its own tick time otherwise. Replays and tests stay deterministic, because the value is part of the recorded input.
- **Latency:** cpal's web backend defaults to 2048 frames per buffer, about 43 ms (read in its source, not measured on a real device). Try `BufferSize::Fixed(1024)` in `AudioOut::start` for snappier effects.
- **Autoplay:** `resume_audio` runs on key, mouse and touch only. Also call it on the first gamepad activity. Attract mode is silent until a real input arrives; that is expected.

| Song | Where | Feel (all original) |
|---|---|---|
| 1 Lobby Bossa | Title, island | 84 BPM, soft nylon-like pluck, brushed noise, walking bass: resort lounge, not gym |
| 2 Tide Pad | Stillness | Slow pads and sparse bells, no beat |
| 3 Iron Waltz | Strength | 3/4, low pizzicato bass, a dignified tuba-like square |
| 4 Step Party | Step Party, Floatie Spin | 96 BPM funk-pop, clear kick and clap for timing |
| 5 Lagoon Mallets | Lagoon | 110 BPM marimba-like triangle, playful |
| 6 Band of Guests | Big Stand | Marching brass and snare, then fades to silence |
| 7 Stingers | Results, stamps, stars, reveal | Short jingles |

**SFX (at least 30):** UI move, confirm, back, stamp thunk, clam gulp, Age slot ticks, step, Pip squeak on landing, wood creak, small and big splash, gull squawk, crowd murmur, clap, gong, rep bell, ring whoosh, shell roll (noise by speed), shell plop, glass plop, confetti pop, gust, wave crash, sea-wash ambience, Eyes Closed tone.

**Voices (Animalese style).** A formant-filtered saw blip per syllable: add two parallel band-pass filters to `Patch`/`Voice`, with a table of formant pairs for 5 vowels, plus a tiny noise click for consonants. The dialogue system fires one `Syllable` per 2 to 3 revealed letters, vowel from the letter, pitch falling at "." and rising at "?". Each speaker has a base pitch, rate and timbre: Pip high and rubbery, Posey soft with wood-block attack, Kettle very low, Bounce fast and breathless, Gull nasal and clipped. No real words are ever spoken.

## 11. UI and UX

**Route: egui in `pav_ui`, painter-drawn, no default windows.** This was verified at 1920x1080: rounded fonts, soft-shadow cards and painted glyphs look right and appear in headless `pav capture`. Keep all UI state in the sim (section 14), so tests can drive it.

**Fonts:** `npm pack @expo-google-fonts/fredoka` and `@expo-google-fonts/nunito` (SIL OFL, static TTFs). Unpack into their own folder and copy `Fredoka_600SemiBold.ttf` (titles, 50 KB) and `Nunito_700Bold.ttf` (body, 132 KB) to `engine/crates/pav_ui/fonts/`. Embed with `include_bytes!`. Credit them on the About screen.

**Rules:** at 1080p, body text at least 34 px and titles at least 64 px. Scale everything by `min(w/1920, h/1080)`, so it also works in small hub frames. Cards are white with radius 36. Focus is a thick teal outline, scale 1.05 and a soft bounce, with a sound on every move. At most 6 items visible. No tables, no dense stats, at most 4 numbers on a screen, and the About screen is pages, not a scrolling wall. Everything works by pad alone. Keyboard and mouse use the same screens. Hover moves focus, and click activates.

**Glyphs:** draw them with the painter. PlayStation by default (Cross, Circle, Square, Triangle, L1/R1/L2/R2 pills, sticks, D-pad); a Settings option swaps to Xbox (A B X Y, LB RB LT RT). Keyboard: keycaps with labels. Mouse: a small mouse with the button lit. One function `prompt(action, device, xbox) -> glyph`. Prompts change the instant the device changes. Hide the cursor when the pad is in use.

| Screen | Content |
|---|---|
| Title | Logo in Fredoka over the island sweep, 4 options |
| Guest select, wardrobe | Big cards, live figure on a turntable |
| Dialogue | Bottom card, speaker name, 2 lines, advance glyph |
| Island HUD | Day and minute goal top left, Balance Age top right, a world-anchored prompt on the nearest interactable |
| Schedule | Carousel of pavilions, then events, with stars. Fast travel |
| Event HUD | Puck, score, timer, one prompt row |
| Result | Score, stars, title, minutes, best, Retry or Back |
| Check report | Giant rolling number, sparkline, Pip's comment |
| Calendar | Five big days and stamps |
| Pause | Resume, Schedule, Calendar, Wardrobe, Settings, How to Play, About, Dev Mode, Quit to Title |
| Settings | Music (default 10%), SFX, Voices, Glyphs, Lean Sensitivity, Wobble Assist, Rhythm Offset, Text Speed, Fullscreen, Reset Save (with confirm) |
| About | Pages for each block your brief requires (section 18) |
| Play Together | Choose 2 to 4 guests, pass-the-pad interstitial, podium |

**Mouse in the world:** on the island `InputFrame.aim` already holds the cursor's ground point. The nearest interactable within 1.2 m of it gets a highlight ring; clicking walks there with `NavGrid::path`, then interacts. Clicking open ground walks there.

**Touch-only devices:** detect with `matchMedia('(pointer: coarse)')`, no `(any-pointer: fine)`, and no gamepad or key seen yet. Show a centred card "Controller or keyboard required" and a Settings button (tap works; Settings is usable by tap). No touch controls: skip Shardfall's `touch.draw` for this game, and route touches directly to egui in `on_touch`, because the engine's touch layer otherwise treats a finger as a stick. Attract mode runs behind the card. Remove the phone-rotation hint and fullscreen-on-tap from `web/index.html`. If a pad connects or a key is pressed, drop the card and start normally. A touch device without WebGPU cannot run the game at all, so the page's own fallback message there says both things: "Controller or keyboard required" and that the game needs WebGPU.

**Dev Mode** (from Pause, not shown in hub sessions). Big rows, pad-navigable, in tabs:
- **Jump:** any day, any event, any finale phase, attract, medley.
- **Cheats:** no tips, autoplay with the bot, give minutes, unlock all, all stars, skip dialogue, win or lose this event now.
- **Time:** scale 0.25x to 4x, pause, single step (`TimeControl`).
- **Tuning:** live sliders, generated from `impl Tunable for Rules` with `params::list` and `params::set`, grouped by core and by event, with **Reset to Defaults** per group and for all. Must include: stiffness, damping, wobble, tip time, stick curve, key rates, each event's main difficulty number, rhythm windows, spin band, gust strength, bounce gain, Big Stand gusts.
- **View:** input viewer, dot trace, engine stats overlay, free camera, ghost lanes.
- **Save:** reset this guest.

## 12. Attract mode

After 10 seconds without input on the title or pre-game menus (600 ticks), loop: island sweep 8 s, then about 15 s each of Cannonball Cup, Paddle Slalom, Step Party, Pose Parade, Tide Table, Floatie Spin, Tray Trek, Plank Standoff, Morning Lap, Big Stand, then the title card 5 s. The bot plays with `demo = true`: no tips, no failures, nothing saved. A "DEMO" ribbon and "Press any button" show on screen. Any input exits to the title: any key, button, stick beyond 0.3, mouse click or mouse move over 6 px (`InputFrame.any`). Touch-only devices keep it running.

Use the same event code with the bot replacing input in `pre`. No separate replay system.

## 13. Multiplayer

**AI Hub session: mode `ghost`, 1 to 4 players.** Follow `lib/hub/README.md` in `michaelcrosato/ai-hub`. `ghost` is the choice because seeing friends wobble on the next mat is the fun of it, and it is barely more work than `parallel`; `shared-world` would need a host-run world this game does not need. Download `session.js`, `harness.html`, `bridge.js` and `round.js` from `https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/` to `hub/`; these URLs work without auth (verified).

**The round, the Inter-Resort Medley:** Paddle Slalom, Tide Table, Cannonball Cup, one after another, about 2 minutes, then final score = sum of the three event scores (0 to 3000), reported as `AIHub.result({ score, stats, awards })`. The same seed on every copy gives the same course. On a copy, other players appear as seat-coloured figures with their names in the same event: in another lane or on a neighbouring raft or board. They affect nothing. Use the hub's own card: do not pass `card: true`.

In a session there is no title, menu or attract. The game opens straight into the round. Pause shows only Resume and Settings; the world keeps running, because the hub's clock does. Quit, restart and dev mode do not exist there.

**Order in the `<head>` of `web/index.html`:** `<meta charset>`, the client, the tags, the `about-data` block (section 14), then the JS below.
```html
<meta charset="utf-8">
<script>/* session.js pasted byte for byte */</script>
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="3">
<meta name="hub:session-goal" content="Highest total across three balance events wins">
<meta name="hub:session-howto" content="Lean: stick, WASD or mouse. Act: Cross, Space or click">
<meta name="hub:webgpu" content="required">
```

**Hub logic lives in about 30 lines of plain JS in the page; Rust only reads and writes window fields.** This exact block passed the harness on a real engine build at 2 players, at 3 and 4 players with `latency=150&jitter=50&loss=5`, and with `scenario=host-leave`, in 14 to 19 s each, and the page ran clean outside a session (verified):

```js
(() => {
  const boot = window.__gameBoot = { scene: null, seed: null, today: Math.floor(Date.now() / 86400000),
                                     about: document.getElementById('about-data')?.textContent ?? '' };
  if (!window.AIHub || !AIHub.active) return;
  const hub = window.__hub = { go: false, ended: false, players: [], me: 0, ghosts: {} };
  boot.scene = 'fit/medley';
  boot.seed = Number((/[?&]aihub-seed=(\d+)/.exec(location.search) || [])[1] || 1);
  AIHub.connect({ mode: 'ghost', seats: [1, 4] }).then((info) => {
    if (!info) { location.replace(location.pathname); return; }   // no hub after all
    if (!navigator.gpu) { AIHub.fail('This game needs WebGPU'); return; }
    hub.me = info.me; hub.players = info.players;
    // Before the first status arrives, report a zero: the hub must always hear a number.
    const status = () => { try { return JSON.parse(window.__gameStatus || 'null')?.hub ?? null; } catch { return null; } };
    const waitReady = () => (window.__gameStatus ? AIHub.ready() : setTimeout(waitReady, 50));
    waitReady();
    let reported = false;
    const report = () => { if (reported) return; reported = true; const s = status(); AIHub.result({ score: s?.score ?? 0, stats: s?.stats ?? {} }); };
    setInterval(() => {
      if (AIHub.time() < 0 || hub.ended) return;
      hub.go = true;
      const s = status();
      AIHub.progress({ score: s?.score ?? 0, label: s?.label ?? 'Warming up' });
      if (!reported) AIHub.send(s?.ghost ?? { area: -1 }, { reliable: false });
      if (s?.done) report();
    }, 100);
    AIHub.on('message', (data, from) => { hub.ghosts[from] = data; });
    AIHub.on('leave', ({ id }) => { delete hub.ghosts[id]; });
    AIHub.on('time-up', report);
    AIHub.on('end', () => { hub.ended = true; });
  });
})();
```
The game's status JSON carries `hub: { score, label, done, stats, ghost }`. Rust passes `__hub.go` to the sim as a button bit, draws `__hub.ghosts`, and stops input and sound on `__hub.ended`. The JS timers keep reporting while software rendering runs slowly, so the checks pass at low frame rates.

**Ghost drawing.** Append extra `RenderObject`s to clones of `prev` and `curr` before `builder.build` in `App::frame`, with a high id per seat and `PuppetFrame { state, feet_offset, def: Some(look), rig: None, tint: Some((seat_rgb, 0.55)) }`; copy how `Sim::frame` builds a character's object. The sim never sees hub ghosts, so it stays deterministic. Local ghosts (Yesterday You, Play Together) come from the sim's own save data and are appended in `Sim::frame`, through the same helper, so captures show them. Names are egui text projected above the head; never insert hub names as HTML. Ghost JSON: area (event index), position, facing, lean, clip id, clip time, score. Only draw a ghost whose area matches yours. 10 messages/s stays under the 20/s limit.

**The game on its own.** `AIHub.active` is false and nothing above runs. `Math.random` stays the browser's own. The hub's solo check opens the page, presses Enter and Space, and looks for errors and a drawn screen. Multiplayer exists here too, on one device:
- **Play Together:** 2 to 4 local guests take turns through the same Medley on one pad. A pass-the-pad card between turns, earlier players' runs as ghosts in the other lanes, and a podium at the end.
- **Yesterday You:** the same ghost pipeline replays your own best run.

These reuse the hub's ghost drawing and scoring, so there is one multiplayer system with three sources of ghosts.

## 14. Architecture

**Decision: all game state and flow live in the sim, in one `Game`.** Menus, dialogue, pause, settings values and dev toggles are state in `FitGame`, driven by `InputFrame`, so `cargo test` can play the whole game with no browser or GPU in seconds. `pav_ui` is a pure view of a `UiFrame`: it draws the frame, and returns what the pointer hovered and clicked, which the app sends back as `InputFrame.ui` (clear PRIMARY that frame if the UI took the click) and publishes as item rects in `window.__gameUi` for browser tests. Pause freezes the world by an early return in `Sim::step_inner`, not by `TimeControl`.

```
engine/crates/pav_core/src/games/fit/
  mod.rs           FitGame: Flow state machine, Game impl, build(), scene routing
  core.rs          BalanceCore
  intent.rs        InputFrame to per-event intent
  events/*.rs      one file per event, dispatched through an enum (Clone + serde)
  check.rs finale.rs medley.rs meta.rs dialog.rs ghost.rs attract.rs ui_model.rs
  rules.toml       every balance number (hot-reloads via level_text)
  script.toml      all text
  charts.toml      Step Party notes
  sets/*.toml      hub studio gazebo boardwalk tide channel pier tower bay
engine/anim/fit.json                 hand-keyed clips
engine/assets/props/lib/core/*.json  props
engine/crates/pav_ui/src/fit_ui.rs, glyphs.rs, fonts/
engine/crates/pav_audio/src/music.rs, voice.rs
engine/crates/pav_app/src/weblink.rs  window field reads and writes
engine/web/index.html                 hub client, tags, JS, about-data
tests/  tools/  hub/  notes/  README.md  (how to add an event, set or song)
```
Register it as `entry::<fit::FitGame>(..., fit::build)`, `KEY = "fit"`. Scene names: `fit`, `fit/medley`, `fit/event/<name>`. Read data with `games::level_text("fit/rules", include_str!("rules.toml"))`: running from `engine/`, it reads the disk file, so text, numbers and set layouts change with no rebuild. Do not put sets in `engine/rooms/`: that folder feeds the pavilion demo.

**Every set is a room on one `Sim`** (verified: two rooms, each with its own `[camera]` and `[view]`, switching live in the browser):

```rust
let def = RoomDef::parse(&level_text(key, text)).map_err(|e| anyhow!("{key}: {e}"))?;
let place = Placement::new(def.layout.origin, 0);       // give each set an origin 200 m apart
let (cols, rows) = def.layout.extent();
let (min, max) = place.aabb(Vec3::new(0.0, -1.0, 0.0), Vec3::new(cols as f32, def.height.max(2.0), rows as f32));
let start = def.local_start();
let inward = -def.entrance.facing.dir();
rooms.push(RoomSlot { id: i as u16, key: key.into(), def: Arc::new(def), place, min, max,
                      inside: place.point(start), outside: place.point(start) - inward * 4.0, inward, built: false });
// then:
sim.state.world = World { enabled: false, rooms, current_room: Some(0), ..Default::default() };
for i in 0..n { sim.build_room(i); }
// markers() reads current_room: set it, read the markers, set it back.
// To change set: sim.state.world.current_room = Some(i); sim.set_position(player, marker);
```
Keep player movement numbers in code, since `[params]` is not re-applied on a manual switch. The app applies the room's `[camera]` and `[view]` when the room id changes; set `self.arrival` there too, for the iris transition.

**Per-state cameras:** `sim.state.courses.sticky_cue = Some(Arc::new(CameraCue { set, sweep, flip_ortho: 0.0 })); sim.state.courses.cue_serial += 1;` blends over 0.7 s in the window and in the tools. Use `sweep` for slow result-screen orbits. Lighting per state: `courses.view` and `view_serial`.

| File | Change | Why |
|---|---|---|
| `pav_core/src/input.rs` | Add to `InputFrame`: `lean: Vec2`, `any: bool`, `ui: Option<UiEvent>` (Copy: `Hover(u16)`, `Click(u16)`, `Slider(u16, f32)`), `song_pos: Option<f32>`, all `#[serde(default)]`. New `buttons`: CONFIRM, BACK, MENU_UP/DOWN/LEFT/RIGHT, TAB_L, TAB_R, PAUSE, SCHEDULE, WAVE, STEP_L, STEP_R, HUB_GO | Everything the game needs is input, so replays and tests cover it |
| `pav_core/src/games/mod.rs`, `sim.rs` | `Game::frozen()` with a default of false (add it to the trait and its `DynGame` and `GameBox` wrappers); when true, `step_inner` skips everything after `play_pre` except tick++ and events | Pause freezes the world while menus still run |
| `pav_core/src/frame.rs`, `sim.rs` | `HudFrame.status: Option<String>` (the game's status JSON), `HudFrame.fit: Option<Arc<UiFrame>>` and `HudFrame.camera_yaw: Option<f32>`, which `pav_app` and `pav_tools/src/session.rs` apply to the rig each frame | Link to JS and to the UI; Morning Lap's chase camera, since cues blend over 0.7 s and cannot follow per tick |
| `pav_view/src/build.rs`, `fx.rs` | Handle `BigSplash` (bigger water dents and bursts) and a silent `Wake { pos }` event (a small dent, no sound; `Splash` is loud if repeated) | The dive's payoff and the paddle's wake |
| `pav_core/src/puppet.rs` | `tilt_side`, `tilt_fwd` in `PuppetState` (add to `lerp`), applied in `body_motion` as a rotation about the feet | The whole figure leans with the dot |
| `pav_core/src/parts.rs` | `AttachKind::Handle` | Kettle |
| `pav_ui/src/lib.rs`, `headless.rs`, `fit_ui.rs` | Draw `fit_ui` from both window and headless; `has_ui` true when `hud.fit` is set; install fonts before the first pass | Captures show the real UI |
| `pav_tools/src/tools.rs` (`t_input`) | Accept `lean=[x,y]` | Poke events from the REPL |
| `pav_app/src/input.rs` | `Bindings::fit()`, a fit layout in `poll_gamepad` (Cross, Circle, L1/L2, R1/R2, D-pad taps, Options unless Create is held), key ramps for lean, menu repeat | Controller-first layout |
| `pav_app/src/app.rs` | When `hud.fit` is set: hide `boot_panel`, `stats_panel`, `guide_panel`, the room card, `hint_bar` and the F1 panel (verified necessary); route Esc and Options to PAUSE instead of `set_menu`; gate `handle_key`; call `weblink` each frame; apply Settings to audio buses; save to `localStorage` when the save serial changes; keep fit bindings in the room-change branch, which otherwise rebinds keys | Removes the engine demo's chrome and keys |
| `pav_audio` | Section 10 | Music, voices, buses |
| `web/index.html` | Client, tags, JS, `about-data`, catalogue `<title>Name — Tagline</title>`, description, theme colour, an inline SVG icon; remove the phone hints | Hub and catalogue |

**In `pre`, always return the player's input with action bits removed:** `out.insert(pid, InputFrame { move_dir, ..Default::default() })`. Otherwise left click and F throw bombs, Space jumps and C crouches. The game replaces the player's own buttons (read in `sim.rs`).

**Rust and JS link, no new dependencies (verified compiling and running):**
```rust
use web_sys::js_sys::{Array, Reflect};
use web_sys::wasm_bindgen::{JsCast, JsValue};
let win = web_sys::window().unwrap();
Reflect::set(&win, &JsValue::from_str("__gameStatus"), &JsValue::from_str(&status)).ok();
let v = Reflect::get(&win, &JsValue::from_str("__hub")).unwrap_or(JsValue::UNDEFINED);
// Array::from(&v) makes a copy, so clearing it leaves the original full (verified).
// To read and clear a JS array in place: let arr: Array = v.unchecked_into(); ... arr.set_length(0);
```
`pack_single_html.py` refuses wasm-bindgen snippets (`inline_js`, `module`), so use `Reflect`. Do not use `host.exec` or `host.query` per frame: in the browser they re-publish a frame and rotate prev/curr, which stutters the interpolation. Read `curr.hud.status` instead. `Settings::load` should read `window.__gameBoot.scene` and `.seed` when present.

**About text stays in plain text in the page.** Put it in `<script id="about-data" type="application/json">` in the `<head>`, not in the wasm. The agent that imports the game edits the Usage line later, and it cannot edit text inside a gzipped wasm. Rust reads it from `__gameBoot.about`.

## 15. Verified facts and traps

Build times with `CARGO_BUILD_JOBS=8`:
- `cargo build --locked -p pav_tools --bin pav`: 1m53 first time, 15 to 70 s after. Run from `engine/`.
- `cargo test --locked -p pav_core --test games`: about 75 s build, under 1 s run.
- `scripts/build-web.sh --single-file --scene fit --title "..." --out <path>`: 2m24 first time, 52 s after. Output about 11.4 MB. The wasm target and `wasm-bindgen 0.2.129` are ready. `--out` takes your brief's file name.
- `pav capture ... width=1920 height=1080`: about 0.5 s. `pav play bot=true seeds=5`: under 1 s.
- Batch Rust edits and keep numbers in TOML.

Browser:
- **Software rendering is slow, so size the window to the test.** Measured ticks per second: 1280x720 gives 12, 640x360 gives 42, 320x180 gives 60. Run browser tests at 320x180; only then does a 10-second attract timer take 10 seconds. Slow rendering at large sizes is not a game bug.
- Chromium flags that work: `--enable-unsafe-webgpu --enable-features=Vulkan --use-vulkan=swiftshader --use-angle=swiftshader`. The set with `--use-webgpu-adapter=swiftshader` also works. Only Chromium has WebGPU here: Firefox and WebKit show the page's no-WebGPU message.
- Run your own Playwright scripts with plain `python3`. `python3 -I` cannot import Playwright here (verified).
- **Server port through a pipe:** `python3 -m http.server 0` buffers its "port" line when piped, and a script reading it hangs forever. Use `python3 -u -m http.server 0 --bind 127.0.0.1 --directory <dir>`. Stop only that PID, from a `finally` and a SIGTERM handler.
- **Controller stub (verified: gilrs reads it, stick moves the player, Cross registers):**
```js
const btn = () => ({ pressed: false, touched: false, value: 0 });
const pad = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 1,
              axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, btn) };
navigator.getGamepads = () => [pad, null, null, null];
window.__setPad = (axes, pressed) => { pad.axes = axes; pad.timestamp++; pad.buttons.forEach((b, i) => { const on = pressed.includes(i); b.pressed = on; b.touched = on; b.value = on ? 1 : 0; }); };
```
- **Measuring sound (verified):** cpal plays `AudioBufferSourceNode`s, so patch `AudioBufferSourceNode.prototype.start` in an init script, read `this.buffer.getChannelData(0)`, and accumulate RMS and peak. Sample rate 48000; context `running` after a click.

Engine:
- `egui::Context::set_fonts` takes effect next pass; using a font family in the same pass panics "not bound to any fonts". Install fonts before the first `run_ui`, in `App::new` and in `Headless::frame`, which makes a new context per frame. In the browser that panic stopped the frame loop with nothing on the page to say so: `__gameStatus` simply stopped changing (verified). Log console errors and assert that the tick advances in every browser test.
- **Blob colour** is `shirt`. **Rounded legend tiles** make stripes. **Default water** is a strong blue until the zone has a `color`.
- **Mirror view is yaw 0.** The default figure faces +Z, toward a yaw-0 camera. A room `[camera]` of yaw 180 shows its back (verified).
- **Horizon lines:** full-scene outlines draw a dark line at the sea's edge; `outlines_on = "objects"` removes it (verified).
- **Standing on water without swimming (verified):** floor blocks with top at `-0.06` inside a water zone with `y1 = 0`. Posture stays `stand`, `swimming` false.
- `pav assets find=` appends to `store/misses.tsv`. Harmless.
- Run only your own test targets. The engine's other suites check its own catalogue and docs, and a new prop will fail its index check. You do not need them.

Hub:
- Use the exact client text; the hub's check compares it with released versions.
- The harness's Enter key test applies only to a game's own card. With the hub's card there is no key test.

## 16. Testing

One command: `tests/run.sh [core|browser|hub|all]`. It prints only failures and a final line like `212 passed, 0 failed`. Rerun a part only after changing code it covers. Keep a running count in `notes/feedback.md` of issues found and how bad, so your testing feedback is honest.

**`core` (`cargo test -q --locked -p pav_core --test fit`, then `cargo test -q --locked -p pav_audio -p pav_ui`; seconds to run once built):**
- The bot plays New Stay to credits on 3 seeds: outcome Won, 5 stamps, every event played, under 60 sim-minutes.
- Each event: the bot earns at least 2 stars on 5 seeds; idle input earns under 1 star; a careless random input earns less than the bot.
- Balance Core: settle time, tip after `tip_time`, keyboard ramp, stick curve.
- Morning Check: better input gives a lower age; bounds hold.
- Attract: starts at 600 idle ticks, cycles all events, any input exits, saves nothing.
- Pause freezes the world. Settings: music defaults to 0.10. Dev sliders change values and reset. Dev jump lands where it says.
- Save round trip and version. Medley on a seed gives the same score for the same inputs. Play Together completes. Ghosts match by area.
- Snapshot, rewind and replay exactness (copy `crates/pav_core/tests/games.rs`).
- UI: `Headless::frame` readings show the right prompts per device and glyph setting; no text under the size rule (enforce in the draw helper).
- Audio: music at 10% is 0.10 of full-scale render; every SFX and song is non-silent; speakers differ.
- Content lint: no `TODO` or placeholder text in `script.toml`, and every event has a card, rules and a bot.

**`browser` (Playwright, one browser, 320x180, `file://`):** boots with no errors; `__gameStatus` appears; the pad stub moves focus and confirms; keyboard does the same; mouse hover moves focus and click activates, using rects the UI publishes in `window.__gameUi`; prompts switch with the device; Settings has the Xbox option; attract starts after 10 s and any input exits it; music reaches about 10% by the sound patch. Touch: Chromium with a phone and a tablet profile (it has WebGPU) must show "Controller or keyboard required", run attract, and respond to a Settings tap by `page.touchscreen.tap`. WebKit with an iPhone profile, which has no WebGPU here, must show the fallback message from section 11.

**`hub`:** copy the page and `harness.html`, `bridge.js`, `round.js` into one served folder, open `harness.html?game=<page>&players=N&auto=1`, wait for `document.body.dataset.complete === "true"`, and require `window.__hubCheck.pass`. Run 2 players; 3 and 4 players with `latency=150&jitter=50&loss=5`; and `scenario=host-leave`. Then a solo check like the hub's: open outside a session, press Enter and Space, expect no errors, `AIHub.active` false, and `Math.random` not seeded. Also byte-compare the pasted client with `hub/session.js`.

**Second player:** the harness's copies, the only multi-player check possible on one computer. **TV:** judge 1920x1080 `pav capture`s.

**Screenshots** only for what scripts cannot check: `pav capture` for composition, `filmstrip` and `animsheet` for motion, one 1080p sheet per set at the end. Do not use subagents or workflows to debate, review, judge or audit.

## 17. Build order

Each step ends with its tests passing. Early steps close the risks first.

1. **Setup.** Pick the title. `git clone --depth 1 https://github.com/michaelcrosato/shardfall engine` (it is public). Copy the starter to `games/fit/`, register it, build `pav` and the web page, first `tests/run.sh`.
2. **Seams.** Hide the chrome, fit input layout, `lean`, fonts, `fit_ui` with a Title and a Pause, Flow state machine, `weblink`, `__gameStatus`, save, a one-event Medley stub, hub JS. Get the harness and the browser smoke green now, before content exists.
3. **First slice.** Balance Core, Puck, tilt, `studio` set, Pose Parade, event card and result, bot, one result screen in full art. Play it by bot and capture it. Tune until a ring streak feels good.
4. **Island and voice.** `hub` set and props, walking, interactables, dialogue with syllables, audio buses, Lobby Bossa, Pip, the Morning Check, Balance Age, Calendar, Clam.
5. **Events** in this order: Cannonball Cup, Paddle Slalom, Tide Table, Tempo Squats, Breath Bloom, Step Party (with sequencer and rhythm clock), Morning Lap, Plank Standoff, Floatie Spin, Tray Trek.
6. **Meta.** Days, unlocks, titles, wardrobe, flip-flops, Yesterday You, absence comments, all songs and SFX.
7. **Finale and endings.** Big Stand, both endings, credits, Free Play.
8. **Shell.** Attract, Settings, Dev Mode, touch-only card, How to Play, About.
9. **Multiplayer.** Full Medley, hub ghosts in every lane, Play Together.
10. **Polish.** Write the script to full length, feel pass on every event using the sliders, extra set dressing, particles, transitions, stingers.
11. **Finish** (section 18).

**If time runs short,** cut in this order and remove all traces, leaving no stubs: Tray Trek, Floatie Spin, Plank Standoff. The roster, day table, attract list and Schedule all read from data, so a removed event leaves no hole; move its day's minute goal down to match. Everything else is required. Nothing may ship half-working; your brief says no TODOs, placeholders or stubs.

## 18. Finishing

1. Write the exit interview your brief names. Fill every field honestly; `usage` is exactly "added on import". Suggested `aiHub` values: type `Game`, genre `Sports`, source `Wii Fit`, series `Wii Fit`, players `1–4`, tags from `3d`, `third-person`, `comedy`, `sports`, `versus`, `low-poly`. Check that it parses.
2. Run `tools/build.sh`: copy the exit interview into `about-data` in the page, run the single-file build with your title, description and theme colour, and write the HTML where your brief says. The About screen shows Source Information, Testing Feedback, Engine Feedback and Prompt Feedback from that block, including the fonts' and motion libraries' credits (`engine/store/CREDITS.md`, each clip set's `credit`).
3. Run `tests/run.sh all` on the final page. Open it once from `file://` at 1920x1080 and look at one frame.
4. Put the same Source Information and feedback in your chat reply.
5. Delete `engine/target` and other caches. Leave the source, tests and notes in the dev folder.

### What each brief item maps to

| Brief item | Section |
|---|---|
| Genre and perspective | 1 |
| Title method | 0, 17 |
| Research | Optional. The plan already reflects a short web search on Wii Fit, and that is enough; report what you actually did |
| Single HTML package | 14, 15, 18 (no external dependencies are needed) |
| Build on the engine, change anything | 14 |
| Art direction, new assets, library for generics | 8 |
| Animation | 9 |
| Audio in code, gibberish voices, music at 10% | 10, 16 |
| Online and multiplayer, in the hub and on its own | 13, 16 |
| Dev folder, bundling, shared machine, ports and processes | 0, 15, 16; your brief has the rules |
| Performance out of scope, as much detail as the scene needs | 8, 15 |
| One test command, scripted playthrough, screenshots only when needed, no review agents | 16 |
| Stand-ins: pad, touch, sound, second player, iPhone, TV | 15, 16 |
| Original game, feature-complete vertical slice, extendable with normal tools | 1, 14 (all data in TOML, JSON clips and props; `README.md` explains adding an event, a set and a song) |
| Dev mode from pause, live sliders, reset | 11 |
| Attract mode | 12 |
| Narrative tone | 7 |
| 10-foot, controller-first, native keyboard and mouse, glyphs, Xbox option, no dense screens | 3, 11 |
| Touch-only behaviour | 11, 12 |
| No TODOs or stubs | 16, 17 |
| Source Information and all feedback in chat and on About, exit interview | 11, 14, 18 |
