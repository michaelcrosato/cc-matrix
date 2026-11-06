# Game plan: a balance-and-wellness game inspired by Wii Fit

You build this without the director. This plan is complete: follow it, and where it is silent use your judgment and
write the call in `labs/game/README.md`. Your own TASK.md still rules: it holds the file and folder names, the title
rule, and the reports. Every path below is relative to your dev folder.

**[tested]** marks what was actually run on this machine on 2026-11-04, against my-3dge at commit e7a1243. **[source]**
marks what was read in that commit's code but not run. Trust both over your memory of three.js or the engine. Anything
unmarked is design: yours to tune.

Contents: 1 The game · 2 World and cast · 3 The one verb · 4 Controls · 5 Structure · 6 Activities · 7 The finale ·
8 Screens · 9 Multiplayer · 10 Art · 11 Animation · 12 Audio · 13 Writing · 14 Tech · 15 Engine traps · 16 Testing ·
17 Build order · 18 Done · 19 Reports · 20 Brief-to-plan map

---

## 1. The game

**Pitch.** You are a guest at the Little Fulcrum Wellness Retreat, a spotless island run by a retired bathroom scale
who stopped weighing people and now measures only how much you wobble. Every activity (poses, reps, step class,
paddling, a slackline, a tilting sand garden, sitting perfectly still while a frog judges you) is played through one
verb: keep your centre of balance where it should be. Over five days the deadpan gets stranger. The plaques move.
Marbles roll by themselves. The staff keep asking you to stand further east. Little Fulcrum is balanced on a single
rock. On the last night the storm comes, the island tips, and in the finale your thumb's balance *is* the island's.

**Genre:** a 3D sports and wellness anthology of balance activities around a small walkable island, with a daily-ritual
meta game and a comedy story. **Perspective:** third person throughout: a chase camera on the island, and a purpose-built
camera for each activity (the table in section 6). **Hub genre:** Sports.

**Pillars**, for every decision:

1. **One verb, many bodies.** The left stick is your weight. A new activity changes what your weight moves, never how
   you move it. Fifteen seconds with any activity teaches the next one.
2. **Your thumb is the exercise.** The character's limbs follow the input directly, by scrubbing animation (section 11).
   Nothing plays "a squat" at you. You do the squat.
3. **Deadpan kindness.** Nobody shouts, nothing is a game over. The game is polite, slightly invasive, and proud of you
   in a way that worries you.
4. **The daily ritual.** A morning check, one big number, a stamp, a growing stack of pebbles. Coming back is the game.
5. **A small joke grows into the world.** The tilt starts as a sign that says "Please keep to the centre". It ends with
   a storm and a whole island on your thumb.
6. **A class, not a match.** Other people are on the next mat, wobbling. You can see them. It is enough.

**Take from the source (feel and mechanics):** the centre-of-balance dot; holding still as a skill; lean-steered
minigames; breathing; rhythm stepping; rep counting; a daily test that yields an "age"; a talking fitness peripheral
with personal questions; a serene instructor; earning time-based currency in a plaza; passive-aggressive encouragement.

**Never take (this is an original game, not a recreation):** the word "Wii" anywhere in the game except the About
screen's Source line and the hub's source field; "Fit Age", "Fit Credits", "Fit Piggy Bank", "Body Test"; the source's
trainer look; the Balance Board's shape or lines; Mii-like avatars; Wuhu Island; the source's minigame names, course
layouts, menus, logo, fonts, jingles or melodies.

**Never do, ever:** weight, BMI, calorie or body-size talk or numbers. All judgement is of *wobble*. That is also the
game's best running joke: the scale refuses to weigh anyone.

---

## 2. World and cast

**Little Fulcrum**: a green and sand island about 200 m across, one low summit, a clean white retreat scattered on it,
open sea to every horizon. It looks like a brochure. Everything is very slightly too tidy.

Station layout, in metres (x east, z south, island centre at 0,0; tune by eye, keep the relations):

| Place | Around | Holds |
|---|---|---|
| Ferry Pier and Beach | (0, 100) | Arrival, the ferry; the south shore |
| The Plaza | (0, 34), flat, y≈8 | Tare's Platform (Morning Check), Noticeboard, your Cairn |
| Pose Pavilion | (-52, 18), flat | Pose Class, Group Class: four mats, white floor, pale curtains, open sides |
| Still Pond | (-70, -12), a hollow | Still Pond |
| The Annex | (52, 22), flat | Reps Hall and Step Class under one long open roof, a mirror wall |
| Guest Huts | (64, 52) | Your hut: sleep ends the day |
| South-West Lagoon | (-60, 85) | The Line (headland to rock), Paddle Glide launch |
| Sand Terrace | (30, -48) | Sand Garden |
| North Cliff | (0, -88), 14 m drop | Cliff Plunge |
| Hoop Beach | (62, 84) | Hoop Patrol |
| Lighthouse | (84, -60) | Landmark; the storm's beam |
| East Terrace | (74, 8) | The "high side" in the finale |
| Centre Stone | (0, 0), the summit | A plain stone with a brass plate reading "Do not". The finale ends here |

**Cast** (all original, pronouns as given):

- **Tare** (it): the mascot and guide. A squat round dial bathroom scale on two stubby legs, face in the dial. Retired
  from weighing. Hops beside you. Chirpy, nosy, secretly sad. Keeps the secret of the rock badly.
- **Instructor Plumb** (they): head instructor. Tall, narrow, utterly vertical. Pale mint tracksuit, eyes always closed
  in two calm arcs, one very long straight plait that has never once moved. Speaks slowly and flatly. In the storm the
  plait swings for the first time, and that is the most frightening moment in the game. At dawn Plumb opens their eyes,
  once.
- **Gerald** (he): a retired guest with immense calves, always already there, always finished. Says only "Morning."
  until Day 4.
- **Bex** (they): a bored teenager sent here by a parent, holding a phone-shaped stone, annoyingly excellent.
- **Old Nan** (she): 91, Wobble Age 19. Stands where you left her. Nobody has seen her arrive.
- **The Gull** and **the Frog** (it): recurring menaces. The Gull lands on you at the worst moment. The Frog just looks.
- **You**: "Guest". Pick one of three looks and a tracksuit colour at the pier. No name entry.

**The five-day story** (delivered in one-liners, never in walls of text):

| Day | Beat |
|---|---|
| 1 Arrival | Ferry leaves. Tare greets you. First Wobble Age is terrible. Sign: "Please keep to the centre." |
| 2 The Mat | Plaques have moved. "Guests are reminded to distribute themselves evenly." |
| 3 The Water | Drinks slide along tables. A notice calls this "a feature of the drink". |
| 4 The Sand | Marbles in the Sand Garden roll with nobody there. Gerald speaks. At night Tare confesses: the island sits on one rock. "We don't mention it to guests. You're a guest. I didn't mention it." |
| 5 The Tilt | Group Class. Then the storm, The Great Tilt (section 7), dawn, the last Morning Check, credits. |
| After | "You may stay as long as you like. The ferry does not return." Free Play, and a fresh Morning Check every in-game day. |

---

## 3. The one verb: the Wobble Model

This is the game's core. Build it first, tune it in dev mode, and reuse it everywhere. It lives in the sim as a
component `wobble` on each balancing body, one per seat.

**The centre of balance (CoB)** is a point in a unit disc: `x` left to right, `y` back to forward. `r = 1` is the edge:
past it you topple.

Each step (1/60 s), for each axis:

```
target  = slew(stick + mouse, 4 units/s) × (gentle ? 0.4 : 1) × reach      // clamped to the disc
accel   = gain × (target − cob) + instability × cob + noise(t) × (1 − calmEffect × calm) + disturbance
vel    += accel × dt;   vel *= exp(−damping × dt);   cob += vel × dt
```

| Setting | Default | Range | What it does |
|---|---|---|---|
| `game.wobble.gain` | 14 /s² | 4–30 | How fast your weight follows your thumb |
| `game.wobble.instability` | 3 /s² | 0–10 | How hard you fall away from the centre |
| `game.wobble.damping` | 5 /s | 1–12 | How heavy the body feels |
| `game.wobble.noise` | 3.5 /s² | 0–8 | Sway strength |
| `game.wobble.noiseRate` | 0.15 Hz | 0.05–0.4 | Sway speed: a slow push you lean against |
| `game.wobble.reach` | 0.9 | 0.5–1 | Full stick's target; a held full stick topples, on purpose |
| `game.breath.period` | 8 s | 4–14 | One breath, half in, half out |
| `game.breath.calmEffect` | 0.5 | 0–1 | How much full calm quiets the sway |

Sway per axis, phases and small rate ratios `m` drawn once per seat from a named stream (`w.rng('sway')`), never
`Math.random`, and written with plain `Math.sin` so the sim's math swap reaches it:

```
noise(t) = ( sin(2π·rate·m1·t + p1) + 0.6·sin(2π·rate·1.7·m2·t + p2) + 0.3·sin(2π·rate·3.1·m3·t + p3) ) / 1.3      // mi in 0.8–1.25
```

**These numbers are modelled, and the slow sway matters [tested in a small simulation of this exact model, 20 s, 10 seeds,
staying in a ring of 0.22]:** no input 38%; a human-like thumb (250 ms reaction, proportional gain 1.2, a little jitter) 90%;
a sloppy thumb (350 ms, gain 0.8) 72%; a no-delay bot 100%. A ring of 0.16 drops the thumb to 65%. Off-centre seats out to
0.35 hold at 87%, and 0.6 starts to topple (so keep seats within 0.5). **At the 0.45 Hz sway first tried, doing nothing beat
the human thumb,** because a 250 ms reaction turns correction into amplification, so keep the sway slow. Nobody can play by
hand here: the delayed-thumb bot (section 16) is how you judge feel.

The universal 4 units/s slew is what makes keyboard feel analog: a quick tap is a small nudge, a held key is a full lean.
Sticks barely notice it. Mouse adds its own target with a slow decay (section 4).

**Topple.** `r > 1` for 6 steps: the body stumbles (`reactTo` flinch, a stumble clip, a creak), the activity decides the
price, and the CoB returns to centre over a second. It is never a game over.

**Breath.** The third input is both feet held. A guide ring swells and shrinks with `breath.period`. Holding both feet
fills `lungs`; letting go empties them. `sync` is a running match between your lungs and the guide. Good sync raises
`calm` (0–1), which quiets the sway, warms the picture slightly, softens the sound, and pays a bonus. Breath is used in
still activities and is the charge mechanic in fast ones. Being out of sync has no penalty beyond losing the help.

