# PLAN: a 3D surgical action game, inspired by Trauma Center: Second Opinion

You build this game from this plan, without its author. TASK.md says what is required; this plan decides how. If they
disagree, TASK.md wins. Numbers here are starting values: tune them, but keep the structure.

**Words used here.** _Dev folder_: the subfolder TASK.md tells you to keep your dev files in. Every path below is
relative to it. _Deliverable_: the single HTML file TASK.md names. _Exit interview_: the JSON file TASK.md names. _The
game_ is never named here: you pick its title the way TASK.md says.

**What is fixed and what is yours.** Fixed: the rules, cast, story, strains, cases, controls, architecture and the done
list. Yours: layouts, exact art, line-by-line dialogue, tuning, and anything this plan does not mention. Add what makes
the game better; never remove a listed feature.

---

## 1. The game

**Pitch.** You are a young trauma surgeon in a storm-battered port city, on the night the city's beloved miracle graft
starts to crawl. Look down into a living 3D operating field, swap between eight instruments on a radial, and cut,
stitch, drain and burn against a falling heart monitor, then fight engineered parasites with soft spa-brand names across
a beating heart. Between cases, a hospital melodrama plays at full volume, in gibberish voices with big captions. Up to
four surgeons can scrub in on the same patient: on one TV, or online through AI Hub.

- **Genre:** surgical action (arcade simulation) with visual-novel-style story scenes. AI Hub genre: `Simulation`. Type:
  `Game`.
- **Perspective:** first person over a fixed, gently parallaxing 3D operating field, with camera moves between sites on
  the patient. Staged third-person cameras for story scenes and operating-room cutaways.

**Scope.** A feature-complete demo and a complete, polished vertical slice. It turns what makes the source distinctive, its world, characters, themes and tone, into mechanics, pacing and UX. It is long enough to show every feature, so a player understands how it plays and feels, and what they can and cannot do (§4's refusals, §10's Handbook). It holds all the infrastructure needed to build out the rest with normal designer tools (§17.5).

**Four pillars. Check every decision against them.**

1. **Every press does something visible to a body.** Tissue parts, stitches pull tight, pools shrink, the heart kicks.
   No abstract meters where a body can show it.
2. **Melodrama at full volume.** Earnest, overheated, funny without winking. The stakes are always the highest they
   have ever been, again.
3. **One more doctor in the room.** The theme is second opinions: doubt, trust and being overruled. It is also a
   mechanic: a second surgeon with the opposite gift, an AI colleague, and real co-op.
4. **Readable from the couch.** A pad in your hands, a TV at 10 feet, huge glyphs, never more than a few things to read.

**What we take from the source, and what is ours.** Build an original game: same genre and spirit, nothing lifted.

| Source idea (keep the idea) | Ours (use this) |
|---|---|
| Pointer plus stick-radial instrument play | Twin-stick surgery on a pad, native mouse on PC (§10) |
| Vitals, clock, Cool/Good/Bad ratings, letter ranks | Vitals, clock, TEXTBOOK/CLEAN/ROUGH/SLIP, ranks C to S and ★ (§3) |
| A gesture-activated time-slowing gift; a second doctor whose gift differs | Beat-timed Stillpoint and Second Pulse (§5) |
| Man-made parasite disease with named strains | Halcyon grafts and their spa-brand strains (§7) |
| Nurse barking orders; earnest medical thriller | Our cast and our plot (§9) |

**Never use, in any form:** Derek Stiles, Angie Thompson, Naomi Kimishima, Nozomi Weaver, Hope Hospital, Caduceus, Delphi,
GUILT, Healing Touch, Kyriaki and the other Greek weekday strain names, Adam, Bliss, Z-Cells, the star gesture, or the
source's art, music, UI, levels or sentences. The title may riff on the source's name as TASK.md asks; nothing else
does. "Second opinion" appears only as the ordinary phrase, in dialogue.

**Fix what reviewers disliked in the source.** These come from reviews of the source and its DS original.

| Complaint | Our answer |
|---|---|
| Difficulty spikes, some players could not finish | Three difficulties, phase checkpoints, a hint button, assist options in Settings |
| Repetitive, no room to improvise | Every case adds one new rule; multi-site triage makes your own priorities the game |
| Long text slowing the pace | Scenes of 12 to 35 short boxes, skippable, voiced in gibberish |
| Unreliable star gesture | Gift activated by three beat-timed presses, generous windows, a one-press option |
| Emotional distance from patients | A named patient, a pre-op moment, a postcard afterwards that reflects your rank |
| No multiplayer | Couch and online co-op on the same patient |

The villain is a company that skipped its trials, not medicine, vaccines or hospitals. The doctors win with evidence.

---

## 2. A minute of play

The lamp swings over. Sterile teal drapes frame a window of glistening tissue that fills the TV, rising and falling with
the patient's breath. The ECG strip beeps at top left; the digits at top centre count down. A gloved hand holds the
scalpel; the left stick moves it. You squeeze R2 on the glowing guide's first dot and draw down the line, and the skin
parts with a wet ribbon of red. TEXTBOOK pops in big letters. Blood wells. You flick the right stick and the radial
blooms, flick toward Drain and release. A gloved hand slaps the instrument into yours, *clack*. You hold R2 over the pool
and it shrinks. Odie's gibberish chatters in the corner, her caption large: "Vitals sixty and falling. Stitch that, Doctor,
or I start calling relatives." Something under the tissue flinches. The music drops out. The monitor goes quiet, and that
is worse.

---

## 3. Rules of an operation

All of this lives in the sim, reproducible, testable in Node.

**The field.** An operation happens in a diorama: a heightfield "sheet" 16 × 9 world metres in view (20 × 12 built), lying
at floor height in a bare level, with a camera above it. Real anatomy is smaller, but keep the world big so the engine's
particles, blobs and telegraphs sit in their comfortable ranges. 120 px per metre at 1080p. Field coordinates are `[x, z]`
in metres from the sheet's centre.

**Sites.** A case has 1 to 3 sites: a separate sheet and camera pose per site (liver, lung, arm; or three patients). Switch
with D-pad left/right, or Q/E, or click an edge tab: a 0.4 s camera blend. **Other sites keep bleeding while you are away.**
Edge tabs flash with alert icons and Odie shouts. This is the game's main source of improvised priorities.

**Field time.** Patient time runs in integer `fieldTicks`: +100 per sim step normally, +25 in Stillpoint. Bleeds, parasites
and the clock all read field time. Cursors and tools run at full speed.

**Vitals** (0 to 100, one per patient). Each active bleed −0.5/s, a deep bleed −1.2/s, a live Lull −0.6/s, parasite hits
as listed, a slip −6. Stabilizer restores. Below 25: red vignette, faster heartbeat, music intensity at maximum. At 0: see
Flatline.

**The clock.** Every case has a limit (§8). At 0, the operation fails.

**Slips.** Cutting outside a guide, burning healthy tissue, tearing. Limit 5 (Intern 10, Attending 3); past it the operation
fails ("Five slips? Get out of my OR."). A slip makes a small real wound where it happened.

**Ratings and score.** Each finished action rates TEXTBOOK (×1.5), CLEAN (×1), ROUGH (×0.5) or SLIP (×0 and resets the
chain). Each TEXTBOOK or CLEAN adds 0.1 to the chain multiplier, up to ×2. Base points: stitch 20, pool cleared 30, shard
100, finished cut 200, mass removed 300, parasite kill 500, phase cleared 1000. End bonuses: 10 per second left, 20 per vital,
2000 for no slips, 1000 for an unused Gift.

**Ranks.** C, B, A, S, and ★ (secret, for no slips and S score on Attending). Thresholds per case: 45 / 60 / 75 / 90% of what
the bot scores on Resident, computed by a tool and written into the case data; a test checks they are current.

**Flatline.** Vitals at 0 starts a Code: 8 s of field time, paddles in frame, a charge ring. Press both triggers (LMB + RMB)
when the ring is in its green band. Two tries per Code. Success: vitals 25. Failure, or a Code a case does not allow:
the operation fails.

**Failure.** Flat tone, the camera pulls back, Odie switches off the monitor, huge "OPERATION FAILED" with one line of
blame. Options: Retry from this phase (rank capped at B; not on Attending), Retry case, Back to the Board.

**Winning.** The final phase is always closing: last stitches, gel, auto-bandage. "OPERATION COMPLETE", the team exhales,
then the debrief: a huge rank, at most five lines (time, vitals, slips, best chain, score), then the patient's postcard.

**Difficulty.** Intern / Resident / Attending, chosen at New Game and changeable in Settings. It scales vitals drain (0.6 /
1 / 1.3), clock (1.3 / 1 / 0.85), parasite HP and speed (0.75 / 1 / 1.25), slip limit, and assist defaults. Attending unlocks
after the story and is required for ★.

**Hints.** D-pad up, or H: Odie says what to do now and the right instrument pulses on the radial. Automatic after 8 s
with no progress on Intern and Resident.

---

## 4. Instruments

Eight on the radial. Details below; balance keys in Appendix A. Stroke tools get assist: strong on the pad, light on the mouse (§10).

