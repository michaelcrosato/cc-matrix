# PLAN: the game

The game director's plan. You build from it without being able to ask me anything, so it settles every creative and
technical choice TASK.md leaves open. Build this game; don't re-decide it.

## 0. How to use this plan

- **TASK.md wins** on everything it states: your deliverable's file name, your dev folder's name, the date, the model and
  effort values, the exit interview's file name and shape. This plan never repeats those, because yours differ.
- **Words used here.** *Dev folder*: the subfolder TASK.md tells you to create; every path below is relative to it.
  *The deliverable*: the single HTML file TASK.md names, one folder above the dev folder. *The exit interview*: the JSON
  file TASK.md names, beside the deliverable.
- **[verified]** marks what I ran on this computer on 2026-11-04 with throwaway spikes, on engine commit `e7a1243`. If your
  clone is newer and something differs, trust the engine's error message: each one names its fix.
- **Read order.** §1 to §3 once, then §16 (setup, recipes, traps) before your first line of code, then follow §18's
  milestones and look up the rest as you reach it. §19 is the finish line.

## 1. The game in one page

**Pitch.** A 51-year-old insurance loss adjuster with a bad knee, a service pistol and an excellent tie is sent to a
fog-bound North Atlantic island where all 412 residents drowned, on paper, on the same night last March. They keep trying
to gut him. Shoot a knee, kick the crowd, sell the salvage, fit it all in the briefcase, keep the junior actuary alive,
and deny the claim.

