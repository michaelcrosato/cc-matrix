# Game Plan: a surgical action game inspired by *Trauma Center: Second Opinion*

You are building this game from this document, without its author. Your brief comes first; this plan turns the brief's open choices into decisions. Where the plan is silent, choose whatever serves the pillars in §1. Don't stop to ask.

- **Title:** yours. Pick it the way your brief says and keep it in one file, `src/config/identity.js`. No other source file, line of dialogue or asset may contain it. The logo must fit any title length.
- **File and folder names:** your brief names the dev folder, the final HTML file and the exit interview file. This plan never does. Every path below is relative to the dev folder.
- **Verified recipes:** everything in §16 was run on this computer on 2026-11-04 with the exact versions named. If a recipe disagrees with your instincts, trust the recipe.
- **Contents:** §1 the game · §2 world and cast · §3 core rules · §4 tools · §5 strains · §6 operations · §7 story · §8 controls and screens · §9 art · §10 animation · §11 audio · §12 attract mode · §13 dev mode · §14 multiplayer · §15 architecture · §16 verified recipes and traps · §17 testing · §18 build order · §19 About screen, exit interview, catalogue · §20 brief coverage checklist

---

## 1. The game

**Genre:** surgical action (arcade operation game) with a visual-novel story between operations.

**Perspective:** first-person surgeon's-eye view of a 3D operative field, from a fixed, tilted camera (§9.2). Story scenes are staged third-person two-shots of 3D character busts.

**Pitch:** a rain-soaked medical soap opera where a nervous young surgeon fights an engineered parasite that keeps time with the human heart. Each operation is 3 to 7 minutes of tool-switching panic: cut, pull, drain, burn, stitch, while the patient's heart races, the music speeds up with it, and a head nurse tells you exactly what she thinks of your hands. Then a rank stamp slams down on the chart, and the next envelope of sheet music arrives.

**The hook, which is ours and not the source's: the heartbeat is the clock.** One beat clock drives the ECG, the tissue's squeeze, the music's tempo, the parasites' attacks and the controller's rumble. As vitals fall, the heart races, so everything speeds up. Every parasite is a piece of music, drawn in musical notation, and it plays the patient's heart like an instrument.

### Pillars

1. **Every second is a heartbeat.** If something moves, sounds or attacks, it does so on the beat.
2. **Hands you can feel.** Analog trigger pressure, physical pulls with real tension, the pop, the arc to the tray, the clink. Objects you remove stay piled on the tray as trophies.
3. **Soap-opera sincerity.** Earnest, melodramatic, medically absurd, and never winking.
4. **One more try.** Hard, but never a spike: checkpoints per phase, an honest assist, tuning verified by a bot (§17).
5. **The TV first.** A DualSense at ten feet. Big, single-focus screens. Keyboard and mouse feel native, not ported.

### What to keep from the source, and what to change

| Source trait | What we do |
|---|---|
| Radial tool menu on the analog stick | Keep. Left stick flick picks one of 8 tools in fixed compass positions |
| Tool rhythm: drain, gel, laser, forceps, suture, scalpel, syringe, defibrillator | Keep the genre's vocabulary. Add the **clamp** (beat-timed) and a **scanner**. Make the rules ours (§4) |
| A gift that bends time | Keep the fantasy with a new name and meaning: **the Hush**. Second doctor gets a different gift, **Sforzando** |
| Vitals, time limit, per-action grades, final rank | Keep the structure. New grade names and rank titles (§3) |
| Man-made parasite with escalating strains | Original parasite and strains: **REQUIEM** (§5) |
| A second doctor's story that recontextualizes the first | Keep the structure: Chapter 3 hands you a second surgeon who disagrees with the first. Original characters and plot (§7) |
| Melodramatic, soap-opera story | Keep the tone (§2.4) |

Four things reviewers criticized in the source or its DS original, which this design deliberately fixes:

| Criticism | Fix |
|---|---|
| Star-drawing activation of the special was unreliable | The special is one reliable button (mirrored for the left thumb) |
| Difficulty spikes | Per-phase checkpoints, Bea's Notes assist, bot-verified timers (§3.8, §17) |
| Emotional disconnect from patients | Every patient has a chart with a personal gag and a one-line follow-up after the operation (§6) |
| Long text slows the pace | Scenes under 30 lines, always skippable, one-button fast-forward (§7) |

### Originality rule

Build an original game. The title may riff on the source's name, as your brief asks, but nothing else carries over. Don't use the source's characters, disease, organizations, hospital, levels, art or music. Specifically never use: Derek Stiles, Angie Thompson, Naomi Kimishima, Caduceus, Delphi, GUILT or its strain names, Healing Touch, star drawing, Hope Hospital, the XS rank, or the grades Bad/Good/Cool.

---

## 2. World, cast and tone

### 2.1 Setting

**Port Calloway**, a rainy harbor city in the near future: ferries, cranes, neon pharmacy crosses. **St. Alder Memorial Hospital** is old, underfunded and proud. Its heart is **OR 3**. Beneath it lies **Ward Zero**, a secret emergency unit in a sealed polio ward, green tile and old pipes.

### 2.2 Cast

Silhouette first: each must be recognizable from outline alone at ten feet.

| Character | Role | Pronouns | Look | Voice (§11) | How they talk |
|---|---|---|---|---|---|
| **Dr. Ren Halloran**, 27 | Protagonist, second-year surgical resident | he | Messy spiky dark-teal hair, big nervous eyes, teal scrubs, white coat, stethoscope | Mid-high, quick | Stammers and over-apologizes. In the OR: short, dead calm |
| **Bea Okonkwo**, 58 | Head nurse of OR 3 for 31 years | she | Marigold head-wrap, grey bun, round black glasses, deep-teal scrubs | Low, slow, warm | Calls everyone "child". Savage, devoted. **She never says "good"** until the last scene (§7) |
| **Dr. Augustin Bell**, 66 | Chief of Surgery | he | Bald, enormous white moustache, bow tie, wide build | Booming bass | Jovial aphorisms that turn out to be confessions |
| **Pip Adeyemi**, 24 | Pathology tech, weekend church organist | they | Two small hair buns, oversized yellow cardigan over scrubs | High, bubbly | Run-on sentences. Hears music in everything |
| **Hale Sorrento**, 45 | Director of Ward Zero | he | Slick hair, rectangular glasses, charcoal suit | Flat monotone | Deadpan bureaucratic menace |
| **Dr. Ines Varga**, 39 | Second playable surgeon, ex-Conservatory | she | Sharp black bob with a white streak, scar through left brow, black scrubs | Low, clipped | Never uses contractions. Rude truths |
| **Dr. Cordelia Voss, "the Maestro"**, 71 | Villain. Founder of St. Alder's cardiac unit, officially dead since a fire 17 years ago | she | Silver hair to the waist, tailcoat over a surgical gown, baton | Breathy, with organ-like harmonics | Musical metaphors, unhurried |

### 2.3 REQUIEM and the Conservatory

**REQUIEM** is the parasite: *Recombinant Endoparasitic Quiescent Immuno-Evasive Metazoan*. It is delivered with total scientific confidence and explains nothing. It nests in a host and entrains the heart: "It's keeping time with her pulse."

**The Conservatory** is Voss's cabal of former students. Before each outbreak the hospital receives an envelope with a page of sheet music, and the rhythm is the next victim's heartbeat. Each strain is a "movement" with a tempo marking as its name.

**The Hush** is an operating-room legend: once in a generation, a surgeon hears the whole room go quiet and every heart in it. Bea has seen it once in 31 years, in Voss. The tragedy: Voss never stopped hearing it.

### 2.4 Tone rules

1. Everyone is sincere. The jokes come from characters, never from the game mocking itself.
2. Lines fit two lines of TV text (about 90 characters). A monologue is many short lines.
3. Medical jargon is poetry. The science is nonsense, delivered with total confidence.
4. "Doctor" as a vocative, constantly. "Child" from Bea.
5. One shout per scene: big comic lettering, speed lines, camera punch-in.
6. Every chapter ends on a sting.
7. Scenes run at most 30 lines and about 90 seconds.

Lines to tune your ear. Use these, and write the rest to match:

- Bea: "Thirty-one years in this room, child. You are the ninth boy they have told me is gifted."
- Ren: "I-I've only ever done this on the simulator!" / Bea: "Then simulate faster."
- Bea: "That is a shard of windshield, not a sacrament. Take it out."
- Bell: "Surgery is the art of being wrong slowly enough to fix it."
- Bell: "You have the best hands I have ever seen, Doctor, and the worst nerves."
- Pip: "It's a heartbeat, it's literally a heartbeat, sixty-eight a minute with a skipped third, who writes that, who WRITES that?"
- Sorrento: "You have just pulled a biological weapon out of a dockworker, Doctor. Please wash your hands."
- Ines: "Your hands are excellent. Your diagnosis is a eulogy."
- Ines: "He waits for the silence. I do not wait."
- Voss: "Every heart is a metronome, Doctor. I merely gave them something to play."
- Ren: "She's a patient." (the last line of the climax, §7)

---

## 3. Core rules

Everything here lives in the simulation (§15), with values from the tuning table (§13). `fu` means field unit.

### 3.1 The field

Play happens on a flat logical plane. Field coordinates are `x` in [-1.35, 1.35], `y` in [-0.85, 0.85] (positive `y` is up the screen; world `z = -y`). The **instrument tray** zone sits to the right, centered at (1.62, 0.2), size 0.5 × 0.8. The tip is clamped to `x` in [-1.55, 1.9], `y` in [-0.95, 0.95]. Anything the player must touch has to sit inside the drape window: `(x/1.4)² + (y/0.85)² ≤ 1`, checked by the data lint in §17. The corners of the rectangle are under the drape.

Physics runs in this flat space: `y_world = 0` is the tissue surface. The view lifts everything by `heightAt(site, x, y)`, so Rapier never needs organ-shaped colliders. An operation has 1 to 3 **sites** (for example heart, lung, aorta). Each seat is at one site, and its tools touch only entities there. L1/R1 switch sites with a 0.35 s camera whip.

### 3.2 The instrument tip

- **Stick:** speed = `tipSpeed × |s|^stickCurve`, radial deadzone 0.12. `steadyFactor` applies while Steady is held.
- **Aim assist (pad and keyboard only):** near an active guide, and when the Use input is held on a cut or stitch, pull the tip toward the nearest guide point: `tip += (nearest - tip) × aimAssist × dt × 12`, within 0.12 fu.
- **Mouse:** absolute. The tip goes where the pointer is (project onto the field plane through the camera), limited to 4 fu/s while gripping an embedded object. Assist is a fixed 0.1, only near stitch gates. The OS cursor is hidden over the field and shown over HUD and menus.

### 3.3 The beat clock

`bpm = op.bpm + tempoPressure × (1 - vitals/100)`, smoothed over 1 s. A phase accumulator advances by `dt × timeScale × bpm/60`. Every wrap fires a `beat` event; 4 beats make a bar. The event drives tissue squeeze, ECG spike, HUD pulse, strain actions and rumble. The music follows the same `bpm` and aligns its quarter notes to `beat` (§11). Hush slows it; Fermata stops it.

### 3.4 Vitals, clock, misses

- **Vitals:** 0 to 100. Zero is a flatline and fails the operation. Hazards drain it (§4, §5). At 30 or below: danger state (red vignette, line boil, heartbeat rumble, Bea shouts).
- **Timer:** per operation. Zero fails the operation. It stays visible, and pulses under 30 s.
- **Misses:** a MISS adds to a counter. Reaching `missLimit` fails the operation ("Malpractice").

### 3.5 Grades and score

Each discrete action (a cut, a shard, a wound, a clamp, a kill) earns a grade, shown as comic lettering with an ink splat at the tip:

| Grade | Base points | Composure |
|---|---|---|
| FLAWLESS | 300 | +10 |
| CLEAN | 150 | +5 |
| ROUGH | 50 | 0 |
| MISS | -100 | -10 |

Combo: consecutive CLEAN-or-better multiplies points by `1 + 0.05 × combo`, up to ×2. MISS resets it. ROUGH holds it. On success add `vitals × 20 + seconds left × 5`, plus 1500 for no misses.

### 3.6 Ranks

Final rank compares the score with the operation's `parScore` (data, set from the bot in §17):

| Rank | Score vs par | Title on the stamp |
|---|---|---|
| S | at least 90% | Chief of Surgery |
| A | at least 75% | Attending |
| B | at least 55% | Resident |
| C | at least 35% | Intern |
| D | below 35% | Malpractice Suit Pending |

### 3.7 Composure and the two gifts

Composure is a 0 to 100 meter, gain scaled by `composureGain`. When full, the Special button fires the current doctor's gift, and the meter empties.

