# Game plan: an original fitness comedy inspired by Wii Fit

You are the builder. Build this game from this plan and your brief. Nobody will answer questions, so where the plan leaves something open, decide and move on.

- **The title is yours.** Pick it the way your brief says. It lives in one constant (`src/data/title.js`) and nothing else hard-codes it. In this plan `{TITLE}` stands for it.
- **Paths are relative to your dev folder.** "Root" means its parent, where your brief puts the deliverable html and the exit-interview file. Use the names your brief gives.
- **✔ means the director ran it** on this machine against engine kit 0.46.0 and hub client 1.4.0, in the form written here. Don't re-derive it. If your download is newer, read its changelog from 0.46.0 on.
- **Read in this order:** this plan; the kit's `GUIDE.md` and `ASSETS.md`, whole; the hub's `README.md`, whole. Search `API.md` and `LIBRARY.md`; don't read them whole.
- Your brief's rules on folders, ports, processes, browsers and test reporting still apply. They are repeated here only where they shape the work.

---

## 1. The game

**A week at a spotless wellness island run by a small, polite, deeply judgmental bathroom scale. Your whole body is one dot. Keep it in the circle.**

- **Genre:** fitness and balance minigame collection, inside a light life-sim week. (Catalogue genre: Sports.)
- **Perspective:** isometric on the island; fixed front-on for class activities; other fixed views per activity (section 5).
- **Length:** a story week of 7 short days, 16 minutes at the quickest and about an hour for a player who tries everything. Everything is also playable at once from Drop-In Class.

### Pillars (use these to settle any open question)

1. **You are a dot.** Almost everything is one verb: lean. The left stick, WASD or the mouse moves your centre of balance, and it has weight and sway. Poses, reps, hoops, slacklines and the finale are all different ways of moving or holding the Dot.
2. **Politely judged.** Everything you do gets a calm, clinical, faintly wounding remark. You cannot lose. You can only be noted.
3. **One small day at a time.** Short sessions, a morning number, a chart, a jar slowly filling.
4. **Always in class.** Other people are always beside you: classmates alone, family on the couch, friends as ghosts online. Everyone wobbles.

### What it takes from the source, and how it stays original

| Distinctive in the source | Here |
|---|---|
| Your body is the controller; a centre-of-balance dot | The Dot: real sway physics on a stick, keys or mouse |
| A talking device that politely judges you | Ounce, a mint retro dial scale whose dial is its face |
| A calm instructor demonstrating | Coach Plumb, 81, unblinking, never off vertical |
| Daily check-in, one number that sums you up, a graph | Weigh-In, Wobble Age, a line chart with a twist |
| Yoga, strength, aerobics, balance games | Four stations on the island |
| Minutes banked toward unlocks | Drips in the Sweat Jar |
| A bright, clean, soft-spoken world | White tile plaza on a pastel island made of giant gym equipment |
| A household sharing one device | Family Hour on one TV, AI Hub sessions online |

**Do not use** any Nintendo name, character, look, music, level or minigame name: no Wii, Mii, Balance Board, Wii Fit Trainer, Wuhu Island or Fit Age. No white-board host, no sound-alike tunes, no channel-style menus. Mechanics may rhyme; everything you can see, hear or read is new.

**Taste rule:** no jokes about a real person's weight, body shape or eating, and no health claims. Ounce judges wobble, knees, posture and life choices, never bodies. The game asks for no real health data. The About screen says: "This is not medical advice. Ounce is a scale."

---

## 2. World and cast

**Tare Island** ("Everything here starts at zero.") is a tiny resort whose landscape is exercise equipment at enormous scale: Kettlebell Volcano (dormant, mostly), Foam Roller Hills, the Dumbbell Bridge, medicine-ball boulders. A white-tiled plaza sits at its heart, ringed by lawn, sand and calm sea.

| Who | What | Voice |
|---|---|---|
| **Ounce** | The host, a scale. Hops after you on the island. Eyes and a red needle on a round dial: the needle is its eyebrow, and it whips, droops or spins with mood. | High, clipped, polite. "I'd like to weigh in on that." |
| **Coach Plumb** | 81, silver bun, cyan tracksuit, a plumb bob hanging from one wrist. Demonstrates everything without effort. | Low, slow, deadpan. |
| **Marguerite** | 74, classmate. Has had everything replaced and tops every leaderboard. Friendly menace. | Warm, unhurried. |
| **Dennis** | 47, classmate. Here after "an incident with a deck chair". Overconfident, always nearly injured. Beatable by Day 3. | Quick, hearty. |
| **June** | 12, Marguerite's granddaughter. Excellent and bored. | Flat. |
| **Kevin** | A seagull. Lands on people. Ounce speaks of him as staff. | Squawks. |

**The story in one breath:** you arrive by ferry; Ounce weighs you and gives you an alarming Wobble Age. Through the week the classmates hint that something is off ("Has anyone ever checked that scale?"; Coach hangs her plumb line beside Ounce: "You are leaning."; Kevin sits on Ounce and the dial reads 7). On Day 7 you face **The Long Stand**: 90 seconds of standing still while the whole island tries to distract you. Then Ounce confesses: *"I have been adding seven. To everyone. For years. It felt motivating."* The chart of your week visibly slides down seven years. Credits. *"See you tomorrow. Bring your knees."* Play continues as an open-ended Week 2.

---

## 3. Structure of play

### Menu map

```
Title ("Press any button. Gently.")      idle 10 s on title or any menu -> Attract
└ Main Menu
  ├ The Week        pick one of 3 guest slots -> Continue day N / start a week -> Island
  ├ Drop-In Class   any activity at once, all open, records only, no Drips or story
  ├ Family Hour     1-4 players on this screen -> Join -> The Medley -> Podium
  ├ Settings
  └ About & Credits
```

In an AI Hub session none of this appears: the game opens on its own card, then the Medley (section 12).

### Starting a week

Name entry, one of 6 preset avatars (the Locker Room changes it later), then the ferry cutscene and Ounce's introduction, which teaches the Dot before the first test: "This dot is you. Keep it in the circle." Then the first Weigh-In. Ounce also asks "How old do you feel? This is not binding." with a number picker; the answer is used once, in the joke when the Wobble Age arrives, and never saved.

### A day in The Week

1. **Morning Weigh-In** (about 45 s, section 6): balance test, one absurd question, today's Wobble Age.
2. **Free time on the island:** walk between stations, do what you like. Coach's prescription (a daily goal) pays a bonus. Ounce follows and comments.
3. **Hammock** ends the day once you've done at least one activity. Leaving early earns a guilt-trip, never a block.
4. **Evening Report** (about 20 s): minutes, Drips, stars, the chart, tomorrow's "concern", new unlocks. The light goes to dusk (`applySky(engine, skyAt(19))`), then fade to morning.

### The week

| Day | Test | Coach's prescription (+5 Drips) | Opens today | Story beat |
|---|---|---|---|---|
| 1 | Stillness | Holding Still and one other | Apologetic Tree, Startled Heron, Squats of Regret, Hoop Economics | Ferry. "Please step on me." "Ow." "This dot is you. Keep it in the circle. That's it. That's the game. Everything else is decoration." |
| 2 | Lean | 2★ in anything | Coconut Header, Apology Lunges, Reluctant Warrior (adds breathing), Locker Room | Dennis explains the deck chair. Nobody asked. |
| 3 | Chase | Something you haven't done | Step Class, Slackline, The Chair Nobody Asked For | Marguerite: "Has anyone ever checked that scale?" Ounce: "I'd like to weigh in on that. No." |
| 4 | Stillness | 3 activities | Vitamin Tray, Overhead Mortgage, Tax Season | Coach hangs her plumb line by Ounce. "You are leaning." "The island is leaning." |
| 5 | Lean | Beat Dennis at anything | Island Jog, Pier Jump, Plank Negotiation | Kevin sits on Ounce. The dial reads 7. Nobody says anything. |
| 6 | Chase | 3★ anywhere | Hard versions of everything | Ounce rehearses a speech, badly, behind the Sweat Jar. |
| 7 | Stillness | Stand. | The Long Stand, then the ending | The confession. The chart slides. Credits. |

### Progress

- **Stars:** every activity gives 0-3★ from thresholds in its data.
- **Drips:** `2 + 3 × stars + floor(playSeconds / 30)`, plus the +5 goal bonus. They fill the **Sweat Jar**.
- **Jar milestones** at 10, 25, 45, 70, 100, 135 and 175 Drips each unlock a Locker Room item (second headband, towel cape, "Confidence: no visible effect", and so on) and a remark.
- **Records:** per activity, compared with data-table scores for Dennis (low), June (mid-high) and Marguerite (high). A classmate you beat reacts in the Report.
- **Saves:** `localStorage`, versioned JSON, one key, 3 guest slots, written after every activity and day. Handle missing storage (Node, private mode) with an in-memory fallback.

---

## 4. The core: the Dot

Everything hangs on this feeling good, so it comes first. A stick mapped straight to position would be trivial, because you would just hold still. So the Dot is an unstable weight: you apply force, and it drifts, sways and overshoots.

### The model ✔ (simulated with human-like bots; these are the defaults)

```js
// src/core/dot.js: pure, no engine imports. Step in fixedUpdate at 60 Hz. p is in -1.2..1.2.
export class Dot {
  x = 0; y = 0; vx = 0; vy = 0; ux = 0; uy = 0; t = 0;
  constructor(rand) { this.ph = [rand(), rand(), rand(), rand()].map((r) => r * 6.283); }
  step(dt, inX, inY, T, m = {}) { // T: tunables. m: per-activity modifiers.
    this.t += dt;
    const k = Math.min(1, dt / T.dotLag);
    this.ux += (inX - this.ux) * k; this.uy += (inY - this.uy) * k;
    const n = T.dotNoise * (m.noise ?? 1), inst = T.dotInstability * (m.inst ?? 1), auth = T.dotAuthority * (m.auth ?? 1);
    const nx = n * (Math.sin(1.7 * this.t + this.ph[0]) + 0.6 * Math.sin(3.1 * this.t + this.ph[1]));
    const ny = n * (Math.sin(1.3 * this.t + this.ph[2]) + 0.6 * Math.sin(2.7 * this.t + this.ph[3]));
    this.vx += (inst * this.x + auth * this.ux - T.dotDamping * this.vx + nx + (m.bx ?? 0)) * dt;
    this.vy += (inst * this.y + auth * this.uy - T.dotDamping * this.vy + ny + (m.by ?? 0)) * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    const d = Math.hypot(this.x, this.y);
    if (d > 1.2) { const s = 1.2 / d; this.x *= s; this.y *= s; this.vx *= 0.3; this.vy *= 0.3; }
  }
}
// Defaults: dotInstability 0.6, dotAuthority 3.0, dotDamping 3.4, dotNoise 0.8, dotLag 0.08
```