**Feet.** Left and right foot are the two triggers (analog) or shoulders. Used for steps, rhythm, paddling, jogging and
one-leg holds. Both together is breath, or a jump in Step Class. That is every input the activities need: **Lean, Left
Foot, Right Foot, Both Feet.**

**Scoring.** Every activity yields 0–1000 and a rank: 0 **Present**, 300 **Adequate**, 550 **Composed**, 750 **Serene**,
900 **Unsettling**. Pebbles earned: 1 to 5 by rank.

**No softlocks.** Every activity and every finale step ends by itself: each step has a time box, after which it moves on with
a remark ("We will call that a start."). A player who puts the pad down reaches the results screen.

**Balance targets the tests enforce** (section 16) on 10 seeds at default settings, in every activity: the perfect bot
scores ≥ 750, the human-like delayed thumb ≥ 550, the sloppy thumb ≥ 300, no input at all ≤ 500 and below the human-like
thumb. Random mashing never crashes.

---

## 4. Controls

The DualSense on a TV is the design target. Keyboard and mouse are native, not stand-ins.

| Verb | DualSense | Keyboard | Mouse |
|---|---|---|---|
| Lean (activities) | Left stick (D-pad too) | WASD or arrows; Shift is gentle | Move: pointer-locked movement leans |
| Left foot / Right foot | L2 / R2 (L1 / R1 too) | Q / E | Left button / Right button |
| Both feet (breathe, jump) | L2 + R2 | Space | Both buttons |
| Pause | Options | Esc | |
| Walk (island) | Left stick | WASD; Shift walks slowly | |
| Look (island) | Right stick | | Move (pointer lock) |
| Talk, use, enter | Cross | E or Enter | Left button at the thing in view |
| Hop | Square | Space | |
| Programme (today's list) | Triangle | Tab | |
| Wave | Circle | C | |
| Menus | D-pad or stick, Cross, Circle | Arrows, Enter or Space, Esc | Hover moves focus, click picks |

Activity-specific mouse feel: in Sand Garden the pointer's place on the tray is the tilt; in Hoop Patrol you circle the
mouse; Step Class is left and right click on the beat. On the island the thing at the centre of the screen gets a highlight
and its prompt, and left click uses it.

**Prompts** follow the input used last (`input.lastDevice`), switching the same frame. Pad: PlayStation glyphs (Cross,
Circle, Square, Triangle, L1, R1, L2, R2, sticks) drawn as inline SVG. Settings has "Button icons: PlayStation / Xbox"
(A B X Y, LB RB LT RT). Keyboard and mouse: key caps and a mouse icon with the button lit. Never rely on the engine's
`input.prompt()` text for pads: it guesses the family from `Gamepad.id` and defaults to Xbox **[source]**.
Read the action's codes, pick the ones for the device with `deviceOf`, and map each code to your glyph.

**Action maps** (`defineActionMap`, switched live with `engine.input.use(id)`):

```ts
// actionMap:balance, every activity. [tested]: Space on both feet gives both held; values read move actions too.
defineActionMap('actionMap:balance', {
  description: 'The lean, the two feet, and anything else, which still pond punishes.',
  actions: {
    forward: ['KeyW', 'ArrowUp', 'PadUp', 'PadLeftStickUp'],
    back: ['KeyS', 'ArrowDown', 'PadDown', 'PadLeftStickDown'],
    left: ['KeyA', 'ArrowLeft', 'PadLeft', 'PadLeftStickLeft'],
    right: ['KeyD', 'ArrowRight', 'PadRight', 'PadLeftStickRight'],
    footl: ['KeyQ', 'MouseLeft', 'PadLeftTrigger', 'PadLeftShoulder', 'Space'],
    footr: ['KeyE', 'MouseRight', 'PadRightTrigger', 'PadRightShoulder', 'Space'],
    gentle: ['ShiftLeft', 'ShiftRight'],
    act: ['KeyF', 'Enter', 'PadSouth', 'PadEast', 'PadWest', 'PadNorth'],
  },
  values: { 'game:r': 'right', 'game:l': 'left', 'game:f': 'forward', 'game:b': 'back', 'game:fl': 'footl', 'game:fr': 'footr' },
  lock: true,
});
```

The sim reads raw lean as `game:r − game:l`, `game:f − game:b` (a key absent is 0), not the camera-turned `move`.
Triggers count as "held" from 0.5 but their `values` are analog below that.

`actionMap:roam` is the same walk block plus `jump: ['Space', 'PadWest']`, `use: ['KeyE', 'Enter', 'MouseLeft', 'PadSouth']`,
`walk: ['ShiftLeft', 'ShiftRight']`, `plan: ['Tab', 'PadNorth']`, `wave: ['KeyC', 'PadEast']`, `lock: true`.

Front-end screens use the engine's system layer (`uiAccept`, `uiCancel`, `uiUp`…), which no map can rebind, with a map that
has `lock: false`, or a click on the canvas behind a menu captures the pointer **[source]**. Sand Garden uses a copy of the
balance map with `lock: false`, so the pointer stays visible: the page sends its place as `game:pointer`.

Inside activities, read only the map's actions, never `uiAccept`: Space is also breath. Skipping a demonstration is `act`.
The first time a mouse player needs the lean, show "Click to lean with the mouse": browsers grant pointer lock only in a click.

**Mouse lean:** while pointer-locked in an activity, the page adds `pointermove`'s `movementX/Y` per frame and sends
them with `engine.input.virtual.axis('game:mouse', [dx, dy])`. The sim keeps `mouseTarget += delta × sensitivity`,
decaying with a 0.6 s time constant. Sensitivity lives in Settings.

**Rumble:** a light `vibrationActuator.playEffect('dual-rumble', …)` on topple, on beats in Step Class, and growing with
`r` near the edge; try/catch around it; a Settings toggle.

---

## 5. Structure

**The Programme.** A five-day residency: a first full play takes about 45 minutes. Each day is a Morning Check plus three
activities, from a data table in `labs/game/scenes/data/days.ts`:

| Day | Activities |
|---|---|
| 1 | Morning Check (tutorial) · Pose Class A (Seated Nothing, Patient Chair, Heron) · Still Pond · a walk to find the Noticeboard |
| 2 | Morning Check · Reps Hall · Sand Garden · Pose Class B (Archer, Comma, Napkin) |
| 3 | Morning Check · Paddle Glide · The Line · Step Class |
| 4 | Morning Check · Hoop Patrol · Cliff Plunge · Island Jog with Gerald |
| 5 | Morning Check · Group Class (you and CPU guests) · Pose Class C (Bridge, Lighthouse) · The Great Tilt |
| After | Final Morning Check, credits, then Free Play with every activity and daily checks |

Finishing all of a day lets you sleep at your hut (walk there, or pick it from the Programme). Every activity can also be
replayed from the Noticeboard once met. Activities have no fail state: finishing at any rank counts.

**Getting around.** You may walk everywhere, and the island rewards it, but nothing requires it: every Programme and
Noticeboard item has "Go", which fades to the station. A controller player on a sofa never has to cross the island.

**Wobble Age.** The Morning Check's result, from 18 to 82: `age = round(18 + 64 × (1 − s)^k)`, `k` is `game.age.k` (1.3).
One big number, a remark, a stamp on the calendar, and a line graph of at most seven points. Always compared with yesterday,
in a tone of mild scientific surprise.

**Pebbles and your Cairn.** Pebbles are the currency: 1 to 5 per activity by rank, plus 20 hidden around the island. You
never spend them. They stack, one by one, on a physical cairn in the Plaza, with a satisfying clack. The cairn leans
slightly according to your last Wobble Age and stands true at 18. Thresholds unlock things, shown on the Noticeboard:
10 Expert variants (a smaller ring, more sway), 20 and 30 tracksuit colours and a headband, 40 the "Unsettling" stamp set.

**Exploration.** 20 pebbles, 12 "Did you know?" plaques, and each cast member has 3–5 new lines each day. Sit on a bench
to watch the view with the Meditate clip. Wave at Gerald. Plaques visibly creep downhill across the days.

**Tilt as story.** A value `island.tilt` starts at 0.4° on Day 1 and rises by 0.5° a day, so drinks slide, marbles roll,
loose props drift and the sea sits fractionally wrong at the horizon. Only the Great Tilt gives it weight in play.

**Saves** go in the page store (`createStore`, prefix unique to your game): day, done list, ages, pebbles, finds,
outfits, bests, settings. The sim never reads them: the page hands the sim its starting state through a scene action
(`game.begin`, section 14). Settings has Erase with an in-game confirmation, never `confirm()`.

**Built to grow.** Days, poses, charts, trays, courses, lines, lures and settings are all data tables, one file each, so
later content is adding rows. Keep it that way: it is part of the brief.

---

## 6. Activities

Every activity is a module exposing the same shape: `{ id, title, station, camera, map, setup, step, teardown, score,
bot, attract, short? }` in `labs/game/scenes/events/`. `step` emits sim events; the page turns them into text, sound and
HUD. `bot` writes the same seat input a player does, and is used by tests, attract mode and dev auto-play. `short` is the
45-second form for rounds (section 9).

| Activity | Station | Camera | Verbs |
|---|---|---|---|
| Morning Check | Plaza | Front, low, slow push-in | Lean, a foot |
| Pose Class | Pavilion | Three-quarter, drifting orbit round your mat | Lean, foot or both |
| Reps Hall | Annex | Side three-quarter, mirror behind | Lean scrubs the body |
| Step Class | Annex | Behind and above, class in view | Feet, both, some lean |
| Still Pond | Pond | Fixed portrait, front | Both, and nothing else |
| The Line | Lagoon | Behind and above, dolly along the line | Feet, lean x |
| Paddle Glide | Lagoon | Chase, low | Lean, feet |
| Sand Garden | Terrace | Top-down, slight perspective | Lean, or pointer |
| Cliff Plunge | North Cliff | Side dolly, falling follow, water-level splash | Both, lean |
| Hoop Patrol | Hoop Beach | Front, wide | Lean in circles, or feet |
| Island Jog | Whole coast | Chase (engine `cam3=chase`) | Stick, feet |

### Morning Check (about 75 s)

Tare's Platform. Tare asks one yes/no question for the day (it changes only the remark). Then three tests:

1. **Still Ring**, 12 s: stay inside a ring of r = 0.22, narrowing to 0.16 for the last 4 s. `A` = share of steps inside.
2. **Reach**, up to 24 s: six targets (r = 0.16) at radius 0.5 in a seeded order; hold each 0.5 s. `B` = 1 − time/24.
3. **One Foot**, 8 s: hold the foot Tare names; instability × 1.6; ring r = 0.3. Letting go pauses and drains. `C` = share inside.

`s = 0.45A + 0.3B + 0.25C`; score `s × 1000`; Wobble Age as in section 5. Reveal: a large CSS dial spins past 100, "recalibrating",
overshoots, and settles. The Day 1 version introduces each verb with one line at a time.

### Pose Class (about 2.5 min, three poses)

Plumb demonstrates on the front mat (4 s, skippable). "Now you."

- **Enter:** a guide dot travels a curved path on the disc from centre to the pose's *seat*. Stay within 0.18 of it and
  progress advances; progress scrubs the pose strip, so the body goes into the pose exactly as your thumb does. If you never
  follow, Plumb waits 10 s and moves on: "We will call that a start."
- **Hold:** `game.pose.hold` s (12) with the CoB in the seat ring (`game.pose.ring`, 0.2), breathing with the guide, while
  your off-seat lean visibly tips the body over. CPU guests hold too. Plumb does not move.
- **Release:** "And rest." Score: `1000 × (0.7 × inRing + 0.3 × sync) − 60 × topples`, class mean is the result.

| Pose (id) | What it is | Seat (x, y) | Rule |
|---|---|---|---|
| Seated Nothing (`nothing`) | Cross-legged, hands on knees | 0, 0 | Sway × 0.5; breath weighs 60% |
| The Patient Chair (`chair`) | Knees bent, arms forward | 0, −0.35 | Hold both feet throughout, so no breath; sway climbs with time |
| The Heron (`heron`) | One leg, foot on thigh, palms overhead | 0, 0 | Hold the standing foot; instability × 1.5 |
| The Archer (`archer`) | Long lunge, arms out | 0.35, 0.35 | Instability × 1.2 |
| The Sideways Comma (`comma`) | Side bend | 0.5, 0 then −0.5, 0 | Two holds, 8 s each |
| The Folded Napkin (`napkin`) | Forward fold | 0, 0.5 | Low camera; the Gull lands on your back halfway |
| The Polite Bridge (`bridge`) | On your back, hips lift | 0, 0 | Hips follow your lungs; breath weighs 70% |
| The Lighthouse (`lighthouse`) | Tiptoe, arms straight up | 0, 0 | Ring 0.14; sway × 1.2 |

### Reps Hall (about 90 s, three exercises)

The signature "thumb is the exercise" activity. A tall gauge on the HUD shows a band moving at the tempo
(`game.reps.tempo`, 3 s a rep). Stick depth moves your marker and scrubs the body. Stay within 0.2 of the band to bank the
rep. Gerald, beside you, does two for each of yours.

- **Deep Knees** (10): pull back to squat, return to stand.
- **Polite Push-Ups** (8): hold both feet ("palms on the floor") and scrub the push-up clip with the stick.
- **Side Lunges** (10): stick x, alternating sides.

The band speeds up a little and sway rises near the end. Near the finish the counter cheats: "9 of 10" becomes "10 of
11". Plumb: "Four more. I may be lying." Score: mean rep accuracy.

### Step Class (about 100 s)

Rhythm on a step platform in the Annex, three phrases at 104, 112 and 120 BPM (`game.step.bpm` scales them), charts as
strings in `labs/game/scenes/data/charts.ts`: `"L . R . L . R . | L L R . B . . ."`. Footprints scroll to a hit line on the
HUD, floor tiles light in the world. Notes: L, R, B (both, a jump) and side steps (lean plus foot).

Windows: Perfect ±3 steps, Good ±7 (`game.step.perfect`, `game.step.good`). Combo adds up to × 1.5. The guests behind you
follow your combo: lose it and they fall out of time, one by one, politely.

**Beat audio goes on the effects bus, not the music bus.** Music defaults to 10%, so the song is only a bed. Sim `beat`
events fire claps and kicks at full level. The bed has no drums, so nothing flams against it. Timing is in sim steps,
never audio time.

### Still Pond (75 s; 45 s in rounds)

The funniest thing in the game, and almost no input. You sit cross-legged on a jetty at dawn. **Composure** starts at 1000.
The only correct input is breathing with the guide. Anything else is "You moved": stick past 0.25, any button, a stray
foot, or mouse movement past a small threshold. Each costs `game.pond.penalty` (80), debounced 1 s, and sends a ripple
across the pond while the Frog turns to look.

Score: `Composure × (0.5 + 0.5 × sync)`, so doing nothing at all earns "Adequate".

Lures, from a seeded table, every 6–10 s, escalating:

- A big glyph prompt for whichever device you use: "PRESS NOW".
- Tare: "Psst. Is this on? Press ✕ for yes."
- The phone-shaped stone buzzes.
- The Frog sits on your knee. The Gull lands on your head.
- A fake pause menu slides in with "Resume" highlighted.
- "Your controller appears to be disconnected. Press any button."
- Plumb, very quietly: "You are doing it wrong."
- The credits roll. "Thanks for playing! Press ✕ to continue."

Real pause (Options, Esc) always works and costs nothing. Ending: "You did nothing for seventy-five seconds. Nobody has
ever been prouder of you. Nobody was watching."

### The Line (about 75 s)

A 40 m slackline across the lagoon with three flags. Alternate feet to step: each step moves 0.75 m and kicks you sideways
(`game.line.stepKick`, 0.35); the same foot twice is a stumble. Lean x fights it. Gusts every 6–10 s, telegraphed 1.5 s ahead
by ripples and a flag on Tare's little boat (`game.line.gust`). At 15 m the Gull lands on your arm, adding a steady bias
until you flick it off with a fast stick flip. Falling is a large splash, then Tare's boat takes you back to the last
flag: "You have left the line. The line is fine." After 120 s the boat collects you: "The line closes at this time."
Score: `1000 − 150 × falls − 8 × max(0, seconds − 50)`, times the share of the line crossed.

### Paddle Glide (75 s)

Stand on a board. Forward lean is speed (`game.paddle.speed`, 6 m/s), side lean steers (1.2 rad/s), feet alternating at
about 1.2 Hz give +30% and a kick. Twelve buoy gates round the lagoon with seeded jitter. A ferry wake at gate 7 and a
crossing turtle at gate 9 shove your CoB. A topple is a splash and a 3-second remount. Score: gates × 60 + up to 280 for
time.

### Sand Garden (90 s, five trays)

A raked sand tray on a stand, seen from above. Lean tilts it up to 12° (`game.garden.tilt`); the mouse pointer's place on
the tray does the same. Marbles obey your own 2D integrator in the sim (slope × `game.garden.gravity`, friction, ridge
segments, holes that catch below `game.garden.sink` speed). Trays are data, 1–3 marbles each, rising to moving rakes and a
gap in the rim. Score: share sunk × 800, plus time left. No Wobble noise here: this one is about touch.

### Cliff Plunge (three dives)

A 14 m cliff. **Compose:** hold ring and breath for 4 s to fill power. **Go:** release both feet as a swinging gauge peaks.
**Air** (about 2 s): lean y spins you, lean x twists, scrubbing a rotation strip. Enter the water within 15° of vertical.
Three Gulls hold up score cards, 0 to 10. Sum of all cards, scaled to 1000. Huge splash, water-level camera, one judge
always scores 4. Wait too long at the lip and you slip off anyway, a small splash, low cards. This is the attract mode's best shot.

### Hoop Patrol (60 s)

Hoops fly in from Tare. Spin your stick in circles: angular speed in the band (`game.hoop.bandMin` 5, `bandMax` 9 rad/s)
keeps every hoop up; outside it they sink and fall. A new hoop every 8 s from a telegraphed side: lean that way within 0.6 s
to catch it. Up to eight at once. Score: hoops × seconds, scaled. The hip-circle strip scrubs with your stick's angle, so
the character's hips follow your thumb, with increasing dignity. Keyboard and accessibility: alternate Q and E at 2.5 Hz or
more counts as spinning. Mouse: circle it.

### Island Jog (about 150 s)

Follow Gerald round the coast path, a ring of flags past every landmark. Stick steers; alternating feet at about 2.5 Hz gives
+35% speed (swap `actor.character` for another `createCharacter` with the new speed **[tested]**). Stay within 8 m of him ("the Pace Ribbon").
Score: share of time in the ribbon. Tare hops beside you and talks, the plaques go by. At the end Gerald says: "Nice weather
for it." It is the longest thing Gerald will ever say.

### Group Class

See section 9.

---

## 7. The finale: The Great Tilt (about 4 minutes)

Day 5, evening. It uses every verb at the scale of the world. There is no fail state, only remarks.

**How the tilt works.** `island.tiltX, tiltZ` are sim values. The island's geometry never moves. Instead:

- Actors get a slope push: the pilot system (section 14) adds `slope × sin(tilt)`, downhill, to the move it writes.
- Dynamic props (sun loungers, crates, drinks) get a per-step impulse with `knock`. Rapier's own gravity stays straight
  down: `physics.gravity` has no sideways part **[source]**.
- A custom camera banks with `makePose({ roll })` **[source]**. The sea prop, on a kinematic body, counter-rotates
  so the horizon stays level on screen while the island visibly tips. Use a sky with no silhouette backdrop for this.

Tilt grows by `game.tilt.rate`, and each deed below takes some off.

1. **Storm (20 s, cutscene).** The sky darkens, rain falls (`frame.emit`), the ferry horn sounds far away. Close-up: Plumb's
   plait swings. Plumb, flat as ever: "The island is now six degrees out of true. Please remain calm. Calm is mandatory."
2. **Everyone East (75 s).** Slope push is on. Twelve guests (crowd agents; Gerald, Bex and Nan among them) drift downhill
   politely. **Calm Call:** hold both feet 2 s, release: a calm wave (radius 8 m) makes nearby guests follow you. Lead them to
   the East Terrace (a sensor): each one delivered takes off 0.5°. Loungers slide through. Nan walks up on her own and is
   already there.
3. **Counterweights (45 s).** Two pebble carts on rails, cranked by alternating feet while you lean into the slope with the
   Wobble Model: your whole Cairn is on one of them. (First part to cut if the budget runs short.)
4. **The Centre Stone (60 s).** You climb to the summit and stand on the plate that says "Do not". The camera pulls back to the
   whole island. **Now the tilt is your CoB:** the stick moves your weight, and your weight moves the island. Waves are the
   disturbance, breathing quiets them, the ring shrinks as the storm peaks, the lighthouse beam sweeps. Topple: the island lurches
   3° and Plumb says "Again, please." Hold through to the end.
5. **Dawn.** It is level. The rain stops, the sea is glass. The plait stops. Plumb opens their eyes, looks at you, says "Hm.", and
   closes them. Tare: "Everything is balanced now. Please do not tell anyone about the rock." The last Morning Check. Credits, with
   every guest holding a pose as the camera drifts past.

Steps 2, 3 and 4 are time boxed: when one runs out, guests shuffle uphill by themselves, or the fade takes you to the stone with a
remark, so the ending always comes. Score: delivered guests, tilt at the end of step 4, breath. It feeds the final remark only.

---

## 8. Screens and UX

**10-foot rules (test them at 1920 × 1080):** body text at least 2.6vh (28 px), prompts and menus 3.2vh or more; one idea per
screen; at most six menu rows; 5% safe margins; focus unmistakable from a sofa. **No dense web-style data screens:** results are
one word, one number, one sentence, one small graph. The dev panel is the only busy screen, and only developers open it.

**UI look:** pebble-shaped rounded panels in warm off-white with soft shadows, not the source's look. A rounded system stack
(`ui-rounded, "SF Pro Rounded", "Segoe UI Rounded", system-ui`); fonts are allowed but not needed. Screens are HTML/CSS under
`engine.ui.root`, with `createMenu` for lists (hover already moves its focus, click picks **[source]**) and a small
grid of your own for the Noticeboard. `createDialog` is fine for speech: keep text on screen, always, with the voice.
Restyle the engine's widgets for 10 feet: their defaults are small.

**The Balance Disc** is the HUD's heart, HTML/SVG, 30vh across at the lower centre: target ring, your dot with a short trail, a
guide ring swelling with the breath, a foot pill either side with analog fill. It reads the sim's `wobble` each frame. A
matching ring also lies on the mat in the world (a component with `telegraph`, `position`, `yaw`, `u`, `size` is drawn on the
floor). In Group Class each seat gets a smaller disc under its mat.

**Flow:**

```
Load → Title ─┬─ Begin/Continue → Pier or the day's morning → Island ⇄ Activity → Results → … → Evening → next day
              ├─ Free Play (Noticeboard, after Day 1)
              ├─ Group Class → join on mats → three classes → podium
              ├─ Settings
              └─ About / Credits
      (10 s idle on any front-end menu) ⇄ Attract
```

- **Load:** HTML first, immediately ("Calibrating…"), so the screen is never blank.
- **Title:** the game's title over a slow orbit of the island, the menu, "Press any button" until a pad wakes.
- **Island:** a small prompt near things ("✕ Talk"), Triangle or Tab for today's Programme, nothing else on screen.
- **Programme:** today's list as up to four cards with stamps, each with "Go". **Noticeboard:** a 3 × 2 page of activity cards with
  best rank; L1, R1 or Q, E page through them.
- **Results:** rank word, score, pebbles falling onto a little cairn, a line from Plumb or Tare; "Again" or "Carry on".
- **Evening:** calendar stamp, the age graph, a closing remark, "Sleep".
- **Pause** (Options or Esc, in play and on the island; pauses the sim with `inspector.pause()`, `modal` keeps keys out of play):
  Resume, Restart Activity, Back to the Island, Settings, Controls, Dev Mode, About / Credits, Quit to Title.
- **Settings:** Music (**10% by default**), Effects, Voices, Button icons, Mouse sensitivity, Invert look, Rumble, Steadier Hands (an
  assist: halves the sway), Reduced Motion (no camera roll or shake), Fullscreen, Erase Save.
- **Controls:** shows the bindings per scheme; keyboard rebinding through `input.bindingsFor`, `rebind`, `listen`.
- **About / Credits:** paged, from one data file: Source Information, Testing Feedback, Engine Feedback, Prompt Feedback, credits
  (section 19).

**Dev Mode** (from the pause menu; absent in hub sessions; a clear panel that works with pad, keyboard and mouse):

- **Live sliders with Reset**, per group and for all: every numeric `game.*` setting in this plan, plus `game.pebbles.mult`. They are
  sim settings with `when: 'now'`, changed by `inspector.set(path, value)`, so they apply at once and replays hold them. Defaults come
  from `inspector.describe('setting', path)` **[tested]**.
- **Jumps:** to any day, any activity, any finale step. Finish activity now at a chosen rank.
- **Cheats:** bot plays for me, no topple, unlock all, give pebbles, reset save, a throwaway save mode (`createStore` `sandbox`).
- **Tools:** time scale (0.25, 1, 4), pause and frame step, free camera (`cam3=fly`), state overlay (CoB, calm, sync, tilt, event,
  phase, tick, hash), seed and new seed, copy tuned settings as JSON.

**Attract mode.** 10 s with no input on any front-end menu starts it; any key, mouse movement, click or pad input leaves it, back to
where you were. Set `game.auto` and restart the scene with `inspector.seed(n)` (restarts the sim, keeps settings **[tested]**).
The sim's director runs a loop with the bot cheating freely: island flyby and jog, Pose Class, Still Pond with its lures, The Line,
Paddle Glide, Sand Garden, Step Class, Hoop Patrol, Cliff Plunge, then the Great Tilt's Centre Stone, about 15 s each, then round
again. Banner: the game's title, "DEMO", "Press any button" with the current glyph. It never touches the save.

**Touch-only devices** (`(hover: none) and (pointer: coarse)`, no pad or key seen yet): no touch controls, no touch play. The title
shows "Controller or keyboard required" and a Settings button that works by tap. Attract still starts and loops behind it; taps reach only
Settings and never start play. A key or pad input at any time returns to normal. Always pass `touch=off` in the engine's query, or it draws its own touch stick **[source; the setting is accepted: tested]**.

**No WebGPU:** a plain, friendly page: "This game needs a browser with WebGPU, such as current Chrome or Edge." Never a blank page.

---

## 9. Multiplayer

The game has two kinds, both up to four players. They share one module: `labs/game/scenes/round.ts`.

**A Round** is three classes dealt from `w.rng('deal')` (same seed, same deal): Still Ring, then one of Heron, Hoop or Step, then Still
Pond, each in its `short` 45 s form with a 6 s lead-in. About 2.7 minutes. Score: the sum, 0–3000. They all play on mats, so they need
nothing but the pavilion.

### On its own: Group Class

Same screen, up to four pads (keyboard and mouse can hold one seat). Walk up to the Pavilion or pick it from the title. Mats light in
seat colours as people press Cross or Space to join. Empty seats go to CPU guests (Settings can turn them off); Day 5 fields Gerald,
Bex and Nan. CPU guests are the bot with extra sway per character. Podium at the end, and a sash reading "Least Wobbly".

The engine's gamepad device only follows one active pad, so the page reads `navigator.getGamepads()` itself in Group Class and sends
each seat's input with `engine.input.virtual.axis('game:seats', […])`.

### In AI Hub: AI Hub Session Protocol v1, mode **ghost**

Read the protocol once: `https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/README.md`. Fetch by raw URL, into
`labs/game/hub/`: `session.js` (save it as `session-client.txt`), and for tests `harness.html`, `bridge.js`, `round.js` from the same
folder. **Do not clone the ai-hub repository: it is 5.3 GB.**

Why ghost: every copy runs its own seeded round, nothing depends on a host, and each player sees the others on the neighbouring mats,
wobbling in their seat colour. It is the source's solo ritual made social without any interference.

**Tags** in the head, right after the client (the build injects them, section 14):

```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="3">
<meta name="hub:session-goal" content="Stay the steadiest across three classes">
<meta name="hub:session-howto" content="Lean: stick or WASD · Feet: L2 R2 or Q E · Breathe: both or Space">
<meta name="hub:webgpu" content="required">
```

Goal at most 60 characters, how-to at most 80. Also `hub:type` Game, `hub:players` 1-4, `hub:source` Wii Fit.

**Startup** **[tested: this shape, on the starter's one scene, passed the harness at 2, 3 (host leaving) and 4 players with the engine running in every frame]**:

```ts
const search = new URLSearchParams(location.search);
for (const key of [...search.keys()]) if (key.startsWith('aihub')) search.delete(key); // see the trap below
search.set('touch', 'off');
const AIHub = window.AIHub;
const info = AIHub?.active ? await AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true }) : null;
if (info) { search.set('scene', 'game:round'); search.set('seed', String(info.seed)); }
const watchdog = info ? setTimeout(() => AIHub.ready(), 14000) : 0;   // the harness allows 20 s after hello
engine = await createEngine({ canvas, scenes: ['game:island', 'game:round'], search: `?${search}`, /* … */ });
if (info) { clearTimeout(watchdog); AIHub.ready(); }
```

**The biggest trap in this whole plan [tested]:** the hub opens the page with `?aihub=1&aihub-seed=N`. `createEngine` treats every
unknown query key as a setting and fails with `CORE_BAD_SETTING`, **and the harness still reports PASS**, because the client keeps
answering while the game is dead. Strip those keys, and make your test assert, inside every frame, `__engine.ready === true` and
`__engine.errors.length === 0`.

**The round in a session:**

- No title, menus or attract. Straight to the game's own card: the four mats in the pavilion, Plumb in front, each player standing on their
  mat. It shows the game's title, players in colour with who is ready, how to win, this player's controls, seconds left (from the `card` event).
  Keys: Enter or Cross answers `AIHub.answer('ready')`, Triangle or T answers `'more'`, a tap or click works too. Listen for Enter with your own
  `keydown` on `window`: the harness sends a synthetic one. The card has no menus or choices, and draws numbers only from `AIHub.rng('card')`.
  Make it HTML over whatever is drawn, because the watchdog may call `ready()` while the view is still warming up.
- `start` arrives; play begins at `AIHub.time() >= 0`. Send the sim `round.go` then (scene action). On `start` also send one
  `AIHub.progress({ score: 0, label: 'Breathing in' })` and one ghost message, so a slow copy still passes the harness.
- During play: `AIHub.progress({ score, label })` whenever it changes (label at most 24 characters, "Class 2 · 640"), and every 100 ms
  `AIHub.send({ t: 'g', e: classIndex, x, y, p: poseId, s: score }, { reliable: false })`. Never above 20 a second.
- Ghosts are sim entities, because only sim entities can be drawn: incoming messages go through
  `engine.input.virtual.axis('game:ghosts', […])` to actors on the other mats, tinted with `info.players[i].color`, leans scrubbed by their CoB,
  name labels from the hub as text (never as HTML), shown only while `e` matches. On `leave`, they walk off politely.
- Finished: `AIHub.result({ score, stats, awards })` once. Stats at most six, names at most 16 characters ("Wobble Age", "Best hold", "Breath"),
  values short; awards at most three, title at most 24, detail at most 40 ("Unnervingly Still").
- `time-up`: report the current score at once if you have not. `end`: `engine.stop()`, stop all sound, take no input, send nothing.
- If `engine.ready` is false (no WebGPU): `AIHub.fail('WebGPU required')`.
- **Rules in a session:** network only through the hub; no chat or custom names; no `alert`, `confirm`, `prompt`, `window.open` or navigation; restart
  and quit do nothing. Pause is an overlay that never pauses the sim: Resume, volume, button icons. No dev mode. **Create + Options belongs to the hub:**
  while pad button 8 is held, ignore the engine's `pause`. Storage is a fresh memory copy, handled by the client, so write nothing special for it.
- Outside a session (`connect` gives `null`, or no client at all in the dev server) the game must behave exactly as it does alone.

**Boot deadline, the one place performance matters.** The harness gives every copy 20 s to call `ready()`. **[tested on SwiftShader]** the starter
game alone needed 8–16 s per copy at four copies; the engine's playground needed 52–73 s. So `game:round` is a small separate scene with just the
pavilion, the mats and the cast. The island's cost never reaches a session, and the watchdog covers the rest. Performance is out of scope everywhere else.

---

## 10. Art direction

Base: **the engine's native style**: its puppet bodies, its toon material style, its generators. New assets are everything that makes it feel like a
wellness retreat; the engine's library is fine for crates and benches.

**The look [tested: this is the top-left picture of four tried, bright and clean]:**

```ts
defineLook('look:retreat', {
  description: 'High-key brochure daylight: soft toon light, a little bloom, a thin ink line on people and things.',
  sky: 'sky:retreat', // start from sky:noon's numbers; replace its mountain backdrop with an empty sea horizon
  style: 'toon',
  filters: {
    bloom: { scope: 'all', strength: 0.35, threshold: 0.92 },
    grade: { scope: 'all', brightness: 1.08, saturation: 0.92, lift: 0.03 },
    outline: { scope: 'characters+objects', width: 1, darken: 0.25 },
  },
});
```

Set it as the default in the page's query (`post.look`). Also make `sky:retreatDawn`, `sky:retreatDusk` and `sky:storm` (`defineSky`; `node x describe sky sky:noon`
shows the fields), and a `look:storm` that drains saturation. Calm can nudge a grade through `post.filters`, which costs no shader.

**Palette:** clinical white `#F7FAFC`, sky `#BFE9FF`, mint `#BFEAD6`, sand `#F4E8C8`, lawn `#A9D98A`, sea `#6FD0E8`, coral accent `#FF8A70` for prompts and focus, slate
`#3A4A55` for text. Hub seat colours are fixed: `#e8443a`, `#3b82f6`, `#22c55e`, `#f5b700`.

**The island [tested]:** `defineTerrain` in the scene with `addTerrainBody`: 240 × 240 m, `cell: 2`, a dome radius about 110 and height about 11 plus a summit hill; `flats` for
stations; negative hills for the pond and the north cove. `high: 7` with `materials: ['material:sand', 'material:sand', 'material:lawn']` gives sand shores and lawn uplands by height.

**The sea [its look: tested]:** one huge flat prop at y = 2, a material using `map: { texture: 'texture:water', seed: 2, params: { base: '#6fd0e8' } }`, on a kinematic body. The texture is baked, so **drift the prop** slowly and bob it
a few centimetres to make the water live. Keep walkers out of deep water with a sim clamp; shallows get a splash emitter.

**Make these as props** (`node x new prop labs/game/props/<name>`; parts are geometry by id and material by id, with `tint`): mats, Tare's Platform, Noticeboard, plaques, Cairn pebbles (squashed rounded
boxes in varied tints), Pavilion (pillars, frustum roof, curtains), Annex with mirror wall, huts, ferry and pier, benches and loungers, parasols, palms (limb trunk, flattened boxes), rocks, lighthouse,
buoys, paddleboard, slackline posts and line, tray with ridges and holes (ring), marbles (a rounded box with maximum radius), hoops (ring), step platforms and floor tiles, counterweight carts and rails,
Centre Stone with its plate, drink glasses, score cards.

