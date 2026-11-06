# Build plan: a wellness-retreat balance game inspired by Wii Fit

You are building this game alone, from this plan and your brief. Nobody can answer questions, so decide and move on.

- **Your brief wins** on anything it states: deliverable names, the title rule, what the About screen lists, the exit interview. Where it leaves a choice, this plan has made it.
- **The title is yours.** Pick it the way your brief says. This plan says "the title" wherever it appears.
- **Paths here are relative to your dev folder.** The final file's name and place are in your brief.
- **✔ means tested.** It was run on this computer against engine v0.88.0 and hub client 1.4.0 while this plan was written. Trust those recipes. Numbers marked "start" are tuning defaults: change them with the dev sliders.
- Read sections 1 to 4 and 15 to 17 first. Use the rest as reference while you build each part.

---

## 1. The game

**In one line:** a gentle, deadpan comedy about a five-day stay at a wellness retreat, where one analog skill, your balance, drives twelve short sports and exercise activities, coached by a needy talking scale and two serene wooden instructors.

- **Genre:** sports and fitness minigame collection inside a light life-sim routine. Catalogue genre: Sports.
- **Perspective:** chosen per activity, always the clearest view of the body:

| Where | View | Why |
|---|---|---|
| Studio activities | `brawler` (2.5D, fixed camera) | The whole body reads at 10 feet |
| The island | `threequarter`, follow camera | A small walkable place |
| Slalom | Mode 7, behind the skier | Speed |
| Jog | Pseudo-3D road, behind the runner | The coast rolling by |
| Tray | Custom steep view of the tray | You look down at what you tilt |
| Laundry Line | `side` | A rope is a line |

**What to take from the source, in spirit:** a talking scale that judges you very politely; the morning weigh-in ritual and a number that matters too much; a clean, bright, faintly unsettling studio; calm instructors who never stop being pleasant; stillness treated as a sport; minutes banked and activities unlocked; little people jogging around an island.

**What must stay original (this is a new game, not a recreation):** no Wii, Mii or Balance Board names, no copied characters, music, menus, minigame presentations or look. Say "Wii Fit" only in the Source Information your brief requires, and let the title riff on it as the brief says. Our cast, island, activities and jokes are below.

**Never make fun of bodies.** There is no real weight, no BMI and no body-size talk. Tare weighs you in ducks. Jokes land on posture, wobbling, the player's excuses, and Tare's own loneliness.

**Pillars. Cut anything that serves none of them.**
1. **One skill, many bodies.** Everything is the Lean (section 3). Learn it once, feel it everywhere.
2. **Your thumb is the body.** Squat depth *is* the stick. No canned animation that ignores your input.
3. **Polite, sincere, slightly hurt.** The game never winks and never sneers.
4. **The daily ritual.** Weigh-in, sessions, recap, bed. Tiny numbers feel huge.
5. **Ten-foot calm.** Bright, huge, one idea per screen.

---

## 2. What the player does

```
Title ──(10 s idle)──> Attract Mode loop ──(any input)──> Title
  ├ Continue / New Member ──> Member Card ──> Arrival (first time) ──> pick instructor
  │     Day loop: Bungalow ─> Body Check ─> Island ─> 3 Sessions ─> Evening recap ─> bed
  │     Day 5: The Gentle Games ─> Grand Stillness duel ─> Ending ─> Credits ─> Free Play
  ├ Class (2 to 4 players on one screen)
  ├ Free Play (after the ending, or from Dev Mode)
  ├ Settings   └ About / Credits
In an AI Hub session: straight to the round, no title or menus (section 14).
```