Top speed is about 0.9 units/s, so a lean feels like shifting a heavy marble. Impulses (a sneeze, a gust) add directly to `vx`/`vy`.

### Lean input

All devices produce one vector `u` in the unit disc, read per lane through a **driver** (section 16).

| Device | `u` |
|---|---|
| Stick | `ctx.input.moveAxis()`; set `input.gamepadDeadzone = 0.12` |
| Keyboard | WASD / arrows, smoothed (attack 0.10 s, release 0.06 s). **Hold Shift for half lean.** |
| Mouse | Pointer offset from the dial's centre ÷ `mouseLeanRadius` (70 art px), clamped. It is a force, not a target, so you still have to balance. Draw a small crosshair and a line from dial to pointer. |
| Bot | Delayed PD controller (below) |

### Bots ✔

The same bots drive classmates, attract mode and the tests:

```
each step: seen = state tau seconds ago;  d += (rand-0.5)*err*dt*6;  d *= 0.995;
           u = -kp*(seen.p - target) - kd*seen.v + d;  clamp to the unit disc
sloppy  tau .42 kp .7  kd .12 err 1.3
average tau .30 kp 1.1 kd .35 err .8
good    tau .22 kp 1.5 kd .55 err .45
expert  tau .17 kp 1.9 kd .7  err .2
```

**Measured time in ring ✔** (35 s, 40 seeds, first 2 s not counted):

| Ring radius | .40 easy | .30 normal | .22 hard | .16 brutal |
|---|---|---|---|---|
| idle | 11% | 7% | 4% | 2% |
| sloppy | 21% | 13% | 7% | 4% |
| average | 71% | 51% | 31% | 18% |
| good | 100% | 93% | 74% | 49% |
| expert | 100% | 100% | 98% | 79% |
| keyboard, average | 88% | 70% | 47% | 28% |
| mouse, average | 95% | 82% | 59% | 36% |

**Stars for Dot scores: 45 / 70 / 90.** So at ring .30, doing nothing gets no stars, an average player ★, a good one ★★★. Keep this shape if you retune; the test suite guards it (section 18).

---

## 5. Activities

### Shared flow (`src/scenes/activity/base.js`)

`intro` (camera glide, Coach's one line, a card with goal and controls for the current device) → `practice` (first time only: 8 s, unscored, "Try it.") → `countdown` → `play` → `outro` → **Results** (stars pop in one by one, score, Drips, a line chosen by activity and stars, classmates' scores) → Retry / Next / Back.

- Each activity is a scene plus a data entry in `src/data/activities.js`: id, name, station, camera, song, tunables, star thresholds, unlock day, `hard` overrides, lines.
- No fail states. Falls cost points and dignity.
- **Each activity defines its bot play for a given skill** (circling at a set speed, pressing within a timing error, heading the nearest coconut). The Dot bots in section 4 cover the balance parts. Classmates, attract mode and the tests all use it.
- Every activity must be readable within 5 seconds with no text.
- **Hard versions** apply data overrides (smaller rings, faster tempo).
- **Lanes:** Holding Still, Reps, Hoop, Header and Step run in **lane staging**, up to 4 mats in a row, each with its own driver (local, bot or ghost). Solo play puts you on the centre mat with two classmates as bots.

**Lane camera ✔ (3 mats):** `{ preset: 'fixed', position: [0, 2.3, 8.2], target: [0, 1.15, 0], fov: 30 }`, mats at x = -2.2, 0, 2.2, z = 0.8. **For 4 mats ✔:** position `[0, 3, 9.5]`, target `[0, 1, 0]`, fov 32, mats at x = -3, -1, 1, 3. Multiply the distance by `max(1, (16/9) / aspect)` so narrow windows don't clip the outer mats.

**Staging rules ✔ (found in test renders):**
- Put Coach to one side of the player, not directly behind; their silhouettes merged.
- Never draw the dial over an avatar. In 3-mat staging the sky above the player's head is empty: centre the dial at (W/2, 56), radius 44.
- Make all HUD lines at least 2 art px thick. A 1 px ring vanishes at 10 feet.

**Lean body language:** after `mixer.update(dt)`, add the Dot to the pose: `torso.rotateZ(-dot.x * 0.18); torso.rotateX(-dot.y * 0.12); pelvis.position.x += dot.x * 0.05`. Outside the ring, add a tremble. Far outside, blend to the kit's `Teeter` clip. The player should be able to read the Dot from the body alone.

### 5.1 Holding Still (Pavilion, yoga)

Coach demonstrates on a dais. You hold the pose by keeping the Dot in the ring: settle 4 s (unscored), hold, release 2 s.

| Pose | Clip | Ring | Twist | Hold | Breath |
|---|---|---|---|---|---|
| Apologetic Tree | Tree | .40 | none | 25 s | none |
| Startled Heron | Heron | .36 | slow bias wander, ±.12 on x | 25 s | none |
| Reluctant Warrior | Warrior | .32 | y noise ×1.3 | 30 s | 8 s |
| The Chair Nobody Asked For | Chair | .30 | noise ramps 1→1.5 | 30 s | 8 s |
| Tax Season | Fold | .28 | bias wander ±.18 | 30 s | 6 s |
| Plank Negotiation | Plank | .24 | inst ×1.2, tremor after 20 s | 35 s | 6 s |

- **Breath:** a bar rises and falls ("In…" / "Out…"). Hold R2 / Space / left mouse on In, release on Out. Keep a sync value `s` (0..1, smoothed), and `m.noise *= 1.25 - 0.55 * s`, so breathing well literally calms you.
- **Score:** `100 × inRing`, or `100 × (0.8 × inRing + 0.2 × breath)` when breath is on. Stars 45/70/90.
- **Juice:** chime when the Dot enters the ring, ring brightens with time inside, slow camera push-in while steady, classmates wobbling, Kevin on the rail, sunbeams, dust motes.

### 5.2 The Rep Shed (strength)

**You scrub the animation with the stick** ✔ (`action.paused = true; action.time = r * duration; mixer.update(0)`). A marker on a big vertical (or horizontal) track follows the tempo curve; you match it.

| Exercise | Clip | Input | Reps | Tempo |
|---|---|---|---|---|
| Squats of Regret | SquatRep | stick down = deeper | 10 | 3.2 s |
| Apology Lunges | LungeRep, mirrored for left | stick left/right, targets alternate | 10 | 3.2 s |
| Overhead Mortgage | Press (new) | stick up = press; `repLag` ×1.5 (heavy) | 8 | 3.6 s |

- **Target per rep:** 0→1 in 40% of the tempo, hold 15%, 1→0 in 35%, rest 10%. `r` follows the input with lag `repLag` 0.10 s.
- **Keyboard uses rate control:** S/W move `r` at the target speed, no key holds it. Otherwise keys could only slam between ends.
- **Rep quality:** `1 - 1.6 × mean|r - target|`, shown as Perfect ≥ .85, Good ≥ .65, else Wobbly. Score = mean × 100. Stars 55/75/90.
- **Fatigue:** tremor on `r`, amplitude `repFatigue × (rep/total)²`, default .10.
- **The gag:** Coach says "Last one." Then "Last one." Then "I lied. This is the last one." Every exercise runs 2 reps past its announced end.
- **Set dressing:** a gym wall with the engine's `Mirror` showing your reps (attach in `setup`, stop in `dispose`); giant dumbbells.

### 5.3 Hoop Economics (Beat Beach, aerobics)

**Circle the stick** (or the mouse, or roll W-D-S-A) to keep hoops up.

- Angular speed: from unwrapped `atan2(u)` when `|u| > .5`, smoothed .25 s. Band: `hoopLow` 0.9 to `hoopHigh` 2.4 rev/s, in the current direction.
- Lift `L`: +.35/s in band, -.25/s out of band, -.5/s wrong way. At 0 the hoop drops, and you pick it up for 1.5 s, with comment.
- 60 s: anticlockwise 25 s; "Now the other way." clockwise 25 s; either way 10 s.
- **Thrown hoops:** every ~9 s June winds up on one side, with 1.5 s of telegraph and a landing shadow. Flick `|u.x| > .7` toward that side in the last .4 s to catch it. Up to 4 hoops, each adding +0.5 to the rotation multiplier. Flicking interrupts your circling, which is the trade-off.
- Score = weighted rotations in band. Stars 35/70/110.
- **Look:** torus meshes orbiting the hips, tilt by `L`, pelvis circling, sparkles in band.

### 5.4 Step Class (Beat Beach, rhythm)

Footprints scroll to a hit line. Left foot: L1 or L2 / F or ← / left mouse button. Right foot: R1 or R2 / J or → / right mouse button.

- 104 BPM, 32 bars (about 74 s): intro 4, verse 8, chorus 8, breakdown 4, final 8. Charts are strings in data: `L.R.L.R.`.
- Windows: Perfect ±55 ms, Good ±100, OK ±140 (scale `stepWindow`). Accuracy = (P + .7G + .4O) / N. Stars 55/75/90.
- **Beat clock:** the song's step clock when audio runs (`ctx.audio.song.start` and `ctx.audio.song.parsed.stepTime`, in the audio context's time; undocumented but present in 0.46.0), otherwise game time (headless, replays). A **Step timing offset** setting covers latency.
- On pause: stop the music; on resume, count in and restart at the current bar.
- Avatars step on platforms using the kit's `StepUp` / `StepDown` or your own. Classmates dance with occasional mistakes. Confetti at combo milestones.

### 5.5 Coconut Header (Lagoon Games, balance)

Lean left and right along the sand. Dennis runs a catapult.

