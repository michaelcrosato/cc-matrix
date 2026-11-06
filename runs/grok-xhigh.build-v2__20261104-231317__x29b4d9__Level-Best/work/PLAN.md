# Director's Plan

Build the game from this document. Nobody can answer questions, so where the plan is silent, decide and move on. TASK.md stays the authority on what to deliver, how it is named, what to report and how you may test. This plan decides what the game is and how it is built. Paths are relative to your dev folder.

**How to read the numbers.** ✔ means I ran it on this computer on 2026-11-04 with three@0.180.0 and @dimforge/rapier3d-compat@0.19.3 and it behaved as described. Skill results are written sharp / average / clumsy, from the calibrated bots in section 17. They are simulations of a player, not a player. No mark means a starting value: tune it with the dev sliders and the balance test.

**Contents:** 1 The game · 2 Originality rules · 3 Controls · 4 The balance model · 5 Programme and progress · 6 Events · 7 Screens · 8 Cast and writing · 9 Art bible · 10 Animation · 11 Audio · 12 Multiplayer · 13 Attract mode · 14 Dev mode · 15 Touch-only · 16 Architecture and build · 17 Testing · 18 Build order and cut order · 19 Done and reporting · 20 What was and wasn't verified · 21 TASK.md coverage and proof · 22 Planning-stage report

---

## 1. The game

**Pitch.** A wooden-toy wellness retreat stands on an island balanced on a single rock, and the island has been crooked for as long as anyone remembers. You arrive as a new guest, a jointed peg doll. Every morning a fussy talking spirit level named Trudy checks you in, asks something too personal and tells you your Wobble Age. Then you go to class: hold poses with a heron, do reps under a log for a walrus, step to city pop on the bandstand, catch fruit in a basket hat, stack stones on a slab over your head. Every class pours marbles into the counterweight jar, and the whole island visibly straightens, day by day, until the morning Trudy's bubble sits in the middle for the first time.

**Title.** Do TASK.md's title step first, since it names your folder and file. The title is a joke on the source's name, never the name itself. Keep it in one constant (`src/data/config.js`). Nothing in the fiction depends on it: the resort is the Level Best Retreat, and the cast and events have their own names.

**Scope.** A feature-complete demo: a complete, polished vertical slice with every system in place, long enough to show everything the game can do. A full pass of the programme runs about 45 minutes.

**Genre:** physics-balance party sports with a daily-ritual progression. **Perspective:** third person. Each event has its own framed stage camera. On the island it is a chase camera you can orbit.

| What makes the source itself | Our version |
|---|---|
| You see your own balance as a dot in a target | The Balance Disc, in every event, driven by real physics |
| A rectangle given a personality, who asks awkward questions and notices when you skip days | Trudy, a talking spirit level whose bubble is her eye |
| Calm, slightly uncanny instructors; "the trainer notices when you slack off" | Ms. Stillwater (a heron) and Coach Bolster (a walrus), who both notice |
| A daily test that hands you an embarrassing age | The Check-In and your Wobble Age |
| Four kinds of training | Stillness, Strength, Cardio, Balance Play |
| Minutes trained fill a bank that opens new things | Marbles pour into a glass jar, physically |
| The family takes turns and laughs at each other | Group Class on one TV; an AI Hub class across devices |
| Absurd little games between the earnest ones | Fruit Hat, Springboard, Tippy Raft |

**Pillars. When in doubt, serve these.**
1. **One verb: shift your weight.** Every event reads the same Balance Dot from the same physics. Learn it once and you can play everything.
2. **Physics tells the jokes.** Falling is the best moment in the game: clattering wooden limbs, a straight-faced line from Trudy, a spring back up. Failure is never punishing.
3. **A gentle ritual.** Check in, train, watch the marbles, go to bed. No skill gate ever stops the story.
4. **The world is the progress bar.** The lighthouse leans 9° on Day 1 and stands straight on the last day. Loose props slide to the low side. The music is slightly out of tune until the island is level.
5. **The room laughs.** It is played on a TV at 10 feet, and it should be funny to watch.