**A session (every activity, every time):** Card (one sentence on what you can and can't do here, device-correct controls, star targets, your best) → instructor demonstrates for 3 s with one line → "Breathe in" 3-2-1 → play for 45 to 90 s → stars stamp down, minutes drop into Gerald, Tare comments → Again / Done. Again is free: a session ends only on Done, your best run counts, and every run pays minutes. Target: 2 to 3 minutes door to door. A story run takes 40 to 50 minutes and shows everything.

---

## 3. The core mechanic: the Lean

Every player has a **centre of balance** `p` (x right, y forward, both -1..1) with velocity `v`. Input sets a lean target `u`. The body chases it like a heavy person on an unstable board:

```js
// one fixed step (dt = 1/120). nx, ny: smooth noise. fx, fy: scripted pushes (a gull, a gust, a thought)
ax = k * (ux - px) - c * vx + s * px + A * nx(t) + fx;
ay = k * (uy - py) - c * vy + s * py + A * ny(t) + fy;
vx += ax * dt; vy += ay * dt; px += vx * dt; py += vy * dt;
if (Math.hypot(px, py) >= 1) stumble();   // 1 s: input ignored, p eases home, stumble animation, score penalty
// noise: three sines with seeded phases
const noise = (rng, f) => { const ph = [rng()*6.28, rng()*6.28, rng()*6.28];
  return t => (Math.sin(t*f+ph[0]) + .6*Math.sin(t*f*1.73+ph[1]) + .35*Math.sin(t*f*2.61+ph[2])) / 1.3; };
```

`k` is responsiveness, `c` damping, `s` instability (the further you lean, the further you fall), `A` tremble, `nf` tremble speed, `R` the target ring's radius. **Steadiness** is the share of time inside the ring.

**Tested defaults (✔ simulated over 45 s runs with modelled players):**

| Set | k | c | s | A | nf | R | Push (speed, every s) | Passive | Poor | Average | Good |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Body Check | 14 | 7 | 4 | 3 | 1.1 | .20 | none | 50% | 76% | 99% | 100% |
| Sun Flow | 12 | 6 | 6 | 3.2 | 1.3 | .28 | .5, 9 | 53% | 78% | 99% | 100% |
| Stork Stand 1 | 12 | 5 | 13 | 3 | 1.5 | .24 | .6, 7 | 20% (5 falls) | 30% | 68% | 95% |
| Stork Stand 2 | 11 | 4.5 | 15 | 3.6 | 1.7 | .22 | .7, 6 | 22% (15 falls) | 15% | 29% | 54% |
| Quiet Candle | 10 | 5 | 11 | 1.4 | .8 | .20 | .55, 5 | 14% (4 falls) | 59% | 95% | 100% |
| Laundry Line | 10 | 3.5 | 16 | 3.5 | 1.2 | .40 | .9, 5 | 35% (19 falls) | 31% | 39% | 79% |

**Bots use this model** (tests, attract, Class fill-ins). It reacts to where `p` was `tau` seconds ago:
`target = -gain * pSeen - damp * vSeen + noise * smoothNoise(t)`; `u += (target - u) * min(1, dt * 16)`; clamp length to 1.

| Bot | tau | gain | damp | noise |
|---|---|---|---|---|
| poor | .34 | 1.1 | .22 | .16 |
| average | .25 | 1.4 | .30 | .08 |
| good | .18 | 1.8 | .36 | .04 |
| expert | .14 | 2.2 | .42 | .02 |

**Input (the same game on three devices, each native).** All of it fills one `intent` object, and activities read only `intent`, never a device. Bots and attract fill the same object.

| | Controller | Keyboard | Mouse |
|---|---|---|---|
| Lean | Left stick: `u` = stick position | WASD or arrows: **nudge**. While held, `u` moves toward the direction at 2.2/s; released, it drifts home at .5/s. Tapping makes fine corrections (✔ simulated: at 2.2/s keys score the same as a stick; at 1.6/s the rope is unplayable) | Pointer: `u` = pointer offset from screen centre / (`r.H` × .33). It stays where you leave it |
| Breath / Effort | L2 or R2, analog (`input.value`) | Space (level ramps over 4 s) | Left button (same ramp) |
| Left/right catch | L1 / R1 | Q / E | Left / right button |
| Confirm, Back, Pause | ✕, ○, Options | Enter or Space, Esc, Esc or P | Click, right click, the corner button |

✔ Tell which device is leaning like this: `input.lastDevice` becomes `'gamepad'` for a pad, but **moving the mouse does not change it away from `'keyboard'`**, so compare `input.mouse.t` (when the mouse last moved) with the time of your last key press. Use `input.pointer()` for the position. With a mouse, also hide the OS cursor over the canvas during activities and draw a small soft hand instead.

✔ The input map must keep the engine's menu actions. **A custom map replaces the whole preset**: without `confirm` and `start`, menus and the hub card's Enter silently stop working.

```js
const D = E.Input.DEFAULT, INPUT = { up: D.up, down: D.down, left: D.left, right: D.right, start: D.start, pause: D.pause,
  confirm: D.confirm, cancel: D.cancel,
  breath: ['Space', 'Mouse0', 'Pad6', 'Pad7'], catchL: ['KeyQ', 'Mouse0', 'Pad4'], catchR: ['KeyE', 'Mouse2', 'Pad5'],
  jump: ['Space', 'Pad0'], interact: ['KeyE', 'Enter', 'Pad0'], more: ['Tab', 'KeyM', 'Pad3'], retry: ['KeyR', 'Pad2'],
  paceL: ['KeyJ', 'Mouse0', 'Pad6'], paceR: ['KeyK', 'Mouse2', 'Pad7'],
  stepL: ['KeyA', 'ArrowLeft', 'Mouse0', 'Pad14', 'PadAxisLeft'], stepR: ['KeyD', 'ArrowRight', 'Mouse2', 'Pad15', 'PadAxisRight'],
  stepU: ['KeyW', 'ArrowUp', 'WheelUp', 'Pad12', 'PadAxisUp'], stepD: ['KeyS', 'ArrowDown', 'WheelDown', 'Pad13', 'PadAxisDown'] };
```

**The Plate** is the game's signature HUD: a large white disc at bottom centre (✔ radius 26 at `r.H - 34` reads well) with the ring, the dot, and a fading trail of the last second. In-ring: the ring glows mint, a soft chime rises with the streak, small glints appear. Near the edge: the rig flails, a creak plays, the controller rumbles harder (`input.rumble`). **Gentle Mode** (a setting): ring ×1.25, `s` and `A` ×.7. Tare says: "Gentle Mode is on. I won't tell anyone. I don't know anyone."

---

## 4. The activities

**Stars from `pct` (0..1):** 1★ .35, 2★ .65, 3★ .90 unless stated. Every activity must satisfy, on tier 1: passive input earns under 1★, the average bot at least 1★, the good bot at least 2★. On tier 2: passive under 1★, the good bot at least 1★, the expert bot at least 2★. **Each activity is one registry entry** (section 15) with its numbers in `game/data/`. Tier 2 opens after 2★ on tier 1 and from Day 4.

### Stillness

**Stork Stand** (`hold`). Stand on one leg on the deck. Hold the dot in the ring, which moves to a new spot every 12 s. A gull lands on your outstretched arm: a constant push to that side (`fx` = ±2.5) until it leaves with a little kick. 45 s. `pct` = steadiness - .05 × falls. The rig tilts with `p` (section 9). Tier 2, **Eyes Closed**: the Plate disappears and the screen dims. You balance by the rig's tilt, a stereo tone (pan = x, pitch = y) and rumble. This is the tutorial, guided on Day 1: "Lean" (move into the ring), "Hold", "Recover" (gull).

**Sun Flow** (`hold` + breath). Five poses, two breaths each: Low Lunge → Down Dog → Triangle → Warrior → Stork. A guide ring swells for 4 s (breathe in: hold L2/R2, Space or left button) and shrinks for 4 s (let go). Analog players match the level; on digital the level ramps ±1 over 4 s. Crossfade poses with `lib.blend` over .6 s. 80 s. `pct` = .6 steadiness + .4 breath match (level within .25 of the guide), stars at .5, .75, .92 (doing nothing scores about .4 here). The instructor mirrors you on the next mat. Setting: Breath Hold or Toggle.

**Quiet Candle** (`candle`). Sit cross-legged (`Meditate`). A candle burns in front of you. Its flame reacts to the **speed** of the dot: `|v|` over .55 drains flame .4/s, in-ring refills .12/s. Thought bubbles drift in with captions and push you slowly their way (`f` 3 to 5 for 2.5 s), so you must correct gently; any jerk hurts the flame. One relight (-15%), then it ends. 60 s. `pct` = .6 steadiness + .4 mean flame. If the input is perfectly untouched for the first 20 s, the thoughts drift you out and Tare says: "Did you put the controller down? I can tell. This is not that kind of stillness." Tier 2 adds Dennis's blender and a goose.

### Strength (all three are `rep`: one code path, three data rows)

**The Rail.** A vertical rail beside the rig; a bead rides it at the instructor's tempo. Your lean **is** the body: `depth = clamp(-py, 0, 1)` scrubs the exercise as you move, so holding the stick halfway holds you halfway. `k` 16, `c` 8, `s` 0 on the main axis; the other axis has `s` 8 and is **form**: drift there and the rig visibly twists. Each rep scores 1.0 if mean `|depth - bead|` ≤ .08, 0 at ≥ .35, and shows Perfect/Good/Late. Tempo: 2 s down, 2 s up (tier 2: 3 s down, a hold, 1 s up). **Fatigue:** after 60% of the reps, `A` rises, `k` falls and the rig shakes. **"Two more":** if you are scoring above .8, the instructor adds two bonus reps. ("You're doing so well, so I've added some.") `pct` = mean rep × (1 - form penalty, up to .3).

| Activity | Reps | Drive | Rig | Facing `tgt` |
|---|---|---|---|---|
| **Squat Rail** | 8 / 12 | down = deep | ✔ clip `22_14`: t = 1.1 (top) to 1.72 (bottom) | 1.2 |
| **Push-Up** | 6 / 10 | down = low | ✔ clip `Pushup`: t = 0 (top) to dur × .5 (bottom) | .1 |
| **Side Lunge** | 8 / 12 (horizontal rail; bead swings left and right) | `u = px` | ✔ `body` override `sideLunge(u)` (section 9) | π/2 |

### Cardio

**Step Class** (`step`, `E.Rhythm`). A bench, an instructor, three Regulars behind you all stepping on the beat. Always four lanes in the order `arrows: true` draws: `lanes: ['stepL', 'stepD', 'stepU', 'stepR']`. Tier 1's charts use only left and right at 100 bpm; tier 2 uses all four at 120 bpm. 60 s, windows 45/90/135 ms, a song with `loop: false` and a `len`. Input: d-pad or stick flicks, arrows or WASD, mouse buttons and wheel (see `INPUT`). The rig steps with `stepUp(k)`, triggered by your press, not by the chart. `pct` = `rh.accuracy`; stars at .5, .75, .92. Draw `rh.draw` with `arrows: true`, large, above the Plate's place. **Trap: music is 10% by default, so the beat must not depend on it.** Play a soft click on the sfx bus with `audio.onBeat`, and the instructor counts in gibberish on the beat. Charts are data ✔: `{ parts: { A: ['x.......x.......', '.', '.', '....x.......x...'], B: ['x...x...x.......', '.', '.', '..x...x.....x...'] }, order: 'A A B A' }`.

**Hoop Hips** (`hoop`). Circle the lean to spin a hoop. Only movement with `|u|` > .55 counts; angular speed fills a big dial: "Too slow / Just right / Too eager". The good band is 7 to 11 rad/s (keyboard, by quadrant steps W→D→S→A: ×.6; mouse: circles round the screen centre, same as the stick). Regulars toss hoops from the sides: press catch left/right (L1/R1, Q/E, buttons) inside ±.25 s of arrival to stack it, up to 6. More hoops score faster and need a little more speed. 1.5 s out of band drops the top hoop. Halfway: "Other way!" 60 s. Mr. Okafor cheers. `pct` = score / best possible. ✔ Rig: `hula(phase)`. ✔ Hoops: back half queued with `bias: -6`, front half `bias: 6`.

**Coastal Jog** (`jog`, `E.Road`; copy `engine/kits/road.js`). Alternate L2/R2 (J/K; left/right buttons) to set a cadence; lean steers. Stay in Marisol's pacing zone (cadence band 2.6 to 3.4 steps/s, shown as a calm gauge). Sprint over 4.2 for 2 s and you get a Stitch (3 s hobble). Weave round pigeons and other joggers, grab water cups. About 70 s for a lap. `pct` = .7 time in zone + .3 cups. Rig: `Run_Loop` scaled by cadence, drawn on the overlay from behind. Lou on his bench, the pier and bungalows go by as scenery.

### Balance games

**Mount Posture Slalom** (`slalom`, `E.Mode7`; copy `engine/kits/kart.js`). Lean left/right steers, forward tucks (speed ×1.35), back brakes (×.6). 18 gates (data: x offsets), base speed 220 units/s (start), about 60 s. A missed gate is +3 s; a snowman or pine is a 1.2 s tumble. `pct` from time between `par` and `worst`. Weather `snow`. Billboards: rig in `pose: 'crouch'`, skis, gates, snowmen. Show Regulars' times at the finish ("Gertrude 0:58. She walked."). Tier 2: narrower gates and fog.

**Tray Service** (`tray`, `E.Physics`, `sleep: false`). Dennis needs olives in cocktail glasses. He cannot say why. Lean tilts a tea tray: `world.gravity = [px * G, -py * G]` with G 420 (start), then `world.wake()`. Olives are circles; glasses are sensors (`on.enter` → plop, remove). Three trays in one run: 3 olives, then 5 with bumpers and a gap, then 7 with a slowly walking gecko. Layouts are ASCII in `game/data/trays.js`. 60 s total. `pct` = olives in / total × (.8 + .2 × time left share). Draw the tray with `new E.View('tray', 'Tray', 0, 55, 1, 1)` and tilt corners by `p` so the tilt is visible. Excellent with a mouse.

**Laundry Line** (`laundry`, `side` view). Walk a clothesline between bungalows, x axis only, with the Laundry Line set. Walk speed is the Effort trigger (R2 analog; Space or left button .6); going faster adds up to +4 to `s`. Jump (✕, Space) over clothespins; in the air `p` freezes. Gusts (`fx` ±9 for .6 s) are telegraphed .8 s early by wind lines and a flying sock. Fall: you dangle, drop into a hamper, restart from the last post, -3 s. Three spans, about 70 s. `pct` from time, -.06 per fall. Sign: "Please do not walk on the laundry line. Walking on the laundry line: 10:30 daily."

### The Gentle Games (Day 5)
Short versions in order, one continuous festival with bunting, music and crowd: Stork Stand, Step Class, Slalom, then **the Grand Stillness**, a Quiet Candle duel with Gertrude on a raft at dusk (90 s). Two flames, hers and yours. Distractions escalate: gull, blender, conga line, fireworks (`game.flash` soft, respect Comfort), Tare singing, a goose. Her flame only weakens after 75 s, and only if yours is above half. Win or lose, the story continues; winning gives -1 Spine Age and her line: "Well done, dear. I've been waiting since Thursday."

---

## 5. Progress

**Spine Age** is the number that matters. Each discipline's score D (0..100) = mean over its activities of best stars × 33.3 (unplayed 0). O = mean of the four D. `SpineAge = min(71, round(78 - .58 × O))`, minus 1 for a Grand Stillness win. Start: 71 (3★ everywhere gives 20, and the duel makes it 19, level with Gertrude). If it hasn't moved, Tare has a line for that too. ("Let's call it 71. It doesn't go higher. It's not allowed.") Gertrude's is 19, Tare mentions it often. Show it as a big number, a one-line graph (one dot per day, never more than 8 dots) and a four-petal flower for the disciplines. Nothing denser.

**Minutes and Gerald.** Gerald is a ceramic hippo with a coin slot who swallows your minutes. Earned: session minutes × (1 + .25 × stars), × 1.5 on Tare's Suggestion for the day. Coins fly up and clink in. Cumulative, never spent.

| Minutes | Unlock (shows on the Bungalow rail and on your rig) |
|---|---|
| 5 | Towel |
| 10 | Headband |
| 15 | Sunhat |
| 20 | Tare wears a tiny bow tie |
| 25 | Gertrude's Spare Hat |
| 30 | Gerald gets a friend (a smaller hippo; no explanation) |

**The five days:**

| Day | Morning | Unlocks | Beats |
|---|---|---|---|
| 1 Orientation | Arrival card, pick instructor, first Body Check | Stork, Squat, Step, Tray | Forced guided Stork Stand counts as session 1 |
| 2 Improvement | Body Check | Sun Flow, Push-Up, Hoop, Laundry | Get 2★ today and Gertrude nods at you. That is the reward |
| 3 The Plateau | Body Check; Spine Age **held** at yesterday's | Candle, Lunge, Jog, Slalom | "We call this the plateau. It is on the map. You cannot go around it." |
| 4 Tare's Day | Spine Age catches up in one satisfying drop | Tier 2s | Tare's recalibration: a 30 s scene at Reception, Tare on a huge old scale, you press ✕ to read it. "Three grams. It's the feelings. They're dense." |
| 5 The Gentle Games | Short Body Check | Everything | Games, duel, ending |
| After | Normal days, all open | | New daily Suggestion and Tips, forever |

3 sessions a day. You may go to bed early (Tare says something). Tare's Suggestion marks one mat with a floating star.

**Arrival:** "You have been gifted a five-day stay at the Institute for Gentle Improvement. The card isn't signed. It only says: 'You know why.'"

**Ending reveal:** "I should tell you something. The card. The one that wasn't signed. That was me. I don't have hands. It took three years. I sent one to everybody. You're the one who came." ... "Now step off. Go on. I'll be here. I'm a scale. That's the whole job." One extra line by final age: ≤24 Gertrude gives you the hat; 25 to 45 "Your spine has stopped asking questions."; 46+ "Come back. Please. I mean that in a wellness way."

**Body Check** (about 50 s): step onto Tare (hop, boop) → Stillness Test, 5 s, small ring → Lean Test, four directions, hold each 1 s → one Silly Question → Reading ("Today you weigh 11.4 ducks. That is a normal number of ducks.") → Spine Age, graph, remark, today's Suggestion. Questions (two pills, no effect beyond the remark): "Have you recently sat?" [Yes / Define recently]; "Do stairs ever surprise you?" [Often / Only the last one]; "Do you make a small noise when you stand up?" [Yes / No (this is a lie)]; "On a scale of one to me, how do you feel?" [One / Me]; "When did you last look at your feet?" [Just now / I'd rather not].