- Lane ±2 m solo (±0.8 m in lanes). Speed 4.5 m/s × `u.x`.
- Objects land at head height after 1.4 s with a shadow telegraph, interval 1.3 s → 0.7 s. 70% coconut (head it: +10 × combo tier), 25% flip-flop (dodge it, or -10, combo lost, .6 s daze with circling stars), 5% golden pineapple (+30).
- Combo tiers ×2/×3/×4 at 5/10/20. 60 s. Stars 150/400/800.
- Hitstop .05 s on each header. Squash the head. Coconuts fly back at Dennis, who stops being fine.

### 5.6 Slackline (Lagoon Games, balance)

A sagging line across the lagoon between giant dumbbells. Camera low behind you.

- **X is balance, forward is progress.** Push forward (`u.y > .3`) to walk at 1.1 m/s. Walking is less stable, so stopping to recover is a real choice.
- Defaults ✔ (simulated): effective instability 1.2 standing and 2.6 walking, so `m.inst = 1.2 / T.dotInstability` and `T.slackWalkInst / T.dotInstability`; `m.noise` 1.25; gusts every 6 m, `m.bx` ±1.6 for 1 s, telegraphed 1.5 s by flags and wind lines; fall at `|x| > 1`. Lock y (`dot.y = dot.vy = 0` after each step). Bots walk only while `|x| < .45`.
- Fall: 1.2 s of slow motion, splash, back to the checkpoint (0/10/20 m). Kevin lands on your head at 18 m and adds a bias until 24 m. 30 m, 75 s limit.
- Measured ✔: idle never finishes; sloppy rarely; average 38 s with 0.2 falls; good 28 s with 0 falls.
- **Stars:** ★ finish; ★★ ≤ 1 fall and under 45 s; ★★★ 0 falls and under 32 s. Score `1000 - 60 × falls - 8 × (time - 27)`.
- Sag the line under your feet (segments updated each frame). Arms out: the kit's `Tiptoe` plus T-pose arms set after the mixer, or a tuned `gaitClip`.

### 5.7 Vitamin Tray (Lagoon Games, balance)

Tilt a lacquered tray to roll coloured vitamins into matching cups. Top-down-ish fixed camera.

- **Tilt gravity, not the tray ✔:** the colliders stay flat and static; set `ctx.physics.world.gravity`; a visual `Group` tilts, with the vitamins as its children at `body.translation()`.
- **The engine's gravity is -24**, not -9.8. Use `trayGravity` 9.8 here and restore it on leaving. Max tilt 14°, driven by `u` with .12 s lag. Enable CCD on the balls.
- Cups are untagged cylinder triggers ✔ (they see dynamic bodies). 8 vitamins, 2-3 colours, 60 s. +10 correct, -3 wrong; rail gaps in later boards drop a vitamin (-1, respawns after 3 s).
- Three boards as ASCII in data (`#` wall, `.` floor, `o` start, `R`/`B`/`Y` cups). Stars at 40/60/80% of the board's maximum.

### 5.8 Island Jog (Jogging Path, aerobics)

A rail run around the whole island, the showpiece for the world. `iso` camera following, zoom about 1.4, looking slightly ahead.

- **Alternate left and right** (same inputs as Step) to build cadence (smoothed steps/s). Band 2.4-3.6 steps/s. Same side twice stumbles (-.5 s). Over 3.6 for 2 s gives a Stitch (speed ×.5 for 3 s, remark).
- Coach paces you on a white mobility scooter at exactly target speed, 3 m/s. Path about 220 m on a Catmull-Rom curve (about 75 s). More than 12 m behind, she waits, unimpressed.
- Stick X moves you ±1.5 m across the path: collect 18 water cups; dodge sprinklers, picnics, Dennis stretching, and Kevin.
- Score `70 × pace% + 30 × cups%`. Stars 55/75/90.
- Run clip: `gaitClip(HERO_RIG, { name: 'Jog', frames: 16, speed: 3, stance: .42, hip: -.04, bob: .03, lift: .1, lean: 6, sway: 2, arms: { swing: 30, elbow: 75 } })` ✔, with `action.timeScale = speed / 3`.

### 5.9 Pier Jump (Lagoon Games, balance)

Side-on (`side` preset), three attempts, three judges with paddles.

1. **Run-up (5 s):** hold the Dot in a tuck zone (`y` -.8 to -.4) to build speed 6→14 m/s.
2. **Lip:** press ✕ / Space / click as you reach it. Power `p = 1 - |Δt| / .25`.
3. **Flight (3-4 s):** `m.inst` 3, ring .45; staying in the ring carries you farther.
4. **Cannonball:** press in the last .5 s for style points. Splash: hitstop .1 s, `timeScale` .25 for .8 s, huge particles, ripples, shake.

Distance = `speed × (.8 + .6p) × (.6 + .4 × ringFrac) × 2.14` m. Stars at 18/28/38 m on the best attempt. Judges react.

### 5.10 The Long Stand (finale, Day 7)

The plaza at golden hour, everyone watching. Stillness scoring with this data timeline; no way to fail:

| t (s) | Event | Effect |
|---|---|---|
| 0 | Coach: "Stand." | ring .40 |
| 10 | Kevin lands on your head | bias x +.10 |
| 20 | Dennis sneezes | impulse y -.6 |
| 30 | | ring .34 |
| 35 | Light rain (`Precipitation`) | noise ×1.2 |
| 45 | Marguerite applauds, slowly | Ounce: "Ignore her." |
| 50 | | ring .28 |
| 55 | June: "Are you nearly done?" | text drifts across the dial |
| 65 | Kettlebell Volcano rumbles | shake, random impulse |
| 75 | Rain stops, sun out, music swells | ring .24 |
| 85 | Kevin leaves | bias off, impulse |
| 90 | Coach: "You may blink." | end |

Then the confession and ending, played with a `Timeline` (section 13). At 0★: "You stood. Sort of."

---

## 6. Weigh-In and Wobble Age

Your avatar steps onto Ounce ("Ow." every time; the delivery varies). Close-up, huge dial, tiny animated needle.

| Test | Rules (12-15 s) | Result T (0..1) |
|---|---|---|
| Stillness | Ring .30. Dot and ring fade after 3 s: "Eyes closed." | in-ring fraction |
| Lean | Three targets ("70% left"). Reach and hold ±.1 for 1.5 s each. | based on time |
| Chase | Follow a slow target on a Lissajous path | 1 - mean distance × 2 |

Then one question (section 8), then the reveal: the needle spins, the number rolls, Ounce remarks.

```
true  = round(20 + 60 × (1 - mean(last 3 T))) - min(20, totalStars × 0.5), clamped to 18..95
shown = true + 7 until the confession, then true
```

The chart draws 7 points. At the confession every point animates down by 7. Test it: an expert bot ends lower than an average one, an idle bot stays high, and the confession subtracts exactly 7.

---

## 7. The island hub

`iso` camera ✔ (`{ preset: 'iso', zoom: 1.15 }`) with `PlatformerCharacter` and the kit's full moveset. Jumping and waving have no purpose and should still be there. Island about 44 × 34 m. The top of the screen is -x, -z: **put tall things in that quadrant** so they never hide the player.

| Place | Near (x, z) | Purpose |
|---|---|---|
| Weigh-In Terrace | (0, 3) | Day start, Ounce's dais |
| Pavilion of Holding Still | (-11, 3), sky-blue roof | Poses |
| The Rep Shed | (11, 3), orange roof | Reps |
| Beat Beach | (12, -10), on sand | Hoop, Step |
| Lagoon Games | (-12, -10), pier | Header, Slackline, Tray, Pier Jump |
| Jogging Path gate | (0, 11) | Island Jog |
| Sweat Jar | (4, -4) | Drips, milestones |
| Locker Room | (-4, -4) | Avatar |
| Hall of Numbers | (0, -8) | Records, chart, calendar |
| Hammock between palms | (14, 10) | End the day |
| Scenery | | Kettlebell Volcano (-15, -14), Foam Roller Hills (15, -14), Dumbbell Bridge over an inlet, medicine balls, gulls (`Boids`) overhead |

- **Interaction:** a trigger shows `[✕] Enter: Pavilion of Holding Still`. Confirm opens a station menu: activities with stars and best score, locked rows greyed with the unlock day, one remark.
- **Mouse:** hovering a station highlights it and names it; clicking walks there and enters; clicking ground walks there (pointer ray via `camera.rayAt`, then `castRay`). Steer the hero by writing its `MoveInput.move`.
- **HUD:** day top-left, Drips top-right, today's prescription under the day, prompts bottom. Nothing else.
- **Ounce** hops after you (`Squash`, tween) and barks at most every 6 s.
- **Life:** classmates around the island doing small loops (stretching, sitting, failing).

---

## 8. Writing

**Voice:** short declarative sentences. Polite, clinical, caring, faintly wounding. A remark should sound like it came from a nurse who has read your file. Understatement over exclamation. Numbers delivered gently. Humour comes from what is implied. No sarcasm tags, no memes, no pop-culture references, no swearing. Respect the taste rule in section 1.

**Format:** at most 3 lines of 52 characters. Write at least 120 lines beyond the samples: every activity needs lines for 0/1/2/3★, first time and repeat; plus barks for ring entry and exit, falls and streaks.

**Samples, in voice. Use them, then write more like them.**

*Ounce:*
- "Hello! I'm Ounce. Please step on me." / "Ow." / "That was a joke. I can't feel pain. I can only keep records."
- "How old do you feel? This is not binding."
- "Your Wobble Age is 68. Is that close? No? I'm so sorry."
- "Thank you. I have written that down."
- "You wobbled 14 times. I only counted the ones you noticed."
- "Your left side is doing very well. I'll let your right side know."
- "No change since yesterday. Which is, in a way, consistent."
- "Excellent! ...Compared to Dennis."
- "I'm not angry. Scales don't get angry. We get accurate."
- "Have you been stretching? Please don't lie. I'm very sensitive."
- "Today's concern: your ankles. I've been concerned all night."
- "Good morning. You look rested. I can't see. But you felt rested."
- "Kevin has been with us eleven years. He has never once held a pose."
- "This is a recording. The person in it is doing better than you." *(attract mode)*
- "I have been adding seven. To everyone. For years. It felt motivating."
- "See you tomorrow. Bring your knees."