- **The Hush (Ren):** a 0.4 s held breath with everything frozen, then for `hushDuration` seconds, strains, drains, timers and the beat run at `hushTimeScale` while your tip and tools run at full speed. An ink-wash expands from the tip: sumi-e monochrome, with red the only color left. Music low-passes down to almost nothing; only the slow heartbeat remains.
- **Sforzando (Ines):** a violent accented hit. All strains are stunned for `sforzandoStun` seconds and lose `sforzandoDamage` of their current HP, and tools work at `sforzandoToolMult` for `sforzandoDuration` seconds. Comic cut-in, one huge orchestral stab.

In Operation 7 both surgeons are in the room: D-pad Right (or R) swaps the lead doctor and therefore the gift. In Free Play, the chart offers either doctor.

### 3.8 Difficulty, checkpoints, assist

| | Easy (Intern) | Normal (Resident) | Hard (Attending) |
|---|---|---|---|
| Drains | ×0.6 | ×1 | ×1.35 |
| Timers | ×1.4 | ×1 | ×0.85 |
| Tolerances (`scalpelTol`, `stitchGateR`, `clampWindow`, `defibWindow`) | ×1.4 | ×1 | ×0.8 |
| `missLimit` | 12 | 8 | 5 |
| Strain HP | ×0.85 | ×1 | ×1.2 |

New Game asks once, in Bea's voice ("How much do you hate yourself, child?"), and every chart can change it.

**Checkpoints:** every phase is a checkpoint. Failing offers *Retry phase*, *Restart operation*, *Quit*. Retrying a phase restores vitals to at least 60, the timer to at least 90 s, and the score to the checkpoint's. Phases must be self-contained: a phase's `spawn` lists everything it needs, so `skipTo(phase)` works for retry, dev mode and attract mode alike. Use `ifMissing: true` for what an earlier phase normally leaves behind, such as clamps.

**Bea's Notes (assist):** after failing the same phase twice, Bea offers her notebook: 30% more time, 30% less drain, rank capped at B. It's optional, stated honestly, and shown on the report.

**Hints:** 12 s without progress, Bea says the next step and the right wheel slot flashes. D-pad Down or H asks at any time, at no cost.

### 3.9 Consults

Before Operations 5, 6 and 7, Ren and Ines each propose a plan, and the player chooses:

| Plan | Effect |
|---|---|
| Ren's: careful | Timer +60 s, drains ×0.8, score ×0.9 |
| Ines's: aggressive | Timer -40 s, tools ×1.25, score ×1.15 |

---

## 4. Tools

**The wheel never changes.** The left stick flick selects at once (deflection over 0.6, 8 sectors, with hysteresis). Keys 1 to 8 and the mouse wheel do the same, and the on-screen wheel is clickable.

| Key | Dir | Tool | Used for |
|---|---|---|---|
| 1 | N | **Scalpel** | Trace incisions; sever tethers and chain links |
| 2 | NE | **Forceps** | Pull shards, tumors, stunned parasites; carry to tray |
| 3 | E | **Suction** | Drain pools |
| 4 | SE | **Gel** | Disinfect zones, heal scratches, clear spores, seal nests |
| 5 | S | **Suture** | Stitch wounds through gates |
| 6 | SW | **Laser** | Burn nodules and parasites, with analog power |
| 7 | W | **Scanner** | Reveal and mark hidden things; pin Tremolo |
| 8 | NW | **Clamp** | Stop spurting bleeders on the beat |

Off the wheel: **Syringe** (one button, context-sensitive) and **Defibrillator** (event only).

"Use" below means R2 (analog 0 to 1) or LMB/Cross (1.0). Using a tool on nothing is harmless, except the Scalpel and Laser on bare tissue. Wrong tool for a target: no penalty, Bea comments. Every rule below needs a Node test (§17).

- **Scalpel.** Hold Use within 0.08 of a highlighted incision's start. Progress advances by projecting the tip onto the polyline while within `scalpelTol`.
  - Leaving tolerance while holding: a **nick**: MISS, vitals -3, small pool spawns. Progress is kept; re-enter to continue.
  - Speed over 1.8 fu/s caps the grade at ROUGH.
  - Grade by mean deviation: up to 0.35×tol FLAWLESS, up to 0.7×tol CLEAN, else ROUGH.
  - **Sever:** with Use held, the tip's path crossing a tether or chain link at 0.4 fu/s or more cuts it.
  - On bare tissue, moving with Use held: a nick every 0.4 s.
- **Forceps.** Use at 0.4 or more within 0.1 of a grabbable item grips it. Dropping below 0.4 lets go. Embedded items have an `axis` and an `embed` distance (0.15 to 0.6).
  - Pull within ±50° of the axis at or under `pullTol`: the item comes out, stretching on a Rapier spring, and pops free at full distance.
  - Pull faster: **tear**: MISS, vitals -4, item stays.
  - Wrong direction: it just resists.
  - Held items hang from the tip on a spring. Releasing over the tray deposits them, and they physically land and pile up. Releasing elsewhere: it falls, vitals -1, grab it again.
  - Grade by pull smoothness (speed variance).
- **Suction.** Hold Use: pools within radius 0.16 lose `suctionRate × use` volume per second, and droplets arc into the nozzle. Pool done at under 5%. CLEAN, or FLAWLESS if it never overflowed. A pool over its threshold covers guides and drains 0.4 vitals/s.
- **Gel.** Hold Use: paints a coverage grid (cell 0.04 fu) within `gelRadius`. A zone completes at 90%. Scratches heal when coated for 1 s. Spores clear on contact. Nest holes seal after 1 s. Grade against the zone's par time.
- **Suture.** A wound shows numbered gates, alternating sides. Hold Use and pass through them in order, within `stitchGateR`. Each gate pulls a stitch tight with a thread you can see (cosmetic rope, §9.7). Tearing more than 0.3 fu away with Use held: MISS. After the last gate, tie off with a quick flick (1.5 fu/s or more) or Alt within 1.5 s, or it auto-ties and can't be FLAWLESS. Grade by average distance from gate centers.
- **Laser.** Hold Use: a beam at the tip, DPS `laserDps × use` (use clamped to 0.3 to 1) on a target within 0.05. Off-target on tissue, after 0.25 s grace: scorch mark and `laserBurn × use` vitals/s. Six seconds of continuous fire forces a 1.5 s vent. FLAWLESS if no tissue burned on that target.
- **Scanner.** Hold Use: an x-ray circle of `scannerRadius` around the tip. Hidden things inside are visible; 0.6 s of dwell **marks** them (ping), and they stay marked. Hidden things can't be touched by other tools until marked. A dwell of 1 s on Tremolo pins it.
- **Clamp.** Use within 0.1 of a bleeder. A ring contracts onto each beat: within `clampWindow` of the beat FLAWLESS, within double CLEAN, otherwise ROUGH (it still works). Unclamped bleeders feed a pool and drain 1 vitals/s. Four clamps per operation. **Alt on a clamp removes it**, and clamps must be off before an operation ends, which the objective line states.
- **Syringe** (Square / D-pad Left / F). Over an injection site: hold 0.8 s to inject (FLAWLESS if finished on a beat). Anywhere else: 0.5 s plunge into the IV for `stabilizerHeal` vitals, then `stabilizerCooldown`. Unlimited doses.
- **Defibrillator** (event only). During an arrest, paddles appear. Hold both L2 and R2 (LMB+RMB, or J+K) for 1.2 s to charge while a ring grows; release both as the ring crosses the gold band (`defibWindow`). "CLEAR!" White flash, thump, the heart restarts. Too early or too late: weak shock, 2 s lost.

---

## 5. Strains

Each strain is a musical notation symbol come to life. On first appearance: a comic **strain card** with a dictionary definition, and stave lines crawl across the organ in ink.

| Strain | Card text | Look | Behavior | Counter | Music |
|---|---|---|---|---|---|
| **Adagio** | *adagio (adv.): slowly, with great expression. Also: it is eating her liver.* | Fat tube body with five yellow-green stave stripes; note-head on a thin stem | Crawls along a site path at 0.12 fu/s. Beat 1 of each bar leaves a scratch at its tail (max 3; 0.5 vitals/s each). Core glows on beats 3 to 4: Laser ×3 there. HP 100 | Laser to 0: stunned 5 s. Forceps it to the tray in time, or it wakes with 40 HP. Grande variant: HP 150, two tails, opens bleeders | Slow cello-like line |
| **Staccato** | *staccato (adj.): short, sharp, detached. Like her prognosis.* | Tiny black note-heads with flags popping out of holes | Holes spawn notes on off-beats. A note lives 2 beats, then bursts into a spore patch (-2 vitals, then 0.3 vitals/s until gelled). Hidden nests need the Scanner | Laser tap (0.25 s) or Forceps pinch (0.2 s). Gel 1 s (or 3 stitches) seals a nest | Pizzicato on the off-beats |
| **Tremolo** | *tremolo (n.): a rapid, nervous trembling. Yours, specifically.* | Pale moth with stave-striped wings, always shivering | Flees at 0.9 fu/s if the tip is within 0.6 fu moving faster than 0.45 fu/s. Scratches 1.5 vitals/s while fleeing. Freezes if you approach slowly | Steady in, Scanner 1 s to pin (3 s), Laser 40 HP. Three pins | Fast high strings |
| **Legato** | *legato (adj.): smoothly connected, without a break. It does not want a break.* | Bead chain joined by curved slur ribbons, on Rapier rope joints, head pinned | Must be cut **tail first**; the active link glows. Wrong link: two links re-heal, vitals -4. Cut pieces reattach after 8 beats unless carried to the tray. Every 8 beats it jerks and opens a bleeder | Scalpel sever, then Forceps to tray | Gliding portamento lead |
| **Crescendo** | *crescendo (n.): gradually getting louder. She is about to get very loud.* | A hairpin "<" wedge wrapped into a ring that widens | Size grows by `0.02 + 0.015 × live feeders` per second, from 0.2 to 1. Drain `1 + 6 × size` vitals/s. Four feeders (HP 40) regrow every 16 beats. At size 1: **Fortissimo**: -20 vitals, 2 bleeders, size resets to 0.6 | Kill all feeders: the ring shrinks and shows a circular cut line. Scalpel the circle, Forceps it out | One new voice every bar |
| **Fermata** | *fermata (n.): hold. Hold until the conductor releases you. The conductor is not coming.* | The fermata sign as a giant eye: an arc and a dot, opening on the heart | Stops the heart: music cuts to silence, ECG flat, 8 s arrest clock, vitals hold at 15. While the heart is stopped the eye is exposed | Laser the eye (HP 60, then 80) during the pause, then Defib before the clock ends. Between arrests: inject 3 sites. Finally Forceps | One held organ chord |
| **Coda** | *coda (n.): the tail. The part that ends everything.* | Coda sign (circle and cross) as a core, two long baton arms on Rapier chains, a tailcoat membrane | **Beat 1 Downbeat:** ring telegraphs one beat early; the baton slams, -6 vitals and a scratch, unless you Laser the baton 0.5 s during the wind-up. **Beat 3 Cue:** spawns 2 notes or a small Adagio. **Every 4th bar a rest:** the core opens for 2 beats, Laser ×3. At 66% and 33% of HP 300 it moves to another site and its arms regrow; sever the arms to reach it. At 0: long Forceps pull (embed 0.6) | All of it | All the motifs in counterpoint, with the Dies Irae (§11) on organ |

---

## 6. Operations

About 40 to 55 minutes in total. Timers are for Normal. **Every operation also has a chart:** patient name, age, job, one personal gag, and a one-line follow-up shown on the report. Phases are data (§15.3).

### Op 1: Broken Glass (Chapter 1, Ren). Forearm. Timer 4:00, 72 bpm
*Desmond Pell, 52, taxi driver. "Has never once used a turn signal." Follow-up: "Discharged Tuesday. Was seen signaling, once, leaving the car park."*
Teaches: tip, wheel, Gel, Forceps, Suction, Syringe, Scanner, Suture.
1. **Clean:** one gel zone (1.2 × 0.5).
2. **Pull the glass:** 4 shards (embed 0.18 to 0.3). Each pull leaves a small pool (volume 0.4). Done when shards are on the tray and pools are drained.
3. **Vitals dip:** scripted -25. Bea teaches the Syringe. Can't fail here.
4. **The missing shard:** Bea: "Count them, child." Scanner finds a deep shard. Forceps it.
5. **Stitch:** two lacerations (6 and 8 gates).
6. **Finish:** gel zone over the stitches.

### Op 2: Growth Spurt (Chapter 1, Ren). Abdomen skin, then bowel. Timer 5:30, 76 bpm
*Hana Ito, 38, crane operator. "Lifts forty tons for a living. Fainted at the consent form." Follow-up: "Back on the cranes. Asks after you. Has asked you to stop visiting."*
Teaches: Scalpel, Clamp, Laser, sever, the Hush.
1. **Open:** gel zone, one long incision (1.4 fu). Ink wipe to the bowel site.
2. **Bleed:** 2 bleeders and rising pools. Clamp and Suction.
3. **Nodules:** 5 (HP 30), one hidden. Laser, Scanner.
4. **The tumor:** sever 3 tethers. Forceps it out (embed 0.4) and carry it to the tray.
5. **The crash:** the tumor twitches on the tray. Vitals forced to 35, drain 3/s, a rupture wound (12 gates) opens, Composure is set to 100. Bea screams. The Hush prompt appears. The moment it fires: silence, ink wash, the first time. Suture the rupture.
6. **Close:** take clamps off, close incision (10 gates), gel.

