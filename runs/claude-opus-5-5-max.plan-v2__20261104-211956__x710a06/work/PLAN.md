# PLAN: an over-the-shoulder action-horror game on the Pavilion engine

You are building this without the person who wrote it. Every decision here is already made, so don't reopen one unless something in this plan is impossible. If it is, make the smallest change that keeps the design and note it for your Engine Feedback.

- **The game** is what this plan calls your game. You pick its title the way your TASK.md says, a playful riff on the source's name. A riff, not the name itself. No text in this plan depends on the title.
- **`tide`** is the engine key for the game: scene name, code folder, asset pack. It never appears on screen.
- **Paths** are relative to your dev folder. `engine/` is the engine clone inside it, and paths starting `crates/`, `docs/`, `web/`, `anim/`, `scripts/` or `assets/` are inside `engine/`.
- **[V]** marks something the planner tested on this computer on 2026-11-04 with the real engine. Everything else is design you'll be first to run.

---

## 1. The game in one page

**Genre and perspective:** third-person, over-the-shoulder action-horror. You plant your feet to aim a laser sight, a crowd closes in, and precise shots set up melee follow-ups. Resources are tight, a trader keeps turning up, and set-pieces come one after another. The camera stays behind the right shoulder for the whole campaign, with scripted cuts for scenes.

**Premise.** October 1979, North Atlantic. **Cass Harrow** (she/her), a deadpan Senior Field Adjuster for Ironbridge Mutual Marine & General, lands on **Saltmarrow**, a fog-bound fishing island, to close one claim: the Vane & Daughters Fine Tinned Fish cannery has reported a total loss. The islanders are polite, tidy and homicidal. They have taken the Brine, which seeds **saltroot**, a parasitic barnacle that lives in the marrow and rewrites its host. The island's tins are the delivery system, and ten million of them sail on the morning tide unless the owner signs the manifest. Cass has to find the owner, **Mrs. Ottoline Vane** (she/her, 74, unimpressed by everything), get her off the island, and stop the shipment. She does it while the Harbormaster fines her over the town tannoy for every crime she commits, and something very large waits under the harbor: **the Underwriter**.

**Tone.** A straight-faced B-movie pulp thriller. The horror is real, the dialogue is cheesy on purpose, and nobody winks at the camera.

**Pillars**
1. **Stop. Breathe. Shoot.** Aiming plants your feet. Every shot is a choice about where the crowd will be in two seconds.
2. **Shots open doors for boots.** Where you hit decides how the enemy reacts, and each reaction offers a melee follow-up. Good players string these together into chains.
3. **The box is a puzzle and the trader is a friend.** Items are shapes in a grid. Cash, ammo and space are always slightly short. The blue lamp means you can breathe.
4. **Always one more thing.** No two chapters play alike: siege, factory, escort on a rising tide, cliff ride, lighthouse, sea monster.
5. **Paperwork is the joke, the barnacle is the threat.** Fines, forms and one-liners run alongside real menace.

**What ships**
- A five-chapter campaign, about 50 minutes first time through.
- *Claims Rush*, a 1 to 4 player co-op score mode that plays in AI Hub sessions and alone.
- Attract mode, dev mode, settings, saves, and a full 10-foot UI.
- All content is data-driven, so the rest of the game could be built with the same tools (§16).

---

## 2. Originality rules (hard rules)

The game may share genre and mechanics with the source: planted over-the-shoulder aiming, body-part reactions, melee follow-ups, grid inventory, a travelling trader, weapon tuning, treasure combining, escort, crowd control. It must **not** recreate the source. Do not use any of these:

- Names, characters, creatures, organisms, factions or places from the source. No secret-agent rescuing a president's daughter. No Spanish village, castle or military island. No head-burst parasite reveal.
- The chainsaw man, the church bell that calls enemies away, the lake monster fought from a boat, a knife-fight rival, the attaché case, typewriter saves, herbs, or the trader's famous lines.
- Its music, its logo, its look, or any of its dialogue, including its well-known jokes.

Everything in this plan already has its own replacement (saltroot and barnacle whips, the foghorn and the walk into the sea, the tackle box, the shortwave logbook, the brass-helmeted Old Fathoms, the hook-and-winch Flenser). If you add content, invent it, and don't borrow from the source to fill a gap.

---

## 3. Verified facts and traps

Read this section twice. Everything here is something that went wrong, or nearly did, when the planner tried it.

### Pins and build times [V]
```sh
git clone https://github.com/michaelcrosato/shardfall.git engine && git -C engine checkout 49ef2ba
mkdir -p tools/hub && for f in README.md session.js harness.html bridge.js round.js; do
  curl -fsS -o tools/hub/$f https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/$f; done
```
- Rust 1.98.1 and the wasm32 target are installed. `wasm-bindgen` 0.2.129 matches `Cargo.lock`.
- From `engine/`: `CARGO_BUILD_JOBS=8 cargo build --locked -p pav_tools --bin pav` takes 4 min the first time and about 1 min after a core change.
- `CARGO_BUILD_JOBS=8 scripts/build-web.sh --single-file --scene tide --title "<title>" --description "<line>" --theme-color "#0e1620" --out <path>` takes 2 min the first time and about 1 min after, and gives an 11.4 MB page.
- Native sim speed was about 21,000 ticks/s in a test room with 17 entities and no AI. Expect less with crowds, but still far above real time, so a scripted run through the whole game stays practical.
- Adding a crate dependency (for example `js-sys` to `pav_app`) makes `--locked` fail until a plain `cargo build` has updated `Cargo.lock`. `build-web.sh` always uses `--locked`.
- Read `engine/docs/MAKE_A_GAME.md` whole. It's short and accurate. Ignore its "Report back" format: your TASK.md's feedback questions replace it.

### Browser and hub
- **Chromium flags [V]. Use exactly these everywhere:**
  `--no-sandbox --autoplay-policy=no-user-gesture-required --enable-unsafe-webgpu --enable-features=Vulkan --use-vulkan=swiftshader --use-webgpu-adapter=swiftshader --use-angle=swiftshader`
  - The shorter set in TASK.md's computer notes (`--enable-unsafe-webgpu --enable-features=Vulkan --use-webgpu-adapter=swiftshader`) kills the whole GPU channel as soon as 3 or more WebGPU copies share a browser. The log shows `SharedImageStub: Unable to create shared image`, then `A valid external Instance reference no longer exists`, then a wgpu `unwrap` panic and `RuntimeError: unreachable`, which fails the hub's "no errors" check. It looks like a game bug and isn't.
  - With the full set, the engine's starter plus a JS stand-in for game logic **passed** the harness on `latency=150&jitter=50&loss=5&play=8000` at 2, 3 and 4 players, at 4 with `scenario=host-leave`, and at 2 with `scenario=server`. Each run took 10 to 20 s, and `ready()` fired within 2 s of load.
- **Reading the server's port from a script [V]:** `python3 -m http.server 0 --bind 127.0.0.1` block-buffers its "port" line on a pipe, so `readline()` hangs forever. Use `python3 -u -m http.server 0 --bind 127.0.0.1`. Stop it by the PID you started.
- `python3 -I` can't import Playwright here [V]. Run your own test scripts without `-I`.
- **Software rendering is slow [V]:** about 1.5 fps at 1280×720 and 5 fps at 640×360 with the bare starter, and 2 to 3 fps at 640×360 with a dressed harbor scene. The sim catches up at most 8 ticks per frame (`simhost.rs`), so a browser runs at 10 to 40 ticks/s against the real 60. **Never play the game through in a browser.** Play it through natively (`pav`, `cargo test`). Browser tests only check boot, input routing, UI and the hub, at 640×360.
- **First frame can take over 14 s to show on software rendering [V].** The "draws its screen" check in the hub's own conformance script (`scripts/hub-check.mjs` in the AI Hub repo) screenshots after about 7 s and needs 1,200 bytes more than a blank page, so a blank canvas fails it. Keep a DOM splash (title text on dark) over the canvas until the first frame has really presented (`queue.on_submitted_work_done`). This also helps real players.
- WebGPU canvases do appear in headless screenshots with these flags [V], and the stub pad reaches `gilrs` [V]: the log says `gamepad connected`, and the engine's guide switches to gamepad.
- `pack_single_html.py` refuses wasm-bindgen snippets. **No `inline_js` and no `#[wasm_bindgen(module=...)]`.** Put JS in `web/index.html` and bind with `#[wasm_bindgen] extern "C" { #[wasm_bindgen(js_namespace = __hub)] fn poll() -> String; }`.
- `session.js` goes in unmodified, as the first script right after `<meta charset>`, exactly one copy. The packer needs exactly one `<title>`, `<meta name="description">`, `<meta name="theme-color">`, manifest link and `</body>` in `web/index.html`.
- Harness key presses are synthetic and dispatched to `doc.activeElement` or `body`, so handle the card's Enter in a `window` listener in JS, not through winit (§11).
- Handle `time-up` in JS: the sim may be running at 1 fps and the host has only 5 s to call `finish()`.

### Engine traps
- **Disk-only packs don't exist in the browser [V].** `LIB/quaternius_medieval_village/*` and `LIB/kenney_mini_dungeon/*` work in `pav` but show a red "Room file errors" panel in the build. Use only `BUILTIN/*`, `LIB/core/*`, `LIB/kaykit_adventurers/*` and your own shipped pack (§14.2).
- **An emissive part above 0.5 lights the room [V].** A tiny laser dot at `emissive: 6` turned the whole harbor red. Small glows stay at 0.4 or below. Only real lamps go higher.
- **`[view]` per area.** With tilt below 30° the view cuts away everything in front of the player unless you set `"cutaway.front_cut" = false`, and also `"cutaway.height_cut" = false` and `"cutaway.fade" = false`.
- **Unknown block fields in TOML are ignored silently [V].** A legend's `material` did nothing until patched (§14.1 E1).
- `NavGrid` only treats blocks with tops near y=0 as floor. Upper floors need E8.
- A game's `[view]` only re-applies when `(room id, view_serial)` changes, and a rebuilt standalone room is always id 0. Bump `view_serial` on travel or the look won't change.
- `InputFrame` is `Copy`, so `cmd` must stay `Copy`.
- `Sim` keeps rewind history. Set `history_seconds = 0` in your `build`.
- `Sim::raycast` excludes the player only. Bullets test bodies with your own capsule code (§5.2).
- KayKit figures are chibi-proportioned [V]. Don't use them for people in this game.
- Puppets default to `eyes_to_camera = 0.6`, a cheat for high cameras that slides the eyes toward the viewer. Set it to 0 on every look: this camera sits behind the head.

---

## 4. How it plays

### 4.1 Controls

| Action | DualSense (standard mapping) | Keyboard and mouse |
|---|---|---|
| Move | Left stick (half = walk, full = jog) | W A S D |
| Run | Hold ✕ while moving | Hold Shift |
| Look | Right stick | Mouse (pointer lock) |
| Aim (plants feet) | Hold L2 | Hold right mouse |
| Fire | R2 | Left mouse while aiming |
| Knife | L1 | F, or left mouse when not aiming |
| Interact and follow-up | ✕ | E, or left-click the highlighted thing under the crosshair |
| Reload | □ | R |
| Sidestep (while aiming or moving) | ○ | Space |
| Quick turn | Left stick back + ○ | Q |
| Throwable | R1 (aim first for an arc) | G |
| Tackle Box | △ | Tab or I |
| Map | Create | M |
| Quick weapons | D-pad up, left, right | 1, 2, 3, plus mouse wheel to cycle |
| Mrs. Vane: follow or wait | D-pad down | C |
| Swap shoulder | R3 | V |
| Pause | Options | Esc |