*Coach Plumb:*
- "You are a tree. A tree does not check its phone."
- "Your left knee has wandered off. Please collect it."
- "Breathe in. Not like that."
- "Good. Again. That was also good. Again."
- "Hold. You may blink on Thursday."
- "I am eighty-one. I say this so that you feel something."
- "Stillness is a muscle. So is regret. We train both here."
- "The floor is your friend. It has never once let go."

*Classmates:*
- Marguerite: "Both hips, new. Knee, new. Opinions, original."
- Dennis: "I used to do this professionally. Not this. Something near it."
- Dennis: "It's fine. It's just the one leg."
- June: "I'm pacing myself."
- June: "My gran says you're doing your best. She said it very slowly."

**Morning questions** (three answers; they change only the remark, and Ounce files them):
- When you stand up, what sound do you make? *Oof. / Hnng. / I have become the sound.*
- Have you ever apologised to a chair? *Yes. / Not yet. / It started it.*
- How many stairs is too many? *One. / All of them. / Depends who's watching.*
- How do you feel about your ankles? *Fine. / We don't speak. / Which ones?*
- What is your relationship with the floor? *Distant. / Improving. / It's complicated.*
- If your knees could talk, what would they say? *Please. / Why. / Nothing. They've given up.*
- Day 7: Are you happy? *Yes. / No. / Is this graded?* → "It's all graded."

---

## 9. UI and UX: 10 feet, controller first

**One UI for every device: the pixel HUD.** No DOM menus; same screens for pad, keyboard and mouse. Build a small kit in `src/ui/`.

### Layout rules

- **Use `aspect: 'fill'` ✔.** It removes letterboxing at every window size (`adaptive` gives thick black borders at 1280×720). Art size then varies: 480×270 at 1080p and 4K, 427×240 at 720p, 640×360 in a small frame, 400×300 at 800×600. **Lay out from `hud.width` and `hud.height` with anchors**, never fixed coordinates. Keep a 12 art px safe margin.
- **Pointer to art pixels ✔:** `ax = (p.x + 1) / 2 * hud.width; ay = (1 - p.y) / 2 * hud.height`. The HUD canvas ignores pointer events, and its rect equals the game canvas's.
- **Text:** the 5×7 font at scale 1 is 20×28 px at 1080p, the minimum. Scale 2 for menu rows and headings, 3-4 for the title and big numbers.
- **No dense screens:** at most 8 menu rows; at most 3 lines of dialogue; one idea per screen; one activity per records page. Page rather than scroll, wherever you can.

### Mixed-case text ✔

The engine font is capitals only, which is wrong for this voice. Draw lowercase through `hud.sprite`, everything else through `hud.text`, on a 6 px grid. This table and function rendered correctly; use them:

```js
// src/ui/font.js. Rows top to bottom, 5 bits, bit 4 = left. Rows 7-8 are descenders.
const H = {
a:'00 00 0e 01 0f 11 0f 00 00', b:'10 10 1e 11 11 11 1e 00 00', c:'00 00 0e 11 10 11 0e 00 00', d:'01 01 0f 11 11 11 0f 00 00',
e:'00 00 0e 11 1f 10 0e 00 00', f:'06 09 08 1c 08 08 08 00 00', g:'00 00 0f 11 11 11 0f 01 0e', h:'10 10 1e 11 11 11 11 00 00',
i:'04 00 0c 04 04 04 0e 00 00', j:'02 00 06 02 02 02 02 12 0c', k:'10 10 12 14 18 14 12 00 00', l:'0c 04 04 04 04 04 0e 00 00',
m:'00 00 1a 15 15 15 15 00 00', n:'00 00 1e 11 11 11 11 00 00', o:'00 00 0e 11 11 11 0e 00 00', p:'00 00 1e 11 11 11 1e 10 10',
q:'00 00 0f 11 11 11 0f 01 01', r:'00 00 16 19 10 10 10 00 00', s:'00 00 0f 10 0e 01 1e 00 00', t:'08 08 1c 08 08 09 06 00 00',
u:'00 00 11 11 11 13 0d 00 00', v:'00 00 11 11 11 0a 04 00 00', w:'00 00 11 11 15 15 0a 00 00', x:'00 00 11 0a 04 0a 11 00 00',
y:'00 00 11 11 11 11 0f 01 0e', z:'00 00 1f 02 04 08 1f 00 00' };
export const GLYPHS = Object.fromEntries(Object.entries(H).map(([k, v]) => [k, v.split(' ').map((h) => parseInt(h, 16).toString(2).padStart(5, '0').replace(/0/g, '.').replace(/1/g, 'o'))]));
export function say(hud, x, y, text, { color = 'white', shadow = 'ink', scale = 1 } = {}) {
  for (const ch of text) {
    const g = GLYPHS[ch];
    if (g) hud.sprite(x, y, g, { o: color }, { scale, shadow });
    else if (ch !== ' ') hud.text(x, y, ch, { color, shadow, scale });
    x += 6 * scale;
  }
  return x;
}
```

Add a measuring and word-wrapping helper. Replace any character the font lacks with `?` (hub names can hold anything); a test checks all game text has glyphs.

### Input map

Remap once at boot ✔: `ctx.input.gamepadButtons = { 0:'PadCross', 1:'PadCircle', 2:'PadSquare', 3:'PadTriangle', 4:'PadL1', 5:'PadR1', 6:'PadL2', 7:'PadR2', 8:'PadCreate', 9:'PadOptions', 10:'PadL3', 11:'PadR3', 12:'PadUp', 13:'PadDown', 14:'PadLeft', 15:'PadRight' }`. Pad buttons then appear in `isDown`, `wasPressed`, `state().held` and recordings. Keep one action table in `src/core/actions.js`.

| Action | DualSense (Xbox glyph) | Keyboard | Mouse |
|---|---|---|---|
| Lean | Left stick | WASD / arrows; Shift = half | Pointer offset from dial |
| Confirm | ✕ (A) | Enter, Space, E | Left click on the item |
| Back | ○ (B) | Esc, Backspace | Right click |
| Pause | Options (Menu) | Esc, P | Pause icon, top right, shown while the mouse moves |
| Breath, hold | R2 (RT) or ✕ (A) | Space | Hold left button |
| Left / right foot | L1 or L2 / R1 or R2 (LB or LT / RB or RT) | F or ← / J or → | Left / right button |
| Tabs | L1 / R1 (LB / RB) | Q / E | Wheel, or click the tab |
| Hub: jump, wave, sit | ✕, △, □ (A, Y, X) | Space, V, B | Click to walk |

- **Hero wrapper ✔:** call `readMoveInput(ctx, hero, input)`, then OR in `PadCross` (`consumePress` → `input.jump`, `isDown` → `input.jumpHeld`) and the same for wave and sit. In the hub ✕ interacts when a prompt is showing, otherwise jumps.
- **Menus** read the d-pad, stick (with repeat), arrows and WASD. Hover moves focus; left click confirms; a wheel scrolls lists; sliders drag.
- **Keep the mouse native:** the Dot follows the mouse as soon as the mouse moves, and goes back to stick or keys as soon as those are used.
- **Respect the hub's chord:** ignore Options while Create is held.

### Prompts and glyphs

- Prompts always read `[glyph] verb` and follow the **last device used**. Track it in `src/core/device.js` from `ctx.input`: `held`/`queuedPresses` starting `Pad` or a stick past .3 means pad; `Mouse*` or pointer movement means mouse; anything else means keyboard. Add guarded DOM `keydown`/`pointerdown`/`wheel` listeners for "press any button" and for exiting attract.
- **Glyph sprites, drawn by you in `src/art/glyphs.js`:** PlayStation shapes ✕ ○ □ △ in their colours, L1 R1 L2 R2, Options, sticks. Xbox A B X Y (a Settings option), LB RB LT RT, Menu. Keycaps with the letter. A mouse with the used button lit.

### Screens

- **Dialogue box:** bottom strip, white; speaker name in teal; typewriter at about 40 cps, in sync with voice syllables; ✕ completes, then advances; hold to skip fast. Ounce gets a small dial portrait with a mood needle.
- **Results, station menu, Hall of Numbers, Locker Room, Sweat Jar, Report:** one focal element each, big numbers, 1-2 lines of comment.
- **Locker Room:** on a turntable; skin (sand, orange, red, plum), hair style and colour, top, bottom, headband, jar unlocks.
- **Name entry:** letter grid (stick, d-pad, click) plus direct typing, 8 characters max.

### Pause menu

`engine.timeScale = 0` ✔ freezes physics, `fixedUpdate` and game time while `update` still runs and `wasPressed` still works. Menus therefore read input in `update`. Don't use `engine.paused` for this.

Resume / Restart activity / Back to the island / Settings / How to play / About & Credits / **Dev Tools**. In a session: Resume and Settings only, and nothing freezes.

### Settings (own HUD menu, not the engine panel)

Music volume (**default 10%**), SFX, Voice, Button glyphs (PlayStation / Xbox), Gentle Mode (rings ×1.25, noise ×.8), Mouse lean radius, Step timing offset, Reduce flashes, Look (Default, `storybook`, `arcade`, `handheld`), Pixel size (`engine.settings.set({ look, pixelSize })`), Fullscreen, Reset to defaults.

### Touch-only devices

Detect ✔ `matchMedia('(hover: none) and (pointer: coarse)')` with no gamepad. Start with `touch: false` always, and `settings: { button: 'top-right' }` only on such devices (otherwise `button: false`). ✔ The ⚙ appears and a tap opens the engine's panel. Show over the title: **"Controller or keyboard required"**, wrapped: a portrait phone's art is as narrow as 168 px wide. Attract runs and loops. A tap returns to the title message and the 10 s timer restarts. If a pad connects or a key is pressed, drop the message and play normally.

---

## 10. Dev mode

Reached from the pause menu, not in sessions. 10-foot legible and fully controller-driven. Tabs with L1/R1.

**Sliders (live, each read by the code every step; registry in `src/core/tunables.js`):**

