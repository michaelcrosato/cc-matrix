# Game plan: an original surgical-action drama on the Pavilion engine

You are building this game without its director, so this plan decides what matters and tells you
what has already been tested. Where it is silent, decide for yourself and keep moving. You may
change any design choice here if the result is a better game, but not the requirements in your
TASK.md.

**Names.** This plan never names the game: you pick the title as your TASK.md says, and keep it in
one constant so it appears on the title screen, the page title, the hub card and the About screen.
It also never names your deliverable or your exit-interview file: your TASK.md does. All paths here
are relative to your dev folder. In the code the game's key is `surgery`.

**Tested.** Everything marked ✔ was run by the planner on this machine on 2026-11-04 against the
engine at commit `49ef2ba`. You don't need to re-derive it.

---

## 1. The game in one page

**Pitch.** You are the hands. In a rain-soaked harbour hospital, you race a failing heart with eight
instruments while the patient's pulse sets the tempo of everything: the music, the monsters, your
best moments. Then one night a mass you are removing *moves*, and the monitor drops into three-four
time. A man-made parasite is keeping time inside the city's patients, and only a frightened young
surgeon and a retired legend with a shaking hand can stop the song.

**Genre.** Surgical action (a pointer-precision arcade game under a ticking clock), framed by a
visual-novel medical melodrama, with drop-in co-op.

**Perspective.** Operations: a fixed surgeon's-eye view looking down at the operative field, about
73° from the horizon with mild perspective, plus short camera pushes for drama. Story: a staged
"paper theatre" looked at straight on.

**What makes the source distinctive, and what it becomes here**

| In the source | In this game |
|---|---|
| Tool-select plus pointer precision under a timer | Eight instruments on a flick-select ring; each has its own gesture, and each gesture is rated |
| The vitals bar as your health bar | Vitals drive a live heartbeat: as vitals fall, BPM rises, and the music and the strains speed up with it |
| The impossible disease as a boss | Four "movements" of a parasite, each with its own meter, motif and tool puzzle |
| A superhuman gift | Two gifts, both about hearing: **the Hush** (time slows inside a heartbeat) and **the Echo** (ghost hands repeat your last technique) |
| Earnest, breathless medical melodrama | Same register, wholly new world, cast and plot (§2) |
| Letter-rank scoring | Rated actions, chains, on-beat bonuses and ranks up to **ENCORE** |

**Pillars**
1. **Hands first.** Every instrument must feel physical and readable from 10 feet on a controller.
2. **The heartbeat is the game's clock.** You see it, hear it and feel it (rumble) at all times.
3. **Every operation has a twist.** Something always goes wrong halfway.
4. **Nobody winks.** The writing is deadly serious about absurd things. That is the joke, and the charm.

**Stay original.** This is a new game in a genre. Do not use anything from the source's world: its
hospital, characters, disease and strain names, organisations, power names or activation gesture,
story beats, music, UI layout or art. Its rating words and ranks stay out too. Use only the world
below. The source's name appears only where your TASK.md asks: the title riff and the Source
Information.

**Research already done** (you need no more unless you want it): *Trauma Center: Second Opinion*
(Atlus, Wii launch title, 2006), an enhanced remake of the DS *Under the Knife*. The Wii Remote
pointer aims and the Nunchuk stick flick-selects tools; reviewers praised how fast that switching
is. Two doctors with different healing gifts, day-named parasite strains, rank scoring. The
series's later *New Blood* added co-op surgery. For your Source Information you may report this as
research done by the plan.

---

## 2. World, cast, story

**World.** Mercy Harbor General, a public teaching hospital in the invented port city of Port
Verity. It is always raining. Half the wings are funded by the Vane Foundation. Below the morgue
level, an off-the-books operating theatre called **the Night Ward** treats cases that officially do
not exist.

**The disease.** **R.E.Q.U.I.E.M.**: *Recombinant Enzymatic Quiescent Immuno-Evasive Microfilaria*.
A designed parasite that entrains to the host's heartbeat, "the only organism ever engineered to
keep time." Its strains are named for movements of a requiem mass, and each one plays in its own
meter on the ECG: **Introit** (3/4), **Lacrimosa** (6/8), **Dies Irae** (5/4), **Libera Me** (shifting).

**Cast** (these pronouns are part of the fiction)

| Character | Role | Voice and hook |
|---|---|---|
| **Dr. Mara Quill**, 28, she/her | Second-year resident, the first playable surgeon | Quick, frightened of her own hands. A piano tuner's daughter who can hear a flat string through a wall. Gift: **the Hush** |
| **Dr. Perpetua "Pet" Nwosu**, 63, she/her | Retired trauma legend, the second playable surgeon | Acid-tongued, drinks terrible vending-machine tea, hides a tremor in her right hand. Gift: **the Echo**, the hands she had thirty years ago |
| **Bashir Haddad**, 51, he/him | OR scrub nurse, your voice in every operation | Unflappable, dry. Says "Doctor" fourteen different ways |
| **Teodor "Teddy" Lark**, 31, he/him | Anaesthesiologist | Reads the monitors, jokes when scared, which is always |
| **Chief Ottoline Voss**, 58, she/her | Chief of Surgery, runs the Night Ward | Ice. "In my hospital, adequate is a kind of malpractice." |
| **Cordelia Vane**, 45, she/her | Benefactor, head of the Vane Foundation | Warm, generous, smiling. The villain, revealed only at the end |