**Members.** Three save slots shown as big Member Cards (rig portrait, nickname, Spine Age, Day). No text entry: avatar by pills (hair `short spiky long ponytail bald`, 6 skins, 8 tops, 4 bottoms) and a nickname from a list with Reroll ("Gentle Doug", "Sir Slouch", "Ms. Almost", "The Other Pat", ...). Use `game.saves` (`write`, `read`, `save(slot)`, `list()`, `latest()`). Autosave at dawn and after each session. Saves go through `saves.write`, so a test can reload them.

---

## 6. The island (hub)

The Institute for Gentle Improvement, on Lumbar Island. Motto on every sign: *Gently, Or Not At All.* A small `TileMap` in `threequarter`, about 44 × 26 cells. Crossing it takes 5 s. No enemies, no timer. Time passes only by doing sessions: morning light, noon, then dusk.

```
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
~~^^^^^^~~~~~,,,,,,,,,,,,,,,,,,,,,,,~~~~~~~~
~^^MT^^^^,,,,,,,,,,,,[STILLNESS DECK]=~~~~~~   ^ Mount Posture (snow; trailhead MT)
~~^^^^^,,,,,,,[RECEPTION],,,,,,,,,,,,,,~~~~~   , grass   . sand   = boardwalk   ~ sea
~~~,,,,,,,,,,,,,(Tare),,,,,,,,,,,[IRON ROOM]~
~~[BUNGALOW],,,,,,,,,,,,,,,,,,,,,,,,,,,,,~~~~
~~,,(bed)(rail),,,[JUICE BAR],,,,,,,,,,,,,~~~
~~,,,,,,,,,,,,,,,,(Dennis),,,,,[LAUNDRY POSTS]~
~~~,,,,,[BALANCE PARK],,,,,,,,,,,,,,,,,,,~~~~
~~~~....(Tray)(Slalom sign).........=====~~~~   the pier: AEROBICS PIER
~~~~~~......................(Step)(Hoop)=~~~~
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~(Jog start)~~~~~
```

- **Mats** are glowing rugs: stand on one or click it to open the Card. Stillness Deck: Stork, Flow, Candle. Iron Room: Squat, Push-Up, Lunge. Pier: Step, Hoop, Jog. Park: Tray, Laundry posts, Slalom sign.
- **People:** the Regulars stand at set spots with a daily line and walk small loops. Tare hops behind you at a polite distance.
- **Bed** ends the day. **The rail** in the Bungalow is the wardrobe.
- **Controls:** stick or WASD walks; ✕ / E / Enter interacts; the mouse hovers (the person or mat highlights, a prompt shows) and clicks (walk there by `E.FlowField`, then interact). Clicking ground walks. Use `{ pick: thing }` on `r.actor`/`r.shape` and `r.pick(sx, sy)` for hover.
- **HUD:** top left Day and 3 session pips; top right Spine Age and Gerald's count, clear of `game.cornerArea()`. Nothing else.

---

## 7. Cast and voice

**Tone rules.** Short sentences. Sincere, polite, a little too personal. Translated-instruction-manual cadence. No sarcasm, no meanness, no profanity, no pop-culture jokes, no references to being a game. Praise that wobbles. Facts nobody asked for. Tare is needy but never says so outright. Every text box: at most 2 lines of about 60 characters; a line is one thought. Use these lines verbatim and write as many more in the same voice as the game needs (aim for 150+ total, so a second playthrough still surprises). All text lives in `game/data/lines.js`.

**Tare** (talking scale; "tare" is the button that zeroes one). A white slab with two soft footprints on top, a small dial, short legs, cyan LED eyes on the front edge and 8 faces (neutral, happy, worried, smug, shocked, sad, asleep, judging). Hops with squash and stretch. High, quick gibberish.