| Tab | Variables, with defaults |
|---|---|
| Balance | dotInstability .6, dotAuthority 3, dotDamping 3.4, dotNoise .8, dotLag .08, ringScale 1, gustForce 1.6, mouseLeanRadius 70 |
| Breath and reps | breathBonus .55, repLag .10, repFatigue .10, repTempoScale 1 |
| Rhythm | stepWindow 1, stepOffsetMs 0, hoopLow .9, hoopHigh 2.4, hoopLiftRate .35 |
| Games | headerInterval 1.0, slackWalkInst 2.6, trayGravity 9.8, trayMaxTilt 14, jogTargetCadence 3, pierBoost 2.14 |
| Economy | dripRate 1, starThresholdScale 1, ageTrainingWeight .5 |

Each slider shows its value and default. **One button resets the tab, one resets everything.** Export prints the changed values as JSON to the console and copies them if allowed, so a designer can paste them into `src/data/`.

**Tools tab:** go to day 1-7; jump to any activity or scene; finish the current activity with 0-3★; give 50 Drips; unlock all; autopilot (bot skill picker); god mode (Dot can't leave the ring); time scale .25-3; overlay (scene, state, Dot, ring, fps, last device); hide HUD; free camera (`engine.setCamera({ preset: 'free' }, { syncUrl: false })`); dialogue tester (any line, with voice); sound test (every song, SFX, speaker); animation viewer (every clip on an avatar); reset save.

---

## 11. Attract mode

After **10 seconds with no input on the title or any menu screen**, start a looping demo:

- **Playlist:** Hub walk → Holding Still → Hoop → Header → Step → Slackline → Tray → Pier Jump → Jog → Long Stand excerpt, about 14 s each, with iris transitions. Cover every activity and feature family.
- It runs the **real scenes** with expert bot drivers and cheats (ring ×2, god mode). Banner: {TITLE}, "Press any button." plus Ounce's subtitles ("This is a recording...").
- **Any input exits**: key, click, mouse move past a few pixels, wheel, pad button or stick, touch. You return to the title and the timer re-arms.
- Not in a session, not during play, not on the pause menu.

---

## 12. Multiplayer

**Reading of the brief:** the hub protocol is how the game plays online; on its own the game has no server, so it plays alone or on one screen. Both run the same round, **The Medley**, and the same lane code. Nothing else connects to a network.

### The Medley

Three events in fixed windows: Stillness (a pose), then Beat (Reps or Hoop or Step), then Balance-lean (Header), each 55 s with 10 s between, about 3.2 minutes. The specific picks and shortened durations live in `src/data/medley.js`, and the picks come from a seeded stream. Each event normalises to 0-1000; the total wins. Results show medals, awards ("Stillest", "Most Apologetic") and Ounce's remarks.

### On its own: Family Hour

Join screen: **each device claims a mat by pressing Cross/Enter** (up to 4 pads plus keyboard-and-mouse). Bots can fill empty mats (toggle).

**The engine merges all pads into one** ✔, so lanes read `navigator.getGamepads()` by index themselves (`applyDeadzone` is exported; guard for Node). In 4-mat staging, each player gets a small dial (radius 24) above their avatar's head. Podium, rematch.

### In AI Hub: ghost mode

Passed 16/16 with the real engine on WebGPU ✔ at players=1, 2, 4 (latency, jitter, loss) and host-leave.

```html
<meta charset="utf-8">
<script>/* session.js pasted unmodified: first script, right after charset */</script>
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-goal" content="Score the most across three events. Stay in the circle.">
<meta name="hub:session-howto" content="Left stick, WASD or mouse: lean. R2, Space or click: breathe. L1/R1, F/J: step.">
<meta name="hub:session-minutes" content="4">
<meta name="hub:webgpu" content="required">
```

Boot order ✔:

```js
let info = null;
if (window.AIHub?.active) info = await AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true });
const engine = await Engine.start(firstScene, withUrlOptions({ /* ... */ seed: info ? info.seed : savedOrDefaultSeed }));
if (info) AIHub.ready();                 // no key press, as soon as the card can show
```

If `connect()` answers null, carry on as the normal game. Without WebGPU, `Engine.start` rejects and the engine prints "Failed to start: WebGPU unavailable: ..." on the page ✔. Catch the rejection, or it also surfaces as a page error ✔, and call `AIHub.fail(message)` in a session.

**In a session:**
- **The card (`card: true`)** is the game's own: the players' avatars lining up on mats in seat colours (`#e8443a #3b82f6 #22c55e #f5b700`), {TITLE}, ready ticks, how to win, the controls for the last device, the time left from the `card` event. Enter or Cross → `AIHub.answer('ready')`; Triangle or M → `AIHub.answer('more')`. Use a **direct `keydown` listener for Enter** ✔ here. No menus. Cosmetic randomness only from `AIHub.rng('card')`.
- **Start:** on `start` show a countdown from `AIHub.time()`; play at `time() >= 0`. Event windows are read from `AIHub.time()`, so all copies stay in step.
- **Same world:** gusts, pose picks and object waves come from `AIHub.rng(label)` or the seeded `ctx.random`.
- **Ghosts:** a `setInterval` at 100 ms (not tied to rendering) sends `AIHub.send({ a: eventIndex, x, y, c: clipIndex, t: clipTime, s: score }, { reliable: false })` and calls `AIHub.progress({ score, label })`. Start as soon as `start` arrives, even with score 0: the harness needs both within seconds. Receivers lerp the other mats; they never simulate them, and they hide a ghost whose `a` differs from theirs.
- **`leave`:** that avatar waves and walks off. The round goes on, host included.
- **End:** `AIHub.result({ score, stats, awards })` once, at the end of the Medley or at once on `time-up`. On `end`: stop input, stop sound, send nothing.
- **Never:** no title, attract, dev mode, saves, quit or restart; no chat or custom names; no `alert`, `window.open` or navigation. Names come from `info.players` and are drawn with `say()`.

---

## 13. Art direction

**Base: the engine's native look**, default pixel pipeline, toon materials, 16-colour palette (`look` left unset). The scene reads clean and bright: white, mist, sky and cyan, with lime and sand for growth and warmth, orange and red as accents. Start with `quality: 'high'` (`'medium'` in sessions, where several copies may share a machine in testing).

**Performance is out of scope.** Add the detail the scene wants and don't spend time on optimisation.

### Avatars ✔

Re-dress the kit's hero with the same rig. This is proven to look good at gameplay framing: egg heads, dot eyes, hair caps. Use `castShadow: false` plus `ContactShadow` ✔: casting on the model gave ugly self-shadow blotches. The hero's `Eyes` mesh reads as sunglasses, so hide it. Compile clips once and share them between avatars.

```js
function soften(mesh, kind = 'prism') { // same bounding box, softer shape
  mesh.geometry.computeBoundingBox();
  const b = mesh.geometry.boundingBox, s = b.getSize(new Vector3()), c = b.getCenter(new Vector3());
  const g = kind === 'egg' ? new SphereGeometry(0.5, 10, 8) : new CylinderGeometry(0.5, 0.5, 1, 8);
  g.scale(s.x, s.y, s.z); g.translate(c.x, c.y, c.z); mesh.geometry = g;
}
export function dress(root, look) { // look: { skin, top, bottom, shoe, hair, long?, bun?, headband? } as palette names
  const hide = new Set(['Moustache', 'ButtonR', 'ButtonL', 'Hat', 'Brim', 'Eyes', 'Nose']);
  const SLOT = { Overalls: 'bottom', ThighR: 'bottom', ThighL: 'bottom', ShinR_Mesh: look.long ? 'bottom' : 'skin', ShinL_Mesh: look.long ? 'bottom' : 'skin',
    Shirt: 'top', SleeveR: 'top', SleeveL: 'top', ForearmR_Mesh: look.long ? 'top' : 'skin', ForearmL_Mesh: look.long ? 'top' : 'skin',
    GloveR: 'skin', GloveL: 'skin', Face: 'skin', ShoeR: 'shoe', ShoeL: 'shoe' };
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (hide.has(o.name)) { o.visible = false; return; }
    if (SLOT[o.name]) o.material = toonMaterial(PALETTE[look[SLOT[o.name]]]);
    if (o.name === 'Face') soften(o, 'egg'); else if (/Sleeve|Forearm|Thigh|Shin|Glove/.test(o.name)) soften(o);
  });
  const face = root.getObjectByName('Face'); face.geometry.computeBoundingBox();
  const fb = face.geometry.boundingBox, size = fb.getSize(new Vector3()), c = fb.getCenter(new Vector3());
  const add = (m, x, y, z) => { m.position.set(x, y, z); face.parent.add(m); return m; };
  for (const sx of [-1, 1]) add(new Mesh(new BoxGeometry(0.055, 0.09, 0.03), toonMaterial(PALETTE.ink)), c.x + sx * size.x * 0.2, c.y + 0.02, c.z + size.z * 0.48);
  add(new Mesh(new BoxGeometry(0.1, 0.022, 0.03), toonMaterial(PALETTE.ink)), c.x, c.y - size.y * 0.2, c.z + size.z * 0.47);
  const hair = add(new Mesh(new SphereGeometry(0.5, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), toonMaterial(PALETTE[look.hair])), c.x, c.y + size.y * 0.04, c.z - size.z * 0.05);
  hair.scale.set(size.x * 1.08, size.y * 1.04, size.z * 1.08);
  if (look.bun) add(new Mesh(new SphereGeometry(0.1, 8, 6), toonMaterial(PALETTE[look.hair])), c.x, c.y + size.y * 0.6, c.z - size.z * 0.2);
  if (look.headband) { const b2 = add(new Mesh(new CylinderGeometry(0.5, 0.5, 1, 10), toonMaterial(PALETTE[look.headband])), c.x, c.y + size.y * 0.16, c.z); b2.scale.set(size.x * 1.06, 0.06, size.z * 1.06); }
}
```

Add more hair shapes as extra meshes on the head. Good casting: player `{ skin:'sand', top:'white', bottom:'sky', shoe:'white', hair:'ink', headband:'red' }`; Coach `{ skin:'sand', top:'cyan', bottom:'cyan', shoe:'white', hair:'mist', bun:true, long:true }`, plus a plumb bob on a string (`SpringChain`) from her wrist.

### Ounce ✔ (zero problems, zero warnings on the model sheet)

```js
export const ounce = model({
  id: 'ounce', about: 'Ounce: a mint retro bathroom scale whose round dial is its face', tags: ['character'], size: [1.1, 1.05, 1.1],
  palette: { body: 'cyan', base: 'teal', tread: 'sky', face: 'white', rim: 'slate', tick: 'mist', needle: 'red', eye: 'ink' },
  parts: [
    { name: 'base', box: [1.04, 0.08, 1.04], at: [0, 0.04, 0], c: 'base' },
    { name: 'plate', box: [0.96, 0.2, 0.96], at: [0, 0.18, 0], c: 'body' },
    { mirror: [{ name: 'tread', box: [0.3, 0.03, 0.42], at: [0.22, 0.295, -0.22], c: 'tread' }], axis: 'x' },
    { group: [
        { name: 'neck', box: [0.5, 0.42, 0.14], at: [0, 0.21, 0], c: 'body' },
        { group: [
            { name: 'rim', cyl: [0.78, 0.1, 0.78], at: [0, 0, 0], c: 'rim', seg: 14 },
            { name: 'dial', cyl: [0.66, 0.04, 0.66], at: [0, 0.06, 0], c: 'face', seg: 14 },
            ...[-60, -30, 0, 30, 60].map((a) => ({ box: [0.06, 0.03, 0.09], at: [Math.sin(a * Math.PI / 180) * 0.26, 0.085, -Math.cos(a * Math.PI / 180) * 0.26], rot: [0, -a, 0], c: 'tick' })),
            { mirror: [{ name: 'eye', box: [0.08, 0.03, 0.11], at: [0.12, 0.09, -0.07], c: 'eye' }], axis: 'x' },
            { group: [{ name: 'needleBar', box: [0.06, 0.03, 0.22], at: [0, 0, 0.1], c: 'needle' }, { name: 'hub', cyl: [0.07, 0.04, 0.07], at: [0, 0, 0], c: 'needle', seg: 8 }], name: 'needle', pivot: true, at: [0, 0.1, 0.1], rot: [0, 180, 0] },
          ], name: 'face', pivot: true, at: [0, 0.5, 0.08], rot: [72, 0, 0] },
      ], name: 'head', pivot: true, at: [0, 0.26, 0.2] },
  ],
});
```

Pivots stay movable: `build.object.getObjectByName('needle')` for mood, `'face'` for nods. Scale Ounce ×1.4 on the island and frame close in Weigh-In. Squash on hops.

### Models to write as data (`src/art/models.js`; check each with `node check.mjs --sheets src/art/models.js`)

Kettlebell Volcano ✔ (`ball [12,9,12]`, `torus` handle, glowing top), Foam Roller Hill ✔ (a big `cyl` on its side with bands), Dumbbell Bridge ✔, medicine ball ✔, Pavilion ✔ (columns, `cone` roof, recolour per station), Sweat Jar ✔ (`{ lathe: [[.85,0],[.95,.1],[.95,2.1],[.75,2.4],[.75,2.55]], at: [0,.3,0], seg: 12 }` for the glass, plus plinth, lid and label; **toon materials are opaque, so fake the fluid**: a `sky` cylinder 1 cm wider than the wall, scaled in y with Drips, with a white highlight stripe), Rep Shed, Beat Stage with speakers, pier with railings, palm (`tube` trunk, fronds; the library has none), yoga mat, step platform, hoop (`torus`), coconut, flip-flop, golden pineapple, catapult, tray and cups, vitamin, slackline anchors, hammock, lockers, Hall of Numbers board, judges' paddles, mobility scooter, ferry, water cup, sprinkler, Kevin (body, wings, feet, with a two-pose flap).

From the library, generic props are fine: `fountain`, `bench`, `lamp-post`, `bush`, `flowers`, `oak`, `fence`, `signpost`, `table`.

### Surfaces and scene effects

- **Tile floor ✔:** `textureDef({ id:'clinic-tile', size:[16,16], tile:true, palette:{ grout:'mist', a:'white', b:'white' }, layers:[{ pattern:'tiles', colors:['grout','a','b'], w:16, h:16, mortar:1, seed:3 }], about:'...', tags:['floor'] })`, added to `TEXTURE_LIBRARY`. **Never stretch a map over a box ✔** (it gave one giant tile): use a `PlaneGeometry` and scale its UVs by metres ÷ (16 / `DEFAULT_TEXEL`), as the kit's market example does.
- **World:** `WaterSurface` ✔, `GrassField` ✔, sand and lawn as flat boxes ✔, `RippleField` at splashes, `Precipitation` in the finale, `Boids` gulls, `Decals` footprints on sand.
- **Light:** `ctx.lights` for pavilion lanterns at dusk; `applySky(skyAt(h))` for morning and evening.
- **Game feel:** `hitstop`, `shake`, `screen.flash`, `screen.shockwave` on the splash, iris transitions (`screen.cover`/`reveal` ✔, also resolve headless), `Trail` behind the jogger, custom particles ('sweat' in cyan, 'confetti', 'splash', 'zen' motes).
- **Cutscenes:** ferry arrival, confession and ending with `Timeline` ✔. On the `fixed` preset, apply `tl.camera()` each frame to `ctx.camera.camera` (position, `lookAt`, fov, `updateProjectionMatrix`) ✔. Use `tl.line()` for subtitles, `tl.bars()` for letterbox.

---

## 14. Animation

Use the engine's native system: `ClipDef` data, `compileClips`, `THREE.AnimationMixer` for class avatars, `PlatformerCharacter` on the island, procedural layers (`Squash`, `SpringChain`) for character.

**Conventions** (`HERO_RIG`): facing +Z. Arm X: -90 ahead, -180 overhead. Arm Z: out to the side (R negative, L positive). Forearm -X bends the elbow. Leg -X swings forward. Shin +X bends the knee. Foot +X points the toes. Pelvis `p` offsets, `r` tips the whole body. Torso +X bends forward.

**Verified poses ✔** (`validateClip` clean, `analyzeClip` no problems, reviewed on contact sheets):

```js
const hold = (name, pose) => ({ name, frames: 60, loop: true, keys: [[0, pose], [60, pose]] });
const feet = (pose, R, L) => placeFeet(pose, HERO_RIG, { R, L });
hold('Tree', { Pelvis: { p: [0.03, -0.02, 0] }, ArmR: [-172, 0, -6], ForearmR: [-14, 0, 0], ArmL: [-172, 0, 6], ForearmL: [-14, 0, 0], LegR: [-62, 0, -58], ShinR: [150, 0, 0], FootR: [30, 0, 0] });
hold('Heron', { Pelvis: { p: [0, -0.02, 0] }, Torso: [10, 0, 0], Head: [-14, 0, 0], ArmR: [-20, 0, -80], ArmL: [-20, 0, 80], ForearmR: [-30, 0, 0], ForearmL: [-30, 0, 0], LegR: [-85, 0, 0], ShinR: [95, 0, 0], FootR: [35, 0, 0] });
hold('Warrior', feet({ Pelvis: { p: [0, -0.2, 0] }, Torso: [0, 25, 0], Head: [0, 40, 0], ArmR: [0, 0, -90], ArmL: [0, 0, 90] }, { z: 0.38 }, { z: -0.38 }));
hold('Chair', feet({ Pelvis: { p: [0, -0.28, -0.06] }, Torso: [24, 0, 0], Head: [-18, 0, 0], ArmR: [-110, 0, -8], ArmL: [-110, 0, 8] }, { z: 0 }, { z: 0 }));
hold('Fold', feet({ Pelvis: { p: [0, -0.03, -0.03] }, Torso: [88, 0, 0], Head: [10, 0, 0], ArmR: [-70, 0, -6], ArmL: [-70, 0, 6], ForearmR: [-8, 0, 0], ForearmL: [-8, 0, 0] }, { z: 0 }, { z: 0 }));
hold('Plank', { Pelvis: { r: [66, 0, 0], p: [0, -0.2, 0] }, Head: [-48, 0, 0], ArmR: [-63, 0, -5], ArmL: [-63, 0, 5], HandR: [-40, 0, 0], HandL: [-40, 0, 0], FootR: [55, 0, 0], FootL: [55, 0, 0] });
// Scrubbed reps: keys built with placeFeet AND a feet track, or the sole dips through the floor mid-clip.
const squatTop = { Pelvis: { p: [0, -0.02, 0] }, Torso: [2, 0, 0], ArmR: [6, 0, -9], ArmL: [6, 0, 9] }, squatLow = { Pelvis: { p: [0, -0.3, -0.05] }, Torso: [26, 0, 0], Head: [-20, 0, 0], ArmR: [-85, 0, -8], ArmL: [-85, 0, 8] };
({ name: 'SquatRep', frames: 30, grounded: true, keys: [[0, feet(squatTop, { z: 0 }, { z: 0 })], [30, feet(squatLow, { z: 0 }, { z: 0 })]], feet: [[0, { R: { z: 0 }, L: { z: 0 } }], [30, { R: { z: 0 }, L: { z: 0 } }]] });
// LungeRep: the same way, low pose Pelvis p [0,-0.24,0], Torso [6,0,0], goals R { z: .34 }, L { z: -.32, pitch: 25, pivot: 'ball' }. For the left side, map poses through mirror(pose, HERO_RIG) and swap R and L goals.
```

**Still to author:** Press; StepL/StepR; header nod; flail; daze; bow; slow clap; sneeze; Coach's point and demonstration transitions; tuck and cannonball; judge raising a paddle; stepping onto Ounce; ferry disembark. Reuse kit clips: `Idle`, `Walk`, `Run`, `Sit`, `LieIdle`, `Wave`, `Victory`, `Teeter`, `Hurt`, `Fall`, `GetUp`, and more (`HERO_CLIPS`).

**Preview without a GPU ✔:** `tools/clip-sheet.mjs` uses `renderSheet(model, HERO_RIG, def, clip, { frames, views: ['front', 'side'], scale: 90, trails: false, skeleton: false })` → `{ width, height, data }`, written as a PNG with `node:zlib` (`deflateSync`, `crc32`). Look at every new pose once. Hide the hat and moustache first so you judge the real silhouette.

---

## 15. Audio

Everything is written in code. No audio files.

### Music

- **`ctx.audio.setVolume('music', savedMusic ?? 0.10)` at boot, every boot**, from your own settings key. The engine's default is 60%, and its stored volume key (`pixel-engine:audio`) is shared by every engine game on the origin, so don't rely on it.
- **Write instruments loud:** track `volume` 0.45-0.8. The kit's examples use about 0.12, written for a 60% bus; at 10% × master .8 that is near silence. A test checks each song: sum of track volumes × 0.1 × 0.8 ≥ 0.03.
- Songs are `Song` data, in `src/audio/songs.js`, each original, none imitating the source:

| Song | Feel |
|---|---|
| Title / Plaza | gentle waiting-room bossa, about 92 BPM, soft triangle plucks |
| Holding Still | slow, sparse, breath-paced, 60 BPM |
| Rep Shed | light funk bass, 110 BPM |
| Beat Beach (Hoop) and Step Class | bright, four-on-the-floor; Step is 104 BPM exactly |
| Lagoon Games | staccato ukulele feel, 120 BPM |
| Jog | steady, cheerful, 112 BPM |
| Evening Report | music box, 70 BPM |
| Long Stand | near silence, then one swelling chord line at t = 75 |

### SFX

`ctx.audio.register` data: needle tick, ring chime in/out, wobble warning, rep tick, step perfect/good, combo, coconut bonk, flip-flop thwap, hoop whirr (`loop`), splash, gust, gull squawk, jar drip, star pop, menu move/confirm/back, "Ow" stinger.

### Voices: Animalese/Simlish gibberish

Build in `src/audio/voice.js`:

1. **`syllabify(text, speaker)` is pure and testable in Node.** Words split into syllables; a hash of each word picks consonant class and vowel, so **the same word always sounds the same**. Output: `[{ t, dur, f0, vowel, cons, charIndex }]`. Declination -15% across a sentence; `?` rises 25% at the end; `!` +15%; `...` slows. The dialogue typewriter reads `charIndex`.
2. **`renderVoice(ctx, destination, syllables, when)`** schedules, per syllable: a saw oscillator at `f0` through two parallel bandpass filters at the vowel's formants (a 800/1200, e 500/1900, i 300/2300, o 500/900, u 350/800, × speaker shift), gain envelope 6 ms up, 30 ms down; a noise burst for plosives (8 ms) and fricatives (40 ms).
3. **Routing:** it works on any `BaseAudioContext`, so it renders in `OfflineAudioContext` for tests. Live, use `ctx.audio.context`, connected to `ctx.audio.buses.sfx` (undocumented but present in 0.46.0, so master and mute apply) via your own Voice gain. `ctx.audio.context` is null headless and before the first input: no-op and log.

| Speaker | f0 | Syllables/s | Formant shift | Extra |
|---|---|---|---|---|
| Ounce | 340 | 13 | ×1.25 | a needle tick on punctuation |
| Coach | 165 | 7.5 | ×.9 | flat pitch, long pauses |
| Marguerite | 230 | 9 | ×1 | slight vibrato |
| Dennis | 120 | 11 | ×.95 | pitch up on last word |
| June | 300 | 10 | ×1.15 | no contour at all |
| Kevin | | | | squawk SFX, never words |

---

## 16. Architecture

Download the kit (the URL is in your brief) and copy the contents of the zip's top-level `pixel-engine/` folder into the dev folder, so `pixel-engine.js`, `check.mjs` and the guides sit at its root. **Never edit `pixel-engine.js`**: record its sha256 in `vendor/pixel-engine.sha256` when you unzip, and a test compares it. Fetch the hub's `session.js`, `harness.html`, `bridge.js`, `round.js` and `README.md` into `vendor/hub/` from `https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/`.

```
pixel-engine.js  check.mjs  GUIDE.md ...        the kit, untouched
vendor/hub/                                     hub client and harness, untouched
src/main.js                                     boot: session check, Engine.start, first scene
src/app.js                                      App: scene switching, save, settings, tunables, device, debug API
src/core/      dot.js drivers.js actions.js device.js tunables.js save.js net.js clock.js
src/ui/        font.js menu.js dialogue.js widgets.js prompts.js screens/*
src/audio/     voice.js songs.js sfx.js
src/art/       avatar.js models.js textures.js clips.js glyphs.js portraits.js
src/data/      title.js activities.js poses.js reps.js charts.js boards.js week.js lines.js
               questions.js unlocks.js classmates.js stations.js medley.js about.js
src/scenes/    base.js boot.js title.js attract.js hub.js weighin.js report.js locker.js records.js jar.js
               card.js medley.js join.js ending.js  activity/{base,poses,reps,hoop,step,header,slackline,tray,jog,pier,longstand}.js
tools/         build.mjs test.mjs clip-sheet.mjs shot.mjs
tests/         headless/*.mjs  browser/*.mjs
```

**Everything a designer would change is plain data in `src/data/`:** poses, exercises, charts, boards, schedules, lines, unlocks, stars. A new pose, chart, board or day needs no code. That is what lets the rest of the game be built out later with normal tools, together with the live sliders and their JSON export.

**Engine patterns:**
- Start ✔: `Engine.start(new Boot(), withUrlOptions({ container: document.getElementById('app'), aspect: 'fill', touch: false, settings: { button: touchOnly ? 'top-right' : false }, quality: info ? 'medium' : 'high', seed, background: PALETTE.sky, camera }))`.
- Each scene is a `Game`, swapped with `engine.loadGame(scene, { camera })`. It frees everything per level; keep persistent state in `App`. Transition: `await screen.cover('iris')`, `await loadGame`, `await screen.reveal('iris')`.
- `BaseScene` owns the frame order: `update` → `App.device.update` → overlays (pause, dialogue, dev) take input first → the scene's own update → `hud.clear()` → scene draw → overlays draw. Gameplay goes in `fixedUpdate`, skipped automatically while `timeScale` is 0.
- **Rules from the guide that matter here:** gameplay in `fixedUpdate` with `consumePress`; `wasPressed` only in `update`; all randomness from `ctx.random` forks (never `Math.random`); time from `ctx.time` (never `performance.now`); no `new PointLight`. Modules guard `document`, `window`, `navigator` and `localStorage`, so **everything runs in Node** ✔.
- **Drivers** (`src/core/drivers.js`): `read(out)` fills `{ x, y, breath, stepL, stepR, confirm }`. `LocalDriver` (engine input and mouse), `PadDriver(index)` (Family Hour), `BotDriver(skill)`, `GhostDriver` (display only). Attract, tests, classmates and online all reuse this one seam.
- **Debug API**, kept in the shipped game (`globalThis.__GAME__ = App`): `go(id, args)`, `state()` as JSON, `setDriver(skill)`, `tunables`. Give every scene a real `status()` line (`activity hoop | play | t 31.2 | score 412`) and a `fingerprint()` (score, Dot state).

---

## 17. Verified recipes

### Single-file build ✔ (boots on `file://` in about 1.3 s; passes `check.mjs` and the harness)

```js
// tools/build.mjs (esbuild is on this machine)
execFileSync('esbuild', ['src/main.js', '--bundle', '--format=esm', '--platform=browser', '--target=esnext', '--charset=utf8', '--outfile=.build/bundle.js', '--log-level=warning'], { stdio: 'inherit' });
const safe = (s) => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<script>${readFileSync('vendor/hub/session.js', 'utf8')}</script>
${HUB_METAS}
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<link rel="icon" href="data:,"><title>${TITLE}</title>
<style>html, body { margin: 0; height: 100%; background: #0d0b14; } #app { position: fixed; inset: 0; }</style>
</head><body><div id="app"></div>
<script type="module">${safe(readFileSync('.build/bundle.js', 'utf8'))}</script>
</body></html>`;
writeFileSync(OUTPUT_HTML, html);   // OUTPUT_HTML: the deliverable name your brief gives, in root
```

The session client goes in **unmodified**: the hub replaces an unmodified copy with each new version. Nothing is fetched at runtime, so the game needs no CDN. Bundling doesn't count as editing the engine; `pixel-engine.js` itself stays byte-identical. Output is about 5.4 MB.

### Browser flags ✔

**Use all five.** With only the three in the machine notes, `renderer.capture()` failed: `mapAsync ... A valid external Instance reference no longer exists`.

```
--enable-unsafe-webgpu --enable-features=Vulkan --use-vulkan=swiftshader --use-angle=swiftshader --use-webgpu-adapter=swiftshader
```

### Node Playwright and the kit's check ✔

`npm install playwright@1.63.0` in the dev folder. Then `node check.mjs <page> --keys KeyD*30` works on the built html if it's copied into the dev folder.

### Screenshots ✔

The live loop rejects `capture()`, and a WebGPU canvas may screenshot blank. So step first, and composite the HUD:

```js
const e = window.__PIXEL_ENGINE__; e.step(30);          // switches to manual time
const f = await e.renderer.capture();                   // { width, height, pixels }
const c = document.createElement('canvas'); c.width = f.width; c.height = f.height;
const g = c.getContext('2d'); g.putImageData(new ImageData(new Uint8ClampedArray(f.pixels), f.width, f.height), 0, 0);
g.imageSmoothingEnabled = false; if (e.hud.canvas?.width) g.drawImage(e.hud.canvas, 0, 0, f.width, f.height);
return c.toDataURL('image/png');
```

Put this in `tools/shot.mjs <scene> [--size 1920x1080]`. Use it only for what a script can't judge: composition and legibility. Judge the 10-foot view at 1920×1080.

### Gamepad stub ✔

Add as an init script; change the state from the test:

```js
window.__pad = { buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })), axes: [0, 0, 0, 0] };
navigator.getGamepads = () => [{ id: 'Stub', index: 0, connected: true, mapping: 'standard', timestamp: performance.now(), axes: __pad.axes, buttons: __pad.buttons }, null, null, null];
```

Read inputs through a frame: `moveAxis()` gave (0.8, 0.6) for axes (0.8, -0.6) in-game. Headless, `e.input.setKey('PadCross', true)` works without any stub ✔.

### Hub harness ✔

Copy the built html (as `game.html`) with `harness.html`, `bridge.js` and `round.js` into a temp folder inside the dev folder. Serve it with `python3 -u -m http.server 0 --bind 127.0.0.1` ✔, reading the port from its first output line and stopping it by its PID. An in-process `node:http` server on `127.0.0.1` and port 0 also works, but it must send `Content-Type: text/javascript` for `.js`, or the harness's module imports fail. Then for each of:

```
harness.html?game=game.html&auto=1&players=1
harness.html?game=game.html&auto=1&players=2
harness.html?game=game.html&auto=1&players=4&latency=150&jitter=50&loss=5
harness.html?game=game.html&auto=1&players=4&latency=150&jitter=50&loss=5&scenario=host-leave
```

wait for `document.body.dataset.complete === 'true'`, then require `window.__hubCheck.pass`; print failed checks' `name` and `detail`. Each took 10-13 s with a light scene. Keep the card scene light so `ready()` lands inside the 20 s limit even with 4 software-rendered copies. Confirm the served page is yours (its title) before trusting a result. Then open the game outside a session and check it still runs.

### Headless facts ✔

- 600 frames with mixers takes about 80 ms, and boot about 240 ms, so full playthroughs are cheap.
- `Engine.headless(game, { camera })`: built-ins load with no asset reader.
- `recording()` and `replay()` reproduce the fingerprint across `loadGame`.
- `input.setPointer(x, y, true)` drives the mouse.
- `ctx.audio` counts plays with no context.

---

## 18. Testing

**One command: `node tools/test.mjs`** prints only failures and one count line (`212/212 passed`). `--fast` runs the Node tests only. Rerun only after changing what a test covers. Prefer scripts to screenshots. Don't use subagents or workflows to review, judge or audit. Keep at most two browsers open.

**Headless (Node), seconds:**

1. **Dot:** idle bot < 20% at ring .30; average 35-65%; good > 80%; expert > 95%.
2. **Clips:** `validateClip` empty and `analyzeClip(...).problems` empty for every clip you wrote.
3. **Data:** every model (`checkModel`) and texture (`validateTexture`) clean; all ids resolve; `parseSong` on every song; each song passes the level check in §15; every line fits its box; every character of every string has a glyph.
4. **Every activity:** idle bot finishes with 0★ and no error; expert bot ≥ 2★ (≥ 3★ on easy ones); sloppy < expert; result written; Drips correct.
5. **Full scripted playthrough:** drive the real menus with `setKey` from a fresh save, bots inside activities: new week → all 7 days → every station → goals → unlock schedule → Jar milestones → Long Stand → confession subtracts exactly 7 → credits → Week 2. Assert the state at each step.
6. **Save:** reload mid-week restores; corrupt JSON falls back safely; no storage works.
7. **Pause:** `timeScale` 0, `fixedUpdate` frozen, menu navigable, resume exact.
8. **Dev:** every slider changes live behaviour; reset restores defaults; every tool works.
9. **Attract:** 10 s idle on title and on a menu starts it; no trigger during play; a full loop runs error-free over all items; any input exits.
10. **Determinism:** record an activity, replay it, fingerprints equal.
11. **Medley:** 4 bot lanes, scores in range, windows respected; a ghost lane never simulates.
12. **Voice:** `syllabify` is stable, the same word gives the same syllables, a question rises.
13. **Engine untouched:** `pixel-engine.js` hash equals the kit's.

**Browser, on the built html via `file://`:**

