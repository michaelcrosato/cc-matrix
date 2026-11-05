# PLAN: a surgical drama in pixel art

The source is *Trauma Center: Second Opinion* (Atlus, Wii, North America 2006-11-19; a remake of *Trauma Center: Under the Knife*, DS, 2005). This plan is the full design and build guide for an original game inspired by it.

Your brief wins if this plan conflicts with it. Pick the title the way the brief says; this plan never names one, and no story text may depend on it. All paths are relative to the dev folder.

**How to read this plan**

- **✔ means verified.** I ran it in this machine's Chromium (software WebGPU) on engine 0.46.0, from `file://` unless noted. Trust those facts and numbers. If the kit you download is newer, read its `CHANGELOG.md` first.
- Everything else is a design decision. Refine the details if something plays better, but keep the goal each one serves.
- Read the kit's `GUIDE.md` and `ASSETS.md` whole, and search `API.md` for exact signatures.
- Words used throughout:
  - **field**: the operating surface.
  - **art pixel**: one pixel of the engine's low-resolution picture.
  - **seat**: one surgeon at the table, human or bot.
  - **strain**: a boss pathogen.

---

## 1. The game

**Pitch.** You are a clumsy second-year surgical resident in a rain-soaked port city. Your hands, a terrifying nurse in your ear and a talent you can't explain stand between your patients and a cure that is worse than any disease. Each surgery is a tense action game played with precise instruments against the clock. Between surgeries it is a melodramatic hospital drama, played completely straight.

- **Genre:** surgical action with visual-novel medical drama. `Simulation` is the nearest catalogue genre.
- **Perspective:** first-person, surgeon's-eye, fixed close-up on a 3D operating field during surgery. Story scenes use talking-head close-ups and cinematic 3/4 shots of the rooms.
- **Players:** 1 in the campaign. 1 to 4 in Consult, on one TV (couch) or on separate devices (AI Hub shared world).
- **Length:** a first run takes about 80 minutes: 10 story operations plus scenes. One Consult round takes about 4 minutes.

**Pillars**

1. **Your hands are the game.** Each tool is a distinct physical verb with its own feel, sound and rumble.
2. **Every second bleeds.** Vitals and the clock force constant small triage decisions.
3. **Melodrama, played straight.** Hot-blooded rookie, icy rival, gentle villain, absurd stakes, nobody winks.
4. **A second opinion.** Two doctors with two different gifts, and a second pair of hands at the table in co-op.

**What the source's critics complained about, which we fix**

- Unreliable gesture activation: gifts are a simple hold or press.
- Difficulty spikes: three difficulties, per-stage retry, tunable balance.
- Emotional distance from patients: every patient gets a chart hook and a follow-up line.
- Minimal portraits: expressive 3D busts.

**Originality is a hard rule.** Take the genre and the feel: precision surgery under a clock, a nurse barking orders, a man-made disease as a boss, a time-bending gift, melodrama. Do not use the source's characters, organisations, disease, strains, gift names, star gesture, operations, levels, script lines, art, music or screen layouts.

Forbidden names include Derek Stiles, Angie Thompson, Naomi Kimishima, Nozomi Weaver, Hope Hospital, Caduceus, Delphi, GUILT, Kyriaki and the other day-named strains, and Healing Touch. The title's riff on the source's name is the brief's request; nothing else carries its name. All content below is original; use it.

**The first five minutes**

1. The title screen shows a dark operating theatre with one swinging lamp. An EKG line draws itself through the title.
2. "New Shift." Storm outside, 3 a.m. Nurse Reyes wakes Ilya with a clipboard to the head: a trawler deckhand has eleven fishhooks in one arm.
3. The camera dives from a wide shot of the theatre onto the arm. Your gloved hand and an instrument appear. Reyes tells you what to do, in gibberish voice and text, with the correct button glyph on screen.
4. You suck up blood with a satisfying slurp. You back the barbed hooks out along their curve, and each one tinks into the steel dish. The stitches rise in pitch as you zigzag.
5. A rank stamp slams onto the chart: "C. He'll keep the arm. Do better." A follow-up line says he made his daughter's wedding and danced badly.

Every system should serve that feeling.

---

## 2. World, cast and story

### World

**Port Verity**: a near-future harbour city where it never quite stops raining.

**Verity General Hospital** is underfunded, proud and leaking. Its old operating theatre, **OR-7**, has a glass observation gallery. Motto over the door: *"The truth, stat."*

**The Mercy Foundation** is a glamorous hospice charity that sponsors half the city's wards. Tagline: *"No one should hurt."*

**MERC-Y** ("Metabolic Endo-Receptor Cytoform, type Y", spoken as "Mercy") is the Foundation's secret comfort symbiont. It kills pain by rewiring nerves, then it eats. Patients smile while it kills them. Characters use the name with total seriousness: "There's Mercy in the bloodstream." "Show it none, Doctor."

The strains are named after movements of a requiem: **Introit, Lacrimosa, Dies Irae, Libera Me, Miserere**. Theme: pain is information, and telling the truth is the first act of care.

### Cast

Give each a distinct silhouette and voice.

| Who | Role | Look | Voice in text | Gibberish voice |
|---|---|---|---|---|
| **Dr. Ilya Marsh** (he), 27 | Player. Second-year resident. Earnest, over-caffeinated, panics out loud. Gift: **The Quiet** | Messy dark hair, sky-blue cap, teal scrubs, coffee stain | "I can do this. I can do this. Nurse Reyes, can I do this?" | Mid-high, quick, rises on questions |
| **Nurse Odalys Reyes** (she), 40s | Scrub nurse, the voice in your ear. Calls everyone "Doctor" with varying contempt | Tiny, tight black bun, red glasses, fierce brows, navy scrubs | "Scalpel. The sharp end goes toward the patient, Doctor. We've discussed this." | Low-mid, clipped, barks on "!" |
| **Dr. Sabine Achterberg** (she), 34 | The "second opinion". Ex-disaster-relief field surgeon under a cloud. Second playable doctor. Gift: **The Second Look** | Ash-white bob, scar through left brow, plum scrubs | "You have two options. The second one is also wrong." | Low, slow, even |
| **Chief Cornelius Bram** (he), 68 | Chief of Surgery. Hides a hand tremor. Once had The Quiet, once co-wrote Mercy's founding paper | Walrus moustache, white coat, half-moon glasses | "Medicine isn't miracles, son. It's showing up again tomorrow." | Very low, gravelly, slow |
| **Dr. Pemberton "Pem" Okoye** (he), 50s | Anaesthetist, unflappable, terrible puns, always about to retire to his boat | Round, bald, orange cap with fish on it | "Patient's under. Sleeping like a baby. A very expensive baby." | Low-mid, lazy glides |
| **Dr. Hesper Lindqvist** (she), 66 | Founder of the Foundation. Never raises her voice. Has a real point | Immaculate white suit, silver hair, small gold pin, faint smile | "Pain is only the body begging. I simply taught it to stop." | Mid, soft, long vowels |

Patients get a chart: name, age, job, one human hook ("His daughter's wedding is Saturday"). They also get a follow-up line that varies by rank, shown on the results screen. These are cheap to write and fix the emotional distance.

### Tone rules