- ✕ does the prompted action on press. With no prompt showing, holding it runs.
- The hub owns Create + Options held together: ignore Options while Create is held.
- In `gilrs`, `LeftTrigger` is L1 and `LeftTrigger2` is L2. Read L2 and R2 as analog with a 0.35 threshold.
- Prompts show the action's glyph for the device used last (§12.2). Show a device change after a 0.3 s stick-noise filter.
- When a menu is open, the D-pad or left stick moves focus, ✕ confirms, ○ goes back, and L1/R1 change tabs. The mouse hovers to move focus and clicks to activate. On keyboard, arrows or WASD move, Enter or E confirms, Esc goes back.

### 4.2 Feel numbers (defaults, all sliders in dev mode, §13.2)

| Thing | Value |
|---|---|
| Walk, jog, run | 1.9, 3.4, 5.2 m/s (no firing while running) |
| Aim in, aim out | 0.18 s, 0.12 s |
| Move speed while aiming | 0 (planted) |
| Yaw while aiming, stick | 95°/s max, ease-in curve (stick²), 40% of that within 3° of a head (aim assist) |
| Mouse look | 0.12°/count, no acceleration, no smoothing while aiming |
| Sidestep | 0.38 s, 1.6 m, invulnerable for the first 0.22 s, 1.2 s cooldown |
| Quick turn | 180° in 0.25 s |
| Camera, moving | right-shoulder offset 0.42 m, arm 2.3 m, eye height 1.55 m, FOV 58° (arm, height and FOV framing looked right in a test capture [V]) |
| Camera, aiming | offset 0.5 m, arm 1.25 m, FOV 42°, 0.14 s ease |
| Camera pitch | −50° to +60° |
| Laser | muzzle to first hit, thin unlit red beam, dot at hit. 0.25° figure-8 sway. +0.6° bloom per shot, recovers in 0.35 s |
| Hit-stop | 0.04 s on head hit, 0.08 s on kick, 0.25 s at 30% speed on the last kill of an encounter |
| Rumble | shot 0.1 s, kick 0.15 s, damage 0.3 s (`vibrationActuator.playEffect` from JS, guarded) |

The camera spring-arm uses `Sim::raycast` from the shoulder to the ideal eye and pulls in 0.15 m before any hit. Below 0.7 m of arm, swap to the other shoulder.

### 4.3 What the player can and can't do

Teach these limits with one prompt each, the first time they matter:
- You can't move while aiming. You can't fire while running. Reloading is interrupted by a sidestep.
- You can't jump. Climbing, vaulting and dropping are contextual, with a prompt.
- You can't save anywhere: saves happen at shortwave radios.
- Kicks need a reeling enemy. The knife always works but barely hurts.

**How to Play**, in the pause menu, is 6 big one-idea cards: Aim, Follow-ups, Box, Trader, Mrs. Vane, Saves.

---

## 5. Combat

### 5.1 Hero
100 HP, shown as a ring gauge. Damage causes a 0.4 s flinch, then 0.8 s of invulnerability. At 0 HP, the screen says **POLICY LAPSED** with *Reinstate* (retry from checkpoint), *Load Log*, *Quit*.

### 5.2 Hit detection
Hitscan rays, except harpoon, thrown items and flare, which are projectiles.
- Each ray goes from the muzzle to the camera ray's hit point.
- Test static world with `Sim::raycast`, and bodies with capsules built from `pav_core::puppet::biped_skel(def, &anim)`: head sphere, torso, two arms, two legs. Creatures get authored sphere lists.
- This is deterministic because it derives from sim state.

### 5.3 Body-part reactions

| Part | Damage mult | Reaction (hits dealing ≥ 7 cumulative in 1 s, so one .38 shot to any part is enough) | Follow-up offered |
|---|---|---|---|
| Head | ×2, plus a 12% crit that does ×5 | **Reel** 1.6 s, hands to face | **Roundhouse** ✕: 30 dmg, 2.4 m radius, 200° front arc, knocks down everyone hit |
| Leg | ×0.75 | **Kneel** 1.4 s | **Ledger Slam** ✕: 45 dmg to the target, knockdown |
| Arm | ×0.75 | Interrupts the swing, 30% chance to drop the tool (then unarmed) | none |
| Torso | ×1 | Short flinch | none |
| Knocked down | ×1 | Down 2.0 s | **Finish** ✕ knife: ×3 knife damage, ignores armor |

Follow-ups have a 2.5 m reach, 0.5 s of hero invulnerability and a one-liner chance of 20%. The prompt floats at the target's head. That chain (head shot → kick → crowd down → finish) is the core of the game. Make it feel good first.

### 5.4 Weapons
Damage assumes 40 HP for a basic enemy. Box size is grid cells W×H.

| Weapon | Box | Mag | s/shot | Reload | Damage | Notes | Source |
|---|---|---|---|---|---|---|---|
| Issue .38 | 3×2 | 10 | 0.38 | 1.5 s | 10 | Accurate, crits | Start |
| Trench Pump | 6×2 | 6 | 0.95 | 0.55 s/shell | 7 pellets × 8, 6° cone | Full reel at ≤ 6 m, falls off past 8 m | Harbor Office, Ch1 |
| Stitcher | 5×2 | 30 | 0.09 | 2.2 s | 3.5 | Climbs, shreds Bloats, poor stagger | £4,000, Ch2 |
| Seal Rifle | 7×1 | 5 | 1.30 | 2.6 s | 38, pierces 2 | R3 toggles ×3 zoom while aiming | Ch4 hut, or £5,500 from Ch3 trader |
| Harpoon Gun | 6×2 | 1 | n/a | 1.8 s | 70 | **Pins** target to the wall behind if within 3 m. Walk over a spent harpoon to retrieve it | Ch3 crypt |
| Flare Pistol | 2×2 | 1 | n/a | 1.6 s | 6 + burn 20/s for 3 s | Blinds 6 m radius 3 s, instantly kills a Rooted bulb, lights fog | Gift, Mrs. Vane, Ch3 |
| Filleting Knife | none | n/a | 0.45 | n/a | 6 | Always on L1. Breaks crates. No ammo | Start |

**Throwables** (1×2, stack 3):
- *Stick*: dynamite, 4 m radius, 90 dmg, 2.2 s fuse.
- *Magnesium*: stuns 8 m radius for 3 s, kills Rooted.
- *Oil Lamp*: 3 m fire patch, 5 s, 15 dmg/s.

**Tune-ups at the trader**, three tracks per weapon:

| Track | L1 | L2 | L3 |
|---|---|---|---|
| Damage | +20% | +45% | +80% |
| Reload | −15% | −30% | −45% |
| Capacity | +30% | +60% | +100% |

- Prices: £800, £1,600, £3,200, × weapon factor (.38 ×1, Pump ×1.2, Stitcher ×1.2, Rifle ×1.5, Harpoon ×1.5, Flare ×1).
- All three tracks maxed unlocks an **Exclusive** for £6,000: .38 *Hair Trigger* (crit ×2 chance), Pump *Choke* (3° cone), Stitcher *Drum* (mag ×2), Rifle *Straight Pull* (0.6 s/shot), Harpoon *Reel* (auto-retrieves), Flare *Over-and-Under* (mag 2).
- The final Whaling Cannon is a level prop, not an item.

### 5.5 Enemies

Bipeds use the puppet plus worn props (§14). Attack tokens: at most 3 enemies attack at once (Rank changes this), and the rest circle at 2.5 to 4 m and shuffle, so crowds surround you rather than pile up.

| Enemy | Plan | HP | Speed | Attack | Behaviour |
|---|---|---|---|---|---|
| **Parishioner** | biped | 40 | 1.4, runs 3.0 past 12 m at 30% | Tool swing, 0.55 s windup, 1.6 m, 14 dmg. Grab from side or back (hold, others hit you, mash ✕ to break) | Base enemy. Starts on a chore (gutting, mending nets, praying). Yell alerts 15 m. Rank ≥ 6: sidesteps if laser held on it > 0.7 s past 5 m (15%). Breaks doors in 2 kicks, climbs ladders, vaults windows |
| **Net-Wife** | biped | 35 | 1.2 | Thrown net, 9 m: slows 70% for 2.5 s, mash to tear | Keeps 6 m away. Priority target |
| **Tinner** | biped | 35 | 1.3 | Lobs lit fish-oil tins, 12 m arc, 2 s fuse, 3 m radius, 35 dmg | Shoot the tin in hand: blows up on them and neighbours |
| **Rooted** | biped + whip chain | 60 (bulb ×3) | 1.6 | Barnacle whip, 3 m sweep, 22 dmg | A "dead" Parishioner may burst into this (§7 sets chance per chapter). Stands back up, chest splits, 3 to 5 verlet whips with a pale bulb. Flare or Magnesium kills at once. On death, spawns 1 Scuttler at Rank ≥ 5 |
| **Scuttler** | spider | 15 | 4.5 | Leap, 8 dmg | Small and fast. Shotgun or kick |
| **Sea Hound** | quadruped | 25 | 6.0 | Bite, 10 dmg | Packs of 3 to 5, circle, then rush in pairs |
| **Bloat** | blob | 30 | 0.9 | Bursts in 3.5 m: 30 dmg, poison cloud 4 s, 8 dmg/s | Shoot it far away. Blast hurts other enemies |
| **Bailiff** | biped, large | 150 + 4 barnacle plates (30 each) | 1.3 | Anchor-chain sweep, 30 dmg, 3.2 m | Plates block damage and reel until shot off. Kick staggers only after plates are gone |

**Dynamic Rank** (hidden, 1 to 10, starts at 4):
- Rises with accuracy and no-damage streaks, falls with deaths and low health.
- Scales enemy damage (×0.75 to ×1.3), tokens (2 to 4), sidestep chance and Rooted chance (±10%).
- Dev mode shows and can override it.
- *New Claim* offers three difficulties: **Assistant** (Rank locked ≤ 3), **Adjuster** (default), **Senior Adjuster** (Rank starts at 7, enemy HP ×1.25).

### 5.6 Bosses