14. Boots on WebGPU with no errors; title visible; **music volume is exactly 0.10** on first run.
15. Pad stub: ✕ confirms; prompts show PlayStation glyphs; the Settings option gives Xbox; a key press switches to keycaps; mouse move switches to mouse prompts; hover moves focus; click activates. Record each prompt state in `App.state()` so no picture is needed.
16. Phone profile with touch: message showing, ⚙ present, `engine.touch` null, attract runs.
17. Family Hour with 2 stub pads plus keyboard: three lanes move independently.
18. Audio after a real click: an `AnalyserNode` on the destination reads non-silent for SFX and music; voice in `OfflineAudioContext` has RMS > .02, and Ounce's mean pitch exceeds Coach's.
19. No layout overflow at 1920×1080, 1280×720 and 640×360: widgets record their rects, and the test asserts all fit.
20. WebKit (iPhone profile) and Firefox have no `navigator.gpu` on this machine ✔, so they can only test failure: the engine's "Failed to start: WebGPU unavailable" message shows ✔ and no page error is thrown. Test the touch-only screen itself in Chromium's phone profile, as in test 16.

**Hub:**

21. The four harness runs from section 17, all `pass`. Each harness frame is a separate copy of the game, which covers the brief's "no second player" note.
22. Outside a session: normal boot with `AIHub.active` false.