Anything that moves goes on a kinematic body: `body: { type: 'kinematic', shape, size }` in the prop, then `driveBody(physicsOf(w), entity.sceneProp.body, position, rotation, w.dt)` each step, with full rotation **[tested]**. So the tray, hoops, board and sea pose freely. Physically simulated things are dynamic bodies. Anything else is drawn by HTML.

**Characters** (`node x new body`, `node x new build`): Guest (three builds, palette slots for tracksuit), Plumb (very tall, thin; closed-eye arcs; `components: { secondary: { hair: 'ponytail' } }` at spawn for the plait, which the view
swings by itself when the body moves **[source]**), Gerald (`build:bulky`-like with huge calves), Bex, Nan (small, stooped), Tare (a very short build; torso a flat drum, a dial on the front, two stubby legs, no arms). On a results
screen Tare's dial is a large CSS dial with a live needle. The Gull and the Frog are engine **blob rigs** (with wings for the Gull) as crowd bodies: `addAgent`, `crowdBody`, cheap and very funny; `labs/box/cast/` has worked examples.

**Effects** (`defineEmitter`): ripple rings, splashes small and huge, pebble clack dust, calm wave, sparkle on stamps, seagull feathers, confetti on Unsettling, rain and spray in the storm. Built-ins worth using:
`emitter:confetti`, `bubbles`, `dust`, `rain`, `fountain`, `glints`, `fireflies`.