### Op 3: Adagio (Chapter 2, Ren). Liver. Timer 5:30, 80 bpm
*Theodora Lund, 61, cellist, Harbor Orchestra. "Refuses anesthesia until she has finished a sentence about Brahms." Follow-up: "Performed in April. Dedicated the slow movement to 'the nervous one.'"*
1. **Open:** gel, short incision.
2. **Look closer:** Scanner sweep reveals stave lines and 3 nests. Adagio emerges, with strain card.
3. **Adagio:** Laser it down, Forceps it out.
4. **Eggs:** 4 hidden (Scanner, Laser HP 20) hatching at bar 16 into small Adagios.
5. **Adagio Grande:** HP 150, two tails, opens bleeders. Clamp them.
6. **Close:** clamps off, suture 2 lesions, gel.

### Op 4: Staccato (Chapter 2, Ren). Bowel, then stomach. Timer 6:00, 84 bpm
*Ruben Castellano, 47, ferry captain. "Has not missed a crossing in nineteen years. Is asking whether this will take long." Follow-up: "Missed two crossings. Sent flowers to the ferry."*
1. **Open:** gel, incision.
2. **Wave 1:** 8 notes from 3 open holes.
3. **Find the nests:** Scanner, 4 hidden holes. Seal them.
4. **Waves 2 and 3:** 12 and 16 notes, faster.
5. **Tremolo:** first appears here. Bea: "Slow hands, child." Three pins.
6. **Close:** suture, gel.

### Op 5: Legato (Chapter 3, **Ines**). Brain. Timer 6:00, 70 bpm. Consult
*Nadia Bloom, 29, school music teacher. "Her class has sent a card signed 'Please do not miss.'" Follow-up: "Back with Class 4. They have sent a second card."*
Teaches: Sforzando, the Consult. Scalpel tolerance ×0.75 throughout: this is a brain.
1. **Consult,** then **membrane:** two precise arcs.
2. **Legato:** 12 links, tail first. Forceps each piece away.
3. **Thrash:** at link 6 it speeds up. Composure set to 100. Ines: "Now you will see how I work." Sforzando prompt.
4. **Second chain:** 8 links with two tails.
5. **Repair:** suture the vessel (tight gates), clamps off, gel.

### Op 6: Fermata (Chapter 3, Ren, with Ines on comms). Heart. Timer 7:00, 88 bpm. Consult
*Dr. Augustin Bell, 66, Chief of Surgery. "Has told every surgeon in this hospital to quit smoking. Smokes." Follow-up: "Under arrest. Recovering. Has quit."*
1. **Consult,** then **open:** long incision, gel.
2. **Crescendo:** feeders, Fortissimo threat, cut out the ring.
3. **First arrest:** the eye opens, silence. Defib tutorial, no Laser needed.
4. **Antidote:** 3 injection sites, plus bleeders.
5. **Second arrest:** Laser the eye (HP 60), then Defib.
6. **Third arrest:** Laser the eye (HP 80), Defib, then Forceps the eye out.
7. **Close:** clamps off, suture, gel.

### Op 7: Coda (Chapter 4, Ren and Ines). Heart, lung, aorta. Timer 9:30, 92 bpm. Consult
*Beatrice Okonkwo, 58, Head Nurse. The chart is in her own handwriting: "Do not be dramatic about this." Follow-up: "Discharged herself. Is back in OR 3. Has opinions."*
Bea is unconscious, so **Pip reads her notebook aloud** as the in-operation voice. This is the emotional core: every bark is her words in someone else's voice ("'Suction before you can't see.' She underlined that twice.").
1. **Exposition (heart):** Adagio and Staccato together.
2. **Development (lung, breathing field):** Tremolo and a Legato chain. Bleeders open back at the heart: site-switch alarm, teaching L1/R1.
3. **Recapitulation (aorta):** Crescendo, then a Fermata arrest. Every monitor in the hospital audibly falls into time with hers.
4. **Coda (moves across all three sites):** the Conductor (§5).
5. **Closing:** wounds on all three sites, clamps off.
6. **The last stop:** her heart stops, no warning and no hint. Composure refills, and the gift is Ren's Hush whoever was leading. Total silence, one Defib. Then her ECG, alone, and the music returns on the downbeat.

### Last Patient (Chapter 4 ending, Ren). Heart. No HUD, no timer, can't fail
*Dr. Cordelia Voss, 71. Chart: "Deceased," with a date 17 years ago, crossed out by Ren.*
Forty seconds. Rain. One clamp, one Defib. Report: no rank, only: "Tonight's patient survived."

### Grand Rounds (co-op, Free Play and hub rounds). Liver, bowel, heart. Timer 5:00
*Ngaio Reeve, 55, harbor master. "Ward Zero has only this to say: everyone scrub in."*
Each movement overlaps the last, so a team can split up. Counts scale by `1 + 0.5 × (players - 1)`, strain HP by `1 + 0.25 × (players - 1)`.
1. **0:00, Open up:** 2 incisions (liver), 4 shards (bowel), gel zones, 2 bleeders.
2. **1:00, Adagio and Staccato:** Adagio on the liver, a nest on the bowel.
3. **2:15, Legato and Crescendo:** a chain on the bowel, a ring on the heart.
4. **3:30, Fermata:** one arrest. **Any one surgeon's shock counts**; simultaneous shocks earn a bonus. Injection sites at every site.
5. **4:15, Close:** wounds everywhere. Done before the timer: win.

---

## 7. Story

Delivered as short scenes on a 3D stage (§9.5). Cross, Enter, Space or a click advances; hold to fast-forward; Triangle or Tab skips the scene, with a prompt on screen. Write 250 to 350 lines in total, in `src/data/story/`. The beats and must-have lines below are fixed; the rest is yours. Chapter names: **Scrub In**, **First Movement**, **Dissent**, **Coda**.

| # | When | Where | Beats and must-have lines |
|---|---|---|---|
| S0 | New game | OR 3 at night, empty | An envelope slides under the door. The monitor switches itself on and beeps, in time, with no patient. A silhouette lifts a baton. Title sting. 20 s |
| S1 | Before Op 1 | Corridor, OR 3 | Flood traffic has stranded the attending. Ren is all there is. "Thirty-one years in this room, child…" "Then simulate faster." |
| S2 | After Op 1 | Bell's office | Bell's praise and warning: "the best hands… the worst nerves." |
| S3 | Before Op 2 | OR 3 gallery | The board watches. Routine tumor. Ren throws up, apologizes to the bucket |
| S4 | After Op 2 | OR 3, tray | Ren: "Everything went quiet." Bea goes very still: "I have heard of that once." The tumor twitches on the tray. In rhythm. Sting: "Tumors do not keep time, child." |
| S5 | Before Op 3 | Pip's pathology lab | Envelope: sheet music addressed to "The Surgeon on Call". Pip plays it on a keyboard: "It's a heartbeat…" Ambulance: a cellist |
| S6 | After Op 3 | Ward Zero | Sorrento: "Please wash your hands." REQUIEM, spelled out in full, with a straight face. The Conservatory. Ren is drafted |
| S7 | Before Op 4 | Ambulance bay, rain | Second score. A ferry captain |
| S8 | After Op 4 | OR 3 | The OR phone rings. A breathy voice: "Bravo, Doctor. You play by ear. How delightful." Bea drops a full instrument tray. Sting |
| S9 | Before Op 5 | Ward Zero, then OR 3 | Ines arrives under guard. "Your hands are excellent. Your diagnosis is a eulogy." She operates; you play her. First Consult |
| S10 | After Op 5 | Hospital roof, rain | Ines explains: she studied under the Maestro, who had the Hush. "At the end, Doctor, you cannot turn it off." "He waits for the silence. I do not wait." |
| S11 | Before Op 6 | Boardroom | Bell collapses mid-aphorism. The envelope's dedication: "For Augustin, who signed." Consult |
| S12 | After Op 6 | Recovery room | Bell confesses: he signed Voss's death certificate after the Ward Zero fire, knowing she lived, and funded St. Alder with her research. "Every heart I mended in this building, I mended with her money." Bea: "I handed her the knife for eleven years. I would know that silence anywhere." |
| S13 | Before Op 7 | OR 3 | Final envelope. Pip plays it and slows down: "I know this rhythm. It has a murmur. Ms. Okonkwo, you've got a—" Bea, turning, mid-sentence: "Forceps, ch—" She falls. Ines: "You cannot operate. You love her." Ren: "Then you had better hand me the instruments." Pip, shaking, picks up the notebook. Consult |
| S14 | After Op 7 | Recovery, dawn | Bea wakes. Long silence. "You held the forceps wrong, child." |
| S15 | Then | OR 3 gallery | Voss, conducting behind the glass, falters: her own heart is the first host. Sorrento: "Let her go, Doctor." Ren: "She's a patient." Leads into Last Patient |
| S16 | After | St. Alder, morning | Patients' cameos. Pip in student-nurse scrubs. Bea, with a cane, watches Ren close a wound and, for the only time in the game: **"Good hands, child."** Credits roll over attract footage. Post-credits: a new envelope, marked *Opus 2* |

**Bea's barks.** Write 60 or so short in-operation lines keyed by event, each with an expression: `start, nextPhase, toolHint(tool), idle, vitalsLow, vitalsCritical, miss, streak, bleeding, overflow, clampReminder, strainIntro(strain), hushReady, timerLow, success, fail`. A taste:

- `vitalsLow`: "Pressure's falling, child. Stabilizer."
- `miss`: "That was not on the line." / "I saw that. God saw that."
- `streak`: "…Adequate." (her highest praise)
- `bleeding`: "You are swimming in it. Suction."
- `clampReminder`: "Your clamps are still in. Would you like to sign for them?"
- `timerLow`: "Clock, child."
- `fail`: "Call it. Then go and tell the family. No. You. That is the job."

**Lint:** a test fails if any Bea line contains "good" outside S16. In Op 5 Bea still calls the barks and trades shots with Ines. In Op 6 Ines interjects over comms. In Op 7 every bark comes from Pip reading the notebook.

---

## 8. Controls and screens

### 8.1 Operating controls

Design order: DualSense, then keyboard and mouse, then the Xbox glyph option. Same game, same screens.

| Action | DualSense | Xbox glyphs | Keyboard and mouse |
|---|---|---|---|
| Move the tip | Right stick | RS | Mouse. Keyboard-only: WASD or arrows |
| Pick a tool | Left stick flick | LS | 1 to 8, mouse wheel, click the wheel |
| Use (analog) | R2 (Cross = full) | RT (A) | LMB (J or Enter on keyboard only) |
| Steady | L2 | LT | Shift |
| Alt: drop, remove clamp, tie off | Circle | B | RMB (K) |
| Syringe | Square or D-pad Left | X or D-pad Left | F |
| Special | Triangle or D-pad Up | Y or D-pad Up | Space |
| Site back / next | L1 / R1 | LB / RB | Q / E |
| Swap lead doctor (Op 7) | D-pad Right | D-pad Right | R |
| Ask Bea | D-pad Down | D-pad Down | H |
| Recenter tip | L3 | LS click | C |
| Pause | Options | Menu | Esc |

The D-pad mirrors exist so a left thumb can fire Special and Syringe without taking the right thumb off the stick.

**Pads:** accept any pad the browser reports with `mapping === 'standard'`. Read `axes` and `buttons[i].value` directly. If the active pad disconnects mid-operation, pause.

**Rumble:** `vibrationActuator.playEffect('dual-rumble', …)` if present, with a Settings toggle. Heartbeat double-pulse at low vitals, a tick per stitch, a click for clamps, a slam for Defib. Guard against a missing actuator; it can't be tested here beyond the guard.

### 8.2 Menu controls