---

## 19. Build order

Finish each step with its tests green. Keep the game runnable and the deliverable building from step 1 on.

1. **Skeleton.** Kit and hub files, build script, test runner, boot scene on `file://`, harness passing with a stub round. Takes minutes, because the recipes above are proven.
2. **The Dot and the kit.** Dot, drivers, actions, device, tunables; font, menu, dialogue, prompts, glyphs; App, scene switching, save; Settings; pause; dev sliders.
3. **One activity, fully.** Holding Still end to end with avatars, Coach, results, voice and music. **Stop and judge the feel here**, since this is the whole game in miniature: check the bot table, then capture a run as frames and confirm the body language reads the Dot.
4. **The island and the week.** Hub, Weigh-In, stations, Report, Jar, schedule, saves. Scripted playthrough started.
5. **Other activities**, in this order: Hoop, Reps, Header, Step, Slackline, Tray, Pier Jump, Jog.
6. **The Medley.** Lanes, Family Hour, session card, ghosts. Harness at full spec.
7. **Attract, Dev tools tab, touch-only, Locker Room, Hall of Numbers.**
8. **The story and the finish.** Ferry, daily beats, Long Stand, confession, ending; line bank to 120+; all songs; every model and particle.
9. **Wrap-up.** About & Credits, exit interview, final tests, one look at each screen at 1920×1080.