- "Oh! Feet. Good morning, feet."
- "You came back. I wasn't worried. I was just standing here, on the floor, where I live."
- "It has been one day since you last stepped on me. I counted it twice to be sure."
- "Please stand still. Stiller. That was the wrong way."
- "You lean beautifully. Like a tower people visit."
- "You put more weight on your left foot. Your right foot has noticed."
- "Your Spine Age is 58. That's younger than yesterday! Your spine has been through a lot."
- "I am not allowed to say whether this is good. It is a number."
- "You are my favorite. You are also my only."
- Long absence (real clock): "It has been 9 days. I kept your spot warm. I am not able to generate heat."
- Paused 3 times: "You paused. That's 3 times today. I'm not counting. Three."
- Idle on the island: "Are you still there? I can feel you not standing on me."
- 0★: "You finished. Some people don't. Those people are probably at lunch."
- 0★: "That was not your best. I'm saying that with love, and also as data."
- 1★: "Good effort! I could tell it was effort."
- 2★: "Well done. I felt that. In a good way. Mostly."
- 3★: "You barely moved. For a moment I thought you had left me. Please don't do that."
- Fall: "You fell. That's okay. The floor was expecting you."
- Quit early: "Leaving early? That's fine. I will just file this under 'Thursday.'"
- Night: "Sleep well. I'll be out here. In the dark. Being accurate."
- Gerald: "Gerald has swallowed your minutes. He looks pleased. He always looks like that. He's ceramic."
- Tips: "Tip: Drink water. Your body is mostly water. The rest is opinions." / "Tip: If you can't touch your toes, bring your toes closer." / "Tip: Stretch before bed. Or after bed. Or in bed. I am not in your bed." / "Tip: Sitting is just standing with fewer steps."

**The instructors** are wooden artists' mannequins: smooth egg heads, ball joints, no blinking, infinite patience. The player picks one on Day 1; they differ in voice, palette and lines.

- **Birch** (oak tones, tall, deep slow voice): "Welcome. I am Birch. I'm made of wood, so I will be very patient and slightly warped." / "Breathe in. ...I don't breathe. But I've read about it, and it sounds very good." / "Keep your back straight. Mine was sanded." / "Nice. Now hold that until it stops being nice." / "You're shaking. This means it's working. Or you're cold." / "Two more. I said that two reps ago. It is still true."
- **Alder** (pale maple, carved ponytail, warm bright voice): "Hello! I'm Alder. I was a tree, and then I was a lot of very small decisions." / "Wonderful! You're doing so well. Please stop shaking." / "Everybody's body is different. Yours is the one wobbling." / "Let's hold this for a moment. A moment is eleven seconds." / "Smile. It relaxes the jaw. ...Not like that." / "This next pose is the Stork. I knew a stork. We didn't speak."

**The Regulars** (chibi rigs, each with their own palette and voice pitch; they fill backgrounds, toss hoops, set times):
- **Gertrude**, 87, Spine Age 19, lilac tracksuit, sunhat, quavery: "You're doing fine, dear. I've been standing here since Thursday." / "I'm eighty-seven. My spine is nineteen. We don't really talk."
- **Dennis**, runs the Juice Bar, never exercises, holds a blender: "I'm only here for the blender. Don't tell the scale." / "Olive?"
- **Marisol**, headband, always moving: "Morning! I've already done today. I'm on to tomorrow."
- **Young Kevin**, 52: "Everybody calls me Young Kevin. There was an older Kevin. We don't talk about how he got so flexible."
- **Mr. Okafor**, loud shirts: "A hoop is just a circle that believes in you."
- **Lou**, on a bench (`Sleeping`): "I'm on a five-minute break. It's been a good one. Three years in March."
- **The Twins**: "We're not related." "We've checked."

**Candle thoughts:** "Did you lock the door?" / "What is a lumbar?" / "Is that my knee?" / "Dennis." / "You left the stove on in 2014." / "Who sent that card?" / "Am I breathing right now?" / "Now I'm breathing on purpose." / "Olive?"

**Boot messages:** Zeroing the scale / Sanding the instructors / Counting the ducks / Telling the hippo.

---

## 8. Art direction

The engine's native look (3D skeleton puppets drawn as crisp pixel art at `res: 'ps1', expand: true`, about 427 × 240 on 16:9) moved into bright daylight. ✔ It looks right: a white room, sea through a big window, pale wood floor, coral player, cyan accents.

**Palette:** white `#f6fafa`, wall shade `#dfe9ea`, sky `#8fd3f4` → `#d8f3fb`, sea `#49b6c9` → `#2f97ad`, floor `#ecd9bd` → `#d9bd96`, UI accent `#2cc6e6`, ink `#20404c`, player coral `#ff7a59`, mint `#bfeee0`, oak `#d9b68a`, maple `#ecd3ac`. Colour never carries meaning alone (ring state also has shape and sound).

**Scene recipe ✔:** paint directly on `r.ctx` first in `draw`, then queue actors. **In `brawler`, +y comes toward the camera** (lower on screen), despite what the card's table suggests: the back wall's base is `r.w(0, -44, 0)[1]`, mats sit near y = 0, floor boards run from y = -44 to y = 90. Shade with `E.mix` bands, keep the window as big as the wall. Character size: 2.1 for one rig, 1.9 for two, 1.5 for four. Scenes: `camera: { zoom: false }` on every fixed camera (the wheel belongs to Step Class).

