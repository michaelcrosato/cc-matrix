# PLAN: an original open-world mercenary game inspired by Far Cry 2

You build this alone, from this plan and TASK.md. Nobody can answer questions, so where the plan is silent, decide and move on.

- **Read before coding:** sections 1 and 2, and Appendix A. Read the rest when your milestone (section 15) reaches it.
- **Paths** are relative to your dev folder (the subfolder TASK.md tells you to create). "The deliverable" is the single HTML file TASK.md names, one level above the dev folder.
- **The title is yours.** Follow TASK.md's title rule (brainstorm, then pick with a real random number generator). Nothing in this plan depends on the title. This plan just says "the game".
- **VERIFIED** means the director ran it on this computer on 2026-11-04, on engine v0.88.0 (commit `0a46310`), on WebGL 2, and on WebGPU where stated. Trust those and spend your effort elsewhere.
- **Everything is required unless marked (Stretch).** Section 15 says what to cut if you must. Whatever you cut, cut it whole: TASK.md allows no stubs, and no line of dialogue may point at something that isn't there.

---

## 1. The game

**Pitch.** You are a contractor with a ruined lung, sent into a burned-out republic on the shore of a dead inland sea to kill the old engineer who drained it. Two armies pay you to betray each other. Everything you touch wears out: your rifle, your truck, your lungs, your friends. Fire is your best weapon and your worst neighbour. At the end you are standing at a dam with your hands on a wheel, and you have to decide who gets to drown.

**Genre:** open-world first-person shooter with survival pressure (guns that fail, a sickness, friends who can die for good).

**Perspective:** first person, always. Your eyes never leave your head: no cutscene cameras, no third-person toggle, no fade-to-talk. Conversations happen while you stand there and can look around. Why: the source's identity lives in the hands and the eyes, and the engine ships a 2 km first-person open-world kit that already moves, shoots and streams well.

**The five pillars. Every feature must serve one.**
1. **Fire is the weather of war.** Dry grass, wind and one spark redraw the map. Burn scars stay.
2. **Everything wears out.** Guns jam and split, trucks smoke and stall, lungs fail, friends die. You repair, replace and ration.
3. **Your hands are the interface.** Map, locator, monocular, syrette and pliers are objects you hold, and the world keeps moving while you hold them. No minimap, no floating markers, almost no HUD.
4. **Friends are your save system and your guilt.** Buddies drag you out of fights. You have to drag them out too, or end it for them. They stay dead. At the end they sell you.
5. **No clean hands.** Both sides are the same, and every contract makes things worse. People talk about it as if it were paperwork.

**Taken from the source (mechanics and mood only):** spreading grass fire used as a weapon; weapon decay and jamming; a recurring sickness managed with rationed medicine; a real-time map in the hand; first-person field surgery; rescuing buddies with permanent death; choosing one of several mercenaries; two interchangeable factions; uncut diamonds as money with a beeping locator; safe houses with a bed and a time-skip; guard posts on the roads; a charismatic villain you came to kill; bleak, literary, weary writing.

**Must be ours (TASK.md: an original game, not a recreation).** All names, characters, story, map, levels, art, music and sounds in this plan are original. Do not use the source's proper nouns or lookalikes: its country and towns, its factions (APR, UFLL), the Jackal, its characters (Reuben, Josip, Nasreen, Marty, Frank, Hakim, Paul and the rest), its opening scene, its tapes, its ending, its logo or its music. Do not set the game in a real country or name a real army. If in doubt, invent.

**Where we beat the source.** It is famous for three annoyances. Do not repeat them:
- **Guard posts that refill the moment you drive past.** Ours stay cleared until you sleep, and they may not refill even then.
- **Everyone shooting you on sight.** Ours check your papers (section 8).
- **Malaria on a dumb timer.** Our sickness responds to what you do: smoke and dust bring it on, and you can feel it coming (section 4).

**Length:** 60 to 90 minutes for a first run through the whole story, with every feature used at least once. A returning player can finish faster.

**Three moments the systems must be able to produce without a script.** If these can happen, the game is working:
- You're crouched in reeds at night with a patrol 30 m away and your lung at 90. You have one ampoule. You hear your breath catch.
- You put two bursts into a man, your rifle clicks dead, and while you rack it the grass behind him goes up, and the wind is coming your way.
- You're on your back in the dirt, and through the smoke you see your friend running toward you. You owe them for the last time, too.

---

## 2. Foundation

### 2.1 Get the pieces

```sh
# in the dev folder
git clone --depth 1 https://github.com/michaelcrosato/my-3d2dge.git engine-repo
git -C engine-repo fetch --depth 1 origin 0a463102661e66de714aa76b321219f20028ab04
git -C engine-repo checkout -q FETCH_HEAD        # v0.88.0: what this plan was verified on
mkdir -p engine hub src test
cp engine-repo/dist/handoff/my-3d2dge.js engine-repo/engine/my-3d2dge-3d.js engine/
cp -r engine-repo/vendor/three-0.182.0 engine-repo/vendor/rapier3d-simd-compat-0.19.3 engine/
cp engine-repo/src/starter3d/00-shell.js engine-repo/src/starter3d/30-shooter.js engine-repo/src/starter3d/90-start.js src/
for f in session.js harness.html bridge.js round.js; do curl -fsSO --output-dir hub https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/$f; done
```

The engine files in `engine/` are yours to patch. Keep a one-line log of every patch in `ENGINE-CHANGES.md`: TASK.md asks for it in Engine Feedback. Delete `engine-repo/` when you finish.

**The stack.** The handoff package's 2D engine still runs the game loop, scenes, input, menus, settings, sound and the HUD. `E.World3D` (three.js r182 and Rapier 0.19.3) draws and simulates the 3D world under it. This is the route the handoff README's step 7 names for first person. Do not build on the 2D views, and do not write your own renderer.

**What to read in `engine-repo/`, and nothing more:**
- `engine/my-3d2dge-3d.js` lines 1-264 (the whole 3D manual).
- `dist/handoff/API.md`: the Game, Input, Dialog, Menu, Sound and Standard features sections.
- `dist/handoff/docs/ASSETS.md`: when you write props.
- Grep `dist/handoff/API-INDEX.md` for names; never read it whole.
- `docs/ENGINE-3D.md`, section "Things to know".
- `node dist/handoff/tools/asset-find.mjs "tent"` searches the CC0 prop store (trees, tents, crates, furniture). There are no modern vehicles or weapons in it: you draw those.

### 2.2 Build into one file (VERIFIED)

An esbuild bundle of the kit booted from `file://` in about 7 s with no errors and no server. The file came to about 4.8 MB before any game code, with three.js and Rapier inlined, so it needs no CDN and no network. The hub's importer leaves embedded engines alone. Appendix A1 has the build script and page template.

- Keep game code as numbered files in `src/`, concatenated in order into one ES module. Remove the kit's `const SHOOT = (() => {` wrapper, so everything lives at module top level.
- Suggested files: `00-shell`, `05-data` (tables only), `06-story` (text only), `10-land`, `20-soldier`, `30-player`, `40-weapons`, `45-fire`, `50-vehicles`, `55-ai`, `60-buddies`, `65-contracts`, `70-hud`, `75-screens`, `80-audio`, `85-net`, `88-bot`, `90-start`. `src/metas.html` holds the hub tags (section 13); `src/page.css` holds the CSS in A7.
- **Data lives in tables.** TASK.md wants the rest of the game buildable later with normal designer tools. So sites, roads, weapons, looks, vehicles, contracts, dialogue, barks, radio and the shop are plain data in `05-data` and `06-story`. Systems read those tables. Adding a contract or a site must not touch a system.

### 2.3 The kit, section by section

`src/30-shooter.js` is 2,088 lines and 200 KB. Read a section when you change it, not all of it at once. Line numbers are for v0.88.0.

| Kit section | Lines | What to do |
|---|---|---|
| TUNING | 20-24 | Keep walk/run/eye constants. Delete shields, slide, zipline, wall climb. |
| THE BADLANDS: `baseH`, `height`, `color`, `OUTPOSTS`, `ROADS`, `route`, `planLand` | 28-146 | Keep `route`, the rasters and `planLand`. Rewrite `baseH`, `color` and the data (section 3). |
| Structure pieces: `quad`, `boxAx`, `cylAx`, `quadPts`, `B`, `beam`, `CYL`, `wall`, `shack`, `container`, `ladder`, `tower`, `tank` | 147-308 | Keep. Add `hull`, `lighthouse`, `dam`, `quay`, `tentRow`. Delete `zipline`. |
| `layout()` | 310-400 | Rewrite, one function per site. |
| `structureMesh` | 416-436 | Keep (one merged mesh, one material; kinds pick patterns). Add a rust kind if you want one. |
| SCATTER: `chunkItems`, `streamScatter` | 437-488 | New tree kinds, charred variants (section 6). |
| GRASS: `grassMeshes`, `buildGrass`, `drawGrass` | 489-547 | Add the burn mask (A4) and tall reeds. |
| FX: tracers, decals, `impactStar`, `drawFlashes` | 548-647 | Keep. |
| THE SOLDIER: `LOOKS`, `body`, `pose`, `deadPose`, `drawSoldier`, `drawGun` | 648-1015 | Add looks, heads, faces, new guns, crawl/burn/drag poses (section 8). Remove the sci-fi visors and masks. |
| WEAPONS: `WEAPONS`, `reloadCurve`, `fire`, `impact`, `explode` | 1016-1152 | New table, wear and jam (section 5). Remove shields, damage numbers and the loud hit-marker kinds. |
| THE PLAYER: `newState`, `look`, `move`, `actions`, `camStep` | 1153-1465 | Remove slide, climb, zip and the third-person view. Keep vault, mantle, ladders. Add tools, health, lung, vehicle seat. |
| RAIDERS: `spawnRaider`, `streamRaiders`, `raiderStep`, `raiderShoot`, `hurtPlayer` | 1466-1598 | Base for all soldier AI (section 8). |
| WORKING PARTS: doors, bins, loot | 1599-1695 | Keep doors. Bins become crates. |
| FIRST PERSON: `drawViewModel`, `keysAt`, `VM` | 1696-1792 | Add every new gun and every hand animation (section 4). |
| HUD | 1793-1885 | Rewrite to almost nothing (section 11). Delete the compass bar, outpost counter and control list. |
| SOUNDS | 1886-1919 | Base table; extend (section 12). |
| THE STEP: `step(dt, I)`, `keepPrev`, `onDraw`, `reset`, `run` | 1920-2052 | **Keep this seam.** `step(dt, I)` takes an input object `I = { move, mouse, stick2, pressed(a, w), down(a), use(a) }`. Real input, the bot, attract mode and tests all drive the game through `I`. `run(n)` is the replay proof: keep one and test it. |
| `touchLook`, `TOUCH`, `touchButtons` | 1928, 2053+ | Delete. TASK.md wants no touch controls. |

From `00-shell.js` keep the `game` creation and helpers; delete the slice menu, `FamilyMenu` and title stage. `90-start.js` becomes your boot (section 13 and Appendix A6). Use **one world for everything**: the title screen and attract mode are that same world with a fixed camera. This saves boot time, which matters in section 13.

### 2.4 Engine facts that will otherwise cost you hours