**If you must cut scope,** remove whole activities from the data, in this order: Pier Jump, Vitamin Tray, Island Jog, Overhead Mortgage. Nothing half-built ships, and nothing may look stubbed. **Never cut:** the Dot, Holding Still, Reps, Hoop, Header, Step, Weigh-In, the island, the week, the Long Stand, the Medley, attract, dev mode, Settings, About.

---

## 20. Finishing

**No TODOs, placeholders, stubs or dead menu items.** Every screen works with pad, keyboard and mouse.

### About & Credits (paged, not dense; L1/R1 or arrows or click)

Credits; "This is not medical advice. Ounce is a scale."; **Source Information** (every field your brief lists; `unknown` for anything you can't confirm; Usage: `added on import`); **Testing Feedback**; **Engine Feedback**; **Prompt Feedback**; the kit's `CREDITS.md`, shipped as the kit asks: a summary page, then the full text in a scrollable view.

**Keep one source of truth:** `src/data/about.js` feeds the screen, and `tools/build.mjs` writes the exit-interview file from it, then re-parses it to confirm it is valid JSON. Answer the feedback questions honestly, from your real run, not from this plan.

For Source Information: Source is Wii Fit; Genre and Perspective as in section 1; Tech: Pixel Engine with its version, three.js r186 and Rapier as bundled in it, esbuild for packaging; Art: the engine's native pixel look; Animation: engine `ClipDef`s with `AnimationMixer`; Audio: engine `Song` and `SoundDef` data plus a Web Audio formant voice; Online: AI Hub Session Protocol v1, ghost mode, own card, 1-4 players; Family Hour is local. For Research, describe what you did yourself, and note that the director's plan included engine and hub research and spikes.

### Exit-interview `aiHub` block

Use the exact shape in your brief. Suggested values:

- `name`: {TITLE}; `tagline`: yours.
- `type`: `Game`; `genre`: `Sports`; `source`: `Wii Fit`; `series`: `Wii Fit`; `players`: `1–4`.
- `controls`: `Left stick, WASD or mouse: lean. R2, Space or click: breathe. L1/R1, F/J or mouse buttons: step.`
- `tags`: `["pixel art", "comedy", "versus", "arcade", "3d", "story"]`.

### Your final chat reply

It must contain Source Information, Testing Feedback, Engine Feedback and Prompt Feedback, as your brief says.

---

## 21. Brief coverage checklist

Tick each before you stop.

| Brief item | Where |
|---|---|
| Genre and perspective chosen | §1, §5, §7 |
| Title: riff on the source's name, picked as the brief says, by you | top of plan, §16 |
| Research: your choice; the director's is here | §4, §17, §20 |
| Single html named as the brief says, in root | §17 |
| Built on the kit; engine unchanged; own systems on top | §16, §17, §18 test 13 |
| Art: engine's look as the base, new assets for the source's feel, library for generic props | §13 |
| Animation: engine's system as the base, new animations | §14 |
| Audio: all in code, gibberish voices, music 10% by default | §15, §18 test 14 |
| Online and multiplayer: hub, and on its own | §12 |
| Dev subfolder, ports, processes, sharing the machine, `file://` first | top of plan, §17, §18 |
| Performance unlimited, no optimisation | §13 |
| Effort is yours to spend; an order and a cut list if you need them | §19 |
| Machine notes: stand-ins for controller, touch, sound, second player, iPhone, TV | §17, §18 |
| Headless tests, scripted playthrough, one command, failures and count only, screenshots only where needed, no review subagents | §18 |
| Original game inspired by the source; world, characters, themes, tone | §1, §2, §8 |
| Feature-complete vertical slice; infrastructure for building out | §3, §5, §16 |
| Dev mode from pause; standard tools; live sliders with reset | §10 |
| Attract: 10 s on title/menus, looping, any input exits, cheats allowed | §11 |
| Writing style like the source's | §8 |
| Controller first at 10 feet; native keyboard and mouse on the same screens | §9 |
| Prompts follow last input; PlayStation glyphs; Xbox option; keys and mouse | §9, §18 test 15 |
| No dense web-style screens | §9 |
| Touch-only: no touch controls, message, settings button, attract runs | §9, §18 test 16 |
| No TODOs, placeholders or stubs | §19, §20 |
| Source Information and all feedback in the chat reply and About/Credits | §20 |
| Exit interview in the exact shape, parses as JSON | §20 |