**The Flenser** (Mr. Grice from Gutting) (Ch2, returns in Ch5 and as Claims Rush's final wave). 3 m tall biped, rubber apron, iron mask.
- Walks with a ratcheting winch on its back. You hear it first: a loud, unmistakable clack-clack-clack.
- Hook-on-chain thrown 12 m: on hit, drags you to it for a Gut (80 dmg unless you mash ✕ in 1.2 s, then 20).
- HP 900; only the belly tank takes full damage, and the rest is ×0.3.
- Shooting the belt lantern sets it alight and stuns 3 s.
- Ch2 ending: lure it onto the press platform and hit the button, or deplete it. The press kill pays £3,000.

**The Bell-Hermit** (Ch3 boss, flooded crypt, HP 2,200). A cathedral-sized hermit crab (beetle plan, scale 2.6) wearing the cracked chapel bell as its shell.
- *Phase 1:* charges along the crypt and breaks pillars with its shell. Shots at the bell spark and do no damage, but they ring it, and 6 rings agitate it into a slam.
- Shoot the eyes (×2) to make it rear up. Shoot the hanging iron clapper chain when it's under the clapper: the clapper strikes the bell, it reels out of the shell for 6 s, and the soft abdomen takes ×3.
- *Phase 2 (below 50%):* water rises to shin depth (wading ×0.7), Scuttlers spill from the shell, pillars are gone. Kill by repeating the expose loop, or finish with sticks into the open shell.

**The Underwriter** (Ch5 finale, flooded Quay at night). See Ch5, §7. Bulbs 6 × 400 HP, then the mouth takes 3 Whaling Cannon charges.

---

## 6. Economy and items

### 6.1 The Tackle Box (grid inventory)
A tin fisherman's box with fold-out trays. It starts 10×6, upgrades to 12×7 (£3,000) and 14×8 (£8,000). Every item is a rectangle W×H that may rotate 90°. Weapons, ammo, healing and treasures all take space. A separate **Key Items** page holds no-space items (keys, fuses, forms). If a pick-up won't fit, the box opens with the item on the cursor: place it, discard something, use something, or leave it.

| Item | Box | Stack | Effect or value |
|---|---|---|---|
| .38 rounds | 1×1 | 30 | |
| Shells | 1×1 | 12 | |
| Stitcher mag | 1×1 | 60 rounds | |
| Rifle rounds | 1×1 | 10 | |
| Harpoon | 2×1 | 3 | |
| Flares | 1×1 | 4 | |
| Sea Moss | 1×2 | 1 | +30 HP |
| Iodine | 1×2 | 1 | Combine only |
| Tincture (Moss + Iodine) | 1×2 | 1 | Full heal |
| Strong Tincture (Moss + Moss + Iodine) | 1×2 | 1 | Full heal, +10 max HP once per Tincture |
| Tinned Kippers | 2×1 | 1 | +50 HP ("Best before: ask again later.") |
| Pearl | 1×1 | 3 | £800 |
| Gold Tooth | 1×1 | 5 | £300 |
| Scrimshaw | 1×2 | 1 | £1,800 |
| Ambergris | 2×2 | 1 | £4,000 |
| Sextant parts (Frame + Mirror + Scale) | 1×1 each | | £600 each, £7,500 combined |

**Combining** is *Combine* on one item, then pick another (no drag-and-drop required).

### 6.2 Drops
Enemy drop roll: 40% nothing, 25% cash (£100 to £300), 28% ammo for a carried weapon (weighted to whatever you're lowest on), 7% Sea Moss, doubled when under 35% HP. Crates and barrels roll the same table at +20% drop. Campaign total cash is about £40,000, enough to fully tune about 2 weapons, which forces a choice. Picking up is automatic when walking over cash and ammo; other items need ✕ so they can't be taken by accident.

### 6.3 Old Fathoms (trader)
A man in a full brass diving helmet and canvas suit, who walks up out of the water whenever an electric-blue storm lamp is lit. There are 6 lamps: Net Lane, Loading Dock, Halfway Hut, the Cliff Road hut, lighthouse floor 2, and the Quay before the Underwriter. Nobody ever sees how he got there. Music changes to his warm concertina waltz (§15); enemies never spawn near a lit lamp. Three tabs: **Buy**, **Sell**, **Tune**. Each shows at most 6 big rows with a 3D turntable of the selected item (§12.4).

**Tin Gulls.** 15 tin gull targets on posts around the island, shot on sight. Fathoms pays £500 each, and all 15 unlocks a free Exclusive. Treasure Charts (£1,000 per chapter) mark treasures on the map.

### 6.4 Saves
A **shortwave radio** in safe spots: *Log Report* saves. Autosave at each checkpoint and chapter start. Save JSON goes to `localStorage` (versioned): area, checkpoint, box grid, weapons and tracks, cash, flags per area (crates broken, pickups taken, encounters cleared), Rank, stats, settings. Three manual slots plus one auto. `Continue` loads the newest. In a hub session the client hands you empty storage, and you save nothing.

### 6.5 Chapter report
After each chapter: time, accuracy, kills, follow-ups, deaths, cash, then a grade (S to D). After Ch5: the Claim Settlement screen, total grade, and unlocks: the *Chapters* menu entry, *Claims Rush* costume colours, the second-run *Actuary* difficulty.

---

## 7. Campaign

Each area is one room file under `engine/crates/pav_core/src/games/tide/levels/`. Sizes are in metres. Treat the beats as a script and the layouts as firm guidance. Keep areas within about 110 m on a side: fog at 46 m hides the edges.

**Chapter data** (chance a killed Parishioner becomes Rooted): Ch1 0%, Ch2 15%, Ch3 25%, Ch4 35%, Ch5 45%.

**Standard area kit:** ASCII `[layout]` + `[game]` numbers + `[[encounter]]` + `[[object]]`/`[[npc]]`, see §16.

### Chapter 1: Notice of Loss (`quay`, dawn fog, 85×65 m, about 13 min)
```
   N
  ###########  ##########  ########        # = buildings   ~ = sea
  #NET LOFT#=  #OFFICE S#  #CHAPEL #       . = cobbles     = = planks
  ###.....##    ##.......   ###....        T = blue lamp   S = radio
   ...HOUSE..  ...SQUARE.......            G = gate north to Cannery Road
   . NET LANE ...(statue)...  G            P = mail pier
  ##..T.####..........#####
  ~~~~===========~~~~~~~~~~~~
  ~~~~~~~~~CUSTOMS====P===~~~   (pier runs south-east)
```
1. **Mail pier.** Skipper Bram's boat drops Cass and leaves. Radio with Tull. Teach move, look, run. Foghorn far off.
2. **Customs Shed.** A Parishioner with their back turned, gutting. "Anything to declare?" Teach aim, shoot, head shot, kick prompt. The **Tackle Box** on the counter: box tutorial with a too-big item. First radio (save). First cash.
3. **Net Lane.** Narrow lane under drying nets. Shoot the rope to drop a fish rack on a group (trap teach). Crates, first Tin Gull, first Tinner on a roof (teach shooting the tin).
4. **The House on Net Lane.** Enemies pour in. Push the dresser against the door (hold ✕), they kick through anyway, vault out of the window, kick the ladder off the roof. Tannoy wakes up: Pell's first citation.
5. **First blue lamp.** Old Fathoms walks up the slip. Buy, Sell, Tune tutorial with a free tune-up credit.
6. **Harbor Square siege.** 40×35 m plaza, statue of St. Orran with a herring, tannoy horns on poles, two ladders to a roof walkway, doors that open and close. Gates lock on entry. Waves: up to 8 at a time, about 22 total, Tinner on roof, Net-Wife late. Ends at 18 kills or 3:00.
   - **The foghorn sounds. Every Parishioner stops, sets down their tool, turns and walks calmly into the sea.**
   - Cass: "Either that's the tide or the union."
   - Build this moment carefully. It's the game's first big image.
7. **Harbor Office.** Trench Pump on the wall rack, radio, Pell's ledger, Cannery Gate key. Pell over the desk radio: full introduction. Gate north. Chapter report.

### Chapter 2: Fine Tinned Fish (`cannery`, 70×55 m, two floors, machine light, about 13 min)
Reuse conveyor zones (`zone = { kind = "conveyor", facing, speed }`, carries characters and props).
1. **Yard.** Stacked crates, Hounds. Tin stacks fall if shot. Trader at the Loading Dock (Stitcher for sale).
2. **Gutting Floor.** Long conveyors with Parishioners on the line, a moving hook-rail that hits for 20 (dodge or lure enemies under it), catwalks above with Net-Wives. Power is out, so doors are shut.
3. **Boiler Room puzzle.** Find 3 fuses (one in Retort Room, one on the catwalk, one on a corpse in Cold Corridor), fit them in the board: Key Items flow. When the third goes in, lights come up, machinery starts, **first Rooted reveal** on the body you killed a minute ago.
4. **The Flenser.** Ratchet sound through the walls. It hunts you through Boiler, Corridor and Retort. Retort Room has 6 pressure tanks: shoot a valve to scald anything near it (25 dmg + stun). You can't kill it here easily. Pell: "Mr. Grice from Gutting will see you now."
5. **Press Room fight.** Lure the Flenser onto the press plate, hit the button (✕). Or shoot it down.
6. **Cold Store.** Mrs. Vane sitting on a crate, in a fur coat, handbag on knee. "You're late." Escort starts. She has the manifest; Pell needs her signature. Way out: the causeway. Radio. Chapter report.

### Chapter 3: Turning Tide (`causeway` 110×24 m and `crypt` 40×40 m, overcast dusk, rain, about 13 min)
1. **The Causeway.** A stone spit with cover stops. The tide rises in visible steps: flooded sections slow you (×0.7) and then knock you back to the last stop if you stay. Mrs. Vane walks at 3.0 m/s and must be told Wait or Follow (§8). Parishioners rise from the water and try to **carry Mrs. Vane off** (any hit on the carrier drops her). Hounds on sandbars. Tinners in rowboats (shoot the boat's lamp).
   - She gives Cass the **Flare Pistol** after the second attack: "I'm not supposed to have that. Neither are you."
2. **Halfway Hut.** Blue lamp and radio. Teach the crate: "Get in the crate, Mrs. Vane." "I will not." She does.
3. **Chapel Yard.** Hold position while she works the sluice wheel (90 s). Co-op puzzle: two winches, one for each, cranked together to lift the crypt gate.
4. **St. Orran's Crypt.** Boss: **The Bell-Hermit**. Mrs. Vane stays above and shouts insults.
5. **Reward.** The Harpoon Gun on a saint's tomb. Tunnels under the rock lead to the cliffs. Chapter report.

### Chapter 4: The Long Drop (`cliffs`, 100×45 m, storm, about 10 min). First to cut, see §18.
1. **Cliff Road.** Bailiffs appear. Seal Rifle in a hunter's hut. Scuttlers. Gulls scatter.
2. **Overwatch.** Cass on a ledge with the rifle while Mrs. Vane crosses a rope bridge (`style = "bridge"` chain) 60 m away, enemies at both ends. She fires flares at anything you miss. The bridge burns after she's over; Cass crosses at the run with a QTE.
3. **The Funicular.** A 60 s scripted ride down the cliff on a moving platform. Enemies leap on, you shoot the rope brake on the other car to stop it colliding, shoot falling cargo, QTE at the end when the cable snaps (L1 + R1 together).
4. **Lighthouse Gate.** Bailiffs drag Mrs. Vane inside as the gate drops: "Keep your hands off the fur!" Chapter report.

### Chapter 5: The Underwriter (`lighthouse`, 30×30 m, 4 floors; then `quay` reused at storm night, flooded, about 13 min)
1. **Lighthouse climb.** Spiral stairs and ladders, floors link by ladders enemies also use. Bailiffs, Rooted, Flenser returns on floor 3 (fight it on a narrow gallery, shoot the rail to drop it into the sea). Blue lamp on floor 2.
2. **Lamp Room.** Pell at a desk, tiny and immaculate, the manifest in front of Mrs. Vane. He's been a puppet all along, and his jaw opens further than it should. Mrs. Vane signs with a flourish. "That's not my signature, you little man. That's a cancellation." Saltroot erupts from Pell, the sea below lifts: **the Underwriter** rises in the harbor.
3. **Boss, flooded Quay.** The same streets as Ch1, knee-deep, at night, with the storm and lighthouse beam overhead. The Square's tannoys now play only breathing.
   - *Phase 1:* 6 glowing bulbs on tendrils around the square, each 400 HP. Tendrils sweep (dodge) and spawn Rooted.
   - *Phase 2:* the mouth rises at the wharf. Mrs. Vane, on the radio from the lamp room, swings the beam: while it's on the mouth, the mouth flinches open for 8 s. Fetch a charge from one of 4 crate stacks, carry it (no firing) to the **Whaling Cannon** on the wharf, load (✕), aim, fire down the throat. Three charges. Waves keep coming.
   - *Phase 3:* last charge is a QTE and the one-liner: **"Claim denied."**
4. **Escape.** A 60 s timed run from the wharf to the pier through collapsing streets. Bram's boat is waiting with Mrs. Vane already aboard, complaining. CASS: "How did you..." VANE: "I walked."
5. **Epilogue.** Radio. "Harrow. Did you get a signature?" Credits, Claim Settlement.

The last chapter in `chapters.toml` triggers ending and credits, so the ending stays valid if Ch4 is cut.

---

## 8. Mrs. Vane (escort)

- 74 years old, 70 HP (shown top-left with her portrait). Walks at 3.0 m/s, at most 7 m behind Cass, on a flow field to Cass's feet. Never blocks a door or narrow lane: she steps aside when Cass walks into her.
- **Follow or Wait** on D-pad down or C. On Wait she stands, or, if a **lobster crate** is within 8 m, gets in it and can't be hit. A bubble icon marks her.
- **Enemies don't try to kill her, they carry her off:** a Parishioner with a free slot walks up, lifts her (`Walk_Carry`) and heads for the nearest exit marker. Reaching it is **game over** ("The Harbormaster has received your client."). Any hit on the carrier drops her. Enemies also swing at her, 8 dmg. At 0 HP she's down for 20 s and must be helped up (✕), or the policy lapses.
- She hits anything adjacent with her handbag: 4 dmg + short stun, every 2.5 s. From Ch3, a flare every 20 s at the nearest enemy over 6 m away, which also tells players where trouble is.
- Your laser never harms her. Bullets stop on her with a flinch and a line ("Do mind.") but no damage, so she's never a tax on aim. Only explosions hurt her.
- She reacts to low cash, big kills, and treasures with dry lines. Her lines are a big part of the game's charm: don't leave her silent.

---

## 9. Interactions and QTEs

**World interactions** (all data-driven in level TOML, each with a prompt):
- **Doors:** open slowly; pressing ✕ again kicks it open and knocks down anything behind.
- **Ladders:** climb; kick a ladder down when an enemy is on it.
- **Windows:** vault (0.8 s, invulnerable).
- **Dressers and shelves:** push (hold).
- **Rope:** shoot it to drop the load.
- **Crates, barrels, lobster pots:** knife or shot breaks and drops loot.
- **Oil barrels:** explode (3.5 m, 60 dmg, chain).
- **Hanging lanterns:** shoot to start a 2 m fire.
- **Valves:** steam.
- **Winches and wheels:** hold.
- **Fuses:** Key Item use.
- **Radio:** save.
- **Lamp:** trader.
- **Notes:** read.

**QTEs.** A big centred glyph and a shrinking ring. A single press within 1.2 s or a mash meter. On keyboard the key is shown. Failure costs health or an instant Policy Lapsed where the script says so, and it retries from a few seconds before. Used in: Flenser Gut, grab break, net tear, bridge run, funicular crash, cannon finale, 3 cutscene dodges. A Settings option swaps mash QTEs for a single press.

---

## 10. Dialogue and writing

**Style guide.** Write it like a B-action screenplay played completely straight, with short lines, dry comebacks and villains who love monologues. Enemies are polite: British-seaside menace ("Mind yourself, love." as the gaff comes down). All voiced text shows as subtitles (§15 for the gibberish voice). Paper-based humour runs through everything.

**Cast**
| Character | Voice |
|---|---|
| Cass Harrow | Deadpan, tired, professional. Insurance one-liners |
| Desmond Tull | Her supervisor on shortwave. Only cares about the paperwork |
| Mrs. Ottoline Vane | Acid, grand, utterly unafraid. Treats Cass as staff |
| Harbormaster Aldous Pell | Tiny, jolly, pompous, on the tannoy. Issues fines |
| Old Fathoms | The trader, bubbling and cheerful. Calls everyone "friend" |
| Skipper Bram | Laconic. Won't wait |
| Parishioners | Polite murmurs |

**Canon lines, use them as written, and write the rest to match** (about 250 lines total across cutscenes, radio, barks, notes):

- BRAM: "Tide turns at six. I turn with it."
- TULL: "Harrow, Tull. Head office wants the Vane claim closed by Friday. Total loss of one freighter, one cannery and, ah, one village." CASS: "One village?" TULL: "It's on the form as sundries."
- PARISHIONER: "Anything to declare?" CASS: "Only a deductible."
- PELL: "Good morning, Miss Harrow! This is your Harbormaster. Section Nine of the Harbor Bylaws forbids the discharge of firearms on a public wharf. That's two shillings."
- PELL, later: "Section Fourteen: loitering while alive." / "Section Twenty-Two: unauthorised survival. Please remain where you are for processing." / "Section Forty: damage to a parishioner. I'm afraid that's a *form*."
- CASS (barks): "Put it on my tab." / "Pre-existing condition." / "That's coming out of your no-claims bonus." / "You should've read the small print." / "Act of God? I've seen God's paperwork."
- VANE: "You're late." CASS: "Ironbridge Mutual, ma'am. We've corresponded." VANE: "You're the one who queried my dentures. Carry my bag."
- VANE: "Young man, I knew your mother. She was a disappointment too."
- CASS: "Get in the crate, Mrs. Vane." VANE: "I will not." (She gets in the crate.) VANE, muffled: "This is coming out of your premium."
- FATHOMS: "Fair winds and fair prices, friend." / "Bit damp, is it? Everything's a bit damp." / "Mind the step. Mind the wallet." / "Ooh. That's a lovely bit of scrimshaw." / "Tuned her up lovely." / "Come back when you're drier." / "You've got a small-box look about you, friend."
- PELL: "Every claim comes due, Miss Harrow. And beneath every policy, there is an Underwriter." CASS (looking at it): "He's going to want to see my receipts."
- TULL (end): "Harrow? Did you get a signature?" VANE, holding out a soaked form: "Tell your Mr. Tull his premiums are going up." CASS: "Put it down as sundries."

**Notes (10 short paper files, typewriter font, one screen each):** Ironbridge memo; bylaws excerpt; cannery shift notice ("All staff to report for Communion at six. Bring own fork."); marine biologist's letter on *saltroot*; the skipper's tide table; Mrs. Vane's letter of complaint; Pell's fine ledger; Grice's overtime sheet; kipper recipe; Fathoms's price list ("Everything must go. Everything does.").

---

## 11. Multiplayer: Claims Rush and AI Hub

### 11.1 Design
A 5-minute co-op wave round in a cut-down Harbor Square (`rush` level, 40×35 m). Each player is an Ironbridge temp with a seat-coloured scarf and name plate.
- All start with .38 and Sea Moss. Weapon crates (Pump, Stitcher, Rifle, Harpoon) open at 60 s intervals; first ✕ takes it.
- Waves: Parishioners from the start, Tinner at 0:45, Net-Wife at 1:30, Hounds at 2:15, Rooted at 3:00, **The Flenser at 4:00**. Enemy count scales: on screen 8 + 4 per player. Enemy HP +15% per extra player.
- **Payout (score):** kill £100, head kill +£50, follow-up +£100, chain (kills within 4 s of each other) multiplier up to ×4, revive +£300.
- **Down, not out:** at 0 HP you crawl for 20 s, and a teammate's hold ✕ revives (2 s). If everyone is down, the round ends in a loss.
- **Win:** survive to the end of the clock, or kill the Flenser.

Hub reporting is below. On its own (main menu *Claims Rush*), it plays solo or with 1 to 3 AI temps (the same bot code as §16.4), so "Practise alone" works and a player sees how it plays with others.

### 11.2 Session flow (follow `tools/hub/README.md`, protocol v1)

In `web/index.html`, in this exact order: `<meta charset>`, the pasted `session.js` as first script, then:
```html
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="shared-world">
<meta name="hub:session-minutes" content="6">
<meta name="hub:session-goal" content="Survive the shift together; top payout wins">
<meta name="hub:session-howto" content="Stick/WASD move, L2/RMB aim, R2/LMB fire, Cross/E kick">
<meta name="hub:webgpu" content="required">
```
Then a small inline `window.__hub` bridge. It runs **before** the wasm block parses, so `hello` goes out at once:
- `AIHub.connect({mode:'shared-world', seats:[1,4], card:true})`, queueing every event (`card`, `start`, `message`, `leave`, `time-up`, `end`) into an array Rust polls each frame as JSON.
- A `window` `keydown` listener in capture phase: before `start`, Enter → `AIHub.answer('ready')`, `M` → `AIHub.answer('more')`. Rust handles Cross and Triangle on the card and calls the same.
- On `time-up`, if host: `AIHub.finish(window.__hub.lastFinish || {standings:[AIHub.players.map(p=>p.id)]})` right there in JS. Rust publishes `lastFinish` once a second.
- `null` from `connect()` means no hub: play normally.

Rust side:
- `__hub.active` true → scene `tide/rush`, no title or menus, build the arena, call `AIHub.ready()` as soon as the sim and first frame are submitted, no key press.
- Own card (egui, over the live arena): game name, players with seat colours and ready ticks, how to win, this player's controls for the device in use, time left from `card` events. No menus on it. Draw any random numbers from `AIHub.rng('card')`.
- `start` → countdown → play when `AIHub.time() >= 0`.
- On `end`: stop input, stop sending, silence audio.
- `AIHub.server` true → host with no local hero, slow orbit camera, no input.
- In a session: no pause (Options opens only volume settings), no quit, restart or storage writes, no `alert`, no sockets. If `navigator.gpu` is missing, call `AIHub.fail('This game needs WebGPU')`.

### 11.3 Networking model (shared-world)

One world, run by the host. **Your own hero runs locally with no lag** and everyone trusts it. Rust RNG seed = `AIHub.seed`; never use `Math.random`.

| Who | Sends | How |
|---|---|---|
| Client → host | Own hero: `{t:'p',x,y,z,yaw,pitch,anim}` | Unreliable, 12 Hz, `to: host` |
| Client → host | Claims: hit `{t:'h',e,part,dmg,wpn}`, pickup, revive | Reliable, batched, ≤ 5 Hz |
| Host → all | Snapshot: time, wave, enemies `[id,x·10,z·10,yaw,state,hp%]`, heroes | Unreliable, 12 Hz, ≤ 1,100 bytes (split by round-robin past 30 enemies) |
| Host → all | Events: spawn, death, attack start, fx, score, down, revive, crate | Reliable, batched, ≤ 6 Hz |

- Stay under the limit: at most 20 messages a second per copy, 16 KB each, JSON only. Keep a token bucket in Rust.
- On every copy, mirrored characters are normal characters driven from `Game::pre` with `move_dir` toward the interpolated snapshot position (100 ms behind), so walking animation works for free. Teleport if off by more than 2 m.
- Attack and reaction events play the same clips as in the host's sim. Clients run no AI.
- A client's shots raycast against its local mirrors, show hit effects at once, then claim to the host, which applies damage and sends results. Enemy attacks land when the host says.
- Host decides standings. `finish({standings, scores:{id:payout}, won, stats:{id:{Kills,Follow-ups,Head shots,Revives}}, awards:[{id,title,detail}]})`. Awards: Top Adjuster, Kick Artist, Good Samaritan, Sharpshooter. Standings by payout, ties shared.
- On `leave`, remove the hero and let enemies retarget. `host-left` ends everything, so nothing to migrate.

**Build order inside this feature:** first a `ghost` version (same seed, each copy its own world, others' heroes as non-colliding ghosts, `progress` + `result`), which passes the harness with 200 lines. Then upgrade to shared-world. **If shared-world still fails the harness at the end of the build, ship ghost:** change the mode meta and connect call. A passing simpler mode beats a failing better one.

**Testing without a browser:** a cargo test that runs host + 3 clients as 4 `Sim`s in one process, passing messages through a seeded fake network with latency, jitter and loss, and bots playing all four. This finds most bugs and costs nothing. Then the harness (§17).

---

## 12. UI and UX: 10-foot, controller-first

### 12.1 Rules
- Design at 1920×1080. `ctx.set_zoom_factor` so layout units are 1080p pixels at any resolution. Safe area 5%. **Minimum text 28 px, body 34 px, titles 72 px and up.** Judge from 1920×1080 screenshots.
- One column of choices, at most 7 rows. No tables, no tooltips, no dense data screens. Every screen has one job.
- Everything is reachable by pad alone, and also native on mouse and keyboard: same screens, same layout. Hover moves focus. Clicks activate.
- Fonts [V URLs], embedded with `include_bytes!`, credited in About:
  - `https://raw.githubusercontent.com/google/fonts/main/ofl/anton/Anton-Regular.ttf` for titles and numbers.
  - `.../apache/specialelite/SpecialElite-Regular.ttf` for notes and forms.
  - `.../ofl/ptsans/PT_Sans-Web-Bold.ttf` and `PT_Sans-Web-Regular.ttf` for body and subtitles.
- Palette: near-black navy plate `#0b1016` at 85%, bone text `#e9e4d8`, brass focus `#c79a3f`, teal infection accent `#4fd6c4`, red danger `#d4473a`, trader blue `#4aa8ff`.
- A focus bar slides between rows (0.08 s) with a soft tick. Confirm and back have their own sounds.

### 12.2 Glyphs and prompts
Paint all glyphs with `egui::Painter`, no images.
- **PlayStation (default for controller):** ✕ ○ □ △ in their PS colours on dark discs, L1/R1/L2/R2 pills, sticks, D-pad with the direction lit, Options, Create.
- **Xbox (Settings option):** A B X Y in Xbox colours, LB/RB/LT/RT, View, Menu.
- **Keyboard and mouse:** keycaps with the key's name, mouse icon with the button lit.

Game code emits action names (`Action::Reload`); only the UI turns an action plus the last device plus the glyph setting into a glyph. Test this.

### 12.3 HUD (in play)
Quiet, big, corners only.
- **Bottom right:** ring gauge for HP (teal → amber → red), with weapon silhouette and ammo in Anton at 72 px (`10 / 34`), throwable count beside.
- **Bottom centre:** contextual prompts, glyph + verb, 40 px.
- **Top left:** Mrs. Vane's small portrait bar when with you.
- **Top centre:** boss name and bar.
- **Lower third:** subtitles on a dark plate, 40 px, speaker name in colour.
- **Objective:** a single line, appears for 5 s on change.
- Damage vignette (`hud::hit_flash` is a starting point). Cash and pick-ups flash small near the ring. No minimap in play; the Map screen has what you need.

### 12.4 Screens (one job each)

| Screen | Contents |
|---|---|
| Boot | DOM splash until first frame (§3) |
| Title | Live 3D harbor shot with fog and a slow camera, logo in Anton, list: Continue (if a save exists), New Claim, Chapters (after finishing the game once), Claims Rush, Settings, About. Idle 10 s → Attract. Touch-only variant below |
| New Claim | Three big difficulty cards |
| Pause | Resume, How to Play, Settings, Dev Mode, Restart Checkpoint, Quit to Title, About |
| Tackle Box | Big grid (cells ≥ 64 px) with fold-out-tray look, painted item silhouettes, one info card: name, one line, 3D turntable of the item. Pick up and place ✕, rotate R1, Use □, Combine △, close ○. Mouse: click, right-click rotates, wheel rotates, hover moves the cursor. Page: Key Items |
| Trader | Tabs Buy, Sell, Tune, with Fathoms visible in 3D at the left, a big price, cash at the top. Tune shows three fat bars. Never more than 6 rows |
| Map | Chart-style top-down drawn from the level's blocks, markers for player, objective, lamps, radios, charted treasure. Zoom L2/R2 or wheel |
| Notes | Paper on a dark table, typewriter font, ○ back |
| Log Report (save) | 4 slots as big cards |
| Chapter Report | Stats reveal one at a time with a stamped grade |
| Policy Lapsed | Reinstate, Load Log, Quit |
| Settings | Music (**default 10%**), Effects, Voice, Subtitles on/size, Glyphs (PlayStation/Xbox), Stick sensitivity, Mouse sensitivity, Invert Y, Aim assist, Rumble, Single-press QTE, Brightness, Reset. Left and right adjust, mouse drags |
| About/Credits | See §13.3 |
| Hub card | §11.2 |

3D item views use the engine's `pav_view::assets::emit_asset` from a game overlay list (§14.1 E7): a turntable placed in front of the paused camera.

### 12.5 Touch-only devices
Touch-only = `!matchMedia('(any-pointer: fine)').matches && navigator.maxTouchPoints > 0` ([V] true on Playwright's iPhone 13 profile, false on desktop). No touch controls: turn off the engine's `touch` layer entirely. Title shows only the logo, **"Controller or keyboard required"**, and a Settings button. Tap works on Settings screens and that button only. Attract still starts after 10 s; a tap returns to the title. The moment a pad or key input arrives, show the normal title.

---

## 13. Attract, dev mode, About

### 13.1 Attract mode
After **10 wall-clock seconds** with no input on the title or any main-menu screen (timed in `pav_app`, not sim ticks, so it holds at low frame rates), start the loop. Any input (key, mouse button or motion past a small threshold, pad button or stick, tap) returns to the title at once, with no save written. Music stays on the music bus.

Loop of about 3 min: a table of beats, each `{area, start_marker, script, seconds≈18}`, driven by the bot with cheats (god, infinite ammo, teleport-if-stuck). Show as much of the demo as possible:
1. Pier arrival.
2. Square siege with shots, kicks and finishes.
3. Rooted reveal.
4. Tackle Box being used (scripted menu commands).
5. Trader Buy and Tune (scripted).
6. Gutting Floor conveyors.
7. Flenser hook and press.
8. Causeway escort and crate.
9. Bell-Hermit expose.
10. Funicular.
11. Claims Rush with AI temps.
12. Underwriter cannon shot.

Overlay: logo, "DEMO" corner mark, pulsing "Press any button" (glyphs follow last device; "Tap to return" on touch-only).

### 13.2 Dev mode (Pause → Dev Mode)
Pad-driven and big, like every other screen. Tabs with L1/R1:
- **Cheats:** God, Infinite Ammo, One-Hit Kills, No Clip, Freeze AI, Slow-Mo slider, Hitboxes, Nav Grid, AI State Labels, Free Camera, Show Rank.
- **Warp:** any chapter, any checkpoint, boss rush.
- **Spawn:** any enemy at the crosshair, or a wave.
- **Give:** all weapons, ammo, £10,000, all tune-ups, all key items, heal.
- **Sliders** (live, with **Reset All** and per-row reset □). Implement as `impl Tunable for GameTuning`, so they also appear in `pav params` and `pav set path=game.x`:
  - Player: jog speed, run speed, aim-move speed, sidestep distance, yaw speed, aim assist strength, camera arm, FOV.
  - Weapons: damage ×, fire-rate ×, reload ×, headshot ×, crit chance, laser sway.
  - Enemies: HP ×, damage ×, speed ×, attack tokens, reel threshold, reel time, Rooted chance ×, spawn count ×.
  - Economy: drop rate ×, cash ×, prices ×, treasure value ×.
  - Follow-ups: kick radius, kick damage, follow-up reach.
  - Escort: Vane HP, carry speed.
  - Difficulty: Rank override.
- **Readout:** tick, fps, entity count, encounter state.

Add the group in `SimConfig::visit_groups` (`sim.rs`). Dev values never write to saves.

### 13.3 About/Credits
Reachable from Title and Pause. Large scrolling pages, generated at build time from the same data as the exit interview, so the two can't disagree. Pages: **Source Information** (Date, Source, Plan, Genre and Perspective, Tech, Art Direction, Animation, Audio, Online, Testing, Research, Environment, Model, Usage = "added on import"), **Testing Feedback**, **Engine Feedback**, **Prompt Feedback**, **Credits** (clip libraries: CMU, Quaternius and Mesh2Motion CC0, 100STYLE CC BY 4.0 with its credit line; fonts; Pavilion engine; session client). Write "unknown" for anything you can't confirm. Fill these in last, with your own real answers, not the planner's.

---

## 14. Art and animation

### 14.1 Engine work needed (ordered)

| # | Change | Where | Status |
|---|---|---|---|
| E1 | `material: Option<String>` on `Piece`, copied to `Block.material`, so legend blocks can use `material = "MAT/cobblestone"` | `crates/pav_core/src/level.rs` | [V] 5 lines |
| E2 | `Worn` props on bones (below) | `puppet.rs`, `pav_view/src/build.rs` | [V] 56 lines |
| E3 | Shipped pack `tide` (§14.2) | `build.rs`, `props/store.rs` | [V] 2 lines |
| E4 | `Game` hook gains `camera()`, `ui()`, `paused()`, `time_scale()`, `travel()`, `overlay()` | `games/mod.rs`, `sim.rs`, `frame.rs` | §16.2 |
| E5 | `tilt` may go negative: change `clamp(0.0, 90.0)` to `clamp(-89.0, 90.0)` in `forward()` and `up()`; apply `Game::camera` to the rig before `builder.build` | `pav_view/src/camera.rs`, `pav_app/src/app.rs`, `pav_tools/src/session.rs` (three `builder.build` calls, `capture` sees it too) | §16.2 |
| E6 | `InputFrame.look: Vec2` (radians this tick, `serde(default)`), extra button bits, `GameCmd::Tide(u16, i32, i32)`, `input look=[dx,dy]` in the tool | `input.rs`, `arpg/cmd.rs`, tools | |
| E7 | Overlay draw list from the game (laser, decals, turntable, name plates) and FX events (`SimEvent::Fx{kind,pos,dir}`, `Sfx{id,pos,gain}`, `Say{...}`) | `frame.rs`, `pav_view/src/fx.rs`, `build.rs` | |
| E8 | `NavGrid::build_floor(sim, min, max, cell, radius, floor_y, skip)`: floor top within ±0.15 of `floor_y`, obstacles between `floor_y+0.3` and `floor_y+1.6` | `nav.rs` | |
| E9 | Hand aim pose: `PuppetState.aim` (dir), `aim_w`, `aim_grip`. After `clips::over`, turn chest 40% to pitch, head along aim, put hands on the weapon with `puppet::ik` (one-hand, two-hand pistol, long gun) | `puppet.rs` `biped_skel` | |
| E10 | Device-loss guard: a `lost: Arc<AtomicBool>` set by `set_device_lost_callback`; `draw`, `resize`, `set_vsync` return early when set; sim, audio and net keep running. Once lost, try one re-create after 1 s. A boot GPU failure in a session keeps running blind | `pav_app/src/gfx.rs`, `app.rs` | Without it, a driver reset panics via a wgpu unwrap |
| E11 | Product mode: skip stats, boot panel, guide, hint bar, error panel, tuning panel, editor, studios, room card, teleports, rewind, F-keys, touch layer. Window title. Fixed render quality High | `pav_app/src/app.rs` | |
| E12 | Pointer lock and mouse delta (JS in `web/index.html`: `requestPointerLock` on click in play, `movementX/Y` accumulated, read per frame; `pointerlockchange` losing lock in play → pause). `movementX/Y` works before the lock too, so looking never depends on it. Stick to `look`. Native builds use winit | `web/index.html`, `pav_app` | |

**E2, as verified:**
```rust
// puppet.rs
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)] #[serde(default)]
pub struct Worn { pub bone: String, pub asset: String, pub pos: [f32; 3], pub rot: [f32; 3], pub scale: f32 } // Default scale 1, bone "head"
// add `pub worn: Vec<Worn>` to PuppetDef (default empty)
pub fn worn_frames(def: &PuppetDef, st: &PuppetState, feet: Vec3) -> Vec<(Vec3, Quat)> {
    let sk = biped_skel(def, st);
    let yaw = Quat::from_rotation_y(st.facing);
    let (q, shift) = body_motion(def, st);
    let bone_q = |a: Vec3, b: Vec3| Quat::from_rotation_arc(Vec3::NEG_Y, (b - a).normalize_or(Vec3::NEG_Y));
    def.worn.iter().map(|w| {
        let (p, r) = match w.bone.as_str() {
            "chest" => (sk.chest, sk.chest_rot), "pelvis" => (sk.pelvis, sk.pelvis_rot),
            "upper_arm_l" => (sk.shoulder[0], bone_q(sk.shoulder[0], sk.elbow[0])),
            "upper_arm_r" => (sk.shoulder[1], bone_q(sk.shoulder[1], sk.elbow[1])),
            "lower_arm_l" => (sk.elbow[0], bone_q(sk.elbow[0], sk.hand[0])),
            "lower_arm_r" => (sk.elbow[1], bone_q(sk.elbow[1], sk.hand[1])),
            "thigh_l" => (sk.hip[0], bone_q(sk.hip[0], sk.knee[0])), "thigh_r" => (sk.hip[1], bone_q(sk.hip[1], sk.knee[1])),
            "shin_l" => (sk.knee[0], bone_q(sk.knee[0], sk.ankle[0])), "shin_r" => (sk.knee[1], bone_q(sk.knee[1], sk.ankle[1])),
            _ => (sk.head, sk.head_rot),
        };
        let e = |d: f32| d.to_radians();
        let local = Quat::from_euler(glam::EulerRot::YXZ, e(w.rot[0]), e(w.rot[1]), e(w.rot[2]));
        let bone = q * yaw * r;
        (feet + q * (yaw * p) + shift + bone * Vec3::from(w.pos), bone * local)
    }).collect()
}
// pav_view/src/build.rs, emit_puppet, right after the held_asset call:
for (w, (pos, rot)) in def.worn.iter().zip(pav_core::puppet::worn_frames(def, &p.state, feet)) {
    let at = crate::assets::Placement::at(pos).rot(rot).scale(w.scale).id(o.id.0);
    let _ = crate::assets::emit_asset(scene, &w.asset, at, 0, &Default::default());
}
```
Then in level TOML: `look = { shirt = "#5b4632", worn = [ { bone = "head", asset = "LIB/tide/hair_hero" }, { bone = "chest", asset = "LIB/tide/jacket" } ] }`. Add more bones if you need them. In prop coordinates, the bone's origin is the joint (head centre for head, shoulder-line centre for chest), +y up the body (down the limb is −y), +z forward. The head radius is 21 cm, so a cap's crown must be wider than 42 cm or it sinks in [V].

### 14.2 Your asset pack [V]
- Files live in `engine/assets/props/lib/tide/<name>.json`, plus `PACK.json`.
- Add `"lib/tide"` to the folder list in `crates/pav_core/build.rs`, and `"tide"` to `SHIPPED` in `crates/pav_core/src/props/store.rs`.
- Name them `LIB/tide/<name>`. Verified working in the browser build with no `index.tsv`.
- Author with `pav asset_edit action=create` (one JSON line; `docs/ASSET_STUDIO.md` is short and exact) or write the JSON directly. Check with `pav asset_preview name=x views=true figure=true`. At most two fix rounds per prop, then move on.
- Parts can use `"mat":"MAT/brick_wall"`, `"MAT/oak_planks"`, `"MAT/roof_shingles"`, `"MAT/rough_rock"`, `"MAT/cobblestone"`, `"MAT/mossy_stone"`, `"MAT/wrought_iron"`, `"MAT/packed_earth"`, or your own (`docs/MATERIALS.md`).

### 14.3 Direction: engine-native toy diorama, lit like a horror film
The engine's native look is smooth capsule puppets with dark outlines, cel shading and primitive-built props under real lights and fog. Don't fight it. Make it a **carved-and-painted fishing-village diorama, lit for horror**: chunky silhouettes, hats and coats that read at a glance, faces kept simple, and the mood coming from fog, oil lamps and the sea.

**Baseline `[view]`, [V] tested over-the-shoulder at dawn:**
```toml
[view]
"light.sun_elevation" = 28.0
"light.sun_azimuth" = 210.0
"light.sun_intensity" = 0.16
"light.ambient" = 0.34
sky = "#141d28"
fog = true
fog_start = 6.0
fog_end = 46.0
haze = 0.9
haze_height = 4.0
shafts = 0.4
halos = 1.0
bloom = 0.7
bloom_threshold = 1.0
gi = 0.8
exposure = 1.15
"cutaway.height_cut" = false
"cutaway.front_cut" = false
"cutaway.fade" = false
```
- Variations: Ch2 sodium lamps, steam, `gi` up. Ch3 rain, `water_rain`, cold blue. Ch4 storm wind and rain, lightning (flash the `exposure` and spawn a brief light). Ch5 near-black, lighthouse beam (a moving spot built from a line of lights plus haze).
- Sea: `zone = { kind = "water", y0 = -2.0, y1 = -0.4, color = "#16303a" }` [V].
- Lights: 64 point lights, 4 of them with shadows at once (nearest). `light = {color, radius, intensity, flicker, shadows, offset}` on objects. Muzzle flash is a one-tick light.
- Blocks: floors `MAT/cobblestone`, `MAT/oak_planks`, walls via props rather than raw blocks wherever seen up close. Keep collision simple: fixed-body props with `solid` parts.
- Interiors need a ceiling (a block layer above) because the camera stays inside.
- Performance is unlimited by the brief. Add detail, props, enemies, lights and effects freely. Don't spend time optimizing.

**Palette:** harbor greys and sea-blues, warm lamp amber `#ffb060`, blood dark red, infection bone-white with teal `#4fd6c4` glow, trader lamp electric blue `#4aa8ff`, laser red.

**Pack contents (about 70 props; each is a short JSON):**
- **People:** hero hair, field jacket and sleeves, satchel, holster, boots. Mrs. Vane: feathered hat, fur coat body and skirt, handbag, cane. Fathoms: brass helmet with porthole, canvas body, lead boots, lantern. Pell: peaked cap, epaulettes, tiny frame via `scale`. Parishioners: sou'wester, flat cap, headscarf, oilskin torso and skirt, rubber apron, jersey collar, beards ×3, hair ×3. Flenser: iron mask, apron, winch pack, hook, chain, belly tank, belt lantern. Barnacle clusters (head, shoulder, back), Rooted chest split, bulb. Bailiff plates ×4.
- **Weapons:** service pistol (with `grip` and `tip` sockets; `weapon = { kind = "wand", asset = ... }` loads and draws [V], but the aim pose hid it in the test, so check its orientation early), pump, stitcher, rifle, harpoon gun and harpoon, flare pistol, knife, gaff, boat hook, oar, gutting knife, net bundle, fish-oil tin, stick, magnesium, oil lamp.
- **Quay:** cottages ×3 ([V] box walls, wedge roof, `emissive: 3` windows that glow and light the street), net loft, customs shed, harbor office, chapel front, statue of St. Orran with herring, tannoy pole, fish rack, drying nets, lobster pots, buoys, bollards, anchors, mooring chains, mail boat, foghorn tower, radio, blue lamp, tin gull, door, window, ladder, dresser.
- **Cannery:** wall sections, conveyor frame, hook rail, retort tank, valve, boiler, press with plate, fuse board, cold-store door, tin stacks, stencilled crates, catwalk.
- **Causeway and cliffs:** stone stops, sluice wheel, winch, crate, hut, funicular car and rail, rock clusters (`LIB/core/rock_cluster`), freighter hull backdrop.
- **Lighthouse:** drum wall segments, spiral stairs, gallery rail, lens, desk.
- **Creatures:** Bell-Hermit's bell shell (spawned as a prop entity moved every tick by game code), Underwriter mouth, tendrils and bulbs.
- **Generic, use `LIB/core`:** `barrel`, `crate_stack`, `basket`, `lamp_post`, `brazier`, `hand_lantern`, `candle_cluster`, `rowboat`, `fence`, `chain`, `signpost`, `well`, `table`, `chair`, `shelf`, `rubble_pile`, `rock_cluster`.

### 14.4 Animation
Native system: procedural puppet plus clips from the library via `PuppetDef` (`idle_clip`, `walk_clip`, `run_clip`, `death_clip`) and `ch.anim.play_clip(id, flags, speed)` with `clips::UPPER | ONCE | QUICK | TRAVEL | CLAMP`. Look ids up with `clips::find`. **All of these exist [V]:**

| Use | Clip |
|---|---|
| Hero idle, walk, jog, run | `QUATERNIUS/Idle_Loop`, `STYLE100/Neutral_Walk`, `QUATERNIUS/Jog_Fwd_Loop`, `QUATERNIUS/Sprint_Loop` |
| Aim, shoot, reload (upper body) | `QUATERNIUS/Pistol_Aim_Neutral`, `Pistol_Aim_Up`, `Pistol_Aim_Down`, `Pistol_Shoot`, `Pistol_Reload`, then E9 for long guns |
| Roundhouse, front kick, door kick | `CMU/Roundhouse_Kick`, `CMU/Front_Kick`, `MESH2MOTION/Kick_Breach` |
| Ledger Slam, finish | `QUATERNIUS/Melee_Hook`, `MESH2MOTION/Attack_Ground_Pound`, `QUATERNIUS/Sword_Regular_A` |
| Sidestep, roll, turn | `MESH2MOTION/Dodge_left`, `Dodge_right`, `Dodge_back`, `QUATERNIUS/Roll`, `MESH2MOTION/Turn_Left_180` |
| Hero hit, down | `QUATERNIUS/Hit_Chest`, `Hit_Head`, `Hit_Knockback`, `MESH2MOTION/Death_A`, `CMU/Fall_On_Face` |
| Climb, vault, push, throw | `MESH2MOTION/Climb Ladder`, `QUATERNIUS/ClimbUp_1m`, `QUATERNIUS/Push_Loop`, `QUATERNIUS/OverhandThrow` |
| Use, eat, pick up, talk | `QUATERNIUS/Interact`, `Consume`, `PickUp_Table`, `Idle_Talking_Loop`, `Idle_FoldArms_Loop`, `Yes`, `MESH2MOTION/Reject`, `Salute` |
| Parishioner walk (pick by seed) | `STYLE100/Old_Walk`, `Drunk_Walk`, `LimpLeft_Walk`, `DragLeftLeg_Walk`, `CMU/Wounded_Walk_Loop`, `STYLE100/Neutral_Walk` |
| Parishioner run, idle | `MESH2MOTION/Run_Stealth`, `MESH2MOTION/Tired Hunched`, `Idle Listening` |
| Parishioner attack | `MESH2MOTION/Sword_Attack`, `QUATERNIUS/Zombie_Scratch`, `QUATERNIUS/Melee_Hook` |
| Reel, kneel, get up, yell | `MESH2MOTION/Dizzy`, `MESH2MOTION/Kneeling Tired`, `CMU/Get_Up_Face_Down`, `QUATERNIUS/LayToIdle`, `MESH2MOTION/Zombie Yell` |
| Deaths | `MESH2MOTION/Death_A`, `Death_B`, `Death_C`, `Death_D` |
| Rooted | `MESH2MOTION/Zombie_Rise`, `Zombie_Walk`, `Zombie_Idle`, `STYLE100/Zombie_Walk` |
| Mrs. Vane | `STYLE100/Old_Walk`, `MESH2MOTION/Idle_FoldArms`, `Help_One_Arm`, `Sitting_Idle` |
| Fathoms, Flenser | `MESH2MOTION/Idle_Lantern`, `Greeting`; `MESH2MOTION/Walk_Large` |
| Carried Mrs. Vane | Carrier `MESH2MOTION/Walk_Carry`; Mrs. Vane attached by position with `Sitting_Idle` |

**New clips** (`pav anim_edit action=create name=WORKSHOP/Name`; saved to `anim/workshop.json`, which is embedded, so `WORKSHOP/Name` works in the browser; `docs/ANIMATION_STUDIO.md`): window vault, ladder kick, net struggle, handbag swing, Pell's desk gestures, grab break, cannon load, Whaling Cannon recoil. Attack moves can also be plain data in `anim/moves.toml` (`hand = "kick"` etc.). Check motion with `pav filmstrip` and `animsheet`, not repeated single captures.

Worn props follow their bones, so they move with every clip. Whips, tails and chains use the rig's verlet chains (`rig.rs`) or the soft-body rope.

---

## 15. Audio

Everything is synthesized in Rust in `crates/pav_audio`, with no audio files. The mixer already runs in cpal's output in the browser [V: `Default Device @ 48000 Hz`]. `sounds_for` is a closed `match` of `Patch`es; extend, don't replace.

**Mixer additions:**
- Buses: `music`, `sfx`, `voice`, each with its own gain. `Cmd::Bus(bus, gain)`. **Music defaults to 0.10** (Settings shows 10%), Effects 1.0, Voice 1.0.
- Per-area reverb send: a small Schroeder or FDN reverb on the mixer, set per area (cannery long and metallic, crypt huge, outdoors short).
- A sample-timed scheduler inside the mixer, so music and speech keep time at any frame rate.
- Ambient beds (waves, wind, rain, machinery hum) as looping filtered noise voices with slow LFOs.
- Biquad band-pass filters for formants and the tannoy and radio.

**Music (all procedural patterns; state chosen by the game):**
| Cue | Sound |
|---|---|
| Title | Low drone, slow bell, a minor 6/8 shanty on a concertina-like detuned saw |
| Explore | Sparse drone, fiddle-like glides, distant foghorn |
| Combat | Boots-on-wood stomp in 7/8, low hurdy-gurdy drone, rises with enemy count |
| **Trader** | Warm major concertina waltz. The game's signature tune: make it catchy |
| Boss | Stomp + brass stabs + bell |
| Chapter report, Credits | The shanty, resolved to major at the end |

Crossfade 1.5 s. Stinger on first Rooted, the Flenser's ratchet is an SFX and always cuts through.

**SFX (synth patches with variation):**
- Each weapon's shot (noise burst + low thump + slide click), reload parts, dry click, shell casing.
- Footsteps by surface (cobble, plank, metal, water).
- Body hits (head distinct), kick whoosh and thud, knife, explosions (`Explosion` exists), net, whip, steam, fire.
- Crate break, door, ladder, conveyors, press, ratchet.
- Tannoy feedback squeal, foghorn (low saw + sub), bell, gulls.
- Cash, pick-up, UI tick, confirm, back, typewriter, stamp.

**Voices (Animalese/Simlish-style gibberish).** `speak(text, voice)` schedules one blip per letter at 11 to 16 per second:
- Vowels: a saw through two band-passes at formants (a 730/1090, e 530/1840, i 270/2290, o 570/840, u 300/870).
- Consonants: 15 ms noise tick plus a short vowel.
- Pitch follows a contour: rises on `?`, falls on `.`; spaces are short rests, punctuation longer, capitals louder.

Voices:
| Voice | Character |
|---|---|
| Cass | Mid and dry |
| Vane | Higher, 6 Hz vibrato |
| Pell | Nasal, through a 500 to 2500 Hz band-pass + crackle (tannoy) |
| Fathoms | Low, 18 Hz tremolo, 900 Hz low-pass, occasional bubble |
| Tull | Radio band-pass, hiss |
| Bram | Low and slow |
| Parishioners | Low murmur, randomized from a list, quieter |

Gibberish length follows the subtitle. Subtitle text shows as it's spoken.

**Check by rendering, not listening (§17):** `pav audio_capture`, `render_events`, RMS per bus.

---

## 16. Architecture

### 16.1 Code layout
```
engine/crates/pav_core/src/games/tide/
    mod.rs        Game impl, Phase state machine, build, travel
    hero.rs camera.rs weapons.rs combat.rs hit.rs
    ai.rs squads.rs bosses.rs escort.rs
    inventory.rs trader.rs economy.rs save.rs
    world.rs      encounters, doors, ladders, traps, pickups from level data
    script.rs     beats, cutscenes, dialogue player
    menu.rs       menu model (focus, screens, commands)
    net.rs        Claims Rush replication (pure, no IO)
    bot.rs        the bot: whole game, attract, AI temps
    tuning.rs     GameTuning: Tunable
    data/         weapons.toml enemies.toml items.toml prices.toml dialogue.toml notes.toml chapters.toml attract.toml
    levels/       quay.toml cannery.toml causeway.toml crypt.toml cliffs.toml lighthouse.toml quay_night.toml rush.toml title.toml
engine/crates/pav_ui/src/tide/      tv kit, glyphs, hud, each screen (drawn from UiFrame; also used by headless `ui`)
engine/crates/pav_view/src/tide.rs  overlay list, fx kinds
engine/crates/pav_audio/src/        buses, reverb, scheduler, music, voice, tide bank
engine/crates/pav_app/src/tide_app.rs  product mode wiring, idle timer, hub bridge, persist
engine/crates/pav_core/tests/tide.rs   the rules and playthrough tests
engine/web/index.html               session.js, metas, hub bridge, splash, pointer lock, rumble, touch-only flag, test hooks
tools/                               check, package, hub/
```

### 16.2 The rule: all game logic lives in the sim, menus included

**The UI is a dumb painter.** `Game` holds a `Phase` (`Title, Attract, Play, Cutscene, Menu(kind), GameOver, Report, RushCard, RushPlay, RushEnd`). Everything, including menu focus and buying a tune-up, happens in `pre`/`post` from `InputFrame`s and `GameCmd`s. So `cargo test` and the bot can walk every menu, buy items and fit them in the box without any window, which is what makes the whole game testable far faster than real time.

Hook additions (all default-implemented so `starter` keeps working; add each to `DynGame` and `GameBox` like the existing methods):
```rust
fn camera(&self, sim: &Sim) -> Option<GameCam> { None }   // target (world), yaw_deg, tilt_deg, distance, fov
fn ui(&self, sim: &Sim) -> Option<Arc<UiFrame>> { None }  // HUD and screen model; Arc so frames stay cheap
fn paused(&self) -> bool { false }                        // Sim::step runs only `pre`/`post`: no characters, no physics
fn time_scale(&self) -> f32 { 1.0 }                       // hit-stop and slow-mo, as arpg does
fn travel(&mut self) -> Option<String> { None }           // new area: rebuild like arpg::game_travel (arpg/mod.rs:404), carrying the game; bump view_serial
fn overlay(&self, sim: &Sim) -> Vec<DrawItem> { vec![] }  // laser, decals, plates, turntable: pav_view draws them
```
- **Camera** runs in the sim, so captures, tests, replays and attract all see it. App and tools set `rig.params = {yaw, tilt, distance, fov, height_offset: 0, follow_lag: 0}` and `rig.snap(target)` after `rig.update` and before each `builder.build`, interpolating between the two latest frames (`CameraParams::lerp` already takes yaw the short way round). No rig rewrite: `ground_axes`, `screen_ray` and the audio listener keep working.
- **Input:** `look` carries radians per tick. The app turns mouse delta and stick into it, `move_dir` stays world-space from `rig.relative_move`. `Sim::step` records it, so replays are exact.
- **UI commands:** `pav_ui` maps hover and click to `GameCmd::Tide(MENU_FOCUS|MENU_ACTIVATE, ...)`; pad and keys arrive as button bits. No engine `TimeControl.paused`, no `set_menu`.
- **Persist:** `UiFrame.persist: Option<String>` is written to `localStorage` by `pav_app`; at boot the app reads it and queues `GameCmd`/init so saves and settings load. Audio gains come from `UiFrame.settings` each frame.
- Follow the engine's Key rules: seeded `sim.state.rng` only, no clock, no `HashMap` iteration into state, all state in your `Clone + serde` struct (nav grids `#[serde(skip)]`).

### 16.3 Data-driven content (the designer tools)
Your TASK.md requires infrastructure so the rest of the game could be built with normal designer tools. So all of this is data, reloaded at `load` with no rebuild via `games::level_text`:

- **Level TOML** (`[layout]`, legend, `[[object]]`, `[[npc]]`, `[view]`, `[game]`) plus these new tables:
  - `[[encounter]] id, trigger, waves=[{enemy, count, markers, delay, max_alive}], ends_on, sets_flag`
  - `[[door]]`, `[[ladder]]`, `[[window]]`, `[[push]]`, `[[rope]]`, `[[barrel]]`, `[[valve]]`, `[[crate]]`, `[[pickup]]`, `[[tin_gull]]`, `[[note]]`, `[[lamp]]`, `[[radio]]`, `[[checkpoint]]`, `[[nav_link]] {from, to, kind}`
- **Tables:** `weapons.toml`, `enemies.toml` (stats, clip sets, wardrobe lists, drop tables), `items.toml`, `prices.toml`, `chapters.toml`, `attract.toml`.
- **Dialogue:** `[scene.<id>]` with `line = [{who, text, shot, anim, wait}]`, and a shot list per area (`eye`, `look`, `fov`, `cut|ease`).
- **Dev mode and `pav` as the editor:** `pav set path=game.enemy_hp_mult value=1.2`, `play bot=true`, `capture`, `filmstrip`, `room_check`.
- **`DESIGNERS.md`** in the dev folder, one page: how to add a level, an enemy, a weapon, a scene. Real, checked examples.

### 16.4 The bot
One bot serves the whole-game test, attract mode and Claims Rush AI temps. It plays through the same `InputFrame`s and `GameCmd`s a player uses.
- **Goals come from data:** each chapter lists its beats in order in `chapters.toml`, each with a bot goal: `go_to(marker)`, `interact(id)`, `clear(encounter)`, `hold(seconds)`, `buy(item)`, `tune(weapon, track)`, `fit_pickup`, `save`, `command_vane(wait|follow)`, `qte`, `boss(script)`.
- **Fighting:** pick the nearest threat, set `look` toward its head by the shortest turn, hold aim, fire within 1.5°. Press ✕ when a follow-up prompt shows, reload at empty, heal under 40% HP, sidestep when a telegraph is close, switch weapon by range.
- **Moving:** path on the nav grids with `nav_link`s for ladders and stairs. Teleport-if-stuck is allowed only with the attract cheats on.
- **Bosses:** each has a small authored script (lure, expose, shoot the weak point).

Teach the bot each rule as you add it, as the engine's guide says. A chapter isn't finished until the bot can finish it.

---

## 17. Testing

**One command:** `tools/check [sim|audio|web|hub]` (no argument = all), a Python wrapper. **It prints only failures and one final line: `checks: N passed, M failed`.** Rerun a suite only after changing the code it covers. Use screenshots only for what a script can't check (the look, composition, 10-foot legibility at 1920×1080). Keep one or two browsers open at a time. **No subagents or workflows to debate, review, judge or audit.**

### `sim`: `cargo test -p pav_core --test tide -q` (no window, no GPU)
- **Rules:** body-part damage and reactions, follow-up availability, tokens, Rank, weapon stats from data, every tune-up, drop table.
- **Box:** fit, rotate, stack, overflow flow, combine recipes.
- **Trader:** buy, sell, tune, can't-afford, exclusive unlock.
- **Saves:** JSON round-trip restores the same status. Settings default: **music 0.10**.
- **Determinism:** same seed and inputs give same hash; record and replay.
- **Menus:** walk every screen by button bits; Back always returns; no dead focus.
- **Escort:** carried → drop on hit; reach exit → game over; crate safe.
- **Encounters:** every chapter's encounters fire and end.
- **Bot, by chapter:** the bot finishes each chapter on 3 seeds. Fair (no cheats) at Assistant for Ch1. With `god` for later chapters.
- **Whole game:** a scripted playthrough from New Claim to Credits on 3 seeds, with shopping, box use, saves and the Underwriter. The single most valuable test.
- **Careless player loses:** standing still dies.
- **Attract:** every beat runs in order and loops with no error and no save written.
- **Rush net:** host + 3 bot clients through a seeded lossy fake network: no panics, scores agree, message rate ≤ 20/s, snapshots ≤ 1,200 bytes.
- **Pack check:** every `LIB/` name in level and data files is shipped (fails on disk-only packs), all clips exist, all TOML parses with `deny_unknown_fields` on your own tables.

### `audio`: `cargo test -p pav_audio -q`
Offline render through the mixer: each music cue non-silent at unit gain, music bus at default is 10% of unit RMS within tolerance, every SFX id non-silent and decays, voice output length follows text, voices differ. Also check that your additions contain no `.wav`, `.mp3` or `.ogg`, and the deliverable no `data:audio`.

### `web`: Python Playwright against the final single HTML, from `file://`, 640×360 unless noted
Expose under `?test=1` only: `window.__gameStatus` (JSON refreshed twice a second) and `window.__gameCmds` (array Rust drains), set with `js_sys::Reflect` (adding `js-sys` needs the lock update, §3).
- Boots with no console errors or page errors; splash goes away; status phase is Title. Screenshot PNG exceeds a blank page by 1,200 bytes within 7 s at 1280×800 (hub-check's rule).
- 10 s idle → phase Attract; a key, a mouse click, a stub-pad button each return to Title.
- Stub pad (`navigator.getGamepads` returning a standard-mapping pad; see below): moves menu focus; prompts report PlayStation; Settings switches to Xbox; keyboard then reports keys; mouse hover moves focus; click activates. In play, stick changes look and position; left-click on a highlighted world object interacts.
- Pointer lock taken on click; losing it pauses.
- iPhone 13 profile: "Controller or keyboard required" status, Settings opens by tap, no touch controls, attract runs, then tap exits.
- WebKit and Firefox: WebGPU may be missing, in which case the page shows the "needs WebGPU" message with no crash.
- Audio: tap `AudioNode.prototype.connect` in an init script to an `AnalyserNode` on the destination, and check non-zero level after input.

```js
// Stub pad, in add_init_script [V: engine sees it]
const buttons = Array.from({length:17},()=>({pressed:false,touched:false,value:0}));
const pad = {id:'Stub DualSense (STANDARD GAMEPAD)',index:0,connected:true,mapping:'standard',timestamp:0,axes:[0,0,0,0],buttons,vibrationActuator:null};
window.__pad = pad; navigator.getGamepads = () => { pad.timestamp = performance.now(); return [pad,null,null,null]; };
```

### `hub`: harness with the correct flags (§3)
Copy the deliverable under a simple name beside `harness.html`, `bridge.js` and `round.js`, and serve that folder with `python3 -u -m http.server 0 --bind 127.0.0.1`. Check `window.__hubCheck.pass` after `document.body.dataset.complete`:
`players=2`, `players=3`, `players=4`, all with `&latency=150&jitter=50&loss=5&play=8000&auto=1`; `players=4&...&scenario=host-leave`; `players=2&...&scenario=server`. Then open the page alone: `AIHub.active` false, `Math.random` not seeded, Enter and Space pressed, no errors.

---

## 18. Build order

Commit-sized stages, in this order. Each ends with its check green. Batch code edits: each pass costs a 1 to 2 minute rebuild.

| Stage | Build | Exit |
|---|---|---|
| **0 Setup** | Clone at pin. E1, E2, E3. `tools/check` skeleton. Copy the starter to `tide`. Single-file build with `session.js`, metas, bridge, splash. Fonts | The empty game passes all hub scenarios |
| **1 Feel** | E4, E5, E6, E9, E11, E12. Hero moves, camera, aim, laser, fire at a dummy. Test room with baseline view | `capture` shows the over-the-shoulder view; pad stub and mouse drive look in browser; it feels right in filmstrips |
| **2 Fight** | Hit capsules, reactions, follow-ups, Parishioner AI, tokens, E7 FX, E8 nav, Issue .38, knife | 8 enemies vs bot in the test room; head → kick → finish chain works |
| **3 Shell** | TV kit, glyphs, HUD, Title, Pause, Settings, New Claim, Policy Lapsed, How to Play, About skeleton, touch-only, attract timer, dev mode with sliders | Menu walk tests; web suite green |
| **4 Economy** | Box, items, Trader, Tune, drops, saves, Map, Notes | Box and trader tests |
| **5 Audio** | Buses, reverb, scheduler, SFX bank, Trader waltz and Title cue, voice | Audio suite |
| **6 Ch1** | Pack first wave, full `quay`, Pell, Fathoms, Square siege, foghorn walk, Pump, report | Bot finishes Ch1, no cheats at Assistant. This is the vertical slice. Look at it at 1920×1080 and fix what's ugly |
| **7 Rush** | `rush` level, solo mode, AI temps, ghost then shared-world, own card | Rush net test; hub suite on the real game |
| **8 Ch2** | Rooted, Net-Wife, Tinner, Hounds, Stitcher, cannery machinery, fuses, Flenser, Mrs. Vane meets | Bot finishes |
| **9 Ch3** | Escort, tide, Flare, Bloats, Bell-Hermit, Harpoon | Bot finishes |
| **10 Ch5** | Lighthouse, Bailiffs, `quay_night`, Underwriter, cannon, escape, ending, credits | **Whole-game test passes** (Ch4 absent) |
| **11 Ch4** | Rifle, Overwatch, bridge, funicular | Whole-game test still passes |
| **12 Finish** | Attract loop complete, all music and barks, notes, Tin Gulls, Exclusives, Actuary, DESIGNERS.md, About pages from real answers, exit interview, final packaging | `tools/check` all green; §19 walked line by line |

**If you run short, cut in this order and nothing else:**
1. Tin Gulls and Exclusives.
2. Ch4's Overwatch.
3. Ch4 entirely (add the Seal Rifle to the Ch3 trader, and go by tunnel to the lighthouse with Mrs. Vane captured there).
4. Actuary and costumes.

**Never cut:** attract, dev mode, hub passing, settings, glyphs, touch-only screen, About, the Flenser, the Bell-Hermit, the Underwriter, the foghorn walk.

Your brief's "Done" rule stands: no TODOs, placeholders or stubs. If something's cut, it's gone from menus, code paths and text, not greyed out.

---

## 19. Delivery and full brief coverage

**Package:** `tools/package` runs `build-web.sh --single-file --scene tide --title "<title>" ...` with `--out` pointing at the deliverable path your TASK.md names. Then run `tools/check`. When done, delete `engine/target` and any `node_modules` (2 GB+, rebuildable). Keep source. Keep all files inside your dev folder and the folder root your TASK.md gives, not `/tmp`. Stop only processes you started, by PID.

**Engine feedback notes:** keep a short running list as you go, since your TASK.md asks what you changed and where you got stuck. §14.1 is most of it.

**Final reply:** put Source Information, Testing Feedback, Engine Feedback and Prompt Feedback in your chat reply as well as on the About screen. Further research is your choice. Report what you actually did, adding that this plan's research covered the engine source and the hub protocol.

**Exit interview:** fill in the exit-interview file your TASK.md describes, with your own answers, and check it parses as JSON. Catalogue values for this game: type Game; genre Horror; source Resident Evil 4; series Resident Evil; players 1–4; tags such as `3d`, `third-person`, `co-op`, `horror`, `story`, `boss fights`.

| Brief asks for | Where |
|---|---|
| Original game inspired by the source; world, characters, themes, tone turned into mechanics | §1, §2, §5 to §10 |
| Genre and perspective chosen | §1 |
| Title: riff, picked with a real RNG from 50 | Yours; intro of this plan |
| Single HTML package | §3, §19 |
| Dev subfolder; don't read outside; port and process rules | §3, §17, §19 |
| Build on the shardfall engine, change anything | §3, §14.1, §16 |
| Native art style as base, new art for the source's feel, library for generics | §14 |
| Native animation as base, new animations | §14.4 |
| All audio in code, gibberish voices, music 10% default | §15, §12.4, §17 |
| Online: hub integration and game on its own | §11, §17 |
| Performance budget unlimited, no optimization | §14.3 |
| Headless tests, one command, failures and one-line count, whole-game playthrough, few screenshots, no review subagents | §17 |
| Feature-complete vertical slice, long enough to show everything, what you can and can't do | §1, §4.3, §7 |
| Infrastructure for later content with designer tools | §16.3 |
| Dev mode from pause, standard tools, live sliders, reset | §13.2 |
| Attract: 10 s idle, looping, AI-played, cheats allowed, any input exits | §13.1 |
| Multiplayer | §11 |
| Narrative style like the source's | §10 |
| Controller-first 10-foot; DualSense standard mapping; native KB and mouse; mouse clicks menu items and world things; hover moves focus | §4.1, §12, §9 |
| Prompts follow last input; PS glyphs, Xbox option in Settings; keys and mouse | §12.2 |
| No dense web-style screens | §12.1 |
| Touch-only: message, settings button, attract runs, no touch controls | §12.5 |
| No TODOs, placeholders or stubs | §18 |
| Source Information, Testing, Engine, Prompt Feedback, in chat reply and in-game About | §13.3 |
| Exit interview file | §19 |