---

## 11. Animation

Base: the engine's humanoid and clip layer. New: a clip set of the game's own, all as readable text data.

**The technique [tested: pictures showed a Heron with continuous two-axis lean, and a seated pose leaning the same way]:**

1. **Own clip set**, sim-side, in `labs/game/cast/clips.ts`. Copy `data/anim/sets/mesh2motion/_set.json` → `sources.M2M_ANIMATED.rest` into `labs/game/cast/rest.json`, then:

   ```ts
   import rest from './rest.json' with { type: 'json' };
   const STAND = { hips: [0, 0, 100], body: [0, 0, 0], chest: [0, 0, 0], head: [0, 0, 0], shL: [0, 0], shR: [0, 0],
     armL: [0, 20, -100, 8, 0], armR: [0, 20, -100, 8, 0], legL: [0, 6, -100, 4, 0], legR: [0, 6, -100, 4, 0], footL: [0, 6, 0], footR: [0, 6, 0] };
   const key = (t: number, over: object) => ({ t, ...STAND, ...over });
   const strip = (over: object) => ({ src: 'RETREAT', dur: 1, loop: false, keys: [key(0, {}), key(1, over)] });
   export const SET = defineClipSet({ set: 'RETREAT', title: 'Retreat poses', format: 2, fps: 30, credit: 'Original',
     sources: { RETREAT: { file: 'none', rig: 'unreal', label: 'Original', origin: 'Written by hand', license: 'CC0', url: '', rest } },
     clips: {
       Heron: strip({ hips: [0, 0, 99], legL: [0, 2, -100, 2, 0], legR: [28, 62, -42, 118, 40], footR: [30, 20, 0], armL: [6, 4, 100, 30, 0], armR: [6, 4, 100, 30, 0] }),
       Archer: strip({ hips: [0, 0, 72], legL: [62, 12, -78, 62, 0], legR: [-70, 10, -72, 4, 0], footR: [10, 40, 0], armL: [0, 100, 4, 2, 0], armR: [0, 100, 4, 2, 0] }),
       Nothing: strip({ hips: [-5, 0, 28], legL: [70, 60, -18, 140, 40], legR: [70, 60, -22, 140, -40], footL: [-20, 60, 0], footR: [-20, 60, 0], armL: [70, 22, -60, 58, 20], armR: [70, 22, -60, 58, -20] }),
       LeanR: strip({ body: [0, 0, 8], chest: [0, 0, 4], hips: [0, 5, 99], armL: [0, 40, -70, 8, 0] }),
       // … LeanL, LeanF, LeanB the same way: the full-lean key should read about 12° on screen.
     } } as never);
   ```

   The key format's legend is `LEGEND` in `engine/anim/clip/lens.ts`. In short: `hips [forward, right, up]` in percent of hip height (100 stands, 28 sits on the floor); `body/chest/head [turn, lean, tilt]` in degrees; limbs `[forward, out, up, bend, twist]`.