**Rooms (each needs 3 to 8 props and its own light):** Stillness Deck (open air, sea, wind chimes, ferns), Iron Room (white, mirror, comically small dumbbells, a water cooler, motivational signs: "You Have Been Doing That Wrong"), Pier (bunting, benches, gulls), Reception (Tare's mat, brochures), Juice Bar (blender, olives), Bungalow (bed, rail), Raft at dusk (lanterns).

**Lights:** morning ambient about .92, noon lights off, dusk about .62 with warm lamps (`game.lights`). Keep bright scenes bright; a dark look is wrong here. Canvas lighting only: no `enableGPU`, and no WebGPU requirement for the hub.

**Performance is not a goal.** Your brief treats the budget as unlimited, with frame rates and optimization out of scope: add the detail, crowd, particles and lights a scene wants, and don't spend time optimizing.

**Draw these yourself (they make it feel like the source):** Tare; the mannequin joints; Gerald; the Plate; rings; yoga mats; step benches; tiny dumbbells; candle and flame; hoops; thought bubbles; tea tray, olives, glasses, gecko; ski gates, snowman; clothesline, pegs, socks, hamper; water cups; Member Cards. Generic props come from the engine's store: `node engine/tools/asset-find.mjs "plant pot"` (✔ benches, succulents, tubs, beds exist; no gym gear), read `engine/docs/ASSETS.md`, cut a set with `engine/tools/asset-set.mjs`. Pigeons and gulls are `E.Blob` with wings.

**Title screen:** the studio, sea, Tare hopping on a mat, the logo with `E.font.title` at scale 3 to 4 in cyan. Keep clear of the corner buttons (top right 110 × 60 CSS px).

---

## 9. Animation recipes (all ✔)

Rigs are `E.Humanoid` (`weapon: null`). Player and Regulars `chibi`; instructors `build: 'heroic', limbW: 1.5, torsoW: 2.5, hair: 'bald'` (Alder `'ponytail'`) with every colour key in wood tones. Their ball joints: after `rig.draw`, in the same `r.actor`, for `kneeL kneeR elbowL elbowR shL shR`: `const w = rig.worldOffset(rig.J[k]), p = (rig.lastView || r.view).p(w[0], w[1], w[2]);` then `px.disc` radius 3 and radius 2 in two wood tones at `(ox + p[0], oy + p[1])`.

**Real motion capture, including actual yoga, plays on these rigs.** Cut the small set in section 15. Then:

```js
const lib = Mocap.load(window.MOCAP.FITCLIPS);
function makeRig(opts) {
  const rig = new E.Humanoid(Object.assign({ weapon: null }, opts));
  Mocap.drive(rig, lib);              // first
  const base = rig.solvePose;         // then our layer: a hand-posed body, then the wobble
  rig.wob = [0, 0]; rig.body = null;
  rig.solvePose = function () {
    base.call(this);
    if (this.body) setBody(this, this.body(this));
    const [ax, ay] = this.wob; if (!ax && !ay) return;
    const J = this.J, a = ax * .45, b = ay * .3, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
    for (const k in J) { if (k === 'bladeDir' || !J[k]) continue; const p = J[k];   // turn every joint about the feet
      const r2 = p[1] * ca + p[2] * sa, z2 = -p[1] * sa + p[2] * ca, f2 = p[0] * cb + z2 * sb, z3 = -p[0] * sb + z2 * cb;
      p[0] = f2; p[1] = r2; p[2] = Math.max(z3, 0); }
  };
  return rig;
}
// each step. A clip turns the rig by its own heading, so aim with tgt minus that turn:
rig.wob = [p.x, p.y];  rig.mocap = lib.sample(clip, t);   // rig.mocap = null to stop
rig.update(dt, { x, y, z: 0, vx: 0, vy: 0, facing: tgt - (rig.spin || 0) });
```

Facing: π/2 looks at the camera; 0 is profile. **To hold a pose,** sample inside its window and drift slowly: `t = a + (b - a) * .3 * (.5 + .5 * Math.sin(time * .7))`. Clip motion keeps it alive.

**Pose table** (windows ✔ seen on contact sheets; stork, triangle and dog ✔ seen in the studio):

| Pose | Clip | Window (s) | `tgt` |
|---|---|---|---|
| Stork (one leg, arms wide) | `111_39_part1` | 3.6 to 7.0 | 1.57 |
| Knee Lift | `111_39_part2` | .5 to 2.4 | 1.57 |
| Triangle | `111_39_part3` | 2.2 to 5.2 | 1.2 |
| Warrior (wide stance, arms wide) | `111_39_part3` | 6.6 to 7.6 | 1.57 |
| Low Lunge | `111_38_part1` | 2.9 to 5.0 | .25 |
| Down Dog | `111_38_part2` | 2.8 to 5.2 | .25 |
| Forward Fold | `111_38_part2` | 8.0 to 8.8 | .25 |
| Low Plank | `111_41_part3` | 3.4 to 6.4 | .25 |

Other clips in the set: `Meditate` (Candle), `Pushup`, `22_14`, `Jumping Jacks`, `Run_Loop`, `Walk_Loop`, `Hop_One_Foot_Loop` (regaining balance), `Dizzy` (stumble), `Get_Up_From_Back` (falls), `Victory`, `Cheering_Two_Hands` (3★), `Stretch_Yawn` (morning), `Sleeping` (Lou, bed), `Greeting` (instructor's bow), `Wave_Hello`, `Waiting_Loop`, `Idle_Subtle` (Regulars). Crossfade with `lib.blend(a, b, k)`, or fade a clip over the rig with `rig.mocapW`.

**Moves with no clip: pose the body yourself.** You set hips, feet, hands; IK does knees and elbows:

```js
const { V3 } = E;  // V3.add, V3.mul, V3.norm
function setBody(rig, b) {
  const o = rig.o, J = rig.J, hipC = b.hip;
  J.hipC = hipC; J.hipL = V3.add(hipC, [0, -o.hipHalf, 0]); J.hipR = V3.add(hipC, [0, o.hipHalf, 0]);
  for (const s of [-1, 1]) { const hip = s > 0 ? J.hipR : J.hipL, foot = s > 0 ? b.footR : b.footL,
      [kn, f2] = E.ik3(hip, foot, o.legUpper, o.legLower, b.knee ? b.knee(s) : [1, s * .3, .1]);
    J[s > 0 ? 'kneeR' : 'kneeL'] = kn; J[s > 0 ? 'footR' : 'footL'] = f2; }
  const dir = V3.norm(b.chest || [0, 0, 1]), shC = V3.add(hipC, V3.mul(dir, o.torso)); J.shC = shC;
  J.shL = V3.add(shC, [0, -o.shoulderHalf, 0]); J.shR = V3.add(shC, [0, o.shoulderHalf, 0]);
  J.head = V3.add(shC, V3.mul(V3.norm([dir[0], dir[1], dir[2] + .4]), o.neck + o.headR));
  for (const s of [-1, 1]) { const sh = s > 0 ? J.shR : J.shL, hand = s > 0 ? b.handR(shC, sh) : b.handL(shC, sh),
      [el, h2] = E.ik3(sh, hand, o.armUpper, o.armLower, [-1, s * .7, -.2]);
    J[s > 0 ? 'elbowR' : 'elbowL'] = el; J[s > 0 ? 'handR' : 'handL'] = h2; }
}
const add = V3.add;
const sideLunge = u => rig => { const o = rig.o, a = Math.abs(u), w = o.footSpread + 5.4;   // feet stay down at full stretch
  return { hip: [0, u * 3.8, o.hipZ - a * o.hipZ * .4], footL: [.5, -w, 0], footR: [.5, w, 0], knee: s => [1, s * .7, .1],
    chest: [.28 * a, -u * .1, 1], handL: c => add(c, [4, -.6, -2.6]), handR: c => add(c, [4, .6, -2.6]) }; };
const hula = ph => rig => { const o = rig.o, hx = Math.cos(ph) * 2.1, hy = Math.sin(ph) * 2.1;
  return { hip: [hx, hy, o.hipZ - .5], footL: [.3, -o.footSpread - 1, 0], footR: [.3, o.footSpread + 1, 0], chest: [-hx * .22, -hy * .22, 1],
    handL: (c, sh) => add(sh, [.4, -6, 1.6 + Math.sin(ph) * .6]), handR: (c, sh) => add(sh, [.4, 6, 1.6 - Math.sin(ph) * .6]) }; };
const stepUp = (k, zb = 5) => rig => { const o = rig.o;   // k 0..1: up onto a bench zb high
  return { hip: [.2 + k * 1.2, k * 1.6, o.hipZ + k * zb * .7], footL: [k > .5 ? 3 : -1, -o.footSpread, k > .85 ? zb : 0], footR: [3, o.footSpread, zb * Math.min(1, k * 2)],
    chest: [.1, 0, 1], handL: (c, sh) => add(sh, [1 + k * 3, -1.2, -3 + k * 2]), handR: (c, sh) => add(sh, [3 - k * 3, 1.2, -1 - k * 2]) }; };
```

Set `rig.body = sideLunge(u)` each step (`rig.body = null` to release). Walking on the rope uses the rig's own walk plus arms held out the same way. Faces: `expr: 'smile' | 'wince'` in `rig.update`. Tare and Gerald are hand-drawn with `px` in `r.queue`, with a spring for squash; Tare's portrait is a function passed to `E.Dialog`. Check motion with `node engine/tools/filmstrip.mjs`.

---

## 10. Audio (all from code, no files)

**Music is 10% by default.** ✔ `menu: { settings: [{ key: 'music', value: .1 }] }` sets `game.settings.music` and `audio.musicVolume` to .1. Never compensate by raising track volumes.

**Songs:** original, gentle, a bit too pleasant; think hold music in a very clean building. Step notation with `sine`, `triangle`, soft `pulse`, sparse `drums`; use a track's `vol`, `gate`, `vib`, `name`, `on` and `audio.layer` to add parts as you do well. Write about 12: studio, island (morning), island (dusk), yoga pad, iron, step A (100 bpm), step B (120 bpm), jog, ski, tray lounge, laundry pizzicato, festival, ending, plus jingles (star 1/2/3, unlock, day done) via `audio.sting`. Do not reuse the engine's songbook as your soundtrack, and imitate nothing.

**SFX** via `audio.define`: Tare's signature two-note step-on boop, creak, in-ring chime that climbs, stumble, hippo clink, gull, pigeon flurry, flame flick, hoop whirr (pitch follows speed), ski carve (noise), tray clink, olive plop, rope creak, star stamps, menu tick and confirm. The Stork tier 2 balance tone is your own oscillator on `audio.bus('sfx')`.

**Voices: Animalese-style gibberish, a sound per letter, on the voice bus.** `new E.Dialog(game, { voice: (ch, i, talk) => babble(talk.name, ch) })` (`talk.name` is the speaker the current `say` gave). `babble` makes a 60 to 90 ms oscillator (sine or triangle) through a band-pass filter on `audio.ctx`, connected to `audio.bus('voice')`, with pitch and filter from a table by letter (vowels open and longer, consonants short), skipping spaces and punctuation. Each speaker has base pitch, speed, wave and vibrato: Tare high and quick, Birch low and slow, Alder warm, Gertrude quavery, and so on. Guard for `audio.ctx` being null (headless, or before the first input). Add a `voice` slider setting that applies `audio.voiceVolume`. Exercise grunts use the same function.

---

## 11. UI and UX: 10 feet, controller first

**Rules:** at most 6 choices on a screen; one idea per screen; no tables or data grids anywhere; body text never below font scale 1 (`font: 'tiny'` is banned), key numbers scale 2 to 3; anchor everything to `r.W` / `r.H` with 12 px margins; ✔ judge it from screenshots at 1920×1080.

**Canvas UI, bright and round.** `E.Menu`'s default is a dark JRPG window: wrong here. Write one **`Pills`** widget (about 70 lines) and use it on every game screen: white rounded pills, cyan focus that grows slightly, soft tick on move. Up/down (or left/right) with `input.repeat`, ✕ or Enter picks, ○ backs out. **Mouse: hover moves focus, a click picks** (`input.pointer()`, `input.clicked()`). `E.Dialog` takes `{ bg: ['#ffffff', '#eaf6f8'], border: '#2cc6e6', color: '#20404c', nameColor: '#14a8c8' }`, but it hard-codes a near-black text shadow that smears on white. **Make this one engine change ✔:** in `class Dialog` in `engine/my-3d2dge.js`, replace each `shadow: '#05040a'` used for the name, the text and the choices (3 places, around lines 9153 to 9176) with `shadow: this.shadow === undefined ? '#05040a' : this.shadow`, then set `talk.shadow = null`.

**Prompts** come only from one `prompt(action, verb)` helper that draws a chip at bottom right, showing what the player used last. Controller: `input.label(action)` gives ✕ ○ □ △ L1 R1 L2 R2 Options ✔ (the pixel font draws them all). Keyboard and mouse: `input.label(a, 'keyboard') + ' / ' + input.label(a, 'mouse')`, e.g. "Space / Left click". Lean's own prompt says "Left stick" / "WASD" / "Move the mouse" by the live source. ✔ `menu: { settings: [{ key: 'glyphs', value: 'playstation' }] }` defaults to PlayStation, and the standard Settings → Controller → Button symbols offers Xbox (A B X Y).

**Standard screens stay the engine's** (pause, settings, controls, rebinding, full screen, boot). ✔ Theme and fix them:

```js
new E.Shell(game, { theme: { ink: '#20404c', paper: '#f7fbfb', accent: '#14a8c8', muted: '#5f7f8a', danger: '#e0553a', line: '#c8dde2', font: 'system-ui, sans-serif', titleFont: 'system-ui, sans-serif' } });
// the engine's HTML menus don't move focus on hover. This makes them:
if (typeof document !== 'undefined') document.addEventListener('pointerover', e => {
  const b = e.target.closest && e.target.closest('.esh-sh button:not(:disabled), .esh-sh input:not(:disabled)');
  if (b && e.pointerType === 'mouse') b.focus({ preventScroll: true }); });
```
```css
@media (min-height:700px){.esh-mod{zoom:1.5}} @media (min-height:1000px){.esh-mod{zoom:2}}   /* readable at 10 feet */
.esh button:focus,.esh input:focus{outline:3px solid var(--accent);outline-offset:2px}
[data-sys=need]{background:rgba(5,3,12,.35)!important;align-items:flex-end!important}          /* lets attract show through */
```

**Game settings** (`menu.settings`): `music` .1, `glyphs`, `voice` slider, Gentle Mode, Breath Hold/Toggle, Tare's Tips on/off. `menu.items`: Restart Session, Dev Mode. `menu.quit: 'title'`, autosaving first. `menu.controls` names the actions in plain words and hides the ones a player has no reason to rebind.

**Touch-only devices.** ✔ `new E.Game({ touch: 'never' })` shows exactly "Controller or keyboard required" with a Settings button and no touch controls; the CSS above lets the attract mode show behind it. Attract runs after 10 s as usual (taps produce no actions, so it stays running).

**Comfort:** use `game.shake` / `game.flash`, which follow the settings. Pausing is standard; every activity scene is `pausable: true`.

**About / Credits screen** (from Title): paged, big text, no scrolling wall. Pages: Source Information (every field your brief lists, in its order), Testing Feedback, Engine Feedback, Prompt Feedback, Credits (engine; Mesh2Motion and Quaternius, CC0; CMU Graphics Lab Motion Capture Database; asset store sources). `build.mjs` injects your exit-interview JSON into the page as `G.ABOUT`, so screen, file and chat reply cannot disagree. Usage shows "added on import" as your brief says.

---

## 12. Attract Mode

After **10 s with no input** on the title or any top-level menu (`game.hook('input', ...)`: `anyPressed`, stick, pointer movement). **Any input** returns to the title and swallows the press (`input.consumeAll()`).

Fiction: nobody's here, so Tare shows the empty room around. A "DEMO" chip, the logo in a corner, "Press any button" (by device), and subtitled lines: "Nobody's here. I'll just show the room what we do." On exit: "Oh! You're back. I wasn't doing anything."

**Playlist, about 15 s each, looping:** Island walk → Body Check → Stork Stand → Sun Flow → Quiet Candle → Squat Rail → Push-Up → Side Lunge → Step Class → Hoop Hips → Coastal Jog → Slalom → Tray Service → Laundry Line → four-mat Class → results with Gerald's coins → Grand Stillness. Each runs the real activity scene with the expert bot filling `intent`, with cheats allowed (no stumbles). It never touches saves or unlocks. Use a Regular's rig as the star.

---

## 13. Dev Mode

Reachable from the pause menu (`menu.items`), in every scene, on every device. It closes the pause and docks a canvas panel on the left third **while the game keeps running**, so balance changes are felt live. D-pad up/down moves, left/right adjusts (held accelerates, L1/R1 coarse), ✕ activates, ○ closes. Arrows on keyboard (WASD keeps leaning). Mouse: drag sliders; the pointer over the panel does not lean.

**Live sliders** (all in one `DEV` object with defaults; "Reset to defaults" restores it; each shows default vs current):
- Lean: `k c s A nf`, ring scale, push strength, stumble threshold, mouse reach, nudge rate
- Scoring: star thresholds, rep tolerance, rhythm window scale, fatigue amount
- Cardio: hoop band, jog cadence band, jog speed
- Games: slalom speed and turn, tray gravity and friction, rope instability, gust strength
- World: time scale (0, .25, .5, 1, 2), minutes multiplier

**Tools:** jump to any scene/activity/tier/day; finish now with N stars; unlock all; +10 minutes; set Spine Age; reset this member; no stumbles; bot plays (poor/average/good/expert); show Plate trace and numbers; frame step; force attract; **Pose Viewer** (pick any clip, scrub, print a pose row for `game/data/poses.js`); log `game.debug.snapshot()` to the console. Hidden in a hub session.

---

## 14. Multiplayer

**Class (local, on its own, 2 to 4).** From the title: join with Start on a free pad or 2 on the keyboard (`game.allowJoin({ max: 4, onJoin })`; `game.players[i]` has the same input API; keyboard players get `E.Input.halfKeys`). ✔ Half a keyboard runs out of keys with the full `INPUT` (the step and pace actions get none), so the Class scene sets its own `input`: the moves and menu actions plus `breath`, `catchL`, `catchR` only (left half F G H, right half `. / ,`), and its Step Class reads `lanes: ['left', 'down', 'up', 'right']`. Everyone gets a mat, a colour (`E.PLAYER_COLORS`) and a pre-made rig, on one fixed screen at size 1.5 with a small Plate under each. Activities: Stork Stand, Quiet Candle, Squat Rail, Step Class (two lanes), Hoop Hips, 35 s each, or "Surprise me" (3 rounds). So every class-capable activity takes a list of **contestants** from the start, not one player. Scores are 0 to 1000 (`round(pct × 1000)`). Results: podium with polite titles (Most Still, Best Wobble, Participated). Tare reads them. Empty mats hold Regulars driven by bots, for life, not for score.

**AI Hub session (`ghost` mode, 1 to 4).** Follow the protocol README (`https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/README.md`); it is short, read it. Outside a session the game is unaffected and `connect()` answers `null`. ✔ This exact shape passed the harness at 1, 2, 3 and 4 players, on the bad network, and with the host leaving.

**The round: "Morning Class".** Everyone plays the same 3 events on their own copy, in lockstep, seeing others as translucent seat-coloured ghosts on neighbouring mats (or in the world for Slalom and Jog). About 150 s: each event is 5 s intro + 40 s play + 5 s scores. Deal with `AIHub.rng('deal')`: one from Stork/Candle/Squat/Push-Up, one from Step/Hoop, one from Slalom/Jog.

```js
const inSession = !!(window.AIHub && AIHub.active);
const game = new E.Game({ canvas: 'screen', id: 'GAMEID', res: 'ps1', expand: true, touch: 'never', input: INPUT,
  autoPause: !inSession, live: inSession, fullscreen: inSession ? false : 'button',
  menu: { quit: inSession ? false : 'title', items: inSession ? [] : [/* Restart, Dev Mode */], settings: [/* section 11 */] } });
game.start({ scenes, scene: inSession ? 'round' : 'title', boot: {/* steps */} });
if (inSession) (async () => {
  const info = await AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true });
  if (!info) return game.go('title');
  AIHub.on('card', c => { card = c; });
  AIHub.on('start', () => {});
  AIHub.on('message', (d, from) => { /* ghost state */ });
  AIHub.on('leave', ({ id }) => { /* remove that ghost */ });
  AIHub.on('time-up', () => report());                  // result() at once if not reported
  AIHub.on('end', () => { over = true; game.audio.stopMusic(); game.audio.mute(true); game.input.clear(); });
  await game.booted; AIHub.ready();                     // no key press
})();
```

- **Card (yours, `card: true`):** the studio with the players lined up on mats, Tare hopping, the title, each player's name and colour with a ready tick, how to win, this player's controls, seconds left. While `AIHub.time() === -Infinity`: `confirm` or `start` → `AIHub.answer('ready')`, `more` (△) → `AIHub.answer('more')`, clicks on Ready/More too. No menus or choices on the card. Show "More time" state from the `card` event (`asked`, `paused`).
- **Clock:** all event timing comes from `AIHub.time()`, not `game.time`. A frame over 50 ms gives up its time, so a slow machine's game clock lags and would desync. Countdown while negative. Play at ≥ 0. If `info.limitMs` is shorter than the round, shrink the events.
- **Randomness:** every activity takes its disturbances from `AIHub.rng('e' + eventIndex)` (and a seeded `E.rng` offline). `Math.random` is only for cosmetics like particles and blinks, because copies draw it at different rates.
- **Ghost data:** `AIHub.send({ t: 'g', a: eventIndex, l: [x, y], p: phase, w: [wx, wy], s: score }, { reliable: false })` about 10 times a second. Draw only if `a` matches your current event. `r.actor(..., { alpha: .5 })`, name tag in seat colour. Names come from `info.players`, drawn with `E.font` only (never HTML). Limit: 20 messages/s.
- **Reporting:** `AIHub.progress({ score: total, label: total + ' pts' })` about once a second; at the end `AIHub.result({ score: total, stats: { Steadiness: '84%' }, awards: [{ title: 'Most Still', detail: '...' }] })` once.
- **In a session:** no title, attract, dev, quit, restart or saved progress. Options opens the settings over the running round (`live`). No chat, emotes or custom names. No other network. Engine already ignores Options while Create is held ✔.

**Head tags (`build.mjs` writes them), in this order ✔:**

```html
<meta charset="utf-8">
<script>/* vendor/session.js, unmodified, first script in head */</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>THE TITLE — a tagline</title>
<meta name="description" content="one or two sentences">
<meta name="theme-color" content="#2cc6e6">
<meta name="hub:type" content="Game"><meta name="hub:players" content="1–4"><meta name="hub:source" content="Wii Fit">
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-4"><meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="3">
<meta name="hub:session-goal" content="Stay steadiest over 3 exercises; most points wins">
<meta name="hub:session-howto" content="Lean: left stick, WASD or mouse. Breathe: R2, Space or click">
```

---

## 15. Tech and setup

**Stack:** the my-3D2dge full engine (2D views), its `mode7`, `road`, `physics`, `rhythm` modules (all inside `my-3d2dge.js`), `Mocap` and a cut clip set, the hub client. No World3D, no other libraries. **Start from no single kit:** this game mixes genres, so use the full engine with your own page, and read `engine/kits/road.js`, `kart.js`, `rhythm.js`, `pinball.js` (physics) and `sports.js` (joining players) when you build those parts.

**Fetch (✔ every command run from a clean folder; run from the dev folder):**

```sh
git clone --depth 1 --filter=blob:none --sparse https://github.com/michaelcrosato/my-3d2dge.git _src
git -C _src sparse-checkout set dist/handoff
cp -r _src/dist/handoff engine        # then remove _src
npm install playwright@1.63.0         # uses the browsers already here. Never `playwright install`, whatever the engine's README says

mkdir -p vendor/clipsrc/tools vendor/clipsrc/src/mocap tests/hub
B=https://raw.githubusercontent.com/michaelcrosato/my-3d2dge/main
H=https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub
curl -fsSLo vendor/clipsrc/tools/anim-set.mjs $B/tools/anim-set.mjs
curl -fsSLo vendor/clipsrc/tools/mocap-lib.mjs $B/tools/mocap-lib.mjs
curl -fsSLo vendor/clipsrc/src/mocap/readable.js $B/src/mocap/readable.js    # the tool needs it exactly here
curl -fsSLo vendor/readable.js $B/src/mocap/readable.js
curl -fsSLo vendor/mocap.js $B/src/mocap/mocap.js
for f in src/mocap/sets/mesh2motion.js src/mocap/sets/cmu.js examples/cmu-lib/CMU_111.js examples/cmu-lib/CMU_22.js; do curl -fsSLo vendor/clipsrc/$(basename $f) $B/$f; done
curl -fsSLo vendor/session.js $H/session.js
for f in harness.html bridge.js round.js; do curl -fsSLo tests/hub/$f $H/$f; done
node vendor/clipsrc/tools/anim-set.mjs vendor/clipsrc/mesh2motion.js vendor/clipsrc/cmu.js vendor/clipsrc/CMU_111.js vendor/clipsrc/CMU_22.js \
  --clips "Pushup,Meditate,Jumping Jacks,Sleeping,Victory,Cheering_Two_Hands,Dizzy,Idle_Subtle,Greeting,CMU:Run_Loop,CMU:Walk_Loop,Stretch_Yawn,Get_Up_From_Back,Waiting_Loop,Hop_One_Foot_Loop,Wave_Hello,111_38_part1,111_38_part2,111_39_part1,111_39_part2,111_39_part3,111_41_part3,22_14" \
  --name FITCLIPS --out vendor/fitclips.js --credit "Mesh2Motion (CC0), Quaternius (CC0), CMU Graphics Lab Motion Capture Database (free for all uses)"
# prints 23 clips, about 173 KB. vendor/clipsrc can then go; it is not bundled
```

More clips, if you want them: search `https://raw.githubusercontent.com/michaelcrosato/my-3d2dge/main/src/mocap/catalogs/cmu-takes.tsv` (take `NN_xx` lives in `examples/cmu-lib/CMU_NN.js`) and `.../catalogs/mesh2motion.json`.

**Layout:**

```
engine/        the handoff copy (my-3d2dge.js is the engine; API.md, API-INDEX.md, AI_GUIDE.md, tools/, kits/, docs/)
vendor/        readable.js, mocap.js, fitclips.js, session.js
game/
  index.html   dev page: canvas (#screen with CSS width and height 100%, or it draws at 300×150 ✔) and the scripts in order
  core.js      G namespace, game, INPUT, DEV defaults, state, saves, deep links (#hub, #act/stork/1, #day/3, #ending)
  balance.js   Balance model, intent sources (devices, bots), Plate
  rigs.js      makeRig, setBody and moves, Tare, Gerald, joints, cast
  ui.js        Pills, prompt, Card, Results, DevPanel
  audio.js     songs, sfx, babble
  data/        lines.js, poses.js, activities.js, charts.js, courses.js, trays.js, days.js, unlocks.js
  activities/  hold.js, candle.js, rep.js, step.js, hoop.js, jog.js, slalom.js, tray.js, laundry.js
  scenes/      title, attract, member, arrival, island, bodycheck, session, evening, games, ending, about, class, round
tests/run.mjs  the one test command; tests/hub/ the harness
build.mjs      the one build command
```

Plain scripts on one global `G`, no ES modules (the page must work from `file://`). **Build out by data:** a designer adds a tier, pose, chart, gate course, tray, line or day by editing `game/data/`, with no code change. Add a short `game/data/README.md` saying how.

**Activity registry:**

```js
G.activity({ id: 'stork', family: 'hold', discipline: 'Stillness', name: 'Stork Stand', view: 'brawler', camera: { zoom: false },
  class: true, hub: true, tiers: [ {/* numbers */}, {/* numbers */} ], stars: [.35, .65, .90], lines: {/* ... */},
  setup(ctx) {}, update(dt, ctx) {}, draw(r, ctx) {}, hud(r, ctx) {},
  result(ctx) { return { pct, detail }; },
  bot(ctx, skill) { return intent; },
  ghost(ctx) { return state; }, drawGhost(r, ctx, id, state) {} });
```
`ctx`: `{ tier, rng (seeded), contestants: [{ intent, bal, rig, name, color, score, local }], time, done, cheat }`. Every activity becomes its own pausable scene, generated from the entry. Set `game.debug = { snapshot() { return { scene, activity, tier, day, session, pct, stars, minutes, spineAge, lean, source }; } }`: tests and engine tools read it.

**`build.mjs`:** concatenates engine, `vendor/readable.js`, `vendor/mocap.js`, `vendor/fitclips.js`, game files; replaces every `</script` with `<\/script` in everything it inlines ✔; writes head tags, CSS, the boot markup at the start of `<body>` (copy the `e3-boot` div from `engine/game/index.html`); injects the exit-interview JSON as `G.ABOUT`; writes the single file to the place your brief names (pass it as an argument) and copies it to `tests/hub/game.html`. External CDN is allowed but not needed: inline everything. About 1.5 MB.

**Engine changes:** only the small Dialog shadow patch (section 11) is required. Everything else works through the public API and the wrappers above. Note whatever you change, and why, for your Engine Feedback.

**Traps already found (so you don't lose time on them):**
1. A custom `input` map replaces the preset (section 3).
2. `brawler`: +y is toward the camera (section 8).
3. Mouse movement doesn't change `lastDevice` from `'keyboard'` (section 3).
4. Default `music` is .5 and `glyphs` 'auto': set both (section 11).
5. Music at 10% hides the beat: click on the sfx bus (section 4).
6. HTML menus lack hover focus; the touch notice is 88% opaque (section 11).
7. `E.Dialog` hard-codes a dark text shadow (section 11). The standard Settings list is long at 10 feet: rely on its scrolling focus and the zoom CSS.
8. In tests, `game.fadeTime = 0`; `game.go` otherwise delays the new scene .22 s.
9. A frame past 50 ms gives up its time: browser tests here are software-rendered and slow, so wait on game state, never on the clock.
10. In Python Playwright use `page.wait_for_timeout`, not `time.sleep` (it freezes the event loop and frames never appear).
11. `E.store` is shared by id; set `id` on the game, and `E.store.clear()` between test games in one process.
12. Fixed-camera scenes need `camera: { zoom: false }`, or the wheel zooms instead of stepping.

---

## 16. Testing

**One command: `node tests/run.mjs [rules|browser|hub|all]`.** It prints only failures and one final line (`213 passed, 0 failed`). Rerun only the group whose code you changed. Use scripted checks first and screenshots only for what a script can't judge. Do not use subagents or workflows to debate, review, judge or audit.

**`rules` (Node, no browser, seconds).** Load engine, vendor and game files in a `vm` context with `window`, `addEventListener` and `location` stand-ins (✔ `Mocap` and clips load this way; see `engine/kits/test.mjs`). Drive with `game.advance` and `input.tap/hold`; read `game.debug.snapshot()`.
- Lean model: each row of the section 3 table lands in its band (±10 points) with the bots, on 12 seeds.
- Every activity, every tier: passive under 1★; average at least 1★; good at least 2★; finishes in its time; `game.errors` stays empty.
- **Full scripted playthrough:** New Member through every scene to the Ending using real input taps and bots, all 12 activities played, Spine Age falls, Day 3 plateau holds, unlocks arrive, Free Play opens. Also a passive run (the worst player still reaches the end).
- Saves: reload gives the same state; 3 members stay separate; a damaged save doesn't crash.
- Same seed and same input give the same hash twice.
- Attract: fires at 10 s idle (and not at 9.9), visits every playlist item, any input returns to title, no save or unlock changed.
- Dev: every slider changes its live value; reset restores all; every jump target loads.
- Class: 4 inputs, scores, podium. Hub logic with a fake `AIHub` object: same seed, same deal; time-up reports once; end stops input.
- Data lint: every line, pose, clip name, activity and unlock referenced exists; no `TODO` or placeholder strings in `game/`.

**`browser` (Playwright, one browser at a time, on the built file via `file://`, which needs no server):**
- `node engine/tools/check.mjs <built file>` passes with no errors (and act on its look notes), at 1280×720.
- **Controller stand-in ✔:** `add_init_script` replaces `navigator.getGamepads` with a `'DualSense Wireless Controller (STANDARD GAMEPAD)'` pad in `mapping: 'standard'`. Check axes lean, `buttons[7].value` reads through `input.value`, ✕ confirms, prompts show ✕, Settings to Xbox shows A.
- Keyboard and mouse: WASD nudges; pointer leans; hover moves focus in `Pills` and in the HTML menus; click activates; prompts change with the device.
- Touch-only: a phone profile shows the notice and Settings button, no touch controls, and attract starts at 10 s behind it. iPhone profile on WebKit as a smoke test; also load in Firefox.
- Sound: after a gesture, an `AnalyserNode` on the music bus is non-silent and `game.settings.music === .1` on fresh storage; the voice bus sounds during dialog; `OfflineAudioContext` renders `babble` non-silent; no audio files and no network requests at all (`page.on('request')`).
- 1920×1080 screenshots for the 10-foot judgement of title, Plate, Card, results and island: look at them once per milestone.

**`hub`:** copy the bundle to `tests/hub/game.html`, serve `tests/hub` with `python3 -m http.server 0 --bind 127.0.0.1`, read the port it prints, confirm the page is yours, then open `harness.html?game=game.html&` + each of: `players=1&auto=1`; `players=2&auto=1`; `players=3&latency=150&jitter=50&loss=5&auto=1`; `players=4&latency=150&jitter=50&loss=5&auto=1`; `players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave`. Wait for `document.body.dataset.complete === 'true'`, require `window.__hubCheck.pass`, and print failing `checks`. Then open the game on its own and see it reach the title. Stop only your server, by its PID, never with `pkill`, `killall` or `fuser -k`.

**Sharing this computer:** keep one or two browsers open, keep every file in your own folder, don't read the folders beside it (other agents work there), never kill anything you did not start. "Target closed" or "page crashed" means memory ran out: run fewer browsers rather than retrying.

---

## 17. Build order

Each milestone ends with a playable game and green tests. Keep the build and the tests working from M0 onward.

| # | Build | Done when |
|---|---|---|
| M0 | Fetch; `build.mjs`; `tests/run.mjs`; `INPUT`, Shell theme, settings; empty title and round scenes with the session wrapper | Harness passes on the empty game; music .1; `tests/run.mjs` prints its line |
| M1 | Lean, intent, devices, bots, Plate; `makeRig`; Tare and voice; studio scene; **Stork Stand** with Card and Results | Feels good on stick, keys and mouse. Bands hold. **Stop and tune here: it is the whole game** |
| M2 | Title, Pills, Member Card, Arrival, island, mats, Body Check, Day loop, evening, saves, Gerald, Spine Age; attract skeleton; Dev panel with Lean sliders | A day can be lived start to end |
| M3 | Sun Flow, Quiet Candle, all three Rail exercises | Bots pass; poses read at 1080p |
| M4 | Step Class, Hoop Hips, Coastal Jog | Bots pass; beat audible at default volume |
| M5 | Slalom, Tray Service, Laundry Line | Bots pass |
| M6 | Five-day script, Tare's Day, Gentle Games, duel, Ending, Credits, Free Play, wardrobe, full line bank, all music and sfx | Full playthrough test passes |
| M7 | Class mode; the hub round with ghosts and card | Harness at all five settings; two-page play shows ghosts |
| M8 | Full attract, full Dev Mode with Pose Viewer, About screen, tier 2s, Comfort, polish pass (particles, stamps, rumble, transitions: `game.go` with `fade: 'iris'`) | All groups green |
| M9 | Final bundle, exit interview parses, About matches it, brief checklist below | Done |

**If you truly run out of room, cut in this order and remove every trace (no stubs):** tier 2s except Eyes Closed → Tare's Day scene → Laundry Line → Coastal Jog → wardrobe items beyond three. Never cut: the Lean, Stork, Rail, Step, Candle, Slalom, Tray, the day loop, the ending, attract, dev mode, Class, the hub round, About.

---

## 18. Finish line: your brief, line by line

- [ ] Title chosen by the brief's method and shown on the title screen; single HTML file with the brief's name in the brief's place; dev files in the brief's dev folder
- [ ] Original game: no copied names, characters, art, music or levels
- [ ] Genre and perspective as section 1; built on the handoff engine (changes noted)
- [ ] Art and animation: engine-native base, new assets and motion (sections 8, 9)
- [ ] All audio from code; gibberish voices; music 10% by default (section 10)
- [ ] Hub session passes the harness; the game also runs on its own, with local Class (section 14)
- [ ] Demo shows every feature; all infrastructure is real; designer data in `game/data/` (section 15)
- [ ] Dev Mode from the pause menu: tools, live sliders, reset (section 13)
- [ ] Attract at 10 s idle, loops, any input exits, runs on touch-only (section 12)
- [ ] Writing in the source-inspired tone throughout (section 7)
- [ ] 10-foot, controller-first; native keyboard and mouse; hover moves focus; prompts follow last device; PlayStation glyphs with Xbox setting; no dense screens (section 11)
- [ ] Touch-only: no touch controls, "Controller or keyboard required", Settings button (section 11)
- [ ] One test command, failures and a count only; scripted playthrough of the whole game (section 16)
- [ ] No TODOs, placeholders or stubs anywhere
- [ ] Source Information, Testing Feedback, Engine Feedback, Prompt Feedback in the chat reply **and** the About screen, "unknown" for what you can't confirm, Usage as "added on import". Plan field: this plan's file name. Research field: what you actually did (further research is optional; this plan's recipes are already tested)
- [ ] Exit-interview JSON beside the HTML, in the brief's exact shape, parses. Suggested `aiHub`: type `Game`, genre `Sports`, source `Wii Fit`, series empty, players `1–4`, controls in one line, tags from: `pixel art`, `comedy`, `versus`, `arcade`, `story`, `2d`
