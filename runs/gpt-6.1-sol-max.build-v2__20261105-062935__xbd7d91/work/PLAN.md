# PLAN: an original first-person survival shooter inspired by Far Cry 2

**From the game director to the builders.** You build this without me, so everything I would tell you in person is here.

- **Title:** yours. Follow TASK.md's process (50 silent ideas, a real RNG), save the list and the RNG output in `notes/title.md`, and put the title in one place: `engine/game/merc/strings.toml`. This plan says "the game".
- **Conflicts:** TASK.md wins over this plan. This plan wins over your taste on anything marked DECIDED. Numbers are starting defaults: tune them with the dev mode sliders.
- **Names:** the in-fiction names here are mine and you may improve them. None may come from the source (§1.4).
- **Paths:** all relative to your dev folder. TASK.md names that folder and the final HTML file. Bare file names such as `vehicle.rs` or `terrain.rs` are engine modules under `engine/crates/`.
- **Reading:** read §1 to §3 whole before you start. Read the rest as you reach each milestone in §13.

---

## 1. The game

### 1.1 Pitch
You are a contract mercenary sent into a fictional country in the last dry season of a civil war, to find and kill the arms dealer who sells to both sides. You arrive with a fever you can't cure, guns that rust in your hands, and a country that burns when you strike a match. Every job you take makes things worse. Everything happens in your hands: you hold the map, you dig the bullet out of your own arm, you clear the jam while someone is shooting at you, and a friend drags you out of the fire, once.

### 1.2 Genre and perspective (DECIDED)
- **Genre:** open-world first-person shooter with survival and systemic-sandbox rules (fire, wind, wear, fever, permadeath companions).
- **Perspective:** first person on foot and in vehicles, because the source's identity is the body in the world. Driving also has a chase camera toggle, because a TV and a stick make that easier. A cinematic third-person camera appears only in attract mode and the ending shots.
- **Why it suits this engine:** the engine has never shipped a first-person game. It does have the parts: capsule puppets with key-pose clips and IK, rapier, GPU particles, wind, procedural materials. §2 lists what you must add.

### 1.3 Pillars: every feature serves one of these
1. **Fire is a weapon you can't fully control.** Grass burns, wind decides where, and the plan you made stops mattering.
2. **Everything is in your hands.** Map, GPS, monocular, jams, wounds, pills and repairs are all physical first-person actions.
3. **Things fall apart.** Guns wear, cars break, fever returns, friends die for good.
4. **No clean hands.** Both sides are paying you, and the writing never lets you feel good about it.

### 1.4 Keep what makes the source distinctive, and improve it. Do not copy it.
TASK.md asks for an original game inspired by the source, and that is a hard line. Take the kinds of mechanics and the tone. Do not take its name, characters, factions, places, story beats, dialogue, music, map or level layouts, UI art or logo. **Never use:** the Jackal, UFLL, APR, Pala, Mosate, Bowa-Seko, Leboa-Sako, Reuben Oluwagembi, Mike's Bar, or any of its playable mercs or buddies. The title riff TASK.md asks for, the Source line in About/Credits and the source fields of the exit interview are the only places the source is named.

| Source idea to keep (as a kind of mechanic) | What we do better or differently |
|---|---|
| Fire spreads with the wind | The wind is readable at all times: a red rag tied to your front sight flutters downwind (§5.8) |
| Weapons jam and fall apart | Condition is visible on the gun itself. Enemies' guns jam too, and you see it happen |
| Recurring illness with pills | Warnings first, and you can treat it mid-fight. A missed pill costs time and money, not a save reload |
| Companions who rescue you and can die for good | Your multiplayer friends fill the same role with the same drag and syringe |
| Guard posts everywhere | Long re-man timers (24 in-game hours, never while you can see them), so a cleared road stays cleared |
| Huge map, long drives | A dense 2 km × 2 km map, with minibus fast travel from the start |
| Recorded interviews with the villain | Six tapes, and the last one is your own voice |

### 1.5 Scope (DECIDED)
**In:** everything in §5 to §11. A main path of 75 to 90 minutes with an ending choice, plus side content on the map.

**Out, on purpose:** hang gliders, PvP modes, an in-game map editor, character customisation beyond the merc pick, and the FPS targets and optimisation that TASK.md puts out of scope. Don't spend time optimising. Add as much detail, as many enemies and effects, and as many lights and shadows as the scene needs. The view-distance rings in §6.1 exist for sight lines, not for frame rate.

**Cut order if you run short:** cut *counts*, never *systems*. Fewer caches, posts, tapes (minimum 4) or side jobs is acceptable. A missing system, a stub, a TODO or a placeholder is not.

---

## 2. What I verified by building the engine here (2026-11-04)

I cloned both repos, built the engine and ran it on this machine. These results will save you hours.

### 2.1 Builds
- `git clone --depth 1 https://github.com/michaelcrosato/shardfall.git engine` works. So does `CARGO_BUILD_JOBS=12 cargo build --locked -p pav_tools --bin pav`, run inside `engine/`, in about **2 minutes** from cold. The toolchain and targets are already installed, and I installed no system packages, so skip the `apt-get` step in `engine/START_HERE.md`.
- From inside `engine/`, `CARGO_BUILD_JOBS=12 scripts/build-web.sh --single-file --scene <key> --title "<title>" --out <path>` takes about **2 minutes** and writes an **11.4 MB page** (wasm 28.1 MB, gzipped 8.4 MB). `wasm-bindgen` 0.2.129 matches `Cargo.lock`.
- `build-web.sh` uses `--locked`. After adding any dependency (even `js-sys`, which is already in the lock file transitively), run one plain `cargo check -p pav_app --target wasm32-unknown-unknown` to rewrite `engine/Cargo.lock`.
- `engine/scripts/pack_single_html.py` **refuses wasm-bindgen snippets**. Don't use `#[wasm_bindgen(inline_js)]` or `module=`. Call global functions on `window` instead (§12.5).
- `engine/crates/pav_core/build.rs` already embeds `engine/game/**/*.toml`, the top-level `engine/anim/*.json`, `engine/assets/materials/*.json` and `engine/assets/props/{templates,lib/core,lib/kaykit_adventurers}`. To ship a new prop pack, add its folder to that list and to `props::store::SHIPPED`.