2. **Strips, scrubbed.** Every pose is a two-key strip: `t = 0` stands, `t = 1` is the pose. Play it with `speed: 0, hold: true, walk: true, loop: false`.
3. **Additive leans on top.** Play `LeanR`, `LeanL`, `LeanF`, `LeanB` with `additive: true` as well; their first key must be neutral (an additive clip is its change from its first frame).
4. **Scrub each step** by writing the slot directly. It is plain, hashed sim data:

   ```ts
   for (const slot of entity.clips.state.slots) {
     if (slot.clip === 'RETREAT/LeanR') slot.t = Math.max(0, cob.x);
     if (slot.clip === 'RETREAT/Heron') slot.t = poseProgress;
   }
   ```

   (`seekClip` only reaches the top clip, so it cannot do two axes.) `spawnActor`'s `clips: { sets: ['clipset:retreat'], play: … }` plays the first clip, and `playClip` works from the first step on. **In `setup` it throws `SIM_BAD_ARGUMENT` [tested].**

**New animations to write:** the eight poses; lean strips; `DeepKnee`, `SideLunge`; `StepUpL`, `StepUpR`, `SideStep`, `Jump`; `HipCircle` (a looped key ring scrubbed by angle); `Somersault` (`body` lean running to 720°, since values keep counting past 360°) and
`Twist`; `Paddling`; `CalmCall` (hands pressed down); `Crank`; Plumb's demonstration entries; Tare's hop and its bow (a squash-and-stretch `defineAction` with `scale`); Nan's single, slow nod.