- Short, breathless lines. Real-sounding jargon, delivered with total conviction.
- Tragedy and bathos sit side by side: a stage magician's comedy op turns into a cancer diagnosis in one line.
- In crisis, everyone shouts. Afterwards someone deflates it.
- Each beat is at most 2 lines of at most 60 characters. Display is uppercase (the engine's font). Allow `*word*` markup for a highlight colour.

More sample lines to set the voice:

- Reyes, on a fall in vitals: "He's losing blood faster than this hospital loses money. *Drain it.*"
- Reyes, after a streak: "...Adequate. Don't let it go to your head. It's not attached to anything useful."
- Ilya: "It moved. Nurse Reyes, the liver moved." Reyes: "Livers do not move, Doctor." Ilya: "This one *knocked*."
- Sabine, over the intercom: "Don't answer it until you're ready."
- Pem: "Vitals are in the basement. I'd take the stairs, Doctor."
- Hesper: "No one should hurt, Doctor. Not even you."

### Story beats

Write each scene from its beat, 8 to 16 lines each.

| Ep | Scene (set) | Beats | Then |
|---|---|---|---|
| 1 | Night shift (OR-7) | Storm. Chief unreachable. "You. Yes, you. The one holding the coffee." Deckhand Tomasz Dolan, eleven hooks. "How do you get eleven fishhooks in one arm?" "It was a long net." | Op 1 |
| 2 | Morning rounds (ward) | Ilya fumbles rounds. Pem jokes. "The Great Zamboni", a stage magician, swallowed something during his act and won't say what. | Op 2. Mid-op the comedy dies: "...That one isn't a prop." |
| 3 | Mass casualty (corridor) | A ferry collision. Three tables, one doctor. Bram's hand shakes as he hands Ilya the charts. | Op 3. The Quiet awakens |
| 4 | Aftermath (Chief's office) | Bram: "How long did the room go quiet?" He knows. The Foundation has complained to the board, so a consultant arrives: Dr. Achterberg. She audits Ilya on teen ferry survivor Ollie Brandt. | Op 4, with her on the gallery intercom |
| 5 | The smiling ward (ward) | Harbour pilot Mr. Anselm has an abdomen like a bag of knives and feels nothing. "Isn't it wonderful?" | Op 5. Something knocks. Sabine goes silent, then: "Get it out." |
| 6 | The file (scrub room) | Sabine has seen this: the relief camp where she was blamed. MERC-Y named at last. She takes the next case herself. **Player becomes Sabine.** | Op 6. A dormant strain in a donor kidney from the Foundation's own bank |
| 7 | The visit (atrium, then ward) | Hesper arrives with flowers and a funding offer. Soft threat. Then Reyes's oldest friend, hospice nurse Ottilie Marr, is admitted, smiling. | Op 7. Ottilie feels pain again and thanks them for it. Reyes cries once, alone |
| 8 | The confession (Chief's office) | Bram confesses he co-wrote the paper. Hesper's plan: aerosol Mercy on the harbour ferries at dawn. Bram collapses; his tremor was Mercy all along, feeding his Quiet. | Op 8, on his beating heart. "Don't you dare be gentle." He gives Ilya his old scalpel |
| 9 | The roof (helipad, rain) | Ilya and Sabine stop the release. Hesper, unarmed: "You can't cure me of being right." The canister breaches. Reyes shields a patient and takes the full dose. She tells them to start without her, and falls. | Op 9. **No voice in your ear.** After the save, the comm strip finally speaks: "...Your sutures are crooked, Doctor." |
| 10 | The stretcher (OR-7) | Hesper arrives dying. She took Mercy first, eleven years ago, so she'd never ask anything of others she wouldn't take herself. Everyone looks at Ilya. "Scrub in." | Op 10. She feels pain for the first time in eleven years. "Why?" "Because it's my shift." |
| End | Morning (roof) | The rain stops. Reyes, in a wheelchair: "You've got a seven a.m." Shift Report (all ranks), credits | Back to title. Log unlocked |

---

## 3. Operating: the core game

### The field and the cursor

- The field is a plane: `x ∈ [-8, 8]`, `z ∈ [-4.5, 4.5]`, `y` up, seen by a fixed camera (section 9).
- ✔ **Playable safe zone: `|x| ≤ 6`, `z ∈ [-3.6, 3.0]`.** The top and bottom HUD strips and the perspective narrowing at the near edge make everything outside it unreliable. Keep tasks out of the bottom-right corner too (`x > 5`, `z > 2.4`), where the tool wheel sits.
- Each seat has an **instrument tip** `(x, z)` and a bright reticle at that point on the surface.
- **Stick:** `velocity = cursorSpeed · |s|^2.2 · direction`, with `cursorSpeed` 10 units/s. **Steady** (hold) multiplies speed by 0.4.
- **Mouse:** the tip follows the pointer exactly. **Keyboard:** WASD/arrows drive the same integrator as the stick.
- **Aim assist (sticks and keys only, setting, default Low):** speed drops to 60% within 0.6 units of a valid target for the current tool. While a scalpel or needle stroke is held, drift perpendicular to the guide is damped by 50%.
- **Mouse aim must hit the surface, not a plane.** The beating heart's dome rises about 2 units, so a flat-plane intersection is visibly wrong. Iterate:
  ```js
  // view layer; heightAt is a pure function of the arena (also used to place everything on the surface)
  camera.rayAt(ndcX, ndcY, o, d); let y = 0, x, z;
  for (let i = 0; i < 4; i++) { const t = (y - o.y) / d.y; x = o.x + d.x * t; z = o.z + d.z * t; y = heightAt(x, z); }
  ```

### Instruments

There are eight on the wheel. Wheel order, clockwise from top, and keys 1 to 8: **Scalpel, Forceps, Suture, Drain, Syringe, Gel, Laser, Scanner**. "Use" means holding R2 (or left mouse). All numbers go in `config.js` as starting points.

| Tool | Verb | Rule | Rated by | Mistake |
|---|---|---|---|---|
| **Drain** | Suck up pools | Hold within `r + 0.4` of a pool; radius shrinks 1.4 units/s. Gone at `r < 0.2`. Things can hide under pools | Time wasted off target | None. 0.6 s on dry tissue leaves a bruise and a SLOPPY |
| **Forceps** | Grab and pull | Hold within 0.45 of an object to grab it, then pull along its marked path for its `pull` length. On release when free, it flicks into the steel dish. Fishhooks pull along a **curved arrow**. Magnets have a **speed limit** (too fast snaps back). Strain cores fight back on a **tether** | Path deviation | More than 1 unit off path tears tissue: spawns a nick |
| **Scalpel** | Follow a dotted guide | Start within 0.5 of its start, hold, trace to the end. Mean deviation ≤ 0.12 is CLEAN, ≤ 0.3 is GOOD. Letting go resumes from the last point. Closed paths encircle tumours | Deviation | More than 0.8 off cuts healthy tissue: spawns a pool |
| **Suture** | Zigzag across a wound | A wound has a stitch slot every 0.45. While held, crossing the wound line (amplitude ≥ 0.25) within 0.4 of the next slot ties it. Pitch rises per stitch | Rhythm: 0.2 to 0.7 s per stitch stays CLEAN | Crossing far from the slot: SLOPPY, a stitch to redo |
| **Laser** | Burn | Hold on a target; heat fills in 0.7 s. Beam, smoke, buzz | Stray time | More than 0.5 s on healthy tissue burns it |
| **Scanner** | Reveal | Hold; everything hidden within 2.2 units shows and stays marked. A hologram disc shows x-ray silhouettes, with a ping on discovery | Unrated | None |
| **Gel** | Paint | Hold and sweep a 0.8-radius brush over a mask. Done at 92%. Heals nicks under it after 1 s. In some fights it is a barrier | Speed | None |
| **Syringe** | Stabilise | Hold 0.45 s to draw, then release inside the glowing injection ring: +18 vitals, −1 dose | Hit the ring | Release outside: dose wasted, SLOPPY |

**Contextual actions** are not on the wheel:

- **Dressing** ends most ops: drag a bandage strip along a marked line.
- **Paddles** are used in Code Blue (below).
- **Massage** is used in Op 8.

**Readability at 10 feet:** valid targets for the selected tool pulse softly. A small diamond marks the next task (the hint marker). The hint is on by default, off on Attending, and absent in Op 9. Using the wrong tool on a target gets a tick sound and a Reyes quip, with no penalty.

### Vitals, clock, mistakes

- **Vitals** run 0 to 99 and drain at the op's base rate, plus 0.35/s per open bleeder or pool (capped at 2/s total). Mistakes cost 6.
- Below 30: red strip, faster EKG beep, Reyes shouts. Below 15: the lamp flickers.
- **Clock:** reaching 0 fails the op.
- **Mistakes:** 5 mistakes fail the op (0 in Dev Mode means unlimited).
- **Failure screen:** flatline, Reyes: "Time of death..." Offers **Retry from this stage** (rank capped at B) or **Restart**. After 2 failures, offer to lower the difficulty.
- **Difficulty:** Intern (time ×1.4, drain ×0.6, two Code Blue saves), Resident (default), Attending (time ×0.8, drain ×1.3, no hint marker).

### Rating and score

- Each completed action rates **CLEAN** (100 points), **GOOD** (60) or **SLOPPY** (20) as a big pop-up near the tip. A **MISTAKE** costs 150.
- Consecutive CLEANs build a **streak**: +10% per step up to ×2. A rising note scale plays and Reyes comments occasionally. CLEAN also gives +7% Composure.
- End of op: score plus 5/s of time left, plus 10 per vital point.
- **Rank** is score against the op's `par`: **S** ≥ 85%, **A** ≥ 70%, **B** ≥ 50%, otherwise **C**. Calibrate `par` from the bot at full skill.
- **Pristine** is a gold stamp for S with zero mistakes.
- An unscripted Code Blue caps rank at A.

### The gifts and Composure

Composure is a shared 0 to 100 meter. It starts at 40 and is shown as a bar at top right, hidden until The Quiet awakens in Op 3.

- **The Quiet (Ilya).** Hold L2/Space, needs at least 20%.
  - The whole sim slows to ×0.25 except cursors, and vitals stop falling.
  - Composure drains 18%/s of real time.
  - The picture desaturates, the vignette closes in, and a heartbeat and low drone play. A slow rumble pulses in time.
- **The Second Look (Sabine).** Press L2/Space, costs 60%.
  - The sim rewinds 4 s (entities, vitals, mistakes, clock) with a chromatic smear and a tape-rewind whoosh.
  - The cursor stays where it is, and a translucent ghost hand replays your last 4 s so you can see what went wrong.
  - It takes 5% off the op's final score. It is disabled during Code Blue.
  - Implement it by keeping a ring of `structuredClone`s of sim state at 10 Hz; this is why sim state must stay plain data.

✔ Changing a Look's filter parameters is free (frame time unchanged at each `setLook`), so tween `adjust.saturation`, `vignette.intensity` and `chromatic.spread` without a rebuild.

### Code Blue

When vitals hit 0 for the first time in an op, the sim freezes, a flatline tone plays and the paddles come up.

- Hold **both triggers** (both mouse buttons; J+K on keyboard) to charge. A needle sweeps up and down over about 1.2 s across a green zone (tunable width 0.2).
- Release in the zone, on the monitor's beat, for "CLEAR!": white flash, thump, hitstop, big rumble.
- Two good shocks within 12 s return vitals to 25. A bad shock costs 3 s. Run out of time and the patient is lost.
- Ops can also script a Code Blue (Op 4 teaches it); scripted ones don't cap rank.

---

## 4. Controls and prompts

| Action | DualSense (standard mapping) | Keyboard and mouse |
|---|---|---|
| Move instrument | Left stick | Mouse (or WASD/arrows) |
| Use instrument | R2 (analog: rumble and drain speed follow force), or ✕ | Left click (or J) |
| Pick tool | Right stick flick: 8 directions, instant, wheel shows while pushed | Number keys 1 to 8, wheel cycles, click the on-screen wheel |
| Last tool | R1 | Q |
| Release/drop | ○ | Right click (or K) |
| Steady | Hold L1 | Hold Shift |
| Gift | L2 | Space |
| Quick syringe | □ | F |
| Switch table (Op 3) / tag doctors (Op 9) | D-pad ←/→ / △ | Tab / E |
| Objective reminder | △ when not tagging | E |
| Pause | Options | Esc |
| Menus | D-pad or left stick, ✕ confirm, ○ back, L1/R1 tabs | Arrows/WASD, Enter/Space, Esc back. Mouse: hover moves focus, click confirms, right click backs out, wheel scrolls |

Pad button indices: 0 ✕, 1 ○, 2 □, 3 △, 4 L1, 5 R1, 6 L2, 7 R2, 8 Create, 9 Options, 10 L3, 11 R3, 12 to 15 d-pad. Axes 0/1 left stick, 2/3 right stick. Triggers are `buttons[6|7].value`.

**Read pads yourself.** The engine merges all pads into one and has no analog triggers, so `src/input/devices.js` polls `navigator.getGamepads()` per pad each frame.

- ✔ At boot set `engine.input.gamepadButtons = {}`. By default pad buttons press keyboard codes (Cross presses Space); with `{}` nothing leaks and `padAxis` still works.
- Keys and mouse come from `ctx.input` (`isDown`, `wasPressed`, `pointer`, `wheel`, `buttonEvents`). ✔ `input.pointer` works through the HUD canvas, in normalised coordinates. Art pixel = `((p.x + 1) / 2 · hud.width, (1 - p.y) / 2 · hud.height)`.
- `ctx.input.preventKeys.add('Tab')`, plus a `contextmenu` preventDefault on the container.
- **Rumble:** `gamepad.vibrationActuator?.playEffect('dual-rumble', …)`, with a Settings toggle. ✔ The call path works against a stub (no real pad here).

**Pointer.** Hide the OS cursor over the canvas during surgery (you draw the reticle). In menus show it only while the mouse was the last device.

**Prompts follow the last input used,** switching the moment another device acts.

- PlayStation glyphs (✕ ○ □ △ L1 R1 L2 R2 Options) as pixel-art sprites.
- A Settings option swaps to Xbox (A B X Y LB RB LT RT Menu).
- Keycaps and mouse-button icons for keyboard and mouse.
- Text in data uses tokens (`{use} {tool} {gift} {steady} {confirm} {back}`) resolved at draw time, so no string ever hardcodes a button.

---

## 5. The ten operations

Each op is a data file in `src/content/ops/` (section 11). Tools are introduced gradually; unused wheel slots dim. Numbers are starting points; tune with the balance report.

| # | Op | Surgeon, patient | Arena | Time | Start vitals | Drain/s | Doses |
|---|---|---|---|---|---|---|---|
| 1 | Eleven Hooks | Ilya, Tomasz Dolan, deckhand | forearm | 240 s | 85 | .10 | 3 |
| 2 | The Vanishing Act | Ilya, The Great Zamboni, magician | stomach | 300 s | 80 | .15 | 3 |
| 3 | Night Ferry | Ilya, three passengers | 3 tables | 360 s | 70/60/55 | .25 each | 5 |
| 4 | Sticks and Stones | Ilya, Ollie Brandt, 16 | forearm bone | 330 s | 75 | .20 | 3 |
| 5 | Introit | Ilya, Mr. Anselm, harbour pilot | liver | 360 s | 80 | .30 | 4 |
| 6 | Cold Hands | **Sabine**, Pem's sister Ada | kidney bed | 360 s | 80 | .20 | 3 |
| 7 | Lacrimosa | Ilya, Ottilie Marr, hospice nurse | lung | 390 s | 80 | .30 | 4 |
| 8 | Dies Irae | Ilya, Chief Bram | heart | 420 s | 75 | .35 | 5 |
| 9 | Libera Me | **both**, Nurse Reyes | whole chest | 540 s | 70 | .35 | 6 |
| 10 | Do No Harm | Ilya, Dr. Lindqvist | spine | 240 s | 60 | .05 | 2 |

**Op 1, Eleven Hooks.** Tools: Drain, Forceps, Suture, Gel, Syringe.

1. Move the tool onto a marker.
2. Drain two pools; hooks lie beneath.
3. Back out eleven hooks along their curved arrows (Reyes counts aloud).
4. Suture two lacerations.
5. Gel the rust-stained patch.
6. Dressing begins, then the gag: "Twelve. I counted twelve." One last hook surfaces.

Teach Syringe if vitals dip below 50, or at the latest in stage 5.

**Op 2, The Vanishing Act.** Adds Scalpel, Scanner, Laser.

1. Scalpel the midline guide.
2. Drain spot bleeders along the cut.
3. Scanner finds four swallowed props: key, coin, playing card, magnet pair.
4. Lance each (short scalpel stroke), then Forceps them out. The magnets obey a pull-speed limit.
5. The music changes. Scanner shows a tumour: "That one isn't a prop."
6. Closed-path Scalpel around it, Forceps lift, Laser five satellite polyps, Drain, Suture, Gel, Dressing.

**Op 3, Night Ferry (triage).** Three separate fields, side by side, 24 units apart. Each has its own vitals, all ticking at once. D-pad, Tab or the on-screen table tabs whip-pan the camera between them.

- Table A: leg gash (Suture, Drain).
- Table B: hull debris and burns (Forceps, Gel).
- Table C: chest wound (Scalpel, Drain, Suture, Laser).

Tasks arrive in small batches. At about 70% done, Table C crashes on a script: sound drops out, heartbeat, "the room goes quiet". **The Quiet awakens**: prompt the gift button, and it stays unlocked from here on. Losing any patient fails the op.

**Op 4, Sticks and Stones (Bone Mend).** Sabine's cold commentary replaces some of Reyes's lines.

1. Open, then Drain.
2. Bone Mend: grab six fragments (two under pools), rotate while held (right stick, mouse wheel or Q/E), and release onto the bone's silhouette. It snaps within ±15°; within ±5° is CLEAN.
3. Gel cement along the seams.
4. An artery pops: a sudden bleeder to Suture fast.
5. Scripted **Code Blue** teaches paddles.
6. Suture, Gel, Dressing. Sabine: "Adequate."

**Op 5, Introit** (section 6). Scanner reveals something moving, then the fight. Afterwards Laser six eggs, Suture, Gel, Dressing.

**Op 6, Cold Hands (transplant, as Sabine).** The player has The Second Look.

1. Open.
2. Forceps place clamps on two vessels.
3. Short Scalpel strokes cut them.
4. Forceps lift out the failing kidney.
5. Fetch the donor kidney from the ice tray. A separate **cold-time bar** (120 s) starts.
6. Suture three anastomoses (artery, vein, ureter): precise, short.
7. Unclamp in the right order. The first time, a hidden clot bursts regardless; Sabine: "Again." This forces a prompt to use the Second Look.
8. The kidney pinks up as blood returns, the game's most satisfying visual payoff. Tween its ramp from grey-plum to warm red.
9. A scan shows dormant Mercy in the removed-donor-tissue sample: story hook. Close.

**Op 7, Lacrimosa** and **Op 8, Dies Irae** (section 6). Each has a short exploratory opening and a close.

**Op 9, Libera Me** (section 6). The comm strip shows `NO SIGNAL`. There is no hint marker, no voice. A bot-driven partner hand shares the table.

**Op 10, Do No Harm.** No time pressure in spirit: generous clock, soft music, no attacks. A pale strain lies curled along her spine and does not fight.

- Slow Scalpel, gentle Forceps. Each removal raises her vitals *and* her pain, and her voice lines change as feeling returns.
- Final Forceps extraction, then Suture, Gel, Dressing.
- After all that action the slowness is the point. It should feel like an exhale.

---

## 6. The strains (bosses)

Each is a module in `src/sim/strains/` with a small state machine and a matching view in `src/view/strains/`. Each should be a 3D creature on the `actors` layer. Build them from the engine's animation tools: `SpringChain` for tendrils, `Squash`, `LegStepper` and `twoBoneIK` for crawling. Use a `rim` colour, an emissive hit flash, and a `dissolve: true` toon material for death. ✔ My Dies Irae mock (a glowing eye in a crown of seven red plates, `rim` lit, with `SpringChain` tendrils trailing onto the heart) read very well. **Place everything at `heightAt(x, z) + offset`** or the surface swallows it: ✔ my first version sat at a fixed height and vanished inside the dome, and it needed `y` of about 3 over the dome's top.

**Introit, "the Knock" (liver, 3 HP).**

- The core moves *under* the tissue on a spline at 1.6 units/s. Show it as a travelling bulge in the mesh and a faint blotch; the Scanner shows it crisply.
- Every 6 s it stops and "knocks": a puckered pore surfaces for 3 s.
  1. Lance the pore with a short Scalpel stroke.
  2. The core is exposed for 3.5 s. Grab it with Forceps and pull 2.5 units against its tether. Let go early and it snaps back and lacerates.
  3. The tether pops: −1 HP. It flees and leaves 2 lacerations to Suture. Speed +25%.
- A missed knock leaves a laceration and a pool. Dead: dissolves, then the eggs.

**Lacrimosa, "the Weeper" (lung, 5 eyes, 3 HP each).** Eyes open in turns and weep droplets (use `BulletPool`) that roll toward the bottom of the screen at 1.5 units/s.

- A droplet on bare tissue makes a nick and costs 1 vital.
- Drain sucks droplets within 0.7. Gel film lasts 10 s and kills droplets on contact.
- Laser an open eye for 1.2 s: it closes and takes 1 damage. An eye left open 8 s heals.
- **At half HP:** eyes crawl on stalks (`LegStepper`) and droplets drift toward your tip.
- **Last eye:** **the Sob**, three times. A dotted line crosses the lung; paint at least 80% of it with Gel in 6 s or a wave takes 25 vitals.
- Then Forceps pull the optic stalk on a tether.

**Dies Irae, "the Wrath" (beating heart, 7 plates, 3 rounds).** Everything is on the beat. It starts at 72 BPM. The mesh thumps in **systole** (35% of the cycle); a tool used then is SLOPPY and nicks tissue. **Diastole** (65%) is safe. A ring around the tip and the EKG show the phase, and the music runs at the heart's tempo.

- Round: cut a plate (short Scalpel stroke) within one diastole, lift it with Forceps in the next, then Laser the exposed eye, diastole only.
- Each plate: +6 BPM. A Syringe dose acts as a beta-blocker: −12 BPM.
- Wrath flares run along arteries as pools to Drain.
- At 120 BPM or more: **fibrillation**, a paddles shock on the beat.
- After round 3 the heart arrests: **Massage**, alternate L2/R2 (left/right click, J/K) on the beat 8 times, then the final cut.

**Libera Me (whole chest, three stages).**

1. **Sanctus, the False Clean.** The field looks healthy and the monitor reads a steady 99. It is lying; only the EKG jitters. Scanner shows which cysts are real. Laser eight real ones; a false one is a mistake. Clearing them drops the monitor to the true number (say 41), a horror beat.
2. **Reprise.** One Introit knock, two Lacrimosa eyes and a three-plate Dies Irae ring run at once. The bot partner handles the left half of the field and you handle the right.
3. **Miserere.** A pale, beautiful, gold-haloed core. It **copies you**: a ghost hand replays your last 3 s of tool motion and cuts where you cut, so you must keep moving differently. △/E tags between Ilya and Sabine (each with their gift); the other becomes the bot. Finish with a two-handed Forceps pull (you and the partner on one tether), then a forced Code Blue. On success, silence, then Reyes's line.

**Consult op, Pile-Up (section 7).** A wave-based chest wound: hooks, pools, lacerations, polyps, surges, and a small Introit at T−40 s.

---

## 7. Multiplayer: Consult

One sim, N seats. The sim doesn't care where a seat's input comes from, so both paths below share everything.

**How I read "for the game on its own".** The hub's check opens the game outside a session and needs it to run normally, so that must work. A 10-foot game should also have multiplayer without a hub, so I added **couch co-op**.

- **On its own (no network):** Main menu, then CONSULT. Up to 4 seats: keyboard and mouse plus pads. Press ✕ or click to scrub in, ○ or right-click to leave, and seat 1 starts.
  - Picks: Pile-Up, or any cleared op except Op 3 and Op 9.
  - All hands share the screen, with gloves in seat colours and a small tool icon by each tip.
  - The tool wheel for a seat shows near its corner.
  - Never touch the network outside a session.
- **In AI Hub:** the protocol's `shared-world` mode, 1 to 4 seats, the game's own card.
- **Scaling:** vitals drain and spawn rates ×`(1 + 0.25 · (N − 1))`. Composure is shared. Seats 1 and 3 have The Quiet, seats 2 and 4 The Second Look. Each seat scores its own points.
- Paddles and Massage: any seat may press either side, so two players can each take a paddle.

### AI Hub session (protocol v1, client 1.4.0)

Fetch `session.js`, `harness.html`, `bridge.js` and `round.js` from `https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/` (✔ public) and read that folder's `README.md`.

✔ A spike with this exact shape passed every run: the real engine in every copy, 2 and 4 players, 150 ± 50 ms, 5% loss, host-leave, server, solo. It was ready in under 2 s on software WebGPU.

```js
if (window.AIHub?.active) {
  const info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true });
  if (info) return runSession(info);       // null: no hub after all, fall through to the normal game
}
runStandalone();

function runSession(info) {
  AIHub.on('card', updateCard);            // { left, paused, starting, ready, asked, ... }
  AIHub.on('start', beginCountdown);       // play begins when AIHub.time() >= 0
  AIHub.on('message', onMessage);
  AIHub.on('leave', ({ id }) => retireSeat(id));
  AIHub.on('time-up', () => { if (AIHub.isHost) finishRound(false); });
  AIHub.on('end', stopInputAndSound);      // playMusic(null), stopLoops(), nothing more sent
  startHostLoopIfHost();                   // on a timer from AIHub.time(), never from the renderer
  if (info.server) { AIHub.ready(); return; }   // ✔ a server copy never starts the engine
  startEngineThen(() => AIHub.ready());    // no key press
}
```

- **No WebGPU in a session:** `AIHub.fail('WebGPU unavailable')`. Check `navigator.gpu` before `Engine.start` and show a friendly message outside a session.
- **Session rules:** no title, menus, pause, saves, attract or dev mode. Options does nothing. No alert/confirm/prompt, no new tabs, no sockets, no chat. Names come only from `info.players` and are drawn with `hud.text`. Don't use `Math.random` for gameplay; seed the sim with `AIHub.rng('deal')`.
- **The card (CardStage):** OR-7 wide shot with one masked figure per player in their seat colour, title, players with READY marks, how to win, controls for this player's device, time left. Answers:
  - Enter, ✕ or a tap on Ready: `AIHub.answer('ready')`.
  - △, M or a tap on More Time: `AIHub.answer('more')`.
  - ✔ `ctx.input.wasPressed('Enter')` catches the harness's synthetic key.
- **Round choice:** `info.round` cycles the session list: Pile-Up, then trimmed Introit, Lacrimosa and Dies Irae fights (`session: true` stages, ≤ 4 minutes). All tools unlocked, hints on, Reyes's lines on.
- **Finish:** when the patient is saved or lost, or at `time-up`:
  ```js
  AIHub.finish({ standings: groupsByPoints, scores, won: patientSaved, stats, awards });
  ```
  - Every present player must appear once in `standings`.
  - Limits: 6 stats per player (name and text ≤ 16 chars), 3 awards per player (title ≤ 24, detail ≤ 40).
  - Awards: STEADIEST HAND, MOST STITCHES, SAVED THE DAY, SLOPPIEST (kindly).

### Networking

- **Authority:** the host's copy runs the sim on a timer (`setInterval`, catch-up from `AIHub.time()`). A hidden tab must not stall it, and a server copy has no renderer.
- **Clients to host:** 15 Hz `AIHub.send({t:'i', n, x, z, tool, use, gift, steady}, { to: AIHub.host, reliable: false })`, always sent, even idle (the harness requires traffic both ways).
- **Host to all:** 12 Hz unreliable snapshot, plus 1 Hz reliable keyframe, plus up to 4 Hz reliable event batches (ratings, comm lines, stage changes, sounds).
  - That totals at most 17 messages/s against the limit of 20/s (burst 40). Add your own token bucket; the client drops over-limit sends.
- **Sizes:** keep unreliable snapshots ≤ 1,100 bytes (above about 1,200 they fragment and are lost whole). Use fixed-point ints in positional arrays: `[id, kind, x, z, a, b]`. Gel masks are a coarse bitset. Keyframes ≤ 16 KB. Test both at each op's peak.
- **Feel:** a client moves its own tip locally at once using the same integrator and corrects gently if it drifts over 1 unit. It plays tool loops, sparks and rumble locally. Everything else renders from interpolated snapshots about 120 ms behind. The view reads a plain state object, whether from a local sim or the network.

**Head tags** (session client first, unmodified, see section 14):
- `hub:session` 1
- `hub:session-players` 1-4
- `hub:session-mode` shared-world
- `hub:session-minutes` 4
- `hub:webgpu` required
- `hub:session-goal` "Keep the patient alive and top the team score" (≤ 60 chars)
- `hub:session-howto` "Stick/mouse: move tool. R2/click: use. Right stick/1-8: pick tool." (≤ 80 chars)

---

## 8. Screens and flow

**10-foot rules** for every screen:

- One idea per screen; at most about 8 rows at once.
- Text never below the engine font at scale 1 (at 1080p that is 28-pixel caps, ✔ reads well). Headers at scale 2+.
- A big focused item with a bright marker. Clipboard, chart and rubber-stamp motifs, never tables of data.
- Everything lives on the HUD canvas (`ctx.hud`), anchored to `hud.width`/`hud.height`, which vary (section 9). `hud.text` doesn't wrap and clips at the edge ✔, so write a `wrap(text, width)` helper using `hud.measure`.
- The font auto-uppercases and has `. , : ; ! ? - + % / ( ) [ ] ' " # & * = < >` ✔. Anything else, em dashes and ellipsis characters included, draws as a gap: type `-` and `...`.

**Flow**

Title → Main → Story scene → Briefing → Operation → Results → next. Save after every op.

- **Title:** dim OR-7, swinging lamp, title drawn big with an EKG line through it. "Press ✕" or "Press Enter/Click", following the last input. Theme music. Any input leads to Main.
- **Main menu** (over the dim theatre, the camera drifting):
  - **ON CALL:** Continue or New Shift, then pick a difficulty.
  - **OPERATING LOG:** replay cleared ops, showing best rank and a patient line. One chart at a time, flip with ←/→.
  - **CONSULT**
  - **SETTINGS**
  - **ABOUT**
- **Story scene:** set plus busts. ✕/Enter/click advances; hold △/Esc to skip. Typewriter text with gibberish voice, the speaker leaning in and the other dimmed. Occasional wide shots use full-body figures and the engine's `Timeline`.
- **Briefing:** a clipboard chart: patient name, age, job, hook, the op's title stamped, and the one-line objective. Not a stats page. Then the camera dives from the OR-7 wide shot down onto the field (fly the three.js camera directly) with an iris transition.
- **Operation HUD** (art pixels at 270 height):
  - **Top strip, 20 tall:** VITALS number at scale 2 and a live EKG on the left, clock at centre, Composure at right.
  - **Bottom strip, 32 tall:** speaker name and up to two lines of comm text.
  - **Bottom-right:** the tool wheel (about 48 square), with the current tool in the centre, clickable.
  - **Dose count** by the wheel. **Rating pop-ups** at scale 2 near the tip.
  - **Comm bust:** a tiny real 3D bust of the speaker placed near the camera at the top-left corner, with `castShadow = false`, so in-op talk uses the same models and mouth animation.
- **Results:** the chart drops in. Lines tally one at a time with ticks: time, vitals, technique, streak, mistakes. Rank stamp slams with shake, then a Reyes comment, then the patient's follow-up line for that rank.
- **Pause (Options/Esc):** Resume, Retry Stage, Restart, Settings, **Dev Mode**, Quit to Menu. Use your own pause flag and stop stepping the sim. ✔ Don't use `engine.paused`: `update()` stops running and your menu dies. Disabled in a session.
- **Settings** (own HUD screen, navigable by pad):
  - Music (**10% default**), Sound, Voices.
  - Button glyphs (PlayStation/Xbox), Aim Assist, Cursor Speed, Rumble, Gift Hold/Toggle.
  - Look (engine looks), Pixel Size, Screen Shake, Reduce Flashes, Text Speed, Difficulty, Fullscreen, Reset.
- **About/Credits:** paged, big text. Pages: Source Information; Testing Feedback; Engine Feedback; Prompt Feedback; Credits. All field labels and answers as your brief lists them. Data in `src/content/about.js`, filled in last. Credits condense the kit's `CREDITS.md` (engine MIT, three.js, Rapier, Kenney furniture CC0) and the game's own "all art and audio written in code".

**Touch-only devices.** Detect before `Engine.start`: no `(any-pointer: fine)`, `maxTouchPoints > 0`, no gamepad. ✔ Phones report art like 136×276 at 8×, so the HUD would be a narrow column.

- Show a DOM overlay with the exact text `Controller or keyboard required`, plus the engine's ⚙: ✔ `settings: { button: 'top-right' }` shows it on a phone profile and a tap opens the DOM panel.
- `touch: false` always: ✔ no joystick appears.
- The attract mode loops behind the message.
- If a key is pressed or a pad connects, drop the gate and play normally.

**Attract mode.** 10 s with no input on Title or any menu screen starts it. Input means a key, click, mouse move, stick beyond deadzone, pad button or touch; each resets the timer.

- A looping reel of real sim segments of 20 to 30 s each, played by the bot with cheats (god vitals, free Composure): a talking-head snippet, Op 1 hooks, Op 2 scan and laser, Op 3 table swaps, Bone Mend, Introit with The Quiet, Second Look rewind, Lacrimosa, Dies Irae with Code Blue, then Pile-Up with four hands.
- Banner `DEMO - PRESS ANY BUTTON`. Any input exits at once to Title and is swallowed.
- It must never touch saves or settings.

**Dev Mode** (from Pause; tabs on L1/R1, Q/E or click):

- **BALANCE:** live sliders, Reset to Defaults (list in section 12).
- **CHEATS:** God Vitals, Infinite Composure, Freeze Clock, Unlimited Mistakes, Unlock All.
- **JUMP:** any op and stage, any story scene.
- **ACTIONS:** Complete Stage, Win Op, Fail Op, Trigger Code Blue, Spawn (pool, bleeder, laceration, hook, strain), Copy Op JSON to console.
- **VIEW:** hitbox overlay (entity circles and ids), Bot Plays (with skill slider), Sim Speed 0.1× to 3×, Frame Step, FPS and sim stats.

---

## 9. Art direction: what works

The engine's native style is low-poly 3D turned into pixel art. My mock of the heart arena with this recipe looked like a shipped game. Keep to these numbers unless you can beat them.

**Framing.** `aspect: 'fill'` always. ✔ It gives no black bars:

| Viewport | Art resolution | Scale |
|---|---|---|
| 1920×1080 | 480×270 | ×4 |
| 3840×2160 | 480×270 | ×8 |
| 1280×720 | 427×240 | ×3 |
| 1024×768 | 342×256 | ×3 |
| 800×600 | 400×300 | ×2 |
| 600×400 | 600×400 | ×1 |

Without it, 1280×720 letterboxes to 960×540. Lay out all HUD from anchors.

**The look** (✔ crisp outlines on tools and creatures, none on tissue):
```js
const LOOK = (sat = 1, vig = .3, spread = 0) => ({
  scene: [{ id: 'vignette', params: { intensity: vig } }, { id: 'adjust', params: { saturation: sat, contrast: 1 } }, { id: 'chromatic', params: { spread } }],
  actors: { pixel: { size: 1, outline: .85, crease: .2 }, filters: [] },
  environment: { pixel: { size: 1, outline: 0, crease: 0 }, filters: [] },
});
```
The split look renders two passes (about a third of the frame rate on software WebGPU here). That's fine: your brief puts performance out of scope. `sixteen_bit` dithers the whole frame and hurts readability ✔. Tag every tool, hand, strain and character with `setLookLayer(obj, 'actors')`.

**Camera in surgery:** `{ preset: 'fixed', position: [0, 9.6, 3.1], target: [0, 0, 0.1], fov: 44, minZoom: 1, maxZoom: 1 }`.

- ✔ Without the min/max lock the mouse wheel zooms the "fixed" camera, and wheel is our tool cycle.
- ✔ Enter and WASD don't disturb a fixed rig.
- ✔ Move the camera for parallax, dives and whip-pans by setting `ctx.camera.camera.position` and `.lookAt()` each frame; it sticks and `rayAt` follows. Add ±0.25 units of drift toward the tip.
- For narrow windows multiply the camera's distance by `max(1, (16/9) / aspect)`.

**Lighting.**

- Field ✔: sun intensity 1.0 from `[.25, 1, .35]`, ambient 0.55 warm white (`0xfff0e0`), one point light at `[0, 5.2, .4]`, intensity 5, radius 15. Much more than that washes the tissue out.
- OR-7 wide ✔: sun 0.35, ambient 0.28 cool (`0x8fa8c8`), lamp point light over the table at intensity 14, radius 7, a monitor glow. A dark room with a pool of light is the mood.
- Never `new PointLight`; use `ctx.lights`.

**The tissue canvas** is the game's signature. Each table has a 480×270 RGBA `DataTexture` on a 192×108 `PlaneGeometry` in `toonMaterial(PALETTE.white, { map })` with `receiveShadow`.

- ✔ Copying the base into the buffer and painting 60 blood discs measured about 0.5 ms a frame.
- Mapping ✔: `px = (x / 16 + .5) · W`, `py = (z / 9 + .5) · H`, and **flip the plane's UV v** (`uv.setY(i, 1 - uv.getY(i))`), or the paint lands mirrored.
- Set `magFilter`/`minFilter` Nearest and `needsUpdate` after each paint.
- Each frame: write the prebuilt base into the buffer, then paint scars, pools, wounds, stitches, gel and burns from sim state. Displace the mesh by `heightAt` plus heartbeat, breathing and bulges, then `computeVertexNormals()`.

Base painting recipe (✔ the look, shown for the heart; each arena has its own ramp and shape):
```js
const BAYER = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
const RAMP = [0x3c0d24, 0x5e1430, 0x8a1f38, 0xb5343f, 0xd65c4f];      // dark to light, 5 steps
// per texel: m = shape mask (0 outside the organ); light = 0.25 + 0.75*m + (fbm(x*.9, z*.9) - .5)*.9 + tilt;
// index = floor(clamp(light)*5 + BAYER[(px&3) + (py&3)*4]/16*.9 - .2) into RAMP (ordered dither between bands)
// outside the organ: a dark cavity colour (0x1c0a18) with noise blotches of RAMP[0]
// then: fat blobs (0xe9c46a) where fbm(x*1.6, z*2.4) > .66 near edges
//       vessels: random-walk branches (heading += noise*.55, step .09, width 2 then 1, branch at 4.5%), arteries 0xf08a5d, veins 0x2e1a52
//       wet sheen: a few hundred single 0xf6d0c0 texels on the light-facing side
```

| Arena | Ramp feel, shape |
|---|---|
| forearm | tan skin ramp, hair flecks, teal drape window |
| stomach | pink-salmon, folded rugae lines |
| 3 tables | one skin ramp each, small windows |
| bone | dark muscle with a white bone silhouette |
| liver | deep maroon, two big lobes |
| kidney bed | fat-yellow bed, kidney bean mesh (plum to red tween) |
| lung | grey-pink, dotted alveoli, breathing |
| heart | the recipe above |
| whole chest | ribs, lung and heart together |
| spine | pale ivory and cool shadow |

Frame every arena with raised teal drapes (boxes, `y` 0.4), steel clamps and retractors. Pools, blood and wounds use 2 or 3 flat colours with animated sparkle texels, plus particles for droplets, smoke and foam (`ctx.particles.register`; sizes are whole art pixels).

**The hand and instruments.** Each is `model()` data with the tip at the origin, pointing −Z. A gloved hand plus forearm from below the frame sells first-person presence, and its cast shadow gives depth ✔.

```js
export const handDef = model({ id:'glove-hand', about:'Gloved surgeon hand gripping a shaft, wrist toward +Z', tags:['character','hand'], floats:true,
  palette:{ glove:'sky', fold:'blue', sleeve:'teal' }, parts:[
  { name:'palm', box:[.72,.3,.8], at:[0,0,0], c:'glove' }, { name:'knuck', box:[.74,.16,.14], at:[0,.12,-.34], c:'fold' },
  ...[-.27,-.09,.09,.27].flatMap((x,i)=>[{ name:`f${i}a`, box:[.16,.16,.34], at:[x,.05,-.56], rot:[18,0,0], c:'glove' },{ name:`f${i}b`, box:[.15,.15,.26], at:[x,-.09,-.76], rot:[58,0,0], c:'glove' }]),
  { name:'thumb', box:[.18,.18,.5], at:[-.44,-.04,-.26], rot:[10,-28,0], c:'glove' },
  { name:'cuff', cyl:[.62,.62,.3], at:[0,0,.54], rot:[90,0,0], c:'fold' }, { name:'wrist', cyl:[.56,1.6,.56], at:[0,0,1.46], rot:[90,0,0], c:'glove' },
  { name:'sleeve', cyl:[.8,2.6,.8], at:[0,0,3.4], rot:[90,0,0], c:'sleeve' } ]});
```

- ✔ Placement that read well: tool at `(x, surface + .05, z)`, rotation `(-.5, -.7, 0)`; hand at `tip + (.88, 1.1, 1.25)`, rotation `(-.46, -.72, .2)`.
- Seats 2 to 4 enter from other corners. Glove colour follows the seat: palette `red`, `blue`, `green`, `sand` in 3D; `info.players[i].color` exactly on the HUD (`hud.text` colours take numbers).
- Give each tool a distinct silhouette: forceps with moving jaws, curved needle plus thread (try `RopeMesh` with `ropeLine`, and check it reads), drain wand, syringe with moving plunger, laser pen, scanner disc (`hologramMaterial`), gel bottle.

**Busts: the anime talking head.** Build the face and hair from `slab` outlines. ✔ This gives a real anime silhouette in the engine's style at about 150 art pixels tall. Put the head in a named pivot, and the mouth, brows and lids in their own pivots.

```js
const FACE = [[-.46,.5],[.46,.5],[.5,.05],[.42,-.28],[.2,-.56],[0,-.68],[-.2,-.56],[-.42,-.28],[-.5,.05]];
const FRINGE = [[-.56,.42],[-.6,0],[-.44,.16],[-.4,-.08],[-.22,.24],[-.06,.02],[.06,.26],[.24,.04],[.34,.26],[.46,-.1],[.6,.02],[.56,.42],[.34,.66],[0,.74],[-.34,.66]];
// parts (head group at [0,1.62,0], pivot:true, name:'head'):
// { name:'skull', box:[.9,.92,.72], at:[0,.1,-.12] }, { name:'face', slab:FACE, depth:.26, at:[0,0,.14] },
// { name:'hairfront', slab:FRINGE, depth:.16, at:[0,.22,.26] }, { name:'hairback', box:[.98,.86,.5], at:[0,.2,-.34] },
// eyes at z≈.28: white box .22×.16, pupil box .12×.16 at z .30; brow box .28×.05 at y .2, rot z -18 (mirror x); nose box; mouth in a pivot group
```

- ✔ Set `receiveShadow = castShadow = false` on bust meshes or shadow acne scatters triangles over the face.
- Camera for a close-up ✔: `position [.2, 1.75, 5.1]`, `target [0, 1.42, 0]`, `fov 30`.
- ✔ A half-`ball` fills its box, so its base sits at `at.y − h/2`: the first cap I built covered the eyes.
- Emotions are a small pose table per character: neutral, stern, shock, sad, smile, angry, panic (brow rotation and height, lid scale, mouth scale, head tilt). Add a few toggled extras: sweat drop, blush, tear, glasses glint.
- Mouth scale follows voice syllables, blinks every 2 to 5 s, slight idle sway.
- Draw big white reaction marks and speed-line flourishes on the HUD for comic beats.

**Full-body figures for wide shots.** ⚠ The bundled hero is a red-capped, moustached plumber in overalls: **do not show `HERO_MODEL`.** But ✔ a `model()` whose pivots carry the hero rig's joint names plays every `HERO_CLIPS` clip through `compileClips(HERO_CLIPS, HERO_RIG, build.object)` and a three.js `AnimationMixer`. I tested Idle, Walk, Wave, Sit and Shout; there are also Victory, Hurt, HitReact, Death, LieIdle, Grab, Triumph and more. The figure faces +Z; its right is −X.

```js
const arm=(s,x)=>({ group:[{ name:`upper${s}`, box:[.11,.25,.11], at:[0,-.12,0], c:'scrub' },
  { group:[{ name:`fore${s}`, box:[.1,.23,.1], at:[0,-.11,0], c:'skin' },
    { group:[{ name:`glove${s}`, box:[.12,.13,.12], at:[0,-.06,0], c:'glove' }], at:[0,-.23,0], name:`Hand${s}`, pivot:true }], at:[0,-.25,0], name:`Forearm${s}`, pivot:true }],
  at:[x,.36,0], name:`Arm${s}`, pivot:true });
const leg=(s,x)=>({ group:[{ name:`thigh${s}`, box:[.15,.3,.15], at:[0,-.15,0], c:'scrub' },
  { group:[{ name:`shin${s}`, box:[.13,.22,.13], at:[0,-.11,0], c:'scrub' },
    { group:[{ name:`shoe${s}`, box:[.15,.1,.28], at:[0,-.05,.06], c:'shoe' }], at:[0,-.22,0], name:`Foot${s}`, pivot:true }], at:[0,-.3,0], name:`Shin${s}`, pivot:true }],
  at:[x,0,0], name:`Leg${s}`, pivot:true });
// parts: [{ group:[ { name:'hips', box:[.36,.18,.22], at:[0,.02,0], c:'scrub' },
//   { group:[ { name:'chest', box:[.38,.42,.24], at:[0,.22,0], c:'scrub' },
//     { group:[ skull, cap, mask, eyes ], at:[0,.44,0], name:'Head', pivot:true }, arm('R',-.25), arm('L',.25) ], at:[0,.1,0], name:'Torso', pivot:true },
//   leg('R',-.14), leg('L',.14) ], at:[0,.62,0], name:'Pelvis', pivot:true }]
```
Vary cap, hair, coat and height per character. Masked surgeons read very well at distance ✔.

**Sets** (each a `model()`/mesh group with a lighting recipe): OR-7 (table, patient under drape, lamp arm, monitor on a stand, instrument tray, gallery glass, doors), scrub room (sinks), Chief's office (desk, window with `Precipitation` rain and harbour lights), ward (beds, `clothGrid` curtains), corridor, Foundation atrium (white, gold, flowers), helipad roof at night in the rain.

- **Generic props** come from the `kenney-furniture` pack (beds, sinks, desks, chairs, cabinets, screens, lamps; search `LIBRARY.md`). Recolour them to steel and hospital tones with `buildModel(id, { catalog: kit, palette: {...} })`; they arrive bright yellow-wood ✔.
- ✔ **Packs in one file:** put `window.__PIXEL_ASSETS__ = { 'packs/kenney-furniture.json': 'data:application/json;base64,…' }` in a classic script before the module, and `await loadPack('packs/kenney-furniture.json')` works from `file://`.
- Nice touches if cheap: a `RenderView` live monitor in OR-7, a `Mirror` in the scrub room.

**Check your models.** `node check.mjs --sheets src/content/models/index.js` ✔ draws every def and warns about z-fighting and floating parts. Models need `about` and `tags`; busts and tools need `floats: true`.

**Game feel.** `engine.hitstop`, `engine.shake.add`, `engine.screen.flash/shockwave/cover/reveal`, `Squash` on grabs and hits, rating pop-ups, stamp slams, lamp flicker at low vitals. Honour the Screen Shake and Reduce Flashes settings.

---

## 10. Audio: everything written in code

**Music is 10% by default.** ✔ The engine's default is 0.6, stored in `localStorage['pixel-engine:audio']`. On boot: if that key is absent, call `audio.setVolume('music', 0.1)`, which also stores it. A test asserts this on a fresh profile.

**Voices: Animalese/Simlish gibberish.**

- Pre-render syllables in pure JS at boot: a glottal pulse through two or three formants (`src/audio/voice.js`, testable in Node). Use 3 timbres × 5 vowels × 3 consonant onsets, about 120 ms each.
- ✔ Wrap the PCM in a WAV header, make a base64 data URL and call `await ctx.audio.load('syl-a', url)`. Then `ctx.audio.play('syl-a', { pitch, volume, pan })`: it works from `file://`, runs through the engine's buses and respects mute.
- Letters pick syllables deterministically; punctuation shapes rhythm and pitch ("!" up and louder, "?" rising, "..." slow).
- Each cast member has `{ timbre, basePitch, speed, range }` per the cast table. Reaction barks in surgery use the same system.
- The Voices slider scales `volume` per play, since the engine has only master, sfx and music channels.

**Sound effects: `SoundDef` data via `ctx.audio.register`.**

- Tools: drain slurp loop (`audio.loop`, pitch follows force), forceps click, hook pop, dish tink, scalpel slice, suture tick (note scale), knot, laser buzz loop, sizzle, scanner ping, gel fizz loop, syringe draw, inject whoosh.
- Monitors and crisis: EKG beep (pitch and rate follow vitals), alarm, flatline, defib charge whine, CLEAR thump.
- UI: move, confirm, back, stamp slam, rating chimes.
- Gifts: heartbeat and inhale, rewind tape.
- Strains: one signature sound each, plus the knock itself.
- Room: rain, harbour horn and ship bells under story scenes.

**Music: engine `Song` data (chiptune sequencer), all original compositions.** Don't quote any source music or any real requiem.

- Title theme: a slow, sad triangle lead with a soft pulse.
- Ward/lounge: tired light jazz.
- `or-calm`, `or-tense` and `or-critical`: same key and tempo family so switching at bar lines sounds intentional.
- Four boss themes with saw "choir" pads. Dies Irae's tempo follows the heart: restart with new `bpm` at bar lines every few steps.
- Op 9's silence, then a swell. Op 10 sparse and gentle. Results fanfare and sad variant. Credits.

`MusicDirector` changes tracks at bar lines from vitals and stage. `loadGame` clears music and loops, so have the director restart on each stage.

---

## 11. Architecture

```
pixel-engine.js check.mjs GUIDE.md API.md …   the kit, unchanged, as it unzips
index.html, game.js          game.js exports createGame() and starts the engine only when `document` exists
src/core/     config.js (defaults + live values), rng.js, save.js, meta.js (title, tagline)
src/sim/      op.js, tools.js, entities.js, strains/*.js, scoring.js, bot.js, codec.js, campaign.js
src/content/  ops/*.js, scenes/*.js, lines.js, cast.js, arenas.js, songs.js, sfx.js, icons.js, about.js, models/*.js
src/view/     field.js, hands.js, strains/*.js, sets.js, bust.js, figure.js, fx.js
src/ui/       hud.js, prompts.js, menu.js, then one file per screen
src/stages/   title.js story.js briefing.js operation.js results.js log.js consult.js card.js attract.js
src/input/    devices.js, cursor.js
src/net/      session.js, host.js, client.js
src/audio/    voice.js, director.js
vendor/       session.js, harness.html, bridge.js, round.js (from the hub, unmodified)
tools/build.mjs
tests/        run.mjs, *.test.mjs, browser/*, balance.mjs
docs/AUTHORING.md            how to add an op, scene, strain or character
```

**The one rule that makes everything else possible: `src/sim` and non-model content import nothing from the engine, the DOM or the clock.** The sim is plain data plus pure functions: `sim = createOp(def, { seed, seats, difficulty, config })`, `step(sim, inputsBySeat)` at 60 Hz, `events = drainEvents(sim)`.

- Input per seat is `{ x, z, tool, use, gift, steady, drop, … }`.
- Randomness comes from its own seeded generator, never `Math.random`.
- State must survive `structuredClone`. This one rule gives you:
  - The Second Look.
  - Determinism: same seed plus inputs gives the same hash.
  - Tests in Node in milliseconds.
  - The bot.
  - A hub server copy with no renderer.
  - Network snapshots.

**Stages.** Each screen is a `Game` class, swapped with `engine.loadGame(new XStage(args))` under `engine.screen.cover/reveal`. A persistent `App` singleton holds save, settings, devices, config and the director. Set `status()` meaningfully (`op5 stage=2 vitals=64 t=121 score=3400`) and put test handles in `ready(ctx)` (`window.__GAME__ = { app, sim, goto, config }`). In solo, step the sim from `fixedUpdate`; draw in `update`. Cosmetic randomness comes from `ctx.random.fork('fx')`.

**Content is data**, so the rest of the game can be built with ordinary tools (JSON-safe, hot-editable):

```js
export default { id:'op1', title:'ELEVEN HOOKS', arena:'forearm', surgeon:'ilya', gifts:[], tools:['drain','forceps','suture','gel','syringe'],
  patient:{ name:'TOMASZ DOLAN', age:52, job:'TRAWLER DECKHAND', hook:"HIS DAUGHTER'S WEDDING IS SATURDAY.",
            followUp:{ S:'He walked her down the aisle. Dry eyes.', C:'He danced badly. She cried anyway.' } },
  time:240, vitals:{ start:85, drain:.10 }, doses:3, music:'or-calm', par:4200,
  stages:[
    { id:'pools', say:'reyes.drainFirst', hint:'drain',
      spawn:[{ k:'pool', id:'p1', at:[-3,.6], r:1.6 }, { k:'hook', id:'h1', at:[-3,.9], hiddenBy:'p1', arc:.8, pull:1.2 }],
      until:{ clear:['pool'] },
      on:{ vitalsBelow:{ 50:{ say:'reyes.stabilize', unlock:'syringe' } } } },
    …
  ] };
```

- Entity kinds (`pool, hook, nick, laceration, incision, tumor, polyp, prop, magnet, bleeder, clamp, vessel, fragment, organ, mask, strain:*`) register their tool handlers in `entities.js`.
- `until` takes `clear`, `flag`, `all` or `time`. Commands: `say, spawn, remove, unlock, setDrain, music, camera, flag, codeBlue`.
- Scenes are data too: `{ id, set, music, beats:[{ who, emo, say, cam, cue }] }`. Reaction pools live in `lines.js` (`reyes.mistake[]`, `reyes.clean[]`, `reyes.lowVitals[]`).

**The bot** (`src/sim/bot.js`) reads sim state and produces seat input, with `skill` 0 to 1 scaling speed, path noise, reaction delay and judgement (syringe when low, gifts when useful). It knows a strategy per entity kind. It is one piece of code with four jobs: **attract mode, the whole-game test playthrough, the balance report and the Op 9 partner.** Build it early.

**Engine facts to save you time**

- ✔ `update()` does not run while `engine.paused` is true; it does run at `timeScale = 0`.
- `loadGame` clears HUD, music, loops, particles and lights; it keeps Input, volumes and look.
- `engine.settings.open()` is a mouse-driven DOM panel that pauses the engine: use it only on the touch-only path; build your own Settings.
- Start options: `aspect:'fill'`, `touch:false`, `settings:{ button:false, key: inSession ? false : '<slug>' }`, `background`, plus `withUrlOptions` for review flags.
- Saves: guarded `localStorage` under a versioned key. In a session the client hands you an empty store.
- `game.js` must import cleanly in Node for `check.mjs --headless`: guard `document`, `navigator.getGamepads` and `localStorage`.
- Own URL flags outside a session, for tests: `?op= &stage= &diff= &seed= &bot= &god= &attract= &dev= &scene=`.

---

## 12. Balance

**Dev Mode sliders (live, with Reset to Defaults).** All in `config.js`:

- vitals drain ×, bleed drain, mistake penalty, max mistakes, time limit ×
- cursor speed, steady factor, aim assist, tool tolerance ×
- drain rate, laser burn time, syringe dose
- Composure gain per CLEAN, Quiet slow factor, Quiet drain, Second Look cost and seconds
- strain speed ×, strain HP ×, Dies Irae base BPM
- Code Blue zone width, co-op scale per seat

**`node tests/balance.mjs`** runs each op on the bot at skills 0.4, 0.7 and 1.0 and prints time used, final vitals, mistakes and rank. Targets on Resident:

| Bot skill | Should | |
|---|---|---|
| 0 (idle, no input) | fail every op | |
| 0.4 | clear Ops 1 to 3, may lose bosses | a nervous beginner |
| 0.7 | clear all, mostly B or A, at least 20% clock left outside bosses | a decent player |
| 1.0 | S on all | sets `par` |

---

## 13. Testing

One command: `node tests/run.mjs` prints only failures and one count line. An optional filter (`sim`, `content`, `browser`, `hub`) lets you rerun only what you changed.

**Node (fast, most tests):**

- Each tool's rules, success and mistake paths.
- Every op: idle fails; bot 0.7 clears; determinism hash stable; retry-from-stage works.
- Code Blue paths, The Quiet's time scale, The Second Look's exact restore.
- Scoring and rank bounds.
- Slider apply and reset.
- Codec round trip and sizes at each op's peak.
- **Whole-game scripted playthrough:** `campaign.js` driven by the bot through every scene and op to credits, with save and unlock checks.

**Content lint:**

- Cast and sets referenced exist; every tool used; all text fits two wrapped lines at 342 art pixels wide; every character is in the font's set; glyph tokens valid.
- No `TODO` or placeholder strings; About has every field.
- No forbidden source names.
- `check.mjs --sheets` clean of problems.

**Browser (Chromium, one or two at a time):** launch args ✔ `--enable-unsafe-webgpu --enable-features=Vulkan --use-webgpu-adapter=swiftshader --use-vulkan=swiftshader --use-angle=swiftshader --autoplay-policy=no-user-gesture-required`.

Software WebGPU runs at 5 to 30 fps here; prefer the sim's state and `engine.step()` over waiting, and use a 960×540 viewport for logic. A pad stub:
```js
window.__pad = { connected:true, mapping:'standard', index:0, id:'stub', axes:[0,0,0,0], buttons:Array.from({length:17},()=>({pressed:false,value:0})), vibrationActuator:{ playEffect:()=>Promise.resolve('complete') } };
navigator.getGamepads = () => [window.__pad, null, null, null];   // add_init_script
```
Cover:

- The built page from `file://`: boots, no errors. Outside a session `AIHub.active` is false and `AIHub.seeded` is not true. Enter, Space, Enter, Space then still draws (the hub's own "on its own" check).
- Fresh profile: music slider 0.1.
- Menu navigation by pad stub, keys and mouse (hover moves focus).
- Prompts switch with the last device; the Xbox option swaps glyphs.
- A real drain and forceps action by mouse and by pad stub (the sim state changes at the aimed spot).
- Attract: idle 10 s starts it; key and pad each exit; save untouched.
- Touch-only with `p.devices['Pixel 7']`: the exact text, the ⚙, no joystick, attract runs.
- Pause, then Dev Mode: a slider changes live config; reset restores it.
- Couch co-op with two stub pads: two independent tips.
- `engine.errors` and `gpuErrors` empty throughout.

**Sound:** render syllables and `SoundDef`s (`renderSound`) in Node: non-silent, finite. In the page, `audio.counts` rise while talking. An `AnalyserNode` level check on one voice line.

**Hub:** copy `harness.html`, `bridge.js`, `round.js` beside the built page in `dist/`. Serve **`python3 -u -m http.server 0 --bind 127.0.0.1`**. ✔ The `-u` matters: when you read the port from a pipe without it, the line never arrives and your script hangs (this cost me about fifteen minutes). Stop that server by its PID. Run these with launch args plus `--no-sandbox`, a 1600×1000 viewport, and wait for `document.body.dataset.complete === 'true'`:
```
harness.html?game=game.html&auto=1&players=2
harness.html?game=game.html&auto=1&players=3&latency=150&jitter=50&loss=5
harness.html?game=game.html&auto=1&players=4&latency=150&jitter=50&loss=5
harness.html?game=game.html&auto=1&players=4&latency=150&jitter=50&loss=5&scenario=host-leave
harness.html?game=game.html&auto=1&players=2&scenario=server
```
All must give `window.__hubCheck.pass === true`.

**Kit tools** ✔ all work here after `npm install playwright@1.63.0` in the dev folder (about 1 to 3 s each): `node check.mjs` (serves on an OS-picked 127.0.0.1 port), `node check.mjs --headless game.js --keys …`, `node check.mjs --sheets …`.

**Screenshots only for what scripts can't judge**, at 1920×1080: each arena, each set, each bust, title, results, HUD readability. Look at them. Blank WebGPU canvases can happen; ✔ here `page.screenshot` captured every frame fine.

---

## 14. Build and packaging

`tools/build.mjs` ✔ (this exact recipe gave a 6 MB page that booted from `file://` in about 1 s on software WebGPU):

```js
execFileSync('esbuild', ['game.js','--bundle','--format=esm','--platform=browser','--target=es2022','--outfile=dist/bundle.js']);
const js = readFileSync('dist/bundle.js','utf8').replace(/<\/script/gi,'<\\/script');
const session = readFileSync('vendor/session.js','utf8');           // verbatim: the hub compares it byte for byte
const pack = readFileSync('packs/kenney-furniture.json').toString('base64');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script>\n${session}\n</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${TITLE} — ${TAGLINE}</title> …description, theme-color, data-URL icon, hub:* tags…
</head><body><div id="app"></div>
<script>window.__PIXEL_ASSETS__={'packs/kenney-furniture.json':'data:application/json;base64,${pack}'};</script>
<script type="module">\n${js}\n</script></body></html>`;
```

- The output name comes from your brief: one constant at the top of the script. Write `dist/game.html` for the tests and a copy where your brief wants the deliverable.
- Don't minify the HTML or touch the session client's text.
- Also add `hub:type` Game, `hub:source` for the source, and an emblem icon as a data URL.
- When you report research, say this plan's planner read the source's Wikipedia page, the hub's protocol and the engine kit, and ran engine spikes; add anything you did yourself.
- For the exit-interview file your brief asks for, `aiHub.genre` is `Simulation`, `players` `1–4`, `series` `Trauma Center`. Good tags: `3d`, `pixel art`, `story`, `co-op`, `boss fights`, `comedy`.

---

## 15. Order of work

Build in this order. Keep the game running and the tests green after each step.

1. **Skeleton.** Unzip the kit and move the contents of its `pixel-engine/` folder to the dev folder root. `npm install playwright@1.63.0` there. Then: build script, test runner, an empty stage booting from `file://`, music default, input devices with pad stub test.
2. **One great op.** Sim core, tissue canvas, hand and tools, HUD, Drain, Forceps, Suture, Gel, Syringe, Op 1 playable on pad, mouse and keys. Make this feel wonderful before moving on.
3. **All tools and the bot.** Scalpel, Laser, Scanner; Ops 2 and 3; Code Blue; The Quiet; bot and balance report; whole-op tests.
4. **The drama.** Busts, figures, sets, story stage, voices, sound effects, music director, results, saves. Eps 1 to 3 flow end to end.
5. **The shell.** Title, menus, prompts, settings, pause, Dev Mode, attract, touch gate, About.
6. **Bosses and the rest.** Second Look, Bone Mend, transplant, Introit, Lacrimosa, Dies Irae, Libera Me, Do No Harm, all scenes, campaign playthrough test.
7. **Consult.** Couch first (it proves the seats), then session, card, net, harness passes.
8. **Polish and balance.** Juice, feel, per-arena art, tune against the targets, full screenshot pass at 1080p, `docs/AUTHORING.md`.
9. **Finish.** Fill in About and your chat reply and exit-interview file as your brief says.

**If you run short, cut whole content rather than leave anything half-made** (the brief forbids stubs). Cut in this order:

1. The `RenderView` and `Mirror` touches.
2. Extra session fights (keep Pile-Up).
3. Op 3's third table.
4. Lacrimosa's crawling phase.
5. Op 6's cold-time bar.

Never cut: Ops 1, 2, 5, 8, 9; both gifts; Code Blue; attract; Dev Mode; hub conformance; couch co-op.

## 16. Done means

| The brief asks for | Where |
|---|---|
| Genre and perspective chosen | §1 |
| Title by the brief's method | Yours, `src/core/meta.js` |
| One HTML, engine unmodified, session client verbatim | §14 |
| Native art plus new assets | §9 |
| Native animation plus new animations | §6, §9 (`HERO_CLIPS` on custom rigs, procedural tools) |
| All audio in code, gibberish voices, music at 10% | §10 |
| AI Hub integration and the game on its own | §7, §13 |
| Feature-complete demo showing every mechanic | §3, §5, §6 |
| World, characters, themes, tone, writing style | §2 |
| Infrastructure for more content with normal tools | §11, `docs/AUTHORING.md`, Dev Mode's Copy Op JSON |
| Dev mode from pause, live sliders, reset | §8, §12 |
| Attract after 10 s, any input exits | §8 |
| Controller-first at 10 feet, native keyboard and mouse, prompts by last input, Xbox option | §4, §8 |
| No dense data screens | §8 |
| Touch-only gate, settings button, attract runs | §8 |
| Tests behind one command, whole-game playthrough | §13 |
| No TODOs or placeholders | §13 lint |
| Source Information, Testing, Engine and Prompt Feedback in chat and About; exit interview | §8, §14, your brief |