### 2.2 Browser flags: TASK.md's list does not work for this engine
- With `--enable-unsafe-webgpu --enable-features=Vulkan --use-webgpu-adapter=swiftshader`, the page logs `GPU device lost (Destroyed)` within a second. The canvas stays blank and rAF reports a misleading 60 fps.
- **Use `--enable-unsafe-webgpu --enable-features=Vulkan --use-vulkan=swiftshader --use-angle=swiftshader`** (the engine's own list). It renders, and `page.screenshot` shows the canvas.
- Under those flags the starter game draws at **about 1.5 to 2.5 fps at 640–960 px wide**. The sim is capped at 8 ticks per frame, so it reaches 12–19 ticks/s, or roughly **0.2–0.3× real time**. So:
  - Play the game in `pav` (native, headless, far faster than real time).
  - Use the browser for UI, input, audio routing and hub checks.
  - Add a test switch that skips scene drawing (§14.3) when a browser test needs the sim at full speed.
- `pav capture` runs on llvmpipe at about 1 to 1.5 s per 960×540 frame.

### 2.3 Hub harness: confirmed passing on an engine page
I pasted `lib/hub/session.js` unmodified as the first script in the built page, right after `<meta charset>`, added the `hub:*` metas and a small connect/ready/send/finish shim, and served it with `harness.html`, `bridge.js` and `round.js`. **`window.__hubCheck.pass` was true** for all of these:
- `players=2`
- `players=4&latency=150&jitter=50&loss=5`
- `players=4&latency=150&jitter=50&loss=5&scenario=host-leave`
- `players=2&scenario=server`

Each software-rendered copy reached `ready()` in under 2.5 s. The harness gives all copies 20 s, so build the session scene small and call `ready()` before the first drawn frame.

**The game's own card passes too.** With `card:true` and a capture-phase `keydown` listener in the page's JS that calls `AIHub.answer('ready')` on Enter, the harness's extra check passed at 2 and 4 players and in the server case. The harness dispatches a synthetic Enter at the focused element, so answer it in the JS shim rather than waiting for the Rust side.

### 2.4 Input in headless Chromium
- **Controller stub:** a plain-object stub works with gilrs on wasm (the engine logs "gamepad connected", the UI flips to gamepad prompts, and button 9 opens the menu):
  ```js
  window.__pad = { axes:[0,0,0,0], buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0})) };
  navigator.getGamepads = () => [{ id:'Stub (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', index:0, connected:true, mapping:'standard',
    timestamp:performance.now(), axes:window.__pad.axes.slice(), buttons:window.__pad.buttons, vibrationActuator:null }, null, null, null];
  ```
- **Pointer lock:**
  - `requestPointerLock({unadjustedMovement:true})` rejects with `NotSupportedError` here, so fall back to the plain call, which works.
  - While locked, `page.mouse.move` gives `movementX = 0`, so tests must dispatch `new MouseEvent('mousemove',{movementX,movementY,bubbles:true})`.
  - `keyboard.press('Escape')` does not release the lock headless, so tests call `document.exitPointerLock()`.
  - Known real-browser behaviour, which I couldn't test headless: Esc releases the lock and the page may get no keydown for it, so treat `pointerlockchange` to unlocked as "open the pause menu". Chrome also refuses to re-lock for about a second after an Esc exit, and needs a user gesture, so show "Click to resume" and retry.
- **Two pages:**
  - `BroadcastChannel` and `storage` events work between `file://` pages in one browser context.
  - WebRTC with manual offer and answer (no ICE servers) opens over loopback in under 1 s. The codes are about 850 base64 characters.
- **Playwright** is in the user's site-packages, so `python3 -I script.py` can't import it. Keep your test scripts in `tests/` and run them without `-I`.

### 2.5 What the engine does not give you (you build it)
| Gap | Evidence | What to do |
|---|---|---|
| No first-person camera | `CameraRig::forward` clamps tilt to 0–90°, so it can't look up; `far = max(distance*4+200, 300)` | §12.2 |
| No sky | `Scene.clear_color` is flat, and `apply_fog` (scene.wgsl) also fogs unlit meshes, so a dome would vanish | Add a `flags::NO_FOG` bit and build a sky dome (§6.2) |
| Terrain is 1 m terraces with a hard-coded palette, flattened to y = 0 around footprints | `terrain.rs` | New smooth generator behind the streaming code (§6.1) |
| The car can't pitch or roll, and only the player can drive | `set_enabled_rotations(false, true, false…)`; `drive_vehicles` uses only the player's input, steering toward a world direction | §5.11 |
| Nav only works on floor blocks near y = 0 | `NavGrid::build` | Outdoor nav (§5.13) |
| Shots are for bullet-hell | `Team::Player` shots only hit things with `health`; the `Hit` event stuns for 0.6 s | Your own hitscan (§5.2) |
| Sound is a closed `match` on events, with no buses, loops, music or voices | `pav_audio::sounds_for` | §10 |
| HUD is text lines; the only menu is a pavilion debug menu; no title screen | `pav_ui::game_lines`, `pav_app/ui.rs` | Your own 10-foot UI kit and shell (§8) |
| Pavilion overlays appear on hook games: controls card, FPS box, footer, HUD box | Seen in my screenshot of the starter | Turn all of them off for this scene |
| `InputFrame` has no look input; `cmd` is Shardfall's type; it must stay `Copy` | `input.rs` | Add `look: Vec2`, `axes: Vec2`, `act: u32` (§12.3) |
| Rewind history clones the whole state | `SimConfig.history_seconds = 30` | Set it to 0 in this game. Backspace and the F-keys do nothing outside dev mode |
| Browser sim runs inside rAF, so a hidden tab stops it | `simhost.rs` `pump` | Also pump from a timer when `document.hidden` (§7.5) |

### 2.6 What is in the asset store
- **Props:** generic only. Barrels, casks, crates, sacks, tents, market stalls, tables, chairs, cots, fences, wells, signposts, lanterns, rowboat, rocks, rubble. **No guns, modern vehicles, trees, grass, huts or sandbags.** Those are yours (§9.2).
- **Clips:**
  - Pistol idle/aim/shoot/reload (QUATERNIUS, MESH2MOTION)
  - Crawl, crouch walk and idle, get-ups, many deaths
  - Limps and `Wounded_Walk_Loop`, `Idle Hurt`, `Walk_Carry`, overhand throw, waves
  - Rifle-holding locomotion: `STYLE100/Swat_Walk` is embedded. After `clips load=100style` you also get `STYLE100_RUN/Swat_Run`, `STYLE100_IDLE/Swat_Idle`, `STYLE100_BACK/Swat_WalkBack` and `STYLE100_SIDE/Swat_SideLeft` and `Swat_SideRight`, but those sets are on disk only. Copy them (`anim_edit action=copy`) and put the results in `engine/anim/merc_npc.json`, so the browser build has them
- **No clip for:** prone, dragging someone, panic, burning, grenade or rifle firing. Author those (§9.3).

---

## 3. World bible and writing

### 3.1 Setting
The **Republic of Kwelara**, an invented landlocked country. It is the last dry season of a civil war that both sides have stopped pretending to win. Rust-red laterite roads, gold grass to the horizon, flat-topped acacias, baobabs, granite kopjes, one brown river with green forest along its banks, and everywhere the leftovers of the colonial era and of three failed governments. A ceasefire holds in exactly one town. Don't name real countries, ethnic groups or flags.

### 3.2 Cast
| Who | Role | Voice |
|---|---|---|
| **The Council** (Council for National Renewal) | The junta. Olive fatigues, dark red berets, paperwork | Euphemism: "administrative measures" |
| **The Hand** (People's Hand) | The rebels. Mixed civilian clothes, red scarves, slogans on trucks | Revolutionary grammar, schoolroom metaphors |
| **Colonel Émile Tshala** | Your Council paymaster | Polite and bored. Never says "kill" |
| **Comrade Josephine Ruvuma** | Hand commander, former schoolteacher | Grades everything, including you |
| **The Chandler** | Your target. Sold every bullet in the country. A nickname: a chandler sells a ship what it needs to sail. Heard on tape long before you meet him | Literate, tired, amused, dying |
| **Thandiwe Moyo** | Radio journalist who made the tapes, and the only person not paying or being paid | Exact and unimpressed |
| **Papa Lazare** | Owns the bar in the ceasefire town. Fixer and rumour broker | Gallows humour |
| **Mr. Desai** | Arms dealer behind the garage. Third-generation shopkeeper | "Everything here is new, or has been described as new." |
| **Sister Perpetua** | Runs the mission clinic. Trades pills for dangerous errands | Prays and bargains in the same sentence |
| **Bakker** | Cargo pilot who flew you in. Returns at the very end | Doesn't ask |

**Four mercs (DECIDED: the dossier pick).** On a new game the player picks one. The other three become the recruitable companions, so write their lines to work without knowing who the player picked.
- **Ada Okoro:** ex-army medic. Calm. Counts what you owe her.
- **Tomek Wrona:** ex-sapper. Jokes when things are worst.
- **Rafael Quintero:** tracker. Chain-smokes. Superstitious about nothing.
- **Mirela Dragan:** sharpshooter, ex-Legion. Says very little.

Local characters have authority and wit. There is no saviour arc, and the player is part of the problem.

**Content limits (DECIDED):** no child combatants on screen, no sexual violence, and civilians can't be harmed by the player's weapons (see the town rule in §6.3). Gore is stylised: dust and dark flecks, no dismemberment. Wound treatment is strong because of sound, hands and implication, not because of visible injuries.

### 3.3 Writing style (TASK.md: "a writing style similar to the source's")
Dry, weary, literate, morally corrosive. Short sentences. Bureaucratic words for terrible things. Nobody explains the theme. Nobody is your friend without a price. Humour is black and brief. Briefings are at most five short lines on a typed card. Barks are gibberish audio with short subtitles. Use these to set the voice, and write the rest yourself:

- Papa Lazare: "Ceasefire means they only shoot you past the town limits. We have a sign."
- Tshala: "You will burn the depot at Ombe. If anyone asks, it was the dry season."
- Ruvuma: "The children I taught now carry rifles. I graded them fairly. I will grade you the same."
- Sister Perpetua: "God does not pay for quinine. You will."
- Chandler, tape 1: "A chandler sells what a ship needs. Rope, tallow, lamp oil. Nobody ever blamed the rope."
- Chandler, tape 4: "You call the war a fire. A fire stops when there is nothing left to burn."
- Thandiwe, tape 3: "He asked me to note that he is not a monster. I have noted it."
- Tomek, trapped: "Best plan I ever had went wrong too. This wasn't even that plan."
- Ada, past saving: "Do it properly. You still owe me eleven diamonds."
- Death card: "Nobody will ask what happened. That is what the money was for."

**Epigraphs for load cards** (public domain, or a proverb):
- "When elephants fight, it is the grass that suffers." (East African proverb)
- "They make a desert and call it peace." (Tacitus)
- "The conquest of the earth… is not a pretty thing when you look at it too closely." (Conrad)
- "The strong do what they can and the weak suffer what they must." (Thucydides)

All text lives in `engine/game/merc/strings.toml`, `contracts.toml` and `tapes.toml`.

### 3.4 Story in one paragraph
You land at night on a cargo flight whose crates are stencilled for both sides. Papa Lazare finds you collapsing with fever on his doorstep, and a companion gets you on your feet. You take work from the Council and the Hand to get close to the Chandler. Each job undoes the last. Your assassination at the Hotel Splendide ends the ceasefire and the town burns. The crates, the tapes and the ledger all lead to the old Cement Works. There the Chandler, dying of the same fever, shows you the ledger: every buyer, your two employers, and the firm that hired you, paid by the Chandler himself. He hired his own killer because he wanted an ending or a successor. **Three endings (player's choice):**
1. **Burn it.** Torch the works and the ledger, and walk into the grass. The war goes on and nobody knows.
2. **Read it.** Hold the radio mast for three minutes while Thandiwe reads the names on air, with fire and both armies closing in. The war pauses. You don't survive it.
3. **Take the chair.** Sit at his radio. The next order comes in, and you answer it.

Every ending finishes on a final tape: **your own voice**, in gibberish with subtitles, being interviewed.

---

## 4. Controls (DECIDED)

Controller first (DualSense, standard mapping). The keyboard and mouse use what PC FPS players expect. Prompts follow the last device used, and a Settings option swaps PlayStation glyphs for Xbox's A B X Y.

Standard mapping indices: 0 ✕, 1 ○, 2 □, 3 △, 4 L1, 5 R1, 6 L2, 7 R2, 8 Create, 9 Options, 10 L3, 11 R3, 12–15 D-pad up/down/left/right. gilrs names: South, East, West, North, LeftTrigger, RightTrigger, LeftTrigger2, RightTrigger2, Select, Start, LeftThumb, RightThumb, DPad*.

| On foot | DualSense | Xbox prompt | Keyboard and mouse |
|---|---|---|---|
| Move / look | L stick / R stick | LS / RS | W A S D / mouse (pointer lock) |
| Fire / aim down sights | R2 / L2 | RT / LT | LMB / RMB |
| Jump, vault | ✕ | A | Space |
| Crouch (tap), prone (hold) | ○ | B | C or Ctrl (hold), Z prone |
| Reload, clear jam | □ | X | R |
| Interact (when a prompt shows; takes priority over reload) | □ | X | E, or LMB when no weapon is raised |
| Next weapon | △ | Y | Q, wheel, or 1 2 3 |
| Throw | L1 | LB | G |
| Machete | R1 | RB | V |
| Sprint | L3 | LS click | Shift |
| Monocular | R3 | RS click | B |
| Map and GPS up/down | D-pad ← | D-pad ← | M |
| Syrette / treat wound | D-pad ↑ | D-pad ↑ | H |
| Fever pills | D-pad ↓ | D-pad ↓ | P |
| Diamond tracker | D-pad → | D-pad → | T |
| Current contract card | Create | View | Tab |
| Pause | Options | Menu | Esc |

| In a vehicle | DualSense | Keyboard and mouse |
|---|---|---|
| Steer / look | L stick / R stick | A D / mouse |
| Throttle / brake and reverse (analog) | R2 / L2 | W / S |
| Handbrake / horn | ✕ / L1 | Space / L |
| Get out | □ | E |
| Change seat (driver, mounted gun) | △ | F |
| Camera (first person, chase) | R3 | V |
| Mounted gun: fire / zoom | R2 / L2 | LMB / RMB |
| Map | D-pad ← | M |

| Map up | DualSense | Keyboard and mouse |
|---|---|---|
| Move the pencil (hover focuses a place) | R stick | mouse |
| Set waypoint | ✕ | LMB |
| Zoom | L1 / R1 | wheel |
| Lower map (you can keep walking or driving with it up) | ○ or D-pad ← | RMB, Esc or M |

| Menus | DualSense | Keyboard and mouse |
|---|---|---|
| Move focus | D-pad or L stick | Arrows or W S A D, or hover with the mouse |
| Confirm / back | ✕ / ○ | Enter, Space or click / Esc or RMB |
| Tabs | L1 / R1 | Q / E or click |
| Adjust slider | D-pad ← → (hold accelerates) | ← → or drag |

**Feel settings (defaults):** stick look 140°/s at full deflection with a response curve, mouse 0.12°/count, aim assist on for controller only (slowdown near targets plus light magnetism while L2 is held), invert Y off. Rendered look uses the latest input every frame, not only tick results (§12.2).

---

## 5. Systems

All numbers are `Tunable` (so they appear in `pav params`, `pav set` and dev mode) or live in `engine/game/merc/*.toml`.

### 5.1 Movement
Use the engine's character controller, momentum model. Walk 3.0 m/s (aiming), run 4.6, sprint 7.0 for 12 s of stamina, crouch ×0.55, prone ×0.28, jump 1.0 m, vault onto ledges (existing mantle), swim with `water_depth` (no weapon use while swimming). Eye heights: 1.58 m standing, 1.02 crouched, 0.42 prone, smoothed. Head bob has a Settings slider. Hard landings: over 6 m/s hurts, over 12 m/s can break a finger (triggers a wound treatment).

### 5.2 Shooting
Hitscan rays from the camera with weapon spread and bullet drop past 150 m, against rapier geometry and character capsules. You write this: don't use `Projectiles` for bullets. Zones: head ×3, torso ×1, limbs ×0.6. Visible tracers on every third round, muzzle flash light, dust puffs by surface, ricochet sparks on metal, dark flecks on people. Vehicles, barrels, crates and thatch take damage as objects. Recoil is a spring on the view (pitch and yaw kick) plus the weapon root. ADS tightens spread, zooms FOV (75° to 55°), and lines up the iron sights. There is a minimal centre dot and a hit tick, with a Settings toggle.

### 5.3 Weapons (DECIDED: three slots, plus throwables and machete)
The player carries one sidearm, one primary and one special. Defined in `engine/game/merc/weapons.toml`. Starting values:

| id | slot | name | mag / reserve | rpm | damage | range m | wear per shot % | noise m | notes |
|---|---|---|---|---|---|---|---|---|---|
| pistol | side | Service Nine | 12/60 | 300 semi | 22 | 40 | 0.10 | 120 | |
| revolver | side | Old Six | 6/30 | 120 | 48 | 50 | 0.05 | 140 | barely wears, slow reload |
| flare | side | Flare pistol | 1/8 | 40 | 10 | 60 | 0.5 | 60 | **ignites** |
| sawnoff | side | Sawn-off | 2/24 | 120 | 12 × 8 | 12 | 0.3 | 150 | |
| ar | primary | Forty-Seven | 30/180 | 600 | 26 | 120 | 0.14 | 160 | the country's rifle, every corpse drops one |
| battle | primary | Battle rifle | 20/100 | 450 | 38 | 180 | 0.12 | 180 | |
| smg | primary | Folding SMG | 30/180 | 800 | 16 | 50 | 0.16 | 110 | |
| shotgun | primary | Pump gun | 6/36 | 70 | 10 × 9 | 18 | 0.25 | 150 | |
| sniper | primary | Bolt rifle | 5/40 | 40 | 110 | 400 | 0.35 | 300 | scope, overlay vignette |
| dart | primary | Dart rifle | 1/12 | 40 | poison, kills in 3 s | 80 | 0.2 | 8 | **silent** |
| lmg | special | Belt-fed gun | 100/300 | 700 | 28 | 140 | 0.08 | 200 | slow to aim |
| rpg | special | Rocket tube | 1/6 | 15 | 300, blast 6 m | 150 | 1.2 | 260 | **ignites** |
| flamer | special | Flamethrower | 100/300 fuel | stream | 30/s | 14 | 0.05/s | 40 | **ignites**, wearer's tank can burst if shot |
| mortar | special | Hand mortar | 1/8 | 20 | 200, blast 8 m | 40–200 | 1.0 | 200 | **ignites**, lob with aim arc |
| frag | throw | Grenade | -/4 | | 150, blast 6 m | | | 200 | cooks with hold, can ignite grass |
| molotov | throw | Petrol bottle | -/4 | | 15/s | | | 30 | **ignites**, 4 m pool |
| machete | melee | Machete | | 70 per hit | | 1.6 | | 10 | silent kill from behind, cuts a firebreak cell |

### 5.4 Condition and jams (pillar 3)
- `condition` 0–100 on each weapon instance.
- Weapons from a dealer crate start at 100. **Weapons dropped by enemies start at 25–60.**
- Mud, fire and water cost a little extra.
- **Jam chance per shot:** 0 above 70. Below that, `0.22 × ((70 − c) / 70)²`, so about 1 in 18 shots at c = 35 and 1 in 6 at c = 10.
- **Spread** × (1 + (1 − c/100) × 0.8).
- **Below c = 8:** 3% per shot that the gun breaks apart in your hands (animation), leaving you the next weapon.
- **Clearing a jam:** the gun stops with a dead click and a visible stuck bolt. Press Reload to run the clear animation (1.2–2.5 s). A second tap at the right moment (the bolt slap) shortens it by 40%.
- **Visible state:** the procedural material shifts with condition (bluing, then scratched, then rust), smoke curls from the muzzle below 25, and pieces rattle. No condition number during play. The monocular and locker use words: *New, Used, Worn, Rusted, Dying.*
- **Enemies obey the same rule:** a jammed soldier stops, curses in gibberish and works the bolt, which opens a window for you. Test this.
- Mr. Desai sells *Reliability* (wear −30%) per weapon family.

### 5.5 Damage and treatment
- **Health:** 100, shown as 5 segments only when it changes (Immersive HUD) or always (Standard HUD). It regenerates slowly up to the top of the current segment.
- **Syrette** (carry 3, upgrade to 5): +60 over 1.5 s, needle-to-thigh animation. Usable while walking.
- **Critical (under 20):** colour drains, heartbeat, screen edge pulses. The heal button now runs a **wound treatment** (free, 3–5 s, you can't shoot, restores to 40). The type follows the cause. Six in total, each a key-pose animation with its own synthesized sound:
  - gunshot: pliers pull a bullet from the forearm
  - shrapnel: knife digs out a fragment
  - burn: pour water, wrap with cloth
  - fall: snap a dislocated finger back
  - second gunshot variant: strap a tourniquet with your teeth
  - graze: cauterise with a lighter and gunpowder
- **Going down at 0 HP:** if a companion is alive and their rescue isn't spent, you go to the **rescue sequence** (§5.12). Otherwise a death card, then reload the last autosave.

### 5.6 Fever (pillar 3)
- Hidden timer, 15 min ± 3 of play time, shortening 10% per attack.
- **Warning (40 s):** the ears ring faintly, the image shimmers at the edges, hands tremble, the viewmodel sways.
- **Attack:** camera roll ±3°, FOV breathing, warm desaturation, aim shake ×3, audio low-passes, walk −25%. Lasts until treated or 60 s.
- **Pills:** 2.5 s animation (shake the bottle, swallow). Stops it immediately and resets the timer. Start with 3.
- **No pill by the end:** you black out. You wake at the nearest safe house 6 hours later, at half health, minus 20% of your carried diamonds ("someone carried you; they took a fee"). Never a game over.
- Sister Perpetua's jobs refill pills. Rival route: Mr. Desai sells them at a scandalous price.
- A Settings slider reduces camera motion and shimmer for players who get motion sick.

### 5.7 Fire (pillar 1: the feature people will remember)
**Simulation** (deterministic, `sim.state.rng`, CPU):
- 2 m cell grid over the map. Base fuel comes from the biome map (derived from the seed and data, not stored): grass 1.0, thorn bush 1.5, tree 3.0, thatch 2.0, road, rock and water 0.
- **State is sparse:** a `BTreeMap<cell, (state, t)>` holding only burning and burnt cells, so snapshots, saves and network deltas stay small.
- **Tick at 4 Hz.** For each burning cell, each neighbour within 2 cells ignites with probability `spread_rate × fuel × dryness × wind_factor × slope_factor × dt`, where `wind_factor = exp(k × dot(direction, wind) × wind_speed)` and uphill burns faster.
- **Target speeds:** front about 1.5 m/s downwind in a moderate wind and about 0.3 m/s upwind. **Test this:** with wind 8 m/s, downwind reach is at least 3× upwind reach after 60 s.
- **Burn time:** grass 6–10 s, bush 15 s, tree 40 s. Then burnt (black) for 2 in-game days, then it regrows.
- **Embers:** in winds above 8 m/s, a small chance of a spot fire 6–15 m downwind (so fire can jump roads).
- **Rain** extinguishes and wets (dryness falls, recovering over hours).
- **Fire breaks:** roads, water, rock, burnt ground, machete-cut cells.

**Igniters:** molotov, flare, flamethrower, rockets, mortar, some grenades, tracer on dry grass (small chance), exploding barrels and fuel tanks, burning vehicles, burning people, cigarette from a mission script, lightning in storms.

**Effects on the world:**
- Standing in fire: 20 HP/s, 3 s of burning after you leave. Water puts you out.
- Enemies path upwind and away, and panic when caught: they run flailing, ignite more grass, and can break a squad's formation.
- Animals stampede.
- Fuel drums and tanks explode.
- Ammo crates cook off.
- Thatch roofs burn and collapse visually.
- Vehicles catch and burn.
- Dense smoke blocks AI sight (LOS check through smoke cells) and makes the player cough.

**Look:**
- Near cells get emissive flame cones that flicker, plus GPU particles (fire, smoke, embers presets, tuned), heat distortion and flickering point lights grouped per burning patch (up to the renderer's limit of 64, nearest first).
- Smoke columns rise and lean with the wind, visible for a kilometre.
- Burnt ground turns near-black (overlay, plus grass and leaves removed from the chunk's view cache), and ash drifts.
- Far fires appear as an orange glow on the smoke.

**Sound:** crackle loop scales with nearby burning cells, plus a low roar. See §10.

### 5.8 Wind and weather
- Wind has direction and speed (0–12 m/s). It changes every 3–6 in-game hours, and storms shift it.
- **Readable three ways:** grass sway (engine `view.wind`, `wind_angle`, `wind_gusts`, driven by the sim's wind), smoke lean, and the **red rag on your front sight**: a verlet strip (engine `rig.rs` follows-the-leader chain) that streams downwind on every weapon. This is the signature detail, so make it readable from the couch.
- **Weather states:** clear, hazy, storm (90 s of rain: rain particles, `water_rain`, darker light, thunder, lightning that can start fires).

### 5.9 Time of day
1 real minute = 1 in-game hour (slider). Sun and moon move. A per-minute colour script drives `view.light.*`, sky dome, fog colour and grade (§9.1). Night is dark enough that headlights, muzzle flashes, burning grass and lamps matter. Sleeping at a safe house (Dawn, Noon, Dusk, Midnight) skips time and shifts wind and fever timers.

### 5.10 Stealth and detection
Each NPC has a 0–1 meter. Rate = `base × distance falloff × posture (1 / 0.6 / 0.3) × tall-grass cover (0.35 when crouched in it, 0.6 standing) × light (day 1, night 0.45, beside fire 1.5, in headlights 2) × camo suit 0.7 × movement (still 0.5, sprint 1.3)`, only inside a 120° cone with line of sight (terrain, solid objects, dense smoke).

Noise from `noise m` in the table creates investigations. States: *Unaware → Suspicious (walk to the spot) → Combat → Search (20 s at the last known position) → Unaware.* Radios share alerts within 80 m. A found body makes them Suspicious. Night dart missions must really work this way. **Test:** crouched in tall grass at 30 m at night stays hidden far longer than standing on a road at noon. Grass density comes from the same function the view uses, so what you see is what hides you.

### 5.11 Vehicles (engine changes required)
Extend `vehicle.rs`:
- Allow pitch and roll with strong damping and upright recovery, so chassis follow the slopes.
- Add vehicle-relative controls (throttle, brake, steer axes).
- Let NPCs and remote players drive, through a per-vehicle input map filled by the game's `pre`.
- Add a `Boat` kind that floats at the water height with an outboard (arcade, wake particles, stops at the shallows).

| Vehicle | Seats | Character | Notes |
|---|---|---|---|
| Technical (pickup with mounted heavy gun) | driver, gunner | bouncy | the star of road fights |
| Jeep | driver, passenger | fast | |
| Supply truck | driver, bed | slow, tough | convoys, multiplayer extraction |
| River boat | driver, gunner | floats | river routes only |

- **First-person seat:** hands on the wheel (key-pose loop, wheel turns with the steer value), dash and hood visible, map held against the wheel, headlights at night.
- **Damage stages:** healthy → white steam → black smoke (−40% speed, misfires) → on fire (8 s fuse) → explodes and ignites the grass.
- **Repair:** get out, face the hood, hold Interact: hood up, wrench animation, bolt turns, steam dies (6 s, or 3.6 s with the kit). Restores to 70%.
- Technicals at guard posts give chase with AI following the road spline. Enemy gunners shoot, and you can shoot drivers out.

### 5.12 Companions (pillar 3)
- Recruited in Papa Lazare's bar after your first job. Each has a stool there.
- **Rescue:** when you go down, the best living companion (once per rest) appears out of the bush within 6 s, shooting. In first person you are dragged 10–15 m on your back, sky lurching, then a syrette to the neck and a line of dialogue. You stand at 50 HP with your sidearm.
- **Down companion:** during shared jobs or their own trouble they can go down: gibberish cries, on-map marker, **45 s to reach them**. Options at their side: *Patch up* (costs a syrette), or if they are too far gone only *Overdose* (a mercy kill with a morphine syrette, a held button, and a final line). If you don't come, they die alone.
- **Permadeath:** a dead companion's stool stays empty, and the map gets a pencil note. Survivors mention it.
- **"A better way":** before each main contract a living companion may offer an alternate approach (more money, more danger, and it can leave them trapped). There are three scripted variants, one per companion, each usable with any companion. Buddy trouble happens at most 3 times in a run.
- At the end, the highest-trust survivor comes to the Cement Works. The ledger has their name in it too. They stay anyway, or they don't (trust threshold).

### 5.13 Enemy AI
Roles: **Rifleman, Machine-gunner, Sniper** (glint, ridge positions), **Rocket man** (targets vehicles), **Flame trooper** (his tank explodes).
- Squads of 3–7 hold posts and patrols.
- **Combat:** pick cover from nodes authored in stamps and from rocks and trees near them; bound while others fire; one or two flank; at most 4 enemies aim at the player at once; accuracy falls with range and with the player's speed, rises while tracking.
- Wounded crawl and call out. Morale breaks when half the squad dies or fire arrives.
- **Barks:** gibberish plus optional subtitles. Reload, Jam, Flanking, Fire!, Man down, Where is he.
- Character movement uses the engine's controller via `Game::pre` input maps.
- **Nav:** write outdoor nav in the game. Each compound gets a local grid (`NavGrid::build` can be adapted: treat terrain under the stamp as floor), and open ground uses straight lines with local obstacle avoidance plus a coarse road graph.
- Keep all of it `Clone`, seeded and free of `HashMap` iteration order.

### 5.14 Guard posts and territory
Six posts on the road network (§6.3), each a stamp with 4–7 soldiers, cover nodes, a barrel or two and sometimes a technical. They fire on sight outside the ceasefire. A cleared post gets a pencil X on the map and stays clear for 24 in-game hours (slider), and never re-mans while the player can see it.

### 5.15 Safe houses
Three (§6.3). Claim one by clearing the 3–4 guards. Contains a bed (sleep, autosave, heal), a locker (swap weapons, fresh weapon crate after purchase), resupply (ammo, syrettes), a radio (contract calls, weather), a typed note wall.

### 5.16 Economy
- **Diamonds only.** Contracts pay 5–15. **Twelve caches** hold 1–3 each. About 100 are available in a full run.
- **Tracker:** a GPS-style handheld whose LED and beep speed up near a cache, inside 60 m. Caches are briefcases in odd places (a dead pilot, a termite mound, a burnt truck), and fire can expose them.
- **Mr. Desai's catalogue:** big cards, six per page, each with the real prop turning on a stage.
  - Weapon licences (once paid, new crates appear in every locker)
  - Reliability and accuracy per family
  - Ammo pouch, Syrette bandolier, Vehicle kit, Camo suit, Pills (expensive)

### 5.17 Map, GPS, monocular (pillar 2)
- **Map:** a real 3D paper map held in your left hand, GPS in the right. You keep walking or driving with it up.
  - Mesh: a 128×128 vertex-coloured grid from the biome and height data, roads and rivers as thin ribbons, place names in engine `Text3d`, handwritten marks for discoveries, posts, caches, contracts and companion notes. Burn scars update every few seconds.
  - The pencil is a small prop you steer; hover a place to focus it, and its name and a dry one-liner appear in large type at the bottom of the screen.
  - Waypoint shows on the GPS as distance and an arrow on its emissive LCD. There is no world-space marker unless the *Assist markers* setting is on.
- **Monocular:** vignette, ×5 zoom, range readout. Hold on a person for 0.5 s to tag them (role, weapon condition word). Tags go on the map. It also shows wind speed.

### 5.18 Tapes
Six cassettes hidden on the map (hotel, mission, depot, lodge, cement works, the bar after the fire). In first person you hold a battered recorder (usable while walking): the Chandler and Thandiwe in gibberish with large subtitles. Each tape is about 8 lines, and together they are the real story. Tape 5 gives the Cement Works its meaning. The last tape is yours, written from the player's actual run (merc name, companions lost, who paid you most).

### 5.19 Reputation
One hidden number, *Infamy*, rises with contracts done and with betrayals. It changes barks, Papa Lazare's and Sister Perpetua's tone, and prices. Keep it small and let the text do the work.

### 5.20 Wildlife and people
- Zebra herds and a few antelope (quadruped body plan, engine rig) graze and flee from shots and fire. Vultures circle over corpses and smoke, so they can betray a fight or lead you to a cache.
- Town people idle with clips (talking, sitting, carrying), radios play, and they run when the town burns.

### 5.21 Saves
- Progress JSON in `localStorage`, using `pav_app/save.rs`'s pattern. It holds contract state, inventory with conditions, discoveries, time, wind, fever timer, companions, post timers, sparse burn map, diamonds, Infamy.
- One autosave (sleep, contract start and end) plus three manual slots at beds.
- It must work from `file://`.
- In a hub session the client gives the game an empty store, so don't save there.

### 5.22 Difficulty
Easy, Normal or Hard at new game, as multipliers on enemy damage and accuracy, wear and fever interval, all driven through the same sliders.

---

## 6. The world

### 6.1 Terrain and view distance
Map: **2048 m × 2048 m** (64 × 64 chunks of 32 m). The world ends at a burnt escarpment, a fence of grass fires or deep water, with a line of dialogue if you push on.

Write a new generator (`engine/crates/pav_core/src/games/merc/terrain.rs`) behind the streaming code in `world.rs`:
- **Smooth 1 m vertex grid** with real normals and vertex colours.
- **Height** = low noise + macro-features from `engine/game/merc/world.toml`: road corridors flattened and graded, river channel carved, flat pads under POIs at any height (not just y = 0), ridges.
- **Colours** from biome and slope, with road ruts and burn overlay.
- **Keep** `TerrainPatch`'s mesh and trimesh collider.
- **Rings:**
  - A: 0–96 m, physics and full detail.
  - B: 96–320 m, visuals only, coarser mesh, fewer trees and grass.
  - C: beyond 320 m, one coarse whole-map mesh (16 m grid) sitting slightly lower, plus big trees and silhouettes.
- **Fog:** warm, starts around 120 m, ends past 500 m (raise the param range). Fog colour tracks the horizon colour so there is no white band (I saw one in my look test).

### 6.2 Sky
A dome mesh (vertex gradient updated by time of day), sun and moon discs with bloom, stars at night, a few flat-bottomed clouds, distant mountain silhouette ring, all `NO_FOG`. The camera `far` must exceed it.

### 6.3 Places (positions are metres, x east, z south, origin at map centre; put them in `world.toml` and adjust freely)
```
                                 N
 +----------------------------------------------------------------+
 |      SH2 Ranger's Lodge                    HOTEL Splendide       |
 |                                             on the ridge  ^^^  |
 |   DEPOT Ombe Flats                          ^^ GP5 ridge road  |
 |   (huge grass plain)         JCT + bus + GP4 -----/  ^^^       |
 |        ...grass...              |                              |
 |   ......................        |                              |
 |  PUMP station~~~~~~~~~GP3 =BRIDGE= ~~~~~~~~~~~~~~ FERRY ~~~~~~~ |
 | ~~~~~~~~~/ Luvande river ~~~~~GP2  ~~~~~~~~~~~/    SH3 Boat Shed|
 |    GP6 quarry road----- KM40 TOWN ---bus--- MISSION Ste-Odile   |
 |  CEMENT WORKS ---/        | bus, bar         (river forest)     |
 |                        GP1 Kilo 38  SH1 Pump House              |
 |                           |                                    |
 |                      AIRSTRIP                                  |
 +----------------------------------------------------------------+
```

| Place | x, z | What it is |
|---|---|---|
| Airstrip | -120, 900 | Cargo arrival, shipment start |
| GP1 Kilo 38 | -40, 640 | First guard post |
| **Kilometre 40** | 0, 380 | The ceasefire town: bar, shop, garage, Council office, Hand office, market, clinic annex, bus. **Weapons auto-holster at the town sign and can't be raised inside**, which is what keeps civilians safe. In "The Town Burns" the sign means nothing and only soldiers are valid targets. |
| SH1 Pump House | 170, 470 | First safe house |
| Luvande river | polyline (1024,120) (760,260) (420,90) (120,40) (-200,-40) (-560,60) (-820,220) (-1024,180) | Divides the map |
| Bridge, GP2, GP3 | 40, 40; 40, 110; 40, -30 | The one bridge, with a post at each end |
| Mission Ste-Odile | 720, 420 | Clinic, church, tape, green forest (mission-road bus stop at 380, 400) |
| Ferry landing | 640, 170 | Cable ferry raft, boat route |
| SH3 Boat Shed | 830, 255 | Safe house with river boat |
| Pump station | -420, -30 | Night stealth contract, north bank |
| **Ombe Flats depot** | -520, -520 | Fuel tanks in a sea of grass: fire set piece, hub round |
| Flats junction, GP4 | 20, -420; 60, -460 | Crossroads, bus stop |
| SH2 Ranger's Lodge | -260, -700 | Safe house |
| GP5 Ridge road | 360, -520 | Post on the switchback |
| **Hotel Splendide** | 620, -640 | Ruined colonial hotel on the ridge. Sniper overlook at 760, -520 |
| GP6 Quarry road | -420, 480 | Post |
| **Cement Works** | -760, 620 | Silos, quarry, radio mast: the finale |

**Compounds are stamps:** ASCII room files in the engine's own level format (`engine/game/merc/stamps/*.toml`, checked with `pav room_check`), with walls, roofs, props, markers (`cover`, `spawn_rifle`, `barrel`, `cache`, `bed`…) and `[[object]]`s placed on terrain pads. Interiors exist for the bar, shop, clinic, safe houses, hotel lobby and works control room. Doorways are open, with no door logic. Turn the engine's cutaway off for this game.

---

## 7. Multiplayer (DECIDED)

TASK.md asks to follow the hub protocol "for multiplayer integration into ai-hub as well as for the game on its own". I'm covering both readings: full hub sessions, a clean solo game when there is no hub, and the same co-op round playable outside the hub.

### 7.1 Mode and tags
**`shared-world`**, seats `1-4`. Your friends are your companions. Read `https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/README.md` whole, and download `session.js`, `harness.html`, `bridge.js` and `round.js` into `hub/`.
```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="10">
<meta name="hub:session-goal" content="Burn the depot, take the ledger, get out together">
<meta name="hub:session-howto" content="Stick/WASD move · R2/LMB fire · L2/RMB aim · Square/R reload or clear jam">
<meta name="hub:webgpu" content="required">
```
Paste `session.js` **unmodified** as the first script in `<head>`, right after `<meta charset>`, by editing `engine/web/index.html`. The packer keeps it there.

### 7.2 The round: "Contract Run"
In a session the game opens straight into this, with no title or menus. It takes place on the Ombe Flats slice of the map, 8–10 minutes.
1. Mercs start on a truck at the track's end, at dusk, with wind set to favour a fire.
2. Destroy three fuel tanks by any means. Fire is the obvious way.
3. One player takes the ledger case from the office (carrying it slows you and prevents sprinting; it can be dropped and picked up).
4. All living mercs reach the river boat, about 500 m south across the grass, so the fire you lit chases you out, and leave.

Enemies, fire, jams and all the other systems are live, with a fixed loadout and no shop, fever on a short mild timer, and no pause. Down players can be **dragged and patched** by friends (the companion mechanic), and otherwise respawn on the truck after 45 s, up to 6 team lives.

**Scoring:** +100 per objective shared, +10 per kill, +25 per rescue, −25 for friendly fire. `AIHub.finish({standings, scores, won, stats, awards})` by the host. `won` is true on extraction. Stats: kills, rescues, jams, cells ignited. Awards: *Arsonist, Field Medic, Rust Bucket, Last Out.* On `time-up`, the host finishes at once (within `graceMs`).

### 7.3 Protocol checklist
- JS shim `window.gameNet` (§12.5) wraps `AIHub`: call `AIHub.connect({mode:'shared-world', seats:[1,4], card:true})` while the page parses. When it resolves `null`, run the normal game with the title screen.
- **Own card** (`card:true`): a live scene of the truck at dusk with the title, the players in their seat colours and ready state, how to win, this player's controls and the time left from the `card` event. Enter, ✕ or tap → `AIHub.answer('ready')`. △, a named key or tap → `AIHub.answer('more')`. Handle Enter in the JS shim (§2.3). No menus or choices, and nothing done on the card changes the round. Play begins only at `start`.
- `AIHub.ready()` once the sim is built, with no key press, before drawing the first frame.
- **World seed:** `info.seed` as the `Sim` seed on every copy. `Math.random` is not seeded in shared world and the Rust game doesn't use it.
- Countdown from `AIHub.time()` (negative for the first 3 s).
- `leave`: remove that merc. Host left: `end` arrives with `host-left`.
- `end`: no more input, nothing sent, sound off (master to 0, suspend).
- `AIHub.fail(msg)` when WebGPU can't start.
- **`AIHub.server` true** (host with no player): run the world, no local player, camera, input or drawing, and no audio. Keep stepping.
- **Rules:** network only through the hub. No WebRTC, sockets or `fetch` to anything else in a session. No chat, emotes or custom names. No `alert`, `confirm`, `prompt` or `window.open`. No quit or restart. No dev mode. Pause opens only a sound and controls overlay, and the world keeps running. Ignore Options while Create is held (the hub's chord).

### 7.4 Netcode (host-authoritative world, each copy owns its own player)
- **Every copy** builds the same terrain, stamps and props from the seed. The host alone runs AI, rules, fire and damage.
- **Client → host,** 15 Hz unreliable: own pose, look, stance, seat. Reliable, batched into the same cadence: shots fired (origin, direction, weapon), interact requests, throws. Own movement is local and trusted (no prediction error, no anti-cheat). A driver's copy owns its vehicle's pose.
- **Host → all:**
  - 10 Hz unreliable snapshot under **1,200 bytes**: integer arrays for NPCs, vehicles and other players near any player (position in cm, yaw in degrees, state flags).
  - Reliable events at up to 5 Hz: `fire_delta` runs (cell, state), kills, hits on a player, explosions, jams, objective changes.
- **Budget:** the client drops anything over 20 messages/s (burst 40), and 16 KB per message. All JSON.
- **Clients** interpolate others with a 120 ms buffer, play tracers and sounds locally from events, and spawn the same fire visuals from deltas.
- Keep the message layer in Rust (`engine/crates/pav_core/src/games/merc/net.rs`), pure and testable: an in-memory link with seeded latency, jitter and loss runs two `Sim`s in a test (§14).

### 7.5 Hidden tabs and low frame rates
The hub voids a round if the host tab stays hidden over 20 s, but a shorter stall must not kill the world. Pump the sim from a timer as well as rAF when `document.hidden`, and raise the per-frame tick cap on the host so it catches up. On a software GPU keep sending at the same rate.

### 7.6 Outside a session: the same round from the title menu
Title → Multiplayer → *This computer* or *Invite code*.
- **This computer:** `BroadcastChannel` auto-lobby between windows or tabs (works from `file://`). This is what your tests use.
- **Invite code:** WebRTC star with host-created offer, joiner answer, copy and paste codes (keyboard required for this one step; say so on screen). Use one reliable and one unordered channel per peer. STUN allowed here, never in a session.
- The host's copy mimics the hub's messages (`players`, `seed`, `time`, `start`, `leave`, `end`), so all Rust code is transport-blind. Names are "Merc 1–4" with the hub's seat colours. Results screen, then back to title.
- **Never construct an `RTCPeerConnection` when `AIHub.active`.**

---

## 8. UI and UX: 10-foot, controller first

### 8.1 UI kit (DECIDED: egui, drawn your way)
`engine/crates/pav_ui/src/tenfoot/` is a small immediate-mode kit on egui's painter. Keep its logic separate from winit, so tests can drive it with a `MenuInput` (up, down, left, right, confirm, back, tab, pointer position, click).

**Rules, at 1080p scale (`pixels_per_point = height/1080`):**
- Minimum text 28 px, body 32, menu items 48, titles 72.
- 5% safe margins.
- **At most 7 focusable rows on a screen.** Page instead of scrolling.
- Never a table, never web-style density. Cards with a big image or 3D stage and a few words.
- One obvious focus highlight with a soft move animation and a tick sound.
- Mouse: visible cursor in menus, hover moves focus, click confirms, wheel pages.
- **One set of screens.** Keyboard and mouse use the same screens and layouts as the controller, with their own prompts and native behaviour, never a separate desktop layout.

**Fonts:** you may add a typewriter face for dossiers and cards and a stencil face for titles. Fonts are the only binary assets the doctrine allows. Check the licence before bundling (e.g. "Special Elite", Apache 2.0; "Stardos Stencil", OFL), and credit them.

### 8.2 Prompts
`Prompt::of(action, device, glyph_setting)` draws in vector, not font glyphs:
- PlayStation ✕ ○ □ △ L1 R1 L2 R2 L3 R3 and D-pad (default)
- Xbox A B X Y LB RB LT RT LS RS (Settings option)
- Key caps and mouse-button icons for keyboard and mouse

Prompts switch on the frame the last-used device changes. They are short and large, and appear only for what you can do right now.

### 8.3 Screens
**Title (live world behind it, dusk, smoke on the horizon):** Continue, New contract, Multiplayer, Settings, About.

**New game:** difficulty → merc dossier (4 typed cards) → prologue.

**Pause:** Resume, Settings, Controls, **Dev mode**, Quit to title (the confirm card says how long ago the last autosave was).

**Settings** (tabs, one per page):
- Sound: Master, **Music default 10%**, SFX, Voices
- Controls: Prompts PlayStation/Xbox, Invert Y, Stick and mouse sensitivity, Aim assist, Toggle or hold for crouch and sprint
- Picture: Fullscreen, FOV, Brightness, Head bob
- Access: Subtitle size, Reduce camera motion, Assist markers, HUD Immersive/Standard

**Also:**
- Controls: one big diagram per device (on foot, vehicle)
- Contract card (typed, Accept and Decline)
- Shop catalogue, Locker, Sleep picker, Tape player (in hands)
- Death card, Ending cards, Results, Lobby
- **About/Credits:** paged, large text, §15 content

### 8.4 HUD
Default **Immersive**: no permanent bars. Damage shows segments for 3 s. Ammo shows on reload or when low. Interact prompts appear near the bottom centre, with an outline on the focused thing. Subtitles are large with a speaker name. **Standard** keeps health, ammo and a bearing strip always on. Everything else is diegetic.

### 8.5 Touch-only devices
Touch-only means `(any-pointer: fine)` false, `(pointer: coarse)` true and no controller connected. No touch controls at all (never show the engine's touch UI in this scene). Show **"Controller or keyboard required"** and a **Settings** button (tappable) over the running attract mode. Plugging in a controller or pressing a key brings the normal title.

### 8.6 Attract mode
**After 10 s without input on the title or any shell menu**, start a looping AI-played demo in the real world with real systems. Any input exits it, back to the title. It also runs behind the touch-only notice. It may cheat freely.

Script it in `engine/game/merc/attract.toml` as about 10 segments of 15–20 s each, with fades between them (a bot behaviour, loadout, time of day and wind per segment):
1. Dawn flyover
2. Technical on the road with the gunner firing
3. Guard post fight with a jam and clear
4. Molotov and wind-driven grass fire rolling over a squad (third-person sweep)
5. Pulling a bullet
6. Companion drag rescue
7. Map up while driving
8. Boat at dusk
9. Night dart stealth by firelight
10. Town market and bar

Show the title and a pulsing "Press any button" prompt (the correct glyphs). Music at the normal 10% default. Never touch saves. It must loop indefinitely without getting stuck (test it).

### 8.7 Dev mode (from the pause menu, not in sessions)
Pages, all controller-navigable:
- **Cheats:** God mode, Infinite ammo, No jams, No fever, Noclip, Invisible to AI, Show AI state and detection meters, Show fire grid, Show nav, Show FPS and tick stats.
- **Teleport:** every place in §6.3, plus "next objective". **Story:** jump to any contract or ending, complete objective, kill nearby.
- **Spawn and give:** enemy by role, squad, vehicle, weapon at chosen condition, diamonds, pills, syrettes.
- **World:** time of day, clock speed, wind direction and speed, weather, ignite at crosshair, extinguish all, regrow all, time scale.
- **Balance (live sliders with value and default tick, "Reset to defaults" per page and for all):** enemy accuracy, enemy damage, player damage, detection rate, enemy count multiplier, weapon wear, jam chance, weapon-break threshold, fire spread rate, burn time, wind strength, burn damage, fever interval, fever severity, syrette heal, companion rescue window, vehicle speed, vehicle toughness, contract pay, post re-man hours, player speed.

Every slider is a `Tunable`, so `pav set path=merc.fire.spread_rate value=…` does the same thing.

---

## 9. Art and animation

### 9.1 Art direction (engine's native style as the base)
**Keep the engine's cel shading, capsule puppets, primitive-built props and soft bloom.** Make it read as a **sun-bleached safari poster gone wrong**: flat planes of ochre, gold and rust, long shadows, heavy air.

**Palette:** dry grass `#c9a24b`, burnt `#2a2420`, laterite road `#a4552f`, river forest `#5d7a3a`, rock `#8b7b6a`, sand `#d8c08a`, water `#3d6a6a`, day sky `#9dbbd0` to horizon `#e8d3ad`, dusk `#f0a060` to `#5a4a6a`, night `#0d1322`, Council olive `#59603c`, Hand scarf `#b8342a`.

**Starting view recipe, then iterate with screenshots:**
```
outlines_on = "objects", outline_px = 1.5, cel_bands = 3, saturation = 0.9
bloom = 0.5, bloom_threshold = 1.0, haze = 0.35, haze_height = 12, shafts = 1.2
filter.temperature = 0.18, filter.contrast = 1.1, filter.vignette = 0.25, filter.grain = 0.08
light.sun_elevation = 14 at golden hour, light.sun_intensity = 1.1, light.ambient = 0.55, light.shadow_radius = 120
```
A low sun already gives good long tree shadows in the current engine. At `haze = 0.6` the distance washed out, so stay lower. Set `v.sky` in code. Point `shadow_center` (via `rig.target`) ahead of the player so the 2048 px sun map covers what you face.

**Materials:** add `engine/assets/materials/{rust_tin,laterite,stained_concrete,thatch,burnt_wood,painted_steel}.json`.

### 9.2 New assets (format-2 prop JSON in `engine/assets/props/lib/merc/`, §2.1 for shipping; use the engine's check loop)
- **Weapons:** the §5.3 list, each with `grip`, `fore`, `mag` and `muzzle` sockets, plus a separate magazine or shell part where reloads show it. Rust and wear through material params.
- **Hand props:** pliers, knife, syrette, pill bottle, lighter, wrench, map board, GPS, monocular, tape recorder, cigarette, tracker.
- **Vehicles:** technical, jeep, truck, river boat, plus wreck variants. Wheels drawn from `VehicleView`.
- **Buildings and military:** tin shack, mud-brick hut with thatch, concrete bunker, watchtower, sandbag walls, oil tanks, fuel drums, jerrycans, ammo crates, radio mast, roadside sign, hotel ruin pieces, cement silos and conveyors, church, pump machinery, cable ferry, market goods, bar interior, garage, shop shelving, tires, burnt car.
- **Vegetation:** flat-top acacia, baobab, thorn bush, river trees, reeds, termite mound, kopje boulders, grass clumps (custom mesh, `flags::GRASS`, dry colours, 0.5–1.2 m tall, thick enough to hide a crouching man).
- **Generic props:** use the store (`assets find=`).
- **Grass and burnable trees are view-side caches per chunk**, rebuilt when that chunk's burn version changes. The sim only needs the density function. Don't put them in `statics`.
- **Water:** carve the river into per-chunk water zone strips for swimming. Draw them with the engine's water, with ripples only near the player.

### 9.3 Animation (engine's native system as the base)
**The first-person rig uses the engine's own parts:**
- Biped `Skel`, key-pose clips (`engine/anim/merc_fp.json` in the existing readable format), and IK.
- Pin hands to the held prop's sockets (a small addition), so every gun is held correctly.
- Transform the upper body by camera rotation so the head joint is the eye, and draw only arms and held props.
- Add an additive procedural layer on the weapon root: walk bob, stick and mouse sway, recoil spring, breathing, fever tremor, wall pull-back (lower the gun when a short ray hits something).
- Clip files carry timed events (`mag_out`, `mag_in`, `sound: click`) as data.

**Author these with `anim_edit` and check with `animsheet` and `filmstrip`:**
- **First person (about 30):** idle and sprint per weapon class, draw, holster, reload for magazine, belt, shell, break-action, rocket; jam clear per class; bolt slap; throw; machete swing; backstab; syrette; six wound treatments; pills; map raise and lower; monocular; tracker; recorder; wheel loop; repair; overdose; pick up; gun breaking apart; being dragged (camera path plus arms); stand up after rescue.
- **NPC:** rifle idle, walk, run, strafe (cut from the Swat takes), crouch and fire, prone, fire upper-body (derive from `Pistol_Aim_*` and Swat), reload, jam clear, throw (existing), panic run and burning flail (new), drag someone (new), being dragged (new), wounded crawl (`MESH2MOTION/Crawl`, slower), deaths (existing), sit and bar idle, market carrying (existing). Mount weapons through the look's `weapon` field with an `asset` held by its `grip` socket (`engine/docs/ASSET_STUDIO.md`, "Library assets in game code", shows the form; you'll need a new `WeaponKind` for guns).
- **Vehicles:** wheel spin and suspension (existing), hood up, gun traverse.
- **Secondary motion (`rig.rs` chains):** the red rag, scarves, antenna whip.

---

## 10. Audio (all in code, no audio files; extend `pav_audio`)
Everything renders through the same Rust code live and offline (`render_events`), so tests can measure it.
- **Engine additions:** buses (Master, Music, SFX, Voice); looping voices with live gain, pitch and cutoff; a data-driven patch table instead of the closed match; a simple feedback delay for space; distance low-pass; ducking.
- **Music: default volume 10%** (a constant in settings, test it). Sparse, generative and code-written:
  - Pluck (Karplus-Strong) guitar and thumb-piano figures, hand drums, a low drone, distorted guitar in combat.
  - States: Title, Explore day and night, Tension, Combat, Fever (detuned pads), Town (a tinny transistor-radio highlife loop with gibberish singing, placed in the world), Ending.
  - Original melodies only.
- **SFX:** one patch set per weapon family (noise burst + low thump + tail by environment), dead click, jam clatter, bolt slap, reload parts, rag flutter on high wind, fire crackle and roar by nearby cells, explosions, engine loops by RPM and damage, tyres on dirt, boat outboard, wrench, syrette, pliers, finger snap, pills rattle, footsteps by surface, grass rustle, insects and birds by time of day, wind by speed, thunder, tracker beeps, menu ticks.
- **Voices: Animalese-style gibberish.** A formant synth turns each subtitle's syllables into short vowel-consonant blips at a per-character pitch and timbre, with a little contour for questions and shouting. Same system for barks (faster, louder) and tapes (through a tape-hiss, band-limited filter). Subtitles on by default.
- **Fever and critical states** low-pass the world and add tinnitus and heartbeat.
- **Web:** the browser only starts audio after a gesture (`resume_audio` exists). Attract mode is silent until the first gesture (which exits it anyway) unless the context is already running.

---

## 11. The demo: contracts and beat sheet
Data in `engine/game/merc/contracts.toml`: objectives as a small state machine with triggers, approaches, pay and consequences. Every objective exposes a `Goal` the bot and the dev tools can read.

| # | Contract (giver) | What happens | Teaches or shows | About |
|---|---|---|---|---|
| A0 | **Landing Fees** | Night landing at the airstrip, crates stencilled for both sides, Bakker's goodbye. Walk the road with the map up. The fever hits at the bar door, and you wake in the back room with a companion and pills | Look, walk, map, GPS, fever, pills, the town | 6 min |
| A1 | **On the House** (Papa Lazare) | Clear Kilo 38. Scripted first jam. Scripted first down and companion rescue. Wound treatment. Loot a rusty rifle. Claim the Pump House. First shopping trip | Combat, jam, rescue, treatment, loot condition, safe house, shop, sleep | 10 min |
| B1 | **Dry Season** (Tshala) | Burn the Hand's depot at Ombe Flats. Read the wind, approach upwind, light it, and get out as it turns. Passes GP2 and GP4 by road | Vehicle, technical, guard posts, monocular, fire, wind, diamonds | 12 min |
| B2 | **Water Rights** (Ruvuma) | Undo Tshala: sabotage the Council's pump station at night by boat. Sleep till midnight, camo, dart rifle | Sleep picker, night, stealth, boat, swimming, machete | 10 min |
| B3 | **Papers** (Sister Perpetua) | Drive medicine to the mission. Ambush, pursuit, engine failure: repair under fire. Reward: pills | Pursuit, damage stages, repair, fever economy | 8 min |
| B4 | **A Better Way** (companion) | A companion's alternate plan on a convoy goes wrong: they go down in burning grass. Patch them or give the overdose | Companion down, mercy, permadeath, Infamy | 8 min |
| C1 | **Inspection** (Tshala) | Kill the Hand's negotiator at Hotel Splendide from the ridge. Tag with the monocular, wind on the bullet, get out past GP5. Consequence: **the ceasefire ends** | Sniper, tagging, world state | 8 min |
| C2 | **Receipts** (Ruvuma) | Hijack the arms convoy from the airstrip on the quarry road. Crates are stencilled for both sides, and the ledger is mentioned. Heavy fight with rocket man and flame trooper | Special weapons, explosives, tape reveal | 8 min |
| C3 | **The Town Burns** | Kilometre 40 ablaze at night. Get through, get Papa Lazare or Mr. Desai out (you can save one). Ash, panic, soldiers looting. Shops move to the Boat Shed afterward | Fire as a level, moral beat, town after | 6 min |
| D1 | **Last Order** | Assault or infiltrate the Cement Works, both armies present, surviving companion arrives. The Chandler, the ledger | Everything together | 10 min |
| D2 | **Ending** | Burn it (fire finale) / Read it (hold the mast 3 min) / Take the chair. Final tape, credits, return to title | Choice | 3 min |

Side content open from A1 on: 12 diamond caches, 6 tapes, 6 guard posts, 3 safe houses, 3 bus stops (fast travel: fade, time passes, fare 1 diamond), wildlife, two minor clinic errands.

**Coverage rule:** the game keeps a `coverage` set in `Game::status` (one flag per row of §15's feature list). The playthrough test asserts every flag is set. That is how you prove the demo shows ALL features.

---

## 12. Architecture

### 12.1 Dev folder
```
engine/                     the shardfall clone, with its .git (git diff answers "what did you change?")
  crates/pav_core/src/games/merc/   rules: mod.rs (Game impl), player, weapons, fire, wind, ai, squads, vehicles,
                                    companions, fever, contracts, economy, map, net, terrain, attract, bot
  crates/pav_view/src/merc/         first-person camera, viewmodel, sky, grass and tree caches, rings, map prop, fire look, tracers
  crates/pav_ui/src/tenfoot/        UI kit, glyphs, every screen
  crates/pav_audio/src/             bus.rs, music.rs, voice.rs alongside lib.rs
  crates/pav_app/src/merc_shell.rs  shell state, pointer lock, net pump, test hooks
  crates/pav_tools/src/             new tools: mapshot, fire, merc_cmd
  game/merc/*.toml                  world, weapons, enemies, contracts, strings, tapes, barks, shop, attract, tuning
  game/merc/stamps/*.toml           compounds (room format)
  anim/merc_fp.json, anim/merc_npc.json
  assets/props/lib/merc/, assets/materials/
  web/index.html                    session client, hub metas, input and net shims
hub/                        session.js, harness.html, bridge.js, round.js as downloaded
tests/                      the one command, Playwright scripts
tools/                      build-game.sh (wasm, pack, copy to the final name and place)
notes/                      title.md, feedback.md (running answers for the feedback questions)
```
Keep every file you make in your own folder, including caches (`CARGO_TARGET_DIR` stays in `engine/target`), and don't read the folders beside yours: other agents work there. Use `CARGO_BUILD_JOBS=12` at most: the machine is shared. No CDN dependencies are needed, since the page carries everything.

### 12.2 First-person camera
Add a first-person path to `CameraRig`: `fp: Option<FpCam { eye, yaw, pitch, roll, fov, near, far }>`.
- `data()` builds the view from it, with `near = 0.08` and `far = 3000`.
- `forward`, `up`, `ground_axes` and `relative_move` use its yaw and pitch.
- `eye` = interpolated feet (or vehicle seat) + smoothed stance height.
- **Rendered yaw and pitch = sim value + input not yet consumed by a tick, so the camera never lags the mouse.**
- `rig.target` goes 40 m ahead of the player, so shadows cover what you face.
- `Scene.cutaway` off.
- The sim's own yaw and pitch stay in the game's state (the source of truth for shooting).
- Chase camera and the third-person shots are ordinary `CameraParams`.
- Prove this first (§13 M1).

### 12.3 Input
Extend `InputFrame` (it must stay `Copy`):
- `look: Vec2`: radians since last tick, summed and zeroed like `pressed` in `simhost.rs`
- `axes: Vec2`: analog throttle and brake
- `act: u32`: encoded menu or world action, so replays and the bot use them

Add button bits for reload, next weapon, throw, melee, aim, map, monocular, heal, pills, tracker, seat, camera (17 bits are free).

`pav_app/input.rs` gets a third layout for this game (§4), and `poll_gamepad` passes trigger analog values. Mouse look on the web: read `movementX/Y` in the JS shim (§12.5), which is simplest to test (§2.4). Native can use `DeviceEvent::MouseMotion`. `move_dir` stays world-space: rotate the stick by yaw. Only Esc stays a system key outside dev mode.

### 12.4 Game to view and UI
- Add `Game::frame_extra` or a typed field `RenderFrame.merc: Option<Arc<MercFrame>>`, like the existing `game: Option<Arc<GameFrame>>`. `MercFrame` holds what the view and UI need: FP state, viewmodel state, inventory, prompts, map data version, burn deltas, wind, time.
- `pav_view::merc::draw(scene, frame)` runs inside `ViewBuilder::build`.
- `pav_ui::tenfoot` draws over it, and also from `headless.rs` so `pav capture` and `ui` see it.
- All game state stays in the `Game` struct or entities (`Clone`, serde). View caches are `#[serde(skip)]` or live in the view.
- Randomness only from `sim.state.rng`. No clock, no `HashMap` order reaching state. The "Key rules" in `engine/AGENTS.md` apply to your game; its maintainers' workflow (history, PRs, escalations) does not.

### 12.5 Web layer
`engine/web/index.html` gets, in order: `<meta charset>`, session client, hub metas, then a plain script defining:
- `window.gameNet`: `init`, `send(json, reliable, to)`, `poll()` (drains a JSON string array), hub events queued, standalone transports
- `window.gameInput`: pointer lock request, `movementX/Y` accumulation, lock-change flag, `(any-pointer: fine)`
- `window.gameTest`: see §14.3

Rust calls them through `#[wasm_bindgen] extern "C"` with `js_namespace`, or `js_sys::Reflect`. No snippets (§2.1). Keep the glue free of the literal strings `<script`, `</script` and `<!--`.

`tools/build-game.sh` runs `engine/scripts/build-web.sh --single-file --scene merc --title "<title>" --description "<line>" --theme-color "#2a2420" --out <the final path TASK.md names>`, then confirms the size, the first-script position and that `session.js` is byte-identical.

### 12.6 Data and tools for later designers
All balance, weapons, enemies, contracts, text, shop, attract, map features and compounds are data, embedded at build time and re-read from disk in native tools. Add `pav` tools (`engine/AGENTS.md`, "Adding a tool"):
- `mapshot` (top-down PNG of terrain, POIs, roads, burn state)
- `fire` (start, step, report)
- `merc_cmd` (any `act`)

This, with `room_check`, `asset_edit`, `anim_edit`, `animsheet`, `filmstrip` and dev mode, is the designer toolchain TASK.md asks for.

---

## 13. Build order
Each milestone ends with its tests in the one command. Commit to your engine clone's git as you go. **Never use subagents or workflows to debate, review, judge or audit.**

| M | Build | Done when |
|---|---|---|
| **M0** | Clone, build, register `merc` scene (copy the starter as in `engine/docs/MAKE_A_GAME.md`, which is the first engine page to read), page builds, session client in place, `hub/` downloaded, harness passes with a stub round, title chosen, `tests/run.sh` prints one line | `tests/run.sh` shows 0 failures, harness 4 scenarios pass |
| **M1** | First-person camera, input layer, pointer lock, gamepad layout, `tenfoot` prompts, viewmodel with the rifle (hands on sockets, sway, recoil, reload, the red rag), hitscan, a target dummy, sky dome, NO_FOG | Sim tests for look, move and hits pass. A 1920×1080 screenshot looks like a game you'd play. **Fix the look now: everything depends on it.** |
| **M2** | Terrain and `world.toml`, biomes, roads, river, rings, grass and trees, time of day, stamps on pads, town blocked out, `mapshot` | `mapshot` shows the whole map. Bot walks airstrip to town. Screenshots at dawn, noon, dusk and night |
| **M3** | Full weapon table, condition and jams, damage and treatments, NPC roles, detection, cover, guard post | Bot clears a post on 10 seeds. Jam, wear and detection tests pass |
| **M4** | Fire, wind, smoke, burn visuals, explosions, weather, AI reactions | Fire tests (§14.1). Depot fire screenshot makes you want to play |
| **M5** | Vehicles on slopes, relative controls, boat, seats, mounted gun, damage and repair, AI pursuit | Bot drives the road end to end. Boat and repair tests pass |
| **M6** | Fever, safe houses, sleep, economy and shop, map and GPS and monocular, tracker and caches, tapes, saves | Tests for each. Save and reload round trip |
| **M7** | Companions, contracts A0 to D2, endings, barks, Infamy, campaign bot, coverage flags | **Scripted playthrough reaches all three endings with every coverage flag set** |
| **M8** | Audio buses, SFX, music, voices | Audio tests pass, default music gain 0.10 |
| **M9** | Shell: title, settings, pause, dev mode, attract, touch-only, About | Browser tests pass (§14.3) |
| **M10** | Session round, own card, netcode, server mode, standalone This computer and Invite code | Loopback test, harness 4 scenarios on the real game, two-page standalone round |
| **M11** | Art pass on every prop, animation pass on every clip, writing pass on every line, balance with sliders, final build, About/Credits, exit interview | §16 checklist complete |

---

## 14. Testing (TASK.md: one command, only failures and a one-line count)
`tests/run.sh [sim|ui|audio|browser|hub|all]` prints each failure's name and reason, then one line like `PASS 212 FAIL 0`. Rerun only the part you changed. Use screenshots only for what a script can't check.

### 14.1 Sim (`engine/crates/pav_core/tests/merc.rs`, native, fast)
- **Foundations:** boots on 3 seeds. Same seed and inputs give the same hash; `record_save` and `replay` hold. Snapshot round trip. Data lint: every TOML parses, every asset and clip named exists, every string key resolves, and no string contains TODO, TBD, placeholder or lorem.
- **Player:** look clamps, stick movement follows yaw, stances change eye and capsule height, hard landing wound.
- **Weapons:** head, torso and limb multipliers. Wall blocks shots. Wear per table. Jam rate within tolerance at c = 35 over 5,000 rolls. Jam blocks firing until cleared. Weapon breaks. An NPC's gun jams and it stops firing.
- **Fire:** wind 8 m/s downwind reach ≥ 3× upwind after 60 s. Calm spread is roughly round. Roads and river stop it unless embers jump. Burnt cells don't re-burn, then regrow. Rain extinguishes. Barrel explodes and ignites. NPCs leave burning cells. A burning NPC spreads fire. Fuel tank cooks off. Snapshot size stays small after a big burn.
- **Detection:** the grass, night and posture comparisons of §5.10. Noise brings investigators. Smoke blocks sight.
- **AI:** squad takes cover and at least one flanker repositions. Max 4 shooters at once. Morale break. Post re-mans after its timer and never in the player's sight.
- **Survival:** warning precedes attack. Pill clears it. No pill means black-out, wake at safe house, fee taken. Syrette and treatments restore the right amounts. Wound type follows damage cause.
- **Companions:** rescue fires once per rest and player stands up at 50. Downed companion timer. Patch and overdose. Death stays dead across save and load.
- **Vehicles:** climbs the ridge road. Recovers from a roll. Damage stages. Repair. Explodes and ignites grass. Boat floats and stops at shallows. NPC driver follows the road. Seat changes.
- **Economy and saves:** buying with too few diamonds changes nothing. Tracker rate rises near a cache. Save and load restores all listed fields.
- **Contracts:** each contract completes under the bot on 2 seeds, and each failure condition fires.
- **Scripted playthrough of the whole game:** the bot plays new game through each of the three endings using only inputs and `act`s (no teleporting except the bus, no cheats, normal difficulty). Assert the outcome is reached, all `coverage` flags are set, and wall time is under a limit you set (this must stay cheap enough to rerun). Expose it through `Game::bot`, so `pav play bot=true seeds=3` works too.
- **Attract:** five full loops, every segment reached, never stuck, no save written.
- **Netcode loopback:** host and client `Sim`s on the in-memory link at 150 ms, jitter 50, 5% loss. Both see the same fire cells within 1 s, kills and objectives agree, `finish` is issued once, unreliable messages stay under 1,200 bytes and sends stay under 20 per second. A client leaving and the host leaving both behave.

### 14.2 UI and audio (native)
- **UI** (`MenuInput`): focus moves and wraps, back works, no screen exceeds 7 rows, hover moves focus, glyphs follow device and setting, dev sliders change `Tunable`s and Reset restores defaults, attract starts at 10 s of idle and not before, any input exits.
- **Audio** (`render_events`, offline): music bus RMS at default ÷ RMS at full is 0.10 ± 0.01. No NaN or clipping. Each gun family differs from the others. Crackle level rises with burning cells. Voice output is non-silent, differs by speaker. `find engine -name '*.wav' -o -name '*.mp3' -o -name '*.ogg'` finds nothing of ours.

### 14.3 Browser (Playwright on the real page, flags from §2.2; one or two browsers at a time)
Rust publishes `window.__game = { status: <JSON string>, ui: <JSON string> }` every 15 ticks and reads commands from `window.gameTest.queue`. `?test=1&nodraw=1` skips scene drawing so the sim runs at speed. These hooks are inert in normal play.
- Page opens from `file://`, title draws (screenshot past blank), no page errors. Enter, Space, Enter, Space leaves it drawing (this is what the hub's own solo check does).
- **Controls:** keyboard, mouse hover and click, pad stub (§2.4). Prompts follow the device. Xbox setting changes glyphs. Synthetic mouse changes yaw under pointer lock. Lock lost opens pause.
- **Idle:** no input for 10 s starts attract. A key, a pad press or a mouse move exits it.
- **Touch-only:** Chromium with a phone profile (`has_touch`, `is_mobile`) shows "Controller or keyboard required" and a tappable Settings. No touch controls appear. Attract runs. Also check that WebKit (which has no WebGPU here) shows the page's clear message rather than a blank page.
- **Dev mode** from pause: toggle God mode, move a slider and see the value in status, Reset.
- **Saves:** save, reload, Continue, from `file://`.
- **Audio:** `status.audio.music == 0.10`. An init script wraps `AudioNode.connect` to add an analyser before the destination, and levels are non-zero after a gesture.
- **About** contains every Source Information field, and all feedback sections are filled.

### 14.4 Hub
A script copies the final page beside `hub/*`, serves with `python3 -m http.server 0 --bind 127.0.0.1`, parses the port the OS picked, **fetches the page and confirms its `<title>` is yours before trusting a result**, runs the cases below, and stops only the PID it started (never `pkill`, `killall`, `fuser -k` or whatever holds a port). Other agents share this machine's ports and processes. Assert `window.__hubCheck.pass` for each, with the game opened as `harness.html?game=<page>&…`:
- `players=2&auto=1`
- `players=4&latency=150&jitter=50&loss=5&auto=1`
- `players=4&latency=150&jitter=50&loss=5&scenario=host-leave&auto=1`
- `players=2&scenario=server&auto=1`

Also: two pages (or contexts) play the standalone round over `BroadcastChannel` and over a copy-pasted WebRTC code through to the results. Then the on-its-own check: client inactive, `Math.random` untouched.

### 14.5 Screenshots worth taking (1920×1080, 10-foot judgment)
Golden hour on the plain, the depot fire at night, the viewmodel with each weapon class, wound treatment mid-animation, map in hand, title, shop, settings, pause, dev balance page, the bar. Check that text is readable from the couch. Fix what looks wrong.

---

## 15. Feature list for the coverage flags, and what ships in About/Credits

**Coverage flags (each set by real play; a test passes on the union across the three playthrough runs, since no single run can both save and lose the same companion or reach every ending):** map raised, waypoint set, GPS followed, monocular tag, wind rag visible at speed > 6, jam cleared, enemy jam seen, weapon broke, weapon bought, locker used, syrette, each wound treatment type, fever warned, pill taken, black-out (bot route), player rescued, companion patched, companion overdosed, companion died, better-way taken, fire lit by each igniter class, 500+ cells burned in one fire, enemy panicked, animals fled, explosion chain, rain extinguished, stealth kill, dart kill, night contract, sleep used, safe house claimed, post cleared, post re-manned, technical driven, mounted gun fired, repair done, boat driven, bus taken, tape played, cache found by tracker, diamonds spent, each contract, ceasefire ended, town burned, each ending.

**About/Credits (paged, large text, also in your chat reply, per TASK.md):**
- **Source Information:** every field in TASK.md's list, with the values TASK.md gives (Date, Environment, Model) and `added on import` for Usage. Write `unknown` for what you can't confirm.
- **Testing Feedback, Engine Feedback, Prompt Feedback:** your answers to each question. Keep `notes/feedback.md` as you go: count issues caught, note the critical ones, note every time you read engine source and why.
- **Credits:** engine, clip libraries with their licences (from `pav clips name=…`), fonts, this plan.

**Exit interview:** write it exactly as TASK.md's shape, beside the final HTML, and check it parses. Suggested `aiHub` values: `type` Game, `genre` Shooter, `source` Far Cry 2, `series` Far Cry, `players` 1–4, `controls` "Stick or WASD move · R2 or left mouse fire · L2 or right mouse aim · Square or R reload and clear jams · D-pad or M for the map", `tags` `["3d","first-person","co-op","story","vehicles","exploration"]`. Fill `name`, `tagline`, `description` in the game's voice.

---

## 16. Done

Every line must be true before you stop:

- [ ] Original title by TASK.md's process, on the title screen. No names from §1.4.
- [ ] One self-contained HTML file with the name and location TASK.md gives. Opens from `file://` in Chrome or Edge with WebGPU.
- [ ] First-person game, on the Pavilion engine, native style extended with new assets and animations.
- [ ] All systems in §5 present. All contracts in §11 playable. Three endings. No TODOs, placeholders or stubs anywhere, including in text.
- [ ] Demo long enough to show everything: playthrough asserts all coverage flags.
- [ ] Music defaults to 10%. All sound, music and gibberish voices are generated in code.
- [ ] Dev mode reachable from pause: tools, live sliders, reset to defaults.
- [ ] Attract mode after 10 s of idle on title and menus, loops, any input exits.
- [ ] Controller first: every screen works on a DualSense (stubbed) with PlayStation glyphs, Xbox glyph option, keyboard and mouse native with their own prompts, hover moves focus, clicks work, no dense screens.
- [ ] Touch-only: no touch controls, the required message, a Settings button, attract running.
- [ ] Hub: session client unmodified and first, all four harness cases pass, the on-its-own check passes, standalone multiplayer works over two pages.
- [ ] `tests/run.sh all` prints 0 failures and a one-line count.
- [ ] Source Information, Testing, Engine and Prompt Feedback are in About/Credits and your chat reply. Exit interview saved and parses.
- [ ] Your background processes are stopped, by PID. No stray files outside your folder.

---

## 17. Risks I would watch

| Risk | Why it matters | What to do |
|---|---|---|
| Up-close look of capsule arms and primitive guns | The whole game is viewed through them | Look test at M1. Add part detail (sights, rivets, tape on grips), use materials, keep outlines on objects. If SDF capsules look wrong that close, use rounded-box or mesh parts for hands |
| Grass reads as noise in first person | Half the screen | Tune colour variation, clump size, no outlines on environment. Grass must read as a surface, not a scatter. Compare screenshots |
| Bot complexity for a full playthrough | It's a required test | Keep contracts as objective graphs that expose a `Goal`. Build the bot as you add each contract, never at the end |
| Long rebuilds (about 2 min each for `pav`, the test binary and wasm) | Time | Put numbers in TOML and use `pav_core`'s disk read path for data. Batch code edits. Use `cargo test --test merc <filter>` |
| Vehicle physics on slopes | Rapier raycast cars can jitter on trimeshes | Keep `FIX_INTERNAL_EDGES`, smooth road corridors, cap angular velocity, add upright assist |
| Software-rendered browser tests are slow | Tests get flaky | Use `?nodraw=1` and state checks. Wait on state, never on fixed sleeps. Smallest viewport that still proves the point |
| Far-plane depth precision (`Depth32Float`, standard Z, near 0.08, far 3000) | Distant z-fighting | Avoid coplanar far geometry, or move to reversed Z if it shows (touches `renderer.rs` compare functions) |
| Memory (earlyoom ends the biggest browser) | "Target closed" isn't your bug | Fewer browsers at once |

---

## 18. Source notes (from my knowledge of the source; research more if you like)
Far Cry 2 (Ubisoft Montreal, 2008): first-person open-world shooter in an unnamed African civil war, inspired by *Heart of Darkness*. Known for: dynamic wind-driven grass fire; weapons that degrade, jam and break; malaria managed with pills; a hand-held map and GPS instead of a HUD map; buddies who rescue you and can die permanently, sometimes by your mercy; diamonds as currency with a tracker; safe houses; visceral first-person healing; car repair animations; guard posts on every road; recorded interviews with its villain; a refusal to offer a good side. Common complaints we design around: guard posts re-manning too fast, long empty drives, and repetitive mission structure. Use this as a list of *kinds of things*, not a source of content.