**Reuse from the engine's library** by copying the JSON of the clips you need into `labs/game/cast/clipdata/` with their source's `rest` (no dynamic imports sim-side; static JSON imports pass lint and Node **[tested]**). Find them with `node x anim find <words>`:
`MESH2MOTION/Pushup`, `Meditate`, `Cheering_Two_Hands`, `Victory`, `Greeting`; `QUATERNIUS/Jog_Fwd_Loop`, `Dance_Loop`, `Sitting_Idle_Loop`; `CMU/Wave_Hello`, `Stretch_Yawn`, `Jumping_Jacks_Loop`; `STYLE100_IDLE/Balance_Idle`, `Lunge_Idle`; `STYLE100/Balance_Walk`. Credits in section 19.

**Check by numbers:** `actionCheck` for actions, `animCheck` for poses in tests. For a look at a pose, use one screenshot, not many.

---

## 12. Audio

All sound is code and data. No audio files. Test: the built HTML holds no `data:audio`, `.mp3`, `.wav` or `.ogg`.

**Music, original, tracker notation** (`defineSong`; `node x new song`; test with `node x audio song:<id>`): light, slightly over-pleasant lobby music with plucks and soft marimba, never a melody from the source.

| Song | Use | Character |
|---|---|---|
| `song:lobby` | Title, island, in intensity layers that grow by day | 84 BPM, major sevenths, pluck over a soft bass |
| `song:stillness` | Pose Class, Morning Check | 60 BPM, sustained pad, sparse bell in time with the 8 s breath |
| `song:water` | Line, Paddle | Bouncy 96 BPM |
| `song:stepBed` | Step Class | Clavinet at chart tempo, **no drums** |
| `song:hoop` | Hoop Patrol, Sand Garden | Silly bossa |
| `song:tilt` | The Great Tilt | `song:lobby` in minor; layers build with the tilt |
| `song:dawn` | Ending | The theme resolved, alone |
| `song:stamp` | Results | A short jingle, played once |

**Music is 10% by default:** right after `createAudio()`, call `audio.volume('music', 0.1)`. The engine's default is 0.5 **[source]**. Settings shows it as 10%. Test `audio.volume('music') === 0.1` on a fresh save. Mix each song so it is fine at 100% and a whisper at 10%; nothing the player needs may live only in music.

**Voices: Animalese-style gibberish, written in code.** The engine has no speech. Build it from sound data:

- A **syllable bank** per speaker: 16 entries (`defineSfx`), each a short consonant noise then a saw through two bandpass filters at a vowel's formants. **[tested: this renders, and vowels differ measurably; nobody can listen here, so judge by numbers]**

  ```ts
  const syllable = (f0: number, f1: number, f2: number) => ({ bus: 'ui', voices: [
    { wave: 'noise', dur: 0.015, vol: 0.12, attack: 0.001, filter: { type: 'bandpass', freq: 3200 } },
    { wave: 'saw', freq: f0, to: f0 * 0.92, at: 0.012, dur: 0.07, vol: 0.5, attack: 0.006, filter: { type: 'bandpass', freq: f1 }, q: 7 },
    { wave: 'saw', freq: f0, to: f0 * 0.92, at: 0.012, dur: 0.07, vol: 0.35, attack: 0.006, filter: { type: 'bandpass', freq: f2 }, q: 9 },
  ] });
  // formants (f1, f2): a 800,1200 · e 500,1900 · i 300,2300 · o 500,900 · u 320,800. Vary the consonant's band and length for the 16.
  ```

  Bank ids `sfx:vo.tare.0` to `.15`. Each speaker has a base pitch and speed (scale `dur` by the syllable length):

  | Speaker | Base | Syllable | Character |
  |---|---|---|---|
  | Tare | 260 Hz | 60 ms | Bright, quick, rising |
  | Plumb | 135 Hz | 110 ms | Flat, breathy, no contour at all |
  | Gerald | 95 Hz | 140 ms | Gravel |
  | Bex | 210 Hz | 80 ms | Monotone with a sigh at the end |
  | Nan | 170 Hz | 120 ms | Vibrato |
  | PA | Plumb through a narrow band | | The finale's loudspeaker |

- **`say(speaker, text)`** in `labs/game/audio/voice.ts`: one syllable per two letters, hashed from the letters so the same line always babbles the same way; `audio.play(id, { pitch, when, vol, bus: 'ui', duck: true })`; pitch contour rises on "?" and falls on "."; text types in sync. Voices slider scales `vol`. Silence on spaces, longer on punctuation.

**Effects** (`defineSfx`, plus built-ins `sfx:select`, `sfx:confirm`, `sfx:cancel`, `sfx:coin`, `sfx:step*`): wobble creak with pitch by `r`; breath in and out (filtered noise); mat squeak; stamp thump; pebble clack; small and huge splashes; gull squawk; frog ribbit; rope creak; marble roll, a loop with level by speed; hoop whoosh; clap, kick, hat; whistle; ferry horn; thunder; the island's deep groan, pitched by tilt; polite crowd "ooh". **Ambience:** sea, birds, wind, rain, as loops with `loop` passes.

In `onFrame`: `audio.update(frame.camera, frame.queries ?? undefined)`, then play each new sim event by `seq` from `frame.world.events.trace()`. Reset your `seq` when `frame.world` changes (after a restart).

**Checks:** `node x qa audio`, and in the browser read levels with an `AnalyserNode` or render through an `OfflineAudioContext` (`createAudio({ context })`). Nobody can listen here, so prove each voice and song makes sound, and that music sits at 10%.

---

## 13. Writing

**Voice.** Short declarative sentences in the second person. Polite, level, a beat too honest. Statements of fact that turn into mild judgement, then keep going as if nothing happened. "Did you know?" trivia that is not quite trivia. Yes/no questions nobody should be asking. Never sarcastic out loud, never cruel, never shouting, never an exclamation mark from Plumb. Never about bodies, only about wobble. Write at least 200 lines; none longer than two short sentences. Keep them in `labs/game/ui/lines/`, keyed by id; the sim emits ids, the page says them.

Seed lines, use and add to them:

**Tare**
- "Welcome to Little Fulcrum. I am Tare. I used to weigh people. We don't talk about that."
- "I no longer measure weight. It made people sad, and it made me sad. Now I only measure how much you wobble."
- "Please step on me. Not like that. Actually, like that is fine."
- "Your Wobble Age is 61. Yesterday it was 64. You have become three years younger by standing still. Science."
- "That was your best score so far. It is also your only score so far. Well done on both."
- "You came back. A lot of people say they will."
- "Have you been leaning toward anything lately? A person? A decision?"
- "Did you sleep on your left side? You don't have to answer. I can tell. I can't tell. Did you?"
- "Please keep to the centre. No reason."
- "Have you ever stood on one foot when nobody was looking?" Yes: "I know." No: "I know."
- "Everything is fine. If anyone asks, everything was always fine."

**Plumb**
- "Good. Now do that again, but as though you meant it."
- "Breathe in. Breathe out. You have been doing this for years, and yet."
- "Your knee is where it should be. I mention it because it is rare."
- "And rest. You may stop wobbling now. Thank you for stopping."
- "You fell. The mat forgives you. The mat is not me."
- "That was adequate. I chose that word carefully."
- "Four more. I may be lying. We will both find out."

**Others**
- Gerald: "Morning."
- Bex: "My mum says this is good for me." / "I got a 98. I wasn't trying."
- Nan: "I've been standing here since Tuesday." "Which Tuesday?" "Yes."

**Plaques and notices**
- "Did you know? The average person leans two degrees toward the things they want."
- "Did you know? This plaque was four centimetres to the left on Tuesday."
- "Did you know? A flamingo stands on one leg because it has been told it is being watched."
- "Did you know? Gulls do not have a Wobble Age. They have been asked."
- "Notice: Guests are reminded to distribute themselves evenly."
- "Notice: The east lawn is fully booked. Please enjoy the east lawn."
- "Notice: If your drink slides, that is a feature of the drink."
- Evening: "Today you wobbled less than you might have. Goodnight."

---

## 14. Tech

**Stack:** my-3dge full workspace (TypeScript, three.js r182 on WebGPU, Rapier 0.21, Vite, Vitest, Playwright, HTML/CSS UI). No new npm dependencies. The engine stays read-only: `npm run check` compares every engine file with `engine-lock.json`. Workarounds go in the game; what you needed goes in `ENGINE-FEEDBACK.md`.

**Setup [tested], in the empty dev folder:**

```sh
src=$(mktemp -d) && git clone --depth 1 https://github.com/michaelcrosato/my-3dge "$src" && node "$src/tools/game/new-game.mjs" . --name <short-lowercase-name>
rm -rf "$src"    # the clone is only needed for that one command
npm ci           # 10 s. Do NOT run scripts/setup.sh here: it downloads Node and Chromium outside your folder.
npm test         # 5 s
npm run check    # 22 s
export CHROMIUM_PATH=$HOME/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
node x shot labs/game                        # 8 s. Set CHROMIUM_PATH in every shell call that opens a browser.
node x replay labs/game/replays --browser sim
```

Read `AGENTS.md` and `docs/GAME-GUIDE.md` once, as it asks. `docs/API.md` and the engine's file comments are for grepping. `labs/box/` is the worked example. Use `node x new <kind> labs/game/<dir>/<name>` for props, bodies, builds, actions, emitters, sfx, songs, looks and cameras: each comes with its test. Grow from the starter in `labs/game/`, and remove its gem game once your scenes replace it. `AGENTS.md` says to ask the owner about anything outward or costly: there is nobody to ask in this run, and nothing in this plan needs it, so take the safer choice and note it.

**The one-scene rule.** A running page cannot change scene **[source]**. So: `game:island` is the whole game on one world, with activities spawned at their stations and removed afterwards; `game:round` is the small session scene. A page picks by `?scene=` at load. Never reload the page in a session.