| Tool | Use | Rated by |
|---|---|---|
| **Scalpel** | Hold on a guide's start, draw to its end. Closed-loop guides excise a mass | Mean distance from the guide: <0.18 m TEXTBOOK, <0.4 CLEAN, <0.7 ROUGH; ≥1.0 m for over 0.2 s, or cutting with no guide near: SLIP |
| **Forceps** | Hold to grab shards, masses, cocoons, tendrils; pull 1.2 m to free them (they fly to Odie's tray). Grab a flap's handle to lift it | Pull speed: over 8 m/s is ROUGH and tears a small bleed |
| **Suture** | Hold and zigzag across a wound; each crossing places a stitch at least 0.45 m from the others. Closed at length ÷ spacing | Evenness of spacing and time per stitch |
| **Drain** | Hold over a pool: it shrinks. Pools grow from open bleeds and physically hide what is under them | Points only; no slip on healthy tissue |
| **Laser** | Hold for a beam: pops nodules (1.2 s), cauterizes tiny bleeders, damages parasites. Overheats after 6 s (2 s cooldown). 1 s on one spot of healthy tissue is a SLIP | Time on target |
| **Syringe** | Stabilizer: hold to draw (1 s to full), release to inject. Band 0.75–0.95: +24 (TEXTBOOK); under: +18 or less; over: +6. 2 s cooldown. Binder: hold 0.4 s on a marked weak point | The band; on target |
| **Gel** | Hold and paint (radius 0.7 m). Heals abrasions, numb patches and closed wounds at 90% coverage; dissolves Balm | Coverage speed |
| **Scanner** | Hold: a ring pings out to 3 m and reveals buried things for 6 s, shown as ghost shapes | Points for finds |

**Contextual, not on the radial.**

- **Paddles:** a Code (§3), and the finale's heart stops.
- **Flaps:** a tissue flap is a 3D hinged sheet with a marked handle, and things hide under it. Grab with forceps and lift;
  release above 80% over the clip band and a clip holds it for 8 s, then it flops back. A partner can simply hold it open
  while you work. This is the mechanic only 3D can do: the camera tilts slightly to look under a raised flap.

**Never silent: the game says what you cannot do.** Using a tool on something it cannot affect gives a dull thud, a "no" icon at the cursor and one line from Odie naming the right tool ("Laser won't touch that, Doctor. It likes the warmth."), with no penalty. A table in `labs/game/data/tools.ts` gives every tool and target kind either an effect or a refusal line, and it drives this feedback, the bot and the Handbook; a test fails if any pair is missing.

**Quick Syringe:** Square, or F, equips the syringe from any tool.

**A hand gives you each tool.** On any switch, a glove slides in and slaps the instrument into your palm (0.15 s, with a
clack). Switching is never blocked by the animation.

---

## 5. The Gift

Each surgeon has a Gift: one charge per case unless the case grants more.

**Pulse-lock (activation).** Press Triangle or Space: field time drops to 30% and the ECG strip grows huge. Press the same
button on the next three R-peaks (from the patient's real heart rate). Window: ±70 ms perfect, ±140 ms good. Duration = 3 s
+ 1.5 s per good + 2.5 s per perfect (10.5 s at most). All three missed still gives 3 s. Settings offer **Simple Gift**:
one press, a flat 6 s. The rhythm game must feel reliable: the source's unreliable gesture is exactly what we are fixing.

- **Stillpoint (Dr. Tolliver).** Field time ×0.25, tools at full speed. Desaturated teal grade, muffled sound, loud heart.
  Calm.
- **Second Pulse (Dr. Oyelaran).** No slowdown. Vitals cannot fall, each clean action heals +1.5, and the chain multiplier
  counts double. Amber-red grade, speed lines, music jumps to top intensity. Frenzy.
- **Consult.** Two surgeons starting a Gift within 1 s of each other both gain +50% duration, with a big "CONSULT!"
  stinger. Works in couch, online, and with the AI colleague.

---

## 6. Several surgeons, one patient

Every surgeon is a **seat** with a cursor, a tool, and its own hand and score. Vitals, clock and targets are shared. Seats
are the sim's only player input, so one path serves everything:

- **Solo:** seat 0. An **AI colleague** in seat 1 in Cases 5 to 8: the bot's policy (§17.6) limited to holding flaps, draining
  and clearing small things, at reduced speed. It teaches co-op without a second human.
- **Who plays whom:** seat 0 is the case's lead; seat 1 is the other surgeon where a case has both; any other seat is a resident
  with no Gift.
- **Couch co-op, on its own (no hub):** up to four devices on one TV. On the title's **Scrub In** screen, or from the Board,
  each pad presses Cross, or the keyboard and mouse press Enter, to claim a seat. Same picture, one camera; any seat
  can switch sites. Each seat's cursor and radial are in its colour.
- **Online:** AI Hub session, shared world (§16). Each copy has its own camera and site; other surgeons' gloves show in
  their colours when on the same site, with an edge marker otherwise.
- **Seat colours:** `#e8443a`, `#3b82f6`, `#22c55e`, `#f5b700`, as the hub's.
- **Scaling** with n surgeons: parasite HP ×(1 + 0.6(n − 1)), targets +25% per extra surgeon, clock unchanged. The team has one
  rank. Standings on the results come from seat scores.
- **In Cases 6 to 8**, a solo player also gets **Swap** (R3 or Tab): take over the other surgeon. The AI takes yours.

---

## 7. The strains

Halcyon Biosciences sold grafts under soothing brand names, so each deadly strain has a soft spa-brand name. Numbers are in
metres and seconds of field time at ×1. Each strain is data in `labs/game/data/strains.ts` driving one state machine in
`labs/game/scenes/strains/`.

**All strains share:** a telegraph before every hit (drawn following the sheet's heights; test it with the engine's
`inTelegraph`), a hit reaction, a colour unique on the tissue, and a 3-note musical signature when first seen.

- **LULL** (Case 4). Blob rig, lilac, radius 0.45, crawls 1.2 m/s. Its aura silently drains vitals and **dims the ECG and its
  beep** while any Lull lives: the room gets quieter as things get worse. Every 6 s it nuzzles: ring telegraph r 1.2 for 1.5 s,
  then a numb patch (−2 vitals, −0.2/s until gelled). Laser 1.5 s kills it and leaves a cocoon for the forceps. **The
  Matron:** radius 1.2, armoured except when yawning (2.5 s every 8 s), when a Binder dose in its maw deals 50%; births one small
  Lull per 10 s.
- **SOLACE** (Case 5). Blob with wing-arms, amber, generations of radius 0.9 / 0.6 / 0.35. Hugs blood vessels. A scalpel stroke
  of at least 1.5 m through it splits it into two of the next generation; laser only works on generation 3 (1 s), and Odie
  notes "it likes the warmth." After 5 s latched: line telegraph along the vessel for 2 s, then it constricts: a new bleed and −5
  vitals. Cap 12 alive. **Mother Solace** hides under a flap: someone must hold it open.
- **REVERIE** (Case 6). A raised ripple moving under the sheet at 3 m/s (real displacement), invisible until scanned. Scanned, it
  shows for 6 s; hit by laser, it surfaces for 3 s and can take damage (5 s of laser, three exposures). Lance: cone telegraph 1.2
  s, then a short laceration that turns deep after 20 s. **Decoys:** floaters that pop when scanned. The real one's pulse beats in
  time with the ECG, so you can hear which it is.
- **BALM** (Case 7, session case). A lacquer film spreading cell by cell (0.5 m grid) from a translucent Node. Lacquered wounds
  cannot be stitched or drained. Gel clears a 1 m radius per second. Laser clears faster and costs −0.5 vitals. Kill the Node
  with 2 Binder doses and its film fades over 6 s. Drains −0.1/s per 10 cells.
- **MERCY** (Case 8, finale). Floater rig with orbiting motes, white-gold, radius 1.4. She sings, a gibberish choir in the music.
  Three phases on the beating heart:
  1. **Anesthesia.** Six motes shield her; laser 0.6 s each, a new one every 8 s. Every 9 s a sleep ring (r 2, 1.5 s) leaves a
     numb patch that slows the heart until gelled. No motes: exposed for 5 s; three Binder doses move to phase 2.
  2. **The Kindness.** She stops the heart: a Code that does not cost a try if you land one of two shocks in 8 s. Then three arc
     rakes leave three lacerations to close in 30 s. Two rounds.
  3. **Last Rites.** She burrows into the ventricle. A scalpel guide moves with each heartbeat. Then forceps on five tendrils
     (each re-attaches after 10 s until all are out), then a Gift is granted free and three Binder points must land within it. A
     final Code restarts the heart, with every surgeon's paddles.

---

## 8. The cases

Eight cases, 35 to 50 minutes for a first run, then **Free Surgery**. Each adds one new rule, so the demo shows everything
the game does. Phases are data (§17.5) and each phase is a checkpoint. "AI" means the AI colleague is present.

| # | Title | Surgeon | Patient | Site(s) | Limit | New here |
|---|---|---|---|---|---|---|
| 1 | First Cut | Wren | Tomás Reyes, 52, harbor pilot; glass from a deck hatch | Chest | 4:00 | Cursor, radial, Drain, Forceps, Suture, Syringe, Gel |
| 2 | The Quiet Lump | Wren | Gwen Abara, 34, trumpet player; an old graft scar | Abdomen | 4:30 | Scalpel, Scanner, Laser |
| 3 | Crosstalk | Wren | Hal Minsky, 58, bus driver; crash on Breakwater Road | Liver, Lung, Arm | 5:00 | Sites, Code, Stillpoint |
| 4 | It Moves | Wren | Gwen again, in crisis | Abdomen | 5:30 | LULL, Binder |
| 5 | Struck Off | Sabine, AI | "Big Ana" Duarte, stevedore | Abdomen, on a ship | 5:30 | Flaps, SOLACE, Second Pulse, ship roll hazard |
| 6 | Reverie | Both, Swap | Chief Achterberg | Chest, Abdomen | 6:00 | REVERIE, decoys, Swap, Consult |
| 7 | Gala Night | Both, AI | Three donors, three tables | Tables A, B, C | 6:30 | BALM, one vitals bar per patient |
| 8 | Mercy | Both, AI | Dr. Lucan Voss | Heart | 8:00 | MERCY, every tool |

**Phases.**

1. **First Cut** (vitals start at 70; no Gift). Clear 3 pools, with Odie teaching cursor, use and the radial → pull 4 shards → scripted dip to 40,
   teach the Stabilizer → stitch 3 lacerations → gel and close.
2. **The Quiet Lump** (85). Curved 7 m incision → laser its tiny bleeders → scan to find a buried mass and 3 nodules, laser the
   nodules → loop-cut the mass, lift it with forceps. **It flinches.** Drama Cut. → stitch and gel.
3. **Crosstalk** (60). Each site has 2 wounds and a pool; triage while the others bleed → scripted flatline when the first site
   closes: teach the Code → 3 arterial bleeds at once, no time left: time slows, teach the pulse-lock, Wren discovers
   Stillpoint → close across all sites.
4. **It Moves** (75). Reopen → 3 Lulls in silence, numb patches, the Chief mocking from the gallery → cocoons, tears →
   the Matron → close.
5. **Struck Off** (70). Lift and clip a flap; Solace beneath → split and burn generation by generation → **the storm hits**: the
   ship rolls every 7 s (camera tilts up to 6°, cursor drifts, instruments slide); teach Second Pulse → Mother Solace under
   the flap, Wren holding it → close, still rolling.
6. **Reverie** (65). Two incisions, one on each site, swapping surgeons → hunt with the Scanner, 3 exposures → decoy storm, listen
   for the beat → the Reverie under the heart flap; Consult → close.
7. **Gala Night** (each table 80). Three bleeding patients while Balm spreads; a Code allowed once per patient; losing any patient fails
   the case → Nodes on every table → a final closing race. Voss's speech keeps playing on a big screen throughout.
8. **Mercy** (100). Open → the three-phase boss of §7 → close. Odie's moral line before it; see §9.

**Session case, "The Gala Shift"** (`case:gala-shift`; §16). Not in the story. 4:30 limit. Two patients, wounds, shards, a Lull, a Balm
Node, one flap. Ends when both are closed (won) or one dies or time runs out (lost). Playable also from Free Surgery for couch play.

**Free Surgery.** After a case is finished, it is on the Board for score attack on any unlocked difficulty, best rank kept, with
Second Pulse or Stillpoint selectable. Attending and ★ unlock after the ending.

---

## 9. World, cast, story and writing

**Port Verity**, a rain-lashed harbour city; **Harbor Light General**, its hospital, with a lighthouse for a logo. Near future.
**Halcyon Biosciences** sells "Halcyon grafts": a miracle patch that heals anything, adored by everyone, ads on every ward TV.
Tagline: **"Halcyon. Because you deserve to feel nothing."** The ad has a jingle. The trials were skipped, and the grafts
are alive.

| Who | Role, attitude | Look | Voice (§13) |
|---|---|---|---|
| **Dr. Wren Tolliver** (she/her), 27 | Second-year resident, player. Apologises to unconscious patients. Discovers Stillpoint | Short dark hair, oversized teal scrubs, reading glasses on a cord | Medium-high, quick, trailing off |
| **Odalys "Odie" Ferreira** (she/her), 41 | Charge nurse, voice of every operation. Sarcasm and steel; always two steps ahead | Grey streak, navy scrubs, pens in a bun | Low, dry, clipped |
| **Dr. Bram Achterberg** (he/him), 60 | Chief of Surgery. Thunder and a huge moustache. "A surgeon does not feel. A surgeon *finishes*." Secretly has a graft | Huge frame, white coat, moustache | Deep, booming, slow |
| **Dr. Sabine Oyelaran** (she/her), 44 | Struck off for warning about the grafts. Runs a free clinic on a moored hospital ship. Second Pulse | Tall, long coat, close-cropped silver hair | Low-mid, musical |
| **Dr. Lucan Voss** (he/him), 50 | Founder and TV face of Halcyon. Teeth | Pale suit, immaculate hair, huge smile | High, smooth, sing-song |
| Patients | Each has a person's detail: Tomás's dog, Gwen's trumpet, Hal's route, Ana's crew | Variations by slots | Variations |

**Outline.** Each scene is 12 to 35 boxes, in a set from §11. Before each operation, give the patient one human moment in the scene or the briefing.

- **Before Case 1.** Storm, night shift, the Halcyon ad on the ward TV. Odie: "Congratulations, Doctor. You're the only surgeon in the
  building."
- **After 1.** Tomás's dog waits in the corridor, against every rule. Wren lets it stay. Odie pretends not to see.
- **Before 2.** A routine cyst, a chance to rest. Gwen jokes about her trumpet and shows off the scar from her Halcyon lip graft.
- **After 2.** The mass flinched. Odie saw it. Nobody else will believe it. It is filed as a cyst.
- **Before 3.** Bus crash; the ER overflows; the Chief throws Wren in.
- **After 3.** Wren: what happened in there? Odie: "You were fast. Don't make it weird."
- **Before 4.** Gwen is back, in agony; her scar is moving. The Chief watches from the gallery.
- **After 4.** The sample vanishes. Halcyon lawyers appear. The Chief suspends Wren. "You saw a *twitch*, Doctor, at hour nineteen of a
  shift. Get a second opinion. If you can find a fool to give one."
- **Before 5.** Wren finds Sabine on the ship. Sabine: "Everyone agreed I was wrong. That is what consensus feels like from the inside."
  A stevedore collapses on deck.
- **After 5.** The two compare samples. Sabine: "I'm not a doctor anymore, Dr. Tolliver. I am a second opinion."
- **Before 6.** The Chief collapses at a board meeting and pulls his collar open: his own graft scar.
- **After 6.** His confession, from the bed: "I signed the trial. I signed them all." He gives them the trial files, and access to the Gala.
- **Before 7.** Halcyon's gala in the new wing, paid for by Halcyon. Voss on the big screen. Donors begin to fall.
- **After 7.** The donors live. On the big screen, mid-sentence, Voss's smile slips and he falls.
- **Before 8.** Voss himself is wheeled in: his own product. Odie, quietly: "We could be slow, Doctor. Nobody would know." Wren: "I
  would."
- **After 8.** Voss wakes in handcuffs. "You saved me. That's the one thing I could never have sold." Montage of postcards.
  Then a last beat: a shipping manifest, a crate of grafts already at sea. **"CASE FILE REMAINS OPEN."** Credits. Free Surgery unlocks.

**Writing style.** Earnest, overheated medical thriller. Short, punchy lines; jargon always explained at once; big speeches about duty;
dramatic reversals; a nurse who is always right. Comedy comes from everyone taking this completely seriously. Two lines per box at
most. In operations, lines are one short sentence and never pause play.

Lines to set the voice:

> ODIE: "Scalpel. No, the other end, Doctor."
> WREN: "I think I've got it." CHIEF: "In my operating room, 'I think' is a cause of death!"
> ODIE: "Vitals sixty and falling. Stitch that, or I start calling relatives."
> VOSS, on TV: "Pain is just a feeling you haven't paid to remove yet."
> SABINE: "Your hands are shaking." WREN: "They've never shaken." SABINE: "Then that's new. Use it."
> WREN, to a patient under anaesthetic: "Sorry. Sorry. Nearly done. Sorry."
> ODIE, at a TEXTBOOK chain: "Careful, Doctor. People will start to expect it."

**Drama Cut.** The game's visual signature, used 6 to 10 times in the story, on reveals. 0.8 s: the camera snaps to a face with a Dutch
tilt, `post.combine` lays on `look:anime-action` speed lines and cel, the screen shakes, a stinger hits, and a huge caption slams in
("IT MOVED."). Then it snaps back.

**Postcards.** After each debrief, a card from the patient, with a line chosen by rank. S: "Back on the trumpet. Played your name badly on
purpose." C: "They say I'll walk fine. They say you looked very worried." They collect in the Board's Postcards gallery.

---

## 10. Controls and screens

**Pad (DualSense, or any pad in the standard mapping). This is the design target.**

| Input | Action | Engine code |
|---|---|---|
| Left stick | Cursor | read directly (§17.4) |
| R2 or Cross | Use tool (hold) | `PadRightTrigger`, `PadSouth` |
| Right stick | Radial: push to open, aim at a tool, release to equip. Field time ×0.6 while open | `PadRightStick*` |
| L1 / R1 | Previous / next tool | `PadLeftShoulder`, `PadRightShoulder` |
| L2 | Precision: cursor ×0.4, stronger magnet, slight dolly-in | `PadLeftTrigger` |
| Triangle | Gift (and the pulse-lock beats) | `PadNorth` |
| Square | Quick Syringe | `PadWest` |
| Circle | Drop what forceps hold; cancel the radial | `PadEast` |
| D-pad left/right | Switch site | `PadLeft`, `PadRight` |
| D-pad up | Hint | `PadUp` |
| R3 | Swap surgeon (Cases 6 to 8) | `PadRightStick` |
| Options | Pause | `PadStart` |
| L2 + R2 | Paddles, in a Code | triggers |

Menus: D-pad or left stick, Cross accepts, Circle goes back. Both sticks and triggers are analog; use dead zones. In a hub session, ignore
Options while Create is held (that chord belongs to the hub).

**Mouse and keyboard. The same game and screens, but native.**

- **Mouse** moves the cursor absolutely, 1:1, no pointer lock, with the OS cursor hidden over the field. LMB uses the tool. **Hold RMB** for the
  radial at the cursor, flick and release. Wheel cycles tools. Keys **1–8** pick tools directly. The tool bar, site tabs and Board cards are clickable, and hovering a valid target highlights it. Shift: precision. Space:
  Gift. F: quick Syringe. R: drop. Q/E: sites. H: hint. Tab: swap. Esc: pause. LMB + RMB: paddles.
- **Keyboard-only** still works: WASD or arrows move the cursor, Enter uses the tool.
- Every menu: hover moves focus, click picks (`createMenu` already does this; do the same in custom panels). Rebinding in Settings → Controls.

**Cursor feel on a pad (page-side, tune these).** Speed = `cursorSpeed × lean^2.2`. Within 0.6 m of a valid target for the current tool: velocity ×0.55 and a
gentle pull (the magnet). On a scalpel guide while cutting: the across-line part of stick input ×0.4 (rail assist). Suturing on a wound: a soft clamp
to ±0.8 m of the wound (sew assist), so you just weave. Mouse gets a light version only, at 0.2 of these strengths.

**Prompts** follow the device used last (`input.lastDevice`). Draw your own glyph set in code (SVG/CSS): PlayStation shapes by default for **any** pad; **Settings →
Controls → Glyphs: PlayStation / Xbox** swaps to A B X Y and LB RB LT RT. Don't use `input.prompt()` text directly, as it reads Xbox for unknown pads. Keyboard
shows keycaps; mouse shows mouse icons.

**10-foot rules.** Judge every screen at 1920×1080 from a screenshot. Body text at least 32 px; instruments and menu items at least 64 px tall; thick outlines on guides
and cursor; focus state huge. One idea per screen. No tables, scrolling lists of small rows, or web-style forms.

**In-operation HUD (at most these).** Vitals and ECG, top left, big. Clock and phase name, top centre. Score and chain, top right. Tool bar, bottom centre: 8 icons
at 72–96 px, current raised. Odie's line, bottom left: name, big caption, no input needed (`createDialog` with `modal: false` and `auto`). Site tabs at the edges. World labels
for ratings (`ui.label`), huge and brief.

**Screens.**

- **Boot/Loading:** dark, lighthouse beam, status text; the engine's error text stays visible if startup fails for any other reason.
- **No WebGPU:** the engine has no fallback, and this cannot be left to game code. Tested: in Firefox here the bundle crashes at import (`APP_START: … "VERTEX", Js is undefined`), before any of your module runs; WebKit shows the engine's technical `GFX_NO_WEBGPU` text. So a **classic inline script** in the head, right after the hub client, checks `navigator.gpu`. If it is missing, it shows a large plain message saying the game needs a browser with WebGPU, adds "Controller or keyboard required" on a touch-only device, calls `AIHub.fail(…)` in a session, and hides the engine's text. Do the same if `__engine.errors` later holds `GFX_NO_WEBGPU` (no adapter).
- **Title:** 3D lamp-lit OR with the lighthouse beam through rain on the window; the title; Continue / New Shift / The Board / Scrub In / Settings / About. Attract after 10 s idle (§14).
- **The Board:** a corkboard wall. One big case card at a time, left/right to browse: patient, one line, rank, tools as icons. Postcards tab.
- **Story:** full 3D scene, dialogue box along the bottom third, name plate, gibberish voice; Cross advances; hold Circle to skip the scene; auto mode in Settings.
- **Briefing:** patient card and one sentence, tools needed, difficulty, Start.
- **Pause:** Resume, Retry phase, Retry case, Handbook, Settings, Controls, **Dev Mode**, Quit to Board.
- **Handbook** (from Pause and the Board): big paged cards showing what you can and cannot do. One per instrument (what it does, what it cannot do, its controls in the current glyphs), the Gift, flaps, sites and the Code, and one per strain once met. Built from the data, so it cannot go stale.
- **Settings:** pages with few big rows. Audio (Master 70%, **Music 10%**, Effects 100%, Voice 100%). Controls (glyphs, cursor speed, aim assist, rebinding, hold vs toggle for use). Gameplay
  (difficulty, Simple Gift, hints, text speed, auto-advance). Display (blood colour: red / teal / off, reduce flashes, text size).
- **Scrub In:** four big seat slots; each device claims one by pressing its accept; Start.
- **About/Credits:** see §21. Paged cards, one question per card.

**Touch-only devices.** Detect with `matchMedia('(any-pointer: fine)')` false and no pad seen. No touch controls: put `touch=off` in the `search` you give `createEngine`, always, or the engine shows its touch layer (tested on a phone profile: `touch=off` removes it all). Show exactly **"Controller or keyboard required"** and a large settings button that opens Settings, which accepts taps. Attract mode runs behind it. A pad or
key arriving on such a device clears the message.

---

## 11. Art direction

**Base: the engine's native style.** Everything is procedural shapes from the geometry kit, materials and textures as data, puppet bodies from the body grammar. Draw it the way the engine's own clean playground look does: `resolution: 'full'`, `textures: 'smooth'`, and the `aa` filter with `scope: 'all'`, in your looks. Do **not** use the chunky default `pixels` resolution: thin surgical lines must read at 10 feet. `labs/box/looks/` has worked looks to copy from.

**Looks** (`defineLook`, in `labs/game/view/looks.ts`).

- `look:harbor` for story: clean, soft `ao`, `aa`, a thin `outline` on characters only, warm-teal `grade`, gentle `bloom`.
- `look:field` for operations: `style: 'pbr'` for wet highlights, `ao`, `bloom`, `aa`; performance is unlimited, so add `ssr` if it helps the wetness.
- Transient overlays through `post.combine`: Stillpoint (teal, desaturated, vignette), Second Pulse (amber, `speedlines`), low vitals (red vignette), Drama Cut.

**Detail.** TASK.md's performance budget is unlimited, and FPS targets and optimisation are out of scope. Add as much geometry, effects, lights and shadows as a scene needs.

**Palette.** Harbor Light: sea-glass teal walls, brass fittings, amber lamps, rain-blue windows. The field: cherry, salmon, ochre and plum tissue, deliberately stylised and glossy; deep teal drapes around it.
Each strain has its own colour that never collides with tissue: lilac, amber, ink-blue, pearl, white-gold. Guides and the cursor: bright cyan with a dark outline. Keep blood dark cherry; the option recolours it.

**The operating field (the showpiece).** Built as live meshes the page rewrites each frame, tested as described in §17.3.

- **Sheet:** a dense grid (start at 320 × 192; performance is out of scope) per site. Height = breath + heartbeat + organ bulges (ellipses from data) + raised vessels (polylines) + wound lips + Reverie's ripple. Vertex colours: organ regions, veins, bruising, numb patches, burns, Balm.
- **Thin-things buffers,** one live mesh per material: wet red (incision interiors, pools with wobbling edges), thread, steel and glove (hands and tools, transformed in software from templates), transparent gel and lacquer. Each has a fixed capacity.
- **Texture:** one `defineTexture` wet-cell pattern with a height channel, for the normal map on the sheet.
- **Around it:** drapes and clamps as ordinary props, framing the window; the surgical lamp's warm white light; visible shadow of your own hand on the tissue.
- **Hands:** a gloved right hand with the tool, following the cursor with spring lag and a tremble that grows as vitals fall. In co-op, gloves tinted by seat.

**Parasites:** engine rigs where they fit (`crowdBody` blob with its features, and floater with its motes), so they squash, look and hop natively. Reverie and Balm live in the sheet.

**Characters** (`labs/game/view/bodies/`, `defineBody` on the humanoid skeleton). A custom build, `build:drama`, on `build:adult` proportions with heads about 25% larger for readable faces at 10 feet. Hair from several parts for a strong silhouette per character. Mask, cap and gown variants for the OR. Faces through `Blink`, `LookAt` and glow eye parts.

**Sets as prop lists** (`labs/game/data/sets/`): OR (real scale), ward, Chief's office, ship's clinic, gala hall, corridor. Walls and floors are large box props with generated tiles. The engine's library is fine for generic props; make new props for what sells the hospital: operating table, surgical lamp, IV stand, heart monitor (with a live ECG), instrument tray, gurney, corkboard, TV (playing the Halcyon ad), trumpet.

**Effects** (`defineEmitter`): blood squirt, goo, laser smoke and sparks, gel shine, stitch snap, rain on windows, sleepy motes.

---

## 12. Animation

**Base:** the engine's animator, actions and clip library. `node x anim find <words>` searches 1,218 readable clips; `node x new action` writes a multi-beat action from a template; bundle only the clip sets you use (see `labs/box/library.ts`).

**Story actors** are `spawnActor` with their `body` and `anim: { build }`, not player-controlled; they play actions with `actOn` and clips with `playClip`.

**New actions** (`labs/game/cast/actions/`), each checked with `actionCheck`: scrub hands, mask up, hand over instrument, clipboard slam, point accusingly, hands on desk (loom), collar open (reveal), collapse, despair on knees, adjust glasses, moustache rage, TV-host smile and gesture, trumpet raise, salute with scalpel, exhale in relief, double fist on the operating table.

**Field animation (page-side, springs from the API):** tool swings, needle arcs, stitch pull-tight, heart beats locked to the ECG, breathing, flap hinge, hand tremble, the slap of a tool handed over, tissue parting with lips along an incision, ripple under the sheet.

**Camera moves:** lamp-to-field descent at operation start, pull-back on failure, site blends, parallax ±3° with the cursor, precision dolly-in, roll hazard tilt, Drama Cut, tilt under a raised flap.

---

## 13. Audio

**Everything is written in code; no audio files, no `<audio>` tags, no data URLs of sound.** Effects and songs are `defineSfx` and `defineSong` data; the runtime is `createAudio`. Music defaults to 10%: `audio.volume('music', 0.10)` at start, and the Settings slider shows 10%. The engine's buses are `effects`, `music`, `ui`, `ambience`; there is no voice bus, so make your own `GainNode` from `audio.context` for voices.

**Voices are gibberish**, Animalese/Simlish style, in `labs/game/audio/voice.ts`. At startup, render syllable buffers per character with an `OfflineAudioContext`: 16 syllables from a sawtooth through 2–3 formant filters plus a little noise. For each spoken character, play a syllable chosen by hashing the letter (the same line always sounds the same). Per character: base pitch, formant set, speed, breathiness. `?` rises, `!` is louder and higher, CAPS are louder, commas pause. Mercy's choir and Voss's jingle use the same engine, sung to notes.

**Effects.** Every tool has a signature (cut: wet zip; stitch: tug-snip; drain: gurgling suction with pitch following pool size; laser: sizzle hum; syringe: glass tick; gel: squelch; scanner: sonar ping; forceps: click and pull; tool handover: clack). Monitor beep at the real heart rate, pitch falling with vitals; flat tone; alarm. Ratings have rising stingers. Each strain has its 3-note signature. Rain and ship creak as ambience.

**Music (`defineSong`, with `intensity` layers driven by vitals and danger).** OR calm → OR tension → strain; Mercy's hymn (finale); story soft theme; title theme; Halcyon jingle (comic, played on TVs); success fanfare; failed motif. Energetic, operatic and synth-orchestral, original. Duck music under voices and key alarms.

**Check by numbers.** Render effects with `node x audio sfx:<id>`; in a page, read levels from an `AnalyserNode` and confirm music is on at default volume but quiet.

---

## 14. Attract mode

After **10 s with no input** on the title or any front-end menu (not in a rebind prompt): fade out and start the looping demo. **Any** input (key, mouse move or click, pad button, or stick past its dead zone) exits at once back to the title. Timer resets on any input.

The loop shows as much of the game as it can, about 3 minutes, each clip a real run driven by the bot with `game.attract=true` (cheats on: no failure, infinite Gift, the clock frozen when needed):

Title logo 6 s → Case 1 stitching → Case 3 site triage and Stillpoint → a story scene with a Drama Cut → Case 5 Solace splits under Second Pulse with the ship rolling → Case 6 Scanner and flap, with the AI colleague → Case 7 three tables → Case 8 Mercy's Code → postcards → loop.

A "DEMO" banner and a large prompt to press a button. Save nothing during attract (`createStore` mode `demo`). On touch-only devices it just keeps running behind the message. Never in a hub session.

---

## 15. Dev mode

From the pause menu ("Dev Mode"), always available in this demo, drivable with pad, mouse and keyboard. Big rows, tabs across the top. Dev runs save no scores or ranks.

- **Play:** jump to any case and phase; win phase; fail phase; restore vitals; freeze vitals; freeze clock; infinite Gift; one-hit parasites; spawn any target or strain at the cursor; unlock all; autoplay (bot on seat 0); time scale ¼× to 4×; frame step; set seed; add a bot surgeon.
- **Balance:** the live sliders of Appendix A, each with its value, and **Reset to defaults** per slider and for all. They write `inspector.set(key, value)`, so replays record them.
- **View:** hide HUD; show target and hit shapes; show cursor assist; free camera; look picker; performance counters from `__engine.stats()`.
- **Author:** path tool: hold a button and draw on the field, then copy the polyline as data for a case file. Shows cursor coordinates.
- **Data:** event log; state hash; copy `input.record()` as a replay.

Sim-changing tools go through `defineDevAction`, so replays hold them.

---

## 16. Multiplayer

Follow the AI Hub Session Protocol v1 (`https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/README.md`); read it in full. Client `session.js` is version 1.4.0 at the time of writing. **Mode: `shared-world`.**

**Head tags.**

```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="5">
<meta name="hub:session-goal" content="Keep the patient alive and finish the op together">
<meta name="hub:session-howto" content="Aim: stick or mouse · use tool: R2 or click · tools: right stick or 1-8">
<meta name="hub:webgpu" content="required">
```

Paste `session.js` unmodified as the first script, right after `<meta charset>`.

**In a session (`AIHub.active`).**

- No title or menus. Boot in the order below; on `connect` giving `null`, run as on its own.
- **Own card** ("Pre-op briefing"): a 3D OR team shot with HTML over it, showing the game's name, every player in their colour and who is ready, how to win, this player's controls, and the time left from the `card` event. Ready: Enter, Cross or a click → `AIHub.answer('ready')`. More time: Triangle, T or a click → `AIHub.answer('more')`. Nothing on it changes the round.
- `AIHub.ready()` once, with no press, as soon as the sim can run (below). `AIHub.fail(msg)` if WebGPU is missing.
- `start` then a 3 s countdown from `AIHub.time()`; play at `time() >= 0`. Run `case:gala-shift` with seed `info.seed` (the same on every copy), seats = players. A lone player gets the AI colleague, added by the host.
- Host calls `AIHub.finish({ standings, scores, won, stats, awards })` once, listing every remaining player: best score first, ties grouped. `won` is the team result. On `time-up`, finish within `graceMs` with `won: false`. Each result shows slips, best chain and an award ("Steadiest hands").
- On `end`: stop input and sound. On `leave`: that seat's hand drops, and the bot does not take it over. Names only through `textContent`. Pause shows Settings over the running game and never pauses. No quitting. No `alert`, `confirm`, `prompt`, popups, navigation, or network other than the hub's.
- `AIHub.server`: the host's copy has no player, camera or input, and draws nothing. The same host code runs the world. Prefer `createHeadless` there, or stop drawing; the prototype passed with the full engine, so this is not a blocker.

**Boot order, tested against the real harness. The comments mark failures seen there.**

```ts
// labs/game/main.ts, at the very top: nothing heavy before connect, or the hub's 10 s hello window closes
const hub = window.AIHub;
const info = hub?.active ? await hub.connect({ mode: 'shared-world', seats: [1, 4], card: true }) : null;
const search = new URLSearchParams(location.search);
// The hub opens the page with ?aihub=1&aihub-seed=…; the engine reads every query key as a setting and REFUSES TO START (CORE_BAD_SETTING).
for (const key of [...search.keys()]) if (key.startsWith('aihub')) search.delete(key);
if (info) { search.set('seed', String(info.seed)); search.set('gfx.warmUp', 'asked'); search.set('game.run', 'op:gala-shift'); }
if (info) void runSession(info);                // beside createEngine, not after it: its warm-up can take 20 s here
engine = await createEngine({ canvas, scenes: ['game:main'], search: `?${search}`, /* … */ });

async function runSession(info) {
  while (typeof window.__engine?.step !== 'function') await sleep(25);   // about 1 s; long before the warm-up ends
  const e = window.__engine;
  e.pause();
  hub.ready();                                  // the harness waits only 20 s; a four-copy software warm-up reached 21 s on the starter
  setInterval(() => (info.isHost ? hostTick(e) : clientTick(e)), 16);   // keeps running in a hidden tab, throttled
}
```

The card is HTML over the 3D shot, so it can show before the first frame. If the countdown ends before `engine.ready`, keep a plain cover up until it is; ticks still run behind it. On real GPUs this should take moments.

**Netcode: host-sequenced lockstep.** The engine promises the same seed and intents give the same state, bit for bit. Use it: no snapshot serialisation at all.

- Every copy runs the same sim from the same seed. The host decides each tick's intents; everyone else plays the same list.
- **Client → host:** `{ t: 'i', x, z, tool, counters }`, unreliable, 15–20 per second, sent to the host. Counters are monotonic press counts, so a lost packet never loses a press.
- **Host → everyone:** reliable, about 15 per second: `{ t: 't', from, ticks: [...] }`, the seats' hands per tick, delta-coded; about once a second a state hash. At most 20 messages per second leave each copy, and each is at most 16 KB.
- **Host tick:** `due = floor(AIHub.time() * 60 / 1000)`; while `next < due`, build the tick's hands, `e.step(1, { 'game:hands': hands })`, and queue it. Flush every 66 ms.
- **Client tick:** step one buffered tick each timer pass; two when more than 6 are queued, eight when more than 30. After `end`, a client may drain what it has, sending nothing.
- **Your own cursor is always drawn from the local device at once;** the sim's copy follows. Actions take effect after the round trip, which is why sparks appear at the sim's cursor position.
- Settings match on every copy; dev sliders are disabled in a session. A hash mismatch logs an error and is a test failure. There is no runtime resync (`restore` refuses another run's capture).
- **Tested:** a 70-line prototype of exactly this, on the starter with a 40,000-vertex live mesh and no card, passed all four harness runs below. Every client's hash matched the host's at every check (about one a second), including at `players=4&latency=150&jitter=50&loss=5`.
- If software rendering makes the harness too slow with your full scenes, reduce sheet density when the adapter is SwiftShader (`__engine.info()`), in a session only.

**On its own.** With no hub, the game runs exactly as a normal game: story, Board, solo, and couch co-op for up to four devices (§6). There is no other online mode: outside a session there is no hub network and we add no servers. State this in About.

**Test it** as the protocol's *Test it* section says: download `harness.html`, `bridge.js` and `round.js` into a test folder under `out/` next to a copy of the deliverable, serve with `python3 -m http.server 0 --bind 127.0.0.1` (read the port it prints; confirm the page is your game; stop it by its PID), and pass all of: `?game=<file>&players=2&auto=1`, `&players=4&latency=150&jitter=50&loss=5&auto=1`, the same with `&scenario=host-leave`, and `&players=2&scenario=server`. A game passes when `window.__hubCheck.pass` is true. Use `&limit=` to shorten rounds; expose your hash checks on a debug object so the test can read them from each frame and require zero mismatches. Also open the game with no session to confirm it runs normally.

---

## 17. Engine and architecture

### 17.1 Setup, and traps already hit on this machine

Use the engine's **full workspace, not the lean** single page: you want its headless tests, replays and `node x` tools. The engine stays read-only: add every system, art asset and animation on top of it, in `labs/game/`. The rest of the stack is what it ships: TypeScript and Vite, with no new npm dependencies. This plan was tested against `my-3dge@e7a1243`. `git clone --depth 1` may give you something newer: `docs/API.md` is the truth.

```sh
# in the empty dev folder
export TMPDIR=$(mktemp -d /tmp/g.XXXXXX)        # trap 1
export CHROMIUM_PATH=$(ls -d ~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome | head -1)   # trap 2
src=$(mktemp -d) && git clone --depth 1 https://github.com/michaelcrosato/my-3dge "$src" && node "$src/tools/game/new-game.mjs" . --name <your-slug>
npm ci
```

1. **A long `TMPDIR` breaks tools silently.** The run's `TMPDIR` is too long for a Unix socket path. Chromium dies with `Socket path too long` and `node x shot` then hung for over 4 minutes; `npx tsx` fails with `EINVAL`. Use the short private directory above in every shell (shell state may not persist between tool calls, so put it in your commands or a script), and remove it when you finish. This is the one exception to TASK.md's rule against `/tmp`: no path inside your folder is short enough for the sockets. Keep your real files in your folder.
2. **Do not run `bash scripts/setup.sh`** even though the output and `AGENTS.md` suggest it: it would download Node and Chrome for Testing. `npm ci` plus `CHROMIUM_PATH` is enough. The path above is Chromium 153, which the engine targets.
3. **Don't use `node x shot --cam3`:** the flag is `--cam` (`node x help shot`).
4. A running page **cannot switch scenes**; the guide's page reload is not allowed in a hub session. Use §17.2. **Every query key is read as a setting**: an unknown one stops the engine, which is why §16 strips the hub's.
5. The engine's `modal` stops intents but not the sim: pause with `inspector.pause()` too.
6. The engine's gamepad device gives one active pad, and another pad used can take over. For gameplay, read pads yourself (§17.4). Use engine input for menus, keyboard and mouse.
7. Every source file under `labs/` needs a `@file` comment and stays under 400 lines (hard cap 600), `.mjs` tools included. Run the formatter before `npm run check`.
8. Game code may not import three.js (`npm run check` refuses it). The recipes below stay legal.
9. Golden replays break whenever play changes on purpose: `node x replay labs/game/replays --browser sim --update`.
10. The guide cites `labs/playground/`, but a game gets only `labs/game/` and `labs/box/`. To read playground code you would need the engine's repository; this plan does not.
11. You share this machine. Stay in your own folder and keep one or two browsers open. Stop only processes you started, by PID: never `pkill`, `killall` or `fuser -k`, and never kill whatever holds a port. The `x` commands pick a free port by themselves. Prefer `file://` and the engine's headless tools; start a server only for the hub harness.
12. **The browsers are already downloaded: never run `playwright install`.** The engine's own `@playwright/test` (1.64.1) drives the downloaded Chromium through `executablePath` (tested). TASK.md's `npm install playwright@1.63.0` would change the game's pinned dependencies, so for Firefox and WebKit use the system Python's Playwright instead (tested): `from playwright.sync_api import sync_playwright`.
13. Runs have no display, so all of this is headless; a headed browser would need `xvfb-run`. WebGPU needs a secure page: `file://` or `http://127.0.0.1`.
14. `earlyoom` is on. "Target closed", "page crashed" or "browser has been closed" means memory ran out, not a bug in your game: run fewer browsers rather than retrying, and run the four-copy harness alone.
15. The system Python has only Playwright. For anything else: `uv run --with pillow python script.py`, adding `--with playwright==1.63.0` if it drives a browser.

Measured on the starter: `npm ci` 6 s, `npm run check` 25 s, `npm test` 9 s, `node x shot` 12 s, a one-file build 8 s.

Tested and working, so build on these: the live mesh of §17.3; one-file build and boot from `file://`; frames still drawing while paused; `step(n, intents)` with custom keys; restart with new settings keeping the page; custom intents recorded in a replay; `cam3=fixed` cuts with `{ blend: true }`; `touch=off`; the boot order and netcode of §16 in all four harness runs. **Not tested:** the game's own card in the harness, a `defineCamera` mode in play, transparent live meshes, the light pool's focus (§17.2), vertex counts past 40,000. Prove these early.

### 17.2 One scene, many runs

The page has one scene, `game:main` (`labs/game/scenes/main.ts`, level: a bare floor big enough for one set). Each **run** is one story scene or one operation:

```ts
inspector.set('game.run', 'op:crosstalk');   // when: 'scene' settings
inspector.set('game.phase', 2);              // optional checkpoint
inspector.seed(nextSeed);                    // restarts the scene in place: tick 0, settings kept, page and geometry kept
```

`setup(w)` reads `game.run` and spawns only that set's props and actors. A black HTML fade hides each change. The **Director** (`labs/game/app/director.ts`, plain TypeScript, no DOM, tested in Node) holds the flow: title → story → briefing → op → debrief → next. Settings for a run: `game.run`, `game.phase`, `game.seats`, `game.difficulty`, `game.attract`.

Keep a `player: true` actor at the current set (the protagonist in a story; an actor out of sight under the floor in the pit): the light pool and the stage's focus follow it. Check this early.

Cameras: `inspector.camera.set('cam3=fixed,x,y,z,yawDeg,pitchDeg,fov', { blend: true })` for cuts and sites. Parallax: your own mode with `defineCamera` and `followCamera` (`node x new camera`), reading a module-level target the page writes; view state only.

### 17.3 Live meshes (tested)

Game code cannot import three.js, and cannot reach the stage's scene. But `defineGeometry`'s builder returns a geometry, and you may keep it. A geometry and attribute class can be taken from any kit shape:

```ts
// page side, before createEngine
const base = boxGeometry({ width: 1, height: 1, depth: 1 });
const Geometry = base.constructor as new () => typeof base;
const Attribute = base.getAttribute('position').constructor as new (a: Float32Array, n: number) => ReturnType<typeof base.getAttribute>;
let sheet: typeof base | null = null;
defineGeometry('geometry:sheet', { description: '…', budget: 200000, create: () => {
  const g = new Geometry();
  g.setAttribute('position', new Attribute(positions, 3));   // also normal, color, uv
  g.setIndex(indices);
  sheet = g;           // keep it
  return g;
} });
defineMaterial('material:tissue', { vertexColors: true, roughness: 0.35 });
// sim side
defineProp('prop:sheet', { parts: [{ geometry: 'geometry:sheet', material: 'material:tissue' }] });
spawnProp(w, { prop: 'prop:sheet', at: [x, 0, z], yaw: 0 });
// page side, in onFrame
position.setY(i, h); colour.setXYZ(i, r, g, b);
position.needsUpdate = true; colour.needsUpdate = true; sheet.computeVertexNormals();
```

Tested: a 40,401-vertex grid drawn and rewritten every frame on software WebGPU, with vertex colours, under a lit style; the ID pass names it `prop:sheet/mesh/page0`; the builder ran once and survived a restart. It passes types and lint. Build it at maximum extents first so culling bounds are right. If `node x qa geo` flags it, accept it in `tests/baselines/qa-geo-game.json` with the reason. Put this helper in `labs/game/view/field/liveMesh.ts`, and note the missing public API in `ENGINE-FEEDBACK.md`.

The same trick makes static organ and tool shapes: take a kit shape (`limbGeometry`, `pillarGeometry`), write new positions into its array, and call `computeVertexNormals()`.

### 17.4 Input: everything is one custom intent

The sim reads one thing: `intents['game:hands']`, an array per seat: `[x, z, tool, useHeld, counters…]`, rounded to 1/256 m. Treat an absent value (a menu, a modal) as "no change."

- **Page:** `labs/game/input/hands.ts` polls every frame. It polls pads directly from `navigator.getGamepads()` (standard indices; use the codes from `input.bindingsFor('actionMap:surgeon')` so rebinding works), reads keyboard and mouse through `input.held / pressed / strength`, integrates the cursor with assist against read-only world data, and converts the mouse to the field with `screenRay(frame.camera, ndc, aspect)` and `onFloor(ray, 0)`.
- **Solo and couch:** `(inspector.input).axis('game:hands', hands)` each frame. It merges into each step and is recorded (tested). Attract and autoplay feed the bot's hands the same way.
- **Session:** §16's stepping.
- **Other commands** to the sim use the same route: `axis('game:beat', n)` advances a story beat.
- `defineActionMap('actionMap:surgeon', …)` lists the bindings of §10. Names are lower-case words; `move` names four actions; `lock: false`. Mouse codes: `MouseLeft`, `MouseRight`, `WheelUp`, `WheelDown`.

### 17.5 Data is the designer tool

So the rest of the game can be built without new code: everything authored is plain data, validated, with hot jump-in through URL or dev mode.

```ts
// labs/game/data/cases/crosstalk.ts
export default defineCase('case:crosstalk', {
  title: 'Crosstalk', surgeons: ['wren'], seconds: 300, gift: 1,
  patient: { name: 'Hal Minsky', age: 58, line: '…', vitals: 60, postcards: { S: '…', A: '…', B: '…', C: '…' } },
  story: { before: 'story:03a', after: 'story:03b' },
  sites: [{ id: 'liver', field: 'field:liver', cam: [0, 11, -4, 0, -70, 40] } /* … */],
  phases: [{
    id: 'triage', hint: 'Stop the worst bleed first.',
    spawn: [{ kind: 'wound', site: 'liver', path: [[-3, 1], [0, 2]], deep: true }, { kind: 'pool', site: 'liver', at: [1, 0], volume: 4 }],
    timeline: [{ at: 6, say: ['odie', 'The lung, Doctor! Now!'] }],
    until: 'clear',
  } /* … */],
  ranks: [/* written by the rank tool */],
});
```

- `labs/game/data/fields/*.ts`: organ ellipses, vessels, palette per field.
- `labs/game/data/strains.ts`, `tools.ts`, `balance.ts`.
- `labs/game/data/story/*.ts`: beats: `{ set, cam, cast: { wren: { at, act } }, say: { who, text, mood }, drama?: 'IT MOVED.' }`.
- `labs/game/data/sets/*.ts`: prop lists and named camera poses.
- `validateCase()` and `validateStory()` run in tests and name every bad reference. Jump straight in with `?game.run=op:crosstalk&game.phase=2`.
- New target kinds, tools and strains are registry entries (`defineKind`), never `if`s on ids.

### 17.6 Files

Sim-side (imports only `engine/sim-api.ts`; no DOM, clocks or `Math.random`; `Math.pow`, not `**`):

```
labs/game/scenes/main.ts          the scene, run setup, settings
labs/game/scenes/op/*.ts          vitals, clock, phases, targets, tools, ratings, gift
labs/game/scenes/strains/*.ts     one per strain
labs/game/scenes/story.ts         stage directions from beats
labs/game/cast/*.ts               actors, actions, crowd bodies
labs/game/data/**                 cases, fields, strains, tools, story, sets, balance
labs/game/bot.ts                  plays any case through game:hands; used by tests, attract, autoplay, AI colleague
```

Page-side (imports `engine/index.ts`):

```
labs/game/main.ts                 boot: hub check, createEngine, onFrame
labs/game/app/                    director, store, settings, idle timer
labs/game/input/                  hands, seats, glyphs
labs/game/view/field/             liveMesh, sheet, thin things, hands, instruments, field FX
labs/game/view/                   bodies, props, materials, textures, looks, cameras, emitters
labs/game/ui/                     hud, radial, screens, dev mode, about
labs/game/audio/                  sfx, songs, voice, mix
labs/game/net/                    hub session, sequencer (pure logic), card
labs/game/replays/                golden replays
labs/game/tools/                  verify, one-file build, e2e, hub checks
```

Sim order each step: read hands → cursors and tools → targets and strains → bleeding and vitals → clock → phase runner → events. The sim says what happened with events; the page turns them into particles, sound and rating pops. The bot's policy is priorities: vitals low → Stabilizer; open deep bleed → stitch; pool hiding a target → drain; then the current phase's targets, with human-like cursor speed.

Saves: `createStore`, passed to `createEngine({ store })`, holds progress, ranks, postcards, settings and bindings. In a session the client gives you empty storage; add no code for that.

---

## 18. Packaging

The deliverable is one self-contained HTML file: no CDN needed. Write `labs/game/tools/one-file.mts`, modelled on `tools/lib/oneFile.ts`, reusing its exported `inlineBuild` and `externalRefs`: Vite `build` with `configFile: false`, `base: './'`, the alias of `three` to `three/webgpu`, `write: false`, `modulePreload: false`, `cssCodeSplit: false`, `assetsInlineLimit: () => true`, `rollupOptions: { input: <labs/game/index.html>, output: { inlineDynamicImports: true } }`. Tested on the starter: 6.7 MB, no external references, boots from `file://` without errors.

- Run it with `npx tsx`, and write the file where TASK.md says. It is tested with the short `TMPDIR`.
- `inlineBuild`'s note names the playground: `.replace(ONE_FILE_NOTE, '<!-- your note -->')`, also exported from `tools/lib/oneFile.ts` (tested).
- Paste `session.js` into `labs/game/index.html` as the first inline script. Through this build it came out byte-identical and first, and the harness accepted it (tested). Keep a test that says so.
- A script with `<!--` in it fails the build: write it apart in the source.
- The build embeds the exit interview's data for the About screen (§21), so they cannot disagree.
- Make all tests that need a browser run against this file, not the dev server, once it exists.

---

## 19. Testing

**One command: `npm run verify`** (`labs/game/tools/verify.mjs`; add it with `npm pkg set scripts.verify="node labs/game/tools/verify.mjs"`). It prints only failures and one final line (`verify: 212 passed, 0 failed`). Rerun it only after changing the code it covers; `--fast` skips browsers. Use one or two browsers at a time. No subagents or workflows to debate, review, judge or audit. Make it the first thing you write, from this skeleton.

Tested on the starter, under the run's real long `TMPDIR`, with no setup: `verify: 8 passed, 0 failed` in 28 s (14 s with `--fast`). With a broken test, a lint error and a failing browser check, it printed exactly those three `FAIL` lines and `verify: 9 passed, 3 failed`, and exited 1. It passes `npm run check` itself. For a lint failure it prints the summary; run `npm run check` for the details.

```js
/**
 * @file The one command, `npm run verify`: runs every check quietly and prints only the failures, then one line with
 * the count. `--fast` skips what needs a browser. It sets its own short TMPDIR and CHROMIUM_PATH, so it needs no setup,
 * and removes the temporary folder when done. Exit 0 when nothing failed.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, globSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';

const fast = process.argv.includes('--fast');
const tmp = mkdtempSync('/tmp/g.');
const chrome = globSync(`${homedir()}/.cache/ms-playwright/chromium-*/chrome-linux64/chrome`)[0];
const env = { ...process.env, TMPDIR: tmp, CHROMIUM_PATH: process.env.CHROMIUM_PATH ?? chrome };
const run = (command, ...args) => spawnSync(command, args, { env, encoding: 'utf8', maxBuffer: 2 ** 28 });

let passed = 0;
const failed = [];
const note = (name, ok, detail = '') => (ok ? (passed += 1) : failed.push(`${name}${detail ? `: ${detail}` : ''}`));
const tail = (result) => `${result.stdout}${result.stderr}`.trim().split('\n').slice(-6).join(' | ').slice(0, 600);

/** A step whose exit status is its verdict. */
const step = (name, command, ...args) => {
  const result = run(command, ...args);
  note(name, result.status === 0, tail(result));
};

/** Vitest, counted test by test from the JSON report npm test writes. */
function tests() {
  const report = 'out/test/report.json';
  rmSync(report, { force: true });
  const result = run('npm', 'test', '--silent');
  if (!existsSync(report)) return note('npm test', false, tail(result));
  for (const file of JSON.parse(readFileSync(report, 'utf8')).testResults) {
    for (const test of file.assertionResults) {
      note(
        test.fullName,
        test.status === 'passed',
        String(test.failureMessages?.[0] ?? '')
          .split('\n')[0]
          .slice(0, 300),
      );
    }
  }
}

/** A browser tool: it prints one JSON line per check, { name, ok, detail }. Add e2e and hub runs here. */
function browserTool(path) {
  const result = run('node', path);
  const lines = result.stdout.split('\n').filter((line) => line.startsWith('{'));
  for (const line of lines) {
    const { name, ok, detail } = JSON.parse(line);
    note(name, ok, detail);
  }
  if (result.status !== 0 || lines.length === 0) note(path, false, tail(result));
}

step('npm run check', 'npm', 'run', '--silent', 'check');
tests();
if (!fast) {
  step('replays in Chromium', 'node', 'x', 'replay', 'labs/game/replays', '--browser', 'sim');
  for (const path of ['labs/game/tools/e2e.mjs', 'labs/game/tools/hub.mjs']) if (existsSync(path)) browserTool(path);
}
rmSync(tmp, { recursive: true, force: true });
for (const failure of failed) console.log(`FAIL ${failure}`);
console.log(`verify: ${passed} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
```

**Keep an issue log from the first day** in `labs/game/TESTING-LOG.md`: one line per issue a test or check caught, naming the test, and whether it was critical (game-breaking). TASK.md's Testing Feedback asks how many issues testing caught, how many were critical, and which tests helped most and least. You cannot answer honestly from memory at the end. Note engine friction in `ENGINE-FEEDBACK.md` as it happens, and prompt friction in the log, for the other two feedback sections.

**Node (`npm test`, beside each module).**

- Golden replay per case; capture and restore continue exactly.
- The bot wins every case on Resident on 3 seeds (`BOT_SEEDS=10` for a wider sweep before finishing); also on Intern and Attending for Cases 1 and 8; also with 2 and 4 bot surgeons.
- Each tool's rules, each rating band, each strain's state machine, each failure (flatline, clock, slips), Stillpoint's and Second Pulse's rules, flap clip timing.
- `validateCase` and `validateStory` over all data; no "TODO", "placeholder" or lorem in the text; no name from the §1 never-use list.
- **Whole-game playthrough without a browser:** the Director walks the story, all eight cases by bot, to credits and Free Surgery.
- **The sequencer:** a host and 3 clients in Node over a simulated network (latency, jitter, 5% loss on unreliable input, leavers): all hashes equal after 3,600 ticks. This protects the riskiest system cheaply.
- Settings: sliders within range and reset restores defaults.
- Every tool and target kind has an effect or a refusal line (§4). The exit interview parses and matches TASK.md's shape, and the About screen's data matches it.

**Browser, against the deliverable (`labs/game/tools/e2e.mjs`, Playwright).** Launch with `executablePath: process.env.CHROMIUM_PATH` and `--enable-unsafe-webgpu --enable-features=Vulkan --use-vulkan=swiftshader --use-angle=swiftshader`, on `file://`.

- Boots with no external request and no console errors; `__engine.ready`.
- **Whole-game playthrough:** a stub pad (`navigator.getGamepads` via `addInitScript`) walks title, Board, story and debriefs, with the bot playing the ops at a raised `timeScale`, to the credits. 640×360 is enough.
- Attract starts at 10 s idle; each of key, mouse, pad button and stick exits it; nothing saved.
- Prompts: glyphs change with last device; the Xbox glyph setting works.
- Every menu by pad only, then by mouse (hover moves focus, click picks).
- Dev mode opens from pause; a slider changes its setting live; reset works.
- Touch, in Chromium's phone and tablet profiles, tapping with `page.touchscreen`: exact message, settings button works, no touch layer, attract runs.
- No WebGPU, through the system Python's Playwright: Firefox, and WebKit with an iPhone profile (the closest here to an iPhone, not iOS Safari; both have WebGL only). Expect the plain message of §10. An iPhone's real behaviour is checked only this far.
- Multiplayer stand-in: there is no second player here, so two browser pages stand in for one. The harness does this with frames running real copies of the game, and clicking a frame gives it the keyboard and mouse.
- Audio: music bus 0.1 by default; an `AnalyserNode` hears music and a beep; effects render with an `OfflineAudioContext`; the file holds no audio data or `<audio>`.
- Couch: two stub pads each claim a seat and move their own cursor.
- Story and HUD elements carry `data-game` attributes so scripts can read them through the DOM.

**Hub:** the four harness runs of §16, plus the game on its own.

**Seeing it.** Prefer numbers: `node x shot labs/game --ids` for coverage and what is visible. Use screenshots only for what a script cannot check: at 1920×1080 for each screen once, and the field in each case. WebGPU canvases can come out blank in headless screenshots; `node x shot --png` draws through the engine and works.

---

## 20. Build order

Each step ends with its tests green. Get the core feeling right before spreading out.

1. **Setup and packaging first.** Starter builds to one file, runs from `file://`. `verify` exists. `game:main` with runs.
2. **The field.** Live sheet with breath and heartbeat, under `look:field`, with drapes and the lamp. Mouse and pad cursor, hand and scalpel. Draw one incision on a guide: this must already look and feel good. Spend time here.
3. **Case 1 complete:** Drain, Forceps, Suture, Syringe, Gel, radial, vitals, clock, ratings, HUD, Odie's lines, failure and debrief, and the bot winning it.
4. **Front end:** title, Board, story scene with two characters and voices, briefing, pause, Settings, glyphs, saves. Then attract, then dev mode, since they speed all later work.
5. **Case 2 and 3:** Scalpel, Scanner, Laser, sites, Code, Stillpoint and the pulse-lock.
6. **Hub early:** session flow, card, sequencer test in Node, then the harness on the one case you have, while it is still cheap to change.
7. **Strains and flaps:** Cases 4, 5, 6, with Second Pulse, seats, AI colleague, Swap, Consult, couch co-op.
8. **Cases 7 and 8, session case, Free Surgery, the ending.**
9. **All story, all songs, all postcards, all animations.** Polish every transition.
10. **Tune:** rank thresholds, clock, difficulty, using the bot's numbers. Check no phase has a dead stretch over 8 s for a bot playing at human speed. Then final `verify`, exit interview, About screen.

If you run out of something, cut polish per case, never a feature on the done list.

---

## 21. Done

**About/Credits (in game)**, paged, one card per item, big text. One screen each: Source Information (Date, Source, Plan, Genre and Perspective, Tech, Art Direction, Animation, Audio, Online, Testing, Research, Environment, Model, Usage, with your TASK.md's values for Date, Environment and Model), Testing Feedback, Engine Feedback, Prompt Feedback (every question TASK.md asks, one card each), credits. Use "unknown" for anything you cannot confirm. Plan field: `PLAN.md`. Usage field: exactly `added on import`, in an element marked `data-about="usage"` so the importer can replace it. Say in Online that network play is through AI Hub only, and couch co-op on one screen.

**Exit interview.** Save the JSON exactly as TASK.md shapes it, beside the deliverable; a test parses it and checks its shape. Suggested catalogue values: `type` Game; `genre` Simulation; `source` Trauma Center: Second Opinion; `series` Trauma Center; `players` 1–4; `controls` "Stick or mouse aims · R2 or click uses the tool · right stick or 1-8 picks a tool"; 3 to 6 tags from `3d`, `first-person`, `co-op`, `story`, `boss fights`, `comedy`. Write your own `tagline` (a few words) and `description` (one or two sentences for the catalogue), in plain text. `name` is your title as on the title screen. Answer the feedback sections from your issue log (§19) and `ENGINE-FEEDBACK.md`. Source Information hints: genre and perspective as in §1; tech: my-3dge at your commit, three.js r182 on WebGPU, Rapier 0.21, TypeScript, Vite, AI Hub session client; research: note this plan's research plus your own, or none.

**Chat reply.** Source Information, Testing Feedback, Engine Feedback and Prompt Feedback, as TASK.md says.

**Before you stop.**

- `npm run verify` green; `npm run check` and `npm test` green; the bot still wins.
- No TODOs, placeholders, stubs, or lorem anywhere; no unused listed feature.
- The deliverable is current, in the place and under the name TASK.md gives.
- `labs/game/README.md` says what the game is and the calls you made; `ENGINE-FEEDBACK.md` lists what you needed from the engine. "Local engine patches" should be empty; the engine stays read-only.
- Every process you started is stopped by its PID; your temporary directory is removed.

**Every TASK.md requirement, and where it is covered.**

| TASK.md asks for | Here |
|---|---|
| Genre, perspective | §1 |
| Title by RNG from 50 | Yours, as TASK.md says; never named here |
| Research | Done for this plan (§1's review fixes, §17's tests); more is your choice |
| Single HTML file, dependencies | §18 |
| Build on the engine's full workspace; engine read-only | §17 |
| Art direction: native base, new assets | §11 |
| Animation: native base, new animations | §12 |
| Audio: code only, gibberish, music 10% | §13 |
| Online: AI Hub | §16 |
| Dev subfolder, stay in your folder, ports, PIDs, `file://` first | Intro, §16, §17.1, §21 |
| Performance unlimited, FPS out of scope | §11 |
| Testing: headless, one command (tested skeleton), playthrough, few screenshots, no review agents | §19 |
| This computer: stand-ins for pad, touch, audio, second player, TV; shared machine | §10, §16, §17.1, §19 |
| Original, feature-complete vertical slice, shows all mechanics | §1, §8, §20 |
| Player sees what they can and cannot do | §1, §4 refusals, §10 Handbook |
| Infrastructure for later building with designer tools | §15 Author tab, §17.5 |
| Dev mode from pause, tools, live sliders, reset | §15, Appendix A |
| Attract mode | §14 |
| Multiplayer in the hub and on its own | §6, §16 |
| Narrative tone | §9 |
| 10-foot, controller-first; native keyboard and mouse; hover; prompts; glyph option | §10 |
| No dense screens | §10 |
| Touch-only behaviour | §10, §19 |
| No TODOs, complete | §21 |
| Source Information, feedback, About screen, exit interview | §19 issue log, §21 |

---

## Appendix A: live sliders

All are `defineSettings` entries with `when: 'now'`, read each step, in `labs/game/data/balance.ts`. Shown in Dev Mode → Balance. Difficulty multiplies some of them at run start.

| Key | Default | Range | What it does |
|---|---|---|---|
| `game.vitalsDrain` | 1 | 0–3 | Multiplies all vitals drain |
| `game.bleedRate` | 1 | 0–3 | How fast bleeds grow pools |
| `game.clock` | 1 | 0.5–2 | Multiplies each case's limit |
| `game.slipLimit` | 5 | 1–20 | Slips before failure |
| `game.cursorSpeed` | 13 | 3–25 | m/s at full stick |
| `game.cursorCurve` | 2.2 | 1–4 | Stick response curve |
| `game.magnet` | 0.55 | 0–1 | Cursor stickiness near valid targets |
| `game.railAssist` | 0.6 | 0–1 | Pad help along a scalpel guide |
| `game.sewAssist` | 0.8 | 0–2 | Clamp width around a wound, m |
| `game.radialSlow` | 0.6 | 0.1–1 | Field time while the radial is open |
| `game.cutTolerance` | 1 | 0.5–2 | Scales the scalpel's bands |
| `game.stitchSpacing` | 0.45 | 0.2–1 | Metres between stitches |
| `game.drainRate` | 1 | 0.25–4 | Pool volume per second |
| `game.laserPower` | 1 | 0.25–4 | Laser damage rate |
| `game.laserHeat` | 6 | 2–20 | Seconds to overheat |
| `game.stabilizer` | 18 | 5–50 | Base vitals per dose |
| `game.clipSeconds` | 8 | 2–30 | How long a clip holds a flap |
| `game.giftBase` | 3 | 1–10 | Gift's base seconds |
| `game.giftPerBeat` | 1.5 | 0–5 | Seconds added per good beat |
| `game.stillRate` | 0.25 | 0.05–1 | Field time in Stillpoint |
| `game.pulseHeal` | 1.5 | 0–5 | Vitals per clean action in Second Pulse |
| `game.strainHp` | 1 | 0.25–4 | Multiplies strain health |
| `game.strainSpeed` | 1 | 0.25–3 | Multiplies strain movement |
| `game.strainDamage` | 1 | 0–3 | Multiplies strain hits |
| `game.telegraph` | 1 | 0.25–3 | Multiplies telegraph time |
| `game.coopHp` | 0.6 | 0–2 | Extra strain health per extra surgeon |

---

## Appendix B: what this plan's research found

The source is a 2006 Wii remake of a 2005 DS game: instruments picked on a radial with the Nunchuk stick and used with the pointer, operations lost when vitals or time run out, a star-drawn time-slowing gift, a second doctor whose gift differs, and a melodramatic medical thriller. Reviewers praised the controls and criticised difficulty spikes, repetition, text-heavy pacing, the star's reliability, distance from patients and the lack of multiplayer. Details beyond that were not confirmed; this plan does not depend on them. Any more research is your choice. References: https://en.wikipedia.org/wiki/Trauma_Center:_Second_Opinion, https://en.wikipedia.org/wiki/Trauma_Center:_Under_the_Knife.