Patients get a name and one line of life, and their fate is reported on the results screen ("Anton
Deverell will mend nets again by spring.").

**Story of the demo: "The First Movement"**

| Case | Before | The twist | After |
|---|---|---|---|
| **0 Barbs** | Storm, Mara's first solo night. Net-mender Anton Deverell has hooks and cable splinters in his forearm. "The attending is elbow-deep in a bus driver. This one's yours, Doctor." | One barb hides under a blood pool | "Your hands were steady." "They weren't. I was counting his heartbeats." |
| **1 Routine** | Harbour pilot Rosalind Pike, a routine appendix. Chief Voss watches from the gallery | An artery lets go as you close | "Adequate." |
| **2 Shrapnel Night** | Grain-terminal blast, triage in the corridor. Foreman on the table, Teddy panicking | The heart stops. Mara says "now" half a beat before the monitor flatlines. Bashir notices | Bashir asks nothing, and says so |
| **3 Something Moved** | Vane Wing gala upstairs (meet Cordelia Vane, lovely). A courier with a "benign" liver mass | "It moved." "Masses don't move." "Bashir. It moved." The ECG goes into 3/4 time. The Hush wakes under pressure | Voss seals the theatre: "You will wash your hands, you will sign nothing, and you will tell no one what you did not see in this room." |
| **4 The Night Ward** | The hidden lift. Voss's briefing on R.E.Q.U.I.E.M. Rosalind Pike is back, seeded during recovery | No guidance this time: the Lacrimosa floods the field | Mara saves her, then her hands lock and she collapses from exhaustion. Voss: "Then we need a second opinion." |
| **5 Second Opinion** | A bus depot at 3 a.m., a tea machine, Pet Nwosu. Now you play Pet, tremor included. A longshoreman's shattered femur | Cysts in the marrow, and then her hands split: "Doctor Nwosu... there were two of you." "There were always two of me, young man. One of them retired." | Pet and Voss, old rivals, in the scrub room. Voss goes down mid-sentence |
| **6 Dies Irae** | The patient is Voss. She has carried this strain for eleven years; she helped build it when Vane paid for her lab | The fever spikes and heat rings start to sweep the field. "If I die on your table, Perpetua, you'll have to fill out the form." "I have been looking forward to it." | Voss lives and names the funder. Upstairs, the Foundation sends flowers to the OR staff |
| **7 Libera Me** | Bashir collapses: the flowers. The voice that guided you all game is on the table. Mara wakes and scrubs in. "Scalpel." Nobody hands it to her. Teddy: "...I'll do it. I've seen it done. Mostly." | The strain stops the heart on purpose, then the Soloist surfaces | Mara and Pet together: the Duet. Bashir wakes: "Clean, Doctor." Epilogue: Vane on a ship, on the phone: "A promising first movement. Have them tune the orchestra." |

**Writing rules.** About 150 to 250 lines of story in all. Write every line yourself, in this voice:
- Between operations: long, operatic, sincere. Everyone believes this is the most important night in
  medical history.
- During operations: short, clinical, urgent. Bashir teaches early on; later he only reacts.
- Plausible jargon delivered with total conviction. Teddy supplies the only deliberate jokes.

Samples of the voice:
> **Bashir:** Forceps, Doctor. Lift the mass. ...Doctor.
> **Mara:** It moved.
> **Teddy:** Guys? The ECG just went into three-four time. That's a waltz. Hearts aren't in a time signature. Hearts aren't *allowed*.

> **Voss:** We call it Requiem. Recombinant Enzymatic Quiescent Immuno-Evasive Microfilaria. It is the only organism ever designed to keep time.
> **Mara:** Keep time for what?
> **Voss:** For the end of you, Doctor.

> **Pet:** I have buried better surgeons than you, and I liked them less. Scalpel.

In-op callouts are data with triggers: `Clean. Again.` · `Doctor, that's healthy tissue.` · `Vitals at
forty. Push the IV. Now!` · `Wrong instrument, Doctor.` · `Lift off! Lift off!`

---

## 3. How it plays

### 3.1 The loop
Story scene → chart card (patient, diagnosis) → **OPERATION START** → phases of tasks under a timer →
twist → **OPERATION COMPLETE** → results (score breakdown, rank stamped on the chart, the patient's
fate) → next. Death: flatline tone, black screen, *"Time of death: 03:42."*, then retry from the last
phase checkpoint or from the start. Retrying must take under two seconds.

### 3.2 Surgeons and input
All play is by **surgeon slots** (up to four). A slot holds a cursor on the field, a selected tool, a
held-action state, a score and a chain. Slot inputs are per tick and part of the sim's input, so
replays and headless tests can drive them. The same slots serve solo play, local co-op, hub co-op,
the Echo's ghost hands and the Case 7 partner.

Field space: x ∈ [-11, 11], z ∈ [-6.3, 6.3] (1 unit ≈ 80 px at 1080p). Keep gameplay inside x ∈ [-9, 9],
z ∈ [-4, 4.2], clear of the HUD. All game logic is 2D in this plane, with no physics.

**Controls**

| Action | DualSense | Mouse + keyboard |
|---|---|---|
| Move cursor | Right stick (`v = 15 u/s · s^2.2`) | Mouse (absolute); WASD or arrows also move it for keyboard-only play |
| Use tool | R2, analog (or hold Cross) | Left button (or hold E) |
| Pick tool | Left stick flick, 8 directions, instant (or L1/R1 to cycle) | 1–8, wheel, or click the instrument on the tray |
| Precision | Hold L2 (×0.35) | Hold Shift (keyboard cursor only; the mouse is already precise) |
| Cancel, let go | Circle | Right button or Q |
| Gift | Triangle | Space |
| Chart overlay | Square | Tab |
| Rotate held bone | L1/R1 while holding | Wheel while holding |
| Defibrillate | L2 + R2 | Both mouse buttons |
| Pause | Options (ignored while Create is held: that combination is the hub's) | Esc |

The stick flick is the signature: it must switch tools with no menu and no slowdown.

**Aim assist (pad and keyboard cursor only; slider in Settings and dev mode).** Within 1.2 u of a valid
target for the current tool, speed falls by up to 50% and the cursor is pulled toward it at up to
3 u/s, only while the stick is moving. While the Scalpel is engaged, sideways error is damped (rail
assist). While suturing, the needle creeps along the wound by itself, so the stick only flicks across
it. The mouse gets none of this, since it needs none.

### 3.3 The instruments

The ring has 8 fixed directions, data-driven per case. Up: Scalpel. Up-right: Forceps. Right: Suture.
Down-right: Suction. Down: Laser (Cryoprobe in Case 6). Down-left: Gel. Left: Scanner (Cryoprobe in
Case 7, where the nodules stay visible). Up-left: IV Push.

| Tool | Gesture | Rated on | Misuse |
|---|---|---|---|
| **Scalpel** | Hold, follow the dashed line in one stroke | Sideways deviation (≤0.25 u is Immaculate) | Cutting healthy tissue makes a small laceration and costs vitals |
| **Forceps** | Hold to grab, pull along the object's axis about 1 u, it drops on the tray | Angle error of the pull | Yanking off-axis tears a laceration |
| **Suture** | Hold, zigzag across the wound. Each crossing near the advancing needle is a stitch; about 1 per 0.5 u | Evenness of spacing and pace | Sloppy spacing leaves a slow bleed |
| **Suction** | Hold over a pool. Analog: harder drains faster, and gurgles louder | None (always Good) | Safe everywhere |
| **Laser** | Hold on a target, the heat ring fills in about 1.2 s, release at 80–100% | Release timing | Overheating makes a burn |
| **Gel** | Hold and paint until the coverage ring is full. The flow meter refills in seconds | Overspray | Wasted gel |
| **Scanner** | Hold and sweep. Sonar pings reveal hidden things for 8 s | None | Safe everywhere |
| **IV Push** | Auto-moves to the IV port. Hold; vitals rise; release in the green band (+18 at a full dose, 4 s cooldown) | Release timing | Overdose: a spike, then −8 |
| **Cryoprobe** (Case 6 on) | Hold on a node until the frost ring closes (1 s), which makes it brittle | Release timing | Frostbite |
| **Dressing** (context, auto-selected) | Final close: hold and draw along the closure | Coverage | None |
| **Defibrillator** (context) | Code only: hold L2 + R2 to charge (1.2 s), release as the ghost beat crosses centre | Timing | Failure: no recovery |

Wrong tool on a target: a clink, Bashir's callout, a chain reset, no effect. Every tool must have its
own 3D model, motion, sound and particles, and the tray shows its state.

### 3.4 Hazards (what tasks are made of)

Each is a data-spawned object with position, progress and a vitals drain per second.

| Hazard | Tool(s) | Drain/s | Notes |
|---|---|---|---|
| Incision line | Scalpel | 0 | Opens the plate underneath (§6.1) |
| Laceration (polyline) | Suture | 0.6 | Feeds pools until closed |
| Pool | Suction | 0.2 × area | Hides what lies under it |
| Bleeder | Suture (3 fast crossings) | 3 | Spurts; feeds a pool |
| Foreign object (hook, shard, splinter) | Forceps | 0.2 | May be hidden: find it with Scanner first |
| Polyp | Laser | 0.1 | Clusters |
| Tumor | Scalpel ring → Forceps → Gel | 0.4 | Three-stage |
| Inflammation, burn | Gel | 0.2 | Paint coverage |
| Bone fragment | Forceps + rotate → Suture (wire, 2 crossings) | 0 | Snaps at <0.35 u and <12° (Case 5) |
| Strain parts | §4 | varies | Per strain |

### 3.5 Vitals and the heart
Vitals run 0–100. Drains sum per second; IV Push and some events add. **BPM = lerp(72, 148, 1 − vitals/100)**,
scaled by the "heart coupling" slider. A beat clock in the sim gives phase and R-wave ticks. The ECG
trace, lub-dub sound, rumble, tissue pulse, music tempo and strain timing all read that one clock,
which is how falling vitals raise the tension. Clamp strain speed-up at ×1.4 so failure doesn't
spiral unfairly.

**On beat.** Finishing a rated action within ±110 ms of an R-wave adds "ON BEAT" (+25% points, extra
gift charge). It is never required.

**Code.** At vitals 0: the ECG flattens, the sound drops out, and you have 5 seconds to defibrillate.
Success returns vitals to 30. Resident gets 2 per case, Attending 1, Chief 0 (the scripted stops in Cases
2 and 7 don't count). Otherwise the patient dies. Time running out is also death.

### 3.6 Rating and rank
Action ratings: **IMMACULATE** 400, **CLEAN** 250, **GOOD** 120, **SLOPPY** 10 points, in big outlined text
at the action. Clean or better extends the chain; ×1.25 at 5, ×1.5 at 10, ×2 at 20. Sloppy resets it.
End bonus: vitals × 20, seconds left × 5, mistakes × −100. Ranks **C, B, A, S, ENCORE** at 50/70/85/100/115%
of the case's `par` score. Set `par` from the bot's runs (§11.2). Best rank per case is saved.

### 3.7 The gifts
The gift meter charges from good work (Clean +4, Immaculate +8, on beat +2). **To trigger: hold the gift
button; the ECG flattens; release on the next heartbeat.** It takes about a second, is tense, and a
miss costs nothing but time.
- **The Hush (Mara).** The world runs at 30% for 6 heartbeats while your cursor stays real-time. Sound
  falls to one heartbeat and a sustained note; colour drains from everything but the tissue. Each
  on-beat action during the Hush adds a heartbeat, so a skilled player can stay in the pocket.
- **The Echo (Pet).** For 10 s, a luminous ghost of her younger hands copies your technique: each action
  you finish is repeated at once on the next valid target for that tool, at the same rating. It is a
  bot-driven surgeon slot restricted to your last tool. Her tremor (a slow cursor wander of about
  0.12 u, off in Precision, off during the Echo, and off via a Setting) disappears while it runs, and
  a line of dialogue acknowledges that.
- **The Duet (Case 7).** A shared meter fires both at once, the game's catharsis. In co-op each player
  has their own gift.

### 3.8 Difficulty
Resident, Attending, Chief: a set of multipliers on drains, timer and strain speed, plus Code count.

---

## 4. The cases

| # | Case | Surgeon | Plate(s) | New in this case | Timer | Target length |
|---|---|---|---|---|---|---|
| 0 | Barbs | Mara | Forearm | Cursor, ring, Gel, Forceps, Suction, Suture, Dressing, ratings (guided) | 4:00 | 3 min |
| 1 | Routine | Mara | Abdomen skin → bowel | Scalpel, Laser, IV Push, a complication | 4:30 | 4 min |
| 2 | Shrapnel Night | Mara | Chest skin → lung and rib | Scanner, hidden objects, scripted Code | 5:00 | 5 min |
| 3 | Something Moved | Mara | Liver | Tumor, Introit, the Hush | 6:00 | 6 min |
| 4 | The Night Ward | Mara | Lung | Lacrimosa, no guidance | 6:00 | 6 min |
| 5 | Second Opinion | Pet | Femur | Bone reassembly, tremor, the Echo | 6:00 | 5 min |
| 6 | Dies Irae | Pet | Pericardium | Cryoprobe, Fever, heat rings | 7:00 | 6 min |
| 7 | Libera Me | Mara + Pet | Beating heart | Everything, the partner, the Duet | 9:00 | 8 min |
| – | Code Blue | 1–4 surgeons | Torso | Escalating triage, the co-op and hub round | 4:00 | 4 min |

With story that is about an hour. A test must prove every tool, hazard, strain, gift and the Code are
exercised by the campaign (§11.2).

**Strain scripts** (each is a state machine in code; its numbers are in the case's data)

**Introit, 3/4.** A violet nodule moves under the tissue, seen as a bump. Every 3 beats it steps
somewhere new (a ripple telegraphs on beat 2) and leaves a laceration or pool behind. Scanner lights it
up; Laser it at rest until the shell pops; Forceps pull it within 2 beats. First kill: it splits in two
(60% heat each). Then four small quick ones on 2-beat steps. Last, an "Amen": they merge into a large
one held by 3 tethers (Scalpel), then Laser, then Forceps. The Hush wakes when vitals fall under 35 or
at the second split, whichever is first: the meter fills, Bashir says "Doctor... your hands," and the
prompt appears.

**Lacrimosa, 6/8.** A crown on the lung with 6 teardrop sacs on stems. Sacs swell for 8–12 beats and
burst at full size into caustic pools (heavy drain, burns). Laser a stem (0.6 s) to drop a sac whole, or
Suction it slowly for a lower rating. When a wave is cleared, the crown's eye opens for 4 beats: Scalpel
across it, twice. Three waves, each faster. Last, tear out the eye with Forceps and Gel the bed.

**Dies Irae, 5/4.** A Fever meter fills (over 100: −6 vitals/s). Five embers around the pericardium heat
the tissue. Each 5th beat a heat ring sweeps the field: if your trigger is held as it crosses, you scorch
the tissue and lose your chain. Count-in and "Lift off!", a rhythm dodge. Cryoprobe an ember, Scalpel to
crack it, Forceps the 3 pieces out; each removal cools the Fever. Burns take Gel. Midway two embers merge
and roam. Finally an incision reveals the furnace beneath: all tools in sequence.

**Libera Me, shifting meter.** The heart beats visibly and hard. A: Introit nodules plus pools. B:
Lacrimosa sacs on the coronary arteries. C: embers and heat rings (7/8). D: the strain stops the heart:
three shocks, each on a ghost beat. E: the Soloist surfaces. Scalpel strokes appear on the beat, nearly a
rhythm game, with a Duet window. Then a long tendril: Forceps, pulling only in diastole, a tug-of-war with
the pulse. Close with the Dressing. Teddy and Pet call it, since Bashir is the patient.

**Code Blue.** A director spawns waves from the hazard set on one patient, with budget ×(0.6 + 0.4n) for n
surgeons and rising tempo every 30 s, ending in a small strain encounter. The team wins if the patient is
alive at the end. Each surgeon has their own score, chain and seat colour. Also playable solo or local.

---

## 5. Screens and UX

**10-foot rules.** Lay out every screen on a virtual 1920×1080 canvas: set egui's zoom so the screen is
1080 points tall (`zoom = height_px / 1080 / scale_factor`, in the app and in the headless UI alike).
Body text ≥ 30 px, menu items ≥ 44 px, at most about 6 choices per screen, generous spacing, no
scrollbars, no data tables, no tooltips needed to play. Check by screenshot at 1920×1080.

**One game, two inputs.** Menus are focus lists: D-pad or stick plus Cross and Circle; arrows or WASD plus
Enter and Esc; **mouse hover moves the focus and a click activates**. Do not use the engine's virtual menu
cursor on the pad. All click targets are real: menu items, instruments on the tray, the "advance" area in
story scenes. In operations, hovering a valid target highlights it.

**Prompts.** A single `prompt(action)` helper draws the glyph for the device used last: PlayStation glyphs
drawn as vector shapes (× ○ □ △ in their colours, L1 R1 L2 R2, Options, sticks, D-pad), or Xbox A B X Y and
LB RB LT RT if Settings says so, or keycaps and mouse-button icons. It flips the moment the player touches
another device, with no restart.

**Flow.** Boot → **Title** → (10 s idle → **Attract**) → **Main menu**: Continue · New Game · Case Files ·
Code Blue · Settings · About. New Game asks for the difficulty; Continue resumes at the last case.
- **Story player:** the paper theatre with a large dialogue box. Advance, hold to skip the scene, a backlog,
  auto-advance. Voice blips play as text types.
- **Op HUD** (§5.1). **Pause:** Resume · Restart · Controls · Settings · **Dev Mode** · Quit to Title.
- **Results:** chart card, score lines appear one at a time, the rank stamp slams, the patient's fate.
- **Case Files:** one big card per case, best rank, locked ones shown dark; unlocked as you play.
- **Controls:** a picture of the pad or of keys and mouse (per device used last), with one line per action.
- **Save:** versioned JSON in `localStorage`, for settings, progress and ranks.

**Settings** (three pages, L1/R1 or tabs, each short).
- *Sound:* Music (**default 10%**), Effects (80%), Voices (70%).
- *Controls:* Button prompts (PlayStation or Xbox), cursor speed, aim assist, rumble, Pet's tremor.
- *Display:* screen shake, reduce flashes, field palette (Anatomical, or Clinical: blue-grey for the
  squeamish), text speed, fullscreen.

**About.** Paged, big text: Credits (engine, font, any clip packs, with licences), then Source Information,
Testing Feedback, Engine Feedback and Prompt Feedback exactly as your TASK.md asks, with `Usage: added on
import`. Keep this text as a JSON `<script type="application/json" id="about-data">` block in the final page,
read at boot, generated from your exit-interview answers. That way nothing is hard-coded, and the importing
agent can add the real usage figures without rebuilding the wasm.

**Attract.** After 10 s with no input on Title or any main-menu screen, load the attract scene: the bot plays
with cheats (immortal patient, full gifts) through a loop of about 25 s segments: Case 3's Introit with a
Hush, Case 4's flood, Case 5's Echo, Case 7's Duet, four bot surgeons in Code Blue, one story exchange. Show
"DEMO" and a press-any-button prompt for the current device. Any input (key, mouse move or click, pad button
or stick, tap) returns to Title at once.

**Touch-only devices** (no `any-pointer: fine`, and no key or pad used so far): no touch controls at all.
Title shows **"Controller or keyboard required"** and a Settings button that a tap can use. Attract still
runs. If a key or pad ever arrives, unlock normally. Bypass the engine's touch layer completely in this mode.

### 5.1 The operation HUD
- **Top:** a heart icon pulsing on the beat, big vitals number and bar (left); the live ECG trace across the
  middle; a big countdown (right).
- **Bottom:** the instruments on a steel tray in the 3D scene. The selected one lifts and glows; a ring hint
  shows flick directions on pad or digits on keyboard, via `prompt`. Gift meter beside it, pulsing with its
  prompt when ready.
- **Bottom left:** speaker cameo and one short subtitle line.
- **A single "NOW" line** with the next objective; Square/Tab shows a short chart overlay. Early cases
  highlight the target on the field.
- **World-anchored:** rating text, chain count, co-op names beside cursors.
- **Banners:** OPERATION START, VITALS CRITICAL, CODE, COMPLETE. Low vitals add a red vignette that pulses
  on the beat.

### 5.2 Dev mode (from the pause menu)
A large, paged panel docked at the left with the field visible, with a **Live** toggle so sliders can be felt
in motion and a **Bot plays** toggle so you can watch while tuning.
- **Sliders (live), each with its default marked, plus Reset All:** vitals drain ×, timer ×, tool power ×, IV
  heal ×, strain speed ×, strain toughness ×, heart coupling, on-beat window (ms), cursor speed, aim assist,
  gift gain ×, gift duration ×, Hush time scale, Echo duration, chain window, rating strictness, wrong-tool
  penalty, Code window (s), score ×.
- **Tools:** immortal patient, freeze timer, full gift, one-hit strains, time scale, frame step, jump to any
  case and phase, skip phase, win case, force Code, kill patient, spawn any hazard at the cursor, overlays
  (hit radii, targets, beat window, assist radius), FPS and tick stats, rewind 5 s and snapshot save/load (the
  engine provides these), reload content (native only).

---

## 6. Art direction

Base: the engine's native look (cel bands, ink outlines, bloom, rounded solids). New art is made in code and
text; no image, model or audio files. Performance is out of scope, so be generous with detail, particles and
lights.

### 6.1 The operative field ✔ (the look is proven)
Draw it with one `DynamicMesh` per frame: a grid (420×240 ✔) over 22×12.6 units, `Style::Cel`, instance colour
white, with **per-vertex colour** doing the painting: a heightfield from a plate's lobes (ellipses
`h · max(0, 1 − dx²/a − dz²/b)^0.55`; tested with a = 22, b = 9, h = 1.25) plus low noise, colour ramps from dark bed through flesh to light top by
height, veins from thresholded noise, irregular pools from noise-perturbed distance. Hazards stamp into height
and colour (incision lips, raised blood film). Add a CPU toon highlight (a hard white band where `n·h` is high)
to make it read as wet. Parasites are SDF spheres and capsules with emissive parts; they look excellent ✔.
Tested values:

- Camera: tilt 73°, yaw 0, distance 19.9, fov 36°, follow lag 0, height offset 0, target (0, 0, 0.2).
- Light: sun direction (-0.25, -1, -0.35) × 0.42 warm white; ambient sky (.50,.50,.54), ground (.30,.22,.22);
  shadow-casting lamp at (-1, 7, -1), (1,.97,.9) × 0.9, radius 16; clear colour sRGB(16,40,44).
- Style: cel_bands 3, rim .12; outline_darken .45; bloom .35 at threshold 1.15; gi .6; vignette .35.
- sRGB: bed (74,22,30), flesh (214,92,84), top (246,150,128), vein (150,40,60), cut (44,8,14), pool (120,6,16),
  drape (34,112,116), parasite (58,26,96), core (36,18,66), eye (255,210,70) Unlit emissive 1.6, sacs
  (120,255,170) emissive .75.
- Set these in your emit at the end of `ViewBuilder::build` so `ViewSettings` don't fight them. Convert to linear
  with `srgb()`.
- **NaN trap ✔:** one NaN in vertex data (say `sqrt` of a negative) blows out into white bloom and black dither.
  Debug-assert finite.

Plates are data (lobes, palette, vessels, pulse amplitude): forearm, abdomen skin, bowel, chest skin, lung and
rib, liver, femur, pericardium, heart, torso. A teal drape frames the opening, with steel retractors. An incision
reveals the next plate: crossfade height and colour outward from the cut over about 0.8 s, with a camera push.
Sutures stay on as visible thread, pools leave stains, burns stay until gelled.

### 6.2 Instruments
Build them in code from SDF rounded cones plus rounded-box meshes in `Style::Lit` steel, so parts can animate (forceps tips
open, needle arcs, plunger moves, suction shudders). They cast real shadows on the tissue, an essential depth cue.
Draw the local player's tool at the render-frame cursor, not the tick, so it has zero lag.

### 6.3 Paper theatre for story ✔ (the look is proven)
SDF "vinyl" busts looked like dolls, so don't use them. **Layered, extruded spline cards** looked right ✔: clean
motion-comic characters that the engine lights, shadows and outlines, readable at 10 feet. Appendix A has the
recipe and tested proportions. Each character is a rig of parts in a text file: back hair, shoulders, neck, face,
cheek shade, eyes, brows, nose, mouth frames, front hair, accessories. At least 4 expressions per lead (neutral,
alarmed, stern, soft). Sets are cards too (about 8: corridor with rain, scrub room, Voss's office, gala atrium,
Night Ward, bus depot, recovery room, Vane's ship cabin), with parallax layers, particle rain, emissive monitors.
Use the same rig data flattened into `egui::Mesh` for the HUD cameo.

One or two 3D wide shots of the OR use engine puppets in scrubs (`look = { shirt, pants, skin }`) around a table
built from blocks, with clips such as `MESH2MOTION/Idle_Talking` and `QUATERNIUS/Idle_Loop` ✔. Use the engine's
asset library for generic props (shelves, tables, benches).

### 6.4 Effects
Particles: blood spurts and droplets (non-additive, stylised), cautery smoke and sparks, gel drops, frost, ember
motes, Hush dust, Echo trails. Distortion: Haze over hot tissue, Ripple on the gift trigger, Ring on defib. Filters:
Hush desaturates (`grade_part`), crisis adds chroma and vignette, and transitions (`Iris` onto the incision, `Fade`
between scenes) are all built in. Keep it stylised, like a medical illustration; no realistic gore.

### 6.5 Type and title
egui's default font is thin on a TV. Embed one OFL font: ✔ this URL resolves:
`https://github.com/google/fonts/raw/main/ofl/barlowcondensed/BarlowCondensed-SemiBold.ttf`. Credit it in About.
Give large text a dark outline. Title screen: a softly beating plate under the lamp with the ECG line drawing the
title's underline, rain on glass, the theme playing at its default level.

---

## 7. Animation
Base: the engine's system. Puppets and clips for the wide shots, and procedural motion through the same sim-driven
ticks for everything else.
- **Tools:** per-tool squeeze, cut, pull, plunge; recoil on Immaculate.
- **Tissue:** beat pulse, breathing swell, wound lips parting, pools spreading.
- **Strains:** creeping tendrils (follow-the-leader SDF chains), sacs swelling and quivering, nodules stepping on
  the beat with anticipation and settle.
- **Paper rigs:** blink, breathe, small sway (a yaw of ±2° gives real parallax between layers), mouth flaps during
  voice, head nod on stressed words, slide-in with overshoot, shake on shock, hair cards on springs.
- **UI:** rank stamp slam, chart slide, ECG sweep.

---

## 8. Audio
All in code, in `pav_audio`, with no files. Add **three buses** to the mixer: music (**default gain 0.10**), effects,
voices. `Cmd` gains a bus; `Mixer` raises `MAX_VOICES` (it drops the oldest at 64).

- **Effects:** `sounds_for` is a closed match. Add `SimEvent::Cue { id, pos, gain, pitch }` and a cue table of about
  35 sounds: tool pick clinks, scalpel slice, squish, forceps click and pull pop, suture zip, suction gurgle
  (grains), laser hum and sizzle, gel squirt, IV hiss, sonar ping, defib whine and thump, lub-dub, monitor beep,
  alarm, rating stings, chain up, on-beat tick, strain stingers, burst, UI nav/confirm/back, banner hits, flatline
  tone.
- **Music:** a small note-event sequencer on the render thread that schedules ahead with `Mixer::play`'s `delay`
  argument, so tempo can follow the heart. Tracks: title theme (slow, minor, piano-like), two story beds (tender,
  tense), the OR loop whose bass lands on the actual heartbeat, a crisis layer that fades in as vitals fall, a motif
  per strain in its own meter (3/4, 6/8, 5/4, 7/8), the Hush state (everything low-passed, one held note), results
  fanfare, Code Blue drive. Compose real melodies, not arpeggio noise.
- **Voices:** Animalese-style. Each syllable of the text is a short (about 70 ms) pitched blip through two
  resonant formant filters chosen from the vowel. Per-character base pitch, waveform and speed (Mara quick and
  high, Pet low and slow, Bashir level, Teddy jittery, Voss glassy, Vane warm); falling pitch at full stops, rising
  at question marks. Add a resonant band-pass to `Patch`.
- **Browser:** ✔ cpal's AudioContext runs at 48 kHz in headless Chromium. The engine resumes audio only on key or
  mouse, so also call resume on pad input and on hub start. If the browser keeps the context suspended
  after a pad press, show a small "press a key or click for sound" note on the title. Rumble: call `gamepad.vibrationActuator?.playEffect?.('dual-rumble', …)`
  from a small JS helper on the beat when vitals are low and on tool contact.

---

## 9. Multiplayer

**Read** the protocol whole: `https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/README.md`. Client,
harness and helpers are beside it (`session.js`, `harness.html`, `bridge.js`, `round.js`).

**On its own:** Code Blue and all cases take 1–4 local surgeons. Any unassigned pad joins with Cross. Outside a session
the game is entirely unaffected by the hub.

**In a hub session:** one Code Blue round, in mode **`shared-world`**, seats 1–4, 4 minutes, with the game's own card.
- **Tags:** `hub:session` 1, `hub:session-players` 1-4, `hub:session-mode` shared-world, `hub:session-minutes` 4,
  `hub:webgpu` required, `hub:session-goal` (under 60 characters: keep the patient alive), `hub:session-howto` (under 80).
- **Client:** `session.js` pasted unmodified as the first script, right after `<meta charset>`. Do this in
  `engine/scripts/pack_single_html.py`.
- **Shape ✔:** a JS shim (Appendix B) owns every `AIHub` call and queues events; Rust polls it. A JS-only version of
  this shim on the starter game **passed the harness in every run**: `players=4` with latency 150, jitter 50, loss 5;
  `scenario=host-leave`; `players=2&scenario=server`; `players=1`. About 10–12 s each. So the protocol side is low risk.
- **Flow:** `AIHub.active` → skip title, attract and menus → wait for `connect` to answer (it answers `null` after 10 s if
  there is no hub: then run as on its own) → card scene → `ready()` after first frame, with no key → `start` → countdown
  to `AIHub.time() >= 0` → play. Seed the host's sim from `info.seed`.
- **Own card:** drawn as a pre-op board: the title, patient, each player in their colour with a ready mark, how to win,
  this player's controls, time left. Enter, Cross or tap → `answer('ready')`; Triangle or a named key → `answer('more')`.
  No choices on it. Use `AIHub.rng('card')` for any randomness.
- **Network:** the host's `Sim` is authoritative. Clients run a `surgery/mirror` scene that renders from received
  frames. Clients send their surgeon's input to the host at about 15 Hz (`reliable: false`) with tool changes and button
  edges repeated until seen. The host sends one snapshot at about 15 Hz (`reliable: false`): vitals, beat phase, BPM,
  timer, hazards (quantised arrays), cursors, and the last 8 cue events with ids so clients can de-duplicate. Keep it
  under 1,200 bytes when you can. Each copy may send at most 20 messages a second. Predict locally: your own cursor, tool animation,
  tool sound, particles. So **`SurgeryFrame` is the single source of everything drawn**: built from the sim on the
  host, decoded from JSON on the client.
- **Server scenario** (`AIHub.server`): run the world with no local slot, camera or sound, and skip drawing.
- **Rules:** names come from the hub and appear only through egui text. Colours by seat: `#e8443a #3b82f6 #22c55e
  #f5b700`. No pause, restart, quit or chat in a session. Options is ignored; Create + Options belongs to the hub.
- **Ending:** on `time-up`, the shim calls `finish` at once from the standings Rust last published, since frames may
  be slow. `standings` by score, `scores`, `won` = patient alive, `stats`, `awards` ("Immaculate Hands" and so on).
  `leave` frees the slot. On `end`, stop input and sound.

---

## 10. Building it on the engine

### 10.1 Setup ✔
```sh
git clone https://github.com/michaelcrosato/shardfall.git engine
cd engine                                    # run every pav and cargo command from here
CARGO_BUILD_JOBS=6 cargo build --locked -p pav_tools --bin pav     # about 3 min first time
./target/debug/pav play scene=starter bot=true seeds=3             # wins, 0.4 s
./target/debug/pav capture scene=starter ticks=120 width=960 height=540 out=out/a.png     # under 1 s, software
scripts/build-web.sh --single-file --scene starter --title "T" --out ../t.html            # about 2 min first, then about 1 min after a pav_core edit; about 11 MB
```
Stay inside your dev folder: other agents build beside you. Read `engine/START_HERE.md` and all of `engine/docs/MAKE_A_GAME.md`
(short), plus "Key rules" in `engine/AGENTS.md`.
Linux packages, Rust 1.98.1 and its wasm target, and wasm-bindgen 0.2.129 (matches the lock) are already on this
machine ✔. `target/` reaches about 2.4 GB. Use `git log` to confirm you are at or after `49ef2ba`; if `main` has moved
and something here doesn't match, trust the code.

### 10.2 Where things go
```
engine/crates/pav_core/src/games/surgery/   mod.rs (Game impl, phase machine), tune.rs (every slider),
    surgeon.rs, field.rs (hazards, tool logic, rating), heart.rs, strain/*.rs, director.rs (case data runner),
    story.rs (scene player), paper.rs (spline, triangulate, rig data), bot.rs, frame.rs (SurgeryFrame), net.rs
engine/crates/pav_core/src/games/surgery/content/   cases/*.toml story/*.toml plates/*.toml rigs/*.toml
    sets/*.toml level.toml README.md (the designer guide)
engine/crates/pav_view/src/surgery/         plate.rs, instruments.rs, strains.rs, paper.rs, fx.rs, shots.rs
engine/crates/pav_ui/src/surgery/           shell.rs (screens state machine), hud.rs, menus.rs, settings.rs,
    dev.rs, about.rs, card.rs, glyphs.rs, style.rs
engine/crates/pav_audio/src/                music.rs, voice.rs, cues.rs
engine/crates/pav_app/src/                  product.rs (the game's own frame path), hub.rs (wasm bridge)
engine/web/                                 index.html, session.js, hub_shim.js
tests/                                      run_all.py, browser/*.py, hub/ (downloaded harness), out/
```

### 10.3 Two layers
**Sim layer (`Game` hook, deterministic, testable with `pav`).** Cases *and* story live here as one phase machine. Scene
names: `surgery/campaign`, `surgery/case/<n>`, `surgery/codeblue`, `surgery/attract`, `surgery/title`, `surgery/card`,
`surgery/mirror` (✔ the engine passes everything after the first `/` to your `build`).
The bot presses through story and plays operations, so **`surgery/campaign` is the scripted playthrough of the whole
game** and runs headless in seconds. Follow the engine's rules: `sim.state.rng` only, no clock, no `HashMap` order in
state, everything in your struct or entities, no threads or files in `pav_core`. Keep the struct compact: rewind clones
it every 20 ticks. Use `dt × time_scale` in rules for the Hush, not the engine's speed control, so the cursor stays
real-time.

**The bot** (`Game::bot`, one implementation) is a task planner: it picks the most urgent valid task, selects the tool, moves
at a human cursor speed and performs the gesture, with noise scaled by `bot_skill`. It drives the tests, the balance tool,
attract mode, the Case 7 partner and the Echo's ghost hands. Teach it each rule as you add the rule.

**Shell layer (`pav_ui::surgery::Shell`, plain Rust plus egui).** Title, menus, pause, settings, dev, about, results input,
attract timer. It must keep working while the sim is paused. It takes an abstract input (nav, confirm, back, tabs, pointer,
last device) and emits commands (load scene, resume, set tune value…). Draw it in both `pav_app` and
`pav_ui::headless::Headless::frame`, so `pav ui` and `pav capture` see it and `cargo test` can drive it without a GPU.

### 10.4 Engine seams you must open (the hook alone cannot draw any of this)
1. `pav_core/src/frame.rs`: `RenderFrame.surgery: Option<Arc<SurgeryFrame>>`, filled in `Sim::frame`, exactly as
   `RenderFrame.game` is for Shardfall. Add `SimEvent::Cue`.
2. `pav_core/src/input.rs`: add `surgeons: [SurgeonInput; 4]` to `InputFrame` (it is `Copy` and recorded, so replays include
   it) and a game command field beside the Shardfall-only `cmd`. `SurgeonInput { active, aim: Vec2, held, pressed, tool,
   pressure: f32 }`. Extend the `input` tool (`surgeon slot=1 aim=[x,z] hold=use tool=3 ticks=30`).
3. `pav_view/src/build.rs`: call `self.surgery.emit(&mut scene, curr, …)` where `self.arpg.emit` is called. Handle cues for
   particles in `add_events`.
4. **Camera:** there is no per-game camera. Put a `CameraShot { target, tilt, yaw, distance, fov, blend }` in `SurgeryFrame`
   and apply it to `CameraRig` in both `pav_app` and `pav_tools/src/session.rs` (`render_ui`, `sync_camera`). `sim.state.focus`
   is the camera target.
5. `pav_core/src/scenes.rs`: `build_standalone_room` always spawns a player. In `build`, call `sim.despawn` on it ✔: that clears
   `sim.state.player`, the sim steps and captures fine without one, and `sim.state.focus` then stays where you put it.
   The level file holds only the OR wide-shot set, offset away from the field (e.g. `[layout] origin = [90, 0, -8]`), so it
   is on screen only when a shot looks at it.
6. **`pav_app/src/product.rs`: a separate frame path.** `App::frame` is about 800 lines of demo behaviour, and these must all
   be off for this game ✔ (seen in the browser build): boot, stats and guide panels, room card, hint bar, toasts, touch layer,
   F1–F12 keys, `H`, digits changing camera, wheel zoom, right-drag camera, **Backspace and Create rewinding the sim**, Options
   opening the engine's dense pause menu with its virtual cursor, `Bindings` mapping Space to jump. Don't add forty conditions;
   when the scene is `surgery*`, branch at the top of `frame` and `window_event` into your own code, reusing `Gfx`, `SimHost`,
   `ViewBuilder` and `CameraRig`. Also hide the OS cursor in operations and replace "Shardfall" in window and error text.
7. `pav_app/src/input.rs`: `poll_gamepad` reads only the first pad and thresholds triggers at 0.35. Add analog L2 and R2 and
   per-pad state for up to 4 pads. ✔ gilrs reads a stubbed DualSense in the browser.
8. `pav_ui/src/headless.rs` and `pav_tools/src/session.rs::has_ui`: include the shell and HUD. Leave `Game::hud` empty (those lines
   are drawn as a debug box at the top left) and put state for tests in `Game::status`.
9. `scripts/pack_single_html.py` and `web/index.html`: session client, tags, shim, about block; `--title`, `--description`,
   `--theme-color` exist. **The packer rejects wasm-bindgen snippets ✔:** no `inline_js`. From Rust use `js_sys::Reflect` on
   `window`.
10. **Adding a dependency:** `build-web.sh` uses `--locked`. After changing a `Cargo.toml` (you will need `js-sys` in `pav_app`),
    run `cargo check -p pav_app --target wasm32-unknown-unknown` once without `--locked` to refresh the lock.

**Test hook:** from `pav_app`, set `window.__game` via `Reflect`: `status()` → JSON (screen, focus, device, prompt glyph ids,
open panels, sim status, bus gains and peaks), `step(n)` (run ticks now), `do(json)` (shell command). Browser frames are slow
in software rendering ✔ (2–8 fps at 960×540 on this busy machine, at most 8 ticks a frame, then time is dropped), so tests must
not wait on real-time play.

### 10.5 Data and designer tools
"The rest of the game could be built with normal designer tools" means cases, story, plates, rigs and sets are text files a
designer edits, with errors that name the file and line, and live reload.
- **Case file:** `surgery`, `plate`, `ring`, `timer`, `par`, `vitals`, then `[[phase]]` with `spawn` lists, triggers (`on_clear`,
  `at_time`, `vitals_below`, `on_beat`), `callouts`, `strain` + params, `reveal_plate`, `checkpoint = true`.
- **Story file:** `[[line]] who, expr, text`, plus stage commands `set, enter, exit, music, cue, camera, flash, shake`.
- Load through a `content_text(path, include_str!(…))` like `games::level_text` (disk first when native, so edits need no rebuild,
  and embedded in the browser). A test checks every content file on disk is embedded.
- Add `pav case_check path=…` (like `room_check`), and `pav balance` (§11.2).
- `content/README.md`: how to add a case, strain, line of dialogue and character, in one page.

---

## 11. Testing

Rules from your TASK.md: one command, printing only failures and a one-line count; rerun only after changing what it covers;
screenshots only for what a script can't check; no subagents or workflows to debate, review, judge or audit.

### 11.1 `tests/run_all.py`
Runs everything below with output captured, prints failures and `N passed, M failed`. `--rust` or `--web` for a part. Use the
system `python3` **without `-I`** ✔ (`-I` hides Playwright). Keep one or two browsers open at most.

### 11.2 Rust (fast, no GPU)
- Bot wins every case and the whole campaign on 10 seeds at skill 1.0 (`bot_skill` scales speed and accuracy).
- A careless player (idle; random tool spam) loses every case.
- Determinism: snapshot, rewind and replay hashes are exact (copy `engine/crates/pav_core/tests/games.rs`).
- **Coverage:** counters in the campaign prove every tool, hazard, strain phase, gift and Code fired, and every rating was reachable.
- Rule units: each tool's rating thresholds, wrong tool, chain, ranks, beat window, Code, retry checkpoint.
- Content lint: every file parses, every referenced speaker, expression, plate and cue exists, no empty text, no leftover "TODO".
- **Balance:** `pav balance seeds=20 skills=1.0,0.7,0.4` prints wins, time, vitals left and suggested `par` per case. Target: 1.0 always
  wins at S or above; 0.7 wins most; 0.4 loses later cases; 0 always loses. Tune with this rather than by feel alone.
- Shell: pad, keyboard and mouse navigation through every screen, hover moves focus, prompts follow last device, Xbox setting, attract
  starts at 10 s and exits on any input, touch-only state, dev sliders apply and reset, About shows every required section.
- Audio: music default gain is 0.10; every cue and voice renders non-silent offline; each track renders; extend `audio_capture`.

### 11.3 Browser (built single file, `file://`)
Launch Chromium with exactly ✔ `--enable-unsafe-webgpu --enable-features=Vulkan --use-webgpu-adapter=swiftshader --use-vulkan=swiftshader
--use-angle=swiftshader`. With these, canvas screenshots show real pixels ✔. Check through `window.__game`:
- Boots with no console errors; right title; none of the engine's overlays.
- Stubbed DualSense (Appendix D) ✔: menus, analog R2 reaches the sim, flick selects tools, Options pauses. Keyboard and mouse: tools, wheel, hover,
  click. Prompts flip between devices.
- Attract at 10 s and exit on key, pad and mouse.
- Phone profile (Chromium device profile, tap with `page.touchscreen`): message, Settings button, no touch controls, attract runs. Also load a
  WebKit iPhone profile as far as it goes (it has no WebGPU here, so expect the page's WebGPU message).
- Audio: analyser tap (Appendix D) ✔ reads non-silence; `status()` shows music 0.10.
- Settings persist across a reload.
- `step` the whole `surgery/campaign` in the browser with the bot and reach Won.
- Screenshots at 1920×1080 of title, op, story, results, dev, about into `tests/out/`; look at them when visuals change. For quick looks, `pav capture`
  and `filmstrip` are cheaper.

### 11.4 Hub
Copy the game next to `harness.html`, `bridge.js`, `round.js` in `tests/hub/`. Serve with `python3 -u -m http.server 0 --bind 127.0.0.1 -d tests/hub`.
**Use `-u` ✔: without it the port line is buffered when piped and your script hangs forever.** Read the port from the first line, and check that the
page is your game. Stop only the server you started, by PID; many other agents' servers and browsers run on this machine ✔. Wait for
`document.body.dataset.complete === 'true'`, then require `window.__hubCheck.pass`, for each query:
`players=4&latency=150&jitter=50&loss=5&auto=1`, the same with `&scenario=host-leave`, `players=2&scenario=server&auto=1`, `players=1&auto=1` (add
`&limit=20` for speed). Then a two-copy test reading each frame's `__game.status()`: a client's input moves its cursor on the host; both see the same
vitals. Then open outside a session: title appears, the game is unaffected.

---

## 12. Build order

Keep it playable after every step. Build the slot and frame architecture from step 1 so co-op needs no rewrite.

1. **Seams.** Set up (§10.1). Scene `surgery/case/0`, `SurgeryFrame`, product frame path, camera shot, plate rendering, one surgeon, forceps on a hook,
   rating text, vitals, heart clock. Bot wins it; tests run; browser boots with the shim's session client in place. Check the look at 1920×1080.
2. **Hands.** All instruments and hazards, ring, aim assist, chain, results, death and retry, tray, full HUD, cues. Cases 0–2 as data. Bot, coverage and balance tools.
3. **Shell.** Title, menus, pause, settings, save, prompts and glyphs, 10-foot style, touch-only, attract, dev mode. Browser tests.
4. **Theatre and sound.** Paper rigs, sets, story player, voices, music with buses; story for Cases 0–3.
5. **Strains and gifts.** Introit and Hush, Lacrimosa, Echo and tremor, bone reassembly, Dies Irae and Cryoprobe, Libera Me and Duet. Cases 3–7 with their stories.
6. **Together.** Multi-pad local co-op, Code Blue, partner bot, hub bridge, card, mirror scene, network. Hub tests.
7. **Finish.** Balance every case. Polish passes: an audio mix pass, camera punches, particles, transitions. Designer guide. Final package.

If you run short, a smaller finished game beats a bigger unfinished one. Cut in this order: fewer sets, then fewer waves in a strain, then Case 4 or 5's
length. **Never cut:** any tool, gift or screen in this plan, or Case 3 and Case 7.

---

## 13. Finish line

**Package.** One self-contained HTML at the path your TASK.md names, built with `scripts/build-web.sh --single-file --scene surgery/title --title … --description …
--theme-color … --out …`, with fonts and everything else embedded. It must run from `file://` in Chrome or Edge; browsers without WebGPU get the page's clear message
(call `AIHub.fail` in a session). Delete `engine/target` when finished, so only source remains in your dev folder.

**Feedback.** Keep notes as you go on what tests caught and what you read or changed in the engine: your TASK.md asks for counts and specifics at the end. Follow its exit
interview shape exactly and check it parses. Suggested catalogue values (name and tagline are yours): type `Game`; genre `Simulation`; source as your TASK.md's; series `Trauma Center`; players `1–4`; controls such as "Right stick or mouse aims, R2 or left click operates, left stick or 1–8 picks tools"; tags from `3d, story, co-op,
arcade, boss fights, comedy`. Regenerate the About block from those answers and rebuild last, then rerun the web tests.

**Done means** no TODOs, placeholders or stubs; every test passes; the campaign and every case can be finished by a person with a pad, or with a mouse.

### Requirements map

| Your TASK.md asks for | Where |
|---|---|
| Genre and perspective | §1 |
| Title riff chosen by RNG, single constant | Top note; you do this |
| Single HTML package, dev subfolder | §10.1–10.2, §13 |
| Build on the engine, change anything needed | §10 |
| Art and animation on the engine's native style, new assets | §6, §7 |
| Audio in code, gibberish voices, music 10% | §8, §5 Settings |
| AI Hub online, plus the game on its own | §9 |
| Shared machine rules (ports, PIDs, folders) | §10.1, §11 |
| Unlimited performance budget | §6 |
| Headless tests, one command | §11 |
| Original game; world, characters, themes, tone → mechanics | §1–§4 |
| Feature-complete vertical slice showing all mechanics | §3, §4, §11.2 coverage |
| Infrastructure for later content with designer tools | §10.5 |
| Dev mode from pause, sliders, reset | §5.2 |
| Attract mode | §5 |
| Narrative tone | §2 |
| 10-foot, DualSense first; native mouse and keyboard; prompts follow input; Xbox glyph setting; no dense screens | §3.2, §5 |
| Touch-only message, settings, attract | §5 |
| No stubs | §13 |
| Source Information and feedback in chat and About | §5 About, §13 |
| Exit interview | §13 |

---

## Appendix A: paper cards ✔

Geometry, tested through `pav_render` `DynamicMesh`:
1. Take a closed list of 2D points. Round it with **Chaikin corner cutting** (2–3 passes; 0–1 for sharp pieces like collars and brows): each edge a→b yields `a.lerp(b, .25)` and `a.lerp(b, .75)`.
2. Force counter-clockwise (signed area > 0), then **ear-clip** into triangles (concave hair shapes need it).
3. Emit front-face vertices at `z` with normal +Z, plus edge quads back to `z − depth` with outward normals, so cards cast shadows and take outlines.
4. Each part: `DynamicMesh { color, style: Cel, group: unique, flags: 0, material: 0 }`, vertices transformed by the character's `Mat4` (a translation and `rotation_y(±0.22)` gives a 3/4 stance with real parallax).

Layers, back to front, `z = n × 0.035`, `depth = 0.03`: back hair (0) · shoulders (1) · neck (1.6) · neck shade (1.9) · collar and badge (2.2) · face (3) · cheek shade (3.2) · eye white (3.6) · iris (3.8) · pupil (4) · glint (4.2) · upper lid line (4.4) · brows (4.4) · nose wedge and mouth (3.6) · front hair (5) · glasses (5.2). Parts that share an edge can share a `group`; a new group draws an ink line.

Tested proportions (unit: face about 1.5 wide; `z` here is the layer number n). Rig file sketch:
```toml
[part.face]    # chaikin 3
z = 3
color = "skin"
points = [[-.76,.76],[-.74,.28],[-.56,-.16],[-.26,-.5],[0,-.6],[.26,-.5],[.56,-.16],[.74,.28],[.76,.76],[.52,1.22],[0,1.32],[-.52,1.22]]
[part.eye_white]   # chaikin 2; mirror x. Eye centre (±.34,.34), iris r .085, pupil r .042, glint r .018
points = [[.15,.33],[.28,.45],[.44,.45],[.54,.34],[.42,.26],[.26,.26]]
[part.fringe]  # chaikin 3, Mara's side-swept
z = 5
points = [[-.86,.38],[-.9,1.1],[-.42,1.62],[.26,1.68],[.8,1.36],[.92,.8],[.84,.3],[.68,.74],[.36,1.02],[-.16,.98],[-.42,.72],[-.68,.56]]
[part.shoulders]  # chaikin 2, V neck
z = 1
points = [[-1.72,-2.4],[-1.66,-1.36],[-1.2,-1.02],[-.52,-.82],[-.3,-.72],[0,-1.34],[.3,-.72],[.52,-.82],[1.2,-1.02],[1.66,-1.36],[1.72,-2.4]]
[mouth]  # talking frame vs closed
open   = [[-.15,-.255],[0,-.2],[.15,-.255],[.08,-.36],[-.08,-.36]]
closed = [[-.16,-.26],[0,-.235],[.16,-.26],[0,-.285]]
```
Stage: eye (0, 0, 14), looking −Z, fov 26°; ambient sky (.74,.74,.78), ground (.6,.56,.56); sun direction (.3,-.45,-.85) × .34; cel_bands 3, rim .05; outline_darken .32, outline_px 1.4; gi .4; vignette .32; characters at x ≈ ±3.1, y ≈ −0.7. Colour samples, sRGB: Mara skin (242,200,172), shade (214,158,136), hair (46,36,60), scrubs (46,150,146). Pet skin (122,80,58), shade (92,58,44), silver hair (226,226,232), scrubs (98,70,136). Bashir skin (190,142,104), scrubs (60,104,164). Make the cheek shade subtler than a hard wedge: that was the one weak part of the test.

## Appendix B: a hub shim skeleton ✔ (the protocol calls are tested)

```js
// engine/web/hub_shim.js, inlined right after the session client
(function () {
  const H = window.__hub = { active: !!(window.AIHub && AIHub.active), info: null, events: [], last: null };
  if (!H.active) return;
  AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true }).then((info) => {
    H.info = info;
    if (!info) { H.active = false; return; }      // no hub after all: run as on its own
    for (const ev of ['card', 'start', 'leave', 'end']) AIHub.on(ev, (d) => H.events.push([ev, d]));
    AIHub.on('message', (d, from) => H.events.push(['message', d, from]));
    AIHub.on('time-up', () => {                   // answer now: frames may be slow
      H.events.push(['time-up']);
      if (AIHub.isHost) AIHub.finish(H.last || { standings: [AIHub.players.map((p) => p.id)], won: false });
    });
  });
  addEventListener('keydown', (e) => { if (e.key === 'Enter') AIHub.answer('ready'); }, true);
  H.poll = () => { const a = H.events; H.events = []; return JSON.stringify(a); };   // Rust, every frame
  H.ready = () => AIHub.ready();                                                     // Rust, after first frame
  H.answer = (what) => AIHub.answer(what);                                           // the card: 'ready' or 'more'
  H.time = () => AIHub.time();
  H.finish = (json) => AIHub.finish(JSON.parse(json));                               // host, at the round's end
  H.send = (json, to) => AIHub.send(JSON.parse(json), { reliable: false, to });
  H.publish = (json) => { H.last = JSON.parse(json); };                              // Rust, about once a second
})();
```
The harness pokes `Enter` with a synthetic `KeyboardEvent` inside each frame, so listen in JS, not only through winit.

## Appendix C: the fragment for the page ✔

In `pack_single_html.py`, after loading the page:
```python
page, n = re.subn(r'<meta charset="utf-8">\n',
    lambda m: m.group(0) + '<script>\n' + client + '\n</script>\n' + tags + '<script>\n' + shim + '\n</script>\n', page, count=1)
```
`client` is `session.js`, byte for byte (its `/*! aihub-session` banner lets the hub replace it). The packer already refuses JS glue holding `<script`, `</script` or `<!--`; apply the same check to the client and the shim. ✔ `session.js` holds none.

## Appendix D: browser stand-ins ✔

```python
PAD = """
(() => { const buttons = Array.from({length: 17}, () => ({pressed: false, touched: false, value: 0}));
  const pad = {id: 'DualSense Wireless Controller (STANDARD GAMEPAD)', index: 0, connected: true,
               mapping: 'standard', timestamp: 0, axes: [0,0,0,0], buttons};
  window.__pad = pad; navigator.getGamepads = () => [pad, null, null, null]; })();
"""
page.add_init_script(PAD)                       # then: page.evaluate("__pad.axes[0]=1; __pad.timestamp++")
```
Standard mapping: 0 Cross, 1 Circle, 2 Square, 3 Triangle, 4 L1, 5 R1, 6 L2, 7 R2, 8 Create, 9 Options, 10 L3, 11 R3, 12–15 D-pad, 16 PS; axes 0–1 left stick, 2–3 right. Set `value` as well as `pressed` for triggers. Add a second pad at index 1 for co-op.

```python
TAP = """
(() => { const real = AudioNode.prototype.connect; window.__an = [];
  AudioNode.prototype.connect = function (dest, ...rest) { const r = real.call(this, dest, ...rest);
    if (dest instanceof AudioDestinationNode) { const c = this.context;
      if (!c.__an) { c.__an = c.createAnalyser(); c.__an.fftSize = 2048; window.__an.push(c.__an); } real.call(this, c.__an); }
    return r; };
  window.__peak = () => { let m = 0; for (const a of window.__an) { const b = new Float32Array(a.fftSize);
    a.getFloatTimeDomainData(b); for (const v of b) m = Math.max(m, Math.abs(v)); } return m; }; })();
"""
```
✔ This read a peak of 0.65 from the engine's cpal output during play.