**The first five minutes** (build this exact beat, it is the game's first impression):
1. Title screen at dawn. The crooked island fills the frame. The title's letters stand on a wooden beam that tilts with the island, and they slide a little. After 10 idle seconds, attract mode starts.
2. Press to start. "Who's here today?" Four empty mats. Pick one. The name spinner offers a generated name ("Gentle Margaret"); reroll or accept. Pick a paint colour. Under a minute.
3. You drop onto the island from above, clatter, spring up. Trudy hops over, bubble sliding to the high side. "Oh! A person. Please step on. Not on me. On the island."
4. Trudy asks you to lean left. As you do, **the whole island tips under you** and every orange on the island rolls. No menu has taught this; the world did. Lean right, then forward. "I can feel that, by the way."
5. First Check-In. Three short tests. The drum roll. "Your Wobble Age is 74. Some of my favourite people are 74. Mostly the ones sitting down."
6. Walk to the Sun Deck (or pick it from Today's Plan) for your first pose with Ms. Stillwater, then Fruit Hat on the pier, where you get greedy, fall over, and laugh.
7. Marbles pour into the jar. The island creaks and comes up one notch. The lighthouse is visibly straighter. Bed.

---

## 2. Originality rules

This is an original game in the source's genre, with similar kinds of mechanics. It is not a recreation.

- **Never show** the source's name on screen (outside the title's joke and the About screen's Source line), nor use its product or feature names (balance board, the words it uses for its test, age or bank), its characters, its avatar style, its music or its look. No white-and-pale-blue gym, no plain white-clad instructor, no Mii-style avatars (ours are jointed wooden peg dolls), no talking board, no piggy bank.
- **Never copy its activities.** No ski jump, slalom, soccer heading, table tilt with balls and holes, tightrope, hula hoop, penguin slide, river bubble, snowboard or boxing. The events in section 6 replace them with our own ideas. Add new ones in that spirit, not from that list.
- **Tone guard.** Trudy teases posture, knees, commitment and attendance. **Nothing in the game comments on body weight, body shape or food.** There is no scale, no BMI and no weight number. "Weight" only ever means where you are leaning. No real health claims.
- All art, music, text and voices are made for this game, in code.

---

## 3. Controls

Design for a PS5 DualSense, or any pad the browser reports with `mapping === 'standard'`, on a TV at 10 feet. Keyboard and mouse play the same game on the same screens, with no separate desktop layout, and they should feel native rather than like stand-ins. Weight comes from a stick on a controller and from the pointer with a mouse. Both are analog. **Stick and mouse are always screen-relative:** up is away from the camera, right is screen right. Rotate the input by the camera's yaw before using it.

| Verb | Controller (standard mapping) | Keyboard | Mouse |
|---|---|---|---|
| Shift weight (events) / walk (island) | Left stick, axes 0 and 1 | W A S D or arrow keys (see below); C recentres | Pointer's offset from screen centre, normalised by 33% of screen height, clamped to the unit disc |
| Left foot | L2, button 6, analog `.value` | Q | Left button |
| Right foot | R2, button 7, analog `.value` | E | Right button |
| Hop / both feet | Cross, button 0 | Space | Both buttons |
| Flail | Square, button 2 | F | Middle button |
| Breathe in (hold) | R1, button 5 | Left Shift | |
| Ask Trudy (island) | Triangle, button 3 | T | |
| Look (island only) | Right stick, axes 2 and 3 | | Hold right button and drag; wheel zooms |
| Use / confirm | Cross | Enter or E (island), Enter or Space (menus) | Left click |
| Back | Circle, button 1 | Esc or Backspace | Right click (menus only; suppress the context menu) |
| Pause | Options, button 9 | Esc | |
| Menu move | D-pad or left stick | Arrow keys or W A S D | Hover moves the focus |

- **No pointer lock is needed**, which keeps the game simple inside the hub's frames. Hide the cursor during events when the mouse is in use: the faint ring on the Balance Disc shows where it is asking you to go.
- **Which device moves your weight:** whichever was used last. With a pad, ignore the pointer. With keyboard and mouse, keys win while a weight key is down, otherwise the pointer, once it has moved. A resting mouse never fights a resting stick.
- **Keys in balance events ✔: they move the asking ring, and it stays where you leave it.** Holding a key moves the ring at 1.6 units/s; releasing leaves it there, and C recentres. The ring must be clearly visible on the Balance Disc, because a player steering by keys watches the ring, not the dot. I tested three models with a person-like bot. Keys that spring back on release needed 9.6 presses a second just to hold a pose. A tap-then-accelerate model scored worst (Poses Tier 1: 68 / 75 / 38). This one holds up against the stick: Poses Tier 1 98 / 62 / 54 (stick 100 / 76 / 63), Tier 2 86 / 58 / 34 (90 / 64 / 53), Still Water Tier 1 100 / 85 / 28 (100 / 93 / 24), Fruit Hat Tier 1 21 / 22 / 20 banked with no falls (28 / 33 / 28), Room Service Tier 1 all five glasses. Use a move speed of about 1.6 and don't add acceleration.
- **Keys when you're moving, not balancing: direct.** Walking on the island, Tippy Raft, steering in Island Loop and spinning in Springboard's air use the raw key direction, as PC players expect. Plate Spinners has its own scheme ✔, below.
- **Foot keys** ramp 0 to 1 in 0.12 s.
- **Latch presses ✔.** A key or mouse button pressed and released between two input polls must still count, or quick taps vanish at low frame rates. Normalise key codes too: the hub's harness sends synthetic events whose `code` is just `a`, so accept `a` and `KeyA` alike.
- **Read mouse buttons from the `buttons` bitmask ✔.** Pointer Events don't fire `pointerdown` for a second button while one is already held, so with left and right as the two feet, "both buttons" (Hop, Log Reps, Springboard) never registers if you only listen for `pointerdown`. Read `e.buttons` on down, up and move: bit 1 is left, 2 is right, 4 is middle.
- **Hover means the pointer moved ✔.** Move focus only on a `pointermove` whose coordinates changed. A browser also fires `pointerenter` when a menu appears under a parked mouse, and that made focus jump by itself under a controller player.
- **On the island,** a hovered thing (pavilion, jar, board, Trudy) gets a thick outline and a label. Left click walks there and uses it. WASD and E work without the mouse. Hit-test by projecting each hotspot's anchor to screen and taking the nearest within a radius. It is simple and robust.
- **Prompts follow the last input.** Track `lastDevice` (`pad` or `kbm`): a pad counts when a stick passes 0.25 or a button is pressed; keyboard and mouse count on keydown, mousedown or 4+ px of movement. Prompts re-render the same frame. A Settings option switches pad glyphs between PlayStation shapes and Xbox letters (A B X Y, LT RT LB RB). Keyboard prompts show keycaps, mouse prompts show a mouse with the button lit. Draw all glyphs as inline SVG in code. Every glyph element carries a `data-glyph` attribute that tests can read.
- **On the island,** Cross and E use the focused thing if there is one; otherwise Cross and Space hop.
- **Create + Options belongs to the hub.** Ignore Options while Create (button 8) is held, everywhere.
- **If a player's pad disconnects mid-class,** pause and say so on screen.
- **Haptics:** `pad.vibrationActuator?.playEffect('dual-rumble', …)` on falls, catches, rising fatigue and near-tip. Guard it, with a Settings toggle.
- **Audio on a controller ✔.** Call `AudioContext.resume()` on pad input too, not only on keys and clicks. My first wiring left a controller-only player in silence. I can't confirm here that every browser accepts a gamepad press as the gesture that unlocks audio, so if the context is still suspended a few seconds after pad input, show a small tag asking for a key or click.

---

## 4. The balance model

This is the heart of the game and it is the most tested part of this plan. Copy it, then tune it.

**The doll's "balance core"** is one Rapier dynamic body on a ball joint at the foot. Everything in the game that stands uses it. Its colliders can carry props, and those props push back on it through real contacts, so a heavy hat makes you top-heavy without any special code.

```js
// m = 1, h = 0.75 (foot to centre of mass), doll stands 1.5 m tall. Fixed step 1/120 s.
const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
  .setTranslation(fx, fy + 0.75, fz).setCanSleep(false).setAdditionalSolverIterations(4));
world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.25).setMass(1).setCollisionGroups(DOLL(lane)), body);
const joint = world.createImpulseJoint(
  RAPIER.JointData.spherical({x:0,y:0,z:0}, {x:0,y:-0.75,z:0}), footBody, body, true);
joint.setContactsEnabled(false);            // footBody is kinematicPositionBased

const G = 9.81 * 0.75, I = 0.75 * 0.75 + 0.06;   // gravity moment, inertia about the foot
const K = G * (1 + margin), wn = Math.sqrt((K - G) / I), D = 2 * zeta * wn * I;

// Each fixed step, before world.step():
const r = 1 - Math.exp(-reflex * dt);
wx += (wishX - wx) * r;  wz += (wishZ - wz) * r;       // wish = the input, on the unit disc
const tx = wx * maxLean, tz = wz * maxLean;            // target lean in radians
const q = body.rotation();
const ux = 2*(q.x*q.y - q.w*q.z), uy = 1 - 2*(q.x*q.x + q.z*q.z), uz = 2*(q.y*q.z + q.w*q.x);
leanX = Math.atan2(ux, uy);  leanZ = Math.atan2(uz, uy);   // lean toward +x and +z
const w = body.angvel();
let Tx = -(G*Math.sin(tx) + K*(leanX - tx)) + D*w.z;    // gravity feed-forward, spring, damper
let Tz = -(G*Math.sin(tz) + K*(leanZ - tz)) - D*w.x;
const limit = ankleMax * (flailLeft > 0 ? flailBoost : 1);
const m = Math.hypot(Tx, Tz);  if (m > limit) { Tx *= limit/m; Tz *= limit/m; }
// nx, nz are the disturbances (sway, tremor, gusts, shoves), in the same lean space, not clamped
body.resetTorques(true);
body.addTorque({ x: Tz + nz, y: -w.y * 0.6, z: -(Tx + nx) }, true);
```

**Defaults ✔:** `maxLean` 18°, `margin` 0.45, `zeta` 0.40, `ankleMax` 4.6 N·m, `reflex` 10 /s, `flailBoost` 1.9, flail lasts 0.35 s with a 2 s cooldown, fall at 45° of lean.

**What those numbers do ✔:**
- Full stick from rest reaches 90% in about 1 s, overshoots to about 23° and settles at 18°. It is a soft, wobbly, toy-like feel.
- Whipping the stick end to end at about 0.5 Hz survives. Slamming it from −18° to +18° peaks near 28° at `ankleMax` 4.2 and up, and falls at 3.8. This is why careful correction matters.
- The torque limit makes a natural point of no return at `asin(ankleMax / G)`, about 39° with no load. Hat and stone loads lower it automatically.

**Gusts at the defaults ✔ (0.5 s long; these numbers are the difficulty dial):**

| Gust | Do nothing | Flail as you pass about 30° | Stick against it once it has started | Braced: stick at 60% against it, 0.5 s before it hits |
|---|---|---|---|---|
| 2 N·m | safe, peaks 22° | | | |
| 2.5 N·m | safe, peaks 31° | | | |
| 3 N·m | **falls** | saved, peaks 38° | falls | safe, peaks 19° |
| 3.5 N·m | falls | saved only if timed near 32°, peaks 43° | falls | safe, peaks 29° |
| 4 N·m | falls | falls | falls | falls |

So a telegraph is worth a lot: **give a warning before every gust of 3 N·m or more.** And flail is a real last-moment save with timing in it: a flail used early, before you have moved much, wears off and you still fall. It is the moment people will shout at the TV.

**The load rule ✔.** Every prop adds a gravity moment δ = mass × 9.81 × height. The doll grows unstable when total δ exceeds K − G (3.3 at the default margin). A prop's mass therefore decides how many you can carry. Too heavy and the doll tips over at once: with margin 0.45, 0.06 kg fruit tipped it at the 5th or 6th catch, while 0.015 kg works out to about 13. **Keep prop masses small** (0.01 to 0.03 kg) against the doll's 1 kg.

**Slow sway is what makes holding still a game ✔.** A thumb is far steadier than a body on a board, so a player who simply parks the stick on a target and leaves it scored 100% in my first test. Fast tremor barely moves the dot. The fix is slow forcing that the player has to see and counter by hand. Add it to `nx`, `nz`:

```js
nx = sway  *(Math.sin(t*0.9 + ph)*0.6 + Math.sin(t*1.73 + ph*2.1)*0.4)
   + tremor*(Math.sin(t*8.2 + 1.1)*0.6 + Math.sin(t*18.3)*0.4);
nz = sway  *(Math.sin(t*0.77 + ph*1.7)*0.6 + Math.sin(t*1.51 + ph*0.6)*0.4)
   + tremor*(Math.sin(t*7.1 + 2.3)*0.6 + Math.sin(t*15.7 + 0.7)*0.4);   // ph from the event's seed
```
Sway units are N·m. Sway of 0.2 moves the dot about a quarter of the disc if ignored. Tremor is mostly for looks and rumble.

**Traps I hit ✔:**
- **The doll's colliders must not touch the ground.** The capsule's foot rotating into the floor silently limits lean to about 8° and every event feels dead. Use collision groups: `(membership << 16) | filter`. Bits: `GROUND 0x0001`, props of lane *i* `0x0010 << i`, doll of lane *i* `0x0100 << i`, ragdoll parts `0x1000`. A doll meets only its own lane's props. A prop meets its own lane's doll, its own lane's props and the ground. Ragdoll parts meet only the ground. Lanes never touch each other.
- **Stacked things use cuboid colliders.** Convex-hull stones collapsed by themselves with no disturbance at all (5th stone, every seed). Plain cuboids held. Draw a rounded stone over a box collider.
- **Foot motion must be smooth.** With a kinematic foot bobbing 3 cm, or moving in stop-start strides, everything left the tray. Steps set a target speed and the foot low-passes toward it. Bob the visual only.
- Use `world.integrationParameters.numSolverIterations = 8` to `10` for events with props.
- **A Rapier panic kills the physics for the whole page ✔.** It surfaces as `RuntimeError: unreachable` from the WASM module, and no later call recovers. I hit two causes, both of them easy to write by accident:
  1. **Touching a body after removing it, or removing it twice.** Drop every reference when you remove a body: remove it from your lists in the same line.
  2. **Removing a prop and the collider it rested on in the same step, or the support first and the prop later.** `world.step()` panics about half a second later, once the body moves. Even one stone does it. It looks fine if nothing moves, so a quick test can miss it. **Safe: remove the prop, step once, then remove the support.** `collider.setEnabled(false)` and `body.setEnabled(false)` are safe too, and so is freeing the whole world.
  Everything else the plan does soaked clean ✔: ragdoll spawn and remove 30 times with the doll swaying, four ragdolls at once, fruit loaded and removed 40 times, removing and re-creating the foot joint 30 times, plate shards 40 times, tumblers respawned 30 times, 60 fresh worlds in a row, props removed on a gravity-tilted island. If a panic still happens: out of a session, save and reload the page; in a session, call `AIHub.fail(message)`. Never catch it and carry on.

**The Balance Disc.** `cob = (leanX, leanZ) / maxLean` is the dot, shown truthfully. Draw it as inline SVG and move it with transforms each frame. It is the game's signature HUD: a large circular dial with rings, a target zone that turns green when you are inside, the solid dot, a faint ring showing where your stick is asking to go, and a short inked trail of the last half second, like a seismograph needle. Diameter is about 22% of screen height, bottom left. Trudy peeks over its rim and reacts. In Group Class each player gets a smaller one (14%) along the bottom edge.

**Falling.** At 45° of lean the doll becomes a ragdoll (section 10) with a clatter of wooden clacks, a quip, a rumble and a comic "CLACK!" word in the world. After `recoverTime` (2.2 s) the parts snap back with a spring noise and the doll bounces upright. Only the current hold or rep is lost. Disable the core while the ragdoll runs (`body.setEnabled(false)`). On recovery reset its pose, velocities and **your cached `leanX`, `leanZ`** ✔: if you forget, the stale lean makes the doll fall again at once, for ever. Falls are counted in the Journal as Floor Exercises.

**Flail.** One button, all devices. Arms windmill for 0.35 s and the ankle gets `flailBoost` strength. Cooldown is 2 s. It looks ridiculous on purpose. It is the save that makes near-falls exciting, and it only works if you time it (see the table above). A flail costs a small form penalty in Stillness events, and the instructor comments.

**Breath.** In Stillness events a breath ring pulses: 4 s growing, 4 s shrinking. Hold Breathe while it grows, release while it shrinks. Over the last full cycle, 70%+ in sync multiplies sway and tremor by 0.6 and form gain by 1.25. Out of sync does nothing bad except miss the bonus. Accessibility toggle: auto-breathe. It is worth a lot ✔: perfectly in sync, Poses Tier 1 goes 95→100 / 66→91 / 54→78, and The Cairn Tier 2 goes from 5.3 / 4.8 / 2 stones of 8 to 8 / 8 / 6.3.

**Difficulty** (Settings): Gentle, Standard (default), Honest. It multiplies `ankleMax` by 1.25 / 1 / 0.9, disturbances by 0.65 / 1 / 1.2 and rhythm windows by 1.4 / 1 / 0.8.

---

## 5. Programme and progress

**Days are game days, not calendar days.** A day ends when you go to bed. The real date is only used for absence jokes and calendar stamps.

| Day | Name | Check-In tests | Classes | What it teaches |
|---|---|---|---|---|
| 1 | Arrival | Stand Still, Lean Match, Step Time | Poses, Fruit Hat | Lean, flail, breath, the jar |
| 2 | The Second Day, Which Is Harder | Stand Still, Lean Match, Quick Lean | Log Reps, Step Class, The Cairn | Feet, rhythm, stacking |
| 3 | Service With a Wobble | One-Foot Hold, Lean Match, Step Time | Room Service, Plate Spinners, Plank & Perch | Stepping, stick circles. The Mirror opens |
| 4 | A Little Damp | Quick Lean, One-Foot Hold, Stand Still | Springboard, Still Water, Island Loop | Air control. Group Class invitation |
| 5 | Level Day | Your three best tests | Tippy Raft, Tug of Peace, The Grand Hold | The ending |
| 6+ | Maintenance | Random three | Trudy's random plan of three | Free Play continues forever |

Build the day list from the event registry: an event that was cut (section 18) is skipped and everything still works.

**A day's flow:** morning line → personal question (Yes/No) → Check-In → Wobble Age reveal → Today's Plan (cards in any order: walk there or pick a card to go directly) → each class → Results → marbles → the island comes up a notch → extra Free Play if wanted → the bed hut. Press Use, the screen inks out, a stamp lands on the calendar, the next dawn. Palettes follow the day's steps (dawn, noon, golden, dusk), unless an event pins its own (Step Class at dusk, The Grand Hold at sunset).

**The Check-In** (about 90 s) takes place on a round mat with Trudy. Three tests, each one screen with one big instruction. Each scores 0 to 1 (clamped):
- **Stand Still** (10 s, sway .1, tremor .06): keep the dot in the centre. Score `1 − meanDistance / .25` ✔ .82 / .74 / .49.
- **Lean Match** (18 s, sway .04): "Lean 70% left." A bar shows your percentage. Three targets, 6 s each, ignoring the first 1.5 s of each. Score `1 − meanError / .4` ✔ .58 / .45 / .27. (My first version, hold within ±5% for 2 s, was impossible: every bot timed out.)
- **Step Time** (16 s): alternate feet with a metronome at 96 BPM. Score `1 − meanError / 120 ms` ✔ .81 / .63 / .37.
- **Quick Lean** (15 s): lean toward the lit quadrant, six prompts. Score `1 − (meanReaction − .35 s) / .9 s` ✔ .87 / .69 / .44.
- **One-Foot Hold** (12 s): keep R2 down and L2 up, which halves `margin`, while keeping the dot centred. Score as Stand Still ✔ .55 / .48 / .40.

**Wobble Age.** `age = round(18 + 81 × (1 − mean)^1.3 + handicap)`, clamped to 18..99. The handicap is a comic head start that shrinks each day: +24, +16, +8, +3, then 0. So the number always falls, and that is what makes coming back feel good. With unchanged skill, Day 1 to Day 5 ✔: 56→32 / 66→42 / 86→62. The reveal is the comic set piece: lights dim, drum roll, numbers spin on a wooden counter, sting, Trudy's line from a band of lines by age. Stored per day and drawn as the Journal's graph. It never asks your real age ("I didn't ask how old you are. I asked your knees.").

**Marbles.** After each class: 2 per minute of active play (min 2) + medal bonus (1, 2, 3, 5) + 2 for a first clear. Each Check-In gives 1. They pour physically into the jar on the island, as real Rapier balls: a 200-marble pour runs fine (✔ 0.23 ms per step; 500 is 0.67 ms). Marble colour shows the medal. Thresholds unlock hats and paints (`src/data/unlocks.js`: 6, 14, 24, 36, 50, 60 marbles). A full programme pays about 15, 37, 59, 81, 103 by the end of each day, or 61 in total with all Tier B events cut, so everything unlocks either way ✔.

**The island's tilt depends on progress, not skill.** Rest tilt = 9° × (1 − completed programme steps / total steps), so nobody can be stuck. Each step lowers it with a long wooden creak, all loose props shuffling and Trudy reacting. The last notch happens inside The Grand Hold.

**Medals** come from form (0 to 100): ≥40 Adequate, ≥65 Pleasant, ≥85 Exemplary, ≥97 Suspicious. Below 40 is still a pass ("Attended"). Section 6 gives an event's form where it has its own formula. Everywhere else, form = 100 × raw / `par`, with `par` set per tier so the sharp bot lands 88 to 95 (section 17).

**Tiers.** Every event has three: Gentle, Honest, Unreasonable. Tier 2 opens with a Pleasant on Tier 1, Tier 3 with an Exemplary on Tier 2. Days 1 to 5 use Tier 1. Maintenance days use the highest tier opened. Free Play offers all open tiers.

**Free Play** opens each event once it has been met in the programme. Walk to its pavilion, or use the menu.

**The ending.** The Grand Hold (section 6) ends with the island level. Trudy's bubble centres for the first time. She has only ever seen the world at nine degrees. "Oh. So that's what the middle looks like." Silence, then the marbles flare, the lighthouse lights, and the credits roll over a slow pan of everything you straightened. Then: "It's quite flat, isn't it? ...Same time tomorrow?" Save the "levelled" state, unlock Free Play for everything, and carry on into Maintenance days.

**Profiles.** Up to four, each with a name, paint, hat, days, ages, medals, marbles and counts. Name is a spinner over generated names (no text entry; `src/data/names.js`). Save JSON in `localStorage` with a version number, read inside try/catch, and fall back to memory if storage is unavailable.

---

## 6. Events

### Common rules

**What you can and can't do.** Every Intro Card and the How to Play page say what you can do here and, in one line, what you can't: "You can't fall in this one." "Your feet don't matter here." "You can't lose this; you can only do it badly." A player should never have to guess whether a thing is possible.

**Flow.** Intro Card (name, one sentence, what you can and can't do, one diagram, this device's prompts; Use to begin) → instructor counts 3-2-1 → play → whistle or bell → Results (ink-stamp medal, one big number, one line of stats, a line of dialogue, retry or continue) → marbles in the programme.

**Lanes.** Every event is written for an array of lanes from the first line: `for (const lane of this.lanes)`. A lane is `{ id, kind: 'local' | 'bot' | 'ghost', input, doll, balancer, props, score, name, colour }`. Solo is one lane. Group Class is up to four local lanes. A hub session is one local lane plus ghost lanes. Attract mode uses bot lanes. Lanes sit 3.2 m apart on x. Each has its own collision bits. Ghost lanes have no physics at all (section 12). The camera frames all lanes in Group Class, and your own lane with neighbours partly visible in a session. Field of view 38° ✔ (the look tests used it). Pull back to fit lanes: `d = max(base, (spread / 2 + 2.5) / tan(hfov / 2))`. Chase camera: about (0, 3.4, 9) behind the doll, damped at 6 /s.

**Each event provides:** `buildSet()`, `start()`, `fixed(dt)`, `frame(dt)`, `laneResult(i)`, `botInput(i, t, skill)`, `dispose()`, plus static `id, title, discipline, instructor, tiers, couch, session, sessionConfig`. A fresh Rapier world per event, freed in `dispose()`: no state leaks. Gameplay randomness comes only from `rng('event-id')` (section 16).

**Non-standing poses reuse the balance core:** in Plank & Perch, Still Water and Tug of Peace the core stays upright and invisible, and the visible doll plays the pose and rocks with it. Nothing in the rules knows the difference.

### STILLNESS, with Ms. Stillwater

**Poses** (Sun Deck, a round teak deck on stilts over the water; low three-quarter camera, heron beside you)
- *Play:* The heron demonstrates, then the target ring glides from centre to the pose's spot on the disc (3 s). Follow it, then hold while the ring shrinks. Breath ring runs throughout.
- *Tiers ✔:* maxLean 14°, margin 0.45. Tier 1: 3 poses, hold 8 s, ring 0.30→0.16, sway 0.08→0.22, tremor 0.08→0.20. Tier 2: 4 poses, hold 10 s, ring 0.30→0.13, sway 0.12→0.30, tremor 0.10→0.30. Tier 3: 5 poses, hold 12 s, ring 0.30→0.10, sway 0.15→0.38, tremor 0.15→0.40.
- *Scoring ✔:* each tick in the ring earns `0.30 / ringRadius`; form is the share of the maximum, capped at 100. Without breath: Tier 1 95 / 66 / 54, Tier 2 74 / 58 / 46, Tier 3 55 / 41 / 33. In sync throughout: Tier 1 100 / 91 / 78, Tier 2 100 / 85 / 71, Tier 3 96 / 62 / 57. Tiers 2 and 3 are hard on purpose, and breath is how you get there.
- *Pose table* (`src/data/poses.js`, spot on the disc): The Contented Heron (−.35, 0), The Apologetic Pine (0, .4), Half-Folded Deck Chair (0, −.35), The Lighthouse Keeper (.4, 0), Startled Flamingo (.35, .2), The Long Goodbye (−.2, .45), Someone Else's Umbrella (.45, −.1), The Quiet Regret (−.4, −.2). All standing poses.
- *Bot:* follow the ring with a delayed correction; breathe in sync.

**The Cairn** (Quarry Terrace, pale stone over the cliff; side three-quarter camera)
- *Play:* You hold a slab overhead. Ms. Stillwater lowers stones onto the stack with her beak. Keep the slab level as the stack gets taller and more alive. Then a final hold.
- *Physics ✔:* margin 0.8, ankleMax 6, solver iterations 10. Slab: cuboid (.55, .03, .55) on the doll's body at local y .95, friction 1, mass .05. Stones: **cuboid collider** half-extents (r×.8, hh, r×.8), mass .02, friction .95, restitution 0, linear damping .1, angular damping .6. Sizes (r, hh) from the bottom: (.26,.09) (.24,.085) (.22,.08) (.2,.078) (.18,.074) (.165,.07) (.15,.066) (.14,.062) (.125,.058) (.11,.054). Release each stone 1.2 cm above the current top stone's centre with a small random offset.
- *Tiers ✔:* Tier 1: 6 stones every 5.5 s, hold 8 s, sway .1→.3, tremor .05→.15, offset ±1.5 cm. Every bot finished with all six up: it teaches. Tier 2: 8 stones every 5 s, hold 10 s, sway .15→.4, tremor .08→.2, offset ±2 cm: 5.3 / 4.8 / 2 stones left without breath, 8 / 8 / 6.3 in sync. Tier 3: 10 **wider** stones, (.28,.09) (.27,.085) (.26,.08) (.25,.078) (.24,.074) (.23,.07) (.22,.066) (.21,.062) (.2,.058) (.19,.054), every 4.5 s, hold 10 s, sway .15→.4, tremor .08→.2, offset ±2 cm: 1.3 / 1 / 2 without breath, 10 / 5.8 / 1.5 in sync. With the normal stones and more sway, Tier 3 collapsed whatever you did, breath or not: unfair, so don't use that.
- *Scoring:* 100 per stone on the slab at the end + height bonus + steadiness. Dropped stones clatter and the next one still comes.
- *Bot:* correct the lean with gain 0.7, delay 0.16 s. Do not use high gains: a delayed correction with gain 1.4 oscillates and tips under this load ✔.

**Still Water** (Lily Pond; high three-quarter camera over the water)
- *Play:* Sit on a lily pad for 60 s. Stay in the small calm zone. Calm fills a meter, and creatures arrive at thresholds: dragonfly on your nose, frog on your head, koi circling, turtle, and at full calm Ms. Stillwater tiptoes over and pats your head. Move too much and they scatter. Ripples spread from the pad in proportion to how much you move: this is a beautiful TSL shader on the pond. Distractions: Trudy whispering ("Don't think about your left knee"), a sneeze (telegraphed "Ah... ah...": press Flail to stifle it, or take a big shove).
- *Tiers ✔, 60 s:* calm zone r .15, .12, .10; sway .07→.18, .1→.22, .12→.26; tremor .05; 2, 3, 4 sneezes (1.2 s warning; a missed one is a 2.2 N·m shove for .3 s). Calm rises 1/30 per s in the zone and falls 1/8 per s outside it, and creatures arrive at .2, .4, .6, .8, 1. Time in zone: Tier 1 100% / 95% / 80% (peak calm 1 / 1 / .67), Tier 2 86 / 71 / 48, Tier 3 62 / 49 / 31.
- *Scoring:* form = mean of (share of time in the zone, calm at the end) ✔ Tier 1 100 / 89 / 48. *Bot:* hold centre, stifle sneezes.

### STRENGTH, with Coach Bolster

**Log Reps** (The Yard; front three-quarter camera, Coach beside you shouting encouragement)
- *Play:* A log across your shoulders. A tempo ribbon moves down 2 s, pauses 0.5 s, up 2 s, rests 0.5 s. Squeeze both triggers to sink (depth = average of L2 and R2; on keyboard and mouse, holding both ramps depth down at the tempo's speed and releasing ramps up). Stay in the ribbon's band and keep the dot centred. Fatigue grows each rep: depth shake from .015 to .07, a narrower band (half-width .16→.10), stronger rumble.
- *Tiers ✔:* margin .8, ankleMax 6, dot zone r .30. 6, 9, 12 reps, with sway .08→.22, .12→.3, .15→.38 and tremor .04→.12, .06→.16, .08→.2. Coach's gag at the end: "That's the last one! ...THIS one's the last one." Two bonus reps worth double.
- *Scoring ✔:* a rep scores (share of time in the band) × (.5 + .5 × share of time in the zone). Form is the mean: 97 / 77 / 50 on every tier, assuming tracking error .05 / .12 / .2. Reps alone don't make it harder, so tighten the band by .02 on Tier 2 and .04 on Tier 3. (My first band, .24→.15 with a zone of .45, scored everyone above 90.)
- *The log is a rule, not a contact ✔.* Friction doesn't work here. At normal friction the log barely moves (.03 m at 16° of lean in 6 s). At very low friction it is past .5 m within 1.3-2 s at any lean. There is no useful middle. So attach the log to the shoulders and keep a number: `offset` grows by .05 m/s per degree of sideways lean past 6°, and comes back when you lean the other way. It adds `.06 × 9.81 × offset` to `nx`, so it feeds on itself. At .5 m it becomes a dynamic body and falls, Coach catches it with a flipper and hands it back, and that rep is lost.
- *Bot:* follow the ribbon with a delay.

**Plank & Perch** (The Beam, on the pier; side camera)
- *Play:* Hold a plank pose on a low beam. Gary the gull and friends land on your head, back and feet. Each adds a steady push on the dot. Counter it with your weight. Flail shakes them all off for a form penalty and a look from Coach. More than 2 s outside the zone: belly flop into the sand, comedic, resume.
- *Tiers ✔:* zone r .28, sway .1. 30 s with a gull every 5 s, pushes .2-.4 N·m. 45 s, every 4.5 s, same pushes. 60 s, every 4 s, pushes .25-.45. Each gull lands on the same side as the last 70% of the time, or the pushes cancel out and it's too easy. Time in zone: Tier 1 80% / 62% / 53%, Tier 2 62 / 51 / 53, Tier 3 54 / 48 / 50, with up to two falls. Tiers 2 and 3 separate players less, because a flail resets everything. Consider a stiffer flail penalty there.
- *Scoring:* time in zone + a bonus per gull still on you at the end. Being covered in gulls is a win condition. Set `par` near 85, 65, 58. *Bot:* counter the net push, flail after 1.2 s outside at a big lean.

**Tug of Peace** (The Beach; side camera; versus)
- *Play:* Best of three pulls. A caller shouts "Heave" every 1.2 s. On the call, squeeze both feet and lean back (down on the stick). Lean back too far when the other side eases off and you sit down hard (ragdoll, rope leaps .3 against you). Solo: you and Retired Kevin against Both Sandras. Group Class: seats 1 and 3 against 2 and 4, or 1 against 2.
- *Rules ✔:* The rope is one number from −1 to 1 on a line with sand markings. The rope pulls you forward: `extZ = .1 + .3 × theirPower`. (At my first .5 + .8 × theirPower, the pull cancelled all your lean and nobody could ever win.) Your power = timing × share, where timing = `1 − |error| / .3 s` and share = your actual backward lean / maxLean. Each call moves the rope by `(yours − theirs) × .33`. Their power is .35, .5, .54 by tier, ±20%. On Tiers 2 and 3 they ease off every 12 s or 9 s (roughly): tension drops to 0 for .8 s, and if your share is above .72 at that moment you get 3.2 N·m backward for .5 s, which sits you down unless you flail.
- *What that gives ✔:* Tier 1: everyone wins with the stick at .9, in 25-48 s. Tier 2: .85 is safe but slow (wins 100% / 88% / 0%); full stick also wins, with 3-4 falls. Tier 3: .85 only wins for the sharp bot; .95 wins 100% / 88% / 0%; full stick means 6-7 falls, and only the sharp bot still wins. So the choice of how far to lean is the game.
- *Scoring:* form = 40 + 30 per pull won, minus 5 per fall. *Bot:* hit the call with error, stick at .9. Not in the hub's set.

### CARDIO, with Coach Bolster and the class

**Step Class** (The Bandstand at dusk; front camera, class of eight dolls behind you following your moves)
- *Play:* Footprints slide along the deck toward your feet: left, right, both, and lean ribbons you hold for a beat. The class gets more in sync as your combo grows. At 16 the spotlights swing and confetti falls. A miss makes someone in the class trip.
- *Windows ✔:* Perfect ±45 ms, Good ±90, OK ±135 for feet. Audio-offset setting in Settings. Step timing comes from `AudioContext.currentTime` minus `outputLatency` when audio runs, otherwise the sim clock. Foot clicks are on the SFX bus: **music is only 10% by default, so the beat must be readable without it.** Every note also has a visual pulse on the beat.
- *Chart format* (`src/data/charts.js`): bars of 8 cells. `L R B` feet, `< > ^ v` lean, `.` rest. Patterns: `L...R...`, `L.R.L.R.`, `L.R.B...`, `L.L.R.R.`, `<...>...`, `L.R.<...`, `^...v...`, `LRL.RLR.`, `B.B.LRB.`, `L.R.LRLR`. Form: intro 4 bars (empty), A 8, B 8, A′ 8, break 4 (lean only), B′ 8, outro 4. Tier 1: first three patterns plus `<...>...` at 104 BPM. Tier 2: adds the next three at 116. Tier 3: all at 124. Session version: 24 bars at 116, with a 4-bar lean break.
- *Lean notes are judged differently ✔.* A soft-bodied doll physically can't get its dot across in one beat: in Tier 1's break, which swings end to end, it takes .6-.9 s against a .58 s beat, so even a perfect player would be marked late. A lean note scores when the dot passes .25 in that direction: full marks within 1.5 beats, half within 2. The ribbon scrolls toward you, so players can lead it with the stick.
- *Scoring ✔ (whole run on the real balance core):* feet Perfect 1, Good .7, OK .4; form is the share of the maximum. With timing error sd 28 / 55 / 95 ms and a small miss rate: Tier 1 97 / 84 / 62, Tier 2 97 / 85 / 64, Tier 3 97 / 84 / 63, with lean notes at 100 / 97 / 67, 100 / 100 / 88 and 100 / 96 / 84. The tiers have 106 notes in 102 s, 108 in 91 s and 126 in 85 s, with no falls (peak lean 24-26°). The session version takes 49.7 s, with 54 foot and 10 lean notes, and fits its 50 s slot: 98 / 88 / 69.
- *Bot:* hits every note with its skill's timing error.

**Plate Spinners** (The Circus Green; high front camera)
- *Play:* You stand in a ring of poles with spinning plates on them and a big hoop around your waist. Circle the stick or the mouse to drive the hoop. **On keys, alternate A and D: each press is half a turn, so your tapping speed sets the hoop.** Plates need speed: Large 3.5-5 rad/s, Medium 6.5-8, Small 9.5-11, with dead zones between. A plate gains energy only while the hoop is in its band, and everything else decays. You keep them alive by changing speed. Neglected plates wobble wider and wider, then fall, smash into six Rapier shards with a clatter, and return after 6 s.
- *Measure:* hoop ω = angular velocity of the weight vector when |weight| > 0.5, smoothed with τ = .12 s; otherwise it decays at 3 /s. **The hoop has inertia,** easing to that speed with τ = .5 s, so changing speed takes time. A colour ring around your waist shows the current band. Each plate has a big arc gauge. No falling in this event.
- *Tiers ✔, 60 s:* start energy .7, gain .45 per s. Tier 1: L M S, decay .11. Tier 2: L M M S, decay .13. Tier 3: L L M M S S, decay .16. Share of plate-time alive, from a simulated stick moving in a circle with hand jitter, rate wander and slips, measured as above: Tier 1 100% / 89% / 82%, Tier 2 89 / 86 / 74, Tier 3 79 / 76 / 66. Crashes a minute: 0 / 3.5 / 6 on Tier 1, more above. The smoothing isn't critical (.05 to .25 s gives much the same). (My first version, wide bands and slow decay with no hoop inertia, gave every bot 100% and no crashes, so nobody could lose.)
- *On keys ✔:* the asking ring is far too slow to reach any band, so this scheme is needed. Tapping at 1.35, 2.3 and 3.2 presses a second hits the three bands. Share alive: Tier 1 97% / 84% / 76%, Tier 2 91 / 79 / 74, Tier 3 79 / 66 / 60, in line with the stick.
- *Scoring:* form = `200 × share − 100`, floored at 0 ✔ Tier 1 100 / 78 / 64. *Bot:* pick the band of the lowest plate and rotate at the band's middle, with its skill's reaction time and speed error.

**Island Loop** (the island's ring road; chase camera)
- *Play:* Jog two laps of the ring road (r 19, 119 m a lap, about 34 s at the target 3.5 m/s). Alternate feet to run; speed = 1.4 m per step, so the target is 2.5 steps a second with a band of ±15%. A pace band (not too fast, not too slow) follows Retired Kevin, who runs ahead. The stick steers. Shells on the path. The island tilts under your weight as usual, so uphill and downhill are real. Trudy rides on your shoulder and asks questions at the worst time.
- *Whole run ✔,* real walker on the tilted disc at 3.6° of rest tilt: two laps in 69-74 s, never more than .4 m off the road. Time in the band 99% / 97% / 57%, assuming cadence error 3% / 8% / 16%.
- *Scoring:* time in the band + shells. *Bot:* steady cadence, steer the racing line. Solo only.

### BALANCE PLAY, with Trudy

**Fruit Hat** (end of the pier; barge offshore firing fruit; camera low from the sea side) — **build this event first. It is the game's soul and the proof of the model.**
- *Play:* You wear a wide basket hat. A barge fires fruit in high arcs. A shadow ring marks each landing spot. Lean to put the basket under it. **Fruit in the hat is not yet yours and it makes you top-heavy. Press Hop to toss everything into the crate at your feet:** that banks it, resets the load, and takes 1 s. Push your luck: more fruit before banking means a multiplier, but you wobble worse and may spill it all. A fall spills everything unbanked. Spiky urchins knock the basket and cost points. Old boots are heavy. A golden pineapple is worth five and very heavy. Flail shakes off whatever is on top.
- *Physics ✔:* Basket on the doll's body: cylinder (half-height .02, radius .36) at local y .75, mass .01, friction .9, plus 8 rim cuboids (.02, .1, .16) at radius .36, local y .85, mass .001. Fruit: ball radius .075, friction .8, restitution .1, CCD on. Fly 1.5 s from 7 m out to height 1.75 at the landing spot.
- *Tiers ✔, 60 s:* Tier 1: landing radius .45, one fruit per 1.6 s, mass .015, ankleMax 4.6, margin .45. Tier 2: radius .55, per 1.3 s, mass .012, ankleMax 5, margin .6. Tier 3: radius .65, per 1.0 s, same body.
- *What I measured on Tier 1 ✔:* a sharp bot banking at 7 banks about 28 fruit with no falls. **The same bot never banking falls twice a minute.** A clumsy bot banking at 5 banks 25-30 with no falls; banking at 9 it sometimes falls. That is the whole design working. Lean only for a fruit in its last 0.95 s of flight: chasing every fruit at full lean makes you whip and fall. **I also ran this through a whole integrated build, with the bot pressing a stubbed pad ✔:** the sharp bot banking at 7 scored 47.8 raw in 4 banks with no falls, never banking fell exactly twice, and the clumsy bot banking at 5 scored 43.5 with no falls. So the numbers survive the real input path. Set `par` near 52 on Tier 1.
- *Scoring:* bank value × (1 + 0.1 × (fruit in that bank − 1)), so bigger banks pay more. Unbanked fruit at the whistle counts half. *Bot:* as measured, with `skill` setting lag and noise.

**Room Service** (a long boardwalk out to a far cabana; chase camera from behind and above)
- *Play:* Carry a tray of tumblers along a narrow boardwalk. **Alternate feet to step** (same foot twice is a stumble). Each step rocks you a little. Leaning steers sideways too. Wind gusts are telegraphed for a full second by ink streaks and a rising sound, **and the Balance Disc shows a green zone where to lean.** Gary swoops for a glass on Tier 2+. Wobbly planks on Tier 2+. Off the edge: splash, respawn at the last buoy with one fewer glass. Deliver what is left to the table. The lesson the game teaches: **small early leans keep the glasses, sudden big ones throw them.**
- *Physics ✔:* margin .8, ankleMax 6, **reflex 5** (slower than the default, so moves are smooth). Tray: cuboid (.3, .02, .3) at local (0, .5, .3), mass .04, friction 1, on the doll's body. Five tumblers: cylinder half-height .06, radius .05, mass .012, friction .9, restitution 0, angular damping .5, linear damping .1. Foot: steps set a target speed of .55 m / .42 s, the foot low-passes to it with τ = .5 s, and it stops when no step has come for 1.6 cadences. Each step adds a rock of .2 N·m for .18 s to `nx`, and moves you sideways by `leanX × .25 × .55`. The boardwalk is ±.8 wide.
- *Tiers ✔:* 30, 45, 60 m (24, 35, 47 s at a steady pace). Gusts 1.2, 2.0, 2.3 N·m for .5 s, about every 7, 6, 5 s. Glasses delivered of 5 with a brace of `.2 × gust` in stick units: Tier 1 5 / 5 / 5, Tier 2 3.8 / 4 / 4.5, Tier 3 2 / 4 / 3.5. With no brace: Tier 1 3.5 / 2.5 / 4, Tiers 2 and 3 none. **Gusts of 2.8 and up emptied the tray at every brace I tried, and over-bracing spills too:** a .6 brace on a 2 N·m gust leaves 2-4.8. No bot fell at these gusts. Do not raise them much.
- *Scoring:* 100 per glass + time bonus. *Bot:* steady steps, keep centred, brace at `.2 × gust` on the telegraph.

**Springboard** (the toy-block dive tower at the end of the pier; side camera, slow-mo side replay)
- *Play:* Pump the board by squeezing both feet as it goes down. Press Hop near the top to launch. In the air the stick rotates you, holding Hop tucks and spins you faster. Hit the water. **Two ways to win:** a clean entry (head or feet down within 12°) makes barely a ripple and earns Grace. A perfect belly flop (front flat within 20°) sends up a giant column of water, knocks Gary out of the sky, and earns Splash. Score is the better of the two times height. Anything else is "Technically a Dive."
- *Board ✔:* an analytic spring, not Rapier: `y'' = −ω²y − 2ζωy' − (pumping ? 8 : 0)`, with ω = 2π / .9 s, ζ = .035, starting from a small bounce. Upward speed after 3 / 5 / 7 s of pumping: 4.7 / 6.5 / 7.6 m/s with good timing, 3.6 / 4.6 / 5.2 a little late. A quarter period late (.26 s), it barely moves (1.5 m/s). Pumping by reaction doesn't work, so give it a visible rhythm and a click. Launch speed = `max(3, upward speed at the press)`, so nobody is stuck.
- *Air ✔:* air time 1.5 s from a 5 m tower at 4 m/s, 2 s at 7 m/s, 2.3 s from 9 m at 7 m/s. The stick sets a target spin up to 3.4 rad/s (195°/s), reached at 9 /s; tuck multiplies it by 1.8. Free the balance core in the air: remove the joint and apply this as torque. Hit chance if you stop by eye with a timing error of 80 / 150 / 250 ms: Grace 56% / 32% / 19% at full stick, 83 / 53 / 33 at half stick, 33 / 18 / 12 tucked; Splash 80 / 51 / 32, 98 / 78 / 53, 52 / 29 / 18. So slow spins are safer, and tucks are for showing off.
- *Whole run ✔,* pump then launch then a real spinning body, over 40 dives each: launch speed 5.4 / 3.8 / 3 m/s, height from a 5 m tower 6.5 / 5.7 / 5.5 m. Belly flop hit rate 43% / 35% / 13% at full stick, 85 / 68 / 45 at half stick. Head first 35 / 20 / 5 at full stick. **Half stick is too slow to get head first from the 5 m tower** (0% for everyone); it works from 9 m (40 / 0 / 0). Letting go, the spin coasts on for about 22° at full stick, so release early.
- *Tiers and scoring:* three dives, best two count. Towers 5, 7, 9 m. Grace = `100 × (1 − error / 12°)`, Splash = `100 × (1 − error / 20°)`, each × `(1 + (height − 5) / 10)`.
- *On entry:* swap to the ragdoll with a simple upward force below y = 0. Keep a 2 s ring buffer of the doll's transform and replay the best flop at ¼ speed.
- *Bot:* pump in phase, then pick a flop or a dive. Good attract-mode comedy.

**Tippy Raft** (a round raft at sea; high wide camera; party event) — the one event where players physically fight, and Group Class's reason to exist.
- *Play:* 2-4 dolls on a raft. They walk with the stick. Flail shoves in a short cone. Hop hops. The raft tilts toward the sum of everyone's weight using the island's model (below), so everyone is on the same seesaw. **Swells** rock it from random directions, each warned by a rising wave. Sections float away over time. Off the edge: splash, out. Last doll standing wins the round; best of three. Solo in Free Play against three bots.
- *Numbers ✔:* radius 6, losing 1 m every 12 s down to 2. Tilt model K 6, C 3.5, 14° for one doll at the rim, clamped to 26°. Slope push `tilt × 10`. Walk 3 m/s. Swell about every 6 s: adds 2.5 rad/s to the tilt velocity. Shove: within 1.3 m, gives the target 6 m/s, decaying at 3 /s, with a 2 s cooldown. Over 16 rounds with one sharp, two average and one clumsy bot: rounds lasted 10-55 s, 29 s on average; wins 6 / 8 (between two bots) / 2. So skill helps and doesn't decide it. (Without swells and at a slow shrink, rounds never ended: everyone just stands in the middle.)
- *Scoring:* form = 40 + 30 per round won. *Not in the hub's set.* It needs a shared world, and the session is ghost mode. *Bot:* stay toward the centre and the high side, go at whoever is close, shove when in reach.

### THE FINALE

**The Grand Hold** (lighthouse gallery at sunset; camera circles slowly, the whole cast and island below)
- *Play:* Your balance is now tied directly to the island: your lean tips everything below you. Four 20-second phases, each a remix: a Pose with breath; four stones on your head; storm gusts with Gary; a short Step Class in the wind with the class cheering from below. Then the last hold: 15 s, the ring shrinking to the centre, sway fading as you succeed, the final notch coming up.
- *Rules:* It cannot be failed. A fall means the class catches you with a stretched bedsheet and the phase restarts. The ending plays on completion. Medals are given anyway ("Exemplary, I suppose").
- *Whole run ✔:* pose at (.3, .1) with sway .1; four stones on a head plate with sway .12; gusts of 3 N·m with a telegraph; lean cues; last hold with sway fading from .2 and the ring from .3 to .08. No bot needed a single restart, and it takes 95 s. Time in the ring on the last hold: 98-100% / 47-93% / 30-44%. **At the end of the stones phase, remove the stones, step once, then remove the head plate** (section 4): doing both together is what crashed Rapier for me.

### Island physics (hub, Island Loop, Tippy Raft, finale) ✔

**Do not move the island. Tilt gravity.** Rapier sees a fixed flat disc; the visual island group rotates; gravity is set to match each step. All the physics stays in island-local coordinates, with no moving-platform problems to solve. Up to 11° of tilt, a walker's height stayed within 0.004 m, and 60 props slid to the low side with none lost. (A kinematic platform also worked, but it is more to manage: I only took it to 1.8° and props rolled off.)

```js
// tx, tz = tilt in radians, toward +x and +z (that side goes down). dt = 1/120.
vx += (K*restX + W*p.x - K*tx - C*vx) * dt;  tx += vx * dt;   // p = walker position; K 2.2, C 1.8
vz += (K*restZ + W*p.z - K*tz - C*vz) * dt;  tz += vz * dt;   // W = K * rad(4) / 22 → 4° at the rim
world.gravity = { x: 9.81*Math.sin(tx), y: -9.81*Math.cos(Math.hypot(tx,tz)), z: 9.81*Math.sin(tz) };
const a = Math.hypot(tx,tz) || 1e-9, s = Math.sin(a/2);
islandGroup.quaternion.set(tz/a*s, 0, -tx/a*s, Math.cos(a/2));     // +x side down is about -z
```
- Everything on the island is a child of `islandGroup`, including the player and props, using island-local coordinates. Keep the doll visually upright by counter-rotating most of the tilt.
- Disc collider radius 22, friction .9. A low toy fence around the rim, physically 40 cuboids of half-size (.15, 1, 1.9), keeps props on. Props pile up against the fence on the low side: this is a good joke, so leave it.
- Walker ✔: capsule (.5, .3), mass 1, `lockRotations()`, friction 0 with Min combine rule, `setCanSleep(false)`. Each step `setLinvel(wantedX + tx*3, v.y, wantedZ + tz*3)`, so the slope pushes you a little. Walk speed 4 m/s.
- Props must be `setCanSleep(false)`, or they will not notice gravity changing.
- The sea and horizon stay level; only the island tilts. The level horizon against the crooked lighthouse is what sells it.

---

## 7. Screens

**The 10-foot rules.** All UI is a DOM overlay over the canvas. Lowest text size is 30 px at 1080p; body text 36+; titles huge. Keep a 5% safe margin. At most six choices on a screen, not counting a page switcher. Longer lists are split into pages. One idea per screen. No tables, no scrolling lists of data, no small print except on About, which is paged. Every focusable thing has a thick, bouncing, inked focus state, and hover moves that focus. Default font: Fredoka (section 16). UI elements look like paper tags and wooden signs with inked borders, each slightly rotated, never a web form.

| Screen | What's on it |
|---|---|
| Boot | A quick "Stretching..." and a wobbling Trudy. If no renderer can start, a plain message saying WebGPU or WebGL2 is needed |
| Title | The crooked island; beam-mounted title; "Press [glyph]" |
| Main menu | Programme (or Continue), Group Class, Free Play, Journal, Settings, About/Credits |
| Who's here? | Up to four mats with dolls; new profile: name spinner, paint |
| Island | The hub. Trudy follows and comments. Today's Plan on Triangle or T, and on the notice board |
| Today's Plan | Up to four big cards, done ones stamped |
| Intro Card, Countdown, Play, Results | Section 6. HUD: disc bottom left, one big score top right, time top centre, event widgets, prompts along the bottom showing only this event's verbs |
| Jar | 3D scene: marbles pour, the count ticks up, unlock toast |
| Check-In, Age Reveal | Section 5 |
| Journal | Page 1: calendar with stamps. Page 2: the Wobble Age graph, as a big inked line and three big numbers. Page 3+: medals shelf, up to 8 per page. Page last: silly totals (Floor Exercises, Minutes, Marbles) |
| The Mirror | Paint and hat picker on a doll that spins; locked ones show a marble count |
| Group Class | Section 12 |
| Pause | Resume, Restart, How to Play, Settings, Dev Mode, Leave Class (to island). Stops the sim |
| Settings | Four pages. Sound: Music (default **10**), Sound, Voice. Controls: glyph style, rumble, auto-breathe, rhythm offset. Display: UI scale, ink strength, reduce shake, fullscreen. Game: difficulty, reset save (with an in-game confirm). Sliders move with left and right, drag with mouse |
| Dev Mode | Section 14 |
| About / Credits | Section 19 |
| Ending | Section 5 |

Transitions use an ink-blot wipe: add a `wipe` uniform to the post chain, mixing to ink colour where a noise value is below it. Dialogue: a paper speech tag in the lower third with the speaker's name, text typing out in time with the voice. Use to advance, or it auto-advances for barks. Everything spoken is on screen; there is no audio-only line.

---

## 8. Cast and writing

**Writing style.** Short sentences. Polite. Second person. Chirpy and calm, with something slightly off. Instructions are plain and exact, then a small, sincere, odd aside. Praise is mild and specific. Every failure gets a line that makes it fine. The joke is the straight face. Write at least 200 Trudy lines, 60 for each instructor, 60 for guests, in `src/data/dialogue.js`, by situation, picked without repeats.

**Trudy, Head of Alignment.** A chunky spirit level on two stubby pegs. Her bubble is her eye: it slides to the high side of the world, and to wherever she is feeling. She has been crooked with the island since she was installed and thinks of this as normal. Fussy aunt energy. Keeps count of everything and insists she isn't. She gets attached to you and would die before saying so.

- "Oh! You came back. I wasn't counting. It's been one day, four hours and some minutes."
- "Please step on. Not on me. On the island. I'm a level, not a bath mat."
- "Lean left. Your other left. No, that was correct. I was testing you."
- "That was nearly level! I got a little emotional. My bubble went sideways."
- "Let's call that a floor exercise."
- "You fell very consistently. Consistency is important."
- "It's been three days. The island tilted a bit. I'm not saying those things are connected. They are connected."
- "Your Wobble Age is 61. That's down from 74! If this continues, you will eventually be born."
- "I didn't ask how old you are. I asked your knees."
- *Personal questions, always Yes/No, always a reply either way.* "Do you trust your knees?" Yes: "They speak highly of you too." No: "They know." · "Do you ever stand on one leg without knowing why?" Yes: "I thought so." No: "That's what someone on one leg would say." · "Have you been leaning on things? Be honest. I can tell." · "When you walk into a room, which way do you lean first?" Left / Right: "Interesting. I'm writing that down."

**Ms. Stillwater, Stillness.** A tall heron on one leg. Half-closed eyes. A voice like a slow door. She has never blinked on camera. She notices everything and is not bothered by any of it.

- "Breathe in. Breathe out. Not like that, but thank you for trying."
- "This pose is called the Apologetic Pine. Feel your weight. Feel it apologise."
- "If you are shaking, that is only your body leaving."
- "A heron can stand like this for hours. A heron has also never been asked why."
- "You got off the mat. I saw. It's all right. I see everything. It's all right."

**Coach Bolster, Strength and Cardio.** A vast walrus in a sweatband with a whistle he always forgets to blow. Loves you unconditionally and loudly. Bad at counting, on purpose.

- "YOU'RE DOING IT. I don't know what it is, but you're doing it."
- "That's the last one! ...THIS one's the last one. I've lied to you and I'd do it again."
- "I believe in you as much as I believe in lunch."
- "Your form is a form! That's what form is!"

**Guests,** all peg dolls in different paint and hats. They wander, watch your classes and react: Gentle Margaret, Retired Kevin, Both Sandras (two dolls, always together, always agreeing), Unsteady Paul, Young Gerald (92). **Gary** is a gull. He steals things and lands on you, turning up in several events. In the finale he sits on your head and Trudy says, "He's part of it now." Nobody ever mentions that everyone is a wooden toy.

---

## 9. Art bible

The look is **sun-bleached Japanese resort postcard meets wooden toy box, drawn in ink.** I rendered this cast and these materials with the recipe below and they read clearly on a TV-sized frame ✔.

**Base style.** TASK.md says to use the engine's native style as the base. Three.js has no house style and no asset library, so the base is its own toolkit: node materials, lights, shadows and TSL post-processing, with its built-in geometries and addons for generic props. Everything that makes the game feel like itself (the cast, the island, the jar, every event's props) is a new asset made in code.

**Detail.** The performance budget is unlimited, per TASK.md. Fill the sets: lots of guests, loose props, toy trees, bunting, particles, extra lights where a scene wants them. FPS targets and optimisation are out of scope.

**Palette ✔ (all four rendered and checked).** Ink `#1A1420` on everything. Seat colours are the hub's: `#E8443A`, `#3B82F6`, `#22C55E`, `#F5B700`.

| Time | skyTop | skyMid | skyLow | sea | seaHi | sun, intensity | hemi sky, ground, intensity |
|---|---|---|---|---|---|---|---|
| dawn ✔ | 8FB4E0 | F6CFD8 | FFE3B5 | 3E8FB5 | A9E3E4 | FFE6D8, 2.6 | FCE8F0, 7C8BB5, 1.35 |
| noon ✔ | 6FC3E8 | BFE9F0 | FFF2D0 | 16A8B0 | 8CF0DD | FFFBE8, 3.2 | FFFFFF, A09080, 1.35 |
| golden ✔ | 7FB7C9 | F7D9A6 | F59E6C | 1F9EA3 | 71DCCB | FFF0D0, 3.1 | FFF4E0, 8A7FA0, 1.25 |
| dusk ✔ | 2B2F6B | A8558F | F58A5C | 24406F | C26A8C | FFB98A, 2.4 | B48AD0, 2B2F5F, 1.1 |

Lerp palette uniforms and lights over 3 s between steps.

**Materials ✔.** Everything solid is cel-shaded: `MeshToonNodeMaterial({ color, gradientMap })` with a 3-step `DataTexture` ramp `[96, 178, 255]`, `NearestFilter`, `NoColorSpace`. `renderer.toneMapping = THREE.NoToneMapping` keeps the palette true. Sky and sea use `MeshBasicNodeMaterial` with a TSL `colorNode`. Anything that should get a hull outline must be a toon material.

**Shadows ✔.** `renderer.shadowMap.enabled = true`, `PCFShadowMap`, one sun with a 2048 map, `shadow.bias = -0.0006`, `shadow.normalBias = 0.035`. Without those two, the toon surfaces are covered in acne.

**The ink recipe ✔** (runs on WebGPU and on the WebGL2 fallback, tested in Chromium and WebKit):

```js
import * as THREE from 'three/webgpu';
import { mrt, output, normalView, toonOutlinePass, color, float, vec2, vec4, uv, screenSize, Fn, abs, max,
  smoothstep, mix, uniform, perspectiveDepthToViewZ, time, length, hash, floor, oneMinus } from 'three/tsl';

export function makeInk(renderer, scene, camera) {
  const INK = 0x1a1420;
  const u = { hull: uniform(0.0028), width: uniform(1.4), boil: uniform(0.5), fadeNear: uniform(30), fadeFar: uniform(90),
              grain: uniform(0.02), near: uniform(camera.near), far: uniform(camera.far), ink: uniform(new THREE.Color(INK)) };
  const scenePass = toonOutlinePass(scene, camera, color(INK), u.hull, float(1));
  scenePass.setMRT(mrt({ output, normal: normalView }));
  const colorTex = scenePass.getTextureNode('output'), normalTex = scenePass.getTextureNode('normal'),
        depthTex = scenePass.getTextureNode('depth');
  const post = new THREE.PostProcessing(renderer);
  post.outputNode = Fn(() => {
    const cell = floor(uv().mul(vec2(40, 23)));
    const wob = hash(floor(time.mul(8)).add(cell.x).add(cell.y.mul(17))).sub(0.5).mul(u.boil);   // hand-drawn line boil
    const px = u.width.add(wob).div(screenSize);
    const viewZ = (o) => perspectiveDepthToViewZ(depthTex.sample(uv().add(o)).r, u.near, u.far);
    const n = (o) => normalTex.sample(uv().add(o)).xyz;
    const dx = vec2(px.x, 0), dy = vec2(0, px.y);
    const z0 = viewZ(vec2(0, 0)).abs();
    const dz = max(abs(viewZ(dx).sub(viewZ(dx.negate()))), abs(viewZ(dy).sub(viewZ(dy.negate())))).div(z0.max(0.5));
    const dn = max(length(n(dx).sub(n(dx.negate()))), length(n(dy).sub(n(dy.negate()))));
    const e = max(smoothstep(0.05, 0.12, dz), smoothstep(0.7, 1.1, dn)).mul(oneMinus(smoothstep(u.fadeNear, u.fadeFar, z0)));
    const c = mix(colorTex.rgb, u.ink, e);
    const p = floor(uv().mul(screenSize));
    const g = hash(p.x.add(p.y.mul(1571))).sub(0.5).mul(u.grain);
    return vec4(c.add(g).mul(oneMinus(length(uv().sub(0.5)).mul(0.62).pow(2.2))), 1);
  })();
  return { post, u };
}
// Render with post.render(). Remember: camera far changes need u.far updated.
```
Gotchas ✔:
- TSL `hash()` takes **one float**. Give it a vec2 and you get vertical streaks over the whole image.
- `fadeNear/fadeFar` removes depth-line noise at the horizon, which otherwise draws a thick black band. Make sure the sea disc is big (radius 590) and blends to `skyLow` with distance.
- Do not merge vertices on hard-edged props: smooth normals smear the toon shading. Plain `BoxGeometry` looks right, and the depth lines cover the hull's corners.
- `InstancedMesh` with `setColorAt` works with toon and the hull ✔. Use it for marbles, splash blobs, fruit crowds.
- Glass ✔: **do not use a toon material on glass.** The hull pass draws solid ink back faces behind it and the glass turns smoky grey. Use `MeshBasicNodeMaterial({ color: 0xe8fbff, transparent: true, opacity: 0.16, side: DoubleSide, depthWrite: false })`, and draw its outline with thin toon torus rings at the base, shoulder, neck and lip, plus a couple of narrow white highlight strips. It looks like a clean inked glass jar.
- No TSL compute anywhere. It breaks the WebGL2 fallback. All particles are CPU-driven instances.

**Sea ✔.** `length(positionWorld.xz)` into a `sin` with a small domain warp and `time`, then `step(0.86, wave)` between `sea` and `seaHi` for hard bands, mixed to `skyLow` by distance from the camera (60 to 260 units). Add a foam ring near the island by distance from its centre, plus rings that follow the tilt.

**Sky ✔.** Inverted sphere radius 600, `mix` of the three colours on the view direction's y (`smoothstep(0, .14)` and `smoothstep(.1, .5)`). Add inked toon clouds as flattened spheres that drift.

**Model recipes ✔ (all primitives, all parented to named joints).** Build in code from `SphereGeometry` (scaled), `CapsuleGeometry`, `CylinderGeometry`, `ConeGeometry`, `TorusGeometry`, `LatheGeometry`, `TubeGeometry` and `RoundedBoxGeometry` (from `three/addons/geometries/RoundedBoxGeometry.js`).

- **Peg doll, 1.5 m.** Feet: white flattened spheres r .1 scaled (1, .55, 1.5), at x ±.13. Legs: skin capsules r .08, length .3. Hips at y .46. Shorts: capsule r .2 (scaled 1.05, 1, .85). Shirt: capsule r .21, length .24 (z scale .82). Head: sphere r .23, centre .82 above hips. Headband: torus r .228. Eyes: ink spheres r .024 at (±.08, .85, .205) from hips. Cheeks: pink flattened spheres. Arms: visible darker wooden ball joints r .075 at shoulders (±.26, .5) and r .06 at elbows, skin capsule segments, white mitten spheres r .07. Skin `#F2D3A8`, joints `#D9A86C`, shorts `#2B4A6F`. Vary with paint, hats (visor, beret, bucket hat, perm of spheres, wizard hat, tiny crown), and small height and width changes for guests.
- **Trudy.** Rounded box (1.1, .42, .26), radius .1, `#F5B700`, on two stubby brown pegs. Dark window (.56, .2, .05) on the face holding a lime `#B9F26B` capsule vial r .075, length .36, lying on its side. Bubble: white flattened sphere with an ink pupil; it slides in the vial. Two ink marks on the vial like a level's centre lines. Round lime end vials at x ±.42 as cheeks. Ink torus arc for a mouth. She hops with squash and stretch. This design is very readable: keep it.
- **Ms. Stillwater.** One long orange leg (cylinder r .025, height 1.05), the other tucked. Body sphere r .34 scaled (.8, .92, 1.35), `#A9C2D4`. Wings: flattened ellipsoids `#7E9CB4`. S-curve neck: `TubeGeometry` of a Catmull-Rom curve, r .062, `#D6E3EC`, rising to y 2.2. Head sphere r .115. Beak: yellow cone. Ink crest cone. Half-closed eyes as ink torus arcs. A small `#C24D6A` scarf at the base of the neck. For animation, build the neck from 5 joint segments.
- **Coach Bolster.** Capsule r .72, length .5, scaled (1.06, 1, .9), `#B9806A`. Red sweatband torus at the top. Two pale muzzle spheres, cream cone tusks, tiny ink eyes, flattened flippers `#8D5F4F`, a white lanyard torus and a yellow whistle.
- **Gary the gull.** White ellipsoid body, grey flattened wings, yellow cone beak, orange peg legs, ink dot eyes and one permanently angry brow.
- **The jar ✔.** `LatheGeometry` through (.01,0) (1,.02) (1.08,.12) (1.08,1.9) (.86,2.2) (.86,2.45) (.95,2.5) with the glass recipe from the gotchas above; rings at (r 1.08, y .12), (1.08, 1.9), (.86, 2.2), (.95, 2.5). Marbles: `InstancedMesh` of toon spheres r .14 with `setColorAt`. Physics: a base cylinder and a ring of 16 cuboid walls.
- **Island.** Sand disc r 22 over a grass disc r 15 (flush with the sand, or dolls sink into it: all walking surfaces share y = 0), big inverted rock cone below on its one pivot rock. Toy trees: peg trunk plus ball top. Lighthouse: stacked red and cream rings with a lamp and a blue cap. Pavilions: toy-block posts and rounded slab roofs in teal and orange. Sun Deck, Bandstand, Circus Green, Yard, Pier, Jar, Mirror pavilion, Notice Board, Gazebo, Bed Hut at fixed spots around the rim and centre. Every set in section 6 appears here as a landmark, and the class itself runs in its own world (section 16).
- **Island map** (island-local x, z; you arrive at 0, 10; the ring road for Island Loop runs at r 19):

| Landmark | x, z | What's there | Landmark | x, z | What's there |
|---|---|---|---|---|---|
| Lighthouse | 2, −9 | The Grand Hold | Bandstand | 15, −3 | Step Class |
| Jar | −3, −4 | Marble pours | Boardwalk gate | 19, 3 | Room Service |
| Circus Green | 0, 2 | Plate Spinners | Pier | 15, 12, running out to sea | Fruit Hat, Plank & Perch, Springboard tower at its end |
| Sun Deck | −16, −3 | Poses | Beach | 5, 17 | Tug of Peace |
| Lily Pond | −13, 7 | Still Water | Notice Board | 1, 9 | Today's Plan, Journal |
| Quarry Terrace | −9, −13 | The Cairn | Bed Hut | 8, 8 | End of the day |
| The Yard | −7, 14 | Log Reps | Mirror pavilion | 9, −14 | Paint and hats |
| Gazebo | 14, −11 | Group Class, Tippy Raft's dock | | | |

  Guests wander between these spots on simple paths in island-local coordinates. They need no physics.
- **Comic touches.** Inked world-space words: CLACK!, SPLOSH!, WOBBLE. Canvas-texture sprites that pop and fade. Everyone squashes on landing. A small hit-stop on catches and big events. Gentle camera shake, off with reduce-shake.

---

## 10. Animation

Use Three's `AnimationMixer` and `AnimationClip` as the base (TASK.md requires the engine's system). Rig each character as a hierarchy of named `THREE.Group` joints with the rigid parts parented to them: `root, hips, spine, head, shoulderL/R, elbowL/R, hipL/R, kneeL/R, ankleL/R` for dolls. No skinned meshes are needed for jointed toys. `poseClip(name, duration, keyframes)` in `src/anim/clips.js` compiles `{ t, pose: { shoulderL: [x, y, z in degrees], ... } }` into `QuaternionKeyframeTrack`s on `'shoulderL.quaternion'`. `AnimationMixer` plays them with `crossFadeTo`.

- **Doll clips:** idle, breathe, walk, jog, hop, land, cheer, clap, shrug, bow, flail, sleep, one per pose (8), squat (scrubbed: `action.paused = true`, `action.time = depth × duration`), plank, sit cross-legged, lean-back tug, hip-circle (scrubbed by hoop phase), step-L, step-R, carry-tray, hold-slab, tuck, pike, dive-ready.
- **Trudy:** hop, idle wobble, gasp, sulk, faint, read clipboard; plus procedural squash and bubble.
- **Heron:** stand, slow demo versions of each pose, neck bow, head turn, pat. **Walrus:** bounce, clap, huge inhale, salute, catch log. **Gull:** fly, land, peck, squawk.
- **Layering order each frame:** `mixer.update(dt)`, then apply procedural lean from the balance core at `root`, head bobble, breath on spine. Then, while ragdolled, parts follow bodies instead.

**Ragdoll from the rig ✔ (10 bodies, stable).** When a doll falls, create one dynamic body per segment at the segment's world transform (body origin at the joint, collider offset along the segment). Reparent the segment's visual to the scene (`scene.attach`) and copy each body's transform to it each step. Use spherical joints with `setContactsEnabled(false)` and the ragdoll collision bits. Tested: capsules torso (hh .2, r .22, m .45), head (.02, .2, .15), upper arm (.1, .07, .05), lower arm (.1, .07, .04), upper leg (.13, .09, .08), lower leg (.13, .08, .06), linear damping .05, angular damping .6, friction .7, restitution .15. Max speed 7 m/s, no NaN, settles in about 5.5 s; end it at `recoverTime`. Start it with the core's velocity and a small impulse on the head. On recovery, `attach` the segments back and restore their local transforms.

Ghost lanes do not ragdoll: they play a flop clip.

---

## 11. Audio

Everything is synthesised with Web Audio. No files. All instruments take a `ctx` argument, so the same code runs on an `AudioContext` and on an `OfflineAudioContext` for tests.

**Mix.** `buses (music, sfx, voice) → master compressor → destination`. Settings 0 to 100. **Music defaults to 10** (gain 0.10), sound 80, voice 80. Start the context on the first gesture, including pad input (section 3); before that the game runs silently without error. In a hub session, stop all sound on `end`.

**What I could check without ears ✔** (TASK.md's stand-in: render it and read the signal). I wrote the FM e-piano, bass, foot click and voices from this section and rendered them with `OfflineAudioContext`. All 21 notes of the title motif came out at the written pitch class (19 exact; two read an octave low by autocorrelation, likely the detector). With backing, the peak is −2.1 dB with nothing clipped. **With music at 10 and sound at 80, a foot click stands +17.6 dB above the music just before it (weakest +7 dB),** so Step Class's beat is readable. In a real-time run an `AnalyserNode` on the music bus heard the motif, at bus gain .10.

**Music engine.** Look-ahead scheduler (25 ms tick, 150 ms ahead) on `currentTime`. Reverb from a `ConvolverNode` with a generated noise-decay impulse. Tracks are data: `{ bpm, swing, chords per bar, parts }` in `src/audio/tracks.js`. Instruments: FM electric piano (sine carrier with a 14:1 tine and a 1:1 body, fast index decay), slap bass (saw through an enveloped low-pass plus a click), marimba (sine plus 4× partial, fast decay), vibes (sine plus 4× partial and tremolo), pad (three detuned saws, low-pass, slow attack), FM brass stab, breathy flute (sine plus band-passed noise), kick (sine sweep 120→45 Hz), gated snare (noise into short reverb), brushes and shaker (filtered noise), woodblock, rim.

**Score.** Original smooth city-pop and bossa, nothing like the source's music.

| Track | Where | Feel | Chords per bar |
|---|---|---|---|
| Level Best | Title, menus, ending | 92 BPM light swing; e-piano, vibes lead, soft bass, brushes | D♭maj9 B♭m9 E♭m9 A♭13, twice; G♭maj9 Fm7 E♭m9 A♭13sus |
| Island | Hub | 84 BPM bossa; marimba, upright-ish bass, shaker | Fmaj7 Am7 B♭maj7 C9, Fmaj7 Dm9 Gm9 C13 |
| Stillness | Poses, Cairn, Still Water | 60 BPM, free; pad, bells on the breath cycle, flute | Dmaj9 Emaj9/D, slowly, Lydian |
| Strength | Log Reps, Plank, Tug | 100 BPM funk; slap bass, clav-like e-piano, brass stabs, gated snare | Em9 A13 |
| Cardio | Step Class, Plates, Loop | Bpm from the chart; four-on-the-floor, octave slap bass, e-piano, brass, gated snare | D♭maj7 Cm7 B♭m7 E♭sus |
| Balance | Fruit Hat, Room Service, Springboard, Raft | 118 BPM bouncy; marimba, pizzicato, woodblock, tuba-like bass | C6 Am7 Dm7 G7 |
| Level | The Grand Hold | Starts as bare e-piano of the title theme, then every instrument, slower, in tune | As Level Best |
| Stings | Results, reveal, unlock | Three seconds or less, one per medal, drum roll and reveal, little fanfare | |

**Title theme motif** (use as written; MIDI, on a 16-step bar, `[step, note, length]`):
```
Bar 1 D♭maj9: [0,77,3] [3,75,1] [4,73,2] [6,68,4] [12,70,2] [14,72,2]
Bar 2 B♭m9:   [0,73,3] [3,72,1] [4,70,2] [6,65,6] [14,68,2]
Bar 3 E♭m9:   [0,70,3] [3,68,1] [4,66,2] [6,63,4] [12,65,2] [14,66,2]
Bar 4 A♭13:   [0,68,3] [3,70,1] [4,72,2] [6,75,6]
```
**Out-of-tune island.** While the rest tilt is above zero, detune every music note by `tilt° × 1.6 × sin(t × 0.7)` cents. At level, it is exactly in tune. The player will feel this before they notice it.

**Voices.** Animalese-style gibberish. Each line is spoken from its own text: strip it to letters, walk the letters at the character's rate, and for each syllable-group fire a short blip: a pulse or saw oscillator at the character's pitch with slight random drift, through two band-pass filters at formants picked by vowel (a, e, i, o, u, each with a set F1 and F2), 60 ms envelope; consonants add a very short noise tick. Pitch rises on `?`, jumps up on `!`, falls at the end of a sentence. Occasional set exclamations in nonsense Simlish ("Wobba-la!", "Oof-ah.", "Nee nee!"). The text types out in time. **Balance the voices ✔:** at equal settings Trudy's narrow formant filters peaked at +1 dB (clipping, rms −20 dB), while Ms. Stillwater and Coach Bolster sat near −30 dB rms. Give each voice its own gain so all peak around −6 dB. Spaces and punctuation bring the real rate down to about 12.7, 5.5 and 8.7 blips a second for the rates below.

| Voice | Base pitch | Rate | Character |
|---|---|---|---|
| Trudy | 420 Hz | 16 syll/s | squeaky, nervous, high formants |
| Ms. Stillwater | 170 Hz | 7 syll/s | breathy, adds noise, long gaps |
| Coach Bolster | 95 Hz | 11 syll/s | big, saw, loud, bursts |
| Guests | 200-320 Hz | 12 syll/s | varied per guest |
| Gary | | | FM squawk |

**SFX** (`src/audio/sfx.js`, all parameterised, with small random variation): wood clack (three resonant noise bursts, tuned per limb), toy spring (rising sine with vibrato), splash (noise with falling low-pass, big or small), marble drop and roll (short high pings, pitch random, more as the jar fills), plate hum (sine following speed), plate crash, fruit thud, urchin spike, whistle, bell, breath in and out (filtered noise), wind gust (rising band-passed noise), wooden creak (for the island: slow saw through a resonant filter), UI move, confirm and back (woodblock tones), stamp thud, drum roll, foot click.

---

## 12. Multiplayer

**Two modes, both required.** On one screen by itself (Group Class, as the hub's own docs say couch play stays the game's own, up to four controllers), and across devices in an AI Hub session. Both use the lane system, so they cost little beyond it.

### Group Class: on its own, 1-4 on one TV

From the main menu or the Gazebo. **Lobby:** four mats. Each pad's Cross joins it, Enter or a click joins keyboard and mouse as one player, Circle or Esc leaves. Seats use the hub's colours. The first to join drives menus. **Playlist:** Quick Class (three random) or pick three. All events with `couch: true`: Poses, Cairn, Log Reps, Step Class, Plate Spinners, Fruit Hat, Springboard, Tippy Raft, Tug of Peace, Room Service. **Points:** 4, 3, 2, 1 per event. **Final podium:** a toy-block podium, winners on top, and it tips over.

All lanes use one camera that frames everyone; each event's camera has a wide setting for this. Room Service uses four parallel boardwalks with the camera following the group, and the leader's finish starts a 15 s clock for the rest. Each lane reads its own pad by gamepad index, and prompts on that player's disc follow that device.

### AI Hub session: ghost mode, 1-4 devices

The contract is `https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/README.md`. Read it. I ran a minimal WebGPU ghost game built this way through the real harness and it passed all 16 checks at 1, 2 and 4 players, on the bad network, and with the host leaving ✔.

**Why ghost.** Every copy runs its own physics, and the others appear as dolls in the next lanes doing the same class: it looks exactly like a fitness class. It is robust to latency, because nobody's balance depends on the network.

**Head of the page, in this order** (the hub's check reads `name` then `content`, so keep that attribute order):
```html
<meta charset="utf-8">
<script>…vendor/session.js, verbatim, nothing before it…</script>
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="3">
<meta name="hub:session-goal" content="Stay balanced through the class: highest score wins">
<meta name="hub:session-howto" content="Lean: stick, WASD or mouse. Feet: L2 R2, Q E or clicks. Flail: Square or F">
<meta name="hub:type" content="Game">
<meta name="hub:players" content="1-4">
<meta name="hub:source" content="Wii Fit">
```
Do not set `hub:webgpu required`: the WebGL2 fallback works ✔, so the hub can deal this game to everyone. Fetch the client from `https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/session.js` into `vendor/session.js`. **The hub checks it by SHA-256** from its banner to its last line, with LF line endings: 1.4.0 is `529eac78c54cfff0e60d375a9c63f66d1a594327ddcc262a2bdf9b1f2fb6582a` ✔. Make the build fail if it doesn't match. If the hub has released a newer client, take its hash from `scripts/lib/hub-client.mjs` in that repo.

**The boot path** (first statements of `main.js`, before anything heavy). Wrap it in an async function: an `iife` build rejects top-level `await`.
```js
async function main() {
  if (AIHub.active) {
    const pConnect = AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true });   // hello must go out within 10 s
    await bootEngine();                       // renderer.init(), RAPIER.init(), build the world
    const info = await pConnect;
    if (info) runSession(info); else runStandalone();     // null: no hub after all
  } else { await bootEngine(); runStandalone(); }
}
main().catch(showBootFailure);                // shows the message, calls AIHub.fail(message)
```

**In `runSession(info)`:**
1. No title, menus or attract. Build the class stage, line up the dolls, then `AIHub.ready()` once, with no key press and without waiting for every shader. Register `AIHub.on` handlers before `ready()`.
2. **Your own card** (`card: true`). The class lined up on the deck, Trudy with a clipboard, the music. Overlay: the game's name, each player's name in their colour with a tick when ready (from `card.ready`), how to win, this player's controls with glyphs, time left from `card.left` (show "Starting..." when `card.starting`, "Paused" when `card.paused`). Enter or Cross or a tap: `AIHub.answer('ready')`. Triangle or M (name the key on the card) or a tap: `AIHub.answer('more')`. The harness presses Enter by dispatching a keydown on the page, so listen on `window`. Nothing on the card changes the round, and it never touches `Math.random`.
3. **The round runs on `AIHub.time()` alone,** so everyone is in the same class at the same moment. Count down from 3 while the time is negative. Three slots picked with `AIHub.rng('deal')` from the session set (Poses, Cairn, Log Reps, Step Class, Plate Spinners, Fruit Hat, Springboard), no repeats: each is 6 s intro, 50 s play (`sessionConfig` makes each event fit exactly), 6 s score. Total 186 s, within the 270 s limit that 3 minutes gives ✔. If time jumps (hidden tab), go to the slot the clock says.
4. **Ghosts.** From the moment `AIHub.time()` reaches 0, including during intros, about 10 times a second, `AIHub.send({ t:'g', a:slotIndex, x, z, lx, lz, c:clipIndex, f:fallen?1:0, s:score }, { reliable:false })`. Keep it well under 1,200 bytes. Show a ghost only when its `a` equals your slot. Interpolate over about 150 ms. Ghosts are visual only: name tag (set with `textContent`, never HTML), seat colour on the shirt, a flop clip for `f`. They never touch your physics. Remove on `leave`.
5. **Scoring.** Each slot gives `round(form × 10)`. Call `AIHub.progress({ score, label: 'Fruit Hat 420' })` every second **from the moment time reaches 0, with score 0 during the first intro.** The harness checks for ghost traffic and progress about 4 seconds into play, well before the first class starts, and fails the game if there is none. `AIHub.result({ score, stats, awards })` once at the end, for example stats `{ 'Floor Exercises': 2, 'Best medal': 'Pleasant', 'Wobble Age': 41 }`, and an award from a small list ("Suspiciously Still"). Then a calm "waiting for the others" with Trudy.
6. `time-up`: send `result` at once if not already sent (grace is 5 s ✔). `end`: stop input, sending and all sound, and keep the last frame; the hub draws its results over the game.
7. Options opens a small overlay with volumes only, and it doesn't pause. No restart, no quit, no Dev Mode.

**Session rules to keep:** no `alert`, `confirm`, `prompt`, `window.open` or navigation; no other network; no chat, emotes or custom names (so no wave button in a session); names only from the hub; all gameplay random numbers from `AIHub.rng(label)`.

**On its own:** `AIHub.active` is false and the game behaves as if the hub didn't exist. Pressing Enter and Space repeatedly on the title must be harmless and leave something drawn: the hub's check does exactly this.

---

## 13. Attract mode

After 10 s with no input on the Title or Main menu, start a loop of bot-played vignettes, about 18 s each, using the real events with bot lanes and god mode on: island walk with the island tipping, Fruit Hat (a greedy bot that topples), The Cairn, Step Class, Plate Spinners, Springboard (a belly flop with the slow-mo replay), Tippy Raft with four bots, Room Service, Poses. Show as much as possible, and let the bots cheat. Overlay: the title, small, and "DEMO · Press any button" with the current device's glyph. Loop forever, returning to the title for 5 s between passes.

**Any input exits and is swallowed:** a key, a button, a click, a stick past 0.3, or more than 8 px of mouse movement. It returns to the Title and does not act on that press. Audio plays if the context is already running; otherwise it is silent with no error. Never starts in a session.

---

## 14. Dev mode

From the Pause menu. It follows the same 10-foot rules: pages of big controls by group, six to a page, usable by pad, keyboard and mouse. Dev Mode is off in a session.

**Tools:** jump to any event and tier; jump to any day or step; skip to Results or to the Ending; god mode (no falls); time scale 0.1× to 4×; single-step; free camera; physics debug lines (`world.debugRender()` into a `LineSegments`); stats (fps, step ms, bodies, draw calls); input monitor (both sticks, triggers, last device); force a gust, a fall, a fruit or a stone; play any dialogue line, music track or sting; set Wobble Age; add marbles; unlock all; toggle ink and pick palette; let the bot play; reset save; copy tuning as JSON (to the clipboard, falling back to a large on-screen text so nothing needs a dialog).

**Live sliders with Reset to Defaults** (`src/data/tuning.js`: each entry `{ group, label, min, max, step, default }`; the whole game reads tuning live):
- *Balance:* maxLean, margin, zeta, ankleMax, fall angle, reflex, flail boost, flail cooldown, sway scale, tremor scale, recover time.
- *World:* gravity, island weight (° at rim), island rest tilt, island spring, walk speed.
- *Events:* fruit mass, fruit interval, landing radius, stone mass, stone interval, ring size at end, gust force, plate decay, plate gain, rhythm window, rep tempo, board gain, air torque.
- *Rewards:* marbles per minute, medal scale.
- *Ink:* hull, line width, boil, grain.

**For later designers.** TASK.md wants the rest of the game buildable with normal designer tools. So events' tiers, poses, charts, dialogue, days, unlocks, palettes and tuning are all plain data tables in `src/data/`. A designer can add a tier, a day or a line of dialogue without touching systems, and test it from Dev Mode. Keep it that way.

---

## 15. Touch-only devices

**Detect with media queries, not `maxTouchPoints`:** `matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches`. Playwright's iPhone profile reports `maxTouchPoints` 0 ✔.

Show the title with "Controller or keyboard required" and a Settings button that works by tap. There are no touch controls anywhere else. Attract mode runs after 10 s as usual, and a tap returns to this screen. If a pad connects or a key is pressed, drop this state and carry on normally. In a session the card's Ready and More time accept taps, per the hub's rules.

---

## 16. Architecture and build

**Where things go.** Keep all your dev files in the subfolder TASK.md names (your dev folder). Develop separate modules there, and bundle them into the single HTML file in the root, named as TASK.md says, when you're done. TASK.md allows external CDN dependencies; this plan inlines everything instead, so the file works offline and inside the hub.

**Stack.** `three@0.180.0` (import only from `three/webgpu` and `three/tsl`; addons from `three/addons/...` work ✔), `@dimforge/rapier3d-compat@0.19.3`, `esbuild`, `playwright@1.63.0`, `@fontsource/fredoka` (SIL OFL; put its name and licence in the credits). Web Audio and the Gamepad API directly. `npm i` these in the dev folder ✔; Playwright finds the browsers already here.

```
package.json
vendor/session.js
tools/build.mjs  tools/test.mjs  tools/shots.mjs  tools/hub/{harness.html,bridge.js,round.js}
src/main.js
src/core/      loop.js  rng.js  save.js  script.js  tuning.js
src/input/     input.js  glyphs.js  bot.js
src/render/    renderer.js  ink.js  palette.js  sky.js  sea.js  cameraRig.js  particles.js  comicText.js
src/art/       materials.js  doll.js  trudy.js  heron.js  walrus.js  gull.js  island.js  props.js
src/anim/      clips.js  rig.js
src/physics/   world.js  balancer.js  ragdoll.js  island.js
src/audio/     engine.js  instruments.js  tracks.js  sequencer.js  voice.js  sfx.js
src/ui/        ui.css  focus.js  hud.js  disc.js  speech.js  screens/*.js
src/game/      director.js  programme.js  checkin.js  jar.js  hub.js  profiles.js  results.js
               attract.js  devmode.js  groupclass.js  session.js  ghost.js  ending.js
src/events/    base.js  poses.js  cairn.js  stillWater.js  logReps.js  plank.js  tug.js  stepClass.js
               plates.js  islandLoop.js  fruitHat.js  roomService.js  springboard.js  raft.js  grandHold.js
src/data/      config.js  events.js  programme.js  poses.js  charts.js  dialogue.js  tuning.js
               palettes.js  unlocks.js  names.js  about.js
test/*.mjs
```

**The loop.** Fixed 1/120 s simulation. `frame(real)`: `acc += min(real, 0.25) × timeScale`; run `game.fixed(1/120)` up to 30 times; `game.frame(real)`; `post.render()`. That keeps the game on real time down to 4 fps ✔: with a 0.1 s cap at this computer's 6 fps, everything including attract's 10 seconds ran slow. Input polls inside the fixed tick. **All game logic and UI flow run on sim time, never `setTimeout`,** via a `game.after(sec, fn)` scheduler and generator scripts. This is what makes a whole-game test take a minute. Use generators for sequences: `function* dayOne(d) { yield d.say('trudy', 'intro.step_on'); yield d.wait(1); ... }`, ticked by `src/core/script.js`.

**Random numbers.** `src/core/rng.js` is the only file that may touch randomness. `rng(label)` returns `AIHub.rng(label)` in a session and a mulberry32 stream outside one. Cosmetics use a private stream. Never call `Math.random` directly. In a session the client seeds it for fairness, and stray draws don't matter, but nothing should depend on it.

**Renderer ✔.** `new THREE.WebGPURenderer({ antialias: true })`, `await renderer.init()`, then check `renderer.backend.isWebGPUBackend`. It falls back to WebGL2 by itself when there's no adapter ✔ (a harmless warning). Pixel ratio up to 2. Wrap boot in try/catch: if nothing starts, show the message and call `AIHub.fail(message)`. Watch `renderer.backend.device.lost` and record it, because a lost device gives you no error and a loop that seems to run (section 17). Performance is out of scope, per TASK.md: add detail freely. On this computer, with flags that really render, a simple scene runs at about 6 fps at 720p under software WebGPU ✔.

**Rapier ✔.** `import RAPIER from '@dimforge/rapier3d-compat'; await RAPIER.init();`. It works inlined with no extra file. It logs one harmless warning about deprecated init parameters. Fixed step: `world.timestep = 1/120`. Free each world with `world.free()`.

**Build ✔.** One self-contained HTML with no external requests.

```js
// tools/build.mjs (core; OUT is the file name and location TASK.md gives you)
import { build } from 'esbuild'; import { readFileSync, writeFileSync } from 'node:fs'; import { createHash } from 'node:crypto';
const session = readFileSync('vendor/session.js', 'utf8').replace(/\r\n/g, '\n');
const END = "})(typeof window !== 'undefined' ? window : globalThis);";
const hash = createHash('sha256').update(session.slice(session.indexOf('/*! aihub-session '), session.indexOf(END) + END.length)).digest('hex');
if (hash !== '529eac78c54cfff0e60d375a9c63f66d1a594327ddcc262a2bdf9b1f2fb6582a') throw new Error('not the released hub client');
const r = await build({ entryPoints: ['src/main.js'], bundle: true, format: 'iife', target: 'es2022', minify: true,
  write: false, legalComments: 'none', loader: { '.css': 'text' } });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const font = (w) => readFileSync(`node_modules/@fontsource/fredoka/files/fredoka-latin-${w}-normal.woff2`).toString('base64');
// Assemble with an array join, not String.replace: the bundle contains $ patterns that replace would corrupt.
writeFileSync(OUT, ['<!doctype html><html lang="en"><head><meta charset="utf-8"><script>', session, '</script>',
  METAS, `<title>${TITLE}</title><style>@font-face{…data:font/woff2;base64,${font(500)}…}…</style></head><body>`,
  '<script>', js, '</script></body></html>'].join(''));
```
The spike's bundle of Three and Rapier came to 3.2 MB ✔. Each Fredoka weight adds about 16 KB. Expect about 4-6 MB at the end. `format: 'iife'` means no dynamic imports. It opens from `file://` ✔.

**Fresh world per event.** Events get a new Rapier world and a new `THREE.Group`, added under one scene that also holds sky, sea and lights. The island is hidden during events, or kept far in the background as scenery where a set wants it. Transitions hide the swap with the ink wipe.

---

## 17. Testing

Follow TASK.md's rules: scripts that play the game and check its state, including a scripted playthrough of the whole game; one command that prints only failures and a one-line count; rerun it only after changing the code it covers; screenshots only for what a script can't check; no subagents or workflows to debate, review, judge or audit.

**Sharing this computer (TASK.md).** Other agents run here at the same time.
- Keep every file inside your own folder, not `/tmp` (it's shared) or a parent folder. Don't read the folders beside yours.
- Keep to one or two browsers at once and close them when done. "Target closed", "page crashed" or "browser has been closed" means memory ran out, not a bug: run fewer browsers rather than retrying.
- Don't run `playwright install` or `playwright install-deps`: the browsers are already here. `npm i playwright@1.63.0` finds them ✔. `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE` is already set; keep it if a script spawns a browser with a clean environment. If you want a Python tool, use `uv run --with ...`; this plan's tools are all Node.
- Prefer `file://`: every test except `hub` opens the built file directly. WebGPU only works on a secure page, `file://` or `http://127.0.0.1`. A server is only for the hub's harness, bound to 127.0.0.1 on a port the OS picks, and you confirm the page is your game before trusting a result.
- Stop only processes you started, by their PID. Never `pkill`, `killall`, `fuser -k`, or kill whatever holds a port.
- There is no display. A headed browser needs `xvfb-run`, and you shouldn't need one.

**Stand-ins for what this computer doesn't have.**

| Missing | Stand-in |
|---|---|
| Physical controller | Stub `navigator.getGamepads` (below) |
| Touch device | Playwright phone and tablet profiles (Pixel 7, iPhone, iPad), tapping with `page.touchscreen` |
| Someone to listen | `OfflineAudioContext` renders and `AnalyserNode` levels on the live mix |
| Second player | TASK.md suggests two browser pages. The hub's harness is that test, built for this: it plays 2-4 copies at once, in frames of one page, on a simulated network. Add four stubbed pads for Group Class |
| Real iPhone or iPad | WebKit with an iPhone profile; it isn't iOS Safari, so never require more than it shows |
| TV | Judge the 10-foot view from screenshots at 1920×1080 |

**The command.** `node tools/test.mjs [group ...]`. Groups: `unit`, `flow`, `events`, `balance`, `input`, `audio`, `hub`, `ui`, `full`. It prints each failure with its reason, then one line: `N passed, M failed`. Rerun only the group your change touches.

**Browser flags ✔ (use this set for anything that needs the renderer):**
```js
const RENDER = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-webgpu-adapter=swiftshader', '--use-vulkan=swiftshader', '--use-angle=swiftshader'];
```
- **Do not use TASK.md's three WebGPU flags alone. With them, Three's device is lost 0.2 s after startup ✔** ("A valid external Instance reference no longer exists"). `backend === 'webgpu'` stays true and the frame counter climbs at about 60 fps, but nothing is being drawn, and that is why the screenshots are black. It fooled me: I first reported that speed as real. With the two extra flags, which the hub's own `hub-check` docs also list, the device stays alive, frames are real at about 6 fps, and `page.screenshot` shows the true image ✔.
- **Every test that renders must assert `render.lost` is null.** "Frames rising" proves nothing by itself. Also read the screenshot back as pixels and check it has ink and a range of colours ✔.
- Logic tests don't need any of this: `?test=1&render=0` runs with no renderer at all, on plain Chromium.
- No flags at all: Chromium finds no adapter and falls back to WebGL2 (slowly) ✔. `channel: 'chromium'` new headless and headed Chromium under xvfb both aborted here with the WebGPU flags: don't bother.
- WebKit: WebGL2 fallback, works, screenshots are real ✔. Use it to test the fallback. Firefox: no WebGL2 when headless (`AllowWebgl2:false`); it does have WebGL2 when headed under `xvfb-run` ✔. Not needed for routine tests.
- Rapier's deprecated-parameters warning is harmless. **Treat any "Device Lost" message as a failure.** There are none with the flags above.

**Test hooks.** With `?test=1`, the game exposes `window.__TEST__`:
- `state()`: JSON with `screen, attract, day, step, profile, marbles, tilt, wobbleAge, event: { id, tier, phase, t, score, lanes: [{ kind, leanX, leanZ, cob, fallen, form, props }] }, input: { lastDevice, glyphSet }, audio: { state, music, sfx, voice }, render: { backend, frames }, errors`.
- `advance(seconds)`: runs the fixed tick and the frame logic without rendering or waiting. All tests use it, except the ones checking real time and real frames.
- `bot(skill | null)`: `sharp`, `average`, `clumsy` play through the real input path: they write to the stubbed gamepad, not into the game's state.
- `goto(screen, args)`, `tuning`, `settings`.
With `?render=0`, the game skips creating a renderer, which makes logic tests fast. Rapier and all game logic still run. With `?manual=1`, the game's own loop doesn't run at all, so only `advance()` moves time and tests never race the frame loop ✔. Add `render: { lost }` to `state()`.

**Input stubs.** Replace `navigator.getGamepads` with `add_init_script`/`addInitScript`, returning `{ connected: true, mapping: 'standard', axes: [...], buttons: [{ pressed, value }, ...], vibrationActuator: { playEffect() {} } }` from `window.__pads`. Use `page.keyboard` and `page.mouse` for the rest. When a bot stops, zero the stub: a stick left pushed scrolls every menu ✔.

**The bots ✔ (the human model every skill number in this plan came from).** A delayed correction: the bot sees the dot `delay` seconds ago and sets `wish = goal + gain × (goal − dot) + noise × sin(...)`. Do not raise gain under heavy load: it oscillates and tips, which is a bot failure and not a game bug.

| Skill | delay | gain | gain under load (stacks, log, tray, Lean Match) | noise | reaction lag | speed error (rad/s) | timing error sd |
|---|---|---|---|---|---|---|---|
| sharp | .16 s | 1.4 | .7 | 0 | .12 s | .3 | 28 ms |
| average | .26 s | 1.0 | .55 | .03 | .28 s | .8 | 55 ms |
| clumsy | .38 s | .8 | .45 | .07 | .5 s | 1.4 | 95 ms |

**Keep a tally.** TASK.md asks how many issues testing caught and how many were critical. Append one line to `notes/issues.md` each time a test catches a real issue, as you go. Counting afterwards doesn't work.

**Tests to write.**

*unit* (Node, no browser): Wobble Age mapping and bounds; marble payouts; tier unlock rules; programme table integrity (every id exists, days still work with a Tier B event removed); charts valid; tuning defaults inside min and max; dialogue ids all exist; save corrupt or old version is handled; rng repeatable; the session client hash; **the exit-interview file**, once it exists: parses, has exactly TASK.md's keys, 4, 6 and 4 feedback answers, no empty value except `series`, `usage` reading `added on import`, 3 to 6 lowercase tags, `genre` from TASK.md's list, `name` equal to the title constant; the built HTML has the metas in `name`, `content` order, the client directly after `<meta charset>`, and no `</script` inside a script. **Source greps:** no `Math.random` outside `src/core/rng.js`; no `TODO`, `FIXME`, `placeholder`, `stub`; no `alert(`, `confirm(`, `prompt(`, `window.open`, `WebSocket`, `RTCPeerConnection`; no audio file extensions or `decodeAudioData`; none of the source's names (`/wii|mii\b|balance board/i`) outside the title constant and `src/data/about.js`; no compute nodes.

*flow:* **the scripted whole-game playthrough.** From a fresh save on `?test=1&render=0`: Title → profile → tutorial → all days through the real menus with a stubbed pad and the bot in every class → ending → credits → Maintenance day → Free Play has everything. Assert days, stamps, marbles rising, tilt falling to exactly 0, music detune reaching 0. Reload mid-way and assert the save resumes. Also attract: `advance(10)` on Title starts it, it visits at least four events, a key exits it and that key isn't acted on, and one wall-clock run of 10 real seconds. Also pause and resume, restart, Dev Mode opens only from Pause.

*events:* for each event and tier, with the sharp bot: it completes, the result is valid, no NaN in any body, bodies return to the baseline count after `dispose()`, a forced fall ragdolls and recovers. One run with rendering on for each event for 2 s with `RENDER` flags: `backend === 'webgpu'`, `render.lost` null, frames rising, no console errors. Also soak the removal paths with the doll swaying, because Rapier's panic only shows once something moves (section 4). One WebKit boot through a few events: WebGL2 backend, no errors.

*balance:* run bots over 3 seeds per event at Tier 1 and assert: sharp reaches Exemplary (≥85) on average, average reaches Pleasant or Adequate, clumsy reaches at least Adequate (≥40), and a bot that parks the stick exactly on the goal and never corrects stays below Exemplary in Poses (measured ✔ 75-81 on Tier 1). Fruit Hat Tier 1: sharp banking at 7 has no falls and never banking has at least one. Use this test to set each `par`. This is how "balance is key" gets checked without a human. **Also guard against the failures I hit,** each of which looks fine until you measure it: Plate Spinners Tier 1 must separate the bots (sharp above clumsy by at least 15 points of share, stick and keys alike); Tug of Peace Tier 1 must be winnable; every Tippy Raft round ends within 90 s; Lean Match scores above .3 for the sharp bot; Log Reps doesn't give the clumsy bot above 70; Room Service Tier 1 with a brace delivers all five; a breath-synced bot beats the same bot unsynced on The Cairn Tier 2.

*input:* every verb from the pad stub, from keys, from the mouse, same game effect. Prompts switch the same frame (read `data-glyph`). Xbox glyph option. Menus fully navigable by pad alone, by keyboard alone, by mouse alone. Hover moves the focus. Clicks activate. Options ignored while Create is held. Four pads join Group Class, each controls its own lane. Tippy Raft has a winner.

*audio:* music setting defaults to 10 and the bus gain is 0.10. Render each track, sting, SFX and voice with `OfflineAudioContext`: finite, non-silent (RMS above a floor), not clipped. On the live mix, read an `AnalyserNode` on each bus. Check detune at tilt 0 is zero. No audio files are ever fetched.

*hub:* fetch `harness.html`, `bridge.js` and `round.js` into `tools/hub/` from the same raw folder as the client. Serve the built game beside them from an in-process `http.createServer` on `listen(0, '127.0.0.1')`, so no port is hard-coded and no process needs stopping. (If you ever do start a server process, stop only that one, by its PID, as TASK.md says.) First confirm the page is your game. Open `harness.html?game=GAME.html&players=N&auto=1` with `RENDER` plus `--no-sandbox --autoplay-policy=no-user-gesture-required`, wait for `body[data-complete="true"]`, read `window.__hubCheck.pass` and print failing checks. Runs: `players=1`, `players=2`, `players=4&latency=150&jitter=50&loss=5`, and the same with `&scenario=host-leave`. Also on its own: open the page, press Enter, Space, Enter, Space, assert no errors, `AIHub.active` false and something drawn. The harness calls time about 5 seconds into play, so `time-up` must work from any point, and a `result` with score 0 is valid.

*ui:* at 1920×1080, walk every screen and assert: no text under 30 px in computed style, nothing outside the viewport or the 5% margin except backgrounds, at most six focusable items, a visible focus. Touch-only: Pixel 7, iPhone and iPad profiles show "Controller or keyboard required" and Settings, `page.touchscreen` tap opens Settings, no other controls respond, attract runs, a key or pad clears the state. About shows every Source Information field and the three feedback lists, and matches the exit-interview file.

**Art pass, by eye, at the end.** `tools/shots.mjs` with `RENDER` at 1920×1080: title, island on Day 1 and Day 5, each event mid-play, results, jar, Age Reveal, Group Class with four dolls, Dev Mode, About. Look for lost legibility at 10 feet, sunk characters, messy ink.

---

## 18. Build order and cut order

Each milestone ends with something playable. Commit to the order: Fruit Hat before menus, because if the core isn't fun nothing else matters. Keep everything working as you go.

| # | Milestone | Done when |
|---|---|---|
| 0 | Skeleton | Build script, single HTML, renderer with ink, sky and sea, Rapier, the loop, hooks, `test.mjs`, session client in place |
| 1 | The soul | Balance core, Balance Disc, doll with clips and ragdoll, input with all three devices, **Fruit Hat complete with results.** Tune until it makes you want one more go |
| 2 | The shell | Title, menu, Who's Here, island with tilt physics, Trudy with voice, dialogue, music engine, save, pause, settings, glyphs |
| 3 | The programme | Check-In, Wobble Age, Jar, Today's Plan, days. **Tier A events:** Poses, Log Reps, Step Class, The Cairn, Room Service, Plate Spinners, Springboard |
| 4 | The features | Attract, Dev Mode, Group Class, Tippy Raft, hub session, touch-only, About. Passing the hub harness |
| 5 | The ending | The Grand Hold, ending, credits, Maintenance days |
| 6 | Tier B events, in this order | Still Water, Plank & Perch, Tug of Peace, Island Loop |
| 7 | Polish | Juice, more lines, art pass, full tests, exit interview, final build |

**Cut order if you run short. Cut whole things, never stub them, and leave no trace (TASK.md: no stubs, no placeholders).** First Island Loop, then Tug of Peace, then Plank & Perch, then Still Water, then Tier 3 of each event (leaving a two-tier ladder), then Tier 2. Do not cut: Fruit Hat, Poses, Check-In, Trudy, the tilting island, the jar, the finale, Attract, Dev Mode, Group Class, the hub session, glyphs, audio. The day table builds from the registry, so cutting an event needs no other change.

---

## 19. Done and reporting

**Done means** no TODOs, placeholders or stubbed features: the demo is complete. Before you finish, check every line:

- [ ] Single HTML where TASK.md says, opens from `file://`, no external requests, no audio files
- [ ] WebGPU backend by default, WebGL2 fallback works, cel-shaded with the ink filter, Rapier 0.19.3, Three R180, Web Audio, Gamepad API
- [ ] Original cast, events, art and music; title is your own random pick; nothing from section 2's lists
- [ ] All thirteen events, or the ones left after cuts, each with tiers, an intro, results and bots
- [ ] Programme through the ending, Wobble Age graph, jar, unlocks, Free Play
- [ ] Controller-first; keyboard and mouse native on the same screens; prompts follow last device; Xbox glyph option; no dense screens
- [ ] Attract at 10 s, any input exits; Dev Mode from Pause with tools, live sliders and reset; touch-only message and Settings
- [ ] Group Class 1-4 on one screen; hub harness passes at 1, 2, 4 players, on the bad network, with the host leaving; game on its own passes Enter and Space
- [ ] Music at 10% by default; all sound in code; gibberish voices with every word on screen
- [ ] `node tools/test.mjs full` passes; a scripted whole-game playthrough is part of it
- [ ] No TODOs, placeholders or stubs in `src/`
- [ ] About/Credits, the exit-interview file and your chat reply are all filled in as below

**Three places, the same content.** TASK.md calls this critical: Source Information, Testing Feedback, Engine Feedback and Prompt Feedback go in **your chat reply** and an **in-game About/Credits screen,** and into **the exit-interview file** beside the HTML. These are your own answers from your own build. Nothing in this plan answers them for you, and section 22 is only an example. Write "unknown" for anything you can't confirm.

**The last thing you do, in this order:**
1. Finish the game and run `node tools/test.mjs full`.
2. Write the exit-interview file beside the HTML, using `notes/issues.md` for the counts.
3. Run `node tools/build.mjs`. It reads that file into `src/data/about.js`, so there is one source of truth and the three places can't disagree.
4. Run `node tools/test.mjs unit ui`. These fail if the file doesn't parse, doesn't match TASK.md's shape, or isn't on the About screen word for word.
5. Paste the same content into your final chat reply, in the format below.

During development, About shows what is known so far. The final build must have no gaps: "unknown" is allowed only for what you truly can't confirm.

**The About/Credits screen.** Reached from the main menu. It follows the 10-foot rules: large type, one page at a time, moved with left and right or clicks, never a scrolling wall of text. It is also the one screen where long answers may take several pages: split them rather than shrink them.

| Page | Shows |
|---|---|
| 1 | Source Information: Date, Source, Plan, Genre and Perspective |
| 2 | Source Information: Tech, Art Direction, Animation |
| 3 | Source Information: Audio, Online, Testing |
| 4 | Source Information: Research, Environment, Model, Usage |
| 5 | Testing Feedback: the 4 questions with your answers |
| 6 | Engine Feedback: the 6 questions with your answers |
| 7 | Prompt Feedback: the 4 questions with your answers |
| 8 | Credits: Fredoka (SIL OFL), Three.js, Rapier, and the title |

Usage must read exactly `added on import`. Keep that text as one plain string, because the agent that imports the game into AI Hub replaces it with the real cost, tokens and time. I ran this mechanism on the prototype ✔: an About screen fed from a JSON file, with a test confirming every value and answer appears on it.

**Your final chat reply** has this shape, with your own answers:

```
## Source Information
- Date: ...          (and so on for all 14 fields, in TASK.md's order)
## Testing Feedback
1. ...               (4 answers, in order)
## Engine Feedback
1. ...               (6 answers, in order)
## Prompt Feedback
1. ...               (4 answers, in order)
```

**Source Information.** Field by field:

| Field | What to write |
|---|---|
| Date | The date line in your TASK.md |
| Source | Wii Fit |
| Plan | The file name of the plan you were given |
| Genre and Perspective | Physics-balance party sports with a daily-ritual progression; third person, with framed stage cameras per event and an orbitable chase camera on the island |
| Tech | Three.js R180 on the WebGPU backend (WebGL2 fallback), TSL toon and ink post, Rapier 0.19.3, Web Audio, Gamepad API, esbuild, Fredoka, plus anything you added, with versions |
| Art Direction | Cel-shaded ink filter over a wooden-toy resort, all models made in code on Three.js's own materials |
| Animation | Three.js `AnimationMixer` clips on jointed rigs, procedural lean from the physics, Rapier ragdolls |
| Audio | Code-synthesised city-pop and bossa at 10% by default, synthesised sound effects, Animalese and Simlish-style gibberish voices; no audio files |
| Online | AI Hub Session Protocol v1 in ghost mode for 1-4 devices, plus 1-4 players on one screen |
| Testing | The parameters TASK.md allows: as much headless testing as you like, with scripts that play the game and check its state, including a scripted playthrough of the whole game; one command that prints only failures and a one-line count, rerun only after changing the code it covers; screenshots only for what a script can't check; no subagents or workflows to debate, review, judge or audit. Then what you actually ran |
| Research | Yours, or none, beside this plan's: the hub's protocol pages and code; background on the source from Wikipedia, a Nintendo World Report review and Nintendo's Iwata Asks interviews, read as search summaries. How much more to research is your choice |
| Environment | As written in your TASK.md |
| Model | As written in your TASK.md |
| Usage | Exactly `added on import`. You can't see your own cost, so don't estimate it |

**Testing Feedback,** answered in order (`notes/issues.md` gives you the counts):
1. How many issues did testing catch?
2. How many would be considered critical issues / game breaking?
3. What was the most helpful test you ran?
4. What was the least helpful test you ran?

**Engine Feedback,** answered in order:
1. What did you like most about the engine?
2. Did you get stuck or guess wrong?
3. What was the most important thing you had to build yourself?
4. What was the hardest part about using the engine?
5. What did you change in the engine, and why? (none if nothing)
6. If you could change one thing about the engine, what would it be?

**Prompt Feedback,** answered in order:
1. What did you like most about this prompt?
2. What was confusing?
3. What was the hardest thing to do?
4. What would you change in this prompt?

**The exit-interview file** is one JSON object in TASK.md's exact shape, plain text, every value filled in, and you check that it parses: `sourceInformation` (`date, source, plan, genre, perspective, tech, artDirection, animation, audio, online, testing, research, environment, model, usage`), `testingFeedback`, `engineFeedback`, `promptFeedback` (arrays, answers in order), and `aiHub`:

| `aiHub` field | Suggested |
|---|---|
| `name` | The game's title, as on its title screen |
| `tagline` | A few words of your own |
| `description` | One or two sentences, such as: a wooden-toy wellness retreat on a crooked island, where you hold poses, stack stones and catch fruit with real balance physics, and straighten the whole island one class at a time |
| `type` | Game |
| `genre` | Sports |
| `source` | Wii Fit |
| `series` | Empty: the franchise is the source itself, and the hub's catalogue wants it empty then |
| `players` | 1–4 |
| `controls` | The same line as `hub:session-howto` |
| `tags` | 3 to 6 lowercase, such as 3d, comedy, third-person, versus, arcade |

---

## 20. What was and wasn't verified

**Tested here on 2026-11-04 (✔ above):** versions exist on npm and jsDelivr; single-file esbuild build from `file://`; WebGPU in Chromium with SwiftShader, and which flags really render; WebGL2 fallback in Chromium and WebKit; `toonOutlinePass` with MRT and the custom ink pass; instanced toon meshes; glass; shadow settings; the look of the cast and all four palettes; client hash; balance model; torque limit; gusts and flail; island tilt; marble pours; ragdoll; Rapier's crash conditions and a soak of every removal path; touch media queries; Fredoka's licence and file names.

**Every event's numbers were simulated with the bots,** on real Rapier where physics matter: Fruit Hat, Poses, The Cairn, Still Water, Log Reps, Plank & Perch, Tug of Peace, Room Service, Springboard, Island Loop, The Grand Hold and Step Class on the real balance core, Tippy Raft, Plate Spinners from a moving stick vector, and the Check-In. Keys were simulated against the stick for Poses, Still Water, Fruit Hat, Room Service and Plate Spinners. This overturned my first numbers for Plate Spinners, Tug of Peace, Log Reps, Plank & Perch, Room Service, Tippy Raft, Lean Match, The Cairn's top tier, Step Class's lean notes and the keyboard model. Expect the same when you build: **measure before you trust a number.**

**An integration prototype.** Separate checks don't prove the parts work together, so I built one event through everything, from this document: its build recipe, its code blocks extracted directly from this file, a rig with `AnimationMixer` clips, ragdoll from the rig, Fruit Hat written for lanes, all three input devices, live prompts with both glyph sets, menus, pause, Dev Mode sliders with reset, attract mode, touch-only, an About screen fed from a JSON file, audio buses with the title motif, and a hub session with its own card, ghost lanes and a timeline on the hub's clock. Then I tested it the way section 17 says, with one command: **209 passed, 0 failed,** with real rendering, including all 16 harness checks in each of five hub scenarios (1, 2 and 4 players, bad network, host leaving, short limit), a wall-clock attract, three touch profiles, and the 1080p layout audit. That took about 360 lines of game code and 170 of tests, and came to a 3.1 MB single file. It is deleted now; everything it taught is in this plan. It found problems no separate check had shown: the lost device, the parked mouse stealing focus, both mouse buttons never registering together, silent controller play, the fall loop, lost quick taps, and slow time at low frame rates.

**Not tested. TASK.md says anything needing the real thing "is checked as far as it can be here, never required", and these are as far as it goes:**
- **Real hardware.** Nobody has played this with a real controller on a real TV. I can't confirm that every browser accepts a gamepad press as the gesture that unlocks audio (section 3 gives the fallback).
- **Hearing.** Nobody has listened. Pitches, levels and readability are checked as signals; whether the music is good is not. Check it with the audio tests and trust the arrangement.
- **People.** The bots are a model of a person, and their timing and tracking errors are my assumptions, so skill results are estimates. Mouse play shares the stick's path, and was tested for input, not simulated for skill.
- **The whole game.** The prototype integrates one event of thirteen, with a stand-in look. The rest is simulated, not built. All animation beyond a couple of test clips, and any art beyond the cast and a test scene, is yours. Whether it is fun is yours to judge.

---

## 21. TASK.md coverage and proof

Every requirement in TASK.md, in its order: where this plan answers it, and what proves it was met when you build. Test groups are in section 17. Some of what TASK.md asks for can only exist once there is a build: the game itself, its About/Credits screen, the exit-interview file and your final report. This plan covers those by saying exactly what to produce, when, and how it gets checked. Producing them is the build's job, and yours.

| TASK.md asks for | Answered in | Proven at build time by |
|---|---|---|
| Source: Wii Fit | Section 1, what we keep; section 2, what we don't copy | `unit`: source's names absent outside the title and About. Your art pass |
| Genre, picked | Section 1 | Your report, section 19 |
| Perspective, picked | Section 1; each event's camera in section 6 | Art pass screenshots |
| Title: a riff, 50 brainstormed, picked with a real random number generator | Left to you, as this plan's brief says: section 1 | You run the generator; one constant in `src/data/config.js` |
| Research, your choice | Section 19, Research row | Your report |
| Package: one HTML file; downloadable dependencies optional | Section 16, Build | `unit`: inline scripts only. `flow`: opens from `file://` |
| Three.js R180 | Section 16, Stack | `flow`: `THREE.REVISION` is 180 ✔ |
| WebGPU | Section 16, Renderer | `events`: `backend` is webgpu and `render.lost` is null ✔ |
| Stylized cel-shaded / ink filter | Section 9 | `events`: ink pixels in a read-back screenshot ✔. Art pass |
| Rapier 0.19.3 | Sections 4 and 16 | `flow`: `RAPIER.version()` ✔ |
| Web Audio | Section 11 | `audio`: live bus and offline renders ✔ |
| Gamepad API | Section 3 | `input`: every verb through the stubbed pad ✔ |
| Rest of the stack is yours | Section 16: esbuild, Playwright, Fredoka | Your report |
| Art Direction: engine's style as base, new assets, library for generic props | Section 9, Base style and Model recipes | Art pass |
| Animation: engine's system as base, new animations | Section 10 | `events`: the mixer's time advances and clips change ✔ |
| Audio: all in code, no files | Section 11 | `unit`: greps. `audio`: every track, sting, effect and voice renders non-silent |
| Voices: Animalese / Simlish-style gibberish | Section 11, Voices | `audio`: blips per line, peaks balanced |
| Music at 10% by default | Sections 7 and 11 | `audio`: setting 10, bus gain .10 ✔ |
| Online: AI Hub | Section 12 | `hub` ✔ |
| Subfolder for dev files; modules bundled to one file in root | Section 16: file tree and Build | The build writes where TASK.md says; `unit` opens it |
| External CDN allowed | Section 16: not needed, everything is inlined | `unit`: no external scripts |
| Don't read outside your folder; shared ports and processes | Section 17, Sharing this computer | Your practice |
| Prefer `file://` and headless tools; 127.0.0.1 on an OS-picked port; confirm the page; stop only your own PIDs | Section 17, Sharing this computer; `hub` test | `hub`: in-process server on port 0, page confirmed first ✔ |
| Performance budget unlimited; FPS and optimisation out of scope | Section 9, Detail; section 16, Renderer | Nothing to prove: no FPS test exists on purpose |
| Testing: scripts that play and check state, scripted whole-game playthrough | Section 17: test hooks, `flow` test | `flow` reaches the ending and beyond |
| One command, only failures and a one-line count, rerun only after changes | Section 17, The command | Its own output ✔ |
| Screenshots only for what a script can't check | Section 17: art pass | Your practice |
| No subagents or workflows to debate, review, judge or audit | Section 17, first paragraph | Your practice |
| Effort, your choice | Section 18 gives an order; how far you take it is yours | Your report |
| This computer: tools, browsers, WebGPU flags and secure pages | Sections 16 and 17, Browser flags | `events`: `render.lost` null ✔ |
| Display, Firefox, WebKit, blank WebGPU screenshots | Section 17, Browser flags | `events`: WebKit boot ✔ |
| Memory and earlyoom | Section 17, Sharing this computer | Your practice |
| No controller, touch, listener, second player, iPhone or TV: test with the stand-ins, "never required" to have the real thing | Section 17, Stand-ins: these stand-ins are what TASK.md asks for | `input`, `ui`, `audio`, `hub` ✔ |
| Sharing: browsers, `/tmp`, `playwright install`, system Python and `uv` | Section 17, Sharing this computer | Your practice |
| Original game inspired by the source | Sections 1 and 2 | `unit` greps; your art pass and judgement |
| Feature-complete demo, polished vertical slice, long enough to show everything | Section 1, Scope; section 5, the day table; section 18 | `flow`: every day and event, in order |
| Capture the source's world, characters, themes and tone in mechanics, pacing and UX | Section 1's table; sections 4, 5 and 8 | `balance` for mechanics; your judgement for tone |
| Infrastructure so the rest can be built with normal designer tools | Section 14, For later designers; `src/data/` in section 16 | `unit`: table integrity; a removed event still leaves a working programme |
| Dev mode from the pause menu, standard tools | Section 14; Pause in section 7 | `flow`: only reachable from Pause ✔ |
| Live sliders for the key variables, reset to defaults | Section 14 | `flow`: a slider changes the running event, reset restores it ✔ |
| Attract mode: 10 s idle on title or menu, looping AI demo, any input exits, may cheat, shows as much as possible | Section 13 | `flow`: starts near 10 wall-clock seconds, loops, each device exits it and the press is swallowed ✔ |
| Multiplayer: hub integration | Section 12, AI Hub session | `hub`: harness at 1, 2, 4 players, bad network, host leaving ✔ |
| Multiplayer: the game on its own | Section 12, Group Class and On its own | `input`: four pads, four lanes ✔. `hub`: Enter and Space on its own ✔ |
| Narrative tone like the source's | Section 8 | `unit`: lines exist, no repeats. Your judgement |
| 10-foot, controller-first, DualSense or any standard pad | Sections 3 and 7 | `ui` at 1080p ✔. `input`: all menus by pad alone ✔ |
| Keyboard and mouse: same game, same screens, native, expected keys | Section 3 | `input`: same effects from keys and mouse ✔. `balance` on keys |
| Mouse aims, looks, clicks menus and world things; hover moves the focus | Section 3 | `input`: pointer weight, hover, click ✔; a parked mouse doesn't steal focus ✔ |
| Prompts follow last input; PlayStation glyphs; Xbox option; keys and mouse buttons | Section 3 | `input`: `data-glyph` changes in the same tick ✔ |
| No dense, web-style data screens | Section 7, The 10-foot rules | `ui`: 30 px minimum, six choices, safe area, on every screen ✔ |
| Touch-only: no touch controls, "Controller or keyboard required", Settings, attract runs | Section 15 | `ui`: Pixel 7, iPhone, iPad ✔ |
| Done: no TODOs, placeholders or stubs | Sections 18 and 19 | `unit`: greps ✔ |
| Source Information, all 14 fields, in chat and About/Credits | Section 19: field by field, the About pages, the chat format, and the order to do it in | `ui`: About shows every value from the file ✔. `unit`: the file's shape. Your chat reply |
| Testing, Engine and Prompt Feedback, in chat and About/Credits | Section 19: every question listed, the About pages, the chat format; section 17's tally for the counts | `ui`: About shows every answer ✔. `unit`: 4, 6 and 4 answers. Your chat reply |
| Exit-interview file: beside the HTML, exact shape, plain text, parses, `aiHub` block | Section 19: what to write and when; shape in section 22 | `unit`: parses, exact keys, every value filled |

✔ here means the check was run on the integration prototype of section 20.

---

## 22. Planning-stage report

TASK.md's reporting belongs to whoever builds the game, and only your answers count for your build (section 19 says how). Here is the same report for this planning stage, so you can see the format filled in and what was learned.

**Source Information.** Date: 2026-11-04 21:19:05. Source: Wii Fit. Plan: none (this stage wrote it). Genre and Perspective: physics-balance party sports with a daily-ritual progression; third person, with framed stage cameras per event and an orbitable chase camera on the island. Tech: Three.js R180 (WebGPU, WebGL2 fallback, TSL toon and ink), Rapier 0.19.3, Web Audio, Gamepad API, esbuild 0.28.2, Playwright 1.63.0, Fredoka 5.3.0. Art Direction: cel-shaded ink over a wooden-toy resort, all models made in code. Animation: `AnimationMixer` clips on jointed rigs, physics-driven lean, Rapier ragdolls (prototyped with test clips). Audio: code-synthesised city-pop and bossa at 10% by default, effects, Animalese and Simlish-style voices (motif, voices and click prototyped). Online: AI Hub Session Protocol v1 in ghost mode for 1-4 devices, plus 1-4 on one screen. Testing: as much headless testing as wanted, with scripts that play and check state; one command printing only failures and a one-line count, rerun only after changes; screenshots only for what a script can't check; no subagents or workflows to debate, review, judge or audit. Ran: simulations with three bot skills, and the prototype's suite. Research: the hub's protocol pages and code; source background from search summaries of Wikipedia, a Nintendo World Report review and Iwata Asks. Environment: Claude Code CLI (headless); Linux. Model: Anthropic, claude-opus-5-5, reasoning effort max. Usage: added on import.

**Testing Feedback**
1. *How many issues did testing catch?* About 39 across the prototypes and simulations.
2. *How many would be considered critical issues / game breaking?* 13: ground contact capping lean; a parked stick scoring 100%; Plate Spinners unlosable; Plate Spinners unreachable on keys; Tug of Peace unwinnable; Tippy Raft never ending; Lean Match impossible; the fall loop after a ragdoll; silent controller play; both mouse buttons never registering together; Rapier's page-killing panic; tests "passing" on a lost WebGPU device; a boot snippet that wouldn't build.
3. *What was the most helpful test you ran?* Building one event through everything from the plan's own recipes. It found the lost device, the parked mouse, the mouse-button chord, silent pad play and the fall loop, none of which any separate check had shown.
4. *What was the least helpful test you ran?* The Firefox WebGL2 checks, which changed nothing in the game.

**Engine Feedback** (Three.js and Rapier, from the prototypes)
1. *What did you like most about the engine?* `toonOutlinePass` plus a short TSL pass gave the whole ink look, unchanged on WebGPU and WebGL2.
2. *Did you get stuck or guess wrong?* Yes. I took a lost device for 60 fps. `hash()` given a vec2 streaked the image, toon glass turned smoky, and convex-hull stones collapsed on their own.
3. *What was the most important thing you had to build yourself?* The balance core: a torque-limited controller with gravity feed-forward on a ball joint.
4. *What was the hardest part about using the engine?* Knowing what was really happening. A lost WebGPU device gives no error and a loop that seems to run. A Rapier crash surfaces half a second after its cause, only once something moves.
5. *What did you change in the engine, and why?* None.
6. *If you could change one thing about the engine, what would it be?* Make Rapier's panic on a stale handle or a bad removal a catchable error, instead of killing all physics for the page.

**Prompt Feedback**
1. *What did you like most about this prompt?* Open creative choices combined with exact, checkable facts about the machine and the hub.
2. *What was confusing?* What "the game on its own" means for multiplayer; "native style" and "asset library" for an engine with neither; and which parts of TASK.md apply at the plan stage.
3. *What was the hardest thing to do?* Making a balance-board game that a steady thumb can't trivially beat, while staying original.
4. *What would you change in this prompt?* Fix the WebGPU flags, which lose the device within a second. Define standalone multiplayer. State how capable builders are.

**The exit-interview file's shape,** filled in for this stage. It parses, and its keys match TASK.md's exactly. Replace every value with your own. `name` and `tagline` are "unknown" here only because each builder picks its own title.

```json
{
  "sourceInformation": {
    "date": "2026-11-04 21:19:05",
    "source": "Wii Fit",
    "plan": "none",
    "genre": "Physics-balance party sports with a daily-ritual progression",
    "perspective": "Third person: framed stage cameras per event, orbitable chase camera on the island",
    "tech": "Three.js R180 (WebGPU, WebGL2 fallback, TSL toon and ink), Rapier 0.19.3, Web Audio, Gamepad API, esbuild 0.28.2, Playwright 1.63.0, Fredoka 5.3.0",
    "artDirection": "Cel-shaded ink over a wooden-toy resort, all models made in code",
    "animation": "AnimationMixer clips on jointed rigs, physics-driven lean, Rapier ragdolls",
    "audio": "Code-synthesised city-pop and bossa at 10% by default, effects, Animalese and Simlish-style voices",
    "online": "AI Hub Session Protocol v1 in ghost mode for 1-4 devices, plus 1-4 on one screen",
    "testing": "Headless scripts that play and check state, one command printing only failures and a count, screenshots only where needed, no subagents or workflows to review",
    "research": "Hub protocol pages and code; source background from search summaries",
    "environment": "Claude Code CLI (headless); Linux",
    "model": "Anthropic, claude-opus-5-5, reasoning effort max",
    "usage": "added on import"
  },
  "testingFeedback": [
    "About 39 across the prototypes and simulations.",
    "13.",
    "Building one event through everything from the plan's own recipes.",
    "The Firefox WebGL2 checks."
  ],
  "engineFeedback": [
    "toonOutlinePass plus a short TSL pass gave the whole ink look on both backends.",
    "Yes. I took a lost device for 60 fps.",
    "The balance core.",
    "Knowing what was really happening: a lost device gives no error.",
    "None.",
    "Make Rapier's panic a catchable error."
  ],
  "promptFeedback": [
    "Open creative choices combined with exact, checkable facts.",
    "What the game on its own means for multiplayer.",
    "Making a balance-board game a steady thumb can't trivially beat.",
    "Fix the WebGPU flags, which lose the device within a second."
  ],
  "aiHub": {
    "name": "unknown",
    "tagline": "unknown",
    "description": "A wooden-toy wellness retreat on a crooked island, where you hold poses, stack stones and catch fruit with real balance physics, and straighten the whole island one class at a time.",
    "type": "Game",
    "genre": "Sports",
    "source": "Wii Fit",
    "series": "",
    "players": "1–4",
    "controls": "Lean: stick, WASD or mouse. Feet: L2 R2, Q E or clicks. Flail: Square or F",
    "tags": [
      "3d",
      "comedy",
      "third-person",
      "versus",
      "arcade"
    ]
  }
}
```