**The pilot.** Keep every character, the Guest included, at `player: false`, and let one sim system, `pilot`, write `actor.intents` each step: the step's `move` on the island, nothing in an activity, the bot's in attract, the slope added in the finale. This one rule makes roam, activities, attract and the Great Tilt the same code. Cameras follow only a `player: true` actor by themselves, so give them the Guest's feet with `createEngine({ cameraInput: () => ({ follow: feet }) })` **[tested: walks and the chase camera follows]**.

**Cameras and maps** are page state: when `flow` changes, the page calls `inspector.camera.set(code, { blend: true })` and `engine.input.use(mapId)`. Your own camera modes come from `node x new camera labs/game/cameras/<name>` (one each for the mat, the line, the dive); `cam3=chase`, `cam3=fly` and `cam=topdown` are built in.

**The split:**

- **Sim-side** (lint enforces it only under `labs/game/scenes/` and `labs/game/cast/`, so keep all sim code there; imports only `engine/sim-api.ts`): flow, wobble, events, bot, director, round, data tables.
- **Page** (imports `engine/index.ts`): `labs/game/main.ts`, `ui/`, `audio/`, `hub/`. It reads the sim and never writes it.
- **Page to sim** goes three ways, all recorded in replays:
  1. Scene `actions` **[tested]**: `defineScene(id, { actions: { 'game.start': (w, args) => … } })`, called with `inspector.actions.run('game.start', { event: 'pond' })`. Runs between steps, recorded in replays. **Use this for every menu pick:** `game.begin` (with the save's state, since the sim cannot read the store), `game.start`, `game.leave`, `game.sleep`, `round.go`.
  2. Custom intents: `input.virtual.axis('game:mouse', [dx, dy])`. Held until changed, and dropped while `modal()` is true.
  3. Settings: `inspector.set(path, value)`.
- **Sim to page:** components read in `onFrame`, and events from `frame.world.events.trace()`.

**Suggested layout** (each file under 400 lines, 600 is a hard error, each opening with a `@file` comment; no enums; no `any`):

```
labs/game/
  index.html  main.ts  README.md
  scenes/   island.ts  round.ts  flow.ts  wobble.ts  breath.ts  pilot.ts  director.ts
            tilt.ts  events/*.ts  bot/*.ts  data/{days,poses,charts,trays,courses,lures}.ts
  cast/     clips.ts  rest.json  clipdata/*.json  guest.ts  plumb.ts  tare.ts  guests.ts  critters.ts
  props/ geometry/ materials/ textures/ bodies/ builds/ emitters/ looks/ cameras/ sounds/
  ui/       screens/*.ts  hud/*.ts  glyphs.ts  lines/*.ts  dev/*.ts  theme.css  about-data.ts
  audio/    sound.ts  voice.ts
  hub/      session.ts  session-client.txt  tags.html
  tools/    onefile.mjs  verify.mjs
  replays/
```

**Key components** (plain data): `flow` (mode: front, roam, event, cutscene, results; event, phase, tick; day), `wobble` (per seat), `seat` (input per seat), `island` (tilt), `round`, `pebble`, `plaque`, `ghost`, plus one per activity. Time in whole steps, randomness from named streams, loops in `w.query` order, `Math.pow` not `**`.

**The single HTML [tested: 6.7 MB, 4 s, opens from file://, client stays byte-identical].** `node x html` is engine-only, so the game carries this. The session client goes in as text, so no formatter ever touches it: the hub rejects an edited copy by SHA-256.

```js
// labs/game/tools/onefile.mjs  (add its @file comment). Usage: node labs/game/tools/onefile.mjs <output.html>
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { build } from 'vite';
const root = process.cwd();
const result = await build({
  root, configFile: false, logLevel: 'warn', base: './',
  resolve: { alias: [{ find: /^three$/, replacement: 'three/webgpu' }] },
  build: { write: false, modulePreload: false, cssCodeSplit: false, assetsInlineLimit: () => true, chunkSizeWarningLimit: Infinity,
    rollupOptions: { input: { game: join(root, 'labs/game/index.html') }, output: { inlineDynamicImports: true } } },
});
const files = {}; let html = '';
for (const item of (Array.isArray(result) ? result : [result]).flatMap((out) => out.output)) {
  const text = item.type === 'chunk' ? item.code : typeof item.source === 'string' ? item.source : new TextDecoder().decode(item.source);
  if (item.fileName.endsWith('.html')) html = text; else files[item.fileName] = text;
}
const find = (ref) => files[Object.keys(files).find((name) => ref.endsWith(name))];
const LOADED = /<script type="module" crossorigin src="([^"]+)"><\/script>|<link rel="stylesheet" crossorigin href="([^"]+)">/g;
const inlined = html.replace(LOADED, (_tag, script, style) => {
  if (style) return `<style>${find(style)}</style>`;
  const code = find(script).replaceAll('</script', '<\\/script');
  if (code.includes('<!--')) throw new Error(`${script} holds "<!--": write it apart in the source`);
  return `<script type="module">${code}</script>`;
});
const client = readFileSync('labs/game/hub/session-client.txt', 'utf8');
const tags = readFileSync('labs/game/hub/tags.html', 'utf8');
writeFileSync(resolve(process.argv[2]), inlined.replace('<meta charset="utf-8" />', () => `<meta charset="utf-8" />\n<script>\n${client}</script>\n${tags}`));
```

Use a function as `replace`'s second argument, as here: the bundle holds `$` patterns that a string replacement would corrupt. Everything is inlined, so no CDN is needed. Run from the dev folder; write the deliverable where your TASK.md says. `npm run format` will restyle `tags.html` and this script, harmlessly **[tested: the build still passes and the client stays pristine]**; Prettier leaves the `.txt` alone.

**`window.__game`**, a small read-only state handle the page publishes for tests: screen, attract, last device, glyph set, volumes, day, event, focus.

---

## 15. Engine traps (hit on this machine unless marked **[source]**)

| Trap | What happens | Do this |
|---|---|---|
| Hub's `?aihub=…` in the query | `CORE_BAD_SETTING`, engine dead, harness still passes | Strip them; assert `__engine.ready` in every frame |
| No `CHROMIUM_PATH` | `x shot` and friends crash on `/opt/pw-browsers/chromium` | Export the headless shell path (section 14) |
| A crashed `x` browser launch | The process hangs after printing the crash | Wrap browser commands in `timeout` |
| Full `chrome` binary as `CHROMIUM_PATH` | `Socket path too long`, because this run's `TMPDIR` is a long path | Use the headless shell, which works with it |
| `scripts/setup.sh` | Downloads Node and Chromium outside your folder | `npm ci` only. Node 24.22.1 here is fine |
| `node x new <kind>` reports failure in a game | `NEW_DOCS` lines about `labs/playground/…`: the engine's docs check tripping over its own guide. The entry is written and its test passes | Ignore those lines and don't touch the docs; note it in `ENGINE-FEEDBACK.md` |
| `docs/GAME-GUIDE.md` cites `labs/playground/…` | Those files are not in your workspace | Use `labs/box/`; or read the engine's GitHub repository if one is truly worth it |
| `playClip` in `setup` | `SIM_BAD_ARGUMENT` | `clips.play` at spawn, or from the first step |
| `seekClip` **[source]** | Moves only the top clip | Write `clips.state.slots[i].t` |
| No public way into the three.js scene **[source]** | A page cannot add a mesh | Everything drawn is a sim entity: terrain, level, prop, actor, crowd body, telegraph, emitter, or a component with `x`, `z`. All else is HTML |
| `modal()` true **[source]** | Intents dropped, virtual device too | Menu picks go through scene actions |
| Importing `three` or `rapier` **[source]** | Lint error | Public API only |
| `input.prompt()` **[source]** | Xbox labels for unknown pads | Own glyph table (section 4) |
| Engine touch stick **[source]** | Appears on touch screens | `touch=off` in the query |
| Bus defaults **[source]** | Music 0.5 | `audio.volume('music', 0.1)` |
| Hub client through a formatter **[source]** | Hub rejects it | Keep it as `.txt`, inject at build |
| `git` in the dev folder | It belongs to the larger repository around it | Do not `git init`, commit or restore there, despite `AGENTS.md`'s "commit as you go", unless your TASK.md asks |
| `actionMap` reserved codes **[source]** | `Escape`, `PadStart`, `PadHome`, `F5`, `F11`, `F12` cannot bind | Leave them to the system layer |
| Sim reads files **[source]** | Not allowed | Level text and data are strings or static JSON imports |
| Actor `player: true` during an activity **[source]** | Stick walks it off the mat | The pilot rule (section 14) |
| `npm run dev` | Binds port 5173 strictly, on a machine other agents share; `PORT=0` falls back to 5173 **[source]** | Prefer the built file on `file://` and `node x shot`, which picks a free port. If you must, pick a free port for `PORT` |
| A map with `lock: true` on a menu **[source]** | A click behind the menu takes the pointer | `lock: false` on front-end screens |
| Fast sway | Doing nothing beats a human thumb **[tested]** | Keep `game.wobble.noiseRate` slow; judge with the delayed-thumb bot |

---

## 16. Testing

**One command:** `node labs/game/tools/verify.mjs` prints only failures and one final count line. `--quick` stops after the Node stages. Rerun it only after changing code it covers. Prefer scripts: screenshots only for what a script cannot check. Do not use subagents or workflows to debate, review, judge or audit.

**Node stages (seconds to run):**

- `npm run check`.
- **Model:** the Wobble Model's maths; no input stays in a 0.22 ring only part of the time (about 40%), a held full stick topples, `calm` lowers sway.
- **Four players stand in for a human, since nobody here can play by hand.** All are bots writing seat input: *perfect* (no delay, gain 3); *human-like* (reads the CoB 250 ms late, gain 1.2, jitter 0.04); *sloppy* (350 ms, gain 0.8, jitter 0.06); *idle* (no input). Delay is a small history buffer in the bot's state. In rhythm and timing activities, the delay and jitter become timing error.
- **Every activity on 10 seeds:** the four players meet the targets in section 3 (perfect ≥ 750, human-like ≥ 550, sloppy ≥ 300, idle ≤ 500 and below human-like), random input never throws, idle finishes by itself, score within 0–1000, no `NaN`, and activity teardown leaves no stray bodies or entities.
- **Still Pond:** pressing a fake prompt costs Composure; a no-input run earns exactly the capped result; real breath lifts the score.
- **Step Class:** hits land in windows at each BPM; misses break the combo.
- **Morning Check:** age formula bounds; yesterday comparison.
- **The whole game:** a scripted playthrough with `game.auto`: every day, every activity, the finale's steps, ending at credits, on 3 seeds. It is the softlock finder. Keep it running in Node at step speed.
- **Reproducibility:** golden replays (one short per activity, one for a whole day) with `node x replay labs/game/replays --browser sim`; capture and restore continue exactly. Record goldens once content settles (`--update`, with a reason); while tuning, keep few.
- **Audio data:** every song and syllable renders non-silent (`node x audio`, `node x qa audio`); no audio files in the build.

**Browser stages (the built file, on `file://` where possible).** Use the workspace's `@playwright/test` with `executablePath: process.env.CHROMIUM_PATH` and flags `--no-sandbox --enable-unsafe-webgpu --enable-features=Vulkan --use-vulkan=swiftshader --use-angle=swiftshader`. Or Python Playwright, already installed. One or two browsers at once; close them. "Target closed" means memory: run fewer, don't retry blindly. Firefox and WebKit have no WebGPU here, so the game can only run in Chromium; use WebKit only to check the "no WebGPU" page.

- **Boot:** `__engine.ready`, zero errors, no WebGPU downgrade errors.
- **Controller:** replace `navigator.getGamepads` with a stub in an init script (or the engine's `createScriptedGamepad`). Menus work on D-pad and stick, Cross and Circle; glyphs are PlayStation by default; the Settings switch shows Xbox; prompts change to keys the frame a key is pressed, and to mouse on a click.
- **Keyboard and mouse:** hover moves focus, click picks; keys drive the same flows; pointer-lock lean moves the CoB.
- **10-foot:** every visible text node at 1920 × 1080 is at least 28 px; no menu over six rows.
- **Attract:** starts at 10–11 s idle on the title, shows several activities across a loop, exits on a key, a click and a pad press; the save is untouched.
- **Pause and dev:** pause menu reaches Dev Mode; a slider changes behaviour; Reset restores defaults; jumps work; not present in a session.
- **Settings:** music 0.1 on a fresh save; volumes persist across reload; Erase asks in-game.
- **Touch-only:** Playwright's iPhone and tablet profiles in Chromium: "Controller or keyboard required", a Settings button that opens by `page.touchscreen.tap`, attract runs, no touch controls in the DOM.
- **About:** every Source Information field and every feedback answer is on the screen.
- **Standalone hub checks, as the hub's own test does:** press Enter, Space, Enter, Space; the client is there and inactive; `Math.random` is untouched; the screen is drawn; no errors.
- **Hub harness:** serve the built file beside `harness.html`, `bridge.js`, `round.js` (Node `http` server or `python3 -m http.server 0 --bind 127.0.0.1`, read the port it prints, confirm the page is your game, stop only that PID: never `pkill`, `killall` or `fuser -k`). Run `harness.html?game=<file>&players=N&latency=150&jitter=50&loss=5&auto=1&play=8000` for N = 2, 3, 4, then `players=3&…&scenario=host-leave`. Pass means `window.__hubCheck.pass`, with `body[data-complete="true"]` at the end. **Also assert in each frame** `__engine.ready === true`, zero engine errors, a `ghost` entity at 2 players; no console line starting `[AIHub]`; and that the pasted client's SHA-256 from banner to last line matches `529eac78c54cfff0e60d375a9c63f66d1a594327ddcc262a2bdf9b1f2fb6582a` (client 1.4.0; compare what you fetched first, the hub may have moved on).
- **By hand in the harness:** run it once without `auto` at 2 players: its frames are your players on this computer, and clicking a frame gives it the keyboard. New round, Time up, Remove player. Drive it by script and read the state to see the card, ghosts and results; one screenshot.

**Screenshots, at the end, by eye, 1920 × 1080:** title, island, Pose Class HUD, Still Pond with a lure, The Line, Great Tilt wide shot, results, pause, Dev Mode, About. `node x shot labs/game --png` or a Playwright screenshot: both worked here.

---

## 17. Build order

Do the risky integration first. The game should be shippable, in a smaller form, at every milestone.

1. **Skeleton (first hour's job).** Workspace, one-file build, hub client and tags, `game:round` with one mat, harness passing with the engine truly running, `verify.mjs` skeleton.
2. **The verb.** Wobble Model, action maps, mouse lean, Balance Disc, glyphs, one activity (Still Ring), its bot, tests, dev sliders. Tune until holding still is fun by itself. The bot tells you it is winnable; numbers tell you it isn't trivial.
3. **The body.** Clip set, scrubbing, Guest and Plumb, Pose Class. Voice system early: it carries the tone.
4. **The island.** Terrain, sea, look, stations, roam, flow, Programme, Noticeboard, saves, Morning Check, results, Tare.
5. **The joke.** Still Pond. Then Cairn, plaques, day cycle.
6. **Water and sand.** The Line, Paddle Glide, Sand Garden.
7. **The rest.** Step Class, Reps Hall, Hoop Patrol, Cliff Plunge, Island Jog.
8. **The finale.** Great Tilt, ending, credits.
9. **Together.** Group Class; hub ghosts, own card, full round.
10. **The shell.** Attract, full Dev Mode, Settings, Controls, About, touch-only, no-WebGPU page.
11. **Polish.** All 200+ lines, songs, ambience, effects, camera moves, rumble, Expert variants, outfits.
12. **Finish.** Section 18 and 19.

**Cut line, if and only if you run out of budget.** Cut whole things and re-flow `days.ts`, leaving no trace (no greyed-out rows, no mentions), in this order: Great Tilt step 3 → Expert variants and outfits → Hoop Patrol → Reps Hall → Island Jog's race (keep the walk) → Cliff Plunge → Step Class. Never cut: Morning Check, Pose Class, Still Pond, The Line, Sand Garden, Paddle Glide, Great Tilt steps 1, 2, 4 and 5, Group Class, hub ghost round, attract, Dev Mode, About.

---

## 18. Done

- Every feature in this plan is real: no TODOs, placeholders or stubs. `grep -rEi "todo|fixme|placeholder|stub" labs/game` is clean (except test words).
- A new player can reach the credits from the title with a pad alone, and again with keyboard and mouse alone.
- `node labs/game/tools/verify.mjs` reports zero failures; `npm run check` and `npm test` pass; the engine is unchanged or its patch is declared.
- The single HTML is in the place your TASK.md names, opens from `file://`, and fetches nothing.
- `labs/game/README.md` says what the game is and the calls you made. `ENGINE-FEEDBACK.md` is honest and specific.

---

## 19. Reports

Your TASK.md defines the chat reply, the About / Credits content and the exit interview, in its exact shape. Keep all the answers in one data file (`labs/game/ui/about-data.ts`), so the screen, the reply and the interview agree. They go in the bundle, so write them before the final build, then rerun `verify`.

**Keep a running tally as you go** of the issues testing catches, and which were critical: you will be asked for both, and for your most and least helpful test. Note engine surprises in `ENGINE-FEEDBACK.md` when they happen.

Answers already decided: Plan: the name this file has in your folder. Genre and Perspective as in section 1. Tech: my-3dge at its pinned commit, three.js r182 on WebGPU, Rapier 0.21, Vite, TypeScript. Art: the engine's native toon puppets and generators with new retreat assets. Animation: the engine's clip layer and humanoid with a new readable clip set scrubbed from the sim. Audio: tracker songs, `defineSfx` effects, gibberish syllable voices, all code, music at 10%. Online: AI Hub Session Protocol v1, ghost; same-screen Group Class on its own. Environment and Model as your TASK.md gives them. Usage: "added on import".

Hub catalogue suggestions: type `Game`; genre `Sports`; source `Wii Fit`; series empty (the source is its own franchise); players `1–4`; controls "Lean: left stick, WASD or mouse · Feet: L2 R2, Q E or mouse buttons · Breathe: both"; tags from `3d`, `third-person`, `comedy`, `arcade`, `sports`, `story`. Tagline idea: "Stand still. It is harder than it looks."

**Credits must include:** my-3dge (MIT), three.js (MIT), Rapier (Apache-2.0), @stdlib (Apache-2.0); the AI Hub session client. Animation clips by what you actually copied: Mesh2Motion and Quaternius Universal Animation Library (CC0; credit anyway); **100STYLE dataset, Mason, Starke and Komura, 2022, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/), converted to key poses: required credit with a link and a note of changes** if you use any `STYLE100*` clip; CMU Graphics Lab Motion Capture Database if you use any `CMU` clip (terms in `data/anim/LICENSES/CMU.txt`).

---

## 20. Brief-to-plan map

Check this before you call it done.

| The brief asks for | Where |
|---|---|
| Genre and perspective chosen to fit | 1, 6 |
| Title: playful riff, picked by a real RNG from 50 | Yours, per TASK.md. This plan just says "the game's title": on the title screen, hub card, attract banner, About |
| Research: your choice | Not needed beyond this plan; report what you did |
| Single HTML; downloads optional | 14 (everything inlined) |
| Engine's full workspace, engine read-only, own systems on top | 14, 15 |
| Art: engine's native style base; new assets for the source's feel | 10 |
| Animation: engine's system base; new animations | 11 |
| Audio: all code, no files; gibberish voices; music 10% default | 12 |
| Online and multiplayer: hub integration and on its own | 9 |
| Dev folder, separate modules, bundle; shared machine rules | 14, 16 |
| Performance out of scope | 9 (one protocol deadline only) |
| Testing: headless scripts, full playthrough, one command, failures only, sparing screenshots, no review subagents | 16 |
| Original game; distinctive world, characters, themes, tone in mechanics, pacing, UX | 1, 2, 3, 13 |
| Feature-complete demo showing all mechanics; vertical slice; infrastructure to grow | 5, 6, 7, data tables in 5 and 14 |
| Dev mode from pause; standard tools; live sliders with reset | 8 |
| Attract: 10 s idle, looping, AI may cheat, any input exits | 8 |
| Narrative tone like the source | 13 |
| 10-foot, controller-first; native keyboard and mouse; hover focus; prompts by last input; PlayStation glyphs with an Xbox option; no dense screens | 4, 8 |
| Touch-only: no touch controls, the message, Settings, attract runs | 8 |
| Done: no TODOs or stubs | 18 |
| Source Information, feedback, About screen, chat reply, exit interview | 8, 19 |
