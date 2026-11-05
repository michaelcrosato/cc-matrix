# PLAN: a first-person open-world mercenary game inspired by Far Cry 2

## 0. How to use this plan

- You build the whole game from this plan and your TASK.md, alone. Nobody is available to answer questions: decide and move on. **If this plan and TASK.md disagree, TASK.md wins.**
- **Title:** yours to pick, by the rule in your TASK.md (a riff, never the source's actual name). Do that first. Nothing here depends on it. `src/data/meta.js` exports `TITLE` and `TAGLINE`, and every screen and tag reads them.
- **Names:** your TASK.md gives the dev folder's name, the deliverable HTML's name and the exit-interview file's name, so this plan never repeats them. Every path below is relative to the dev folder.
- **✔ verified** means the planner ran it on this computer on 2026-11-04 with `three@0.180.0`, `@dimforge/rapier3d-compat@0.19.3` and Chromium 153. Don't re-research those. Further research is optional; report whatever you do in Source Information.
- Everything in this plan is in scope. §15 lists the only things that may shrink, and they shrink in quantity, never in kind. Nothing ships half-built: if something is cut, it's absent, not stubbed.
- The "This computer" section of your TASK.md still applies. §14.1 lists where the planner found it needs a correction.
- **Map of this file:** 1 the game, 2 world, 3 loop and pacing, 4 systems, 5 story, 6 multiplayer, 7 UI, 8 attract, 9 dev mode, 10 art, 11 animation, 12 audio, 13 tech and recipes, 14 testing, 15 build order, 16 done checklist.

---

## 1. The game on one page

**Pitch.** You are a foreign mercenary in the last dry season of a dying company-state. You came for one clerk and his ledger. You stay because both sides pay on time. The grass burns where the wind takes it, your gun rusts in your hands, the fever comes back on its own schedule, and the friend who dragged you out of the fire yesterday may need you to end it for them tomorrow.

| Decision | Choice | Why |
|---|---|---|
| Genre | Open-world first-person shooter with stealth, survival friction and a branching contract story | That is what makes the source distinct: a place that pushes back |
| Perspective | First-person, always, in play and in vehicles, with no cutscene camera. NPCs talk to you in the world while you stand, walk or drive. Attract mode alone may use chase and fly-by cameras | "Stay in your own eyes" is half of the source's feel |
| Players | Campaign for 1. A co-op job for 1–4 in AI Hub sessions and on its own (§6) | TASK.md's multiplayer rule |
| Length | Critical path about 45–60 minutes. All features are seen by about minute 35 | Long enough to show everything |

**Pillars** (when in doubt, these decide):

1. **The land is the weapon.** Wind, dry grass, slope, time of day. The best plan in the game is a flare and a good read of the wind, and the wind can turn.
2. **Nothing is free, nothing lasts.** Guns rust, trucks break, pills run out, friends die for good. This friction is the drama, so it must always be readable and answerable, never a chore.
3. **Stay in your own eyes.** Map in your hand, pliers in your arm, papers held out of the truck window. Diegetic first. HUD only for what a couch player can't otherwise read.
4. **Everybody's money is dirty.** Every contract has a cost you can later see on the map and in the camp.
5. **Read it from the couch.** At 10 feet, big, few and clear beats realistic and detailed, every time.

**What we keep from the source's design, and what we fix:**

| Keep (as our own version) | Fix |
|---|---|
| Spreading grass fire driven by wind | Fire is readable: a cloth strip on your gun and the truck's aerial shows the wind |
| Guns that wear out and jam; a dealer who sells reliable ones | Condition shows on the gun itself as rust and tape, so a jam is never a surprise you couldn't have seen coming |
| Recurring fever and pills earned through errands | The first attack never lands mid-fight, and warnings are generous. Later ones can land anywhere |
| Map and GPS held in your hand, usable on the move and at the wheel | At 10 feet the map can be pulled up to fill the screen |
| Painful first-person field surgery | Clear, short, interruptible, with several variations |
| A buddy who drags you out; permanent buddy death; mercy | Rescue is limited per day and telegraphed, so the player can plan around it |
| Two corrupt factions; buddies offering a better, riskier way to do a job | Consequences stay visible on the map and in the camp |
| Hidden diamonds found with a locator on the GPS | Same, with light, beep and rumble |
| Sleep to set the time of day; night is for sneaking | Same, as a watch dial |
| **Not kept:** guard posts that refill the moment you leave | Cleared posts stay cleared until the next dawn, and only refill if a supply route survives. A real truck brings the men |
| **Not kept:** every vehicle attacks on sight, always | Faction papers let you bluff through that faction's checkpoints: a real tense scene at the truck window |

**Originality rules (hard).** This is an original game in the source's genre and spirit. Use none of its names, characters, story beats, map, dialogue, music, art or logos: no Jackal, no APR or UFLL, no Pala or Bowa-Seko, no taxi-ride opening, no villain at your bedside. Don't quote its lines or the philosophers it quotes. Our fiction, cast, map and rhetoric (§2, §5) are our own.

**Respect rules (hard).** No real country, continent, ethnic group or language is named or imitated. Locals are people with jobs, jokes and plans, never scenery. Their names are job titles because everyone's are (§2). The game's contempt points at the trade and at the foreigners, you included. No child soldiers, no sexual violence, no torture scenes, no real-world atrocities. Violence is inked and stylised: black ink spatter, charred silhouettes, no gore models.

---

## 2. The world: Concession Fourteen

**Premise.** The country was never a country. It was a mining company's private territory, leased by the square mile: Concession Fourteen. The company folded and left behind its pit, its rail line, its security force and its union. Those last two are now at war, and they still use the company's job titles because names get you killed. *Only foreigners and the dead keep their names here.* The flag is the old company logo (a pick crossed with a pen inside a diamond), painted over by both sides.

**Factions** (both are awful, both are funny, neither is ever "the good one"):

- **The Stewardship ("Stewards").** Ex-company security holding the rail, the paperwork and the euphemisms. Ochre armbands, khaki. Speak like a quarterly report. Led locally by **the Comptroller**.
- **The Common Shift ("the Commons").** Ex-miners' union holding the diesel, the numbers and the grudges. Red armbands, work clothes. Speak like a shop-floor meeting at gunpoint. Led locally by **the Foreman**.
- **The Underwriters.** The foreign insurers who have written policies for both sides. Seen only as one agent in a clean shirt on the barge. They hired you.

**Cast** (role-names; each has a fixed voice seed, §12):

| Who | Where | What they are |
|---|---|---|
| The Ferryman | The barge | Takes you in. Ferries you between landings. Greets everyone with "First time?" |
| The Widow | Her yard outside Kiln | Arms dealer. Takes diamonds only. Has outlasted four governments |
| The Comptroller | Old company HQ, Kiln | Stewards' fixer. Never says "war" |
| The Foreman | Union hall, Kiln | Commons' fixer. Third generation in the pit |
| The Doctor | Dispensary, Kiln | Pays for favours in quinine bark. Runs papers for the people the war made homeless |
| The Clerk of Second Water | Refugee camp | Keeps the camp's count. The only honest ledger in the game |
| **The Notary** | Unknown until Act 3 | The company's last clerk. Sells to both sides and writes everything down. Your target. Heard on six dictation tapes. Forty years of pit dust in his lungs |

**The mercs.** Four came in on the same barge. You pick one in the prologue. The other three become your **buddies** in the campaign. In co-op, seats map to them in order. Each has their own first-person hands (skin tone, tattoo or glove) and one small perk.

| Merc | Who | Perk | Buddy role in contracts |
|---|---|---|---|
| **Ines Calloway** | Struck-off field medic. Gentle, dry, terrifying | Syringes heal 25% faster to use | Knows who's hurt and who's hiding |
| **Tomasz Wren** | Sapper, 50s, deaf in one ear, loud | Repairs and charges 25% faster | Likes it when things fall down |
| **Dao Renard** | Ex-diamond courier and bush pilot, nervy, always owed money | Locator range +50% | Knows where the money moves |
| **Sefton Bray** | Oldest merc in the Concession, here for the first war too | Guns wear 25% slower | Knows who owes whom, and why |

**The map.** 2048 m × 2048 m, centred on the origin, y up, x east, z south. Fixed design, the same every game (no random layout). Places have merc nicknames, written in grease pencil on the map. All coordinates are metres. Adjust locally for fit, and keep the table in `src/data/world.js` as the single source of truth.

| Id | Place | x, z | What's there |
|---|---|---|---|
| `kiln` | **Kiln**, ceasefire town | −60, 110 | 16–20 buildings, market, both fixers, the Doctor, the bar ("The Last Invoice"). Weapons auto-holster. Gates at N and E, both flagged |
| `landing` | **The Landing** | −55, 212 | Barge jetty on the Marrow. Prologue ends here |
| `yard` | **The Widow's Yard** | 40, 70 | Shipping containers outside the east gate. The gun table |
| `bridge_road` | **Kiln Bridge** | 130, 60 | Old road bridge east across the Marrow, the only road to the east bank. South-east to the Long Grass, north-east to the Workings |
| `s1` | Safehouse **Pump House** | −240, −40 | Given in C1 |
| `s2` | Safehouse **Salt Shed** | 420, 300 | In the Long Grass. Must be taken (C4) |
| `s3` | Safehouse **Signal Box** | 120, −395 | On the rail line. Optional: clear its guards and it's yours (Salt Shed is the same, through C4) |
| `gp1` | Post **Junction** | 40, −120 | Crossroads north of Kiln. Commons at start |
| `gp2` | Post **Grass Road** | 300, 180 | Tank stand, sandbags. Commons at start |
| `gp3` | Post **Rail Crossing** | 120, −300 | Stewards at start |
| `gp4` | Post **Depot Road** | −420, −300 | Stewards at start |
| `gp5` | Post **Workings Gate** | 570, −370 | East bank, where the road and rail meet the pit's fence. Stewards at start |
| `gp6` | Post **Switchback Foot** | −300, −540 | Foot of the only road up the Escarpment. Nobody's: deserters from both |
| `gp7` | Post **Low Ford** | −500, 390 | Vehicle ford toward the camp. Commons at start |
| `gp8` | Post **North Road** | 380, −60 | East bank, on the road from Kiln Bridge to the Workings. Stewards at start |
| `dump` | **The Fuel Dump** | 560, 520 | Commons diesel tanks, office, in the deepest grass |
| `railbridge` | **Bad Bridge** | 470, −380 | Steel rail span over the Marrow |
| `depot` | **West Depot** | −780, −380 | Stewards rail yard, supply base |
| `workings` | **The Workings** | 760, −430 | East bank. Terraced open pit, about 180 m radius, 40 m deep. Conveyor, sheds, strongroom at the bottom |
| `mission` | **The Mission** | −420, −820 | Old church and radio mast on the Escarpment. Commons and Stewards both avoid it |
| `camp` | **Second Water** | −600, 500 | Refugee camp, south bank |
| `waterhole` | **The Waterhole** | 700, 120 | Herds gather here |

**Terrain.** A pure function `heightAt(x, z)` in `src/sim/terrain.js`, baked to a Float32Array at 2 m (1025 × 1025): low rolling noise (±8 m), then authored features from data.

- **The Marrow:** a spline through (900, −1024), (760, −740), (540, −560), (470, −380), (400, −220), (200, −60), (60, 180), (−120, 290), (−420, 360), (−760, 470), (−1024, 720). Carved 6 m deep, 30–60 m wide. It splits the map: Kiln, the Depot and the Escarpment on the west bank; the Long Grass, the Dump, the Workings and Second Water on the east and south.
- **The Escarpment:** +80 m plateau north-west of the line from (−1024, −420) to (120, −780), with a single switchback road.
- **The Workings:** a terraced negative cone.
- Flat disks under POIs, and 7 m flat corridors along road splines.
- **Rail line:** from `depot` along z ≈ −380, past Signal Box, over `railbridge`, to the pit's west side.
- **Roads:** Kiln north gate → Junction → Rail Crossing → Depot Road → Switchback Foot → Mission. Kiln east gate → Yard → Kiln Bridge, then forking to Grass Road → Dump and to North Road → Workings Gate. A west road from Kiln to Low Ford → Second Water.
- **Biome mask:** tall grass (1.3 m) over the Long Grass quadrant (x > 130, z > 80) and in patches; short grass and bare laterite elsewhere; rock on the Escarpment; green strip along the river.
- **Scatter (seeded, deterministic):** about 1500 flat-topped acacias, 4000 brush clumps, 800 rocks, 120 termite mounds. Trees and rocks are static colliders.

**Time.** 24 game hours = 36 real minutes by default (tunable). Sleep skips to a chosen time. Dawn, morning, noon, golden hour, dusk and night all look clearly different (§10.3) and change AI vision.

**Wind.** A global angle and speed (0–12 m/s), drifting slowly on seeded noise, with gust events and scripted shifts. Read it from the cloth strip on your weapon and aerial, the grass sway, the smoke lean, and the GPS arrow.

**Weather.** Clear, dust haze, and dry thunder (lightning can start far-off fires). One scripted rain squall in Ending 3's aftermath. Rain puts fires out, and it should feel like an event because the season is dry.

**Ambient life (not optional, it's half the mood).**

- Zebra and antelope herds that flee gunfire and fire.
- Vultures that circle where bodies are.
- Dust devils, river mist at dawn, distant artillery flashes at night.
- Civilians in Kiln and the camp going about their day, and scattering when shots start.
- Painted road signs at junctions pointing to places (diegetic navigation).
- Slogans on walls ("SHIFT'S NOT OVER", "STEWARDS KEEP WHAT THEY STEAL") and company notices (`NOTICE: LEASE TERMS UNCHANGED`).

---

## 3. Loop and pacing

**Core loop:** wake at a safehouse and choose your hour → take a contract (a buddy may call with a better, riskier way) → cross the country with the map in your hand, past posts and patrols → read the ground through the monocular (wind, grass, guards) → do the job your way (burn, shoot, sneak, drive through it) → survive the friction (jam, fever, wound, breakdown) → get paid in diamonds and spend them → see what your work changed → sleep.

**Pacing target for a first play:**

| Minute | Beat | Features first seen |
|---|---|---|
| 0–4 | Prologue on the barge | First-person dialogue, merc pick, map, checkpoint and papers |
| 4–12 | C1 First Wages | Truck, GPS, post fight, forced jam, loot, surgery, shop, locator, safehouse, sleep and save |
| 12–22 | C2 Dry Grass | Wind, flare, fire, monocular, machete, twist, a buddy rescue if you go down |
| ~17 | First fever | Warp, pill. Doctor's errand offered |
| 22–30 | E1 Bark run | Skiff, ferry, camp, consequences |
| 30–38 | C3 Bad Bridge | Night, charges, explosion physics, train |
| 38–44 | C4/C5/C6 in player's order | Safehouse capture, convoy, mounted gun, dynamite truck, forged papers |
| 44–52 | C7 The Workings | Choose a side. Big battle. Mercy |
| 52–60 | C8 The Notary | Three endings |

**The Director (`src/sim/director.js`) guarantees the first-time moments** so every player sees everything:

| Event | Rule |
|---|---|
| First jam | Forced on the first firefight, about the 15th shot, with the C1 starter gun |
| First breakdown | Scripted engine hit on the road after C1 |
| First fever | 5 minutes after C1 ends, only when no enemy is alerted within 40 m |
| First rescue | Guaranteed on the first time you go down, whichever buddy is available |
| Mercy | C7 (§5) |
| Fire near you | C2's wind shift is scripted once |

After a feature's first use, a one-line tip goes in the notebook.

**Feature list (F-list).** `src/data/features.js` lists every feature id. The sim records each as seen. Tests assert the scripted playthrough covers 100% and attract mode covers at least 80% (§14). Ids:

`fire_spread wind_shift flare_ignite molotov torch_flame rocket explosion_physics tree_burn ember_spot regrow jam jam_clear gun_break rust_visual loot_gun shop_buy armoury_redraw heal_syringe surgery_bullet surgery_finger surgery_shrapnel surgery_burn fever pill collapse rescue buddy_down mercy twist_offer twist_done papers_ok papers_fail post_clear post_regarrison monocular_tag machete_takedown crouch_grass night_stealth map_raise map_focus map_drive gps_waypoint locator_found diamond dictation drive breakdown repair mounted_gun skiff ferry truck_cargo train sleep_time save_load day_night ceasefire_town ragdoll wounded_crawl comrade_drag animals_flee ending_read ending_sell ending_burn coop_revive coop_case`

---

## 4. Systems

All numbers are defaults. Everything in the Tunables table (§9) reads from `tunables` live. The sim is deterministic: fixed 60 Hz step, seeded RNG streams, no `Math.random` (§13).

### 4.1 Player

- Walk 4.2 m/s, sprint 7.0 (6 s stamina, 4 s regen), crouch 2.2, jump 1.1 m. Eye height 1.62 standing, 1.05 crouched. FOV 75 (setting), 50 when aimed.
- **Health:** 100, shown as 5 big bars. Damage regenerates only up to the top of the current bar, 4 s after the last hit, at 6 hp/s.
- **Downed** at 0. See rescue, §4.11. With no rescue available you die: a ledger page ("Contract void.") and a reload from the last save.
- Rapier kinematic character controller (recipe §13.5). Legs visible when you look down. Head bob is subtle and switchable.

### 4.2 Weapons, condition and jams

Loadout: **Sidearm + Long Gun + Heavy**, plus machete and Molotovs. Merc nicknames, no real brand names. Each weapon instance has its own **condition 0–100**.

| Id | Name | Slot | RPM | Dmg | Mag / reserve | Eff. range | Wear/shot | Price | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `pistol` | Service Pistol | Side | 300 | 24 | 12 / 48 | 30 m | 0.10 | start | C1's worn starter |
| `quiet` | Quiet Pistol | Side | 240 | 22 | 10 / 30 | 22 m | 0.14 | 3 | Heard at 12 m |
| `flare` | Flare Pistol | Side | 30 | 12 | 1 / 8 | arc 80 m | 0.5 | 2 (free in C2) | Ignites fuel within 2 m of impact; lights the dark |
| `carbine` | Worker's Carbine | Long | 600 | 28 | 30 / 120 | 60 m | 0.05 | 3 | Commonest loot |
| `rifle` | Surveyor's Rifle | Long | 45 | 110 | 5 / 20 | 400 m | 0.35 | 6 | Bolt, 4× scope |
| `pump` | Trench Pump | Long | 65 | 13 × 9 | 6 / 24 | 18 m | 0.25 | 4 | |
| `belt` | Belt Gun | Heavy | 700 | 26 | 80 / 160 | 70 m | 0.04 | 7 | You walk slowly |
| `tube` | The Tube | Heavy | 1 shot | 180 splash 6 m | 1 / 4 | 150 m | 1.5 | 8 | Ignites |
| `torch` | Drip Torch | Heavy | stream | 40 dps | 100 / 200 fuel | 14 m | 0.1/s | 6 | Ignites. Tank can explode if shot |

- **Machete:** 60 dmg, instant silent kill from behind (prompt), no wear.
- **Molotov:** carry 3, 5 m burn patch, usable from a truck window.
- **Condition:**
  - Dealer-fresh 100. Looted 18–55.
  - Jam chance per shot: `jamK × ((50 − cond) / 50)²` below condition 50, with `jamK` 0.04 by default.
  - Condition drops 2 when dropped in water or caught in fire.
- **Jam:**
  - The gun clicks, a jam sound plays, and the reload button clears it: hands slap and rack, 1.0–1.8 s by weapon class.
  - Below condition 15 a clear can fail (15%).
  - At condition 0 the next jam **breaks** the gun: it comes apart in your hands and is gone.
- **Reading it:** condition drives a `rust` uniform on the view model (noise-thresholded rust blotches, tape wraps below 30, wisp of smoke below 10). No HUD number; the HUD ammo icon only cracks below 25.
- **Shop model:** buying unlocks a weapon for good. A fresh copy can then be drawn free from any **armoury crate** (the Yard, and safehouses once bought).

**Targets:** enemy guard TTK with carbine about 4 body hits, 1–2 head. Player survives about 8 enemy carbine hits (14 each) from full. Standing in the open at 30 m under 3 guards takes about 1.5 hits/s. Crouched in cover, far less.

### 4.3 Wounds and healing

- **Syringe** (carry 3, pouch upgrade +2, med boxes +1): heals fully in 1.6 s.
- **Critical** (≤ 1 bar): limp, ink closing in at the screen edges. The heal button now does **field surgery**, free, 2.6–3.5 s, interruptible, chosen by the last damage type. It restores to 2 bars. Four animations: pliers dig a bullet from the forearm (`surgery_bullet`), snap a dislocated finger back (`surgery_finger`), pull shrapnel from the thigh (`surgery_shrapnel`), wrap and bite down on a burn (`surgery_burn`). Each has its own grunt and its own rumble. Keep them short, stylised and memorable.

### 4.4 The fever

- You have malaria-like fever from day one. Never name a real drug beyond "bark" (quinine bark).
- First attack per the Director. Then every 11 ± 2 minutes of play (tunable), anywhere.
- **Warning, 35 s:**
  - Warp and desaturate in the post chain.
  - Ink "sweat" running at the screen edges.
  - Aim sway, ringing in the ears, heartbeat in the rumble.
  - A small fever icon on the HUD plus the prompt "Take your dose".
- **Last 10 s:** stumbles, flicker blackouts, no sprint.
- **Pill** (button, 1.8 s, shake the bottle and swallow dry) ends it, with effects fading over 8 s. Start with 2 doses; a bottle is 4; max 8.
- **No pill: collapse.** Black, a ledger line. You wake 6 hours later at the nearest safehouse, weapon condition −20, one diamond missing. Never a game over.
- Pills come **only** from the Doctor's errands (E1, E2), and the Doctor gives 2 doses free when you're at zero after a collapse, with a line that makes you feel it. So there is always a way forward.

### 4.5 Fire and wind (the star; build it early)

**Grid:** 512 × 512 cells, 4 m each, typed arrays in `src/sim/fire.js`: `fuel` (0 none, 1 grass, 2 brush, 3 tree, 4 structure), `moist` (0–1), `state` (0 unburnt, 1 burning, 2 burnt), `timer`. Index `iz * 512 + ix`, with `ix = floor((x + 1024) / 4)`. Roads, rock and water have fuel 0. Tick at 10 Hz over a burning set only.

**Spread:** each burning cell tries each of 8 neighbours with chance
`spreadBase × fuelK × windFactor × slopeK × (1 − moist) × dt`,
where `windFactor = 1 + windK × speedNorm × max(0, dot(windDir, dirToNeighbour))`, or `upwindDamp` when the dot is negative. `slopeK` is greater than 1 uphill.

**Asserted targets** (a test measures these):
- Dead calm: front ≤ 1 m/s.
- 10 m/s wind: downwind ≥ 4 m/s (faster than walking, slower than a sprint or a truck).
- Upwind ≤ 0.3 m/s.

**Burn times:** grass 6–10 s, brush 14 s, tree 40 s. Burning trees throw **embers**, starting spot fires up to 30 m downwind, so a one-cell road can be jumped in strong wind and a river can't.

**Effects:**
- In or within 2 m of a burning cell: 18 hp/s and a `burning` status for 3 s. NPCs catch, panic-run (spreading it) and fall as charred silhouettes.
- Barrels and fuel tanks cook off after 3–6 s. Ammo crates pop. Vehicles take heat damage and can blow.
- NPCs treat burning cells as walls and flee fire fronts; a fire flushes men out of cover.
- A coarse smoke grid (16 m) blocks AI sight and yours.

**Persistence:**
- Burnt ground stays black. It's saved (RLE).
- Green shoots appear after 1 game day, full grass after 3.
- Burn scars smudge the paper map as charcoal.

**Ignition sources:** flare pistol, Molotov, Drip Torch, The Tube, explosions, burning vehicles, muzzle flash of heavy guns in very dry grass (rare), lightning, Steward fire teams.

### 4.6 Stealth and AI

- **Perception:** vision cone 110°, range 70 m by day, 30 m at night (standing near a fire or lamp, or driving with headlights on, raises it). A detection score fills by distance × light × movement × stance. Crouching in tall grass ×0.35. Smoke blocks. Hearing: carbine 180 m, quiet pistol 12 m, truck 90 m, sprint 12 m.
- **The HUD shows detection as ink arcs around the crosshair** pointing at whoever is noticing you. Nothing else.
- **States:** idle/patrol → suspicious (looks, barks) → investigate → alert (calls squad) → combat (cover, flank, suppress, rush) → flee-fire → wounded → dead.
- **Wounded:** some shot men fall, crawl and beg. A comrade may drag them (`comrade_drag`). They bleed out, or you end it.
- **Night:** some guards sleep at posts, others carry lamps.
- **NPC guns jam too** (visible fumbling): an opening for the player.
- **Implementation:**
  - A* on a 4 m grid, shared with fire (burning cells are blocked).
  - Hand-placed cover points per POI in data.
  - Rapier character controllers within 150 m of a player. Beyond that a cheap 2 Hz "far" mode using `heightAt` (✔ 200 controllers plus 200 dynamic bodies run at 93 steps/s in Node here, so far NPCs must not use them).
  - Line of sight by `castRay` excluding the caster (✔ rays hit your own capsule otherwise).
- **Archetypes:** guard, sergeant (150 hp, calls flanks), gunner (mounted guns and Belt Gun), fire team (Drip Torch, lights grass on purpose, late game and The Job).
- **Patrol trucks:** 2–3 per faction on road splines. Chase when alerted, with a gunner firing, and stop 30 m out to dismount. Papers apply to them too (a wave, a slow-down, or a fight).
- **Death:** hit reaction → ragdoll (§11).

### 4.7 Posts, papers and the ceasefire

- **Post:** 3–5 guards, sandbags, an MG nest or a parked technical, stacked barrels, grass around it you can burn.
- **Clearing a post** keeps it cleared until the next 06:00, and it only refills if its faction's depot is intact and the road to it isn't cut. Then a **real truck drives in** with 60% of its strength, reaching 100% after two dawns. `dump` burned hurts the Commons; `railbridge` blown hurts the Stewards. Contracts can flip a post's owner.
- **Papers.** Doing a faction's first contract gives you its papers (a physical card). At that faction's posts, if you approach slowly (< 25 km/h) with the gun lowered, a guard flags you down and walks to your window. You hold the papers out (`papers_ok`). He looks, says something tired, and waves you on. Speed through, or have standing below −10 or contraband in the truck: "Out of the truck." (`papers_fail`), and it's a fight. Other factions' posts shoot on sight. Attacking a faction's post where witnesses survive burns your papers until the next dawn.
- **Kiln ceasefire** (Second Water too). Weapons holster at the gates, and drawing takes a deliberate long press. Fire a shot in town and both sides' gate guards turn hostile for a game day, the fixers refuse you, and the Widow charges +1.

### 4.8 Vehicles (all Rapier)

- **Pickup** (raycast vehicle, ✔ §13.5), **Technical** (pickup with mounted MG; switch seat with Triangle and the wheel is left free), **Cargo truck** (AI convoys; the dynamite truck in C6), **Skiff** (dynamic body with custom buoyancy and thrust, on the Marrow), **Barge** (scripted, the ferry), **Train** (kinematic on the rail spline, C3).
- First-person at the wheel with hands on it, working dash, aerial with cloth strip, and the map usable while driving.
- **Damage:** 300 hp pickup. Below 60% light smoke; below 35% engine cough and −40% top speed; below 15% stall; below 5% burning, blows in 6 s.
- **Repair:** get out, hold Use at the hood: hood opens, wrench on engine, 4.5 s, restores to 70%. Interruptible. Full repair at safehouses and the Yard.
- **Ferry:** the Ferryman runs between the Landing, Bridge Pier (near `railbridge`) and Second Water. You sit on the barge, an ink wipe passes time, you're there. A short line each trip. This is the game's fast travel.

### 4.9 Map, GPS, locator, monocular

- **Map (D-pad Up / M):** a physical paper map raised in your left hand, GPS clipped to it. You can walk, run or drive with it up.
- **Map content:** a CanvasTexture, hand-inked: contours, roads, rail, the Marrow, place names in grease pencil, current contract circled in red, safehouses, posts you've seen with their owner, burn scars redrawn as charcoal, your position as a small red arrow.
- **Focus (Cross, or left-click, while raised):** the map fills 85% of the screen. Left stick or mouse moves a cursor. R2/L2 or wheel zooms. Cross or left-click sets a waypoint. Square or right-click clears it. Circle or Esc lowers it. Big text only, no pins legend. At the wheel, focusing takes your hands off: the truck coasts and brakes gently until you lower it.
- **GPS:** big arrow to the waypoint, distance, wind arrow.
- **Locator:** when a diamond case is within range (120 m, upgradeable), an LED on the GPS blinks with a rising beep and a rumble tick. Faster when closer and facing it, solid green when in line.
- **Monocular (D-pad Left / B):** zoom 6×. Hold on a guard for 0.6 s to tag them with a small ink triangle shown while in line of sight. Also tags barrels and tanks.

### 4.10 Diamonds, the Widow, safehouses

- **Diamonds** are the only currency. 12 cases are hidden around the map (1–2 each, mostly in places worth seeing: the capsized barge, the water tower at Grass Road, under the rail bridge, the pit's upper terrace).
- **The gun table.** The Widow's stock lies on a long table in the world. Look at a gun or click it (hover or look moves the focus, with a big card: name, one line, price). Interact to buy. L1/R1 steps through items for pad players who don't want to aim at a table. No grid screens, ever.
- **Shop upgrades:** Syringe pouch 4, Molotov bandolier 3, Locator range 3, Armoury crate at Salt Shed 2, Armoury crate at Signal Box 2.
- **Economy target** (printed by `tools/balance.mjs`): contracts pay 3, 6, 7, 3, 6, 7, 10, with twists +3 each and cases about 18. Total about 75 against about 53 in the shop, so a thorough player buys most things but not early.
- **Safehouses:** a bed, med box, ammo, and an armoury crate where bought. A truck spawns outside if you came on foot. **Bed:** lie down, a large watch fills the view, and you pick Dawn, Noon, Dusk or Midnight. The hands spin and light sweeps through the shutters (ink-wipe time-lapse). Sleeping saves.
- **Saving:** one save plus one backup in `localStorage`. Autosaves when a contract starts or finishes. "Continue" loads the latest. No slot screens.

### 4.11 Buddies, rescue, mercy

- Each buddy has `trust` (starts at 30) and a state: `ok`, `wounded` (until the next sleep) or `dead` (forever). They wait at the bar, and turn up in the world for rescues and twists. Their voices and hands are as in §2.
- **Twist.** After you accept a contract, a buddy radios or meets you with a better, riskier way: an extra objective, more pay, +10 trust. They show up on site and fight alongside you. Each twist (and C4, which a buddy gives) names a default merc. If that merc is you, or dead, the next living buddy by trust takes the same lines, so write them to fit anyone. No buddies left: no twists, no rescues, and the game still completes.
- **Rescue** (the source's signature moment, our staging):
  1. At 0 hp you drop. Ink closes in, there's a heartbeat, the sound goes underwater. You can crawl slowly and fire your sidearm for about 12 s.
  2. An available buddy (highest trust and not wounded) runs in, firing, invulnerable until the rescue finishes.
  3. They kneel over you, syringe in frame, say a line. You're dragged 5–8 m to cover (real camera drag), a pistol is pressed into your hand, and you're up at 2 bars.
  4. They fight beside you for up to 60 s and then leave. That buddy is now `wounded` until you sleep.

  So two rescues are possible per day at most, and the third time down is real.
- **Buddy down.** In that fight, or on a twist, a buddy can drop and call for you. Reach them in 60 s and choose, big and first-person: **Syringe** (costs your syringe, `buddySaveChance` 35%, it works or it doesn't) or **Morphine** (mercy, always available). Walking away is also a choice, and they call after you.
- Buddies are gone for good when dead. The bar stool stays empty and their tab stays open on the wall.

### 4.12 Factions and world state

`world.state` holds: post owners and garrisons; `dump` and `railbridge` status; standing with each faction (−100..100, start 0); papers; `camp.count` (starts at 212, changed by your choices and consequences); buddy states; dictations found; chosen side; flags. Contract `onComplete` actions change it. Dialogue variants and the camp's look (crowded, thinning, ash on the tents) read it. The ending ledger prints from it.

### 4.13 Contract runner

`src/sim/contracts.js` runs declarative data from `src/data/contracts.js`.

```js
{ id:'c2', title:'Dry Grass', giver:'comptroller', requires:['c1'], side:'stewards', pay:6,
  offer:['line id',…], twist:{ buddy:'tomasz', line:'…', pay:3, trust:10, steps:[…] },
  steps:[ {do:'goto', poi:'dump', r:90, note:'…'}, {do:'destroy', tags:['dump_tank'], count:3},
          {do:'return', npc:'comptroller'} ],
  onComplete:[ {set:'post.gp2.owner', to:'stewards'}, {add:'standing.commons', by:-20},
               {add:'camp.count', by:-12}, {ledger:'…'} ] }
```

Step vocabulary: `goto, talk, interact (hold), collect, destroy, kill, plant, survive, hold_zone, escort, deliver, drive_cargo, sleep_until, choice, wait_event`. Each step type is a small handler. Documented in `docs/DESIGNER.md`, validated by `tools/validate-data.mjs`.

**Nothing dead-ends.** A failed contract (dynamite truck lost, target escaped) is re-offered after the next sleep at lower pay, with any lost vehicle or item re-issued. A contract that needs a destroyed thing to still exist re-checks world state first and adjusts. The bot playthrough tests one failure and retry.

---

## 5. Story and writing

### 5.1 Voice (narrative tone)

A weary, literate, morally exhausted voice, in the spirit of the source's Conrad-flavoured bleakness, with **our own rhetorical signature: bookkeeping**. Everyone talks about violence as accounts, shifts, invoices, rates, write-offs. Rules:

- Short declarative sentences. People talk while doing something else, and they don't stop because you walked off.
- Nobody explains the theme. Nobody winks. Humour is dry and dead-eyed.
- No "chosen one". You're a line item and everyone knows it.
- Subtitles are the only real language (voices are gibberish, §12). Two lines at most, big type.

**Samples, to set the bar. Write the rest in this voice.**

> **Ferryman:** First time? … Everyone says it's their last. Mostly they're right.
>
> **Widow:** New barrel, no rust, no history. That's more than you can say for anyone who's ever bought one.
>
> **Comptroller:** We don't say "war" in this office. We say "adverse operating conditions". You'll burn the Commons' diesel before Thursday. Invoice me for the matches.
>
> **Foreman:** My grandfather dug that pit. My father dug it deeper. I'm the first of us who gets to fill it.
>
> **Doctor:** Nothing here cures. It only moves the bill to next week.
>
> **Clerk of Second Water:** Two hundred and twelve this morning. You can tell whoever pays you that I counted.
>
> **Ines (rescue):** Don't look at it. Look at me. There. That's the worst of it over, and I'm lying.
>
> **Tomasz (rescue):** I said I'd come back for you. I also said that to my wife. Get up.
>
> **Dao (rescue):** You owe me four diamonds and a leg. Yours, if I have to carry you again.
>
> **Sefton (rescue):** Thirty years I've been leaving this place. Up you come.
>
> **Guards:** "Wind's coming round! Leave it, leave it!" · "It's stuck, it's stuck!" · "Don't leave me for the birds." · "Got you. Stop helping."

Write at least: 4 rescue lines per buddy; 12 lines per fixer; 20 guard barks per category (spotted, lost you, fire, jam, wounded, dragging, reload, ceasefire), shared by both factions with different flavour; 10 Ferryman trip lines; a tip line for each feature in the F-list.

### 5.2 Dictations (six hidden tapes, the Notary's voice, subtitled)

1. *Entry twelve. Forty crates to the Stewards on Tuesday. Forty to the Commons on Wednesday. On Friday the crates were opened on each other. I've checked the figures twice. They balance. They always balance. That is what frightens the clever ones.*
2. *Entry twenty-nine. A man came up the road to kill me. Good boots. I paid him twice what they were paying, and he shot the man who sent him. I've entered it under Sundries.*
3. *Entry thirty-three. People ask why I write it all down. A war with no records is only weather. I will not have this called weather.*
4. *Entry fifty-eight. The bark has stopped working on me. The Doctor says it isn't the fever any more, it's forty years of pit dust. I asked for that in writing.*
5. *Entry seventy-one. The Underwriters insure the Stewards against the Commons, and the Commons against the Stewards, at one rate, through one desk. I've met the man at the desk. He has a garden.*
6. *Entry ninety. You'll have found this in the strongroom, because I left it there. Come up to the Mission. Bring whoever's left. I have you down for Thursday.*

Tape 1 comes from C2's twist, tape 6 from C7. Tapes 2–5 are hidden in the world (a dead courier at `gp6`, the Signal Box, the capsized barge, the camp clerk's desk). Play through a small recorder, with the world still running.

### 5.3 The campaign

**Your job:** the Underwriters hired you to find a clerk called the Notary and bring back his ledger, or proof of death. You have no way in, so you take the work the country offers.

**Prologue: The Barge** (dawn, walkable deck, 3–4 minutes, hold to skip).
- Down the Marrow past a burned bank, a wrecked patrol boat, zebra at the waterline. Three other mercs share the deck and needle each other.
- A Steward checkpoint launch stops you. An officer lays four passports on a table: **pick who you are** (`passport` focus by look, hover or D-pad). The other three are now your buddies.
- The Ferryman hands you the map: "It's wrong, but it's wrong in useful ways."
- Land at the Landing with a first shiver. An Underwriters' agent in a clean shirt confirms your job and leaves on the same barge.

**C1 First Wages** (the Widow, morning).
- A crate fell off a convoy at Junction. She lends you a rust-bucket pickup and a worn Service Pistol.
- Map up, set out. Two lazy guards at `gp1`. First fight, **forced jam**, first loot (a Carbine at condition 30), first surgery if hurt.
- Bring the crate back: 3 diamonds. She fits the locator to your GPS and points you at a case in the ditch by the Pump House. Shop opens. Sleep at the Pump House: choose an hour, save.
- Scripted engine hit on the next trip out: first repair.

**C2 Dry Grass** (Comptroller). Burn the Commons' Fuel Dump in the Long Grass. He gives you a Flare Pistol: "It's a signal flare. Signal something." Stewards' papers issued.
- *Beats:* drive out over Kiln Bridge (through or around `gp2`), climb the rise, monocular, read the wind, light the grass upwind. Three tanks must go. **Scripted wind shift** as the tanks blow: the front swings toward you, and you run or drive.
- *Twist (Tomasz, or the highest-trust merc you didn't pick):* "There's a courier in that office with a satchel. Get him out before you light it, or don't light it till you have." Pay +3, tape 1, first mention of the Notary.
- *Consequences:* `gp2` flips to Stewards, a black scar across the Long Grass that stays. The camp's road is smoked (`camp.count` −12). The Doctor mentions it.

**E1 Bark Run** (the Doctor, offered at first fever). Carry transit papers to Second Water: by skiff from below Kiln, or by ferry, or by truck through `gp7`. Meet the Clerk, who counts. See what your last job did. Reward: a bottle of 4 doses.

**C3 Bad Bridge** (Foreman, night). Blow the rail span before the morning troop train. Commons' papers issued.
- *Beats:* skiff up the Marrow in the dark, guards with lamps, plant 3 charges on the piers (hold), get clear, detonate. The span falls in real physics (a cluster of dynamic bodies).
- *Twist (Dao):* "There's a payroll car on that train. Wait for it. Blow it when it's on the span, and I'll meet you in the water." The train really crosses. Salvage the strongbox from the wreck under fire. Pay +3.
- *Consequences:* Stewards' eastern posts stop refilling. The rail was the camp's way out (`camp.count` −20, or +15 if you'd delivered E1 first: people left in time). The Widow's prices go up by 1 on heavy weapons ("Bridge is out. Everything's dearer now.").

**C4 Salt Shed** (Ines, any time after E1). Take the Salt Shed: a stealth-friendly post at dusk, machete and monocular, tall grass to hide in. Reward: safehouse, +10 trust.

**C5 Good Intentions** (Comptroller). Stop a Commons radio truck convoy on the Grass Road: ambush from a Technical, mounted gun, moving targets.
- *Twist (Sefton):* "Stop it, don't burn it. The driver's an old friend. He knows where the Notary drops his tapes." Spare him: tape location and trust. Burn it: pay stays, tape stays hidden until you find it.

**C6 Second Shift** (Foreman). Drive a dynamite truck through Steward posts to the Workings Gate, on forged papers. Bumps damage cargo, fire detonates it. The papers scene at `gp8` is at its tensest here: a sticky-handed sergeant might search you. `gp5` is next. Leave the truck at the gate and walk (it goes up on a timer), or drive it through.

**E2 Second Bark Run** (Doctor, when you're low on doses). A Steward patrol is emptying a refugee truck on the road to Low Ford. Ignoring it costs nothing. Stepping in means a fight, your Stewards' papers burned until dawn, and `camp.count` +60.

**C7 The Workings** (Day 3, dusk; both fixers call you in).
- **You must pick a side now** (`choice`, irreversible). Your side's squads assault; the other's defend the pit.
- Fight down the terraces: burn the dry brush on the upper levels, ride the conveyor, or use the service tunnel at night. Your highest-trust buddy joins you.
- In the strongroom: tape 6 and the ledger's key.
- **On the way out your buddy is hit and goes down. Mercy scene, always, the first time:** "It's all right. I can count. I've got the minutes and they don't come out. You've got a syringe. Don't be polite."
- Your side now owns the map's posts.

**C8 The Notary** (night, the Mission). Up the Switchback past deserters at `gp6`. He's at a desk with a lamp and the ledger, not armed, coughing. He talks while he sharpens a pencil, and you can walk around the room.

> You're late. I had you down for Thursday. Sit, or don't. Everything's in the book. Who sold. Who bought. Who insured the buyer against the seller, and at what rate. You can read it out: the mast still works. Four minutes, if they let you have four minutes. Or take it down to the river. The Underwriters keep their word; it's the only thing they keep. Or there's a flare on the desk. The wind comes round at dawn. I've done the sums. I won't tell you how they come out. I've found people argue.

Three endings, all built from existing systems:

- **Read It Out (`ending_read`).** Start the transmitter and hold the church and mast for 4 minutes against squads from both sides (`hold_zone`). A surviving buddy with trust ≥ 60 comes to help; one below 60 comes for you, and has your mercy prompt too. The ledger reads out over the radio, in the Notary's voice, while you fight. At dawn the mast is down and you walk toward the camp. *Ledger: "Account closed. No balance carried."*
- **Sell It (`ending_sell`).** Take the ledger down to the Landing by 06:00. A truck run through both sides' roadblocks and a burning Long Grass. The clean-shirt agent pays in full. You stand on the barge. A new merc comes aboard, and you are handed a recorder. Your hand presses Record. *"Entry one."* The Ferryman, to the new merc: "First time?"
- **Burn It (`ending_burn`).** Light three marks along the ridge line as the wind comes round, walling both armies off from Second Water (`camp.count` keeps what you saved, and the burn costs the Grass). Run through your own fire. Rain comes at last. The ledger is ash. *Ledger: "No records exist. Some people do."*

**Epilogue:** a ledger page, big type, one line at a time, printed from world state: people at Second Water; buddies carried and written off; grass burned in hectares; doses taken; guns broken; who owns the Concession now. Then credits, then the title screen. The title scene remembers: the grass is black after Burn It, the mast is down after Read It, and there's a recorder on the rail after Sell It.

---

## 6. Multiplayer

TASK.md requires following the AI Hub Session Protocol v1 (`https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/README.md`). Read that page once. Fetch `session.js`, `harness.html`, `bridge.js` and `round.js` from the same folder (`vendor/session.js`, `tools/hub/`). Client 1.4.0 ✔ at planning time. The harness's checks are the spec. Facts that shape the design:

- Mode **`shared-world`**, seats **`[1, 4]`**, own card (`card: true`).
- `session.js` goes in **unmodified as the first script in `<head>`, right after `<meta charset>`**. The hub checks it byte-for-byte; don't let esbuild touch it.
- Tags:
  ```html
  <meta name="hub:session" content="1">
  <meta name="hub:session-players" content="1-4">
  <meta name="hub:session-mode" content="shared-world">
  <meta name="hub:session-minutes" content="8">
  <meta name="hub:session-goal" content="Get the case onto the barge before the grass burns">
  <meta name="hub:session-howto" content="Stick/WASD move · R2/LMB fire · Square/E use · D-pad up/M map">
  ```
  Declaring 8 minutes makes the hard limit 12 (1.5 ×, never past 15). Don't set `hub:webgpu`: the game also runs on three's WebGL2 fallback (§13.4), and the hub then deals it to every browser.
- Also in `<head>`: `<title>TITLE — TAGLINE</title>`, `meta description`, `theme-color`, an inline `data:` icon, `<meta name="hub:source" content="Far Cry 2">`.

### 6.1 The round: "The Job"

The same world and systems, one self-contained 8-minute co-op contract in the Long Grass at golden hour. A round is `createSim({ scenario:'job', … })`. Seats map to the four mercs in order, with armband and name tag in the seat colour.

1. **In (0:00–~3:00).** All start at Salt Jetty (150, 110, on the east bank just below Kiln Bridge) with two pickups. Objective: the strongbox at the Fuel Dump. `gp2` is in the way. You can go through, around, or light it up. 9 extra diamond cases nearby, with locators on. Each diamond is personal score.
2. **The Case (~3:00–~5:00).** Hold Use on the strongbox (12 s, split between players working it). The alarm sounds. A case appears. Its carrier can't sprint and uses sidearm only, and drops it when downed. Anyone can pick it up.
3. **Out (5:00–8:00).** The wind shifts. A Steward fire team lights a line across the plain, sweeping toward the river. Chase trucks come. Everyone has one fever attack at a seeded time and one dose. The barge leaves at 8:30, or when every living player is aboard, with or without the case.
- **Revive:** a downed player crawls and bleeds out over 45 s. Teammates hold Use for 3 s (a syringe from their pouch of 2) to get them up with the drag animation. With only one player in a round, one AI buddy (the next merc in seat order) comes along, run by the host.
- **Scale:** enemies × (0.6 + 0.2 × players).
- **Result:** `won` = case on the barge. `scores` = diamonds banked × 10 + 50 for the case if `won` + 15 per revive. Standings by score, players left behind tied last.
- `stats`: `Diamonds, Revives, Jams, Downs, Burned` (names ≤ 16 chars). `awards` (title ≤ 24, detail ≤ 40), for example "Pulled Them Out". Only the host calls `AIHub.finish`, with player ids only. A server copy isn't a player.

### 6.2 Boot in a session

**Why this order matters.** In the harness every copy is a same-origin iframe, so **all copies share one main thread**. ✔ A skeleton that rendered while loading **failed** the hub's default run (no WebGPU flags, 4 copies, main-thread WebGL2 in software): the ready deadline was missed, `time-up`'s 5 s grace was missed, and the round went void. ✔ With the order below, all copies were ready in about 0.25 s, and every case passed with and without flags. Keep this order.

In the built `<head>`, right after `session.js`, so the hello goes out before the big bundle has even parsed (10 s limit):

```html
<script>if (window.AIHub && AIHub.active) AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true });</script>
```

```js
// src/main.js
if (window.AIHub?.active) bootSession(); else bootStandalone();

async function bootSession() {
  const info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true });  // the same promise as above
  if (!info) return bootStandalone();          // no hub after all
  AIHub.on('message', onMessage); AIHub.on('leave', onLeave); AIHub.on('card', onCard);
  AIHub.on('time-up', () => { if (AIHub.isHost) finishNow(); });   // finish() within graceMs (5 s)
  AIHub.on('end', stopEverything);             // no input, no sends, sound off
  const sim = await createSim({ scenario: 'job', seed: info.seed, players: info.players, /* … */ });  // yield between stages
  if (!info.server) showCard(info);            // DOM and Canvas2D only
  AIHub.ready();                               // now: the sim is what must be ready. No key press
  if (info.server) return startSimTimer();     // a server copy has no renderer, camera, input or audio
  const view = await createView(sim);          // renderer.init(), scene built, NO frame yet
  AIHub.on('start', () => { startSimTimer(); setTimeout(async () => {
    await view.renderer.compileAsync(view.scene, view.camera);
    view.startFrames();                        // through the governor below
  }, AIHub.me * 800); });                      // stagger the copies
}
```

- **No 3D frame before `start`.** The card is DOM and Canvas2D.
- **Frame governor, in sessions.** If a frame took over 250 ms of main-thread time, wait `max(1000, min(4000, took × 3))` ms before the next. On a real GPU this never triggers.
- **Sim and sends run on a timer, not rAF**, and keep going when the tab is hidden. After `start`, keep every main-thread task short: `time-up` must reach `finish()` inside 5 s even with four copies on one thread.
- Measure on 4 copies with the real world build: `ready()` must arrive within the harness's 20 s, and aim for ≤ 12 s.
- **No title, attract, menus or dev mode in a session.** Options opens a small overlay that doesn't pause: resume, volumes, invert, glyphs. No quit. Ignore Options while Create is held (the hub's chord). **Nothing in the game is ever bound to Create, in any mode.**
- **Your card** is the game's own: a 2D ink composition (the jetty at golden hour, the truck, four passports on a crate), showing the game's name, each player in their colour with ready ticks, the goal, this player's controls, and the time left from the `card` event. Enter or Cross → `AIHub.answer('ready')`. Triangle or a named key → `AIHub.answer('more')`. No menus, no choices, no `Math.random`. Keep the key handler live from before `ready()`: the harness presses Enter shortly after.
- Play starts when `AIHub.time() >= 0`. Use it for the shared clock and the barge's departure. The hub may pass a short `limitMs`: scale the job's clock to `min(510 s, limitMs − 30 s)`.
- `AIHub.rng(label)` for anything shared. The sim never uses `Math.random` anyway. Names always go in via `textContent`, never as HTML. No chat, emotes or custom names. No `alert`, `confirm`, `prompt` or `window.open` in a session, and nothing but the hub for network.
- **Graphics failure:** if `renderer.init()` rejects (no WebGPU or WebGL2), a plain DOM message and `AIHub.fail('no graphics')`.

### 6.3 Netcode

The host runs NPCs, fire, pickups, objectives. Each copy runs **its own player immediately** and tells the host where it is, like the hub's `arena.html` example. Static world is identical on every copy from the seed.

Limits: **20 messages/s per copy (burst 40), 16 KB each, unreliable messages over ~1200 bytes fragment and die whole.** So budget:

| Msg | Direction | Reliable | Rate | Content |
|---|---|---|---|---|
| `me` | client → host (`to`) | no | 12/s | `at`, position, yaw, pitch, stance, weapon, flags, and the vehicle pose if driving |
| `a` | client → host | yes | ≤ 6/s | Bundled actions: hit claims, interact, ignite, revive, pick up |
| `s` | host → all | no | 12/s | `at`, players, up to about 24 nearest NPCs (round-robin the rest), vehicles, wind. **JSON must stay under 1200 bytes:** integers, arrays not objects. Test asserts it |
| `f` | host → all | yes | 4/s | Fire deltas: newly burning and newly burnt cell runs |
| `e` | host → all | yes | 4/s | Bundled events: explosions, deaths, voice lines, pickups, objective steps, fever seeds, damage to players, the case |

- Coalesce into one outbox per tick. `send()` returning `false` is a test failure. Keep sending `me` and `s` from `start` even when nothing changed, including on a server copy (the harness checks traffic flows both ways on every copy).
- Clients interpolate others 150 ms behind and take older-than-newest snapshots as dropped. Own player is corrected only on teleports.
- **Hits are claims:** the client's shot, the host's check (target alive, range plausible). Fire on clients is visual only, from `f`.
- **Leaving:** `leave` removes the avatar and drops whatever they carried. If the host goes, the hub voids the round and `end` arrives; show nothing extra. `end` always stops input, sends and audio.

### 6.4 On its own, outside a hub

Outside a session everything in this section is inert, and `Math.random` and storage are the page's own. The game must also **offer multiplayer on its own**, as TASK.md asks:

- **Title → The Job** has two choices: **Go Alone** (you plus an AI buddy) and **Same Computer** (windows of this game on this computer join over a `BroadcastChannel`).
- `net/transport.js` is the one interface the game talks to, with two implementations: `HubTransport` wrapping `AIHub`, and `LinkTransport` (host beacon, join list, seats and colours, a clock offset, the same size and rate limits so behaviour matches).
- "Host" shows a big lobby with seats filling. "Start" counts down. Results show on the game's own ledger screen.
- The same screen says plainly: *Online play runs through AI Hub sessions.* Secondary window: `window.open(location.href)` is allowed here, and only here.
- ✔ `BroadcastChannel` connects two pages on `file://` in Chromium.

---

## 7. UI and UX

### 7.1 Rules for 10 feet

- Designed at 1920 × 1080, with everything scaled from viewport height. Minimum text 28 px at 1080p (subtitles 40, prompts 34, menu items 44, headers 72). Safe area 5%.
- At most **7 focusable things on a screen**, one idea per screen. No tables, no scroll lists, no tooltips, no tiny icons. A test audits font sizes, safe area and focusable counts.
- Ink panels at 70–85% behind text on bright scenes. Paper-white text, rust-orange accent. Fonts in §10.4.
- **The UI is one system** (`src/ui/`): a screen stack and a focus model. D-pad or left stick moves focus, Cross confirms, Circle backs out. Keyboard: arrows or WASD, Enter or Space, Esc. Mouse: hover moves focus, click confirms, right-click backs. Focus is always visible (ink underline plus rust marker), and always restored when you come back. Every action gives a sound and a rumble tick.
- **Boot:** a DOM loading screen with `TITLE` appears within the first moment, before any heavy work. Yield between world-build stages. Keys pressed during load are harmless.
- **Pad unplugged, or tab hidden, in play (outside sessions):** auto-pause with one big line and a resume prompt. A pad or key press carries on.
- **Prompts follow the last input used.** A `<glyph action="use">` resolves to: PlayStation glyphs (default for pads), Xbox glyphs if Settings → Controller says so, or keycaps and mouse icons for keyboard and mouse. Draw all glyphs as inline SVG. The swap happens the moment another device is touched, and tests cover it. Never more than 2 prompts at once in play. Hold actions show a fill ring.

### 7.2 Controls

Pad is the standard mapping: 0 Cross, 1 Circle, 2 Square, 3 Triangle, 4 L1, 5 R1, 6 L2, 7 R2, 8 Create, 9 Options, 10 L3, 11 R3, 12–15 D-pad U/D/L/R, axes 0–1 left, 2–3 right. Radial deadzones, response curve, pad-only aim assist (slowdown within a 3° cone, slight pull on aim; toggle in Settings). Rumble through `vibrationActuator.playEffect('dual-rumble', …)` with a guard.

| On foot | Controller | Keyboard and mouse |
|---|---|---|
| Move / look | Left stick / right stick | WASD / mouse (pointer lock) |
| Fire / aim | R2 / L2 | Left button / right button (hold) |
| Jump | Cross | Space |
| Crouch | Circle | C (toggle), Ctrl (hold) |
| Use; else reload or clear jam | Square | E use, R reload or clear jam |
| Next weapon (hold: pick) | Triangle | 1 2 3, wheel |
| Machete | R1 | F |
| Molotov | L1 | G |
| Sprint | L3 | Shift |
| Map | D-pad Up | M |
| Heal / surgery | D-pad Right | H |
| Take dose | D-pad Down | P |
| Monocular | D-pad Left | B |
| Notebook | Touchpad (button 17, if present) and in Pause | Tab |
| Pause | Options | Esc |

| Driving | Controller | Keyboard and mouse |
|---|---|---|
| Throttle / brake or reverse | R2 / L2 | W / S |
| Steer / look | Left stick / right stick | A D / mouse |
| Handbrake | Cross | Space |
| Get out / gun seat | Square / Triangle | E / T |
| Horn / lights | R1 / Circle | Q / L |
| Map | D-pad Up | M |
| Heal / dose | D-pad Right / D-pad Down | H / P |
| Molotov from the window | L1 | G |
| Radio | D-pad Left | R |

Input matches `e.code` first and `e.key` as fallback (✔ the harness's synthetic keys send `code: 'a'`). Keyboard rebinding isn't required.

**Mouse in the world.** In play, the crosshair *is* the hover: things you look at take focus (ink outline), and left-click activates them when your hands are empty or holstered (Kiln, the gun table, beds, doors). On the gun table, the map and passports, pointer lock is released: the cursor moves freely, hover focuses, click acts. Re-lock on return. If the browser refuses the lock, show a big "Click to take the mouse" prompt.

### 7.3 HUD (fades when nothing is happening)

Bottom-left: 5 health bars and syringe count. Bottom-right: big ammo number and weapon icon (crack below 25 condition). Centre: small ink crosshair, detection arcs, hit ticks, damage arcs. Lower-centre: prompts. Upper-centre, briefly: objective line when it changes. Subtitles at the bottom. Nothing else: no minimap, no compass (the GPS and road signs do that), no quest arrows in the world.

### 7.4 Screens

Each is one calm screen:

- **Title:** live in-engine scene, big title, Continue (when a save exists) / New Game / The Job / Settings / About & Credits. The first input of any kind resumes the AudioContext.
- **Pause:** Resume / Notebook / Settings / Dev Mode / About & Credits / Quit to Title.
- **Settings**, four pages by L1/R1:
  - *Sound:* Master, **Music (default 10%)**, Effects, Voices.
  - *Controller:* look speed, invert, aim assist, vibration, **Glyphs: PlayStation / Xbox**.
  - *Mouse & Screen:* mouse speed, FOV, subtitles, text size, ink strength, fever effect strength, fullscreen.
  - *Game:* difficulty, and a head bob toggle.
- **Notebook:** one page at a time: the contract, what you know, who's alive, one tip.
- **Others:** contract sheet (a paper in your hand: three lines, Accept / Not now), gun table cards, bed watch, map focus, mercy choice, ledger pages (death, epilogue, job results), link lobby.
- **Difficulty:** Hired Hand / Veteran / Written Off, which scale incoming damage, pay and syringes.

**Touch-only devices** (`matchMedia('(pointer: coarse)')` and not `(pointer: fine)`; ✔ `maxTouchPoints` is 0 on Playwright's WebKit iPhone, so don't use it): no touch controls. The title shows **"Controller or keyboard required"** and a big tappable **Settings** button, and nothing else playable. Attract mode runs. A key press or a connected pad unlocks the normal title. Settings is fully usable by tap.

### 7.5 About & Credits

Reachable from Title and Pause. Paged, big type, one section per page (L1/R1, or left/right), reading from `src/data/about.json`:

- **Source Information:** every field TASK.md lists, copied exactly, with `Usage` reading "added on import".
- **Testing Feedback, Engine Feedback, Prompt Feedback:** every question and answer.
- **Credits:** three.js (MIT), Rapier (Apache-2.0), fonts and their licences, AI Hub session client.

`tools/build.mjs` writes the exit-interview JSON beside the HTML from the same `about.json` and validates its shape, so they can't drift. Fill it last, rebuild once. Keep a running tally in `docs/issues-log.md` as you go, so the Testing Feedback counts are honest. Suggested `aiHub` block: type `Game`, genre `Shooter`, source `Far Cry 2`, series `Far Cry`, players `1–4`, tags `3d, first-person, co-op, story, exploration, vehicles`.

---

## 8. Attract mode

- **Trigger:** 10 s with no input on any front-end menu screen (not in play). Any key, mouse move or click, wheel, touch, pad button or stick > 0.3 exits to the same screen with focus intact. Resets the idle timer otherwise.
- **What runs:** the real sim and view, driven by `src/attract/director.js` from data (`src/data/attract.js`): a looping reel of vignettes, joined by ink wipes, with cheats on (god mode, infinite ammo, teleport, no clip, forced events). Small "DEMO" mark and a pulsing "Press any button" (or the touch message and Settings button on touch-only).
- **It runs in its own throwaway sim**, never touching the player's save or settings. Exit discards it and returns to the title scene.
- **Each vignette** states up to a few things it wants shown, so the reel is mostly genuine AI play: the bot moves, shoots, heals. About 25–35 s each, 6–7 minutes a loop. Together they cover at least 80% of the F-list:

| # | Vignette | Shows |
|---|---|---|
| 1 | Kiln at morning: walk the market, gun holstered, the Widow's table, a buy, a fresh gun from the crate | `ceasefire_town`, `shop_buy`, `armoury_redraw` |
| 2 | Pickup at golden hour on the Grass Road, map up, focus to set a waypoint, GPS arrow | `drive`, `map_raise`, `map_focus`, `map_drive`, `gps_waypoint`, `day_night` |
| 3 | Checkpoint: papers out the window, waved on. Next post: "Out of the truck." | `papers_ok`, `papers_fail` |
| 4 | Ridge at dusk: monocular, tag guards, flare into grass, front sweeps a post, herd bolts, tanks blow | `monocular_tag`, `flare_ignite`, `fire_spread`, `animals_flee`, `explosion_physics` |
| 5 | Firefight at Junction: a rusty gun jams, clears, then comes apart. Grab a looted carbine. Ragdolls, a man crawling, a comrade dragging him, post falls quiet | `rust_visual`, `jam`, `jam_clear`, `gun_break`, `loot_gun`, `ragdoll`, `wounded_crawl`, `comrade_drag`, `post_clear` |
| 6 | All four surgeries in cover, then a syringe | `surgery_bullet`, `surgery_finger`, `surgery_shrapnel`, `surgery_burn`, `heal_syringe` |
| 7 | Fever on the road: world warps, bottle, dose, recovery | `fever`, `pill` |
| 8 | Down in the dirt, buddy runs in, drag, pistol in hand. Then the buddy goes down: morphine | `rescue`, `buddy_down`, `mercy` |
| 9 | Ferry to Bridge Pier, skiff to the capsized barge, locator hunt, a case, a tape | `ferry`, `skiff`, `locator_found`, `diamond`, `dictation` |
| 10 | Engine hit, hood up, wrench under fire. Then a Technical on the mounted gun | `breakdown`, `repair`, `mounted_gun` |
| 11 | Night sneak through tall grass past lamp guards: machete, then a Molotov | `night_stealth`, `crouch_grass`, `machete_takedown`, `molotov` |
| 12 | Bed and watch, hands spin, light sweeps the shutters | `sleep_time` |
| 13 | The Tube at a truck, then the bridge goes with the train on it, chase-cam fly-by | `rocket`, `train`, `explosion_physics` |
| 14 | Wind turns, Drip Torch, wall of fire, trees burn, embers jump the road, title card | `torch_flame`, `wind_shift`, `tree_burn`, `ember_spot` |

No sound until the browser has had a gesture (AudioContext stays suspended, no error). Touch-only devices run it the same way.

---

## 9. Dev mode and tunables

**Dev Mode** is an item in the Pause menu outside sessions, built with the same 10-foot UI, in pages by L1/R1. Long pages split into sub-pages of at most 7 rows (D-pad left and right), so the balance groups below are one sub-page each. A hotkey isn't needed, but F1 opens it directly on keyboard.

| Page | Tools |
|---|---|
| **Cheats** | God mode, infinite ammo, never jam, no clip / fly, one-hit kills, invisible to AI, time scale (0.1–4×), give all weapons, +10 diamonds, +4 doses, +3 syringes |
| **World** | Time of day dial, wind angle and speed, weather, ignite at crosshair, put out all fires, regrow all grass, clear post, refill post, spawn squad / truck / herd / crate here |
| **Trigger** | Fever now, go down now, buddy down, force jam, break gun, stall truck, papers check |
| **Jump** | Teleport to any place (big list, one page at a time), jump to any contract or set-piece start, any ending, complete current objective, reset save |
| **Balance** | Live sliders (below), with **Reset page** and **Reset all to defaults**. Values also print as JSON ("Copy values") |
| **Debug** | Overlays: physics lines, AI state labels, perception cones, nav grid, fire grid, smoke grid, frame stats, net stats. Dump state. Feature coverage (F-list seen or unseen) |
| **Place** | Designer helper: choose a prefab, place at crosshair, rotate, nudge, "Copy as JSON" to paste into `src/data/world.js` |

**Tunables** (`src/data/tunables.js`: `{id, label, group, min, max, step, def}`). Every slider takes effect immediately in the running sim. Tests check a change takes effect and that reset restores defaults.

| Group | Sliders (default) |
|---|---|
| Player | walk 4.2, sprint 7, stamina 6 s, incoming damage ×1, health regen 6/s, syringe count 3 |
| Guns | wear ×1, jam `jamK` 0.04, looted condition 18–55, player damage ×1 |
| Enemies | accuracy ×1, damage ×1, vision range 70, night vision 30, reaction 0.4 s, squad size ×1, post refill days 2 |
| Fire | spread base (calm ≤ 1 m/s), wind effect `windK`, upwind damp, burn time ×1, fire damage 18/s, ember chance, regrow days 3 |
| Wind & time | wind speed ×1, day length 36 min, time scale 1 |
| Fever | interval 11 min, warning 35 s, doses per bottle 4 |
| Buddies | rescue arrival 12 s, rescues per day 2, buddy save chance 35% |
| Economy | contract pay ×1, shop prices ×1, locator range 120 m |
| Vehicles | top speed 28 m/s, engine force, damage ×1, repair time 4.5 s |

Every gameplay variable also keeps a human-readable note on what it does, for designers.

---

## 10. Art direction

### 10.1 The look

The engine's own toon and node materials are the base (`MeshToonNodeMaterial` with a stepped ramp, TSL post), pushed into **a war correspondent's inked sketchbook**: hard cel bands, black ink outlines from depth and normals, cross-hatching in the shadows, paper grain, sun-bleached ochres. Fire is the one thing that isn't shy: flat, three-tone, ink-outlined flames and fat cartoon-black smoke.

✔ **Target image, already rendered by the planner with the recipes in §13:** dusk gradient sky from burnt orange to blue, a line of three-tone flames (cream, orange, deep red) outlined in black, advancing over a sea of gold grass with a black burnt scar behind, and columns of fat outlined smoke leaning into the sky, with hatching in the shadows. It already looks like a comic panel, and it runs on WebGPU here. Don't drift toward realism: it won't read at 10 feet, and it isn't the brief.

**Nothing looks like the source.** The source was photorealistic. This is ours. Far geometry gets simpler; silhouettes get stronger. Acacias, truck profiles, men in armbands, water towers all read as shapes from the couch.

### 10.2 Palette

| Thing | Hex | | Thing | Hex |
|---|---|---|---|---|
| Ink | `#14100C` | | Tall grass tip / base | `#E2C777` / `#A07F3A` |
| Paper | `#FFF7E6` | | Short grass | `#B79A55` |
| Earth | `#C48D4E` | | Burnt | `#1B1512` |
| Laterite road | `#A9552E` | | Regrowth | `#7C9A3E` |
| Rock | `#8C7B6B` | | Acacia crown / dry leaves | `#59693A` / `#8A8B46` |
| Rust | `#8A3E22` | | Painted steel | `#6D7A55` |
| Steward ochre / khaki | `#C9A227` / `#7D7245` | | Commons red / work blue | `#9E2B25` / `#35506B` |
| Flame core / mid / edge | `#FFE08A` / `#F26A12` / `#B5260F` | | Smoke dark / light | `#2A2522` / `#5B4D43` |

UI: paper on ink, accent `#E0602A`. Seat colours are the hub's: `#e8443a #3b82f6 #22c55e #f5b700`.

### 10.3 Time of day (interpolate between keys)

| Key | Sun colour, intensity | Sky top | Horizon | Fog |
|---|---|---|---|---|
| Dawn 06:00 | `#FFC9A0`, 1.6 | `#5F7C9E` | `#F2B98A` | `#E3AE84` |
| Morning 09:30 | `#FFF0D0`, 3.0 | `#6FA3C4` | `#EBD7AE` | `#E6CF9F` |
| Noon 12:30 | `#FFF8E8`, 3.6 | `#7FB2CF` | `#F1E3BF` | `#EFE0B5` |
| Golden 17:30 | `#FFB068`, 2.8 | `#5E7FA0` | `#F0A860` | `#DB9552` |
| Dusk 19:00 | `#FF8A50`, 1.4 | `#3A4F6E` | `#E07B39` | `#C9733C` |
| Night 23:30 | `#8FA6D8`, 0.5 | `#0E1726` | `#1E2B45` | `#1A2438` |

Noon: bleached, high contrast, heat shimmer. Night: indigo washes and ink, stars, moon; fire and lamps own the screen.

### 10.4 Fonts

Embed as base64 woff2 via esbuild's `dataurl` loader, from npm: `@fontsource/bebas-neue` (titles, OFL), `@fontsource/oswald` (UI, OFL), `@fontsource/special-elite` (ledger, tapes, Apache-2.0), `@fontsource/reenie-beanie` (grease pencil on the map, OFL). Latin subset only. `await document.fonts.load()` before drawing any CanvasTexture text.

### 10.5 Asset list (all procedural, in code)

`src/data/prefabs.js` holds data-described prefabs built from a primitive kit (box, cylinder, wedge, corrugated panel, plank stack), with vertex colours, chipped edges, painted decals from CanvasTexture. The engine's own library is fine for generic props: `RoundedBoxGeometry`, `ConvexGeometry` (rocks), `BufferGeometryUtils.mergeGeometries`, `DecalGeometry`, `SkeletonUtils`.

- **Terrain and plants:** terrain chunks; grass tufts (instanced, burnable); acacia (3 shapes), brush, dead tree, rocks, termite mound; reeds.
- **Town:** shack, tin-roof house, concrete company block, union hall, church and mast, bar with stools and the tab board, market stall, water tower, tank stand, generator, fuel tank, pipe run, conveyor, mine sheds, terraces, strongroom, rail track, signal box, steel bridge (destructible cluster), jetty.
- **Military:** sandbags, MG nest, watchtower, barrier, shipping container, tent, refugee tents, crates, oil drum (explosive), tire stack.
- **Signs:** road signs, slogans and posters.
- **Vehicles:** pickup, technical, cargo truck, skiff, barge, locomotive, wagons, payroll car, bus-sized wreck, patrol boat wreck.
- **Weapons:** all 9, machete, Molotov, syringe, pliers, wrench, bottle, map, GPS, monocular, recorder, passports, ledger.
- **Creatures:** zebra, antelope (shared quadruped rig), vulture.
- **People:** one rig, faction outfits, civilians, the cast (distinct silhouettes: the Widow's headwrap and folding chair, the Comptroller's tie, the Foreman's hard hat, the Doctor's apron, the Notary's cardigan and lamp, four mercs).

**Grass and water notes.** Grass is instanced tufts in 32 m chunks around the camera, dense to about 160 m. Beyond that, a terrain stipple. All blade normals point up for soft cel bands and no noisy edges (✔ that removed the speckle). Water: flat toon bands, a foam line where depth is shallow, and slow noise-driven ripples.

---

## 11. Animation

Three's own `AnimationMixer` is the base; all clips are authored in code as `AnimationClip`s from compact pose tables in `src/anim/`.

- **Humanoid rig** (`rig.js`): about 19 bones (hips, spine, chest, neck, head, shoulders, upper/lower arms, hands, upper/lower legs, feet) with sockets on the hands. Geometry: tapered segments merged into one `SkinnedMesh`, skin weights blended at joints, outfits as extra meshes and vertex colours, faces as bold ink marks.
- **Clip DSL:** `{ name, dur, loop, keys:[{ t, pose:{ bone:[x,y,z] } }] }`, built into `QuaternionKeyframeTrack`s. Crossfade with `AnimationAction`. Additive layers (`AnimationUtils.makeClipAdditive`, `AdditiveAnimationBlendMode`) for aim, recoil, flinch. Aim pitch is a bone offset after `mixer.update`.
- **NPC clips (about 30):** idle, smoke, talk, walk, run, crouch walk, aim, fire, reload, clear jam, throw, flinch, fall wounded, crawl, drag comrade, being dragged, panic burn, die front, die back, sit at bar, sleep, wave truck down, inspect papers, kneel, inject, carry case, wave arms at fire.
- **First-person clips (about 40):**
  - Idle, fire and reload per weapon class; clear jam per class; gun breaks; machete swings.
  - Molotov light-and-throw; syringe; the four surgeries; dose from bottle.
  - Raise and lower map, GPS check; raise and lower monocular; wrench at hood.
  - Papers held out the window; door and lever; steering left and right, gear; crawl and being dragged; lie down and get up; press Record.
- **Procedural on top:** weapon sway, breathing, fever tremor, recoil spring, limp.
- **Hands:** a separate arm rig parented to the camera, scaled small and close so it never clips walls. Camera near 0.05. Per-merc skin and tattoo via vertex colour.
- **Ragdoll:** at death, swap to about 10 capsules joined with `JointData.spherical` (✔), copy poses back to bones, and freeze after it settles. Keep the newest 60 bodies. Burned corpses turn charred by uniform.
- **Machines:** wheels (spin, steer, Rapier suspension length), hood and door clips, conveyor, train wheels, mast fall.
- **Animals:** quadruped rig: graze, walk, gallop, fall. Vultures: glide and flap via vertex shader.

---

## 12. Audio (all code, no files, no samples)

`src/audio/` on Web Audio. Every recipe takes a `BaseAudioContext`, so the same code runs in `OfflineAudioContext` for tests. ✔ Offline rendering works here.

**Buses:** Master → Music, SFX, Voice, UI, with a duck for voices and a low-pass for "hearing damage" after near explosions. **Music bus gain = 0.10 by default**, set by the Settings slider. A test reads it on a fresh profile.

**SFX recipes (parameterised, per weapon and surface):**
- **Guns:** noise transient through band-pass plus a sub thump (sine 120→40 Hz) plus a mechanical click, then a tail through a convolver with a generated IR (plains: long slapback; town: short; pit: boomy).
- **Distance:** low-pass, and delay by speed of sound for far shots and explosions (`delay = d / 340`).
- **Jam:** dry click and a hiss of breath. **Explosions:** layered, with debris patter.
- **Fire:** crackle (filtered noise, random pops), a roar whose level is the count of nearby burning cells, panned to the front's centroid.
- **Wind and grass:** filtered noise following wind speed. **Birds** by day, **insects** at dusk, frogs by the river, distant artillery.
- **Vehicles:** detuned saws following RPM, tyre noise by surface, gear clunk, cough when damaged. Skiff outboard. Barge horn. Locomotive.
- **Body:** footsteps by surface, heartbeat, fever whine with tremolo, syringe, pliers, finger snap.
- **Locator** beep, map rustle, UI ticks.

**Voices: Animalese/Simlish-style gibberish.** A generator turns each word of the English line into syllables, seeded by the word's hash (so words repeat and it sounds like a language), and speaks them with one voice per speaker: sawtooth through two band-pass formants moving per vowel, noise bursts for consonants, 11–16 syllables/s, pitch contour falling at full stops and rising at question marks. Each cast member has fixed pitch, formant shift and tempo: the Notary low and slow with a dry cough, the Ferryman unhurried, the Comptroller clipped, the Foreman loud, Dao fast, Tomasz too loud and rough. Guards: a family of voices per faction. The Notary's tapes go through a band-limited "recorder" filter with hiss.

**Music, composed in code, original.** Pre-render plucks with Karplus-Strong into `AudioBuffer`s (Web Audio's own delay loop can't go short enough for high notes). Palette: thumb-piano ostinato, nylon-string pluck, slide lead by FM glide, bowed drone, frame drum from sine and noise. Don't echo the source's soundtrack.

| Cue | When | Feel |
|---|---|---|
| Title | Front end | Slow two-bar ostinato, drone, a slide phrase every 8 bars |
| Road | Driving | Plucks and hand drum, with long silences |
| Danger | Alert and combat, by intensity | Drum pulse enters, drone rises |
| Fever | Fever | Same ostinato detuned and slowing |
| Fire | Near a big front | Drone and low drum only |
| Dawn | Waking | Single phrase |
| Mercy | Mercy scene | Nothing, then one plucked phrase |
| Ending | Epilogue | Solo pluck, one per ending |

Mostly the field is **quiet** and music comes and goes: wind and grass are the score. One vehicle radio cycles music and the Notary's readings.

---

## 13. Technical plan

### 13.1 Stack

`three@0.180.0` with `WebGPURenderer` and TSL ✔; `@dimforge/rapier3d-compat@0.19.3` ✔ (WASM embedded in the JS, so one file works); plain JS modules, DOM UI, Web Audio, Gamepad API; esbuild ✔; Playwright 1.63.0 for tests. `npm install` in the dev folder, and keep `package-lock.json`.

### 13.2 Layout

```
src/
  main.js         boot, mode routing (standalone, session, test)
  core/           loop, rng streams, event queue, tunables, save, small fsm helpers
  data/           meta, world, prefabs, weapons, npcs, contracts, lines, dictations, tunables, shop, attract, features, about.json
  sim/            index (createSim), terrain, physics, player, weapons, wounds, fever, fire, wind, time, ai/*, posts, vehicles, economy, buddies, factions, contracts, director, job, bot
  view/           renderer, post, sky, terrain, grass, vegetation, props, water, fire, characters, fpv, vehicles, map, gps, effects
  anim/           rig, clips (npc, first-person, animal), dsl
  audio/          engine, sfx, ambience, voice, music
  ui/             stack and focus, prompts, glyphs, hud, screens/*
  input/          actions, pad, keyboard, mouse
  net/            transport, hub, link, protocol, job netcode
  dev/            devmode, overlays, placement
  attract/        director
vendor/session.js  the hub client, unmodified
tools/            build.mjs, test.mjs, tests/*, hub/ (harness.html, bridge.js, round.js), balance.mjs, validate-data.mjs, shots.mjs
docs/             DESIGNER.md, issues-log.md
test-output/      what tests leave behind
```

### 13.3 The one architecture rule: sim and view are separate

- `src/sim` holds all game state and rules. It never touches DOM, canvas or the renderer. It imports only pure code, Rapier and three's math. ✔ `three/webgpu` imports fine in plain Node with no DOM, so `Vector3` and friends can be shared.
- `const sim = createSim({ scenario, seed, tunables, players })`, `sim.step(inputFrames)` advances 1/60 s, `sim.state` is readable, `sim.drainEvents()` hands view, audio and net their events.
- View, audio and UI read state and events. They never change state except by input frames and dev commands.
- This gives you, for free: fast playthrough tests in Node; `AIHub.server` (a sim with nothing else); attract mode (a sim plus a bot); and networked clients. All randomness in the sim goes through named seeded streams.
- Fixed step with an accumulator, up to 5 catch-up steps per frame. Render interpolates. Under `?test=1` the loop stops and tests call `__game.step(n)`.
- **Data-driven for designers (TASK.md's "normal designer tools").** Everything content-like (places, posts, prefabs, weapons, NPC archetypes, contracts, lines, tunables, attract reel) is plain data in `src/data/`, validated by `tools/validate-data.mjs` and documented in `docs/DESIGNER.md` with short how-tos: add a weapon, a post, a contract, a line, a prefab, a tunable. New content needs no system code.

### 13.4 Rendering recipes (✔ all verified, copy them)

✔ The planner extracted the code blocks below from this file as written, ran them, and got the target image on WebGPU and the same picture on the WebGL2 fallback.

```js
import * as THREE from 'three/webgpu';
import { pass, mrt, output, normalView, uniform, vec2, vec3, vec4, float, Fn, screenUV, screenSize, time, sin, cos,
  step, smoothstep, length, dot, max, luminance, hash, floor, fract, perspectiveDepthToViewZ, cameraNear, cameraFar,
  attribute, texture, positionLocal, positionWorld, positionWorldDirection, mix, color, uv, abs, normalize, cross,
  cameraPosition, mx_noise_float } from 'three/tsl';

const renderer = new THREE.WebGPURenderer({ antialias: false });   // falls back to WebGL2 by itself
renderer.setPixelRatio(1); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
await renderer.init();   // catch: no graphics at all → DOM message, AIHub.fail()
renderer.onDeviceLost = showGraphicsLostBanner;                    // sim keeps running; reload restores from the save

// Toon ramp: 3 hard bands. Use everywhere.
const ramp = new THREE.DataTexture(new Uint8Array([70,70,70,255, 150,150,150,255, 255,255,255,255]), 3, 1, THREE.RGBAFormat);
ramp.minFilter = ramp.magFilter = THREE.NearestFilter; ramp.needsUpdate = true;
const mat = new THREE.MeshToonNodeMaterial({ color: 0x8a3e22, gradientMap: ramp });

scene.backgroundNode = mix(color(0xe07b39), color(0x3a4f6e), smoothstep(0.0, 0.45, positionWorldDirection.y.max(0))); // drive with uniforms
scene.fog = new THREE.Fog(0xc9733c, 70, 460);
```

**Ink post chain.** `fever`, `inkAmt`, `hatchAmt`, `grainAmt`, `inkWidth` are uniforms. Extend `warp` and the grade with desaturation, vignette, damage ink and the screen-wipe mask.

```js
const scenePass = pass(scene, camera);
scenePass.setMRT(mrt({ output, nrm: normalView }));
const colTex = scenePass.getTextureNode('output'), nrmTex = scenePass.getTextureNode('nrm'), depthTex = scenePass.getTextureNode('depth');
const warp = Fn(() => {
  const d = screenUV.sub(0.5);
  const wob = vec2(sin(screenUV.y.mul(23).add(time.mul(2.3))), cos(screenUV.x.mul(19).add(time.mul(1.7)))).mul(0.006).mul(fever);
  return screenUV.add(wob).add(d.mul(length(d)).mul(0.05).mul(fever));
})();
const viewDist = (u) => perspectiveDepthToViewZ(depthTex.sample(u).r, cameraNear, cameraFar).negate();
const ink = Fn(() => {
  const px = vec2(inkWidth).div(screenSize);
  const zC = viewDist(warp), nC = nrmTex.sample(warp).xyz;
  const isGeo = step(0.5, length(nC));                     // the sky writes no normal
  let dz = float(0), dn = float(0);
  for (const [ox, oy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const u = warp.add(vec2(ox, oy).mul(px));
    dz = dz.add(viewDist(u).sub(zC).abs().div(zC));
    dn = dn.add(float(1).sub(dot(nrmTex.sample(u).xyz, nC).clamp(0, 1)));
  }
  const near = float(1).sub(smoothstep(60, 220, zC));      // normal edges fade with distance
  return max(smoothstep(0.05, 0.14, dz), smoothstep(0.5, 1.1, dn).mul(isGeo).mul(near));
})();
const graded = Fn(() => {
  const c = colTex.sample(warp).rgb, lum = luminance(c), p = screenUV.mul(screenSize);
  const h1 = step(fract(p.x.add(p.y).mul(0.125)), 0.25).mul(float(1).sub(smoothstep(0.16, 0.30, lum)));
  const h2 = step(fract(p.x.sub(p.y).mul(0.125)), 0.25).mul(float(1).sub(smoothstep(0.05, 0.16, lum)));
  const hatch = max(h1, h2).mul(hatchAmt).mul(0.45).mul(step(0.5, length(nrmTex.sample(warp).xyz)));
  const g = floor(p.mul(0.5));
  const grain = hash(g.x.add(g.y.mul(1971)).add(floor(time.mul(8)).mul(313))).sub(0.5).mul(grainAmt);
  return vec4(c.mul(float(1).sub(hatch)).mul(float(1).sub(ink.mul(inkAmt).mul(0.94))).mul(vec3(1.0, 0.97, 0.9)).add(grain), 1);
})();
const post = new THREE.PostProcessing(renderer);
post.outputNode = graded;
// each frame: post.render();
```

**Burnable, swaying grass.** A DataTexture `burnTex` (512², RGBA8: R burnt, G burning, B regrow) mirrors the fire grid. Terrain, grass and trees all sample it.

```js
// Geometry: a thin ConeGeometry tuft (translate up by half its height, set every normal to 0,1,0), wrapped in an
// InstancedBufferGeometry: copy index, position, normal and uv; setAttribute('instOffset', new
// THREE.InstancedBufferAttribute(offsets, 3)); set instanceCount; mesh.frustumCulled = false.
// windDir = uniform(new THREE.Vector2(1, 0.3)), windStr = uniform(0.5). burnTex rows run with z, as the fire grid does.
const toBurnUV = (xz) => xz.div(2048).add(0.5);
const off = attribute('instOffset', 'vec3');
const h = positionLocal.y.div(1.3);
const b = texture(burnTex, toBurnUV(off.xz));
const sway = sin(time.mul(2.1).add(off.x.mul(0.31)).add(off.z.mul(0.27))).mul(windStr).mul(h).mul(h).mul(0.5);
grassMat.positionNode = positionLocal.mul(vec3(1, float(1).sub(b.r.mul(0.85)), 1))
  .add(vec3(windDir.x.mul(sway), 0, windDir.y.mul(sway))).add(off);
grassMat.colorNode = mix(mix(color(0xa07f3a), color(0xe2c777), h), color(0x14100c), b.r);
terrainMat.colorNode = mix(color(0xc48d4e), color(0x1b1512), texture(burnTex, toBurnUV(positionWorld.xz)).r);
```

**Flames and smoke:** instanced, y-locked billboard cards, alpha-cut, stepped tones. Because they write depth, the ink pass outlines them.

```js
// Geometry: PlaneGeometry(1, 1) translated up by 0.5, wrapped in an InstancedBufferGeometry as above.
const inst = attribute('fireInst', 'vec4');            // xyz position, w size
const fireMat = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide });
fireMat.positionNode = Fn(() => {
  const toCam = normalize(cameraPosition.sub(inst.xyz).mul(vec3(1, 0, 1)));
  const right = cross(vec3(0, 1, 0), toCam);
  return inst.xyz.add(right.mul(positionLocal.x.mul(inst.w))).add(vec3(0, positionLocal.y.mul(inst.w), 0));
})();
const vuv = uv();
const flame = Fn(() => {
  const seed = inst.x.mul(3.1).add(inst.z.mul(1.7));
  const n = mx_noise_float(vec3(vuv.x.mul(3).add(seed), vuv.y.mul(2.2).sub(time.mul(1.8)), seed)).mul(0.5).add(0.5);
  return float(1).sub(abs(vuv.x.sub(0.5)).mul(2)).mul(float(1).sub(vuv.y)).mul(1.6).mul(n.add(0.35));
})();
fireMat.opacityNode = flame; fireMat.alphaTestNode = float(0.18);
fireMat.colorNode = mix(color(0xb5260f), mix(color(0xf26a12), color(0xffe08a), step(0.55, flame)), step(0.32, flame)).mul(1.5);
fireMat.fog = false;
// Smoke: the same card, smokeMat.positionNode = fireMat.positionNode, the same attribute name, w growing with height, in rising columns:
const puff = Fn(() => {
  const seed = inst.x.mul(0.7).add(inst.y.mul(0.4));
  const n = mx_noise_float(vec3(vuv.mul(2.6).add(seed), time.mul(0.15))).mul(0.5).add(0.5);
  return float(1).sub(length(vuv.sub(vec2(0.5, 0.5))).mul(2)).add(n.mul(0.45).sub(0.12));
})();
smokeMat.opacityNode = puff; smokeMat.alphaTestNode = float(0.12);
smokeMat.colorNode = mix(color(0x2a2522), color(0x5b4d43), step(0.42, puff));
```

Pool about 3000 flame cards on the nearest burning cells, about 600 smoke cards in rising columns (rounded, two-tone, ink-outlined), and embers.

**Pitfalls found the hard way (✔ each one bit the planner):**

- `transformedNormalView` is deprecated in r180. Use `normalView`.
- TSL `hash()` takes **one float**. Give it a vec2 and you get vertical stripes.
- `smoothstep(a, b, x)` needs `a < b`. For a falling edge, use `1 − smoothstep`.
- A loose `.discard()` that isn't part of the material's graph does nothing. Use `opacityNode` + `alphaTestNode`.
- The sky writes a zero normal: guard normal-edge and hatch tests with `step(0.5, length(n))`, or the sky turns to ink.
- Drive everything from `uniform()`s. Changing a node graph recompiles.
- **Keep the light count constant** (pool of point lights at intensity 0 when unused; changing the count recompiles materials).
- Shadows: one directional light with a 4096 map following the camera, snapped to texels. `three/addons/csm/CSMShadowNode.js` exists if you want more.
- Toon materials and `InstancedMesh`, skinning, node `positionNode` all work together ✔.
- Don't use compute nodes for anything that matters: three's WebGL2 fallback must keep working. ✔ With no WebGPU (the hub's default test browser) it draws the whole ink chain with no code change.

Performance is out of scope, as TASK.md says: add all the detail, lights and effects the scene wants. The only rule here is §6.2 (don't starve the protocol) and don't exhaust memory (20 GB shared, §14.1).

### 13.5 Rapier recipes (✔ all verified)

```js
import RAPIER from '@dimforge/rapier3d-compat';
await RAPIER.init();               // console.warn "using deprecated parameters": harmless, it's Rapier's own
const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 }); world.timestep = 1 / 60;

// Heightfield: column-major, x along cols, z along rows, centred on the origin. nrows, ncols are cell counts.
const n = 1024, size = 2048, heights = new Float32Array((n + 1) * (n + 1));
for (let col = 0; col <= n; col++) for (let row = 0; row <= n; row++)
  heights[col * (n + 1) + row] = heightAt((col / n - 0.5) * size, (row / n - 0.5) * size);
world.createCollider(RAPIER.ColliderDesc.heightfield(n, n, heights, { x: size, y: 1, z: size }),
  world.createRigidBody(RAPIER.RigidBodyDesc.fixed()));

// Rays: hit.timeOfImpact. They hit the caster's own capsule unless excluded.
world.castRay(new RAPIER.Ray(origin, dir), maxToi, true, undefined, undefined, myCollider);

// Character controller
const cc = world.createCharacterController(0.02);
cc.setUp({ x: 0, y: 1, z: 0 }); cc.enableAutostep(0.4, 0.2, true); cc.enableSnapToGround(0.5);
cc.setMaxSlopeClimbAngle(50 * Math.PI / 180); cc.setMinSlopeSlideAngle(40 * Math.PI / 180);
cc.setApplyImpulsesToDynamicBodies(true);
const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, z));
const col = world.createCollider(RAPIER.ColliderDesc.capsule(0.6, 0.35), body);
// each step
cc.computeColliderMovement(col, desired); const m = cc.computedMovement(), grounded = cc.computedGrounded();
const p = body.translation(); body.setNextKinematicTranslation({ x: p.x + m.x, y: p.y + m.y, z: p.z + m.z });

// Raycast vehicle: set forward to +z as below. ✔ 2500 N on each rear wheel reaches about 16 m/s in 5 s
const chassis = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z).setCanSleep(false));
const chassisCol = world.createCollider(RAPIER.ColliderDesc.cuboid(1.0, 0.45, 2.2).setMass(1400), chassis);
const veh = world.createVehicleController(chassis);
veh.indexUpAxis = 1; veh.setIndexForwardAxis = 2;      // yes, that one is a setter named setIndexForwardAxis
for (const w of [[-0.9,-0.3,1.5],[0.9,-0.3,1.5],[-0.9,-0.3,-1.5],[0.9,-0.3,-1.5]])
  veh.addWheel({ x:w[0], y:w[1], z:w[2] }, { x:0, y:-1, z:0 }, { x:-1, y:0, z:0 }, 0.45, 0.42);
for (let i = 0; i < 4; i++) { veh.setWheelSuspensionStiffness(i, 28); veh.setWheelMaxSuspensionTravel(i, 0.4);
  veh.setWheelFrictionSlip(i, 2.2); veh.setWheelSuspensionCompression(i, 3); veh.setWheelSuspensionRelaxation(i, 4); }
// each step, before world.step(): setWheelEngineForce(rear), setWheelSteering(front), setWheelBrake, then
veh.updateVehicle(1 / 60, RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC, undefined, (c) => c.handle !== chassisCol.handle);
// for wheels in view: wheelRotation(i), wheelSteering(i), wheelSuspensionLength(i), wheelIsInContact(i)

// Ragdoll joint
world.createImpulseJoint(RAPIER.JointData.spherical({ x:0, y:-0.3, z:0 }, { x:0, y:0.3, z:0 }), bodyA, bodyB, true);

// Physics overlay: skip the terrain, or you get 3 million vertices
world.debugRender(undefined, (c) => c.handle !== terrainHandle);
```

Snapshots replay exactly (✔ `takeSnapshot` / `World.restoreSnapshot`), but game saves are your own JSON; rebuild physics on load.

### 13.6 Single-file build (✔)

`tools/build.mjs`:

1. Run `esbuild src/main.js --bundle --format=esm --target=es2022 --minify --loader:.woff2=dataurl --outfile=build/bundle.js`.
2. Fail if the bundle contains `</script`.
3. Assemble with **string concatenation, not `.replace()`** (bundles contain `$&`):

```html
<!doctype html><html lang="en"><head><meta charset="utf-8">
<script>…vendor/session.js exactly…</script>
<script>…the early connect() from §6.2…</script>
<title>…</title> …metas… <style>…</style>
</head><body><script type="module">…bundle…</script></body></html>
```

4. Write it to the deliverable path TASK.md names (root, beside the dev folder). TASK.md's folder and file names match, so derive it from the dev folder's own name.

✔ With three and Rapier inlined, this came to 3.1 MB, opens on `file://`, makes no network requests, and passes the harness when served. Inline everything; no CDN. A `<script type="module" src=…>` won't load on `file://` at all (✔ blocked), so test builds are inlined too.

---

## 14. Testing

TASK.md's rule: one command, printing only failures and a one-line count. Rerun only after changing what it covers. Use scripts first, screenshots only for what a script can't check. Don't use subagents or workflows to debate, review, judge or audit. That command is **`node tools/test.mjs`**, with `--sim`, `--ui`, `--hub` to run one tier.

### 14.1 This computer: corrections and facts (✔)

- **TASK.md's three WebGPU flags aren't enough here.** They give an adapter, but the device is destroyed on the first canvas frame, and everything renders blank with no JS error. **Use the hub's flags. These give real pixels, and a plain Playwright screenshot of the WebGPU canvas works:**
  ```
  --enable-unsafe-webgpu --enable-features=Vulkan --use-vulkan=swiftshader --use-webgpu-adapter=swiftshader --use-angle=swiftshader
  ```
- Use `chromium.launch({ headless: true, args })` (the headless shell). The full browser (`channel: 'chromium'`, or headed) aborts here with "Socket path too long" because of the long `TMPDIR`. Headed under xvfb got no WebGPU adapter anyway.
- With **no flags** Chromium has no adapter, and three falls back to WebGL2 and still draws (✔). That's how the hub's own check opens games by default, so test that path too: `backend: webgl2`, no errors, screen drawn. WebKit with the iPhone profile also falls back and runs (✔ `backend: webgl2`, `coarse` pointer). Chromium with a Pixel profile has WebGPU and a coarse pointer (✔). Firefox here reported no WebGL2 in its headless run; a graceful message is the only requirement there.
- Software WebGPU runs at about 0.3–1.5 fps at 1280 × 720 with 60–150k instances. So **never** assert on real-time behaviour through the renderer. Use `__game.step()`, and small viewports unless checking 10-foot layout at 1920 × 1080.
- Pointer lock is granted after a click in headless, but `movementX/Y` then stay 0 (✔). Test look through the virtual input or synthetic events.
- `OfflineAudioContext` renders correctly (✔ gain 0.1 peaks at 0.0999). `AudioContext` starts `running` here, but real browsers need a gesture.
- Everything you make stays in your dev folder, and you read nothing outside what you need: other agents work in the folders beside yours.
- Run one browser at a time (20 GB of RAM, shared; earlyoom ends the biggest browser). A 4-copy harness run is one browser but heavy. "Target closed" means out of memory; lower the load, don't retry blindly.
- Serve with Node's `http.createServer().listen(0, '127.0.0.1')` inside `tools/test.mjs` (no extra process, no port clash) or `python3 -m http.server 0 --bind 127.0.0.1`, and check the page's title before trusting a result. Stop only what you started.

### 14.2 Test hooks

`window.__game` (always present, read-only except under `?test=1`):

- `state()`: compact JSON: screen, focused id, prompts' glyph set, player, weapons with condition, jam state, health, doses, contract step, time, wind, fire counts, attract status, tunables, bus gains, backend, net stats, feature coverage.
- `step(n)`, `input(frame)`, `dev(cmd, ...args)` (the same commands as the dev menu), and `renderRecipe(name)`, which returns peak, RMS and duration through `OfflineAudioContext`.

Pad stub via `addInitScript`, replacing `navigator.getGamepads` with a standard-mapped pad whose buttons and axes tests set, and counting `playEffect` calls.

### 14.3 Tiers

**`--sim` (Node, no browser, fast). Most of the suite lives here.**

- Fire: front speeds at calm, downwind and upwind (§4.5); roads and water stop it unless embers jump; burnt cells persist through save and load; regrowth timing.
- Guns: jam rate curve; wear; break at 0; looted range; every weapon fires, reloads and clears.
- Fever: schedule, warning, pill, collapse and wake; no first attack near alerted enemies; doses always obtainable.
- Heal: bars, regen ceiling, surgery by damage type. Rescue chain and per-day limit; buddy death is permanent; mercy.
- AI: perception factors (day, night, grass, smoke), fire avoidance, wounded and drag; posts stay clear until dawn and refill by a real truck only with supply.
- Vehicles: drives 100 m; damage stages; stall; repair. Skiff floats and moves. Papers pass and fail.
- Economy: `tools/validate-data.mjs` passes; no unreachable contract, line id or prefab.
- Determinism: two runs, same seed and inputs, same state hash after 5 sim-minutes. No NaN positions, no NPC stuck over 30 s.
- **Scripted whole-game playthrough (`sim/bot.js`):** a bot playing through **input frames only** from the barge through every contract, twists on, to each of the three endings (re-loading the save before the choice). God mode and the dev Trigger commands are allowed, to force rare events on schedule. No other state edits. Assert world-state consequences at each step. Also a shorter run of The Job with bots in four seats. **Together these must reach F-list coverage of 100%.**
- `tools/balance.mjs` (not gated): mortal-bot survival, TTKs, jam frequency, money curve. Read it when tuning.

**`--ui` (Playwright, Chromium with the flags above, `file://`).**

- Boots with no page errors or console errors (`console.warn` is fine: Rapier's init notice, and on the fallback three's "running under WebGL2" and ANGLE's ReadPixels notes). `backend: webgpu`, then again with no flags: `backend: webgl2`.
- Every screen reachable with the pad stub, then with keyboard, then with mouse. Focus visible and never lost. Back always works. Mouse hover moves focus. Click activates.
- Prompt glyphs follow last input. Xbox option swaps to A B X Y.
- 10-foot audit at 1920 × 1080 on every screen: font sizes, safe area, ≤ 7 focusables.
- Touch-only (Chromium Pixel profile, tap with `page.touchscreen`): message, Settings button works, no other menu, attract runs. Also WebKit iPhone profile.
- Attract: starts between 10 and 11 s idle on title; any of key, mouse, button or stick exits with focus intact; loops past a full cycle (fast-forward with `__game.step`); coverage ≥ 80%; a save made beforehand is untouched.
- Dev mode: reachable from Pause; every page opens; a slider changes behaviour live (for example, fire spread); reset restores; hidden in sessions.
- Audio: fresh profile music bus = 0.10. Every SFX, voice and music recipe renders non-silent, finite, in range. Voice duration tracks text length. The same line gives the same audio. No `<audio>`, no audio data URIs, no media fetches in the bundle.
- No network requests from the page at all. No `TODO|FIXME|placeholder|stub` in `src/`.
- Pixels (`page.screenshot` at low res, compare numbers, don't eyeball): ink present (dark-pixel ratio in a range), sky not black, the fire scene has flame colours, fever changes the picture.
- About & Credits shows every Source Information field and all feedback answers. The exit-interview JSON parses and has every required key, and no value is empty.

**`--hub` (served harness; run exactly what the hub runs, from its `scripts/hub-check.mjs`).** One harness URL per case, against the built HTML copied next to `tools/hub/*` in `test-output/site/`. A case passes when `window.__hubCheck.pass` is true.

```
harness.html?game=GAME.html&players=2&latency=150&jitter=50&loss=5&auto=1&play=8000
harness.html?game=GAME.html&players=3&latency=150&jitter=50&loss=5&auto=1&play=8000
harness.html?game=GAME.html&players=4&latency=150&jitter=50&loss=5&auto=1&play=8000
harness.html?game=GAME.html&players=3&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave&play=8000
harness.html?game=GAME.html&players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave&play=8000
harness.html?game=GAME.html&players=2&latency=150&jitter=50&loss=5&auto=1&scenario=server&play=8000
```

Run these with the flags from §14.1, and the 4-player case once more with no flags: that is the hub's default browser, where every copy is on WebGL2 in software. Give each page up to 300 s, as the hub does. ✔ All six pass on a skeleton with the flags. With no flags, the 4-player, host-leave and server cases pass too, using the §6.2 boot order.

Then:

- **The game on its own**, as the hub checks it: open it with no flags, press Enter, Space, Enter, Space, and assert no page errors, `AIHub.active === false`, `AIHub.seeded` not true, and a screen that draws (DOM title text alone is enough to pass while the scene loads).
- **Co-op for real:** two pages in a harness round, scripted, where p1 ignites, p2 sees it; p2 goes down, p1 revives; case reaches the barge; `finish` has `won` and correct scores.
- **Net budget:** `send()` never returns `false`. Copies stay under 20 messages/s. `s` stays ≤ 1200 bytes.
- **Link play:** two pages, host and join, 10 s of play, traffic both ways, results shown.

Screenshots for eyes only: a short `node tools/shots.mjs` set at 1920 × 1080 (each time of day, fire, night, menus, map focus, surgery) into `test-output/`. Use it for art passes, not as a test.

---

## 15. Build order and scale

Each milestone ends with its tests passing. Fire and the look come early, because they are the game. Do the title first.

| # | Milestone | Done when |
|---|---|---|
| 0 | Title, scaffold, recipes §13 proven in your folder, `tools/build.mjs`, `tools/test.mjs` (real from the start) | Bundle opens on `file://`, WebGPU backend, ink chain draws, one sim test and one harness run pass |
| 1 | Sim core, terrain, physics, player, world data, chunks, sky and time, grass, trees | Walk the whole map in ink-shaded savanna, dawn to night |
| 2 | **Fire and wind**, burn texture, flames, smoke, cloth strip | Speed tests pass; a lit field looks like the target image |
| 3 | Weapons, condition, jams, first-person hands and clips, machete, Molotov; NPC rig and clips; AI; posts; ragdolls | Clear a post, get jammed, see a man crawl |
| 4 | Health, surgery, fever, buddies, rescue, mercy | All trigger from dev commands |
| 5 | Pickup, technical, truck, skiff; damage and repair; map, GPS, locator, monocular | Drive with the map up; find a case |
| 6 | Economy, gun table, safehouses, bed, save and load, papers, ceasefire | Buy, sleep, reload a save |
| 7 | UI system, glyphs, title, pause, settings, HUD, notebook, dev mode, tunables | All UI tests pass on pad, keyboard, mouse |
| 8 | Contract runner and **all content**, Director, cast, the writing, the world's people and animals | Whole-game bot playthrough passes, all 3 endings |
| 9 | Audio: buses, SFX, voices, music | Audio tests pass, music at 10% |
| 10 | Attract reel; touch-only flow | Attract tests pass |
| 11 | The Job, netcode, card, hub boot, link play | All `--hub` tests pass |
| 12 | Polish from screenshots at 1920 × 1080; about.json; exit-interview; final build; cleanup | §16 |

**Scale knobs.** If you run short, cut *quantity* from this list, and remove the cut thing entirely:

| Item | Plan | Floor |
|---|---|---|
| Contracts | C1–C8, E1, E2 | C1, C2, C3, E1, C4, one of C5/C6, C7, C8 |
| Weapons | 9 | 6 (`pistol`, `flare`, `carbine`, one of `rifle`/`pump`, one of `belt`/`tube`, `torch`) |
| Posts | 8 | 4 |
| Cases / tapes | 12 / 6 | 6 / 4 |
| Attract vignettes | 14 | 10 (≥ 80% of what remains of the F-list) |
| Kiln buildings | 16–20 | 8 |
| Scatter counts, NPC variety, music cues | As listed | Half |

**Never cut:** fire and wind, jams and rust, surgery, fever, rescue and mercy, map, GPS and locator, truck repair, a boat, papers, sleep and day/night, a buddy twist, all three endings, The Job in hub sessions, dev mode with sliders, attract, 10-foot UI with glyph swap, About & Credits.

---

## 16. Done checklist

Before you finish:

1. `node tools/test.mjs` passes: one line, zero failures. Do a last read of `docs/issues-log.md`.
2. The deliverable HTML is in the root as TASK.md names it, with the session client first and unmodified, works on `file://` and when served, and makes no network requests.
3. No TODOs, placeholders or stubs. Everything in the menus works. Every feature reachable.
4. A fresh profile really has music at 10%.
5. `src/data/about.json` is final: Source Information (date, model and environment copied from your TASK.md; `Plan` is this file's name; `Usage` reads "added on import"), and honest answers to every Testing, Engine and Prompt question. About & Credits shows them. The exit-interview JSON sits beside the HTML and parses. **Also put all of it in your final chat reply, as TASK.md requires.**
6. `docs/DESIGNER.md` is true.
7. Delete `node_modules/` and `test-output/` if they aren't needed to review the run (`npm ci` restores them). Stop any process you started. Leave nothing in `/tmp`.

### Where each TASK.md item is covered

| TASK.md | Here |
|---|---|
| Source, Goal, Scope (original, feature-complete, vertical slice) | §1, §2, §3, §5, §13.3 |
| Genre, Perspective | §1 |
| Game Title | §0 (builder's) |
| Research | §0 |
| Package (single HTML), Working Environment (dev folder, no outside reads, ports, PIDs) | §13.6, §14.1 |
| Tech Stack (r180, WebGPU, ink filter, Rapier 0.19.3, Web Audio, Gamepad) | §13, §7.2, §12 |
| Art Direction | §10 |
| Animation | §11 |
| Audio (code only, gibberish voices, music at 10%) | §12 |
| Online, Multiplayer (hub and on its own) | §6 |
| Performance | §13.4 |
| Testing (one command, whole-game playthrough, no audit agents) | §14 |
| Dev mode, sliders, reset | §9 |
| Attract Mode | §8 |
| Narrative tone | §5.1 |
| UI & UX, Touch-only | §7 |
| Done | §15, §16 |
| Source Information, Testing/Engine/Prompt Feedback, exit interview, `aiHub` block | §7.5, §16 |