- **Genre:** third-person action horror with a light economy, plus a co-op survival mode.
- **Perspective:** over the shoulder (the engine's `shoulder` camera). Cinematic cameras for the title, cutscenes and
  attract mode only.
- **Length:** 40 to 60 minutes for a first campaign, 15 for someone who knows it, plus a replayable 5-minute co-op round.
- **Tone:** a straight-faced B-movie. Dread in the fog, a pun after the kill.

**What makes it feel like its source, as mechanics (keep all five):**

1. **Every bullet is a decision.** You aim with your feet planted. Where you hit matters: a knee drops a foe, a head
   reels it, and either one opens a kick that scatters the crowd.
2. **Pressure in the open.** Slow, smart-enough crowds that flank, throw and grab. You retreat, spend a bullet, kick,
   reposition. Never a corridor of pop-ups.
3. **The briefcase economy.** Grid inventory, a beloved shady merchant, salvage to sell, guns to service, adaptive drops.
4. **Something new every ten minutes.** Each zone has a set piece that changes the rules.
5. **Camp with conviction.** A hammy villain on the island's loudspeakers, a dry handler on the radio, a hero who quips.

**Title.** Do what TASK.md says, first and silently: no file lists the 50 candidates. Put the winner in one constant,
`GAME_TITLE` in `labs/game/title.ts`, and everything reads it. Nothing in the story or dialogue mentions the title, so any
title fits.

## 2. Originality rules

TASK.md asks for an **original game inspired by the source**. Mechanics and genre carry over. Nothing else does.

- No names, characters, lines, monsters, maps, music, logos or UI layouts from the source or its series. No secret-agent
  rescue, president's daughter, Spanish village, cloaked merchant catchphrases, church bell that ends a siege, chainsaw
  man in a sack, lake monster, mine-cart course, typewriter saves or coloured-herb names.
- Every set piece in §4 is its own. Build it as written here rather than as remembered from anything else.
- If a line could be quoted as the source's, rewrite it. Melodies are newly written, never quotations.
- The source is named only where TASK.md requires it (About/Credits, the exit interview, your reply).
- No real brands, firms or places.

## 3. Story, cast, voice

**Setting.** The island of **Sallow Skerry**, North Atlantic, sometime after the war and before anyone had a decent
telephone. The sun has been almost setting since March. The village is **Orran's Rest**. The island's church is the
**Society of the Undertow**, which holds a life policy on every resident.

**The hook.** Four hundred and twelve death claims, one night, one beneficiary. Your firm, **Pelham & Grice Mutual
Assurance**, wants it verified. The first adjuster, a junior actuary, stopped filing expenses two weeks ago, which is how
they know something is wrong.

**The truth.** A sea parasite, **the Lodger**, lives in the skull of everyone on the island. The thing it serves, **the
Undertow**, collects the souls; the policies launder the money to pay for more ships. Late twist: Pelham & Grice
countersigned every policy. Head office is in on it.

| Who | What they are | How they talk | Use |
|---|---|---|---|
| **Desmond Quill** (he/him) | Hero. 51, Senior Loss Adjuster, ex-marine, bad knee. Trench coat, red tie, briefcase. | Deadpan. Treats horror as paperwork. | Player |
| **Wren Adeyemi** (she/her) | 24, junior actuary. Rescued mid-game. Quick, unimpressed. | Speaks in odds. | Escort partner |
| **Mrs. Thripp** (she/her) | Head of Claims, on the pocket radio. | Passive-aggressive memos. | Handler, then betrayer |
| **Prior Ambrose Goole** (he/him) | Cult leader, on the island's Tannoy loudspeakers. | Full ham. Loves the word "premium". | Final boss |
| **Harbourmaster Tolliver Brack** (he/him) | 5 m tall oilskin brute, an anglerfish lure growing from his chest, an anchor on a chain. | Few words, all threats. | Boss |
| **Mr. Lionel Sedge** (he/him) | Fraud Investigation. Quill's old partner, turned. Thin, polite, cane sword. | Silky insults. | Duel |
| **The Salvor** (he/him) | Merchant. Oilskin hood, dripping wet, rowboat, lantern, big grin. Always there before you. | Jolly, never explains. | Shop, comic relief |

**Voice rules.** All speech is gibberish audio (§13) with subtitles. Subtitles are always on, big and name-tagged. Write
the rest of the script in exactly this style. Keep lines short: a TV viewer reads them in two seconds.

```text
QUILL  Mr. Harrow? Pelham and Grice. I'm here about your death.
QUILL  (after the clerk attacks) I'll put that down as "contested".
THRIPP Mr. Quill, I remind you that ammunition is not an allowable expense.
GOOLE  (Tannoy) Mr. Quill! You arrive at last, clutching your little forms. Do you know what the sea charges for a soul?
GOOLE  (Tannoy) Everything. And it pays in full.
QUILL  Funny. That's what my ex-wife's lawyer said.
THRIPP Did you get a signature?
QUILL  (first Lodger bursts from a neck) Is that covered?
THRIPP Pre-existing condition.
WREN   You're late.
QUILL  There was a queue.
WREN   Seventy-three percent chance that door is a bad idea.
QUILL  And the other twenty-seven?
WREN   Worse door.
SALVOR Come in out the wet, friend! Not that it makes a difference.
SALVOR Found it, fixed it, flogged it.
SALVOR That'll be dear.
SALVOR Mind the tide.
SEDGE  Still doing it by the book, Desmond? I ate the book.
BRACK  Harbour dues.
GOOLE  You cannot insure against the tide!
QUILL  No. But I can cancel your policy.
THRIPP Head office regrets to inform you that your claim has been denied.
QUILL  Consider this my notice.
```

Kill quips (rare, on a 25 s cooldown, never during a subtitle): "Policy void." "You're not covered." "Read the small
print." "That's what we call a total loss." "Your premium's gone up." "Non-refundable." Quill straightens his tie after a
big fight: that is his signature gesture (§12).

Game over is a rubber stamp, **CLAIM DENIED**, with a cause of loss chosen by what killed you ("Cause of loss: gaff.",
"Cause of loss: anchor.", "Cause of loss: beneficiary mislaid.").

## 4. The world and the campaign

**One connected island, one scene.** A running page cannot switch scenes (`APP_OTHER_SCENE`) [verified], so the campaign
is a single site, `site:skerry`, about 360 × 360 m, with every zone standing in it and gates between them. A 320 m site
with 41 buildings reached `ready` in 26 s on the software renderer [verified], which a real GPU beats easily. Teleports,
dev-mode jumps, saves and attract mode all use the same world with no reload.

```text
                         N: cliffs and open sea
   Lighthouse (110,20) -- Causeway -- Abbey of St. Orran (250,40) -- Funicular top (300,40)
                                                                       |  cliff
       Marsh chapel (55,130)        Brack's Cannery (150,110) -- Funicular foot (230,110)
             |                             |
       Marsh path (70,170) ----------------+
             |
       The Shingle (90,262) ---- Orran's Rest Square (180,240) [the beached trawler]
                                           |
                                     Fish Lane (180,285)
                                     Harbour Office (180,312)
                                     The Slip (180,340)
                         S: open sea
```

Coordinates are x east, z south, in metres, and are guides. Paths are 6 to 10 m wide, walled by low walls, nets, boats and
rock, with lockable gates so the story stays linear while the island feels whole. Stand the terrain 3 m under the sea
plane and raise the land with `hills`, so the shoreline comes from the terrain; `flats` level each zone.

**The beat sheet.** Beats are data (§16.2). Each has a zone, a trigger, what it spawns and says, and an exit condition.

| Beat | Zone | What happens | Teaches |
|---|---|---|---|
| Cold open | Slip | Rowboat cutscene in fog. Stamp card: *Claim No. 00417*. Thripp's briefing. | Radio, subtitles |
| The Slip | Slip | Walk the pier. Gulls, wind, a distant foghorn. | Move, look, run, use |
| Harbour Office | Office (2 storeys) | Clerk Harrow at his desk: "here about your death". He attacks. Then two more. Filing cabinet, rum, ammo. | Aim, fire, knee, kick, reload, save, Case, pick up |
| Fish Lane | Lane | Three Parishioners among drying racks. Breakable crates, first salvage. Opens on the Square. | Crowd spacing, breakables, loot |
| **The Mary Constance** | Square | §4.1, the first set piece: a siege on a beached trawler. | Everything under pressure |
| Foghorn | Square | The horn sounds. Every foe stops, drops its tool, turns and walks into the sea. Silence. Quill: "I'll need that in writing." Harbour key. | Dread |
| The Salvor | Shingle | First shop. Claims Practice shooting gallery. A seal in a net (free it, or don't). Glass floats start. | Buy, sell, service |
| Marsh path | Marsh | Thick fog on plank walks. Bog Hounds, gin traps, tripwire charges, Netwives on stilts throwing hatchets. Flare pistol on a corpse. | Shoot projectiles and traps |
| Marsh chapel | Chapel | First head-shot burst: a Lodger whips out of the neck ("Is that covered?"). A Deacon chanting. Ledger page. Cabinet. | Lodgers, flares, priority targets |
| Cannery yard | Cannery | Outdoor brawl among stacked barrels of fish oil. Second Gutter. | Fire, hazards |
| Cold Store | Cannery | Wren in a locker: "You're late." Escort begins. | Wait, follow, hide |
| The Line Floor | Cannery | Conveyors and rail hooks. Foes carry Wren toward the tide chutes. Hatchmen with shields. Boost up a ledge. | Rescue, shields, flanking |
| **The Hoist** | Cannery | §4.2: Wren cranks for 60 s while you hold the gantry. | Defending a partner |
| **The Gutting Floor** | Cannery | §7.3: Harbourmaster Brack. The freed seal comes back. Shotgun or rifle reward. | Boss weak points |
| Loading bay | Cannery | Salvor again. Thripp sounds wrong on the radio. | Breather |
| **The Funicular** | Cliff | §4.3: a moving-platform shootout, then a jump prompt when the cable snaps. | Prompts, moving aim |
| Cloister | Abbey | Deacons, Hatchmen and Whips by lantern light. Cabinet. | Mixed crowds |
| **Records Vault** | Abbey | Ledger dial puzzle with Wren. The reveal: Pelham & Grice countersigned everything. | Puzzle, story turn |
| **The Audit** | Abbey | §7.3: the duel with Mr. Sedge. | Parry mastery |
| Notice given | Abbey | Thripp's betrayal call. Salvor on the steps. | Story |
| **The Causeway** | Causeway | §7.3: tide rising, Prior Goole, then the Undertow. Lighthouse beam, Whaling Gun. | Finale |
| Paid in full | Sea | Rowboat out at last light. "Mark it paid in full." Results, rank, *Thank you for choosing Pelham & Grice.* | |

**Collectibles.** 16 pieces of salvage (some take gems, worth more combined), 12 glass net floats to shoot (all 12 earn a
Salvor reward), 6 ledger pages (3 are required), 5 Thripp memos (jokes). A purchasable Chart pins salvage on the map.

### 4.1 The Mary Constance: the trawler siege

The game's signature scene. A wrecked trawler has been hauled up a slipway into the middle of the Square as a shrine, with
candles along the rails and a bonfire at her bow. Eight cottages ring the Square; two can be entered, with loot upstairs.

- **The ship.** Hull about 24 × 8 m. Deck at 2.4 m with a railing, a wheelhouse at the stern (door, windows, a ladder to its
  roof at 4.8 m), a hold hatch. Collision comes from a level; the hull's curved look comes from props.
- **Boarding points.** Four gangplanks, two a side, plus a stern ladder. Foes path to a plank's foot, walk up it, and hop the
  rail. This is scripted movement between the ground's nav and the deck's, so no nav over ramps is needed.
- **Kick the plank.** Prompt at a plank's top: it falls, with anyone on it. Foes re-lay it after 25 s. This is the
  scene's main tool, and it turns a siege into a rhythm.
- **Winch nets.** A cargo net of crates hangs over each side. Shoot the cable or pull the lever: 6 m crush, one use each.
- **Over the side.** Vault the rail anywhere. Running to a cottage for ammo with the crowd behind you is the scene's best
  moment. Oil drums on the slipway burn.
- **Flow.** Arrival: Quill walks in during the sermon, Parishioners kneeling round the fire with their backs to him,
  Goole on the Tannoy. Then they turn. 14 on the field at most, spawning from six alleys out of sight. Netwives from
  minute 1. The Gutter at minute 2, heralded by his saw engine from far off. **No visible timer.** The horn sounds at
  3:00 or at 40 kills, whichever is first. Killing the Gutter is optional and pays well.

### 4.2 The Hoist

The gantry over the Line Floor. Wren cranks a fish hoist for 60 s (a progress bar on her). Foes come up two ladders and over
a conveyor. Anyone who reaches her stops the crank until you hit them. Rail hooks can be shot loose to swing through a
lane. Wren calls flanks with odds: "Left ladder. Eighty percent."

### 4.3 The Funicular

A fish-hoist car on a cliff cable, 90 s from foot to top, with a `driveMover` kinematic platform carrying riders. You stand
on the deck and aim freely as Parishioners leap from gantries and Netwives throw from ledges; Wren works the brake. At the
top the cable snaps: a large jump prompt, then a scramble up a ladder with the car falling away behind you. Failing the
prompt costs a checkpoint, not much else.

### 4.4 Small things

- **Claims Practice** (Shingle): a coin-op gallery on a rotten pier, the Salvor's pride. 60 s, cardboard claimants on tracks
  (`defineThing`, `spawnThing`), hit the frauds, spare the widows. Score pays shillings, and beating it gives a free
  Firepower level. Enter and leave through a prompt, in the same world.
- **Glass floats:** 12 blue glass net floats hung about the island. They shatter when shot (`addBreakables`). All 12: the Salvor
  gives you a rare gem worth 5,000. Progress shows in the Claim File.
- **The ledger dials** (Vault): three big number wheels, one on screen at a time. The numbers are in the 3 required ledger pages,
  which Wren reads aloud on request. Left and right pick a wheel, up and down turn it, mouse clicks and wheel too.
- **The seal:** a grey blob-rig seal in a net on the Shingle. Shoot the net rope to free it, and it barks and flops off. Payoff in §7.3.

## 5. Player verbs and controls

Quill walks and runs, never jumps. Vaults, ladders, kicks and doors are context actions on one button.

| Action | DualSense (Xbox glyphs) | Keyboard and mouse | Engine action |
|---|---|---|---|
| Move | Left stick | W A S D | `forward back left right` |
| Look | Right stick | Mouse (pointer lock) | |
| Aim, hold (feet plant) | L2 (LT) | Right mouse | `aim` |
| Fire, only while aiming | R2 (RT) | Left mouse | `fire` |
| Use, kick, vault, climb, open | Cross (A) | E | `interact` |
| Letter opener: slash, or parry if timed | R1 (RB) | F | `melee` |
| Run, hold | Circle (B) | Left Shift | `sprint` |
| Reload | Square (X) | R | `reload` |
| Case | Triangle (Y) | Tab | `case` (view action) |
| Wren: tap stay or follow, hold to hide | L1 (LB) | G | `partner` |
| Quick turn 180° | R3 | C | `quickturn` |
| Swap shoulder | L3 | V | `shoulder` (view action) |
| Next and previous weapon | D-pad right and left | Wheel, or 1 to 5 directly | `weaponNext weaponPrev weapon1…5` |
| Ready a throwable (aim shows the arc, fire throws) | D-pad up | Q | `throwable` |
| Drink the best heal | D-pad down | H | `heal` |
| Claim File (map, objectives) | Create (View) | M | `map` (view action) |
| Pause | Options (Menu) | Esc | system `pause` |

Engine codes: Cross `PadSouth`, Circle `PadEast`, Square `PadWest`, Triangle `PadNorth`, L1 `PadLeftShoulder`, R1 `PadRightShoulder`, L2
`PadLeftTrigger`, R2 `PadRightTrigger`, L3 `PadLeftStick`, R3 `PadRightStick`, D-pad `PadUp PadDown PadLeft PadRight`, Create `PadSelect`,
Options `PadStart` (the system `pause`), sticks `PadLeftStickUp` and so on, wheel `WheelUp` `WheelDown`, mouse `MouseLeft` `MouseRight`.

With keyboard and mouse, when not aiming, a left click on a thing whose prompt is showing uses it. Everything rebinds on
the Controls screen (`input.bindings.rebind`, `input.listen`, kept by `createEngine({ store })`). In a hub session the game
ignores Options while Create is held, since that chord is the hub's.

**Feel targets.** Run 3.4 m/s, sprint 5.2 m/s. Aim raise 0.22 s. Planted while aiming, turning with the view. Shot response
on the same step. Quick turn in 0.25 s (feed it through `cameraInput`). Camera arm 2.8 m, pulling in to 1.5 m while aiming.

**Laser sight.** The red laser is the game's cursor: there is no crosshair. A line from the muzzle to a glowing dot where
the shot will go, with a small wobble (≤ 0.3°, less with Handling upgrades, added to the camera's look so it affects `aim`).
§16.4 says how to draw it.

**Aim assist (pad only, Settings, on by default).** While the centre ray is on a foe, stick look slows by 45%, plus a pull of at
most 2°/s toward the foe's chest. Never for the mouse.

## 6. Combat

### 6.1 Hit zones and reactions

A shot is a ray. Work out the zone from where the ray met the capsule, relative to the actor's feet, shifted by its state
(a kneeling foe's head is lower). Scale by build for big bodies. A zone-from-height check works [verified: head, torso and
legs all came back correct].

| Zone (height ÷ standing height) | Damage | Reaction |
|---|---|---|
| Head (above 0.80) | ×2.4 | **Reel**, 0.9 s: clutches its face. Kick window. |
| Torso (0.33 to 0.80) | ×1 | Flinch, 0.25 s. A thrower's throw is cancelled. |
| Arm (torso height, far from the axis) | ×0.6 | Drops its weapon: it picks it up (2 s) or claws. |
| Legs (below 0.33) | ×0.7 | **Kneel**, 1.2 s. Kick window. |

**Kick (Cross/E on a reeling or kneeling foe within 2.2 m).** Roundhouse, 70 damage in a 2 m radius. Everyone in range goes
down as a ragdoll, gets up after about 2 s. Hero is invulnerable for 0.6 s; 80 ms hit-stop and a camera shake. This is the
game's central pleasure: guard it and make it land hard.

**Slash (R1/F).** 18 damage, 0.45 s, breaks crates, hits downed foes for ×2. **Parry:** a press in the 0.2 s before a melee
hit lands negates it and reels the attacker. Sparks and a clang; 120 ms hit-stop.

**Grabbed.** A foe can grab you (10 damage, then 4 a second): waggle or mash to break out (§6.3). Other foes get free hits.

**Lodger burst.** A foe killed by a head shot may burst into a Lodger Whip. The chance is `game.burst`, set per zone: 0 in the
village, 15% in the Marsh, 30% in the Cannery, 45% at the Abbey. You never know, so head shots stay a gamble.

### 6.2 Weapons

Fired by a **game-owned `game.guns` system** on the engine's `weapons` component, not the engine's `addWeapons` (§16.3 says why).

| Weapon (flavour name) | Case cells | Mag | Shots/s | Damage | Reload | Notes | Price |
|---|---|---|---|---|---|---|---|
| Company Issue pistol, "The Deductible" | 3×2 | 10 | 3.2 | 28 | 1.4 s | Start weapon | free |
| Pump gun, "Full Coverage" | 6×2 | 6 | 1.0 | 8 × 11 | 0.55 s a shell | 5° cone, pushes groups back | 1,800 |
| Bolt rifle, "The Long Policy" | 8×2 | 5 | 0.9 | 85 | 2.6 s | Scoped: aiming zooms in (`zoom`), pierces 2 | 3,500 |
| Trench gun, "Premium Rate" | 4×2 | 30 | 11 | 12 | 2.2 s | Automatic, climbing recoil | 6,000 |
| Flare pistol | 3×2 | 1 | 1.0 | 15 + burn 40 over 4 s | 1.6 s | Kills a Lodger Whip outright, lights oil | found |
| Letter opener | n/a | | | 18 | | Always on hand | |
| Whaling Gun | story | 1 | | 5,000 | | Finale only (§7.3) | 1 shilling |

Throwables, each with an arc preview: **Oil Bomb** (1×2, a fire pool for 5 s), **Magnesium Flash** (1×1, stuns within 8 m for
3 s, kills exposed Lodgers), **Limpet Charge** (1×2, frag). Foes' thrown hatchets can be shot out of the air.

Draw guns bigger than life (about 1.3×) so they read at 10 feet.

### 6.3 Prompts under pressure

One small `qte` system: a prompt has a glyph, a window, and a result on success and failure. Three types: **press** (one button
in a window), **mash** (fill a meter), **parry** (any `melee` in a window). Drawn huge at screen centre with a shrinking
ring. Used for the funicular jump, breaking grabs, Sedge's lunges, the finale. A dev slider scales every window.

### 6.4 The Risk Rating (hidden dynamic difficulty)

A hidden 0 to 10 score, `game.risk`, in the sim. Accuracy, kills without damage and speed push it up; deaths and being
hit push it down. It scales foe aggression, attacker tokens and damage by ±15%. Settings' difficulty (Lenient, Standard,
Punitive) sets its range and base numbers. The results screen reveals it as a joke: "Risk rating: uninsurable".

## 7. Enemies and bosses

Humanoids are **actors**, not crowd agents: 80 animated actors with clips cost about 5 ms a step [verified], and actors
get the rich reactions, clips and ragdolls that make hits read. Hounds and Leeches use the engine's crowd rigs.

### 7.1 The roster

| Foe | HP | m/s | Attack | Special | First seen |
|---|---|---|---|---|---|
| **Parishioner** (oilskins, knit jumper; gaff, oar, gutting knife) | 100 | 1.25 to 1.6 | Swing 18, wind-up 0.7 s; grab | The bread and butter. Mutters scripture. | Office |
| **Netwife** (apron, headscarf) | 80 | 1.2 | Hatchet 15, arcing at 12 m/s | Keeps 8 to 14 m. Hatchets can be shot down. | Square |
| **The Gutter** (rubber apron, a lobster pot over his head, a motorised flensing saw on a pole) | 900 | 1.9 | Sweep 60; a grab kills below 35 HP | Engine noise from far off. Stagger only by head or knee. Pays 2,500. | Square |
| **Bog Hound** (quadruped rig) | 60 | 5.5 | Leap bite 12 | Packs of 3 to 5. One shot staggers. | Marsh |
| **Lodger Whip** (a burst Parishioner: headless, a lamprey lashing from the neck) | 140 | 1.4 | Lash 25 at 4.5 m, telegraphed | Body shots ×0.5. Flare or flash kills at once. | Chapel |
| **Leech** (blob rig) | 8 | 3.0 | Latches on, 3 a second | Comes from dead Whips; mash to shake off. | Cannery |
| **Deacon** (hooded robe, lantern) | 150 | 1.0 | Staff 12 | Chanting speeds foes within 12 m by 30%. Runs from you. Kill him first. | Chapel |
| **Hatchman** (hatch-cover shield) | 130 | 1.1 | Shove 20 | Shield blocks the front torso. Knees and head are open; flank him. | Line Floor |

### 7.2 Foe behaviour

States: `idle` (work or pray), `alert` (a shout, 0.5 s), `approach`, `windUp`, `strike`, `recover`, `reel`, `kneel`, `down` (ragdoll),
`getUp`, `grabbing`, `carrying` (Wren), `vault`, `dead`.

- **Pressure, not swarm.** A ring round the player (`approachRing`) with an assigned angle each, so they flank. At most 2
  melee attackers at a time, through attack tokens (`takeToken`, `releaseToken`), scaled by `game.risk`. The others shuffle and
  close, so the crowd looks hungry but the player stays fair.
- **Add separation steering** (a spatial hash, repulsion within 0.9 m): actors do not push each other.
- **Awareness** through `sense` and `Noise`: gunshots alert within 30 m; sight 25 m in a 110° cone; fog is no excuse.
- **Paths** through `createSiteNav` flow fields (§16.5). Doors: foes bash and break them (`strikeDoor`). Windows and low walls:
  scripted vaults with `ClimbUp_1m`.
- **Telegraph everything that hurts:** an arm raised and a grunt at least 0.6 s before any swing. Big attacks also draw an
  engine floor telegraph (`telegraph:arc`, `ring`, `line`).
- **Corpses:** keep 30 ragdolls, then remove the oldest out of view (`removeActor`).

### 7.3 Bosses and the duel

**Harbourmaster Brack (The Gutting Floor).** 3,200 HP, a 30 × 30 m open floor under the sky. `build:giant`-style, 5 m tall
(size 2.7 worked) [verified].
- Attacks: anchor throw and drag along a line, 45; chain sweep in an arc, 45; slam in a ring, 35. All telegraphed.
- Weak point: when he roars, the anglerfish lure on his chest opens for 2.5 s. Hits on it are ×3. Three hits and he kneels;
  a kick prompt tears at it for 200.
- Hazards: four hanging oil lamps. Shoot one when he stands under it: 300 damage and a stagger.
- At 50% he summons four Parishioners and speeds up. At 30%, if you freed the seal, it bursts in and bites his leg for a
  3 s stun (blob rig, grey). Reward: the gun you do not yet own, and "Harbour dues. Paid."

**Mr. Sedge (The Audit).** 1,100 HP in the Records Vault, a maze of shelf lanes, paper blowing. He deflects bullets with his cane
unless stunned. He hides, lunges in 2 to 4 hit combos; each lunge is a parry prompt. Three clean parries stun him for
2 s: shoot or kick now. Miss a parry: 22 damage. He also taunts on the Tannoy line, having cut in. It is the exam for the
parry system, so make the parry feel wonderful.

**Prior Goole, then the Undertow (The Causeway).**
- *Phase 1, 1,500 HP, the Prior.* A long stone causeway with the tide rising to the ankles (slower run). He walks through fog
  (vanishing and reappearing) and calls up Whips. Monologue over the Tannoy throughout.
- *Phase 2, 5,000 HP, the Undertow.* He falls into the sea and rises 6 m tall, on a giant build with hanging tendril chains.
  Wave slam (line telegraphs across the causeway), tendril sweep, brine spit (`SHOT_EMITTER` volleys). Wren turns the lighthouse
  lens from the tower; the beam sweeps the causeway. When it hits him he recoils and his heart opens for 4 s (×2.5). Leeches
  go for Wren: if she stops, the beam stops.
- *Phase 3, below 25%.* The Salvor rows up mid-battle: "Special offer, friend!" He sells you the **Whaling Gun for 1 shilling**. It takes
  a planted aim and one harpoon. Hit the open heart to finish, with a mash prompt to reel him in. Miss, and the next
  harpoon costs twice as much. "That'll be dear." Then the pun, the explosion, the rowboat.

## 8. The briefcase economy

### 8.1 The Case

A grid inventory, played on a TV. The game pauses while it's open.

- **Grid:** 10 × 6, buying 12 × 7, then 14 × 8. Items have footprints and rotate. Weapons, ammo, heals and throwables go in the grid.
  Salvage and keys go in a separate File tab and take no room.
- **Controls:** D-pad or left stick moves a big cursor. Cross lifts and places, Triangle rotates, Square uses or equips, Circle backs out.
  **Mouse:** hover moves the cursor, click lifts and places, right click or wheel rotates. Keys: arrows or WASD, Enter, R, Esc.
- **Combining:** lift one item and place it on another to mix. Rum + Kelp = Grog. Grog + Samphire = Tonic. Gems into salvage.
- **Autosort** button. A pickup that doesn't fit opens the Case with the item on the cursor: fit it, or leave it.
- **Cells are at least 64 px at 1080p.** One info pane, three lines, big type. Never a data table.

Keep the grid logic in a pure, tested module (`labs/game/scenes/caseGrid.ts`). The state lives in a component on the player;
each change is a scene dev action (`__engine.actions.run('case', op)`), so replays hold it.

### 8.2 Items

| Item | Cells | Effect |
|---|---|---|
| Rum | 1×2 | +25 HP |
| Kelp | 1×1 | +35 HP |
| Grog (Rum + Kelp) | 1×2 | Full heal |
| Samphire | 1×1 | Alone, nothing. Mixed into Grog: Tonic |
| Tonic | 1×2 | Full heal, max HP +10 |
| Pistol rounds ×10, flare ×3, rifle ×5 | 1×1 | |
| Shells ×6, trench rounds ×30 | 2×1 | |
| Salvage | File tab | Sells for 300 to 5,000 shillings |

### 8.3 The Salvor's stall

A lantern-lit stall of crates and wreckage in three places (Shingle, Loading bay, Abbey steps), each with a filing cabinet near
by. **Buy, Sell, Service, Organise.** Shows one item at a time with a large model-free card: name, price, one line of patter.

- **Currency:** shillings. Income across a campaign should be about 25,000.
- **Service (upgrades):** Firepower, Reload, Capacity, Handling, four levels a weapon, rising 800 to 5,000. Fully serviced
  weapons earn one perk each (pistol: head shots sometimes crit ×5; pump gun: wider push; rifle: higher pierce; trench gun: no climb).
- **Larger Case:** 2,500, 6,000. **Chart:** 500.

### 8.4 Adaptive drops

Crates and fallen foes drop what you lack. Each drop rolls an item or shillings, then weights by need: ammo for your equipped
gun when under 1.5 mags, heals when HP is under 50%, shillings otherwise. Never drop ammo for a gun you don't own. Named stream
`drops`. Keep one rule: the player should feel lucky, and always be one bad decision from ruin.

### 8.5 Saves

- **Filing cabinets** in each zone: "File your report" (three manual slots). The room is safe and quiet, with its own music.
- **Autosave checkpoints** at zone gates and boss doors. Game over offers Retry from checkpoint, Last filed report, Main menu.
- A save is compact JSON (version, beat, flags, HP, Case, shillings, service levels, collected sets, stats, seed), kept with
  `createStore` (localStorage, which survives a reload on `file://` [verified]). Load is `inspector.seed(n)` and then a `load` dev action. Captures are
  not saves: `restore` refuses foreign ones.

**Results screen** at the end: big single numbers, one at a time: time, accuracy, kicks, head shots, deaths, salvage, rank (A to D,
with a stamp), Risk Rating.

## 9. Wren

An actor with `player: false`, 60 HP, who follows at 2 m through the nav. Shots pass through her; she ducks when your laser
crosses her and says "Oi." Hurt or carried, she shows on a small name bar top right.

- **Commands (L1/G):** tap toggles *Stay close* and *Wait here*. Held near a locker, barrel or hatch: *Hide*, and she climbs in,
  safe, muffled commentary. Tap to call her out. In waits and hides she's a problem you've parked, and you must come back.
- **Grabbed and carried.** A foe near her lifts her (`Walk_Carry_Loop`) and walks toward the nearest exit or chute at 1.4 m/s.
  A marker shows. Hit him enough and she drops. If he reaches it, or she dies: **CLAIM DENIED. Cause of loss: beneficiary mislaid.**
- **She helps.** Calls flanks with odds and an on-screen ping. Boosts you up marked ledges (prompt for both). Cranks the hoist and
  the lens. Reads the ledgers. She finds ammo sometimes: "Ninety percent sure this is yours."
- **Fair:** she must never stand in a doorway you need. When you back into her, swap places. Foes prefer her only if you've
  left her alone over 10 m away.

## 10. Last Stand: co-op and the hub

**A 5-minute co-op survival round on the Mary Constance**, for 1 to 4 players, and the game's AI Hub session mode. It reuses the
Square. Menu entry "Last Stand" plays it solo in `game:world` with no reload, with up to 3 AI "temps" you may hire (a simple bot on the same
replica path, which also serves attract mode). There is no network outside a session: that's what "the game on its own" means in the hub's
protocol (`connect()` answers `null` and the game plays alone).

### 10.1 The round

- **Five waves over 300 s**, ending with the foghorn: everyone standing wins. Budgets: 14; 22 with Netwives; 26 with Hounds; 30 with Whips;
  34 with the Gutter. Multiply by `0.7 + 0.3 × players`. At most `14 + 4 × players`, capped at 24 on the field.
- **Loadout:** pistol, pump gun, 2 rum. Supply crates land in each 15 s lull. Planks and winch nets work as in the campaign.
- **Downed, not dead:** at 0 HP you crawl for 30 s; a teammate holds Cross for 2.5 s to revive you at 40 HP. Bled out: back next wave at 50 HP. All down at
  once: the round is lost. Solo gets one second wind.
- **Score:** kill 100, head shot +50, kick kill +75, revive +150, multiplied by a streak (×1 + 0.1 a kill, lapsing after 6 s).
- **Each player's coat trim and armband** take the seat's colour (`#e8443a`, `#3b82f6`, `#22c55e`, `#f5b700`), and a name label floats
  over each. Names come from the hub and go in as text, never HTML.

### 10.2 The hub protocol: exact requirements

Read the protocol itself once: `https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/README.md`. Don't clone that
repository (it is over 5 GB). `curl -fsSO` what you need from `https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/`:
`harness.html`, `bridge.js` and `round.js` into a folder under `out/`; `examples/arena.html`, a small shared-world game, to read; and
`session.js`, saved as `labs/game/net/session.client.txt` so lint leaves it alone. (The hub replaces an unmodified client with each new version.)

```html
<!-- right after <meta charset>, first script in <head>, pasted unmodified: the bundler does this (§16.6) -->
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="6">
<meta name="hub:session-goal" content="Hold the square together until the foghorn">
<meta name="hub:session-howto" content="Move: stick/WASD. Aim: L2/RMB. Fire: R2/LMB. Kick: X/E. Reload: Square/R">
<meta name="hub:webgpu" content="required">
```

- `AIHub.active` true: **no title, menu or attract**. Straight into the round. `await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true })`.
- **Own card**, in the world: slow orbit of the trawler at dusk, the title, each player in their colour with a ready tick, how to win, this player's
  controls, the countdown from the `card` event. Cross or Enter is `AIHub.answer('ready')`, Triangle or T is `AIHub.answer('more')`, and a tap or click on the card works too. It changes nothing in the round. **Listen for Enter with a plain `window` `keydown` listener added right after `connect()`, not through frame-sampled input:** the harness pokes Enter into the frame and allows 3 s, and frames are slow on the software renderer. Poll the pad in `requestAnimationFrame` here too.
- `AIHub.ready()` once `createEngine` resolves, with no key press. **The harness waits only 20 s for this** (§16.7).
- Play starts when `AIHub.time() >= 0`. A shared world finishes through the host: `AIHub.finish({ standings, scores, won, stats, awards })`, with a last reliable
  snapshot first. `time-up` means finish now, within `graceMs`.
- `end`: stop input, stop sound, stop the engine. `leave`: remove that player's actor. If no WebGPU: `AIHub.fail('WebGPU required')`.
- **No** `alert`, `confirm`, `prompt`, `window.open`, navigation, sockets, `fetch` or chat. Options opens a small Settings overlay only; the round keeps running.
- `AIHub.server` true (host with no player): run the world, no local player, input or card, and no heavy drawing beyond what the engine does.

### 10.3 Netcode

Host-authoritative for the world, client-authoritative for each player's own body. It is the pattern of the protocol's `examples/arena.html`.

```text
Client -> host  {t:'me', at, x,y,z, yaw,pitch, st, w}          12 Hz, unreliable, to the host
Client -> host  {t:'shot'|'kick'|'use'|'rev', at, ...}         reliable, as they happen, at most 8/s
Host  -> all    {t:'s', at, wave, left, p:[...], f:[...]}      10 Hz, unreliable, at most 1,200 bytes
Host  -> all    {t:'e', ev:[[code, ...args], ...]}             reliable batches, at most 8/s
```

- **Budget:** at most 20 messages a second leave a copy, 16 KB each. An unreliable message over 1,200 bytes is lost whole if any packet is. A foe is about
  28 bytes (`[nid, x·100, z·100, yaw·10, hp%, state, kind]`), so 24 foes fit. Past that, send alternate foes in alternate snapshots.
- **Your controls never wait.** Your own actor moves locally. Your shot raycasts locally against what you see, with instant tracer, sound and hit marker; the host
  applies damage from the `shot` message. In co-op, trust the client: no anti-cheat.
- **Replicas are actors on both sides:** spawned from events, moved by steering. Each step: `move` toward the latest snapshot position, scaled by distance; a snap past 1.5 m. Foes' states
  pick clips and reactions. Ragdolls may differ between copies; nobody will mind.
- **Sim boundary [verified].** The sim never touches the network. Page code gathers each frame's messages and hands them over as a custom intent:
  `engine.input.virtual.axis('game:net', { seq, msgs })`. A `net` system in phase `intents` applies each `seq` once (axes hold until changed). The same page reads
  outgoing sim events from `frame.world.events.trace()` and sends them. This keeps "the page never writes the sim" and makes host runs replayable.
- **Roles** come in as a setting: `game.role` = `solo`, `host`, `server` or `client`. On a client, AI, spawning and hazards do not run; `net` drives everything but the local player.
- **Use a transport interface** (`send`, `on`, `me`, `players`, `isHost`, `time`), with `AIHub` behind one implementation and an in-memory one with seeded latency and loss behind another, so
  host and client sims can be tested together in Vitest with no browser (§17).

## 11. UI and UX: 10-foot, controller first

Designed for a DualSense on a TV at 10 feet. Keyboard and mouse get the same screens and feel native on them.

- **Look: a claims department in a storm.** Manila folders, carbon paper, typewriter text, red rubber stamps. Pause is a folder. Game over is a stamp. The shop is chalk on a crate lid.
  Fonts are CSS stacks only: `"Courier New", monospace` for forms, `Georgia, serif` small caps for headings. No font files.
- **Scale.** All UI sizes come from one scale, `min(innerWidth / 1920, innerHeight / 1080)`. At 1080p: body text at least 34 px, smallest text 28 px, subtitle 40 px, menu rows at least 56 px tall, at most 7 rows showing. 5% safe margin all round.
- **No dense screens.** One column of choices, one detail pane, big single numbers. If a screen looks like a web page, redo it.
- **HUD.** Bottom right: ammo as `10 / 42`, 96 px, with a weapon silhouette. Bottom left: health as a large stamped word and bar: **INSURED** (teal, 60%+), **UNDERINSURED** (amber), **UNINSURABLE** (red, pulsing, under 30%).
  Top left: objective for 6 s when it changes. Centre: the prompt, at 64 px glyph and 44 px text. Top right: Wren. Direction arcs when hit. It fades in calm moments.
- **Prompts follow the last input used.** PlayStation glyphs for a pad by default, with a Settings option for Xbox (A B X Y), keycaps and mouse icons otherwise. Draw the glyphs as inline SVG. Write `glyphFor(action)`: `input.bindings.codes(action)`, filtered with
  `deviceOf`, by **your own** last-device tracker, from keydown, pointer and a poll of `navigator.getGamepads()`. Don't use `input.lastDevice`: it reads `virtual` whenever the game feeds the virtual device (netcode, attract), and prompts fall back to the keyboard [verified].
- **Menus.** `createMenu` for lists (hover moves focus and a click picks, built in), themed with CSS over `.ui-panel` and `.ui-menu`. Add W and S to its arrows. `createPadCursor` is available for odd panels. While a menu is up: `inspector.pause()`, `modal: () => true`; the mouse cursor shows and pointer lock is released. Starting play shows "Click to aim" until the lock is taken.
- **Touch-only devices** (`matchMedia('(hover: none) and (pointer: coarse)')` with no pad connected): no touch controls at all. Always pass `touch=off` [verified: no touch UI appears]. Show "Controller or keyboard required" and a Settings button. Attract mode runs behind it. A pad connecting or a key pressed dismisses the gate. **Build the gate in plain DOM, created before `createEngine`,** since `engine.ui` is null when the renderer can't start. A Chromium phone profile on `file://` has WebGPU and runs attract [verified]; the WebKit iPhone profile has no WebGPU at all [verified], so there the gate shows over a dark page with no attract, and the engine's own error overlay stays hidden.
- **No WebGPU, not touch:** a styled message saying which browsers have it (Chrome or Edge, recent Safari). No WebGL fallback.
- **Dialogue and cutscenes.** `createDialog`: `modal: false` with `auto` for radio, Tannoy and barks, so play goes on; modal for the shop patter and story talk. Cutscenes run in the world, with own cameras (`node x new camera`, `camera.set(code, { blend: true })`), `modal: () => true`, a letterbox through `post.combine`, and always skippable (hold Circle or Esc). Keep them short: 20 s at most, and most are under 10.

**Screens:** splash ("Pelham & Grice Mutual Assurance presents") · title (New Claim, Continue, Last Stand, Settings, Controls, About) · pause (Resume, Case, Claim File, Settings, Controls, Dev Mode, Retry from checkpoint, Main menu) · Case · Claim File (objective, a paper map drawn in SVG with pins, memos) · shop · Settings · Controls · About/Credits · dialogue and subtitles · game over · results · Dev Mode · touch gate · hub card.

**Settings:** volume sliders with the music at **10% by default** (§13); difficulty; pad glyphs (PlayStation or Xbox); look sensitivity and invert for stick and mouse (`input.*`); aim assist; subtitle size; HUD scale; vibration (via `vibrationActuator` where present); fullscreen (`requestFullscreen`, which the hub's client handles in a session); quality (`auto`, `low`, `medium`, `high`); key and button rebinding. All kept in the store, and every setting's a row a pad can change with left and right.

## 12. Art direction and animation

**Base: the engine's native procedural style.** Everything is code and data: no image, model or sound files. What makes it ours is fog, dusk, silhouette and material.

**Palette.** Slate, wet stone, tar black, oilskin yellow gone sour, rust. One warm accent, lantern amber. One cold accent, Lodger cyan-green (`#5ff0c4`), used for nothing else. Hero's tie is the only pure red on screen until the laser.

**The look [verified as a start].** This took a foggy hamlet with a crowd closing in from nothing to moody in a few lines. Tune from here. Lower the sun's glare: at this setting its bloom whites out part of the sky.

```ts
defineSky('sky:skerry', {
  description: 'A sick, smoke-orange dusk with heavy ground fog.',
  background: '#6a5a4c', pointLights: 1.6,
  dome: { show: true, turbidity: 9, rayleigh: 3, mieCoefficient: 0.02, mieDirectionalG: 0.85, exposure: 0.35 },
  sun: { color: '#ff9a60', intensity: 1.1, azimuth: 2.4, elevation: 0.14 },
  ambient: { sky: '#8f8a90', ground: '#2a2a22', intensity: 0.75 },
  fog: { color: '#7b6f60', start: 7, end: 62, amount: 0.92, floor: 0, ceiling: 2.4, height: 0.35 },
  backdrop: { haze: '#8a7a6a', tint: '#6a6058', layers: [{ kind: 'mountains', color: '#4a4a48', height: 0.95 }] },
});
defineLook('look:skerry', {
  description: 'The island at dusk.', sky: 'sky:skerry', resolution: 'full', textures: 'smooth',
  filters: {
    aa: { scope: 'all' },
    bloom: { scope: 'all', strength: 0.18, threshold: 1.1, radius: 0.5 },
    air: { scope: 'all', haze: 0.5, height: 3, shafts: 1, halos: 0.5 },
    grade: { scope: 'all', saturation: 0.72, contrast: 1.12, temperature: 0.08, gamma: 0.95 },
    vignette: { scope: 'all', strength: 0.5, softness: 0.55 },
    grain: { scope: 'all', amount: 0.18 },
  },
});
```

Each zone may lay its own grade on top (`post.combine`, view settings, never hashed): Marsh greener, thicker fog; Cannery tungsten amber and darker; Abbey cold moonlight (`sky:night` base); Causeway storm, then the last red dusk for the ending.

**Make these** (engine library for generic crates, barrels, lanterns, benches):

- **Characters (`defineBody`).** Start from the playground's `PLAYER_BODY` (§16.1 for where), a clothed human, and redress it; `body:humanoid`'s slot names are not what you'd guess. Quill: trench coat with the engine's `Cape` secondary motion (`secondary: { cape: true, color }`), red tie, briefcase in the off hand when not aiming. Parishioners: at least 6 dresses by seed with oilskin, sou'wester or cap; gaff, oar and knife as body parts on the hand bones. Netwife, Deacon, Hatchman (shield as a box part), Gutter (lobster-pot head of thin boxes, saw on a pole), Brack, Sedge, Goole, Salvor, Wren. Lodger eyes: unlit `eye` parts in the cold accent.
- **Bursting.** The view makes a puppet once and does not re-read `puppet.body` [verified]. So a Lodger burst replaces the actor: `removeActor`, then `spawnActor` on the spot with `body:parishionerBurst` (head parts removed, a neck stump, and for the lamprey the `secondary` component's hair chain, `{ hair: 'ponytail', color: '#5ff0c4' }`, the only chain that hangs at head height), with a splash of brine to hide the swap. Lash: a line of emitter bursts along the `telegraph:line`, 0.35 s.
- **World.** Materials: salt-stained stone, tarred planks, slate, rust iron, net. Slate-roofed cottages (level format 2, `roof: gable`, `pitch: 35`). Drying racks of herring, lobster pots, coiled rope, nets, rowboats on shingle, a bonfire, candles, Tannoy horns on poles (visible, always), stilted huts, cannery conveyors, rail hooks, boilers, fish-oil barrels and pools, abbey arches, shelves of ledgers, lighthouse with a lens beam (a long unlit transparent prop). Sea plane with `texture:water`, gulls by emitter. Check the ground up close: my grass looked streaky at grazing angles; a tighter `map` scale or another texture fixes it.
- **Light.** Lanterns and braziers (`prop:lantern`, `prop:brazier`, your own props with light spots) make the night; the engine's pool picks the nearest. Group them with `switchGroup` for scripted blackouts. Every interior needs an amber pool to walk toward.
- **Effects (`defineEmitter`).** Brine (a dark teal-black spray, no red blood), muzzle flash and tracer (free with the `gunshot` event, §16.3), rain and sea spray through `frame.emit`, fire, sparks on parry, paper storm in the Vault, Lodger mist.

**Animation: the engine's animator, plus clips and new actions.** Clip ids below are real [verified with `node x anim find`]; register only the sets you use (§16.4).

| Moment | Clip or engine feature |
|---|---|
| Parishioner shamble, idle | `quaternius/Zombie_Walk_Fwd_Loop`, `quaternius/Zombie_Idle_Loop`, variants in `mesh2motion/Zombie_Walk_2`, `cmu/Zombie_Walk_Loop` |
| Claw attack, roar | `quaternius/Zombie_Scratch`, `mesh2motion/Zombie Yell` |
| Thrower | `quaternius/OverhandThrow` |
| Kneel | `mesh2motion/Kneeling Tired` |
| Knocked flat, death, rise | `quaternius/Hit_Knockback`, `mesh2motion/Death_A` to `D`, `quaternius/LayToIdle`, `mesh2motion/Zombie_Rise`, ragdolls with `handOff` |
| Pistol | Engine hold and aim IK, `quaternius/Pistol_Reload`, `quaternius/Pistol_Shoot` |
| Kick | `move:roundhouse` through `Attack` and `states.body`, or `cmu/Roundhouse_Kick` trimmed |
| Door kick | `mesh2motion/Kick_Breach`, `move:breach` |
| Vault, ladder | `quaternius/ClimbUp_1m`, `mesh2motion/Climb Ladder` |
| Crawl (downed) | `mesh2motion/Crawl` |
| Carry Wren | `quaternius/Walk_Carry_Loop` |
| Stagger, grabs | Actions `action:dizzy`, `action:grab`, `action:grabbed`, `action:hurt` |

**New animations you must make** (`node x new action`, or readable clips with `parseClip`), since they're the character: Quill straightening his tie; his knee-rub idle; reloading with the briefcase tucked under his arm; plank kick; foe reel (clutching its face); foe mid-sermon kneel and rise; Salvor rubbing hands and pointing with his pipe; Wren cranking, and her boost; Goole's sermon gestures; Brack's anchor wind-up and roar; Sedge's lunge and parried recoil.

## 13. Audio

All code, no audio files. Engine: `defineSfx`, `defineSong`, `createAudio` (buses `effects`, `music`, `ui`, `ambience`; `play(id, { pitch, vol, when, position, bus, duck, loop })`; `room`; `music`, `intensity`, `stinger`).

- **Music at 10% by default.** At startup, before any song: `audio.volume('music', 0.1)`, and the Settings slider shows 10%. A test reads it.
- **Music (`defineSong`, own tunes):** title (slow harmonium over wind); exploration (low drones, far foghorn); combat, built in `intensity` layers that join as foes close (low strings, anvil, frantic fiddle); filing-cabinet room (gentle harmonium, the safest sound in the game); the Salvor's stall (a sly squeezebox shanty, the theme people will hum); boss; finale; results jingle.
- **Effects:** every gun, reload, kick, slash and parry clang, body hits, saw engine (a loop with distance, heard long before seen), foghorn (huge, low, the game's signature sound), Tannoy crackle with hall reverb, gulls, sea, wind, rain, creaking hull, footsteps by surface (`footstepSound`), doors, glass, UI: typewriter clack for moves, stamp thud for picks.
- **Rooms:** `audio.room(...)` by zone. Walls muffle (`update(pose, queries)`).
- **Voices: Animalese style.** A phoneme kit of about 16 short `sfx:vo-*` entries (voiced formants with `saw` or `pulse` through bandpass filters; noise for consonants). A line's text maps to syllables: letter to phoneme, played in sequence with `when` from the context clock at 11 to 16 a second. Each speaker has a base `pitch`, a rate and a kit tweak: Quill low and dry; Wren quick and high; Thripp clipped; Goole slow, deep, on the `effects` bus with Tannoy filtering and hall reverb; Salvor bouncy, rising; Brack a growl; Parishioners a low mutter by position, three times out of ten with a subtitle ("Bless the tide."). Duck music while speaking. A Voice slider scales `vol`.
- Every sound is presentation: sim events drive it from `frame.world.events.trace()`, never the reverse. `node x qa audio` must pass.

## 14. Attract mode

After **10 seconds with no input** on the title or any front-end menu (not in the pause menu or in a session), the game starts a looping AI-played demo. **Any input exits** back to the title: key, click, pointer moved past 8 px, pad button, stick past 0.4. On touch-only devices it runs regardless and a tap only shows the gate.

- **It runs the real game.** `inspector.set('game.mode', 'attract')`, `inspector.seed(n)`. A page-side bot drives through `engine.input.virtual` (`axis`, `hold`, `press`), and cheats freely: dev actions for `god`, ammo and teleports. `modal` stays false so the virtual device reaches the sim. It writes no saves. On exit: `virtual.clear()`, back to `title` mode.
- **The loop, about 100 s, a beat each 10 to 15 s, with a slow camera cut between:** walking the Slip in fog; aim, knee, kick on Fish Lane; the trawler siege with a plank kick and a winch net; the Gutter; Case screen with items moving; Salvor stall; flare on a Whip in the Marsh; Wren carried off and shot free; Brack's lure; Sedge parry; Undertow in the beam; four players on the trawler.
- **On screen:** title in the corner, a stamped DEMO, "Press any button" in the current glyph style, pulsing.

## 15. Dev mode

From the pause menu, item **Dev Mode**. Not in hub sessions. Large panel, playable on a pad: left and right change a value, a mouse can drag.

**Live sliders** (each a `defineSettings` entry read every step, so replays record them; each row with its default, and **Reset all to defaults**, plus one row's reset):

| Area | Sliders |
|---|---|
| Player | Run speed (`movement.gaits.run`), sprint (`movement.gaits.sprint`), aim shuffle (`movement.gaits.walk`, default 0: planted), max HP, camera arm, field of view (`cam.fov`), laser wobble, aim assist |
| Guns | Damage ×, fire rate ×, reload time ×, recoil ×, head multiplier, leg multiplier, kick damage, kick radius, parry window |
| Foes | HP ×, speed ×, damage ×, wind-up time ×, max attackers at once, max on field, sight range, burst chance |
| Economy | Drop rate, shillings ×, shop prices ×, Risk Rating lock |
| Partner, prompts | Wren HP, carry speed, follow distance, prompt window × |
| World (view) | Fog amount, grade strength, music level |

The engine's `movement.*` settings override a profile only while off their own default, which is Apex's number. So those rows show the profile's value until moved, and their reset sets the setting back to its registered default, which removes the override.

**Tools:** god mode, freeze AI, time scale and hit-stop off (engine dev actions `god`, `freeze`, `timeScale`); infinite ammo, one-hit kills, give money, give all weapons, give all salvage; jump to any beat from a list; start or skip an encounter; kill all; spawn any foe at the laser's point; free camera (`cam3=fly`); labels over foes (state, HP, zones); a stats line (`__engine.stats()`, hash, tick, entities); **Copy balance as JSON** (`navigator.clipboard`, no dialog); **Record a replay** (`input.record()`).

## 16. Technology

### 16.1 Setup (exact, [verified])

From the empty dev folder:

```sh
src=$(mktemp -d) && git clone --depth 1 https://github.com/michaelcrosato/my-3dge "$src" && node "$src/tools/game/new-game.mjs" . --name game
npm ci   # 6 s. npm test then passes in 10 s, and npm run check in 13 s, on this machine.
export CHROMIUM_PATH=$(ls -d "$HOME"/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell | head -1)
node x shot labs/game            # about 7 s
node x replay labs/game/replays --browser sim   # about 17 s
```

- **Don't run `scripts/setup.sh`.** It downloads Node and Chrome into your home folder. The machine's Node 24 satisfies the engine and `npm ci` is enough.
- **Use the headless shell for `CHROMIUM_PATH`, not the full `chrome`.** The full binary dies under this run's long temp path with `Socket path too long` [verified]; set the variable in every shell you use for `x shot`, `x film` or `x replay --browser`. `@playwright/test` from the workspace uses it through `executablePath`, no browser download.
- **Don't `git init` or commit.** The dev folder already sits inside the harness's repository. Skip the commit steps in AGENTS.md.
- **You share this machine.** Keep every file you make inside your folder, not in `/tmp` or a parent; don't read the folders beside yours. Prefer `file://` and the engine's headless tools. A server only for the hub harness (§17), on a port the OS picks. Stop only what you started, by PID: never `pkill`, `killall`, `fuser -k`.
- **Keep `$src`, read-only.** Its `labs/playground/` is the best worked example of this exact genre on this engine, and new-game does **not** copy it (the guide mentions it anyway). Read `cast/player.ts`, `controls.ts`, `weapons/`, `cast/neighbours.ts`, `cast/partners.ts`, `cast/ways.ts`, `bodies/player.ts`, `levels/plan.ts`, `levels/site.ts`, `scenes/site.ts`, `ui/`. Copy and adapt what you need into `labs/game/`. Never import from it.
- Read AGENTS.md (the game's) and `docs/GAME-GUIDE.md` once. Look things up in `docs/API.md`, the file comments, `node x describe`, `node x help`, `__engine.help()`. Write friction in `ENGINE-FEEDBACK.md` as you go; TASK.md's Engine Feedback comes from it.
- **The engine is read-only** (`npm run check` compares every file). Everything below is achievable on top of it. Files stay under 400 lines with a `@file` comment.

### 16.2 Folder layout

Lint treats `labs/*/scenes/**` and `labs/*/cast/**` as sim-side, importing only `engine/sim-api.ts`. `x qa` reads `labs/game/{geometry,props,textures,sounds}`. Everything else in `labs/game/` is page code, importing `engine/index.ts`.

```text
labs/game/
  index.html  main.ts  title.ts     page entry (keep the starter's error handling)
  data/          plain tables with no engine imports: items, weapons, foes, shop, waves, beats, dialogue, balance defaults
  scenes/        sim: world.ts (game:world), square.ts (game:square), systems as files: guns, melee, qte, foes, director,
                 story, drops, risk, caseGrid, partner, bosses/*, net, laststand, save
  cast/          sim: hero, wren, each foe, each boss
  levels/        defineLevel text (adapt the playground's Plan helper), site.ts (terrain, structures, zones)
  props/ geometry/ textures/ sounds/     data, read by x qa
  bodies/ looks/ materials.ts clips.ts   page registration (bodies, skies, looks, materials, clip sets)
  ui/            hud, prompts, glyphs, menus, case, shop, claimFile, dialogue, settings, controls, about, gameover, results, dev, gate, card
  audio/         page sound: events to sfx, music director, voice
  net/           hub.ts, transport, memory transport, session.client.txt
  attract/       attract.ts (bot and beats)
  bot/           campaign bot, its helpers
  tools/         bundle.mjs, verify.mjs
  replays/
```

**Data-driven, so the rest of the game could be built with normal designer tools.** A new zone means: a level as text, an entry in the site, a beats table, an encounters table, dialogue lines. A new foe or weapon means a row of data and a body. No system needs editing for content. `node x new <kind>` scaffolds bodies, props, looks, levels, songs, sounds, actions.

**Modes** are a setting, `game.mode` (`title`, `campaign`, `laststand`, `attract`, `gallery`), read in `setup`. Changing mode or loading a save: `inspector.set(...)`, then `inspector.seed(n)`, which restarts the scene and keeps changed settings [verified]. `frame.world` is a new object after a restart, so page code resets what it remembers (event `seq`, for one) when it changes.

**Scenes.** `game:world` is everything. `game:square` is the same terrain and coordinates with only the Square's structures, for hub rounds to load fast; both share all systems.

### 16.3 Engine map

| Need | Use | Worked example |
|---|---|---|
| Hero | `createCharacter({ movement })`, `spawnActor`, `defineMovement` | §16.4; playground `cast/player.ts` |
| Camera | `cam3=shoulder,<yaw°>,<pitch°>,<arm>`, `__engine.camera.set(code, { blend: true })`; own cinematic cameras with `node x new camera` | engine `gfx/cameras/shoulder.ts` |
| Guns | Own system; `defineWeapon`, `weaponsFor`, `getWeapon`, `recoilStep`, `spreadOf`, `physicsOf(w).raycast`, `entityOfBody` | engine `sim/weapons.ts` |
| Melee | `Attack`, `getMove`, `meleeTargets`, `requestHitStop`, `damage` | engine `sim/melee.ts` |
| Foes | `spawnActor({ player: false })`, `actor.intents`, `reactTo`, `handOff`, `addRagdolls`, `standUp`, `playClip`, `actOn` | playground `cast/partners.ts`, `neighbours.ts` |
| Hounds, Leeches, seal | `addAgent`, `CROWD_BODY`, rigs `quadruped`, `blob` | playground `cast/dog.ts`; `labs/box/cast/slime.ts` |
| AI kit | `approachRing`, `followFlow`, `takeToken`, `sense`, `earshot`, `Noise`, `SpatialHash`, `defineTelegraph`, `inTelegraph` | `labs/box/cast/walker.ts`, `labs/box/scenes/fight-foes.ts` |
| World | `defineTerrain`, `defineSite`, `addSiteBodies`, `addSiteLadders`, `createSiteNav`, `propObstacles`, `siteFloorBelow`, `siteClearSight` | playground `levels/site.ts`, `scenes/site.ts`, `cast/ways.ts` |
| Doors, windows, breakables | `addLevelDoors`, `addDoor`, `strikeDoor`, `addLevelWindows`, `addBreakables`, `damageProp` | playground `scenes/site.ts` |
| Use prompts | `addInteraction`, `defineUsable`, `interactor.prompt` | `node x new interactable` |
| Moving platform | `driveMover`, `MOVER`, `moverPose` (phase `ai`) | engine `physics/bodies.ts` |
| Targets (gallery) | `defineThing`, `spawnThing` | playground `weapons/range.ts` |
| Triggers | `addSensor`, `updateTrigger` | engine `physics/bodies.ts` |
| Page → sim | Dev actions: `actions: { name(w, args) }` in the scene, `inspector.actions.run(name, args)`. Custom intents: `input.virtual.axis('game:x', data)` | §10.3 |
| Saves, prefs | `createStore`, `createEngine({ store })` | `labs/game/best.ts` |

**Why a game-owned gun system.** The engine's `addWeapons` is for a range: its reload refills from nothing, it fires from the hip, and one set of intents drives every player. We need ammo from the Case, no hip fire, pellets, piercing, per-gun upgrades, and per-actor intents for co-op. Copy the logic of `stepOne` from `engine/sim/weapons.ts` into `scenes/guns.ts`, keeping the **component `weapons`** (`weaponsFor`) so the view still draws the gun in hand and the camera still reads `aim` and `kick`. **Emit the same `gunshot` event** `{ id, weapon, from, to, normal, body, target, hit }`, and you get tracer, muzzle flash, impact and bullet holes for free. Also set `animator.weapon` and `motion.holstered` as it does.

### 16.4 Recipes that worked [verified]

**Planted aim, with no fighting the controller.** On a movement profile, holding `aim` with a gun out sets the gait to `walk`. So make `walk` 0. Measured: 3.15 m in a second running, 0.135 m of slide while aiming.

```ts
const apex = getMovement('movement:apex');
defineMovement('movement:quill', {
  description: 'Runs like a man of 51. Plants his feet to aim.',
  character: apex.character,
  model: { gaits: { walk: 0, run: 3.4, sprint: 5.2, holstered: 1 } },
});
spawnActor(w, {
  at, yaw, player: true, holstered: false,
  character: createCharacter({ movement: 'movement:quill' }),
  body: 'body:quill', anim: { build: 'build:adult', weapon: 'gun' },
  components: { weapons: weaponsFor(['weapon:deductible'], 0) },
});
```

`input.sprint=hold` (in the boot code below) makes run a hold. The live slider for `movement.gaits.walk` gives the aim-shuffle option. Add no `jump` to the action map, and he never jumps, slides or mantles.

**Action map.** `defineActionMap('actionMap:quill', { look: true, aimWith: 'centre', lock: true, actions: {...}, view: ['case', 'map', 'shoulder'] })`. Name the aim action `aim` and fire `fire`: the view keys off those. Read view actions through `createEngine({ onView })`.

**Foe.**

```ts
defineComponent('health', { description: 'Hit points.', fields: HEALTH_FIELDS });
spawnActor(w, {
  at, player: false, character: createCharacter({ speed: 1.3 }),
  body: 'body:parishioner0', anim: { build: 'build:adult', weapon: 'none' },
  clips: { sets: ['clipset:quaternius'] },              // here, at spawn: see the traps
  components: { health: { hp: 100, hitAt: -1, hitBy: -1 }, foe: { kind: 'parishioner', state: 'idle' } },
});
// each step: f.actor.intents = { move: [dx, dz] };  from its first step: playClip(w, f.id, 'quaternius/Zombie_Walk_Fwd_Loop');
```

**Hit zones.** `const y = shot.to[1] - foe.actor.y;` then the table in §6.1. Handle the event with `w.events.on('gunshot', ...)` or inside `game.guns` itself. Falling: `handOff(w, id, { push: [dx * 3, 1, dz * 3], dead: true })`. Flinching: `reactTo(w, id, (r) => r.hit(dirVector3, yaw, 1))`, as in the playground's partners.

**Bodies and builds.** Copying a registry entry needs its `id` and `kind` removed: `const { id, kind, ...rest } = getBody('body:humanoid')`. A giant is `defineBuild('build:brack', { ...adultFields, size: 2.7 })` with `createCharacter({ speed, capsule: { radius: 0.9, height: 3.4 } })`, and it reads great. `defineBody`, `defineMaterial`, `defineSky` and `defineLook` are page-side, and the sim names them by id; `defineProp`, `defineLevel`, `defineTerrain`, `defineSite`, `defineWeapon`, `defineMovement` are sim-side.

**Laser.** A page cannot add its own meshes through the public API. Draw the beam as a thin rotated CSS line in the overlay from the projected muzzle to the projected end, computing the end with `frame.queries.raycast` along the camera's centre. Add a 3D glow for the dot with a running emitter: `frame.emit('emitter:laserDot', at, 'laser')`. Project with `frame.camera` (position, yaw, pitch, fov). Note it in `ENGINE-FEEDBACK.md`.

**Clips in the page.** Register them in a statically imported module:

```ts
// labs/game/clips.ts
const TEXT = import.meta.glob<string>('../../data/anim/sets/quaternius/*.json', { query: '?raw', import: 'default', eager: true });
const files = Object.fromEntries(Object.entries(TEXT).map(([p, t]) => [p.split('/').pop()!, t]));
defineClipSet(clipSetFromFiles(files, 'data/anim/sets/quaternius'));
```

Register `quaternius` and `mesh2motion`, and `cmu` if you use it. In Vitest, read the same files with `node:fs`.

**Page boot order.**

```ts
import './clips'; import './bodies'; import './looks'; /* every registration, static, first */
const search = new URLSearchParams(location.search);
for (const key of [...search.keys()]) if (key.startsWith('aihub')) search.delete(key);   // see the traps
search.set('touch', 'off');
search.set('input.sprint', 'hold');
if (!search.has('cam3') && !search.has('cam')) search.set('cam3', 'shoulder,0,-4,2.8');
if (!search.has('post.look')) search.set('post.look', 'look:skerry');
if (!search.has('gfx.warmUp')) search.set('gfx.warmUp', 'asked');
const hub = window.AIHub;
const info = hub?.active ? await hub.connect({ mode: 'shared-world', seats: [1, 4], card: true }) : null;
// with info: wire hub handlers NOW, set game.role, game.mode=laststand, seed=info.seed, ?scene=game:square (§16.7)
const engine = await createEngine({ canvas, scenes: ['game:world', 'game:square'], search: `?${search}`, store, modal, onFrame, onView, actionMap: 'actionMap:quill' });
```

### 16.5 Navigation

Copy the idea of the playground's `cast/ways.ts`: `createSiteNav(site, { blocks: propObstacles(w) })`, one flow field per goal, flooded lazily, remade when a door or prop blocks the way. `nav.direction(field, x, y, z)` gives a foe its `move`. Make it on the first step, not in `setup`, since no query sees props in `setup`.

### 16.6 Packaging [verified]

There's no game-side `x html`: the engine's `tools/lib/oneFile.ts` is hard-wired to the playground. Copy its method in `labs/game/tools/bundle.mjs`, run from the dev folder:

```js
const result = await build({
  root, configFile: false, logLevel: 'warn', base: './',
  resolve: { alias: [{ find: /^three$/, replacement: 'three/webgpu' }] },
  build: {
    write: false, modulePreload: false, cssCodeSplit: false, assetsInlineLimit: () => true,
    chunkSizeWarningLimit: Infinity, target: 'esnext',
    rollupOptions: { input: { game: join(root, 'labs/game/index.html') }, output: { inlineDynamicImports: true } },
  },
});
// then: put each chunk and stylesheet inline, as oneFile.ts's inlineBuild does, using a replacer FUNCTION (the code holds $ signs):
//   script text with '</script' written as '<\/script'; fail the build on '<!--' inside a script.
// then, right after <meta charset="utf-8" />: <script>{session.client.txt, byte for byte}</script> and the hub:* tags.
// write to the deliverable's path one folder up, and set <title> from GAME_TITLE.
```

The starter came out at 6.7 MB and opened from `file://` with WebGPU, no errors, in 6 s on the software renderer. The hub checks that the pasted client is byte-identical to a release (SHA-256, banner to last line).

### 16.7 Traps I hit, so you don't [verified unless noted]

1. **The hub's URL kills the engine.** The hub opens the page with `?aihub=1` (and `aihub-seed`). `createEngine` refuses any query key that isn't a declared setting (`CORE_BAD_SETTING`), so the engine never starts and the harness shows no traffic. **Strip `aihub*` before passing `search`.** Your own URL flags must be declared with `defineSettings`.
2. **`await import()` is eager in the one-file build.** With `inlineDynamicImports`, the imported module runs before the importer's body. Registering something then dynamically importing the page works in dev and fails in the bundle (`CORE_NO_ENTRY`). Register in static imports; put them first.
3. **The harness waits only 20 s for `ready()` from every copy,** and 4 WebGPU copies on the software renderer are slow. A hamlet-sized scene with 18 foes took 12.5 to 17 s at 4 players with these rules, and passed: `game:square` not the whole island; `gfx.warmUp=asked`; **on a software adapter in a session only**, `post.look=look:clean`, `quality=low`, `gfx.governor=false` (`adapter.info.isFallbackAdapter` or `architecture === 'swiftshader'`). Wire the `time-up` and `end` handlers before `createEngine`, so a slow copy still answers them. Spawn foes after start, not in `setup`.
4. **`spawnActor`'s entity isn't live in `setup`.** `addClips` and `playClip` right after it throw `SIM_BAD_ARGUMENT`. Give `clips` at spawn, and play from the first step.
5. **`input.lastDevice` says `virtual`** after anything touches the virtual device, including net intents and attract. Track the last device yourself (§11).
6. **A bare `cam3=shoulder` faces +Z (south), ignoring the hero's yaw.** Name the yaw in the code, and call `camera.set` after any teleport.
7. **The governor lowers quality on slow frames** (`GFX_GOVERNOR`). Fine for players. For screenshots: `gfx.governor=false&quality=high`.
8. **The software renderer draws about one frame a second** with the full look at 1280×720 (800 ms GPU a frame), and the clock lags behind. Tests use `__engine.step(n)` and read state, at 480×270 with `post.look=look:clean&quality=low`. A WebGPU canvas may come out blank in a screenshot under some setups: check the state.
9. **`puppet.body` isn't re-read by the view.** Replace the actor (§12).
10. **Level text errors are good.** `LEVEL_BAD_ROOF` tells you a gable wants `pitch: 35`. Read them.
11. **`session.client.txt`, not `.js`:** as code it would fail the `@file` and line-count lint.
12. **Esc under pointer lock.** The browser may spend the first Esc on releasing the lock, with no key event for you. Treat the lock lost during play as a pause, as the playground's `ui/frontEnd.ts` does (read from its comments, not run here).
13. **Spare CPU, shared machine.** One or two browsers at a time. `earlyoom` may end the biggest browser: "Target closed" means memory, so run fewer.

## 17. Testing

**One command, `node labs/game/tools/verify.mjs [sim|page|hub|all]`, prints only failures and a one-line count** (for example `verify: 214 checks, 0 failed`). Rerun only the part you changed. Screenshots only for what a script can't check. **No subagents or workflows to debate, review, judge or audit.**

**Sim (Vitest, Node, no browser):**
- The four kinds the guide asks for: a golden replay, capture-and-restore continuing exactly, the bot winning across seeds, rule tests. Record goldens on purpose: `node x replay labs/game/replays --browser sim --update`.
- Rules: damage table by zone; kick radius, i-frames, knockdowns; parry window; Case fit, rotate, autosort, combine (property-style with many seeds); shop math; adaptive drops favour what's lacking; save and load round-trip; every beat reachable; Wren carried to the chute loses; plank removal stops boarding.
- **The scripted playthrough of the whole game: `bot/campaign.ts` plays from Cold Open to the results screen through intents and dev-action menu picks**, including shop visits and every boss, on default difficulty, on 3 seeds (10 with `--full`). It's sim-only, about 3 to 5 ms a step, so a 10-minute bot run is under 3 minutes. If the bot can't win, find out whether it's the bot or the balance.
- Co-op: a host sim and 3 client sims joined by the memory transport at 150 ± 50 ms and 5% loss: foes converge within 1.5 m; a client's shot kills; a client's revive works; host finish reaches all.
- Balance sanity: shots to kill per weapon, total shillings on a playthrough within 20,000 to 30,000.

**Page, on the built deliverable from `file://`** (Playwright with `executablePath: process.env.CHROMIUM_PATH` and args `--enable-unsafe-webgpu --enable-features=Vulkan --use-vulkan=swiftshader --use-webgpu-adapter=swiftshader --use-angle=swiftshader`; `window.__game` exposes `screen()` and `state()`; the UI is read through `[data-ui]` DOM queries):
- Boots with no errors or advice. Title shows `GAME_TITLE`. Enter and Space on the title behave (the hub opens the game alone and presses them).
- Attract starts after 10 s idle and exits on key, on click, on a stubbed pad button.
- Pause, then Dev Mode: a slider changes a live value; reset restores defaults. Settings persist through a reload.
- **Music volume is 0.1 by default**, and the Web Audio graph makes sound (`AnalyserNode` level, or an `OfflineAudioContext` render of a song and a voice line).
- Glyphs: a `navigator.getGamepads` stub in standard mapping switches prompts to PlayStation; the Xbox setting gives A B X Y; a key press switches to keycaps.
- Pad and mouse each work the title, the Case (lift, rotate, place) and the shop. Hover moves focus.
- A Chromium phone profile (`devices['Pixel 7']`) shows the gate with the Settings button, with attract running, and no touch controls. WebKit's iPhone profile shows the gate with no WebGPU and no error text.
- Font sizes at 1920×1080 meet §11's minimums; nothing overflows.
- About/Credits holds every field from TASK.md's Source Information and all the feedback answers. The exit interview parses, and has every key.

**Hub:** serve a folder holding `harness.html`, `bridge.js`, `round.js` and the deliverable, on a port the OS picks, from your test process (Node `listen(0, '127.0.0.1')`, or `python3 -m http.server 0 --bind 127.0.0.1`). First confirm the page is your game by its `<title>`. Stop only what you started, by PID. Assert `window.__hubCheck.pass` once `document.body.dataset.complete === 'true'` for:

```text
?game=<name>&players=2&auto=1&limit=40&latency=150&jitter=50&loss=5
?game=<name>&players=4&auto=1&limit=40&latency=150&jitter=50&loss=5
?game=<name>&players=4&auto=1&limit=40&latency=150&jitter=50&loss=5&scenario=host-leave
?game=<name>&players=2&auto=1&limit=40&scenario=server
```

A minimal version of this passed all four here [verified], with the one-file build, in 17 to 34 s each. Also test your own card ("Enter answers Ready" is checked once you declare `card: true`).

**Visual checks:** a few `--png` shots at 1920×1080 (the look, the Case, a boss, the HUD from far away), `node x gallery` for bodies and props, `node x qa geo tex audio`, `npm run check`.

**Keep a tally as you go** in `labs/game/README.md`: issues testing caught, how many were critical, the most and least helpful tests. TASK.md's Testing Feedback asks for exactly that, and it's hard to reconstruct at the end.

## 18. Build order

Each milestone ends with a complete game you could ship, and `verify` green.

| # | Build | Done when |
|---|---|---|
| M0 | Pick the title. Scaffold. `bundle.mjs`, `verify.mjs`, one-file smoke test, harness pass with an empty round. | The pipeline runs end to end before there's a game. |
| M1 | **Core loop in the Square:** hero, camera, laser, `game.guns`, zones, reactions, kick, parry, foes with tokens, HUD, glyphs, gibberish voice, the look. | It's fun with 10 foes and one gun. If it isn't, stay here. Spend real time on the kick. |
| M2 | **Last Stand and netcode:** waves, score, revive, transport, roles, card, finish. Solo menu entry. | All four harness runs pass with real play, and it's a game already. |
| M3 | **Front end:** title, pause, Settings, Controls, About, Dev Mode with sliders, attract (first loop), touch gate. | Every UI test in §17 passes. |
| M4 | **Economy:** Case, items, drops, shop, service, saves, game over, results. | Bot buys and sells; a save round-trips. |
| M5 | **World and first act:** site, Slip, Office, Lane, full trawler siege with the Gutter, foghorn, Shingle, Claims Practice. | 20 great minutes. Bot plays through. |
| M6 | **Marsh and Cannery:** Hounds, Netwives, Whips, Deacons, Hatchmen, Wren, Hoist, Brack. | Escort is tense, not annoying. |
| M7 | **The finish:** Funicular, Abbey, Vault, Sedge, Causeway, Goole, Undertow, ending. | Bot plays Cold Open to results. |
| M8 | **Polish:** all music, line-by-line script, animations in §12, effects, zone grades, full attract loop, data tidy. | Nothing on screen is a placeholder. |
| M9 | **Close:** §19. | Everything in §19 ticked. |

**If you run short, cut content in this order, and leave what remains complete:** (1) Claims Practice gallery, (2) Funicular (a walk up the cliff path instead), (3) glass floats and memos, (4) trench gun, (5) Hatchmen, (6) the Audit (keep parries, make Sedge a cutscene), (7) Marsh length. **Never cut:** planted aim, zones, kick, parry, the Case, the shop, the trawler siege, Wren's escort, Brack, the Undertow, Last Stand and the hub round, attract, dev mode, glyphs, the touch gate, voices, About, the exit interview. "No TODOs, placeholders, or stubbed features" holds at every cut.

## 19. Finishing: what done means

**In-game About/Credits and your final chat reply both carry:** Source Information with every field TASK.md lists (take the date, model, environment and so on from *your* TASK.md; Plan is the file name of this plan as you received it; Usage is literally "added on import"), and your answers to Testing Feedback, Engine Feedback and Prompt Feedback. Keep this in one data module so screen and file can't drift, and fill it from what really happened: "unknown" for what you can't confirm. Suggested facts: genre and perspective from §1; tech: my-3dge at the commit in `engine-lock.json` (three.js r182, WebGPU, Rapier, TypeScript, Vite), AI Hub session client 1.4.0 or current; art: engine-native procedural, fog and dusk; animation: the engine's animator, clip library, new actions; audio: synthesized music and effects, Animalese-style gibberish, music at 10% by default; online: AI Hub shared-world session, 1 to 4 players, none outside a session.

**The exit interview:** the file and exact shape TASK.md gives, every value filled in, parsed by a test. For `aiHub`: `name` is `GAME_TITLE`; `type` Game; `genre` Horror; `source` and `series` from TASK.md's source; `players` "1–4"; tags such as `3d`, `third-person`, `co-op`, `horror`, `boss fights`, `story`.

**Clean up:** stop anything you started, by PID. `labs/game/README.md` says what the game is now. `ENGINE-FEEDBACK.md` is filled in.

**Coverage: every line of TASK.md, where it's handled, how it's proved.**

| TASK.md | Plan | Proved by |
|---|---|---|
| Source; original game; its world, characters, themes, tone turned into mechanics, pacing, UX | §1, §2, §3, §4 to §9 | Playing it; campaign bot |
| Genre, perspective | §1 | About screen |
| Title by RNG from 50; deliverable name | §1, §16.6 | Title screen; file exists |
| Research | Your choice; this plan is enough. Report what you did | About screen |
| Single HTML, CDN allowed | §16.6 (everything inline) | Page tests run on the deliverable from `file://` |
| Engine's full workspace, read-only; own systems, art, animation on top | §16 | `npm run check` |
| Art direction | §12 | `x gallery`, screenshots |
| Animation | §12 | `x anim`, screenshots |
| Audio: all code, gibberish voices, music 10% | §13, §11 | Test reads 0.1; Analyser level; `x qa audio`; no binary (`x check`) |
| Online; multiplayer in the hub and on its own | §10 | Four harness runs; solo Last Stand; hub-style open with no session |
| Dev folder; shared machine rules; server and process rules | §16.1, §17 | Practice |
| Performance out of scope, unlimited budget | §4, §7, §12: detail freely; don't optimise | |
| Testing: one command, failures and count only; whole-game playthrough; no audit agents | §17 | `verify.mjs` |
| Effort | Spend it on the kick, the siege and the writing | |
| This computer: browsers, stand-ins for pad, touch, sound, second player, iPhone, TV | §16.1, §16.7, §17 | Stubs and profiles in page tests; 1080p shots |
| Feature-complete demo, polished vertical slice, infrastructure for the rest | §4, §16.2 (data-driven) | Campaign bot; data tables |
| Dev mode from pause, tools, live sliders, reset | §15 | Page test |
| Attract: 10 s idle, loop, any input exits, may cheat | §14 | Page test |
| Narrative tone | §3 | Reading the script |
| UI and UX, 10-foot, pad first; native keyboard and mouse; hover focus; last-input prompts; Xbox option; no dense screens | §5, §11 | Page tests; 1080p shots |
| Touch-only: no controls, message and settings, attract runs | §11, §14 | Phone-profile test |
| Done: no TODOs, placeholders, stubs | §18 | `grep` in `verify.mjs` for TODO, FIXME, placeholder in `labs/game/` |
| Source Information in reply and About | §19 | Page test |
| Exit interview | §19 | Parse test |
| Testing, Engine, Prompt Feedback | §16.1 (`ENGINE-FEEDBACK.md`), §19 | Page test |