Pad: D-pad or left stick, Cross confirm, Circle back, L1/R1 pages. Keyboard: arrows or WASD, Enter or Space confirm, Esc or Backspace back, Q/E pages. Mouse: hover moves the focus (there's always exactly one focused item), click confirms, wheel scrolls, RMB backs out. In story scenes a click advances the line. In an operation, the wheel's slots and the site tabs are clickable, and the parallax follows the pointer.

### 8.3 Prompts

All on-screen prompts and any text naming a control use action tokens (`{use}`, `{steady}`, `{special}`), rendered by `src/input/glyphs.js` from the input used last:

- **Pad, PlayStation (default):** drawn SVG shapes for ✕ ○ □ △ in their usual colors; L1/R1/L2/R2 pills; stick icons.
- **Pad, Xbox** (Settings option): A B X Y in their usual colors; LB/RB/LT/RT.
- **Keyboard and mouse:** keycaps and mouse-button icons.

Device switching: any key press means keyboard; mouse movement over 4 px or a click means mouse; a pad button or stick past deadzone means pad. Set `data-prompt-set` on `<html>` so tests can read it. Poll pads every frame; don't rely on `gamepadconnected`.

### 8.4 Ten-foot rules (tests can't judge these; check at 1920×1080)

- Scale all UI with `html { font-size: calc(100vh / 1080 * 16) }` and rem units. It must still hold together in a 640×400 hub frame.
- Minimum text at 1080p: 34 px anywhere, 44 px dialogue, 40 px objective, 56 px or more for key numbers.
- 5% safe margin. At most 7 items on a screen. One focus. No hover-only information. No tables outside dev mode.
- Nothing web-like: no scrollbars, no small links, no dense data screens.

### 8.5 The operating HUD

The field fills the center, and the HUD holds the edges. At 1080p the drape window leaves about 100 px clear at the top and 190 px at the bottom, so keep the ECG band shallow and let the portrait use the bottom.

| Where | What |
|---|---|
| Top center | Big ECG trace (2D canvas) sweeping on the beat clock, vitals number, bpm |
| Top left | Objective line and icons of the tool(s) needed |
| Top right | Timer, score, combo. Co-op: seat chips (name in seat color, current tool) |
| Bottom left | The tool wheel, large and always visible. Next tool's slot flashes after a hint |
| Bottom center | The current voice's portrait (live 3D bust, §9.6; Bea, Pip in Op 7) and the bark in a comic bubble |
| Bottom right | Composure gauge, Syringe cooldown, button prompts for the current context |
| Bottom center, above portrait | Site tabs (only with more than one site), with an alarm icon when another site is in trouble |

### 8.6 Screens

| Screen | Contents |
|---|---|
| Boot | Instant HTML "Scrubbing in…" with a pure-CSS ECG, before the heavy script runs |
| Touch notice | Touch-only devices. See below |
| Title | 3D lamp swings on over OR 3 and a heartbeat; logo with an ECG line through it; "Press any button" |
| Main Menu | Story (Continue / New), Free Play, Grand Rounds, Settings, About & Credits. At most 5 big items |
| Story | §9.5 |
| Chart | Before each operation: patient bust, name, job, gag, difficulty, Consult when due, big Begin |
| Operation | §8.5 |
| Pause | Resume, Retry Phase, Restart Operation, Settings, Dev Mode, Quit to Menu. In story scenes: Resume, Skip Scene, Settings, Dev Mode, Quit to Menu. Opens by itself when the tab is hidden (outside sessions) |
| Fail | FLATLINE or TIME or MALPRACTICE in huge lettering, Bea's line, Retry Phase / Restart / Quit, Bea's Notes offer when due |
| Report | A 3D clipboard. Only four stats (Time, Vitals, Precision, Best Combo), the rank stamp slamming down, the patient's follow-up, Continue |
| Free Play | Chart Board: patient cards with best rank stamps. A card appears once its operation is reached in Story; dev mode unlocks all. Choose difficulty and doctor |
| Grand Rounds lobby | Four seat cards. "Press {confirm} to join" (§14.5) |
| Settings | Three pages. **Audio:** Music (default 10%), Effects, Voices. **Controls:** Glyphs (PlayStation/Xbox), Rumble, Aim Assist, Swap Sticks, Tip Speed. **Display:** Fullscreen, Screen Shake, Line Boil, Text Speed |
| About & Credits | §19 |
| Credits roll | After S16, skippable, over attract footage |
| Session card, countdown | §14.4 |

**Touch-only devices.** Detect with `matchMedia('(any-pointer: fine)').matches === false` and no pad seen. Don't use `navigator.maxTouchPoints`: it reported 0 on the WebKit iPhone and iPad profiles here. Show **"Controller or keyboard required"** and a **Settings** button, and no touch controls of any kind. Settings must work by tap on this path. Attract mode still starts after 10 s idle, behind the notice, and a tap returns to it. A key press or pad press leaves the notice for the normal Title.

---

## 9. Art direction

**Native base:** Three.js `MeshToonNodeMaterial` with a stepped ramp, real lights and shadows, then the ink filter in §16.5. All geometry is made in code. Use the engine's stock generators freely (`RoundedBoxGeometry`, `LatheGeometry`, `TubeGeometry`, `ExtrudeGeometry`, and so on) for generic props. Make new art for what makes the game feel like its source: organs, instruments, strains, characters.

The look is **a comic-book medical drama**: fat ink lines with a hand-drawn wobble, manga tone in the shadows, glossy candy-colored organs with hard white glints. Stylized and bright, T-rated: blood is glossy crimson paint, never realistic.

**The performance budget is unlimited,** as your brief says. Add as much detail, as many enemies, effects, lights and shadows as a scene needs. FPS targets and optimization are out of scope; don't spend time on them.

### 9.1 Palette

| Use | Color |
|---|---|
| Drape and UI teal / OR background | `#17707A` / `#0B2529` |
| UI paper / ink / marigold / alarm | `#F4F1E8` / `#12081A` / `#F2B134` / `#E8443A` |
| Blood / gel / laser / suture thread | `#C4142F` / `#7CF2C9` / `#FF3B6B` / `#2B6CFF` |
| Target outlines / marked-hidden | `#39E6E6` / `#F2B134` |
| Strains body / stave lines | `#2B1456` / `#D7F24A` |
| Hub seat colors | `#e8443a` `#3b82f6` `#22c55e` `#f5b700` (from the protocol) |

### 9.2 The operating view (values verified in the prototype)

- Camera: `PerspectiveCamera(34, aspect, 0.1, 60)` at `(0, 3.55, 1.65)`, looking at `(0, 0.1, 0.06)`. For aspect under 16:9, scale the distance by `(16/9)/aspect`.
- Subtle life: parallax toward the tip, a 0.2% dolly on each beat, shake on slams, punch-in on Hush, 0.35 s whip between sites.
- **Drape:** an extruded teal shape at `y = 0.34` with an irregular elliptical window (radii about 1.5 × 0.95, wavy edge). It hides the field's rectangular edge and instantly reads as surgery.
- **Lamp:** visible in title and story. In the OR it's just warm light.
- **Lighting:** `HemisphereLight(0xffffff, 0x9aa6b0, 1.5)` and `DirectionalLight(0xfff2de, 1.9)` from upper right, shadow map 2048, `bias -0.0006`, `normalBias 0.03`. Tissue meshes: `receiveShadow` yes, `castShadow` no; otherwise you get wavy acne.
- Add a low-vitals lamp flicker, and red `danger` from the ink module.

### 9.3 Sites

Each site is a `heightAt(x, y)` sum of Gaussian lobes minus creases, plus two layers of fine sine relief (the relief is what breaks highlights into wet glints), a 1024² painted `CanvasTexture`, and an optional vertex motion. Use `PlaneGeometry(3.6, 2.5, 280, 200)` with `rotateX(-Math.PI / 2)`, `computeVertexNormals()` after displacement, and `positionNode = positionLocal.add(normalLocal.mul(uBeat.mul(0.03)))` for the squeeze.

| Site | Height idea | Base colors | Motion and detail |
|---|---|---|---|
| Forearm | One long ridge | `#E8B48F` skin, gash mesh | Slight tremor |
| Abdomen skin | Gentle dome | Skin, iodine-orange swab paint | Breathing |
| Bowel | Many tube-like folds | `#E87A8B` | Slow peristalsis |
| Liver | Two broad lobes, one crease | `#8E2A3A` | Slight squeeze |
| Stomach | One big dome with rugae lines | `#E9967A` | Churn |
| Brain | Gyri: sine folds warped by noise | `#E8A9B8`, blue vessels | Nearly still, makes the cuts scary |
| Heart | Big muscular dome, coronary ridges | `#C4364F`, branching veins | Strong beat |
| Lung | Two inflating lobes | `#F0A3A8` | Breath every 4 beats moves targets 0.05 fu |
| Aorta | One thick tube across the field | `#B52A3E` | Pulse wave down its length |

**Veins:** draw on the canvas with a recursive branching stroke, tapering width (5 lines of code; it looks great in the prototype).
**Wet glints** (verified): `emissiveNode` with hard `smoothstep` thresholds on `dot(normalView, H)` for two fixed view-space half-vectors (§16.6). Keep glints under about 8% of the area.
**Paint layer:** cuts, scorch marks, gel sheen, smears and stitches paint onto the same canvas, with `texture.needsUpdate = true` when changed (verified on both backends). For a 1024² canvas on that plane, field to canvas is `cx = (x + 1.8) / 3.6 × 1024`, `cy = (1.25 - y) / 2.5 × 1024`.
**Scanner:** a world-space circle in the site material's `colorNode`, replacing the surface with cyan-on-navy hatching inside `scannerRadius` (verified).
**Stave lines:** when a strain is present, five dark lines ink themselves across the organ, drawn on the paint layer, with little note-marks riding them.

### 9.4 Instruments

Each is a small hierarchy of named meshes with `use` animation clips, tilted toward the lower right so it never hides the target, with a springy swing as it moves and a contact shadow. No hands.

Scalpel, Forceps (two jaws), Suction wand (hose as a tube), Gel nozzle (foam blobs), Needle driver with curved needle and thread, Laser pen (additive beam, ember at the tip), Scanner puck (with a sweeping ring), Clamp (ratcheting jaws, stays on the bleeder), Syringe (plunger moves), Defib paddles (a pair, sliding in from each side).

Co-op: each seat's tip has a ring in the seat color and a floating name (DOM, `textContent`).

### 9.5 Story staging

- 16:9 stage with a bottom dialogue box and name tag in the character's color.
- Camera: `PerspectiveCamera(30, aspect, 0.1, 60)` at about `(0, 0.2, 12.5)`, busts at about x = ±2.1. Slow dolly. Punch-in plus `speedLines` for shouts (§16.5; it looks exactly like manga).
- **Five sets** built from boxes and props, inked by the filter: OR 3 and gallery; corridor with rain on the windows; Ward Zero (green tile, pipes); Pip's lab; hospital roof in rain. Bell's office and the boardroom can reuse the corridor shell with new props.
- Text types out in sync with gibberish voice (§11). Transitions are an ink-wipe across the screen.
- **Cut-ins:** at big moments, a tilted panel with thick white border shows a close-up of a bust and a comic SFX word ("KA-THUMP!", "FLATLINE!"). Panels are 3D planes parented to the camera, textured from a `RenderTarget` of the bust (verified per-frame on both backends), so the ink pass lines them like everything else. **A render target shows upside down on a plain plane unless you flip the plane's UVs** (§16.6).

### 9.6 Character busts (these numbers were rendered at 1080p)

Build each from one parametric function in `src/view/bust.js`. This reads as a cartoon anime face in the ink filter. It's a good base, not a finish, so spend time on hair and clothes. In the prototype, narrower shoulders looked like a bobblehead, and simple chin tapers gave either a ball or a point.

- **Head:** `SphereGeometry(1, 64, 48)`, then reshape vertices. For `y < 0`, with `t = -y` and `jaw = t > 0.25 ? ((t - 0.25) / 0.75) ** 1.4 : 0`: `x *= 1 - 0.1 * t - 0.42 * jaw`, `z *= 1 - 0.12 * t`, `z += 0.05 * t * t`, `y *= 1 + 0.16 * t`. Then `z *= 0.94` everywhere. `computeVertexNormals()`.
- **Face:** a 1024×512 canvas as the head's `map`. On the default sphere UV, the face is centered at x = 256 (u = 0.25 faces +z). Eyes at y about 232, ±62 from center: white ellipse, gradient iris, pupil, two white highlights, a thick upper lash line. Brows above, a tick of a nose, cheek blush, then the mouth at y about 340. **Expressions redraw the canvas:** states for eyes (neutral, wide, narrow, closed, sad), brows (y and tilt), mouth (6 shapes for talk flaps), plus sweat and tears.
- **Hair:** a cap (`SphereGeometry(1.06…)` top, forehead edge clamped to a jagged line), a back mass, then 15 to 30 tapered cone locks. This is what makes silhouettes distinct. Use plenty of locks.
- **Body:** neck `CylinderGeometry(0.36, 0.44, 0.7, 20)` at `y = -1.18`. Torso `LatheGeometry` through the (radius, height) points (0.34, 0.9), (0.55, 0.82), (1.5, 0.52), (1.95, 0.05), (2.08, -0.8), (2.1, -2.2), placed at `y = -2.08` with z scale 0.62. V-neck, lapels, stethoscope, bow tie and cardigan as simple add-ons. Crop at the chest with the camera.
- **Portrait inset:** render the speaker's bust to a 256² `RenderTarget`, shown on a camera-parented plane with flipped UVs (§16.6).

Patients use the same function with varied hair, skin, age lines and clothes.

### 9.7 Effects, and the juice list

Use `InstancedMesh` for particles (per-instance color verified). Particles and thread live in a small cosmetic Rapier world on the view side.

These are not optional; they are what makes it feel great:

- Hit-stop of 60 to 90 ms on FLAWLESS.
- Forceps: tissue stretches, then a pop, the item arcs, lands and clinks onto the growing tray pile.
- Grade lettering stamps in at the tip with an ink splat.
- Hush: 0.4 s freeze, inhale sound, wash expanding from the tip via `hushRadius`; on exit, color floods back with a cymbal swell.
- Fermata: real silence. On Defib: white `flash`, and music slams back on the downbeat.
- Strain entrance: stave lines ink in, then the dictionary card.
- Scrub-in at op start: glove snap, lamp clunk, Bea's line. Rank stamp: a physical 3D stamp, thud, ink, camera kick.
- Danger: lamp flicker, line boil rising with `danger`, ECG beeps climbing in pitch.
- Suture thread (Rapier rope) whips and pulls tight. Clamp ratchet. Laser ember and smoke. Gel foam fizz. Blood droplets arc into the suction nozzle.

---

## 10. Animation

Use the native system as the base: `AnimationMixer`, `AnimationClip`, keyframe tracks built in code, and `SkinnedMesh` with `Bone` where bodies bend (toon skinning with a mixer is verified on both backends). Don't hand-roll transform tweens where a clip will do; use code only for continuous motion that follows sim values.

| Group | Clips to make |
|---|---|
| Busts | `idle` (breathing), `nod`, `shake`, `shock` (jump back), `lean`, `sigh`, `bow`, `slump`, `collapse` (Bea, Bell) |
| Face (driven by code, not clips) | Blink timer, talk flaps from voice syllables, expression redraws |
| Instruments | Scalpel press, forceps pinch, suction throb, gel squeeze, needle stitch, laser recoil, scanner sweep, clamp ratchet, syringe plunge, paddles slide-in, charge, slam |
| Strains (skinned) | Adagio `crawl` and `bite`, Tremolo `shiver` and `flee`, Legato `slither` and `jerk`, Crescendo `swell`, Fermata `open` and `close`, Coda `conduct`, `downbeat`, `cue`, `rest` |
| Organs | Tumor twitch, flap open, lung breath (uniform-driven, clip-timed) |
| Props and UI 3D | Lamp swing, rank stamp slam, clipboard drop, envelope slide, cut-in panel slide |

Time strain clips to the beat clock: set `action.timeScale` from `bpm` so a bar-long clip always lasts one bar.

---

## 11. Audio

Everything is synthesized in code with Web Audio. No audio files of any kind.

**Graph:** `music`, `sfx` and `voice` buses into a master with a gentle limiter. **Music bus default gain is exactly 0.10**, shown as "Music 10%" in Settings. Effects and Voices default to 80%. Write every instrument as a function of `(ctx, destination, time, …)` so the same code runs on `OfflineAudioContext` for tests (verified to render).

**Unlocking:** create the context on boot, and call `resume()` on every keydown, pointerdown and pad press until it runs. Gamepad presses aren't user activation in browser specs, so a pad-only player may stay silent until the browser allows it. If the context is still suspended after a pad press, show a small "Press any key or click for sound" note on the Title, and keep trying. Playwright's Chromium here starts contexts running without a gesture, so tests can't prove this path. Note that honestly in your testing feedback.

### Music

A step sequencer with a lookahead scheduler (schedule 120 ms ahead on `ctx.currentTime`). Tempo follows the sim's `bpm`; each quarter note lands on a `beat`. Instruments from oscillators, FM, filters and noise: cello-ish saw, pizzicato pluck, electric piano, choir pad, organ (additive), heartbeat kick, soft hats. Music must be written by you. The one quotation: the first phrase of the medieval plainchant **Dies Irae** (public domain; F E F D E C D D) as Voss's signature. Pip: "That's the Dies Irae. The Mass for the Dead. She's *signing* them."

| Track | Character |
|---|---|
| Title | Slow electric piano over the heartbeat kick; Dies Irae hinted in the bass |
| Story: calm, comic, tense, sad, villain | Short loops; scene data picks one |
| OR base | Pulsing minor-key bass that tightens as bpm rises; layers enter with phases |
| Strain layers | Per §5, added on top of OR base while that strain lives |
| Hush | Low-pass sweep down to about 300 Hz on the music bus, then only heartbeat and one held pad |
| Fermata | Everything cut; one held organ chord swelling under the flatline tone |
| Coda | All strain motifs in counterpoint over organ Dies Irae |
| Credits | The Title theme opened out, major-key ending |

### Sound effects (all procedural)

Heartbeat double thump (pitch-dropping sine), ECG beep, flatline tone, scalpel slice (filtered noise sweep), forceps click, pop, glass clink (inharmonic partials), suction gurgle, gel spray, stitch tick, thread zip, laser buzz (pitch follows power), scanner ping, clamp ratchet, syringe hiss, defib whine and thump, strain chitter and screech, scratch tear, stamp thud, UI move/confirm/back, rain, gallery murmur, door, phone ring, alarm. Rain ambience in story scenes outdoors or at windows.

### Voices

Animalese/Simlish gibberish, driven by the actual text so a line always sounds the same. Split text into syllable chunks of 2 to 3 letters. Each chunk schedules a blip of about 70 ms: a sawtooth through two bandpass filters, F1/F2 from the chunk's vowel (a: 730/1090, e: 530/1840, i: 270/2290, o: 570/840, u: 300/870), attack-decay envelope, plus a short noise burst for hard consonants. Pitch rises on "?", falls on ".", louder and higher on "!". Trigger mouth flaps from each blip.

| Voice | Base pitch | Rate | Color |
|---|---|---|---|
| Ren | 190 Hz | Fast | Light, wavers when nervous |
| Bea | 130 Hz | Slow | Warm, low formants |
| Bell | 85 Hz | Medium | Booming, slight chorus |
| Pip | 280 Hz | Very fast | Bright, bouncy pitch |
| Sorrento | 110 Hz | Medium | Monotone, no contour |
| Ines | 150 Hz | Medium, clipped | Short blips, hard stops |
| Voss | 120 Hz | Slow | Breathy noise blended with organ harmonics |
| Patients | Varied by seed | Varied | Varied |

In the OR, barks use the same voices, ducked so they sit under the alarm sounds.

---

## 12. Attract mode

- **Trigger:** 10 s with no input on the Title, Main Menu or Free Play screens, and on the Touch notice. Reading screens (Settings, About, Lobby, Pause, Dev) don't trigger it. Use wall-clock time, so it's unaffected by slow rendering.
- **What it is:** the real game, driven by the bot (§15.5) with cheats on: vitals locked, timers frozen, Composure always full, free phase jumps. A corner "DEMO" mark and a pulsing "Press any button".
- **Loop (about 3 minutes):** a story snippet (Bea and Ren, S1 lines) → Op 1 shards and stitching → Op 2 incision and clamps → the Hush moment → Adagio laser and forceps → Staccato swarm → Tremolo → Legato with Sforzando → Crescendo and a Fermata Defib → Coda with site switching → rank stamp → logo → repeat.
- **Exit:** any input of any kind (key, mouse move or click, pad, tap) returns to the screen it came from, at once. It writes no saves and changes no settings. On a first visit it plays silently until the browser unlocks audio, which is expected.

---

## 13. Dev mode

Reachable from the pause menu in Story and Free Play. Hidden in hub sessions.

**Standard tools** (each a big button, grouped in pages):

- Jump to any operation and phase; unlock everything; play any story scene.
- Complete objective; complete phase; win operation; fail operation; force any rank report.
- God mode (lock vitals); freeze timer; infinite Composure; infinite clamps.
- Trigger: bleeder at tip, spawn any strain at tip, arrest, Fortissimo, Hush, Sforzando.
- Time scale 0.1× to 4×; single-step when paused.
- Auto Surgeon: bot takes over (watch it play).
- Overlays: colliders and field grid, targets and tolerances, beat clock, frame time and backend name, input monitor (pad buttons and axes live).
- Render toggles: ink lines, halftone, line boil, shadows.

**Live sliders** with immediate effect, showing the current value and a default tick. **Reset to defaults** on every page, and one that resets all. These are the only source of truth for the values used throughout this plan (`src/config/tuning.js`):

| Page | ID | Default | Range | Meaning |
|---|---|---|---|---|
| Hands | `tipSpeed` | 1.9 | 0.8–3.5 | fu/s at full stick |
| | `stickCurve` | 1.7 | 1–3 | Stick response exponent |
| | `aimAssist` | 0.35 | 0–1 | Pull toward guides |
| | `steadyFactor` | 0.4 | 0.2–0.8 | Speed while Steady |
| Tools | `scalpelTol` | 0.055 | 0.02–0.12 | Cut tolerance (fu) |
| | `pullTol` | 1.6 | 0.6–3 | Max forceps pull speed |
| | `suctionRate` | 1.0 | 0.3–3 | Volume/s |
| | `gelRadius` | 0.16 | 0.08–0.3 | Gel brush (fu) |
| | `stitchGateR` | 0.07 | 0.03–0.15 | Gate radius (fu) |
| | `laserDps` | 30 | 10–80 | HP/s at full power |
| | `laserBurn` | 2 | 0–6 | Vitals/s on bare tissue |
| | `scannerRadius` | 0.3 | 0.15–0.5 | Reveal circle (fu) |
| | `clampWindow` | 0.18 | 0.06–0.4 | Seconds around a beat |
| | `defibWindow` | 0.30 | 0.1–0.6 | Gold band width (s) |
| Patient | `drainMult` | 1 | 0–3 | All vitals drains |
| | `timerMult` | 1 | 0.5–2 | All timers |
| | `tempoPressure` | 60 | 0–120 | bpm added at 0 vitals |
| | `stabilizerHeal` | 15 | 5–30 | Vitals per dose |
| | `stabilizerCooldown` | 3 | 0.5–8 | Seconds |
| | `missLimit` | 8 | 3–20 | Misses before failure |
| Strains | `strainHpMult` | 1 | 0.3–3 | HP |
| | `strainSpeedMult` | 1 | 0.3–2.5 | Movement |
| | `spawnRateMult` | 1 | 0.3–2.5 | Notes, scratches, feeders |
| Gifts | `composureGain` | 1 | 0.2–3 | Meter gain |
| | `hushDuration` | 7 | 2–15 | Seconds |
| | `hushTimeScale` | 0.25 | 0.05–0.7 | World speed during Hush |
| | `sforzandoStun` | 3 | 1–6 | Stun seconds |
| | `sforzandoDamage` | 0.25 | 0.05–0.6 | Fraction of current HP |
| | `sforzandoToolMult` | 2 | 1.2–4 | Tool power |
| | `sforzandoDuration` | 6 | 2–12 | Seconds |

---

## 14. Multiplayer

Read the protocol in full, it's short: https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/README.md (Protocol v1, client 1.4.0 when checked).

### 14.1 The decision

**Mode: `shared-world`, seats 1–4, own card.** Surgery together on one patient is the best version of this game: one heart, shared vitals, each surgeon with their own tip and tool. A surgical team splitting between sites, wordlessly, is exactly the drama the source's tone wants. A session round is **Grand Rounds** (§6).

Your brief also says to follow the protocol "for the game on its own". In the hub's own check, "on its own" means the page opened outside a session, so that's what we mean too: a normal game with Story and everything else. For multiplayer on its own, Grand Rounds is **couch co-op** for 1 to 4 people on one screen (§14.5). There's no internet play outside the hub, so there's nothing to host or sign into.

Because `AIHub.connect` resolves to `null` immediately when there's no hub, the boot is:

```js
const info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true });
if (info) startSession(info); else startStandalone();
```

### 14.2 Rules that apply in a session (`AIHub.active`)

- Straight into the round: no title, menus, attract, story, dev mode or saves. Pause (Options or Esc) opens only a Settings overlay, over the running game. The sim never pauses.
- Network only through the hub. No chat, emotes or custom names. Show hub names with `textContent` only. Seat color from `info.players[i].color`.
- No `alert`, `confirm`, `prompt`, `window.open` or navigation. Quit and restart do nothing.
- Ignore Options while Create (button 8) is held: that chord is the hub's.
- If graphics fail, `AIHub.fail(message)`.

### 14.3 Authority and messages (the tested pattern)

The host's copy runs the only `Sim`, including Rapier. Everyone else renders snapshots. The host's view reads the sim directly; a client reads its decoded state, with entities and other seats interpolated 100 to 150 ms behind. **Your own tip is always local and instant**, and tool sounds and cosmetic trails start locally. Grades and results come from the host.

If `info.server` is true, the host has no player: no view, no audio, no input, seats from `info.players`, same `Sim`.

| Msg | Direction | Transport | Rate | Contents |
|---|---|---|---|---|
| `i` | client → host | unreliable | 12/s | Tip x, y, tool, use, steady, site, sequence number |
| `a` | client → host | reliable | up to 3/s | Discrete presses: syringe, special, alt, site change |
| `s` | host → all | unreliable | 10/s | Tick, beat, vitals, timer, tips, moving entities. **Max 1,100 bytes**: larger unreliable messages fragment and are lost whole |
| `k` | host → all | reliable | 1/s | Full keyframe, under 16 KB |
| `e` | host → all | reliable | up to 5/s | Batched events: grades, pops, barks, phase changes |

Keep each copy to at most 16 messages/s (the limit is 20, burst 40) with one token-bucket `send()` wrapper that sheds `s` and `i` first. **Any console line starting `[AIHub]` fails the hub's check**, including rate and size warnings, and `finish` called from a non-host. Drop snapshots older than the newest applied. Clients send `i` even when idle, as the harness needs traffic both ways.

**Run the host tick on `setTimeout`, never on `requestAnimationFrame`:** it must keep ticking with no view (server copy), and at software-rendering frame rates.

```js
// src/app/session.js, the shape of the skeleton that passed every harness scenario
export async function startSession(info) {
  await RAPIER.init();
  const view = info.server ? null : await createView();    // on failure: AIHub.fail(...)
  const sim = info.isHost ? new Sim({ op: GRAND_ROUNDS, players: info.players, rng: AIHub.rng('world') }) : null;
  AIHub.on('card', showCard);
  AIHub.on('start', beginCountdown);                       // AIHub.time(): -3000..0, then play
  AIHub.on('message', (data, from) => {
    if (sim && (data.t === 'i' || data.t === 'a')) sim.input(from, data);
    else if (from === info.host) view?.applySnapshot(data);
  });
  AIHub.on('leave', ({ id }) => sim?.leave(id));           // release what they held, drop their tip
  AIHub.on('time-up', () => { if (sim) finish(); });       // within graceMs; a non-host calling finish() warns, and fails the check
  let ended = false;
  AIHub.on('end', () => { ended = true; stopEverything(); }); // no input, no sends, audio suspended
  AIHub.ready();                                           // no key press; don't wait for a first frame
  let last = performance.now(), acc = 0;
  (function pump() {
    if (ended) return;
    const now = performance.now(), dt = Math.min((now - last) / 1000, 0.25); last = now;
    if (AIHub.time() >= 0) {
      if (!info.server) readLocalInput(dt);                // host: straight into sim.input(AIHub.me, …). Client: kept for sending
      if (sim) { acc += dt; while (acc >= 1 / 60) { sim.step(); acc -= 1 / 60; } sendSnapshotsOnSchedule(); }
      else sendInputOnSchedule();
    }
    setTimeout(pump, 16);
  })();
}
```

**`finish()`** (host, once, on operation end or `time-up`): `standings` as groups of ids, best contribution first, listing every present player; `scores`; `won` (patient alive and operation complete); `stats` (up to 6 entries per player, names up to 16 chars: Cuts, Stitches, Burns, Saves, Accuracy); `awards` (title up to 24 chars, detail up to 40: "Steadiest Hands", "Last-Second Shock"). If the operation hasn't ended at `time-up`, `won` is false.

A client leaving must not break the round. The host leaving voids it, which the hub handles: show a short message on `end` and stop.

### 14.4 The card

Own card, in the game's world: OR 3, lamp on, the seat's busts or tips lining up, Title music. It shows the game's name, players in their colors with ready states, how to win, this player's controls, and seconds left from the `card` event. Enter, Cross (button 0) or a click on Ready: `AIHub.answer('ready')`. Triangle (button 3), M, or a click on More Time: `AIHub.answer('more')`. Nothing on the card changes the round, and there are no menus. Show a 3-2-1 countdown from `AIHub.time()`. The harness sends synthetic keys whose `code` equals `key` (`'Enter'`, `'a'`, `'ArrowLeft'`), so read `e.key` as well as `e.code`.

### 14.5 Couch co-op (on its own)

Main Menu → Grand Rounds → Lobby: four seat cards. Each pad, plus keyboard-and-mouse, can claim a seat by pressing confirm. Seat 1 starts when ready. Same `Sim`, multiple input frames, one screen and camera. Any seat's L1/R1 moves the shared site, with a 0.8 s cooldown. Same seat colors. Seats 1 and 3 have the Hush; seats 2 and 4, Sforzando. (Same in sessions; Hush slows the world for everyone.) On a team result the report shows each seat's stats and awards.

### 14.6 Head tags

Exact attribute order, `name` then `content`: the hub reads them with a regex. Content must contain no quote characters.

```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="6">
<meta name="hub:session-goal" content="Keep the patient alive and finish the operation together">
<meta name="hub:session-howto" content="Aim: right stick or mouse · use: R2 or click · tools: left stick or 1-8">
```

Do **not** add `hub:webgpu=required`: the game runs on WebGL2 too (verified). Also add the catalogue tags: `<title>Your Title — Your Tagline</title>` (the hub splits on the dash), `<meta name="description">`, `<meta name="theme-color" content="#17707A">`, `<link rel="icon" href="data:…">` (an inked heart SVG), `<meta name="hub:type" content="Game">`, `<meta name="hub:players" content="1–4">`, `<meta name="hub:source" content="Trauma Center: Second Opinion">`.

### 14.7 What the hub's own check does

These are all reproduced in §17: it plays shared worlds at 2, 3 and 4 players at 150 ± 50 ms and 5% loss, with a player leaving; `scenario=host-leave`; `scenario=server` at 2 players. It checks the client is exactly one unmodified copy (SHA-256, §16.2). Then, on its own: opens the page, presses Enter, Space, Enter, Space, checks that nothing threw, `AIHub.active` is false, `Math.random` is untouched, and the screenshot isn't blank.

---

## 15. Architecture

### 15.1 Layout

```
package.json            "type": "module" (Node must import src/sim/*.js as ES modules)
.gitignore              node_modules/, dist/
docs/AUTHORING.md       how to add an operation, a strain, a story scene, a tuning value
tools/build.mjs         §16.2
tools/vendor/session.js the hub client, verbatim
src/main.js             the boot branch in §14.1
src/config/             identity.js (title, tagline), tuning.js (§13)
src/data/               ops/*.js, story/*.js, cast.js, sites.js, about.json. Data only, no logic
src/sim/                NO three, NO DOM, NO audio. sim.js, beat.js, scoring.js, physics.js,
                        tools/*.js, strains/*.js, ops-runner.js, snapshot.js, bot.js
src/view/               renderer.js, ink.js, field.js, paint.js, tip.js, instruments/*.js,
                        strains/*.js, bust.js, stage.js, fx.js, cutin.js, camera.js
src/audio/              engine.js, music.js, sfx.js, voice.js
src/input/              input.js (pads, keyboard, mouse → per-seat input frames), glyphs.js
src/ui/                 ui.css, focus.js, hud.js, ecg.js, screens/*.js
src/app/                director.js (screen state machine), story.js, attract.js, dev.js,
                        coop.js, session.js, save.js
tests/                  run-all.mjs, sim/, browser/, hub/ (§17)
```

### 15.2 Sim and view

`Sim` takes seats and per-seat `InputFrame`s (`{x, y, tool, use, steady, alt, syringe, special, site, swap}`), steps at a fixed 1/60 s, and exposes plain JSON-friendly `state` plus an `events` array drained each frame. It has no idea whether anyone is watching.

The view reconciles meshes against `state` by entity id, and turns `events` into particles, paint, sounds and barks. It runs from `sim.state` in solo and couch play, and from decoded snapshots on a hub client: the same code either way. That single decision makes the Node tests, the bot, attract mode, the server copy and co-op all cheap.

- All randomness in the sim comes from a seeded generator passed in. `Math.random` is banned from `src/sim` by a test.
- Rapier gave bit-identical results in Node, Chromium, Firefox and WebKit in our test (same 16-digit positions after 1,200 steps). Trust determinism: same seed plus same inputs means same state.
- Physics runs on the sim side in the flat field space (§3.1). Create a new world per operation and call `world.free()` when done. Don't mutate the world during `step()`; collect, then apply.
- Saves (`src/app/save.js`): progress, best ranks and settings in `localStorage`, wrapped in try/catch. In a session the game saves nothing.

### 15.3 Operations are data

Everything needed to add an operation is a data file. This is the "normal designer tools" foundation, along with the tuning table and dev mode. A full example:

```js
// src/data/ops/broken-glass.js
export default {
  id: 'broken-glass', chapter: 1, title: 'Broken Glass', doctor: 'ren', scene: { before: 'S1', after: 'S2' },
  patient: { name: 'Desmond Pell', age: 52, job: 'Taxi driver', note: 'Has never once used a turn signal.',
             followUp: 'Discharged Tuesday. Was seen signaling, once, leaving the car park.', bust: { /* §9.6 params */ } },
  timer: 240, bpm: 72, parScore: 6000, music: 'or-calm', teaches: ['gel', 'forceps', 'suction', 'syringe', 'scanner', 'suture'],
  sites: [{ id: 'arm', organ: 'forearm' }],
  phases: [
    { id: 'clean', objective: 'Disinfect the wound', tools: ['gel'],
      spawn: [{ kind: 'gelZone', site: 'arm', rect: [-0.6, -0.25, 0.6, 0.25], parTime: 8 }],
      done: { cleared: ['gelZone'] },
      say: [{ at: 0, who: 'bea', mood: 'stern', text: 'Gel first, child. Everything in a taxi is filthy, and so are you.' }] },
    { id: 'glass', objective: 'Pull the glass and drain the wound', tools: ['forceps', 'suction'],
      spawn: [{ kind: 'shard', site: 'arm', at: [-0.5, 0.1], axis: 30, embed: 0.2 }, /* three more */],
      on: [{ when: { removed: 'shard' }, do: [{ spawn: { kind: 'pool', at: 'lastRemoved', vol: 0.4 } }] }],
      done: { cleared: ['shard', 'pool'] } },
    { id: 'dip', objective: 'Stabilize the patient', tools: ['syringe'],
      begin: [{ vitals: -25 }, { lockFail: true }],
      done: { vitalsAbove: 70 } },
    // ... scanner phase, suture phase, final gel
  ],
};
```

Triggers: `at` (seconds into phase), `when` (`removed`, `vitalsBelow`, `beat`, `bar`, `phaseTime`). Actions: `spawn`, `say`, `vitals`, `drain`, `event` (`arrest`, `fortissimo`), `cutIn`, `music`, `composure`, `wipeToSite`. Completion: `cleared`, `vitalsAbove`, `allClampsOff`, `strainDead`, `arrestsSurvived`.

### 15.4 Observable state and test hooks

`window.__game` always exists:

- `state()` returns `{ screen, op, phase, vitals, timer, score, rank, bpm, beat, site, tool, tips, focusId, promptSet, glyphSet, attract, devOpen, renderBackend, musicGain, tuning, reached: [...] }`.
- With `?test=1`: `test.step(n)` (advance the sim n steps synchronously), `test.warp(n)` (n sim steps per frame), `test.input(frame)` (override seat 0's input), `test.bot(on, opts)`, `test.skipTo(op, phase)`, `test.hash()` (hash of sim state).
- `?norender=1` skips drawing for fast UI-flow tests. `?webgl=1` forces the WebGL2 backend.

### 15.5 The bot

`src/sim/bot.js`: `botInput(sim, seat, { noise, reactionDelay, cheat })` returns an `InputFrame`, using only `sim.state`. It has a small behavior for each entity kind, and a priority list: stabilize below 40 vitals → defib if arrested → fire the gift when ready and vitals under 50 → clamp bleeders → objective targets in order. For hidden things it sweeps the Scanner in a raster pattern. It respects tip speed and tolerances, so its results mean something. It powers the playthrough tests, attract mode and dev mode's Auto Surgeon.

---

## 16. Verified recipes and traps

All run here on 2026-11-04: Chromium 153 under Playwright 1.63.0, Three.js 0.180.0, Rapier 0.19.3. A skeleton with this stack (a toon scene, Rapier on the host, its own card, snapshots at 10/s with a 1/s keyframe, input at 12/s) passed the hub's harness on WebGPU at 2 players, 4 players on a bad network with one leaving, host-leave and server scenarios. The 4-player run also passed without WebGPU, on the WebGL2 fallback. The skeleton's scene was small: your real game will take longer in these runs, so allow for it.

### 16.1 Packages

```bash
npm install three@0.180.0 @dimforge/rapier3d-compat@0.19.3 esbuild@0.28.2 playwright@1.63.0 @fontsource/bangers @fontsource/barlow-condensed
curl -fsSL https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/session.js -o tools/vendor/session.js
mkdir -p tests/hub/site && for f in harness.html bridge.js round.js; do curl -fsSL https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/$f -o tests/hub/site/$f; done
```

npm warns about install scripts; esbuild works anyway. Don't run `playwright install`: the browsers are already here. Fonts: **Barlow Condensed** (500/600/700) for UI and dialogue, **Bangers** for comic lettering (both OFL; credit them on the About screen; about 22 KB each).

### 16.2 The build

The recipe below produced a working single file on `file://` with fonts loaded, `$&` and `</script>` intact, and the client hash right. Bundle size with both engines: about 3 MB.

```js
// tools/build.mjs
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const THREE_WEBGPU = path.resolve('node_modules/three/build/three.webgpu.js');
// esbuild's `alias` matches by prefix, so three -> three/webgpu breaks every subpath. Resolve the exact name.
const oneThree = { name: 'one-three', setup(b) { b.onResolve({ filter: /^three$/ }, () => ({ path: THREE_WEBGPU })); } };
const shared = { bundle: true, minify: true, write: false, legalComments: 'none', logLevel: 'error', target: 'es2022' };
const js = (await build({ ...shared, entryPoints: ['src/main.js'], format: 'esm', platform: 'browser', plugins: [oneThree] })).outputFiles[0].text;
const css = (await build({ ...shared, entryPoints: ['src/ui/ui.css'], loader: { '.woff2': 'dataurl' } })).outputFiles[0].text;
const { GAME_TITLE, TAGLINE } = await import(path.resolve('src/config/identity.js'));
const client = readFileSync('tools/vendor/session.js', 'utf8').replace(/\r\n/g, '\n').trimEnd();
const about = readFileSync('src/data/about.json', 'utf8');
const noCloser = (s) => s.replace(/<\/(script)/gi, '<\\/$1');
// Join an array. Never String.replace with the bundle as the replacement: $& in minified code corrupts it.
const html = ['<!doctype html>', '<html lang="en">', '<head>', '<meta charset="utf-8">',
  '<script>', client, '</script>',                     // first script, right after charset, byte-exact
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  /* <title>, hub tags and catalogue tags from §14.6 */
  '<style>', css, '</style>', '</head>', '<body>',
  '<script type="application/json" id="about-data">', noCloser(about), '</script>',
  '<script type="module">', noCloser(js), '</script>', '</body>', '</html>'].join('\n');
mkdirSync('dist', { recursive: true });
writeFileSync('dist/game.html', html);
```

CSS fonts: `@font-face { font-family: 'Bangers'; src: url('@fontsource/bangers/files/bangers-latin-400-normal.woff2') format('woff2'); }` resolves through `node_modules` and inlines as a data URL. Import from `three/webgpu` and `three/tsl` only (never bare `three` in your own code). Add a last step that copies `dist/game.html` to the root file your brief names.

**Client check:** the text from the banner `/*! aihub-session ` through the line `})(typeof window !== 'undefined' ? window : globalThis);`, with LF endings, must hash to the released SHA-256: for 1.4.0, `529eac78c54cfff0e60d375a9c63f66d1a594327ddcc262a2bdf9b1f2fb6582a`. If the downloaded client is newer, its hash is in `RELEASES` at https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/scripts/lib/hub-client.mjs. The banner string must appear exactly once in the whole file, so don't quote it in a comment or test string that gets bundled.

### 16.3 Browser flags for headless WebGPU

**Use these five flags.** Your brief's machine notes list a shorter set (`--enable-unsafe-webgpu --enable-features=Vulkan --use-webgpu-adapter=swiftshader`). On this computer, those alone **lose the device right after the first frame** (console: "A valid external Instance reference no longer exists"), which is why a screenshot comes out blank. With the hub's flags, frames draw, `page.screenshot` works, and pixel readback works:

```js
const GPU = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-webgpu-adapter=swiftshader', '--use-angle=swiftshader'];
```

- Software rendering is slow: 260 to 410 ms per frame at 960×540. Don't wait on frames in tests. Use `test.step`, `test.warp` and `?norender=1`.
- With no flags, Chromium has no adapter, and `WebGPURenderer` falls back to WebGL2 by itself (verified, and the whole look works there). Test both.
- WebKit via Playwright runs WebGL2 fine. **Headless Firefox refused WebGL2 here** ("AllowWebgl2:false"), with the preferences we tried. Test with Chromium and WebKit, and don't chase this. The game must show a friendly no-graphics screen rather than crash.
- A server for the harness: use an in-process Node `http.createServer` on `listen(0, '127.0.0.1')` and read `server.address().port`. It's simpler than `python3 -m http.server`, whose output is **buffered when piped, so the port line never arrives**; and it has no child process to clean up. Check the page is yours (`__game` exists) before trusting a result.
- `node tests/...` with `playwright@1.63.0` finds the already-downloaded browsers, given `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE` from your environment.

### 16.4 Renderer boot

```js
import * as THREE from 'three/webgpu';
const renderer = new THREE.WebGPURenderer({ antialias: false, forceWebGL: params.get('webgl') === '1' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.onDeviceLost = onDeviceLost;   // session: AIHub.fail(...). Otherwise a message and reload with ?webgl=1, progress saved
await renderer.init();                  // throws if neither backend works: show the no-graphics screen
const backend = renderer.backend.isWebGPUBackend ? 'webgpu' : 'webgl2';
// loop: never overlap frames
const frame = async () => { update(); await ink.post.renderAsync(); requestAnimationFrame(frame); };
```

`RAPIER.init()` logs one harmless "deprecated parameters" warning; ignore it.

### 16.5 The ink filter (run exactly as written, on both backends)

```js
// src/view/ink.js
import * as THREE from 'three/webgpu';
import { pass, mrt, output, normalView, uniform, uv, vec2, vec3, vec4, float, Fn, screenSize, luminance, smoothstep, mix, step, atan, fract, floor, max, abs, length, time, perspectiveDepthToViewZ, renderOutput, mx_noise_float } from 'three/tsl';
import { fxaa } from 'three/addons/tsl/display/FXAANode.js';

export function createInk(renderer, scene, camera) {
  const u = {
    line: uniform(2.0),            // line half-width in px at 1080p
    lineOn: uniform(1),            // dev toggle
    toneOn: uniform(1),            // dev toggle: halftone + hatching
    danger: uniform(0),            // 0..1: line boil and red vignette, driven by low vitals
    hushRadius: uniform(0),        // 0 = off; grow past 1.6 to cover the screen
    hushCenter: uniform(new THREE.Vector2(0.5, 0.5)), // the tip, in screen uv
    speedLines: uniform(0),        // 0..1 for shouts and cut-ins
    flash: uniform(0),             // 0..1 white flash for defib and stamps
  };
  const sp = pass(scene, camera);
  sp.setMRT(mrt({ output, normal: normalView.mul(0.5).add(0.5) }));
  const colorTex = sp.getTextureNode('output'), normalTex = sp.getTextureNode('normal'), depthTex = sp.getTextureNode('depth');
  const near = float(camera.near), far = float(camera.far);
  const viewZ = (p) => perspectiveDepthToViewZ(depthTex.sample(p).r, near, far);

  const graph = Fn(() => {
    const px = vec2(1).div(screenSize), k = screenSize.y.div(1080), aspect = screenSize.x.div(screenSize.y);
    const tick = floor(time.mul(8));                        // the line "boils" at 8 fps
    const wob = vec2(mx_noise_float(uv().mul(vec2(32, 18)).add(tick.mul(3.7))), mx_noise_float(uv().mul(vec2(18, 32)).add(tick.mul(5.1))))
      .mul(u.danger.mul(3.5).add(1.1)).mul(k).mul(px);
    const p = uv().add(wob);
    const off = uv().sub(u.hushCenter).mul(vec2(aspect, 1));
    const hush = smoothstep(u.hushRadius, u.hushRadius.sub(0.12), length(off)).mul(step(0.001, u.hushRadius));
    const o = px.mul(u.line.add(hush.mul(1.5))).mul(k);

    // ink: normal and depth discontinuities, over 8 neighbours
    const n0 = normalTex.sample(p).xyz, z0 = viewZ(p);
    let edge = float(0);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const q = p.add(o.mul(vec2(dx, dy)));
      edge = max(edge, max(smoothstep(0.3, 0.75, length(normalTex.sample(q).xyz.sub(n0))), smoothstep(0.015, 0.06, abs(viewZ(q).sub(z0)))));
    }
    const base = colorTex.rgb.toVar();
    const lum = luminance(base);

    // manga tone: dots in the shadow band, hatching in the deepest band
    const dots = step(length(fract(uv().mul(screenSize).div(k.mul(7))).sub(0.5)), float(0.36)).mul(smoothstep(0.42, 0.3, lum));
    const sc = uv().mul(screenSize);
    const hatch = step(0.62, fract(sc.x.add(sc.y).div(k.mul(8)))).mul(smoothstep(0.2, 0.1, lum));
    let col = mix(base, mix(base.mul(0.74), base.mul(0.55), hatch.mul(0.6)), max(dots.mul(0.55), hatch.mul(0.6)).mul(u.toneOn));
    col = col.add(mx_noise_float(sc.mul(0.7)).mul(0.018));   // paper grain

    // Hush: sumi-e wash; red is the only colour left
    const red = smoothstep(0.1, 0.32, base.r.sub(max(base.g, base.b)));
    const wash = vec3(0.93, 0.91, 0.86).mul(smoothstep(0.08, 0.72, lum));
    col = mix(col, mix(wash, base.mul(vec3(1.25, 0.8, 0.8)), red), hush);

    // danger vignette
    col = mix(col, vec3(0.75, 0.06, 0.08), smoothstep(0.55, 1.05, length(uv().sub(0.5)).mul(1.5)).mul(u.danger).mul(0.8));

    // speed lines
    const c = uv().sub(0.5).mul(vec2(aspect, 1));
    const rays = step(0.8, fract(mx_noise_float(vec2(atan(c.y, c.x).mul(14), tick)).mul(6))).mul(smoothstep(0.25, 0.62, length(c)));
    col = mix(col, vec3(0.05, 0.03, 0.07), rays.mul(u.speedLines));

    col = mix(col, vec3(0.045, 0.025, 0.07), edge.mul(0.96).mul(u.lineOn));
    return vec4(mix(col, vec3(1), u.flash), 1);
  });

  const post = new THREE.PostProcessing(renderer);
  post.outputColorTransform = false;
  post.outputNode = fxaa(renderOutput(graph()));
  return { post, u };
}
```

Drive all effects through the uniforms. Don't rebuild the graph at runtime. Change `camera.near` or `far` only before calling `createInk`. Screen `uv()` has a top-left origin on both backends (tested off-center), so from a projected tip: `hushCenter.set((ndc.x + 1) / 2, (1 - ndc.y) / 2)`.

Tune `line`, thresholds and colors to taste at 1920×1080. If you add outline-worthy color edges (a stripe on one surface), remember the filter only sees depth and normal breaks, so paint them dark.

### 16.6 Materials

```js
// stepped toon ramp
const d = new Uint8Array([95,95,95,255, 165,165,165,255, 235,235,235,255, 255,255,255,255]);
const ramp = new THREE.DataTexture(d, 4, 1, THREE.RGBAFormat);
ramp.minFilter = ramp.magFilter = THREE.NearestFilter; ramp.needsUpdate = true;
const toon = (o) => new THREE.MeshToonNodeMaterial({ gradientMap: ramp, ...o });

// organ: canvas map, heartbeat swell, hard wet glints
const mat = toon({ map: canvasTexture });            // canvasTexture.colorSpace = THREE.SRGBColorSpace
mat.positionNode = positionLocal.add(normalLocal.mul(uBeat.mul(0.03)));
const glint1 = smoothstep(0.9935, 0.9945, dot(normalView, normalize(vec3(0.22, 0.62, 0.75))));
const glint2 = smoothstep(0.9975, 0.998, dot(normalView, normalize(vec3(-0.35, 0.5, 0.8))));
mat.emissiveNode = vec3(1, 0.93, 0.9).mul(max(glint1.mul(0.85), glint2.mul(0.6)));
```

**Render targets come out upside down on a plain plane, on both backends** (tested with colored markers). Flip the plane's UVs, which was verified upright on both:

```js
const plane = new THREE.PlaneGeometry(1.6, 1.6);
const uvs = plane.attributes.uv;
for (let i = 0; i < uvs.count; i++) uvs.setY(i, 1 - uvs.getY(i));
const portrait = new THREE.Mesh(plane, new THREE.MeshBasicNodeMaterial({ map: rt.texture }));
// each frame, before the inked pass: renderer.setRenderTarget(rt); renderer.render(bustScene, bustCam); renderer.setRenderTarget(null);
```

**Geometry without normals warns under the ink pass** ("Vertex attribute normal not found"): `Points` and `Line` still draw, but use `InstancedMesh` and tube meshes instead, or add a dummy `normal` attribute.

### 16.7 Rapier

```js
import RAPIER from '@dimforge/rapier3d-compat';   // wasm is embedded; works in Node and in the browser
await RAPIER.init();
const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
world.timestep = 1 / 60;
const tip = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 1, 0));
const item = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 0.5, 0).setLinearDamping(2).setAngularDamping(3));
world.createCollider(RAPIER.ColliderDesc.ball(0.05).setDensity(2), item);
const grip = world.createImpulseJoint(RAPIER.JointData.spring(0.0, 60.0, 6.0, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }), tip, item, true);
const link = RAPIER.JointData.rope(0.1, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });   // chains: Legato, batons, thread
tip.setNextKinematicTranslation({ x, y, z }); world.step();
world.removeImpulseJoint(grip, true);                                                   // release or sever
```

40 to 100 µs per step with a dozen bodies, so physics will never be your bottleneck.

### 16.8 Pad stub for tests

```js
await context.addInitScript(() => {
  const mk = (i) => ({ id: 'Stub DualSense (STANDARD GAMEPAD)', index: i, connected: true, mapping: 'standard', timestamp: 0,
    axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, () => ({ pressed: false, touched: false, value: 0 })), vibrationActuator: null });
  window.__pads = [mk(0), mk(1)];
  navigator.getGamepads = () => [window.__pads[0], window.__pads[1], null, null];
});
// press R2 at 62%: window.__pads[0].buttons[7] = { pressed: true, touched: true, value: 0.62 }
```

Standard mapping: 0 Cross, 1 Circle, 2 Square, 3 Triangle, 4 L1, 5 R1, 6 L2, 7 R2, 8 Create, 9 Options, 10 L3, 11 R3, 12–15 D-pad, axes 0/1 left stick, 2/3 right stick.

---

## 17. Testing

One command: **`node tests/run-all.mjs [sim|browser|hub]`**. It prints only failures and a one-line count, and exits non-zero on failure. Rerun a suite only after changing the code it covers. Run one browser at a time; "Target closed" or "page crashed" means memory ran out, so run fewer. No subagents or workflows to debate, review, judge or audit. All files stay inside the dev folder. Keep a running tally of the bugs your tests catch and which were critical: your brief's Testing Feedback asks for those counts.

**`sim` (Node, no browser, seconds to run). Most of the game's correctness lives here.**

- One test per rule in §3, §4, §5.
- Determinism: same seed and inputs give the same `hash()`, twice.
- Snapshot round-trip: decoded state contains everything the view reads. The `s` message stays under 1,100 bytes at the busiest moment of Grand Rounds with 4 seats.
- Data lint: every op's kinds, sites, tools and speakers exist; every phase has an objective; every touchable spawn sits inside the drape window (§3.1); the union of `teaches` covers all 8 wheel tools, Syringe, Defib, both gifts and all 7 strains; no Bea line contains "good" outside S16.
- **Bot playthrough on Normal, each operation (Last Patient has no timer or rank, so it only has to complete):** succeeds; clear time is 45% to 75% of the timer; minimum vitals at least 35; rank at least A. These invariants are how we prevent difficulty spikes: tune data until they hold. Set `parScore` from the bot's score here.
- **Sloppy bot** (noise 0.03, reaction delay 0.25 s) on Easy: succeeds, rank at least C.
- **Idle:** with no input, each operation except Last Patient fails.
- **The whole game:** all operations in story order through Last Patient. Grand Rounds at 1, 2, 3 and 4 seats.

**`browser` (Playwright, Chromium with §16.3 flags unless noted).**

- Boots on `webgpu` with flags and `webgl2` without; no page errors on either; screenshot not blank (PNG well above a blank page's size). WebKit boots.
- Input: pad stub moves the tip the right distance (full right stick for 1 s = `tipSpeed` ±5%), R2 analog reaches the sim, left-stick flick picks the right tool; mouse is absolute and hover moves menu focus; click activates; keys 1 to 8 work; keyboard-only WASD works.
- Prompts follow the last device (`data-prompt-set`); the Settings glyph option switches to Xbox.
- Dev mode: reachable from Pause; each tool runs once without error; a slider changes sim behavior live; Reset restores defaults exactly. Every tuning ID is read somewhere in `src/` (no dead sliders).
- Attract: starts at 10 s (±1) on Title; shows at least three different operations; any of key, mouse, pad and tap exits; writes no save.
- Touch: Pixel 7 (Chromium) and iPhone 15 (WebKit) profiles show the exact text and a working Settings button by tap, no controls, attract still runs; a pad press leaves the notice.
- Audio: music bus at 0.10 by default. `OfflineAudioContext` renders non-silent output for every track, every SFX and every voice. Source has no audio file references.
- Save: progress survives a reload.
- About: every required field is on screen, and `#about-data` parses.
- Couch: two stub pads join the lobby, two tips move independently, both score.
- **Full UI playthrough** with `?test=1&norender=1`, the bot and `warp`: New Game through every scene and operation to the credits, using real menu inputs. `state().reached` contains Title, Main Menu, Story, Chart, Operation, Report and Credits roll. Other tests here cover Fail, Free Play, Lobby, Settings, About and Touch notice; the hub suite covers the session card.
- Packaging: one file, no external script or font URLs, exactly one pristine client (§16.2), hub tags match the §14.6 regex form, no `TODO`, `FIXME`, `placeholder` or `stub` in `src/` (search your own source, not the output: the engines' bundled code can contain those words), no `Math.random` in `src/sim`, title string only in `identity.js`.

**`hub` (the real harness in `tests/hub/site/`, with `dist/game.html` copied in as `game.html`).** Open `harness.html?game=game.html&auto=1&play=8000` plus each of:

| Run | Extra query |
|---|---|
| 2 players | `players=2` |
| 3 players, bad network | `players=3&latency=150&jitter=50&loss=5` |
| 4 players, bad network | `players=4&latency=150&jitter=50&loss=5` |
| Host leaves | `players=3&latency=150&jitter=50&loss=5&scenario=host-leave` |
| Server copy | `players=2&latency=150&jitter=50&loss=5&scenario=server` |

Wait for `body[data-complete="true"]` (allow 300 s), and require `window.__hubCheck.pass === true` and **no console line starting `[AIHub]`**. Use a 1280×860 viewport. Run all five with the §16.3 flags, and the 4-player run once more without them (WebGL2). Then **on its own:** load the page, wait 2.5 s, press Enter, Space, Enter, Space with 500 ms gaps, wait 2 s; require no page errors, `AIHub.active === false`, `AIHub.seeded !== true`, and a non-blank screenshot.

**Screenshots, only for what scripts can't judge.** At 1920×1080: Title, Main Menu, one story scene with a shout, Operation at a calm moment, Operation in danger, Hush, each strain once, Report, Settings, About, session card. Add one HUD portrait and one cut-in: faces must be upright. Look for: text legibility from ten feet, ink quality, overlaps. Fix what you see.

---

## 18. Build order

Work so the game is playable as early as possible. Each step ends with its tests green.

1. **Toolchain.** `package.json`, build script, test runner, an inked toon scene with Rapier in one HTML file, passing the boot tests on both backends. Hub client and harness downloaded.
2. **Sim core, in Node.** Beat clock, vitals, tip, scoring, ops runner, Gel/Forceps/Suction/Suture/Scanner/Syringe, Op 1 as data, bot beats Op 1. No rendering yet.
3. **First playable.** View: site, tip, instruments, HUD, input for pad and mouse and keys. Op 1 plays start to finish with report. This is the moment to feel it: fix anything that doesn't feel good before going wider.
4. **Remaining tools, gifts, juice.** Scalpel, Laser, Clamp, Defib, Hush, Sforzando, Op 2. The juice list in §9.7 starts now, not at the end.
5. **Strains and operations.** All seven strains, Ops 3 to 7, Last Patient, Grand Rounds. Bot invariants hold.
6. **Story and sound.** Busts, stages, cut-ins, all scenes, Bea's barks. Music, SFX, voices.
7. **The shell.** Title, menus, charts, Free Play, Settings, glyphs, touch notice, save, About, credits. Attract mode. Dev mode.
8. **Multiplayer.** Snapshots, couch lobby, session, card. All hub runs pass.
9. **Final pass.** Calibrate `parScore`. Screenshot review. Write `docs/AUTHORING.md`. Fill in About and the exit interview (§19). Copy to the root file. One last full test run.

**Done means:** every system in §20 works, every suite in §17 is green, and there are no TODOs, placeholders or stubbed features anywhere: a player could finish the whole demo and never find a seam.

If you run short of budget, shorten dialogue first, then trim phases (keeping every tool and strain on stage at least once), then reduce the set count. Never cut a whole system your brief requires: multiplayer, attract mode, dev mode, About, touch notice, audio categories or tests.

---

## 19. Finishing: About screen, exit interview, catalogue

**About & Credits screen.** Your brief lists four blocks that must appear both in your chat reply and on this screen: Source Information, Testing Feedback, Engine Feedback, Prompt Feedback. Give each block its own pages at ten-foot size, a few short answers per page, moved through with L1/R1 or Q/E, never a dense wall. Add a credits page: the model line from your brief, Three.js, Rapier, Bangers and Barlow Condensed (OFL), and the renderer in use this session.

Keep the content in `src/data/about.json`, inlined as the `<script type="application/json" id="about-data">` tag, so the importer can update the Usage line without a rebuild. Answer the feedback questions honestly at the very end, then rebuild. Write "unknown" for anything you can't confirm, and "added on import" for Usage, as your brief says.

Values this plan fixes for your Source Information (the rest come from your brief or what actually happened):

| Field | Value |
|---|---|
| Source | Trauma Center: Second Opinion |
| Genre | Surgical action (arcade operation game) with a visual-novel story |
| Perspective | First-person surgeon's-eye 3D operative field; staged third-person story scenes |
| Tech | Three.js r180 (WebGPU, WebGL2 fallback), TSL ink post-filter, Rapier 0.19.3, Web Audio, Gamepad API, esbuild 0.28.2; hub session client (its actual version) |
| Art Direction | Comic-book medical drama: cel-shaded toon materials, ink outline filter, manga tone, all geometry made in code |
| Animation | Three.js AnimationMixer with code-built clips, skinned strains, procedural follow-through |
| Audio | All synthesized in code: step-sequenced music, procedural effects, Animalese-style gibberish voices; music at 10% by default |
| Online | AI Hub Session Protocol v1, shared world, 1–4 players; couch co-op on its own |
| Research | What you actually did, plus this plan's: the AI Hub protocol and harness, engine prototypes on this computer, reference pages on the source |

**Exit interview file.** Write it exactly as your brief specifies, and check it parses. For the `aiHub` block: `type` Game; `genre` Simulation; `source` Trauma Center: Second Opinion; `series` Trauma Center; `players` 1–4; `controls` "Right stick or mouse to aim, left stick or 1-8 for tools, R2 or left click to use"; `tags` `["3d", "co-op", "story", "sci-fi", "boss fights"]`. `name`, `tagline` and `description` are yours.

---

## 20. Brief coverage checklist

Tick each before you call it done.

| Your brief asks for | Where |
|---|---|
| Genre and perspective chosen to fit the source | §1 |
| Title as a playful riff, chosen your brief's way | Yours (top of this plan) |
| Research: your choice | The research behind this plan is in §1 and §16; add more if you want, record what you actually did |
| Single HTML file, dependencies inlined | §16.2 |
| Three.js r180, WebGPU, cel-shaded ink filter, Rapier 0.19.3, Web Audio, Gamepad API | §9, §16, §8.1 |
| Art: engine base, new art for what makes it feel like the source | §9 |
| Animation: native system base, new animations | §10 |
| Audio in code only; gibberish voices; music at 10% | §11 |
| Online per the hub | §14 |
| Dev folder, bundling, shared-machine manners (one or two browsers, own PIDs only, 127.0.0.1 port 0, confirm the page is yours, no global tools install) | §15, §16.3, §17 |
| Performance is out of scope: add detail freely | §9 (don't optimize; don't count frames) |
| Headless tests, one command, failures and a count, a full scripted playthrough, screenshots only when needed, no review subagents | §17 |
| Original game inspired by the source; feature-complete, polished vertical slice; infrastructure for building out later | §1, §6, §15.3, `docs/AUTHORING.md` |
| Dev mode from pause: standard tools, live sliders, reset | §13 |
| Attract mode: 10 s idle, looping, cheats, any input exits | §12 |
| Multiplayer in the hub and for the game on its own | §14 |
| Narrative tone like the source's | §2.4, §7 |
| 10-foot, controller-first; native keyboard and mouse; hover moves focus; prompts follow last input; PlayStation glyphs with Xbox option; no dense screens | §8 |
| Touch-only: no touch controls, exact notice text, Settings button, attract runs | §8.6 |
| No TODOs, placeholders or stubs | §17 packaging test |
| Source Information, Testing, Engine and Prompt Feedback in chat and on the About/Credits screen | §19 |
| Exit interview, parses as JSON | §19 |

## Deviations
- Grand Rounds waves at 45s, 90s, 130s, and 165s (plan: 60, 135, 210, 255) so a one-player finish stays inside 45–75% of the 5:00 timer.
- Coda batons are 9 HP so one beat of laser drops an arm; the plan text reads about 0.5 s.
- Coda cue notes live 5 beats, and a beam resting on a dropped baton singes a cue within 0.14 without scorching.
- The grande Adagio has 100 HP, not 150.
- Growth Spurt's crash sets vitals to 48 and drains 1/s, not 35 and 3/s.