1. **Units:** 16 units = 1 m. x east, y south, z up. Your own three.js meshes are in metres with y up: `E.World3D.toThree(x, y, z)`, or x/16, z/16, y/16.
2. **Fixed steps:** `update` runs at 1/120 s. A frame past 50 ms gives up its time, so under software rendering (about 4.5 fps here) game time crawls. Tests must wait on state, never on the clock.
3. **Make every mesh and material during boot, before `world.prepare()`.** A material first seen mid-game stalls. `prepare()` warms visible world meshes and all overlay meshes, even hidden ones. A world-scene pool mesh must be visible with a draw range of at least one triangle at that moment (the kit's trick: `setDrawRange(0, 3)`).
4. **Renderer rules:** node materials and TSL only. No `ShaderMaterial`, `onBeforeCompile`, `EffectComposer`, addons, compute or GPU read-back. An `InstancedMesh` over 1,000 instances must not use `DynamicDrawUsage`. For a dynamic pool, use a merged `BufferGeometry` with `setDrawRange`, as the kit's tracers and the flames in A4 do. A texture read in a vertex stage needs `.level(0)`.
5. **The pen** (`world.pen`, `overlay.pen`) draws for one frame. Call it each frame from `onDraw`. Draw changes nothing in the sim.
6. **Randomness:** the sim uses `E.rng(seed)` only, so `world.hash()` replays. `Math.random` is for pictures. In a shared-world session the host's sim uses its own `AIHub.rng(label)` stream.
7. **`game.go` fades for .22 s.** Set `game.fadeTime = 0` in tests.
8. **World-private fields used by recipes in Appendix A:** `world._sun`, `_sunDir`, `_ambient`, `_skyDome`, `_fog`, `terrain.mat`. They exist at the pinned commit, which is why you pin.
9. **`vehicleParts` is engine code** with three fixed kinds. Patch one line so your own models draw: `if (a.o.draw) a.o.draw(this.pen, a, t); else vehicleParts(this.pen, a, t);` at `my-3d2dge-3d.js` line 3006.
10. **`E.Menu` does not scroll** at v0.88.0. Keep lists to 6 rows or page them.

---

## 3. The world

**The Republic of Lacustria**, a country named for a lake that isn't there. It is a high basin ringed by red rock. The **Amaranth**, an inland sea, was drained over forty years by a river diversion for cotton. Rusting trawlers sit on the dry bed around the last knee-deep brine. A lighthouse stands in a field. Toxic salt dust blows off the seabed. A ceasefire was signed in the spring, and nobody has stopped shooting.

Keep the kit's 2,048 m square map (`SIZE = 32768`). Crossing it takes about 80 s by jeep, which is right for a slice with this many stops.

### Sites (metres east, metres south)

Put these in `SITES`. `planLand` nudges each to flat ground and flattens a pad of radius `r`.

| id | Name | at | r | Held by | What stands there |
|---|---|---|---|---|---|
| `strip` | Vasco Strip | 1500, 1640 | 50 | nobody | Gravel runway, wrecked crop-duster, windsock. The prologue starts near here. |
| `mission` | Saint Odile's | 420, 1520 | 46 | clinic | Roofless chapel, 12 tents, water tank, the clinic jeep. Sister Perpetua. |
| `salt` | the Salt Shed | 1000, 1130 | 30 | safe house | Long tin shed, white salt heaps, on the Causeway. Refugee camp (30 tents) 120 m south. |
| `fleet` | the Fleet | 1180, 1290 | 90 | smugglers | Nine stranded trawler hulks, tilted, some you can walk inside. |
| `remnant` | the Remnant | 1120, 1400 | 130 | nobody | The last brine, knee deep. Flat water. The airboat lives here. |
| `reedcamp` | Reed Camp | 760, 1400 | 40 | Front | Boardwalks, tents, fuel barrels, in the tallest reeds. |
| `port` | Port Clement | 1640, 1010 | 80 | neutral, then ash | Quay wall facing nothing, 14 buildings, the Customs House (3 floors), the Harbourmaster bar, Mr. Sunday's boat in dry dock. |
| `k9` | Kilometre Nine | 1530, 600 | 50 | Authority HQ | Sandbags, containers, watch tower, flag, Captain Dray's office. |
| `red` | Red Steps | 430, 850 | 50 | Front HQ | Quarry terraces cut into a red mesa, one tunnel, watch tower, a schoolroom with a chalkboard. |
| `st4` | Station Four | 900, 720 | 44 | Front | Pump house, pipes, tank, a dry canal cut. |
| `lamp` | the Lamp | 1060, 660 | 26 | safe house | A 40 m lighthouse on a stone spur above the old north shore. Its light turns at night. You can navigate by it from anywhere. |
| `tannery` | the Tannery | 440, 1180 | 28 | safe house | Vats, hide racks, a shack, on the old west shore. |
| `watertower` | the Water Tower | 1380, 1600 | 22 | safe house | Tank on legs, shack under it. |
| `sill` | the Sill | 1000, 190 | 60 | Authority + Meridian | A dam wall across a canyon notch in the rim. Control house, helipad, dark reservoir behind. |

**Roads** (`ROADS`, routed by the kit's A*):
- port-k9, k9-lamp, lamp-st4, st4-red, red-tannery, tannery-mission
- mission-watertower, watertower-strip, strip-port
- **the Causeway:** tannery-salt, salt-fleet (spur), salt-port, a raised road 2 m above the seabed running east-west
- lamp-sill, up the canyon

**Guard posts** (`POSTS`: `{ on: [a, b], at: .5, faction }`):
- G1 port-k9 Authority
- G2 k9-lamp Authority
- G3 tannery-mission Front
- G4 st4-red Front
- G5 salt-port Authority
- G6 watertower-strip Front

### Terrain (rewrite `baseH` and `color`)

- **Bowl:** let `d = hypot((m-1050)/600, (n-1180)/430) + (fbm(m/300, n/300, 3) - .5) * .35` and `sea = 1 - sstep(.92, 1.08, d)`. Multiply the kit's relief by `(1 - sea)` and add `-14 * sea` metres, so the seabed is low and nearly flat.
- **Mesas:** keep the kit's two-tier mesas, but only where `sea == 0`, weighted toward the west and north-west (Red Steps).
- **Rim:** keep the kit's cliff ring. Cut a notch 280 m wide at `m ≈ 1000` on the north edge for the Sill's canyon.
- **Remnant:** make the terrain perfectly flat at one height inside its circle. There is no swimming. Draw a water plane a hand above it (A5). Walkers wade at 60%. The airboat is happy.

`biomeAt(m, n)` returns one of: `salt` (the bed north of about n = 1200: cracked, near white, no fuel), `mud` (the bed south of that: sparse dry sedge, so fire can creep across it to the Fleet and the camp), `reeds` (a broad band inside the old shore in the south-west, from about (700, 1250) to (1000, 1560)), `grass` (default upland), `scrub`, `rock` (steep), `road`, `pad`, `brine`. The fire, vehicle surfaces, grass mesh and held map all read it.

**Palette:** bleached gold grass `#c6aa64`, olive scrub `#8e8a55`, salt `#d9d2bd`, cracked mud `#a9967a`, reed `#b9b277`, rust `#7a3a1e`, oxide hull `#4f5c50`, ash `#191512`.

**Scatter** (`chunkItems`):
- Flat-topped thorn trees: the `tree` shape with a low wide crown.
- `bottle` trees: your own `E.SHAPES` entry, a fat `lathe` trunk with a tiny crown. These are the silhouette the player remembers.
- Dead snags and rocks.
- Nothing on salt except wreckage: nets, anchors, ribs of small boats.

**Structures** are merged into the kit's one mesh over `world.block` colliders, using its pieces plus yours:
- `hull(P, ...)`: 28 m long, 7 m beam, tilted 6-14°, plates as quads, rust patches, a hole in the side, an open hold.
- `lighthouse`, `quay`, `tentRow`.
- `dam`: wall 240 m wide and 46 m tall, three gates, a service stair, a top walkway, a control house with a big iron wheel, a separate reservoir water plane behind.

**Art direction.** The engine's native look: low-poly pen-drawn bodies with outlines, pixel font, chunky textures. Keep the 3D picture at `balanced`: the kit already passes `res: 'balanced'`, and A7 makes the Settings row agree. It looks good at 1080p and still reads as this engine. Never smooth it.

### Time, wind, weather

- **Time of day:** 1 in-game hour = 90 s (slider). Use A3, whose keyframes were tuned on screenshots. Night must be dark but playable: moonlit blue, with fire and the Lamp as the bright things. Update the sun's direction every 5 game minutes, not every frame, or shadows shimmer.
- **Wind:** `windDir` drifts slowly and `wind` runs 0.2 to 1. Every 2 in-game hours a new target eases in over a minute. Show it only in the world: grass lean (drive the kit's sway from it), smoke drift (A4), windsocks at posts and strips, and a tiny pencil arrow on the map's compass rose.
- **Dust storm:** about one per game day, 2-3 minutes. Fog pulls in to about 120 m and turns orange (`world._fog.near/far`, `scene.fog.color`), sand particles, wind 1, lung ×4. Enemy sight halves for everybody. Fire runs fast. Tell the player in advance by radio.

---

## 4. The player and the hands

### Controls (prompts always come from `game.input.label(action)`)

| Action | DualSense | Keyboard and mouse |
|---|---|---|
| Move / look | L stick / R stick | WASD / mouse (captured on click) |
| Fire / aim | R2 / L2 | Left click / right click |
| Jump, vault, mantle | ✕ | Space |
| Crouch | ○ | C or Ctrl |
| Sprint | L3 | Shift |
| Use (tap); reload or clear jam when nothing to use | □ | E use; R reload or clear jam |
| Next weapon | △ | Q; 1, 2, 3 direct |
| Melee (machete) | R3 | V |
| Bottle / frag | L1 / R1 | F / G |
| Map / locator / monocular / syrette | D-pad up / right / left / down | M / N / B / H |
| Pause | Options | Esc |
| **In a vehicle:** gas / brake, reverse | R2 / L2 (analog: `input.value`) | W / S |
| Steer / look | L stick / R stick | A, D / mouse |
| Handbrake / exit | ✕ / □ | Space / E |
| Gun seat (technical) / radio | △ / L1 | Tab / L |

Use one `KEYS` map for every scene. Bind only `Mouse0` plus the pad code for fire and aim. VERIFIED: `label` then gives `Left click`, or `R2` on a pad. The kit's extra `KeyJ` is what made it print "J". With a pad and glyphs `playstation`, VERIFIED labels are `R2 L2 ✕ □ △ ○`. With `xbox` they are `RT` and `A X`. Name every action in `menu.controls` so the Controls screen reads well.

### Moving

Keep the kit's walk 68, run 118, crouch 40, ADS 46 units/s, its vault, mantle and ladders. Sprint runs on stamina: 8 s to empty, 12 s to refill. Lower the jump a little. Kick doors with melee. Grounded, heavy, tired.

### Holding things (pillar 3)

Each tool is a stance on the overlay pen, keyframed with the kit's `keysAt`. Raising one takes .3-.45 s with a sound. The world never pauses. **Fire drops any tool at once.**

- **Map (A2):** both hands, the gun gone. Walk at 60%. It shows contour lines, roads, site names, pencil circles on the current objective, your tagged soldiers as pencil ticks, a small arrow for you, a compass rose with the wind arrow. Your left wrist is in shot with a **watch**: the only clock in the game. Look input moves a pencil over the map instead of the camera. ✕ or left click pins a waypoint. L2/R2 or the wheel zoom between the whole basin and 3×. The crosshair and prompts hide. You can raise it while driving, and you will crash. That's the point.
- **Locator:** a chunky handset in the left hand, gun still in the right (hip fire only, spread ×2). A ring of 8 LEDs points to the pinned waypoint or current objective, with a small readout in metres (A2's method on a 128×64 canvas). Within 150 m of an unfound diamond case it beeps, from every 2 s down to every .15 s at 5 m, and a separate red LED blinks with it. It also rings for radio calls.
- **Monocular:** FOV 70 to 14, dark tube mask, slight sway. Held .6 s on a soldier, vehicle, ammo crate or fuel dump, it tags the thing: a pencil tick on the map and a small corner bracket seen only through the monocular. Tags clear when the site is clear.
- **Syrette (tap):** .9 s jab in the thigh, +40 HP.
- **Field surgery:** when health is in the last segment, the syrette button instead starts a 4-6 s operation you can't cancel. It restores you to 60 HP and costs no syrette. Pick one of four at random and draw each on the overlay with the left arm, right hand and tool: pull shrapnel from the forearm with pliers; dig out a bullet with a knife, then burn the wound with a lighter; pop a dislocated finger back (a fast sharp snap); rip a nail out of the thigh and bite your glove. The camera dips and rolls a little. You can still look. Enemies don't wait. Add blood on the glove afterward; it stays until you sleep.
- **Ampoule:** hold the syrette button .4 s at any time, or tap it during a fit (bottom of this section).
- **Hands on things:** repair (wrench on engine, 4 s), wheel at the Sill (both hands), jam clearing, reload. Draw hands for all of them.

### Health

100 HP, shown as 5 segments. A damaged segment refills on its own (6 HP/s after 6 s without damage) up to its top. Lost segments need a syrette or surgery. Carry at most 5 syrettes. No shields, no damage numbers.

**At 0 HP:**
1. If a buddy is available (section 8), you go **down**: low camera, greyed veil, look only, then the rescue plays.
2. If not, a black card with one line of writing and two choices: reload last save, or quit to title.

### The rasp (salt lung)

The sickness is the seabed dust. A hidden `lung` value climbs 0 to 100 in about 14 minutes of play. That rate is ×4 in a dust storm, ×6 within 15 m of burning cells, ×1.5 at a sprint.

- **Warning (at 85):** you hear your breath catch. The experienced player holds the syrette button for an ampoule now, before it starts.
- **Fit (at 100):** 6 s. Harsh cough sounds, white bloom closing in (HUD veil), heavy view sway, walk ×.4. Noise alerts soldiers within 40 m, so a fit in the reeds beside a patrol is the worst moment in the game, as intended. An ampoule ends it at once and sets `lung` to 0.
- **No ampoule:** the fit lasts 14 s, then `lung` is 30. A second fit within 3 minutes blacks you out and counts as 0 HP: a buddy rescue, or the black card.

Ampoules never appear in shops. You start with 2, hold at most 6, and get them only from Sister Perpetua in exchange for Clinic runs. The player always knows how many are left because the box is in the hand when used (draw that many glass tubes) and on the map's margin in pencil.

---

## 5. Weapons and wear

Mr. Sunday names his stock after church offices ("my congregation"). Numbers are starting points; all of them scale with Dev mode sliders. Enemies have 100 HP. Damage falls off from *full* to 70% at *half*, as in the kit's `fall`.

| id | Name | Slot | Dmg | Rate/s | Mag / reserve | Auto | Wear/shot | Jam× | Full / half (m) | Stones | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `verger` | Verger revolver | side | 34 | 3 | 6 / 36 | no | .004 | .5 | 30 / 60 | free | Head ×2. Your first gun, rusty. |
| `acolyte` | Acolyte flare pistol | side | 12 | .8 | 1 / 8 | no | .01 | .3 | 50 / 80 | 4 | Ignites where it lands; lights the night for 8 s. |
| `deacon` | Deacon SMG | primary | 16 | 13 | 32 / 224 | yes | .0025 | 1.2 | 20 / 45 | 5 | Cheap, jumpy, jams. |
| `parson` | Parson rifle | primary | 24 | 9.5 | 30 / 180 | yes | .002 | 1 | 60 / 140 | 8 | The kit's rifle. Honest. Remove the sci-fi holo; use iron sights. |
| `sexton` | Sexton pump | primary | 11×9 | 1.25 | 6 / 30 | no | .006 | .8 | 8 / 24 | 6 | The kit's shotgun. |
| `curate` | Curate bolt rifle | primary | 80 | .8 | 5 / 30 | no | .006 | .5 | 200 / 400 | 10 | Head ×2.5. Scope FOV 18. Sway. |
| `choir` | Choir LMG | heavy | 26 | 11 | 80 / 160 | yes | .0012 | 1.4 | 60 / 140 | 12 | Tracers: 2% per hit to ignite grass. |
| `bishop` | Bishop RPG | heavy | 200 | .3 | 1 / 5 | no | .03 | .6 | 300 | 14 | Blast 7 m. Ignites r = 4 m. Wrecks a jeep. |
| `gardener` | Gardener flamethrower | heavy | 40/s | hold | 100 / 200 fuel | yes | .0008 | .4 | 12 | 16 | Ignites each cell along the stream. Below 10% condition the tank may burst on you. |
| `machete` | Machete | melee | 60 | 1.6 | | | | | | free | The kit's punch and lunge, with a blade. Silent. |
| `bottle` | Bottle (molotov) | throw | | | carry 4 | | | | | 2 for 1 | Ignites r = 6 m. Draw the rag, flame and arc. |
| `frag` | Grenade | throw | 110 | | carry 4 | | | | | 2 for 1 | The kit's frag. r = 7 m. |

You carry one each of side, primary and heavy, plus machete and throwables. Every gun needs a first-person model and a body model in `drawGun`, with hands placed by `VM` entries.

**Condition `cond` runs 1 to 0**, lowered by `wear` each shot. **Guns taken from enemies start at .2-.55. Guns from your safe-house crate start at 1.**

- **Jam:** on each shot, if `cond < .7`, chance is `TUNE.jam * W.jam * .09 * (1 - cond / .7)^2`. A jam is a dead click and a stuck gun. □ or R clears it: a 1.1-1.6 s animation, one of three (slap the magazine, rack the bolt, bang it on your palm). The gun is silent until it's done.
- **Misfire:** below .15, a further 8% chance of a dud click (.4 s lost).
- **Break:** at `cond` 0 the gun splits. A short ugly animation, a bang and a curse, and you drop it. The slot is empty. Pick up whatever the dead left you.
- **You see the wear on the gun:** `drawGun` colours mix toward rust `#6a4a30` as `cond` falls, with tape and rag patches below .5, and the action sound gets rattlier. Below .4 a small 5-tick condition mark shows beside the ammo count. Enemies' guns jam too (5% of bursts): they stop, curse in gibberish and rack it, which teaches the mechanic and gives you a window.

**Getting guns:** spend stones at Mr. Sunday's to unlock a gun (section 10). From then on every safe-house **weapon crate** hands you a fresh copy free, and refills your ammo, syrettes and throwables. That makes coming home matter.

---

## 6. Fire

This is the game's signature and it must feel dangerous. VERIFIED on WebGL 2 and WebGPU: a 512×512 cell grid over the map (4 m a cell), a burn-mask texture read by the terrain and grass shaders, 2,400 camera-facing flame quads, smoke columns. Spread simulation cost is trivial: 240 ticks with 6,000 burning cells took 61 ms. Code is in Appendix A4.

**Cells:** `state` 0 unburnt, 1 burning, 2 ash, 3 wet; `t` time left burning. `fuel` is looked up lazily from `biomeAt` and cached: grass 1, scrub .7, reeds 2.5 (burns 6 s, tall flames), mud .25, trees (a cell with a trunk: burns 25 s, a tall column), and salt, rock, road, pad, brine 0. Zero fuel is a firebreak. Roads, the Causeway, the salt core and burnt ground all stop it. Fire can't cross those except by **embers**: each burning tree or reed cell has a small chance per tick to light a random cell up to 24 m downwind, so a firebreak is safe until it isn't.

**Spread:** at 4 Hz, for each burning cell and each unburnt neighbour, `p = TUNE.fireSpread * .018 * fuel * exp(1.5 * wind * cos(angle to wind)) / dist`. With the default wind this measured about 2.5 m/s downwind on grass and almost nothing upwind. You can outrun it on foot on grass. In reeds it matches a sprint, and your sprint runs out.

**The black is safe.** Ash doesn't burn. The player's first lesson (prologue) is to run through a thin flame line onto burnt ground rather than away from the fire. Back-burning (lighting a strip ahead of a fire so it has nothing left) works by itself in this model and is the key to contract C4. Water cells (flood) go to state 3 with white steam puffs.

**What lights it:** Acolyte flares, Bottles, the Gardener, RPG and frag blasts (60% within r = 4 m), exploding fuel barrels (r = 8 m, and they chain), burning wrecks (one cell per 2 s), Choir tracers, kicked or shot campfires, and burning men running. Dev mode has "ignite here".

**What it does:**
- **Actors in a burning cell:** take 25 HP/s, and catch fire for 3 s after leaving.
- **The player:** orange vignette, a roaring sound, lung ×6. The way out is a straight line through to ash.
- **Soldiers:** check `fireNear(x, y, 24 m)` at each think. If it's close they break off and flee to the nearest ash or zero-fuel cell, or across the wind. On fire, they run blind, screaming in gibberish, and light what they run through. They die in about 6 s.
- **Vehicles:** 6 HP/s; barrels, ammo crates and fuel dumps cook off after 2-4 s.
- **Sight:** line of sight through thick smoke (within a burning 32 m block) halves enemy sight range.

**What it leaves:** terrain and grass go black through the mask (A4). Trees swap to charred materials on the next `streamScatter` pass (`mats: { l: '#191512 bark', b: '#191512 bark' }`), and a charred tree has no crown fuel. The mask is saved with the game. Ash regrows over two in-game days: the mask fades and fuel returns. The player's route across the country stays written on it for a while. That is the point.

**Picture and sound:**
- Flames: 4 quads per cell within 70 m, 1 larger quad per cell out to 320 m.
- One `world.light` at the nearest large front, flickering. Embers from `game.particles`.
- Smoke rises with the wind. Fire looks best at dusk and night; don't blow it out by day (the flame gain in A4 is tuned).
- Crackle plus a low roar, by distance to the nearest burning cell and panned by bearing.

---

## 7. Vehicles

Use `world.vehicle` (VERIFIED on the kit's terrain: a car reached its 420 u/s top speed, hit a wall and recovered, with or without a renderer). Draw your own models with the pen via `o.draw` (section 2.4 item 9). All of them are rusty, one-off, mismatched panels.

| Type | kind | top | accel | turn | hp | Notes |
|---|---|---|---|---|---|---|
| Jeep | car | 420 | 300 | 2.1 | 120 | Open top. Clinic's is white with a hand-painted cross of no known church. |
| Technical | car (`r` 8.5, `mass` 2) | 360 | 240 | 1.9 | 180 | Pickup with a pintle gun in the bed. △ moves you to the gun when stopped. |
| Truck | car (`r` 10, `mass` 3) | 300 | 180 | 1.6 | 260 | Canvas back. Convoys. |
| Airboat | hover (`float` 7) | 380 | 240 | 2.3 | 100 | Fan cage. Fast on brine and reeds, a crawl elsewhere. |

**Surfaces** (`surfaces` and `ground: (x, y) => biome tag`, both real engine options; `x, y` in units):
- Land vehicles: road full; grass `{top: .7}`; salt `{top: .95, grip: .6}`; mud `{top: .5}`; reeds `{top: .4}`.
- Airboat: brine and reeds full, mud `.5`, salt `.35`, everything else `.25`.

**Seat:**
- On entering, set the hero non-solid and `place` it at the vehicle each step. The camera sits at the seat offset, turned by `v.angle` plus free look.
- The overlay draws steering wheel, hands (turning with `v.steer`), dash, and a **dash locator** with bearing and metres to the objective. Draw windscreen frame and bonnet in the world with the pen.
- On exit, place the hero at ground beside the door after a clear-ground ray.

**Damage:**
- Crashes: `v.bumped` at speed costs `speed * .08`. Bullets cost 1 each, RPG 140, fire 6/s.
- Under 50%: white smoke. Under 20%: black smoke, a coughing engine, top speed halved, and it may stall.
- Repair: get out, stand at the bonnet, hold use: a 4 s wrench animation back to 60%. Unlimited, but it takes 4 s while someone is shooting.
- At 0: it catches, burns 3 s, explodes (r = 6 m), and leaves a burning wreck that lights grass.

**AI vehicles:** convoys and patrol technicals follow the road polylines with look-ahead steering and `v.update(dt, null, { steer, gas })`. A technical's gunner fires bursts at the player within 120 m. A blocked or wrecked vehicle's crew get out and fight. Patrols run the roads about every 3 in-game hours, so driving is never just driving.

**The radio** plays when you're in a vehicle and is the game's comic relief (section 9).

---

## 8. People

### Factions

Build `LOOKS` entries from these. Bodies come from the kit's pen skeleton. Replace the helmets, visors and masks with a head function that draws: skin ball, small nose, two eye dots, brows, optional hair cap, beard, beret, scarf, bush hat, sunglasses, a nun's veil, and a jaw that moves with speech. Vary skin tone, scale (k .95-1.05) and head item by each soldier's seed.

| Who | Colours | Head |
|---|---|---|
| **The Provisional Authority** ("the Authority", soldiers "Provisionals"): the old army, now the caretaker government. Clean paperwork, dirty hands. | cloth `#7a7350`, plate `#5d5a3e`, pack `#57523a` | Olive beret; officers wear peaked caps and sunglasses. |
| **The Front for the Return of the Waters** ("the Front"): rebels who became what they fought. | Mismatched cloth, red scarf `#9c2a1e`, vest `#3b2f26` | Red headscarf, bare heads, a few looted berets. |
| **Smugglers** at the Fleet | Oilskin `#4a4a3a`, rubber boots | Woollen caps. |
| **Civilians** | Dull robes and blankets, no plates or pouches (`plain: true`) | Bare or wrapped. Bundles. |

### Soldier AI (extend `raiderStep`; keep its sight, hearing, bursts, strafing, hunt)

- Remove shields. Add `faction`, and states `fleeFire`, `burning`, `wounded`.
- **Wounded:** 30% of non-head, non-explosive kills instead drop to a crawl (`b.move = 'crawl'`) at 14 u/s, firing a pistol weakly, shouting. A comrade within 15 m may drag him (`act 'drag'`): both stop shooting. He dies after 25 s, or sooner if you decide.
- **Squads:** with 3 or more fighting, one flanks (goal offset 40 m to the side), one suppresses your last known place.
- **Officers** radio for help after 15 s of combat. A technical comes from the nearest post (subtitled radio bark).
- **Night:** sight ×.55. Crouched in reeds: ×.5. Your fit's cough and unsilenced shots override this. Sight checks stay at the kit's rate.
- **Barks:** gibberish voice with a subtitle, only from the nearest soldier in 40 m, at most one every 3 s (section 9).

### Guard posts and papers

Each post: barrier, sandbags, 4-6 men, one mounted gun, a windsock, a fuel barrel someone left too close.

- **Staying clear:** a cleared post stays clear until you next sleep. Then each cleared post has a `TUNE.postRespawn` (.4) chance to refill.
- **Papers:** while you hold a current contract from a faction, or the clinic's pass in P1, you carry its papers (shown as a slip in hand when challenged). That faction's posts wave you through, with a bark, unless you aim at them for more than 1 s, fire near them, or are in a stolen vehicle. Do any of that and your papers for that faction are **burned** until your next contract with them, and the whole post opens up. The other faction shoots on sight. Holding papers lets the player walk into a camp and start a fire at the worst moment. Encourage it.

### Buddies

At New Game you choose one of four mercenaries from their passports (section 11). The other three exist in the world as **buddies**.

| Merc | Who | As you, you get | As a buddy |
|---|---|---|---|
| **Teodor Lisk** | Sapper. Bulgarian. Says little, and it's usually about the blast radius. | Bottles ignite +2 m, start with 2 | Arrives with a Bottle already lit |
| **Nkechi Lund** | Field medic, Lagos by way of Malmö. Clipped, unsentimental. | Surgery 25% faster, carry 7 syrettes | Rescue restores 80 HP, not 60 |
| **Ruy Almeida** | River pilot from Lisbon. Won't stop joking; it's how you know he's scared. | Repair in half the time | Arrives in a vehicle and leaves it for you |
| **Hollis Tran** | Crop-duster and courier from the Gulf Coast. Bitter. Keeps count of who owes her. | Shotgun wear halved | Stays and fights 60 s longer |

Order the three: **Best Buddy** (meet at the Salt Shed in P1), **Second** (at the Lamp, when you first reach it), **Third** (at the Tannery). They sit at their safe house with a drink and small talk between jobs.

**Rescue (they save you):** at 0 HP or blackout, if a living buddy is free, `TUNE.rescueChance` (.8) applies, with a 2-minute cooldown.
1. The buddy spawns out of sight 40-60 m away and runs in, shooting (6-9 s).
2. You watch it from the ground, unable to act, and hear them coming.
3. They grab your harness and drag you 6 m. The camera jolts and the ground slides by.
4. They stab you with a syrette (visible hand in your face) and say a line. You're up at 60 HP.
5. They fight beside you until the area's clear or 60 s pass, then leave. If it fails (they die getting to you), it's the black card.

**Rescue (you save them):** a buddy who drops sits against something, bleeding, calling for you by name (a bark and a locator ring). You have 45 s to reach them. Hold use and choose:
- **Syrette**, if you have one. Uses it; they're up.
- **Mercy** (your sidearm, one shot, your hand in shot). In a burning cell or below 5 s left, it's the only option.

Death is permanent and saved. Their bottle stays on the table at their safe house. Later lines change to fit: Sister counts them; Sunday asks about the debt.

**Alt-plans:** after you accept a contract, the locator rings. A buddy offers a side-plan (two big prompts; you keep moving). Accepting adds a richer objective and a nasty written twist, pays more, and adds 1 to their `rep` (`rep` raises their rescue priority and their line quality). Twists are in the contract table. Every alt-plan goes wrong the way it's written to.

**Civilians.** Crowds at Saint Odile's, the Salt Shed camp and Port Clement. They do nothing clever: walk, sit, run from fire and gunfire. If you kill one, Sister Perpetua knows ("Four hundred and seven. Then you came."), gives one fewer ampoule next time, and says it.

**Animals (Stretch):** a herd of 8 pale antelope on the south-west grass that bolts from gunshots and fire, and vultures that circle over bodies. Quadrupeds are your own pen drawing: four two-bone legs on a sine.

---

## 9. Story and writing

### Tone (TASK.md: a writing style like the source's)

Weary, dry, literary, cruel in passing.
- People talk as if they've had this conversation before.
- Short sentences. War is paperwork, arithmetic or weather, never glory.
- Nobody explains themselves. Nobody calls you a hero. No exclamation marks except in screams.
- Jokes are how people avoid saying the thing.
- The narrator never appears: only letters, logbooks, radio.
- Every line is English on screen with gibberish voice under it.

Write more lines in this voice when you need them; use these exactly where given.

### Cast

- **Ilse Tarn, "the Surveyor"**: 71, chain-smoker, the colonial water board's last hydrologist. She drew the diversion that killed the Amaranth. For nine years she has sold rifles and water rights to both armies so that neither will ever have enough men left to hold the dam. You came to kill her. She is the only honest person in the country and that is no comfort. *"I measured this lake for thirty years. It was the only honest thing in the country and I killed it with a pencil."*
- **Mr. Abel Cray**: Meridian Water Consortium's lawyer; hired you; punctual. Only appears as a letter and on the helipad.
- **Sister Perpetua**: runs Saint Odile's, keeps a count of the living in a school exercise book. *"I don't pray for you. I count you. It's more accurate."*
- **Captain Lucan Dray**: Authority quartermaster. *"The Authority does not kill people. The Authority reconciles accounts."*
- **Colonel Dorothea Renn**: Authority commander, prim, tired. *"A controlled burn is one we have filed the form for."*
- **Comrade Teacher Joachim Sell**: Front commander, ex-schoolteacher, chalk on his sleeve. *"Three trucks. Minus three trucks. Show your work."* And: *"The Front has no prisoners. We have remainders."*
- **Mr. Sunday**: arms dealer in the hold of a dry-docked trawler, cheerful as a tax refund. *"Everything on this boat is guaranteed until it leaves this boat."* And: *"You want clean hands, see the Sister. You want a clean rifle, that's eight stones."*
- **Papa Static**: Radio Free Amaranth, one man and a car battery.

### The radio (vehicle radio, random order; write 20 more)

- "Fish prices, Port Clement, this morning. Perch: none. Carp: none. Sturgeon: there is a man who remembers one."
- "Weather: dry. The Authority reminds you the weather is temporary. The Front reminds you the Authority is."
- "To the gentleman who keeps setting fire to the Tannery road. Your mother has asked me to say something and I told her I would not."
- "The ceasefire enters its ninth month. It has killed more people than the war. We wish it well."
- "This is the shipping forecast. There is no shipping. Good night."

### Barks (gibberish with subtitle; write 8 per faction)

- **Authority:** "Contact. File it later." / "The ceasefire is in effect! Fire!" / "Who authorised that?"
- **Front:** "Subtract him!" / "Carry the two, comrade!" / "Burn it! Burn it all!"
- **Wounded:** "Not like this. Not in triplicate." / "Tell them I was at the school."
- **Buddy rescuing you:** "Up. Not dead. Not yet, anyway. You owe me a drink you'll never buy." / "Stop bleeding on my boots."

### Contracts (table `CONTRACTS`; an order the player mostly can't break)

Each record: `{ id, title, giver, faction, brief: [...lines], papers, steps: [...], alt, pay, after }`. Step kinds: `goto`, `talk`, `kill`, `take`, `deliver`, `ignite`, `destroy`, `hold`, `drive`, `read`, `choice`, `script`. Each step has a `bot` hint so the playthrough bot and attract mode can do it. Current step's target drives the pencil circle and the locator.

| # | Title (giver) | What happens | Teaches | Alt-plan and its twist | Pays |
|---|---|---|---|---|---|
| P0 | Terms of Engagement (letter) | See below. | Look, walk, fire, jam, fit | none | none |
| P1 | Transit Papers (Sister Perpetua) | Drive the clinic jeep from Saint Odile's through G3 on the clinic's pass, give a satchel to "the woman with one shoe" in the Salt Shed camp. Meet Best Buddy at the Shed. Claim it. Sleep. | Map, watch, jeep, papers, bed, save | none | 2 ampoules |
| C1 | Arrears (Dray, Authority, Kilometre Nine) | Kill the Front's paymaster at Station Four. Take his ledger back to Dray. | Monocular, tagging, night stealth, crate, first visit to Mr. Sunday | **Best Buddy:** take the cashbox under the pump too. Twist: an alarm; Best Buddy comes to help, gets pinned, goes down: your first rescue-or-mercy choice. | 6, +6 |
| C2 | Long Division (Sell, Front, Red Steps) | Three water trucks cross the Causeway at dusk. "Three minus three." Technical escort. Fire in the verge reeds is allowed. | Vehicle combat, RPG, mounted gun, patrol AI | **Second:** keep one truck. Twist: it's shot to pieces; drive it to Red Steps with black smoke, repair it under fire, and find the cargo isn't water. It's rifles. Both sides' stencils. | 8, +4 |
| C3 | Exit Visas (Sister Perpetua) | At night, go to the hull of the *Saint Brendan* at the Fleet, take forged visas from a smuggler, then return by airboat across the Remnant and through the Reeds. A patrol's flare lights the reeds behind you. The locator leads to a hidden case on the way. | Airboat, locator, night, outrunning fire | none | 4 ampoules (3 if `tentsBurned` or a civilian died) |
| C4 | Fire Season (Renn, Authority, sent via Dray) | She supplies a worn Gardener (not an unlock). Burn Reed Camp from upwind. Mid-job the wind swings to blow north-east, straight at the Salt Shed camp, whose tents stand on dry sedge that joins the Reeds. Sister calls: "Whatever you lit, it's coming to us." You can leave it, or back-burn a strip across the sedge before it arrives. The tents burn or don't (`tentsBurned`) and everyone mentions it. | Fire as a weapon, back-burning, consequence | none | 10 |
| C5 | Remainder (Sell, Front) | Kill Colonel Renn on the Customs House steps at the treaty signing in Port Clement. Sell hands you a worn Curate for a long shot from the old harbour wall, or walk in on Authority papers with a bomb in a case. Then the town burns: scripted ignition at three points, militia both ways. Get out. Mr. Sunday moves his stock to a hulk at the Fleet. Two more posts appear. The mask keeps Port Clement black. **End of Act II.** | Sniping, papers, big fire set piece | **Third:** Third plants the bomb while you cover. Twist: Third is caught in the blast radius (rescue-or-mercy in a burning street). | 14, +6 |
| C6 | Soundings (Tarn, by locator) | "This is the woman you came to kill." Read any 3 of 8 survey stakes (below; ones already found count). Then the road to the Sill opens on the map. Finding all 8 changes one line at the end. | Collectibles that matter, exploring the scorched map | none | none |
| C7 | The Last Reconciliation (Best Buddy) | "Drink at the Shed. All of us. We've been talking." Every surviving buddy is there. "Meridian doubled it. You'd do the same. You have done the same." They attack: 200 HP, good guns, they rescue each other, and the shed's perimeter is lit. If none survive, Cray's men do it instead and Best Buddy's empty chair gets one line from Sunday. | Fire, everything, and paying for pillar 4 | none | their stones |
| F | The Sill | Canyon road, both armies climbing it, fire behind you. Top of the dam: the control house. Tarn, dying in a chair. | Everything | none | endings |

**P0, opening (your hands bound, in first person):**
1. Black. A typed letter on screen with voice: "Terms of engagement. You will locate and remove the engineer I. Tarn. Fee on completion: two hundred stones. Meridian Water Consortium regrets it cannot be reached. A. Cray."
2. You sit in the bed of a Front pickup at dusk on the ring road, wrists tied, a boy with a rifle opposite, radio playing fish prices. Look around only.
3. A Provisional gun truck ambushes it. The truck rolls. You crawl out with wrists cut free. The boy, dying, shoves a rusty Verger at you.
4. The grass is alight and the wind is on your back. Prompt, in the writing: *Run into the black.* Run through the flame line onto burnt ground.
5. Two soldiers. The Verger jams on the second shot. Clear prompt.
6. Your first fit comes as you win. You go down.
7. Wake on a cot at Saint Odile's in the morning, Sister Perpetua over you: "You were on the road when the grass went. That makes you lucky or stupid, and you don't look lucky." / "That cough is the seabed. It doesn't leave. These will hold it off. There are never enough of these." / "Take the jeep to the Salt Shed. Give the satchel to the woman with one shoe. Bring back the jeep, if it's still a jeep."

**Briefs to use:**
- **Dray (C1):** "A man at Station Four collects a water levy on water that isn't there. Close his account. Bring me his ledger." / "You'll be paid on completion, less handling."
- **Best Buddy's call (C1):** "You're doing Dray's man at Four? He keeps a cashbox under the pump. Nothing will go wrong. I said that out loud, didn't I."
- **Sell (C2):** "Sit. We'll do this the way I did it with the eight-year-olds." / "Three water trucks come over the Causeway at dusk. Three minus three." / "Show your work."
- **Sister (C3):** "There's a man in the hull of the *Saint Brendan* who forges exit visas. I don't ask how he eats." / "Go at night. Come back across the Reeds. The posts can't see through reeds, and neither can God."
- **Renn (C4):** "The Front keeps a camp in the Reeds. The wind is out of the west until noon. I have it in writing." / "There are some tents downwind. They've been notified." (They haven't.)
- **Sell (C5):** "Colonel Renn signs the water treaty on the Customs House steps on Thursday. She has a very good pen." / "Take away the pen. Take away the hand." / "The remainder is yours to keep."
- **Sunday after C5:** "Port Clement is closed for stocktaking."
- **Tarn (C6):** "This is the woman you came to kill. I've had your passport for a week. You have a bad photograph and one lung." / "I left my readings in the basin, stake by stake. Read three. Then come up to the Sill and tell me I'm wrong."

### The Soundings (eight survey stakes across the basin, each a tin box on a tripod)

Picking one up raises a logbook page in your hands (like the map; you can still be shot) and plays Tarn's voice. Place them so that finding them means seeing the whole map, including one deep in the Reeds and one in the *Saint Brendan*.

1. "1958, Station A. Forty-one metres. We came in on the spring tide with the Minister's wife on deck, and she asked me if it had a bottom. I said, madam, everything does."
2. "1963. Thirty-eight metres. The cotton scheme took the river this year. They gave me a medal. Water doesn't read the citation."
3. "1971. Twenty-six. The fishermen have started tying their boats longer. Nobody has told them why. I was asked not to."
4. "1979. Eleven. Port Clement's quay now ends in mud at low water. The Harbourmaster asked whether I could do something. I told him I already had."
5. "1986. Four. The fleet sat down on the bottom this winter, one hull at a time. It was very quiet. You could hear the radios still playing the fish prices."
6. "1991. Zero. I walked to Station A with the lead line anyway. I stood on the place I'd measured and dropped the lead on my foot. That's a joke. Write it down."
7. "1998. The dust. They call it the rasp. My own lungs are at eleven metres and falling."
8. "Last sounding. I have sold rifles to both sides for nine years so neither will have men left to hold the Sill. When it is unguarded someone will open it. If you are reading this, it's you. I'm sorry. No. I'm not. Bring your own pencil."

### The Sill and the endings

Tarn in the control house, a cigarette she can't lift: "Forty-one metres. That's what it was. There's a wheel behind me. It wants two hands, and I have a bad heart and a worse character." / "The Sister's column is on the Causeway. It needs six minutes. Both armies are coming up the road. You might manage one of those." / "Or there's Mr. Cray's helicopter. He's very punctual." Then a choice of three.

The flood is one water plane (A5) rising over the basin. Hold it low until the gates open. Then let the plane climb from below the seabed to the Causeway's height in about 90 s. Cells under water turn wet with steam where they were burning, so fire and water meet in front of you. From the dam top you can see the whole country go. It costs almost nothing and it's the best shot in the game. Build it well.

- **The Contract** (take the helicopter): Cray hands you the stones, and you fly out, first person, over the burn scars. "Cray pays in full. From the air the grass is still burning in the shape of your route." Radio: "Fish prices, Port Clement. None. None. None."
- **The Arithmetic** (open now): both hands on the wheel, hold R2 + L2 (both mouse buttons). "The water goes through the Causeway at eleven minutes past. The Authority's column goes under, and the Front's, and the other one. Sister Perpetua's count stops at four hundred and six. You stay on the wheel. Somebody should have done the sum."
- **The Sounding** (hold six minutes, then open): a timed defence of the dam top against both armies, with the canyon burning and a fit waiting for you. The radio counts the column across, in Papa Static's voice. Then the wheel. Water rises to the control house window and the picture goes white. "Six minutes. Then the wheel. The column clears the east shore with nineteen seconds left. Nobody ever finds out who held it." Then one typed line, alone: "Station A. Forty-one metres."

Finding all 8 Soundings adds Tarn's last words before the choice: "You read them all. Nobody reads them all. Then you know what it's for."

Credits roll over the water. Then return to the title. A finished save offers "New Game" and, on Continue, lets you replay from the Sill.

---

## 10. Money, safe houses, saves

- **Stones** (uncut diamonds) are the only money. Pay comes from contracts. 12 hidden cases hold 2-5 stones each: on hulks, in the Reeds, at wrecks, in a burnt farm. The locator finds them. Bodies don't carry stones.
- **Mr. Sunday's boat:** a visit is a big, simple screen (section 11): his catalogue, one gun at a time. Buying unlocks that gun at every crate. He sells guns and throwables, nothing else.
- **Safe houses** (Salt Shed, the Lamp, the Tannery, the Water Tower): hostile until cleared or claimed; each has a bed, a weapon crate, a buddy's chair. **Bed:** watch dial on screen, pick an hour with the stick or mouse (the dial is big), sleep: fade, time jumps, posts may refill, ash regrows a little, blood cleans off the gloves, autosave. Fits can't happen in bed.
- **Saves:** `game.saves` with `menu: { saves: { version: 1, ... } }`. `saves.canSave` is true only near a bed. Autosave on sleep and on contract completion. The title's Continue uses `saves.latest()`. Save data: player, inventory with each gun's `cond`, ampoules, stones, flags, contract state, buddy states, post states, `lung`, hour, wind, Soundings found, and the burn mask (RLE, base64). No saves in a hub session.

---

## 11. Screens and 10-foot UX

**Rules from TASK.md.** Designed for a DualSense on a TV at ten feet; keyboard and mouse feel native on the same screens. No dense web-style screens: at most 6 rows or one big card at a time. Prompts follow the last device. PlayStation glyphs by default, an Xbox option in Settings (A7, VERIFIED). Mouse hover moves focus and click picks, on every menu; release pointer lock when one opens (`document.exitPointerLock()`) and capture again on the next click. In the world, the mouse aims and fires; on things your hands hold (map, logbook, Sunday's card, the watch dial), left click acts on what's under the pencil or cursor.

**HUD (`r.overlay` in the kit's pixel font at `res: 'ps1', expand: true`):** at 1080p one game pixel is 4.5 screen pixels, so scale 1 text is 31 px tall and reads from the couch. Show almost nothing:
- Bottom left: 5 health segments, syrette count as small tubes.
- Bottom right: ammo count and gun name, fading after 3 s of no shooting; the condition mark below .4.
- Centre: a small dot, not a big crosshair. It grows a little with spread.
- Damage arrows at the screen's edge (the kit's `hitDirs`). Red and white veils for damage and fits.
- Bottom centre: one context prompt at a time: glyph chip + verb ("□ Repair", "E Sleep").
- Lower third: subtitles with coloured speaker names (`E.Dialog`, `{ modal: false, auto }` for radio).
- A new objective shows as one line for 4 s. After that it's only on the map.

No compass, minimap, ammo bars or kill feed. In first play, teach each control once when first needed, using the same chip prompts.

**Title screen.** The one world, fixed camera, dusk, at the edge of a slow grass fire with the Lamp's beam in the distance. Game title in `E.font.title`, then `E.Menu`: Continue, New Game, Salvage Rights (section 13), Settings, About. After **10 s without input** start attract mode.

**Merc select.** Four passports laid out; one big at a time, left and right to browse, hover to focus. Photo (draw a head close-up with the pen on an overlay or a `Humanoid` `drawPortrait`), name, one line, one perk. Confirm stamps it.

**Mr. Sunday's catalogue, watch dial, logbook page, contract brief:** each a single large card. Gun cards show the first-person gun model turning on the overlay pen, name, Sunday's one-line patter, cost. Left and right to browse, ✕ or click to buy.

**Pause menu.** Use the engine's: Resume, Dev mode, About, Save (near a bed), Load, Settings, Controls, Full screen, Quit to title. `menu: { items: [['Dev mode', fn], ['About', fn]], settings, controls, saves }`. VERIFIED: these appear and click correctly. Add the CSS in A7 so it's TV-sized. In a hub session: `quit: false`, no Dev, no saves.

**Dev mode (TASK.md: reachable from pause, standard tools, live sliders, reset).** A panel of your own drawn with the pixel font. Its pause-menu item resumes play with the panel open, and input goes to the panel while it's up, so the world runs underneath and sliders show their effect at once. D-pad or mouse to select, left/right or drag to adjust, ✕ or click to toggle. Three tabs of at most 8 rows.

- **Balance (live sliders, with Reset to defaults):** `fireSpread`, `wind`, `wear`, `jam`, `enemyAccuracy`, `enemyDamage`, `enemySight`, `playerDamage`, `lung`, `rescueChance`, `postRespawn`, `carTop`, `dayLength`. All read from one `TUNE` table next to `TUNE_DEFAULTS`.
- **Cheats:** god mode, infinite ammo, no clip, no fits, no jams, freeze AI, reveal map, all guns, +50 stones, refill.
- **World:** teleport to any site, skip to contract N, complete objective, set hour, set wind, start dust storm, ignite here, spawn squad, force a fit, force a rescue, force a jam, flood level, show fire cells, show AI state labels, show frame stats (`world.stats`), log player position to console. That last one is the level designer's tool: pair it with the `SITES` table.

**About / Credits (from pause and title).** Big text in the engine's HTML shell: `const ui = new E.Shell(game, {})` keeps the standard menu, and `ui.show('help', { sections: [[heading, text], ...] })` shows it (VERIFIED with CSS zoom, mouse click and long text). Contents exactly as TASK.md lists: Source Information, Testing Feedback, Engine Feedback, Prompt Feedback, plus library credits (my-3D2dge MIT, three.js r182 MIT, Rapier 0.19.3 Apache-2.0, any CC0 store props used). Fill it from `exit-interview.json` via `window.__answers` (A1), so the two can't disagree. See section 15 for ordering. **Trap:** the Shell focuses Back, which scrolls the panel (`.esh-mod`) to the bottom. Set its `scrollTop = 0` after opening, and each step move `scrollTop` from the sticks and d-pad, so a controller can read the whole thing. Test it.

**Attract mode (TASK.md).** After 10 s idle on the title and its menu, a looping AI-played demo in the real game, using the one world, cheats freely, saving nothing. It's the `Bot` (section 14) running a fixed reel of 8 vignettes, 10-15 s each, teleporting between them with a dither cut:
1. Jeep at dusk along the Causeway past the Fleet, radio subtitles.
2. Monocular sweep over a guard post, tagging.
3. Firefight, the gun jams, it's cleared.
4. Gardener lights the grass, wind takes it, soldiers run burning.
5. Map in hand, locator beeping, a case found.
6. Going down, buddy drags you out, surgery.
7. Airboat through burning reeds at night.
8. Dawn at the Lamp, the flood for a moment, title card.

A small "DEMO" tag and the prompt to press anything. Music at its normal setting. The reel loops until **any input** (key, mouse move or click, pad button or stick, touch), which returns to the title at once with state reset. Back on the title, the 10 s clock starts again.

**Touch-only devices (TASK.md).** `new E.Game({ touch: 'never' })`. VERIFIED: phones show "Controller or keyboard required" with a Settings button. No touch controls. The notice's opaque backdrop would hide the attract mode: use the CSS in A7. Attract mode must start and loop there too: the idle clock doesn't need input.

---

## 12. Sound (all generated; no audio files)

**Settings:** music defaults to 10% (`{ key: 'music', value: .1 }`, VERIFIED: `audio.musicVolume` reads .1 after boot).

**Music** (original; the engine's song format, `audio.music(song, { fade })`, with `layer` for intensity). Spare, dry, sun-struck. Plucked low strings over a drone, hand drums, long silences; nothing heroic.
- Build a plucked-string voice: render Karplus-Strong once into an `AudioBuffer` at boot (plain JS loop, no files), and play it on `audio.bus('music')` at varying `playbackRate`, scheduled from `audio.onBeat` or `audio.pos`.
- **Themes:** Title "Dry Season" (slow 6/8, D minor pentatonic: `D3 - - A3 - - C4 - - D4 - - | F4 - D4 - C4 - A3 - - - - -`, extend it); Explore (mostly silent: a phrase every 40-90 s, different by hour); Tension (a drone and a heartbeat drum when soldiers are alerted); Combat (hand drums and a bass ostinato, layered in and out with alert level); Fire (a rising metallic drone tied to distance from the front); Finale (all of it, and then nothing).

**Effects.** Start from the kit's `SOUNDS`. Add a distinct gunshot per weapon (layered noise and sub thump, with a delayed quiet echo by distance), jam clunk, rack, syrette hiss, pliers squelch, knife, lighter flick, finger snap, map rustle, locator beep, watch tick, bottle smash, flare pop, flamethrower roar, tank hiss, machete, cough set (at least 4), breath catch, footsteps per biome (salt crunch, ash whisper, reed rustle, boardwalk).

**Loops** (your own nodes on `audio.bus('sfx')`, with gain and `StereoPanner`): engine (saw and noise, rate from speed, a stutter when damaged), airboat fan, fire crackle and roar, wind by strength, cicadas at dusk, night insects, far-off gunfire now and then, helicopter. Sound position is manual: gain from distance, pan from bearing.

**Voices (Animalese/Simlish style).** `new E.Dialog(game, { voice: (ch, i, talk) => babble(ch, talk.name) })` (the engine calls this per letter).
- `babble`: a saw at the speaker's f0 (with a tiny wobble) through two bandpass filters set by the letter's vowel class, a 60-90 ms envelope; consonants add a 12 ms noise tick. Connect to `audio.bus('voice')`.
- Per-speaker table: f0, rate, formant shift: Tarn low and slow with a rasp of noise, Sister flat and quick, Sell precise, Sunday bright, Dray nasal.
- Radio voices (Papa Static, buddies' calls) add a 600-2400 Hz band filter and light clipping. Soldier barks use the same voice on short nonsense.
- Everyone speaks gibberish. Everything is subtitled.

Rumble: `input.rumble` on shots, blasts, fits and crashes.

---

## 13. Multiplayer: "Salvage Rights"

Follow the AI Hub Session Protocol v1 (`https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub`, the README's content is your contract). The hub runs lobby, seats, network, clock and scoreboard. You write the round.

**Mode:** `shared-world`, 1-4 players, about 6 minutes.

```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="6">
<meta name="hub:session-goal" content="Bank the most diamonds before the fire takes the Fleet">
<meta name="hub:session-howto" content="Stick or WASD move, R2 or click fire, L2 or right click aim, Square or E use">
```

**The round.**
- Dusk. Play area: a circle r = 400 m around (980, 1320): Reed Camp, the Remnant, the Fleet, the Salt Shed.
- Every merc drops at a seeded spot with a Verger and a machete, around 12 diamond cases (seeded spots: hulks, tents, wrecks), with locators on, and Front militia in hulks and tents. Worn guns lie around (they jam like everyone's). Two pickups and an airboat.
- At 0:30 the upwind edge is lit in three places with wind toward the centre and `fireSpread` ×1.6, so the front crosses the area in about 5.5 minutes.
- Carry stones to the **Ferryman's truck** at the Salt Shed (on the salt, which doesn't burn). Hold use 3 s to bank.
- If you die: 8 s out, respawn at a safe spot, your carried stones stay on the ground as a case. No buddy rescue here. Players can shoot each other.
- Ends at 6:00 or `time-up`. The host calls `AIHub.finish({ standings, scores, stats, awards })`, ranked by stones banked. Awards: *Arsonist* (most cells lit), *Last Clean Gun* (fewest jams), *Harbourmaster* (most stones).

**On its own (outside a hub):** `AIHub.connect` is not called, `AIHub.active` is false, and the game plays exactly as designed. Salvage Rights is on the title menu with three AI mercs as rivals (soldier AI with goals: nearest case, then the truck; flee fire; shoot whoever's close), through the same code with a no-op network layer. So the mode exists both ways. (Stretch: `game.splitScreen(2)` on one screen for a second local pad, using `world.addCamera`.)

**Architecture.** The host's copy runs AI, fire, cases and the score. It's the same sim as single player with `players[]` instead of one hero. Every copy builds the same terrain and structures from constants.

Keep it simple and it will feel lag-free:

| Direction | Message | Reliable | Rate |
|---|---|---|---|
| client → host | `{t:'i', x,y,z, yw,pt, a}`: own feet (ints), look (×1000), action bits, vehicle id | no | 15/s |
| client → host | `{t:'f', w, o:[x,y,z], d:[dx,dy,dz], n}`: shots merged | yes | ≤4/s |
| client → host | `{t:'u', id}` use; `{t:'ig', x,y,r}` ignite request | yes | on event |
| host → all | `{t:'s', at, P:[...], E:[...], V:[...]}`: snapshot, flat int arrays, soldiers within 300 m of any player, keep under 1,100 bytes (split by kind if not) | no | 12/s |
| host → all | `{t:'e', L:[...]}`: batched events: tracers, impacts, damage to you, deaths, pickups, bank, newly lit cells | yes | 4/s |

- Staying under 20 messages a second per copy is your job: the client silently drops the rest.
- **Own movement is client-authoritative** (no anti-cheat is asked for, and it means no input lag). The host mirrors each client's hero with `place` so rays hit it. A driven vehicle's owner simulates it and reports it; the host owns unoccupied ones.
- **The host casts all shots** with `world.ray` and applies damage. A client shows its own flash and tracer at once.
- **Fire on clients:** apply lit cells from events; burn-out and flames run locally. Cells are just `(index)` and a client-side timer.
- **Interpolate** others 100 ms behind using `at`. Clients draw soldiers from snapshots: `e.a` can be a plain object, since `syncRaider` only reads it.
- **Names and colours** come from the hub: name tags with `world.project` and `E.font.text` (canvas, never HTML), an armband in seat colour (`LOOKS.accent`).
- **Time** in a round is `AIHub.time()`, not game time. Before 0 show a big 3-2-1 and hold players still. The kit's frame cap slows game time on slow machines but must not extend the round.
- **`leave`:** remove that hero and drop their stones. **`end`:** `game.stop()`, mute, ignore input.
- **`AIHub.server`** (a host with no player): VERIFIED by replacing the scene's `draw` with a no-op. No hero, no camera, no input.
- In a session: no title, menus or attract; `live: true`, `autoPause: false`, `quit: false`; no saves. Storage is memory.
- Don't declare `hub:webgpu`; the game runs on either backend. If World3D can't start at all in a session, call `AIHub.fail(message)`.
- Create + Options belongs to the hub: don't bind Create (`Pad8`).
- Standard card: the hub's. (Stretch: `card: true` with your own card; it must obey the README's "The card" section, including Enter = Ready.)

**The boot order is the trap (VERIFIED).** The harness waits at most 20 s for every copy's `ready()`, and it runs up to 4 copies on one main thread. The kit's full boot, with `ready()` after the title stage and shader warm-up, took **20.8 s and failed** at 4 players. With `connect()` in an inline script straight after the client, no title world, and `ready()` before the warm-up, **all scenarios passed**: 1, 2 and 4 players, `host-leave`, `server`, at 150 ms latency, 50 jitter, 5% loss. Appendix A1 and A6, followed literally on the kit, passed all five harness runs. Keep that order as your boot grows, and test it (section 14). Keep `planLand` and world build under about 1 s per copy; anything heavier goes after `ready()`.

---

## 14. Testing

TASK.md's rules: one command, prints only failures and a one-line count, rerun only after changing what it covers, screenshots only for what a script can't check, no subagents or workflows to debate, review, judge or audit. Keep a tally of issues caught in `test/ISSUES.md`: the exit interview asks for the numbers.

**Command:** `python3 test/run.py` (system Python has Playwright 1.63; no `playwright install`; keep one or two browsers open; "Target closed" means memory ran out, not a bug).

**The fast rig (VERIFIED).** Open the built file from `file://` with `?norender=1`, which boots `W3.init(game, { render: false })`. It boots in .45 s with no GPU work, and `game.advance(60)` runs 60 game seconds in 1.4 s, about 44× real time, with the same `world.hash()` as with a renderer. Call `game.stop()` first so only your `advance` steps run. Scripted input works: `game.input.hold('up')`, `game.input.tap('fire')`, `hold('up', false)`. Everything else about the world works without a renderer (rays, ground, vehicles). Expose `game.debug = { snapshot(), teleport(x, y, z) }`, plus `window.__game` with `S`, `world`, `Fire`, `Contracts`, `Dev`, `Bot`.

**Tests to have (each a small in-page function returning problems):**
1. Boot, no errors, title shows, music setting .1, glyphs `playstation`.
2. Replay proof: same `run(n)` hash twice.
3. Fire: spreads faster downwind than upwind, stops at road and salt, ash doesn't re-ignite, a burning actor takes damage, mask values change; save and load round-trips the mask.
4. Wear: `cond` falls per shot, jam happens at low `cond` under a fixed seed, clear works, break empties the slot.
5. Health and surgery: segments refill only to the top; syrette; surgery at the last segment; rasp fit at 100; ampoule ends it; second fit without one blacks out.
6. Vehicles: enter, exit, drive to speed on road, slower on mud, crash damage, stall under 20%, repair, wreck burns.
7. Papers: a post waves you through with papers; burns them when you fire; hostile without.
8. Buddies: rescue fires at 0 HP; cooldown; buddy down, syrette; buddy down, mercy; dead stays dead through save and load.
9. Contracts: every contract's steps complete under `Bot`; `tentsBurned` and the other flags reach their lines.
10. **Scripted playthrough of the whole game:** `Bot.playthrough()` from New Game through all contracts and each of the three endings, with god mode and teleports allowed between sites but real input to act: aim and fire, throw, drive short legs, use. Asserts each contract's completion and each ending. Keep under about 3 minutes.
11. Attract: starts at 10 s idle, shows at least 8 vignettes, loops; each of key, mouse, pad button and stick exits it; save data untouched.
12. Input: the stub gamepad in A8 reads `R2`; a key press flips prompts to keys; a mouse move to `Left click`; Settings Xbox flips to `RT`.
13. Dev mode: every slider changes its `TUNE` value and the effect; Reset restores defaults; every cheat toggles.
14. Audio: build one `OfflineAudioContext` render of the babble and one gunshot: non-silent, no NaN. `AnalyserNode` on the music bus at default is quieter than effects.
15. Phone (Playwright `iPhone 13` profile): the notice shows, Settings opens, no touch buttons, attract runs.
16. **Hub (A8):** copy the build to `hub/game.html`, serve `hub/` on a port the OS picks, and run `harness.html?game=game.html&players=N&latency=150&jitter=50&loss=5&auto=1&scenario=S&play=8000` for (1, standard), (2, standard), (4, standard), (4, host-leave), (2, server). Pass when `window.__hubCheck.pass`. Stop the server by its PID. Also play a real two-page round through the harness once with `render` on, and check both see each other's stones.
17. WebGPU smoke once at the end: Appendix A9's flags and stand-in canvas. No page errors, `My3D2dge.World3D.backend === 'WebGPU'`, same replay hash as WebGL 2.

**Screenshots** at 1920×1080 with the renderer on, only for what scripts can't judge: title, noon, dusk, night, fire front, ash, held map, a soldier's face at 2 m, a jeep, a hulk, the Lamp at night, Sunday's card, pause, Dev panel, the flood. Run at about 4.5 fps here, so set state, wait for a few frames, shoot. Fix what looks wrong; don't re-shoot what hasn't changed.

---

## 15. Build order

Work in order. Each milestone ends with the game running and the test command passing. Don't start the next with the last one broken.

| # | Milestone | Done when |
|---|---|---|
| M0 | Setup: pieces, `build.mjs`, the kit running from `file://` as one file, `test/run.py` with tests 1-2, fast rig. | One-file build boots; `?norender=1` hash stable. |
| M1 | Land: bowl terrain, biomes, sites, roads, scatter, hulks, the Lamp, the Sill. Time of day, wind. Remove kit HUD clutter. | Walk and fly (no clip) the whole map; screenshots at noon, dusk, night. |
| M2 | Player: remove shields, slide, zip, climb, third person. New controls. Health and syrette. Weapons table, wear, jam, break. Machete, throwables. | Tests 4, 5 (part). |
| M3 | **Fire (the signature, get it right first):** cells, mask, flames, smoke, spread, igniters, actors, AI flight, sound. | Test 3; the fire screenshots look dangerous. |
| M4 | Hands: map, locator, monocular, surgery, rasp, repair; dash and steering hands. | Test 5; each tool raises, works and lowers with a sound. |
| M5 | Vehicles: jeep, technical, truck, airboat, seat, damage, repair, convoys, radio. | Test 6. |
| M6 | People: looks and faces, barks, wounded, flanking, posts and papers, civilians. Buddies: rescue both ways, permadeath. | Tests 7, 8. |
| M7 | Story: contract runner, every contract and text, alt-plans, Soundings, saves, safe houses, Sunday, endings, flood. | Tests 9, 10. A full play by bot. |
| M8 | Screens: title, merc select, HUD pass, pause items, TV CSS, Dev mode, About, attract, phone notice. | Tests 11, 12, 13, 15. |
| M9 | Multiplayer: net layer, `players[]`, Salvage Rights, AI rivals on its own, session path. | Test 16 at all five settings. |
| M10 | Sound pass: music, loops, voices, mix. Polish pass: fix the worst thing seen in screenshots until no obvious one is left. | Test 14. |
| M11 | Finish (below). | Done list. |

**If you run short, cut in this order, whole:** animals; the airboat (C3 becomes a walk through the Reeds, Salvage goes without it); alt-plans for C2, then C5; the Water Tower safe house. **Never cut:** fire, wear and jam, the held map, the rasp, buddy rescue both ways, papers, the Sill and its endings, Salvage Rights through the harness, attract, Dev mode, About.

### Finish

1. Pick nothing new. Remove debug prints; check no TODO, placeholder or stub text remains (grep for it).
2. Write `exit-interview.json` beside the deliverable, in exactly TASK.md's shape; validate with `python3 -m json.tool`. Suggested catalogue values: tagline "Everything wears out."; description "A mercenary with a ruined lung works both sides of a burned-out republic on a dead inland sea. Fire spreads, guns jam, and friends die for good."; type Game; genre Shooter; source Far Cry 2; series Far Cry; players 1-4; controls "Stick or WASD move, stick or mouse look, R2 or click fire, L2 or right click aim, Square or E use"; tags `3d`, `first-person`, `vehicles`, `exploration`, `story`, `versus`. Tech field: my-3D2dge v0.88.0 with its World3D add-on, three.js r182, Rapier 0.19.3, bundled with esbuild. Plan field: this plan's file name. Testing Feedback comes from `test/ISSUES.md`, Engine Feedback partly from `ENGINE-CHANGES.md`.
3. Rebuild, so the About screen carries those answers (`build.mjs` inlines the JSON). Rerun the tests once on the final file.
4. Put Source Information, Testing Feedback, Engine Feedback and Prompt Feedback in your chat reply too, as TASK.md says. Usage: "added on import".
5. Delete `engine-repo/` and scratch output. Stop any server by PID.

---

## 16. TASK.md coverage

| TASK.md asks for | Where |
|---|---|
| Original game inspired by the source; world, characters, themes, tone turned into mechanics and UX | 1, 3, 8, 9 |
| Genre and perspective chosen | 1 |
| Title: playful riff, chosen by real RNG | Your job, per TASK.md; header of this plan |
| Research | Done for you (engine, hub, source). Add your own if you want; report it honestly in Source Information. |
| Single HTML; dependencies | 2.2, A1 |
| Tech stack on the handoff, engine changes allowed | 2.1, 2.3, 2.4 |
| Art direction, new assets | 3, 7, 8 |
| Animation: native base, new animations | 4, 5, 8 (kit's procedural skeleton, overlay pen keyframes, no frame lists) |
| Audio in code, gibberish voices, music 10% | 12, A7 |
| Online via AI Hub, and on its own | 13 |
| Dev folder, bundle in root, no reading outside, ports and PIDs | 2.1, A8 |
| Performance unlimited, no FPS targets | Spend freely: raise `GRASS_R`, flame counts, `lights`, `glowLights`, soldiers at each post. Don't optimise. |
| Testing rules, full scripted playthrough | 14 |
| Computer constraints: stubs for pad, touch, audio, second player, phone, TV | 14, A8 |
| Feature-complete demo, polished slice, built out later with normal tools | 1 (length), 2.2 (data tables), 11 (Dev tools) |
| Dev mode from pause, tools, live sliders, reset | 11 |
| Attract mode at 10 s, looping, cheats, any input exits | 11 |
| Narrative tone | 9 |
| 10-foot, controller-first, native keyboard and mouse, hover focus, prompts, Xbox option | 4, 11, A7 |
| No dense data screens | 11 |
| Touch-only notice, settings, attract runs | 11, A7 |
| Done: no stubs | 15, Finish |
| About/Credits, chat reply, exit-interview.json | 11, 15 |

---

## Appendix A: verified recipes

All of this ran on the kit at commit `0a46310`. Adapt names; keep the logic.

### A1. Build script and page

```js
// build.mjs: run from the dev folder. Write the deliverable's name from TASK.md into OUT.
import { execFileSync } from 'node:child_process';
import { readFileSync as rd, writeFileSync as wr, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const OUT = '../REPLACE-WITH-THE-NAME-TASK-MD-GIVES.html', TITLE = 'YOUR TITLE', E3 = resolve('engine');
mkdirSync('out', { recursive: true });
wr('out/game.js', readdirSync('src').filter(f => f.endsWith('.js')).sort().map(f => rd('src/' + f, 'utf8')).join('\n'));
wr('out/entry.js', `import ${JSON.stringify(E3 + '/my-3d2dge-3d.js')};\nimport './game.js';\n`);
const three = E3 + '/three-0.182.0', rapier = E3 + '/rapier3d-simd-compat-0.19.3/rapier.js';
execFileSync('esbuild', ['out/entry.js', '--bundle', '--format=esm', '--minify', '--legal-comments=none', '--target=es2022',
  `--alias:three/webgpu=${three}/three.webgpu.min.js`, `--alias:three/tsl=${three}/three.tsl.min.js`, `--alias:three=${three}/three.webgpu.min.js`,
  `--alias:@dimforge/rapier3d-simd-compat=${rapier}`, '--outfile=out/bundle.js', '--log-level=warning'], { stdio: 'inherit' });
const esc = s => s.replace(/<\/script/gi, '<\\/script');                 // never touch the session client
const answers = existsSync('../exit-interview.json') ? rd('../exit-interview.json', 'utf8') : 'null';
const page = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<script>${rd('hub/session.js', 'utf8')}</script>
${rd('src/metas.html', 'utf8')}
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>${TITLE}</title>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#stage{position:relative;width:100%;height:100%;overflow:hidden;background:#000;touch-action:none}
#view{position:absolute;left:0;top:0;display:block;pointer-events:none;z-index:0}
#screen{position:absolute;inset:0;width:100%;height:100%;display:block;image-rendering:pixelated;z-index:1;background:transparent}
${rd('src/page.css', 'utf8')}</style>
<script>window.__answers=${esc(answers)};if(AIHub.active)window.__hub=AIHub.connect({mode:'shared-world',seats:[1,4]});</script>
</head><body><div id="stage"><canvas id="view"></canvas><canvas id="screen"></canvas></div>
<script>${esc(rd('engine/my-3d2dge.js', 'utf8'))}</script>
<script type="module">${esc(rd('out/bundle.js', 'utf8'))}</script></body></html>`;
wr(OUT, page);
```
VERIFIED as written (with those two constants filled in): 4.83 MB, boots from `file://`. The session client must stay the first script after the charset, byte for byte: the hub replaces and checks it.

### A2. A thing held in the hand: map, logbook, shop card, locator face

Make once in a boot step. The overlay camera sits at the origin looking along three's +x, in metres.

```js
const T = E.THREE, cv = document.createElement('canvas'); cv.width = 1024; cv.height = 768;
const g = cv.getContext('2d'), tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
const mat = new T.MeshBasicNodeMaterial({ map: tex, side: T.DoubleSide, fog: false });
const mesh = new T.Mesh(new T.PlaneGeometry(4, 3), mat);
mesh.scale.setScalar(.145); mesh.position.set(.5, -.09, 0); mesh.rotation.set(0, -Math.PI / 2, 0, 'YXZ'); mesh.rotateX(-.42);
world.overlay.scene.add(mesh); mesh.visible = false;   // (prepare() warms hidden overlay meshes too)
// redraw: paint on g, then tex.needsUpdate = true (at most about 4 times a second while raised)
```
Bake the terrain to an offscreen canvas once: 256² samples of biome colour plus contour lines every 8 m from `height()`. Each redraw is `drawImage` plus pencil marks. Animate `position` and tilt with the raise. Draw arms and hands around it with `overlay.pen`. Use a real serif or sans font in the 2D canvas for the map (it's a printed object); the pixel font is for the HUD.

### A3. Time of day

The dome bakes its colours, so replace its colour node with uniforms once, in a boot step. Then call `setHour(h)` whenever the hour changes.

```js
const { positionLocal, uniform, mix, pow, dot, max, vec3, float, clamp, smoothstep } = E.TSL, T = E.THREE;
const dir = positionLocal.normalize(), y = dir.y;
const U = { top: uniform(new T.Color()), hor: uniform(new T.Color()), gnd: uniform(new T.Color()), sun: uniform(new T.Vector3(0, 1, 0)), sunC: uniform(new T.Color('#fff0c8')) };
let col = mix(mix(U.hor, U.gnd, clamp(y.negate().mul(4), 0, 1)), mix(U.hor, U.top, pow(clamp(y, 0, 1), float(.55))), smoothstep(float(-.01), float(.01), y));
const c = max(dot(dir, U.sun), 0);
col = col.add(U.sunC.mul(smoothstep(float(.9985), float(.9992), c).mul(1.6).add(pow(c, float(40)).mul(.45))));
world._skyDome.material.colorNode = vec3(col); world._skyDome.material.needsUpdate = true;

// hour, sun colour, sun power, ambient sky, ambient ground, ambient power, sky top, horizon, below horizon, fog
const KF = [
 [0,   '#8aa4e0',.85,'#3a4a86','#1a2030',1.15,'#060b1c','#1a2848','#0a0e18','#16223c'],
 [5,   '#8a94d0',.8, '#3c4a80','#1c2030',1.1, '#0c1434','#34405c','#0e1220','#262f4a'],
 [6.5, '#ffb070',1.5,'#8a7a98','#54402e',1.05,'#3a5a98','#f6a868','#5a4436','#e0a070'],
 [9,   '#fff0d8',2.8,'#c4d4ee','#8a6a48',1.45,'#3d6fb8','#f2dcb4','#b49070','#ead4b0'],
 [15,  '#fff0d8',3.1,'#c4d4ee','#8a6a48',1.55,'#3d6fb8','#f2dcb4','#b49070','#ead4b0'],
 [18,  '#ff9a58',1.7,'#9a7f8e','#5a3f2c',1.1, '#3a4f90','#ff9a58','#5e4030','#d88a58'],
 [19.5,'#b0708a',.7, '#46447a','#201e2a',1.0, '#141a44','#7a4a60','#141218','#3a3048'],
 [21,  '#8aa4e0',.85,'#3a4a86','#1a2030',1.15,'#060b1c','#1a2848','#0a0e18','#16223c'],
 [24,  '#8aa4e0',.85,'#3a4a86','#1a2030',1.15,'#060b1c','#1a2848','#0a0e18','#16223c']];
function setHour(h) {
  h = ((h % 24) + 24) % 24; let i = 0; while (i < KF.length - 2 && h >= KF[i + 1][0]) i++;
  const a = KF[i], b = KF[i + 1], t = (h - a[0]) / (b[0] - a[0]), lc = (x, y, o) => o.set(x).lerp(new T.Color(y), t), n = (x, y) => x + (y - x) * t, w = world;
  lc(a[1], b[1], w._sun.color); w._sun.intensity = n(a[2], b[2]);
  lc(a[3], b[3], w._ambient.color); lc(a[4], b[4], w._ambient.groundColor); w._ambient.intensity = n(a[5], b[5]);
  lc(a[6], b[6], U.top.value); lc(a[7], b[7], U.hor.value); lc(a[8], b[8], U.gnd.value); w.scene.fog.color.set(a[9]).lerp(new T.Color(b[9]), t);
  const an = (h - 6) / 12 * Math.PI, day = h > 5.6 && h < 19.6, sx = day ? Math.cos(an) : -.35, sz = day ? Math.max(Math.sin(an), .12) : .7;
  w._sunDir.set(-sx, -sz, -.28).normalize(); U.sun.value.copy(w._sunDir).negate(); U.sunC.value.set(day ? '#fff0c8' : '#c8d4ff');   // (at night the "sun" is the moon)
}
```

### A4. Fire: mask, spread, flames, smoke

```js
// the mask: 512 x 512, 0 unburnt .. 255 ash. Cell (i, j) covers x = i * 64 units, y = j * 64 units (4 m)
const N = 512, CELL = 64, T = E.THREE, burnData = new Uint8Array(N * N);
const burnTex = new T.DataTexture(burnData, N, N, T.RedFormat, T.UnsignedByteType);
burnTex.magFilter = burnTex.minFilter = T.LinearFilter; burnTex.generateMipmaps = false; burnTex.needsUpdate = true;
// terrain: once, after the world is made
{ const { texture, positionWorld, vec3, mix } = E.TSL, m = world.terrain.mat, base = m.colorNode;
  m.colorNode = mix(base, vec3(.035, .03, .028), texture(burnTex, positionWorld.xz.div(2048)).r.mul(.95)); m.needsUpdate = true; }
// grass: inside grassMeshes(), where p = positionLocal and tip = attribute('tip', 'float')
const bn = E.TSL.texture(burnTex, p.xz.div(2048)).level(0).r;     // (a vertex-stage read: .level(0))
mat.positionNode = mat.positionNode.add(vec3(0, bn.mul(tip).mul(-.5), 0));
mat.colorNode = E.TSL.mix(attribute('color', 'vec3'), vec3(.02, .018, .016), bn);

// the spread: tick at 4 Hz inside step(dt)
const F = { state: new Uint8Array(N * N), t: new Float32Array(N * N), burning: [], acc: 0, rng: E.rng(7) };
function fireStep(dt) { F.acc += dt; let n = 0;
  while (F.acc >= .25) { F.acc -= .25; n++; const next = [];
    for (const k of F.burning) { const j = (k / N) | 0, i = k % N; F.t[k] -= .25;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { if (!di && !dj) continue;
        const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= N || b >= N) continue; const q = b * N + a; if (F.state[q]) continue;
        const l = Math.hypot(di, dj), w = (di * windX + dj * windY) / l, p = TUNE.fireSpread * .018 * fuelAt(a, b) * Math.exp(1.5 * w) / l;   // windX, windY: direction * strength
        if (F.rng() < p) { F.state[q] = 1; F.t[q] = 6 + F.rng() * 5; next.push(q); } }
      if (F.t[k] <= 0) { F.state[k] = 2; burnData[k] = 255; } else { burnData[k] = 170; next.push(k); } }
    F.burning = next; }
  if (n) burnTex.needsUpdate = true; }

// the flames: one merged mesh of quads in a boot step; TSL draws a licking teardrop from uv and time
const { attribute, uv, uniform, vec3, float, sin, smoothstep, mix, clamp } = E.TSL, MAX = 2400;
const fg = new T.BufferGeometry();
fg.setAttribute('position', new T.BufferAttribute(new Float32Array(MAX * 12), 3)); fg.setAttribute('normal', new T.BufferAttribute(new Float32Array(MAX * 12), 3));
fg.setAttribute('uv', new T.BufferAttribute(new Float32Array(MAX * 8), 2)); fg.setAttribute('seed', new T.BufferAttribute(new Float32Array(MAX * 4), 1));
const idx = new Uint32Array(MAX * 6); for (let k = 0; k < MAX; k++) idx.set([k * 4, k * 4 + 1, k * 4 + 2, k * 4, k * 4 + 2, k * 4 + 3], k * 6); fg.setIndex(new T.BufferAttribute(idx, 1));
const uT = uniform(0), seed = attribute('seed', 'float'), q = uv(), tt = uT.mul(2.6).add(seed.mul(13.7)), yy = q.y;
const wob = sin(yy.mul(7).sub(tt.mul(2.2))).mul(.11).add(sin(yy.mul(15).sub(tt.mul(3.7))).mul(.05)).mul(yy), xx = q.x.sub(.5).add(wob).abs();
const width = float(.46).mul(float(1).sub(yy)).mul(smoothstep(float(0), float(.16), yy).mul(.5).add(.5)), body = float(1).sub(smoothstep(width.mul(.45), width.add(.002), xx));
const heat = clamp(float(1).sub(yy.mul(1.15)), 0, 1), col = mix(vec3(.9, .16, .02), mix(vec3(1.4, .62, .07), vec3(1.9, 1.5, .6), heat.mul(heat)), heat);
const fm = new T.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false });
fm.colorNode = col.mul(body).mul(.62);                   // (.62: bright at night without blowing out at noon)
const flames = new T.Mesh(fg, fm); flames.frustumCulled = false; flames.renderOrder = 5; fg.setDrawRange(0, 6); world.scene.add(flames);

// each frame in onDraw: uT.value = world.time; then for each burning cell in range (near: within 70 m, 4 quads; else 1)
//   X, Y = cell centre + jitter from the cell index; h (height, units) = (20 + s*26) * (near ? 1 : 1.8); w (half width) = (6 + s2*6) * (near ? 1 : 1.9)
//   the quad faces the camera about z:  dx = X-cam.x, dy = Y-cam.y, l = hypot, sx = -dy/l*w, sy = dx/l*w
//   corners, in metres (x, z, y over 16): (X-sx, Y-sy, z0), (X+sx, Y+sy, z0), (X+sx, Y+sy, z0+h), (X-sx, Y-sy, z0+h); uv 0,0 1,0 1,1 0,1; seed same on all four
// then fg.setDrawRange(0, max(n*6, 6)) and needsUpdate on position, uv, seed. Heights fade with F.t[k] for the last 1.5 s.

// smoke: the same kind of mesh, 600 quads, normal blending, fog on; one column per 32 m block with any burning cell, within 520 m
//   sm.colorNode = vec3(.09, .08, .075); sm.opacityNode = float(1).sub(smoothstep(float(.15), float(1), rr)).mul(attribute('fade','float')).mul(.5);  // rr: squared distance from the quad's centre, from uv
//   7 puffs a column: u = (time*.07 + q/7 + blockHash) % 1, rise = u*46 m, drift = rise*.55 along the wind, radius = (5 + u*16) m, fade = min(1, u*5) * (1-u)
```
Without reeds and wind tuning this gave about 739 burning cells 40 s after three small ignitions. Tune by the slider, not by editing constants.

### A5. Water (the Remnant, the reservoir, the flood)

```js
const { positionWorld, uniform, sin, vec3, float, mix, smoothstep } = E.TSL, T = E.THREE, uTw = uniform(0);
const wg = new T.PlaneGeometry(2048, 2048, 1, 1); wg.rotateX(-Math.PI / 2);
const wm = new T.MeshLambertNodeMaterial({ color: '#ffffff', transparent: true, opacity: .82, side: T.DoubleSide, depthWrite: false });
const P = positionWorld, ripple = sin(P.x.mul(1.3).add(uTw.mul(1.1))).mul(sin(P.z.mul(1.7).sub(uTw.mul(.8)))).add(sin(P.x.mul(.31).sub(P.z.mul(.43)).add(uTw.mul(.5))));
wm.colorNode = mix(vec3(.12, .24, .22), vec3(.34, .46, .4), smoothstep(float(.2), float(1.5), ripple));
const flood = new T.Mesh(wg, wm); flood.position.set(1024, seaLevelMetres, 1024); flood.renderOrder = 2; world.scene.add(flood);
// each frame uTw.value = world.time; raise flood.position.y to flood the basin. Use smaller planes for the Remnant and the reservoir.
```

### A6. Boot order for the hub (the only order that passed at 4 players)

```js
// E.Game: touch: 'never', live: AIHub.active, autoPause: !AIHub.active, menu.quit: AIHub.active ? false : 'title'
const inSession = !!window.__hub; let hubInfo = null, built = false, told = false;
const tellReady = () => { if (!told && built && hubInfo) { told = true; AIHub.ready(); } };
if (inSession) window.__hub.then(i => { hubInfo = i; if (!i) { /* no hub after all: carry on as on its own */ } else { startRound(i); tellReady(); } });
game.start({ scenes, scene: inSession ? 'round' : 'title', boot: { title: GAME_TITLE, steps: [
  ['The 3D engine', () => W3.init(game, { render: !/[?&]norender/.test(location.search) })],
  ['The land', () => { defineSounds(); planLand(); layout(); }],
  ['The world', () => { makeWorld(); }],                                  // all meshes and materials; one world only
  ['Ready', () => { built = true; tellReady(); }],                        // before the warm-up, whatever it costs
  ['The shaders', () => { world.prepare(); }]
] } });
// AIHub.on('start', ...), on('message', ...), on('leave', ...), on('time-up', hostFinish), on('end', () => { game.stop(); audio.mute(true); })
// AIHub.server: replace the round scene's draw with a no-op, no hero, no camera
```
If `connect` answered null after boot chose `'round'`, go to the title. It's an edge case but make it work.

### A7. Settings, TV size, touch notice

```js
const SETTINGS = [
  ...W3.SETTINGS.filter(s => s.key !== 'look3d').map(s => s.key === 'picture3d' ? { ...s, value: 'balanced' } : s),   // soldiers are pen-drawn: drop the cards/puppets choice
  { key: 'music', value: .1 },                                                                                        // 10% by default (VERIFIED)
  { key: 'glyphs', value: 'playstation', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']] },               // (VERIFIED: labels R2 / RT, ✕ / A)
  { key: 'difficulty', label: 'Difficulty', group: 'Game', options: ['Contractor', 'Veteran', 'Dead Man'], value: 'Veteran' }];
```
`src/page.css`:
```css
@media (min-height: 900px) { html .esh { zoom: 1.5 } }          /* the engine's menus at 14 px are too small at ten feet; VERIFIED: fits and still clicks */
@media (min-height: 1400px) { html .esh { zoom: 2 } }
[data-sys=need] { background: rgba(5,3,12,.35) !important }     /* touch-only notice: keep it, but let attract mode show through */
```

### A8. Test helpers (Python)

```python
# a controller, for add_init_script: then set window.__pad.buttons[7] = {pressed:True,...} and bump timestamp
PAD = """(() => { const pad = { id:'Stub DualSense (STANDARD GAMEPAD)', index:0, connected:true, mapping:'standard', timestamp:0, axes:[0,0,0,0],
  buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0})), vibrationActuator:null };
  window.__pad = pad; navigator.getGamepads = () => [pad,null,null,null]; })();"""

# the hub's harness: serve hub/ on a port the OS picks, stop only that PID
import subprocess, re, threading
srv = subprocess.Popen(['python3','-u','-m','http.server','0','--bind','127.0.0.1'], cwd='hub', stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
port = int(re.search(r'port (\d+)', srv.stdout.readline()).group(1))
threading.Thread(target=lambda: [None for _ in srv.stdout], daemon=True).start()
# page.goto(f'http://127.0.0.1:{port}/harness.html?game=game.html&players=4&latency=150&jitter=50&loss=5&auto=1&scenario=standard&play=8000')
# page.wait_for_selector('body[data-complete="true"]', timeout=300000); report = page.evaluate('() => window.__hubCheck')   # report['pass'], report['checks']
# finally: srv.terminate()
```
Confirm the page is yours before trusting a result (read `document.title`). Chromium needs `args=['--autoplay-policy=no-user-gesture-required']` here. Other agents share this machine: never kill by name or port.

### A9. WebGPU in headless Chromium here

Launch with `--enable-unsafe-webgpu --enable-features=Vulkan --use-vulkan=swiftshader --use-webgpu-adapter=swiftshader --disable-vulkan-surface`, and install `standInCanvas` (copy it from `engine-repo/tools/kit3d-test.mjs`, lines 248-272) with `add_init_script` before the page loads. Without the stand-in, the unmodified kit also fails here ("Instance dropped in popErrorScope"). With it, VERIFIED: backend WebGPU, the same replay hash as WebGL 2, and the fire, smoke, held map and day/night recipes all run with no errors. Read frames with its `__readFrame(1)`, since a screenshot would be blank. `?backend=webgl` forces WebGL 2.
